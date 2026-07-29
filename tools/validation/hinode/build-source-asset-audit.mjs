import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceRoot = 'C:\\Users\\anikh\\Downloads\\Webs blender ass';
const rawAuditRoot = path.join(repositoryRoot, 'artifacts/hinode/asset-audit/raw');
const outputPath = path.join(repositoryRoot, 'docs/hinode/source-asset-audit.json');

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const absolute = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(absolute) : [absolute];
      }),
    )
  ).flat();
}

async function sha256(file) {
  return createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
}

function glbAssetMetadata(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') return null;
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.toString('ascii', 16, 20);
  if (jsonType !== 'JSON') return null;
  const json = JSON.parse(
    buffer
      .subarray(20, 20 + jsonLength)
      .toString('utf8')
      .replace(/\u0000+$/u, ''),
  );
  return {
    generator: json.asset?.generator ?? null,
    version: json.asset?.version ?? null,
    extras: json.asset?.extras ?? null,
  };
}

function sourceKey(sourcePath) {
  return path.resolve(sourcePath).toLowerCase();
}

function rootOrigins(record) {
  return record.objects
    .filter((object) => object.parent === null)
    .map((object) => ({
      object: object.name,
      originWorld: object.originWorld.map((value) => Number(value.toFixed(5))),
    }));
}

function wheelRecord(record) {
  const wheelNodes = record.objects.filter((object) => /wheel|tyre|tire/i.test(object.name));
  return {
    namedObjectCount: wheelNodes.length,
    independentTransformNodes: wheelNodes
      .filter((object) => object.type === 'EMPTY')
      .map((object) => ({
        name: object.name,
        originWorld: object.originWorld.map((value) => Number(value.toFixed(5))),
      })),
    separationStatus:
      wheelNodes.filter((object) => object.type === 'EMPTY').length >= 4
        ? 'four independent wheel transforms present'
        : 'four independent wheel transforms not present',
  };
}

