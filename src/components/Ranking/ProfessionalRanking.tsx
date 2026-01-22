import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Video,
  TrendingUp,
  Flame,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Trash2,
  Instagram,
  Youtube,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";

interface RankingVideo {
  id: string;
  video_link: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  username?: string;
  avatar_url?: string;
}

interface ProfessionalRankingProps {
  videos: RankingVideo[];
  title?: string;
  maxItems?: number;
  showActions?: boolean;
  onSync?: (video: RankingVideo) => void;
  onDelete?: (video: RankingVideo) => void;
  syncing?: boolean;
}

const MAX_ITEMS = 15;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const podiumVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
    },
  },
};

export function ProfessionalRanking({
  videos,
  title = "Ranking de Vídeos",
  maxItems = MAX_ITEMS,
  showActions = false,
  onSync,
  onDelete,
  syncing = false,
}: ProfessionalRankingProps) {
  const [sortBy, setSortBy] = useState<"views" | "engagement">("views");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedVideos = useMemo(() => {
    const sorted = [...videos].sort((a, b) => {
      if (sortBy === "views") {
        return (b.views || 0) - (a.views || 0);
      }
      const engA = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
      const engB = (b.likes || 0) + (b.comments || 0) + (b.shares || 0);
      return engB - engA;
    });
    return sorted.slice(0, Math.min(maxItems, MAX_ITEMS));
  }, [videos, sortBy, maxItems]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-300" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-500" />;
      default:
        return <span className="text-sm font-bold">{position}º</span>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "instagram":
        return <Instagram className="h-4 w-4 text-pink-400" />;
      case "tiktok":
        return <SiTiktok className="h-4 w-4 text-cyan-400" />;
      case "youtube":
        return <Youtube className="h-4 w-4 text-red-500" />;
      default:
        return <Video className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "instagram":
        return "from-pink-500/20 to-purple-500/20 border-pink-500/30";
      case "tiktok":
        return "from-cyan-500/20 to-pink-500/20 border-cyan-500/30";
      case "youtube":
        return "from-red-500/20 to-orange-500/20 border-red-500/30";
      default:
        return "from-muted/30 to-muted/10 border-border/30";
    }
  };

  const top3 = sortedVideos.slice(0, 3);
  const restOfList = sortedVideos.slice(3);

  if (videos.length === 0) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative inline-block"
        >
          <Trophy className="h-20 w-20 mx-auto text-muted-foreground/20" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4"
          >
            <Sparkles className="h-6 w-6 absolute top-0 right-0 text-primary/30" />
            <Sparkles className="h-4 w-4 absolute bottom-0 left-0 text-primary/20" />
          </motion.div>
        </motion.div>
        <p className="text-lg font-medium text-muted-foreground mt-6">
          Nenhum vídeo no ranking ainda
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Os vídeos submetidos aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Top {sortedVideos.length} participantes
            </p>
          </div>
        </div>

        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "views" | "engagement")}>
          <TabsList className="bg-muted/30 border border-border/50">
            <TabsTrigger
              value="views"
              className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              Views
            </TabsTrigger>
            <TabsTrigger
              value="engagement"
              className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Engajamento
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Podium - Top 3 */}
      {top3.length >= 3 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[1, 0, 2].map((orderIndex, displayIndex) => {
            const video = top3[orderIndex];
            if (!video) return null;
            const position = orderIndex + 1;
            const isFirst = position === 1;

            return (
              <motion.div
                key={video.id}
                variants={podiumVariants}
                whileHover={{ scale: 1.02, y: isFirst ? -8 : -4 }}
                className={cn(
                  "relative rounded-2xl border-2 p-4 transition-all duration-300 cursor-pointer",
                  "bg-gradient-to-b backdrop-blur-sm",
                  position === 1 &&
                    "from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/40 shadow-[0_0_30px_rgba(250,204,21,0.15)] -mt-4",
                  position === 2 &&
                    "from-slate-400/20 via-gray-400/10 to-transparent border-slate-400/40 shadow-[0_0_20px_rgba(148,163,184,0.1)]",
                  position === 3 &&
                    "from-amber-500/20 via-orange-500/10 to-transparent border-amber-600/40 shadow-[0_0_20px_rgba(217,119,6,0.1)]"
                )}
              >
                {/* Rank Badge */}
                <div
                  className={cn(
                    "absolute -top-4 left-1/2 -translate-x-1/2 p-2 rounded-full ring-2",
                    position === 1 && "bg-yellow-500/30 ring-yellow-400/50",
                    position === 2 && "bg-slate-400/30 ring-slate-400/50",
                    position === 3 && "bg-amber-500/30 ring-amber-500/50"
                  )}
                >
                  {getRankIcon(position)}
                </div>

                {/* Glow Effect for 1st */}
                {isFirst && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-t from-yellow-500/10 to-transparent pointer-events-none"
                  />
                )}

                <div className="text-center pt-4">
                  {/* Platform Badge */}
                  <div className="absolute top-2 right-2">
                    {getPlatformIcon(video.platform)}
                  </div>

                  {/* Avatar */}
                  <Avatar
                    className={cn(
                      "mx-auto mb-3 border-2 ring-2 transition-all",
                      isFirst ? "h-16 w-16" : "h-14 w-14",
                      position === 1 && "border-yellow-400/50 ring-yellow-400/30",
                      position === 2 && "border-slate-400/50 ring-slate-400/30",
                      position === 3 && "border-amber-500/50 ring-amber-500/30"
                    )}
                  >
                    <AvatarImage src={video.avatar_url} />
                    <AvatarFallback
                      className={cn(
                        "font-bold",
                        position === 1 && "bg-yellow-500/20 text-yellow-400",
                        position === 2 && "bg-slate-400/20 text-slate-300",
                        position === 3 && "bg-amber-500/20 text-amber-400"
                      )}
                    >
                      {video.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Username */}
                  <p
                    className={cn(
                      "font-bold truncate mb-2",
                      isFirst ? "text-base" : "text-sm"
                    )}
                  >
                    {video.username || "Anônimo"}
                  </p>

                  {/* Main Metric */}
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Eye className="h-4 w-4 text-green-400" />
                    <span className="font-bold text-lg text-green-400">
                      {formatNumber(video.views)}
                    </span>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-400" />
                      {formatNumber(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-blue-400" />
                      {formatNumber(video.comments)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Rest of the list */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <AnimatePresence>
          {restOfList.map((video, index) => {
            const position = index + 4;
            const isHovered = hoveredId === video.id;

            return (
              <motion.div
                key={video.id}
                variants={itemVariants}
                layout
                onHoverStart={() => setHoveredId(video.id)}
                onHoverEnd={() => setHoveredId(null)}
                className={cn(
                  "relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                  "hover:scale-[1.01] cursor-pointer group",
                  `bg-gradient-to-r ${getPlatformColor(video.platform)}`,
                  isHovered && "shadow-lg"
                )}
              >
                {/* Position */}
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center font-bold text-sm border border-border/50">
                  {position}º
                </div>

                {/* Platform */}
                <div className="hidden sm:flex">{getPlatformIcon(video.platform)}</div>

                {/* Avatar */}
                <Avatar className="h-10 w-10 border-2 border-primary/20 ring-1 ring-primary/10">
                  <AvatarImage src={video.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {video.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{video.username || "Anônimo"}</p>
                  <a
                    href={video.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver vídeo <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Eye className="h-3.5 w-3.5 text-green-400" />
                    <span className="font-bold text-sm text-green-400">
                      {formatNumber(video.views)}
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/50">
                    <Heart className="h-3 w-3 text-red-400" />
                    <span className="text-xs">{formatNumber(video.likes)}</span>
                  </div>

                  <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/50">
                    <MessageCircle className="h-3 w-3 text-blue-400" />
                    <span className="text-xs">{formatNumber(video.comments)}</span>
                  </div>

                  {video.shares > 0 && (
                    <div className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/50">
                      <Share2 className="h-3 w-3 text-purple-400" />
                      <span className="text-xs">{formatNumber(video.shares)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onSync && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSync(video);
                        }}
                        disabled={syncing}
                      >
                        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(video);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Footer Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-6 pt-4 border-t border-border/30"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {formatNumber(videos.reduce((sum, v) => sum + (v.views || 0), 0))}
          </p>
          <p className="text-xs text-muted-foreground">Total Views</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center">
          <p className="text-2xl font-bold text-red-400">
            {formatNumber(videos.reduce((sum, v) => sum + (v.likes || 0), 0))}
          </p>
          <p className="text-xs text-muted-foreground">Total Likes</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">
            {formatNumber(videos.reduce((sum, v) => sum + (v.comments || 0), 0))}
          </p>
          <p className="text-xs text-muted-foreground">Total Comments</p>
        </div>
      </motion.div>
    </div>
  );
}
