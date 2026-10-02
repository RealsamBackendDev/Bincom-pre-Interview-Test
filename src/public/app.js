async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed: " + url);
  return res.json();
}

function esc(value) {
  const div = document.createElement("div");
  div.textContent = value === null || value === undefined ? "" : String(value);
  return div.innerHTML;
}

function fillSelect(select, items, valueKey, labelKey, placeholder) {
  select.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  select.appendChild(ph);
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item[valueKey];
    opt.textContent = item[labelKey];
    select.appendChild(opt);
  });
  select.disabled = items.length === 0;
}

function puLabel(unit) {
  const parts = [unit.polling_unit_number, unit.polling_unit_name]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  return parts.length ? parts.join(" : ") : "Unit " + unit.uniqueid;
}

function fillPuSelect(select, units) {
  select.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "-- Select Polling Unit --";
  select.appendChild(ph);
  units.forEach((unit) => {
    const opt = document.createElement("option");
    opt.value = unit.uniqueid;
    opt.textContent = puLabel(unit);
    select.appendChild(opt);
  });
  select.disabled = units.length === 0;
}

function scoreOf(row) {
  return row.party_score !== undefined ? row.party_score : row.total_score;
}

function resultsTable(rows, scoreHeading) {
  if (!rows.length) {
    return '<p class="empty">No results available for this selection.</p>';
  }
  let total = 0;
  let body = "";
  rows.forEach((row) => {
    const score = Number(scoreOf(row));
    total += score;
    body += "<tr><td>" + esc(row.party_abbreviation) + "</td><td>" + esc(score) + "</td></tr>";
  });
  return '<table><thead><tr><th>Party</th><th>' + esc(scoreHeading) + '</th></tr></thead><tbody>' +
    body + '</tbody><tfoot><tr><td>Total</td><td>' + total + "</td></tr></tfoot></table>";
}

async function loadLgaSelect(lgaSelect, wardSelect, puSelect) {
  fillSelect(wardSelect, [], "uniqueid", "ward_name", "-- Select Ward --");
  fillPuSelect(puSelect, []);
  const lgas = await fetchJSON("/api/lgas");
  fillSelect(lgaSelect, lgas, "lga_id", "lga_name", "-- Select Local Government --");

  lgaSelect.addEventListener("change", async () => {
    fillPuSelect(puSelect, []);
    if (!lgaSelect.value) {
      fillSelect(wardSelect, [], "uniqueid", "ward_name", "-- Select Ward --");
      return;
    }
    const wards = await fetchJSON("/api/wards?lga=" + encodeURIComponent(lgaSelect.value));
    fillSelect(wardSelect, wards, "uniqueid", "ward_name", "-- Select Ward --");
  });

  wardSelect.addEventListener("change", async () => {
    if (!wardSelect.value) {
      fillPuSelect(puSelect, []);
      return;
    }
    const units = await fetchJSON("/api/polling-units?ward=" + encodeURIComponent(wardSelect.value));
    fillPuSelect(puSelect, units);
  });
}

async function initQ1() {
  const lgaSelect = document.getElementById("lgaSelect");
  const wardSelect = document.getElementById("wardSelect");
  const puSelect = document.getElementById("puSelect");
  const results = document.getElementById("results");

  await loadLgaSelect(lgaSelect, wardSelect, puSelect);

  puSelect.addEventListener("change", async () => {
    if (!puSelect.value) {
      results.innerHTML = "";
      return;
    }
    results.innerHTML = '<p class="muted">Loading...</p>';
    const data = await fetchJSON("/api/pu-results?pu=" + encodeURIComponent(puSelect.value));
    if (!data.polling_unit) {
      results.innerHTML = '<p class="empty">Polling unit not found.</p>';
      return;
    }
    const pu = data.polling_unit;
    let html = '<div class="panel"><h2>' + esc(pu.polling_unit_name || pu.polling_unit_number) + "</h2>";
    html += '<p class="muted">Unit number: ' + esc(pu.polling_unit_number) +
      " &nbsp;|&nbsp; Ward: " + esc(pu.ward_name || "N/A") +
      " &nbsp;|&nbsp; LGA: " + esc(pu.lga_name || "N/A") + "</p>";
    html += resultsTable(data.results, "Score");
    html += "</div>";
    results.innerHTML = html;
  });
}

async function initQ2() {
  const lgaSelect = document.getElementById("lgaSelect");
  const results = document.getElementById("results");

  const lgas = await fetchJSON("/api/lgas");
  fillSelect(lgaSelect, lgas, "lga_id", "lga_name", "-- Select Local Government --");

  lgaSelect.addEventListener("change", async () => {
    if (!lgaSelect.value) {
      results.innerHTML = "";
      return;
    }
    results.innerHTML = '<p class="muted">Loading...</p>';
    const data = await fetchJSON("/api/lga-results?lga=" + encodeURIComponent(lgaSelect.value));
    let html = '<div class="panel"><h2>' + esc(data.lga_name || "Local Government") + "</h2>";
    html += '<p class="muted">' + esc(data.polling_units) + " polling unit(s) with announced results under this LGA</p></div>";
    html += '<div class="grid">';
    html += '<div class="panel"><h3>Summed total of polling unit results</h3>' +
      resultsTable(data.summed, "Total Score") + "</div>";
    html += '<div class="panel"><h3>Announced at LGA collation centre (comparison only)</h3>' +
      resultsTable(data.announced, "Announced Score") + "</div>";
    html += "</div>";
    results.innerHTML = html;
  });
}

async function initQ3() {
  const lgaSelect = document.getElementById("lgaSelect");
  const wardSelect = document.getElementById("wardSelect");
  const puSelect = document.getElementById("puSelect");
  await loadLgaSelect(lgaSelect, wardSelect, puSelect);
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "q1") initQ1();
  if (page === "q2") initQ2();
  if (page === "q3") initQ3();
});