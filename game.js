const state = {
    score: 0,
    currentRound: 'jeopardy', // 'jeopardy', 'double_jeopardy', 'final_jeopardy'
    allGames: [],
    selectedGame: null,
    usedClues: new Set(),
    yearRange: [1984, 2024]
};

// UI Elements
const setupScreen = document.getElementById('setup-screen');
const scoreEl = document.getElementById('score');
const loadingTxt = document.getElementById('loading-txt');

// Clue Text/Buttons Elements
const activeClueEl = document.getElementById('active-clue');
const activeAnswerEl = document.getElementById('active-answer');
const activeAnswerTextEl = document.getElementById('active-answer-text');
const passBtn = document.getElementById('pass-btn');
const guessBtn = document.getElementById('guess-btn');
const correctBtn = document.getElementById('correct-btn');
const incorrectBtn = document.getElementById('incorrect-btn');

// Sequence State Elements
const roundIntroContainer = document.getElementById('round-intro-container');
const clueContainer = document.getElementById('clue-container');
const roundCompleteContainer = document.getElementById('round-complete-container');
const finalJeopardyContainer = document.getElementById('final-jeopardy-container');
const endGameContainer = document.getElementById('end-game-container');

// Intro Elements
const introRoundName = document.getElementById('intro-round-name');
const introCategoryName = document.getElementById('intro-category-name');
const introCategoryYear = document.getElementById('intro-category-year');
const startCluesBtn = document.getElementById('start-clues-btn');

// Clue Elements
const clueCategoryDisplay = document.getElementById('clue-category-display');
const clueValueDisplay = document.getElementById('clue-value-display');
const clueProgress = document.getElementById('clue-progress');
const continueClueBtn = document.getElementById('continue-clue-btn');

// Sequence Variables
state.currentRoundClues = [];
state.currentClueIndex = 0;
state.currentCategory = "";

function init() {
    const startSelect = document.getElementById('start-year');
    const endSelect = document.getElementById('end-year');

    for (let y = 1984; y <= 2024; y++) {
        const optStart = new Option(y, y);
        const optEnd = new Option(y, y);
        startSelect.add(optStart);
        endSelect.add(optEnd);
    }

    startSelect.value = 1990;
    endSelect.value = 2000;

    document.getElementById('start-game-btn').addEventListener('click', startGame);

    startCluesBtn.addEventListener('click', startClueSequence);

    document.getElementById('next-round-seq-btn').addEventListener('click', () => {
        if (state.currentRound === 'jeopardy') {
            setupRound('double_jeopardy');
        } else if (state.currentRound === 'double_jeopardy') {
            setupRound('final_jeopardy');
        }
    });

    passBtn.addEventListener('click', () => {
        activeAnswerEl.style.display = 'block';
        passBtn.style.display = 'none';
        guessBtn.style.display = 'none';
        continueClueBtn.style.display = 'block';
    });

    guessBtn.addEventListener('click', () => {
        activeAnswerEl.style.display = 'block'; // Reveal the answer first
        passBtn.style.display = 'none';
        guessBtn.style.display = 'none';
        correctBtn.style.display = 'block';
        incorrectBtn.style.display = 'block';
    });

    correctBtn.addEventListener('click', () => {
        updateScore(state.currentClueValue);
        advanceClue();
    });

    incorrectBtn.addEventListener('click', () => {
        updateScore(-state.currentClueValue);
        advanceClue();
    });

    continueClueBtn.addEventListener('click', advanceClue);
}

