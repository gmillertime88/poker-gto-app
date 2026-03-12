// ------------------------------
// Static UI and game configuration
// ------------------------------
const PLAYER_COUNTS = [5, 6, 7, 8, 9];
const TABLE_TEMPERATURES = [
  { key: "conservative", label: "Conservative" },
  { key: "normal", label: "Normal" },
  { key: "aggressive", label: "Aggressive" },
];

const BUILD_VERSION = "1.3";
const BUILD_TIMESTAMP = "2026-03-12 11:58";

const POSITION_DISPLAY_ORDER = ["D", "SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO"];

const POSITIONS_BY_PLAYERS = {
  5: ["D", "SB", "BB", "UTG", "CO"],
  6: ["D", "SB", "BB", "UTG", "MP1", "CO"],
  7: ["D", "SB", "BB", "UTG", "MP1", "MP2", "CO"],
  8: ["D", "SB", "BB", "UTG", "MP1", "MP2", "HJ", "CO"],
  9: ["D", "SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO"],
};
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITING = [
  { label: "Suited", value: true },
  { label: "Off-suit", value: false },
];

// Baseline open-raise sizing recommendations by position (in big blinds).
const OPEN_SIZE_BB = {
  UTG: 2.2,
  MP1: 2.2,
  MP2: 2.2,
  MP3: 2.3,
  HJ: 2.3,
  CO: 2.5,
  D: 2.5,
  SB: 3.0,
  BB: 2.5,
};

// Range widening delta by number of players at the table (fewer players => wider ranges).
const WIDEN_DELTA_BY_PLAYERS = {
  5: 2.3,
  6: 1.6,
  7: 1.0,
  8: 0.5,
  9: 0,
};

// Positive values tighten ranges, negative values loosen ranges.
const TEMPERATURE_RANGE_ADJUST = {
  conservative: 0.8,
  normal: 0,
  aggressive: -0.8,
};

// Positive values increase opening size, negative values decrease opening size.
const TEMPERATURE_SIZE_ADJUST = {
  conservative: -0.2,
  normal: 0,
  aggressive: 0.3,
};

// Card rank conversion helpers used for hand normalization and scoring.
const rankToNum = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const numToRank = Object.fromEntries(Object.entries(rankToNum).map(([rank, value]) => [value, rank]));

// ------------------------------
// Mutable app state
// ------------------------------
const state = {
  players: 9,
  temperature: "normal",
  position: null,
  card1: null,
  card2: null,
  suited: null,
  rangeMapsByContext: new Map(),
  baseRows: [],
  thresholds: {},
};

// ------------------------------
// Cached DOM references
// ------------------------------
const elements = {
  playersGrid: document.getElementById("players-grid"),
  temperatureGrid: document.getElementById("temperature-grid"),
  positionGrid: document.getElementById("position-grid"),
  card1Grid: document.getElementById("card1-grid"),
  card2Grid: document.getElementById("card2-grid"),
  suitedGrid: document.getElementById("suited-grid"),
  handValue: document.getElementById("hand-value"),
  actionValue: document.getElementById("action-value"),
  sizeValue: document.getElementById("size-value"),
  buildTag: document.getElementById("build-tag"),
};

function renderBuildTag() {
  if (!elements.buildTag) {
    return;
  }

  elements.buildTag.textContent = `v${BUILD_VERSION} • ${BUILD_TIMESTAMP}`;
}

/**
 * Returns the seat positions that should be shown for the selected player count,
 * ordered consistently for the UI.
 */
function getActivePositions() {
  const players = Number(state.players) || 9;
  const positions = POSITIONS_BY_PLAYERS[players] || POSITIONS_BY_PLAYERS[9];

  return POSITION_DISPLAY_ORDER.filter((position) => {
    if (!positions.includes(position)) {
      return false;
    }

    if (players <= 7 && position === "HJ") {
      return false;
    }

    if (players <= 8 && position === "MP3") {
      return false;
    }

    return true;
  });
}

/**
 * Builds a canonical lookup key for a hand + suitedness so range rows can be
 * cached and retrieved quickly from maps.
 */
function tableKey(card1, card2, suited) {
  return `${card1}-${card2}-${suited ? 1 : 0}`;
}

/**
 * Produces a synthetic hand-strength score used to smoothly widen/tighten ranges
 * from a baseline table. Higher score means stronger hand.
 */
