import paymentRepository from "./paymentRepository.js";
import { v4 as uuidv4 } from "uuid";
import { MercadoPagoConfig, Payment } from "mercadopago";

async function createPix(
  req,
  price,
  description,
  token,
  productSlug,
  fileName,
) {
  try {
    const client = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 5000, idempotencyKey: uuidv4() }, //uuid used to identify every transaction
    });

    const payment = new Payment(client);

    const name = req.body.name ? req.body.name : "querida(o) cliente";
    const body = {
      transaction_amount: price,
      description: description,
      payment_method_id: "pix",
      payer: {
        email: req.body.email,
        first_name: name,
      },
      external_reference: `${productSlug}-${req.body.email}-${Date.now()}`,
      metadata: {
        product_slug: productSlug,
        product_type: "digital",
        source: "website",
        file_name: fileName,
        clientEmail: req.body.email,
      },
    };

    const response = await payment.create({ body });

    await paymentRepository.saveCustomerEmail(response.id, req.body.email);

    return response;
  } catch (error) {
    console.error("❌ Erro ao criar pagamento PIX:", error);
    throw error;
  }
}

const paymentService = {
  createPix,
};

export default paymentService;