// ... startGame and beginGameUI remain largely the same ...
async function startGame() {
    const startYear = parseInt(document.getElementById('start-year').value);
    const endYear = parseInt(document.getElementById('end-year').value);

    loadingTxt.style.display = 'block';
    state.allGames = [];
    state.usedClues.clear(); // Clear used clues for fresh start

    try {
        // Generate list of all years in range
        const allYearsInRange = [];
        for (let y = Math.min(startYear, endYear); y <= Math.max(startYear, endYear); y++) {
            allYearsInRange.push(y);
        }

        // Shuffle and pick up to 3 years
        const selectedYears = allYearsInRange
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        console.log("Loading data for years:", selectedYears);

        // Parallel fetch
        const results = await Promise.all(selectedYears.map(y =>
            fetch(`data/${y}.json`).then(r => r.ok ? r.json() : [])
        ));

        state.allGames = results.flat();

        if (state.allGames.length === 0) {
            alert("No games found for this period!");
            return;
        }

        beginGameUI();

    } catch (err) {
        console.error(err);
        alert("Failed to load game data.");
    } finally {
        loadingTxt.style.display = 'none';
    }
}

function beginGameUI() {
    state.score = 0;
    state.usedClues.clear();
    setupScreen.style.display = 'none';
    document.getElementById('game-status').style.display = 'block';
    updateScore(0);
    setupRound('jeopardy');
}

function hideAllContainers() {
    setupScreen.style.display = 'none';
    roundIntroContainer.style.display = 'none';
    clueContainer.style.display = 'none';
    roundCompleteContainer.style.display = 'none';
    endGameContainer.style.display = 'none';
    finalJeopardyContainer.style.display = 'none';
}

