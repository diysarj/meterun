import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "Yes" : "No");
if (process.env.JWT_SECRET) {
    console.log("JWT_SECRET length:", process.env.JWT_SECRET.length);
}

const port = process.env.PORT || 5000;

connectDB();

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL, // Set this in Vercel env vars (e.g., https://meterun.vercel.app)
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

app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("/", (req, res) => {
    res.send("API is running...");
});

if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;
