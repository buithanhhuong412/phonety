import britfoneCsv from "../data/britfone.main.3.0.1.csv?raw";

export interface BritfoneEntry {
  word: string;
  phonemes: string;
}

export type BritishToken = {
  text: string;
  phonetics: string;
  isWord: boolean;
};

type PhonemeToken = {
  symbol: string;
  stress?: "primary" | "secondary";
};

type Syllable = {
  phonemes: string[];
  stress?: "primary" | "secondary";
};

export class BritfoneConverter {
  private dictionary: Map<string, string> = new Map();

  /*
   * Britfone → Cambridge-like IPA
   *
   * Important:
   * Britfone uses symbols such as:
   *
   *   k ˈɐ ɹ ə n s i
   *
   * The stress mark belongs to the stressed vowel in Britfone.
   *
   * Cambridge-style IPA puts stress at the beginning
   * of the stressed syllable:
   *
   *   ˈkʌr.ən.si
   */

  private static readonly VOWELS = new Set([
    "i",
    "iː",
    "ɪ",
    "e",
    "ɛ",
    "æ",
    "ɑ",
    "ɑː",
    "ɒ",
    "ɔ",
    "ɔː",
    "ʊ",
    "u",
    "uː",
    "ɐ",
    "ə",
    "ɜː",

    "eɪ",
    "aɪ",
    "ɔɪ",
    "aʊ",
    "əʊ",

    "ɪə",
    "eə",
    "ʊə",
  ]);

  /*
   * Ordered longest-first so that:
   *
   * tʃ  is read as one phoneme
   * dʒ  is read as one phoneme
   * eɪ  is read as one phoneme
   * etc.
   */
  private static readonly PHONEMES = [
    "tʃ",
    "dʒ",

    "eɪ",
    "aɪ",
    "ɔɪ",
    "aʊ",
    "əʊ",

    "ɪə",
    "eə",
    "ʊə",

    "iː",
    "ɑː",
    "ɔː",
    "uː",
    "ɜː",

    "i",
    "ɪ",
    "e",
    "ɛ",
    "æ",
    "ɑ",
    "ɒ",
    "ɔ",
    "ʊ",
    "u",
    "ɐ",
    "ə",

    "p",
    "b",
    "t",
    "d",
    "k",
    "ɡ",
    "f",
    "v",
    "θ",
    "ð",
    "s",
    "z",
    "ʃ",
    "ʒ",
    "h",
    "m",
    "n",
    "ŋ",
    "l",
    "r",
    "ɹ",
    "j",
    "w",
  ];

  /*
   * Common English onset clusters.
   *
   * Used only for syllable division.
   *
   * Example:
   *
   *   ə n s i
   *
   * becomes:
   *
   *   ən.si
   *
   * because /s/ can begin the next syllable.
   */
  private static readonly VALID_ONSETS = new Set([
    "p",
    "b",
    "t",
    "d",
    "k",
    "ɡ",
    "f",
    "v",
    "θ",
    "ð",
    "s",
    "z",
    "ʃ",
    "ʒ",
    "h",
    "m",
    "n",
    "l",
    "r",
    "ɹ",
    "j",
    "w",

    "pl",
    "bl",
    "kl",
    "ɡl",
    "pr",
    "br",
    "tr",
    "dr",
    "kr",
    "ɡr",
    "fr",
    "θr",

    "tw",
    "dw",
    "kw",
    "ɡw",
    "sw",

    "sp",
    "st",
    "sk",
    "sm",
    "sn",
    "sl",
    "sf",

    "spl",
    "spr",
    "str",
    "skr",
    "skw",
  ]);

  constructor(csvData?: string) {
    if (csvData) {
      this.loadFromCSV(csvData);
    }
  }

