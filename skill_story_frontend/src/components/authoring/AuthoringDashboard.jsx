import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/client";
import "../story.css";

/**
 * Instructor-only Authoring dashboard: manage Stories -> Episodes -> Choices & Quiz Questions.
 * Uses optimistic updates where safe and shows developer-friendly messages if backend authoring endpoints are not implemented yet.
 */
export default function AuthoringDashboard() {
  const { user } = useAuth();

  const isInstructor = useMemo(() => {
    // Prefer /api/auth/me -> user.role === "instructor"
    const role = user && (user.role || user.roles?.[0]);
    return String(role || "").toLowerCase() === "instructor";
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState([]);
  const [error, setError] = useState("");

  const [selectedStory, setSelectedStory] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [epError, setEpError] = useState("");

  const [activeEpIndex, setActiveEpIndex] = useState(null);
  const [choices, setChoices] = useState([]);
  const [quizQs, setQuizQs] = useState([]);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!isInstructor) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.authorListStories();
        setStories(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        const msg =
          (e?.data && (e.data.detail || e.data.message)) ||
          e?.message ||
          "Failed to load authoring stories.";
        setError(
          `${msg} ${e?.developerHint ? `Hint: ${e.developerHint}` : ""}`.trim()
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [isInstructor]);

  const refreshEpisodes = async (storyId) => {
    setEpError("");
    try {
      const res = await api.authorListEpisodes(storyId);
      setEpisodes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg =
        (e?.data && (e.data.detail || e.data.message)) ||
        e?.message ||
        "Failed to load episodes.";
      setEpError(msg);
    }
  };

  const refreshChoicesQuiz = async (storyId, epIndex) => {
    setDetailError("");
    try {
      const cRes = await api.authorListChoices(storyId, epIndex);
      setChoices(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (e) {
      const msg =
        (e?.data && (e.data.detail || e.data.message)) ||
        e?.message ||
        "Failed to load choices.";
      setDetailError(msg);
    }
    try {
      const qRes = await api.authorListQuizQuestions(storyId, epIndex);
      setQuizQs(Array.isArray(qRes.data) ? qRes.data : []);
    } catch (e) {
      // If not implemented, we just note it softly
      // Do not override choices error if present
    }
  };

  if (!user) {
    return (
      <div className="layout">
        <main className="content">
          <h2>Authoring</h2>
          <div className="error">You must be signed in.</div>
        </main>
      </div>
    );
  }
  if (!isInstructor) {
    return (
      <div className="layout">
        <main className="content">
          <h2>Authoring</h2>
          <div className="error">You do not have instructor access.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="panel left">
        <h2>Stories</h2>
        {loading && <div className="muted">Loading…</div>}
        {error && <div className="error">{error}</div>}
        <StoryForm
          onSubmit={async (payload) => {
            const tmpId = `tmp-${Date.now()}`;
            const optimistic = { id: tmpId, ...payload };
            setStories((s) => [optimistic, ...s]);
            try {
              const res = await api.authorCreateStory(payload);
              // replace optimistic
              setStories((s) =>
                s.map((it) => (it.id === tmpId ? res.data : it))
              );
            } catch (e) {
              setStories((s) => s.filter((it) => it.id !== tmpId));
              alert(
                (e?.data && (e.data.detail || e.data.message)) ||
                  e?.message ||
                  "Failed to create story."
              );
            }
          }}
        />
        <ul className="list">
          {stories.map((s) => (
            <li
              key={s.id}
              className={String(selectedStory?.id) === String(s.id) ? "active" : ""}
            >
              <button
                onClick={async () => {
                  setSelectedStory(s);
                  setActiveEpIndex(null);
                  setChoices([]);
                  setQuizQs([]);
                  await refreshEpisodes(s.id);
                }}
              >
                <div className="title">
                  {s.title}{" "}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {s.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="subtitle">{s.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="content">
        <h2>Episodes</h2>
        {!selectedStory && <div className="muted">Select a story.</div>}
        {selectedStory && (
          <>
            {epError && <div className="error">{epError}</div>}
            <EpisodeForm
              storyId={selectedStory.id}
              onSubmit={async (payload) => {
                // optimistic add
                const optimistic = { ...payload };
                setEpisodes((e) => {
                  const next = Array.isArray(e) ? [...e] : [];
                  next.push(optimistic);
                  return next.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
                });
                try {
                  await api.authorCreateEpisode(selectedStory.id, payload);
                  await refreshEpisodes(selectedStory.id);
                } catch (e) {
                  await refreshEpisodes(selectedStory.id);
                  alert(
                    (e?.data && (e.data.detail || e.data.message)) ||
                      e?.message ||
                      "Failed to create episode."
                  );
                }
              }}
            />
            <div className="card">
              {episodes.length === 0 ? (
                <div className="muted">No episodes yet.</div>
              ) : (
                <ul className="list">
                  {episodes.map((ep) => (
                    <li
                      key={ep.index}
                      className={
                        String(activeEpIndex) === String(ep.index) ? "active" : ""
                      }
                    >
                      <button
                        onClick={async () => {
                          setActiveEpIndex(ep.index);
                          await refreshChoicesQuiz(selectedStory.id, ep.index);
                        }}
                      >
                        <div className="title">
                          Episode {ep.index} {ep.is_quiz ? "(Quiz)" : ""}
                        </div>
                        <div className="subtitle">
                          {(ep.content || ep.text || "").slice(0, 120)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      <aside className="panel right">
        <h3>Details</h3>
        {!selectedStory || activeEpIndex == null ? (
          <div className="muted">Select an episode to manage details.</div>
        ) : (
          <>
            {detailError && <div className="error">{detailError}</div>}
            <div className="card">
              <h4>Choices</h4>
              <ChoiceForm
                onSubmit={async (payload) => {
                  // optimistic add
                  const tmpId = `tmp-${Date.now()}`;
                  const optimistic = { id: tmpId, ...payload };
                  setChoices((c) => [...c, optimistic]);
                  try {
                    const res = await api.authorCreateChoice(
                      selectedStory.id,
                      activeEpIndex,
                      payload
                    );
                    setChoices((c) =>
                      c.map((it) => (it.id === tmpId ? res.data : it))
                    );
                  } catch (e) {
                    setChoices((c) => c.filter((it) => it.id !== tmpId));
                    alert(
                      (e?.data && (e.data.detail || e.data.message)) ||
                        e?.message ||
                        "Failed to add choice."
                    );
                  }
                }}
              />
              <ul className="list">
                {choices.map((c) => (
                  <li key={c.id}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div className="title">{c.label}</div>
                        <div className="subtitle">
                          next: {String(c.next_episode_index)}, xp:{" "}
                          {String(c.xp_delta || 0)}, terminal:{" "}
                          {c.terminal ? "yes" : "no"}
                        </div>
                      </div>
                      <div>
                        <button
                          className="choice"
                          onClick={async () => {
                            try {
                              await api.authorDeleteChoice(
                                selectedStory.id,
                                activeEpIndex,
                                c.id
                              );
                              setChoices((list) =>
                                list.filter((x) => String(x.id) !== String(c.id))
                              );
                            } catch (e) {
                              alert("Delete failed.");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h4>Quiz Questions</h4>
              <QuizQuestionForm
                onSubmit={async (payload) => {
                  // optimistic add
                  const tmpId = `tmp-${Date.now()}`;
                  const optimistic = { id: tmpId, ...payload };
                  setQuizQs((q) => [...q, optimistic]);
                  try {
                    const res = await api.authorCreateQuizQuestion(
                      selectedStory.id,
                      activeEpIndex,
                      payload
                    );
                    setQuizQs((q) =>
                      q.map((it) => (it.id === tmpId ? res.data : it))
                    );
                  } catch (e) {
                    setQuizQs((q) => q.filter((it) => it.id !== tmpId));
                    alert(
                      (e?.data && (e.data.detail || e.data.message)) ||
                        e?.message ||
                        "Failed to add quiz question."
                    );
                  }
                }}
              />
              <ul className="list">
                {quizQs.map((q) => (
                  <li key={q.id}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div className="title">
                          [{(q.type || "MCQ").toUpperCase()}] {q.prompt}
                        </div>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="subtitle">
                            Options: {q.options.join(", ")} | Correct: {String(q.correct_answer)}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          className="choice"
                          onClick={async () => {
                            try {
                              await api.authorDeleteQuizQuestion(
                                selectedStory.id,
                                activeEpIndex,
                                q.id
                              );
                              setQuizQs((list) =>
                                list.filter((x) => String(x.id) !== String(q.id))
                              );
                            } catch (e) {
                              alert("Delete failed.");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/** Story form to create/update basic details */
export function StoryForm({ onSubmit }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    tags: "",
    published: false,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // PUBLIC_INTERFACE
  function validate(f) {
    /** Basic validation for story form fields. */
    if (!f.title || f.title.trim().length < 3) {
      return "Title is required (min 3 chars).";
    }
    if (f.description && f.description.length > 1000) {
      return "Description too long (max 1000).";
    }
    if (f.tags && f.tags.length > 200) {
      return "Tags too long (max 200).";
    }
    return "";
  }

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError("");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      published: !!form.published,
    };
    await onSubmit(payload);
    setForm({ title: "", description: "", tags: "", published: false });
  };

  return (
    <div className="card">
      <h3>Create Story</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="row form" style={{ flexDirection: "column", gap: 8 }}>
        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          required
          minLength={3}
        />
        <textarea
          name="description"
          placeholder="Short description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          style={{ resize: "vertical", padding: 8, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
        <input
          name="tags"
          placeholder="Tags (comma separated)"
          value={form.tags}
          onChange={handleChange}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="published" checked={form.published} onChange={handleChange} />
          Publish now
        </label>
        <button type="submit" className="choice">Save Story</button>
      </form>
    </div>
  );
}

/** Episode create/edit form */
export function EpisodeForm({ storyId, onSubmit }) {
  const [form, setForm] = useState({
    index: "",
    content: "",
    is_quiz: false,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // PUBLIC_INTERFACE
  function validate(f) {
    /** Validate episode fields. */
    const idx = Number(f.index);
    if (!Number.isInteger(idx) || idx < 0) {
      return "Index must be a non-negative integer.";
    }
    if (!f.content || f.content.trim().length < 1) {
      return "Content is required.";
    }
    if (f.content.length > 5000) {
      return "Content too long (max 5000).";
    }
    return "";
    }

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError("");
    const payload = {
      index: Number(form.index),
      content: form.content.trim(),
      is_quiz: !!form.is_quiz,
    };
    await onSubmit(payload, storyId);
    setForm({ index: "", content: "", is_quiz: false });
  };

  return (
    <div className="card">
      <h3>Add Episode</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="row form" style={{ flexDirection: "column", gap: 8 }}>
        <input
          name="index"
          placeholder="Index (e.g., 0, 1, 2)"
          value={form.index}
          onChange={handleChange}
          required
          inputMode="numeric"
        />
        <textarea
          name="content"
          placeholder="Episode content"
          value={form.content}
          onChange={handleChange}
          rows={6}
          style={{ resize: "vertical", padding: 8, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="is_quiz" checked={form.is_quiz} onChange={handleChange} />
          This is a quiz episode
        </label>
        <button type="submit" className="choice">Save Episode</button>
      </form>
    </div>
  );
}

/** Choice form */
export function ChoiceForm({ onSubmit }) {
  const [form, setForm] = useState({
    label: "",
    next_episode_index: "",
    xp_delta: "0",
    terminal: false,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // PUBLIC_INTERFACE
  function validate(f) {
    /** Validate choice fields. */
    if (!f.label || f.label.trim().length < 1) {
      return "Label is required.";
    }
    if (f.label.length > 200) {
      return "Label too long (max 200).";
    }
    if (f.next_episode_index !== "" && !Number.isInteger(Number(f.next_episode_index))) {
      return "Next episode index must be an integer.";
    }
    if (!Number.isFinite(Number(f.xp_delta))) {
      return "XP delta must be a number.";
    }
    return "";
  }

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError("");
    const payload = {
      label: form.label.trim(),
      next_episode_index:
        form.next_episode_index === "" ? null : Number(form.next_episode_index),
      xp_delta: Number(form.xp_delta || 0),
      terminal: !!form.terminal,
    };
    await onSubmit(payload);
    setForm({ label: "", next_episode_index: "", xp_delta: "0", terminal: false });
  };

  return (
    <form onSubmit={submit} className="row form" style={{ flexDirection: "column", gap: 8 }}>
      {error && <div className="error">{error}</div>}
      <input name="label" placeholder="Choice label" value={form.label} onChange={handleChange} />
      <input
        name="next_episode_index"
        placeholder="Next episode index (or blank)"
        value={form.next_episode_index}
        onChange={handleChange}
        inputMode="numeric"
      />
      <input
        name="xp_delta"
        placeholder="XP delta (e.g., 5)"
        value={form.xp_delta}
        onChange={handleChange}
        inputMode="numeric"
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" name="terminal" checked={form.terminal} onChange={handleChange} />
        Terminal choice (ends story)
      </label>
      <button type="submit" className="choice">Add Choice</button>
    </form>
  );
}

/** Quiz question form (MCQ/TF) */
export function QuizQuestionForm({ onSubmit }) {
  const [form, setForm] = useState({
    type: "MCQ", // or TF
    prompt: "",
    optionsText: "",
    correct_answer: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // PUBLIC_INTERFACE
  function validate(f) {
    /** Validate quiz question fields. */
    if (!f.prompt || f.prompt.trim().length < 3) {
      return "Prompt is required (min 3 chars).";
    }
    const t = (f.type || "MCQ").toUpperCase();
    if (t !== "MCQ" && t !== "TF") {
      return "Type must be MCQ or TF.";
    }
    if (t === "MCQ") {
      const options = (f.optionsText || "")
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2) {
        return "Provide at least two options for MCQ (one per line).";
      }
      if (!options.includes(f.correct_answer)) {
        return "Correct answer must match one of the options exactly.";
      }
    } else if (t === "TF") {
      if (!["true", "false"].includes(String(f.correct_answer).toLowerCase())) {
        return "Correct answer for TF must be 'true' or 'false'.";
      }
    }
    return "";
  }

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError("");
    const t = (form.type || "MCQ").toUpperCase();
    const payload =
      t === "MCQ"
        ? {
            type: "MCQ",
            prompt: form.prompt.trim(),
            options: (form.optionsText || "")
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean),
            correct_answer: form.correct_answer,
          }
        : {
            type: "TF",
            prompt: form.prompt.trim(),
            correct_answer: String(form.correct_answer).toLowerCase() === "true",
          };
    await onSubmit(payload);
    setForm({ type: "MCQ", prompt: "", optionsText: "", correct_answer: "" });
  };

  return (
    <form onSubmit={submit} className="row form" style={{ flexDirection: "column", gap: 8 }}>
      {error && <div className="error">{error}</div>}
      <select name="type" value={form.type} onChange={handleChange}>
        <option value="MCQ">Multiple Choice</option>
        <option value="TF">True/False</option>
      </select>
      <input
        name="prompt"
        placeholder="Question prompt"
        value={form.prompt}
        onChange={handleChange}
      />
      {form.type === "MCQ" ? (
        <>
          <textarea
            name="optionsText"
            placeholder="Options (one per line)"
            rows={3}
            value={form.optionsText}
            onChange={handleChange}
            style={{ resize: "vertical", padding: 8, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
          <input
            name="correct_answer"
            placeholder="Correct option (must match one line exactly)"
            value={form.correct_answer}
            onChange={handleChange}
          />
        </>
      ) : (
        <select
          name="correct_answer"
          value={form.correct_answer}
          onChange={handleChange}
        >
          <option value="">Select correct answer</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      )}
      <button type="submit" className="choice">Add Question</button>
    </form>
  );
}
