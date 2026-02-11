import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";

// Lazy-loaded dashboard pages for code splitting
const DashboardOverview = lazy(
    () => import("./pages/dashboard/DashboardOverview"),
);
const RouteVisualization = lazy(
    () => import("./components/RouteVisualization"),
);
const AnalyticsCharts = lazy(() => import("./components/AnalyticsCharts"));
const PaceCalculator = lazy(() => import("./pages/dashboard/PaceCalculator"));
const TrainingPlan = lazy(() => import("./pages/dashboard/TrainingPlan"));
const SyncPage = lazy(() => import("./pages/dashboard/SyncPage"));

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<LandingPage />} />
                    <Route path="login" element={<AuthPage type="login" />} />
                    <Route
                        path="register"
                        element={<AuthPage type="register" />}
                    />
                </Route>

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <DashboardOverview />
                            </Suspense>
                        }
                    />
                    <Route
                        path="pace-calculator"
                        element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <PaceCalculator />
                            </Suspense>
                        }
                    />
                    <Route
                        path="routes"
                        element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <RouteVisualization />
                            </Suspense>
                        }
                    />
                    <Route
                        path="analytics"
                        element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <AnalyticsCharts />
                            </Suspense>
                        }
                    />
                    <Route
                        path="my-plan"
                        element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <TrainingPlan />
                            </Suspense>
                        }
                    />
                    <Route
                        path="sync"
                        element={
                            <Suspense fallback={<LoadingSpinner />}>
                                <SyncPage />
                            </Suspense>
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
