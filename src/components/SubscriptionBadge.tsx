import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  className?: string;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ className }) => {
  const { subscription, isPro } = useAuth();

  if (!subscription) return null;

  const planLabel = isPro()
    ? subscription.billing_cycle === "yearly"
      ? "Pro Yearly"
      : "Pro Monthly"
    : "Free";

  const statusColors: Record<string, string> = {
    active: "border-primary/40 bg-primary/10 text-primary",
    trialing: "border-accent/40 bg-accent/10 text-accent",
    past_due: "border-destructive/40 bg-destructive/10 text-destructive",
    canceled: "border-muted-foreground/30 bg-muted text-muted-foreground",
    incomplete: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };

  const colorClass = statusColors[subscription.status] ?? "border-muted bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border font-medium tracking-wide",
        colorClass,
        className
      )}
    >
      {isPro() && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {planLabel}
    </span>
  );
};
