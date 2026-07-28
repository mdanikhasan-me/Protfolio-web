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
import time
from datetime import datetime, timezone
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
        choices=("roads", "buildings", "props", "car", "master", "review"),
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
        "brick": material("MAT_Aged_Brick", (0.29, 0.075, 0.045), roughness=0.9),
        "plaster": material("MAT_Warm_Plaster", (0.40, 0.35, 0.27), roughness=0.88),
        "bluegray": material("MAT_Blue_Gray", (0.11, 0.18, 0.23), roughness=0.82),
        "tile": material("MAT_Roof_Tile", (0.065, 0.085, 0.105), roughness=0.86),
        "paper": material("MAT_Paper_Warm", (0.72, 0.58, 0.36), roughness=0.82),
        "black": material("MAT_Matte_Black", (0.018, 0.022, 0.026), roughness=0.76),
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
            f"ENV_Alley_Curb_{suffix}",
            alley,
            ALLEY_WIDTH + 0.64,
            0.14,
            side,
            0.09,
            materials["concrete"],
            roads,
        )
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
        edge_strip(
            f"ENV_Flyover_Girder_{suffix}",
            flyover,
            FLYOVER_WIDTH + 0.36,
            0.34,
            side,
            6.56,
            materials["concrete_dark"],
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

    # Three authored pier frames give the flyover a believable structural rhythm.
    for index, path_index in enumerate((8, 23, 36), start=1):
        x, z = flyover[path_index]
        nx, nz = path_normal(flyover, path_index)
        for side in (-1, 1):
            box(
                f"ENV_Flyover_Support_{index}_{side:+d}",
                x + nx * side * 2.55,
                0.0,
                z + nz * side * 2.55,
                0.68,
                6.85,
                0.82,
                materials["concrete_dark"],
                structures,
                bevel=0.10,
            )
        box(
            f"ENV_Flyover_Crossbeam_{index}",
            x,
            6.2,
            z,
            6.4,
            0.65,
            0.9,
            materials["concrete"],
            structures,
            bevel=0.08,
            yaw=-math.atan2(nz, nx),
        )
        box(
            f"ENV_Flyover_PierCap_{index}",
            x,
            6.72,
            z,
            7.25,
            0.28,
            1.15,
            materials["metal"],
            structures,
            bevel=0.045,
            yaw=-math.atan2(nz, nx),
        )

    for index, path_index in enumerate((5, 14, 23, 32), start=1):
        x, z = flyover[path_index]
        box(
            f"ENV_Flyover_ExpansionJoint_{index}",
            x,
            7.055,
            z,
            FLYOVER_WIDTH - 0.32,
            0.025,
            0.10,
            materials["metal"],
            structures,
            bevel=0.0,
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
    facade: str,
) -> None:
    base_height = min(3.25, height * 0.44)
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
        bevel=0.08,
    )
    if height > base_height:
        upper_width = width * (0.91 if variant % 2 else 0.95)
        upper_depth = depth * (0.92 if variant % 3 else 0.96)
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
            bevel=0.06,
        )

    if variant % 3:
        roof(
            f"{name}_Roof",
            x,
            height,
            z,
            width * 1.08,
            depth * 1.08,
            0.62 + 0.12 * (variant % 3),
            materials["tile"],
            target,
        )
    else:
        for suffix, px, pz, pw, pd in (
            ("N", x, z - depth * 0.5, width, 0.16),
            ("S", x, z + depth * 0.5, width, 0.16),
            ("W", x - width * 0.5, z, 0.16, depth),
            ("E", x + width * 0.5, z, 0.16, depth),
        ):
            box(
                f"{name}_Parapet_{suffix}",
                px,
                height,
                pz,
                pw,
                0.42,
                pd,
                materials["tile"],
                target,
                bevel=0.025,
            )

    normals = {"x+": (1.0, 0.0), "x-": (-1.0, 0.0), "z+": (0.0, 1.0), "z-": (0.0, -1.0)}
    nx, nz = normals[facade]
    tx, tz = -nz, nx
    face_half = width * 0.5 if nx else depth * 0.5
    face_span = depth if nx else width

    def facade_box(
        suffix: str,
        along: float,
        base_y: float,
        span: float,
        feature_height: float,
        normal_depth: float,
        feature_mat: bpy.types.Material,
        *,
        projection: float = 0.0,
        bevel: float = 0.02,
    ) -> bpy.types.Object:
        center_x = x + nx * (face_half + projection) + tx * along
        center_z = z + nz * (face_half + projection) + tz * along
        feature_width = normal_depth if nx else span
        feature_depth = span if nx else normal_depth
        return box(
            f"{name}_{suffix}",
            center_x,
            base_y,
            center_z,
            feature_width,
            feature_height,
            feature_depth,
            feature_mat,
            target,
            bevel=bevel,
        )

    # Deep shopfront recess, framed glazing, shutters and an authored entrance.
    facade_box(
        "Shop_Recess",
        0.0,
        0.18,
        face_span * 0.78,
        1.78,
        0.10,
        materials["black"],
        projection=0.055,
    )
    for division in (-0.28, 0.0, 0.28):
        facade_box(
            f"Shop_Mullion_{division:+.2f}",
            division * face_span,
            0.22,
            0.055,
            1.70,
            0.07,
            materials["metal"],
            projection=0.12,
            bevel=0.008,
        )
    facade_box(
        "Shop_Warm_Glass",
        face_span * 0.13,
        0.34,
        face_span * 0.40,
        1.38,
        0.045,
        materials["warm"],
        projection=0.13,
        bevel=0.012,
    )
    facade_box(
        "Entrance_Door",
        -face_span * 0.25,
        0.20,
        face_span * 0.18,
        1.72,
        0.065,
        materials["brown"],
        projection=0.13,
        bevel=0.015,
    )
    facade_box(
        "Awning",
        0.0,
        2.08,
        face_span * 0.72,
        0.16,
        0.72,
        accent_mat,
        projection=0.34,
        bevel=0.025,
    )
    for stripe in (-0.25, 0.0, 0.25):
        facade_box(
            f"Awning_Stripe_{stripe:+.2f}",
            stripe * face_span,
            2.065,
            face_span * 0.055,
            0.18,
            0.74,
            materials["paper"],
            projection=0.35,
            bevel=0.008,
        )

    window_y = min(height - 1.65, 4.05)
    for window_index, along in enumerate((-face_span * 0.23, face_span * 0.23), start=1):
        facade_box(
            f"Window_Frame_{window_index}",
            along,
            window_y,
            face_span * 0.31,
            1.18,
            0.09,
            materials["metal"],
            projection=0.07,
        )
        facade_box(
            f"Window_Light_{window_index}",
            along,
            window_y + 0.08,
            face_span * 0.25,
            0.94,
            0.045,
            materials["warm"] if (variant + window_index) % 3 else materials["glass"],
            projection=0.13,
            bevel=0.01,
        )
        facade_box(
            f"Window_Crossbar_{window_index}",
            along,
            window_y + 0.52,
            face_span * 0.27,
            0.045,
            0.06,
            materials["metal"],
            projection=0.15,
            bevel=0.005,
        )

    # Sparse vertical signboards carry fictional geometric glyphs instead of copied branding.
    sign_along = -face_span * 0.38
    sign_material = materials["amber"] if variant % 2 else materials["cool"]
    facade_box(
        "Vertical_Sign",
        sign_along,
        2.55,
        0.58,
        1.72,
        0.13,
        sign_material,
        projection=0.24,
        bevel=0.025,
    )
    for glyph_index, glyph_y in enumerate((2.82, 3.24, 3.66), start=1):
        facade_box(
            f"Sign_Glyph_{glyph_index}",
            sign_along,
            glyph_y,
            0.31 if glyph_index != 2 else 0.19,
            0.08,
            0.035,
            materials["paper"],
            projection=0.33,
            bevel=0.006,
        )

    ac_along = face_span * 0.37
    facade_box(
        "AC_Unit",
        ac_along,
        min(height - 1.35, 4.75),
        0.78,
        0.58,
        0.32,
        materials["concrete"],
        projection=0.18,
        bevel=0.035,
    )
    facade_box(
        "AC_Grille",
        ac_along,
        min(height - 1.21, 4.89),
        0.48,
        0.28,
        0.035,
        materials["metal"],
        projection=0.36,
        bevel=0.01,
    )

    if variant % 2 == 0:
        facade_box(
            "Balcony_Slab",
            0.0,
            min(height - 2.6, 5.25),
            face_span * 0.70,
            0.13,
            0.72,
            materials["concrete_dark"],
            projection=0.35,
            bevel=0.025,
        )
        rail_y = min(height - 2.42, 5.43)
        facade_box(
            "Balcony_Rail_Top",
            0.0,
            rail_y + 0.74,
            face_span * 0.66,
            0.055,
            0.055,
            materials["metal"],
            projection=0.72,
            bevel=0.008,
        )
        for rail_index, rail_along in enumerate((-0.28, 0.0, 0.28), start=1):
            facade_box(
                f"Balcony_Rail_{rail_index}",
                rail_along * face_span,
                rail_y,
                0.055,
                0.78,
                0.055,
                materials["metal"],
                projection=0.72,
                bevel=0.008,
            )
    else:
        for curtain_index in (-1, 0, 1):
            facade_box(
                f"Noren_{curtain_index:+d}",
                curtain_index * face_span * 0.105,
                1.35,
                face_span * 0.18,
                0.64,
                0.035,
                materials["red"],
                projection=0.22,
                bevel=0.008,
            )

    # Street-wall utilities and rooftop silhouettes keep the modules inhabited.
    facade_box(
        "Rain_Pipe",
        face_span * 0.46,
        0.12,
        0.08,
        min(height - 0.3, 5.8),
        0.08,
        materials["metal"],
        projection=0.09,
        bevel=0.01,
    )
    cylinder(
        f"{name}_Roof_Tank",
        x + width * 0.22,
        height + 0.52,
        z + depth * 0.12,
        0.38,
        0.72,
        materials["bluegray"],
        target,
        vertices=12,
    )
    box(
        f"{name}_Roof_Vent",
        x - width * 0.23,
        height,
        z - depth * 0.16,
        0.42,
        0.55,
        0.42,
        materials["metal"],
        target,
        bevel=0.035,
    )
    box(
        f"{name}_Level_Trim",
        x,
        base_height - 0.12,
        z,
        width * 1.015,
        0.14,
        depth * 1.015,
        materials["concrete_dark"],
        target,
        bevel=0.02,
    )


