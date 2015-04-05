// /Users/dschenkelman/Downloads/Chromium.app/Contents/MacOS/Chromium --js-flags="--simd-object"
// http://jsperf.com/simd-sum-typed-arrays

function sum(items){
  var res = 0;
  for (var i = 0; i < items.length; i++){
    res += items[i];
  }

  return res;
}

// SIMD
var SIMD_utilsModule = function(){
  var float32x4 = SIMD.float32x4;
  function sum(items){
    var wrapped = new Float32x4Array(items.buffer);
    var res = float32x4.splat(0);
    for (var i = 0; i < wrapped.length; i++){
      res = float32x4.add(res, wrapped[i]);
    }

    return res.x + res.y + res.z + res.w;
  }

  return {
    sum: sum
  };
};

SIMD_utilsModule = SIMD_utilsModule(window);

function sum(items){
  var res = 0;
  for (var i = 0; i < items.length; i++){
    res += items[i];
  }

  return res;
}

var generateArray = function(count){
  var xs = new Float32Array(count);
  for (var i = xs.length - 1; i >= 0; i--) {
    xs[i] = Math.random();
  }

  return xs;
};

var items = generateArray(10000);

var doSum = function(items){
  if (sum(items) > 10000) { console.error('fail sum'); }
};

var doSIMDSum = function(items){
  if (SIMD_utilsModule.sum(items) > 10000) { console.error('fail SIMD sum'); }
};