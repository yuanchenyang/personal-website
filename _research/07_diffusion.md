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
Models Using the Euclidean Distance Function" _Preprint_.
[\[arxiv\]](https://arxiv.org/abs/2306.04848)

Nikos Arechiga\*, Frank Permenter\*, Binyang Song\* and **Chenyang Yuan\***,
"Drag-guided diffusion models for vehicle image generation", _Preprint_.
[\[arxiv\]](https://arxiv.org/abs/2306.09935)

Binyang Song, **Chenyang Yuan**, Frank Permenter, Nikos Arechiga and Faez Ahmed,
"Surrogate Modeling of Car Drag Coefficient with Depth and Normal Renderings",
_IDETC 2023_.
[\[arxiv\]](https://arxiv.org/abs/2306.06110)

<div><b>Talks:</b></div>
 - An optimization perspective on diffusion [\[slides\]](/assets/pdfs/diffusion_presentation_10_04.pdf)
