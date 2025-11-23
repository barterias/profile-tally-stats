import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Zap, Eye, TrendingUp, Lock, Mail, User, ArrowRight } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
          title: "Login realizado!",
          description: "Bem-vindo de volta!",
        });
        navigate("/");
      } else {
        result = await signUp(email, password, username);
        if (result.error) {
          throw result.error;
        }
        toast({
          title: "Cadastro enviado!",
          description: "Aguarde aprovação do administrador.",
        });
        navigate("/pending-approval");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
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
                <div className="relative">
                  <Zap className="h-16 w-16 text-primary" />
                  <div className="absolute inset-0 animate-pulse-glow">
                    <Zap className="h-16 w-16 text-primary opacity-50" />
                  </div>
                </div>
                <h1 className="text-5xl font-bold text-glow-lg">
                  Clipper Pro League
                </h1>
              </div>
              
              <p className="text-xl text-muted-foreground">
                A plataforma definitiva para competições de criadores de conteúdo
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-3 rounded-full bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Competições Épicas</h3>
                  <p className="text-sm text-muted-foreground">
                    Participe de campeonatos e mostre seu talento
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Ranking em Tempo Real</h3>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe sua posição e métricas ao vivo
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-3 rounded-full bg-primary/10">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Análise Detalhada</h3>
                  <p className="text-sm text-muted-foreground">
                    Dashboard completo com todas suas estatísticas
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
                  <Zap className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold text-center text-glow">
                  Bem-vindo
                </CardTitle>
                <CardDescription className="text-center text-base">
                  Entre ou crie sua conta para começar
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="login" onValueChange={(v) => setIsLogin(v === "login")}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Criar Conta
                    </TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <TabsContent value="login" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password" className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Senha
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
                          "Entrando..."
                        ) : (
                          <>
                            Entrar
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nome de Usuário
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="seu_username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Senha
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
                          "Criando conta..."
                        ) : (
                          <>
                            Criar Conta
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </TabsContent>
                  </form>
                </Tabs>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground">
                    Ao continuar, você concorda com nossos{" "}
                    <a href="#" className="text-primary hover:underline">
                      Termos de Serviço
                    </a>{" "}
                    e{" "}
                    <a href="#" className="text-primary hover:underline">
                      Política de Privacidade
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
