import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import RouteVisualization from "./components/RouteVisualization";
import AnalyticsCharts from "./components/AnalyticsCharts";
import PaceCalculator from "./pages/dashboard/PaceCalculator";
import TrainingPlan from "./pages/dashboard/TrainingPlan";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import SyncPage from "./pages/dashboard/SyncPage";

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
                    <Route index element={<DashboardOverview />} />
                    <Route
                        path="pace-calculator"
                        element={<PaceCalculator />}
                    />
                    <Route path="routes" element={<RouteVisualization />} />
                    <Route path="analytics" element={<AnalyticsCharts />} />
                    <Route path="my-plan" element={<TrainingPlan />} />
                    <Route path="sync" element={<SyncPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
