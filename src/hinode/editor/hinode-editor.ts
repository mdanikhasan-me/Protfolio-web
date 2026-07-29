import {
  ACESFilmicToneMapping,
  BoxHelper,
  Color,
  DirectionalLight,
  FogExp2,
  GridHelper,
  Group,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  TransformControls,
  type TransformControlsMode,
} from 'three/addons/controls/TransformControls.js';
import { resolveQuality } from '../core/quality';
import {
  cloneCityLayout,
  loadCityLayout,
  roadCurve,
  validateCityLayout,
  type HinodeCityLayout,
  type HinodePlanZone,
  type HinodeRoad,
} from '../map/city-layout';
import { applyTransformToLayout, buildCityScene, type ReviewLayerKind } from '../map/city-scene';
import './hinode-editor.css';

type EditorType = 'road' | 'district';

interface Selection {
  key: string;
  id: string;
  type: EditorType;
  object: Group;
}

const LOCAL_STORAGE_KEY = 'hinode-city-layout-v1-editor';
const root = document.querySelector<HTMLElement>('[data-hinode-editor]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-editor-canvas]');
if (!root || !canvas) throw new Error('Hinode editor shell is incomplete.');

const find = <T extends Element>(selector: string) => root.querySelector<T>(selector);
const hierarchy = find<HTMLElement>('[data-hierarchy-list]');
const inspectorEmpty = find<HTMLElement>('[data-inspector-empty]');
const inspectorForm = find<HTMLFormElement>('[data-inspector-form]');
const selectedTypeOutput = find<HTMLElement>('[data-selected-type]');
const objectStateOutput = find<HTMLElement>('[data-object-state]');
const statusOutput = find<HTMLElement>('[data-editor-status]');
const validOutput = find<HTMLElement>('[data-layout-valid]');
const roadCountOutput = find<HTMLElement>('[data-road-count]');
const lengthOutput = find<HTMLElement>('[data-network-length]');
const objectCountOutput = find<HTMLElement>('[data-object-count]');
const callsOutput = find<HTMLElement>('[data-draw-calls]');
const trianglesOutput = find<HTMLElement>('[data-triangles]');
const importInput = find<HTMLInputElement>('[data-import-file]');
const roadInspector = find<HTMLElement>('[data-road-inspector]');
const roadPointIndexOutput = find<HTMLElement>('[data-road-point-index]');

const quality = resolveQuality(location.search);
const renderer = new WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.42;

const scene = new Scene();
scene.background = new Color(0x050915);
scene.fog = new FogExp2(0x050915, 0.0017);
scene.add(new HemisphereLight(0xa8caf5, 0x10101c, 2.65));
const sun = new DirectionalLight(0xc8ddff, 3.4);
sun.position.set(-180, 260, 110);
scene.add(sun);
const grid = new GridHelper(500, 50, 0x37728a, 0x172d43);
grid.position.y = -0.03;
scene.add(grid);

const camera = new PerspectiveCamera(52, 1, 0.5, 1_500);
camera.position.set(330, 290, 330);
const orbit = new OrbitControls(camera, canvas);
orbit.target.set(0, 0, 0);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.minDistance = 12;
orbit.maxDistance = 760;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.update();

const transforms = new TransformControls(camera, canvas);
transforms.setMode('translate');
transforms.setSpace('world');
transforms.size = 0.9;
scene.add(transforms.getHelper());
const raycaster = new Raycaster();
const pointer = new Vector2();
const selectionBox = new BoxHelper(new Group(), 0x5bdff5);
selectionBox.visible = false;
scene.add(selectionBox);

let sourceLayout: HinodeCityLayout;
let layout: HinodeCityLayout;
let cityRoot: Group;
let editableObjects = new Map<string, Group>();
let reviewLayers = new Map<ReviewLayerKind, Group>();
let selection: Selection | undefined;
let activeOverlay: ReviewLayerKind | undefined;
let snapEnabled = false;
let duplicateCounter = 1;
let roadCounter = 1;
let zoneCounter = 1;
let selectedRoadPointIndex = 0;
let routePlayback:
  | {
      roadId: string;
      startedAt: number;
    }
  | undefined;
let isolatedDistrictId: string | undefined;
let transformSnapshot: string | undefined;
const undoStack: string[] = [];
const redoStack: string[] = [];

const serialize = () => JSON.stringify(layout);

const setStatus = (message: string) => {
  if (statusOutput) statusOutput.textContent = message;
};

const editableKey = (type: EditorType, id: string) => `${type}:${id}`;

const layoutItem = (type: EditorType, id: string) =>
  type === 'road'
    ? layout.roads.find((road) => road.id === id)
    : layout.districts.find((district) => district.id === id);

