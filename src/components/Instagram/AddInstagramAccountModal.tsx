import { useState } from 'react';
import { Instagram, Loader2 } from 'lucide-react';
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
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onAdd(username.trim());
      setUsername('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Adicionar Conta do Instagram
          </DialogTitle>
          <DialogDescription>
            Digite o nome de usuário da conta que você deseja monitorar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
