import fs from "node:fs";
import path from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const OUTPUT = path.join(ROOT, "aligned_chronologies.html");
const BOOK_LINE_ANCHORS = JSON.parse(fs.readFileSync(path.join(ROOT, "book_line_anchors.json"), "utf8"));
const WEB_SOURCE_ANCHOR_RULES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "web_source_anchor_rules.json"), "utf8"),
);
const LOCATION_ANCHOR_RULES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "location_anchor_rules.json"), "utf8"),
);

const FULLER_CLOSE_READING = {
  bookId: 125,
  chapterIds: {
    FPref: 6961,
    F1: 6962,
    F2: 6963,
    F3: 6964,
    F4: 6965,
    F5: 6966,
    F6: 6967,
    F7: 6968,
    F8: 6969,
    F9: 6970,
    F10: 6971,
    F11: 6972,
    F12: 6973,
    F13: 6974,
    F14: 6975,
    F15: 6976,
    F16: 6977,
    F17: 6978,
    F18: 6979,
    F19: 6980,
    F20: 6981,
    F21: 6982,
    F22: 6983,
    F23: 6984,
    F24: 6985,
  },
  lineAnchors: BOOK_LINE_ANCHORS,
};

const BOOK_CHRONOLOGY_FILES = [
  {
    id: "book",
    title: "Book",
    subtitle: "The Book That Changed America",
    file: "the_book_that_changed_america_chronology.md",
    kind: "book",
    defaultVisible: true,
    closeReading: FULLER_CLOSE_READING,
    color: "#255f85",
  },
];

const PERSON_CHRONOLOGY_FILES = [
  {
    id: "thoreau",
    title: "Thoreau",
    subtitle: "Henry David Thoreau",
    file: "thoreau_chronology.md",
    kind: "person",
    defaultVisible: true,
    color: "#3b7d4f",
  },
  {
    id: "sanborn",
    title: "Sanborn",
    subtitle: "Franklin Benjamin Sanborn",
    file: "sanborn_chronology.md",
    kind: "person",
    defaultVisible: false,
    color: "#9f4d3f",
  },
  {
    id: "brace",
    title: "Brace",
    subtitle: "Charles Loring Brace",
    file: "brace_chronology.md",
    kind: "person",
    defaultVisible: false,
    color: "#6c58a8",
  },
  {
    id: "alcott",
    title: "Alcott",
    subtitle: "Amos Bronson Alcott",
    file: "bronson_alcott_chronology.md",
    kind: "person",
    defaultVisible: false,
    color: "#a66a20",
  },
  {
    id: "emerson",
    title: "Emerson",
    subtitle: "Ralph Waldo Emerson",
    file: "emerson_chronology.md",
    kind: "person",
    defaultVisible: false,
    color: "#2f7f7b",
  },
  {
    id: "darwin",
    title: "Darwin",
    subtitle: "Charles Darwin",
    file: "darwin_chronology.md",
    kind: "person",
    defaultVisible: false,
    color: "#677a2f",
  },
  {
    id: "john-brown",
    title: "John Brown",
    subtitle: "Abolition crisis",
    file: "john_brown_chronology.md",
    kind: "person",
    defaultVisible: false,
    color: "#8c3f5b",
  },
];

const CHRONOLOGY_FILES = [...BOOK_CHRONOLOGY_FILES, ...PERSON_CHRONOLOGY_FILES];

const FOCUS_CHRONOLOGY = {
  id: "crisis-1858-1862",
  title: "1858-1862 Zoom",
  subtitle: "Brown, Origin, Sanborn, Thoreau",
  file: "crisis_1858_1862_chronology.md",
  color: "#7f4a2d",
  minYear: 1858,
  maxYear: 1862,
};

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const MONTH_NAMES = Object.keys(MONTHS)
  .map((month) => month[0].toUpperCase() + month.slice(1))
  .join("|");

const MODIFIER_DAY = {
  early: 5,
  mid: 15,
  late: 25,
  "toward the end of": 25,
  "toward end of": 25,
};

function readLocal(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function sourceKeyMap(markdown, config = {}) {
  const closeReading = config.closeReading || {};
  const chapterIds = closeReading.chapterIds || {};
  const chapterBase = closeReading.bookId
    ? `https://closereading.rahuldave.us/books/${closeReading.bookId}/chapters`
    : "";
  const lineAnchors = closeReading.lineAnchors || {};
  const map = {};
  for (const line of markdown.split(/\r?\n/)) {
    const external = line.match(/^- \[([^\]]+)\]\((<[^>]+>|[^)]+)\)\s+-\s+(.+)$/);
    if (external) {
      map[external[1]] = {
        href: external[2].replace(/^<|>$/g, ""),
        label: external[1],
        display: external[3].replace(/\.$/, ""),
        description: external[3],
        kind: "web",
      };
      continue;
    }
    const book = line.match(/^\| ([A-Za-z][A-Za-z0-9_-]*) \| ([^|]+) \| `book\.md:([^`]+)` \|/);
    if (book) {
      const key = book[1];
      const lineRange = book[3];
      const lineNumber = lineRange.split("-")[0];
      const description = book[2].trim();
      const anchor = bookAnchorForLineRange(lineRange, lineAnchors);
      const chapterId = chapterIds[key] || anchor?.start?.chapterId;
      if (!chapterId) {
        throw new Error(`Missing Close Reading chapter id for ${key}`);
      }
      map[key] = {
        href: anchor ? anchor.start.href : `${chapterBase}/${chapterId}`,
        label: key,
        display: anchor
          ? `${formatChapterReference(description)}, ${cellRangeLabel(anchor)} (book.md:${lineRange})`
          : `${formatChapterReference(description)} (Close Reading chapter ${chapterId}; book.md:${lineNumber})`,
        description,
        lineNumber,
        chapterId,
        kind: "book",
      };
    }
  }
  return map;
}

function mergeSourceMaps(maps) {
  const merged = {};
  for (const map of maps) {
    for (const [key, source] of Object.entries(map)) {
      if (merged[key]) {
        if (merged[key].href === source.href) continue;
        throw new Error(`Duplicate source key ${key} maps to both ${merged[key].href} and ${source.href}`);
      }
      merged[key] = source;
    }
  }
  return merged;
}

function formatChapterReference(description) {
  if (description === "Preface") return "Preface";
  const chapter = description.match(/^(\d+)\.\s*(.+)$/);
  if (!chapter) return description;
  return `Chapter ${chapter[1]}: ${chapter[2]}`;
}

function parseChronology(markdown, chronoId) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let inChronology = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "## Chronology") {
      inChronology = true;
      continue;
    }
    if (inChronology && /^##\s+/.test(line) && line.trim() !== "## Chronology") {
      break;
    }
    if (!inChronology) continue;

    const bullet = line.match(/^- \*\*(.+?)\*\*\s*(.*)$/);
    if (!bullet) continue;

    const bold = bullet[1].trim();
    const rest = bullet[2].trim();
    const separator = bold.match(/^(.+?)\s+-\s+(.+)$/);
    if (!separator) continue;

    const dateLabel = separator[1].trim();
    const title = separator[2].trim();
    const dates = parseDateLabel(dateLabel);
    const meta = parseMeta(rest);
    const details = [];
    let lookahead = i + 1;
    while (lookahead < lines.length) {
      const detail = lines[lookahead].match(/^\s{2,}-\s+(.+)$/);
      if (detail) {
        details.push(detail[1].trim());
        lookahead += 1;
        continue;
      }
      if (lines[lookahead].trim() === "") {
        lookahead += 1;
        continue;
      }
      break;
    }
    i = lookahead - 1;

    entries.push({
      id: `${chronoId}-${entries.length + 1}`,
      chronologyId: chronoId,
      dateLabel,
      title,
      summary: meta.summary,
      details,
      bookAnchors: bookAnchorsFromDetails(details),
      check: meta.check,
      sources: meta.sources,
      start: dates.start,
      end: dates.end,
      confidence: dates.confidence,
    });
  }

  return entries;
}

function bookAnchorsFromDetails(details) {
  const anchors = [];
  const seen = new Set();
  for (const detail of details) {
    if (!detail.includes("book.md:")) continue;
    for (const match of detail.matchAll(/book\.md:(\d+)(?:-(\d+))?/g)) {
      const lineRange = `${match[1]}-${match[2] || match[1]}`;
      const anchor = bookAnchorForLineRange(lineRange);
      if (!anchor) {
        throw new Error(`Missing cell anchor for book.md:${lineRange}`);
      }
      const key = `${lineRange}:${anchor.start.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      anchors.push({
        href: anchor.start.href,
        display: `${formatAnchorChapterTitle(anchor)}, ${cellRangeLabel(anchor)} (book.md:${lineRange})`,
        description: `${formatAnchorChapterTitle(anchor)} ${cellRangeLabel(anchor)}; ${anchor.start.sameBookRef}`,
        lineStart: anchor.lineStart,
        lineEnd: anchor.lineEnd,
        cellStart: anchor.start.cellIndex,
        cellEnd: anchor.end.cellIndex,
        chapterId: anchor.start.chapterId,
        kind: "book-cell",
      });
    }
  }
  return anchors;
}

