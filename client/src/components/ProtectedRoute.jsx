import { Navigate, useLocation } from "react-router-dom";

/**
 * ProtectedRoute component that checks for authentication
 * Redirects to login page if user is not authenticated
 */
export default function ProtectedRoute({ children }) {
    const location = useLocation();

    // Check if user is authenticated by looking for stored user data
    const user = localStorage.getItem("meterun_user");

    if (!user) {
        // Redirect to login page, but save the attempted location
        // so we can redirect back after successful login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // User is authenticated, render the protected content
    return children;
}
