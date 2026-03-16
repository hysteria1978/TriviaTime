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
const gameBoardContainer = document.getElementById('game-board-container');
const mainBoard = document.getElementById('main-board');
const scoreEl = document.getElementById('score');
const nextRoundBtn = document.getElementById('next-round-btn');
const loadingTxt = document.getElementById('loading-txt');

// Modal Elements
const clueModal = document.getElementById('clue-modal');
const activeClueEl = document.getElementById('active-clue');
const activeAnswerEl = document.getElementById('active-answer');
const activeAnswerTextEl = document.getElementById('active-answer-text');
const modalCategoryEl = document.getElementById('modal-category');
const passBtn = document.getElementById('pass-btn');
const guessBtn = document.getElementById('guess-btn');
const correctBtn = document.getElementById('correct-btn');
const incorrectBtn = document.getElementById('incorrect-btn');
const closeClueBtn = document.getElementById('close-clue-btn');

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
    
    passBtn.addEventListener('click', () => {
        activeAnswerEl.style.display = 'block';
        passBtn.style.display = 'none';
        guessBtn.style.display = 'none';
        closeClueBtn.style.display = 'block';
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
        closeClue();
    });
    
    incorrectBtn.addEventListener('click', () => {
        updateScore(-state.currentClueValue);
        closeClue();
    });
    
    closeClueBtn.addEventListener('click', () => {
        closeClue();
    });
    
    nextRoundBtn.addEventListener('click', () => {
        if (state.currentRound === 'jeopardy') {
            setupRound('double_jeopardy');
        } else if (state.currentRound === 'double_jeopardy') {
            setupRound('final_jeopardy');
        }
    });
}

async function startGame() {
    const startYear = parseInt(document.getElementById('start-year').value);
    const endYear = parseInt(document.getElementById('end-year').value);
    
    loadingTxt.style.display = 'block';
    state.allGames = [];
    
    try {
        // Load only the first few years if the range is too large to stay snappy
        // For now, let's just load them all for the requested range
        const years = [];
        for (let y = startYear; y <= endYear; y++) {
            years.push(y);
        }
        
        // Parallel fetch
        const results = await Promise.all(years.map(y => 
            fetch(`data/${y}.json`).then(r => r.ok ? r.json() : [])
        ));
        
        state.allGames = results.flat();
        
        if (state.allGames.length === 0) {
            alert("No games found for this period!");
            return;
        }
        
        setupRound('jeopardy');
        
        setupScreen.style.display = 'none';
        gameBoardContainer.style.display = 'block';
        document.getElementById('game-status').style.display = 'block';
        
    } catch (err) {
        console.error(err);
        alert("Failed to load game data.");
    } finally {
        loadingTxt.style.display = 'none';
    }
}

