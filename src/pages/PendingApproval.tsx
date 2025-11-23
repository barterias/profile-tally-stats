import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingApproval() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const email = localStorage.getItem("pending_email");

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!email) {
        navigate("/auth");
        return;
      }

      // Verificar se o usuário já foi aprovado (existe em profiles)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Usuário foi aprovado e já está logado
        navigate("/");
        return;
      }

      setChecking(false);
    };

    checkApprovalStatus();

    // Verificar a cada 5 segundos
    const interval = setInterval(checkApprovalStatus, 5000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("pending_email");
    navigate("/auth");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4">
      <div className="max-w-md w-full">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-8 space-y-6">
          {/* Icon animado */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-primary/10 p-4 rounded-full">
                <Clock className="h-16 w-16 text-primary animate-pulse" />
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Aguardando Aprovação
            </h1>
            <p className="text-muted-foreground">
              Seu cadastro foi recebido com sucesso!
            </p>
          </div>

          {/* Email */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              Cadastro realizado para:
            </p>
            <p className="text-center font-semibold mt-1 text-foreground">
              {email}
            </p>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Cadastro enviado</p>
                <p className="text-muted-foreground text-xs">
                  Suas informações foram recebidas
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-medium text-foreground">Em análise</p>
                <p className="text-muted-foreground text-xs">
                  Um administrador revisará seu cadastro em breve
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm opacity-50">
              <div className="mt-0.5">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Acesso liberado</p>
                <p className="text-muted-foreground text-xs">
                  Você receberá acesso após aprovação
                </p>
              </div>
            </div>
          </div>

          {/* Info adicional */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-center text-muted-foreground">
              Esta página irá atualizar automaticamente quando seu cadastro for aprovado.
            </p>
          </div>

          {/* Ações */}
          <div className="space-y-2">
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="w-full"
            >
              Voltar para Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}