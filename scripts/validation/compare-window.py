"""Compare every picture/transition in a calibrated window; never infer full-site acceptance."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


REGIONS = {
    "wall_upper_left": (250, 180, 740, 360),
    "wall_upper_right": (1780, 130, 2110, 350),
    "wall_lower_left": (420, 930, 690, 1080),
    "object_upper": (1180, 220, 1330, 380),
    "object_left": (940, 650, 1050, 880),
    "object_base": (1060, 1000, 1480, 1110),
}


def statistics(pixels: np.ndarray, previous: np.ndarray | None) -> dict:
    rgb = pixels.astype(np.float32)
    y = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    dx = np.abs(np.diff(y, axis=1))
    dy = np.abs(np.diff(y, axis=0))
    return {
        "rgb": rgb.mean(axis=(0, 1)).tolist(),
        "luma": float(y.mean()),
        "luma_std": float(y.std()),
        "bright_fraction": float((y >= 250).mean()),
        "bloom_fraction": float((y >= 192).mean()),
        "dark_fraction": float((y <= 5).mean()),
        "edge_mean": float((dx.mean() + dy.mean()) / 2),
        "motion_rgb_mae": None if previous is None else float(
            np.abs(rgb - previous.astype(np.float32)).mean()
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--current", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.current / "manifest.json").read_text())
    if manifest["state"] != "CAPTURED_PNG_HASHED" or manifest["errors"] or manifest["failedRequests"]:
        raise ValueError("Capture is incomplete or has browser errors")
    if (manifest["width"], manifest["height"]) != (2537, 1308):
        raise ValueError("Expected calibrated 2537x1308 screenshot")
    rows = []
    previous_ref = previous_cur = None
    for index, frame in enumerate(manifest["frames"], 1):
        source = manifest.get("firstPicture", 1) + index - 1
        if frame["picture"] != index or frame.get("sourcePicture", source) != source:
            raise ValueError("Non-chronological frame mapping")
        ref_path = args.reference / f"frame-{source:06}.png"
        cur_path = args.current / f"frame-{index:06}.png"
        if hashlib.sha256(cur_path.read_bytes()).hexdigest() != frame["pngSha256"]:
            raise ValueError(f"Capture hash mismatch at {index}")
        with Image.open(ref_path) as image:
            image.load()
            if image.size != (2560, 1440):
                raise ValueError(f"Reference dimensions at {source}")
            reference_native = np.asarray(image.convert("RGB"))
        with Image.open(cur_path) as image:
            image.load()
            current_native = np.asarray(image.convert("RGB"))
        if current_native.shape != (1308, 2537, 3):
            raise ValueError(f"Current dimensions at {source}")
        # Compare the common backing region. Preserve native files and disclose excluded border.
        reference = reference_native[80:1388, 4:2540]
        current = current_native[:, :2536]
        row = {
            "picture": index, "reference_picture": source,
            "reference_rgb24_sha256": hashlib.sha256(reference_native.tobytes()).hexdigest(),
            "current_rgb24_sha256": hashlib.sha256(current_native.tobytes()).hexdigest(),
            "reference": statistics(reference, previous_ref),
            "current": statistics(current, previous_cur),
            "regions": {},
        }
        for name, (x0, y0, x1, y1) in REGIONS.items():
            region_ref = reference[y0:y1, x0:x1]
            region_cur = current[y0:y1, x0:x1]
            row["regions"][name] = {
                "reference": statistics(region_ref, None if previous_ref is None else previous_ref[y0:y1, x0:x1]),
                "current": statistics(region_cur, None if previous_cur is None else previous_cur[y0:y1, x0:x1]),
            }
        rows.append(row)
        previous_ref, previous_cur = reference, current
    if len(rows) != manifest["expected"]:
        raise ValueError("Incomplete comparison")
    summary = {}
    for name in REGIONS:
        summary[name] = {
            side: {
                metric: float(np.mean([row["regions"][name][side][metric] for row in rows
                                       if row["regions"][name][side][metric] is not None]))
                for metric in ["luma", "luma_std", "bright_fraction", "bloom_fraction", "edge_mean", "motion_rgb_mae"]
            } for side in ["reference", "current"]
        }
    report = {
        "kind": "ALL_PICTURES_WINDOW_DIAGNOSTIC",
        "count": len(rows), "transitions": len(rows) - 1,
        "reference_crop_xyxy": [4, 80, 2540, 1388], "current_crop_xyxy": [0, 0, 2536, 1308],
        "resized": False, "excluded_current_border_columns": [2536],
        "regions": REGIONS, "summary": summary, "frames": rows,
        "limits": ["Different branding and protected geometry", "Reference pose/input history not fully aligned",
                   "ROI metrics are diagnostics, not a perceptual acceptance threshold",
                   "Simulated replay, not native frame-rate capture"],
        "visual_review": "SEPARATE_LEDGER", "full_parity_acceptance": "NOT_PROVEN",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(json.dumps({"count": len(rows), "transitions": len(rows)-1, "summary": summary}, indent=2))


if __name__ == "__main__":
    main()
