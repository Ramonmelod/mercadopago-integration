import redis from "../infra/redisClient.js";

async function markPaymentAsProcessed(id) {
  return redis.set(`mp:event:${id}`, "1", { EX: 60 * 60 * 24 });
}

async function wasPaymentProcessed(id) {
  return redis.exists(`mp:event:${id}`);
}

async function saveCustomerEmail(id, email, ttlSeconds = 60 * 60 * 24) {
  await redis.set(`mp:email:${id}`, email, { EX: ttlSeconds });
  console.log(`[Redis] Salvo email para ID ${id}: ${email}`);
  return true;
}

async function getCustomerEmail(id) {
  const email = await redis.get(`mp:email:${id}`);
  console.log(`[Redis] Email recuperado para ID ${id}: ${email}`);
  return email;
}

const paymentRepository = {
  markPaymentAsProcessed,
  wasPaymentProcessed,
  saveCustomerEmail,
  getCustomerEmail,
};

export default paymentRepository;