function basePolicy(relativePath, record, embedded) {
  const filename = path.basename(relativePath);
  const lower = relativePath.toLowerCase();
  if (filename === 'LowPolyR34ByArifido.blend') {
    return {
      assetTitle: 'Hinode Low-Poly R34 candidate source',
      creator: {
        userAssertion: 'MD Anik Hasan',
        externalSourceRecord: 'Arifido._',
        status: 'conflict_requires_user_confirmation',
      },
      ownership: 'blocked: supplied filename and matching primary source page identify Arifido._',
      licence: {
        requestedProjectLicence: 'CC BY 4.0 attributed solely to MD Anik Hasan',
        externalSourceLicence: 'CC Attribution',
        status:
          'blocked_pending_confirmation_that_Arifido_is_MD_Anik_Hasan_or_separate_rights_evidence',
      },
      attribution:
        'Do not create final attribution until the creator identity conflict is resolved.',
      sourcePage:
        'https://sketchfab.com/3d-models/low-poly-nissan-skyline-gt-r-r34-8ecbe8e4e432439fa7159d2e61f6bc9b',
      forwardAxis: '-Y inferred from camera/rear orientation and longitudinal bounds',
      browserSuitability:
        'Triangle budget is reasonable, but the model is not integration-ready: wheels are fused, origins are not gameplay-ready, and external image links are missing.',
      derivedCopyOperations: [
        'resolve creator and licence contradiction',
        'preserve untouched source',
        'remove camera, light and hidden presentation empties',
        'normalise origin and ground contact',
        'separate four wheel geometry islands and create accurate pivots',
        'remove third-party vehicle badges',
        'create lights, collider and metadata only after rights confirmation',
      ],
      approvedPurpose: 'Hero-car candidate only after rights confirmation',
      rejectedPurpose: 'No integration, relicensing, branding or redistribution while blocked',
    };
  }
  if (filename === 'mazda_rx7_stylised.glb') {
    return {
      assetTitle: embedded?.extras?.title ?? 'Mazda RX7 Stylised',
      creator: embedded?.extras?.author ?? 'SheldonJ99',
      ownership: 'third-party',
      licence: {
        identifier: embedded?.extras?.license ?? 'CC-BY-4.0',
        status: 'verified_from_embedded_glTF_asset_extras_and_matching_primary_source_page',
      },
      attribution:
        'Attribution to SheldonJ99 is required for any later derivative or distribution.',
      sourcePage:
        embedded?.extras?.source ??
        'https://sketchfab.com/3d-models/mazda-rx7-stylised-898e9be8c8964f6298188a2901216e80',
      forwardAxis: 'undetermined; source is approximately 100x real scale',
      browserSuitability:
        'Reasonable 5,733-triangle budget, but not ready: presentation floor, extreme scale and no independent wheel transforms.',
      derivedCopyOperations: [
        'optional later vehicle only',
        'remove presentation floor',
        'normalise metre scale, origin, forward axis and ground contact',
        'separate or prepare wheel pivots',
        'preserve CC BY attribution and source metadata',
      ],
      approvedPurpose: 'Catalogue now; optional later vehicle after a separate approval',
      rejectedPurpose: 'Do not add to the active game during Checkpoints 1 through 4',
    };
  }
  if (filename === 'nissan_skyline_r32_-__low_poly.glb') {
    return {
      assetTitle: embedded?.extras?.title ?? 'Nissan Skyline R32 - Low Poly',
      creator: embedded?.extras?.author ?? 'JiggleSticks',
      ownership: 'third-party',
      licence: {
        identifier: embedded?.extras?.license ?? 'CC-BY-4.0',
        additionalRestrictionNotice: 'Sketchfab source page is marked NoAI',
        status: 'verified_for_catalogue_only',
      },
      attribution: 'Attribution to JiggleSticks would be required if used.',
      sourcePage:
        embedded?.extras?.source ??
        'https://sketchfab.com/3d-models/nissan-skyline-r32-low-poly-3c784f0649464a66b46007d7951723d2',
      forwardAxis: '-Y from front-wheel and rear-wheel node positions',
      browserSuitability:
        'Technically usable 17,980-triangle model with four independent wheel transforms, but explicitly excluded from initial production.',
      derivedCopyOperations: [],
      approvedPurpose: 'Catalogue evidence only',
      rejectedPurpose: 'Do not integrate, optimise or use as the hero vehicle',
    };
  }
  if (lower.includes('anime style veg')) {
    return {
      assetTitle: path.basename(filename, path.extname(filename)),
      creator: 'JABAMI Production (matched collection/source naming)',
      ownership: 'third-party',
      licence: {
        matchedSourceEvidence:
          filename === 'anime_nature_tree_01.glb'
            ? 'Sketchfab page currently reports Free Standard and NoAI'
            : 'No embedded licence; matching JABAMI collection found but exact per-file permission not captured locally',
        status: 'pending_full_asset_audit_permission_confirmation',
      },
      attribution: 'Pending exact per-file permission and attribution terms.',
      sourcePage:
        filename === 'anime_nature_tree_01.glb'
          ? 'https://sketchfab.com/3d-models/anime-nature-tree-01-177e81f556564fc9a9a64e9d55c30ae4'
          : 'https://sketchfab.com/JabamiProduction/collections/animes-vegetation-trees-1857f25e4885452989d634a46bd7ebd2',
      forwardAxis: 'not applicable',
      browserSuitability:
        record.counts.triangles <= 6000
          ? 'Geometry is suitable for controlled instancing after permission and derivative review.'
          : 'Hero or reduced-density use only; requires LOD review after permission confirmation.',
      derivedCopyOperations: [
        'do not recolour or replace original materials',
        'confirm source permission',
        'normalise pivot and ground contact in a project-local copy',
        'prepare LODs and instancing without altering the source',
      ],
      approvedPurpose: 'Road-visible vegetation composition after permission confirmation',
      rejectedPurpose: 'No runtime integration while permission remains pending',
    };
  }
  if (filename === 'NeonGenerator.blend') {
    return {
      assetTitle: 'Hinode NeonGenerator source',
      creator: 'MD Anik Hasan (user assertion)',
      ownership: 'user-owned per project instruction; no embedded ownership metadata found',
      licence: {
        identifier: 'project-internal ownership assertion',
        status: 'usable_for_internal_project_development; redistribution_terms_not_defined',
      },
      attribution: 'MD Anik Hasan',
      sourcePage: null,
      forwardAxis: 'not applicable',
      browserSuitability:
        'Blender production tool, not a runtime asset. Contains curves, text, one reference-image plane and one action.',
      derivedCopyOperations: [
        'preserve untouched source',
        'derive project-local sign assets',
        'remove reference-image plane from exported assets',
        'convert approved curves/text to efficient sign geometry and emissive atlases',
      ],
      approvedPurpose: 'Sign and neon asset production after editor sign-zone approval',
      rejectedPurpose: 'Do not load the Blender scene directly into the browser',
    };
  }
  throw new Error(`No audit policy for ${relativePath}`);
}

const rawFiles = (await fs.readdir(rawAuditRoot)).filter((file) => file.endsWith('.json')).sort();
const rawRecords = await Promise.all(
  rawFiles.map(async (file) =>
    JSON.parse(await fs.readFile(path.join(rawAuditRoot, file), 'utf8')),
  ),
);
const rawBySource = new Map(rawRecords.map((record) => [sourceKey(record.sourcePath), record]));
const files = (await walk(sourceRoot)).sort();
const sourceFiles = files.filter((file) =>
  ['.blend', '.glb', '.gltf'].includes(path.extname(file)),
);
const supportFiles = files.filter((file) => !sourceFiles.includes(file));

