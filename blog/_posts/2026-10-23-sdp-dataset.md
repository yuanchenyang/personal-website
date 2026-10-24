---
layout: post
title: "Building a comprehensive dataset of semidefinite programs"
date: 2026-10-23 18:00:00
categories: agents optimization dataset
meta_title: Building a comprehensive dataset of semidefinite programs
meta_description: I used parallel coding agents to collect and convert more than 5,000 semidefinite programs from the internet into a single dataset, then benchmarked 10 SDP solvers on it for accuracy and speed
meta_type: article
meta_image: https://www.chenyang.co/assets/images/sdp-dataset-social.png
twitter_card: summary_large_image
---

Since models have gotten so much better at math, proofs and coding, I started
thinking about other productive uses of the ever cheaper and more intelligent
tokens, other than proving theorems and solving open math problems.

Towards harnessing models' capabilities for accelerating real-world problems, I
think it'll be incredibly useful to build a comprehensive dataset of
optimization problem instances, and agents have gotten smart and cheap enough to
make this happen. I started with semidefinite programs (SDPs) as they constitute
a relatively small class that I'm quite familiar with.

{% include sdp-dataset/badges.html badges="dataset,overview,solvers" %}

<!--more-->

#### Dataset design

The problem instances should be stored in a common format that can encompass
multiple types of optimization problems and is easy to convert to input into
multiple optimization solvers. I chose
[JuMP's](https://github.com/jump-dev/JuMP.jl)
[`MathOptFormat`](https://github.com/jump-dev/MathOptFormat), which can describe
a wide variety of optimization problems, has comprehensive solver support, and
is language agnostic. The metadata for each problem is stored in a separate
`.yaml` file, see for instance the example below.

{% include sdp-dataset/metadata.html %}

#### Data pipeline

To collect this dataset, I set up a roughly 3-stage pipeline, making heavy use
of parallel GPT Sol agents and GPT Luna subagents.

**1. Source discovery:** This stage consists of launching dozens of parallel
agents to comb the entire internet for SDP instances. It searched github code,
papers, books, lecture notes, existing datasets and publicly available
collections. These sources are deduplicated, cataloged, and ranked by
quality. The discovery stage stopped when most sources discovered each round
turned out to be duplicates.

**2. Instance extraction/conversion:** This is the most expensive stage
regarding time and computational resources, where sources are downloaded,
extracted and converted to the common `MathOptFormat`. In the end, 500+
individual converter scripts totaling 150k+ lines of code are written. These
scripts range from simple ones converting from one format to another, to
implementing solutions of textbook exercises, and more complex ones that
reproduce SDP formulations taken from research papers.

**3. Quality control:** To ensure that every instance is high quality and the
dataset is as free of errors as possible, I ran multiple rounds of cross-checks
and quality control. These included deduplication, metadata checks, various
sanity checks and finally solving each problem with an SDP solver and comparing
the solution to a documented optimum where available. After this stage, I ended
up with more than 5k individual instances in the final dataset.

Here are some statistics of the instances in the dataset, detailed comparisons
can be found [in this
dashboard](https://huggingface.co/spaces/yuanchenyang/mathoptdataset-sdp-overview).

{% include sdp-dataset/chart.html chart="tags" %}

{% include sdp-dataset/chart.html chart="variables-constraints" %}


#### Solver comparisons

Next I benchmarked a wide variety of solvers on these instances. To ensure the
run finishes in a reasonable amount of time, I used a fairly strict 20 second
timeout. Below I show some key visualizations, the full suite is [available
here](https://huggingface.co/spaces/yuanchenyang/mathoptdataset-sdp-solvers).

##### Accuracy 

First I compared the accuracy of the solvers, how many instances they can solve
and whether their solution value agrees with the consensus. 

{% include sdp-dataset/chart.html chart="solved-count" %}

{% include sdp-dataset/chart.html chart="solved-by-one" %}

{% include sdp-dataset/chart.html chart="checked-error" %}

{% include sdp-dataset/chart.html chart="consensus" %}

##### Speed

Next, I compared the performance of the solvers, by their measured solve time on
each instance. Note that since there is a timeout of 20 seconds, this comparison
might be biased towards solvers that perform well on small to medium scale
problems, as large scale problems that take more than 20 seconds to solve are
not reflected here.

{% include sdp-dataset/chart.html chart="head-to-head" %}

{% include sdp-dataset/chart.html chart="performance-profile" %}

{% include sdp-dataset/chart.html chart="rank" %}

{% include sdp-dataset/footnote.html %}

#### What's next?

The goal of this dataset is to collect all the SDP problems that have been
formulated and are publicly available. Having a comprehensive dataset of SDP
instances lets us benchmark existing solvers against real-world problems, as
well as providing another test suite for solver interfaces (for example, it has
already found a couple of bugs in JuMP). It also paves the way for teaching LLMs
to write custom solvers that finds and exploits instance-specific structure,
something that I will be looking into in the future.
