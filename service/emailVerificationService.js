import email from "../infra/email.js";
import crypto from "crypto";
import emailTemplate from "../utils/emailTemplate.js";
import paymentRepository from "./paymentRepository.js";
import { configDotenv } from "dotenv";
configDotenv();
const verficationCodeExpirationTime = process.env.VERIFICATION_CODE_TIME;

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendEmailVerificationCode(clientEmail) {
  const code = generateVerificationCode();
  paymentRepository.saveEmailVerificationCode(
    clientEmail,
    code,
    verficationCodeExpirationTime
  );

  const emailData = {
    name: "Cliente",
    code: code,
    minutes: verficationCodeExpirationTime,
    email: clientEmail,
  };

  const template = emailTemplate.loadTemplate("email-confirmation-code.txt");
  const emailBody = emailTemplate.applyVariables(template, emailData);

  const info = await email.send({
    from: "Frutos <contato@frutosfeitoamao.com.br>",
    to: [
      clientEmail,
      "contato@frutosfeitoamao.com.br",
      "contato@ramonmelo.com.br",
    ],
    subject: "Código de confirmação de Email - Frutos Feito à Mão",
    text: emailBody,
  });
}

const emailVerificationService = {
  sendEmailVerificationCode,
};

export default emailVerificationService;
