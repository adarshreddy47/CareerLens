import { useState } from "react";
import "./Auth.css";

function Auth({ mode, setMode, onLogin, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (isRegister) {
      if (
        password.length < 8 ||
        !/[A-Za-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9\s]/.test(password)
      ) {
        setMessage(
          "Password must contain at least 8 characters, a letter, a number and a special character."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "register" : "login";

      const body = isRegister
        ? { name, email, password }
        : { email, password };

      const response = await fetch(
        `http://127.0.0.1:8000/api/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Something went wrong."
        );
      }

      if (isRegister) {
        setMode("login");
        setPassword("");
        setMessage(
          "Account created successfully! Please log in."
        );
      } else {
        onLogin(data.user, data.access_token);
        onClose();
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setMessage("");
    setPassword("");
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">

        <button
          className="auth-close"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
        >
          ×
        </button>

        <div className="auth-logo">
          Career<span>Lens</span>
        </div>

        <h2>
          {isRegister
            ? "Create Your Account"
            : "Welcome Back"}
        </h2>

        <p className="auth-subtitle">
          {isRegister
            ? "Start your AI-powered career journey."
            : "Log in to access your career insights."}
        </p>

        <form onSubmit={handleSubmit}>

          {isRegister && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="password-rules">
              <p>Password requirements:</p>

              <p className={
                password.length >= 8 ? "valid" : ""
              }>
                • At least 8 characters
              </p>

              <p className={
                /[A-Za-z]/.test(password) ? "valid" : ""
              }>
                • At least one letter
              </p>

              <p className={
                /[0-9]/.test(password) ? "valid" : ""
              }>
                • At least one number
              </p>

              <p className={
                /[^A-Za-z0-9\s]/.test(password)
                  ? "valid"
                  : ""
              }>
                • At least one special character
              </p>
            </div>
          )}

          {message && (
            <p className="auth-message">{message}</p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "Create Account"
              : "Login"}
          </button>

        </form>

        <p className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={switchMode}
            disabled={loading}
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </p>

      </div>
    </div>
  );
}

export default Auth;