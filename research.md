---
layout: default
title: My Research
intro-title: Research
---
{% capture intro-content %}

I currently do research in convex optimization, with a focus on semidefinite
relaxations, polynomial and sum of squares optimization, and solving large-scale
problems.

{% endcapture %}

{% assign list = site.research %}
{% include research_list.html %}
