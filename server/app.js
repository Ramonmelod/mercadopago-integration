const express = require("express");
const dotEnv = require("dotenv").config({ path: "./.env.development" });
const app = express();
const PORT = 8080;
const TOKEN = process.env.TOKEN;

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    nome: "Ramon",
    idade: 33,
    token: TOKEN,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT} e ${TOKEN}`);
});
