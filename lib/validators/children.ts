import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) =>
      value === null || value === undefined || (typeof value === "string" && value.trim() === "")
        ? null
        : value,
    z.string().trim().max(max, message).nullable()
  );

export const childSchema = z.object({
  name: z.string().trim().min(1, "Введите имя ребёнка").max(100),
  age: z.coerce
    .number()
    .int("Возраст должен быть целым числом")
    .min(1, "Минимальный возраст — 1 год")
    .max(99, "Максимальный возраст — 99 лет"),
  gender: z.enum(["boy", "girl"], {
    message: "Выберите пол ребёнка"
  }),
  interests: optionalText(500, "Описание интересов слишком длинное"),
  fears: optionalText(500, "Описание страхов слишком длинное"),
  additional_context: optionalText(800, "Описание друзей и близких слишком длинное")
});

export type ChildInput = z.infer<typeof childSchema>;
