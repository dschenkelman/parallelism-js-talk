// http://jsperf.com/simd-sum-asm-js

function sum(items){
  var res = 0;
  for (var i = 0; i < items.length; i++){
    res += items[i];
  }

  return res;
}

// SIMD
var asmModule = function(global){
  "use asm";
  var float32x4 = global.SIMD.float32x4;
  var f32x4Load = float32x4.load;
  function sum(items){
    var rem = (items.length | 0) % 4;
    var max = items.length - rem;
    var res = float32x4.splat(0);
    for (var i = 0; (i | 0) < (max | 0); i = (i | 0) + 4){
      res = float32x4.add(res, f32x4Load(items, i));
    }

    var finalLoad = [
      float32x4.loadX,
      float32x4.loadXY,
      float32x4.loadXYZ ];

    if (rem){
      res = float32x4.add(res, finalLoad[rem - 1](items, i));
    }

    return res.x + res.y + res.z + res.w;
  }

  return {
    sum: sum
  };
};

asmSIMD = asmModule(window);

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
  if (asmSIMD.sum(items) > 10000) { console.error('fail SIMD sum'); }
};