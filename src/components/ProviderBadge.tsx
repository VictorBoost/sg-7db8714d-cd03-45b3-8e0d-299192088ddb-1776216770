import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProviderBadge as BadgeType } from "@/services/badgeService";

interface ProviderBadgeProps {
  badge: BadgeType;
  showTooltip?: boolean;
}

export function ProviderBadge({ badge, showTooltip = true }: ProviderBadgeProps) {
  const badgeElement = (
    <Badge variant="outline" className={badge.color}>
      <span className="mr-1">{badge.icon}</span>
      {badge.name}
    </Badge>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent>
          <p>{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}