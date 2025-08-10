import express from "express";
import { 
    sendEmail, 
    sendAlertEmail, 
    sendResponse, 
    sendRejectResponse, 
    sendTaskEmail,
    inviteClient 
} from "../controllers/emailController.js";

const router = express.Router();

// Send leave request email
router.post("/send-email", sendEmail);

// Send bulk alert email
router.post("/send-alertemail", sendAlertEmail);

// Send approval response email
router.post("/send-response", sendResponse);

// Send rejection response email
router.post("/send-rejectresponse", sendRejectResponse);

// Send task assignment email
router.post("/sendtaskemail", sendTaskEmail);

// Send client invitation email
router.post("/inviteClient", inviteClient);

export default router;
