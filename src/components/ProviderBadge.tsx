import { Badge } from "@/components/ui/badge";

interface ProviderBadgeProps {
  verificationTier?: string | null;
  verificationStatus?: string | null;
  commissionTier?: string | null;
}

export function ProviderBadge({ verificationTier, verificationStatus, commissionTier }: ProviderBadgeProps) {
  if (verificationStatus !== "verified") {
    return null;
  }

  const tierColors = {
    Bronze: "bg-amber-700 text-white",
    Silver: "bg-gray-400 text-gray-900",
    Gold: "bg-yellow-500 text-gray-900",
    Platinum: "bg-purple-600 text-white",
  };

  const commissionTierColors = {
    no_tier: "bg-gray-500 text-white",
    bronze: "bg-amber-700 text-white",
    silver: "bg-gray-400 text-gray-900",
    gold: "bg-yellow-500 text-gray-900",
    platinum: "bg-purple-600 text-white",
  };

  return (
    <div className="flex items-center gap-2">
      {verificationTier && (
        <Badge className={tierColors[verificationTier as keyof typeof tierColors] || "bg-primary"}>
          ✓ {verificationTier}
        </Badge>
      )}
      {commissionTier && commissionTier !== 'no_tier' && (
        <Badge className={commissionTierColors[commissionTier as keyof typeof commissionTierColors] || "bg-muted"}>
          📊 {commissionTier.charAt(0).toUpperCase() + commissionTier.slice(1)} Commission
        </Badge>
      )}
    </div>
  );
}