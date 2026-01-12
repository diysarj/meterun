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

export const generatePlanLogic = (
    distance,
    raceDateStr,
    level = "beginner",
    currentDistance = 5,
    recentTimeStr = "00:30:00"
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
    const recentSeconds = parseTime(recentTimeStr);
    const dist = parseFloat(currentDistance) || 5;
    const basePaceSec = recentSeconds > 0 ? recentSeconds / dist : 360; // Default to 6:00/km

    // Pace calculations (higher seconds = slower pace)
    const easyPace = formatPace(basePaceSec + 45); // Easy: base + 45s
    const longRunPace = formatPace(basePaceSec + 75); // Long Run: slower than easy (base + 75s)
    const intervalPace = formatPace(basePaceSec - 30); // Intervals: faster
    const tempoPace = formatPace(basePaceSec - 15); // Tempo: comfortably hard

    const schedule = [];
    const distances = {
        "5k": { start: 3, max: 5, increment: 0.5 },
        "10k": { start: 4, max: 10, increment: 1 },
        "half marathon": { start: 8, max: 21, increment: 1.5 },
        marathon: { start: 12, max: 42, increment: 2 },
    };

    const config = distances[distance.toLowerCase()] || distances["5k"];

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

        let workouts = [];

        if (level === "beginner") {
            // BEGINNER: 3 running days (Mon, Wed, Fri)
            workouts = [
                {
                    day: "Monday",
                    type: "Easy Run",
                    distance: `${Math.round(currentLongRun * 0.5)} km`,
                    intensity: `Easy pace @ ${easyPace}/km`,
                },
                {
                    day: "Tuesday",
                    type: "Rest / Cross Train",
                    distance: "-",
                    intensity: "Recovery or Light Activity",
                },
                {
                    day: "Wednesday",
                    type: isTaper ? "Easy Run" : speedWorkType,
                    distance: `${Math.round(currentLongRun * 0.4)} km`,
                    intensity: isTaper
                        ? `Easy pace @ ${easyPace}/km`
                        : speedWorkIntensity,
                },
                {
                    day: "Thursday",
                    type: "Rest / Strength",
                    distance: "30 mins",
                    intensity: "Core & Mobility Work",
                },
                {
                    day: "Friday",
                    type: "Long Run",
                    distance: `${Math.round(currentLongRun)} km`,
                    intensity: `Conversational pace @ ${longRunPace}/km`,
                },
                {
                    day: "Saturday",
                    type: "Rest",
                    distance: "-",
                    intensity: "Complete Rest",
                },
                {
                    day: "Sunday",
                    type: "Rest / Cross Train",
                    distance: "-",
                    intensity: "Recovery or Light Cycle/Walk",
                },
            ];
        } else if (level === "intermediate") {
            // INTERMEDIATE: 4 running days (Mon, Tue, Thu, Sat)
            workouts = [
                {
                    day: "Monday",
                    type: "Easy Run",
                    distance: `${Math.round(currentLongRun * 0.4)} km`,
                    intensity: `Easy pace @ ${easyPace}/km`,
                },
                {
                    day: "Tuesday",
                    type: isTaper ? "Easy Run" : speedWorkType,
                    distance: `${Math.round(currentLongRun * 0.4)} km`,
                    intensity: isTaper
                        ? `Easy pace @ ${easyPace}/km`
                        : speedWorkIntensity,
                },
                {
                    day: "Wednesday",
                    type: "Rest / Strength",
                    distance: "45 mins",
                    intensity: "Leg Day (Squats, Lunges, Calf Raises)",
                },
                {
                    day: "Thursday",
                    type: "Easy Run",
                    distance: `${Math.round(currentLongRun * 0.5)} km`,
                    intensity: `Easy pace @ ${easyPace}/km`,
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
                    intensity: `Conversational pace @ ${longRunPace}/km`,
                },
                {
                    day: "Sunday",
                    type: "Rest / Cross Train",
                    distance: "-",
                    intensity: "Recovery or Light Cycle/Swim",
                },
            ];
        } else {
            // ADVANCED: 5 running days (Mon, Tue, Wed, Thu, Sat)
            workouts = [
                {
                    day: "Monday",
                    type: "Easy Run",
                    distance: `${Math.round(currentLongRun * 0.4)} km`,
                    intensity: `Easy pace @ ${easyPace}/km`,
                },
                {
                    day: "Tuesday",
                    type: isTaper ? "Easy Run" : speedWorkType,
                    distance: `${Math.round(currentLongRun * 0.5)} km`,
                    intensity: isTaper
                        ? `Easy pace @ ${easyPace}/km`
                        : speedWorkIntensity,
                },
                {
                    day: "Wednesday",
                    type: "Easy Run",
                    distance: `${Math.round(currentLongRun * 0.4)} km`,
                    intensity: `Recovery run @ ${easyPace}/km`,
                },
                {
                    day: "Thursday",
                    type: isTaper ? "Easy Run" : "Tempo Run",
                    distance: `${Math.round(currentLongRun * 0.5)} km`,
                    intensity: isTaper
                        ? `Easy pace @ ${easyPace}/km`
                        : `Steady effort @ ${tempoPace}/km`,
                },
                {
                    day: "Friday",
                    type: "Rest / Strength",
                    distance: "45 mins",
                    intensity: "Strength & Mobility",
                },
                {
                    day: "Saturday",
                    type: "Long Run",
                    distance: `${Math.round(currentLongRun * 1.2)} km`,
                    intensity: `Conversational pace @ ${longRunPace}/km`,
                },
                {
                    day: "Sunday",
                    type: "Rest / Cross Train",
                    distance: "-",
                    intensity: "Active Recovery",
                },
            ];
        }

        const weekPlan = {
            weekNumber: week,
            phase: phase,
            workouts: workouts,
        };

        schedule.push(weekPlan);

        if (!isTaper) {
            longRunDistance = Math.min(
                longRunDistance + config.increment,
                config.max
            );
        }
    }

    return schedule;
};