function handStrength(card1, card2, suited) {
  if (card1 === card2) {
    return card1 + 8;
  }

  let score = (card1 * 0.62) + (card2 * 0.38);
  if (suited) {
    score += 2.1;
  }
  if (card1 >= 11 && card2 >= 10) {
    score += 1.4;
  }
  if (card1 - card2 === 1) {
    score += 0.7;
  }
  if (card1 - card2 >= 5) {
    score -= 0.8;
  }

  return score;
}

/**
 * For each position, finds the weakest baseline hand that is still a Raise.
 * This score acts as the threshold when adjusting ranges by context.
 */
function buildPositionThresholds(baseRows) {
  const thresholds = {};
  const positions = ["UTG", "MP1", "MP2", "MP3", "HJ", "CO", "D", "SB", "BB"];

  positions.forEach((position) => {
    const raiseScores = baseRows
      .filter((row) => row[position] === "Raise")
      .map((row) => handStrength(row.card1, row.card2, row.suited));

    thresholds[position] = raiseScores.length ? Math.min(...raiseScores) : Infinity;
  });

  return thresholds;
}

/**
 * Determines the final action for a specific position after applying widening/
 * tightening deltas. Blind positions get custom handling for realistic behavior.
 */
function deriveAction(baseAction, position, score, threshold, delta) {
  if (position === "BB") {
    if (baseAction === "Raise") {
      return "Raise";
    }
    return score >= (threshold - (delta * 0.8)) ? "Raise" : "Check";
  }

  if (position === "SB") {
    if (baseAction === "Raise") {
      return "Raise";
    }
    if (score >= (threshold - delta)) {
      return "Raise";
    }
    return baseAction === "Call" ? "Call" : "Fold";
  }

  if (baseAction === "Raise") {
    return "Raise";
  }

  return score >= (threshold - delta) ? "Raise" : "Fold";
}

/**
 * Creates a context-specific range map (players + table temperature) from the
 * baseline rows by recomputing actions using score thresholds.
 */
function buildRangeMapForPlayers(baseRows, players, thresholds) {
  const rangeMap = new Map();
  const playerDelta = WIDEN_DELTA_BY_PLAYERS[players] ?? 0;
  const temperatureDelta = TEMPERATURE_RANGE_ADJUST[state.temperature] ?? 0;
  const delta = playerDelta + temperatureDelta;

  baseRows.forEach((baseRow) => {
    const row = { ...baseRow };
    const score = handStrength(baseRow.card1, baseRow.card2, baseRow.suited);

    Object.keys(thresholds).forEach((position) => {
      row[position] = deriveAction(baseRow[position], position, score, thresholds[position], delta);
    });

    rangeMap.set(tableKey(row.card1, row.card2, row.suited), row);
  });

  return rangeMap;
}

/**
 * Returns the current context range map from cache, building and caching it on
 * first access to avoid repeated recomputation.
 */
function getRangeMapForSelectedPlayers() {
  const contextKey = `${state.players}-${state.temperature}`;
  if (state.rangeMapsByContext.has(contextKey)) {
    return state.rangeMapsByContext.get(contextKey);
  }

  const map = buildRangeMapForPlayers(state.baseRows, state.players, state.thresholds);
  state.rangeMapsByContext.set(contextKey, map);
  return map;
}

/**
 * Normalizes two selected card ranks into a canonical representation where
 * card1 >= card2, and enforces that pairs are treated as unsuited.
 */
function normalizeHand(rank1, rank2, suited) {
  const num1 = rankToNum[rank1];
  const num2 = rankToNum[rank2];

  const high = Math.max(num1, num2);
  const low = Math.min(num1, num2);
  const pair = high === low;

  return {
    card1: high,
    card2: low,
    suited: pair ? false : suited,
    handText: pair
      ? `${numToRank[high]}${numToRank[low]}`
      : `${numToRank[high]}${numToRank[low]}${suited ? "s" : "o"}`,
    isPair: pair,
  };
}

/**
 * Stores a user selection in state and triggers dependent UI/result updates.
 */
function setSelectionValue(group, value) {
  state[group] = group === "players" ? Number(value) : value;

  if (group === "players") {
    const activePositions = getActivePositions();
    if (!activePositions.includes(state.position)) {
      state.position = null;
    }
  }

  renderSelections();
  updateResult();
}

/**
 * Renders a single reusable selection button into the target button grid.
 */
function renderButton(grid, label, isActive, onClick, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `select-btn${isActive ? " active" : ""}`;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  grid.appendChild(button);
}

/**
 * Re-renders all selectable controls based on current state.
 * Also enforces suited-option rules for pocket pairs.
 */
