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
import { buildSeriesPrompt, STORY_INSTRUCTIONS, type ChildProfile } from "@/lib/ai/story-prompt";
import { normalizeCharacterInput } from "@/lib/ai/character-input";

export { buildSeriesPrompt } from "@/lib/ai/story-prompt";

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

export function createGatewayRequestId(storyId: string) {
  return createHash("sha256").update(`skazkids-story:${storyId}`).digest("hex");
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
  values.forEach((value) => pseudonymizer.scan(normalizeCharacterInput(value)));
  pseudonymizer.scanMemory(params.seriesMemory);
  const mask = (value: string | null | undefined) => pseudonymizer.mask(normalizeCharacterInput(value));

  return {
    pseudonymizer,
    child: {
      ...params.child,
      name: "{{CHILD_NOM}}",
      interests: mask(params.child.interests),
      fears: mask(params.child.fears),
      additional_context: mask(params.child.additional_context)
    },
    request: {
      ...params.request,
      childId: "removed",
      durationMinutes: 5 as const,
      situation: mask(params.request.situation),
      setting: mask(params.request.setting),
      additionalCharacters: mask(params.request.additionalCharacters),
      goal: mask(params.request.goal),
      extraWishes: mask(params.request.extraWishes)
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
    instructions: STORY_INSTRUCTIONS,
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
