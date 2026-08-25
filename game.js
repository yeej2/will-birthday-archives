const portraits = {
  WILL: { default: 'assets/Will_default.png', shocked: 'assets/Will_shocked.png', thinking: 'assets/Will_thinking.png', thumbs_up: 'assets/Will_thumbs_up.png' },
  SISTER: { default: 'assets/Madi_default.png' },
  JOSHUA: { default: 'assets/Joshua_default.png' },
  WIFE: { default: 'assets/sarah_default.png' },
  // TODO: Replace with final Cameron portrait
  CAMERON: { default: 'assets/Cameron_default.png' }
};

const canvas = document.getElementById('minigame');
const ctx = canvas.getContext('2d');
const speakerEl = document.getElementById('speaker');
const textEl = document.getElementById('text');
const dialogEl = document.getElementById('dialog');
const portraitEl = document.getElementById('portrait');
const startEl = document.getElementById('start');
const cutsceneVideoEl = document.getElementById('cutsceneVideo');

let sceneIndex = 0;
let lineIndex = 0;
let isTyping = false;
let typeTimer = null;
let inMinigame = false;
let currentMinigame = null;
let raf = null;
let hubRoom = 'madi';
const memoryDone = {
  prologue: false, cardboard: false, blind_harvest: false, dinosaur: false, bicycle: false,
  intermission: false, light_war: false, polar_vortex: false, salt_tea: false, cardboard_knights: false,
  dirt_pile: false, trash_bags: false, snapchat: false, road_trip: false, bread_toss: false, pierogi: false,
  french_creek: false, weeniezucker: false, dig: false
};
let weenieEasterEggCount = 0;

function findSceneIndex(id) {
  return scenes.findIndex(s => s.id === id);
}

function showPortrait(speaker, emotion = 'default') {
  const key = speaker.toUpperCase();
  if (portraits[key]) {
    portraitEl.src = portraits[key][emotion] || portraits[key].default;
    portraitEl.style.display = 'block';
  } else {
    portraitEl.style.display = 'none';
  }
}

function setSpeakerClass(speaker) {
  dialogEl.className = speaker.toUpperCase();
}

function typeLine(speaker, text, onDone, emotion = 'default') {
  isTyping = true;
  speakerEl.textContent = speaker;
  textEl.innerHTML = '<span id="typed"></span><span id="cursor"></span>';
  setSpeakerClass(speaker);
  showPortrait(speaker, emotion);
  const typed = document.getElementById('typed');
  let i = 0;
  clearInterval(typeTimer);
  typeTimer = setInterval(() => {
    if (i < text.length) {
      typed.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(typeTimer);
      isTyping = false;
      if (onDone) onDone();
    }
  }, 20);
}

function finishTyping() {
  if (!isTyping) return;
  clearInterval(typeTimer);
  const line = scenes[sceneIndex].lines[lineIndex];
  textEl.innerHTML = line.text;
  isTyping = false;
  if (line.action) {
    setTimeout(() => runAction(line.action), 200);
  }
}

function advance() {
  if (inMinigame) return;
  if (isTyping) {
    finishTyping();
    return;
  }
  const currentScene = scenes[sceneIndex];
  lineIndex++;
  if (lineIndex >= currentScene.lines.length) {
    if (currentScene.onEnd) {
      currentScene.onEnd();
      return;
    }
    sceneIndex++;
    lineIndex = 0;
    if (sceneIndex >= scenes.length) {
      speakerEl.textContent = 'ARCHIVE';
      textEl.textContent = 'SESSION COMPLETE. HAPPY BIRTHDAY, WILL.';
      return;
    }
  }
  const line = scenes[sceneIndex].lines[lineIndex];
  typeLine(line.speaker, line.text, () => {
    if (line.action) runAction(line.action);
  }, line.emotion);
  // WeenieZucker easter egg: small chance after memory is complete, max 3 times
  if (memoryDone.weeniezucker && weenieEasterEggCount < 3 && Math.random() < 0.08) {
    weenieEasterEggCount++;
    setTimeout(() => {
      if (!inMinigame && !isTyping) {
        const orig = textEl.innerHTML;
        textEl.innerHTML = '<span style="color:#ff5555;font-size:14px;">...WeenieZucker.</span>';
        setTimeout(() => { if (!isTyping) textEl.innerHTML = orig; }, 1500);
      }
    }, 500);
  }
}

function setScene(idx, lidx = 0) {
  sceneIndex = idx;
  lineIndex = lidx;
  const line = scenes[sceneIndex].lines[lineIndex];
  typeLine(line.speaker, line.text, () => {
    if (line.action) runAction(line.action);
  }, line.emotion);
}

function runAction(action) {
  if (minigames[action]) minigames[action]();
}

function startMinigame(mg) {
  inMinigame = true;
  currentMinigame = mg;
  canvas.style.display = 'block';
  dialogEl.style.display = 'none';
  if (mg.init) mg.init();
  gameLoop();
}

function gameLoop() {
  if (!currentMinigame) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (currentMinigame.update) currentMinigame.update();
  if (currentMinigame.draw) currentMinigame.draw();
  raf = requestAnimationFrame(gameLoop);
}

function endMinigame(gotoId) {
  inMinigame = false;
  currentMinigame = null;
  cancelAnimationFrame(raf);
  canvas.style.display = 'none';
  dialogEl.style.display = 'block';
  if (typeof gotoId === 'string') {
    setScene(findSceneIndex(gotoId));
  } else {
    advance();
  }
}

function playCutsceneVideo(src, gotoId) {
  inMinigame = false;
  currentMinigame = null;
  cancelAnimationFrame(raf);
  canvas.style.display = 'none';
  dialogEl.style.display = 'none';

  const finish = () => {
    cutsceneVideoEl.removeEventListener('ended', finish);
    cutsceneVideoEl.removeEventListener('click', finish);
    cutsceneVideoEl.style.display = 'none';
    cutsceneVideoEl.pause();
    dialogEl.style.display = 'block';
    setScene(findSceneIndex(gotoId));
  };

  cutsceneVideoEl.src = src;
  cutsceneVideoEl.style.display = 'block';
  cutsceneVideoEl.currentTime = 0;
  cutsceneVideoEl.addEventListener('ended', finish);
  cutsceneVideoEl.addEventListener('click', finish);
  cutsceneVideoEl.play().catch(() => {
    // Autoplay blocked or format unsupported — click the video to continue.
  });
}

function drawText(ctx, text, x, y, color = '#e8f0e8', size = 18) {
  ctx.fillStyle = color;
  ctx.font = `${size}px 'Courier New', monospace`;
  ctx.fillText(text, x, y);
}

canvas.addEventListener('click', (e) => {
  if (!currentMinigame || !currentMinigame.onClick) return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * sx;
  const my = (e.clientY - rect.top) * sy;
  currentMinigame.onClick(mx, my);
});

canvas.addEventListener('mousemove', (e) => {
  if (!currentMinigame || !currentMinigame.onMouseMove) return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * sx;
  const my = (e.clientY - rect.top) * sy;
  currentMinigame.onMouseMove(mx, my);
});

document.addEventListener('keydown', (e) => {
  if (currentMinigame && currentMinigame.onKeyDown) {
    currentMinigame.onKeyDown(e);
    e.preventDefault();
  } else if (e.code === 'Space' || e.code === 'Enter') {
    advance();
  }
});

document.addEventListener('keyup', (e) => {
  if (currentMinigame && currentMinigame.onKeyUp) {
    currentMinigame.onKeyUp(e);
  }
});

dialogEl.addEventListener('click', advance);

document.getElementById('startBtn').addEventListener('click', () => {
  startEl.style.display = 'none';
  const line = scenes[0].lines[0];
  typeLine(line.speaker, line.text, () => {
    if (line.action) runAction(line.action);
  }, line.emotion);
});

