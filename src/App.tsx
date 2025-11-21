import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import SubmitPost from "./pages/SubmitPost";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import AdminDashboard from "./pages/AdminDashboard";
import ManageVideos from "./pages/ManageVideos";
import CreateCampaign from "./pages/CreateCampaign";
import RankingGlobal from "./pages/RankingGlobal";
import RankingDaily from "./pages/RankingDaily";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<UserDashboard />} />
            <Route path="/submit" element={<SubmitPost />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/ranking/global" element={<RankingGlobal />} />
            <Route path="/ranking/daily" element={<RankingDaily />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/videos" element={<ManageVideos />} />
            <Route path="/admin/create-campaign" element={<CreateCampaign />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
