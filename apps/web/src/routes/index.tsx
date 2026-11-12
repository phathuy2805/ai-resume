import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import CandidateLayout from "@/components/layout/CandidateLayout";
import HrLayout from "@/components/layout/HrLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import CandidateApplicationsPage from "@/pages/candidate/CandidateApplicationsPage";
import CandidateJobsPage from "@/pages/candidate/CandidateJobsPage";
import CandidateJobDetailPage from "@/pages/candidate/CandidateJobDetailPage";
import NotFoundPage from "@/pages/NotFoundPage";
import HRCreateJobPage from "@/pages/hr/HRCreateJobPage";
import HREditJobPage from "@/pages/hr/HREditJobPage";
import HRCandidatesPage from "@/pages/hr/HRCandidatesPage";
import HRJobsPage from "@/pages/hr/HRJobsPage";
import HRStatsPage from "@/pages/hr/HRStatsPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { element: <AuthLayout />, children: [{ path: "login", element: <LoginPage /> }, { path: "register", element: <RegisterPage /> }] },
  {
    path: "hr", element: <HrLayout />, children: [
      { index: true, element: <Navigate to="jobs" replace /> },
      { path: "jobs", element: <HRJobsPage /> },
      { path: "candidates", element: <HRCandidatesPage /> },
      { path: "stats", element: <HRStatsPage /> },
      { path: "jobs/new", element: <HRCreateJobPage /> },
      { path: "jobs/:id/edit", element: <HREditJobPage /> },
    ],
  },
  {
    path: "candidate", element: <CandidateLayout />, children: [
      { index: true, element: <Navigate to="jobs" replace /> },
      { path: "jobs", element: <CandidateJobsPage /> },
      { path: "jobs/:id", element: <CandidateJobDetailPage /> },
      { path: "applications", element: <CandidateApplicationsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
