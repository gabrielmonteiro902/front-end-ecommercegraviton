import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Contribution } from '../types/database';

const PLANET_RADIUS = 3.2;
const CUBE_SIZE = 0.115;
const NUM_LATS = 44;
const NUM_LONS_MAX = 72;

const GREENS = [
  new THREE.Color('#0e4429'),
  new THREE.Color('#006d32'),
  new THREE.Color('#26a641'),
  new THREE.Color('#39d353'),
];
const DARK = new THREE.Color('#161b22');

const sr = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface SatState {
  sprite: THREE.Sprite;
  pole: THREE.Vector3;
  hoverDist: number;
  floatAmp: number;
  floatSpeed: number;
  floatOffset: number;
  tube: THREE.Mesh;
}

export default function GravityGlobe({ contributions }: { contributions: Contribution[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
    camera.position.z = 9.6;

    // Fibonacci sphere distribution for contributor poles
    const limited = contributions.slice(0, 15);
    const maxCommits = Math.max(...limited.map(c => c.commits_count), 1);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const poles = limited.map((c, i) => {
      const yy = 1 - (i / Math.max(limited.length - 1, 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - yy * yy));
      const t = golden * i;
      return { nx: Math.cos(t) * r, ny: yy, nz: Math.sin(t) * r, c };
    });

    // Globe cubes
    const cubeData: { x: number; y: number; z: number; color: THREE.Color }[] = [];

    for (let li = 0; li < NUM_LATS; li++) {
      const phi = (li / (NUM_LATS - 1)) * Math.PI;
      const lonCount = Math.max(1, Math.round(NUM_LONS_MAX * Math.sin(phi)));
      for (let lo = 0; lo < lonCount; lo++) {
        const theta = (lo / lonCount) * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);

        let minD = Infinity;
        let closest: typeof poles[0] | null = null;
        for (const p of poles) {
          const d = Math.sqrt((nx - p.nx) ** 2 + (ny - p.ny) ** 2 + (nz - p.nz) ** 2);
          if (d < minD) { minD = d; closest = p; }
        }

        let color = DARK.clone();
        if (closest) {
          const ratio = closest.c.commits_count / maxCommits;
          const continentR = 0.22 + ratio * 0.75;
          if (minD < continentR) {
            const dr = minD / continentR;
            color = dr < 0.25 ? GREENS[3].clone()
              : dr < 0.5 ? GREENS[2].clone()
                : dr < 0.75 ? GREENS[1].clone()
                  : GREENS[0].clone();
          }
        }

        cubeData.push({ x: nx * PLANET_RADIUS, y: ny * PLANET_RADIUS, z: nz * PLANET_RADIUS, color });
      }
    }

    // Single globeGroup that holds EVERYTHING — cubes + satellites
    const globeGroup = new THREE.Group();

    const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const cubeMat = new THREE.MeshBasicMaterial();
    const instanceMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, cubeData.length);
    const dummy = new THREE.Object3D();

    cubeData.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(i, dummy.matrix);
      instanceMesh.setColorAt(i, d.color);
    });
    instanceMesh.instanceMatrix.needsUpdate = true;
    if (instanceMesh.instanceColor) instanceMesh.instanceColor.needsUpdate = true;

    globeGroup.add(instanceMesh);

    // Satellites as children of globeGroup so they rotate WITH the globe
    const loader = new THREE.TextureLoader();
    const sats: SatState[] = [];

    limited.forEach((c, i) => {
      const pole = poles[i];

      const tex = loader.load(c.contributor.avatar_url);
      tex.colorSpace = THREE.SRGBColorSpace;
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color('#ffffff'),
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.22, 0.22, 0.22);

      // Added to globeGroup — position is in globe's local space
      globeGroup.add(sprite);

      // Cylinder tube from pole surface to satellite (visible thickness, updated every frame)
      const tubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      globeGroup.add(tube);

      sats.push({
        sprite,
        pole: new THREE.Vector3(pole.nx, pole.ny, pole.nz),
        hoverDist: PLANET_RADIUS + 0.4 + sr(i * 29 + 6) * 0.2,
        floatAmp: 0.07 + sr(i * 13 + 3) * 0.07,
        floatSpeed: 0.35 + sr(i * 17 + 4) * 0.45,
        floatOffset: sr(i * 23 + 5) * Math.PI * 2,
        tube,
      });
    });

    scene.add(globeGroup);

    // ── HTML label overlay ────────────────────────────────────────────────────
    // Labels sit in a sibling div over the canvas; positions updated every frame
    // via DOM mutation (avoids React re-renders at 60 fps).
    const labelsContainer = document.createElement('div');
    labelsContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    container.appendChild(labelsContainer);

    const labelEls: HTMLDivElement[] = [];
    limited.forEach((c) => {
      const wrap = document.createElement('div');
      // translateY(-100%) anchors the bottom of the label to the `top` value,
      // so setting top = sprite_center - margin places text cleanly above the sprite.
      wrap.style.cssText = 'position:absolute;transform:translateX(-50%) translateY(-100%);pointer-events:none;';

      const link = document.createElement('a');
      const profileUrl = c.contributor.linkedin_url || `https://github.com/${c.contributor.username}`;
      link.href = profileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = c.contributor.username;
      const fgColor = '#e0e0e0';
      Object.assign(link.style, {
        background: '#0d0d0d',
        color: fgColor,
        border: `1px solid ${fgColor}44`,
        fontFamily: "ui-monospace,'Courier New',monospace",
        fontSize: '8px',
        fontWeight: '900',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        padding: '2px 6px',
        borderRadius: '4px',
        display: 'block',
        pointerEvents: 'auto',
        cursor: 'pointer',
      });
      link.addEventListener('mouseenter', () => { link.style.background = '#1a1a1a'; });
      link.addEventListener('mouseleave', () => { link.style.background = '#0d0d0d'; });

      wrap.appendChild(link);
      labelsContainer.appendChild(wrap);
      labelEls.push(wrap);
    });

    const tempVec = new THREE.Vector3();

    // Mouse drag
    let dragging = false;
    let pm = { x: 0, y: 0 };
    let rv = { x: 0, y: 0 };

    const onDown = (e: MouseEvent) => {
      dragging = true;
      pm = { x: e.clientX, y: e.clientY };
      rv = { x: 0, y: 0 };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      rv = { x: (e.clientY - pm.y) * 0.005, y: (e.clientX - pm.x) * 0.005 };
      pm = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(5.5, Math.min(20, camera.position.z + e.deltaY * 0.01));
    };

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    let t = 0;
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      if (!dragging) {
        globeGroup.rotation.y += 0.0015;
      } else {
        globeGroup.rotation.x += rv.x;
        globeGroup.rotation.y += rv.y;
        rv.x *= 0.85;
        rv.y *= 0.85;
      }

      // Float radially above their country — position in globeGroup local space
      sats.forEach(s => {
        const radial = s.hoverDist + Math.sin(t * s.floatSpeed + s.floatOffset) * s.floatAmp;
        const sx = s.pole.x * radial;
        const sy = s.pole.y * radial;
        const sz = s.pole.z * radial;
        s.sprite.position.set(sx, sy, sz);

        // Update cylinder tube: globe surface → satellite
        const ax = s.pole.x * PLANET_RADIUS;
        const ay = s.pole.y * PLANET_RADIUS;
        const az = s.pole.z * PLANET_RADIUS;
        const dx = sx - ax, dy = sy - ay, dz = sz - az;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        s.tube.position.set((ax + sx) / 2, (ay + sy) / 2, (az + sz) / 2);
        s.tube.scale.y = dist;
        s.tube.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(dx / dist, dy / dist, dz / dist),
        );
      });

      renderer.render(scene, camera);

      // Update HTML labels: project world pos → screen coords
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      // tan(FOV/2) for perspective sprite size calculation
      const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360);

      labelEls.forEach((el, i) => {
        sats[i].sprite.getWorldPosition(tempVec);

        // Compute sprite half-height in pixels BEFORE projecting (projection mutates tempVec)
        const distToCamera = tempVec.distanceTo(camera.position);
        // sprite scale is 0.22, half = 0.11 world units
        const spriteHalfPx = (0.11 * cH) / (distToCamera * tanHalfFov);

        tempVec.project(camera);

        if (tempVec.z >= 1) { el.style.visibility = 'hidden'; return; }

        const screenX = (tempVec.x * 0.5 + 0.5) * cW;
        const screenY = (-tempVec.y * 0.5 + 0.5) * cH;

        const topPx = screenY - spriteHalfPx - 6;

        el.style.visibility = 'visible';
        el.style.opacity    = '1';
        el.style.left       = `${screenX}px`;
        el.style.top        = `${topPx}px`;
      });
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
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
      cubeGeo.dispose();
      cubeMat.dispose();
      instanceMesh.dispose();
      sats.forEach(s => {
        s.sprite.material.map?.dispose();
        s.sprite.material.dispose();
        s.tube.geometry.dispose();
        (s.tube.material as THREE.MeshBasicMaterial).dispose();
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelsContainer)) container.removeChild(labelsContainer);
    };
  }, [contributions]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
}
