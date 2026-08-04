const { db } = require('../config/database');
const { ObjectId } = require('mongodb');

// Get all items in the trash, optionally filtering by collection
exports.getTrash = async (req, res) => {
  try {
    const { collection } = req.query;
    let query = {};
    if (collection) {
      query.originalCollection = collection;
    }

    // Normal users only see their own deleted items
    const isSuperAdmin = req.user && (req.user.role === 'SuperAdmin' || req.user.email === 'admin@multimargcarriers.co.in');
    if (!isSuperAdmin && req.user) {
      query['deletedBy.id'] = req.user.id;
    }

    const trashItems = await db.mongoDb.collection('trash')
      .find(query)
      .sort({ deletedAt: -1 })
      .toArray();
      
    res.status(200).json({ success: true, count: trashItems.length, data: trashItems });
  } catch (error) {
    console.error('Error fetching trash:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trash items' });
  }
};

// Restore an item from trash back to its original collection
exports.restoreTrash = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the item in the trash
    const trashItem = await db.mongoDb.collection('trash').findOne({ _id: new ObjectId(id) });
    
    if (!trashItem) {
      return res.status(404).json({ success: false, error: 'Trash item not found' });
    }

    const isSuperAdmin = req.user && (req.user.role === 'SuperAdmin' || req.user.email === 'admin@multimargcarriers.co.in');
    if (!isSuperAdmin && req.user && trashItem.deletedBy?.id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only restore your own items' });
    }

    const { originalCollection, document } = trashItem;

    // Remove the _id from the restored document if it causes issues, but we want to keep the original _id
    // Make sure document has its original _id as an ObjectId
    if (document._id && typeof document._id === 'string') {
      document._id = new ObjectId(document._id);
    }

    // Insert back into original collection
    await db.mongoDb.collection(originalCollection).insertOne(document);

    // Delete from trash
    await db.mongoDb.collection('trash').deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({ success: true, message: 'Item restored successfully' });
  } catch (error) {
    console.error('Error restoring trash item:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Force permanently delete an item from trash
exports.forceDeleteTrash = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.mongoDb.collection('trash').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Trash item not found' });
    }

    res.status(200).json({ success: true, message: 'Item permanently deleted' });
  } catch (error) {
    console.error('Error force deleting trash item:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Clear all items from trash
exports.clearTrash = async (req, res) => {
  try {
    await db.mongoDb.collection('trash').deleteMany({});
    res.status(200).json({ success: true, message: 'Trash emptied successfully' });
  } catch (error) {
    console.error('Error emptying trash:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