function renderSelections() {
  elements.playersGrid.innerHTML = "";
  PLAYER_COUNTS.forEach((count) => {
    renderButton(
      elements.playersGrid,
      String(count),
      state.players === count,
      () => setSelectionValue("players", count)
    );
  });

  elements.temperatureGrid.innerHTML = "";
  TABLE_TEMPERATURES.forEach((temperature) => {
    renderButton(
      elements.temperatureGrid,
      temperature.label,
      state.temperature === temperature.key,
      () => setSelectionValue("temperature", temperature.key)
    );
  });

  const activePositions = getActivePositions();

  elements.positionGrid.innerHTML = "";
  activePositions.forEach((position) => {
    renderButton(
      elements.positionGrid,
      position,
      state.position === position,
      () => setSelectionValue("position", position)
    );
  });

  elements.card1Grid.innerHTML = "";
  RANKS.forEach((rank) => {
    renderButton(elements.card1Grid, rank, state.card1 === rank, () => setSelectionValue("card1", rank));
  });

  elements.card2Grid.innerHTML = "";
  RANKS.forEach((rank) => {
    renderButton(elements.card2Grid, rank, state.card2 === rank, () => setSelectionValue("card2", rank));
  });

  const isPair = state.card1 && state.card2 && state.card1 === state.card2;
  if (isPair) {
    state.suited = false;
  }

  elements.suitedGrid.innerHTML = "";
  SUITING.forEach((option) => {
    renderButton(
      elements.suitedGrid,
      option.label,
      state.suited === option.value,
      () => setSelectionValue("suited", option.value),
      isPair && option.value === true
    );
  });
}

/**
 * Updates the action result badge with visual class + display text.
 */
function setActionBadge(action, message = action) {
  const className = (action || "pending").toLowerCase();
  elements.actionValue.className = `value badge ${className}`;
  elements.actionValue.textContent = message;
}

/**
 * Returns a position-based open size recommendation for aggressive actions,
 * adjusted by table temperature. Non-raise actions return "-".
 */
function getSizeRecommendation(position, action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized !== "raise" && normalized !== "bet") {
    return "-";
  }

  const base = OPEN_SIZE_BB[position] ?? 2.5;
  const adjust = TEMPERATURE_SIZE_ADJUST[state.temperature] ?? 0;
  const size = Math.max(2.0, Math.round((base + adjust) * 10) / 10);
  return `${size} BB`;
}

function getLocalRecommendation(position, normalizedHand) {
  const key = tableKey(normalizedHand.card1, normalizedHand.card2, normalizedHand.suited);
  const rangeMap = getRangeMapForSelectedPlayers();
  const row = rangeMap.get(key);

  if (!row) {
    return null;
  }

  const action = row[position] || "Fold";
  return {
    action,
    sizeText: getSizeRecommendation(position, action),
  };
}

/**
 * Computes and displays the current recommendation from the selected inputs.
 * Handles incomplete selections and missing table entries gracefully.
 */
function updateResult() {
  if (!state.position || !state.card1 || !state.card2 || (state.suited === null && state.card1 !== state.card2)) {
    elements.handValue.textContent = "-";
    setActionBadge("pending", "Select all parameters");
    elements.sizeValue.textContent = "-";
    return;
  }

  const normalized = normalizeHand(state.card1, state.card2, state.suited === true);
  elements.handValue.textContent = `${normalized.handText} (${state.position})`;

  const localRecommendation = getLocalRecommendation(state.position, normalized);
  if (!localRecommendation) {
    setActionBadge("pending", "No action found");
    elements.sizeValue.textContent = "-";
    return;
  }

  setActionBadge(localRecommendation.action, localRecommendation.action);
  elements.sizeValue.textContent = localRecommendation.sizeText;
}

/**
 * Loads baseline range data from disk and prepares derived threshold metadata.
 */
async function loadRangeTable() {
  const response = await fetch("ranges.json");
  if (!response.ok) {
    throw new Error("Unable to load ranges.json");
  }

  state.baseRows = await response.json();
  state.thresholds = buildPositionThresholds(state.baseRows);
  state.rangeMapsByContext.clear();
}

/**
 * Application bootstrap: loads data, paints controls, and renders the first
 * recommendation. Falls back to a user-visible error state on failure.
 */
async function init() {
  try {
    renderBuildTag();
    await loadRangeTable();
    renderSelections();
    updateResult();
  } catch (error) {
    renderBuildTag();
    elements.handValue.textContent = "Error";
    setActionBadge("pending", "Failed to load range data");
    elements.sizeValue.textContent = "-";
    console.error(error);
  }
}

// Start the app.
init();
