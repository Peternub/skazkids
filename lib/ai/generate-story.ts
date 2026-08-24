import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai/providers";
import {
  StoryPseudonymizer,
  type PrivateAliases
} from "@/lib/ai/pseudonymization";
import {
  isSeriesMemory,
  type SeriesMemory
} from "@/lib/ai/story-memory";
import type { StoryInput } from "@/lib/validators/stories";

type ChildProfile = {
  name: string;
  age: number;
  gender: "boy" | "girl";
  interests?: string | null;
  fears?: string | null;
  additional_context?: string | null;
};

export type GenerateStoryParams = {
  child: ChildProfile;
  request: StoryInput;
  episodeNumber: number;
  plannedEpisodes: number;
  seriesMemory: SeriesMemory;
  privateAliases?: PrivateAliases;
  requestId: string;
  modelCode?: string;
};

export type GeneratedStory = {
  title: string;
  text: string;
  summary: string;
  memory: SeriesMemory;
  privateAliases: PrivateAliases;
  provider: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    text: { type: "string" },
    summary: { type: "string" },
    memory: {
      type: "object",
      additionalProperties: false,
      properties: {
        characters: { type: "array", items: { type: "string" } },
        facts: { type: "array", items: { type: "string" } },
        open_threads: { type: "array", items: { type: "string" } },
        episode_summaries: { type: "array", items: { type: "string" } }
      },
      required: ["characters", "facts", "open_threads", "episode_summaries"]
    }
  },
  required: ["title", "text", "summary", "memory"]
} as const;

const generatedStorySchema = z.object({
  title: z.string().min(1).max(160),
  text: z.string().min(1),
  summary: z.string().min(1).max(500),
  memory: z.unknown()
});

function getGenderLabel(gender: ChildProfile["gender"]) {
  return gender === "girl" ? "female" : "male";
}

export function createGatewayRequestId(storyId: string) {
  return createHash("sha256").update(`skazkids-story:${storyId}`).digest("hex");
}

export function buildSeriesPrompt(params: {
  child: ChildProfile;
  request: StoryInput;
  episodeNumber: number;
  plannedEpisodes: number;
  seriesMemory: SeriesMemory;
}) {
  const { child, request, episodeNumber, plannedEpisodes, seriesMemory } = params;

  return [
    "Напиши вечернюю серию на русском языке с учётом указанного возраста ребёнка.",
    `Это серия ${episodeNumber} из ${plannedEpisodes}. Длительность чтения — около 5 минут, 700–950 слов.`,
    "Персональные имена заменены неизменяемыми плейсхолдерами с падежами.",
    "NOM — именительный, GEN — родительный, DAT — дательный, ACC — винительный, INS — творительный, PREP — предложный.",
    "Пример: {{CHILD_NOM}} открыл дверь; подарок для {{CHILD_GEN}}; бабушка улыбнулась {{CHILD_DAT}}.",
    "Всегда возвращай плейсхолдер целиком и выбирай правильный падеж. Не придумывай реальные имена вместо плейсхолдеров.",
    "Стиль: живой, тёплый, спокойный; конкретные действия; короткие диалоги; мягкий юмор.",
    "Не используй старинный сказочный язык, прямую мораль, психологические термины и тревожный клиффхэнгер.",
    "Начни сразу со сцены. Сделай 7–12 абзацев. Финал должен успокаивать и оставлять лёгкий повод вернуться завтра.",
    "Не пересказывай прошлые серии. Используй только память ниже.",
    "",
    "ОБЕЗЛИЧЕННЫЙ ПРОФИЛЬ:",
    "Главный герой: {{CHILD_NOM}}",
    `Возраст: ${child.age}`,
    `Пол: ${getGenderLabel(child.gender)}`,
    `Интересы: ${child.interests || "не указаны"}`,
    `Что важно учитывать: ${child.fears || "не указано"}`,
    `Близкие и питомцы: ${child.additional_context || "не указаны"}`,
    "",
    "СЕГОДНЯШНЯЯ СЕРИЯ:",
    `Событие: ${request.situation}`,
    `Место: ${request.setting}`,
    `Персонажи: ${request.additionalCharacters || "из памяти сериала"}`,
    `Изменение к финалу: ${request.goal}`,
    `Паспорт и пожелания: ${request.extraWishes || "нет"}`,
    "",
    "ПАМЯТЬ СЕРИАЛА:",
    JSON.stringify(seriesMemory),
    "",
    "Верни заголовок, полный текст, краткое содержание и обновлённую память. В памяти оставь только важные постоянные факты."
  ].join("\n");
}

