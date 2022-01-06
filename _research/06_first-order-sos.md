---
title: Global Landscape of Low-Rank Sum of Squares
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

<div><b>Talks:</b></div>
 - INFORMS 2021 Conference [\[slides\]](/assets/pdfs/INFORMS_Presentation.pdf)
