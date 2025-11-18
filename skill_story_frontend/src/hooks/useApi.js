/**
 * React hooks for Skill Story API access. Each hook returns { data, loading, error, refetch, ... }.
 * Protected calls automatically attach Authorization via client and will attempt one refresh on 401.
 */
import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

// Utility to standardize async state
function useAsync(fn, deps = []) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setData(res.data);
    } catch (e) {
      // Preserve the error and keep any last-known data in place
      setError(e);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run, setData };
}

// PUBLIC_INTERFACE
export function useHealth() {
  /** Hook to check backend health */
  return useAsync(() => api.health(), []);
}

// PUBLIC_INTERFACE
export function useStories() {
  /** Hook to get list of stories (leverages API fallback under the hood) */
  return useAsync(() => api.listStories(), []);
}

// PUBLIC_INTERFACE
export function useStory(storyId) {
  /** Hook to get a single story */
  return useAsync(() => (storyId ? api.getStory(storyId) : Promise.resolve({ data: null })), [storyId]);
}

// PUBLIC_INTERFACE
export function useEpisode(storyId, epIndex) {
  /** Hook to get current episode payload (leverages API fallback under the hood) */
  return useAsync(
    () =>
      storyId != null && epIndex != null
        ? api.getEpisode(storyId, epIndex)
        : Promise.resolve({ data: null }),
    [storyId, epIndex]
  );
}

// PUBLIC_INTERFACE
export function useSubmitChoice(onUnauthorized) {
  /**
   * Hook for submitting a choice; returns submit(storyId, choiceId, epIndex)
   * - Attaches Bearer token via client
   * - Surfaces 401 via onUnauthorized callback for login prompt
   */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submit = useCallback(async (storyId, choiceId, epIndex = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.submitChoice(storyId, choiceId, epIndex);
      setResult(res.data);
      return res.data;
    } catch (e) {
      if (e && e.status === 401 && typeof onUnauthorized === "function") {
        onUnauthorized(e);
      }
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  return { submit, loading, error, result, setResult };
}

// PUBLIC_INTERFACE
export function useProgress() {
  /** Hook to get progress/XP */
  return useAsync(() => api.getProgress(), []);
}

// PUBLIC_INTERFACE
export function useProfile() {
  /** Hook to get and update profile */
  const state = useAsync(() => api.getProfile(), []);
  const update = useCallback(
    async (patch) => {
      const res = await api.patchProfile(patch);
      // optimistic update
      state.setData((prev) => ({ ...(prev || {}), ...(res.data || {}) }));
      return res.data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  return { ...state, update };
}

// PUBLIC_INTERFACE
export function useJournal() {
  /** Hook to list and create journal entries */
  const state = useAsync(() => api.listJournal(), []);
  const create = useCallback(
    async (content) => {
      const res = await api.createJournal(content);
      // Prepend the new entry
      state.setData((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return [res.data, ...list];
      });
      return res.data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  return { ...state, create };
}

// PUBLIC_INTERFACE
export function useAuthDemo() {
  /** Hook for demo auth token issuance (stub) */
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  const issue = useCallback(async (xDemoUser) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.issueToken(xDemoUser);
      setToken(res.data);
      if (res?.data?.access_token) {
        api.setToken(res.data.access_token);
      }
      return res.data;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { issue, loading, token, error };
}
