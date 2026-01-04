const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/linkExtractorController");
const { requireAuth } = require("../middlewares/auth");

router.post("/extract-links", requireAuth, ctrl.extractLinks);
router.post("/fetch-meta", ctrl.fetchMeta);
router.post("/import-links", requireAuth, ctrl.importLinks);
router.post("/shop-links/:linkId/click", ctrl.trackShopClick);

module.exports = router;