const updateValidation = () => {
  const validation = validateCityLayout(layout);
  root.dataset.layoutValid = String(validation.valid);
  root.dataset.roadCount = String(validation.metrics.roadCount);
  root.dataset.networkLength = validation.metrics.routeLengthMetres.toFixed(1);
  root.dataset.undoDepth = String(undoStack.length);
  if (validOutput) {
    validOutput.textContent = validation.valid ? 'PASS' : `${validation.errors.length} ISSUES`;
    validOutput.style.color = validation.valid ? '#5bdff5' : '#ff6f47';
  }
  if (roadCountOutput) roadCountOutput.textContent = String(validation.metrics.roadCount);
  if (lengthOutput)
    lengthOutput.textContent = `${Math.round(validation.metrics.routeLengthMetres)} M`;
  if (objectCountOutput)
    objectCountOutput.textContent = String(layout.roads.length + layout.districts.length);
};

const pushUndo = (snapshot = serialize()) => {
  undoStack.push(snapshot);
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  updateValidation();
};

const applySelectionBox = () => {
  if (!selection || !selection.object.visible) {
    selectionBox.visible = false;
    return;
  }
  selectionBox.setFromObject(selection.object);
  selectionBox.visible = true;
};

const field = (name: string) =>
  inspectorForm?.querySelector<HTMLInputElement>(`[data-field="${name}"]`);
const roadField = <T extends HTMLInputElement | HTMLSelectElement>(name: string) =>
  inspectorForm?.querySelector<T>(`[data-road-field="${name}"]`);

const selectedRoad = () =>
  selection?.type === 'road'
    ? layout.roads.find((road) => road.id === selection?.id)
    : layout.roads.find((road) => road.id === 'main-loop');

const refreshInspector = () => {
  if (!selection) {
    if (inspectorEmpty) inspectorEmpty.hidden = false;
    if (inspectorForm) inspectorForm.hidden = true;
    if (selectedTypeOutput) selectedTypeOutput.textContent = 'NONE';
    if (roadInspector) roadInspector.hidden = true;
    root.dataset.selected = '';
    return;
  }
  const item = layoutItem(selection.type, selection.id);
  if (!item) return;
  if (inspectorEmpty) inspectorEmpty.hidden = true;
  if (inspectorForm) inspectorForm.hidden = false;
  if (selectedTypeOutput) selectedTypeOutput.textContent = selection.type.toUpperCase();
  field('label')!.value = item.label;
  field('id')!.value = selection.id;
  field('x')!.value = selection.object.position.x.toFixed(2);
  field('y')!.value = selection.object.position.y.toFixed(2);
  field('z')!.value = selection.object.position.z.toFixed(2);
  field('rotation')!.value = MathUtils.radToDeg(selection.object.rotation.y).toFixed(1);
  field('scale-x')!.value = selection.object.scale.x.toFixed(2);
  field('scale-z')!.value = selection.object.scale.z.toFixed(2);
  if (roadInspector) roadInspector.hidden = selection.type !== 'road';
  if (selection.type === 'road') {
    const road = item as HinodeRoad;
    selectedRoadPointIndex = Math.min(selectedRoadPointIndex, road.points.length - 1);
    const point = road.points[selectedRoadPointIndex]!;
    roadField<HTMLSelectElement>('surface')!.value = road.surface;
    roadField<HTMLInputElement>('width')!.value = road.width.toFixed(1);
    roadField<HTMLInputElement>('lanes')!.value = String(road.lanes);
    roadField<HTMLSelectElement>('direction')!.value = road.direction;
    const roadside = layout.planning.footpaths.find((candidate) => candidate.roadId === road.id);
    const curb = layout.authoring.curbProfiles.find((candidate) => candidate.roadId === road.id);
    roadField<HTMLInputElement>('footpath-left')!.value = String(roadside?.leftWidth ?? 1);
    roadField<HTMLInputElement>('footpath-right')!.value = String(roadside?.rightWidth ?? 1);
    roadField<HTMLInputElement>('drainage')!.value = String(roadside?.drainageWidth ?? 0.2);
    roadField<HTMLSelectElement>('curb-profile')!.value = curb?.profile ?? 'raised';
    roadField<HTMLInputElement>('point-x')!.value = point[0].toFixed(2);
    roadField<HTMLInputElement>('point-y')!.value = point[1].toFixed(2);
    roadField<HTMLInputElement>('point-z')!.value = point[2].toFixed(2);
    roadField<HTMLInputElement>('tangent-length')!.value = String(
      road.spline.tangentLengths[selectedRoadPointIndex] ?? 1,
    );
    roadField<HTMLInputElement>('tangent-yaw')!.value = String(
      road.spline.tangentYawOffsetsDegrees[selectedRoadPointIndex] ?? 0,
    );
    roadField<HTMLInputElement>('bank')!.value = String(
      road.spline.bankingDegrees[selectedRoadPointIndex] ?? 0,
    );
    if (roadPointIndexOutput)
      roadPointIndexOutput.textContent = `${String(selectedRoadPointIndex + 1).padStart(2, '0')} / ${String(road.points.length).padStart(2, '0')}`;
    root.dataset.selectedRoadPoint = String(selectedRoadPointIndex);
    root.dataset.selectedRoadPointCount = String(road.points.length);
  } else {
    root.dataset.selectedRoadPoint = '';
    root.dataset.selectedRoadPointCount = '';
  }
  const hidden = Boolean(item.hidden);
  const locked = Boolean(item.locked);
  if (objectStateOutput)
    objectStateOutput.textContent = `${hidden ? 'HIDDEN' : 'VISIBLE'} / ${locked ? 'LOCKED' : 'EDITABLE'}`;
  root.dataset.selected = selection.key;
  applySelectionBox();
};

