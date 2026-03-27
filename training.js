const PLAYER_COUNTS = [5, 6, 7, 8, 9];
const TABLE_TEMPERATURES = [
  { key: "conservative", label: "Conservative" },
  { key: "normal", label: "Normal" },
  { key: "aggressive", label: "Aggressive" },
];

const GAME_TYPES = [
  { key: "tournament", label: "Tournament" },
  { key: "cash", label: "Cash Game" },
];

const POSITION_DISPLAY_ORDER = ["D", "SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO"];
const POSITIONS_BY_PLAYERS = {
  2: ["D", "BB"],
  3: ["D", "SB", "BB"],
  4: ["D", "SB", "BB", "UTG"],
  5: ["D", "SB", "BB", "UTG", "CO"],
  6: ["D", "SB", "BB", "UTG", "MP1", "CO"],
  7: ["D", "SB", "BB", "UTG", "MP1", "MP2", "CO"],
  8: ["D", "SB", "BB", "UTG", "MP1", "MP2", "HJ", "CO"],
  9: ["D", "SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO"],
};

const SUITS = [
  { key: "S", symbol: "♠", colorClass: "suit-black" },
  { key: "H", symbol: "♥", colorClass: "suit-red" },
  { key: "D", symbol: "♦", colorClass: "suit-red" },
  { key: "C", symbol: "♣", colorClass: "suit-black" },
];

const BUILD_VERSION = "10.5";
const BUILD_TIMESTAMP = "2026-03-27 08:43";

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_STACK = 1000;
const NPC_ACTION_DELAY_RANGE_MS = {
  conservative: [2200, 5000],
  normal: [900, 5000],
  aggressive: [350, 5000],
};
const STREETS = ["preflop", "flop", "turn", "river"];
const CARD_BACK_IMAGE_PATH = "images/Card.png";
const DEFAULT_RANGE_FILE = "ranges.json";
const CASH_RANGE_FILE = "Supporting Materials/cash_ranges_app_compatible.json";
const TOURNAMENT_RANGE_FILE = "Supporting Materials/tournament_ranges_app_compatible.json";

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

const TEMPERATURE_RANGE_ADJUST = {
  conservative: 0.8,
  normal: 0,
  aggressive: -0.8,
};

const TEMPERATURE_POSTFLOP_ADJUST = {
  conservative: 0.04,
  normal: 0,
  aggressive: -0.04,
};

const POSITION_AGGRESSION = {
  UTG: -0.08,
  MP1: -0.05,
  MP2: -0.03,
  MP3: -0.01,
  HJ: 0.03,
  CO: 0.08,
  D: 0.1,
  SB: 0.06,
  BB: 0,
};

const trainingState = {
  players: 6,
  temperature: "normal",
  userPosition: "D",
  gameType: "tournament",
  baseRowsByGameType: {
    cash: [],
    tournament: [],
  },
  thresholds: {},
  rangesLoaded: false,
  rangeMapsByContext: new Map(),
  handId: 0,
  hand: null,
  showdownRevealed: false,
  waitingForUser: false,
  pendingUserDecision: null,
  decisionLog: [],
  tournamentStacks: null,
  tournamentTotalChips: 0,
  handsPlayed: 0,
  tournamentFinished: false,
  tournamentResult: "",
  userSeat: null,
  betSelectionActive: false,
  handResultMessage: "-",
  pendingRecommendationAction: null,
  pendingAggressiveAction: null,
  autoDealEnabled: true,
  autoDealTimerId: null,
  autoDealCountdownIntervalId: null,
  autoDealCountdownSeconds: 0,
  autoDealPaused: false,
  autoDealCountdownVisible: false,
  sessionReviewEntries: [],
  chipLogBySeat: new Map(),
};

const el = {
  playersGrid: document.getElementById("training-players-grid"),
  temperatureGrid: document.getElementById("training-temperature-grid"),
  settingsPanel: document.getElementById("training-settings-panel") || null,
  settingsOpenButton: document.getElementById("training-settings-open-btn"),
  settingsCloseButton: document.getElementById("training-settings-close-btn"),
  chipLogBody: document.getElementById("training-chip-log"),
  positionGrid: document.getElementById("training-position-grid"),
  gameTypeGrid: document.getElementById("training-game-type-grid"),
  startButton: document.getElementById("training-start-btn"),
  resetButton: document.getElementById("training-settings-reset-btn"),
  session: document.getElementById("training-session"),
  street: document.getElementById("training-street"),
  pot: document.getElementById("training-pot"),
  playersInHand: document.getElementById("training-players-in-hand"),
  odds: document.getElementById("training-odds"),
  recommendation: document.getElementById("training-reco"),
  recommendationAnalysis: document.getElementById("training-reco-analysis"),
  actionOn: document.getElementById("training-action-on"),
  handResult: document.getElementById("training-hand-result"),
  oddsResultsHeader: document.getElementById("training-odds-results-header"),
  board: document.getElementById("training-board"),
  tableBody: document.getElementById("training-table-body"),
  foldBtn: document.getElementById("training-fold-btn"),
  checkBtn: document.getElementById("training-check-btn"),
  callBtn: document.getElementById("training-call-btn"),
  raiseBtn: document.getElementById("training-raise-btn"),
  betBtn: document.getElementById("training-bet-btn"),
  betSizeInput: document.getElementById("training-bet-size-input"),
  betSizeSlider: document.getElementById("training-bet-size-slider"),
  betSizeTicks: document.getElementById("training-bet-size-ticks"),
  betSizeRange: document.getElementById("training-bet-size-range"),
  betSizeCurrent: document.getElementById("training-bet-size-current"),
  prompt: document.getElementById("training-prompt"),
  log: document.getElementById("training-log"),
  summary: document.getElementById("training-summary"),
  summaryHeadline: document.getElementById("training-summary-headline"),
  summaryDetails: document.getElementById("training-summary-details"),
  sessionLogBody: document.getElementById("training-session-log-body"),
  buildTag: document.getElementById("training-build-tag"),
  autoDealToggle: document.getElementById("training-auto-deal-toggle"),
  autoDealControls: document.getElementById("training-auto-deal-controls"),
  autoDealStatus: document.getElementById("training-auto-deal-status"),
  autoDealPauseButton: document.getElementById("training-auto-deal-pause-btn"),
};

function clearAutoDealTimer() {
  if (!trainingState.autoDealTimerId) {
    if (trainingState.autoDealCountdownIntervalId) {
      window.clearInterval(trainingState.autoDealCountdownIntervalId);
      trainingState.autoDealCountdownIntervalId = null;
    }
    trainingState.autoDealCountdownSeconds = 0;
    trainingState.autoDealPaused = false;
    trainingState.autoDealCountdownVisible = false;
    if (el.autoDealControls) {
      el.autoDealControls.hidden = true;
    }
    return;
  }

  window.clearTimeout(trainingState.autoDealTimerId);
  trainingState.autoDealTimerId = null;
  if (trainingState.autoDealCountdownIntervalId) {
    window.clearInterval(trainingState.autoDealCountdownIntervalId);
    trainingState.autoDealCountdownIntervalId = null;
  }
  trainingState.autoDealCountdownSeconds = 0;
  trainingState.autoDealPaused = false;
  trainingState.autoDealCountdownVisible = false;
  if (el.autoDealControls) {
    el.autoDealControls.hidden = true;
  }
}

function updateAutoDealCountdownUi() {
  if (!el.autoDealControls || !el.autoDealStatus || !el.autoDealPauseButton) {
    return;
  }

  const handInProgress = Boolean(trainingState.hand) && trainingState.handResultMessage === "Hand in progress";
  if (handInProgress) {
    el.autoDealControls.hidden = true;
    return;
  }

  const active = trainingState.autoDealCountdownVisible
    && Boolean(trainingState.autoDealTimerId || trainingState.autoDealCountdownIntervalId);
  if (!active) {
    el.autoDealControls.hidden = true;
    return;
  }

  el.autoDealControls.hidden = false;
  el.autoDealStatus.textContent = trainingState.autoDealPaused
    ? `Next hand paused at ${trainingState.autoDealCountdownSeconds}s.`
    : `Next hand in ${trainingState.autoDealCountdownSeconds}s.`;
  el.autoDealPauseButton.textContent = trainingState.autoDealPaused ? "Resume" : "Pause";
}

function startAutoDealCountdown(delaySeconds = 10) {
  clearAutoDealTimer();

  trainingState.autoDealCountdownSeconds = Math.max(1, Math.round(delaySeconds));
  trainingState.autoDealPaused = false;
  trainingState.autoDealCountdownVisible = true;
  trainingState.autoDealTimerId = window.setTimeout(() => {
    trainingState.autoDealTimerId = null;
  }, trainingState.autoDealCountdownSeconds * 1000);

  updateAutoDealCountdownUi();

  trainingState.autoDealCountdownIntervalId = window.setInterval(() => {
    if (trainingState.autoDealPaused) {
      return;
    }

    trainingState.autoDealCountdownSeconds -= 1;
    updateAutoDealCountdownUi();

    if (trainingState.autoDealCountdownSeconds > 0) {
      return;
    }

    clearAutoDealTimer();
    if (!trainingState.tournamentFinished && !trainingState.waitingForUser) {
      startHand();
    }
  }, 1000);
}

function setPromptMessage(message, recommendation = null) {
  if (!el.prompt) {
    return;
  }

  el.prompt.textContent = message;
  el.prompt.className = "training-prompt";

  if (!recommendation) {
    return;
  }

  const action = normalizedAction(recommendation);
  if (action === "fold") {
    el.prompt.classList.add("reco-fold");
    return;
  }

  if (action === "raise") {
    el.prompt.classList.add("reco-raise");
    return;
  }

  el.prompt.classList.add("reco-other");
}

function renderBuildTag() {
  if (!el.buildTag) {
    return;
  }

  el.buildTag.textContent = `v${BUILD_VERSION} • ${BUILD_TIMESTAMP}`;
}

