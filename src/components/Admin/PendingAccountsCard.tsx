import { useState } from 'react';
import { Instagram, Youtube, Music2, Check, X, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingAccounts, useApproveAccount, useRejectAccount } from '@/hooks/usePendingAccounts';

const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

const platformColors = {
  instagram: 'text-pink-500',
  youtube: 'text-red-500',
  tiktok: 'text-foreground',
};

export function PendingAccountsCard() {
  const { data: accounts = [], isLoading } = usePendingAccounts();
  const approveAccount = useApproveAccount();
  const rejectAccount = useRejectAccount();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (accountId: string, platform: string) => {
    setProcessingId(accountId);
    try {
      await approveAccount.mutateAsync({ accountId, platform });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (accountId: string, platform: string) => {
    setProcessingId(accountId);
    try {
      await rejectAccount.mutateAsync({ accountId, platform });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contas Pendentes</CardTitle>
          <CardDescription>Contas aguardando aprovação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Contas Pendentes</span>
          {accounts.length > 0 && (
            <Badge variant="secondary">{accounts.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>Contas de redes sociais aguardando aprovação</CardDescription>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conta pendente de aprovação
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const Icon = platformIcons[account.platform as keyof typeof platformIcons] || User;
              const colorClass = platformColors[account.platform as keyof typeof platformColors] || '';
              const isProcessing = processingId === account.id;

              return (
                <div
                  key={`${account.platform}-${account.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={account.profile_image_url || undefined} />
                      <AvatarFallback>
                        <Icon className={`h-5 w-5 ${colorClass}`} />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">@{account.username}</span>
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Clipper: {account.owner_username || 'Desconhecido'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(account.id, account.platform)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(account.id, account.platform)}
                      disabled={isProcessing}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
