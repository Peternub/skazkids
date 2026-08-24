export const SERIES_CREATION_NOTICE = "series-subscription-required";
export const SERIES_CREATION_REDIRECT = `/billing?notice=${SERIES_CREATION_NOTICE}`;

export function canCreateSeries(input: {
  hasActiveSubscription: boolean;
  starterOfferStatus: "available" | "pending" | "ready" | "used";
}) {
  return input.hasActiveSubscription || input.starterOfferStatus === "ready";
}
