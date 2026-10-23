---
layout: post
title: "Building a comprehensive dataset of semidefinite programs"
date: 2026-10-23 00:00:00
categories: agents optimization dataset
meta_title: Building a comprehensive dataset of semidefinite programs
meta_description:
meta_type: article
meta_image:
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

(TODO: Add badges to hf dataset (https://huggingface.co/datasets/yuanchenyang/mathoptdataset-sdp), instance viewer and solver)

<!--more-->

#### Dataset design

The problem instances should be stored in a common format that can encompass
multiple types of optimization problems and easy to convert to input into
multiple optimization solvers. I chose
[JuMP's](https://github.com/jump-dev/JuMP.jl)
[`MathOptFormat`](https://github.com/jump-dev/MathOptFormat), which can describe a
wide variety of optimization problems, has comprehensive solver support, and is
language agnostic. The metadata for each problem is stored in a separate `.yaml`
file.

(TODO: insert a compact visual of the metadata of a typical problem instance)

#### Data pipeline

To collect this dataset, I set up a roughly 3-stage pipeline, making heavy use
of parallel GPT Sol agents and Luna subagents.

**1. Source discovery:** This stage consists of launching dozens of parallel
agents to comb the entire internet for SDP instances. It searched github code,
papers, books, lecture notes, existing datasets and publicly available
collections. These sources are deduplicated, cataloged, and ranked by
quality. The discovery stage stopped when most sources discovered each round
turned out to be duplicates.

**2. Instance extraction/conversion:** This is the most expensive stage
regarding time and computational resources, where sources are downloaded,
extracted and converted to the common `MathOptFormat`. In the end, more than
500+ individual converter scripts totaling more than 100k lines of code are
written. These scripts range from simple ones converting from one format to
another, to implementing solutions of textbook exercises, and more complex ones
that reproduce SDP formulations taken from research papers.

**3. Quality control:** To ensure that every instance is high quality and the
dataset is as free of errors as possible, I ran multiple rounds of cross-checks
and quality control. These included deduplication, metadata checks, cheaper
sanity checks to solving each problem with a SDP solver and comparing the
solution to a documented optimum where available. After this stage, I ended up
with more than 5k individual instances in the final dataset.

Here are some statistics of the instances in the dataset, detailed comparisons
can be found in this dashboard. 

(TODO: badge to huggingface dataset viewer)

(TODO: Insert word cloud of tags)

(TODO: Insert graph of Variables against constraints with minimise, maximise and feasibility)


#### Solver comparisons

Next I benchmarked a wide variety of solvers on these instances. To ensure the
run finishes in a reasonable amount of time, I used a fairly strict 30 second
timeout.

First we compare the accuracy of the solvers, how many instances they can solve
and whether their solution value agrees with the consensus. 

(TODO: Add "How many solvers solve each instance?" plot)

(TODO: Add "Solved by one, not the other" plot)

(TODO: Add "Independently checked error" plot)

(TODO: Add "Who agrees with the consensus?" plot, sorted by "Agrees with the consensus" percentage)

Next, we compare the performance of the solvers, by their measured solve time on
each instance.

(TODO: Add "Head-to-head speed" plot)

(TODO: Add "Performance profile" plot)

(TODO: Add "Rank among the solvers" plot)

#### What's next?

The goal of this dataset is to collect all the SDP problems that have been
formulated and that people care about. Having a comprehensive dataset of SDP
instances
