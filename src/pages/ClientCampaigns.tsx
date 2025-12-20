import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Search,
  MoreHorizontal,
  Eye,
  Users,
  Video,
  Play,
  Pause,
  RefreshCw,
  Download,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { PendingClippersModal } from "@/components/Campaign/PendingClippersModal";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
  created_at: string;
  participants?: number;
  videos?: number;
  totalViews?: number;
}

function ClientCampaignsContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [selectedCampaignForPending, setSelectedCampaignForPending] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      // Get campaigns owned by this client
      const { data: ownedCampaigns, error: ownerError } = await supabase
        .from("campaign_owners")
        .select("campaign_id")
        .eq("user_id", user?.id);

      if (ownerError) throw ownerError;

      if (!ownedCampaigns || ownedCampaigns.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      const campaignIds = ownedCampaigns.map(co => co.campaign_id);

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .in("id", campaignIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch stats for each campaign
      const campaignsWithStats = await Promise.all(
        (data || []).map(async (campaign) => {
          const { data: videos } = await supabase
            .from("campaign_videos")
            .select("*")
            .eq("campaign_id", campaign.id);

          const participants = new Set(videos?.map((v) => v.submitted_by)).size;
          const totalViews = videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;

          return {
            ...campaign,
            participants,
            videos: videos?.length || 0,
            totalViews,
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error(t("msg.error_loading"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_active: !campaign.is_active })
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success(campaign.is_active ? t("campaigns.campaign_paused_msg") : t("campaigns.campaign_activated_msg"));
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || t("msg.error_saving"));
    }
  };

  const exportCSV = () => {
    const headers = [t("common.name"), t("common.status"), t("campaigns.start_date"), t("campaigns.end_date"), t("campaigns.participants"), t("campaigns.videos"), t("campaigns.views")];
    const rows = filteredCampaigns.map((c) => [
      c.name,
      c.is_active ? t("common.active") : t("common.inactive"),
      format(new Date(c.start_date), "dd/MM/yyyy"),
      format(new Date(c.end_date), "dd/MM/yyyy"),
      c.participants || 0,
      c.videos || 0,
      c.totalViews || 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `campaigns_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success(t("common.export") + " " + t("common.success").toLowerCase());
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && campaign.is_active) ||
      (filterStatus === "inactive" && !campaign.is_active);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("campaigns.my_campaigns")}</h1>
              <p className="text-sm text-muted-foreground">
                {campaigns.length} {t("nav.campaigns").toLowerCase()} • {campaigns.filter((c) => c.is_active).length} {t("common.active").toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCampaigns}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.refresh")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              {t("common.export")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("campaigns.search_campaigns")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as any)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nav.campaigns")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("campaigns.period")}</TableHead>
                  <TableHead className="text-center">{t("campaigns.participants")}</TableHead>
                  <TableHead className="text-center">{t("campaigns.videos")}</TableHead>
                  <TableHead className="text-center">{t("campaigns.views")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">{t("campaigns.no_campaigns_found")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {(campaign.platforms || [campaign.platform]).map((p) => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5">
                                  {p === "instagram" && "📸"}
                                  {p === "tiktok" && "🎵"}
                                  {p === "youtube" && "▶️"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            campaign.is_active
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {campaign.is_active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(campaign.start_date), "dd/MM/yyyy")}</p>
                          <p className="text-muted-foreground text-xs">
                            {t("campaigns.end_date").toLowerCase().replace("data de término", "até")} {format(new Date(campaign.end_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.participants || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.videos || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {(campaign.totalViews || 0).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/campaign/${campaign.id}`, { state: { from: '/client/campaigns' } })}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")} {t("common.details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCampaignForPending({ id: campaign.id, name: campaign.name });
                              setPendingModalOpen(true);
                            }}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Gerenciar Inscrições
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Clippers Modal */}
        <PendingClippersModal
          open={pendingModalOpen}
          onOpenChange={setPendingModalOpen}
          campaignId={selectedCampaignForPending?.id}
          campaignName={selectedCampaignForPending?.name}
        />
      </div>
    </MainLayout>
  );
}

export default function ClientCampaigns() {
  return (
    <ProtectedRoute>
      <ClientCampaignsContent />
    </ProtectedRoute>
  );
}
