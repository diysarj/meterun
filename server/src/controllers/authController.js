import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import axios from "axios";
import mongoose from "mongoose";
import { google } from "googleapis";

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.error(
                "Database not connected. State:",
                mongoose.connection.readyState
            );
            return res.status(503).json({ message: "Database not ready" });
        }

        if (!req.body) {
            return res.status(400).json({ message: "Request body is missing" });
        }

        const { email, password } = req.body;
        console.log("Login attempt for:", email);

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Please provide both email and password" });
        }

        const user = await User.findOne({ email });
        console.log("User found:", user ? "Yes" : "No");

        // If user not found, return 401 immediately
        if (!user) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (isMatch) {
            console.log("Password match. Generating token...");
            try {
                generateToken(res, user._id);
            } catch (tokenErr) {
                console.error("Token generation failed:", tokenErr);
                return res
                    .status(500)
                    .json({ message: "Token generation failed" });
            }

            console.log("Token generated. Sending response.");
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
            });
        } else {
            console.log("Invalid password");
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }
    } catch (error) {
        console.error("Login critical error:", error);
        // Ensure we send JSON
        return res.status(500).json({
            message: "Server error during login",
            error: error.message || "Unknown error",
        });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: "User already exists" });
        return;
    }

    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        generateToken(res, user._id);
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
        });
    } else {
        res.status(400).json({ message: "Invalid user data" });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Connect Strava Account
// @route   POST /api/auth/strava
// @access  Private
const connectStrava = async (req, res) => {
    const { code, redirectUri } = req.body;

    if (!code) {
        return res.status(400).json({ message: "Authorization code missing" });
    }

    try {
        const response = await axios.post(
            "https://www.strava.com/oauth/token",
            {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri, // Strava requires this to match the auth request
            }
        );

        const { access_token, refresh_token, expires_at, athlete } =
            response.data;

        const user = await User.findById(req.user._id);
        if (user) {
            user.strava = {
                athleteId: athlete.id,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: expires_at,
            };
            await user.save();
            res.json({ message: "Strava connected", strava: user.strava });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            message: "Failed to connect Strava",
            error: error.response?.data || error.message,
        });
    }
};

// @desc    Connect Google Account
// @route   POST /api/auth/google
// @access  Private
const connectGoogle = async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: "Authorization code missing" });
    }

    try {
        const redirectUri =
            process.env.GOOGLE_REDIRECT_URI ||
            "http://localhost:5173/dashboard/sync";

        console.log("=== Google OAuth Debug ===");
        console.log("Redirect URI:", redirectUri);
        console.log("Code received:", code?.substring(0, 30) + "...");

        // Use axios directly instead of googleapis library
        const tokenResponse = await axios.post(
            "https://oauth2.googleapis.com/token",
            {
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }
        );

        const tokens = tokenResponse.data;
        console.log("Tokens received successfully!");

        const user = await User.findById(req.user._id);
        if (user) {
            user.google = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
            };
            await user.save();
            res.json({ message: "Google connected" });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("=== Google OAuth ERROR ===");
        console.error("Error message:", error.message);
        console.error("Error details:", error.response?.data || error);
        res.status(400).json({
            message: "Failed to connect Google",
            error: error.response?.data?.error || error.message,
            details: error.response?.data?.error_description || null,
        });
    }
};

// @desc    Get user's sync status
// @route   GET /api/auth/sync-status
// @access  Private
const getSyncStatus = async (req, res) => {
    try {
        // req.user is already populated by protect middleware
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }

        console.log("Sync Status User Check:", req.user._id);
        // Debug logs to check structure
        // console.log("Strava Object:", req.user.strava);
        // console.log("Google Object:", req.user.google);

        // Safe checks
        const stravaConnected =
            req.user.strava && req.user.strava.accessToken
                ? "connected"
                : "disconnected";
        const googleConnected =
            req.user.google && req.user.google.accessToken
                ? "connected"
                : "disconnected";

        res.json({
            strava: stravaConnected,
            google: googleConnected,
        });
    } catch (error) {
        console.error("Error in getSyncStatus:", error);
        res.status(500).json({
            message: "Failed to get sync status",
            error: error.message,
        });
    }
};

// @desc    Disconnect Strava Account
// @route   POST /api/auth/disconnect/strava
// @access  Private
const disconnectStrava = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { $unset: { strava: 1 } });
        res.json({ message: "Strava disconnected" });
    } catch (error) {
        console.error("Disconnect Strava error:", error);
        res.status(500).json({ message: "Failed to disconnect Strava" });
    }
};

// @desc    Disconnect Google Account
// @route   POST /api/auth/disconnect/google
// @access  Private
const disconnectGoogle = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { $unset: { google: 1 } });
        res.json({ message: "Google disconnected" });
    } catch (error) {
        console.error("Disconnect Google error:", error);
        res.status(500).json({ message: "Failed to disconnect Google" });
    }
};

export {
    authUser,
    registerUser,
    logoutUser,
    connectStrava,
    connectGoogle,
    getSyncStatus,
    disconnectStrava,
    disconnectGoogle,
};
