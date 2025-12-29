import { useState } from 'react';
import { Instagram, Loader2, CheckCircle2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { instagramApi } from '@/lib/api/instagram';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface LinkProfessionalAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkProfessionalAccountModal({
  open,
  onOpenChange,
}: LinkProfessionalAccountModalProps) {
  const [username, setUsername] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleConnect = async () => {
    if (!username.trim()) {
      setError('Por favor, insira um nome de usuário válido.');
      return;
    }

    if (!user?.id) {
      setError('Você precisa estar logado para vincular uma conta.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Remove @ se o usuário incluir
      const cleanUsername = username.trim().replace(/^@/, '');
      
      const result = await instagramApi.addAccount(cleanUsername, user.id, true);
      
      if (result.success) {
        toast.success('Conta vinculada com sucesso!', {
          description: `@${cleanUsername} foi adicionada e está sendo sincronizada.`
        });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['all-instagram-accounts'] });
        setUsername('');
        onOpenChange(false);
      } else {
        setError(result.error || 'Erro ao vincular conta. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao vincular conta:', err);
      setError('Erro ao vincular conta. Verifique o username e tente novamente.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleConnect();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Vincular Conta Instagram
          </DialogTitle>
          <DialogDescription>
            Adicione sua conta Instagram para acompanhar métricas e estatísticas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="font-medium text-sm">Como funciona:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Insira seu nome de usuário do Instagram</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Suas métricas serão sincronizadas automaticamente</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Dados atualizados periodicamente</span>
              </li>
            </ul>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="instagram-username">Nome de usuário</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="instagram-username"
                placeholder="@seuusuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                disabled={isConnecting}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !username.trim()}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Vinculando conta...
              </>
            ) : (
              <>
                <Instagram className="h-5 w-5 mr-2" />
                Vincular Conta
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            A conta será adicionada e sincronizada automaticamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
