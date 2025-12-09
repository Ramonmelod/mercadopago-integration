//import paymentRepository from "../service/paymentRepository.js";

describe("requests to mercado pago API", () => {
  test("GET in /users/me shell return 200 and a user json", async () => {
    const response = await fetch("http://localhost:8080/users/me");

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      first_name: "49 647 815 LUANA",
      brand_name: "49.647.815 LUANA RODRIGUES DA SILVA",
    });
  });

  test("POST /verify-email should block invalid email with a 400 status code", async () => {
    const response = await fetch("http://localhost:8080/verify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "email-invalido-sem-arroba",
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Email inválido");
  });
  test("POST /create-pix shell block invalid email with a 403 status code", async () => {
    const response = await fetch("http://localhost:8080/create-pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "email-invalido-sem-arroba",
        name: "Ramon",
      }),
    });

    expect(response.status).toBe(403);

    const body = await response.json();

    // O corpo deve conter um erro de mensagem
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Formato de email inválido.");
  });
  test("POST /create-pix should block request with missing verification code (400)", async () => {
    const response = await fetch("http://localhost:8080/create-pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "ramonmelo.com@gmail.com",
        // code não enviado
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Código de verificação é obrigatório.");
  });
  test("POST /create-pix shell return 201 and data from PIX", async () => {
    // const clientEmail = "ramonmelo.com@gmail.com";
    // const storedVerificationCode =
    //   await paymentRepository.getEmailVerificationCode(clientEmail);
    const response = await fetch("http://localhost:8080/create-pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "ramonmelo.com@gmail.com",
        code: 123456, //storedVerificationCode,
        name: "Ramon",
      }),
    });

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("payment_id");
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("qr_code");
    expect(body).toHaveProperty("qr_code_base64");
    expect(body).toHaveProperty("ticket_url");

    expect(body.message).toBe("✅ Pagamento PIX criado com sucesso!");
  });
});
