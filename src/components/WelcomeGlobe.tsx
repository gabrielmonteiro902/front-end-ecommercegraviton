import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SatConfig {
  radius: number;
  orbitRadius: number;
  speed: number;
  selfSpin: number;
  numLats: number;
  numLonsMax: number;
  color: string;
  phase: number;
}

const SAT_CONFIGS: SatConfig[] = [
  { radius: 0.55, orbitRadius: 4.8, speed: 0.009,  selfSpin: 0.012, numLats: 10, numLonsMax: 20, color: '#363636', phase: 0.3  },
  { radius: 0.85, orbitRadius: 6.3, speed: 0.006,  selfSpin: 0.008, numLats: 14, numLonsMax: 28, color: '#2d2d2d', phase: 2.1  },
  { radius: 0.42, orbitRadius: 7.8, speed: 0.014,  selfSpin: 0.016, numLats: 8,  numLonsMax: 16, color: '#3e3e3e', phase: 4.5  },
];

function makeCubeSphere(radius: number, numLats: number, numLonsMax: number, hexColor: string): THREE.InstancedMesh {
  const cubeSize = (2 * Math.PI * radius / numLonsMax) * 0.41;
  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];

  for (let li = 0; li < numLats; li++) {
    const phi = (li / (numLats - 1)) * Math.PI;
    const lonCount = Math.max(1, Math.round(numLonsMax * Math.sin(phi)));
    for (let lo = 0; lo < lonCount; lo++) {
      const theta = (lo / lonCount) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      dummy.position.set(nx * radius, ny * radius, nz * radius);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
  }

  const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mat = new THREE.MeshBasicMaterial({ color: hexColor });
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export default function WelcomeGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 100);
    camera.position.set(0, 3.5, 16);
    camera.lookAt(0, 0, 0);

    // Main globe
    const globeGroup = new THREE.Group();
    const mainMesh = makeCubeSphere(3.2, 44, 72, '#222222');
    globeGroup.add(mainMesh);
    scene.add(globeGroup);

    // Orbit rings (flat circles in XZ plane)
    const ringMat = new THREE.LineBasicMaterial({ color: '#1c1c1c' });
    const orbitRingGeos: THREE.BufferGeometry[] = [];
    for (const cfg of SAT_CONFIGS) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * cfg.orbitRadius, 0, Math.sin(a) * cfg.orbitRadius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      orbitRingGeos.push(geo);
      scene.add(new THREE.Line(geo, ringMat));
    }

    // Satellite mini-globes on orbital pivots
    const satSystems: {
      pivot: THREE.Group;
      miniGroup: THREE.Group;
      mesh: THREE.InstancedMesh;
      cfg: SatConfig;
    }[] = [];

    for (const cfg of SAT_CONFIGS) {
      const pivot = new THREE.Group();
      pivot.rotation.y = cfg.phase;

      const miniGroup = new THREE.Group();
      miniGroup.position.set(cfg.orbitRadius, 0, 0);

      const mesh = makeCubeSphere(cfg.radius, cfg.numLats, cfg.numLonsMax, cfg.color);
      miniGroup.add(mesh);
      pivot.add(miniGroup);
      scene.add(pivot);

      satSystems.push({ pivot, miniGroup, mesh, cfg });
    }

    // Animation loop
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.003;
      for (const s of satSystems) {
        s.pivot.rotation.y += s.cfg.speed;
        s.miniGroup.rotation.y += s.cfg.selfSpin;
      }
      renderer.render(scene, camera);
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
      window.removeEventListener('resize', onResize);
      mainMesh.geometry.dispose();
      (mainMesh.material as THREE.MeshBasicMaterial).dispose();
      mainMesh.dispose();
      orbitRingGeos.forEach(g => g.dispose());
      ringMat.dispose();
      for (const s of satSystems) {
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.MeshBasicMaterial).dispose();
        s.mesh.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
