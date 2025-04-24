import { Router } from "express";
import {
  getOtp,
  signIn,
  validate,
  upDatePassword,
  upDatePasswordOtp,
  updatePasswordVerify,
} from "../controller/auth.js";
const LoginRoutes = Router();

LoginRoutes.post("/signup", getOtp);
LoginRoutes.post("/signup/validate", validate);
LoginRoutes.post("/signin", signIn);
LoginRoutes.post("/signin/update-password/get-otp", upDatePasswordOtp);
LoginRoutes.post("/signin/update-password/verify", updatePasswordVerify);
LoginRoutes.post("/signin/update-password", upDatePassword);
export default LoginRoutes;
