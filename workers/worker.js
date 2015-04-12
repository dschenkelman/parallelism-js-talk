self.addEventListener('message', function(e) {
  if (!e.data){
    return;
  }

  self.postMessage(e.data);
});