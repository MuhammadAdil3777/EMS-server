import { 
    sendLeaveRequestEmail, 
    sendBulkAlertEmail, 
    sendApprovalEmail, 
    sendRejectionEmail 
} from "../utils/emailUtils.js";
import { sendTaskAssignmentEmail } from "../utils/taskEmailUtils.js";
import { createEmailTransporter, EMAIL_CONFIG } from "../config/email.js";

// Send leave request email
export const sendEmail = async (req, res) => {
    try {
        const emailData = req.body;
        await sendLeaveRequestEmail(emailData);
        res.status(200).json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};

// Send bulk alert email
export const sendAlertEmail = async (req, res) => {
    try {
        const { recipients, subject, message } = req.body;

        if (!recipients || recipients.length === 0) {
            return res.status(400).json({ error: "Recipient list is empty" });
        }

        await sendBulkAlertEmail(recipients, subject, message);
        res.json({ status: "Emails sent successfully" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send emails", detail: error.message });
    }
};

// Send approval response email
export const sendResponse = async (req, res) => {
    try {
        const { employeeName, userEmail, leaveType, startDate } = req.body;
        await sendApprovalEmail(employeeName, userEmail, leaveType, startDate);
        res.status(200).json({ message: "Response email sent successfully!" });
    } catch (error) {
        console.error("Error sending response email:", error);
        res.status(500).json({ error: "Failed to send response email" });
    }
};

// Send rejection response email
export const sendRejectResponse = async (req, res) => {
    try {
        const { employeeName, userEmail, leaveType, startDate } = req.body;
        await sendRejectionEmail(employeeName, userEmail, leaveType, startDate);
        res.status(200).json({ message: "Rejection email sent successfully!" });
    } catch (error) {
        console.error("Error sending rejection email:", error);
        res.status(500).json({ error: "Failed to send rejection email" });
    }
};

// Send task assignment email
export const sendTaskEmail = async (req, res) => {
    try {
        const { username, projectName, kpiCount, projectId, priority, recipientEmail } = req.body;
        await sendTaskAssignmentEmail(username, projectName, kpiCount, projectId, priority, recipientEmail);
        res.status(200).json({ message: "Task assignment email sent successfully!" });
    } catch (error) {
        console.error("Error sending task assignment email:", error);
        res.status(500).json({ error: "Failed to send task assignment email" });
    }
};

// Send client invitation email
export const inviteClient = async (req, res) => {
    try {
        const { email, personalEmail, password } = req.body;

        // Validate input
        if (!email || !personalEmail || !password) {
            return res.status(400).json({ error: "Email, personalEmail, and password are required" });
        }

        // Send invitation email
        if (process.env.VITE_EMAIL_USER && process.env.VITE_EMAIL_PASS) {
            const transporter = createEmailTransporter();

            const mailOptions = {
                from: EMAIL_CONFIG.FROM,
                to: personalEmail,
                subject: "Invitation to Estroword",
                html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
            <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #333; font-size: 28px; margin: 0; font-weight: 600;">Welcome to Estrowork!</h2>
                </div>
                
                <!-- Main Content -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                    <p style="color: #555; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                        You have been invited as a client. Here are your login credentials:
                    </p>
                    
                    <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0; color: #666;">
                            <strong style="color: #333;">Email:</strong> 
                            <span style="color: #4CAF50; font-weight: 500;">${email}</span>
                        </p>
                        <p style="margin: 0; color: #666;">
                            <strong style="color: #333;">Password:</strong> 
                            <span style="font-family: monospace; background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${password}</span>
                        </p>
                    </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://ems-one-mauve.vercel.app/home" 
                       style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3); transition: all 0.3s;">
                        Go to Website
                    </a>
                </div>
                
                <!-- Instructions -->
                <div style="margin-top: 30px;">
                    <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">Instructions:</h3>
                    <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Go to the website using the button above</li>
                        <li style="margin-bottom: 8px;">Click on sign in</li>
                        <li style="margin-bottom: 8px;">Enter the credentials provided above</li>
                    </ol>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                    <p style="color: #777; font-size: 14px; margin: 0;">
                        Best regards,<br>
                        <strong style="color: #4CAF50;">Estrowork Team</strong>
                    </p>
                </div>
            </div>
            
            <!-- Footer Note -->
            <div style="text-align: center; margin-top: 20px;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </div>
    `
            };

            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: "Invitation sent successfully" });
        } else {
            res.status(500).json({ error: "Email configuration not found" });
        }
    } catch (error) {
        console.error("Error sending invitation:", error);
        res.status(500).json({ error: "Failed to send invitation" });
    }
};
