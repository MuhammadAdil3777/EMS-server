import express from "express";
import admin from "firebase-admin";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch"; // Required for sending HTTP requests
import cron from "node-cron";
import nodemailer from "nodemailer"
import sendgrid from "@sendgrid/mail";
import PDFDocument from "pdfkit";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";
import bodyParser from "body-parser";
import path from "path";
import pdf from 'html-pdf'
import { fileURLToPath } from "url";
// Convert ES module URL to file path
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// // Read Firebase credentials
// const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-admin-sdk.json"), "utf8"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load firebase-admin-sdk.json from the same directory
const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "firebase-admin-sdk.json"), "utf8")
);

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 4000; // Set a default port

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());



// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// // Send notification To All Users With Fcm Token , On An Action performing API
// app.post("/send-notifications", async (req, res) => {
//     try {
//         const { title, body } = req.body;
//         if (!title || !body) return res.status(400).json({ message: "Title and body are required." });

//         const { data: users, error } = await supabase.from("users").select("fcm_token , full_name");
//         if (error) return res.status(500).json({ error });

//         const tokens = users.map(user => user.fcm_token).filter(token => token);
//         const user1 = users.map(user => user.full_name).filter(token => token);

//         if (tokens.length === 0) return res.status(400).json({ message: "No valid FCM tokens found." });

//         const message = {
//             notification: { title, body },
//             tokens
//         };

//         // const response = await admin.messaging().sendMulticast(message);
//         const response = await admin.messaging().sendEachForMulticast(message);

//         res.json({ success: true, response });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });


app.post("/send-notifications", async (req, res) => {
    try {
        const { title, body, url } = req.body;
        if (!title || !body) return res.status(400).json({ message: "Title and Body are required." });

        // Fetch all FCM tokens with user information
        const { data: tokenData, error } = await supabase
            .from("fcm_tokens")
            .select("token, user_id, users(full_name)")
            .order("last_used_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        if (!tokenData || tokenData.length === 0) {
            return res.status(400).json({ message: "No valid FCM tokens found." });
        }

        // Create a base message template
        const baseMessage = {
            notification: {
                // Title and body will be customized per user
                icon: "/favicon.ico"
            },
            data: {
                url: url || "/",
                timestamp: String(Date.now())
            },
            // Set high priority for Android
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    priority: "high",
                    channelId: "general-notifications"
                }
            },
            // Configure for Apple devices
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        contentAvailable: true
                    }
                }
            },
            // Set web notification options
            webpush: {
                notification: {
                    icon: "/favicon.ico",
                    badge: "/favicon.ico",
                    vibrate: [200, 100, 200],
                    requireInteraction: true
                },
                fcmOptions: {
                    link: url || "/"
                }
            }
        };

        // Send notifications to all tokens
        const responses = await Promise.all(
            tokenData.map(async (item) => {
                try {
                    const userName = item.users?.full_name || "User";

                    const message = {
                        ...baseMessage,
                        token: item.token,
                        notification: {
                            ...baseMessage.notification,
                            title: `${userName}: ${title}`,
                            body: body
                        }
                    };

                    const response = await admin.messaging().send(message);
                    return { token: item.token, userId: item.user_id, success: true, response };
                } catch (sendError) {
                    // If the token is invalid, remove it from the database
                    if (sendError.code === 'messaging/invalid-registration-token' ||
                        sendError.code === 'messaging/registration-token-not-registered') {
                        try {
                            await supabase
                                .from("fcm_tokens")
                                .delete()
                                .eq("token", item.token);
                            console.log(`Removed invalid token: ${item.token}`);
                        } catch (deleteError) {
                            console.error("Error removing invalid token:", deleteError);
                        }
                    }
                    return { token: item.token, userId: item.user_id, success: false, error: sendError.message };
                }
            })
        );

        // Count successful notifications
        const successCount = responses.filter(r => r.success).length;

        console.log(`Sent ${successCount} notifications successfully out of ${tokenData.length} tokens`);
        res.json({
            success: successCount > 0,
            totalTokens: tokenData.length,
            successCount,
            responses
        });
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ error: error.message });
    }
});





