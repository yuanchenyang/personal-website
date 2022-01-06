---
layout: default
title: My Software
intro-title: Software
---

{% capture intro-content %}
Some software I created during my undergrad and PhD.
{% endcapture %}


{% assign list = site.software %}
{% include project_list.html %}
