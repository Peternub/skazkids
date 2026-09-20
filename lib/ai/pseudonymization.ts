import type { SeriesMemory } from "@/lib/ai/story-memory";
import { findNamedRelations, isCharacterRole, isPossibleCharacterName } from "@/lib/ai/character-input";

export type PrivateAliases = Record<string, string>;
export type PersonGender = "male" | "female";
export type RussianCase = "NOM" | "GEN" | "DAT" | "ACC" | "INS" | "PREP";

export type NameForms = Record<RussianCase, string>;

const CASES: RussianCase[] = ["NOM", "GEN", "DAT", "ACC", "INS", "PREP"];
const PLACEHOLDER_PATTERN = /^\{\{(?:CHILD|PERSON_[0-9]+)_(?:NOM|GEN|DAT|ACC|INS|PREP)\}\}$/;
const LEGACY_PLACEHOLDER_PATTERN = /^\{\{(?:CHILD_NAME|PERSON_[0-9]+)\}\}$/;

const IRREGULAR_NAMES: Record<string, NameForms> = {
  лев: {
    NOM: "Лев",
    GEN: "Льва",
    DAT: "Льву",
    ACC: "Льва",
    INS: "Львом",
    PREP: "Льве"
  },
  павел: {
    NOM: "Павел",
    GEN: "Павла",
    DAT: "Павлу",
    ACC: "Павла",
    INS: "Павлом",
    PREP: "Павле"
  },
  илья: {
    NOM: "Илья",
    GEN: "Ильи",
    DAT: "Илье",
    ACC: "Илью",
    INS: "Ильёй",
    PREP: "Илье"
  }
};

const MALE_NAMES_ENDING_WITH_A = new Set([
  "данила",
  "добрыня",
  "илья",
  "кузьма",
  "лука",
  "микита",
  "никита",
  "фома"
]);

const FEMALE_SOFT_SIGN_NAMES = new Set([
  "любовь",
  "нинэль",
  "рахиль"
]);

const SAFE_CAPITALIZED_WORDS = new Set([
  "Автопродолжение",
  "Бабушка",
  "Брат",
  "Возраст",
  "Главная",
  "Данные",
  "Дополнительные",
  "Друзья",
  "Дедушка",
  "Завтра",
  "Интересы",
  "Место",
  "Мама",
  "Мир",
  "Основная",
  "Паспорт",
  "Папа",
  "Пол",
  "Постоянные",
  "Профиль",
  "Родитель",
  "Сестра",
  "Сериал",
  "Серия",
  "Событие",
  "Сегодня",
  "Страхи",
  "Это",
  "Формат"
]);

const CAPITALIZED_WORD_PATTERN = /(?<![\p{L}\p{N}_])[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?(?![\p{L}\p{N}_])/gu;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-zА-Яа-яЁё]{2,}/u;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu;
const LONG_NUMBER_PATTERN = /(?<!\d)\+?\d(?:[\s()-]*\d){6,}(?!\d)/u;

function preserveCase(source: string, generated: string) {
  if (source === source.toLocaleUpperCase("ru-RU")) {
    return generated.toLocaleUpperCase("ru-RU");
  }
  if (source[0] === source[0]?.toLocaleLowerCase("ru-RU")) {
    return generated[0]?.toLocaleLowerCase("ru-RU") + generated.slice(1);
  }
  return generated;
}

function forms(nom: string, gen: string, dat: string, acc: string, ins: string, prep: string): NameForms {
  return { NOM: nom, GEN: gen, DAT: dat, ACC: acc, INS: ins, PREP: prep };
}

export function inferRussianNameGender(name: string): PersonGender {
  const normalized = name.trim().toLocaleLowerCase("ru-RU");
  if (MALE_NAMES_ENDING_WITH_A.has(normalized)) return "male";
  if (FEMALE_SOFT_SIGN_NAMES.has(normalized)) return "female";
  if (/[ая]$/u.test(normalized)) return "female";
  return "male";
}

