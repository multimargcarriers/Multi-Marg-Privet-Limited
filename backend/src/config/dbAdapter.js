const { v4: uuidv4 } = require("uuid");

class CollectionReference {
  constructor(mongoDb, firebaseDb, colName, fbQuery = null) {
    this.mongoDb = mongoDb;
    this.firebaseDb = firebaseDb; // fallback & dual-write
    this.colName = colName;
    this.query = {};
    this.sort = null;
    this.limitVal = 0;
    this.fbQuery = fbQuery;
  }

  get _fbRef() {
    return this.fbQuery || (this.firebaseDb ? this.firebaseDb.collection(this.colName) : null);
  }

  doc(id) {
    return new DocumentReference(this.mongoDb, this.firebaseDb, this.colName, id);
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

    let nextFbQuery = null;
    if (this._fbRef) {
      nextFbQuery = this._fbRef.where(field, op, val);
    }
    
    const newRef = new CollectionReference(this.mongoDb, this.firebaseDb, this.colName, nextFbQuery);
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
    let nextFbQuery = null;
    if (this._fbRef) {
      nextFbQuery = this._fbRef.orderBy(field, dir);
    }
    
    const newRef = new CollectionReference(this.mongoDb, this.firebaseDb, this.colName, nextFbQuery);
    newRef.query = { ...this.query };
    newRef.sort = { [field]: dir === "desc" ? -1 : 1 };
    newRef.limitVal = this.limitVal;
    return newRef;
  }

  limit(num) {
    let nextFbQuery = null;
    if (this._fbRef) {
      nextFbQuery = this._fbRef.limit(num);
    }
    
    const newRef = new CollectionReference(this.mongoDb, this.firebaseDb, this.colName, nextFbQuery);
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
          console.error(`[MongoDB] Fallback on count for ${this.colName}:`, error.message);
          if (this._fbRef) {
            return await this._fbRef.count().get();
          }
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
          exists: true
        };
      });

      return {
        docs: firestoreDocs,
        empty: firestoreDocs.length === 0,
        size: firestoreDocs.length,
        forEach: (callback) => firestoreDocs.forEach(callback)
      };
    } catch (error) {
      console.error(`[MongoDB] Fallback on query get for ${this.colName}:`, error.message);
      if (this._fbRef) {
        return await this._fbRef.get();
      }
      throw error; 
    }
  }

  async add(data) {
    const id = uuidv4();
    const docData = { ...data, _id: id, id: id };
    
    let isMongoSuccess = false;
    let mongoError = null;
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      await this.mongoDb.collection(this.colName).insertOne(docData);
      isMongoSuccess = true;
    } catch (error) {
      mongoError = error;
      console.error(`[MongoDB] Error on add to ${this.colName}:`, error.message);
    }

    // Dual-write to Firebase
    try {
      if (this.firebaseDb) {
        await this.firebaseDb.collection(this.colName).doc(id).set(data);
      } else if (!isMongoSuccess) {
        throw mongoError; // Firebase disabled and Mongo failed
      }
    } catch (fbError) {
      console.error(`[Firebase] Error on fallback add to ${this.colName}:`, fbError.message);
      if (!isMongoSuccess) throw fbError;
    }

    return new DocumentReference(this.mongoDb, this.firebaseDb, this.colName, id);
  }
}

class DocumentReference {
  constructor(mongoDb, firebaseDb, colName, id) {
    this.mongoDb = mongoDb;
    this.firebaseDb = firebaseDb;
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
      console.error(`[MongoDB] Fallback on doc get for ${this.colName}/${this.id}:`, error.message);
      if (this.firebaseDb) {
        return await this.firebaseDb.collection(this.colName).doc(this.id).get();
      }
      throw error;
    }
  }

  async set(data, options = {}) {
    const docData = { ...data, id: this.id, _id: this.id };
    
    let isMongoSuccess = false;
    try {
      if (this.mongoDb) {
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
        isMongoSuccess = true;
      }
    } catch (error) {
      console.error(`[MongoDB] Error on doc set for ${this.colName}/${this.id}:`, error.message);
    }

    // Dual write
    try {
      if (this.firebaseDb) {
        await this.firebaseDb.collection(this.colName).doc(this.id).set(data, options);
      }
    } catch (fbError) {
      console.error(`[Firebase] Error on doc set for ${this.colName}/${this.id}:`, fbError.message);
      if (!isMongoSuccess) throw fbError;
    }
  }

  async update(data) {
    let isMongoSuccess = false;
    let mongoError = null;
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      await this.mongoDb.collection(this.colName).updateOne(
        { $or: [{ _id: this.id }, { id: this.id }] },
        { $set: data }
      );
      isMongoSuccess = true;
    } catch (error) {
      mongoError = error;
      console.error(`[MongoDB] Error on doc update for ${this.colName}/${this.id}:`, error.message);
    }

    try {
      if (this.firebaseDb) {
        await this.firebaseDb.collection(this.colName).doc(this.id).update(data);
      } else if (!isMongoSuccess) {
        throw mongoError;
      }
    } catch (fbError) {
      console.error(`[Firebase] Error on doc update for ${this.colName}/${this.id}:`, fbError.message);
      if (!isMongoSuccess) throw fbError;
    }
  }

  async delete() {
    let isMongoSuccess = false;
    let mongoError = null;
    try {
      if (!this.mongoDb) throw new Error("MongoDB not connected");
      await this.mongoDb.collection(this.colName).deleteOne({ $or: [{ _id: this.id }, { id: this.id }] });
      isMongoSuccess = true;
    } catch (error) {
      mongoError = error;
      console.error(`[MongoDB] Error on doc delete for ${this.colName}/${this.id}:`, error.message);
    }

    try {
      if (this.firebaseDb) {
        await this.firebaseDb.collection(this.colName).doc(this.id).delete();
      } else if (!isMongoSuccess) {
        throw mongoError;
      }
    } catch (fbError) {
      console.error(`[Firebase] Error on doc delete for ${this.colName}/${this.id}:`, fbError.message);
      if (!isMongoSuccess) throw fbError;
    }
  }
}

class FirestoreToMongoAdapter {
  constructor(mongoDb, firebaseDb) {
    this.mongoDb = mongoDb;
    this.firebaseDb = firebaseDb;
  }

  collection(colName) {
    return new CollectionReference(this.mongoDb, this.firebaseDb, colName);
  }
}

module.exports = FirestoreToMongoAdapter;
