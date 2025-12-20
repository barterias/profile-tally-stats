import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, X, Users, Loader2 } from "lucide-react";

interface PendingClipper {
  id: string;
  campaign_id: string;
  user_id: string;
  applied_at: string;
  status: string;
  username: string;
  avatar_url: string | null;
  campaign_name: string;
}

interface PendingClippersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  campaignName?: string;
}

export function PendingClippersModal({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: PendingClippersModalProps) {
  const { user, isAdmin } = useAuth();
  const [pendingClippers, setPendingClippers] = useState<PendingClipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [ownedCampaigns, setOwnedCampaigns] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchPendingClippers();
      if (!isAdmin) {
        fetchOwnedCampaigns();
      }
    }
  }, [open, campaignId]);

  const fetchOwnedCampaigns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("campaign_owners")
      .select("campaign_id")
      .eq("user_id", user.id);
    
    if (data) {
      setOwnedCampaigns(data.map(d => d.campaign_id));
    }
  };

  const fetchPendingClippers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pending_campaign_participants")
        .select("*");

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query.order("applied_at", { ascending: false });

      if (error) throw error;

      // For clients, filter to only show campaigns they own
      let filteredData = data || [];
      if (!isAdmin && user) {
        const { data: owned } = await supabase
          .from("campaign_owners")
          .select("campaign_id")
          .eq("user_id", user.id);
        
        const ownedIds = owned?.map(o => o.campaign_id) || [];
        filteredData = filteredData.filter(p => ownedIds.includes(p.campaign_id));
      }

      setPendingClippers(filteredData);
    } catch (error) {
      console.error("Error fetching pending clippers:", error);
      toast.error("Erro ao carregar inscrições pendentes");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (participantId: string) => {
    setProcessingId(participantId);
    try {
      const { error } = await supabase.rpc("approve_participant", {
        p_participant_id: participantId,
      });

      if (error) throw error;

      toast.success("Clipper aprovado com sucesso!");
      setPendingClippers(prev => prev.filter(p => p.id !== participantId));
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar clipper");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (participantId: string) => {
    setProcessingId(participantId);
    try {
      const { error } = await supabase.rpc("reject_participant", {
        p_participant_id: participantId,
      });

      if (error) throw error;

      toast.success("Inscrição rejeitada");
      setPendingClippers(prev => prev.filter(p => p.id !== participantId));
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar inscrição");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Inscrições Pendentes
            {campaignName && (
              <Badge variant="outline" className="ml-2">
                {campaignName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : pendingClippers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nenhuma inscrição pendente
              </p>
            </div>
          ) : (
            pendingClippers.map((clipper) => (
              <div
                key={clipper.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <Avatar>
                  <AvatarImage src={clipper.avatar_url || undefined} />
                  <AvatarFallback>
                    {clipper.username?.slice(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{clipper.username}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {!campaignId && (
                      <Badge variant="outline" className="text-[10px]">
                        {clipper.campaign_name}
                      </Badge>
                    )}
                    <span>{formatDate(clipper.applied_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => handleApprove(clipper.id)}
                    disabled={processingId === clipper.id}
                  >
                    {processingId === clipper.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleReject(clipper.id)}
                    disabled={processingId === clipper.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
