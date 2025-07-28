document.addEventListener('DOMContentLoaded', () => {
    // --- Dades del Joc ---
    const acordsPerNivell = {
        facil: { "C": ["C", "E", "G"], "D": ["D", "F#", "A"], "E": ["E", "G#", "B"], "F": ["F", "A", "C"], "G": ["G", "B", "D"], "A": ["A", "C#", "E"], "B": ["B", "D#", "F#"], "Cm": ["C", "EB", "G"], "Dm": ["D", "F", "A"], "Em": ["E", "G", "B"], "Fm": ["F", "AB", "C"], "Gm": ["G", "BB", "D"], "Am": ["A", "C", "E"], "Bm": ["B", "D", "F#"] },
        mitja: { "F#": ["F#", "A#", "C#"], "BB": ["BB", "D", "F"], "EB": ["EB", "G", "BB"], "AB": ["AB", "C", "EB"], "DB": ["DB", "F", "AB"], "BBM": ["BB", "DB", "F"], "EBM": ["EB", "GB", "BB"], "F#M": ["F#", "A", "C#"], "ABM": ["AB", "CB", "EB"] },
        dificil: { "G#M": ["G#", "B", "D#"], "C#M": ["C#", "E", "G#"], "A#M": ["A#", "C#", "E#"], "DBM": ["DB", "FB", "AB"], "CB": ["CB", "EB", "GB"], "A#": ["A#", "C##", "E#"], "C#": ["C#", "E#", "G#"], "D#M": ["D#", "F#", "A#"], "GB": ["GB", "BB", "DB"] }
    };

    // --- Elements del DOM ---
    const gameScreen = document.getElementById('game-screen');
    const summaryScreen = document.getElementById('summary-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const actionBtn = document.getElementById('action-btn');
    const answerInput = document.getElementById('answer-input');
    const questionEl = document.getElementById('chord-question');
    const feedbackEl = document.getElementById('feedback-message');
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const timerBar = document.getElementById('timer-bar');
    const summaryTitle = document.getElementById('summary-title');
    const summaryText = document.getElementById('summary-text');
    const summaryScore = document.getElementById('summary-score');
    
    const soCorrecte = document.getElementById("soCorrecte");
    const soError = document.getElementById("soError");
    const soBenvinguda = document.getElementById("soBenvinguda");

    // --- Estat del Joc ---
    let gameState = 'idle'; // idle, playing, paused, finished
    let currentChordName = '';
    let currentChordNotes = [];
    let score = 0;
    let round = 0;
    const totalRounds = 10;
    const timePerRound = 15;
    let timerInterval = null;

    // --- Funcions del Joc ---
    function init() {
        startGameBtn.addEventListener('click', startGame);
        actionBtn.addEventListener('click', handleAction);
        answerInput.addEventListener('input', () => {
            actionBtn.disabled = answerInput.value.trim() === '';
        });
        answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!actionBtn.disabled) {
                    handleAction();
                }
            }
        });
    }

    function startGame() {
        soBenvinguda.play().catch(e => console.log("L'àudio necessita interacció de l'usuari per començar."));
        gameState = 'playing';
        score = 0;
        round = 0;
        updateScoreDisplay();
        summaryScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        nextRound();
    }

    function nextRound() {
        if (round >= totalRounds) {
            endGame();
            return;
        }
        round++;
        resetRoundState();
        
        const difficulty = getDifficulty();
        const chordsForLevel = acordsPerNivell[difficulty.name];
        levelEl.textContent = difficulty.label;
        
        const availableChords = Object.keys(chordsForLevel);
        currentChordName = availableChords[Math.floor(Math.random() * availableChords.length)];
        currentChordNotes = chordsForLevel[currentChordName];
        
        questionEl.textContent = `Acord de ${currentChordName}`;
        answerInput.focus();
        startTimer();
    }
    
    function resetRoundState() {
        answerInput.value = '';
        answerInput.disabled = false;
        answerInput.className = '';
        feedbackEl.textContent = '';
        feedbackEl.className = '';
        actionBtn.textContent = 'Comprovar';
        actionBtn.disabled = true;
        gameState = 'playing';
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';

        setTimeout(() => {
            timerBar.style.transition = `width ${timePerRound}s linear`;
            timerBar.style.width = '0%';
        }, 100);

        timerInterval = setInterval(() => {
            const newWidth = parseFloat(timerBar.style.width) - (100 / timePerRound);
            if (newWidth <= 0) {
                clearInterval(timerInterval);
                if (gameState === 'playing') {
                    handleTimeOut();
                }
            }
        }, 1000);
    }
    
    function handleTimeOut() {
        soError.play();
        showFeedback(false, `Temps esgotat! La resposta era: ${currentChordNotes.join(' ')}`);
        pauseGameForFeedback();
    }

    function handleAction() {
        if (gameState === 'playing') {
            checkAnswer();
        } else if (gameState === 'paused') {
            nextRound();
        }
    }
    
    function normalizeNotes(notesArray) {
        // Converteix a majúscules, elimina espais i ordena
        return notesArray.map(n => n.trim().toUpperCase()).sort();
    }

    function checkAnswer() {
        clearInterval(timerInterval);
        
        const userResponse = answerInput.value.trim().split(/\s+/);

        if (userResponse.length !== 3) {
            showFeedback(false, "⚠️ Introdueix exactament 3 notes separades per espais.");
            answerInput.classList.add('shake');
            setTimeout(() => answerInput.classList.remove('shake'), 500);
            return;
        }

        const normalizedUserResponse = normalizeNotes(userResponse);
        const normalizedCorrectNotes = normalizeNotes(currentChordNotes);

        const isCorrect = JSON.stringify(normalizedUserResponse) === JSON.stringify(normalizedCorrectNotes);
        
        if (isCorrect) {
            score++;
            updateScoreDisplay();
            soCorrecte.play();
            showFeedback(true, '🎉 Correcte!');
            answerInput.classList.add('flash-correct');
        } else {
            soError.play();
            showFeedback(false, `❌ Incorrecte. La resposta era: ${currentChordNotes.join(' ')}`);
            answerInput.classList.add('shake');
        }
        pauseGameForFeedback();
    }
    
    function pauseGameForFeedback() {
        gameState = 'paused';
        actionBtn.textContent = 'Següent Acord';
        actionBtn.disabled = false;
        answerInput.disabled = true;
    }

    function showFeedback(correct, message) {
        feedbackEl.textContent = message;
        feedbackEl.className = correct ? 'feedback-correct' : 'feedback-error';
    }
    
    function updateScoreDisplay() {
        scoreEl.textContent = score;
    }

    function getDifficulty() {
        if (round <= 3) return { name: 'facil', label: 'Fàcil' };
        if (round <= 7) return { name: 'mitja', label: 'Intermedi' };
        return { name: 'dificil', label: 'Avançat' };
    }

    function endGame() {
        gameState = 'finished';
        gameScreen.classList.add('hidden');
        summaryScreen.classList.remove('hidden');
        
        summaryTitle.textContent = 'Partida Finalitzada!';
        summaryText.textContent = `Has aconseguit un total de:`;
        summaryScore.innerHTML = `<span style="font-size: 2.5em; color: var(--accent-color); font-weight: 700;">${score} / ${totalRounds}</span>`;
        startGameBtn.textContent = 'Tornar a Jugar';
    }

    init();
});