const minigames = {
  dziadzi: () => {
    const food = [
      { x: 220, y: 360, color: '#8b5a2b', label: 'PIEROGI' },
      { x: 400, y: 360, color: '#cda86c', label: 'GOŁĄBKI' },
      { x: 580, y: 360, color: '#b85c38', label: 'KIEŁBASA' }
    ];
    const hairs = [];
    for (let i = 0; i < 10; i++) {
      const f = food[Math.floor(Math.random() * food.length)];
      hairs.push({
        x: f.x + (Math.random() - 0.5) * 80,
        y: f.y - 30 - Math.random() * 60,
        r: 8 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2 - 0.6,
        collected: false
      });
    }
    let count = 0;
    startMinigame({
      draw() {
        ctx.fillStyle = '#151515';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#222';
        ctx.fillRect(100, 340, 600, 80);
        for (const f of food) {
          ctx.fillStyle = '#444';
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, 70, 25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y - 8, 55, 22, 0, 0, Math.PI * 2);
          ctx.fill();
          drawText(ctx, f.label, f.x - 42, f.y + 55, '#d0d0d0', 14);
        }
        for (const h of hairs) {
          if (h.collected) continue;
          const g = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, h.r * 2);
          g.addColorStop(0, 'rgba(255,255,255,0.9)');
          g.addColorStop(0.6, 'rgba(200,220,230,0.3)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        drawText(ctx, `DZIADZI HAIR: ${count}/10`, 20, 35, '#00ffaa');
      },
      update() {
        for (const h of hairs) {
          if (h.collected) continue;
          h.x += h.vx; h.y += h.vy;
          if (h.x < 40 || h.x > canvas.width - 40) h.vx *= -1;
          if (h.y < 60 || h.y > canvas.height - 80) h.vy *= -1;
        }
      },
      onClick(mx, my) {
        for (const h of hairs) {
          if (h.collected) continue;
          const dx = mx - h.x, dy = my - h.y;
          if (Math.sqrt(dx * dx + dy * dy) < h.r + 20) {
            h.collected = true; count++;
            if (count >= 10) endMinigame();
            return;
          }
        }
      }
    });
  },



  cardboard: () => {
    const cols = 16, rows = 10, cell = 36;
    const offX = (canvas.width - cols * cell) / 2;
    const offY = 80;
    const room = { x: 12, y: 6, w: 3, h: 3 };
    let snake = [{ x: room.x + 1, y: room.y + 1 }];
    let dir = { x: 0, y: -1 };
    let nextDir = { x: 0, y: -1 };
    let items = { tp: 0, pt: 0, kb: 0 };
    const need = 3;
    let item = null;
    let state = 'collect';
    let lastMove = 0;
    let stepTime = 130;
    let message = 'Collect 3 toilet paper rolls, 3 paper towel rolls and 3 Kleenex boxes, then return to your room.';
    let won = false;

    function inRoom(x, y) {
      return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
    }

    function inSnake(x, y) {
      return snake.some(s => s.x === x && s.y === y);
    }

    function validForType(x, y, type) {
      if (inRoom(x, y) || inSnake(x, y)) return false;
      if (x < 5) return type === 'tp';
      if (x < 11) return type === 'pt';
      return type === 'kb';
    }

    function randomItem() {
      const needed = [];
      if (items.tp < need) needed.push('tp');
      if (items.pt < need) needed.push('pt');
      if (items.kb < need) needed.push('kb');
      if (needed.length === 0) return null;
      const type = needed[Math.floor(Math.random() * needed.length)];
      let x, y, tries = 0;
      do {
        x = Math.floor(Math.random() * cols);
        y = Math.floor(Math.random() * rows);
        tries++;
      } while (!validForType(x, y, type) && tries < 300);
      return { x, y, type };
    }

    function resetGame() {
      snake = [{ x: room.x + 1, y: room.y + 1 }];
      dir = { x: 0, y: -1 };
      nextDir = { x: 0, y: -1 };
      items = { tp: 0, pt: 0, kb: 0 };
      state = 'collect';
      item = randomItem();
      message = 'Try again.';
    }

    item = randomItem();

    startMinigame({
      draw() {
        ctx.fillStyle = '#0b0b0b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const wx = offX + x * cell, wy = offY + y * cell;
            let c;
            if (inRoom(x, y)) c = '#2a2a3a';
            else if (x < 5) c = '#5c4a35';
            else if (x < 11) c = '#6f5b42';
            else c = '#82694b';
            ctx.fillStyle = c;
            ctx.fillRect(wx, wy, cell - 2, cell - 2);
          }
        }

        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 3;
        ctx.strokeRect(offX + room.x * cell - 3, offY + room.y * cell - 3, room.w * cell + 3, room.h * cell + 3);

        drawText(ctx, 'TOILET PAPER DISTRICT', offX + 40, offY - 25, '#d0d0d0', 12);
        drawText(ctx, 'PAPER TOWEL CORRIDOR', offX + 245, offY - 25, '#d0d0d0', 12);
        drawText(ctx, 'KLEENEX CITADEL', offX + 485, offY - 25, '#d0d0d0', 12);

        for (let i = 0; i < snake.length; i++) {
          const s = snake[i];
          ctx.fillStyle = i === 0 ? '#5adaff' : '#3a8fb5';
          ctx.fillRect(offX + s.x * cell + 4, offY + s.y * cell + 4, cell - 8, cell - 8);
        }

        if (item) {
          const ix = offX + item.x * cell + cell / 2, iy = offY + item.y * cell + cell / 2;
          ctx.fillStyle = '#fff';
          if (item.type === 'tp') {
            ctx.beginPath(); ctx.arc(ix, iy, 12, 0, Math.PI * 2); ctx.fill();
          } else if (item.type === 'pt') {
            ctx.beginPath(); ctx.ellipse(ix, iy, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillRect(ix - 14, iy - 10, 28, 20);
          }
          drawText(ctx, item.type === 'tp' ? 'TP' : item.type === 'pt' ? 'PT' : 'KB', ix - 8, iy + 4, '#000', 10);
        }

        drawText(ctx, `TP: ${items.tp}/${need}   PT: ${items.pt}/${need}   KB: ${items.kb}/${need}`, 180, 30, '#00ffaa');
        drawText(ctx, message, 60, 445, '#e8f0e8', 16);
      },
      update() {
        if (won) return;
        const now = Date.now();
        if (now - lastMove < stepTime) return;
        lastMove = now;
        dir = nextDir;
        const head = snake[0];
        const nx = head.x + dir.x, ny = head.y + dir.y;

        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
          message = 'You hit the wall of the hoard. Try again.';
          resetGame();
          return;
        }

        if (state === 'return' && inRoom(nx, ny)) {
          won = true;
          message = 'You returned home with the hoard!';
          setTimeout(endMinigame, 500);
          return;
        }

        if (inSnake(nx, ny)) {
          message = 'You tripped over your own cardboard. Try again.';
          resetGame();
          return;
        }

        snake.unshift({ x: nx, y: ny });

        if (item && item.x === nx && item.y === ny) {
          items[item.type]++;
          if (items.tp >= need && items.pt >= need && items.kb >= need) {
            state = 'return';
            item = null;
            message = 'Hoard complete! Return to your room!';
          } else {
            item = randomItem();
            message = 'Cardboard acquired.';
          }
        } else {
          snake.pop();
        }
      },
      onKeyDown(e) {
        if (won) return;
        if (e.code === 'ArrowUp' && dir.y === 0) nextDir = { x: 0, y: -1 };
        if (e.code === 'ArrowDown' && dir.y === 0) nextDir = { x: 0, y: 1 };
        if (e.code === 'ArrowLeft' && dir.x === 0) nextDir = { x: -1, y: 0 };
        if (e.code === 'ArrowRight' && dir.x === 0) nextDir = { x: 1, y: 0 };
      }
    });
  },

  blind_harvest: () => {
    const W = canvas.width, H = canvas.height;
    let phase = 'preview';
    let phaseTimer = 0;
    let round = 1;
    let will = { x: W / 2, y: H - 90, speed: 2.4 };
    const sister = { x: W / 2 + 130, y: 90 };
    let frisbee = { x: 0, y: 0 };
    let obstacles = [];
    let listenCue = null;
    let listenCooldown = 0;
    let bonk = null;
    let harvestMsg = null;
    let particles = [];
    const keys = {};
    let shake = 0;
    let round3Timer = 0;
    let creatureStep = 0;
    let creatureTimer = 0;
    let dialogueLine = null;
    let ended = false;

    const OBST_RADIUS = 28;
    const HARVEST_RADIUS = 46;
    const grassDots = [];
    for (let i = 0; i < 90; i++) grassDots.push({ x: Math.random() * W, y: Math.random() * H, a: 0.03 + Math.random() * 0.05 });

    const ALL_SPOTS = [
      { x: 110, y: 120, label: 'TREE' },
      { x: 690, y: 130, label: 'BUSH' },
      { x: 150, y: 340, label: 'PATIO CHAIR' },
      { x: 650, y: 340, label: 'GARBAGE CAN' },
      { x: 400, y: 90, label: 'FENCE' }
    ];

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function newRound(r) {
      round = r;
      will.x = W / 2; will.y = H - 90;
      obstacles = ALL_SPOTS.slice(0, r === 1 ? 3 : 5);
      const minDist = r === 1 ? 130 : 230;
      let fx, fy;
      do {
        fx = 70 + Math.random() * (W - 140);
        fy = 70 + Math.random() * (H - 180);
      } while (dist({ x: fx, y: fy }, will) < minDist);
      frisbee = { x: fx, y: fy };
      round3Timer = 0;
      listenCue = null; harvestMsg = null; bonk = null;
      phase = 'preview';
      phaseTimer = 0;
    }
    newRound(1);

    const creatureScript = [
      { at: 500, text: '...rustle...' },
      { at: 3200, text: '...RUSTLE...' },
      { at: 5600, text: 'THUMP.' },
      { at: 7400, text: '*heavy breathing*' },
      { at: 9600, text: 'RRRRRRRRRRRRRRRRRR', shake: true },
      { at: 11800, speaker: 'WILL', text: '...Madi?' },
      { at: 13600, speaker: 'SISTER', text: "That's not me." },
      { at: 15800, text: 'ROOOOOOOOOOAR', shake: true, big: true },
      { at: 18000, end: true }
    ];

    function startCreatureSequence() {
      phase = 'creature';
      creatureStep = 0;
      creatureTimer = 0;
    }

    function updateCreature() {
      creatureTimer += 16;
      if (shake > 0) shake -= 16;
      while (creatureStep < creatureScript.length && creatureTimer >= creatureScript[creatureStep].at) {
        const step = creatureScript[creatureStep];
        if (step.text) dialogueLine = step;
        if (step.shake) shake = step.big ? 900 : 500;
        if (step.end && !ended) {
          ended = true;
          setTimeout(endMinigame, 900);
        }
        creatureStep++;
      }
    }

    function doListen() {
      if (listenCooldown > 0) return;
      listenCooldown = round === 1 ? 1500 : 1900;
      const d = dist(will, frisbee);
      let text;
      if (d > 320) text = '...fwup...';
      else if (d > 200) text = 'rustle...';
      else if (d > 100) text = 'SCRRRCH...';
      else text = '*fabric rustling*';
      const angle = Math.atan2(frisbee.y - will.y, frisbee.x - will.x);
      listenCue = { text, dx: Math.cos(angle) * 60, dy: Math.sin(angle) * 60, timer: 900, total: 900 };
    }

    function doFakeSound() {
      const angle = Math.random() * Math.PI * 2;
      listenCue = { text: '*giggle*', dx: Math.cos(angle) * 60, dy: Math.sin(angle) * 60, timer: 900, total: 900, fake: true };
    }

    function spawnParticles() {
      for (let i = 0; i < 30; i++) {
        particles.push({ x: will.x, y: will.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2, life: 40, color: Math.random() < 0.5 ? '#aaff7a' : '#ffdd55' });
      }
    }

    function doHarvest() {
      const d = dist(will, frisbee);
      if (d < HARVEST_RADIUS) {
        harvestMsg = { text: round === 2 ? 'THE HARVEST IS BOUNTIFUL.' : 'HARVEST SUCCESSFUL', timer: 1400, good: true };
        spawnParticles();
        if (round < 3) {
          phase = 'transition';
          setTimeout(() => newRound(round + 1), 1400);
        }
      } else {
        const misses = ['YOU HAVE HARVESTED: GRASS', 'YOU HAVE HARVESTED: A STICK', 'YOU HAVE HARVESTED: NOTHING', 'THE HARVEST IS BARREN', 'THIS IS NOT FRISBEE'];
        harvestMsg = { text: misses[Math.floor(Math.random() * misses.length)], timer: 1100, good: false };
      }
    }

    function drawObstacleIcon(o) {
      if (o.label === 'TREE') {
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(o.x - 6, o.y - 10, 12, 30);
        ctx.fillStyle = '#2f6b2f'; ctx.beginPath(); ctx.arc(o.x, o.y - 20, 26, 0, Math.PI * 2); ctx.fill();
      } else if (o.label === 'BUSH') {
        ctx.fillStyle = '#3a7a3a'; ctx.beginPath(); ctx.arc(o.x, o.y, 24, 0, Math.PI * 2); ctx.fill();
      } else if (o.label === 'PATIO CHAIR') {
        ctx.fillStyle = '#888'; ctx.fillRect(o.x - 16, o.y - 16, 32, 32);
      } else if (o.label === 'GARBAGE CAN') {
        ctx.fillStyle = '#556'; ctx.fillRect(o.x - 14, o.y - 20, 28, 40);
      } else if (o.label === 'FENCE') {
        ctx.fillStyle = '#7a5c3a'; ctx.fillRect(o.x - 30, o.y - 10, 60, 20);
      }
      drawText(ctx, o.label, o.x - 30, o.y + 42, '#cfcfcf', 10);
    }

    function drawBackyard() {
      ctx.fillStyle = '#2e5a2e';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#7a5c3a';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, W - 20, H - 20);
      obstacles.forEach(drawObstacleIcon);
      ctx.fillStyle = '#5adaff';
      ctx.fillRect(will.x - 14, will.y - 14, 28, 28);
      drawText(ctx, 'WILL', will.x - 16, will.y - 20, '#5adaff', 12);
      ctx.fillStyle = '#ff7ad6';
      ctx.fillRect(sister.x - 14, sister.y - 14, 28, 28);
      drawText(ctx, 'SISTER', sister.x - 22, sister.y - 20, '#ff7ad6', 12);
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath(); ctx.ellipse(frisbee.x, frisbee.y, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      drawText(ctx, 'FRISBEE', frisbee.x - 28, frisbee.y - 18, '#ffdd55', 11);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8f0e8';
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillText(`ROUND ${round}`, W / 2, 36);
      ctx.restore();
    }

    startMinigame({
      draw() {
        const shakeX = shake > 0 ? (Math.random() - 0.5) * 10 : 0;
        const shakeY = shake > 0 ? (Math.random() - 0.5) * 10 : 0;
        ctx.save();
        ctx.translate(shakeX, shakeY);

        if (phase === 'preview' || phase === 'closeeyes') {
          drawBackyard();
          if (phase === 'closeeyes') {
            ctx.fillStyle = `rgba(0,0,0,${Math.min(1, phaseTimer / 900)})`;
            ctx.fillRect(-20, -20, W + 40, H + 40);
            if (phaseTimer < 900) {
              ctx.save();
              ctx.textAlign = 'center';
              ctx.fillStyle = '#e8f0e8';
              ctx.font = "bold 26px 'Courier New', monospace";
              ctx.fillText('CLOSE YOUR EYES.', W / 2, H / 2);
              ctx.restore();
            }
          }
        } else {
          ctx.fillStyle = '#020202';
          ctx.fillRect(-20, -20, W + 40, H + 40);
          for (const g of grassDots) {
            ctx.fillStyle = `rgba(60,110,60,${g.a})`;
            ctx.fillRect(g.x, g.y, 2, 2);
          }

          const grad = ctx.createRadialGradient(will.x, will.y, 5, will.x, will.y, 70);
          grad.addColorStop(0, 'rgba(255,255,255,0.18)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(will.x, will.y, 70, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = 'rgba(120,170,255,0.9)';
          ctx.beginPath(); ctx.arc(will.x, will.y, 8, 0, Math.PI * 2); ctx.fill();

          if (bonk) {
            const o = obstacles.find(ob => ob.label === bonk.label);
            if (o) {
              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.fillRect(o.x - 30, o.y - 30, 60, 60);
            }
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff5555';
            ctx.font = "bold 24px 'Courier New', monospace";
            ctx.fillText('BONK.', W / 2, 90);
            ctx.font = "18px 'Courier New', monospace";
            ctx.fillStyle = '#e8f0e8';
            ctx.fillText(bonk.label, W / 2, 120);
            ctx.restore();
          }

          if (listenCue) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.globalAlpha = Math.max(0, Math.min(1, listenCue.timer / 300));
            ctx.fillStyle = listenCue.fake ? '#ff7ad6' : '#aaff7a';
            ctx.font = "18px 'Courier New', monospace";
            ctx.fillText(listenCue.text, will.x + listenCue.dx, will.y + listenCue.dy);
            ctx.restore();
          }

          if (harvestMsg) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = harvestMsg.good ? '#00ffaa' : '#ffaa55';
            ctx.font = "bold 22px 'Courier New', monospace";
            ctx.fillText(harvestMsg.text, W / 2, 60);
            ctx.restore();
          }

          for (const p of particles) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
          }

          if (phase === 'creature' && dialogueLine) {
            ctx.save();
            ctx.textAlign = 'center';
            if (dialogueLine.speaker) {
              ctx.fillStyle = dialogueLine.speaker === 'WILL' ? '#5adaff' : '#ff7ad6';
              ctx.font = "bold 20px 'Courier New', monospace";
              ctx.fillText(`${dialogueLine.speaker}: "${dialogueLine.text}"`, W / 2, 90);
            } else {
              ctx.fillStyle = dialogueLine.big ? '#ff5555' : '#ff8888';
              ctx.font = dialogueLine.big ? "bold 34px 'Courier New', monospace" : "bold 22px 'Courier New', monospace";
              ctx.fillText(dialogueLine.text, W / 2, 90);
            }
            ctx.restore();
            if (dialogueLine.big) {
              // TODO: Replace with final dinosaur silhouette sprite
              ctx.fillStyle = '#000';
              ctx.beginPath(); ctx.ellipse(W / 2, H / 2 + 40, 220, 140, 0, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#ff2222';
              ctx.beginPath(); ctx.arc(W / 2 - 40, H / 2 + 10, 8, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(W / 2 + 40, H / 2 + 10, 8, 0, Math.PI * 2); ctx.fill();
            }
          }
        }

        ctx.fillStyle = '#889988';
        ctx.font = "14px 'Courier New', monospace";
        ctx.fillText(`BLIND HARVEST — ROUND ${round}`, 20, 24);
        if (phase === 'play') ctx.fillText('WASD/Arrows move · SPACE listen · E harvest', 20, H - 16);

        ctx.restore();
      },
      update() {
        if (phase === 'preview') {
          phaseTimer += 16;
          if (phaseTimer > 2000) { phase = 'closeeyes'; phaseTimer = 0; }
          return;
        }
        if (phase === 'closeeyes') {
          phaseTimer += 16;
          if (phaseTimer > 1400) { phase = 'play'; phaseTimer = 0; }
          return;
        }
        if (phase === 'transition' || phase === 'end') return;
        if (phase === 'creature') { updateCreature(); return; }

        if (listenCooldown > 0) listenCooldown -= 16;
        if (listenCue) { listenCue.timer -= 16; if (listenCue.timer <= 0) listenCue = null; }
        if (harvestMsg) { harvestMsg.timer -= 16; if (harvestMsg.timer <= 0) harvestMsg = null; }
        if (bonk) { bonk.timer -= 16; if (bonk.timer <= 0) bonk = null; }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
          if (p.life <= 0) particles.splice(i, 1);
        }

        {
          let nx = will.x, ny = will.y;
          if (keys['ArrowLeft'] || keys['KeyA']) nx -= will.speed;
          if (keys['ArrowRight'] || keys['KeyD']) nx += will.speed;
          if (keys['ArrowUp'] || keys['KeyW']) ny -= will.speed;
          if (keys['ArrowDown'] || keys['KeyS']) ny += will.speed;
          nx = Math.max(20, Math.min(W - 20, nx));
          ny = Math.max(20, Math.min(H - 20, ny));

          let collided = null;
          for (const o of obstacles) {
            const dx = nx - o.x, dy = ny - o.y;
            const d = Math.hypot(dx, dy);
            if (d < OBST_RADIUS) {
              collided = o;
              if (d > 0.001) {
                nx = o.x + (dx / d) * OBST_RADIUS;
                ny = o.y + (dy / d) * OBST_RADIUS;
              } else {
                nx = o.x + OBST_RADIUS;
                ny = o.y;
              }
            }
          }
          will.x = nx; will.y = ny;
          if (collided && !bonk) {
            bonk = { label: collided.label, timer: 450 };
          }
        }

        if (round === 2 && Math.random() < 0.003 && !listenCue) doFakeSound();

        if (round === 3) {
          round3Timer += 16;
          if (round3Timer > 5000) startCreatureSequence();
        }
      },
      onKeyDown(e) {
        keys[e.code] = true;
        if (phase !== 'play') return;
        if (e.code === 'Space') doListen();
        if (e.code === 'KeyE') doHarvest();
      },
      onKeyUp(e) { keys[e.code] = false; }
    });
  },

  dinosaur: () => {
    const bg = new Image();
    bg.src = 'assets/buffalo_museum.jpg';
    let willX = 60;
    const startX = 60;
    const exitX = 720;
    const floorY = 380;
    const willY = floorY - 50;
    let state = 'green';
    let stateTime = 0;
    let nextToggle = 1500 + Math.random() * 1500;
    let won = false;
    let caught = false;
    let message = 'Reach the exit. Move only on GREEN LIGHT. Freeze on RED LIGHT.';
    const keys = {};
    let caughtAt = 0;
    startMinigame({
      draw() {
        if (bg.complete && bg.naturalWidth) {
          ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = '#0b0b0b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(0, floorY, canvas.width, 4);

        ctx.fillStyle = '#00aa00';
        ctx.fillRect(exitX, floorY - 60, 20, 60);
        drawText(ctx, 'EXIT', exitX - 8, floorY - 70, '#00ffaa', 16);

        const lightColor = state === 'green' ? '#00ff00' : '#ff0000';
        const lightText = state === 'green' ? 'GREEN LIGHT' : 'RED LIGHT';
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(260, 25, 280, 45);
        ctx.fillStyle = lightColor;
        drawText(ctx, lightText, 280, 56, lightColor, 28);

        ctx.fillStyle = state === 'green' ? '#333' : '#ff0000';
        ctx.beginPath();
        ctx.arc(110, 90, 16, 0, Math.PI * 2);
        ctx.fill();
        drawText(ctx, 'DINO EYE', 60, 120, '#d0d0d0', 12);

        ctx.fillStyle = '#5adaff';
        ctx.fillRect(willX - 15, willY, 30, 50);
        ctx.fillStyle = '#000';
        ctx.fillRect(willX - 10, willY + 10, 6, 6);
        ctx.fillRect(willX + 4, willY + 10, 6, 6);

        if (caught) {
          drawText(ctx, 'IT SAW YOU MOVE!', 270, 180, '#ff0000', 28);
        }
        if (won) {
          drawText(ctx, 'You survived the hallway.', 270, 230, '#00ffaa', 24);
        }
        drawText(ctx, message, 60, 470, '#e8f0e8', 16);
      },
      update() {
        if (won) return;
        const now = Date.now();
        if (!caught && now - stateTime > nextToggle) {
          state = state === 'green' ? 'red' : 'green';
          stateTime = now;
          nextToggle = 1500 + Math.random() * 2500;
        }
        if (!caught && state === 'red' && keys['ArrowRight']) {
          caught = true;
          caughtAt = now;
          message = 'The dinosaur saw you move. Resetting...';
          setTimeout(() => {
            willX = startX;
            caught = false;
            keys['ArrowRight'] = false;
            state = 'green';
            stateTime = Date.now();
            nextToggle = 1500 + Math.random() * 1500;
            message = 'Reach the exit. Move only on GREEN LIGHT. Freeze on RED LIGHT.';
          }, 1200);
        }
        if (!caught && willX >= exitX - 10) {
          won = true;
          setTimeout(endMinigame, 800);
        }
      },
      onKeyDown(e) {
        if (won || caught) return;
        if (e.code === 'ArrowRight') {
          keys['ArrowRight'] = true;
          if (state === 'green') willX += 5;
        }
      },
      onKeyUp(e) {
        if (e.code === 'ArrowRight') keys['ArrowRight'] = false;
      }
    });
  },

  bicycle: () => {
    let t = 0;
    let carScale = 0.1;
    let message = 'SPACE=Bell  SHIFT=Pedal faster  E=Wave  CTRL=Look behind';
    let crashed = false;
    let plate = null;
    const crashX = canvas.width / 2;
    const crashY = 250;

    startMinigame({
      draw() {
        ctx.fillStyle = '#0b0b0b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawText(ctx, 'THE BICYCLE INCIDENT', 280, 60, '#5adaff', 24);
        drawText(ctx, 'OBJECTIVE: STOP THE BICYCLE', 260, 100, '#00ffaa');
        drawText(ctx, message, 60, 160, '#e8f0e8', 16);

        ctx.fillStyle = '#777';
        const w = 200 * carScale;
        const h = 120 * carScale;
        ctx.fillRect(crashX - w / 2, crashY - h / 2, w, h);
        if (!crashed) drawText(ctx, 'PARKED CAR', crashX - 60, crashY + h / 2 + 20, '#777');

        const plateW = 40 * carScale, plateH = 18 * carScale;
        if (!plate) {
          ctx.fillStyle = '#e8e8c0';
          ctx.fillRect(crashX - plateW / 2, crashY + h / 2 - plateH - 4, plateW, plateH);
          ctx.strokeStyle = '#333';
          ctx.strokeRect(crashX - plateW / 2, crashY + h / 2 - plateH - 4, plateW, plateH);
        } else {
          ctx.save();
          ctx.translate(plate.x, plate.y);
          ctx.rotate(plate.rot);
          ctx.fillStyle = '#e8e8c0';
          ctx.fillRect(-20, -9, 40, 18);
          ctx.strokeStyle = '#333';
          ctx.strokeRect(-20, -9, 40, 18);
          ctx.restore();
        }
      },
      update() {
        if (crashed) {
          if (plate) {
            plate.x += plate.vx;
            plate.y += plate.vy;
            plate.vy += 0.4;
            plate.rot += plate.vrot;
          }
          return;
        }
        t++;
        carScale += 0.0018;
        if (carScale >= 1.2) {
          crashed = true;
          message = 'CRASH!';
          const h = 120 * carScale;
          plate = { x: crashX, y: crashY + h / 2 - 13, vx: 3 + Math.random() * 2, vy: -9, rot: 0, vrot: 0.25 };
          setTimeout(() => { message = 'One license plate frame lost. Forever.'; }, 500);
          setTimeout(endMinigame, 2200);
        }
      },
      onKeyDown(e) {
        if (crashed) return;
        if (e.code === 'Space') message = 'DING DING! Still moving.';
        else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          carScale += 0.025;
          message = 'That is worse!';
        }
        else if (e.code === 'KeyE') message = 'You wave politely.';
        else if (e.code === 'ControlLeft' || e.code === 'ControlRight') message = 'Nothing behind you but fate.';
        else message = 'Nothing stops it.';
      }
    });
  },

  light_war: () => {
    const floorY = 340;
    const leftSwitch = 120;
    const rightSwitch = 680;
    let will = { x: 120, y: floorY - 50, speed: 7, radius: 20 };
    let joshua = { x: 680, y: floorY - 50, speed: 3.0, radius: 20, target: leftSwitch };
    let light = 'ON';
    let offTime = 0;
    let won = false;
    let msg = 'Arrows to run. SPACE toggles a switch if you are next to one (only turns OFF), otherwise drops an obstacle. Keep the light OFF for 5s!';
    const keys = {};
    const obstacles = [];
    let joshuaStun = 0;
    let joshuaReachCooldown = 0;
    let lastToggle = 0;
    let obstacleCooldown = 0;

    function nearSwitch(x, s) { return Math.abs(x - s) < 45; }
    function nearAnySwitch(x) { return nearSwitch(x, leftSwitch) || nearSwitch(x, rightSwitch); }

    function toggle(who) {
      const now = Date.now();
      if (now - lastToggle < 450) return false;
      if (who === 'will' && light === 'ON') { light = 'OFF'; lastToggle = now; return true; }
      if (who === 'joshua' && light === 'OFF') { light = 'ON'; lastToggle = now; return true; }
      return false;
    }

    function placeObstacle() {
      if (obstacleCooldown > 0) return;
      const x = will.x;
      if (obstacles.some(o => Math.abs(o.x - x) < 30)) return;
      if (obstacles.length >= 5) obstacles.shift();
      obstacles.push({ x: x, w: 44, h: 36, y: floorY - 36 });
      obstacleCooldown = 350;
      msg = 'Obstacle dropped!';
    }

    function tryAction() {
      if (nearAnySwitch(will.x) && light === 'ON') {
        if (toggle('will')) msg = 'You flipped the light OFF!';
      } else {
        placeObstacle();
      }
    }

    startMinigame({
      draw() {
        ctx.fillStyle = light === 'ON' ? '#3a3a2a' : '#0b0b0b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#5c4a3a';
        ctx.fillRect(0, floorY, canvas.width, 160);

        [leftSwitch, rightSwitch].forEach(s => {
          ctx.fillStyle = joshua.target === s ? '#ff5555' : '#555';
          ctx.fillRect(s - 10, floorY - 55, 20, 55);
          ctx.fillStyle = '#00ffaa';
          ctx.fillRect(s - 10, floorY - 55, 20, 10);
          drawText(ctx, 'SWITCH', s - 28, floorY - 70, '#00ffaa', 12);
        });

        for (const o of obstacles) {
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(o.x - o.w / 2, o.y, o.w, o.h);
          ctx.strokeStyle = '#a07040';
          ctx.strokeRect(o.x - o.w / 2, o.y, o.w, o.h);
        }

        ctx.fillStyle = '#5adaff';
        ctx.fillRect(will.x - will.radius, will.y, will.radius * 2, will.radius * 2);
        drawText(ctx, 'WILL', will.x - 22, will.y - 10, '#5adaff', 12);

        ctx.fillStyle = joshuaStun > 0 ? '#ff5555' : '#ffaa55';
        ctx.fillRect(joshua.x - joshua.radius, joshua.y, joshua.radius * 2, joshua.radius * 2);
        drawText(ctx, 'JOSHUA', joshua.x - 28, joshua.y - 10, '#ffaa55', 12);

        const lightColor = light === 'ON' ? '#ffff00' : '#00ffaa';
        const bulbX = 400, bulbY = 70;
        ctx.fillStyle = light === 'ON' ? 'rgba(255,255,150,0.25)' : 'rgba(0,255,170,0.08)';
        ctx.beginPath(); ctx.arc(bulbX, bulbY, 45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = lightColor;
        ctx.beginPath(); ctx.arc(bulbX, bulbY, 22, 0, Math.PI * 2); ctx.fill();
        drawText(ctx, `LIGHT: ${light}`, bulbX - 70, 120, lightColor, 22);

        if (!won) drawText(ctx, `Light OFF for 5s: ${(offTime / 1000).toFixed(1)}s`, 250, 150, '#00ffaa');
        drawText(ctx, `Obstacles: ${obstacles.length}/5`, 60, 30, '#e8f0e8', 14);
        drawText(ctx, msg, 60, 470, '#e8f0e8', 16);
      },
      update() {
        if (won) return;
        const now = Date.now();
        if (obstacleCooldown > 0) obstacleCooldown -= 16;
        if (joshuaReachCooldown > 0) joshuaReachCooldown -= 16;

        if (keys['ArrowLeft']) will.x -= will.speed;
        if (keys['ArrowRight']) will.x += will.speed;
        will.x = Math.max(40, Math.min(canvas.width - 40, will.x));

        let jSpeed = joshuaStun > 0 ? 0 : joshua.speed;
        if (joshuaStun > 0) {
          joshuaStun -= 16;
          if (joshuaStun < 0) joshuaStun = 0;
        }

        const dir = joshua.target > joshua.x ? 1 : -1;
        if (Math.abs(joshua.x - joshua.target) > 5) {
          joshua.x += jSpeed * dir;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const o = obstacles[i];
          if (Math.abs(joshua.x - o.x) < o.w / 2 + joshua.radius) {
            joshuaStun = 1500;
            obstacles.splice(i, 1);
            msg = 'Joshua hit an obstacle!';
          }
        }

        if (joshuaReachCooldown <= 0 && nearSwitch(joshua.x, joshua.target) && Math.abs(joshua.x - joshua.target) < 15) {
          joshuaReachCooldown = 600;
          joshua.target = joshua.target === leftSwitch ? rightSwitch : leftSwitch;
          if (toggle('joshua')) {
            offTime = 0;
            msg = 'Joshua flipped the light ON!';
          } else {
            msg = 'Joshua pressed the switch and ran to the other side.';
          }
        }

        if (light === 'OFF') {
          offTime += 16;
        } else {
          offTime = 0;
        }

        if (offTime >= 5000) {
          won = true;
          msg = 'NOBODY WON. But technically Will did.';
          setTimeout(endMinigame, 1000);
        }
      },
      onKeyDown(e) {
        if (won) return;
        keys[e.code] = true;
        if (e.code === 'Space' && !keys['SpaceAlready']) {
          tryAction();
          keys['SpaceAlready'] = true;
        }
      },
      onKeyUp(e) {
        keys[e.code] = false;
        if (e.code === 'Space') keys['SpaceAlready'] = false;
      }
    });
  },

  polar_vortex: () => {
    const goalX = 720;
    const startX = 80;
    let willX = startX;
    let hair = 0;
    let hypo = 0;
    const hairRate = 0.45;
    const hypoRate = 0.14;
    const step = 14;
    let won = false;
    let failed = false;
    let msg = 'Tap SPACE to run. Reach the FINISH when HAIR is STRUCTURAL, before HYPOTHERMIA hits 100%.';
    let snow = [];
    for (let i = 0; i < 80; i++) snow.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: 1 + Math.random() * 2 });
    let spaceReady = true;

    function hairLabel() {
      if (hair < 20) return 'WET';
      if (hair < 40) return 'VERY COLD';
      if (hair < 60) return 'FREEZING';
      if (hair < 80) return 'CRUNCHY';
      return 'STRUCTURAL';
    }

    startMinigame({
      draw() {
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        for (const s of snow) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#0a2030';
        ctx.fillRect(0, 360, canvas.width, 90);

        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.moveTo(goalX, 360); ctx.lineTo(goalX, 450); ctx.stroke();
        ctx.setLineDash([]);
        drawText(ctx, 'FINISH', goalX - 30, 350, '#00ffaa', 14);

        ctx.fillStyle = '#5adaff';
        ctx.fillRect(willX - 15, 310, 30, 50);
        ctx.fillStyle = '#000';
        ctx.fillRect(willX - 8, 320, 5, 5);
        ctx.fillRect(willX + 3, 320, 5, 5);
        if (hair >= 80) {
          ctx.fillStyle = 'rgba(220,240,255,0.9)';
          ctx.beginPath(); ctx.arc(willX, 310, 20, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#333'; ctx.fillRect(50, 60, 300, 24);
        ctx.fillStyle = hair >= 80 ? '#00ffaa' : '#5adaff';
        ctx.fillRect(50, 60, 3 * hair, 24);
        drawText(ctx, `HAIR: ${hairLabel()}`, 55, 78, hair >= 80 ? '#000' : '#fff', 14);

        ctx.fillStyle = '#333'; ctx.fillRect(450, 60, 300, 24);
        ctx.fillStyle = '#ff5555';
        ctx.fillRect(450, 60, 3 * hypo, 24);
        drawText(ctx, 'HYPOTHERMIA', 455, 78, '#fff', 14);

        drawText(ctx, 'THE POLAR VORTEX', 290, 30, '#5adaff', 26);
        drawText(ctx, msg, 60, 440, '#e8f0e8', 16);
      },
      update() {
        if (won || failed) return;
        for (const s of snow) { s.y += s.s; if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; } }
        hair = Math.min(100, hair + hairRate);
        hypo = Math.min(100, hypo + hypoRate);

        if (hypo >= 100) {
          failed = true;
          msg = 'Hypothermia got you first. Resetting...';
          setTimeout(() => { willX = startX; hair = 0; hypo = 0; failed = false; won = false; spaceReady = true; msg = 'Try again — tap SPACE to run.'; }, 1500);
        }

        if (willX >= goalX) {
          if (hair >= 80) {
            won = true;
            msg = 'Dude. Your hair is structural.';
            setTimeout(endMinigame, 1200);
          } else {
            failed = true;
            msg = 'Too fast — your hair is not frozen yet. Resetting...';
            setTimeout(() => { willX = startX; hair = 0; hypo = 0; failed = false; won = false; spaceReady = true; msg = 'Try again — tap SPACE to run.'; }, 1500);
          }
        }
      },
      onKeyDown(e) {
        if (won || failed) return;
        if (e.code === 'Space' && spaceReady) {
          willX += step;
          spaceReady = false;
        }
      },
      onKeyUp(e) {
        if (e.code === 'Space') spaceReady = true;
      }
    });
  },

  salt_tea: () => {
    const cupX = [250, 550];
    const cupY = 260;
    const cupR = 55;
    let safe = Math.random() < 0.5 ? 0 : 1;
    let phase = 'choose_first';
    let tasted = [];
    let msg = 'Pick a cup. One has salt, one does not.';
    let locked = false;
    let won = false;

    function drawCups() {
      ctx.fillStyle = '#a0c0c0';
      ctx.beginPath(); ctx.arc(cupX[0], cupY, cupR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupX[1], cupY, cupR, 0, Math.PI * 2); ctx.fill();
      drawText(ctx, 'CUP 1', cupX[0] - 32, cupY + cupR + 30, '#e8f0e8');
      drawText(ctx, 'CUP 2', cupX[1] - 32, cupY + cupR + 30, '#e8f0e8');
      for (const i of tasted) {
        ctx.strokeStyle = '#ff5555';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cupX[i] - 20, cupY - 20);
        ctx.lineTo(cupX[i] + 20, cupY + 20);
        ctx.moveTo(cupX[i] + 20, cupY - 20);
        ctx.lineTo(cupX[i] - 20, cupY + 20);
        ctx.stroke();
        drawText(ctx, 'SALT', cupX[i] - 24, cupY + 5, '#ff0000', 16);
      }
    }

    function cupHit(mx, my) {
      for (let i = 0; i < 2; i++) {
        const dx = mx - cupX[i], dy = my - cupY;
        if (Math.sqrt(dx * dx + dy * dy) < cupR) return i;
      }
      return -1;
    }

    startMinigame({
      draw() {
        ctx.fillStyle = '#0b0b0b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawText(ctx, 'THE SALT TEA TRIALS', 290, 80, '#ffaa55', 26);
        drawText(ctx, msg, 120, 140, '#e8f0e8', 18);

        if (phase === 'apple') {
          const boxX = 100, boxY = 210, boxW = 600, boxH = 70;
          ctx.fillStyle = '#a86b32';
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeStyle = '#ffaa55';
          ctx.lineWidth = 3;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.font = "16px 'Courier New', monospace";
          ctx.fillText('Both of these taste like apple juice', boxX + boxW / 2, boxY + boxH / 2 + 6);
          ctx.restore();
        } else {
          drawCups();
        }
      },
      update() {},
      onClick(mx, my) {
        if (locked || won) return;

        if (phase === 'choose_first') {
          const pick = cupHit(mx, my);
          if (pick < 0) return;
          locked = true;
          if (pick === safe) {
            msg = 'HA! Safe tea.';
            won = true;
            setTimeout(endMinigame, 1000);
          } else {
            msg = 'SALT.';
            phase = 'salt_both';
            setTimeout(() => { locked = false; msg = 'Pick again.'; }, 1200);
          }
        } else if (phase === 'salt_both') {
          const pick = cupHit(mx, my);
          if (pick < 0 || tasted.includes(pick)) return;
          locked = true;
          tasted.push(pick);
          if (tasted.length < 2) {
            msg = 'SALT. Try the other one.';
            setTimeout(() => { locked = false; }, 500);
          } else {
            msg = 'SALT. Again?!';
            setTimeout(() => { phase = 'apple'; locked = false; msg = 'A new option appears.'; }, 1200);
          }
        } else if (phase === 'apple') {
          if (mx > 100 && mx < 700 && my > 210 && my < 280) {
            locked = true;
            msg = 'Both of these taste like apple juice.';
            won = true;
            setTimeout(endMinigame, 1200);
          }
        }
      }
    });
  },

  cardboard_knights: () => {
    const W = canvas.width, H = canvas.height;
    const TOTAL = 2600;
    const BASE_SPEED = 1.0;
    const MOVE_MIN = 60, MOVE_MAX = 380;
    const encounters = [
      { x: 420, id: 'cerberus', name: 'CERBERUS' },
      { x: 900, id: 'hydra', name: 'THE HYDRA OF THE EASTERN LAWN' },
      { x: 1400, id: 'wind', name: 'THE BREATH OF THE NORTH' },
      { x: 1900, id: 'goblins', name: 'THE GOBLIN HORDE' },
      { x: 2350, id: 'chariot', name: 'THE TIDAL CHARIOT' }
    ];

    let progress = 0;
    const keys = {};
    let shieldUp = false;
    let swingAnim = 0;
    let facing = 1;
    let swingCooldown = 0;
    const SWING_DAMAGE_MIN = 14, SWING_DAMAGE_MAX = 24, SWING_COOLDOWN_MS = 380;

    function freshKit() { return { helmet: 100, armor: 100, sword: 100, shield: 100, wetness: 0 }; }
    const will = freshKit();
    const josh = freshKit();
    will.screenX = 220;
    josh.screenX = 150;

    function integrityLabel(v) {
      if (v <= 0) return 'DESTROYED';
      if (v <= 25) return 'COMPROMISED';
      if (v <= 50) return 'DAMAGED';
      if (v <= 75) return 'SCUFFED';
      return 'PRISTINE';
    }
    function wetLabel(w) {
      if (w <= 0) return null;
      if (w < 20) return 'DAMP';
      if (w < 45) return 'QUESTIONABLE';
      if (w < 75) return 'MOIST';
      return 'STRUCTURALLY UNSOUND';
    }
    function pieceLabel(kit, piece) { return wetLabel(kit.wetness) || integrityLabel(kit[piece]); }
    function damage(kit, piece, amt) { kit[piece] = Math.max(0, kit[piece] - amt); }
    function soak(kit, amt) {
      kit.wetness = Math.min(100, kit.wetness + amt);
      damage(kit, 'helmet', amt * 0.25);
      damage(kit, 'armor', amt * 0.3);
      damage(kit, 'sword', amt * 0.2);
      damage(kit, 'shield', amt * 0.4);
    }
    function avgIntegrity() {
      const pieces = ['helmet', 'armor', 'sword', 'shield'];
      let total = 0;
      pieces.forEach(p => { total += will[p] + josh[p]; });
      return total / (pieces.length * 2);
    }
    function rankFor(v) {
      if (v >= 95) return 'LEGENDARY KNIGHTS';
      if (v >= 75) return 'NOBLE KNIGHTS';
      if (v >= 50) return 'WEATHERED WARRIORS';
      if (v >= 25) return 'CARDBOARD SURVIVORS';
      if (v >= 1) return 'STRUCTURALLY QUESTIONABLE';
      return 'TWO GUYS IN WET T-SHIRTS';
    }

    let banner = null;
    let cutaway = null;
    let dialogue = null;
    let cutawaysShown = 0;
    let activeEncounter = null;
    let nextEncounterIdx = 0;
    let helmetFly = null;
    let ending = null;
    let ended = false;
    let shake = 0;

    function showBanner(text, sub, dur = 2800) { banner = { text, sub: sub || '', timer: dur }; }
    function showDialogue(speaker, text, dur = 3000) { dialogue = { speaker, text, timer: dur }; }
    function showCutaway(text, dur = 3200) { cutaway = { text, timer: dur }; cutawaysShown++; }

    function resolveEncounter(delay = 1400) {
      const id = activeEncounter.id;
      setTimeout(() => { if (activeEncounter && activeEncounter.id === id) activeEncounter = null; }, delay);
    }

    function drawEncounterHP(enc) {
      if (enc.hp == null) return;
      const barW = 320, barX = W / 2 - barW / 2, barY = 100;
      ctx.fillStyle = '#111';
      ctx.fillRect(barX, barY, barW, 16);
      ctx.fillStyle = enc.hp > 40 ? '#ff5555' : '#ff2222';
      ctx.fillRect(barX, barY, barW * Math.max(0, enc.hp) / 100, 16);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(barX, barY, barW, 16);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillText(enc.name, W / 2, barY - 6);
      ctx.restore();
    }

    // Universal combat: SPACE always chips away at the current encounter's health bar.
    function applySwingDamage(enc) {
      if (swingCooldown > 0 || enc.hp == null || enc.hp <= 0) return;
      swingCooldown = SWING_COOLDOWN_MS;
      enc.hp = Math.max(0, enc.hp - (SWING_DAMAGE_MIN + Math.random() * (SWING_DAMAGE_MAX - SWING_DAMAGE_MIN)));
      damage(will, 'sword', 2);
    }

    function updateCerberus(enc) {
      enc.t += 16;
      if (enc.stage === 'intro') {
        if (enc.t === 16) showBanner('CERBERUS APPROACHES', 'A friendly neighborhood dog charges over. Fight it off or raise your shield.', 2600);
        if (enc.t > 2600) { enc.stage = 'qte'; enc.t = 0; enc.hp = 100; }
      } else if (enc.stage === 'qte') {
        if (keys.__space) {
          keys.__space = false;
          if (!enc.done) {
            enc.warnings = (enc.warnings || 0) + 1;
            if (enc.warnings <= 2) showDialogue('JOSHUA', "DUDE. THAT'S A DOG.", 2200);
          }
        }
        if ((keys.__shift || enc.hp <= 0) && !enc.done) {
          enc.done = true;
          showBanner('THE BEAST HAS BEEN REPELLED.', 'The dog jumps against the shield, then runs off happy.', 2600);
          showCutaway('Reality: just a very happy golden retriever.');
          resolveEncounter(2600);
        } else if (!enc.done && enc.t > 8000) {
          enc.done = true;
          showBanner('The dog loses interest and wanders off.', '', 2400);
          resolveEncounter(2400);
        }
      }
    }

    function updateHydra(enc) {
      enc.t += 16;
      if (enc.stage === 'intro') {
        if (enc.t === 16) showBanner('THE HYDRA OF THE EASTERN LAWN', 'Sprinklers sweep across the path. Attack it, dodge sideways, or raise your shield.', 3000);
        if (enc.t > 3000) { enc.stage = 'waves'; enc.t = 0; enc.wave = 0; enc.waveArmed = false; enc.hp = 100; }
      } else if (enc.stage === 'waves') {
        if (enc.hp <= 0 && !enc.done) {
          enc.done = true;
          showBanner('THE HYDRA IS VANQUISHED.', 'The last sprinkler sputters out.', 2400);
          resolveEncounter(2400);
          return;
        }
        if (!enc.waveArmed && enc.t > enc.wave * 3600) {
          enc.waveArmed = true;
          enc.waveT = 0;
          enc.waveResolved = false;
          enc.hazardX = MOVE_MIN + Math.random() * (MOVE_MAX - MOVE_MIN);
          showBanner('STREAM INCOMING', '', 1600);
        }
        if (enc.waveArmed) {
          enc.waveT += 16;
          if (enc.waveT > 2400 && !enc.waveResolved) {
            enc.waveResolved = true;
            const dodged = Math.abs(will.screenX - enc.hazardX) > 70;
            if (keys.__shiftHold) {
              showDialogue('WILL', 'Shield holds!', 1700);
            } else if (dodged) {
              showDialogue('WILL', 'Dodged it!', 1700);
            } else {
              soak(will, 16);
              showBanner(`SHIELD: ${pieceLabel(will, 'shield')}`, '', 1700);
            }
            if (Math.random() < 0.4) soak(josh, 10);
            if (enc.wave === 1 && cutawaysShown < 3) showCutaway('Reality: it is just a rotating lawn sprinkler.');
            enc.wave++;
            enc.waveArmed = false;
          }
        }
        if (enc.wave >= 4 && !enc.waveArmed && !enc.done) {
          enc.done = true;
          resolveEncounter(1200);
        }
      }
    }

    function updateWind(enc) {
      enc.t += 16;
      if (enc.stage === 'intro') {
        if (enc.t === 16) showBanner('THE BREATH OF THE NORTH', 'A massive magical windstorm rises. Hold DOWN to brace, or swing through it.', 2800);
        if (enc.t > 2800) { enc.stage = 'gust'; enc.t = 0; enc.hp = 100; }
      } else if (enc.stage === 'gust') {
        if (enc.hp <= 0 && !enc.done) {
          enc.done = true;
          showBanner('THE WIND DIES DOWN.', 'You cut straight through the gale.', 2400);
          resolveEncounter(2400);
          return;
        }
        if (keys.__down) {
          // bracing — cardboard stays attached
        } else {
          damage(will, 'helmet', 0.3);
          if (!enc.warned && will.helmet < 55) {
            enc.warned = true;
            showDialogue('JOSHUA', 'YOUR HELMET!', 2000);
          }
          if (will.helmet <= 0 && !enc.helmetLost) {
            enc.helmetLost = true;
            helmetFly = { x: W / 2, y: 150, vx: 4, vy: -6, rot: 0 };
            showDialogue('JOSHUA', 'MY CROWN!', 2400);
          }
        }
        if (enc.t > 2000 && cutawaysShown < 3 && !enc.cutawayShown) {
          enc.cutawayShown = true;
          showCutaway('Reality: it is just a strong gust and a stray grocery bag.');
        }
        if (enc.t > 7600 && !enc.done) {
          enc.done = true;
          resolveEncounter(1400);
        }
      }
    }

    function updateGoblins(enc) {
      enc.t += 16;
      if (enc.stage === 'intro') {
        if (enc.t === 16) showBanner('THE GOBLIN HORDE', 'Several small figures approach in the dark.', 2600);
        if (enc.t > 2600) { enc.stage = 'qte'; enc.t = 0; enc.warnings = 0; enc.hp = 100; }
      } else if (enc.stage === 'qte') {
        if (keys.__space) {
          keys.__space = false;
          enc.warnings++;
          if (enc.warnings <= 2) showDialogue('JOSHUA', enc.warnings === 1 ? 'WILL.' : "WILL. THEY'RE CHILDREN.", 2200);
        }
        if ((keys.__shift || enc.hp <= 0) && !enc.done) {
          enc.done = true;
          showBanner('+10 MORALE', 'The villagers honor the knights.', 2600);
          showCutaway('Reality: a group of trick-or-treaters admiring the costumes.');
          resolveEncounter(2600);
        } else if (!enc.done && enc.t > 8000) {
          enc.done = true;
          showBanner('The children wander off, unimpressed.', '', 2200);
          resolveEncounter(2200);
        }
      }
    }

    function updateChariot(enc) {
      enc.t += 16;
      if (enc.stage === 'intro') {
        if (enc.t === 16) showBanner('SOMETHING APPROACHES...', '', 1800);
        if (enc.t > 1800) { enc.stage = 'reveal'; enc.t = 0; }
      } else if (enc.stage === 'reveal') {
        if (enc.t === 16) {
          enc.hazardX = (MOVE_MIN + MOVE_MAX) / 2;
          enc.hp = 100;
          showBanner('THE TIDAL CHARIOT', 'An enormous armored chariot, surrounded by water. Attack it, dodge, or raise your shield!', 3400);
        }
        if (enc.hp <= 0 && !enc.resolved) {
          enc.resolved = true;
          showBanner('THE CHARIOT SHATTERS.', 'Cardboard splinters everywhere, but the water never reaches you.', 2600);
          resolveEncounter(2600);
          return;
        }
        if (enc.t > 3400) { enc.stage = 'block'; enc.t = 0; }
      } else if (enc.stage === 'block') {
        if (enc.hp <= 0 && !enc.resolved) {
          enc.resolved = true;
          showBanner('THE CHARIOT SHATTERS.', 'Cardboard splinters everywhere, but the water never reaches you.', 2600);
          resolveEncounter(2600);
          return;
        }
        if (enc.t > 3200 && !enc.resolved) {
          enc.resolved = true;
          const dodged = Math.abs(will.screenX - enc.hazardX) > 90;
          if (keys.__shiftHold) {
            showBanner('PERFECT BLOCK', '', 2400);
            showDialogue('JOSHUA', '...holy crap.', 2400);
            setTimeout(() => showDialogue('WILL', 'The shield holds.', 2400), 1600);
          } else if (dodged) {
            showBanner('NICE DODGE', 'Barely.', 2200);
          } else {
            soak(will, 30); soak(josh, 30);
            showBanner('SPLAAAAAASH', 'Water flies across the screen.', 2400);
          }
          resolveEncounter(3600);
        }
      }
    }

    function updateActiveEncounter() {
      const enc = activeEncounter;
      if (keys.__space) applySwingDamage(enc);
      if (enc.id === 'cerberus') updateCerberus(enc);
      else if (enc.id === 'hydra') updateHydra(enc);
      else if (enc.id === 'wind') updateWind(enc);
      else if (enc.id === 'goblins') updateGoblins(enc);
      else if (enc.id === 'chariot') updateChariot(enc);
    }

    function drawFantasy() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#241033');
      grad.addColorStop(1, '#3a1f4d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2d1a3f';
      ctx.fillRect(0, H - 90, W, 90);
      drawText(ctx, 'fantasy', 20, 26, '#c9a0ff', 12);
    }
    function drawReality() {
      ctx.fillStyle = '#3a4a2a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#556b3a';
      ctx.fillRect(0, H - 90, W, 90);
      drawText(ctx, 'reality', 20, 26, '#8fae6a', 12);
    }

    function drawKnight(x, y, kit, label, color) {
      // TODO: Replace with final cardboard knight sprite
      ctx.fillStyle = pieceLabel(kit, 'armor') === 'DESTROYED' ? '#555' : color;
      ctx.fillRect(x - 16, y - 20, 32, 40);
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(x - 14, y - 34, 28, 16);
      if (shieldUp && label === 'WILL') {
        // Shield always faces the direction Will is currently facing.
        const shieldX = facing >= 0 ? x + 20 : x - 32;
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(shieldX, y - 24, 12, 40);
        ctx.strokeStyle = '#c9a24a';
        ctx.strokeRect(shieldX, y - 24, 12, 40);
      }
      drawText(ctx, label, x - 16, y - 40, color, 11);
    }

    function drawEncounterVisual(enc) {
      const cy = H - 190;
      if (enc.id === 'cerberus') {
        // TODO: Replace with final dog / Cerberus sprite
        ctx.fillStyle = '#c9a24a';
        ctx.beginPath(); ctx.arc(MOVE_MAX + 60, cy, 30, 0, Math.PI * 2); ctx.fill();
        drawText(ctx, 'DOG', MOVE_MAX + 46, cy + 45, '#c9a24a', 12);
      } else if (enc.id === 'hydra') {
        // TODO: Replace with final sprinkler/hydra sprite
        if (enc.hazardX != null) {
          ctx.strokeStyle = enc.waveResolved ? '#335' : '#5adaff';
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(enc.hazardX, cy + 60); ctx.lineTo(enc.hazardX + 12, cy - 60); ctx.stroke();
          ctx.lineWidth = 1;
          drawText(ctx, 'INCOMING STREAM', enc.hazardX - 50, cy - 70, '#5adaff', 12);
        }
      } else if (enc.id === 'wind') {
        // TODO: Replace with final wind gust effect
        ctx.strokeStyle = 'rgba(207,216,255,0.6)';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath(); ctx.moveTo(0, 60 + i * 20); ctx.lineTo(W, 40 + i * 20); ctx.stroke();
        }
      } else if (enc.id === 'goblins') {
        // TODO: Replace with final trick-or-treater sprites
        ctx.fillStyle = '#ffaa55';
        for (let i = -1; i <= 1; i++) ctx.fillRect(MOVE_MAX + 40 + i * 30 - 10, cy, 20, 30);
        drawText(ctx, 'TRICK-OR-TREATERS', MOVE_MAX - 10, cy + 50, '#ffaa55', 12);
      } else if (enc.id === 'chariot') {
        // TODO: Replace with final car/puddle sprite
        if (enc.hazardX != null) {
          ctx.fillStyle = '#888';
          ctx.fillRect(enc.hazardX - 50, cy, 100, 40);
          ctx.fillStyle = '#3a6ea8';
          ctx.fillRect(enc.hazardX - 70, cy + 40, 140, 14);
          drawText(ctx, 'CAR + PUDDLE', enc.hazardX - 52, cy + 70, '#8fbfe0', 12);
        }
      }
    }

    function startEnding() {
      ending = { stage: 'arrive', t: 0 };
      showBanner('THE PORCH', '', 1800);
    }

    function updateEnding() {
      ending.t += 16;
      if (ending.stage === 'arrive' && ending.t > 2000) {
        ending.stage = 'quiet'; ending.t = 0;
        dialogue = null;
        showBanner('They duck under the awning. Everything goes quiet.', '', 2400);
      }
      if (ending.stage === 'quiet' && ending.t > 2800) {
        ending.stage = 'knock'; ending.t = 0;
        showBanner('The door opens.', '', 1800);
      }
      if (ending.stage === 'knock' && ending.t > 2000) {
        ending.stage = 'npc'; ending.t = 0;
        showDialogue('NEIGHBOR', 'Oh wow. Cool costumes.', 2800);
      }
      if (ending.stage === 'npc' && ending.t > 3000) {
        ending.stage = 'complete'; ending.t = 0;
        const avg = avgIntegrity();
        showBanner('QUEST COMPLETE', `CARDBOARD INTEGRITY: IRRELEVANT — ${rankFor(avg)}`, 3200);
      }
      if (ending.stage === 'complete' && ending.t > 3400 && !ended) {
        ended = true;
        setTimeout(endMinigame, 200);
      }
    }

    // TODO: Replace with final Halloween house sprite
    function drawHouse() {
      ctx.fillStyle = '#443322';
      ctx.fillRect(W - 160, H - 220, 130, 150);
      ctx.fillStyle = '#ffcc55';
      ctx.fillRect(W - 140, H - 180, 20, 20);
      drawText(ctx, 'HALLOWEEN HOUSE', W - 175, H - 232, '#ffcc55', 11);
    }

    startMinigame({
      draw() {
        const shakeX = shake > 0 ? (Math.random() - 0.5) * 8 : 0;
        ctx.save();
        ctx.translate(shakeX, 0);

        if (cutaway) drawReality(); else drawFantasy();

        if (progress > TOTAL - 400 || ending) drawHouse();

        ctx.fillStyle = '#111';
        ctx.fillRect(0, H - 26, W, 26);
        ctx.fillStyle = '#00ffaa';
        ctx.fillRect(0, H - 26, W * Math.min(1, progress / TOTAL), 6);
        drawText(ctx, `${Math.min(100, Math.floor(progress / TOTAL * 100))}% TO THE PARTY`, 10, H - 8, '#e8f0e8', 12);

        drawText(ctx, 'THE CARDBOARD KNIGHTS', 250, 30, '#ffaa55', 22);

        if (!ending) {
          if (activeEncounter) { drawEncounterVisual(activeEncounter); drawEncounterHP(activeEncounter); }
          drawKnight(josh.screenX, H - 130, josh, 'JOSHUA', '#ffaa55');
          drawKnight(will.screenX, H - 140, will, 'WILL', '#5adaff');
          if (swingAnim > 0) {
            ctx.save();
            ctx.strokeStyle = '#e8f0e8';
            ctx.lineWidth = 3;
            ctx.globalAlpha = swingAnim / 260;
            const swingX = will.screenX + 22 * facing;
            const startAngle = facing >= 0 ? -0.9 : Math.PI - 0.9;
            const endAngle = facing >= 0 ? 0.9 : Math.PI + 0.9;
            ctx.beginPath();
            ctx.arc(swingX, H - 150, 26, startAngle, endAngle);
            ctx.stroke();
            ctx.restore();
          }
        }

        if (helmetFly) {
          ctx.save();
          ctx.translate(helmetFly.x, helmetFly.y);
          ctx.rotate(helmetFly.rot);
          ctx.fillStyle = '#c9a24a';
          ctx.fillRect(-14, -8, 28, 16);
          ctx.restore();
        }

        ctx.font = "12px 'Courier New', monospace";
        ctx.fillStyle = '#e8f0e8';
        ['helmet', 'armor', 'sword', 'shield'].forEach((p, i) => {
          ctx.fillText(`W ${p.toUpperCase()}: ${pieceLabel(will, p)}`, 20, 60 + i * 18);
          ctx.fillText(`J ${p.toUpperCase()}: ${pieceLabel(josh, p)}`, W - 220, 60 + i * 18);
        });

        if (banner) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.font = "bold 22px 'Courier New', monospace";
          ctx.fillText(banner.text, W / 2, 150);
          if (banner.sub) {
            ctx.font = "14px 'Courier New', monospace";
            ctx.fillStyle = '#cfcfcf';
            ctx.fillText(banner.sub, W / 2, 178);
          }
          ctx.restore();
        }

        if (dialogue) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = dialogue.speaker === 'WILL' ? '#5adaff' : (dialogue.speaker === 'JOSHUA' ? '#ffaa55' : '#e8f0e8');
          ctx.font = "bold 16px 'Courier New', monospace";
          ctx.fillText(`${dialogue.speaker}: "${dialogue.text}"`, W / 2, 210);
          ctx.restore();
        }

        if (cutaway) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = '#e8f0e8';
          ctx.font = "16px 'Courier New', monospace";
          ctx.fillText(cutaway.text, W / 2, H / 2);
          ctx.restore();
        }

        if (ending) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(-20, -20, W + 40, H + 40);
        }

        if (!ending) drawText(ctx, 'LEFT/RIGHT move · SPACE sword · SHIFT shield · DOWN brace', 130, H - 40, '#889988', 12);

        ctx.restore();
      },
      update() {
        if (ended) return;

        if (banner) { banner.timer -= 16; if (banner.timer <= 0) banner = null; }
        if (dialogue) { dialogue.timer -= 16; if (dialogue.timer <= 0) dialogue = null; }
        if (cutaway) { cutaway.timer -= 16; if (cutaway.timer <= 0) cutaway = null; }
        if (shake > 0) shake -= 16;
        if (swingAnim > 0) swingAnim -= 16;
        if (swingCooldown > 0) swingCooldown -= 16;

        if (helmetFly) {
          helmetFly.x += helmetFly.vx; helmetFly.y += helmetFly.vy; helmetFly.vy += 0.3; helmetFly.rot += 0.2;
          if (helmetFly.y > H + 40) helmetFly = null;
        }

        // free lateral movement — this is the player's real-time agency
        if (keys.ArrowLeft) { will.screenX -= 4.5; facing = -1; }
        if (keys.ArrowRight) { will.screenX += 4.5; facing = 1; }
        will.screenX = Math.max(MOVE_MIN, Math.min(MOVE_MAX, will.screenX));
        josh.screenX += ((will.screenX - 70) - josh.screenX) * 0.06;

        if (ending) { updateEnding(); return; }

        shieldUp = !!keys.__shiftHold;

        if (activeEncounter) { updateActiveEncounter(); return; }

        progress += BASE_SPEED;

        if (progress >= TOTAL) {
          progress = TOTAL;
          startEnding();
          return;
        }

        if (nextEncounterIdx < encounters.length && progress >= encounters[nextEncounterIdx].x) {
          const enc = encounters[nextEncounterIdx];
          activeEncounter = { id: enc.id, name: enc.name, stage: 'intro', t: 0 };
          nextEncounterIdx++;
        }
      },
      onKeyDown(e) {
        keys[e.code] = true;
        if (e.code === 'Space') { keys.__space = true; swingAnim = 260; }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { keys.__shift = true; keys.__shiftHold = true; }
        if (e.code === 'ArrowDown') keys.__down = true;
      },
      onKeyUp(e) {
        keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.__shiftHold = false;
        if (e.code === 'ArrowDown') keys.__down = false;
      }
    });
  },

  glitch_cutscene: () => {
    let t = 0;
    let ended = false;
    const crawlLines = ['MEMORY DIAGNOSTIC INITIATED', 'SUBJECT: WILLARD', 'STAND BY...'];
    const crawlStart = 1600;
    const riseTime = 2200;
    const holdTime = 3500;
    const exitTime = 1800;
    const centerY = canvas.height / 2 - 55;
    const totalDuration = crawlStart + riseTime + holdTime + exitTime + 300;
    startMinigame({
      draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const staticChance = t < crawlStart ? 0.8 : 0.15;
        if (Math.random() < staticChance) {
          const bursts = t < crawlStart ? 45 : 8;
          for (let i = 0; i < bursts; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#5adaff';
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 20 + Math.random() * 140, 2 + Math.random() * 5);
          }
        }
        if (t > crawlStart) {
          const elapsed = t - crawlStart;
          let baseY;
          if (elapsed < riseTime) {
            baseY = canvas.height + 40 - (elapsed / riseTime) * (canvas.height + 40 - centerY);
          } else if (elapsed < riseTime + holdTime) {
            baseY = centerY;
          } else {
            const exitElapsed = elapsed - riseTime - holdTime;
            baseY = centerY - (exitElapsed / exitTime) * (centerY + 150);
          }
          ctx.save();
          ctx.textAlign = 'center';
          crawlLines.forEach((line, i) => {
            ctx.fillStyle = '#ff5555';
            ctx.font = "bold 26px 'Courier New', monospace";
            ctx.fillText(line, canvas.width / 2, baseY + i * 55);
          });
          ctx.restore();
        }
      },
      update() {
        t += 16;
        if (t > totalDuration && !ended) {
          ended = true;
          endMinigame();
        }
      }
    });
  },

  archive_hub: () => {
    const floorY = 330;
    const rooms = {
      madi: [
        { id: 'prologue', label: 'DZIADZI HAIR' },
        { id: 'cardboard', label: 'CARDBOARD RESERVE' },
        { id: 'blind_harvest', label: 'BLIND HARVEST' },
        { id: 'dinosaur', label: 'THE DINOSAUR' },
        { id: 'bicycle', label: 'BICYCLE INCIDENT' }
      ],
      joshua: [
        { id: 'light_war', label: 'THE LIGHT WAR' },
        { id: 'polar_vortex', label: 'POLAR VORTEX' },
        { id: 'salt_tea', label: 'SALT TEA TRIALS' },
        { id: 'cardboard_knights', label: 'CARDBOARD KNIGHTS' }
      ],
      cameron: [
        { id: 'dig', label: 'DIG' },
        { id: 'french_creek', label: 'FRENCH CREEK' },
        { id: 'weeniezucker', label: 'WEENIEZUCKER' }
      ],
      sarah: [
        { id: 'dirt_pile', label: 'JUST ONE MORE PLACE' },
        { id: 'trash_bags', label: 'DISTRIBUTE EVIDENCE' },
        { id: 'snapchat', label: 'KEEP THE LIE ALIVE' },
        { id: 'road_trip', label: 'JUST GET HOME' },
        { id: 'bread_toss', label: 'THUNK' },
        { id: 'pierogi', label: 'BABCI APPROVES?' }
      ]
    };
    const roomOrder = ['madi', 'joshua', 'cameron', 'sarah'];
    const roomTitles = {
      madi: "MADI'S MEMORIES",
      joshua: "JOSHUA'S MEMORIES",
      cameron: "CAMERON'S MEMORIES",
      sarah: "SARAH'S MEMORIES"
    };
    const roomIntros = {
      madi: null,
      joshua: 'intermission',
      cameron: 'cameron_intro',
      sarah: 'act3_intro'
    };
    const list = rooms[hubRoom];
    const cassetteMinX = 70;
    const cassetteMaxX = 650;
    const positions = list.map((m, i) => cassetteMinX + (cassetteMaxX - cassetteMinX) * i / (list.length - 1));
    const doorX = 780;
    let will = { x: canvas.width / 2, y: floorY - 20, speed: 4.5, radius: 18 };
    const keys = {};
    let msg = 'Walk to a cassette. Press SPACE to play it.';
    let locked = false;

    const TESTING_SKIP_ROOM_GATE = false;
    function allDone() { return TESTING_SKIP_ROOM_GATE || list.every(m => memoryDone[m.id]); }
    function cassetteAt(x) {
      for (let i = 0; i < list.length; i++) {
        if (Math.abs(x - positions[i]) < 45) return list[i];
      }
      return null;
    }
    function atDoor(x) { return x > doorX - 45; }
    function nextRoom() {
      const idx = roomOrder.indexOf(hubRoom);
      return idx < roomOrder.length - 1 ? roomOrder[idx + 1] : null;
    }

    startMinigame({
      draw() {
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1c1c26';
        ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
        const roomNum = roomOrder.indexOf(hubRoom) + 1;
        drawText(ctx, 'THE ARCHIVE — ROOM ' + ['I','II','III','IV'][roomNum - 1] + ': ' + roomTitles[hubRoom], 60, 40, '#5adaff', 19);

        list.forEach((m, i) => {
          const x = positions[i];
          const done = memoryDone[m.id];
          ctx.fillStyle = '#333';
          ctx.fillRect(x - 42, 80, 84, 90);
          ctx.fillStyle = done ? '#335533' : '#111';
          ctx.fillRect(x - 34, 88, 68, 74);
          drawText(ctx, done ? 'RESTORED' : '???', x - 28, 130, done ? '#aaffaa' : '#777', 11);
          ctx.fillStyle = done ? '#777' : '#c9a227';
          ctx.fillRect(x - 24, floorY - 24, 48, 20);
          drawText(ctx, m.label, x - 55, floorY - 38, '#e8f0e8', 10);
        });

        const ready = allDone();
        const isLast = nextRoom() === null;
        ctx.fillStyle = ready ? '#335533' : '#222';
        ctx.fillRect(doorX - 10, 70, 40, floorY - 70);
        drawText(ctx, ready ? (isLast ? 'FINAL' : 'ENTER') : 'LOCKED', doorX - 30, 60, ready ? '#aaffaa' : '#888', 12);
        if (ready && !isLast) {
          const nr = nextRoom();
          drawText(ctx, roomTitles[nr].replace("'S MEMORIES", ''), doorX - 30, floorY - 38, '#aaffaa', 11);
        } else if (ready && isLast) {
          drawText(ctx, 'MEMORY', doorX - 30, floorY - 38, '#aaffaa', 11);
        }

        ctx.fillStyle = '#5adaff';
        ctx.fillRect(will.x - will.radius, will.y - will.radius, will.radius * 2, will.radius * 2);
        drawText(ctx, 'WILL', will.x - 18, will.y - will.radius - 8, '#5adaff', 12);

        drawText(ctx, msg, 40, canvas.height - 20, '#e8f0e8', 16);
      },
      update() {
        if (locked) return;
        if (keys['ArrowLeft']) will.x -= will.speed;
        if (keys['ArrowRight']) will.x += will.speed;
        if (keys['ArrowUp']) will.y -= will.speed;
        if (keys['ArrowDown']) will.y += will.speed;
        will.x = Math.max(30, Math.min(canvas.width - 30, will.x));
        will.y = Math.max(floorY - 40, Math.min(canvas.height - 30, will.y));
      },
      onKeyDown(e) {
        keys[e.code] = true;
        if (e.code === 'Space' && !locked) {
          const hit = cassetteAt(will.x);
          if (hit) {
            locked = true;
            msg = `Loading ${hit.label}...`;
            setTimeout(() => endMinigame(hit.id), 500);
            return;
          }
          if (atDoor(will.x)) {
            if (!allDone()) {
              msg = 'Restore every memory in this room first.';
              return;
            }
            locked = true;
            const nr = nextRoom();
            if (nr === null) {
              // Last room (Sarah) complete — go to finale
              msg = 'Loading finale...';
              setTimeout(() => endMinigame('archive_collapse'), 500);
            } else {
              hubRoom = nr;
              msg = 'Entering ' + roomTitles[nr] + '...';
              const introScene = roomIntros[nr];
              const seenFlag = nr + '_intro_seen';
              setTimeout(() => {
                if (introScene && !memoryDone[seenFlag]) {
                  memoryDone[seenFlag] = true;
                  endMinigame(introScene);
                } else {
                  cancelAnimationFrame(raf);
                  minigames.archive_hub();
                }
              }, 500);
            }
          }
        }
      },
      onKeyUp(e) { keys[e.code] = false; }
    });
  },

  dirt_pile: () => {
    const areas = [
      { name: 'FOUNDATION', x: 520, y: 120, w: 120, h: 80, color: '#6b5a45' },
      { name: 'GARDEN', x: 620, y: 240, w: 120, h: 80, color: '#2a5a2a' },
      { name: 'SIDE YARD', x: 120, y: 340, w: 120, h: 80, color: '#3a6b3a' },
      { name: 'NEIGHBOR', x: 280, y: 120, w: 120, h: 80, color: '#8b5a2b' },
      { name: 'FLOWER BED', x: 420, y: 320, w: 120, h: 80, color: '#7a4a6a' },
      { name: '???', x: 560, y: 60, w: 80, h: 40, color: '#555' }
    ];
    const pile = { x: 40, y: 200, w: 100, h: 140 };
    const display = [100, 91, 84, 79, 75, 72, 69];
    const requests = ['FOUNDATION COMPLETE.', 'GARDEN.', 'SIDE YARD.', 'NEIGHBOR.', 'FLOWER BED.', '???'];
    let areaIndex = 0;
    let shovelProgress = 0;
    let needed = 12;
    let selected = -1;
    let momMessage = requests[0];
    let momTimer = 2400;
    let finished = false;

    startMinigame({
      draw() {
        ctx.fillStyle = '#1a1612';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#3a3025';
        ctx.fillRect(pile.x, pile.y, pile.w, pile.h);
        ctx.fillStyle = '#5a4a35';
        ctx.beginPath();
        ctx.arc(pile.x + pile.w / 2, pile.y + pile.h / 2, 45, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < areas.length; i++) {
          const a = areas[i];
          ctx.fillStyle = i < areaIndex ? '#333' : a.color;
          ctx.fillRect(a.x, a.y, a.w, a.h);
          ctx.strokeStyle = (i === areaIndex ? (i === selected ? '#fff' : '#ffaa55') : (i < areaIndex ? '#555' : '#333'));
          ctx.lineWidth = 2;
          ctx.strokeRect(a.x, a.y, a.w, a.h);
          if (i >= areaIndex) drawText(ctx, a.name, a.x + 8, a.y + 22, '#e8f0e8', 12);
          if (i === areaIndex) drawText(ctx, 'NEXT', a.x + 8, a.y + 38, '#ffaa55', 11);
        }
        ctx.fillStyle = '#4a4a55';
        ctx.fillRect(240, 180, 180, 140);
        ctx.fillStyle = '#222';
        ctx.fillRect(310, 240, 40, 80);
        if (momTimer > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(120, 20, 560, 46);
          ctx.strokeStyle = '#ffaa55';
          ctx.strokeRect(120, 20, 560, 46);
          drawText(ctx, 'MOM: ' + momMessage, 140, 50, '#ffcc99', 16);
        }
        drawText(ctx, 'DIRT REMAINING: ' + display[areaIndex] + '%', 20, 405, '#d0b080', 18);
        drawText(ctx, 'CLICK the glowing area, then MASH SPACE.', 20, 430, '#888', 13);
      },
      onClick(mx, my) {
        if (finished) return;
        const a = areas[areaIndex];
        if (mx >= a.x && mx <= a.x + a.w && my >= a.y && my <= a.y + a.h) selected = areaIndex;
      },
      onKeyDown(e) {
        if (finished || e.repeat) return;
        if (e.code === 'Space' && selected === areaIndex) {
          shovelProgress++;
          if (shovelProgress >= needed) {
            areaIndex++;
            if (areaIndex < areas.length) {
              shovelProgress = 0;
              needed = 12 + areaIndex * 2;
              momMessage = requests[areaIndex];
              momTimer = 2400;
              selected = -1;
            } else {
              finished = true;
              momMessage = 'WHY IS THERE STILL DIRT?';
              momTimer = 5000;
              setTimeout(endMinigame, 2600);
            }
          }
        }
      },
      update() {
        if (momTimer > 0) momTimer -= 16;
      }
    });
  },

  trash_bags: () => {
    const canCount = 5;
    const bagCount = 8;
    let cans = [];
    let bags = [];
    let selected = null;
    let light = false;
    let lightTimer = 0;
    let flash = 0;
    let message = 'DISTRIBUTE THE EVIDENCE.';
    let won = false;

    function reset() {
      const weights = [];
      for (let i = 0; i < bagCount; i++) {
        weights.push(1 + Math.floor(Math.random() * 4));
      }
      const total = weights.reduce((s, w) => s + w, 0);
      const maxW = Math.max(...weights);
      let caps = new Array(canCount).fill(0);
      let cushion = 2 + Math.floor(Math.random() * 3);
      let remain = total + cushion;
      for (let i = 0; i < canCount - 1; i++) {
        let c = Math.floor((remain / (canCount - i)) * (0.7 + Math.random() * 0.5));
        c = Math.max(maxW, Math.min(remain - (canCount - i - 1) * maxW, c));
        c = Math.max(maxW, c);
        caps[i] = c;
        remain -= c;
      }
      caps[canCount - 1] = Math.max(maxW, remain);
      for (let i = caps.length - 1; i >= 0; i--) {
        if (caps.reduce((s, c) => s + c, 0) < total) caps[i]++;
      }
      for (let i = caps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [caps[i], caps[j]] = [caps[j], caps[i]];
      }

      cans = [];
      for (let i = 0; i < canCount; i++) {
        cans.push({ x: 150 + i * 125, y: 280, w: 80, h: 120, cap: caps[i], load: 0 });
      }
      bags = [];
      for (let i = 0; i < bagCount; i++) {
        bags.push({
          id: i,
          x: 40 + (i % 4) * 55,
          y: 90 + Math.floor(i / 4) * 70,
          w: 40,
          h: 55,
          weight: weights[i],
          placed: false
        });
      }
      selected = null;
      won = false;
      flash = 0;
      light = false;
      lightTimer = 1200;
      message = 'EVENLY. NO CAN OVER ITS CAP.';
    }

    const targetTotal = () => bags.reduce((s, b) => s + b.weight, 0);

    startMinigame({
      init: reset,
      draw() {
        ctx.fillStyle = '#0b0b10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(0, 420, canvas.width, 30);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = light ? '#ffffaa' : '#333';
          ctx.beginPath();
          ctx.arc(230 + i * 130, 50, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < canCount; i++) {
          const c = cans[i];
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = '#444';
          ctx.fillRect(c.x, c.y, c.w, 18);
          const pct = c.load / c.cap;
          const fillH = Math.min(c.h - 18, pct * (c.h - 18));
          ctx.fillStyle = pct < 0.65 ? '#55aa55' : (pct < 1 ? '#ffaa55' : '#ff5555');
          ctx.fillRect(c.x + 4, c.y + 18 + (c.h - 18 - fillH), c.w - 8, fillH);
          drawText(ctx, c.load + '/' + c.cap, c.x + 8, c.y - 12, '#aaa', 12);
        }
        for (const b of bags) {
          if (b.placed) continue;
          ctx.fillStyle = '#050505';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          drawText(ctx, String(b.weight), b.x + 14, b.y + 34, '#fff', 16);
          if (b.id === selected) {
            ctx.strokeStyle = '#ffffaa';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          }
        }
        if (flash > 0) {
          ctx.fillStyle = (Math.floor(flash / 6) % 2 === 0 ? 'rgba(255,85,85,0.35)' : 'rgba(0,0,0,0)');
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(120, 75, 560, 40);
        drawText(ctx, light ? 'PORCH LIGHT! FREEZE.' : message, 140, 100, '#e8f0e8', 15);
        if (!won) {
          const placedWeight = bags.reduce((s, b) => s + (b.placed ? b.weight : 0), 0);
          const remain = targetTotal() - placedWeight;
          const avg = (targetTotal() / canCount).toFixed(1);
          drawText(ctx, 'REMAINING: ' + remain + ' / AVG: ' + avg, 540, 40, '#aaa', 13);
        }
      },
      onClick(mx, my) {
        if (won || light) return;
        if (selected === null) {
          for (const b of bags) {
            if (!b.placed && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
              selected = b.id;
              return;
            }
          }
          return;
        }
        for (let i = 0; i < canCount; i++) {
          const c = cans[i];
          if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
            const bag = bags[selected];
            bag.placed = true;
            c.load += bag.weight;
            selected = null;
            if (c.load > c.cap) {
              flash = 50;
              message = 'TOO HEAVY! RESETTING.';
              setTimeout(reset, 1400);
              return;
            }
            if (bags.every(b => b.placed)) {
              won = true;
              message = 'THIS WAS LEGAL YARD WORK.';
              setTimeout(endMinigame, 2200);
            }
            return;
          }
        }
        selected = null;
      },
      update() {
        if (won) return;
        lightTimer -= 16;
        if (lightTimer <= 0) {
          light = !light;
          lightTimer = light ? 1200 + Math.random() * 800 : 1500 + Math.random() * 1500;
        }
        if (flash > 0) flash--;
      }
    });
  },

  snapchat: () => {
    const messages = [
      { from: 'WIFE', text: 'Will, you saw the picture I posted yesterday, right?', safe: 'Of course, loved it.', susp: 'What picture?', blow: 'I was offline all day.' },
      { from: 'SISTER', text: 'You told him about the thing?', safe: 'We covered it already.', susp: 'Which thing?', blow: 'I told everyone.' },
      { from: 'JOSHUA', text: 'Mo says congrats on the anniversary.', safe: 'Wrong day, buddy.', susp: 'Whose anniversary?', blow: 'I have never married.' },
      { from: 'WIFE', text: 'You seem quiet. Hiding something?', safe: 'Just tired.', susp: 'Why would I?', blow: 'Yes, obviously.' },
      { from: 'SISTER', text: 'Group pic. You are in the back.', safe: 'I remember.', susp: 'Was I?', blow: 'That is not me.' },
      { from: 'WIFE', text: 'Why is there a shovel in the bedroom?', safe: 'Yard work.', susp: 'No idea.', blow: 'You will see soon.' },
      { from: 'JOSHUA', text: 'You coming to the thing?', safe: 'I will be there.', susp: 'What thing?', blow: 'I am leaving town.' },
      { from: 'WIFE', text: 'Did you delete our chat?', safe: 'Phone restarted.', susp: 'Why do you ask?', blow: 'Guilty conscience.' }
    ];
    let idx = 0;
    let suspicion = 15;
    let timeLeft = 3000;
    let chosen = false;
    let message = 'KEEP THE LIE A-LIE-VE.';
    let flash = 0;
    let flashColor = null;
    let finished = false;
    let currentOpts = [];

    function shuffleOpts(m) {
      const opts = [
        { type: 'safe', text: m.safe },
        { type: 'susp', text: m.susp },
        { type: 'blow', text: m.blow }
      ];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return opts;
    }

    function next() {
      if (suspicion >= 100) {
        finished = true;
        message = 'THE LIE DIED. RESETTING.';
        flash = 50;
        flashColor = 'rgba(255,85,85,0.4)';
        setTimeout(() => {
          idx = 0;
          suspicion = 15;
          timeLeft = 3000;
          chosen = false;
          message = 'KEEP THE LIE A-LIE-VE.';
          finished = false;
          flash = 0;
          flashColor = null;
          currentOpts = shuffleOpts(messages[0]);
        }, 1600);
        return;
      }
      idx++;
      if (idx >= messages.length) {
        finished = true;
        message = 'THE LIE LIVES.';
        setTimeout(endMinigame, 1800);
        return;
      }
      chosen = false;
      timeLeft = 3000;
      currentOpts = shuffleOpts(messages[idx]);
      message = 'KEEP THE LIE A-LIE-VE.';
    }

    startMinigame({
      draw() {
        ctx.fillStyle = '#0b0b10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a1f';
        ctx.fillRect(180, 30, 440, 390);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(180, 30, 440, 390);
        const m = messages[idx];
        ctx.fillStyle = '#2a4a3a';
        ctx.fillRect(220, 80, 360, 70);
        drawText(ctx, m.from, 230, 105, '#5adaff', 14);
        drawText(ctx, m.text, 230, 130, '#e8f0e8', 13);
        if (currentOpts.length === 0) currentOpts = shuffleOpts(m);
        for (let i = 0; i < 3; i++) {
          const by = 190 + i * 70;
          ctx.fillStyle = '#2a2a35';
          ctx.fillRect(220, by, 360, 55);
          ctx.strokeStyle = '#555';
          ctx.strokeRect(220, by, 360, 55);
          drawText(ctx, currentOpts[i].text, 235, by + 30, '#e8f0e8', 12);
        }
        const timePct = Math.max(0, timeLeft / 3000);
        ctx.fillStyle = '#333';
        ctx.fillRect(220, 50, 360, 12);
        ctx.fillStyle = timePct < 0.25 ? '#ff5555' : '#5adaff';
        ctx.fillRect(220, 50, 360 * timePct, 12);
        const susPct = Math.min(1, suspicion / 100);
        ctx.fillStyle = '#333';
        ctx.fillRect(220, 20, 360, 16);
        ctx.fillStyle = susPct < 0.6 ? '#55aa55' : (susPct < 0.85 ? '#ffaa55' : '#ff5555');
        ctx.fillRect(220, 20, 360 * susPct, 16);
        drawText(ctx, 'SUSPICION', 230, 16, '#888', 11);
        if (flash > 0) {
          ctx.fillStyle = flashColor;
          ctx.fillRect(180, 30, 440, 390);
        }
        drawText(ctx, message, 220, 425, '#888', 13);
      },
      onClick(mx, my) {
        if (finished || chosen) return;
        if (currentOpts.length === 0) currentOpts = shuffleOpts(messages[idx]);
        for (let i = 0; i < 3; i++) {
          const by = 190 + i * 70;
          if (mx >= 220 && mx <= 580 && my >= by && my <= by + 55) {
            chosen = true;
            const type = currentOpts[i].type;
            if (type === 'safe') {
              suspicion = Math.max(0, suspicion - 10);
              message = 'Safe.';
              flashColor = 'rgba(85,170,85,0.25)';
            } else if (type === 'susp') {
              suspicion += 15;
              message = 'Suspicious.';
              flashColor = 'rgba(255,170,85,0.25)';
            } else {
              suspicion += 40;
              message = 'The lie is cracking.';
              flashColor = 'rgba(255,85,85,0.25)';
            }
            flash = 20;
            setTimeout(next, 700);
            return;
          }
        }
      },
      update() {
        if (finished || chosen) {
          if (flash > 0) flash--;
          return;
        }
        timeLeft -= 16;
        if (timeLeft <= 0) {
          chosen = true;
          suspicion += 25;
          message = 'Too slow.';
          flashColor = 'rgba(255,85,85,0.25)';
          flash = 20;
          setTimeout(next, 800);
        }
      }
    });
  },

  road_trip: () => {
    const lanes = [200, 400, 600];
    let lane = 1;
    let carX = lanes[lane];
    let t = 0;
    let debris = [];
    let nextSpawn = 50;
    let message = '';
    let msgTimer = 0;
    let clowns = false;
    let clownY = -130;
    let flash = 0;
    let finished = false;

    function reset() {
      t = 0;
      debris = [];
      nextSpawn = 50;
      message = 'JUST GET HOME.';
      msgTimer = 1800;
      clowns = false;
      clownY = -130;
      flash = 0;
      finished = false;
    }
    reset();

    startMinigame({
      draw() {
        ctx.fillStyle = '#1a1a20';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#2a2a35';
        ctx.fillRect(100, 0, 600, canvas.height);
        ctx.strokeStyle = '#444';
        ctx.setLineDash([20, 20]);
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(lanes[i] + 100, 0);
          ctx.lineTo(lanes[i] + 100, canvas.height);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = '#5adaff';
        ctx.fillRect(carX - 30, canvas.height - 120, 60, 90);
        ctx.fillStyle = '#111';
        ctx.fillRect(carX - 20, canvas.height - 115, 40, 20);
        drawText(ctx, 'WILL', carX - 20, canvas.height - 130, '#5adaff', 12);

        for (const d of debris) {
          ctx.fillStyle = d.type === 'DEBRIS' ? '#ff5555' : '#ffaa55';
          ctx.fillRect(d.x - 20, d.y, 40, 40);
          drawText(ctx, d.type, d.x - 15, d.y + 25, '#000', 10);
        }

        if (clowns) {
          ctx.fillStyle = '#ff55ff';
          ctx.fillRect(80, clownY, 40, 90);
          ctx.fillRect(canvas.width - 120, clownY, 40, 90);
          ctx.fillStyle = '#888';
          ctx.fillRect(75, clownY - 5, 10, 40);
          ctx.fillRect(canvas.width - 85, clownY - 5, 10, 40);
          drawText(ctx, 'AXE CLOWN', 65, clownY - 10, '#ff55ff', 10);
          drawText(ctx, 'AXE CLOWN', canvas.width - 135, clownY - 10, '#ff55ff', 10);
        }

        if (t > 3000 && t < 5000) drawText(ctx, 'WARNING LIGHTS', 290, 80, '#ffaa55', 20);
        if (t > 8000 && t < 10000) drawText(ctx, 'WALLET MISSING', 290, 120, '#5adaff', 20);

        drawText(ctx, 'JUST GET HOME', 20, 40, '#e8f0e8', 18);
        const secs = (60 - t / 1000).toFixed(1);
        drawText(ctx, 'TIME: ' + secs, 650, 40, parseFloat(secs) < 10 ? '#ff5555' : '#aaa', 18);

        if (message) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(200, 190, 400, 50);
          drawText(ctx, message, 220, 220, '#fff', 18);
        }

        if (flash > 0) {
          ctx.fillStyle = (Math.floor(flash / 5) % 2 === 0 ? 'rgba(255,0,0,0.25)' : 'rgba(0,0,0,0)');
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          flash--;
        }
      },
      onKeyDown(e) {
        if (finished) return;
        if (e.code === 'ArrowLeft' && lane > 0) lane--;
        if (e.code === 'ArrowRight' && lane < 2) lane++;
        carX = lanes[lane];
      },
      update() {
        if (finished) return;
        t += 16;

        if (t > 38000 && !clowns) {
          clowns = true;
          message = 'EVENT CLASSIFICATION: UNKNOWN';
          msgTimer = 2400;
        }
        if (clowns) {
          clownY += 0.8;
          if (clownY > canvas.height - 120) clownY = canvas.height - 120;
        }
        if (msgTimer > 0) {
          msgTimer -= 16;
        } else {
          message = '';
        }

        const difficulty = Math.floor(t / 12000);
        nextSpawn--;
        if (nextSpawn <= 0) {
          const l = Math.floor(Math.random() * 3);
          const isDebris = Math.random() < 0.5;
          debris.push({ x: lanes[l], y: -40, type: isDebris ? 'DEBRIS' : 'LIGHT', lane: l, speed: 4 + Math.random() * 3 + difficulty * 0.5 });
          nextSpawn = Math.max(30, 55 - difficulty * 3) + Math.random() * 40;
        }

        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.y += d.speed;
          if (d.y > canvas.height) {
            debris.splice(i, 1);
          } else if (d.type === 'DEBRIS' && d.lane === lane && d.y > canvas.height - 150 && d.y < canvas.height - 50) {
            flash = 30;
            message = 'TRY AGAIN.';
            msgTimer = 1200;
            setTimeout(reset, 1200);
            return;
          }
        }

        if (t >= 60000) {
          finished = true;
          message = 'HOME AT LAST.';
          msgTimer = 3000;
          setTimeout(endMinigame, 1800);
        }
      }
    });
  },

  bread_toss: () => {
    const rounds = [
      { name: 'COUNTER', x: 220, y: 310, w: 120, h: 20, sarah: 'Will.' },
      { name: 'TABLE', x: 400, y: 310, w: 120, h: 18, sarah: 'Will...' },
      { name: 'COUCH DOORWAY', x: 570, y: 310, w: 90, h: 15, sarah: 'WILLIARD.' },
      { name: 'FRIDGE GAP', x: 700, y: 310, w: 60, h: 10, sarah: 'WILLIARD!' }
    ];
    let round = 0;
    let power = 0;
    let charging = false;
    let result = '';
    let resultTimer = 0;
    let time = 0;
    let finished = false;
    let sarahText = '';
    let thrownX = 0;
    let thrownY = 0;
    let landingX = 0;
    let throwing = false;

    function fail(reason) {
      result = reason;
      resultTimer = 700;
      power = 0;
      throwing = false;
    }

    startMinigame({
      draw() {
        ctx.fillStyle = '#15151a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const r = rounds[round];
        ctx.fillStyle = '#3a3a45';
        ctx.fillRect(120, 300, 200, 40);
        ctx.fillStyle = '#4a4a55';
        ctx.fillRect(380, 270, 150, 40);
        ctx.fillStyle = '#2a2a35';
        ctx.fillRect(540, 220, 120, 60);
        ctx.fillStyle = '#222';
        ctx.fillRect(650, 150, 90, 80);
        ctx.strokeStyle = '#5adaff';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        drawText(ctx, r.name, r.x, r.y - 12, '#5adaff', 11);
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(60, 270, 60, 40);
        ctx.fillStyle = '#333';
        ctx.fillRect(60, 340, 200, 20);
        ctx.fillStyle = '#55ff55';
        ctx.fillRect(60, 340, power * 2, 20);
        drawText(ctx, 'POWER: ' + Math.floor(power), 60, 330, '#e8f0e8', 13);
        drawText(ctx, 'HOLD SPACE, RELEASE TO THROW', 60, 395, '#888', 13);
        if (throwing) {
          ctx.fillStyle = '#c9a86c';
          ctx.fillRect(thrownX, thrownY, 24, 14);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(500, 30, 260, 40);
        drawText(ctx, 'SARAH: ' + sarahText, 510, 55, '#ffaa99', 14);
        if (result) drawText(ctx, result, 330, 100, '#fff', 24);
        drawText(ctx, 'TIME: ' + (45 - time / 1000).toFixed(1), 650, 40, '#aaa', 14);
      },
      onKeyDown(e) {
        if (finished || e.repeat) return;
        if (e.code === 'Space' && !charging && !throwing && !result) charging = true;
      },
      onKeyUp(e) {
        if (finished || e.code !== 'Space' || !charging) return;
        charging = false;
        throwing = true;
        thrownX = 110;
        thrownY = 300;
        throwPower = power;
        landingX = 110 + throwPower * 6.5;
      },
      update() {
        if (finished) return;
        time += 16;
        if (time >= 45000) {
          finished = true;
          result = 'OUT OF TIME.';
          setTimeout(endMinigame, 1500);
          return;
        }
        if (charging && power < 100) power += 1.5;
        if (throwing) {
          thrownX += (landingX - thrownX) * 0.12 + 3;
          thrownX = Math.min(thrownX, landingX);
          const r = rounds[round];
          if (thrownX >= landingX) {
            throwing = false;
            if (landingX >= r.x && landingX <= r.x + r.w) {
              result = 'THUNK';
              sarahText = r.sarah;
              resultTimer = 900;
              setTimeout(() => {
                round++;
                if (round >= rounds.length) {
                  finished = true;
                  result = 'BREADED.';
                  setTimeout(endMinigame, 1800);
                } else {
                  result = '';
                  power = 0;
                }
              }, 900);
            } else if (landingX < r.x) {
              fail('TOO SHORT.');
            } else {
              fail('TOO FAR.');
            }
          } else if (thrownX > canvas.width) {
            fail('TOO FAR.');
          }
        }
        if (resultTimer > 0) {
          resultTimer -= 16;
          if (resultTimer <= 0 && !finished && !throwing) {
            result = '';
            power = 0;
          }
        }
      }
    });
  },

  pierogi: () => {
    const targetX = 600;
    const zone = [540, 660];
    let pierogis = [];
    let spawnTimer = 0;
    let sealed = 0;
    let patience = 100;
    let waveTotal = 0;
    let waveSealed = 0;
    let verdict = '';
    let verdictTimer = 0;
    let message = 'PINCH WHEN THE PIEROGI HITS THE GREEN ZONE.';
    let finished = false;

    function reset() {
      pierogis = [];
      spawnTimer = 0;
      sealed = 0;
      patience = 100;
      waveTotal = 0;
      waveSealed = 0;
      verdict = '';
      verdictTimer = 0;
      message = 'PINCH WHEN THE PIEROGI HITS THE GREEN ZONE.';
      finished = false;
    }

    function babciVerdict() {
      const ratio = waveSealed / Math.max(1, waveTotal);
      if (ratio >= 0.8) verdict = '...Fine.';
      else if (ratio >= 0.5) verdict = 'CLOSER.';
      else if (ratio > 0) verdict = 'TOO MUCH.';
      else verdict = 'NO.';
      verdictTimer = 2400;
    }

    function fail() {
      finished = true;
      verdict = 'NO.';
      verdictTimer = 3000;
      setTimeout(reset, 1800);
    }

    function win() {
      finished = true;
      verdict = '...Fine.';
      verdictTimer = 3000;
      setTimeout(endMinigame, 2000);
    }

    function pinch() {
      if (finished) return;
      let best = null;
      let bestDist = 1000;
      for (const p of pierogis) {
        if (p.x >= zone[0] && p.x <= zone[1] && !p.processed) {
          const d = Math.abs(p.x - targetX);
          if (d < bestDist) {
            bestDist = d;
            best = p;
          }
        }
      }
      if (!best) {
        patience -= 10;
        waveTotal++;
        waveSealed += 0;
      } else {
        best.processed = true;
        if (bestDist <= 18) {
          best.result = 'SEALED';
          sealed++;
          waveSealed++;
        } else if (best.x < targetX) {
          best.result = 'UNDERFILLED';
          patience -= 12;
        } else {
          best.result = 'BURST';
          patience -= 12;
        }
        waveTotal++;
      }
      if (waveTotal >= 5) {
        babciVerdict();
        waveTotal = 0;
        waveSealed = 0;
      }
      if (sealed >= 15) {
        win();
      } else if (patience <= 0) {
        fail();
      }
    }

    reset();

    startMinigame({
      draw() {
        ctx.fillStyle = '#1a1512';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#3a3025';
        ctx.fillRect(0, 320, canvas.width, 60);
        ctx.strokeStyle = '#5adaff';
        ctx.strokeRect(zone[0], 300, zone[1] - zone[0], 100);
        ctx.fillStyle = 'rgba(85,255,85,0.15)';
        ctx.fillRect(zone[0], 300, zone[1] - zone[0], 100);
        ctx.fillStyle = '#4a3a35';
        ctx.fillRect(60, 100, 80, 120);
        drawText(ctx, 'BABCI', 75, 130, '#ffcc99', 14);
        for (const p of pierogis) {
          ctx.fillStyle = p.processed ? '#666' : '#c9a86c';
          ctx.beginPath();
          ctx.ellipse(p.x, 350, 22, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          if (p.processed) drawText(ctx, p.result, p.x - 24, 310, '#fff', 12);
        }
        const patPct = Math.max(0, patience / 100);
        ctx.fillStyle = '#333';
        ctx.fillRect(600, 55, 160, 14);
        ctx.fillStyle = patPct < 0.3 ? '#ff5555' : (patPct < 0.6 ? '#ffaa55' : '#55aa55');
        ctx.fillRect(600, 55, 160 * patPct, 14);
        drawText(ctx, 'PATIENCE', 520, 55, '#888', 12);
        drawText(ctx, 'SEALED: ' + sealed + ' / 15', 600, 40, '#e8f0e8', 15);
        if (verdict) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(300, 80, 280, 50);
          drawText(ctx, 'BABCI: ' + verdict, 320, 110, '#ffcc99', 16);
        }
        drawText(ctx, message, 40, 420, '#888', 13);
      },
      onKeyDown(e) {
        if (e.repeat || finished) return;
        if (e.code === 'Space') pinch();
      },
      update() {
        if (finished) return;
        spawnTimer += 16;
        if (spawnTimer >= 1300) {
          pierogis.push({ x: -30, processed: false });
          spawnTimer = 0;
        }
        for (let i = pierogis.length - 1; i >= 0; i--) {
          const p = pierogis[i];
          p.x += 1.4;
          if (p.x > canvas.width + 40) pierogis.splice(i, 1);
        }
        if (verdictTimer > 0) {
          verdictTimer -= 16;
          if (verdictTimer <= 0) verdict = '';
        }
      }
    });
  },

  insert_tape: () => {
    let hover = false;
    const btn = { x: 250, y: 180, w: 300, h: 90 };
    startMinigame({
      draw() {
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawText(ctx, 'SPECIAL BIRTHDAY TAPE', 240, 80, '#ff9944', 24);
        drawText(ctx, 'LOADED. READY FOR PLAYBACK.', 230, 120, '#888', 16);
        ctx.fillStyle = hover ? '#445544' : '#223322';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = hover ? '#aaffaa' : '#55aa55';
        ctx.lineWidth = 3;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        // Cassette icon
        ctx.fillStyle = '#333';
        ctx.fillRect(btn.x + 20, btn.y + 25, 40, 40);
        ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.arc(btn.x + 32, btn.y + 37, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(btn.x + 48, btn.y + 37, 8, 0, Math.PI * 2); ctx.fill();
        drawText(ctx, 'INSERT SPECIAL TAPE', btn.x + 75, btn.y + 55, hover ? '#aaffaa' : '#55aa55', 20);
      },
      onMouseMove(mx, my) {
        hover = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
      },
      onClick(mx, my) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          playCutsceneVideo('assets/Will_Birthday_March.mp4', 'credits');
        }
      }
    });
  },

  // ============ THE CAMERON FILES ============

  dig: () => {
    const floorY = 360;
    let will = { x: 400, y: floorY - 20, speed: 3.5, r: 16 };
    let cameron = { x: 120, y: floorY - 20, r: 16 };
    const keys = {};
    let guards = [];
    let phase = 'natural'; // natural -> dig -> swarm -> capture
    let phaseTimer = 0;
    let emoteText = '';
    let emoteTimer = 0;
    let cameronLines = ['Oh no.', 'WILL.', 'WHY DID YOU SAY DIG?'];
    let cameronLineIdx = 0;
    let cameronLineTimer = 0;
    let fightClouds = [];
    let fightTexts = ['POW', 'WHAM', 'DIG', 'STOP RESISTING'];
    let captureTimer = 0;
    let finished = false;
    let shake = 0;

    function spawnGuard(side) {
      const x = side === 'left' ? -20 : canvas.width + 20;
      const y = floorY - 20 + (Math.random() - 0.5) * 40;
      guards.push({ x, y, speed: 1.8 + Math.random() * 1.5, r: 16 });
    }

    startMinigame({
      draw() {
        ctx.save();
        if (shake > 0) {
          ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          shake -= 0.5;
        }
        ctx.fillStyle = '#1a1a20';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 80, canvas.width - 80, floorY - 80);

        if (phase === 'natural') {
          drawText(ctx, 'OBJECTIVE: ACT NATURAL', 250, 50, '#5adaff', 18);
          drawText(ctx, '1-WAVE  2-SIT  3-LAUGH  4-???', 220, 75, '#888', 13);
        } else if (phase === 'swarm' || phase === 'capture') {
          drawText(ctx, 'NEW OBJECTIVE: RUN', 280, 50, '#ff5555', 20);
        }

        // Cameron
        ctx.fillStyle = '#ff9944';
        ctx.fillRect(cameron.x - cameron.r, cameron.y - cameron.r, cameron.r * 2, cameron.r * 2);
        drawText(ctx, 'CAM', cameron.x - 14, cameron.y - cameron.r - 6, '#ff9944', 10);

        // Will
        if (phase !== 'capture') {
          ctx.fillStyle = '#5adaff';
          ctx.fillRect(will.x - will.r, will.y - will.r, will.r * 2, will.r * 2);
          drawText(ctx, 'WILL', will.x - 16, will.y - will.r - 6, '#5adaff', 10);
        }

        // Emote bubble
        if (emoteText && emoteTimer > 0) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(will.x - 30, will.y - 50, 60, 24);
          drawText(ctx, emoteText, will.x - 20, will.y - 32, '#000', 14);
        }

        // Guards
        for (const g of guards) {
          ctx.fillStyle = '#555';
          ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
          ctx.fillStyle = '#888';
          ctx.fillRect(g.x - 8, g.y - g.r - 6, 16, 6);
        }

        // Cameron reaction
        if (cameronLineTimer > 0 && cameronLineIdx < cameronLines.length) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(cameron.x - 80, cameron.y - 70, 160, 30);
          drawText(ctx, cameronLines[Math.min(cameronLineIdx, cameronLines.length - 1)],
            cameron.x - 70, cameron.y - 50, '#ff9944', 12);
        }

        // Fight cloud
        if (phase === 'capture') {
          for (const fc of fightClouds) {
            ctx.fillStyle = `rgba(200,200,200,${fc.alpha})`;
            ctx.beginPath();
            ctx.arc(fc.x, fc.y, fc.r, 0, Math.PI * 2);
            ctx.fill();
          }
          for (let i = 0; i < fightTexts.length; i++) {
            const ft = fightTexts[i];
            const fy = 150 + i * 40 + Math.sin(phaseTimer / 200 + i) * 10;
            drawText(ctx, ft, 300 + i * 60, fy, '#ffaa55', 22);
          }
        }

        ctx.restore();
      },
      onKeyDown(e) {
        if (finished) return;
        keys[e.code] = true;
        if (phase === 'natural') {
          if (e.code === 'Digit1') { emoteText = 'WAVE'; emoteTimer = 1000; }
          else if (e.code === 'Digit2') { emoteText = 'SIT'; emoteTimer = 1000; }
          else if (e.code === 'Digit3') { emoteText = 'LAUGH'; emoteTimer = 1000; }
          else if (e.code === 'Digit4') {
            emoteText = 'DIG';
            emoteTimer = 2000;
            phase = 'dig';
            phaseTimer = 0;
          }
        }
      },
      onKeyUp(e) { keys[e.code] = false; },
      update() {
        if (finished) return;
        phaseTimer += 16;

        if (phase === 'natural') {
          if (keys['ArrowLeft'] || keys['KeyA']) will.x -= will.speed;
          if (keys['ArrowRight'] || keys['KeyD']) will.x += will.speed;
          will.x = Math.max(60, Math.min(canvas.width - 60, will.x));
          if (emoteTimer > 0) emoteTimer -= 16;
          if (phaseTimer > 8000 && !emoteText) {
            drawText(ctx, 'Try an emote.', 300, 100, '#888', 14);
          }
        } else if (phase === 'dig') {
          // Freeze, guards turn
          if (phaseTimer > 1000) {
            phase = 'swarm';
            phaseTimer = 0;
            spawnGuard('left');
            spawnGuard('left');
            shake = 8;
          }
        } else if (phase === 'swarm') {
          if (keys['ArrowLeft'] || keys['KeyA']) will.x -= will.speed;
          if (keys['ArrowRight'] || keys['KeyD']) will.x += will.speed;
          if (keys['ArrowUp'] || keys['KeyW']) will.y -= will.speed;
          if (keys['ArrowDown'] || keys['KeyS']) will.y += will.speed;
          will.x = Math.max(60, Math.min(canvas.width - 60, will.x));
          will.y = Math.max(100, Math.min(floorY - 10, will.y));

          // Spawn more guards over time
          if (phaseTimer > 3000 && guards.length < 4) { spawnGuard('right'); spawnGuard('right'); }
          if (phaseTimer > 6000 && guards.length < 8) { spawnGuard('left'); spawnGuard('left'); spawnGuard('right'); spawnGuard('right'); }
          if (phaseTimer > 10000 && guards.length < 16) { for (let i = 0; i < 4; i++) spawnGuard(Math.random() < 0.5 ? 'left' : 'right'); }

          // Cameron reactions
          if (cameronLineTimer <= 0 && cameronLineIdx < cameronLines.length) {
            cameronLineTimer = 2000;
            cameronLineIdx++;
          }
          cameronLineTimer -= 16;

          // Guards chase
          for (const g of guards) {
            const dx = will.x - g.x, dy = will.y - g.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) { g.x += (dx / dist) * g.speed; g.y += (dy / dist) * g.speed; }
            if (dist < g.r + will.r - 4) {
              phase = 'capture';
              phaseTimer = 0;
              shake = 12;
            }
          }

          // Force capture after 20s
          if (phaseTimer > 20000) {
            phase = 'capture';
            phaseTimer = 0;
            shake = 12;
          }
        } else if (phase === 'capture') {
          if (phaseTimer < 100) {
            for (let i = 0; i < 8; i++) {
              fightClouds.push({
                x: will.x + (Math.random() - 0.5) * 80,
                y: will.y + (Math.random() - 0.5) * 80,
                r: 20 + Math.random() * 30,
                alpha: 0.5 + Math.random() * 0.4
              });
            }
          }
          if (phaseTimer > 2500) {
            finished = true;
            endMinigame();
          }
        }
      }
    });
  },

  french_creek: () => {
    const zones = [
      { name: 'PARKING', x: 60, y: 350, w: 120, h: 60, mult: 1 },
      { name: 'TRAIL', x: 200, y: 340, w: 100, h: 50, mult: 1.5 },
      { name: 'PICNIC', x: 320, y: 330, w: 110, h: 55, mult: 1.5 },
      { name: 'BUSHES', x: 460, y: 335, w: 100, h: 50, mult: 2 },
      { name: 'CREEK BANK', x: 590, y: 330, w: 130, h: 60, mult: 3 }
    ];
    const items = [
      { name: 'BEER BOTTLE', pts: 100, color: '#5a8b3a' },
      { name: 'SODA CAN', pts: 80, color: '#aa5555' },
      { name: 'PAPER CUP', pts: 60, color: '#cccccc' },
      { name: 'PIZZA BOX', pts: 150, color: '#c9a86c' },
      { name: 'PAPER PLATE', pts: 50, color: '#dddddd' },
      { name: 'CHIP BAG', pts: 70, color: '#ff8844' },
      { name: 'PLASTIC BAG', pts: 40, color: '#aaaaff' },
      { name: 'CARDBOARD BOX', pts: 120, color: '#8b6b3a' },
      { name: 'FOLDING CHAIR', pts: 300, color: '#666666' },
      { name: 'TRAFFIC CONE', pts: 500, color: '#ff7733' },
      { name: '???', pts: 1000, color: '#ff00ff' }
    ];
    let currentItem = null;
    let cursor = { x: 400, y: 200 };
    let difficulty = 0;
    let time = 0;
    let messages = [];
    let thrownItems = [];
    let finished = false;
    let phase = 'party'; // party -> morning -> done

    function newItem() {
      const t = time;
      let pool;
      if (t < 20000) pool = items.slice(0, 6);
      else if (t < 35000) pool = items.slice(0, 9);
      else pool = items;
      currentItem = { ...pool[Math.floor(Math.random() * pool.length)] };
    }
    newItem();

    startMinigame({
      draw() {
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Creek
        ctx.fillStyle = '#2a4a6a';
        ctx.fillRect(590, 300, 210, 100);
        // Ground
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(0, 300, 590, 120);

        // Zones
        for (const z of zones) {
          ctx.strokeStyle = '#5adaff';
          ctx.lineWidth = 1;
          ctx.strokeRect(z.x, z.y, z.w, z.h);
          drawText(ctx, z.name + ' x' + z.mult, z.x + 4, z.y + 14, '#5adaff', 10);
        }

        // Thrown items (scattered)
        for (const t of thrownItems) {
          ctx.fillStyle = t.color;
          ctx.fillRect(t.x - 6, t.y - 6, 12, 12);
        }

        // Party people in background
        for (let i = 0; i < 5 + Math.floor(difficulty * 3); i++) {
          const px = 100 + i * 120 + Math.sin(time / 300 + i) * 10;
          ctx.fillStyle = ['#ff5555', '#55ff55', '#5555ff', '#ffff55', '#ff55ff'][i % 5];
          ctx.fillRect(px - 8, 260, 16, 30);
        }

        // Current item + cursor
        if (currentItem && phase === 'party') {
          ctx.fillStyle = currentItem.color;
          ctx.fillRect(cursor.x - 12, cursor.y - 8, 24, 16);
          drawText(ctx, currentItem.name + ' +' + currentItem.pts, cursor.x - 50, cursor.y - 20, '#fff', 11);
          // Crosshair
          ctx.strokeStyle = '#ffaa55';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cursor.x, cursor.y, 20, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Meter
        const pct = Math.min(100, difficulty);
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 20, 300, 20);
        ctx.fillStyle = pct > 80 ? '#ff5555' : pct > 50 ? '#ffaa55' : '#55aa55';
        ctx.fillRect(20, 20, 300 * pct / 100, 20);
        drawText(ctx, 'CLEANUP DIFFICULTY: ' + Math.floor(pct) + '%', 30, 35, '#fff', 13);

        const secs = (60 - time / 1000).toFixed(1);
        drawText(ctx, 'TIME: ' + secs, 650, 35, '#aaa', 16);

        // Messages
        for (let i = 0; i < messages.length; i++) {
          drawText(ctx, messages[i].text, 200, 90 + i * 25, messages[i].color, 16);
        }

        if (phase === 'morning') {
          ctx.fillStyle = '#4a5a4a';
          ctx.fillRect(0, 300, canvas.width, 120);
          drawText(ctx, 'VOLUNTEER: Where the heck did all these beer bottles come from?', 100, 370, '#fff', 14);
        }
      },
      onClick(mx, my) {
        if (finished || phase !== 'party' || !currentItem) return;
        // Find zone
        let hit = null;
        for (const z of zones) {
          if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) { hit = z; break; }
        }
        if (!hit) return;
        const pts = currentItem.pts * hit.mult;
        difficulty += pts / 80;
        thrownItems.push({ x: mx, y: my, color: currentItem.color });
        if (thrownItems.length > 40) thrownItems.shift();

        if (difficulty > 30 && messages.length < 1) messages.push({ text: 'THIS MAY HAVE GONE TOO FAR', color: '#ffaa55' });
        if (difficulty > 60 && messages.length < 2) messages.push({ text: 'TOMORROW IS GOING TO BE AWKWARD', color: '#ff8844' });
        if (difficulty > 85 && messages.length < 3) messages.push({ text: 'CLEANUP DIFFICULTY: CATASTROPHIC', color: '#ff5555' });

        newItem();
      },
      update() {
        if (finished) return;
        if (phase === 'party') {
          time += 16;
          // Auto-escalate difficulty slightly
          if (time > 20000) difficulty += 0.05;
          if (time > 35000) difficulty += 0.1;
          if (time >= 60000 || difficulty >= 100) {
            phase = 'morning';
            time = 0;
            messages = [];
            setTimeout(() => {
              finished = true;
              endMinigame();
            }, 3000);
          }
        } else if (phase === 'morning') {
          time += 16;
        }
      },
      onMouseMove(mx, my) {
        if (phase === 'party') { cursor.x = mx; cursor.y = my; }
      }
    });
  },

  weeniezucker: () => {
    // Phase 1: burn ship, Phase 2: survival, Phase 3: reveal, Phase 4: escape
    let phase = 'burn';
    let phaseTimer = 0;
    let will = { x: 400, y: 280, speed: 3.5, r: 16 };
    const keys = {};
    let sections = [
      { name: 'DECK', x: 300, y: 250, w: 200, h: 40, fire: 0 },
      { name: 'MAST', x: 380, y: 120, w: 40, h: 130, fire: 0 },
      { name: 'CABIN', x: 300, y: 200, w: 80, h: 50, fire: 0 },
      { name: 'SAILS', x: 440, y: 140, w: 60, h: 80, fire: 0 }
    ];
    let threat = 0;
    let problems = [];
    let nextProblem = 0;
    let blameText = '';
    let blameTimer = 0;
    let cameron = { x: 200, y: 280, r: 16 };
    let escapeSpeed = 0;
    let weenieDist = 300;
    let finished = false;
    let shake = 0;
    let threatLabels = ['SUSPICIOUS', 'CONCERNING', 'HE KNOWS', 'HE IS COMING'];

    function lightSection(s) {
      s.fire = Math.min(2, s.fire + 1);
    }

    function allBurning() {
      return sections.every(s => s.fire >= 2);
    }

    function spawnProblem() {
      const types = ['FIRE', 'HOLE', 'WATER', 'SKELETON', 'ROCK'];
      const type = types[Math.floor(Math.random() * types.length)];
      const x = 100 + Math.random() * 600;
      const y = 200 + Math.random() * 140;
      problems.push({ type, x, y, progress: 0, needed: type === 'HOLE' ? 60 : 5, r: 20 });
      // Blame
      const blames = {
        FIRE: 'WeenieZucker.',
        HOLE: 'Classic WeenieZucker.',
        WATER: 'He controls the water now.',
        SKELETON: 'He sent him.',
        ROCK: 'WeenieZucker.'
      };
      blameText = blames[type] || 'WeenieZucker.';
      blameTimer = 2000;
      threat = Math.min(100, threat + 12);
    }

    startMinigame({
      draw() {
        ctx.save();
        if (shake > 0) {
          ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          shake -= 0.5;
        }

        if (phase === 'burn') {
          // Ocean
          ctx.fillStyle = '#1a2a3a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#2a4a6a';
          ctx.fillRect(0, 300, canvas.width, 120);

          // Enemy ship
          ctx.fillStyle = '#5a3a2a';
          ctx.fillRect(280, 200, 240, 80);
          // WeenieZucker label
          drawText(ctx, 'WEENIEZUCKER', 320, 190, '#ff5555', 16);

          // Sections with fire
          for (const s of sections) {
            ctx.strokeStyle = s.fire > 0 ? '#ff5555' : '#888';
            ctx.lineWidth = 2;
            ctx.strokeRect(s.x, s.y, s.w, s.h);
            drawText(ctx, s.name, s.x + 4, s.y + 14, '#aaa', 10);
            if (s.fire === 1) {
              ctx.fillStyle = 'rgba(255,150,0,0.4)';
              ctx.fillRect(s.x, s.y, s.w, s.h);
              drawText(ctx, 'BURNING', s.x + 4, s.y + 28, '#ff8800', 10);
            } else if (s.fire === 2) {
              ctx.fillStyle = 'rgba(255,50,0,0.6)';
              ctx.fillRect(s.x, s.y, s.w, s.h);
              drawText(ctx, 'VERY BURNING', s.x + 4, s.y + 28, '#ff3300', 10);
            }
          }

          // Will
          ctx.fillStyle = '#5adaff';
          ctx.fillRect(will.x - will.r, will.y - will.r, will.r * 2, will.r * 2);
          drawText(ctx, 'WILL', will.x - 16, will.y - will.r - 6, '#5adaff', 10);

          drawText(ctx, 'OBJECTIVE: BURN WEENIEZUCKER\'S SHIP', 200, 40, '#ff5555', 18);
          drawText(ctx, 'ARROWS/WASD: MOVE  SPACE: IGNITE', 220, 65, '#888', 13);
        }

        else if (phase === 'survival') {
          ctx.fillStyle = '#1a2a3a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#3a5a3a';
          ctx.fillRect(100, 200, 600, 160); // our ship deck

          // Problems
          for (const p of problems) {
            const colors = { FIRE: '#ff5500', HOLE: '#444', WATER: '#3388ff', SKELETON: '#dddddd', ROCK: '#888' };
            ctx.fillStyle = colors[p.type] || '#fff';
            ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
            drawText(ctx, p.type, p.x - 18, p.y - p.r - 6, '#fff', 10);
            if (p.progress > 0) {
              ctx.fillStyle = '#333';
              ctx.fillRect(p.x - 20, p.y + p.r + 4, 40, 6);
              ctx.fillStyle = '#55ff55';
              ctx.fillRect(p.x - 20, p.y + p.r + 4, 40 * p.progress / p.needed, 6);
            }
          }

          // Will
          ctx.fillStyle = '#5adaff';
          ctx.fillRect(will.x - will.r, will.y - will.r, will.r * 2, will.r * 2);
          drawText(ctx, 'WILL', will.x - 16, will.y - will.r - 6, '#5adaff', 10);

          // Cameron
          ctx.fillStyle = '#ff9944';
          ctx.fillRect(cameron.x - cameron.r, cameron.y - cameron.r, cameron.r * 2, cameron.r * 2);
          drawText(ctx, 'CAM', cameron.x - 14, cameron.y - cameron.r - 6, '#ff9944', 10);

          // Threat meter
          const tIdx = Math.min(3, Math.floor(threat / 25));
          ctx.fillStyle = '#333';
          ctx.fillRect(20, 20, 250, 18);
          ctx.fillStyle = threat > 75 ? '#ff5555' : threat > 50 ? '#ffaa55' : '#55aa55';
          ctx.fillRect(20, 20, 250 * threat / 100, 18);
          drawText(ctx, 'WEENIEZUCKER THREAT: ' + threatLabels[tIdx], 30, 35, '#fff', 12);

          const secs = (60 - phaseTimer / 1000).toFixed(1);
          drawText(ctx, 'TIME: ' + secs, 650, 35, '#aaa', 16);

          // Blame text
          if (blameTimer > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(200, 80, 400, 40);
            drawText(ctx, blameText, 230, 105, '#ff9944', 16);
          }

          drawText(ctx, 'SPACE: REPAIR/ATTACK', 280, 420, '#888', 13);
        }

        else if (phase === 'reveal') {
          ctx.fillStyle = '#0a0a15';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#1a2a3a';
          ctx.fillRect(0, 250, canvas.width, 170);
          // Our ship
          ctx.fillStyle = '#3a5a3a';
          ctx.fillRect(100, 270, 200, 60);
          // Distant ship
          ctx.fillStyle = '#5a3a2a';
          ctx.fillRect(600, 280, 80, 40);
          drawText(ctx, 'WeenieZucker', 600, 275, '#ff5555', 14);

          drawText(ctx, 'OBJECTIVE: RUN.', 300, 100, '#ff5555', 28);
          if (phaseTimer > 1500) {
            drawText(ctx, 'MASH SPACE / RIGHT!', 280, 160, '#ffaa55', 18);
          }
        }

        else if (phase === 'escape') {
          ctx.fillStyle = '#1a2a3a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#2a4a6a';
          ctx.fillRect(0, 300, canvas.width, 120);

          // Our ship
          const ourX = 150 + escapeSpeed * 3;
          ctx.fillStyle = '#3a5a3a';
          ctx.fillRect(ourX, 270, 120, 50);
          drawText(ctx, 'WILL + CAM', ourX + 10, 265, '#5adaff', 12);

          // WeenieZucker ship gaining
          const wx = ourX - weenieDist;
          ctx.fillStyle = '#5a3a2a';
          ctx.fillRect(wx, 280, 80, 40);
          drawText(ctx, 'WeenieZucker', wx, 275, '#ff5555', 12);

          drawText(ctx, 'ESCAPE: ' + Math.floor(escapeSpeed) + '%', 300, 50, '#5adaff', 20);
        }

        ctx.restore();
      },
      onKeyDown(e) {
        if (finished) return;
        keys[e.code] = true;
        if (phase === 'burn') {
          if (e.code === 'Space') {
            for (const s of sections) {
              if (will.x >= s.x - 20 && will.x <= s.x + s.w + 20 &&
                  will.y >= s.y - 20 && will.y <= s.y + s.h + 20) {
                lightSection(s);
              }
            }
            if (allBurning()) {
              phase = 'survival';
              phaseTimer = 0;
              will.x = 400; will.y = 280;
              shake = 8;
            }
          }
        } else if (phase === 'survival') {
          if (e.code === 'Space') {
            for (let i = problems.length - 1; i >= 0; i--) {
              const p = problems[i];
              const dx = will.x - p.x, dy = will.y - p.y;
              if (Math.sqrt(dx * dx + dy * dy) < p.r + will.r + 10) {
                p.progress++;
                if (p.progress >= p.needed) problems.splice(i, 1);
                break;
              }
            }
          }
        } else if (phase === 'reveal' || phase === 'escape') {
          if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (phase === 'reveal' && phaseTimer > 1500) {
              phase = 'escape';
              phaseTimer = 0;
              escapeSpeed = 0;
              weenieDist = 300;
            } else if (phase === 'escape') {
              escapeSpeed += 3;
            }
          }
        }
      },
      onKeyUp(e) { keys[e.code] = false; },
      update() {
        if (finished) return;
        phaseTimer += 16;

        if (phase === 'burn') {
          if (keys['ArrowLeft'] || keys['KeyA']) will.x -= will.speed;
          if (keys['ArrowRight'] || keys['KeyD']) will.x += will.speed;
          if (keys['ArrowUp'] || keys['KeyW']) will.y -= will.speed;
          if (keys['ArrowDown'] || keys['KeyS']) will.y += will.speed;
          will.x = Math.max(260, Math.min(540, will.x));
          will.y = Math.max(100, Math.min(290, will.y));
        }

        else if (phase === 'survival') {
          if (keys['ArrowLeft'] || keys['KeyA']) will.x -= will.speed;
          if (keys['ArrowRight'] || keys['KeyD']) will.x += will.speed;
          if (keys['ArrowUp'] || keys['KeyW']) will.y -= will.speed;
          if (keys['ArrowDown'] || keys['KeyS']) will.y += will.speed;
          will.x = Math.max(100, Math.min(680, will.x));
          will.y = Math.max(200, Math.min(360, will.y));

          if (blameTimer > 0) blameTimer -= 16;

          // Spawn problems
          nextProblem -= 16;
          if (nextProblem <= 0 && phaseTimer < 50000) {
            spawnProblem();
            nextProblem = Math.max(2000, 6000 - phaseTimer / 12);
          }

          // Reveal at 55s
          if (phaseTimer >= 55000) {
            phase = 'reveal';
            phaseTimer = 0;
            problems = [];
            shake = 10;
          }
        }

        else if (phase === 'reveal') {
          if (phaseTimer > 3000) {
            // Auto-start escape if player doesn't press
          }
        }

        else if (phase === 'escape') {
          weenieDist -= 0.5; // slowly gains
          escapeSpeed = Math.max(0, escapeSpeed - 0.12); // decay
          escapeSpeed += 0.3; // auto-progress so it's never too hard
          if (escapeSpeed >= 100 || phaseTimer > 12000) {
            finished = true;
            endMinigame();
          }
          if (weenieDist < 50) weenieDist = 50; // never catches
        }
      }
    });
  }
};

