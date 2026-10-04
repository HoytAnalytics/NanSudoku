(() => {
  "use strict";
  const KEY="nans-sudoku-library-v1";
  const SETTINGS="nans-sudoku-settings-v1";
  const app=document.getElementById("app");
  const uid=()=>crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random();
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{unfinished:[],completed:[]}}catch{return {unfinished:[],completed:[]}}};
  const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
  const getSettings=()=>{try{return JSON.parse(localStorage.getItem(SETTINGS))||{highlight:true}}catch{return {highlight:true}}};
  const setSettings=x=>localStorage.setItem(SETTINGS,JSON.stringify(x));
  let state={screen:"home",selected:null,current:null,size:null,difficulty:null};
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  function btn(label,fn,cls="choice"){const b=document.createElement("button");b.className=cls;b.textContent=label;b.onclick=fn;return b}
  function setScreen(name){state.screen=name;state.selected=null;render()}
  function home(){
    app.innerHTML=""; const s=document.createElement("section");s.className="screen";
    s.innerHTML="<h1>Nan's Sudoku</h1>";
    const list=document.createElement("div");list.className="choice-list";
    list.append(btn("Continue Puzzle",()=>setScreen("unfinished")));
    list.append(btn("New Puzzle",()=>setScreen("size")));
    list.append(btn("Completed Puzzles",()=>setScreen("completed")));
    s.append(list);app.append(s);
  }
  function sizeScreen(){
    app.innerHTML="";const s=document.createElement("section");s.className="screen";
    s.append(btn("←",()=>setScreen("home"),"back"));
    s.innerHTML+="<h1>Choose Puzzle Size</h1>";
    const list=document.createElement("div");list.className="choice-list";
    list.append(btn("4 × 4",()=>{state.size=4;setScreen("difficulty")}));
    list.append(btn("9 × 9",()=>{state.size=9;setScreen("difficulty")}));
    s.append(list);app.append(s);
  }
  function difficultyScreen(){
    app.innerHTML="";const s=document.createElement("section");s.className="screen";
    s.append(btn("←",()=>setScreen("size"),"back"));s.innerHTML+="<h1>Choose Difficulty</h1>";
    const list=document.createElement("div");list.className="choice-list";
    ["Easy","Medium","Hard"].forEach(d=>list.append(btn(d,()=>startNew(state.size,d))));
    s.append(list);app.append(s);
  }
  function generateSolved(n){
    const box=Math.sqrt(n), a=Array.from({length:n},()=>Array(n).fill(0));
    function pattern(r,c){return (r*box+r/box+c)%n}
    const nums=[...Array(n).keys()].map(x=>x+1).sort(()=>Math.random()-.5);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)a[r][c]=nums[pattern(r,c)];
    // Random row/column permutations within bands/stacks.
    const shuffle=x=>x.sort(()=>Math.random()-.5);
    const bands=[...Array(box).keys()], rows=[], stacks=[...Array(box).keys()], cols=[];
    shuffle(bands).forEach(b=>shuffle([...Array(box).keys()]).forEach(r=>rows.push(b*box+r)));
    shuffle(stacks).forEach(b=>shuffle([...Array(box).keys()]).forEach(c=>cols.push(b*box+c)));
    return rows.map(r=>cols.map(c=>a[r][c]));
  }
  function givensFor(n,d){
    if(n===4) return d==="Easy"?4:d==="Medium"?6:8;
    return d==="Easy"?9:d==="Medium"?18:32;
  }
  function makePuzzle(n,d){
    const solution=generateSolved(n), total=n*n, remove=total-givensFor(n,d), positions=[...Array(total).keys()].sort(()=>Math.random()-.5);
    const puzzle=solution.map(r=>r.slice());
    for(let i=0;i<remove;i++){const p=positions[i];puzzle[Math.floor(p/n)][p%n]=0}
    // For Easy/Medium enforce the intended per-box starting structure by retrying if needed.
    if((d==="Easy"||d==="Medium") && n>=4){
      const box=Math.sqrt(n);
      for(let br=0;br<n;br+=box)for(let bc=0;bc<n;bc+=box){
        let empties=[];
        for(let r=br;r<br+box;r++)for(let c=bc;c<bc+box;c++)if(!puzzle[r][c])empties.push([r,c]);
        const max=d==="Easy"?1:2;
        while(empties.length>max){
          const [r,c]=empties.pop();puzzle[r][c]=solution[r][c];
        }
        while(empties.length<max){
          const candidates=[];
          for(let r=br;r<br+box;r++)for(let c=bc;c<bc+box;c++)if(puzzle[r][c])candidates.push([r,c]);
          if(!candidates.length)break;
          const [r,c]=candidates[Math.floor(Math.random()*candidates.length)];
          puzzle[r][c]=0;empties.push([r,c]);
        }
      }
    }
    return {solution,puzzle};
  }
  function startNew(n,d){
    const {solution,puzzle}=makePuzzle(n,d), now=new Date().toISOString();
    const p={id:uid(),size:n,difficulty:d,solution,puzzle,entries:puzzle.map(r=>r.slice()),startedAt:now,updatedAt:now};
    // New puzzle is saved immediately.
    const lib=load();lib.unfinished.unshift(p);save(lib);
    state.current=p;state.selected=null;setScreen("play");
  }
  function puzzleLabel(p){
    const filled=p.entries.flat().filter(Boolean).length, total=p.size*p.size;
    return `${p.size} × ${p.size} · ${p.difficulty} · ${filled}/${total} filled`;
  }
  function listScreen(completed){
    app.innerHTML="";const s=document.createElement("section");s.className="screen";
    s.append(btn("←",()=>setScreen("home"),"back"));
    s.innerHTML+=`<h1>${completed?"Completed Puzzles":"Continue Puzzle"}</h1>`;
    const lib=load(), arr=completed?lib.completed:lib.unfinished;
    if(!arr.length){s.innerHTML+=`<p class="empty">${completed?"No completed puzzles yet.":"There are no unfinished puzzles."}</p>`;app.append(s);return}
    const cards=document.createElement("div");cards.className="cards";
    arr.sort((a,b)=>new Date(b.updatedAt||b.completedAt||0)-new Date(a.updatedAt||a.completedAt||0)).forEach(p=>{
      const c=document.createElement("button");c.className="card";
      const date=p.completedAt||p.startedAt; c.innerHTML=`<strong>${p.size} × ${p.size} · ${esc(p.difficulty)}</strong><span>${completed?"Completed":"Progress"}: ${completed?"Complete":puzzleLabel(p).split("·").pop().trim()}<br>${new Date(date).toLocaleString()}</span>`;
      c.onclick=()=>{state.current=p;state.selected=null;if(completed)setScreen("view-completed");else setScreen("play")};cards.append(c);
    });
    s.append(cards);app.append(s);
  }
  function renderBoard(p,readOnly=false){
    const n=p.size, box=Math.sqrt(n), board=document.createElement("div");board.className="board";
    const available=Math.min(window.innerWidth*.88,window.innerHeight*(readOnly?.68:.58),720);
    const cell=Math.max(48,Math.floor((available-28)/n));
    board.style.gridTemplateColumns=`repeat(${n},${cell}px)`;board.style.gridTemplateRows=`repeat(${n},${cell}px)`;
    const highlight=getSettings().highlight;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const b=document.createElement("button");b.className="cell";
      const v=p.entries[r][c]; if(p.puzzle[r][c])b.classList.add("given");
      b.textContent=v||"";b.setAttribute("aria-label",`Row ${r+1}, column ${c+1}${v?`, ${v}`:", empty"}${p.puzzle[r][c]?", given":""}`);
      if(!readOnly && state.selected && state.selected[0]===r && state.selected[1]===c)b.classList.add("selected");
      if(!readOnly && state.selected && highlight){
        const [sr,sc]=state.selected; if(Math.floor(r/box)!==Math.floor(sr/box)&&Math.floor(c/box)!==Math.floor(sc/box))b.classList.add("dim");
      }
      if(p.bad && p.bad[`${r},${c}`])b.classList.add("bad");
      const br=(r+1)%box===0 && r!==n-1, bc=(c+1)%box===0 && c!==n-1;
      b.style.borderRightWidth=bc?"14px":"6px";b.style.borderBottomWidth=br?"14px":"6px";
      if(!readOnly)b.onclick=()=>{if(!p.puzzle[r][c]){if(state.selected&&state.selected[0]===r&&state.selected[1]===c)state.selected=null;else state.selected=[r,c];render()}};
      board.append(b);
    }
    return board;
  }
  function play(){
    const p=state.current;app.innerHTML="";const wrap=document.createElement("section");wrap.className="play";
    const top=document.createElement("div");top.className="play-top";
    top.append(btn("? ",()=>setScreen("rules"),"small-btn"),Object.assign(document.createElement("div"),{className:"play-title",textContent:`${p.size} × ${p.size} · ${p.difficulty}`}),btn("Home",()=>setScreen("home"),"small-btn"));
    wrap.append(top);
    const ba=document.createElement("div");ba.className="board-area";ba.append(renderBoard(p));wrap.append(ba);
    const pad=document.createElement("div");pad.className="num-pad";
    for(let n=1;n<=p.size;n++){const b=btn(String(n),()=>enter(n),"num-btn");pad.append(b)}
    pad.append(btn("Erase",()=>enter(0),"num-btn erase"));wrap.append(pad);app.append(wrap);
  }
  function enter(n){
    const p=state.current;if(!state.selected)return;
    const [r,c]=state.selected;if(p.puzzle[r][c])return;
    p.bad=p.bad||{};delete p.bad[`${r},${c}`];
    if(n===0){p.entries[r][c]=0;persistCurrent();render();return}
    if(n===p.solution[r][c]){
      p.entries[r][c]=n;persistCurrent();
      pulse("good",r,c);
      if(p.entries.flat().every(Boolean))complete(p);
      else render();
    }else{
      p.entries[r][c]=n;p.bad[`${r},${c}`]=true;persistCurrent();render();pulse("bad",r,c);
    }
  }
  function pulse(type,r,c){setTimeout(()=>{const el=[...document.querySelectorAll(".cell")][r*state.current.size+c];if(el){el.classList.add(`pulse-${type}`);setTimeout(()=>el.classList.remove(`pulse-${type}`),1300)}},0)}
  function persistCurrent(){
    const lib=load(),i=lib.unfinished.findIndex(x=>x.id===state.current.id);
    state.current.updatedAt=new Date().toISOString();
    if(i>=0)lib.unfinished[i]=state.current;else lib.unfinished.unshift(state.current);
    save(lib);
  }
  function complete(p){
    const lib=load();lib.unfinished=lib.unfinished.filter(x=>x.id!==p.id);
    p.completedAt=new Date().toISOString();delete p.bad;lib.completed.unshift(p);save(lib);setScreen("complete");
  }
  function completeScreen(){
    app.innerHTML="";const s=document.createElement("section");s.className="screen complete";
    s.innerHTML=`<div class="tick">✓</div><h1>Completed</h1>`;
    const list=document.createElement("div");list.className="choice-list";
    list.append(btn("Return to Home Page",()=>setScreen("home")));
    list.append(btn("Complete Another",()=>startNew(state.current.size,state.current.difficulty)));
    s.append(list);app.append(s);
  }
  function rules(){
    app.innerHTML="";const s=document.createElement("section");s.className="rules";
    s.innerHTML=`<button id="back">← Back</button><h1>How to Play</h1>
    <p>Fill every empty square with a number.</p>
    <ul><li>For 4 × 4, use numbers 1–4. For 9 × 9, use numbers 1–9.</li>
    <li>Each number can appear only once in each row.</li><li>Each number can appear only once in each column.</li>
    <li>Each small box must contain each number only once.</li></ul>
    <p>Tap an empty square, then tap a number. Tap Erase if you need to remove your entry.</p>
    <p>The blue outline shows the selected square. When highlighting is on, related small boxes stay bright to make the board easier to follow.</p>
    <p>Correct entries give a gentle green feedback pulse. Incorrect entries are shown in light red until corrected or erased.</p>
    <p>Your puzzles save automatically. You can return home and continue later.</p>`;
    s.querySelector("#back").onclick=()=>setScreen("play");app.append(s);
  }
  function completedView(){
    const p=state.current;app.innerHTML="";const s=document.createElement("section");s.className="play";
    const top=document.createElement("div");top.className="play-top";top.append(btn("←",()=>setScreen("completed"),"small-btn"),Object.assign(document.createElement("div"),{className:"play-title",textContent:`${p.size} × ${p.size} · ${p.difficulty} · Completed`}),document.createElement("div"));s.append(top);
    const ba=document.createElement("div");ba.className="board-area";ba.append(renderBoard(p,true));s.append(ba);app.append(s);
  }
  function render(){switch(state.screen){case"home":home();break;case"size":sizeScreen();break;case"difficulty":difficultyScreen();break;case"unfinished":listScreen(false);break;case"completed":listScreen(true);break;case"play":play();break;case"rules":rules();break;case"complete":completeScreen();break;case"view-completed":completedView();break}}
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  render();
})();