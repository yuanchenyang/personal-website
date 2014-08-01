---
layout: post
title:  "Book Review: Naive Set Theory by Paul Halmos (Part 1)"
date:   2014-07-29 00:00:00
categories: math
---

Last weekend I just finished reading [Naive Set Theory][amazon-link] by Paul
Halmos, and I think it would be good to write down some thoughts and interesting
proofs in the book while the material is still fresh in my mind.

Overall I think this book is a short and concise introduction to set theory,
covering a lot of material in only 102 pages. There is a good summary and review
of the book [here][review-1], so I'm not going to repeat what that author
said. For me, one major shortcoming of this book is that there are too few
exercises, averaging only 2-3 per chapter. I think best (and only?) way to learn
mathematics is to come up with examples and work out exercises, both of which
this book lack. I guess the Halmos expected readers to come up with such
examples themselves:

> Don't just read it; fight it! Ask your own questions, look for your own
> examples, discover your own proofs. Is the hypothesis necessary? Is the
> converse true? What happens in the classical special case? What about the
> degenerate cases? Where does the proof use the hypothesis?

As a result, I took a very long time to read each chapter, only looking at the
bare minimum of definitions and propositions and trying to come up with proofs
myself before looking at the book's. While working through the book, I've also
summarized the definitions and proofs written them down in my notebook, which I
will (eventually) scan and upload digitally. So instead of providing a summary
(the above link already did a good job doing that), I'm going to pick my most
favorite proofs and explain them in the following posts.

Counting Equivalence Classes
----------------------------

A relation $$R$$ is a set of ordered pairs. For every $$(x, y) \in R$$, we can
write $$x R y$$. A relation in set $$X$$ is a subset of $$X \times X$$, a
relation between members of $$X$$. An _equivalence relation_ is a relation in
set $$X$$ where the following three properties hold:

1. Reflexive: $$x R x$$
2. Symmetric: $$x R y \iff y R x$$
3. Transitive: $$x R y \wedge y R z \Rightarrow x R z$$

For all $$x, y, z \in X$$. We can represent equivalence relations in a finite
set by using a table listing all possible ordered pairs, representing an
equivalence with an entry in the table.

      a b c d      a b c d      a b c d      a b c d
    a o o        a o          a o o o      a o   o
    b o o        b o o        b o o        b   o
    c     o      c o o o      c o   o      c o   o
    d            d       o    d       o    d       o

The first three relations are each missing one property of equivalence
relations: The first relation is not reflexive ($$d \cancel{R} d$$), the second
one is not symmetric ($$b R a$$ but $$a \cancel{R} b$$), and the third one is
not transitive ($$c R a$$ and $$a R b$$ but $$c \cancel{R} b$$). The last
relation is satisfies all three properties and is an equivalence relation.

Given a set, we want to count the total number of equivalence relations in
it. Let's try to list out the number of equivalence relations in a set of 4
elements. In the figure below, we represent each equivalence relation in a grid,
with each colored square indicating an ordered pair. The reflexive pairs in each
relation ($$aRa$$, etc) are greyed for clarity.

![Equivalence relations for a set of 4 elements](/assets/images/equivalence-relations-4x4.svg)

We can immediately see some interesting patterns from the figure. An equivalence
relation is like splitting the elements into groups, with elements in each group
mutually equivalent. The top row represents splitting each element into a group
on its own $$(\{a\}, \{b\}, \{c\}, \{d\})$$, or into one group with 4 elements
$$(\{a, b, c, d\})$$. The second row represents splitting into two groups of two
elements each $$(\{a, b\}, \{c, d\}$$ or $$\{a, c\}, \{b, d\}$$ or $$\{a, d\}, \{b,
c\})$$, and so on. We call these groups equivalence classes; an equivalence
class of $$x \in X$$ is $$\{y \in X : x R y \}$$.

From this, it's natural to postulate that the number of equivalence relations is
the same as the number of partitions in a set. A partition of set $$X$$ is a set
of non-intersecting subsets of $$X$$ whose union is $$X$$. We first prove that
if $$R$$ is an equivalence relation in $$X$$, the set of equivalence classes is
a partition of $$X$$ such that $$x R y$$ iff they belong to the same subset in
the partition.

Let's call the set of equivalence classes $$C$$. If $$x R y$$, then they both
belong to the same equivalence class in $$C$$. We have to prove that this is a
partition. Since an equivalence relation is reflexive, $$x R x$$, so every $$x
\in X$$ is in a equivalence class, and therefore $$\cup C = X$$. Now we prove
that the sets in $$C$$ are non-intersecting. Suppose that $$x$$ belonged to two
distinct equivalence classes $$A$$ and $$B$$. However, $$\forall a \in A \land b
\in B , a R b$$, since $$x R a \land x R b \Rightarrow$$ $$a R x \land x R b
\Rightarrow$$ $$a R b$$. Thus $$A$$ and $$B$$ are the same equivalence class,
and this leads to a contradiction. Thus each $$x \in X$$ can only belong to one
equivalence class, the proof is complete.

The next step is to prove that for every partition $$C$$ of $$X$$, if we can
define a relation such that $$x R y$$ iff they belong to the same subset in the
partition, the set of equivalence classes of $$R$$ is exactly $$C$$. This proof
is left as an exercise to the reader. I find this connection between equivalence
classes and partitions interesting as it can be easily visualized from the
diagram above. As to how to count the number of equivalence classes/partitions,
this [wikipedia article][bell-number] gives a good overview.

That's it for this post! Stay tuned for the next one, where I'm going to write
about well-ordering and transfinite recursion.

[amazon-link]:   http://www.amazon.com/Naive-Set-Theory-Paul-Halmos/dp/1614271313
[review-1]: http://lesswrong.com/lw/ir6/book_review_na%C3%AFve_set_theory_miri_course_list/
[bell-number]: http://en.wikipedia.org/wiki/Bell_number