  public loadFromCSV(csvData: string): void {
    const lines = csvData.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      const commaIndex = line.indexOf(",");

      if (commaIndex === -1) {
        continue;
      }

      const rawWord = line.slice(0, commaIndex).trim();
      const rawPhonemes = line.slice(commaIndex + 1).trim();

      if (!rawWord || !rawPhonemes) {
        continue;
      }

      const word = rawWord.toUpperCase();

      /*
       * Ignore possible header rows.
       */
      if (
        word === "WORD" ||
        word === "WORDS" ||
        word === "ENTRY"
      ) {
        continue;
      }

      /*
       * Britfone can contain variants such as:
       *
       * WORD(1)
       * WORD(2)
       *
       * Keep the first pronunciation.
       */
      const baseWord = word.replace(/\(\d+\)$/, "");

      if (this.dictionary.has(baseWord)) {
        continue;
      }

      const ipa =
        this.convertBritfonePronunciation(rawPhonemes);

      if (ipa) {
        this.dictionary.set(baseWord, ipa);
      }
    }
  }

  /**
   * Convert one Britfone pronunciation into
   * Cambridge-like IPA.
   */
  private convertBritfonePronunciation(
    input: string,
  ): string {
    const tokens = this.tokenize(input);

    if (!tokens.length) {
      return "";
    }

    const syllables = this.buildSyllables(tokens);

    if (!syllables.length) {
      return "";
    }

    /*
     * A one-syllable word does not need a stress mark
     * in Cambridge-style transcription.
     *
     * Example:
     *   curl → /kɜːl/
     */
    if (syllables.length === 1) {
      return this.renderSyllable(
        syllables[0],
        false,
      );
    }

    return syllables
      .map((syllable) =>
        this.renderSyllable(
          syllable,
          true,
        ),
      )
      .join(".");
  }

  /**
   * Convert Britfone's space-separated notation
   * into individual phoneme tokens.
   *
   * Example:
   *
   *   k ˈɐ ɹ ə n s i
   *
   * becomes:
   *
   *   k
   *   ɐ + primary stress
   *   ɹ
   *   ə
   *   n
   *   s
   *   i
   */
  private tokenize(
    input: string,
  ): PhonemeToken[] {
    const cleaned = input
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ");

    if (!cleaned) {
      return [];
    }

    const rawTokens = cleaned.split(" ");

    const result: PhonemeToken[] = [];

    for (const rawToken of rawTokens) {
      if (!rawToken) {
        continue;
      }

      let token = rawToken;

      let stress:
        | "primary"
        | "secondary"
        | undefined;

      /*
       * Britfone puts stress immediately before
       * the stressed vowel.
       */
      if (token.startsWith("ˈ")) {
        stress = "primary";
        token = token.slice(1);
      } else if (token.startsWith("ˌ")) {
        stress = "secondary";
        token = token.slice(1);
      }

      if (!token) {
        continue;
      }

      /*
       * Usually a CSV token is already one phoneme.
       */
      if (
        BritfoneConverter.PHONEMES.includes(token)
      ) {
        result.push({
          symbol: token,
          stress,
        });

        continue;
      }

      /*
       * Safety fallback for tokens containing
       * multiple phonemes.
       */
      let remaining = token;
      let first = true;

      while (remaining.length > 0) {
        const phoneme =
          BritfoneConverter.PHONEMES.find(
            (candidate) =>
              remaining.startsWith(candidate),
          );

        if (!phoneme) {
          result.push({
            symbol: remaining,
            stress: first
              ? stress
              : undefined,
          });

          break;
        }

        result.push({
          symbol: phoneme,
          stress: first
            ? stress
            : undefined,
        });

        remaining = remaining.slice(
          phoneme.length,
        );

        first = false;
      }
    }

    return result;
  }

  /**
   * Split the phoneme stream into syllables.
   *
   * The important part is that stress belongs to
   * the syllable containing the stressed vowel.
   *
   * Example:
   *
   *   k ˈɐ ɹ ə n s i
   *
   * becomes:
   *
   *   [k ɐ ɹ]
   *   [ə n]
   *   [s i]
   */
  private buildSyllables(
    tokens: PhonemeToken[],
  ): Syllable[] {
    const vowelIndexes: number[] = [];

    for (let i = 0; i < tokens.length; i++) {
      if (
        BritfoneConverter.VOWELS.has(
          tokens[i].symbol,
        )
      ) {
        vowelIndexes.push(i);
      }
    }

    /*
     * No vowel = cannot syllabify.
     */
    if (!vowelIndexes.length) {
      return [
        {
          phonemes: tokens.map(
            (token) => token.symbol,
          ),
        },
      ];
    }

    const syllables: Syllable[] = [];

    let syllableStart = 0;

    for (
      let vowelNumber = 0;
      vowelNumber < vowelIndexes.length;
      vowelNumber++
    ) {
      const nucleusIndex =
        vowelIndexes[vowelNumber];

      const nextNucleusIndex =
        vowelIndexes[vowelNumber + 1];

      /*
       * Last syllable:
       *
       * everything remaining belongs here.
       */
      if (
        nextNucleusIndex === undefined
      ) {
        const phonemes = tokens
          .slice(syllableStart)
          .map((token) => token.symbol);

        const stress =
          tokens[nucleusIndex].stress;

        syllables.push({
          phonemes,
          stress,
        });

        break;
      }

      /*
       * Find consonants between the current
       * vowel and the next vowel.
       */
      const consonantStart =
        nucleusIndex + 1;

      const consonantEnd =
        nextNucleusIndex;

      const between =
        tokens.slice(
          consonantStart,
          consonantEnd,
        );

      /*
       * No consonants between vowels:
       *
       * e.g. /i.ə/
       */
      if (between.length === 0) {
        const phonemes = tokens
          .slice(
            syllableStart,
            nextNucleusIndex,
          )
          .map((token) => token.symbol);

        const stress =
          tokens[nucleusIndex].stress;

        syllables.push({
          phonemes,
          stress,
        });

        syllableStart =
          nextNucleusIndex;

        continue;
      }

      /*
       * Determine how many consonants belong
       * to the onset of the NEXT syllable.
       *
       * We prefer the longest legal English onset.
       */
      let onsetCount = 1;

      for (
        let count = 1;
        count <= between.length;
        count++
      ) {
        const onset = between
          .slice(
            between.length - count,
          )
          .map(
            (token) => token.symbol,
          )
          .join("");

        if (
          BritfoneConverter.VALID_ONSETS.has(
            onset,
          )
        ) {
          onsetCount = count;
        }
      }

      const splitIndex =
        nextNucleusIndex - onsetCount;

      /*
       * Current syllable:
       *
       * current vowel + consonants that
       * belong to its coda.
       */
      const currentPhonemes =
        tokens
          .slice(
            syllableStart,
            splitIndex,
          )
          .map(
            (token) => token.symbol,
          );

      const stress =
        tokens[nucleusIndex].stress;

      syllables.push({
        phonemes: currentPhonemes,
        stress,
      });

      /*
       * Next syllable begins at the onset.
       */
      syllableStart = splitIndex;
    }

    return syllables;
  }

  /**
   * Render one syllable.
   *
   * Stress is deliberately placed BEFORE
   * the onset, not immediately before the vowel.
   *
   * Example:
   *
   *   [k ɐ ɹ], primary
   *
   * becomes:
   *
   *   ˈkʌr
   */
  private renderSyllable(
    syllable: Syllable,
    allowStress: boolean,
  ): string {
    const isPrimary =
      syllable.stress === "primary";

    const isSecondary =
      syllable.stress === "secondary";

    const renderedPhonemes =
      syllable.phonemes.map(
        (symbol) =>
          this.mapPhoneme(
            symbol,
            isPrimary,
          ),
      );

    let result =
      renderedPhonemes.join("");

    /*
     * Cambridge-style stress mark goes
     * at the beginning of the syllable.
     */
    if (allowStress && isPrimary) {
      result = `ˈ${result}`;
    } else if (
      allowStress &&
      isSecondary
    ) {
      result = `ˌ${result}`;
    }

    return result;
  }

  /**
   * Map individual Britfone symbols.
   *
   * Special rule:
   *
   *   unstressed ɜː → ə
   *
   * This is needed for cases such as:
   *
   *   curmudgeon
   *
   * Britfone:
   *
   *   k ɜː m ˈɐ dʒ ə n
   *
   * Cambridge-like:
   *
   *   kəˈmʌdʒ.ən
   */
  private mapPhoneme(
    symbol: string,
    syllableIsStressed: boolean,
  ): string {
    switch (symbol) {
      case "ɹ":
        return "r";

      case "ɐ":
        return "ʌ";

      case "ɜː":
        /*
         * Unstressed /ɜː/ is reduced to /ə/.
         */
        return syllableIsStressed
          ? "ɜː"
          : "ə";

      case "ɛ":
        return "e";

      default:
        return symbol;
    }
  }

  public lookup(
    word: string,
  ): string | null {
    const cleanedWord =
      word.trim().toUpperCase();

    return (
      this.dictionary.get(
        cleanedWord,
      ) ?? null
    );
  }

  public size(): number {
    return this.dictionary.size;
  }
}

const britishConverter =
  new BritfoneConverter(britfoneCsv);

export function lookupBritishTokens(
  text: string,
): BritishToken[] {
  const matches =
    text.match(
      /[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*|[^\w\s]|\s+/g,
    ) ?? [];

  return matches.map((token) => {
    const isWord =
      /^[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*$/.test(
        token,
      );

    if (!isWord) {
      return {
        text: token,
        phonetics: token,
        isWord: false,
      };
    }

    return {
      text: token,
      phonetics:
        britishConverter.lookup(token) ?? "",
      isWord: true,
    };
  });
}

export function lookupBritish(
  word: string,
): string | null {
  return britishConverter.lookup(word);
}

export function britishDictionarySize(): number {
  return britishConverter.size();
}

export default BritfoneConverter;