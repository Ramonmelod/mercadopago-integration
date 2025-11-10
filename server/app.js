const express = require("express");
const dotEnv = require("dotenv").config(/*{ path: "./.env.development" }*/);
const { MercadoPagoConfig, Payment } = require("mercadopago");
const { v4: uuidv4 } = require("uuid");
const app = express();
const PORT = process.env.PORT || 8080;
const token = process.env.TOKEN;
const cors = require("cors");
app.use(cors());
app.use(express.json());

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
    console.error("❌ Falha ao buscar dados:", error);
  }
}

const client = new MercadoPagoConfig({
  accessToken: token,
  options: { timeout: 5000, idempotencyKey: uuidv4() }, //uuid used to identify every transaction
});

const payment = new Payment(client);

app.post("/create-pix", async (req, res) => {
  try {
    const name = req.body.name ? req.body.name : "querida(o) cliente";
    const body = {
      transaction_amount: 0.01,
      description: "E-book Frutos Feito à Mão",
      payment_method_id: "pix",
      payer: {
        email: req.body.email,
        first_name: name,
      },
    };

    const response = await payment.create({ body });
    //console.log(JSON.stringify(response, null, 2));

    const pixInfo = response?.point_of_interaction?.transaction_data;

    if (pixInfo?.qr_code && pixInfo?.qr_code_base64) {
      return res.json({
        message: "✅ Pagamento PIX criado com sucesso!",
        qr_code: pixInfo.qr_code,
        qr_code_base64: pixInfo.qr_code_base64,
        ticket_url: pixInfo.ticket_url,
      });
    } else {
      throw new Error(
        "❌ Pagamento criado sem dados de PIX. Verifique as credenciais e permissões da conta."
      );
    }
  } catch (error) {
    console.error("❌ Erro ao criar pagamento PIX:", error);
    res.status(500).json({ error: error.message });
  }
});
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
