import prisma from "../exportPrisma";
import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";
import Razorpay from "razorpay";
import redis from "../redis";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const transporter = nodeMailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  secure: true,
});

const serverError = (res, err) => {
  res.status(500).end("Server error");
  console.log(err);
};

const validate = (token) => {
  try {
    token = token.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.key);
    return decodedToken;
  } catch (e) {
    return null;
  }
};

export const getOrdersForUser = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const orders = await prisma.order.findMany({
      where: {
        userId: decodedToken.userId,
      },
      include: {
        user: true,
        product: true,
        store: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    return serverError(res, error);
  }
};

export const getOrdersForStore = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const orders = await prisma.order.findMany({
      where: {
        store: {
          userId: decodedToken.userId,
        },
      },
      include: {
        user: true,
        product: true,
        store: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    return serverError(res, error);
  }
};
export const getAllOrdersForProduct = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const orders = await prisma.order.findMany({
      where: {
        product: {
          store: {
            userId: decodedToken.userId,
          },
        },
      },
      include: {
        user: true,
        product: true,
        store: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    return serverError(res, error);
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: true,
        product: true,
        store: true,
      },
    });
    if (!order) {
      return res.status(404).end("Order not found");
    }
    if (order.userId !== decodedToken.userId) {
      return res.status(403).end("Access denied");
    }
    res.status(200).json(order);
  } catch (error) {
    return serverError(res, error);
  }
};

export const placeOrder = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const { productId, quantity } = req.body;
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });
    if (!product) {
      return res.status(404).end("Product not found");
    }
    if (product.stock < quantity) {
      return res.status(400).end("Not enough stock available");
    }
    const store = await prisma.store.findUnique({
      where: {
        id: product.storeId,
      },
    });
    const order = await prisma.order.create({
      data: {
        userId: decodedToken.userId,
        productId,
        storeId: store.id,
        quantity,
      },
    });
    const user = await prisma.user.findUnique({
      where: {
        id: store.userId,
      },
    });
    let error;
    transporter.sendMail(
      {
        from: process.env.USER,
        to: user.email,
        subject: "New Order",
        text: `A new order has been placed for ${product.name} for the store ${store.name}. Check the app for more details.`,
        html: `<p>A new order has been placed for <strong>${product.name}</strong> for the store <strong>${store.name}</strong>. Check the app for more details.</p>`,
      },
      (err) => {
        if (err) error = err;
        console.log("Email sent: " + err);
      }
    );
    if (error) {
      return serverError(res, error);
    }
    res.status(201).json(order);
  } catch (error) {
    return serverError(res, error);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { token } = req.headers;
    const { status } = req.body;
    if (typeof status !== "boolean")
      return res.status(400).end("Invalid status value");
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const order = await prisma.order.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        store: true,
        product: true,
        user: true,
      },
    });
    const owner = await prisma.user.findUnique({
      where: {
        id: order.store.userId,
      },
      select: {
        email: true,
        mobile: true,
      },
    });
    if (!order) {
      return res.status(404).end("Order not found");
    }
    if (order.store.userId !== decodedToken.userId) {
      return res.status(403).end("Access denied");
    }
    if (status) {
      const updatedOrder = await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          delivered: status,
        },
      });
      transporter.sendMail(
        {
          from: process.env.USER,
          to: order.user.email,
          subject: "Order Delivered",
          text: `
        Your order for ${order.product.name} has been delivered. Check the app for more details. 
        In case of any issues, please contact the store owner on mobile number ${owner.mobile} or email ${owner.email}.
        `,
          html: `
        <p>Your order for <strong>${order.product.name}</strong> has been delivered. Check the app for more details.</p>
        <p>In case of any issues, please contact the store owner on mobile number 
        <strong>${owner.mobile}</strong> or email <strong>${owner.email}</strong>.</p>
        `,
        },
        (err) => {
          if (err) console.log("Email sent: " + err);
        }
      );
      res.status(200).json(updatedOrder);
    } else {
      const updatedOrder = await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          delivered: false,
        },
      });
      res.status(200).json(updatedOrder);
    }
  } catch (error) {
    return serverError(res, error);
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(403).end("Access denied");
    }
    const decodedToken = validate(token);
    if (!decodedToken) {
      return res.status(403).end("Access denied");
    }
    const order = await prisma.order.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        store: true,
        product: true,
      },
    });
    if (!order) {
      return res.status(404).end("Order not found");
    }
    if (order.store.userId !== decodedToken.userId) {
      return res.status(403).end("Access denied");
    }
    await prisma.order.delete({
      where: {
        id: order.id,
      },
    });
    const storeOwner = await prisma.user.findUnique({
      where: {
        id: order.store.userId,
      },
    });
    let error = null;
    transporter.sendMail(
      {
        from: process.env.USER,
        to: storeOwner.email,
        subject: "Order Cancelled",
        text: `Your order for ${order.product.name} has been cancelled. Check the app for more details.`,
        html: `<p>Your order for <strong>${order.product.name}</strong> has been cancelled. Check the app for more details</p>`,
      },
      (err) => {
        if (err) error = err;
        console.log("Email sent: " + err);
      }
    );
    if (error) {
      return serverError(res, error);
    }
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    return serverError(res, error);
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderDetails } = req.body;
    const orderData = await prisma.order.findUnique({
      where: {
        id: orderDetails.id,
      },
      include: {
        product: true,
        store: true,
        user: true,
      },
    });

    const options = {
      amount: orderData.product.price * orderData.quantity * 100,
      currency: "INR",
      receipt: "receipt#1",
      paymentCapture: 1,
    };

    const order = await razorpay.orders.create(options);
    redis.set(order.id, JSON.stringify(orderData), "EX", 60 * 60 * 24);
    res.status(200).json(order);
  } catch (error) {
    return serverError(res, error);
  }
};
