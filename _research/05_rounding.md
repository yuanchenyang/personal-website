---
title: Rounding Convex Relaxations of Quadratic Maps
research-category: Rounding Convex Relaxations of Quadratic Maps
---

<div class="image-right-p">
<img src="/assets/images/psdforms_rounding.png" width="350">
</div>

This line of work studies convex relaxations of functions of the form $$f(x^T
A_1 x, \ldots, x^T A_d x)$$. For very high degree but structured polynomials we
derive intermediate relaxations interpolating between spectral and
Sum-of-Squares relaxations, as well as randomized rounding schemes (see picture
on the right). We also analyze rounding schemes for different functions $$f$$,
making a connection to Max-Cut.

<div><b>Papers:</b></div>

{% assign papers = site.papers | where: "research-category", page.research-category | sort: "year" | reverse %}
{% for paper in papers %}
{% include paper_item_short.html %}
{% endfor %}

<div><b>Talks:</b></div>
  - LIDS Student Conference 2021 [\[slides\]](/assets/pdfs/prod_psd_forms_lidsconf.pdf)
  - Fields Institute Workshop 2021 [\[slides\]](/assets/pdfs/prod_psd_forms_fields.pdf) [\[video\]](https://youtu.be/SStvrbXmV4E)
  - ISMP 2024 [\[slides\]](/assets/pdfs/ismp_2024_talk.pdf)
