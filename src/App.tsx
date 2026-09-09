import "./index.css";

function App() {
  return (
    <main className="phonety">
      {/* Header */}
      <header className="header">
        <div className="logo">/p/</div>

        <div className="header-right">
          <button>VN⌄</button>
          <button>Feedback</button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1>
          Look up your phonetics from
          <br />
          the <span>Cambridge Dictionary</span>
        </h1>
      </section>

      {/* Workspace */}
      <section className="workspace">
        {/* Left */}
        <div className="input-card">
          <p>
            There are aliens out there, somewhere. I strongly believe this.
            Not sure what they look like, though. I really doubt they are
            green, like they are in science fiction movies.
          </p>

          <p>
            I also don’t think they look like us. But I’m sure they exist.
            I just don’t think we’ll ever see them.
          </p>

          <p>
            A planet needs to be warm enough for life to exist.
          </p>

          <p>
            There are billions and billions of planets out there.
          </p>
        </div>

        {/* Right */}
        <div className="result-card">
          <div className="result-controls">
            <button className="control-button">
              <span className="radio" />
              Only phonetics
            </button>

            <button className="control-button">
              British⌄
            </button>
          </div>

          <div className="results">
            <Result />
            <Result />
            <Result />
            <Result />
            <Result />
            <Result />
          </div>
        </div>
      </section>
    </main>
  );
}

function Result() {
  return (
    <div className="result">
      <p className="original">
        There are aliens out there, somewhere. I strongly believe this
      </p>

      <p className="phonetics">
        ðər ɑːr ˈeɪliənz aʊt ðeər, ˈsʌmwɛər. aɪ ˈstrɒŋli bɪˈliːv ðɪs
      </p>
    </div>
  );
}

export default App;