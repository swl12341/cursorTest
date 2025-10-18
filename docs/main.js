// Configuration
const COLS = 10;
const ROWS = 20;
const CELL = 32;

const COLORS = {
  I: '#00E4FF', J: '#0066FF', L: '#FF9400', O: '#FFCB00', 
  S: '#00CC66', T: '#AA00FF', Z: '#FF3333'
};

const SHAPES = {
  I: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]],
  J: [[[1,0,0],[1,1,1],[0,0,0]]],
  L: [[[0,0,1],[1,1,1],[0,0,0]]],
  O: [[[1,1],[1,1]]],
  S: [[[0,1,1],[1,1,0],[0,0,0]]],
  T: [[[0,1,0],[1,1,1],[0,0,0]]],
  Z: [[[1,1,0],[0,1,1],[0,0,0]]],
};

function rotateMatrix(m) {
  const N = m.length;
  const res = Array.from({length: N}, () => Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      res[c][N - 1 - r] = m[r][c];
    }
  }
  return res;
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

class Piece {
  constructor(kind) {
    this.kind = kind;
    this.rotations = clone(SHAPES[kind]);
    while (this.rotations.length < 4) {
      this.rotations.push(rotateMatrix(this.rotations[this.rotations.length - 1]));
    }
    this.index = 0;
    this.x = Math.floor(COLS / 2) - 2;
    this.y = -2;
  }
  get matrix() { return this.rotations[this.index]; }
  get color() { return COLORS[this.kind]; }
  rotate() { this.index = (this.index + 1) % 4; }
}

class Tetris {
  constructor() {
    this.grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.current = this.spawn();
    this.next = this.spawn();
    this.gameOver = false;
    this.paused = false;
    this.dropTimer = 0;
    this.dropInterval = this.levelToInterval(this.level);
  }
  
  levelToInterval(level) { return Math.max(100, 800 - (level - 1) * 70); }
  
  spawn() {
    const ids = Object.keys(SHAPES);
    return new Piece(ids[Math.floor(Math.random() * ids.length)]);
  }
  
  canMove(dx, dy, rotDelta = 0) {
    const nextIndex = (this.current.index + rotDelta) % 4;
    const matrix = this.current.rotations[nextIndex];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nx = this.current.x + c + dx;
        const ny = this.current.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && this.grid[ny][nx] !== null) return false;
      }
    }
    return true;
  }
  
  softDrop() {
    if (this.canMove(0, 1)) { this.current.y++; return true; }
    this.lock();
    return false;
  }
  
  hardDrop() {
    while (this.canMove(0, 1)) this.current.y++;
    this.lock();
  }
  
  lock() {
    const m = this.current.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const gx = this.current.x + c;
        const gy = this.current.y + r;
        if (gy < 0) { this.gameOver = true; return; }
        this.grid[gy][gx] = this.current.color;
      }
    }
    const cleared = this.clearLines();
    this.updateScore(cleared);
    this.current = this.next;
    this.next = this.spawn();
    if (!this.canMove(0, 0, 0)) this.gameOver = true;
  }
  
  clearLines() {
    let removed = 0;
    this.grid = this.grid.filter(row => {
      const full = row.every(cell => cell !== null);
      if (full) removed++;
      return !full;
    });
    while (this.grid.length < ROWS) this.grid.unshift(Array(COLS).fill(null));
    this.lines += removed;
    if (removed) {
      this.level = 1 + Math.floor(this.lines / 10);
      this.dropInterval = this.levelToInterval(this.level);
    }
    return removed;
  }
  
  updateScore(n) {
    const table = {0:0, 1:100, 2:300, 3:500, 4:800};
    this.score += (table[n] || 0) * this.level;
  }
  
  update(dtMs) {
    if (this.gameOver || this.paused) return;
    this.dropTimer += dtMs;
    if (this.dropTimer >= this.dropInterval) {
      this.softDrop();
      this.dropTimer = 0;
    }
  }
}

// DOM elements
const board = document.getElementById('board');
const ctx = board.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayHint = document.getElementById('overlayHint');

// Camera elements
const startCamBtn = document.getElementById('startCam');
const cam = document.getElementById('cam');
const camDebug = document.getElementById('camDebug');
const dctx = camDebug.getContext('2d');

// Rendering functions
function drawGrid() {
  ctx.strokeStyle = '#444';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
}

function drawCells(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = grid[r][c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    }
  }
}

