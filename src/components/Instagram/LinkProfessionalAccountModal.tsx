import { useState } from 'react';
import { Instagram, Loader2, AlertTriangle, Facebook, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LinkProfessionalAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkProfessionalAccountModal({
  open,
  onOpenChange,
}: LinkProfessionalAccountModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Meta OAuth URL for Instagram Business accounts
      const appId = import.meta.env.VITE_INSTAGRAM_APP_ID || '';
      const redirectUri = `${window.location.origin}/auth/instagram/callback`;
      const scope = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement';
      
      if (!appId) {
        setError('Configuração OAuth não encontrada. Entre em contato com o suporte.');
        setIsConnecting(false);
        return;
      }

      // Redirect to Facebook OAuth
      const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;
      
      window.location.href = oauthUrl;
    } catch (err) {
      setError('Erro ao iniciar conexão. Tente novamente.');
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Conectar Conta Profissional
          </DialogTitle>
          <DialogDescription>
            Vincule sua conta Instagram Business para acessar métricas avançadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Warning Alert */}
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong className="block mb-1">Requisitos Obrigatórios:</strong>
              Para fazer a conexão de sua conta profissional, você <strong>OBRIGATORIAMENTE</strong> precisa ter uma conta Facebook com uma página conectada à sua conta Instagram.
            </AlertDescription>
          </Alert>

          {/* Requirements List */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="font-medium text-sm">Antes de continuar, verifique:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Sua conta Instagram é <strong>Business</strong> ou <strong>Creator</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Você tem uma <strong>Página do Facebook</strong> vinculada à sua conta Instagram</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Você é <strong>administrador</strong> da Página do Facebook</span>
              </li>
            </ul>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Facebook className="h-5 w-5 mr-2" />
                Conectar com Facebook
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao clicar, você será redirecionado para o Facebook para autorizar a conexão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
