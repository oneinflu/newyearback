const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema({
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentLink", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ["cash", "upi", "cheque", "bank_transfer", "others"], required: true },
  transactionId: { type: String, default: null },
  paidOn: { type: Date, default: Date.now },
  proofUrl: { type: String, default: null },
  notes: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
