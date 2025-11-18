import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

// PUBLIC_INTERFACE
export default function Login({ onSuccess = () => {} }) {
  /** Login form component using AuthContext. */
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email.trim(), form.password);
      onSuccess();
    } catch (err) {
      const msg =
        (err?.data && (err.data.detail || err.data.message)) ||
        err?.message ||
        "Login failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "12px auto" }}>
      <h3>Log in</h3>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <form onSubmit={onSubmit} className="row form" style={{ flexDirection: "column", gap: 8 }}>
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Your password"
          value={form.password}
          onChange={onChange}
          required
          minLength={8}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
