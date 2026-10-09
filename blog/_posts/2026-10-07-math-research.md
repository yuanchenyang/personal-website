---
layout: post
title: "Reflections on automating theorem proving"
date: 2026-10-07 00:00:00
categories: agents math
meta_title: Reflections on automating theorem proving
meta_description: Over the past five months, agents have gone from constantly making mistakes in proofs to correctly one-shotting difficult theorems. In this post, I reflect on their rapid progress, summarize numerous refinements/updates to my workflows, and lay out my thoughts on what is worth working on in the future.
meta_type: article
meta_image: https://www.chenyang.co/assets/images/dependency-graph-social.png
twitter_card: summary_large_image
---

Five months have passed since I first [built a harness](/blog/automatic-theorem-proving.html)
to automatically prove and verify a conjecture from my PhD work. Since then,
there have been many step changes in LLM capability, necessitating many
revisits/refinements of my workflows. In this post, I summarize these
observations, reflect on the rapid progress of LLMs, and lay out my thoughts on
how to prepare for the future.

<!--more-->

#### A personal agentic benchmark

Over the past few months, I've been using the problem of *proving benign
nonconvexity of low-rank sum of squares decomposition of polynomials* as a
benchmark to measure the progress of LLM agents. This problem is described in
[my previous blog post](/blog/automatic-theorem-proving.html), as well as [these
slides](/assets/pdfs/iccopt_2025_talk.pdf). This problem is a good benchmark
because it has the following properties:

1. **Elementary statement**: It's stated in terms of polynomials and
inner products, thus it is amenable to formal verification in Lean. The theorem
statement is short and easy to translate into Lean.

2. **Complex and nontrivial proof structure**: Although the statement is simple,
the proof is very complex, involving deep algebraic geometry knowledge and
intricate case analysis. This is tedious for humans, but can be easily automated
by agents.

3. **Family with increasing difficulty**: This problem is parameterized by the
number of (homogeneous) variables $$n$$, degree $$2d$$ and factorization rank
$$r$$. I have a conjectured value of $$r$$ for every $$n$$ and $$d$$, so
increasing $$n$$ and $$d$$ provides a family of increasingly difficult problems.

4. **Automated incremental progress**: The proof of a theorem is a statement for
all sum-of-squares polynomials in $$\mathbb{R}[x]_{n, 2d}$$, but finding a
counterexample for any fixed polynomial can be formulated as a convex
optimization problem. Hence LLM agents can use computational tools to aid proof
search and always make progress.

