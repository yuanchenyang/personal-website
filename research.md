---
layout: default
title: My Research
intro-title: Research
---
{% capture intro-content %}

My research interests center on convex optimization. I am currently
investigating the theoretical foundations of generative AI models. I have worked
on semidefinite relaxations, polynomial and sum of squares optimization, and the
global landscape of non-convex optimization problems.

{% endcapture %}

{% assign list = site.research %}
{% include research_list.html %}
