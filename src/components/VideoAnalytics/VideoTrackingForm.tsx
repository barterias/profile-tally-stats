import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { n8nWebhook } from "@/lib/externalSupabase";

interface VideoTrackingFormProps {
  onVideoTracked: () => void;
}

export const VideoTrackingForm = ({ onVideoTracked }: VideoTrackingFormProps) => {
  const [link, setLink] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!link.trim()) {
      toast.error("Por favor, insira um link válido");
      return;
    }

    if (!link.includes("instagram.com") && !link.includes("tiktok.com")) {
      toast.error("Por favor, insira um link do Instagram ou TikTok");
      return;
    }

    setIsTracking(true);

    try {
      // Enviar para o webhook do n8n
      await n8nWebhook.trackVideo(link);
      
      toast.success("Vídeo enviado para rastreamento! Aguarde alguns segundos...");
      
      // Aguardar 3 segundos para o webhook processar
      setTimeout(() => {
        onVideoTracked();
        setIsTracking(false);
      }, 3000);
      
    } catch (error) {
      console.error("Erro ao rastrear vídeo:", error);
      toast.error("Erro ao rastrear vídeo. Tente novamente.");
      setIsTracking(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card/95 to-card/80 border-border/40 shadow-lg hover:shadow-primary/10 transition-all duration-300">
      <CardContent className="pt-8 pb-6 px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <label className="text-base font-semibold text-foreground">
                  Rastrear Vídeo do Instagram ou TikTok
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cole o link do Reels ou TikTok para análise completa de métricas
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  type="url"
                  placeholder="https://www.instagram.com/reel/... ou https://www.tiktok.com/@..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={isTracking}
                  className="h-12 pl-4 pr-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60 rounded-lg transition-all"
                />
              </div>
              <Button
                type="submit"
                disabled={isTracking}
                className="h-12 px-8 bg-gradient-to-r from-primary via-primary to-accent hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] font-semibold shadow-lg shadow-primary/25 transition-all duration-200"
              >
                {isTracking ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  "Analisar Vídeo"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
