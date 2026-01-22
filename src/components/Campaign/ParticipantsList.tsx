import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Clock,
  Eye,
  Video,
  TrendingUp,
  Crown,
  Medal,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

interface Participant {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  status: string;
  applied_at: string;
  approved_at?: string;
  total_videos?: number;
  total_views?: number;
  rank_position?: number;
}

interface ParticipantsListProps {
  participants: Participant[];
  showActions?: boolean;
  onApprove?: (participantId: string) => void;
  onReject?: (participantId: string) => void;
  loading?: boolean;
  language?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function ParticipantsList({
  participants,
  showActions = false,
  onApprove,
  onReject,
  loading = false,
  language = "pt",
}: ParticipantsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const dateLocale = language === "pt" ? ptBR : enUS;

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch = p.username
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [participants, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: participants.length,
      approved: participants.filter((p) => p.status === "approved").length,
      requested: participants.filter((p) => p.status === "requested").length,
      rejected: participants.filter((p) => p.status === "rejected").length,
    };
  }, [participants]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        );
      case "requested":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            {status}
          </Badge>
        );
    }
  };

  const getRankIcon = (position?: number) => {
    if (!position) return null;
    switch (position) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-400" />;
      case 2:
        return <Medal className="h-4 w-4 text-slate-300" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-500" />;
      default:
        return (
          <span className="text-xs font-bold text-muted-foreground">
            #{position}
          </span>
        );
    }
  };

  const handleApprove = async (id: string) => {
    if (!onApprove) return;
    setProcessingId(id);
    await onApprove(id);
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!onReject) return;
    setProcessingId(id);
    await onReject(id);
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Participantes</h3>
          <p className="text-xs text-muted-foreground">
            {statusCounts.approved} aprovados • {statusCounts.requested}{" "}
            pendentes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar participante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-muted/30 border-border/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-border/50">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
            <SelectItem value="approved">
              Aprovados ({statusCounts.approved})
            </SelectItem>
            <SelectItem value="requested">
              Pendentes ({statusCounts.requested})
            </SelectItem>
            <SelectItem value="rejected">
              Rejeitados ({statusCounts.rejected})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <UserCheck className="h-5 w-5 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-400">
            {statusCounts.approved}
          </p>
          <p className="text-xs text-muted-foreground">Aprovados</p>
        </div>
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
          <Clock className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-yellow-400">
            {statusCounts.requested}
          </p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <UserX className="h-5 w-5 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-400">
            {statusCounts.rejected}
          </p>
          <p className="text-xs text-muted-foreground">Rejeitados</p>
        </div>
      </div>

      {/* Participants List */}
      {filteredParticipants.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">
            {searchTerm || statusFilter !== "all"
              ? "Nenhum participante encontrado"
              : "Nenhum participante ainda"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Os participantes aparecerão aqui
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <AnimatePresence>
            {filteredParticipants.map((participant) => (
              <motion.div
                key={participant.id}
                variants={itemVariants}
                layout
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                  "hover:scale-[1.01] group",
                  participant.status === "approved" &&
                    "bg-gradient-to-r from-green-500/10 to-transparent border-green-500/20",
                  participant.status === "requested" &&
                    "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20",
                  participant.status === "rejected" &&
                    "bg-gradient-to-r from-red-500/10 to-transparent border-red-500/20"
                )}
              >
                {/* Rank Position */}
                {participant.rank_position && (
                  <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                    {getRankIcon(participant.rank_position)}
                  </div>
                )}

                {/* Avatar */}
                <Avatar
                  className={cn(
                    "h-11 w-11 border-2 ring-1",
                    participant.status === "approved" &&
                      "border-green-500/30 ring-green-500/20",
                    participant.status === "requested" &&
                      "border-yellow-500/30 ring-yellow-500/20",
                    participant.status === "rejected" &&
                      "border-red-500/30 ring-red-500/20"
                  )}
                >
                  <AvatarImage src={participant.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {participant.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">
                      {participant.username}
                    </p>
                    {getStatusBadge(participant.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inscrito em{" "}
                    {format(new Date(participant.applied_at), "dd MMM yyyy", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>

                {/* Stats (if approved) */}
                {participant.status === "approved" && (
                  <div className="hidden sm:flex items-center gap-3">
                    {participant.total_videos !== undefined && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Video className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-sm font-medium">
                          {participant.total_videos}
                        </span>
                      </div>
                    )}
                    {participant.total_views !== undefined && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                        <Eye className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-sm font-medium">
                          {formatNumber(participant.total_views)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {showActions && participant.status === "requested" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(participant.id)}
                      disabled={processingId === participant.id}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1"
                    >
                      {processingId === participant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(participant.id)}
                      disabled={processingId === participant.id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1"
                    >
                      {processingId === participant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Rejeitar
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
