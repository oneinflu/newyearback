const SocialLink = require("../models/socialLink");
const User = require("../models/user");

exports.createForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_social" });
    const data = req.body || {};
    const item = await SocialLink.create({ platform: data.platform, url: data.url, visible: Boolean(data.visible ?? true), user: user._id });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Social link created",
      data: {
        link: {
          id: item._id,
          platform: item.platform,
          url: item.url,
          visible: item.visible
        }
      },
      traceId: "trace_social"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_social" });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const items = await SocialLink.find({ user: user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, status: "ok", data: { links: items } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const item = await SocialLink.findOne({ _id: id, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Link not found" });
    res.json({ success: true, status: "ok", data: { link: item } });
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
    const item = await SocialLink.findOneAndUpdate({ _id: id, user: user._id }, data, { new: true });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Link not found" });
    res.json({ success: true, status: "ok", data: { link: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const r = await SocialLink.deleteOne({ _id: id, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Link not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.createForUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found", traceId: "trace_social" });
    const data = req.body || {};
    const item = await SocialLink.create({ platform: data.platform, url: data.url, visible: Boolean(data.visible ?? true), user: user._id });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Social link created",
      data: {
        link: {
          id: item._id,
          platform: item.platform,
          url: item.url,
          visible: item.visible
        }
      },
      traceId: "trace_social"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_social" });
  }
};

exports.listForUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const items = await SocialLink.find({ user: user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, status: "ok", data: { links: items } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUserById = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const item = await SocialLink.findOne({ _id: linkId, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Link not found" });
    res.json({ success: true, status: "ok", data: { link: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.updateForUserById = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const data = req.body || {};
    const item = await SocialLink.findOneAndUpdate({ _id: linkId, user: user._id }, data, { new: true });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Link not found" });
    res.json({ success: true, status: "ok", data: { link: item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUserById = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const r = await SocialLink.deleteOne({ _id: linkId, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Link not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
