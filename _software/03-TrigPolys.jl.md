---
name: TrigPolys.jl
image-src: assets/images/trigpolys.png
image-width: 350
link: https://github.com/JuliaAlgebra/TrigPolys.jl
---

A trignometric polynomial is defined by

\\[p(x) = a_0 + \sum_{k=1}^n a_k \cos(kx) + a_{-k} \sin(kx)\\]

The polynomial $$p(x)$$ can be represented either by $$2n+1$$ coefficients
$$a_k$$ or by evaluations at $$2n+1$$ distinct points in the interval
$$[0,2\pi)$$. This package provides the functions `evaluate` and `interpolate`
to convert efficiently between these two representations. These operations are
implemented via the Fast Fourier Transform (FFT) provided by the
[FFTW.jl](https://github.com/JuliaMath/FFTW.jl) library.
