#!/usr/bin/env python3
"""Export the published site's editable copy into one human-friendly TXT file."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import json
from pathlib import Path
import re
import textwrap
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup, NavigableString, Tag


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUTPUT = ROOT / "WEBSITE_TEXT_COPY_INVENTORY.txt"

ROUTE_ORDER = [
    "/",
    "/about/",
    "/work/",
    "/work/boilabin/",
    "/work/soctukit/",
    "/work/uiu-discord-bot/",
    "/lab/salty-potato-ai/",
    "/services/",
    "/services/website-development/",
    "/services/custom-software-development/",
    "/services/native-windows-software/",
    "/writing/",
    "/writing/what-a-university-notice-bot-needs-to-get-right/",
    "/writing/why-build-a-language-model-from-scratch/",
    "/now/",
    "/open-source/",
    "/resume/",
    "/search/",
    "/contact/",
    "/hire/",
    "/boilabin/seller-interest/",
    "/privacy/",
    "/404.html",
]

ROUTE_SOURCES = {
    "/": "src/pages/index.astro + src/components/WorkHolds.astro",
    "/about/": "src/pages/about.astro",
    "/work/": "src/pages/work/index.astro",
    "/work/boilabin/": "src/content/projects/boilabin.mdx + src/components/ProjectDetail.astro",
    "/work/soctukit/": "src/content/projects/soctukit.mdx + src/components/ProjectDetail.astro",
    "/work/uiu-discord-bot/": "src/content/projects/uiu-discord-bot.mdx + src/components/ProjectDetail.astro",
    "/lab/salty-potato-ai/": "src/content/projects/salty-potato-ai.mdx + src/pages/lab/salty-potato-ai.astro",
    "/services/": "src/pages/services/index.astro",
    "/services/website-development/": "src/content/services/website-development.mdx + src/components/ServiceDetail.astro",
    "/services/custom-software-development/": "src/content/services/custom-software-development.mdx + src/components/ServiceDetail.astro",
    "/services/native-windows-software/": "src/content/services/native-windows-software.mdx + src/components/ServiceDetail.astro",
    "/writing/": "src/pages/writing/index.astro",
    "/writing/what-a-university-notice-bot-needs-to-get-right/": "src/content/articles/what-a-university-notice-bot-needs-to-get-right.mdx",
    "/writing/why-build-a-language-model-from-scratch/": "src/content/articles/why-build-a-language-model-from-scratch.mdx",
    "/now/": "src/pages/now.astro + src/content/notes/*.mdx",
    "/open-source/": "src/pages/open-source.astro",
    "/resume/": "src/pages/resume.astro",
    "/search/": "src/pages/search.astro",
    "/contact/": "src/pages/contact.astro",
    "/hire/": "src/pages/hire.astro",
    "/boilabin/seller-interest/": "src/pages/boilabin/seller-interest.astro",
    "/privacy/": "src/pages/privacy.astro",
    "/404.html": "src/pages/404.astro",
}

BLOCK_TAGS = {
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "dt",
    "dd",
    "figcaption",
    "blockquote",
    "label",
    "button",
    "summary",
    "address",
    "pre",
}
SKIP_TAGS = {"script", "style", "template"}
CONTEXT_TAGS = {"header", "nav", "main", "section", "article", "aside", "footer", "form"}
ATTRIBUTE_COPY = {
    "alt": "Image alternative text",
    "aria-label": "Accessible label",
    "aria-description": "Accessible description",
    "placeholder": "Form placeholder",
    "title": "Tooltip/title attribute",
    "data-project-title": "Runtime project title",
    "data-project-description": "Runtime project description",
    "data-project-status": "Runtime project status",
}

RUNTIME_COPY = [
    {
        "route": "/",
        "source": "src/scripts/reference-opening-locked.ts",
        "location": "Opening identity telemetry > STATE",
        "type": "Runtime state choices",
        "text": "MOVING / REST",
    },
    {
        "route": "/search/",
        "source": "src/scripts/search.ts",
        "location": "Search results status",
        "type": "Empty-query message",
        "text": "Enter a term to search the production index.",
    },
    {
        "route": "/search/",
        "source": "src/scripts/search.ts",
        "location": "Search results status",
        "type": "Searching message pattern",
        "text": "Searching for “{search term}”…",
    },
    {
        "route": "/search/",
        "source": "src/scripts/search.ts",
        "location": "Search results status",
        "type": "No-results message pattern",
        "text": "No results for “{search term}”.",
    },
    {
        "route": "/search/",
        "source": "src/scripts/search.ts",
        "location": "Search results status",
        "type": "Results-count message pattern",
        "text": "{result count} result/results for “{search term}”.",
    },
    {
        "route": "/search/",
        "source": "src/scripts/search.ts",
        "location": "Search results status",
        "type": "Search-index error message",
        "text": "The search index is not available in this preview. Browse Work, Services, or Writing instead.",
    },
]


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def wrap_block(value: str, indent: str = "  ", width: int = 112) -> list[str]:
    if not value:
        return [f"{indent}[blank]"]
    return textwrap.wrap(
        value,
        width=width,
        initial_indent=indent,
        subsequent_indent=indent,
        break_long_words=False,
        break_on_hyphens=False,
    )


def route_to_file(route: str) -> Path:
    if route == "/":
        return DIST / "index.html"
    if route == "/404.html":
        return DIST / "404.html"
    return DIST / route.strip("/") / "index.html"


def element_descriptor(element: Tag) -> str:
    label = element.name.upper()
    if element.get("aria-label"):
        label += f'[{clean_text(str(element.get("aria-label")))}]'
    elif element.get("id"):
        label += f"#{element.get('id')}"
    else:
        classes = [item for item in element.get("class", []) if not item.startswith("astro-")]
        if classes:
            label += "." + ".".join(classes[:2])
    return label


def element_location(element: Tag) -> str:
    ancestors = [item for item in element.parents if isinstance(item, Tag)]
    ancestry = list(reversed(ancestors)) + [element]
    parts = [element_descriptor(item) for item in ancestry if item.name in CONTEXT_TAGS]
    if element.name not in CONTEXT_TAGS:
        parts.append(element_descriptor(element))
    return " > ".join(parts) or element_descriptor(element)


def owner_for_text(node: NavigableString) -> Tag | None:
    parent = node.parent
    if not isinstance(parent, Tag):
        return None
    if parent.name in SKIP_TAGS or any(
        isinstance(item, Tag) and item.name in SKIP_TAGS for item in parent.parents
    ):
        return None
    for ancestor in [parent, *parent.parents]:
        if isinstance(ancestor, Tag) and ancestor.name in BLOCK_TAGS:
            return ancestor
    for ancestor in [parent, *parent.parents]:
        if isinstance(ancestor, Tag) and ancestor.name in {"a", "button", "summary"}:
            return ancestor
    return parent


def copy_type(element: Tag) -> str:
    if element.name and re.fullmatch(r"h[1-6]", element.name):
        return f"Heading {element.name.upper()}"
    return {
        "p": "Paragraph",
        "li": "List item",
        "dt": "Definition term",
        "dd": "Definition detail",
        "figcaption": "Figure caption",
        "blockquote": "Quotation",
        "label": "Form label",
        "button": "Button",
        "summary": "Disclosure control",
        "address": "Address/contact block",
        "pre": "Preformatted/code block",
        "a": "Link",
    }.get(element.name, "Interface text")


def extract_entries(soup: BeautifulSoup) -> list[dict[str, str]]:
    body = soup.body
    if body is None:
        return []

    entries: list[dict[str, str]] = []
    seen_owners: set[int] = set()
    previous_key: tuple[str, str, str] | None = None

    for node in body.descendants:
        if not isinstance(node, NavigableString) or not clean_text(str(node)):
            continue
        owner = owner_for_text(node)
        if owner is None or id(owner) in seen_owners:
            continue
        seen_owners.add(id(owner))
        if owner.name in BLOCK_TAGS or owner.name in {"a", "button", "summary"}:
            value = clean_text(owner.get_text(" ", strip=True))
        else:
            value = clean_text(str(node))
        if not value:
            continue
        target = clean_text(str(owner.get("href", ""))) if owner.name == "a" else ""
        key = (value, element_location(owner), target)
        if key == previous_key:
            continue
        previous_key = key
        entries.append(
            {
                "type": copy_type(owner),
                "location": element_location(owner),
                "text": value,
                "target": target,
                "visibility": "Hidden in markup" if owner.has_attr("hidden") else "Published DOM",
            }
        )

    attribute_seen: set[tuple[str, str, str]] = set()
    for element in body.find_all(True):
        if element.name in SKIP_TAGS:
            continue
        for attribute, label in ATTRIBUTE_COPY.items():
            raw_value = element.get(attribute)
            if raw_value is None:
                continue
            value = clean_text(" ".join(raw_value) if isinstance(raw_value, list) else str(raw_value))
            if not value:
                continue
            key = (label, element_location(element), value)
            if key in attribute_seen:
                continue
            attribute_seen.add(key)
            entries.append(
                {
                    "type": label,
                    "location": element_location(element),
                    "text": value,
                    "target": "",
                    "visibility": "Attribute/accessibility copy",
                }
            )
        if element.name == "input" and element.get("type") in {"button", "submit", "reset"}:
            value = clean_text(str(element.get("value", "")))
            if value:
                entries.append(
                    {
                        "type": "Form control value",
                        "location": element_location(element),
                        "text": value,
                        "target": "",
                        "visibility": "Attribute/accessibility copy",
                    }
                )
    return entries


def extract_metadata(soup: BeautifulSoup) -> list[tuple[str, str]]:
    metadata: list[tuple[str, str]] = []
    title = clean_text(soup.title.get_text(" ", strip=True)) if soup.title else ""
    if title:
        metadata.append(("Document title", title))
    description = soup.find("meta", attrs={"name": "description"})
    if description and description.get("content"):
        metadata.append(("Meta description", clean_text(str(description.get("content")))))
    canonical = soup.find("link", attrs={"rel": "canonical"})
    if canonical and canonical.get("href"):
        metadata.append(("Canonical URL", clean_text(str(canonical.get("href")))))

    existing_values = {value for _, value in metadata}
    social_fields = [
        ("Open Graph title", {"property": "og:title"}),
        ("Open Graph description", {"property": "og:description"}),
        ("Twitter title", {"name": "twitter:title"}),
        ("Twitter description", {"name": "twitter:description"}),
    ]
    for label, attributes in social_fields:
        tag = soup.find("meta", attrs=attributes)
        value = clean_text(str(tag.get("content", ""))) if tag else ""
        if value and value not in existing_values:
            metadata.append((label, value))
            existing_values.add(value)
    return metadata


def route_code(route: str) -> str:
    if route == "/":
        return "HOME"
    if route == "/404.html":
        return "ERROR404"
    return re.sub(r"[^A-Z0-9]+", "-", route.strip("/").upper()).strip("-")


def render_entry(copy_id: str, entry: dict[str, str]) -> list[str]:
    lines = [
        f"[{copy_id}]",
        f"Location: {entry['location']}",
        f"Type: {entry['type']}",
        f"Exposure: {entry['visibility']}",
    ]
    if entry.get("target"):
        lines.append(f"Link target: {entry['target']}")
    lines.append("Current text:")
    lines.extend(wrap_block(entry["text"]))
    lines.extend(["Suggested replacement:", "  ", "Editor notes:", "  ", ""])
    return lines


def append_machine_copy(lines: list[str]) -> None:
    lines.extend(
        [
            "=" * 118,
            "PUBLISHED MACHINE-READABLE COPY",
            "=" * 118,
            "These endpoints are public but are not normal visual pages. They are included because they contain published wording.",
            "",
        ]
    )

    for filename, source in [
        ("llms.txt", "src/pages/llms.txt.ts"),
        ("robots.txt", "src/pages/robots.txt.ts"),
    ]:
        path = DIST / filename
        if not path.exists():
            continue
        lines.extend([f"--- /{filename} ---", f"Source: {source}", "Current published text:"])
        lines.extend(f"  {line}" for line in path.read_text(encoding="utf-8").splitlines())
        lines.extend(["", "Suggested replacement / notes:", "  ", ""])

    manifest_path = DIST / "site.webmanifest"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        lines.extend(["--- /site.webmanifest ---", "Source: src/pages/site.webmanifest.ts"])
        for key in ("name", "short_name", "description"):
            if key in manifest:
                lines.extend([f"{key}:", *wrap_block(str(manifest[key])), "Suggested replacement:", "  "])
        lines.append("")

    rss_path = DIST / "rss.xml"
    if rss_path.exists():
        root = ET.fromstring(rss_path.read_text(encoding="utf-8"))
        channel = root.find("channel")
        lines.extend(["--- /rss.xml ---", "Source: src/pages/rss.xml.ts"])
        if channel is not None:
            for tag_name in ("title", "description"):
                tag = channel.find(tag_name)
                if tag is not None and clean_text(tag.text or ""):
                    lines.extend([f"Channel {tag_name}:", *wrap_block(clean_text(tag.text or ""))])
            for index, item in enumerate(channel.findall("item"), start=1):
                lines.append(f"RSS item {index}:")
                for tag_name in ("title", "description"):
                    tag = item.find(tag_name)
                    if tag is not None and clean_text(tag.text or ""):
                        lines.extend([f"  {tag_name.capitalize()}:", *wrap_block(clean_text(tag.text or ""), indent="    ")])
        lines.extend(["", "Suggested replacement / notes:", "  ", ""])


def append_runtime_copy(lines: list[str]) -> None:
    lines.extend(
        [
            "=" * 118,
            "RUNTIME-GENERATED INTERFACE COPY",
            "=" * 118,
            "These messages are inserted or changed by JavaScript after the page loads, so they do not all exist in the initial HTML.",
            "Project titles, descriptions, and statuses used by the interactive gallery are included as route attributes above.",
            "",
        ]
    )
    for index, entry in enumerate(RUNTIME_COPY, start=1):
        lines.extend(
            [
                f"[RUNTIME-{index:03d}]",
                f"Route: {entry['route']}",
                f"Source: {entry['source']}",
                f"Location: {entry['location']}",
                f"Type: {entry['type']}",
                "Current text/pattern:",
                *wrap_block(entry["text"]),
                "Suggested replacement:",
                "  ",
                "Editor notes:",
                "  ",
                "",
            ]
        )

def main() -> None:
    if not DIST.exists():
        raise SystemExit("dist/ is missing. Run `npm run build` before exporting copy.")

    pages: dict[str, dict[str, object]] = {}
    text_routes: defaultdict[str, set[str]] = defaultdict(set)

    for route in ROUTE_ORDER:
        path = route_to_file(route)
        if not path.exists():
            raise SystemExit(f"Expected rendered route is missing: {route} ({path})")
        soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
        entries = extract_entries(soup)
        metadata = extract_metadata(soup)
        pages[route] = {"entries": entries, "metadata": metadata}
        for entry in entries:
            text_routes[str(entry["text"])].add(route)

    repeated = [
        (text, sorted(routes, key=lambda item: ROUTE_ORDER.index(item)))
        for text, routes in text_routes.items()
        if len(routes) >= 2 and len(text) >= 2
    ]
    repeated.sort(key=lambda item: (-len(item[1]), item[0].casefold()))

    lines = [
        "WEBSITE TEXT / COPY INVENTORY",
        "MD Anik Hasan portfolio",
        f"Generated: {datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %Z')}",
        "=" * 118,
        "",
        "PURPOSE",
        "This file inventories the wording currently published across the website so it can be reviewed and rewritten.",
        "It records complete copy blocks instead of splitting paragraphs into individual words.",
        "",
        "COVERAGE",
        f"- {len(ROUTE_ORDER)} rendered HTML routes",
        "- Visible DOM text in reading order",
        "- Navigation, headings, paragraphs, lists, buttons, links, labels, and interface text",
        "- Image alternative text, accessible labels, placeholders, tooltips, and page metadata",
        "- Public llms.txt, robots.txt, web manifest copy, and RSS titles/descriptions",
        "- Draft/unpublished content, source comments, console messages, CSS names, and code identifiers are intentionally excluded",
        "",
        "HOW TO USE",
        "1. Do not delete the copy ID or location line.",
        "2. Write improved wording under 'Suggested replacement'.",
        "3. Use 'Editor notes' for tone, intent, or factual corrections.",
        "4. Repeated navigation/footer copy appears on each applicable route so page-specific exceptions remain possible.",
        "",
        "LEGEND",
        "- Published DOM: wording present in the rendered page markup.",
        "- Attribute/accessibility copy: text used by assistive technology, forms, images, or tooltips.",
        "- Document metadata: browser/search/social description text.",
        "",
        "=" * 118,
        "REPEATED COPY INDEX",
        "=" * 118,
        "This is a quick index of wording used on two or more routes. Full editable entries still appear under every route.",
        "",
    ]

    for index, (text, routes) in enumerate(repeated, start=1):
        lines.extend(
            [
                f"[SHARED-{index:03d}]",
                f"Appears on {len(routes)} routes: {', '.join(routes)}",
                "Current text:",
                *wrap_block(text),
                "",
            ]
        )

    for route_number, route in enumerate(ROUTE_ORDER, start=1):
        page = pages[route]
        entries = page["entries"]
        metadata = page["metadata"]
        code = route_code(route)
        lines.extend(
            [
                "=" * 118,
                f"ROUTE {route_number:02d}: {route}",
                "=" * 118,
                f"Primary source: {ROUTE_SOURCES.get(route, '[source mapping unavailable]')}",
                f"Rendered file: {route_to_file(route).relative_to(ROOT).as_posix()}",
                f"Copy blocks: {len(entries)}",
                "",
                "PAGE METADATA",
                "-" * 118,
            ]
        )
        for metadata_index, (label, value) in enumerate(metadata, start=1):
            lines.extend(
                [
                    f"[{code}-META-{metadata_index:02d}]",
                    f"Type: {label}",
                    "Current text:",
                    *wrap_block(value),
                    "Suggested replacement:",
                    "  ",
                    "",
                ]
            )
        lines.extend(["PAGE AND INTERFACE COPY", "-" * 118, ""])
        for entry_index, entry in enumerate(entries, start=1):
            lines.extend(render_entry(f"{code}-{entry_index:03d}", entry))

    append_runtime_copy(lines)
    append_machine_copy(lines)
    lines.extend(
        [
            "=" * 118,
            "END OF INVENTORY",
            "=" * 118,
            f"Routes inventoried: {len(ROUTE_ORDER)}",
            f"Route copy blocks inventoried: {sum(len(page['entries']) for page in pages.values())}",
            f"Repeated-copy index entries: {len(repeated)}",
            "",
        ]
    )

    OUTPUT.write_text("\n".join(lines), encoding="utf-8-sig", newline="\n")
    print(OUTPUT)
    print(f"routes={len(ROUTE_ORDER)}")
    print(f"copy_blocks={sum(len(page['entries']) for page in pages.values())}")
    print(f"repeated_entries={len(repeated)}")


if __name__ == "__main__":
    main()
