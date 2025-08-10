import { createEmailTransporter, EMAIL_CONFIG } from "../config/email.js";

// Handle contact form submission
export const sendMessage = async (req, res) => {
    try {
        const { fullName, email, companyName, message } = req.body;

        // Validate required fields
        if (!fullName || !email || !message) {
            return res.status(400).json({
                success: false,
                error: "Full Name, Email Address, and Message are required"
            });
        }

        // Create email transporter
        const transporter = createEmailTransporter();

        // 1. Send confirmation email to the user
        const userEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4a4a4a;">Thank You for Contacting Us</h2>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p>
                <p>Here's a summary of your message:</p>
                <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
                    <p><strong>Name:</strong> ${fullName}</p>
                    ${companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ''}
                    <p><strong>Message:</strong> ${message}</p>
                </div>
                <p>We appreciate your interest and will respond to your inquiry shortly.</p>
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #777;">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} Tech Creator. All rights reserved.</p>
            </div>
        </div>
        `;

        // 2. Send notification email to the company
        const companyEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4a4a4a;">New Contact Form Submission</h2>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                <p>You have received a new message from your website contact form.</p>
                <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
                    <p><strong>Name:</strong> ${fullName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    ${companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ''}
                    <p><strong>Message:</strong> ${message}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p>Please respond to this inquiry at your earliest convenience.</p>
            </div>
        </div>
        `;

        // Send both emails
        await Promise.all([
            // Email to user
            transporter.sendMail({
                from: EMAIL_CONFIG.FROM,
                to: email,
                subject: "Thank you for contacting Tech Creator",
                html: userEmailHtml,
            }),
            // Email to company
            transporter.sendMail({
                from: EMAIL_CONFIG.FROM,
                to: EMAIL_CONFIG.COMPANY_EMAIL,
                subject: `New Contact Form Submission from ${fullName}`,
                replyTo: email,
                html: companyEmailHtml,
            })
        ]);

        res.status(200).json({
            success: true,
            message: "Your message has been sent successfully. We'll get back to you soon!"
        });
    } catch (error) {
        console.error("Error sending contact form emails:", error);
        res.status(500).json({
            success: false,
            error: "Failed to send your message. Please try again later."
        });
    }
};
