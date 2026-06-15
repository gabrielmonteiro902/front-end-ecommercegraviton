import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Contribution } from '../types/database';

// ── Public types ───────────────────────────────────────────────────────────────

export interface PlanetData {
  id: string;
  name: string;
  totalCommits: number;
  contributions: Contribution[];
  moon?: {
    id: string;
    name: string;
    totalCommits: number;
    contributions: Contribution[];
  };
}

interface OrbitalSystemProps {
  planets: PlanetData[];
  accountName?: string;
  // Commits do usuário logado por projeto — viram o "mapa de países" do sol central.
  sunRegions?: { name: string; commits: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUN_R    = 18;
const SUN_LATS = 72;
const SUN_LONS = 120;
const SUN_CUBE = 0.32;
const SUN_COUNTRY_LIMIT = 20;

const MIN_P_R  = 0.8;
const MAX_P_R  = 2.4;
const MIN_M_R  = 0.3;
const MAX_M_R  = 1.0;

const MIN_ORBIT  = 26;
const ORBIT_STEP = 10;
const MOON_ORBIT_PAD = 1.2;
const SAT_LIMIT = 8;

// ── Palette definitions ────────────────────────────────────────────────────────

const PALETTE_DEFS = [
  ['#0e4429', '#006d32', '#26a641', '#39d353'],
  ['#1a0533', '#4a1070', '#7c3aed', '#a78bfa'],
  ['#1e1b4b', '#3730a3', '#4f46e5', '#818cf8'],
  ['#1c1917', '#92400e', '#d97706', '#fbbf24'],
  ['#0c1a2e', '#1e40af', '#2563eb', '#60a5fa'],
  ['#1f1515', '#991b1b', '#dc2626', '#f87171'],
  ['#042f2e', '#0f766e', '#14b8a6', '#2dd4bf'],
  ['#1e0a00', '#c2410c', '#ea580c', '#fb923c'],
] as const;

const PLANET_PALS = PALETTE_DEFS.map(pal => pal.map(c => new THREE.Color(c)));

const SUN_PAL = ['#0d0d0d', '#191919', '#272727', '#363636', '#464646'].map(c => new THREE.Color(c));
const DARK_CUBE = new THREE.Color('#161b22');

// Verde dos commits (mesma escala da contribution graph do GitHub) — sol data-driven.
const SUN_GREEN = ['#0e4429', '#006d32', '#26a641', '#39d353'].map(c => new THREE.Color(c));

// ── Pseudo-random ─────────────────────────────────────────────────────────────

const sr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

type Disposable = THREE.BufferGeometry | THREE.Material;

// ── Sun globe (uniform gray, Voronoi) ─────────────────────────────────────────

function buildSunGlobe(
  parent: THREE.Group,
  radius: number,
  lats: number,
  lons: number,
  cubeSize: number,
  palette: THREE.Color[],
  dl: Disposable[],
  regions?: { name: string; commits: number }[],
) {
  // ── Data-driven: cada projeto do usuário vira um "país" no sol, dimensionado e
  // iluminado pelos commits que ELE fez ali. Voronoi ponderado preenche o globo
  // (mapa político cinza) com fronteiras escuras entre os países.
  if (regions && regions.length > 0) {
    const limited = [...regions].sort((a, b) => b.commits - a.commits).slice(0, SUN_COUNTRY_LIMIT);
    const maxC = Math.max(...limited.map(r => r.commits), 1);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const poles = limited.map((r, i) => {
      const yy = 1 - (i / Math.max(limited.length - 1, 1)) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const t = golden * i;
      return { nx: Math.cos(t) * rr, ny: yy, nz: Math.sin(t) * rr, commits: r.commits };
    });

    const pts: { x: number; y: number; z: number; color: THREE.Color }[] = [];
    for (let li = 0; li < lats; li++) {
      const phi = (li / (lats - 1)) * Math.PI;
      const lc = Math.max(1, Math.round(lons * Math.sin(phi)));
      for (let lo = 0; lo < lc; lo++) {
        const theta = (lo / lc) * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);

        let best: typeof poles[0] | null = null;
        let bestScore = Infinity, secondScore = Infinity;
        for (const p of poles) {
          const d = Math.sqrt((nx - p.nx) ** 2 + (ny - p.ny) ** 2 + (nz - p.nz) ** 2);
          const w = 0.45 + (p.commits / maxC) * 0.55; // mais commits → "puxa" mais território
          const score = d / w;
          if (score < bestScore) { secondScore = bestScore; bestScore = score; best = p; }
          else if (score < secondScore) { secondScore = score; }
        }

        let color: THREE.Color;
        if (secondScore - bestScore < 0.05) {
          color = DARK_CUBE.clone();         // fronteira escura entre os países
        } else if (best) {
          // verde dos commits (estilo GitHub): mais commits → verde mais aceso
          const intensity = best.commits / maxC;
          const idx = Math.min(SUN_GREEN.length - 1, Math.round(intensity * (SUN_GREEN.length - 1)));
          color = SUN_GREEN[idx].clone();
        } else {
          color = DARK_CUBE.clone();
        }
        pts.push({ x: nx * radius, y: ny * radius, z: nz * radius, color });
      }
    }

    const geoD = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const matD = new THREE.MeshBasicMaterial();
    const meshD = new THREE.InstancedMesh(geoD, matD, pts.length);
    const dummyD = new THREE.Object3D();
    pts.forEach((p, i) => {
      dummyD.position.set(p.x, p.y, p.z);
      dummyD.lookAt(0, 0, 0);
      dummyD.updateMatrix();
      meshD.setMatrixAt(i, dummyD.matrix);
      meshD.setColorAt(i, p.color);
    });
    meshD.instanceMatrix.needsUpdate = true;
    if (meshD.instanceColor) meshD.instanceColor.needsUpdate = true;
    parent.add(meshD);
    dl.push(geoD, matD);
    return;
  }

  const N = 8;
  const poles = Array.from({ length: N }, (_, i) => {
    const yy = 1 - (i / (N - 1)) * 2;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
    const t = i * 2.39996 * Math.PI;
    return { nx: Math.cos(t) * rr, ny: yy, nz: Math.sin(t) * rr, ci: i % palette.length };
  });

  const pts: { x: number; y: number; z: number; ci: number }[] = [];
  for (let li = 0; li < lats; li++) {
    const phi = (li / (lats - 1)) * Math.PI;
    const lc = Math.max(1, Math.round(lons * Math.sin(phi)));
    for (let lo = 0; lo < lc; lo++) {
      const theta = (lo / lc) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      let minD = Infinity, closest = 0;
      for (const p of poles) {
        const d = (nx - p.nx) ** 2 + (ny - p.ny) ** 2 + (nz - p.nz) ** 2;
        if (d < minD) { minD = d; closest = p.ci; }
      }
      const noise = sr(li * 1.3 + lo * 2.71);
      pts.push({ x: nx * radius, y: ny * radius, z: nz * radius, ci: noise < 0.75 ? closest : (closest + 1) % palette.length });
    }
  }

  const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, pts.length);
  const dummy = new THREE.Object3D();
  pts.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.lookAt(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, palette[p.ci]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  dl.push(geo, mat);
}

// ── Planet globe (contributions-based coloring, identical to DualGlobe) ───────

function buildPlanetGlobe(
  parent: THREE.Group,
  contribs: Contribution[],
  radius: number,
  lats: number,
  lons: number,
  cubeSize: number,
  palette: THREE.Color[],
  dl: Disposable[],
) {
  const limited = contribs.slice(0, SAT_LIMIT);
  const maxC = Math.max(...limited.map(c => c.commits_count), 1);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const poles = limited.map((c, i) => {
    const yy = 1 - (i / Math.max(limited.length - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - yy * yy));
    const t = golden * i;
    return { nx: Math.cos(t) * r, ny: yy, nz: Math.sin(t) * r, c };
  });

  const pts: { x: number; y: number; z: number; color: THREE.Color }[] = [];
  for (let li = 0; li < lats; li++) {
    const phi = (li / (lats - 1)) * Math.PI;
    const lc = Math.max(1, Math.round(lons * Math.sin(phi)));
    for (let lo = 0; lo < lc; lo++) {
      const theta = (lo / lc) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);

      let minD = Infinity, closest: typeof poles[0] | null = null;
      for (const p of poles) {
        const d = Math.sqrt((nx - p.nx) ** 2 + (ny - p.ny) ** 2 + (nz - p.nz) ** 2);
        if (d < minD) { minD = d; closest = p; }
      }

      let color = DARK_CUBE.clone();
      if (closest) {
        const cR = 0.22 + (closest.c.commits_count / maxC) * 0.75;
        if (minD < cR) {
          const dr = minD / cR;
          color = dr < 0.25 ? palette[3].clone()
                : dr < 0.5  ? palette[2].clone()
                : dr < 0.75 ? palette[1].clone()
                : palette[0].clone();
        }
      }
      pts.push({ x: nx * radius, y: ny * radius, z: nz * radius, color });
    }
  }

