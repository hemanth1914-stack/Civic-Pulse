# 📍 CivicPulse

**Turning individual civic complaints into visible, location-anchored community pressure — with AI-powered authority routing and auto-escalation.**

[Live Demo](#) · [Report an Issue](#)

---

## The Problem

A single citizen's complaint about garbage, potholes, or a broken streetlight rarely gets anywhere. It gets filed, buried, and forgotten — there's no visibility into whether anyone else nearby has the same problem, no pressure on the responsible authority, and no consequence for ignoring it.

## The Solution

CivicPulse lets citizens report civic issues in seconds, pins them exactly on a map with photo evidence, and makes every issue publicly visible to others in the same area — who can show support with a single tap. If an issue sits unresolved, CivicPulse automatically escalates it with an AI-drafted email to the correct authority. Silence stops being free.

## Features

- 📍 **Pin-exact location reporting** — drop a pin on the map, add a landmark, pick your zone
- 📸 **Multi-photo evidence** — attach up to 5 photos per complaint
- 🏛️ **Smart authority routing** — each complaint is automatically matched to the correct Bangalore civic authority based on category and zone; an "Other" category uses AI to classify and route issues that don't fit a preset list
- ✉️ **AI-drafted escalation emails** — if an issue goes unresolved past the deadline, an AI-generated formal escalation email is prepared and sent to the responsible authority
- 🗺️ **Area-filtered Community Feed** — see every active issue in your own zone, sorted by how much community support it has
- 🔁 **Instagram-style support button** — show support for an issue with one tap, building visible pressure the way a repost does
- 🆔 **Anonymous public identity** — complaints are visible with a friendly public ID, no personal login required
- ✅ **Resolution tracking** — the original reporter marks an issue resolved, turning it green across the whole platform for everyone to see
- 📊 **My Complaints dashboard** — track the status of everything you've personally reported, in one place

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + Lucide Icons |
| Maps | React-Leaflet + OpenStreetMap |
| Backend / Data | Firebase Firestore (real-time sync) + Firebase Storage (photos) |
| AI | Gemini API (escalation email drafting, "Other" category classification) |
| Hosting | Firebase Hosting |

## Screenshots

<!-- Add your screenshots here, e.g.: -->
<!-- ![Report an Issue](./screenshots/report-issue.png) -->
<!-- ![Community Feed](./screenshots/community-feed.png) -->
<!-- ![My Complaints](./screenshots/my-complaints.png) -->
<!-- ![Escalation Email](./screenshots/escalation-email.png) -->

## How It Works

1. A citizen picks an issue category, pins the exact location on a map, adds a landmark and photos, and submits.
2. The complaint instantly appears in the Community Feed for that zone, with a friendly anonymous public ID attached.
3. Other citizens nearby see it and tap the support button — the count rises visibly, just like a repost.
4. If the issue remains unresolved past the deadline, CivicPulse automatically drafts and sends an escalation email to the specific authority responsible for that category and zone.
5. Once the original reporter confirms the issue is fixed, they mark it resolved — it turns green across the platform for everyone to see.

## Getting Started (Run Locally)

```bash
# Clone the repo
git clone https://github.com/hemanth1914-stack/CivicPulse.git
cd CivicPulse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Firebase config and Gemini API key in .env

# Run the dev server
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory with the following (see `.env.example`):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

## Scope Note

This prototype focuses on Bangalore and simulates authority contact details and email delivery for demo purposes — the routing logic, email drafting, and escalation triggers are fully functional; only the actual outbound delivery to real government addresses is simulated rather than live.

## Team

Built for **[Your Hackathon Name]** · Theme: **Legal Accessibility & Social Justice**

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
