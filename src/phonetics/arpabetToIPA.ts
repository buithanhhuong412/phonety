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
};

const VOWELS = new Set([
  "AA",
  "AE",
  "AH",
  "AO",
  "AW",
  "AY",
  "EH",
  "ER",
  "EY",
  "IH",
  "IY",
  "OW",
  "OY",
  "UH",
  "UW",
]);

type Phoneme = {
  base: string;
  stress?: string;
  ipa: string;
  isVowel: boolean;
};

function parsePhonemes(phonemes: string[]): Phoneme[] {
  const result: Phoneme[] = [];

  for (const phoneme of phonemes) {
    const match = phoneme.match(/^([A-Z]+)([012])?$/);

    if (!match) {
      continue;
    }

    const [, base, stress] = match;

    let ipa = ARPABET_TO_IPA[base];

    if (!ipa) {
      continue;
    }

    if (base === "AH" && stress === "0") {
      ipa = "ə";
    }

    if (base === "ER" && stress === "0") {
      ipa = "ɚ";
    }

    result.push({
      base,
      stress,
      ipa,
      isVowel: VOWELS.has(base),
    });
  }

  return result;
}


/*
 * Find the boundaries between syllables.
 *
 * We use the vowel nuclei from CMU and assign the consonants
 * between two vowels to the following syllable when possible.
 *
 * Example:
 *
 * S AH1 M TH IH0 NG
 *
 *        ↓
 *
 * [S AH1 M] [TH IH0 NG]
 *
 * → ˈsʌm.θɪŋ
 */
function syllabify(phonemes: Phoneme[]): Phoneme[][] {
  const vowelIndexes: number[] = [];

  for (let i = 0; i < phonemes.length; i++) {
    if (phonemes[i].isVowel) {
      vowelIndexes.push(i);
    }
  }

  if (vowelIndexes.length <= 1) {
    return [phonemes];
  }

  const syllables: Phoneme[][] = [];

  let syllableStart = 0;

  for (let i = 0; i < vowelIndexes.length - 1; i++) {
    const currentVowel = vowelIndexes[i];
    const nextVowel = vowelIndexes[i + 1];

    const consonantsBetween =
      nextVowel - currentVowel - 1;

    let boundary = currentVowel + 1;

    /*
     * No consonant:
     *
     * A E
     *
     * Split directly between vowels.
     */
    if (consonantsBetween === 0) {
      boundary = nextVowel;
    }

    /*
     * One consonant:
     *
     * V C V
     *
     * The consonant becomes onset of the next syllable.
     *
     * A T A
     * → [A] [T A]
     */
    else if (consonantsBetween === 1) {
      boundary = currentVowel + 1;
    }

    /*
     * Two or more consonants:
     *
     * V C C V
     *
     * Keep the last consonant with the following syllable.
     *
     * A M P L E
     * → [A M] [P L E]
     *
     * This also keeps common English onsets such as:
     * PL, TR, DR, KL, KR, etc.
     */
    else {
      boundary = nextVowel - 1;

      /*
       * Common two-consonant English onsets.
       */
      const onset = phonemes
        .slice(nextVowel - 2, nextVowel)
        .map((phoneme) => phoneme.base);

      const validTwoConsonantOnsets = new Set([
        "P,L",
        "B,L",
        "F,L",
        "K,L",
        "G,L",
        "S,L",

        "P,R",
        "B,R",
        "T,R",
        "D,R",
        "K,R",
        "G,R",
        "F,R",
        "TH,R",

        "S,P",
        "S,T",
        "S,K",
        "S,F",
        "S,M",
        "S,N",
        "S,L",
        "S,W",

        "S,T,R",
        "S,P,R",
        "S,K,R",
        "S,K,W",
      ]);

      const key = onset.join(",");

      if (validTwoConsonantOnsets.has(key)) {
        boundary = nextVowel - 2;
      }
    }

    syllables.push(
      phonemes.slice(
        syllableStart,
        boundary
      )
    );

    syllableStart = boundary;
  }

  syllables.push(
    phonemes.slice(syllableStart)
  );

  return syllables;
}


function syllableToIPA(
  syllable: Phoneme[]
): string {
  if (syllable.length === 0) {
    return "";
  }

  const vowelIndex = syllable.findIndex(
    (phoneme) => phoneme.isVowel
  );

  let stress = "";

  if (vowelIndex !== -1) {
    const vowel = syllable[vowelIndex];

    if (vowel.stress === "1") {
      stress = "ˈ";
    } else if (vowel.stress === "2") {
      stress = "ˌ";
    }
  }

  // Thay vì .join("") sát rạt dễ gây lỗi dính ký tự đặc biệt,
  // ta map qua từng ipa và nối chúng một cách an toàn
  const sound = syllable
    .map((phoneme) => phoneme.ipa)
    .join(""); // Hoặc thêm ký tự phân tách vô hình nếu cần

  return stress + sound;
}


export function arpabetToIPA(
  phonemes: string[]
): string {
  const parsed = parsePhonemes(phonemes);

  if (parsed.length === 0) {
    return "";
  }

  const syllables = syllabify(parsed);

  /*
   * Cambridge-style convention:
   *
   * One-syllable words do not receive
   * an explicit stress mark.
   */
  if (syllables.length === 1) {
    return syllables[0]
      .map((phoneme) => phoneme.ipa)
      .join("");
  }

  return syllables
    .map(syllableToIPA)
    .join(".");
}