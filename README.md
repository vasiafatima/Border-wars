# Border Wars 3D — Online

## Test on your Mac first
1. Install Node.js (LTS) from https://nodejs.org
2. In Terminal:  cd path/to/border-wars-online  &&  npm install  &&  npm start
3. Open http://localhost:3000 in TWO browser tabs.
   - Tab 1: "Invite a Friend", copy the link, paste it into tab 2  -> game starts
   - Or press "Find Online Match" in both tabs -> they get paired

## Put it live (Render.com, free)
1. Create a GitHub account + a new repository, upload everything in this folder
   (server.js, package.json, README.md and the public/ folder).
2. On https://render.com -> New -> Web Service -> connect that repo.
3. Runtime: Node.  Build command: npm install.  Start command: npm start.  Plan: Free.
4. After the deploy finishes you get https://your-name.onrender.com — that is your game.
   Share it, or use "Invite a Friend" inside the game.
Free Render servers sleep when idle; the first visitor waits ~30-50 seconds.
To update later: change files, commit to GitHub, Render redeploys by itself.

## Note
Netlify Drop (static hosting) will NOT work for online play, because the game now needs server.js.
