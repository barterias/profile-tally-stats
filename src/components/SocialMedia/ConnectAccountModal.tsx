import { 
  Music, 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook, 
  Linkedin,
  Plus,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SocialPlatform } from '@/types/socialMedia';
import { cn } from '@/lib/utils';

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (platform: SocialPlatform) => void;
  isConnecting: boolean;
  connectedPlatforms: SocialPlatform[];
}

const platforms: Array<{
  id: SocialPlatform;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  description: string;
}> = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music,
    gradient: 'from-foreground to-muted-foreground',
    description: 'Conecte sua conta TikTok para monitorar views, curtidas e seguidores.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    gradient: 'from-purple-500 via-pink-500 to-orange-400',
    description: 'Monitore seu Instagram incluindo posts, stories e reels.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    gradient: 'from-red-600 to-red-500',
    description: 'Acompanhe inscritos, views e engajamento do seu canal.',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    gradient: 'from-foreground to-muted-foreground',
    description: 'Monitore seguidores, impressões e engajamento dos tweets.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    gradient: 'from-blue-600 to-blue-500',
    description: 'Acompanhe sua página do Facebook com métricas detalhadas.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    gradient: 'from-blue-700 to-blue-600',
    description: 'Monitore sua presença profissional e engajamento.',
  },
];

export function ConnectAccountModal({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
  connectedPlatforms,
}: ConnectAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Conectar Nova Conta
          </DialogTitle>
          <DialogDescription>
            Selecione a plataforma que deseja conectar. Você será redirecionado para autorizar o acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {platforms.map((platform) => {
            const isConnected = connectedPlatforms.includes(platform.id);
            const Icon = platform.icon;

            return (
              <button
                key={platform.id}
                onClick={() => !isConnected && onConnect(platform.id)}
                disabled={isConnecting || isConnected}
                className={cn(
                  "relative p-4 rounded-xl border transition-all duration-300 text-left group",
                  isConnected 
                    ? "border-success/30 bg-success/5 cursor-not-allowed"
                    : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
                )}
              >
                {/* Gradient background on hover */}
                <div className={cn(
                  "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br",
                  platform.gradient
                )} />

                <div className="relative flex items-start gap-3">
                  <div className={cn(
                    "p-2.5 rounded-lg bg-gradient-to-br shrink-0",
                    platform.gradient
                  )}>
                    <Icon className="h-5 w-5 text-background" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{platform.name}</h3>
                      {isConnected && (
                        <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                          Conectado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {platform.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Suas credenciais são armazenadas de forma segura e criptografada.
          Você pode desconectar a qualquer momento.
        </p>
      </DialogContent>
    </Dialog>
  );
}