app.post("/send-singlenotifications", async (req, res) => {
    try {
        const { title, body, fcmtoken, userId, taskId, projectId, url } = req.body;

        // Check if we have the required parameters
        if (!title || !body) {
            return res.status(400).json({ message: "Title and body are required." });
        }

        if (!fcmtoken && !userId) {
            return res.status(400).json({ message: "Either FCM token or user ID is required." });
        }

        // Create the base message payload
        const baseMessage = {
            notification: {
                title,
                body,
                // You can add an image URL here if needed
                // image: "https://example.com/notification-image.png"
            },
            data: {
                // Include additional data that can be used when the notification is clicked
                url: url || "/",
                taskId: taskId ? String(taskId) : "",
                projectId: projectId ? String(projectId) : "",
                timestamp: String(Date.now())
            },
            // Set high priority for Android
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    priority: "high",
                    channelId: "task-notifications"
                }
            },
            // Configure for Apple devices
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        contentAvailable: true
                    }
                }
            },
            // Set web notification options
            webpush: {
                notification: {
                    icon: "/favicon.ico",
                    badge: "/favicon.ico",
                    vibrate: [200, 100, 200],
                    requireInteraction: true
                },
                fcmOptions: {
                    link: url || "/"
                }
            }
        };

        let tokens = [];

        // If a specific token is provided, use it
        if (fcmtoken) {
            tokens.push(fcmtoken);
        }

        // If a user ID is provided, get all tokens for that user
        if (userId) {
            try {
                // First try to get tokens from the fcm_tokens table
                console.log(`Attempting to fetch tokens for user ${userId} from fcm_tokens table`);

                // Debug: Check if the table exists and its structure
                const { data: tableInfo, error: tableError } = await supabase
                    .from("fcm_tokens")
                    .select("*")
                    .limit(1);

                if (tableError) {
                    console.error("Error checking fcm_tokens table:", tableError.message);
                } else {
                    console.log("fcm_tokens table exists, sample data:", tableInfo);

                    // Debug: Check all tokens in the table
                    const { data: allTokens, error: allTokensError } = await supabase
                        .from("fcm_tokens")
                        .select("user_id, token")
                        .limit(10);

                    if (allTokensError) {
                        console.error("Error fetching sample tokens:", allTokensError.message);
                    } else {
                        console.log("Sample tokens in fcm_tokens table:", allTokens);
                    }
                }

                // Now try to get tokens for this specific user
                // Normalize the user_id to lowercase for consistency
                const normalizedUserId = userId.toLowerCase();
                console.log(`Using normalized user ID: ${normalizedUserId}`);

                // First try with the normalized user_id
                let { data: userTokens, error } = await supabase
                    .from("fcm_tokens")
                    .select("token, device_info")
                    .eq("user_id", normalizedUserId);

                console.log(`Query for user_id=${userId} returned:`, { data: userTokens, error });

                // If no results, try with case-insensitive comparison (UUID might be stored with different case)
                if (!error && (!userTokens || userTokens.length === 0)) {
                    console.log("No tokens found with exact match, trying case-insensitive search");

                    // Try to get all tokens and filter manually (not ideal but helps diagnose the issue)
                    const { data: allUserTokens, error: allError } = await supabase
                        .from("fcm_tokens")
                        .select("user_id, token, device_info");

                    if (!allError && allUserTokens && allUserTokens.length > 0) {
                        console.log(`Found ${allUserTokens.length} total tokens in the table`);

                        // Filter tokens manually with case-insensitive comparison
                        const matchingTokens = allUserTokens.filter(t =>
                            t.user_id && t.user_id.toLowerCase() === normalizedUserId
                        );

                        if (matchingTokens.length > 0) {
                            console.log(`Found ${matchingTokens.length} tokens with case-insensitive match`);
                            // Use these tokens instead
                            userTokens = matchingTokens;
                        } else {
                            console.log("No tokens found even with case-insensitive search");
                        }
                    }
                }

                if (error) {
                    // If there's an error (like table doesn't exist), try the users table as fallback
                    console.log("Error fetching from fcm_tokens table, trying users table as fallback:", error.message);

                    const { data: userData, error: userError } = await supabase
                        .from("users")
                        .select("fcm_token")
                        .eq("id", userId)
                        .single();

                    if (userError) {
                        console.error("Error fetching user FCM token from users table:", userError);
                    } else if (userData && userData.fcm_token) {
                        // Add the token from the users table, but first validate it
                        if (!tokens.includes(userData.fcm_token)) {
                            // Check if this token is valid (at least in format)
                            if (userData.fcm_token && userData.fcm_token.length > 20) {
                                tokens.push(userData.fcm_token);
                                console.log(`Using FCM token from users table as fallback: ${userData.fcm_token.substring(0, 20)}...`);
                            } else {
                                console.log("Found invalid token format in users table, skipping");

                                // Clear the invalid token
                                try {
                                    const { error: clearError } = await supabase
                                        .from("users")
                                        .update({ fcm_token: null })
                                        .eq("id", userId);

                                    if (!clearError) {
                                        console.log(`Cleared invalid token format from user ${userId}`);
                                    }
                                } catch (clearError) {
                                    console.error("Error clearing invalid token:", clearError);
                                }
                            }
                        }
                    }
                } else if (userTokens && userTokens.length > 0) {
                    // Add all user tokens to our tokens array, avoiding duplicates
                    console.log(`Found ${userTokens.length} tokens for user ${userId} in fcm_tokens table`);
                    userTokens.forEach(item => {
                        if (!tokens.includes(item.token)) {
                            tokens.push(item.token);
                            const deviceInfo = item.device_info ?
                                `(${JSON.parse(item.device_info).platform || 'unknown device'})` :
                                '(no device info)';
                            console.log(`Added token for user ${userId} ${deviceInfo}`);
                        } else {
                            console.log(`Skipping duplicate token for user ${userId}`);
                        }
                    });
                } else {
                    console.log(`No tokens found for user ${userId} in fcm_tokens table - userTokens:`, userTokens);

                    // Try the users table as fallback if no tokens found in fcm_tokens
                    const { data: userData, error: userError } = await supabase
                        .from("users")
                        .select("fcm_token")
                        .eq("id", userId)
                        .single();

                    if (userError) {
                        console.error("Error fetching user FCM token from users table:", userError);
                    } else if (userData && userData.fcm_token) {
                        // Add the token from the users table, but first validate it
                        if (!tokens.includes(userData.fcm_token)) {
                            // Check if this token is valid (at least in format)
                            if (userData.fcm_token && userData.fcm_token.length > 20) {
                                tokens.push(userData.fcm_token);
                                console.log(`Using FCM token from users table as fallback: ${userData.fcm_token.substring(0, 20)}...`);
                            } else {
                                console.log("Found invalid token format in users table, skipping");

                                // Clear the invalid token
                                try {
                                    const { error: clearError } = await supabase
                                        .from("users")
                                        .update({ fcm_token: null })
                                        .eq("id", userId);

                                    if (!clearError) {
                                        console.log(`Cleared invalid token format from user ${userId}`);
                                    }
                                } catch (clearError) {
                                    console.error("Error clearing invalid token:", clearError);
                                }
                            }
                        }
                    }
                }
            } catch (dbError) {
                console.error("Database error fetching tokens:", dbError);
            }
        }

        // If we have no tokens, return an error
        if (tokens.length === 0) {
            return res.status(400).json({ message: "No valid FCM tokens found for this user." });
        }

        // Send notifications to all tokens
        const responses = await Promise.all(
            tokens.map(async (token) => {
                try {
                    const message = { ...baseMessage, token };
                    const response = await admin.messaging().send(message);
                    return { token, success: true, response };
                } catch (sendError) {
                    // If the token is invalid, remove it from both tables
                    if (sendError.code === 'messaging/invalid-registration-token' ||
                        sendError.code === 'messaging/registration-token-not-registered') {
                        try {
                            // Remove from fcm_tokens table
                            const { error: tokenDeleteError } = await supabase
                                .from("fcm_tokens")
                                .delete()
                                .eq("token", token);

                            if (tokenDeleteError) {
                                console.error("Error removing token from fcm_tokens:", tokenDeleteError);
                            } else {
                                console.log(`Removed invalid token from fcm_tokens: ${token.substring(0, 20)}...`);
                            }

                            // Also check if this token is in the users table and clear it
                            const { data: usersWithToken, error: findError } = await supabase
                                .from("users")
                                .select("id")
                                .eq("fcm_token", token);

                            if (!findError && usersWithToken && usersWithToken.length > 0) {
                                // Clear the token from all users that have it
                                for (const user of usersWithToken) {
                                    const { error: clearError } = await supabase
                                        .from("users")
                                        .update({ fcm_token: null })
                                        .eq("id", user.id);

                                    if (clearError) {
                                        console.error(`Error clearing token from user ${user.id}:`, clearError);
                                    } else {
                                        console.log(`Cleared invalid token from user ${user.id}`);
                                    }
                                }
                            }
                        } catch (deleteError) {
                            console.error("Error removing invalid token:", deleteError);
                        }
                    }
                    return { token, success: false, error: sendError.message };
                }
            })
        );

        // Count successful notifications
        const successCount = responses.filter(r => r.success).length;

        console.log(`Sent ${successCount} notifications successfully out of ${tokens.length} tokens`);
        res.json({
            success: successCount > 0,
            totalTokens: tokens.length,
            successCount,
            responses
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: error.message });
    }
});





