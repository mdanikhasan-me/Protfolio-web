"""Build the attributed MAH Nightline derivative without modifying the source blend."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


SOURCE_CREATOR = "Arifido._"
SOURCE_URL = (
    "https://sketchfab.com/3d-models/"
    "low-poly-nissan-skyline-gt-r-r34-8ecbe8e4e432439fa7159d2e61f6bc9b"
)
LICENSE_NAME = "CC BY 4.0"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
ADAPTATION_DIRECTOR = "MD Anik Hasan"
ASSET_ID = "VEH_MAH_Nightline_R34_Derivative"
RUNTIME_NAME = "MAH Nightline"
TARGET_LENGTH_METRES = 4.4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blend-output", required=True)
    parser.add_argument("--model-output", required=True)
    parser.add_argument("--review-output", required=True)
    parser.add_argument("--manifest-output", required=True)
    args = []
    if "--" in __import__("sys").argv:
        args = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    return parser.parse_args(args)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def select_only(objects: list[bpy.types.Object], active: bpy.types.Object | None = None) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active or (objects[0] if objects else None)


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for current in tuple(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def object_world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def mesh_triangles(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def scene_triangles(objects: list[bpy.types.Object]) -> int:
    return sum(mesh_triangles(obj) for obj in objects if obj.type == "MESH")


def make_material(
    name: str,
    base_color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.45,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = base_color
    nodes = material.node_tree.nodes
    principled = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    principled.inputs["Base Color"].default_value = base_color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission and "Emission Color" in principled.inputs:
        principled.inputs["Emission Color"].default_value = emission
        principled.inputs["Emission Strength"].default_value = emission_strength
    return material


def create_materials() -> dict[str, bpy.types.Material]:
    return {
        "body": make_material(
            "MAH_Paint_MidnightBlue",
            (0.012, 0.045, 0.095, 1.0),
            metallic=0.82,
            roughness=0.2,
        ),
        "glass": make_material(
            "MAH_Glass_Smoke",
            (0.008, 0.018, 0.028, 1.0),
            metallic=0.08,
            roughness=0.12,
        ),
        "trim": make_material(
            "MAH_Trim_Graphite",
            (0.018, 0.022, 0.028, 1.0),
            metallic=0.3,
            roughness=0.34,
        ),
        "tyre": make_material(
            "MAH_Tyre",
            (0.006, 0.007, 0.009, 1.0),
            roughness=0.8,
        ),
        "rim": make_material(
            "MAH_Rim_Gunmetal",
            (0.12, 0.14, 0.17, 1.0),
            metallic=0.9,
            roughness=0.25,
        ),
        "headlight": make_material(
            "MAH_Light_Headlamp",
            (0.18, 0.46, 0.72, 1.0),
            roughness=0.16,
            emission=(0.32, 0.68, 1.0, 1.0),
            emission_strength=2.4,
        ),
        "brake_off": make_material(
            "MAH_Light_Brake_Off",
            (0.18, 0.008, 0.01, 1.0),
            metallic=0.05,
            roughness=0.2,
            emission=(0.2, 0.003, 0.004, 1.0),
            emission_strength=0.4,
        ),
        "brake_on": make_material(
            "MAH_Light_Brake_On",
            (0.65, 0.008, 0.012, 1.0),
            roughness=0.18,
            emission=(1.0, 0.015, 0.02, 1.0),
            emission_strength=8.0,
        ),
        "reverse": make_material(
            "MAH_Light_Reverse",
            (0.65, 0.72, 0.82, 1.0),
            roughness=0.18,
            emission=(0.75, 0.86, 1.0, 1.0),
            emission_strength=3.5,
        ),
        "badge": make_material(
            "MAH_Badge",
            (0.52, 0.56, 0.62, 1.0),
            metallic=0.96,
            roughness=0.18,
        ),
        "plate": make_material(
            "MAH_Plate",
            (0.02, 0.025, 0.03, 1.0),
            metallic=0.12,
            roughness=0.46,
        ),
    }


def apply_source_modifiers(source_body: bpy.types.Object) -> None:
    select_only([source_body], source_body)
    for modifier in tuple(source_body.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def separate_source_parts(source_body: bpy.types.Object) -> list[bpy.types.Object]:
    select_only([source_body], source_body)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]


def is_wheel_part(obj: bpy.types.Object) -> bool:
    minimum, maximum = object_world_bounds(obj)
    dimensions = maximum - minimum
    centre = (minimum + maximum) * 0.5
    return (
        0.18 <= dimensions.x <= 0.42
        and 0.45 <= dimensions.y <= 0.68
        and 0.45 <= dimensions.z <= 0.68
        and abs(centre.x) > 0.35
        and centre.z < 0.2
    )


def join_objects(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    active = max(objects, key=mesh_triangles)
    select_only(objects, active)
    bpy.ops.object.join()
    active.name = name
    active.data.name = f"{name}_Mesh"
    return active


def normalise_geometry(objects: list[bpy.types.Object]) -> tuple[float, list[float]]:
    bounds = [object_world_bounds(obj) for obj in objects]
    global_min = Vector(tuple(min(bound[0][axis] for bound in bounds) for axis in range(3)))
    global_max = Vector(tuple(max(bound[1][axis] for bound in bounds) for axis in range(3)))
    source_length = global_max.y - global_min.y
    scale = TARGET_LENGTH_METRES / source_length
    centre = Vector(
        (
            (global_min.x + global_max.x) * 0.5,
            (global_min.y + global_max.y) * 0.5,
            global_min.z,
        )
    )
    for obj in objects:
        world_matrix = obj.matrix_world.copy()
        transformed = [(world_matrix @ vertex.co - centre) * scale for vertex in obj.data.vertices]
        obj.matrix_world = Matrix.Identity(4)
        for vertex, coordinate in zip(obj.data.vertices, transformed, strict=True):
            vertex.co = coordinate
        obj.data.update()
    dimensions = [
        round((global_max.x - global_min.x) * scale, 4),
        round((global_max.y - global_min.y) * scale, 4),
        round((global_max.z - global_min.z) * scale, 4),
    ]
    return scale, dimensions


def centre_wheel_origin(obj: bpy.types.Object) -> None:
    points = [vertex.co.copy() for vertex in obj.data.vertices]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    centre = (minimum + maximum) * 0.5
    for vertex in obj.data.vertices:
        vertex.co -= centre
    obj.location = centre
    obj.data.update()


def wheel_name(obj: bpy.types.Object) -> str:
    front_rear = "F" if obj.location.y < 0 else "R"
    left_right = "L" if obj.location.x < 0 else "R"
    return f"VEH_Wheel_{front_rear}{left_right}_LOD0"


def replace_materials(
    body: bpy.types.Object,
    wheels: list[bpy.types.Object],
    materials: dict[str, bpy.types.Material],
) -> None:
    body_mapping = {
        "Material": "body",
        "Material.001": "glass",
        "Material.002": "brake_off",
        "Material.003": "brake_off",
        "Material.004": "trim",
        "Material.005": "trim",
        "Material.006": "headlight",
        "Material.007": "trim",
        "Material.008": "headlight",
        "Material.009": "trim",
        "Material.010": "rim",
        "Material.011": "trim",
        "Material.012": "rim",
        "Material.014": "trim",
        "Material.015": "trim",
    }
    for slot in body.material_slots:
        original_name = slot.material.name if slot.material else ""
        slot.material = materials[body_mapping.get(original_name, "trim")]
    for wheel in wheels:
        for slot in wheel.material_slots:
            original_name = slot.material.name if slot.material else ""
            slot.material = materials["rim" if original_name == "Material.012" else "tyre"]


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    move_to_collection(obj, collection)
    return obj


def add_disc(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=radius,
        depth=depth,
        location=location,
        rotation=(math.radians(90), 0.0, 0.0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    move_to_collection(obj, collection)
    return obj


PIXEL_FONT = {
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "H": ("10001", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "K": ("10001", "10010", "10100", "11000", "10100", "10010", "10001"),
    "M": ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    " ": ("000", "000", "000", "000", "000", "000", "000"),
}


def add_pixel_badge(
    name: str,
    text: str,
    location: tuple[float, float, float],
    height: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    *,
    faces_positive_y: bool,
) -> bpy.types.Object:
    patterns = [PIXEL_FONT[character] for character in text]
    total_columns = sum(len(pattern[0]) for pattern in patterns) + max(0, len(patterns) - 1)
    pixel = height / 7.0
    total_width = total_columns * pixel
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    cursor = -total_width * 0.5
    for pattern in patterns:
        width = len(pattern[0])
        for row, values in enumerate(pattern):
            for column, value in enumerate(values):
                if value != "1":
                    continue
                x0 = location[0] + cursor + column * pixel
                x1 = x0 + pixel * 0.82
                z1 = location[2] + height * 0.5 - row * pixel
                z0 = z1 - pixel * 0.82
                y = location[1]
                start = len(vertices)
                vertices.extend(((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)))
                face = (start, start + 1, start + 2, start + 3)
                faces.append(face if faces_positive_y else tuple(reversed(face)))
        cursor += (width + 1) * pixel
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj["badge_text"] = text
    obj["project_identity"] = True
    return obj


def add_light_meshes(
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> list[bpy.types.Object]:
    objects = []
    for side in (-1, 1):
        objects.append(
            add_box(
                f"VEH_Headlamp_{'L' if side < 0 else 'R'}",
                (side * 0.58, -2.05, 0.49),
                (0.32, 0.015, 0.055),
                materials["headlight"],
                collection,
            )
        )
        for index, centre_x in enumerate((side * 0.36, side * 0.59), start=1):
            brake = add_disc(
                f"VEH_BrakeLamp_{'L' if side < 0 else 'R'}_{index}",
                (centre_x, 2.12, 0.75),
                0.105,
                0.012,
                materials["brake_off"],
                collection,
            )
            brake["state_off_material"] = "MAH_Light_Brake_Off"
            brake["state_on_material"] = "MAH_Light_Brake_On"
            objects.append(brake)
        reverse = add_box(
            f"VEH_ReverseLamp_{'L' if side < 0 else 'R'}",
            (side * 0.2, 2.122, 0.56),
            (0.1, 0.012, 0.05),
            materials["reverse"],
            collection,
        )
        reverse["state"] = "reverse"
        objects.append(reverse)
    return objects


def add_brand_identity(
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> list[bpy.types.Object]:
    front_cover = add_box(
        "VEH_BrandCover_Front",
        (0.0, -2.19, 0.47),
        (0.52, 0.035, 0.15),
        materials["plate"],
        collection,
    )
    rear_cover = add_box(
        "VEH_BrandCover_Rear",
        (0.0, 2.19, 0.47),
        (0.62, 0.035, 0.16),
        materials["plate"],
        collection,
    )
    front_badge = add_pixel_badge(
        "VEH_MAH_Emblem",
        "MAH",
        (0.0, -2.214, 0.48),
        0.095,
        materials["badge"],
        collection,
        faces_positive_y=False,
    )
    rear_badge = add_pixel_badge(
        "VEH_MD_Anik_Hasan_Badge",
        "MD ANIK HASAN",
        (0.0, 2.214, 0.48),
        0.06,
        materials["badge"],
        collection,
        faces_positive_y=True,
    )
    return [front_cover, rear_cover, front_badge, rear_badge]


def add_empty(
    name: str,
    location: tuple[float, float, float],
    collection: bpy.types.Collection,
    **properties,
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    collection.objects.link(obj)
    for key, value in properties.items():
        obj[key] = value
    return obj


def add_colliders(
    collection: bpy.types.Collection, wheels: list[bpy.types.Object]
) -> list[bpy.types.Object]:
    colliders = [
        add_empty(
            "COLLIDER_Body",
            (0.0, 0.0, 0.7),
            collection,
            collider_shape="box",
            collider_size=[1.72, 4.18, 1.12],
        )
    ]
    for wheel in wheels:
        colliders.append(
            add_empty(
                f"COLLIDER_{wheel.name.removeprefix('VEH_')}",
                tuple(wheel.location),
                collection,
                collider_shape="cylinder",
                collider_radius=0.302,
                collider_width=0.31,
                collider_axis="X",
            )
        )
    return colliders


def create_root(
    name: str,
    collection: bpy.types.Collection,
    lod: int,
) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    root["asset_id"] = ASSET_ID
    root["runtime_identity"] = RUNTIME_NAME
    root["lod"] = lod
    root["original_creator"] = SOURCE_CREATOR
    root["source_url"] = SOURCE_URL
    root["original_license"] = LICENSE_NAME
    root["license_url"] = LICENSE_URL
    root["adaptation_director"] = ADAPTATION_DIRECTOR
    root["changes_made"] = (
        "Scale, origin, wheel pivots, materials, lights, colliders, LODs and "
        "MAH identity were created for Hinode; official branding was removed or covered."
    )
    root["forward_axis_blender"] = "-Y"
    root["runtime_up_axis"] = "+Y after glTF export"
    return root


def parent_objects(objects: list[bpy.types.Object], root: bpy.types.Object) -> None:
    for obj in objects:
        obj.parent = root


def duplicate_lod(
    source_objects: list[bpy.types.Object],
    collection: bpy.types.Collection,
    lod: int,
    ratio: float,
) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    root = create_root(f"{ASSET_ID}_LOD{lod}", collection, lod)
    duplicates = []
    for source in source_objects:
        duplicate = source.copy()
        if source.data:
            duplicate.data = source.data.copy()
        duplicate.name = source.name.replace("LOD0", f"LOD{lod}")
        collection.objects.link(duplicate)
        duplicate.parent = root
        duplicates.append(duplicate)
        if duplicate.type == "MESH" and mesh_triangles(duplicate) >= 48:
            select_only([duplicate], duplicate)
            modifier = duplicate.modifiers.new(f"LOD{lod}_Decimate", "DECIMATE")
            modifier.ratio = ratio
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    return root, duplicates


def add_review_scene(
    lod0_objects: list[bpy.types.Object],
    review_collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    ground = add_box(
        "REVIEW_Ground",
        (0.0, 0.0, -0.055),
        (18.0, 18.0, 0.1),
        make_material("REVIEW_Ground_Material", (0.008, 0.012, 0.02, 1.0), roughness=0.52),
        review_collection,
    )
    camera_data = bpy.data.cameras.new("REVIEW_Camera")
    camera = bpy.data.objects.new("REVIEW_Camera", camera_data)
    review_collection.objects.link(camera)
    bpy.context.scene.camera = camera
    lights = []
    for name, location, energy, size, color in [
        ("REVIEW_Key", (4.5, -4.5, 7.0), 1300.0, 5.0, (0.64, 0.78, 1.0)),
        ("REVIEW_Fill", (-4.0, -1.0, 3.8), 850.0, 4.0, (0.25, 0.48, 1.0)),
        ("REVIEW_Rim", (2.0, 5.0, 4.8), 1100.0, 3.5, (1.0, 0.18, 0.08)),
    ]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        review_collection.objects.link(light)
        point_at(light, Vector((0.0, 0.0, 0.65)))
        lights.append(light)
    for obj in lod0_objects:
        obj.hide_render = False
    return camera, [ground, *lights]


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_reviews(camera: bpy.types.Object, output_dir: Path) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.003, 0.006, 0.014)
    scene.view_settings.look = "Medium High Contrast"
    views = {
        "front-three-quarter": (5.4, -6.5, 3.0),
        "front": (0.0, -7.2, 2.1),
        "side": (7.2, 0.0, 2.1),
        "rear-three-quarter": (-5.4, 6.5, 2.8),
        "rear": (0.0, 7.2, 2.0),
        "wheel-pivots": (4.8, -3.0, 1.35),
    }
    rendered = []
    for name, location in views.items():
        camera.location = location
        point_at(camera, Vector((0.0, 0.0, 0.67)))
        output_path = output_dir / f"{name}.png"
        scene.render.filepath = str(output_path)
        bpy.ops.render.render(write_still=True)
        rendered.append(str(output_path))
    return rendered


def export_glb(
    filepath: Path,
    objects: list[bpy.types.Object],
) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    select_only(objects, objects[0])
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )


def embed_asset_metadata(path: Path, lod: int, triangle_count: int) -> None:
    data = path.read_bytes()
    magic, version, _ = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67 or version != 2:
        raise RuntimeError(f"Unexpected GLB header: {path}")
    offset = 12
    chunks: list[tuple[int, bytes]] = []
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunks.append((chunk_type, data[offset : offset + chunk_length]))
        offset += chunk_length
    if not chunks or chunks[0][0] != 0x4E4F534A:
        raise RuntimeError(f"Missing GLB JSON chunk: {path}")
    document = json.loads(chunks[0][1].decode("utf-8").rstrip(" \t\r\n\x00"))
    document.setdefault("asset", {})["extras"] = {
        "assetId": ASSET_ID,
        "runtimeIdentity": RUNTIME_NAME,
        "originalCreator": SOURCE_CREATOR,
        "sourceUrl": SOURCE_URL,
        "originalLicense": LICENSE_NAME,
        "licenseUrl": LICENSE_URL,
        "adaptationDirector": ADAPTATION_DIRECTOR,
        "changesMade": True,
        "changeSummary": (
            "Normalised scale and origin; separated wheel pivots; replaced materials; "
            "added lights, colliders, LODs and MAH identity; removed or covered official branding."
        ),
        "lod": lod,
        "triangleCount": triangle_count,
    }
    json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    rebuilt_chunks = [(0x4E4F534A, json_bytes), *chunks[1:]]
    total_length = 12 + sum(8 + len(chunk) for _, chunk in rebuilt_chunks)
    output = bytearray(struct.pack("<III", magic, version, total_length))
    for chunk_type, chunk in rebuilt_chunks:
        output.extend(struct.pack("<II", len(chunk), chunk_type))
        output.extend(chunk)
    path.write_bytes(bytes(output))


def main() -> None:
    args = parse_args()
    source_path = Path(bpy.data.filepath).resolve()
    blend_output = Path(args.blend_output).resolve()
    model_output = Path(args.model_output).resolve()
    review_output = Path(args.review_output).resolve()
    manifest_output = Path(args.manifest_output).resolve()
    if source_path == blend_output:
        raise RuntimeError("Derivative output must never overwrite the original source blend.")

    source_hash_before = sha256(source_path)
    source_body = bpy.data.objects.get("Cube")
    source_detail = bpy.data.objects.get("Circle")
    if not source_body or source_body.type != "MESH":
        raise RuntimeError("Expected source body mesh 'Cube' was not found.")

    for obj in list(bpy.context.scene.objects):
        if obj not in {source_body, source_detail}:
            bpy.data.objects.remove(obj, do_unlink=True)

    apply_source_modifiers(source_body)
    separated = separate_source_parts(source_body)
    wheels = [obj for obj in separated if is_wheel_part(obj)]
    if len(wheels) != 4:
        raise RuntimeError(f"Expected four wheel islands after mirror application; found {len(wheels)}.")
    body_parts = [obj for obj in separated if obj not in wheels]
    if source_detail and source_detail.name in bpy.data.objects:
        body_parts.append(source_detail)
    body = join_objects(body_parts, "VEH_Body_LOD0")

    scale, vehicle_dimensions = normalise_geometry([body, *wheels])
    for wheel in wheels:
        centre_wheel_origin(wheel)
        wheel.name = wheel_name(wheel)
        wheel.data.name = f"{wheel.name}_Mesh"
        wheel["pivot_ready"] = True
        wheel["steering"] = wheel.name.endswith("FL_LOD0") or wheel.name.endswith("FR_LOD0")
        wheel["driven"] = True

    materials = create_materials()
    replace_materials(body, wheels, materials)
    master_collection = bpy.context.scene.collection
    lod0_collection = bpy.data.collections.new("VEHICLE_LOD0")
    lod1_collection = bpy.data.collections.new("VEHICLE_LOD1")
    lod2_collection = bpy.data.collections.new("VEHICLE_LOD2")
    collider_collection = bpy.data.collections.new("VEHICLE_COLLIDERS")
    review_collection = bpy.data.collections.new("VEHICLE_REVIEW")
    for collection in (
        lod0_collection,
        lod1_collection,
        lod2_collection,
        collider_collection,
        review_collection,
    ):
        master_collection.children.link(collection)

    root0 = create_root(f"{ASSET_ID}_LOD0", lod0_collection, 0)
    for obj in [body, *wheels]:
        move_to_collection(obj, lod0_collection)
    lights = add_light_meshes(lod0_collection, materials)
    identity = add_brand_identity(lod0_collection, materials)
    lod0_meshes = [body, *wheels, *lights, *identity]
    parent_objects(lod0_meshes, root0)
    colliders = add_colliders(collider_collection, wheels)
    parent_objects(colliders, root0)

    root1, lod1_meshes = duplicate_lod(lod0_meshes, lod1_collection, 1, 0.62)
    root2, lod2_meshes = duplicate_lod(lod0_meshes, lod2_collection, 2, 0.3)
    lod1_collection.hide_render = True
    lod2_collection.hide_render = True
    collider_collection.hide_render = True

    source_geometry_triangles = scene_triangles([body, *wheels])
    lod_counts = {
        "LOD0": scene_triangles(lod0_meshes),
        "LOD1": scene_triangles(lod1_meshes),
        "LOD2": scene_triangles(lod2_meshes),
    }
    if source_geometry_triangles != 11200:
        raise RuntimeError(
            f"LOD0 source geometry changed unexpectedly: {source_geometry_triangles} triangles."
        )
    lod1_ratio = lod_counts["LOD1"] / lod_counts["LOD0"]
    lod2_ratio = lod_counts["LOD2"] / lod_counts["LOD0"]
    if not 0.55 <= lod1_ratio <= 0.70:
        raise RuntimeError(f"LOD1 ratio outside target: {lod1_ratio:.3f}")
    if not 0.25 <= lod2_ratio <= 0.35:
        raise RuntimeError(f"LOD2 ratio outside target: {lod2_ratio:.3f}")

    camera, _ = add_review_scene(lod0_meshes, review_collection, materials)
    blend_output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_output))
    rendered = render_reviews(camera, review_output)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_output))

    lod_paths = {
        "LOD0": model_output,
        "LOD1": model_output.with_name(f"{model_output.stem}-lod1{model_output.suffix}"),
        "LOD2": model_output.with_name(f"{model_output.stem}-lod2{model_output.suffix}"),
    }
    export_glb(lod_paths["LOD0"], [root0, *lod0_meshes, *colliders])
    export_glb(lod_paths["LOD1"], [root1, *lod1_meshes])
    export_glb(lod_paths["LOD2"], [root2, *lod2_meshes])
    for index, key in enumerate(("LOD0", "LOD1", "LOD2")):
        embed_asset_metadata(lod_paths[key], index, lod_counts[key])
    lod1_collection.hide_viewport = True
    lod2_collection.hide_viewport = True
    collider_collection.hide_viewport = True
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_output))

    source_hash_after = sha256(source_path)
    if source_hash_after != source_hash_before:
        raise RuntimeError("The original R34 source hash changed during derivative preparation.")

    manifest = {
        "schemaVersion": 1,
        "assetId": ASSET_ID,
        "runtimeIdentity": RUNTIME_NAME,
        "rights": {
            "originalCreator": SOURCE_CREATOR,
            "sourceUrl": SOURCE_URL,
            "originalLicense": LICENSE_NAME,
            "licenseUrl": LICENSE_URL,
            "adaptationDirector": ADAPTATION_DIRECTOR,
            "changesDisclosed": True,
        },
        "source": {
            "path": str(source_path),
            "sha256Before": source_hash_before,
            "sha256After": source_hash_after,
            "unchanged": source_hash_before == source_hash_after,
            "sourceGeometryTriangles": source_geometry_triangles,
        },
        "derivative": {
            "blendPath": str(blend_output),
            "scaleFactor": round(scale, 8),
            "dimensionsMetres": {
                "width": vehicle_dimensions[0],
                "length": vehicle_dimensions[1],
                "height": vehicle_dimensions[2],
            },
            "origin": "vehicle centre on X/Y with tyre ground contact at Z=0",
            "forwardAxisBlender": "-Y",
            "wheelPivots": {
                wheel.name: [round(value, 5) for value in wheel.location] for wheel in wheels
            },
            "lights": [
                "headlamp",
                "brake off/on material states",
                "reverse lamp state",
            ],
            "colliders": {
                "body": "box",
                "wheels": "four cylinder metadata nodes",
            },
            "brandIdentity": {
                "runtimeName": RUNTIME_NAME,
                "frontEmblem": "MAH",
                "rearBadge": "MD ANIK HASAN",
                "officialBranding": "removed or covered; no endorsement implied",
            },
        },
        "lods": {
            key: {
                "path": str(lod_paths[key]),
                "triangles": lod_counts[key],
                "ratioToLOD0": round(lod_counts[key] / lod_counts["LOD0"], 4),
                "sha256": sha256(lod_paths[key]),
                "bytes": lod_paths[key].stat().st_size,
            }
            for key in ("LOD0", "LOD1", "LOD2")
        },
        "reviewRenders": rendered,
    }
    manifest_output.parent.mkdir(parents=True, exist_ok=True)
    manifest_output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
