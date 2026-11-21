// Cimacu – Schritt 5: Figur erstellen (Name, Geschlecht, Klasse), Reisen in 4 Länder, Cim-Währung, Chat-Fenster
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const canvas = $('game');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, powerPreference: 'high-performance' }, false);
  const DPR = window.devicePixelRatio || 1;
  const BEST_SCALE = 1 / Math.min(DPR, 1.5), WORST_SCALE = 1.3;
  let scaleLevel = BEST_SCALE;
  engine.setHardwareScalingLevel(scaleLevel);

  const scene = new BABYLON.Scene(engine);
  scene.skipPointerMovePicking = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogStart = 45; scene.fogEnd = 130;
  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.25; ip.contrast = 1.15;
  const MB = BABYLON.MeshBuilder;
  const C3 = hex => BABYLON.Color3.FromHexString(hex);

  // =====================================================================
  // Spieldaten
  // =====================================================================
  const CIM = '<i class="cim"></i>';
  const TRAVEL_COST = 150;
  const ITEMS = {
    wood: ['Holz', '🪵'], stone: ['Stein', '🪨'], dirt: ['Erde', '🟫'], water: ['Wasser', '💧'],
    iron: ['Eisen', '🔩'], gold: ['Golderz', '🟡'], crystal: ['Kristall', '💎'],
    ice: ['Eiskristall', '🧊'], cactus: ['Kaktusfrucht', '🌵'], silver: ['Silbererz', '🥈'],
    fur: ['Tierfell', '🦊'], tusk: ['Eberzahn', '🦷'], wolf: ['Wolfspelz', '🐺'], bear: ['Eisbärfell', '🐻'],
    sting: ['Skorpionstachel', '🦂'], venom: ['Schlangengift', '🐍'], horn: ['Steinbockhorn', '🐐'], claw: ['Bärenklaue', '🐾']
  };
  const SELL = { wood: 2, stone: 2, dirt: 1, water: 1, iron: 6, gold: 15, crystal: 40, ice: 30, cactus: 10, silver: 25,
    fur: 6, tusk: 10, wolf: 20, bear: 40, sting: 55, venom: 50, horn: 85, claw: 120 };
  // Heiltränke in drei Größen
  const CONS = {
    potion: { name: 'Kleiner Heiltrank', e: '🧪', heal: 50, color: '#ff6fb5' },
    potion2: { name: 'Heiltrank', e: '🧪', heal: 130, color: '#ff3b6b' },
    potion3: { name: 'Großer Heiltrank', e: '⚗️', heal: 320, color: '#c22b4f' }
  };
  const TOOLS = { axe: '🪓', pick: '⛏️', shovel: '🪏', bucket: '🪣' };
  const TOOL_ORDER = ['axe', 'pick', 'shovel', 'bucket'];
  const TOOL_NAMES = {
    axe: ['Stein-Axt', 'Eisen-Axt', 'Gold-Axt'], pick: ['Stein-Spitzhacke', 'Eisen-Spitzhacke', 'Kristall-Spitzhacke'],
    shovel: ['Holzschaufel', 'Eisenschaufel', 'Goldschaufel'], bucket: ['Holzeimer', 'Großer Eimer', 'Goldeimer']
  };
  const TIER_DOT = ['#9a9a9a', '#cfd8e6', '#ffc533'];
  const KINDS = {
    tree:    { tool: 'axe',    hp: 3, xp: 5,  drops: { wood: 3 },            verb: 'Fällen',   color: '#8a5a2b' },
    cactus:  { tool: 'axe',    hp: 2, xp: 7,  drops: { cactus: 2 },          verb: 'Ernten',   color: '#4f9a3e' },
    rock:    { tool: 'pick',   hp: 3, xp: 5,  drops: { stone: 2 },           verb: 'Abbauen',  color: '#8c8c96' },
    iron:    { tool: 'pick',   hp: 4, xp: 12, drops: { iron: 2, stone: 1 },  verb: 'Abbauen',  color: '#c0652a' },
    ice:     { tool: 'pick',   hp: 4, xp: 16, drops: { ice: 1 },             verb: 'Abbauen',  color: '#a8e6ff' },
    silver:  { tool: 'pick',   hp: 5, xp: 22, drops: { silver: 2 }, tier: 2, verb: 'Abbauen',  color: '#e6edf5' },
    gold:    { tool: 'pick',   hp: 5, xp: 25, drops: { gold: 2 }, tier: 2,   verb: 'Abbauen',  color: '#ffcc33' },
    crystal: { tool: 'pick',   hp: 6, xp: 40, drops: { crystal: 1 }, tier: 2, verb: 'Abbauen', color: '#5ff2ff' },
    water:   { tool: 'bucket', hp: 1, xp: 1,  drops: { water: 1 },           verb: 'Schöpfen', color: '#3d8fe0' },
    earth:   { tool: 'shovel', hp: 1, xp: 1,  drops: { dirt: 1 },            verb: 'Graben',   color: '#6b4423' }
  };
  const RECIPES = [
    { tool: 'axe', tier: 2, cost: { wood: 5, iron: 4 }, desc: 'Fällt Bäume doppelt so schnell' },
    { tool: 'pick', tier: 2, cost: { wood: 5, iron: 6 }, desc: 'Baut Golderz, Silber und Kristall ab' },
    { tool: 'shovel', tier: 2, cost: { wood: 3, iron: 3 }, desc: '2 Erde pro Stich' },
    { tool: 'bucket', tier: 2, cost: { wood: 4, iron: 4 }, desc: '2 Wasser pro Schöpfen' },
    { tool: 'axe', tier: 3, cost: { wood: 15, gold: 5, crystal: 1 }, desc: 'Fällt Bäume dreimal so schnell' },
    { tool: 'pick', tier: 3, cost: { iron: 10, gold: 6, crystal: 3 }, desc: 'Dreifache Abbau-Kraft' },
    { tool: 'shovel', tier: 3, cost: { wood: 5, gold: 4 }, desc: '3 Erde pro Stich' },
    { tool: 'bucket', tier: 3, cost: { wood: 5, gold: 4 }, desc: '3 Wasser pro Schöpfen' }
  ];
  const CLASSES = {
    fighter: { name: 'Kämpfer', e: '⚔️', base: { vit: 7, str: 7, int: 2, dex: 4 }, start: ['w1', 's1'], bonus: '+10 % Leben', color: '#c0392b',
      desc: 'Stark und zäh. Kämpft mit Schwert und Schild. Bonus: +10 % Leben.', shirt: '#b33a3a', pants: '#4a3a2a' },
    mage: { name: 'Zauberer', e: '🔮', base: { vit: 4, str: 3, int: 8, dex: 5 }, start: ['m1'], bonus: '+15 % Erfahrung', color: '#7a3fd1',
      desc: 'Klug und mächtig. Kämpft mit Zauberstab. Bonus: +15 % Erfahrung.', shirt: '#5b3fa8', pants: '#3a2f5a' },
    spy: { name: 'Spion', e: '🗡️', base: { vit: 4, str: 5, int: 4, dex: 7 }, start: ['d1'], bonus: '+10 % Tempo', color: '#2f6f5f',
      desc: 'Flink und geschickt. Kämpft mit Dolchen. Bonus: +10 % Tempo.', shirt: '#2e3a40', pants: '#22282c' }
  };
  const GEAR = {
    w1: { slot: 'weapon', cls: 'fighter', type: 'sword', name: 'Holzschwert', e: '🗡️', price: 15, atk: 3, color: '#b07a45' },
    w2: { slot: 'weapon', cls: 'fighter', type: 'sword', name: 'Bronzeschwert', e: '🗡️', price: 60, atk: 6, color: '#cd7f32' },
    w3: { slot: 'weapon', cls: 'fighter', type: 'sword', name: 'Eisenschwert', e: '🗡️', price: 150, atk: 10, color: '#d5dbe5' },
    w4: { slot: 'weapon', cls: 'fighter', type: 'sword', name: 'Goldsäbel', e: '🗡️', price: 400, atk: 16, color: '#ffc533' },
    w5: { slot: 'weapon', cls: 'fighter', type: 'sword', name: 'Kristallklinge', e: '🗡️', price: 1000, atk: 26, color: '#5ff2ff', glow: true },
    m1: { slot: 'weapon', cls: 'mage', type: 'staff', name: 'Lehrlingsstab', e: '🪄', price: 15, atk: 3, color: '#9fd8ff' },
    m2: { slot: 'weapon', cls: 'mage', type: 'staff', name: 'Eichenstab', e: '🪄', price: 60, atk: 6, color: '#7cff6b' },
    m3: { slot: 'weapon', cls: 'mage', type: 'staff', name: 'Saphirstab', e: '🪄', price: 150, atk: 10, color: '#3d7bff', glow: true },
    m4: { slot: 'weapon', cls: 'mage', type: 'staff', name: 'Sonnenstab', e: '🪄', price: 400, atk: 16, color: '#ffc533', glow: true },
    m5: { slot: 'weapon', cls: 'mage', type: 'staff', name: 'Sternenstab', e: '🪄', price: 1000, atk: 26, color: '#e28bff', glow: true },
    d1: { slot: 'weapon', cls: 'spy', type: 'dagger', name: 'Holzdolch', e: '🔪', price: 15, atk: 3, color: '#b07a45' },
    d2: { slot: 'weapon', cls: 'spy', type: 'dagger', name: 'Bronzedolch', e: '🔪', price: 60, atk: 6, color: '#cd7f32' },
    d3: { slot: 'weapon', cls: 'spy', type: 'dagger', name: 'Stahldolch', e: '🔪', price: 150, atk: 10, color: '#d5dbe5' },
    d4: { slot: 'weapon', cls: 'spy', type: 'dagger', name: 'Giftdolch', e: '🔪', price: 400, atk: 16, color: '#7cff6b', glow: true },
    d5: { slot: 'weapon', cls: 'spy', type: 'dagger', name: 'Schattenklinge', e: '🔪', price: 1000, atk: 26, color: '#8a5cff', glow: true },
    h1: { slot: 'helmet', name: 'Lederkappe', e: '🪖', price: 20, def: 1, color: '#8a5a2b' },
    h2: { slot: 'helmet', name: 'Eisenhelm', e: '🪖', price: 110, def: 3, color: '#c9ced8' },
    h3: { slot: 'helmet', name: 'Goldhelm', e: '🪖', price: 320, def: 5, color: '#ffc533' },
    a1: { slot: 'armor', name: 'Lederweste', e: '🦺', price: 30, def: 2, color: '#8a5a2b' },
    a2: { slot: 'armor', name: 'Kettenhemd', e: '🦺', price: 140, def: 5, color: '#9aa3b0' },
    a3: { slot: 'armor', name: 'Plattenrüstung', e: '🦺', price: 420, def: 9, color: '#d5dbe5', pads: true },
    a4: { slot: 'armor', name: 'Kristallrüstung', e: '🦺', price: 1100, def: 14, color: '#5ff2ff', pads: true, glow: true },
    s1: { slot: 'shield', name: 'Holzschild', e: '🛡️', price: 25, def: 2, color: '#a8743f' },
    s2: { slot: 'shield', name: 'Eisenschild', e: '🛡️', price: 150, def: 4, color: '#c9ced8' },
    s3: { slot: 'shield', name: 'Goldschild', e: '🛡️', price: 380, def: 7, color: '#ffc533' },
    // Kleidung (verändert das Aussehen; ablegen geht nur bis zur Standardkleidung)
    c1: { slot: 'clothes', name: 'Wanderkleidung', e: '👕', price: 40, def: 1, color: '#4f7a3a', shirt: '#4f7a3a', pants: '#5a4630', desc: 'Bequem für lange Wege' },
    c2: { slot: 'clothes', name: 'Edles Gewand', e: '👘', price: 140, def: 1, sell: 0.05, color: '#7a1f4f', shirt: '#7a1f4f', pants: '#2a2a3a', belt: '#ffd23f', desc: '+5 % Verkaufspreis' },
    c3: { slot: 'clothes', name: 'Pelzmantel', e: '🧥', price: 160, def: 3, color: '#e8dcc8', shirt: '#e8dcc8', pants: '#6b5a4a', scarf: '#c0392b', desc: 'Warm und robust (Eisland)' },
    c4: { slot: 'clothes', name: 'Wüstengewand', e: '🥻', price: 160, def: 2, spd: 0.05, color: '#e8d4a0', shirt: '#e8d4a0', pants: '#c9a46a', scarf: '#2f8f9f', desc: '+5 % Tempo (Wüstenland)' },
    c5: { slot: 'clothes', name: 'Bergsteigerjacke', e: '🧥', price: 160, def: 3, color: '#d0452f', shirt: '#d0452f', pants: '#3a3f4a', desc: 'Leuchtend und stabil (Bergland)' },
    c6: { slot: 'clothes', name: 'Waldläufer-Tracht', e: '🦺', price: 90, def: 2, color: '#2f5f3a', shirt: '#2f5f3a', pants: '#4a3a2a', cape: '#1f4a2a', desc: 'Mit grünem Umhang (Grünland)' },
    // Schuhe
    b1: { slot: 'boots', name: 'Lederstiefel', e: '🥾', price: 30, def: 1, spd: 0.05, color: '#7a4a2a', desc: '+5 % Tempo' },
    b2: { slot: 'boots', name: 'Sprintstiefel', e: '👢', price: 80, spd: 0.25, color: '#b8322a', desc: '+25 % Tempo' },
    b3: { slot: 'boots', name: 'Goldstiefel', e: '👢', price: 400, def: 3, spd: 0.3, color: '#ffc533', desc: '+30 % Tempo' },
    // Schmuck
    j1: { slot: 'amulet', name: 'Glücksamulett', e: '🍀', price: 250, luck: 0.2, color: '#4fc35a', desc: '20 % Chance auf doppelte Beute' },
    j2: { slot: 'amulet', name: 'Weisheitsring', e: '💍', price: 300, xp: 0.1, color: '#5fa8ff', desc: '+10 % Erfahrung' },
    j3: { slot: 'amulet', name: 'Händlerring', e: '💍', price: 300, sell: 0.1, color: '#ffc533', desc: '+10 % Verkaufspreis' }
  };
  const SLOTS = [['weapon', 'Waffe', '🗡️'], ['shield', 'Schild', '🛡️'], ['helmet', 'Helm', '🪖'], ['armor', 'Rüstung', '🦺'], ['clothes', 'Kleidung', '👕'], ['boots', 'Schuhe', '🥾'], ['amulet', 'Schmuck', '💍']];
  const CATS = [['all', 'Alle'], ['weapon', 'Waffen'], ['armor', 'Rüstung'], ['clothes', 'Kleidung'], ['items', 'Items'], ['raw', 'Rohstoffe']];
  const catOf = g => g.slot === 'weapon' ? 'weapon' : g.slot === 'clothes' ? 'clothes' : (g.slot === 'amulet' ? 'items' : 'armor');
  const RANKS = [[1, 'Lehrling', '🌱'], [5, 'Abenteurer', '🧭'], [10, 'Veteran', '🛡️'], [15, 'Held', '⭐'], [20, 'Champion', '🏆'], [30, 'Legende', '👑']];
  const rankOf = l => { let r = RANKS[0], next = null; RANKS.forEach((x, i) => { if (l >= x[0]) { r = x; next = RANKS[i + 1] || null; } }); return { r, next }; };
  const ABILITIES = {
    fighter: [[3, '💥', 'Kraftschlag', 'Ein wuchtiger Schlag mit doppeltem Schaden'], [6, '🧱', 'Schildwall', 'Halbiert kurz den erlittenen Schaden'], [10, '🌪️', 'Wirbelsturm', 'Trifft alle Gegner rundherum']],
    mage: [[3, '🔥', 'Feuerball', 'Schleudert einen Feuerball auf Gegner'], [6, '💚', 'Heilzauber', 'Heilt 40 % deiner Lebenspunkte'], [10, '❄️', 'Eissturm', 'Friert alle Gegner in der Nähe ein']],
    spy: [[3, '🧪', 'Giftklinge', 'Vergiftet den Gegner über Zeit'], [6, '💨', 'Schattensprung', 'Springt blitzschnell hinter den Gegner'], [10, '👻', 'Unsichtbarkeit', 'Für kurze Zeit unsichtbar']]
  };
  const SKILLS = [['wood', '🪓', 'Holzfällen'], ['mining', '⛏️', 'Bergbau'], ['digging', '🪏', 'Graben'], ['water', '🪣', 'Wasser schöpfen']];
  const SKILL_OF = { tree: 'wood', cactus: 'wood', rock: 'mining', iron: 'mining', ice: 'mining', silver: 'mining', gold: 'mining', crystal: 'mining', earth: 'digging', water: 'water' };
  const skillLevel = xp => Math.min(20, Math.floor(Math.sqrt((xp || 0) / 4)) + 1);
  const skillXpFor = l => (l - 1) * (l - 1) * 4;
  const GOODS = {
    potion: { name: 'Kleiner Heiltrank', e: '🧪', price: 15, desc: 'Heilt 50 Lebenspunkte' },
    potion2: { name: 'Heiltrank', e: '🧪', price: 45, desc: 'Heilt 130 Lebenspunkte' },
    potion3: { name: 'Großer Heiltrank', e: '⚗️', price: 120, desc: 'Heilt 320 Lebenspunkte' },
    bwood: { name: '5 Holz', e: '🪵', price: 15, give: ['wood', 5], desc: 'Ein Bündel Holz' },
    bstone: { name: '5 Stein', e: '🪨', price: 15, give: ['stone', 5], desc: 'Eine Kiste Steine' },
    biron: { name: '3 Eisen', e: '🔩', price: 40, give: ['iron', 3], desc: 'Drei Eisenbarren' }
  };
  const STATS = [
    ['vit', '❤️', 'Vitalität', 'Mehr Lebenspunkte (+10 pro Punkt)'],
    ['str', '💪', 'Stärke', 'Mehr Angriff und Abbau-Kraft'],
    ['int', '🧠', 'Intelligenz', 'Mehr Erfahrung (XP) und bessere Preise'],
    ['dex', '🏃', 'Geschick', 'Schneller abbauen und laufen']
  ];

  // ---------- Die vier Länder ----------
  const LANDS = {
    gruen: {
      name: 'Grünland', e: '🌳', desc: 'Dein Heimatdorf: Wälder, Wiesen und Teiche.', special: 'Holz, Eisen, Gold, Kristall', card: 'linear-gradient(135deg,#4caf50,#2e7d32)',
      sky: ['#3f86d8', '#8ec3f0', '#cfe6f7', '#e8f1f7'], fog: '#b8d9f5', g1: '#4f9a36', g2: '#8cc84b', shore: '#d8c48a', plaza: '#a88f60', ring: ['#8c8478', '#a39a8c'], sea: '#3f8fd8', pond: '#4da6ff', amp: 1,
      trees: ['pine', 'round'], treeCount: 140, rocks: { rock: 45, iron: 16, gold: 8, crystal: 6 }, tuft: ['#4f9a36', '#6fb43e', '#3d8a2e'], flowers: ['#ff5d73', '#ffd23f', '#ffffff', '#b77cff'],
      ponds: [{ x: 18, z: -20, r: 5 }, { x: -30, z: 26, r: 6 }, { x: 46, z: 38, r: 4.5 }, { x: -48, z: -36, r: 5.5 }, { x: 8, z: 55, r: 5 }],
      shops: [['Mira', '#6fbf73'], ['Borin', '#4a3a32'], ['Hagen', '#7d8794']], light: 1
    },
    eis: {
      name: 'Eisland', e: '❄️', desc: 'Verschneite Wälder und gefrorene Seen. Hier glitzern seltene Eiskristalle.', special: 'Eiskristalle (🧊 wertvoll!)', card: 'linear-gradient(135deg,#7fb8e8,#3d6fa8)',
      sky: ['#6f9fd0', '#b9d4ea', '#e3eef6', '#f4f8fb'], fog: '#e6eef5', g1: '#dde8f0', g2: '#ffffff', shore: '#b8d4ea', plaza: '#b9c4cf', ring: ['#8fa1b3', '#a9b8c6'], sea: '#7fb0d8', pond: '#bfe6ff', frozen: true, amp: 1.3,
      trees: ['snowpine'], treeCount: 120, rocks: { rock: 35, iron: 12, ice: 18, crystal: 6 }, tuft: ['#c9d6dd', '#e9f1f5', '#b5c4cc'], flowers: [], mounds: true,
      ponds: [{ x: 22, z: -18, r: 7 }, { x: -34, z: 22, r: 6 }, { x: 40, z: 45, r: 6 }, { x: -45, z: -40, r: 5 }],
      shops: [['Frida', '#7aa6c9'], ['Bjarne', '#5a4a42'], ['Ulf', '#6d7b8a']], weather: 'snow', light: 0.95
    },
    wueste: {
      name: 'Wüstenland', e: '🏜️', desc: 'Heiße Dünen, Palmen-Oasen und stachelige Kakteen. Gold ist hier häufiger.', special: 'Kaktusfrüchte und viel Golderz', card: 'linear-gradient(135deg,#f0b25a,#c4762a)',
      sky: ['#4a9be0', '#9fd0f2', '#f5e3c0', '#fbecd0'], fog: '#f2dfb8', g1: '#d9b26a', g2: '#f0d79a', shore: '#9fc46a', plaza: '#c9a46a', ring: ['#b08a5a', '#c9a678'], sea: '#2fb4c8', pond: '#2fd0d0', amp: 1.6,
      trees: ['palm'], treeCount: 45, cactus: 45, rocks: { rock: 35, iron: 10, gold: 18, crystal: 5 }, tuft: ['#c9b46a', '#b39c50', '#d8c27a'], flowers: [],
      ponds: [{ x: 20, z: -20, r: 5.5 }, { x: -38, z: 30, r: 6 }, { x: 45, z: 40, r: 4.5 }],
      shops: [['Samira', '#e0a050'], ['Kasim', '#8a3b2b'], ['Omar', '#c9b38a']], light: 1.1
    },
    berg: {
      name: 'Bergland', e: '⛰️', desc: 'Hohe Gipfel mit Schnee, viele Felsen und Silberadern.', special: 'Silbererz und viel Eisen', card: 'linear-gradient(135deg,#8a9aa8,#4f5f6e)',
      sky: ['#3a74c0', '#86b4e6', '#d4e4f2', '#eef3f7'], fog: '#c9d8e6', g1: '#5d8048', g2: '#8fa86a', shore: '#a9a090', plaza: '#8f8a80', ring: ['#6f6a62', '#8a857c'], sea: '#3f6fa8', pond: '#5aa8e8', amp: 4.2, snowLine: 5.5,
      trees: ['pine'], treeCount: 80, rocks: { rock: 70, iron: 26, silver: 14, gold: 6, crystal: 8 }, tuft: ['#5d8048', '#7a9a58', '#4a6a3a'], flowers: ['#ffffff', '#b77cff'],
      ponds: [{ x: 25, z: -25, r: 5 }, { x: -30, z: 35, r: 5 }],
      shops: [['Greta', '#7a8a5a'], ['Thorin', '#5a4030'], ['Brom', '#6a6a72']], light: 1
    }
  };
  const LAND_ORDER = ['gruen', 'eis', 'wueste', 'berg'];
  const SHOP_BASE = [
    { id: 'general', title: 'Gemischtwaren', sign: '🧺 Gemischtwaren', x: -8.5, z: 6.5, awning: ['#e94f64', '#fff4e0'],
      greet: '„Hallo! Ich kaufe deine Rohstoffe und hab allerlei Nützliches.“', goods: 'general', buys: true,
      look: { skin: '#f2c9a0', pants: '#5b4636', boots: '#5b3a22', hair: '#c0392b', hairStyle: 'long', skirt: '#3d7bd9', apron: '#fff4e0', lashes: true } },
    { id: 'weapons', title: 'Waffenhändler', sign: '⚔️ Waffen', x: 0, z: 10, awning: ['#3a4b8c', '#e8e8f0'],
      greet: '„Für jede Klasse die richtige Waffe!“', goods: 'weapons',
      look: { skin: '#d9a07a', pants: '#2e2a2a', boots: '#1f1a17', hair: '#2b2b2b', hairStyle: 'short', beard: '#2b2b2b', apron: '#6b4a2b' } },
    { id: 'armor', title: 'Rüstungshändler', sign: '🛡️ Rüstungen', x: 8.5, z: 6.5, awning: ['#2f8f6f', '#f0ede0'],
      greet: '„Wer gut geschützt ist, kommt weiter. Schau dich um!“', goods: ['h1', 'a1', 's1', 'b1', 'h2', 'a2', 's2', 'b2', 'h3', 'a3', 's3', 'b3', 'a4'],
      look: { skin: '#8d5a3b', pants: '#3a3f4a', boots: '#2a2a2a', hairStyle: 'bald', beard: '#e0e0e0' } }
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
    { id: 'sell1', e: '🤝', name: 'Händler', desc: 'Verkaufe deine ersten Rohstoffe', test: s => (s.stats.sold || 0) >= 1 },
    { id: 'weapon1', e: '🗡️', name: 'Bewaffnet', desc: 'Kaufe deine erste Waffe', test: s => Object.keys(s.owned).some(k => GEAR[k] && GEAR[k].slot === 'weapon' && !CLASSES[s.hero && s.hero.cls || 'fighter'].start.includes(k)) },
    { id: 'armorset', e: '🛡️', name: 'Gepanzert', desc: 'Trage Helm, Rüstung und Schild', test: s => s.gear.helmet && s.gear.armor && s.gear.shield },
    { id: 'stat1', e: '📈', name: 'Trainiert', desc: 'Verteile deinen ersten Statuspunkt', test: s => (s.stats.spent || 0) >= 1 },
    { id: 'travel1', e: '🧭', name: 'Reisende Seele', desc: 'Reise in ein anderes Land', test: s => Object.keys(s.visited || {}).length >= 2 },
    { id: 'travelall', e: '🌍', name: 'Weltenbummler', desc: 'Besuche alle vier Länder', test: s => Object.keys(s.visited || {}).length >= 4 },
    { id: 'dress', e: '👗', name: 'Modebewusst', desc: 'Trage neue Kleidung', test: s => !!s.gear.clothes },
    { id: 'skill5', e: '🎓', name: 'Fachkraft', desc: 'Bringe eine Sammel-Fähigkeit auf Stufe 5', test: s => Object.values(s.skills || {}).some(x => skillLevel(x) >= 5) },
    { id: 'hunt1', e: '🏹', name: 'Erste Jagd', desc: 'Besiege dein erstes Tier', test: s => (s.stats.kills || 0) >= 1 },
    { id: 'hunt50', e: '🐾', name: 'Großwildjäger', desc: 'Besiege 50 Tiere', test: s => (s.stats.kills || 0) >= 50 },
    { id: 'polar', e: '❄️', name: 'Eisbärbezwinger', desc: 'Besiege einen Eisbären (Stufe 2)', test: s => (s.stats.m_eisbaer || 0) >= 1 },
    { id: 'scorp', e: '🦂', name: 'Wüstenkrieger', desc: 'Besiege einen Riesenskorpion (Stufe 3)', test: s => (s.stats.m_skorpion || 0) >= 1 },
    { id: 'cave', e: '🐻', name: 'Bärenstark', desc: 'Besiege einen Höhlenbären (Stufe 4)', test: s => (s.stats.m_hoehlenbaer || 0) >= 1 },
    { id: 'loot1', e: '✨', name: 'Glückspilz', desc: 'Finde seltene Beute bei einem Tier', test: s => (s.stats.loot || 0) >= 1 },
    { id: 'ice1', e: '🧊', name: 'Eisbrecher', desc: 'Baue einen Eiskristall ab', test: s => (s.stats.ice || 0) >= 1 },
    { id: 'silver1', e: '🥈', name: 'Silberader', desc: 'Baue Silbererz ab', test: s => (s.stats.silver || 0) >= 1 },
    { id: 'rich', e: '💰', name: 'Wohlhabend', desc: 'Verdiene insgesamt 1000 Cim', test: s => (s.stats.earned || 0) >= 1000 },
    { id: 'lvl5', e: '⭐', name: 'Abenteurer', desc: 'Erreiche Level 5', test: s => s.level >= 5 },
    { id: 'master', e: '👑', name: 'Meister', desc: 'Alle Werkzeuge auf Stufe 3', test: s => TOOL_ORDER.every(t => s.tools[t] >= 3) }
  ];
  const xpNeed = l => Math.round(40 * Math.pow(l, 1.5));
  const POINTS_PER_LEVEL = 3;

  // ---------- Spielstand ----------
  const SAVE_KEY = 'cimacu-save-v1';
  let S = {
    inv: {}, tools: { axe: 1, pick: 1, shovel: 1, bucket: 1 }, eq: 'axe', xp: 0, level: 1, ach: {}, stats: {},
    money: 25, gear: { weapon: null, shield: null, helmet: null, armor: null, clothes: null, boots: null, amulet: null }, owned: {}, perks: {}, potions: 0,
    stat: { vit: 5, str: 5, int: 5, dex: 5 }, points: 0, hp: null, hero: null, land: 'gruen', visited: { gruen: 1 }, skills: {}, started: Date.now()
  };
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d) { if (!d.stat) d.points = ((d.level || 1) - 1) * POINTS_PER_LEVEL; S = Object.assign(S, d); }
  } catch (e) { }
  S.gear = Object.assign({ weapon: null, shield: null, helmet: null, armor: null, clothes: null, boots: null, amulet: null }, S.gear);
  S.skills = S.skills || {};
  S.bag = S.bag || {};
  if (S.potions) { S.bag.potion = (S.bag.potion || 0) + S.potions; S.potions = 0; }
  // Alte Spielstände: Sprintstiefel & Glücksamulett werden zu echten Ausrüstungsteilen
  if (S.perks && S.perks.boots) { S.owned.b2 = true; if (!S.gear.boots) S.gear.boots = 'b2'; delete S.perks.boots; }
  if (S.perks && S.perks.amulet) { S.owned.j1 = true; if (!S.gear.amulet) S.gear.amulet = 'j1'; delete S.perks.amulet; }
  if (!LANDS[S.land]) S.land = 'gruen';
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } };

  const cls = () => (S.hero && CLASSES[S.hero.cls]) ? S.hero.cls : 'fighter';
  const derived = () => {
    const s = S.stat, c = cls();
    let atk = 1 + s.str, def = 0, spd = 0, xp = 0, sell = 0, luck = 0;
    SLOTS.forEach(([slot]) => {
      const g = S.gear[slot] && GEAR[S.gear[slot]];
      if (g) { atk += g.atk || 0; def += g.def || 0; spd += g.spd || 0; xp += g.xp || 0; sell += g.sell || 0; luck += g.luck || 0; }
    });
    return {
      hpMax: Math.round((50 + s.vit * 10) * (c === 'fighter' ? 1.1 : 1)), atk, def, luck,
      power: 1 + (s.str - 5) * 0.08,
      swing: (1 + (s.dex - 5) * 0.05) * (c === 'spy' ? 1.1 : 1),
      speed: (1 + (s.dex - 5) * 0.015) * (c === 'spy' ? 1.1 : 1) * (1 + spd),
      xpBonus: (s.int - 5) * 0.04 + (c === 'mage' ? 0.15 : 0) + xp,
      sellBonus: (s.int - 5) * 0.02 + sell
    };
  };
  const sellPrice = i => Math.max(1, Math.round(SELL[i] * (1 + derived().sellBonus)));
  if (S.hp == null) S.hp = derived().hpMax;

  // =====================================================================
  // Licht, Himmel, Materialien, Bau-Helfer
  // =====================================================================
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.2, 1, 0.1), scene);
  hemi.diffuse = new BABYLON.Color3(1, 0.97, 0.9);
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.35), scene);
  sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

  const skyTex = new BABYLON.DynamicTexture('skyT', { width: 4, height: 256 }, scene, false);
  const sky = MB.CreateSphere('sky', { diameter: 350, segments: 12, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  const skyM = new BABYLON.StandardMaterial('skyM', scene);
  skyM.emissiveTexture = skyTex; skyM.disableLighting = true; skyM.fogEnabled = false; skyM.backFaceCulling = false;
  sky.material = skyM; sky.infiniteDistance = true; sky.isPickable = false;

  const matCache = {};
  const smat = (hex, spec, glow, alpha) => {
    const key = hex + '|' + (spec || 0) + '|' + (glow || 0) + '|' + (alpha || 1);
    if (matCache[key]) return matCache[key];
    const m = new BABYLON.StandardMaterial('s' + key, scene);
    m.diffuseColor = C3(hex);
    const s = spec === undefined ? 0.12 : spec;
    m.specularColor = new BABYLON.Color3(s, s, s); m.specularPower = 40;
    if (glow) m.emissiveColor = C3(hex).scale(glow);
    if (alpha) m.alpha = alpha;
    return (matCache[key] = m);
  };
  const vcMat = new BABYLON.StandardMaterial('vc', scene);
  vcMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  vcMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); vcMat.specularPower = 32;
  const vcGlow = new BABYLON.StandardMaterial('vcGlow', scene);
  vcGlow.diffuseColor = new BABYLON.Color3(1, 1, 1); vcGlow.emissiveColor = new BABYLON.Color3(0.25, 0.35, 0.45);
  vcGlow.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8); vcGlow.specularPower = 64; vcGlow.alpha = 0.92;

  const TN = (name, parent) => { const t = new BABYLON.TransformNode(name, scene); if (parent) t.parent = parent; return t; };
  const VC = (m, hex) => {
    const c = C3(hex), n = m.getTotalVertices(), a = new Float32Array(n * 4);
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
    poly: o => MB.CreatePolyhedron('p', o, scene),
    ico: o => MB.CreateIcoSphere('p', o, scene)
  };
  const part = (type, o, hex, x, y, z, s, r) => {
    const m = SHAPES[type](o);
    m.position.set(x, y, z);
    if (s) m.scaling.set(s[0], s[1], s[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    return hex ? VC(m, hex) : m;
  };
  const group = (name, parts, parent, material) => {
    const m = BABYLON.Mesh.MergeMeshes(parts, true, true);
    m.name = name; m.material = material || vcMat; m.isPickable = false;
    if (parent) m.parent = parent;
    return m;
  };

  // Weiche Fleck-Schatten
  const blobTex = new BABYLON.DynamicTexture('blobT', { width: 64, height: 64 }, scene, false);
  { const c = blobTex.getContext(); const g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); blobTex.update(); blobTex.hasAlpha = true; }
  const blobMat = new BABYLON.StandardMaterial('blobM', scene);
  blobMat.diffuseColor = BABYLON.Color3.Black(); blobMat.specularColor = BABYLON.Color3.Black();
  blobMat.opacityTexture = blobTex; blobMat.disableLighting = true; blobMat.zOffset = -2;
  const blob = MB.CreateGround('blob', { width: 1, height: 1 }, scene);
  blob.material = blobMat; blob.isVisible = false; blob.isPickable = false;
  const addBlob = (x, y, z, size) => { const b = blob.createInstance('bl'); b.position.set(x, y + 0.06, z); b.scaling.set(size, 1, size); b.isPickable = false; return b; };

  // =====================================================================
  // Land bauen (wird beim Reisen komplett neu aufgebaut)
  // =====================================================================
  const WORLD = 90;
  let L = LANDS[S.land], landStuff = [], landMats = [];
  let nodes = [], solids = [], npcs = [], PONDS = [], holes = [], holeIdx = 0, SHOPS = [], portal = null, snow = null, pondMat = null;

  const baseHeight = (x, z) => {
    const d = Math.sqrt(x * x + z * z);
    const flat = Math.min(1, Math.max(0, (d - 15) / 15));
    const a = L.amp;
    let h = Math.sin(x * 0.09) * Math.cos(z * 0.11) * 2.2 + Math.sin((x + z) * 0.05) * 1.5;
    if (a > 2) h += Math.max(0, Math.sin(x * 0.045 + 1) * Math.cos(z * 0.05)) * 3.5;
    return h * a * flat;
  };
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

  const makeSign = (id, text, bg) => {
    const tex = new BABYLON.DynamicTexture('signT' + id, { width: 512, height: 128 }, scene, true);
    const ctx = tex.getContext();
    ctx.fillStyle = bg || '#5a3a1e'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#f7ecd2'; ctx.fillRect(8, 8, 496, 112);
    ctx.fillStyle = '#3a2a1a'; ctx.font = 'bold 56px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 68);
    tex.update();
    const m = new BABYLON.StandardMaterial('signM' + id, scene);
    m.diffuseTexture = tex; m.emissiveColor = new BABYLON.Color3(0.45, 0.45, 0.45); m.specularColor = BABYLON.Color3.Black(); m.backFaceCulling = false;
    landMats.push(m);
    const p = MB.CreatePlane('sign' + id, { width: 2.6, height: 0.65 }, scene);
    p.material = m; p.isPickable = false; p.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    return p;
  };

  function buildLand(id) {
    // Altes Land entfernen
    landStuff.forEach(o => { if (!o.isDisposed()) o.dispose(false, false); });
    landMats.forEach(m => m.dispose(true, true));
    landStuff = []; landMats = [];
    if (snow) { snow.dispose(); snow = null; }
    L = LANDS[id];
    nodes = []; solids = [{ x: 0, z: 1, r: 1.25 }]; npcs = []; holes = []; holeIdx = 0;
    PONDS = L.ponds.map(p => Object.assign({}, p));
    PONDS.forEach(p => { p.level = baseHeight(p.x, p.z); });

    const m0 = new Set(scene.meshes), t0 = new Set(scene.transformNodes);

    // Himmel, Nebel, Licht
    { const c = skyTex.getContext(); const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, L.sky[0]); g.addColorStop(0.45, L.sky[1]); g.addColorStop(0.6, L.sky[2]); g.addColorStop(1, L.sky[3]);
      c.fillStyle = g; c.fillRect(0, 0, 4, 256); skyTex.update(); }
    scene.fogColor = C3(L.fog); scene.clearColor = BABYLON.Color4.FromColor3(C3(L.fog), 1);
    hemi.intensity = 0.75 * L.light; sun.intensity = 0.85 * L.light;
    hemi.groundColor = id === 'eis' ? new BABYLON.Color3(0.6, 0.66, 0.75) : new BABYLON.Color3(0.42, 0.4, 0.5);
    ip.exposure = id === 'eis' ? 1.05 : 1.25;

    // Boden mit Farben je Fläche
    const ground = MB.CreateGround('ground', { width: 200, height: 200, subdivisions: 70, updatable: true }, scene);
    const pos = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) pos[i + 1] = heightAt(pos[i], pos[i + 2]);
    ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    ground.convertToFlatShadedMesh();
    const gp = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const cols = new Float32Array(gp.length / 3 * 4);
    const g1 = C3(L.g1), g2 = C3(L.g2), shore = C3(L.shore), plazaC = C3(L.plaza), snowC = C3('#f4f8fb'), rockC = C3('#8a8478'), tmp = new BABYLON.Color3();
    let sd = 3; const r2 = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < gp.length; i += 9) {
      const cx = (gp[i] + gp[i + 3] + gp[i + 6]) / 3, cy = (gp[i + 1] + gp[i + 4] + gp[i + 7]) / 3, cz = (gp[i + 2] + gp[i + 5] + gp[i + 8]) / 3;
      const n = (Math.sin(cx * 0.21 + cz * 0.13) + Math.sin(cx * 0.07 - cz * 0.19)) * 0.25 + 0.5;
      BABYLON.Color3.LerpToRef(g1, g2, Math.min(1, Math.max(0, n + (r2() - 0.5) * 0.18 + cy * 0.04)), tmp);
      if (L.snowLine) {
        if (cy > L.snowLine * 0.55) BABYLON.Color3.LerpToRef(tmp, rockC, Math.min(1, (cy - L.snowLine * 0.55) / 2), tmp);
        if (cy > L.snowLine) BABYLON.Color3.LerpToRef(tmp, snowC, Math.min(1, (cy - L.snowLine) / 1.5), tmp);
      }
      for (const p of PONDS) { const d = Math.hypot(cx - p.x, cz - p.z); if (d < p.r + 2) BABYLON.Color3.LerpToRef(tmp, shore, Math.min(1, (p.r + 2 - d) / 2), tmp); }
      const dc = Math.hypot(cx, cz);
      if (dc < 15.5) BABYLON.Color3.LerpToRef(tmp, plazaC, Math.min(1, (15.5 - dc) / 2) * 0.8, tmp);
      if (dc > WORLD + 2) BABYLON.Color3.LerpToRef(tmp, shore, Math.min(1, (dc - WORLD - 2) / 4), tmp);
      for (let k = 0; k < 3; k++) { const j = (i / 3 + k) * 4; cols[j] = tmp.r; cols[j + 1] = tmp.g; cols[j + 2] = tmp.b; cols[j + 3] = 1; }
    }
    ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, cols);
    const gm = new BABYLON.StandardMaterial('groundM', scene);
    gm.diffuseColor = new BABYLON.Color3(1, 1, 1); gm.specularColor = id === 'eis' ? new BABYLON.Color3(0.15, 0.15, 0.2) : BABYLON.Color3.Black();
    ground.material = gm; landMats.push(gm);

    // Marktplatz
    const plaza = MB.CreateDisc('plaza', { radius: 13.5, tessellation: 40 }, scene);
    plaza.rotation.x = Math.PI / 2; plaza.position.y = 0.03; plaza.material = smat(L.plaza, 0);
    const decor = [];
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      decor.push(part('cyl', { diameter: 1.15, height: 0.12, tessellation: 6 }, L.ring[i % 2], Math.cos(a) * 13.3, 0.06, Math.sin(a) * 13.3));
    }
    decor.push(part('cyl', { diameter: 2.3, height: 0.8, tessellation: 18 }, '#8e8e9a', 0, 0.4, 1));
    decor.push(part('tor', { diameter: 2.2, thickness: 0.18, tessellation: 22 }, '#a3a3ae', 0, 0.82, 1));
    decor.push(part('cyl', { diameter: 1.8, height: 0.02, tessellation: 18 }, L.frozen ? '#cfeaff' : '#3d8fe0', 0, 0.75, 1));
    [-1, 1].forEach(s => decor.push(part('cyl', { diameter: 0.14, height: 1.6, tessellation: 6 }, '#6b4526', 0.95 * s, 1.4, 1)));
    decor.push(part('box', { width: 2.3, height: 0.12, depth: 0.12 }, '#6b4526', 0, 2.2, 1));
    decor.push(part('cyl', { diameterTop: 0.3, diameterBottom: 0.36, height: 0.3, tessellation: 10 }, '#7a5530', 0, 1.6, 1));
    group('decor', decor).freezeWorldMatrix();
    addBlob(0, 0, 1, 3.6);

    const sea = MB.CreateGround('sea', { width: 600, height: 600 }, scene);
    sea.position.y = -4.5; sea.material = smat(L.sea, 0.3);
    pondMat = new BABYLON.StandardMaterial('pondM', scene);
    pondMat.diffuseColor = C3(L.pond); pondMat.emissiveColor = C3(L.pond).scale(0.2);
    pondMat.alpha = L.frozen ? 0.95 : 0.85; pondMat.specularColor = new BABYLON.Color3(0.7, 0.7, 0.7); pondMat.specularPower = 64;
    landMats.push(pondMat);
    PONDS.forEach((p, i) => {
      const w = MB.CreateDisc('pond' + i, { radius: p.r + 0.3, tessellation: 22 }, scene);
      w.rotation.x = Math.PI / 2; w.position.set(p.x, p.level - 0.12, p.z); w.material = pondMat; w.isPickable = false;
      w.freezeWorldMatrix();
    });

    // ---------- Quellen für Bäume, Steine usw. ----------
    let seed = 7 + LAND_ORDER.indexOf(id) * 1000;
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
    const src = {};
    const hide = m => { m.isVisible = false; m.isPickable = false; return m; };
    src.trunk = hide(group('trunkS', [part('cyl', { height: 2, diameterTop: 0.45, diameterBottom: 0.7, tessellation: 7 }, '#7a5232', 0, 0, 0)]));
    src.pine = hide(MB.CreateCylinder('pineS', { height: 4, diameterTop: 0, diameterBottom: 3.4, tessellation: 7, subdivisions: 2 }, scene));
    src.pine.convertToFlatShadedMesh(); src.pine.material = smat(id === 'berg' ? '#24563a' : '#2f7a46', 0.05);
    src.round = hide(MB.CreateIcoSphere('roundS', { radius: 1.9, subdivisions: 1 }, scene)); src.round.material = smat('#7fb53a', 0.05);
    src.snowpine = hide(group('snowpineS', [
      part('cyl', { height: 4, diameterTop: 0, diameterBottom: 3.4, tessellation: 7 }, '#2e5e4a', 0, 0, 0),
      part('cyl', { height: 1.5, diameterTop: 0, diameterBottom: 1.6, tessellation: 7 }, '#f4f8fb', 0, 1.3, 0),
      part('cyl', { height: 0.35, diameterTop: 2.2, diameterBottom: 3.0, tessellation: 7 }, '#f4f8fb', 0, -0.6, 0)]));
    src.palmTrunk = hide(group('palmT', [0, 1, 2, 3].map(i => part('cyl', { height: 1.1, diameterTop: 0.36, diameterBottom: 0.46, tessellation: 7 }, i % 2 ? '#a27a4a' : '#8a6438', Math.sin(i * 0.15) * 0.25 * i, i * 1.0, 0, null, [0, 0, -0.08 * i]))));
    src.palmLeaves = hide(group('palmL', [0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = i / 7 * Math.PI * 2;
      return part('box', { width: 0.55, height: 0.06, depth: 2.4 }, i % 2 ? '#3f9a3a' : '#5fb84a', Math.sin(a) * 1.0, -0.25, Math.cos(a) * 1.0, null, [0.45, a, 0]);
    }).concat([part('sph', { diameter: 0.5, segments: 6 }, '#6b4a2a', 0, -0.15, 0)])));
    src.cactus = hide(group('cactusS', [
      part('caps', { radius: 0.35, height: 2.4, tessellation: 10 }, '#3f8a3a', 0, 1.2, 0),
      part('caps', { radius: 0.22, height: 0.9, tessellation: 8 }, '#4a9a42', 0.55, 1.5, 0),
      part('caps', { radius: 0.22, height: 0.5, tessellation: 8 }, '#4a9a42', 0.35, 1.1, 0, null, [0, 0, Math.PI / 2]),
      part('caps', { radius: 0.2, height: 0.8, tessellation: 8 }, '#4a9a42', -0.5, 1.9, 0),
      part('caps', { radius: 0.2, height: 0.45, tessellation: 8 }, '#4a9a42', -0.32, 1.55, 0, null, [0, 0, Math.PI / 2]),
      part('sph', { diameter: 0.25, segments: 6 }, '#ff5d9a', 0, 2.42, 0), part('sph', { diameter: 0.2, segments: 6 }, '#ff8ab8', 0.55, 1.98, 0)]));
    src.rock = hide(MB.CreateIcoSphere('rockS', { radius: 1, subdivisions: 1 }, scene));
    src.rock.material = smat(id === 'wueste' ? '#c49a6a' : id === 'eis' ? '#a9b8c6' : '#8f8f9a', 0.08);
    src.dark = hide(MB.CreateIcoSphere('darkS', { radius: 1, subdivisions: 1 }, scene)); src.dark.material = smat('#5f5a68', 0.08);
    src.snowcap = hide(MB.CreateSphere('capS', { diameter: 1.9, segments: 8, slice: 0.5 }, scene)); src.snowcap.material = smat('#f4f8fb', 0.2);
    const ores = { iron: ['#c76a2c', 0.12], gold: ['#ffcf33', 0.35], crystal: ['#5ff2ff', 0.6], silver: ['#e6edf5', 0.35] };
    Object.keys(ores).forEach(k => { const o = hide(MB.CreatePolyhedron('ore_' + k, { type: 1, size: 0.32 }, scene)); o.material = smat(ores[k][0], 0.6, ores[k][1]); src['ore_' + k] = o; });
    src.ice = hide(group('iceS', [0, 1, 2, 3, 4].map(i => {
      const a = i / 5 * Math.PI * 2;
      return part('poly', { type: 1, size: 0.4 }, i % 2 ? '#bfefff' : '#8fd8ff', i ? Math.cos(a) * 0.45 : 0, i ? 0.6 : 1.0, i ? Math.sin(a) * 0.45 : 0, [1, i ? 2.2 : 3.2, 1], [i ? Math.sin(a) * 0.4 : 0, a, i ? Math.cos(a) * 0.4 : 0]);
    }), null, vcGlow));

    const addPart = (s, n, x, y, z, sx, sy, sz, ry, rx, rz) => {
      const m = s.createInstance('i');
      m.position.set(x, y, z); m.scaling.set(sx, sy, sz); m.rotation.set(rx || 0, ry || 0, rz || 0); m.isPickable = false;
      n.parts.push({ m, base: m.position.clone(), scale: m.scaling.clone() });
      return m;
    };
    const makeNode = (kind, x, z, r) => { const n = { kind, x, z, r, hp: KINDS[kind].hp, alive: true, parts: [], shake: 0, dying: 0, respawn: 0, hidden: false, hideIdx: [] }; nodes.push(n); return n; };
    const finishNode = (n, size) => { const y = heightAt(n.x, n.z); const b = addBlob(n.x, y, n.z, size); n.parts.push({ m: b, base: b.position.clone(), scale: b.scaling.clone() }); };

    for (let i = 0; i < L.treeCount; i++) {
      const p = freeSpot(1, 17, WORLD - 2); if (!p) continue;
      const y = heightAt(p.x, p.z), s = 0.8 + rand() * 0.7;
      const n = makeNode('tree', p.x, p.z, 0.5 * s);
      const type = L.trees[Math.floor(rand() * L.trees.length)];
      if (type === 'palm') {
        addPart(src.palmTrunk, n, p.x, y + 0.5 * s, p.z, s, s, s, rand() * 6);
        const top = n.parts[0].m; top.computeWorldMatrix(true);
        addPart(src.palmLeaves, n, p.x + Math.cos(-top.rotation.y) * 0.6 * s, y + 4.2 * s, p.z + Math.sin(-top.rotation.y) * 0.6 * s, s, s, s, rand() * 6);
        n.hideIdx = [1];
      } else {
        addPart(src.trunk, n, p.x, y + s, p.z, s, s, s);
        const crownSrc = type === 'round' ? src.round : type === 'snowpine' ? src.snowpine : src.pine;
        addPart(crownSrc, n, p.x, y + (type === 'round' ? 3.4 : 3.8) * s, p.z, s, s, s, rand() * 6);
        n.hideIdx = [1];
      }
      finishNode(n, 3.2 * s);
    }
    for (let i = 0; i < (L.cactus || 0); i++) {
      const p = freeSpot(1, 17, WORLD - 2); if (!p) continue;
      const s = 0.8 + rand() * 0.5, n = makeNode('cactus', p.x, p.z, 0.45 * s);
      addPart(src.cactus, n, p.x, heightAt(p.x, p.z), p.z, s, s, s, rand() * 6);
      finishNode(n, 1.8 * s);
    }
    const addRock = (kind, dMin, dMax, count) => {
      for (let i = 0; i < count; i++) {
        const p = freeSpot(1.5, dMin, dMax); if (!p) continue;
        const y = heightAt(p.x, p.z);
        if (kind === 'ice') {
          const s = 0.9 + rand() * 0.5, n = makeNode('ice', p.x, p.z, 0.7 * s);
          addPart(src.ice, n, p.x, y, p.z, s, s, s, rand() * 6);
          finishNode(n, 2 * s); continue;
        }
        const s = kind === 'rock' ? 0.6 + rand() * 1.0 : 0.9 + rand() * 0.4;
        const n = makeNode(kind, p.x, p.z, 0.9 * s);
        addPart(kind === 'rock' ? src.rock : src.dark, n, p.x, y + 0.2 * s, p.z, s * 1.2, s * 0.8, s, rand() * 6, rand() * 0.4, rand() * 0.4);
        if (id === 'eis' && kind === 'rock') addPart(src.snowcap, n, p.x, y + 0.55 * s, p.z, s * 1.1, s * 0.6, s * 0.95, rand() * 6);
        if (kind !== 'rock') {
          const cnt = 3 + Math.floor(rand() * 2);
          for (let c = 0; c < cnt; c++) {
            const a = (c / cnt) * Math.PI * 2 + rand();
            const st = kind === 'crystal' ? 1.4 + rand() * 0.8 : 1;
            addPart(src['ore_' + kind], n, p.x + Math.cos(a) * 0.55 * s, y + 0.55 * s + rand() * 0.2, p.z + Math.sin(a) * 0.55 * s, 1, st, 1, rand() * 6, (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8);
          }
        }
        finishNode(n, 2.6 * s);
      }
    };
    const R = L.rocks;
    addRock('rock', 17, WORLD - 2, R.rock || 0);
    addRock('iron', 17, 50, R.iron || 0);
    addRock('ice', 20, WORLD - 3, R.ice || 0);
    addRock('silver', 30, WORLD - 3, R.silver || 0);
    addRock('gold', id === 'wueste' ? 22 : 35, WORLD - 3, R.gold || 0);
    addRock('crystal', 55, WORLD - 3, R.crystal || 0);

    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      const x = Math.cos(a) * (WORLD + 1.5), z = Math.sin(a) * (WORLD + 1.5);
      const r = src.rock.createInstance('b'), s = 1.2 + rand();
      r.position.set(x, heightAt(x, z), z); r.scaling.set(s, s * 1.4, s); r.rotation.y = rand() * 6;
      r.isPickable = false; r.freezeWorldMatrix();
    }

    // Gras, Blumen, Schneehügel
    const tuft = hide(group('tuft', [0, 1, 2].map(i => part('cyl', { diameterTop: 0, diameterBottom: 0.16, height: 0.55 + i * 0.12, tessellation: 3 }, L.tuft[i],
      Math.cos(i * 2.1) * 0.08, 0.27 + i * 0.06, Math.sin(i * 2.1) * 0.08, null, [Math.cos(i * 2.1) * 0.3, 0, Math.sin(i * 2.1) * 0.3]))));
    const deco = [tuft];
    L.flowers.forEach(hex => deco.push(hide(group('flower', [part('cyl', { diameter: 0.04, height: 0.4, tessellation: 4 }, '#3d8a2e', 0, 0.2, 0), part('sph', { diameter: 0.18, segments: 6 }, hex, 0, 0.42, 0), part('sph', { diameter: 0.08, segments: 4 }, '#ffb400', 0, 0.47, 0.04)]))));
    if (L.mounds) deco.push(hide(group('mound', [part('sph', { diameter: 1.2, segments: 8 }, '#ffffff', 0, 0, 0, [1, 0.35, 1])])));
    if (id === 'wueste') deco.push(hide(group('pebble', [part('ico', { radius: 0.18, subdivisions: 1 }, '#b08a5a', 0, 0.08, 0), part('ico', { radius: 0.12, subdivisions: 1 }, '#9a7a4a', 0.25, 0.05, 0.1)])));
    for (let i = 0; i < 500; i++) {
      const a = rand() * Math.PI * 2, d = 15 + rand() * (WORLD - 16), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (PONDS.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 0.5)) continue;
      const s0 = rand() < 0.8 || deco.length === 1 ? tuft : deco[1 + Math.floor(rand() * (deco.length - 1))];
      const g = s0.createInstance('g'); const s = 0.8 + rand() * 0.7;
      g.position.set(x, heightAt(x, z), z); g.scaling.setAll(s); g.rotation.y = rand() * 6; g.isPickable = false;
      g.freezeWorldMatrix();
    }

    const holeMat = smat(id === 'eis' ? '#9fb3c4' : id === 'wueste' ? '#a8844e' : '#5e4026', 0);
    for (let i = 0; i < 30; i++) {
      const h = MB.CreateDisc('hole' + i, { radius: 0.55, tessellation: 9 }, scene);
      h.rotation.x = Math.PI / 2; h.material = holeMat; h.isVisible = false; h.isPickable = false;
      holes.push(h);
    }

    // Händler-Stände
    SHOPS = SHOP_BASE.map((b, i) => Object.assign({}, b, { name: L.shops[i][0], look: Object.assign({}, b.look, { shirt: L.shops[i][1] }) }));
    SHOPS.forEach(s => {
      const node = TN('stall' + s.id);
      node.position.set(s.x, heightAt(s.x, s.z), s.z);
      const ry = Math.atan2(0 - s.x, -1 - s.z);
      node.rotation.y = ry;
      const W = id === 'eis' ? '#8a6a4c' : '#9a6a3c', D = '#6b4526', P = [];
      P.push(part('box', { width: 3, height: 1.0, depth: 0.75 }, W, 0, 0.5, 1.15));
      P.push(part('box', { width: 3.2, height: 0.09, depth: 0.9 }, D, 0, 1.05, 1.15));
      [[-1.5, -0.8], [1.5, -0.8], [-1.5, 1.55], [1.5, 1.55]].forEach(([x, z]) => P.push(part('cyl', { diameter: 0.14, height: 2.9, tessellation: 6 }, D, x, 1.45, z)));
      for (let i = 0; i < 7; i++) P.push(part('box', { width: 0.48, height: 0.06, depth: 3.0 }, s.awning[i % 2], -1.44 + i * 0.48, 2.95, 0.4, null, [0.22, 0, 0]));
      if (id === 'eis') P.push(part('box', { width: 3.4, height: 0.12, depth: 3.1 }, '#f4f8fb', 0, 3.05, 0.4, null, [0.22, 0, 0]));
      P.push(part('box', { width: 3.36, height: 0.25, depth: 0.04 }, s.awning[0], 0, 2.55, 1.9, null, [0.22, 0, 0]));
      if (s.id === 'general') {
        P.push(part('cyl', { diameter: 0.7, height: 0.9, tessellation: 12 }, W, -2.1, 0.45, 1.3));
        P.push(part('box', { size: 0.6 }, D, 2.1, 0.3, 1.3));
        for (let i = 0; i < 5; i++) P.push(part('sph', { diameter: 0.18, segments: 6 }, i % 2 ? '#d63a3a' : '#7cc242', -0.9 + i * 0.13, 1.18, 1.1 + (i % 2) * 0.12));
        P.push(part('cyl', { diameter: 0.16, height: 0.28, tessellation: 8 }, '#e94fb0', 0.6, 1.24, 1.1));
        P.push(part('cyl', { diameter: 0.16, height: 0.28, tessellation: 8 }, '#4fb0e9', 0.85, 1.24, 1.2));
      } else if (s.id === 'weapons') {
        P.push(part('box', { width: 0.09, height: 0.9, depth: 0.03 }, '#d5dbe5', -0.8, 1.55, 1.05));
        P.push(part('box', { width: 0.3, height: 0.05, depth: 0.08 }, '#4a2e18', -0.8, 1.12, 1.05));
        P.push(part('cyl', { diameter: 0.06, height: 1.3, tessellation: 6 }, '#6b4526', 0, 1.7, 1.05));
        P.push(part('sph', { diameter: 0.22, segments: 8 }, '#3d7bff', 0, 2.4, 1.05));
        P.push(part('box', { width: 0.07, height: 0.4, depth: 0.03 }, '#7cff6b', 0.8, 1.3, 1.05));
        P.push(part('cyl', { diameterTop: 0.5, diameterBottom: 0.35, height: 0.5, tessellation: 6 }, '#3a3a44', 2.1, 0.25, 1.4));
      } else {
        P.push(part('sph', { diameter: 0.5, segments: 10, slice: 0.55 }, '#c9ced8', -0.7, 1.1, 1.1));
        P.push(part('cyl', { diameter: 0.75, height: 0.07, tessellation: 16 }, '#ffc533', 0.6, 1.5, 1.15, null, [Math.PI / 2 - 0.2, 0, 0]));
        P.push(part('caps', { radius: 0.35, height: 1.1, tessellation: 12 }, '#9aa3b0', 2.2, 1.0, 1.2, [1, 1, 0.7]));
      }
      const stall = group('stallM' + s.id, P, node);
      const sign = makeSign(s.id, s.sign); sign.parent = node; sign.position.set(0, 3.75, 0.6);
      addBlob(s.x, heightAt(s.x, s.z), s.z, 4.6);
      const c = makeCharacter('npc_' + s.id, s.look);
      c.root.parent = node; c.shadow.parent = node; c.shadow.position.set(0, 0.06, 0);
      npcs.push({ s, c, node, ry, wave: 0 });
      const toWorld = (lx, lz) => ({ x: s.x + lx * Math.cos(ry) + lz * Math.sin(ry), z: s.z - lx * Math.sin(ry) + lz * Math.cos(ry) });
      [[0, 0, 0.6], [-1.1, 1.15, 0.55], [0, 1.15, 0.55], [1.1, 1.15, 0.55], [-1.5, -0.8, 0.3], [1.5, -0.8, 0.3], [-2.1, 1.3, 0.45], [2.1, 1.3, 0.45]]
        .forEach(([lx, lz, r]) => { const w = toWorld(lx, lz); solids.push({ x: w.x, z: w.z, r }); });
      s.front = toWorld(0, 2.2);
      stall.computeWorldMatrix(true); stall.freezeWorldMatrix();
    });

    // Reisetor
    {
      const px = 8.5, pz = -7, node = TN('portal');
      node.position.set(px, 0, pz);
      const ry = Math.atan2(-px, -pz); node.rotation.y = ry;
      const P = [];
      [-1, 1].forEach(s => {
        P.push(part('box', { width: 0.6, height: 3.4, depth: 0.6 }, '#7d7f8f', 1.3 * s, 1.7, 0));
        P.push(part('box', { width: 0.8, height: 0.3, depth: 0.8 }, '#5f6172', 1.3 * s, 0.15, 0));
        P.push(part('sph', { diameter: 0.35, segments: 8 }, '#ffd23f', 1.3 * s, 3.65, 0));
      });
      P.push(part('box', { width: 3.4, height: 0.45, depth: 0.7 }, '#6a6c7c', 0, 3.4, 0));
      P.push(part('cyl', { diameter: 3.6, height: 0.12, tessellation: 24 }, '#8a8c9c', 0, 0.06, 0.2));
      group('portalM', P, node);
      const swirlTex = new BABYLON.DynamicTexture('swirlT', { width: 128, height: 128 }, scene, false);
      { const c = swirlTex.getContext(); const g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(180,120,255,0.95)'); g.addColorStop(0.75, 'rgba(60,160,255,0.85)'); g.addColorStop(1, 'rgba(40,80,200,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 5;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(64, 64, 18 + i * 14, i, i + 2.4); c.stroke(); }
        swirlTex.update(); swirlTex.hasAlpha = true; }
      const sm = new BABYLON.StandardMaterial('swirlM', scene);
      sm.diffuseTexture = swirlTex; sm.emissiveTexture = swirlTex; sm.opacityTexture = swirlTex; sm.disableLighting = true; sm.backFaceCulling = false;
      landMats.push(sm);
      const swirl = MB.CreateDisc('swirl', { radius: 1.05, tessellation: 28 }, scene);
      swirl.parent = node; swirl.position.set(0, 1.7, 0); swirl.scaling.y = 1.45; swirl.material = sm; swirl.isPickable = false;
      const sign = makeSign('portal', '🧭 Reisetor', '#3a2a6a'); sign.parent = node; sign.position.set(0, 4.35, 0); sign.scaling.setAll(0.8);
      const toWorld = (lx, lz) => ({ x: px + lx * Math.cos(ry) + lz * Math.sin(ry), z: pz - lx * Math.sin(ry) + lz * Math.cos(ry) });
      [-1.3, 1.3].forEach(lx => { const w = toWorld(lx, 0); solids.push({ x: w.x, z: w.z, r: 0.5 }); });
      portal = { node, swirl, front: toWorld(0, 1.6), back: toWorld(0, -1.6), x: px, z: pz };
    }

    // Schneefall im Eisland
    if (L.weather === 'snow') {
      const st = new BABYLON.DynamicTexture('snowT', { width: 32, height: 32 }, scene, false);
      { const c = st.getContext(); const g = c.createRadialGradient(16, 16, 1, 16, 16, 15); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); st.update(); st.hasAlpha = true; }
      snow = new BABYLON.ParticleSystem('snow', 350, scene);
      snow.particleTexture = st;
      snow.emitter = new BABYLON.Vector3(0, 14, 0);
      snow.minEmitBox = new BABYLON.Vector3(-22, 0, -22); snow.maxEmitBox = new BABYLON.Vector3(22, 0, 22);
      snow.direction1 = new BABYLON.Vector3(-0.4, -1, -0.2); snow.direction2 = new BABYLON.Vector3(0.4, -1, 0.3);
      snow.minSize = 0.08; snow.maxSize = 0.2; snow.minLifeTime = 5; snow.maxLifeTime = 7;
      snow.minEmitPower = 1.5; snow.maxEmitPower = 2.5; snow.emitRate = 60;
      snow.color1 = new BABYLON.Color4(1, 1, 1, 0.9); snow.color2 = new BABYLON.Color4(0.9, 0.95, 1, 0.8); snow.colorDead = new BABYLON.Color4(1, 1, 1, 0);
      snow.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
      snow.start();
    }

    // Tiere dieses Landes
    spawnAnimals(id);

    // Alles Neue merken (zum späteren Entfernen)
    scene.meshes.forEach(m => { if (!m0.has(m)) landStuff.push(m); });
    scene.transformNodes.forEach(t => { if (!t0.has(t)) landStuff.push(t); });
    [ground, plaza, sea].forEach(m => { m.isPickable = false; m.freezeWorldMatrix(); });
    $('landPill').textContent = '📍 ' + L.e + ' ' + L.name;
  }

  // =====================================================================
  // Figuren
  // =====================================================================
  function makeCharacter(name, look, extraBody, separateBoots) {
    const root = TN(name), body = TN(name + 'B', root);
    const sk = look.skin, hy = 2.52;
    const B = [
      part('caps', { radius: 0.4, height: 1.15, tessellation: 16 }, look.shirt, 0, 1.62, 0, [1, 1, 0.72]),
      part('cyl', { diameter: 0.84, height: 0.14, tessellation: 16 }, look.belt || '#5a3a1e', 0, 1.2, 0, [1, 1, 0.74]),
      part('box', { width: 0.14, height: 0.12, depth: 0.04 }, '#ffd23f', 0, 1.2, 0.31),
      part('cyl', { diameter: 0.26, height: 0.25, tessellation: 10 }, sk, 0, 2.2, 0),
      part('sph', { diameter: 0.74, segments: 14 }, sk, 0, hy, 0),
      part('sph', { diameter: 0.1, segments: 6 }, sk, 0, hy - 0.04, 0.37),
      part('tor', { diameter: 0.14, thickness: 0.025, tessellation: 12 }, look.lips || '#8a3b3b', 0, hy - 0.15, 0.32, [1, 1, 0.5], [Math.PI / 2 - 0.35, 0, 0])
    ];
    [-1, 1].forEach(sx => {
      B.push(part('sph', { diameter: 0.15, segments: 8 }, '#ffffff', 0.13 * sx, hy + 0.04, 0.29));
      B.push(part('sph', { diameter: 0.08, segments: 6 }, look.eyes || '#1d1d2b', 0.13 * sx, hy + 0.04, 0.355));
      B.push(part('sph', { diameter: 0.03, segments: 4 }, '#ffffff', 0.13 * sx + 0.02, hy + 0.06, 0.39));
      B.push(part('sph', { diameter: 0.14, segments: 6 }, sk, 0.36 * sx, hy, 0, [0.5, 1, 1]));
      B.push(part('sph', { diameter: 0.1, segments: 6 }, '#f29a8a', 0.2 * sx, hy - 0.09, 0.27, [1, 1, 0.4]));
      if (look.lashes) B.push(part('box', { width: 0.12, height: 0.025, depth: 0.03 }, '#1d1d2b', 0.14 * sx, hy + 0.12, 0.33, null, [0, 0, -0.25 * sx]));
    });
    if (look.beard) B.push(part('sph', { diameter: 0.5, segments: 10 }, look.beard, 0, hy - 0.24, 0.17, [1, 0.85, 0.7]));
    if (look.skirt) B.push(part('cyl', { diameterTop: 0.84, diameterBottom: 1.2, height: 0.75, tessellation: 18 }, look.skirt, 0, 0.9, 0, [1, 1, 0.85]));
    if (look.robe) B.push(part('cyl', { diameterTop: 0.86, diameterBottom: 1.25, height: 1.0, tessellation: 18 }, look.robe, 0, 0.78, 0, [1, 1, 0.85]));
    if (look.apron) B.push(part('box', { width: 0.6, height: 0.95, depth: 0.04 }, look.apron, 0, 1.15, 0.33, null, [-0.12, 0, 0]));
    if (look.cape) B.push(part('box', { width: 0.85, height: 1.35, depth: 0.05 }, look.cape, 0, 1.45, -0.34, null, [0.12, 0, 0]));
    if (look.scarf) B.push(part('tor', { diameter: 0.42, thickness: 0.12, tessellation: 14 }, look.scarf, 0, 2.17, 0.02));
    if (extraBody) extraBody.forEach(p => B.push(p));
    group(name + 'Body', B, body);

    let hair = null;
    if (look.hairStyle !== 'bald') {
      const Hh = [part('sph', { diameter: 0.8, segments: 12 }, look.hair, 0, hy + 0.13, -0.07, [1, 0.68, 1])];
      if (look.hairStyle === 'long') {
        Hh.push(part('caps', { radius: 0.3, height: 0.95, tessellation: 12 }, look.hair, 0, hy - 0.25, -0.2, [1, 1, 0.6]));
        [-1, 1].forEach(sx => Hh.push(part('caps', { radius: 0.09, height: 0.6, tessellation: 8 }, look.hair, 0.3 * sx, hy - 0.15, 0.05)));
      }
      if (look.hat === 'wizard') {
        Hh.push(part('cyl', { diameter: 1.0, height: 0.06, tessellation: 18 }, look.hatColor, 0, hy + 0.3, -0.02));
        Hh.push(part('cyl', { diameterTop: 0, diameterBottom: 0.6, height: 0.85, tessellation: 14 }, look.hatColor, 0.04, hy + 0.72, -0.06, null, [-0.15, 0, -0.12]));
        Hh.push(part('sph', { diameter: 0.12, segments: 6 }, '#ffd23f', 0.1, hy + 1.08, -0.12));
      }
      if (look.hat === 'hood') Hh.push(part('sph', { diameter: 0.9, segments: 12, slice: 0.6 }, look.hatColor, 0, hy + 0.02, -0.1, [1, 1, 1.05], [-0.4, 0, 0]));
      hair = group(name + 'Hair', Hh, body);
    }
    let bootM = null;
    if (separateBoots) { bootM = new BABYLON.StandardMaterial(name + 'boot', scene); bootM.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2); bootM.diffuseColor = C3(look.boots); }
    const limb = (n, x, y, r, len, hex, handHex, boot) => {
      const p = TN(name + n, body); p.position.set(x, y, 0);
      const Lp = [part('caps', { radius: r, height: len, tessellation: 10 }, hex, 0, -len / 2, 0)];
      if (handHex) Lp.push(part('sph', { diameter: r * 2 + 0.06, segments: 8 }, handHex, 0, -len + 0.02, 0));
      if (boot && !separateBoots) Lp.push(part('caps', { radius: 0.17, height: 0.5, tessellation: 10 }, boot, 0, -0.93, 0.07, null, [Math.PI / 2, 0, 0]));
      group(name + n + 'M', Lp, p);
      if (boot && separateBoots) { const b = part('caps', { radius: 0.17, height: 0.5, tessellation: 10 }, null, 0, -0.93, 0.07, null, [Math.PI / 2, 0, 0]); b.parent = p; b.material = bootM; b.isPickable = false; }
      return p;
    };
    const legL = limb('legL', -0.2, 1.1, 0.16, 1.0, look.pants, null, look.boots);
    const legR = limb('legR', 0.2, 1.1, 0.16, 1.0, look.pants, null, look.boots);
    const armL = limb('armL', -0.56, 2.02, 0.12, 0.86, look.sleeve || look.shirt, sk);
    const armR = limb('armR', 0.56, 2.02, 0.12, 0.86, look.sleeve || look.shirt, sk);
    armL.rotation.z = -0.08; armR.rotation.z = 0.08;
    const shadow = addBlob(0, 0, 0, 1.6);
    return { root, body, hair, legL, legR, armL, armR, bootM, shadow, hy };
  }

  // ---------- Spielfigur (wird bei Geschlecht/Klasse neu gebaut) ----------
  const handleMat = smat('#7a4f2a', 0.1);
  const headMats = {};
  TOOL_ORDER.forEach(t => { const hm = headMats[t] = new BABYLON.StandardMaterial('head_' + t, scene); hm.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); hm.specularPower = 48; });
  const gearMat = slot => { const m = new BABYLON.StandardMaterial('gear_' + slot, scene); m.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6); m.specularPower = 64; return m; };
  const GM = { weapon: gearMat('weapon'), helmet: gearMat('helmet'), armor: gearMat('armor'), shield: gearMat('shield'), amulet: gearMat('amulet') };
  let amuletNode = null, lastClothes, portraitDirty = true;
  const tierColor = (tool, tier) => tier === 3 ? (tool === 'pick' ? '#5ff2ff' : '#ffc533') : tier === 2 ? '#cfd5e2' : (tool === 'shovel' || tool === 'bucket' ? '#9e7347' : '#80808a');

  let H = null, hero = null, body, legL, legR, armL, armR, toolNodes = {}, weaponNodes = {}, helmNode, armorNode, pads, shieldNode, nameTag = null;
  const heroLook = () => lookFor(S.hero || { gender: 'm', cls: 'fighter' }, S.gear.clothes);
  const lookFor = (h, clothesId) => {
    const c = CLASSES[h.cls] || CLASSES.fighter, f = h.gender === 'f';
    const look = { skin: '#f2c39b', shirt: c.shirt, pants: c.pants, boots: '#5b3a22', hair: f ? '#8a4a1f' : '#6b3e1f', hairStyle: f ? 'long' : 'short', lashes: f, lips: f ? '#c4505a' : '#8a3b3b' };
    if (h.cls === 'mage') Object.assign(look, { robe: '#4a3290', hat: 'wizard', hatColor: '#4a3290', belt: '#ffd23f', sleeve: '#5b3fa8' });
    if (h.cls === 'spy') Object.assign(look, { hat: f ? null : 'hood', hatColor: '#1f2a2e', scarf: '#7a1f2a', cape: '#1f2a2e', belt: '#3a2a20' });
    if (h.cls === 'fighter') Object.assign(look, { cape: '#8a1f1f', belt: '#5a3a1e' });
    if (h.cls === 'spy' && f) Object.assign(look, { hat: 'hood', hatColor: '#1f2a2e' });
    const cl = clothesId && GEAR[clothesId] && GEAR[clothesId].slot === 'clothes' ? GEAR[clothesId] : null;
    if (cl) {
      Object.assign(look, { shirt: cl.shirt, pants: cl.pants, sleeve: cl.shirt });
      if (look.robe) look.robe = cl.pants;
      if (cl.belt) look.belt = cl.belt;
      if (cl.scarf) look.scarf = cl.scarf;
      if (cl.cape) look.cape = cl.cape;
    }
    return look;
  };
  function buildHero() {
    const old = hero ? { x: hero.position.x, z: hero.position.z, ry: hero.rotation.y } : null;
    if (H) { H.root.dispose(false, false); H.shadow.dispose(); if (H.bootM) H.bootM.dispose(); }
    H = makeCharacter('hero', heroLook(), [
      part('caps', { radius: 0.32, height: 0.85, tessellation: 12 }, '#8a5a2b', 0, 1.68, -0.42, [1, 1, 0.55]),
      part('caps', { radius: 0.13, height: 0.8, tessellation: 10 }, '#c94f3d', 0, 2.15, -0.44, null, [0, 0, Math.PI / 2])
    ], true);
    hero = H.root; body = H.body; legL = H.legL; legR = H.legR; armL = H.armL; armR = H.armR;
    if (old) { hero.position.x = old.x; hero.position.z = old.z; hero.rotation.y = old.ry; }
    else hero.position.set(-2.5, 0, -6);
    // Werkzeuge
    toolNodes = {};
    TOOL_ORDER.forEach(t => {
      const node = TN('tool_' + t, armR); node.position.set(0, -0.86, 0.05); node.rotation.x = 0.35;
      if (t === 'bucket') {
        node.rotation.x = 0;
        group('bucket', [part('cyl', { height: 0.42, diameterTop: 0.48, diameterBottom: 0.36, tessellation: 12 }, null, 0, -0.28, 0), part('tor', { diameter: 0.48, thickness: 0.04, tessellation: 12 }, null, 0, -0.07, 0)], node, headMats[t]);
      } else {
        const h = part('cyl', { height: 1.1, diameter: 0.08, tessellation: 6 }, null, 0, 0, 0.5, null, [Math.PI / 2, 0, 0]); h.parent = node; h.material = handleMat; h.isPickable = false;
        const head = t === 'axe' ? part('box', { width: 0.08, height: 0.42, depth: 0.3 }, null, 0, -0.12, 0.95)
          : t === 'pick' ? part('box', { width: 0.08, height: 0.9, depth: 0.1 }, null, 0, 0, 1.0)
            : part('box', { width: 0.32, height: 0.05, depth: 0.42 }, null, 0, 0, 1.2);
        head.parent = node; head.material = headMats[t]; head.isPickable = false;
      }
      toolNodes[t] = node;
    });
    // Waffen: Schwert (Hüfte), Stab (Rücken), Dolch (Hüfte)
    weaponNodes.sword = TN('sword', body); weaponNodes.sword.position.set(-0.47, 1.25, 0.05); weaponNodes.sword.rotation.set(Math.PI + 0.45, 0, 0.12);
    group('swordBlade', [part('sph', { diameter: 0.11, segments: 6 }, null, 0, -0.02, 0), part('box', { width: 0.34, height: 0.06, depth: 0.09 }, null, 0, 0.3, 0), part('box', { width: 0.1, height: 0.95, depth: 0.03 }, null, 0, 0.8, 0)], weaponNodes.sword, GM.weapon);
    { const g = part('cyl', { diameter: 0.07, height: 0.28, tessellation: 6 }, null, 0, 0.14, 0); g.parent = weaponNodes.sword; g.material = smat('#4a2e18'); }
    weaponNodes.staff = TN('staff', body); weaponNodes.staff.position.set(0.15, 1.7, -0.62); weaponNodes.staff.rotation.set(0, 0, 0.5);
    { const s = part('cyl', { diameter: 0.08, height: 2.2, tessellation: 6 }, null, 0, 0, 0); s.parent = weaponNodes.staff; s.material = smat('#6b4526'); }
    group('staffOrb', [part('sph', { diameter: 0.3, segments: 10 }, null, 0, 1.2, 0), part('tor', { diameter: 0.34, thickness: 0.05, tessellation: 12 }, null, 0, 1.05, 0)], weaponNodes.staff, GM.weapon);
    weaponNodes.dagger = TN('dagger', body); weaponNodes.dagger.position.set(0.45, 1.2, 0.12); weaponNodes.dagger.rotation.set(Math.PI + 0.3, 0, -0.15);
    group('daggerBlade', [part('box', { width: 0.22, height: 0.05, depth: 0.07 }, null, 0, 0.18, 0), part('box', { width: 0.07, height: 0.5, depth: 0.025 }, null, 0, 0.45, 0)], weaponNodes.dagger, GM.weapon);
    { const g = part('cyl', { diameter: 0.06, height: 0.18, tessellation: 6 }, null, 0, 0.07, 0); g.parent = weaponNodes.dagger; g.material = smat('#2a1a10'); }
    // Rüstung
    helmNode = TN('helm', body); helmNode.position.set(0, H.hy + 0.02, -0.02);
    group('helmM', [part('sph', { diameter: 0.86, segments: 14, slice: 0.55, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, null, 0, 0, 0), part('tor', { diameter: 0.84, thickness: 0.06, tessellation: 20 }, null, 0, -0.02, 0)], helmNode, GM.helmet);
    armorNode = TN('armorN', body);
    group('chest', [part('caps', { radius: 0.44, height: 1.0, tessellation: 16 }, null, 0, 1.7, 0, [1, 1, 0.76])], armorNode, GM.armor);
    pads = group('pads', [-1, 1].map(sx => part('sph', { diameter: 0.46, segments: 10 }, null, 0.52 * sx, 2.08, 0, [1, 0.7, 1])), armorNode, GM.armor);
    shieldNode = TN('shieldN', armL); shieldNode.position.set(-0.18, -0.5, 0.05); shieldNode.rotation.z = Math.PI / 2;
    group('shieldM', [part('cyl', { diameter: 0.8, height: 0.07, tessellation: 18 }, null, 0, 0, 0)], shieldNode, GM.shield);
    { const b = part('sph', { diameter: 0.22, segments: 8 }, null, 0, 0.05, 0); b.parent = shieldNode; b.material = smat('#ffd23f', 0.5); }
    // Schmuck-Anhänger auf der Brust
    amuletNode = TN('amuletN', body);
    { const ch = part('tor', { diameter: 0.42, thickness: 0.025, tessellation: 16 }, null, 0, 2.1, 0.06, [1, 1, 1.4], [1.25, 0, 0]); ch.parent = amuletNode; ch.material = smat('#ffd23f', 0.6); }
    group('amuletGem', [part('sph', { diameter: 0.14, segments: 8 }, null, 0, 1.9, 0.33)], amuletNode, GM.amulet);
    lastClothes = S.gear.clothes;
    // Namensschild
    makeNameTag();
    refreshTools(); applyGear();
  }
  function makeNameTag() {
    if (nameTag) { nameTag.material.diffuseTexture.dispose(); nameTag.material.dispose(); nameTag.dispose(); nameTag = null; }
    if (!S.hero) return;
    nameTag = makeTag(CLASSES[S.hero.cls].e + ' ' + S.hero.name, 'rgba(15,20,45,0.7)');
    nameTag.parent = hero;
  }
  // Namensschild-Fläche (auch für andere Spieler)
  function makeTag(txt, bg) {
    const tex = new BABYLON.DynamicTexture('tagT', { width: 512, height: 96 }, scene, true);
    const ctx = tex.getContext(); ctx.clearRect(0, 0, 512, 96);
    ctx.font = 'bold 50px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    const w = Math.min(500, ctx.measureText(txt).width + 40);
    ctx.fillStyle = bg;
    const x0 = 256 - w / 2; ctx.beginPath(); ctx.moveTo(x0 + 30, 10); ctx.arcTo(x0 + w, 10, x0 + w, 86, 30); ctx.arcTo(x0 + w, 86, x0, 86, 30); ctx.arcTo(x0, 86, x0, 10, 30); ctx.arcTo(x0, 10, x0 + w, 10, 30); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 256, 50);
    tex.update(); tex.hasAlpha = true;
    const m = new BABYLON.StandardMaterial('tagM', scene);
    m.diffuseTexture = tex; m.opacityTexture = tex; m.emissiveColor = new BABYLON.Color3(1, 1, 1); m.disableLighting = true; m.backFaceCulling = false;
    const tag = MB.CreatePlane('tag', { width: 2.2, height: 0.41 }, scene);
    tag.material = m; tag.position.y = 3.45; tag.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; tag.isPickable = false;
    return tag;
  }
  const disposeTag = t => { if (!t) return; t.material.diffuseTexture.dispose(); t.material.dispose(); t.dispose(); };
  function refreshTools() {
    TOOL_ORDER.forEach(t => {
      if (toolNodes[t]) toolNodes[t].setEnabled(t === S.eq);
      const c = C3(tierColor(t, S.tools[t]));
      headMats[t].diffuseColor = c;
      headMats[t].emissiveColor = S.tools[t] === 3 ? c.scale(0.3) : BABYLON.Color3.Black();
    });
    $('toolIcon').textContent = TOOLS[S.eq];
    $('toolDot').style.background = TIER_DOT[S.tools[S.eq] - 1];
    $('toolBadge').setAttribute('aria-label', TOOL_NAMES[S.eq][S.tools[S.eq] - 1]);
  }
  const setTool = t => {
    if (S.eq === t) return;
    S.eq = t; refreshTools();
    const b = $('toolBadge'); b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap');
  };
  function applyGear() {
    if (S.gear.clothes !== lastClothes && H) { buildHero(); return; }   // neue Kleidung = Figur neu einkleiden
    const w = S.gear.weapon && GEAR[S.gear.weapon];
    Object.keys(weaponNodes).forEach(k => weaponNodes[k].setEnabled(!!w && w.type === k));
    helmNode.setEnabled(!!S.gear.helmet); armorNode.setEnabled(!!S.gear.armor); shieldNode.setEnabled(!!S.gear.shield);
    SLOTS.forEach(([slot]) => {
      const g = S.gear[slot] && GEAR[S.gear[slot]];
      if (g && GM[slot]) { GM[slot].diffuseColor = C3(g.color); GM[slot].emissiveColor = g.glow || slot === 'amulet' ? C3(g.color).scale(0.4) : BABYLON.Color3.Black(); }
    });
    const a = S.gear.armor && GEAR[S.gear.armor];
    pads.setEnabled(!!(a && a.pads));
    if (H.hair) H.hair.setEnabled(!S.gear.helmet);
    const bt = S.gear.boots && GEAR[S.gear.boots];
    H.bootM.diffuseColor = C3(bt ? bt.color : '#5b3a22');
    H.bootM.emissiveColor = S.gear.boots === 'b3' ? C3(bt.color).scale(0.25) : BABYLON.Color3.Black();
    amuletNode.setEnabled(!!S.gear.amulet);
    portraitDirty = true;
  }
  // Ausrüstung anlegen / ablegen (Kleidung fällt auf Standardkleidung zurück)
  const equip = id => { const g = GEAR[id]; if (!g || !S.owned[id] || (g.cls && g.cls !== cls())) return false; S.gear[g.slot] = id; applyGear(); return true; };
  const unequip = slot => { S.gear[slot] = null; applyGear(); };

  // =====================================================================
  // Kamera
  // =====================================================================
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 1.1, 12, new BABYLON.Vector3(-2.5, 2, -6), scene);
  cam.minZ = 0.3; cam.maxZ = 220; cam.fov = 0.9;
  const camTarget = new BABYLON.Vector3(-2.5, 2, -6);
  const tmpV = new BABYLON.Vector3();

  // =====================================================================
  // Effekte & Meldungen
  // =====================================================================
  const particles = [];
  for (let i = 0; i < 40; i++) {
    const m = MB.CreateBox('pt' + i, { size: 0.16 }, scene);
    m.isVisible = false; m.isPickable = false;
    particles.push({ m, v: new BABYLON.Vector3(), life: 0 });
  }
  let pIdx = 0;
  const ptMats = {};
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
  const popText = (html, worldPos) => {
    const p = toScreen(worldPos);
    const d = document.createElement('div');
    d.className = 'pop'; d.innerHTML = html; d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  };
  let toastTimer = 0;
  const toast = (html, gold) => {
    const t = $('toast');
    t.innerHTML = html; t.className = 'show' + (gold ? ' gold' : '');
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
  // HUD, XP, Erfolge
  // =====================================================================
  const updateHud = () => {
    const d = derived();
    S.hp = Math.min(S.hp, d.hpMax);
    $('title').textContent = S.hero ? CLASSES[S.hero.cls].e + ' ' + S.hero.name : 'CIMACU';
    $('lvl').textContent = 'Lv ' + S.level;
    $('xpfill').style.width = Math.min(100, (S.xp / xpNeed(S.level)) * 100) + '%';
    $('hpfill').style.width = (S.hp / d.hpMax * 100) + '%';
    $('hptxt').textContent = '❤ ' + Math.round(S.hp) + '/' + d.hpMax;
    $('moneyNum').textContent = S.money;
    $('charBtn').classList.toggle('dot', S.points > 0);
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
      S.level++; S.points += POINTS_PER_LEVEL; S.hp = derived().hpMax;
      $('lvNum').textContent = S.level;
      const lu = $('levelup'); lu.classList.remove('show'); void lu.offsetWidth; lu.classList.add('show');
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
  // Ziel finden & Abbauen
  // =====================================================================
  let facing = 0;
  const findTarget = () => {
    const hx = hero.position.x, hz = hero.position.z;
    const mob = mobInReach(); if (mob) return { kind: 'mob', mob };
    const pl = playerTarget(cls() === 'mage' ? 8 : 2.6); if (pl) return { kind: 'player', pl };
    if (portal && Math.hypot(portal.front.x - hx, portal.front.z - hz) < 2.6) return { kind: 'portal' };
    if (portal && Math.hypot(portal.back.x - hx, portal.back.z - hz) < 2.0) return { kind: 'portal' };
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

  let swingT = -1, swingTarget = null, hitDone = false, actionHeld = false, holdKind = null;
  const swingDur = () => 0.5 / derived().swing;
  const startSwing = () => {
    if (swingT >= 0 || !S.hero) return;
    const tgt = findTarget();
    // Beim Gedrückthalten nur dieselbe Art weitermachen (nach dem Kampf nicht plötzlich graben)
    const kindNow = tgt ? (tgt.kind === 'mob' || tgt.kind === 'player' ? 'mob' : 'other') : null;
    if (holdKind && kindNow !== holdKind) { actionHeld = false; holdKind = null; return; }
    holdKind = actionHeld ? kindNow : null;
    if (!tgt) { toast('Hier gibt es nichts abzubauen. Geh in die Natur, zu einem Händler oder zum Reisetor.'); actionHeld = false; return; }
    if (tgt.kind === 'shop') { actionHeld = false; openShop(tgt.shop); return; }
    if (tgt.kind === 'portal') { actionHeld = false; openTravel(); return; }
    if (tgt.kind === 'mob') {
      facing = Math.atan2(tgt.mob.x - hero.position.x, tgt.mob.z - hero.position.z); hero.rotation.y = facing;
      combatT = 5; swingT = 0; swingTarget = tgt; hitDone = false; return;
    }
    if (tgt.kind === 'player') {
      facing = Math.atan2(tgt.pl.x - hero.position.x, tgt.pl.z - hero.position.z); hero.rotation.y = facing;
      combatT = 5; swingT = 0; swingTarget = tgt; hitDone = false; return;
    }
    const k = KINDS[tgt.kind];
    setTool(k.tool);
    if (k.tier && S.tools[k.tool] < k.tier) { toast('💪 Zu hart! Du brauchst eine ' + TOOL_NAMES[k.tool][k.tier - 1] + ' (🎒 → Bauen)'); actionHeld = false; return; }
    if (tgt.node) facing = Math.atan2(tgt.node.x - hero.position.x, tgt.node.z - hero.position.z);
    hero.rotation.y = facing;
    swingT = 0; swingTarget = tgt; hitDone = false;
  };
  const trainSkill = (kind, amount) => {
    const sk = SKILL_OF[kind]; if (!sk) return;
    const before = skillLevel(S.skills[sk]);
    S.skills[sk] = (S.skills[sk] || 0) + amount;
    const after = skillLevel(S.skills[sk]);
    if (after > before) { const s = SKILLS.find(x => x[0] === sk); setTimeout(() => { toast(s[1] + ' ' + s[2] + ' ist jetzt Stufe ' + after + '!', true); vibrate([30, 30, 30]); }, 600); }
  };
  const hit = tgt => {
    if (tgt.kind === 'mob') { attackHit(tgt.mob, tgt.mult || 1, tgt.ability); return; }
    if (tgt.kind === 'player') { attackPlayer(tgt.pl, tgt.mult || 1, tgt.ability); return; }
    const k = KINDS[tgt.kind], tier = S.tools[k.tool];
    trainSkill(tgt.kind, 1);
    if (tgt.node) {
      const n = tgt.node;
      if (!n.alive) return;
      n.hp -= tier * derived().power * (1 + (skillLevel(S.skills[SKILL_OF[n.kind]]) - 1) * 0.03); n.shake = 0.3;
      const y = heightAt(n.x, n.z) + 1;
      burst(n.x, y, n.z, k.color, 5); vibrate(15);
      if (n.hp <= 0.001) {
        n.alive = false; n.dying = 1; n.hidden = false; n.respawn = performance.now() + 90000;
        S.stats['k_' + n.kind] = (S.stats['k_' + n.kind] || 0) + 1;
        const lucky = Math.random() < derived().luck;
        let i = 0;
        for (const it in k.drops) give(it, k.drops[it] * (lucky ? 2 : 1), new BABYLON.Vector3(n.x, y + 1.5, n.z), 300 * i++);
        if (lucky) setTimeout(() => popText('🍀 Doppelt!', new BABYLON.Vector3(n.x, y + 2.5, n.z)), 150);
        burst(n.x, y + 0.5, n.z, k.color, 14);
        trainSkill(n.kind, 2);
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
      addXp(k.xp * tier); vibrate(10);
    }
    checkAch(); save();
  };

  // =====================================================================
  // Aktions-Knopf
  // =====================================================================
  const act = $('act');
  act.addEventListener('pointerdown', e => { e.preventDefault(); actionHeld = true; holdKind = null; startSwing(); $('hint').style.opacity = '0'; });
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
    else if (tgt.kind === 'portal') { key = 'portal'; icon = '🧭'; label = 'Reisen'; }
    else if (tgt.kind === 'mob') { const w = S.gear.weapon && GEAR[S.gear.weapon]; key = 'mob' + (w ? w.e : ''); icon = w ? w.e : '👊'; label = 'Angreifen'; }
    else if (tgt.kind === 'player') { key = 'pl'; icon = '⚔️'; label = 'Duell'; }
    else {
      const k = KINDS[tgt.kind];
      if (swingT < 0) setTool(k.tool);
      const locked = k.tier && S.tools[k.tool] < k.tier;
      key = tgt.kind + locked; icon = locked ? '🔒' : TOOLS[k.tool]; label = locked ? 'Zu hart' : k.verb;
    }
    if (key !== lastBtn) {
      lastBtn = key;
      $('actIcon').textContent = icon; $('actLabel').textContent = label;
      act.classList.toggle('off', !tgt);
      act.classList.toggle('shop', !!tgt && (tgt.kind === 'shop' || tgt.kind === 'portal'));
      act.classList.toggle('fight', !!tgt && (tgt.kind === 'mob' || tgt.kind === 'player'));
    }
    ring.style.strokeDashoffset = tgt && tgt.node ? 289 * Math.max(0, tgt.node.hp / KINDS[tgt.kind].hp)
      : tgt && tgt.mob ? 289 * (1 - Math.max(0, tgt.mob.hp / tgt.mob.maxHp))
        : tgt && tgt.pl ? 289 * (1 - Math.max(0, tgt.pl.hp / tgt.pl.hm)) : 289;
  };

  // =====================================================================
  // Händler
  // =====================================================================
  let curShop = null, shopTab = 'buy';
  const fmtStat = g => gearStatText(g);
  const openShop = s => {
    curShop = s; shopTab = 'buy'; $('shop').hidden = false;
    const npc = npcs.find(n => n.s === s); if (npc) npc.wave = 1.5;
    renderShop();
  };
  const LAND_CLOTH = { gruen: 'c6', eis: 'c3', wueste: 'c4', berg: 'c5' };
  const shopGoods = s => s.goods === 'weapons' ? Object.keys(GEAR).filter(k => GEAR[k].cls === cls())
    : s.goods === 'general' ? ['potion', 'potion2', 'potion3', 'c1', 'c2', LAND_CLOTH[S.land], 'j1', 'j2', 'j3', 'bwood', 'bstone', 'biron'] : s.goods;
  const renderShop = () => {
    const s = curShop; if (!s) return;
    $('shopTitle').textContent = s.sign.split(' ')[0] + ' ' + s.name + ' · ' + s.title;
    $('shopGreet').textContent = s.id === 'weapons' ? '„Für dich als ' + CLASSES[cls()].name + ' hab ich genau das Richtige!“' : s.greet;
    $('shopMoney').innerHTML = 'Dein Geld: ' + CIM + ' ' + S.money + ' Cim';
    $('shopTabs').innerHTML = s.buys ? `<button data-stab="buy" class="${shopTab === 'buy' ? 'on' : ''}">🛒 Kaufen</button><button data-stab="sell" class="${shopTab === 'sell' ? 'on' : ''}">💰 Verkaufen</button>` : '';
    $('shopTabs').style.display = s.buys ? '' : 'none';
    let h = '';
    if (shopTab === 'buy') {
      h = shopGoods(s).map(id => {
        const g = GEAR[id], o = GOODS[id];
        if (g) {
          const cur = S.gear[g.slot] && GEAR[S.gear[g.slot]];
          const curV = cur ? (cur.atk || cur.def) : 0, v = g.atk || g.def;
          const cmp = v > curV ? ` <span class="up">▲ +${v - curV}</span>` : '';
          let btn;
          if (S.gear[g.slot] === id) btn = '<span class="tag">✔ Angelegt</span>';
          else if (S.owned[id]) btn = `<button class="alt" data-equip-gear="${id}">Anlegen</button>`;
          else btn = `<button data-buy="${id}" ${S.money >= g.price ? '' : 'disabled'}>${CIM} ${g.price}</button>`;
          return `<div class="row"><div class="e">${g.e}<i style="background:${g.color}"></i></div><div class="t"><b>${g.name}</b><small>${fmtStat(g)}${cmp}</small></div>${btn}</div>`;
        }
        const btn = o.perk && S.perks[id] ? '<span class="tag">✔ Gekauft</span>' : `<button data-buy="${id}" ${S.money >= o.price ? '' : 'disabled'}>${CIM} ${o.price}</button>`;
        const extra = CONS[id] ? ` · Du hast ${S.bag[id] || 0}` : '';
        return `<div class="row"><div class="e">${o.e}</div><div class="t"><b>${o.name}</b><small>${o.desc}${extra}</small></div>${btn}</div>`;
      }).join('');
    } else {
      const have = Object.keys(ITEMS).filter(i => S.inv[i] > 0);
      const total = have.reduce((a, i) => a + S.inv[i] * sellPrice(i), 0);
      h = `<button class="wide" data-sellall ${total ? '' : 'disabled'}>Alle Rohstoffe verkaufen · ${CIM} ${total}</button>`;
      h += have.length ? have.map(i => `<div class="row"><div class="e">${ITEMS[i][1]}</div><div class="t"><b>${ITEMS[i][0]} × ${S.inv[i]}</b><small>${CIM} ${sellPrice(i)} pro Stück</small></div><div class="btns"><button class="alt" data-sell="${i}:1">1</button><button data-sell="${i}:all">Alle</button></div></div>`).join('')
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
      else if (CONS[id]) { S.bag[id] = (S.bag[id] || 0) + 1; toast(CONS[id].e + ' ' + CONS[id].name + ' gekauft'); updatePotBtn(); }
      vibrate([20, 30, 40]);
      burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ffd23f', 10);
    } else if (b.dataset.equipGear) {
      const g = GEAR[b.dataset.equipGear]; S.gear[g.slot] = b.dataset.equipGear; applyGear();
    } else if (b.dataset.sell) {
      const [item, n] = b.dataset.sell.split(':');
      const v = sell(item, n === 'all' ? Infinity : 1);
      if (v) { toast('💰 +' + v + ' ' + CIM + ' Cim'); vibrate(15); }
    } else if (b.dataset.sellall !== undefined) {
      let v = 0; Object.keys(ITEMS).forEach(i => { v += sell(i, Infinity); });
      if (v) { toast('💰 Alles verkauft: +' + v + ' ' + CIM + ' Cim', true); vibrate([20, 30, 60]); }
    }
    bump('money'); updateHud(); checkAch(); save(); renderShop();
  });

  // =====================================================================
  // Reisen
  // =====================================================================
  const openTravel = () => { $('travel').hidden = false; renderTravel(); };
  const renderTravel = () => {
    $('travelMoney').innerHTML = 'Dein Geld: ' + CIM + ' ' + S.money + ' Cim';
    $('travelBody').innerHTML = LAND_ORDER.map(id => {
      const l = LANDS[id], here = id === S.land;
      const btn = here ? '<span class="here">📍 Du bist hier</span>' : `<button data-go="${id}" ${S.money >= TRAVEL_COST ? '' : 'disabled'}>${CIM} ${TRAVEL_COST}</button>`;
      return `<div class="land" style="background:${l.card}"><div class="e">${l.e}</div><div class="t"><b>${l.name}${S.visited && S.visited[id] ? '' : ' ✨ neu'}</b><small>${l.desc}</small><small>Besonders: ${l.special}</small><small>⚔️ Tiere Stufe ${LAND_ORDER.indexOf(id) + 1}: ${LAND_ANIMALS[id].map(([t]) => ANIMALS[t].name).join(', ')} · <b style="display:inline;font-size:12px">empfohlen ab Level ${[1, 5, 10, 15][LAND_ORDER.indexOf(id)]}</b></small></div>${btn}</div>`;
    }).join('') + (S.money < TRAVEL_COST ? `<div class="empty">Dir fehlen noch ${TRAVEL_COST - S.money} Cim. Verkaufe Rohstoffe bei der Gemischtwaren-Händlerin!</div>` : '');
  };
  $('travelBody').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b || b.disabled) return;
    const id = b.dataset.go;
    if (S.money < TRAVEL_COST || id === S.land) return;
    S.money -= TRAVEL_COST;
    $('travel').hidden = true;
    const f = $('fade'); $('fadeTxt').textContent = '🧭 Reise nach ' + LANDS[id].e + ' ' + LANDS[id].name + ' …';
    f.classList.add('on');
    vibrate([30, 60, 30]);
    setTimeout(() => {
      const oldLand = S.land;
      S.land = id; S.visited = S.visited || {}; S.visited[id] = (S.visited[id] || 0) + 1;
      buildLand(id);
      netLandChanged(oldLand);
      facing = Math.atan2(-portal.front.x, -portal.front.z); hero.rotation.y = facing;
      hero.position.set(portal.front.x + Math.sin(facing) * 2.5, 0, portal.front.z + Math.cos(facing) * 2.5);
      cam.alpha = Math.atan2(-Math.cos(facing), -Math.sin(facing)) + 1.1;
      camTarget.set(hero.position.x, 2, hero.position.z);
      updateHud(); checkAch(); save();
      setTimeout(() => { f.classList.remove('on'); toast('Willkommen in ' + LANDS[id].e + ' ' + LANDS[id].name + '!', true); }, 400);
    }, 700);
  });

  // =====================================================================
  // Rucksack: Inventar, Charakter, Werkzeug, Bauen, Erfolge
  // =====================================================================
  let tab = 'inv', invCat = 'all', popItem = null;
  const canAfford = c => Object.keys(c).every(i => (S.inv[i] || 0) >= c[i]);
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + ' %';
  const TAB_TITLES = { inv: '🎒 Inventar', char: '👤 Charakter', tools: '🛠️ Werkzeug', craft: '🔨 Bauen', ach: '🏆 Erfolge' };

  // ---------- Charakterbild (wird aus dem 3D-Spiel fotografiert) ----------
  let portraitURL = '';
  const pcam = new BABYLON.FreeCamera('pcam', new BABYLON.Vector3(0, 0, 0), scene);
  pcam.fov = 0.55; pcam.minZ = 0.2; pcam.maxZ = 80; pcam.layerMask = 0x10000000;
  const updatePortrait = async () => {
    if (!portraitDirty && portraitURL) { document.querySelectorAll('.portrait').forEach(img => { img.src = portraitURL; }); return; }
    portraitDirty = false;
    const f = hero.rotation.y, p = hero.position;
    pcam.position.set(p.x + Math.sin(f) * 5.2, p.y + 2.2, p.z + Math.cos(f) * 5.2);
    pcam.setTarget(new BABYLON.Vector3(p.x, p.y + 1.5, p.z));
    const tagOn = nameTag && nameTag.isEnabled();
    if (nameTag) nameTag.setEnabled(false);
    // Nur die Figur fotografieren (nichts davor, das sie verdeckt)
    hero.getChildMeshes(false).forEach(m => { m.layerMask = 0xFFFFFFFF; });
    const oldClear = scene.clearColor.clone();
    scene.clearColor = new BABYLON.Color4(0.93, 0.87, 0.75, 1);
    try { portraitURL = await BABYLON.Tools.CreateScreenshotUsingRenderTargetAsync(engine, pcam, { width: 240, height: 300 }, 'image/jpeg', 4, false, undefined, false, false, true); } catch (e) { }
    scene.clearColor = oldClear;
    if (nameTag && tagOn) nameTag.setEnabled(true);
    document.querySelectorAll('.portrait').forEach(img => { img.src = portraitURL; });
  };

  const gearStatText = g => {
    const p = [];
    if (g.atk) p.push('⚔️ Angriff +' + g.atk);
    if (g.def) p.push('🛡️ Schutz +' + g.def);
    if (g.spd) p.push('⚡ Tempo +' + Math.round(g.spd * 100) + ' %');
    if (g.xp) p.push('📚 XP +' + Math.round(g.xp * 100) + ' %');
    if (g.sell) p.push('💰 Preise +' + Math.round(g.sell * 100) + ' %');
    if (g.luck) p.push('🍀 Glück ' + Math.round(g.luck * 100) + ' %');
    return p.join(' · ') || 'Nur zum Aussehen';
  };
  const slotLabel = slot => (SLOTS.find(s => s[0] === slot) || [])[1];
  const ownedGear = () => Object.keys(GEAR).filter(id => S.owned[id] && (!GEAR[id].cls || GEAR[id].cls === cls()));

  const dollSlot = slot => {
    const id = S.gear[slot], g = id && GEAR[id], s = SLOTS.find(x => x[0] === slot);
    if (g) return `<button class="dslot on" data-slot="${slot}" style="--c:${g.color}"><span class="de">${g.e}</span><span class="dl">${g.name}</span></button>`;
    if (slot === 'clothes') return `<button class="dslot std" data-slot="clothes"><span class="de">👕</span><span class="dl">Standard</span></button>`;
    return `<button class="dslot" data-slot="${slot}"><span class="de faded">${s[2]}</span><span class="dl">${s[1]}</span></button>`;
  };

  const renderInvTab = () => {
    const d = derived();
    let h = `<div class="doll">
      <div class="dcol">${['helmet', 'armor', 'clothes', 'boots'].map(dollSlot).join('')}</div>
      <div class="dpic"><img class="portrait" alt="Deine Figur" src="${portraitURL}"><div class="dsum"><span>⚔️ ${d.atk}</span><span>🛡️ ${d.def}</span><span>❤️ ${d.hpMax}</span></div></div>
      <div class="dcol">${['weapon', 'shield', 'amulet'].map(dollSlot).join('')}<button class="dslot tool" data-tooltab="1"><span class="de">${TOOLS[S.eq]}</span><span class="dl">Werkzeug</span></button></div>
    </div>`;
    h += '<div class="chips">' + CATS.map(([id, name]) => `<button data-cat="${id}" class="${invCat === id ? 'on' : ''}">${name}</button>`).join('') + '</div>';
    const cells = [];
    ownedGear().forEach(id => {
      const g = GEAR[id], c = catOf(g);
      if (invCat !== 'all' && invCat !== c) return;
      const worn = S.gear[g.slot] === id;
      cells.push(`<button class="icell${worn ? ' worn' : ''}" data-item="${id}" style="--c:${g.color}"><span class="ie">${g.e}</span><span class="in">${g.name}</span>${worn ? '<span class="ok">✔</span>' : ''}</button>`);
    });
    if (invCat === 'all' || invCat === 'items') Object.keys(CONS).forEach(id => { if (S.bag[id]) cells.push(`<button class="icell" data-item="${id}" style="--c:${CONS[id].color}"><span class="ie">${CONS[id].e}</span><span class="in">${CONS[id].name}</span><span class="cnt">${S.bag[id]}</span></button>`); });
    if (invCat === 'all' || invCat === 'raw') Object.keys(ITEMS).forEach(i => { if (S.inv[i] > 0) cells.push(`<button class="icell raw" data-raw="${i}"><span class="ie">${ITEMS[i][1]}</span><span class="in">${ITEMS[i][0]}</span><span class="cnt">${S.inv[i]}</span></button>`); });
    h += cells.length ? `<div class="igrid">${cells.join('')}</div>` : '<div class="empty">Hier ist noch nichts. Sammle Rohstoffe oder kaufe etwas bei den Händlern!</div>';
    return h;
  };

  const renderCharTab = () => {
    const d = derived(), c = CLASSES[cls()], rk = rankOf(S.level);
    const need = xpNeed(S.level), played = Math.floor((S.played || 0) / 60);
    let h = `<div class="chead"><img class="portrait small" alt="" src="${portraitURL}"><div class="cinfo">
      <b>${S.hero ? esc(S.hero.name) : '—'}</b>
      <small>${S.hero && S.hero.gender === 'f' ? '♀ Weiblich' : '♂ Männlich'} · ${c.e} ${c.name}</small>
      <span class="rank">${rk.r[2]} ${rk.r[1]}</span>
      <small>${rk.next ? 'Nächster Rang: ' + rk.next[2] + ' ' + rk.next[1] + ' ab Level ' + rk.next[0] : 'Höchster Rang erreicht!'}</small>
    </div></div>
    <div class="lvbox"><div class="lvnum">Level <b>${S.level}</b></div><div class="bar xp"><i style="width:${Math.min(100, S.xp / need * 100)}%"></i><span>${Math.floor(S.xp)} / ${need} XP</span></div>
    <div class="bar hp"><i style="width:${S.hp / d.hpMax * 100}%"></i><span>❤ ${Math.round(S.hp)} / ${d.hpMax} Leben</span></div></div>`;
    h += '<h4>Status</h4>';
    h += S.points > 0 ? `<div class="points">⭐ Du hast ${S.points} Statuspunkt${S.points > 1 ? 'e' : ''} zu verteilen!</div>` : '';
    h += STATS.map(([k, e, name, desc]) => `<div class="row stat"><div class="e">${e}</div><div class="t"><b>${name} <small>(${k.toUpperCase()})</small></b><small>${desc}</small></div><span class="v">${S.stat[k]}</span><button data-stat="${k}" ${S.points > 0 ? '' : 'disabled'} aria-label="${name} erhöhen">+</button></div>`).join('');
    h += `<h4>Werte</h4><div class="vals">
      <div><b>❤️ ${d.hpMax}</b>Leben</div><div><b>⚔️ ${d.atk}</b>Angriff</div><div><b>🛡️ ${d.def}</b>Schutz</div>
      <div><b>⚡ ${pct(d.speed - 1)}</b>Lauftempo</div><div><b>⛏️ ${pct(d.power - 1)}</b>Abbau-Kraft</div><div><b>🔁 ${pct(d.swing - 1)}</b>Schlagtempo</div>
      <div><b>📚 ${pct(d.xpBonus)}</b>XP-Bonus</div><div><b>💰 ${pct(d.sellBonus)}</b>Preise</div><div><b>🍀 ${Math.round(d.luck * 100)} %</b>Glück</div></div>
      <div class="empty" style="padding:2px 0 0;font-size:12px">Klassen-Bonus: ${c.bonus}</div>`;
    h += '<h4>Fähigkeiten</h4>' + ABILITIES[cls()].map(([lv, e, name, desc], i) => {
      const ok = S.level >= lv, cd = AB[cls()][i][2];
      return `<div class="row${ok ? '' : ' locked'}"><div class="e">${ok ? e : '🔒'}</div><div class="t"><b>${name}</b><small>${desc}</small><small>${ok ? '✔ Gelernt – Knopf unten rechts · Abklingzeit ' + cd + ' s' : 'Wird mit Level ' + lv + ' gelernt'}</small></div></div>`;
    }).join('');
    h += '<h4>Sammel-Fähigkeiten</h4>' + SKILLS.map(([k, e, name]) => {
      const xp = S.skills[k] || 0, lv = skillLevel(xp), a = skillXpFor(lv), b = skillXpFor(lv + 1);
      const p = lv >= 20 ? 100 : Math.round((xp - a) / (b - a) * 100);
      return `<div class="row skill"><div class="e">${e}</div><div class="t"><b>${name} <small>· Stufe ${lv}${lv >= 20 ? ' (max)' : ''}</small></b><div class="bar sk"><i style="width:${p}%"></i></div><small>+${(lv - 1) * 3} % Kraft</small></div></div>`;
    }).join('');
    const mined = ['rock', 'iron', 'ice', 'silver', 'gold', 'crystal'].reduce((a, k) => a + (S.stats['k_' + k] || 0), 0);
    h += `<h4>Abenteuer</h4><div class="vals">
      <div><b>🌍 ${Object.keys(S.visited || {}).length}/4</b>Länder</div><div><b>🏆 ${ACH.filter(a => S.ach[a.id]).length}/${ACH.length}</b>Erfolge</div><div><b>${CIM} ${S.stats.earned || 0}</b>Verdient</div>
      <div><b>🌲 ${(S.stats.k_tree || 0) + (S.stats.k_cactus || 0)}</b>Gefällt</div><div><b>⛏️ ${mined}</b>Abgebaut</div><div><b>⏱️ ${played}</b>Minuten</div>
      <div><b>🐾 ${S.stats.kills || 0}</b>Tiere besiegt</div><div><b>✨ ${S.stats.loot || 0}</b>Seltene Beute</div><div><b>${CIM} ${S.stats.looted || 0}</b>Erbeutet</div></div>`;
    return h;
  };

  const renderItemPop = () => {
    const box = $('itemPop');
    if (!popItem) { box.hidden = true; return; }
    let h = '';
    if (popItem.slot) {
      const slot = popItem.slot, id = S.gear[slot], g = id && GEAR[id];
      if (g) popItem = { id };
      else if (slot === 'clothes') h = `<div class="pe">👕</div><b>Standardkleidung</b><small>Deine Grundkleidung als ${CLASSES[cls()].name}. Sie kann nicht abgelegt werden.</small><small>Neue Kleidung gibt es bei der Gemischtwaren-Händlerin.</small>`;
      else h = `<div class="pe faded">${SLOTS.find(s => s[0] === slot)[2]}</div><b>${slotLabel(slot)}: leer</b><small>${slot === 'weapon' ? 'Waffen gibt es beim Waffenhändler.' : slot === 'amulet' ? 'Schmuck gibt es bei der Gemischtwaren-Händlerin.' : 'Gibt es beim Rüstungshändler.'}</small>`;
    }
    if (popItem.id) {
      const id = popItem.id, g = GEAR[id], worn = S.gear[g.slot] === id;
      const cur = S.gear[g.slot] && GEAR[S.gear[g.slot]];
      let cmp = '';
      if (!worn && cur) { const dv = (g.atk || g.def || 0) - (cur.atk || cur.def || 0); if (dv) cmp = `<small class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '▲ +' : '▼ '}${dv} gegenüber ${cur.name}</small>`; }
      h = `<div class="pe" style="--c:${g.color}">${g.e}</div><b>${g.name}</b><small>${slotLabel(g.slot)}${g.cls ? ' · nur ' + CLASSES[g.cls].name : ''}</small><small>${gearStatText(g)}</small>${g.desc ? `<small>${g.desc}</small>` : ''}${cmp}
        <div class="pbtns">${worn ? `<button class="alt" data-off="${g.slot}">${g.slot === 'clothes' ? 'Ablegen → Standardkleidung' : 'Ablegen'}</button>` : `<button data-on="${id}">Anlegen</button>`}</div>`;
    } else if (popItem.cons) {
      const c = CONS[popItem.cons], n = S.bag[popItem.cons] || 0;
      h = `<div class="pe" style="--c:${c.color}">${c.e}</div><b>${c.name} × ${n}</b><small>Heilt ${c.heal} Lebenspunkte. Tipp: Im Kampf den 🧪-Knopf links nutzen!</small><div class="pbtns"><button data-use="${popItem.cons}" ${n ? '' : 'disabled'}>Benutzen</button></div>`;
    } else if (popItem.raw) {
      const i = popItem.raw;
      h = `<div class="pe">${ITEMS[i][1]}</div><b>${ITEMS[i][0]} × ${S.inv[i] || 0}</b><small>Rohstoff · Wert: ${CIM} ${sellPrice(i)} pro Stück</small><small>Verkaufen bei der Gemischtwaren-Händlerin, oder unter „Bauen“ für Werkzeuge nutzen.</small>`;
    }
    box.innerHTML = `<button class="closeBtn pclose" data-pclose="1" aria-label="Schließen">✕</button>${h}`;
    box.hidden = false;
  };

  const renderInv = () => {
    document.querySelectorAll('#invTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('invTitle').textContent = TAB_TITLES[tab];
    let h = '';
    if (tab === 'inv') h = renderInvTab();
    else if (tab === 'char') h = renderCharTab();
    else if (tab === 'tools') {
      h = '<div class="empty" style="padding:0 0 10px">Das passende Werkzeug wird automatisch genommen.</div>' + TOOL_ORDER.map(t => {
        const tier = S.tools[t];
        return `<div class="row"><div class="e">${TOOLS[t]}</div><div class="t"><b>${TOOL_NAMES[t][tier - 1]}</b><small>Stufe ${tier} von 3 · Kraft ×${tier}</small></div>${S.eq === t ? '<span class="tag">✔ In der Hand</span>' : ''}</div>`;
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
    $('invBody').innerHTML = h;
    renderItemPop();
    if (tab === 'inv' || tab === 'char') updatePortrait();
  };
  const openInv = t => { tab = t; popItem = null; portraitDirty = true; $('inv').hidden = false; renderInv(); };
  $('bag').addEventListener('click', () => openInv('inv'));
  $('charBtn').addEventListener('click', () => openInv('char'));
  $('lvlbox').addEventListener('click', () => openInv('char'));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { $(b.dataset.close).hidden = true; curShop = null; popItem = null; }));
  ['inv', 'shop', 'travel', 'chat'].forEach(id => $(id).addEventListener('click', e => { if (e.target.id === id) { $(id).hidden = true; curShop = null; popItem = null; } }));
  $('invTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; popItem = null; renderInv(); } });
  $('itemPop').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.pclose) { popItem = null; renderItemPop(); return; }
    if (b.dataset.on) { if (equip(b.dataset.on)) { toast('✔ ' + GEAR[b.dataset.on].name + ' angelegt'); vibrate(15); checkAch(); } popItem = null; }
    if (b.dataset.off) { const slot = b.dataset.off; unequip(slot); toast(slot === 'clothes' ? '👕 Wieder in Standardkleidung' : slotLabel(slot) + ' abgelegt'); popItem = null; }
    if (b.dataset.use) { usePotion(b.dataset.use); if (!S.bag[b.dataset.use]) popItem = null; }
    save(); updateHud(); renderInv();
  });
  $('invBody').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.cat) { invCat = b.dataset.cat; renderInv(); return; }
    if (b.dataset.tooltab) { tab = 'tools'; renderInv(); return; }
    if (b.dataset.slot) { popItem = { slot: b.dataset.slot }; renderItemPop(); return; }
    if (b.dataset.item) { popItem = CONS[b.dataset.item] ? { cons: b.dataset.item } : { id: b.dataset.item }; renderItemPop(); return; }
    if (b.dataset.raw) { popItem = { raw: b.dataset.raw }; renderItemPop(); return; }
    if (b.dataset.stat && S.points > 0) {
      const oldMax = derived().hpMax;
      S.stat[b.dataset.stat]++; S.points--; S.stats.spent = (S.stats.spent || 0) + 1;
      S.hp += derived().hpMax - oldMax;
      vibrate(15); checkAch(); updateHud();
    }
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
  // Chat (Welt, Land, Gruppe) + Spielerliste
  // =====================================================================
  const CHAT_KEY = 'cimacu-chat-v1';
  let chatData = { world: [] }, chatTab = 'world', lastSend = 0, bubbleUntil = 0;
  try { chatData = JSON.parse(localStorage.getItem(CHAT_KEY)) || chatData; } catch (e) { }
  const BAD = ['arsch', 'idiot', 'scheiß', 'scheiss', 'fick', 'hure', 'wichser', 'fotze', 'bastard', 'spast', 'missgeburt', 'nazi'];
  const clean = t => { let s = t; BAD.forEach(w => { s = s.replace(new RegExp(w, 'gi'), m => '*'.repeat(m.length)); }); return s; };
  const chatChannels = () => {
    const list = [['world', '🌍 Welt'], [S.land, L.e + ' ' + L.name]];
    if (party) list.push(['group', '👥 Gruppe']);
    list.push(['players', '🧑‍🤝‍🧑 Spieler']);
    return list;
  };
  const storeChat = (key, msg) => {
    (chatData[key] = chatData[key] || []).push(msg);
    chatData[key] = chatData[key].slice(-60);
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatData)); } catch (err) { }
  };
  const renderChat = () => {
    if (chatTab === 'group' && !party) chatTab = 'world';
    if (chatTab !== 'world' && chatTab !== 'group' && chatTab !== 'players') chatTab = S.land;
    $('chatTabs').innerHTML = chatChannels().map(([id, name]) => `<button data-ch="${id}" class="${chatTab === id ? 'on' : ''}">${name}</button>`).join('');
    $('netInfo').innerHTML = netInfoText();
    const isPl = chatTab === 'players';
    $('chatEmoji').style.display = isPl ? 'none' : ''; $('chatForm').style.display = isPl ? 'none' : '';
    const cl = $('chatList');
    if (isPl) { cl.innerHTML = renderPlayers(); return; }
    const list = chatData[chatTab] || [];
    const sys = chatTab === 'world' ? 'Welt-Chat: alle Spieler in allen Ländern lesen mit.' : chatTab === 'group' ? 'Gruppen-Chat: nur deine Gruppe liest mit.' : 'Orts-Chat: nur Spieler in diesem Land lesen mit.';
    cl.innerHTML = '<div class="msg sys">' + sys + '</div>' +
      list.map(m => `<div class="msg${m.me ? ' me' : ''}"><span class="who">${CLASSES[m.c] ? CLASSES[m.c].e : ''} ${esc(m.n)}</span>${esc(m.t)}</div>`).join('');
    cl.scrollTop = cl.scrollHeight;
  };
  $('chatEmoji').innerHTML = ['👋', '😀', '😂', '👍', '❤️', '🔥', '⚔️', '💎', '🤝', '🎉'].map(e => `<button type="button">${e}</button>`).join('');
  $('chatEmoji').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const i = $('chatIn'); i.value = (i.value + b.textContent).slice(0, 120); i.focus(); });
  $('chatTabs').addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (b) { chatTab = b.dataset.ch; renderChat(); } });
  $('chatBtn').addEventListener('click', () => { $('chat').hidden = false; $('chatBtn').classList.remove('dot'); renderChat(); });
  $('chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const i = $('chatIn'); let t = i.value.trim().replace(/\s+/g, ' ');
    if (!t || !S.hero || chatTab === 'players') return;
    if (Date.now() - lastSend < 1500) { toast('Bitte nicht so schnell schreiben 🙂'); return; }
    lastSend = Date.now();
    t = clean(t).slice(0, 120);
    storeChat(chatTab, { n: S.hero.name, c: S.hero.cls, t, ts: Date.now(), me: 1 });
    const ch = chatTab === 'world' ? 'world' : chatTab === 'group' ? 'group' : 'land';
    Net.send(ch === 'land' ? landTopic() : 'welt', { k: 'chat', ch, n: S.hero.name, c: S.hero.cls, t, gid: party ? party.id : '' });
    i.value = ''; renderChat();
    if (ch !== 'group') { $('bubble').textContent = t; $('bubble').classList.add('show'); bubbleUntil = performance.now() + 4500; }
  });

  // =====================================================================
  // Figur erstellen
  // =====================================================================
  let creating = false, draft = { name: '', gender: 'm', cls: 'fighter' };
  const renderCreate = () => {
    document.querySelectorAll('#cGender button').forEach(b => b.classList.toggle('on', b.dataset.g === draft.gender));
    $('cClass').innerHTML = Object.keys(CLASSES).map(k => `<button data-c="${k}" class="${draft.cls === k ? 'on' : ''}"><span class="e">${CLASSES[k].e}</span>${CLASSES[k].name}</button>`).join('');
    $('cDesc').textContent = CLASSES[draft.cls].desc;
  };
  const previewHero = () => { const keep = S.hero; S.hero = { name: draft.name || '…', gender: draft.gender, cls: draft.cls }; buildHero(); if (!keep) nameTag && nameTag.setEnabled(false); S.hero = keep; if (!keep) applyGear(); };
  const openCreate = () => {
    creating = true; $('create').hidden = false; document.body.classList.add('creating');
    if (S.hero) draft = { name: S.hero.name, gender: S.hero.gender, cls: S.hero.cls };
    $('cName').value = draft.name; renderCreate();
    hero.rotation.y = Math.PI; facing = Math.PI;
  };
  $('cGender').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; draft.gender = b.dataset.g; renderCreate(); previewCreate(); });
  $('cClass').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; draft.cls = b.dataset.c; renderCreate(); previewCreate(); });
  const previewCreate = () => {
    const keep = S.hero, gearKeep = Object.assign({}, S.gear);
    S.hero = { name: draft.name || ' ', gender: draft.gender, cls: draft.cls };
    const start = CLASSES[draft.cls].start;
    S.gear = Object.assign({}, S.gear, { weapon: start[0] });
    buildHero(); if (nameTag) nameTag.setEnabled(false);
    hero.rotation.y = Math.PI;
    S.hero = keep; S.gear = gearKeep;
  };
  $('cName').addEventListener('input', () => { draft.name = $('cName').value; $('cErr').textContent = ''; });
  $('cGo').addEventListener('click', () => {
    const name = $('cName').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { $('cErr').textContent = 'Der Name braucht mindestens 2 Zeichen.'; return; }
    if (!/^[\p{L}\p{N} _\-]+$/u.test(name)) { $('cErr').textContent = 'Bitte nur Buchstaben, Zahlen, Leerzeichen, - und _.'; return; }
    if (clean(name) !== name) { $('cErr').textContent = 'Bitte wähle einen freundlichen Namen.'; return; }
    const isNew = !S.hero;
    const c = CLASSES[draft.cls];
    // Grundwerte der Klasse (bei bestehendem Spielstand: Unterschied draufrechnen)
    const oldBase = S.hero ? CLASSES[S.hero.cls].base : { vit: 5, str: 5, int: 5, dex: 5 };
    Object.keys(c.base).forEach(k => { S.stat[k] = Math.max(1, S.stat[k] - oldBase[k] + c.base[k]); });
    S.hero = { name, gender: draft.gender, cls: draft.cls };
    // Startausrüstung der Klasse
    c.start.forEach(id => { if (!S.owned[id]) S.owned[id] = true; const g = GEAR[id]; if (!S.gear[g.slot] || (g.slot === 'weapon' && GEAR[S.gear.weapon] && GEAR[S.gear.weapon].cls !== draft.cls)) S.gear[g.slot] = id; });
    if (S.gear.weapon && GEAR[S.gear.weapon].cls && GEAR[S.gear.weapon].cls !== draft.cls) S.gear.weapon = c.start[0];
    S.hp = derived().hpMax;
    save();
    creating = false; $('create').hidden = true; document.body.classList.remove('creating');
    buildHero(); updateHud();
    cam.radius = zoomR; cam.beta = 1.1;
    sendPresence(false); lastStKey = ''; sendState(true); if (party) sendParty();
    toast((isNew ? 'Willkommen in Cimacu, ' : 'Neu: ') + esc(name) + '! ' + c.e + ' ' + c.name, true);
    if (isNew) setTimeout(() => toast('🏪 Vorne sind die Händler, rechts das 🧭 Reisetor. Draußen findest du Rohstoffe!'), 3300);
  });

  // =====================================================================
  // Steuerung
  // =====================================================================
  const stick = $('stick'), knob = $('knob'), hint = $('hint');
  const RJ = 50;
  let joyId = null, joyStart = null, joy = { x: 0, y: 0 }, camId = null, camLast = null;
  // Zoomen: zwei Finger auseinander/zusammen (oder Mausrad)
  const ZOOM_MIN = 5, ZOOM_MAX = 24;
  let zoomR = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +S.zoom || 12)), pinch = null, zoomSaveT = 0;
  const pts = {};
  const setZoom = r => { zoomR = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, r)); if (!creating) cam.radius = zoomR; clearTimeout(zoomSaveT); zoomSaveT = setTimeout(() => { S.zoom = +zoomR.toFixed(2); save(); }, 600); };
  const pinchDist = () => { const [a, b] = pinch.ids.map(id => pts[id]); return Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)); };
  const startPinch = (a, b) => {
    pinch = { ids: [a, b] }; pinch.d0 = pinchDist(); pinch.r0 = zoomR;
    if (joyId === a || joyId === b) { joyId = null; joy = { x: 0, y: 0 }; homeStick(); }
    camId = null; hint.style.opacity = '0';
  };
  const homeStick = () => { stick.style.left = (90 + safeLeft()) + 'px'; stick.style.top = (window.innerHeight - 110) + 'px'; stick.style.opacity = '.5'; knob.style.transform = ''; };
  const safeLeft = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sal')) || 0;
  homeStick();
  canvas.addEventListener('pointerdown', e => {
    if (creating) return;
    hint.style.opacity = '0';
    tryLandscape();
    pts[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now(), x0: e.clientX, y0: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    if (pinch) return;
    // Zweiter Finger: mit dem Kamera-Finger oder einem frisch aufgesetzten Lauf-Finger = Zoomen
    if (camId !== null) { startPinch(camId, e.pointerId); return; }
    if (joyId !== null) {
      const j = pts[joyId];
      if (j && performance.now() - j.t < 350 && Math.hypot(j.x - j.x0, j.y - j.y0) < 14) { startPinch(joyId, e.pointerId); return; }
    }
    if (e.clientX < window.innerWidth / 2 && joyId === null) {
      joyId = e.pointerId; joyStart = { x: e.clientX, y: e.clientY };
      stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.style.opacity = '1';
    } else if (camId === null) { camId = e.pointerId; camLast = { x: e.clientX, y: e.clientY }; }
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoomR * (1 + Math.sign(e.deltaY) * 0.1)); }, { passive: false });
  // iPhone: eigenes Seiten-Zoomen verhindern
  ['gesturestart', 'gesturechange'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
  canvas.addEventListener('pointermove', e => {
    if (pts[e.pointerId]) { pts[e.pointerId].x = e.clientX; pts[e.pointerId].y = e.clientY; }
    if (pinch) {
      if (pinch.ids.includes(e.pointerId) && pinch.ids.every(id => pts[id])) setZoom(pinch.r0 * pinch.d0 / pinchDist());
      return;
    }
    if (e.pointerId === joyId) {
      let dx = e.clientX - joyStart.x, dy = e.clientY - joyStart.y;
      const len = Math.hypot(dx, dy);
      if (len > RJ) { dx *= RJ / len; dy *= RJ / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      joy.x = dx / RJ; joy.y = -dy / RJ;
    } else if (e.pointerId === camId) {
      cam.alpha -= (e.clientX - camLast.x) * 0.008;
      cam.beta = Math.min(1.4, Math.max(0.55, cam.beta - (e.clientY - camLast.y) * 0.005));
      camLast = { x: e.clientX, y: e.clientY };
    }
  });
  const release = e => {
    delete pts[e.pointerId];
    if (pinch && pinch.ids.includes(e.pointerId)) {
      // Der übrige Finger dreht danach wieder die Kamera
      const other = pinch.ids.find(id => id !== e.pointerId);
      pinch = null;
      if (pts[other]) { camId = other; camLast = { x: pts[other].x, y: pts[other].y }; }
      return;
    }
    if (e.pointerId === joyId) { joyId = null; joy = { x: 0, y: 0 }; homeStick(); }
    if (e.pointerId === camId) camId = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  const keys = {};
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    keys[k] = true; hint.style.opacity = '0';
    if (creating) return;
    if ((k === ' ' || k === 'e') && !e.repeat) { actionHeld = true; holdKind = null; startSwing(); }
    if (k === 'i') { if ($('inv').hidden) openInv('inv'); else $('inv').hidden = true; }
    if (k === 'k') { if ($('inv').hidden) openInv('char'); else $('inv').hidden = true; }
    if (k === 'c') { $('chatBtn').click(); e.preventDefault(); }
    if (k === '+' || k === '=') setZoom(zoomR * 0.9);
    if (k === '-') setZoom(zoomR * 1.1);
    if (k === 'escape') ['inv', 'shop', 'travel', 'chat'].forEach(id => { $(id).hidden = true; });
    if (k === 'p') $('pvpBtn').click();
  });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ' || k === 'e') actionHeld = false; });

  // =====================================================================
  // Tiere & Kampf
  // =====================================================================
  const ANIMALS = {
    hase:        { name: 'Hase',           tier: 1, hp: 22,  dmg: 0,  spd: 6.0, xp: 6,   passive: true, size: 1.0,  look: 'rabbit',   fur: '#c8a27a', belly: '#f2e6d6', drop: 'fur' },
    fuchs:       { name: 'Fuchs',          tier: 1, hp: 38,  dmg: 4,  spd: 4.6, xp: 11,  aggro: 6,  size: 1.0,  look: 'fox',      fur: '#d8742a', belly: '#f4f0ea', drop: 'fur' },
    eber:        { name: 'Wildschwein',    tier: 1, hp: 65,  dmg: 7,  spd: 3.9, xp: 17,  aggro: 7,  size: 1.0,  look: 'boar',     fur: '#5a3f2e', belly: '#7a5a44', drop: 'tusk' },
    eiswolf:     { name: 'Eiswolf',        tier: 2, hp: 125, dmg: 12, spd: 5.0, xp: 34,  aggro: 10, size: 1.05, look: 'wolf',     fur: '#cfdbe6', belly: '#f4f8fb', drop: 'wolf' },
    eisbaer:     { name: 'Eisbär',         tier: 2, hp: 250, dmg: 20, spd: 3.6, xp: 62,  aggro: 8,  size: 1.0,  look: 'bear',     fur: '#f2f4f6', belly: '#e2e6ea', drop: 'bear' },
    skorpion:    { name: 'Riesenskorpion', tier: 3, hp: 290, dmg: 26, spd: 4.0, xp: 88,  aggro: 9,  size: 1.25, look: 'scorpion', fur: '#3a2618', belly: '#6a4a2a', drop: 'sting' },
    kobra:       { name: 'Kobra',          tier: 3, hp: 210, dmg: 33, spd: 4.8, xp: 78,  aggro: 10, size: 1.0,  look: 'snake',    fur: '#b8952a', belly: '#e8d47a', drop: 'venom' },
    steinbock:   { name: 'Steinbock',      tier: 4, hp: 420, dmg: 36, spd: 4.8, xp: 135, aggro: 9,  size: 1.15, look: 'goat',     fur: '#8a7a68', belly: '#c9bca8', drop: 'horn' },
    hoehlenbaer: { name: 'Höhlenbär',      tier: 4, hp: 720, dmg: 50, spd: 3.8, xp: 230, aggro: 9,  size: 1.2,  look: 'bear',     fur: '#4a3226', belly: '#6a4a36', drop: 'claw' }
  };
  const LAND_ANIMALS = { gruen: [['hase', 5], ['fuchs', 5], ['eber', 5]], eis: [['eiswolf', 8], ['eisbaer', 5]], wueste: [['skorpion', 7], ['kobra', 7]], berg: [['steinbock', 7], ['hoehlenbaer', 5]] };
  const TIER_LOOT = {
    1: { cim: [2, 6], pots: [['potion', 0.22]], gear: 0.06, pool: ['h1', 'a1', 's1', 'b1', 'CW1', 'CW2'] },
    2: { cim: [8, 16], pots: [['potion', 0.25], ['potion2', 0.1]], gear: 0.08, pool: ['h2', 'a2', 's2', 'b2', 'c1', 'CW2', 'CW3'] },
    3: { cim: [18, 32], pots: [['potion2', 0.3], ['potion3', 0.08]], gear: 0.1, pool: ['h2', 'a3', 's2', 'b2', 'j1', 'j2', 'CW3', 'CW4'] },
    4: { cim: [35, 60], pots: [['potion2', 0.3], ['potion3', 0.2]], gear: 0.13, pool: ['h3', 'a3', 's3', 'b3', 'j1', 'j2', 'j3', 'CW4', 'CW5', 'a4'] }
  };
  const CW_PREFIX = { fighter: 'w', mage: 'm', spy: 'd' };
  const TIER_COL = ['', '#7cc242', '#5fa8ff', '#ff9a2a', '#e04848'];
  const AB = {
    fighter: [['power', 3, 5], ['wall', 6, 15], ['whirl', 10, 10]],
    mage: [['fireball', 3, 4], ['heal', 6, 20], ['frost', 10, 15]],
    spy: [['poison', 3, 6], ['shadow', 6, 8], ['vanish', 10, 20]]
  };
  let mobs = [], mobSrc = {}, curMob = null, combatT = 0, wallT = 0, invisT = 0, deadUntil = 0;
  const abCd = {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reachOf = m => cls() === 'mage' ? 8 : 1.9 + m.r;

  // ---------- Modelle der Tiere (je Art einmal gebaut, dann viele Kopien) ----------
  const buildAnimalSrc = type => {
    const A = ANIMALS[type], f = A.fur, bel = A.belly;
    const P = [], LF = [], LB = [];
    let legY = 0, zF = 0, zB = 0, anim = 'quad', barY = 1.6, r = 0.6;
    const eyes = (y, z, x, s) => [-1, 1].forEach(sx => {
      P.push(part('sph', { diameter: s, segments: 6 }, '#141414', x * sx, y, z));
      P.push(part('sph', { diameter: s * 0.4, segments: 4 }, '#ffffff', x * sx + 0.015 * sx, y + s * 0.2, z + s * 0.35));
    });
    if (A.look === 'scorpion') {
      P.push(part('sph', { diameter: 1 }, f, 0, 0.32, 0, [0.9, 0.36, 1.1]));
      P.push(part('sph', { diameter: 1 }, bel, 0, 0.38, 0.05, [0.7, 0.22, 0.9]));
      P.push(part('sph', { diameter: 1 }, f, 0, 0.33, 0.62, [0.55, 0.26, 0.4]));
      eyes(0.44, 0.78, 0.09, 0.07);
      [-1, 1].forEach(s => {
        P.push(part('caps', { radius: 0.07, height: 0.6, tessellation: 8 }, f, 0.35 * s, 0.32, 0.85, null, [Math.PI / 2, 0.5 * s, 0]));
        P.push(part('sph', { diameter: 0.34, segments: 8 }, bel, 0.52 * s, 0.34, 1.12, [1, 0.7, 1.3]));
        P.push(part('cyl', { diameterTop: 0, diameterBottom: 0.1, height: 0.3, tessellation: 5 }, '#2a1a10', 0.47 * s, 0.34, 1.35, null, [Math.PI / 2, 0, 0]));
      });
      [[0, 0.42, -0.6, 0.3], [0, 0.66, -0.9, 0.27], [0, 1.0, -1.0, 0.24], [0, 1.3, -0.86, 0.21], [0, 1.45, -0.56, 0.19]].forEach(([x, y, z, d]) => P.push(part('sph', { diameter: d, segments: 8 }, f, x, y, z)));
      P.push(part('cyl', { diameterTop: 0, diameterBottom: 0.14, height: 0.35, tessellation: 6 }, '#c0392b', 0, 1.38, -0.3, null, [2.2, 0, 0]));
      [-1, 1].forEach(s => [0.35, 0.05, -0.25, -0.5].forEach(z => (s < 0 ? LF : LB).push(part('caps', { radius: 0.035, height: 0.7, tessellation: 6 }, '#2a1a10', 0.6 * s, 0.2, z, null, [0, 0, 1.1 * s]))));
      anim = 'scuttle'; barY = 1.9; r = 0.9;
    } else if (A.look === 'snake') {
      P.push(part('tor', { diameter: 1.0, thickness: 0.24, tessellation: 18 }, f, 0, 0.12, -0.15));
      P.push(part('tor', { diameter: 0.62, thickness: 0.22, tessellation: 16 }, bel, 0, 0.32, -0.15));
      P.push(part('caps', { radius: 0.12, height: 1.1, tessellation: 10 }, f, 0, 0.78, 0.2, null, [-0.25, 0, 0]));
      P.push(part('sph', { diameter: 1, segments: 12 }, f, 0, 1.22, 0.38, [0.42, 0.5, 0.1]));
      P.push(part('sph', { diameter: 1, segments: 10 }, bel, 0, 1.2, 0.42, [0.28, 0.36, 0.06]));
      P.push(part('sph', { diameter: 1, segments: 10 }, f, 0, 1.38, 0.5, [0.17, 0.12, 0.26]));
      eyes(1.43, 0.6, 0.07, 0.06);
      P.push(part('box', { width: 0.03, height: 0.01, depth: 0.16 }, '#d9304a', 0, 1.35, 0.68));
      anim = 'sway'; barY = 2.0; r = 0.6;
    } else {
      const Q = {
        rabbit: { b: [0.3, 0.27, 0.42], leg: 0.16, lr: 0.06, hr: 0.2, ear: 'long', tail: 'puff', snout: null },
        fox: { b: [0.26, 0.26, 0.55], leg: 0.36, lr: 0.055, hr: 0.21, ear: 'pointy', tail: 'bushy', snout: [0.24, 0.08] },
        boar: { b: [0.42, 0.4, 0.68], leg: 0.28, lr: 0.09, hr: 0.3, ear: 'pointy', tail: 'short', snout: [0.24, 0.13], tusks: true },
        wolf: { b: [0.3, 0.3, 0.66], leg: 0.5, lr: 0.07, hr: 0.25, ear: 'pointy', tail: 'bushy', snout: [0.3, 0.09] },
        bear: { b: [0.55, 0.52, 0.85], leg: 0.45, lr: 0.15, hr: 0.38, ear: 'round', tail: 'short', snout: [0.2, 0.15] },
        goat: { b: [0.3, 0.33, 0.6], leg: 0.6, lr: 0.06, hr: 0.22, ear: 'small', tail: 'short', snout: [0.2, 0.09], horns: true, beard: true }
      }[A.look];
      const [bx, by, bz] = Q.b, cy = Q.leg + by * 0.75, hr = Q.hr;
      const hy = A.look === 'rabbit' ? cy + by * 0.7 : cy + by * 0.45, hz = bz * 0.95 + (A.look === 'rabbit' ? 0 : hr * 0.4);
      P.push(part('sph', { diameter: 2, segments: 14 }, f, 0, cy, 0, [bx, by, bz]));
      P.push(part('sph', { diameter: 2, segments: 12 }, bel, 0, cy - by * 0.3, 0.05, [bx * 0.82, by * 0.68, bz * 0.85]));
      P.push(part('sph', { diameter: 2 * hr, segments: 12 }, f, 0, hy, hz));
      if (Q.snout) {
        P.push(part('caps', { radius: Q.snout[1], height: Q.snout[0] + Q.snout[1] * 2, tessellation: 10 }, A.look === 'boar' ? '#c98a7a' : bel, 0, hy - hr * 0.25, hz + hr * 0.75, null, [Math.PI / 2, 0, 0]));
        P.push(part('sph', { diameter: Q.snout[1] * 1.1, segments: 6 }, '#1a1a1a', 0, hy - hr * 0.2, hz + hr * 0.75 + Q.snout[0] / 2 + Q.snout[1]));
      } else P.push(part('sph', { diameter: 0.06, segments: 5 }, '#e88a9a', 0, hy - 0.02, hz + hr * 0.98));
      eyes(hy + hr * 0.18, hz + hr * 0.78, hr * 0.42, hr * 0.28);
      [-1, 1].forEach(s => {
        if (Q.ear === 'long') P.push(part('caps', { radius: hr * 0.22, height: hr * 2.6, tessellation: 8 }, f, hr * 0.32 * s, hy + hr * 1.35, hz - hr * 0.3, [1, 1, 0.55], [-0.2, 0, 0.18 * s]));
        if (Q.ear === 'pointy') P.push(part('cyl', { diameterTop: 0, diameterBottom: hr * 0.75, height: hr * 0.85, tessellation: 4 }, f, hr * 0.5 * s, hy + hr * 0.95, hz - hr * 0.15, null, [0, 0, -0.3 * s]));
        if (Q.ear === 'round') P.push(part('sph', { diameter: hr * 0.62, segments: 8 }, f, hr * 0.68 * s, hy + hr * 0.78, hz - hr * 0.1));
        if (Q.ear === 'small') P.push(part('caps', { radius: hr * 0.15, height: hr * 0.7, tessellation: 6 }, f, hr * 0.8 * s, hy + hr * 0.3, hz - hr * 0.2, null, [0, 0, 1.2 * s]));
        if (Q.tusks) P.push(part('cyl', { diameterTop: 0, diameterBottom: 0.07, height: 0.2, tessellation: 5 }, '#f4efe2', 0.12 * s, hy - hr * 0.2, hz + hr * 1.0, null, [-0.4, 0, -0.3 * s]));
        if (Q.horns) [0, 1, 2].forEach(i => P.push(part('caps', { radius: 0.05 - i * 0.008, height: 0.28, tessellation: 6 }, '#5a4a3a', (hr * 0.35 + i * 0.05) * s, hy + hr * 0.95 + i * 0.12 - (i > 1 ? 0.12 : 0), hz - 0.05 - i * 0.16, null, [-0.6 - i * 0.7, 0, 0.15 * s])));
      });
      if (Q.beard) P.push(part('cyl', { diameterTop: 0.12, diameterBottom: 0, height: 0.22, tessellation: 5 }, bel, 0, hy - hr * 0.95, hz + hr * 0.5));
      if (Q.tail === 'bushy') { P.push(part('caps', { radius: 0.12, height: 0.62, tessellation: 8 }, f, 0, cy + by * 0.1, -bz - 0.22, null, [-1.0, 0, 0])); P.push(part('sph', { diameter: 0.2, segments: 6 }, bel, 0, cy - by * 0.15, -bz - 0.47)); }
      if (Q.tail === 'short') P.push(part('sph', { diameter: 0.16, segments: 6 }, f, 0, cy + by * 0.3, -bz - 0.02));
      if (Q.tail === 'puff') P.push(part('sph', { diameter: 0.2, segments: 6 }, '#ffffff', 0, cy + by * 0.1, -bz - 0.05));
      zF = bz * 0.5; zB = -bz * 0.5; legY = Q.leg + 0.05;
      [-1, 1].forEach(s => {
        LF.push(part('caps', { radius: Q.lr, height: Q.leg + Q.lr * 2, tessellation: 8 }, f, bx * 0.55 * s, -Q.leg / 2, 0));
        LF.push(part('sph', { diameter: Q.lr * 2.4, segments: 6 }, '#2a1f18', bx * 0.55 * s, -Q.leg + 0.02, 0.02));
        LB.push(part('caps', { radius: Q.lr * 1.1, height: Q.leg + Q.lr * 2, tessellation: 8 }, f, bx * 0.55 * s, -Q.leg / 2, 0));
        LB.push(part('sph', { diameter: Q.lr * 2.4, segments: 6 }, '#2a1f18', bx * 0.55 * s, -Q.leg + 0.02, 0.02));
      });
      barY = hy + hr + 0.6; r = Math.max(bx, bz) * 0.9;
    }
    const hideM = m => { m.isVisible = false; m.isPickable = false; return m; };
    return { body: hideM(group(type + 'B', P)), legF: LF.length ? hideM(group(type + 'LF', LF)) : null, legB: LB.length ? hideM(group(type + 'LB', LB)) : null, legY, zF, zB, anim, barY, r };
  };

  const placeMob = m => {
    for (let t = 0; t < 30; t++) {
      const a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (PONDS.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 2)) continue;
      if (hero && Math.hypot(x - hero.position.x, z - hero.position.z) < 22) continue;
      m.x = x; m.z = z; m.home = { x, z }; return;
    }
    m.x = 40; m.z = 40; m.home = { x: 40, z: 40 };
  };
  const resetMob = m => {
    m.hp = m.maxHp; m.alive = true; m.state = 'wander'; m.tx = m.x; m.tz = m.z; m.waitT = rnd(0, 3);
    m.atkT = 1; m.hurtT = 0; m.frozenT = 0; m.poison = null; m.dieT = 0; m.lunge = 0;
    m.root.setEnabled(true); m.root.rotation.z = 0; m.shadow.isVisible = true;
  };
  function spawnAnimals(landId) {
    mobs = []; mobSrc = {}; curMob = null;
    (LAND_ANIMALS[landId] || []).forEach(([type, count]) => {
      const src = mobSrc[type] = buildAnimalSrc(type), A = ANIMALS[type];
      for (let i = 0; i < count; i++) {
        const sc = A.size * rnd(0.9, 1.1);
        const root = TN('mob_' + type);
        root.scaling.setAll(sc);
        const b = src.body.createInstance('mb'); b.parent = root; b.isPickable = false;
        const mk = (s, z) => { if (!s) return null; const p = TN('leg', root); p.position.set(0, src.legY, z); const l = s.createInstance('ml'); l.parent = p; l.isPickable = false; return p; };
        const m = { type, A, src, root, legF: mk(src.legF, src.zF), legB: mk(src.legB, src.zB), scale: sc, maxHp: A.hp, r: src.r * sc, walkT: Math.random() * 6, face: Math.random() * 6 };
        m.shadow = addBlob(0, 0, 0, 1.6 * sc * (A.look === 'bear' ? 1.4 : 1));
        placeMob(m); resetMob(m);
        mobs.push(m);
      }
    });
  }

  // ---------- Ziel im Kampf ----------
  const mobInReach = () => {
    if (!hero) return null;
    const hx = hero.position.x, hz = hero.position.z;
    let best = null, bd = 1e9;
    for (const m of mobs) {
      if (!m.alive) continue;
      const dx = m.x - hx, dz = m.z - hz;
      if (Math.abs(dx) > 10 || Math.abs(dz) > 10) continue;
      const d = Math.hypot(dx, dz);
      if (d <= reachOf(m) && d < bd) { bd = d; best = m; }
    }
    return best;
  };
  const nearestMob = range => {
    const hx = hero.position.x, hz = hero.position.z;
    let best = null, bd = range;
    for (const m of mobs) if (m.alive) { const d = Math.hypot(m.x - hx, m.z - hz); if (d < bd) { bd = d; best = m; } }
    return best;
  };

  // ---------- Geschosse (Zauberer) ----------
  const shots = [];
  const shotMat = { bolt: smat('#c58bff', 0.3, 0.9), fire: smat('#ff8a2a', 0.3, 1) };
  for (let i = 0; i < 8; i++) { const m = MB.CreateSphere('shot' + i, { diameter: 0.35, segments: 8 }, scene); m.isVisible = false; m.isPickable = false; shots.push({ m, life: 0 }); }
  const fireShot = (m, dmg, kind) => {
    const s = shots.find(x => x.life <= 0) || shots[0];
    s.m.material = shotMat[kind]; s.m.scaling.setAll(kind === 'fire' ? 2 : 1);
    s.m.position.set(hero.position.x + Math.sin(facing) * 0.8, hero.position.y + 1.8, hero.position.z + Math.cos(facing) * 0.8);
    s.m.isVisible = true; s.life = 2; s.target = m; s.dmg = dmg; s.kind = kind;
  };

  // ---------- Schaden ----------
  const dealDamage = (m, dmg, opts) => {
    if (!m.alive) return;
    opts = opts || {};
    const crit = !opts.noCrit && Math.random() < (cls() === 'spy' ? 0.25 : 0.1);
    let v = Math.max(1, Math.round(dmg * (crit ? 1.8 : 1)));
    m.hp -= v; m.hurtT = 0.25; curMob = m; combatT = 5;
    const head = new BABYLON.Vector3(m.x, heightAt(m.x, m.z) + m.src.barY * m.scale, m.z);
    popText(`<span style="color:${opts.color || (crit ? '#ffd23f' : '#ffffff')};font-size:${crit ? 24 : 19}px">${crit ? '💥' : ''}${v}</span>`, head);
    burst(m.x, heightAt(m.x, m.z) + 0.8 * m.scale, m.z, m.A.fur, crit ? 8 : 4);
    if (m.A.passive) m.state = 'flee'; else m.state = 'chase';
    if (m.hp <= 0) killMob(m);
  };
  const attackHit = (m, mult, ability) => {
    const d = derived();
    const dmg = d.atk * rnd(0.85, 1.15) * mult;
    if (cls() === 'mage') { fireShot(m, dmg, ability === 'fireball' ? 'fire' : 'bolt'); return; }
    if (Math.hypot(m.x - hero.position.x, m.z - hero.position.z) > reachOf(m) + 0.8) { popText('daneben', new BABYLON.Vector3(m.x, heightAt(m.x, m.z) + 2, m.z)); return; }
    dealDamage(m, dmg);
    if (ability === 'poison') m.poison = { t: 6, dps: d.atk * 0.5, tick: 1 };
    vibrate(20);
  };
  const killMob = m => {
    m.alive = false; m.dieT = 0.5; m.respawnAt = performance.now() + 40000;
    if (curMob === m) curMob = null;
    S.stats.kills = (S.stats.kills || 0) + 1;
    S.stats['m_' + m.type] = (S.stats['m_' + m.type] || 0) + 1;
    const A = m.A, Lt = TIER_LOOT[A.tier], at = new BABYLON.Vector3(m.x, heightAt(m.x, m.z) + 2, m.z);
    // Gruppen-Bonus: +20 % Erfahrung, wenn ein Gruppenmitglied in der Nähe ist
    const pb = partyNear();
    addXp(Math.round(A.xp * (pb ? 1.2 : 1)));
    if (pb) setTimeout(() => popText('<span style="color:#7cff6b;font-size:14px">👥 +20 % EP</span>', at), 300);
    const cim = Math.round(rnd(Lt.cim[0], Lt.cim[1]));
    S.money += cim; S.stats.looted = (S.stats.looted || 0) + cim;
    setTimeout(() => popText('+' + cim + ' ' + CIM, at), 150);
    if (A.drop && Math.random() < 0.75) give(A.drop, Math.random() < 0.3 ? 2 : 1, at, 450);
    let delay = 700;
    Lt.pots.forEach(([p, ch]) => { if (Math.random() < ch) { S.bag[p] = (S.bag[p] || 0) + 1; setTimeout(() => popText('+1 ' + CONS[p].e, at), delay); delay += 250; } });
    if (Math.random() < Lt.gear * (1 + derived().luck)) {
      let id = Lt.pool[Math.floor(Math.random() * Lt.pool.length)];
      if (id.startsWith('CW')) id = CW_PREFIX[cls()] + id[2];
      const g = GEAR[id];
      if (S.owned[id]) { const v = Math.round(g.price * 0.4); S.money += v; setTimeout(() => toast(`Beute: ${g.e} ${g.name} (hast du schon → +${v} ${CIM})`), 900); }
      else { S.owned[id] = true; S.stats.loot = (S.stats.loot || 0) + 1; setTimeout(() => { toast(`✨ Seltene Beute: ${g.e} ${g.name}! Schau ins 🎒`, true); vibrate([40, 40, 80]); }, 900); }
    }
    burst(m.x, heightAt(m.x, m.z) + 0.8, m.z, '#ffd23f', 10);
    bump('money'); updateHud(); updatePotBtn(); checkAch(); save();
  };
  const hurtPlayer = (raw, m) => {
    if (S.hp <= 0 || deadUntil) return;
    const d = derived();
    const dmg = Math.max(1, Math.round(raw * rnd(0.9, 1.1) * 60 / (60 + d.def * 3) * (wallT > 0 ? 0.5 : 1)));
    S.hp -= dmg; combatT = 5;
    if (!curMob || !curMob.alive) curMob = m;
    popText(`<span style="color:#ff5a5a">-${dmg}</span>`, new BABYLON.Vector3(hero.position.x, hero.position.y + 3, hero.position.z));
    const h = $('hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    vibrate(40); updateHud();
    if (S.hp <= 0) die(m);
  };
  const die = m => {
    S.hp = 0; deadUntil = 1; actionHeld = false;
    const lost = Math.floor(S.money * 0.1);
    $('deathTxt').innerHTML = `${m ? 'Ein ' + m.A.name + ' (Stufe ' + m.A.tier + ')' : 'Etwas'} hat dich besiegt.<br>Du verlierst ${lost} ${CIM} Cim und wachst auf dem Marktplatz auf.`;
    $('death').hidden = false; $('death').dataset.lost = lost;
    updateHud();
  };
  $('deathGo').addEventListener('click', () => {
    S.money = Math.max(0, S.money - (+$('death').dataset.lost || 0));
    S.hp = derived().hpMax; deadUntil = 0; combatT = 0; curMob = null;
    hero.position.set(-2.5, 0, -6); facing = 0; hero.rotation.y = 0;
    mobs.forEach(m => { if (m.alive && m.state === 'chase') m.state = 'wander'; });
    $('death').hidden = true; updateHud(); save();
  });

  // ---------- Heiltränke ----------
  const usePotion = id => {
    const d = derived();
    if (!S.bag[id]) return false;
    if (S.hp >= d.hpMax) { toast('❤ Du bist schon ganz gesund.'); return false; }
    S.bag[id]--; S.hp = Math.min(d.hpMax, S.hp + CONS[id].heal);
    toast(CONS[id].e + ' +' + CONS[id].heal + ' Leben');
    burst(hero.position.x, hero.position.y + 2, hero.position.z, '#ff4fa3', 12);
    updateHud(); updatePotBtn(); save();
    return true;
  };
  const bestPotion = () => {
    const miss = derived().hpMax - S.hp;
    const order = miss > 220 ? ['potion3', 'potion2', 'potion'] : miss > 90 ? ['potion2', 'potion', 'potion3'] : ['potion', 'potion2', 'potion3'];
    return order.find(id => S.bag[id] > 0);
  };
  const updatePotBtn = () => {
    const n = Object.keys(CONS).reduce((a, id) => a + (S.bag[id] || 0), 0);
    $('potBtn').hidden = !n; $('potCnt').textContent = n;
  };
  $('potBtn').addEventListener('click', () => { const id = bestPotion(); if (id) usePotion(id); });

  // ---------- Klassen-Fähigkeiten ----------
  const abilityList = () => AB[cls()].map((a, i) => ({ id: a[0], lv: a[1], cd: a[2], info: ABILITIES[cls()][i] }));
  let abKey = '';
  const renderAbilities = () => {
    const list = abilityList().filter(a => S.level >= a.lv);
    const key = cls() + list.length;
    if (key === abKey) return;
    abKey = key;
    $('abilities').innerHTML = list.map((a, i) => `<button class="ab ab${i}" data-ab="${a.id}" aria-label="${a.info[2]}"><span>${a.info[1]}</span><i></i></button>`).join('');
  };
  const updateAbilityUI = () => {
    renderAbilities();
    document.querySelectorAll('#abilities .ab').forEach(b => {
      const a = abilityList().find(x => x.id === b.dataset.ab);
      const left = abCd[a.id] || 0;
      b.style.setProperty('--cd', (left / a.cd * 360) + 'deg');
      b.classList.toggle('cool', left > 0);
    });
  };
  const useAbility = id => {
    if ((abCd[id] || 0) > 0 || deadUntil || !hero) return;
    const a = abilityList().find(x => x.id === id); if (!a || S.level < a.lv) return;
    const d = derived(), hp = hero.position;
    const needTarget = ['power', 'fireball', 'poison', 'shadow'].includes(id);
    const far = id === 'fireball' || id === 'shadow';
    const tgt = needTarget ? ((far ? nearestMob(11) : mobInReach() || nearestMob(3.5)) || playerTarget(far ? 11 : 3.5)) : null;
    if (needTarget && !tgt) { toast('Kein Gegner in Reichweite'); return; }
    if (tgt) { facing = Math.atan2(tgt.x - hp.x, tgt.z - hp.z); hero.rotation.y = facing; }
    if (id === 'shadow') {
      const bx = tgt.x - Math.sin(tgt.face) * (tgt.r + 1), bz = tgt.z - Math.cos(tgt.face) * (tgt.r + 1);
      burst(hp.x, hp.y + 1, hp.z, '#3a2a5a', 12);
      hero.position.x = bx; hero.position.z = bz;
      facing = Math.atan2(tgt.x - bx, tgt.z - bz); hero.rotation.y = facing;
      burst(bx, heightAt(bx, bz) + 1, bz, '#3a2a5a', 12);
    }
    if (['power', 'poison', 'shadow', 'fireball'].includes(id)) {
      const mult = id === 'power' ? 2 : id === 'fireball' ? 2.2 : id === 'shadow' ? 1.6 : 1;
      swingT = 0; hitDone = false; swingTarget = tgt.isPlayer ? { kind: 'player', pl: tgt, mult, ability: id } : { kind: 'mob', mob: tgt, mult, ability: id };
    }
    if (id === 'wall') { wallT = 6; burst(hp.x, hp.y + 1.5, hp.z, '#5fa8ff', 16); toast('🧱 Schildwall: halber Schaden für 6 Sekunden'); }
    if (id === 'heal') { S.hp = Math.min(d.hpMax, S.hp + d.hpMax * 0.4); burst(hp.x, hp.y + 1.5, hp.z, '#4fd36b', 18); toast('💚 Heilzauber: +' + Math.round(d.hpMax * 0.4) + ' Leben'); updateHud(); }
    if (id === 'whirl') { spinT = 0.5; mobs.forEach(m => { if (m.alive && Math.hypot(m.x - hp.x, m.z - hp.z) < 3.8) dealDamage(m, d.atk * 1.4); }); playersNear(3.8).forEach(r => pvpDeal(r, d.atk * 1.4)); burst(hp.x, hp.y + 1, hp.z, '#ffd23f', 18); }
    if (id === 'frost') { mobs.forEach(m => { if (m.alive && Math.hypot(m.x - hp.x, m.z - hp.z) < 7) { m.frozenT = 3; dealDamage(m, d.atk * 1.3, { color: '#9fe8ff' }); burst(m.x, heightAt(m.x, m.z) + 1, m.z, '#bfefff', 8); } }); playersNear(7).forEach(r => pvpDeal(r, d.atk * 1.3, '#9fe8ff')); burst(hp.x, hp.y + 1, hp.z, '#bfefff', 20); }
    if (id === 'vanish') { invisT = 5; mobs.forEach(m => { if (m.state === 'chase') m.state = 'wander'; }); toast('👻 Unsichtbar für 5 Sekunden'); }
    abCd[id] = a.cd; combatT = 5; vibrate(25);
    updateAbilityUI(); save();
  };
  $('abilities').addEventListener('pointerdown', e => { const b = e.target.closest('[data-ab]'); if (b) { e.preventDefault(); useAbility(b.dataset.ab); } });
  let spinT = 0;

  // ---------- Waffe im Kampf in die Hand nehmen ----------
  const STANCE = {
    home: { sword: [[-0.47, 1.25, 0.05], [Math.PI + 0.45, 0, 0.12]], staff: [[0.15, 1.7, -0.62], [0, 0, 0.5]], dagger: [[0.45, 1.2, 0.12], [Math.PI + 0.3, 0, -0.15]] },
    hand: { sword: [[0, -0.86, 0.05], [Math.PI / 2 - 0.3, 0, 0]], staff: [[0, -0.86, 0.12], [0.3, 0, 0]], dagger: [[0, -0.86, 0.05], [Math.PI / 2 - 0.3, 0, 0]] }
  };
  const updateStance = () => {
    const want = combatT > 0 && !!S.gear.weapon;
    Object.keys(weaponNodes).forEach(k => {
      const n = weaponNodes[k], par = want ? armR : body;
      if (n.parent !== par) {
        n.parent = par;
        const t = (want ? STANCE.hand : STANCE.home)[k];
        n.position.set(t[0][0], t[0][1], t[0][2]); n.rotation.set(t[1][0], t[1][1], t[1][2]);
      }
    });
    const tn = toolNodes[S.eq];
    if (tn && tn.isEnabled() === want) tn.setEnabled(!want);
  };

  // ---------- Lebensbalken über dem Gegner ----------
  const mobBar = $('mobBar');
  const updateMobBar = () => {
    const m = curMob;
    if (!m || !m.alive || Math.hypot(m.x - hero.position.x, m.z - hero.position.z) > 20) { mobBar.hidden = true; return; }
    const p = toScreen(new BABYLON.Vector3(m.x, heightAt(m.x, m.z) + m.src.barY * m.scale + 0.3, m.z));
    if (p.z < 0 || p.z > 1) { mobBar.hidden = true; return; }
    mobBar.hidden = false;
    mobBar.style.left = p.x + 'px'; mobBar.style.top = p.y + 'px';
    mobBar.innerHTML = `<b><span style="background:${TIER_COL[m.A.tier]}">${m.A.tier}</span>${m.A.name}</b><div class="mb"><i style="width:${Math.max(0, m.hp / m.maxHp * 100)}%"></i></div>`;
  };

  // ---------- Tiere bewegen (jedes Bild) ----------
  const updateCombat = (dt, now, paused) => {
    combatT = Math.max(0, combatT - dt); wallT = Math.max(0, wallT - dt);
    Object.keys(abCd).forEach(k => { abCd[k] = Math.max(0, abCd[k] - dt); });
    if (invisT > 0) { invisT -= dt; const v = invisT > 0 ? 0.35 : 1; hero.getChildMeshes(false).forEach(mm => { mm.visibility = v; }); }
    if (spinT > 0) { spinT -= dt; body.rotation.y = (0.5 - spinT) / 0.5 * Math.PI * 2; if (spinT <= 0) body.rotation.y = 0; }
    updateStance();
    // Geschosse
    for (const s of shots) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const m = s.target;
      if (!m || !m.alive || s.life <= 0) { s.life = 0; s.m.isVisible = false; continue; }
      const tx = m.x, ty = heightAt(m.x, m.z) + 0.9 * m.scale, tz = m.z;
      const dx = tx - s.m.position.x, dy = ty - s.m.position.y, dz = tz - s.m.position.z, dd = Math.hypot(dx, dy, dz);
      const step = 22 * dt;
      if (dd < step + 0.3) { if (m.isPlayer) pvpDeal(m, s.dmg, s.kind === 'fire' ? '#ffb02a' : '#e2b8ff'); else dealDamage(m, s.dmg, { color: s.kind === 'fire' ? '#ffb02a' : '#e2b8ff' }); burst(tx, ty, tz, s.kind === 'fire' ? '#ff8a2a' : '#c58bff', 10); s.life = 0; s.m.isVisible = false; }
      else s.m.position.addInPlaceFromFloats(dx / dd * step, dy / dd * step, dz / dd * step);
    }
    if (paused || deadUntil) return;
    const hx = hero.position.x, hz = hero.position.z, safe = Math.hypot(hx, hz) < 15 || invisT > 0;
    for (const m of mobs) {
      const A = m.A;
      if (!m.alive) {
        if (m.dieT > 0) {
          m.dieT -= dt; m.root.rotation.z = Math.min(1.5, (0.5 - m.dieT) * 3.2);
          if (m.dieT <= 0) { m.root.setEnabled(false); m.shadow.isVisible = false; }
        } else if (now > m.respawnAt) { placeMob(m); resetMob(m); }
        continue;
      }
      const dx = hx - m.x, dz = hz - m.z, d = Math.hypot(dx, dz);
      if (d > 75 && m.state === 'wander') continue;
      if (m.poison) { m.poison.t -= dt; m.poison.tick -= dt; if (m.poison.tick <= 0) { m.poison.tick = 1; dealDamage(m, m.poison.dps, { color: '#7cff6b', noCrit: true }); } if (m.poison && m.poison.t <= 0) m.poison = null; if (!m.alive) continue; }
      m.atkT -= dt; m.lunge = Math.max(0, m.lunge - dt);
      let mvx = 0, mvz = 0, sp = 0;
      if (m.frozenT > 0) m.frozenT -= dt;
      else {
        if (A.passive) {
          if (d < 6 || (m.state === 'flee' && d < 16)) { m.state = 'flee'; mvx = -dx / d; mvz = -dz / d; sp = A.spd; }
          else m.state = 'wander';
        } else if (!safe && (d < A.aggro || (m.state === 'chase' && d < A.aggro * 2.5))) {
          m.state = 'chase';
          const reach = 1.1 + m.r + 0.3;
          if (d > reach) { mvx = dx / d; mvz = dz / d; sp = A.spd * 0.85; }
          else { m.face = Math.atan2(dx, dz); if (m.atkT <= 0) { m.atkT = 1.6; m.lunge = 0.3; hurtPlayer(A.dmg, m); } }
        } else if (m.state === 'chase') { m.state = 'wander'; m.tx = m.home.x; m.tz = m.home.z; }
        if (m.state === 'wander') {
          const tdx = m.tx - m.x, tdz = m.tz - m.z, td = Math.hypot(tdx, tdz);
          if (td < 0.6) { m.waitT -= dt; if (m.waitT <= 0) { const a = Math.random() * 6.28, r = 3 + Math.random() * 9; m.tx = m.home.x + Math.cos(a) * r; m.tz = m.home.z + Math.sin(a) * r; m.waitT = rnd(1.5, 4.5); } }
          else { mvx = tdx / td; mvz = tdz / td; sp = A.spd * 0.3; }
        }
      }
      if (sp > 0) {
        let nx = m.x + mvx * sp * dt, nz = m.z + mvz * sp * dt;
        const dc = Math.hypot(nx, nz);
        if (dc < 16) { nx = nx / dc * 16; nz = nz / dc * 16; if (m.state === 'wander') { m.tx = m.home.x; m.tz = m.home.z; } }
        if (dc > WORLD - 2) { nx *= (WORLD - 2) / dc; nz *= (WORLD - 2) / dc; }
        m.x = nx; m.z = nz;
        const want = Math.atan2(mvx, mvz);
        m.face += Math.atan2(Math.sin(want - m.face), Math.cos(want - m.face)) * Math.min(1, dt * 8);
      }
      // Darstellung
      const y = heightAt(m.x, m.z);
      const lunge = m.lunge > 0 ? Math.sin((0.3 - m.lunge) / 0.3 * Math.PI) * 0.5 : 0;
      m.root.position.set(m.x + Math.sin(m.face) * lunge, y, m.z + Math.cos(m.face) * lunge);
      m.root.rotation.y = m.face;
      m.shadow.position.set(m.x, y + 0.06, m.z);
      const mv = Math.min(1, sp / 3);
      m.walkT += dt * (4 + sp * 2.5) * (sp > 0 ? 1 : 0);
      const sw = Math.sin(m.walkT) * 0.6 * mv;
      if (m.src.anim === 'quad') { if (m.legF) m.legF.rotation.x = sw; if (m.legB) m.legB.rotation.x = -sw; }
      else if (m.src.anim === 'scuttle') { if (m.legF) m.legF.rotation.z = sw * 0.4; if (m.legB) m.legB.rotation.z = -sw * 0.4; }
      else m.root.rotation.z = Math.sin(now * 0.004 + m.walkT) * 0.06;
      const pulse = m.hurtT > 0 ? 1 + Math.sin(m.hurtT * 40) * 0.08 : 1;
      if (m.hurtT > 0) m.hurtT -= dt;
      m.root.scaling.setAll(m.scale * pulse);
      if (m.frozenT > 0 && Math.random() < dt * 4) burst(m.x, y + 1, m.z, '#bfefff', 1);
    }
    updateMobBar();
  };

  // =====================================================================
  // Mehrspieler: andere Spieler sehen, Chat, Gruppen, Duelle (PvP)
  // =====================================================================
  // Mit Server (config.js ausgefüllt) läuft alles über Supabase Realtime.
  // Ohne Server = Testmodus: nur Fenster im selben Browser sehen sich (zum Ausprobieren).
  const CFG = window.CIMACU_CONFIG || {};
  const MY_ID = Math.random().toString(36).slice(2, 10);
  const SAFE_R = 15, PARTY_MAX = 4;
  const sStr = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  const sNum = (v, lo, hi) => { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; };
  const landTopic = () => 'land-' + S.land;
  const RP = {};                // andere Spieler im selben Land: id -> Daten + Figur
  let online = {};              // alle Spieler online: id -> { n, c, lv, land, t }
  let party = null;             // { id, lead, mem: { id: { n, c, lv } } }
  let pvpOn = false, pvpT = 0, curPlayer = null, curPlayerT = 0, swingN = 0, wasSwing = false;
  let stTimer = 0, lastStKey = '', lastStAt = 0, prTimer = 0, netTick = 0, lastPr = 0;

  const Net = {
    mode: 'off', chans: {}, sb: null,
    start() {
      if (CFG.supabaseUrl && CFG.supabaseKey) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';
        s.onload = () => { try { this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey); this.mode = 'online'; this.joinAll(); } catch (e) { this.fallback(); } };
        s.onerror = () => this.fallback();
        document.head.appendChild(s);
      } else this.fallback();
    },
    fallback() { this.mode = 'BroadcastChannel' in window ? 'test' : 'off'; this.joinAll(); },
    joinAll() { this.join('welt'); this.join(landTopic()); netUi(); },
    join(topic) {
      if (this.chans[topic] || this.mode === 'off') return;
      if (this.mode === 'online') {
        const ch = this.sb.channel('cimacu-' + topic, { config: { broadcast: { self: false } } });
        ch.on('broadcast', { event: 'm' }, msg => onNet(topic, msg.payload));
        ch.subscribe(st => { if (st === 'SUBSCRIBED') { ch.ready = true; joined(topic); } });
        this.chans[topic] = ch;
      } else {
        const bc = new BroadcastChannel('cimacu-' + topic);
        bc.onmessage = e => onNet(topic, e.data);
        bc.ready = true; this.chans[topic] = bc;
        joined(topic);
      }
    },
    leave(topic) {
      const c = this.chans[topic]; if (!c) return;
      delete this.chans[topic];
      try { if (this.mode === 'online') this.sb.removeChannel(c); else c.close(); } catch (e) { }
    },
    send(topic, payload) {
      const c = this.chans[topic]; if (!c || !c.ready) return;
      payload.from = MY_ID;
      try { if (this.mode === 'online') c.send({ type: 'broadcast', event: 'm', payload }); else c.postMessage(payload); } catch (e) { }
    }
  };
  const joined = topic => {
    if (topic === 'welt') sendPresence(true);
    else { lastStKey = ''; sendState(true); }
    netUi();
  };

  // ---------- Senden ----------
  const sendPresence = ask => {
    if (!S.hero) return;
    lastPr = performance.now();
    Net.send('welt', { k: 'pr', n: S.hero.name, c: S.hero.cls, lv: S.level, land: S.land, ask: ask ? 1 : 0 });
  };
  const sendState = force => {
    if (!S.hero || !hero || creating) return;
    const w = S.gear.weapon && GEAR[S.gear.weapon];
    const p = { k: 'st', n: S.hero.name, c: S.hero.cls, g: S.hero.gender, lv: S.level, x: Math.round(hero.position.x * 20) / 20, z: Math.round(hero.position.z * 20) / 20,
      ry: Math.round(facing * 20) / 20, hp: Math.max(0, Math.round(S.hp)), hm: derived().hpMax, pvp: pvpOn ? 1 : 0, cl: S.gear.clothes || '', w: w ? w.type : '',
      gid: party ? party.id : '', sw: swingN, dead: (deadUntil || S.hp <= 0) ? 1 : 0 };
    const key = JSON.stringify(p), now = performance.now();
    if (!force && key === lastStKey && now - lastStAt < 2000) return;
    lastStKey = key; lastStAt = now;
    Net.send(landTopic(), p);
  };

  // ---------- Empfangen ----------
  const onNet = (topic, p) => {
    if (!p || typeof p !== 'object' || typeof p.from !== 'string' || p.from === MY_ID) return;
    const id = p.from.slice(0, 12), now = performance.now();
    const n = clean(sStr(p.n, 16)) || '???', c = CLASSES[p.c] ? p.c : 'fighter';
    switch (p.k) {
      case 'st': if (topic === landTopic()) updRemote(id, p, n, c); break;
      case 'bye': removeRemote(id); break;
      case 'pr': {
        const isNew = !online[id];
        online[id] = { n, c, lv: sNum(p.lv, 1, 999) | 0, land: LANDS[p.land] ? p.land : 'gruen', t: now };
        if (p.ask && now - lastPr > 1500) setTimeout(() => sendPresence(false), 200 + Math.random() * 800);
        if (isNew) netUi();
        break;
      }
      case 'chat': {
        const t = clean(sStr(p.t, 120)); if (!t) return;
        let key = null;
        if (p.ch === 'world' && topic === 'welt') key = 'world';
        else if (p.ch === 'land' && topic === landTopic()) key = S.land;
        else if (p.ch === 'group' && party && p.gid === party.id && party.mem[id]) key = 'group';
        if (!key) return;
        storeChat(key, { n, c, t, ts: Date.now() });
        if (key === S.land && RP[id]) { RP[id].bubT = t; RP[id].bubUntil = now + 4500; }
        if (!$('chat').hidden) renderChat(); else $('chatBtn').classList.add('dot');
        break;
      }
      case 'ginv': if (p.to === MY_ID) gotInvite(id, n, sStr(p.gid, 30)); break;
      case 'gno': if (p.to === MY_ID) toast(esc(n) + ' möchte gerade nicht in deine Gruppe.'); break;
      case 'gacc': if (p.to === MY_ID) gotAccept(id, n, c, sNum(p.lv, 1, 999) | 0, sStr(p.gid, 30)); break;
      case 'gupd': gotPartyUpdate(id, p); break;
      case 'gleave': if (party && party.lead === MY_ID && p.gid === party.id && party.mem[id]) { delete party.mem[id]; toast('👥 ' + esc(n) + ' hat die Gruppe verlassen.'); sendParty(); } break;
      case 'gdis': if (party && p.gid === party.id && party.lead === id) { party = null; toast('👥 Die Gruppe wurde aufgelöst.'); netUi(); } break;
      case 'hit': if (p.to === MY_ID && topic === landTopic()) gotHit(id, p); break;
      case 'kill': if (p.to === MY_ID) gotKill(id, n); break;
    }
  };

  // ---------- Andere Spieler darstellen ----------
  const tagKey = r => r.n + '|' + r.lv + '|' + r.pvp + '|' + (inParty(r.id) ? 1 : 0);
  const refreshTag = r => {
    const k = tagKey(r); if (k === r.tagKey) return;
    r.tagKey = k; disposeTag(r.tag);
    const bg = inParty(r.id) ? 'rgba(20,110,50,0.85)' : r.pvp ? 'rgba(150,20,30,0.85)' : 'rgba(15,20,45,0.7)';
    r.tag = makeTag(CLASSES[r.c].e + ' ' + r.n + ' · Lv ' + r.lv, bg);
    r.tag.parent = r.ch.root;
  };
  const buildRemote = r => {
    if (r.ch) { r.ch.root.dispose(false, false); r.ch.shadow.dispose(); }
    r.ch = makeCharacter('rp' + r.id, lookFor({ gender: r.g, cls: r.c }, r.cl), null, false);
    r.lookKey = r.g + r.c + r.cl;
    // Waffe in der Hand (einfach gehalten)
    const wn = TN('rpW', r.ch.armR); wn.position.set(0, -0.86, 0.05); wn.rotation.x = Math.PI / 2 - 0.3;
    if (r.w === 'sword') group('rpSw', [part('box', { width: 0.3, height: 0.06, depth: 0.08 }, '#c9a227', 0, 0.25, 0), part('box', { width: 0.09, height: 0.9, depth: 0.03 }, '#d8dde6', 0, 0.72, 0)], wn);
    else if (r.w === 'staff') group('rpSt', [part('cyl', { diameter: 0.07, height: 1.8, tessellation: 6 }, '#6b4526', 0, 0.3, 0), part('sph', { diameter: 0.26, segments: 8 }, '#b07aff', 0, 1.25, 0)], wn);
    else if (r.w === 'dagger') group('rpDg', [part('box', { width: 0.06, height: 0.45, depth: 0.025 }, '#d8dde6', 0, 0.38, 0)], wn);
    r.ch.root.position.set(r.x, heightAt(r.x, r.z), r.z);
    r.tagKey = ''; r.tag = null; refreshTag(r);
  };
  const updRemote = (id, p, n, c) => {
    const lim = WORLD + 5;
    let r = RP[id];
    const x = sNum(p.x, -lim, lim), z = sNum(p.z, -lim, lim);
    if (!r) {
      r = RP[id] = { id, isPlayer: true, alive: true, r: 0.5, scale: 1, x, z, walk: 0, swT: -1, face: 0 };
      toast('👋 ' + esc(n) + ' ist in der Nähe');
    }
    Object.assign(r, { n, c, g: p.g === 'f' ? 'f' : 'm', lv: sNum(p.lv, 1, 999) | 0, tx: x, tz: z, try: sNum(p.ry, -100, 100),
      hp: sNum(p.hp, 0, 99999), hm: sNum(p.hm, 1, 99999), pvp: !!p.pvp, gid: sStr(p.gid, 30), dead: !!p.dead, t: performance.now(),
      cl: GEAR[p.cl] && GEAR[p.cl].slot === 'clothes' ? p.cl : '', w: ['sword', 'staff', 'dagger'].includes(p.w) ? p.w : '' });
    r.alive = !r.dead;
    if (r.sw !== undefined && p.sw !== r.sw) r.swT = 0;
    r.sw = p.sw;
    if (!r.ch || r.lookKey !== r.g + r.c + r.cl || r.wKey !== r.w) { r.wKey = r.w; buildRemote(r); }
    refreshTag(r);
  };
  const removeRemote = id => {
    const r = RP[id]; if (!r) return;
    if (r.ch) { r.ch.root.dispose(false, false); r.ch.shadow.dispose(); }
    disposeTag(r.tag); if (r.bub) r.bub.remove();
    if (curPlayer === r) curPlayer = null;
    delete RP[id];
  };
  const updateRemotes = (dt, now) => {
    for (const id in RP) {
      const r = RP[id];
      if (now - r.t > 7000) { removeRemote(id); continue; }
      const k = Math.min(1, dt * 10), ox = r.x, oz = r.z;
      r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k;
      const mv = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 0.001);
      r.face += Math.atan2(Math.sin(r.try - r.face), Math.cos(r.try - r.face)) * Math.min(1, dt * 10);
      const C = r.ch, y = heightAt(r.x, r.z);
      C.root.position.set(r.x, y, r.z); C.root.rotation.y = r.face;
      C.root.rotation.z = r.dead ? 1.45 : 0;
      C.shadow.position.set(r.x, y + 0.06, r.z);
      const mag = Math.min(1, mv / 6);
      r.walk += dt * 10 * mag;
      const sw = Math.sin(r.walk) * 0.75 * mag;
      C.legL.rotation.x = sw; C.legR.rotation.x = -sw; C.armL.rotation.x = -sw * 0.8;
      if (r.swT >= 0) {
        r.swT += dt / 0.45; const t = r.swT;
        C.armR.rotation.x = t < 0.45 ? -2.5 * (t / 0.45) : t < 0.62 ? -2.5 + 2.1 * ((t - 0.45) / 0.17) : -0.4 * (1 - (t - 0.62) / 0.38);
        if (t >= 1) { r.swT = -1; C.armR.rotation.x = 0; }
      } else C.armR.rotation.x = sw * 0.6;
      // Sprechblase
      if (r.bubUntil) {
        if (!r.bub) { r.bub = document.createElement('div'); r.bub.className = 'rbub'; document.body.appendChild(r.bub); }
        if (now > r.bubUntil) { r.bubUntil = 0; r.bub.classList.remove('show'); }
        else {
          const p = toScreen(new BABYLON.Vector3(r.x, y + 4.35, r.z));
          if (r.bub.textContent !== r.bubT) r.bub.textContent = r.bubT;
          r.bub.style.left = p.x + 'px'; r.bub.style.top = p.y + 'px'; r.bub.classList.add('show');
        }
      }
    }
  };
  const clearRemotes = () => Object.keys(RP).forEach(removeRemote);

  // ---------- Duelle (PvP) ----------
  const inSafe = (x, z) => Math.hypot(x, z) < SAFE_R;
  const inParty = id => !!(party && party.mem[id]);
  const canFight = r => !!(r && pvpOn && r.pvp && !r.dead && S.hp > 0 && !deadUntil && !inParty(r.id) && !inSafe(r.x, r.z) && !inSafe(hero.position.x, hero.position.z));
  const playerTarget = range => {
    if (!hero || !pvpOn) return null;
    const hx = hero.position.x, hz = hero.position.z;
    let best = null, bd = range;
    for (const id in RP) { const r = RP[id]; if (!canFight(r)) continue; const d = Math.hypot(r.x - hx, r.z - hz); if (d < bd) { bd = d; best = r; } }
    return best;
  };
  const playersNear = range => Object.values(RP).filter(r => canFight(r) && Math.hypot(r.x - hero.position.x, r.z - hero.position.z) < range);
  const attackPlayer = (r, mult, ability) => {
    if (!canFight(r)) return;
    const dmg = derived().atk * rnd(0.85, 1.15) * mult;
    if (cls() === 'mage') { fireShot(r, dmg, ability === 'fireball' ? 'fire' : 'bolt'); return; }
    if (Math.hypot(r.x - hero.position.x, r.z - hero.position.z) > 3.4) { popText('daneben', new BABYLON.Vector3(r.x, heightAt(r.x, r.z) + 2.5, r.z)); return; }
    pvpDeal(r, dmg); vibrate(20);
  };
  const pvpDeal = (r, dmg, color) => {
    if (!canFight(r)) return;
    const crit = Math.random() < (cls() === 'spy' ? 0.25 : 0.1);
    const v = Math.max(1, Math.round(dmg * (crit ? 1.8 : 1)));
    Net.send(landTopic(), { k: 'hit', to: r.id, dmg: v });
    popText(`<span style="color:${color || (crit ? '#ffd23f' : '#ffffff')};font-size:${crit ? 24 : 19}px">${crit ? '💥' : ''}${v}</span>`, new BABYLON.Vector3(r.x, heightAt(r.x, r.z) + 3.2, r.z));
    burst(r.x, heightAt(r.x, r.z) + 1.4, r.z, '#ff5a5a', crit ? 8 : 4);
    curPlayer = r; curPlayerT = 6; combatT = 5; pvpT = 10;
  };
  const gotHit = (id, p) => {
    const r = RP[id];
    if (!r || !canFight(r)) return;   // nur echte Duelle zählen
    const d = derived();
    const raw = sNum(p.dmg, 0, 150 + r.lv * 80);
    const dmg = Math.max(1, Math.round(raw * 0.6 * 60 / (60 + d.def * 3) * (wallT > 0 ? 0.5 : 1)));
    S.hp -= dmg; combatT = 5; pvpT = 10; curPlayer = r; curPlayerT = 6;
    popText(`<span style="color:#ff5a5a">-${dmg}</span>`, new BABYLON.Vector3(hero.position.x, hero.position.y + 3, hero.position.z));
    const h = $('hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    vibrate(40); updateHud();
    if (S.hp <= 0) {
      S.hp = 0; deadUntil = 1; actionHeld = false;
      Net.send(landTopic(), { k: 'kill', to: id, n: S.hero.name });
      S.stats.pvpLoss = (S.stats.pvpLoss || 0) + 1;
      $('deathTxt').innerHTML = `⚔️ ${esc(r.n)} hat dich im Duell besiegt.<br>Bei Duellen verlierst du kein Geld. Du wachst auf dem Marktplatz auf.`;
      $('death').hidden = false; $('death').dataset.lost = 0;
      sendState(true); updateHud();
    }
  };
  const gotKill = (id, n) => {
    S.stats.pvpWins = (S.stats.pvpWins || 0) + 1;
    toast('🏆 Du hast ' + esc(n) + ' im Duell besiegt!', true);
    addXp(15 + S.level * 2); vibrate([40, 40, 80]); curPlayer = null; save();
  };
  $('pvpBtn').addEventListener('click', () => {
    if (!S.hero) return;
    if (pvpOn && pvpT > 0) { toast('⚔️ Mitten im Duell kannst du nicht aufhören – warte ' + Math.ceil(pvpT) + ' Sek.'); return; }
    pvpOn = !pvpOn;
    $('pvpBtn').textContent = pvpOn ? '⚔️' : '🕊️';
    $('pvpBtn').classList.toggle('on', pvpOn);
    toast(pvpOn ? '⚔️ Duell-Modus AN: Spieler mit ⚔️ können dich angreifen (nicht auf dem Marktplatz).' : '🕊️ Duell-Modus AUS: Niemand kann dich angreifen.', pvpOn);
    Object.values(RP).forEach(refreshTag);
    sendState(true);
  });
  const updatePlayerBar = () => {
    const r = curPlayer;
    if (!r || !RP[r.id] || curPlayerT <= 0 || !mobBar.hidden) return;
    const p = toScreen(new BABYLON.Vector3(r.x, heightAt(r.x, r.z) + 4.1, r.z));
    if (p.z < 0 || p.z > 1) return;
    mobBar.hidden = false; mobBar.style.left = p.x + 'px'; mobBar.style.top = p.y + 'px';
    mobBar.innerHTML = `<b><span style="background:#c0392b">⚔️</span>${esc(r.n)} · Lv ${r.lv}</b><div class="mb"><i style="width:${Math.max(0, r.hp / r.hm * 100)}%"></i></div>`;
  };

  // ---------- Gruppen ----------
  let pendingInvite = null;
  const newParty = gid => { party = { id: gid, lead: MY_ID, mem: {} }; party.mem[MY_ID] = { n: S.hero.name, c: S.hero.cls, lv: S.level }; };
  const sendParty = () => {
    if (!party || party.lead !== MY_ID) return;
    party.mem[MY_ID] = { n: S.hero.name, c: S.hero.cls, lv: S.level };
    Net.send('welt', { k: 'gupd', gid: party.id, mem: Object.keys(party.mem).map(id => [id, party.mem[id].n, party.mem[id].c, party.mem[id].lv]) });
    netUi();
  };
  const invitePlayer = id => {
    const o = online[id]; if (!o || !S.hero) return;
    if (party && party.lead !== MY_ID) { toast('Nur der Gruppenführer kann einladen.'); return; }
    if (party && Object.keys(party.mem).length >= PARTY_MAX) { toast('Die Gruppe ist voll (höchstens ' + PARTY_MAX + ').'); return; }
    Net.send('welt', { k: 'ginv', to: id, n: S.hero.name, gid: party ? party.id : 'g' + MY_ID + Date.now().toString(36) });
    toast('📨 Einladung an ' + esc(o.n) + ' geschickt');
  };
  const gotInvite = (id, n, gid) => {
    if (!gid) return;
    if (party) { Net.send('welt', { k: 'gno', to: id, n: S.hero ? S.hero.name : '' }); return; }
    pendingInvite = { id, n, gid };
    $('gInvTxt').innerHTML = '👥 <b>' + esc(n) + '</b> lädt dich in eine Gruppe ein';
    $('gInvite').hidden = false; vibrate([30, 30, 30]);
    clearTimeout(gotInvite.t); gotInvite.t = setTimeout(() => { $('gInvite').hidden = true; pendingInvite = null; }, 20000);
  };
  $('gInvYes').addEventListener('click', () => {
    const iv = pendingInvite; $('gInvite').hidden = true; pendingInvite = null;
    if (!iv || party || !S.hero) return;
    Net.send('welt', { k: 'gacc', to: iv.id, n: S.hero.name, c: S.hero.cls, lv: S.level, gid: iv.gid });
    toast('Warte auf ' + esc(iv.n) + ' …');
  });
  $('gInvNo').addEventListener('click', () => {
    const iv = pendingInvite; $('gInvite').hidden = true; pendingInvite = null;
    if (iv) Net.send('welt', { k: 'gno', to: iv.id, n: S.hero ? S.hero.name : '' });
  });
  const gotAccept = (id, n, c, lv, gid) => {
    if (!S.hero) return;
    if (!party) newParty(gid);
    if (party.lead !== MY_ID || party.id !== gid) return;
    if (Object.keys(party.mem).length >= PARTY_MAX) { toast('Die Gruppe ist schon voll.'); return; }
    party.mem[id] = { n, c, lv };
    toast('👥 ' + esc(n) + ' ist jetzt in deiner Gruppe!', true);
    sendParty();
  };
  const gotPartyUpdate = (id, p) => {
    if (!Array.isArray(p.mem)) return;
    const gid = sStr(p.gid, 30);
    const mem = {};
    p.mem.slice(0, PARTY_MAX).forEach(m => { if (Array.isArray(m) && typeof m[0] === 'string') mem[m[0].slice(0, 12)] = { n: clean(sStr(m[1], 16)), c: CLASSES[m[2]] ? m[2] : 'fighter', lv: sNum(m[3], 1, 999) | 0 }; });
    if (mem[MY_ID]) {
      const fresh = !party || party.id !== gid;
      if (party && party.id !== gid) return;   // schon in einer anderen Gruppe
      party = { id: gid, lead: id, mem };
      if (fresh) toast('👥 Du bist jetzt in der Gruppe von ' + esc(mem[id] ? mem[id].n : '?') + '!', true);
      Object.values(RP).forEach(refreshTag); netUi();
    } else if (party && party.id === gid && party.lead === id) {
      party = null; toast('👥 Du bist nicht mehr in der Gruppe.'); Object.values(RP).forEach(refreshTag); netUi();
    }
  };
  const leaveParty = () => {
    if (!party) return;
    if (party.lead === MY_ID) Net.send('welt', { k: 'gdis', gid: party.id });
    else Net.send('welt', { k: 'gleave', gid: party.id });
    party = null; toast('👥 Du hast die Gruppe verlassen.');
    Object.values(RP).forEach(refreshTag); netUi();
  };
  const kickMember = id => { if (party && party.lead === MY_ID && party.mem[id]) { delete party.mem[id]; sendParty(); } };
  const partyNear = () => !!party && Object.values(RP).some(r => party.mem[r.id] && !r.dead && Math.hypot(r.x - hero.position.x, r.z - hero.position.z) < 30);

  // ---------- Anzeigen ----------
  const netInfoText = () => {
    const n = Object.keys(online).length;
    if (Net.mode === 'online') return `🟢 <b>Online</b> – ${n ? n + ' andere Spieler' : 'gerade sonst niemand'} da`;
    if (Net.mode === 'test') return `🧪 <b>Testmodus</b> – noch kein Server verbunden. Andere Spieler siehst du nur in einem 2. Fenster auf diesem Gerät.${n ? ' (' + n + ' da)' : ''}`;
    return '🔌 Offline – andere Spieler sind nicht verfügbar.';
  };
  const renderPlayers = () => {
    let h = '';
    if (party) {
      h += `<div class="pbox"><b>👥 Deine Gruppe</b> <small>(${Object.keys(party.mem).length}/${PARTY_MAX} · +20 % EP, wenn ihr zusammen jagt)</small>`;
      h += Object.keys(party.mem).map(id => {
        const m = party.mem[id], me = id === MY_ID, lead = party.lead === id;
        const kick = party.lead === MY_ID && !me ? `<button class="alt" data-kick="${esc(id)}">Entfernen</button>` : '';
        return `<div class="prow"><span>${CLASSES[m.c].e} <b>${esc(m.n)}</b> · Lv ${m.lv}${lead ? ' 👑' : ''}${me ? ' (du)' : ''}</span>${kick}</div>`;
      }).join('');
      h += `<button class="wide leave" data-leave="1">${party.lead === MY_ID ? 'Gruppe auflösen' : 'Gruppe verlassen'}</button></div>`;
    }
    const ids = Object.keys(online).sort((a, b) => online[b].lv - online[a].lv);
    h += `<h4>Online (${ids.length})</h4>`;
    if (!ids.length) h += '<div class="empty">Gerade ist niemand sonst online.</div>';
    h += ids.map(id => {
      const o = online[id], l = LANDS[o.land];
      let btn;
      if (inParty(id)) btn = '<span class="tag">✔ Gruppe</span>';
      else if (party && party.lead !== MY_ID) btn = '';
      else btn = `<button data-invite="${esc(id)}">Einladen</button>`;
      return `<div class="row"><div class="e">${CLASSES[o.c].e}</div><div class="t"><b>${esc(o.n)}</b><small>Level ${o.lv} · ${l.e} ${l.name}</small></div>${btn}</div>`;
    }).join('');
    return h;
  };
  $('chatList').addEventListener('click', e => {
    const inv = e.target.closest('[data-invite]'); if (inv) { invitePlayer(inv.dataset.invite); return; }
    const k = e.target.closest('[data-kick]'); if (k) { kickMember(k.dataset.kick); renderChat(); return; }
    if (e.target.closest('[data-leave]')) { leaveParty(); renderChat(); }
  });
  const netUi = () => {
    const n = Object.keys(online).length;
    $('onlineCnt').textContent = n ? n : '';
    $('onlineCnt').hidden = !n;
    // Gruppen-Leiste oben
    if (party) {
      $('party').hidden = false;
      $('party').innerHTML = Object.keys(party.mem).filter(id => id !== MY_ID).map(id => {
        const m = party.mem[id], r = RP[id], hpw = r ? Math.max(0, r.hp / r.hm * 100) : 0;
        return `<div class="pm${r ? '' : ' far'}"><span>${CLASSES[m.c].e} ${esc(m.n)}</span><i><b style="width:${hpw}%"></b></i></div>`;
      }).join('') || '<div class="pm"><span>👥 Gruppe: nur du</span></div>';
    } else $('party').hidden = true;
    if (!$('chat').hidden) renderChat();
  };
  const netLandChanged = oldLand => {
    Net.send('land-' + oldLand, { k: 'bye' });
    Net.leave('land-' + oldLand);
    clearRemotes();
    Net.join(landTopic());
    sendPresence(false);
  };

  // Jedes Bild: senden, aufräumen
  const updateNet = (dt, now) => {
    if (Net.mode === 'off') return;
    if (swingT >= 0 && !wasSwing) swingN = (swingN + 1) % 1000;
    wasSwing = swingT >= 0;
    pvpT = Math.max(0, pvpT - dt); curPlayerT = Math.max(0, curPlayerT - dt);
    stTimer -= dt; if (stTimer <= 0) { stTimer = 0.2; sendState(false); }
    prTimer -= dt; if (prTimer <= 0) { prTimer = 8; sendPresence(false); }
    updateRemotes(dt, now);
    netTick -= dt;
    if (netTick <= 0) {
      netTick = 1;
      let changed = false;
      for (const id in online) if (now - online[id].t > 25000) { delete online[id]; changed = true; }
      if (party) {
        if (party.lead === MY_ID) {
          let gone = false;
          Object.keys(party.mem).forEach(id => { if (id !== MY_ID && !online[id]) { delete party.mem[id]; gone = true; } });
          if (gone) sendParty();
        } else if (!online[party.lead]) { party = null; toast('👥 Der Gruppenführer ist offline – Gruppe beendet.'); changed = true; }
      }
      if (changed || party) netUi();
    }
  };
  window.addEventListener('pagehide', () => { Net.send(landTopic(), { k: 'bye' }); });

  // =====================================================================
  // Querformat
  // =====================================================================
  let triedLandscape = false;
  function tryLandscape() {
    if (triedLandscape || !matchMedia('(pointer: coarse)').matches) return;
    triedLandscape = true;
    const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } };
    const el = document.documentElement;
    try { if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen({ navigationUI: 'hide' }).then(lock).catch(lock); else lock(); } catch (e) { lock(); }
  }
  $('rotate').addEventListener('click', () => { triedLandscape = false; tryLandscape(); });

  // =====================================================================
  // Spiel-Schleife
  // =====================================================================
  const SPEED = 7;
  let walkT = 0, uiTimer = 0, idleT = 0, perfTimer = 0, regenTimer = 0, occT = 0;
  const pushOut = (p, o) => {
    const dx = p.x - o.x, dz = p.z - o.z, min = o.r + 0.45, d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 0.0001) { const d = Math.sqrt(d2); p.x = o.x + dx / d * min; p.z = o.z + dz / d * min; }
  };
  const np = { x: 0, z: 0 };
  const overlays = ['inv', 'shop', 'travel', 'chat', 'death'];

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    const now = performance.now();
    idleT += dt;
    const uiOpen = creating || overlays.some(id => !$(id).hidden);
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
      const sp = SPEED * d.speed * (swinging ? 0.35 : 1);
      np.x = hero.position.x + mx * sp * dt; np.z = hero.position.z + mz * sp * dt;
      for (const o of nodes) if (o.alive && Math.abs(o.x - np.x) < 3 && Math.abs(o.z - np.z) < 3) pushOut(np, o);
      for (const o of solids) if (Math.abs(o.x - np.x) < 3 && Math.abs(o.z - np.z) < 3) pushOut(np, o);
      for (const m of mobs) if (m.alive && Math.abs(m.x - np.x) < 3 && Math.abs(m.z - np.z) < 3) pushOut(np, { x: m.x, z: m.z, r: m.r * 0.8 });
      const dc = Math.hypot(np.x, np.z);
      if (dc > WORLD) { np.x *= WORLD / dc; np.z *= WORLD / dc; }
      hero.position.x = np.x; hero.position.z = np.z;
      if (!swinging) { const target = Math.atan2(mx, mz); facing += Math.atan2(Math.sin(target - facing), Math.cos(target - facing)) * Math.min(1, dt * 12); }
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
      const a = t < 0.45 ? -2.5 * (t / 0.45) : t < 0.62 ? -2.5 + 2.1 * ((t - 0.45) / 0.17) : -0.4 * (1 - (t - 0.62) / 0.38);
      armR.rotation.x = a;
      if (!hitDone && t >= 0.6) { hitDone = true; hit(swingTarget); }
      if (t >= 1) { swingT = -1; armR.rotation.x = 0; if (actionHeld) startSwing(); }
    } else armR.rotation.x = swing * 0.8 * (S.eq === 'bucket' ? 0.4 : 0.5);
    if (creating) { hero.rotation.y = Math.PI + Math.sin(idleT * 0.8) * 0.35; armR.rotation.z = 0.08; }

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
    if (portal) portal.swirl.rotation.z += dt * 1.5;

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
        if (block !== n.hidden) { n.hidden = block; n.hideIdx.forEach(i => { n.parts[i].m.isVisible = !block; }); }
      }
    }

    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt; p.v.y -= 14 * dt;
      p.m.position.addInPlaceFromFloats(p.v.x * dt, p.v.y * dt, p.v.z * dt);
      p.m.scaling.setAll(Math.max(0.01, p.life));
      if (p.life <= 0) p.m.isVisible = false;
    }
    if (pondMat && !L.frozen) pondMat.alpha = 0.82 + Math.sin(idleT * 1.5) * 0.04;
    if (snow) snow.emitter.set(hero.position.x, hero.position.y + 14, hero.position.z);

    // Kamera (beim Erstellen nah vor der Figur)
    // Im Querformat beim Erstellen die Figur nach links schieben (rechts ist das Formular)
    const wantOff = creating && window.innerWidth > window.innerHeight ? -window.innerWidth * 0.004 : 0;
    cam.targetScreenOffset.x += (wantOff - cam.targetScreenOffset.x) * Math.min(1, dt * 6);
    if (creating) {
      tmpV.set(hero.position.x, hero.position.y - 0.4, hero.position.z);
      cam.alpha += (-Math.PI / 2 - cam.alpha) * Math.min(1, dt * 4);
      cam.radius += (9.5 - cam.radius) * Math.min(1, dt * 4);
      cam.beta += (1.45 - cam.beta) * Math.min(1, dt * 4);
    } else tmpV.set(hero.position.x, hero.position.y + 2, hero.position.z);
    BABYLON.Vector3.LerpToRef(camTarget, tmpV, Math.min(1, dt * 8), camTarget);
    cam.target.copyFrom(camTarget);

    // Sprechblase über dem Kopf
    const bub = $('bubble');
    if (bubbleUntil) {
      if (now > bubbleUntil) { bub.classList.remove('show'); bubbleUntil = 0; }
      else { const p = toScreen(new BABYLON.Vector3(hero.position.x, hero.position.y + 4.35, hero.position.z)); bub.style.left = p.x + 'px'; bub.style.top = p.y + 'px'; }
    }

    updateCombat(dt, now, uiOpen);
    updateNet(dt, now);
    updatePlayerBar();
    regenTimer += dt;
    if (regenTimer > 1) { regenTimer = 0; S.played = (S.played || 0) + 1; if (S.hp < d.hpMax && S.hp > 0 && combatT <= 0) { S.hp = Math.min(d.hpMax, S.hp + d.hpMax * 0.02); updateHud(); } }
    uiTimer -= dt;
    if (uiTimer <= 0) { uiTimer = 0.12; if (!creating) { updateActButton(); updateAbilityUI(); } }

    perfTimer += dt;
    if (perfTimer > 2) {
      perfTimer = 0;
      const fps = engine.getFps();
      if (fps < 42 && scaleLevel < WORST_SCALE) { scaleLevel = Math.min(WORST_SCALE, scaleLevel + 0.15); engine.setHardwareScalingLevel(scaleLevel); }
      else if (fps > 57 && scaleLevel > BEST_SCALE + 0.01) { scaleLevel = Math.max(BEST_SCALE, scaleLevel - 0.1); engine.setHardwareScalingLevel(scaleLevel); }
    }
  });

  // =====================================================================
  // Start
  // =====================================================================
  buildLand(S.land);
  buildHero();
  hero.position.set(-2.5, 0, -6);
  updatePotBtn();
  updateHud();
  cam.radius = zoomR;
  if (!S.hero) { previewCreate(); openCreate(); }
  Net.start();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => { engine.resize(); if (joyId === null) homeStick(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
})();
