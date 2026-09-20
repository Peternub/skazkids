// Роли остаются открытым текстом; обезличиваются только имена.
export const CHARACTER_ROLES = [
  "мама", "папа", "бабушка", "дедушка", "брат", "сестра", "друг", "подруга",
  "тётя", "тетя", "дядя", "няня", "кот", "кошка", "котёнок", "котенок",
  "пёс", "пес", "собака", "щенок", "питомец", "хомяк", "попугай", "кролик"
] as const;

const roleSet = new Set<string>(CHARACTER_ROLES);
const nonNames = new Set([
  "и", "или", "а", "но", "с", "со", "у", "в", "во", "на", "из", "от", "для", "по",
  "не", "это", "его", "её", "ее", "их", "мой", "моя", "наш", "наша", "свой", "своя",
  "ребёнка", "ребенка", "старший", "старшая", "младший", "младшая", "любимый", "любимая",
  "пошёл", "пошел", "пошла", "ушёл", "ушел", "ушла", "пришёл", "пришел", "пришла",
  "любит", "любят", "живёт", "живет", "жил", "жила", "был", "была", "будет", "есть",
  "дома", "рядом", "вместе", "сегодня", "завтра", "вчера", "сказал", "сказала",
  "играет", "спит", "читает", "работает", "готовит", "ждал", "ждала"
]);
const roles = CHARACTER_ROLES.join("|");
const word = "[а-яёa-z][а-яёa-z-]{1,30}";
const boundary = "(?<![\\p{L}\\p{N}_])";
const end = "(?![\\p{L}\\p{N}_])";

export function isCharacterRole(value: string) {
  return roleSet.has(value.toLocaleLowerCase("ru-RU"));
}

export function isPossibleCharacterName(value: string) {
  const lower = value.toLocaleLowerCase("ru-RU");
  return !roleSet.has(lower) && !nonNames.has(lower);
}

export function findNamedRelations(text: string) {
  // Просмотр вперёд не поглощает следующую роль в записи «мама папа Андрей».
  const pattern = new RegExp(`${boundary}(${roles})[ \\t]+(?=(${word})${end})`, "giu");
  return [...text.matchAll(pattern)]
    .filter((match) => isPossibleCharacterName(match[2]))
    .map((match) => ({ role: match[1].toLocaleLowerCase("ru-RU"), name: match[2] }));
}

export function normalizeCharacterInput(value: string | null | undefined): string {
  if (!value) return "";
  // Разделяем только очевидные соседние роли; произвольную прозу разбирает модель.
  const adjacentRoles = new RegExp(`${boundary}(${roles})[ \\t]+(?=(?:${roles})${end})`, "giu");
  const namedBeforeRole = new RegExp(`${boundary}(${roles})[ \\t]+(${word})[ \\t]+(?=(?:${roles})${end})`, "giu");
  return value.replace(adjacentRoles, "$1; ").replace(namedBeforeRole, (match, role: string, name: string) =>
    isPossibleCharacterName(name) ? `${role} ${name}; ` : match
  );
}