function renderDealButtonIcon() {
  if (!el.startButton) {
    return;
  }

  el.startButton.textContent = "DEAL";
  el.startButton.setAttribute("aria-label", "Deal");
  el.startButton.setAttribute("title", "Deal");
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

    thresholds[position] = raiseScores.length ? Math.min.apply(null, raiseScores) : Infinity;
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

function buildRangeMapForContext(baseRows, players, thresholds) {
  const rangeMap = new Map();
  const playerDelta = Object.prototype.hasOwnProperty.call(WIDEN_DELTA_BY_PLAYERS, players)
    ? WIDEN_DELTA_BY_PLAYERS[players]
    : 0;
  const temperatureDelta = Object.prototype.hasOwnProperty.call(TEMPERATURE_RANGE_ADJUST, trainingState.temperature)
    ? TEMPERATURE_RANGE_ADJUST[trainingState.temperature]
    : 0;
  const delta = playerDelta + temperatureDelta;

  baseRows.forEach((baseRow) => {
    const row = Object.assign({}, baseRow);
    const score = handStrength(baseRow.card1, baseRow.card2, baseRow.suited);

    Object.keys(thresholds).forEach((position) => {
      row[position] = deriveAction(baseRow[position], position, score, thresholds[position], delta);
    });

    rangeMap.set(tableKey(row.card1, row.card2, row.suited), row);
  });

  return rangeMap;
}

function buildDirectRangeMap(baseRows) {
  const rangeMap = new Map();
  baseRows.forEach((row) => {
    rangeMap.set(tableKey(row.card1, row.card2, row.suited), row);
  });
  return rangeMap;
}

function getActiveBaseRows() {
  const selected = trainingState.baseRowsByGameType[trainingState.gameType];
  if (Array.isArray(selected) && selected.length > 0) {
    return selected;
  }

  return trainingState.baseRowsByGameType.tournament;
}

function getRangeMap() {
  return getRangeMapForPlayers(trainingState.players);
}

function getRangeMapForPlayers(playersCount) {
  const safePlayers = Number.isFinite(playersCount) ? Math.max(2, Math.min(9, Math.round(playersCount))) : trainingState.players;
  const cacheKey = `${trainingState.gameType}-${safePlayers}-${trainingState.temperature}`;
  if (trainingState.rangeMapsByContext.has(cacheKey)) {
    return trainingState.rangeMapsByContext.get(cacheKey);
  }

  const baseRows = getActiveBaseRows();
  const thresholds = buildPositionThresholds(baseRows);
  const map = buildRangeMapForContext(baseRows, safePlayers, thresholds);
  trainingState.rangeMapsByContext.set(cacheKey, map);
  return map;
}

function getActivePositions() {
  const positions = POSITIONS_BY_PLAYERS[trainingState.players] || POSITIONS_BY_PLAYERS[9];

  return POSITION_DISPLAY_ORDER.filter((position) => {
    if (!positions.includes(position)) {
      return false;
    }

    if (trainingState.players <= 7 && position === "HJ") {
      return false;
    }

    if (trainingState.players <= 8 && position === "MP3") {
      return false;
    }

    return true;
  });
}

function cardToInt(card) {
  const rank = "23456789TJQKA".indexOf(card.rank) + 2;
  const suit = SUITS.findIndex((s) => s.key === card.suit);
  return (suit * 13) + (rank - 2);
}

function cardFromInt(cardInt) {
  const suit = Math.floor(cardInt / 13);
  const rank = (cardInt % 13) + 2;
  return { rank, suit };
}

function rankNumToText(rankNum) {
  return "--23456789TJQKA"[rankNum] || "?";
}

function makeCardToken(cardInt, hidden = false) {
  const token = document.createElement("span");
  token.className = `card-token${hidden ? " card-token-hidden" : ""}`;

  if (hidden) {
    const backImage = document.createElement("img");
    backImage.className = "card-token-back-image";
    backImage.src = CARD_BACK_IMAGE_PATH;
    backImage.alt = "Hidden card";
    token.appendChild(backImage);
    return token;
  }

  if (cardInt === null || cardInt === undefined) {
    token.textContent = "--";
    return token;
  }

  const { rank, suit } = cardFromInt(cardInt);
  const suitMeta = SUITS[suit] || null;

  const rankNode = document.createElement("span");
  rankNode.textContent = rankNumToText(rank);
  token.appendChild(rankNode);

  const suitNode = document.createElement("span");
  suitNode.textContent = suitMeta ? suitMeta.symbol : "?";
  suitNode.className = `card-suit ${suitMeta ? suitMeta.colorClass : ""}`;
  token.appendChild(suitNode);

  return token;
}

function createDeck() {
  const deck = [];
  for (let cardInt = 0; cardInt < 52; cardInt += 1) {
    deck.push(cardInt);
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function straightHighFromRanks(ranks) {
  const present = Array(15).fill(false);
  ranks.forEach((rank) => {
    present[rank] = true;
  });

  if (present[14]) {
    present[1] = true;
  }

  for (let high = 14; high >= 5; high -= 1) {
    if (present[high] && present[high - 1] && present[high - 2] && present[high - 3] && present[high - 4]) {
      return high;
    }
  }

  return 0;
}

function compareRankVectors(a, b) {
  const maxLength = Math.max(a.length, b.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;

    if (left > right) {
      return 1;
    }
    if (left < right) {
      return -1;
    }
  }
  return 0;
}

function evaluateSevenCards(cards) {
  const rankCounts = Array(15).fill(0);
  const suitsToRanks = [[], [], [], []];

  cards.forEach((cardInt) => {
    const { rank, suit } = cardFromInt(cardInt);
    rankCounts[rank] += 1;
    suitsToRanks[suit].push(rank);
  });

  const distinctRanks = [];
  for (let rank = 14; rank >= 2; rank -= 1) {
    if (rankCounts[rank] > 0) {
      distinctRanks.push(rank);
    }
  }

  let bestStraightFlush = 0;
  let flushRanks = null;

  suitsToRanks.forEach((ranks) => {
    if (ranks.length < 5) {
      return;
    }

    const unique = Array.from(new Set(ranks));
    const sfHigh = straightHighFromRanks(unique);
    if (sfHigh > bestStraightFlush) {
      bestStraightFlush = sfHigh;
    }

    const sorted = ranks.slice().sort((a, b) => b - a);
    if (!flushRanks || compareRankVectors(sorted.slice(0, 5), flushRanks) > 0) {
      flushRanks = sorted.slice(0, 5);
    }
  });

  if (bestStraightFlush > 0) {
    return [8, bestStraightFlush];
  }

  for (let rank = 14; rank >= 2; rank -= 1) {
    if (rankCounts[rank] === 4) {
      const kicker = distinctRanks.find((r) => r !== rank) || 0;
      return [7, rank, kicker];
    }
  }

  const trips = [];
  const pairs = [];
  for (let rank = 14; rank >= 2; rank -= 1) {
    if (rankCounts[rank] >= 3) {
      trips.push(rank);
    }
    if (rankCounts[rank] >= 2) {
      pairs.push(rank);
    }
  }

  if (trips.length > 0) {
    const tripRank = trips[0];
    const pairCandidates = pairs.filter((rank) => rank !== tripRank);
    if (trips.length > 1) {
      pairCandidates.push(trips[1]);
    }

    if (pairCandidates.length > 0) {
      const pairRank = Math.max.apply(null, pairCandidates);
      return [6, tripRank, pairRank];
    }
  }

  if (flushRanks) {
    return [5].concat(flushRanks);
  }

  const straightHigh = straightHighFromRanks(distinctRanks);
  if (straightHigh > 0) {
    return [4, straightHigh];
  }

  if (trips.length > 0) {
    const kickers = distinctRanks.filter((rank) => rank !== trips[0]).slice(0, 2);
    return [3, trips[0]].concat(kickers);
  }

  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kicker = distinctRanks.find((rank) => rank !== highPair && rank !== lowPair) || 0;
    return [2, highPair, lowPair, kicker];
  }

  if (pairs.length === 1) {
    const kickers = distinctRanks.filter((rank) => rank !== pairs[0]).slice(0, 3);
    return [1, pairs[0]].concat(kickers);
  }

  return [0].concat(distinctRanks.slice(0, 5));
}

function normalizedHoleFromInts(cardA, cardB) {
  const a = cardFromInt(cardA);
  const b = cardFromInt(cardB);
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const suited = a.suit === b.suit && high !== low;
  return { card1: high, card2: low, suited };
}

function getPreflopRecommendation(player, hand = null) {
  const hole = normalizedHoleFromInts(player.cards[0], player.cards[1]);
  const key = tableKey(hole.card1, hole.card2, hole.suited);
  const effectivePlayers = hand ? activePlayers(hand).length : trainingState.players;
  const row = getRangeMapForPlayers(effectivePlayers).get(key);
  if (!row) {
    return "Fold";
  }
  return row[player.position] || "Fold";
}

function getPreflopModelValue(player) {
  const hole = normalizedHoleFromInts(player.cards[0], player.cards[1]);
  const key = tableKey(hole.card1, hole.card2, hole.suited);
  const row = buildDirectRangeMap(getActiveBaseRows()).get(key);
  if (!row) {
    return "Fold";
  }
  return row[player.position] || "Fold";
}

function streetLabel(street) {
  if (street === "preflop") {
    return "Pre-Flop";
  }
  return street.charAt(0).toUpperCase() + street.slice(1);
}

function handCategoryLabel(rankVector) {
  if (rankVector[0] === 8 && rankVector[1] === 14) {
    return "Royal Flush";
  }

  const labels = [
    "High Card",
    "Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
  ];

  return labels[rankVector[0]] || "Hand";
}

function describeBoardTexture(boardCards) {
  if (!boardCards || boardCards.length < 3) {
    return "Board texture unavailable.";
  }

  const suitCounts = [0, 0, 0, 0];
  const rankCounts = new Map();
  const ranks = [];

  boardCards.forEach((cardInt) => {
    const { rank, suit } = cardFromInt(cardInt);
    suitCounts[suit] += 1;
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    ranks.push(rank);
  });

  ranks.sort((a, b) => b - a);
  const maxSuit = Math.max.apply(null, suitCounts);
  const paired = Array.from(rankCounts.values()).some((count) => count >= 2);
  const spread = ranks[0] - ranks[ranks.length - 1];

  const suitText = maxSuit >= 4 ? "very wet (strong flush pressure)" : (maxSuit === 3 ? "two-tone" : "rainbow-ish");
  const pairText = paired ? "paired" : "unpaired";
  const connectText = spread <= 5 ? "connected" : "disconnected";

  return `${pairText}, ${connectText}, ${suitText}`;
}

function getSessionStatusText() {
  if (!trainingState.tournamentStacks) {
    return "Not started";
  }

  if (trainingState.tournamentFinished) {
    return trainingState.tournamentResult;
  }

  return `Hand ${trainingState.handsPlayed + 1}`;
}

function positionToSeatMap(players) {
  const map = new Map();
  players.forEach((p, idx) => {
    map.set(p.position, idx);
  });
  return map;
}

function getOrderFromStart(players, startIndex) {
  const order = [];
  for (let i = 0; i < players.length; i += 1) {
    order.push((startIndex + i) % players.length);
  }
  return order;
}

function findStartIndexForStreet(hand) {
  const seatMap = positionToSeatMap(hand.players);

  if (hand.street === "preflop") {
    const bbSeatIndex = seatMap.get("BB");
    const bbIndex = typeof bbSeatIndex === "number" ? bbSeatIndex : 0;
    return hand.players.length > 0 ? (bbIndex + 1) % hand.players.length : 0;
  }

  const buttonSeatIndex = seatMap.get("D");
  const buttonIndex = typeof buttonSeatIndex === "number" ? buttonSeatIndex : 0;
  return hand.players.length > 0 ? (buttonIndex + 1) % hand.players.length : 0;
}

function activePlayers(hand) {
  return hand.players.filter((player) => !player.folded);
}

function randomIntInclusive(min, max) {
  return min + Math.floor(Math.random() * ((max - min) + 1));
}

function getNpcThinkDelayMs() {
  const [min, max] = NPC_ACTION_DELAY_RANGE_MS[trainingState.temperature] || NPC_ACTION_DELAY_RANGE_MS.normal;
  return randomIntInclusive(min, max);
}

function isAllIn(player) {
  return player.chips <= 0;
}

function chipsLabel(value) {
  return String(value);
}

function seatDisplayName(seat) {
  if (seat === trainingState.userSeat) {
    return "You";
  }
  return `Seat ${seat}`;
}

function chipDeltaText(delta) {
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

function pushChipLogEntry(seat, before, after, reason) {
  const delta = after - before;
  if (!trainingState.chipLogBySeat.has(seat)) {
    trainingState.chipLogBySeat.set(seat, []);
  }

  trainingState.chipLogBySeat.get(seat).push({
    seat,
    before,
    after,
    delta,
    reason,
  });
  renderChipTrackingLog();
}

function renderChipTrackingLog() {
  if (!el.chipLogBody) {
    return;
  }

  if (!trainingState.chipLogBySeat.size) {
    el.chipLogBody.textContent = "Session chip tracking will appear here.";
    return;
  }

  el.chipLogBody.innerHTML = "";
  const seats = Array.from(trainingState.chipLogBySeat.keys()).sort((a, b) => a - b);
  seats.forEach((seat) => {
    const entries = trainingState.chipLogBySeat.get(seat) || [];
    const latest = entries.length ? entries[entries.length - 1] : null;

    const playerBlock = document.createElement("article");
    playerBlock.className = "training-chip-player-block";

    const heading = document.createElement("h3");
    heading.className = "training-chip-player-heading";
    heading.textContent = `${seatDisplayName(seat)} - Current: ${latest ? chipsLabel(latest.after) : "-"}`;

    const history = document.createElement("div");
    history.className = "training-chip-player-history";

    entries
      .slice()
      .reverse()
      .forEach((entry) => {
        const row = document.createElement("div");
        row.className = `training-chip-log-entry ${entry.delta > 0 ? "plus" : (entry.delta < 0 ? "minus" : "start")}`;

        const headline = document.createElement("p");
        headline.className = "training-chip-log-entry-headline";
        headline.textContent = `${chipsLabel(entry.before)} -> ${chipsLabel(entry.after)} (${chipDeltaText(entry.delta)})`;

        const detail = document.createElement("p");
        detail.className = "training-chip-log-entry-detail";
        detail.textContent = entry.reason;

        row.appendChild(headline);
        row.appendChild(detail);
        history.appendChild(row);
      });

    playerBlock.appendChild(heading);
    playerBlock.appendChild(history);
    el.chipLogBody.appendChild(playerBlock);
  });
}

function initializeChipTrackingSession() {
  const positions = POSITIONS_BY_PLAYERS[trainingState.players] || POSITIONS_BY_PLAYERS[9];
  const startingUserSeat = Math.max(1, positions.indexOf(trainingState.userPosition) + 1);

  trainingState.userSeat = startingUserSeat;
  trainingState.chipLogBySeat = new Map();
  for (let seat = 1; seat <= positions.length; seat += 1) {
    pushChipLogEntry(seat, STARTING_STACK, STARTING_STACK, `Session start stack: ${STARTING_STACK}`);
  }
}

function trackChipDebit(player, amount, reason) {
  const before = player.chips;
  const paid = Math.min(amount, player.chips);
  const after = before - paid;
  if (paid > 0) {
    pushChipLogEntry(player.seat, before, after, reason);
  }
  return paid;
}

function trackChipCredit(player, amount, reason) {
  const before = player.chips;
  const after = before + Math.max(0, amount);
  if (amount > 0) {
    pushChipLogEntry(player.seat, before, after, reason);
  }
  player.chips = after;
}

function addLog(text, type = "info") {
  const row = document.createElement("div");
  row.className = `training-log-entry ${type}`;
  row.textContent = text;
  el.log.prepend(row);
}

function clearSessionReviewLog() {
  trainingState.sessionReviewEntries = [];
  if (!el.sessionLogBody) {
    return;
  }
  el.sessionLogBody.innerHTML = "No completed hands yet in this session.";
}

function appendSessionReviewEntry(hand, winners) {
  if (!el.sessionLogBody || !el.summaryDetails || !el.summaryHeadline) {
    return;
  }

  const winnerText = winners.length > 0
    ? winners.map((winner) => (winner.isUser ? "You" : `Seat ${winner.seat}`)).join(", ")
    : "No winner";

  const entry = document.createElement("article");
  entry.className = "training-session-log-entry";

  const title = document.createElement("h3");
  title.className = "training-session-log-title";
  title.textContent = `Hand ${trainingState.handsPlayed} - ${winnerText}`;
  entry.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "training-session-log-meta";
  meta.textContent = el.summaryHeadline.textContent || "Summary";
  entry.appendChild(meta);

  const details = document.createElement("div");
  details.className = "training-session-log-details";
  details.innerHTML = el.summaryDetails.innerHTML;
  entry.appendChild(details);

  if (el.sessionLogBody.textContent && el.sessionLogBody.textContent.includes("No completed hands yet")) {
    el.sessionLogBody.innerHTML = "";
  }
  el.sessionLogBody.prepend(entry);
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAggressiveTargetBounds(hand, player, toCall) {
  const maxTarget = player.streetBet + player.chips;
  let minTarget;

  if (hand.currentBet <= 0) {
    minTarget = BIG_BLIND;
  } else {
    const fullRaiseSize = Math.max(BIG_BLIND, hand.lastFullRaiseSize || BIG_BLIND);
    minTarget = hand.currentBet + fullRaiseSize;
  }

  if (minTarget > maxTarget) {
    minTarget = maxTarget;
  }

  return { minTarget, maxTarget };
}

function readSelectedAggressiveTarget(minTarget, maxTarget, fallbackTarget) {
  if (!el.betSizeInput) {
    return clampValue(fallbackTarget, 0, maxTarget);
  }

  const parsed = Number(el.betSizeInput.value);
  const value = Number.isFinite(parsed) ? parsed : fallbackTarget;
  return clampValue(Math.round(value), 0, maxTarget);
}

function renderBetSizeTicks(maxTarget = 0) {
  if (!el.betSizeTicks) {
    return;
  }

  el.betSizeTicks.innerHTML = "";

  if (!Number.isFinite(maxTarget) || maxTarget <= 0) {
    return;
  }

  const uniqueValues = new Set();
  const divisions = 5;
  for (let i = 0; i <= divisions; i += 1) {
    uniqueValues.add(Math.round((maxTarget * i) / divisions));
  }

  Array.from(uniqueValues)
    .sort((a, b) => a - b)
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = String(value);
      el.betSizeTicks.appendChild(option);
    });
}

function updateBetSizingControls(disabled = true, maxTarget = 0, suggestedTarget = 0) {
  if (!el.betSizeInput || !el.betSizeRange) {
    return;
  }

  const betSizingWrap = document.getElementById("training-bet-sizing");
  if (betSizingWrap) {
    betSizingWrap.hidden = Boolean(disabled);
  }

  if (disabled || maxTarget <= 0) {
    renderBetSizeTicks(0);
    el.betSizeInput.disabled = true;
    el.betSizeInput.min = "0";
    el.betSizeInput.max = "0";
    el.betSizeInput.value = "0";
    if (el.betSizeSlider) {
      el.betSizeSlider.disabled = true;
      el.betSizeSlider.min = "0";
      el.betSizeSlider.max = "0";
      el.betSizeSlider.value = "0";
    }
    el.betSizeRange.textContent = "Range: -";
    if (el.betSizeCurrent) {
      el.betSizeCurrent.textContent = "Selected: -";
    }
    return;
  }

  const clampedSuggested = clampValue(Math.round(suggestedTarget), 0, maxTarget);
  renderBetSizeTicks(maxTarget);
  el.betSizeInput.disabled = false;
  el.betSizeInput.min = "0";
  el.betSizeInput.max = String(maxTarget);
  el.betSizeInput.value = String(clampedSuggested);
  if (el.betSizeSlider) {
    el.betSizeSlider.disabled = false;
    el.betSizeSlider.min = "0";
    el.betSizeSlider.max = String(maxTarget);
    el.betSizeSlider.value = String(clampedSuggested);
  }
  el.betSizeRange.textContent = `Range: 0 - ${maxTarget}`;
  if (el.betSizeCurrent) {
    el.betSizeCurrent.textContent = `Selected: ${clampedSuggested}`;
  }
}

function syncBetSizeControlsFromSource(value) {
  if (!el.betSizeInput) {
    return;
  }

  const min = Number(el.betSizeInput.min || 0);
  const max = Number(el.betSizeInput.max || 0);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) {
    return;
  }

  const parsed = Number(value);
  const clamped = Number.isFinite(parsed) ? clampValue(Math.round(parsed), min, max) : min;
  el.betSizeInput.value = String(clamped);

  if (el.betSizeSlider) {
    el.betSizeSlider.value = String(clamped);
  }

  if (el.betSizeCurrent) {
    el.betSizeCurrent.textContent = `Selected: ${clamped}`;
  }
}

function updateActionButtons(disabled = true, toCall = 0, raiseTo = 0, minTarget = 0, maxTarget = 0, player = null) {
  const actor = player || (trainingState.hand ? getUserPlayer(trainingState.hand) : null);
  const canAggressive = !disabled && Boolean(actor) && actor.chips > 0;
  const showFold = !disabled && toCall > 0;
  const showCheck = !disabled && toCall <= 0;
  const showCall = !disabled && toCall > 0;
  const showRaise = canAggressive && toCall > 0;
  const showBet = canAggressive && toCall <= 0;
  const canShowSlider = canAggressive && trainingState.betSelectionActive
    && (trainingState.pendingAggressiveAction === "raise" || trainingState.pendingAggressiveAction === "bet");
  const suggestedAmount = actor ? Math.max(0, raiseTo - actor.streetBet) : 0;

  el.foldBtn.hidden = !showFold;
  el.checkBtn.hidden = !showCheck;
  el.callBtn.hidden = !showCall;
  el.raiseBtn.hidden = !showRaise;
  el.betBtn.hidden = !showBet;

  el.foldBtn.disabled = !showFold;
  el.checkBtn.disabled = !showCheck;
  el.callBtn.disabled = !showCall;
  el.raiseBtn.disabled = !showRaise;
  el.betBtn.disabled = !showBet;

  el.callBtn.textContent = `Call ${toCall}`;
  el.raiseBtn.textContent = trainingState.betSelectionActive && trainingState.pendingAggressiveAction === "raise"
    ? "Confirm Raise"
    : "Raise";
  el.betBtn.textContent = trainingState.betSelectionActive && trainingState.pendingAggressiveAction === "bet"
    ? "Confirm Bet"
    : "Bet";

  updateBetSizingControls(!canShowSlider, actor ? actor.chips : 0, suggestedAmount);
}

function renderBoard(hand) {
  el.board.innerHTML = "";

  const revealedBoard = hand ? hand.board : [];

  revealedBoard.forEach((cardInt) => {
    el.board.appendChild(makeCardToken(cardInt));
  });

  const unrevealedCount = Math.max(0, 5 - revealedBoard.length);
  for (let i = 0; i < unrevealedCount; i += 1) {
    el.board.appendChild(makeCardToken(null, true));
  }
}

function renderTable(hand, userEquity = null) {
  el.tableBody.innerHTML = "";

  if (!hand) {
    if (el.oddsResultsHeader) {
      el.oddsResultsHeader.textContent = "Odds";
    }
    return;
  }

  const showResults = Boolean(trainingState.showdownRevealed && hand.board.length === 5);
  if (el.oddsResultsHeader) {
    el.oddsResultsHeader.textContent = showResults ? "Results" : "Odds";
  }

  const buildMobileLabel = (labelText) => {
    const label = document.createElement("span");
    label.className = "training-mobile-field-label";
    label.textContent = labelText;
    return label;
  };

  const buildMobileValue = (valueText) => {
    const value = document.createElement("span");
    value.className = "training-mobile-field-value";
    value.textContent = valueText;
    return value;
  };

  hand.players.forEach((player) => {
    const row = document.createElement("tr");
    if (player.isUser) {
      row.className = "training-user-row";
    }
    if (player.folded) {
      row.classList.add("training-folded-row");
    }
    if (hand.pendingSeat === player.seat) {
      row.classList.add("training-pending-row");
    }

    const seatCell = document.createElement("td");
    seatCell.className = "col-seat";
    seatCell.dataset.label = "Seat";
    seatCell.appendChild(buildMobileLabel("Seat"));
    seatCell.appendChild(buildMobileValue(player.isUser ? `${player.seat} (You)` : String(player.seat)));

    const posCell = document.createElement("td");
    posCell.className = "col-position";
    posCell.dataset.label = "Pos";
    posCell.appendChild(buildMobileLabel("Pos"));
    posCell.appendChild(buildMobileValue(player.position));

    const cardsCell = document.createElement("td");
    cardsCell.className = "col-cards";
    cardsCell.dataset.label = "Cards";
    cardsCell.appendChild(buildMobileLabel("Cards"));

    const cardsValue = document.createElement("div");
    cardsValue.className = "results-hand-cell training-mobile-field-value";

    const showRealCards = player.isUser || trainingState.showdownRevealed;
    cardsValue.appendChild(makeCardToken(player.cards[0], !showRealCards));
    cardsValue.appendChild(makeCardToken(player.cards[1], !showRealCards));
    cardsCell.appendChild(cardsValue);

    const oddsCell = document.createElement("td");
    oddsCell.className = "col-odds";
    oddsCell.dataset.label = showResults ? "Results" : "Odds";
    oddsCell.appendChild(buildMobileLabel(showResults ? "Results" : "Odds"));
    let oddsOrResultValue = "-";

    if (showResults) {
      if (player.folded) {
        oddsOrResultValue = "Folded";
      } else {
        const rankVector = evaluateSevenCards([player.cards[0], player.cards[1]].concat(hand.board));
        oddsOrResultValue = handCategoryLabel(rankVector);
      }
    } else if (player.isUser && userEquity !== null) {
      oddsOrResultValue = `${(userEquity * 100).toFixed(1)}%`;
    }

    oddsCell.appendChild(buildMobileValue(oddsOrResultValue));

    const stackCell = document.createElement("td");
    stackCell.className = "col-stack";
    stackCell.dataset.label = "Chips";
    stackCell.appendChild(buildMobileLabel("Chips"));
    stackCell.appendChild(buildMobileValue(chipsLabel(player.chips)));

    const statusCell = document.createElement("td");
    statusCell.className = "col-status";
    statusCell.dataset.label = "Status";
    statusCell.appendChild(buildMobileLabel("Status"));
    statusCell.appendChild(buildMobileValue(player.eliminated ? "Eliminated" : (player.folded ? "Folded" : (isAllIn(player) ? "All-In" : "Active"))));

    const streetBetCell = document.createElement("td");
    streetBetCell.className = "col-bet";
    streetBetCell.dataset.label = "Bet";
    streetBetCell.appendChild(buildMobileLabel("Bet"));
    const playerThinking = hand.thinkingSeat === player.seat;
    streetBetCell.appendChild(buildMobileValue(playerThinking ? "Thinking" : String(player.streetBet)));

    const actionCell = document.createElement("td");
    actionCell.className = "col-action";
    actionCell.dataset.label = "Action";
    actionCell.appendChild(buildMobileLabel("Action"));
    actionCell.appendChild(buildMobileValue(player.lastAction || "-"));

    row.appendChild(seatCell);
    row.appendChild(posCell);
    row.appendChild(cardsCell);
    row.appendChild(oddsCell);
    row.appendChild(stackCell);
    row.appendChild(statusCell);
    row.appendChild(streetBetCell);
    row.appendChild(actionCell);
    el.tableBody.appendChild(row);
  });
}

function renderStatus(hand, equity = null, recommendation = "-", analysis = "-") {
  if (el.session) {
    el.session.textContent = getSessionStatusText();
  }
  const handResultText = trainingState.handResultMessage || "-";
  const canQuickApplyRecommendation = Boolean(
    trainingState.waitingForUser
    && trainingState.pendingRecommendationAction
    && hand
    && hand.actionOn === "You"
    && recommendation
    && recommendation !== "-"
  );

  if (!hand) {
    if (el.street) {
      el.street.textContent = "-";
    }
    if (el.pot) {
      el.pot.textContent = "-";
    }
    if (el.playersInHand) {
      el.playersInHand.textContent = "-";
    }
    if (el.odds) {
      el.odds.textContent = "-";
    }
    if (el.recommendation) {
      el.recommendation.textContent = "-";
      el.recommendation.className = "value training-status-value training-reco-value";
      el.recommendation.removeAttribute("role");
      el.recommendation.removeAttribute("tabindex");
      el.recommendation.removeAttribute("title");
    }
    if (el.recommendationAnalysis) {
      el.recommendationAnalysis.textContent = "-";
    }
    if (el.actionOn) {
      el.actionOn.textContent = "-";
    }
    if (el.handResult) {
      el.handResult.textContent = handResultText;
    }
    return;
  }

  if (el.street) {
    el.street.textContent = streetLabel(hand.street);
  }
  if (el.pot) {
    el.pot.textContent = chipsLabel(hand.pot);
  }
  if (el.playersInHand) {
    el.playersInHand.textContent = String(activePlayers(hand).length);
  }
  if (el.odds) {
    el.odds.textContent = equity === null ? "-" : `${(equity * 100).toFixed(1)}%`;
  }
  if (el.recommendation) {
    el.recommendation.textContent = recommendation;
    el.recommendation.className = `value training-status-value training-reco-value ${normalizedAction(recommendation)}${canQuickApplyRecommendation ? " clickable" : ""}`;
    if (canQuickApplyRecommendation) {
      el.recommendation.setAttribute("role", "button");
      el.recommendation.setAttribute("tabindex", "0");
      el.recommendation.setAttribute("title", "Click to apply recommended action");
    } else {
      el.recommendation.removeAttribute("role");
      el.recommendation.removeAttribute("tabindex");
      el.recommendation.removeAttribute("title");
    }
  }
  if (el.recommendationAnalysis) {
    el.recommendationAnalysis.textContent = analysis || "-";
  }
  if (el.actionOn) {
    el.actionOn.textContent = hand.actionOn || "-";
  }
  if (el.handResult) {
    el.handResult.textContent = handResultText;
  }
}

function renderAll(hand, equity = null, recommendation = "-", analysis = "-") {
  renderStatus(hand, equity, recommendation, analysis);
  renderBoard(hand);
  renderTable(hand, equity);
}

function postChips(hand, player, amount, reason = "Committed chips") {
  const paid = trackChipDebit(player, amount, reason);
  player.chips -= paid;
  player.streetBet += paid;
  player.handContribution += paid;
  hand.pot += paid;
  return paid;
}

function getUserPlayer(hand) {
  return hand.players.find((player) => player.isUser);
}

function sampleFromDeck(deck, count) {
  const copy = deck.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function estimateSeatEquity(hand, seat, trials = 900) {
  const actor = hand.players.find((player) => player.seat === seat && !player.folded);
  if (!actor) {
    return 0;
  }

  const opponents = activePlayers(hand).filter((player) => player.seat !== seat);

  if (opponents.length === 0) {
    return 1;
  }

  const knownCards = new Set([actor.cards[0], actor.cards[1]].concat(hand.board));
  const availableDeck = [];
  for (let cardInt = 0; cardInt < 52; cardInt += 1) {
    if (!knownCards.has(cardInt)) {
      availableDeck.push(cardInt);
    }
  }

  const unknownBoard = 5 - hand.board.length;
  const neededCards = (opponents.length * 2) + unknownBoard;
  let userEquity = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const drawn = sampleFromDeck(availableDeck, neededCards);

    const sampledOpponents = [];
    let cursor = 0;
    for (let i = 0; i < opponents.length; i += 1) {
      sampledOpponents.push([drawn[cursor], drawn[cursor + 1]]);
      cursor += 2;
    }

    const simulatedBoard = hand.board.concat(drawn.slice(cursor, cursor + unknownBoard));
    const actorRank = evaluateSevenCards([actor.cards[0], actor.cards[1]].concat(simulatedBoard));

    const allRanks = [actorRank];
    sampledOpponents.forEach((cards) => {
      allRanks.push(evaluateSevenCards([cards[0], cards[1]].concat(simulatedBoard)));
    });

    let best = allRanks[0];
    for (let i = 1; i < allRanks.length; i += 1) {
      if (compareRankVectors(allRanks[i], best) > 0) {
        best = allRanks[i];
      }
    }

    const winners = [];
    allRanks.forEach((rankVector, idx) => {
      if (compareRankVectors(rankVector, best) === 0) {
        winners.push(idx);
      }
    });

    if (winners.includes(0)) {
      userEquity += 1 / winners.length;
    }
  }

  return userEquity / trials;
}

function recommendationForSituation(hand, player, toCall, equity) {
  if (hand.street === "preflop") {
    const preflop = getPreflopRecommendation(player, hand);
    if (toCall <= 0) {
      return preflop === "Raise" ? "Raise" : "Check";
    }

    if (preflop === "Raise") {
      return hand.currentBet >= (BIG_BLIND * 5) ? "Call" : "Raise";
    }

    if (preflop === "Call") {
      return "Call";
    }

    return "Fold";
  }

  const adjust = Object.prototype.hasOwnProperty.call(TEMPERATURE_POSTFLOP_ADJUST, trainingState.temperature)
    ? TEMPERATURE_POSTFLOP_ADJUST[trainingState.temperature]
    : 0;
  if (toCall <= 0) {
    if (equity >= (0.58 + adjust)) {
      return "Bet";
    }
    return "Check";
  }

  const potOdds = toCall / Math.max(1, (hand.pot + toCall));
  if (equity >= (potOdds + 0.12 + adjust)) {
    return "Raise";
  }
  if (equity >= (potOdds + adjust)) {
    return "Call";
  }
  return "Fold";
}

function normalizedAction(action) {
  const value = typeof action === "object" && action !== null ? action.type : action;
  const raw = String(value || "").toLowerCase();
  if (raw.startsWith("bet")) {
    return "raise";
  }
  if (raw.startsWith("raise")) {
    return "raise";
  }
  if (raw.startsWith("call")) {
    return "call";
  }
  if (raw.startsWith("check")) {
    return "check";
  }
  if (raw.startsWith("fold")) {
    return "fold";
  }
  return "info";
}

function didFollowRecommendation(recommended, taken) {
  return normalizedAction(recommended) === normalizedAction(taken);
}

function calcRaiseTarget(hand, player) {
  let target;
  const fullRaiseSize = Math.max(BIG_BLIND, hand.lastFullRaiseSize || BIG_BLIND);

  if (hand.street === "preflop") {
    const openSizeBb = Object.prototype.hasOwnProperty.call(OPEN_SIZE_BB, player.position)
      ? OPEN_SIZE_BB[player.position]
      : 2.5;
    const openTarget = Math.max(Math.round(openSizeBb * BIG_BLIND), BIG_BLIND * 2);
    if (hand.currentBet <= BIG_BLIND) {
      target = openTarget;
    } else if (hand.currentStreetRaises <= 1) {
      target = Math.max(Math.round((hand.currentBet * 2.8) / BIG_BLIND) * BIG_BLIND, hand.currentBet + fullRaiseSize);
    } else {
      target = Math.max(Math.round((hand.currentBet * 2.3) / BIG_BLIND) * BIG_BLIND, hand.currentBet + fullRaiseSize);
    }
  } else {
    let fraction = hand.street === "flop" ? 0.7 : 0.8;
    if (hand.currentStreetRaises > 0) {
      fraction = 0.6;
    }
    const raw = Math.max(hand.pot * fraction, BIG_BLIND * 2, hand.currentBet + fullRaiseSize);
    target = Math.round(raw / BIG_BLIND) * BIG_BLIND;
  }

  const capped = Math.min(target, player.streetBet + player.chips);
  return Math.max(capped, hand.currentBet);
}

function recommendationText(hand, player, recommendation, toCall) {
  const action = normalizedAction(recommendation);
  if (action !== "raise") {
    return recommendation;
  }

  const target = calcRaiseTarget(hand, player);
  const verb = toCall > 0 ? "Raise" : "Bet";
  return `${verb} to ${target}`;
}

function recommendationReason(hand, player, toCall, equity, recommendation) {
  if (hand.street === "preflop") {
    const modelBase = getPreflopModelValue(player);
    const adjustedBase = getPreflopRecommendation(player, hand);
    const modelValue = String(modelBase || "Fold");
    const modelAction = normalizedAction(modelValue);
    const adjustedAction = normalizedAction(adjustedBase);
    const recommendedAction = normalizedAction(recommendation);
    const effectivePlayers = hand ? activePlayers(hand).length : trainingState.players;
    const contextAdjusted = modelAction !== adjustedAction;

    if (contextAdjusted && adjustedAction === recommendedAction) {
      return `Range Table: ${modelValue}. Adjusted to ${adjustedBase} for current live context (${effectivePlayers} players still active pre-flop at ${trainingState.temperature} temperature).`;
    }

    if (modelAction !== recommendedAction) {
      if (toCall <= 0 && modelAction === "call" && recommendedAction === "check") {
        return `Range Table: ${modelValue}. Adjusted to Check because there is no bet to call.`;
      }

      if (modelAction === "raise" && recommendedAction === "call") {
        return `Range Table: ${modelValue}. Adjusted to Call due to heavy preflop pressure (${hand.currentBet} chips to continue) where pot control is preferred.`;
      }

      return `Range Table: ${modelValue}. Adjusted to ${recommendation} based on current preflop action state (to call ${toCall}, current bet ${hand.currentBet}, ${effectivePlayers} active players).`;
    }

    if (toCall <= 0) {
      return `Range Table: ${modelValue}. Range-driven preflop plan from ${player.position}.`;
    }

    if (modelValue === "Raise") {
      return `Range Table: ${modelValue}. Strong range from ${player.position}; continue aggressively unless facing very large pressure.`;
    }

    if (modelValue === "Call") {
      return `Range Table: ${modelValue}. Marginal continue hand from ${player.position}; call performs better than raising.`;
    }

    return `Range Table: ${modelValue}. Out-of-range continue from ${player.position}; folding preserves chips.`;
  }

  const potOdds = toCall / Math.max(1, (hand.pot + toCall));
  if (toCall <= 0) {
    return `No call required. Equity ${(equity * 100).toFixed(1)}% supports ${recommendation.toLowerCase()} pressure.`;
  }

  return `Pot odds ${(potOdds * 100).toFixed(1)}% vs equity ${(equity * 100).toFixed(1)}% -> ${recommendation.toLowerCase()}.`;
}

function getNpcAction(hand, player, toCall, recommendation, equity) {
  const temp = trainingState.temperature;
  const aggrBias = temp === "aggressive" ? 0.15 : (temp === "conservative" ? -0.12 : 0);
  const posBias = Object.prototype.hasOwnProperty.call(POSITION_AGGRESSION, player.position)
    ? POSITION_AGGRESSION[player.position]
    : 0;
  const totalBias = aggrBias + posBias;
  const recAction = normalizedAction(recommendation);
  const pressure = toCall / Math.max(1, player.chips + player.streetBet);

  if (hand.street === "preflop") {
    if (toCall > 0) {
      if (recAction === "raise" && Math.random() < (0.35 + totalBias)) {
        return "raise";
      }
      if (recAction === "call" || recAction === "raise") {
        return "call";
      }
      return "fold";
    }

    if (recAction === "raise" && Math.random() < (0.5 + totalBias)) {
      return "bet";
    }
    return "check";
  }

  if (toCall > 0) {
    const potOdds = toCall / Math.max(1, (hand.pot + toCall));
    if (equity >= (potOdds + 0.15 - totalBias - (pressure * 0.25)) && Math.random() < (0.48 + totalBias)) {
      return "raise";
    }
    if (equity >= (potOdds - (totalBias * 0.6) - (pressure * 0.15))) {
      return "call";
    }
    return "fold";
  }

  if (equity >= (0.57 - totalBias) && Math.random() < (0.5 + totalBias)) {
    return "bet";
  }

  return "check";
}

function canContinueHand(hand) {
  return activePlayers(hand).length > 1;
}

function settleIfSinglePlayer(hand) {
  const contenders = activePlayers(hand);
  if (contenders.length !== 1) {
    return false;
  }

  const winner = contenders[0];
  trackChipCredit(winner, hand.pot, `Won pot uncontested (${hand.pot})`);
  addLog(`${winner.isUser ? "You" : `Seat ${winner.seat}`} wins ${hand.pot} chips (all others folded).`, "raise");
  hand.pot = 0;
  return true;
}

function resetStreetBets(hand) {
  hand.players.forEach((player) => {
    player.streetBet = 0;
  });
  hand.currentBet = 0;
  hand.currentStreetRaises = 0;
  hand.lastFullRaiseSize = BIG_BLIND;
}

function revealStreetCards(hand) {
  if (hand.deck.length > 0) {
    hand.deck.pop();
  }

  if (hand.street === "flop") {
    hand.board.push(hand.deck.pop(), hand.deck.pop(), hand.deck.pop());
    addLog("Flop dealt.");
    return;
  }

  if (hand.street === "turn") {
    hand.board.push(hand.deck.pop());
    addLog("Turn dealt.");
    return;
  }

  if (hand.street === "river") {
    hand.board.push(hand.deck.pop());
    addLog("River dealt.");
  }
}

function sleep(ms, handId) {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (trainingState.handId !== handId || !trainingState.hand) {
        reject(new Error("HAND_CANCELLED"));
        return;
      }
      resolve();
    }, ms);
  });
}

