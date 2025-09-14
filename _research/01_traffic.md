---
title: Control of Queueing Networks
research-category: Control of Queueing Networks
---

Undergrad research in Alex Bayen's group at UC Berkeley studying the effect of
attacks on mobility as a service networks (such as Uber or Lyft) by an adversary
gaining control of a fraction of the network, and how we can deter these
attacks. We model this problem as a queueing network and the attacker or
operator aims to optimally control a fraction of the agents in the network to
meet some objective.

<div><b>Papers:</b></div>

{% assign papers = site.papers | where: "research-category", page.research-category | sort: "year" | reverse %}
{% for paper in papers %}
{% include paper_item_short.html %}
{% endfor %}
