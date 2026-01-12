import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function Layout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            {/* Dark/Glass Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
                    <div className="flex items-center gap-6">
                        <Link
                            to="/login"
                            className="text-sm font-medium hover:text-primary transition-colors text-white/80"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-lg hover:shadow-primary/25"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content with Transition */}
            <main className="pt-16">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
