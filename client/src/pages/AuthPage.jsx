import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AuthPage({ type = "login" }) {
    const isLogin = type === "login";
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Get the redirect destination (where user was trying to go before being redirected to login)
    const from = location.state?.from?.pathname || "/dashboard";

    // Redirect if already authenticated
    useEffect(() => {
        const user = localStorage.getItem("meterun_user");
        if (user) {
            navigate(from, { replace: true });
        }
    }, [navigate, from]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error("Failed to parse JSON response:", text);
                throw new Error(
                    "Server error: " + (text || "Invalid response")
                );
            }

            if (!res.ok) {
                const errorMessage =
                    (data && data.message) || text || "Something went wrong";
                throw new Error(errorMessage);
            }

            // Save user info (token is in cookie)
            localStorage.setItem("meterun_user", JSON.stringify(data));

            // Navigate to the original destination or dashboard
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[80vh]">
            <div className="glass w-full max-w-md p-8 rounded-2xl relative overflow-hidden">
                {/* Decorative blob */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-3xl font-bold mb-2 text-center">
                    {isLogin ? "Welcome Back" : "Join the Club"}
                </h2>
                <p className="text-center text-white/50 mb-8">
                    {isLogin
                        ? "Sign in to access your dashboard"
                        : "Start your journey with Meterun today"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium mb-1 pl-1">
                                Name
                            </label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-white/20"
                                required
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 pl-1">
                            Email
                        </label>
                        <input
                            type="email"
                            placeholder="runner@example.com"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-white/20"
                            required
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    email: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 pl-1">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-white/20"
                            required
                            value={formData.password}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg shadow-lg hover:shadow-primary/25 transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading
                            ? "Processing..."
                            : isLogin
                            ? "Sign In"
                            : "Create Account"}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-white/50">
                    {isLogin
                        ? "Don't have an account? "
                        : "Already have an account? "}
                    <Link
                        to={isLogin ? "/register" : "/login"}
                        className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
                    >
                        {isLogin ? "Sign Up" : "Sign In"}
                    </Link>
                </div>
            </div>
        </div>
    );
}
