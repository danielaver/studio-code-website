/* ------------------------------------------------------------------
   hero-3d — שכבת WebGL (three.js) לרקע ה-hero של האתר השיווקי.
   מקור: src/hero-3d.js  →  נבנה ל- assets/vendor/hero-3d.min.js
   (esbuild, IIFE, tree-shaken; אין תלות ב-CDN או בקבצים חיצוניים)

   הקומפוזיציה: "ליבת הסטודיו" — קריסטל מסתובב עם מסגרת קווים,
   סביבו 12 צמתים (שירותים) במסלולים נטויים, קווים חיים לליבה,
   ושדה חלקיקים. אינטראקציה: פרלקסה עם העכבר + גלילה.
   ------------------------------------------------------------------ */
import * as THREE from 'three';

const BRAND = { violet: 0x6d5efc, cyan: 0x22d3ee, pink: 0xf472b6, ink: 0x0a0b12 };

const canvas = document.getElementById('hero-3d');
if (!canvas) {
  // אין קנבס בעמוד — אין מה לעשות
} else {
  init();
}

function init() {
  const hero = canvas.closest('.hero') || canvas.parentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
  } catch (err) {
    fallback(err);
    return;
  }
  if (!renderer || !renderer.getContext()) {
    fallback(new Error('no WebGL context'));
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0, 9.4);

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  /* ---------- world (כל מה שמסתובב עם העכבר/גלילה) ---------- */
  const world = new THREE.Group();
  scene.add(world);

  const bob = new THREE.Group();          // ריחוף עדין
  world.add(bob);

  /* ---------- ליבה: קריסטל + מסגרת קווים ---------- */
  const coreGeo = new THREE.IcosahedronGeometry(1.62, 1);
  const core = new THREE.Mesh(
    coreGeo,
    new THREE.MeshStandardMaterial({
      color: 0x1b1738,
      emissive: BRAND.violet,
      emissiveIntensity: 0.28,
      metalness: 0.92,
      roughness: 0.24,
      flatShading: true,
    })
  );
  bob.add(core);

  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: 0xa99cff, transparent: true, opacity: 0.5 })
  );
  cage.scale.setScalar(1.045);
  bob.add(cage);

  // הילה פנימית — ספרייט עם טקסטורה פרוצדורלית (בלי קבצים חיצוניים)
  const glowTex = radialTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xbdb2ff, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(7.4);
  bob.add(glow);

  /* ---------- צמתים: 12 שירותים במסלולים נטויים ---------- */
  const NODE_COUNT = 12;
  const NODE_COLORS = [BRAND.cyan, BRAND.violet, BRAND.pink];
  const nodes = [];
  const nodeGeo = new THREE.OctahedronGeometry(0.17, 0);
  const ringGeo = new THREE.RingGeometry(0.26, 0.3, 32);

  for (let i = 0; i < NODE_COUNT; i += 1) {
    const color = NODE_COLORS[i % NODE_COLORS.length];
    const mesh = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({
      color: 0x0e1020, emissive: color, emissiveIntensity: 1.5,
      metalness: 0.6, roughness: 0.3, flatShading: true,
    }));
    // טבעת דקה סביב כל צומת — "טלמטריה" ויזואלית
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.42, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    mesh.add(ring);

    // מסלול בודד: רדיוס, נטייה, מהירות ופאזה
    const orbit = {
      radius: 2.85 + Math.random() * 1.5,
      tilt: new THREE.Euler(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.1
      ),
      speed: (0.18 + Math.random() * 0.34) * (i % 2 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      spin: 0.5 + Math.random() * 0.9,
    };
    world.add(mesh);
    nodes.push({ mesh, ring, orbit, color });
  }

  // קווי קשר ליבה→צומת (מתעדכנים כל פריים)
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NODE_COUNT * 6), 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({
    color: BRAND.cyan, transparent: true, opacity: 0.24,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  world.add(links);

  /* ---------- שדה חלקיקים ---------- */
  const P_COUNT = 1400;
  const positions = new Float32Array(P_COUNT * 3);
  const seeds = new Float32Array(P_COUNT);
  for (let i = 0; i < P_COUNT; i += 1) {
    const r = 5.5 + Math.random() * 11;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.62;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    seeds[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.06, color: 0x9fb4ff, transparent: true, opacity: 0.62,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  world.add(dust);

  /* ---------- תאורה (פיזיקלית, three ≥ r165) ---------- */
  scene.add(new THREE.HemisphereLight(0x8f86ff, 0x05060c, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4.5, 7, 6);
  scene.add(key);
  const rimCyan = new THREE.PointLight(BRAND.cyan, 90, 40, 2);
  rimCyan.position.set(-5.5, -1.5, 4);
  scene.add(rimCyan);
  const rimPink = new THREE.PointLight(BRAND.pink, 60, 34, 2);
  rimPink.position.set(4.5, 3.5, -4);
  scene.add(rimPink);

  scene.add(new THREE.AmbientLight(0x30324a, 0.7));

  /* ---------- התאמת גודל ---------- */
  const state = { w: 1, h: 1, dpr: 1 };
  function resize() {
    const parent = canvas.parentElement || hero;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const cap = window.innerWidth < 900 ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    if (w === state.w && h === state.h && dpr === state.dpr) return;
    state.w = w; state.h = h; state.dpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // במסכים צרים (מובייל) המצלמה נסוגה והעולם מתכווץ כדי לשמור על פרופורציה
    const narrow = w / h < 1.05;
    camera.fov = narrow ? 54 : 42;
    camera.updateProjectionMatrix();
    world.scale.setScalar(narrow ? 0.78 : 1);
    world.position.set(narrow ? 0 : -1.15, narrow ? 0.4 : 0, 0);
  }
  resize();

  /* ---------- פרלקסה: עכבר + גלילה ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }
  let scrollNorm = 0;
  const onScroll = () => {
    const r = hero.getBoundingClientRect();
    scrollNorm = Math.min(1, Math.max(-1, -r.top / Math.max(1, r.height)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- לולאת רינדור עם השהיה (חיסכון סוללה/GPU) ---------- */
  const clock = new THREE.Clock();
  let raf = 0;
  let visible = true;

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
    if (visible) start(); else stop();
  }, { threshold: 0.01 });
  io.observe(canvas);

  function start() {
    if (raf || reduced || document.hidden || !visible) return;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function pose(t) {
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    world.rotation.y = pointer.x * 0.5 + scrollNorm * 0.55 + t * 0.06;
    world.rotation.x = pointer.y * 0.24 - scrollNorm * 0.12;
    if (!reduced) bob.position.y = Math.sin(t * 0.75) * 0.14;
    bob.rotation.y = t * 0.16;
    bob.rotation.z = Math.sin(t * 0.4) * 0.06;

    dust.rotation.y = t * 0.032;
    dust.rotation.x = Math.sin(t * 0.18) * 0.06;

    const posAttr = linkGeo.getAttribute('position');
    const arr = posAttr.array;
    for (let i = 0; i < nodes.length; i += 1) {
      const { mesh, ring, orbit } = nodes[i];
      const a = orbit.phase + t * orbit.speed;
      const v = new THREE.Vector3(
        Math.cos(a) * orbit.radius,
        Math.sin(a * 1.13) * orbit.radius * 0.42,
        Math.sin(a) * orbit.radius
      );
      v.applyEuler(orbit.tilt);
      mesh.position.copy(v);
      mesh.rotation.y += 0.01 * orbit.spin;
      mesh.rotation.x += 0.006 * orbit.spin;
      const pulse = 0.9 + Math.sin(t * 2.1 + orbit.phase) * 0.1;
      ring.scale.setScalar(pulse);
      ring.rotation.copy(mesh.rotation);

      arr[i * 6] = 0; arr[i * 6 + 1] = 0; arr[i * 6 + 2] = 0;
      arr[i * 6 + 3] = v.x; arr[i * 6 + 4] = v.y; arr[i * 6 + 5] = v.z;
    }
    posAttr.needsUpdate = true;
    linkGeo.computeBoundingSphere();
  }

  function frame() {
    raf = 0;
    const t = clock.getElapsedTime();
    pose(t);
    renderer.render(scene, camera);
    if (!reduced && !document.hidden && visible) raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (reduced) pose(0); }, 120);
  }, { passive: true });

  // פריים ראשון (גם במצב reduced-motion) ואז חשיפה עדינה
  pose(0);
  renderer.render(scene, camera);
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
  if (!reduced) start();

  canvas.dataset.threeReady = '1';

  function fallback(err) {
    if (err && window.console) console.warn('[hero-3d] WebGL unavailable:', err.message);
    canvas.classList.add('is-hidden');
    const root = canvas.closest('.hero');
    if (root) root.classList.add('no-3d');
  }
}

/* טקסטורת הילה פרוצדורלית — ללא קבצים חיצוניים */
function radialTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.22, 'rgba(190,178,255,0.55)');
  g.addColorStop(0.55, 'rgba(109,94,252,0.16)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
