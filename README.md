# 💗 Callirene's Birthday Site

A private, encrypted birthday website for Salma. The published site (`docs/index.html`)
is AES-256 encrypted — only someone with the password can see anything.

## How to update content

| What | Where |
|---|---|
| Photos | Drop image files into `assets/photos/` (sorted by filename) |
| Photo captions | `assets/captions.txt` — one line per photo, same order |
| Song | Put the mp3 at `assets/song.mp3` |
| Love letter, reasons, gift text | Edit the `CONTENT` object near the bottom of `src/site.html` |

## Build (re-encrypt)

```
npm install        (first time only)
npm run build -- <password>
   or: node build/build.mjs <password>
```

Result: `docs/index.html` (encrypted). Preview it locally by opening it in a browser.

## Preview the unencrypted site while editing

Open `src/site.html` directly in a browser. Photos show as placeholders there —
they're only injected at build time.

Tip: the countdown gate blocks the site before July 5 — tap the 🎈 balloon
**7 times** to skip it while testing.

## Deploy

Push to GitHub, with Pages enabled serving from the `docs/` folder on `main`.
`src/` and `assets/` are gitignored so no private content ever leaves this machine —
only the encrypted `docs/index.html` is published.

## ⚠️ Rules

- Never commit `src/` or `assets/` (the `.gitignore` already blocks them).
- After changing any content, rebuild **with the same password** and push `docs/`.
