import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [checking, setChecking] = useState(true);
  const email = localStorage.getItem("pending_email");

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!email) {
        navigate("/auth");
        return;
      }

      // Verificar se o usuário já foi aprovado (existe em auth)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Usuário foi aprovado e já está logado
        localStorage.removeItem("pending_email");
        navigate("/");
        return;
      }

      // Verificar se ainda está na tabela pending_users
      const { data: pendingUser } = await supabase
        .from("pending_users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      // Se não está mais na tabela pending_users e não foi aprovado, foi rejeitado
      if (!pendingUser && !user) {
        localStorage.removeItem("pending_email");
        navigate("/auth");
        return;
      }

      setChecking(false);
    };

    checkApprovalStatus();

    // Configurar Realtime para ouvir mudanças na tabela pending_users
    const channel = supabase
      .channel('pending-approval-changes')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pending_users',
        },
        async (payload) => {
          console.log('Usuário removido da fila de pendentes:', payload);
          
          // Verificar se o email deletado é o nosso
          const deletedEmail = (payload.old as any)?.email;
          if (deletedEmail !== email) return;
          
          // Verificar se foi aprovado tentando fazer login
          // (o admin criou o usuário com a senha que estava armazenada)
          setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              // Foi aprovado e já está autenticado
              localStorage.removeItem("pending_email");
              navigate("/");
            } else {
              // Foi rejeitado, redirecionar para login
              localStorage.removeItem("pending_email");
              navigate("/auth");
            }
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

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
              {t("pending.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pending.subtitle")}
            </p>
          </div>

          {/* Email */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              {t("pending.registered_for")}
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
                <p className="font-medium text-foreground">{t("pending.submitted")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("pending.submitted_desc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("pending.under_review")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("pending.under_review_desc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm opacity-50">
              <div className="mt-0.5">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("pending.access_granted")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("pending.access_granted_desc")}
                </p>
              </div>
            </div>
          </div>

          {/* Info adicional */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-center text-muted-foreground">
              {t("pending.auto_update")}
            </p>
          </div>

          {/* Ações */}
          <div className="space-y-2">
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="w-full"
            >
              {t("pending.back_to_login")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
