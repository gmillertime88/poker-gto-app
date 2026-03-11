const ODDS_PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9];
const ODDS_STAGES = [
  { key: "preflop", label: "Pre-flop", boardCount: 0, streetIndex: 0 },
  { key: "flop", label: "Post-flop", boardCount: 3, streetIndex: 1 },
  { key: "turn", label: "Post-turn", boardCount: 4, streetIndex: 2 },
  { key: "river", label: "Post-river", boardCount: 5, streetIndex: 3 },
];
const STREET_KEYS = ["preflop", "flop", "turn", "river"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS = [
  { key: "S", label: "Spades" },
  { key: "H", label: "Hearts" },
  { key: "D", label: "Diamonds" },
  { key: "C", label: "Clubs" },
];

const oddsState = {
  playersAtStart: 5,
  stage: "preflop",
  players: [],
  board: [null, null, null, null, null],
};

const oddsElements = {
  playersGrid: document.getElementById("odds-players-grid"),
  stageGrid: document.getElementById("odds-stage-grid"),
  boardGrid: document.getElementById("board-grid"),
  playerRows: document.getElementById("player-rows"),
  calculateButton: document.getElementById("calculate-odds-btn"),
  status: document.getElementById("odds-status"),
  boardsEvaluated: document.getElementById("boards-evaluated"),
  results: document.getElementById("odds-results"),
};

function initializePlayers() {
  oddsState.players = Array.from({ length: oddsState.playersAtStart }, (_, i) => ({
    seat: i + 1,
    cards: [null, null],
    inHand: {
      preflop: true,
      flop: true,
      turn: true,
      river: true,
    },
  }));
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
  oddsElements.status.className = `value badge ${statusClass}`;
  oddsElements.status.textContent = message;
}

function stageByKey(stageKey) {
  return ODDS_STAGES.find((stage) => stage.key === stageKey) || ODDS_STAGES[0];
}

function buildRankSelect(selectedRank, onChange) {
  const select = document.createElement("select");
  select.className = "card-select";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Rank";
  select.appendChild(placeholder);

  RANKS.forEach((rank) => {
    const option = document.createElement("option");
    option.value = rank;
    option.textContent = rank;
    if (selectedRank === rank) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener("change", (event) => {
    onChange(event.target.value || null);
  });

  return select;
}

function buildSuitSelect(selectedSuit, onChange) {
  const select = document.createElement("select");
  select.className = "card-select";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Suit";
  select.appendChild(placeholder);

  SUITS.forEach((suit) => {
    const option = document.createElement("option");
    option.value = suit.key;
    option.textContent = suit.key;
    if (selectedSuit === suit.key) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener("change", (event) => {
    onChange(event.target.value || null);
  });

  return select;
}

function cardLabel(rank, suit) {
  if (!rank || !suit) {
    return "-";
  }
  return `${rank}${suit}`;
}

function setPlayersAtStart(count) {
  oddsState.playersAtStart = count;
  initializePlayers();
  renderAll();
}

function setStage(stageKey) {
  oddsState.stage = stageKey;
  renderBoardGrid();
  renderPlayerRows();
}

function updatePlayerStreetState(playerIndex, streetIndex, checked) {
  const player = oddsState.players[playerIndex];
  const street = STREET_KEYS[streetIndex];
  player.inHand[street] = checked;

  if (checked) {
    for (let i = 0; i < streetIndex; i += 1) {
      player.inHand[STREET_KEYS[i]] = true;
    }
  } else {
    for (let i = streetIndex + 1; i < STREET_KEYS.length; i += 1) {
      player.inHand[STREET_KEYS[i]] = false;
    }
  }

  renderPlayerRows();
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

function renderStageGrid() {
  oddsElements.stageGrid.innerHTML = "";
  ODDS_STAGES.forEach((stage) => {
    renderSelectButton(
      oddsElements.stageGrid,
      stage.label,
      oddsState.stage === stage.key,
      () => setStage(stage.key)
    );
  });
}

function renderBoardGrid() {
  const selectedStage = stageByKey(oddsState.stage);
  const activeCards = selectedStage.boardCount;

  oddsElements.boardGrid.innerHTML = "";

  for (let i = 0; i < 5; i += 1) {
    if (i >= activeCards) {
      oddsState.board[i] = null;
    }

    const wrapper = document.createElement("div");
    wrapper.className = `board-slot${i < activeCards ? "" : " disabled"}`;

    const label = document.createElement("span");
    label.className = "board-slot-label";
    label.textContent = i < 3 ? `Flop ${i + 1}` : i === 3 ? "Turn" : "River";

    const rankSelect = buildRankSelect(oddsState.board[i]?.rank || null, (rank) => {
      const current = oddsState.board[i] || {};
      oddsState.board[i] = rank && current.suit ? { rank, suit: current.suit } : rank ? { rank, suit: null } : null;
    });

    const suitSelect = buildSuitSelect(oddsState.board[i]?.suit || null, (suit) => {
      const current = oddsState.board[i] || {};
      oddsState.board[i] = suit && current.rank ? { rank: current.rank, suit } : suit ? { rank: null, suit } : null;
    });

    rankSelect.disabled = i >= activeCards;
    suitSelect.disabled = i >= activeCards;

    wrapper.appendChild(label);
    wrapper.appendChild(rankSelect);
    wrapper.appendChild(suitSelect);
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

      const rankSelect = buildRankSelect(player.cards[cardIndex]?.rank || null, (rank) => {
        const current = player.cards[cardIndex] || {};
        player.cards[cardIndex] = rank && current.suit ? { rank, suit: current.suit } : rank ? { rank, suit: null } : null;
      });

      const suitSelect = buildSuitSelect(player.cards[cardIndex]?.suit || null, (suit) => {
        const current = player.cards[cardIndex] || {};
        player.cards[cardIndex] = suit && current.rank ? { rank: current.rank, suit } : suit ? { rank: null, suit } : null;
      });

      cardShell.appendChild(rankSelect);
      cardShell.appendChild(suitSelect);
      cardsWrap.appendChild(cardShell);
    }

    const streetWrap = document.createElement("div");
    streetWrap.className = "street-status-grid";

    STREET_KEYS.forEach((street, streetIndex) => {
      const label = document.createElement("label");
      label.className = "street-status-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!player.inHand[street];
      checkbox.addEventListener("change", (event) => {
        updatePlayerStreetState(playerIndex, streetIndex, event.target.checked);
      });

      const streetName = document.createElement("span");
      streetName.textContent = street === "preflop"
        ? "Pre"
        : street === "flop"
          ? "Flop"
          : street === "turn"
            ? "Turn"
            : "River";

      label.appendChild(checkbox);
      label.appendChild(streetName);
      streetWrap.appendChild(label);
    });

    const summary = document.createElement("div");
    summary.className = "player-summary";
    summary.textContent = `Cards: ${cardLabel(player.cards[0]?.rank, player.cards[0]?.suit)} ${cardLabel(player.cards[1]?.rank, player.cards[1]?.suit)}`;

    row.appendChild(title);
    row.appendChild(cardsWrap);
    row.appendChild(streetWrap);
    row.appendChild(summary);
    oddsElements.playerRows.appendChild(row);
  });
}

function renderAll() {
  renderPlayersGrid();
  renderStageGrid();
  renderBoardGrid();
  renderPlayerRows();
  oddsElements.boardsEvaluated.textContent = "-";
  oddsElements.results.innerHTML = "";
  setStatus("Enter hands and click Calculate Odds", "pending");
}

function cardToInt(card) {
  const rank = RANKS.indexOf(card.rank) + 2;
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

function validateAndBuildScenario() {
  const stage = stageByKey(oddsState.stage);
  const activeStreet = STREET_KEYS[stage.streetIndex];
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
        throw new Error(`Duplicate card detected: ${label}.`);
      }

      cardOwners.set(cardInt, `Player ${player.seat}`);
      return cardInt;
    });

    if (player.inHand[activeStreet]) {
      activePlayers.push({ seat: player.seat, hole: ints });
    }
  }

  if (activePlayers.length < 2) {
    throw new Error("At least two players must be marked in hand at the selected stage.");
  }

  for (let i = 0; i < stage.boardCount; i += 1) {
    const boardCard = oddsState.board[i];
    if (!boardCard?.rank || !boardCard?.suit) {
      throw new Error(`Board card ${i + 1} must be fully selected for ${stage.label}.`);
    }

    const cardInt = cardToInt(boardCard);
    const label = `${boardCard.rank}${boardCard.suit}`;
    if (cardOwners.has(cardInt)) {
      throw new Error(`Duplicate card detected: ${label}.`);
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

  const table = document.createElement("table");
  table.className = "odds-table";

  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Player</th><th>Win %</th><th>Tie %</th><th>Equity %</th></tr>";

  const tbody = document.createElement("tbody");

  scenario.activePlayers.forEach((player, idx) => {
    const row = document.createElement("tr");

    const winPct = ((totals.wins[idx] / totals.boards) * 100).toFixed(2);
    const tiePct = ((totals.ties[idx] / totals.boards) * 100).toFixed(2);
    const equityPct = ((totals.equity[idx] / totals.boards) * 100).toFixed(2);

    row.innerHTML = `<td>Player ${player.seat}</td><td>${winPct}</td><td>${tiePct}</td><td>${equityPct}</td>`;
    tbody.appendChild(row);
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
    setStatus(error.message || "Unable to calculate odds", "fold");
    oddsElements.results.innerHTML = "";
    oddsElements.boardsEvaluated.textContent = "-";
  } finally {
    oddsElements.calculateButton.disabled = false;
  }
}

function initOddsPage() {
  initializePlayers();
  renderAll();
  oddsElements.calculateButton.addEventListener("click", handleCalculateOdds);
}

initOddsPage();