def build_buildings(materials: dict[str, bpy.types.Material]) -> None:
    target = collection("BLD_MODULAR")
    placements = [
        ("BLD_AlleyShop_01", -30.0, 23.0, 5.6, 7.0, 7.6, "cream", "red", "x+"),
        ("BLD_MixedUse_02", -18.8, 22.8, 5.7, 7.2, 9.4, "plaster", "bluegray", "x-"),
        ("BLD_AlleyShop_03", -30.0, 15.2, 5.8, 7.2, 8.5, "brown", "green", "x+"),
        ("BLD_MixedUse_04", -18.6, 14.7, 5.9, 7.3, 7.4, "concrete_dark", "red", "x-"),
        ("BLD_CornerShop_05", -27.0, 7.1, 6.3, 6.1, 9.8, "plaster", "navy", "x+"),
        ("BLD_CurveHouse_06", -18.9, 8.7, 6.3, 6.3, 8.3, "brick", "bluegray", "z-"),
        ("BLD_JunctionShop_07", -11.5, 5.7, 6.7, 6.0, 10.5, "concrete", "green", "z-"),
        ("BLD_SecondaryShop_08", 4.0, -6.0, 9.0, 6.1, 8.4, "cream", "navy", "z+"),
    ]
    for index, (name, x, z, width, depth, height, base, accent, facade) in enumerate(
        placements, start=1
    ):
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
            facade,
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
        for button_index, button_x in enumerate((-0.18, 0.0, 0.18), start=1):
            box(
                f"PROP_Vending_Button_{index}_{button_index}",
                x + button_x,
                1.42,
                z - 0.372,
                0.10,
                0.10,
                0.025,
                materials["paper"],
                props,
                bevel=0.012,
            )
        box(
            f"PROP_Vending_Slot_{index}",
            x,
            0.22,
            z - 0.376,
            0.36,
            0.12,
            0.025,
            materials["black"],
            props,
            bevel=0.008,
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

    for cluster_index, (x, z, count) in enumerate(
        ((-28.5, 18.4, 3), (-19.1, 10.6, 2), (7.0, -5.8, 3)), start=1
    ):
        for crate_index in range(count):
            box(
                f"PROP_Crate_{cluster_index}_{crate_index + 1}",
                x + (crate_index % 2) * 0.48,
                (crate_index // 2) * 0.34,
                z + (crate_index % 2) * 0.10,
                0.44,
                0.34,
                0.42,
                materials["brown"],
                props,
                bevel=0.025,
            )
            box(
                f"PROP_Crate_Slat_{cluster_index}_{crate_index + 1}",
                x + (crate_index % 2) * 0.48,
                0.11 + (crate_index // 2) * 0.34,
                z - 0.22 + (crate_index % 2) * 0.10,
                0.34,
                0.055,
                0.035,
                materials["paper"],
                props,
                bevel=0.006,
            )

    # Two readable bicycle silhouettes, parked against walls beyond the clearance envelope.
    for bicycle_index, (x, z) in enumerate(((-28.0, 10.8), (6.3, 4.5)), start=1):
        for wheel_index, wheel_z in enumerate((z - 0.48, z + 0.48), start=1):
            cylinder(
                f"PROP_Bicycle_Wheel_{bicycle_index}_{wheel_index}",
                x,
                0.34,
                wheel_z,
                0.31,
                0.055,
                materials["metal"],
                props,
                vertices=16,
                rotation=(0.0, math.pi / 2, 0.0),
            )
        cable(
            f"PROP_Bicycle_Frame_{bicycle_index}",
            [
                (x, 0.35, z - 0.48),
                (x, 0.78, z),
                (x, 0.35, z + 0.48),
                (x, 0.42, z - 0.10),
                (x, 0.35, z - 0.48),
            ],
            materials["red"] if bicycle_index == 1 else materials["paper"],
            props,
            thickness=0.035,
        )
        cable(
            f"PROP_Bicycle_Handle_{bicycle_index}",
            [(x, 0.78, z), (x, 1.04, z + 0.38), (x, 1.03, z + 0.52)],
            materials["metal"],
            props,
            thickness=0.025,
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
    pole_positions = [(-29.0, 23.0), (-29.0, 9.0), (-16.8, 4.8), (0.0, 4.4), (19.0, 2.5)]
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
        [(-29.0, 5.55, 9.0), (-23.0, 4.8, 5.0), (-16.8, 5.5, 4.8)],
        materials["metal"],
        cables,
    )
    cable(
        "PROP_Cable_Secondary",
        [(-16.8, 5.5, 4.8), (-8.5, 4.6, 4.2), (0.0, 5.4, 4.4)],
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
    for index, (x, z) in enumerate(((-28.8, 15.0), (-17.2, 5.2), (-9.0, 4.8), (5.0, 4.0))):
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


def profiled_shell(
    name: str,
    sections: list[tuple[float, float, float, float]],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    bevel: float,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for forward, half_width, bottom, top in sections:
        vertices.extend(
            (
                runtime_to_blender(-half_width, bottom, -forward),
                runtime_to_blender(half_width, bottom, -forward),
                runtime_to_blender(half_width, top, -forward),
                runtime_to_blender(-half_width, top, -forward),
            )
        )
    for index in range(len(sections) - 1):
        first = index * 4
        following = (index + 1) * 4
        faces.extend(
            (
                (first, following, following + 1, first + 1),
                (first + 1, following + 1, following + 2, first + 2),
                (first + 2, following + 2, following + 3, first + 3),
                (first + 3, following + 3, following, first),
            )
        )
    faces.extend(((0, 1, 2, 3), tuple(range(len(vertices) - 4, len(vertices)))))
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    shell = bpy.data.objects.new(name, mesh)
    shell.data.materials.append(mat)
    target.objects.link(shell)
    apply_bevel(shell, bevel, segments=2)
    return shell


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

    lower_shell = profiled_shell(
        "CAR_Body_Shell",
        [
            (2.10, 0.67, 0.43, 0.69),
            (1.72, 0.82, 0.39, 0.90),
            (0.65, 0.87, 0.37, 1.00),
            (-0.75, 0.86, 0.38, 1.02),
            (-1.72, 0.79, 0.40, 0.87),
            (-2.10, 0.66, 0.46, 0.68),
        ],
        materials["paint"],
        car_collection,
        bevel=0.09,
    )
    lower_shell.parent = root
    cabin = profiled_shell(
        "CAR_Cabin_Glass",
        [
            (0.78, 0.58, 0.94, 1.23),
            (0.35, 0.66, 0.96, 1.55),
            (-0.58, 0.64, 0.98, 1.56),
            (-1.18, 0.54, 0.92, 1.18),
        ],
        materials["glass"],
        car_collection,
        bevel=0.055,
    )
    cabin.parent = root
    roof_shell = profiled_shell(
        "CAR_Roof_Panel",
        [
            (0.28, 0.61, 1.51, 1.59),
            (-0.55, 0.60, 1.52, 1.61),
            (-0.86, 0.55, 1.43, 1.51),
        ],
        materials["paint"],
        car_collection,
        bevel=0.035,
    )
    roof_shell.parent = root

    car_box("CAR_Hood_Inset", 0.0, 1.00, 1.36, 1.46, 0.055, 1.15, "paint", 0.035)
    car_box("CAR_Front_Lip", 0.0, 0.42, 2.04, 1.58, 0.12, 0.22, "black", 0.025)
    car_box("CAR_Rear_Bumper", 0.0, 0.47, -2.03, 1.55, 0.18, 0.20, "paint", 0.035)
    car_box("CAR_Front_Grille", 0.0, 0.60, 2.105, 0.78, 0.16, 0.045, "black", 0.012)
    car_box("CAR_Side_Skirt_L", -0.83, 0.43, 0.0, 0.08, 0.16, 2.65, "black", 0.018)
    car_box("CAR_Side_Skirt_R", 0.83, 0.43, 0.0, 0.08, 0.16, 2.65, "black", 0.018)
    for side, x in (("L", -0.87), ("R", 0.87)):
        car_box(f"CAR_Mirror_{side}", x, 1.22, 0.24, 0.22, 0.16, 0.30, "paint", 0.045)

    wheel_specs = [
        ("WHEEL_FL", -0.87, 1.34),
        ("WHEEL_FR", 0.87, 1.34),
        ("WHEEL_RL", -0.87, -1.36),
        ("WHEEL_RR", 0.87, -1.36),
    ]
    for name, x, forward in wheel_specs:
        wheel = cylinder(
            name,
            x,
            0.46,
            -forward,
            0.35,
            0.24,
            materials["rubber"],
            car_collection,
            vertices=20,
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
            0.21,
            0.255,
            materials["metal"],
            car_collection,
            vertices=10,
            rotation=(0.0, math.pi / 2, 0.0),
        )
        hub.parent = root
        brake_disc = cylinder(
            f"{name}_DISC",
            x,
            0.46,
            -forward,
            0.125,
            0.262,
            materials["red"],
            car_collection,
            vertices=12,
            rotation=(0.0, math.pi / 2, 0.0),
        )
        brake_disc.parent = root

    for side, x in (("L", -0.52), ("R", 0.52)):
        car_box(f"HEADLIGHT_{side}", x, 0.68, 2.13, 0.39, 0.16, 0.055, "headlight", 0.018)
        car_box(f"BRAKE_LIGHT_{side}", x, 0.70, -2.13, 0.38, 0.15, 0.055, "brake", 0.018)

    # Small original geometric badge, deliberately not a real marque.
    car_box("CAR_Badge_Hinode", 0.0, 0.76, 2.14, 0.15, 0.09, 0.025, "amber", 0.012)
    car_box("CAR_Spoiler_Wing", 0.0, 1.16, -1.92, 1.35, 0.08, 0.26, "paint", 0.025)
    for side, x in (("L", -0.47), ("R", 0.47)):
        car_box(
            f"CAR_Spoiler_Stand_{side}",
            x,
            0.88,
            -1.92,
            0.07,
            0.28,
            0.08,
            "metal",
            0.012,
        )
    exhaust = cylinder(
        "CAR_Exhaust",
        0.52,
        0.42,
        2.12,
        0.075,
        0.34,
        materials["metal"],
        car_collection,
        vertices=12,
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    exhaust.parent = root
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
        3200.0,
        lights,
        size=18.0,
    )
    direction = Vector(runtime_to_blender(-10.0, 0.0, 0.0)) - moon.location
    moon.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    for index, (x, z, energy) in enumerate(
        (
            (-24.0, 23.0, 520.0),
            (-24.0, 15.0, 580.0),
            (-21.0, 6.5, 640.0),
            (-12.0, 0.5, 560.0),
            (2.0, -1.2, 620.0),
            (16.0, -3.0, 540.0),
            (19.0, 8.5, 480.0),
        ),
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
        2200.0,
        lights,
        size=28.0,
    )
    fill_direction = Vector(runtime_to_blender(2.0, 0.0, 0.0)) - fill.location
    fill.rotation_euler = fill_direction.to_track_quat("-Z", "Y").to_euler()


def build_review_lighting() -> None:
    """Add temporary broad fill for readable evidence without saving it into source files."""

    lights = collection("LIGHTING_REVIEW_ONLY")
    for existing in list(lights.objects):
        bpy.data.objects.remove(existing, do_unlink=True)
    specifications = [
        (
            "LIGHT_Review_Key",
            (-24.0, 30.0, 28.0),
            (-8.0, 0.0, 2.0),
            (1.0, 0.78, 0.56),
            4200.0,
            30.0,
        ),
        (
            "LIGHT_Review_Fill",
            (30.0, 22.0, 18.0),
            (2.0, 0.0, 0.0),
            (0.48, 0.68, 1.0),
            3200.0,
            34.0,
        ),
        (
            "LIGHT_Review_Rim",
            (12.0, 18.0, -28.0),
            (4.0, 2.0, -2.0),
            (0.72, 0.82, 1.0),
            2200.0,
            26.0,
        ),
    ]
    for name, position, target, color, energy, size in specifications:
        light = add_light(
            name,
            "AREA",
            *position,
            color,
            energy,
            lights,
            size=size,
        )
        direction = Vector(runtime_to_blender(*target)) - light.location
        light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


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


def render_evidence(car_root: bpy.types.Object) -> list[dict[str, object]]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.use_file_extension = True
    scene.render.image_settings.color_depth = "8"
    scene.render.fps = 30
    scene.render.use_motion_blur = False
    scene.view_settings.exposure = 0.58
    try:
        scene.view_settings.look = "AgX - Medium Low Contrast"
    except TypeError:
        pass
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.006, 0.016, 0.045, 1.0)
        background.inputs["Strength"].default_value = 0.38
    build_review_lighting()

    renders = [
        {
            "filename": "hinode-top-down.png",
            "location": (0.0, 78.0, 0.0),
            "target": (0.0, 0.0, 0.0),
            "lens": 48.0,
            "clearance": False,
            "orthographic": 82.0,
            "vehicle": (-25.0, 23.0, 0.0),
        },
        {
            "filename": "hinode-road-spline-clearance.png",
            "location": (-8.0, 46.0, 44.0),
            "target": (-4.0, 0.0, 1.0),
            "lens": 48.0,
            "clearance": True,
            "vehicle": (-25.0, 23.0, 0.0),
        },
        {
            "filename": "hinode-alley-entrance.png",
            "location": (-25.0, 1.92, 31.0),
            "target": (-24.2, 1.0, 9.0),
            "lens": 40.0,
            "clearance": False,
            "vehicle": (-25.0, 23.0, 0.0),
        },
        {
            "filename": "hinode-alley-curve.png",
            "location": (-22.4, 1.75, 4.0),
            "target": (-12.8, 0.9, -0.6),
            "lens": 28.0,
            "clearance": False,
            "vehicle": (-16.0, 0.0, -1.15),
        },
        {
            "filename": "hinode-flyover-composition.png",
            "location": (-14.0, 1.78, 1.2),
            "target": (10.0, 4.4, -2.5),
            "lens": 36.0,
            "clearance": False,
            "vehicle": (-7.0, -0.5, -1.42),
        },
        {
            "filename": "hinode-secondary-merge.png",
            "location": (-16.0, 1.78, 1.6),
            "target": (12.0, 1.0, -2.5),
            "lens": 36.0,
            "clearance": False,
            "vehicle": (-5.8, -0.5, -1.42),
        },
        {
            "filename": "hinode-side-scale.png",
            "location": (45.0, 10.0, -4.0),
            "target": (8.0, 3.0, -1.0),
            "lens": 54.0,
            "clearance": False,
            "orthographic": 38.0,
            "vehicle": (8.0, -1.0, -1.42),
        },
        {
            "filename": "hinode-three-quarter-overview.png",
            "location": (-50.0, 52.0, 52.0),
            "target": (-5.0, 1.5, 1.0),
            "lens": 54.0,
            "clearance": False,
            "vehicle": (-25.0, 23.0, 0.0),
        },
    ]
    evidence: list[dict[str, object]] = []
    debug = bpy.data.collections.get("DEBUG_CLEARANCE")
    original_location = car_root.location.copy()
    original_rotation = car_root.rotation_euler.copy()
    for specification in renders:
        filename = str(specification["filename"])
        show_clearance = bool(specification["clearance"])
        if debug:
            for obj in debug.objects:
                obj.hide_render = not show_clearance
                obj.hide_viewport = not show_clearance
        vehicle_x, vehicle_z, vehicle_yaw = specification["vehicle"]
        car_root.location = runtime_to_blender(vehicle_x, 0.0, vehicle_z)
        car_root.rotation_euler[2] = vehicle_yaw
        camera = camera_look(
            f"CAM_{Path(filename).stem}",
            specification["location"],
            specification["target"],
            float(specification["lens"]),
        )
        if specification.get("orthographic"):
            camera.data.type = "ORTHO"
            camera.data.ortho_scale = float(specification["orthographic"])
        scene.camera = camera
        output = EVIDENCE_DIR / filename
        scene.render.filepath = str(output)
        started = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        duration = time.perf_counter() - started
        relative_path = str(output.relative_to(REPO_ROOT)).replace("\\", "/")
        evidence.append({"path": relative_path, "durationSeconds": round(duration, 3)})
        print(f"Review render: {relative_path} ({duration:.3f}s)")
    car_root.location = original_location
    car_root.rotation_euler = original_rotation
    if debug:
        for obj in debug.objects:
            obj.hide_render = True
            obj.hide_viewport = True
    return evidence


def save_review_report(render_evidence: list[dict[str, object]]) -> None:
    report_path = EVIDENCE_DIR / "hinode-blender-report.json"
    report = {}
    if report_path.exists():
        report = json.loads(report_path.read_text(encoding="utf-8"))
    report["renders"] = [item["path"] for item in render_evidence]
    report["renderEvidence"] = render_evidence
    report["lastReviewAt"] = datetime.now(timezone.utc).isoformat()
    report["reviewMode"] = {
        "engine": "BLENDER_EEVEE",
        "resolution": [1280, 720],
        "motionBlur": False,
        "depthOfField": False,
        "temporaryReadableLighting": True,
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def render_review_mode() -> None:
    ensure_directories()
    master_path = SOURCE_DIR / "hinode_slice_master.blend"
    if Path(bpy.data.filepath).resolve() != master_path.resolve():
        bpy.ops.wm.open_mainfile(filepath=str(master_path))
    car_root = bpy.data.objects.get("VEHICLE_ROOT")
    if not car_root:
        raise RuntimeError("Hinode master source is missing VEHICLE_ROOT")
    evidence = render_evidence(car_root)
    save_review_report(evidence)
    print(f"Hinode review evidence refreshed from: {master_path}")


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
    render_evidence: list[dict[str, object]],
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
        "renders": [item["path"] for item in render_evidence],
        "renderEvidence": render_evidence,
        "cleanRoom": True,
    }
    encoded = json.dumps(report, indent=2)
    (EVIDENCE_DIR / "hinode-blender-report.json").write_text(encoded, encoding="utf-8")
    (SOURCE_DIR / "hinode_slice_manifest.json").write_text(encoded, encoding="utf-8")


def save_mode(mode: str) -> None:
    ensure_directories()
    if mode == "review":
        render_review_mode()
        return
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
        render_evidence_items = render_evidence(car_root)

        car_collection = bpy.data.collections["VEHICLE_HINODE_COUPÉ"]
        original_car_location = car_root.location.copy()
        car_root.location = (0.0, 0.0, 0.0)
        export_selection(MODEL_DIR / "hinode-fictional-coupe.glb", list(car_collection.all_objects))
        car_root.location = original_car_location

        baked_object, atlas_path = bake_static_environment(materials)
        export_selection(MODEL_DIR / "hinode-slice-environment.glb", [baked_object])
        export_path = SOURCE_DIR / "hinode_slice_export.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(export_path))
        write_report(render_evidence_items, baked_object, atlas_path)
        print(f"Hinode master generated: {master_path}")
        print(f"Hinode export generated: {export_path}")
        return

    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print(f"Hinode source generated: {output}")


if __name__ == "__main__":
    save_mode(parse_args().mode)
