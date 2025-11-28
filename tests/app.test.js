describe("requests to mercado pago API", () => {
  test("GET in /users/me shell return 200 and a user json", async () => {
    const response = await fetch("http://localhost:8080/users/me");

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      first_name: "LUANA",
      brand_name: "Frutos feito à mão ",
    });
  });
  test("POST /create-pix shell return 201 and data from PIX", async () => {
    const response = await fetch("http://localhost:8080/create-pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "ramonmelod@gmail.com",
        name: "anonimo",
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