  const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, pts.length);
  const dummy = new THREE.Object3D();
  pts.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.lookAt(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, p.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  dl.push(geo, mat);
}

// ── Contributor satellite state ───────────────────────────────────────────────

interface SatState {
  sprite: THREE.Sprite;
  pole: THREE.Vector3;
  hoverDist: number;
  floatAmp: number;
  floatSpeed: number;
  floatOffset: number;
  tube: THREE.Mesh;
  labelEl: HTMLDivElement;
  spriteHalfWorld: number;
}

// ── Satellite builder (identical approach to DualGlobe) ───────────────────────

function buildSats(
  parent: THREE.Group,
  contribs: Contribution[],
  planetR: number,
  satScale: number,
  tubeR: number,
  fontSize: string,
  labelPad: string,
  labelsEl: HTMLDivElement,
  loader: THREE.TextureLoader,
  dl: Disposable[],
): SatState[] {
  const limited = contribs.slice(0, SAT_LIMIT);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const poles = limited.map((_, i) => {
    const yy = 1 - (i / Math.max(limited.length - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - yy * yy));
    const t = golden * i;
    return { nx: Math.cos(t) * r, ny: yy, nz: Math.sin(t) * r };
  });

  return limited.map((c, i) => {
    const p = poles[i];
    const tex = loader.load(c.contributor.avatar_url);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color('#ffffff'),
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(satScale, satScale, satScale);
    parent.add(sprite);

    const tubeGeo = new THREE.CylinderGeometry(tubeR, tubeR, 1, 5);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    parent.add(tube);
    dl.push(tubeGeo, tubeMat);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;transform:translateX(-50%) translateY(-100%);pointer-events:none;';

    const link = document.createElement('a');
    const profileUrl = c.contributor.linkedin_url || `https://github.com/${c.contributor.username}`;
    link.href = profileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = c.contributor.username;
    const fgColor = '#e0e0e0';
    Object.assign(link.style, {
      background: '#0d0d0d', color: fgColor,
      border: `1px solid ${fgColor}44`,
      fontFamily: "ui-monospace,'Courier New',monospace",
      fontSize, fontWeight: '900', letterSpacing: '0.12em',
      textDecoration: 'none', whiteSpace: 'nowrap', textTransform: 'uppercase',
      padding: labelPad, borderRadius: '4px', display: 'block',
      pointerEvents: 'none', cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(0,0,0,0.95)',
    });
    link.addEventListener('mouseenter', () => { link.style.background = '#1a1a1a'; });
    link.addEventListener('mouseleave', () => { link.style.background = '#0d0d0d'; });
    wrap.appendChild(link);
    labelsEl.appendChild(wrap);

    return {
      sprite, tube, labelEl: wrap,
      pole: new THREE.Vector3(p.nx, p.ny, p.nz),
      hoverDist: planetR + 0.3 + sr(i * 29 + 6) * 0.15 * (satScale / 0.18),
      floatAmp:  (0.06 + sr(i * 13 + 3) * 0.06) * (satScale / 0.18),
      floatSpeed:  0.35 + sr(i * 17 + 4) * 0.45,
      floatOffset: sr(i * 23 + 5) * Math.PI * 2,
      spriteHalfWorld: satScale * 0.5,
    };
  });
}

