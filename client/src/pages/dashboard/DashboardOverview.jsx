import { Activity, Clock, Map, TrendingUp, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlanStats } from "@/lib/utils";

export default function DashboardOverview() {
    const [stats, setStats] = useState({
        totalDist: 0,
        activeHours: "0h 0m",
        avgPace: "0'00\" /km",
        runsThisWeek: 0,
    });
    const [hasPlan, setHasPlan] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                // Fetch from API FIRST (server is the source of truth for authenticated users)
                const res = await fetch("/api/plans", {
                    credentials: "include",
                });

                if (res.ok) {
                    const plans = await res.json();
                    if (plans.length > 0) {
                        const serverPlan = plans[0];
                        const schedule = serverPlan.schedule;

                        // Build completedMap from server plan
                        const completedMap = {};
                        schedule.forEach((week) => {
                            week.workouts.forEach((workout, i) => {
                                if (workout.completed) {
                                    completedMap[
                                        `${week.weekNumber}-${i}`
                                    ] = true;
                                }
                            });
                        });

                        // Update Local Storage with server data
                        localStorage.setItem(
                            "meterun_training_plan",
                            JSON.stringify(schedule)
                        );
                        localStorage.setItem(
                            "meterun_plan_progress",
                            JSON.stringify(completedMap)
                        );

                        // Calculate stats from server plan
                        const calculated = getPlanStats(schedule, completedMap);
                        if (calculated) {
                            setStats(calculated);
                            setHasPlan(true);
                        }
                    } else {
                        // User is authenticated but has no plans on the server
                        // Clear any localStorage data that might be from a different user
                        console.log(
                            "User has no plans on server. Clearing localStorage."
                        );
                        localStorage.removeItem("meterun_training_plan");
                        localStorage.removeItem("meterun_plan_progress");
                        setHasPlan(false);
                    }
                } else if (res.status === 401) {
                    // Unauthenticated - don't show any plan data
                    localStorage.removeItem("meterun_training_plan");
                    localStorage.removeItem("meterun_plan_progress");
                    setHasPlan(false);
                }
            } catch (error) {
                console.error("Failed to load plan stats:", error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    const statItems = [
        {
            label: "Total Distance",
            value: `${stats.totalDist} km`,
            icon: Map,
            color: "text-chart-1",
        },
        {
            label: "Active Hours",
            value: stats.activeHours,
            icon: Clock,
            color: "text-chart-2",
        },
        {
            label: "Avg Pace",
            value: stats.avgPace,
            icon: Activity,
            color: "text-chart-3",
        },
        {
            label: "Runs This Week",
            value: stats.runsThisWeek,
            icon: TrendingUp,
            color: "text-chart-4",
        },
    ];

    if (loading) return null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    Welcome back, Runner
                </h1>
                <p className="text-white/50">
                    {hasPlan
                        ? "Here's your training progress summary."
                        : "Start your journey by creating a training plan."}
                </p>
            </div>

            {!hasPlan ? (
                <div className="glass p-8 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-white/5 rounded-full text-white/50">
                        <Activity size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            No Active Training Plan
                        </h3>
                        <p className="text-white/50 max-w-md mx-auto">
                            Generate a personalized running schedule to track
                            your progress and hit your goals.
                        </p>
                    </div>
                    <Link
                        to="/dashboard/my-plan"
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                    >
                        Create Plan
                    </Link>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statItems.map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={i}
                                    className="glass p-6 rounded-2xl border border-white/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`p-3 rounded-xl bg-white/5 ${stat.color}`}
                                        >
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-white/50">
                                                {stat.label}
                                            </p>
                                            <p className="text-xl font-bold">
                                                {stat.value}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Quick Action / Status */}
                        <Link
                            to="/dashboard/my-plan"
                            className="glass p-6 rounded-2xl border border-white/5 h-[300px] flex flex-col items-center justify-center gap-4 group hover:bg-white/5 transition-colors"
                        >
                            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                <Activity size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    View Current Plan
                                </h3>
                                <p className="text-white/40 text-sm">
                                    Check today's workout
                                </p>
                            </div>
                        </Link>

                        {/* Link to Analytics */}
                        <Link
                            to="/dashboard/analytics"
                            className="glass p-6 rounded-2xl border border-white/5 h-[300px] flex flex-col items-center justify-center gap-4 group hover:bg-white/5 transition-colors"
                        >
                            <div className="p-4 rounded-full bg-chart-1/10 text-chart-1 group-hover:scale-110 transition-transform">
                                <TrendingUp size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    Full Analytics
                                </h3>
                                <p className="text-white/40 text-sm">
                                    Detailed progress charts
                                </p>
                            </div>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
