import { describe, expect, test } from "bun:test";
import { findNamedRelations, normalizeCharacterInput } from "@/lib/ai/character-input";
import { StoryPseudonymizer } from "@/lib/ai/pseudonymization";
import { buildSeriesPrompt } from "@/lib/ai/story-prompt";

describe("распознавание записей родителя", () => {
  test("разделяет родных без запятых и не превращает роли в имена", () => {
    for (const input of ["мама папа бабушка", "Мама Папа Бабушка", "мама, папа, бабушка"]) {
      const normal = normalizeCharacterInput(input);
      const masker = new StoryPseudonymizer();
      masker.scan(normal);
      expect(masker.toJSON()).toEqual({});
    }
    expect(normalizeCharacterInput("мама папа бабушка")).toBe("мама; папа; бабушка");
  });

  test("не пропускает имя после соседней роли", () => {
    expect(findNamedRelations("мама папа андрей")).toEqual([{ role: "папа", name: "андрей" }]);
  });

  test("отделяет имена от ролей и восстанавливает заглавные буквы", () => {
    const input = "мама марианна папа андрей брат гриша сестра софия тётя аня дядя ваня кот элвис собака майя";
    const normalized = normalizeCharacterInput(input);
    expect(findNamedRelations(normalized).length).toBe(8);
    const masker = new StoryPseudonymizer();
    masker.scan(normalized);
    const masked = masker.mask(normalized);
    expect(masked).toBe("мама {{PERSON_1_NOM}}; папа {{PERSON_2_NOM}}; брат {{PERSON_3_NOM}}; сестра {{PERSON_4_NOM}}; тётя {{PERSON_5_NOM}}; дядя {{PERSON_6_NOM}}; кот {{PERSON_7_NOM}}; собака {{PERSON_8_NOM}}");
    masker.assertSafeOutbound(masked);
    expect(masker.restore(masked)).toBe("мама Марианна; папа Андрей; брат Гриша; сестра София; тётя Аня; дядя Ваня; кот Элвис; собака Майя");
    expect(masker.restore("к {{PERSON_3_DAT}}, с котом {{PERSON_7_INS}} и собакой {{PERSON_8_INS}}"))
      .toBe("к Грише, с котом Элвисом и собакой Майей");
  });

  test("не извлекает роли из частей слов и имена из очевидной прозы", () => {
    const input = "комама Оля, мама и папа, брат пошёл в школу, бабушка дома, кот спит";
    expect(findNamedRelations(input)).toEqual([]);
    expect(normalizeCharacterInput(input)).toBe(input);
  });

  test("сохраняет отдельными двух бабушек с разными именами", () => {
    const masker = new StoryPseudonymizer();
    masker.scan("бабушка Оля бабушка Валя");
    expect(masker.mask("бабушка Оля и бабушка Валя"))
      .toBe("бабушка {{PERSON_1_NOM}} и бабушка {{PERSON_2_NOM}}");
  });

  test("исправляет старые псевдонимы родственных слов без потери настоящих имён", () => {
    const masker = new StoryPseudonymizer({
      "{{PERSON_1_NOM}}": "папа", "{{PERSON_1_GEN}}": "папы",
      "{{PERSON_2_NOM}}": "андрей", "{{PERSON_2_GEN}}": "андрея",
      "{{PERSON_3}}": "мама"
    });
    expect(masker.toJSON()).toEqual({ "{{PERSON_2_NOM}}": "Андрей", "{{PERSON_2_GEN}}": "Андрея" });
    masker.scan("мама папа Андрей");
    expect(masker.mask("мама папа Андрей")).toBe("мама папа {{PERSON_2_NOM}}");
  });

  test("передаёт знакомство из прошлой серии и нового героя без раскрытия имён", () => {
    const previous = new StoryPseudonymizer();
    previous.registerChildName("Захар", "male");
    previous.scan("мама Марианна");
    const memory = {
      characters: ["роль=мама; имя=Марианна; обращение=мама; первая_серия=2; представлен=да"],
      facts: [], open_threads: [], episode_summaries: ["Захар познакомил читателя с мамой."]
    };
    const next = new StoryPseudonymizer(previous.toJSON());
    next.registerChildName("Захар", "male");
    next.scan("дядя ваня");
    next.scanMemory(memory);
    const maskedMemory = next.maskMemory(memory);
    expect(maskedMemory.characters[0]).toBe("роль=мама; имя={{PERSON_1_NOM}}; обращение=мама; первая_серия=2; представлен=да");
    expect(next.restoreMemory(maskedMemory)).toEqual(memory);
    const prompt = buildSeriesPrompt({
      child: { name: "{{CHILD_NOM}}", age: 6, gender: "boy" },
      request: {
        childId: "removed", storyMode: "adventure", durationMinutes: 5,
        situation: next.mask("дядя ваня приехал в гости"), setting: "дом",
        goal: "спокойно завершить вечер"
      },
      episodeNumber: 5, plannedEpisodes: 8, seriesMemory: maskedMemory
    });
    expect(prompt).toContain("Это серия 5 из 8");
    expect(prompt).toContain("дядя {{PERSON_2_NOM}} приехал в гости");
    expect(prompt).toContain(JSON.stringify(maskedMemory));
    expect(prompt).not.toContain("Марианна");
    expect(prompt).not.toContain("Ваня");
    next.assertSafeOutbound(prompt);
  });
});
