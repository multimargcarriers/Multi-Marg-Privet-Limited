const { v4: uuidv4 } = require("uuid");

class CollectionReference {
  constructor(mongoDb, colName) {
    this.mongoDb = mongoDb;
    this.colName = colName;
    this.query = {};
    this.sort = null;
    this.limitVal = 0;
  }

  doc(id) {
    return new DocumentReference(this.mongoDb, this.colName, id);
  }

  where(field, op, val) {
    const mongoOpMap = {
      "==": "$eq",
      ">": "$gt",
      ">=": "$gte",
      "<": "$lt",
      "<=": "$lte",
      "in": "$in",
      "not-in": "$nin",
      "!=": "$ne",
    };

    const newRef = new CollectionReference(this.mongoDb, this.colName);
    // clone existing query state
    newRef.query = { ...this.query };
    newRef.sort = this.sort;
    newRef.limitVal = this.limitVal;

    if (op === "array-contains") {
      newRef.query[field] = val; // In Mongo, querying an array for an element is just { field: val }
    } else if (op === "array-contains-any") {
      newRef.query[field] = { $in: val };
    } else {
      const mongoOp = mongoOpMap[op];
      if (mongoOp) {
        if (!newRef.query[field]) newRef.query[field] = {};
        newRef.query[field][mongoOp] = val;
      }
    }
    return newRef;
  }

  orderBy(field, dir = "asc") {
    const newRef = new CollectionReference(this.mongoDb, this.colName);
    newRef.query = { ...this.query };
    newRef.sort = { [field]: dir === "desc" ? -1 : 1 };
    newRef.limitVal = this.limitVal;
    return newRef;
  }

  limit(num) {
    const newRef = new CollectionReference(this.mongoDb, this.colName);
    newRef.query = { ...this.query };
    newRef.sort = this.sort;
    newRef.limitVal = num;
    return newRef;
  }

  count() {
    return {
      get: async () => {
        try {
          if (!this.mongoDb) throw new Error("MongoDB not connected");
          const count = await this.mongoDb.collection(this.colName).countDocuments(this.query);
          return { data: () => ({ count }) };
        } catch (error) {
          console.error(`[MongoDB] Error on count for ${this.colName}:`, error.message);
          throw error;
        }
      }
    };
  }

  async get() {
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      let cursor = this.mongoDb.collection(this.colName).find(this.query);
      if (this.sort) cursor = cursor.sort(this.sort);
      if (this.limitVal) cursor = cursor.limit(this.limitVal);

      const docs = await cursor.toArray();
      
      const firestoreDocs = docs.map(doc => {
        const id = doc._id || doc.id; // in case _id is somehow not standard
        const data = { ...doc };
        data.id = id;
        delete data._id; // Ensure consistent mapping
        return {
          id: id,
          data: () => data,
          exists: true,
          ref: new DocumentReference(this.mongoDb, this.colName, id)
        };
      });

      return {
        docs: firestoreDocs,
        empty: firestoreDocs.length === 0,
        size: firestoreDocs.length,
        forEach: (callback) => firestoreDocs.forEach(callback)
      };
    } catch (error) {
      console.error(`[MongoDB] Error on query get for ${this.colName}:`, error.message);
      throw error; 
    }
  }

  async add(data) {
    const id = uuidv4();
    const docData = { ...data, _id: id, id: id };
    
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      await this.mongoDb.collection(this.colName).insertOne(docData);
    } catch (error) {
      console.error(`[MongoDB] Error on add to ${this.colName}:`, error.message);
      throw error;
    }

    return new DocumentReference(this.mongoDb, this.colName, id);
  }
}

class DocumentReference {
  constructor(mongoDb, colName, id) {
    this.mongoDb = mongoDb;
    this.colName = colName;
    this.id = id;
  }

