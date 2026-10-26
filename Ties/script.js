// TODO:
// - improve ai movement
// - leaderboard
// - multiplayer
// - different arena shapes

// Done:
// - sound effects on tie cut
// - ambient hum
// - particles on bounce for visual feedback (but commented)
// - direction timer progress bar

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let arenaRadius;
let center = { x: 0, y: 0 };

// Arena sizing controls (uniform scale).
// I can tweak these two values to perfect circle size/position.
const ARENA_SCALE = 0.465;      // 0.0-0.5; higher = larger circle relative to viewport
const ARENA_TOP_RESERVE = 140; // px reserved above arena for header/scoreboard

// player ball
const player = {
  x: center.x + 100,
  y: center.y,
  radius: 10,
  color: "lime",
  vx: 2,
  vy: 0,
  canChangeDir: false,
  glow: false,
  ties: [],
  tiesCount: 0,
};

// ai ball
const ai = {
  x: center.x - 100,
  y: center.y,
  radius: 10,
  color: "red",
  vx: 1.5,
  vy: 1,
  ties: [],
  tiesCount: 0,
};

function resizeCanvas() {
  // Reserve vertical space for the header/scoreboard so the arena sits lower.
  canvas.width = window.innerWidth;
  canvas.height = Math.max(540, window.innerHeight - ARENA_TOP_RESERVE);

  const minDimension = Math.min(canvas.width, canvas.height);
  arenaRadius = minDimension * ARENA_SCALE; // single knob to resize uniformly
  center = { x: canvas.width / 2, y: canvas.height / 2 };

  // reposition player and AI when resizing
  player.x = center.x + arenaRadius * 0.4;
  player.y = center.y;
  ai.x = center.x - arenaRadius * 0.4;
  ai.y = center.y;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function scaleGameObjects() {
  const scale = Math.min(canvas.width, canvas.height) / 600; // base 600px
  player.radius = 10 * scale;
  ai.radius = 10 * scale;
}
scaleGameObjects();

const particles = [];


// audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// tone
function playNote(frequency, duration = 0.2) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.value = frequency;
  filter.type = "lowpass";
  filter.frequency.value = 800 + Math.random() * 400;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// random pitch
function varyPitch(baseFreq, range = 0.1)
{
  return baseFreq * (1 + (Math.random() * 2 - 1) * range);
}

// tie cut sound (metallic for now)
function playCutSound() {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc1.type = "sawtooth";
  osc2.type = "square";
  osc1.frequency.value = varyPitch(400, 0.15);
  osc2.frequency.value = varyPitch(446, 0.15);

  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + 0.3);
  osc2.stop(audioCtx.currentTime + 0.3);
}

// winning/losing sound effects
function playWinSound() {
  const freqs = [523, 659, 784]; // C5, E5, G5
  freqs.forEach((f, i) => setTimeout(() => playNote(f, 0.3), i * 200));
}

function playLoseSound() {
  const freqs = [392, 294, 196]; // G4, D4, G3
  freqs.forEach((f, i) => setTimeout(() => playNote(f, 0.3), i * 200));
}

// ambient hum
let humOsc = null;
function startAmbientHum() {
  if (humOsc) return;
  humOsc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  humOsc.type = "sine";
  humOsc.frequency.value = 80;
  gain.gain.value = 0.05;
  humOsc.connect(gain).connect(audioCtx.destination);
  humOsc.start();
}

function stopAmbientHum() {
  if (humOsc) {
    humOsc.stop();
    humOsc.disconnect();
    humOsc = null;
  }
}

const directionInterval = 5000;
let lastDirectionTime = 0;
let lastAIDirectionTime = 0; // Track last AI direction change

const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));

let speedMultiplier = 1;
let lastSpeedIncrease = 0;
const speedIncreaseInterval = 3000; // ms
const speedStep = 0.1; // how much to increase each interval

function updatePlayer(time) {
  if (time - lastDirectionTime > directionInterval) {
    player.canChangeDir = true;
    player.glow = true;
  }

  if (player.canChangeDir) {
    let dx = 0;
    let dy = 0;

    if (keys["ArrowUp"]) dy -= 1;
    if (keys["ArrowDown"]) dy += 1;
    if (keys["ArrowLeft"]) dx -= 1;
    if (keys["ArrowRight"]) dx += 1;
    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    if (joystick.active) {
      dx = joystick.dx;
      dy = joystick.dy;
    }

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      const baseSpeed = (arenaRadius / 250) * 2; // scale with arena size
      player.vx = dx * baseSpeed * speedMultiplier;
      player.vy = dy * baseSpeed * speedMultiplier;

      lockDirectionChange(time);
    }
  }

  player.x += player.vx;
  player.y += player.vy;

  checkBounce(player);
}

