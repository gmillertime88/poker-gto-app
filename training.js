const PLAYER_COUNTS = [5, 6, 7, 8, 9];
const TABLE_TEMPERATURES = [
  { key: "conservative", label: "Conservative" },
  { key: "normal", label: "Normal" },
  { key: "aggressive", label: "Aggressive" },
];

const POSITION_DISPLAY_ORDER = ["D", "SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO"];
const POSITIONS_BY_PLAYERS = {
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

const BUILD_VERSION = "4.2";
const BUILD_TIMESTAMP = "2026-03-23 08:30";

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_STACK = 1000;
const NPC_ACTION_DELAY_RANGE_MS = {
  conservative: [5000, 5000],
  normal: [5000, 5000],
  aggressive: [5000, 5000],
};
const STREETS = ["preflop", "flop", "turn", "river"];

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
  userPosition: null,
  baseRows: [],
  thresholds: {},
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
};

const el = {
  playersGrid: document.getElementById("training-players-grid"),
  temperatureGrid: document.getElementById("training-temperature-grid"),
  positionGrid: document.getElementById("training-position-grid"),
  startButton: document.getElementById("training-start-btn"),
  resetButton: document.getElementById("training-reset-btn"),
  session: document.getElementById("training-session"),
  street: document.getElementById("training-street"),
  pot: document.getElementById("training-pot"),
  odds: document.getElementById("training-odds"),
  recommendation: document.getElementById("training-reco"),
  actionOn: document.getElementById("training-action-on"),
  board: document.getElementById("training-board"),
  tableBody: document.getElementById("training-table-body"),
  foldBtn: document.getElementById("training-fold-btn"),
  checkCallBtn: document.getElementById("training-check-call-btn"),
  betRaiseBtn: document.getElementById("training-bet-raise-btn"),
  prompt: document.getElementById("training-prompt"),
  log: document.getElementById("training-log"),
  summary: document.getElementById("training-summary"),
  summaryHeadline: document.getElementById("training-summary-headline"),
  summaryDetails: document.getElementById("training-summary-details"),
  buildTag: document.getElementById("training-build-tag"),
};

function renderBuildTag() {
  if (!el.buildTag) {
    return;
  }

  el.buildTag.textContent = `v${BUILD_VERSION} • ${BUILD_TIMESTAMP}`;
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

function buildRangeMapForContext(baseRows, players, thresholds) {
  const rangeMap = new Map();
  const playerDelta = WIDEN_DELTA_BY_PLAYERS[players] ?? 0;
  const temperatureDelta = TEMPERATURE_RANGE_ADJUST[trainingState.temperature] ?? 0;
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

function getRangeMap() {
  const cacheKey = `${trainingState.players}-${trainingState.temperature}`;
  if (trainingState.rangeMapsByContext.has(cacheKey)) {
    return trainingState.rangeMapsByContext.get(cacheKey);
  }

  const map = buildRangeMapForContext(trainingState.baseRows, trainingState.players, trainingState.thresholds);
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

  if (cardInt === null || cardInt === undefined) {
    token.textContent = "--";
    return token;
  }

  if (hidden) {
    token.textContent = "??";
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

    const unique = [...new Set(ranks)];
    const sfHigh = straightHighFromRanks(unique);
    if (sfHigh > bestStraightFlush) {
      bestStraightFlush = sfHigh;
    }

    const sorted = [...ranks].sort((a, b) => b - a);
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
      const pairRank = Math.max(...pairCandidates);
      return [6, tripRank, pairRank];
    }
  }

  if (flushRanks) {
    return [5, ...flushRanks];
  }

  const straightHigh = straightHighFromRanks(distinctRanks);
  if (straightHigh > 0) {
    return [4, straightHigh];
  }

  if (trips.length > 0) {
    const kickers = distinctRanks.filter((rank) => rank !== trips[0]).slice(0, 2);
    return [3, trips[0], ...kickers];
  }

  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kicker = distinctRanks.find((rank) => rank !== highPair && rank !== lowPair) || 0;
    return [2, highPair, lowPair, kicker];
  }

  if (pairs.length === 1) {
    const kickers = distinctRanks.filter((rank) => rank !== pairs[0]).slice(0, 3);
    return [1, pairs[0], ...kickers];
  }

  return [0, ...distinctRanks.slice(0, 5)];
}

