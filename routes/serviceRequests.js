const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/serviceRequestController");

router.post("/", ctrl.createPublic);

module.exports = router;
