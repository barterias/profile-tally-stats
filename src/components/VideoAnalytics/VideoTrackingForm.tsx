import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { n8nWebhook } from "@/lib/externalSupabase";

interface VideoTrackingFormProps {
  onVideoTracked: (link: string) => void;
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

    if (!link.includes("instagram.com")) {
      toast.error("Por favor, insira um link do Instagram");
      return;
    }

    setIsTracking(true);

    try {
      // Enviar para o webhook do n8n
      await n8nWebhook.trackVideo(link);
      
      toast.success("Vídeo enviado para rastreamento! Aguarde alguns segundos...");
      
      // Aguardar 3 segundos para o webhook processar
      setTimeout(() => {
        onVideoTracked(link);
        setIsTracking(false);
      }, 3000);
      
    } catch (error) {
      console.error("Erro ao rastrear vídeo:", error);
      toast.error("Erro ao rastrear vídeo. Tente novamente.");
      setIsTracking(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Cole o link do Instagram Reels
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://www.instagram.com/reel/..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={isTracking}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
              <Button
                type="submit"
                disabled={isTracking}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 px-8"
              >
                {isTracking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rastreando...
                  </>
                ) : (
                  "Track Video"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
