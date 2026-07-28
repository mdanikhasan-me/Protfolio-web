import { LoadingManager, Mesh, MeshStandardMaterial, SpotLight } from 'three';
import type { Group, Material, Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface HinodeAssets {
  environment: Group;
  vehicleScene: Group;
  vehicleRoot: Object3D;
  wheels: {
    frontLeft: Object3D;
    frontRight: Object3D;
    rearLeft: Object3D;
    rearRight: Object3D;
  };
  brakeMaterials: MeshStandardMaterial[];
}

const requireNode = (root: Object3D, name: string) => {
  const node = root.getObjectByName(name);
  if (!node) throw new Error(`Hinode vehicle export is missing ${name}`);
  return node;
};

export async function loadHinodeAssets(onProgress: (ratio: number) => void): Promise<HinodeAssets> {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress(total > 0 ? loaded / total : 0);
  const loader = new GLTFLoader(manager);
  const [environmentGltf, vehicleGltf] = await Promise.all([
    loader.loadAsync('/hinode/models/hinode-slice-environment.glb'),
    loader.loadAsync('/hinode/models/hinode-fictional-coupe.glb'),
  ]);
  const environment = environmentGltf.scene;
  const vehicleScene = vehicleGltf.scene;
  const vehicleRoot = requireNode(vehicleScene, 'VEHICLE_ROOT');
  const brakeMaterials: MeshStandardMaterial[] = [];

  environment.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.receiveShadow = true;
    node.castShadow = false;
  });
  vehicleScene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (!node.name.startsWith('BRAKE_LIGHT_')) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const candidate of materials) {
      if (candidate instanceof MeshStandardMaterial) brakeMaterials.push(candidate);
    }
  });

  [-0.54, 0.54].forEach((x, index) => {
    const light = new SpotLight(0xc9e6ff, 22, 18, Math.PI / 8, 0.5, 1.3);
    light.name = `RUNTIME_HEADLIGHT_${index + 1}`;
    light.position.set(x, 0.82, -1.95);
    light.target.position.set(x * 0.72, 0.15, -9);
    vehicleRoot.add(light, light.target);
  });

  onProgress(1);
  return {
    environment,
    vehicleScene,
    vehicleRoot,
    wheels: {
      frontLeft: requireNode(vehicleScene, 'WHEEL_FL'),
      frontRight: requireNode(vehicleScene, 'WHEEL_FR'),
      rearLeft: requireNode(vehicleScene, 'WHEEL_RL'),
      rearRight: requireNode(vehicleScene, 'WHEEL_RR'),
    },
    brakeMaterials,
  };
}

export function disposeHinodeAssets(assets: HinodeAssets) {
  for (const root of [assets.environment, assets.vehicleScene]) {
    root.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry.dispose();
      const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
      for (const candidate of materials) {
        if (candidate instanceof MeshStandardMaterial) {
          candidate.map?.dispose();
          candidate.normalMap?.dispose();
          candidate.roughnessMap?.dispose();
          candidate.metalnessMap?.dispose();
          candidate.emissiveMap?.dispose();
        }
        candidate.dispose();
      }
    });
  }
}
