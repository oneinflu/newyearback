const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema({
  name: { type: String, default: null },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  whatsapp: { type: String, default: null },
  description: { type: String, default: null },
  budget: { type: Number, default: null },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["new", "viewed", "closed"], default: "new" }
}, { timestamps: true });

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
