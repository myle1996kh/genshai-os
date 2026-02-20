/**
 * AgentAvatar — shows the agent's image if available, otherwise generates
 * a deterministic gradient + initials avatar that stays consistent.
 */
interface AgentAvatarProps {
  name: string;
  imageUrl?: string | null;
  accentColor?: string; // HSL like "200 80% 52%"
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-full h-full text-3xl",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

// Deterministic hue from name string
function nameToHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export default function AgentAvatar({
  name,
  imageUrl,
  accentColor,
  size = "md",
  className = "",
}: AgentAvatarProps) {
  const sizeClass = SIZE_MAP[size];
  const initials = getInitials(name || "?");

  // Use accentColor HSL if provided, otherwise derive from name
  let hue: number;
  if (accentColor) {
    const match = accentColor.match(/^(\d+)/);
    hue = match ? parseInt(match[1]) : nameToHue(name);
  } else {
    hue = nameToHue(name);
  }

  const gradient = `linear-gradient(135deg, hsl(${hue} 60% 20%), hsl(${hue} 70% 38%))`;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover object-top border border-gold/30 flex-shrink-0 ${className}`}
        onError={(e) => {
          // If image fails, remove src so parent can detect & re-render
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 border border-gold/25 font-bold text-white select-none ${className}`}
      style={{ background: gradient }}
      title={name}
    >
      {initials}
    </div>
  );
}
