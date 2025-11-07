# 🛒 Frutos Mercado Pago Integration

Integration project between the **Frutos Feito à Mão** website and the **Mercado Pago API** using **Node.js**.  
The goal is to generate **QR codes for payments** through the `/v1/payments` endpoint and handle **webhook notifications** for payment status updates.

---

## 🚀 Features

- Create payments via the Mercado Pago REST API (`/v1/payments`)
- Generate and return QR Codes for checkout
- Handle asynchronous payment notifications via webhooks
- Simple configuration using environment variables
- Modular structure for easy integration with the front-end

---

## 🧩 Technologies

- **Node.js**
- **Express.js**
- **dotenv** (for environment variables)
- **Mercado Pago API**

---

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ramonmelod/frutos-mercadopago-integration.git
   cd frutos-mercadopago-integration

