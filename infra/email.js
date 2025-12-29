import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
  secure: process.env.NODE_ENV === "production" ? true : false,
});

async function send(mailOptions) {
  try {
    const response = await transporter.sendMail(mailOptions);
    if (transporter.close) {
      transporter.close();
    }
    return response;
  } catch (error) {
    throw error;
  }
}

const email = {
  send,
};

export default email;
//https://us-east-2.console.aws.amazon.com/ses/home?region=us-east-2#/get-set-up
//identities
