window.CLONE_WARS_GAME = true;

const DEFAULTS = {
  title: 'Flap Clone', fix: 'none', canvasWidth: 360, canvasHeight: 640,
  gravity: 1400, flapStrength: 420, birdSize: 34, pipeWidth: 64,
  pipeGap: 150, pipeSpacing: 260, pipeSpeed: 150, groundHeight: 80,
  modes: { easy: { pipeGap: 190, pipeSpeed: 110 }, normal: { pipeGap: 150, pipeSpeed: 150 } }
};
const CONFIG = Object.assign({}, DEFAULTS, window.GAME_CONFIG || {});

const ART_NAMES = ['drawBackground', 'drawGround', 'drawBird', 'drawPipe'];
const SOUND_NAMES = ['flap', 'score', 'crash'];
const missing = [];
if (!window.GAME_CONFIG) missing.push('settings');
else for (const key of Object.keys(DEFAULTS)) { if (!(key in window.GAME_CONFIG)) missing.push(key); }
if (!window.SPRITES) missing.push('art');
else for (const name of ART_NAMES) { if (typeof window.SPRITES[name] !== 'function') missing.push(name); }
if (!window.SOUNDS) missing.push('sound');
else for (const name of SOUND_NAMES) { if (typeof window.SOUNDS[name] !== 'function') missing.push(name); }
document.getElementById('missing-label').textContent = missing.length ? 'placeholder: ' + missing.join(', ') + ' missing' : '';

function placeholderBackground(ctx, width, height, time) { ctx.fillStyle = '#74c9f5'; ctx.fillRect(0, 0, width, height); }
function placeholderGround(ctx, width, height, groundHeight, offset) { ctx.fillStyle = '#6b4b2a'; ctx.fillRect(0, height - groundHeight, width, groundHeight); }
function placeholderBird(ctx, x, y, size, velocity) { ctx.fillStyle = '#ffd447'; ctx.fillRect(x - size / 2, y - size / 2, size, size); }
function placeholderPipe(ctx, x, gapTop, gapBottom, pipeWidth, height) { ctx.fillStyle = '#4c9a4c'; ctx.fillRect(x, 0, pipeWidth, gapTop); ctx.fillRect(x, gapBottom, pipeWidth, height - gapBottom); }

const drawBackground = (window.SPRITES && typeof window.SPRITES.drawBackground === 'function') ? window.SPRITES.drawBackground : placeholderBackground;
const drawGround = (window.SPRITES && typeof window.SPRITES.drawGround === 'function') ? window.SPRITES.drawGround : placeholderGround;
const drawBird = (window.SPRITES && typeof window.SPRITES.drawBird === 'function') ? window.SPRITES.drawBird : placeholderBird;
const drawPipe = (window.SPRITES && typeof window.SPRITES.drawPipe === 'function') ? window.SPRITES.drawPipe : placeholderPipe;

let muted = false;
function play(name) {
  if (muted) return;
  const sound = window.SOUNDS && window.SOUNDS[name];
  if (typeof sound === 'function') { try { sound(); } catch (error) {} }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const fixButtons = document.getElementById('fix-buttons');
const sr = document.getElementById('sr');

let state = 'ready';
let y = CONFIG.canvasHeight / 2;
let velocity = 0;
let pipes = [];
let pipesMade = 0;
let groundOffset = 0;
let lastGapTop = (CONFIG.canvasHeight - CONFIG.groundHeight - CONFIG.pipeGap) / 2;
let score = 0;
let checkpoint = 0;
let bestScore = 0;
let secondsSinceCrash = 0;
let currentMode = 'normal';
let lastTime = null;
try { bestScore = parseInt(localStorage.getItem('cloneWarsBest'), 10) || 0; } catch (error) {}

function soundLine() { return muted ? 'Press M to turn sound on.' : 'Press M to turn sound off.'; }
function showReady() {
  overlayTitle.textContent = CONFIG.title;
  overlayText.textContent = ['Press Space, click or tap to start.', soundLine()].join('\n');
  overlay.hidden = false;
}
function showGameOver() {
  overlayTitle.textContent = 'Game over';
  const lines = ['Score ' + score + '   ·   Best ' + bestScore, 'Press Space, click or tap to play again.'];
  if (checkpoint > 0) lines.push('Next game starts at checkpoint ' + checkpoint + '.');
  lines.push(soundLine());
  overlayText.textContent = lines.join('\n');
  overlay.hidden = false;
}
function startGame() {
  state = 'playing';
  y = (CONFIG.canvasHeight - CONFIG.groundHeight) / 2;
  velocity = -CONFIG.flapStrength;
  pipes = [];
  pipesMade = 0;
  groundOffset = 0;
  lastGapTop = (CONFIG.canvasHeight - CONFIG.groundHeight - CONFIG.pipeGap) / 2;
  score = checkpoint;
  secondsSinceCrash = 0;
  overlay.hidden = true;
  play('flap');
}
function press() {
  if (state === 'ready') startGame();
  else if (state === 'playing') { velocity = -CONFIG.flapStrength; play('flap'); }
  else if (state === 'gameover' && secondsSinceCrash >= 0.4) startGame();
}

window.addEventListener('keydown', (event) => {
  if (event.target && event.target.closest && event.target.closest('button')) return;
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    press();
  } else if (event.code === 'KeyM') {
    muted = !muted;
    if (state === 'ready') showReady();
    if (state === 'gameover') showGameOver();
  }
});
window.addEventListener('pointerdown', (event) => {
  if (event.target && event.target.closest && event.target.closest('button')) return;
  press();
});

