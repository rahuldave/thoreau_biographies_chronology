import fs from "node:fs";
import path from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const OUTPUT = path.join(ROOT, "aligned_chronologies.html");

const CLOSE_READING_BOOK_ID = 125;
const CLOSE_READING_CHAPTER_BASE = `https://closereading.rahuldave.us/books/${CLOSE_READING_BOOK_ID}/chapters`;
const CLOSE_READING_CHAPTER_IDS = {
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
};

const CHRONOLOGY_FILES = [
  {
    id: "book",
    title: "Book",
    subtitle: "Full chronology",
    file: "the_book_that_changed_america_chronology.md",
    required: true,
    color: "#255f85",
  },
  {
    id: "thoreau",
    title: "Thoreau",
    subtitle: "Henry David Thoreau",
    file: "thoreau_chronology.md",
    required: true,
    color: "#3b7d4f",
  },
  {
    id: "sanborn",
    title: "Sanborn",
    subtitle: "Franklin Benjamin Sanborn",
    file: "sanborn_chronology.md",
    required: false,
    color: "#9f4d3f",
  },
  {
    id: "brace",
    title: "Brace",
    subtitle: "Charles Loring Brace",
    file: "brace_chronology.md",
    required: false,
    color: "#6c58a8",
  },
  {
    id: "alcott",
    title: "Alcott",
    subtitle: "Amos Bronson Alcott",
    file: "bronson_alcott_chronology.md",
    required: false,
    color: "#a66a20",
  },
  {
    id: "emerson",
    title: "Emerson",
    subtitle: "Ralph Waldo Emerson",
    file: "emerson_chronology.md",
    required: false,
    color: "#2f7f7b",
  },
  {
    id: "darwin",
    title: "Darwin",
    subtitle: "Charles Darwin",
    file: "darwin_chronology.md",
    required: false,
    color: "#677a2f",
  },
  {
    id: "john-brown",
    title: "John Brown",
    subtitle: "Abolition crisis",
    file: "john_brown_chronology.md",
    required: false,
    color: "#8c3f5b",
  },
];

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

function sourceKeyMap(markdown) {
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
    const book = line.match(/^\| (F[^| ]+) \| ([^|]+) \| `book\.md:([^`]+)` \|/);
    if (book) {
      const lineNumber = book[3].split("-")[0];
      const description = book[2].trim();
      const chapterId = CLOSE_READING_CHAPTER_IDS[book[1]];
      if (!chapterId) {
        throw new Error(`Missing Close Reading chapter id for ${book[1]}`);
      }
      map[book[1]] = {
        href: `${CLOSE_READING_CHAPTER_BASE}/${chapterId}`,
        label: book[1],
        display: `${formatChapterReference(description)} (Close Reading chapter ${chapterId}; book.md:${lineNumber})`,
        description,
        lineNumber,
        chapterId,
        kind: "book",
      };
    }
  }
  return map;
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
      check: meta.check,
      sources: meta.sources,
      start: dates.start,
      end: dates.end,
      confidence: dates.confidence,
    });
  }

  return entries;
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

const mainMarkdown = readLocal("the_book_that_changed_america_chronology.md");
const sources = sourceKeyMap(mainMarkdown);
const chronologies = CHRONOLOGY_FILES.map((config) => {
  const markdown = readLocal(config.file);
  return {
    ...config,
    entries: parseChronology(markdown, config.id),
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
  entries: parseChronology(focusMarkdown, FOCUS_CHRONOLOGY.id),
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
      justify-content: flex-end;
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

    .toggle.required {
      color: #30363b;
      background: #f2eee6;
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
      <h1>Aligned Chronologies</h1>
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
      visible: new Set(MODEL.chronologies.map((c) => c.required ? c.id : null).filter(Boolean)),
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
      for (const chronology of MODEL.chronologies) {
        const label = document.createElement("label");
        label.className = "toggle" + (chronology.required ? " required" : "");
        label.style.setProperty("--accent", chronology.color);

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = chronology.required || state.visible.has(chronology.id);
        input.disabled = chronology.required;
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
        toggles.append(label);
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
        if (!chronology.required && !state.visible.has(chronology.id)) {
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
      button.dataset.eventId = entry.id;
      button.dataset.date = entry.dateLabel;
      button.dataset.start = entry.start.value;
      button.style.top = cardY + "px";
      button.innerHTML = \`
        <time>\${escapeHtml(entry.dateLabel)}</time>
        <span class="label">\${escapeHtml(entry.title)}</span>
        \${entry.check ? \`<span class="check">\${escapeHtml(entry.check)}</span>\` : ""}
      \`;
      button.addEventListener("click", () => openDrawer(chronology, entry));
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
      button.dataset.eventId = entry.id;
      button.dataset.date = entry.dateLabel;
      button.dataset.start = entry.start.value;
      button.style.top = cardY + "px";
      button.innerHTML = \`
        <time>\${escapeHtml(entry.dateLabel)}</time>
        <span class="label">\${escapeHtml(entry.title)}</span>
        \${entry.check ? \`<span class="check">\${escapeHtml(entry.check)}</span>\` : ""}
      \`;
      button.addEventListener("click", () => openDrawer(MODEL.focusChronology, entry));
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

    function openDrawer(chronology, entry) {
      state.selected = entry.id;
      drawerDate.textContent = chronology.title + " - " + entry.dateLabel;
      drawerTitle.textContent = entry.title;
      drawerSummary.innerHTML = "";
      const paragraphs = [];
      if (entry.summary) paragraphs.push(entry.summary);
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
      drawerSources.innerHTML = "";
      for (const token of sourceTokens(entry.sources)) {
        const source = MODEL.sources[token];
        if (source) {
          const a = document.createElement("a");
          a.href = source.href;
          a.target = source.href.startsWith("http") ? "_blank" : "_self";
          a.rel = "noreferrer";
          a.textContent = source.kind === "book" ? source.display : source.display || source.description || token;
          a.title = source.description;
          drawerSources.append(a);
        } else {
          const span = document.createElement("span");
          span.textContent = token;
          drawerSources.append(span);
        }
      }
      drawer.hidden = false;
    }

    function sourceTokens(text) {
      if (!text) return [];
      const matches = text.match(/\\b(?:F\\d+|FPref|[A-Z][A-Za-z]+(?:-[A-Za-z0-9]+)+|W-[A-Za-z0-9]+)\\b/g);
      return [...new Set(matches || [])];
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
