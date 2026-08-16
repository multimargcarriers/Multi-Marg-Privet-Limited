const express = require('express');
const router = express.Router();
const { getTrash, restoreTrash, forceDeleteTrash, clearTrash } = require('../controllers/trashController');
const { authenticateToken } = require('../middleware/auth');

const requireSuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'SuperAdmin' || req.user.email === 'admin@multimarg.com')) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Access denied: SuperAdmin only' });
  }
};

// Trash routes are now accessible to all authenticated users for viewing/restoring their own items
router.use(authenticateToken);

router.get('/', getTrash);
router.post('/restore/:id', restoreTrash);

// Force delete and clear should remain SuperAdmin only
router.delete('/force/:id', requireSuperAdmin, forceDeleteTrash);
router.delete('/clear', requireSuperAdmin, clearTrash);

module.exports = router;
