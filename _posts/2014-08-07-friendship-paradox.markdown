---
layout: post
title:  "The Friendship Paradox"
date:   2014-08-07 00:00:00
categories: math
---

Let's suppose that you ask all your friends how many friends they have, and
compare that average friends that your friends have to the number of friends you
have. It might surprise you that on average, you will have less friends than
your friends have.

How can this be true? It might seem that there should be some sort of symmetry
in the number of friends everyone has, and therefore among your's friends, on
average you should have an equal number of friends with less friends than you
compared to those with more friends than you. However, you can also argue that
since someone that has more friends is friends with more people, it's more
likely that you are friends with someone with more friends than average. Let's
take a closer and more rigorous look at this problem, using probability and
friendship graphs to analyze it.

Before we look at probabilities, we need a way to specify a random network of
friends. We can represent the friendship network as a graph with $$v$$ vertices
(people) and $$e$$ edges (friendships). There are [a few ways][erdos-renyi] to
generate random graphs, for our purposes we fix $$v$$ and $$e$$ and consider
each unique graph with $$v$$ vertices and $$e$$ edges as equally likely. Here
are two random graphs with 5 nodes and 5 edges:

![Random graphs with 5 nodes and 5 edges](
/assets/images/friendship-paradox-1.svg)

We first compute the average number of friends each person has in terms of $$v$$
and $$e$$. From the point of view of a single vertex, we need to compute the
average number of edges it has.

![Point of view from a single vertex of its edges](
/assets/images/friendship-paradox-2.svg)

This is the same as summing up the degrees of all the vertices $$S = \sum_{x \in
V} d(x)$$ (here $$V$$ denotes the set of all vertices) and dividing it by the
total number of vertices $$v$$. If we look from the point of view of a single
edge instead, we see that it is connected to two vertices, and it contributes 2
to $$S$$.

![Point of view of a single edge of its vertices](
/assets/images/friendship-paradox-3.svg)

Hence:

$$\sum_{x \in V} d(x) = 2e$$

and the average number of friends each person has is $$\frac{2e}{v}$$. We see
that the change of perspective from a vertex to an edge is really helpful, and
we will be using this technique again later on.

Next, we need to find the average number of friends that each person's friends
have. We can do this by first choosing any person, and then any friend of that
person, and then ask the friend how many friends he or she has.

![A person-friend pair](
/assets/images/friendship-paradox-4.svg)

If we do this for every person-friend pair and sum up the answers, then divide
by the number of person-friend pairs, we get the average number of friends that
a person's friend can have.

What's the total number of person-friend pairs? This must be related to the
number of edges in the graph $$e$$, since each edge represents a
friendship. Also, since an edge between $$a$$ and $$b$$ contains two
person-friend pairs ($$a$$ to $$b$$ and $$b$$ to $$a$$), the total number of
person-friend pairs is $$2e$$.

How do we find the sum of all the answers? First let's take the perspective of
one person. This person asks all of his or her friends, and each friend returns
an answer. Let's suppose a person makes a mark on every edge denoting a
friendship each time he or she is asked. The following figure shows the number
of marks on each edge after one person asked all of his or her friends.

![Counts of marks on each edge after a person asked all of his or her friends](
/assets/images/friendship-paradox-5.svg)

Now the sum of all the answers is just the sum of the number of marks. To do
this let's make a change of perspective to one of the friends being asked,
$$A$$. How many marks would $$A$$ have to make? Each time someone asks $$A$$, he
or she would have to make $$d(A)$$ marks, where $$d(A)$$ is the degree of its
vertex, and he or she would be asked $$d(A)$$ times.

![Point of view of one friend](
/assets/images/friendship-paradox-6.svg)

Thus there would be a total of $$d(A)^2$$ marks. Therefore for the entire graph,
there will be $$\sum_{x \in V} d(x)^2$$ marks, the summation of the square of
each vertex's degree.

Thus the average number of friends each person's friends have is:

$$\mu_{\text{friends}} = \frac{\sum_{x \in V} d(x)^2}{2e}$$

That would be our answer, except that we don't know how to find $$\sum_{x \in V}
d(x)^2$$. We calculated earlier that the average degree of an vertex (the
average number of friends per person) is $$\mu = \frac{2e}{v}$$. The variance of
the degree of each vertex is given by:

$$\sigma^2 = \frac{1}{v} \sum_{x \in V} \left( d(x) - \mu \right)^2 =
\frac{\sum_{x \in V} d(x)^2}{v} - \frac{\mu^2}{v} $$

After a little algebra, we get:

$$\mu_{\text{friends}} = \mu + \frac{\sigma^2}{\mu}$$

Since $$\sigma^2$$ is positive, we have proved that the average number of
friends that one's friends have is greater than $$\mu$$, the average number of
friends a person has.

Let's generate some random graphs and see if this is true. We generate a graph
of 250 nodes and 500 edges. A node is colored blue if it has less friends than
the average, and red if the other way round. If it has the same number of
friends as the average, it remains grey.

<div id="graph" class="graph-container"> </div>
<div class="graph-container-box">
<div id="graph-red"  class="color-red"></div>
<div id="graph-blue" class="color-blue"></div>
<a id="graph-refresh">Click to refresh</a>
</div>

As you can see, in this case there's almost twice the number of blue nodes as
red nodes, which means the majority of people have less friends than their
peers. There's still a lot of interesting experiments to do, such as deriving
the expected percentage of blue/red nodes given the total number of nodes and
edges, or figuring out the distribution of the degrees of the nodes given our
method of generating random graphs.

<script type="text/javascript" src="/assets/js/sigma.min.js"></script>
<script type="text/javascript" src="/assets/js/friendship-paradox.js"></script>

[erdos-renyi]: http://en.wikipedia.org/wiki/Erd%C5%91s%E2%80%93R%C3%A9nyi_model
