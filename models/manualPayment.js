const mongoose = require("mongoose");

const manualPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  brand: { type: String, default: null }, // payer name / brand
  service: { type: String, default: null }, // e.g., Reel Promo
  mode: { type: String, enum: ["cash", "upi", "cheque", "bank_transfer", "others"], required: true },
  transactionId: { type: String, default: null },
  paidOn: { type: Date, default: Date.now },
  status: { type: String, enum: ["received", "pending", "refunded", "cancelled"], default: "received" },
  proofUrl: { type: String, default: null },
  notes: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("ManualPayment", manualPaymentSchema);

