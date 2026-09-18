import cmudict from "@stdlib/datasets-cmudict";
import { arpabetToIPA } from "./arpabetToIPA";

const dictionary = cmudict({
  data: "dict",
}) as Record<string, string>;

export function lookupWord(word: string): string | null {
  const normalized = word.toUpperCase();

  const pronunciation = dictionary[normalized];

  if (!pronunciation) {
    return null;
  }

  const phonemes = pronunciation.split(" ");

  return arpabetToIPA(phonemes);
}

export function lookupText(text: string): string {
  const tokens = text.match(
    /[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g
  );

  if (!tokens) {
    return "";
  }

  return tokens
    .map((token) => {
      if (!/[A-Za-z]/.test(token)) {
        return token;
      }

      const phonetics = lookupWord(token);

      if (!phonetics) {
        return token;
      }

      return phonetics;
    })
    .join("");
}
export type LookupToken = {
  text: string;
  phonetics: string;
};

export function lookupTokens(text: string): LookupToken[] {
  const rawTokens =
    text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g) ?? [];

  const result: LookupToken[] = [];

  let i = 0;

  while (i < rawTokens.length) {
    const token = rawTokens[i];

    if (!/[A-Za-z]/.test(token)) {
      result.push({
        text: token,
        phonetics: token,
      });

      i++;
      continue;
    }

    const word = token;

    let suffix = "";
    let j = i + 1;

    while (
      j < rawTokens.length &&
      !/[A-Za-z]/.test(rawTokens[j])
    ) {
      suffix += rawTokens[j];
      j++;
    }

    result.push({
      text: word + suffix,
      phonetics: (lookupWord(word) ?? word) + suffix,
    });

    i = j;
  }

  return result;
}