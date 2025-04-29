import express from "express";
import Router from "./routes/api.js";
import LoginRoutes from "./routes/login.js";
import Orders from "./routes/orders.js";
const crypto = require("crypto");
import prisma from "./exportPrisma.js";
import redis from "./redis.js";
import nodeMailer from "nodemailer";

const transporter = nodeMailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  secure: true,
});

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api", Router);
app.use("/login", LoginRoutes);
app.use("/orders", Orders);
app.use("/images", express.static("./images"));

app.post("/razorpay-webhook", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");
  if (signature !== expectedSignature)
    return res.status(403).send("Invalid signature");
  let event;
  try {
    event = req.body;
  } catch (err) {
    console.error("Error parsing the webhook JSON:", err);
    return res.status(400).send("Invalid webhook data");
  }

  switch (event.event) {
    case "payment.captured": {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const orderData = JSON.parse(await redis.get(orderId));

      if (!orderData)
        return res.status(404).send("Payment not found or expired");
      await prisma.order.update({
        where: {
          id: orderData.id,
        },
        data: {
          paid: true,
          succesfulPayment: {
            create: {
              razorpayOrderId: orderId,
              razorpayPaymentId: paymentId,
              amount: payment.amount,
              status: payment.status,
              currency: payment.currency,
              method: payment.method,
            },
          },
        },
      });
      const user = await prisma.user.findUnique({
        where: {
          id: orderData.userId,
        },
      });
      const storeOwner = await prisma.user.findUnique({
        where: {
          id: orderData.store.ownerId,
        },
      });
      transporter.sendMail(
        {
          from: process.env.USER,
          to: user.email,
          subject: "Order Paid",
          text: `Your order for ${orderData.product.name} has been paid successfully. Check the app for more details.`,
          html: `<p>Your order for <strong>${orderData.product.name}</strong> has been placed successfully. Check the app for more details</p>`,
        },
        (err) => {
          if (err) console.log("Email sent: " + err);
        }
      );
      transporter.sendMail(
        {
          from: process.env.USER,
          to: storeOwner.email,
          subject: "Order Paid",
          text: `Your order for ${orderData.product.name} by ${orderData.user.name} has been paid successfully. Check the app for more details.`,
          html: `<p>Your order for <strong>${orderData.product.name} by ${orderData.user.name}</strong> has been placed successfully. Check the app for more details</p>`,
        },
        (err) => {
          if (err) console.log("Email sent: " + err);
        }
      );
      redis.del(orderId);
      break;
    }
    case "payment.failed": {
      const failedPayment = event.payload.payment.entity;
      const failedOrderId = failedPayment.order_id;
      const failedPaymentId = failedPayment.id;

      const orderDataFailed = JSON.parse(await redis.get(failedOrderId));
      if (!orderDataFailed)
        return res.status(404).send("Payment not found or expired");
      const userFailed = await prisma.user.findUnique({
        where: {
          id: orderDataFailed.user.id,
        },
      });

      transporter.sendMail(
        {
          from: process.env.USER,
          to: userFailed.email,
          subject: "Order Payment Failed",
          text: `Your order for ${orderDataFailed.product.name} has failed. Check the app for more details.`,
          html: `<p>Your order for <strong>${orderDataFailed.product.name}</strong> has failed. Check the app for more details</p>`,
        },
        (err) => {
          if (err) console.log("Email sent: " + err);
        }
      );
      await prisma.order.update({
        where: {
          id: orderDataFailed.id,
        },
        data: {
          failedPayments: {
            create: {
              razorpayOrderId: failedOrderId,
              razorpayPaymentId: failedPaymentId,
              amount: failedPayment.amount,
              status: failedPayment.status,
              currency: failedPayment.currency,
              method: failedPayment.method,
            },
          },
        },
      });
      redis.del(failedOrderId);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.event}`);
      break;
  }
  res.status(200).send("Webhook received and processed successfully");
});

app.listen(PORT, () => console.log("Server running on port: " + PORT));
