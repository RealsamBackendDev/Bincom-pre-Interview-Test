const PAGE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Arial, sans-serif; background: #f1f5f2; color: #1c2b22; }
  nav { background: #046a38; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; flex-wrap: wrap; gap: 10px; }
  nav .brand { font-weight: bold; font-size: 18px; text-decoration: none; color: #fff; }
  nav .links a { color: #d9f0e4; text-decoration: none; margin-left: 16px; font-size: 14px; }
  nav .links a:hover { color: #fff; text-decoration: underline; }
  main { max-width: 1000px; margin: 30px auto; padding: 0 16px; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  h2 { font-size: 19px; margin-bottom: 8px; }
  h3 { font-size: 16px; margin-bottom: 10px; }
  .muted { color: #5c6f64; font-size: 14px; margin-bottom: 16px; }
  .panel { background: #fff; border: 1px solid #d8e4dc; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 20px; }
  .card { display: block; background: #fff; border: 1px solid #d8e4dc; border-radius: 10px; padding: 20px; text-decoration: none; color: inherit; }
  .card:hover { border-color: #046a38; box-shadow: 0 2px 8px rgba(4, 106, 56, 0.15); }
  .card h2 { color: #046a38; }
  .card p { font-size: 14px; color: #5c6f64; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .selectors { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  select, input[type="text"], input[type="number"] { padding: 10px; border: 1px solid #b9cec2; border-radius: 6px; font-size: 14px; }
  select { min-width: 230px; }
  select:disabled { background: #eef3f0; color: #93a69a; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2ece6; font-size: 14px; }
  th { background: #046a38; color: #fff; }
  tfoot td { font-weight: bold; background: #e9f4ee; }
  .empty { color: #8a6d1d; background: #fdf6e3; border: 1px solid #f0e2b6; padding: 12px; border-radius: 6px; font-size: 14px; }
  form label { display: block; margin-bottom: 14px; font-size: 14px; font-weight: 600; }
  form input[type="text"] { display: block; margin-top: 6px; width: 100%; max-width: 420px; }
  fieldset { border: 1px solid #d8e4dc; border-radius: 8px; padding: 16px; margin: 16px 0; }
  legend { font-size: 14px; font-weight: 600; padding: 0 6px; }
  .party-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .party-field { font-weight: 600; font-size: 13px; }
  .party-field input { display: block; margin-top: 4px; width: 100%; }
  button { background: #046a38; color: #fff; border: none; padding: 12px 26px; font-size: 15px; border-radius: 6px; cursor: pointer; }
  button:hover { background: #03552d; }
  .errors { background: #fdecea; border: 1px solid #f5c6c0; color: #a12622; padding: 14px 14px 14px 32px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
  .success { background: #e9f4ee; border: 1px solid #b9dcc8; color: #046a38; padding: 14px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
  a { color: #046a38; }
`;

function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title, body, page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | 2011 Election Results</title>
<style>${PAGE_CSS}</style>
</head>
<body data-page="${esc(page || "")}">
<nav>
  <a class="brand" href="/">INEC 2011 Results Portal</a>
  <div class="links">
    <a href="/question1">Polling Unit</a>
    <a href="/question2">LGA Total</a>
    <a href="/question3">Store Result</a>
  </div>
</nav>
<main>${body}</main>
<script src="/app.js"></script>
</body>
</html>`;
}

function table(rows, scoreHeading) {
  if (!rows.length) {
    return '<p class="empty">No results available.</p>';
  }
  let total = 0;
  let body = "";
  rows.forEach((row) => {
    const score = Number(row.party_score !== undefined ? row.party_score : row.total_score);
    total += score;
    body += `<tr><td>${esc(row.party_abbreviation)}</td><td>${esc(score)}</td></tr>`;
  });
  return `<table><thead><tr><th>Party</th><th>${esc(scoreHeading)}</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td>Total</td><td>${total}</td></tr></tfoot></table>`;
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function currentTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function clientIp(req) {
  const forwarded = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "";
}

module.exports = { esc, layout, table, asyncHandler, currentTimestamp, clientIp };