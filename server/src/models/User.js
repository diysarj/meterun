import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        strava: {
            athleteId: String,
            accessToken: String,
            refreshToken: String,
            expiresAt: Number,
        },
        google: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Number,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function () {
    // Only hash password if it's been modified (or is new)
    if (!this.isModified("password")) {
        return; // Skip hashing if password wasn't changed
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

export default User;
