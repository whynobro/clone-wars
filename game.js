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
let coins = [];
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

const SKINS = [
  { id: 'classic', name: 'Classic Iron', price: 0 },
  { id: 'ember', name: 'Ember Pot', price: 5 },
  { id: 'moss', name: 'Mossy Climber', price: 10 },
  { id: 'aurora', name: 'Aurora Metal', price: 20 }
];
let coinBank = 0;
let ownedSkins = ['classic'];
let equippedSkin = 'classic';
try {
  coinBank = parseInt(localStorage.getItem('cloneWarsCoins'), 10) || 0;
  const savedOwned = JSON.parse(localStorage.getItem('cloneWarsSkins') || 'null');
  if (Array.isArray(savedOwned) && savedOwned.includes('classic')) ownedSkins = savedOwned;
  const savedEquipped = localStorage.getItem('cloneWarsEquippedSkin');
  if (ownedSkins.includes(savedEquipped)) equippedSkin = savedEquipped;
} catch (error) {}

function saveShop() {
  try {
    localStorage.setItem('cloneWarsCoins', String(coinBank));
    localStorage.setItem('cloneWarsSkins', JSON.stringify(ownedSkins));
    localStorage.setItem('cloneWarsEquippedSkin', equippedSkin);
  } catch (error) {}
}

const shopButton = document.createElement('button');
shopButton.type = 'button';
shopButton.textContent = 'Shop';
shopButton.setAttribute('aria-expanded', 'false');
fixButtons.appendChild(shopButton);
const shopPanel = document.createElement('div');
shopPanel.hidden = true;
shopPanel.style.background = '#111722';
shopPanel.style.border = '2px solid #d9a441';
shopPanel.style.color = '#fff';
shopPanel.style.padding = '12px';
shopPanel.style.margin = '8px auto';
shopPanel.style.maxWidth = '320px';
shopPanel.style.textAlign = 'left';
document.body.appendChild(shopPanel);

function renderShop() {
  shopPanel.textContent = '';
  const heading = document.createElement('strong');
  heading.textContent = 'Marketplace';
  shopPanel.appendChild(heading);
  const balance = document.createElement('p');
  balance.textContent = 'Coins: ' + coinBank;
  shopPanel.appendChild(balance);
  for (const skin of SKINS) {
    const row = document.createElement('div');
    row.style.margin = '6px 0';
    const button = document.createElement('button');
    button.type = 'button';
    const owned = ownedSkins.includes(skin.id);
    const equipped = equippedSkin === skin.id;
    button.textContent = equipped ? skin.name + ' (equipped)' : owned ? 'Equip ' + skin.name : 'Buy ' + skin.name + ' (' + skin.price + ' coins)';
    button.disabled = !owned && coinBank < skin.price;
    button.addEventListener('click', () => {
      if (!owned) {
        if (coinBank < skin.price) return;
        coinBank -= skin.price;
        ownedSkins.push(skin.id);
      }
      equippedSkin = skin.id;
      saveShop();
      renderShop();
    });
    row.appendChild(button);
    shopPanel.appendChild(row);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close shop';
  close.addEventListener('click', () => {
    shopPanel.hidden = true;
    shopButton.setAttribute('aria-expanded', 'false');
  });
  shopPanel.appendChild(close);
}
shopButton.addEventListener('click', () => {
  shopPanel.hidden = !shopPanel.hidden;
  shopButton.setAttribute('aria-expanded', String(!shopPanel.hidden));
  if (!shopPanel.hidden) renderShop();
});
renderShop();

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
  coins = [];
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
  pipesMade += 1;
  pipes.push({ x: CONFIG.canvasWidth, gapTop: gapTop, gapBottom: gapBottom, baseGapTop: gapTop, phase: Math.random() * Math.PI * 2, scored: false });
  if (pipesMade % 2 === 0 && Math.random() < 0.75 || pipesMade % 2 === 1 && Math.random() < 0.25) {
    coins.push({ x: CONFIG.canvasWidth + CONFIG.pipeWidth + 24, y: gapTop + gap * (0.35 + Math.random() * 0.3), spin: Math.random() * Math.PI * 2, collected: false });
  }
}

function drawCoin(ctx, x, y, spin) {
  ctx.save();
  ctx.translate(x, y);
  const width = 0.45 + Math.abs(Math.cos(spin)) * 0.55;
  ctx.scale(width, 1);
  ctx.fillStyle = '#f5c84b';
  ctx.strokeStyle = '#5c3a12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff0a8';
  ctx.beginPath();
  ctx.arc(-3, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
    const gatesMove = CONFIG.fix === 'custom' && score >= 20;
    const groundTop = CONFIG.canvasHeight - CONFIG.groundHeight;
    for (const pipe of pipes) {
      if (!gatesMove) continue;
      const gapSize = pipe.gapBottom - pipe.gapTop;
      const travel = Math.min(70, Math.max(0, (groundTop - gapSize - 120) / 2));
      const center = pipe.baseGapTop + gapSize / 2 + Math.sin((now || 0) / 1000 * 1.7 + pipe.phase) * travel;
      const boundedCenter = Math.max(60 + gapSize / 2, Math.min(groundTop - 60 - gapSize / 2, center));
      pipe.gapTop = boundedCenter - gapSize / 2;
      pipe.gapBottom = boundedCenter + gapSize / 2;
    }
    for (const coin of coins) {
      coin.x -= pipeSpeed * seconds;
      coin.spin += seconds * 8;
      if (!coin.collected && Math.hypot(coin.x - birdX, coin.y - y) < CONFIG.birdSize * 0.8) {
        coin.collected = true;
        coinBank += 1;
        saveShop();
        play('score');
        if (!shopPanel.hidden) renderShop();
      }
    }
    coins = coins.filter((coin) => !coin.collected && coin.x + 12 > 0);
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
  for (const coin of coins) drawCoin(ctx, coin.x, coin.y, coin.spin);
  drawGround(ctx, CONFIG.canvasWidth, CONFIG.canvasHeight, CONFIG.groundHeight, groundOffset);
  drawBird(ctx, CONFIG.canvasWidth / 4, y, CONFIG.birdSize, velocity, equippedSkin);
  if (state === 'playing') {
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = 'bold 32px sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#182033'; ctx.fillStyle = '#fff';
    ctx.strokeText(String(score), CONFIG.canvasWidth / 2, 48); ctx.fillText(String(score), CONFIG.canvasWidth / 2, 48);
    ctx.textAlign = 'left'; ctx.font = 'bold 16px sans-serif'; ctx.lineWidth = 3;
    ctx.strokeText('Coins: ' + coinBank, 10, 26); ctx.fillText('Coins: ' + coinBank, 10, 26);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}

showReady();
requestAnimationFrame(frame);