const selectByKey = (key: string | undefined) => {
  const previousKey = selection?.key;
  transforms.detach();
  selection = undefined;
  if (key) {
    const object = editableObjects.get(key);
    const [type, id] = key.split(':') as [EditorType, string];
    if (object && (type === 'road' || type === 'district')) {
      if (key !== previousKey) selectedRoadPointIndex = 0;
      selection = { key, type, id, object };
      const item = layoutItem(type, id);
      const locked = Boolean(item?.locked);
      const hidden = Boolean(item?.hidden);
      if (!locked && !hidden) transforms.attach(object);
    }
  }
  refreshHierarchy();
  refreshInspector();
};

const createHierarchySection = (
  heading: string,
  items: Array<{ key: string; label: string; state: string }>,
) => {
  const section = document.createElement('section');
  const title = document.createElement('span');
  title.textContent = heading;
  section.append(title);
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.key = item.key;
    button.classList.toggle('is-selected', selection?.key === item.key);
    const label = document.createElement('span');
    label.textContent = item.label;
    const state = document.createElement('em');
    state.textContent = item.state;
    button.append(label, state);
    button.addEventListener('click', () => selectByKey(item.key));
    section.append(button);
  }
  return section;
};

function refreshHierarchy() {
  if (!hierarchy) return;
  hierarchy.replaceChildren(
    createHierarchySection(
      'Road network',
      layout.roads.map((road) => ({
        key: editableKey('road', road.id),
        label: road.label,
        state: road.locked ? 'LOCK' : road.hidden ? 'HIDE' : road.kind.toUpperCase(),
      })),
    ),
    createHierarchySection(
      'Proxy districts',
      layout.districts.map((district) => ({
        key: editableKey('district', district.id),
        label: district.label,
        state: district.locked ? 'LOCK' : district.hidden ? 'HIDE' : 'PROXY',
      })),
    ),
  );
}

const applyDistrictIsolation = () => {
  for (const district of layout.districts) {
    const object = editableObjects.get(editableKey('district', district.id));
    if (object) {
      object.visible =
        !district.hidden && (!isolatedDistrictId || district.id === isolatedDistrictId);
    }
  }
  root.dataset.isolatedDistrict = isolatedDistrictId ?? 'none';
};

const rebuildScene = (reselect?: string) => {
  if (cityRoot) scene.remove(cityRoot);
  const build = buildCityScene(layout, { quality: quality.name, editor: true });
  cityRoot = build.root;
  editableObjects = build.editableObjects;
  reviewLayers = build.reviewLayers;
  scene.add(cityRoot);
  for (const [kind, layer] of reviewLayers) layer.visible = kind === activeOverlay;
  applyDistrictIsolation();
  updateValidation();
  selectByKey(reselect);
};

const commitTransform = () => {
  if (!selection) return;
  applyTransformToLayout(layout, selection.type, selection.id, selection.object);
  const key = selection.key;
  if (selection.type === 'district') {
    rebuildScene(key);
  } else {
    refreshInspector();
    updateValidation();
  }
};

const duplicateSelection = () => {
  if (!selection) return;
  pushUndo();
  const suffix = `copy-${duplicateCounter++}`;
  let newKey: string;
  if (selection.type === 'road') {
    const source = layout.roads.find((road) => road.id === selection?.id);
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = `${source.id}-${suffix}`;
    copy.label = `${source.label} Copy`;
    copy.transform.position[0] += 8;
    copy.transform.position[2] += 8;
    layout.roads.push(copy);
    const roadside = layout.planning.footpaths.find((item) => item.roadId === source.id);
    if (roadside) layout.planning.footpaths.push({ ...structuredClone(roadside), roadId: copy.id });
    const curb = layout.authoring.curbProfiles.find((item) => item.roadId === source.id);
    if (curb) layout.authoring.curbProfiles.push({ ...structuredClone(curb), roadId: copy.id });
    newKey = editableKey('road', copy.id);
  } else {
    const source = layout.districts.find((district) => district.id === selection?.id);
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = `${source.id}-${suffix}`;
    copy.label = `${source.label} Copy`;
    copy.centre[0] += 10;
    copy.centre[2] += 10;
    layout.districts.push(copy);
    newKey = editableKey('district', copy.id);
  }
  rebuildScene(newKey);
  setStatus(`Duplicated ${selection.id}`);
};