function setupRound(roundKey, attempt = 0) {
    if (attempt > 100) {
        alert("Failed to find a valid game for this round. Try a different year range.");
        location.reload();
        return;
    }

    hideAllContainers();
    state.currentRound = roundKey;

    const randomGame = state.allGames[Math.floor(Math.random() * state.allGames.length)];
    const categories = Object.keys(randomGame.rounds[roundKey] || {});

    const validCategories = categories.filter(cat => {
        const catClueList = randomGame.rounds[roundKey][cat];
        return catClueList.every(c => c.clue !== "[No Clue]" && c.answer !== "[No Answer]");
    });

    if (validCategories.length === 0) {
        return setupRound(roundKey, attempt + 1);
    }

    const year = new Date(randomGame.date).getFullYear();
    const roundNames = {
        'jeopardy': 'SINGLE JEOPARDY',
        'double_jeopardy': 'DOUBLE JEOPARDY',
        'final_jeopardy': 'FINAL JEOPARDY'
    };
    const roundName = roundNames[roundKey] || '';

    if (roundKey === 'final_jeopardy') {
        const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)];
        const clueList = randomGame.rounds[roundKey][randomCat];
        const clue = clueList[0];

        state.currentCategory = randomCat;
        state.currentRoundClues = [clue];
        state.currentClueIndex = 0;
        state.currentYear = year;

        const maxWager = Math.max(state.score, 2000);

        const finalBoard = document.getElementById('final-board');
        finalBoard.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; display: flex; flex-direction: column; align-items: center;">
                <div class="category-card" style="margin: 0 auto; margin-bottom: 2rem; max-width: 600px;">
                    <div class="cat-round">${roundName}</div>
                    <div class="cat-name">${randomCat}</div>
                    <div class="cat-year">${year}</div>
                </div>
                
                <div class="wager-container" id="wager-ui-box">
                    <div style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">Place Your Wager</div>
                    <div class="wager-amount" id="wager-display">$0</div>
                    <input type="range" min="0" max="${maxWager}" value="0" step="100" class="wager-slider" id="wager-input">
                    <div style="font-size: 0.8rem; opacity: 0.6;">Maximum Wager: $${maxWager.toLocaleString()}</div>
                    <button class="btn-primary" id="reveal-final-clue" style="margin-top: 1rem;">Reveal Final Clue</button>
                </div>
            </div>
        `;

        finalJeopardyContainer.style.display = 'block';

        const wagerInput = document.getElementById('wager-input');
        const wagerDisplay = document.getElementById('wager-display');

        wagerInput.addEventListener('input', () => {
            wagerDisplay.innerText = `$${parseInt(wagerInput.value).toLocaleString()}`;
        });

        document.getElementById('reveal-final-clue').addEventListener('click', () => {
            state.currentClueValue = parseInt(wagerInput.value);
            document.getElementById('wager-ui-box').style.display = 'none'; // Hide wager box
            finalJeopardyContainer.style.display = 'none';
            startClueSequence(); // Jump to the clue display
        });
        return;
    }

    // Normal Round Setup
    const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)];
    const clues = randomGame.rounds[roundKey][randomCat];

    clues.sort((a, b) => {
        const valA = parseInt(String(a.value).replace(/[^0-9]/g, '')) || 0;
        const valB = parseInt(String(b.value).replace(/[^0-9]/g, '')) || 0;
        return valA - valB;
    });

    const baseValue = roundKey === 'double_jeopardy' ? 400 : 200;
    clues.forEach((clue, index) => {
        clue.standardValue = (index + 1) * baseValue;
    });

    state.currentCategory = randomCat;
    state.currentRoundClues = clues;
    state.currentClueIndex = 0;
    state.currentYear = year;

    // Show Round Intro
    introRoundName.innerText = roundName;
    introCategoryName.innerText = randomCat;
    introCategoryYear.innerText = year;
    roundIntroContainer.style.display = 'block';
}

function startClueSequence() {
    hideAllContainers();
    clueContainer.style.display = 'block';
    loadNextClue();
}

function loadNextClue() {
    if (state.currentClueIndex >= state.currentRoundClues.length) {
        // Round Over
        hideAllContainers();
        if (state.currentRound === 'final_jeopardy') {
            endGameScreen();
        } else {
            document.getElementById('round-complete-score').innerText = state.score.toLocaleString();
            roundCompleteContainer.style.display = 'block';
        }
        return;
    }

    const clue = state.currentRoundClues[state.currentClueIndex];

    clueCategoryDisplay.innerHTML = `${state.currentCategory} <span style="color: rgba(255,255,255,0.4); font-weight: normal; margin-left: 0.5rem; font-size: 0.9rem;">(${state.currentYear})</span>`;
    if (state.currentRound === 'final_jeopardy') {
        clueValueDisplay.innerText = `Wager: $${state.currentClueValue}`;
    } else {
        state.currentClueValue = clue.standardValue || 0;
        clueValueDisplay.innerText = `$${state.currentClueValue}`;
    }

    clueProgress.innerText = `Clue ${state.currentClueIndex + 1} of ${state.currentRoundClues.length}`;
    activeClueEl.innerText = clue.clue;
    activeAnswerTextEl.innerText = clue.answer;

    activeAnswerEl.style.display = 'none';
    passBtn.style.display = state.currentRound === 'final_jeopardy' ? 'none' : 'block';
    guessBtn.style.display = 'block';
    correctBtn.style.display = 'none';
    incorrectBtn.style.display = 'none';
    continueClueBtn.style.display = 'none';
}

function advanceClue() {
    state.currentClueIndex++;
    loadNextClue();
}

function updateScore(points) {
    state.score += points;
    scoreEl.innerText = state.score.toLocaleString();
}

function endGameScreen() {
    hideAllContainers();
    endGameContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; animation: fadeIn 0.8s ease-out;">
            <div style="font-size: 1.5rem; text-transform: uppercase; color: var(--jeopardy-gold); margin-bottom: 1rem; letter-spacing: 4px;">Final Score</div>
            <div style="font-size: 6rem; font-weight: 900; margin-bottom: 3rem; color: white;">$${state.score.toLocaleString()}</div>
            
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn-primary" id="play-again-same" style="padding: 1rem 2rem;">Play Again (Same Years)</button>
                <button class="btn-primary" onclick="location.reload()" style="padding: 1rem 2rem;">Change Era</button>
            </div>
        </div>
    `;

    endGameContainer.style.display = 'block';

    document.getElementById('play-again-same').addEventListener('click', () => {
        beginGameUI();
    });
}

init();
