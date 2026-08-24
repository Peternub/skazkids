import "server-only";

import { canCreateSeries } from "@/lib/billing/series-access";
import { hasActiveSubscription } from "@/lib/data/billing";
import { getStarterOfferStatus } from "@/lib/payments/starter-offer";

export async function getSeriesCreationAccess(userId: string) {
  const [activeSubscription, starterOfferStatus] = await Promise.all([
    hasActiveSubscription(userId),
    getStarterOfferStatus(userId)
  ]);

  return {
    allowed: canCreateSeries({
      hasActiveSubscription: activeSubscription,
      starterOfferStatus
    }),
    starterOfferStatus
  };
}
