import email from "../infra/email.js";
import emailTemplate from "../utils/emailTemplate.js";

describe("infra/email.js", () => {
  test("send()", async () => {
    const emailBody = emailTemplate.loadTemplate("ebook-confirmation.txt");
    const response = await email.send({
      from: "contato@frutosfeitoamao.com.br",
      to: "contato@ramonmelo.com.br",
      subject: "Confirmação de envio – Seu e-book Frutos Feito à Mão",
      text: emailBody,
    });
    console.log(response);
  });
});
