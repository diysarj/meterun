import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Map as MapIcon,
    BarChart3,
    Calendar,
    LogOut,
    RefreshCw,
    Timer,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";

const handleLogout = async (navigate) => {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
        localStorage.removeItem("meterun_user");
        navigate("/");
    } catch (error) {
        console.error("Logout failed:", error);
        // Still clear local storage and redirect even if API fails
        localStorage.removeItem("meterun_user");
        navigate("/");
    }
};

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
        {
            icon: Timer,
            label: "Pace Calculator",
            path: "/dashboard/pace-calculator",
        },
        { icon: MapIcon, label: "Routes", path: "/dashboard/routes" },
        { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
        { icon: Calendar, label: "My Plan", path: "/dashboard/my-plan" },
        { icon: RefreshCw, label: "Sync", path: "/dashboard/sync" },
    ];

    return (
        <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30">
                <Link to="/" className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Meterun Logo"
                        className="w-8 h-8"
                    />
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                        Meterun
                    </span>
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 glass border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:flex",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="p-6 hidden md:block">
                    <Link to="/" className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Meterun Logo"
                            className="w-8 h-8"
                        />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                            Meterun
                        </span>
                    </Link>
                </div>

                {/* Mobile Logo in Sidebar (optional, maybe just padding) */}
                <div className="p-6 md:hidden">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                        Menu
                    </span>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    isActive
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                )}
                            >
                                <Icon size={20} />
                                <span className="font-medium">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={() => handleLogout(navigate)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 md:p-8 pt-6">
                <Outlet />
            </main>
        </div>
    );
}
