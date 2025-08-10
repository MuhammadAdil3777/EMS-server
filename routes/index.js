import notificationRoutes from "./notificationRoutes.js";
import slackRoutes from "./slackRoutes.js";
import emailRoutes from "./emailRoutes.js";
import contactRoutes from "./contactRoutes.js";
import pdfRoutes from "./pdfRoutes.js";
import userRoutes from "./userRoutes.js";

export const setupRoutes = (app) => {
    // Add a simple test route
    app.get("/", (req, res) => {
        res.json({ message: "EMS Server is running!", status: "success" });
    });

    app.get("/health", (req, res) => {
        res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });

    // Use all route modules
    app.use(notificationRoutes);
    app.use(slackRoutes);
    app.use(emailRoutes);
    app.use(contactRoutes);
    app.use(pdfRoutes);
    app.use(userRoutes);
};
