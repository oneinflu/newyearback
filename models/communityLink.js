const mongoose = require("mongoose");

const communityLinkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  platform: { 
    type: String, 
    enum: ["whatsapp", "telegram", "discord", "slack", "skype", "zoom", "other"], 
    required: true 
  },
  url: { type: String, required: true },
  title: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("CommunityLink", communityLinkSchema);
