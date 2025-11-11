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

app.post('/webhook/mercadopago', async (req, res) => {
  try {
    const { id, type, data } = req.body;
    console.log('Webhook recebido:', req.body);

    if (type === 'payment') {
      const paymentId = data.id;
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}*/`, { //'http://localhost:8080/mock/payments/:id'
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const paymentInfo = await response.json();
      console.log(`event id: ${id}`)
      console.log(paymentInfo);
      console.log("here will be checked the paymentInfo and if everything is ok will be send the email ")
      
    }

    res.sendStatus(200); 
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// The endpoint /mock/payments/:id is used only for mocking
app.get('/mock/payments/:id', (req, res) => {
  const paymentId = req.params.id;

  // resposta mock (campos principais semelhantes ao /v1/payments do Mercado Pago)
  const mockResponse = {
    id: Number(paymentId) || 123456789,
    status: 'pending',
    status_detail: 'pending_waiting_transfer',
    transaction_amount: 0.01,
    currency_id: 'BRL',
    date_created: new Date().toISOString(),
    date_last_updated: new Date().toISOString(),
    description: 'Mocked payment for testing',
    payer: {
      id: '1657160132',
      email: 'cliente@example.com',
      first_name: 'Cliente',
      last_name: 'Teste',
      identification: { type: 'CPF', number: '00000000000' }
    },
    payment_method_id: 'pix',
    payment_type_id: 'bank_transfer',
    point_of_interaction: {
      transaction_data: {
        qr_code: '00020126580014br.gov.bcb.pix0136mocked-pix-code-12345678952040000530398654040.015802BR5909TESTE6012Cidade62250521mockpix1323643642636304D675',
        qr_code_base64:
          'iVBORw0KGgoAAAANSUhEUgAA...MOCKED_BASE64_IMAGE_DATA...',
        ticket_url: `https://www.mercadopago.com.br/payments/${paymentId}/ticket?mock=true`
      }
    },
    // extras utilitários que podem aparecer na resposta real
    transaction_details: {
      total_paid_amount: 0.01,
      net_received_amount: 0.01
    }
  };

  // simular small delay opcional (descomente se quiser)
  // setTimeout(() => res.json(mockResponse), 300);

  res.json(mockResponse);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
