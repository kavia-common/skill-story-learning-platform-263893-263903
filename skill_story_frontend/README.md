# Skill Story LMS Frontend

Minimal React UI wired to FastAPI backend for stories, episodes/choices, XP/progress, profile, and journal.

## Quick Start

1. Copy environment file and set backend URL:
   cp .env.example .env
   # then edit .env, set REACT_APP_API_BASE_URL to your FastAPI URL (e.g., http://localhost:8000)
   # optionally set REACT_APP_DEMO_USER to pass X-Demo-User header

2. Install dependencies and run:
   npm install
   npm start

3. Open http://localhost:3000

## What’s Included

- API client (src/api/client.js) with:
  - Env-driven base URL (REACT_APP_API_BASE_URL)
  - Optional demo header (REACT_APP_DEMO_USER -> X-Demo-User)
  - CORS safe fetch with credentials include
  - Endpoints: health, auth (stub), stories, episode, submit choice, progress, profile, journal

- React hooks (src/hooks/useApi.js)
  - useStories, useEpisode, useSubmitChoice, useProgress, useProfile, useJournal, useAuthDemo
  - Built-in loading/error state and refetch

- Minimal UI demo (src/components/StoryBrowser.js)
  - Story list -> episode text & choices -> advance on select
  - Profile display and update display_name
  - Progress (XP, current story/episode)
  - Journal list and create entry
  - Responsive layout and theme toggle (light/dark)

## Environment Variables

- REACT_APP_API_BASE_URL: Base URL of FastAPI backend (e.g., http://localhost:8000)
- REACT_APP_DEMO_USER: Optional demo user identifier; forwarded as X-Demo-User header

Do not hardcode secrets. Use .env during development and inject variables in deployment.

## Testing

- npm test
- Basic test ensures app title renders.
