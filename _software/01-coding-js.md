---
name: coding.js
image-src: assets/images/interpreter.png
image-width: 350
link: /coding-js/demo.html
---

This is an set of Javascript-based interpreters which use web-workers. It
differs from other Javascript interpreters as the main interpreting work is done
in a seperate worker thread, and thus would not slow down the main UI thread
when performing a lengthy computation. There is a front-end providing the input
and output prompts, which links to many separate interpreter backends. Currently
the main backend is a Scheme interpreter, which implements a significant subset
of Scheme. There is also a logic interpreter based on a subset of Prolog taught
in [CS61A](https://cs61a.org/) at Berkeley, and a Javascript interpreter which
just calls `eval`.  [\[github\]](https://github.com/yuanchenyang/coding-js)
[\[demo\]](/coding-js/demo.html)
