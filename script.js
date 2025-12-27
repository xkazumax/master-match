const CODE_LENGTH = 4;
const MAX_ROWS = 10;

let phase = "P1_SETUP";
let activePlayer = 1;

let p1Code = [];
let p2Code = [];

let p1Row = 0;
let p2Row = 0;

let setupSelection = [];
let guessSelection = [];
let draggingColor = null;
let sourceSlot = null;

let finalRound = false;
let p1GuessedCorrectly = false;
let p2GuessedCorrectly = false;

let gameOver = false;

const areas = document.querySelectorAll(".player-area");
const info = document.querySelector(".turn-info");
const palettes = document.querySelectorAll(".palette");

updateUI();

/* =======================  PALETTE DOUBLE CLICK  ======================= */
document.querySelectorAll(".peg").forEach(peg => {
    peg.addEventListener("dblclick", () => {
        const color = peg.classList[1];

        if (phase.includes("SETUP")) {
            if (!setupSelection.length) setupSelection = Array(CODE_LENGTH).fill(null);
            const emptyIndex = setupSelection.findIndex(c => !c);
            if (emptyIndex !== -1) setupSelection[emptyIndex] = color;

            const opponentIndex = activePlayer === 1 ? 1 : 0;
            const row = areas[opponentIndex].querySelector(".setup-row");
            drawRow(row, setupSelection);

        } else if (phase.includes("GUESS")) {
            if (!guessSelection.length) guessSelection = Array(CODE_LENGTH).fill(null);
            const emptyIndex = guessSelection.findIndex(c => !c);
            if (emptyIndex !== -1) guessSelection[emptyIndex] = color;

            const board = areas[activePlayer - 1].querySelector(".board");
            const rowIndex =
                activePlayer === 1
                    ? board.children.length - 1 - p1Row
                    : board.children.length - 1 - p2Row;

            const row = board.children[rowIndex];
            drawRow(row, guessSelection);
        }
    });
});

/* =======================  SETUP SUBMIT  ======================= */
document.querySelectorAll(".setup-submit").forEach(btn => {
    btn.addEventListener("click", () => {
        if (setupSelection.filter(Boolean).length < CODE_LENGTH) return;

        btn.closest(".player-area").querySelector(".line").style.display = "none";

        if (activePlayer === 1) {
            p1Code = [...setupSelection];
            areas[1].querySelector(".setup-row").classList.add("hidden");
            setupSelection = [];
            activePlayer = 2;
            next("P2_SETUP");

        } else {
            p2Code = [...setupSelection];
            areas[0].querySelector(".setup-row").classList.add("hidden");
            setupSelection = [];
            activePlayer = 1;
            next("P1_GUESS");
        }
    });
});

// ---------------- MATCH? BUTTON ----------------
document.addEventListener("click", e => {
    const btn = e.target.closest(".match-btn");
    if (!btn) return;

    if (!phase.includes("GUESS")) return;

    const board = areas[activePlayer - 1].querySelector(".board");
    const totalRows = board.children.length;
    const rowIndex = activePlayer === 1 ? totalRows - 1 - p1Row : totalRows - 1 - p2Row;
    const currentRow = board.children[rowIndex];

    if (btn.closest(".row") !== currentRow) return; // only allow current row

    if (guessSelection.filter(Boolean).length !== CODE_LENGTH) return;

    // hide current button completely
    btn.style.display = "none";

    // show feedback boxes
    currentRow.querySelector(".feedback")?.classList.remove("hidden");

    // mark this row as completed
    currentRow.classList.add("completed");

    // submit the guess
    if (activePlayer === 1) guess(1);
    else guess(2);

    guessSelection = [];
    updateMatchButtons(); // update all buttons after submission
});




