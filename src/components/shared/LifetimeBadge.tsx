import { Infinity as InfinityIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

/** Badge for a service with `is_lifetime` set — paid for once, never
 * expires, so it has no renewal status to show via StatusBadge. */
export function LifetimeBadge() {
  return (
    <Badge tone="blue">
      <InfinityIcon className="h-3.5 w-3.5" />
      Lifetime
    </Badge>
  );
}
