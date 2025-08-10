import express from "express";
import { createAdmin } from "../controllers/userController.js";

const router = express.Router();

// Create admin user
router.post("/create-admin", createAdmin);

export default router;
