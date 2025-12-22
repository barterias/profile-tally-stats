import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Eye, Lock, Mail, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSelector } from "@/components/LanguageSelector";
import logo from "@/assets/logo-transparent.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: t("auth.error") || "Erro",
        description: t("auth.enter_email") || "Digite seu email primeiro",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      // Use the RPC function that handles unauthenticated requests
      await supabase.rpc("request_password_reset", { p_email: email });

      // Always show success for security (don't reveal if email exists)
      toast({
        title: t("auth.forgot_password_sent") || "Solicitação Enviada",
        description: t("auth.forgot_password_desc") || "Se o email existir, um administrador irá aprovar sua solicitação de troca de senha.",
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({
        title: t("auth.forgot_password_sent") || "Solicitação Enviada",
        description: t("auth.forgot_password_desc") || "Se o email existir, um administrador irá aprovar sua solicitação de troca de senha.",
      });
      setShowForgotPassword(false);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const redirectByRole = async (userId: string) => {
    // Check ALL user roles (user can have multiple roles)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const roles = rolesData?.map(r => r.role) || [];
    const hasAdmin = roles.includes('admin');
    const hasClient = roles.includes('client');

    // Check if user owns any campaigns (also makes them a client)
    const { data: ownerData } = await supabase
      .from('campaign_owners')
      .select('campaign_id')
      .eq('user_id', userId);

    const isOwner = ownerData && ownerData.length > 0;

    console.log('Role check:', { userId, roles, hasAdmin, hasClient, isOwner });

    if (hasAdmin) {
      navigate('/dashboard/admin');
    } else if (hasClient || isOwner) {
      navigate('/dashboard/client');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
        if (result.error) {
          if (result.error.message === "pending_approval") {
            navigate("/pending-approval");
            return;
          }
          throw result.error;
        }
        toast({
          title: t("auth.login_success"),
          description: t("auth.welcome_back"),
        });
        
        // Redirect based on role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await redirectByRole(user.id);
        } else {
          navigate('/');
        }
      } else {
        result = await signUp(email, password, username);
        if (result.error) {
          throw result.error;
        }
        toast({
          title: t("auth.signup_success"),
          description: t("auth.await_approval"),
        });
        navigate("/pending-approval");
      }
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message || t("auth.generic_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <img src={logo} alt="ORDOJG" className="h-24 w-24 object-contain" />
                <h1 className="text-5xl font-bold text-silver-shine">
                  ORDO JG
                </h1>
              </div>
              
              <p className="text-xl text-muted-foreground">
                {t("brand.tagline")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-3 rounded-full bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t("brand.epic_competitions")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("brand.epic_competitions_desc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-3 rounded-full bg-primary/10">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t("brand.detailed_analysis")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("brand.detailed_analysis_desc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md glass-card border-2 shadow-2xl">
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center justify-center mb-4 lg:hidden">
                  <img src={logo} alt="ORDOJG" className="h-16 w-16 object-contain" />
                </div>
                <CardTitle className="text-3xl font-bold text-center text-glow">
                  {t("auth.welcome")}
                </CardTitle>
                <CardDescription className="text-center text-base">
                  {t("auth.subtitle")}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="login" onValueChange={(v) => setIsLogin(v === "login")}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {t("auth.login")}
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {t("auth.signup")}
                    </TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <TabsContent value="login" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t("auth.email")}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password" className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          {t("auth.password")}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 text-base premium-gradient group"
                        disabled={loading}
                      >
                        {loading ? (
                          t("auth.logging_in")
                        ) : (
                          <>
                            {t("auth.login")}
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="w-full text-sm text-primary hover:underline text-center"
                      >
                        {t("auth.forgot_password") || "Esqueci minha senha"}
                      </button>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("auth.username")}
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="your_username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t("auth.email")}
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          {t("auth.password")}
                        </Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 text-base premium-gradient group"
                        disabled={loading}
                      >
                        {loading ? (
                          t("auth.creating")
                        ) : (
                          <>
                            {t("auth.signup")}
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </TabsContent>
                  </form>
                </Tabs>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground">
                    {t("auth.terms")}{" "}
                    <a href="#" className="text-primary hover:underline">
                      {t("auth.terms_of_service")}
                    </a>{" "}
                    {t("auth.and")}{" "}
                    <a href="#" className="text-primary hover:underline">
                      {t("auth.privacy_policy")}
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.forgot_password") || "Esqueci minha senha"}</DialogTitle>
            <DialogDescription>
              {t("auth.forgot_password_instructions") || "Digite seu email para solicitar a troca de senha. Um administrador irá aprovar sua solicitação."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">{t("auth.email") || "Email"}</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForgotPassword(false)}>
              {t("common.cancel") || "Cancelar"}
            </Button>
            <Button onClick={handleForgotPassword} disabled={forgotPasswordLoading}>
              {forgotPasswordLoading ? (t("auth.sending") || "Enviando...") : (t("auth.send_request") || "Enviar Solicitação")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
