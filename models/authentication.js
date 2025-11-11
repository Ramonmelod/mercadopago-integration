import crypto from "crypto";

function verifyMercadoPagoSignature(req, secret) {
  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];
  const tsPart = xSignature?.split(",").find((p) => p.startsWith("ts="));
  const v1Part = xSignature?.split(",").find((p) => p.startsWith("v1="));
  console.log("Headers recebidos x-signature:", xSignature);

  if (!xSignature || !tsPart || !v1Part) {
    console.warn("⚠️ Missing x-signature headers!");
    return false;
  }

  const ts = tsPart.replace("ts=", "").trim();
  const v1 = v1Part.replace("v1=", "").trim();
  console.log("Timestamp (ts):", ts);
  console.log("Assinatura (v1):", v1);

  // get the id from the body
  const eventId = req.body?.data?.id || req.body?.id;

  // here is made the message to be signed by the secret key
  const manifest = `id:${eventId};request-id:${xRequestId};ts:${ts};`;

  const myHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  console.log("Manifest montado:", manifest);
  console.log("Comparando com hash recebido (v1):", v1);
  console.log("Hash calculado (myHash):", myHash);
  console.log("==================================================");

  return myHash === v1;
}

const authentication = {
  verifyMercadoPagoSignature,
};

export default authentication;