function applyAction(hand, player, action) {
  const actionType = typeof action === "object" && action !== null ? action.type : action;
  const toCall = Math.max(0, hand.currentBet - player.streetBet);
  const prevCurrentBet = hand.currentBet;

  if (actionType === "fold") {
    player.folded = true;
    player.lastAction = "Fold";
    return { type: "fold", aggressive: false };
  }

  if (actionType === "check") {
    player.lastAction = "Check";
    return { type: "check", aggressive: false };
  }

  if (actionType === "call") {
    const paid = postChips(hand, player, toCall, "Call");
    if (player.chips <= 0) {
      player.lastAction = `Call ${paid} (All-In)`;
    } else {
      player.lastAction = `Call ${paid}`;
    }
    return { type: "call", aggressive: false };
  }

  let targetBet;
  if (typeof action === "object" && action !== null && action.allIn) {
    targetBet = player.streetBet + player.chips;
  } else if (typeof action === "object" && action !== null && Number.isFinite(action.targetBet)) {
    const { minTarget, maxTarget } = getAggressiveTargetBounds(hand, player, toCall);
    targetBet = clampValue(Math.round(action.targetBet), minTarget, maxTarget);
  } else {
    targetBet = calcRaiseTarget(hand, player);
  }

  const toPutIn = Math.max(0, targetBet - player.streetBet);
  const paid = postChips(hand, player, toPutIn, actionType === "bet" ? "Bet" : "Raise");

  if (player.streetBet > prevCurrentBet) {
    const raiseSize = player.streetBet - prevCurrentBet;
    const fullRaiseSize = Math.max(BIG_BLIND, hand.lastFullRaiseSize || BIG_BLIND);
    const reopensAction = raiseSize >= fullRaiseSize;

    hand.currentBet = player.streetBet;
    hand.currentStreetRaises += 1;
    if (reopensAction) {
      hand.lastFullRaiseSize = raiseSize;
    }
    player.lastAction = `${actionType === "bet" ? "Bet" : "Raise"} to ${player.streetBet}${player.chips <= 0 ? " (All-In)" : ""}`;
    return { type: actionType, aggressive: true, reopensAction };
  }

  if (toCall > 0) {
    player.lastAction = `Call ${paid}${player.chips <= 0 ? " (All-In)" : ""}`;
    return { type: "call", aggressive: false };
  }

  player.lastAction = "Check";
  return { type: "check", aggressive: false };
}

