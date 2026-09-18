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