const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor.controller');

router.get('/history', sensorController.getSensorHistory);

module.exports = router;