import { describe, expect, test } from "bun:test";
import { canCreateSeries } from "./series-access";

describe("доступ к созданию сериала", () => {
  test("разрешает активную подписку", () => {
    expect(canCreateSeries({
      hasActiveSubscription: true,
      starterOfferStatus: "available"
    })).toBe(true);
  });

  test("разрешает оплаченное спецпредложение", () => {
    expect(canCreateSeries({
      hasActiveSubscription: false,
      starterOfferStatus: "ready"
    })).toBe(true);
  });

  test("отправляет к тарифам без оплаченного доступа", () => {
    expect(canCreateSeries({
      hasActiveSubscription: false,
      starterOfferStatus: "available"
    })).toBe(false);
    expect(canCreateSeries({
      hasActiveSubscription: false,
      starterOfferStatus: "pending"
    })).toBe(false);
    expect(canCreateSeries({
      hasActiveSubscription: false,
      starterOfferStatus: "used"
    })).toBe(false);
  });
});
