const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const LoginOtp = require("../models/loginOtp");
const RegisterOtp = require("../models/registerOtp");
const SocialLink = require("../models/socialLink");
const { ensureUserFolderId } = require("../services/bunny");
const { sendEmail, formatOtpEmail } = require("../services/mail");

function findByIdentifier(identifier) {
  const s = String(identifier || "").trim();
  if (!s) return null;
  if (s.includes("@")) return { email: s.toLowerCase() };
  return { username: s.toLowerCase() };
}

function makeToken(user) {
  const secret = process.env.JWT_SECRET || process.env.APP_SECRET || "dev_secret";
  const payload = {
    sub: String(user._id),
    username: user.username
  };
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

exports.checkUsername = async (req, res) => {
  try {
    const uname = String((req.query.username || req.body?.username || "")).trim().toLowerCase();
    if (!uname) return res.status(400).json({ success: false, status: "error", message: "username required" });
    const exists = await User.findOne({ username: uname });
    res.json({ success: true, status: "ok", data: { available: !exists } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.sendRegisterOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const regId = String(req.body?.id || "").trim();
    if (!email && !regId) return res.status(400).json({ success: false, status: "error", message: "email_or_id required" });
    let row = null;
    if (regId) {
      row = await RegisterOtp.findOne({ _id: regId, used: false });
      if (!row) return res.status(404).json({ success: false, status: "not_found", message: "registration_otp_not_found" });
    } else {
      row = await RegisterOtp.findOne({ email, used: false }).sort({ createdAt: -1 });
      if (!row) {
        // create a starter session if none exists
        const starterExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        row = await RegisterOtp.create({ email, code: null, expiresAt: starterExpires, stage: "started" });
      }
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    row.code = code;
    row.expiresAt = expiresAt;
    row.stage = "otp_sent";
    await row.save();
    const expose = process.env.DEV_EXPOSE_OTP === "true";
    if (expose) {
      console.log("OTP (register):", row.email || "", code);
    }
    try {
      const { subject, text, html } = formatOtpEmail({ code, minutes: 10, context: "registration" });
      const deliveryRes = await sendEmail({ to: row.email, subject, text, html });
      if (!deliveryRes?.ok) {
        console.warn("Email delivery failed (register):", deliveryRes?.error || "");
      }
      res.json({
        success: true,
        status: "ok",
        message: "OTP sent",
        data: {
          delivery: "email",
          id: String(row._id),
          ...(expose ? { otp: code, email_ok: !!deliveryRes?.ok } : {})
        }
      });
      return;
    } catch (_) {}
    res.json({ success: true, status: "ok", message: "OTP sent", data: { delivery: "email", id: String(row._id), ...(expose ? { otp: code } : {}) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.startRegister = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, status: "error", message: "email required" });
    const starterExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const row = await RegisterOtp.create({ email, code: null, expiresAt: starterExpires, stage: "started" });
    res.status(201).json({ success: true, status: "ok", message: "registration_started", data: { id: String(row._id) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.saveRegisterUsername = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const regId = String(req.body?.id || "").trim();
    const username = String(req.body?.username || "").trim().toLowerCase();
    if ((!email && !regId) || !username) return res.status(400).json({ success: false, status: "error", message: "email_or_id and username required" });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ success: false, status: "error", message: "username_taken" });
    let row = null;
    if (regId) {
      row = await RegisterOtp.findOne({ _id: regId, used: false });
    } else {
      row = await RegisterOtp.findOne({ email, used: false }).sort({ createdAt: -1 });
    }
    if (!row) return res.status(404).json({ success: false, status: "not_found", message: "registration_otp_not_found" });
    if (row.expiresAt < new Date()) return res.status(401).json({ success: false, status: "unauthorized", message: "otp_expired" });
    row.username = username;
    await row.save();
    res.json({ success: true, status: "ok", message: "username_saved" });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.verifyRegisterOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const regId = String(req.body?.id || "").trim();
    const code = String(req.body?.code || "").trim();
    if ((!email && !regId) || !code) {
      return res.status(400).json({ success: false, status: "error", message: "email_or_id and code required" });
    }
    let row = null;
    if (regId) {
      row = await RegisterOtp.findOne({ _id: regId, code, used: false });
    } else {
      row = await RegisterOtp.findOne({ email, code, used: false });
    }
    if (!row) return res.status(401).json({ success: false, status: "unauthorized", message: "Invalid code" });
    if (row.expiresAt < new Date()) return res.status(401).json({ success: false, status: "unauthorized", message: "Code expired" });
    const username = String(row.username || req.body?.username || "").trim().toLowerCase();
    if (!username) return res.status(400).json({ success: false, status: "error", message: "username missing" });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ success: false, status: "error", message: "username_taken" });
    row.used = true;
    await row.save();
    const base = row.data || {};
    const user = await User.create({
      email: row.email,
      username,
      name: base.name || null,
      shortBio: base.shortBio || null,
      avatarUrl: base.avatarUrl || null,
      category: base.category || null
    });
    try { await ensureUserFolderId(user._id); } catch (_) {}
    res.status(201).json({
      success: true,
      status: "ok",
      message: "User created",
      data: {
        token: makeToken(user),
        user: { id: user._id, username: user.username, email: user.email }
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.saveRegisterData = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const regId = String(req.body?.id || "").trim();
    const data = req.body?.data || req.body || {};
    if (!email && !regId) return res.status(400).json({ success: false, status: "error", message: "email_or_id required" });
    let row = null;
    if (regId) {
      row = await RegisterOtp.findOne({ _id: regId, used: false });
    } else {
      row = await RegisterOtp.findOne({ email, used: false }).sort({ createdAt: -1 });
    }
    if (!row) return res.status(404).json({ success: false, status: "not_found", message: "registration_otp_not_found" });
    if (row.expiresAt < new Date()) return res.status(401).json({ success: false, status: "unauthorized", message: "otp_expired" });
    row.data = { ...(row.data || {}), ...data };
    await row.save();
    res.json({ success: true, status: "ok", message: "data_saved" });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.getRegisterData = async (req, res) => {
  try {
    const email = String(req.query?.email || req.body?.email || "").trim().toLowerCase();
    const regId = String(req.query?.id || req.body?.id || "").trim();
    if (!email && !regId) return res.status(400).json({ success: false, status: "error", message: "email_or_id required" });
    let row = null;
    if (regId) {
      row = await RegisterOtp.findOne({ _id: regId, used: false });
    } else {
      row = await RegisterOtp.findOne({ email, used: false }).sort({ createdAt: -1 });
    }
    if (!row) return res.status(404).json({ success: false, status: "not_found", message: "registration_otp_not_found" });
    res.json({ success: true, status: "ok", data: row.data || {} });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
exports.registerWithOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const username = String(req.body?.username || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || !username || !code) {
      return res.status(400).json({ success: false, status: "error", message: "email, username, code required" });
    }
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ success: false, status: "error", message: "username_taken" });
    const row = await RegisterOtp.findOne({ email, code, used: false });
    if (!row) return res.status(401).json({ success: false, status: "unauthorized", message: "Invalid code" });
    if (row.expiresAt < new Date()) return res.status(401).json({ success: false, status: "unauthorized", message: "Code expired" });
    row.used = true;
    await row.save();
    const user = await User.create({
      email,
      username,
      name: req.body?.name || null,
      shortBio: req.body?.shortBio || null,
      avatarUrl: req.body?.avatarUrl || null,
      category: req.body?.category || null
    });
    try { if (user?._id) await ensureUserFolderId(user._id); } catch (_) {}
    const links = Array.isArray(req.body?.links) ? req.body.links : [];
    for (const l of links) {
      try {
        if (l && l.platform && l.url) {
          await SocialLink.create({ platform: l.platform, url: l.url, user: user._id });
        }
      } catch (_) {}
    }
    res.status(201).json({
      success: true,
      status: "ok",
      message: "User registered",
      data: {
        token: makeToken(user),
        user: { id: user._id, username: user.username, email: user.email }
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
exports.loginWithPassword = async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ success: false, status: "error", message: "identifier and password required" });
    const query = findByIdentifier(identifier);
    if (!query) return res.status(400).json({ success: false, status: "error", message: "invalid identifier" });
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    if (!user.password) return res.status(400).json({ success: false, status: "missing_password", message: "Password not set. Use OTP login." });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, status: "unauthorized", message: "Invalid credentials" });
    res.json({ success: true, status: "ok", data: { token: makeToken(user), user: { id: user._id, username: user.username, email: user.email } } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ success: false, status: "error", message: "identifier required" });
    const query = findByIdentifier(identifier);
    if (!query) return res.status(400).json({ success: false, status: "error", message: "invalid identifier" });
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await LoginOtp.create({ user: user._id, code, expiresAt });
    const expose = process.env.DEV_EXPOSE_OTP === "true";
    if (expose) {
      console.log("OTP (login):", user.username || user.email || "", code);
    }
    try {
      const { subject, text, html } = formatOtpEmail({ code, minutes: 10, context: "login" });
      const deliveryRes = await sendEmail({ to: user.email, subject, text, html });
      if (!deliveryRes?.ok) {
        console.warn("Email delivery failed (login):", deliveryRes?.error || "");
      }
      res.json({
        success: true,
        status: "ok",
        message: "OTP sent",
        data: {
          delivery: "email",
          ...(expose ? { otp: code, email_ok: !!deliveryRes?.ok } : {})
        }
      });
      return;
    } catch (_) {}
    res.json({ success: true, status: "ok", message: "OTP sent", data: { delivery: "email", ...(expose ? { otp: code } : {}) } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};

exports.loginWithOtp = async (req, res) => {
  try {
    const { identifier, code } = req.body || {};
    if (!identifier || !code) return res.status(400).json({ success: false, status: "error", message: "identifier and code required" });
    const query = findByIdentifier(identifier);
    if (!query) return res.status(400).json({ success: false, status: "error", message: "invalid identifier" });
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ success: false, status: "not_found", message: "User not found" });
    const row = await LoginOtp.findOne({ user: user._id, code, used: false });
    if (!row) return res.status(401).json({ success: false, status: "unauthorized", message: "Invalid code" });
    if (row.expiresAt < new Date()) return res.status(401).json({ success: false, status: "unauthorized", message: "Code expired" });
    row.used = true;
    await row.save();
    res.json({ success: true, status: "ok", data: { token: makeToken(user), user: { id: user._id, username: user.username, email: user.email } } });
  } catch (err) {
    res.status(400).json({ success: false, status: "error", message: err.message });
  }
};
