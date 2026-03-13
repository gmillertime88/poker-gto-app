# GTO Project Summary

## Project Purpose
This repository is a static poker toolkit with two calculators:
- GTO Ranges: preflop first-in recommendation tool based on local range data
- Odds: exact win/tie/equity calculator by full board enumeration

No backend is required for current app behavior. All logic runs in browser JavaScript.

## Top-Level Folder Inventory

### Hidden and environment items
- .DS_Store
  - macOS Finder metadata file
  - Not used by app logic

- .env
  - Local environment variable file
  - Ignored by git (see .gitignore)
  - Typically used for local secrets/settings if needed

- .git/
  - Git repository metadata and history
  - Internal VCS folder

- .github/
  - Repository automation and assistant configuration
  - Contains .github/agents/Azure_Static_Web_App.chatmode.md

- .gitignore
  - Ignore rules for git
  - Current rules include: .env, __pycache__/, *.pyc

- .venv/
  - Local Python virtual environment
  - Supports utility scripts such as tools/bump_build.py

### Documentation and notes
- README.md
  - Main project readme
  - Describes app purpose, pages, local run, and deploy alias workflow

- GTO.MD
  - This project summary document
  - Describes files, folders, and major UI elements in the workspace

- AZURE_HOSTING_AI_INSTRUCTIONS.md
  - Planning document for future Azure hosting and AI integration
  - Not part of current runtime path

- GM GTO
  - Empty file (currently no content)

### Application source files
- index.html
  - Home/menu page
  - Links to ranges.html and odds.html

- ranges.html
  - GTO ranges UI page
  - Hosts selectors and recommendation result panel

- odds.html
  - Odds calculator UI page
  - Hosts player card entry, board cards, calculate button, and result table

- styles.css
  - Global styling for all pages
  - Includes dark/light theme tokens, layout, component styles, and responsive rules

- theme.js
  - Shared app chrome behavior
  - Handles theme toggle persistence and hamburger menu behavior

- app.js
  - Ranges page logic
  - Loads ranges.json and computes recommendation/action/size

- odds.js
  - Odds page logic
  - Validates scenario, enumerates possible boards, evaluates winners, renders percentages

### Data files
- ranges.json
  - Primary runtime range table loaded by app.js
  - JSON array of rows with hand fields and action per position

- ranges.csv
  - CSV representation of similar range data
  - Useful for inspection/edit workflows, not primary runtime source

### Assets and tooling folders
- assets/
  - UI assets used by pages
  - Contains: assets/millertime-poker-logo.png

- tools/
  - Utility scripts for development/deployment workflow
  - Contains: tools/bump_build.py

- __pycache__/
  - Python bytecode cache folder
  - Contains: __pycache__/server.cpython-313.pyc

## Important Nested Files
- .github/agents/Azure_Static_Web_App.chatmode.md
  - Defines a custom assistant mode focused on Azure Static Web Apps workflows

- tools/bump_build.py
  - Python script that bumps BUILD_VERSION and BUILD_TIMESTAMP in app.js and odds.js
  - Supports --dry-run mode

- assets/millertime-poker-logo.png
  - Brand/logo image used on menu and calculator pages

## Page and Element Map

## index.html (Main Menu)
Main elements:
- .app-shell > .card: page shell container
- .top-nav: top navigation row
- .theme-control with [data-theme-toggle]: dark/light switch
- .splash-wrap and .splash-logo: large centered logo
- .menu-grid: two navigation cards
  - Link 1: GTO Ranges -> ranges.html
  - Link 2: Calculate Odds -> odds.html

Runtime behavior:
- theme.js wires theme toggle and persistent theme selection

## ranges.html (GTO Ranges)
Main input groups:
- #players-grid (Players)
- #temperature-grid (Table Temperature)
- #position-grid (Position)
- #card1-grid (Card 1)
- #card2-grid (Card 2)
- #suited-grid (Suiting)

Result section:
- #result-box
- #hand-value
- #action-value
- #size-value

Other key elements:
- .required-asterisk and .required-note: required input indicators
- #build-tag: build/version stamp
- Hamburger menu in .top-nav with links to Ranges/Odds and theme control

Runtime behavior from app.js:
- Maintains mutable state for players, table temperature, position, ranks, and suiting
- Loads ranges.json once and derives threshold maps for dynamic widening/tightening
- Computes recommendation action and open size in BB
- Updates result row labels in inline label:value format

## odds.html (Odds Calculator)
Main sections:
- Players selector:
  - #odds-players-grid
  - #reset-odds-btn
- Player hand editor:
  - #player-rows
- Community board:
  - #board-grid
  - #calculate-odds-btn (rendered as board-style panel)

Status/results area:
- #odds-status (status line)
- #boards-evaluated (possible combinations count)
- #odds-results (board and odds table output)
- #build-tag (build/version stamp)

UI text/layout highlights:
- Calculate button label is split to two centered lines (Calculate / Odds)
- Result summary rows use bold label with colon and inline value formatting

Runtime behavior from odds.js:
- Tracks selected cards for each player and board
- Prevents duplicate cards
- Detects street from board completeness (preflop/flop/turn/river)
- Enumerates all remaining board combinations exactly
- Evaluates each player best 5-card hand from 7 cards
- Produces Win %, Tie %, Equity % per player
- Computes turn outs details when exactly one river card remains unknown

## Shared Styling and Chrome

## styles.css
Major style responsibilities:
- Design tokens in :root and [data-theme="light"]
- Global layout, card containers, top nav, buttons, tables
- Selector grids, board slots, card tokens, status/value styles
- Odds and ranges summary row alignment styles
- Responsive rules for mobile width

## theme.js
Shared UI wiring:
- Theme storage key: millerTimePokerTheme
- Applies dark/light theme to document root via data-theme
- Syncs all [data-theme-toggle] inputs
- Closes hamburger menu when clicking links or outside menu area

## Data and Logic Flow
- ranges.html -> app.js -> ranges.json
  - app.js loads range table, computes context-adjusted recommendation, and renders Hand/Action/Size

- odds.html -> odds.js
  - odds.js builds scenario from selected cards, validates legality, enumerates unknown board combinations, and renders exact percentages

- All pages -> styles.css + theme.js
  - styles.css controls look and responsive behavior
  - theme.js controls theme and menu chrome behaviors

## Build and Versioning
- app.js and odds.js each contain:
  - BUILD_VERSION
  - BUILD_TIMESTAMP

- tools/bump_build.py updates both files in sync
- README.md documents the deploy alias workflow using this script

## Notes and Maintenance Guidance
- ranges.json is the primary runtime source for preflop ranges; keep this file authoritative for recommendations
- ranges.csv can be maintained as a human-editable companion but does not drive runtime directly
- Keep app.js and odds.js BUILD_VERSION/TIMESTAMP aligned when releasing
- .env is intentionally excluded from git; do not commit secrets
- __pycache__ and .DS_Store are generated artifacts and not source of truth
