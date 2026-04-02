// Odds calculator engine: UI state, card selection widgets, hand evaluation,
// and exact combinatoric equity computation.
const ODDS_PLAYER_COUNTS = [2, 3, 4];
const ODDS_STAGES = [
  { key: "preflop", label: "Pre-Flop", boardCount: 0, streetIndex: 0 },
  { key: "flop", label: "Flop", boardCount: 3, streetIndex: 1 },
  { key: "turn", label: "Turn", boardCount: 4, streetIndex: 2 },
  { key: "river", label: "River", boardCount: 5, streetIndex: 3 },
];
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = [
  { key: "S", symbol: "♠", label: "Spades", colorClass: "suit-black" },
  { key: "H", symbol: "♥", label: "Hearts", colorClass: "suit-red" },
  { key: "D", symbol: "♦", label: "Diamonds", colorClass: "suit-red" },
  { key: "C", symbol: "♣", label: "Clubs", colorClass: "suit-black" },
];

const BUILD_VERSION = "13.6";
const BUILD_TIMESTAMP = "2026-04-02 09:38";
const WHEEL_REPEAT_COUNT = 3;
const WHEEL_SCROLL_DEBOUNCE_MS = 90;

const oddsState = {
  playersAtStart: 2,
  players: [],
  board: [null, null, null, null, null],
};

const oddsElements = {
  playersGrid: document.getElementById("odds-players-grid"),
  resetButton: document.getElementById("reset-odds-btn"),
  boardGrid: document.getElementById("board-grid"),
  playerRows: document.getElementById("player-rows"),
  calculateButton: document.getElementById("calculate-odds-btn"),
  status: document.getElementById("odds-status"),
  boardsEvaluated: document.getElementById("boards-evaluated"),
  results: document.getElementById("odds-results"),
  buildTag: document.getElementById("build-tag"),
};

// Build metadata shown on-page for quick version verification.
function renderBuildTag() {
  if (!oddsElements.buildTag) {
    return;
  }

  oddsElements.buildTag.textContent = `v${BUILD_VERSION} • ${BUILD_TIMESTAMP}`;
}

// Initializes player seats and clears player hole cards.
function initializePlayers() {
  oddsState.players = Array.from({ length: oddsState.playersAtStart }, (_, i) => ({
    seat: i + 1,
    cards: [null, null],
  }));
}

