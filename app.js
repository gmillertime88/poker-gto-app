const PLAYER_COUNTS = [5, 6, 7, 8, 9];

const POSITIONS_BY_PLAYERS = {
  5: ["D", "SB", "BB", "UTG", "CO"],
  6: ["D", "SB", "BB", "UTG", "CO", "MP1"],
  7: ["D", "SB", "BB", "UTG", "CO", "MP1", "MP2"],
  8: ["D", "SB", "BB", "UTG", "CO", "MP1", "MP2", "HJ"],
  9: ["D", "SB", "BB", "UTG", "CO", "MP1", "MP2", "HJ", "MP3"],
};
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITING = [
  { label: "Suited", value: true },
  { label: "Off-suit", value: false },
];

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

const WIDEN_DELTA_BY_PLAYERS = {
  5: 2.3,
  6: 1.6,
  7: 1.0,
  8: 0.5,
  9: 0,
};

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

const state = {
  players: 9,
  position: null,
  card1: null,
  card2: null,
  suited: null,
  rangeMapsByPlayers: {},
};

const elements = {
  playersGrid: document.getElementById("players-grid"),
  positionGrid: document.getElementById("position-grid"),
  card1Grid: document.getElementById("card1-grid"),
  card2Grid: document.getElementById("card2-grid"),
  suitedGrid: document.getElementById("suited-grid"),
  handValue: document.getElementById("hand-value"),
  actionValue: document.getElementById("action-value"),
  sizeValue: document.getElementById("size-value"),
};

function getActivePositions() {
  return POSITIONS_BY_PLAYERS[state.players] || POSITIONS_BY_PLAYERS[9];
}

function tableKey(card1, card2, suited) {
  return `${card1}-${card2}-${suited ? 1 : 0}`;
}

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

function buildRangeMapForPlayers(baseRows, players, thresholds) {
  const rangeMap = new Map();
  const delta = WIDEN_DELTA_BY_PLAYERS[players] ?? 0;

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

function getRangeMapForSelectedPlayers() {
  return state.rangeMapsByPlayers[state.players] || state.rangeMapsByPlayers[9] || new Map();
}

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

function setSelectionValue(group, value) {
  state[group] = value;

  if (group === "players") {
    const activePositions = getActivePositions();
    if (!activePositions.includes(state.position)) {
      state.position = null;
    }
  }

  renderSelections();
  updateResult();
}

function renderButton(grid, label, isActive, onClick, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `select-btn${isActive ? " active" : ""}`;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  grid.appendChild(button);
}

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

  elements.suitedGrid.innerHTML = "";
  SUITING.forEach((option) => {
    renderButton(
      elements.suitedGrid,
      option.label,
      state.suited === option.value,
      () => setSelectionValue("suited", option.value),
      isPair
    );
  });

  if (isPair) {
    state.suited = false;
  }
}

function setActionBadge(action, message = action) {
  const className = (action || "pending").toLowerCase();
  elements.actionValue.className = `value badge ${className}`;
  elements.actionValue.textContent = message;
}

function getSizeRecommendation(position, action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized !== "raise" && normalized !== "bet") {
    return "-";
  }

  const size = OPEN_SIZE_BB[position];
  return size ? `${size} BB` : "2.5 BB";
}

function updateResult() {
  if (!state.position || !state.card1 || !state.card2 || (state.suited === null && state.card1 !== state.card2)) {
    elements.handValue.textContent = "-";
    setActionBadge("pending", "Select all parameters");
    elements.sizeValue.textContent = "-";
    return;
  }

  const normalized = normalizeHand(state.card1, state.card2, state.suited === true);
  elements.handValue.textContent = `${normalized.handText} (${state.position})`;

  const key = tableKey(normalized.card1, normalized.card2, normalized.suited);
  const rangeMap = getRangeMapForSelectedPlayers();
  const row = rangeMap.get(key);

  if (!row) {
    setActionBadge("pending", "No action found");
    elements.sizeValue.textContent = "-";
    return;
  }

  const action = row[state.position] || "Fold";
  setActionBadge(action, action);
  elements.sizeValue.textContent = getSizeRecommendation(state.position, action);
}

async function loadRangeTable() {
  const response = await fetch("ranges.json");
  if (!response.ok) {
    throw new Error("Unable to load ranges.json");
  }

  const baseRows = await response.json();
  const thresholds = buildPositionThresholds(baseRows);

  PLAYER_COUNTS.forEach((players) => {
    state.rangeMapsByPlayers[players] = buildRangeMapForPlayers(baseRows, players, thresholds);
  });
}

async function init() {
  try {
    await loadRangeTable();
    renderSelections();
    updateResult();
  } catch (error) {
    elements.handValue.textContent = "Error";
    setActionBadge("pending", "Failed to load range data");
    elements.sizeValue.textContent = "-";
    console.error(error);
  }
}

init();