function getEligibleSeats(hand, order) {
  return order
    .map((index) => hand.players[index])
    .filter((player) => !player.folded && !isAllIn(player))
    .map((player) => player.seat);
}

function decisionActionLabel(action) {
  const actionType = normalizedAction(action);

  if (actionType === "fold") {
    return "Fold";
  }

  if (actionType === "check") {
    return "Check";
  }

  if (actionType === "call") {
    return "Call";
  }

  if (actionType === "raise" || actionType === "bet") {
    const verb = actionType === "raise" ? "Raise" : "Bet";
    if (typeof action === "object" && action !== null) {
      if (action.allIn) {
        return `${verb} (All-In)`;
      }
      if (Number.isFinite(action.targetBet)) {
        return `${verb} to ${Math.round(action.targetBet)}`;
      }
    }
    return verb;
  }

  return String(action || "-");
}

function buildDecisionRecord(hand, player, recommendationAction, recommendationTextValue, action, toCall, equity, reason) {
  if (!player.isUser) {
    return;
  }

  trainingState.decisionLog.push({
    street: streetLabel(hand.street),
    toCall,
    recommendation: recommendationTextValue,
    action: decisionActionLabel(action),
    equity,
    reason,
    followed: didFollowRecommendation(recommendationAction, action),
  });
}

