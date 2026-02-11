import TrainingPlan from "../models/TrainingPlan.js";
import User from "../models/User.js";
import { generatePlanLogic } from "../utils/planAlgorithm.js";
import { google } from "googleapis";

// @desc    Generate and save a new training plan
// @route   POST /api/plans
// @access  Private
const createPlan = async (req, res) => {
    try {
        const { distance, raceDate, level, currentDistance, recentTime } =
            req.body;

        const schedule = generatePlanLogic(
            distance,
            raceDate,
            level,
            currentDistance,
            recentTime,
        );

        // Check if user already has a plan, maybe overwrite or create new?
        // For now, let's just create a new one.

        const plan = await TrainingPlan.create({
            user: req.user._id,
            targetRace: distance,
            targetDate: raceDate,
            level,
            schedule,
        });

        // Add to user array if needed, but we can query by user id
        res.status(201).json(plan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user's training plans
// @route   GET /api/plans
// @access  Private
const getPlans = async (req, res) => {
    try {
        const plans = await TrainingPlan.find({ user: req.user._id })
            .sort({
                createdAt: -1,
            })
            .lean();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Sync Plan to Google Calendar
// @route   POST /api/plans/:id/sync-google
// @access  Private
const syncPlanToGoogle = async (req, res) => {
    try {
        const planId = req.params.id;
        const plan = await TrainingPlan.findOne({
            _id: planId,
            user: req.user._id,
        });

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        const user = await User.findById(req.user._id);

        if (!user.google || !user.google.accessToken) {
            return res
                .status(400)
                .json({ message: "Google account not connected" });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI,
        );

        oauth2Client.setCredentials({
            access_token: user.google.accessToken,
            refresh_token: user.google.refreshToken,
        });

        // Handle token refresh
        oauth2Client.on("tokens", async (tokens) => {
            if (tokens.access_token) {
                user.google.accessToken = tokens.access_token;
                await user.save();
            }
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Map day names to day offsets (Monday = 0, Sunday = 6)
        const dayOffsets = {
            Monday: 0,
            Tuesday: 1,
            Wednesday: 2,
            Thursday: 3,
            Friday: 4,
            Saturday: 5,
            Sunday: 6,
        };

        // Color IDs for different workout types (Google Calendar color IDs 1-11)
        const workoutColors = {
            Rest: "8", // Gray
            "Rest / Recovery": "8",
            "Rest / Cross Train": "8",
            "Easy Run": "2", // Green
            "Long Run": "11", // Red
            "Speed Work": "6", // Orange
            "Tempo Run": "5", // Yellow
            Intervals: "6",
            "Light Intervals": "7",
            "Strength Training": "3", // Purple
        };

        const startDate = new Date(plan.startDate || plan.createdAt);
        // Adjust to the NEXT Monday (start of week 1)
        // If today is Monday, use today. Otherwise, find the next Monday.
        const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let daysUntilMonday;
        if (dayOfWeek === 1) {
            // Today is Monday, start today
            daysUntilMonday = 0;
        } else if (dayOfWeek === 0) {
            // Today is Sunday, next Monday is tomorrow
            daysUntilMonday = 1;
        } else {
            // For Tue-Sat, calculate days until next Monday
            daysUntilMonday = 8 - dayOfWeek; // e.g., Tuesday(2) → 8-2=6 days
        }
        startDate.setDate(startDate.getDate() + daysUntilMonday);
        startDate.setHours(0, 0, 0, 0);

        let eventsCreated = 0;
        let eventsSkipped = 0;
        const errors = [];

        for (const week of plan.schedule) {
            for (const workout of week.workouts) {
                // Skip rest days if desired (optional - we'll include them with notes)
                if (workout.type === "Rest" && workout.distance === "-") {
                    eventsSkipped++;
                    continue;
                }

                // Calculate the exact date for this workout
                const workoutDate = new Date(startDate);
                const weekOffset = (week.weekNumber - 1) * 7;
                const dayOffset = dayOffsets[workout.day] || 0;
                workoutDate.setDate(
                    workoutDate.getDate() + weekOffset + dayOffset,
                );

                // Format date as YYYY-MM-DD for all-day events (using local timezone)
                const year = workoutDate.getFullYear();
                const month = String(workoutDate.getMonth() + 1).padStart(
                    2,
                    "0",
                );
                const day = String(workoutDate.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Create event summary and description
                const summary =
                    workout.type === "Rest" || workout.type.includes("Rest")
                        ? `🏃 Rest Day`
                        : `🏃 ${workout.type}`;

                const description = [
                    `📅 Week ${week.weekNumber} - ${week.phase} Phase`,
                    ``,
                    `📏 Distance: ${workout.distance}`,
                    `💪 Intensity: ${workout.intensity}`,
                    ``,
                    `Generated by Meterun Training App`,
                ].join("\n");

                try {
                    await calendar.events.insert({
                        calendarId: "primary",
                        resource: {
                            summary: summary,
                            description: description,
                            start: { date: dateString },
                            end: { date: dateString },
                            colorId: workoutColors[workout.type] || "1",
                            reminders: {
                                useDefault: false,
                                overrides: [
                                    { method: "popup", minutes: 60 }, // 1 hour before
                                ],
                            },
                        },
                    });
                    eventsCreated++;
                } catch (eventError) {
                    console.error(
                        `Failed to create event for ${workout.day} Week ${week.weekNumber}:`,
                        eventError.message,
                    );
                    errors.push(
                        `Week ${week.weekNumber} ${workout.day}: ${eventError.message}`,
                    );
                }
            }
        }

        if (eventsCreated === 0 && errors.length > 0) {
            return res.status(500).json({
                message: "Failed to sync events to Google Calendar",
                errors: errors.slice(0, 5), // Return first 5 errors
            });
        }

        res.json({
            message: `Successfully synced ${eventsCreated} workouts to Google Calendar!`,
            eventsCreated,
            eventsSkipped,
            errors: errors.length > 0 ? errors.slice(0, 3) : undefined,
        });
    } catch (error) {
        console.error("Google Calendar Sync Error:", error);

        // Handle specific Google API errors
        if (error.code === 401 || error.message?.includes("invalid_grant")) {
            return res.status(401).json({
                message:
                    "Google Calendar authorization expired. Please reconnect in the Sync page.",
            });
        }

        res.status(500).json({
            message: "Failed to sync to Google Calendar",
            error: error.message,
        });
    }
};

// @desc    Update workout completion status
// @route   PATCH /api/plans/:id/workout
// @access  Private
const updateWorkoutStatus = async (req, res) => {
    try {
        const { weekNumber, dayIndex, completed } = req.body;
        const plan = await TrainingPlan.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        // Find the specific week
        const week = plan.schedule.find((w) => w.weekNumber === weekNumber);
        if (!week) {
            return res.status(404).json({ message: "Week not found" });
        }

        // Find the specific workout
        const workout = week.workouts[dayIndex];
        if (!workout) {
            return res.status(404).json({ message: "Workout not found" });
        }

        workout.completed = completed;
        await plan.save();

        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a training plan
// @route   DELETE /api/plans/:id
// @access  Private
const deletePlan = async (req, res) => {
    try {
        const plan = await TrainingPlan.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        await TrainingPlan.deleteOne({ _id: req.params.id });
        res.json({ message: "Plan deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export {
    createPlan,
    getPlans,
    syncPlanToGoogle,
    updateWorkoutStatus,
    deletePlan,
};
