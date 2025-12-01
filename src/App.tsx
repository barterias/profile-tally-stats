import { Toaster } from "@/components/ui/toaster";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardClient from "./pages/DashboardClient";
import DashboardClipper from "./pages/DashboardClipper";
import FinanceiroAdmin from "./pages/FinanceiroAdmin";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminSubmissions from "./pages/AdminSubmissions";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
import AdminUsers from "./pages/AdminUsers";
import AdminStats from "./pages/AdminStats";
import ManageVideos from "./pages/ManageVideos";
import CreateCampaign from "./pages/CreateCampaign";
import EditCampaign from "./pages/EditCampaign";
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
        <LanguageProvider>
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
              {/* Dashboard Routes by Role */}
              <Route path="/dashboard/admin" element={<DashboardAdmin />} />
              <Route path="/dashboard/client" element={<DashboardClient />} />
              <Route path="/dashboard/clipper" element={<DashboardClipper />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<DashboardAdmin />} />
              <Route path="/admin/dashboard" element={<DashboardAdmin />} />
              <Route path="/admin/campaigns" element={<AdminCampaigns />} />
              <Route path="/admin/videos" element={<ProtectedRoute requireAdmin><ManageVideos /></ProtectedRoute>} />
              <Route path="/admin/submissions" element={<AdminSubmissions />} />
              <Route path="/admin/payouts" element={<FinanceiroAdmin />} />
              <Route path="/admin/create-campaign" element={<ProtectedRoute requireAdmin><CreateCampaign /></ProtectedRoute>} />
              <Route path="/admin/edit-campaign/:id" element={<EditCampaign />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/stats" element={<AdminStats />} />
              <Route path="/ranking" element={<ProtectedRoute><RankingGlobal /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
