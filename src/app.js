const express = require("express");
const path = require("path");
const routes = require("./routes");
const { layout } = require("./utils/helpers");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", routes);

app.use((req, res) => {
  res.status(404).send(layout("Not found", '<h1>Page not found</h1><p><a href="/">Back to home</a></p>'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(layout("Server error", "<h1>Server error</h1><p>Please try again.</p>"));
});

module.exports = app;