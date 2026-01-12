import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export default function AnalyticsCharts() {
    const [progressData, setProgressData] = useState([]);
    const [comparisonData, setComparisonData] = useState([]);
    const [hasPlan, setHasPlan] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                let plan = null;
                let completedMap = {};

                // Fetch from API FIRST (server is the source of truth)
                const res = await fetch("/api/plans", {
                    credentials: "include",
                });

                if (res.ok) {
                    const plans = await res.json();
                    if (plans.length > 0) {
                        const serverPlan = plans[0];
                        plan = serverPlan.schedule;

                        // Rebuild completedMap from server
                        completedMap = {};
                        plan.forEach((week) => {
                            week.workouts.forEach((workout, i) => {
                                if (workout.completed) {
                                    completedMap[
                                        `${week.weekNumber}-${i}`
                                    ] = true;
                                }
                            });
                        });

                        // Update LS with server data
                        localStorage.setItem(
                            "meterun_training_plan",
                            JSON.stringify(plan)
                        );
                        localStorage.setItem(
                            "meterun_plan_progress",
                            JSON.stringify(completedMap)
                        );
                    } else {
                        // User is authenticated but has no plans on the server
                        // Clear any localStorage data that might be from a different user
                        console.log(
                            "User has no plans on server. Clearing localStorage."
                        );
                        localStorage.removeItem("meterun_training_plan");
                        localStorage.removeItem("meterun_plan_progress");
                        setHasPlan(false);
                        return; // Exit early - no plan to display
                    }
                } else if (res.status === 401) {
                    // Unauthenticated - don't show any plan data
                    localStorage.removeItem("meterun_training_plan");
                    localStorage.removeItem("meterun_plan_progress");
                    setHasPlan(false);
                    return;
                }

                if (plan) {
                    // Prepare Chart Data
                    const progress = [];
                    const comparison = [];

                    plan.forEach((week) => {
                        let totalWorkouts = 0;
                        let completedWorkouts = 0;
                        let plannedDist = 0;
                        let actualDist = 0;

                        week.workouts.forEach((workout, i) => {
                            const key = `${week.weekNumber}-${i}`;
                            const isCompleted = !!completedMap[key];

                            // Progress Count
                            if (workout.type !== "Rest") {
                                totalWorkouts++;
                                if (isCompleted) completedWorkouts++;
                            }

                            // Distance Calc
                            if (
                                workout.distance &&
                                workout.distance.includes("km")
                            ) {
                                const dist = parseFloat(workout.distance) || 0;
                                plannedDist += dist;
                                if (isCompleted) actualDist += dist;
                            }
                        });

                        const completionRate =
                            totalWorkouts > 0
                                ? Math.round(
                                      (completedWorkouts / totalWorkouts) * 100
                                  )
                                : 0;

                        progress.push({
                            name: `Week ${week.weekNumber}`,
                            progress: completionRate,
                        });

                        comparison.push({
                            name: `Week ${week.weekNumber}`,
                            planned: Math.round(plannedDist * 10) / 10,
                            implemented: Math.round(actualDist * 10) / 10,
                        });
                    });

                    setProgressData(progress);
                    setComparisonData(comparison);
                    setHasPlan(true);
                }
            } catch (err) {
                console.error("Error loading analytics:", err);
            }
        };

        loadData();
    }, []);

    if (!hasPlan) {
        return (
            <div className="glass p-8 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
                <div className="p-4 bg-white/5 rounded-full text-white/50">
                    <Activity size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        No Analytics Available
                    </h3>
                    <p className="text-white/50 max-w-md mx-auto">
                        Start a training plan to see your performance analytics
                        here.
                    </p>
                </div>
                <Link
                    to="/dashboard/my-plan"
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                    Create Plan
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    Performance Analytics
                </h2>
                <p className="text-white/50">Track your progress vs plan.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart - Weekly Progress */}
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-semibold mb-6">
                        Weekly Completion Rate
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={progressData}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                    opacity={0.4}
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{
                                        fill: "hsl(var(--muted-foreground))",
                                    }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{
                                        fill: "hsl(var(--muted-foreground))",
                                    }}
                                    tickFormatter={(value) => `${value}%`}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        color: "hsl(var(--popover-foreground))",
                                    }}
                                    itemStyle={{ color: "hsl(var(--primary))" }}
                                    formatter={(value) => [
                                        `${value}%`,
                                        "Completion",
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="progress"
                                    stroke="hsl(var(--chart-1))"
                                    strokeWidth={3}
                                    dot={{
                                        r: 6,
                                        fill: "hsl(var(--chart-1))",
                                        strokeWidth: 2,
                                        stroke: "hsl(var(--background))",
                                    }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart - Planned vs Implemented */}
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-semibold mb-6">
                        Distance: Planned vs Implemented
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={comparisonData}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                    vertical={false}
                                    opacity={0.4}
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{
                                        fill: "hsl(var(--muted-foreground))",
                                    }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{
                                        fill: "hsl(var(--muted-foreground))",
                                    }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        color: "hsl(var(--popover-foreground))",
                                    }}
                                    itemStyle={{
                                        color: "hsl(var(--foreground))",
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                                <Bar
                                    dataKey="planned"
                                    name="Planned (km)"
                                    fill="hsl(270, 50%, 60%)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="implemented"
                                    name="Implemented (km)"
                                    fill="hsl(var(--chart-1))"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
