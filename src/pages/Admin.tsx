import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, UserCheck, UserX, AlertTriangle, Ban, CheckCircle, XCircle, Clock } from "lucide-react";
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

interface AdminUser {
  id: string;
  email: string;
  username: string;
  status: string;
  role: 'admin' | 'user';
  warning: string;
  date: string;
}

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_users_view');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, authLoading]);

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('approve_user', { pending_id: userId });
      if (error) throw error;
      
      toast.success('Usuário aprovado com sucesso!');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar usuário');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('reject_user', { pending_id: userId });
      if (error) throw error;
      
      toast.success('Usuário rejeitado');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar usuário');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('update_role', { 
        user_id: userId, 
        new_role: newRole 
      });
      if (error) throw error;
      
      toast.success(`Role atualizada para ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar role');
    }
  };

  const handleUpdateWarning = async (userId: string, newWarning: string) => {
    try {
      const { error } = await supabase.rpc('update_warning', { 
        user_id: userId, 
        new_warning: newWarning 
      });
      if (error) throw error;
      
      toast.success('Advertência atualizada');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar advertência');
    }
  };

  const openConfirmDialog = (title: string, description: string, action: () => void) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você precisa ser administrador para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
          </div>
        </div>

        {/* Usuários Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Usuários Pendentes ({pendingUsers.length})
            </CardTitle>
            <CardDescription>Novos usuários aguardando aprovação</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário pendente</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{new Date(user.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(user.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => 
                            openConfirmDialog(
                              "Rejeitar Usuário",
                              `Tem certeza que deseja rejeitar ${user.username}?`,
                              () => handleReject(user.id)
                            )
                          }
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Usuários Ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Usuários Ativos ({activeUsers.length})
            </CardTitle>
            <CardDescription>Gerenciar usuários aprovados do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.warning === 'warning' && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Advertido
                          </Badge>
                        )}
                        {user.warning === 'suspension' && (
                          <Badge variant="destructive">
                            <Ban className="h-3 w-3 mr-1" />
                            Suspenso
                          </Badge>
                        )}
                        {user.status === 'banned' && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Banido
                          </Badge>
                        )}
                        {user.warning === 'none' && user.status === 'approved' && (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          {user.role === 'user' && user.status !== 'banned' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateRole(user.id, 'admin')}
                              className="text-xs"
                            >
                              ↑ Admin
                            </Button>
                          )}
                          {user.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => 
                                openConfirmDialog(
                                  "Remover Admin",
                                  `Deseja remover privilégios de admin de ${user.username}?`,
                                  () => handleUpdateRole(user.id, 'user')
                                )
                              }
                              className="text-xs"
                            >
                              ↓ User
                            </Button>
                          )}
                          {user.status !== 'banned' && user.warning === 'none' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateWarning(user.id, 'warning')}
                              className="text-xs border-yellow-500 text-yellow-600"
                            >
                              ⚠ Advertir
                            </Button>
                          )}
                          {user.warning === 'warning' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => 
                                openConfirmDialog(
                                  "Suspender Usuário",
                                  `Deseja suspender ${user.username}?`,
                                  () => handleUpdateWarning(user.id, 'suspension')
                                )
                              }
                              className="text-xs border-orange-500 text-orange-600"
                            >
                              🔒 Suspender
                            </Button>
                          )}
                          {(user.warning === 'warning' || user.warning === 'suspension') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateWarning(user.id, 'none')}
                              className="text-xs border-green-500 text-green-600"
                            >
                              ✓ Limpar
                            </Button>
                          )}
                          {user.status !== 'banned' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => 
                                openConfirmDialog(
                                  "Banir Usuário",
                                  `ATENÇÃO: Deseja banir permanentemente ${user.username}?`,
                                  () => handleUpdateRole(user.id, 'banned')
                                )
                              }
                              className="text-xs"
                            >
                              🚫 Banir
                            </Button>
                          )}
                          {user.status === 'banned' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateRole(user.id, 'user')}
                              className="text-xs border-green-500 text-green-600"
                            >
                              ✓ Desbanir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Confirmação */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
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
    </AppLayout>
  );
}
