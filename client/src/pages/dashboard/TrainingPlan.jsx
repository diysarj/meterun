import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
    Activity,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Dumbbell,
    Flag,
    Trophy,
    AlertCircle,
    RotateCcw,
    Loader2,
} from "lucide-react";
import googleCalendarIcon from "../../assets/google-calendar-icon.png";

const fetchPlans = async () => {
    const res = await fetch("/api/plans", { credentials: "include" });
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) throw new Error("Failed to fetch plans");
    return res.json();
};

const fetchSyncStatus = async () => {
    const res = await fetch("/api/auth/sync-status", {
        credentials: "include",
    });
    if (!res.ok) return { google: "disconnected" };
    return res.json();
};

export default function TrainingPlan() {
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        level: "beginner",
        distance: "5k",
        daysPerWeek: 3,
        raceDate: "",
        currentDistance: "",
        recentTime: "00:30:00",
        targetTime: "00:25:00",
    });
    const [error, setError] = useState(null);
    const [expandedWeek, setExpandedWeek] = useState(null);
    const [syncMessage, setSyncMessage] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    // --- Queries ---
    const { data: plans } = useQuery({
        queryKey: ["plans"],
        queryFn: fetchPlans,
    });

    const { data: syncStatusData } = useQuery({
        queryKey: ["sync-status"],
        queryFn: fetchSyncStatus,
    });

    const googleStatus = syncStatusData?.google ?? "loading";

    // Derive plan data from query result
    const {
        generatedPlan,
        planId,
        completedWorkouts: serverCompletedMap,
    } = useMemo(() => {
        if (!plans || plans.length === 0) {
            return { generatedPlan: null, planId: null, completedWorkouts: {} };
        }
        const serverPlan = plans[0];
        const schedule = serverPlan.schedule;
        const completedMap = {};
        schedule.forEach((week) => {
            week.workouts.forEach((workout, i) => {
                if (workout.completed) {
                    completedMap[`${week.weekNumber}-${i}`] = true;
                }
            });
        });
        return {
            generatedPlan: schedule,
            planId: serverPlan._id,
            completedWorkouts: completedMap,
        };
    }, [plans]);

    // Local optimistic state for completed workouts (overrides server state)
    const [optimisticOverrides, setOptimisticOverrides] = useState({});
    const completedWorkouts = { ...serverCompletedMap, ...optimisticOverrides };

    // Update form data when plan data is available
    useMemo(() => {
        if (plans && plans.length > 0) {
            const serverPlan = plans[0];
            setFormData((prev) => ({
                ...prev,
                distance: serverPlan.targetRace || prev.distance,
                level: serverPlan.level || prev.level,
                raceDate: serverPlan.targetDate
                    ? new Date(serverPlan.targetDate)
                          .toISOString()
                          .split("T")[0]
                    : prev.raceDate,
            }));
        }
    }, [plans]);

    // --- Mutations ---
    const generateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch("/api/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok)
                throw new Error(result.message || "Failed to generate plan");
            if (!result.schedule)
                throw new Error("Invalid plan data received from server");
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            setExpandedWeek(1);
            setOptimisticOverrides({});
            setError(null);
        },
        onError: (err) => setError(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/plans/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete plan");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            setOptimisticOverrides({});
            setFormData((prev) => ({ ...prev, raceDate: "" }));
            setShowResetModal(false);
        },
        onError: (err) => {
            setError(err.message);
            setShowResetModal(false);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ planId, weekNumber, dayIndex, completed }) => {
            await fetch(`/api/plans/${planId}/workout`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ weekNumber, dayIndex, completed }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
        },
    });

    const handleGenerate = async () => {
        setError(null);
        if (!formData.raceDate) {
            setError("Please select a race date.");
            return;
        }
        generateMutation.mutate({
            distance: formData.distance,
            raceDate: formData.raceDate,
            level: formData.level,
            currentDistance: formData.currentDistance,
            recentTime: formData.recentTime,
            targetTime: formData.targetTime,
        });
    };

    const handleReset = () => setShowResetModal(true);

    const confirmReset = () => {
        if (planId) {
            deleteMutation.mutate(planId);
        } else {
            setShowResetModal(false);
        }
    };

    const toggleWeek = (weekNum) => {
        setExpandedWeek(expandedWeek === weekNum ? null : weekNum);
    };

    const toggleWorkout = (weekNum, dayIndex) => {
        const key = `${weekNum}-${dayIndex}`;
        const newStatus = !completedWorkouts[key];

        // Optimistic update
        setOptimisticOverrides((prev) => ({ ...prev, [key]: newStatus }));

        if (planId) {
            toggleMutation.mutate(
                { planId, weekNumber: weekNum, dayIndex, completed: newStatus },
                {
                    onError: () => {
                        // Revert on error
                        setOptimisticOverrides((prev) => ({
                            ...prev,
                            [key]: !newStatus,
                        }));
                    },
                },
            );
        }
    };

    const handleSyncToGoogle = async () => {
        if (googleStatus !== "connected") {
            setSyncMessage({
                type: "error",
                text: "Please connect Google Calendar first in the Sync page.",
            });
            setTimeout(() => setSyncMessage(null), 4000);
            return;
        }

        setSyncMessage(null);
        setSyncing(true);

        try {
            if (!plans || plans.length === 0) {
                throw new Error(
                    "No saved plan found. Please regenerate your plan.",
                );
            }

            const latestPlan = plans[0];
            const res = await fetch(
                `/api/plans/${latestPlan._id}/sync-google`,
                {
                    method: "POST",
                    credentials: "include",
                },
            );
            const data = await res.json();

            if (res.ok) {
                setSyncMessage({
                    type: "success",
                    text: data.message || "Plan synced to Google Calendar!",
                });
            } else {
                throw new Error(data.message || "Failed to sync to calendar");
            }
        } catch (err) {
            setSyncMessage({ type: "error", text: err.message });
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    // Calculate Progress
    const totalWorkouts = generatedPlan ? generatedPlan.length * 7 : 0;
    const completedCount =
        Object.values(completedWorkouts).filter(Boolean).length;
    const progress =
        totalWorkouts > 0
            ? Math.round((completedCount / totalWorkouts) * 100)
            : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        My Plan
                    </h1>
                    <p className="text-white/60">
                        {generatedPlan
                            ? `Training for ${formData.distance.toUpperCase()}`
                            : "Generate a personalized training schedule."}
                    </p>
                </div>
                {generatedPlan && (
                    <div className="flex items-center gap-2">
                        {/* Sync to Google Calendar Button */}
                        <button
                            onClick={handleSyncToGoogle}
                            disabled={syncing}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                googleStatus === "connected"
                                    ? "bg-gradient-to-r from-blue-500/20 to-green-500/20 hover:from-blue-500/30 hover:to-green-500/30 text-white border border-blue-500/30"
                                    : "bg-white/5 hover:bg-white/10 text-white/50 border border-white/10"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={
                                googleStatus === "connected"
                                    ? "Sync plan to Google Calendar"
                                    : "Connect Google Calendar first in Sync page"
                            }
                        >
                            {syncing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <img
                                    src={googleCalendarIcon}
                                    alt="Google Calendar"
                                    className="w-5 h-5"
                                />
                            )}
                            <span className="hidden sm:inline">
                                {syncing ? "Syncing..." : "Sync to Calendar"}
                            </span>
                        </button>

                        {/* Reset Plan Button */}
                        <button
                            onClick={handleReset}
                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"
                            title="Reset Plan"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Sync Message */}
            {syncMessage && (
                <div
                    className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                        syncMessage.type === "error"
                            ? "bg-red-500/10 border-red-500/30 text-red-300"
                            : "bg-green-500/10 border-green-500/30 text-green-300"
                    }`}
                >
                    {syncMessage.type === "error" ? (
                        <AlertCircle size={20} />
                    ) : (
                        <CheckCircle2 size={20} />
                    )}
                    <span>{syncMessage.text}</span>
                </div>
            )}

            {/* Progress Bar */}
            {generatedPlan && (
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between text-sm text-white/80 font-medium">
                        <span>Overall Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-white/40 text-center">
                        {completedCount} of {totalWorkouts} sessions completed
                    </p>
                </div>
            )}

            {!generatedPlan ? (
                <div className="glass p-8 rounded-2xl border border-white/5 bg-black/20">
                    <div className="space-y-8">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Level Selection */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Dumbbell
                                    className="text-purple-400"
                                    size={24}
                                />
                                Current Fitness Level
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {["Beginner", "Intermediate", "Advanced"].map(
                                    (level) => (
                                        <button
                                            key={level}
                                            onClick={() =>
                                                setFormData({
                                                    ...formData,
                                                    level: level.toLowerCase(),
                                                })
                                            }
                                            className={`p-4 rounded-xl border text-left transition-all ${
                                                formData.level ===
                                                level.toLowerCase()
                                                    ? "bg-purple-500/20 border-purple-500 text-white"
                                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                            }`}
                                        >
                                            <span className="font-bold block mb-1">
                                                {level}
                                            </span>
                                            <span className="text-xs opacity-70">
                                                {level === "Beginner" &&
                                                    "I run occasionally"}
                                                {level === "Intermediate" &&
                                                    "I run 10-20km/week"}
                                                {level === "Advanced" &&
                                                    "I run 30+km/week"}
                                            </span>
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* Current Stats */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Activity
                                    className="text-orange-400"
                                    size={24}
                                />
                                Current Stats
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-white/60 ml-1">
                                        Recent Distance (km)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 5"
                                        value={formData.currentDistance}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                currentDistance: e.target.value,
                                            })
                                        }
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-white/60 ml-1">
                                        Recent Time (hh:mm:ss)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="00:30:00"
                                        value={formData.recentTime}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                recentTime: e.target.value,
                                            })
                                        }
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-white/60 ml-1">
                                        Target Time (hh:mm:ss)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="00:25:00"
                                        value={formData.targetTime}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                targetTime: e.target.value,
                                            })
                                        }
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Goal Distance */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Flag className="text-purple-400" size={24} />
                                Target Distance
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {["5K", "10K", "Half Marathon", "Marathon"].map(
                                    (dist) => (
                                        <button
                                            key={dist}
                                            onClick={() =>
                                                setFormData({
                                                    ...formData,
                                                    distance:
                                                        dist.toLowerCase(),
                                                })
                                            }
                                            className={`p-4 rounded-xl border text-center transition-all ${
                                                formData.distance ===
                                                dist.toLowerCase()
                                                    ? "bg-purple-500/20 border-purple-500 text-white"
                                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                            }`}
                                        >
                                            <span className="font-bold">
                                                {dist}
                                            </span>
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* Race Date Input */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <CalendarIcon
                                    className="text-emerald-400"
                                    size={24}
                                />
                                Race Date
                            </h3>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={formData.raceDate}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            raceDate: e.target.value,
                                        })
                                    }
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleGenerate}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold text-lg shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trophy size={20} />
                                Generate Plan
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 gap-4">
                        {generatedPlan.map((weekData) => (
                            <div
                                key={weekData.weekNumber}
                                className={`glass rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    expandedWeek === weekData.weekNumber
                                        ? "border-primary/30 bg-white/5"
                                        : "border-white/5 hover:border-white/10"
                                }`}
                            >
                                <button
                                    onClick={() =>
                                        toggleWeek(weekData.weekNumber)
                                    }
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                expandedWeek ===
                                                weekData.weekNumber
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-white/10 text-white/40"
                                            }`}
                                        >
                                            {weekData.weekNumber}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-white">
                                                Week {weekData.weekNumber}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded text-white/70 font-medium ${
                                                        weekData.phase ===
                                                        "Peak"
                                                            ? "bg-purple-500/20 text-purple-200"
                                                            : weekData.phase ===
                                                                "Taper"
                                                              ? "bg-emerald-500/20 text-emerald-200"
                                                              : "bg-white/10"
                                                    }`}
                                                >
                                                    {weekData.phase} Phase
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {expandedWeek === weekData.weekNumber ? (
                                        <ChevronUp className="text-white/40" />
                                    ) : (
                                        <ChevronDown className="text-white/40" />
                                    )}
                                </button>

                                {expandedWeek === weekData.weekNumber && (
                                    <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-2">
                                        {weekData.workouts.map((workout, i) => {
                                            const isDone =
                                                completedWorkouts[
                                                    `${weekData.weekNumber}-${i}`
                                                ];
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors group ${
                                                        isDone
                                                            ? "bg-emerald-500/10"
                                                            : "hover:bg-white/5"
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            toggleWorkout(
                                                                weekData.weekNumber,
                                                                i,
                                                            )
                                                        }
                                                        className={`p-2 rounded-full transition-all ${
                                                            isDone
                                                                ? "bg-emerald-500 text-white"
                                                                : "bg-white/10 text-white/20 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/20 group-hover:text-emerald-500"
                                                        }`}
                                                    >
                                                        <CheckCircle2
                                                            size={20}
                                                        />
                                                    </button>

                                                    <div className="w-24 text-sm font-medium text-white/40">
                                                        {workout.day}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div
                                                            className={`font-medium transition-colors flex items-center gap-2 ${
                                                                isDone
                                                                    ? "text-emerald-200 line-through decoration-emerald-500/50"
                                                                    : "text-white"
                                                            }`}
                                                        >
                                                            {workout.type}
                                                        </div>
                                                        <div
                                                            className={`text-xs ${
                                                                isDone
                                                                    ? "text-emerald-200/50"
                                                                    : "text-white/50"
                                                            }`}
                                                        >
                                                            {workout.distance} •{" "}
                                                            {workout.intensity}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white text-center mb-3">
                            Reset Progress?
                        </h3>
                        <p className="text-white/60 text-center text-sm mb-6">
                            This will delete your current plan and history. This
                            action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReset}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
                            >
                                Yes, Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
