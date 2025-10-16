const COLS = 10;
const ROWS = 20;
const CELL = 32;
const COLORS = { I:'#00E4FF', J:'#0066FF', L:'#FF9400', O:'#FFCB00', S:'#00CC66', T:'#AA00FF', Z:'#FF3333' };
const SHAPES = {
  I: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]],
  J: [[[1,0,0],[1,1,1],[0,0,0]]],
  L: [[[0,0,1],[1,1,1],[0,0,0]]],
  O: [[[1,1],[1,1]]],
  S: [[[0,1,1],[1,1,0],[0,0,0]]],
  T: [[[0,1,0],[1,1,1],[0,0,0]]],
  Z: [[[1,1,0],[0,1,1],[0,0,0]]],
};
function rot(m){const N=m.length,r=Array.from({length:N},()=>Array(N).fill(0));for(let i=0;i<N;i++)for(let j=0;j<N;j++)r[j][N-1-i]=m[i][j];return r}
function deep(o){return JSON.parse(JSON.stringify(o))}
class Piece{constructor(k){this.kind=k;this.rotations=deep(SHAPES[k]);while(this.rotations.length<4)this.rotations.push(rot(this.rotations.at(-1)));this.index=0;this.x=Math.floor(COLS/2)-2;this.y=-2}get matrix(){return this.rotations[this.index]}get color(){return COLORS[this.kind]}rotate(){this.index=(this.index+1)%4}}
class Tetris{constructor(){this.grid=Array.from({length:ROWS},()=>Array(COLS).fill(null));this.score=0;this.level=1;this.lines=0;this.current=this.spawn();this.next=this.spawn();this.gameOver=false;this.paused=false;this.dropTimer=0;this.dropInterval=this.levelToInterval(this.level)}levelToInterval(l){return Math.max(100,800-(l-1)*70)}spawn(){const ids=Object.keys(SHAPES);return new Piece(ids[Math.floor(Math.random()*ids.length)])}canMove(dx,dy,rd=0){const idx=(this.current.index+rd)%4,m=this.current.rotations[idx];for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++){if(!m[r][c])continue;const nx=this.current.x+c+dx,ny=this.current.y+r+dy;if(nx<0||nx>=COLS||ny>=ROWS)return false;if(ny>=0&&this.grid[ny][nx]!==null)return false}return true}softDrop(){if(this.canMove(0,1)){this.current.y++;return true}this.lock();return false}hardDrop(){while(this.canMove(0,1))this.current.y++;this.lock()}lock(){const m=this.current.matrix;for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++){if(!m[r][c])continue;const gx=this.current.x+c,gy=this.current.y+r;if(gy<0){this.gameOver=true;return}this.grid[gy][gx]=this.current.color}const cleared=this.clearLines();this.updateScore(cleared);this.current=this.next;this.next=this.spawn();if(!this.canMove(0,0,0))this.gameOver=true}clearLines(){let rem=0;this.grid=this.grid.filter(row=>{const full=row.every(x=>x!==null);if(full)rem++;return !full});while(this.grid.length<ROWS)this.grid.unshift(Array(COLS).fill(null));this.lines+=rem;if(rem){this.level=1+Math.floor(this.lines/10);this.dropInterval=this.levelToInterval(this.level)}return rem}updateScore(n){const t={0:0,1:100,2:300,3:500,4:800};this.score+=(t[n]||0)*this.level}update(dt){if(this.gameOver||this.paused)return;this.dropTimer+=dt;if(this.dropTimer>=this.dropInterval){this.softDrop();this.dropTimer=0}}}
const board=document.getElementById('board');const ctx=board.getContext('2d');const nextCanvas=document.getElementById('next');const nctx=nextCanvas.getContext('2d');const scoreEl=document.getElementById('score');const levelEl=document.getElementById('level');const linesEl=document.getElementById('lines');const overlay=document.getElementById('overlay');const overlayTitle=document.getElementById('overlayTitle');const overlayHint=document.getElementById('overlayHint');
function drawGrid(){ctx.strokeStyle='#444';for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)ctx.strokeRect(c*CELL,r*CELL,CELL,CELL)}
function drawCells(g){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const col=g[r][c];if(!col)continue;ctx.fillStyle=col;ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2)}}
function drawPiece(p){const m=p.matrix;ctx.fillStyle=p.color;for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++){if(!m[r][c])continue;const x=(p.x+c)*CELL,y=(p.y+r)*CELL;if(y<0)continue;ctx.fillRect(x+1,y+1,CELL-2,CELL-2)}}
function drawNext(g){nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);const m=g.next.matrix;nctx.fillStyle=g.next.color;const size=CELL-6;for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++){if(!m[r][c])continue;const x=12+c*size,y=12+r*size;nctx.fillRect(x,y,size-2,size-2)}}
function hud(g){scoreEl.textContent=g.score;levelEl.textContent=g.level;linesEl.textContent=g.lines}
function show(t,h){overlayTitle.textContent=t;overlayHint.textContent=h;overlay.classList.remove('hidden')}function hide(){overlay.classList.add('hidden')}
const game=new Tetris();let last=performance.now();function loop(now){const dt=now-last;last=now;game.update(dt);ctx.clearRect(0,0,board.width,board.height);drawGrid();drawCells(game.grid);if(!game.gameOver)drawPiece(game.current);drawNext(game);hud(game);if(game.gameOver)show('GAME OVER','Press R to Restart');requestAnimationFrame(loop)}requestAnimationFrame(loop);
addEventListener('keydown',e=>{if(game.gameOver){if(e.key.toLowerCase()==='r'){hide();Object.assign(game,new Tetris())}return}if(e.key.toLowerCase()==='p'){game.paused=!game.paused;game.paused?show('PAUSED','Press P to Resume'):hide();return}if(game.paused)return;if(e.key==='ArrowLeft'&&game.canMove(-1,0))game.current.x--;else if(e.key==='ArrowRight'&&game.canMove(1,0))game.current.x++;else if(e.key==='ArrowUp'&&game.canMove(0,0,1))game.current.rotate();else if(e.key==='ArrowDown')game.softDrop();else if(e.code==='Space')game.hardDrop()})


