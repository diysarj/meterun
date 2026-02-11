import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    useMap,
} from "react-leaflet";
import {
    Clock,
    Ruler,
    Zap,
    Download,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useState, useEffect } from "react";
import { decodePolyline } from "../lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fix Leaflet icon issue in React
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 13);
        }
    }, [center, zoom, map]);
    return null;
}

const fetchActivities = async () => {
    const res = await fetch("/api/activities");
    if (!res.ok) throw new Error("Failed to fetch activities");
    return res.json();
};

export default function RouteVisualization() {
    const queryClient = useQueryClient();
    const { data: activities = [] } = useQuery({
        queryKey: ["activities"],
        queryFn: fetchActivities,
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/activities/sync", { method: "POST" });
            if (!res.ok) throw new Error("Sync failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
        },
        onError: () => {
            alert(
                "Failed to sync with Strava. Please check if you are connected in the Sync menu.",
            );
        },
    });

    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
    const [routePath, setRoutePath] = useState([]);
    const [center, setCenter] = useState([-6.2088, 106.8456]);

    const currentActivity = activities[currentActivityIndex] || null;

    useEffect(() => {
        if (currentActivity && currentActivity.map?.summary_polyline) {
            const decoded = decodePolyline(
                currentActivity.map.summary_polyline,
            );
            setRoutePath(decoded);
            if (decoded.length > 0) {
                // Approximate center or just start point
                setCenter(decoded[Math.floor(decoded.length / 2)]);
            }
        } else {
            setRoutePath([]);
        }
    }, [currentActivity]);

    const formatTime = (seconds) => {
        if (!seconds) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, "0")}:${m
            .toString()
            .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const formatPace = (speedMs) => {
        if (!speedMs || speedMs === 0) return "--:--";
        const secondsPerKm = 1000 / speedMs;
        const min = Math.floor(secondsPerKm / 60);
        const sec = Math.floor(secondsPerKm % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    const formatDistance = (meters) => {
        return (meters / 1000).toFixed(2);
    };

    const nextActivity = () => {
        if (currentActivityIndex < activities.length - 1) {
            setCurrentActivityIndex((prev) => prev + 1);
        }
    };

    const prevActivity = () => {
        if (currentActivityIndex > 0) {
            setCurrentActivityIndex((prev) => prev - 1);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Route Analyzer
                    </h2>
                    <p className="text-white/50">
                        Visualize your run and analyze terrain.
                    </p>
                </div>
                {/* Navigation controls if multiple activities */}
                {activities.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={prevActivity}
                            disabled={currentActivityIndex === 0}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={20} className="text-white" />
                        </button>
                        <span className="text-sm text-white/50 flex items-center">
                            {currentActivityIndex + 1} / {activities.length}
                        </span>
                        <button
                            onClick={nextActivity}
                            disabled={
                                currentActivityIndex === activities.length - 1
                            }
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={20} className="text-white" />
                        </button>
                    </div>
                )}
            </div>

            <div className="glass p-2 rounded-2xl border border-white/5 h-[600px] overflow-hidden relative z-0">
                {/* Route Stats Overlay */}
                <div className="absolute top-4 right-4 z-[1000] w-72 pointer-events-none">
                    <div className="glass p-5 rounded-xl border border-white/10 bg-black/95 backdrop-blur-md pointer-events-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-base font-semibold text-gray-400 tracking-wide truncate max-w-[120px]">
                                    {currentActivity
                                        ? currentActivity.name
                                        : "No Data"}
                                </h3>
                            </div>
                            <button
                                onClick={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending}
                                className="text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1.5 rounded-lg hover:bg-orange-500/20 transition-all flex items-center gap-1.5 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {syncMutation.isPending ? (
                                    <RefreshCw
                                        size={12}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Download
                                        size={12}
                                        className="group-hover/btn:translate-y-0.5 transition-transform"
                                    />
                                )}
                                {syncMutation.isPending
                                    ? "Syncing..."
                                    : "Sync Strava"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            {/* Distance */}
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                    <Ruler size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 font-medium mb-0.5">
                                        Distance
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-bold text-gray-400 tracking-tight">
                                            {currentActivity
                                                ? formatDistance(
                                                      currentActivity.distance,
                                                  )
                                                : "0.00"}
                                        </p>
                                        <span className="text-base font-medium text-gray-400">
                                            km
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pace */}
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 font-medium mb-0.5">
                                        Avg Pace
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-bold text-gray-400 tracking-tight">
                                            {currentActivity
                                                ? formatPace(
                                                      currentActivity.averageSpeed,
                                                  )
                                                : "--:--"}
                                        </p>
                                        <span className="text-base font-medium text-gray-400">
                                            /km
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 font-medium mb-0.5">
                                        Time
                                    </p>
                                    <p className="text-2xl font-bold text-gray-400 tracking-tight">
                                        {currentActivity
                                            ? formatTime(
                                                  currentActivity.movingTime,
                                              )
                                            : "00:00:00"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <MapContainer
                    center={center}
                    zoom={13}
                    scrollWheelZoom={true}
                    className="h-full w-full rounded-xl z-0"
                >
                    <MapUpdater
                        center={center}
                        zoom={currentActivity ? 14 : 13}
                    />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {routePath.length > 0 && (
                        <>
                            <Polyline positions={routePath} color="blue" />
                            <Marker position={routePath[0]}>
                                <Popup>Start</Popup>
                            </Marker>
                            <Marker position={routePath[routePath.length - 1]}>
                                <Popup>End</Popup>
                            </Marker>
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
