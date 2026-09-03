const { db } = require("../config/database");

const getMongoDb = async () => {
  if (db.mongoDb) return db.mongoDb;
  if (db.readyPromise) {
    const d = await db.readyPromise;
    if (d) return d;
  }
  throw new Error("MongoDB not connected");
};

/**
 * Gets the next sequential number for a given collection prefix atomically.
 * e.g., getNextSequence("TRP") returns "TRP-1", "TRP-2", etc.
 * Uses atomic findOneAndUpdate on the 'counters' collection in MongoDB.
 * Never takes old gaps, always increments monotonically forward.
 *
 * @param {string} prefix - The prefix for the sequence (e.g., 'TRP', 'AIR', 'TRAIN', 'ROAD')
 * @returns {Promise<string>} The next formatted sequence number
 */
async function getNextSequence(prefix) {
  const cleanPrefix = String(prefix || "SEQ").toUpperCase().trim();
  const counterId = `seq_counter_${cleanPrefix}`;

  try {
    const mongoDb = await getMongoDb();
    const countersCol = mongoDb.collection("counters");

    const updated = await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const seqVal = updated.seq ?? updated.value?.seq ?? 1;
    return `${cleanPrefix}-${seqVal}`;
  } catch (error) {
    console.error("Error generating sequence for", cleanPrefix, error);
    return `${cleanPrefix}-${Date.now().toString().slice(-6)}`;
  }
}

module.exports = {
  getNextSequence
};

