import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function parseDuration(distStr, intensityStr) {
    if (!distStr || distStr === "-") return 0;

    // specific case for minutes
    if (distStr.includes("mins")) {
        const mins = parseFloat(distStr);
        return isNaN(mins) ? 0 : mins / 60;
    }

    // specific case for km
    if (distStr.includes("km")) {
        const km = parseFloat(distStr);
        if (isNaN(km)) return 0;

        // Try to find pace in intensity string (e.g., "@ 5:30/km")
        const paceMatch = intensityStr.match(/@ (\d+):(\d+)\/km/);
        if (paceMatch) {
            const min = parseInt(paceMatch[1]);
            const sec = parseInt(paceMatch[2]);
            const paceInSeconds = min * 60 + sec;
            return (km * paceInSeconds) / 3600;
        }

        // Default fallback if no pace found (e.g. 6 mins/km or 10km/h)
        return km * (6 / 60);
    }

    return 0;
}

export function getPlanStats(plan, completedMap) {
    if (!plan || !Array.isArray(plan)) return null;

    let totalDist = 0;
    let activeHours = 0;
    let completedRuns = 0; // "Runs This Week" context slightly different, but total completed runs could be useful.
    let currentWeekRuns = 0;

    // To find "runs this week", we need to know "current week".
    // We can estimate "current week" by finding the first week with incomplete workouts?
    // Or just check if today matches the schedule? The schedule doesn't have absolute dates, just day names and "Week 1".
    // We'll approximate "current week" as the first week that is not fully completed.

    let currentWeekNum = 1;
    for (const week of plan) {
        let weekComplete = true;
        let weekHasRuns = false;

        // check week completion
        week.workouts.forEach((w, i) => {
            const key = `${week.weekNumber}-${i}`;
            if (!completedMap[key]) {
                weekComplete = false;
            }
        });

        if (!weekComplete) {
            currentWeekNum = week.weekNumber;
            break;
        }
        // If loop finishes and all are complete, currentWeekNum stays at last checked or we handle it after loop.
        currentWeekNum = week.weekNumber; // tentative, will stick if last iteration.
    }

    // Recalculate explicitly for current week
    // Actually, finding the *first* incomplete week is a good proxy for "Current Week".
    let firstIncompleteWeek = plan.find((w) => {
        return w.workouts.some((_, i) => !completedMap[`${w.weekNumber}-${i}`]);
    });

    // If all completed, stick to last week
    currentWeekNum = firstIncompleteWeek
        ? firstIncompleteWeek.weekNumber
        : plan.length;

    // Now calculate stats
    let plannedRunsThisWeek = 0; // Total planned runs in current week

    plan.forEach((week) => {
        week.workouts.forEach((workout, index) => {
            const key = `${week.weekNumber}-${index}`;
            const isCompleted = !!completedMap[key];

            // Count planned runs for current week (regardless of completion)
            if (week.weekNumber === currentWeekNum) {
                const type = workout.type.toLowerCase();
                if (
                    type.includes("run") ||
                    type.includes("interval") ||
                    type.includes("tempo") ||
                    type.includes("fartlek")
                ) {
                    plannedRunsThisWeek++;
                }
            }

            // Only count completed work for distance/hours
            if (isCompleted) {
                if (workout.distance && workout.distance.includes("km")) {
                    totalDist += parseFloat(workout.distance) || 0;
                }
                activeHours += parseDuration(
                    workout.distance,
                    workout.intensity
                );

                // Count completed runs
                const type = workout.type.toLowerCase();
                if (
                    type.includes("run") ||
                    type.includes("interval") ||
                    type.includes("tempo") ||
                    type.includes("fartlek")
                ) {
                    completedRuns++;
                    if (week.weekNumber === currentWeekNum) {
                        currentWeekRuns++;
                    }
                }
            }
        });
    });

    // Avg Pace
    // Total Time / Total Dist
    // We sum up time for runs separately to get Run Pace?
    let runTimeSec = 0;
    let runDistKm = 0;

    plan.forEach((week) => {
        week.workouts.forEach((workout, index) => {
            const key = `${week.weekNumber}-${index}`;
            if (completedMap[key]) {
                const type = workout.type.toLowerCase();
                // Only for runs
                if (
                    (type.includes("run") ||
                        type.includes("interval") ||
                        type.includes("tempo")) &&
                    workout.distance.includes("km")
                ) {
                    const dist = parseFloat(workout.distance) || 0;
                    const durationHours = parseDuration(
                        workout.distance,
                        workout.intensity
                    );
                    runDistKm += dist;
                    runTimeSec += durationHours * 3600;
                }
            }
        });
    });

    let avgPaceStr = "0'00\" /km";
    if (runDistKm > 0) {
        const avgSecPerKm = runTimeSec / runDistKm;
        const min = Math.floor(avgSecPerKm / 60);
        const sec = Math.round(avgSecPerKm % 60);
        avgPaceStr = `${min}'${sec.toString().padStart(2, "0")}" /km`;
    }

    return {
        totalDist: Math.round(totalDist * 10) / 10,
        activeHours:
            Math.floor(activeHours) +
            "h " +
            Math.round((activeHours % 1) * 60) +
            "m",
        avgPace: avgPaceStr,
        runsThisWeek: plannedRunsThisWeek, // Planned runs for current week
        completedRunsThisWeek: currentWeekRuns, // Completed runs for current week
        currentWeek: currentWeekNum,
        completedRunsTotal: completedRuns,
    };
}

export function decodePolyline(encoded) {
    if (!encoded) return [];
    var poly = [];
    var index = 0,
        len = encoded.length;
    var lat = 0,
        lng = 0;

    while (index < len) {
        var b,
            shift = 0,
            result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        poly.push([lat / 1e5, lng / 1e5]);
    }
    return poly;
}
