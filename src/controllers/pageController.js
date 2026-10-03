const { layout, esc, asyncHandler } = require("../utils/helpers");
const { getParties } = require("../models/electionModel");

const home = (req, res) => {
  res.send(layout("Home", `
    <h1>Nigeria 2011 Elections &mdash; Delta State</h1>
    <p class="muted">Dummy results from polling units, wards and local government areas.</p>
    <div class="cards">
      <a class="card" href="/question1">
        <h2>Polling Unit Results</h2>
        <p>View the announced result of any individual polling unit in Delta State.</p>
      </a>
      <a class="card" href="/question2">
        <h2>LGA Total Results</h2>
        <p>View the summed total of all polling units under any local government.</p>
      </a>
      <a class="card" href="/question3">
        <h2>Store New Result</h2>
        <p>Enter and store results for all parties for a polling unit.</p>
      </a>
    </div>`));
};

const question1 = (req, res) => {
  res.send(layout("Polling Unit Result", `
    <h1>Polling Unit Result</h1>
    <p class="muted">Choose a local government, then a ward, then a polling unit.</p>
    <div class="panel">
      <div class="selectors">
        <select id="lgaSelect"></select>
        <select id="wardSelect" disabled></select>
        <select id="puSelect" disabled></select>
      </div>
    </div>
    <div id="results"></div>`, "q1"));
};

const question2 = (req, res) => {
  res.send(layout("LGA Total Result", `
    <h1>LGA Summed Total Result</h1>
    <p class="muted">The total shown is calculated by summing every polling unit result in the selected local government. The announced LGA figure is shown separately for comparison only.</p>
    <div class="panel">
      <div class="selectors">
        <select id="lgaSelect"></select>
      </div>
    </div>
    <div id="results"></div>`, "q2"));
};

const question3Form = asyncHandler(async (req, res) => {
  const parties = await getParties();
  const inputs = parties.map((party) => `
        <label class="party-field"><span>${esc(party)}</span>
          <input type="number" name="${esc(party)}" min="0" step="1" required>
        </label>`).join("");
  res.send(layout("Store New Result", `
    <h1>Store Polling Unit Result</h1>
    <p class="muted">Pick the polling unit, enter your name and the score of every party, then submit. One row per party is inserted into the <strong>announced_pu_results</strong> table.</p>
    <form method="POST" action="/question3" class="panel">
      <div class="selectors">
        <select id="lgaSelect"></select>
        <select id="wardSelect" disabled></select>
        <select id="puSelect" name="polling_unit_uniqueid" disabled required></select>
      </div>
      <label>Entered by (your name)
        <input type="text" name="entered_by_user" maxlength="50" required>
      </label>
      <fieldset>
        <legend>Party scores</legend>
        <div class="party-grid">${inputs}</div>
      </fieldset>
      <button type="submit">Store Results</button>
    </form>`, "q3"));
});

module.exports = { home, question1, question2, question3Form };