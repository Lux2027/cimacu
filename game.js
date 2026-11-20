// Cimacu – Schritt 4: flüssiger (weniger Teile, weiche Schatten, Auto-Auflösung), Statuspunkte, ein Werkzeug-Bild, schönere Welt
(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, powerPreference: 'high-performance' }, false);
  const DPR = window.devicePixelRatio || 1;
  const BEST_SCALE = 1 / Math.min(DPR, 1.5);   // höchste Qualität, die wir zulassen
  const WORST_SCALE = 1.4;                       // niedrigste Auflösung, wenn das Handy zu langsam ist
  let scaleLevel = BEST_SCALE;
  engine.setHardwareScalingLevel(scaleLevel);

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.62, 0.8, 0.95, 1);
  scene.skipPointerMovePicking = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogStart = 45; scene.fogEnd = 130;
  scene.fogColor = new BABYLON.Color3(0.72, 0.85, 0.96);
  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.25; ip.contrast = 1.15;
  const MB = BABYLON.MeshBuilder;

  // =====================================================================
  // Spieldaten
  // =====================================================================
  const COIN = '🪙';
  const ITEMS = {
    wood: ['Holz', '🪵'], stone: ['Stein', '🪨'], dirt: ['Erde', '🟫'], water: ['Wasser', '💧'],
    iron: ['Eisen', '🔩'], gold: ['Golderz', '🟡'], crystal: ['Kristall', '💎']
  };
  const SELL = { wood: 2, stone: 2, dirt: 1, water: 1, iron: 6, gold: 15, crystal: 40 };
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
    { tool: 'pick', tier: 2, cost: { wood: 5, iron: 6 }, desc: 'Kann Golderz und Kristall abbauen' },
    { tool: 'shovel', tier: 2, cost: { wood: 3, iron: 3 }, desc: '2 Erde pro Stich' },
    { tool: 'bucket', tier: 2, cost: { wood: 4, iron: 4 }, desc: '2 Wasser pro Schöpfen' },
    { tool: 'axe', tier: 3, cost: { wood: 15, gold: 5, crystal: 1 }, desc: 'Fällt Bäume dreimal so schnell' },
    { tool: 'pick', tier: 3, cost: { iron: 10, gold: 6, crystal: 3 }, desc: 'Dreifache Abbau-Kraft' },
    { tool: 'shovel', tier: 3, cost: { wood: 5, gold: 4 }, desc: '3 Erde pro Stich' },
    { tool: 'bucket', tier: 3, cost: { wood: 5, gold: 4 }, desc: '3 Wasser pro Schöpfen' }
  ];
  const GEAR = {
    w1: { slot: 'weapon', name: 'Holzschwert',    e: '🗡️', price: 15,   atk: 3,  color: '#b07a45' },
    w2: { slot: 'weapon', name: 'Bronzeschwert',  e: '🗡️', price: 60,   atk: 6,  color: '#cd7f32' },
    w3: { slot: 'weapon', name: 'Eisenschwert',   e: '🗡️', price: 150,  atk: 10, color: '#d5dbe5' },
    w4: { slot: 'weapon', name: 'Goldsäbel',      e: '🗡️', price: 400,  atk: 16, color: '#ffc533' },
    w5: { slot: 'weapon', name: 'Kristallklinge', e: '🗡️', price: 1000, atk: 26, color: '#5ff2ff', glow: true },
    h1: { slot: 'helmet', name: 'Lederkappe',     e: '🪖', price: 20,   def: 1,  color: '#8a5a2b' },
    h2: { slot: 'helmet', name: 'Eisenhelm',      e: '🪖', price: 110,  def: 3,  color: '#c9ced8' },
    h3: { slot: 'helmet', name: 'Goldhelm',       e: '🪖', price: 320,  def: 5,  color: '#ffc533' },
    a1: { slot: 'armor',  name: 'Lederweste',     e: '🦺', price: 30,   def: 2,  color: '#8a5a2b' },
    a2: { slot: 'armor',  name: 'Kettenhemd',     e: '🦺', price: 140,  def: 5,  color: '#9aa3b0' },
    a3: { slot: 'armor',  name: 'Plattenrüstung', e: '🦺', price: 420,  def: 9,  color: '#d5dbe5', pads: true },
    a4: { slot: 'armor',  name: 'Kristallrüstung', e: '🦺', price: 1100, def: 14, color: '#5ff2ff', pads: true, glow: true },
    s1: { slot: 'shield', name: 'Holzschild',     e: '🛡️', price: 25,   def: 2,  color: '#a8743f' },
    s2: { slot: 'shield', name: 'Eisenschild',    e: '🛡️', price: 150,  def: 4,  color: '#c9ced8' },
    s3: { slot: 'shield', name: 'Goldschild',     e: '🛡️', price: 380,  def: 7,  color: '#ffc533' }
  };
  const SLOTS = [['weapon', 'Waffe'], ['helmet', 'Helm'], ['armor', 'Rüstung'], ['shield', 'Schild']];
  const GOODS = {
    potion: { name: 'Heiltrank', e: '🧪', price: 15, desc: 'Heilt dich im Kampf (kommt bald)' },
    boots:  { name: 'Sprintstiefel', e: '👢', price: 80, perk: true, desc: '+25 % Lauftempo' },
    amulet: { name: 'Glücksamulett', e: '🍀', price: 250, perk: true, desc: '20 % Chance auf doppelte Beute' },
    bwood:  { name: '5 Holz', e: '🪵', price: 15, give: ['wood', 5], desc: 'Ein Bündel Holz' },
    bstone: { name: '5 Stein', e: '🪨', price: 15, give: ['stone', 5], desc: 'Eine Kiste Steine' },
    biron:  { name: '3 Eisen', e: '🔩', price: 40, give: ['iron', 3], desc: 'Drei Eisenbarren' }
  };
  const STATS = [
    ['vit', '❤️', 'Vitalität', 'Mehr Lebenspunkte (+10 pro Punkt)'],
    ['str', '💪', 'Stärke', 'Mehr Angriff und Abbau-Kraft'],
    ['int', '🧠', 'Intelligenz', 'Mehr Erfahrung (XP) und bessere Preise'],
    ['dex', '🏃', 'Geschick', 'Schneller abbauen und laufen']
  ];
  const SHOPS = [
    { id: 'general', name: 'Mira', title: 'Gemischtwaren', sign: '🧺 Gemischtwaren', x: -8.5, z: 6.5, awning: ['#e94f64', '#fff4e0'],
      greet: '„Hallo, Reisende! Ich kaufe deine Rohstoffe und hab allerlei Nützliches.“', goods: ['potion', 'boots', 'amulet', 'bwood', 'bstone', 'biron'], buys: true,
      look: { skin: '#f2c9a0', shirt: '#6fbf73', pants: '#5b4636', boots: '#5b3a22', hair: '#c0392b', hairStyle: 'long', skirt: '#3d7bd9', apron: '#fff4e0' } },
    { id: 'weapons', name: 'Borin', title: 'Waffenhändler', sign: '⚔️ Waffen', x: 0, z: 10, awning: ['#3a4b8c', '#e8e8f0'],
      greet: '„Eine gute Klinge ist dein bester Freund da draußen!“', goods: ['w1', 'w2', 'w3', 'w4', 'w5'],
      look: { skin: '#d9a07a', shirt: '#4a3a32', pants: '#2e2a2a', boots: '#1f1a17', hair: '#2b2b2b', hairStyle: 'short', beard: '#2b2b2b', apron: '#6b4a2b' } },
    { id: 'armor', name: 'Hagen', title: 'Rüstungshändler', sign: '🛡️ Rüstungen', x: 8.5, z: 6.5, awning: ['#2f8f6f', '#f0ede0'],
      greet: '„Wer gut geschützt ist, kommt weiter. Schau dich um!“', goods: ['h1', 'a1', 's1', 'h2', 'a2', 's2', 'h3', 'a3', 's3', 'a4'],
      look: { skin: '#8d5a3b', shirt: '#7d8794', pants: '#3a3f4a', boots: '#2a2a2a', hairStyle: 'bald', beard: '#e0e0e0' } }
  ];
  const ACH = [
    { id: 'tree1', e: '🌲', name: 'Holzfäller', desc: 'Fälle deinen ersten Baum', test: s => (s.stats.k_tree || 0) >= 1 },
    { id: 'wood50', e: '🪵', name: 'Holzlager', desc: 'Sammle insgesamt 50 Holz', test: s => (s.stats.wood || 0) >= 50 },
    { id: 'iron1', e: '⛏️', name: 'Bergmann', desc: 'Baue Eisenerz ab', test: s => (s.stats.iron || 0) >= 1 },
    { id: 'craft1', e: '🔨', name: 'Schmied', desc: 'Stelle dein erstes Werkzeug her', test: s => (s.stats.craft || 0) >= 1 },
    { id: 'gold1', e: '🟡', name: 'Goldrausch', desc: 'Finde Golderz', test: s => (s.stats.gold || 0) >= 1 },
    { id: 'crystal1', e: '💎', name: 'Kristallfund', desc: 'Baue einen Kristall ab', test: s => (s.stats.crystal || 0) >= 1 },
    { id: 'water10', e: '💧', name: 'Wasserträger', desc: 'Schöpfe 10 Wasser', test: s => (s.stats.water || 0) >= 10 },
    { id: 'dirt25', e: '🟫', name: 'Maulwurf', desc: 'Grabe 25 Erde', test: s => (s.stats.dirt || 0) >= 25 },
    { id: 'sell1', e: '🤝', name: 'Händlerin', desc: 'Verkaufe deine ersten Rohstoffe', test: s => (s.stats.sold || 0) >= 1 },
    { id: 'weapon1', e: '🗡️', name: 'Bewaffnet', desc: 'Kaufe deine erste Waffe', test: s => Object.keys(s.owned).some(k => k[0] === 'w') },
    { id: 'armorset', e: '🛡️', name: 'Gepanzert', desc: 'Trage Helm, Rüstung und Schild', test: s => s.gear.helmet && s.gear.armor && s.gear.shield },
    { id: 'stat1', e: '📈', name: 'Trainiert', desc: 'Verteile deinen ersten Statuspunkt', test: s => (s.stats.spent || 0) >= 1 },
    { id: 'rich', e: '💰', name: 'Wohlhabend', desc: 'Verdiene insgesamt 1000 Taler', test: s => (s.stats.earned || 0) >= 1000 },
    { id: 'lvl5', e: '⭐', name: 'Abenteurer', desc: 'Erreiche Level 5', test: s => s.level >= 5 },
    { id: 'master', e: '👑', name: 'Meister', desc: 'Alle Werkzeuge auf Stufe 3', test: s => TOOL_ORDER.every(t => s.tools[t] >= 3) }
  ];
  const xpNeed = l => Math.round(40 * Math.pow(l, 1.5));
  const POINTS_PER_LEVEL = 3;

  // Spielstand (wird im Handy gespeichert)
  const SAVE_KEY = 'cimacu-save-v1';
  let S = {
    inv: {}, tools: { axe: 1, pick: 1, shovel: 1, bucket: 1 }, eq: 'axe', xp: 0, level: 1, ach: {}, stats: {},
    money: 25, gear: { weapon: null, helmet: null, armor: null, shield: null }, owned: {}, perks: {}, potions: 0,
    stat: { vit: 5, str: 5, int: 5, dex: 5 }, points: 0, hp: null
  };
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d) { if (!d.stat) d.points = ((d.level || 1) - 1) * POINTS_PER_LEVEL; S = Object.assign(S, d); }
  } catch (e) { }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } };

  // Abgeleitete Werte aus Statuspunkten und Ausrüstung
  const derived = () => {
    const s = S.stat;
    let atk = 1 + s.str, def = 0;
    SLOTS.forEach(([slot]) => { const g = S.gear[slot] && GEAR[S.gear[slot]]; if (g) { atk += g.atk || 0; def += g.def || 0; } });
    return {
      hpMax: 50 + s.vit * 10, atk, def,
      power: 1 + (s.str - 5) * 0.08,
      swing: 1 + (s.dex - 5) * 0.05,
      speed: 1 + (s.dex - 5) * 0.015,
      xpBonus: (s.int - 5) * 0.04,
      sellBonus: (s.int - 5) * 0.02
    };
  };
  const sellPrice = i => Math.max(1, Math.round(SELL[i] * (1 + derived().sellBonus)));
  if (S.hp == null) S.hp = derived().hpMax;

  // =====================================================================
  // Licht, Himmel, Materialien
  // =====================================================================
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.75;
  hemi.diffuse = new BABYLON.Color3(1, 0.97, 0.9);
  hemi.groundColor = new BABYLON.Color3(0.42, 0.4, 0.5);
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.35), scene);
  sun.intensity = 0.85;
  sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

  // Himmel mit Farbverlauf
  const skyTex = new BABYLON.DynamicTexture('skyT', { width: 4, height: 256 }, scene, false);
  { const c = skyTex.getContext(); const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3f86d8'); g.addColorStop(0.45, '#8ec3f0'); g.addColorStop(0.6, '#cfe6f7'); g.addColorStop(1, '#e8f1f7');
    c.fillStyle = g; c.fillRect(0, 0, 4, 256); skyTex.update(); }
  const sky = MB.CreateSphere('sky', { diameter: 350, segments: 12, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  const skyM = new BABYLON.StandardMaterial('skyM', scene);
  skyM.emissiveTexture = skyTex; skyM.disableLighting = true; skyM.fogEnabled = false; skyM.backFaceCulling = false;
  sky.material = skyM; sky.infiniteDistance = true; sky.isPickable = false;

  const mat = (name, r, g, b, emissive) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = new BABYLON.Color3(r, g, b);
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    if (emissive) m.emissiveColor = new BABYLON.Color3(r * emissive, g * emissive, b * emissive);
    return m;
  };
  const matCache = {};
  const smat = (hex, spec, glow) => {
    const key = hex + '|' + (spec || 0) + '|' + (glow || 0);
    if (matCache[key]) return matCache[key];
    const m = new BABYLON.StandardMaterial('s' + key, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    const s = spec === undefined ? 0.12 : spec;
    m.specularColor = new BABYLON.Color3(s, s, s); m.specularPower = 40;
    if (glow) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(glow);
    return (matCache[key] = m);
  };
  // Ein Material für alle eingefärbten, zusammengefügten Teile (spart sehr viel Rechenzeit)
  const vcMat = new BABYLON.StandardMaterial('vc', scene);
  vcMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  vcMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); vcMat.specularPower = 32;

  const TN = (name, parent) => { const t = new BABYLON.TransformNode(name, scene); if (parent) t.parent = parent; return t; };
  const VC = (m, hex) => {
    const c = BABYLON.Color3.FromHexString(hex), n = m.getTotalVertices(), a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { a[i * 4] = c.r; a[i * 4 + 1] = c.g; a[i * 4 + 2] = c.b; a[i * 4 + 3] = 1; }
    m.setVerticesData(BABYLON.VertexBuffer.ColorKind, a);
    return m;
  };
  const SHAPES = {
    caps: o => MB.CreateCapsule('p', Object.assign({ tessellation: 12, subdivisions: 1 }, o), scene),
    sph: o => MB.CreateSphere('p', Object.assign({ segments: 10 }, o), scene),
    cyl: o => MB.CreateCylinder('p', Object.assign({ tessellation: 12 }, o), scene),
    box: o => MB.CreateBox('p', o, scene),
    tor: o => MB.CreateTorus('p', o, scene),
    poly: o => MB.CreatePolyhedron('p', o, scene)
  };
  // Teil bauen: Form, Optionen, Farbe, Position, Skalierung, Drehung
  const part = (type, o, hex, x, y, z, s, r) => {
    const m = SHAPES[type](o);
    m.position.set(x, y, z);
    if (s) m.scaling.set(s[0], s[1], s[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    return hex ? VC(m, hex) : m;
  };
  // Viele Teile zu EINEM Teil zusammenfügen
  const group = (name, parts, parent, material) => {
    const m = BABYLON.Mesh.MergeMeshes(parts, true, true);
    m.name = name; m.material = material || vcMat; m.isPickable = false;
    if (parent) m.parent = parent;
    return m;
  };

  // Weicher runder Schatten (statt teurer Echtzeit-Schatten)
  const blobTex = new BABYLON.DynamicTexture('blobT', { width: 64, height: 64 }, scene, false);
  { const c = blobTex.getContext(); const g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); blobTex.update(); blobTex.hasAlpha = true; }
  const blobMat = new BABYLON.StandardMaterial('blobM', scene);
  blobMat.diffuseColor = BABYLON.Color3.Black(); blobMat.specularColor = BABYLON.Color3.Black();
  blobMat.opacityTexture = blobTex; blobMat.disableLighting = true; blobMat.zOffset = -2; blobMat.fogEnabled = true;
  const blob = MB.CreateGround('blob', { width: 1, height: 1 }, scene);
  blob.material = blobMat; blob.isVisible = false; blob.isPickable = false;
  const addBlob = (x, y, z, size) => { const b = blob.createInstance('bl'); b.position.set(x, y + 0.06, z); b.scaling.set(size, 1, size); b.isPickable = false; return b; };

  // =====================================================================
  // Welt: Boden, Marktplatz, Teiche
  // =====================================================================
  const WORLD = 90;
  const PONDS = [{ x: 18, z: -20, r: 5 }, { x: -30, z: 26, r: 6 }, { x: 46, z: 38, r: 4.5 }, { x: -48, z: -36, r: 5.5 }, { x: 8, z: 55, r: 5 }];
  const baseHeight = (x, z) => {
    const d = Math.sqrt(x * x + z * z);
    const flat = Math.min(1, Math.max(0, (d - 15) / 15));
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
  const ground = MB.CreateGround('ground', { width: 200, height: 200, subdivisions: 70, updatable: true }, scene);
  {
    const pos = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) pos[i + 1] = heightAt(pos[i], pos[i + 2]);
    ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    ground.convertToFlatShadedMesh();
    // Jede Fläche bekommt ihre eigene Grün-Schattierung, Sand am Wasser, Erde am Platz
    const gp = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const cols = new Float32Array(gp.length / 3 * 4);
    const g1 = BABYLON.Color3.FromHexString('#4f9a36'), g2 = BABYLON.Color3.FromHexString('#8cc84b'),
      sand = BABYLON.Color3.FromHexString('#d8c48a'), dirt = BABYLON.Color3.FromHexString('#9b8458'), tmp = new BABYLON.Color3();
    let sd = 3;
    const r2 = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < gp.length; i += 9) {
      const cx = (gp[i] + gp[i + 3] + gp[i + 6]) / 3, cy = (gp[i + 1] + gp[i + 4] + gp[i + 7]) / 3, cz = (gp[i + 2] + gp[i + 5] + gp[i + 8]) / 3;
      const n = (Math.sin(cx * 0.21 + cz * 0.13) + Math.sin(cx * 0.07 - cz * 0.19)) * 0.25 + 0.5;
      BABYLON.Color3.LerpToRef(g1, g2, Math.min(1, Math.max(0, n + (r2() - 0.5) * 0.18 + cy * 0.04)), tmp);
      for (const p of PONDS) { const d = Math.hypot(cx - p.x, cz - p.z); if (d < p.r + 2) BABYLON.Color3.LerpToRef(tmp, sand, Math.min(1, (p.r + 2 - d) / 2), tmp); }
      const dc = Math.hypot(cx, cz);
      if (dc < 15.5) BABYLON.Color3.LerpToRef(tmp, dirt, Math.min(1, (15.5 - dc) / 2), tmp);
      if (dc > WORLD + 2) BABYLON.Color3.LerpToRef(tmp, sand, Math.min(1, (dc - WORLD - 2) / 4), tmp);
      for (let k = 0; k < 3; k++) { const j = (i / 3 + k) * 4; cols[j] = tmp.r; cols[j + 1] = tmp.g; cols[j + 2] = tmp.b; cols[j + 3] = 1; }
    }
    ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, cols);
    const gm = new BABYLON.StandardMaterial('groundM', scene);
    gm.diffuseColor = new BABYLON.Color3(1, 1, 1); gm.specularColor = BABYLON.Color3.Black();
    ground.material = gm;
  }

  // Marktplatz mit Pflaster-Ring und Brunnen
  const plaza = MB.CreateDisc('plaza', { radius: 13.5, tessellation: 40 }, scene);
  plaza.rotation.x = Math.PI / 2; plaza.position.y = 0.03;
  plaza.material = smat('#a88f60', 0);
  const decor = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2;
    decor.push(part('cyl', { diameter: 1.15, height: 0.12, tessellation: 6 }, i % 2 ? '#8c8478' : '#a39a8c', Math.cos(a) * 13.3, 0.06, Math.sin(a) * 13.3));
  }
  decor.push(part('cyl', { diameter: 2.3, height: 0.8, tessellation: 18 }, '#8e8e9a', 0, 0.4, 1));
  decor.push(part('tor', { diameter: 2.2, thickness: 0.18, tessellation: 22 }, '#a3a3ae', 0, 0.82, 1));
  decor.push(part('cyl', { diameter: 1.8, height: 0.02, tessellation: 18 }, '#3d8fe0', 0, 0.75, 1));
  [-1, 1].forEach(s => decor.push(part('cyl', { diameter: 0.14, height: 1.6, tessellation: 6 }, '#6b4526', 0.95 * s, 1.4, 1)));
  decor.push(part('box', { width: 2.3, height: 0.12, depth: 0.12 }, '#6b4526', 0, 2.2, 1));
  decor.push(part('cyl', { diameterTop: 0.3, diameterBottom: 0.36, height: 0.3, tessellation: 10 }, '#7a5530', 0, 1.6, 1));
  const decorMesh = group('decor', decor);
  addBlob(0, 0, 1, 3.6);

  const sea = MB.CreateGround('sea', { width: 600, height: 600 }, scene);
  sea.position.y = -4.5; sea.material = mat('sea', 0.25, 0.55, 0.85);
  const pondMat = mat('pond', 0.3, 0.65, 0.98, 0.2);
  pondMat.alpha = 0.85; pondMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6); pondMat.specularPower = 64;
  PONDS.forEach((p, i) => {
    const w = MB.CreateDisc('pond' + i, { radius: p.r + 0.3, tessellation: 22 }, scene);
    w.rotation.x = Math.PI / 2; w.position.set(p.x, p.level - 0.12, p.z); w.material = pondMat; w.isPickable = false;
    w.freezeWorldMatrix();
  });

  const solids = [{ x: 0, z: 1, r: 1.25 }];

  // =====================================================================
  // Rohstoff-Quellen
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

  const trunk = MB.CreateCylinder('trunk', { height: 2, diameterTop: 0.45, diameterBottom: 0.7, tessellation: 7 }, scene);
  trunk.material = smat('#7a5232', 0.02);
  const crown = MB.CreateCylinder('crown', { height: 4, diameterTop: 0, diameterBottom: 3.4, tessellation: 7, subdivisions: 2 }, scene);
  crown.convertToFlatShadedMesh(); crown.material = smat('#2f7a46', 0.05);
  const crown2 = MB.CreateIcoSphere('crown2', { radius: 1.9, subdivisions: 1 }, scene);
  crown2.material = smat('#7fb53a', 0.05);
  const rock = MB.CreateIcoSphere('rock', { radius: 1, subdivisions: 1 }, scene);
  rock.material = smat('#8f8f9a', 0.08);
  const darkRock = rock.clone('darkRock'); darkRock.material = smat('#5f5a68', 0.08);
  const oreSrc = {};
  [['iron', '#c76a2c', 0.12], ['gold', '#ffcf33', 0.35], ['crystal', '#5ff2ff', 0.6]].forEach(([k, hex, em]) => {
    const o = MB.CreatePolyhedron('ore_' + k, { type: 1, size: 0.32 }, scene);
    o.material = smat(hex, 0.6, em); oreSrc[k] = o;
  });
  [trunk, crown, crown2, rock, darkRock, ...Object.values(oreSrc)].forEach(m => { m.isVisible = false; m.isPickable = false; });

  const addPart = (src, n, x, y, z, sx, sy, sz, ry, rx, rz) => {
    const m = src.createInstance('i');
    m.position.set(x, y, z); m.scaling.set(sx, sy, sz); m.rotation.set(rx || 0, ry || 0, rz || 0); m.isPickable = false;
    n.parts.push({ m, base: m.position.clone(), scale: m.scaling.clone() });
    return m;
  };
  const makeNode = (kind, x, z, r) => {
    const n = { kind, x, z, r, hp: KINDS[kind].hp, alive: true, parts: [], shake: 0, dying: 0, respawn: 0, hidden: false };
    nodes.push(n); return n;
  };
  for (let i = 0; i < 140; i++) {
    const p = freeSpot(1, 17, WORLD - 2); if (!p) continue;
    const y = heightAt(p.x, p.z), s = 0.8 + rand() * 0.7;
    const n = makeNode('tree', p.x, p.z, 0.5 * s);
    addPart(trunk, n, p.x, y + s, p.z, s, s, s);
    const pine = rand() < 0.6;
    addPart(pine ? crown : crown2, n, p.x, y + (pine ? 3.8 : 3.4) * s, p.z, s, s, s, rand() * 6);
    const b = addBlob(p.x, y, p.z, 3.2 * s); n.parts.push({ m: b, base: b.position.clone(), scale: b.scaling.clone() });
  }
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
      const b = addBlob(p.x, y, p.z, 2.6 * s); n.parts.push({ m: b, base: b.position.clone(), scale: b.scaling.clone() });
    }
  };
  addRock('rock', 17, WORLD - 2, 45);
  addRock('iron', 17, 45, 16);
  addRock('gold', 35, WORLD - 3, 8);
  addRock('crystal', 55, WORLD - 3, 6);

  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const x = Math.cos(a) * (WORLD + 1.5), z = Math.sin(a) * (WORLD + 1.5);
    const r = rock.createInstance('b' + i), s = 1.2 + rand();
    r.position.set(x, heightAt(x, z), z); r.scaling.set(s, s * 1.4, s); r.rotation.y = rand() * 6;
    r.isPickable = false; r.freezeWorldMatrix();
  }

  // Grasbüschel und Blumen (viele Kopien eines einzigen Teils = sehr günstig)
  const tuft = group('tuft', [0, 1, 2].map(i => part('cyl', { diameterTop: 0, diameterBottom: 0.16, height: 0.55 + i * 0.12, tessellation: 3 }, ['#4f9a36', '#6fb43e', '#3d8a2e'][i],
    Math.cos(i * 2.1) * 0.08, 0.27 + i * 0.06, Math.sin(i * 2.1) * 0.08, null, [Math.cos(i * 2.1) * 0.3, 0, Math.sin(i * 2.1) * 0.3])));
  tuft.isVisible = false;
  const flowers = ['#ff5d73', '#ffd23f', '#ffffff', '#b77cff'].map((hex, i) => {
    const f = group('flower' + i, [part('cyl', { diameter: 0.04, height: 0.4, tessellation: 4 }, '#3d8a2e', 0, 0.2, 0), part('sph', { diameter: 0.18, segments: 6 }, hex, 0, 0.42, 0), part('sph', { diameter: 0.08, segments: 4 }, '#ffb400', 0, 0.47, 0.04)]);
    f.isVisible = false; return f;
  });
  for (let i = 0; i < 520; i++) {
    const a = rand() * Math.PI * 2, d = 15 + rand() * (WORLD - 16), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (PONDS.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 0.5)) continue;
    const src = rand() < 0.82 ? tuft : flowers[Math.floor(rand() * flowers.length)];
    const g = src.createInstance('g'); const s = 0.8 + rand() * 0.7;
    g.position.set(x, heightAt(x, z), z); g.scaling.setAll(s); g.rotation.y = rand() * 6; g.isPickable = false;
    g.freezeWorldMatrix();
  }

  const holes = [];
  const holeMat = smat('#5e4026', 0);
  for (let i = 0; i < 30; i++) {
    const h = MB.CreateDisc('hole' + i, { radius: 0.55, tessellation: 9 }, scene);
    h.rotation.x = Math.PI / 2; h.material = holeMat; h.isVisible = false; h.isPickable = false;
    holes.push(h);
  }
  let holeIdx = 0;

  // =====================================================================
  // Figuren: wenige zusammengefügte Teile statt vieler Einzelteile
  // =====================================================================
  function makeCharacter(name, look, extraBody, separateBoots) {
    const root = TN(name), body = TN(name + 'B', root);
    const sk = look.skin, hy = 2.52;
    const B = [
      part('caps', { radius: 0.4, height: 1.15, tessellation: 16 }, look.shirt, 0, 1.62, 0, [1, 1, 0.72]),
      part('cyl', { diameter: 0.84, height: 0.14, tessellation: 16 }, '#5a3a1e', 0, 1.2, 0, [1, 1, 0.74]),
      part('box', { width: 0.14, height: 0.12, depth: 0.04 }, '#ffd23f', 0, 1.2, 0.31),
      part('cyl', { diameter: 0.26, height: 0.25, tessellation: 10 }, sk, 0, 2.2, 0),
      part('sph', { diameter: 0.74, segments: 14 }, sk, 0, hy, 0),
      part('sph', { diameter: 0.1, segments: 6 }, sk, 0, hy - 0.04, 0.37),
      part('tor', { diameter: 0.14, thickness: 0.025, tessellation: 12 }, '#8a3b3b', 0, hy - 0.15, 0.32, [1, 1, 0.5], [Math.PI / 2 - 0.35, 0, 0])
    ];
    [-1, 1].forEach(sx => {
      B.push(part('sph', { diameter: 0.15, segments: 8 }, '#ffffff', 0.13 * sx, hy + 0.04, 0.29));
      B.push(part('sph', { diameter: 0.08, segments: 6 }, '#1d1d2b', 0.13 * sx, hy + 0.04, 0.355));
      B.push(part('sph', { diameter: 0.03, segments: 4 }, '#ffffff', 0.13 * sx + 0.02, hy + 0.06, 0.39));
      B.push(part('sph', { diameter: 0.14, segments: 6 }, sk, 0.36 * sx, hy, 0, [0.5, 1, 1]));
      B.push(part('sph', { diameter: 0.1, segments: 6 }, '#f29a8a', 0.2 * sx, hy - 0.09, 0.27, [1, 1, 0.4]));
    });
    if (look.beard) B.push(part('sph', { diameter: 0.5, segments: 10 }, look.beard, 0, hy - 0.24, 0.17, [1, 0.85, 0.7]));
    if (look.skirt) B.push(part('cyl', { diameterTop: 0.84, diameterBottom: 1.2, height: 0.75, tessellation: 18 }, look.skirt, 0, 0.9, 0, [1, 1, 0.85]));
    if (look.apron) B.push(part('box', { width: 0.6, height: 0.95, depth: 0.04 }, look.apron, 0, 1.15, 0.33, null, [-0.12, 0, 0]));
    if (extraBody) extraBody.forEach(p => B.push(p));
    group(name + 'Body', B, body);

    let hair = null;
    if (look.hairStyle !== 'bald') {
      const Hh = [part('sph', { diameter: 0.8, segments: 12 }, look.hair, 0, hy + 0.13, -0.07, [1, 0.68, 1])];
      if (look.hairStyle === 'long') {
        Hh.push(part('caps', { radius: 0.3, height: 0.95, tessellation: 12 }, look.hair, 0, hy - 0.25, -0.2, [1, 1, 0.6]));
        [-1, 1].forEach(sx => Hh.push(part('caps', { radius: 0.09, height: 0.6, tessellation: 8 }, look.hair, 0.3 * sx, hy - 0.15, 0.05)));
      }
      hair = group(name + 'Hair', Hh, body);
    }
    let bootM = null;
    if (separateBoots) { bootM = new BABYLON.StandardMaterial(name + 'boot', scene); bootM.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2); bootM.diffuseColor = BABYLON.Color3.FromHexString(look.boots); }
    const limb = (n, x, y, r, len, hex, handHex, boot) => {
      const p = TN(name + n, body); p.position.set(x, y, 0);
      const L = [part('caps', { radius: r, height: len, tessellation: 10 }, hex, 0, -len / 2, 0)];
      if (handHex) L.push(part('sph', { diameter: r * 2 + 0.06, segments: 8 }, handHex, 0, -len + 0.02, 0));
      if (boot && !separateBoots) L.push(part('caps', { radius: 0.17, height: 0.5, tessellation: 10 }, boot, 0, -0.93, 0.07, null, [Math.PI / 2, 0, 0]));
      group(name + n + 'M', L, p);
      if (boot && separateBoots) { const b = part('caps', { radius: 0.17, height: 0.5, tessellation: 10 }, null, 0, -0.93, 0.07, null, [Math.PI / 2, 0, 0]); b.parent = p; b.material = bootM; b.isPickable = false; }
      return p;
    };
    const legL = limb('legL', -0.2, 1.1, 0.16, 1.0, look.pants, null, look.boots);
    const legR = limb('legR', 0.2, 1.1, 0.16, 1.0, look.pants, null, look.boots);
    const armL = limb('armL', -0.56, 2.02, 0.12, 0.86, look.shirt, sk);
    const armR = limb('armR', 0.56, 2.02, 0.12, 0.86, look.shirt, sk);
    armL.rotation.z = -0.08; armR.rotation.z = 0.08;
    const shadow = addBlob(0, 0, 0, 1.6);
    return { root, body, hair, legL, legR, armL, armR, bootM, shadow, hy };
  }

  // ---------- Spielfigur ----------
  const H = makeCharacter('hero', { skin: '#f2c39b', shirt: '#3559b5', pants: '#3b3346', boots: '#5b3a22', hair: '#6b3e1f', hairStyle: 'short' }, [
    part('caps', { radius: 0.32, height: 0.85, tessellation: 12 }, '#8a5a2b', 0, 1.68, -0.4, [1, 1, 0.55]),
    part('caps', { radius: 0.13, height: 0.8, tessellation: 10 }, '#c94f3d', 0, 2.15, -0.42, null, [0, 0, Math.PI / 2])
  ], true);
  const hero = H.root, body = H.body, legL = H.legL, legR = H.legR, armL = H.armL, armR = H.armR;
  hero.position.set(-2.5, heightAt(-2.5, -6), -6);

  // ---------- Werkzeuge in der Hand ----------
  const handleMat = smat('#7a4f2a', 0.1);
  const headMats = {}, toolNodes = {};
  const tierColor = (tool, tier) => {
    if (tier === 3) return tool === 'pick' ? '#5ff2ff' : '#ffc533';
    if (tier === 2) return '#cfd5e2';
    return tool === 'shovel' || tool === 'bucket' ? '#9e7347' : '#80808a';
  };
  TOOL_ORDER.forEach(t => {
    const node = TN('tool_' + t, armR); node.position.set(0, -0.86, 0.05); node.rotation.x = 0.35;
    const hm = headMats[t] = new BABYLON.StandardMaterial('head_' + t, scene);
    hm.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); hm.specularPower = 48;
    if (t === 'bucket') {
      node.rotation.x = 0;
      group('bucket', [part('cyl', { height: 0.42, diameterTop: 0.48, diameterBottom: 0.36, tessellation: 12 }, null, 0, -0.28, 0), part('tor', { diameter: 0.48, thickness: 0.04, tessellation: 12 }, null, 0, -0.07, 0)], node, hm);
    } else {
      const h = part('cyl', { height: 1.1, diameter: 0.08, tessellation: 6 }, null, 0, 0, 0.5, null, [Math.PI / 2, 0, 0]); h.parent = node; h.material = handleMat; h.isPickable = false;
      const head = t === 'axe' ? part('box', { width: 0.08, height: 0.42, depth: 0.3 }, null, 0, -0.12, 0.95)
        : t === 'pick' ? part('box', { width: 0.08, height: 0.9, depth: 0.1 }, null, 0, 0, 1.0)
          : part('box', { width: 0.32, height: 0.05, depth: 0.42 }, null, 0, 0, 1.2);
      head.parent = node; head.material = hm; head.isPickable = false;
    }
    toolNodes[t] = node;
  });
  const refreshTools = () => {
    TOOL_ORDER.forEach(t => {
      toolNodes[t].setEnabled(t === S.eq);
      const c = BABYLON.Color3.FromHexString(tierColor(t, S.tools[t]));
      headMats[t].diffuseColor = c;
      headMats[t].emissiveColor = S.tools[t] === 3 ? c.scale(0.3) : BABYLON.Color3.Black();
    });
    $('toolIcon').textContent = TOOLS[S.eq];
    $('toolDot').style.background = TIER_DOT[S.tools[S.eq] - 1];
    const b = $('toolBadge'); b.setAttribute('aria-label', TOOL_NAMES[S.eq][S.tools[S.eq] - 1]);
  };
  const setTool = t => {
    if (S.eq === t) return;
    S.eq = t; refreshTools();
    const b = $('toolBadge'); b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap');
  };

  // ---------- Waffen & Rüstungen an der Figur ----------
  const gearMat = slot => { const m = new BABYLON.StandardMaterial('gear_' + slot, scene); m.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6); m.specularPower = 64; return m; };
  const GM = { weapon: gearMat('weapon'), helmet: gearMat('helmet'), armor: gearMat('armor'), shield: gearMat('shield') };
  const swordNode = TN('sword', body); swordNode.position.set(-0.47, 1.25, 0.05); swordNode.rotation.set(Math.PI + 0.45, 0, 0.12);
  group('swordBlade', [part('sph', { diameter: 0.11, segments: 6 }, null, 0, -0.02, 0), part('box', { width: 0.34, height: 0.06, depth: 0.09 }, null, 0, 0.3, 0), part('box', { width: 0.1, height: 0.95, depth: 0.03 }, null, 0, 0.8, 0)], swordNode, GM.weapon);
  { const g = part('cyl', { diameter: 0.07, height: 0.28, tessellation: 6 }, null, 0, 0.14, 0); g.parent = swordNode; g.material = smat('#4a2e18'); }
  const helmNode = TN('helm', body); helmNode.position.set(0, H.hy + 0.02, -0.02);
  group('helmM', [part('sph', { diameter: 0.86, segments: 14, slice: 0.55, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, null, 0, 0, 0), part('tor', { diameter: 0.84, thickness: 0.06, tessellation: 20 }, null, 0, -0.02, 0)], helmNode, GM.helmet);
  const armorNode = TN('armorN', body);
  group('chest', [part('caps', { radius: 0.44, height: 1.0, tessellation: 16 }, null, 0, 1.7, 0, [1, 1, 0.76])], armorNode, GM.armor);
  const pads = group('pads', [-1, 1].map(sx => part('sph', { diameter: 0.46, segments: 10 }, null, 0.52 * sx, 2.08, 0, [1, 0.7, 1])), armorNode, GM.armor);
  const shieldNode = TN('shieldN', armL); shieldNode.position.set(-0.18, -0.5, 0.05); shieldNode.rotation.z = Math.PI / 2;
  group('shieldM', [part('cyl', { diameter: 0.8, height: 0.07, tessellation: 18 }, null, 0, 0, 0)], shieldNode, GM.shield);
  { const b = part('sph', { diameter: 0.22, segments: 8 }, null, 0, 0.05, 0); b.parent = shieldNode; b.material = smat('#ffd23f', 0.5); }

  const applyGear = () => {
    const bySlot = { weapon: swordNode, helmet: helmNode, armor: armorNode, shield: shieldNode };
    SLOTS.forEach(([slot]) => {
      const g = S.gear[slot] && GEAR[S.gear[slot]];
      bySlot[slot].setEnabled(!!g);
      if (g) {
        GM[slot].diffuseColor = BABYLON.Color3.FromHexString(g.color);
        GM[slot].emissiveColor = g.glow ? BABYLON.Color3.FromHexString(g.color).scale(0.35) : BABYLON.Color3.Black();
      }
    });
    const a = S.gear.armor && GEAR[S.gear.armor];
    pads.setEnabled(!!(a && a.pads));
    if (H.hair) H.hair.setEnabled(!S.gear.helmet);
    H.bootM.diffuseColor = BABYLON.Color3.FromHexString(S.perks.boots ? '#b8322a' : '#5b3a22');
  };

  // =====================================================================
  // Händler-Stände (jeder Stand = 1 Teil + Schild + Figur)
  // =====================================================================
  const npcs = [];
  const makeSign = s => {
    const tex = new BABYLON.DynamicTexture('signT' + s.id, { width: 512, height: 128 }, scene, true);
    const ctx = tex.getContext();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#f7ecd2'; ctx.fillRect(8, 8, 496, 112);
    ctx.fillStyle = '#3a2a1a'; ctx.font = 'bold 58px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.sign, 256, 68);
    tex.update();
    const m = new BABYLON.StandardMaterial('signM' + s.id, scene);
    m.diffuseTexture = tex; m.emissiveColor = new BABYLON.Color3(0.45, 0.45, 0.45); m.specularColor = BABYLON.Color3.Black(); m.backFaceCulling = false;
    const p = MB.CreatePlane('sign' + s.id, { width: 2.6, height: 0.65 }, scene);
    p.material = m; p.isPickable = false;
    return p;
  };
  SHOPS.forEach(s => {
    const node = TN('stall' + s.id);
    node.position.set(s.x, heightAt(s.x, s.z), s.z);
    const ry = Math.atan2(0 - s.x, -1 - s.z);
    node.rotation.y = ry;
    const W = '#9a6a3c', D = '#6b4526', P = [];
    P.push(part('box', { width: 3, height: 1.0, depth: 0.75 }, W, 0, 0.5, 1.15));
    P.push(part('box', { width: 3.2, height: 0.09, depth: 0.9 }, D, 0, 1.05, 1.15));
    [[-1.5, -0.8], [1.5, -0.8], [-1.5, 1.55], [1.5, 1.55]].forEach(([x, z]) => P.push(part('cyl', { diameter: 0.14, height: 2.9, tessellation: 6 }, D, x, 1.45, z)));
    for (let i = 0; i < 7; i++) P.push(part('box', { width: 0.48, height: 0.06, depth: 3.0 }, s.awning[i % 2], -1.44 + i * 0.48, 2.95, 0.4, null, [0.22, 0, 0]));
    P.push(part('box', { width: 3.36, height: 0.25, depth: 0.04 }, s.awning[0], 0, 2.55, 1.9, null, [0.22, 0, 0]));
    if (s.id === 'general') {
      P.push(part('cyl', { diameter: 0.7, height: 0.9, tessellation: 12 }, W, -2.1, 0.45, 1.3));
      P.push(part('box', { size: 0.6 }, D, 2.1, 0.3, 1.3));
      for (let i = 0; i < 5; i++) P.push(part('sph', { diameter: 0.18, segments: 6 }, i % 2 ? '#d63a3a' : '#7cc242', -0.9 + i * 0.13, 1.18, 1.1 + (i % 2) * 0.12));
      P.push(part('cyl', { diameter: 0.16, height: 0.28, tessellation: 8 }, '#e94fb0', 0.6, 1.24, 1.1));
      P.push(part('cyl', { diameter: 0.16, height: 0.28, tessellation: 8 }, '#4fb0e9', 0.85, 1.24, 1.2));
    } else if (s.id === 'weapons') {
      for (let i = 0; i < 3; i++) {
        P.push(part('box', { width: 0.09, height: 0.9, depth: 0.03 }, ['#cd7f32', '#d5dbe5', '#ffc533'][i], -0.7 + i * 0.7, 1.55, 1.05, null, [0, 0, 0.1 * (i - 1)]));
        P.push(part('box', { width: 0.3, height: 0.05, depth: 0.08 }, '#4a2e18', -0.7 + i * 0.7, 1.12, 1.05));
      }
      P.push(part('cyl', { diameterTop: 0.5, diameterBottom: 0.35, height: 0.5, tessellation: 6 }, '#3a3a44', 2.1, 0.25, 1.4));
    } else {
      P.push(part('sph', { diameter: 0.5, segments: 10, slice: 0.55 }, '#c9ced8', -0.7, 1.1, 1.1));
      P.push(part('cyl', { diameter: 0.75, height: 0.07, tessellation: 16 }, '#ffc533', 0.6, 1.5, 1.15, null, [Math.PI / 2 - 0.2, 0, 0]));
      P.push(part('caps', { radius: 0.35, height: 1.1, tessellation: 12 }, '#9aa3b0', 2.2, 1.0, 1.2, [1, 1, 0.7]));
    }
    const stall = group('stallM' + s.id, P, node);
    const sign = makeSign(s); sign.parent = node; sign.position.set(0, 3.75, 0.6);
    sign.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    addBlob(s.x, heightAt(s.x, s.z), s.z, 4.6);

    const c = makeCharacter('npc_' + s.id, s.look);
    c.root.parent = node;
    c.shadow.parent = node; c.shadow.position.set(0, 0.06, 0);
    npcs.push({ s, c, node, ry, wave: 0 });

    const toWorld = (lx, lz) => ({ x: s.x + lx * Math.cos(ry) + lz * Math.sin(ry), z: s.z - lx * Math.sin(ry) + lz * Math.cos(ry) });
    [[0, 0, 0.6], [-1.1, 1.15, 0.55], [0, 1.15, 0.55], [1.1, 1.15, 0.55], [-1.5, -0.8, 0.3], [1.5, -0.8, 0.3], [-2.1, 1.3, 0.45], [2.1, 1.3, 0.45]]
      .forEach(([lx, lz, r]) => { const w = toWorld(lx, lz); solids.push({ x: w.x, z: w.z, r }); });
    s.front = toWorld(0, 2.2);
    stall.computeWorldMatrix(true); stall.freezeWorldMatrix();
  });

  // Statische Teile einfrieren = weniger Rechenarbeit pro Bild
  [ground, plaza, decorMesh, sea].forEach(m => { m.isPickable = false; m.freezeWorldMatrix(); });

  // =====================================================================
  // Kamera
  // =====================================================================
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 1.1, 12, new BABYLON.Vector3(-2.5, 2, -6), scene);
  cam.minZ = 0.3; cam.maxZ = 220; cam.fov = 0.9;
  const camTarget = new BABYLON.Vector3(-2.5, 2, -6);
  const tmpV = new BABYLON.Vector3();

  // =====================================================================
  // Effekte
  // =====================================================================
  const particles = [];
  const ptSrc = MB.CreateBox('pt', { size: 0.16 }, scene);
  ptSrc.material = vcMat; VC(ptSrc, '#ffffff'); ptSrc.isVisible = false;
  const ptMats = {};
  for (let i = 0; i < 40; i++) {
    const m = MB.CreateBox('pt' + i, { size: 0.16 }, scene);
    m.isVisible = false; m.isPickable = false;
    particles.push({ m, v: new BABYLON.Vector3(), life: 0 });
  }
  let pIdx = 0;
  const burst = (x, y, z, hex, count) => {
    const m = ptMats[hex] || (ptMats[hex] = smat(hex, 0.1, 0.25));
    for (let i = 0; i < count; i++) {
      const p = particles[pIdx++ % particles.length];
      p.m.material = m; p.m.position.set(x, y, z);
      p.v.set((Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5);
      p.life = 0.7 + Math.random() * 0.3; p.m.isVisible = true;
    }
  };
  const toScreen = v => BABYLON.Vector3.Project(v, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), cam.viewport.toGlobal(canvas.clientWidth, canvas.clientHeight));
  const popText = (txt, worldPos) => {
    const p = toScreen(worldPos);
    const d = document.createElement('div');
    d.className = 'pop'; d.textContent = txt; d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  };
  let toastTimer = 0;
  const toast = (msg, gold) => {
    const t = $('toast');
    t.textContent = msg; t.className = 'show' + (gold ? ' gold' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = gold ? 'gold' : ''; }, gold ? 3000 : 2200);
  };
  let userTapped = false;
  window.addEventListener('pointerdown', () => { userTapped = true; }, { once: true, capture: true });
  const vibrate = p => { if (!userTapped) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  const bump = id => { const b = $(id); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); };
  const confetti = () => {
    const cols = ['#ffd23f', '#ff6a00', '#7cff6b', '#2fd3ff', '#ff4fa3', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
      c.style.animationDelay = Math.random() * 0.5 + 's';
      c.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px');
      c.style.setProperty('--r', Math.random() * 1080 + 'deg');
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  };

  // =====================================================================
  // XP, Level, Leben, Geld & Erfolge
  // =====================================================================
  const updateHud = () => {
    const d = derived();
    S.hp = Math.min(S.hp, d.hpMax);
    $('lvl').textContent = 'Lv ' + S.level;
    $('xpfill').style.width = Math.min(100, (S.xp / xpNeed(S.level)) * 100) + '%';
    $('hpfill').style.width = (S.hp / d.hpMax * 100) + '%';
    $('hptxt').textContent = '❤ ' + Math.round(S.hp) + '/' + d.hpMax;
    $('money').textContent = COIN + ' ' + S.money;
    $('bag').classList.toggle('dot', S.points > 0);
  };
  const checkAch = () => {
    let delay = 900;
    ACH.forEach(a => {
      if (!S.ach[a.id] && a.test(S)) {
        S.ach[a.id] = Date.now();
        setTimeout(() => { toast('🏆 Erfolg: ' + a.name + ' – ' + a.desc, true); vibrate([40, 30, 40]); }, delay);
        delay += 3200;
      }
    });
  };
  const addXp = amount => {
    S.xp += amount * (1 + derived().xpBonus);
    while (S.xp >= xpNeed(S.level)) {
      S.xp -= xpNeed(S.level);
      S.level++;
      S.points += POINTS_PER_LEVEL;
      S.hp = derived().hpMax;
      $('lvNum').textContent = S.level;
      const lu = $('levelup');
      lu.classList.remove('show'); void lu.offsetWidth; lu.classList.add('show');
      confetti(); vibrate([60, 40, 120]);
      burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ffd23f', 20);
    }
    updateHud();
  };
  const give = (item, n, at, delay) => {
    S.inv[item] = (S.inv[item] || 0) + n;
    S.stats[item] = (S.stats[item] || 0) + n;
    setTimeout(() => { popText('+' + n + ' ' + ITEMS[item][1], at); bump('bag'); }, delay || 0);
  };

  // =====================================================================
  // Ziel finden & Abbauen (Werkzeug wechselt automatisch)
  // =====================================================================
  let facing = 0;
  const findTarget = () => {
    const hx = hero.position.x, hz = hero.position.z;
    for (const s of SHOPS) if (Math.hypot(s.front.x - hx, s.front.z - hz) < 2.4) return { kind: 'shop', shop: s };
    const fx = Math.sin(facing), fz = Math.cos(facing);
    let best = null, bestScore = 1e9;
    for (const n of nodes) {
      if (!n.alive) continue;
      const dx = n.x - hx, dz = n.z - hz;
      if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
      const d = Math.hypot(dx, dz);
      if (d > n.r + 1.9) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < -0.3) continue;
      const score = d - dot * 1.2;
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best) return { kind: best.kind, node: best };
    for (const p of PONDS) if (Math.hypot(hx - p.x, hz - p.z) < p.r + 1.6) return { kind: 'water', pond: p };
    if (Math.hypot(hx, hz) > 15) return { kind: 'earth', x: hx + fx * 1.3, z: hz + fz * 1.3 };
    return null;
  };

  let swingT = -1, swingTarget = null, hitDone = false, actionHeld = false;
  const swingDur = () => 0.5 / derived().swing;

  const startSwing = () => {
    if (swingT >= 0) return;
    const tgt = findTarget();
    if (!tgt) { toast('Hier gibt es nichts abzubauen. Geh in den Wald oder zu einem Händler-Stand.'); actionHeld = false; return; }
    if (tgt.kind === 'shop') { actionHeld = false; openShop(tgt.shop); return; }
    const k = KINDS[tgt.kind];
    setTool(k.tool);
    if (k.tier && S.tools[k.tool] < k.tier) {
      toast('💪 Zu hart! Du brauchst eine ' + TOOL_NAMES[k.tool][k.tier - 1] + ' (🎒 → Bauen)');
      actionHeld = false; return;
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
      n.hp -= tier * derived().power; n.shake = 0.3;
      const y = heightAt(n.x, n.z) + 1;
      burst(n.x, y, n.z, k.color, 5);
      vibrate(15);
      if (n.hp <= 0.001) {
        n.alive = false; n.dying = 1; n.hidden = false; n.respawn = performance.now() + 90000;
        S.stats['k_' + n.kind] = (S.stats['k_' + n.kind] || 0) + 1;
        const lucky = S.perks.amulet && Math.random() < 0.2;
        let i = 0;
        for (const it in k.drops) give(it, k.drops[it] * (lucky ? 2 : 1), new BABYLON.Vector3(n.x, y + 1.5, n.z), 300 * i++);
        if (lucky) setTimeout(() => popText('🍀 Doppelt!', new BABYLON.Vector3(n.x, y + 2.5, n.z)), 150);
        burst(n.x, y + 0.5, n.z, k.color, 14);
        addXp(k.xp);
      }
    } else {
      const item = Object.keys(k.drops)[0];
      let px, pz;
      if (tgt.kind === 'earth') {
        px = tgt.x; pz = tgt.z;
        const h = holes[holeIdx++ % holes.length];
        h.position.set(px, heightAt(px, pz) + 0.05, pz); h.isVisible = true;
      } else { px = hero.position.x + Math.sin(facing) * 1.2; pz = hero.position.z + Math.cos(facing) * 1.2; }
      burst(px, heightAt(px, pz) + 0.3, pz, k.color, 8);
      give(item, tier, new BABYLON.Vector3(px, heightAt(px, pz) + 1.5, pz));
      addXp(k.xp * tier);
      vibrate(10);
    }
    checkAch(); save();
  };

  // =====================================================================
  // Aktions-Knopf & Werkzeug-Bild
  // =====================================================================
  const act = $('act');
  act.addEventListener('pointerdown', e => { e.preventDefault(); actionHeld = true; startSwing(); $('hint').style.opacity = '0'; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => act.addEventListener(ev, () => { actionHeld = false; }));
  act.addEventListener('contextmenu', e => e.preventDefault());
  $('toolBadge').addEventListener('click', () => { tab = 'tools'; $('inv').hidden = false; renderInv(); });

  let lastBtn = '';
  const ring = act.querySelector('circle');
  const updateActButton = () => {
    const tgt = findTarget();
    let key, icon, label;
    if (!tgt) { key = 'none'; icon = '✋'; label = 'Nichts hier'; }
    else if (tgt.kind === 'shop') { key = 'shop' + tgt.shop.id; icon = '🛒'; label = 'Handeln'; }
    else {
      const k = KINDS[tgt.kind];
      if (swingT < 0) setTool(k.tool);
      const locked = k.tier && S.tools[k.tool] < k.tier;
      key = tgt.kind + locked;
      icon = locked ? '🔒' : TOOLS[k.tool];
      label = locked ? 'Zu hart' : k.verb;
    }
    if (key !== lastBtn) {
      lastBtn = key;
      $('actIcon').textContent = icon; $('actLabel').textContent = label;
      act.classList.toggle('off', !tgt);
      act.classList.toggle('shop', !!tgt && tgt.kind === 'shop');
    }
    ring.style.strokeDashoffset = tgt && tgt.node ? 289 * Math.max(0, tgt.node.hp / KINDS[tgt.kind].hp) : 289;
  };

  // =====================================================================
  // Händler-Fenster
  // =====================================================================
  let curShop = null, shopTab = 'buy';
  const fmtStat = g => g.atk ? `⚔️ Angriff +${g.atk}` : `🛡️ Schutz +${g.def}`;
  const openShop = s => {
    curShop = s; shopTab = 'buy'; $('shop').hidden = false;
    const npc = npcs.find(n => n.s === s); if (npc) npc.wave = 1.5;
    renderShop();
  };
  const renderShop = () => {
    const s = curShop; if (!s) return;
    $('shopTitle').textContent = s.sign.split(' ')[0] + ' ' + s.name + ' · ' + s.title;
    $('shopGreet').textContent = s.greet;
    $('shopMoney').textContent = 'Dein Geld: ' + COIN + ' ' + S.money;
    $('shopTabs').innerHTML = s.buys ? `<button data-stab="buy" class="${shopTab === 'buy' ? 'on' : ''}">🛒 Kaufen</button><button data-stab="sell" class="${shopTab === 'sell' ? 'on' : ''}">💰 Verkaufen</button>` : '';
    $('shopTabs').style.display = s.buys ? '' : 'none';
    let h = '';
    if (shopTab === 'buy') {
      h = s.goods.map(id => {
        const g = GEAR[id], o = GOODS[id];
        if (g) {
          const cur = S.gear[g.slot] && GEAR[S.gear[g.slot]];
          const curV = cur ? (cur.atk || cur.def) : 0, v = g.atk || g.def;
          const cmp = v > curV ? ` <span class="up">▲ +${v - curV}</span>` : '';
          let btn;
          if (S.gear[g.slot] === id) btn = '<span class="tag">✔ Angelegt</span>';
          else if (S.owned[id]) btn = `<button class="alt" data-equip-gear="${id}">Anlegen</button>`;
          else btn = `<button data-buy="${id}" ${S.money >= g.price ? '' : 'disabled'}>${COIN} ${g.price}</button>`;
          return `<div class="row"><div class="e">${g.e}<i style="background:${g.color}"></i></div><div class="t"><b>${g.name}</b><small>${fmtStat(g)}${cmp}</small></div>${btn}</div>`;
        }
        const btn = o.perk && S.perks[id] ? '<span class="tag">✔ Gekauft</span>' : `<button data-buy="${id}" ${S.money >= o.price ? '' : 'disabled'}>${COIN} ${o.price}</button>`;
        const extra = id === 'potion' ? ` · Du hast ${S.potions || 0}` : '';
        return `<div class="row"><div class="e">${o.e}</div><div class="t"><b>${o.name}</b><small>${o.desc}${extra}</small></div>${btn}</div>`;
      }).join('');
    } else {
      const have = Object.keys(ITEMS).filter(i => S.inv[i] > 0);
      const total = have.reduce((a, i) => a + S.inv[i] * sellPrice(i), 0);
      h = `<button class="wide" data-sellall ${total ? '' : 'disabled'}>Alle Rohstoffe verkaufen · ${COIN} ${total}</button>`;
      h += have.length ? have.map(i => `<div class="row"><div class="e">${ITEMS[i][1]}</div><div class="t"><b>${ITEMS[i][0]} × ${S.inv[i]}</b><small>${COIN} ${sellPrice(i)} pro Stück</small></div><div class="btns"><button class="alt" data-sell="${i}:1">1</button><button data-sell="${i}:all">Alle</button></div></div>`).join('')
        : '<div class="empty">Dein Rucksack ist leer. Sammle Rohstoffe und komm wieder!</div>';
    }
    $('shopBody').innerHTML = h;
  };
  const sell = (item, n) => {
    n = Math.min(n, S.inv[item] || 0); if (!n) return 0;
    const v = n * sellPrice(item);
    S.inv[item] -= n; S.money += v;
    S.stats.sold = (S.stats.sold || 0) + n; S.stats.earned = (S.stats.earned || 0) + v;
    return v;
  };
  $('shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-stab]'); if (b) { shopTab = b.dataset.stab; renderShop(); } });
  $('shopBody').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.buy) {
      const id = b.dataset.buy, g = GEAR[id], o = GOODS[id], price = (g || o).price;
      if (S.money < price) return;
      S.money -= price;
      if (g) { S.owned[id] = true; S.gear[g.slot] = id; applyGear(); toast('✨ ' + g.name + ' gekauft und angelegt!', true); }
      else if (o.perk) { S.perks[id] = true; applyGear(); toast('✨ ' + o.name + ' gekauft! ' + o.desc, true); }
      else if (o.give) { S.inv[o.give[0]] = (S.inv[o.give[0]] || 0) + o.give[1]; toast(o.e + ' ' + o.name + ' gekauft'); }
      else if (id === 'potion') { S.potions = (S.potions || 0) + 1; toast('🧪 Heiltrank gekauft'); }
      vibrate([20, 30, 40]);
      burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ffd23f', 10);
    } else if (b.dataset.equipGear) {
      const g = GEAR[b.dataset.equipGear]; S.gear[g.slot] = b.dataset.equipGear; applyGear();
    } else if (b.dataset.sell) {
      const [item, n] = b.dataset.sell.split(':');
      const v = sell(item, n === 'all' ? Infinity : 1);
      if (v) { toast('💰 +' + v + ' Taler'); vibrate(15); }
    } else if (b.dataset.sellall !== undefined) {
      let v = 0; Object.keys(ITEMS).forEach(i => { v += sell(i, Infinity); });
      if (v) { toast('💰 Alles verkauft: +' + v + ' Taler', true); vibrate([20, 30, 60]); }
    }
    bump('money'); updateHud(); checkAch(); save(); renderShop();
  });

  // =====================================================================
  // Rucksack (mit Held: Statuspunkte & Ausrüstung)
  // =====================================================================
  let tab = 'items';
  const canAfford = c => Object.keys(c).every(i => (S.inv[i] || 0) >= c[i]);
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + ' %';
  const renderInv = () => {
    document.querySelectorAll('#invTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    let h = '';
    if (tab === 'items') {
      h = '<div class="grid">' + Object.keys(ITEMS).map(i =>
        `<div class="cell${S.inv[i] ? '' : ' zero'}"><div class="e">${ITEMS[i][1]}</div><div class="c">${S.inv[i] || 0}</div><div class="n">${ITEMS[i][0]}</div></div>`).join('') + '</div>' +
        '<div class="empty">Rohstoffe verkaufst du bei Mira (🧺 Gemischtwaren) auf dem Marktplatz.</div>';
    } else if (tab === 'tools') {
      h = '<div class="empty" style="padding:0 0 10px">Das passende Werkzeug wird automatisch genommen.</div>' + TOOL_ORDER.map(t => {
        const tier = S.tools[t];
        return `<div class="row"><div class="e">${TOOLS[t]}</div><div class="t"><b>${TOOL_NAMES[t][tier - 1]}</b><small>Stufe ${tier} von 3 · Kraft ×${tier}</small></div>${S.eq === t ? '<span class="tag">✔ In der Hand</span>' : ''}</div>`;
      }).join('');
    } else if (tab === 'hero') {
      const d = derived();
      h = S.points > 0 ? `<div class="points">⭐ Du hast ${S.points} Statuspunkt${S.points > 1 ? 'e' : ''} zu verteilen!</div>` : '';
      h += STATS.map(([k, e, name, desc]) => `<div class="row stat"><div class="e">${e}</div><div class="t"><b>${name} <small>(${k.toUpperCase()})</small></b><small>${desc}</small></div><span class="v">${S.stat[k]}</span><button data-stat="${k}" ${S.points > 0 ? '' : 'disabled'} aria-label="${name} erhöhen">+</button></div>`).join('');
      h += `<h4>Deine Werte</h4><div class="vals">
        <div><b>❤️ ${d.hpMax}</b>Leben</div><div><b>⚔️ ${d.atk}</b>Angriff</div><div><b>🛡️ ${d.def}</b>Schutz</div>
        <div><b>⛏️ ${pct(d.power - 1)}</b>Abbau-Kraft</div><div><b>⚡ ${pct(d.swing - 1)}</b>Tempo</div><div><b>📚 ${pct(d.xpBonus)}</b>XP-Bonus</div></div>`;
      h += '<h4>Ausrüstung</h4>' + SLOTS.map(([slot, label]) => {
        const id = S.gear[slot], g = id && GEAR[id];
        return g ? `<div class="row"><div class="e">${g.e}<i style="background:${g.color}"></i></div><div class="t"><small>${label}</small><b>${g.name}</b><small>${fmtStat(g)}</small></div><button class="alt" data-unequip="${slot}">Ablegen</button></div>`
          : `<div class="row locked"><div class="e">➖</div><div class="t"><small>${label}</small><b>leer</b><small>Beim Händler kaufen</small></div></div>`;
      }).join('');
      const spare = Object.keys(S.owned).filter(id => S.gear[GEAR[id].slot] !== id);
      if (spare.length) h += '<h4>Weitere im Besitz</h4>' + spare.map(id => { const g = GEAR[id]; return `<div class="row"><div class="e">${g.e}<i style="background:${g.color}"></i></div><div class="t"><b>${g.name}</b><small>${fmtStat(g)}</small></div><button data-wear="${id}">Anlegen</button></div>`; }).join('');
      const perks = Object.keys(S.perks).filter(p => S.perks[p]);
      if (perks.length || S.potions) h += '<h4>Besonderes</h4>' + perks.map(p => `<div class="row"><div class="e">${GOODS[p].e}</div><div class="t"><b>${GOODS[p].name}</b><small>${GOODS[p].desc}</small></div><span class="tag">aktiv</span></div>`).join('') +
        (S.potions ? `<div class="row"><div class="e">🧪</div><div class="t"><b>Heiltrank × ${S.potions}</b><small>Für spätere Kämpfe</small></div></div>` : '');
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
    $('invBody').innerHTML = h;
  };
  $('bag').addEventListener('click', () => { if (S.points > 0) tab = 'hero'; $('inv').hidden = false; renderInv(); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { $(b.dataset.close).hidden = true; curShop = null; }));
  ['inv', 'shop'].forEach(id => $(id).addEventListener('click', e => { if (e.target.id === id) { $(id).hidden = true; curShop = null; } }));
  $('invTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; renderInv(); } });
  $('invBody').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.stat && S.points > 0) {
      const oldMax = derived().hpMax;
      S.stat[b.dataset.stat]++; S.points--; S.stats.spent = (S.stats.spent || 0) + 1;
      S.hp += derived().hpMax - oldMax;
      vibrate(15); checkAch(); updateHud();
    }
    if (b.dataset.unequip) { S.gear[b.dataset.unequip] = null; applyGear(); }
    if (b.dataset.wear) { S.gear[GEAR[b.dataset.wear].slot] = b.dataset.wear; applyGear(); checkAch(); }
    if (b.dataset.craft) {
      const [tool, tier] = b.dataset.craft.split(':'); const r = RECIPES.find(x => x.tool === tool && x.tier === +tier);
      if (!r || !canAfford(r.cost)) return;
      Object.keys(r.cost).forEach(i => { S.inv[i] -= r.cost[i]; });
      S.tools[tool] = r.tier; S.eq = tool;
      S.stats.craft = (S.stats.craft || 0) + 1;
      addXp(20 * r.tier); refreshTools();
      toast('🔨 ' + TOOL_NAMES[tool][r.tier - 1] + ' hergestellt!', true);
      vibrate([30, 30, 60]);
      burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ffd23f', 14);
      checkAch();
    }
    save(); renderInv();
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
    } else if (camId === null) { camId = e.pointerId; camLast = { x: e.clientX, y: e.clientY }; }
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
    if (k === 'i') { $('inv').hidden = !$('inv').hidden; renderInv(); }
    if (k === 'escape') { $('inv').hidden = true; $('shop').hidden = true; curShop = null; }
  });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ' || k === 'e') actionHeld = false; });

  // =====================================================================
  // Spiel-Schleife
  // =====================================================================
  const SPEED = 7;
  let walkT = 0, uiTimer = 0, idleT = 0, perfTimer = 0, regenTimer = 0, occT = 0;
  const pushOut = (pos, o) => {
    const dx = pos.x - o.x, dz = pos.z - o.z, min = o.r + 0.45, d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 0.0001) { const d = Math.sqrt(d2); pos.x = o.x + dx / d * min; pos.z = o.z + dz / d * min; }
  };
  const np = { x: 0, z: 0 };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    const now = performance.now();
    idleT += dt;
    const uiOpen = !$('inv').hidden || !$('shop').hidden;
    let jx = uiOpen ? 0 : joy.x, jy = uiOpen ? 0 : joy.y;
    if (!uiOpen) {
      if (keys['a'] || keys['arrowleft']) jx -= 1;
      if (keys['d'] || keys['arrowright']) jx += 1;
      if (keys['w'] || keys['arrowup']) jy += 1;
      if (keys['s'] || keys['arrowdown']) jy -= 1;
    }
    let mag = Math.hypot(jx, jy);
    if (mag > 1) { jx /= mag; jy /= mag; mag = 1; }
    const fx = -Math.cos(cam.alpha), fz = -Math.sin(cam.alpha);
    const mx = fz * jx + fx * jy, mz = -fx * jx + fz * jy;
    const swinging = swingT >= 0;
    const d = derived();

    if (mag > 0.08) {
      const sp = SPEED * d.speed * (S.perks.boots ? 1.25 : 1) * (swinging ? 0.35 : 1);
      np.x = hero.position.x + mx * sp * dt; np.z = hero.position.z + mz * sp * dt;
      for (const o of nodes) if (o.alive && Math.abs(o.x - np.x) < 3 && Math.abs(o.z - np.z) < 3) pushOut(np, o);
      for (const o of solids) if (Math.abs(o.x - np.x) < 3 && Math.abs(o.z - np.z) < 3) pushOut(np, o);
      const dc = Math.hypot(np.x, np.z);
      if (dc > WORLD) { np.x *= WORLD / dc; np.z *= WORLD / dc; }
      hero.position.x = np.x; hero.position.z = np.z;
      if (!swinging) {
        const target = Math.atan2(mx, mz);
        facing += Math.atan2(Math.sin(target - facing), Math.cos(target - facing)) * Math.min(1, dt * 12);
      }
      hero.rotation.y = facing;
      walkT += dt * 10 * mag;
    } else walkT *= 0.85;
    hero.position.y = heightAt(hero.position.x, hero.position.z);
    H.shadow.position.set(hero.position.x, hero.position.y + 0.06, hero.position.z);

    const swing = Math.sin(walkT) * 0.75 * Math.min(1, mag + 0.001);
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8;
    body.position.y = Math.abs(Math.cos(walkT)) * 0.08 * mag + Math.sin(idleT * 2) * 0.015;

    if (swinging) {
      swingT += dt / swingDur();
      const t = swingT;
      let a;
      if (t < 0.45) a = -2.5 * (t / 0.45);
      else if (t < 0.62) a = -2.5 + 2.1 * ((t - 0.45) / 0.17);
      else a = -0.4 * (1 - (t - 0.62) / 0.38);
      armR.rotation.x = a;
      if (!hitDone && t >= 0.6) { hitDone = true; hit(swingTarget); }
      if (t >= 1) { swingT = -1; armR.rotation.x = 0; if (actionHeld) startSwing(); }
    } else armR.rotation.x = swing * 0.8 * (S.eq === 'bucket' ? 0.4 : 0.5);

    // Händler
    for (const n of npcs) {
      const dx = hero.position.x - n.s.x, dz = hero.position.z - n.s.z, dd = Math.hypot(dx, dz);
      const want = dd < 10 ? Math.atan2(dx, dz) - n.ry : 0;
      const cur = n.c.root.rotation.y;
      n.c.root.rotation.y = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * Math.min(1, dt * 4);
      n.c.body.position.y = Math.sin(idleT * 2 + n.s.x) * 0.02;
      if (dd < 5 && n.wave <= 0 && !n.greeted) { n.wave = 1.6; n.greeted = true; }
      if (dd > 8) n.greeted = false;
      if (n.wave > 0) { n.wave -= dt; n.c.armR.rotation.z = 2.6 + Math.sin(n.wave * 14) * 0.35; n.c.armR.rotation.x = 0; }
      else { n.c.armR.rotation.z += (0.08 - n.c.armR.rotation.z) * Math.min(1, dt * 6); n.c.armR.rotation.x = Math.sin(idleT * 1.5 + n.s.z) * 0.06; }
    }

    // Rohstoffe: wackeln, verschwinden, nachwachsen
    for (const n of nodes) {
      if (n.shake > 0) {
        n.shake -= dt;
        const off = Math.sin(now * 0.08) * 0.08 * Math.max(0, n.shake / 0.3);
        for (let i = 0; i < n.parts.length - 1; i++) n.parts[i].m.position.x = n.parts[i].base.x + off;
      }
      if (n.dying > 0) {
        n.dying -= dt * 3;
        const f = Math.max(0, n.dying);
        n.parts.forEach(p => { p.m.scaling.copyFrom(p.scale).scaleInPlace(f); });
        if (n.dying <= 0) n.parts.forEach(p => { p.m.isVisible = false; });
      } else if (!n.alive && now > n.respawn && Math.hypot(n.x - hero.position.x, n.z - hero.position.z) > 10) {
        n.alive = true; n.hp = KINDS[n.kind].hp; n.hidden = false;
        n.parts.forEach(p => { p.m.scaling.copyFrom(p.scale); p.m.isVisible = true; });
      }
    }

    // Baumkronen, die WEIT vor der Kamera die Figur verdecken, ausblenden (5× pro Sekunde reicht)
    occT -= dt;
    if (occT <= 0) {
      occT = 0.2;
      const cp = cam.position, hx = hero.position.x, hz = hero.position.z;
      const vx = cp.x - hx, vz = cp.z - hz, vv = vx * vx + vz * vz || 1;
      for (const n of nodes) {
        if (n.kind !== 'tree' || !n.alive || n.dying > 0) continue;
        let block = false;
        const wx = n.x - hx, wz = n.z - hz;
        if (Math.abs(wx) < 14 && Math.abs(wz) < 14 && wx * wx + wz * wz > 10) {
          const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / vv));
          block = t > 0.1 && Math.hypot(wx - vx * t, wz - vz * t) < 1.4 + n.r;
        }
        if (block !== n.hidden) { n.hidden = block; n.parts[1].m.isVisible = !block; }
      }
    }

    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt; p.v.y -= 14 * dt;
      p.m.position.addInPlaceFromFloats(p.v.x * dt, p.v.y * dt, p.v.z * dt);
      p.m.scaling.setAll(Math.max(0.01, p.life));
      if (p.life <= 0) p.m.isVisible = false;
    }

    pondMat.alpha = 0.82 + Math.sin(idleT * 1.5) * 0.04;

    tmpV.set(hero.position.x, hero.position.y + 2, hero.position.z);
    BABYLON.Vector3.LerpToRef(camTarget, tmpV, Math.min(1, dt * 8), camTarget);
    cam.target.copyFrom(camTarget);

    // Leben langsam auffüllen
    regenTimer += dt;
    if (regenTimer > 1) { regenTimer = 0; if (S.hp < d.hpMax) { S.hp = Math.min(d.hpMax, S.hp + d.hpMax * 0.02); updateHud(); } }

    uiTimer -= dt;
    if (uiTimer <= 0) { uiTimer = 0.12; updateActButton(); }

    // Auflösung automatisch anpassen, damit es flüssig bleibt
    perfTimer += dt;
    if (perfTimer > 2) {
      perfTimer = 0;
      const fps = engine.getFps();
      if (fps < 42 && scaleLevel < WORST_SCALE) { scaleLevel = Math.min(WORST_SCALE, scaleLevel + 0.15); engine.setHardwareScalingLevel(scaleLevel); }
      else if (fps > 57 && scaleLevel > BEST_SCALE + 0.01) { scaleLevel = Math.max(BEST_SCALE, scaleLevel - 0.1); engine.setHardwareScalingLevel(scaleLevel); }
    }
  });

  refreshTools(); applyGear(); updateHud();
  scene.freezeMaterials && Object.values(matCache).forEach(m => m.freeze());
  if (!S.stats.k_tree && !S.inv.wood) setTimeout(() => toast('🏪 Willkommen! Vorne sind die Händler – draußen im Wald findest du Rohstoffe.'), 1500);
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => { engine.resize(); if (joyId === null) homeStick(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });})();