async function getUserAction(hand, player, toCall, recommendation, equity, recommendationAction = recommendation) {
  return new Promise((resolve) => {
    const raiseTo = calcRaiseTarget(hand, player);
    const { minTarget, maxTarget } = getAggressiveTargetBounds(hand, player, toCall);
    const normalizedRecommendation = normalizedAction(recommendationAction);
    trainingState.betSelectionActive = false;
    trainingState.pendingAggressiveAction = null;
    updateActionButtons(false, toCall, raiseTo, minTarget, maxTarget, player);
    // Hide auto-deal controls (Pause button) when user action is required
    if (typeof updateAutoDealCountdownUi === "function") {
      updateAutoDealCountdownUi();
    }

    trainingState.pendingRecommendationAction = () => {
      if (!trainingState.pendingUserDecision) {
        return;
      }

      if (normalizedRecommendation === "fold") {
        trainingState.pendingUserDecision("fold");
        return;
      }

      if (normalizedRecommendation === "check") {
        trainingState.pendingUserDecision("check");
        return;
      }

      if (normalizedRecommendation === "call") {
        trainingState.pendingUserDecision(toCall > 0 ? "call" : "check");
        return;
      }

      if (normalizedRecommendation === "raise" || normalizedRecommendation === "bet") {
        const targetBet = calcRaiseTarget(hand, player);
        trainingState.pendingUserDecision({
          type: toCall > 0 ? "raise" : "bet",
          targetBet,
        });
        return;
      }

      trainingState.pendingUserDecision(toCall > 0 ? "call" : "check");
    };

    trainingState.waitingForUser = true;
    trainingState.pendingUserDecision = (action) => {
      trainingState.waitingForUser = false;
      trainingState.pendingUserDecision = null;
      trainingState.pendingRecommendationAction = null;
      trainingState.betSelectionActive = false;
      trainingState.pendingAggressiveAction = null;
      updateActionButtons(true, 0, 0, 0, 0);
      resolve(action);
    };

    const equityPct = `${(equity * 100).toFixed(1)}%`;
    const promptText = toCall > 0
      ? `Your turn (${streetLabel(hand.street)}): to call ${toCall}. Equity ${equityPct}. Recommended ${recommendation}.`
      : `Checked to you (${streetLabel(hand.street)}). Equity ${equityPct}. Recommended ${recommendation}.`;
    setPromptMessage(promptText, recommendation);
  });
}

