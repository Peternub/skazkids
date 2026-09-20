import "server-only";
import { z } from "zod";
import { createGatewayRequestId, generateStory } from "@/lib/ai/generate-story";
import { classifyGenerationError } from "@/lib/analytics/generation-events";
import { estimateAiCostUsd } from "@/lib/config/ai-pricing";
import { parsePrivateAliases } from "@/lib/ai/pseudonymization";
import { parseSeriesMemory } from "@/lib/ai/story-memory";
import {
  claimStoryGeneration,
  completeStoryGeneration,
  failStoryGeneration,
  findStoryGenerationState,
  getGenerationContext,
  recordGenerationAnalytics
} from "@/lib/data/generation";
import { getGenerationActionError } from "@/lib/stories/generation-errors";
import { stripSeriesEpisodePlan } from "@/lib/stories/series-plan";
import type { StoryInput } from "@/lib/validators/stories";

const generationInputSchema = z.object({
  situation: z.string().trim().max(500).optional().default("")
});

export type GenerationInput = z.infer<typeof generationInputSchema>;

function buildStoryRequest(input: {
  childId: string;
  episodeNumber: number;
  generationInput: GenerationInput;
  seriesTitle: string;
  seriesPremise: string;
}): StoryInput {
  const addition = input.generationInput.situation;
  const episodeContext = input.episodeNumber === 1
    ? "Это первая серия: покажи мир через действие; введи только нужных для текущей сцены героев; остальных оставь для следующих серий."
    : `Это серия ${input.episodeNumber}: продолжи сюжет по памяти сериала с учётом сегодняшних пожеланий; нового героя представь только при его первом появлении.`;

  return {
    childId: input.childId,
    storyMode: "adventure",
    durationMinutes: 5,
    situation: addition || "автоматическое спокойное продолжение сериала",
    setting: `мир сериала «${input.seriesTitle}»`,
    goal: "спокойно завершить сегодняшний сюжет и оставить мягкий повод вернуться завтра",
    additionalCharacters: undefined,
    extraWishes: [
      `ПАСПОРТ СЕРИАЛА «${input.seriesTitle}»:`,
      stripSeriesEpisodePlan(input.seriesPremise),
      episodeContext,
      addition ? `Событие от родителя: ${addition}` : null
    ]
      .filter(Boolean)
      .join("\n\n")
  };
}

export async function processStoryGeneration(userId: string, storyId: string) {
  const existingStory = await findStoryGenerationState(userId, storyId);

  if (!existingStory?.series_id) {
    throw new Error("STORY_NOT_FOUND");
  }

  if (existingStory.status === "completed") {
    return existingStory.series_id;
  }

  const claimed = await claimStoryGeneration(userId, storyId);

  if (!claimed) {
    const currentStory = await findStoryGenerationState(userId, storyId);

    if (currentStory?.status === "completed" && currentStory.series_id) {
      return currentStory.series_id;
    }

    throw new Error("GENERATION_IN_PROGRESS");
  }

  const requestId = createGatewayRequestId(storyId);
  let aiStartedAt: number | null = null;
  let aiLatencyMs: number | null = null;
  let analyticsProvider = process.env.AI_PROVIDER_CODE || "openai";
  let analyticsModel = process.env.OPENAI_MODEL || "unknown";

  try {
    const context = await getGenerationContext(userId, storyId);

    if (!context) {
      throw new Error("GENERATION_CONTEXT_NOT_FOUND");
    }

    const { child, series, story } = context;
    analyticsModel = series.model_code;

    const generationInput = generationInputSchema.parse(story.generation_input ?? {});
    const request = buildStoryRequest({
      childId: child.id,
      episodeNumber: story.episode_number,
      generationInput,
      seriesTitle: series.title,
      seriesPremise: series.premise
    });
    aiStartedAt = Date.now();
    const generated = await generateStory({
      child,
      request,
      episodeNumber: story.episode_number,
      plannedEpisodes: series.planned_episodes,
      seriesMemory: parseSeriesMemory(series.series_memory),
      privateAliases: parsePrivateAliases(series.private_aliases),
      requestId,
      modelCode: series.model_code
    });
    analyticsProvider = generated.provider;
    analyticsModel = generated.model;
    aiLatencyMs = Date.now() - aiStartedAt;
    let estimatedCostUsd: number | null = null;
    try {
      estimatedCostUsd = estimateAiCostUsd({
        model: generated.model,
        inputTokens: generated.usage.inputTokens,
        outputTokens: generated.usage.outputTokens
      });
    } catch (error) {
      console.error("AI pricing config invalid", {
        message: error instanceof Error ? error.message : "UNKNOWN"
      });
    }
    const seriesId = await completeStoryGeneration({
      memory: generated.memory,
      privateAliases: generated.privateAliases,
      provider: generated.provider,
      storyId,
      summary: generated.summary,
      text: generated.text,
      title: generated.title,
      userId
    });
    try {
      await recordGenerationAnalytics({
        requestId,
        storyId,
        status: "succeeded",
        provider: generated.provider,
        model: generated.model,
        latencyMs: aiLatencyMs,
        inputTokens: generated.usage.inputTokens,
        outputTokens: generated.usage.outputTokens,
        estimatedCostUsd,
        errorCategory: null
      });
    } catch (error) {
      console.error("Generation analytics write failed", {
        message: error instanceof Error ? error.message : "UNKNOWN"
      });
    }
    return seriesId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "GENERATION_FAILED";
    if (aiStartedAt !== null) {
      try {
        await recordGenerationAnalytics({
          requestId,
          storyId,
          status: "failed",
          provider: analyticsProvider,
          model: analyticsModel,
          latencyMs: aiLatencyMs ?? Date.now() - aiStartedAt,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: null,
          errorCategory: classifyGenerationError(error)
        });
      } catch (analyticsError) {
        console.error("Generation analytics write failed", {
          message: analyticsError instanceof Error ? analyticsError.message : "UNKNOWN"
        });
      }
    }
    await failStoryGeneration(
      userId,
      storyId,
      getGenerationActionError(error)
    );
    console.error("processStoryGeneration failed", { message });
    throw error;
  }
}
