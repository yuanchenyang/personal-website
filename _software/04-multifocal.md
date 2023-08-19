---
name: Multifocal Microscope Image Stitching
image-src: assets/images/stitching.jpg
image-width: 400
link: https://github.com/yuanchenyang/multifocal-stitching
---
Given a pair of images taken with an unknown camera translation and focal shift,
computes the unknown translation using [phase
correlation](https://en.wikipedia.org/wiki/Phase_correlation). This library is
designed to be very robust to focus shifts in the overlapping area, by applying
a series of frequency-domain filters which enables matching on both low- and
high-frequency features.

[\[github\]](https://github.com/yuanchenyang/multifocal-stitching)
[\[demo\]](https://huggingface.co/spaces/yuanchenyang/multifocal-stitching)
[\[pypi\]](https://pypi.org/project/multifocal-stitching/)
