# Step 2: Expo scaffold

**Commit:** `6f2ae2d`

## What changed

- Created the Expo app in `/app` from the blank TypeScript template.
- **Expo SDK 57**, to match Expo Go on Google Play. The template started on SDK 58, which Expo Go doesn't support yet, so the project was moved down and pinned to `~57.0.30`.
- Added **Expo Router** and web support:
  - `expo-router`
  - `react-native-safe-area-context`
  - `react-native-screens`
  - `expo-linking`
  - `expo-constants`
  - `react-native-web`
  - `react-dom`
- App config: the name is "Recharge", the link scheme is `recharge://`, typed routes are on, and light/dark follows the device.
- Routes live in `src/app/` (the SDK 57+ default). The `@/` import alias points to `src/`.
- Kept the template's `AGENTS.md` (Expo's notes for AI agents). Removed the template `LICENSE` and `.claude/`.

## Run it

```
cd app
npx expo start
```

Run this from inside `app/`. From the repo root, npx offers to install SDK 58, so answer **n**. Press `w` for the browser, or scan the QR code with Expo Go.

## Key code

**Entry point** (`package.json`). Expo Router finds screens from the files in `src/app/`:
```json
{
  "main": "expo-router/entry",
  "dependencies": { "expo": "~57.0.30", "expo-router": "~57.0.28", "react-native": "0.86.3" }
}
```

**App config** (`app.json`, excerpt):
```json
{
  "expo": {
    "name": "Recharge",
    "slug": "recharge",
    "scheme": "recharge",
    "userInterfaceStyle": "automatic",
    "plugins": ["expo-router", "expo-status-bar"],
    "experiments": { "typedRoutes": true }
  }
}
```

**Import alias** (`tsconfig.json`). It allows `import … from '@/domain/auth'` instead of long relative paths:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true, "paths": { "@/*": ["./src/*"] } }
}
```

## Checks

- The type check passes.
- `expo-doctor` passes 21 of 21 checks.
- Web and Android bundles build.
