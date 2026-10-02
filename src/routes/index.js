const express = require("express");
const pages = require("../controllers/pageController");
const api = require("../controllers/apiController");
const results = require("../controllers/resultController");

const router = express.Router();

router.get("/", pages.home);
router.get("/question1", pages.question1);
router.get("/question2", pages.question2);
router.get("/question3", pages.question3Form);
router.post("/question3", results.storeResult);

router.get("/api/lgas", api.lgas);
router.get("/api/wards", api.wards);
router.get("/api/polling-units", api.pollingUnits);
router.get("/api/pu-results", api.puResults);
router.get("/api/lga-results", api.lgaResults);

module.exports = router;