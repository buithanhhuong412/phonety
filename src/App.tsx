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
      "There are aliens out there, somewhere. I strongly believe this."
    );

  const [results, setResults] =
    useState<Result[]>([]);

  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null
    );

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
          <button type="button">
            VN⌄
          </button>

          <button type="button">
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
                type something to look up
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
    </main>
  );
}

export default App;