// ── Orbit ring ─────────────────────────────────────────────────────────────────

function buildRing(parent: THREE.Group, radius: number, dl: Disposable[]) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: '#2c2c2c', transparent: true, opacity: 0.9 });
  parent.add(new THREE.Line(geo, mat));
  dl.push(geo, mat);
}

// ── Planet label (name only, same style as sun label) ─────────────────────────

function makePlanetLabel(
  name: string,
  dark: string,
  bright: string,
  container: HTMLDivElement,
): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;transform:translateX(-50%) translateY(-100%);pointer-events:none;visibility:hidden;';

  const inner = document.createElement('div');
  inner.textContent = name.toUpperCase();
  Object.assign(inner.style, {
    background: dark, color: bright, border: `1px solid ${bright}44`,
    fontFamily: "ui-monospace,'Courier New',monospace",
    fontSize: '9px', fontWeight: '900', letterSpacing: '0.15em',
    padding: '3px 10px', borderRadius: '4px', whiteSpace: 'nowrap',
    maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis',
    boxShadow: '0 2px 10px rgba(0,0,0,0.95)',
  });

  wrap.appendChild(inner);
  container.appendChild(wrap);
  return wrap;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrbitalSystem({ planets, accountName = 'GRAVITON', sunRegions = [] }: OrbitalSystemProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth, H = container.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    const sph = { theta: Math.PI / 6, phi: 1.05, radius: 75 };
    let desiredRadius = 75;

    const dl: Disposable[] = [];
    const allSprites: THREE.Sprite[] = [];

    const labelsEl = document.createElement('div');
    labelsEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    container.appendChild(labelsEl);

    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    const loader = new THREE.TextureLoader();

    // ── Sun ───────────────────────────────────────────────────────────────────
    const sunGroup = new THREE.Group();
    masterGroup.add(sunGroup);
    buildSunGlobe(sunGroup, SUN_R, SUN_LATS, SUN_LONS, SUN_CUBE, SUN_PAL, dl, sunRegions);

    const sunLabelWrap = document.createElement('div');
    sunLabelWrap.style.cssText = 'position:absolute;transform:translateX(-50%) translateY(-100%);pointer-events:none;visibility:hidden;';
    const sunLabelInner = document.createElement('div');
    sunLabelInner.textContent = accountName.toUpperCase();
    Object.assign(sunLabelInner.style, {
      background: '#181818', color: '#666666', border: '1px solid #333',
      fontFamily: "ui-monospace,'Courier New',monospace",
      fontSize: '13px', fontWeight: '900', letterSpacing: '0.18em',
      padding: '4px 14px', borderRadius: '4px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.95)',
    });
    sunLabelWrap.appendChild(sunLabelInner);
    labelsEl.appendChild(sunLabelWrap);

    // ── Scales ────────────────────────────────────────────────────────────────
    const allCommits = [
      ...planets.map(p => p.totalCommits),
      ...planets.flatMap(p => p.moon ? [p.moon.totalCommits] : []),
    ];
    const maxC = Math.max(...allCommits, 1);
    const norm = (v: number) => Math.max(0, Math.min(1, v / maxC));

    const sorted = [...planets].sort((a, b) => a.totalCommits - b.totalCommits);

    // ── Per-planet state ──────────────────────────────────────────────────────
    interface SatGroup { sats: SatState[]; planetR: number; }
    interface BodyState {
      orbitPivot: THREE.Group;
      bodyGroup: THREE.Group;
      orbitSpeed: number;
      labelEl: HTMLDivElement;
      wp: THREE.Vector3;
      satGroup: SatGroup;
      planetR: number;
    }
    interface PlanetState extends BodyState { moon?: BodyState }

    const planetStates: PlanetState[] = sorted.map((p, i) => {
      const pal = PLANET_PALS[i % PLANET_PALS.length];
      const palDef = PALETTE_DEFS[i % PALETTE_DEFS.length];
      const n = norm(p.totalCommits);
      const pR = MIN_P_R + n * (MAX_P_R - MIN_P_R);
      const orbitR = MIN_ORBIT + i * ORBIT_STEP;
      const lats = Math.round(22 + n * 22);
      const lons = Math.round(36 + n * 36);
      const cubeS = 0.05 + n * 0.065;
      const orbitSpeed = 0.0025 * Math.pow(MIN_ORBIT / orbitR, 1.5);

      buildRing(masterGroup, orbitR, dl);

      const orbitPivot = new THREE.Group();
      orbitPivot.rotation.y = (i / Math.max(sorted.length, 1)) * Math.PI * 2;
      masterGroup.add(orbitPivot);

      const planetGroup = new THREE.Group();
      planetGroup.position.set(orbitR, 0, 0);
      orbitPivot.add(planetGroup);

      buildPlanetGlobe(planetGroup, p.contributions, pR, lats, lons, cubeS, pal, dl);

      const sats = buildSats(planetGroup, p.contributions, pR, 0.18, 0.015, '9px', '2px 6px', labelsEl, loader, dl);
      sats.forEach(s => allSprites.push(s.sprite));

      const labelEl = makePlanetLabel(p.name, palDef[0], palDef[3], labelsEl);

      let moon: BodyState | undefined;
      if (p.moon) {
        const mn = p.moon;
        const mnI = (i + 4) % PALETTE_DEFS.length;
        const mnPal = PLANET_PALS[mnI];
        const mnDef = PALETTE_DEFS[mnI];
        const mn_n = norm(mn.totalCommits);
        const mnR = MIN_M_R + mn_n * (MAX_M_R - MIN_M_R);
        const mnOrbitR = pR + MOON_ORBIT_PAD + mnR + 0.5;
        const mnLats = Math.round(14 + mn_n * 14);
        const mnLons = Math.round(22 + mn_n * 22);
        const mnCubeS = 0.04 + mn_n * 0.04;

        const moonOrbitPivot = new THREE.Group();
        planetGroup.add(moonOrbitPivot);

        const moonGroup = new THREE.Group();
        moonGroup.position.set(mnOrbitR, 0, 0);
        moonOrbitPivot.add(moonGroup);

        buildPlanetGlobe(moonGroup, mn.contributions, mnR, mnLats, mnLons, mnCubeS, mnPal, dl);

        const mnSats = buildSats(moonGroup, mn.contributions, mnR, 0.12, 0.01, '8px', '2px 5px', labelsEl, loader, dl);
        mnSats.forEach(s => allSprites.push(s.sprite));

        const moonLabel = makePlanetLabel(mn.name, mnDef[0], mnDef[3], labelsEl);

        moon = {
          orbitPivot: moonOrbitPivot,
          bodyGroup: moonGroup,
          orbitSpeed: 0.013 + mn_n * 0.007,
          labelEl: moonLabel,
          wp: new THREE.Vector3(),
          satGroup: { sats: mnSats, planetR: mnR },
          planetR: mnR,
        };
      }

      return {
        orbitPivot,
        bodyGroup: planetGroup,
        orbitSpeed,
        labelEl,
        wp: new THREE.Vector3(),
        satGroup: { sats, planetR: pR },
        planetR: pR,
        moon,
      };
    });

    // ── Focus state ───────────────────────────────────────────────────────────
    let focusedIndex = -1; // -1 = overview
    const currentTarget = new THREE.Vector3();
    const desiredFocusTarget = new THREE.Vector3();

    const getSatLink = (s: SatState) => s.labelEl.querySelector('a') as HTMLAnchorElement | null;

    const updateSatLinks = (idx: number) => {
      planetStates.forEach((ps, i) => {
        const active = i === idx;
        ps.satGroup.sats.forEach(s => {
          const a = getSatLink(s);
          if (a) a.style.pointerEvents = active ? 'auto' : 'none';
        });
        if (ps.moon) {
          // Moon sats also activate when the parent planet is focused
          ps.moon.satGroup.sats.forEach(s => {
            const a = getSatLink(s);
            if (a) a.style.pointerEvents = active ? 'auto' : 'none';
          });
        }
      });
    };

    // ── Controls ──────────────────────────────────────────────────────────────
    let dragging = false, dragDist = 0;
    let pm = { x: 0, y: 0 };
    let rv = { theta: 0, phi: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse2d = new THREE.Vector2();

    const onDown = (e: MouseEvent) => {
      dragging = true; dragDist = 0;
      pm = { x: e.clientX, y: e.clientY };
      rv = { theta: 0, phi: 0 };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - pm.x, dy = e.clientY - pm.y;
      dragDist += Math.sqrt(dx * dx + dy * dy);
      rv.theta = -dx * 0.005;
      rv.phi   =  dy * 0.005;
      sph.theta += rv.theta;
      sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi + rv.phi));
      pm = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: MouseEvent) => {
      if (dragging && dragDist < 5) {
        // It's a click — raycast to find the nearest planet
        const rect = container.getBoundingClientRect();
        mouse2d.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
        mouse2d.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;
        raycaster.setFromCamera(mouse2d, camera);

        let bestDist = Infinity, bestIdx = -1;
        planetStates.forEach((ps, i) => {
          const d = raycaster.ray.distanceToPoint(ps.wp);
          if (d < ps.planetR + 0.8 && d < bestDist) {
            bestDist = d; bestIdx = i;
          }
        });

        if (bestIdx !== -1) {
          focusedIndex = bestIdx;
          desiredRadius = planetStates[bestIdx].planetR * 3 + 6;
        } else {
          // Click on empty space or sun → return to overview
          focusedIndex = -1;
          desiredRadius = 75;
        }
        updateSatLinks(focusedIndex);
      }
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      desiredRadius = Math.max(10, Math.min(300, desiredRadius + e.deltaY * 0.12));
    };

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp as EventListener);
    container.addEventListener('wheel', onWheel, { passive: false });

    // ── Sat helpers ───────────────────────────────────────────────────────────
    const tmp = new THREE.Vector3();
    let t = 0;

    const floatSats = (sg: SatGroup) => {
      sg.sats.forEach(s => {
        const radial = s.hoverDist + Math.sin(t * s.floatSpeed + s.floatOffset) * s.floatAmp;
        const sx = s.pole.x * radial, sy = s.pole.y * radial, sz = s.pole.z * radial;
        s.sprite.position.set(sx, sy, sz);
        const ax = s.pole.x * sg.planetR, ay = s.pole.y * sg.planetR, az = s.pole.z * sg.planetR;
        const dx = sx - ax, dy = sy - ay, dz = sz - az;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        s.tube.position.set((ax + sx) / 2, (ay + sy) / 2, (az + sz) / 2);
        s.tube.scale.y = dist;
        s.tube.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(dx / dist, dy / dist, dz / dist),
        );
      });
    };

    const projectSatLabels = (sg: SatGroup, cW: number, cH: number) => {
      const tanHF = Math.tan((camera.fov * Math.PI) / 360);
      sg.sats.forEach(s => {
        s.sprite.getWorldPosition(tmp);
        const distCam = tmp.distanceTo(camera.position);
        const halfPx = (s.spriteHalfWorld * cH) / (distCam * tanHF);
        tmp.project(camera);
        if (tmp.z >= 1) { s.labelEl.style.visibility = 'hidden'; return; }
        const px = (tmp.x * 0.5 + 0.5) * cW;
        const py = (-tmp.y * 0.5 + 0.5) * cH;
        s.labelEl.style.visibility = 'visible';
        s.labelEl.style.opacity = '1';
        s.labelEl.style.left = `${px}px`;
        s.labelEl.style.top  = `${py - halfPx - 4}px`;
      });
    };

    // yOff = world-space Y offset above the planet center (planet radius + gap)
    // No opacity fade — the scene is large (far=1000) and z_ndc is always ~0.99 for all objects
    const projectLabel = (el: HTMLDivElement, wp: THREE.Vector3, yOff: number, cW: number, cH: number) => {
      tmp.set(wp.x, wp.y + yOff, wp.z).project(camera);
      // Hide if behind camera (z > 1 in NDC after project)
      if (tmp.z > 1) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.left = `${(tmp.x * 0.5 + 0.5) * cW}px`;
      el.style.top  = `${(-tmp.y * 0.5 + 0.5) * cH - 6}px`;
    };

    // ── Animation ─────────────────────────────────────────────────────────────
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      sunGroup.rotation.y += 0.0006;

      for (const ps of planetStates) {
        ps.orbitPivot.rotation.y += ps.orbitSpeed;
        ps.bodyGroup.rotation.y += 0.003;
        ps.bodyGroup.getWorldPosition(ps.wp);
        floatSats(ps.satGroup);
        if (ps.moon) {
          ps.moon.orbitPivot.rotation.y += ps.moon.orbitSpeed;
          ps.moon.bodyGroup.rotation.y += 0.008;
          ps.moon.bodyGroup.getWorldPosition(ps.moon.wp);
          floatSats(ps.moon.satGroup);
        }
      }

      if (!dragging) {
        sph.theta += rv.theta;
        sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi + rv.phi));
        rv.theta *= 0.88;
        rv.phi   *= 0.88;
      }
      sph.radius += (desiredRadius - sph.radius) * 0.06;

      // Camera target: smoothly follow the focused planet (or return to origin)
      if (focusedIndex >= 0 && focusedIndex < planetStates.length) {
        desiredFocusTarget.copy(planetStates[focusedIndex].wp);
      } else {
        desiredFocusTarget.set(0, 0, 0);
      }
      currentTarget.lerp(desiredFocusTarget, 0.06);

      const sinPhi = Math.sin(sph.phi);
      camera.position.set(
        currentTarget.x + sph.radius * sinPhi * Math.sin(sph.theta),
        currentTarget.y + sph.radius * Math.cos(sph.phi),
        currentTarget.z + sph.radius * sinPhi * Math.cos(sph.theta),
      );
      camera.lookAt(currentTarget);
      renderer.render(scene, camera);

      const cW = container.clientWidth, cH = container.clientHeight;

      // Sun label
      tmp.set(0, SUN_R + 1.5, 0).project(camera);
      if (tmp.z < 1) {
        sunLabelWrap.style.visibility = 'visible';
        sunLabelWrap.style.left = `${(tmp.x * 0.5 + 0.5) * cW}px`;
        sunLabelWrap.style.top  = `${(-tmp.y * 0.5 + 0.5) * cH - 10}px`;
      } else {
        sunLabelWrap.style.visibility = 'hidden';
      }

      const hideSatLabels = (sg: SatGroup) => {
        sg.sats.forEach(s => { s.labelEl.style.visibility = 'hidden'; });
      };

      planetStates.forEach((ps, i) => {
        const focused = i === focusedIndex;
        if (focused) {
          // Focused: hide repo name, show contributor labels
          ps.labelEl.style.visibility = 'hidden';
          projectSatLabels(ps.satGroup, cW, cH);
          if (ps.moon) {
            ps.moon.labelEl.style.visibility = 'hidden';
            projectSatLabels(ps.moon.satGroup, cW, cH);
          }
        } else {
          // Not focused: show repo name, hide all contributor labels
          projectLabel(ps.labelEl, ps.wp, ps.planetR + 0.5, cW, cH);
          hideSatLabels(ps.satGroup);
          if (ps.moon) {
            projectLabel(ps.moon.labelEl, ps.moon.wp, ps.moon.planetR + 0.4, cW, cH);
            hideSatLabels(ps.moon.satGroup);
          }
        }
      });
    };

    animate();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp as EventListener);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      dl.forEach(d => d.dispose());
      allSprites.forEach(s => { s.material.map?.dispose(); s.material.dispose(); });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelsEl)) container.removeChild(labelsEl);
    };
  }, [planets, accountName, sunRegions]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
}
