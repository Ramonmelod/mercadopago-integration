describe("Testa o endpoint GET /", () => {
  test("Deve retornar status 200 e o JSON esperado", async () => {
    const response = await fetch("http://localhost:8080");

    expect(response.status).toBe(200);

    const contentType = response.headers.get("content-type");
    expect(contentType).toMatch(/application\/json/);

    const data = await response.json();

    expect(data).toHaveProperty("nome", "Ramon");
    expect(data).toHaveProperty("idade", 33);
  });
});
