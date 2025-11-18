import React, { useMemo, useState } from "react";
import { useStories, useEpisode, useSubmitChoice, useProgress, useProfile, useJournal } from "../hooks/useApi";
import "./story.css";

/**
 * Minimal end-to-end UI:
 * - Left: Stories list and select
 * - Center: Current episode text and choices (choose to advance)
 * - Right top: Profile and XP/Progress
 * - Right bottom: Journal entries and add form
 */
export default function StoryBrowser() {
  const { data: stories, loading: loadingStories, error: storiesError } = useStories();

  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [epIndex, setEpIndex] = useState(0);

  const { data: ep, loading: loadingEp, error: epError, refetch: refetchEp } = useEpisode(selectedStoryId, epIndex);
  const { submit, loading: submitting, error: submitError } = useSubmitChoice();
  const { data: progress, loading: loadingProgress } = useProgress();
  const { data: profile, loading: loadingProfile, update: updateProfile } = useProfile();
  const { data: journalEntries, loading: loadingJournal, create: createJournal } = useJournal();

  const onSelectStory = (sid) => {
    setSelectedStoryId(sid);
    setEpIndex(0);
  };

  const onChoose = async (choiceId) => {
    if (!selectedStoryId) return;
    try {
      const next = await submit(selectedStoryId, choiceId);
      // Try to use next index if provided; otherwise increment locally
      const nextIndex = (next && next.next_ep_index) != null ? next.next_ep_index : epIndex + 1;
      setEpIndex(nextIndex);
      // refetch current episode
      setTimeout(() => refetchEp(), 0);
    } catch (e) {
      // error handled by hook state; no-op
    }
  };

  const handleProfileNameChange = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("display_name") || "").toString().trim();
    if (name) await updateProfile({ display_name: name });
    e.currentTarget.reset();
  };

  const handleAddJournal = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const content = (form.get("content") || "").toString().trim();
    if (content) await createJournal(content);
    e.currentTarget.reset();
  };

  const choices = useMemo(() => (ep && ep.choices) || [], [ep]);

  return (
    <div className="layout">
      <aside className="panel left">
        <h2>Stories</h2>
        {loadingStories && <div className="muted">Loading stories…</div>}
        {storiesError && <div className="error">Failed to load stories.</div>}
        <ul className="list">
          {Array.isArray(stories) &&
            stories.map((s) => (
              <li
                key={s.id || s.story_id || s.title}
                className={String(selectedStoryId) === String(s.id || s.story_id) ? "active" : ""}
              >
                <button onClick={() => onSelectStory(s.id || s.story_id)}>
                  <div className="title">{s.title || s.name || `Story ${s.id || s.story_id}`}</div>
                  <div className="subtitle">{s.description || s.tagline || ""}</div>
                </button>
              </li>
            ))}
        </ul>
      </aside>

      <main className="content">
        <h2>Episode</h2>
        {!selectedStoryId && <div className="muted">Select a story to begin.</div>}
        {selectedStoryId && loadingEp && <div className="muted">Loading episode…</div>}
        {selectedStoryId && epError && <div className="error">Failed to load episode.</div>}
        {selectedStoryId && ep && (
          <div className="episode">
            <div className="ep-body">{ep.text || ep.body || ep.content || JSON.stringify(ep)}</div>
            <div className="choices">
              {choices.length === 0 && <div className="muted">No choices available.</div>}
              {choices.map((c) => (
                <button
                  key={c.id || c.choice_id || c.label}
                  disabled={submitting}
                  onClick={() => onChoose(c.id || c.choice_id)}
                  className="choice"
                >
                  {c.label || c.text || `Choice ${c.id || c.choice_id}`}
                </button>
              ))}
              {submitError && <div className="error">Failed to submit choice.</div>}
            </div>
          </div>
        )}
      </main>

      <aside className="panel right">
        <section className="card">
          <h3>User</h3>
          {loadingProfile ? (
            <div className="muted">Loading profile…</div>
          ) : (
            <>
              <div className="row"><span className="label">Display Name:</span> <span>{(profile && profile.display_name) || "Anonymous"}</span></div>
              <form onSubmit={handleProfileNameChange} className="row form">
                <input name="display_name" placeholder="Update display name" />
                <button type="submit">Save</button>
              </form>
            </>
          )}
        </section>

        <section className="card">
          <h3>Progress</h3>
          {loadingProgress ? (
            <div className="muted">Loading progress…</div>
          ) : (
            <>
              <div className="row"><span className="label">XP:</span> <span>{(progress && progress.xp) != null ? progress.xp : "-"}</span></div>
              <div className="row"><span className="label">Story:</span> <span>{(progress && progress.story_id) || "-"}</span></div>
              <div className="row"><span className="label">Episode:</span> <span>{(progress && progress.ep_index) != null ? progress.ep_index : "-"}</span></div>
            </>
          )}
        </section>

        <section className="card">
          <h3>Journal</h3>
          {loadingJournal ? (
            <div className="muted">Loading journal…</div>
          ) : (
            <>
              <form onSubmit={handleAddJournal} className="row form">
                <input name="content" placeholder="Reflect on your last decision…" />
                <button type="submit">Add</button>
              </form>
              <ul className="journal-list">
                {Array.isArray(journalEntries) && journalEntries.length > 0 ? (
                  journalEntries.map((j, idx) => (
                    <li key={j.id || idx}>
                      <div className="journal-content">{j.content || j.text}</div>
                      <div className="journal-meta">{j.created_at || j.timestamp || ""}</div>
                    </li>
                  ))
                ) : (
                  <li className="muted">No entries yet.</li>
                )}
              </ul>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
