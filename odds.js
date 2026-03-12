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

const BUILD_VERSION = "1.8";
const BUILD_TIMESTAMP = "2026-03-12 15:46";

const oddsState = {
  playersAtStart: 2,
  players: [],
  board: [null, null, null, null, null],
  rankScrollByOwner: {},
  rankEnsureVisibleByOwner: {},
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

function renderBuildTag() {
  if (!oddsElements.buildTag) {
    return;
  }

  oddsElements.buildTag.textContent = `v${BUILD_VERSION} • ${BUILD_TIMESTAMP}`;
}

function initializePlayers() {
  oddsState.players = Array.from({ length: oddsState.playersAtStart }, (_, i) => ({
    seat: i + 1,
    cards: [null, null],
  }));

  oddsState.rankScrollByOwner = {};
  oddsState.rankEnsureVisibleByOwner = {};
}

function renderSelectButton(grid, label, isActive, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `select-btn${isActive ? " active" : ""}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  grid.appendChild(button);
}

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

function restoreRankScrollerView(scroller, ownerKey) {
  requestAnimationFrame(() => {
    const savedScrollLeft = oddsState.rankScrollByOwner[ownerKey] || 0;
    if (savedScrollLeft > 0) {
      scroller.scrollLeft = savedScrollLeft;
    }

    const pendingRank = oddsState.rankEnsureVisibleByOwner[ownerKey] || null;
    if (!pendingRank) {
      return;
    }

    const activeButton = scroller.querySelector(`.card-rank-btn[data-rank="${pendingRank}"]`);
    if (!activeButton) {
      delete oddsState.rankEnsureVisibleByOwner[ownerKey];
      return;
    }

    activeButton.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    oddsState.rankScrollByOwner[ownerKey] = scroller.scrollLeft;
    delete oddsState.rankEnsureVisibleByOwner[ownerKey];
  });
}

function buildRankSelect(selectedRank, selectedSuit, ownerKey, onChange) {
  const scroller = document.createElement("div");
  scroller.className = "card-rank-scroller";
  const usedCards = collectUsedCards(ownerKey);

  scroller.addEventListener("scroll", () => {
    oddsState.rankScrollByOwner[ownerKey] = scroller.scrollLeft;
  });

  RANKS.forEach((rank) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-rank-btn";
    button.textContent = rank;
    button.dataset.rank = rank;
    button.setAttribute("aria-label", `Rank ${rank}`);
    button.setAttribute("aria-pressed", selectedRank === rank ? "true" : "false");

    if (selectedSuit) {
      const cardKey = makeCardKey(rank, selectedSuit);
      button.disabled = usedCards.has(cardKey) && rank !== selectedRank;
    }

    if (selectedRank === rank) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      const selectingNewRank = selectedRank !== rank;
      oddsState.rankScrollByOwner[ownerKey] = scroller.scrollLeft;
      if (selectingNewRank) {
        oddsState.rankEnsureVisibleByOwner[ownerKey] = rank;
      } else {
        delete oddsState.rankEnsureVisibleByOwner[ownerKey];
      }

      onChange(selectingNewRank ? rank : null);
    });

    scroller.appendChild(button);
  });

  restoreRankScrollerView(scroller, ownerKey);

  return scroller;
}

function buildSuitSelect(selectedRank, selectedSuit, ownerKey, onChange) {
  const select = document.createElement("select");
  select.className = "card-select";
  const usedCards = collectUsedCards(ownerKey);

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Suit";
  select.appendChild(placeholder);

  SUITS.forEach((suit) => {
    const option = document.createElement("option");
    option.value = suit.key;
    option.textContent = `${suit.symbol} ${suit.label}`;
    option.style.color = suit.colorClass === "suit-red" ? "#f87171" : "#e2e8f0";
    if (selectedRank) {
      const cardKey = makeCardKey(selectedRank, suit.key);
      option.disabled = usedCards.has(cardKey) && suit.key !== selectedSuit;
    }
    if (selectedSuit === suit.key) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener("change", (event) => {
    const suitKey = event.target.value || null;
    updateSuitSelectColor(select, suitKey);
    onChange(suitKey);
  });

  updateSuitSelectColor(select, selectedSuit || null);

  return select;
}

function buildSuitSymbolPicker(selectedRank, selectedSuit, ownerKey, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "suit-picker";

  const usedCards = collectUsedCards(ownerKey);
  const rankSelected = Boolean(selectedRank);

  SUITS.forEach((suit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `suit-symbol-btn ${suit.colorClass}`;
    button.textContent = suit.symbol;
    button.title = suit.label;
    button.setAttribute("aria-label", suit.label);

    if (selectedSuit === suit.key) {
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }

    const duplicateBlocked = rankSelected && usedCards.has(makeCardKey(selectedRank, suit.key)) && suit.key !== selectedSuit;
    button.disabled = !rankSelected || duplicateBlocked;

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      onChange(selectedSuit === suit.key ? null : suit.key);
    });

    wrap.appendChild(button);
  });

  return wrap;
}

function suitMetaByKey(suitKey) {
  return SUITS.find((suit) => suit.key === suitKey) || null;
}

function updateSuitSelectColor(select, suitKey) {
  const suitMeta = suitMetaByKey(suitKey);
  if (!suitMeta) {
    select.style.color = "";
    return;
  }

  select.style.color = suitMeta.colorClass === "suit-red" ? "#fca5a5" : "#e5e7eb";
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
    const rankSelect = buildRankSelect(
      oddsState.board[i]?.rank || null,
      oddsState.board[i]?.suit || null,
      ownerKey,
      (rank) => {
        const current = oddsState.board[i] || {};
        oddsState.board[i] = rank && current.suit ? { rank, suit: current.suit } : rank ? { rank, suit: null } : null;
        refreshCardSelectionUI();
      }
    );

    const suitPicker = buildSuitSymbolPicker(
      oddsState.board[i]?.rank || null,
      oddsState.board[i]?.suit || null,
      ownerKey,
      (suit) => {
        const current = oddsState.board[i] || {};
        oddsState.board[i] = suit && current.rank ? { rank: current.rank, suit } : suit ? { rank: null, suit } : null;
        refreshCardSelectionUI();
      }
    );

    wrapper.appendChild(label);
    wrapper.appendChild(rankSelect);
    wrapper.appendChild(suitPicker);
    oddsElements.boardGrid.appendChild(wrapper);
  }
}

function renderPlayerRows() {
  oddsElements.playerRows.innerHTML = "";

  oddsState.players.forEach((player, playerIndex) => {
    const row = document.createElement("div");
    row.className = "player-row";

    const title = document.createElement("h3");
    title.className = "player-title";
    title.textContent = `Player ${player.seat}`;

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "player-cards";

    for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
      const cardShell = document.createElement("div");
      cardShell.className = "card-slot";

      const ownerKey = `p-${playerIndex}-c-${cardIndex}`;
      const rankSelect = buildRankSelect(
        player.cards[cardIndex]?.rank || null,
        player.cards[cardIndex]?.suit || null,
        ownerKey,
        (rank) => {
          const current = player.cards[cardIndex] || {};
          player.cards[cardIndex] = rank && current.suit ? { rank, suit: current.suit } : rank ? { rank, suit: null } : null;
          refreshCardSelectionUI();
        }
      );

      const suitPicker = buildSuitSymbolPicker(
        player.cards[cardIndex]?.rank || null,
        player.cards[cardIndex]?.suit || null,
        ownerKey,
        (suit) => {
          const current = player.cards[cardIndex] || {};
          player.cards[cardIndex] = suit && current.rank ? { rank: current.rank, suit } : suit ? { rank: null, suit } : null;
          refreshCardSelectionUI();
        }
      );

      cardShell.appendChild(rankSelect);
      cardShell.appendChild(suitPicker);
      cardsWrap.appendChild(cardShell);
    }

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

    row.appendChild(title);
    row.appendChild(cardsWrap);
    row.appendChild(summary);
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
  const winnerHandBySeat = new Map();

  if (scenario.knownBoardCards.length === 5) {
    let bestRank = null;
    const winners = [];

    scenario.activePlayers.forEach((player, idx) => {
      const rankVector = evaluateSevenCards([player.hole[0], player.hole[1], ...scenario.knownBoardCards]);

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

    const winnerLabel = handCategoryLabel(bestRank || [0]);
    winners.forEach((winnerIndex) => {
      winnerHandBySeat.set(scenario.activePlayers[winnerIndex].seat, winnerLabel);
    });
  }

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

    const winnerHandLabel = winnerHandBySeat.get(player.seat);
    if (winnerHandLabel) {
      const handType = document.createElement("span");
      handType.className = "winner-hand-label";
      handType.textContent = winnerHandLabel;
      handCell.appendChild(handType);
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
    setStatus("Calculation complete", "raise");
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

function initOddsPage() {
  renderBuildTag();
  initializePlayers();
  renderAll();
  oddsElements.calculateButton.addEventListener("click", handleCalculateOdds);
  oddsElements.resetButton.addEventListener("click", resetOddsToDefaults);
}

initOddsPage();
