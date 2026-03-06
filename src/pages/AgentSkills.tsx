import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Plus, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { SkillCard } from "@/components/skills/SkillCard";
import { McpConnectionPanel } from "@/components/skills/McpConnectionPanel";

const AgentSkills = () => {
  const { agentId } = useParams();
  const [skills, setSkills] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mcpConnections, setMcpConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", description: "", skill_type: "custom" });

  useEffect(() => { fetchData(); }, [agentId]);

  const fetchData = async () => {
    setLoading(true);
    const [skillsRes, assignRes, mcpRes] = await Promise.all([
      supabase.from("agent_skills").select("*").eq("is_active", true),
      agentId
        ? supabase.from("agent_skill_assignments").select("*, agent_skills(*)").eq("agent_id", agentId)
        : Promise.resolve({ data: [] }),
      supabase.from("mcp_connections").select("*").eq("is_active", true),
    ]);
    setSkills(skillsRes.data || []);
    setAssignments(assignRes.data || []);
    setMcpConnections(mcpRes.data || []);
    setLoading(false);
  };

  const assignSkill = async (skillId: string) => {
    if (!agentId) return;
    const { error } = await supabase.from("agent_skill_assignments").insert({ agent_id: agentId, skill_id: skillId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Skill assigned" }); fetchData(); }
  };

  const removeAssignment = async (assignmentId: string) => {
    await supabase.from("agent_skill_assignments").delete().eq("id", assignmentId);
    toast({ title: "Skill removed" });
    fetchData();
  };

  const createSkill = async () => {
    if (!newSkill.name) return;
    const { error } = await supabase.from("agent_skills").insert(newSkill);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Skill created" });
      setNewSkill({ name: "", description: "", skill_type: "custom" });
      setShowAddSkill(false);
      fetchData();
    }
  };

  const autoGenerateSkills = async () => {
    if (!agentId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-generate-skills", {
        body: { agentId, domain: "General" },
      });
      if (error) throw error;
      toast({ title: "Skills generated", description: `Created ${data.created} new skills` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Separate native vs MCP assignments
  const nativeAssignments = assignments.filter((a: any) => a.agent_skills?.skill_type !== "mcp");
  const mcpAssignments = assignments.filter((a: any) => a.agent_skills?.skill_type === "mcp");
  const assignedSkillIds = new Set(assignments.map((a: any) => a.skill_id));
  const unassignedSkills = skills.filter(s => !assignedSkillIds.has(s.id) && s.skill_type !== "mcp");

  // Build a connection name lookup
  const connNameMap: Record<string, string> = {};
  mcpConnections.forEach((c: any) => { connNameMap[c.id] = c.name; });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to={agentId ? `/agent/${agentId}` : "/library"} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Wrench className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-foreground font-bold">Agent Skills & Tools</h1>
        </div>

        {/* ── Native Skills ─────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-foreground">Native Skills</h2>
            <div className="flex items-center gap-2">
              <Button onClick={autoGenerateSkills} disabled={generating} size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                {generating ? "Generating..." : "AI Auto-Generate"}
              </Button>
              <Dialog open={showAddSkill} onOpenChange={setShowAddSkill}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Create Skill
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Skill</DialogTitle>
                    <DialogDescription>Define a custom skill that your agent can use.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Skill name (snake_case)" value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} />
                    <Textarea placeholder="Description" value={newSkill.description} onChange={e => setNewSkill({ ...newSkill, description: e.target.value })} />
                    <Select value={newSkill.skill_type} onValueChange={v => setNewSkill({ ...newSkill, skill_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="builtin">Built-in</SelectItem>
                        <SelectItem value="web_search">Web Search</SelectItem>
                        <SelectItem value="calculator">Calculator</SelectItem>
                        <SelectItem value="code_exec">Code Execution</SelectItem>
                        <SelectItem value="data_analysis">Data Analysis</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={createSkill} className="w-full">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {nativeAssignments.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No native skills assigned. Add skills manually or use AI auto-generate.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nativeAssignments.map((a: any) => (
                <SkillCard
                  key={a.id}
                  skill={a.agent_skills}
                  assignmentId={a.id}
                  mode="assigned"
                  onRemove={() => removeAssignment(a.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── MCP Tools (assigned from servers) ─────────────────────── */}
        {mcpAssignments.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              MCP Tools Assigned
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mcpAssignments.map((a: any) => (
                <SkillCard
                  key={a.id}
                  skill={a.agent_skills}
                  assignmentId={a.id}
                  mode="assigned"
                  onRemove={() => removeAssignment(a.id)}
                  connectionName={connNameMap[a.agent_skills?.mcp_connection_id]}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Available (unassigned) native skills ──────────────────── */}
        {unassignedSkills.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg text-foreground mb-4">Available Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {unassignedSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  mode="available"
                  onAssign={() => assignSkill(skill.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── MCP Connections ───────────────────────────────────────── */}
        <McpConnectionPanel
          connections={mcpConnections}
          agentId={agentId}
          onRefresh={fetchData}
        />
      </div>
    </div>
  );
};

export default AgentSkills;
