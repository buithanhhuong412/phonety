const ARPABET_TO_IPA: Record<string, string> = {
  AA: "ɑ",
  AE: "æ",
  AH: "ʌ",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  EH: "ɛ",
  ER: "ɝ",
  EY: "eɪ",
  IH: "ɪ",
  IY: "i",
  OW: "oʊ",
  OY: "ɔɪ",
  UH: "ʊ",
  UW: "u",

  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "ɡ",
  HH: "h",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "r",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",

  AX: "ə",
  AXR: "ɚ",
  IX: "ɨ",
  EL: "l̩",
  EM: "m̩",
  EN: "n̩",
};

export function arpabetToIPA(phonemes: string[]): string {
  return phonemes
    .map((phoneme) => {
      const match = phoneme.match(/^([A-Z]+)([012])?$/);

      if (!match) {
        return "";
      }

      const [, base, stress] = match;
      const ipa = ARPABET_TO_IPA[base];

      if (!ipa) {
        return "";
      }

      if (stress === "1") {
        return `ˈ${ipa}`;
      }

      if (stress === "2") {
        return `ˌ${ipa}`;
      }

      return ipa;
    })
    .join("");
}