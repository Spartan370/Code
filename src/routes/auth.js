const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile } = require('/codevault-elite/src/controllers/authController');
const auth = require('/codevault-elite/src/middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/update', auth, updateProfile);

module.exports = router;