function normalizedHoleFromInts(cardA, cardB) {
  const a = cardFromInt(cardA);
  const b = cardFromInt(cardB);
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const suited = a.suit === b.suit && high !== low;
  return { card1: high, card2: low, suited };
}

function getPreflopRecommendation(player) {
  const hole = normalizedHoleFromInts(player.cards[0], player.cards[1]);
  const key = tableKey(hole.card1, hole.card2, hole.suited);
  const row = getRangeMap().get(key);
  return row?.[player.position] || "Fold";
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
  const maxSuit = Math.max(...suitCounts);
  const paired = [...rankCounts.values()].some((count) => count >= 2);
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

  const userChips = trainingState.tournamentStacks.get(trainingState.userPosition) || 0;
  const activePlayers = [...trainingState.tournamentStacks.values()].filter((chips) => chips > 0).length;

  if (trainingState.tournamentFinished) {
    return `${trainingState.tournamentResult} | You: ${userChips}/${trainingState.tournamentTotalChips}`;
  }

  return `Hand ${trainingState.handsPlayed + 1} | You: ${userChips}/${trainingState.tournamentTotalChips} | Players Left: ${activePlayers}`;
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
    const bbIndex = seatMap.get("BB") ?? 0;
    return (bbIndex + 1) % hand.players.length;
  }

  const buttonIndex = seatMap.get("D") ?? 0;
  return (buttonIndex + 1) % hand.players.length;
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
  return `${value} chips`;
}

function addLog(text, type = "info") {
  const row = document.createElement("div");
  row.className = `training-log-entry ${type}`;
  row.textContent = text;
  el.log.prepend(row);
}

function updateActionButtons(disabled = true, toCall = 0, raiseTo = 0) {
  el.foldBtn.disabled = disabled || toCall === 0;
  el.checkCallBtn.disabled = disabled;
  el.betRaiseBtn.disabled = disabled;

  el.checkCallBtn.textContent = toCall > 0 ? `Call ${toCall}` : "Check";
  el.betRaiseBtn.textContent = toCall > 0 ? `Raise to ${raiseTo}` : `Bet ${raiseTo}`;
}

function renderBoard(hand) {
  el.board.innerHTML = "";

  if (!hand || hand.board.length === 0) {
    const empty = document.createElement("span");
    empty.className = "board-display-empty";
    empty.textContent = "-";
    el.board.appendChild(empty);
    return;
  }

  hand.board.forEach((cardInt) => {
    el.board.appendChild(makeCardToken(cardInt));
  });
}

function renderTable(hand) {
  el.tableBody.innerHTML = "";

  if (!hand) {
    return;
  }

  hand.players.forEach((player) => {
    const row = document.createElement("tr");
    if (player.isUser) {
      row.className = "training-user-row";
    }

    const seatCell = document.createElement("td");
    seatCell.textContent = player.isUser ? `${player.seat} (You)` : String(player.seat);

    const posCell = document.createElement("td");
    posCell.textContent = player.position;

    const cardsCell = document.createElement("td");
    cardsCell.className = "results-hand-cell";

    const showRealCards = player.isUser || trainingState.showdownRevealed;
    cardsCell.appendChild(makeCardToken(player.cards[0], !showRealCards));
    cardsCell.appendChild(makeCardToken(player.cards[1], !showRealCards));

    const stackCell = document.createElement("td");
    stackCell.textContent = chipsLabel(player.chips);

    const statusCell = document.createElement("td");
    statusCell.textContent = player.eliminated ? "Eliminated" : (player.folded ? "Folded" : (isAllIn(player) ? "All-In" : "Active"));

    const streetBetCell = document.createElement("td");
    streetBetCell.textContent = String(player.streetBet);

    const actionCell = document.createElement("td");
    actionCell.textContent = player.lastAction || "-";

    row.appendChild(seatCell);
    row.appendChild(posCell);
    row.appendChild(cardsCell);
    row.appendChild(stackCell);
    row.appendChild(statusCell);
    row.appendChild(streetBetCell);
    row.appendChild(actionCell);
    el.tableBody.appendChild(row);
  });
}

