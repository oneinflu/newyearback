const User = require("../models/user");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { ensureUserFolderId, getFolderUsageById } = require("../services/bunny");
const RegisterOtp = require("../models/registerOtp");
const bcrypt = require("bcrypt");
const Offer = require("../models/offer");
const Portfolio = require("../models/portfolio");
const SocialLink = require("../models/socialLink");
const { sendEmail, formatOtpEmail } = require("../services/mail");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.create = async (req, res) => {
  try {
    const data = req.body || {};
    const user = await User.create(data);
    try {
      if (user?._id) await ensureUserFolderId(user._id);
    } catch (e) {}
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    req.params.username = username;
    return exports.getProfile(req, res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

function normalizeOfferPriceType(pt) {
  const s = String(pt || "").trim().toLowerCase();
  if (s.includes("fixed")) return "fixed";
  if (s.includes("starting")) return "starting";
  if (s.includes("custom")) return "custom";
  return s || "custom";
}

exports.getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "not_found" });
    const offers = await Offer.find({ user: user._id, visible: true }).sort({ order: 1, createdAt: 1 }).lean();
    const links = await SocialLink.find({ user: user._id, visible: true }).sort({ createdAt: -1 }).lean();
    const portfolio = await Portfolio.find({ user: user._id, visible: true }).sort({ pinned: -1, createdAt: -1 }).lean();
    const iconMap = {
      instagram: "/instagram.png",
      facebook: "/facebook.png",
      linkedin: "/linkedin.png",
      "google-business": "/google.png",
      pinterest: "/pinterest.png",
      x: "/twitter.png",
      threads: "/threads.png",
      website: "/web.png",
      youtube: "/youtube.png",
      whatsapp: "/whatsapp.png",
      tiktok: "/tiktok.png",
      telegram: "/telegram.png",
      snapchat: "/logo.png"
    };
    const response = {
      profile: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        role: user.category || null,
        bio: user.shortBio,
        avatarUrl: user.avatarUrl || "/avatar-placeholder.png",
        coverUrl: user.coverUrl || "/profile.jpg",
        verified: Boolean(user.verified)
      },
      offers: offers.map((o) => ({
        title: o.title,
        description: o.description,
        priceType: normalizeOfferPriceType(o.priceType),
        price: o.price ?? undefined,
        cta: o.cta,
        delivery: o.delivery || null,
        includes: Array.isArray(o.includes) ? o.includes : []
      })),
      links: links.map((l) => ({
        platform: l.platform,
        icon: iconMap[l.platform] || "/web.png",
        url: l.url,
        visible: Boolean(l.visible ?? true)
      })),
      portfolio: portfolio.map((p) => ({
        id: String(p._id),
        contentType: p.contentType,
        fileUrl: p.fileUrl,
        externalUrl: p.externalUrl,
        title: p.title,
        brand: p.brand,
        description: p.description,
        platform: p.platform,
        visible: p.visible,
        pinned: p.pinned
      })),
      payment: {
        upiId: user.upi || null,
        payEnabled: Boolean(user.upi)
      },
      contact: {
        method: user.contactPreference || (user.whatsapp ? "whatsapp" : "email"),
        email: user.email || null,
        whatsapp: user.whatsapp || user.phone || null
      },
      theme: "light"
    };
    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getStorageUsage = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const used = await getFolderUsageById(user._id);
    const limit = 15 * 1024 * 1024 * 1024;
    res.json({ success: true, status: "ok", data: { usedBytes: used, limitBytes: limit, remainingBytes: Math.max(0, limit - used) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
function normalizeUsername(value) {
  const uname = String(value || "").trim().toLowerCase();
  return uname;
}
function isValidUsername(value) {
  return /^[a-z0-9._-]{3,30}$/.test(String(value || ""));
}
function sanitizeAvatarUrl(value) {
  const s = String(value || "").trim();
  return s.replace(/^["'`]\s*|\s*["'`]$/g, "");
}
function sanitizeText(value) {
  return String(value ?? "").trim();
}

exports.updateByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const data = req.body || {};
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (typeof data.username !== "undefined") {
      const next = normalizeUsername(data.username);
      if (!isValidUsername(next)) return res.status(400).json({ error: "invalid_username" });
      const exists = await User.findOne({ username: next, username: { $ne: username } });
      if (exists) return res.status(400).json({ error: "username_taken" });
      data.username = next;
    }
    if (typeof data.avatarUrl === "string") {
      data.avatarUrl = sanitizeAvatarUrl(data.avatarUrl);
    }
    if (typeof data.name !== "undefined") data.name = sanitizeText(data.name);
    if (typeof data.shortBio !== "undefined") data.shortBio = sanitizeText(data.shortBio);
    const user = await User.findOneAndUpdate({ username }, data, {
      new: true
    });
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.removeByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const result = await User.deleteOne({ username });
    if (result.deletedCount === 0) return res.status(404).json({ error: "not_found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: "unauthorized" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({
      id: String(user._id),
      username: user.username,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      name: user.name,
      shortBio: user.shortBio,
      avatarUrl: user.avatarUrl,
      category: user.category,
      upi: user.upi,
      contactPreference: user.contactPreference || null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({
      id: String(user._id),
      username: user.username,
      email: user.email,
      name: user.name,
      shortBio: user.shortBio,
      avatarUrl: user.avatarUrl,
      category: user.category,
      upi: user.upi
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (typeof data.username !== "undefined") {
      const next = normalizeUsername(data.username);
      if (!isValidUsername(next)) return res.status(400).json({ error: "invalid_username" });
      const exists = await User.findOne({ username: next, _id: { $ne: id } });
      if (exists) return res.status(400).json({ error: "username_taken" });
      data.username = next;
    }
    if (typeof data.avatarUrl === "string") {
      data.avatarUrl = sanitizeAvatarUrl(data.avatarUrl);
    }
    if (typeof data.name !== "undefined") data.name = sanitizeText(data.name);
    if (typeof data.shortBio !== "undefined") data.shortBio = sanitizeText(data.shortBio);
    const user = await User.findByIdAndUpdate(id, data, { new: true });
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({
      id: String(user._id),
      username: user.username,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      name: user.name,
      shortBio: user.shortBio,
      avatarUrl: user.avatarUrl,
      category: user.category,
      upi: user.upi,
      contactPreference: user.contactPreference || null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: "unauthorized" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({
      id: String(user._id),
      username: user.username,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      name: user.name,
      shortBio: user.shortBio,
      avatarUrl: user.avatarUrl,
      category: user.category,
      upi: user.upi,
      contactPreference: user.contactPreference || null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.sendEmailUpdateOtpById = async (req, res) => {
  try {
    const { id } = req.params;
    const nextEmail = String(req.body?.email || "").trim().toLowerCase();
    if (!nextEmail) return res.status(400).json({ success: false, status: "error", message: "email required" });
    const exists = await User.findOne({ email: nextEmail, _id: { $ne: id } });
    if (exists) return res.status(400).json({ success: false, status: "error", message: "email_taken" });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const row = await RegisterOtp.create({ email: nextEmail, code, expiresAt, used: false, stage: "email_update", data: { userId: id } });
    const expose = process.env.DEV_EXPOSE_OTP === "true";
    if (expose) {
      console.log("OTP (email_update):", nextEmail, code);
    }
    try {
      const { subject, text, html } = formatOtpEmail({ code, minutes: 10, context: "email update" });
      await sendEmail({ to: nextEmail, subject, text, html });
    } catch (_) {}
    res.json({ success: true, status: "ok", message: "OTP sent", data: { id: String(row._id), ...(expose ? { otp: code } : {}) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.verifyEmailUpdateOtpById = async (req, res) => {
  try {
    const { id } = req.params;
    const regId = String(req.body?.id || "").trim();
    const code = String(req.body?.code || "").trim();
    if (!regId || !code) return res.status(400).json({ success: false, status: "error", message: "id and code required" });
    const row = await RegisterOtp.findOne({ _id: regId, code, used: false, stage: "email_update" });
    if (!row) return res.status(401).json({ success: false, status: "unauthorized", message: "invalid_code" });
    if (row.expiresAt < new Date()) return res.status(401).json({ success: false, status: "unauthorized", message: "code_expired" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    user.email = row.email;
    await user.save();
    row.used = true;
    await row.save();
    res.json({ success: true, status: "ok", data: { email: user.email } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "not_found" });

    const url = req.avatarUrl;
    if (!url) return res.status(400).json({ error: "no_file_or_url" });

    user.avatarUrl = url;
    await user.save();
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.setAvatarFromReq = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "db_unavailable" });
    }
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "not_found" });
    if (!req.avatarUrl) return res.status(400).json({ error: "no_file_or_url" });
    user.avatarUrl = req.avatarUrl;
    await user.save();
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.setAvatarFromReqById = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "db_unavailable" });
    }
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "not_found" });
    if (!req.avatarUrl) return res.status(400).json({ error: "no_file_or_url" });
    user.avatarUrl = req.avatarUrl;
    await user.save();
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
