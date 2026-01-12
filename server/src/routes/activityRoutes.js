import express from "express";
import {
    syncActivities,
    getActivities,
} from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getActivities);
router.route("/sync").post(protect, syncActivities);

export default router;
