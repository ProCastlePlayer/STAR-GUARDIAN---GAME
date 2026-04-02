const canvas = document.getElementById('starfield'), ctx = canvas.getContext('2d');
const btn = document.getElementById('master-btn');
let w, h, stars = [], gameActive = false, score = 0, playerHP = 100;
let keys = {}, shipPos = { x: 0, y: 0 }, sideShips = 0, fireDelay = 250;
let enemies = [], bullets = [], enemyBullets = [], powerups = [], boss = null, lastFire = 0;

// SISTEMA DE VIDAS E POWERUPS
let isInvincible = false;
let powerUpStack = []; 
let defenseUp = 0; 
let deaths = 0;

function init() {
    w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight;
    shipPos = { x: w/2, y: h - 120 };
    stars = Array.from({length: 150}, () => ({ x: Math.random()*w, y: Math.random()*h, s: Math.random()*2+1 }));
}

function resetGame() {
    score = 0; playerHP = 100; deaths = 0;
    sideShips = 0; fireDelay = 250; defenseUp = 0;
    enemies = []; bullets = []; enemyBullets = []; powerups = []; 
    powerUpStack = []; boss = null; isInvincible = false;
    shipPos = { x: w/2, y: h - 120 };
    const endScreen = document.querySelector('.end-screen');
    if(endScreen) endScreen.remove();
    updateScore(); updateHUD();
    gameActive = true;
    requestAnimationFrame(update);
}