//Sending slack notoiifcation on request approval
app.post("/send-slack", async (req, res) => {
    const { USERID, message } = req.body;
    const SLACK_BOT_TOKEN = process.env.VITE_SLACK_BOT_USER_OAUTH_TOKEN;

    if (!SLACK_BOT_TOKEN) {
        return res.status(500).json({ error: "Slack Bot Token is missing!" });
    }

    try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
            },
            body: JSON.stringify({
                channel: USERID, // Use the Slack User ID
                text: message,
            }),
        });

        const data = await response.json();

        if (!data.ok) throw new Error(data.error);

        return res.status(200).json({ success: true, message: "Notification sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


//Sending Slack Notification On Request Reject
app.post("/send-slackreject", async (req, res) => {
    const { USERID, message } = req.body;
    const SLACK_BOT_TOKEN = process.env.VITE_SLACK_BOT_USER_OAUTH_TOKEN;

    if (!SLACK_BOT_TOKEN) {
        return res.status(500).json({ error: "Slack Bot Token is missing!" });
    }

    try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
            },
            body: JSON.stringify({
                channel: USERID, // Use the Slack User ID
                text: message,
            }),
        });

        const data = await response.json();

        if (!data.ok) throw new Error(data.error);

        return res.status(200).json({ success: true, message: "Notification sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});




// Function to send Checkin And CheckOut Reminders On Slack
const sendSlackNotification = async (message) => {
    const SLACK_WEBHOOK_URL = process.env.VITE_SLACK_WEBHOOK_URL; // Add this inside the function

    if (!SLACK_WEBHOOK_URL) {
        console.error("Slack Webhook URL is missing!");
        return;
    }

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) throw new Error("Failed to send Slack notification");

        console.log("Notification sent successfully!");
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};


// Schedule tasks using cron
cron.schedule("45 8 * * *", () => {
    sendSlackNotification("🌞 Good Morning! Please Don't Forget To Check In.");
}, {
    timezone: "Asia/Karachi"
});

cron.schedule("45 16 * * *", () => {
    sendSlackNotification("Hello Everyone! Ensure You Have Checked Out From EMS.");
}, {
    timezone: "Asia/Karachi"
});

cron.schedule("45 12 * * *", () => {
    sendSlackNotification("🔔 Reminder: Please Dont Forget To start Break!");
}, {
    timezone: "Asia/Karachi"
});

cron.schedule("45 13 * * *", () => {
    sendSlackNotification("🔔 Reminder: Please Dont Forget To End Break!");
}, {
    timezone: "Asia/Karachi"
});




// Email sending function
const sendEmail = async (req, res) => {
    const { senderEmail, recipientEmail, subject, employeeName, leaveType, startDate, endDate, reason } = req.body;

    // Create transporter
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // Your email (EMS system email)
            pass: process.env.VITE_EMAIL_PASS, // Your app password
        },
    });

    let message = `
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

    // Email options
    let mailOptions = {
        from: process.env.VITE_EMAIL_USER, // The email that actually sends the email
        to: recipientEmail, // Admin's email
        subject: subject,
        html: message,
        replyTo: senderEmail, // This ensures the admin’s reply goes to the user
    };

    // Send email
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        res.status(200).json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    } sendEmail
};
// API Route
app.post("/send-email", sendEmail);



//Sending Bulk Email To Users On Office Alerts
// Route: Send bulk email
app.post("/send-alertemail", async (req, res) => {
    const { recipients, subject, message } = req.body;

    if (!recipients || recipients.length === 0) {
        return res.status(400).json({ error: "Recipient list is empty" });
    }

    try {
        // Setup transporter
        const transporter = nodemailer.createTransport({
            service: "gmail", // or another provider
            auth: {
                user: process.env.VITE_EMAIL_USER, // Your email (EMS system email)
                pass: process.env.VITE_EMAIL_PASS, // Your app password
            },
        });

        // Send email
        const info = await transporter.sendMail({
            from: process.env.VITE_EMAIL_USER, // The email that actually sends the email
            to: "", // empty TO
            bcc: recipients, // list of emails
            subject,
            html: message, // or use html: "<b>Hello</b>"
        });

        console.log("Message sent: %s", info.messageId);
        res.json({ status: "Emails sent successfully" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send emails", detail: error.message });
    }
});


const sendAdminResponse = async (req, res) => {
    const { employeeName, userEmail, leaveType, startDate } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // EMS system email
            pass: process.env.VITE_EMAIL_PASS, // App password
        },
    });


    let message = `
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


    let mailOptions = {
        from: process.env.VITE_EMAIL_USER,
        to: userEmail,
        subject: "Leave Request Approved",
        html: message, // Using HTML format for better styling
        replyTo: "contact@techcreator.co",
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Response Email sent: " + info.response);
        res.status(200).json({ message: "Response email sent successfully!" });
    } catch (error) {
        console.error("Error sending response email:", error);
        res.status(500).json({ error: "Failed to send response email" });
    }
};

