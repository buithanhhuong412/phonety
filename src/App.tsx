import { useState } from "react";
import "./index.css";

type Result = {
  text: string;
  phonetics: string;
};

const demoResults: Result[] = [
  {
    text: "There are aliens out there, somewhere.",
    phonetics:
      "ðər ɑːr ˈeɪliənz aʊt ðeər, ˈsʌmwɛər.",
  },
  {
    text: "I strongly believe this.",
    phonetics:
      "aɪ ˈstrɒŋli bɪˈliːv ðɪs.",
  },
];

function App() {
  const [text, setText] = useState(
    "There are aliens out there, somewhere. I strongly believe this."
  );

  const [results, setResults] = useState<Result[]>(demoResults);

  const [accent, setAccent] = useState<"British" | "American">(
    "British"
  );

  const [onlyPhonetics, setOnlyPhonetics] = useState(false);

  const handleLookup = () => {
    const value = text.trim();

    if (!value) {
      setResults([]);
      return;
    }

    // Temporary result.
    // Later we will replace this with the real IPA data source.
    setResults([
      {
        text: value,
        phonetics:
          accent === "British"
            ? "ðə ˈwɜːd ɪz ˈprəʊnənst"
            : "ðə ˈwɝːd ɪz ˈproʊnənst",
      },
    ]);
  };

  const handleClear = () => {
    setText("");
    setResults([]);
  };

  return (
    <main className="phonety">
      {/* HEADER */}

      <header className="header">
        <div className="logo">/p/</div>

        <div className="header-right">
          <button type="button">VN⌄</button>
          <button type="button">Feedback</button>
        </div>
      </header>

      {/* HERO */}

      <section className="hero">
        <h1>
          Look up words in the
          <br />
          <span>International Phonetic Alphabet</span>
        </h1>
      </section>

      {/* WORKSPACE */}

      <section className="workspace">

        {/* INPUT */}

        <div className="input-card">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text..."
          />

          <div className="input-actions">
            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
            >
              clear
            </button>

            <button
              type="button"
              className="lookup-button"
              onClick={handleLookup}
            >
              lookup
            </button>
          </div>
        </div>

        {/* RESULTS */}

        <div className="result-card">

          {/* CONTROLS */}

          <div className="result-controls">

            <button
              type="button"
              className="control-button"
              onClick={() =>
                setOnlyPhonetics(!onlyPhonetics)
              }
            >
              <span
                className={`radio ${
                  onlyPhonetics ? "checked" : ""
                }`}
              />

              Only phonetics
            </button>

            <button
              type="button"
              className="control-button"
              onClick={() =>
                setAccent(
                  accent === "British"
                    ? "American"
                    : "British"
                )
              }
            >
              {accent}⌄
            </button>

          </div>

          {/* RESULTS */}

          <div className="results">

            {results.length === 0 && (
              <div className="empty-result">
                type something to look up
              </div>
            )}

            {results.map((result, index) => (
              <div
                className="result"
                key={index}
              >
                {!onlyPhonetics && (
                  <p className="original">
                    {result.text}
                  </p>
                )}

                <p className="phonetics">
                  {result.phonetics}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>
    </main>
  );
}

export default App;