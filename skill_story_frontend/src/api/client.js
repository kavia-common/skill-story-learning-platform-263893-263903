/**
 * Minimal typed API client for Skill Story LMS frontend.
 * Reads base URL from env and provides helper methods with JSON parsing, error handling,
 * and optional demo user header passthrough.
 */

// Internal configuration from env. CRA requires REACT_APP_ prefix.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
const DEMO_USER = process.env.REACT_APP_DEMO_USER || "";

/**
 * Append base URL safely.
 * @param {string} path - API path starting with "/"
 * @returns {string} full URL
 */
function url(path) {
  if (!API_BASE_URL) {
    // Intentionally not throwing: allow relative paths if served behind the same origin (proxy)
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

/**
 * Unified fetch wrapper with JSON handling, CORS config, and demo header.
 * Adds credentials "include" to be CORS-safe when cookies are used (no-op otherwise).
 * @param {RequestInfo} input
 * @param {RequestInit} init
 * @returns {Promise<{data:any, status:number, ok:boolean}>}
 */
async function request(input, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  // Pass demo user header if configured
  if (DEMO_USER && !headers.has("X-Demo-User")) {
    headers.set("X-Demo-User", DEMO_USER);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
    mode: "cors",
  });

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = new Error(
      (data && (data.detail || data.message)) ||
        `Request failed with status ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { data, status: res.status, ok: res.ok };
}

// PUBLIC_INTERFACE
export const api = {
  /** Health check */
  // PUBLIC_INTERFACE
  async health() {
    /** Returns service health status. */
    return request(url("/health"), { method: "GET" });
  },

  /** Auth demo token (stub) */
  // PUBLIC_INTERFACE
  async issueToken(xDemoUser) {
    /** Issues a short-lived token for demo/local; backend accepts optional X-Demo-User header. */
    return request(url("/api/auth/token"), {
      method: "POST",
      headers: xDemoUser ? { "X-Demo-User": xDemoUser } : undefined,
    });
  },

  /** Stories list */
  // PUBLIC_INTERFACE
  async listStories() {
    /** Get all stories metadata */
    return request(url("/api/stories"), { method: "GET" });
  },

  /** Story by id */
  // PUBLIC_INTERFACE
  async getStory(storyId) {
    /** Get a story and its episodes metadata */
    return request(url(`/api/stories/${encodeURIComponent(storyId)}`), {
      method: "GET",
    });
  },

  /** Episode by story id and ep index */
  // PUBLIC_INTERFACE
  async getEpisode(storyId, epIndex) {
    /** Get a single episode payload and choices */
    return request(
      url(
        `/api/stories/${encodeURIComponent(
          storyId
        )}/episodes/${encodeURIComponent(epIndex)}`
      ),
      { method: "GET" }
    );
  },

  /** Submit choice for current episode, returns next episode/progress */
  // PUBLIC_INTERFACE
  async submitChoice(storyId, choiceId) {
    /** Submit a choice and advance; returns next episode payload and XP */
    return request(url(`/api/stories/${encodeURIComponent(storyId)}/choices`), {
      method: "POST",
      body: JSON.stringify({ choice_id: choiceId }),
    });
  },

  /** Progress (XP and current position) */
  // PUBLIC_INTERFACE
  async getProgress() {
    /** Returns XP and progression for the demo user */
    return request(url("/api/progress"), { method: "GET" });
  },

  /** Profile get/patch */
  // PUBLIC_INTERFACE
  async getProfile() {
    /** Get current user profile */
    return request(url("/api/profile"), { method: "GET" });
  },

  // PUBLIC_INTERFACE
  async patchProfile(patch) {
    /** Update profile fields (e.g., display_name) */
    return request(url("/api/profile"), {
      method: "PATCH",
      body: JSON.stringify(patch || {}),
    });
  },

  /** Journal list/create */
  // PUBLIC_INTERFACE
  async listJournal() {
    /** List journal entries */
    return request(url("/api/journal"), { method: "GET" });
  },

  // PUBLIC_INTERFACE
  async createJournal(content) {
    /** Create journal entry with content */
    return request(url("/api/journal"), {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};

export default api;