function lockDirectionChange(time) {
  player.canChangeDir = false;
  player.glow = false;
  lastDirectionTime = time;
}

function updateAI(time) {
  ai.x += ai.vx;
  ai.y += ai.vy;

  ai.vx += (Math.random() - 0.5) * 0.05;
  ai.vy += (Math.random() - 0.5) * 0.05;

  // ai direction change every 5 seconds
  if (time - lastAIDirectionTime > directionInterval) {
    // random direction
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = 1.5 * speedMultiplier;
    ai.vx = Math.cos(angle) * baseSpeed;
    ai.vy = Math.sin(angle) * baseSpeed;
    lastAIDirectionTime = time;
  }

  // gradually increase AI speed
  const aiSpeed = Math.sqrt(ai.vx * ai.vx + ai.vy * ai.vy);
  const maxAISpeed = 2 * speedMultiplier;
  if (aiSpeed > maxAISpeed) {
    ai.vx *= maxAISpeed / aiSpeed;
    ai.vy *= maxAISpeed / aiSpeed;
  }

  checkBounce(ai);
}

function checkBounce(ball) {
  const dx = ball.x - center.x;
  const dy = ball.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist + ball.radius >= arenaRadius) {
    const nx = dx / dist;
    const ny = dy / dist;

    const impactX = center.x + nx * arenaRadius;
    const impactY = center.y + ny * arenaRadius;

    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;

    const overlap = dist + ball.radius - arenaRadius;
    ball.x -= nx * overlap;
    ball.y -= ny * overlap;

    const notes = [220, 247, 262, 294, 330, 349, 392];
    const note = notes[Math.floor(Math.random() * notes.length)];
    playNote(note);
    pulse = 1; // pulse

    // tie line that follows the ball
    ball.ties.push({
      x1: impactX,
      y1: impactY,
    });
    ball.tiesCount = ball.tiesCount + 1;

    particles.push({
      x: impactX,
      y: impactY,
      radius: 6,
      life: 1,
      color: ball.color,
    });

    // update tie counter display
    updateTieCounter(ball);
  }
}

function updateTieCounter(ball) {
  // Update combined scoreboard UI (numbers only)
  const p = document.getElementById("player-score").querySelector('b');
  const a = document.getElementById("ai-score").querySelector('b');
  if (p) p.textContent = player.tiesCount;
  if (a) a.textContent = ai.tiesCount;
}

// check if a ball intersects a line segment
function ballIntersectsLine(ball, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const distSq = (ball.x - closestX) ** 2 + (ball.y - closestY) ** 2;
  return distSq <= ball.radius * ball.radius;
}

// screen shake
let shakeIntensity = 0;
let shouldShake = false;

