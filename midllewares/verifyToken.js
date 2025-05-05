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
    console.log("Token extracted from Authorization header:", token ? token.substring(0, 15) + '...' : 'No token');
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookie
    token = req.cookies.token;
    console.log("Token extracted from cookies:", token ? token.substring(0, 15) + '...' : 'No token');
  }

  if (!token) {
    console.log("No token found in request");
    return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
  }

  try {
    console.log("JWT Secret length:", process.env.JWT_SECRET ? process.env.JWT_SECRET.length : "undefined");
    console.log("Attempting to verify token...");
    
    // Make sure JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully, decoded payload:", JSON.stringify(decoded));
    
    if (!decoded) {
      console.log("Decoded token is falsy");
      return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
    }
    
    // Set user ID and role from token
    req.userId = decoded.userId || decoded.id || decoded._id;
    req.userRole = decoded.role;
    console.log("User ID set in request:", req.userId);
    console.log("User role set in request:", req.userRole);
    
    next();
  } catch (error) {
    console.log("Error in verifyToken:", error);
    
    // Provide more specific error messages
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: "Unauthorized - invalid token format", error: error.message });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Unauthorized - token expired", error: error.message });
    } else {
      return res.status(401).json({ success: false, message: "Unauthorized - token validation failed", error: error.message });
    }
  }
};

module.exports = { verifyToken };