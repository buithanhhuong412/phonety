import {
  useEffect,
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

/*
 * Favicon
 *
 * Uses Logo.svg as the source.
 * Light mode  -> black
 * Dark mode   -> white
 *
 * The SVG is rendered to a canvas so the
 * favicon color can be changed reliably.
 */
function updateFavicon() {
  const favicon =
    document.querySelector<HTMLLinkElement>(
      'link[rel="icon"]'
    );

  if (!favicon) {
    return;
  }

  const mediaQuery =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

  const isDark =
    mediaQuery.matches;

  const image =
    new Image();

  image.onload = () => {
    const canvas =
      document.createElement("canvas");

    const size = 64;

    canvas.width = size;
    canvas.height = size;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      size,
      size
    );

    /*
     * Logo.svg is assumed to be a dark/black logo.
     * In dark mode we invert it to white.
     */
    if (isDark) {
      context.filter =
        "brightness(0) invert(1)";
    } else {
      context.filter =
        "brightness(0)";
    }

    context.drawImage(
      image,
      0,
      0,
      size,
      size
    );

    favicon.href =
      canvas.toDataURL(
        "image/png"
      );
  };

  image.onerror = () => {
    /*
     * Fallback to the original SVG
     * if the browser cannot load it.
     */
    favicon.href = logo;
  };

  image.src = logo;
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
   * American:
   * CMUdict creates the tokens.
   *
   * British:
   * Britfone creates the tokens.
   */
  const tokens: PhoneticToken[] =
    accent === "American"
      ? lookupTokens(result.text)
      : lookupBritishTokens(result.text);

  /*
   * Apply AI fallback to tokens
   * that are missing from the
   * local dictionary.
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
                  .join("")}
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

  /*
   * Only Phonetics toggle.
   */
  const [onlyPhonetics, setOnlyPhonetics] =
    useState(false);

  /*
   * British is the default accent.
   */
  const [accent, setAccent] =
    useState<Accent>("British");

  const [aiFallbacks, setAiFallbacks] =
    useState<Record<string, string>>(
      {}
    );

  const [aiLoading, setAiLoading] =
    useState(false);

  const [isSpeaking, setIsSpeaking] =
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

  const requestIdRef =
    useRef(0);

  /*
   * Focus textarea when app loads.
   */
  useLayoutEffect(() => {
    textareaRef.current?.focus();
  }, []);

  /*
   * Setup favicon and automatically
   * update it when the system theme changes.
   */
  useEffect(() => {
    updateFavicon();

    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleThemeChange = () => {
      updateFavicon();
    };

    mediaQuery.addEventListener(
      "change",
      handleThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleThemeChange
      );
    };
  }, []);

  /*
   * Stop speech when component unmounts.
   */
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
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

        phonetics:
          selectedAccent === "American"
            ? lookupText(sentence)
            : sentence,
      })
    );
  };

  const findMissingWords = (
    value: string,
    selectedAccent: Accent
  ): string[] => {
    const missing =
      new Set<string>();

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
      missingWords.length ===
      0
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
    if (nextAccent === accent) {
      return;
    }

    /*
     * Stop any speech when changing accent.
     */
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

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

  const getOutputText = () => {
    return results
      .map(result => {
        const tokens =
          accent === "American"
            ? lookupTokens(
                result.text
              )
            : lookupBritishTokens(
                result.text
              );

        return tokens
          .map(token => {
            if (
              "isWord" in token &&
              token.isWord &&
              !token.phonetics
            ) {
              const fallback =
                aiFallbacks[
                  getTokenKey(
                    accent,
                    token.text
                  )
                ];

              return (
                fallback ||
                token.text
              );
            }

            return token.phonetics;
          })
          .join("");
      })
      .join("\n");
  };

  const handleCopy = async () => {
    const output =
      getOutputText();

    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        output
      );
    } catch (error) {
      console.error(
        "Failed to copy:",
        error
      );
    }
  };

  /*
   * Volume button:
   *
   * First click  -> start speaking
   * Second click -> stop speaking
   */
  const handleVolume = () => {
    if (!results.length) {
      return;
    }

    if (
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak =
      results
        .map(
          result =>
            result.text
        )
        .join(" ");

    const utterance =
      new SpeechSynthesisUtterance(
        textToSpeak
      );

    utterance.lang =
      accent === "American"
        ? "en-US"
        : "en-GB";

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);

    window.speechSynthesis.speak(
      utterance
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
          <div
            className="output-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "0px",
            }}
          >
            {/* ONLY PHONETICS */}
            <label
              className="phonetics-toggle"
              style={{
                background:
                  "#ffffff",
                borderRadius:
                  "24px",
                height: "40px",
                boxSizing:
                  "border-box",
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "8px",
                padding:
                  "0 14px",
                cursor:
                  "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={
                  onlyPhonetics
                }
                onChange={e =>
                  setOnlyPhonetics(
                    e.target.checked
                  )
                }
                aria-label="Only Phonetics"
                style={{
                  width:
                    "18px",
                  height:
                    "18px",
                  margin: 0,
                  cursor:
                    "pointer",
                  flexShrink:
                    0,
                }}
              />

              <span>
                Only Phonetics
              </span>
            </label>

            {/* AMERICAN / BRITISH */}
            <div
              className="accent-toggle"
              role="group"
              aria-label="Accent"
              style={{
                height: "40px",
                boxSizing:
                  "border-box",
                display:
                  "flex",
                alignItems:
                  "center",
                background:
                  "#ffffff",
                borderRadius:
                  "24px",
                padding:
                  "4px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  handleAccentChange(
                    "American"
                  )
                }
                aria-pressed={
                  accent ===
                  "American"
                }
                style={{
                  border:
                    "none",
                  borderRadius:
                    "20px",
                  padding:
                    "7px 14px",
                  background:
                    accent ===
                    "American"
                      ? "#111111"
                      : "transparent",
                  color:
                    accent ===
                    "American"
                      ? "#ffffff"
                      : "#111111",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    500,
                  transition:
                    "all 0.2s ease",
                }}
              >
                American
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAccentChange(
                    "British"
                  )
                }
                aria-pressed={
                  accent ===
                  "British"
                }
                style={{
                  border:
                    "none",
                  borderRadius:
                    "20px",
                  padding:
                    "7px 14px",
                  background:
                    accent ===
                    "British"
                      ? "#111111"
                      : "transparent",
                  color:
                    accent ===
                    "British"
                      ? "#ffffff"
                      : "#111111",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    500,
                  transition:
                    "all 0.2s ease",
                }}
              >
                British
              </button>
            </div>
          </div>

          <div
            className="result-card"
            style={{
              position:
                "relative",
            }}
          >
            {/*
             * Output actions are only visible
             * when there is transcription.
             */}
            {results.length > 0 && (
              <div
                className="output-actions"
                style={{
                  position:
                    "absolute",
                  top: "16px",
                  right: "16px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  zIndex: 2,
                }}
              >
                {/* VOLUME BUTTON */}
                <button
                  type="button"
                  aria-label={
                    isSpeaking
                      ? "Stop pronunciation"
                      : "Play pronunciation"
                  }
                  onClick={
                    handleVolume
                  }
                  style={{
                    width:
                      "32px",
                    height:
                      "32px",
                    padding:
                      "4px",
                    border:
                      "none",
                    background:
                      "transparent",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    cursor:
                      "pointer",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    {isSpeaking ? (
                      <>
                        <path
                          d="M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />

                        <path
                          d="M18 6L6 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </>
                    ) : (
                      <>
                        <path
                          d="M4 9V15H8L13 19V5L8 9H4Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />

                        <path
                          d="M16 9.5C17.3333 10.8333 17.3333 13.1667 16 14.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />

                        <path
                          d="M18.5 7C21.1667 9.66667 21.1667 14.3333 18.5 17"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>
                </button>

                {/* COPY BUTTON */}
                <button
                  type="button"
                  aria-label="Copy phonetics"
                  onClick={
                    handleCopy
                  }
                  style={{
                    width:
                      "32px",
                    height:
                      "32px",
                    padding:
                      "4px",
                    border:
                      "none",
                    background:
                      "transparent",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    cursor:
                      "pointer",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <rect
                      x="8"
                      y="8"
                      width="11"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />

                    <path
                      d="M16 8V6C16 4.89543 15.1046 4 14 4H6C4.89543 4 4 4.89543 4 6V14C4 15.1046 5 16 6 16H8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="results">
              {results.length ===
                0 && (
                <div className="empty-result">
                  Transcription
                </div>
              )}

              {results.map(
                (
                  result,
                  index
                ) => (
                  <div
                    className="result"
                    key={`${accent}-${index}`}
                  >
                    <AlignedResult
                      result={
                        result
                      }
                      onlyPhonetics={
                        onlyPhonetics
                      }
                      accent={
                        accent
                      }
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
                marginTop:
                  "8px",
                fontSize:
                  "12px",
                opacity:
                  0.45,
                textAlign:
                  "right",
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
              onClick={
                closeFeedback
              }
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
                  value={
                    feedback
                  }
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
                    {
                      feedbackError
                    }
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
