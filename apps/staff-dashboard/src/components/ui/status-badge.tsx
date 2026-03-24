import { cn } from "@/lib/cn";

type StatusTone =
  | "gray"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "emerald";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

function getToneClasses(tone: StatusTone) {
  switch (tone) {
    case "blue":
      return "bg-blue-100 text-blue-700";
    case "green":
      return "bg-green-100 text-green-700";
    case "yellow":
      return "bg-yellow-100 text-yellow-700";
    case "orange":
      return "bg-orange-100 text-orange-700";
    case "red":
      return "bg-red-100 text-red-700";
    case "purple":
      return "bg-purple-100 text-purple-700";
    case "emerald":
      return "bg-emerald-100 text-emerald-700";
    case "gray":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function StatusBadge({
  label,
  tone = "gray",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        getToneClasses(tone),
        className,
      )}
    >
      {label}
    </span>
  );
}
