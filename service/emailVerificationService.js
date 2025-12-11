import email from "../infra/email.js";
import crypto from "crypto";
import emailTemplate from "../utils/emailTemplate.js";
import paymentRepository from "./paymentRepository.js";
import { configDotenv } from "dotenv";
import emailValidator from "../utils/emailValidator.js";
configDotenv();
const verficationCodeExpirationTime = process.env.VERIFICATION_CODE_TIME;

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendEmailVerificationCode(clientEmail) {
  try {
    const isEmailValid = await emailValidator.isValidEmailForSending(
      clientEmail
    );
    if (!isEmailValid) {
      console.log(`E-mail inválido ${clientEmail}`);
      throw new Error("Email inválido");
    }
    const code = generateVerificationCode();
    paymentRepository.saveEmailVerificationCode(
      clientEmail,
      code,
      verficationCodeExpirationTime
    );

    const emailData = {
      name: "Cliente",
      code: code,
      time: verficationCodeExpirationTime,
      email: clientEmail,
    };

    const template = emailTemplate.loadTemplate("email-confirmation-code.txt");
    const emailBody = emailTemplate.applyVariables(template, emailData);

    const info = await email.send({
      from: "Frutos <contato@frutosfeitoamao.com.br>",
      to: [clientEmail, "contato@frutosfeitoamao.com.br"],
      subject: "Código de confirmação de Email - Frutos Feito à Mão",
      text: emailBody,
    });
  } catch (error) {
    throw error;
  }
}

const emailVerificationService = {
  sendEmailVerificationCode,
};

export default emailVerificationService;
