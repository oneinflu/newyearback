const mongoose = require("mongoose");

const registerOtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  username: { type: String, default: null },
  data: { type: Object, default: {} },
  stage: { type: String, default: "started" }
}, { timestamps: true });

registerOtpSchema.index({ email: 1, code: 1, used: 1 });
registerOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RegisterOtp", registerOtpSchema);
