# Private Chat

Invite-only, end-to-end encrypted chat web app for a small circle.

| Folder    | What it is                                        |
|-----------|---------------------------------------------------|
| `server/` | Node.js + Express + Socket.IO API (port 3000)     |
| `client/` | React + Vite + Tailwind CSS web app (port 5173)   |

## Run locally (two terminals)

```bash
cd server
npm install
cp .env.example .env      # then set DATABASE_URL and JWT_ACCESS_SECRET
npm run migrate up        # create the tables
npm run invite            # print a one-time invite code for the first user
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The page should say the server is online.
In development, Vite forwards every `/api/...` request to the server on port 3000.
