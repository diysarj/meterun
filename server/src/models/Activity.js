import mongoose from "mongoose";

const activitySchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        stravaId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        distance: {
            type: Number,
            required: true,
        },
        movingTime: {
            type: Number,
            required: true,
        },
        elapsedTime: {
            type: Number,
            required: true,
        },
        totalElevationGain: {
            type: Number,
        },
        type: {
            type: String,
        },
        startDate: {
            type: Date,
            required: true,
        },
        map: {
            summary_polyline: String,
        },
        averageSpeed: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
