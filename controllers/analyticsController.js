const User = require("../models/user");
const AnalyticsEvent = require("../models/analyticsEvent");

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
}

exports.trackView = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const ev = await AnalyticsEvent.create({
      type: "view",
      user: user._id,
      username: user.username,
      category: "profile",
      label: "profile_view",
      url: req.body?.url || null,
      referrer: req.get("referer") || req.get("referrer") || null,
      userAgent: req.get("user-agent") || null,
      ip: getClientIp(req)
    });
    res.status(201).json({ success: true, status: "ok", data: { id: String(ev._id) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.trackClick = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const payload = req.body || {};
    const ev = await AnalyticsEvent.create({
      type: "click",
      user: user._id,
      username: user.username,
      category: payload.category || null,
      label: payload.label || null,
      url: payload.url || null,
      referrer: req.get("referer") || req.get("referrer") || null,
      userAgent: req.get("user-agent") || null,
      ip: getClientIp(req)
    });
    res.status(201).json({ success: true, status: "ok", data: { id: String(ev._id) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [views24h, clicks24h, viewsTotal, clicksTotal] = await Promise.all([
      AnalyticsEvent.countDocuments({ user: user._id, type: "view", createdAt: { $gte: since } }),
      AnalyticsEvent.countDocuments({ user: user._id, type: "click", createdAt: { $gte: since } }),
      AnalyticsEvent.countDocuments({ user: user._id, type: "view" }),
      AnalyticsEvent.countDocuments({ user: user._id, type: "click" })
    ]);
    res.json({
      success: true,
      status: "ok",
      data: {
        views24h,
        clicks24h,
        viewsTotal,
        clicksTotal
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
