import express from "express";
import {
  getAllStoresForUser,
  getProductsForStore,
  createStoresForUser,
  createProductsForStore,
  searchProducts,
  searchStores,
  updateUser,
  updateProduct,
  updateStore,
  deleteProduct,
  deleteStore,
  deleteUser,
} from "../controller/data.js";
import multer from "multer";
const upload = multer({ dest: "../images" });

const Router = express.Router();

Router.get("/user/stores/", getAllStoresForUser);
Router.get("/store/:id/products/", getProductsForStore);
Router.post("/stores", searchStores);
Router.post("/products", searchProducts);

Router.post("/user/store", upload.array("storePhotos"), createStoresForUser);
Router.post(
  "/store/product",
  upload.array("productPhotos"),
  createProductsForStore
);

Router.put("/user/update", updateUser);
Router.put("/product/:id/update", updateProduct);
Router.put("/store/:id/update", updateStore);

Router.delete("/user/delete", deleteUser);
Router.delete("/product/:id/delete", deleteProduct);
Router.delete("/store/:id/delete", deleteStore);

export default Router;
