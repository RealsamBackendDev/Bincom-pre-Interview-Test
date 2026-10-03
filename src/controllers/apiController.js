const {
  getLgas,
  getWardsByLga,
  getPollingUnitsByWard,
  getPollingUnitWithLocation,
  getPuResults,
  getLgaName,
  getSummedLgaResults,
  getAnnouncedLgaResults,
  getLgaPuCount
} = require("../models/electionModel");
const { asyncHandler } = require("../utils/helpers");

const lgas = asyncHandler(async (req, res) => {
  res.json(await getLgas(req.query.with_pus === "1"));
});

const wards = asyncHandler(async (req, res) => {
  res.json(await getWardsByLga(req.query.lga));
});

const pollingUnits = asyncHandler(async (req, res) => {
  res.json(await getPollingUnitsByWard(req.query.ward));
});

const puResults = asyncHandler(async (req, res) => {
  const pollingUnit = await getPollingUnitWithLocation(req.query.pu);
  const results = await getPuResults(req.query.pu);
  res.json({ polling_unit: pollingUnit, results });
});

const lgaResults = asyncHandler(async (req, res) => {
  const lgaId = req.query.lga;
  res.json({
    lga_name: await getLgaName(lgaId),
    polling_units: await getLgaPuCount(lgaId),
    summed: await getSummedLgaResults(lgaId),
    announced: await getAnnouncedLgaResults(lgaId)
  });
});

module.exports = { lgas, wards, pollingUnits, puResults, lgaResults };