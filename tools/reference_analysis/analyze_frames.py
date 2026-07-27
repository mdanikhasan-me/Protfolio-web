#!/usr/bin/env python3
"""Forensic analysis for the four local portfolio reference recordings.

The source folders are read-only. Derived indexes and visual review aids are
written to an external output directory so the 24,000+ source frames and large
contact-sheet sets never enter Git.
"""

from __future__ import annotations

import argparse
import colorsys
import hashlib
import json
import math
import re
import sqlite3
import statistics
import sys
import time
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
from PIL import Image, ImageDraw, ImageFile, ImageFont

ImageFile.LOAD_TRUNCATED_IMAGES = False

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
FRAME_NUMBER_PATTERN = re.compile(r"(\d+)(?=\.[^.]+$)")


@dataclass(frozen=True)
class WebsiteInput:
    key: str
    label: str
    candidates: tuple[str, ...]
    fps: float


WEBSITES = (
    WebsiteInput("website_01", "Website 01", ("Website_01", "Website 1"), 60.0),
    WebsiteInput("website_02", "Website 02", ("Website_02", "Website 2"), 60.0),
    WebsiteInput("website_03", "Website 03", ("Website_03", "Website 3"), 60.0),
    WebsiteInput("website_04", "Website 04", ("Website_04", "Website 4"), 58.46),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--top-events", type=int, default=64)
    parser.add_argument("--transition-strips", type=int, default=12)
    return parser.parse_args()


def find_source(root: Path, website: WebsiteInput) -> Path:
    for candidate in website.candidates:
        path = root / candidate
        if path.is_dir():
            return path
    raise FileNotFoundError(
        f"{website.label}: expected one of {', '.join(website.candidates)} under {root}"
    )


def collect_images(source: Path) -> list[Path]:
    return sorted(
        (path for path in source.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES),
        key=lambda path: (frame_number(path), path.as_posix().lower()),
    )


def frame_number(path: Path) -> int:
    match = FRAME_NUMBER_PATTERN.search(path.name)
    if not match:
        return -1
    return int(match.group(1))


def dct_matrix(size: int) -> np.ndarray:
    n = np.arange(size, dtype=np.float32)
    k = n.reshape(-1, 1)
    matrix = np.cos((math.pi / size) * (n + 0.5) * k).astype(np.float32)
    matrix[0, :] *= math.sqrt(1.0 / size)
    matrix[1:, :] *= math.sqrt(2.0 / size)
    return matrix


DCT_32 = dct_matrix(32)


def perceptual_hash(gray: np.ndarray) -> tuple[str, np.ndarray]:
    image = Image.fromarray(gray, mode="L").resize((32, 32), Image.Resampling.LANCZOS)
    pixels = np.asarray(image, dtype=np.float32)
    transformed = DCT_32 @ pixels @ DCT_32.T
    low = transformed[:8, :8]
    median = float(np.median(low[1:, :]))
    bits = low > median
    packed = np.packbits(bits.reshape(-1))
    return packed.tobytes().hex(), bits


def global_ssim(previous: np.ndarray, current: np.ndarray) -> float:
    a = previous.astype(np.float32) / 255.0
    b = current.astype(np.float32) / 255.0
    mean_a = float(a.mean())
    mean_b = float(b.mean())
    variance_a = float(a.var())
    variance_b = float(b.var())
    covariance = float(((a - mean_a) * (b - mean_b)).mean())
    c1 = 0.01**2
    c2 = 0.03**2
    numerator = (2 * mean_a * mean_b + c1) * (2 * covariance + c2)
    denominator = (mean_a**2 + mean_b**2 + c1) * (variance_a + variance_b + c2)
    if denominator <= 0:
        return 1.0
    return max(-1.0, min(1.0, numerator / denominator))


def motion_approximation(previous: np.ndarray, current: np.ndarray) -> tuple[float, float, int, int]:
    a = previous.astype(np.float32) / 255.0
    b = current.astype(np.float32) / 255.0
    fft_a = np.fft.rfft2(a)
    fft_b = np.fft.rfft2(b)
    cross = fft_b * np.conj(fft_a)
    magnitude = np.abs(cross)
    cross /= np.where(magnitude < 1e-8, 1.0, magnitude)
    correlation = np.fft.irfft2(cross, s=a.shape)
    y, x = np.unravel_index(int(np.argmax(correlation)), correlation.shape)
    if y > a.shape[0] // 2:
        y -= a.shape[0]
    if x > a.shape[1] // 2:
        x -= a.shape[1]
    aligned = np.roll(a, shift=(y, x), axis=(0, 1))
    residual = float(np.mean(np.abs(b - aligned)))
    shift = math.hypot(x, y)
    score = min(1.0, 0.28 * min(1.0, shift / 6.0) + 0.72 * residual)
    return score, residual, int(x), int(y)


def dominant_colours(rgb: np.ndarray, count: int = 3) -> list[str]:
    quantised = (rgb.astype(np.uint16) >> 4).reshape(-1, 3)
    indexes = (quantised[:, 0] << 8) | (quantised[:, 1] << 4) | quantised[:, 2]
    histogram = np.bincount(indexes, minlength=4096)
    top = np.argsort(histogram)[-count:][::-1]
    colours: list[str] = []
    for value in top:
        red = ((int(value) >> 8) & 0xF) * 17
        green = ((int(value) >> 4) & 0xF) * 17
        blue = (int(value) & 0xF) * 17
        colours.append(f"#{red:02x}{green:02x}{blue:02x}")
    return colours


def colour_summary(rgb: np.ndarray) -> tuple[str, float, float, float]:
    mean = rgb.reshape(-1, 3).mean(axis=0)
    mean_hex = f"#{int(mean[0]):02x}{int(mean[1]):02x}{int(mean[2]):02x}"
    red, green, blue = (float(channel) / 255.0 for channel in mean)
    hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
    return mean_hex, hue * 360.0, saturation, value


def make_thumb(rgb: np.ndarray, width: int, height: int) -> Image.Image:
    return Image.fromarray(rgb, mode="RGB").resize((width, height), Image.Resampling.LANCZOS)


class AtlasWriter:
    def __init__(
        self,
        output_dir: Path,
        prefix: str,
        columns: int,
        rows: int,
        thumb_width: int,
        thumb_height: int,
        label_height: int = 10,
        quality: int = 82,
    ) -> None:
        self.output_dir = output_dir
        self.prefix = prefix
        self.columns = columns
        self.rows = rows
        self.thumb_width = thumb_width
        self.thumb_height = thumb_height
        self.label_height = label_height
        self.quality = quality
        self.items: list[tuple[int, Image.Image]] = []
        self.page = 0
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.font = ImageFont.load_default()

    def add(self, number: int, image: Image.Image) -> None:
        self.items.append((number, image.copy()))
        if len(self.items) >= self.columns * self.rows:
            self.flush()

    def flush(self) -> None:
        if not self.items:
            return
        self.page += 1
        cell_height = self.thumb_height + self.label_height
        canvas = Image.new(
            "RGB",
            (self.columns * self.thumb_width, self.rows * cell_height),
            "#101010",
        )
        draw = ImageDraw.Draw(canvas)
        for index, (number, thumb) in enumerate(self.items):
            x = (index % self.columns) * self.thumb_width
            y = (index // self.columns) * cell_height
            canvas.paste(thumb.resize((self.thumb_width, self.thumb_height)), (x, y))
            draw.text((x + 2, y + self.thumb_height), f"{number:06d}", fill="#ffffff", font=self.font)
        first = self.items[0][0]
        last = self.items[-1][0]
        output = self.output_dir / f"{self.prefix}_{self.page:03d}_{first:06d}-{last:06d}.jpg"
        canvas.save(output, quality=self.quality, optimize=True, progressive=True)
        self.items.clear()


def percentile_probabilities(values: Sequence[float]) -> list[float]:
    if not values:
        return []
    array = np.asarray(values, dtype=np.float64)
    median = float(np.median(array))
    deviations = np.abs(array - median)
    mad = float(np.median(deviations))
    scale = max(mad * 1.4826, 1e-6)
    z = np.clip((array - median) / scale, -12.0, 12.0)
    probabilities = 1.0 / (1.0 + np.exp(-(z - 2.5)))
    return [float(value) for value in probabilities]


def create_contact_sheets(
    rows: Sequence[dict[str, object]],
    source_by_number: dict[int, Path],
    output_dir: Path,
    prefix: str,
    width: int,
    height: int,
    columns: int,
    sheet_rows: int,
) -> None:
    writer = AtlasWriter(
        output_dir,
        prefix,
        columns=columns,
        rows=sheet_rows,
        thumb_width=width,
        thumb_height=height,
        label_height=14,
        quality=88,
    )
    for row in rows:
        number = int(row["frame_number"])
        path = source_by_number.get(number)
        if path is None:
            continue
        with Image.open(path) as image:
            writer.add(number, image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS))
    writer.flush()


def create_transition_strips(
    event_rows: Sequence[dict[str, object]],
    ordered_numbers: Sequence[int],
    source_by_number: dict[int, Path],
    output_dir: Path,
    count: int,
) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    positions = {number: index for index, number in enumerate(ordered_numbers)}
    generated: list[str] = []
    font = ImageFont.load_default()
    for rank, row in enumerate(event_rows[:count], start=1):
        centre = int(row["frame_number"])
        position = positions[centre]
        indices = range(max(0, position - 3), min(len(ordered_numbers), position + 4))
        frames = [ordered_numbers[index] for index in indices]
        width, height, label_height = 320, 180, 14
        canvas = Image.new("RGB", (width * len(frames), height + label_height), "#101010")
        draw = ImageDraw.Draw(canvas)
        for column, number in enumerate(frames):
            with Image.open(source_by_number[number]) as image:
                thumb = image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
            canvas.paste(thumb, (column * width, 0))
            draw.text(
                (column * width + 4, height),
                f"{number:06d}",
                fill="#ffffff",
                font=font,
            )
        filename = f"transition_{rank:02d}_frame_{centre:06d}.jpg"
        canvas.save(output_dir / filename, quality=90, optimize=True, progressive=True)
        generated.append(filename)
    return generated


def initialise_database(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.executescript(
        """
        DROP TABLE IF EXISTS frame_metrics;
        DROP TABLE IF EXISTS website_summary;
        DROP TABLE IF EXISTS missing_frames;
        CREATE TABLE frame_metrics (
            website TEXT NOT NULL,
            frame_number INTEGER NOT NULL,
            relative_path TEXT NOT NULL,
            width INTEGER,
            height INTEGER,
            phash TEXT,
            phash_distance REAL,
            mean_difference REAL,
            ssim REAL,
            motion_score REAL,
            motion_residual REAL,
            motion_dx INTEGER,
            motion_dy INTEGER,
            mean_colour TEXT,
            dominant_colours TEXT,
            mean_hue REAL,
            mean_saturation REAL,
            mean_value REAL,
            dark_ratio REAL,
            light_ratio REAL,
            scene_probability REAL,
            corrupt INTEGER NOT NULL DEFAULT 0,
            error TEXT,
            PRIMARY KEY (website, frame_number, relative_path)
        );
        CREATE INDEX idx_frame_metrics_scene
            ON frame_metrics (website, scene_probability DESC);
        CREATE INDEX idx_frame_metrics_motion
            ON frame_metrics (website, motion_score DESC);
        CREATE TABLE website_summary (
            website TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            fps REAL NOT NULL,
            file_count INTEGER NOT NULL,
            parsed_frame_count INTEGER NOT NULL,
            first_frame INTEGER,
            last_frame INTEGER,
            missing_count INTEGER NOT NULL,
            duplicate_number_count INTEGER NOT NULL,
            corrupt_count INTEGER NOT NULL,
            dimensions_json TEXT NOT NULL,
            analysis_seconds REAL NOT NULL
        );
        CREATE TABLE missing_frames (
            website TEXT NOT NULL,
            frame_number INTEGER NOT NULL,
            PRIMARY KEY (website, frame_number)
        );
        """
    )
    return connection


def analyse_website(
    connection: sqlite3.Connection,
    website: WebsiteInput,
    source: Path,
    output_root: Path,
    top_events: int,
    transition_strip_count: int,
) -> dict[str, object]:
    started = time.monotonic()
    files = collect_images(source)
    parsed = [(frame_number(path), path) for path in files]
    parsed_valid = [(number, path) for number, path in parsed if number >= 0]
    number_counts = Counter(number for number, _ in parsed_valid)
    duplicate_numbers = sorted(number for number, count in number_counts.items() if count > 1)
    unique_numbers = sorted(number_counts)
    first = unique_numbers[0] if unique_numbers else None
    last = unique_numbers[-1] if unique_numbers else None
    missing = (
        sorted(set(range(first, last + 1)).difference(unique_numbers))
        if first is not None and last is not None
        else []
    )
    site_output = output_root / website.key
    ordered_dir = site_output / "ordered_all_frames"
    ordered_writer = AtlasWriter(
        ordered_dir,
        "ordered",
        columns=24,
        rows=13,
        thumb_width=80,
        thumb_height=45,
    )
    quarter_writer = AtlasWriter(
        site_output / "contact_025s",
        "quarter_second",
        columns=10,
        rows=6,
        thumb_width=160,
        thumb_height=90,
        label_height=14,
        quality=88,
    )
    half_writer = AtlasWriter(
        site_output / "contact_050s",
        "half_second",
        columns=10,
        rows=6,
        thumb_width=160,
        thumb_height=90,
        label_height=14,
        quality=88,
    )
    quarter_step = max(1, round(website.fps * 0.25))
    half_step = max(1, round(website.fps * 0.5))
    rows: list[dict[str, object]] = []
    dimensions: Counter[str] = Counter()
    corrupt: list[dict[str, object]] = []
    previous_gray: np.ndarray | None = None
    previous_hash_bits: np.ndarray | None = None
    previous_number: int | None = None

    print(f"{website.label}: analysing {len(files)} files from {source}", flush=True)
    for index, (number, path) in enumerate(parsed_valid, start=1):
        row: dict[str, object] = {
            "frame_number": number,
            "relative_path": path.relative_to(source).as_posix(),
            "width": None,
            "height": None,
            "phash": None,
            "phash_distance": None,
            "mean_difference": None,
            "ssim": None,
            "motion_score": None,
            "motion_residual": None,
            "motion_dx": None,
            "motion_dy": None,
            "mean_colour": None,
            "dominant_colours": [],
            "mean_hue": None,
            "mean_saturation": None,
            "mean_value": None,
            "dark_ratio": None,
            "light_ratio": None,
            "scene_probability": 0.0,
            "corrupt": 0,
            "error": None,
        }
        try:
            with Image.open(path) as image:
                image.load()
                rgb_image = image.convert("RGB")
                width, height = rgb_image.size
                dimensions[f"{width}x{height}"] += 1
                small_rgb = np.asarray(
                    rgb_image.resize((96, 54), Image.Resampling.LANCZOS),
                    dtype=np.uint8,
                )
            small_gray = np.asarray(
                Image.fromarray(small_rgb, mode="RGB").convert("L"),
                dtype=np.uint8,
            )
            hash_hex, hash_bits = perceptual_hash(small_gray)
            mean_colour, hue, saturation, value = colour_summary(small_rgb)
            luminance = small_gray.astype(np.float32) / 255.0
            row.update(
                {
                    "width": width,
                    "height": height,
                    "phash": hash_hex,
                    "mean_colour": mean_colour,
                    "dominant_colours": dominant_colours(small_rgb),
                    "mean_hue": hue,
                    "mean_saturation": saturation,
                    "mean_value": value,
                    "dark_ratio": float(np.mean(luminance < 0.25)),
                    "light_ratio": float(np.mean(luminance > 0.75)),
                }
            )
            consecutive = previous_gray is not None and previous_number is not None and number == previous_number + 1
            if consecutive and previous_hash_bits is not None:
                row["mean_difference"] = float(
                    np.mean(np.abs(small_gray.astype(np.float32) - previous_gray.astype(np.float32)))
                    / 255.0
                )
                row["ssim"] = global_ssim(previous_gray, small_gray)
                row["phash_distance"] = float(np.mean(hash_bits != previous_hash_bits))
                motion, residual, dx, dy = motion_approximation(previous_gray, small_gray)
                row["motion_score"] = motion
                row["motion_residual"] = residual
                row["motion_dx"] = dx
                row["motion_dy"] = dy
            previous_gray = small_gray
            previous_hash_bits = hash_bits
            previous_number = number

            ordered_writer.add(number, make_thumb(small_rgb, 80, 45))
            if first is not None and (number - first) % quarter_step == 0:
                quarter_writer.add(number, make_thumb(small_rgb, 160, 90))
            if first is not None and (number - first) % half_step == 0:
                half_writer.add(number, make_thumb(small_rgb, 160, 90))
        except Exception as exc:  # keep the index complete and record the exact failure
            row["corrupt"] = 1
            row["error"] = f"{type(exc).__name__}: {exc}"
            corrupt.append(
                {
                    "frame_number": number,
                    "relative_path": path.relative_to(source).as_posix(),
                    "error": row["error"],
                }
            )
            previous_gray = None
            previous_hash_bits = None
            previous_number = None
        rows.append(row)
        if index % 250 == 0 or index == len(parsed_valid):
            elapsed = time.monotonic() - started
            print(
                f"{website.label}: {index}/{len(parsed_valid)} frames ({elapsed:.1f}s)",
                flush=True,
            )

    ordered_writer.flush()
    quarter_writer.flush()
    half_writer.flush()

    raw_scene_values: list[float] = []
    raw_scene_indexes: list[int] = []
    for index, row in enumerate(rows):
        if row["mean_difference"] is None:
            continue
        difference = float(row["mean_difference"])
        ssim_difference = max(0.0, 1.0 - float(row["ssim"]))
        phash_distance = float(row["phash_distance"])
        residual = float(row["motion_residual"])
        raw = 0.34 * difference + 0.28 * ssim_difference + 0.22 * phash_distance + 0.16 * residual
        raw_scene_values.append(raw)
        raw_scene_indexes.append(index)
    probabilities = percentile_probabilities(raw_scene_values)
    for row_index, probability in zip(raw_scene_indexes, probabilities, strict=True):
        rows[row_index]["scene_probability"] = probability

    eligible = [row for row in rows if not row["corrupt"] and row["mean_difference"] is not None]
    scene_events = sorted(
        eligible,
        key=lambda row: (float(row["scene_probability"]), float(row["mean_difference"])),
        reverse=True,
    )[:top_events]
    motion_events = sorted(
        eligible,
        key=lambda row: float(row["motion_score"]),
        reverse=True,
    )[:top_events]
    source_by_number = {number: path for number, path in parsed_valid}
    create_contact_sheets(
        scene_events,
        source_by_number,
        site_output / "scene_change_contacts",
        "scene_changes",
        width=320,
        height=180,
        columns=4,
        sheet_rows=4,
    )
    create_contact_sheets(
        motion_events,
        source_by_number,
        site_output / "motion_peak_contacts",
        "motion_peaks",
        width=320,
        height=180,
        columns=4,
        sheet_rows=4,
    )
    transition_strips = create_transition_strips(
        scene_events,
        unique_numbers,
        source_by_number,
        site_output / "transition_strips",
        transition_strip_count,
    )

    dense_rows: list[dict[str, object]] = []
    if website.key == "website_02":
        dense_rows = [
            row
            for row in rows
            if 1801 <= int(row["frame_number"]) <= 2880
            and (int(row["frame_number"]) - 1801) % 4 == 0
            and not row["corrupt"]
        ]
        create_contact_sheets(
            dense_rows,
            source_by_number,
            site_output / "elastic_text_dense_contacts",
            "elastic_text_every_fourth_frame",
            width=240,
            height=135,
            columns=8,
            sheet_rows=6,
        )

    insert_rows = [
        (
            website.key,
            int(row["frame_number"]),
            str(row["relative_path"]),
            row["width"],
            row["height"],
            row["phash"],
            row["phash_distance"],
            row["mean_difference"],
            row["ssim"],
            row["motion_score"],
            row["motion_residual"],
            row["motion_dx"],
            row["motion_dy"],
            row["mean_colour"],
            json.dumps(row["dominant_colours"], separators=(",", ":")),
            row["mean_hue"],
            row["mean_saturation"],
            row["mean_value"],
            row["dark_ratio"],
            row["light_ratio"],
            row["scene_probability"],
            int(row["corrupt"]),
            row["error"],
        )
        for row in rows
    ]
    connection.executemany(
        """
        INSERT INTO frame_metrics (
            website, frame_number, relative_path, width, height, phash,
            phash_distance, mean_difference, ssim, motion_score, motion_residual,
            motion_dx, motion_dy, mean_colour, dominant_colours, mean_hue,
            mean_saturation, mean_value, dark_ratio, light_ratio,
            scene_probability, corrupt, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        insert_rows,
    )
    connection.executemany(
        "INSERT INTO missing_frames (website, frame_number) VALUES (?, ?)",
        ((website.key, number) for number in missing),
    )
    elapsed = time.monotonic() - started
    summary = {
        "website": website.key,
        "label": website.label,
        "source_path": str(source),
        "source_path_relative_to_reference_root": str(source.relative_to(source.parents[0])),
        "fps_assumption": website.fps,
        "file_count": len(files),
        "parsed_frame_count": len(parsed_valid),
        "unparsed_files": [str(path.relative_to(source)) for number, path in parsed if number < 0],
        "first_frame": first,
        "last_frame": last,
        "missing_count": len(missing),
        "missing_frames": missing,
        "duplicate_number_count": len(duplicate_numbers),
        "duplicate_numbers": duplicate_numbers,
        "corrupt_count": len(corrupt),
        "corrupt_frames": corrupt,
        "dimensions": dict(dimensions),
        "analysis_seconds": round(elapsed, 3),
        "top_scene_changes": [
            {
                "frame": int(row["frame_number"]),
                "time_seconds": round((int(row["frame_number"]) - 1) / website.fps, 3),
                "probability": round(float(row["scene_probability"]), 6),
                "mean_difference": round(float(row["mean_difference"]), 6),
                "ssim": round(float(row["ssim"]), 6),
            }
            for row in scene_events
        ],
        "top_motion_peaks": [
            {
                "frame": int(row["frame_number"]),
                "time_seconds": round((int(row["frame_number"]) - 1) / website.fps, 3),
                "motion_score": round(float(row["motion_score"]), 6),
                "dx": int(row["motion_dx"]),
                "dy": int(row["motion_dy"]),
            }
            for row in motion_events
        ],
        "contact_sheets": {
            "ordered_all_frames": len(list((site_output / "ordered_all_frames").glob("*.jpg"))),
            "quarter_second": len(list((site_output / "contact_025s").glob("*.jpg"))),
            "half_second": len(list((site_output / "contact_050s").glob("*.jpg"))),
            "scene_changes": len(list((site_output / "scene_change_contacts").glob("*.jpg"))),
            "motion_peaks": len(list((site_output / "motion_peak_contacts").glob("*.jpg"))),
            "transition_strips": len(transition_strips),
            "elastic_text_dense": len(
                list((site_output / "elastic_text_dense_contacts").glob("*.jpg"))
            )
            if dense_rows
            else 0,
        },
    }
    connection.execute(
        """
        INSERT INTO website_summary (
            website, source_path, fps, file_count, parsed_frame_count, first_frame,
            last_frame, missing_count, duplicate_number_count, corrupt_count,
            dimensions_json, analysis_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            website.key,
            str(source),
            website.fps,
            len(files),
            len(parsed_valid),
            first,
            last,
            len(missing),
            len(duplicate_numbers),
            len(corrupt),
            json.dumps(dict(dimensions), sort_keys=True),
            elapsed,
        ),
    )
    connection.commit()
    (site_output / "summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )
    print(f"{website.label}: complete in {elapsed:.1f}s", flush=True)
    return summary


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    reference_root = args.reference_root.resolve()
    output_root = args.output_root.resolve()
    if not reference_root.is_dir():
        raise FileNotFoundError(reference_root)
    output_root.mkdir(parents=True, exist_ok=True)
    database_path = output_root / "reference-index.sqlite"
    connection = initialise_database(database_path)
    summaries: list[dict[str, object]] = []
    try:
        for website in WEBSITES:
            source = find_source(reference_root, website)
            summaries.append(
                analyse_website(
                    connection,
                    website,
                    source,
                    output_root,
                    args.top_events,
                    args.transition_strips,
                )
            )
    finally:
        connection.close()
    manifest = {
        "generated_at_local": time.strftime("%Y-%m-%d %H:%M:%S %z"),
        "reference_root": str(reference_root),
        "output_root": str(output_root),
        "database": {
            "path": str(database_path),
            "sha256": sha256(database_path),
            "bytes": database_path.stat().st_size,
        },
        "websites": summaries,
    }
    (output_root / "analysis-manifest.json").write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"status": "complete", "manifest": str(output_root / "analysis-manifest.json")}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
