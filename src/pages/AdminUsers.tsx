import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  status: string;
  role: "admin" | "user";
  warning: string;
  date: string;
}

function AdminUsersContent() {
  const { isAdmin } = useAuth();
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
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
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

      toast.success("Usuário aprovado com sucesso!");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar usuário");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.rpc("reject_user", { pending_id: userId });
      if (error) throw error;

      toast.success("Usuário rejeitado");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar usuário");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("update_role", {
        user_id: userId,
        new_role: newRole,
      });
      if (error) throw error;

      toast.success(`Role atualizada para ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar role");
    }
  };

  const handleUpdateWarning = async (userId: string, newWarning: string) => {
    try {
      const { error } = await supabase.rpc("update_warning", {
        user_id: userId,
        new_warning: newWarning,
      });
      if (error) throw error;

      toast.success("Advertência atualizada");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar advertência");
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
      return <Badge className="bg-primary">Admin</Badge>;
    }
    if (status === "banned") {
      return <Badge variant="destructive">Banido</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    return <Badge className="bg-success">Ativo</Badge>;
  };

  const getWarningBadge = (warning: string) => {
    if (warning === "none" || !warning) return null;
    if (warning === "yellow") {
      return (
        <Badge variant="outline" className="border-warning text-warning">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Advertência
        </Badge>
      );
    }
    if (warning === "red") {
      return (
        <Badge variant="outline" className="border-destructive text-destructive">
          <Ban className="h-3 w-3 mr-1" />
          Advertência Grave
        </Badge>
      );
    }
    return null;
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
              <h1 className="text-2xl font-bold text-glow">Gerenciar Usuários</h1>
              <p className="text-muted-foreground">
                {users.length} usuários • {pendingUsers.length} pendentes
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Ativos ({activeUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Users */}
          <TabsContent value="pending">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Usuários Aguardando Aprovação</CardTitle>
                <CardDescription>
                  Novos registros que precisam ser aprovados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPending.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum usuário pendente
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
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
                            {format(new Date(user.date), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90"
                                onClick={() =>
                                  openConfirmDialog(
                                    "Aprovar usuário?",
                                    `O usuário ${user.username} será aprovado e poderá acessar o sistema.`,
                                    () => handleApprove(user.id)
                                  )
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  openConfirmDialog(
                                    "Rejeitar usuário?",
                                    `O registro de ${user.username} será excluído permanentemente.`,
                                    () => handleReject(user.id)
                                  )
                                }
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
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
                <CardTitle>Usuários Ativos</CardTitle>
                <CardDescription>
                  Gerenciamento de usuários aprovados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Advertência</TableHead>
                      <TableHead>Membro desde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
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
                        <TableCell>{getWarningBadge(user.warning)}</TableCell>
                        <TableCell>
                          {format(new Date(user.date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role !== "admin" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      "Promover a Admin?",
                                      `${user.username} terá acesso total ao sistema.`,
                                      () => handleUpdateRole(user.id, "admin")
                                    )
                                  }
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Tornar Admin
                                </DropdownMenuItem>
                              )}
                              {user.role === "admin" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      "Remover Admin?",
                                      `${user.username} perderá privilégios de administrador.`,
                                      () => handleUpdateRole(user.id, "user")
                                    )
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Remover Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdateWarning(
                                    user.id,
                                    user.warning === "yellow" ? "red" : "yellow"
                                  )
                                }
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                {user.warning === "none"
                                  ? "Adicionar Advertência"
                                  : "Aumentar Advertência"}
                              </DropdownMenuItem>
                              {user.warning !== "none" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateWarning(user.id, "none")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Remover Advertência
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  openConfirmDialog(
                                    "Banir usuário?",
                                    `${user.username} não poderá mais acessar o sistema.`,
                                    () => handleUpdateRole(user.id, "banned")
                                  )
                                }
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Banir Usuário
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
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
