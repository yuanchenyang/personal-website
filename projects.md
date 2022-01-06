---
layout: default
title: My Projects
intro-title: Hobby Projects
---
{% capture intro-content %}

Progamming projects I created for fun, to learn a new language/library or tools
to make life easier. The tool I use most is my
[dashboard](#/projects/06-dashboard), I always have it open on my computer,
phone and a screen controlled by a raspberry pi at home. Next is the [PDF popup
link viewer](#/projects/07-pdfviewer), which is super helpful to cross-reference
links to equations and theorems when reading papers.

{% endcapture %}

{% assign list = site.projects %}
{% include project_list.html %}
