import { useState } from 'react';
import { Instagram, Loader2, Sparkles, User, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ConnectionMethod = 'select' | 'oauth' | 'username';

interface AddInstagramAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (username: string) => void;
  isLoading: boolean;
}

export function AddInstagramAccountModal({
  open,
  onOpenChange,
  onAdd,
  isLoading,
}: AddInstagramAccountModalProps) {
  const [method, setMethod] = useState<ConnectionMethod>('select');
  const [username, setUsername] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleClose = () => {
    setMethod('select');
    setUsername('');
    setOauthError(null);
    onOpenChange(false);
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onAdd(username.trim());
      setUsername('');
      setMethod('select');
    }
  };

  const handleOAuthConnect = async () => {
    setOauthLoading(true);
    setOauthError(null);
    
    try {
      // For now, Instagram OAuth requires Business account connected to a Facebook Page
      // We'll show instructions since Meta's API requires this setup
      setOauthError('Para usar conexão via OAuth, sua conta Instagram precisa ser Business ou Creator e estar conectada a uma Página do Facebook. Use a opção "Por Username" para contas pessoais.');
    } catch (error) {
      setOauthError('Erro ao conectar. Tente novamente ou use a opção por username.');
    } finally {
      setOauthLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <Card 
        className="cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50"
        onClick={() => setMethod('oauth')}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Conectar via Facebook</h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Acesso completo a insights e métricas detalhadas. Requer conta Business/Creator.
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Insights avançados
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Dados em tempo real
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50"
        onClick={() => setMethod('username')}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Por Username</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Funciona com qualquer conta pública. Dados coletados via scraping.
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Qualquer conta
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Sem login necessário
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderOAuthMethod = () => (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => { setMethod('select'); setOauthError(null); }}
        className="mb-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Voltar
      </Button>

      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Instagram className="h-8 w-8 text-white" />
        </div>
        
        <div>
          <h3 className="font-semibold text-lg">Conectar com Facebook</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse insights completos da sua conta Instagram Business
          </p>
        </div>

        {oauthError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2">
          <p className="font-medium">Requisitos:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Conta Instagram Business ou Creator</li>
            <li>Conta conectada a uma Página do Facebook</li>
          </ul>
        </div>

        <Button 
          onClick={handleOAuthConnect} 
          disabled={oauthLoading}
          className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90"
        >
          {oauthLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar com Facebook
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Não tem conta Business?{' '}
          <button 
            onClick={() => setMethod('username')} 
            className="text-primary hover:underline"
          >
            Use por username
          </button>
        </p>
      </div>
    </div>
  );

  const renderUsernameMethod = () => (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setMethod('select')}
        className="mb-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Voltar
      </Button>

      <form onSubmit={handleUsernameSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Nome de usuário</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">@</span>
            <Input
              id="username"
              placeholder="usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace('@', ''))}
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ex: @cristiano, @instagram
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Este método coleta dados públicos via scraping. Para insights avançados, use a conexão via Facebook.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={!username.trim() || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              'Adicionar'
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Adicionar Conta do Instagram
          </DialogTitle>
          <DialogDescription>
            {method === 'select' && 'Escolha como deseja conectar sua conta'}
            {method === 'oauth' && 'Conecte via Facebook para acesso completo'}
            {method === 'username' && 'Digite o nome de usuário da conta'}
          </DialogDescription>
        </DialogHeader>

        {method === 'select' && renderMethodSelection()}
        {method === 'oauth' && renderOAuthMethod()}
        {method === 'username' && renderUsernameMethod()}
      </DialogContent>
    </Dialog>
  );
}
