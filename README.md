# Chatterly — staged DevOps messaging demo

## Run
Node 22 recommended. `npm install` then `npm run dev`. Open http://localhost:5173. For Docker: `docker compose up --build` then http://localhost:4000.

## Releases
Open `client/src/App.tsx`. V1 is active. Uncomment exactly one additional `releases.push(n)` line per release, keeping earlier lines active. Commit and push. The labelled implementation sections remain compiled so TypeScript can validate them; only activation statements are literally commented out. No environment version switch is needed.

- 1: text, emoji, contact CRUD, bright theme
- 2: media attachments
- 3: text/photo stories
- 4: simulated calls
- 5: story reactions
- 6: light/gaming dark switch

Use Settings to set distinct user IDs in two browsers, and add each other's IDs as contacts. Sample contacts/stories are demo data. Stories and reactions synchronize while the server runs; server memory resets on restart. Browser contacts/messages/stories persist locally. No authentication, E2E encryption, actual calls, or production database. Do not expose to untrusted users.

Jenkins builds and saves the Docker image; deployment to EC2/ECR requires your own credentials and deployment steps.