function shakeScreen() {
  if (shouldShake && shakeIntensity > 0.5) {
    const dx = (Math.random() - 0.5) * shakeIntensity;
    const dy = (Math.random() - 0.5) * shakeIntensity;
    ctx.setTransform(1, 0, 0, 1, dx, dy);
    shakeIntensity *= 0.9;
    if (shakeIntensity < 0.5) {
      shakeIntensity = 0;
      shouldShake = false;
    }
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

// remove ties cut
function checkTieCuts(ball, otherBall) {
  let tieCut = false;
  ball.ties = ball.ties.filter((tie) => {
    if (ballIntersectsLine(otherBall, tie.x1, tie.y1, ball.x, ball.y)) {
      tieCut = true;
      return false;
    }
    return true;
  });
  if (tieCut) {
    shakeIntensity = 10;
    shouldShake = true;
    playCutSound();
  }
}

let pulse = 0;
function drawBackground() {
  ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + pulse * 0.05})`;
  ctx.beginPath();
  ctx.arc(center.x, center.y, arenaRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fill();
  pulse *= 0.9;
}

function drawCircle() {
  ctx.beginPath();
  ctx.arc(center.x, center.y, arenaRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBall(ball) {
  ctx.save();
  if (ball.glow) {
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = ball.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.restore();
}

function drawTies(ball) {
  ctx.beginPath();
  for (const tie of ball.ties) {
    ctx.moveTo(tie.x1, tie.y1);
    ctx.lineTo(ball.x, ball.y); // follows ball
  }
  ctx.strokeStyle = ball.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    ctx.beginPath();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color || "white";
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    p.life *= 0.9;
    p.radius *= 0.95;
    if (p.life < 0.05) {
      particles.splice(i, 1);
    }
  }
}

const gameoverDiv = document.getElementById("gameover");
const gameoverText = document.getElementById("gameover-text");
const restartBtn = document.getElementById("restart-btn");
const startPopup = document.getElementById("start-popup");
const startBtn = document.getElementById("start-btn");

let gameEnded = false;
let gameStarted = false;

function checkWinLose() {
  // start checking if both have at least one tie
  if (player.tiesCount === 0 || ai.tiesCount === 0) return;

  if (!gameEnded) {
    if (player.ties.length > 0 && ai.ties.length === 0) {
      showGameover("You Win!");
      gameEnded = true;
    } else if (ai.ties.length > 0 && player.ties.length === 0) {
      showGameover("You Lose!");
      gameEnded = true;
    }
  }
}

function showGameover(text) {
  gameoverText.textContent = text;
  gameoverDiv.classList.remove("hidden");
  stopAmbientHum();
  if (text.includes("Win")) {
    playWinSound();
  } else {
    playLoseSound();
  }
}

function restartGame() {
  // reset positions
  player.x = center.x + 100;
  player.y = center.y;
  player.vx = 2;
  player.vy = 0;
  player.ties = [];
  player.tiesCount = 0;
  player.canChangeDir = false;
  player.glow = false;

  ai.x = center.x - 100;
  ai.y = center.y;
  ai.vx = 1.5;
  ai.vy = 1;
  ai.ties = [];
  ai.tiesCount = 0;

  lastDirectionTime = 0;
  lastAIDirectionTime = 0; // reset AI direction timer
  gameEnded = false;
  gameStarted = true;
  gameoverDiv.classList.add("hidden");

  // reset speed
  speedMultiplier = 1;
  lastSpeedIncrease = 0;

  // reset tie counters display
  updateTieCounter(player);
  updateTieCounter(ai);

  startAmbientHum();

  gameLoop(0);
}

restartBtn.addEventListener("click", restartGame);

startBtn.addEventListener("click", () => {
  startPopup.classList.add("hidden");
  gameStarted = true;
  startAmbientHum();
  gameLoop(0);
});

// joystick for mobile
let joystick = {active: false, startX: 0, startY: 0, dx: 0, dy: 0};
const joystickZone = document.createElement("div");
joystickZone.id = "joystick-zone";
document.body.appendChild(joystickZone);

joystickZone.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  joystick.active = true;
  joystick.startX = t.clientX;
  joystick.startY = t.clientY;
});

joystickZone.addEventListener("touchmove", (e) => {
  if (!joystick.active) return;
  const t = e.touches[0];
  joystick.dx = t.clientX - joystick.startX;
  joystick.dy = t.clientY - joystick.startY;
});

joystickZone.addEventListener("touchend", (e) => {
  joystick.active = false;
  joystick.dx = 0;
  joystick.dy = 0;
});




function gameLoop(time) {
  if (!gameStarted) return;
  if (gameEnded) return;

  shakeScreen();
 

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCircle();

  // gradually increase speed
  if (time - lastSpeedIncrease > speedIncreaseInterval) {
    speedMultiplier += speedStep;
    lastSpeedIncrease = time;
  }

  // update direction timer 
  if (player.canChangeDir)
  {
    document.getElementById("timer-fill").style.width = "100%";
    document.getElementById("timer-fill").style.background = "linear-gradient(90deg, #ff9900, #ffcc00)";
  } else {
    const timeSinceLastChange = time - lastDirectionTime;
    const progress = Math.min(timeSinceLastChange / directionInterval * 100, 100);
    document.getElementById("timer-fill").style.width = progress + "%";
    document.getElementById("timer-fill").style.background = "linear-gradient(90deg, #00ff99, #00cc77)";
  }


  updatePlayer(time);
  updateAI(time);

  checkTieCuts(player, ai); // ai cuts player's ties
  checkTieCuts(ai, player); // player cuts ai's ties

  drawBackground();
  drawTies(player);
  drawTies(ai);
  //drawParticles();
  drawBall(player);
  drawBall(ai);

  checkWinLose();

  if (!gameEnded) requestAnimationFrame(gameLoop);
}

gameLoop(0);

// portrait to landscape orientaion change
window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    resizeCanvas();
    scaleGameObjects();
  }, 300);
});