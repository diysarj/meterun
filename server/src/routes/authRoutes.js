import express from "express";
import {
    authUser,
    registerUser,
    logoutUser,
    connectStrava,
    connectGoogle,
    getSyncStatus,
    disconnectStrava,
    disconnectGoogle,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", authUser);
router.post("/logout", logoutUser);
router.post("/strava", protect, connectStrava);
router.post("/google", protect, connectGoogle);
router.get("/sync-status", protect, getSyncStatus);
router.post("/disconnect/strava", protect, disconnectStrava);
router.post("/disconnect/google", protect, disconnectGoogle);

export default router;
