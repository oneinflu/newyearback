const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, default: null },
  niche: { type: String, default: null },
  category: { type: String, enum: ["Creator", "Business", "Personal"], default: null },
  username: { type: String, unique: true, default: null },
  shortBio: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  whatsapp: { type: String, default: null },
  upi: { type: String, default: null },
  address: { type: String, default: null },
  password: { type: String, default: null },
  referralId: { type: String, default: null },
  contactPreference: { type: String, enum: ["email", "whatsapp"], default: "email" }
});

userSchema.pre("save", function (next) {
  if (this.isNew && !this.referralId) {
    const Counter = require("./counter");
    const p = Counter.findOneAndUpdate(
      { key: "user_referral" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).then((c) => {
      const referral = `INFLU${String(c.seq).padStart(2, "0")}`;
      this.referralId = referral;
    });
    if (typeof next === "function") {
      p.then(() => next()).catch((err) => next(err));
      return;
    }
    return p;
  } else {
    if (typeof next === "function") return next();
    return Promise.resolve();
  }
});

userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password") && this.password) {
      const hash = await bcrypt.hash(this.password, 10);
      this.password = hash;
    }
    if (typeof next === "function") return next();
    return Promise.resolve();
  } catch (err) {
    if (typeof next === "function") return next(err);
    throw err;
  }
});

module.exports = mongoose.model("User", userSchema);