function drawPlayerShip(x, y, size = 35) {
    ctx.save(); 
    if (isInvincible) ctx.globalAlpha = (Math.floor(Date.now() / 150) % 2 === 0) ? 0.2 : 0.8;
    ctx.translate(x, y);
    if(defenseUp > 0) {
        ctx.strokeStyle = "#0055ff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, size + 5, 0, Math.PI*2); ctx.stroke();
    }
    ctx.shadowBlur = 15; ctx.shadowColor = "#00f2ff";
    ctx.fillStyle = "#00f2ff";
    ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(-10, size/2); ctx.lineTo(10, size/2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-size, size/2); ctx.lineTo(-10, size/4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(size, size/2); ctx.lineTo(10, size/4); ctx.fill();
    ctx.fillStyle = "#ffaa00"; ctx.fillRect(-8, size/2, 5, 8); ctx.fillRect(3, size/2, 5, 8);
    ctx.restore();
}

function drawBossShip(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#1a1a1a"; ctx.strokeStyle = "#ff0055"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-100, -20); ctx.lineTo(100, -20); ctx.lineTo(120, 40); ctx.lineTo(-120, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#440022"; ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-140, -60); ctx.lineTo(-40, -20); ctx.fill();
    ctx.beginPath(); ctx.moveTo(60, -20); ctx.lineTo(140, -60); ctx.lineTo(40, -20); ctx.fill();
    ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? "#ff0055" : "#550022";
    ctx.beginPath(); ctx.arc(0, 10, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#333"; ctx.fillRect(-90, 30, 20, 30); ctx.fillRect(70, 30, 20, 30);
    ctx.restore();
}

function takeDamage(amount) {
    if (isInvincible) return;
    playerHP -= (defenseUp > 0 ? amount / 2 : amount);
    updateHUD();
    if (playerHP <= 0) respawnPlayer();
}

function respawnPlayer() {
    deaths++;
    if (deaths >= 5) { endGame(false); return; }
    playerHP = 100;
    defenseUp = 0; 
    if (powerUpStack.length > 0) {
        let lost = powerUpStack.pop();
        if (lost === 's') sideShips = Math.max(0, sideShips - 1);
        if (lost === 'f') fireDelay = Math.min(250, fireDelay + 40);
    }
    enemies = []; enemyBullets = []; isInvincible = true;
    setTimeout(() => { isInvincible = false; }, 3000);
    updateHUD();
}

function startLoop() {
    gameActive = true;
    document.getElementById('main-ui').style.display = 'none';
    document.getElementById('game-container').innerHTML = `
        <div class="hud-container">
            <div class="health-bar-bg"><div id="hp-fill" class="health-bar-fill"></div></div>
            <div id="lives-ui" style="font-size:10px;margin-top:5px;color:#00f2ff">VIDAS: <span id="lives-val">5</span></div>
        </div>
        <div id="score-ui">SCORE: <span id="val">0</span></div>
        <div class="controls-overlay">
            <div class="btn-ctrl" id="up" style="grid-area:up">▲</div><div class="btn-ctrl" id="left" style="grid-area:left">◀</div>
            <div class="btn-ctrl" id="down" style="grid-area:down">▼</div><div class="btn-ctrl" id="right" style="grid-area:right">▶</div>
            <div class="btn-ctrl btn-space" id="fire">SPACE</div>
        </div>`;
    
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    const setupBtn = (id, code) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.onmousedown = el.ontouchstart = () => keys[code] = true;
        el.onmouseup = el.ontouchend = () => keys[code] = false;
    };
    ['up','down','left','right'].forEach(id => setupBtn(id, 'Arrow'+id.charAt(0).toUpperCase()+id.slice(1)));
    setupBtn('fire', 'Space');
    requestAnimationFrame(update);
}

function update() {
    if(!gameActive) return;
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
    stars.forEach(s => { s.y += 6; if(s.y > h) s.y = 0; ctx.fillStyle = "#fff"; ctx.fillRect(s.x, s.y, s.s, s.s); });

    if(keys['ArrowUp'] && shipPos.y > 50) shipPos.y -= 7;
    if(keys['ArrowDown'] && shipPos.y < h - 50) shipPos.y += 7;
    if(keys['ArrowLeft'] && shipPos.x > 40) shipPos.x -= 7;
    if(keys['ArrowRight'] && shipPos.x < w - 40) shipPos.x += 7;

    drawPlayerShip(shipPos.x, shipPos.y);
    if(sideShips >= 1) drawPlayerShip(shipPos.x - 45, shipPos.y + 25, 20);
    if(sideShips >= 2) drawPlayerShip(shipPos.x + 45, shipPos.y + 25, 20);

    if(keys['Space'] && Date.now() - lastFire > fireDelay) {
        bullets.push({x: shipPos.x, y: shipPos.y - 30});
        if(sideShips >= 1) bullets.push({x: shipPos.x - 45, y: shipPos.y});
        if(sideShips >= 2) bullets.push({x: shipPos.x + 45, y: shipPos.y});
        lastFire = Date.now();
    }

    bullets.forEach((b, i) => {
        b.y -= 15; ctx.fillStyle = "#00f2ff"; ctx.fillRect(b.x-2, b.y, 4, 15);
        if(b.y < 0) bullets.splice(i, 1);
    });

    enemyBullets.forEach((eb, i) => {
        eb.y += eb.vy || 6;
        eb.x += eb.vx || 0;
        ctx.fillStyle = "#ff0000"; ctx.beginPath(); ctx.arc(eb.x, eb.y, 4, 0, Math.PI*2); ctx.fill();
        if(Math.hypot(eb.x - shipPos.x, eb.y - shipPos.y) < 25) { 
            takeDamage(10); enemyBullets.splice(i, 1); 
        }
        if(eb.y > h || eb.x < 0 || eb.x > w) enemyBullets.splice(i, 1);
    });

    if(score < 5000 && !boss && Math.random() < 0.025) enemies.push({x: Math.random()*(w-60)+30, y: -50, lastShot: 0, id: Date.now() + Math.random()});
    enemies.forEach((e, i) => {
        e.y += 3.5;
        ctx.save(); ctx.translate(e.x, e.y); ctx.fillStyle = "#ff4444"; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-15, -10); ctx.lineTo(-5, -5); ctx.lineTo(0, -15); ctx.lineTo(5, -5); ctx.lineTo(15, -10); ctx.fill(); ctx.restore();
        if(Date.now() - e.lastShot > 1500) { enemyBullets.push({x: e.x, y: e.y + 20, ownerId: e.id}); e.lastShot = Date.now(); }
        if(Math.hypot(e.x - shipPos.x, e.y - shipPos.y) < 40) { takeDamage(20); enemies.splice(i, 1); enemyBullets = enemyBullets.filter(eb => eb.ownerId !== e.id); }
        bullets.forEach((b, bi) => {
            if(Math.hypot(e.x - b.x, e.y - b.y) < 30) {
                if(Math.random() < 0.15) {
                    let r = Math.random();
                    powerups.push({x: e.x, y: e.y, t: r > 0.66 ? 's' : (r > 0.33 ? 'f' : 'd')});
                }
                score += 100; updateScore();
                enemyBullets = enemyBullets.filter(eb => eb.ownerId !== e.id);
                enemies.splice(i, 1); bullets.splice(bi, 1);
            }
        });
        if(e.y > h) enemies.splice(i, 1);
    });

    if(score >= 5000 && !boss) boss = { x: w/2, y: -150, hp: 250, mHp: 250, d: 1, lastShot: 0, id: 'BOSS' };
    if(boss) {
        boss.y = Math.min(boss.y + 1, 120); boss.x += boss.d * 3;
        if(boss.x > w - 150 || boss.x < 150) boss.d *= -1;
        drawBossShip(boss.x, boss.y);
        ctx.fillStyle = "#333"; ctx.fillRect(boss.x - 50, boss.y - 80, 100, 6);
        ctx.fillStyle = "#ff0055"; ctx.fillRect(boss.x - 50, boss.y - 80, (boss.hp/boss.mHp)*100, 6);
        if(Date.now() - boss.lastShot > 600) { 
            for(let j = -2; j <= 2; j++) {
                enemyBullets.push({ x: boss.x + (j * 20), y: boss.y + 40, vx: j * 2, vy: 6, ownerId: 'BOSS' });
            }
            boss.lastShot = Date.now(); 
        }
        bullets.forEach((b, bi) => {
            if(b.x > boss.x-100 && b.x < boss.x+100 && b.y < boss.y + 50 && b.y > boss.y - 50) {
                boss.hp -= 2; bullets.splice(bi, 1); 
                if(boss.hp <= 0) { enemyBullets = enemyBullets.filter(eb => eb.ownerId !== 'BOSS'); endGame(true); }
            }
        });
    }

    powerups.forEach((p, i) => {
        p.y += 2; ctx.fillStyle = p.t === 's' ? "#00ffaa" : (p.t === 'f' ? "#ffff00" : "#0055ff");
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px Arial"; ctx.fillText(p.t.toUpperCase(), p.x-4, p.y+4);
        if(Math.hypot(p.x - shipPos.x, p.y - shipPos.y) < 35) {
            if(p.t === 's') { sideShips = Math.min(2, sideShips + 1); powerUpStack.push('s'); } 
            else if(p.t === 'f') { fireDelay = Math.max(80, fireDelay - 40); powerUpStack.push('f'); }
            else { defenseUp++; }
            powerups.splice(i, 1);
        }
    });

    if(gameActive) requestAnimationFrame(update);
}

function updateScore() { document.getElementById('val').innerText = score; }
function updateHUD() { 
    const fill = document.getElementById('hp-fill'), lVal = document.getElementById('lives-val');
    if(fill) fill.style.width = Math.max(0, playerHP) + "%"; 
    if(lVal) lVal.innerText = (5 - deaths);
}

function endGame(win) {
    gameActive = false;
    const s = document.createElement('div'); s.className = 'end-screen';
    s.style.color = win ? "#00f2ff" : "#ff0055";
    s.innerHTML = `<h1>${win ? 'MISSÃO CUMPRIDA' : 'NAVE ABATIDA'}</h1><p>SCORE: ${score}</p><button onclick="resetGame()" style="background:none; border:2px solid currentColor; color:currentColor; padding:15px 30px; cursor:pointer; margin-top:30px; font-family:'Syncopate'">REINICIAR</button>`;
    document.body.appendChild(s);
}

init();
btn.onclick = () => { startLoop(); };
window.onresize = init;
