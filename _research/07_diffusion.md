---
title: Theoretical Foundations of Diffusion Models
research-category: Theoretical Foundations of Diffusion Models
---

<div class="image-right-p">
<img src="/assets/images/gesampler.png" width="300">
</div>

Denoising diffusion models achieve state of the art quality on image generation
tasks. In this line of work we introduce a deterministic framework for reasoning
about, improving and potentially discovering new applications of diffusion
models. We interpret diffusion models as projection onto the support of the
training set, with sampling as approximate gradient descent on the distance
function to this set. Applying this interpretation, we derive a simple yet
efficient diffusion sampler, as well as a framework for incorporating
constraints (such as minimizing the drag coefficient of vehicle images) into the
generation process.

<div><b>Papers:</b></div>
{% assign papers = site.papers | where: "research-category", page.research-category | sort: "year" | reverse %}
{% for paper in papers %}
{% include paper_item_short.html %}
{% endfor %}

<div><b>Talks:</b></div>

{% assign talks = site.talks | where: "research-category", page.research-category | sort: "year" | reverse %}
{% for talk in talks %}
{% include talk_item_short.html %}
{% endfor %}