function sourceTokensFromText(text, sources = null) {
  if (!text) return [];
  if (sources) {
    const tokens = text.match(/[A-Za-z][A-Za-z0-9_-]*/g) || [];
    return [...new Set(tokens.filter((token) => Object.prototype.hasOwnProperty.call(sources, token)))];
  }
  const matches = text.match(/\b(?:F\d+|FPref|[A-Z][A-Za-z]+(?:-[A-Za-z0-9]+)+|W-[A-Za-z0-9]+)\b/g);
  return [...new Set(matches || [])];
}

function enrichWebAnchors(entries, sources) {
  return entries.map((entry) => ({
    ...entry,
    webAnchors: webAnchorsForEntry(entry, sources),
  }));
}

function enrichLocationLinks(entries) {
  return entries.map((entry) => ({
    ...entry,
    locationLinks: locationLinksForEntry(entry),
  }));
}

function locationLinksForEntry(entry) {
  const links = LOCATION_ANCHOR_RULES.events?.[entry.id] || [];
  const baseUrl = LOCATION_ANCHOR_RULES.atlas_base_url;
  return links.map((link) => ({
    href: link.href || `${baseUrl}?place=${encodeURIComponent(link.place_id)}`,
    display: link.label || link.place_id,
    description: link.note || `Location atlas record for ${link.label || link.place_id}`,
    placeId: link.place_id,
    kind: "location",
  }));
}