function renderStatus(hand, equity = null, recommendation = "-") {
  el.session.textContent = getSessionStatusText();

  if (!hand) {
    el.street.textContent = "-";
    el.pot.textContent = "-";
    el.odds.textContent = "-";
    el.recommendation.textContent = "-";
    el.recommendation.className = "value training-reco-value";
    el.actionOn.textContent = "-";
    return;
  }

  el.street.textContent = streetLabel(hand.street);
  el.pot.textContent = chipsLabel(hand.pot);
  el.odds.textContent = equity === null ? "-" : `${(equity * 100).toFixed(1)}%`;
  el.recommendation.textContent = recommendation;
  el.recommendation.className = `value training-reco-value ${normalizedAction(recommendation)}`;
  el.actionOn.textContent = hand.actionOn || "-";
}

function renderAll(hand, equity = null, recommendation = "-") {
  renderStatus(hand, equity, recommendation);
  renderBoard(hand);
  renderTable(hand);
}

function postChips(hand, player, amount) {
  const paid = Math.min(amount, player.chips);
  player.chips -= paid;
  player.streetBet += paid;
  hand.pot += paid;
  return paid;
}

function getUserPlayer(hand) {
  return hand.players.find((player) => player.isUser);
}

function sampleFromDeck(deck, count) {
  const copy = [...deck];
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

  const knownCards = new Set([actor.cards[0], actor.cards[1], ...hand.board]);
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
    const actorRank = evaluateSevenCards([actor.cards[0], actor.cards[1], ...simulatedBoard]);

    const allRanks = [actorRank];
    sampledOpponents.forEach((cards) => {
      allRanks.push(evaluateSevenCards([cards[0], cards[1], ...simulatedBoard]));
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
    const preflop = getPreflopRecommendation(player);
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

  const adjust = TEMPERATURE_POSTFLOP_ADJUST[trainingState.temperature] ?? 0;
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
  const raw = String(action || "").toLowerCase();
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

  if (hand.street === "preflop") {
    const openTarget = Math.max(Math.round((OPEN_SIZE_BB[player.position] ?? 2.5) * BIG_BLIND), BIG_BLIND * 2);
    if (hand.currentBet <= BIG_BLIND) {
      target = openTarget;
    } else if (hand.currentStreetRaises <= 1) {
      target = Math.max(Math.round((hand.currentBet * 2.8) / BIG_BLIND) * BIG_BLIND, hand.currentBet + BIG_BLIND);
    } else {
      target = Math.max(Math.round((hand.currentBet * 2.3) / BIG_BLIND) * BIG_BLIND, hand.currentBet + BIG_BLIND);
    }
  } else {
    let fraction = hand.street === "flop" ? 0.7 : 0.8;
    if (hand.currentStreetRaises > 0) {
      fraction = 0.6;
    }
    const raw = Math.max(hand.pot * fraction, BIG_BLIND * 2, hand.currentBet + BIG_BLIND);
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
    const base = getPreflopRecommendation(player);
    if (toCall <= 0) {
      return `Range-driven preflop plan from ${player.position}: ${base}.`;
    }

    if (base === "Raise") {
      return `Strong range from ${player.position}; continue aggressively unless facing very large pressure.`;
    }

    if (base === "Call") {
      return `Marginal continue hand from ${player.position}; call performs better than raising.`;
    }

    return `Out-of-range continue from ${player.position}; folding preserves chips.`;
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
  const posBias = POSITION_AGGRESSION[player.position] ?? 0;
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
  winner.chips += hand.pot;
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
}

function revealStreetCards(hand) {
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
  const toCall = Math.max(0, hand.currentBet - player.streetBet);
  const prevCurrentBet = hand.currentBet;

  if (action === "fold") {
    player.folded = true;
    player.lastAction = "Fold";
    return { type: "fold", aggressive: false };
  }

  if (action === "check") {
    player.lastAction = "Check";
    return { type: "check", aggressive: false };
  }

  if (action === "call") {
    const paid = postChips(hand, player, toCall);
    if (player.chips <= 0) {
      player.lastAction = `Call ${paid} (All-In)`;
    } else {
      player.lastAction = `Call ${paid}`;
    }
    return { type: "call", aggressive: false };
  }

  const targetBet = calcRaiseTarget(hand, player);
  const toPutIn = Math.max(0, targetBet - player.streetBet);
  const paid = postChips(hand, player, toPutIn);

  if (player.streetBet > prevCurrentBet) {
    hand.currentBet = player.streetBet;
    hand.currentStreetRaises += 1;
    player.lastAction = `${action === "bet" ? "Bet" : "Raise"} to ${player.streetBet}${player.chips <= 0 ? " (All-In)" : ""}`;
    return { type: action, aggressive: true };
  }

  player.lastAction = `Call ${paid}${player.chips <= 0 ? " (All-In)" : ""}`;
  return { type: "call", aggressive: false };
}

function getEligibleSeats(hand, order) {
  return order
    .map((index) => hand.players[index])
    .filter((player) => !player.folded && !isAllIn(player))
    .map((player) => player.seat);
}

function buildDecisionRecord(hand, player, recommendationAction, recommendationTextValue, action, toCall, equity, reason) {
  if (!player.isUser) {
    return;
  }

  trainingState.decisionLog.push({
    street: streetLabel(hand.street),
    toCall,
    recommendation: recommendationTextValue,
    action,
    equity,
    reason,
    followed: didFollowRecommendation(recommendationAction, action),
  });
}

async function getUserAction(hand, player, toCall, recommendation, equity) {
  return new Promise((resolve) => {
    const raiseTo = calcRaiseTarget(hand, player);
    updateActionButtons(false, toCall, raiseTo);

    trainingState.waitingForUser = true;
    trainingState.pendingUserDecision = (action) => {
      trainingState.waitingForUser = false;
      trainingState.pendingUserDecision = null;
      updateActionButtons(true, 0, 0);
      resolve(action);
    };

    const equityPct = `${(equity * 100).toFixed(1)}%`;
    el.prompt.textContent = `Your turn (${streetLabel(hand.street)}): to call ${toCall}. Equity ${equityPct}. Recommended ${recommendation}.`;
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
    renderAll(hand, userEquity, player.isUser ? recommendationTextValue : "-");

    let action;

    if (player.isUser) {
      action = await getUserAction(hand, player, toCall, recommendationTextValue, actorEquity);
      buildDecisionRecord(hand, player, recommendation, recommendationTextValue, action, toCall, actorEquity, reason);
    } else {
      el.prompt.textContent = `Seat ${player.seat} is thinking...`;
      await sleep(getNpcThinkDelayMs(), handId);
      action = getNpcAction(hand, player, toCall, recommendation, actorEquity);
    }

    const result = applyAction(hand, player, action);
    addLog(`${player.isUser ? "You" : `Seat ${player.seat}`} ${player.lastAction.toLowerCase()}.`, result.aggressive ? "raise" : "info");

    const updatedUser = getUserPlayer(hand);
    const updatedUserEquity = updatedUser && !updatedUser.folded ? estimateSeatEquity(hand, updatedUser.seat) : null;
    renderAll(hand, updatedUserEquity, "-");

    if (!canContinueHand(hand)) {
      break;
    }

    if (result.aggressive) {
      pending = new Set(getEligibleSeats(hand, order).filter((seat) => seat !== player.seat));
      continue;
    }

    pending.delete(player.seat);
  }

  updateActionButtons(true, 0, 0);
}

function evaluateShowdownWinner(hand) {
  const contenders = activePlayers(hand);

  if (contenders.length === 1) {
    return { winners: [contenders[0]] };
  }

  let best = null;
  const winners = [];

  contenders.forEach((player) => {
    const rankVector = evaluateSevenCards([player.cards[0], player.cards[1], ...hand.board]);
    if (!best || compareRankVectors(rankVector, best) > 0) {
      best = rankVector;
      winners.length = 0;
      winners.push(player);
      return;
    }

    if (compareRankVectors(rankVector, best) === 0) {
      winners.push(player);
    }
  });

  return { winners };
}

function payoutShowdown(hand) {
  const { winners } = evaluateShowdownWinner(hand);
  const share = Math.floor(hand.pot / winners.length);
  const remainder = hand.pot - (share * winners.length);

  winners.forEach((winner, index) => {
    winner.chips += share + (index === 0 ? remainder : 0);
  });

  hand.pot = 0;
  return winners;
}

function renderSummary(hand, winners) {
  const followed = trainingState.decisionLog.filter((item) => item.followed).length;
  const total = trainingState.decisionLog.length;
  const missed = total - followed;

  const winnerText = winners.map((winner) => (winner.isUser ? "You" : `Seat ${winner.seat}`)).join(", ");
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
    const winnerHand = evaluateSevenCards([winners[0].cards[0], winners[0].cards[1], ...hand.board]);
    const winnerHandLabel = handCategoryLabel(winnerHand);
    const showdownNote = document.createElement("p");
    showdownNote.textContent = `Outcome driver: showdown resolved by best made hand (${winnerHandLabel}).`;
    el.summaryDetails.appendChild(showdownNote);

    if (user && !user.folded) {
      const userHandLabel = handCategoryLabel(evaluateSevenCards([user.cards[0], user.cards[1], ...hand.board]));
      const userShowdown = document.createElement("p");
      userShowdown.textContent = `Your showdown hand: ${userHandLabel}.`;
      el.summaryDetails.appendChild(userShowdown);
    }
  }

  const score = document.createElement("p");
  score.textContent = `Decision quality: followed ${followed} of ${total} recommendations (${missed} deviations).`;
  el.summaryDetails.appendChild(score);

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
}

function setInitialPrompt() {
  el.prompt.textContent = "Start a hand to begin training. Chip stacks persist across hands until the session ends.";
}

function resetTrainingStateVisuals() {
  renderAll(null);
  updateActionButtons(true, 0, 0);
  el.log.innerHTML = "";
  el.summary.hidden = true;
  el.summaryHeadline.textContent = "-";
  el.summaryDetails.innerHTML = "";
  setInitialPrompt();
}

function initializeTournament() {
  const positions = POSITIONS_BY_PLAYERS[trainingState.players] || POSITIONS_BY_PLAYERS[9];
  trainingState.tournamentStacks = new Map();
  positions.forEach((position) => {
    trainingState.tournamentStacks.set(position, STARTING_STACK);
  });
  trainingState.tournamentTotalChips = positions.length * STARTING_STACK;
  trainingState.handsPlayed = 0;
  trainingState.tournamentFinished = false;
  trainingState.tournamentResult = "";
}

function persistTournamentStacks(hand) {
  if (!trainingState.tournamentStacks) {
    return;
  }

  hand.players.forEach((player) => {
    trainingState.tournamentStacks.set(player.position, player.chips);
  });
}

function evaluateTournamentCompletion() {
  const stacks = trainingState.tournamentStacks;
  if (!stacks) {
    return false;
  }

  const userChips = stacks.get(trainingState.userPosition) || 0;
  const active = [...stacks.values()].filter((chips) => chips > 0).length;

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
}

function createHand() {
  const positions = POSITIONS_BY_PLAYERS[trainingState.players] || POSITIONS_BY_PLAYERS[9];
  const deck = shuffle(createDeck());

  if (!trainingState.tournamentStacks) {
    initializeTournament();
  }

  const players = positions.map((position, idx) => ({
    chips: trainingState.tournamentStacks.get(position) || 0,
    inHand: (trainingState.tournamentStacks.get(position) || 0) > 0,
    seat: idx + 1,
    position,
    isUser: position === trainingState.userPosition,
    cards: (trainingState.tournamentStacks.get(position) || 0) > 0 ? [deck.pop(), deck.pop()] : [null, null],
    folded: (trainingState.tournamentStacks.get(position) || 0) <= 0,
    eliminated: (trainingState.tournamentStacks.get(position) || 0) <= 0,
    streetBet: 0,
    lastAction: "-",
  }));

  const userPlayer = players.find((player) => player.isUser);
  const userStartChips = userPlayer ? userPlayer.chips : 0;

  return {
    deck,
    players,
    board: [],
    street: "preflop",
    currentBet: BIG_BLIND,
    currentStreetRaises: 0,
    pot: 0,
    actionOn: "-",
    finishedByFold: false,
    userStartChips,
  };
}

function postBlinds(hand) {
  const seatMap = positionToSeatMap(hand.players);
  const sb = hand.players[seatMap.get("SB")];
  const bb = hand.players[seatMap.get("BB")];

  if (!sb || !bb) {
    return;
  }

  const sbPaid = sb.chips > 0 ? postChips(hand, sb, SMALL_BLIND) : 0;
  const bbPaid = bb.chips > 0 ? postChips(hand, bb, BIG_BLIND) : 0;

  sb.lastAction = sbPaid > 0 ? `Post SB ${sbPaid}` : "Out";
  bb.lastAction = bbPaid > 0 ? `Post BB ${bbPaid}` : "Out";

  if (sbPaid > 0) {
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
    renderAll(hand, user ? estimateSeatEquity(hand, user.seat) : null, "-");

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
      renderAll(hand, equity, recommendationTextValue);
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

    let winners;
    if (trainingState.hand.finishedByFold) {
      winners = activePlayers(trainingState.hand);
    } else {
      trainingState.showdownRevealed = true;
      winners = payoutShowdown(trainingState.hand);
      const winnerText = winners.map((winner) => (winner.isUser ? "You" : `Seat ${winner.seat}`)).join(", ");
      addLog(`Showdown complete. Winner: ${winnerText}.`, "raise");
    }

    const finalUser = getUserPlayer(trainingState.hand);
    const finalEquity = finalUser && !finalUser.folded ? estimateSeatEquity(trainingState.hand, finalUser.seat) : null;
    renderAll(trainingState.hand, finalEquity, "Hand complete");
    persistTournamentStacks(trainingState.hand);
    trainingState.handsPlayed += 1;
    const sessionDone = evaluateTournamentCompletion();
    renderSummary(trainingState.hand, winners);

    if (sessionDone) {
      el.prompt.textContent = `${trainingState.tournamentResult}. Click Reset to start a new session.`;
      el.startButton.disabled = true;
    } else {
      el.prompt.textContent = "Hand complete. Click Start Hand to continue the session with current chip stacks.";
      el.startButton.disabled = false;
    }
  } catch (error) {
    if (error && error.message === "HAND_CANCELLED") {
      return;
    }

    console.error(error);
    el.prompt.textContent = "Training hand stopped due to an unexpected error.";
  } finally {
    updateActionButtons(true, 0, 0);
    trainingState.waitingForUser = false;
    trainingState.pendingUserDecision = null;
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
      clearTournamentProgress();
      const availablePositions = getActivePositions();
      if (!availablePositions.includes(trainingState.userPosition)) {
        trainingState.userPosition = null;
      }
      resetTrainingStateVisuals();
      renderSelectors();
    });
  });

  el.temperatureGrid.innerHTML = "";
  TABLE_TEMPERATURES.forEach((temperature) => {
    renderSelectionButton(el.temperatureGrid, temperature.label, trainingState.temperature === temperature.key, () => {
      trainingState.temperature = temperature.key;
      clearTournamentProgress();
      resetTrainingStateVisuals();
      renderSelectors();
    });
  });

  el.positionGrid.innerHTML = "";
  getActivePositions().forEach((position) => {
    renderSelectionButton(el.positionGrid, position, trainingState.userPosition === position, () => {
      trainingState.userPosition = position;
      clearTournamentProgress();
      resetTrainingStateVisuals();
      renderSelectors();
    });
  });
}

