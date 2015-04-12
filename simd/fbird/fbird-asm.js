/* -*- Mode: javascript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 ; js-indent-level : 2 ; js-curly-indent-offset: 0 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

// Author: Peter Jensen

// Keep JSLint/JSHint happy
/*globals console: true */
/*globals Float32Array: true */
/*globals Float32x4Array: true */
/*globals SIMD: true */
/*globals $: true */
/*globals Uint8ClampedArray: true */
/*globals requestAnimationFrame: true */
/*globals window: true */
/*globals navigator: true */
/*globals performance: true */
/*globals setTimeout: true */

// Polyfill and alerts
if (typeof Math.fround == 'undefined') {
  Math.fround = function(x) { return x };
}
if (typeof SIMD == 'undefined') {
  // TODO maybe use the polyfill?
  alert('SIMD not implemented in this browser');
  throw 'SIMD not implemented in this browser';
} else {
  // Polyfill float32x4.select
  try {
    var x = SIMD.float32x4(1,2,3,4);
    var T = 0xFFFFFFFF, F = 0x0;
    var y = SIMD.float32x4.select(SIMD.int32x4(T, T, F, F), x, x);
    console.log('float32x4.select is implemented');
  } catch (e) {
    console.log('float32x4.select isnt implemented');
    SIMD.float32x4.select = SIMD.int32x4.select;
  }
}