function webAnchorsForEntry(entry, sources) {
  const anchors = [];
  const seen = new Set();
  const haystack = [
    entry.dateLabel,
    entry.title,
    entry.summary,
    entry.check,
    entry.sources,
    ...entry.details,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const token of sourceTokensFromText(entry.sources, sources)) {
    const source = sources[token];
    const rules = WEB_SOURCE_ANCHOR_RULES[token];
    if (!source || source.kind !== "web" || !Array.isArray(rules)) continue;

    for (const rule of rules) {
      if (!anchorRuleMatches(rule, haystack)) continue;
      const href = anchoredHref(source.href, rule.href || rule.anchor);
      const key = `${token}:${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      anchors.push({
        href,
        display: `${source.display || source.description || token} - ${rule.label || "relevant section"}`,
        description: `${source.description || source.display || token}; nearest stable section: ${
          rule.label || rule.anchor || rule.href
        }`,
        kind: "web-anchor",
        sourceKey: token,
      });
    }
  }

  return anchors;
}

function anchorRuleMatches(rule, haystack) {
  if (rule.always) return true;
  if (!Array.isArray(rule.match)) return false;
  return rule.match.some((term) => haystack.includes(String(term).toLowerCase()));
}

function anchoredHref(baseHref, anchor) {
  if (!anchor) return baseHref;
  if (/^https?:\/\//i.test(anchor)) return anchor;
  const url = new URL(baseHref);
  url.hash = anchor.startsWith("#") ? anchor.slice(1) : anchor;
  return url.toString();
}

function bookAnchorForLineRange(lineRange, lineAnchors = BOOK_LINE_ANCHORS) {
  const [start, end = start] = lineRange.split("-").map((value) => Number(value));
  const exact = lineAnchors[`${start}-${end}`];
  if (exact) return exact;
  return Object.entries(lineAnchors)
    .map(([range, anchor]) => {
      const [rangeStart, rangeEnd = rangeStart] = range.split("-").map((value) => Number(value));
      return { rangeStart, rangeEnd, anchor };
    })
    .find(({ rangeStart, rangeEnd }) => rangeStart <= start && rangeEnd >= end)?.anchor;
}

function formatAnchorChapterTitle(anchor) {
  const title = anchor.start.chapterTitle;
  const chapter = title.match(/^(\d+):\s*(.+)$/);
  return chapter ? `Chapter ${chapter[1]}: ${chapter[2]}` : title;
}

function cellRangeLabel(anchor) {
  const start = blockLabel(anchor.start);
  const end = blockLabel(anchor.end);
  return start === end ? start : `${start}-${end}`;
}

function blockLabel(cell) {
  return cell.sameBookRef.split("/").at(-1);
}

function parseMeta(text) {
  const meta = { summary: text, check: "", sources: "" };
  const sourceMatch = text.match(/\s+(Book: .+?\. Web: .+)$|\s+(Sources: .+)$/);
  if (sourceMatch) {
    meta.sources = (sourceMatch[1] || sourceMatch[2] || "").trim();
    meta.summary = text.slice(0, sourceMatch.index).trim();
  }

  const checkIndex = meta.summary.indexOf("Check:");
  if (checkIndex >= 0) {
    meta.check = meta.summary
      .slice(checkIndex + "Check:".length)
      .replace(/\.\s*$/, "")
      .trim();
    meta.summary = meta.summary.slice(0, checkIndex).trim();
  }

  return meta;
}

function parseDateLabel(label) {
  const original = label.trim();
  const clean = original
    .replace(/^A golden\s+/i, "")
    .replace(/^One\s+/i, "")
    .replace(/\s+day$/i, "")
    .replace(/\s+week$/i, "")
    .trim();

  const fullDateRangePattern = new RegExp(
    `^(${MONTH_NAMES})\\s+(\\d{1,2}),\\s*(\\d{4})-(${MONTH_NAMES})\\s+(\\d{1,2}),\\s*(\\d{4})$`,
    "i",
  );
  const fullDateRange = clean.match(fullDateRangePattern);
  if (fullDateRange) {
    const startMonth = MONTHS[fullDateRange[1].toLowerCase()];
    const endMonth = MONTHS[fullDateRange[4].toLowerCase()];
    return span(
      Number(fullDateRange[3]),
      startMonth,
      Number(fullDateRange[2]),
      Number(fullDateRange[6]),
      endMonth,
      Number(fullDateRange[5]),
      "range",
    );
  }

  const crossMonthDayRangePattern = new RegExp(
    `^(${MONTH_NAMES})\\s+(\\d{1,2})-(${MONTH_NAMES})\\s+(\\d{1,2}),\\s*(\\d{4})$`,
    "i",
  );
  const crossMonthDayRange = clean.match(crossMonthDayRangePattern);
  if (crossMonthDayRange) {
    const startMonth = MONTHS[crossMonthDayRange[1].toLowerCase()];
    const endMonth = MONTHS[crossMonthDayRange[3].toLowerCase()];
    const year = Number(crossMonthDayRange[5]);
    return span(
      year,
      startMonth,
      Number(crossMonthDayRange[2]),
      year,
      endMonth,
      Number(crossMonthDayRange[4]),
      "range",
    );
  }

  const sameMonthDayRangePattern = new RegExp(
    `^(${MONTH_NAMES})\\s+(\\d{1,2})-(\\d{1,2}),\\s*(\\d{4})$`,
    "i",
  );
  const sameMonthDayRange = clean.match(sameMonthDayRangePattern);
  if (sameMonthDayRange) {
    const month = MONTHS[sameMonthDayRange[1].toLowerCase()];
    const year = Number(sameMonthDayRange[4]);
    return span(
      year,
      month,
      Number(sameMonthDayRange[2]),
      year,
      month,
      Number(sameMonthDayRange[3]),
      "range",
    );
  }

  const exactPattern = new RegExp(
    `^(?:(Early|Mid|Late|Toward the end of)\\s+)?(${MONTH_NAMES})\\s+(\\d{1,2})(?:\\s+or\\s+\\d{1,2}|-\\d{1,2})?,\\s*(\\d{4})$`,
    "i",
  );
  const exact = clean.match(exactPattern);
  if (exact) {
    const day = Number(exact[3]);
    const month = MONTHS[exact[2].toLowerCase()];
    const year = Number(exact[4]);
    return point(year, month, day, "exact");
  }

  const monthRangePattern = new RegExp(
    `^(?:(Early|Mid|Late)\\s+)?(${MONTH_NAMES})-(${MONTH_NAMES})\\s+(\\d{4})$`,
    "i",
  );
  const monthRange = clean.match(monthRangePattern);
  if (monthRange) {
    const startMonth = MONTHS[monthRange[2].toLowerCase()];
    const endMonth = MONTHS[monthRange[3].toLowerCase()];
    const year = Number(monthRange[4]);
    return span(
      year,
      startMonth,
      modifierDay(monthRange[1], 1),
      year,
      endMonth,
      daysInMonth(year, endMonth),
      "month range",
    );
  }

  const monthPattern = new RegExp(
    `^(?:(Early|Mid|Late|Toward the end of)\\s+)?(${MONTH_NAMES})\\s+(\\d{4})$`,
    "i",
  );
  const month = clean.match(monthPattern);
  if (month) {
    const year = Number(month[3]);
    const monthNum = MONTHS[month[2].toLowerCase()];
    return point(year, monthNum, modifierDay(month[1], 15), "month");
  }

  const season = clean.match(/^(Spring|Summer|Autumn|Fall|Winter)\s+(\d{4})$/i);
  if (season) {
    const seasonMonth = {
      spring: 4,
      summer: 7,
      autumn: 10,
      fall: 10,
      winter: 1,
    }[season[1].toLowerCase()];
    return point(Number(season[2]), seasonMonth, 15, "season");
  }

  const modifiedYear = clean.match(/^(Early|Mid|Late)\s+(\d{4})$/i);
  if (modifiedYear) {
    const month = { early: 2, mid: 7, late: 11 }[modifiedYear[1].toLowerCase()];
    return point(Number(modifiedYear[2]), month, 15, "year");
  }

  const decadeRange = clean.match(/^(\d{4})s-(\d{4})$/);
  if (decadeRange) {
    return span(Number(decadeRange[1]), 1, 1, Number(decadeRange[2]), 12, 31, "range");
  }

  const yearRange = clean.match(/^(\d{4})-(\d{4})$/);
  if (yearRange) {
    return span(Number(yearRange[1]), 1, 1, Number(yearRange[2]), 12, 31, "range");
  }

  const firstYear = clean.match(/(\d{4})/);
  if (firstYear) {
    return point(Number(firstYear[1]), 7, 1, "year");
  }

  return point(1860, 1, 1, "fallback");
}

function modifierDay(modifier, fallback) {
  if (!modifier) return fallback;
  return MODIFIER_DAY[modifier.toLowerCase()] || fallback;
}

function point(year, month, day, confidence) {
  const value = dateValue(year, month, day);
  return {
    start: { year, month, day, value },
    end: { year, month, day, value },
    confidence,
  };
}

function span(startYear, startMonth, startDay, endYear, endMonth, endDay, confidence) {
  return {
    start: {
      year: startYear,
      month: startMonth,
      day: startDay,
      value: dateValue(startYear, startMonth, startDay),
    },
    end: {
      year: endYear,
      month: endMonth,
      day: endDay,
      value: dateValue(endYear, endMonth, endDay),
    },
    confidence,
  };
}

function dateValue(year, month, day) {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (current - start) / (end - start);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const sources = mergeSourceMaps(
  BOOK_CHRONOLOGY_FILES.map((config) => sourceKeyMap(readLocal(config.file), config)),
);
const chronologies = CHRONOLOGY_FILES.map((config) => {
  const markdown = readLocal(config.file);
  return {
    ...config,
    entries: enrichLocationLinks(enrichWebAnchors(parseChronology(markdown, config.id), sources)),
  };
});

const allEntries = chronologies.flatMap((chronology) => chronology.entries);
const minYear = Math.floor(Math.min(...allEntries.map((entry) => entry.start.value))) - 1;
const maxYear = Math.ceil(Math.max(...allEntries.map((entry) => entry.end.value))) + 1;
const eventsPerYear = {};
for (const entry of allEntries) {
  const start = Math.floor(entry.start.value);
  const end = Math.floor(entry.end.value);
  for (let year = start; year <= end; year += 1) {
    eventsPerYear[year] = (eventsPerYear[year] || 0) + 1;
  }
}

const focusMarkdown = readLocal(FOCUS_CHRONOLOGY.file);
const focusChronology = {
  ...FOCUS_CHRONOLOGY,
  entries: enrichLocationLinks(enrichWebAnchors(parseChronology(focusMarkdown, FOCUS_CHRONOLOGY.id), sources)),
};
const focusEventsPerYear = {};
for (const entry of focusChronology.entries) {
  const start = Math.max(FOCUS_CHRONOLOGY.minYear, Math.floor(entry.start.value));
  const end = Math.min(FOCUS_CHRONOLOGY.maxYear, Math.floor(entry.end.value));
  for (let year = start; year <= end; year += 1) {
    focusEventsPerYear[year] = (focusEventsPerYear[year] || 0) + 1;
  }
}

const model = {
  generatedAt: new Date().toISOString(),
  minYear,
  maxYear,
  eventsPerYear,
  focusMinYear: FOCUS_CHRONOLOGY.minYear,
  focusMaxYear: FOCUS_CHRONOLOGY.maxYear,
  focusEventsPerYear,
  focusChronology,
  sources,
  chronologies,
};

fs.writeFileSync(OUTPUT, renderHtml(model), "utf8");
console.log(OUTPUT);
writeChronologyPages(chronologies, focusChronology, sources);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function writeChronologyPages(chronologies, focusChronology, sources) {
  for (const chronology of [...chronologies, focusChronology]) {
    const output = path.join(ROOT, chronology.file.replace(/\.md$/, ".html"));
    fs.writeFileSync(output, renderChronologyPage(chronology, sources), "utf8");
    console.log(output);
  }
}

function renderChronologyPage(chronology, sources) {
  const eventHtml = chronology.entries.map((entry) => renderChronologyEntry(chronology, entry, sources)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(chronology.title)} Chronology</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #22262a;
      --muted: #606973;
      --line: #ded7ca;
      --paper: #f8f6f0;
      --panel: #fffdf8;
      --accent: ${chronology.color || "#315f8f"};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font: 15px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 18px 22px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 253, 248, 0.96);
    }
    main { max-width: 980px; margin: 0 auto; padding: 22px; }
    h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: 0; }
    h1 a { color: inherit; text-decoration: none; }
    h1 a:hover, h1 a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
    .subtle { color: var(--muted); }
    a { color: #255f85; font-weight: 700; text-decoration: none; }
    .event {
      margin: 16px 0;
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-left: 5px solid var(--accent);
      border-radius: 6px;
      background: var(--panel);
      scroll-margin-top: 92px;
    }
    .event:target {
      outline: 3px solid color-mix(in srgb, var(--accent) 28%, transparent);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9);
    }
    time { display: block; color: var(--accent); font-weight: 850; }
    h2 { margin: 3px 0 8px; font-size: 18px; letter-spacing: 0; }
    p { margin: 8px 0; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .links a, .links span {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: white;
      font-size: 12px;
      line-height: 1.35;
    }
    .section-label {
      margin-top: 12px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <header>
    <h1><a href="index.html">${escapeHtml(chronology.title)} Chronology</a></h1>
    <div class="subtle">${escapeHtml(chronology.subtitle || "")}</div>
    <div><a href="aligned_chronologies.html">Aligned timeline</a></div>
  </header>
  <main>
    ${eventHtml}
  </main>
</body>
</html>
`;
}

function renderChronologyEntry(chronology, entry, sources) {
  const links = entryLinks(entry, sources);
  const locationHtml = entry.locationLinks?.length
    ? `<div class="section-label">Locations</div><div class="links">${entry.locationLinks
        .map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.display)}</a>`)
        .join("")}</div>`
    : "";
  const sourceHtml = links.length
    ? `<div class="section-label">Sources</div><div class="links">${links
        .map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.display)}</a>`)
        .join("")}</div>`
    : "";
  const details = entry.details
    .filter((detail) => !detail.startsWith("Lane:"))
    .map((detail) => `<p>${inlineMarkdown(detail)}</p>`)
    .join("");
  const lines = [
    `<article class="event" id="event-${escapeAttribute(entry.id)}">`,
    `    <time>${escapeHtml(entry.dateLabel)}</time>`,
    `    <h2>${escapeHtml(entry.title)}</h2>`,
  ];
  if (entry.summary) lines.push(`    <p>${escapeHtml(entry.summary)}</p>`);
  if (details) lines.push(`    ${details}`);
  if (entry.check) lines.push(`    <p class="subtle"><strong>Check:</strong> ${escapeHtml(entry.check)}</p>`);
  lines.push(`    <p><a href="aligned_chronologies.html#event-${escapeAttribute(entry.id)}">Open in aligned timeline</a></p>`);
  if (locationHtml) lines.push(`    ${locationHtml}`);
  if (sourceHtml) lines.push(`    ${sourceHtml}`);
  lines.push("  </article>");
  return lines.join("\n");
}

