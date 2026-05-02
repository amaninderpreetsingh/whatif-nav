# WhatIf Nav

> Navigation, reimagined. Tap any exit, turn, or road during an active route to see how it would change your arrival time — then accept or discard the detour.

A focused iOS navigation app where the differentiator is iterative **"what-if" route exploration**. Most navigation apps lock you into one route at a time. WhatIf Nav lets you stack hypothetical detours on the map and see the cumulative time impact in real time, then commit to the modified route or fall back to the original.

Built with **React Native + Expo** for iOS, with map rendering by **Mapbox** and traffic-aware routing through a **Firebase Cloud Functions** proxy that calls **Google Routes API** (default) or **Mapbox Directions API** (cost fallback).

---

## Features

- **Tap-to-explore detours** — tap any point on the map during navigation, see the alternative ETA, accept or discard
- **Iterative waypoint chains** — stack multiple "what-if" changes; each tap recalculates the best route through all your chosen points
- **Time comparison bar** — `Original 45 min → Modified 52 min (+7)` always visible
- **Provider switching** — Google Routes (best traffic accuracy) by default; toggle to Mapbox in settings if you exceed Google's free tier
- **Saved routes** — Firestore-backed, accessible across devices
- **Live traffic-aware ETAs** — `driving-traffic` profiles on both providers
- **Off-route detection + reroute** — 50m / 10s threshold, automatic recalc
- **Modern UI** — glassmorphic bottom sheet, custom typography (Space Grotesk + Inter), gradient buttons, haptic feedback

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 + TypeScript |
| Routing/Navigation | Expo Router (file-based) |
| Maps | `@rnmapbox/maps` (Mapbox SDK) |
| Routing API | Google Routes API (Pro) + Mapbox Directions API |
| Backend | Firebase (Auth, Firestore, Cloud Functions) |
| State | Zustand |
| Local cache | react-native-mmkv |
| Bottom sheet | @gorhom/bottom-sheet |
| Animations | react-native-reanimated |
| Haptics | expo-haptics |
| Testing | Jest + React Native Testing Library + Playwright (web build) |

---

## Project Structure

```
src/
  app/                    # Expo Router screens
    (auth)/sign-in.tsx
    (main)/
      index.tsx           # Home / Map
      navigation.tsx      # Active navigation + what-if engine
      settings.tsx
      saved-routes.tsx
      route-summary.tsx
  services/
    routing/              # Provider abstraction, Google + Mapbox impls, RoutingService
    location/             # GPS tracking, route snapping, off-route detection
    firebase/             # Auth + Firestore wrappers
  stores/                 # Zustand stores (navigation, what-if, connection)
  components/
    map/                  # RouteOverlay
    navigation/           # BottomSheet, ComparisonBar
    common/               # ConnectionBanner
  utils/                  # geo, polyline, debounce
  theme/                  # Design tokens (colors, radius, spacing, typography, shadows)

functions/                # Firebase Cloud Functions (separate Node project)
  src/
    route-proxy.ts        # Calls Google/Mapbox APIs server-side
    middleware/           # auth, rate-limit, usage-tracker

docs/superpowers/
  specs/                  # Design specification
  plans/                  # Implementation plan

firestore.rules           # Firestore security rules
firebase.json             # Firebase project config
```

---

## Prerequisites

You'll need accounts and credentials for these services. Sign up first if you don't have them:

| Service | Purpose | Free tier |
|---|---|---|
| [Firebase](https://console.firebase.google.com) | Auth, Firestore, Cloud Functions | Generous; Cloud Functions need Blaze plan (pay-as-you-go but free tier covers 2M invocations/month) |
| [Google Cloud](https://console.cloud.google.com) | Routes API for routing | 5,000 traffic-aware routing requests/month free |
| [Mapbox](https://account.mapbox.com) | Map tiles + fallback routing | 25,000 MAU free, 100,000 directions requests/month free |
| Apple Developer | Required only for App Store submission | $99/year |

Plus on your dev machine:

- **Node.js 20.19.4 or newer** (Expo SDK 54 requirement) — get from [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **Firebase CLI** — installed automatically via `npx`
- **An Expo account** — sign up free at [expo.dev](https://expo.dev) (needed for EAS Build)

> **Note:** This app uses `@rnmapbox/maps` which is a native iOS module not bundled in the standard Expo Go app. You'll build a custom development client via EAS Build (cloud-hosted, no Mac required, free tier covers 30 builds/month).

---

## Setup on a New Device

### 1. Clone the repo

```bash
git clone https://github.com/amaninderpreetsingh/whatif-nav.git
cd whatif-nav
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
cd functions && npm install --legacy-peer-deps && cd ..
```

> The `--legacy-peer-deps` flag is needed due to a known Expo SDK 54 transitional issue with React 19 peer dependencies.

### 3. Create the `.env` file

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

You'll need the following values:

```
# From Mapbox (account.mapbox.com → Access tokens)
EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN=pk.xxx

# From Firebase Console → Project settings → Your apps → Web app config
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXX

# From Google Cloud Console → APIs & Services → Credentials
# Restrict this key to your iOS bundle ID for production
EXPO_PUBLIC_GOOGLE_ROUTES_FALLBACK_KEY=AIzaSyXXX

EXPO_PUBLIC_FUNCTIONS_REGION=us-central1
```

> `.env` is gitignored — never commit it.

### 4. Set up the Firebase project

Skip this step if you're cloning into an environment that already has Firebase deployed (`firebase.json` and `.firebaserc` will point to the existing project).

If setting up a fresh Firebase project:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Authentication** → Get Started → enable **Email/Password** sign-in
3. **Firestore Database** → Create database → production mode → pick a region
4. Upgrade to **Blaze plan** (Cloud Functions require it; free tier covers normal usage)
5. Update `.firebaserc` with your project ID:
   ```json
   { "projects": { "default": "your-project-id" } }
   ```

### 5. Authenticate Firebase CLI and store secrets

```bash
npx firebase login
npx firebase use your-project-id
```

Cloud Functions need server-side API keys (these are NOT in `.env` — they go in Firebase Secrets):

```bash
npx firebase functions:secrets:set GOOGLE_ROUTES_API_KEY
# Paste your Google Routes API key when prompted

npx firebase functions:secrets:set MAPBOX_SECRET_TOKEN
# Paste your Mapbox token when prompted (a secret sk.* token is preferred over the public pk.* token)
```

### 6. Grant the build service account permissions

If this is the first deploy on a fresh Firebase project, the Cloud Build service account needs the **Cloud Build Service Account** role:

1. Open [console.cloud.google.com/iam-admin/iam](https://console.cloud.google.com/iam-admin/iam) for your project
2. Find `[PROJECT_NUMBER]-compute@developer.gserviceaccount.com`
3. Edit → Add another role → search **Cloud Build Service Account** → Save

### 7. Deploy backend

```bash
npx firebase deploy --only firestore
npx firebase deploy --only functions
```

You should see `calculateRoute(us-central1)` deploy successfully.

### 8. Build the iOS development client

The app uses native Mapbox code, so it needs a custom dev build. EAS handles this in the cloud — no Mac required.

```bash
npm install -g eas-cli
eas login                                    # log in with your Expo account
eas build:configure                          # creates project on EAS (one-time)
eas build --profile development --platform ios
```

The build takes ~15 minutes. When done, EAS gives you a QR code or install link. Open it on your iPhone — it'll prompt to install the dev client. Trust the developer in **Settings → General → VPN & Device Management** if iOS asks.

### 9. Run the app

```bash
npx expo start --dev-client
```

Open the **dev client app** you just installed on your iPhone (NOT Expo Go) and tap the QR code or paste the URL. The app loads.

> If you make changes that don't touch native code (UI, JS logic, screens), you don't need to rebuild — just `npx expo start --dev-client` and reload. Rebuild only when you add/upgrade native modules.

---

## Testing

### Unit & integration tests (Jest)

```bash
npx jest
```

Runs 84 tests across 15 suites: utility math, routing service, providers, stores, location service, Firebase wrappers.

### Web build smoke test (Playwright)

There's a Playwright suite that builds the app for web and inspects the rendered UI:

```bash
# Build web bundle
npx expo export --platform web

# In another terminal, serve it
npx serve dist -p 3001

# Run the inspection
node scripts/inspect-ui.js
node scripts/inspect-flow.js
node scripts/inspect-route.js
```

Screenshots are saved to `screenshots/`. Note: the web build is for smoke-testing only — the actual app is iOS-native and many features (haptics, GPS, native gestures) only work on device.

---

## How the "what-if" engine works

When you're navigating an active route and tap a point on the map:

1. App validates the tap is routable (not water, etc.)
2. The waypoint is inserted at the **correct geographic position** along the route — not appended. Tapping a point between A and B inserts there, even if you've already added points further along.
3. `RoutingService` debounces (300ms) then calls the Cloud Function with all current waypoints
4. The Cloud Function calls Google Routes (or Mapbox if you toggled it) with the waypoints as `intermediates`
5. The new route renders as a gray dashed line over the original blue line; the comparison bar shows the time delta
6. Tap **Accept** to switch to the modified route, **Discard** to revert, or **Undo** to remove the last waypoint

Up to 25 waypoints per chain (Google's hard limit). The Cloud Function rate-limits at 30 routing calls/minute/user to prevent runaway costs.

---

## Cost model

API calls are routed through a Cloud Function proxy that holds your API keys server-side and increments a per-user, per-month usage counter (`users/{uid}.apiUsage.routeRequests`).

| Tier | Provider | Rate | Free monthly |
|---|---|---|---|
| Personal / dev | Google Routes Pro | $0.01/call | 5,000 |
| Cost-saver fallback | Mapbox Directions | Free | 100,000 |

A user in Settings can flip the routing provider toggle if their app shows usage approaching the Google free tier. The cap and provider selection both live in Firestore.

---

## Architecture decisions

A few things worth calling out:

- **API keys never touch the client.** All routing calls go through `calculateRoute` Cloud Function. The client only knows about Firebase auth tokens. There's a restricted client-side fallback key for the Cloud Function being unreachable, but it's bundle-ID locked.
- **Provider abstraction.** `RouteProvider` interface with `GoogleRouteProvider` and `MapboxRouteProvider` implementations. Switching is a settings toggle, not a code change. The service auto-falls back to the secondary provider on errors.
- **Snap-to-route, not raw GPS.** Raw GPS drifts 5-15m. The `RouteSnapper` projects each GPS reading onto the route polyline. Off-route detection requires sustained 50m+ deviation for 10+ seconds to avoid false triggers from tunnels and parallel roads.
- **Waypoint geographic ordering.** Tapped points are inserted at their projected position along the route, not appended. This produces sensible routes even with non-sequential taps.

---

## Roadmap / known limitations

- Voice guidance — not in v1
- Offline maps — only the active route is cached locally (MMKV)
- Real reverse geocoding for waypoint labels — currently uses lat/lng strings; ready to plug in Mapbox Geocoding API
- Apple Sign-In — code is in place but not wired up; needs Apple Developer enrollment

---

## Repository

[github.com/amaninderpreetsingh/whatif-nav](https://github.com/amaninderpreetsingh/whatif-nav)
