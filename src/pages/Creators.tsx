import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function CreatorsContent() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    platform: "tiktok",
    username: "",
    profileUrl: "",
    avatarUrl: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { signOut, isAdmin } = useAuth();

  const { data: creators } = useQuery({
    queryKey: ["creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("total_views", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addCreatorMutation = useMutation({
    mutationFn: async (creator: any) => {
      const { error } = await supabase.from("creators").insert([creator]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creators"] });
      toast({ title: "Criador adicionado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar criador", description: error.message, variant: "destructive" });
    },
  });

  const updateCreatorMutation = useMutation({
    mutationFn: async ({ id, ...creator }: any) => {
      const { error } = await supabase.from("creators").update(creator).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creators"] });
      toast({ title: "Criador atualizado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar criador", description: error.message, variant: "destructive" });
    },
  });

  const deleteCreatorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("creators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creators"] });
      toast({ title: "Criador removido com sucesso!" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      platform: "tiktok",
      username: "",
      profileUrl: "",
      avatarUrl: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const creatorData = {
      name: formData.name,
      platform: formData.platform,
      username: formData.username,
      profile_url: formData.profileUrl || null,
      avatar_url: formData.avatarUrl || null,
    };

    if (editingId) {
      updateCreatorMutation.mutate({ id: editingId, ...creatorData });
    } else {
      addCreatorMutation.mutate(creatorData);
    }
  };

  const handleEdit = (creator: any) => {
    setEditingId(creator.id);
    setFormData({
      name: creator.name,
      platform: creator.platform,
      username: creator.username,
      profileUrl: creator.profile_url || "",
      avatarUrl: creator.avatar_url || "",
    });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <nav className="border-b border-white/10 bg-card-dark/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <div className="flex gap-2">
              <NavLink to="/">Rankings</NavLink>
              {isAdmin && <NavLink to="/admin">Gerenciar Vídeos</NavLink>}
              {isAdmin && <NavLink to="/creators">Criadores</NavLink>}
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Criadores</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Criador
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card-dark border-white/10">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Adicionar"} Criador</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>URL do Perfil</Label>
                  <Input value={formData.profileUrl} onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>URL do Avatar</Label>
                  <Input value={formData.avatarUrl} onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })} />
                </div>

                <Button type="submit" className="w-full bg-gradient-primary" disabled={addCreatorMutation.isPending || updateCreatorMutation.isPending}>
                  {editingId ? "Atualizar" : "Adicionar"} Criador
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creators?.map((creator) => (
            <Card key={creator.id} className="bg-card-dark border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3 items-center flex-1">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                        {creator.name[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{creator.name}</h3>
                      <p className="text-sm text-muted-foreground">@{creator.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(creator)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCreatorMutation.mutate(creator.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Views:</span>
                    <span className="font-semibold text-foreground">{creator.total_views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Vídeos:</span>
                    <span className="font-semibold text-foreground">{creator.total_videos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plataforma:</span>
                    <span className="font-semibold text-foreground capitalize">{creator.platform}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Creators() {
  return (
    <ProtectedRoute requireAdmin>
      <CreatorsContent />
    </ProtectedRoute>
  );
}