function entryLinks(entry, sources) {
  const links = [];
  const seen = new Set();
  const add = (link) => {
    if (!link?.href || seen.has(link.href)) return;
    seen.add(link.href);
    links.push(link);
  };
  for (const link of entry.bookAnchors || []) add({ href: link.href, display: link.display });
  for (const link of entry.webAnchors || []) add({ href: link.href, display: link.display });
  const anchoredWebSourceKeys = new Set((entry.webAnchors || []).map((source) => source.sourceKey));
  for (const token of sourceTokensFromText(entry.sources, sources)) {
    const source = sources[token];
    if (!source) continue;
    if ((entry.bookAnchors || []).length && source.kind === "book") continue;
    if (anchoredWebSourceKeys.has(token) && source.kind === "web") continue;
    add({ href: source.href, display: source.display || source.description || token });
  }
  return links;
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function renderHtml(data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aligned Chronologies - The Book That Changed America</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f4ef;
      --panel: #fffdf8;
      --ink: #22262a;
      --muted: #66717c;
      --line: #d9d3c8;
      --grid: rgba(74, 83, 92, 0.18);
      --shadow: 0 10px 24px rgba(38, 34, 28, 0.12);
      --radius: 8px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(90deg, rgba(37, 95, 133, 0.06), transparent 34%),
        linear-gradient(180deg, #fbfaf7, var(--bg));
    }

    header {
      position: sticky;
      top: 0;
      z-index: 20;
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(280px, auto);
      gap: 18px;
      align-items: center;
      padding: 14px 18px;
      background: rgba(255, 253, 248, 0.94);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(12px);
    }

    h1 {
      margin: 0;
      font-size: 18px;
      line-height: 1.1;
      letter-spacing: 0;
    }

    h1 a {
      color: inherit;
      text-decoration: none;
    }

    h1 a:hover, h1 a:focus-visible {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .subhead {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }

    .controls {
      display: grid;
      gap: 8px;
      justify-items: end;
    }

    .view-tabs {
      display: inline-flex;
      gap: 4px;
      padding: 3px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #f2eee6;
    }

    .view-tab {
      min-height: 30px;
      padding: 5px 10px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #46515c;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .view-tab.active {
      background: #fff;
      color: var(--ink);
      box-shadow: 0 1px 4px rgba(38, 34, 28, 0.1);
    }

    .toggles,
    .focus-toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
    }

    .toggle-group {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .toggle-group-title {
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 32px;
      padding: 6px 9px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
      color: var(--ink);
      font-size: 12px;
      white-space: nowrap;
    }

    .toggle input {
      accent-color: var(--accent, #255f85);
      margin: 0;
    }

    body.focus-mode .toggles { display: none; }
    body:not(.focus-mode) .focus-toggles { display: none; }

    .view-panel[hidden] { display: none; }

    .timeline-viewport {
      overflow-x: auto;
      overflow-y: visible;
      border-top: 1px solid rgba(255,255,255,0.8);
    }

    .timeline-stage {
      position: relative;
      min-width: max-content;
      padding: 26px 28px 120px 92px;
    }

    .gridline {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--grid);
    }

    .year-label {
      position: absolute;
      left: 18px;
      width: 56px;
      transform: translateY(-50%);
      color: #59636e;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .columns {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 22px;
    }

    .column {
      position: relative;
      flex: 0 0 358px;
      min-height: var(--timeline-height);
      padding-top: 44px;
    }

    .column.hidden { display: none; }

    .column-header {
      position: sticky;
      top: 70px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 44px;
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid color-mix(in srgb, var(--accent) 28%, #d8d2c6);
      border-radius: var(--radius);
      background: rgba(255, 253, 248, 0.96);
      box-shadow: 0 4px 12px rgba(38, 34, 28, 0.08);
    }

    .column-title {
      display: grid;
      gap: 2px;
    }

    .column-title strong {
      font-size: 14px;
      letter-spacing: 0;
    }

    .column-title span {
      color: var(--muted);
      font-size: 11px;
    }

    .count {
      display: inline-grid;
      min-width: 30px;
      height: 24px;
      place-items: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 12%, #fff);
      color: color-mix(in srgb, var(--accent) 70%, #222);
      font-size: 11px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .spine {
      position: absolute;
      left: 24px;
      top: 102px;
      bottom: 0;
      width: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 70%, #c5bdad);
    }

    .range {
      position: absolute;
      left: 19px;
      width: 13px;
      min-height: 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 22%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    }

    .dot {
      position: absolute;
      left: 16px;
      width: 19px;
      height: 19px;
      transform: translateY(-50%);
      border: 3px solid #fff;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 55%, #5a4e43);
    }

    .event {
      position: absolute;
      left: 52px;
      width: 286px;
      min-height: 48px;
      padding: 7px 9px;
      border: 1px solid color-mix(in srgb, var(--accent) 22%, #d7d0c4);
      border-left: 4px solid var(--accent);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 3px 10px rgba(38, 34, 28, 0.08);
      cursor: pointer;
      text-align: left;
    }

    .event:focus {
      outline: 3px solid color-mix(in srgb, var(--accent) 28%, transparent);
      outline-offset: 2px;
    }

    .event time {
      display: block;
      margin-bottom: 2px;
      color: color-mix(in srgb, var(--accent) 68%, #30363b);
      font-size: 11px;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .event .label {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      font-size: 12px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .event .check {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.2;
    }

    .leader {
      position: absolute;
      left: 35px;
      width: 18px;
      height: 1px;
      transform-origin: left center;
      background: color-mix(in srgb, var(--accent) 38%, #9b9488);
    }

    .drawer {
      position: fixed;
      z-index: 40;
      right: 16px;
      bottom: 16px;
      width: min(560px, calc(100vw - 32px));
      max-height: min(68vh, 720px);
      overflow: auto;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255, 253, 248, 0.98);
      box-shadow: var(--shadow);
    }

    .drawer[hidden] { display: none; }

    .drawer-top {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 14px;
    }

    .drawer h2 {
      margin: 0;
      font-size: 16px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .drawer time {
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .drawer button {
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
      color: var(--ink);
      font-size: 18px;
      cursor: pointer;
    }

    .drawer-summary {
      display: grid;
      gap: 9px;
      margin-top: 12px;
    }

    .drawer-summary p,
    .drawer p {
      margin: 12px 0 0;
      color: #343a40;
      font-size: 13px;
      line-height: 1.5;
    }

    .drawer-summary p {
      margin: 0;
    }

    .detail-label {
      font-weight: 800;
      color: #1f2933;
    }

    .drawer-section-title {
      margin: 14px 0 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .source-list {
      display: grid;
      gap: 7px;
      margin-top: 14px;
    }

    .source-list a,
    .source-list span {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 5px 8px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
      color: #244a68;
      font-size: 11px;
      line-height: 1.35;
      text-decoration: none;
      text-align: left;
      white-space: normal;
    }

    .source-list span { color: var(--muted); }

    .focus-viewport {
      overflow-x: auto;
      overflow-y: visible;
      border-top: 1px solid rgba(255,255,255,0.8);
    }

    .focus-stage {
      position: relative;
      min-width: max-content;
      padding: 26px 28px 120px 92px;
    }

    .focus-layout {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }

    .focus-lane {
      position: relative;
      flex: 0 0 292px;
      min-height: var(--focus-height);
      padding-top: 44px;
    }

    .focus-lane-header {
      position: sticky;
      top: 88px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 44px;
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid color-mix(in srgb, var(--accent) 28%, #d8d2c6);
      border-radius: var(--radius);
      background: rgba(255, 253, 248, 0.96);
      box-shadow: 0 4px 12px rgba(38, 34, 28, 0.08);
    }

    .focus-spine {
      position: absolute;
      left: 22px;
      top: 102px;
      bottom: 0;
      width: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 70%, #c5bdad);
    }

    .focus-dot {
      position: absolute;
      left: 14px;
      width: 19px;
      height: 19px;
      transform: translateY(-50%);
      border: 3px solid #fff;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 55%, #5a4e43);
    }

    .focus-range {
      position: absolute;
      left: 17px;
      width: 13px;
      min-height: 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 22%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    }

    .focus-leader {
      position: absolute;
      left: 33px;
      width: 18px;
      height: 1px;
      transform-origin: left center;
      background: color-mix(in srgb, var(--accent) 38%, #9b9488);
    }

    .focus-event {
      position: absolute;
      left: 50px;
      width: 228px;
      min-height: 82px;
      padding: 8px 9px;
      border: 1px solid color-mix(in srgb, var(--accent) 22%, #d7d0c4);
      border-left: 4px solid var(--accent);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 3px 10px rgba(38, 34, 28, 0.08);
      cursor: pointer;
      text-align: left;
    }

    .focus-event:focus {
      outline: 3px solid color-mix(in srgb, var(--accent) 28%, transparent);
      outline-offset: 2px;
    }

    .focus-event time {
      display: block;
      margin-bottom: 3px;
      color: color-mix(in srgb, var(--accent) 68%, #30363b);
      font-size: 11px;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .focus-event .label {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      font-size: 12px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .focus-event .check {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.2;
    }

    @media (max-width: 760px) {
      header {
        grid-template-columns: 1fr;
      }
      .controls {
        justify-items: start;
      }
      .toggles,
      .focus-toggles {
        justify-content: flex-start;
      }
      .column {
        flex-basis: 318px;
      }
      .event {
        width: 246px;
      }
      .column-header {
        top: 118px;
      }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1><a href="index.html">Aligned Chronologies</a></h1>
      <div class="subhead">The Book That Changed America - shared vertical date scale</div>
    </div>
    <div class="controls">
      <nav class="view-tabs" aria-label="Timeline view">
        <button type="button" class="view-tab active" id="tab-full" data-view="full">Full Timeline</button>
        <button type="button" class="view-tab" id="tab-focus" data-view="focus">1858-1862 Zoom</button>
      </nav>
      <form class="toggles" id="toggles" aria-label="Chronology toggles"></form>
      <form class="focus-toggles" id="focus-toggles" aria-label="Zoom lane toggles"></form>
    </div>
  </header>

  <main class="timeline-viewport view-panel" id="viewport">
    <section class="timeline-stage" id="stage">
      <div id="grid"></div>
      <div class="columns" id="columns"></div>
    </section>
  </main>

  <main class="focus-viewport view-panel" id="focus-viewport" hidden>
    <section class="focus-stage" id="focus-stage">
      <div id="focus-grid"></div>
      <div class="focus-layout" id="focus-lanes"></div>
    </section>
  </main>

  <aside class="drawer" id="drawer" hidden>
    <div class="drawer-top">
      <div>
        <time id="drawer-date"></time>
        <h2 id="drawer-title"></h2>
      </div>
      <button type="button" id="drawer-close" aria-label="Close details">x</button>
    </div>
    <div class="drawer-summary" id="drawer-summary"></div>
    <p id="drawer-check"></p>
    <div class="drawer-section-title" id="drawer-location-title" hidden>Locations</div>
    <div class="source-list" id="drawer-locations" hidden></div>
    <div class="drawer-section-title">Sources</div>
    <div class="source-list" id="drawer-sources"></div>
  </aside>

  <script>
    const MODEL = ${json};
  </script>
  <script>
    const BASE_YEAR_HEIGHT = 58;
    const EVENT_YEAR_WEIGHT = 34;
    const TOP_OFFSET = 94;
    const CARD_HEIGHT = 56;
    const CARD_GAP = 9;
    const FOCUS_BASE_YEAR_HEIGHT = 520;
    const FOCUS_EVENT_YEAR_WEIGHT = 36;
    const FOCUS_TOP_OFFSET = 96;
    const FOCUS_CARD_HEIGHT = 90;
    const FOCUS_CARD_GAP = 11;
    const FOCUS_LANES = [
      "Brown and Sanborn",
      "Darwin and Origin",
      "Concord readers",
      "Thoreau seeds and death",
      "National crisis",
      "Other",
    ];

    const state = {
      visible: new Set(MODEL.chronologies.filter((c) => c.defaultVisible || c.required).map((c) => c.id)),
      visibleFocusLanes: new Set(FOCUS_LANES),
      view: "full",
      selected: null,
    };

    const viewport = document.getElementById("viewport");
    const stage = document.getElementById("stage");
    const grid = document.getElementById("grid");
    const columns = document.getElementById("columns");
    const focusViewport = document.getElementById("focus-viewport");
    const focusStage = document.getElementById("focus-stage");
    const focusGrid = document.getElementById("focus-grid");
    const focusLanes = document.getElementById("focus-lanes");
    const toggles = document.getElementById("toggles");
    const focusToggles = document.getElementById("focus-toggles");
    const viewTabs = document.querySelectorAll(".view-tab");
    const drawer = document.getElementById("drawer");
    const drawerDate = document.getElementById("drawer-date");
    const drawerTitle = document.getElementById("drawer-title");
    const drawerSummary = document.getElementById("drawer-summary");
    const drawerCheck = document.getElementById("drawer-check");
    const drawerLocationTitle = document.getElementById("drawer-location-title");
    const drawerLocations = document.getElementById("drawer-locations");
    const drawerSources = document.getElementById("drawer-sources");

    const yearOffsets = buildYearOffsets();
    const timelineHeight = TOP_OFFSET + yearOffsets.total + 160;
    stage.style.setProperty("--timeline-height", timelineHeight + "px");
    const focusYearOffsets = buildFocusYearOffsets();
    const focusHeight = FOCUS_TOP_OFFSET + focusYearOffsets.total + 180;
    focusStage.style.setProperty("--focus-height", focusHeight + "px");

    renderToggles();
    renderFocusToggles();
    render();
    openEventFromHash();
    window.addEventListener("hashchange", openEventFromHash);

    for (const tab of viewTabs) {
      tab.addEventListener("click", () => {
        state.view = tab.dataset.view || "full";
        drawer.hidden = true;
        state.selected = null;
        render();
      });
    }

    document.getElementById("drawer-close").addEventListener("click", () => {
      drawer.hidden = true;
      state.selected = null;
    });

    function buildYearOffsets() {
      let current = 0;
      const years = {};
      for (let year = MODEL.minYear; year <= MODEL.maxYear; year += 1) {
        const events = MODEL.eventsPerYear[String(year)] || 0;
        const height = BASE_YEAR_HEIGHT + events * EVENT_YEAR_WEIGHT;
        years[year] = { start: current, height };
        current += height;
      }
      return { years, total: current };
    }

    function yFor(value) {
      const year = Math.floor(value);
      const slot = yearOffsets.years[year] || yearOffsets.years[MODEL.minYear];
      const fraction = Math.max(0, Math.min(0.999, value - year));
      return TOP_OFFSET + slot.start + slot.height * fraction;
    }

    function buildFocusYearOffsets() {
      let current = 0;
      const years = {};
      for (let year = MODEL.focusMinYear; year <= MODEL.focusMaxYear; year += 1) {
        const events = MODEL.focusEventsPerYear[String(year)] || 0;
        const height = FOCUS_BASE_YEAR_HEIGHT + events * FOCUS_EVENT_YEAR_WEIGHT;
        years[year] = { start: current, height };
        current += height;
      }
      return { years, total: current };
    }

    function focusYFor(value) {
      const year = Math.floor(value);
      const slot = focusYearOffsets.years[year] || focusYearOffsets.years[MODEL.focusMinYear];
      const fraction = Math.max(0, Math.min(0.999, value - year));
      return FOCUS_TOP_OFFSET + slot.start + slot.height * fraction;
    }

    function renderToggles() {
      toggles.innerHTML = "";
      const groups = [
        { label: "Books", chronologies: MODEL.chronologies.filter((chronology) => chronology.kind === "book") },
        { label: "People", chronologies: MODEL.chronologies.filter((chronology) => chronology.kind !== "book") },
      ].filter((group) => group.chronologies.length);

      for (const group of groups) {
        const groupElement = document.createElement("div");
        groupElement.className = "toggle-group";
        groupElement.setAttribute("role", "group");
        groupElement.setAttribute("aria-label", group.label);

        const title = document.createElement("span");
        title.className = "toggle-group-title";
        title.textContent = group.label;
        groupElement.append(title);

        for (const chronology of group.chronologies) {
          const label = document.createElement("label");
          label.className = "toggle";
          label.style.setProperty("--accent", chronology.color);

          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = state.visible.has(chronology.id);
          input.addEventListener("change", () => {
            if (input.checked) {
              state.visible.add(chronology.id);
            } else {
              state.visible.delete(chronology.id);
            }
            render();
          });

          const text = document.createElement("span");
          text.textContent = chronology.title;

          label.append(input, text);
          groupElement.append(label);
        }
        toggles.append(groupElement);
      }
    }

    function renderFocusToggles() {
      focusToggles.innerHTML = "";
      for (const lane of focusLaneOptions()) {
        const label = document.createElement("label");
        label.className = "toggle";
        label.style.setProperty("--accent", MODEL.focusChronology.color);

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = state.visibleFocusLanes.has(lane);
        input.addEventListener("change", () => {
          if (input.checked) {
            state.visibleFocusLanes.add(lane);
          } else {
            state.visibleFocusLanes.delete(lane);
          }
          render();
        });

        const text = document.createElement("span");
        text.textContent = lane;

        label.append(input, text);
        focusToggles.append(label);
      }
    }

    function render() {
      renderViewTabs();
      document.body.classList.toggle("focus-mode", state.view === "focus");
      viewport.hidden = state.view !== "full";
      focusViewport.hidden = state.view !== "focus";
      if (state.view === "focus") {
        renderFocusGrid();
        renderFocusLanes();
      } else {
        renderGrid();
        renderColumns();
      }
    }

    function renderViewTabs() {
      for (const tab of viewTabs) {
        const active = tab.dataset.view === state.view;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-current", active ? "page" : "false");
      }
    }

    function renderGrid() {
      grid.innerHTML = "";
      for (let year = MODEL.minYear; year <= MODEL.maxYear; year += 1) {
        if (!shouldShowYear(year)) continue;
        const y = yFor(year);
        const line = document.createElement("div");
        line.className = "gridline";
        line.style.top = y + "px";
        grid.append(line);

        const label = document.createElement("div");
        label.className = "year-label";
        label.style.top = y + "px";
        label.textContent = year;
        grid.append(label);
      }
    }

    function shouldShowYear(year) {
      if (year % 10 === 0) return true;
      if (year >= 1858 && year <= 1863) return true;
      return (MODEL.eventsPerYear[String(year)] || 0) >= 8;
    }

    function renderFocusGrid() {
      focusGrid.innerHTML = "";
      for (let year = MODEL.focusMinYear; year <= MODEL.focusMaxYear; year += 1) {
        const y = focusYFor(year);
        const line = document.createElement("div");
        line.className = "gridline";
        line.style.top = y + "px";
        focusGrid.append(line);

        const label = document.createElement("div");
        label.className = "year-label";
        label.style.top = y + "px";
        label.textContent = year;
        focusGrid.append(label);
      }
    }

    function renderFocusLanes() {
      focusLanes.innerHTML = "";
      const entriesByLane = new Map();
      for (const entry of MODEL.focusChronology.entries) {
        const lane = focusLane(entry);
        if (!entriesByLane.has(lane)) entriesByLane.set(lane, []);
        entriesByLane.get(lane).push(entry);
      }

      for (const lane of FOCUS_LANES) {
        const entries = entriesByLane.get(lane) || [];
        if (!entries.length && lane === "Other") continue;
        if (!state.visibleFocusLanes.has(lane)) continue;

        const column = document.createElement("section");
        column.className = "focus-lane";
        column.style.setProperty("--accent", MODEL.focusChronology.color);

        const header = document.createElement("div");
        header.className = "focus-lane-header";
        header.innerHTML = \`
          <div class="column-title">
            <strong>\${escapeHtml(lane)}</strong>
            <span>\${escapeHtml(MODEL.focusChronology.subtitle)}</span>
          </div>
          <span class="count">\${entries.length}</span>
        \`;
        column.append(header);

        const spine = document.createElement("div");
        spine.className = "focus-spine";
        column.append(spine);

        const placed = placeFocusEvents(entries);
        let maxBottom = focusHeight;
        for (const item of placed) {
          maxBottom = Math.max(maxBottom, item.cardY + FOCUS_CARD_HEIGHT + 120);
          appendFocusEvent(column, item);
        }
        column.style.minHeight = maxBottom + "px";
        focusLanes.append(column);
      }
    }

    function focusLaneOptions() {
      const lanes = new Set(MODEL.focusChronology.entries.map((entry) => focusLane(entry)));
      return FOCUS_LANES.filter((lane) => lane !== "Other" || lanes.has("Other"));
    }

    function renderColumns() {
      columns.innerHTML = "";
      for (const chronology of MODEL.chronologies) {
        const column = document.createElement("section");
        column.className = "column";
        column.style.setProperty("--accent", chronology.color);
        if (!state.visible.has(chronology.id)) {
          column.classList.add("hidden");
        }

        const header = document.createElement("div");
        header.className = "column-header";
        header.innerHTML = \`
          <div class="column-title">
            <strong>\${escapeHtml(chronology.title)}</strong>
            <span>\${escapeHtml(chronology.subtitle)}</span>
          </div>
          <span class="count">\${chronology.entries.length}</span>
        \`;
        column.append(header);

        const spine = document.createElement("div");
        spine.className = "spine";
        column.append(spine);

        const placed = placeEvents(chronology.entries);
        let maxBottom = timelineHeight;
        for (const item of placed) {
          maxBottom = Math.max(maxBottom, item.cardY + CARD_HEIGHT + 120);
          appendEvent(column, chronology, item);
        }
        column.style.minHeight = maxBottom + "px";
        columns.append(column);
      }
    }

    function placeEvents(entries) {
      let lastBottom = TOP_OFFSET;
      return [...entries]
        .sort((a, b) => a.start.value - b.start.value)
        .map((entry) => {
          const markerY = yFor(entry.start.value);
          const rangeEndY = yFor(entry.end.value);
          const cardY = Math.max(markerY - 22, lastBottom + CARD_GAP);
          lastBottom = cardY + CARD_HEIGHT;
          return { entry, markerY, rangeEndY, cardY };
        });
    }

    function placeFocusEvents(entries) {
      let lastBottom = FOCUS_TOP_OFFSET;
      return [...entries]
        .sort((a, b) => a.start.value - b.start.value)
        .map((entry) => {
          const markerY = focusYFor(entry.start.value);
          const rangeEndY = focusYFor(entry.end.value);
          const cardY = Math.max(markerY - 34, lastBottom + FOCUS_CARD_GAP);
          lastBottom = cardY + FOCUS_CARD_HEIGHT;
          return { entry, markerY, rangeEndY, cardY };
        });
    }

    function appendEvent(column, chronology, item) {
      const { entry, markerY, rangeEndY, cardY } = item;

      if (rangeEndY - markerY > 20) {
        const range = document.createElement("div");
        range.className = "range";
        range.dataset.eventId = entry.id;
        range.dataset.date = entry.dateLabel;
        range.style.top = markerY + "px";
        range.style.height = Math.max(14, rangeEndY - markerY) + "px";
        column.append(range);
      }

      const dot = document.createElement("div");
      dot.className = "dot";
      dot.dataset.eventId = entry.id;
      dot.dataset.date = entry.dateLabel;
      dot.dataset.start = entry.start.value;
      dot.style.top = markerY + "px";
      column.append(dot);

      const leader = document.createElement("div");
      leader.className = "leader";
      leader.style.top = markerY + "px";
      if (Math.abs(cardY + 20 - markerY) > 8) {
        const dy = cardY + 20 - markerY;
        const angle = Math.atan2(dy, 18) * (180 / Math.PI);
        const length = Math.sqrt(18 * 18 + dy * dy);
        leader.style.width = length + "px";
        leader.style.transform = "rotate(" + angle + "deg)";
      }
      column.append(leader);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "event";
      button.id = "event-" + entry.id;
      button.dataset.eventId = entry.id;
      button.dataset.date = entry.dateLabel;
      button.dataset.start = entry.start.value;
      button.style.top = cardY + "px";
      button.innerHTML = \`
        <time>\${escapeHtml(entry.dateLabel)}</time>
        <span class="label">\${escapeHtml(entry.title)}</span>
        \${entry.check ? \`<span class="check">\${escapeHtml(entry.check)}</span>\` : ""}
      \`;
      button.addEventListener("click", () => openDrawer(chronology, entry, true));
      column.append(button);
    }

    function appendFocusEvent(column, item) {
      const { entry, markerY, rangeEndY, cardY } = item;

      if (rangeEndY - markerY > 20) {
        const range = document.createElement("div");
        range.className = "focus-range";
        range.dataset.eventId = entry.id;
        range.dataset.date = entry.dateLabel;
        range.style.top = markerY + "px";
        range.style.height = Math.max(14, rangeEndY - markerY) + "px";
        column.append(range);
      }

      const dot = document.createElement("div");
      dot.className = "focus-dot";
      dot.dataset.eventId = entry.id;
      dot.dataset.date = entry.dateLabel;
      dot.dataset.start = entry.start.value;
      dot.style.top = markerY + "px";
      column.append(dot);

      const leader = document.createElement("div");
      leader.className = "focus-leader";
      leader.style.top = markerY + "px";
      if (Math.abs(cardY + 30 - markerY) > 8) {
        const dy = cardY + 30 - markerY;
        const angle = Math.atan2(dy, 18) * (180 / Math.PI);
        const length = Math.sqrt(18 * 18 + dy * dy);
        leader.style.width = length + "px";
        leader.style.transform = "rotate(" + angle + "deg)";
      }
      column.append(leader);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "focus-event";
      button.id = "event-" + entry.id;
      button.dataset.eventId = entry.id;
      button.dataset.date = entry.dateLabel;
      button.dataset.start = entry.start.value;
      button.style.top = cardY + "px";
      button.innerHTML = \`
        <time>\${escapeHtml(entry.dateLabel)}</time>
        <span class="label">\${escapeHtml(entry.title)}</span>
        \${entry.check ? \`<span class="check">\${escapeHtml(entry.check)}</span>\` : ""}
      \`;
      button.addEventListener("click", () => openDrawer(MODEL.focusChronology, entry, true));
      column.append(button);
    }

    function focusLane(entry) {
      const lane = detailValue(entry, "Lane");
      return FOCUS_LANES.includes(lane) ? lane : "Other";
    }

    function detailValue(entry, label) {
      const prefix = label + ":";
      const line = entry.details.find((detail) => detail.startsWith(prefix));
      return line ? line.slice(prefix.length).trim().replace(/\\.$/, "") : "";
    }

    function findEventById(id) {
      for (const chronology of MODEL.chronologies) {
        const entry = chronology.entries.find((candidate) => candidate.id === id);
        if (entry) return { chronology, entry, view: "full" };
      }
      const focusEntry = MODEL.focusChronology.entries.find((candidate) => candidate.id === id);
      if (focusEntry) return { chronology: MODEL.focusChronology, entry: focusEntry, view: "focus" };
      return null;
    }

    function openEventFromHash() {
      const match = decodeURIComponent(window.location.hash || "").match(/^#event-(.+)$/);
      if (!match) return;
      const found = findEventById(match[1]);
      if (!found) return;
      state.view = found.view;
      if (found.view === "full") state.visible.add(found.chronology.id);
      render();
      window.requestAnimationFrame(() => {
        const button = document.getElementById("event-" + found.entry.id);
        if (button) button.scrollIntoView({ block: "center", inline: "center" });
        openDrawer(found.chronology, found.entry, false);
      });
    }

    function openDrawer(chronology, entry, updateHash = false) {
      state.selected = entry.id;
      if (updateHash) history.replaceState(null, "", "#event-" + entry.id);
      drawerDate.textContent = chronology.title + " - " + entry.dateLabel;
      drawerTitle.textContent = entry.title;
      drawerSummary.innerHTML = "";
      const paragraphs = [];
      if (entry.summary) paragraphs.push("Summary: " + entry.summary);
      paragraphs.push(...entry.details.filter((detail) => !detail.startsWith("Lane:")));
      if (!paragraphs.length) paragraphs.push("No additional note beyond the dated event.");
      for (const paragraph of paragraphs) {
        const p = document.createElement("p");
        const labeled = paragraph.match(/^([^:]{3,30}):\s+(.+)$/);
        if (labeled) {
          const label = document.createElement("span");
          label.className = "detail-label";
          label.textContent = labeled[1] + ": ";
          p.append(label, document.createTextNode(labeled[2]));
        } else {
          p.textContent = paragraph;
        }
        drawerSummary.append(p);
      }
      drawerCheck.textContent = entry.check ? "Check: " + entry.check : "";
      drawerLocations.innerHTML = "";
      const locationLinks = entry.locationLinks || [];
      drawerLocationTitle.hidden = locationLinks.length === 0;
      drawerLocations.hidden = locationLinks.length === 0;
      for (const location of locationLinks) {
        const a = document.createElement("a");
        a.href = location.href;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = location.display;
        a.title = location.description || location.display;
        drawerLocations.append(a);
      }
      drawerSources.innerHTML = "";
      const preciseBookSources = entry.bookAnchors || [];
      const preciseWebSources = entry.webAnchors || [];
      const anchoredWebSourceKeys = new Set(preciseWebSources.map((source) => source.sourceKey));
      const seenHrefs = new Set();
      for (const source of preciseBookSources) {
        appendSourceLink(source, seenHrefs);
      }
      for (const source of preciseWebSources) {
        appendSourceLink(source, seenHrefs);
      }
      for (const token of sourceTokens(entry.sources)) {
        const source = MODEL.sources[token];
        if (source) {
          if (preciseBookSources.length && source.kind === "book") continue;
          if (anchoredWebSourceKeys.has(token) && source.kind === "web") continue;
          appendSourceLink(source, seenHrefs, token);
        } else {
          const span = document.createElement("span");
          span.textContent = token;
          drawerSources.append(span);
        }
      }
      drawer.hidden = false;
    }

    function appendSourceLink(source, seenHrefs, fallbackLabel = "") {
      if (seenHrefs.has(source.href)) return;
      seenHrefs.add(source.href);
      const a = document.createElement("a");
      a.href = source.href;
      a.target = source.href.startsWith("http") ? "_blank" : "_self";
      a.rel = "noreferrer";
      a.textContent = source.kind === "book" || source.kind === "book-cell" ? source.display : source.display || source.description || fallbackLabel;
      a.title = source.description || source.display || fallbackLabel;
      drawerSources.append(a);
    }

    function sourceTokens(text) {
      if (!text) return [];
      const tokens = text.match(/[A-Za-z][A-Za-z0-9_-]*/g) || [];
      return [...new Set(tokens.filter((token) => Object.prototype.hasOwnProperty.call(MODEL.sources, token)))];
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }
  </script>
</body>
</html>
`;
}
