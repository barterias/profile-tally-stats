import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { GlowCard } from "@/components/ui/GlowCard";
import { 
  Save, 
  Mail,
  User,
  Shield,
  Lock,
  Trash2
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    email: user?.email || "",
    avatar_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        username: data.username || "",
        email: user?.email || "",
        avatar_url: data.avatar_url || "",
      });
    }
  };

  const handleAvatarUpload = async (url: string) => {
    setProfile({ ...profile, avatar_url: url });
    
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user?.id);

    if (error) {
      toast.error(t('error'));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          username: profile.username,
          avatar_url: profile.avatar_url 
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success(t('profileUpdated'));
    } catch (error: any) {
      toast.error(t('error') + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
            {t('myProfile')}
          </h1>
          <p className="text-muted-foreground">
            {t('manageProfile')}
          </p>
        </div>

        {/* Profile Card */}
        <GlowCard className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-3">
              <ImageUpload
                bucket="avatars"
                folder={user?.id || "unknown"}
                currentImageUrl={profile.avatar_url}
                onUpload={handleAvatarUpload}
                type="avatar"
              />
              <span className="text-xs text-muted-foreground">
                {t('clickToChange')}
              </span>
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {t('username')}
                  </Label>
                  <Input
                    id="username"
                    placeholder={t('username')}
                    value={profile.username}
                    onChange={(e) =>
                      setProfile({ ...profile, username: e.target.value })
                    }
                    className="bg-background/50 border-border/50 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    {t('email')}
                  </Label>
                  <Input 
                    id="email" 
                    value={profile.email} 
                    disabled 
                    className="bg-muted/30 text-muted-foreground"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? t('saving') : t('saveChanges')}
              </Button>
            </div>
          </div>
        </GlowCard>

        {/* Account Settings */}
        <GlowCard className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('accountSettings')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t('changeEmail') || 'Alterar Email'}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('changeEmailDesc') || 'Solicite a alteração do seu email'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border/50"
                onClick={() => {
                  toast.info(t('changeEmailRequest') || 'Solicitação enviada! Um administrador entrará em contato.');
                }}
              >
                {t('request') || 'Solicitar'}
              </Button>
            </div>
            
            <Separator className="bg-border/30" />
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t('changePassword') || 'Alterar Senha'}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('changePasswordDesc') || 'Solicite a alteração da sua senha'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border/50"
                onClick={() => {
                  toast.info(t('changePasswordRequest') || 'Solicitação enviada! Um administrador irá autorizar a alteração.');
                }}
              >
                {t('request') || 'Solicitar'}
              </Button>
            </div>
            
            <Separator className="bg-border/30" />
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{t('deleteAccount')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('deleteAccountDesc')}
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm">
                {t('delete')}
              </Button>
            </div>
          </div>
        </GlowCard>
      </div>
    </MainLayout>
  );
}