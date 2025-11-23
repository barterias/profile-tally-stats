import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import UserDashboard from "./pages/UserDashboard";
import SubmitPost from "./pages/SubmitPost";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Admin from "./pages/Admin";
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
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/submit" element={<ProtectedRoute><SubmitPost /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/campaign/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
            <Route path="/ranking/monthly" element={<ProtectedRoute><RankingGlobal /></ProtectedRoute>} />
            <Route path="/ranking/daily" element={<ProtectedRoute><RankingDaily /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
            <Route path="/admin/videos" element={<ProtectedRoute requireAdmin={true}><ManageVideos /></ProtectedRoute>} />
            <Route path="/admin/create-campaign" element={<ProtectedRoute requireAdmin={true}><CreateCampaign /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
