define(['jquery', './gbc', './joypad', 'jquery-cookie'], 
    function($, gbc, joypad) {

  var interval = null;
  var gameboy = null;
  var romImage = null;

  var roms = [
    'tetris.gb',
    'cpu_instrs/cpu_instrs.gb',
    'cpu_instrs/individual/01-special.gb',
    'cpu_instrs/individual/02-interrupts.gb',
    'cpu_instrs/individual/03-op sp,hl.gb',
    'cpu_instrs/individual/04-op r,imm.gb',
    'cpu_instrs/individual/05-op rp.gb',
    'cpu_instrs/individual/06-ld r,r.gb',
    'cpu_instrs/individual/07-jr,jp,call,ret,rst.gb',
    'cpu_instrs/individual/08-misc instrs.gb',
    'cpu_instrs/individual/09-op r,r.gb',
    'cpu_instrs/individual/10-bit ops.gb',
    'cpu_instrs/individual/11-op a,(hl).gb',
    'instr_timing/instr_timing.gb'
  ];

  function main() {
    var lastPath = $.cookie("romPath");
    if(lastPath == null || roms.indexOf(lastPath) < 0) {
      lastPath = roms[0];
    }

    romSelected(lastPath);

    var picker = $('#rompicker');
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
    var path = $('#rompicker').val();
    $.cookie("romPath", path, {expires: 1000});
    romSelected(path);
  }

  function romSelected(path) {
    var canvas = $("#lcd")[0];
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    var req = new XMLHttpRequest();
    req.open('get', 'roms/' + path, true);
    req.responseType = 'arraybuffer';
    req.onload = function(ev) { romLoaded(req.response) };
    req.send(null);
  }

  function romLoaded(arrayBuffer) {
    romImage = new Uint8Array(arrayBuffer);
    reset();
  }

  function reset() {
    if(interval != null) {
      clearInterval(interval);
    }

    gameboy = gbc.create(romImage, frameCallback);
    gameboy.boot();

    interval = setInterval(runFrame, 1000 / 60.0);
  }

  function runFrame() {
    gameboy.advanceBy(1000000);
  }

  function frameCallback(gb, fb) {
    var canvas = $("#lcd")[0];
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
    ctx.putImageData(imageData, 0, 0);

    var newCanvas = $("<canvas>").attr("width", imageData.width).attr("height", imageData.height)[0];
    newCanvas.getContext("2d").putImageData(imageData, 0, 0);

    ctx.drawImage(newCanvas, 0, 0, canvas.width, canvas.height);

    gb.pause();
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
    gameboy.joypad.press(button);
  }

  function keyUp(ev) {
    var button = getButton(ev.keyCode);
    if(button == null)
      return;
    gameboy.joypad.unpress(button);
  }

  return main;
});
