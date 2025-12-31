const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({
  contentType: { type: String, enum: ["video", "image", "link"], default: "image" },
  fileUrl: { type: String, default: null },
  externalUrl: { type: String, default: null },
  title: { type: String, default: null },
  brand: { type: String, default: null },
  description: { type: String, default: null },
  platform: { type: String, default: null },
  visible: { type: Boolean, default: true },
  pinned: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Portfolio", portfolioSchema);
