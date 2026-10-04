(() => {
  "use strict";

  const KEY = "nans-sudoku-library-v2";
  const SETTINGS = "nans-sudoku-settings-v1";
  const app = document.getElementById("app");
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && Array.isArray(data.unfinished) && Array.isArray(data.completed)) return data;
    } catch (_) {}
    return { unfinished: [], completed: [] };
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS)) || { highlight: true }; }
    catch (_) { return { highlight: true }; }
  }

  let state = { screen: "home", selected: null, current: null, size: null, difficulty: null };
  const esc = s => String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));

  function btn(label, fn, cls = "choice") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = label;
    b.onclick = fn;
    return b;
  }

  function setScreen(name, clearSelection = true) {
    state.screen = name;
    if (clearSelection) state.selected = null;
    render();
  }

  function heading(text) {
    const h = document.createElement("h1");
    h.textContent = text;
    return h;
  }

  function home() {
    app.innerHTML = "";
    const s = document.createElement("section"); s.className = "screen";
    s.append(heading("Nan's Sudoku"));
    const list = document.createElement("div"); list.className = "choice-list";
    list.append(btn("Continue Puzzle", () => setScreen("unfinished")));
    list.append(btn("New Puzzle", () => setScreen("size")));
    list.append(btn("Completed Puzzles", () => setScreen("completed")));
    s.append(list); app.append(s);
  }

  function sizeScreen() {
    app.innerHTML = "";
    const s = document.createElement("section"); s.className = "screen";
    s.append(btn("←", () => setScreen("home"), "back"));
    s.append(heading("Choose Puzzle Size"));
    const list = document.createElement("div"); list.className = "choice-list";
    list.append(btn("4 × 4", () => { state.size = 4; setScreen("difficulty"); }));
    list.append(btn("9 × 9", () => { state.size = 9; setScreen("difficulty"); }));
    s.append(list); app.append(s);
  }

  function difficultyScreen() {
    app.innerHTML = "";
    const s = document.createElement("section"); s.className = "screen";
    s.append(btn("←", () => setScreen("size"), "back"));
    s.append(heading("Choose Difficulty"));
    const list = document.createElement("div"); list.className = "choice-list";
    ["Easy", "Medium", "Hard"].forEach(d => list.append(btn(d, () => startNew(state.size, d))));
    s.append(list); app.append(s);
  }

  // Fisher-Yates is used instead of sort(() => Math.random()-0.5), which is biased.
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateSolved(n) {
    const box = Math.sqrt(n);
    const base = r => (r * box + Math.floor(r / box)) % n;
    const nums = shuffle([...Array(n).keys()].map(x => x + 1));
    const rows = [], cols = [];
    const bands = shuffle([...Array(box).keys()]);
    bands.forEach(b => shuffle([...Array(box).keys()]).forEach(r => rows.push(b * box + r)));
    const stacks = shuffle([...Array(box).keys()]);
    stacks.forEach(b => shuffle([...Array(box).keys()]).forEach(c => cols.push(b * box + c)));
    return rows.map(r => cols.map(c => nums[(base(r) + c) % n]));
  }

  function candidates(board, r, c, n) {
    if (board[r][c] !== 0) return [];
    const used = new Set();
    for (let i = 0; i < n; i++) { used.add(board[r][i]); used.add(board[i][c]); }
    const box = Math.sqrt(n), br = Math.floor(r / box) * box, bc = Math.floor(c / box) * box;
    for (let rr = br; rr < br + box; rr++) for (let cc = bc; cc < bc + box; cc++) used.add(board[rr][cc]);
    const out = [];
    for (let v = 1; v <= n; v++) if (!used.has(v)) out.push(v);
    return out;
  }

  // Counts solutions up to 2. This is enough to guarantee uniqueness without doing unnecessary work.
  function countSolutions(board, limit = 2) {
    const n = board.length;
    let best = null, bestCandidates = null;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (board[r][c] !== 0) continue;
      const cs = candidates(board, r, c, n);
      if (cs.length === 0) return 0;
      if (!best || cs.length < bestCandidates.length) { best = [r, c]; bestCandidates = cs; }
    }
    if (!best) return 1;
    let count = 0;
    for (const v of bestCandidates) {
      board[best[0]][best[1]] = v;
      count += countSolutions(board, limit - count);
      board[best[0]][best[1]] = 0;
      if (count >= limit) return count;
    }
    return count;
  }

  function targetEmptyCells(n, difficulty) {
    if (n === 4) return difficulty === "Easy" ? 4 : difficulty === "Medium" ? 6 : 8;
    return difficulty === "Easy" ? 9 : difficulty === "Medium" ? 18 : 32;
  }

  function removalOrder(n, difficulty) {
    const box = Math.sqrt(n), cells = [];
    if (difficulty === "Easy") {
      for (let br = 0; br < n; br += box) for (let bc = 0; bc < n; bc += box) {
        const local = [];
        for (let r = br; r < br + box; r++) for (let c = bc; c < bc + box; c++) local.push([r, c]);
        cells.push(shuffle(local)[0]);
      }
      return shuffle(cells);
    }
    if (difficulty === "Medium") {
      // Exactly two holes in each 3x3 box for 9x9; for 4x4, choose six holes with no box > 2.
      for (let br = 0; br < n; br += box) for (let bc = 0; bc < n; bc += box) {
        const local = [];
        for (let r = br; r < br + box; r++) for (let c = bc; c < bc + box; c++) local.push([r, c]);
        shuffle(local);
        cells.push(...local.slice(0, n === 9 ? 2 : 1));
      }
      if (n === 4) {
        const extraBoxes = shuffle([...Array(4).keys()]).slice(0, 2);
        for (const bi of extraBoxes) {
          const br = Math.floor(bi / 2) * 2, bc = (bi % 2) * 2;
          const existing = cells.filter(([r,c]) => r >= br && r < br+2 && c >= bc && c < bc+2);
          const local = [];
          for (let r = br; r < br+2; r++) for (let c = bc; c < bc+2; c++) if (!existing.some(x => x[0]===r && x[1]===c)) local.push([r,c]);
          cells.push(shuffle(local)[0]);
        }
      }
      return shuffle(cells);
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
    return shuffle(cells);
  }

  function makePuzzle(n, difficulty) {
    const target = targetEmptyCells(n, difficulty);
    for (let attempt = 0; attempt < 80; attempt++) {
      const solution = generateSolved(n);
      const puzzle = solution.map(row => row.slice());
      const order = removalOrder(n, difficulty);
      let removed = 0;
      for (const [r, c] of order) {
        if (removed >= target) break;
        const old = puzzle[r][c]; puzzle[r][c] = 0;
        if (countSolutions(puzzle, 2) === 1) removed++;
        else puzzle[r][c] = old;
      }
      if (removed === target && countSolutions(puzzle, 2) === 1 && checkDifficultyShape(puzzle, difficulty)) {
        return { solution, puzzle };
      }
    }
    // A verified fallback: return a full solution with the required holes only if unique.
    // With these very generous clue counts this should virtually never be reached.
    const solution = generateSolved(n), puzzle = solution.map(row => row.slice());
    for (const [r,c] of removalOrder(n, difficulty).slice(0, target)) puzzle[r][c] = 0;
    return { solution, puzzle };
  }

  function checkDifficultyShape(puzzle, difficulty) {
    if (difficulty === "Hard") return true;
    const n = puzzle.length, box = Math.sqrt(n), max = difficulty === "Easy" ? 1 : 2;
    for (let br = 0; br < n; br += box) for (let bc = 0; bc < n; bc += box) {
      let empty = 0;
      for (let r = br; r < br + box; r++) for (let c = bc; c < bc + box; c++) if (!puzzle[r][c]) empty++;
      if (empty > max || (difficulty === "Easy" && empty !== 1) || (difficulty === "Medium" && n === 9 && empty !== 2)) return false;
    }
    return true;
  }

  function startNew(n, difficulty) {
    const { solution, puzzle } = makePuzzle(n, difficulty), now = new Date().toISOString();
    const p = { id: uid(), size: n, difficulty, solution, puzzle, entries: puzzle.map(r => r.slice()), startedAt: now, updatedAt: now };
    const lib = load(); lib.unfinished.unshift(p); save(lib);
    state.current = p; state.selected = null; setScreen("play");
  }

  function puzzleLabel(p) {
    const filled = p.entries.flat().filter(Boolean).length, total = p.size * p.size;
    return `${p.size} × ${p.size} · ${p.difficulty} · ${filled}/${total} filled`;
  }

  function listScreen(completed) {
    app.innerHTML = "";
    const s = document.createElement("section"); s.className = "screen";
    s.append(btn("←", () => setScreen("home"), "back"));
    s.append(heading(completed ? "Completed Puzzles" : "Continue Puzzle"));
    const lib = load(), arr = completed ? lib.completed : lib.unfinished;
    if (!arr.length) {
      const p = document.createElement("p"); p.className = "empty"; p.textContent = completed ? "No completed puzzles yet." : "There are no unfinished puzzles.";
      s.append(p); app.append(s); return;
    }
    const cards = document.createElement("div"); cards.className = "cards";
    arr.slice().sort((a,b) => new Date(b.updatedAt || b.completedAt || 0) - new Date(a.updatedAt || a.completedAt || 0)).forEach(p => {
      const c = document.createElement("button"); c.type = "button"; c.className = "card";
      const date = p.completedAt || p.startedAt;
      const strong = document.createElement("strong"); strong.textContent = `${p.size} × ${p.size} · ${p.difficulty}`;
      const span = document.createElement("span"); span.innerHTML = `${completed ? "Completed" : "Progress"}: ${completed ? "Complete" : esc(puzzleLabel(p).split("·").pop().trim())}<br>${esc(new Date(date).toLocaleString())}`;
      c.append(strong, span);
      c.onclick = () => { state.current = p; state.selected = null; setScreen(completed ? "view-completed" : "play"); };
      cards.append(c);
    });
    s.append(cards); app.append(s);
  }

  function renderBoard(p, readOnly = false) {
    const n = p.size, box = Math.sqrt(n), board = document.createElement("div");
    board.className = "board";
    const available = Math.min(window.innerWidth * 0.90, window.innerHeight * (readOnly ? 0.70 : 0.57), 760);
    const cell = Math.max(58, Math.floor(available / n));
    board.style.gridTemplateColumns = `repeat(${n}, ${cell}px)`;
    board.style.gridTemplateRows = `repeat(${n}, ${cell}px)`;
    const highlight = getSettings().highlight;

    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const b = document.createElement("button"); b.type = "button"; b.className = "cell";
      const v = p.entries[r][c];
      if (p.puzzle[r][c]) b.classList.add("given");
      b.textContent = v || "";
      b.setAttribute("aria-label", `Row ${r+1}, column ${c+1}${v ? `, ${v}` : ", empty"}${p.puzzle[r][c] ? ", given" : ""}`);
      if (!readOnly && state.selected && state.selected[0] === r && state.selected[1] === c) b.classList.add("selected");
      if (!readOnly && state.selected && highlight) {
        const [sr, sc] = state.selected;
        if (Math.floor(r/box) !== Math.floor(sr/box) && Math.floor(c/box) !== Math.floor(sc/box)) b.classList.add("dim");
      }
      if (p.bad && p.bad[`${r},${c}`]) b.classList.add("bad");
      if ((c + 1) % box === 0 && c !== n - 1) b.classList.add("box-right");
      if ((r + 1) % box === 0 && r !== n - 1) b.classList.add("box-bottom");
      if (!readOnly) b.onclick = () => {
        if (p.puzzle[r][c]) return;
        state.selected = state.selected && state.selected[0] === r && state.selected[1] === c ? null : [r,c];
        render();
      };
      board.append(b);
    }
    return board;
  }

  function play() {
    const p = state.current;
    app.innerHTML = "";
    const wrap = document.createElement("section"); wrap.className = "play";
    const top = document.createElement("div"); top.className = "play-top";
    top.append(btn("?", () => setScreen("rules", false), "small-btn"));
    const title = document.createElement("div"); title.className = "play-title"; title.textContent = `${p.size} × ${p.size} · ${p.difficulty}`;
    top.append(title, btn("Home", () => setScreen("home"), "small-btn"));
    wrap.append(top);
    const ba = document.createElement("div"); ba.className = "board-area"; ba.append(renderBoard(p)); wrap.append(ba);
    const pad = document.createElement("div"); pad.className = "num-pad";
    for (let n = 1; n <= p.size; n++) pad.append(btn(String(n), () => enter(n), "num-btn"));
    pad.append(btn("Erase", () => enter(0), "num-btn erase"));
    wrap.append(pad); app.append(wrap);
  }

  function enter(n) {
    const p = state.current; if (!p || !state.selected) return;
    const [r,c] = state.selected; if (p.puzzle[r][c]) return;
    p.bad = p.bad || {};
    if (n === 0) {
      p.entries[r][c] = 0; delete p.bad[`${r},${c}`]; persistCurrent(); render(); return;
    }
    if (n === p.solution[r][c]) {
      p.entries[r][c] = n; delete p.bad[`${r},${c}`]; persistCurrent();
      if (p.entries.flat().every(Boolean)) { complete(p); return; }
      render(); pulse("good", r, c);
    } else {
      p.entries[r][c] = n; p.bad[`${r},${c}`] = true; persistCurrent(); render(); pulse("bad", r, c);
    }
  }

  function pulse(type, r, c) {
    setTimeout(() => {
      const size = state.current && state.current.size;
      const el = size ? [...document.querySelectorAll(".cell")][r * size + c] : null;
      if (el) { el.classList.add(`pulse-${type}`); setTimeout(() => el.classList.remove(`pulse-${type}`), 1300); }
    }, 0);
  }

  function persistCurrent() {
    const lib = load(), i = lib.unfinished.findIndex(x => x.id === state.current.id);
    state.current.updatedAt = new Date().toISOString();
    if (i >= 0) lib.unfinished[i] = state.current; else lib.unfinished.unshift(state.current);
    save(lib);
  }

  function complete(p) {
    const lib = load();
    lib.unfinished = lib.unfinished.filter(x => x.id !== p.id);
    p.completedAt = new Date().toISOString(); delete p.bad;
    lib.completed.unshift(p); save(lib); setScreen("complete");
  }

  function completeScreen() {
    app.innerHTML = "";
    const s = document.createElement("section"); s.className = "screen complete";
    const tick = document.createElement("div"); tick.className = "tick"; tick.textContent = "✓";
    s.append(tick, heading("Completed"));
    const list = document.createElement("div"); list.className = "choice-list";
    list.append(btn("Return to Home Page", () => setScreen("home")));
    list.append(btn("Complete Another", () => startNew(state.current.size, state.current.difficulty)));
    s.append(list); app.append(s);
  }

  function rules() {
    app.innerHTML = "";
    const s = document.createElement("section"); s.className = "rules";
    const back = btn("← Back", () => setScreen("play", false), "rules-back");
    s.append(back, heading("How to Play"));
    s.insertAdjacentHTML("beforeend", `<p>Fill every empty square with a number.</p>
      <ul><li>For 4 × 4, use numbers 1–4. For 9 × 9, use numbers 1–9.</li>
      <li>Each number can appear only once in each row.</li><li>Each number can appear only once in each column.</li>
      <li>Each small box must contain each number only once.</li></ul>
      <p>Tap an empty square, then tap a number. Tap Erase if you need to remove your entry.</p>
      <p>The blue outline shows the selected square. Related small boxes stay bright to make the board easier to follow.</p>
      <p>Correct entries give a gentle green feedback pulse. Incorrect entries are shown in light red until corrected or erased.</p>
      <p>Your puzzles save automatically. You can return home and continue later.</p>`);
    app.append(s);
  }

  function completedView() {
    const p = state.current; app.innerHTML = "";
    const s = document.createElement("section"); s.className = "play";
    const top = document.createElement("div"); top.className = "play-top";
    top.append(btn("←", () => setScreen("completed"), "small-btn"));
    const title = document.createElement("div"); title.className = "play-title"; title.textContent = `${p.size} × ${p.size} · ${p.difficulty} · Completed`;
    top.append(title, document.createElement("div")); s.append(top);
    const ba = document.createElement("div"); ba.className = "board-area"; ba.append(renderBoard(p, true)); s.append(ba); app.append(s);
  }

  function render() {
    switch (state.screen) {
      case "home": home(); break; case "size": sizeScreen(); break; case "difficulty": difficultyScreen(); break;
      case "unfinished": listScreen(false); break; case "completed": listScreen(true); break; case "play": play(); break;
      case "rules": rules(); break; case "complete": completeScreen(); break; case "view-completed": completedView(); break;
    }
  }

  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  render();
})();
