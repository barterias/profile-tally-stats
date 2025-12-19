import { useState } from 'react';
import { Instagram, Youtube, Music2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddAccountModalProps {
  platform: 'instagram' | 'youtube' | 'tiktok';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (username: string) => void;
  isLoading?: boolean;
}

const platformConfig = {
  instagram: {
    icon: Instagram,
    title: 'Adicionar Conta do Instagram',
    description: 'Digite o nome de usuário da conta que deseja monitorar',
    placeholder: '@username',
    label: 'Nome de usuário',
  },
  youtube: {
    icon: Youtube,
    title: 'Adicionar Canal do YouTube',
    description: 'Digite o nome do canal ou handle que deseja monitorar',
    placeholder: '@channel ou nome do canal',
    label: 'Canal',
  },
  tiktok: {
    icon: Music2,
    title: 'Adicionar Conta do TikTok',
    description: 'Digite o nome de usuário da conta que deseja monitorar',
    placeholder: '@username',
    label: 'Nome de usuário',
  },
};

export function AddAccountModal({
  platform,
  open,
  onOpenChange,
  onAdd,
  isLoading,
}: AddAccountModalProps) {
  const [username, setUsername] = useState('');
  const config = platformConfig[platform];
  const Icon = config.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      // Remove @ if present
      const cleanUsername = username.trim().replace(/^@/, '');
      onAdd(cleanUsername);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUsername('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">{config.label}</Label>
              <Input
                id="username"
                placeholder={config.placeholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!username.trim() || isLoading}>
              {isLoading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
