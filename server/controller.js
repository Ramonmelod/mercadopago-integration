import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { MercadoPagoConfig, Payment } from "mercadopago";
import authentication from "../models/authentication.js";
import email from "../infra/email.js";
import paymentRepository from "../service/paymentRepository.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;
const token = process.env.TOKEN;
const secret = process.env.MP_WEBHOOK_SECRET;
const ebookPrice = 0.01; // change to the real price

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
    return res.sendStatus(204);
  }
  next();
});

// 3) JSON body parser (após o preflight handler)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // guarda o corpo original como string
    },
  })
);

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
    console.error("❌ Falha ao buscar dados, você adicionou o .ENV?:", error);
  }
}
const client = new MercadoPagoConfig({
  accessToken: token,
  options: { timeout: 5000, idempotencyKey: uuidv4() }, //uuid used to identify every transaction
});

const payment = new Payment(client);

app.get("/", (req, res) => {
  res
    .status(403)
    .set({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    })
    .json({
      error: "Access forbidden",
      message: "This endpoint is restricted. Please use authorized routes.",
    });
});

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
    first_name: data?.first_name,
    brand_name: data?.company?.brand_name,
  });
});

app.post("/webhook/mercadopago", async (req, res) => {
  //Real event Id: 135112247362
  try {
    const isMercadoPago = authentication.verifyMercadoPagoSignature(
      req,
      secret
    );
    console.log("is mercado Pago? ", isMercadoPago);
    if (!isMercadoPago) {
      console.log("Requisição não autêntica");
      return res.sendStatus(401);
    }
    const { type, data, id, action } = req.body;

    if (type !== "payment" || action !== "payment.updated") {
      return res.sendStatus(200);
    }

    const paymentId = data.id;
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/`, //'http://localhost:8080/mock/payments/:id'
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`event id: ${id}`);
    console.log("consultando url abaixo:");
    console.log(`https://api.mercadopago.com/v1/payments/${paymentId}`);
    const paymentInfo = await response.json();

    // avoid e-mail to payments test/sandbox
    if (!paymentInfo.live_mode) {
      console.log("A requisição recebida foi de teste");
      return res.sendStatus(200);
    }

    await paymentRepository.markPaymentAsProcessed(id); //record redis
    const searchedId = await paymentRepository.wasPaymentProcessed(id); // query to redis

    if (searchedId) {
      console.log("A requisição já recebida e processada anteriormente");
      return res.sendStatus(200);
    }

    const isApproved =
      paymentInfo.status === "approved" &&
      paymentInfo.status_detail === "accredited" &&
      paymentInfo.transaction_amount === ebookPrice && // valor correto
      paymentInfo.collector_id === 347508936;

    const status = paymentInfo.status;
    const status_detail = paymentInfo.status_detail;
    console.log(status);
    console.log(status_detail);

    if (isApproved) {
      console.log("pagamento confirmado");
      await email.send({
        from: "contato@frutosfeitoamao.com.br",
        to: "contato@ramonmelo.com.br",
        subject: "teste assunto vindo da api frutos",
        text: `Teste de corpo vinda da api da frutos`,
      });
    }

    console.log(paymentInfo);

    res.sendStatus(200);
    return;
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// The endpoint /mock/payments/:id is used only for mocking
app.get("/mock/payments/:id", (req, res) => {
  const paymentId = req.params.id;

  // resposta mock (campos principais semelhantes ao /v1/payments do Mercado Pago)
  const mockResponse = {
    id: Number(paymentId) || 123456789,
    status: "pending",
    status_detail: "pending_waiting_transfer",
    transaction_amount: 0.01,
    currency_id: "BRL",
    date_created: new Date().toISOString(),
    date_last_updated: new Date().toISOString(),
    description: "Mocked payment for testing",
    payer: {
      id: "1657160132",
      email: "cliente@example.com",
      first_name: "Cliente",
      last_name: "Teste",
      identification: { type: "CPF", number: "00000000000" },
    },
    payment_method_id: "pix",
    payment_type_id: "bank_transfer",
    point_of_interaction: {
      transaction_data: {
        qr_code:
          "00020126580014br.gov.bcb.pix0136mocked-pix-code-12345678952040000530398654040.015802BR5909TESTE6012Cidade62250521mockpix1323643642636304D675",
        qr_code_base64:
          "iVBORw0KGgoAAAANSUhEUgAA...MOCKED_BASE64_IMAGE_DATA...",
        ticket_url: `https://www.mercadopago.com.br/payments/${paymentId}/ticket?mock=true`,
      },
    },
    // extras utilitários que podem aparecer na resposta real
    transaction_details: {
      total_paid_amount: 0.01,
      net_received_amount: 0.01,
    },
  };

  // simular small delay opcional (descomente se quiser)
  // setTimeout(() => res.json(mockResponse), 300);

  res.json(mockResponse);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

//https://mercadopago-integration-three.vercel.app/webhook/mercadopago
