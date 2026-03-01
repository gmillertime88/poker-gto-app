const POSITIONS = ["D", "SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO"];
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
  position: null,
  card1: null,
  card2: null,
  suited: null,
  rangeMap: new Map(),
};

const elements = {
  positionGrid: document.getElementById("position-grid"),
  card1Grid: document.getElementById("card1-grid"),
  card2Grid: document.getElementById("card2-grid"),
  suitedGrid: document.getElementById("suited-grid"),
  handValue: document.getElementById("hand-value"),
  actionValue: document.getElementById("action-value"),
  sizeValue: document.getElementById("size-value"),
};

function tableKey(card1, card2, suited) {
  return `${card1}-${card2}-${suited ? 1 : 0}`;
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
  elements.positionGrid.innerHTML = "";
  POSITIONS.forEach((position) => {
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
  const row = state.rangeMap.get(key);

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

  const rows = await response.json();
  rows.forEach((row) => {
    state.rangeMap.set(tableKey(row.card1, row.card2, row.suited), row);
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
