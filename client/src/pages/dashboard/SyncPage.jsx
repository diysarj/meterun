import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import stravaIcon from "../../assets/strava-icon.png";
import googleCalendarIcon from "../../assets/google-calendar-icon.png";

export default function SyncPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [stravaStatus, setStravaStatus] = useState("loading");
    const [googleStatus, setGoogleStatus] = useState("loading");
    const [loading, setLoading] = useState({ strava: false, google: false });
    const [message, setMessage] = useState(null);
    const processingRef = useRef(false); // Prevent double processing

    const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || "";
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

    // Fetch sync status on mount
    useEffect(() => {
        const fetchSyncStatus = async () => {
            try {
                const res = await fetch("/api/auth/sync-status", {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json();
                    setStravaStatus(data.strava);
                    setGoogleStatus(data.google);
                } else {
                    setStravaStatus("disconnected");
                    setGoogleStatus("disconnected");
                }
            } catch (error) {
                console.error("Failed to fetch sync status:", error);
                setStravaStatus("disconnected");
                setGoogleStatus("disconnected");
                setMessage({
                    type: "error",
                    text: `Sync Check Failed: ${
                        error.message || "Unknown error"
                    }`,
                });
            }
        };

        fetchSyncStatus();
    }, []);

    // Handle OAuth callback
    useEffect(() => {
        const code = searchParams.get("code");
        const scope = searchParams.get("scope");
        const error = searchParams.get("error");

        if (error) {
            setMessage({
                type: "error",
                text: `Authorization failed: ${error}`,
            });
            setSearchParams({});
            return;
        }

        // Prevent double processing (React Strict Mode causes double render)
        if (code && !processingRef.current) {
            processingRef.current = true;

            // Clear URL params FIRST to prevent re-triggering
            setSearchParams({});

            // Determine if it's Google or Strava based on scope
            if (scope && scope.includes("calendar")) {
                handleGoogleCallback(code);
            } else if (scope && scope.includes("activity")) {
                handleStravaCallback(code);
            } else {
                // Try Google first (most common)
                handleGoogleCallback(code);
            }
        }
    }, [searchParams]);

    const handleGoogleCallback = async (code) => {
        setLoading((prev) => ({ ...prev, google: true }));
        setMessage({ type: "info", text: "Connecting to Google Calendar..." });

        try {
            const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ code }),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error("Failed to parse JSON response:", text);
                throw new Error("Server returned invalid response");
            }

            if (res.ok) {
                setGoogleStatus("connected");
                setMessage({
                    type: "success",
                    text: "Google Calendar connected successfully!",
                });
            } else if (res.status === 401) {
                throw new Error(
                    "Session expired. Please sign out and log in again, then retry."
                );
            } else {
                throw new Error(data.message || "Failed to connect");
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading((prev) => ({ ...prev, google: false }));
        }
    };

    const handleStravaCallback = async (code) => {
        setLoading((prev) => ({ ...prev, strava: true }));
        setMessage({ type: "info", text: "Connecting to Strava..." });

        const redirectUri = `${window.location.origin}/dashboard/sync`;

        try {
            const res = await fetch("/api/auth/strava", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ code, redirectUri }),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error("Failed to parse JSON response:", text);
                throw new Error("Server returned invalid response");
            }

            if (res.ok) {
                setStravaStatus("connected");
                setMessage({
                    type: "success",
                    text: "Strava connected successfully!",
                });
            } else {
                throw new Error(data.message || "Failed to connect");
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading((prev) => ({ ...prev, strava: false }));
        }
    };

    const handleConnectStrava = () => {
        if (!STRAVA_CLIENT_ID || STRAVA_CLIENT_ID === "your_strava_client_id") {
            setMessage({
                type: "error",
                text: "Strava Client ID not properly configured in .env",
            });
            return;
        }

        const redirectUri = `${window.location.origin}/dashboard/sync`;
        const scope = "read,activity:read_all";
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

        window.location.href = authUrl;
    };

    const handleConnectGoogle = () => {
        if (
            !GOOGLE_CLIENT_ID ||
            GOOGLE_CLIENT_ID.includes("your_google_client_id")
        ) {
            setMessage({
                type: "error",
                text: "Google Client ID not properly configured in .env",
            });
            return;
        }

        const redirectUri = `${window.location.origin}/dashboard/sync`;
        const scope = "https://www.googleapis.com/auth/calendar.events";
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

        window.location.href = authUrl;
    };

    const handleDisconnectStrava = async () => {
        if (!window.confirm("Are you sure you want to disconnect Strava?"))
            return;

        setLoading((prev) => ({ ...prev, strava: true }));
        try {
            const res = await fetch("/api/auth/disconnect/strava", {
                method: "POST",
            });
            if (res.ok) {
                setStravaStatus("disconnected");
                setMessage({ type: "success", text: "Strava disconnected" });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: "error", text: "Failed to disconnect" });
        } finally {
            setLoading((prev) => ({ ...prev, strava: false }));
        }
    };

    const handleDisconnectGoogle = async () => {
        if (
            !window.confirm(
                "Are you sure you want to disconnect Google Calendar?"
            )
        )
            return;

        setLoading((prev) => ({ ...prev, google: true }));
        try {
            const res = await fetch("/api/auth/disconnect/google", {
                method: "POST",
            });
            if (res.ok) {
                setGoogleStatus("disconnected");
                setMessage({
                    type: "success",
                    text: "Google Calendar disconnected",
                });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: "error", text: "Failed to disconnect" });
        } finally {
            setLoading((prev) => ({ ...prev, google: false }));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                        Sync Integrations
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Connect your accounts to sync training data
                        automatically.
                    </p>
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div
                    className={`p-4 rounded-xl border ${
                        message.type === "error"
                            ? "bg-red-500/10 border-red-500/30 text-red-300"
                            : message.type === "success"
                            ? "bg-green-500/10 border-green-500/30 text-green-300"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Strava Card */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={stravaIcon}
                            alt="Strava"
                            className="w-12 h-12 rounded-xl"
                        />
                        <div>
                            <h3 className="text-xl font-semibold">Strava</h3>
                            <p className="text-sm text-muted-foreground">
                                Sync your runs automatically
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                stravaStatus === "connected"
                                    ? "bg-green-500"
                                    : "bg-yellow-500"
                            }`}
                        ></span>
                        <span className="text-muted-foreground capitalize">
                            {stravaStatus}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleConnectStrava}
                            disabled={loading.strava}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                stravaStatus === "connected"
                                    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                    : "bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white shadow-lg shadow-[#FC4C02]/20"
                            }`}
                        >
                            {loading.strava
                                ? "Processing..."
                                : stravaStatus === "connected"
                                ? "Reconnect"
                                : "Connect Strava"}
                        </button>

                        {stravaStatus === "connected" && (
                            <button
                                onClick={handleDisconnectStrava}
                                disabled={loading.strava}
                                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-all"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>

                {/* Google Calendar Card */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={googleCalendarIcon}
                            alt="Google Calendar"
                            className="w-12 h-12 rounded-xl"
                        />
                        <div>
                            <h3 className="text-xl font-semibold">
                                Google Calendar
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Add training plan to your calendar
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                googleStatus === "connected"
                                    ? "bg-green-500"
                                    : "bg-yellow-500"
                            }`}
                        ></span>
                        <span className="text-muted-foreground capitalize">
                            {googleStatus}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleConnectGoogle}
                            disabled={loading.google}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                googleStatus === "connected"
                                    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                    : "bg-background hover:bg-accent border border-border text-foreground"
                            }`}
                        >
                            {loading.google
                                ? "Processing..."
                                : googleStatus === "connected"
                                ? "Reconnect"
                                : "Connect Calendar"}
                        </button>

                        {googleStatus === "connected" && (
                            <button
                                onClick={handleDisconnectGoogle}
                                disabled={loading.google}
                                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-all"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="glass p-6 rounded-2xl border border-white/10">
                <h3 className="text-lg font-semibold mb-3">How it works</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>
                            <strong>Strava:</strong> Automatically imports your
                            completed runs to track progress against your
                            training plan.
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>
                            <strong>Google Calendar:</strong> Syncs your
                            upcoming training sessions so you never miss a
                            workout.
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
