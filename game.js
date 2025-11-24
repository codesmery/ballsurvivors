const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Tam ekran yap
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// OYUN BAŞLANGIÇ DURUMU
let gameStarted = false;
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
startButton.addEventListener("click", () => {
  gameStarted = true;
  startScreen.style.display = "none";
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  gameLoop();
});

// PLAYER
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  speed: 3,
  vx: 0,
  vy: 0,
  health: 100,
  xp: 0,
  maxXp: 100,
  level: 1,
  damage: 5,
  score: 0
};

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// MOBİL DOKUNMATİK KONTROL
let touchX = null;
let touchY = null;

canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  touchX = touch.clientX;
  touchY = touch.clientY;
});

canvas.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  touchX = touch.clientX;
  touchY = touch.clientY;
});

canvas.addEventListener("touchend", () => {
  touchX = null;
  touchY = null;
});

// ENEMIES
const enemies = [];
const xpOrbs = [];
const bullets = [];
const effects = [];

const enemyTypes = {
  red: { color: "red", speed: 1.5, health: 20, xpValue: 20, score: 10 },
  green: { color: "green", speed: 2.5, health: 15, xpValue: 15, score: 8 },
  blue: { color: "blue", speed: 1, health: 40, xpValue: 40, score: 20 }
};

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * canvas.width; y = -20; }
  else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height + 20; }
  else if (side === 2) { x = -20; y = Math.random() * canvas.height; }
  else { x = canvas.width + 20; y = Math.random() * canvas.height; }

  const typeKeys = Object.keys(enemyTypes);
  const randomType = enemyTypes[typeKeys[Math.floor(Math.random() * typeKeys.length)]];
  
  enemies.push({
    x, y,
    size: 15,
    speed: randomType.speed,
    health: randomType.health,
    color: randomType.color,
    xpValue: randomType.xpValue,
    scoreValue: randomType.score
  });
}
setInterval(() => { if (gameStarted) spawnEnemy(); }, 1000);

// XP ORBS
function dropXp(x, y, value) {
  xpOrbs.push({ x, y, size: 8, value });
}

