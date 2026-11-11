const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
    }
};

// Alternative name for compatibility
const authenticateToken = verifyToken;

const normalizeRole = (role) => {
    const cleaned = String(role || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
    return cleaned === "cordinator" ? "coordinator" : cleaned;
};

// Middleware to check required role
const checkRole = (roles) => {
    const allowed = roles.map(normalizeRole);
    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.role);
        if (!req.user || !allowed.includes(userRole)) {
            return res.status(403).json({ message: "Access Denied. Unauthorized Role." });
        }
        next();
    };
};

module.exports = { verifyToken, authenticateToken, checkRole };

