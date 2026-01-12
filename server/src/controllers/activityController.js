import axios from "axios";
import Activity from "../models/Activity.js";
import User from "../models/User.js";
import TrainingPlan from "../models/TrainingPlan.js";

const refreshStravaToken = async (user) => {
    try {
        const response = await axios.post(
            "https://www.strava.com/oauth/token",
            {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: user.strava.refreshToken,
            }
        );

        const { access_token, refresh_token, expires_at } = response.data;

        user.strava.accessToken = access_token;
        user.strava.refreshToken = refresh_token;
        user.strava.expiresAt = expires_at;

        await user.save();
        return access_token;
    } catch (error) {
        console.error("Error refreshing Strava token:", error);
        throw new Error("Failed to refresh Strava token");
    }
};

// @desc    Sync activities from Strava
// @route   POST /api/activities/sync
// @access  Private
const syncActivities = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || !user.strava || !user.strava.accessToken) {
            return res.status(400).json({ message: "Strava not connected" });
        }

        let accessToken = user.strava.accessToken;
        const now = Math.floor(Date.now() / 1000);

        if (user.strava.expiresAt && user.strava.expiresAt < now) {
            console.log("Strava token expired, refreshing...");
            accessToken = await refreshStravaToken(user);
        }

        const response = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities?per_page=30`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const activities = response.data;
        const savedActivities = [];

        for (const activity of activities) {
            // Only save runs if needed, or all. Assuming we want everything that has a map.
            // Strava activities might not have a summary_polyline if manual.

            const existingActivity = await Activity.findOne({
                stravaId: activity.id.toString(),
            });

            if (existingActivity) {
                // Update if needed, or skip
                continue;
            }

            const newActivity = await Activity.create({
                user: user._id,
                stravaId: activity.id.toString(),
                name: activity.name,
                distance: activity.distance,
                movingTime: activity.moving_time,
                elapsedTime: activity.elapsed_time,
                totalElevationGain: activity.total_elevation_gain,
                type: activity.type,
                startDate: activity.start_date,
                map: {
                    summary_polyline: activity.map?.summary_polyline,
                },
                averageSpeed: activity.average_speed,
            });

            savedActivities.push(newActivity);
        }

        // --- NEW: Sync with Training Plan ---
        const plan = await TrainingPlan.findOne({ user: user._id }).sort({
            createdAt: -1,
        });

        if (plan && savedActivities.length > 0) {
            // Logic to determine Plan Start Date (Week 1, Day 1 = Monday)
            const planStart = new Date(plan.startDate || plan.createdAt);
            const dayOfWeek = planStart.getDay(); // 0=Sun, 1=Mon...
            let daysUntilMonday;
            if (dayOfWeek === 1) daysUntilMonday = 0;
            else if (dayOfWeek === 0) daysUntilMonday = 1;
            else daysUntilMonday = 8 - dayOfWeek;

            const referenceStartDate = new Date(planStart);
            referenceStartDate.setDate(planStart.getDate() + daysUntilMonday);
            referenceStartDate.setHours(0, 0, 0, 0);

            const dayOffsets = {
                Monday: 0,
                Tuesday: 1,
                Wednesday: 2,
                Thursday: 3,
                Friday: 4,
                Saturday: 5,
                Sunday: 6,
            };

            let planUpdated = false;

            for (const activity of savedActivities) {
                const activityDate = new Date(activity.startDate);
                activityDate.setHours(0, 0, 0, 0);

                for (const week of plan.schedule) {
                    for (const workout of week.workouts) {
                        if (workout.completed) continue;

                        const weekOffset = (week.weekNumber - 1) * 7;
                        const dayOffset = dayOffsets[workout.day];

                        if (dayOffset === undefined) continue;

                        const workoutDate = new Date(referenceStartDate);
                        workoutDate.setDate(
                            workoutDate.getDate() + weekOffset + dayOffset
                        );
                        workoutDate.setHours(0, 0, 0, 0);

                        if (activityDate.getTime() === workoutDate.getTime()) {
                            let targetDistanceMeters = 0;
                            if (
                                workout.distance &&
                                workout.distance.toLowerCase().includes("km")
                            ) {
                                targetDistanceMeters =
                                    parseFloat(workout.distance) * 1000;
                            } else if (
                                workout.distance &&
                                workout.distance.toLowerCase().includes("mi")
                            ) {
                                targetDistanceMeters =
                                    parseFloat(workout.distance) * 1609.34;
                            }

                            if (targetDistanceMeters > 0) {
                                if (activity.distance >= targetDistanceMeters) {
                                    workout.completed = true;
                                    planUpdated = true;
                                }
                            }
                        }
                    }
                }
            }

            if (planUpdated) {
                await plan.save();
            }
        }

        res.json({
            message: `Synced ${savedActivities.length} new activities`,
            count: savedActivities.length,
        });
    } catch (error) {
        console.error("Error syncing activities:", error);
        res.status(500).json({
            message: "Failed to sync activities",
            error: error.message,
        });
    }
};

// @desc    Get user activities
// @route   GET /api/activities
// @access  Private
const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ user: req.user._id }).sort({
            startDate: -1,
        });
        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch activities" });
    }
};

export { syncActivities, getActivities };
