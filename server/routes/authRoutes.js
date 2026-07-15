const express = require('express');
const router = express.Router();
const { initiateOpenIDLogin, openIDCallback, logout, checkSession } = require('../controllers/authController');

// @route   GET /api/auth/openid
// @desc    Initiate OpenID 2.0 login flow
// @access  Public
router.get('/openid', initiateOpenIDLogin);

// @route   GET /api/auth/openid/callback
// @desc    OpenID 2.0 callback endpoint (Assertion Consumer Service)
// @access  Public
router.get('/openid/callback', openIDCallback);

// @route   POST /api/auth/logout
// @desc    Logout user and destroy session
// @access  Private (requires active session)
router.post('/logout', logout);

// @route   GET /api/auth/session
// @desc    Check if a session is active
// @access  Public
router.get('/session', checkSession);

module.exports = router;