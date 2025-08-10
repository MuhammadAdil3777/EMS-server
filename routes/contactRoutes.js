import express from "express";
import { sendMessage } from "../controllers/contactController.js";

const router = express.Router();

// Handle contact form submission
router.post("/sendmessage", sendMessage);

export default router;
