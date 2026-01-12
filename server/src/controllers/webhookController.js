import User from "../models/User.js";
import axios from "axios";

// @desc    Verify Strava Webhook
// @route   GET /api/webhook/strava
// @access  Public
const verifyStravaWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === process.env.STRAVA_VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            res.json({ "hub.challenge": challenge });
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad request if params missing
    }
};

// @desc    Handle Strava Webhook Events
// @route   POST /api/webhook/strava
// @access  Public
const handleStravaEvent = async (req, res) => {
    console.log("Strava Webhook Event:", req.body);

    // Respond immediately to Strava (they timeout quickly)
    res.status(200).send("EVENT_RECEIVED");

    const { object_type, object_id, aspect_type, owner_id } = req.body;

    // We only care about new activities
    if (object_type === "activity" && aspect_type === "create") {
        try {
            // Find user by Strava Athlete ID
            const user = await User.findOne({ "strava.athleteId": owner_id });

            if (user) {
                console.log(`Processing new activity for user ${user.name}`);

                // Fetch activity details using user's access token
                // Need to handle token refresh if expired!

                // ... Implementation to fetch activity and update progress ...
                // user.trainingPlans... match date, mark as completed?
            } else {
                console.log("User not found for Strava ID:", owner_id);
            }
        } catch (error) {
            console.error("Error processing Strava event:", error.message);
        }
    }
};

export { verifyStravaWebhook, handleStravaEvent };
