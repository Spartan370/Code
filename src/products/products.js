const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getProductById } = require('../controllers/productController');
const auth = require('../middleware/auth');

router.post('/', auth, createProduct);
router.get('/', getProducts);
router.get('/:id', getProductById);

module.exports = router;
