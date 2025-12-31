const jwt = require("jsonwebtoken");

function getSecret() {
  return process.env.JWT_SECRET || process.env.APP_SECRET || "dev_secret";
}

function parseAuth(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/i);
  return m ? m[1] : null;
}

function requireAuth(req, res, next) {
  try {
    const token = parseAuth(req);
    if (!token) return res.status(401).json({ success: false, status: "unauthorized", message: "missing_token" });
    const decoded = jwt.verify(token, getSecret());
    req.auth = decoded;
    req.user = { id: decoded.sub, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, status: "unauthorized", message: "invalid_token" });
  }
}

function requireOwnerParam(param) {
  return function (req, res, next) {
    if (!req.user || !req.user.username) return res.status(401).json({ success: false, status: "unauthorized" });
    const want = String(req.params[param] || "").toLowerCase();
    const have = String(req.user.username || "").toLowerCase();
    if (want !== have) return res.status(403).json({ success: false, status: "forbidden" });
    next();
  };
}

function requireOwnerId(param) {
  return function (req, res, next) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, status: "unauthorized" });
    const want = String(req.params[param] || "");
    const have = String(req.user.id || "");
    if (want !== have) return res.status(403).json({ success: false, status: "forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireOwnerParam, requireOwnerId };
