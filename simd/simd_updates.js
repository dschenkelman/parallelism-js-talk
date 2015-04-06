var asmModule = function(stdlib, imp, buffer){
  "use asm";
  var f4 = stdlib.SIMD.float32x4;
  var f4load = f4.load;
  var f4add = f4.add;
  var fround = stdlib.Math.fround;
  var loadX = f4.loadX;
  var loadXY = f4.loadXY;
  var loadXYZ = f4.loadXYZ;

  var u8values = new stdlib.Uint8Array(buffer);

  function sum(length){
    length = length | 0;
    var max = 0;
    var res = f4(0,0,0,0);
    var i = 0;
    var mk4 = 0x000ffff0;
    var diff = 0;

    max = length << 2;

    for (i = 0; (i | 0) < (max | 0); i = (i + 16) | 0) {
      res = f4add(res, f4load(u8values, i & mk4));
    }

    diff = i | 0 - (max | 0);

    if ((diff | 0) == (12 | 0)) {
      res = f4add(res, loadX(u8values, i & mk4));
    } else if ((diff | 0) == (8 | 0)) {
      res = f4add(res, loadXY(u8values, i & mk4));
    } else if ((diff | 0) == (4 | 0)){
      res = f4add(res, loadXYZ(u8values, i & mk4));
    }

    return fround(fround(res.x + res.y) + fround(res.z + res.w));
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

var heap = new ArrayBuffer(0x10000);

var items = generateArray(heap, 10000);

asmSIMD = asmModule(window, null, heap);