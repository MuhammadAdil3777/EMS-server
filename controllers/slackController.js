import { sendSlackDirectMessage } from "../utils/slackUtils.js";

// Send Slack notification for request approval
export const sendSlackApproval = async (req, res) => {
    try {
        const { USERID, message } = req.body;
        
        await sendSlackDirectMessage(USERID, message);
        return res.status(200).json({ success: true, message: "Notification sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Send Slack notification for request rejection
export const sendSlackRejection = async (req, res) => {
    try {
        const { USERID, message } = req.body;
        
        await sendSlackDirectMessage(USERID, message);
        return res.status(200).json({ success: true, message: "Notification sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
