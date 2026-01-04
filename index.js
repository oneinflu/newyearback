const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

if (process.env.NODE_ENV !== "production" && typeof process.env.DEV_EXPOSE_OTP === "undefined") {
  process.env.DEV_EXPOSE_OTP = "true";
}

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

const rawMongo = process.env.MONGODB_URI || process.env.MONGO_URI;
const dbName = process.env.DB_NAME || process.env.MONGO_DB_NAME || "influu";
function buildMongoUri(uri, name) {
  if (!uri) return `mongodb://127.0.0.1:27017/${name}`;
  const hasDbPath = /mongodb(\+srv)?:\/\/[^/]+\/[^?]/.test(uri);
  if (hasDbPath) return uri;
  const sep = uri.endsWith("/") ? "" : "/";
  return `${uri}${sep}${name}`;
}
const MONGODB_URI = buildMongoUri(rawMongo, dbName);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, status: "invalid_json", message: "Malformed JSON" });
  }
  next(err);
});

app.get("/__routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      routes.push({ method: Object.keys(m.route.methods)[0], path: m.route.path });
    } else if (m.name === "router" && m.handle && m.handle.stack) {
      m.handle.stack.forEach((h) => {
        if (h.route && h.route.path) {
          routes.push({ method: Object.keys(h.route.methods)[0], path: h.route.path });
        }
      });
    }
  });
  res.json(routes);
});
app.use("/api", require("./routes/tools"));
app.use("/users", require("./routes/users"));
app.use("/offers", require("./routes/offers"));
app.post("/offers", (req, res) => {
  res.json({ ok: true });
});
app.use("/service-requests", require("./routes/serviceRequests"));
const authCtrl = require("./controllers/authController");
app.post("/auth/login", authCtrl.loginWithPassword);
app.post("/auth/otp/send", authCtrl.sendOtp);
app.post("/auth/otp/login", authCtrl.loginWithOtp);
app.get("/auth/username/check", authCtrl.checkUsername);
app.post("/auth/username/check", authCtrl.checkUsername);
app.post("/auth/register/otp/send", authCtrl.sendRegisterOtp);
app.post("/auth/register", authCtrl.registerWithOtp);
app.post("/auth/register/username/save", authCtrl.saveRegisterUsername);
app.post("/auth/register/otp/verify", authCtrl.verifyRegisterOtp);
app.post("/auth/register/start", authCtrl.startRegister);
app.post("/auth/register/data/save", authCtrl.saveRegisterData);
app.get("/auth/register/data", authCtrl.getRegisterData);
const offerCtrl = require("./controllers/offerController");
const userCtrl = require("./controllers/userController");
const { requireAuth, requireOwnerParam, requireOwnerId } = require("./middlewares/auth");
app.post("/users/:username/offers", requireAuth, requireOwnerParam("username"), offerCtrl.createForUser);
app.get("/users/:username/offers", requireAuth, requireOwnerParam("username"), offerCtrl.listForUser);
app.get("/users/:username/offers/:id", requireAuth, requireOwnerParam("username"), offerCtrl.getForUser);
app.patch("/users/:username/offers/:id", requireAuth, requireOwnerParam("username"), offerCtrl.updateForUser);
app.delete("/users/:username/offers/:id", requireAuth, requireOwnerParam("username"), offerCtrl.removeForUser);
app.post("/users/id/:id/offers", requireAuth, requireOwnerId("id"), offerCtrl.createForUserById);
app.get("/users/id/:id/offers", requireAuth, requireOwnerId("id"), offerCtrl.listForUserById);
app.get("/users/id/:id/offers/:offerId", requireAuth, requireOwnerId("id"), offerCtrl.getForUserById);
app.patch("/users/id/:id/offers/:offerId", requireAuth, requireOwnerId("id"), offerCtrl.updateForUserById);
app.delete("/users/id/:id/offers/:offerId", requireAuth, requireOwnerId("id"), offerCtrl.removeForUserById);
const paymentCtrl = require("./controllers/paymentLinkController");
app.get("/pay/:paymentId", paymentCtrl.getPublic);
app.post("/users/:username/payments", requireAuth, requireOwnerParam("username"), paymentCtrl.createForUser);
app.get("/users/:username/payments", requireAuth, requireOwnerParam("username"), paymentCtrl.listForUser);
app.get("/users/:username/payments/:id", requireAuth, requireOwnerParam("username"), paymentCtrl.getForUser);
app.patch("/users/:username/payments/:id", requireAuth, requireOwnerParam("username"), paymentCtrl.updateForUser);
app.delete("/users/:username/payments/:id", requireAuth, requireOwnerParam("username"), paymentCtrl.removeForUser);
const socialCtrl = require("./controllers/socialLinkController");
const manualPayCtrl = require("./controllers/manualPaymentController");
app.post("/users/:username/social-links", requireAuth, requireOwnerParam("username"), socialCtrl.createForUser);
app.get("/users/:username/social-links", requireAuth, requireOwnerParam("username"), socialCtrl.listForUser);
app.get("/users/:username/social-links/:id", requireAuth, requireOwnerParam("username"), socialCtrl.getForUser);
app.patch("/users/:username/social-links/:id", requireAuth, requireOwnerParam("username"), socialCtrl.updateForUser);
app.delete("/users/:username/social-links/:id", requireAuth, requireOwnerParam("username"), socialCtrl.removeForUser);
// Manual payments (no link)
app.post("/users/:username/manual-payments", requireAuth, requireOwnerParam("username"), manualPayCtrl.createForUser);
app.get("/users/:username/manual-payments", requireAuth, requireOwnerParam("username"), manualPayCtrl.listForUser);
app.get("/users/:username/manual-payments/:id", requireAuth, requireOwnerParam("username"), manualPayCtrl.getForUser);
app.patch("/users/:username/manual-payments/:id", requireAuth, requireOwnerParam("username"), manualPayCtrl.updateForUser);
app.delete("/users/:username/manual-payments/:id", requireAuth, requireOwnerParam("username"), manualPayCtrl.removeForUser);
app.post("/users/id/:id/social-links", requireAuth, requireOwnerId("id"), socialCtrl.createForUserById);
app.get("/users/id/:id/social-links", requireAuth, requireOwnerId("id"), socialCtrl.listForUserById);
app.get("/users/id/:id/social-links/:linkId", requireAuth, requireOwnerId("id"), socialCtrl.getForUserById);
app.patch("/users/id/:id/social-links/:linkId", requireAuth, requireOwnerId("id"), socialCtrl.updateForUserById);
app.delete("/users/id/:id/social-links/:linkId", requireAuth, requireOwnerId("id"), socialCtrl.removeForUserById);
app.get("/users/:username/profile", userCtrl.getProfile);
const serviceReqCtrl = require("./controllers/serviceRequestController");
app.post("/users/:username/enquiries", serviceReqCtrl.createPublicForUser);
app.get("/users/:username/enquiries", requireAuth, requireOwnerParam("username"), serviceReqCtrl.listForUser);
app.get("/users/:username/enquiries/:id", requireAuth, requireOwnerParam("username"), serviceReqCtrl.getForUser);
app.patch("/users/:username/enquiries/:id", requireAuth, requireOwnerParam("username"), serviceReqCtrl.updateForUser);
app.delete("/users/:username/enquiries/:id", requireAuth, requireOwnerParam("username"), serviceReqCtrl.removeForUser);
const portfolioCtrl = require("./controllers/portfolioController");
const { upload } = require("./middlewares/upload");
app.post("/users/:username/portfolio", requireAuth, requireOwnerParam("username"), upload.single("file"), portfolioCtrl.createForUser);
app.get("/users/:username/portfolio", requireAuth, requireOwnerParam("username"), portfolioCtrl.listForUser);
app.get("/users/:username/portfolio/:id", requireAuth, requireOwnerParam("username"), portfolioCtrl.getForUser);
app.patch("/users/:username/portfolio/:id", requireAuth, requireOwnerParam("username"), upload.single("file"), portfolioCtrl.updateForUser);
app.delete("/users/:username/portfolio/:id", requireAuth, requireOwnerParam("username"), portfolioCtrl.removeForUser);

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
