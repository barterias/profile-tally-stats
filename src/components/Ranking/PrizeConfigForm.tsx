import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Trophy, Medal, Award } from "lucide-react";
import { PrizeConfig } from "@/hooks/useCompetitionPrizes";

interface PrizeConfigFormProps {
  prizes: PrizeConfig[];
  onChange: (prizes: PrizeConfig[]) => void;
  totalPrizePool?: number;
}

export function PrizeConfigForm({ prizes, onChange, totalPrizePool = 0 }: PrizeConfigFormProps) {
  const [localPrizes, setLocalPrizes] = useState<PrizeConfig[]>(prizes);

  useEffect(() => {
    setLocalPrizes(prizes);
  }, [prizes]);

  const addPrize = () => {
    const newPosition = localPrizes.length + 1;
    const updated = [...localPrizes, { position: newPosition, prize_amount: 0 }];
    setLocalPrizes(updated);
    onChange(updated);
  };

  const removePrize = (position: number) => {
    const updated = localPrizes
      .filter(p => p.position !== position)
      .map((p, index) => ({ ...p, position: index + 1 }));
    setLocalPrizes(updated);
    onChange(updated);
  };

  const updatePrize = (position: number, amount: number) => {
    const updated = localPrizes.map(p => 
      p.position === position ? { ...p, prize_amount: amount } : p
    );
    setLocalPrizes(updated);
    onChange(updated);
  };

  const totalConfigured = localPrizes.reduce((sum, p) => sum + p.prize_amount, 0);

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-orange-500" />;
    return <span className="text-sm font-bold text-muted-foreground">{position}º</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Configuração de Prêmios por Posição</Label>
        {totalPrizePool > 0 && (
          <span className={`text-sm ${totalConfigured === totalPrizePool ? 'text-green-400' : 'text-yellow-400'}`}>
            R$ {totalConfigured.toFixed(2)} / R$ {totalPrizePool.toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {localPrizes.map((prize) => (
          <div 
            key={prize.position} 
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30"
          >
            <div className="w-10 flex justify-center">
              {getPositionIcon(prize.position)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={prize.prize_amount || ''}
                  onChange={(e) => updatePrize(prize.position, parseFloat(e.target.value) || 0)}
                  className="bg-background/50 border-border/50 max-w-[120px]"
                  placeholder="0.00"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removePrize(prize.position)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addPrize}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Posição
      </Button>

      {localPrizes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum prêmio configurado. Adicione posições para definir a premiação.
        </p>
      )}
    </div>
  );
}
