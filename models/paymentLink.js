const mongoose = require("mongoose");

const paymentLinkSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  brand: { type: String, default: null },
  notes: { type: String, default: null },
  purpose: { type: String, default: null },
  status: { type: String, enum: ["active", "paid", "expired", "cancelled"], default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("PaymentLink", paymentLinkSchema);
