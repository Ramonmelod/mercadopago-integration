const crypto = require("crypto")
const dotenv = require("dotenv")
//const authentication = require("../models/authentication.js")
dotenv.config();


describe("POST /webhook/mercadopago", () => {
  test("should return 403 when signature is invalid or missing - invalid signature", async () => {
    const response = await fetch("http://localhost:8080/webhook/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dummy: true,
      }),
    });

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body).toEqual({
      error: "Not allowed"
    });
  });
  
   test("should return 200 and { ok: true }", async () => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    // Campos simulados da assinatura
    const id = "123456";
    const ts = Math.floor(Date.now() / 1000).toString();
    const requestId = "test-req-id";

    // Criar hash = HMAC_SHA256(secret, id + ts)
    const hash = crypto
      .createHmac("sha256", secret)
      .update(id + ts)
      .digest("hex");

    // Montar o header final igual ao Mercado Pago
    const xSignature = `id:${id};request-id:${requestId};ts:${ts};hash:${hash}`;

    const response = await fetch("http://localhost:8080/webhook/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": xSignature,
      },
      body: JSON.stringify({
        type: "payment",
        action: "payment.created",
        data: { id: "123456789" }
      })
    });

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({ ok: true });
  });
});
// make a test with  the correct secret key
//"should return 403 when signature is invalid or missing - invalid signature"