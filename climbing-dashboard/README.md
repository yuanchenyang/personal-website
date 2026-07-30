# Mountain Project Ticklist Dashboard

A static GitHub Pages website that analyzes your Mountain Project ticklist data and displays comprehensive climbing statistics and analytics.

## Features

- **File Upload**: Drag & drop or click to upload your Mountain Project CSV export
- **Two tabs**: **Routes** (sport / trad / other) and **Bouldering** (V scale), each with its own stats
- **Headline tiles**: Days out, pitches, vertical feet and hardest send at a glance
- **Activity Heatmap**: GitHub-style contribution graph, one year at a time
- **Personal Best**: A monotonic staircase of your best send and best onsight over time
- **Median Send Grade**: What you typically send each month, as a read on current form
- **First-Try Success Rate**: Share of lead attempts sent onsight or flash, by grade
- **Send Pyramid**: Clean sends per grade, hardest first, so gaps in the pyramid show
- **Grade Distribution**: Ticks per grade, split Onsight / Flash / Redpoint / Other
- **Grade Milestones**: First ascent at every letter grade, switchable between
  Onsight and Redpoint (Flash and Send for boulders)
- **Pitches Per Month**: Every month gets its own labelled bar, split sport / trad,
  paged a year at a time with Previous/Next
- **Per-Year Totals**: Pitches split by discipline, days out, and vertical feet
- **Responsive Design**: Works on desktop and mobile devices

## How the numbers are counted

A few deliberate choices, so the figures are reproducible:

- **One discipline per tick.** Each tick counts as exactly one of sport / trad /
  boulder / other, by that precedence, so the discipline columns sum to Total
  Pitches. A `Trad, Sport` route counts once (trad); a `Trad, Boulder` route is a
  roped trad route, not a boulder problem. Only a climb typed `Boulder` on its own
  *and* carrying a V grade lands on the Bouldering tab.
- **Unrated ticks still count.** An ice route with a `WI4` rating has no YDS grade,
  so it is excluded from grade charts but still counts toward pitches and days out.
- **A send is onsight, flash or redpoint.** Toprope and follow ticks are never
  sends, whatever appears in Lead Style, and land in **Other**. Nothing defaults
  into a "fell" bucket.
- **Distributions count ticks, not pitches**, so one 5-pitch route does not add
  five entries to a grade you climbed once.
- **Bouldering counts ticks, not pitches** everywhere — a pitch count carries no
  meaning on a boulder problem.
- **Dates are local.** Day keys are built from local date parts rather than
  `toISOString()`, so the heatmap puts a Saturday climb in the Saturday row in
  every timezone.
- **Time axes are zero-filled.** Months with no climbing appear as empty bars
  rather than being dropped, so an off-season reads as an off-season. The monthly
  chart pages 12 months at a time on a y-scale fixed across all pages, so paging
  cannot make a quiet month look busy.
- **Nothing is dropped silently.** If any CSV row cannot be used — a broken
  column count, or a date that will not parse — the dashboard says how many and
  why in a notice above the tabs.

## Handling untrusted CSVs

A tick export is an arbitrary file, so route names and URLs are treated as
untrusted input. Table rows are built with DOM APIs rather than interpolated
HTML, and link targets must be absolute `http(s)` URLs — anything else
(`javascript:`, `data:`, or text that is not a URL) renders as plain text
instead of becoming a link.

## Chart colors

Data marks use a validated categorical palette rather than the page's brand
gradient. Before changing any value in `VIZ` (`js/utils.js`), re-run the
colorblind-safety validator against the chart surface (`#f8f9fa`) — the previous
palette failed on a too-light yellow and a sub-3:1 contrast pair.

## How to Use

1. Export your ticklist from Mountain Project as a CSV file
   (your profile > Ticks > Export CSV, which downloads `ticks.csv`)
2. Visit the dashboard website
3. Upload your CSV file by dragging it to the upload area or clicking to browse
4. View your personalized climbing analytics and statistics

## Data Privacy

All data processing happens locally in your browser. Your CSV file is never
uploaded to any server, and the page makes no third-party requests for your data
- everything runs client-side for complete privacy.

## GitHub Pages Setup

This repository is configured for GitHub Pages deployment:

1. Push this code to a GitHub repository
2. Go to repository Settings > Pages
3. Select "Deploy from a branch" and choose "main" branch
4. The site will be available at `https://yourusername.github.io/repository-name`

## File Structure

```
/
├── index.html          # Main dashboard page
├── css/
│   └── style.css       # Styling and responsive design
├── js/
│   ├── utils.js        # YDS + V grade scales, local-date helpers, chart palette
│   ├── csv-parser.js   # CSV parsing, discipline and style classification
│   ├── analytics.js    # Statistics and analytics calculations
│   ├── charts.js       # Chart.js visualization components
│   └── main.js         # Tabs and render orchestration
└── README.md           # This file
```

## Technologies Used

- **HTML5**: Semantic markup and file upload API
- **CSS3**: Modern styling with gradients, animations, and responsive design
- **JavaScript (ES6+)**: Client-side data processing and interactivity
- **Chart.js**: Data visualization and chart rendering
- **GitHub Pages**: Static site hosting

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this code for your own projects.