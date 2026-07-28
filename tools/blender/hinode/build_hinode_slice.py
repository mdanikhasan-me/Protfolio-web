"""Build the clean-room Hinode City vertical slice.

This script intentionally has no dependency on any previous game source. It creates fresh road
splines, modular buildings, props, a fictional coupe, Blender evidence renders, a baked static-light
atlas, and GLB exports from the written Hinode slice contract.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIR = REPO_ROOT / "art" / "blender" / "hinode"
MODEL_DIR = REPO_ROOT / "public" / "hinode" / "models"
TEXTURE_DIR = REPO_ROOT / "public" / "hinode" / "textures"
EVIDENCE_DIR = REPO_ROOT / "artifacts" / "hinode" / "blender"

SLICE_X = (-37.5, 37.5)
SLICE_Z = (-30.0, 30.0)
ALLEY_WIDTH = 3.2
SECONDARY_WIDTH = 6.6
FLYOVER_WIDTH = 7.0


def parse_args() -> argparse.Namespace:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=("roads", "buildings", "props", "car", "master"),
        default="master",
    )
    return parser.parse_args(args)


def ensure_directories() -> None:
    for directory in (SOURCE_DIR, MODEL_DIR, TEXTURE_DIR, EVIDENCE_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def clean_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    base = bpy.data.collections.get("Collection")
    if base:
        base.name = "HINODE_ROOT"
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def collection(name: str) -> bpy.types.Collection:
    existing = bpy.data.collections.get(name)
    if existing:
        return existing
    created = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(created)
    return created


def move_to_collection(obj: bpy.types.Object, target: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def runtime_to_blender(x: float, y: float, z: float) -> tuple[float, float, float]:
    """Convert Three.js [X, Y-up, Z-south] to Blender [X, Y-north, Z-up]."""

    return (x, -z, y)


def material(
    name: str,
    color: tuple[float, float, float],
    *,
    roughness: float = 0.72,
    metallic: float = 0.0,
    emission: tuple[float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    created = bpy.data.materials.new(name)
    created.use_nodes = True
    bsdf = created.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    if emission and emission_input:
        emission_input.default_value = (*emission, 1.0)
    if bsdf.inputs.get("Emission Strength"):
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return created


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new("Controlled_Bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def box(
    name: str,
    x: float,
    y: float,
    z: float,
    width: float,
    height: float,
    depth: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    bevel: float = 0.04,
    yaw: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(
        location=runtime_to_blender(x, y + height * 0.5, z),
        rotation=(0.0, 0.0, yaw),
    )
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (width, depth, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    apply_bevel(obj, bevel)
    move_to_collection(obj, target)
    return obj


def cylinder(
    name: str,
    x: float,
    y: float,
    z: float,
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    vertices: int = 12,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=runtime_to_blender(x, y, z),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    move_to_collection(obj, target)
    return obj


def bezier(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    count: int,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(count):
        t = index / max(1, count - 1)
        inverse = 1.0 - t
        x = (
            inverse**3 * p0[0]
            + 3 * inverse * inverse * t * p1[0]
            + 3 * inverse * t * t * p2[0]
            + t**3 * p3[0]
        )
        z = (
            inverse**3 * p0[1]
            + 3 * inverse * inverse * t * p1[1]
            + 3 * inverse * t * t * p2[1]
            + t**3 * p3[1]
        )
        points.append((x, z))
    return points


def merge_segments(*segments: list[tuple[float, float]]) -> list[tuple[float, float]]:
    merged: list[tuple[float, float]] = []
    for segment in segments:
        merged.extend(segment if not merged else segment[1:])
    return merged


def alley_path() -> list[tuple[float, float]]:
    return merge_segments(
        bezier((-25.0, 27.0), (-25.0, 21.0), (-25.0, 15.0), (-24.0, 10.0), 16),
        bezier((-24.0, 10.0), (-23.5, 5.0), (-19.5, 0.2), (-13.0, -0.5), 20),
        bezier((-13.0, -0.5), (-10.5, -0.7), (-8.0, -0.6), (-5.0, -0.5), 12),
    )


def secondary_path() -> list[tuple[float, float]]:
    return bezier((-8.0, -0.5), (4.0, 0.2), (21.0, -3.2), (38.0, -5.5), 46)


def flyover_path() -> list[tuple[float, float]]:
    return bezier((15.0, -31.0), (13.5, -15.0), (20.0, 12.0), (23.0, 31.0), 42)


def path_normal(path: list[tuple[float, float]], index: int) -> tuple[float, float]:
    before = path[max(0, index - 1)]
    after = path[min(len(path) - 1, index + 1)]
    dx = after[0] - before[0]
    dz = after[1] - before[1]
    length = math.hypot(dx, dz) or 1.0
    return (-dz / length, dx / length)


def road_mesh(
    name: str,
    path: list[tuple[float, float]],
    width: float,
    elevation: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    crown: float = 0.025,
    offset: float = 0.0,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    offsets = (-width * 0.5 + offset, offset, width * 0.5 + offset)
    for index, (x, z) in enumerate(path):
        nx, nz = path_normal(path, index)
        for lane_index, lateral in enumerate(offsets):
            height = elevation + (crown if lane_index == 1 else 0.0)
            vertices.append(runtime_to_blender(x + nx * lateral, height, z + nz * lateral))
    for index in range(len(path) - 1):
        base = index * 3
        following = (index + 1) * 3
        faces.append((base, following, following + 1, base + 1))
        faces.append((base + 1, following + 1, following + 2, base + 2))
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def edge_strip(
    name: str,
    path: list[tuple[float, float]],
    road_width: float,
    strip_width: float,
    side: int,
    elevation: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
) -> bpy.types.Object:
    lateral = side * (road_width * 0.5 + strip_width * 0.5)
    return road_mesh(
        name,
        path,
        strip_width,
        elevation,
        mat,
        target,
        crown=0.0,
        offset=lateral,
    )


def cable(
    name: str,
    runtime_points: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    thickness: float = 0.025,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name, "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = thickness
    curve_data.bevel_resolution = 1
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(runtime_points) - 1)
    for point, coords in zip(spline.bezier_points, runtime_points):
        point.co = runtime_to_blender(*coords)
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def setup_world() -> dict[str, bpy.types.Material]:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.012, 0.025, 0.075, 1.0)
    background.inputs["Strength"].default_value = 0.42
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    return {
        "ground": material("MAT_Ground_Navy", (0.035, 0.055, 0.09), roughness=0.92),
        "asphalt": material("MAT_Asphalt_Charcoal", (0.12, 0.145, 0.17), roughness=0.78),
        "asphalt_high": material("MAT_Asphalt_Flyover", (0.14, 0.16, 0.19), roughness=0.72),
        "concrete": material("MAT_Concrete_Muted", (0.38, 0.39, 0.39), roughness=0.88),
        "concrete_dark": material("MAT_Concrete_Dark", (0.16, 0.18, 0.21), roughness=0.88),
        "cream": material("MAT_Plaster_Cream", (0.58, 0.54, 0.43), roughness=0.82),
        "navy": material("MAT_Painted_Navy", (0.055, 0.13, 0.19), roughness=0.72),
        "brown": material("MAT_Wood_Brown", (0.27, 0.11, 0.05), roughness=0.8),
        "green": material("MAT_Muted_Green", (0.12, 0.24, 0.16), roughness=0.8),
        "red": material("MAT_Restrained_Red", (0.44, 0.045, 0.028), roughness=0.67),
        "metal": material("MAT_Dark_Metal", (0.11, 0.125, 0.14), roughness=0.38, metallic=0.72),
        "marking": material("MAT_Road_Marking", (0.82, 0.77, 0.56), roughness=0.75),
        "water": material("MAT_Canal_Water", (0.015, 0.11, 0.18), roughness=0.22, metallic=0.1),
        "warm": material(
            "MAT_Warm_Window",
            (0.44, 0.16, 0.04),
            roughness=0.5,
            emission=(1.0, 0.28, 0.055),
            emission_strength=3.5,
        ),
        "amber": material(
            "MAT_Amber_Lamp",
            (0.46, 0.12, 0.02),
            roughness=0.42,
            emission=(1.0, 0.16, 0.025),
            emission_strength=5.0,
        ),
        "cool": material(
            "MAT_Pale_Green_Sign",
            (0.12, 0.34, 0.26),
            roughness=0.5,
            emission=(0.16, 0.8, 0.54),
            emission_strength=1.8,
        ),
        "clearance": material(
            "MAT_Clearance_Proof",
            (0.03, 0.58, 0.36),
            roughness=0.55,
            emission=(0.02, 0.25, 0.12),
            emission_strength=1.0,
        ),
        "paint": material("MAT_Coupe_Auburn", (0.44, 0.035, 0.02), roughness=0.28, metallic=0.32),
        "rubber": material("MAT_Tyre", (0.012, 0.014, 0.016), roughness=0.92),
        "glass": material("MAT_Smoked_Glass", (0.012, 0.03, 0.045), roughness=0.18, metallic=0.18),
        "headlight": material(
            "MAT_Headlight",
            (0.75, 0.82, 0.72),
            roughness=0.3,
            emission=(0.75, 0.88, 1.0),
            emission_strength=4.0,
        ),
        "brake": material(
            "MAT_Brake_Light",
            (0.48, 0.005, 0.002),
            roughness=0.35,
            emission=(1.0, 0.005, 0.002),
            emission_strength=3.0,
        ),
    }


def build_roads(materials: dict[str, bpy.types.Material]) -> dict[str, object]:
    roads = collection("ENV_ROADS")
    structures = collection("ENV_STRUCTURES")
    debug = collection("DEBUG_CLEARANCE")

    box(
        "ENV_Ground",
        0.0,
        -0.45,
        0.0,
        75.0,
        0.4,
        60.0,
        materials["ground"],
        structures,
        bevel=0.0,
    )
    alley = alley_path()
    secondary = secondary_path()
    flyover = flyover_path()
    road_mesh("ENV_Road_Alley_Main", alley, ALLEY_WIDTH, 0.0, materials["asphalt"], roads)
    road_mesh(
        "ENV_Road_Secondary_Main",
        secondary,
        SECONDARY_WIDTH,
        0.005,
        materials["asphalt"],
        roads,
        crown=0.035,
    )
    road_mesh(
        "ENV_Flyover_Deck",
        flyover,
        FLYOVER_WIDTH,
        7.0,
        materials["asphalt_high"],
        structures,
        crown=0.035,
    )
    edge_strip(
        "ENV_Alley_Drain_Left",
        alley,
        ALLEY_WIDTH,
        0.32,
        -1,
        0.012,
        materials["concrete_dark"],
        roads,
    )
    edge_strip(
        "ENV_Alley_Drain_Right",
        alley,
        ALLEY_WIDTH,
        0.32,
        1,
        0.012,
        materials["concrete_dark"],
        roads,
    )
    for side, suffix in ((-1, "North"), (1, "South")):
        edge_strip(
            f"ENV_Secondary_Shoulder_{suffix}",
            secondary,
            SECONDARY_WIDTH,
            0.65,
            side,
            0.025,
            materials["concrete"],
            roads,
        )
        edge_strip(
            f"ENV_Flyover_Guard_{suffix}",
            flyover,
            FLYOVER_WIDTH,
            0.22,
            side,
            7.46,
            materials["metal"],
            structures,
        )
    road_mesh(
        "ENV_Secondary_Centre_Marking",
        secondary,
        0.10,
        0.052,
        materials["marking"],
        roads,
        crown=0.0,
    )
    road_mesh(
        "DEBUG_Alley_Clear_3_2m",
        alley,
        ALLEY_WIDTH,
        0.065,
        materials["clearance"],
        debug,
        crown=0.0,
    )
    road_mesh(
        "DEBUG_Secondary_Clear_6_6m",
        secondary,
        SECONDARY_WIDTH,
        0.07,
        materials["clearance"],
        debug,
        crown=0.0,
    )
    for obj in debug.objects:
        obj.hide_render = True
        obj.hide_viewport = True

    # T-junction transition patch and stop line.
    box(
        "ENV_T_Junction_Patch",
        -5.2,
        0.01,
        -0.5,
        7.6,
        0.08,
        7.2,
        materials["asphalt"],
        roads,
        bevel=0.0,
    )
    box(
        "ENV_T_Junction_Stop_Line",
        -7.2,
        0.07,
        -0.5,
        0.14,
        0.03,
        2.5,
        materials["marking"],
        roads,
        bevel=0.0,
    )

    # Flyover supports stay clear of the lower driving line.
    for index, z in enumerate((-18.0, 14.0), start=1):
        x = 15.0 + (z + 18.0) * 0.11
        for side in (-1, 1):
            box(
                f"ENV_Flyover_Support_{index}_{side:+d}",
                x + side * 2.3,
                0.0,
                z,
                0.75,
                6.85,
                0.75,
                materials["concrete"],
                structures,
                bevel=0.08,
            )
        box(
            f"ENV_Flyover_Crossbeam_{index}",
            x,
            6.2,
            z,
            6.0,
            0.65,
            0.9,
            materials["concrete"],
            structures,
            bevel=0.08,
        )

    # Short canal/drainage edge.
    box(
        "ENV_Canal_Water",
        22.0,
        -0.32,
        15.5,
        30.0,
        0.12,
        7.0,
        materials["water"],
        structures,
        bevel=0.0,
    )
    box(
        "ENV_Canal_Bank_North",
        22.0,
        -0.1,
        11.6,
        31.0,
        0.55,
        0.8,
        materials["concrete_dark"],
        structures,
    )
    box(
        "ENV_Canal_Bank_South",
        22.0,
        -0.1,
        19.3,
        31.0,
        0.55,
        0.8,
        materials["concrete_dark"],
        structures,
    )
    for x in range(7, 38, 3):
        box(
            f"PROP_Canal_Rail_Post_{x}",
            float(x),
            0.35,
            11.25,
            0.09,
            1.05,
            0.09,
            materials["metal"],
            structures,
            bevel=0.015,
        )
    box(
        "PROP_Canal_Rail_Top",
        22.0,
        1.18,
        11.25,
        31.0,
        0.08,
        0.08,
        materials["metal"],
        structures,
        bevel=0.015,
    )

    # Two restrained manhole covers.
    for index, (x, z) in enumerate(((-24.8, 17.0), (12.0, -1.7)), start=1):
        cylinder(
            f"PROP_Manhole_{index}",
            x,
            0.055,
            z,
            0.42,
            0.045,
            materials["metal"],
            roads,
            vertices=16,
        )

    return {"alley": alley, "secondary": secondary, "flyover": flyover}


def roof(
    name: str,
    x: float,
    y: float,
    z: float,
    width: float,
    depth: float,
    height: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
) -> bpy.types.Object:
    vertices = [
        (-width / 2, -depth / 2, 0),
        (width / 2, -depth / 2, 0),
        (width / 2, depth / 2, 0),
        (-width / 2, depth / 2, 0),
        (0, -depth / 2, height),
        (0, depth / 2, height),
    ]
    faces = [
        (0, 1, 4),
        (3, 5, 2),
        (0, 4, 5, 3),
        (1, 2, 5, 4),
        (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = runtime_to_blender(x, y, z)
    obj.data.materials.append(mat)
    target.objects.link(obj)
    return obj


def build_building(
    name: str,
    x: float,
    z: float,
    width: float,
    depth: float,
    height: float,
    base_mat: bpy.types.Material,
    accent_mat: bpy.types.Material,
    materials: dict[str, bpy.types.Material],
    target: bpy.types.Collection,
    variant: int,
) -> None:
    base_height = min(3.4, height * 0.48)
    box(
        f"{name}_Ground",
        x,
        0.0,
        z,
        width,
        base_height,
        depth,
        base_mat,
        target,
        bevel=0.10,
    )
    if height > base_height:
        upper_width = width * (0.92 if variant % 2 else 0.96)
        upper_depth = depth * (0.91 if variant % 3 else 0.96)
        box(
            f"{name}_Upper",
            x + (0.12 if variant % 2 else -0.1),
            base_height,
            z,
            upper_width,
            height - base_height,
            upper_depth,
            accent_mat,
            target,
            bevel=0.08,
        )
    roof(
        f"{name}_Roof",
        x,
        height,
        z,
        width * 1.04,
        depth * 1.04,
        0.75 + 0.12 * (variant % 3),
        materials["navy"] if variant % 2 else materials["concrete_dark"],
        target,
    )

    # Layered street-facing frontage, using original fictional graphic panels.
    front_z = z - depth * 0.5 - 0.045
    box(
        f"{name}_Shopfront",
        x,
        0.45,
        front_z,
        width * 0.72,
        1.75,
        0.08,
        materials["brown"],
        target,
        bevel=0.025,
    )
    box(
        f"{name}_Awning",
        x,
        2.25,
        front_z - 0.35,
        width * 0.64,
        0.14,
        0.72,
        accent_mat,
        target,
        bevel=0.03,
    )
    window_count = 2 if width < 8.0 else 3
    for column in range(window_count):
        window_x = x + (column - (window_count - 1) / 2) * (width * 0.65 / window_count)
        box(
            f"{name}_Window_{column + 1}",
            window_x,
            min(height - 1.2, 4.4),
            front_z - 0.055,
            max(0.8, width * 0.42 / window_count),
            1.1,
            0.06,
            materials["warm"],
            target,
            bevel=0.02,
        )
    box(
        f"{name}_Sign",
        x - width * 0.34,
        2.65,
        front_z - 0.13,
        0.58,
        1.45,
        0.10,
        materials["amber"] if variant % 2 else materials["cool"],
        target,
        bevel=0.035,
    )
    box(
        f"{name}_ACUnit",
        x + width * 0.32,
        min(height - 1.0, 4.9),
        front_z - 0.18,
        0.72,
        0.52,
        0.32,
        materials["concrete"],
        target,
        bevel=0.035,
    )

    # The alley modules expose their layered shopfronts toward the driveable corridor, not only
    # toward the module's local front. This keeps the road view inhabited while preserving clearance.
    if variant <= 4:
        road_side = 1 if x < -24.0 else -1
        side_x = x + road_side * (width * 0.5 + 0.045)
        box(
            f"{name}_AlleySidefront",
            side_x,
            0.4,
            z,
            0.08,
            1.85,
            depth * 0.72,
            materials["brown"],
            target,
            bevel=0.02,
        )
        box(
            f"{name}_AlleyAwning",
            side_x + road_side * 0.25,
            2.3,
            z,
            0.72,
            0.14,
            depth * 0.62,
            accent_mat,
            target,
            bevel=0.03,
        )
        for row, window_z in enumerate((z - depth * 0.22, z + depth * 0.22), start=1):
            box(
                f"{name}_AlleyWindow_{row}",
                side_x + road_side * 0.055,
                min(height - 1.25, 4.25),
                window_z,
                0.06,
                1.08,
                max(0.72, depth * 0.23),
                materials["warm"],
                target,
                bevel=0.02,
            )
        box(
            f"{name}_AlleySign",
            side_x + road_side * 0.12,
            2.65,
            z - depth * 0.3,
            0.10,
            1.42,
            0.56,
            materials["amber"] if variant % 2 else materials["cool"],
            target,
            bevel=0.025,
        )
        for curtain_index in (-1, 0, 1):
            box(
                f"{name}_Curtain_{curtain_index:+d}",
                side_x + road_side * 0.28,
                1.52,
                z + curtain_index * depth * 0.16,
                0.035,
                0.72,
                depth * 0.12,
                materials["red"],
                target,
                bevel=0.015,
            )


def build_buildings(materials: dict[str, bpy.types.Material]) -> None:
    target = collection("BLD_MODULAR")
    placements = [
        ("BLD_AlleyShop_01", -31.0, 19.0, 8.0, 9.0, 7.4, "cream", "red"),
        ("BLD_MixedUse_02", -18.8, 19.0, 8.4, 9.2, 9.2, "concrete", "navy"),
        ("BLD_AlleyShop_03", -30.0, 6.0, 7.0, 7.4, 6.8, "brown", "cream"),
        ("BLD_Apartment_04", -17.0, 7.8, 7.4, 7.4, 10.8, "concrete_dark", "green"),
        ("BLD_MixedUse_05", 2.0, -8.0, 10.0, 6.8, 8.6, "cream", "navy"),
        ("BLD_SecondaryShop_06", 7.0, 6.4, 9.0, 6.0, 7.4, "brown", "red"),
        ("BLD_Apartment_07", 26.0, -12.2, 10.0, 7.0, 11.4, "concrete", "green"),
        ("BLD_CanalShop_08", 28.0, 6.4, 9.0, 5.6, 7.8, "navy", "cream"),
    ]
    for index, (name, x, z, width, depth, height, base, accent) in enumerate(placements, start=1):
        build_building(
            name,
            x,
            z,
            width,
            depth,
            height,
            materials[base],
            materials[accent],
            materials,
            target,
            index,
        )


def build_props(materials: dict[str, bpy.types.Material]) -> None:
    props = collection("PROP_STREET")
    cables = collection("PROP_CABLES")

    # Fictional vending-shaped street furniture, no copied panel art.
    for index, (x, z, accent) in enumerate(
        ((-28.4, 12.0, "cool"), (-10.0, 3.2, "amber")), start=1
    ):
        box(
            f"PROP_Vending_{index}",
            x,
            0.0,
            z,
            0.78,
            1.82,
            0.62,
            materials["concrete"],
            props,
            bevel=0.07,
        )
        box(
            f"PROP_Vending_Panel_{index}",
            x,
            0.38,
            z - 0.34,
            0.58,
            1.02,
            0.05,
            materials[accent],
            props,
            bevel=0.025,
        )

    # Deliberate clusters of plants, crates, boards, scooters, and bicycles outside clearance.
    for index, (x, z) in enumerate(((-21.4, 18.0), (-27.8, 4.0), (-12.0, 4.0), (10.0, 5.1))):
        cylinder(
            f"PROP_Planter_{index + 1}",
            x,
            0.24,
            z,
            0.24,
            0.45,
            materials["brown"],
            props,
            vertices=10,
        )
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1,
            radius=0.43,
            location=runtime_to_blender(x, 0.78, z),
        )
        foliage = bpy.context.object
        foliage.name = f"PROP_Plant_{index + 1}"
        foliage.scale.z = 1.3
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        foliage.data.materials.append(materials["green"])
        move_to_collection(foliage, props)

    for index, (x, z) in enumerate(((-28.6, 15.0), (-19.4, 13.0), (5.8, -5.4))):
        box(
            f"PROP_MenuBoard_{index + 1}",
            x,
            0.0,
            z,
            0.58,
            0.88,
            0.12,
            materials["brown"],
            props,
            bevel=0.03,
        )
        box(
            f"PROP_MenuPanel_{index + 1}",
            x,
            0.2,
            z - 0.07,
            0.43,
            0.52,
            0.035,
            materials["cream"],
            props,
            bevel=0.015,
        )

    # Low-poly parked scooter silhouettes outside the road envelope.
    for index, (x, z, yaw) in enumerate(((-21.1, 10.8, 0.1), (11.0, 4.8, 1.4)), start=1):
        body = box(
            f"PROP_Scooter_Body_{index}",
            x,
            0.28,
            z,
            0.38,
            0.38,
            1.15,
            materials["red"] if index == 1 else materials["navy"],
            props,
            bevel=0.10,
            yaw=yaw,
        )
        body.rotation_euler.z = yaw
        for wheel_z in (-0.42, 0.42):
            cylinder(
                f"PROP_Scooter_Wheel_{index}_{wheel_z:+.2f}",
                x,
                0.3,
                z + wheel_z,
                0.20,
                0.09,
                materials["rubber"],
                props,
                vertices=12,
                rotation=(0.0, math.pi / 2, 0.0),
            )

    # Utility poles and sagging cables create density above the clear driving envelope.
    pole_positions = [(-29.0, 23.0), (-29.0, 9.0), (-18.8, 2.4), (0.0, 4.4), (19.0, 2.5)]
    for index, (x, z) in enumerate(pole_positions, start=1):
        cylinder(
            f"PROP_UtilityPole_{index}",
            x,
            3.1,
            z,
            0.12,
            6.2,
            materials["metal"],
            props,
            vertices=10,
        )
        box(
            f"PROP_UtilityCrossbar_{index}",
            x,
            5.4,
            z,
            1.25,
            0.10,
            0.12,
            materials["metal"],
            props,
            bevel=0.02,
        )
    cable(
        "PROP_Cable_Alley_A",
        [(-29.0, 5.4, 23.0), (-27.0, 4.9, 16.0), (-29.0, 5.4, 9.0)],
        materials["metal"],
        cables,
    )
    cable(
        "PROP_Cable_Alley_B",
        [(-29.0, 5.55, 9.0), (-24.0, 4.8, 4.0), (-18.8, 5.5, 2.4)],
        materials["metal"],
        cables,
    )
    cable(
        "PROP_Cable_Secondary",
        [(-18.8, 5.5, 2.4), (-9.0, 4.6, 2.8), (0.0, 5.4, 4.4)],
        materials["metal"],
        cables,
    )
    cable(
        "PROP_Cable_Secondary_02",
        [(0.0, 5.4, 4.4), (9.5, 4.5, 3.6), (19.0, 5.4, 2.5)],
        materials["metal"],
        cables,
    )

    # Warm paper-lantern forms, kept sparse.
    for index, (x, z) in enumerate(((-28.8, 15.0), (-20.8, 6.0), (-9.0, 3.0), (5.0, 4.0))):
        cylinder(
            f"PROP_Lantern_{index + 1}",
            x,
            2.55,
            z,
            0.22,
            0.46,
            materials["amber"],
            props,
            vertices=12,
        )


def build_car(materials: dict[str, bpy.types.Material], *, at_spawn: bool) -> bpy.types.Object:
    car_collection = collection("VEHICLE_HINODE_COUPÉ")
    root = bpy.data.objects.new("VEHICLE_ROOT", None)
    car_collection.objects.link(root)

    def car_box(
        name: str,
        x: float,
        z_up: float,
        forward: float,
        width: float,
        height: float,
        length: float,
        mat_key: str,
        bevel: float,
    ) -> bpy.types.Object:
        obj = box(
            name,
            x,
            z_up - height * 0.5,
            -forward,
            width,
            height,
            length,
            materials[mat_key],
            car_collection,
            bevel=bevel,
        )
        obj.parent = root
        return obj

    car_box("CAR_Chassis", 0.0, 0.72, 0.0, 1.72, 0.46, 4.18, "paint", 0.16)
    car_box("CAR_Hood", 0.0, 0.95, 1.35, 1.60, 0.20, 1.26, "paint", 0.12)
    car_box("CAR_Trunk", 0.0, 0.93, -1.52, 1.58, 0.25, 0.82, "paint", 0.10)
    car_box("CAR_Cabin", 0.0, 1.25, -0.15, 1.43, 0.72, 1.72, "glass", 0.18)
    car_box("CAR_Roof", 0.0, 1.62, -0.20, 1.30, 0.10, 1.25, "paint", 0.08)
    car_box("CAR_Front_Bumper", 0.0, 0.58, 2.10, 1.68, 0.22, 0.16, "paint", 0.05)
    car_box("CAR_Rear_Bumper", 0.0, 0.58, -2.10, 1.68, 0.22, 0.16, "paint", 0.05)
    car_box("CAR_Front_Grille", 0.0, 0.68, 2.195, 0.72, 0.16, 0.04, "metal", 0.015)

    wheel_specs = [
        ("WHEEL_FL", -0.88, 1.30),
        ("WHEEL_FR", 0.88, 1.30),
        ("WHEEL_RL", -0.88, -1.30),
        ("WHEEL_RR", 0.88, -1.30),
    ]
    for name, x, forward in wheel_specs:
        wheel = cylinder(
            name,
            x,
            0.46,
            -forward,
            0.34,
            0.22,
            materials["rubber"],
            car_collection,
            vertices=16,
            rotation=(0.0, math.pi / 2, 0.0),
        )
        bpy.context.view_layer.objects.active = wheel
        wheel.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        wheel.select_set(False)
        wheel.parent = root
        hub = cylinder(
            f"{name}_HUB",
            x,
            0.46,
            -forward,
            0.18,
            0.235,
            materials["metal"],
            car_collection,
            vertices=12,
            rotation=(0.0, math.pi / 2, 0.0),
        )
        hub.parent = wheel

    for side, x in (("L", -0.54), ("R", 0.54)):
        car_box(f"HEADLIGHT_{side}", x, 0.78, 2.20, 0.42, 0.18, 0.05, "headlight", 0.025)
        car_box(f"BRAKE_LIGHT_{side}", x, 0.78, -2.20, 0.42, 0.18, 0.05, "brake", 0.025)

    # Small original geometric badge, deliberately not a real marque.
    car_box("CAR_Badge_Hinode", 0.0, 0.83, 2.225, 0.16, 0.10, 0.025, "amber", 0.015)
    if at_spawn:
        root.location = runtime_to_blender(-25.0, 0.0, 23.0)
    return root


def add_light(
    name: str,
    light_type: str,
    x: float,
    y: float,
    z: float,
    color: tuple[float, float, float],
    energy: float,
    target: bpy.types.Collection,
    *,
    size: float = 4.0,
) -> bpy.types.Object:
    data = bpy.data.lights.new(name, light_type)
    data.color = color
    data.energy = energy
    if hasattr(data, "shape"):
        data.shape = "DISK"
    if hasattr(data, "size"):
        data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = runtime_to_blender(x, y, z)
    target.objects.link(obj)
    return obj


def build_lighting() -> None:
    lights = collection("LIGHTING_STATIC")
    moon = add_light(
        "LIGHT_Moon_Area",
        "AREA",
        -12.0,
        24.0,
        -8.0,
        (0.22, 0.34, 0.55),
        4200.0,
        lights,
        size=18.0,
    )
    direction = Vector(runtime_to_blender(-10.0, 0.0, 0.0)) - moon.location
    moon.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    for index, (x, z, energy) in enumerate(
        ((-27.0, 18.0, 620.0), (-20.0, 5.0, 720.0), (-8.0, 2.0, 580.0), (7.0, 2.5, 760.0)),
        start=1,
    ):
        add_light(
            f"LIGHT_Warm_Street_{index}",
            "POINT",
            x,
            3.1,
            z,
            (1.0, 0.28, 0.07),
            energy,
            target=lights,
            size=1.2,
        )
    fill = add_light(
        "LIGHT_Cool_Fill",
        "AREA",
        14.0,
        16.0,
        22.0,
        (0.18, 0.34, 0.62),
        2800.0,
        lights,
        size=28.0,
    )
    fill_direction = Vector(runtime_to_blender(2.0, 0.0, 0.0)) - fill.location
    fill.rotation_euler = fill_direction.to_track_quat("-Z", "Y").to_euler()


def camera_look(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    lens: float,
) -> bpy.types.Object:
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = 36.0
    camera = bpy.data.objects.new(name, data)
    camera.location = runtime_to_blender(*location)
    direction = Vector(runtime_to_blender(*target)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    collection("CAMERAS").objects.link(camera)
    return camera


def render_evidence() -> list[str]:
    scene = bpy.context.scene
    renders = [
        (
            "hinode-top-down.png",
            (0.0, 72.0, 2.0),
            (0.0, 0.0, 0.0),
            48.0,
            False,
        ),
        (
            "hinode-road-spline-clearance.png",
            (-10.0, 34.0, 35.0),
            (-8.0, 0.0, 3.0),
            47.0,
            True,
        ),
        (
            "hinode-alley-entrance.png",
            (-25.0, 2.1, 30.0),
            (-24.0, 1.2, 14.0),
            34.0,
            False,
        ),
        (
            "hinode-alley-curve.png",
            (-23.0, 24.0, 4.0),
            (-23.0, 0.0, 4.0),
            50.0,
            False,
        ),
        (
            "hinode-flyover-composition.png",
            (-9.0, 3.2, 1.0),
            (18.0, 5.2, -2.0),
            42.0,
            False,
        ),
        (
            "hinode-secondary-merge.png",
            (-12.5, 3.0, 1.0),
            (10.0, 1.1, -2.0),
            40.0,
            False,
        ),
    ]
    output_paths: list[str] = []
    debug = bpy.data.collections.get("DEBUG_CLEARANCE")
    for filename, location, target, lens, show_clearance in renders:
        if debug:
            for obj in debug.objects:
                obj.hide_render = not show_clearance
                obj.hide_viewport = not show_clearance
        camera = camera_look(f"CAM_{Path(filename).stem}", location, target, lens)
        if filename == "hinode-top-down.png":
            camera.data.type = "ORTHO"
            camera.data.ortho_scale = 82.0
        scene.camera = camera
        output = EVIDENCE_DIR / filename
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        output_paths.append(str(output.relative_to(REPO_ROOT)).replace("\\", "/"))
    if debug:
        for obj in debug.objects:
            obj.hide_render = True
            obj.hide_viewport = True
    return output_paths


def export_selection(path: Path, objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    bpy.ops.object.select_all(action="DESELECT")


def bake_static_environment(
    materials: dict[str, bpy.types.Material],
) -> tuple[bpy.types.Object, str]:
    excluded_collections = {"VEHICLE_HINODE_COUPÉ", "CAMERAS", "LIGHTING_STATIC", "DEBUG_CLEARANCE"}
    sources = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type in {"MESH", "CURVE"}
        and not any(owner.name in excluded_collections for owner in obj.users_collection)
        and not obj.name.startswith("WATER_")
    ]
    baked_collection = collection("EXPORT_BAKED")
    duplicates: list[bpy.types.Object] = []
    for source in sources:
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        baked_collection.objects.link(duplicate)
        duplicates.append(duplicate)
    for duplicate in list(duplicates):
        if duplicate.type == "CURVE":
            bpy.ops.object.select_all(action="DESELECT")
            duplicate.select_set(True)
            bpy.context.view_layer.objects.active = duplicate
            bpy.ops.object.convert(target="MESH")
    duplicates = [obj for obj in baked_collection.objects if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for duplicate in duplicates:
        duplicate.hide_viewport = False
        duplicate.hide_render = False
        duplicate.select_set(True)
    bpy.context.view_layer.objects.active = duplicates[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = "ENV_HinodeSlice_Baked"

    for source in sources:
        source.hide_render = True
        source.hide_viewport = True

    bpy.context.view_layer.objects.active = joined
    joined.select_set(True)
    if not joined.data.uv_layers:
        joined.data.uv_layers.new(name="UVMap")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.012)
    bpy.ops.object.mode_set(mode="OBJECT")

    image = bpy.data.images.new("Hinode_StaticLight_AO_Atlas", width=1024, height=1024)
    image.filepath_raw = str(TEXTURE_DIR / "hinode-static-light-ao.png")
    image.file_format = "PNG"
    image.colorspace_settings.name = "sRGB"
    for mat_slot in joined.material_slots:
        mat_slot.material.use_nodes = True
        nodes = mat_slot.material.node_tree.nodes
        bake_node = nodes.new("ShaderNodeTexImage")
        bake_node.name = "HINODE_BAKE_TARGET"
        bake_node.image = image
        nodes.active = bake_node

    scene = bpy.context.scene
    previous_engine = scene.render.engine
    scene.render.engine = "BLENDER_EEVEE"
    # Blender 5.2 supports baking through Cycles; use CPU for deterministic headless output.
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    scene.render.bake.margin = 6
    bpy.ops.object.bake(type="COMBINED", pass_filter={"COLOR", "DIRECT", "INDIRECT", "EMIT"})
    image.save()

    baked_material = material("MAT_Hinode_Static_Baked", (1.0, 1.0, 1.0), roughness=0.74)
    nodes = baked_material.node_tree.nodes
    links = baked_material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    joined.data.materials.clear()
    joined.data.materials.append(baked_material)
    for polygon in joined.data.polygons:
        polygon.material_index = 0
    scene.render.engine = previous_engine
    return joined, str(image.filepath_raw)


def triangle_count(objects: list[bpy.types.Object]) -> int:
    total = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total


def write_report(
    render_paths: list[str],
    baked_object: bpy.types.Object,
    atlas_path: str,
) -> None:
    environment_path = MODEL_DIR / "hinode-slice-environment.glb"
    car_path = MODEL_DIR / "hinode-fictional-coupe.glb"
    report = {
        "schemaVersion": 1,
        "generator": "tools/blender/hinode/build_hinode_slice.py",
        "blenderVersion": bpy.app.version_string,
        "boundaryMetres": {"x": list(SLICE_X), "z": list(SLICE_Z)},
        "roadContracts": {
            "alleyWidthMetres": ALLEY_WIDTH,
            "secondaryWidthMetres": SECONDARY_WIDTH,
            "flyoverWidthMetres": FLYOVER_WIDTH,
            "flyoverDeckMetres": 7.0,
            "alleySamples": len(alley_path()),
            "secondarySamples": len(secondary_path()),
        },
        "sourceFiles": [
            "art/blender/hinode/hinode_slice_master.blend",
            "art/blender/hinode/hinode_slice_roads.blend",
            "art/blender/hinode/hinode_slice_buildings.blend",
            "art/blender/hinode/hinode_slice_props.blend",
            "art/blender/hinode/hinode_slice_car.blend",
            "art/blender/hinode/hinode_slice_export.blend",
        ],
        "exports": {
            "environment": {
                "path": str(environment_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "bytes": environment_path.stat().st_size,
            },
            "vehicle": {
                "path": str(car_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "bytes": car_path.stat().st_size,
            },
            "bakedAtlas": {
                "path": str(Path(atlas_path).relative_to(REPO_ROOT)).replace("\\", "/"),
                "bytes": Path(atlas_path).stat().st_size,
                "size": [1024, 1024],
                "method": "Cycles combined static-light and ambient-occlusion atlas",
            },
        },
        "scene": {
            "objects": len(bpy.context.scene.objects),
            "materials": len(bpy.data.materials),
            "bakedTriangles": triangle_count([baked_object]),
            "buildingModules": 8,
            "dynamicRuntimeLightsPlanned": 3,
        },
        "renders": render_paths,
        "cleanRoom": True,
    }
    encoded = json.dumps(report, indent=2)
    (EVIDENCE_DIR / "hinode-blender-report.json").write_text(encoded, encoding="utf-8")
    (SOURCE_DIR / "hinode_slice_manifest.json").write_text(encoded, encoding="utf-8")


def save_mode(mode: str) -> None:
    ensure_directories()
    clean_scene()
    materials = setup_world()

    if mode == "roads":
        build_roads(materials)
        build_lighting()
        output = SOURCE_DIR / "hinode_slice_roads.blend"
    elif mode == "buildings":
        build_buildings(materials)
        build_lighting()
        output = SOURCE_DIR / "hinode_slice_buildings.blend"
    elif mode == "props":
        build_props(materials)
        build_lighting()
        output = SOURCE_DIR / "hinode_slice_props.blend"
    elif mode == "car":
        build_car(materials, at_spawn=False)
        build_lighting()
        output = SOURCE_DIR / "hinode_slice_car.blend"
    else:
        build_roads(materials)
        build_buildings(materials)
        build_props(materials)
        car_root = build_car(materials, at_spawn=True)
        build_lighting()
        master_path = SOURCE_DIR / "hinode_slice_master.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(master_path))
        render_paths = render_evidence()

        car_collection = bpy.data.collections["VEHICLE_HINODE_COUPÉ"]
        original_car_location = car_root.location.copy()
        car_root.location = (0.0, 0.0, 0.0)
        export_selection(MODEL_DIR / "hinode-fictional-coupe.glb", list(car_collection.all_objects))
        car_root.location = original_car_location

        baked_object, atlas_path = bake_static_environment(materials)
        export_selection(MODEL_DIR / "hinode-slice-environment.glb", [baked_object])
        export_path = SOURCE_DIR / "hinode_slice_export.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(export_path))
        write_report(render_paths, baked_object, atlas_path)
        print(f"Hinode master generated: {master_path}")
        print(f"Hinode export generated: {export_path}")
        return

    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print(f"Hinode source generated: {output}")


if __name__ == "__main__":
    save_mode(parse_args().mode)
