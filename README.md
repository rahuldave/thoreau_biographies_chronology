# Thoreau Biographies Chronology Set

This folder contains the chronology set for Randall Fuller's *The Book That
Changed America: How Darwin's Theory of Evolution Ignited a Nation*.

- `the_book_that_changed_america_chronology.md` - main, sorted chronology for the whole book.
- `thoreau_chronology.md` - Henry David Thoreau.
- `sanborn_chronology.md` - Franklin Benjamin Sanborn.
- `brace_chronology.md` - Charles Loring Brace.
- `bronson_alcott_chronology.md` - Amos Bronson Alcott.
- `emerson_chronology.md` - Ralph Waldo Emerson.
- `darwin_chronology.md` - sparse optional reference line for Charles Darwin.
- `john_brown_chronology.md` - optional abolition-crisis reference line for John Brown.
- `crisis_1858_1862_chronology.md` - focused close-up for the crowded Brown/Origin/Sanborn/Thoreau interval.
- `aligned_chronologies.html` - interactive aligned timeline view with a full tab and an 1858-1862 zoom tab.
- `*_chronology.html` - generated standalone HTML pages for each Markdown
  chronology, with stable `#event-...` anchors.
- `build_aligned_timeline.mjs` - generator for the HTML view.
- `book_line_anchors.json` - generated map from cited `book.md` line ranges
  to Close Reading chapter/cell anchors.
- `web_source_anchor_rules.json` - checked rules for linking external source
  chips to stable page sections when the cited source has useful anchors.
- `location_anchor_rules.json` - generated event-to-place links into the
  Thoreau Location Atlas.
- `.nojekyll` - tells GitHub Pages to serve this static site as-is.
- `index.html` - redirects the Pages root to the generated timeline.

Regenerate the HTML after editing any chronology or link rule file:

```bash
node thoreau_biographies_chronology/build_aligned_timeline.mjs
```

The four people at Sanborn's January 1, 1860 Origin dinner are Thoreau,
Sanborn, Brace, and Bronson Alcott. Emerson was not at that dinner in Fuller's
account, but he is treated as a protagonist because the Concord network and
Darwin reception repeatedly pass through his house, family, library, Saturday
Club circle, and relationship with Thoreau. Darwin and John Brown are optional
reference lines rather than protagonists in the Concord dinner scene.

The Markdown files are the source of truth. The HTML generator reads each
chronology bullet plus its indented `Evidence` lines when present, `Book
anchor`, and `Web context` lines into the drawer view. The focused zoom
chronology also uses indented `Lane` lines to place events in the
Brown/Sanborn, Darwin/Origin, Concord readers, Thoreau seeds/death, and
national-crisis lanes. The zoom tab has its own lane toggles and a looser
vertical year scale so the crowded 1859-1860 interval remains aligned but
readable.

Book source chips in the drawer link to authenticated Close Reading chapter
cells at `https://closereading.rahuldave.us/books/125/chapters/...#cell-N`
when a cited `book.md` line range can be mapped to a cell. The chip text also
preserves the local `book.md` line reference and shows the corresponding
Close Reading block range such as `b0003-b0028`.

External source chips use the current URL listed in the main chronology. When a
stable section anchor is available and relevant to the event, the generator uses
`web_source_anchor_rules.json` to link to that nearer section; pages without
durable anchors remain page-level links. The current source list and configured
anchors were live-checked on 2026-07-02.

Location chips link into the Thoreau Location Atlas at
<https://rahuldave.com/thoreau_locations_osm/>. The location rules are generated
from the atlas catalog plus suppression/override files by:

```bash
python3 thoreau_locations_osm/scripts/build_chronology_location_links.py
```

The aligned timeline supports deep links such as
`aligned_chronologies.html#event-thoreau-22`, and each standalone chronology
page supports matching anchors such as `thoreau_chronology.html#event-thoreau-22`.

Citation and date-check conventions are defined in the main chronology:

- **Web-confirmed** - external source corroborates the event date or year.
- **Web-confirmed context** - external source corroborates the public person,
  event, publication, organization, or historical frame, while Fuller supplies
  the private scene, exact local placement, or book-specific interpretation.
- **Fuller-confirmed** - Fuller supplies the exact date for a private event.
- **Web-context** - web source corroborates the person/context, while Fuller
  supplies the book-specific placement or interpretation.
