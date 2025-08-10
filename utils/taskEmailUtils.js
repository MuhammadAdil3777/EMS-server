import { createEmailTransporter, EMAIL_CONFIG } from "../config/email.js";

export const sendTaskAssignmentEmail = async (username, projectName, kpiCount, projectId, priority, recipientEmail) => {
    const transporter = createEmailTransporter();
    
    const message = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Assignment</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
            .task-card { background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .task-details { margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: 600; color: #555; }
            .detail-value { color: #333; }
            .priority-high { background: #ff4757; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .priority-medium { background: #ffa502; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .priority-low { background: #2ed573; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 New Task Assignment</h1>
            </div>
            <div class="content">
                <div class="greeting">
                    Hey <strong>${username}</strong>! 👋
                </div>
                <p>You've been assigned a new task that needs your attention. Here are the details:</p>
                
                <div class="task-card">
                    <div class="task-details">
                        <div class="detail-row">
                            <span class="detail-label">📋 Project Name:</span>
                            <span class="detail-value"><strong>${projectName}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📊 Number of KPIs:</span>
                            <span class="detail-value"><strong>${kpiCount}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⚡ Priority Level:</span>
                            <span class="detail-value">
                                <span class="priority-${priority.toLowerCase()}">${priority.toUpperCase()}</span>
                            </span>
                        </div>
                    </div>
                </div>
                
                <p>Please review the task details and start working on it at your earliest convenience. If you have any questions or need clarification, don't hesitate to reach out to your project manager.</p>
                
                <div style="text-align: center;">
                    <a href="https://ems-one-mauve.vercel.app/board/${projectId}" class="cta-button">View Task Details</a>
                </div>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    💡 <strong>Quick Tip:</strong> Make sure to check the priority level and plan your work accordingly. High priority tasks should be addressed first!
                </p>
            </div>
            <div class="footer">
                <p><strong>TechCreator EMS Team</strong></p>
                <p>This is an automated message. Please do not reply to this email.</p>
                <p style="font-size: 12px; color: #999;">© 2024 TechCreator. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: EMAIL_CONFIG.FROM,
        to: recipientEmail,
        subject: `🎯 New Task Assignment - ${projectName}`,
        html: message,
        replyTo: EMAIL_CONFIG.REPLY_TO,
    };

    return await transporter.sendMail(mailOptions);
};
