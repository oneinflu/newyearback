const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema({
  type: { type: String, enum: ["view", "click"], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  category: { type: String, default: null },
  label: { type: String, default: null },
  url: { type: String, default: null },
  referrer: { type: String, default: null },
  userAgent: { type: String, default: null },
  ip: { type: String, default: null }
}, { timestamps: true });

analyticsEventSchema.index({ user: 1, createdAt: -1 });
analyticsEventSchema.index({ username: 1, createdAt: -1 });
analyticsEventSchema.index({ type: 1, user: 1, createdAt: -1 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