Before I started using LLMs, the following cases are solved:

 - $$d=1$$ (quadratic forms): Well-known result
 - $$n=1$$ (univariate polynomials): During my PhD by [our
   paper](https://arxiv.org/abs/2205.11466)

#### February-March 2026 (GPT 5.3): Early explorations

Around this time, coding agents are starting to become useful, so I started
testing them on the next hardest case: $$n=2, d=2$$ (ternary quartics). I set up
an environment giving a coding agent access to:

 - The LaTeX file of our paper containing the univariate proof
 - The Julia code I had written before for counterexample search
 - The statement I wanted to prove, and the outline for an automated research
   loop

After running agents in this environment, I found that:

 - Agents can correctly formulate SDPs and search for counterexamples
 - However, the proofs they wrote either have mistakes or omissions of key
   details, and prompting them to check more carefully led to the mistakes
   becoming harder to find

Reflecting on why this attempt failed, it became clear to me that the bottleneck
is now in verification, since proof generation is cheap: manually verifying
every proof is time consuming and would not scale. Thus I turned to formal
verification as a potential solution.

#### April 2026 (GPT 5.4): Formal verification and proof search

Before proceeding further, I wanted to know is whether agents can automatically
formalize existing proofs (this was a time where auto-formalization results are
still hard to come by). I provided an agent with my paper containing the
univariate result, and after a few hours it automatically came up with a proof
of the theorem that passes the Lean checker.

![Formal theorem dependency graph](/assets/images/dependency-graph.svg)

I was really excited by this result, as it means that I can run an autonomous
agent loop that searches for results while keeping the current results fully
verified. This led to the work described in [this blog
post](/blog/automatic-theorem-proving.html), where I built a harness to
automatically generate a proof of the ternary quartic case in Lean ($$n=2, d=2,
r=4$$ ✅).

![Successful Apr 9 run LOC](/assets/images/loc_autoproof-tq-r4-apr9.png)

Reflecting on this successful attempt, it seems that my main contributions were
building the harness, defining the loop and providing the high-level strategy
(search for counterexamples by solving optimization problems, generalize dual
certificates into proofs). My next experiment is to determine if these
contributions/interventions are necessary at all.

#### May 2026 (GPT 5.5): Natural language proofs

My previous attempt required the agent to "think" in Lean, as proving in plain
language is too error-prone. With this new generation of models, I decided to
try and test if they can generate a natural language proof, which then can be
translated into Lean.

I gave the next hardest case (which I wasn't able to solve with the previous
approach) to GPT 5.5 Pro and asked it to either prove it or return a
counterexample. After 2 hours of thinking, it returned a proof which I then fed
to my previous harness, and after about a day of work it is able to return a
fully formalized Lean proof (~20k lines) for the quaternary quartic case
($$n=3, d=2, r=7$$ ✅).

![Successful May 5 run LOC](/assets/images/loc_autoproof-qq-r7-may5.png)

This attempt showed that I don't even need to explicitly state proof strategy,
or even mention using convex optimization solvers to search for
counterexamples. The LLM decides by itself the general plan of attack, which
also involved solving optimization problems (from examining its reasoning
summary). What still required my involvement is basically harness engineering,
which involves building a sandbox environment with all the right tools
installed, and setting up the agentic loop for Lean verification.

#### July 2026 (GPT 5.6): Multi-agent coordination

With the release of GPT 5.6, I noticed that the model has another step change in
its proof capabilities: when given a problem that is too hard, it will give up
and say that no proof has been found, instead of returning a false proof.

In addition, all the engineering work I previously put in to build my custom
harness and environment is obsolete, since it is able to automatically set up
cloud sandbox environments, install the Lean toolchain and run multiple
subagents to complete a proof formalization. With this, I was able to command an
agent swarm to work on the next hardest case, with up to 10 parallel agents
working together for multiple days to complete a 100k-line Lean-verified proof
for the ternary sextic case ($$n=2, d=3, r=5$$ ✅).

#### September 2026 (GPT 6): One-shotting proofs

With GPT 6, I asked it to prove or disprove my conjecture for the general case
of this problem, where the minimum rank is $$r = \binom{n + d - 1}{d} + 1$$ for
all $$n$$ and $$d$$. When previous models failed to make any progress, this
model found a counterexample to my conjecture ($$n=2, d=5, r=7$$ ❌). Moreover,
it took around 30 minutes of thinking to find this counterexample compared to
the hours of thinking needed for previous models. The landscape of this problem
turned out to be more complex than I anticipated.

#### Observations and discussion

As we have seen from these examples, there has been rapid progress over the past
few months, with no signs of slowing down. Thus it is useful to have personal
evaluations/benchmarks to test each new generation of models, to build a mental
model of what tasks they are currently good at and what they struggle at. For
example, current models are good at powering through case analysis and tedious
calculations, piecing together techniques from a wide range of fields and
searching over many lines of attack. On the other hand, they are not as good at
tasks with long-horizon feedback or tasks with ambiguous goals. Insights about
their capabilities can then be used to refine and improve workflows.

I also find it useful to think of workflows, harnesses and tooling (sandboxes,
environments, etc.) as necessary ingredients to get agents to do useful work,
complementing their weaknesses and providing guardrails to catch and correct
mistakes. Although it's crucial to spend time to get workflows in place and
understand how they work, as models improve and make fewer mistakes, workflows
that perform well today will become obsolete over time. Thus it's important to
not overengineer workflows and be prepared to change them as models improve.

#### What remains for us to do?

In the past few months we have seen a rapid shift in bottlenecks in
mathematics. Proofs have become easy to generate, and their formal verification
in Lean can also be easily automated. How can we do impactful work that also
withstands the test of time? It's easy to focus on the weaknesses of current
models and try to do work that overcomes them, but as we can see from the
examples above, such work could be futile as models continue to improve.

Instead of trying to overcome current deficiencies of models, a more worthwhile
goal is to help our fellow humans think more clearly and gain a deeper
understanding of these technical topics. This is ultimately a social endeavor
that we are uniquely advantaged at. Personally, I get a lot of satisfaction from
spending a long time to learn something, struggling with the material until I
gain a deep understanding, then teaching and sharing the insights I gained with
others. Thus this is what I will focus my efforts on in the future.
