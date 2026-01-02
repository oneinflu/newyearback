const Portfolio = require("../models/portfolio");
const User = require("../models/user");
const { ensureUserFolderId, uploadUserFile, getFolderUsageById, deleteByCdnUrl } = require("../services/bunny");

exports.createForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    await ensureUserFolderId(user._id);
    const data = req.body || {};
    if (req.file && req.file.buffer) {
      const limit = 15 * 1024 * 1024 * 1024;
      const used = await getFolderUsageById(user._id);
      const size = Number(req.file.size || req.file.buffer.length || 0);
      if (used + size > limit) {
        return res.status(413).json({ success: false, status: "error", message: "storage_limit_reached", traceId: "trace_portfolio" });
      }
      const uploaded = await uploadUserFile(String(user._id), req.file.buffer, req.file.originalname || "upload.bin", req.file.mimetype || "application/octet-stream");
      data.fileUrl = uploaded.url;
      if (!data.contentType) {
        const mt = req.file.mimetype || "";
        data.contentType = mt.startsWith("video/") ? "video" : mt.startsWith("image/") ? "image" : "link";
      }
    }
    const item = await Portfolio.create({ ...data, user: user._id });
    res.status(201).json({
      success: true,
      status: "ok",
      message: "Portfolio created",
      data: {
        item: {
          id: item._id,
          contentType: item.contentType,
          fileUrl: item.fileUrl,
          externalUrl: item.externalUrl,
          title: item.title,
          brand: item.brand,
          description: item.description,
          platform: item.platform,
          visible: item.visible,
          pinned: item.pinned
        }
      },
      traceId: "trace_portfolio"
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message, traceId: "trace_portfolio" });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const items = await Portfolio.find({ user: user._id }).sort({ pinned: -1, createdAt: -1 }).lean();
    res.json({ success: true, status: "ok", data: { items } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const item = await Portfolio.findOne({ _id: id, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Portfolio not found" });
    res.json({ success: true, status: "ok", data: { item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.updateForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const prev = await Portfolio.findOne({ _id: id, user: user._id });
    if (!prev) return res.status(404).json({ success: false, status: "not_found", message: "Portfolio not found" });
    const data = req.body || {};
    if (req.file && req.file.buffer) {
      const limit = 15 * 1024 * 1024 * 1024;
      const used = await getFolderUsageById(user._id);
      const size = Number(req.file.size || req.file.buffer.length || 0);
      if (used + size > limit) {
        return res.status(413).json({ success: false, status: "error", message: "storage_limit_reached" });
      }
      const uploaded = await uploadUserFile(String(user._id), req.file.buffer, req.file.originalname || "upload.bin", req.file.mimetype || "application/octet-stream");
      data.fileUrl = uploaded.url;
      if (!data.contentType) {
        const mt = req.file.mimetype || "";
        data.contentType = mt.startsWith("video/") ? "video" : mt.startsWith("image/") ? "image" : "link";
      }
    }
    const item = await Portfolio.findOneAndUpdate({ _id: id, user: user._id }, data, { new: true });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Portfolio not found" });
    try {
      const changedUrl = typeof data.fileUrl === "string" ? data.fileUrl : null;
      if (changedUrl && prev.fileUrl && prev.fileUrl !== changedUrl) {
        await deleteByCdnUrl(prev.fileUrl);
      }
    } catch (_) {}
    res.json({ success: true, status: "ok", data: { item } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.removeForUser = async (req, res) => {
  try {
    const { username, id } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const item = await Portfolio.findOne({ _id: id, user: user._id });
    if (!item) return res.status(404).json({ success: false, status: "not_found", message: "Portfolio not found" });
    try {
      if (item.fileUrl) await deleteByCdnUrl(item.fileUrl);
    } catch (_) {}
    const r = await Portfolio.deleteOne({ _id: id, user: user._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, status: "not_found", message: "Portfolio not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
