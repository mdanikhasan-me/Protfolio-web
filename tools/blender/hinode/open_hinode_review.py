"""Open the current Hinode master in a readable interactive review state."""

import math

import bpy
from mathutils import Vector


review_angle = math.radians(125)


def prepare_review_workspace():
    scene = bpy.context.scene
    if scene.camera is None:
        camera_data = bpy.data.cameras.new("CAM_Live_Review")
        camera_data.lens = 42
        camera_data.clip_end = 250
        scene.camera = bpy.data.objects.new("CAM_Live_Review", camera_data)
        scene.collection.objects.link(scene.camera)
    else:
        scene.camera.data.lens = 42

    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.shading.light = "STUDIO"
            space.shading.studiolight_rotate_z = 0.35
            space.shading.studiolight_background_alpha = 0.25
            space.overlay.show_floor = True
            space.overlay.show_axis_x = True
            space.overlay.show_axis_y = True
            space.region_3d.view_perspective = "CAMERA"

    print("Hinode interactive review ready: material preview, camera view, source unchanged.")
    return 0.08


def orbit_review_camera():
    global review_angle

    scene = bpy.context.scene
    camera = scene.camera
    if camera is None:
        return None

    radius = 68.0
    height = 46.0
    target = Vector((0.0, 0.0, 1.8))
    camera.location = (
        math.cos(review_angle) * radius,
        math.sin(review_angle) * radius,
        height,
    )
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    review_angle += math.radians(0.16)
    return 0.08


def start_live_review():
    prepare_review_workspace()
    bpy.app.timers.register(orbit_review_camera, first_interval=0.1, persistent=True)
    return None


bpy.app.timers.register(start_live_review, first_interval=1.0)
