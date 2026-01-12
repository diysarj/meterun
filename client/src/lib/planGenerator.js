// Helper to parse "hh:mm:ss" or "mm:ss" to total seconds
const parseTime = (timeStr) => {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0; // Invalid
};

// Helper to format total seconds back to "mm:ss"
const formatPace = (totalSeconds) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.round(totalSeconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
};

export const generateTrainingPlan = (
    distance,
    raceDateStr,
    level = "beginner",
    currentDistance = 5,
    recentTimeStr = "00:30:00",
    targetTimeStr = ""
) => {
    const raceDate = new Date(raceDateStr);
    const today = new Date();

    // Calculate weeks difference
    const diffTime = Math.abs(raceDate - today);
    const totalWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

    // Safety check: Minimum 4 weeks needed
    if (totalWeeks < 4) {
        throw new Error("Please pick a race date at least 4 weeks from now.");
    }

    // Calculate base pace from Recent Time / Current Distance
    // Result is Seconds per Kilometer
    const recentSeconds = parseTime(recentTimeStr);
    const dist = parseFloat(currentDistance) || 5;
    const basePaceSec = recentSeconds > 0 ? recentSeconds / dist : 360; // Default to 6:00/km if invalid

    const easyPace = formatPace(basePaceSec + 60); // +60s slower
    const longRunPace = formatPace(basePaceSec + 45); // +45s slower
    const intervalPace = formatPace(basePaceSec - 30); // -30s faster
    const tempoPace = formatPace(basePaceSec - 15); // -15s faster

    const schedule = [];
    const distances = {
        "5k": { start: 3, max: 5, increment: 0.5 },
        "10k": { start: 4, max: 10, increment: 1 },
        "half marathon": { start: 8, max: 21, increment: 1.5 },
        marathon: { start: 12, max: 42, increment: 2 },
    };

    const config = distances[distance.toLowerCase()] || distances["5k"];

    // Determine starting long run distance: max of user's current ability or generic start
    let longRunDistance = Math.max(
        parseFloat(currentDistance) || config.start,
        config.start
    );

    for (let week = 1; week <= totalWeeks; week++) {
        let phase = "Build";
        if (week <= totalWeeks * 0.3) phase = "Base";
        else if (week >= totalWeeks - 2) phase = "Taper";
        else phase = "Peak";

        const isTaper = phase === "Taper";
        const currentLongRun = isTaper
            ? longRunDistance * 0.7
            : longRunDistance;

        // Define intensity based on phase
        // Replaced "Strides or Fartlek" with "Intervals" as requested
        const speedWorkType =
            phase === "Base"
                ? "Intervals"
                : phase === "Taper"
                ? "Light Intervals"
                : "Tempo Run";

        let speedWorkIntensity;
        if (speedWorkType.includes("Intervals")) {
            speedWorkIntensity = `400m repeats @ ${intervalPace}/km`;
        } else {
            speedWorkIntensity = `Steady effort @ ${tempoPace}/km`;
        }

        const weekPlan = {
            weekNumber: week,
            phase: phase,
            workouts: [
                {
                    day: "Monday",
                    type: "Rest",
                    distance: "-",
                    intensity: "Complete Rest",
                },
                {
                    day: "Tuesday",
                    type: "Easy Run",
                    distance: `${Math.round(currentLongRun * 0.4)} km`,
                    intensity: `Easy pace @ ${easyPace}/km`,
                },
                {
                    day: "Wednesday",
                    type: "Strength Training",
                    distance: "45 mins",
                    intensity: "Leg Day (Squats, Lunges, Calf Raises)",
                },
                {
                    day: "Thursday",
                    type: isTaper ? "Easy Run" : "Speed Work",
                    distance: `${Math.round(currentLongRun * 0.3)} km`,
                    intensity: isTaper
                        ? `Easy pace @ ${easyPace}/km`
                        : speedWorkIntensity,
                },
                {
                    day: "Friday",
                    type: "Rest / Recovery",
                    distance: "-",
                    intensity: "Stretching or Light Mobility",
                },
                {
                    day: "Saturday",
                    type: "Long Run",
                    distance: `${Math.round(currentLongRun)} km`,
                    intensity: `Steady pace @ ${longRunPace}/km`,
                },
                {
                    day: "Sunday",
                    type: "Rest / Cross Train",
                    distance: "-",
                    intensity: "Recovery or Light Cycle/Swim",
                },
            ],
        };

        schedule.push(weekPlan);

        // Increment long run distance for next week, but cap it at max
        if (!isTaper) {
            longRunDistance = Math.min(
                longRunDistance + config.increment,
                config.max
            );
        }
    }

    return schedule;
};
