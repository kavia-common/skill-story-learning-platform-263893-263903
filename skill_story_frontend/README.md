# Skill Story LMS Frontend

Minimal React UI wired to FastAPI backend for stories, episodes/choices, XP/progress, profile, journal, and authentication.

## Quick Start

1. Copy environment file and set backend URL:
   cp .env.example .env
   # then edit .env, set REACT_APP_API_BASE_URL to your FastAPI URL (e.g., http://localhost:8000)
   # optionally set REACT_APP_DEMO_USER header

2. Install dependencies and run:
   npm install
   npm start

3. Open http://localhost:3000

## What’s Included

- API client (src/api/client.js) with:
  - Env-driven base URL (REACT_APP_API_BASE_URL)
  - Optional demo header (REACT_APP_DEMO_USER -> X-Demo-User)
  - Authorization: Bearer <token> automatically attached when available (localStorage key: skillstory.token)
  - One-time 401 refresh retry using /api/auth/refresh when refresh token exists (localStorage key: skillstory.refresh_token)
  - Endpoints: health, auth (register/login/refresh/me), stories, episode, submit choice, progress, profile, journal

- Auth context (src/context/AuthContext.js)
  - login, register, logout, refresh, me
  - Stores access and refresh tokens
  - Provides current user and initializing state

- React hooks (src/hooks/useApi.js)
  - useStories, useEpisode, useSubmitChoice, useProgress, useProfile, useJournal, useAuthDemo
  - Optimistic episode advance on choice submit, with rollback on failure
  - Progress sync after successful choice
  - Built-in loading/error state and refetch

- UI (src/components)
  - StoryBrowser: stories list -> episode text & choices -> advance
  - Login and Signup forms
  - Header shows current user and Logout button
  - Profile display and update display_name
  - Progress (XP, current story/episode)
  - Journal list and create entry
  - Responsive layout and theme toggle (light/dark)

## Backend endpoints (expected)

- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/refresh
- GET  /api/auth/me

## Environment Variables

- REACT_APP_API_BASE_URL: Base URL of FastAPI backend (e.g., http://localhost:8000)
- REACT_APP_DEMO_USER: Optional demo user identifier; forwarded as X-Demo-User header

Do not hardcode secrets. Use .env during development and inject variables in deployment.

## Testing

- npm test
- Basic test ensures app title renders.
