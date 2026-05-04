---
layout: post
title: "Automated Proof of a Benign Nonconvex Landscape Theorem"
date: 2026-05-01 00:00:00
categories: agents math
---

In early 2026, I noticed that LLM agents are becoming more capable at solving
math problems, and started to use them more for theorem proving. Early April, I
ran an automated theorem proving experiment on a nonconvex optimization problem
from sum-of-squares optimization, an extension of [a chapter of my PhD
work](https://arxiv.org/abs/2205.11466).

The goal was to give an agent the formal statement of a theorem in Lean, a
computational search toolkit and a verification harness, then let it
autonomously work through the whole cycle that I previously went through: search
for counterexamples, infer structure, write a mathematical blueprint, formalize
the proof, and keep going until Lean accepted the final theorem.

Over roughly three days of continuous work, the agent produced about 58k lines
of Lean, 2k lines of Julia, 7.5k lines of LaTeX, and more than 200 commits
before finally proving the theorem.

<!--more-->

![Successful Apr 9 run LOC](/assets/images/loc_autoproof-tq-r4-apr9.png)

### The theorem proved

Let $$\mathbb{R}[x_1,x_2,x_3]_d$$ be the space of ternary forms of degree $$d$$,
and let

$$
\mathbf{u} = [u_1,\ldots,u_4] \in \mathbb{R}[x_1,x_2,x_3]_2^4.
$$

For a quartic sum-of-squares form $$p \in \Sigma[x_1,x_2,x_3]_4$$ consider the
nonconvex objective

$$
f_p(\mathbf{u}) =
\left\|\sum_{i=1}^4 u_i^2 - p\right\|^2,
$$

where the norm comes from any positive-definite inner product on quartic
ternary forms.

This objective asks for a representation of $$p$$ as a sum of four squares of
quadratic forms. The formulation is nonconvex because the variables are the
quadratic factors $$u_i$$, not the positive semidefinite Gram matrix from the
typical sum-of-squares semidefinite program (SDP). The theorem says that this
nonconvex landscape is benign.

**Theorem** _For all $$p \in \Sigma[x_1,x_2,x_3]_4$$, if $$\mathbf{u} \in
\mathbb{R}[x_1,x_2,x_3]_2^4$$ is a second-order critical point of $$f_p$$
satisfying the first- and second-order necessary conditions_

$$
\nabla_{\mathbf{u}} f_p(\mathbf{u})(\mathbf{v}) = 0
\quad \text{and} \quad
\nabla_{\mathbf{u}}^2 f_p(\mathbf{u})(\mathbf{v},\mathbf{v}) \ge 0
$$

_for every perturbation $$\mathbf{v}$$, then_

$$
f_p(\mathbf{u}) = 0.
$$

In other words, every second-order critical point is also globally optimal and
there are no spurious local minima for the rank-4 ternary quartic Burer-Monteiro
factorization.

### Why is this theorem interesting?

It is a classically known fact that all nonnegative binary forms (univariate
polynomials) can be written as a sum of two squares. In a joint paper with
Benoit Legat and Pablo Parrilo published in the [SIAM Journal of
Optimization](https://doi.org/10.1137/22M1516208), we showed that for all
nonnegative binary forms $$p$$, the nonconvex rank-2 factorization of $$
f_p(\mathbf{u}) = \left\| u_1^2 + u_2^2 - p\right\|^2 $$ has no spurious local
minima. This is surprising because the usual method for finding sum-of-squares
decompositions solves a rank-$$n$$ SDP; we showed that it also suffices to solve
a much smaller (albeit nonconvex) problem using first-order methods.

Naturally, we also asked the same question for multivariate polynomials, but at
that time we were stumped by the complexity of the problem (the proof for binary
forms does not easily generalize) and did not make much progress. A natural next
class to study would be ternary quartics, as [Hilbert
showed](https://en.wikipedia.org/wiki/Ternary_quartic) that all nonnegative
ternary quartics can be written as a sum of 3 squares.

Surprisingly, for a rank-$$3$$ factorization, $$\mathbf{u} = [x_1^2, x_2^2, x_1
x_2]$$ is a second-order critical point of $$f_p$$ with $$p = 2x_3^4 + x_1^4 +
x_2^4 + x_1^2 x_2^2$$ (this counterexample first appeared in [a
paper](https://arxiv.org/pdf/2411.02208) by Blekherman, Sinn, Velasco and
Zhang). Hence the rank-4 result proved in the above theorem is sharp.


### Why is this theorem amenable to automated proof?

I think this theorem is a useful benchmark for automated proof development
because it has the following properties:

1. Its involves elementary objects (polynomials, vector spaces, inner products,
   first- and second-order optimality conditions) that are easy to state using
   Lean and mathlib
2. The theorem statement can be written concisely into Lean, and verifying the
   translation is straightforward
3. Although the statement is concise, the problem has intricate algebraic
   structure that has to be discovered by the proof agent
4. It is easy to make incremental progress on the theorem using computational
   tools

It's worth elaborating on the last point. This theorem is statement that has to
be proved for all critical points $$\mathbf{u} \in \mathbb{R}[x_1,x_2,x_3]_2^4$$
of all $$p \in \Sigma[x_1,x_2,x_3]_4$$. If we fix a particular $$\mathbf{u}$$,
it turns out that the search over all $$p$$ that $$\mathbf{u}$$ is a spurious
critical point of, can be formulated as a SDP (for more details see [our
paper](https://arxiv.org/abs/2205.11466) or [these
slides](/assets/pdfs/iccopt_2025_talk.pdf)). If $$\mathbf{u}$$ does not admit
such counterexamples, the dual certificate of the SDP gives a proof for this
particular $$\mathbf{u}$$. The challenge is to find certificates for all
$$\mathbf{u}$$.

It's important to emphasize that these SDP certificates are numerical artifacts,
so they are not directly proofs. But patterns from these certificates can be
generalized into proofs for more general classes of $$\mathbf{u}$$. In fact, we
went through a similar process (manually) to prove the result for binary forms:

### The agentic loop

This suggests a natural SDP-to-Lean iteration loop that can be automated by
agents:

1. Find and fix a $$\mathbf{u}$$ not covered by current proof, use SDP solvers
   to search for counterexamples and extract certificate patterns
2. Generalize the observed patterns into a mathematical proof blueprint for a
   larger class of $$\mathbf{u}$$
3. Formalize the proof in Lean
4. Run a verification harness that builds the Lean files and checks the theorem
5. Repeat until the theorem is proved

The code and harness I used are in [this github
repository](https://github.com/yuanchenyang/nonconvex_sos_landscape), along with
the completed proof. The commit history made by the agent for the successful run
can be found [in this
branch](https://github.com/yuanchenyang/nonconvex_sos_landscape/tree/autoproof-tq-r4).
The successful run followed the loop encoded in
[`prompts/ternary_quartic.md`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/prompts/ternary_quartic.md).

The agent was instructed to begin with numerical explorations. The Julia code in
[`julia/`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/julia/)
formulates SDP searches using [JuMP](https://github.com/jump-dev/JuMP.jl) and
[SumOfSquares.jl](https://github.com/jump-dev/SumOfSquares.jl) to call SDP
solvers. The purpose of these searches was to look for spurious second-order
critical points and when searches failed, to inspect the dual certificates
explaining why.

Those certificates suggested algebraic patterns such as ideal membership,
divisibility, dimension counts, and structure in the span of quadratic forms.
The agent was required to record numerical experiments under
[`julia/ternary_quartic_explorations/`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/julia/ternary_quartic_explorations/)
and translate the resulting proof ideas into
[`writeup/ternary_quartic/blueprint.tex`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/writeup/ternary_quartic/blueprint.tex).

The agent first writes each proof in ordinary mathematical language before
formalizing. The Lean files were added under the folder
[`TernaryQuarticProof/`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/TernaryQuarticProof/),
with the immutable statement in
[`TernaryQuartic.lean`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/TernaryQuartic.lean)
left untouched.

The verification step involves running a script:

```bash
./scripts/verify_ternary_quartic.sh
```

That script builds the Lean targets, typechecks the root proof file, confirms
that the required theorem is exposed under the expected name, and checks the
axiom footprint. The final accepted theorem depends only on the standard
mathlib axioms:

```text
propext, Classical.choice, Quot.sound
```

Thus, the script rejects a proof that leaves a `sorry` behind or introduces
other axioms.

### The harness

The proof ran inside the repository's [Vagrant VM](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/Vagrantfile). That VM supplies a
reproducible Ubuntu environment with Lean, Julia, Lake caches, and solver
dependencies available to the agent.

The launcher for the successful track is
[`scripts/run_ternary_quartic.sh`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/scripts/run_ternary_quartic.sh). It starts
Codex (for this proof I used GPT 5.4 xhigh) with a [persistent keepalive
prompt](/blog/agents/2026/04/15/codex-continuation.html):

```text
Keep the goal fixed: prove TernaryQuartic.ternaryQuartic_rankFour_no_spurious_socp for TernaryQuarticRankFourNoSpuriousSOCP, using Julia SDP dual certificates only to generate and test proof ideas, then write the full argument in writeup/ternary_quartic/blueprint.tex before formalizing it in Lean; add only proof-serving lemmas, keep the final theorem declaration in TernaryQuarticProof.lean, do not weaken or restate the target, do not touch TernaryQuartic.lean, treat the verification harnesses as stable unless explicitly asked, do not build or depend on low_rank_univariate_sos/, log all experiments and strategy changes in writeup/ternary_quartic/exploration_log.tex, record numerical claims in julia/ternary_quartic_explorations/ and reference them in the .tex files, verify regularly with ./scripts/verify_ternary_quartic.sh, commit each coherent round of progress, and do not stop until the Lean proof, blueprint, verification, and final commit are all complete.'
```

The important point is continuity. A proof attempt like this does not fit into
a single short interaction. The agent has to survive context compaction,
long-running commands, changing proof strategies, and many rounds of failed
formalization. The keepalive prompt reasserts the target and the rules of the
project so that each continuation resumes the same job instead of drifting into
a nearby one.

The prompt also constrained the workflow. Without it, an agent can easily make
progress in ways that do not actually prove the target theorem: weakening the
statement, changing the verifier, accumulating unrelated abstractions, or
treating numerical evidence as if it were a proof.

### Reproducing the check

[The repository](https://github.com/yuanchenyang/nonconvex_sos_landscape)
contains the final Lean proof and the verification script. To check the
ternary-quartic result, run:

```bash
./scripts/verify_ternary_quartic.sh
```

The Julia setup and solver workflow are documented in
[`docs/julia_guide.md`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/docs/julia_guide.md). Lean
build instructions are in
[`docs/lean_guide.md`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/docs/lean_guide.md),
and the VM setup is in
[`docs/vagrant_guide.md`](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/docs/vagrant_guide.md).

### Failed runs

The successful run was not my first attempt. An earlier run got stuck on a
proof strategy that turned out to be too hard to formalize.

![Failed Apr 4 run LOC](/assets/images/loc_autoproof-tq-r4-apr4.png)

Another failed run spent too much time running Julia experiments and did not
turn the computational output into a viable proof strategy.

{% include figure.html
file="/assets/images/loc_autoproof-tq-r4-apr6.png"
max-width=650
%}

Those failures suggested that the agent needed a tighter loop. Exploration was
allowed, but its progress has to be summarized in a written blueprint. Lean
formalization was allowed, but only after the proof idea was clear enough to
survive translation. It also seemed important to have the agent keep a log of
which subgoals were proved, abandoned, or still blocking the argument.

The successful run used that more disciplined loop, and the figure below shows
the progress it made over 3 days, in terms of commits over time.

![Successful Apr 9 commit history](/assets/images/commits_autoproof-tq-r4-apr9.png)

### Outline of the proof

I used a LLM to summarize the Lean proof into a [10-page
PDF](https://github.com/yuanchenyang/nonconvex_sos_landscape/blob/main/writeup/ternary_quartic/blueprint.pdf). Below is a brief overview of the proof structure.

For a rank-4 factor $$\mathbf{u}=[u_1,\ldots,u_4]$$, define the linear map
$$A_{\mathbf{u}}(\mathbf{v}):=\sum_{i=1}^4 u_i v_i$$ and the residual
$$r(\mathbf{u},p):=\sum_{i=1}^4 u_i^2-p$$. First-order criticality states that

$$ \langle A_{\mathbf{u}}(\mathbf{v}),r(\mathbf{u},p) \rangle =0 \quad \forall
\mathbf{v}, $$

i.e. the residual is orthogonal to the image of $$A_{\mathbf{u}}$$. Second-order
criticality states that

$$
\left\langle A_{\mathbf{v}}(\mathbf{v}),r(\mathbf{u},p)\right\rangle +2\Vert
A_{\mathbf{u}}(\mathbf{v})\Vert^2\ge 0 \quad \forall \mathbf{v}.
$$

Thus, for every kernel direction $$\mathbf{w}\in\ker A_{\mathbf{u}}$$,
$$\left\langle A_{\mathbf{w}}(\mathbf{w}),r(\mathbf{u},p)\right\rangle\ge 0.$$
If every sum-of-squares summand $$q^2$$ of $$p$$ can be written, modulo the
image of $$A_{\mathbf{u}}$$, as a sum of squares of kernel directions, the
first- and second-order conditions forces $$r(\mathbf{u},p)=0$$. This is a
general strategy, also shared with the proof of the binary form/univariate
polynomial case.

The hard part for ternary quartics is proving that this decomposition exists for
every possible choice of $$\mathbf{u}$$. For simplicity we work with
dehomogenized polynomials intead of forms.  Define
$$\rho_{\mathbf{u}}(c):=\sum_{i=1}^4 c_i u_i$$ for $$c\in\mathbb{R}^4$$, and let

$$E(\mathbf{u}):=\{c:\rho_{\mathbf{u}}(c)\text{ has degree at most }1\}.$$

Elements of $$E(\mathbf{u})$$ are the linear combinations of the four quadratic
factors whose quadratic terms cancel. If $$0\ne c\in\ker\rho_{\mathbf{u}}$$,
then for any quadratic $$q$$ the direction $$\mathbf{w}=(c_1q,\ldots,c_4q)$$
satisfies

$$A_{\mathbf{u}}(\mathbf{w})=q\rho_{\mathbf{u}}(c)=0,\qquad
A_{\mathbf{w}}(\mathbf{w})=\left(\sum_{i=1}^4 c_i^2\right)q^2,$$

so every square $$q^2$$ is already a kernel square, after rescaling. Otherwise
$$\rho_{\mathbf{u}}$$ is injective, and rank-nullity applied to the map taking
$$\rho_{\mathbf{u}}(c)$$ to its homogeneous quadratic part gives
$$1\le \dim E(\mathbf{u})\le 3.$$ The proof then splits according to whether
this dimension is $$1$$, $$2$$, or $$3$$.

In each case, the proof uses changes of variables and rotations among the four
factors to simplify the relations in $$E(\mathbf{u})$$. The target is to prove
that every quadratic square admits a decomposition

$$
q^2=A_{\mathbf{u}}(\mathbf{v})+\sum_j A_{\mathbf{w}^{(j)}}(\mathbf{w}^{(j)}),
\qquad \mathbf{w}^{(j)} \in \ker(A_{\mathbf{u}}).
$$

Sometimes this is immediate because every quartic monomial lies in
$$\operatorname{im} A_{\mathbf{u}}$$. In the remaining cases, the quotient by
$$\operatorname{im} A_{\mathbf{u}}$$ has only one or two missing classes, such
as the constant coefficient or one linear coefficient. The proof writes down
explicit kernel directions $$\mathbf{w}^{(j)}$$ whose squares match those
missing coefficients. Summing over an SOS representation $$p=\sum_k q_k^2$$
gives the certificate above. Therefore every second-order critical point has
zero residual and is globally optimal.

### Discussion


### Conclusion

In this post I described an agentic harness that I used to autonomously produce
a novel mathematical result, where the input is a theorem statement in Lean and
output is a fully formalized proof. Although the final proof is intricate and
complex, incremental progress can be made at every stage by solving optimization
problems and examining their dual certificates, with rapid feedback from Julia
numerical programs and Lean formal verification.

This ternary quartic theorem proved here could be a step toward a more general
workflow: use optimization software to generate proof certificates from
examples, use LLMs to generalize these into mathematical arguments, and use Lean
to check that the proofs are correct and the final theorem is exactly what was
claimed.
