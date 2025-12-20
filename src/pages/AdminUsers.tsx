import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Building2,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { ClientCampaignModal } from "@/components/Admin/ClientCampaignModal";
import { ProfileChangeRequestsCard } from "@/components/Admin/ProfileChangeRequestsCard";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  status: string;
  role: "admin" | "client" | "user";
  warning: string;
  date: string;
}

function AdminUsersContent() {
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });
  const [clientModal, setClientModal] = useState<{
    open: boolean;
    userId: string;
    username: string;
  }>({ open: false, userId: "", username: "" });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_users_view");

      if (error) throw error;

      const uniqueUsers = Array.from(
        new Map((data || []).map((user) => [user.id, user])).values()
      );

      setUsers(uniqueUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error(t("users.error_loading"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("approve-user", {
        body: { pendingId: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(t("users.user_approved"));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t("users.error_approving"));
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.rpc("reject_user", { pending_id: userId });
      if (error) throw error;

      toast.success(t("users.user_rejected"));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t("users.error_rejecting"));
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("update_role", {
        p_user_id: userId,
        p_new_role: newRole,
      } as any);
      if (error) throw error;

      toast.success(`${t("users.role_updated")} ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t("users.error_updating_role"));
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      const { error } = await supabase.rpc("ban_user", {
        p_user_id: userId,
      } as any);
      if (error) throw error;

      toast.success(t("users.user_banned"));
      
      // Remove banned user from the list immediately
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error: any) {
      toast.error(error.message || t("users.error_banning"));
    }
  };


  const openConfirmDialog = (title: string, description: string, action: () => void) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  const pendingUsers = users.filter((u) => u.status === "pending");
  const activeUsers = users.filter((u) => u.status !== "pending");

  const filteredPending = pendingUsers.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActive = activeUsers.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, role: string) => {
    if (role === "admin") {
      return <Badge className="bg-primary">{t("status.admin")}</Badge>;
    }
    if (role === "client") {
      return <Badge className="bg-blue-500">{t("status.client")}</Badge>;
    }
    if (role === "user") {
      return <Badge className="bg-orange-500">{t("status.clipper") || "Clipper"}</Badge>;
    }
    if (status === "banned") {
      return <Badge variant="destructive">{t("status.banned")}</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="secondary">{t("status.pending")}</Badge>;
    }
    return <Badge className="bg-success">{t("status.active")}</Badge>;
  };

  const openClientModal = (userId: string, username: string) => {
    setClientModal({ open: true, userId, username });
  };

  const formatDate = (dateString: string, formatStr: string = "MM/dd/yyyy HH:mm") => {
    return format(new Date(dateString), formatStr, { locale: enUS });
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-glow">{t("users.manage_users")}</h1>
              <p className="text-muted-foreground">
                {users.length} {t("users.users_count")} • {pendingUsers.length} {t("users.pending_count")}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Change Requests */}
        <ProfileChangeRequestsCard />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("users.search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("users.pending_tab")}
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t("users.active_tab")} ({activeUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Users */}
          <TabsContent value="pending">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>{t("users.awaiting_approval")}</CardTitle>
                <CardDescription>
                  {t("users.new_registrations")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPending.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                    <p className="text-muted-foreground">
                      {t("users.no_pending_users")}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("users.user")}</TableHead>
                        <TableHead>{t("users.email")}</TableHead>
                        <TableHead>{t("users.date")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {formatDate(user.date)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90"
                                onClick={() =>
                                  openConfirmDialog(
                                    t("users.approve_user_question"),
                                    `${user.username} ${t("users.approve_user_desc")}`,
                                    () => handleApprove(user.id)
                                  )
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t("users.approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  openConfirmDialog(
                                    t("users.reject_user_question"),
                                    `${t("users.reject_user_desc")} ${user.username}`,
                                    () => handleReject(user.id)
                                  )
                                }
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {t("users.reject")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Users */}
          <TabsContent value="active">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>{t("users.active_users")}</CardTitle>
                <CardDescription>
                  {t("users.manage_approved")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("users.user")}</TableHead>
                      <TableHead>{t("users.email")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("users.member_since")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActive.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {getStatusBadge(user.status, user.role)}
                        </TableCell>
                        <TableCell>
                          {formatDate(user.date, "MM/dd/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Make Clipper option */}
                              {user.role !== "user" && user.role !== "admin" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      t("users.make_clipper_question") || "Tornar Clipper?",
                                      `${user.username} ${t("users.make_clipper_desc") || "será convertido para Clipper"}`,
                                      () => handleUpdateRole(user.id, "user")
                                    )
                                  }
                                >
                                  <Scissors className="h-4 w-4 mr-2" />
                                  {t("users.make_clipper") || "Tornar Clipper"}
                                </DropdownMenuItem>
                              )}
                              {/* Make Client option */}
                              {user.role !== "admin" && (
                                <DropdownMenuItem
                                  onClick={() => openClientModal(user.id, user.username)}
                                >
                                  <Building2 className="h-4 w-4 mr-2" />
                                  {user.role === "client" ? t("users.edit_campaigns") : t("users.make_client")}
                                </DropdownMenuItem>
                              )}
                              {/* Make Admin option */}
                              {user.role !== "admin" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      t("users.promote_admin_question"),
                                      `${user.username} ${t("users.promote_admin_desc")}`,
                                      () => handleUpdateRole(user.id, "admin")
                                    )
                                  }
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {t("users.make_admin")}
                                </DropdownMenuItem>
                              )}
                              {/* Remove Admin option */}
                              {user.role === "admin" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      t("users.remove_admin_question"),
                                      `${user.username} ${t("users.remove_admin_desc")}`,
                                      () => handleUpdateRole(user.id, "user")
                                    )
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  {t("users.remove_admin")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  openConfirmDialog(
                                    t("users.ban_user_question"),
                                    `${user.username} ${t("users.ban_user_desc")}`,
                                    () => handleBanUser(user.id)
                                  )
                                }
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                {t("users.ban_user")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Client Campaign Modal */}
        <ClientCampaignModal
          open={clientModal.open}
          onOpenChange={(open) => setClientModal({ ...clientModal, open })}
          userId={clientModal.userId}
          username={clientModal.username}
          onSuccess={fetchUsers}
        />
      </div>
    </MainLayout>
  );
}

export default function AdminUsers() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminUsersContent />
    </ProtectedRoute>
  );
}
