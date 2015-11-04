define(['jquery', './gbc-link', './joypad', './roms', 'jquery-cookie'],
    function($, gbcLink, joypad, roms) {
  "use strict"

  var interval = null;
  var gameboyLink = null;
  var romImage = null;
  var picker = null;
  var lcds = [];

  function main() {
    picker = $('#rompicker');
    lcds[0] = $('#lcd0')[0];
    lcds[1] = $('#lcd1')[0];

    var lastPath = $.cookie("romPath");
    if(lastPath == null || roms.indexOf(lastPath) < 0) {
      lastPath = roms[0];
    }

    romSelected(lastPath);

    $.each(roms, function(k, v) {
      picker.append($("<option></option>").attr("value", v).text(v));
    });
    picker.val(lastPath);
    picker.change(selectRom);
    $('#reset').click(reset);

    $('body').keydown(keyDown);
    $('body').keyup(keyUp);
  }

  function selectRom() {
    var path = picker.val();
    $.cookie("romPath", path, {expires: 1000});
    romSelected(path);
  }

  function romSelected(path) {
    var req = new XMLHttpRequest();
    req.open('get', 'roms/' + path, true);
    req.responseType = 'arraybuffer';
    req.onload = function(ev) { romLoaded(req.response) };
    req.send(null);

    for(var i in lcds) {
      var canvas = lcds[i];
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function romLoaded(arrayBuffer) {
    romImage = new Uint8Array(arrayBuffer);
    reset();
  }

  function reset() {
    if(interval != null) {
      clearInterval(interval);
    }

    gameboyLink = gbcLink.create(romImage, frameCallback1, frameCallback2);
    gameboyLink.boot();

    resume(59.7275);
  }

  function frameCallback1(link, gb, fb) {
    drawFrame(0, fb);
    link.pause();
  }

  function frameCallback2(link, gb, fb) {
    drawFrame(1, fb);
  }

  function drawFrame(index, fb) {
    var canvas = lcds[index];
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    var imageData = ctx.createImageData(canvas.width / 4, canvas.height / 4);
    var data = imageData.data;
    for(var i = 0; i < fb.length; i++) {
      data[4*i + 0] = fb[i];
      data[4*i + 1] = fb[i];
      data[4*i + 2] = fb[i];
      data[4*i + 3] = 0xff;
    }

    var newCanvas = $("<canvas>").attr("width", imageData.width)
                                 .attr("height", imageData.height)[0];
    newCanvas.getContext("2d").putImageData(imageData, 0, 0);

    ctx.drawImage(newCanvas, 0, 0, canvas.width, canvas.height);
  }

  function getButton(keycode) {
    var b = joypad.buttons;
    switch(keycode) {
    case 90:
      return b.A;
    case 88:
      return b.B;
    case 13:
      return b.START;
    case 220:
      return b.SELECT;
    case 37:
      return b.LEFT;
    case 38:
      return b.UP;
    case 39:
      return b.RIGHT;
    case 40:
      return b.DOWN;
    default:
      return null;
    }
  };

  function keyDown(ev) {
    var button = getButton(ev.keyCode);
    if(button == null)
      return;
    if(ev.shiftKey) {
      gameboyLink.gbc2.joypad.press(button);
    } else {
      gameboyLink.gbc1.joypad.press(button);
    }
  }

  function keyUp(ev) {
    var button = getButton(ev.keyCode);
    if(button == null)
      return;
    if(ev.shiftKey) {
      gameboyLink.gbc2.joypad.unpress(button);
    } else {
      gameboyLink.gbc1.joypad.unpress(button);
    }
  }

  function pause() {
    gb.pause();
    if(interval != null) {
      clearInterval(interval);
    }
  }

  function resume(fps) {
    if(interval != null) {
      clearInterval(interval);
    }
    interval = setInterval(function() {
      gameboyLink.advance();
    }, 1000.0 / fps);
  }

  return main;
});