function addPipe(pipeGap) {
  const gap = pipeGap + (CONFIG.fix === 'gentle-start' && pipesMade < 3 ? 70 : 0);
  const lowest = CONFIG.canvasHeight - CONFIG.groundHeight - 60 - gap;
  const gapTop = Math.max(60, Math.min(lowest, lastGapTop + (Math.random() * 360 - 180)));
  const gapBottom = gapTop + gap;
  lastGapTop = gapTop;
  pipes.push({ x: CONFIG.canvasWidth, gapTop: gapTop, gapBottom: gapBottom, scored: false });
  pipesMade += 1;
}
function crash() {
  if (state !== 'playing') return;
  state = 'gameover';
  secondsSinceCrash = 0;
  play('crash');
  if (score > bestScore) bestScore = score;
  try { localStorage.setItem('cloneWarsBest', String(bestScore)); } catch (error) {}
  checkpoint = CONFIG.fix === 'checkpoints' ? Math.floor(score / 10) * 10 : 0;
  sr.textContent = 'Game over. Score ' + score + '. Best ' + bestScore + '.';
  showGameOver();
}

function drawEnvironmentCue(ctx, width, environment) {
  if (environment <= 0) return;
  const colors = ['#5b3f8c', '#1f6f78', '#8a4b2a', '#365c3a'];
  const color = colors[(environment - 1) % colors.length];
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(0, 0, width, 54);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#182033';
  ctx.fillStyle = '#fff';
  ctx.strokeText('Environment ' + (environment + 1), width / 2, 34);
  ctx.fillText('Environment ' + (environment + 1), width / 2, 34);
  ctx.restore();
}

if (CONFIG.fix === 'easy-mode') {
  for (const mode of ['easy', 'normal']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = mode === 'easy' ? 'Easy' : 'Normal';
    button.setAttribute('aria-pressed', String(mode === currentMode));
    button.addEventListener('click', (event) => {
      currentMode = mode;
      for (const other of fixButtons.querySelectorAll('button')) {
        other.setAttribute('aria-pressed', String(other === event.currentTarget));
      }
      event.currentTarget.blur();
    });
    fixButtons.appendChild(button);
  }
}

function frame(now) {
  const seconds = lastTime === null ? 0 : Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  let environment = CONFIG.fix === 'custom' ? Math.floor(score / 10) : 0;
  if (state === 'playing') {
    const mode = CONFIG.fix === 'easy-mode' ? CONFIG.modes[currentMode] : CONFIG;
    const pipeGap = mode.pipeGap;
    let pipeSpeed = mode.pipeSpeed * (CONFIG.fix === 'gentle-start' && score < 3 ? 0.75 : 1);
    const startingGap = Math.min(CONFIG.birdSize * 6, pipeGap * 1.2);
    const customGap = Math.max(CONFIG.birdSize * 3, startingGap * Math.pow(0.92, environment));
    if (CONFIG.fix === 'custom') pipeSpeed *= Math.pow(1.1, environment);
    velocity += CONFIG.gravity * seconds;
    y += velocity * seconds;
    const birdX = CONFIG.canvasWidth / 4;
    groundOffset += pipeSpeed * seconds;
    if (pipes.length === 0) addPipe(CONFIG.fix === 'custom' ? customGap : pipeGap);
    else if (pipes[pipes.length - 1].x <= CONFIG.canvasWidth - CONFIG.pipeSpacing) addPipe(CONFIG.fix === 'custom' ? customGap : pipeGap);
    for (const pipe of pipes) {
      pipe.x -= pipeSpeed * seconds;
      if (!pipe.scored && pipe.x + CONFIG.pipeWidth < birdX) { pipe.scored = true; score += 1; play('score'); }
    }
    environment = CONFIG.fix === 'custom' ? Math.floor(score / 10) : 0;
    pipes = pipes.filter((pipe) => pipe.x + CONFIG.pipeWidth > 0);
    const half = CONFIG.birdSize / 2;
    if (y + half >= CONFIG.canvasHeight - CONFIG.groundHeight || y - half <= 0) crash();
    for (const pipe of pipes) {
      const overlapsX = birdX + half > pipe.x && birdX - half < pipe.x + CONFIG.pipeWidth;
      if (overlapsX && (y - half < pipe.gapTop || y + half > pipe.gapBottom)) crash();
    }
  } else if (state === 'gameover') secondsSinceCrash += seconds;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elapsed = reduceMotion ? 0 : (now || 0) / 1000;
  drawBackground(ctx, CONFIG.canvasWidth, CONFIG.canvasHeight, reduceMotion ? 0 : elapsed + environment * 1000);
  if (state === 'playing') drawEnvironmentCue(ctx, CONFIG.canvasWidth, environment);
  for (const pipe of pipes) drawPipe(ctx, pipe.x, pipe.gapTop, pipe.gapBottom, CONFIG.pipeWidth, CONFIG.canvasHeight - CONFIG.groundHeight);
  drawGround(ctx, CONFIG.canvasWidth, CONFIG.canvasHeight, CONFIG.groundHeight, groundOffset);
  drawBird(ctx, CONFIG.canvasWidth / 4, y, CONFIG.birdSize, velocity);
  if (state === 'playing') {
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = 'bold 32px sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#182033'; ctx.fillStyle = '#fff';
    ctx.strokeText(String(score), CONFIG.canvasWidth / 2, 48); ctx.fillText(String(score), CONFIG.canvasWidth / 2, 48);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}

showReady();
requestAnimationFrame(frame);
