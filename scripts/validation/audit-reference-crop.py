"""Inspect top/bottom viewport boundaries on every decoded source frame, without resizing.

This is an alignment diagnostic, not a visual review or reference-parity test.
"""

import argparse
import csv
import json
import subprocess
import time
from pathlib import Path

import numpy as np


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    metadata = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=width,height,nb_frames,r_frame_rate,avg_frame_rate,duration",
        "-of", "json", str(args.video),
    ], text=True))["streams"][0]
    if (metadata["width"], metadata["height"]) != (2560, 1440):
        raise ValueError("This boundary diagnostic is calibrated only for the 2560x1440 recording")
    expected = int(metadata["nb_frames"])
    command = [
        "ffmpeg", "-v", "error", "-threads", "2", "-i", str(args.video),
        "-filter_complex",
        "[0:v]split=2[a][b];[a]crop=512:16:1024:72[t];[b]crop=512:24:1024:1376[b];[t][b]vstack[out]",
        "-map", "[out]", "-fps_mode", "passthrough", "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1",
    ]
    frame_bytes = 512 * 40 * 3
    count = 0
    top_counts = {}
    bottom_counts = {}
    started = time.perf_counter()
    with (args.output / "decoder.stderr.log").open("wb") as error_log:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=error_log)
        try:
            with (args.output / "boundaries.csv.partial").open("w", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(["picture", "top_max_row", "top_delta", "bottom_max_row", "bottom_delta"])
                while True:
                    chunks = bytearray()
                    while len(chunks) < frame_bytes:
                        block = process.stdout.read(frame_bytes - len(chunks))
                        if not block:
                            break
                        chunks.extend(block)
                    if not chunks:
                        break
                    if len(chunks) != frame_bytes:
                        raise ValueError("Truncated decoded ROI frame")
                    pixels = np.frombuffer(chunks, dtype=np.uint8).reshape(40, 512, 3)
                    means = pixels.mean(axis=1)
                    top_delta = np.abs(np.diff(means[:16], axis=0)).mean(axis=1)
                    bottom_delta = np.abs(np.diff(means[16:], axis=0)).mean(axis=1)
                    top_row = int(np.argmax(top_delta)) + 73
                    bottom_row = int(np.argmax(bottom_delta)) + 1377
                    count += 1
                    top_counts[top_row] = top_counts.get(top_row, 0) + 1
                    bottom_counts[bottom_row] = bottom_counts.get(bottom_row, 0) + 1
                    writer.writerow([count, top_row, float(top_delta.max()), bottom_row, float(bottom_delta.max())])
                    if count % 2400 == 0:
                        print(f"{count}/{expected}", flush=True)
            code = process.wait()
            if code != 0 or count != expected:
                raise ValueError(f"Decoder exit={code}; decoded={count}/{expected}")
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
    (args.output / "boundaries.csv.partial").rename(args.output / "boundaries.csv")
    report = {
        "kind": "ALL_FRAME_VIEWPORT_BOUNDARY_DIAGNOSTIC",
        "source": str(args.video.resolve()), "metadata": metadata,
        "expected": expected, "decoded": count, "resized": False,
        "rois_xywh": [[1024, 72, 512, 16], [1024, 1376, 512, 24]],
        "top_boundary_histogram": top_counts, "bottom_boundary_histogram": bottom_counts,
        "elapsed_seconds": time.perf_counter() - started,
        "interpretation": "Strongest native row-color boundary in each ROI; content/overlay changes can confound it.",
        "visual_review": "NOT_PERFORMED", "parity_acceptance": "NOT_PROVEN",
    }
    (args.output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