const assets = [];
for (const source of sourceFiles) {
  const relativePath = path.relative(sourceRoot, source);
  const bytes = await fs.readFile(source);
  const stat = await fs.stat(source);
  const record = rawBySource.get(sourceKey(source));
  if (!record) throw new Error(`Missing Blender inspection for ${source}`);
  const embedded = path.extname(source).toLowerCase() === '.glb' ? glbAssetMetadata(bytes) : null;
  const policy = basePolicy(relativePath, record, embedded);
  const hiddenObjects = record.objects
    .filter((object) => object.hiddenViewport || object.hiddenRender)
    .map((object) => object.name);
  const presentationObjects = record.objects
    .filter((object) => /floor|background|backdrop/i.test(object.name))
    .map((object) => object.name);
  assets.push({
    id: path
      .basename(source, path.extname(source))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
    exactFilename: path.basename(source),
    exactSourcePath: source,
    relativeSourcePath: relativePath,
    fileFormat: path.extname(source).slice(1).toLowerCase(),
    fileSizeBytes: stat.size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...policy,
    objectCount: record.counts.objects,
    meshCount: record.counts.meshes,
    triangleCount: record.counts.triangles,
    materialCount: record.counts.materials,
    textureDependencies: record.images
      .filter((image) => image.name !== 'Render Result')
      .map((image) => ({
        name: image.name,
        filepath: image.filepath,
        packed: image.packed,
        resolution: image.size,
        missing: !image.packed && (image.size[0] === 0 || image.size[1] === 0),
      })),
    dimensionsMetresAfterBlenderImport: record.bounds?.dimensions ?? null,
    boundingBoxAfterBlenderImport: record.bounds
      ? { minimum: record.bounds.minimum, maximum: record.bounds.maximum }
      : null,
    pivotAndRootOrigins: rootOrigins(record),
    originAssessment:
      record.objects.filter((object) => object.type === 'MESH').length === 1 &&
      rootOrigins(record).length === 1
        ? 'single root requires gameplay-origin review'
        : 'multiple roots require normalisation in a derived copy',
    upAxis:
      path.extname(source).toLowerCase() === '.blend'
        ? 'Blender Z-up'
        : 'glTF Y-up; inspected after Blender Z-up import',
    hiddenObjects,
    presentationFloorOrBackgroundObjects: presentationObjects,
    wheels: wheelRecord(record),
    rigOrAnimation: {
      actionCount: record.counts.actions,
      actions: record.actions,
      textBlockCount: record.counts.textBlocks,
    },
    embeddedAssetMetadata: embedded,
  });
}

const supporting = [];
for (const file of supportFiles) {
  const stat = await fs.stat(file);
  const extension = path.extname(file).toLowerCase();
  const imageMetadata = ['.png', '.jpg', '.jpeg', '.webp'].includes(extension)
    ? await sharp(file).metadata()
    : null;
  supporting.push({
    exactFilename: path.basename(file),
    exactSourcePath: file,
    relativeSourcePath: path.relative(sourceRoot, file),
    fileFormat: extension.slice(1),
    fileSizeBytes: stat.size,
    sha256: await sha256(file),
    role: 'source preview or source-page evidence; never a runtime asset',
    imageDimensions: imageMetadata
      ? { width: imageMetadata.width, height: imageMetadata.height }
      : null,
  });
}

const report = {
  schemaVersion: 1,
  checkpoint: 1,
  sourceRoot,
  sourcePolicy: 'read-only; no source file was changed, renamed, moved, resaved or overwritten',
  inspectedWith: {
    blender: '5.2.0 LTS background mode',
    glbMetadata: 'direct JSON-chunk inspection',
    sourcePages: 'matching primary Sketchfab model pages checked on 2026-07-29',
  },
  blockingFindings: [
    {
      id: 'r34-creator-identity-conflict',
      severity: 'true_blocker',
      finding:
        'The prompt asserts MD Anik Hasan created the R34, but the exact supplied filename and matching 11.2k-triangle primary source page identify Arifido._. The Blender file contains no embedded ownership metadata.',
      requiredResolution:
        'Confirm that Arifido._ is MD Anik Hasan or provide separate proof of ownership/permission before relicensing, branding, deriving or distributing the R34.',
    },
  ],
  totals: {
    sourceAssets: assets.length,
    supportingFiles: supporting.length,
    sourceBytes: assets.reduce((total, asset) => total + asset.fileSizeBytes, 0),
    sourceTriangles: assets.reduce((total, asset) => total + asset.triangleCount, 0),
  },
  assets,
  supportingFiles: supporting,
};

await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Hinode source asset audit: ${outputPath}`);
console.log(JSON.stringify(report.totals, null, 2));
