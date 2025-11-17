import email from "../infra/email.js";

describe("infra/email.js", () => {
  test("send()", async () => {
    await email.send({
      from: "contato@frutosfeitoamao.com.br",
      to: "contato@ramonmelo.com.br",
      subject: "teste assunto vindo da api frutos",
      text: "Teste de corpo vinda da api da frutos",
    });
  });
});
