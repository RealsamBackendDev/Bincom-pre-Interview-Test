require("dotenv").config();

const fs = require("fs");
const { Pool } = require("pg");

const clean = (value, fallback) => {
  const v = value === undefined || value === null ? "" : String(value).trim();
  return v === "" ? fallback : v;
};

const DB_NAME = clean(process.env.PGDATABASE, "bincomphptest");

if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(DB_NAME)) {
  console.error("Invalid PGDATABASE value in .env: \"" + process.env.PGDATABASE + "\"");
  console.error("Use letters, digits and underscores only, for example: PGDATABASE=bincomphptest");
  process.exit(1);
}

const baseConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: clean(process.env.PGHOST, "localhost"),
      port: Number(clean(process.env.PGPORT, "5432")),
      user: clean(process.env.PGUSER, "postgres"),
      password: clean(process.env.PGPASSWORD, "")
    };

const pool = new Pool({ ...baseConfig, database: DB_NAME });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agentname (
  name_id SERIAL PRIMARY KEY,
  firstname VARCHAR(255) NOT NULL,
  lastname VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(13) NOT NULL,
  pollingunit_uniqueid INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS announced_lga_results (
  result_id SERIAL PRIMARY KEY,
  lga_name VARCHAR(50) NOT NULL,
  party_abbreviation VARCHAR(4) NOT NULL,
  party_score INTEGER NOT NULL,
  entered_by_user VARCHAR(50) NOT NULL,
  date_entered TIMESTAMP NOT NULL,
  user_ip_address VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS announced_pu_results (
  result_id SERIAL PRIMARY KEY,
  polling_unit_uniqueid VARCHAR(50) NOT NULL,
  party_abbreviation VARCHAR(4) NOT NULL,
  party_score INTEGER NOT NULL,
  entered_by_user VARCHAR(50) NOT NULL,
  date_entered TIMESTAMP NOT NULL,
  user_ip_address VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS announced_state_results (
  result_id SERIAL PRIMARY KEY,
  state_name VARCHAR(50) NOT NULL,
  party_abbreviation VARCHAR(4) NOT NULL,
  party_score INTEGER NOT NULL,
  entered_by_user VARCHAR(50) NOT NULL,
  date_entered TIMESTAMP NOT NULL,
  user_ip_address VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS announced_ward_results (
  result_id SERIAL PRIMARY KEY,
  ward_name VARCHAR(50) NOT NULL,
  party_abbreviation VARCHAR(4) NOT NULL,
  party_score INTEGER NOT NULL,
  entered_by_user VARCHAR(50) NOT NULL,
  date_entered TIMESTAMP NOT NULL,
  user_ip_address VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS lga (
  uniqueid SERIAL PRIMARY KEY,
  lga_id INTEGER NOT NULL,
  lga_name VARCHAR(50) NOT NULL,
  state_id INTEGER NOT NULL,
  lga_description TEXT,
  entered_by_user VARCHAR(50) NOT NULL,
  date_entered TIMESTAMP,
  user_ip_address VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS party (
  id SERIAL PRIMARY KEY,
  partyid VARCHAR(11) NOT NULL,
  partyname VARCHAR(11) NOT NULL
);
CREATE TABLE IF NOT EXISTS polling_unit (
  uniqueid SERIAL PRIMARY KEY,
  polling_unit_id INTEGER NOT NULL,
  ward_id INTEGER NOT NULL,
  lga_id INTEGER NOT NULL,
  uniquewardid INTEGER,
  polling_unit_number VARCHAR(50),
  polling_unit_name VARCHAR(50),
  polling_unit_description TEXT,
  lat VARCHAR(255),
  long VARCHAR(255),
  entered_by_user VARCHAR(50),
  date_entered TIMESTAMP,
  user_ip_address VARCHAR(50)
);
CREATE TABLE IF NOT EXISTS states (
  state_id INTEGER PRIMARY KEY,
  state_name VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS ward (
  uniqueid SERIAL PRIMARY KEY,
  ward_id INTEGER NOT NULL,
  ward_name VARCHAR(50) NOT NULL,
  lga_id INTEGER NOT NULL,
  ward_description TEXT,
  entered_by_user VARCHAR(50) NOT NULL,
  date_entered TIMESTAMP,
  user_ip_address VARCHAR(50) NOT NULL
);
`;

const SERIAL_COLUMNS = [
  ["agentname", "name_id"],
  ["announced_lga_results", "result_id"],
  ["announced_pu_results", "result_id"],
  ["announced_state_results", "result_id"],
  ["announced_ward_results", "result_id"],
  ["lga", "uniqueid"],
  ["party", "id"],
  ["polling_unit", "uniqueid"],
  ["ward", "uniqueid"]
];

const TABLES = SERIAL_COLUMNS.map((entry) => entry[0]).concat(["states"]);

async function ensureDatabase() {
  if (process.env.DATABASE_URL) return;
  const admin = new Pool({ ...baseConfig, database: "postgres" });
  try {
    await admin.query("CREATE DATABASE " + DB_NAME);
    console.log("Step 2/4: database '" + DB_NAME + "' created.");
  } catch (err) {
    if (err.code !== "42P04") throw err;
    console.log("Step 2/4: database '" + DB_NAME + "' already exists.");
  }
  await admin.end();
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node import.js <path to bincom_test.sql>");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error("File not found: " + file);
    console.error("Make sure bincom_test.sql is in this folder.");
    process.exit(1);
  }

  const raw = fs.readFileSync(file, "latin1");

  console.log("Step 1/4: connecting to PostgreSQL...");
  await ensureDatabase();

  console.log("Step 3/4: creating tables and loading rows...");
  await pool.query(SCHEMA);

  const statements = raw.split(/;\s*\r?\n/);
  let inserted = 0;
  for (const chunk of statements) {
    const start = chunk.indexOf("INSERT INTO");
    if (start === -1) continue;
    const sql = chunk
      .slice(start)
      .replace(/`/g, "")
      .replace(/'0000-00-00 00:00:00'/g, "NULL") + ";";
    try {
      await pool.query(sql);
      inserted += 1;
    } catch (err) {
      console.error("A data statement failed. It starts like this:");
      console.error(sql.slice(0, 250));
      throw err;
    }
  }

  console.log("Step 4/4: resetting id counters...");
  for (const [table, column] of SERIAL_COLUMNS) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${column}) FROM ${table}), 1), (SELECT COUNT(*) FROM ${table}) > 0)`,
      [table, column]
    );
  }

  console.log("Executed " + inserted + " INSERT statements.");
  for (const table of TABLES) {
    const { rows } = await pool.query(`SELECT COUNT(*) AS c FROM ${table}`);
    console.log(table + ": " + rows[0].c + " rows");
  }
  console.log("Import complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("IMPORT FAILED: " + err.message);
  process.exit(1);
});