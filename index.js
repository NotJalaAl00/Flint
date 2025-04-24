import express from "express";
import Router from "./routes/api.js";
import LoginRoutes from "./routes/login.js";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api", Router);
app.use("/login", LoginRoutes);
app.use("/images", express.static("./images"));

app.listen(PORT, () => console.log("Server running on port: " + PORT));
