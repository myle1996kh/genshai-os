import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Plus, Trash2, Zap, Globe, Calculator, Code, BarChart3, Cog, ArrowLeft, Sparkles, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

const skillIcons: Record<string, any> = {
  builtin: Wrench,
  web_search: Globe,
  calculator: Calculator,
  code_exec: Code,
  data_analysis: BarChart3,
  custom: Cog,
};

const AgentSkills = () => {
  const { agentId } = useParams();
  const [skills, setSkills] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mcpConnections, setMcpConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", description: "", skill_type: "custom" });
  const [newMcp, setNewMcp] = useState({ name: "", server_url: "", auth_type: "none" });

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const fetchData = async () => {
    setLoading(true);
    const [skillsRes, assignRes, mcpRes] = await Promise.all([
      supabase.from("agent_skills").select("*").eq("is_active", true),
      agentId ? supabase.from("agent_skill_assignments").select("*, agent_skills(*)").eq("agent_id", agentId) : Promise.resolve({ data: [] }),
      supabase.from("mcp_connections").select("*").eq("is_active", true),
    ]);
    setSkills(skillsRes.data || []);
    setAssignments(assignRes.data || []);
    setMcpConnections(mcpRes.data || []);
    setLoading(false);
  };

  const assignSkill = async (skillId: string) => {
    if (!agentId) return;
    const { error } = await supabase.from("agent_skill_assignments").insert({
      agent_id: agentId,
      skill_id: skillId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Skill assigned" });
      fetchData();
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    await supabase.from("agent_skill_assignments").delete().eq("id", assignmentId);
    toast({ title: "Skill removed" });
    fetchData();
  };

  const createSkill = async () => {
    if (!newSkill.name) return;
    const { error } = await supabase.from("agent_skills").insert(newSkill);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Skill created" });
      setNewSkill({ name: "", description: "", skill_type: "custom" });
      setShowAddSkill(false);
      fetchData();
    }
  };

  const createMcpConnection = async () => {
    if (!newMcp.name || !newMcp.server_url) return;
    const { error } = await supabase.from("mcp_connections").insert(newMcp);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "MCP Connection created" });
      setNewMcp({ name: "", server_url: "", auth_type: "none" });
      setShowAddMcp(false);
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

  const assignedSkillIds = new Set(assignments.map((a: any) => a.skill_id));
  const unassignedSkills = skills.filter((s) => !assignedSkillIds.has(s.id));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to={agentId ? `/agent/${agentId}` : "/library"} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Wrench className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-foreground font-bold">Agent Skills & Tools</h1>
        </div>

        {/* Assigned Skills */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-foreground">Assigned Skills</h2>
            <Button onClick={autoGenerateSkills} disabled={generating} size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              {generating ? "Generating..." : "AI Auto-Generate"}
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No skills assigned yet. Add skills manually or use AI auto-generate.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignments.map((a: any) => {
                const skill = a.agent_skills;
                const Icon = skillIcons[skill?.skill_type] || Wrench;
                return (
                  <Card key={a.id} className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium text-foreground">{skill?.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{skill?.description}</div>
                      <div className="text-xs text-gold/60 font-mono mt-1">{skill?.skill_type}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAssignment(a.id)} className="text-destructive/60 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Available Skills */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-foreground">Available Skills</h2>
            <Dialog open={showAddSkill} onOpenChange={setShowAddSkill}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Create Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Skill</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Skill name (snake_case)" value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} />
                  <Textarea placeholder="Description" value={newSkill.description} onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })} />
                  <Select value={newSkill.skill_type} onValueChange={(v) => setNewSkill({ ...newSkill, skill_type: v })}>
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

          {unassignedSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">All skills are assigned or none exist yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {unassignedSkills.map((skill) => {
                const Icon = skillIcons[skill.skill_type] || Wrench;
                return (
                  <Card key={skill.id} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => assignSkill(skill.id)}>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{skill.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{skill.description}</div>
                    </div>
                    <Plus className="w-4 h-4 text-gold" />
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* MCP Connections */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-gold" /> MCP Connections
            </h2>
            <Dialog open={showAddMcp} onOpenChange={setShowAddMcp}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Add MCP Server
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect MCP Server</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Connection name" value={newMcp.name} onChange={(e) => setNewMcp({ ...newMcp, name: e.target.value })} />
                  <Input placeholder="Server URL (e.g. https://mcp.example.com)" value={newMcp.server_url} onChange={(e) => setNewMcp({ ...newMcp, server_url: e.target.value })} />
                  <Select value={newMcp.auth_type} onValueChange={(v) => setNewMcp({ ...newMcp, auth_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={createMcpConnection} className="w-full">Connect</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {mcpConnections.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No MCP servers connected. Add an MCP server to extend agent capabilities with external tools.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mcpConnections.map((conn) => (
                <Card key={conn.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Server className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{conn.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{conn.server_url}</div>
                    <div className="text-xs text-gold/60 mt-1">Auth: {conn.auth_type}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-500">Active</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AgentSkills;
