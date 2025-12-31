const PaymentTransaction = require("../models/paymentTransaction");
const PaymentLink = require("../models/paymentLink");
const User = require("../models/user");
const cloudinary = require("cloudinary").v2;

async function uploadProofIfAny(req, publicId) {
  const cfg = cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) return null;
  if (req.file) {
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "payments", public_id: publicId, overwrite: true },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });
    return uploaded.secure_url || uploaded.url;
  }
  if (req.body && req.body.url) {
    const uploaded = await cloudinary.uploader.upload(req.body.url, {
      folder: "payments",
      public_id: publicId,
      overwrite: true
    });
    return uploaded.secure_url || uploaded.url;
  }
  return null;
}

exports.createForUser = async (req, res) => {
  try {
    const { username, paymentId } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_pay_txn" });
    const link = await PaymentLink.findOne({ paymentId, user: user._id });
    if (!link) return res.status(404).json({ success: false, status: "not_found", message: "Payment link not found", traceId: "trace_pay_txn" });
    const data = req.body || {};
    const amount = Number(data.amount);
    const mode = String(data.mode || "").toLowerCase().replace(" ", "_");
    if (!amount || amount <= 0) return res.status(400).json({ success: false, status: "error", message: "amount required", traceId: "trace_pay_txn" });
    const validModes = ["cash", "upi", "cheque", "bank_transfer", "others"];
    if (!validModes.includes(mode)) return res.status(400).json({ success: false, status: "error", message: "invalid mode", traceId: "trace_pay_txn" });
    const paidOn = data.paidOn ? new Date(data.paidOn) : new Date();
    const proofPublicId = `proof_${paymentId}`;
    let proofUrl = null;
    try {
      proofUrl = await uploadProofIfAny(req, proofPublicId);
    } catch (_) {}
    const txn = await PaymentTransaction.create({
      payment: link._id,
      user: user._id,
      amount,
      mode,
      transactionId: data.transactionId || null,
      paidOn,
      proofUrl,
      notes: data.notes || null
    });
    link.status = "paid";
    await link.save();
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Payment recorded",
      data: {
        transaction: {
          id: txn._id,
          paymentId: link.paymentId,
          amount: txn.amount,
          mode: txn.mode,
          transactionId: txn.transactionId,
          paidOn: txn.paidOn,
          proofUrl: txn.proofUrl,
          notes: txn.notes
        },
        payment: {
          id: link.paymentId,
          status: link.status
        }
      },
      traceId: "trace_pay_txn"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_pay_txn" });
  }
};

exports.listForPayment = async (req, res) => {
  try {
    const { username, paymentId } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const link = await PaymentLink.findOne({ paymentId, user: user._id });
    if (!link) return res.status(404).json({ success: false, status: "not_found", message: "Payment link not found" });
    const items = await PaymentTransaction.find({ payment: link._id, user: user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, status: "ok", data: { transactions: items } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