const scenes = [
  {
    id: 'house_intro',
    lines: [
      { speaker: 'WIFE', text: 'So, birthday boy. Any requests for tonight?' },
      { speaker: 'WILL', text: 'Just something loki or thor, how about an apple crisp!', emotion: 'default' },
      { speaker: 'WIFE', text: 'One apple crisp, coming right up.' },
      { speaker: 'ARCHIVE', text: '(A phone buzzes.)' },
      { speaker: 'WILL', text: 'Oh, there is Josh right now. Probably wishing me a happy birthday.', emotion: 'thinking' },
      { speaker: 'ARCHIVE', text: 'TEXT MESSAGE — FROM: JOSHUA YEE' },
      { speaker: 'JOSHUA', text: 'Mo says congrats on your 1 year wedding anniversary!' },
      { speaker: 'WILL', text: 'Oh. I guess he forgot.', emotion: 'shocked' },
      { speaker: 'ARCHIVE', text: '.......' },
      { speaker: 'WIFE', text: 'Did you hear that Will?' },
      { speaker: 'WILL', text: 'Yeah ... weird.', emotion: 'shocked' },
      { speaker: 'ARCHIVE', text: 'ANOMALY DETECTED IN SUBJECT TIMELINE.' },
      { speaker: 'WILL', text: "That doesn't sound good...", emotion: 'shocked' },
      { speaker: 'ARCHIVE', text: 'INITIATING EMERGENCY MEMORY DIAGNOSTIC.', action: 'glitch_cutscene' }
    ]
  },
  {
    id: 'archive_wake',
    lines: [
      { speaker: 'ARCHIVE', text: 'Every life leaves behind a story.' },
      { speaker: 'ARCHIVE', text: 'Some stories inspire us.' },
      { speaker: 'ARCHIVE', text: 'Some change the world.' },
      { speaker: 'ARCHIVE', text: 'This is not one of those stories.' },
      { speaker: 'ARCHIVE', text: 'SUBJECT IDENTIFIED. WILLARD HENRY CROSBY (IV). BEGINNING BIOGRAPHICAL INTEGRITY SCAN.' },
      { speaker: 'ARCHIVE', text: 'SEVERE MEMORY CORRUPTION DETECTED.' },
      { speaker: 'ARCHIVE', text: 'CHILDHOOD ARCHIVE: CORRUPTED. COLLEGE ARCHIVE: CORRUPTED. ADULTHOOD ARCHIVE: MOSTLY FUNCTIONAL. DIGNITY: UNRECOVERABLE.' },
      { speaker: 'WILL', text: 'That seems unnecessary.' },
      { speaker: 'WILL', text: 'Wait... where am I?', emotion: 'shocked' },
      { speaker: 'ARCHIVE', text: 'You are surrounded by photographs. Every one is blurred beyond recognition.' },
      { speaker: 'ARCHIVE', text: 'Beneath each photo hangs a cassette tape. ACCESS DENIED. Memories must be restored, organized by witness.' },
      { speaker: 'ARCHIVE', text: 'WALK TO A CASSETTE AND PRESS SPACE TO BEGIN PLAYBACK.', action: 'archive_hub' }
    ]
  },
  {
    id: 'prologue',
    lines: [
      { speaker: 'NARRATOR', text: 'ARCHIVE I — CHILDHOOD. Before the husband... Before the roommate... Before the man... There was a legend.' },
      { speaker: 'SISTER', text: 'Oh no.' },
      { speaker: 'WILL', text: 'What?' },
      { speaker: 'SISTER', text: 'Dziadzi hair.' },
      { speaker: 'WILL', text: 'Dziadzi hair.' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: COLLECT 10 STRANDS OF DZIADZI HAIR.', action: 'dziadzi' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! DZIADZI HAIR — Scientific classification: Steam. Actual classification: Grandpa hair.' },
      { speaker: 'SISTER', text: 'We were very intelligent children.' },
      { speaker: 'WILL', text: 'Speak for yourself.' },
      { speaker: 'SISTER', text: 'I am.' }
    ],
    onEnd: () => { memoryDone.prologue = true; runAction('archive_hub'); }
  },

  {
    id: 'cardboard',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 2 — THE GREAT CARDBOARD RESERVE.' },
      { speaker: 'WILL', text: 'I had plans. Resources.' },
      { speaker: 'SISTER', text: 'You kept empty toilet paper rolls in your bedroom.' },
      { speaker: 'WILL', text: 'For my plans...' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: COLLECT 3 OF EACH CARDBOARD RESOURCE AND RETURN TO YOUR ROOM.', action: 'cardboard' },
      { speaker: 'ARCHIVE', text: 'ARTIFACT DISCOVERED. ANCIENT CARDBOARD TUBE — Purpose unknown. Potential significance: enormous.' },
      { speaker: 'SISTER', text: 'Please throw it away.' },
      { speaker: 'WILL', text: 'Absolutely not.' }
    ],
    onEnd: () => { memoryDone.cardboard = true; runAction('archive_hub'); }
  },
  {
    id: 'blind_harvest',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 3 — BLIND HARVEST.' },
      { speaker: 'ARCHIVE', text: 'ACTIVITY IDENTIFIED: BLIND HARVEST.' },
      { speaker: 'SISTER', text: 'Close your eyes.' },
      { speaker: 'WILL', text: 'Ohhhhh.' },
      { speaker: 'ARCHIVE', text: 'Listen. Find the Frisbee without looking.', action: 'blind_harvest' },
      { speaker: 'WILL', text: 'That was absolutely something.' },
      { speaker: 'SISTER', text: 'Nothing.' }
    ],
    onEnd: () => { memoryDone.blind_harvest = true; runAction('archive_hub'); }
  },
  {
    id: 'dinosaur',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 4 — THE DINOSAUR. BUFFALO SCIENCE MUSEUM.' },
      { speaker: 'SISTER', text: 'It is a picture.' },
      { speaker: 'WILL', text: 'IT KNOWS I AM HERE.' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: SURVIVE THE HALLWAY.', action: 'dinosaur' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! THE DINOSAUR — Threat level: None. Actual mobility: None. Psychological damage: Significant.' },
      { speaker: 'WILL', text: 'Where did it go?' },
      { speaker: 'SISTER', text: "...Let's keep moving." }
    ],
    onEnd: () => { memoryDone.dinosaur = true; runAction('archive_hub'); }
  },
  {
    id: 'bicycle',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 5 — THE BICYCLE INCIDENT.' },
      { speaker: 'ARCHIVE', text: 'VEHICLE TUTORIAL: ARROW KEYS — STEER. SPACE — BELL. SHIFT — PEDAL FASTER.' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: STOP THE BICYCLE.', action: 'bicycle' },
      { speaker: 'SISTER', text: 'Did you just drive directly into a parked car?' },
      { speaker: 'WILL', text: 'I forgot how to stop.' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! THE BICYCLE INCIDENT — Property damage: One license plate frame. Emotional damage: Considerable.' }
    ],
    onEnd: () => { memoryDone.bicycle = true; runAction('archive_hub'); }
  },
  {
    id: 'intermission',
    lines: [
      { speaker: 'WILL', text: 'Why are YOU here?' },
      { speaker: 'SISTER', text: 'Someone has to make sure history is recorded correctly. Immensely.' },
      { speaker: 'NARRATOR', text: 'ROOM II — JOSHUA. Will survived childhood.' },
      { speaker: 'JOSHUA', text: '*gasp* WIIIIIILL!' },
      { speaker: 'WILL', text: 'JOOOOOOOOOOOSH.' },
      { speaker: 'JOSHUA', text: 'Here to fix your broken memories eh.' },
      { speaker: 'WILL', text: "Yeah! How'd you know?" },
      { speaker: 'JOSHUA', text: 'uhhh cause I am here for the same thing!' },
      { speaker: 'WILL', text: "Awesome!" }
    ],
    onEnd: () => { memoryDone.intermission = true; runAction('archive_hub'); }
  },
  {
    id: 'light_war',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 6 — THE GREAT LIGHT WAR.' },
      { speaker: 'JOSHUA', text: "Here I'll turn the light on" },
      { speaker: 'WILL', text: 'Well maybe I want the light off now!' },
      { speaker: 'ARCHIVE', text: 'THE GREAT LIGHT WAR. JOSHUA: keep the light ON. WILL: keep it OFF.', action: 'light_war' },
      { speaker: 'ARCHIVE', text: 'RESULT: NOBODY WON. Conflict duration: Unreasonable. Cause: Unknown. Strategic importance: None.' },
      { speaker: 'JOSHUA', text: 'Worth it.' },
      { speaker: 'WILL', text: 'Completely.' }
    ],
    onEnd: () => { memoryDone.light_war = true; runAction('archive_hub'); }
  },
  {
    id: 'polar_vortex',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 7 — THE POLAR VORTEX. CHICAGO. EXTREMELY COLD.' },
      { speaker: 'JOSHUA', text: 'Dang -20 outside, and I forgot to send a cancellation for Sojourners... Wanna run over to the campus center?' },
      { speaker: 'WILL', text: "Yeah, let's do it!" },
      { speaker: 'JOSHUA', text: 'Oooh, we should shower before we go!' },
      { speaker: 'WILL', text: "Yeah, good idea!" },
      { speaker: 'ARCHIVE', text: "OBJECTIVE: FREEZE YOUR HAIR, DON'T GET HYPOTHERMIA", action: 'polar_vortex' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! THE POLAR VORTEX — Outside temperature: Dangerous. Decision-making temperature: Lower.' }
    ],
    onEnd: () => { memoryDone.polar_vortex = true; runAction('archive_hub'); }
  },
  {
    id: 'salt_tea',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 8 — THE SALT TEA TRIALS.' },
      { speaker: 'WILL', text: 'Wait, this tea tastes kind of like apple juice', emotion: 'shocked'},
      { speaker: 'JOSHUA', text: 'Did you get apple juice?.' },
      { speaker: 'WILL', text: "No I definitely got tea, hold on I'll get another one", emotion: 'confused' },
      { speaker: 'JOSHUA', text: 'Pick one.' },
      { speaker: 'ARCHIVE', text: 'CHOOSE.', action: 'salt_tea' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! SALT TEA — A sophisticated experiment investigating probability, trust, and sodium.' }
    ],
    onEnd: () => { memoryDone.salt_tea = true; runAction('archive_hub'); }
  },
  {
    id: 'cardboard_knights',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 9 — CARDBOARD KNIGHTS.' },
      { speaker: 'JOSHUA', text: 'Halloween.' },
      { speaker: 'WILL', text: 'I have been preparing for this my entire life.' },
      { speaker: 'ARCHIVE', text: 'PROPHECY FULFILLED. THE CARDBOARD KNIGHTS.', action: 'cardboard_knights' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! CARDBOARD KNIGHTS — Childhood hoarding officially reclassified as: PREPARATION.' }
    ],
    onEnd: () => { memoryDone.cardboard_knights = true; runAction('archive_hub'); }
  },

  {
    id: 'act3_intro',
    lines: [
      { speaker: 'NARRATOR', text: 'ROOM IV — SARAH. The mistakes got bigger. The excuses got better.' },
      { speaker: 'WIFE', text: 'There are bags in the hallway.' },
      { speaker: 'WILL', text: 'They are not suspicious.' },
      { speaker: 'ARCHIVE', text: 'THE ADULT YEARS ARE UNSTABLE. PROCEED WITH CAUTION.' }
    ],
    onEnd: () => { runAction('archive_hub'); }
  },

  {
    id: 'dirt_pile',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 10 — THE DIRT PILE.' },
      { speaker: 'WIFE', text: 'Just one more place, Will.' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: MOVE THE DIRT TO THE NEXT PLACE.', action: 'dirt_pile' },
      { speaker: 'ARCHIVE', text: 'DIRT REMAINING: 69%. RESULT: GEOLOGICALLY INSIGNIFICANT.' },
      { speaker: 'WIFE', text: 'Why is there still dirt?' },
      { speaker: 'WILL', text: 'That is the question, yes.' }
    ],
    onEnd: () => { memoryDone.dirt_pile = true; runAction('archive_hub'); }
  },

  {
    id: 'trash_bags',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 11 — DISTRIBUTE THE EVIDENCE.' },
      { speaker: 'WILL', text: 'These are regular yard bags.' },
      { speaker: 'ARCHIVE', text: 'BALANCE THE EVIDENCE ACROSS FIVE CANS.', action: 'trash_bags' },
      { speaker: 'ARCHIVE', text: 'EVIDENCE DISTRIBUTED. LEGALITY: UNVERIFIABLE.' },
      { speaker: 'WIFE', text: 'It was legal yard work.' },
      { speaker: 'WILL', text: 'See? She said it.' }
    ],
    onEnd: () => { memoryDone.trash_bags = true; runAction('archive_hub'); }
  },

  {
    id: 'pierogi',
    lines: [
      { speaker: 'NARRATOR', text: 'BONUS MEMORY — BABCI APPROVES?' },
      { speaker: 'ARCHIVE', text: 'BABCI IS WATCHING. PINCH WISELY.', action: 'pierogi' },
      { speaker: 'ARCHIVE', text: 'RESULT: ...FINE.' },
      { speaker: 'WILL', text: 'I will take it.' }
    ],
    onEnd: () => { memoryDone.pierogi = true; runAction('archive_hub'); }
  },

  {
    id: 'snapchat',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 12 — KEEP THE LIE ALIVE.' },
      { speaker: 'WIFE', text: 'Will, you saw the picture, right?' },
      { speaker: 'ARCHIVE', text: 'MAINTAIN THE ILLUSION.', action: 'snapchat' },
      { speaker: 'ARCHIVE', text: 'THE LIE LIVES. FOR NOW.' }
    ],
    onEnd: () => { memoryDone.snapchat = true; runAction('archive_hub'); }
  },

  {
    id: 'road_trip',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 13 — JUST GET HOME.' },
      { speaker: 'JOSHUA', text: 'Are those clowns?' },
      { speaker: 'WILL', text: 'Do not look at them.' },
      { speaker: 'ARCHIVE', text: 'DRIVE. DO NOT ASK QUESTIONS.', action: 'road_trip' },
      { speaker: 'ARCHIVE', text: 'EVENT CLASSIFICATION: UNKNOWN.' }
    ],
    onEnd: () => { memoryDone.road_trip = true; runAction('archive_hub'); }
  },

  {
    id: 'bread_toss',
    lines: [
      { speaker: 'NARRATOR', text: 'MEMORY 14 — THUNK.' },
      { speaker: 'WILL', text: 'It is not frozen if I throw it hard enough.' },
      { speaker: 'ARCHIVE', text: 'THROW THE BREAD. HIT THE TARGET.', action: 'bread_toss' },
      { speaker: 'ARCHIVE', text: 'RESULT: THUNK. MARRIAGE STRESS: ELEVATED.' },
      { speaker: 'WIFE', text: 'WILLIARD.' },
      { speaker: 'WILL', text: 'I can still hear it.' }
    ],
    onEnd: () => { memoryDone.bread_toss = true; runAction('archive_hub'); }
  },

  // ============ THE CAMERON FILES ============

  {
    id: 'cameron_intro',
    lines: [
      { speaker: 'ARCHIVE', text: 'ADDITIONAL WITNESS IDENTIFIED.' },
      { speaker: 'CAMERON', text: 'Why am I here?' },
      { speaker: 'ARCHIVE', text: 'You appear in several incidents.' },
      { speaker: 'CAMERON', text: 'Incidents?' },
      { speaker: 'ARCHIVE', text: 'INCIDENT 1: FRENCH CREEK. INCIDENT 2: A BURNING PIRATE SHIP. INCIDENT 3: PRISON GUARDS.' },
      { speaker: 'CAMERON', text: 'Oh.' },
      { speaker: 'ARCHIVE', text: 'ROOM III: CAMERON. THREE MEMORIES. BEGIN.', action: 'archive_hub' }
    ]
  },

  {
    id: 'dig',
    lines: [
      { speaker: 'NARRATOR', text: 'CAMERON FILE 1 — DIG.' },
      { speaker: 'CAMERON', text: 'We are in a prison yard. Act natural.' },
      { speaker: 'WILL', text: 'I have emotes.' },
      { speaker: 'CAMERON', text: 'Do not use them.' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: ACT NATURAL. CONTROLS: 1-WAVE 2-SIT 3-LAUGH 4-???', action: 'dig' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! DIG — Escaping prison requires patience, planning, and discretion. Will pressed the emote button.' },
      { speaker: 'CAMERON', text: 'Why did you say dig?' },
      { speaker: 'WILL', text: 'It was next to wave.' }
    ],
    onEnd: () => { memoryDone.dig = true; runAction('archive_hub'); }
  },

  {
    id: 'french_creek',
    lines: [
      { speaker: 'NARRATOR', text: 'CAMERON FILE 2 — FRENCH CREEK: THE CLEANUP PREQUEL.' },
      { speaker: 'CAMERON', text: 'French Creek cleanup is tomorrow.' },
      { speaker: 'WILL', text: 'Yeah.' },
      { speaker: 'CAMERON', text: 'What if we threw a huge party there tonight?' },
      { speaker: 'ARCHIVE', text: 'THE NIGHT BEFORE. OBJECTIVE: MAKE TOMORROW\'S CLEANUP AS CONFUSING AS POSSIBLE.', action: 'french_creek' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! FRENCH CREEK — The incident that never happened.' },
      { speaker: 'CAMERON', text: 'That would be terrible.' },
      { speaker: 'WILL', text: 'Yeah.' }
    ],
    onEnd: () => { memoryDone.french_creek = true; runAction('archive_hub'); }
  },

  {
    id: 'weeniezucker',
    lines: [
      { speaker: 'NARRATOR', text: 'CAMERON FILE 3 — THE CURSE OF WEENIEZUCKER.' },
      { speaker: 'CAMERON', text: 'Nobody\'s there.' },
      { speaker: 'WILL', text: 'Should we burn it?' },
      { speaker: 'CAMERON', text: 'Yes.' },
      { speaker: 'ARCHIVE', text: 'OBJECTIVE: BURN WEENIEZUCKER\'S SHIP. THEN SURVIVE THE CURSE.', action: 'weeniezucker' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORED! THE CURSE OF WEENIEZUCKER — Every misfortune has an explanation. His name is WeenieZucker.' },
      { speaker: 'CAMERON', text: 'He was real.' },
      { speaker: 'WILL', text: 'He was real.' }
    ],
    onEnd: () => { memoryDone.weeniezucker = true; runAction('archive_hub'); }
  },

  {
    id: 'cameron_complete',
    lines: [
      { speaker: 'ARCHIVE', text: 'CAMERON FILES COMPLETE.' },
      { speaker: 'CAMERON', text: 'That\'s everything?' },
      { speaker: 'ARCHIVE', text: 'NEGATIVE.' },
      { speaker: 'CAMERON', text: 'What?' },
      { speaker: 'ARCHIVE', text: '(Something breaks in the distance.)' },
      { speaker: 'ARCHIVE', text: '...WeenieZucker.' },
      { speaker: 'CAMERON', text: 'Oh come on.' },
      { speaker: 'ARCHIVE', text: 'RETURNING TO MAIN ARCHIVE.', action: 'archive_hub' }
    ]
  },

  {
    id: 'archive_collapse',
    lines: [
      { speaker: 'ARCHIVE', text: 'WARNING. MEMORY BOUNDARIES FAILING.' },
      { speaker: 'JOSHUA', text: 'Is that normal?' },
      { speaker: 'WILL', text: 'I dunno.' },
      { speaker: 'SISTER', text: 'I think we fixed it.' },
      { speaker: 'WIFE', text: 'I have several questions.' },
      { speaker: 'CAMERON', text: 'Just go with it.' },
      { speaker: 'ARCHIVE', text: 'MEMORY RESTORATION COMPLETE. COMPILING SUBJECT HISTORY.' },
      { speaker: 'ARCHIVE', text: 'CHILDHOOD DIGNITY: LOW. DECISION MAKING: QUESTIONABLE. CARDBOARD MANAGEMENT: EXCEPTIONAL. BICYCLE OPERATION: IMPROVED. DINOSAUR TOLERANCE: ACCEPTABLE. FRIENDSHIPS: EXCEPTIONAL. FAMILY: EXCEPTIONAL. LIFE CREATED: PRETTY AMAZING.' },
      { speaker: 'ARCHIVE', text: 'ALL WITNESSES PRESENT. BEGIN FINAL TRANSMISSION.' }
    ]
  },
  {
    id: 'birthday',
    lines: [
      { speaker: 'SISTER', text: 'Happy Birthday Will!' },
      { speaker: 'JOSHUA', text: "Will, had such a great time in college and beyond. Happiest of birthdays to you! Also Mo didn't actually wish you a happy anniversary, I just thought that'd be funny!" },
      { speaker: 'CAMERON', text: 'Happy birthday, Will!' },
      { speaker: 'WIFE', text: 'Happy birthday Will!' },
      { speaker: 'ARCHIVE', text: 'SUBJECT WILLARD HENRY CROSBY (IV). MEMORY INTEGRITY: RESTORED. EMOTIONAL STATE: OVERWHELMED. DIGNITY: STILL UNRECOVERABLE.' },
      { speaker: 'ARCHIVE', text: 'HAPPY BIRTHDAY, WILL.' },
      { speaker: 'ARCHIVE', text: 'LOADING SPECIAL BIRTHDAY MESSAGE FOR WILLARD....' }
    ],
    onEnd: () => { runAction('insert_tape'); }
  },
  {
    id: 'insert_tape',
    lines: [
      { speaker: 'ARCHIVE', text: 'INSERT SPECIAL TAPE TO CONTINUE.', action: 'insert_tape' }
    ]
  },

  {
    id: 'credits',
    lines: [
      { speaker: 'NARRATOR', text: 'CREDITS — WILL: The Subject. MADI: Keeper of the Childhood Lore. JOSHUA: Roommate / Co-Conspirator. SARAH: WILL\'s COMPANION & BEST FRIEND. CAMERON: ROOMMATE / Witness. THE DINOSAUR: Still Just a Decal. DZIADZI HAIR: Special Effects I couldn\'t quite figure out. NEIGHBOR\'S LICENSE PLATE FRAME: In Memoriam. WEENIEZUCKER: Still Out There. SECRETS & LIES: Renewal Pending.' },
      { speaker: 'NARRATOR', text: 'POST-CREDITS — The hoard will return.' }
    ]
  }
];
