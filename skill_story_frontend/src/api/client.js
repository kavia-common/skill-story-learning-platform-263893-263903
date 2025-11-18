 /**
  * Minimal typed API client for Skill Story LMS frontend.
  * Reads base URL from env and provides helper methods with JSON parsing, error handling,
  * optional demo user header passthrough, and JWT auth with refresh-once behavior.
  */

 // Internal configuration from env. CRA requires REACT_APP prefix.
 const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
 const DEMO_USER = process.env.REACT_APP_DEMO_USER || "";

 // Local token storage keys
 const TOKEN_KEY = "skillstory.token";
 const REFRESH_KEY = "skillstory.refresh_token";

 // PUBLIC_INTERFACE
 export function getToken() {
   /** Get bearer token from storage if present. */
   try {
     return localStorage.getItem(TOKEN_KEY) || "";
   } catch {
     return "";
   }
 }

 // PUBLIC_INTERFACE
 export function setToken(token) {
   /** Save bearer token to storage. */
   try {
     if (token) localStorage.setItem(TOKEN_KEY, token);
     else localStorage.removeItem(TOKEN_KEY);
   } catch {
     // ignore storage errors
   }
 }

 function getRefreshToken() {
   try {
     return localStorage.getItem(REFRESH_KEY) || "";
   } catch {
     return "";
   }
 }

 function setRefreshToken(token) {
   try {
     if (token) localStorage.setItem(REFRESH_KEY, token);
     else localStorage.removeItem(REFRESH_KEY);
   } catch {
     // ignore
   }
 }

 /** Append base URL safely. */
 function url(path) {
   if (!API_BASE_URL) {
     return path;
   }
   return `${API_BASE_URL}${path}`;
 }

 /** Internal: do a refresh token exchange and update stored access token. */
 async function tryRefresh() {
   const rt = getRefreshToken();
   if (!rt) {
     throw new Error("No refresh token");
   }
   const res = await fetch(url("/api/auth/refresh"), {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ refresh_token: rt }),
     credentials: "include",
     mode: "cors",
   });
   const data = await res.json().catch(() => ({}));
   if (!res.ok || !data?.access_token) {
     const err = new Error((data && (data.detail || data.message)) || "Refresh failed");
     err.status = res.status;
     err.data = data;
     throw err;
   }
   setToken(data.access_token);
   return data.access_token;
 }

 /**
  * Unified fetch wrapper with JSON handling, CORS config, demo header, and auth header.
  * On 401 responses, attempts a single refresh if a refresh token exists, then retries once.
  * @param {RequestInfo} input
  * @param {RequestInit} init
  * @param {boolean} allowRetry
  * @returns {Promise<{data:any, status:number, ok:boolean}>}
  */
 async function request(input, init = {}, allowRetry = true) {
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

   // Handle 401 with refresh once
   if (res.status === 401 && allowRetry && getRefreshToken()) {
     try {
       const newAccess = await tryRefresh();
       if (newAccess) {
         const retryHeaders = new Headers(init.headers || {});
         if (!retryHeaders.has("Content-Type") && !(init.body instanceof FormData)) {
           retryHeaders.set("Content-Type", "application/json");
         }
         if (DEMO_USER && !retryHeaders.has("X-Demo-User")) {
           retryHeaders.set("X-Demo-User", DEMO_USER);
         }
         retryHeaders.set("Authorization", `Bearer ${newAccess}`);
         return await request(input, { ...init, headers: retryHeaders }, false);
       }
     } catch {
       // fall through to error below
     }
   }

   if (!res.ok) {
     const err = new Error(
       (data && (data.detail || data.message)) ||
         `Request failed with status ${res.status}`
     );
     err.status = res.status;
     err.data = data;
     if (res.status === 401) {
       err.needsAuth = true;
     }
     throw err;
   }

   return { data, status: res.status, ok: res.ok };
 }

 // Demo fallback datasets to keep UI usable if backend is unavailable
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
       text:
         "You join the stand-up and notice two engineers debating a blocker. How do you respond?",
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
       text:
         "A vendor proposes a price increase mid-contract. What’s your opening move?",
       choices: [
         { id: 201, label: "Ask about the reasoning and constraints" },
         { id: 202, label: "Threaten to cancel immediately" },
       ],
     },
   ],
 };

 // PUBLIC_INTERFACE
 export const api = {
   /** Health check */
   // PUBLIC_INTERFACE
   async health() {
     /** Returns service health status. */
     return request(url("/health"), { method: "GET" });
   },

   /** Demo token (optional; backend may not implement) */
   // PUBLIC_INTERFACE
   async issueToken(xDemoUser) {
     /** Issues a short-lived token for demo/local; backend accepts optional X-Demo-User header. */
     return request(url("/api/auth/token"), {
       method: "POST",
       headers: xDemoUser ? { "X-Demo-User": xDemoUser } : undefined,
     });
   },

   /** Auth endpoints */
   // PUBLIC_INTERFACE
   async register(email, password, display_name = null) {
     /** Register a new user and receive token pair. */
     const res = await request(url("/api/auth/register"), {
       method: "POST",
       body: JSON.stringify({ email, password, display_name }),
     });
     if (res?.data?.access_token) setToken(res.data.access_token);
     if (res?.data?.refresh_token) setRefreshToken(res.data.refresh_token);
     return res;
   },
   // PUBLIC_INTERFACE
   async login(email, password) {
     /** Login with credentials and receive token pair. */
     const res = await request(url("/api/auth/login"), {
       method: "POST",
       body: JSON.stringify({ email, password }),
     });
     if (res?.data?.access_token) setToken(res.data.access_token);
     if (res?.data?.refresh_token) setRefreshToken(res.data.refresh_token);
     return res;
   },
   // PUBLIC_INTERFACE
   async refresh(refresh_token) {
     /** Exchange refresh token for a new access token. */
     const res = await request(url("/api/auth/refresh"), {
       method: "POST",
       body: JSON.stringify({ refresh_token }),
     }, false);
     if (res?.data?.access_token) setToken(res.data.access_token);
     return res;
   },
   // PUBLIC_INTERFACE
   async me() {
     /** Get the current authenticated user. */
     return request(url("/api/auth/me"), { method: "GET" });
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
       throw e;
     }
   },

   /** Submit choice for current episode, returns next episode/progress */
   // PUBLIC_INTERFACE
   async submitChoice(storyId, choiceId, epIndex = null) {
     /** Submit a choice and advance; returns next episode payload and XP */
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
     /** Returns XP and progression for the current user */
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

   // ========== AUTHORING (Instructor) ==========
   // These endpoints are expected; if backend not ready, handle gracefully.

   // PUBLIC_INTERFACE
   async authorListStories() {
     /** List stories for authoring, including draft/published states. */
     try {
       return await request(url("/api/author/stories"), { method: "GET" });
     } catch (e) {
       e.developerHint = "Authoring endpoints may be missing; ensure backend provides /api/author/stories.";
       throw e;
     }
   },

   // PUBLIC_INTERFACE
   async authorCreateStory(payload) {
     /** Create a new story (title, description, tags, published). */
     return request(url("/api/author/stories"), {
       method: "POST",
       body: JSON.stringify(payload),
     });
   },

   // PUBLIC_INTERFACE
   async authorUpdateStory(storyId, payload) {
     /** Update story metadata fields; payload may include publish state. */
     return request(url(`/api/author/stories/${encodeURIComponent(storyId)}`), {
       method: "PUT",
       body: JSON.stringify(payload),
     });
   },

   // PUBLIC_INTERFACE
   async authorDeleteStory(storyId) {
     /** Delete story (and its episodes). */
     return request(url(`/api/author/stories/${encodeURIComponent(storyId)}`), {
       method: "DELETE",
     });
   },

   // PUBLIC_INTERFACE
   async authorListEpisodes(storyId) {
     /** List episodes for a story for authoring. */
     return request(url(`/api/author/stories/${encodeURIComponent(storyId)}/episodes`), {
       method: "GET",
     });
   },

   // PUBLIC_INTERFACE
   async authorCreateEpisode(storyId, payload) {
     /** Create an episode with index/order, content, quiz flag. */
     return request(url(`/api/author/stories/${encodeURIComponent(storyId)}/episodes`), {
       method: "POST",
       body: JSON.stringify(payload),
     });
   },

   // PUBLIC_INTERFACE
   async authorUpdateEpisode(storyId, epIndex, payload) {
     /** Update episode fields (index, content, is_quiz). */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}`
       ),
       {
         method: "PUT",
         body: JSON.stringify(payload),
       }
     );
   },

   // PUBLIC_INTERFACE
   async authorDeleteEpisode(storyId, epIndex) {
     /** Delete an episode by index. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}`
       ),
       { method: "DELETE" }
     );
   },

   // PUBLIC_INTERFACE
   async authorListChoices(storyId, epIndex) {
     /** List choices for an episode. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/choices`
       ),
       { method: "GET" }
     );
   },

   // PUBLIC_INTERFACE
   async authorCreateChoice(storyId, epIndex, payload) {
     /** Create a choice with label, next_episode_index, xp_delta, terminal flag. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/choices`
       ),
       { method: "POST", body: JSON.stringify(payload) }
     );
   },

   // PUBLIC_INTERFACE
   async authorUpdateChoice(storyId, epIndex, choiceId, payload) {
     /** Update a choice. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/choices/${encodeURIComponent(choiceId)}`
       ),
       { method: "PUT", body: JSON.stringify(payload) }
     );
   },

   // PUBLIC_INTERFACE
   async authorDeleteChoice(storyId, epIndex, choiceId) {
     /** Delete a choice. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/choices/${encodeURIComponent(choiceId)}`
       ),
       { method: "DELETE" }
     );
   },

   // PUBLIC_INTERFACE
   async authorListQuizQuestions(storyId, epIndex) {
     /** List quiz questions for a quiz episode. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/quiz-questions`
       ),
       { method: "GET" }
     );
   },

   // PUBLIC_INTERFACE
   async authorCreateQuizQuestion(storyId, epIndex, payload) {
     /** Create a quiz question (MCQ/TF) with options and correct answer. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/quiz-questions`
       ),
       { method: "POST", body: JSON.stringify(payload) }
     );
   },

   // PUBLIC_INTERFACE
   async authorUpdateQuizQuestion(storyId, epIndex, qId, payload) {
     /** Update quiz question contents and answer. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/quiz-questions/${encodeURIComponent(qId)}`
       ),
       { method: "PUT", body: JSON.stringify(payload) }
     );
   },

   // PUBLIC_INTERFACE
   async authorDeleteQuizQuestion(storyId, epIndex, qId) {
     /** Delete quiz question. */
     return request(
       url(
         `/api/author/stories/${encodeURIComponent(storyId)}/episodes/${encodeURIComponent(epIndex)}/quiz-questions/${encodeURIComponent(qId)}`
       ),
       { method: "DELETE" }
     );
   },
 };

 export default api;