export function declineRussianName(name: string, gender: PersonGender): NameForms {
  const original = name.trim();
  const lower = original.toLocaleLowerCase("ru-RU");
  const irregular = IRREGULAR_NAMES[lower];

  if (irregular) {
    return Object.fromEntries(
      CASES.map((caseName) => [caseName, preserveCase(original, irregular[caseName])])
    ) as NameForms;
  }

  if (lower.endsWith("ия")) {
    const stem = original.slice(0, -1);
    return forms(original, `${stem}и`, `${stem}и`, `${stem}ю`, `${stem}ей`, `${stem}и`);
  }

  if (lower.endsWith("ья")) {
    const stem = original.slice(0, -1);
    return forms(original, `${stem}и`, `${stem}е`, `${stem}ю`, `${stem}ей`, `${stem}е`);
  }

  if (lower.endsWith("я")) {
    const stem = original.slice(0, -1);
    return forms(original, `${stem}и`, `${stem}е`, `${stem}ю`, `${stem}ей`, `${stem}е`);
  }

  if (lower.endsWith("а")) {
    const stem = original.slice(0, -1);
    const genEnding = /[гкхжчшщц]$/iu.test(stem) ? "и" : "ы";
    return forms(original, `${stem}${genEnding}`, `${stem}е`, `${stem}у`, `${stem}ой`, `${stem}е`);
  }

  if (gender === "female" && lower.endsWith("ь")) {
    const stem = original.slice(0, -1);
    return forms(original, `${stem}и`, `${stem}и`, original, `${stem}ью`, `${stem}и`);
  }

  if (lower.endsWith("ий")) {
    const stem = original.slice(0, -2);
    return forms(original, `${stem}ия`, `${stem}ию`, `${stem}ия`, `${stem}ием`, `${stem}ии`);
  }

  if (lower.endsWith("й") || lower.endsWith("ь")) {
    const stem = original.slice(0, -1);
    return forms(original, `${stem}я`, `${stem}ю`, `${stem}я`, `${stem}ем`, `${stem}е`);
  }

  if (/[оеэиую]$/u.test(lower)) {
    return forms(original, original, original, original, original, original);
  }

  return forms(original, `${original}а`, `${original}у`, `${original}а`, `${original}ом`, `${original}е`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholeValue(text: string, value: string, replacement: string) {
  return text.replace(
    new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(value)}(?![\\p{L}\\p{N}_])`, "giu"),
    replacement
  );
}

function containsWholeValue(text: string, value: string) {
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegExp(value)}(?![\\p{L}\\p{N}_])`,
    "iu"
  ).test(text);
}

function relationGender(relation: string): PersonGender | null {
  if (["мама", "бабушка", "сестра", "подруга", "няня", "кошка", "тётя", "тетя"].includes(relation)) return "female";
  if (["папа", "дедушка", "брат", "друг", "кот", "пёс", "пес", "дядя"].includes(relation)) return "male";
  return null;
}

function isNonName(value: string) {
  return !isPossibleCharacterName(value) ||
    [...SAFE_CAPITALIZED_WORDS].some((word) => word.toLocaleLowerCase("ru-RU") === value.toLocaleLowerCase("ru-RU"));
}

function capitalizeName(value: string) {
  return value.split("-").map((part) => part.charAt(0).toLocaleUpperCase("ru-RU") + part.slice(1).toLocaleLowerCase("ru-RU")).join("-");
}

export function parsePrivateAliases(value: unknown): PrivateAliases {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value)
    .filter(
      ([placeholder, original]) =>
        (PLACEHOLDER_PATTERN.test(placeholder) || LEGACY_PLACEHOLDER_PATTERN.test(placeholder)) &&
        typeof original === "string" &&
        original.length > 0 &&
        original.length <= 100
    )
    .slice(0, 300) as Array<[string, string]>;
  const blockedPersonPrefixes = new Set(
    entries.flatMap(([placeholder, original]) => {
      const match = placeholder.match(/^(\{\{PERSON_[0-9]+)(?:_NOM)?\}\}$/u);
      return match?.[1] && isNonName(original) ? [match[1]] : [];
    })
  );

  return Object.fromEntries(
    entries.filter(([placeholder]) =>
      [...blockedPersonPrefixes].every((prefix) => !placeholder.startsWith(`${prefix}_`) && placeholder !== `${prefix}}}`)
    ).map(([placeholder, original]) => [placeholder, capitalizeName(original)])
  );
}

