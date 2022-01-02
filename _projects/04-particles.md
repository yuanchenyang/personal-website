---
name: 3D Particle Simulation
image-src: assets/images/particles.png
image-width: 300
link: https://www.chenyang.co/particles
---

A simulation with thousands of particles attracted by gravity towards many
sources. Particles are shaded based on their speed, with red the fastest and
white the slowest. The gravity is simulated numerically with the
[Runge-Kutta](https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods)
method ran in the CPU, whereas the rendering and the shading is done in the GPU
using [WebGL](https://get.webgl.org/) and the
[three.js](https://threejs.org/) library.
