import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Contribution } from '../types/database';

// ── Constants ─────────────────────────────────────────────────────────────────
const P_RADIUS  = 3.2;
const M_RADIUS  = 1.5;
const ORBIT_R   = 8.5;
const ORBIT_SPD = 0.004;
const P_CUBE    = 0.115;
const M_CUBE    = 0.055;
const P_LATS    = 44; const P_LONS = 72;
const M_LATS    = 22; const M_LONS = 36;
const SAT_LIMIT = 12;

const GREENS = [
  new THREE.Color('#0e4429'), new THREE.Color('#006d32'),
  new THREE.Color('#26a641'), new THREE.Color('#39d353'),
];
const PURPLES = [
  new THREE.Color('#1a0533'), new THREE.Color('#4a1070'),
  new THREE.Color('#7c3aed'), new THREE.Color('#a78bfa'),
];
const DARK = new THREE.Color('#161b22');

const sr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface CubeDisposable {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  mesh: THREE.InstancedMesh;
}

export interface DualGlobeProps {
  primaryContributions: Contribution[];
  secondaryContributions: Contribution[];
}

// ── Globe cube-sphere builder ─────────────────────────────────────────────────
function buildCubes(
  parent: THREE.Group,
  contribs: Contribution[],
  radius: number,
  lats: number,
  lons: number,
  cubeSize: number,
  palette: THREE.Color[],
  out: CubeDisposable[],
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

  const data: { x: number; y: number; z: number; color: THREE.Color }[] = [];
  for (let li = 0; li < lats; li++) {
    const phi = (li / (lats - 1)) * Math.PI;
    const lonCount = Math.max(1, Math.round(lons * Math.sin(phi)));
    for (let lo = 0; lo < lonCount; lo++) {
      const theta = (lo / lonCount) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);

      let minD = Infinity; let closest: (typeof poles)[0] | null = null;
      for (const p of poles) {
        const d = Math.sqrt((nx - p.nx) ** 2 + (ny - p.ny) ** 2 + (nz - p.nz) ** 2);
        if (d < minD) { minD = d; closest = p; }
      }

      let color = DARK.clone();
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
      data.push({ x: nx * radius, y: ny * radius, z: nz * radius, color });
    }
  }

  const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, data.length);
  const dummy = new THREE.Object3D();
  data.forEach((d, i) => {
    dummy.position.set(d.x, d.y, d.z);
    dummy.lookAt(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, d.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  out.push({ geo, mat, mesh });
}

// ── Contributor satellite builder ─────────────────────────────────────────────
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
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    parent.add(tube);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;transform:translateX(-50%) translateY(-100%);pointer-events:none;';

    const link = document.createElement('a');
    const profileUrl = c.contributor.linkedin_url || `https://github.com/${c.contributor.username}`;
    link.href = profileUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = c.contributor.username;
    const fgColor = '#e0e0e0';
    Object.assign(link.style, {
      background: '#0d0d0d', color: fgColor,
      border: `1px solid ${fgColor}44`,
      fontFamily: "ui-monospace,'Courier New',monospace",
      fontSize, fontWeight: '900', letterSpacing: '0.12em',
      textTransform: 'uppercase',
      textDecoration: 'none', whiteSpace: 'nowrap',
      padding: labelPad, borderRadius: '4px', display: 'block',
      pointerEvents: 'auto', cursor: 'pointer',
    });
    link.addEventListener('mouseenter', () => { link.style.background = '#1a1a1a'; });
    link.addEventListener('mouseleave', () => { link.style.background = '#0d0d0d'; });
    wrap.appendChild(link);
    labelsEl.appendChild(wrap);

    return {
      sprite, tube, labelEl: wrap,
      pole: new THREE.Vector3(p.nx, p.ny, p.nz),
      hoverDist: planetR + 0.35 + sr(i * 29 + 6) * 0.2 * (satScale / 0.22),
      floatAmp:  (0.07 + sr(i * 13 + 3) * 0.07) * (satScale / 0.22),
      floatSpeed:  0.35 + sr(i * 17 + 4) * 0.45,
      floatOffset: sr(i * 23 + 5) * Math.PI * 2,
      spriteHalfWorld: satScale * 0.5,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DualGlobe({ primaryContributions, secondaryContributions }: DualGlobeProps) {
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
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);

    // Spherical offset from the tracked target
    const sph = { theta: 0, phi: Math.PI / 8, radius: 16 };
    // Smoothly lerped camera target (world position)
    const currentTarget = new THREE.Vector3(0, 0, 0);
    let desiredRadius = 16;
    let focusTarget: 'primary' | 'secondary' = 'primary';

    const cubeDisposables: CubeDisposable[] = [];
    const loader = new THREE.TextureLoader();

    const labelsContainer = document.createElement('div');
    labelsContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    container.appendChild(labelsContainer);

    // Master group — drag rotates this whole system
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // ── Primary globe ─────────────────────────────────────────────────────────
    const primaryGroup = new THREE.Group();
    masterGroup.add(primaryGroup);
    buildCubes(primaryGroup, primaryContributions, P_RADIUS, P_LATS, P_LONS, P_CUBE, GREENS, cubeDisposables);
    const primarySats = buildSats(primaryGroup, primaryContributions, P_RADIUS, 0.22, 0.02, '8px', '2px 6px', labelsContainer, loader);

    // ── Orbit ring ────────────────────────────────────────────────────────────
    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineBasicMaterial({ color: '#252525', transparent: true, opacity: 0.8 });
    masterGroup.add(new THREE.Line(ringGeo, ringMat));

    // ── Gravity bond line (origin → secondary center) ─────────────────────────
    const bondPos = new Float32Array(6);
    const bondGeo = new THREE.BufferGeometry();
    bondGeo.setAttribute('position', new THREE.BufferAttribute(bondPos, 3));
    const bondMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
    masterGroup.add(new THREE.Line(bondGeo, bondMat));

    // ── Orbit pivot + secondary globe ─────────────────────────────────────────
    const orbitPivot = new THREE.Group();
    masterGroup.add(orbitPivot);

    const secondaryGroup = new THREE.Group();
    secondaryGroup.position.set(ORBIT_R, 0, 0);
    orbitPivot.add(secondaryGroup);

    buildCubes(secondaryGroup, secondaryContributions, M_RADIUS, M_LATS, M_LONS, M_CUBE, PURPLES, cubeDisposables);
    const secondarySats = buildSats(secondaryGroup, secondaryContributions, M_RADIUS, 0.13, 0.012, '7px', '2px 5px', labelsContainer, loader);

    // ── Click-to-focus + drag-to-orbit ───────────────────────────────────────
    let dragging = false, dragDist = 0;
    let pm = { x: 0, y: 0 }, rv = { theta: 0, phi: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse2d  = new THREE.Vector2();

    const onDown = (e: MouseEvent) => {
      dragging = true; dragDist = 0;
      pm = { x: e.clientX, y: e.clientY };
      rv = { theta: 0, phi: 0 };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - pm.x;
      const dy = e.clientY - pm.y;
      dragDist += Math.sqrt(dx * dx + dy * dy);
      rv.theta = -dx * 0.005;
      rv.phi   =  dy * 0.005;
      sph.theta += rv.theta;
      sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi + rv.phi));
      pm = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: MouseEvent) => {
      if (dragging && dragDist < 5) {
        // It's a click — detect which globe
        const rect = container.getBoundingClientRect();
        mouse2d.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
        mouse2d.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;
        raycaster.setFromCamera(mouse2d, camera);

        // Use ray-to-point distance against each globe center
        const secPos = new THREE.Vector3();
        secondaryGroup.getWorldPosition(secPos);
        const dSec = raycaster.ray.distanceToPoint(secPos);
        const dPri = raycaster.ray.distanceToPoint(new THREE.Vector3(0, 0, 0));

        if (dSec < M_RADIUS + 0.4 && dSec <= dPri) {
          focusTarget  = 'secondary';
          desiredRadius = 5;
        } else if (dPri < P_RADIUS + 0.6) {
          focusTarget  = 'primary';
          desiredRadius = 16;
        }
      }
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      desiredRadius = Math.max(3, Math.min(40, desiredRadius + e.deltaY * 0.05));
    };
    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // ── Animation ─────────────────────────────────────────────────────────────
    let t = 0, rafId: number;
    const tmp      = new THREE.Vector3();
    const secWorld = new THREE.Vector3();
    const secLocal = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();

    const floatSats = (sats: SatState[], pR: number) => {
      sats.forEach(s => {
        const radial = s.hoverDist + Math.sin(t * s.floatSpeed + s.floatOffset) * s.floatAmp;
        const sx = s.pole.x * radial, sy = s.pole.y * radial, sz = s.pole.z * radial;
        s.sprite.position.set(sx, sy, sz);
        const ax = s.pole.x * pR, ay = s.pole.y * pR, az = s.pole.z * pR;
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

    const projectLabels = (sats: SatState[], cW: number, cH: number, tanHF: number) => {
      sats.forEach(s => {
        s.sprite.getWorldPosition(tmp);
        const distCam = tmp.distanceTo(camera.position);
        const halfPx = (s.spriteHalfWorld * cH) / (distCam * tanHF);
        tmp.project(camera);
        if (tmp.z >= 1) { s.labelEl.style.visibility = 'hidden'; return; }
        const sx = (tmp.x * 0.5 + 0.5) * cW;
        const sy = (-tmp.y * 0.5 + 0.5) * cH;
        s.labelEl.style.visibility = 'visible';
        s.labelEl.style.opacity = '1';
        s.labelEl.style.left = `${sx}px`;
        s.labelEl.style.top  = `${sy - halfPx - 4}px`;
      });
    };

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      primaryGroup.rotation.y   += 0.0015;
      orbitPivot.rotation.y     += ORBIT_SPD;
      secondaryGroup.rotation.y += 0.008;

      // ── Camera: orbit inertia ─────────────────────────────────────────────
      if (!dragging) {
        sph.theta += rv.theta;
        sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi + rv.phi));
        rv.theta *= 0.90;
        rv.phi   *= 0.90;
      }

      // ── Camera: resolve desired target ────────────────────────────────────
      if (focusTarget === 'secondary') {
        secondaryGroup.getWorldPosition(desiredTarget);
      } else {
        desiredTarget.set(0, 0, 0);
      }
      // Smooth lerp toward desired target
      currentTarget.lerp(desiredTarget, 0.06);
      // Smooth lerp toward desired radius
      sph.radius += (desiredRadius - sph.radius) * 0.06;

      // Position camera in spherical offset from currentTarget
      const sinPhi = Math.sin(sph.phi);
      camera.position.set(
        currentTarget.x + sph.radius * sinPhi * Math.sin(sph.theta),
        currentTarget.y + sph.radius * Math.cos(sph.phi),
        currentTarget.z + sph.radius * sinPhi * Math.cos(sph.theta),
      );
      camera.lookAt(currentTarget);

      floatSats(primarySats, P_RADIUS);
      floatSats(secondarySats, M_RADIUS);

      // Update bond line
      secondaryGroup.getWorldPosition(secWorld);
      secLocal.copy(secWorld);
      masterGroup.worldToLocal(secLocal);
      bondPos[0] = 0; bondPos[1] = 0; bondPos[2] = 0;
      bondPos[3] = secLocal.x; bondPos[4] = secLocal.y; bondPos[5] = secLocal.z;
      bondGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);

      const cW = container.clientWidth, cH = container.clientHeight;
      const tanHF = Math.tan((camera.fov * Math.PI) / 360);
      projectLabels(primarySats, cW, cH, tanHF);
      projectLabels(secondarySats, cW, cH, tanHF);
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
      window.removeEventListener('mouseup', onUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      cubeDisposables.forEach(d => { d.geo.dispose(); d.mat.dispose(); d.mesh.dispose(); });
      [...primarySats, ...secondarySats].forEach(s => {
        s.sprite.material.map?.dispose();
        s.sprite.material.dispose();
        s.tube.geometry.dispose();
        (s.tube.material as THREE.MeshBasicMaterial).dispose();
      });
      ringGeo.dispose(); ringMat.dispose(); bondGeo.dispose(); bondMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelsContainer)) container.removeChild(labelsContainer);
    };
  }, [primaryContributions, secondaryContributions]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
}
