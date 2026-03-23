const TRAINING_PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9];
const TRAINING_STREETS = [
  { key: "preflop", label: "Pre-Flop", boardCount: 0, bet: 20, call: 12 },
  { key: "flop", label: "Flop", boardCount: 3, bet: 24, call: 16 },
  { key: "turn", label: "Turn", boardCount: 4, bet: 36, call: 24 },
  { key: "river", label: "River", boardCount: 5, bet: 36, call: 24 },
];
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
const PRE_FLOP_ORDER = ["UTG", "MP1", "MP2", "MP3", "HJ", "CO", "D", "SB", "BB"];
const POST_FLOP_ORDER = ["SB", "BB", "UTG", "MP1", "MP2", "MP3", "HJ", "CO", "D"];

const BUILD_VERSION = "4.1";
const BUILD_TIMESTAMP = "2026-03-22 12:20";
const STARTING_CHIPS = 1000;
const MONTE_CARLO_SAMPLES = 1200;
const SUITS = ["S", "H", "D", "C"];
const SUIT_SYMBOLS = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

const trainingState = {
  selectedPlayers: 6,
  players: [],
  handNumber: 0,
  streetIndex: -1,
  buttonOffset: 0,
  board: [],
  handDeck: [],
  activeHandPlayers: [],
  pot: 0,
  handInProgress: false,
  handResolved: false,
  oddsByPlayerId: new Map(),
  rangeMap: new Map(),
  lastResultMessage: "",
  userRecommendation: "-",
};

const trainingElements = {
  playersGrid: document.getElementById("training-players-grid"),
  startBtn: document.getElementById("training-start-btn"),
  newHandBtn: document.getElementById("training-new-hand-btn"),
  nextStreetBtn: document.getElementById("training-next-street-btn"),
  resolveBtn: document.getElementById("training-resolve-btn"),
  sessionStatus: document.getElementById("training-session-status"),
  street: document.getElementById("training-street"),
  board: document.getElementById("training-board"),
  userHand: document.getElementById("training-user-hand"),
  recommendation: document.getElementById("training-recommendation"),
  pot: document.getElementById("training-pot"),
  oddsBody: document.getElementById("training-odds-body"),
  postHandWrap: document.getElementById("training-post-hand"),
  proceedBtn: document.getElementById("training-proceed-btn"),
  resetBtn: document.getElementById("training-reset-btn"),
  buildTag: document.getElementById("build-tag"),
};

function renderBuildTag() {
  if (!trainingElements.buildTag) {
    return;
  }

  trainingElements.buildTag.textContent = `v${BUILD_VERSION} • ${BUILD_TIMESTAMP}`;
}

function playerLabel(player) {
  return `Player ${player.id}${player.id === 1 ? " (You)" : ""}`;
}

function cardFromInt(cardInt) {
  const suit = Math.floor(cardInt / 13);
  const rank = (cardInt % 13) + 2;
  return { rank, suit };
}

function rankToChar(rank) {
  return "--23456789TJQKA"[rank] || "?";
}

function suitToChar(suitIndex) {
  return SUITS[suitIndex] || "S";
}

function cardToText(cardInt) {
  const card = cardFromInt(cardInt);
  const suitChar = suitToChar(card.suit);
  return `${rankToChar(card.rank)}${SUIT_SYMBOLS[suitChar]}`;
}

function createDeck() {
  return Array.from({ length: 52 }, (_, idx) => idx);
}

