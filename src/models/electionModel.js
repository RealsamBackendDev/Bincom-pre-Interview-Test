const pool = require("../config/db");

const getLgas = async (withPusOnly) => {
  const sql = withPusOnly
    ? `SELECT l.lga_id, l.lga_name
       FROM lga l
       WHERE l.state_id = 25
         AND EXISTS (
           SELECT 1 FROM polling_unit pu
           WHERE pu.lga_id = l.lga_id
             AND (NULLIF(pu.polling_unit_number, '') IS NOT NULL OR NULLIF(pu.polling_unit_name, '') IS NOT NULL)
         )
       ORDER BY l.lga_name`
    : "SELECT lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name";
  const { rows } = await pool.query(sql);
  return rows;
};

const getWardsByLga = async (lgaId) => {
  const { rows } = await pool.query(
    `SELECT w.uniqueid, w.ward_name
     FROM ward w
     WHERE w.lga_id = $1
       AND EXISTS (
         SELECT 1 FROM polling_unit pu
         WHERE pu.uniquewardid = w.uniqueid
           AND (NULLIF(pu.polling_unit_number, '') IS NOT NULL OR NULLIF(pu.polling_unit_name, '') IS NOT NULL)
       )
     ORDER BY w.ward_name`,
    [lgaId]
  );
  return rows;
};

const getPollingUnitsByWard = async (wardUniqueid) => {
  const { rows } = await pool.query(
    `SELECT uniqueid, polling_unit_number, polling_unit_name
     FROM polling_unit
     WHERE uniquewardid = $1
       AND (NULLIF(polling_unit_number, '') IS NOT NULL OR NULLIF(polling_unit_name, '') IS NOT NULL)
     ORDER BY polling_unit_number, polling_unit_name`,
    [wardUniqueid]
  );
  return rows;
};

const getPollingUnitById = async (uniqueid) => {
  const { rows } = await pool.query(
    "SELECT uniqueid, polling_unit_number, polling_unit_name FROM polling_unit WHERE uniqueid = $1",
    [uniqueid]
  );
  return rows[0] || null;
};

const getPollingUnitWithLocation = async (uniqueid) => {
  const { rows } = await pool.query(
    `SELECT pu.uniqueid, pu.polling_unit_number, pu.polling_unit_name,
            w.ward_name, l.lga_name
     FROM polling_unit pu
     LEFT JOIN ward w ON w.uniqueid = pu.uniquewardid
     LEFT JOIN lga l ON l.lga_id = pu.lga_id
     WHERE pu.uniqueid = $1`,
    [uniqueid]
  );
  return rows[0] || null;
};

const getPuResults = async (puUniqueid) => {
  const { rows } = await pool.query(
    `SELECT party_abbreviation, party_score, entered_by_user, date_entered
     FROM announced_pu_results
     WHERE polling_unit_uniqueid = $1
     ORDER BY party_abbreviation`,
    [String(puUniqueid)]
  );
  return rows;
};

const getLgaName = async (lgaId) => {
  const { rows } = await pool.query(
    "SELECT lga_name FROM lga WHERE lga_id = $1",
    [lgaId]
  );
  return rows[0] ? rows[0].lga_name : "";
};

const getSummedLgaResults = async (lgaId) => {
  const { rows } = await pool.query(
    `SELECT apr.party_abbreviation, SUM(apr.party_score) AS total_score
     FROM announced_pu_results apr
     JOIN polling_unit pu ON pu.uniqueid = CAST(apr.polling_unit_uniqueid AS INTEGER)
     WHERE pu.lga_id = $1
     GROUP BY apr.party_abbreviation
     ORDER BY total_score DESC`,
    [lgaId]
  );
  return rows;
};

const getAnnouncedLgaResults = async (lgaId) => {
  const { rows } = await pool.query(
    `SELECT party_abbreviation, party_score
     FROM announced_lga_results
     WHERE lga_name = $1
     ORDER BY party_score DESC`,
    [String(lgaId)]
  );
  return rows;
};

const getLgaPuCount = async (lgaId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT apr.polling_unit_uniqueid) AS cnt
     FROM announced_pu_results apr
     JOIN polling_unit pu ON pu.uniqueid = CAST(apr.polling_unit_uniqueid AS INTEGER)
     WHERE pu.lga_id = $1`,
    [lgaId]
  );
  return Number(rows[0].cnt);
};

const getParties = async () => {
  const { rows } = await pool.query(
    "SELECT DISTINCT party_abbreviation FROM announced_pu_results ORDER BY party_abbreviation"
  );
  return rows.map((row) => row.party_abbreviation);
};

const insertPuResults = async (rows) => {
  const params = [];
  const groups = [];
  rows.forEach((row, index) => {
    const base = index * 6;
    params.push(row.polling_unit_uniqueid, row.party_abbreviation, row.party_score, row.entered_by_user, row.date_entered, row.user_ip_address);
    groups.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
  });
  const sql = `INSERT INTO announced_pu_results
    (polling_unit_uniqueid, party_abbreviation, party_score, entered_by_user, date_entered, user_ip_address)
    VALUES ${groups.join(", ")}`;
  await pool.query(sql, params);
};

module.exports = {
  getLgas,
  getWardsByLga,
  getPollingUnitsByWard,
  getPollingUnitById,
  getPollingUnitWithLocation,
  getPuResults,
  getLgaName,
  getSummedLgaResults,
  getAnnouncedLgaResults,
  getLgaPuCount,
  getParties,
  insertPuResults
};