const deleteSelection = () => {
  if (!selection) return;
  const deleted = selection.id;
  pushUndo();
  if (selection.type === 'road') {
    layout.roads = layout.roads.filter((road) => road.id !== selection?.id);
    layout.planning.footpaths = layout.planning.footpaths.filter(
      (item) => item.roadId !== selection?.id,
    );
    layout.authoring.curbProfiles = layout.authoring.curbProfiles.filter(
      (item) => item.roadId !== selection?.id,
    );
  } else {
    layout.districts = layout.districts.filter((district) => district.id !== selection?.id);
  }
  rebuildScene();
  setStatus(`Deleted ${deleted}; validation updated`);
};

const toggleHidden = () => {
  if (!selection) return;
  const item = layoutItem(selection.type, selection.id);
  if (!item) return;
  pushUndo();
  item.hidden = !item.hidden;
  selection.object.visible = !item.hidden;
  selectByKey(selection.key);
  setStatus(`${item.label} ${item.hidden ? 'hidden' : 'shown'}`);
};

const toggleLocked = () => {
  if (!selection) return;
  const item = layoutItem(selection.type, selection.id);
  if (!item) return;
  pushUndo();
  item.locked = !item.locked;
  selectByKey(selection.key);
  setStatus(`${item.label} ${item.locked ? 'locked' : 'unlocked'}`);
};

const restoreSnapshot = (snapshot: string) => {
  layout = JSON.parse(snapshot) as HinodeCityLayout;
  rebuildScene();
};

const undo = () => {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  redoStack.push(serialize());
  restoreSnapshot(snapshot);
  setStatus('Undo');
};

const redo = () => {
  const snapshot = redoStack.pop();
  if (!snapshot) return;
  undoStack.push(serialize());
  restoreSnapshot(snapshot);
  setStatus('Redo');
};

const setTransformMode = (mode: TransformControlsMode) => {
  transforms.setMode(mode);
  root.querySelectorAll<HTMLElement>('[data-transform-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.transformMode === mode);
  });
  setStatus(`${mode[0]!.toUpperCase()}${mode.slice(1)} tool`);
};

const toggleSnap = () => {
  snapEnabled = !snapEnabled;
  transforms.setTranslationSnap(snapEnabled ? 1 : null);
  transforms.setRotationSnap(snapEnabled ? MathUtils.degToRad(15) : null);
  transforms.setScaleSnap(snapEnabled ? 0.1 : null);
  const button = find<HTMLButtonElement>('[data-action="snap"]');
  if (button) {
    button.textContent = snapEnabled ? 'Snap on' : 'Snap off';
    button.setAttribute('aria-pressed', String(snapEnabled));
    button.classList.toggle('is-active', snapEnabled);
  }
};

const saveLocal = () => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout, null, 2));
  setStatus('Layout saved to this browser');
};

const loadLocal = () => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    setStatus('No local layout has been saved');
    return;
  }
  const candidate = JSON.parse(stored) as HinodeCityLayout;
  const validation = validateCityLayout(candidate);
  if (!validation.valid) {
    setStatus(`Local layout rejected: ${validation.errors[0]}`);
    return;
  }
  pushUndo();
  layout = candidate;
  rebuildScene();
  setStatus('Local layout loaded');
};

