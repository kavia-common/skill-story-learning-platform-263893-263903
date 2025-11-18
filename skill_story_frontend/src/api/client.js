 /**
  * Minimal typed API client for Skill Story LMS frontend.
  * Reads base URL from env and provides helper methods with JSON parsing, error handling,
  * and optional demo user header passthrough.
  */
 
 // Internal configuration from env. CRA requires REACT_APP prefix.
 const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
 const DEMO_USER = process.env.REACT_APP_DEMO_USER || "";
 
 // Local token storage key (used by login flow to persist access token)
 const TOKEN_KEY = "skillstory.token";
 
 /**
  * Small, in-memory demo dataset as a resilient fallback if backend is temporarily unavailable.
  * This keeps the UX functional during migrations or outages.
  */
 const FALLBACK_STORIES = [
   {
     id: 1,
     title: "First Day Leader",
     description: "Navigate tough choices on your first day leading a new team.",
   },
   {
     id: 2,
     title: "Negotiation Basics",
     description: "Practice principled negotiation with stakeholders.",
   },
 ];
 
 const FALLBACK_EPISODES = {
   1: [
     {
       index: 0,
       text: "You join the stand-up and notice two engineers debating a blocker. How do you respond?",
       choices: [
         { id: 101, label: "Facilitate calmly and set next steps" },
         { id: 102, label: "Let them resolve it offline" },
       ],
     },
     {
       index: 1,
       text: "Your manager asks for a quick status update unexpectedly.",
       choices: [
         { id: 103, label: "Share known facts and follow up with details" },
         { id: 104, label: "Delay the update until the report is ready" },
       ],
     },
   ],
   2: [
     {
       index: 0,
       text: "A vendor proposes a price increase mid-contract. What’s your opening move?",
       choices: [
         { id: 201, label: "Ask about the reasoning and constraints" },
         { id: 202, label: "Threaten to cancel immediately" },
       ],
     },
   ],
 };
 
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
  * Get bearer token from storage if present.
  * Do not hardcode; use localStorage set by login flow.
  */
 function getToken() {
   try {
     return localStorage.getItem(TOKEN_KEY) || "";
   } catch {
     return "";
   }
 }
 
 /**
  * Save bearer token (optional public setter for demo)
  */
 function setToken(token) {
   try {
     if (token) localStorage.setItem(TOKEN_KEY, token);
     else localStorage.removeItem(TOKEN_KEY);
   } catch {
     // ignore storage errors
   }
 }
 
 /**
  * Unified fetch wrapper with JSON handling, CORS config, demo header, and auth header.
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
   // Attach Authorization if available
   const token = getToken();
   if (token && !headers.has("Authorization")) {
     headers.set("Authorization", `Bearer ${token}`);
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
     // If unauthorized, hint the UI to prompt login
     if (res.status === 401) {
       err.needsAuth = true;
     }
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
 
   /** Expose token setter/getter for UI auth handling */
   // PUBLIC_INTERFACE
   setToken,
   // PUBLIC_INTERFACE
   getToken,
 
   /** Stories list (with fallback) */
   // PUBLIC_INTERFACE
   async listStories() {
     /** Get all stories metadata (fallback to in-memory demo if unavailable) */
     try {
       return await request(url("/api/stories"), { method: "GET" });
     } catch (e) {
       // Provide a resilient fallback so the UI remains interactive
       return { data: FALLBACK_STORIES, status: 200, ok: true };
     }
   },
 
   /** Story by id */
   // PUBLIC_INTERFACE
   async getStory(storyId) {
     /** Get a story and its episodes metadata */
     return request(url(`/api/stories/${encodeURIComponent(storyId)}`), {
       method: "GET",
     });
   },
 
   /** Episode by story id and ep index (with fallback) */
   // PUBLIC_INTERFACE
   async getEpisode(storyId, epIndex) {
     /** Get a single episode payload and choices (fallback to in-memory demo if unavailable) */
     try {
       return await request(
         url(
           `/api/stories/${encodeURIComponent(
             storyId
           )}/episodes/${encodeURIComponent(epIndex)}`
         ),
         { method: "GET" }
       );
     } catch (e) {
       const sid = Number(storyId);
       const idx = Number(epIndex);
       const demo = (FALLBACK_EPISODES[sid] || [])[idx];
       if (demo) {
         return {
           data: {
             text: demo.text,
             choices: demo.choices,
             index: demo.index,
             story_id: sid,
           },
           status: 200,
           ok: true,
         };
       }
       // if no fallback episode exists, bubble original error
       throw e;
     }
   },
 
   /** Submit choice for current episode, returns next episode/progress */
   // PUBLIC_INTERFACE
   async submitChoice(storyId, choiceId, epIndex = null) {
     /** Submit a choice and advance; returns next episode payload and XP */
     // Prefer backend endpoint: /api/stories/{storyId}/episodes/{index}/choose if available
     const path =
       epIndex != null
         ? `/api/stories/${encodeURIComponent(
             storyId
           )}/episodes/${encodeURIComponent(epIndex)}/choose`
         : `/api/stories/${encodeURIComponent(storyId)}/choices`;
     return request(url(path), {
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
