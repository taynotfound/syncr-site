# Syncr — Landing Page

Marketing site for [Syncr](https://github.com/Clawb1t/Syncr), a free and open-source Discord Rich Presence extension for Firefox.

Show what you're watching, listening to, and browsing right on your Discord profile — no Discord login, no cloud servers, no paywall. Everything stays on your PC.

## Local preview

```bash
python3 -m http.server 5490
# open http://localhost:5490
```

## Structure

- `index.html` — single-page site
- `styles.css` — all styling (design tokens lifted from the extension popup)
- `app.js` — nav, scroll reveal, live-cycling Discord presence demo
- `assets/` — logo + activity icons

Built as a static site. No build step, no dependencies.

---

Not affiliated with Discord or Mozilla. Syncr is open source.
