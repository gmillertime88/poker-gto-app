## Miller Time GTO (Static)

This is a static preflop first-in recommendation app.

- No backend required.
- No API keys required.
- Recommendations are calculated locally in `app.js` using `ranges.json`.

## Run locally (optional)

Use any static file host. Example:

`python3 -m http.server 8000`

Then open:

`http://localhost:8000`

## Deploy with GitHub Pages

1. Push this repo to GitHub.
2. In GitHub: `Settings` → `Pages`.
3. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` (root)
4. Save and wait for Pages to publish.

Your app will run fully as a static site.
