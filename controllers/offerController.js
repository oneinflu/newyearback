const Offer = require("../models/offer");
const User = require("../models/user");
const Counter = require("../models/counter");

function normalizePriceType(v) {
  const s = String(v || "").trim().toLowerCase().replace(/[_-]/g, " ");
  if (s === "fixed price" || s === "fixed") return "Fixed Price";
  if (s === "starting from" || s === "starting") return "Starting From";
  if (s === "custom price" || s === "custom") return "Custom Price";
  return v;
}

exports.create = async (req, res) => {
  try {
    const data = req.body || {};
    if (data.priceType) data.priceType = normalizePriceType(data.priceType);
    const offer = await Offer.create({ ...data });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Offer created",
      data: {
        offer: {
          id: offer._id,
          title: offer.title,
          description: offer.description,
          priceType: offer.priceType,
          price: offer.price,
          includes: offer.includes,
          cta: offer.cta,
          delivery: offer.delivery,
          visible: offer.visible,
          currency: offer.currency
        }
      },
      traceId: "trace_offer"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_offer" });
  }
};

exports.createForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_offer" });
    const data = req.body || {};
    if (data.priceType) data.priceType = normalizePriceType(data.priceType);
    const c = await Counter.findOneAndUpdate(
      { key: `offer_order:${user._id}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const order = c.seq;
    const offer = await Offer.create({ ...data, user: user._id, order });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Offer created",
      data: {
        offer: {
          id: offer._id,
          title: offer.title,
          description: offer.description,
          priceType: offer.priceType,
          price: offer.price,
          includes: offer.includes,
          cta: offer.cta,
          delivery: offer.delivery,
          visible: offer.visible,
          currency: offer.currency,
          order: offer.order
        }
      },
      traceId: "trace_offer"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_offer" });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const offers = await Offer.find({ user: user._id }).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, status: "ok", data: { offers } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const offer = await Offer.findOne({ _id: id, user: user._id });
    if (!offer) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found" });
    res.json({ success: true, status: "ok", data: { offer } });
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
    if (data.priceType) data.priceType = normalizePriceType(data.priceType);
    const offer = await Offer.findOneAndUpdate({ _id: id, user: user._id }, data, { new: true });
    if (!offer) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found" });
    res.json({ success: true, status: "ok", data: { offer } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const r = await Offer.deleteOne({ _id: id, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.createForUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_offer" });
    const data = req.body || {};
    if (data.priceType) data.priceType = normalizePriceType(data.priceType);
    const c = await Counter.findOneAndUpdate(
      { key: `offer_order:${user._id}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const order = c.seq;
    const offer = await Offer.create({ ...data, user: user._id, order });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Offer created",
      data: {
        offer: {
          id: offer._id,
          title: offer.title,
          description: offer.description,
          priceType: offer.priceType,
          price: offer.price,
          includes: offer.includes,
          cta: offer.cta,
          delivery: offer.delivery,
          visible: offer.visible,
          currency: offer.currency,
          order: offer.order
        }
      },
      traceId: "trace_offer"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_offer" });
  }
};

exports.listForUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const offers = await Offer.find({ user: user._id }).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, status: "ok", data: { offers } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUserById = async (req, res) => {
  try {
    const { id, offerId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const offer = await Offer.findOne({ _id: offerId, user: user._id });
    if (!offer) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found" });
    res.json({ success: true, status: "ok", data: { offer } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.updateForUserById = async (req, res) => {
  try {
    const { id, offerId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const data = req.body || {};
    if (data.priceType) data.priceType = normalizePriceType(data.priceType);
    const offer = await Offer.findOneAndUpdate({ _id: offerId, user: user._id }, data, { new: true });
    if (!offer) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found" });
    res.json({ success: true, status: "ok", data: { offer } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUserById = async (req, res) => {
  try {
    const { id, offerId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const r = await Offer.deleteOne({ _id: offerId, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
