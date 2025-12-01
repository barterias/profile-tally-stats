import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  bucket: "avatars" | "campaign-images";
  folder: string;
  currentImageUrl?: string | null;
  onUpload: (url: string) => void;
  type?: "avatar" | "cover";
  className?: string;
}

export function ImageUpload({
  bucket,
  folder,
  currentImageUrl,
  onUpload,
  type = "avatar",
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUpload(publicUrl.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (type === "avatar") {
    return (
      <div className={cn("relative group", className)}>
        <Avatar className="h-28 w-28 border-4 border-primary/30 ring-4 ring-primary/10">
          <AvatarImage src={currentImageUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Camera className="h-8 w-8 text-primary" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative group rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer",
        className
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      {currentImageUrl ? (
        <div className="relative aspect-video">
          <img
            src={currentImageUrl}
            alt="Campaign"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <div className="text-center">
                <Camera className="h-10 w-10 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium">Alterar imagem</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="aspect-video flex flex-col items-center justify-center p-8 bg-muted/30">
          {uploading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-3" />
              <span className="text-sm text-muted-foreground">
                Clique para enviar uma imagem
              </span>
              <span className="text-xs text-muted-foreground/70 mt-1">
                PNG, JPG até 5MB
              </span>
            </>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}