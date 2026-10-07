import * as THREE from 'three';
import { interiorGridVertex, interiorGridFragment, interiorCrossFragment } from './interior-background-shaders';

/** Flat dark grid used by the reference's white chapters. */
export function createWhiteChapterGrid(scroll: { value: number }) {
  const uniforms = {
    uScale: { value: new THREE.Vector3(1, 1, 1) },
    uGrid: { value: new THREE.Vector2(64, 64) },
    uScroll: scroll,
    uCrossScale: { value: 1 },
  };
  const gridGeometry = new THREE.PlaneGeometry(1, 1, 64, 64);
  const crossPlane = new THREE.PlaneGeometry(1, 1, 8, 8);
  const crossGeometry = new THREE.InstancedBufferGeometry();
  crossGeometry.setAttribute('position', crossPlane.getAttribute('position'));
  crossGeometry.setAttribute('uv', crossPlane.getAttribute('uv'));
  crossGeometry.setIndex(crossPlane.getIndex());
  const instances: number[] = [];
  for (let y = 0; y <= 8; y++) for (let x = 0; x <= 8; x++) instances.push(x / 8, y / 8);
  crossGeometry.setAttribute('instanceId', new THREE.InstancedBufferAttribute(new Float32Array(instances), 2));
  crossGeometry.instanceCount = 81;
  const gridMaterial = new THREE.ShaderMaterial({
    uniforms, defines: { IS_GRID: '', IS_FLAT: '', IS_DARK: '' },
    vertexShader: interiorGridVertex, fragmentShader: interiorGridFragment,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const crossMaterial = new THREE.ShaderMaterial({
    uniforms, defines: { IS_CROSS: '', IS_FLAT: '', IS_DARK: '' },
    vertexShader: 'uniform float uCrossScale;\n' + interiorGridVertex.replace('position*0.15', 'position*0.15*uCrossScale'),
    fragmentShader: interiorCrossFragment,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const group = new THREE.Group();
  const grid = new THREE.Mesh(gridGeometry, gridMaterial);
  const crosses = new THREE.Mesh(crossGeometry, crossMaterial);
  grid.frustumCulled = crosses.frustumCulled = false;
  grid.renderOrder = -90;
  crosses.renderOrder = -89;
  group.add(grid, crosses);
  return {
    group,
    resize(camera: THREE.OrthographicCamera, aspect: number) {
      const span = Math.max(camera.right - camera.left, camera.top - camera.bottom);
      uniforms.uScale.value.set(span, span, 1);
      // Match the reference's 8-unit minimum camera span without changing the
      // authored sculpture camera. Only the cross's local geometry is scaled.
      const referenceHeight = 8 / Math.min(1, aspect);
      uniforms.uCrossScale.value = (camera.top - camera.bottom) / referenceHeight;
    },
    dispose() {
      gridGeometry.dispose(); crossGeometry.dispose();
      gridMaterial.dispose(); crossMaterial.dispose();
    },
  };
}
