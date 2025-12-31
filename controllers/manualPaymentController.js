const ManualPayment = require("../models/manualPayment");
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
        { folder: "payments/manual", public_id: publicId, overwrite: true },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });
    return uploaded.secure_url || uploaded.url;
  }
  if (req.body && req.body.url) {
    const uploaded = await cloudinary.uploader.upload(req.body.url, {
      folder: "payments/manual",
      public_id: publicId,
      overwrite: true
    });
    return uploaded.secure_url || uploaded.url;
  }
  return null;
}

exports.createForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_manual_payment" });
    const data = req.body || {};
    const amount = Number(data.amount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, status: "error", message: "amount required", traceId: "trace_manual_payment" });
    const mode = String(data.mode || "").toLowerCase().replace(" ", "_");
    const validModes = ["cash", "upi", "cheque", "bank_transfer", "others"];
    if (!validModes.includes(mode)) return res.status(400).json({ success: false, status: "error", message: "invalid mode", traceId: "trace_manual_payment" });
    const paidOn = data.paidOn ? new Date(data.paidOn) : new Date();
    const status = String(data.status || "received").toLowerCase();
    const validStatus = ["received", "pending", "refunded", "cancelled"];
    if (!validStatus.includes(status)) return res.status(400).json({ success: false, status: "error", message: "invalid status", traceId: "trace_manual_payment" });
    let proofUrl = null;
    try {
      proofUrl = await uploadProofIfAny(req, `manual_${user._id}_${Date.now()}`);
    } catch (_) {}
    const mp = await ManualPayment.create({
      user: user._id,
      amount,
      currency: data.currency || "INR",
      brand: data.brand || null,
      service: data.service || null,
      mode,
      transactionId: data.transactionId || null,
      paidOn,
      status,
      proofUrl,
      notes: data.notes || null
    });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Manual payment recorded",
      data: {
        payment: {
          id: mp._id,
          amount: mp.amount,
          currency: mp.currency,
          brand: mp.brand,
          service: mp.service,
          mode: mp.mode,
          transactionId: mp.transactionId,
          paidOn: mp.paidOn,
          status: mp.status,
          proofUrl: mp.proofUrl,
          notes: mp.notes
        }
      },
      traceId: "trace_manual_payment"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_manual_payment" });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const items = await ManualPayment.find({ user: user._id }).sort({ paidOn: -1, createdAt: -1 }).lean();
    res.json({ success: true, status: "ok", data: { payments: items } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const item = await ManualPayment.findOne({ _id: id, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Manual payment not found" });
    res.json({ success: true, status: "ok", data: { payment: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.updateForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const data = req.body || {};
    const item = await ManualPayment.findOneAndUpdate({ _id: id, user: user._id }, data, { new: true });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Manual payment not found" });
    res.json({ success: true, status: "ok", data: { payment: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const r = await ManualPayment.deleteOne({ _id: id, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Manual payment not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

