const { v4: uuidv4 } = require("uuid");

class CollectionReference {
  constructor(adapterOrDb, colName) {
    if (adapterOrDb && typeof adapterOrDb.collection === "function" && adapterOrDb.mongoDb !== undefined) {
      this.adapter = adapterOrDb;
      this.mongoDb = adapterOrDb.mongoDb;
    } else {
      this.mongoDb = adapterOrDb;
    }
    this.colName = colName;
    this.query = {};
    this.sort = null;
    this.limitVal = 0;
  }

  async _getDb() {
    if (this.adapter && this.adapter.mongoDb) return this.adapter.mongoDb;
    if (this.mongoDb) return this.mongoDb;
    if (this.adapter && this.adapter.readyPromise) {
      try {
        const db = await Promise.race([
          this.adapter.readyPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("MongoDB connection timeout")), 6000))
        ]);
        if (db) return db;
      } catch(e) {}
    }
    throw new Error("MongoDB not connected");
  }

  doc(id) {
    return new DocumentReference(this.adapter || this.mongoDb, this.colName, id);
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

    const newRef = new CollectionReference(this.adapter || this.mongoDb, this.colName);
    // clone existing query state
    newRef.query = { ...this.query };
    newRef.sort = this.sort;
    newRef.limitVal = this.limitVal;

    if (op === "array-contains") {
      newRef.query[field] = val;
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
    const newRef = new CollectionReference(this.adapter || this.mongoDb, this.colName);
    newRef.query = { ...this.query };
    newRef.sort = { [field]: dir === "desc" ? -1 : 1 };
    newRef.limitVal = this.limitVal;
    return newRef;
  }

  limit(num) {
    const newRef = new CollectionReference(this.adapter || this.mongoDb, this.colName);
    newRef.query = { ...this.query };
    newRef.sort = this.sort;
    newRef.limitVal = num;
    return newRef;
  }

  count() {
    return {
      get: async () => {
        try {
          const db = await this._getDb();
          const count = await db.collection(this.colName).countDocuments(this.query);
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
      const db = await this._getDb();
      let cursor = db.collection(this.colName).find(this.query);
      if (this.sort) cursor = cursor.sort(this.sort);
      if (this.limitVal) cursor = cursor.limit(this.limitVal);

      const docs = await cursor.toArray();
      
      const firestoreDocs = docs.map(doc => {
        const id = doc._id || doc.id;
        const data = { ...doc };
        data.id = id;
        delete data._id;
        return {
          id: id,
          data: () => data,
          exists: true,
          ref: new DocumentReference(this.adapter || db, this.colName, id)
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
      const db = await this._getDb();
      await db.collection(this.colName).insertOne(docData);
    } catch (error) {
      console.error(`[MongoDB] Error on add to ${this.colName}:`, error.message);
      throw error;
    }

    return new DocumentReference(this.adapter || this.mongoDb, this.colName, id);
  }
}

class DocumentReference {
  constructor(adapterOrDb, colName, id) {
    if (adapterOrDb && typeof adapterOrDb.collection === "function" && adapterOrDb.mongoDb !== undefined) {
      this.adapter = adapterOrDb;
      this.mongoDb = adapterOrDb.mongoDb;
    } else {
      this.mongoDb = adapterOrDb;
    }
    this.colName = colName;
    this.id = id || uuidv4();
  }

  async _getDb() {
    if (this.adapter && this.adapter.mongoDb) return this.adapter.mongoDb;
    if (this.mongoDb) return this.mongoDb;
    if (this.adapter && this.adapter.readyPromise) {
      try {
        const db = await Promise.race([
          this.adapter.readyPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("MongoDB connection timeout")), 6000))
        ]);
        if (db) return db;
      } catch(e) {}
    }
    throw new Error("MongoDB not connected");
  }

  _buildIdQuery() {
    const { ObjectId } = require('mongodb');
    const queries = [{ id: this.id }];
    
    if (this.id && typeof this.id === 'string' && this.id.length === 24 && ObjectId.isValid(this.id)) {
      queries.push({ _id: new ObjectId(this.id) });
    }
    queries.push({ _id: this.id });
    
    return { $or: queries };
  }

  async get() {
    try {
      const db = await this._getDb();
      const doc = await db.collection(this.colName).findOne(this._buildIdQuery());
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
    try {
      const db = await this._getDb();
      const updateData = { ...data };
      if (!updateData.id) updateData.id = this.id;
      
      if (options.merge) {
        await db.collection(this.colName).updateOne(
          this._buildIdQuery(),
          { $set: updateData },
          { upsert: true }
        );
      } else {
        updateData._id = this.id;
        await db.collection(this.colName).replaceOne(
          this._buildIdQuery(),
          updateData,
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
      const db = await this._getDb();
      const res = await db.collection(this.colName).updateOne(
        this._buildIdQuery(),
        { $set: data }
      );
      if (res.matchedCount === 0) {
        throw new Error(`No document found with ID ${this.id} to update in ${this.colName}`);
      }
    } catch (error) {
      console.error(`[MongoDB] Error on doc update for ${this.colName}/${this.id}:`, error.message);
      throw error;
    }
  }

  async delete() {
    try {
      const db = await this._getDb();
      await db.collection(this.colName).deleteOne(this._buildIdQuery());
    } catch (error) {
      console.error(`[MongoDB] Error on doc delete for ${this.colName}/${this.id}:`, error.message);
      throw error;
    }
  }
}

class FirestoreToMongoAdapter {
  constructor(mongoDb) {
    this.mongoDb = mongoDb;
    this.readyPromise = null;
  }

  collection(name) {
    return new CollectionReference(this, name);
  }

  async runTransaction(fn) {
    let mongoDb = this.mongoDb;
    if (!mongoDb && this.readyPromise) {
      mongoDb = await this.readyPromise;
    }
    if (!mongoDb) throw new Error("MongoDB not connected");

    const writes = [];
    const transaction = {
      get: async (docRef) => {
        return await docRef.get();
      },
      delete: (docRef) => {
        writes.push({ type: 'delete', docRef });
      },
      update: (docRef, data) => {
        writes.push({ type: 'update', docRef, data });
      },
      set: (docRef, data, options = {}) => {
        writes.push({ type: 'set', docRef, data, options });
      }
    };
    const result = await fn(transaction);
    for (const op of writes) {
      const colName = op.docRef.colName;
      const id = op.docRef.id;
      if (op.type === 'update') {
        await mongoDb.collection(colName).updateOne(
          { $or: [{ _id: id }, { id: id }] },
          { $set: op.data }
        );
      } else if (op.type === 'set') {
        if (op.options.merge) {
          await mongoDb.collection(colName).updateOne(
            { $or: [{ _id: id }, { id: id }] },
            { $set: op.data },
            { upsert: true }
          );
        } else {
          const docData = { ...op.data, id, _id: id };
          await mongoDb.collection(colName).replaceOne(
            { $or: [{ _id: id }, { id: id }] },
            docData,
            { upsert: true }
          );
        }
      }
    }
    return result;
  }

  batch() {
    const adapter = this;
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
        let mongoDb = adapter.mongoDb;
        if (!mongoDb && adapter.readyPromise) {
          mongoDb = await adapter.readyPromise;
        }
        if (!mongoDb) throw new Error("MongoDB not connected");

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
          const chunkSize = 20000;
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
