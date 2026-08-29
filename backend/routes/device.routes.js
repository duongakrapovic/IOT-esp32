const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');

router.post('/control', deviceController.controlDevice);
router.get('/history', deviceController.getActiveHistory);

module.exports = router;