function drawPiece(piece) {
  const m = piece.matrix;
  ctx.fillStyle = piece.color;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const x = (piece.x + c) * CELL;
      const y = (piece.y + r) * CELL;
      if (y < 0) continue;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    }
  }
}

function drawNext(game) {
  nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const m = game.next.matrix;
  nctx.fillStyle = game.next.color;
  const size = CELL - 6;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const x = 12 + c * size;
      const y = 12 + r * size;
      nctx.fillRect(x, y, size - 2, size - 2);
    }
  }
}

function updateHud(game) {
  scoreEl.textContent = game.score;
  levelEl.textContent = game.level;
  linesEl.textContent = game.lines;
}

function showOverlay(title, hint) {
  overlayTitle.textContent = title;
  overlayHint.textContent = hint;
  overlay.classList.remove('hidden');
}

function hideOverlay() { 
  overlay.classList.add('hidden'); 
}

// Game instance and loop
const game = new Tetris();
let last = performance.now();

function gameLoop(now) {
  const dt = now - last; 
  last = now;
  game.update(dt);

  ctx.clearRect(0, 0, board.width, board.height);
  drawGrid();
  drawCells(game.grid);
  if (!game.gameOver) drawPiece(game.current);
  drawNext(game);
  updateHud(game);

  if (game.gameOver) {
    showOverlay('GAME OVER', 'Press R to Restart');
  }

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// Keyboard input
window.addEventListener('keydown', (e) => {
  if (game.gameOver) {
    if (e.key.toLowerCase() === 'r') {
      hideOverlay();
      Object.assign(game, new Tetris());
    }
    return;
  }

  if (e.key.toLowerCase() === 'p') {
    game.paused = !game.paused;
    if (game.paused) showOverlay('PAUSED', 'Press P to Resume'); 
    else hideOverlay();
    return;
  }

  if (game.paused) return;

  if (e.key === 'ArrowLeft' && game.canMove(-1, 0)) game.current.x--;
  else if (e.key === 'ArrowRight' && game.canMove(1, 0)) game.current.x++;
  else if (e.key === 'ArrowUp' && game.canMove(0, 0, 1)) game.current.rotate();
  else if (e.key === 'ArrowDown') game.softDrop();
  else if (e.code === 'Space') game.hardDrop();
});

// ===== Camera Gesture Control =====
let pose = null;
let camera = null;
let isCameraActive = false;
let gestureState = {
  lastCenterX: null,
  lastLeftWristY: null,
  lastRightWristY: null,
  gestureCooldown: 0,
  moveCooldown: 0,
  rotateCooldown: 0,
  dropCooldown: 0
};

// Status indicators
function updateCameraStatus(status) {
  if (startCamBtn) {
    startCamBtn.textContent = status;
    startCamBtn.disabled = status !== '启用摄像头控制';
  }
}

function showError(message) {
  console.error('Camera Error:', message);
  updateCameraStatus('摄像头错误 - 点击重试');
  if (startCamBtn) startCamBtn.disabled = false;
}

// Initialize MediaPipe Pose
async function initializePose() {
  if (pose) return pose;
  
  try {
    // Check if MediaPipe is loaded
    if (typeof Pose === 'undefined') {
      if (window.mediaPipeLoadError) {
        throw new Error('MediaPipe failed to load from all CDN sources. Please check your internet connection or try a different browser.');
      } else {
        throw new Error('MediaPipe is still loading. Please wait a moment and try again.');
      }
    }
    
    // Wait a bit more for Pose to be fully available
    let attempts = 0;
    while (typeof Pose.Pose === 'undefined' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof Pose.Pose === 'undefined') {
      throw new Error('Pose.Pose constructor not available. MediaPipe may not be fully loaded.');
    }
    
    pose = new Pose.Pose({
      locateFile: (file) => {
        // Try multiple CDN sources for model files
        const sources = [
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
          `https://unpkg.com/@mediapipe/pose@0.5/${file}`
        ];
        return sources[0]; // Start with first source
      }
    });
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
    
    pose.onResults(onPoseResults);
    return pose;
  } catch (error) {
    showError('Failed to initialize pose detection: ' + error.message);
    throw error;
  }
}

// Process pose detection results
function onPoseResults(results) {
  if (!isCameraActive || game.paused || game.gameOver) return;
  
  dctx.clearRect(0, 0, camDebug.width, camDebug.height);
  
  if (!results.poseLandmarks) {
    // Draw "No person detected" message
    dctx.fillStyle = '#ff6666';
    dctx.font = '14px monospace';
    dctx.fillText('No person detected', 10, 20);
    return;
  }
  
  // Draw skeleton for debugging
  if (window.drawConnectors && window.drawLandmarks) {
    dctx.save();
    dctx.translate(camDebug.width, 0);
    dctx.scale(-1, 1); // Mirror for selfie view
    drawConnectors(dctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {color: '#00FFAA', lineWidth: 2});
    drawLandmarks(dctx, results.poseLandmarks, {color: '#FF0066', lineWidth: 1});
    dctx.restore();
  }
  
  // Extract key landmarks
  const lm = results.poseLandmarks;
  const nose = lm[0];
  const leftWrist = lm[15];
  const rightWrist = lm[16];
  const rightShoulder = lm[12];
  const leftHip = lm[23];
  const rightHip = lm[24];
  
  const now = performance.now();
  
  // Gesture 1: Lateral movement (body center)
  if (nose) {
    const centerX = nose.x;
    if (gestureState.lastCenterX !== null) {
      const delta = centerX - gestureState.lastCenterX;
      const threshold = 0.02; // Reduced for more sensitivity
      
      if (Math.abs(delta) > threshold && (now - gestureState.moveCooldown) > 100) {
        if (delta < 0 && game.canMove(-1, 0)) {
          game.current.x--;
          gestureState.moveCooldown = now;
        } else if (delta > 0 && game.canMove(1, 0)) {
          game.current.x++;
          gestureState.moveCooldown = now;
        }
      }
    }
    gestureState.lastCenterX = centerX;
  }
  
  // Gesture 2: Rotation (right wrist above right shoulder)
  if (rightWrist && rightShoulder && (now - gestureState.rotateCooldown) > 300) {
    const threshold = 0.05; // Wrist must be significantly above shoulder
    if (rightWrist.y < (rightShoulder.y - threshold) && game.canMove(0, 0, 1)) {
      game.current.rotate();
      gestureState.rotateCooldown = now;
    }
  }
  
  // Gesture 3: Hard drop (left wrist below hips with downward motion)
  if (leftWrist && leftHip && rightHip && (now - gestureState.dropCooldown) > 500) {
    const hipY = (leftHip.y + rightHip.y) / 2;
    const threshold = 0.08; // Wrist must be well below hips
    
    if (leftWrist.y > (hipY + threshold)) {
      if (gestureState.lastLeftWristY !== null) {
        const downwardMotion = leftWrist.y - gestureState.lastLeftWristY;
        if (downwardMotion > 0.02) { // Fast downward motion
          game.hardDrop();
          gestureState.dropCooldown = now;
        }
      }
    }
    gestureState.lastLeftWristY = leftWrist.y;
  }
  
  // Draw gesture indicators
  dctx.fillStyle = '#ffffff';
  dctx.font = '12px monospace';
  dctx.fillText('Camera Active', 10, camDebug.height - 20);
}

// Start camera and pose detection
async function startCamera() {
  if (isCameraActive) return;
  
  try {
    updateCameraStatus('正在初始化...');
    
    // Initialize pose detection
    await initializePose();
    
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 360 }
      }
    });
    
    // Setup video element
    cam.srcObject = stream;
    cam.classList.remove('hidden');
    camDebug.classList.remove('hidden');
    
    await cam.play();
    
    // Initialize camera for pose detection
    camera = new Camera(cam, {
      onFrame: async () => {
        if (pose && isCameraActive) {
          try {
            await pose.send({image: cam});
          } catch (error) {
            console.warn('Pose detection error:', error);
          }
        }
      },
      width: 640,
      height: 360
    });
    
    camera.start();
    isCameraActive = true;
    updateCameraStatus('摄像头已启用');
    
    // Reset gesture state
    gestureState = {
      lastCenterX: null,
      lastLeftWristY: null,
      lastRightWristY: null,
      gestureCooldown: 0,
      moveCooldown: 0,
      rotateCooldown: 0,
      dropCooldown: 0
    };
    
  } catch (error) {
    showError(error.message);
    isCameraActive = false;
  }
}

// Stop camera
function stopCamera() {
  if (camera) {
    camera.stop();
    camera = null;
  }
  if (cam.srcObject) {
    cam.srcObject.getTracks().forEach(track => track.stop());
    cam.srcObject = null;
  }
  cam.classList.add('hidden');
  camDebug.classList.add('hidden');
  isCameraActive = false;
  updateCameraStatus('启用摄像头控制');
}

// Event listeners
if (startCamBtn) {
  startCamBtn.addEventListener('click', () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopCamera);