async function runBettingRound(hand, handId) {
  const startIndex = findStartIndexForStreet(hand);
  const order = getOrderFromStart(hand.players, startIndex);
  let pending = new Set(getEligibleSeats(hand, order));
  let pointer = 0;

  while (pending.size > 0 && canContinueHand(hand)) {
    const player = hand.players[order[pointer]];
    pointer = (pointer + 1) % order.length;

    if (!pending.has(player.seat)) {
      continue;
    }

    if (player.folded || isAllIn(player)) {
      pending.delete(player.seat);
      continue;
    }

    const toCall = Math.max(0, hand.currentBet - player.streetBet);
    const user = getUserPlayer(hand);
    const userEquity = user && !user.folded ? estimateSeatEquity(hand, user.seat) : null;
    const actorEquity = estimateSeatEquity(hand, player.seat);
    const recommendation = recommendationForSituation(hand, player, toCall, actorEquity);
    const recommendationTextValue = recommendationText(hand, player, recommendation, toCall);
    const reason = recommendationReason(hand, player, toCall, actorEquity, recommendation);

    hand.actionOn = player.isUser ? "You" : `Seat ${player.seat}`;
    hand.thinkingSeat = player.isUser ? null : player.seat;
    hand.pendingSeat = player.seat;
    renderAll(hand, userEquity, player.isUser ? recommendationTextValue : "-", player.isUser ? reason : "-");

    let action;

    if (player.isUser) {
      action = await getUserAction(hand, player, toCall, recommendationTextValue, actorEquity, recommendation);
      buildDecisionRecord(hand, player, recommendation, recommendationTextValue, action, toCall, actorEquity, reason);
    } else {
      await sleep(getNpcThinkDelayMs(), handId);
      action = getNpcAction(hand, player, toCall, recommendation, actorEquity);
    }

    hand.thinkingSeat = null;
    hand.pendingSeat = null;
    const result = applyAction(hand, player, action);
    addLog(`${player.isUser ? "You" : `Seat ${player.seat}`} ${player.lastAction.toLowerCase()}.`, result.aggressive ? "raise" : "info");

    const updatedUser = getUserPlayer(hand);
    const updatedUserEquity = updatedUser && !updatedUser.folded ? estimateSeatEquity(hand, updatedUser.seat) : null;
    renderAll(hand, updatedUserEquity, "-", "-");

    if (!canContinueHand(hand)) {
      break;
    }

    if (result.reopensAction) {
      pending = new Set(getEligibleSeats(hand, order).filter((seat) => seat !== player.seat));
      continue;
    }

    pending.delete(player.seat);
  }

  hand.thinkingSeat = null;
  hand.pendingSeat = null;
  updateActionButtons(true, 0, 0, 0, 0);
}

function payoutShowdown(hand) {
  const contributions = hand.players
    .map((player) => player.handContribution)
    .filter((amount) => amount > 0)
    .sort((a, b) => a - b);
  const uniqueLevels = Array.from(new Set(contributions));
  const payoutsBySeat = new Map();
  hand.players.forEach((player) => payoutsBySeat.set(player.seat, 0));

  if (uniqueLevels.length === 0) {
    return {
      paidWinners: [],
      payoutsBySeat,
      sidePotResults: [],
    };
  }

  const rankBySeat = new Map();
  hand.players.forEach((player) => {
    if (!player.folded) {
      rankBySeat.set(player.seat, evaluateSevenCards([player.cards[0], player.cards[1]].concat(hand.board)));
    }
  });

  const sidePotResults = [];

  const buttonSeatIndex = hand.players.findIndex((player) => player.position === "D");
  const firstSeatIndex = buttonSeatIndex >= 0 ? (buttonSeatIndex + 1) % hand.players.length : 0;

  const oddChipWinnerOrder = (winners) => {
    const winnerSeats = new Set(winners.map((winner) => winner.seat));
    const ordered = [];

    for (let i = 0; i < hand.players.length; i += 1) {
      const seatIndex = (firstSeatIndex + i) % hand.players.length;
      const seatPlayer = hand.players[seatIndex];
      if (winnerSeats.has(seatPlayer.seat)) {
        ordered.push(seatPlayer);
      }
    }

    return ordered.length > 0 ? ordered : winners;
  };

  let previousLevel = 0;

  uniqueLevels.forEach((level) => {
    const contributors = hand.players.filter((player) => player.handContribution >= level);
    const sidePot = (level - previousLevel) * contributors.length;
    previousLevel = level;

    if (sidePot <= 0) {
      return;
    }

    const contenders = contributors.filter((player) => !player.folded);
    if (contenders.length === 0) {
      return;
    }

    let bestRank = null;
    let winners = [];

    contenders.forEach((player) => {
      const rankVector = rankBySeat.get(player.seat);
      if (!bestRank || compareRankVectors(rankVector, bestRank) > 0) {
        bestRank = rankVector;
        winners = [player];
        return;
      }

      if (compareRankVectors(rankVector, bestRank) === 0) {
        winners.push(player);
      }
    });

    const share = Math.floor(sidePot / winners.length);
    const remainder = sidePot - (share * winners.length);

    winners.forEach((winner) => {
      const current = payoutsBySeat.get(winner.seat) || 0;
      payoutsBySeat.set(winner.seat, current + share);
    });

    if (remainder > 0) {
      const orderedWinners = oddChipWinnerOrder(winners);
      for (let i = 0; i < remainder; i += 1) {
        const winner = orderedWinners[i % orderedWinners.length];
        const current = payoutsBySeat.get(winner.seat) || 0;
        payoutsBySeat.set(winner.seat, current + 1);
      }
    }

    sidePotResults.push({
      amount: sidePot,
      winnerSeats: winners.map((winner) => winner.seat),
    });
  });

  const paidWinners = hand.players.filter((player) => (payoutsBySeat.get(player.seat) || 0) > 0);
  paidWinners.forEach((winner) => {
    const payout = payoutsBySeat.get(winner.seat) || 0;
    trackChipCredit(winner, payout, `Showdown payout (${payout})`);
  });

  hand.pot = 0;
  return {
    paidWinners,
    payoutsBySeat,
    sidePotResults,
  };
}

function buildAdviceLine(item) {
  const recommended = normalizedAction(item.recommendation);
  const taken = normalizedAction(item.action);

  if (recommended === "fold" && taken !== "fold") {
    return `${item.street}: prioritize discipline in negative-EV spots and release marginal hands earlier.`;
  }

  if ((recommended === "raise" || recommended === "bet") && !(taken === "raise" || taken === "bet")) {
    return `${item.street}: look for more value or pressure when your equity supports aggressive action.`;
  }

  if ((recommended === "call" || recommended === "check") && (taken === "raise" || taken === "bet")) {
    return `${item.street}: avoid over-aggression when pot odds and equity favor pot control.`;
  }

  return `${item.street}: align decisions more tightly with equity and pot-odds thresholds.`;
}

function renderSummary(hand, winners) {
  const resolvedWinners = Array.isArray(winners) && winners.length > 0
    ? winners
    : activePlayers(hand);

  const followed = trainingState.decisionLog.filter((item) => item.followed).length;
  const total = trainingState.decisionLog.length;
  const missed = total - followed;

  const winnerText = resolvedWinners.length > 0
    ? resolvedWinners.map((winner) => (winner.isUser ? "You" : `Seat ${winner.seat}`)).join(", ")
    : "No winner";
  el.summaryHeadline.textContent = `${winnerText} won the hand.`;

  el.summaryDetails.innerHTML = "";

  const user = getUserPlayer(hand);
  const userEndChips = user ? user.chips : 0;
  const stackDelta = userEndChips - hand.userStartChips;
  const texture = describeBoardTexture(hand.board);

  const result = document.createElement("p");
  result.textContent = `You started this hand with ${hand.userStartChips} chips and finished with ${userEndChips} (${stackDelta >= 0 ? "+" : ""}${stackDelta}).`;
  el.summaryDetails.appendChild(result);

  const board = document.createElement("p");
  board.textContent = `Board texture: ${texture}`;
  el.summaryDetails.appendChild(board);

  if (hand.finishedByFold) {
    const foldOutcome = document.createElement("p");
    foldOutcome.textContent = "Outcome driver: hand ended before showdown due to fold pressure and stack leverage.";
    el.summaryDetails.appendChild(foldOutcome);
  } else {
    if (resolvedWinners.length > 0) {
      const winnerHand = evaluateSevenCards([resolvedWinners[0].cards[0], resolvedWinners[0].cards[1]].concat(hand.board));
      const winnerHandLabel = handCategoryLabel(winnerHand);
      const showdownNote = document.createElement("p");
      showdownNote.textContent = `Outcome driver: showdown resolved by best made hand (${winnerHandLabel}).`;
      el.summaryDetails.appendChild(showdownNote);
    }

    if (user && !user.folded) {
      const userHandLabel = handCategoryLabel(evaluateSevenCards([user.cards[0], user.cards[1]].concat(hand.board)));
      const userShowdown = document.createElement("p");
      userShowdown.textContent = `Your showdown hand: ${userHandLabel}.`;
      el.summaryDetails.appendChild(userShowdown);
    }

    const breakdownHeading = document.createElement("p");
    breakdownHeading.className = "summary-breakdown-title";
    breakdownHeading.textContent = "Showdown Breakdown:";
    el.summaryDetails.appendChild(breakdownHeading);

    const sidePotResults = Array.isArray(hand.showdownSidePotResults) ? hand.showdownSidePotResults : [];
    if (sidePotResults.length > 0) {
      sidePotResults.forEach((pot, idx) => {
        const winnerText = (pot.winnerSeats || [])
          .map((seat) => (seat === trainingState.userSeat ? "You" : `Seat ${seat}`))
          .join(", ");

        const line = document.createElement("p");
        line.className = "summary-breakdown-line";
        line.textContent = `Pot ${idx + 1}: ${pot.amount} chips -> ${winnerText || "No winner"}`;
        el.summaryDetails.appendChild(line);
      });
    } else {
      const noPot = document.createElement("p");
      noPot.className = "summary-breakdown-line";
      noPot.textContent = "Pot details unavailable for this showdown.";
      el.summaryDetails.appendChild(noPot);
    }

    const payoutMap = hand.showdownPayouts instanceof Map ? hand.showdownPayouts : new Map();
    const payoutRows = hand.players
      .map((player) => ({
        player,
        payout: payoutMap.get(player.seat) || 0,
      }))
      .filter((item) => item.payout > 0)
      .sort((a, b) => b.payout - a.payout);

    if (payoutRows.length > 0) {
      payoutRows.forEach((item) => {
        const payoutLine = document.createElement("p");
        payoutLine.className = "summary-breakdown-line";
        payoutLine.textContent = `${item.player.isUser ? "You" : `Seat ${item.player.seat}`}: +${item.payout}`;
        el.summaryDetails.appendChild(payoutLine);
      });
    }
  }

  const score = document.createElement("p");
  score.textContent = `Decision quality: followed ${followed} of ${total} recommendations (${missed} deviations).`;
  el.summaryDetails.appendChild(score);

  const missedItems = trainingState.decisionLog.filter((item) => !item.followed);
  const advice = document.createElement("p");
  if (missedItems.length === 0) {
    advice.textContent = "Advice: strong strategic discipline this hand. Keep applying pressure in high-equity spots and preserve chips in marginal spots.";
  } else {
    const adviceLines = missedItems.slice(0, 3).map(buildAdviceLine).join(" ");
    advice.textContent = `Advice: ${adviceLines}`;
  }
  el.summaryDetails.appendChild(advice);

  trainingState.decisionLog.forEach((item, idx) => {
    const row = document.createElement("p");
    row.className = item.followed ? "summary-good" : "summary-missed";
    row.textContent = `${idx + 1}. ${item.street} | Equity ${(item.equity * 100).toFixed(1)}% | Recommended ${item.recommendation} | You ${item.action}${item.followed ? "" : " (missed)"} | Why: ${item.reason}`;
    el.summaryDetails.appendChild(row);
  });

  if (total === 0) {
    const none = document.createElement("p");
    none.textContent = "No user decisions were recorded in this hand.";
    el.summaryDetails.appendChild(none);
  }

  el.summary.hidden = false;
  appendSessionReviewEntry(hand, resolvedWinners);
}

