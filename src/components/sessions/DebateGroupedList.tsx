import { Link } from "react-router-dom";
import { Users, Trash2, Loader2, Star } from "lucide-react";

interface DebateSession {
  id: string;
  topic: string;
  status: string;
  current_turn: number;
  max_turns: number;
  created_at: string;
  is_favorite: boolean;
  agents: { agent_name: string; agent_image: string | null }[];
}

interface Props {
  debates: DebateSession[];
  search: string;
  sortMode: "recent" | "favorites";
  deleting: string | null;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const formatDate = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export default function DebateGroupedList({
  debates, search, sortMode, deleting, onToggleFavorite, onDelete,
}: Props) {
  const filtered = debates
    .filter((d) => !search || d.topic.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === "favorites") {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground/40">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No debate sessions yet</p>
      </div>
    );
  }

  // Group by status
  const active = filtered.filter((d) => d.status === "active");
  const completed = filtered.filter((d) => d.status !== "active");

  const renderGroup = (label: string, items: typeof filtered) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="px-1 py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
            {label} ({items.length})
          </span>
        </div>
        <div className="rounded-2xl border border-border/30 bg-muted/5 overflow-hidden divide-y divide-border/10">
          {items.map((debate) => (
            <Link
              key={debate.id}
              to={`/group-debate/${debate.id}`}
              className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/15 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-primary/60" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{debate.topic}</h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {debate.agents.slice(0, 3).map((a, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground bg-primary/5 px-1.5 py-0.5 rounded-md border border-border/30">
                      {a.agent_name}
                    </span>
                  ))}
                  {debate.agents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground/40">+{debate.agents.length - 3}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  debate.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-muted/30 text-muted-foreground/50 border border-border/30"
                }`}>
                  {debate.current_turn}/{debate.max_turns}
                </span>
                <span className="text-[10px] text-muted-foreground/25">
                  {formatDate(debate.created_at)}
                </span>
                <button
                  onClick={(e) => onToggleFavorite(e, debate.id)}
                  className="p-1 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  {debate.is_favorite
                    ? <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    : <Star className="w-3 h-3 text-muted-foreground/15 group-hover:text-muted-foreground/30" />
                  }
                </button>
                <button
                  onClick={(e) => onDelete(e, debate.id)}
                  disabled={deleting === debate.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground/25 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                >
                  {deleting === debate.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGroup("Active", active)}
      {renderGroup("Completed", completed)}
    </div>
  );
}
