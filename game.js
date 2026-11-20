// Cimacu – Schritt 1: 3D-Welt, Figur, Joystick, Kamera
(function () {
  const canvas = document.getElementById('game');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.53, 0.75, 0.95, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.62, 0.8, 0.95);

  // ---------- Licht ----------
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.65;
  hemi.groundColor = new BABYLON.Color3(0.35, 0.3, 0.45);
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.35), scene);
  sun.position = new BABYLON.Vector3(30, 60, 25);
  sun.intensity = 1.1;
  const shadows = new BABYLON.ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;

  const mat = (name, r, g, b) => {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = new BABYLON.Color3(r, g, b);
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    return m;
  };

  // ---------- Boden mit Hügeln ----------
  const WORLD = 90;
  const heightAt = (x, z) => {
    const d = Math.sqrt(x * x + z * z);
    const flat = Math.min(1, Math.max(0, (d - 8) / 15)); // Mitte flach
    return (Math.sin(x * 0.09) * Math.cos(z * 0.11) * 2.2 + Math.sin((x + z) * 0.05) * 1.5) * flat;
  };
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 200, height: 200, subdivisions: 80, updatable: true }, scene);
  const pos = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  for (let i = 0; i < pos.length; i += 3) pos[i + 1] = heightAt(pos[i], pos[i + 2]);
  ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
  const normals = [];
  BABYLON.VertexData.ComputeNormals(pos, ground.getIndices(), normals);
  ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
  ground.convertToFlatShadedMesh();
  ground.material = mat('grass', 0.42, 0.68, 0.3);
  ground.receiveShadows = true;

  // Wasser am Rand
  const water = BABYLON.MeshBuilder.CreateGround('water', { width: 600, height: 600 }, scene);
  water.position.y = -4.5;
  const wm = mat('water', 0.25, 0.55, 0.85);
  wm.alpha = 0.9;
  water.material = wm;

  // Insel-Rand absenken (außerhalb der Spielfläche)
  // (einfach: Steinring als sichtbare Grenze)

  // ---------- Bäume, Steine ----------
  const obstacles = []; // {x, z, r}
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: 2, diameter: 0.6, tessellation: 6 }, scene);
  trunk.material = mat('wood', 0.45, 0.3, 0.18);
  const crown = BABYLON.MeshBuilder.CreateCylinder('crown', { height: 4, diameterTop: 0, diameterBottom: 3.4, tessellation: 6 }, scene);
  crown.convertToFlatShadedMesh();
  crown.material = mat('leaf', 0.2, 0.5, 0.3);
  const crown2 = BABYLON.MeshBuilder.CreateIcoSphere('crown2', { radius: 1.9, subdivisions: 1 }, scene);
  crown2.material = mat('leaf2', 0.55, 0.72, 0.25);
  const rock = BABYLON.MeshBuilder.CreateIcoSphere('rock', { radius: 1, subdivisions: 1 }, scene);
  rock.material = mat('stone', 0.55, 0.55, 0.6);
  [trunk, crown, crown2, rock].forEach(m => { m.isVisible = false; shadows.addShadowCaster(m); });

  const freeSpot = (minR) => {
    for (let t = 0; t < 30; t++) {
      const a = rand() * Math.PI * 2, d = 10 + rand() * (WORLD - 12);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (obstacles.every(o => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + minR + 1.5) ** 2)) return { x, z };
    }
    return null;
  };

  for (let i = 0; i < 140; i++) {
    const p = freeSpot(1); if (!p) continue;
    const y = heightAt(p.x, p.z), s = 0.8 + rand() * 0.7;
    const t = trunk.createInstance('t' + i);
    t.position.set(p.x, y + 1 * s, p.z); t.scaling.setAll(s);
    const pine = rand() < 0.6;
    const c = (pine ? crown : crown2).createInstance('c' + i);
    c.position.set(p.x, y + (pine ? 3.8 : 3.4) * s, p.z); c.scaling.setAll(s);
    c.rotation.y = rand() * 6;
    obstacles.push({ x: p.x, z: p.z, r: 0.5 * s });
  }
  for (let i = 0; i < 60; i++) {
    const p = freeSpot(1.5); if (!p) continue;
    const s = 0.5 + rand() * 1.2;
    const r = rock.createInstance('r' + i);
    r.position.set(p.x, heightAt(p.x, p.z) + 0.2 * s, p.z);
    r.scaling.set(s * (1 + rand() * 0.5), s * (0.6 + rand() * 0.4), s);
    r.rotation.set(rand(), rand() * 6, rand());
    obstacles.push({ x: p.x, z: p.z, r: 0.9 * s });
  }
  // Grenzsteine am Rand
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const x = Math.cos(a) * (WORLD + 1.5), z = Math.sin(a) * (WORLD + 1.5);
    const r = rock.createInstance('b' + i);
    const s = 1.2 + rand();
    r.position.set(x, heightAt(x, z), z);
    r.scaling.set(s, s * 1.4, s);
    r.rotation.y = rand() * 6;
  }

  // ---------- Held (Low-Poly aus Blöcken) ----------
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
  const belt = mat('belt', 0.55, 0.35, 0.15);
  const eye = mat('eye', 0.1, 0.1, 0.15);

  part('torso', 0.9, 1.0, 0.55, cloth, body, 0, 1.55, 0);
  part('belt', 0.95, 0.15, 0.6, belt, body, 0, 1.1, 0);
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

  // Schatten-Kreis unter dem Helden (hilft auf schwachen Handys)
  hero.position.set(0, heightAt(0, 0), 0);

  // ---------- Kamera ----------
  const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 1.1, 12, new BABYLON.Vector3(0, 2, 0), scene);
  cam.minZ = 0.3; cam.maxZ = 400;
  cam.fov = 0.9;
  const camTarget = new BABYLON.Vector3(0, 2, 0);

  // ---------- Eingabe: Joystick links, Kamera rechts ----------
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  const hint = document.getElementById('hint');
  const R = 50;
  let joyId = null, joyStart = null, joy = { x: 0, y: 0 };
  let camId = null, camLast = null;
  const homeStick = () => { stick.style.left = '90px'; stick.style.top = (window.innerHeight - 140) + 'px'; stick.style.opacity = '.5'; knob.style.transform = ''; };
  homeStick();

  canvas.addEventListener('pointerdown', e => {
    hint.style.opacity = '0';
    if (e.clientX < window.innerWidth / 2 && joyId === null) {
      joyId = e.pointerId; joyStart = { x: e.clientX, y: e.clientY };
      stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.style.opacity = '1';
    } else if (camId === null) {
      camId = e.pointerId; camLast = { x: e.clientX, y: e.clientY };
    }
    canvas.setPointerCapture(e.pointerId);
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

  // Tastatur (zum Testen am PC)
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; hint.style.opacity = '0'; });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  // ---------- Spiel-Schleife ----------
  const SPEED = 7;
  let facing = 0, walkT = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    let jx = joy.x, jy = joy.y;
    if (keys['a'] || keys['arrowleft']) jx -= 1;
    if (keys['d'] || keys['arrowright']) jx += 1;
    if (keys['w'] || keys['arrowup']) jy += 1;
    if (keys['s'] || keys['arrowdown']) jy -= 1;
    let mag = Math.hypot(jx, jy);
    if (mag > 1) { jx /= mag; jy /= mag; mag = 1; }

    // Richtung relativ zur Kamera
    const fx = -Math.cos(cam.alpha), fz = -Math.sin(cam.alpha);
    const mx = fz * jx + fx * jy, mz = -fx * jx + fz * jy;

    if (mag > 0.08) {
      let nx = hero.position.x + mx * SPEED * dt;
      let nz = hero.position.z + mz * SPEED * dt;
      // Kollision mit Bäumen/Steinen
      for (const o of obstacles) {
        const dx = nx - o.x, dz = nz - o.z, min = o.r + 0.45;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 0.0001) { const d = Math.sqrt(d2); nx = o.x + dx / d * min; nz = o.z + dz / d * min; }
      }
      // Weltgrenze
      const dc = Math.hypot(nx, nz);
      if (dc > WORLD) { nx *= WORLD / dc; nz *= WORLD / dc; }
      hero.position.x = nx; hero.position.z = nz;

      const target = Math.atan2(mx, mz);
      let diff = target - facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      facing += diff * Math.min(1, dt * 12);
      hero.rotation.y = facing;
      walkT += dt * 10 * mag;
    } else {
      walkT *= 0.85;
    }
    hero.position.y = heightAt(hero.position.x, hero.position.z);

    // Lauf-Animation
    const swing = Math.sin(walkT) * 0.8 * Math.min(1, mag + 0.001);
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
    body.position.y = Math.abs(Math.cos(walkT)) * 0.08 * mag;

    // Kamera folgt weich
    BABYLON.Vector3.LerpToRef(camTarget, new BABYLON.Vector3(hero.position.x, hero.position.y + 2, hero.position.z), Math.min(1, dt * 8), camTarget);
    cam.target.copyFrom(camTarget);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => { engine.resize(); if (joyId === null) homeStick(); });
})();