function shuffleInPlace(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

function drawCard(deck) {
  return deck.pop();
}

function normalizeAction(action) {
  if (!action) {
    return "Fold";
  }

  const value = String(action).toLowerCase();
  if (value === "raise") {
    return "Raise";
  }
  if (value === "bet") {
    return "Bet";
  }
  if (value === "call") {
    return "Call";
  }
  if (value === "check") {
    return "Check";
  }
  return "Fold";
}

function rotatePlayers(players, offset) {
  if (!players.length) {
    return [];
  }

  const start = ((offset % players.length) + players.length) % players.length;
  return players.slice(start).concat(players.slice(0, start));
}

function holeToRangeKey(holeCards) {
  const cardA = cardFromInt(holeCards[0]);
  const cardB = cardFromInt(holeCards[1]);
  const high = Math.max(cardA.rank, cardB.rank);
  const low = Math.min(cardA.rank, cardB.rank);
  const suited = cardA.suit === cardB.suit ? 1 : 0;
  return `${high}-${low}-${suited}`;
}

function fallbackPreflopAction(holeCards) {
  const cardA = cardFromInt(holeCards[0]);
  const cardB = cardFromInt(holeCards[1]);
  const high = Math.max(cardA.rank, cardB.rank);
  const low = Math.min(cardA.rank, cardB.rank);
  const pair = cardA.rank === cardB.rank;
  const suited = cardA.suit === cardB.suit;

  if (pair && high >= 11) {
    return "Raise";
  }
  if (pair && high >= 7) {
    return "Call";
  }
  if (high >= 13 && low >= 10) {
    return "Raise";
  }
  if (suited && high >= 11 && low >= 8) {
    return "Call";
  }
  return "Fold";
}

function preflopActionForPlayer(player) {
  const key = holeToRangeKey(player.hole);
  const row = trainingState.rangeMap.get(key);

  if (!row || !player.position || !row[player.position]) {
    return fallbackPreflopAction(player.hole);
  }

  return normalizeAction(row[player.position]);
}

function postflopActionForPlayer(streetKey, equityPct) {
  const profile = {
    flop: { strong: 58, medium: 38, weak: 22 },
    turn: { strong: 60, medium: 40, weak: 24 },
    river: { strong: 63, medium: 44, weak: 27 },
  };
  const p = profile[streetKey] || profile.flop;

  if (equityPct >= p.strong) {
    return "Bet";
  }
  if (equityPct >= p.medium) {
    return "Call";
  }
  if (equityPct >= p.weak) {
    return "Check";
  }
  return "Fold";
}

function resetPlayers(playerCount) {
  trainingState.players = Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    chips: STARTING_CHIPS,
    eliminated: false,
    inHand: false,
    folded: false,
    committed: 0,
    hole: [],
    position: "-",
    lastAction: "-",
  }));
}

function activeSessionPlayers() {
  return trainingState.players.filter((player) => !player.eliminated && player.chips > 0);
}

function renderPlayerCountButtons() {
  trainingElements.playersGrid.innerHTML = "";

  TRAINING_PLAYER_COUNTS.forEach((count) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `select-btn${trainingState.selectedPlayers === count ? " active" : ""}`;
    button.textContent = String(count);

    button.addEventListener("click", () => {
      trainingState.selectedPlayers = count;
      renderPlayerCountButtons();
    });

    trainingElements.playersGrid.appendChild(button);
  });
}

function currentStreet() {
  if (trainingState.streetIndex < 0 || trainingState.streetIndex >= TRAINING_STREETS.length) {
    return null;
  }

  return TRAINING_STREETS[trainingState.streetIndex];
}

