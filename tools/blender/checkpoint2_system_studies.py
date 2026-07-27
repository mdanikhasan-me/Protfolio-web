"""Reproducible Blender studies for Checkpoint 2 signature systems.

The script creates low-cost internal renders only. It does not create public UI,
project screenshots, personal imagery, or a production GLB.

Run:
  blender --background --python tools/blender/checkpoint2_system_studies.py -- \
    --output-dir .local-validation/blender
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name: str, rgba: tuple[float, float, float, float], metallic: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.metallic = metallic
    mat.roughness = 0.42
    return mat


def add_curve(name: str, points: list[tuple[float, float, float]], mat: bpy.types.Material) -> None:
    curve_data = bpy.data.curves.new(name=name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = 0.085
    curve_data.bevel_resolution = 4
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinates in zip(spline.bezier_points, points, strict=True):
        point.co = coordinates
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    curve_data.materials.append(mat)
    bpy.context.collection.objects.link(obj)


def setup_world(background: tuple[float, float, float, float]) -> None:
    bpy.context.scene.world.color = background[:3]
    # Blender 5.2 exposes Eevee through the stable BLENDER_EEVEE enum.
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = 960
    bpy.context.scene.render.resolution_y = 540
    bpy.context.scene.render.resolution_percentage = 100
    bpy.context.scene.render.image_settings.file_format = "PNG"
    bpy.context.scene.render.film_transparent = False
    bpy.context.scene.render.image_settings.color_mode = "RGBA"
    bpy.context.scene.view_settings.look = "AgX - Medium High Contrast"


def add_camera(location: tuple[float, float, float], target: tuple[float, float, float]) -> None:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52
    bpy.context.scene.camera = camera


def add_area_light(location: tuple[float, float, float], energy: float, size: float, color: tuple[float, float, float]) -> None:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color


def render_signal_weave(output_dir: Path) -> None:
    reset_scene()
    setup_world((0.018, 0.02, 0.055, 1))
    colors = [
        material("mineral-cyan", (0.17, 0.68, 0.72, 1)),
        material("saffron", (0.91, 0.48, 0.08, 1)),
        material("berry", (0.75, 0.10, 0.35, 1)),
        material("violet", (0.28, 0.24, 0.88, 1)),
    ]
    for index, mat in enumerate(colors):
        points = []
        for step in range(9):
            x = -4.4 + step * 1.1
            y = math.sin(step * 0.85 + index * 1.45) * (0.55 + index * 0.06)
            z = math.cos(step * 0.7 + index * 1.1) * 0.42 + (index - 1.5) * 0.16
            if 3 <= step <= 5:
                y += (index - 1.5) * 0.42
            points.append((x, y, z))
        add_curve(f"continuous-signal-{index:02d}", points, mat)
    add_camera((0.0, -10.8, 5.8), (0.0, 0.0, 0.0))
    add_area_light((-3.2, -3.0, 5.5), 900, 5.0, (0.3, 0.75, 1.0))
    add_area_light((4.0, 1.0, 3.0), 760, 4.0, (1.0, 0.24, 0.42))
    bpy.context.scene.render.filepath = str(output_dir / "signal-weave-study.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "signal-weave-study.blend"))
    bpy.ops.render.render(write_still=True)


def render_constraint_field(output_dir: Path) -> None:
    reset_scene()
    setup_world((0.018, 0.045, 0.08, 1))
    random.seed(27072026)
    calm = material("field-calm", (0.42, 0.70, 0.70, 1))
    warm = material("field-force", (0.86, 0.22, 0.10, 1))
    gold = material("field-memory", (0.95, 0.52, 0.05, 1))
    attractor = Vector((1.1, 0.1, 0.0))
    for row in range(17):
        for column in range(29):
            x = (column - 14) * 0.31
            y = (row - 8) * 0.27
            position = Vector((x, y, random.uniform(-0.13, 0.13)))
            vector = attractor - position
            angle = math.atan2(vector.y, vector.x) + math.pi / 2
            distance = max(vector.length, 0.15)
            bpy.ops.mesh.primitive_cube_add(location=position)
            mark = bpy.context.object
            mark.name = f"field-mark-{row:02d}-{column:02d}"
            mark.scale = (0.035, 0.13, 0.025)
            mark.rotation_euler[2] = angle + math.sin(column * 0.4 + row * 0.3) * 0.25
            chosen = warm if distance < 1.5 else gold if (row + column) % 19 == 0 else calm
            mark.data.materials.append(chosen)
    add_camera((0.0, -9.2, 7.8), (0.0, 0.0, 0.0))
    add_area_light((-2.0, -3.0, 7.0), 1200, 6.0, (0.5, 0.8, 1.0))
    add_area_light((4.0, 0.0, 4.0), 850, 4.0, (1.0, 0.30, 0.12))
    bpy.context.scene.render.filepath = str(output_dir / "constraint-field-study.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "constraint-field-study.blend"))
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    render_signal_weave(output_dir)
    render_constraint_field(output_dir)
    print(f"Rendered internal studies to {output_dir}")


if __name__ == "__main__":
    main()
