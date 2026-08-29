"""Build the monolithic opening sculpture traced from reference state O-00."""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "assets" / "blender"
PUBLIC_DIR = ROOT / "public" / "media" / "identity"
REVIEW_DIR = ROOT / ".reference-local" / "reference-locked-v1" / "model-review"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            collection.remove(item)


def hammered_silver() -> bpy.types.Material:
    value = bpy.data.materials.new("Hammered silver shell")
    value.use_nodes = True
    nodes = value.node_tree.nodes
    links = value.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    noise = nodes.new("ShaderNodeTexNoise")
    ramp = nodes.new("ShaderNodeValToRGB")
    bump = nodes.new("ShaderNodeBump")

    noise.inputs["Scale"].default_value = 3.4
    noise.inputs["Detail"].default_value = 9.0
    noise.inputs["Roughness"].default_value = 0.8
    noise.inputs["Lacunarity"].default_value = 2.4
    noise.inputs["Distortion"].default_value = 0.42
    ramp.color_ramp.elements[0].position = 0.26
    ramp.color_ramp.elements[0].color = (0.055, 0.065, 0.075, 1)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (0.94, 0.97, 1.0, 1)
    midpoint = ramp.color_ramp.elements.new(0.49)
    midpoint.color = (0.48, 0.52, 0.56, 1)

    shader.inputs["Metallic"].default_value = 0.93
    shader.inputs["Roughness"].default_value = 0.2
    shader.inputs["Coat Weight"].default_value = 0.32
    shader.inputs["Coat Roughness"].default_value = 0.1
    bump.inputs["Strength"].default_value = 0.23
    bump.inputs["Distance"].default_value = 0.075

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return value


def curve_loop(curve: bpy.types.Curve, points: list[tuple[float, float]]) -> None:
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, (x, z) in zip(spline.points, points):
        point.co = (x, z, 0.0, 1.0)
    spline.use_cyclic_u = True


def build_sculpture() -> tuple[bpy.types.Object, bpy.types.Object]:
    root = bpy.data.objects.new("Reference_A_Root", None)
    bpy.context.collection.objects.link(root)
    root["identity"] = "MD Anik Hasan"
    root["reference_state"] = "O-00"
    root["construction"] = "single continuous triangular shell with a true counter"

    curve = bpy.data.curves.new("Reference_A_Sculpture_Profile", type="CURVE")
    curve.dimensions = "2D"
    curve.resolution_u = 2
    curve.fill_mode = "BOTH"
    # The body is materially deep, but the edge-on reference also retains a
    # projected portion of the face. Blender extrudes in both directions, so
    # 1.3 produces a 2.6-unit body against the 8.1-unit front width.
    curve.extrude = 1.3
    curve.bevel_depth = 0.085
    curve.bevel_resolution = 4

    # Broad base, sharp apex, subtle feet, and a large triangular counter.
    # This is the preferred opening silhouette from the start of this session.
    curve_loop(
        curve,
        [
            (-4.18, -3.28),
            (0.0, 3.82),
            (4.18, -3.28),
            (4.08, -3.58),
            (2.86, -3.58),
            (2.62, -3.18),
            (-2.62, -3.18),
            (-2.86, -3.58),
            (-4.08, -3.58),
        ],
    )
    curve_loop(curve, [(1.82, -1.92), (0.0, 0.96), (-1.82, -1.92)])

    sculpture = bpy.data.objects.new("A_Sculpture", curve)
    bpy.context.collection.objects.link(sculpture)
    sculpture.data.materials.append(hammered_silver())
    sculpture.rotation_euler.x = math.radians(90)
    bpy.context.view_layer.objects.active = sculpture
    sculpture.select_set(True)
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    # Keep the broad front and back faces optically flat. Smooth interpolation
    # across Blender's internal n-gon triangulation creates large nested bands
    # in the refractive web shader, while the reference reads as one coherent
    # coated surface with crisp beveled edges.
    bpy.ops.object.shade_flat()
    sculpture["reference_role"] = "monolithic rotating identity sculpture"
    sculpture["counter"] = "open geometry"
    sculpture.parent = root
    sculpture.select_set(False)
    return root, sculpture


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_scene(root: bpy.types.Object) -> bpy.types.Object:
    world = bpy.context.scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.003, 0.004, 0.006, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.12

    lighting = [
        ("Key softbox", (-5.0, -6.0, 7.0), 2250, 5.0, (1.0, 0.95, 0.9)),
        ("Cold rim", (5.5, 1.0, 5.0), 1750, 3.0, (0.62, 0.76, 1.0)),
        ("Red rim", (-4.0, 1.0, -2.5), 1150, 2.4, (1.0, 0.01, 0.015)),
    ]
    for name, location, energy, size, color in lighting:
        light_data = bpy.data.lights.new(name, type="AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, (0.0, 0.0, 0.0))

    camera_data = bpy.data.cameras.new("Reference review camera")
    camera = bpy.data.objects.new("Reference review camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.0, -15.6, 0.15)
    camera.data.lens = 58
    look_at(camera, (0.0, 0.0, 0.0))
    bpy.context.scene.camera = camera
    root.rotation_euler = (math.radians(1.5), math.radians(-5.0), math.radians(-1.0))
    return camera


def save_outputs(root: bpy.types.Object, camera: bpy.types.Object) -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(REVIEW_DIR / "reference-a-rest.png")
    bpy.ops.render.render(write_still=True)

    root.rotation_euler = (0.0, 0.0, 0.0)
    camera.location = (0.0, -15.8, 0.1)
    look_at(camera, (0.0, 0.0, 0.0))
    bpy.ops.wm.save_as_mainfile(filepath=str(ASSET_DIR / "reference-a-system.blend"))

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(PUBLIC_DIR / "reference-a-desktop.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


reset_scene()
assembly, shell = build_sculpture()
review_camera = setup_scene(assembly)
save_outputs(assembly, review_camera)
