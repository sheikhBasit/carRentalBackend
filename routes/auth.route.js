const express = require('express');
const authRoute = express.Router();
const { signup, login, logout, create ,verifyEmail ,forgotPassword , resetPassword , checkAuth} = require('../controllers/auth.controller');
const {verifyToken} = require('../midllewares/verifyToken');
const path = require('path')

authRoute.get("/check-auth", verifyToken , checkAuth);
authRoute.get("/create", create);
authRoute.post("/signup", signup);
// authRoute.post("/login", login);
authRoute.post("/admin/login", login);
// authRoute.get("/logout", logout);

authRoute.post("/verify-email", verifyEmail);
authRoute.post("/forgot-password", forgotPassword);
authRoute.post("/reset-password/:token", resetPassword);
authRoute.use("/reset-password/:token", express.static(path.join(__dirname, "..", "views" ,"reset"))
);

module.exports = authRoute;
