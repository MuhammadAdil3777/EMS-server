import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create email transporter
export const createEmailTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER,
            pass: process.env.VITE_EMAIL_PASS,
        },
    });
};

// Email configuration constants
export const EMAIL_CONFIG = {
    FROM: process.env.VITE_EMAIL_USER,
    REPLY_TO: "contact@techcreator.co",
    COMPANY_EMAIL: "contact@techcreator.co"
};