export class StoryPseudonymizer {
  private readonly aliases: PrivateAliases;

  constructor(existingAliases: PrivateAliases = {}) {
    this.aliases = parsePrivateAliases(existingAliases);
  }

  registerChildName(name: string, gender: PersonGender) {
    this.registerForms("CHILD", name, gender);
  }

  scan(text: string | null | undefined) {
    if (!text) return;

    for (const { role, name } of findNamedRelations(text)) {
      this.registerPerson(name, relationGender(role));
    }

    for (const match of text.matchAll(CAPITALIZED_WORD_PATTERN)) {
      if (!isNonName(match[0]) && !isCharacterRole(match[0])) this.registerPerson(match[0], null);
    }
  }

  scanMemory(memory: SeriesMemory) {
    Object.values(memory).flat().forEach((value) => this.scan(value));
  }

  mask(text: string | null | undefined) {
    if (!text) return text ?? "";

    return Object.entries(this.aliases)
      .sort(([, left], [, right]) => right.length - left.length)
      .reduce((result, [placeholder, original]) => replaceWholeValue(result, original, placeholder), text);
  }

  maskMemory(memory: SeriesMemory): SeriesMemory {
    return {
      characters: memory.characters.map((value) => this.mask(value)),
      facts: memory.facts.map((value) => this.mask(value)),
      open_threads: memory.open_threads.map((value) => this.mask(value)),
      episode_summaries: memory.episode_summaries.map((value) => this.mask(value))
    };
  }

  restore(text: string) {
    return Object.entries(this.aliases).reduce(
      (result, [placeholder, original]) => result.replaceAll(placeholder, original),
      text
    );
  }

  restoreMemory(memory: SeriesMemory): SeriesMemory {
    return {
      characters: memory.characters.map((value) => this.restore(value)),
      facts: memory.facts.map((value) => this.restore(value)),
      open_threads: memory.open_threads.map((value) => this.restore(value)),
      episode_summaries: memory.episode_summaries.map((value) => this.restore(value))
    };
  }

  assertSafeOutbound(text: string) {
    if (EMAIL_PATTERN.test(text) || UUID_PATTERN.test(text) || LONG_NUMBER_PATTERN.test(text)) {
      throw new Error("PERSONAL_IDENTIFIER_DETECTED");
    }

    const privateValues = new Set(Object.values(this.aliases));
    for (const value of privateValues) {
      if (value.length > 1 && containsWholeValue(text, value)) {
        throw new Error("UNMASKED_PRIVATE_NAME_DETECTED");
      }
    }
  }

  assertKnownPlaceholders(text: string) {
    for (const placeholder of text.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []) {
      if (!(placeholder in this.aliases)) throw new Error("UNKNOWN_PERSON_PLACEHOLDER");
    }
  }

  toJSON(): PrivateAliases {
    return { ...this.aliases };
  }

  private registerPerson(value: string, explicitGender: PersonGender | null) {
    const normalized = capitalizeName(value.trim());
    if (!normalized || this.isKnownForm(normalized)) return;

    const personNumbers = Object.keys(this.aliases)
      .map((key) => key.match(/^\{\{PERSON_([0-9]+)_/u)?.[1])
      .filter(Boolean)
      .map(Number);
    const nextNumber = Math.max(0, ...personNumbers) + 1;
    this.registerForms(`PERSON_${nextNumber}`, normalized, explicitGender ?? inferRussianNameGender(normalized));
  }

  private registerForms(prefix: string, name: string, gender: PersonGender) {
    const normalized = name.trim();
    if (!normalized) return;
    const declined = declineRussianName(normalized, gender);
    for (const caseName of CASES) {
      this.aliases[`{{${prefix}_${caseName}}}`] = declined[caseName];
    }
  }

  private isKnownForm(value: string) {
    const normalized = value.toLocaleLowerCase("ru-RU");
    return Object.values(this.aliases).some(
      (known) => known.toLocaleLowerCase("ru-RU") === normalized
    );
  }
}
