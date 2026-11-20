// Cimacu – Schritt 2: Rohstoffe, Werkzeuge, Inventar, Herstellen, XP & Erfolge
(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.53, 0.75, 0.95, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.62, 0.8, 0.95);

  // =====================================================================
  // Spieldaten
  // =====================================================================
  const ITEMS = {
    wood: ['Holz', '🪵'], stone: ['Stein', '🪨'], dirt: ['Erde', '🟫'], water: ['Wasser', '💧'],
    iron: ['Eisen', '🔩'], gold: ['Gold', '🪙'], crystal: ['Kristall', '💎']
  };
  const TOOLS = { axe: '🪓', pick: '⛏️', shovel: '🪏', bucket: '🪣' };
  const TOOL_ORDER = ['axe', 'pick', 'shovel', 'bucket'];
  const TOOL_NAMES = {
    axe: ['Stein-Axt', 'Eisen-Axt', 'Gold-Axt'],
    pick: ['Stein-Spitzhacke', 'Eisen-Spitzhacke', 'Kristall-Spitzhacke'],
    shovel: ['Holzschaufel', 'Eisenschaufel', 'Goldschaufel'],
    bucket: ['Holzeimer', 'Großer Eimer', 'Goldeimer']
  };
  const TIER_DOT = ['#9a9a9a', '#cfd8e6', '#ffc533'];
  const KINDS = {
    tree:    { name: 'Baum',     tool: 'axe',    hp: 3, xp: 5,  drops: { wood: 3 },            verb: 'Fällen',   color: '#8a5a2b' },
    rock:    { name: 'Stein',    tool: 'pick',   hp: 3, xp: 5,  drops: { stone: 2 },           verb: 'Abbauen',  color: '#8c8c96' },
    iron:    { name: 'Eisenerz', tool: 'pick',   hp: 4, xp: 12, drops: { iron: 2, stone: 1 },  verb: 'Abbauen',  color: '#c0652a' },
    gold:    { name: 'Goldader', tool: 'pick',   hp: 5, xp: 25, drops: { gold: 2 }, tier: 2,   verb: 'Abbauen',  color: '#ffcc33' },
    crystal: { name: 'Kristall', tool: 'pick',   hp: 6, xp: 40, drops: { crystal: 1 }, tier: 2, verb: 'Abbauen', color: '#5ff2ff' },
    water:   { name: 'Teich',    tool: 'bucket', hp: 1, xp: 1,  drops: { water: 1 },           verb: 'Schöpfen', color: '#3d8fe0' },
    earth:   { name: 'Boden',    tool: 'shovel', hp: 1, xp: 1,  drops: { dirt: 1 },            verb: 'Graben',   color: '#6b4423' }
  };
  const RECIPES = [
    { tool: 'axe', tier: 2, cost: { wood: 5, iron: 4 }, desc: 'Fällt Bäume doppelt so schnell' },
    { tool: 'pick', tier: 2, cost: { wood: 5, iron: 6 }, desc: 'Kann Gold und Kristall abbauen' },
    { tool: 'shovel', tier: 2, cost: { wood: 3, iron: 3 }, desc: '2 Erde pro Stich' },
    { tool: 'bucket', tier: 2, cost: { wood: 4, iron: 4 }, desc: '2 Wasser pro Schöpfen' },
    { tool: 'axe', tier: 3, cost: { wood: 15, gold: 5, crystal: 1 }, desc: 'Fällt Bäume dreimal so schnell' },
    { tool: 'pick', tier: 3, cost: { iron: 10, gold: 6, crystal: 3 }, desc: 'Dreifache Abbau-Kraft' },
    { tool: 'shovel', tier: 3, cost: { wood: 5, gold: 4 }, desc: '3 Erde pro Stich' },
    { tool: 'bucket', tier: 3, cost: { wood: 5, gold: 4 }, desc: '3 Wasser pro Schöpfen' }
  ];
  const ACH = [
    { id: 'tree1', e: '🌲', name: 'Holzfäller', desc: 'Fälle deinen ersten Baum', test: s => (s.stats.k_tree || 0) >= 1 },
    { id: 'wood50', e: '🪵', name: 'Holzlager', desc: 'Sammle insgesamt 50 Holz', test: s => (s.stats.wood || 0) >= 50 },
    { id: 'iron1', e: '⛏️', name: 'Bergmann', desc: 'Baue Eisenerz ab', test: s => (s.stats.iron || 0) >= 1 },
    { id: 'craft1', e: '🔨', name: 'Schmied', desc: 'Stelle dein erstes Werkzeug her', test: s => (s.stats.craft || 0) >= 1 },
    { id: 'gold1', e: '🪙', name: 'Goldrausch', desc: 'Finde Gold', test: s => (s.stats.gold || 0) >= 1 },
    { id: 'crystal1', e: '💎', name: 'Kristallfund', desc: 'Baue einen Kristall ab', test: s => (s.stats.crystal || 0) >= 1 },
    { id: 'water10', e: '💧', name: 'Wasserträger', desc: 'Schöpfe 10 Wasser', test: s => (s.stats.water || 0) >= 10 },
    { id: 'dirt25', e: '🟫', name: 'Maulwurf', desc: 'Grabe 25 Erde', test: s => (s.stats.dirt || 0) >= 25 },
    { id: 'lvl5', e: '⭐', name: 'Abenteurer', desc: 'Erreiche Level 5', test: s => s.level >= 5 },
    { id: 'master', e: '👑', name: 'Meister', desc: 'Alle Werkzeuge auf Stufe 3', test: s => TOOL_ORDER.every(t => s.tools[t] >= 3) }
  ];
  const xpNeed = l => Math.round(40 * Math.pow(l, 1.5));

  // Spielstand (wird im Handy gespeichert)
  const SAVE_KEY = 'cimacu-save-v1';
  let S = { inv: {}, tools: { axe: 1, pick: 1, shovel: 1, bucket: 1 }, eq: 'axe', xp: 0, level: 1, ach: {}, stats: {} };
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d) S = Object.assign(S, d); } catch (e) { }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } };

  // =====================================================================
  // Licht & Materialien
  // =====================================================================
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.65;
  hemi.groundColor = new BABYLON.Color3(0.35, 0.3, 0.45);
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.35), scene);
  sun.position = new BABYLON.Vector3(30, 60, 25);
  sun.intensity = 1.1;
  const shadows = new BABYLON.ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;

  const mat = (name, r, g, b, emissive) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = new BABYLON.Color3(r, g, b);
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    if (emissive) m.emissiveColor = new BABYLON.Color3(r * emissive, g * emissive, b * emissive);
    return m;
  };
  const hexMats = {};
  const matHex = hex => hexMats[hex] || (hexMats[hex] = (() => { const c = BABYLON.Color3.FromHexString(hex); return mat('h' + hex, c.r, c.g, c.b, 0.25); })());

  // =====================================================================
  // Welt: Boden, Teiche, Wasser
  // =====================================================================
  const WORLD = 90;
  const PONDS = [{ x: 18, z: -16, r: 5 }, { x: -30, z: 26, r: 6 }, { x: 46, z: 38, r: 4.5 }, { x: -48, z: -36, r: 5.5 }, { x: 8, z: 55, r: 5 }];
  const baseHeight = (x, z) => {
    const d = Math.sqrt(x * x + z * z);
    const flat = Math.min(1, Math.max(0, (d - 8) / 15));
    return (Math.sin(x * 0.09) * Math.cos(z * 0.11) * 2.2 + Math.sin((x + z) * 0.05) * 1.5) * flat;
  };
  PONDS.forEach(p => { p.level = baseHeight(p.x, p.z); });
  const heightAt = (x, z) => {
    let h = baseHeight(x, z);
    for (const p of PONDS) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r + 4) {
        const blend = Math.min(1, (p.r + 4 - d) / 4);
        const dip = d < p.r ? -0.9 * (1 - (d / p.r) ** 2) : 0;
        h = h * (1 - blend) + (p.level + dip) * blend;
      }
    }
    return h;
  };
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 200, height: 200, subdivisions: 90, updatable: true }, scene);
  const pos = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  for (let i = 0; i < pos.length; i += 3) pos[i + 1] = heightAt(pos[i], pos[i + 2]);
  ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
  const normals = [];
  BABYLON.VertexData.ComputeNormals(pos, ground.getIndices(), normals);
  ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
  ground.convertToFlatShadedMesh();
  ground.material = mat('grass', 0.42, 0.68, 0.3);
  ground.receiveShadows = true;

  const sea = BABYLON.MeshBuilder.CreateGround('sea', { width: 600, height: 600 }, scene);
  sea.position.y = -4.5;
  sea.material = mat('sea', 0.25, 0.55, 0.85);
  const pondMat = mat('pond', 0.25, 0.6, 0.95, 0.15);
  pondMat.alpha = 0.85;
  PONDS.forEach((p, i) => {
    const w = BABYLON.MeshBuilder.CreateDisc('pond' + i, { radius: p.r + 0.3, tessellation: 18 }, scene);
    w.rotation.x = Math.PI / 2;
    w.position.set(p.x, p.level - 0.12, p.z);
    w.material = pondMat;
  });

  // =====================================================================
  // Rohstoff-Quellen (Bäume, Steine, Erze)
  // =====================================================================
  const nodes = [];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const freeSpot = (minR, dMin, dMax) => {
    for (let t = 0; t < 40; t++) {
      const a = rand() * Math.PI * 2, d = dMin + rand() * (dMax - dMin);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (PONDS.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 2 + minR)) continue;
      if (nodes.every(o => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + minR + 1.5) ** 2)) return { x, z };
    }
    return null;
  };

  const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: 2, diameter: 0.6, tessellation: 6 }, scene);
  trunk.material = mat('wood', 0.45, 0.3, 0.18);
  const crown = BABYLON.MeshBuilder.CreateCylinder('crown', { height: 4, diameterTop: 0, diameterBottom: 3.4, tessellation: 6 }, scene);
  crown.convertToFlatShadedMesh();
  crown.material = mat('leaf', 0.2, 0.5, 0.3);
  const crown2 = BABYLON.MeshBuilder.CreateIcoSphere('crown2', { radius: 1.9, subdivisions: 1 }, scene);
  crown2.material = mat('leaf2', 0.55, 0.72, 0.25);
  const rock = BABYLON.MeshBuilder.CreateIcoSphere('rock', { radius: 1, subdivisions: 1 }, scene);
  rock.material = mat('stone', 0.55, 0.55, 0.6);
  const darkRock = rock.clone('darkRock');
  darkRock.material = mat('stone2', 0.38, 0.36, 0.42);
  const oreSrc = {};
  [['iron', 0.78, 0.42, 0.2, 0.15], ['gold', 1, 0.8, 0.2, 0.35], ['crystal', 0.35, 0.95, 1, 0.6]].forEach(([k, r, g, b, em]) => {
    const o = BABYLON.MeshBuilder.CreatePolyhedron('ore_' + k, { type: 1, size: 0.32 }, scene);
    o.material = mat('m_' + k, r, g, b, em);
    oreSrc[k] = o;
  });
  [trunk, crown, crown2, rock, darkRock, ...Object.values(oreSrc)].forEach(m => { m.isVisible = false; shadows.addShadowCaster(m); });

  const addPart = (src, n, x, y, z, sx, sy, sz, ry, rx, rz) => {
    const m = src.createInstance(src.name + nodes.length + '_' + n.parts.length);
    m.position.set(x, y, z); m.scaling.set(sx, sy, sz);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    n.parts.push({ m, base: m.position.clone(), scale: m.scaling.clone() });
    return m;
  };
  const makeNode = (kind, x, z, r) => {
    const k = KINDS[kind];
    const n = { kind, x, z, r, hp: k.hp, alive: true, parts: [], shake: 0, dying: 0, respawn: 0, hidden: false };
    nodes.push(n);
    return n;
  };

  // Bäume
  for (let i = 0; i < 140; i++) {
    const p = freeSpot(1, 9, WORLD - 2); if (!p) continue;
    const y = heightAt(p.x, p.z), s = 0.8 + rand() * 0.7;
    const n = makeNode('tree', p.x, p.z, 0.5 * s);
    addPart(trunk, n, p.x, y + s, p.z, s, s, s);
    const pine = rand() < 0.6;
    addPart(pine ? crown : crown2, n, p.x, y + (pine ? 3.8 : 3.4) * s, p.z, s, s, s, rand() * 6);
  }
  // Steine & Erze (Eisen eher nah, Gold & Kristall weiter draußen)
  const addRock = (kind, dMin, dMax, count) => {
    for (let i = 0; i < count; i++) {
      const p = freeSpot(1.5, dMin, dMax); if (!p) continue;
      const s = kind === 'rock' ? 0.6 + rand() * 1.0 : 0.9 + rand() * 0.4;
      const n = makeNode(kind, p.x, p.z, 0.9 * s);
      const y = heightAt(p.x, p.z);
      addPart(kind === 'rock' ? rock : darkRock, n, p.x, y + 0.2 * s, p.z, s * 1.2, s * 0.8, s, rand() * 6, rand() * 0.4, rand() * 0.4);
      if (kind !== 'rock') {
        const cnt = 3 + Math.floor(rand() * 2);
        for (let c = 0; c < cnt; c++) {
          const a = (c / cnt) * Math.PI * 2 + rand();
          const st = kind === 'crystal' ? 1.4 + rand() * 0.8 : 1;
          addPart(oreSrc[kind], n, p.x + Math.cos(a) * 0.55 * s, y + 0.55 * s + rand() * 0.2, p.z + Math.sin(a) * 0.55 * s, 1, st, 1, rand() * 6, (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8);
        }
      }
    }
  };
  addRock('rock', 9, WORLD - 2, 45);
  addRock('iron', 10, 45, 16);
  addRock('gold', 35, WORLD - 3, 8);
  addRock('crystal', 55, WORLD - 3, 6);

  // Grenzsteine
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const x = Math.cos(a) * (WORLD + 1.5), z = Math.sin(a) * (WORLD + 1.5);
    const r = rock.createInstance('b' + i);
    const s = 1.2 + rand();
    r.position.set(x, heightAt(x, z), z);
    r.scaling.set(s, s * 1.4, s);
    r.rotation.y = rand() * 6;
  }

  // Grab-Löcher (werden wiederverwendet)
  const holes = [];
  const holeMat = mat('hole', 0.33, 0.22, 0.12);
  for (let i = 0; i < 30; i++) {
    const h = BABYLON.MeshBuilder.CreateDisc('hole' + i, { radius: 0.55, tessellation: 7 }, scene);
    h.rotation.x = Math.PI / 2; h.material = holeMat; h.isVisible = false; h.receiveShadows = true;
    holes.push(h);
  }
  let holeIdx = 0;

  // =====================================================================
  // Held
  // =====================================================================
  const hero = new BABYLON.TransformNode('hero', scene);
  const body = new BABYLON.TransformNode('body', scene); body.parent = hero;
  const part = (name, w, h, d, m, parent, x, y, z) => {
    const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.material = m; b.parent = parent; b.position.set(x, y, z);
    shadows.addShadowCaster(b);
    return b;
  };
  const skin = mat('skin', 0.95, 0.75, 0.6);
  const cloth = mat('cloth', 0.2, 0.35, 0.75);
  const pants = mat('pants', 0.25, 0.22, 0.3);
  const leather = mat('leather', 0.55, 0.35, 0.15);
  const eye = mat('eye', 0.1, 0.1, 0.15);

  part('torso', 0.9, 1.0, 0.55, cloth, body, 0, 1.55, 0);
  part('belt', 0.95, 0.15, 0.6, leather, body, 0, 1.1, 0);
  part('pack', 0.7, 0.75, 0.3, leather, body, 0, 1.6, -0.4); // Rucksack auf dem Rücken
  const head = part('head', 0.7, 0.7, 0.7, skin, body, 0, 2.45, 0);
  part('eyeL', 0.12, 0.12, 0.05, eye, head, -0.16, 0.05, 0.36);
  part('eyeR', 0.12, 0.12, 0.05, eye, head, 0.16, 0.05, 0.36);
  part('hair', 0.76, 0.25, 0.76, mat('hair', 0.35, 0.2, 0.1), head, 0, 0.3, -0.02);

  const limb = (name, x, y, w, len, m) => {
    const pivot = new BABYLON.TransformNode(name + 'P', scene);
    pivot.parent = body; pivot.position.set(x, y, 0);
    part(name, w, len, w, m, pivot, 0, -len / 2, 0);
    return pivot;
  };
  const legL = limb('legL', -0.22, 1.05, 0.32, 1.05, pants);
  const legR = limb('legR', 0.22, 1.05, 0.32, 1.05, pants);
  const armL = limb('armL', -0.6, 2.0, 0.25, 0.9, cloth);
  const armR = limb('armR', 0.6, 2.0, 0.25, 0.9, cloth);
  hero.position.set(0, heightAt(0, 0), 0);

  // ---------- Werkzeuge in der Hand ----------
  const handleMat = mat('handle', 0.5, 0.33, 0.18);
  const headMats = {};
  const toolNodes = {};
  const tierColor = (tool, tier) => {
    if (tier === 3) return tool === 'pick' ? [0.35, 0.95, 1] : [1, 0.78, 0.2];
    if (tier === 2) return [0.8, 0.83, 0.9];
    return tool === 'shovel' || tool === 'bucket' ? [0.62, 0.45, 0.28] : [0.5, 0.5, 0.53];
  };
  TOOL_ORDER.forEach(t => {
    const node = new BABYLON.TransformNode('tool_' + t, scene);
    node.parent = armR; node.position.set(0, -0.85, 0.05); node.rotation.x = 0.35;
    const hm = headMats[t] = mat('head_' + t, 0.5, 0.5, 0.5);
    hm.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    if (t === 'bucket') {
      node.rotation.x = 0;
      const b = BABYLON.MeshBuilder.CreateCylinder('bucket', { height: 0.42, diameterTop: 0.48, diameterBottom: 0.36, tessellation: 8 }, scene);
      b.material = hm; b.parent = node; b.position.set(0, -0.28, 0);
      shadows.addShadowCaster(b);
    } else {
      part('handle_' + t, 0.08, 0.08, 1.1, handleMat, node, 0, 0, 0.5);
      if (t === 'axe') part('axeHead', 0.08, 0.42, 0.3, hm, node, 0, -0.12, 0.95);
      if (t === 'pick') part('pickHead', 0.08, 0.9, 0.1, hm, node, 0, 0, 1.0);
      if (t === 'shovel') part('blade', 0.32, 0.05, 0.42, hm, node, 0, 0, 1.2);
    }
    toolNodes[t] = node;
  });
  const refreshTools = () => {
    TOOL_ORDER.forEach(t => {
      toolNodes[t].setEnabled(t === S.eq);
      const c = tierColor(t, S.tools[t]);
      headMats[t].diffuseColor.set(c[0], c[1], c[2]);
      headMats[t].emissiveColor.set(c[0] * (S.tools[t] === 3 ? 0.3 : 0), c[1] * (S.tools[t] === 3 ? 0.3 : 0), c[2] * (S.tools[t] === 3 ? 0.3 : 0));
    });
  };

  // =====================================================================
  // Kamera
  // =====================================================================
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 1.1, 12, new BABYLON.Vector3(0, 2, 0), scene);
  cam.minZ = 0.3; cam.maxZ = 400; cam.fov = 0.9;
  const camTarget = new BABYLON.Vector3(0, 2, 0);

  // =====================================================================
  // Effekte: Partikel, Texte, Meldungen, Level-Up
  // =====================================================================
  const particles = [];
  for (let i = 0; i < 40; i++) {
    const m = BABYLON.MeshBuilder.CreateBox('pt' + i, { size: 0.16 }, scene);
    m.isVisible = false; m.isPickable = false;
    particles.push({ m, v: new BABYLON.Vector3(), life: 0 });
  }
  let pIdx = 0;
  const burst = (x, y, z, hex, count) => {
    for (let i = 0; i < count; i++) {
      const p = particles[pIdx++ % particles.length];
      p.m.material = matHex(hex);
      p.m.position.set(x, y, z);
      p.v.set((Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5);
      p.life = 0.7 + Math.random() * 0.3;
      p.m.isVisible = true;
    }
  };

  const toScreen = v => BABYLON.Vector3.Project(v, BABYLON.Matrix.Identity(), scene.getTransformMatrix(),
    cam.viewport.toGlobal(canvas.clientWidth, canvas.clientHeight));
  const popText = (txt, worldPos) => {
    const p = toScreen(worldPos);
    const d = document.createElement('div');
    d.className = 'pop'; d.textContent = txt;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  };
  let toastTimer = 0;
  const toast = (msg, gold) => {
    const t = $('toast');
    t.textContent = msg; t.className = 'show' + (gold ? ' gold' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = gold ? 'gold' : ''; }, gold ? 3000 : 2000);
  };
  const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  const confetti = () => {
    const cols = ['#ffd23f', '#ff6a00', '#7cff6b', '#2fd3ff', '#ff4fa3', '#ffffff'];
    for (let i = 0; i < 50; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = Math.random() * 0.5 + 's';
      c.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px');
      c.style.setProperty('--r', Math.random() * 1080 + 'deg');
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  };

  // =====================================================================
  // XP, Level & Erfolge
  // =====================================================================
  const updateHud = () => {
    $('lvl').textContent = 'Lv ' + S.level;
    $('xpfill').style.width = Math.min(100, (S.xp / xpNeed(S.level)) * 100) + '%';
  };
  const checkAch = () => {
    ACH.forEach(a => {
      if (!S.ach[a.id] && a.test(S)) {
        S.ach[a.id] = Date.now();
        setTimeout(() => { toast('🏆 Erfolg: ' + a.name + ' – ' + a.desc, true); vibrate([40, 30, 40]); }, 900);
      }
    });
  };
  const addXp = amount => {
    S.xp += amount;
    while (S.xp >= xpNeed(S.level)) {
      S.xp -= xpNeed(S.level);
      S.level++;
      $('lvNum').textContent = S.level;
      const lu = $('levelup');
      lu.classList.remove('show'); void lu.offsetWidth; lu.classList.add('show');
      confetti();
      vibrate([60, 40, 120]);
      burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ffd23f', 20);
    }
    updateHud();
  };
  const give = (item, n, at, delay) => {
    S.inv[item] = (S.inv[item] || 0) + n;
    S.stats[item] = (S.stats[item] || 0) + n;
    setTimeout(() => {
      popText('+' + n + ' ' + ITEMS[item][1], at);
      const b = $('bag'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    }, delay || 0);
  };

  // =====================================================================
  // Ziel finden & Abbauen
  // =====================================================================
  let facing = 0;
  const findTarget = () => {
    const hx = hero.position.x, hz = hero.position.z;
    const fx = Math.sin(facing), fz = Math.cos(facing);
    let best = null, bestScore = 1e9;
    for (const n of nodes) {
      if (!n.alive) continue;
      const dx = n.x - hx, dz = n.z - hz, d = Math.hypot(dx, dz);
      if (d > n.r + 1.9) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < -0.3) continue;
      const score = d - dot * 1.2;
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best) return { kind: best.kind, node: best };
    for (const p of PONDS) if (Math.hypot(hx - p.x, hz - p.z) < p.r + 1.6) return { kind: 'water', pond: p };
    if (S.eq === 'shovel') return { kind: 'earth', x: hx + fx * 1.3, z: hz + fz * 1.3 };
    return null;
  };

  let swingT = -1, swingTarget = null, hitDone = false, actionHeld = false;
  const swingDur = () => 0.5 / (1 + (S.level - 1) * 0.05);

  const startSwing = () => {
    if (swingT >= 0) return;
    const tgt = findTarget();
    if (!tgt) { toast('Nichts zum Abbauen in der Nähe. Geh zu einem Baum, Stein oder Teich – oder nimm die Schaufel 🪏'); return; }
    const k = KINDS[tgt.kind];
    if (S.eq !== k.tool) { S.eq = k.tool; refreshTools(); renderHotbar(); }
    if (k.tier && S.tools[k.tool] < k.tier) {
      toast('💪 Zu hart! Du brauchst eine ' + TOOL_NAMES[k.tool][k.tier - 1] + ' (🎒 → Herstellen)');
      actionHeld = false;
      return;
    }
    if (tgt.node) facing = Math.atan2(tgt.node.x - hero.position.x, tgt.node.z - hero.position.z);
    hero.rotation.y = facing;
    swingT = 0; swingTarget = tgt; hitDone = false;
  };

  const hit = tgt => {
    const k = KINDS[tgt.kind];
    const tier = S.tools[k.tool];
    if (tgt.node) {
      const n = tgt.node;
      if (!n.alive) return;
      n.hp -= tier; n.shake = 0.3;
      const y = heightAt(n.x, n.z) + 1;
      burst(n.x, y, n.z, k.color, 5);
      vibrate(15);
      if (n.hp <= 0) {
        n.alive = false; n.dying = 1; n.respawn = performance.now() + 90000;
        S.stats['k_' + n.kind] = (S.stats['k_' + n.kind] || 0) + 1;
        let i = 0;
        for (const it in k.drops) give(it, k.drops[it], new BABYLON.Vector3(n.x, y + 1.5, n.z), 300 * i++);
        burst(n.x, y + 0.5, n.z, k.color, 14);
        addXp(k.xp);
      }
    } else {
      const amount = tier;
      const item = Object.keys(k.drops)[0];
      let px, pz;
      if (tgt.kind === 'earth') {
        px = tgt.x; pz = tgt.z;
        const h = holes[holeIdx++ % holes.length];
        h.position.set(px, heightAt(px, pz) + 0.04, pz); h.isVisible = true;
      } else {
        px = hero.position.x + Math.sin(facing) * 1.2; pz = hero.position.z + Math.cos(facing) * 1.2;
      }
      burst(px, heightAt(px, pz) + 0.3, pz, k.color, 8);
      give(item, amount, new BABYLON.Vector3(px, heightAt(px, pz) + 1.5, pz));
      addXp(k.xp * amount);
      vibrate(10);
    }
    checkAch();
    save();
  };

  // =====================================================================
  // Bedienung: Werkzeugleiste & Abbau-Knopf
  // =====================================================================
  const renderHotbar = () => {
    $('hotbar').innerHTML = TOOL_ORDER.map(t =>
      `<button class="slot${S.eq === t ? ' on' : ''}" data-tool="${t}" aria-label="${TOOL_NAMES[t][S.tools[t] - 1]}">${TOOLS[t]}<i style="background:${TIER_DOT[S.tools[t] - 1]}"></i></button>`).join('');
  };
  $('hotbar').addEventListener('click', e => {
    const b = e.target.closest('.slot'); if (!b) return;
    S.eq = b.dataset.tool; refreshTools(); renderHotbar(); save();
    toast(TOOLS[S.eq] + ' ' + TOOL_NAMES[S.eq][S.tools[S.eq] - 1] + ' ausgerüstet');
  });

  const act = $('act');
  act.addEventListener('pointerdown', e => { e.preventDefault(); actionHeld = true; startSwing(); $('hint').style.opacity = '0'; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => act.addEventListener(ev, () => { actionHeld = false; }));
  act.addEventListener('contextmenu', e => e.preventDefault());

  let lastBtn = '';
  const updateActButton = () => {
    const tgt = findTarget();
    let key, icon, label;
    if (!tgt) { key = 'none'; icon = '✋'; label = 'Nichts hier'; }
    else {
      const k = KINDS[tgt.kind];
      const locked = k.tier && S.tools[k.tool] < k.tier;
      key = tgt.kind + locked;
      icon = locked ? '🔒' : TOOLS[k.tool];
      label = locked ? 'Zu hart' : k.verb;
    }
    if (key !== lastBtn) {
      lastBtn = key;
      $('actIcon').textContent = icon; $('actLabel').textContent = label;
      act.classList.toggle('off', !tgt);
    }
    const ring = act.querySelector('circle');
    ring.style.strokeDashoffset = tgt && tgt.node ? 289 * Math.max(0, tgt.node.hp / KINDS[tgt.kind].hp) : 289;
  };

  // =====================================================================
  // Rucksack (Inventar)
  // =====================================================================
  let tab = 'items';
  const canAfford = c => Object.keys(c).every(i => (S.inv[i] || 0) >= c[i]);
  const renderInv = () => {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    let h = '';
    if (tab === 'items') {
      h = '<div class="grid">' + Object.keys(ITEMS).map(i =>
        `<div class="cell${S.inv[i] ? '' : ' zero'}"><div class="e">${ITEMS[i][1]}</div><div class="c">${S.inv[i] || 0}</div><div class="n">${ITEMS[i][0]}</div></div>`).join('') + '</div>';
    } else if (tab === 'tools') {
      h = TOOL_ORDER.map(t => {
        const tier = S.tools[t];
        return `<div class="row"><div class="e">${TOOLS[t]}</div><div class="t"><b>${TOOL_NAMES[t][tier - 1]}</b><small>Stufe ${tier} von 3 · Kraft ×${tier}</small></div>` +
          (S.eq === t ? '<span class="tag">✔ In der Hand</span>' : `<button data-equip="${t}">Nehmen</button>`) + '</div>';
      }).join('');
    } else if (tab === 'craft') {
      const list = RECIPES.filter(r => S.tools[r.tool] === r.tier - 1);
      const locked = RECIPES.filter(r => S.tools[r.tool] < r.tier - 1);
      h = list.map(r => {
        const ok = canAfford(r.cost);
        const costs = Object.keys(r.cost).map(i => `<span class="cost${(S.inv[i] || 0) >= r.cost[i] ? '' : ' miss'}">${ITEMS[i][1]} ${S.inv[i] || 0}/${r.cost[i]}</span>`).join('');
        return `<div class="row"><div class="e">${TOOLS[r.tool]}</div><div class="t"><b>${TOOL_NAMES[r.tool][r.tier - 1]}</b><small>${r.desc}</small><div>${costs}</div></div><button data-craft="${r.tool}:${r.tier}" ${ok ? '' : 'disabled'}>Bauen</button></div>`;
      }).join('') + locked.map(r => `<div class="row locked"><div class="e">🔒</div><div class="t"><b>${TOOL_NAMES[r.tool][r.tier - 1]}</b><small>Erst ${TOOL_NAMES[r.tool][r.tier - 2]} bauen</small></div></div>`).join('');
      if (!list.length && !locked.length) h = '<div class="empty">👑 Alle Werkzeuge sind auf der höchsten Stufe!</div>';
    } else {
      const got = ACH.filter(a => S.ach[a.id]).length;
      h = `<div class="empty" style="padding:4px 0 10px">${got} von ${ACH.length} Erfolgen</div>` + ACH.map(a =>
        `<div class="row${S.ach[a.id] ? '' : ' locked'}"><div class="e">${S.ach[a.id] ? a.e : '🔒'}</div><div class="t"><b>${a.name}</b><small>${a.desc}</small></div>${S.ach[a.id] ? '<span class="tag">🏆</span>' : ''}</div>`).join('');
    }
    $('tabBody').innerHTML = h;
  };
  $('bag').addEventListener('click', () => { $('inv').hidden = false; renderInv(); });
  $('close').addEventListener('click', () => { $('inv').hidden = true; });
  $('inv').addEventListener('click', e => { if (e.target.id === 'inv') $('inv').hidden = true; });
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; renderInv(); } });
  $('tabBody').addEventListener('click', e => {
    const eq = e.target.closest('[data-equip]');
    if (eq) { S.eq = eq.dataset.equip; refreshTools(); renderHotbar(); save(); renderInv(); return; }
    const cr = e.target.closest('[data-craft]');
    if (cr) {
      const [tool, tier] = cr.dataset.craft.split(':'); const r = RECIPES.find(x => x.tool === tool && x.tier === +tier);
      if (!r || !canAfford(r.cost)) return;
      Object.keys(r.cost).forEach(i => { S.inv[i] -= r.cost[i]; });
      S.tools[tool] = r.tier; S.eq = tool;
      S.stats.craft = (S.stats.craft || 0) + 1;
      addXp(20 * r.tier);
      refreshTools(); renderHotbar(); renderInv();
      toast('🔨 ' + TOOL_NAMES[tool][r.tier - 1] + ' hergestellt!', true);
      vibrate([30, 30, 60]);
      burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ffd23f', 14);
      checkAch(); save();
    }
  });

  // =====================================================================
  // Bewegung: Joystick links, Kamera rechts, Tastatur am PC
  // =====================================================================
  const stick = $('stick'), knob = $('knob'), hint = $('hint');
  const R = 50;
  let joyId = null, joyStart = null, joy = { x: 0, y: 0 };
  let camId = null, camLast = null;
  const homeStick = () => { stick.style.left = '90px'; stick.style.top = (window.innerHeight - 110) + 'px'; stick.style.opacity = '.5'; knob.style.transform = ''; };
  homeStick();

  canvas.addEventListener('pointerdown', e => {
    hint.style.opacity = '0';
    if (e.clientX < window.innerWidth / 2 && joyId === null) {
      joyId = e.pointerId; joyStart = { x: e.clientX, y: e.clientY };
      stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.style.opacity = '1';
    } else if (camId === null) {
      camId = e.pointerId; camLast = { x: e.clientX, y: e.clientY };
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId === joyId) {
      let dx = e.clientX - joyStart.x, dy = e.clientY - joyStart.y;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx *= R / len; dy *= R / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      joy.x = dx / R; joy.y = -dy / R;
    } else if (e.pointerId === camId) {
      cam.alpha -= (e.clientX - camLast.x) * 0.008;
      cam.beta = Math.min(1.4, Math.max(0.55, cam.beta - (e.clientY - camLast.y) * 0.005));
      camLast = { x: e.clientX, y: e.clientY };
    }
  });
  const release = e => {
    if (e.pointerId === joyId) { joyId = null; joy = { x: 0, y: 0 }; homeStick(); }
    if (e.pointerId === camId) camId = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const keys = {};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true; hint.style.opacity = '0';
    if (k === ' ' || k === 'e') { actionHeld = true; startSwing(); }
    if (k >= '1' && k <= '4') { S.eq = TOOL_ORDER[+k - 1]; refreshTools(); renderHotbar(); }
    if (k === 'i') { $('inv').hidden = !$('inv').hidden; renderInv(); }
  });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ' || k === 'e') actionHeld = false; });

  // =====================================================================
  // Spiel-Schleife
  // =====================================================================
  const SPEED = 7;
  let walkT = 0, uiTimer = 0;
  const segDist = (px, pz, ax, az, bx, bz) => {
    const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
    const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / (vx * vx + vz * vz || 1)));
    return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const now = performance.now();
    let jx = joy.x, jy = joy.y;
    if (keys['a'] || keys['arrowleft']) jx -= 1;
    if (keys['d'] || keys['arrowright']) jx += 1;
    if (keys['w'] || keys['arrowup']) jy += 1;
    if (keys['s'] || keys['arrowdown']) jy -= 1;
    let mag = Math.hypot(jx, jy);
    if (mag > 1) { jx /= mag; jy /= mag; mag = 1; }

    const fx = -Math.cos(cam.alpha), fz = -Math.sin(cam.alpha);
    const mx = fz * jx + fx * jy, mz = -fx * jx + fz * jy;
    const swinging = swingT >= 0;

    if (mag > 0.08) {
      const sp = SPEED * (swinging ? 0.35 : 1);
      let nx = hero.position.x + mx * sp * dt;
      let nz = hero.position.z + mz * sp * dt;
      for (const o of nodes) {
        if (!o.alive) continue;
        const dx = nx - o.x, dz = nz - o.z, min = o.r + 0.45;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 0.0001) { const d = Math.sqrt(d2); nx = o.x + dx / d * min; nz = o.z + dz / d * min; }
      }
      const dc = Math.hypot(nx, nz);
      if (dc > WORLD) { nx *= WORLD / dc; nz *= WORLD / dc; }
      hero.position.x = nx; hero.position.z = nz;
      if (!swinging) {
        const target = Math.atan2(mx, mz);
        let diff = Math.atan2(Math.sin(target - facing), Math.cos(target - facing));
        facing += diff * Math.min(1, dt * 12);
      }
      hero.rotation.y = facing;
      walkT += dt * 10 * mag;
    } else {
      walkT *= 0.85;
    }
    hero.position.y = heightAt(hero.position.x, hero.position.z);

    // Arme & Beine
    const swing = Math.sin(walkT) * 0.8 * Math.min(1, mag + 0.001);
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8;
    body.position.y = Math.abs(Math.cos(walkT)) * 0.08 * mag;

    if (swinging) {
      swingT += dt / swingDur();
      const t = swingT;
      let a;
      if (t < 0.45) a = -2.5 * (t / 0.45);                      // ausholen
      else if (t < 0.62) a = -2.5 + 2.1 * ((t - 0.45) / 0.17);  // zuschlagen
      else a = -0.4 * (1 - (t - 0.62) / 0.38);                  // zurück
      armR.rotation.x = a;
      if (!hitDone && t >= 0.6) { hitDone = true; hit(swingTarget); }
      if (t >= 1) { swingT = -1; armR.rotation.x = 0; if (actionHeld) startSwing(); }
    } else {
      armR.rotation.x = swing * 0.8 * (S.eq === 'bucket' ? 0.4 : 0.5);
    }

    // Rohstoffe: wackeln, verschwinden, nachwachsen
    for (const n of nodes) {
      if (n.shake > 0) {
        n.shake -= dt;
        const off = Math.sin(now * 0.08) * 0.08 * (n.shake / 0.3);
        n.parts.forEach(p => { p.m.position.x = p.base.x + off; });
        if (n.shake <= 0) n.parts.forEach(p => { p.m.position.x = p.base.x; });
      }
      if (n.dying > 0) {
        n.dying -= dt * 3;
        const f = Math.max(0, n.dying);
        n.parts.forEach(p => { p.m.scaling.copyFrom(p.scale).scaleInPlace(f); });
        if (n.dying <= 0) n.parts.forEach(p => { p.m.isVisible = false; });
      }
      if (!n.alive && n.dying <= 0 && now > n.respawn && Math.hypot(n.x - hero.position.x, n.z - hero.position.z) > 10) {
        n.alive = true; n.hp = KINDS[n.kind].hp;
        n.parts.forEach(p => { p.m.scaling.copyFrom(p.scale); p.m.isVisible = true; });
      }
    }

    // Bäume zwischen Kamera und Held ausblenden
    const cp = cam.position, hx = hero.position.x, hz = hero.position.z;
    for (const n of nodes) {
      if (n.kind !== 'tree' || !n.alive || n.dying > 0) continue;
      const block = Math.abs(n.x - hx) < 16 && Math.abs(n.z - hz) < 16 && segDist(n.x, n.z, cp.x, cp.z, hx, hz) < 1.6 + n.r &&
        Math.hypot(n.x - hx, n.z - hz) > 0.8;
      if (block !== n.hidden) { n.hidden = block; n.parts.forEach(p => { p.m.isVisible = !block; }); }
    }

    // Partikel
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt; p.v.y -= 14 * dt;
      p.m.position.addInPlace(p.v.scale(dt));
      p.m.scaling.setAll(Math.max(0.01, p.life));
      if (p.life <= 0) p.m.isVisible = false;
    }

    // Kamera
    BABYLON.Vector3.LerpToRef(camTarget, new BABYLON.Vector3(hero.position.x, hero.position.y + 2, hero.position.z), Math.min(1, dt * 8), camTarget);
    cam.target.copyFrom(camTarget);

    uiTimer -= dt;
    if (uiTimer <= 0) { uiTimer = 0.12; updateActButton(); }
  });

  refreshTools(); renderHotbar(); updateHud();
  if (!S.stats.k_tree && !S.inv.wood) setTimeout(() => toast('🌲 Geh zu einem Baum und drück den großen Knopf!'), 1500);
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => { engine.resize(); if (joyId === null) homeStick(); });
})();
