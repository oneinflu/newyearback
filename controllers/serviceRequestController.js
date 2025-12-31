const ServiceRequest = require("../models/serviceRequest");
const Offer = require("../models/offer");
const User = require("../models/user");

exports.createPublic = async (req, res) => {
  try {
    const data = req.body || {};
    const offerId = data.offerId || data.offer || null;
    if (!offerId) return res.status(400).json({ success: false, status: "error", message: "offerId required", traceId: "trace_service_request" });
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ success: false, status: "not_found", message: "Offer not found", traceId: "trace_service_request" });
    const userId = offer.user;
    const reqDoc = await ServiceRequest.create({
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      description: data.description || null,
      budget: typeof data.budget === "number" ? data.budget : (data.budget ? Number(data.budget) : null),
      offer: offer._id,
      user: userId
    });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Service request created",
      data: {
        request: {
          id: reqDoc._id,
          name: reqDoc.name,
          email: reqDoc.email,
          phone: reqDoc.phone,
          whatsapp: reqDoc.whatsapp,
          description: reqDoc.description,
          offerId: String(offer._id),
          status: reqDoc.status
        }
      },
      traceId: "trace_service_request"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_service_request" });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const items = await ServiceRequest.find({ user: user._id }).sort({ createdAt: -1 }).populate("offer", "title price priceType").lean();
    res.json({ success: true, status: "ok", data: { requests: items } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const item = await ServiceRequest.findOne({ _id: id, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Request not found" });
    res.json({ success: true, status: "ok", data: { request: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.createPublicForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_service_request" });
    const data = req.body || {};
    const serviceTitle = String(data.service || "").trim();
    const offer = await Offer.findOne({ user: user._id, title: serviceTitle });
    if (!offer) return res.status(400).json({ success: false, status: "error", message: "service not found", traceId: "trace_service_request" });
    const reqDoc = await ServiceRequest.create({
      name: data.brand || data.name || null,
      email: data.contactMethod === "email" ? data.contact : null,
      phone: data.contactMethod === "phone" ? data.contact : null,
      whatsapp: data.contactMethod === "whatsapp" ? data.contact : null,
      description: data.message || null,
      budget: typeof data.budget === "number" ? data.budget : (data.budget ? Number(data.budget) : null),
      offer: offer._id,
      user: user._id
    });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Service request created",
      data: {
        request: {
          id: reqDoc._id,
          name: reqDoc.name,
          email: reqDoc.email,
          phone: reqDoc.phone,
          whatsapp: reqDoc.whatsapp,
          description: reqDoc.description,
          offerId: String(offer._id),
          status: reqDoc.status
        }
      },
      traceId: "trace_service_request"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_service_request" });
  }
};

exports.updateForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const data = req.body || {};
    const item = await ServiceRequest.findOneAndUpdate({ _id: id, user: user._id }, data, { new: true });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Request not found" });
    res.json({ success: true, status: "ok", data: { request: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const r = await ServiceRequest.deleteOne({ _id: id, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Request not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
