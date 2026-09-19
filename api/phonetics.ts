type Accent =
  | "British"
  | "American";

type RequestBody = {
  accent?: Accent;
  words?: string[];
};

function cleanPronunciation(
  value: string
): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "");
}

function isValidIpa(
  value: string
): boolean {
  if (!value) {
    return false;
  }

  /*
   * Reject obvious prose.
   *
   * IPA can contain:
   * letters, IPA symbols,
   * stress marks and length marks.
   */
  if (
    /[.!?;:{}[\]<>]/.test(
      value
    )
  ) {
    return false;
  }

  if (value.length > 100) {
    return false;
  }

  return true;
}

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed",
      });
  }

  const body =
    (req.body ?? {}) as RequestBody;

  const accent =
    body.accent === "British"
      ? "British"
      : "American";

  const words = Array.isArray(
    body.words
  )
    ? body.words
        .filter(
          word =>
            typeof word ===
            "string"
        )
        .map(word =>
          word.trim()
        )
        .filter(Boolean)
        .slice(0, 50)
    : [];

  if (words.length === 0) {
    return res.status(400).json({
      error:
        "No words supplied.",
    });
  }

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY is not configured.",
    });
  }

  const uniqueWords =
    Array.from(
      new Set(words)
    );

  const prompt = `
You are a pronunciation dictionary.

Return the IPA pronunciation of each English word.

Accent: ${accent} English.

Rules:
- Return ONLY valid IPA pronunciation.
- Use IPA symbols, not respelling.
- Include primary stress when appropriate.
- Include secondary stress when appropriate.
- Do not explain anything.
- Do not use slashes around the IPA.
- Do not include the original word.
- If a word is ambiguous, choose the most common pronunciation for the requested accent.
- Preserve the exact spelling of the keys.
- Return one JSON object only.

Words:
${JSON.stringify(
  uniqueWords
)}
`;

  try {
    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              "gpt-5.6-luna",

            input: prompt,

            text: {
              format: {
                type: "json_object",
              },
            },
          }),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "OpenAI error:",
        errorText
      );

      return res.status(502).json({
        error:
          "Pronunciation service failed.",
      });
    }

    const data =
      await response.json();

    const outputText =
      typeof data.output_text ===
      "string"
        ? data.output_text
        : "";

    if (!outputText) {
      return res.status(502).json({
        error:
          "No pronunciation returned.",
      });
    }

    let parsed: unknown;

    try {
      parsed =
        JSON.parse(outputText);
    } catch {
      return res.status(502).json({
        error:
          "Invalid pronunciation response.",
      });
    }

    if (
      !parsed ||
      typeof parsed !==
        "object"
    ) {
      return res.status(502).json({
        error:
          "Invalid pronunciation response.",
      });
    }

    const results: Record<
      string,
      string
    > = {};

    const source =
      parsed as Record<
        string,
        unknown
      >;

    for (const word of uniqueWords) {
      const raw =
        source[word];

      if (
        typeof raw !==
        "string"
      ) {
        continue;
      }

      const pronunciation =
        cleanPronunciation(
          raw
        );

      if (
        isValidIpa(
          pronunciation
        )
      ) {
        results[word] =
          pronunciation;
      }
    }

    return res.status(200).json({
      accent,
      results,
    });
  } catch (error) {
    console.error(
      "Pronunciation API error:",
      error
    );

    return res.status(500).json({
      error:
        "Internal server error.",
    });
  }
}