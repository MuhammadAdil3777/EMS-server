import cron from "node-cron";
import { sendSlackWebhookNotification } from "../utils/slackUtils.js";
import { fetchHolidays, processUserAttendance } from "../utils/attendanceUtils.js";

// Setup all cron jobs
export const setupCronJobs = () => {
    // Morning check-in reminder at 8:45 AM PKT
    cron.schedule("45 8 * * *", () => {
        sendSlackWebhookNotification("🌞 Good Morning! Please Don't Forget To Check In.");
    }, {
        timezone: "Asia/Karachi"
    });

    // Evening check-out reminder at 4:45 PM PKT
    cron.schedule("45 16 * * *", () => {
        sendSlackWebhookNotification("Hello Everyone! Ensure You Have Checked Out From EMS.");
    }, {
        timezone: "Asia/Karachi"
    });

    // Lunch break start reminder at 12:45 PM PKT
    cron.schedule("45 12 * * *", () => {
        sendSlackWebhookNotification("🔔 Reminder: Please Dont Forget To start Break!");
    }, {
        timezone: "Asia/Karachi"
    });

    // Lunch break end reminder at 1:45 PM PKT
    cron.schedule("45 13 * * *", () => {
        sendSlackWebhookNotification("🔔 Reminder: Please Dont Forget To End Break!");
    }, {
        timezone: "Asia/Karachi"
    });

    // Daily attendance processing at 9:00 PM PKT
    cron.schedule('0 21 * * *', async () => {
        console.log('Running attendance processing cron job at 9:00 PM PKT...');
        await fetchHolidays(); // Fetch holidays before processing attendance
        await processUserAttendance();
    }, {
        timezone: 'Asia/Karachi'
    });

    console.log("Cron jobs have been set up successfully");
};
