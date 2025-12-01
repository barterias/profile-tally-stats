import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Clipper {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  status: string;
  applied_at: string;
  campaign_name?: string;
}

interface ClippersTableProps {
  clippers: Clipper[];
  showActions?: boolean;
  onRefresh?: () => void;
}

export function ClippersTable({ clippers, showActions = true, onRefresh }: ClippersTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (participantId: string) => {
    setLoading(participantId);
    try {
      const { error } = await supabase.rpc('approve_participant', { p_participant_id: participantId });
      if (error) throw error;
      toast.success('Clipador aprovado com sucesso!');
      onRefresh?.();
    } catch (error: any) {
      toast.error('Erro ao aprovar: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (participantId: string) => {
    setLoading(participantId);
    try {
      const { error } = await supabase.rpc('reject_participant', { p_participant_id: participantId });
      if (error) throw error;
      toast.success('Clipador rejeitado.');
      onRefresh?.();
    } catch (error: any) {
      toast.error('Erro ao rejeitar: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  if (clippers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum clipador encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Clipador</TableHead>
            {clippers[0]?.campaign_name && <TableHead>Campanha</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            {showActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clippers.map((clipper) => (
            <TableRow key={clipper.id} className="hover:bg-muted/20">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={clipper.avatar_url} />
                    <AvatarFallback>{clipper.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{clipper.username}</span>
                </div>
              </TableCell>
              {clipper.campaign_name && <TableCell>{clipper.campaign_name}</TableCell>}
              <TableCell>
                <StatusBadge status={clipper.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(clipper.applied_at).toLocaleDateString('pt-BR')}
              </TableCell>
              {showActions && clipper.status === 'requested' && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      onClick={() => handleApprove(clipper.id)}
                      disabled={loading === clipper.id}
                    >
                      {loading === clipper.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleReject(clipper.id)}
                      disabled={loading === clipper.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
              {showActions && clipper.status !== 'requested' && (
                <TableCell className="text-right text-muted-foreground">—</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
