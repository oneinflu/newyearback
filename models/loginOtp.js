const mongoose = require("mongoose");

const loginOtpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  code: { type: String, required: true },
  channel: { type: String, enum: ["email"], default: "email" },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
}, { timestamps: true });

loginOtpSchema.index({ user: 1, code: 1, used: 1 });
loginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("LoginOtp", loginOtpSchema);
