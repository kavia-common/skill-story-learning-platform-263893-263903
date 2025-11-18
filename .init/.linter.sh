#!/bin/bash
cd /home/kavia/workspace/code-generation/skill-story-learning-platform-263893-263903/skill_story_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

