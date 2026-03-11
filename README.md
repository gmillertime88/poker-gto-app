## Miller Time GTO (Static)

This is a static poker toolkit with two calculators:

- `Ranges`: preflop first-in recommendation app.
- `Odds`: exact win probability calculator by street.

- No backend required.
- No API keys required.
- Range recommendations are calculated locally in `app.js` using `ranges.json`.
- Odds are calculated locally in `odds.js` by exact board enumeration.

## App pages

- `index.html`: main menu page
- `ranges.html`: range recommendation calculator
- `odds.html`: odds calculator

Both calculators include navigation back to the main menu.

## Odds calculator inputs

On the Odds page, you can set:

- Number of players at the start of the hand
- Two hole cards (rank + suit) for each player
- Stage: Pre-flop, Post-flop, Post-turn, Post-river
- Which players are still in hand on each street
- Community cards required for the selected stage

The calculator reports:

- `Win %` (outright wins)
- `Tie %` (split-pot outcomes)
- `Equity %` (win + tie share)

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

## Auto build bump + deploy

Use this to auto-increment `BUILD_VERSION`, refresh `BUILD_TIMESTAMP`, then push.

One-time alias setup:

`echo 'alias deploygto='"'"'cd "/Users/greg/Library/CloudStorage/Dropbox/Personal/Python/GTO" && python3 tools/bump_build.py && git add -A && git diff --cached --quiet && echo "No changes to deploy." || (git commit -m "Update app" && git push origin main)'"'" >> ~/.zshrc && source ~/.zshrc`

Daily usage:

`deploygto`
