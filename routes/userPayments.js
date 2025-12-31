const express = require("express");
const router = express.Router({ mergeParams: true });
const ctrl = require("../controllers/paymentLinkController");
const txnCtrl = require("../controllers/paymentTransactionController");
const { upload } = require("../middlewares/upload");
const { requireAuth, requireOwnerParam } = require("../middlewares/auth");

router.get("/", requireAuth, requireOwnerParam("username"), ctrl.listForUser);
router.post("/", requireAuth, requireOwnerParam("username"), ctrl.createForUser);
router.get("/:id", requireAuth, requireOwnerParam("username"), ctrl.getForUser);
router.patch("/:id", requireAuth, requireOwnerParam("username"), ctrl.updateForUser);
router.delete("/:id", requireAuth, requireOwnerParam("username"), ctrl.removeForUser);
router.get("/:paymentId/transactions", txnCtrl.listForPayment);
router.post("/:paymentId/transactions", requireAuth, requireOwnerParam("username"), upload.single("proof"), txnCtrl.createForUser);

module.exports = router;
