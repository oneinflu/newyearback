const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/offerController");

router.post("/", ctrl.create);
router.get("/ping", (req, res) => res.json({ status: "offers-ok" }));

module.exports = router;