app.post("/send-response", sendAdminResponse);





//Sending Response To user For Rejected Requests

const sendAdminResponsereject = async (req, res) => {
    const { employeeName, userEmail, leaveType, startDate } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // EMS system email
            pass: process.env.VITE_EMAIL_PASS, // App password
        },
    });

    let message = `
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

    let mailOptions = {
        from: process.env.VITE_EMAIL_USER,
        to: userEmail,
        subject: "Leave Request Rejected",
        html: message, // Send as HTML email
        replyTo: "contact@techcreator.co",
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Rejection Email sent: " + info.response);
        res.status(200).json({ message: "Rejection email sent successfully!" });
    } catch (error) {
        console.error("Error sending rejection email:", error);
        res.status(500).json({ error: "Failed to send rejection email" });
    }
};

app.post("/send-rejectresponse", sendAdminResponsereject);




//Sending Task Assignment Email
const sendTaskEmail = async (req, res) => {
    const { username, projectName, kpiCount, projectId, priority, recipientEmail } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.VITE_EMAIL_USER, // EMS system email
            pass: process.env.VITE_EMAIL_PASS, // App password
        },
    });

    let message = `
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

    let mailOptions = {
        from: process.env.VITE_EMAIL_USER,
        to: recipientEmail,
        subject: `🎯 New Task Assignment - ${projectName}`,
        html: message,
        replyTo: "contact@techcreator.co",
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Task assignment email sent: " + info.response);
        res.status(200).json({ message: "Task assignment email sent successfully!" });
    } catch (error) {
        console.error("Error sending task assignment email:", error);
        res.status(500).json({ error: "Failed to send task assignment email" });
    }
};

