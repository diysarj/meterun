import express from "express";
import {
    createPlan,
    getPlans,
    syncPlanToGoogle,
    updateWorkoutStatus,
    deletePlan,
} from "../controllers/planController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createPlan).get(protect, getPlans);

router.post("/:id/sync-google", protect, syncPlanToGoogle);
router.patch("/:id/workout", protect, updateWorkoutStatus);
router.delete("/:id", protect, deletePlan);

export default router;
