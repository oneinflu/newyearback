const mongoose = require("mongoose");

const shopLinkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  url: { type: String, required: true },
  title: { type: String, default: "Check this out" },
  domain: { type: String }, // e.g. "amazon.in"
  
  // New fields for enhanced shop view
  imageUrl: { type: String, default: null }, // Product/Thumbnail image
  price: { type: String, default: null },    // e.g. "$10.99"
  description: { type: String, default: null },

  isAffiliate: { type: Boolean, default: true },
  clicks: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("ShopLink", shopLinkSchema);
