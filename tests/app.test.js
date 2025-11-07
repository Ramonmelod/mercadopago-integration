describe("GET in /users/me", () => {
  test("shell return 200 and a user json", async () => {
    const response = await fetch("http://localhost:8080/users/me");

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      first_name: "LUANA",
      brand_name: "Frutos feito à mão ",
    });
  });
});
