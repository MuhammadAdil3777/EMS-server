import express from "express";
import { sendSlackApproval, sendSlackRejection } from "../controllers/slackController.js";

const router = express.Router();

// Send Slack notification for request approval
router.post("/send-slack", sendSlackApproval);

// Send Slack notification for request rejection
router.post("/send-slackreject", sendSlackRejection);

export default router;
