const PaymentLink = require("../models/paymentLink");
const Offer = require("../models/offer");
const User = require("../models/user");
const Counter = require("../models/counter");

function baseUrl(req) {
  const envBase = process.env.BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const host = req.get("host");
  const proto = req.protocol;
  return `${proto}://${host}`;
}

exports.createForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_payment" });
    const data = req.body || {};
    const amount = Number(data.amount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, status: "error", message: "amount required", traceId: "trace_payment" });
    const offerId = data.offerId || data.offer;
    if (!offerId) return res.status(400).json({ success: false, status: "error", message: "offerId required", traceId: "trace_payment" });
    const offer = await Offer.findById(offerId);
    if (!offer || String(offer.user) !== String(user._id)) {
      return res.status(400).json({ success: false, status: "error", message: "offer does not belong to user", traceId: "trace_payment" });
    }
    const c = await Counter.findOneAndUpdate(
      { key: "payment_link" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const paymentId = `PAY${String(c.seq).padStart(6, "0")}`;
    const pl = await PaymentLink.create({
      paymentId,
      amount,
      currency: data.currency || "INR",
      offer: offer._id,
      user: user._id,
      brand: data.brand || null,
      notes: data.notes || null,
      purpose: data.purpose || null
    });
    const url = `${baseUrl(req)}/pay/${pl.paymentId}`;
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Payment link created",
      data: {
        payment: {
          id: pl.paymentId,
          amount: pl.amount,
          currency: pl.currency,
          offerId: String(pl.offer),
          userId: String(pl.user),
          brand: pl.brand,
          notes: pl.notes,
          purpose: pl.purpose,
          status: pl.status,
          url
        }
      },
      traceId: "trace_payment"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_payment" });
  }
};

exports.getPublic = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const pl = await PaymentLink.findOne({ paymentId }).populate("user", "username upi referralId").populate("offer", "title price priceType");
    if (!pl) return res.status(404).json({ success: false, status: "not_found", message: "Payment link not found" });
    res.json({
      success: true,
      status: "ok",
      data: {
        payment: {
          id: pl.paymentId,
          amount: pl.amount,
          currency: pl.currency,
          brand: pl.brand,
          notes: pl.notes,
          purpose: pl.purpose,
          status: pl.status,
          user: pl.user,
          offer: pl.offer,
          upi: pl.user?.upi || null
        }
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const items = await PaymentLink.find({ user: user._id }).sort({ createdAt: -1 }).lean();
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
    const item = await PaymentLink.findOne({ _id: id, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Payment link not found" });
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
    const item = await PaymentLink.findOneAndUpdate({ _id: id, user: user._id }, data, { new: true });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Payment link not found" });
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
    const r = await PaymentLink.deleteOne({ _id: id, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Payment link not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
