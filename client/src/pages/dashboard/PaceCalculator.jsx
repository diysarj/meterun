import { useState, useEffect } from "react";
import { Calculator, RotateCcw } from "lucide-react";

export default function PaceCalculator() {
    const [distance, setDistance] = useState("");
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const [seconds, setSeconds] = useState("");
    const [pace, setPace] = useState(null);

    const calculatePace = () => {
        const dist = parseFloat(distance);
        const h = parseInt(hours || 0);
        const m = parseInt(minutes || 0);
        const s = parseInt(seconds || 0);

        if (!dist || dist <= 0) return;
        if (h === 0 && m === 0 && s === 0) return;

        const totalMinutes = h * 60 + m + s / 60;
        const paceDec = totalMinutes / dist; // minutes per km

        const paceMin = Math.floor(paceDec);
        const paceSec = Math.round((paceDec - paceMin) * 60);

        setPace(`${paceMin}'${paceSec.toString().padStart(2, "0")}" /km`);
    };

    const reset = () => {
        setDistance("");
        setHours("");
        setMinutes("");
        setSeconds("");
        setPace(null);
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                    Pace Calculator
                </h1>
                <p className="text-white/60">
                    Calculate your running pace based on distance and time.
                </p>
            </div>

            <div className="glass p-8 rounded-2xl border border-white/5 bg-black/20">
                <div className="space-y-6">
                    {/* Distance Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">
                            Distance (km)
                        </label>
                        <input
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="e.g. 10.0"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                    </div>

                    {/* Time Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">
                            Time (hh:mm:ss)
                        </label>
                        <div className="flex gap-4">
                            <input
                                type="number"
                                placeholder="Hr"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                            <input
                                type="number"
                                placeholder="Min"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                            <input
                                type="number"
                                placeholder="Sec"
                                value={seconds}
                                onChange={(e) => setSeconds(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={calculatePace}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
                        >
                            <Calculator size={20} />
                            Calculate
                        </button>
                        <button
                            onClick={reset}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>

                    {/* Result */}
                    {pace && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-xl text-center">
                            <p className="text-sm text-purple-400 mb-1 font-medium">
                                YOUR PACE
                            </p>
                            <p className="text-4xl font-bold text-white">
                                {pace}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
