import { Router } from "express";
import {
  getOrdersForStore,
  getAllOrdersForProduct,
  getOrdersForUser,
  getOrderById,
  placeOrder,
  updateOrderStatus,
  deleteOrder,
  createRazorpayOrder,
} from "../controller/order.js";
const Orders = Router();

Orders.get("/user", getOrdersForUser);
Orders.get("/store", getOrdersForStore);
Orders.get("/product", getAllOrdersForProduct);
Orders.get("/:id", getOrderById);
Orders.post("/", placeOrder);
Orders.put("/:id", updateOrderStatus);
Orders.delete("/:id", deleteOrder);
Orders.post("/pay", createRazorpayOrder);
export default Orders;
