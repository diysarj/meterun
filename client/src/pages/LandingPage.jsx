import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
            {/* Background Image & Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/landing-bg.jpg')",
                }}
            />
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 z-0 bg-black/40 bg-gradient-to-b from-black/60 to-black/20" />

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center relative z-10">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 flex flex-col gap-2">
                    <span className="text-white drop-shadow-lg">
                        Track your progress.
                    </span>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80 drop-shadow-lg">
                        Train Better.
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 leading-relaxed font-medium drop-shadow-md">
                    Meterun generates personalized training plans adapted to
                    your level. Analyze progress, visualize routes, and sync
                    everything with your calendar.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        to="/register"
                        className="px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 transition-all transform hover:scale-105"
                    >
                        Start Training Now
                    </Link>
                </div>
            </section>
        </div>
    );
}
