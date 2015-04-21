Speech: https://01.org/blogs/tlcounts/2014/bringing-simd-javascript

Difference between parallelism and concurrency

History: comes from Dart SIMD spec

Data level parallelism: Same tasks on different data
Task parallelism: Different threads processes/different or same data

SIMD: http://en.wikipedia.org/wiki/SIMD

Proposal, Polyfill: https://github.com/johnmccutchan/ecmascript_simd/blob/master/src/ecmascript_simd.js

SIMD instructions can greatly increase performance when exactly the same operations are to be performed on multiple data objects. Typical applications are digital signal processing and graphics processing. (http://en.wikipedia.org/wiki/Streaming_SIMD_Extensions)

In this proposal data types are restricted to single precision floating point and 32-bit unsigned integer values.

float32x4 and int32x4. Both data types are immutable.
Also typed arrays.

Interesting notes on SIMD internals: https://blog.mozilla.org/javascript/2015/03/10/state-of-simd-js-performance-in-firefox/

https://hacks.mozilla.org/2014/10/introducing-simd-js/

https://blog.mozilla.org/luke/2013/03/21/asm-js-in-firefox-nightly/

Demo SIMD: http://peterjensen.github.io/idf2014-simd/

Chart comparing polyfill with asm.js

Example idea: adjust contrast on digital image

Interview: https://software.intel.com/en-us/articles/simdjs-project-behind-scenes-moh-haghighat

Video: http://intelstudios.edgesuite.net/idf/2014/sf/ti/SPCS003/index.html

use cases: games, image processing asm.js through emscripten

SIMD presentations: https://docs.google.com/presentation/d/1yc2NDzFJ-0yD980URiTcV3oE_2cQDVzXuH4Rss1fG8s/edit#slide=id.gad5f0b18_1433
http://peterjensen.github.io/html5-simd/html5-simd.html#/36

Paper: https://e9fe7ff0-a-62cb3a1a-s-sites.googlegroups.com/site/wpmvp2014/paper_18.pdf?attachauth=ANoY7crq7SSfFdpDhFXU4q0v0EA-QDUGUx8SKqmUd2TU22RQYfQ_11Ittzim8pTmhHQUFEI-TrJxZQ9WUCIIsp-aH43CsCVGwTIwk0jyZa4tEUs_BZI_zVJSPQ8K0vrPkaeB76s_4Dzgijke5NOrg1QOJ6My-ZwHr14BrJbY0nvJKR6Crf1EVxWdXRC-KY4WiUwd05ItJ_hLxOYGrrSacKJEOJ7kj4fyEg%3D%3D&attredirects=0

Example: http://lemire.me/blog/archives/2015/03/25/accelerating-intersections-with-simd-instructions/?utm_source=feedburner&utm_medium=twitter&utm_campaign=Feed%3A+daniel-lemire%2Fatom+%28Daniel+Lemire%27s+blog%29

No arrays proposal: https://github.com/johnmccutchan/ecmascript_simd/issues/113

Why load/store are slow: https://github.com/johnmccutchan/ecmascript_simd/issues/113#issuecomment-87008147