var fbird = (function() {

  // configuration
  var config = {
    surfaceWidth:  1000,
    surfaceHeight: 400,
    birdWidth:     10,
    birdHeight:    10,
    maxBirds:      100000
  };

  var globals = {
    surfaceWidth:  config.surfaceWidth,
    surfaceHeight: config.surfaceHeight,
    params:        null,
    initialized:   false
  };

  var logger = function () {

    var traceEnabled = true;

    function trace(msg) {
      if (traceEnabled) {
        console.log(msg);
      }
    }

    function error(msg) {
      console.log(msg);
    }

    function traceDisable() {
      traceEnabled = false;
    }

    function traceEnable() {
      traceEnabled = true;
    }

    return {
      trace: trace,
      error: error,
      traceEnable: traceEnable,
      traceDisable: traceDisable
    };
  }();

  // Keep track of bird positions and velocities

  var birds = function () {

    var maxPos      = 1000.0;
    var actualBirds = 0;

    var buffer = new ArrayBuffer(0x200000);
    var bufferF32 = new Float32Array(buffer);

    var accelData = {
      steps:     20000,
      interval:  0.002,  // time in millis seconds for each accel value
      valueConst: 1000.0
    };

    var accelDataValuesLength = 0;

    function init(maxPosition) {
      actualBirds = 0;
      maxPos      = maxPosition;
      if (globals.params.accelSteps !== "null") {
        accelData.steps = globals.params.accelSteps;
      }
      // Make it a power of two, for quick modulo wrapping.
      var accelDataValues = [10.0, 9.5, 9.0, 8.0, 7.0, 6.0, 5.5, 5.0, 5.0, 5.0, 5.5, 6.0, 7.0, 8.0, 9.0, 10.0].map(function(v) { return 50*v; });
      accelDataValuesLength = accelDataValues.length;
      for (i = 0; i < accelDataValuesLength; i++)
        bufferF32[i + config.maxBirds * 2] = accelDataValues[i];
    }

    function addBird(pos, vel) {
      if (actualBirds >= config.maxBirds) {
        logger.error("maxBirds exceeded");
        return -1;
      }
      bufferF32[actualBirds] = pos;
      bufferF32[actualBirds + config.maxBirds] = vel;
      actualBirds++;
      return actualBirds - 1;
    }

    function removeLastBird() {
      if (actualBirds > 0) {
        actualBirds--;
      }
    }

    function updateAllConstantAccel(timeDelta) {
      var timeDeltaSec = timeDelta/1000.0;
      var timeDeltaSecSquared = timeDeltaSec*timeDeltaSec;
      for (var i = 0; i < actualBirds; ++i) {
        var pos = bufferF32[i];
        var vel = bufferF32[i + config.maxBirds];
        var newPos = 0.5*accelData.valueConst*timeDeltaSecSquared + vel*timeDeltaSec + pos;
        var newVel = accelData.valueConst*timeDeltaSec + vel;
        if (newPos > maxPos && newVel > 0) {
          newVel = -newVel;
        }
        bufferF32[i] = newPos;
        bufferF32[i + config.maxBirds] = newVel;
      }
    }

    function updateAll(timeDelta) {
      //      var steps               = Math.ceil(timeDelta/accelData.interval);
      const maxBirds = config.maxBirds;
      var steps               = accelData.steps;
      var accelCount          = accelDataValuesLength;
      var subTimeDelta        = timeDelta/steps/1000.0;
      var subTimeDeltaSquared = subTimeDelta*subTimeDelta;
      for (var i = 0; i < actualBirds; ++i) {
        var accelIndex          = 0;
        var newPos = bufferF32[i];
        var newVel = bufferF32[i + maxBirds];
        for (var a = 0; a < steps; ++a) {
          var accel = bufferF32[accelIndex + config.maxBirds * 2];
          accelIndex = (accelIndex + 1) % accelCount;
          var posDelta = 0.5*accel*subTimeDeltaSquared + newVel*subTimeDelta;
          newPos = newPos + posDelta;
          newVel = accel*subTimeDelta + newVel;
          if (newPos > maxPos) {
            newVel = -newVel;
            newPos = maxPos;
          }
        }
        bufferF32[i] = newPos;
        bufferF32[i + maxBirds] = newVel;
      }
    }

    function getAccelDataSteps() {
      return accelData.steps;
    }

    function getAccelDataValuesLength() {
      return accelDataValuesLength;
    }

    function getActualBirds() {
      return actualBirds;
    }

    function getMaxPos() {
      return maxPos;
    }

    function fbirdModule(global, imp, buffer) {
      "use asm";
      var toF = global.Math.fround;
      var f32 = new global.Float32Array(buffer);
      const maxBirds = 100000;
      const maxBirdsx4 = 400000;
      const maxBirdsx8 = 800000;
      const accelMask = 0x3c;
      const mk2 = 0x000ffffc;

      var getAccelDataSteps = imp.getAccelDataSteps;
      var getAccelDataValuesLength = imp.getAccelDataValuesLength;
      var getActualBirds = imp.getActualBirds;
      var getMaxPos = imp.getMaxPos;

      function declareHeapSize() {
        f32[0x0007ffff] = toF(0.0);
      }

      function updateAll(timeDelta) {
        timeDelta = toF(timeDelta);
        //      var steps               = Math.ceil(timeDelta/accelData.interval);
        var steps = 0;
        var subTimeDelta = toF(0.0);
        var subTimeDeltaSquared = toF(0.0);
        var i = 0;
        var accelIndex = 0;
        var newPos = toF(0.0);
        var newVel = toF(0.0);
        var a = 0;
        var accel = toF(0.0);
        var posDelta = toF(0.0);
        var actualBirdsx4 = 0;
        var maxPos = toF(0.0);

        steps = getAccelDataSteps() | 0;
        subTimeDelta = toF(toF(timeDelta / toF(steps | 0)) / toF(1000.0));
        subTimeDeltaSquared = toF(subTimeDelta * subTimeDelta);

        actualBirdsx4 = ((getActualBirds() | 0) * 4) | 0;
        maxPos = toF(+getMaxPos());

        for (i = 0; (i | 0) < (actualBirdsx4 | 0); i = (i + 4) | 0) {
          accelIndex = 0;
          newPos = toF(f32[(i & mk2) >> 2]);
          newVel = toF(f32[(i & mk2) + maxBirdsx4 >> 2]);
          for (a = 0; (a | 0) < (steps | 0); a = (a + 1) | 0) {
            accel = toF(f32[(accelIndex & accelMask) + maxBirdsx8 >> 2]);
            accelIndex = (accelIndex + 4) | 0;
            posDelta = toF(toF(toF(0.5) * toF(accel * subTimeDeltaSquared)) + toF(newVel * subTimeDelta));
            newPos = toF(newPos + posDelta);
            newVel = toF(toF(accel * subTimeDelta) + newVel);
            if (newPos > maxPos) {
              newVel = toF(-newVel);
              newPos = maxPos;
            }
          }
          f32[(i & mk2) >> 2] = newPos;
          f32[(i & mk2) + maxBirdsx4 >> 2] = newVel;
        }
      }

      return updateAll;
    }

    var updateAllAsmJS = fbirdModule(this, {getAccelDataSteps: getAccelDataSteps, getAccelDataValuesLength: getAccelDataValuesLength, getActualBirds: getActualBirds, getMaxPos: getMaxPos}, buffer);

    function updateAllSimd(timeDelta) {
      //      var steps        = Math.ceil(timeDelta/accelData.interval);
      const maxBirds = config.maxBirds;
      var steps        = accelData.steps;
      var accelCount   = accelDataValuesLength;
      var subTimeDelta = timeDelta/steps/1000.0;

      var maxPosx4              = SIMD.float32x4.splat(maxPos);
      var subTimeDeltax4        = SIMD.float32x4.splat(subTimeDelta);
      var subTimeDeltaSquaredx4 = SIMD.float32x4.mul(subTimeDeltax4, subTimeDeltax4);
      var point5x4              = SIMD.float32x4.splat(0.5);

      for (var i = 0, len = (actualBirds+3)>>2; i < len; ++i) {
        var accelIndex = 0;
        var newVelTruex4;
        var newPosx4 = SIMD.float32x4(bufferF32[i * 4],
            bufferF32[i * 4 + 1],
            bufferF32[i * 4 + 2],
            bufferF32[i * 4 + 3]);
        var newVelx4 = SIMD.float32x4(bufferF32[i * 4 + maxBirds],
            bufferF32[i * 4 + maxBirds + 1],
            bufferF32[i * 4 + maxBirds + 2],
            bufferF32[i * 4 + maxBirds + 3]);
        for (var a = 0; a < steps; ++a) {
          var accel = bufferF32[accelIndex + config.maxBirds * 2];
          var accelx4            = SIMD.float32x4.splat(accel);
          accelIndex             = (accelIndex + 1) % accelCount;
          var posDeltax4;
          posDeltax4 = SIMD.float32x4.mul(point5x4, SIMD.float32x4.mul(accelx4, subTimeDeltaSquaredx4));
          posDeltax4 = SIMD.float32x4.add(posDeltax4, SIMD.float32x4.mul(newVelx4,subTimeDeltax4));
          newPosx4   = SIMD.float32x4.add(newPosx4, posDeltax4);
          newVelx4 = SIMD.float32x4.add(newVelx4, SIMD.float32x4.mul(accelx4, subTimeDeltax4));
          var cmpx4 = SIMD.float32x4.greaterThan(newPosx4, maxPosx4);
          newVelTruex4 = SIMD.float32x4.neg(newVelx4);
          newVelx4 = SIMD.int32x4.select(cmpx4, newVelTruex4, newVelx4);
        }
        bufferF32[i * 4] = newPosx4.x;
        bufferF32[i * 4 + 1] = newPosx4.y;
        bufferF32[i * 4 + 2] = newPosx4.z;
        bufferF32[i * 4 + 3] = newPosx4.w;
        bufferF32[i * 4 + maxBirds] = newVelx4.x;
        bufferF32[i * 4 + maxBirds + 1] = newVelx4.y;
        bufferF32[i * 4 + maxBirds + 2] = newVelx4.z;
        bufferF32[i * 4 + maxBirds + 3] = newVelx4.w;
      }
    }

    function fbirdSimdModule(global, imp, buffer) {
      "use asm";
      var toF = global.Math.fround;
      var u8 = new global.Uint8Array(buffer);
      var f32 = new global.Float32Array(buffer);
      const maxBirds = 100000;
      const maxBirdsx4 = 400000;
      const maxBirdsx8 = 800000;
      const accelMask = 0x3c;
      const mk4 = 0x000ffff0;

      var getAccelDataSteps = imp.getAccelDataSteps;
      var getAccelDataValuesLength = imp.getAccelDataValuesLength;
      var getActualBirds = imp.getActualBirds;
      var getMaxPos = imp.getMaxPos;

      var i4 = global.SIMD.int32x4;
      var f4 = global.SIMD.float32x4;
      var i4add = i4.add;
      var i4and = i4.and;
      var f4select = f4.select;
      var f4add = f4.add;
      var f4sub = f4.sub;
      var f4mul = f4.mul;
      var f4greaterThan = f4.greaterThan;
      var f4splat = f4.splat;
      var f4load = f4.load;
      var f4store = f4.store;

      const zerox4 = f4(0.0,0.0,0.0,0.0);

      function declareHeapSize() {
        f32[0x0007ffff] = toF(0.0);
      }

      function updateAllSimd(timeDelta) {
        timeDelta = toF(timeDelta);
        //      var steps               = Math.ceil(timeDelta/accelData.interval);
        var steps = 0;
        var subTimeDelta = toF(0.0);
        var actualBirds = 0;
        var maxPos = toF(0.0);
        var maxPosx4 = f4(0.0,0.0,0.0,0.0);
        var subTimeDeltax4  = f4(0.0,0.0,0.0,0.0);
        var subTimeDeltaSquaredx4 = f4(0.0,0.0,0.0,0.0);
        var point5x4 = f4(0.5, 0.5, 0.5, 0.5);
        var i = 0;
        var len = 0;
        var accelIndex = 0;
        var newPosx4 = f4(0.0,0.0,0.0,0.0);
        var newVelx4 = f4(0.0,0.0,0.0,0.0);
        var accel = toF(0.0);
        var accelx4 = f4(0.0,0.0,0.0,0.0);
        var a = 0;
        var posDeltax4 = f4(0.0,0.0,0.0,0.0);
        var cmpx4 = i4(0,0,0,0);
        var newVelTruex4 = f4(0.0,0.0,0.0,0.0);

        steps = getAccelDataSteps() | 0;
        subTimeDelta = toF(toF(timeDelta / toF(steps | 0)) / toF(1000.0));
        actualBirds = getActualBirds() | 0;
        maxPos = toF(+getMaxPos());
        maxPosx4 = f4splat(maxPos);
        subTimeDeltax4 = f4splat(subTimeDelta);
        subTimeDeltaSquaredx4 = f4mul(subTimeDeltax4, subTimeDeltax4);

        len = ((actualBirds + 3) >> 2) << 4;

        for (i = 0; (i | 0) < (len | 0); i = (i + 16) | 0) {
          accelIndex = 0;
          newPosx4 = f4load(u8, i & mk4);
          newVelx4 = f4load(u8, (i & mk4) + maxBirdsx4);
          for (a = 0; (a | 0) < (steps | 0); a = (a + 1) | 0) {
            accel = toF(f32[(accelIndex & accelMask) + maxBirdsx8 >> 2]);
            // Work around unimplemented splat. This ctor is optimized to splat anyway.
            accelx4 = f4splat(accel);
            accelIndex = (accelIndex + 4) | 0;
            posDeltax4 = f4mul(point5x4, f4mul(accelx4, subTimeDeltaSquaredx4));
            posDeltax4 = f4add(posDeltax4, f4mul(newVelx4, subTimeDeltax4));
            newPosx4 = f4add(newPosx4, posDeltax4);
            newVelx4 = f4add(newVelx4, f4mul(accelx4, subTimeDeltax4));
            cmpx4 = f4greaterThan(newPosx4, maxPosx4);

            // Slower alternative inlining 'select':
            // newVelTruex4 = f4sub(zerox4, newVelx4);
            // newVelx4 = f4select(cmpx4, newVelTruex4, newVelx4);

            // Faster alternative moving 'select' out of the hot path:
            if (cmpx4.signMask) {
              // Work around unimplemented 'neg' operation, using 0 - x.
              newVelTruex4 = f4sub(zerox4, newVelx4);
              newVelx4 = f4select(cmpx4, newVelTruex4, newVelx4);
            }
          }
          f4store(u8, i & mk4, newPosx4);
          f4store(u8, (i & mk4) + maxBirdsx4, newVelx4);
        }
      }

      return updateAllSimd;
    }

    var updateAllSimdAsmJS = fbirdSimdModule(this, {getAccelDataSteps: getAccelDataSteps, getAccelDataValuesLength: getAccelDataValuesLength, getActualBirds: getActualBirds, getMaxPos: getMaxPos}, buffer);

    function posOf(index) {
      return bufferF32[index];
    }

    function dumpOne(index) {
      logger.trace(index + ". pos:" + bufferF32(index) + ", vel:" + bufferF32(index + config.maxBirds));
    }

    return {
      init:                   init,
      addBird:                addBird,
      removeLastBird:         removeLastBird,
      updateAllConstantAccel: updateAllConstantAccel,
      updateAll:              updateAllAsmJS,
      updateAllSimd:          updateAllSimdAsmJS,
      posOf:                  posOf,
      dumpOne:                dumpOne
    };

  }();


  var surface = function() {

    var useCanvas = false;
    var ctx;
    var domNode;
    var $domNode;

    var sprites         = [];
    var spritePositions = [];

    function init(domElem) {
      $domNode = $(domElem);
      if ($domNode.prop("tagName") === "CANVAS") {
        useCanvas = true;
        ctx = domElem.getContext("2d");
        globals.surfaceWidth = $domNode.width();
        globals.surfaceHight = $domNode.height();
        //        $(domElem).attr("width", config.surfaceWidth);
        //        $(domElem).attr("height", config.surfaceHeight);
      }
      else {
        domNode = domElem;
        globals.surfaceWidth = $domNode.width();
        globals.surfaceHeight = $domNode.height();
        //        $(domNode).css("width", config.surfaceWidth);
        //        $(domNode).css("height", config.surfaceHeight);
      }
      sprites         = [];
      spritePositions = [];
    }

    function createCanvasSprite(width, height, rgbaData) {
      var sprite      = ctx.createImageData(width, height);
      var blankSprite = ctx.createImageData(width, height);
      var spriteData = sprite.data;
      var blankSpriteData = blankSprite.data;

      var len  = width*height*4;
      for (var i = 0; i < len; i+=4) {
        spriteData[i]   = rgbaData[i];
        spriteData[i+1] = rgbaData[i+1];
        spriteData[i+2] = rgbaData[i+2];
        spriteData[i+3] = rgbaData[i+3];
        blankSpriteData[i] = 255;
        blankSpriteData[i+1] = 255;
        blankSpriteData[i+2] = 255;
        blankSpriteData[i+3] = 255;
      }
      sprites.push({sprite: sprite, blankSprite: blankSprite});
      return sprites.length - 1;
    }

    function createDomSprite(width, height, rgbaData) {
      var $canvas = $("<canvas>");
      $canvas.attr("width", width);
      $canvas.attr("height", height);
      var canvasCtx = $canvas[0].getContext("2d");
      var canvasSprite = canvasCtx.createImageData(width, height);
      var canvasSpriteData = canvasSprite.data;
      for (var i = 0, n = width*height*4; i < n; i += 4) {
        canvasSpriteData[i] = rgbaData[i];
        canvasSpriteData[i+1] = rgbaData[i+1];
        canvasSpriteData[i+2] = rgbaData[i+2];
        canvasSpriteData[i+3] = rgbaData[i+3];
      }
      canvasCtx.putImageData(canvasSprite, 0, 0);
      var $img = $("<img>").attr("src", $canvas[0].toDataURL("image/png"));
      $img.css("position", "absolute");
      sprites.push({img: $img});
      return sprites.length - 1;
    }

    function createImageSprite(imageSrc, width, height, scale) {
      if (useCanvas) {
        logger.error("Cannot create canvas image sprite");
        return 0;
      }
      else {
        var $img = $("<img>").attr("src", imageSrc);
        var spriteId = sprites.length;
        $img.css({position: "absolute", margin: "0px 0px"});
        if (scale != 1.0) {
          $img.css("transform", "scale(" + scale + ")");
        }
        sprites.push({img: $img, width: width*scale, height: height*scale});
        return spriteId;
      }
    }

    function createSprite(width, height, rgbaData) {
      if (useCanvas) {
        return createCanvasSprite(width, height, rgbaData);
      }
      else {
        return createDomSprite(width, height, rgbaData);
      }
    }

    function placeCanvasSprite(spriteId, x, y) {
      spritePositions.push({spriteId: spriteId, x: x, y: y});
      ctx.putImageData(sprites[spriteId].sprite, x, y);
      return spritePositions.length - 1;
    }

    function placeDomSprite(spriteId, x, y) {
      var $img = sprites[spriteId].img;
      var $imgClone = $img.clone();
      var imgClone  = $imgClone[0];
      $domNode.append($imgClone);
      imgClone.style.left = x + "px";
      imgClone.style.top  = y + "px";
      spritePositions.push({img: $imgClone, x: x, y: y});
      return spritePositions.length - 1;
    }

    function placeSprite(spriteId, x, y) {
      if (useCanvas) {
        return placeCanvasSprite(spriteId, x, y);
      }
      else {
        return placeDomSprite(spriteId, x, y);
      }
    }

    function moveCanvasSprite(posId, x, y) {
      var spritePos = spritePositions[posId];
      var sprite    = sprites[spritePos.spriteId];
      ctx.putImageData(sprite.blankSprite, spritePos.x, spritePos.y);
      spritePos.x = x;
      spritePos.y = y;
      ctx.putImageData(sprite.sprite, x, y);
    }

    function moveDomSprite(posId, x, y) {
      var spritePos = spritePositions[posId];
      var img   = spritePos.img[0];
      //      spritePos.x = x;
      //      spritePos.y = y;
      img.style.left = x + "px";
      img.style.top  = y + "px";
    }

    function moveSprite(posId, x, y) {
      if (useCanvas) {
        moveCanvasSprite(posId, x, y);
      }
      else {
        moveDomSprite(posId, x, y);
      }
    }

    function removeLastCanvasSprite() {
      var spritePos = spritePositions[spritePositions.length-1];
      var sprite    = sprites[spritePos.spriteId];
      ctx.putImageData(sprite.blankSprite, spritePos.x, spritePos.y);
      spritePositions.pop();
    }

    function removeLastDomSprite() {
      var spritePos = spritePositions[spritePositions.length-1];
      spritePos.img.remove();
      spritePositions.pop();
    }

    function removeLastSprite() {
      if (useCanvas) {
        removeLastCanvasSprite();
      } else {
        removeLastDomSprite();
      }
    }

    function posOf(posId) {
      return spritePositions[posId];
    }

    function dimOfSprite(spriteId) {
      var sprite = sprites[spriteId];
      return {width: sprite.width, height: sprite.height};
    }

    return {
      init:              init,
      createSprite:      createSprite,
      createImageSprite: createImageSprite,
      placeSprite:       placeSprite,
      moveSprite:        moveSprite,
      removeLastSprite:  removeLastSprite,
      posOf:             posOf,
      dimOfSprite:       dimOfSprite
    };

  }();


  // keep track of the FPS

  var fpsAccounting = function() {

    var targetFps         = 30.0;
    var targetFpsMax      = 30.5;
    var targetFpsMin      = 29.5;
    var frameCountMax     = 30;
    var frameCount        = 0;
    var startTime         = 0.0;
    var currentFpsValue   = 0.0;

    function adjustCount(actualFps, targetFps, birdCount) {
      var diff = Math.abs(actualFps - targetFps);
      if (diff < 2.0) {
        return 1;
      } else {
        var computedAdjust = Math.ceil(diff*(birdCount+1)/actualFps/2);
        return computedAdjust;
      }
    }

    // called for each frame update
    function adjustBirds(time, birdCount, bird, addBirds, removeBirds) {
      var adjustmentMade = false;
      if (frameCount === 0) {
        startTime = time;
        frameCount++;
      }
      else if (frameCount < frameCountMax) {
        frameCount++;
      }
      else { // frameCount == frameCountMax
        var delta = time - startTime;
        var fps   = 1000.0*frameCountMax/delta;
        currentFpsValue = fps;
        if (fps > targetFpsMax) {
          //          var addCount = birdCount < 20 ? 1 : adjustCount(fps, targetFps);
          var addCount = adjustCount(fps, targetFps, birdCount);
          addBirds(bird, addCount);
          adjustmentMade = true;
        }
        else if (fps < targetFpsMin) {
          //          var reduceCount = birdCount < 20 ? 1 : adjustCount(fps, targetFps);
          var reduceCount = adjustCount(fps, targetFps, birdCount);
          removeBirds(reduceCount);
          adjustmentMade = true;
        }
        startTime  = time;
        frameCount = 1;
      }
      return adjustmentMade;
    }

    function currentFps(time) {
      return currentFpsValue;
    }

    return {
      currentFps:  currentFps,
      adjustBirds: adjustBirds
    };
  }();


  var animation = function() {

    var animate;
    var useSimd      = false;

    var birdSprite;
    var birdSpriteBase;
    var birdSpriteSimd;
    var allBirds     = [];
    var $fps;
    var $birds;
    var lastTime     = 0.0;

    function randomXY(max) {
      return Math.floor(Math.random()*max);
    }

    function randomY() {
      return Math.floor(Math.random()*globals.surfaceHeight/2);
    }

    function randomX() {
      return Math.floor(Math.random()*globals.surfaceWidth);
    }

    function getStartValue(start, max, randomFunc) {
      if (start === "random") {
        return randomFunc(max);
      }
      else if (start === "center") {
        return Math.floor(max/2);
      }
      else {
        return parseInt(start);
      }
    }

    function addBird(birdSprite) {
      var birdWidth = surface.dimOfSprite(birdSprite).width;
      var x = getStartValue(globals.params.startX, globals.surfaceWidth-birdWidth, randomXY);
      var y = getStartValue(globals.params.startY, globals.surfaceHeight/2, randomXY);
      var birdId   = birds.addBird(y, 0.0);
      var spriteId = surface.placeSprite(birdSprite, x, y);
      allBirds.push({birdId: birdId, spriteId: spriteId, startX: x, startY: y});
    }

    function removeLastBird() {
      if (allBirds.length > 0) {
        birds.removeLastBird();
        surface.removeLastSprite();
        allBirds.pop();
      }
    }

    function addBirds(bird, count) {
      for (var i = 0; i < count; ++i) {
        addBird(bird);
      }
    }

    function removeBirds(count) {
      for (var i = 0; i < count; ++i) {
        removeLastBird();
      }
    }

    function removeAllBirds() {
      while (allBirds.length > 0) {
        removeLastBird();
      }
    }

    function blackDotSprite(width, height) {
      var rgbaValues = new Uint8ClampedArray(width*height*4);
      for (var i = 0, n = width*height*4; i < n; i += 4) {
        rgbaValues[i] = 0;
        rgbaValues[i+1] = 0;
        rgbaValues[i+2] = 0;
        rgbaValues[i+3] = 255;
      }
      return surface.createSprite(width, height, rgbaValues);
    }

    function startStopClick() {
      var button = $("#startStop");
      if (animate) {
        button.val("Start");
        animate = false;
      }
      else {
        button.val("Stop");
        animate = true;
        lastTime = 0.0;
        moveAll();
      }
    }

    function useSimdClick() {
      var button = $("#useSimd");
      if (useSimd) {
        birdSprite = birdSpriteBase;
        useSimd = false;
        button.text("SIMD: OFF");
      }
      else {
        birdSprite = birdSpriteSimd;
        useSimd = true;
        button.text("SIMD: ON");
      }
    }

    // main animation function.  One new frame is created and the next one is requested

    function moveAll(time) {
      if (animate) {
        if (globals.params.useSetTimeout === "true") {
          setTimeout(moveAll, 1);
          time = performance.now();
        }
        else {
          requestAnimationFrame(moveAll);
        }
      }

      if (typeof time === "undefined") {
        return;
      }

      if (globals.params.adjustBirds === "true") {
        if (fpsAccounting.adjustBirds(time, allBirds.length, birdSprite, addBirds, removeBirds)) {
          $birds.text(allBirds.length);
        }
        $fps.text(fpsAccounting.currentFps().toFixed(2));
      }

      if (lastTime !== 0.0) {
        var timeDelta = time - lastTime;
        if (globals.params.constantAccel === "true") {
          birds.updateAllConstantAccel(timeDelta);
        }
        else if (useSimd) {
          birds.updateAllSimd(time - lastTime);
        }
        else {
          birds.updateAll(time - lastTime);
        }
      }
      lastTime = time;

      for (var i = 0; i < allBirds.length; ++i) {
        var bird = allBirds[i];
        var pos = birds.posOf(bird.birdId);
        surface.moveSprite(bird.spriteId, bird.startX, pos);
      }
    }

    function init() {
      // initalize module variables
      useSimd  = false;
      allBirds = [];
      lastTime = 0.0;

      $fps   = $("#fps");
      $birds = $("#birds");
      surface.init($("#domSurface")[0]);
      birdSpriteBase = surface.createImageSprite("fbird-spy2.png", 34, 25, globals.params.scale);
      birdSpriteSimd = surface.createImageSprite("fbird2-spy.png", 34, 25, globals.params.scale);
      birdSprite     = birdSpriteBase;

      var birdDim = surface.dimOfSprite(birdSpriteBase);
      birds.init(globals.surfaceHeight - birdDim.height);

      addBirds(birdSprite, globals.params.initialBirdCount);
      $("#startStop").click(startStopClick);
      if (typeof SIMD !== "undefined") {
        $("#useSimd").click(useSimdClick);
      }
    }

    function start() {
      if (!animate) {
        animate = true;
        lastTime = 0.0;
        moveAll();
      }
    }

    function stop() {
      animate = false;
    }

    function close() {
      stop();
      removeAllBirds();
    }

    return {
      init:  init,
      start: start,
      stop:  stop,
      close: close
    };

  }();

  // parse URL parameters

  var parameters = function () {

    // default parameters
    var parameters = {
      "divId":              "#fbirdDiv",
      "autoStart":          "false",
      "adjustBirds":        "true",
      "initialBirdCount":   "20",
      "startStopButton":    "true",
      "simdButton":         "true",
      "fpsIndicator":       "true",
      "birdCountIndicator": "true",
      "useCanvas":          "false",
      "useDom":             "true",
      "constantAccel":      "false",
      "scale":              "1.0",
      "startX":             "random",
      "startY":             "random",
      "width":              "null",  // inherit from enclosing div
      "height":             "null",  // inherit from enclosing div
      "initialize":         "true",
      "alwaysInitialize":   "false", // ignore value of initialize
      "useSetTimeout":      "false",
      "accelSteps":         "null"
    };

    function parse(options) {
      // copy options
      if (typeof options !== "undefined") {
        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            parameters[key] = options[key];
          }
        }
      }
      // override with URL options
      var href = window.location.href;
      var paramMatch = /(?:\?|\&)(\w+)=((?:\w|\.|\%)+)/g;
      var match = paramMatch.exec(href);
      while (match !== null) {
        parameters[match[1]] = match[2];
        match = paramMatch.exec(href);
      }
      return parameters;
    }

    return {
      parse: parse
    };

  }();

  function createUi() {
    var $div = $(globals.params.divId);
    if (globals.params.startStopButton === "true") {
      var value = globals.params.autoStart === "true" ? "Stop" : "Start";
      var $start = $("<input>").val(value).attr("id", "startStop").attr("type", "button");
      $div.append($start);
    }
    if (globals.params.simdButton === "true") {
      var $centerDiv = $("<div>").addClass("centerDiv");
      var $simd = $("<button>").attr("id", "useSimd").text("SIMD: OFF");
      $centerDiv.append($simd);
      $div.append($centerDiv);
    }
    if (globals.params.fpsIndicator === "true") {
      var $rightDiv = $("<div>").addClass("rightDiv");
      var $fpsSpan = $("<span>").text(" FPS:").append($("<span>").attr("id", "fps"));
      $rightDiv.append($fpsSpan);
      $div.append($rightDiv);
    }
    if (globals.params.birdCountIndicator === "true") {
      var $bottomCenterDiv = $("<div>").addClass("centerDiv").addClass("bottomDiv");
      var $birdCountDiv = $("<div>").attr("id", "birds");
      $bottomCenterDiv.append($birdCountDiv);
      $div.append($bottomCenterDiv);
    }
    if (globals.params.useCanvas === "true") {
      var $canvas = $("<div>").attr("id", "canvasSurface");
      $div.append($canvas);
    }
    if (globals.params.useDom === "true") {
      var $domSurface = $("<div>").attr("id", "domSurface");
      $domSurface.css("height", $div.css("height"));
      if (globals.params.width !== "null") {
        $domSurface.css("width", globals.params.width);
      }
      if (globals.params.height !== "null") {
        $domSurface.css("height", globals.params.height);
      }
      $div.append($domSurface);
    }
  }

  function init(options) {
    logger.trace("main");
    globals.params = parameters.parse(options);
    if (globals.params.initialize === "true" || globals.params.alwaysInitialize === "true") {
      createUi();
      animation.init();
      if (globals.params.autoStart === "true") {
        animation.start();
      }
      globals.initialized = true;
    }
  }

  function close() {
    if (globals.initialized) {
      animation.close();
      $(globals.params.divId).empty();
    }
    globals.initialized = false;
  }

  function start() {
    if (globals.initialized) {
      animation.start();
    }
  }

  function stop() {
    if (globals.initialized) {
      animation.stop();
    }
  }

  return {
    init:  init,
    close: close,
    start: start,
    stop:  stop
  };

}());