function revealBoardUpTo(boardCount) {
  while (trainingState.board.length < boardCount && trainingState.handDeck.length > 0) {
    trainingState.board.push(drawCard(trainingState.handDeck));
  }
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

function evaluateWinners(players, boardCards) {
  let bestRank = null;
  const winners = [];

  players.forEach((player, index) => {
    const rank = evaluateSevenCards([...player.hole, ...boardCards]);
    if (!bestRank || compareRankVectors(rank, bestRank) > 0) {
      bestRank = rank;
      winners.length = 0;
      winners.push(index);
      return;
    }

    if (compareRankVectors(rank, bestRank) === 0) {
      winners.push(index);
    }
  });

  return winners;
}

function calculateOddsForStreet(playersInHand, boardCards) {
  const wins = Array(playersInHand.length).fill(0);
  const equity = Array(playersInHand.length).fill(0);

  const knownCards = new Set();
  playersInHand.forEach((player) => {
    player.hole.forEach((card) => knownCards.add(card));
  });
  boardCards.forEach((card) => knownCards.add(card));

  const remainingDeck = createDeck().filter((card) => !knownCards.has(card));
  const missingBoardCards = 5 - boardCards.length;

  for (let sample = 0; sample < MONTE_CARLO_SAMPLES; sample += 1) {
    const drawPool = [...remainingDeck];
    shuffleInPlace(drawPool);
    const runout = drawPool.slice(0, missingBoardCards);
    const finalBoard = [...boardCards, ...runout];
    const winners = evaluateWinners(playersInHand, finalBoard);

    if (winners.length === 1) {
      wins[winners[0]] += 1;
      equity[winners[0]] += 1;
    } else {
      const split = 1 / winners.length;
      winners.forEach((winnerIndex) => {
        equity[winnerIndex] += split;
      });
    }
  }

  const odds = new Map();
  playersInHand.forEach((player, index) => {
    odds.set(player.id, {
      winPct: (wins[index] / MONTE_CARLO_SAMPLES) * 100,
      equityPct: (equity[index] / MONTE_CARLO_SAMPLES) * 100,
    });
  });

  return odds;
}

function cardListText(cards) {
  if (!cards || !cards.length) {
    return "-";
  }

  return cards.map((card) => cardToText(card)).join(" ");
}

function updateControlStates() {
  const canDeal = trainingState.players.length > 0 && !trainingState.handInProgress && !trainingState.handResolved;
  const onRiver = trainingState.streetIndex === TRAINING_STREETS.length - 1;

  trainingElements.newHandBtn.disabled = !canDeal;
  trainingElements.nextStreetBtn.disabled = !trainingState.handInProgress || onRiver;
  trainingElements.resolveBtn.disabled = !trainingState.handInProgress || !onRiver;
}

function renderOddsTable() {
  trainingElements.oddsBody.innerHTML = "";

  trainingState.players.forEach((player) => {
    const odds = trainingState.oddsByPlayerId.get(player.id);
    const row = document.createElement("tr");

    const status = player.eliminated
      ? "Eliminated"
      : player.folded
      ? "Folded"
      : player.inHand
      ? "In Hand"
      : trainingState.handResolved
      ? "Waiting"
      : "Ready";

    const cells = [
      playerLabel(player),
      player.position || "-",
      status,
      player.lastAction || "-",
      String(player.chips),
      cardListText(player.hole),
      odds ? odds.winPct.toFixed(2) : "-",
      odds ? odds.equityPct.toFixed(2) : "-",
    ];

    cells.forEach((cellValue) => {
      const cell = document.createElement("td");
      cell.textContent = cellValue;
      row.appendChild(cell);
    });

    trainingElements.oddsBody.appendChild(row);
  });
}

function renderStatus() {
  const street = currentStreet();
  const user = trainingState.players.find((player) => player.id === 1);

  trainingElements.sessionStatus.textContent = trainingState.lastResultMessage || "Session ready";
  trainingElements.street.textContent = street ? street.label : "-";
  trainingElements.board.textContent = cardListText(trainingState.board);
  trainingElements.userHand.textContent = user ? cardListText(user.hole) : "-";
  trainingElements.recommendation.textContent = trainingState.userRecommendation || "-";
  trainingElements.pot.textContent = String(trainingState.pot);

  renderOddsTable();
  updateControlStates();
}

function markEliminations() {
  trainingState.players.forEach((player) => {
    if (player.chips <= 0) {
      player.chips = 0;
      player.eliminated = true;
      player.inHand = false;
      player.folded = false;
    }
  });
}

function assignPositions(activePlayers) {
  const positions = POSITIONS_BY_PLAYERS[activePlayers.length] || POSITIONS_BY_PLAYERS[9];
  const rotated = rotatePlayers(activePlayers, trainingState.buttonOffset);
  rotated.forEach((player, index) => {
    player.position = positions[index] || `P${index + 1}`;
  });
  return rotated;
}

function getActionOrder(streetKey) {
  const order = streetKey === "preflop" ? PRE_FLOP_ORDER : POST_FLOP_ORDER;
  return [...trainingState.activeHandPlayers].sort((a, b) => {
    const ai = order.indexOf(a.position);
    const bi = order.indexOf(b.position);
    const left = ai >= 0 ? ai : 99;
    const right = bi >= 0 ? bi : 99;
    return left - right;
  });
}

function computeCurrentOdds() {
  if (!trainingState.activeHandPlayers.length) {
    trainingState.oddsByPlayerId.clear();
    return;
  }

  trainingState.oddsByPlayerId = calculateOddsForStreet(trainingState.activeHandPlayers, trainingState.board);
}

function chooseActionForPlayer(player, street) {
  if (street.key === "preflop") {
    return preflopActionForPlayer(player);
  }

  const odds = trainingState.oddsByPlayerId.get(player.id);
  const equity = odds ? odds.equityPct : 0;
  return postflopActionForPlayer(street.key, equity);
}

function applyActionContributions(street, actionsByPlayerId) {
  const aggressiveExists = Array.from(actionsByPlayerId.values()).some((value) => value === "Raise" || value === "Bet");

  getActionOrder(street.key).forEach((player) => {
    const action = actionsByPlayerId.get(player.id) || "Fold";
    player.lastAction = action;

    if (action === "Fold") {
      player.folded = true;
      player.inHand = false;
      return;
    }

    let amount = 0;
    if (action === "Raise" || action === "Bet") {
      amount = street.bet;
    } else if (action === "Call") {
      amount = street.call;
    } else if (action === "Check") {
      amount = aggressiveExists ? street.call : 0;
    }

    const contribution = Math.min(amount, player.chips);
    player.chips -= contribution;
    player.committed += contribution;
    trainingState.pot += contribution;
  });

  trainingState.activeHandPlayers = trainingState.activeHandPlayers.filter((player) => player.inHand && !player.folded);
}

function endHandWithRemainingPlayer(player) {
  player.chips += trainingState.pot;
  trainingState.pot = 0;
  trainingState.handInProgress = false;
  trainingState.handResolved = true;
  trainingElements.postHandWrap.hidden = false;
  trainingState.lastResultMessage = `Hand ${trainingState.handNumber} complete. Winner: ${playerLabel(player)} (everyone else folded).`;
  trainingState.userRecommendation = player.id === 1 ? player.lastAction : "-";
  trainingState.players.forEach((entry) => {
    entry.inHand = false;
    entry.folded = false;
  });
  markEliminations();
  trainingState.activeHandPlayers = [];
  trainingState.oddsByPlayerId.clear();
}

function processCurrentStreet() {
  const street = currentStreet();
  if (!street || !trainingState.handInProgress) {
    renderStatus();
    return;
  }

  revealBoardUpTo(street.boardCount);
  computeCurrentOdds();

  const actionsByPlayerId = new Map();
  trainingState.activeHandPlayers.forEach((player) => {
    const action = chooseActionForPlayer(player, street);
    actionsByPlayerId.set(player.id, action);
  });

  const user = trainingState.players.find((entry) => entry.id === 1);
  trainingState.userRecommendation = user && actionsByPlayerId.has(1)
    ? actionsByPlayerId.get(1)
    : "-";

  applyActionContributions(street, actionsByPlayerId);

  if (trainingState.activeHandPlayers.length === 1) {
    endHandWithRemainingPlayer(trainingState.activeHandPlayers[0]);
    renderStatus();
    return;
  }

  if (trainingState.activeHandPlayers.length === 0) {
    trainingState.handInProgress = false;
    trainingState.handResolved = true;
    trainingElements.postHandWrap.hidden = false;
    trainingState.lastResultMessage = `Hand ${trainingState.handNumber} ended with all players folding.`;
    renderStatus();
    return;
  }

  computeCurrentOdds();
  renderStatus();
}

function startNewHand() {
  const activePlayers = activeSessionPlayers();
  if (activePlayers.length < 2) {
    trainingState.handInProgress = false;
    trainingState.handResolved = true;
    trainingState.lastResultMessage = "Session complete: fewer than two players have chips remaining.";
    trainingState.userRecommendation = "-";
    trainingElements.postHandWrap.hidden = false;
    renderStatus();
    return;
  }

  trainingState.handNumber += 1;
  trainingState.streetIndex = 0;
  trainingState.board = [];
  trainingState.pot = 0;
  trainingState.handInProgress = true;
  trainingState.handResolved = false;
  trainingState.lastResultMessage = `Hand ${trainingState.handNumber} in progress (${activePlayers.length} players)`;
  trainingElements.postHandWrap.hidden = true;

  const deck = createDeck();
  shuffleInPlace(deck);
  trainingState.handDeck = deck;

  trainingState.players.forEach((player) => {
    player.hole = [];
    player.inHand = false;
    player.folded = false;
    player.committed = 0;
    player.position = "-";
    player.lastAction = "-";
  });

  const positioned = assignPositions(activePlayers);
  positioned.forEach((player) => {
    player.inHand = true;
    player.folded = false;
    player.hole = [drawCard(trainingState.handDeck), drawCard(trainingState.handDeck)];
  });
  trainingState.activeHandPlayers = positioned;
  trainingState.buttonOffset = (trainingState.buttonOffset + 1) % Math.max(1, positioned.length);

  processCurrentStreet();
}

function advanceStreet() {
  if (!trainingState.handInProgress) {
    return;
  }

  if (trainingState.streetIndex >= TRAINING_STREETS.length - 1) {
    return;
  }

  trainingState.streetIndex += 1;
  processCurrentStreet();
}

function resolveCurrentHand() {
  if (!trainingState.handInProgress || trainingState.streetIndex !== TRAINING_STREETS.length - 1) {
    return;
  }

  revealBoardUpTo(5);

  const winners = evaluateWinners(trainingState.activeHandPlayers, trainingState.board);
  const split = Math.floor(trainingState.pot / winners.length);
  let remainder = trainingState.pot - (split * winners.length);

  winners.forEach((winnerIndex) => {
    const winner = trainingState.activeHandPlayers[winnerIndex];
    winner.chips += split;
    if (remainder > 0) {
      winner.chips += 1;
      remainder -= 1;
    }
  });

  trainingState.pot = 0;
  trainingState.handInProgress = false;
  trainingState.handResolved = true;
  trainingElements.postHandWrap.hidden = false;

  trainingState.players.forEach((player) => {
    player.inHand = false;
    player.folded = false;
  });

  markEliminations();

  const winnerLabels = winners
    .map((winnerIndex) => playerLabel(trainingState.activeHandPlayers[winnerIndex]))
    .join(", ");
  trainingState.lastResultMessage = `Hand ${trainingState.handNumber} complete. Winner: ${winnerLabels}`;

  trainingState.activeHandPlayers = [];
  trainingState.oddsByPlayerId.clear();
  renderStatus();
}

function startSession() {
  resetPlayers(trainingState.selectedPlayers);
  trainingState.handNumber = 0;
  trainingState.streetIndex = -1;
  trainingState.buttonOffset = 0;
  trainingState.board = [];
  trainingState.pot = 0;
  trainingState.handDeck = [];
  trainingState.activeHandPlayers = [];
  trainingState.handInProgress = false;
  trainingState.handResolved = false;
  trainingState.oddsByPlayerId.clear();
  trainingState.lastResultMessage = "Session started. Deal a hand to begin.";
  trainingState.userRecommendation = "-";
  trainingElements.postHandWrap.hidden = true;
  renderStatus();
}

function proceedWithCurrentStacks() {
  trainingState.handResolved = false;
  startNewHand();
}

async function loadPreflopRanges() {
  try {
    const response = await fetch("ranges.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Failed to load ranges");
    }
    const rows = await response.json();
    const map = new Map();
    rows.forEach((row) => {
      const key = `${row.card1}-${row.card2}-${row.suited ? 1 : 0}`;
      map.set(key, row);
    });
    trainingState.rangeMap = map;
  } catch (error) {
    trainingState.rangeMap = new Map();
  }
}

async function initTraining() {
  renderBuildTag();
  renderPlayerCountButtons();
  await loadPreflopRanges();
  startSession();

  trainingElements.startBtn.addEventListener("click", startSession);
  trainingElements.newHandBtn.addEventListener("click", startNewHand);
  trainingElements.nextStreetBtn.addEventListener("click", advanceStreet);
  trainingElements.resolveBtn.addEventListener("click", resolveCurrentHand);
  trainingElements.proceedBtn.addEventListener("click", proceedWithCurrentStacks);
  trainingElements.resetBtn.addEventListener("click", startSession);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initTraining();
  });
} else {
  initTraining();
}
