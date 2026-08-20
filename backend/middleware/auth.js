const jwt  = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "Not authenticated. Please log in." });

  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user || !req.user.isActive)
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
  }
};

module.exports = { protect };
