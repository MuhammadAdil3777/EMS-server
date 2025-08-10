import express from "express";
import dotenv from "dotenv";

// Import configurations
import "./config/firebase.js"; // Initialize Firebase
import { setupMiddleware } from "./middleware/index.js";
import { setupRoutes } from "./routes/index.js";
import { setupCronJobs } from "./config/cronJobs.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Setup cron jobs
setupCronJobs();

// Start the Server
app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
});