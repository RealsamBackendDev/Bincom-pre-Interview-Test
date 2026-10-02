const { layout, table, esc, asyncHandler, currentTimestamp, clientIp } = require("../utils/helpers");
const {
  getPollingUnitById,
  getParties,
  insertPuResults
} = require("../models/electionModel");

const storeResult = asyncHandler(async (req, res) => {
  const puUniqueid = req.body.polling_unit_uniqueid;
  const enteredBy = (req.body.entered_by_user || "").trim();
  const ip = clientIp(req);
  const errors = [];

  const unit = puUniqueid ? await getPollingUnitById(puUniqueid) : null;
  if (!unit) {
    errors.push("A valid polling unit must be selected.");
  }
  if (!enteredBy) {
    errors.push("The name of the person entering the result is required.");
  }

  const parties = await getParties();
  const rows = [];
  parties.forEach((party) => {
    const raw = req.body[party];
    if (raw === undefined || String(raw).trim() === "") {
      errors.push("Missing score for " + party + ".");
      return;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      errors.push("Invalid score for " + party + " (whole number, zero or more).");
      return;
    }
    rows.push({
      polling_unit_uniqueid: String(puUniqueid),
      party_abbreviation: party,
      party_score: value,
      entered_by_user: enteredBy,
      date_entered: currentTimestamp(),
      user_ip_address: ip
    });
  });

  if (errors.length) {
    return res.status(400).send(layout("Error", `
      <h1>Could not store results</h1>
      <ul class="errors">${errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
      <p><a href="/question3">&larr; Back to the form</a></p>`));
  }

  await insertPuResults(rows);

  const label = unit.polling_unit_name || unit.polling_unit_number || "Polling unit " + unit.uniqueid;
  res.send(layout("Stored", `
    <h1>Results stored successfully</h1>
    <div class="panel">
      <p class="success">${rows.length} rows inserted for <strong>${esc(label)}</strong> (polling unit uniqueid ${esc(unit.uniqueid)}) by <strong>${esc(enteredBy)}</strong> at ${esc(rows[0].date_entered)} from IP ${esc(ip)}.</p>
      ${table(rows.map((row) => ({ party_abbreviation: row.party_abbreviation, party_score: row.party_score })), "Score")}
      <p style="margin-top:14px"><a href="/question1">View this polling unit on the Question 1 page</a> &nbsp;|&nbsp; <a href="/question3">Store another result</a></p>
    </div>`));
});

module.exports = { storeResult };