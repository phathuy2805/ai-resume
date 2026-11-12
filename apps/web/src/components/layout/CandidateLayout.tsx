import { Outlet } from "react-router-dom";
import CandidateFooter from "@/components/layout/CandidateFooter";
import CandidateHeader from "@/components/layout/CandidateHeader";

export default function CandidateLayout() {
  return <div className="flex min-h-screen flex-col justify-between"><CandidateHeader /><main className="w-full max-w-7xl mx-auto flex-1 px-4 py-6"><Outlet /></main><CandidateFooter /></div>;
}
