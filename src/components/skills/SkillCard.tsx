import { Wrench, Globe, Calculator, Code, BarChart3, Cog, Trash2, Server } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const skillIcons: Record<string, any> = {
  builtin: Wrench,
  web_search: Globe,
  calculator: Calculator,
  code_exec: Code,
  data_analysis: BarChart3,
  mcp: Server,
  custom: Cog,
};

interface SkillCardProps {
  skill: {
    id?: string;
    name: string;
    description?: string | null;
    skill_type: string;
    mcp_tool_name?: string | null;
  };
  assignmentId?: string;
  mode: "assigned" | "available";
  onAssign?: () => void;
  onRemove?: () => void;
  connectionName?: string;
}

export function SkillCard({ skill, mode, onAssign, onRemove, connectionName }: SkillCardProps) {
  const Icon = skillIcons[skill.skill_type] || Wrench;
  const isMcp = skill.skill_type === "mcp";

  if (mode === "assigned") {
    return (
      <Card className="p-4 flex items-start gap-3 group hover:border-gold/20 transition-colors">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isMcp ? "bg-emerald-500/10" : "bg-gold/10"
        }`}>
          <Icon className={`w-4 h-4 ${isMcp ? "text-emerald-400" : "text-gold"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-medium text-foreground">{skill.name}</div>
          {skill.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{skill.description}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-mono ${isMcp ? "text-emerald-400/60" : "text-gold/60"}`}>
              {skill.skill_type}
            </span>
            {connectionName && (
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                via {connectionName}
              </span>
            )}
          </div>
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card
      className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 hover:border-gold/15 transition-all"
      onClick={onAssign}
    >
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{skill.name}</div>
        {skill.description && (
          <div className="text-xs text-muted-foreground truncate">{skill.description}</div>
        )}
      </div>
      <span className="text-xs text-gold font-mono">+ Add</span>
    </Card>
  );
}
