import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase credentials
const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../firebase-admin-sdk.json"), "utf8")
);

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;
