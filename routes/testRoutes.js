const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

router.get('/welcome', testController.getWelcomeMessage);

module.exports = router;