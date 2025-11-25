import redis from "../infra/redisClient.js";

async function markPaymentAsProcessed(id) {
  return redis.set(`mp:event:${id}`, "1", { EX: 60 * 60 * 24 });
}

async function wasPaymentProcessed(id) {
  return redis.exists(`mp:event:${id}`);
}

const paymentRepository = {
  markPaymentAsProcessed,
  wasPaymentProcessed,
};

export default paymentRepository;
