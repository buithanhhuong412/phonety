```tsx
import { useState } from "react";
import "./index.css";

type Result = {
  text: string;
  phonetics: string;
};

/* ================================
   DEMO DATA
================================ */

const DEMO_RESULTS: Result[] = [
  {
    text: "There are aliens out there, somewhere.",
    phonetics: "ðər ɑːr ˈeɪliənz aʊt ðeər, ˈsʌmwɛər.",
  },
  {
    text: "I strongly believe this.",
    phonetics: "aɪ ˈstrɒŋli bɪˈliːv ðɪs.",
  },
];

const DEFAULT_TEXT =
  "There are aliens out there, somewhere. I strongly believe this.";

/* ================================
   APP
================================ */

function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [results, setResults] = useState<Result[]>(DEMO_RESULTS);

  const [accent, setAccent] =
    useState<"British" | "American">("British");

  const [onlyPhonetics, setOnlyPhonetics] = useState(false);

  /* ==============================
     ACTIONS
  ============================== */

  const handleLookup = () => {
    const value = text.trim();

    if (!value) {
      setResults([]);
      return;
    }

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

  const toggleAccent = () => {
    setAccent((current) =>
      current === "British" ? "American" : "British"
    );
  };

  /* ==============================
     UI
  ============================== */

  return (
    <main className="phonety">

      {/* HEADER */}

      <header className="header">
        <a className="logo" href="/">
          <img src="/logo.svg" alt="Phonety" />
        </a>

        <nav className="header-right">
          <button type="button">
            VN⌄
          </button>

          <button type="button">
            Feedback
          </button>
        </nav>
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

        <section className="input-card">

          <textarea
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
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

        </section>


        {/* RESULTS */}

        <section className="result-card">

          {/* CONTROLS */}

          <div className="result-controls">

            <button
              type="button"
              className="control-button"
              onClick={() =>
                setOnlyPhonetics(
                  (current) => !current
                )
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
              onClick={toggleAccent}
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
              <article
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

              </article>
            ))}

          </div>

        </section>

      </section>

    </main>
  );
}

export default App;
```