async function loadRanges() {
  const response = await fetch("ranges.json");
  if (!response.ok) {
    throw new Error("Unable to load ranges.json");
  }

  trainingState.baseRows = await response.json();
  trainingState.thresholds = buildPositionThresholds(trainingState.baseRows);
  trainingState.rangeMapsByContext.clear();
}

function resetHand() {
  trainingState.handId += 1;
  trainingState.hand = null;
  trainingState.showdownRevealed = false;
  trainingState.decisionLog = [];
  clearTournamentProgress();
  trainingState.waitingForUser = false;
  trainingState.pendingUserDecision = null;
  el.startButton.textContent = "Start Hand";
  el.startButton.disabled = false;
  resetTrainingStateVisuals();
}

function startHand() {
  if (!trainingState.userPosition) {
    el.prompt.textContent = "Select your position before starting a hand.";
    return;
  }

  if (trainingState.tournamentFinished) {
    el.prompt.textContent = `${trainingState.tournamentResult}. Click Reset to begin a new session.`;
    return;
  }

  if (!trainingState.tournamentStacks) {
    initializeTournament();
  }

  trainingState.handId += 1;
  trainingState.hand = createHand();
  trainingState.showdownRevealed = false;
  trainingState.decisionLog = [];

  el.summary.hidden = true;
  el.startButton.disabled = true;
  el.startButton.textContent = "Continue Session";
  addLog(`Hand ${trainingState.handsPlayed + 1} started.`);
  playHand(trainingState.handId);
}

