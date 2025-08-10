import { sendBulkNotification, sendSingleNotification } from "../utils/notificationUtils.js";

// Send notification to all users
export const sendNotifications = async (req, res) => {
    try {
        const { title, body, url } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: "Title and Body are required." });
        }

        const result = await sendBulkNotification(title, body, url);
        res.json(result);
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ error: error.message });
    }
};

// Send notification to a single user
export const sendSingleNotifications = async (req, res) => {
    try {
        const { title, body, fcmtoken, userId, taskId, projectId, url } = req.body;

        // Check if we have the required parameters
        if (!title || !body) {
            return res.status(400).json({ message: "Title and body are required." });
        }

        if (!fcmtoken && !userId) {
            return res.status(400).json({ message: "Either FCM token or user ID is required." });
        }

        const result = await sendSingleNotification(title, body, fcmtoken, userId, taskId, projectId, url);
        res.json(result);
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: error.message });
    }
};
