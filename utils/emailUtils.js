import { createEmailTransporter, EMAIL_CONFIG } from "../config/email.js";

// Send leave request email
export const sendLeaveRequestEmail = async (emailData) => {
    const { senderEmail, recipientEmail, subject, employeeName, leaveType, startDate, endDate, reason } = emailData;
    
    const transporter = createEmailTransporter();
    
    const message = `
    <p>Dear <strong>Admin</strong>,</p>

    <p>A new leave request has been submitted.</p>

    <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Employee Name:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${employeeName}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Leave Type:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${leaveType}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Start Date:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${startDate}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>End Date:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${endDate}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Reason:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${reason}</td>
        </tr>
    </table>

    <p>Please review and take necessary action.</p>

    <p>Best Regards, <br> <strong>TechCreator EMS System</strong></p>
    `;

    const mailOptions = {
        from: EMAIL_CONFIG.FROM,
        to: recipientEmail,
        subject: subject,
        html: message,
        replyTo: senderEmail,
    };

    return await transporter.sendMail(mailOptions);
};

// Send bulk alert email
export const sendBulkAlertEmail = async (recipients, subject, message) => {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
        from: EMAIL_CONFIG.FROM,
        to: "",
        bcc: recipients,
        subject,
        html: message,
    };

    return await transporter.sendMail(mailOptions);
};

// Send approval response email
export const sendApprovalEmail = async (employeeName, userEmail, leaveType, startDate) => {
    const transporter = createEmailTransporter();
    
    const message = `
    <p>Dear <strong>${employeeName}</strong>,</p>

    <p>Your leave request has been <strong style="color: green;">Approved</strong>.</p>

    <p><strong>Leave Details:</strong></p>
    <ul>
        <li><strong>Leave Type:</strong> ${leaveType}</li>
        <li><strong>Start Date:</strong> ${startDate}</li>
        <li><strong>End Date:</strong> ${startDate}</li>
    </ul>

    <p>Enjoy your time off, and please reach out if you have any questions.</p>

    <p>Best Regards, <br> <strong>TechCreator HR Team</strong></p>
    `;

    const mailOptions = {
        from: EMAIL_CONFIG.FROM,
        to: userEmail,
        subject: "Leave Request Approved",
        html: message,
        replyTo: EMAIL_CONFIG.REPLY_TO,
    };

    return await transporter.sendMail(mailOptions);
};

// Send rejection response email
export const sendRejectionEmail = async (employeeName, userEmail, leaveType, startDate) => {
    const transporter = createEmailTransporter();
    
    const message = `
    <p>Dear <strong>${employeeName}</strong>,</p>

    <p>We regret to inform you that your leave request has been <strong style="color: red;">rejected</strong>.</p>

    <p><strong>Leave Details:</strong></p>
    <ul>
        <li><strong>Leave Type:</strong> ${leaveType}</li>
        <li><strong>Start Date:</strong> ${startDate}</li>
        <li><strong>End Date:</strong> ${startDate}</li>
    </ul>

    <p>If you have any concerns, please contact HR.</p>

    <p>Best Regards, <br> <strong>TechCreator HR Team</strong></p>
    `;

    const mailOptions = {
        from: EMAIL_CONFIG.FROM,
        to: userEmail,
        subject: "Leave Request Rejected",
        html: message,
        replyTo: EMAIL_CONFIG.REPLY_TO,
    };

    return await transporter.sendMail(mailOptions);
};
