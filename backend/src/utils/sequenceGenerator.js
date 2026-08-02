const { db } = require("../config/database");

/**
 * Gets the next sequential number for a given collection prefix.
 * e.g., getNextSequence("TRP") returns "TRP-1", "TRP-2", etc.
 * Uses a Firestore transaction on the 'counters' document in the 'metadata' collection.
 *
 * @param {string} prefix - The prefix for the sequence (e.g., 'TRP', 'LR', 'BILL')
 * @returns {Promise<string>} The next formatted sequence number
 */
async function getNextSequence(prefix) {
  const counterRef = db.collection("metadata").doc("counters");

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let newSeq = 1;
      
      if (doc.exists) {
        const data = doc.data();
        newSeq = (data[prefix] || 0) + 1;
        transaction.update(counterRef, { [prefix]: newSeq });
      } else {
        transaction.set(counterRef, { [prefix]: newSeq }, { merge: true });
      }

      return `${prefix}-${newSeq}`;
    });
  } catch (error) {
    console.error("Error generating sequence for", prefix, error);
    // Fallback if transaction fails
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-ERR-${random}`;
  }
}

module.exports = {
  getNextSequence
};