/* =======================  DRAGGING SLOTS  ======================= */
function makeSlotsInteractive(row, isSetup = false) {
    row.querySelectorAll(".slot").forEach((slot, i) => {
        slot.setAttribute("draggable", true);

        slot.addEventListener("dragstart", e => {
            const sel = isSetup ? setupSelection : guessSelection;
            if (!sel[i]) { e.preventDefault(); return; }

            draggingColor = sel[i];
            sourceSlot = i;

            const preview = document.createElement("div");
            preview.className = "drag-preview";
            preview.style.cssText =
                "width:40px;height:40px;border-radius:50%;background:" +
                getComputedStyle(slot).backgroundColor +
                ";position:absolute;top:-1000px";

            document.body.appendChild(preview);
            e.dataTransfer.setDragImage(preview, 20, 20);
            setTimeout(() => preview.remove(), 0);
        });

        slot.addEventListener("dragend", () => { draggingColor = null; sourceSlot = null; });
        slot.addEventListener("dragover", e => e.preventDefault());

        slot.addEventListener("drop", e => {
            e.preventDefault();
            if (!draggingColor) return;

            const sel = isSetup ? setupSelection : guessSelection;
            if (!sel[i]) {
                sel[i] = draggingColor;
                if (sourceSlot !== null) sel[sourceSlot] = null;

                const board = isSetup
                    ? areas[activePlayer === 1 ? 1 : 0].querySelector(".setup-row")
                    : row;

                drawRow(board, sel);
            }
        });

        slot.addEventListener("click", () => {
            const sel = isSetup ? setupSelection : guessSelection;
            sel[i] = null;

            const board = isSetup
                ? areas[activePlayer === 1 ? 1 : 0].querySelector(".setup-row")
                : row;

            drawRow(board, sel);
        });
    });
}

/* =======================  DRAW ROW  ======================= */
function drawRow(row, arr) {
    row.querySelectorAll(".slot").forEach((s, i) => {
        s.className = "slot";
        if (arr[i]) s.classList.add(arr[i]);
    });

    makeSlotsInteractive(row, row.classList.contains("setup-row"));
}

/* =======================  GUESS LOGIC  ======================= */
function guess(player) {
    const secret = player === 1 ? p2Code : p1Code;
    const board = areas[player - 1].querySelector(".board");

    const rowIndex =
        player === 1
            ? board.children.length - 1 - p1Row
            : board.children.length - 1 - p2Row;

    const row = board.children[rowIndex];

    guessSelection.forEach((c, i) => {
        row.querySelectorAll(".slot")[i].classList.add(c);
    });

    const res = feedback(guessSelection, secret);
    row.querySelector(".color-count").textContent = res.colorOnly || "";
    row.querySelector(".exact-count").textContent = res.exact || "";

    if (player === 1) p1Row++;
    else p2Row++;

    if (res.exact === CODE_LENGTH) {
        if (player === 1) p1GuessedCorrectly = true;
        else p2GuessedCorrectly = true;
        if (!finalRound) finalRound = true;
    }

    guessSelection = [];

    if (finalRound) {
        if (player === 1) next("P2_GUESS");
        else resolveWinner();
        return;
    }

    if (p1Row >= MAX_ROWS && p2Row >= MAX_ROWS) {
        endGame("Draw");
        return;
    }

    next(player === 1 ? "P2_GUESS" : "P1_GUESS");
}

/* =======================  WIN RESOLUTION  ======================= */
function resolveWinner() {
    if (p1GuessedCorrectly && p2GuessedCorrectly) endGame("Draw");
    else if (p1GuessedCorrectly) endGame("Player 1 Wins!");
    else if (p2GuessedCorrectly) endGame("Player 2 Wins!");
    else endGame("Draw");
}

/* =======================  FEEDBACK  ======================= */
function feedback(guessArr, secret) {
    let exact = 0, colorOnly = 0;
    let g = [...guessArr], s = [...secret];

    for (let i = 0; i < CODE_LENGTH; i++)
        if (g[i] === s[i]) { exact++; g[i] = s[i] = null; }

    g.forEach(c => {
        if (!c) return;
        const idx = s.indexOf(c);
        if (idx !== -1) { colorOnly++; s[idx] = null; }
    });

    return { exact, colorOnly };
}

/* =======================  PHASE SWITCH  ======================= */
function next(p) {
    phase = p;

    if (phase.includes("GUESS")) {
        activePlayer = phase === "P1_GUESS" ? 1 : 2;
        updateUI();

        const board = areas[activePlayer - 1].querySelector(".board");
        const totalRows = board.children.length;
        const rowIndex = activePlayer === 1 ? totalRows - 1 - p1Row : totalRows - 1 - p2Row;
        const row = board.children[rowIndex];

        makeSlotsInteractive(row);
        updateMatchButtons();
    } else {
        // setup phases: don't touch match buttons
        areas.forEach(a => a.classList.remove("active", "inactive"));
        activePlayer = phase === "P1_SETUP" ? 1 : 2;
        updateUI();
    }
}

