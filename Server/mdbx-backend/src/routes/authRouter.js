const express = require('express');
const AuthController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const { loginLimiter, registerLimiter, apiLimiter } = require('../middleware/rateLimiter');

const authRouter = express.Router();

authRouter.post('/register', registerLimiter, AuthController.register);
authRouter.post('/login', loginLimiter, AuthController.login);
authRouter.get('/check', apiLimiter, authenticateToken, (req, res) => {
    res.status(200).json({ message: 'Authenticated', user: req.user });
});

module.exports = authRouter;
