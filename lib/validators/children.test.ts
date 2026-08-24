import { describe, expect, test } from "bun:test";
import { childSchema } from "./children";

function child(age: number) {
  return {
    name: "Миша",
    age,
    gender: "boy",
    interests: null,
    fears: null,
    additional_context: null
  };
}

describe("валидация возраста ребёнка", () => {
  test("принимает возраст от 1 до 99 лет", () => {
    expect(childSchema.safeParse(child(1)).success).toBe(true);
    expect(childSchema.safeParse(child(99)).success).toBe(true);
  });

  test("отклоняет возраст за допустимыми границами", () => {
    expect(childSchema.safeParse(child(0)).success).toBe(false);
    expect(childSchema.safeParse(child(100)).success).toBe(false);
  });
});
