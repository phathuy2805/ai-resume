import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import HRJobsPage from "@/pages/hr/HRJobsPage";
import HRCreateJobPage from "@/pages/hr/HRCreateJobPage";
import HREditJobPage from "@/pages/hr/HREditJobPage";
import CandidateJobsPage from "@/pages/candidate/CandidateJobsPage";
import CandidateJobDetailPage from "@/pages/candidate/CandidateJobDetailPage";
import NotFoundPage from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/hr/jobs", element: <HRJobsPage /> },
  { path: "/hr/jobs/new", element: <HRCreateJobPage /> },
  { path: "/hr/jobs/:id/edit", element: <HREditJobPage /> },
  { path: "/candidate/jobs", element: <CandidateJobsPage /> },
  { path: "/candidate/jobs/:id", element: <CandidateJobDetailPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