  async get() {
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      const doc = await this.mongoDb.collection(this.colName).findOne({ $or: [{ _id: this.id }, { id: this.id }] });
      if (doc) {
        const data = { ...doc };
        data.id = this.id;
        delete data._id;
        return {
          id: this.id,
          data: () => data,
          exists: true
        };
      } else {
        return {
          id: this.id,
          data: () => undefined,
          exists: false
        };
      }
    } catch (error) {
      console.error(`[MongoDB] Error on doc get for ${this.colName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async set(data, options = {}) {
    const docData = { ...data, id: this.id, _id: this.id };
    
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      if (options.merge) {
        await this.mongoDb.collection(this.colName).updateOne(
          { $or: [{ _id: this.id }, { id: this.id }] },
          { $set: data }, // We don't overwrite _id on update
          { upsert: true }
        );
      } else {
        await this.mongoDb.collection(this.colName).replaceOne(
          { $or: [{ _id: this.id }, { id: this.id }] },
          docData,
          { upsert: true }
        );
      }
    } catch (error) {
      console.error(`[MongoDB] Error on doc set for ${this.colName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async update(data) {
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      await this.mongoDb.collection(this.colName).updateOne(
        { $or: [{ _id: this.id }, { id: this.id }] },
        { $set: data }
      );
    } catch (error) {
      console.error(`[MongoDB] Error on doc update for ${this.colName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async delete() {
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      await this.mongoDb.collection(this.colName).deleteOne({ $or: [{ _id: this.id }, { id: this.id }] });
    } catch (error) {
      console.error(`[MongoDB] Error on doc delete for ${this.colName}/${this.id}:`, error.message);
      throw error;
    }
  }
}

class FirestoreToMongoAdapter {
  constructor(mongoDb) {
    this.mongoDb = mongoDb;
  }

  collection(colName) {
    return new CollectionReference(this.mongoDb, colName);
  }

  batch() {
    const mongoDb = this.mongoDb;
    return {
      operations: [],
      set(docRef, data, options = {}) {
        this.operations.push({ type: 'set', docRef, data, options });
      },
      update(docRef, data) {
        this.operations.push({ type: 'update', docRef, data });
      },
      delete(docRef) {
        this.operations.push({ type: 'delete', docRef });
      },
      async commit() {
        if (this.operations.length === 0) return;

        // Group operations by collection
        const byCollection = {};
        for (const op of this.operations) {
          const colName = op.docRef.colName;
          if (!byCollection[colName]) byCollection[colName] = [];

          if (op.type === 'set') {
            const docData = { ...op.data, id: op.docRef.id, _id: op.docRef.id };
            if (op.options.merge) {
              byCollection[colName].push({
                updateOne: {
                  filter: { $or: [{ _id: op.docRef.id }, { id: op.docRef.id }] },
                  update: { $set: op.data },
                  upsert: true
                }
              });
            } else {
              byCollection[colName].push({
                replaceOne: {
                  filter: { $or: [{ _id: op.docRef.id }, { id: op.docRef.id }] },
                  replacement: docData,
                  upsert: true
                }
              });
            }
          } else if (op.type === 'update') {
            byCollection[colName].push({
              updateOne: {
                filter: { $or: [{ _id: op.docRef.id }, { id: op.docRef.id }] },
                update: { $set: op.data }
              }
            });
          } else if (op.type === 'delete') {
            byCollection[colName].push({
              deleteOne: {
                filter: { $or: [{ _id: op.docRef.id }, { id: op.docRef.id }] }
              }
            });
          }
        }

        // Execute bulkWrite per collection
        for (const colName of Object.keys(byCollection)) {
          const ops = byCollection[colName];
          const chunkSize = 20000; // Safe chunk size for MongoDB
          for (let i = 0; i < ops.length; i += chunkSize) {
            const chunk = ops.slice(i, i + chunkSize);
            await mongoDb.collection(colName).bulkWrite(chunk, { ordered: false });
          }
        }
      }
    };
  }
}

module.exports = FirestoreToMongoAdapter;
