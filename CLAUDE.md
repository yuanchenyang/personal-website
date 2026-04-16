# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal academic website for Chenyang Yuan, built with Jekyll. It is deployed to `https://www.chenyang.co`.

## Build and Serve

```bash
# Serve locally with live reload
bundle exec jekyll serve

# Build static site
bundle exec jekyll build
```

The built site outputs to `_site/`. No separate test or lint commands exist.

## Architecture

The site uses Jekyll collections (`_config.yml`) to organize content:

- **`_papers/`** — One `.md` file per paper, with YAML frontmatter only (no body content). Fields: `title`, `authors`, `year`, `venue`, `venue-category`, `research-category`, `preprint-type`, `preprint-url`, `published-url`, `pdf-url`, `poster-url`, `code-url`, `website-url`.
- **`_talks/`** — Similar structure to papers.
- **`_research/`**, **`_software/`**, **`_projects/`**, **`_tutorials/`** — Collection items with body content rendered on their respective list pages.

### Paper Display System

Papers are displayed via `_includes/tabbed_paper_list.html`, which renders three tabs (By Date, By Research Topic, By Type). The ordering of groups in the latter two tabs is controlled by `paper_venue_order` and `paper_category_order` lists in `_config.yml`. Individual paper items are rendered by `_includes/paper_item.html`.

### Layouts

- `default.html` — base layout with top nav, MathJax, Google Analytics
- `page.html` — wraps content in `<article class="post">`, extends default
- `post.html` — for blog posts

### Frontmatter for Pages

Pages (`.md` at root) use `layout: page` or `layout: default`, and set `titlebar` for the browser tab title. The `jquery: true` frontmatter flag loads jQuery/fitvids/index.js.

## Adding a New Paper

Create `_papers/YYYY_MM_venue.md` with YAML frontmatter. The `venue-category` must match one of the values in `paper_venue_order` in `_config.yml`, and `research-category` must match one of the values in `paper_category_order`, for the paper to appear in the corresponding tab.
