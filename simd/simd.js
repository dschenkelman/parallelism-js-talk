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

    res = Math.fround(Math.fround(res.x + res.y) +
      Math.fround(res.z + res.w));
    while (rem) {
      res = Math.fround(res + items[rem--]);
    }
    return res;
  };
}

// Scalar
function sum(items){
  var max = items.length;
  var res = Math.fround(0);
  for (var i = 0; i < max; i++){
    res = Math.fround(Math.fround(res) + items[i]);
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

var SIZE = 100000;

var items = generateArray(SIZE);

var doSum = function(items){
  if (sum(items) >= SIZE) { console.error('fail sum'); }
};

var doSIMDSum = function(items){
  if (float32x4.utils.sum(items) > SIZE) { console.error('fail SIMD sum'); }
};

if (!float32x4.utils.avg){
  float32x4.utils.avg = function(items){
    return sum(items) / items.length;
  };
}
