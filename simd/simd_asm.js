// http://jsperf.com/simd-sum-asm-js
var sum = function (glob, ffi, heap) {
  "use asm";
  var fround = glob.Math.fround;
  var f32 = new glob.Float32Array(heap);
  var res = 0;
  function f(n) {
    n = n|0;
    var i = 0;
    var res = fround(0.0);
    for (; (i|0) < (n|0); i = i + 4 |0)
      res = fround(res + fround(f32[i>>2]));
    return fround(res);
  }
  return f;
};

// SIMD
var asmModule = function(stdlib, imp, buffer){
  "use asm";
  var f4 = stdlib.SIMD.float32x4;
  var f4load = f4.load;
  var f4add = f4.add;
  var fround = stdlib.Math.fround;

  var u8values = new stdlib.Uint8Array(buffer);
  var f32values = new stdlib.Float32Array(buffer);

  function sum(length){
    length = length | 0;
    var max = 0;
    var res = f4(0,0,0,0);
    var i = 0;
    var mk4 = 0x000ffff0;
    var diff = 0;
    var result = fround(0.0);

    max = length << 2;

    for (i = 0; (i | 0) < (max | 0); i = (i + 16) | 0) {
      res = f4add(res, f4load(u8values, i & mk4));
    }

    diff = ((i | 0) - (max | 0) | 0);

    result = fround(fround(res.x + res.y) + fround(res.z + res.w));

    while ((diff | 0) != (0 | 0)){
      result = fround(result + f32values[((i | 0) + (diff | 0)) >> 2]);
      diff = ((diff | 0) - (4 | 0) | 0);
    }

    return result;
  }

  return {
    sum: sum
  };
};

var generateArray = function(h, count){
  var xs = new Float32Array(h);
  for (var i = count - 1; i >= 0; i--) {
    xs[i] = Math.random();
  }

  return xs;
};

var heap = new ArrayBuffer(0x80000);

var ITEMS_COUNT = 100000;

var items = generateArray(heap, ITEMS_COUNT);

asmSIMD = asmModule(window, null, heap);
sum = sum(window, null, heap);

var doSum = function(items){
  if (sum(items.length) > ITEMS_COUNT) { console.error('fail sum'); }
};

var doSIMDSum = function(items){
  if (asmSIMD.sum(items.length) > ITEMS_COUNT) { console.error('fail SIMD sum'); }
};