import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authentication from "../models/authentication.js";
import email from "../infra/email.js";
import paymentRepository from "../service/paymentRepository.js";
import emailTemplate from "../utils/emailTemplate.js";
import paymentService from "../service/paymentService.js";
import userService from "../service/userService.js";
import signedUrlService from "../service/signedUrlService.js";
import { rateLimit } from "express-rate-limit";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;
const token = process.env.TOKEN;
const secret = process.env.MP_WEBHOOK_SECRET;
const ebookPrice = Number(process.env.EBOOK_PRICE);

const pixLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // limit of requests per minute
  message: {
    error: "Too many requests. Please try again later.",
  },
});
const statusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 2,
  message: "Muitas consultas de status.",
});
app.use(["/create-pix"], pixLimiter);
app.use(["/payments"], statusLimiter);

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
app.use("/webhook/ses", express.text({ type: "*/*" }));

// 3) JSON body parser (after preflight handler)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // guarda o corpo original como string
    },
  })
);

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

app.get("/users/me", async (req, res) => {
  try {
    const data = await userService.getUserInfo(token);
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({
      first_name: data?.first_name,
      brand_name: data?.company?.brand_name,
    });
  } catch (error) {
    console.error("❌ Erro ao consultar dados do usuário:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/unsubscribe", (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      console.log("Unsubscribe chamado sem parâmetro ?email=");
      return res.status(400).json({
        success: false,
        error: "Missing email parameter",
        message: "Use /unsubscribe?email=seuemail@dominio.com",
      });
    }

    console.log("Unsubscribe solicitado para:", email);

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Erro no /unsubscribe:", error);
    return res.status(500).send("Internal server error");
  }
});
app.get("/payments/:id/status", async (req, res) => {
  try {
    const paymentId = req.params.id;
    console.log(paymentId);

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: "Missing payment ID",
      });
    }

    // Mercado Pago request
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch payment info from Mercado Pago",
      });
    }

    const paymentInfo = await response.json();

    // Status start with a pending value
    let normalizedStatus = "pending";

    if (paymentInfo.status === "approved") {
      normalizedStatus = "approved";
    } else if (paymentInfo.status === "rejected") {
      normalizedStatus = "rejected";
    } else if (paymentInfo.status === "cancelled") {
      normalizedStatus = "cancelled";
    }

    return res.status(200).json({
      success: true,
      payment_id: paymentId,
      status: normalizedStatus,
      raw_status: paymentInfo.status,
      status_detail: paymentInfo.status_detail, //for debuging
    });
  } catch (error) {
    console.error("❌ ERRO EM GET /payments/:id/status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

app.post("/create-pix", async (req, res) => {
  try {
    const description = "E-book Frutos Feito à Mão";
    const response = await paymentService.createPix(
      req,
      ebookPrice,
      description,
      token
    );

    const pixInfo = response?.point_of_interaction?.transaction_data;

    if (pixInfo?.qr_code && pixInfo?.qr_code_base64) {
      return res.status(201).json({
        message: "✅ Pagamento PIX criado com sucesso!",
        payment_id: response.id,
        status: response.status,
        qr_code: pixInfo.qr_code,
        qr_code_base64: pixInfo.qr_code_base64,
        ticket_url: pixInfo.ticket_url,
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error("❌ Erro ao criar pagamento PIX:", error);
    res.status(500).json({ error: error.message });
  }
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

    const clientEmail = await paymentRepository.getCustomerEmail(paymentId);
    console.log(clientEmail);

    console.log(`event id: ${id}`);
    console.log("consultando url abaixo:");
    console.log(`https://api.mercadopago.com/v1/payments/${paymentId}`);
    const paymentInfo = await response.json();

    // avoid e-mail to payments test/sandbox+
    if (!paymentInfo.live_mode) {
      console.log("A requisição recebida foi de teste");
      return res.sendStatus(200);
    }

    const searchedId = await paymentRepository.wasPaymentProcessed(id); // query to redis

    if (searchedId) {
      console.log("A requisição já recebida e processada anteriormente");
      return res.sendStatus(200);
    }
    await paymentRepository.markPaymentAsProcessed(id); //record redis

    const isApproved =
      paymentInfo.status === "approved" &&
      paymentInfo.status_detail === "accredited" &&
      paymentInfo.transaction_amount === ebookPrice && // valor correto
      paymentInfo.collector_id === 347508936;

    const status = paymentInfo.status;
    const status_detail = paymentInfo.status_detail;
    console.log(status);
    console.log(status_detail);

    const linkEbook = await signedUrlService.generateSignedUrl(
      "Ebook iniciante pingente de natal.pdf"
    );

    if (isApproved) {
      console.log("pagamento confirmado");
      const emailData = {
        nome: "Cliente",
        link_de_download: linkEbook,
        validade_do_link: process.env.R2_LINK_TIME / 3600,
        email: clientEmail,
      };
      const template = emailTemplate.loadTemplate("ebook-confirmation.txt");
      const emailBody = emailTemplate.applyVariables(template, emailData);
      console.log(emailBody);
      const info = await email.send({
        from: "contato@frutosfeitoamao.com.br",
        to: clientEmail,
        subject: "Confirmação de envio – Seu e-book Frutos Feito à Mão",
        text: emailBody,
      });
      console.log(info);
      if (info.rejected.length > 0) {
        console.error("⚠️ Email rejeitado:", info.rejected);
      }
    }

    console.log(paymentInfo);

    res.sendStatus(200);
    return;
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});
app.post("/webhook/ses", async (req, res) => {
  //available to the SES from aws
  try {
    const messageType = req.headers["x-amz-sns-message-type"];
    const bodyString = req.body; // vem como string
    console.log("------- bodyString ------");
    console.log(bodyString);

    // 1. SubscriptionConfirmation
    if (messageType === "SubscriptionConfirmation") {
      const bodyJson = JSON.parse(bodyString);
      console.log("------- bodyJson ------");
      console.log(bodyJson);

      console.log("SNS wants confirmation:", bodyJson.SubscribeURL);

      const response = await fetch(bodyJson.SubscribeURL); // Confirma no SNS
      console.log(response);
      return res.sendStatus(200);
    }

    // 2. Notification (raw SES messages)
    if (messageType === "Notification") {
      const bodyJson = JSON.parse(bodyString);
      console.log("------- bodyJson ------");
      console.log(bodyJson);

      const message = JSON.parse(bodyJson.Message); // <- O SES REAL
      console.log("------- message (SES real) ------");
      console.log(message);

      switch (message.notificationType) {
        case "Bounce":
          console.log("📮 Bounce:", message.bounce.bouncedRecipients);
          break;

        case "Complaint":
          console.log("⚠️ Complaint:", message.complaint.complainedRecipients);
          break;

        case "Delivery":
          console.log("📬 Delivery:", message.delivery);
          break;

        default:
          console.log("Tipo de notificação SES desconhecido:", message);
      }

      return res.sendStatus(200);
    }

    // Caso não tenha o header do SNS
    res.sendStatus(400);
  } catch (error) {
    console.error("SNS webhook error:", error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

//https://mercadopago-integration-three.vercel.app/webhook/ses
//aws sns topic/subscription service