// Shared lightweight button renderer for static selectors.
function renderSelectButton(grid, label, isActive, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `select-btn${isActive ? " active" : ""}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  grid.appendChild(button);
}

// Status helpers used throughout the calculate flow.
function setStatus(message, statusClass = "pending") {
  oddsElements.status.className = `value odds-status-value ${statusClass}`;
  oddsElements.status.textContent = message;
}

function setStatusRich(contentBuilder, statusClass = "pending") {
  oddsElements.status.className = `value odds-status-value ${statusClass}`;
  oddsElements.status.textContent = "";
  contentBuilder(oddsElements.status);
}

function stageByKey(stageKey) {
  return ODDS_STAGES.find((stage) => stage.key === stageKey) || ODDS_STAGES[0];
}

function stageByBoardCount(boardCount) {
  return ODDS_STAGES.find((stage) => stage.boardCount === boardCount) || ODDS_STAGES[0];
}

function makeCardKey(rank, suit) {
  return `${rank}-${suit}`;
}

// Card selection helpers -----------------------------------------------------
const RANK_WHEEL_OPTIONS = RANKS.map((rank) => ({ value: rank }));

function collectUsedCards(excludeOwnerKey = null) {
  const used = new Set();

  oddsState.players.forEach((player, playerIndex) => {
    player.cards.forEach((card, cardIndex) => {
      const ownerKey = `p-${playerIndex}-c-${cardIndex}`;
      if (ownerKey === excludeOwnerKey) {
        return;
      }

      if (card?.rank && card?.suit) {
        used.add(makeCardKey(card.rank, card.suit));
      }
    });
  });

  oddsState.board.forEach((card, boardIndex) => {
    const ownerKey = `b-${boardIndex}`;
    if (ownerKey === excludeOwnerKey) {
      return;
    }

    if (card?.rank && card?.suit) {
      used.add(makeCardKey(card.rank, card.suit));
    }
  });

  return used;
}

function refreshCardSelectionUI() {
  renderBoardGrid();
  renderPlayerRows();
}

function normalizeWheelIndex(index, length) {
  return ((index % length) + length) % length;
}

function findClosestEnabledIndex(options, startIndex, isDisabled) {
  if (!options.length) {
    return -1;
  }

  for (let offset = 0; offset < options.length; offset += 1) {
    const forward = normalizeWheelIndex(startIndex + offset, options.length);
    if (!isDisabled(options[forward])) {
      return forward;
    }

    const backward = normalizeWheelIndex(startIndex - offset, options.length);
    if (!isDisabled(options[backward])) {
      return backward;
    }
  }

  return -1;
}

// Creates the reusable infinite-style wheel used for rank selection.
function buildVerticalWheel({
  options,
  selectedValue,
  onChange,
  isDisabled,
  getText,
  getAriaLabel,
  getItemClass,
  allowClickToggle,
}) {
  const viewport = document.createElement("div");
  viewport.className = "card-wheel-viewport";

  const rail = document.createElement("div");
  rail.className = "card-wheel-rail";

  for (let repeatIndex = 0; repeatIndex < WHEEL_REPEAT_COUNT; repeatIndex += 1) {
    options.forEach((option, optionIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      const disabled = isDisabled(option);
      button.className = `card-wheel-item ${getItemClass(option)}${selectedValue === option.value ? " active" : ""}`;
      button.textContent = getText(option);
      button.setAttribute("aria-label", getAriaLabel(option));
      button.setAttribute("aria-pressed", selectedValue === option.value ? "true" : "false");
      button.dataset.optionIndex = String(optionIndex);
      button.disabled = disabled;

      button.addEventListener("click", () => {
        if (disabled) {
          return;
        }

        if (allowClickToggle && selectedValue === option.value) {
          onChange(null);
          return;
        }

        onChange(option.value);
      });

      rail.appendChild(button);
    });
  }

  viewport.appendChild(rail);

  let settleTimer = null;
  let commitEnabled = false;

  function getItemHeight() {
    const item = rail.querySelector(".card-wheel-item");
    return item ? item.getBoundingClientRect().height : 48;
  }

  function centerOffset(itemHeight) {
    return (viewport.clientHeight - itemHeight) / 2;
  }

  function normalizeScrollPosition(itemHeight) {
    const segmentHeight = itemHeight * options.length;
    const minScrollTop = (segmentHeight * 0.5) - centerOffset(itemHeight);
    const maxScrollTop = (segmentHeight * 1.5) - centerOffset(itemHeight);

    if (viewport.scrollTop < minScrollTop) {
      viewport.scrollTop += segmentHeight;
    } else if (viewport.scrollTop > maxScrollTop) {
      viewport.scrollTop -= segmentHeight;
    }
  }

  function snapAndCommit() {
    if (!options.length) {
      return;
    }

    const itemHeight = getItemHeight();
    const midOffset = centerOffset(itemHeight);
    const rawIndex = Math.round((viewport.scrollTop + midOffset) / itemHeight);
    const normalizedIndex = normalizeWheelIndex(rawIndex, options.length);
    const enabledIndex = findClosestEnabledIndex(options, normalizedIndex, isDisabled);

    if (enabledIndex === -1) {
      return;
    }

    const targetIndex = options.length + enabledIndex;
    const targetScrollTop = (targetIndex * itemHeight) - midOffset;
    if (Math.abs(viewport.scrollTop - targetScrollTop) > 0.5) {
      viewport.scrollTop = targetScrollTop;
    }
  }

  viewport.addEventListener("scroll", () => {
    const itemHeight = getItemHeight();
    normalizeScrollPosition(itemHeight);

    if (!commitEnabled) {
      return;
    }

    if (settleTimer) {
      window.clearTimeout(settleTimer);
    }

    settleTimer = window.setTimeout(snapAndCommit, WHEEL_SCROLL_DEBOUNCE_MS);
  });

  requestAnimationFrame(() => {
    const itemHeight = getItemHeight();
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
    const initialIndex = options.length + selectedIndex;
    viewport.scrollTop = (initialIndex * itemHeight) - centerOffset(itemHeight);
    requestAnimationFrame(() => {
      commitEnabled = true;
    });
  });

  return viewport;
}

// Composite card picker control (rank wheel + suit buttons).
function buildCardWheelSelect(selectedCard, ownerKey, onChange) {
  const usedCards = collectUsedCards(ownerKey);
  const selectedValue = selectedCard?.rank && selectedCard?.suit ? makeCardKey(selectedCard.rank, selectedCard.suit) : null;
  const selectedRank = selectedCard?.rank || null;
  const selectedSuit = selectedCard?.suit || null;

  const wrap = document.createElement("div");
  wrap.className = "card-wheel-group";

  const wheel = buildVerticalWheel({
    options: RANK_WHEEL_OPTIONS,
    selectedValue: selectedRank,
    onChange: (value) => {
      if (!value) {
        onChange(null);
        return;
      }

      onChange({
        rank: value,
        suit: selectedSuit,
      });
    },
    isDisabled: (option) => {
      if (selectedRank === option.value) {
        return false;
      }

      return SUITS.every((suit) => {
        const cardValue = makeCardKey(option.value, suit.key);
        return usedCards.has(cardValue);
      });
    },
    getText: (option) => option.value,
    getAriaLabel: (option) => `Rank ${option.value}`,
    getItemClass: () => "single-rank-wheel-item",
    allowClickToggle: true,
  });

  const suitRow = document.createElement("div");
  suitRow.className = "card-suit-row";

  SUITS.forEach((suit) => {
    const suitButton = document.createElement("button");
    suitButton.type = "button";

    const hasRank = Boolean(selectedRank);
    const cardValue = hasRank ? makeCardKey(selectedRank, suit.key) : null;
    const disabled = !hasRank || (cardValue !== selectedValue && usedCards.has(cardValue));
    const isActive = hasRank && selectedSuit === suit.key;

    suitButton.className = `card-suit-pill ${suit.colorClass}${isActive ? " active" : ""}`;
    suitButton.textContent = suit.symbol;
    suitButton.setAttribute("aria-label", hasRank ? `${selectedRank} of ${suit.label}` : suit.label);
    suitButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    suitButton.disabled = disabled;

    suitButton.addEventListener("click", () => {
      if (!selectedRank) {
        return;
      }

      if (isActive) {
        onChange({ rank: selectedRank, suit: null });
        return;
      }

      onChange({ rank: selectedRank, suit: suit.key });
    });

    suitRow.appendChild(suitButton);
  });

  wrap.appendChild(wheel);
  wrap.appendChild(suitRow);
  return wrap;
}

// Card rendering and conversion utilities -----------------------------------
function suitMetaByKey(suitKey) {
  return SUITS.find((suit) => suit.key === suitKey) || null;
}

function appendCardMarkup(container, rank, suit) {
  if (!rank || !suit) {
    const empty = document.createElement("span");
    empty.textContent = "-";
    container.appendChild(empty);
    return;
  }

  const suitMeta = suitMetaByKey(suit);
  const rankNode = document.createElement("span");
  rankNode.textContent = rank;

  const suitNode = document.createElement("span");
  suitNode.textContent = suitMeta ? suitMeta.symbol : suit;
  suitNode.className = `card-suit ${suitMeta ? suitMeta.colorClass : ""}`;

  container.appendChild(rankNode);
  container.appendChild(suitNode);
}

function rankNumToText(rankNum) {
  return "--23456789TJQKA"[rankNum] || "?";
}

function cardIntToDisplayParts(cardInt) {
  const { rank, suit } = cardFromInt(cardInt);
  const suitMeta = SUITS[suit] || null;
  return {
    rankText: rankNumToText(rank),
    suitKey: suitMeta ? suitMeta.key : null,
  };
}

function createCardToken(rank, suit) {
  const token = document.createElement("span");
  token.className = "card-token";
  appendCardMarkup(token, rank, suit);
  return token;
}

function createDuplicateCardError(card) {
  const error = new Error("Duplicate card detected.");
  error.code = "DUPLICATE_CARD";
  error.card = card;
  return error;
}

// Top-level UI renderers and randomizers ------------------------------------
function setPlayersAtStart(count) {
  oddsState.playersAtStart = count;
  initializePlayers();
  renderAll();
}

function resetOddsToDefaults() {
  oddsState.playersAtStart = ODDS_PLAYER_COUNTS[0];
  oddsState.board = [null, null, null, null, null];
  initializePlayers();
  renderAll();
}

function renderPlayersGrid() {
  oddsElements.playersGrid.innerHTML = "";
  ODDS_PLAYER_COUNTS.forEach((count) => {
    renderSelectButton(
      oddsElements.playersGrid,
      String(count),
      oddsState.playersAtStart === count,
      () => setPlayersAtStart(count)
    );
  });
}

function renderBoardGrid() {
  oddsElements.boardGrid.innerHTML = "";

  for (let i = 0; i < 5; i += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "board-slot";

    const label = document.createElement("span");
    label.className = "board-slot-label";
    label.textContent = i < 3 ? `Flop ${i + 1}` : i === 3 ? "Turn" : "River";

    const ownerKey = `b-${i}`;
    const cardWheel = buildCardWheelSelect(oddsState.board[i] || null, ownerKey, (card) => {
      oddsState.board[i] = card;
      refreshCardSelectionUI();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(cardWheel);
    oddsElements.boardGrid.appendChild(wrapper);
  }

  const controlsWrap = document.createElement("div");
  controlsWrap.className = "board-slot board-random-controls";

  const controlsLabel = document.createElement("span");
  controlsLabel.className = "board-slot-label";
  controlsLabel.textContent = "Random Board";
  controlsWrap.appendChild(controlsLabel);

  const randomFlopBtn = document.createElement("button");
  randomFlopBtn.type = "button";
  randomFlopBtn.className = "select-btn board-random-btn";
  randomFlopBtn.textContent = "Random Flop";
  randomFlopBtn.addEventListener("click", () => {
    randomizeStreet("flop");
    refreshCardSelectionUI();
    handleCalculateOdds();
  });
  controlsWrap.appendChild(randomFlopBtn);

  const randomTurnBtn = document.createElement("button");
  randomTurnBtn.type = "button";
  randomTurnBtn.className = "select-btn board-random-btn";
  randomTurnBtn.textContent = "Random Turn";
  randomTurnBtn.addEventListener("click", () => {
    randomizeStreet("turn");
    refreshCardSelectionUI();
    handleCalculateOdds();
  });
  controlsWrap.appendChild(randomTurnBtn);

  const randomRiverBtn = document.createElement("button");
  randomRiverBtn.type = "button";
  randomRiverBtn.className = "select-btn board-random-btn";
  randomRiverBtn.textContent = "Random River";
  randomRiverBtn.addEventListener("click", () => {
    randomizeStreet("river");
    refreshCardSelectionUI();
    handleCalculateOdds();
  });
  controlsWrap.appendChild(randomRiverBtn);

  oddsElements.boardGrid.appendChild(controlsWrap);
}

function buildAvailableDeckInts() {
  const used = collectUsedCards();
  const available = [];

  for (let cardInt = 0; cardInt < 52; cardInt += 1) {
    const { rankText, suitKey } = cardIntToDisplayParts(cardInt);
    const key = makeCardKey(rankText, suitKey);
    if (!used.has(key)) {
      available.push(cardInt);
    }
  }

  return available;
}

function drawRandomAvailableCard() {
  const available = buildAvailableDeckInts();
  if (!available.length) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  const selectedInt = available[randomIndex];
  const { rankText, suitKey } = cardIntToDisplayParts(selectedInt);
  return { rank: rankText, suit: suitKey };
}

function randomizeStreet(street) {
  const ensureFlop = street === "flop" || street === "turn" || street === "river";
  const ensureTurn = street === "turn" || street === "river";

  if (ensureFlop) {
    for (let i = 0; i < 3; i += 1) {
      oddsState.board[i] = drawRandomAvailableCard();
    }
  }

  if (ensureTurn) {
    oddsState.board[3] = drawRandomAvailableCard();
  }

  if (street === "river") {
    oddsState.board[4] = drawRandomAvailableCard();
  }
}

function renderPlayerRows() {
  oddsElements.playerRows.innerHTML = "";

  oddsState.players.forEach((player, playerIndex) => {
    const row = document.createElement("div");
    row.className = "player-row";

    const header = document.createElement("div");
    header.className = "player-header";

    const title = document.createElement("h3");
    title.className = "player-title";
    title.textContent = `Player ${player.seat}`;

    const summary = document.createElement("div");
    summary.className = "player-summary";

    const summaryLabel = document.createElement("span");
    summaryLabel.textContent = "Cards: ";

    const cardOne = document.createElement("span");
    cardOne.className = "player-card-display";
    appendCardMarkup(cardOne, player.cards[0]?.rank, player.cards[0]?.suit);

    const spacer = document.createElement("span");
    spacer.textContent = " ";

    const cardTwo = document.createElement("span");
    cardTwo.className = "player-card-display";
    appendCardMarkup(cardTwo, player.cards[1]?.rank, player.cards[1]?.suit);

    summary.appendChild(summaryLabel);
    summary.appendChild(cardOne);
    summary.appendChild(spacer);
    summary.appendChild(cardTwo);

    header.appendChild(title);
    header.appendChild(summary);

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "player-cards";

    for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
      const cardShell = document.createElement("div");
      cardShell.className = "card-slot";

      const cardLabel = document.createElement("span");
      cardLabel.className = "board-slot-label";
      cardLabel.textContent = `Card ${cardIndex + 1}`;

      const ownerKey = `p-${playerIndex}-c-${cardIndex}`;
      const cardWheel = buildCardWheelSelect(player.cards[cardIndex] || null, ownerKey, (card) => {
        player.cards[cardIndex] = card;
        refreshCardSelectionUI();
      });

      cardShell.appendChild(cardLabel);
      cardShell.appendChild(cardWheel);
      cardsWrap.appendChild(cardShell);
    }

    row.appendChild(header);
    row.appendChild(cardsWrap);
    oddsElements.playerRows.appendChild(row);
  });
}

function renderAll() {
  renderPlayersGrid();
  renderBoardGrid();
  renderPlayerRows();
  oddsElements.boardsEvaluated.textContent = "-";
  oddsElements.results.innerHTML = "";
  setStatus("-", "pending");
}

// Poker hand evaluator -------------------------------------------------------
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

// Scenario validation + exact probability engine ----------------------------
function validateAndBuildScenario() {
  const boardState = oddsState.board.map((card) => {
    if (!card) {
      return "empty";
    }

    if (card.rank && card.suit) {
      return "complete";
    }

    return "partial";
  });

  const firstPartialIndex = boardState.findIndex((entry) => entry === "partial");
  if (firstPartialIndex >= 0) {
    throw new Error(`Board card ${firstPartialIndex + 1} is incomplete.`);
  }

  const complete = boardState.map((entry) => entry === "complete");
  const flopComplete = complete[0] && complete[1] && complete[2];
  const anyFlopCard = complete[0] || complete[1] || complete[2];

  if (anyFlopCard && !flopComplete) {
    throw new Error("Complete all three flop cards before calculating post-flop odds.");
  }

  if (!flopComplete && (complete[3] || complete[4])) {
    throw new Error("Enter all flop cards before turn or river.");
  }

  if (!complete[3] && complete[4]) {
    throw new Error("Enter the turn card before the river card.");
  }

  let boardCount = 0;
  if (flopComplete) {
    boardCount = complete[3] ? (complete[4] ? 5 : 4) : 3;
  }

  const stage = stageByBoardCount(boardCount);
  const knownBoardCards = [];
  const cardOwners = new Map();

  const activePlayers = [];

  for (let i = 0; i < oddsState.players.length; i += 1) {
    const player = oddsState.players[i];
    const cardA = player.cards[0];
    const cardB = player.cards[1];

    if (!cardA?.rank || !cardA?.suit || !cardB?.rank || !cardB?.suit) {
      throw new Error(`Player ${player.seat} must have two complete cards.`);
    }

    const cards = [cardA, cardB];
    const ints = cards.map((card) => {
      const cardInt = cardToInt(card);
      const label = `${card.rank}${card.suit}`;

      if (cardOwners.has(cardInt)) {
        throw createDuplicateCardError({ rank: card.rank, suit: card.suit, label });
      }

      cardOwners.set(cardInt, `Player ${player.seat}`);
      return cardInt;
    });

    activePlayers.push({ seat: player.seat, hole: ints });
  }

  if (activePlayers.length < 2) {
    throw new Error("At least two players are required.");
  }

  for (let i = 0; i < boardCount; i += 1) {
    const boardCard = oddsState.board[i];

    const cardInt = cardToInt(boardCard);
    const label = `${boardCard.rank}${boardCard.suit}`;
    if (cardOwners.has(cardInt)) {
      throw createDuplicateCardError({ rank: boardCard.rank, suit: boardCard.suit, label });
    }

    cardOwners.set(cardInt, "Board");
    knownBoardCards.push(cardInt);
  }

  const knownCards = new Set(cardOwners.keys());
  const remainingDeck = [];
  for (let cardInt = 0; cardInt < 52; cardInt += 1) {
    if (!knownCards.has(cardInt)) {
      remainingDeck.push(cardInt);
    }
  }

  return {
    stage,
    activePlayers,
    knownBoardCards,
    remainingDeck,
  };
}

function enumerateCombinations(source, choose, onCombination) {
  if (choose === 0) {
    onCombination([]);
    return;
  }

  const current = Array(choose).fill(0);

  function walk(start, depth) {
    if (depth === choose) {
      onCombination([...current]);
      return;
    }

    const maxStart = source.length - (choose - depth);
    for (let i = start; i <= maxStart; i += 1) {
      current[depth] = source[i];
      walk(i + 1, depth + 1);
    }
  }

  walk(0, 0);
}

// Evaluates winner indices for a specific board realization.
function evaluateWinnersOnBoard(activePlayers, boardCards) {
  let bestRank = null;
  const winners = [];

  activePlayers.forEach((player, idx) => {
    const rankVector = evaluateSevenCards([player.hole[0], player.hole[1], ...boardCards]);

    if (!bestRank || compareRankVectors(rankVector, bestRank) > 0) {
      bestRank = rankVector;
      winners.length = 0;
      winners.push(idx);
      return;
    }

    if (compareRankVectors(rankVector, bestRank) === 0) {
      winners.push(idx);
    }
  });

  return { winners };
}

// Turn-only helper: identifies river outs that convert losing/tied states.
function calculateTurnOuts(scenario) {
  if (scenario.knownBoardCards.length !== 4) {
    return [];
  }

  const turnResult = evaluateWinnersOnBoard(scenario.activePlayers, scenario.knownBoardCards);
  const leaders = new Set(turnResult.winners);
  const behindIndices = scenario.activePlayers
    .map((_, idx) => idx)
    .filter((idx) => !leaders.has(idx));

  if (!behindIndices.length) {
    return [];
  }

  const outsByPlayer = new Map();
  behindIndices.forEach((idx) => {
    outsByPlayer.set(idx, { winOuts: [], tieOuts: [] });
  });

  scenario.remainingDeck.forEach((riverCard) => {
    const board = [...scenario.knownBoardCards, riverCard];
    const result = evaluateWinnersOnBoard(scenario.activePlayers, board);

    behindIndices.forEach((idx) => {
      if (!result.winners.includes(idx)) {
        return;
      }

      const bucket = outsByPlayer.get(idx);
      if (result.winners.length === 1) {
        bucket.winOuts.push(riverCard);
      } else {
        bucket.tieOuts.push(riverCard);
      }
    });
  });

  return behindIndices.map((idx) => ({
    seat: scenario.activePlayers[idx].seat,
    winOuts: outsByPlayer.get(idx).winOuts,
    tieOuts: outsByPlayer.get(idx).tieOuts,
  }));
}

// Exact equity calculator by exhaustive board enumeration.
function calculateExactOdds(scenario) {
  const unknownBoardCount = 5 - scenario.knownBoardCards.length;
  const totals = {
    boards: 0,
    wins: Array(scenario.activePlayers.length).fill(0),
    ties: Array(scenario.activePlayers.length).fill(0),
    equity: Array(scenario.activePlayers.length).fill(0),
  };

  enumerateCombinations(scenario.remainingDeck, unknownBoardCount, (drawn) => {
    const board = scenario.knownBoardCards.concat(drawn);

    let bestRank = null;
    const winners = [];

    scenario.activePlayers.forEach((player, idx) => {
      const rankVector = evaluateSevenCards([player.hole[0], player.hole[1], ...board]);

      if (!bestRank || compareRankVectors(rankVector, bestRank) > 0) {
        bestRank = rankVector;
        winners.length = 0;
        winners.push(idx);
        return;
      }

      if (compareRankVectors(rankVector, bestRank) === 0) {
        winners.push(idx);
      }
    });

    totals.boards += 1;

    if (winners.length === 1) {
      totals.wins[winners[0]] += 1;
      totals.equity[winners[0]] += 1;
      return;
    }

    const split = 1 / winners.length;
    winners.forEach((winnerIndex) => {
      totals.ties[winnerIndex] += 1;
      totals.equity[winnerIndex] += split;
    });
  });

  return totals;
}

// Result table renderer (including current best hand labels and outs display).
function renderOddsResults(scenario, totals) {
  oddsElements.boardsEvaluated.textContent = totals.boards.toLocaleString();
  oddsElements.results.innerHTML = "";

  const boardWrap = document.createElement("div");
  boardWrap.className = "board-display";

  const boardLabel = document.createElement("span");
  boardLabel.className = "board-display-label";
  boardLabel.textContent = "Current Board:";
  boardWrap.appendChild(boardLabel);

  if (scenario.knownBoardCards.length === 0) {
    const emptyBoard = document.createElement("span");
    emptyBoard.className = "board-display-empty";
    emptyBoard.textContent = "-";
    boardWrap.appendChild(emptyBoard);
  } else {
    scenario.knownBoardCards.forEach((cardInt) => {
      const { rankText, suitKey } = cardIntToDisplayParts(cardInt);
      boardWrap.appendChild(createCardToken(rankText, suitKey));
    });
  }

  oddsElements.results.appendChild(boardWrap);

  const table = document.createElement("table");
  table.className = "odds-table";

  const thead = document.createElement("thead");
  const showOutsColumn = scenario.knownBoardCards.length === 4;
  thead.innerHTML = showOutsColumn
    ? "<tr><th>Player</th><th>Win %</th><th>Tie %</th><th>Equity %</th></tr>"
    : "<tr><th>Player</th><th>Win %</th><th>Tie %</th><th>Equity %</th></tr>";

  const tbody = document.createElement("tbody");
  const turnOuts = showOutsColumn ? calculateTurnOuts(scenario) : [];
  const outsBySeat = new Map(turnOuts.map((entry) => [entry.seat, entry]));
  const handLabelBySeat = new Map();
  let bestCurrentRank = null;
  const leadingSeats = [];

  scenario.activePlayers.forEach((player) => {
    const currentRankVector = evaluateSevenCards([player.hole[0], player.hole[1], ...scenario.knownBoardCards]);
    handLabelBySeat.set(player.seat, handCategoryLabel(currentRankVector));

    if (!bestCurrentRank || compareRankVectors(currentRankVector, bestCurrentRank) > 0) {
      bestCurrentRank = currentRankVector;
      leadingSeats.length = 0;
      leadingSeats.push(player.seat);
      return;
    }

    if (compareRankVectors(currentRankVector, bestCurrentRank) === 0) {
      leadingSeats.push(player.seat);
    }
  });

  const leadersAreTied = leadingSeats.length > 1;
  const isRiver = scenario.knownBoardCards.length === 5;
  const leadLabel = isRiver
    ? (leadersAreTied ? "Winner - Tie" : "Winner")
    : (leadersAreTied ? "Leader - Tie" : "Leader");
  const leadLabelBySeat = new Map();
  leadingSeats.forEach((seat) => {
    leadLabelBySeat.set(seat, leadLabel);
  });

  scenario.activePlayers.forEach((player, idx) => {
    const row = document.createElement("tr");
    if (showOutsColumn) {
      row.className = "player-main-row";
    }

    const winPct = ((totals.wins[idx] / totals.boards) * 100).toFixed(2);
    const tiePct = ((totals.ties[idx] / totals.boards) * 100).toFixed(2);
    const equityPct = ((totals.equity[idx] / totals.boards) * 100).toFixed(2);

    const playerCell = document.createElement("td");
    playerCell.className = "results-player-cell";

    const playerLabel = document.createElement("div");
    playerLabel.className = "results-player-label";
    playerLabel.textContent = `Player ${player.seat}`;
    playerCell.appendChild(playerLabel);

    const handCell = document.createElement("div");
    handCell.className = "results-hand-cell";
    player.hole.forEach((cardInt) => {
      const { rankText, suitKey } = cardIntToDisplayParts(cardInt);
      handCell.appendChild(createCardToken(rankText, suitKey));
    });

    const handValueLabel = handLabelBySeat.get(player.seat);
    if (handValueLabel) {
      const handType = document.createElement("span");
      handType.className = "winner-hand-label";
      handType.textContent = handValueLabel;
      handCell.appendChild(handType);

      const leadText = leadLabelBySeat.get(player.seat);
      if (leadText) {
        const leadIndicator = document.createElement("span");
        leadIndicator.className = "lead-status-label";
        leadIndicator.textContent = leadText;
        handCell.appendChild(leadIndicator);
      }
    }
    playerCell.appendChild(handCell);

    const winCell = document.createElement("td");
    winCell.textContent = winPct;

    const tieCell = document.createElement("td");
    tieCell.textContent = tiePct;

    const equityCell = document.createElement("td");
    equityCell.textContent = equityPct;

    row.appendChild(playerCell);
    row.appendChild(winCell);
    row.appendChild(tieCell);
    row.appendChild(equityCell);
    tbody.appendChild(row);

    if (showOutsColumn) {
      const outsRow = document.createElement("tr");
      outsRow.className = "player-outs-row";

      const outsCell = document.createElement("td");
      outsCell.className = "outs-cell";
      outsCell.colSpan = 4;

      const outsLabel = document.createElement("div");
      outsLabel.className = "outs-label";
      outsLabel.textContent = "Outs";
      outsCell.appendChild(outsLabel);

      const playerOuts = outsBySeat.get(player.seat);
      if (!playerOuts || (playerOuts.winOuts.length === 0 && playerOuts.tieOuts.length === 0)) {
        const none = document.createElement("div");
        none.className = "outs-none";
        none.textContent = "-";
        outsCell.appendChild(none);
      } else {
        const counts = document.createElement("div");
        counts.className = "outs-counts";
        counts.textContent = `W:${playerOuts.winOuts.length} T:${playerOuts.tieOuts.length}`;
        outsCell.appendChild(counts);

        const cards = document.createElement("div");
        cards.className = "outs-cards";

        const combined = [
          ...playerOuts.winOuts.map((cardInt) => ({ cardInt, type: "win" })),
          ...playerOuts.tieOuts.map((cardInt) => ({ cardInt, type: "tie" })),
        ];

        combined.forEach((entry) => {
          const { rankText, suitKey } = cardIntToDisplayParts(entry.cardInt);
          const token = createCardToken(rankText, suitKey);
          token.classList.add(entry.type === "win" ? "out-win" : "out-tie");
          cards.appendChild(token);
        });

        outsCell.appendChild(cards);
      }

      outsRow.appendChild(outsCell);
      tbody.appendChild(outsRow);
    }
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  oddsElements.results.appendChild(table);
}

// Primary user action pipeline: validate input, compute exact odds, render.
async function handleCalculateOdds() {
  try {
    oddsElements.calculateButton.disabled = true;
    setStatus("Calculating exact probabilities...", "info");
    oddsElements.results.innerHTML = "";
    oddsElements.boardsEvaluated.textContent = "-";

    await new Promise((resolve) => setTimeout(resolve, 0));

    const scenario = validateAndBuildScenario();
    const totals = calculateExactOdds(scenario);

    renderOddsResults(scenario, totals);
    setStatus("Calculation Complete", "raise");
  } catch (error) {
    if (error && error.code === "DUPLICATE_CARD" && error.card) {
      setStatusRich((container) => {
        const textNode = document.createElement("span");
        textNode.textContent = "Duplicate card detected: ";
        const token = createCardToken(error.card.rank, error.card.suit);
        token.classList.add("status-inline-token");
        const endNode = document.createElement("span");
        endNode.textContent = ".";

        container.appendChild(textNode);
        container.appendChild(token);
        container.appendChild(endNode);
      }, "fold");
    } else {
      setStatus(error.message || "Unable to calculate odds", "fold");
    }

    oddsElements.results.innerHTML = "";
    oddsElements.boardsEvaluated.textContent = "-";
  } finally {
    oddsElements.calculateButton.disabled = false;
  }
}

// Odds page bootstrap.
function initOddsPage() {
  renderBuildTag();
  initializePlayers();
  renderAll();
  oddsElements.calculateButton.addEventListener("click", handleCalculateOdds);
  oddsElements.resetButton.addEventListener("click", resetOddsToDefaults);
}

initOddsPage();
