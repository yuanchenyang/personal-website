---
title: Focused Polynomials
research-category: Thesis
---

Masters thesis work on characterizing classes of polynomial optimization
problems on the sphere that can be compressed by a random projection. Introduced
the notion of polynomials generated from focused cones, and the reduced
dimension depends on the Gaussian width of the focused cones.

<div><b>Papers:</b></div>

{% assign papers = site.papers | where: "research-category", page.research-category | sort: "year" | reverse %}
{% for paper in papers %}
{% if paper.title contains "Focused Polynomials" %}
{% include paper_item_short.html %}
{% endif %}
{% endfor %}
