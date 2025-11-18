import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

// PUBLIC_INTERFACE
export default function Signup({ onSuccess = () => {} }) {
  /** Signup form component using AuthContext. */
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", display_name: "" });

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form.email.trim(), form.password, form.display_name.trim() || null);
      onSuccess();
    } catch (err) {
      const msg =
        (err?.data && (err.data.detail || err.data.message)) ||
        err?.message ||
        "Registration failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "12px auto" }}>
      <h3>Create account</h3>
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
          placeholder="Choose a password (min 8 chars)"
          value={form.password}
          onChange={onChange}
          required
          minLength={8}
        />
        <input
          type="text"
          name="display_name"
          placeholder="Display name (optional)"
          value={form.display_name}
          onChange={onChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
    </div>
  );
}