/* =======================  END GAME  ======================= */

function endGame(result) {
    gameOver = true; // mark game finished
    // remove highlights from all rows
    document.querySelectorAll(".row").forEach(r => r.classList.remove("current-row"));

    areas.forEach(area => area.querySelector(".setup-row").classList.remove("hidden"));
    info.textContent = result;
    palettes.forEach(p => p.style.pointerEvents = "none");

    Swal.fire({
        title: result,
        imageWidth: 100,
        imageHeight: 100,
        imageAlt: result,
        theme: 'dark',
        confirmButtonText: 'Start New Game',
        customClass: {
            popup: "wood-modal",
            title: "wood-title",
            confirmButton: "wood-btn"
        }
    }).then(() => resetGame());
}


/* =======================  RESET  ======================= */
function resetGame() {
    phase = "P1_SETUP";
    activePlayer = 1;

    p1Code = [];
    p2Code = [];
    p1Row = 0;
    p2Row = 0;

    setupSelection = [];
    guessSelection = [];

    finalRound = false;
    p1GuessedCorrectly = false;
    p2GuessedCorrectly = false;
    gameOver = false; // reset game over flag

    // clear all slots
    document.querySelectorAll(".slot").forEach(s => s.className = "slot");

    // clear feedback counts
    document.querySelectorAll(".color-count, .exact-count").forEach(el => el.textContent = "");

    // reset all Match? buttons
    document.querySelectorAll(".match-btn").forEach(btn => {
        btn.style.display = "block";  // make sure buttons are visible
        btn.textContent = "";          // hide text until guessing phase
        btn.classList.remove("hidden");
    });

    // hide all feedback boxes
    document.querySelectorAll(".feedback").forEach(fb => fb.classList.add("hidden"));

    // remove row highlights
    document.querySelectorAll(".row").forEach(r => r.classList.remove("current-row"));

    // show all setup rows
    areas.forEach(area => area.querySelector(".setup-row").classList.remove("hidden"));

    // enable palettes
    palettes.forEach(p => p.style.pointerEvents = "auto");

    areas.forEach(area => area.querySelector(".line").style.display = "block");

    updateUI();
    // DO NOT call updateMatchButtons() here; highlighting will happen only when guessing starts
}
/* ======================= UPDATE MATCH BUTTONS ======================= */

function updateMatchButtons() {
    if (gameOver) return; // don't update if game ended

    areas.forEach((area, i) => {
        const board = area.querySelector(".board");
        const totalRows = board.children.length;
        const isActive = activePlayer === i + 1;

        const currentRowIndex = isActive
            ? (i === 0 ? totalRows - 1 - p1Row : totalRows - 1 - p2Row)
            : null;

        board.querySelectorAll(".row").forEach((r, idx) => {
            const btn = r.querySelector(".match-btn");
            if (!btn) return;

            // Only add highlight/text to current row of active player
            if (isActive && idx === currentRowIndex) {
                r.classList.add("current-row");
                btn.textContent = "Match?";
                btn.style.display = "block";
                btn.classList.remove("hidden");
            } else {
                r.classList.remove("current-row");
                // Don't reset display/hidden for already clicked buttons
                if (!btn.classList.contains("hidden")) btn.textContent = "";
            }
        });
    });
}



/* =======================  UI  ======================= */

function updateUI() {
    areas.forEach((a, i) => {
        const isActive = i + 1 === activePlayer;
        a.classList.toggle("active", isActive);
        a.classList.toggle("inactive", !isActive);

        // Highlight current setup row correctly
        const setupRow = a.querySelector(".setup-row");
        if (phase.includes("SETUP")) {
            // active player edits opponent's row
            const shouldHighlight = (activePlayer === 1 && i === 1) || (activePlayer === 2 && i === 0);
            setupRow.classList.toggle("current-row", shouldHighlight);
        } else {
            setupRow.classList.remove("current-row");
        }
    });

    info.textContent =
        phase === "P1_SETUP" ? "Player 1: Set Code" :
        phase === "P2_SETUP" ? "Player 2: Set Code" :
        phase === "P1_GUESS" ? "Player 1 Guessing" :
        "Player 2 Guessing";
}



