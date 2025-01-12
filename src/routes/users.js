const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getUserProfile,
    updateProfile,
    getUserProducts,
    getUserPurchases
} = require('../controllers/userController');

router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateProfile);
router.get('/products', auth, getUserProducts);
router.get('/purchases', auth, getUserPurchases);

module.exports = router;
