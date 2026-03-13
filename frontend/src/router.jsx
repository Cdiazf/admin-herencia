import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdvisorsPage from "./pages/AdvisorsPage";
import CollectionsPage from "./pages/CollectionsPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import InitialDashboardPage from "./pages/InitialDashboardPage";
import InitialCollectionsPage from "./pages/InitialCollectionsPage";
import LoginPage from "./pages/LoginPage";
import OriginsPage from "./pages/OriginsPage";
import SalesPage from "./pages/SalesPage";
import UsersPage from "./pages/UsersPage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <App />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "dashboard-iniciales", element: <InitialDashboardPage /> },
          { path: "ventas", element: <SalesPage /> },
          { path: "cobro-inicial", element: <InitialCollectionsPage /> },
          { path: "cobranza", element: <CollectionsPage /> }
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute roles={["admin"]} />,
    children: [
      {
        path: "/",
        element: <App />,
        children: [
          { path: "origenes", element: <OriginsPage /> },
          { path: "vendedores", element: <AdvisorsPage /> },
          { path: "eventos", element: <EventsPage /> },
          { path: "usuarios", element: <UsersPage /> }
        ]
      }
    ]
  }
]);

export default router;
