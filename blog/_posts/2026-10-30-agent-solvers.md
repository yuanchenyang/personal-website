---
layout: post
title: "The future of optimization solvers is instance-specific specialization"
date: 2026-10-30 18:00:00
categories: agents optimization solvers autoresearch
meta_title: The future of optimization solvers is instance-specific specialization
meta_description: Coding agents can cheaply write instance-specific LP solvers from scratch that run about 10x faster than the best general-purpose solvers.
meta_type: article
meta_image: https://www.chenyang.co/assets/images/agent-solvers-social.png
twitter_card: summary_large_image
---

{% include lp-solvers/badges.html %}

The traditional approach to solving optimization problems has been to use a
robust and well-tested general-purpose solver. However, it is well-known in the
community that instance-specific structure can be exploited to get large
speedups compared to general-purpose solvers, albeit at a loss of solver
flexibility and high implementation cost. In this post I show that LLM coding
agents can easily and cheaply write specialized solvers from scratch, obtaining
10x speedups on average for narrow instance families. This suggests a new
paradigm for building optimization solvers that uses LLM tools to automatically
detect and exploit instance-specific structure.

<!--more-->

#### A benchmark of LP instance families

First, I built a benchmark with 5 LP instance families, with their formulation
and structure detailed below. Instances in each family share the same general
structure and are based on a real-world application. They also have a
problem-specific structure that can be exploited by either CPU- or GPU-based
solvers. Each family is then split into _dev instances_ that the agents have
access to during solver development, and unseen _held-out instances_ that
completed solvers are evaluated on. Completed solvers are first evaluated on
_validity_ (are the solutions correct up to a fixed numerical tolerance), then
on _speed_ (measured in a controlled sandbox environment).

{% include lp-solvers/chart.html chart="tasks" %}

#### Family-specific solver development

I used a sandbox to run coding harnesses (Claude Opus 5.5 in Claude Code and
GPT-6 Astra in Codex) to develop solvers. The base environment has development
tools installed for Python, C++, CUDA and Rust (agents can choose any language),
along with standard linear-algebra libraries. Only the names of the instance
families are given; the agents have to discover and exploit structure by
themselves, iterate and evaluate on the development instances, and write a
solver general enough to solve the unseen held-out instances. The sandboxes also
ensured that each session received the same CPU/GPU and memory limits. The full
prompts, results, logs and solver code [can be found
here](https://huggingface.co/spaces/yuanchenyang/lp-benchmark-results) (to learn
more about the solvers and their development process, point your favorite LLM to
the link and ask questions).

{% include lp-solvers/chart.html chart="development" %}

#### Performance of specialized solvers

The agent-developed solvers show substantial speedups over general-purpose
solvers (both free and commercial) on all held-out instances, averaging about
10x faster. Some other observations:
- **Algorithm choice:** Both models chose the same general algorithm (a flavor
  of IPM or PDHG) for each family, but differed in implementation details. At a
  high level, these are well-known methods previously documented in the
  literature.
- **Source of speedups:** The largest algorithmic improvements came from
  specialized reductions tailored to each family, followed by heuristics for
  choosing initial points. Considerable engineering effort in writing efficient
  multithreaded CPU code and CUDA kernels also made a large difference.
- **Opus vs. Astra:** Astra is generally better than Opus at writing GPU
  solvers, and at finding extra reductions that Opus did not find. On the other
  hand, Opus' low-level engineering won on CPU-based instances with fixed
  structure.
- **Cost:** Each solver cost about $20-$30 in API costs with a 2-hour wall-time
  budget, but in all cases a working solver that beats the best general-purpose
  solver by at least 2x can be obtained within 30 minutes and less than $5.

{% include lp-solvers/chart.html chart="speedup" %}

#### Out-of-distribution performance

A potential criticism of specialized solvers is that they might be too brittle
and overfitted to specific families, so next I tested them on instances with
structure perturbations. For the first test, I generated slightly
out-of-distribution instances that each violate a structural assumption of
their family (hover over entries in the chart below for details). The speedups
generally decreased, but the best specialized solvers still showed a substantial
speedup over the best general-purpose solvers.

{% include lp-solvers/chart.html chart="ood" %}

For a more extreme test, I ran each specialized solver on all other instance
families. The results here are not so good, with most solvers returning an error
or running out of time/memory. There is a small number of instances with results
out of tolerance, and the QAP solver built by Opus is the most transferable to
other families. I suspect this transfer failure is mostly due the to lack of
robust checks and fallbacks, as the instructions/tests given to the agents did
not explicitly enforce general-purpose compatibility.

{% include lp-solvers/chart.html chart="cross" %}

#### Conclusion

Writing custom optimization solvers is, in some sense, a perfect task to
delegate to LLMs. Once a problem formulation is fixed and typical problem data
is known, a hill-climbing process similar to the one described above can be used
to find the best solver for a specialized domain within some time and cost
budget. Moreover, as solvers can also return a _certificate_ of optimality,
solution quality can be efficiently and independently checked. Although current
models do not seem to innovate on the high-level iterative algorithm, this
will probably change with more capable models in the future.


