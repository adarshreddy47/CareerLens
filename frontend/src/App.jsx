import { useState } from "react";
import Auth from "./Auth";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api";

function App() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState("career");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");

  function openAuth(selectedMode) {
    setAuthMode(selectedMode);
    setShowAuth(true);
  }

  function handleLogin(userData, accessToken) {
    setUser(userData);
    setToken(accessToken);
    setShowAuth(false);
    setMessage("");
    setHistory([]);
    setShowHistory(false);
    setHistoryMessage("");
  }

  function handleLogout() {
    setUser(null);
    setToken("");
    setResults([]);
    setResume(null);
    setJobDescription("");
    setMessage("");
    setHistory([]);
    setShowHistory(false);
    setHistoryMessage("");
  }

  function changeMode(newMode) {
    setMode(newMode);
    setResults([]);
    setMessage("");
    setShowHistory(false);
  }

  async function fetchHistory() {
    if (!user || !token) {
      openAuth("login");
      return;
    }

    setShowHistory(true);
    setHistoryLoading(true);
    setHistoryMessage("");
    setHistory([]);

    try {
      const response = await fetch(
        `${API_URL}/history`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        openAuth("login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to load analysis history."
        );
      }

      const records = Array.isArray(data.history)
        ? data.history
        : [];

      records.sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

      setHistory(records);

    } catch (error) {
      setHistoryMessage(error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  function viewHistoryResult(item) {
    try {
      let savedResults = item.results;

      if (typeof savedResults === "string") {
        savedResults = JSON.parse(savedResults);
      }

      let analysisResults = [];

      if (Array.isArray(savedResults)) {
        analysisResults = savedResults;
      } else if (
        Array.isArray(savedResults?.recommendations)
      ) {
        analysisResults = savedResults.recommendations;
      } else if (savedResults?.analysis) {
        analysisResults = [savedResults.analysis];
      } else if (
        savedResults?.overall_score !== undefined
      ) {
        analysisResults = [savedResults];
      } else if (
        Array.isArray(savedResults?.results)
      ) {
        analysisResults = savedResults.results;
      }

      if (analysisResults.length === 0) {
        throw new Error(
          "No saved analysis results found."
        );
      }

      setMode(
        item.analysis_type === "career"
          ? "career"
          : "job"
      );

      setResume(null);
      setJobDescription("");
      setResults(analysisResults);
      setShowHistory(false);
      setMessage("Showing your saved analysis results.");

      setTimeout(() => {
        document
          .getElementById("analysis-results")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);

    } catch (error) {
      setHistoryMessage(error.message);
    }
  }

  async function handleAnalyze() {
    setResults([]);
    setMessage("");

    if (!user || !token) {
      openAuth("login");
      return;
    }

    if (!resume) {
      setMessage("Please upload your resume.");
      return;
    }

    if (mode === "job" && !jobDescription.trim()) {
      setMessage("Please enter the job description.");
      return;
    }

    const formData = new FormData();

    formData.append("file", resume);

    if (mode === "job") {
      formData.append(
        "job_description",
        jobDescription
      );
    }

    const endpoint =
      mode === "career"
        ? "career-recommendations"
        : "job-compatibility";

    setLoading(true);
    setShowHistory(false);

    try {
      const response = await fetch(
        `${API_URL}/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        openAuth("login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Analysis failed."
        );
      }

      if (mode === "career") {
        setResults(data.recommendations || []);
      } else {
        setResults(
          data.analysis ? [data.analysis] : []
        );
      }

      setMessage("Analysis completed successfully!");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">

      <nav className="navbar">

        <div className="logo">
          Career<span>Lens</span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#analysis">Analyze Resume</a>
          <a href="#features">Features</a>
        </div>

        <div className="auth-buttons">

          {user ? (
            <>
              <span className="user-name">
                Hi, {user.name}
              </span>

              <button
                className="login-btn"
                disabled={loading || historyLoading}
                onClick={() => {
                  fetchHistory();

                  setTimeout(() => {
                    document
                      .getElementById("history")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }, 100);
                }}
              >
                My History
              </button>

              <button
                className="logout-btn"
                onClick={handleLogout}
                disabled={loading || historyLoading}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="login-btn"
                onClick={() => openAuth("login")}
              >
                Login
              </button>

              <button
                className="primary-btn"
                onClick={() => openAuth("register")}
              >
                Get Started
              </button>
            </>
          )}

        </div>

      </nav>

      <section className="hero" id="home">

        <div className="tag">
          AI-Powered Career Intelligence
        </div>

        <h1>
          Discover Your Potential.
          <br />
          <span>Build Your Future.</span>
        </h1>

        <p>
          Analyze your resume, discover suitable career
          opportunities, identify missing skills and
          prepare for your next job with AI-powered
          insights.
        </p>

        <a href="#analysis" className="primary-btn">
          Analyze My Resume →
        </a>

      </section>

      {user && showHistory && (

        <section
          className="analysis-section"
          id="history"
        >

          <h2>My Analysis History</h2>

          <p className="subtitle">
            View your previous resume analysis results.
          </p>

          <div className="analysis-card">

            <div className="mode-buttons">

              <button
                onClick={fetchHistory}
                disabled={historyLoading}
              >
                Refresh History
              </button>

              <button
                onClick={() => setShowHistory(false)}
              >
                Close History
              </button>

            </div>

            {historyLoading && (
              <p className="message">
                Loading your analysis history...
              </p>
            )}

            {historyMessage && (
              <p className="message">
                {historyMessage}
              </p>
            )}

            {!historyLoading &&
              !historyMessage &&
              history.length === 0 && (

                <div className="result-card">
                  <h3>No Analysis History</h3>

                  <p>
                    Analyze your resume to create your
                    first history record.
                  </p>
                </div>

              )}

            {history.map((item, index) => (

              <div
                className="result-card"
                key={item.id || index}
                style={{ marginTop: "20px" }}
              >

                <h3>
                  {item.analysis_type === "career"
                    ? "Career Recommendations"
                    : "Job Compatibility"}
                </h3>

                <p style={{ marginTop: "10px" }}>
                  <strong>Resume:</strong>{" "}
                  {item.filename ||
                    item.resume_filename ||
                    `Resume #${item.resume_id}`}
                </p>

                <p style={{ marginTop: "8px" }}>
                  <strong>Analyzed on:</strong>{" "}
                  {item.created_at
                    ? new Date(
                        item.created_at
                      ).toLocaleString()
                    : "Not available"}
                </p>

                <button
                  className="primary-btn analyze-btn"
                  style={{ marginTop: "18px" }}
                  onClick={() =>
                    viewHistoryResult(item)
                  }
                >
                  View Results
                </button>

              </div>

            ))}

          </div>

        </section>

      )}

      <section
        className="analysis-section"
        id="analysis"
      >

        <h2>Unlock Your Career Insights</h2>

        <p className="subtitle">
          Upload your resume and choose your analysis
          type.
        </p>

        <div className="analysis-card">

          <div className="mode-buttons">

            <button
              className={
                mode === "career" ? "active" : ""
              }
              onClick={() => changeMode("career")}
              disabled={loading}
            >
              Career Recommendations
            </button>

            <button
              className={
                mode === "job" ? "active" : ""
              }
              onClick={() => changeMode("job")}
              disabled={loading}
            >
              Job Compatibility
            </button>

          </div>

          {!user && (

            <div className="login-notice">

              Please log in to analyze your resume.

              <button
                onClick={() => openAuth("login")}
              >
                Login Now
              </button>

            </div>

          )}

          <label className="upload-box">

            <div className="upload-icon">📄</div>

            <h3>
              {resume
                ? resume.name
                : "Upload Your Resume"}
            </h3>

            <p>Click here to select a PDF file</p>

            <input
              type="file"
              accept=".pdf"
              disabled={loading}
              onChange={(e) => {
                setResume(
                  e.target.files[0] || null
                );
                setMessage("");
                setResults([]);
              }}
              onClick={(e) => {
                e.currentTarget.value = "";
              }}
            />

          </label>

          {mode === "job" && (

            <div className="job-input">

              <label>Job Description</label>

              <textarea
                placeholder="Paste the company's job description here..."
                value={jobDescription}
                disabled={loading}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  setResults([]);
                  setMessage("");
                }}
              />

            </div>

          )}

          <button
            className="primary-btn analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || historyLoading}
          >

            {loading
              ? "Analyzing your resume..."
              : mode === "career"
              ? "Find Suitable Career Roles"
              : "Analyze Job Compatibility"}

          </button>

          {message && (
            <p className="message">{message}</p>
          )}

          {results.length > 0 && (

            <div
              className="results-section"
              id="analysis-results"
            >

              <h2>AI Analysis Results</h2>

              {results.map((result, index) => (

                <div
                  className="result-card"
                  key={index}
                >

                  <h3>
                    {result.job_role ||
                      "Job Compatibility Report"}
                  </h3>

                  <div className="score">
                    {result.overall_score}%
                  </div>

                  <p>Overall Match Score</p>

                  <div className="score-track">

                    <div
                      className="score-fill"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            Number(
                              result.overall_score
                            ) || 0
                          )
                        )}%`,
                      }}
                    />

                  </div>

                  <p>
                    Semantic Similarity:{" "}
                    {result.semantic_score}%
                  </p>

                  <p>
                    Technical Skill Match:{" "}
                    {result.skill_score == null
                      ? "Not available"
                      : `${result.skill_score}%`}
                  </p>

                  <div className="skill-columns">

                    <div>

                      <h4 className="matching-title">

                        Matching Skills (
                        {
                          (result.matching_skills || [])
                            .length
                        })

                      </h4>

                      {(result.matching_skills || [])
                        .length === 0 && (

                        <p>
                          No matching skills detected.
                        </p>

                      )}

                      {(result.matching_skills || [])
                        .map((skill) => (

                          <span
                            className="matching-skill"
                            key={skill}
                          >
                            {skill}
                          </span>

                        ))}

                    </div>

                    <div>

                      <h4 className="missing-title">

                        Missing Skills (
                        {
                          (result.missing_skills || [])
                            .length
                        })

                      </h4>

                      {(result.missing_skills || [])
                        .length === 0 && (

                        <p>
                          No missing skills detected.
                        </p>

                      )}

                      {(result.missing_skills || [])
                        .map((skill) => (

                          <span
                            className="missing-skill"
                            key={skill}
                          >
                            {skill}
                          </span>

                        ))}

                    </div>

                  </div>

                  <div className="recommendation-box">

                    <h4>AI Recommendation</h4>

                    <p>{result.recommendation}</p>

                  </div>

                  <small>
                    Match scores are estimates, not
                    hiring probabilities. Skill detection
                    is based on supported skills
                    mentioned in the resume.
                  </small>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>

      <section
        className="features-section"
        id="features"
      >

        <h2>Everything You Need to Grow</h2>

        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">📊</div>

            <h3>Resume Analysis</h3>

            <p>
              Extract and analyze information from
              your resume using Python and AI.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">🎯</div>

            <h3>Career Recommendations</h3>

            <p>
              Discover suitable job roles based on
              your professional profile.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">🧠</div>

            <h3>Semantic Matching</h3>

            <p>
              Compare resumes and job descriptions
              based on their meaning.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">📈</div>

            <h3>Skill-Gap Analysis</h3>

            <p>
              Identify missing skills and understand
              what you need to learn.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">💼</div>

            <h3>Job Compatibility</h3>

            <p>
              Understand how closely your resume
              aligns with a specific job description.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">🕒</div>

            <h3>Analysis History</h3>

            <p>
              Access your previous resume analyses,
              career recommendations and job
              compatibility reports.
            </p>

          </div>

        </div>

      </section>

      <footer>

        <h3>CareerLens</h3>

        <p>
          AI-Powered Resume Analysis & Career
          Recommendation
        </p>

        <p>
          © 2026 CareerLens. All rights reserved.
        </p>

      </footer>

      {showAuth && (

        <Auth
          mode={authMode}
          setMode={setAuthMode}
          onLogin={handleLogin}
          onClose={() => setShowAuth(false)}
        />

      )}

    </div>
  );
}

export default App;