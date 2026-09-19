import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import logo from "./assets/Logo.svg";
import "./index.css";

import {
  lookupText,
  lookupTokens,
  type LookupToken,
} from "./phonetics/cmudict";

import {
  lookupBritishTokens,
  type BritishToken,
} from "./phonetics/britfone";

type Accent =
  | "British"
  | "American";

type Result = {
  text: string;
  phonetics: string;
};

type PhoneticToken =
  | LookupToken
  | BritishToken;

type AlignedResultProps = {
  result: Result;
  onlyPhonetics: boolean;
  accent: Accent;
  aiFallbacks: Record<string, string>;
};

function normalizeLookupWord(
  word: string
): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getTokenKey(
  accent: Accent,
  word: string
): string {
  return `${accent}:${normalizeLookupWord(word)}`;
}

function AlignedResult({
  result,
  onlyPhonetics,
  accent,
  aiFallbacks,
}: AlignedResultProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const measureRef =
    useRef<HTMLDivElement>(null);

  const tokenRefs =
    useRef<
      (HTMLSpanElement | null)[]
    >([]);

  const [width, setWidth] =
    useState(0);

  const [lines, setLines] =
    useState<PhoneticToken[][]>([]);

  /*
   * IMPORTANT:
   *
   * American:
   *   CMUdict creates the tokens.
   *
   * British:
   *   Britfone creates the tokens.
   *
   * There is no cross-use between
   * the two dictionaries.
   */
  const tokens: PhoneticToken[] =
    accent === "American"
      ? lookupTokens(result.text)
      : lookupBritishTokens(result.text);

  /*
   * Apply AI fallback to tokens that
   * were not found in the local dictionary.
   */
  const displayTokens =
    tokens.map(token => {
      if (
        !("isWord" in token) ||
        !token.isWord
      ) {
        return token;
      }

      if (token.phonetics) {
        return token;
      }

      const key = getTokenKey(
        accent,
        token.text
      );

      const aiPhonetics =
        aiFallbacks[key];

      if (!aiPhonetics) {
        return {
          ...token,
          phonetics: token.text,
        };
      }

      return {
        ...token,
        phonetics: aiPhonetics,
      };
    });

  useLayoutEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      setWidth(
        Math.round(
          element.clientWidth
        )
      );
    };

    updateWidth();

    const observer =
      new ResizeObserver(updateWidth);

    observer.observe(element);

    return () =>
      observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (
      !width ||
      !measureRef.current
    ) {
      return;
    }

    const nextLines: PhoneticToken[][] =
      [];

    let currentTop:
      | number
      | null = null;

    displayTokens.forEach(
      (token, index) => {
        const element =
          tokenRefs.current[index];

        if (!element) {
          return;
        }

        const top =
          element.offsetTop;

        if (
          currentTop === null ||
          Math.abs(
            top - currentTop
          ) > 1
        ) {
          nextLines.push([]);

          currentTop = top;
        }

        nextLines[
          nextLines.length - 1
        ].push(token);
      }
    );

    setLines(
      previousLines => {
        const previousText =
          previousLines
            .map(line =>
              line
                .map(
                  token =>
                    token.text
                )
                .join("")
            )
            .join("\n");

        const nextText =
          nextLines
            .map(line =>
              line
                .map(
                  token =>
                    token.text
                )
                .join("")
            )
            .join("\n");

        if (
          previousText ===
          nextText
        ) {
          return previousLines;
        }

        return nextLines;
      }
    );
  }, [
    result.text,
    accent,
    width,
    aiFallbacks,
  ]);

  return (
    <div
      className="aligned-result"
      ref={containerRef}
    >
      <div
        className="aligned-measure"
        ref={measureRef}
        aria-hidden="true"
      >
        {displayTokens.map(
          (token, index) => (
            <span
              key={index}
              ref={element => {
                tokenRefs.current[
                  index
                ] = element;
              }}
            >
              {token.text}
            </span>
          )
        )}
      </div>

      <div className="aligned-lines">
        {lines.map(
          (line, index) => (
            <div
              className="aligned-line"
              key={index}
            >
              {!onlyPhonetics && (
                <p className="original">
                  {line
                    .map(
                      token =>
                        token.text
                    )
                    .join("")}
                </p>
              )}

              <p className="phonetics">
                {line
                  .map(
                    token =>
                      token.phonetics
                  )
                  .join("")
                }
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function App() {
  const [text, setText] =
    useState("");

  const [results, setResults] =
    useState<Result[]>([]);

  const [onlyPhonetics, setOnlyPhonetics] =
    useState(false);

  const [accent, setAccent] =
    useState<Accent>("American");

  const [aiFallbacks, setAiFallbacks] =
    useState<Record<string, string>>(
      {}
    );

  const [aiLoading, setAiLoading] =
    useState(false);

  const [feedbackOpen, setFeedbackOpen] =
    useState(false);

  const [feedback, setFeedback] =
    useState("");

  const [feedbackSending, setFeedbackSending] =
    useState(false);

  const [feedbackSent, setFeedbackSent] =
    useState(false);

  const [feedbackError, setFeedbackError] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  /*
   * Used to prevent an older AI request
   * from overwriting a newer lookup.
   */
  const requestIdRef =
    useRef(0);

  useLayoutEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const resizeTextarea = (
    element: HTMLTextAreaElement
  ) => {
    element.style.height = "auto";

    element.style.height =
      `${Math.max(
        element.scrollHeight,
        292
      )}px`;
  };

  const splitSentences = (
    value: string
  ): string[] => {
    return value
      .trim()
      .split(
        /(?<=[.!?])\s+/
      )
      .map(sentence =>
        sentence.trim()
      )
      .filter(Boolean);
  };

  const buildResults = (
    value: string,
    selectedAccent: Accent
  ): Result[] => {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    const sentences =
      splitSentences(value);

    return sentences.map(
      sentence => ({
        text: sentence,

        /*
         * The actual phonetics are
         * generated inside AlignedResult
         * from the correct dictionary.
         */
        phonetics:
          selectedAccent === "American"
            ? lookupText(sentence)
            : sentence,
      })
    );
  };

  /*
   * Find all words that are missing
   * from the selected local dictionary.
   *
   * We send unique words only.
   */
  const findMissingWords = (
    value: string,
    selectedAccent: Accent
  ): string[] => {
    const missing = new Set<string>();

    const sentences =
      splitSentences(value);

    for (const sentence of sentences) {
      if (
        selectedAccent ===
        "British"
      ) {
        const tokens =
          lookupBritishTokens(
            sentence
          );

        for (const token of tokens) {
          if (
            token.isWord &&
            !token.phonetics
          ) {
            missing.add(
              token.text
            );
          }
        }
      } else {
        const tokens =
          lookupTokens(sentence);

        for (const token of tokens) {
          if (
            "isWord" in token &&
            token.isWord &&
            !token.phonetics
          ) {
            missing.add(
              token.text
            );
          }
        }
      }
    }

    return Array.from(missing);
  };

  /*
   * Ask our Vercel API route for
   * words that local dictionaries
   * cannot find.
   *
   * The browser NEVER receives the
   * OpenAI API key.
   */
  const fetchAIFallbacks = async (
    value: string,
    selectedAccent: Accent
  ) => {
    const missingWords =
      findMissingWords(
        value,
        selectedAccent
      );

    if (
      missingWords.length === 0
    ) {
      return;
    }

    const requestId =
      ++requestIdRef.current;

    setAiLoading(true);

    try {
      const response =
        await fetch(
          "/api/phonetics",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              accent: selectedAccent,
              words: missingWords,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "AI pronunciation request failed."
        );
      }

      const data =
        (await response.json()) as {
          results?: Record<
            string,
            string
          >;
        };

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      const returned =
        data.results ?? {};

      const nextFallbacks: Record<
        string,
        string
      > = {};

      for (const word of missingWords) {
        const pronunciation =
          returned[word];

        if (
          typeof pronunciation ===
            "string" &&
          pronunciation.trim()
        ) {
          nextFallbacks[
            getTokenKey(
              selectedAccent,
              word
            )
          ] =
            pronunciation.trim();
        }
      }

      if (
        Object.keys(
          nextFallbacks
        ).length > 0
      ) {
        setAiFallbacks(
          previous => ({
            ...previous,
            ...nextFallbacks,
          })
        );
      }
    } catch (error) {
      console.error(
        "AI pronunciation fallback failed:",
        error
      );
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        setAiLoading(false);
      }
    }
  };

  const updateText = (
    value: string,
    selectedAccent: Accent
  ) => {
    setText(value);

    setResults(
      buildResults(
        value,
        selectedAccent
      )
    );

    void fetchAIFallbacks(
      value,
      selectedAccent
    );
  };

  const handleTextChange = (
    value: string,
    element: HTMLTextAreaElement
  ) => {
    resizeTextarea(element);

    updateText(
      value,
      accent
    );
  };

  const handleAccentChange = (
    nextAccent: Accent
  ) => {
    setAccent(nextAccent);

    setResults(
      buildResults(
        text,
        nextAccent
      )
    );

    void fetchAIFallbacks(
      text,
      nextAccent
    );
  };

  const handleFeedbackSubmit =
    async () => {
      const message =
        feedback.trim();

      if (
        !message ||
        feedbackSending
      ) {
        return;
      }

      setFeedbackSending(true);
      setFeedbackError("");

      try {
        const response =
          await fetch(
            "https://formspree.io/f/myezzawg",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },

              body: JSON.stringify({
                message,
                _subject:
                  "Phonety Feedback",
              }),
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to send feedback."
          );
        }

        setFeedback("");
        setFeedbackSent(true);
      } catch {
        setFeedbackError(
          "Something went wrong. Please try again."
        );
      } finally {
        setFeedbackSending(false);
      }
    };

  const closeFeedback = () => {
    setFeedbackOpen(false);
    setFeedback("");
    setFeedbackSent(false);
    setFeedbackError("");
  };

  return (
    <main className="phonety">
      <header className="header">
        <a
          className="logo"
          href="/"
        >
          <img
            src={logo}
            alt="Phonety"
          />
        </a>

        <div className="header-right">
          <button
            type="button"
            onClick={() => {
              setFeedbackOpen(true);
              setFeedbackSent(false);
              setFeedbackError("");
            }}
          >
            Feedback
          </button>
        </div>
      </header>

      <section className="hero">
        <h1>
          Look up words in
          the
          <br />
          <span>
            International Phonetic
            Alphabet
          </span>
        </h1>
      </section>

      <section className="workspace">
        <div className="input-card">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e =>
              handleTextChange(
                e.target.value,
                e.target
              )
            }
            placeholder="Type or paste your text..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        <div className="output-column">
          <div className="output-controls">
            <label className="phonetics-toggle">
              <input
                type="checkbox"
                checked={onlyPhonetics}
                onChange={e =>
                  setOnlyPhonetics(
                    e.target.checked
                  )
                }
              />

              <span>
                Only phonetics
              </span>
            </label>

            <select
              className="accent-select"
              value={accent}
              onChange={e =>
                handleAccentChange(
                  e.target.value as Accent
                )
              }
              aria-label="Accent"
            >
              <option value="American">
                American
              </option>

              <option value="British">
                British
              </option>
            </select>
          </div>

          <div className="result-card">
            <div className="results">
              {results.length === 0 && (
                <div className="empty-result">
                  Transcription
                </div>
              )}

              {results.map(
                (result, index) => (
                  <div
                    className="result"
                    key={`${accent}-${index}`}
                  >
                    <AlignedResult
                      result={result}
                      onlyPhonetics={
                        onlyPhonetics
                      }
                      accent={accent}
                      aiFallbacks={
                        aiFallbacks
                      }
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {aiLoading && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                opacity: 0.45,
                textAlign: "right",
              }}
            >
              Looking up pronunciation...
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <p>
          Pronunciation data adapted
          from the{" "}
          <a
            href="https://github.com/cmusphinx/cmudict"
            target="_blank"
            rel="noopener noreferrer"
          >
            Carnegie Mellon Pronouncing
            Dictionary (CMUdict)
          </a>
          {" "}
          for American English and{" "}
          <a
            href="https://github.com/JoseLlarena/Britfone"
            target="_blank"
            rel="noopener noreferrer"
          >
            Britfone
          </a>
          {" "}
          for British English.
          Website designed and built
          by{" "}
          <a
            href="https://buithanhuong.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Thanh Huong Bui
          </a>
          .
        </p>
      </footer>

      {feedbackOpen && (
        <div
          className="feedback-overlay"
          onMouseDown={e => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeFeedback();
            }
          }}
        >
          <div
            className="feedback-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <button
              className="feedback-close"
              type="button"
              aria-label="Close feedback"
              onClick={closeFeedback}
            >
              ×
            </button>

            {feedbackSent ? (
              <div className="feedback-success">
                <h2>
                  Thank you!
                </h2>

                <p>
                  Your feedback has
                  been sent.
                </p>

                <button
                  className="feedback-send"
                  type="button"
                  onClick={
                    closeFeedback
                  }
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 id="feedback-title">
                  Feedback
                </h2>

                <textarea
                  className="feedback-textarea"
                  value={feedback}
                  onChange={e =>
                    setFeedback(
                      e.target.value
                    )
                  }
                  placeholder="Tell us what you think..."
                  autoFocus
                />

                {feedbackError && (
                  <p className="feedback-error">
                    {feedbackError}
                  </p>
                )}

                <div className="feedback-actions">
                  <button
                    className="feedback-cancel"
                    type="button"
                    onClick={
                      closeFeedback
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="feedback-send"
                    type="button"
                    onClick={
                      handleFeedbackSubmit
                    }
                    disabled={
                      !feedback.trim() ||
                      feedbackSending
                    }
                  >
                    {feedbackSending
                      ? "Sending..."
                      : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;