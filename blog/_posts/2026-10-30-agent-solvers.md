---
layout: post
title: "The future of optimization solvers is instance-specific specialization"
date: 2026-10-30 18:00:00
categories: agents optimization solvers autoresearch
meta_title: The future of optimization solvers is instance-specific specialization
meta_description:
meta_type: article
meta_image: https://www.chenyang.co/assets/images/agent-solvers-social.png
twitter_card: summary_large_image
---

{% include lp-solvers/badges.html %}

The traditional approach to solving optimization problems has been to use a
robust and well-tested general-purpose solver. However, it is well-known in the
community that instance-specific structure can be exploited to get large
speedups compared to general-purpose solvers, albeit at a loss of solver
flexibility and high implementation cost. In this post I show that with LLM
coding agents, we can easily and cheaply write specialized solvers from scratch,
obtaining 10x speedups on average for narrow instance families. This suggests a
new paradigm for building optimization solvers that uses LLM tools
to automatially detect and exploit instance-specific structure.

<!--more-->

#### A benchmark of LP instance families

First, I built a benchmark with 5 different families, with their formulation and
structure detailed below. Instances in each family share the same general
structure and are based on a real-world application, they also have a
problem-specific structure that can be exploited by either CPU- or GPU-based
solvers. Each family is then split into _dev instances_ that the agents have
access to during solver development, and unseen _heldout instances_ that
completed solvers are evaluated on.

{% include lp-solvers/chart.html chart="tasks" %}

#### Family-specific solver development

I used a sandbox to run coding harnesses (Opus 5.5 in Claude Code and
GPT-6-Astra in Codex) to develop solvers. Only the names of the instance
families are given, the agents have to discover and exploit structure by
themselves, and write a solver general enough to work on the unseen held-out
instances. The sandboxes also ensured that each session received the same
CPU/GPU and memory limits. The full results, logs and solver code can be found
[here](https://huggingface.co/spaces/yuanchenyang/lp-benchmark-results).

{% include lp-solvers/chart.html chart="development" %}

#### Performance of specialized solvers

The agent-developed solvers show substantial speedups over general-purpose
solvers (both free and commercial) on all held-out instances, averaging about
10x faster. Some other observations:
- **Algorithm choice:** Both models chose the same algorithm (flavor of IPM or
  PDHG) for each family, but differed in implementation details
- **Source of speedups:** The largest algorithmic improvements came from
  specialized reductions tailored to each family, followed by heuristics for
  choosing initial points. Considerable engineering effort in writing efficient
  CPU code or CUDA kernels also made a large difference.
- **Opus v.s. Astra:** Astra is generally better than Opus at writing GPU
  solvers, or at finding extra reductions that Opus did not find. On the other
  hand, Opus' low-level engineering won on CPU-based instances with fixed
  structure.
- **Cost:** Each solver cost about $20-$30 in API costs with a 2 hour wall-time
  budget, but in all cases a working solver that beats the best general purpose
  solver by at least 2x can be obtained within 30 mins and less than $5.

{% include lp-solvers/chart.html chart="speedup" %}

#### Out-of-distribution performance

A potential criticism of specialized solvers is that they might be too brittle
and overfitted to specific families, so next I tested them on instances with
structure perturbations. For the first test, I generated slightly
out-of-distribution instances that each violate a structural assumption for each
family (hover over entries in the chart below for details). The speedups
generally decreased, but the best specialized solvers still showed a 2x speedup
over the best general-purpose solvers. 

{% include lp-solvers/chart.html chart="ood" %}

For a more extreme test, I ran each specialized solver on all other instance
families. The results here are not so good, with most solvers returning an error
or running out of time/memory. There is a small number of instances with results
out of tolerance, and the QAP solver built by Opus is the most transferrable to
other families. This is mostly due to lack of robust checks and fallbacks, as
the instructions/tests given to the agents did not explicitly enforce
general-purpose compatibility.

{% include lp-solvers/chart.html chart="cross" %}

#### Conclusion
