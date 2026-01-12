import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "../server/src/config/db.js";
import authRoutes from "../server/src/routes/authRoutes.js";
import planRoutes from "../server/src/routes/planRoutes.js";
import activityRoutes from "../server/src/routes/activityRoutes.js";
import webhookRoutes from "../server/src/routes/webhookRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, "../server/.env") });

// Connect to MongoDB
let isConnected = false;
const ensureDbConnection = async () => {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }
};

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
    "https://meterun.vercel.app",
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware to ensure DB connection on each request
app.use(async (req, res, next) => {
    try {
        await ensureDbConnection();
        next();
    } catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ message: "Database connection failed" });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("/api", (req, res) => {
    res.json({ message: "Meterun API is running..." });
});

// Vercel Serverless Function Handler
export default app;