function hookActionButtons() {
  el.foldBtn.addEventListener("click", () => {
    if (trainingState.pendingUserDecision) {
      trainingState.pendingUserDecision("fold");
    }
  });

  el.checkCallBtn.addEventListener("click", () => {
    if (!trainingState.pendingUserDecision || !trainingState.hand) {
      return;
    }

    const user = getUserPlayer(trainingState.hand);
    const toCall = Math.max(0, trainingState.hand.currentBet - user.streetBet);
    trainingState.pendingUserDecision(toCall > 0 ? "call" : "check");
  });

  el.betRaiseBtn.addEventListener("click", () => {
    if (!trainingState.pendingUserDecision || !trainingState.hand) {
      return;
    }

    const user = getUserPlayer(trainingState.hand);
    const toCall = Math.max(0, trainingState.hand.currentBet - user.streetBet);
    trainingState.pendingUserDecision(toCall > 0 ? "raise" : "bet");
  });
}

async function initTraining() {
  try {
    renderBuildTag();
    await loadRanges();
    renderSelectors();
    resetTrainingStateVisuals();

    el.startButton.addEventListener("click", startHand);
    el.resetButton.addEventListener("click", resetHand);
    hookActionButtons();
  } catch (error) {
    console.error(error);
    el.prompt.textContent = "Unable to initialize Training module.";
  }
}

initTraining();
