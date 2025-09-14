---
title: Permanent Approximation
research-category: Permanent Approximation
---

We found a connection between approximating the permanent of a PSD matrix and
approximating the maximum of a polynomial optimization problem on the sphere. By
doing so our analysis improve the approximation factor, in addition to
simplifying its proof.

<div><b>Papers:</b></div>

{% assign papers = site.papers | where: "research-category", page.research-category | sort: "year" | reverse %}
{% for paper in papers %}
{% include paper_item_short.html %}
{% endfor %}

<div><b>Talks:</b></div>
  - MIT CS Theory Lunch 2020 [\[notes\]](/assets/pdfs/theorylunch_2020_Feb.pdf)
