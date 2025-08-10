import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Send direct message to a specific user
export const sendSlackDirectMessage = async (userId, message) => {
    const SLACK_BOT_TOKEN = process.env.VITE_SLACK_BOT_USER_OAUTH_TOKEN;

    if (!SLACK_BOT_TOKEN) {
        throw new Error("Slack Bot Token is missing!");
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
            channel: userId,
            text: message,
        }),
    });

    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.error);
    }

    return data;
};

// Send notification to webhook (general channel)
export const sendSlackWebhookNotification = async (message) => {
    const SLACK_WEBHOOK_URL = process.env.VITE_SLACK_WEBHOOK_URL;

    if (!SLACK_WEBHOOK_URL) {
        throw new Error("Slack Webhook URL is missing!");
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
        throw new Error("Failed to send Slack notification");
    }

    return response;
};
