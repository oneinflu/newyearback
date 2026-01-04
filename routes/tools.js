const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/linkExtractorController");
const { requireAuth } = require("../middlewares/auth");

router.post("/extract-links", requireAuth, ctrl.extractLinks);

module.exports = router;
