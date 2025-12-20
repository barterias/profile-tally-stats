import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, Mail, Lock, Clock } from "lucide-react";

interface ProfileChangeRequest {
  id: string;
  user_id: string;
  request_type: string;
  new_value: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  username?: string;
  email?: string;
}

export function ProfileChangeRequestsCard() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processDialog, setProcessDialog] = useState<{
    open: boolean;
    request: ProfileChangeRequest | null;
    action: "approved" | "rejected";
  }>({ open: false, request: null, action: "approved" });
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Fetch requests with user info
      const { data: requestsData, error: requestsError } = await supabase
        .from("profile_change_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Get user profiles for the requests
      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);

        const enrichedRequests = requestsData.map(req => {
          const profile = profiles?.find(p => p.id === req.user_id);
          return {
            ...req,
            username: profile?.username || "Unknown",
          };
        });

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!processDialog.request) return;

    try {
      const { request, action } = processDialog;

      // Update request status
      const { error } = await supabase
        .from("profile_change_requests")
        .update({
          status: action,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      // If approved and it's a password change, we need to handle via edge function
      // For now, just show success - admin can manually change in Supabase dashboard
      
      toast.success(
        action === "approved" 
          ? (t("profileRequests.approved") || "Solicitação aprovada!")
          : (t("profileRequests.rejected") || "Solicitação rejeitada")
      );

      setProcessDialog({ open: false, request: null, action: "approved" });
      setNewPassword("");
      setNewEmail("");
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar solicitação");
    }
  };

  const openProcessDialog = (request: ProfileChangeRequest, action: "approved" | "rejected") => {
    setProcessDialog({ open: true, request, action });
    setNewPassword("");
    setNewEmail("");
    setAdminNotes("");
  };

  if (loading) {
    return null;
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("profileRequests.title") || "Solicitações de Alteração de Perfil"}
            <Badge variant="destructive">{requests.length}</Badge>
          </CardTitle>
          <CardDescription>
            {t("profileRequests.description") || "Usuários solicitando alteração de email ou senha"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users.user") || "Usuário"}</TableHead>
                <TableHead>{t("profileRequests.type") || "Tipo"}</TableHead>
                <TableHead>{t("users.date") || "Data"}</TableHead>
                <TableHead className="text-right">{t("common.actions") || "Ações"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {request.request_type === "email" ? (
                        <>
                          <Mail className="h-3 w-3" />
                          {t("profileRequests.emailChange") || "Alterar Email"}
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          {t("profileRequests.passwordChange") || "Alterar Senha"}
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90"
                        onClick={() => openProcessDialog(request, "approved")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t("users.approve") || "Aprovar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openProcessDialog(request, "rejected")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t("users.reject") || "Rejeitar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={processDialog.open} onOpenChange={(open) => !open && setProcessDialog({ ...processDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processDialog.action === "approved" 
                ? (t("profileRequests.approveTitle") || "Aprovar Solicitação")
                : (t("profileRequests.rejectTitle") || "Rejeitar Solicitação")
              }
            </DialogTitle>
            <DialogDescription>
              {processDialog.request?.request_type === "email"
                ? (t("profileRequests.emailChangeDesc") || "O usuário solicitou alteração de email.")
                : (t("profileRequests.passwordChangeDesc") || "O usuário solicitou alteração de senha.")
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {processDialog.action === "approved" && processDialog.request?.request_type === "password" && (
              <div className="space-y-2">
                <Label>{t("profileRequests.newPassword") || "Nova Senha (opcional)"}</Label>
                <Input
                  type="password"
                  placeholder="Digite a nova senha..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("profileRequests.passwordNote") || "A alteração de senha deve ser feita manualmente no painel do backend."}
                </p>
              </div>
            )}

            {processDialog.action === "approved" && processDialog.request?.request_type === "email" && (
              <div className="space-y-2">
                <Label>{t("profileRequests.newEmail") || "Novo Email"}</Label>
                <Input
                  type="email"
                  placeholder="Digite o novo email..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("profileRequests.emailNote") || "A alteração de email deve ser feita manualmente no painel do backend."}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("profileRequests.adminNotes") || "Observações (opcional)"}</Label>
              <Textarea
                placeholder="Adicione uma observação..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog({ ...processDialog, open: false })}>
              {t("common.cancel") || "Cancelar"}
            </Button>
            <Button
              onClick={handleProcess}
              className={processDialog.action === "approved" ? "bg-success hover:bg-success/90" : ""}
              variant={processDialog.action === "rejected" ? "destructive" : "default"}
            >
              {processDialog.action === "approved" 
                ? (t("users.approve") || "Aprovar")
                : (t("users.reject") || "Rejeitar")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}