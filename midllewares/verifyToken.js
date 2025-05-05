const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  console.log("=== verifyToken middleware called ===");
  console.log("Headers:", JSON.stringify(req.headers));
  
  // Try to get token from Authorization header
  let token;
  const authHeader = req.headers['authorization'];
  console.log("Authorization header:", authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log("Token extracted from Authorization header:", token);
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookie
    token = req.cookies.token;
    console.log("Token extracted from cookies:", token);
  }

  if (!token) {
    console.log("No token found in request");
    return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
  }

  try {
    console.log("JWT Secret length:", process.env.JWT_SECRET ? process.env.JWT_SECRET.length : "undefined");
    console.log("Attempting to verify token...");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully, decoded payload:", decoded);
    
    if (!decoded) {
      console.log("Decoded token is falsy");
      return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
    }
    
    req.userId = decoded.userId || decoded.id || decoded._id; // support various payloads
    console.log("User ID set in request:", req.userId);
    
    next();
  } catch (error) {
    console.log("Error in verifyToken:", error);
    return res.status(401).json({ success: false, message: "Unauthorized - invalid token", error: error.message });
  }
};

module.exports = { verifyToken };