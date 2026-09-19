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

type Result = {
  text: string;
  phonetics: string;
};

type AlignedResultProps = {
  result: Result;
};

function AlignedResult({
  result,
}: AlignedResultProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const measureRef =
    useRef<HTMLDivElement>(null);

  const tokenRefs =
    useRef<(HTMLSpanElement | null)[]>([]);

  const [width, setWidth] =
    useState(0);

  const [lines, setLines] =
    useState<LookupToken[][]>([]);

  const tokens = lookupTokens(
    result.text
  );

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
      new ResizeObserver(
        updateWidth
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (
      !width ||
      !measureRef.current
    ) {
      return;
    }

    const nextLines: LookupToken[][] =
      [];

    let currentTop:
      | number
      | null = null;

    tokens.forEach(
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
      (previousLines) => {
        const previousText =
          previousLines
            .map((line) =>
              line
                .map(
                  (token) =>
                    token.text
                )
                .join("")
            )
            .join("\n");

        const nextText =
          nextLines
            .map((line) =>
              line
                .map(
                  (token) =>
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
    width,
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
        {tokens.map(
          (token, index) => (
            <span
              key={index}
              ref={(element) => {
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
              <p className="original">
                {line
                  .map(
                    (token) =>
                      token.text
                  )
                  .join("")}
              </p>

              <p className="phonetics">
                {line
                  .map(
                    (token) =>
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
    useState(
      ""
    );

  const [results, setResults] =
    useState<Result[]>([]);

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
    useRef<HTMLTextAreaElement>(
      null
    );

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const resizeTextarea = (
    element: HTMLTextAreaElement
  ) => {
    element.style.height =
      "auto";

    element.style.height = `${Math.max(
      element.scrollHeight,
      292
    )}px`;
  };

  const handleTextChange = (
    value: string,
    element: HTMLTextAreaElement
  ) => {
    setText(value);

    resizeTextarea(element);

    const trimmed =
      value.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    const sentences =
      trimmed
        .split(
          /(?<=[.!?])\s+/
        )
        .map(
          (sentence) =>
            sentence.trim()
        )
        .filter(Boolean);

    setResults(
      sentences.map(
        (sentence) => ({
          text: sentence,
          phonetics:
            lookupText(
              sentence
            ),
        })
      )
    );
  };

  const handleFeedbackSubmit = async () => {
    const message = feedback.trim();

    if (!message || feedbackSending) {
      return;
    }

    setFeedbackSending(true);
    setFeedbackError("");

    try {
      const response = await fetch(
        "https://formspree.io/f/myezzawg",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message,
            _subject: "Phonety Feedback",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send feedback.");
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

  const handleCopy = async () => {
  if (!results.length) {
    return;
  }

  const phonetics = results
    .map((result) => result.phonetics)
    .join("\n");

  try {
    await navigator.clipboard.writeText(
      phonetics
    );
  } catch {
    // Ignore clipboard errors.
  }
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
            onChange={(e) =>
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
                  key={index}
                >
                  <AlignedResult
                    result={result}
                  />
                </div>
              )
            )}
          </div>
        </div>
            </section>
            {feedbackOpen && (
              <div
                className="feedback-overlay"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setFeedbackOpen(false);
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
                    onClick={() => setFeedbackOpen(false)}
                  >
                    ×
                  </button>

                  <h2 id="feedback-title">
                    Feedback
                  </h2>

                  <textarea
                    className="feedback-textarea"
                    value={feedback}
                    onChange={(e) =>
                      setFeedback(e.target.value)
                    }
                    placeholder="Tell us what you think..."
                    autoFocus
                  />

                  <div className="feedback-actions">
                    <button
                      className="feedback-cancel"
                      type="button"
                      onClick={() => {
                        setFeedback("");
                        setFeedbackOpen(false);
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      className="feedback-send"
                      type="button"
                      onClick={() => {
                        const subject =
                          encodeURIComponent("Phonety Feedback");

                        const body =
                          encodeURIComponent(feedback);

                        window.location.href =
                          `mailto:buithanhhuong682@gmail.com?subject=${subject}&body=${body}`;

                        setFeedback("");
                        setFeedbackOpen(false);
                      }}
                      disabled={!feedback.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        );
}

export default App;