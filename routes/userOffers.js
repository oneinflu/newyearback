const express = require("express");
const router = express.Router({ mergeParams: true });
const ctrl = require("../controllers/offerController");
const { requireAuth, requireOwnerParam } = require("../middlewares/auth");

router.get("/", requireAuth, requireOwnerParam("username"), ctrl.listForUser);
router.post("/", requireAuth, requireOwnerParam("username"), ctrl.createForUser);
router.get("/:id", requireAuth, requireOwnerParam("username"), ctrl.getForUser);
router.patch("/:id", requireAuth, requireOwnerParam("username"), ctrl.updateForUser);
router.delete("/:id", requireAuth, requireOwnerParam("username"), ctrl.removeForUser);

module.exports = router;