function setInitialPrompt() {
  setPromptMessage("Start a hand to begin training. Chip stacks persist across hands until the session ends.");
}

function resetTrainingStateVisuals() {
  renderAll(null);
  updateActionButtons(true, 0, 0);
  el.log.innerHTML = "";
  el.summary.hidden = true;
  el.summaryHeadline.textContent = "-";
  el.summaryDetails.innerHTML = "";
  clearSessionReviewLog();
  trainingState.handResultMessage = "-";
  setInitialPrompt();
}

function initializeTournament() {
  const positions = POSITIONS_BY_PLAYERS[trainingState.players] || POSITIONS_BY_PLAYERS[9];
  const startingUserSeat = Math.max(1, positions.indexOf(trainingState.userPosition) + 1);
  trainingState.tournamentStacks = new Map();
  for (let seat = 1; seat <= positions.length; seat += 1) {
    trainingState.tournamentStacks.set(seat, STARTING_STACK);
  }
  trainingState.userSeat = startingUserSeat;
  trainingState.userPosition = positions[startingUserSeat - 1] || trainingState.userPosition;
  trainingState.betSelectionActive = false;
  trainingState.tournamentTotalChips = positions.length * STARTING_STACK;
  trainingState.handsPlayed = 0;
  trainingState.tournamentFinished = false;
  trainingState.tournamentResult = "";
  trainingState.handResultMessage = "-";
  initializeChipTrackingSession();
}

function persistTournamentStacks(hand) {
  if (!trainingState.tournamentStacks) {
    return;
  }

  hand.players.forEach((player) => {
    trainingState.tournamentStacks.set(player.seat, player.chips);
  });
}

function evaluateTournamentCompletion() {
  const stacks = trainingState.tournamentStacks;
  if (!stacks) {
    return false;
  }

  const userChips = stacks.get(trainingState.userSeat) || 0;
  const active = Array.from(stacks.values()).filter((chips) => chips > 0).length;

  if (userChips <= 0) {
    trainingState.tournamentFinished = true;
    trainingState.tournamentResult = "Session Lost";
    return true;
  }

  if (userChips >= trainingState.tournamentTotalChips || active <= 1) {
    trainingState.tournamentFinished = true;
    trainingState.tournamentResult = "Session Won";
    return true;
  }

  return false;
}

function clearTournamentProgress() {
  trainingState.tournamentStacks = null;
  trainingState.tournamentTotalChips = 0;
  trainingState.handsPlayed = 0;
  trainingState.tournamentFinished = false;
  trainingState.tournamentResult = "";
  trainingState.userSeat = null;
  trainingState.handResultMessage = "-";
}

function createHand() {
  const configuredPositions = POSITIONS_BY_PLAYERS[trainingState.players] || POSITIONS_BY_PLAYERS[9];
  const deck = shuffle(createDeck());

  if (!trainingState.tournamentStacks) {
    el.log.innerHTML = "";
    el.summary.hidden = true;
    el.summaryHeadline.textContent = "-";
    el.summaryDetails.innerHTML = "";
    clearSessionReviewLog();
    initializeTournament();
  }

  const activeSeats = Array.from(trainingState.tournamentStacks.entries())
    .filter(([, chips]) => chips > 0)
    .map(([seat]) => seat)
    .sort((a, b) => a - b);
  const activeCount = activeSeats.length;
  const activePositions = POSITIONS_BY_PLAYERS[activeCount] || configuredPositions;
  const handOffset = activeCount > 0 ? (trainingState.handsPlayed % activeCount) : 0;

  const players = activeSeats.map((seat, idx) => {
    const position = activePositions[(idx + handOffset) % activePositions.length];
    return {
      chips: trainingState.tournamentStacks.get(seat) || 0,
      inHand: true,
      seat,
      position,
      isUser: seat === trainingState.userSeat,
      cards: [deck.pop(), deck.pop()],
      folded: false,
      eliminated: false,
      streetBet: 0,
      handContribution: 0,
      lastAction: "-",
    };
  });

  const userPlayer = players.find((player) => player.isUser);
  if (userPlayer) {
    trainingState.userPosition = userPlayer.position;
  }
  const userStartChips = userPlayer ? userPlayer.chips : 0;

  return {
    deck,
    players,
    board: [],
    street: "preflop",
    currentBet: BIG_BLIND,
    currentStreetRaises: 0,
    lastFullRaiseSize: BIG_BLIND,
    pot: 0,
    actionOn: "-",
    thinkingSeat: null,
    pendingSeat: null,
    finishedByFold: false,
    showdownPayouts: null,
    showdownSidePotResults: [],
    userStartChips,
  };
}

function postBlinds(hand) {
  const seatMap = positionToSeatMap(hand.players);
  let sb = hand.players[seatMap.get("SB")];
  let bb = hand.players[seatMap.get("BB")];

  if (!bb && hand.players.length >= 1) {
    bb = hand.players[0];
  }

  if (!bb) {
    return;
  }

  const sbPaid = sb && sb.chips > 0 ? postChips(hand, sb, SMALL_BLIND, "Posted small blind") : 0;
  const bbPaid = bb.chips > 0 ? postChips(hand, bb, BIG_BLIND, "Posted big blind") : 0;

  hand.currentBet = Math.max(
    sb ? sb.streetBet : 0,
    bb ? bb.streetBet : 0,
    0,
  );

  if (sb) {
    sb.lastAction = sbPaid > 0 ? `Post SB ${sbPaid}` : "Out";
  }
  bb.lastAction = bbPaid > 0 ? `Post BB ${bbPaid}` : "Out";

  if (sb && sbPaid > 0) {
    addLog(`Seat ${sb.seat} posts small blind ${sbPaid}.`);
  }
  if (bbPaid > 0) {
    addLog(`Seat ${bb.seat} posts big blind ${bbPaid}.`);
  }
}

async function playHand(handId) {
  try {
    const hand = trainingState.hand;
    postBlinds(hand);
    const user = getUserPlayer(hand);
    renderAll(hand, user ? estimateSeatEquity(hand, user.seat) : null, "-", "-");

    for (let streetIndex = 0; streetIndex < STREETS.length; streetIndex += 1) {
      hand.street = STREETS[streetIndex];

      if (streetIndex > 0) {
        resetStreetBets(hand);
        revealStreetCards(hand);
      }

      const actingUser = getUserPlayer(hand);
      if (!actingUser || actingUser.folded) {
        break;
      }

      const equity = estimateSeatEquity(hand, actingUser.seat);
      const recommendation = recommendationForSituation(hand, actingUser, 0, equity);
      const recommendationTextValue = recommendationText(hand, actingUser, recommendation, 0);
      const reason = recommendationReason(hand, actingUser, 0, equity, recommendation);
      renderAll(hand, equity, recommendationTextValue, reason);
      addLog(`${streetLabel(hand.street)} started. User equity ${(equity * 100).toFixed(1)}%. Recommendation: ${recommendationTextValue}.`);

      await runBettingRound(hand, handId);

      if (settleIfSinglePlayer(hand)) {
        hand.finishedByFold = true;
        break;
      }
    }

    if (trainingState.handId !== handId || !trainingState.hand) {
      return;
    }

    trainingState.showdownRevealed = true;

    let winners;
    if (trainingState.hand.finishedByFold) {
      winners = activePlayers(trainingState.hand);
    } else {
      const showdown = payoutShowdown(trainingState.hand);
      winners = showdown.paidWinners;

      const payoutPairs = winners.map((winner) => {
        const payout = showdown.payoutsBySeat.get(winner.seat) || 0;
        const seatText = winner.isUser ? "You" : `Seat ${winner.seat}`;
        return `${seatText} +${payout}`;
      });

      const winnerText = winners.map((winner) => (winner.isUser ? "You" : `Seat ${winner.seat}`)).join(", ");
      addLog(`Showdown complete. Winners: ${winnerText}. Payouts: ${payoutPairs.join(" | ")}.`, "raise");

      trainingState.hand.showdownPayouts = showdown.payoutsBySeat;
      trainingState.hand.showdownSidePotResults = showdown.sidePotResults;
    }

    const handWinnerText = winners.map((winner) => (winner.isUser ? "You" : `Seat ${winner.seat}`)).join(", ");
    if (trainingState.hand.finishedByFold) {
      trainingState.handResultMessage = `${handWinnerText} won the hand by fold.`;
    } else {
      const winnerRankVector = evaluateSevenCards([winners[0].cards[0], winners[0].cards[1]].concat(trainingState.hand.board));
      const winnerHandLabel = handCategoryLabel(winnerRankVector).toLowerCase();
      const article = /^[aeiou]/.test(winnerHandLabel) ? "an" : "a";

      const payoutMap = trainingState.hand.showdownPayouts || new Map();
      const payoutValues = winners.map((winner) => payoutMap.get(winner.seat) || 0);
      const equalSplit = payoutValues.length > 1 && payoutValues.every((amount) => amount === payoutValues[0]);

      if (winners.length > 1 && equalSplit) {
        trainingState.handResultMessage = `${handWinnerText} split the pot with ${article} ${winnerHandLabel}.`;
      } else if (winners.length > 1) {
        const payoutText = winners
          .map((winner) => `${winner.isUser ? "You" : `Seat ${winner.seat}`} +${payoutMap.get(winner.seat) || 0}`)
          .join(", ");
        trainingState.handResultMessage = `${handWinnerText} won side pots with ${article} ${winnerHandLabel}. Payouts: ${payoutText}.`;
      } else {
        trainingState.handResultMessage = `${handWinnerText} won the hand with ${article} ${winnerHandLabel}.`;
      }
    }

    const finalUser = getUserPlayer(trainingState.hand);
    const finalEquity = finalUser && !finalUser.folded ? estimateSeatEquity(trainingState.hand, finalUser.seat) : null;
    renderAll(trainingState.hand, finalEquity, "Hand complete", "Review the hand log and summary for street-by-street rationale.");
    persistTournamentStacks(trainingState.hand);
    trainingState.handsPlayed += 1;
    const sessionDone = evaluateTournamentCompletion();
    renderSummary(trainingState.hand, winners);

    if (sessionDone) {
      clearAutoDealTimer();
      setPromptMessage(`${trainingState.tournamentResult}. Click Reset to start a new session.`);
      el.startButton.disabled = true;
    } else {
      clearAutoDealTimer();
      if (trainingState.autoDealEnabled) {
        setPromptMessage("Hand complete. Auto-deal is on.");
        startAutoDealCountdown(10);
      } else {
        setPromptMessage("Hand complete. Click Deal to continue the session with current chip stacks.");
      }
      el.startButton.disabled = false;
    }
  } catch (error) {
    if (error && error.message === "HAND_CANCELLED") {
      return;
    }

    console.error(error);
    setPromptMessage("Training hand stopped due to an unexpected error.");
  } finally {
    updateActionButtons(true, 0, 0);
    trainingState.waitingForUser = false;
    trainingState.pendingUserDecision = null;
    trainingState.pendingRecommendationAction = null;
    trainingState.betSelectionActive = false;
    trainingState.pendingAggressiveAction = null;
    el.startButton.disabled = trainingState.tournamentFinished;
  }
}

