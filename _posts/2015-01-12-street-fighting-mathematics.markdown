---
layout: post
title:  "Street-Fighting Mathematics"
date:   2015-01-12 00:00:00
categories: math
---

During the winter break, I was reading this book called
[Street-Fighting Mathematics][street-fighting-math], which is a cool book
teaching tricks and approximations for various calculations. I strongly suggest
reading through it if you want to strengthen your mathematical arsenal. In one
of the chapters, the reader is invited to give an approximate answer to this
integral within 5 minutes, correct to $$5\%$$:

$$\int_0^\pi (\cos \theta)^{100} d\theta$$

But I took a complex analysis class last fall, and I can get the exact answer to
this in 5 minutes too! In this post I'll show you how to do this exactly and
approximately, and I think both methods are pretty cool.

First the exact answer. We are going to convert this into a
[contour integral][contour-integral] by making the substitution $$z = e^{i\theta}$$:

$$
\begin{align}
\int_0^\pi (\cos \theta)^{100} d\theta
&= \frac{1}{2} \int_0^{2\pi} (\cos \theta)^{100} d\theta \\
&=\frac{1}{2} \oint \frac{1}{2^{100} i z} (z + \bar{z})^{100} dz
\end{align}
$$

Where the new integral is computed over the unit circle. On the unit circle
$$\bar{z} = \frac{1}{z}$$, and we can apply the
[residue theorem][residue-theorem] to get:

$$\oint \frac{1}{2^{101} i z} (z + \bar{z})^{100} dz = 2\pi i \cdot \text{Res}
\frac{1}{2^{101} i z} \left(z + \frac{1}{z}\right)^{100}$$

Since the residue is the coefficient of the $$\frac{1}{z}$$ term in the
expansion, we can find it in terms of the binomial coefficient:

$$\int_0^\pi (\cos \theta)^{100} d\theta = \frac{\pi}{2^{100}}
\binom{100}{50}\\$$

This is a pretty powerful trick to solve trigonometric integrals, but in the end
it's still hard to estimate the order of magnitude of the exact answer without a
calculator. Here is where the approximate method shines. We first approximate
$$\cos \theta$$ with a Taylor series, then use the fact that $$(1 + \epsilon)^n
\approx e^{\epsilon n}$$:

$$
\begin{align}
\int_0^\pi (\cos \theta)^{100} d\theta
&\approx \int_0^\pi \left(1 + \frac{\theta^2}{2}\right)^{100} d\theta \\
&\approx \int_0^\pi e^{50 \theta^2} d\theta \\
&\approx \frac{1}{\sqrt{50}} \int_0^\infty e^{\theta^2} d\theta \\
&= \sqrt{\frac{\pi}{50}} \\
&\approx \sqrt{\frac{\pi}{16\pi}} \\
&= 0.25
\end{align}
$$

The exact answer is $$0.250036963481$$, about $$0.015\%$$ off. I like both methods.


[street-fighting-math]: http://mitpress.mit.edu/books/street-fighting-mathematics
[contour-integral]: http://mathworld.wolfram.com/ContourIntegration.html
[residue-theorem]: http://en.wikipedia.org/wiki/Residue_theorem
