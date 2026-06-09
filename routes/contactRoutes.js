const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact/ isteğine karşılık gelir
router.post('/', contactController.sendContactMail);

module.exports = router;