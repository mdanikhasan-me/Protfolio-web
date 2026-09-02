"""Decode every replay PNG and verify a held controller without claiming native-rate parity."""

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


def audit(directory: Path) -> dict:
    manifest_path = directory / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    frames = manifest["frames"]
    expected = manifest["expected"]
    errors = []
    if manifest["kind"] != "DETERMINISTIC_RENDERER_REPLAY":
        errors.append("Unexpected capture kind")
    if manifest["state"] != "CAPTURED_PNG_HASHED":
        errors.append("Capture did not finish")
    if manifest["errors"] or manifest["failedRequests"]:
        errors.append("Browser errors or failed requests")
    if len(frames) != expected:
        errors.append("Incomplete frame manifest")
    filenames = {f"frame-{index:06}.png" for index in range(1, expected + 1)}
    if {p.name for p in directory.glob("*.png")} != filenames:
        errors.append("Missing or unexpected PNGs")
    previous = None
    previous_time = -1
    rows = []
    for index, frame in enumerate(frames, 1):
        filename = f"frame-{index:06}.png"
        if frame["picture"] != index or frame["file"] != filename:
            errors.append(f"Frame order mismatch at {index}")
        source_picture = manifest.get("firstPicture", 1) + index - 1
        if frame.get("sourcePicture", source_picture) != source_picture:
            errors.append(f"Source picture mismatch at {index}")
        if frame["simulatedTime"] != f"{source_picture - 1}/120":
            errors.append(f"Replay time mismatch at {index}")
        if not math.isfinite(frame["captureElapsedMs"]) or frame["captureElapsedMs"] <= previous_time:
            errors.append(f"Non-monotonic capture clock at {index}")
        previous_time = frame["captureElapsedMs"]
        path = directory / filename
        file_bytes = path.read_bytes()
        if hashlib.sha256(file_bytes).hexdigest() != frame["pngSha256"]:
            errors.append(f"PNG hash mismatch at {index}")
        with Image.open(path) as image:
            image.load()
            if image.size != (manifest["width"], manifest["height"]):
                errors.append(f"Dimensions mismatch at {index}")
            pixels = np.asarray(image.convert("RGB"))
        rgb_hash = hashlib.sha256(pixels.tobytes()).hexdigest()
        difference = None if previous is None else float(
            np.abs(pixels.astype(np.int16) - previous).mean()
        )
        previous = pixels.astype(np.int16)
        quaternion = [float(value) for value in frame["quaternion"].split()]
        if len(quaternion) != 4 or not all(math.isfinite(value) for value in quaternion):
            errors.append(f"Invalid quaternion at {index}")
        # The displayed quaternion is rounded to two decimals; report that precision honestly.
        vector_magnitude = math.sqrt(sum(value * value for value in quaternion[:3]))
        rows.append({
            "picture": index,
            "rgb24_sha256": rgb_hash,
            "mean_rgb": pixels.mean(axis=(0, 1)).tolist(),
            "previous_frame_rgb_mae": difference,
            "quaternion": quaternion,
            "rotation_vector_magnitude_rounded": vector_magnitude,
            "dragging": frame["dragging"],
        })
    controller = manifest["scenario"] == "controller"
    held = rows[1:90] if controller else []
    complete = len(rows) == expected == 120
    hold_changes = sum(row["quaternion"] != held[0]["quaternion"] for row in held) if held else None
    drag_schedule_pass = all(row["dragging"] == (2 <= row["picture"] <= 90) for row in rows) if controller else None
    release_returns = (
        rows[-1]["rotation_vector_magnitude_rounded"] < rows[89]["rotation_vector_magnitude_rounded"]
        if controller and complete else None
    )
    held_has_rotation = held[0]["rotation_vector_magnitude_rounded"] > 0.1 if held else None
    return {
        "directory": str(directory.resolve()),
        "manifest_sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        "scenario": manifest["scenario"],
        "source_hashes": manifest["sourceHashes"],
        "expected": expected,
        "decoded": len(rows),
        "adjacent_transitions_analyzed": max(0, len(rows) - 1),
        "errors": errors,
        "file_integrity_pass": not errors,
        "held_frames": len(held),
        "held_quaternion_changes_from_first": hold_changes,
        "drag_schedule_pass": drag_schedule_pass,
        "held_has_rotation": held_has_rotation,
        "release_returns_toward_rest": release_returns,
        "controller_hold_pass": (
            not errors and complete and drag_schedule_pass and held_has_rotation
            and hold_changes == 0 and release_returns
        ) if controller else None,
        "telemetry_precision": "Two decimal quaternion components",
        "native_frame_rate": "NOT_MEASURED",
        "reference_comparison": "NOT_PERFORMED",
        "visual_review": "NOT_PERFORMED",
        "full_parity_acceptance": "NOT_PROVEN",
        "frames": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--require-held-pose", action="store_true")
    args = parser.parse_args()
    report = audit(args.directory)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(json.dumps({key: value for key, value in report.items() if key not in ("frames", "source_hashes")}, indent=2))
    if not report["file_integrity_pass"] or (args.require_held_pose and not report["controller_hold_pass"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
