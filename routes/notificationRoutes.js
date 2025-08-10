import express from "express";
import { sendNotifications, sendSingleNotifications } from "../controllers/notificationController.js";

const router = express.Router();

// Send notification to all users
router.post("/send-notifications", sendNotifications);

// Send notification to a single user
router.post("/send-singlenotifications", sendSingleNotifications);

export default router;
