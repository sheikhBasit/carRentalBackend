const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Try to get token from Authorization header
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookie
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
    }
    req.userId = decoded.userId || decoded.id || decoded._id; // support various payloads
    next();
  } catch (error) {
    console.log("Error in verifyToken ", error);
    return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
  }
};

module.exports = { verifyToken };