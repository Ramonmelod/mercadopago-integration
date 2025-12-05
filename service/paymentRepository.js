import redis from "../infra/redisClient.js";

async function markPaymentAsProcessed(id) {
  try {
    return redis.set(`mp:event:${id}`, "1", { EX: 60 * 60 * 24 });
  } catch (error) {
    console.log(`Erro em markPaymentAsProcessed: ${error}`);
    throw error;
  }
}

async function wasPaymentProcessed(id) {
  try {
    return redis.exists(`mp:event:${id}`);
  } catch (error) {
    console.log(`Erro em markPaymentAsProcessed: ${error}`);
    throw error;
  }
}

async function saveCustomerEmail(id, email, ttlSeconds = 60 * 60 * 24) {
  try {
    await redis.set(`mp:email:${id}`, email, { EX: ttlSeconds });
    console.log(`[Redis] Salvo email para ID ${id}: ${email}`);
    return true;
  } catch (error) {
    console.log(`Erro em saveCustomerEmail: ${error}`);
    throw error;
  }
}

async function getCustomerEmail(id) {
  try {
    const email = await redis.get(`mp:email:${id}`);
    console.log(`[Redis] Email recuperado para ID ${id}: ${email}`);
    return email;
  } catch (error) {
    console.log(`Erro em getCustomerEmail: ${error}`);
    throw error;
  }
}

async function saveEmailVerificationCode(email, code, CODE_TTL_SECONDS) {
  try {
    const key = `verify:email:${email}`;
    await redis.set(key, code, { EX: CODE_TTL_SECONDS });

    console.log(`[Redis] Código salvo para ${email}: ${code}`);
    return true;
  } catch (error) {
    console.log(`Erro em saveEmailVerificationCode: ${error}`);
    throw error;
  }
}

async function getEmailVerificationCode(email) {
  try {
    const key = `verify:email:${email}`;
    const code = await redis.get(key);

    if (!code) {
      console.log(
        `[Redis] Nenhum código encontrado ou código expirado para ${email}`
      );
      return null; // retorno explícito
    }

    console.log(`[Redis] Código consultado para ${email}: ${code}`);
    return code;
  } catch (error) {
    console.log(`Erro em getEmailVerificationCode: ${error}`);
    throw error;
  }
}

const paymentRepository = {
  markPaymentAsProcessed,
  wasPaymentProcessed,
  saveCustomerEmail,
  getCustomerEmail,
  saveEmailVerificationCode,
  getEmailVerificationCode,
};

export default paymentRepository;