const exportLayout = () => {
  const blob = new Blob([`${JSON.stringify(layout, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${layout.layoutId.toLowerCase()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Layout JSON exported');
};

const importLayout = async (file: File) => {
  const candidate = JSON.parse(await file.text()) as HinodeCityLayout;
  const validation = validateCityLayout(candidate);
  if (!validation.valid) {
    setStatus(`Import rejected: ${validation.errors[0]}`);
    return;
  }
  pushUndo();
  layout = candidate;
  rebuildScene();
  setStatus(`Imported ${file.name}`);
};

type RoadCreationPreset = 'route' | 'connector' | 'flyover' | 'underpass' | 'shortcut';

const createRoad = (preset: RoadCreationPreset) => {
  pushUndo();
  let id: string;
  do {
    id = `authored-${preset}-${roadCounter++}`;
  } while (layout.roads.some((road) => road.id === id));
  const centreX = MathUtils.clamp(orbit.target.x, -205, 205);
  const centreZ = MathUtils.clamp(orbit.target.z, -135, 135);
  const elevated = preset === 'flyover';
  const underpass = preset === 'underpass';
  const shortcut = preset === 'shortcut';
  const connector = preset === 'connector' || elevated;
  const points: HinodeRoad['points'] = [
    [centreX - 24, 0, centreZ - 10],
    [centreX - 8, elevated ? 5 : underpass ? -2 : 0, centreZ],
    [centreX + 8, elevated ? 7 : underpass ? -3 : 0, centreZ + 4],
    [centreX + 24, 0, centreZ + 12],
  ];
  const road: HinodeRoad = {
    id,
    label:
      preset === 'connector'
        ? 'Authored Junction'
        : preset === 'flyover'
          ? 'Authored Flyover'
          : preset === 'underpass'
            ? 'Authored Underpass'
            : preset === 'shortcut'
              ? 'Authored Shortcut'
              : 'Authored Route',
    kind: underpass ? 'underpass' : shortcut ? 'shortcut' : connector ? 'connector' : 'route',
    surface: underpass ? 'tunnel' : elevated ? 'elevated' : shortcut ? 'alley' : 'city',
    width: shortcut ? 5 : 7,
    lanes: shortcut ? 1 : 2,
    direction: shortcut ? 'one-way' : 'two-way',
    closed: false,
    spline: {
      type: 'cubic-bezier',
      tangentLengths: [7, 7, 7, 7],
      tangentYawOffsetsDegrees: [0, 0, 0, 0],
      bankingDegrees: [0, elevated ? 2 : 0, elevated ? 2 : 0, 0],
    },
    transform: {
      position: [0, 0, 0],
      rotationY: 0,
      scale: [1, 1, 1],
    },
    points,
  };
  layout.roads.push(road);
  layout.planning.footpaths.push({
    roadId: road.id,
    leftWidth: shortcut ? 0.6 : 1.4,
    rightWidth: shortcut ? 0.6 : 1.4,
    drainageWidth: shortcut ? 0.2 : 0.3,
  });
  layout.authoring.curbProfiles.push({
    roadId: road.id,
    profile: shortcut ? 'flush' : 'raised',
    heightMetres: shortcut ? 0.04 : 0.14,
  });
  rebuildScene(editableKey('road', road.id));
  setStatus(`${road.label} created with four editable Bézier anchors`);
};

type ZoneCreationPreset =
  | 'parcel'
  | 'vegetation'
  | 'sign'
  | 'billboard'
  | 'prop'
  | 'clearance'
  | 'sightline'
  | 'reset'
  | 'landmark'
  | 'spawn';

const createZone = (preset: ZoneCreationPreset) => {
  const road = selectedRoad();
  if (!road) return;
  pushUndo();
  const curve = roadCurve(road);
  const progress = 0.5;
  const point = curve.getPointAt(progress);
  const tangent = curve.getTangentAt(progress).normalize();
  const yawRadians = Math.atan2(-tangent.x, -tangent.z);
  const id = `authored-${preset}-${zoneCounter++}`;
  const zone: HinodePlanZone = {
    id,
    label: `Authored ${preset.replaceAll('-', ' ')}`,
    centre: [point.x, point.y + 0.08, point.z],
    size:
      preset === 'parcel'
        ? [24, 1, 18]
        : preset === 'vegetation'
          ? [18, 1, 12]
          : preset === 'landmark'
            ? [8, 20, 8]
            : [4, 3, 2],
    rotationY: yawRadians,
    ...(selection?.type === 'district' ? { districtId: selection.id } : {}),
    hostRoadId: road.id,
  };
  let overlay: ReviewLayerKind | undefined;
  if (preset === 'parcel') {
    layout.planning.parcels.push(zone);
    layout.authoring.buildingProxies.push({
      id: `building-${id}`,
      parcelId: id,
      buildingType: 'editor-proxy',
      heightMetres: 10,
      facadeDirectionDegrees: MathUtils.radToDeg(yawRadians),
      roofClass: 'flat',
      role: 'commercial',
      signCapacity: 1,
      visibilityBand: 'mid',
      futureAssetId: 'BLD_Unassigned_Editor_Proxy',
      setbackMetres: 2,
    });
    overlay = 'parcels';
  } else if (preset === 'vegetation') {
    layout.planning.vegetationZones.push(zone);
    overlay = 'vegetation';
  } else if (preset === 'sign') {
    layout.planning.signZones.push(zone);
    overlay = 'signs';
  } else if (preset === 'billboard') {
    layout.authoring.billboardSockets.push(zone);
    overlay = 'signs';
  } else if (preset === 'prop') {
    layout.authoring.futurePropSockets.push(zone);
    overlay = 'signs';
  } else if (preset === 'clearance') {
    layout.authoring.vehicleClearanceVolumes.push({
      id,
      label: zone.label,
      centre: zone.centre,
      size: [Math.max(road.width, 5), 3.6, 16],
    });
    overlay = 'collision';
  } else if (preset === 'sightline') {
    layout.planning.reviewViews.push({
      id,
      label: zone.label,
      roadId: road.id,
      progress,
      feature:
        road.surface === 'elevated'
          ? 'flyover'
          : road.surface === 'tunnel'
            ? 'underpass'
            : 'district',
      sightlineMetres: 45,
    });
    overlay = 'sightlines';
  } else if (preset === 'reset') {
    layout.authoring.resetZones.push({ ...zone, roadId: road.id });
    overlay = 'sightlines';
  } else if (preset === 'landmark') {
    layout.authoring.landmarks.push(zone);
    overlay = 'sightlines';
  } else {
    layout.spawn = {
      roadId: road.id,
      position: [point.x, point.y + 0.68, point.z],
      yawRadians,
    };
  }
  const selectedKey = selection?.key;
  rebuildScene(selectedKey);
  if (overlay) setOverlay(overlay);
  root.dataset.lastCreatedZone = preset;
  setStatus(
    preset === 'spawn'
      ? `${road.label} spawn updated`
      : `${zone.label} created from the selected route`,
  );
};

const changeRoadPoint = (action: 'previous' | 'next' | 'add' | 'delete') => {
  if (selection?.type !== 'road') return;
  const road = layout.roads.find((candidate) => candidate.id === selection?.id);
  if (!road) return;
  if (action === 'previous' || action === 'next') {
    const offset = action === 'previous' ? -1 : 1;
    selectedRoadPointIndex =
      (selectedRoadPointIndex + offset + road.points.length) % road.points.length;
    refreshInspector();
    return;
  }
  if (action === 'delete' && road.points.length <= 2) {
    setStatus('A road requires at least two Bézier anchors');
    return;
  }
  pushUndo();
  if (action === 'add') {
    const current = road.points[selectedRoadPointIndex]!;
    const next =
      road.points[selectedRoadPointIndex + 1] ??
      (road.closed ? road.points[0]! : ([current[0] + 16, current[1], current[2]] as const));
    const inserted: [number, number, number] = [
      (current[0] + next[0]) * 0.5,
      (current[1] + next[1]) * 0.5,
      (current[2] + next[2]) * 0.5,
    ];
    const insertAt = selectedRoadPointIndex + 1;
    road.points.splice(insertAt, 0, inserted);
    road.spline.tangentLengths.splice(
      insertAt,
      0,
      Math.max(2, Math.hypot(next[0] - current[0], next[2] - current[2]) / 6),
    );
    road.spline.tangentYawOffsetsDegrees.splice(insertAt, 0, 0);
    road.spline.bankingDegrees.splice(insertAt, 0, 0);
    selectedRoadPointIndex = insertAt;
  } else {
    road.points.splice(selectedRoadPointIndex, 1);
    road.spline.tangentLengths.splice(selectedRoadPointIndex, 1);
    road.spline.tangentYawOffsetsDegrees.splice(selectedRoadPointIndex, 1);
    road.spline.bankingDegrees.splice(selectedRoadPointIndex, 1);
    selectedRoadPointIndex = Math.min(selectedRoadPointIndex, road.points.length - 1);
  }
  rebuildScene(selection.key);
  setStatus(`${road.label} now has ${road.points.length} Bézier anchors`);
};

const stopRoutePlayback = (message?: string) => {
  routePlayback = undefined;
  root.dataset.routePlayback = 'false';
  root.querySelector('[data-camera="playback"]')?.classList.remove('is-active');
  if (message) setStatus(message);
};

const cameraPreset = (preset: string) => {
  if (preset === 'playback') {
    if (routePlayback) {
      stopRoutePlayback('Route playback stopped; orbit remains free');
      return;
    }
    const road = selectedRoad();
    if (!road) return;
    routePlayback = { roadId: road.id, startedAt: performance.now() };
    root.dataset.routePlayback = 'true';
    root.querySelector('[data-camera="playback"]')?.classList.add('is-active');
    setStatus(`${road.label} route playback; drag the canvas to stop`);
    return;
  }
  if (preset === 'isolate') {
    if (isolatedDistrictId) {
      isolatedDistrictId = undefined;
      applyDistrictIsolation();
      setStatus('All districts visible');
      return;
    }
    if (selection?.type !== 'district') {
      setStatus('Select a district before isolating it');
      return;
    }
    isolatedDistrictId = selection.id;
    applyDistrictIsolation();
    setStatus(`${layoutItem('district', selection.id)?.label ?? selection.id} isolated`);
    return;
  }
  stopRoutePlayback();
  if (preset === 'top') {
    camera.position.set(0, 520, 0.01);
    orbit.target.set(0, 0, 0);
  } else if (preset === 'street') {
    camera.position.set(-222, 28, -154);
    orbit.target.set(-150, 0, -90);
  } else if (preset === 'chase') {
    const road = selectedRoad();
    if (!road) return;
    const curve = roadCurve(road);
    const point = curve.getPointAt(0.18);
    const tangent = curve.getTangentAt(0.18).normalize();
    camera.position
      .copy(point)
      .addScaledVector(tangent, -11)
      .add(new Vector3(0, 4.2, 0));
    orbit.target
      .copy(point)
      .addScaledVector(tangent, 10)
      .add(new Vector3(0, 1.2, 0));
  } else {
    camera.position.set(330, 290, 330);
    orbit.target.set(0, 0, 0);
  }
  orbit.update();
  setStatus(`${preset} camera; orbit remains enabled`);
};

const setOverlay = (kind: ReviewLayerKind | undefined) => {
  activeOverlay = kind;
  for (const [layerKind, layer] of reviewLayers) layer.visible = layerKind === kind;
  root.dataset.activeOverlay = kind ?? 'none';
  root.querySelectorAll<HTMLButtonElement>('[data-overlay]').forEach((button) => {
    const selected = button.dataset.overlay === kind;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  setStatus(kind ? `${kind.replace('-', ' ')} review overlay` : 'Review overlay hidden');
};

const pick = (event: PointerEvent) => {
  if (routePlayback) stopRoutePlayback('Route playback stopped; orbit remains free');
  if (transforms.dragging || !cityRoot) return;
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(cityRoot, true);
  for (const intersection of intersections) {
    let object: Object3D | null = intersection.object;
    while (object && !object.userData.editorType) object = object.parent;
    if (!object) continue;
    const type = object.userData.editorType as EditorType;
    const id = object.userData.layoutId as string;
    selectByKey(editableKey(type, id));
    return;
  }
  selectByKey(undefined);
};

transforms.addEventListener('dragging-changed', (event) => {
  orbit.enabled = event.value !== true;
  root.dataset.cameraLocked = 'false';
});
transforms.addEventListener('mouseDown', () => {
  transformSnapshot = serialize();
});
transforms.addEventListener('objectChange', () => {
  refreshInspector();
});
transforms.addEventListener('mouseUp', () => {
  if (transformSnapshot) pushUndo(transformSnapshot);
  transformSnapshot = undefined;
  commitTransform();
});

canvas.addEventListener('pointerdown', pick);
root.querySelectorAll<HTMLButtonElement>('[data-transform-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    setTransformMode(button.dataset.transformMode as TransformControlsMode);
  });
});
root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'new') {
      pushUndo();
      layout = cloneCityLayout(sourceLayout);
      rebuildScene();
      setStatus('Authoritative source layout reloaded');
    }
    if (action === 'save') saveLocal();
    if (action === 'load') loadLocal();
    if (action === 'import') importInput?.click();
    if (action === 'export') exportLayout();
    if (action === 'snap') toggleSnap();
    if (action === 'duplicate') duplicateSelection();
    if (action === 'delete') deleteSelection();
    if (action === 'hide') toggleHidden();
    if (action === 'lock') toggleLocked();
    if (action === 'undo') undo();
    if (action === 'redo') redo();
  });
});
root.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => {
  button.addEventListener('click', () => cameraPreset(button.dataset.camera ?? 'iso'));
});
root.querySelectorAll<HTMLButtonElement>('[data-create-road]').forEach((button) => {
  button.addEventListener('click', () => {
    createRoad(button.dataset.createRoad as RoadCreationPreset);
  });
});
root.querySelectorAll<HTMLButtonElement>('[data-create-zone]').forEach((button) => {
  button.addEventListener('click', () => {
    createZone(button.dataset.createZone as ZoneCreationPreset);
  });
});
root.querySelectorAll<HTMLButtonElement>('[data-road-point-action]').forEach((button) => {
  button.addEventListener('click', () => {
    changeRoadPoint(button.dataset.roadPointAction as 'previous' | 'next' | 'add' | 'delete');
  });
});
root.querySelectorAll<HTMLButtonElement>('[data-overlay]').forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.dataset.overlay as ReviewLayerKind;
    setOverlay(activeOverlay === kind ? undefined : kind);
  });
});
importInput?.addEventListener('change', () => {
  const file = importInput.files?.[0];
  if (file) void importLayout(file);
  importInput.value = '';
});

inspectorForm?.addEventListener('change', () => {
  if (!selection) return;
  const item = layoutItem(selection.type, selection.id);
  if (!item) return;
  pushUndo();
  item.label = field('label')!.value.trim() || item.label;
  selection.object.position.set(
    Number(field('x')!.value),
    Number(field('y')!.value),
    Number(field('z')!.value),
  );
  selection.object.rotation.y = MathUtils.degToRad(Number(field('rotation')!.value));
  selection.object.scale.x = Math.max(0.1, Number(field('scale-x')!.value));
  selection.object.scale.z = Math.max(0.1, Number(field('scale-z')!.value));
  if (selection.type === 'road') {
    const road = item as HinodeRoad;
    road.surface = roadField<HTMLSelectElement>('surface')!.value as HinodeRoad['surface'];
    road.width = MathUtils.clamp(Number(roadField<HTMLInputElement>('width')!.value), 4, 14);
    road.lanes = Math.round(
      MathUtils.clamp(Number(roadField<HTMLInputElement>('lanes')!.value), 1, 4),
    );
    road.direction = roadField<HTMLSelectElement>('direction')!.value as HinodeRoad['direction'];
    const roadside = layout.planning.footpaths.find((candidate) => candidate.roadId === road.id);
    if (roadside) {
      roadside.leftWidth = MathUtils.clamp(
        Number(roadField<HTMLInputElement>('footpath-left')!.value),
        0.4,
        3,
      );
      roadside.rightWidth = MathUtils.clamp(
        Number(roadField<HTMLInputElement>('footpath-right')!.value),
        0.4,
        3,
      );
      roadside.drainageWidth = MathUtils.clamp(
        Number(roadField<HTMLInputElement>('drainage')!.value),
        0.1,
        0.8,
      );
    }
    const curb = layout.authoring.curbProfiles.find((candidate) => candidate.roadId === road.id);
    if (curb) {
      curb.profile = roadField<HTMLSelectElement>('curb-profile')!
        .value as (typeof curb)['profile'];
    }
    road.points[selectedRoadPointIndex] = [
      Number(roadField<HTMLInputElement>('point-x')!.value),
      Number(roadField<HTMLInputElement>('point-y')!.value),
      Number(roadField<HTMLInputElement>('point-z')!.value),
    ];
    road.spline.tangentLengths[selectedRoadPointIndex] = Math.max(
      0.1,
      Number(roadField<HTMLInputElement>('tangent-length')!.value),
    );
    road.spline.tangentYawOffsetsDegrees[selectedRoadPointIndex] = Number(
      roadField<HTMLInputElement>('tangent-yaw')!.value,
    );
    road.spline.bankingDegrees[selectedRoadPointIndex] = MathUtils.clamp(
      Number(roadField<HTMLInputElement>('bank')!.value),
      -12,
      12,
    );
  }
  commitTransform();
  if (selection.type === 'road') rebuildScene(selection.key);
  refreshHierarchy();
  setStatus(`Updated ${item.label}`);
});

addEventListener('keydown', (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (event.code === 'Digit1') setTransformMode('translate');
  if (event.code === 'Digit2') setTransformMode('rotate');
  if (event.code === 'Digit3') setTransformMode('scale');
  if (event.code === 'Delete') deleteSelection();
  if (event.code === 'KeyD' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    duplicateSelection();
  }
  if (event.code === 'KeyZ' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  }
});

const resize = () => {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const frame = (now: number) => {
  if (routePlayback) {
    const road = layout.roads.find((candidate) => candidate.id === routePlayback?.roadId);
    if (road) {
      const curve = roadCurve(road);
      const progress = ((now - routePlayback.startedAt) / 24_000) % 1;
      const point = curve.getPointAt(progress);
      const tangent = curve.getTangentAt(progress).normalize();
      const right = new Vector3(-tangent.z, 0, tangent.x);
      camera.position
        .copy(point)
        .addScaledVector(tangent, -9)
        .addScaledVector(right, 2.2)
        .add(new Vector3(0, 3.8, 0));
      orbit.target
        .copy(point)
        .addScaledVector(tangent, 12)
        .add(new Vector3(0, 1.1, 0));
    }
  }
  orbit.update();
  if (selectionBox.visible) selectionBox.update();
  renderer.render(scene, camera);
  root.dataset.drawCalls = String(renderer.info.render.calls);
  root.dataset.triangles = String(renderer.info.render.triangles);
  if (callsOutput) callsOutput.textContent = root.dataset.drawCalls;
  if (trianglesOutput) trianglesOutput.textContent = root.dataset.triangles;
  requestAnimationFrame(frame);
};

const initialise = async () => {
  try {
    sourceLayout = await loadCityLayout();
    layout = cloneCityLayout(sourceLayout);
    rebuildScene();
    const requestedOverlay = new URLSearchParams(location.search).get(
      'overlay',
    ) as ReviewLayerKind | null;
    if (requestedOverlay && reviewLayers.has(requestedOverlay)) {
      setOverlay(requestedOverlay);
      cameraPreset('top');
    } else {
      setOverlay(undefined);
    }
    root.dataset.phase = 'ready';
    root.dataset.cameraLocked = 'false';
    setStatus('Authoritative layout ready; camera orbit is free');
  } catch (error) {
    console.error(error);
    root.dataset.phase = 'error';
    setStatus(error instanceof Error ? error.message : 'Editor failed to load');
  }
};

addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
void initialise();

addEventListener(
  'pagehide',
  () => {
    orbit.dispose();
    transforms.dispose();
    renderer.dispose();
  },
  { once: true },
);
