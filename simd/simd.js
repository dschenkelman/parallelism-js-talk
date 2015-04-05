// http://jsperf.com/simd-sum

function sum(items){
  var res = 0;
  for (var i = 0; i < items.length; i++){
    res += items[i];
  }

  return res;
}

// SIMD
var float32x4 = SIMD.float32x4;

float32x4.utils = SIMD.utils || {};

if (!float32x4.utils.sum){
  f32x4Load = float32x4.load;
  float32x4.utils.sum = function(items){
    var rem = items.length % 4;
    var max = items.length - rem;
    var res = float32x4.splat(0);
    for (var i = 0; i < max; i += 4){
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
  };
}

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
  if (sum(items) >= 10000) { console.error('fail sum'); }
};

var doSIMDSum = function(items){
  if (float32x4.utils.sum(items) > 10000) { console.error('fail SIMD sum'); }
};

if (!float32x4.utils.avg){
  float32x4.utils.avg = function(items){
    return sum(items) / items.length;
  };
}