function setupRound(roundKey, attempt = 0) {
    if (attempt > 100) {
        alert("Failed to find a valid game for this round. Try a different year range.");
        location.reload();
        return;
    }
    
    state.currentRound = roundKey;
    mainBoard.innerHTML = '';
    nextRoundBtn.style.display = 'none';
    
    // Pick 1 random category from 1 random game in our pool
    const randomGame = state.allGames[Math.floor(Math.random() * state.allGames.length)];
    const categories = Object.keys(randomGame.rounds[roundKey] || {});
    
    // Filter out categories that have empty/missing clues
    const validCategories = categories.filter(cat => {
        const catClueList = randomGame.rounds[roundKey][cat];
        return catClueList.every(c => c.clue !== "[No Clue]" && c.answer !== "[No Answer]");
    });

    if (validCategories.length === 0) {
        // Fallback if this game lacks this round or all categories are invalid
        return setupRound(roundKey, attempt + 1); 
    }
    
    // For Final Jeopardy, we only show one category and one clue automatically
    if (roundKey === 'final_jeopardy') {
        const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)];
        const clueList = randomGame.rounds[roundKey][randomCat];
        const clue = clueList[0]; // Usually only one
        
        const year = new Date(randomGame.date).getFullYear();
        const roundName = "FINAL JEOPARDY";
        
        // Final Jeopardy Wagering Logic
        const maxWager = Math.max(state.score, 2000);
        
        mainBoard.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; display: flex; flex-direction: column; align-items: center;">
                <div class="category-card" style="margin: 0 auto; margin-bottom: 2rem;">
                    <div class="cat-round">${roundName}</div>
                    <div class="cat-name">${randomCat}</div>
                    <div class="cat-year">${year}</div>
                </div>
                
                <div class="wager-container">
                    <div style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">Place Your Wager</div>
                    <div class="wager-amount" id="wager-display">$0</div>
                    <input type="range" min="0" max="${maxWager}" value="0" step="100" class="wager-slider" id="wager-input">
                    <div style="font-size: 0.8rem; opacity: 0.6;">Maximum Wager: $${maxWager.toLocaleString()}</div>
                </div>

                <button class="btn-primary" id="reveal-final-clue" style="margin-top: 2rem;">Reveal Final Jeopardy Clue</button>
            </div>
        `;

        const wagerInput = document.getElementById('wager-input');
        const wagerDisplay = document.getElementById('wager-display');

        wagerInput.addEventListener('input', () => {
            wagerDisplay.innerText = `$${parseInt(wagerInput.value).toLocaleString()}`;
        });
        
        document.getElementById('reveal-final-clue').addEventListener('click', () => {
            state.currentClueValue = parseInt(wagerInput.value);
            showClue(randomCat, clue, null);
        });
        return;
    }

    const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)];
    const clues = randomGame.rounds[roundKey][randomCat];
    
    // Sort clues by original value to maintain difficulty order
    clues.sort((a, b) => {
        const valA = parseInt(String(a.value).replace(/[^0-9]/g, '')) || 0;
        const valB = parseInt(String(b.value).replace(/[^0-9]/g, '')) || 0;
        return valA - valB;
    });

    // Normalize values: Single (200, 400, 600, 800, 1000) vs Double (400, 800, 1200, 1600, 2000)
    const baseValue = roundKey === 'double_jeopardy' ? 400 : 200;
    clues.forEach((clue, index) => {
        clue.standardValue = (index + 1) * baseValue;
    });

    // Determine round name and year
    const year = new Date(randomGame.date).getFullYear();
    const roundNames = { 
        'jeopardy': 'SINGLE JEOPARDY', 
        'double_jeopardy': 'DOUBLE JEOPARDY', 
        'final_jeopardy': 'FINAL JEOPARDY' 
    };
    const roundName = roundNames[roundKey] || '';

    // Render Board
    mainBoard.style.gridTemplateColumns = 'repeat(1, 1fr)';
    
    const catHeader = document.createElement('div');
    catHeader.className = 'category-card';
    catHeader.innerHTML = `
        <div class="cat-round">${roundName}</div>
        <div class="cat-name">${randomCat}</div>
        <div class="cat-year">${year}</div>
    `;
    mainBoard.appendChild(catHeader);
    
    clues.forEach((clue, index) => {
        const card = document.createElement('div');
        card.className = 'clue-card';
        card.innerText = `$${clue.standardValue}`;
        card.addEventListener('click', () => {
            if (card.classList.contains('spent')) return;
            showClue(randomCat, clue, card);
        });
        mainBoard.appendChild(card);
    });
}

function showClue(category, clue, card) {
    activeClueEl.innerText = clue.clue;
    activeAnswerTextEl.innerText = clue.answer;
    modalCategoryEl.innerText = category;
    if (state.currentRound !== 'final_jeopardy') {
        state.currentClueValue = clue.standardValue || 0;
    }
    
    activeAnswerEl.style.display = 'none';
    passBtn.style.display = state.currentRound === 'final_jeopardy' ? 'none' : 'block';
    guessBtn.style.display = 'block';
    correctBtn.style.display = 'none';
    incorrectBtn.style.display = 'none';
    closeClueBtn.style.display = 'none';
    clueModal.style.display = 'flex';
    
    if (card) card.classList.add('spent');
    
    // Check if round is over
    const activeCards = document.querySelectorAll('.clue-card:not(.spent)');
    if (activeCards.length === 0) {
        nextRoundBtn.style.display = 'block';
    }
}

function updateScore(points) {
    state.score += points;
    scoreEl.innerText = state.score.toLocaleString();
}

function closeClue() {
    clueModal.style.display = 'none';
    if (state.currentRound === 'final_jeopardy') {
        endGameScreen();
    }
}

function endGameScreen() {
    mainBoard.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; animation: fadeIn 0.8s ease-out;">
            <div style="font-size: 1.5rem; text-transform: uppercase; color: var(--jeopardy-gold); margin-bottom: 1rem; letter-spacing: 4px;">Final Score</div>
            <div style="font-size: 6rem; font-weight: 900; margin-bottom: 3rem; color: white;">$${state.score.toLocaleString()}</div>
            <button class="btn-primary" onclick="location.reload()" style="padding: 1.5rem 4rem;">Play Again</button>
        </div>
    `;
    nextRoundBtn.style.display = 'none';
}

init();
