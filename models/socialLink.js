const mongoose = require("mongoose");

const platforms = [
  "instagram",
  "facebook",
  "linkedin",
  "google-business",
  "pinterest",
  "x",
  "threads",
  "website",
  "youtube",
  "whatsapp",
  "tiktok",
  "telegram",
  "snapchat"
];

const socialLinkSchema = new mongoose.Schema({
  platform: { type: String, enum: platforms, required: true },
  url: { type: String, required: true },
  visible: { type: Boolean, default: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("SocialLink", socialLinkSchema);
