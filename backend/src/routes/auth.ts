import { Router } from "express";
import * as userController from "../controllers/userController";

const router = Router();

router.post("/send-otp", userController.sendOtp);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/send-login-otp", userController.sendLoginOtp);
router.post("/verify-login-otp", userController.verifyLoginOtp);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

export default router;
