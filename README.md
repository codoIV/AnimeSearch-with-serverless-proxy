# AnimeSearch

A retro-styled anime search tool built with vanilla JavaScript and the MyAnimeList API. Type in a title and it resolves the search down to the original season/entry of the franchise, then lets you browse every related season, movie, and OVA from a dropdown.

## Why I built it

I wanted something personal, small and focused to put on my GitHub that wasn't just a tutorial clone — something that i could actually use often. The MyAnimeList search API doesn't reliably return the "first" entry of a franchise (searching "Dragon Ball" can just as easily return *Dragon Ball Kai* as the original series), so the interesting part of this project was figuring out how to resolve that programmatically instead of just displaying whatever the API ranked first.

## How it works

1. **Search** — debounced input hits the MAL API through a serverless proxy.
2. **Find the root entry** — the app walks backward through each result's `related_anime` data, following the `prequel` relation until it reaches the entry with none. That's treated as the base/season 1 entry and is what gets displayed by default.
3. **Map the franchise** — from that root, a breadth-first search follows `sequel`, `side_story`, `alternative_version`, `full_story`, `summary`, and `parent_story` relations to collect every connected season, movie, and OVA (capped at 20 lookups to keep it fast).
4. **Browse** — the results populate a dropdown, so switching between seasons/movies/specials doesn't require a new search.

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks)
- **Backend:** a single Node.js serverless function, deployed on Vercel
- **Data source:** [MyAnimeList API](https://myanimelist.net/apiconfig/references/api/v2)

The serverless function exists purely to attach the MAL client ID server-side and avoid exposing it directly in client requests — the frontend never talks to MyAnimeList directly.

## Project structure

```
.
├── api/
│   └── proxy.js        # Serverless function — forwards requests to the MAL API
├── index.html
├── logic.js             # Search, franchise resolution, and UI logic
├── anime_style.css
├── package.json
└── .env.example          # Template for the MAL_CLIENT_ID env variable
```

## Running it locally

1. Install the [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. Copy `.env.example` to `.env.local` and add your own MAL client ID:
   ```
   MAL_CLIENT_ID=your_client_id_here
   ```
3. Run:
   ```
   vercel dev
   ```
4. Open the local URL it gives you.

A MAL client ID is free — register a new app at [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig).

## Deployment

This project is deployed on [Vercel](https://vercel.com):

1. Import the repo into Vercel (Framework preset: **Other** — no build step needed).
2. Add an environment variable in the project settings: `MAL_CLIENT_ID` → your client ID.
3. Deploy. Every push to `main` redeploys automatically.

## Possible future improvements

- Cache franchise lookups so repeat searches don't re-fetch the same data
- Add loading states while the franchise map is being built
- Surface a short synopsis alongside genre/studio/score

## Author

**Elia Fantino** ([@codoIV](https://github.com/codoIV))
