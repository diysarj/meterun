import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema({
    day: String,
    type: String,
    distance: String,
    intensity: String,
    completed: { type: Boolean, default: false },
});

const weekSchema = new mongoose.Schema({
    weekNumber: Number,
    phase: String,
    workouts: [workoutSchema],
});

const trainingPlanSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        title: { type: String, default: "My Training Plan" },
        targetRace: String,
        targetDate: Date,
        level: String,
        startDate: { type: Date, default: Date.now },
        schedule: [weekSchema],
    },
    {
        timestamps: true,
    }
);

const TrainingPlan = mongoose.model("TrainingPlan", trainingPlanSchema);

export default TrainingPlan;
