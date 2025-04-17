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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Read Firebase credentials
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-admin-sdk.json"), "utf8"));



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
const supabase = createClient(process.env.VITE_SUPABASE_URL , process.env.VITE_SUPABASE_ANON_KEY);

// Send notification To All Users With Fcm Token , On An Action performing API
app.post("/send-notifications", async (req, res) => {
    try {
        const { title, body } = req.body;
        if (!title || !body) return res.status(400).json({ message: "Title and body are required." });

        const { data: users, error } = await supabase.from("users").select("fcm_token");
        if (error) return res.status(500).json({ error });

        const tokens = users.map(user => user.fcm_token).filter(token => token);

        if (tokens.length === 0) return res.status(400).json({ message: "No valid FCM tokens found." });

        const message = {
            notification: { title, body },
            tokens
        };

        // const response = await admin.messaging().sendMulticast(message);
        const response = await admin.messaging().sendEachForMulticast(message);

        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post("/send-singlenotifications", async (req, res) => {
    try {
        const { title, body, fcmtoken } = req.body;
        if (!title || !body || !fcmtoken) {
            return res.status(400).json({ message: "Title, body, and FCM token are required." });
        }

        const message = {
            notification: { title, body },
            token: fcmtoken  // Use 'token' instead of including it inside 'notification'
        };

        const response = await admin.messaging().send(message);

        res.json({ success: true, response });
    } catch (error) {
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
    const { senderEmail, recipientEmail, subject, employeeName , leaveType , startDate , endDate , reason } = req.body;

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
        text: message,
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
    }
};
// API Route
app.post("/send-email", sendEmail);




const sendAdminResponse = async (req, res) => {
    const {employeeName,  userEmail, leaveType, startDate } = req.body;

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


// Start the Server
app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
});
