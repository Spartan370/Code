const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile } = require('/app/src/controllers/authController');
const auth = require('/app/src/middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/update', auth, updateProfile);

module.exports = router;
