---
title: Global Landscape of Low-Rank Sum of Squares
research-category: Global Landscape of Non-Convex Problems
---

<div class="image-right-p">
<img src="/assets/images/lrsos_geometric.png" width="400">
</div>

Semidefinite programming is powerful but slow, can we speed it up by using first
order methods? By factorizing the PSD variable $$X = UU^\top$$, we can optimize
over $$U$$ using first-order methods. However this formulation is nonconvex and
these methods may get stuck in local minima. We show that this does not happen
in the setting of univariate sum of squares decomposition: all local minima are
global. In addition, using an interpolation representation we can compute
gradients in near-linear time (using
[TrigPolys.jl](/software.html/#/software/03-TrigPolys.jl)), finding the sum of
squares decomposition of a million-degree polynomial in less than 30 minutes.

Benoît Legat\*, **Chenyang Yuan\*** and Pablo Parrilo. "Low-Rank Univariate Sum of
Squares Has No Spurious Local Minima" _SIAM Journal on Optimization Vol. 33, Iss. 3, 2023_.
[\[link\]](https://epubs.siam.org/doi/full/10.1137/22M1516208)
[\[arxiv\]](https://arxiv.org/abs/2205.11466)
[\[pdf\]](/assets/pdfs/siopt_lowrank.pdf)

<div><b>Talks:</b></div>
 - ICCOPT 2022 Invited Talk [\[slides\]](/assets/pdfs/iccopt_talk.pdf)
 - INFORMS 2021 Invited Talk [\[slides\]](/assets/pdfs/INFORMS_Presentation.pdf)
 - MIT LIDS & Stats Tea Talk 2021 [\[notes\]](/assets/pdfs/sos_sampling_talk.pdf)