app.post("/sendtaskemail", sendTaskEmail);






//Path To Download Daily Attendance Data PDF
app.post('/generate-pdfDaily', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Daily Attendance Report</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Work Mode</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.full_name}</td>
                        <td>${item.check_in}</td>
                        <td>${item.check_out}</td>
                        <td>${item.work_mode}</td>
                        <td>${item.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});




//Path To Download Weekly Attendance Data PDF
app.post('/generate-pdfWeekly', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Weekly Attendance Report</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Attendance</th>
                    <th>Absentees</th>
                    <th>Working Hours</th>
                    <th>Working Hours %</th>
                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.user.full_name}</td>
                        <td>${item.presentDays}</td>
                        <td>${item.absentDays}</td>
                        <td>${item.totalHoursWorked.toFixed(2)}</td>
                        <td>${item.workingHoursPercentage.toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});





//Path To Download Filtered Attendance Data PDF
app.post('/generate-Filtered', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Attendance Report filtered</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Attendance</th>
                    <th>Absentees</th>
                    <th>Working Hours</th>
                    <th>Working Hours %</th>
                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.user.full_name}</td>
                        <td>${item.presentDays}</td>
                        <td>${item.absentDays}</td>
                        <td>${item.totalHoursWorked.toFixed(2)}</td>
                        <td>${item.workingHoursPercentage.toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});