function preparePseudonymizedInput(params: GenerateStoryParams) {
  const pseudonymizer = new StoryPseudonymizer(params.privateAliases);
  pseudonymizer.registerChildName(params.child.name, params.child.gender === "girl" ? "female" : "male");

  const values = [
    params.child.interests,
    params.child.fears,
    params.child.additional_context,
    params.request.situation,
    params.request.setting,
    params.request.additionalCharacters,
    params.request.goal,
    params.request.extraWishes
  ];
  values.forEach((value) => pseudonymizer.scan(value));
  pseudonymizer.scanMemory(params.seriesMemory);

  return {
    pseudonymizer,
    child: {
      ...params.child,
      name: "{{CHILD_NOM}}",
      interests: pseudonymizer.mask(params.child.interests),
      fears: pseudonymizer.mask(params.child.fears),
      additional_context: pseudonymizer.mask(params.child.additional_context)
    },
    request: {
      ...params.request,
      childId: "removed",
      durationMinutes: 5 as const,
      situation: pseudonymizer.mask(params.request.situation),
      setting: pseudonymizer.mask(params.request.setting),
      additionalCharacters: pseudonymizer.mask(params.request.additionalCharacters),
      goal: pseudonymizer.mask(params.request.goal),
      extraWishes: pseudonymizer.mask(params.request.extraWishes)
    },
    seriesMemory: pseudonymizer.maskMemory(params.seriesMemory)
  };
}

export async function generateStory(params: GenerateStoryParams): Promise<GeneratedStory> {
  const model = params.modelCode || process.env.OPENAI_MODEL || "gpt-5.6-terra";
  const prepared = preparePseudonymizedInput(params);
  const prompt = buildSeriesPrompt({
    child: prepared.child,
    request: prepared.request,
    episodeNumber: params.episodeNumber,
    plannedEpisodes: params.plannedEpisodes,
    seriesMemory: prepared.seriesMemory
  });
  prepared.pseudonymizer.assertSafeOutbound(prompt);

  const generated = await getAiProvider().generateEpisode({
    requestId: params.requestId,
    model,
    instructions: "Создавай безопасные связанные серии для семейного чтения перед сном. Строго соблюдай плейсхолдеры и JSON-схему.",
    input: prompt,
    schema: responseSchema
  });

  const parsed = generatedStorySchema.safeParse(JSON.parse(generated.output));
  if (!parsed.success) throw new Error("AI_INVALID_STRUCTURED_RESPONSE");
  if (!isSeriesMemory(parsed.data.memory)) throw new Error("AI_INVALID_MEMORY");

  const serializedResult = JSON.stringify(parsed.data);
  prepared.pseudonymizer.assertKnownPlaceholders(serializedResult);

  return {
    title: prepared.pseudonymizer.restore(parsed.data.title),
    text: prepared.pseudonymizer.restore(parsed.data.text),
    summary: prepared.pseudonymizer.restore(parsed.data.summary),
    memory: prepared.pseudonymizer.restoreMemory(parsed.data.memory),
    privateAliases: prepared.pseudonymizer.toJSON(),
    provider: generated.provider,
    model: generated.model,
    usage: generated.usage
  };
}
