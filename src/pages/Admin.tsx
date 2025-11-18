import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function AdminContent() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    creatorId: "",
    title: "",
    videoUrl: "",
    thumbnailUrl: "",
    platform: "tiktok",
    views: "0",
    likes: "0",
    shares: "0",
    hashtags: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const { data: creators } = useQuery({
    queryKey: ["creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          creators (name, username, platform)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addVideoMutation = useMutation({
    mutationFn: async (video: any) => {
      const { error } = await supabase.from("videos").insert([video]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast({ title: "Vídeo adicionado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar vídeo", description: error.message, variant: "destructive" });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: async ({ id, ...video }: any) => {
      const { error } = await supabase.from("videos").update(video).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast({ title: "Vídeo atualizado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar vídeo", description: error.message, variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast({ title: "Vídeo removido com sucesso!" });
    },
  });

  const resetForm = () => {
    setFormData({
      creatorId: "",
      title: "",
      videoUrl: "",
      thumbnailUrl: "",
      platform: "tiktok",
      views: "0",
      likes: "0",
      shares: "0",
      hashtags: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const videoData = {
      creator_id: formData.creatorId,
      title: formData.title,
      video_url: formData.videoUrl,
      thumbnail_url: formData.thumbnailUrl || null,
      platform: formData.platform,
      views: parseInt(formData.views) || 0,
      likes: parseInt(formData.likes) || 0,
      shares: parseInt(formData.shares) || 0,
      hashtags: formData.hashtags.split(",").map(h => h.trim()).filter(Boolean),
      posted_at: new Date().toISOString(),
    };

    if (editingId) {
      updateVideoMutation.mutate({ id: editingId, ...videoData });
    } else {
      addVideoMutation.mutate(videoData);
    }
  };

  const handleEdit = (video: any) => {
    setEditingId(video.id);
    setFormData({
      creatorId: video.creator_id,
      title: video.title,
      videoUrl: video.video_url,
      thumbnailUrl: video.thumbnail_url || "",
      platform: video.platform,
      views: video.views.toString(),
      likes: video.likes.toString(),
      shares: video.shares.toString(),
      hashtags: video.hashtags?.join(", ") || "",
    });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <nav className="border-b border-white/10 bg-card-dark/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-foreground">Gerenciar Vídeos</h1>
            <div className="flex gap-2">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/creators">Creators</NavLink>
              <NavLink to="/admin">Adicionar Vídeo</NavLink>
              <NavLink to="/video-analytics">Análise de Vídeos</NavLink>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Vídeos</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Vídeo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card-dark border-white/10 max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Adicionar"} Vídeo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Criador</Label>
                  <Select value={formData.creatorId} onValueChange={(v) => setFormData({ ...formData, creatorId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um criador" />
                    </SelectTrigger>
                    <SelectContent>
                      {creators?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} (@{c.username})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>URL do Vídeo</Label>
                    <Input value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Thumbnail</Label>
                    <Input value={formData.thumbnailUrl} onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })} />
                  </div>
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
                    <Label>Hashtags (separadas por vírgula)</Label>
                    <Input value={formData.hashtags} onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })} placeholder="cortes, edits" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Views</Label>
                    <Input type="number" value={formData.views} onChange={(e) => setFormData({ ...formData, views: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Likes</Label>
                    <Input type="number" value={formData.likes} onChange={(e) => setFormData({ ...formData, likes: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Shares</Label>
                    <Input type="number" value={formData.shares} onChange={(e) => setFormData({ ...formData, shares: e.target.value })} />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-primary" disabled={addVideoMutation.isPending || updateVideoMutation.isPending}>
                  {editingId ? "Atualizar" : "Adicionar"} Vídeo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {videos?.map((video) => (
            <Card key={video.id} className="bg-card-dark border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    {video.thumbnail_url && (
                      <img src={video.thumbnail_url} alt={video.title} className="w-32 h-32 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">{video.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {(video.creators as any)?.name} • @{(video.creators as any)?.username}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{video.views.toLocaleString()} views</span>
                        <span>{video.likes.toLocaleString()} likes</span>
                        <span>{video.shares.toLocaleString()} shares</span>
                      </div>
                      {video.hashtags && video.hashtags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {video.hashtags.map((tag: string, i: number) => (
                            <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(video)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteVideoMutation.mutate(video.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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

export default function Admin() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}