//Path To Download Weekly Attendance Data PDF
app.post('/generate-pdfMonthly', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Monthly Attendance Report</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Attendance</th>
                    <th>Absentees</th>
                    <th>Working Hours</th>
                    <th>Working Hours %</th>
                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.user.full_name}</td>
                        <td>${item.presentDays}</td>
                        <td>${item.absentDays}</td>
                        <td>${item.totalHoursWorked.toFixed(2)}</td>
                        <td>${item.workingHoursPercentage.toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});





//Path To Download Weekly Attendance Data PDF
app.post('/generate-pdfFilteredOfEmployee', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Filtered Attendance Report of ${req.body.data[0].fullname}</h1>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Mode</th>


                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.status}</td>
                        <td>${item.Check_in}</td>
                        <td>${item.Check_out}</td>
                        <td>${item.workmode}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});


//Path To Download Weekly Attendance Data PDF
app.post('/generate-pdfWeeklyOfEmployee', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Weekly Attendance Report of ${req.body.data[0].fullname}</h1>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Mode</th>


                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.status}</td>
                        <td>${item.Check_in}</td>
                        <td>${item.Check_out}</td>
                        <td>${item.workmode}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});

//Path To Download Monthly Attendance Data PDF
app.post('/generate-pdfMonthlyOfEmployee', (req, res) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Monthly Attendance Report of ${req.body.data[0].fullname} </h1>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Mode</th>
                </tr>
            </thead>
            <tbody>
                ${req.body.data.map(item => `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.status}</td>
                        <td>${item.Check_in}</td>
                        <td>${item.Check_out}</td>
                        <td>${item.workmode}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.create(htmlContent).toFile(fileName, (err, result) => {
        if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
        }
        res.download(result.filename, fileName, () => {
            fs.unlinkSync(result.filename); // Delete file after sending
        });
    });
});



// Add these functions from fetchusers.js
const holidaydates = [];

const isWorkingDay = (date) => {
    const day = date.getDay(); // Get the day of the week (0 = Sunday, 6 = Saturday)
    const dateStr = date.toISOString().split('T')[0];
    if (holidaydates.includes(dateStr)) {
        return false;
    }
    return day !== 0 && day !== 6; // Return true if it's not Saturday or Sunday
};

async function fetchholidays() {
    const { data, error } = await supabase
        .from('holidays')
        .select('date'); // Adjust to select the date field from your holidays table

    if (error) {
        console.error('Error fetching holidays:', error);
        return;
    }

    for (const holiday of data) {
        const convertedDate = new Date(holiday.date);
        const dateStr = convertedDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'

        if (!holidaydates.includes(dateStr)) {
            holidaydates.push(dateStr);
        }
    }
}

const fetchUsers = async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    if (!isWorkingDay(today) || holidaydates.includes(dateStr)) {
        console.log('Today is not a working day or is a holiday. Skipping fetchUsers.');
        return;
    }

    try {
        console.log('Fetching users...');

        // Get today's date range
        const todayDate = today.toISOString().split('T')[0];
        const startOfDay = `${todayDate}T00:00:00.000Z`;
        const endOfDay = `${todayDate}T23:59:59.999Z`;

        // Fetch all users
        const { data: users, error: usersError } = await supabase.from('users').select('*');
        if (usersError) throw usersError;

        console.log(`Total users fetched: ${users.length}`);

        // Fetch all today's attendance records
        const { data: attendanceLogs, error: attendanceError } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('check_in', startOfDay)
            .lt('check_in', endOfDay);
        if (attendanceError) throw attendanceError;

        // Fetch all today's absentee records
        const { data: absentees, error: absenteeError } = await supabase
            .from('absentees')
            .select('*')
            .gte('created_at', startOfDay)
            .lt('created_at', endOfDay);
        if (absenteeError) throw absenteeError;

        // Arrays to store updates
        let attendanceUpdates = []; // For updating checkout times in attendance_logs
        let absenteeRecords = [];   // For inserting absentee records into absentees

        // Loop through each user
        for (const user of users) {
            console.log(`Processing user: ${user.id}`);

            // Find user's attendance for today
            const userAttendance = attendanceLogs.find(log => log.user_id === user.id);

            // Check if the user is already marked absent
            const existingAbsentee = absentees.find(absent => absent.user_id === user.id);

            // Case 1: User has NO check-in record
            if (!userAttendance) {
                console.log(`User ${user.id} has no check-in record.`);

                if (existingAbsentee) {
                    console.log(`User ${user.id} is already marked absent. Skipping...`);
                    continue;
                }

                console.log(`Marking user ${user.id} as absent for Full Day.`);
                absenteeRecords.push({ user_id: user.id, absentee_type: 'Absent', absentee_Timing: 'Full Day' });
                continue;
            }

            // Case 2: User has check-in but no check-out
            if (userAttendance.check_in && !userAttendance.check_out) {
                console.log(`User ${user.id} has checked in but no check-out.`);

                // Set the checkout time to 4:30 PM PKT (11:30 AM UTC)
                const checkoutTime = `${todayDate}T11:30:00.000Z`;

                // Add to attendanceUpdates array
                attendanceUpdates.push({
                    id: userAttendance.id, // Unique ID of the attendance record
                    check_out: checkoutTime, // New checkout time
                    autocheckout: 'yes' // Mark as auto-checkout
                });

                console.log(`User ${user.id} checkout time will be updated to 4:30 PM PKT.`);
                continue;
            }

            // Case 3: User has both check-in and check-out (No action needed)
            if (userAttendance.check_in && userAttendance.check_out) {
                console.log(`User ${user.id} has both check-in and check-out. No action needed.`);
                absenteeRecords.push({ user_id: user.id, absentee_type: 'Not Absent' });
                continue;
            }
        }

        // Remove duplicate entries based on user_id for absentee records
        const uniqueAbsenteeRecords = [];
        const seenUserIds = new Set();

        absenteeRecords.forEach(record => {
            if (!seenUserIds.has(record.user_id)) {
                seenUserIds.add(record.user_id);
                uniqueAbsenteeRecords.push(record);
            }
        });

        // Remove 'Not Absent' users and create a new array
        const finalAbsentees = uniqueAbsenteeRecords.filter(record => record.absentee_type !== 'Not Absent');

        // Log final absent users
        console.log('Final Absent Users Data:', finalAbsentees);

        // Perform batch updates for attendance logs
        if (attendanceUpdates.length > 0) {
            console.log('Updating attendance logs with checkout times...');
            for (const update of attendanceUpdates) {
                const { error: updateError } = await supabase
                    .from('attendance_logs')
                    .update({ check_out: update.check_out, autocheckout: 'yes' })
                    .eq('id', update.id);

                if (updateError) {
                    console.error('Error updating attendance log:', updateError);
                } else {
                    console.log(`Updated attendance log for user ${update.id}.`);
                }
            }
            console.log('Attendance logs updated successfully.');
        } else {
            console.log('No attendance logs to update.');
        }

        // Insert absentee records into the database
        if (finalAbsentees.length > 0) {
            console.log('Inserting absentee records into the database...');
            const { error: insertError } = await supabase.from('absentees').insert(finalAbsentees);
            if (insertError) throw insertError;
            console.log('Database updated successfully with absent users.');
        } else {
            console.log('No absent users to update in the database.');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
};


// make admin route?
// Create Admin User Endpoint
// Create Admin User Endpoint with better error handling
app.post("/create-admin", async (req, res) => {
    try {
        const { email, password, full_name, organization_id } = req.body;

        // Validate input
        if (!email || !password || !full_name || !organization_id) {
            return res.status(400).json({
                error: "Email, password, full name, and organization ID are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters long"
            });
        }

        // Check if user exists in database by email
        const { data: existingUser, error: checkError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', email.trim())
            .maybeSingle();

        // Check if auth user exists
        const { data: authUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = authUsers?.users?.find(user => user.email === email.trim());

        if (existingUser) {
            return res.status(400).json({
                error: "A user with this email already exists in database"
            });
        }

        if (existingAuthUser) {
            return res.status(400).json({
                error: "Auth user already exists with this email. Please use a different email or contact administrator."
            });
        }

        // Create auth user
        console.log(`Creating auth user for email: ${email.trim()}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name.trim()
            }
        });

        if (authError) {
            console.error("Auth user creation failed:", authError);
            return res.status(400).json({ error: `Auth creation failed: ${authError.message}` });
        }

        if (!authData?.user?.id) {
            console.error("Auth user created but no user ID returned");
            return res.status(400).json({ error: "Auth user creation failed - no user ID" });
        }

        console.log(`Auth user created successfully with ID: ${authData.user.id}`);

        // Verify auth user was created properly
        const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(authData.user.id);
        if (verifyError || !verifyUser) {
            console.error("Auth user verification failed:", verifyError);
            return res.status(400).json({ error: "Auth user creation verification failed" });
        }
        console.log(`Auth user verified: ${verifyUser.user.email}`);

        // Declare userData variable
        let userData;

        // Check if this ID already exists in database (shouldn't happen but let's verify)
        console.log(`Checking if ID ${authData.user.id} exists in database...`);
        const { data: existingRecord, error: existingError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

        console.log('Database check result:', { existingRecord, existingError });

        if (existingRecord) {
            console.log(`Database record found for ID ${authData.user.id}, updating existing record...`);
            const { data: updateData, error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    email: email.trim(),
                    full_name: full_name.trim(),
                    role: 'admin',
                    organization_id: organization_id
                })
                .eq('id', authData.user.id)
                .select()
                .single();

            if (updateError) {
                console.error("Update failed:", updateError);
                try {
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    console.log("Rolled back auth user creation");
                } catch (deleteError) {
                    console.error("Failed to rollback auth user:", deleteError);
                }
                return res.status(400).json({ error: "Failed to update existing user record" });
            }

            console.log("User record updated successfully");
            userData = updateData;
        } else {
            console.log(`No existing record found for ID ${authData.user.id}, proceeding with insertion...`);

            // Create user profile with admin role
            console.log(`Creating database record for user ID: ${authData.user.id}`);
            const { data: insertData, error: userError } = await supabaseAdmin
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email: email.trim(),
                    full_name: full_name.trim(),
                    role: 'admin',
                    organization_id: organization_id,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (userError) {
                console.error("Database error:", userError);
                try {
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    console.log("Rolled back auth user creation");
                } catch (deleteError) {
                    console.error("Failed to rollback auth user:", deleteError);
                }
                return res.status(400).json({ error: userError.message });
            }

            userData = insertData;
        }

        // Send welcome email
        if (process.env.VITE_EMAIL_USER && process.env.VITE_EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.VITE_EMAIL_USER,
                        pass: process.env.VITE_EMAIL_PASS,
                    },
                });

                const mailOptions = {
                    from: process.env.VITE_EMAIL_USER,
                    to: email,
                    subject: "Welcome to TechCreator EMS - Admin Account Created",
                    html: `
                        <h2>Welcome ${full_name}!</h2>
                        <p>Your admin account has been created successfully.</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Temporary Password:</strong> ${password}</p>
                        <p>Please login with these credentials.</p>
                        <p>We recommend changing your password after your first login.</p>
                        <p>Best regards,<br>TechCreator Team</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log("Welcome email sent to new admin");
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
            }
        }

        res.status(201).json({
            success: true,
            message: "Admin user created successfully. User can now login with the provided credentials.",
            user: userData,
            auth_user_id: authData.user.id
        });

    } catch (error) {
        console.error("Error creating admin user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Client invitation route
app.post("/inviteClient", async (req, res) => {
    try {
        const { email, personalEmail, password } = req.body;

        // Validate input
        if (!email || !personalEmail || !password) {
            return res.status(400).json({ error: "Email, personalEmail, and password are required" });
        }

        // Send invitation email
        if (process.env.VITE_EMAIL_USER && process.env.VITE_EMAIL_PASS) {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.VITE_EMAIL_USER,
                    pass: process.env.VITE_EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.VITE_EMAIL_USER,
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
});

// Schedule fetchUsers to run at 9:00 PM PKT daily
cron.schedule('0 21 * * *', async () => {
    console.log('Running fetchUsers cron job at 9:00 PM PKT...');
    await fetchholidays(); // Fetch holidays before running fetchUsers
    await fetchUsers();
}, {
    timezone: 'Asia/Karachi'
});

// ... (Rest of your existing server.js code, including app.listen, remains unchanged)

// Start the Server
app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
});