function renderSelectionButton(grid, label, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `select-btn${active ? " active" : ""}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  grid.appendChild(button);
}

function renderSelectors() {
  el.playersGrid.innerHTML = "";
  PLAYER_COUNTS.forEach((count) => {
    renderSelectionButton(el.playersGrid, String(count), trainingState.players === count, () => {
      trainingState.players = count;
      applySettingsChange();
      const availablePositions = getActivePositions();
      if (!availablePositions.includes(trainingState.userPosition)) {
        trainingState.userPosition = null;
      }
      renderSelectors();
    });
  });

  el.temperatureGrid.innerHTML = "";
  TABLE_TEMPERATURES.forEach((temperature) => {
    renderSelectionButton(el.temperatureGrid, temperature.label, trainingState.temperature === temperature.key, () => {
      trainingState.temperature = temperature.key;
      applySettingsChange();
      renderSelectors();
    });
  });

  el.positionGrid.innerHTML = "";
  getActivePositions().forEach((position) => {
    renderSelectionButton(el.positionGrid, position, trainingState.userPosition === position, () => {
      trainingState.userPosition = position;
      applySettingsChange();
      renderSelectors();
    });
  });

  if (el.gameTypeGrid) {
    el.gameTypeGrid.innerHTML = "";
    GAME_TYPES.forEach((gameType) => {
      renderSelectionButton(el.gameTypeGrid, gameType.label, trainingState.gameType === gameType.key, () => {
        trainingState.gameType = gameType.key;
        applySettingsChange();
        renderSelectors();
      });
    });
  }
}

function applySettingsChange() {
  clearAutoDealTimer();
  trainingState.handId += 1;
  trainingState.hand = null;
  trainingState.showdownRevealed = false;
  trainingState.waitingForUser = false;
  trainingState.pendingUserDecision = null;
  trainingState.pendingRecommendationAction = null;
  trainingState.betSelectionActive = false;
  trainingState.pendingAggressiveAction = null;
  clearTournamentProgress();
  initializeChipTrackingSession();
  el.startButton.disabled = false;
  resetTrainingStateVisuals();
}

async function loadRanges() {
  const loadRangeFile = async (filePath) => {
    const response = await fetch(encodeURI(filePath));
    if (!response.ok) {
      throw new Error(`Unable to load ${filePath}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`Range file is empty or invalid: ${filePath}`);
    }

    return rows;
  };

  const fallbackRows = await loadRangeFile(DEFAULT_RANGE_FILE);

  let cashRows = fallbackRows;
  let tournamentRows = fallbackRows;

  try {
    cashRows = await loadRangeFile(CASH_RANGE_FILE);
  } catch (error) {
    console.warn("Cash ranges file unavailable, using default ranges.json", error);
  }

  try {
    tournamentRows = await loadRangeFile(TOURNAMENT_RANGE_FILE);
  } catch (error) {
    console.warn("Tournament ranges file unavailable, using default ranges.json", error);
  }

  trainingState.baseRowsByGameType.cash = cashRows;
  trainingState.baseRowsByGameType.tournament = tournamentRows;
  trainingState.thresholds = buildPositionThresholds(getActiveBaseRows());
  trainingState.rangesLoaded = true;
  trainingState.rangeMapsByContext.clear();
}

function resetHand() {
  clearAutoDealTimer();
  trainingState.handId += 1;
  trainingState.hand = null;
  trainingState.showdownRevealed = false;
  trainingState.decisionLog = [];
  clearTournamentProgress();
  initializeTournament();
  trainingState.waitingForUser = false;
  trainingState.pendingUserDecision = null;
  trainingState.pendingRecommendationAction = null;
  trainingState.betSelectionActive = false;
  trainingState.pendingAggressiveAction = null;
  renderDealButtonIcon();
  el.startButton.disabled = false;
  resetTrainingStateVisuals();
}

function startHand() {
  clearAutoDealTimer();
  trainingState.autoDealCountdownVisible = false;
  if (el.autoDealControls) {
    el.autoDealControls.hidden = true;
  }

  if (!trainingState.userPosition) {
    setPromptMessage("Select your position before starting a hand.");
    return;
  }

  if (trainingState.tournamentFinished) {
    setPromptMessage(`${trainingState.tournamentResult}. Click Reset to begin a new session.`);
    return;
  }

  if (!trainingState.tournamentStacks) {
    initializeTournament();
  }

  trainingState.betSelectionActive = false;

  trainingState.handId += 1;
  trainingState.hand = createHand();
  trainingState.showdownRevealed = false;
  trainingState.decisionLog = [];
  trainingState.handResultMessage = "Hand in progress";
  el.startButton.disabled = true;
  renderDealButtonIcon();
  if (el.settingsPanel) {
    el.settingsPanel.open = false;
  }
  setPromptMessage("Hand dealt. Waiting for action.");
  updateAutoDealCountdownUi();
  addLog(`Hand ${trainingState.handsPlayed + 1} started.`);
  playHand(trainingState.handId);
}

function hookActionButtons() {
  if (el.recommendation) {
    const triggerRecommendedAction = () => {
      if (trainingState.pendingRecommendationAction) {
        trainingState.pendingRecommendationAction();
      }
    };

    el.recommendation.addEventListener("click", triggerRecommendedAction);
    el.recommendation.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerRecommendedAction();
      }
    });
  }

  if (el.betSizeInput) {
    el.betSizeInput.addEventListener("input", () => {
      syncBetSizeControlsFromSource(el.betSizeInput.value);
    });
    el.betSizeInput.addEventListener("change", () => {
      syncBetSizeControlsFromSource(el.betSizeInput.value);
    });
  }

  if (el.betSizeSlider) {
    el.betSizeSlider.addEventListener("input", () => {
      syncBetSizeControlsFromSource(el.betSizeSlider.value);
    });
  }

  el.foldBtn.addEventListener("click", () => {
    if (trainingState.pendingUserDecision) {
      trainingState.pendingUserDecision("fold");
    }
  });

  el.checkBtn.addEventListener("click", () => {
    if (!trainingState.pendingUserDecision || !trainingState.hand) {
      return;
    }

    trainingState.betSelectionActive = false;
    trainingState.pendingAggressiveAction = null;
    trainingState.pendingUserDecision("check");
  });

  el.callBtn.addEventListener("click", () => {
    if (!trainingState.pendingUserDecision || !trainingState.hand) {
      return;
    }

    trainingState.betSelectionActive = false;
    trainingState.pendingAggressiveAction = null;
    trainingState.pendingUserDecision("call");
  });

  const handleAggressiveButton = (actionType) => {
    if (!trainingState.pendingUserDecision || !trainingState.hand) {
      return;
    }

    const user = getUserPlayer(trainingState.hand);
    const toCall = Math.max(0, trainingState.hand.currentBet - user.streetBet);
    const fallbackTarget = calcRaiseTarget(trainingState.hand, user);

    if (!trainingState.betSelectionActive || trainingState.pendingAggressiveAction !== actionType) {
      trainingState.betSelectionActive = true;
      trainingState.pendingAggressiveAction = actionType;
      updateActionButtons(false, toCall, fallbackTarget, 0, 0, user);
      return;
    }

    const selectedAmount = readSelectedAggressiveTarget(0, user.chips, Math.max(0, fallbackTarget - user.streetBet));
    const targetBet = user.streetBet + selectedAmount;
    trainingState.pendingUserDecision({
      type: actionType,
      targetBet,
    });
  };

  el.raiseBtn.addEventListener("click", () => handleAggressiveButton("raise"));
  el.betBtn.addEventListener("click", () => handleAggressiveButton("bet"));
}

async function initTraining() {
  renderBuildTag();
  renderDealButtonIcon();
  renderSelectors();
  resetTrainingStateVisuals();

  if (el.settingsOpenButton && el.settingsPanel) {
    el.settingsOpenButton.addEventListener("click", () => {
      el.settingsPanel.open = true;
    });
  }

  if (el.settingsCloseButton && el.settingsPanel) {
    el.settingsCloseButton.addEventListener("click", () => {
      el.settingsPanel.open = false;
    });
  }

  if (el.settingsPanel) {
    el.settingsPanel.addEventListener("click", (event) => {
      if (event.target === el.settingsPanel) {
        el.settingsPanel.open = false;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && el.settingsPanel.open) {
        el.settingsPanel.open = false;
      }
    });
  }

  if (el.autoDealToggle) {
    el.autoDealToggle.checked = trainingState.autoDealEnabled;
    el.autoDealToggle.addEventListener("change", () => {
      trainingState.autoDealEnabled = Boolean(el.autoDealToggle.checked);
      if (!trainingState.autoDealEnabled) {
        clearAutoDealTimer();
      }
    });
  }

  if (el.autoDealPauseButton) {
    el.autoDealPauseButton.addEventListener("click", () => {
      if (!trainingState.autoDealEnabled || trainingState.autoDealCountdownSeconds <= 0) {
        return;
      }
      trainingState.autoDealPaused = !trainingState.autoDealPaused;
      updateAutoDealCountdownUi();
    });
  }

  el.startButton.addEventListener("click", startHand);
  if (el.resetButton) {
    el.resetButton.addEventListener("click", () => {
      resetHand();
      if (el.settingsPanel) {
        el.settingsPanel.open = false;
      }
    });
  }
  hookActionButtons();

  try {
    await loadRanges();
    initializeChipTrackingSession();
  } catch (error) {
    trainingState.rangesLoaded = false;
    console.error(error);
    setPromptMessage("Ranges could not be loaded. Settings are available, but recommendations may be limited until reload succeeds.");
  }
}

initTraining();
