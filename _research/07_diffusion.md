---
title: Theoretical Foundations of Diffusion Models
---

<div class="image-right-p">
<img src="/assets/images/gesampler.png" width="300">
</div>

Denoising diffusion models achieve state of the art quality on image generation
tasks. In this line of work we introduce a deterministic framework for reasoning
about, improving and potentially discovering new applications of diffusion
models. We interpret diffusion models as projection onto the support of the
training set, with sampling as approximate gradient descent on the distance
function to this set. Applying this interpretation, we derive a simple yet
efficient diffusion sampler, as well as a framework for incorporating
constraints (such as minimizing the drag coefficient of vehicle images) into the
generation process.

Frank Permenter\* and **Chenyang Yuan\***. "Interpreting and Improving Diffusion
Models from an Optimization Perspective" [_ICML 2024_](https://icml.cc/virtual/2024/poster/33099).
[\[arxiv\]](https://arxiv.org/abs/2306.04848)

Nikos Arechiga\*, Frank Permenter\*, Binyang Song\* and **Chenyang Yuan\***,
"Drag-guided diffusion models for vehicle image generation", NeurIPS 2023 Workshop on Diffusion Models.
[\[arxiv\]](https://arxiv.org/abs/2306.09935) [\[poster\]](/assets/pdfs/drag_diffusion_poster.pdf)

Binyang Song, **Chenyang Yuan**, Frank Permenter, Nikos Arechiga and Faez Ahmed,
"Surrogate Modeling of Car Drag Coefficient with Depth and Normal Renderings",
_IDETC 2023_.
[\[arxiv\]](https://arxiv.org/abs/2306.06110)

<div><b>Talks:</b></div>
 - Interpreting and improving diffusion models from an optimization perspective [\[slides\]](/assets/pdfs/diffusion_presentation_06_14.pdf)
