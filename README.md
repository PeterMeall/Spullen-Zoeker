# Spullenzoeker

A Dutch home inventory app: it keeps track of what is stored where (room, cupboard, compartment).
One codebase, three ways to use it:

- **Laptop / desktop:** open the hosted web app in a browser (sidebar layout on wide screens).
- **Phone:** install it as a PWA ("Add to home screen") or as the Android app.
- **Android native:** wrapped with Capacitor (see below).

Plain HTML, CSS and JavaScript. No build step needed for the web version.

## Try it locally

```bash
npm run serve        # then open http://localhost:5173
```

Without a Firebase configuration the app runs in **local mode** (data stays in this browser only).

## 1. Firebase (sync between devices), step by step

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project** (or "Add project"), name it (for example `spullenzoeker`), and click through. Google Analytics can be switched off.
3. On the project home page click the **Web icon (</>)** to add a web app. Give it a nickname, leave "Firebase Hosting" unticked, click **Register app**.
4. Copy the `firebaseConfig` values shown (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) into `firebase-config.js`.
5. Left menu: **Build > Authentication > Get started > Sign-in method > Email/Password > Enable > Save**.
6. Left menu: **Build > Firestore Database > Create database**. Pick a region close to you (for example `eur3` or `europe-west4`) and start in **production mode**.
7. In Firestore open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
8. After hosting the app (step 2 below), add its domain: **Authentication > Settings > Authorised domains > Add domain** (for example `yourname.github.io`). `localhost` is already allowed for testing.
9. Open the app, tap **Account maken** once, then log in with that same account on every device.

Data lives under `users/{uid}` and is only readable by that user. Offline use works and syncs when back online.

## 2. Hosting

**GitHub Pages** (simplest): push this folder to a GitHub repo, then Settings > Pages > deploy from `main`, root folder.
Add the Pages domain (`<user>.github.io`) under Firebase > Authentication > Settings > Authorised domains.

**Firebase Hosting** (alternative):

```bash
npm run build:web
npx firebase-tools login
npx firebase-tools init hosting   # keep public dir "www", single-page app: no
npx firebase-tools deploy
```

## 3. Android app (Capacitor)

Requires Node and Android Studio.

```bash
npm install
npm run android:add     # first time only
npm run android:sync    # after every change to the web files
npm run android:open    # opens Android Studio; run or build the APK/AAB there
```

App id is `nl.spullenzoeker.app` (change it in `capacitor.config.json` before publishing).
Keep `firebase-config.js` filled in so the Android app syncs with the laptop version.

## Backup

Settings > Exporteren saves everything as a JSON file; Importeren restores it.
