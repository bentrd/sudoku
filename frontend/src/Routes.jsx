import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth } from "./components/authentication/AuthProvider";
import { ProtectedRoute } from "./components/authentication/ProtectedRoute";
import SolverPage from "./pages/SolverPage";
import HomePage from "./pages/HomePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuthenticationPage from "./pages/AuthenticationPage";

const Routes = () => {
    const { token } = useAuth();

    // Define public routes accessible to all users
    const routesForPublic = [
        {
            path: "/",
            element: <HomePage />,
        },
        {
            path: "/db",
            element: <AnalyticsPage />,
        },
    ];

    // Define routes accessible only to authenticated users
    const routesForAuthenticatedOnly = [
        {
            path: "/",
            element: <ProtectedRoute />, // Wrap the component in ProtectedRoute
            children: [
                {
                    path: "/solver",
                    element: <SolverPage />,
                },
                {
                    path: "/logout",
                    element: <div>Logout</div>,
                },
            ],
        },
    ];

    // Define routes accessible only to non-authenticated users
    const routesForNotAuthenticatedOnly = [
        {
            path: "/",
            element: <HomePage />,
        },
        {
            path: "/auth",
            element: <AuthenticationPage />,
        },
    ];

    // Combine and conditionally include routes based on authentication status
    const router = createBrowserRouter([
        ...routesForPublic,
        ...(!token ? routesForNotAuthenticatedOnly : []),
        ...routesForAuthenticatedOnly,
    ]);

    // Provide the router configuration using RouterProvider
    return <RouterProvider router={router} />;
};

export default Routes;