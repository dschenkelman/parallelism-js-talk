importScripts('jsziptools.js');

self.addEventListener('message', function(e) {
  if (!e.data){
    return;
  }

  var buffer = e.data.buffer;

  var gzipped = jz.gz.compress(buffer);

  postMessage(
    { buffer: gzipped.buffer, name: e.data.name },
    [ gzipped.buffer ]);
});