const express = require("express");
const dotEnv = require("dotenv").config(/*{ path: "./.env.development" }*/);
const app = express();
const PORT = 8080;
const token = process.env.TOKEN;

async function getUserInfo() {
  try {
    const response = await fetch("https://api.mercadopago.com/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Falha ao buscar dados:", error.message);
  }
}

app.get("/users/me", async (req, res) => {
  const data = await getUserInfo();
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    first_name: data.first_name,
    brand_name: data.company?.brand_name,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
