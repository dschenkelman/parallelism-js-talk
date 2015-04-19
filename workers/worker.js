self.addEventListener('message', function(e) {
  if (!e.data){
    return;
  }

  if (e.data.buffer){
    self.postMessage(e.data, [ e.data.buffer ]);
  } else {
    self.postMessage(e.data);
  }
});