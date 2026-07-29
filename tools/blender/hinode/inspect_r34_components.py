"""Read-only connected-component inspection for the supplied R34 source."""

from __future__ import annotations

import argparse
import json
from collections import Counter, deque
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = []
    if "--" in __import__("sys").argv:
        args = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    return parser.parse_args(args)


def connected_components(mesh: bpy.types.Mesh) -> list[set[int]]:
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)

    unseen = set(range(len(mesh.vertices)))
    components: list[set[int]] = []
    while unseen:
        seed = unseen.pop()
        component = {seed}
        queue = deque([seed])
        while queue:
            vertex = queue.popleft()
            neighbours = adjacency[vertex] & unseen
            unseen.difference_update(neighbours)
            component.update(neighbours)
            queue.extend(neighbours)
        components.append(component)
    return components


def inspect_object(obj: bpy.types.Object) -> dict:
    mesh = obj.data
    material_names = [
        slot.material.name if slot.material else f"slot_{index}"
        for index, slot in enumerate(obj.material_slots)
    ]
    rows = []
    for component_index, vertices in enumerate(connected_components(mesh)):
        points = [obj.matrix_world @ mesh.vertices[index].co for index in vertices]
        minimum = [min(point[axis] for point in points) for axis in range(3)]
        maximum = [max(point[axis] for point in points) for axis in range(3)]
        polygon_indices = [
            polygon
            for polygon in mesh.polygons
            if polygon.vertices and polygon.vertices[0] in vertices
        ]
        material_counts = Counter(
            material_names[polygon.material_index]
            if polygon.material_index < len(material_names)
            else f"slot_{polygon.material_index}"
            for polygon in polygon_indices
        )
        rows.append(
            {
                "componentIndex": component_index,
                "vertexCount": len(vertices),
                "polygonCount": len(polygon_indices),
                "triangleCount": sum(max(0, len(polygon.vertices) - 2) for polygon in polygon_indices),
                "minimum": [round(value, 6) for value in minimum],
                "maximum": [round(value, 6) for value in maximum],
                "centre": [round((minimum[i] + maximum[i]) * 0.5, 6) for i in range(3)],
                "dimensions": [round(maximum[i] - minimum[i], 6) for i in range(3)],
                "materials": dict(material_counts.most_common()),
            }
        )
    rows.sort(key=lambda row: row["triangleCount"], reverse=True)
    return {
        "name": obj.name,
        "location": [round(value, 6) for value in obj.location],
        "rotationEuler": [round(value, 6) for value in obj.rotation_euler],
        "scale": [round(value, 6) for value in obj.scale],
        "vertexCount": len(mesh.vertices),
        "polygonCount": len(mesh.polygons),
        "triangleCount": sum(max(0, len(polygon.vertices) - 2) for polygon in mesh.polygons),
        "materialSlots": material_names,
        "modifiers": [
            {
                "name": modifier.name,
                "type": modifier.type,
                "showViewport": modifier.show_viewport,
                "showRender": modifier.show_render,
            }
            for modifier in obj.modifiers
        ],
        "components": rows,
    }


def inspect_material(material: bpy.types.Material) -> dict:
    base_color = None
    metallic = None
    roughness = None
    if material.node_tree:
        principled = next(
            (node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"),
            None,
        )
        if principled:
            if "Base Color" in principled.inputs:
                base_color = [
                    round(value, 6)
                    for value in principled.inputs["Base Color"].default_value
                ]
            if "Metallic" in principled.inputs:
                metallic = round(principled.inputs["Metallic"].default_value, 6)
            if "Roughness" in principled.inputs:
                roughness = round(principled.inputs["Roughness"].default_value, 6)
    return {
        "name": material.name,
        "baseColor": base_color,
        "metallic": metallic,
        "roughness": roughness,
    }


def main() -> None:
    output_path = Path(parse_args().output)
    report = {
        "sourceBlend": bpy.data.filepath,
        "materials": [inspect_material(material) for material in bpy.data.materials],
        "objects": [
            inspect_object(obj)
            for obj in bpy.context.scene.objects
            if obj.type == "MESH"
        ],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"R34 component report: {output_path}")


if __name__ == "__main__":
    main()