// EFFECTS
function createEffect(x, y, color) {
  effects.push({ x, y, size: 10, color, life: 20 });
}
function updateEffects() {
  effects.forEach((eff, index) => {
    eff.size += 0.5;
    eff.life -= 1;
    if (eff.life <= 0) effects.splice(index, 1);
  });
}
function drawEffects() {
  effects.forEach(eff => {
    ctx.strokeStyle = eff.color;
    ctx.beginPath();
    ctx.arc(eff.x, eff.y, eff.size, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// UPDATE ENEMIES
function updateEnemies() {
  enemies.forEach((enemy, eIndex) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;

    if (dist < player.size + enemy.size) player.health -= 0.5;

    bullets.forEach((bullet, bIndex) => {
      const bdx = enemy.x - bullet.x;
      const bdy = enemy.y - bullet.y;
      const bDist = Math.hypot(bdx, bdy);
      if (bDist < enemy.size + bullet.size) {
        enemy.health -= bullet.damage;
        bullets.splice(bIndex, 1);
      }
    });

    if (enemy.health <= 0) {
      createEffect(enemy.x, enemy.y, enemy.color);
      dropXp(enemy.x, enemy.y, enemy.xpValue);
      player.score += enemy.scoreValue;
      enemies.splice(eIndex, 1);
    }
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// UPDATE XP ORBS
function updateXpOrbs() {
  xpOrbs.forEach((orb, index) => {
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 80) { orb.x += dx * 0.05; orb.y += dy * 0.05; }
    if (dist < player.size + orb.size) {
      player.xp += orb.value;
      xpOrbs.splice(index, 1);
      if (player.xp >= player.maxXp) triggerLevelUp();
    }
  });
}

function drawXpOrbs() {
  ctx.fillStyle = "cyan";
  xpOrbs.forEach(orb => {
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// BULLETS (homing)
function shootBullet() {
  let target = null;
  let minDist = Infinity;
  enemies.forEach(enemy => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) { minDist = dist; target = enemy; }
  });

  let dirX = 0, dirY = -1;
  if (target) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    dirX = dx / dist;
    dirY = dy / dist;
  }

  bullets.push({ x: player.x, y: player.y, size: 5, speed: 6, damage: player.damage, dirX, dirY });
}
setInterval(() => { if (!levelUpActive && gameStarted) shootBullet(); }, 300);

function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dirX * bullet.speed;
    bullet.y += bullet.dirY * bullet.speed;
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) bullets.splice(index, 1);
  });
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(bullet => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// PLAYER
function updatePlayer() {
  player.vx = 0;
  player.vy = 0;

  // Klavye kontrolleri
  if (keys["w"] || keys["ArrowUp"]) player.vy = -player.speed;
  if (keys["s"] || keys["ArrowDown"]) player.vy = player.speed;
  if (keys["a"] || keys["ArrowLeft"]) player.vx = -player.speed;
  if (keys["d"] || keys["ArrowRight"]) player.vx = player.speed;

  // Dokunmatik kontroller
  if (touchX !== null && touchY !== null) {
    const dx = touchX - player.x;
    const dy = touchY - player.y;
    player.vx = Math.sign(dx) * player.speed;
    player.vy = Math.sign(dy) * player.speed;
  }

  player.x += player.vx;
  player.y += player.vy;

  // ekran sınırlarını aşma
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function drawPlayer() {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
}

// UI
function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Health: " + Math.floor(player.health), 10, 25);
  ctx.fillStyle = "cyan";
  ctx.fillRect(10, 40, (player.xp / player.maxXp) * 200, 15);
  ctx.strokeStyle = "white";
  ctx.strokeRect(10, 40, 200, 15);
  ctx.fillStyle = "yellow";
  ctx.fillText("Score: " + player.score, 10, 70);
}

// LEVEL-UP
let levelUpActive = false;
let levelUpOptions = [];

function triggerLevelUp() {
  levelUpActive = true;
  player.level++;
  player.xp = 0;
  levelUpOptions = [
    { text: "+20 Health", apply: () => player.health += 20 },
    { text: "+0.5 Speed", apply: () => player.speed += 0.5 },
    { text: "+2 Damage", apply: () => player.damage += 2 }
  ];
}

canvas.addEventListener("click", (e) => {
  if (levelUpActive) {
    const mx = e.offsetX;
    const my = e.offsetY;
    levelUpOptions.forEach((opt, index) => {
      const x = canvas.width/2 - 150, y = canvas.height/2 + index * 60, w = 300, h = 50;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        opt.apply();
        levelUpActive = false;
      }
    });
  }
});

function drawLevelUp() {
  if (!levelUpActive) return;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText("Level Up! Choose an upgrade:", canvas.width/2 - 200, canvas.height/2 - 50);
  levelUpOptions.forEach((opt, index) => {
    ctx.fillStyle = "gray";
    ctx.fillRect(canvas.width/2 - 150, canvas.height/2 + index * 60, 300, 50);
    ctx.fillStyle = "white";
    ctx.fillText(opt.text, canvas.width/2 - 120, canvas.height/2 + 35 + index * 60);
  });
}

// GAME LOOP
let gameOver = false;

function gameLoop() {
  if (!gameStarted) return;
  if (player.health <= 0) gameOver = true;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameOver) {
    if (!levelUpActive) {
      updatePlayer();
      updateEnemies();
      updateXpOrbs();
      updateBullets();
    }

    drawPlayer();
    drawEnemies();
    drawXpOrbs();
    drawBullets();
    updateEffects();
    drawEffects();
    drawUI();
    drawLevelUp();

    requestAnimationFrame(gameLoop);
  } else {
    ctx.fillStyle = "red";
    ctx.font = "50px Arial";
    ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2 - 30);
    ctx.fillStyle = "yellow";
    ctx.font = "30px Arial";
    ctx.fillText("Your Score: " + player.score, canvas.width/2 - 100, canvas.height/2 + 30);
  }
}
