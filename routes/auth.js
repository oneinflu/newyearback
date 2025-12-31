const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");

router.post("/login", ctrl.loginWithPassword);
router.post("/otp/send", ctrl.sendOtp);
router.post("/otp/login", ctrl.loginWithOtp);
router.get("/username/check", ctrl.checkUsername);
router.post("/username/check", ctrl.checkUsername);
router.post("/register/otp/send", ctrl.sendRegisterOtp);
router.post("/register", ctrl.registerWithOtp);
router.post("/register/username/save", ctrl.saveRegisterUsername);
router.post("/register/otp/verify", ctrl.verifyRegisterOtp);
router.post("/register/start", ctrl.startRegister);

module.exports = router;
