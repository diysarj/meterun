import express from "express";
import {
    verifyStravaWebhook,
    handleStravaEvent,
} from "../controllers/webhookController.js";

const router = express.Router();

router.route("/strava").get(verifyStravaWebhook).post(handleStravaEvent);

export default router;
