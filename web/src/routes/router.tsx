import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/routes/Dashboard";
import { ModelPage } from "@/routes/Model";
import { DataPage } from "@/routes/Data";
import { ValidationPage } from "@/routes/Validation";
import { ImpactPage } from "@/routes/Impact";
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "model", element: <ModelPage /> },
      { path: "data", element: <DataPage /> },
      { path: "validation", element: <ValidationPage /> },
      { path: "impact", element: <ImpactPage /> }
    ]
  }
]);
