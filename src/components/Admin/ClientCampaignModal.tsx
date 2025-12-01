import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

interface ClientCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

export function ClientCampaignModal({
  open,
  onOpenChange,
  userId,
  username,
  onSuccess,
}: ClientCampaignModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [existingCampaigns, setExistingCampaigns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, name, is_active")
        .order("name");

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Fetch existing campaign ownership for this user
      const { data: ownershipData, error: ownershipError } = await supabase
        .from("campaign_owners")
        .select("campaign_id")
        .eq("user_id", userId);

      if (ownershipError) throw ownershipError;
      
      const existingIds = (ownershipData || []).map((o) => o.campaign_id);
      setExistingCampaigns(existingIds);
      setSelectedCampaigns(existingIds);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCampaign = (campaignId: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update user role to client
      const { error: roleError } = await supabase.rpc("update_role", {
        p_user_id: userId,
        p_new_role: "client",
      } as any);
      if (roleError) throw roleError;

      // Find campaigns to add and remove
      const toAdd = selectedCampaigns.filter((id) => !existingCampaigns.includes(id));
      const toRemove = existingCampaigns.filter((id) => !selectedCampaigns.includes(id));

      // Remove old ownership
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("campaign_owners")
          .delete()
          .eq("user_id", userId)
          .in("campaign_id", toRemove);
        if (removeError) throw removeError;
      }

      // Add new ownership
      if (toAdd.length > 0) {
        const newOwnerships = toAdd.map((campaign_id) => ({
          campaign_id,
          user_id: userId,
        }));
        const { error: addError } = await supabase
          .from("campaign_owners")
          .insert(newOwnerships);
        if (addError) throw addError;
      }

      toast.success(`${username} agora é cliente de ${selectedCampaigns.length} campanha(s)`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao vincular cliente às campanhas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Tornar Cliente
          </DialogTitle>
          <DialogDescription>
            Selecione as campanhas que <strong>{username}</strong> irá gerenciar como cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma campanha cadastrada
            </p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <Checkbox
                    id={campaign.id}
                    checked={selectedCampaigns.includes(campaign.id)}
                    onCheckedChange={() => handleToggleCampaign(campaign.id)}
                  />
                  <Label
                    htmlFor={campaign.id}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <span>{campaign.name}</span>
                    {!campaign.is_active && (
                      <span className="text-xs text-muted-foreground">(Inativa)</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedCampaigns.length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              `Confirmar (${selectedCampaigns.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
