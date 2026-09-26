const express = require('express');
const router = express.Router();
const { listProducts, listBySection } = require('../controllers/productController');

router.get('/', listProducts);
router.get('/sections', listBySection);

module.exports = router;
