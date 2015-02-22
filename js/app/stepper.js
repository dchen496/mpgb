define(['jquery', './gbc', './cpu-disasm'], function($, gbc, cpuDisasm) {

  var tests = [
    '../cpu_instrs.gb',
    '01-special.gb',
    '02-interrupts.gb',
    '03-op sp,hl.gb',
    '04-op r,imm.gb',
    '05-op rp.gb',
    '06-ld r,r.gb',
    '07-jr,jp,call,ret,rst.gb',
    '08-misc instrs.gb',
    '09-op r,r.gb',
    '10-bit ops.gb',
    '11-op a,(hl).gb'
  ];

  function main() {
    var req = new XMLHttpRequest();
    //req.open('get', 'roms/tetris.gb', true);
    // failed: 3, 7, 9, 10, 11
    // passed: 1, 2, 4, 5, 6, 8
    req.open('get', 'roms/cpu_instrs/individual/' + tests[09], true);
    req.responseType = 'arraybuffer';
    req.onload = function(ev) { romLoaded(req.response) };
    req.send(null);
  };


  function romLoaded(arrayBuffer) {
    var romImage = new Uint8Array(arrayBuffer);
    var gameboy = gbc.create(romImage, frameCallback);
    gameboy.boot();
    updateLog(gameboy, 0, 0);

    for(var i = 0; i < 8; i++) {
      $("#adv" + i).click(advanceHandler.bind(this, gameboy, Math.pow(10, i)));
    }
    $("#advcustom").click(function() {
      var clocks = parseInt($("#advcustom-input")[0].value);
      if(isNaN(clocks)) {
        return;
      }
      advanceHandler(gameboy, clocks);
    });

    $("#setmemaddr").click(updateMemory.bind(this, gameboy));
  };
  
  function updateMemory(gameboy) {
    var addr = parseInt($("#memaddr")[0].value, 16);
    if(isNaN(addr)) {
      return;
    }
    $("#memory").text(gameboy.memory.dump(addr - 32, addr + 88, addr));
  }

  function advanceHandler(gameboy, clocks) {
    var start = new Date().getTime();
    var startClk = gameboy.clock;
    gameboy.advanceBy(clocks);
    var end = new Date().getTime();
    var endClk = gameboy.clock;
    var time = end - start;
    updateLog(gameboy, endClk - startClk, time);
  }

  function updateLog(gameboy, clocks, execTime) {
    $("#stats").text("Execution time: " + execTime / 1000.0 + "s " +
      (clocks / execTime / 1000.0).toFixed(2) + " Mcycles/s " +
      "delta: " + clocks + " " +
      "clock: " + gameboy.clock + " ");

    $("#cpu").text(gameboy.cpu.dump());

    var disasm = cpuDisasm.create(gameboy.memory);
    var disasmText = disasm.disasmRangePretty(gameboy.cpu.pc - 4, 
        gameboy.cpu.pc + 8, gameboy.cpu.pc);
    $("#disasm").text(disasmText);

    $("#stack").text(gameboy.memory.dumpStack(-32, 32));

    updateMemory(gameboy);

    $("#video").text(gameboy.video.dump());

    drawTiles(gameboy.video.dumpTiles());

    $("#timer").text(gameboy.timer.dump());

    $("#events").text(gameboy.evm.dump());

    $("#cartridge").text(gameboy.cartridge.dump());
  }

  function frameCallback(fb) {
    var ctx = $("#lcd")[0].getContext("2d");
    ctx.imageSmoothingEnabled = false;
    var imageData = ctx.createImageData(160, 144);
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

    ctx.drawImage(newCanvas, 0, 0, 640, 576);
  }

  function drawTiles(tiles) {
    var ctx = $("#tiles")[0].getContext("2d");
    var imageData = ctx.createImageData(512, 48);
    var data = imageData.data;
    for(var i = 0; i < data.length / 4; i++) {
      var x = i % 512;
      var y = Math.floor(i / 512);
      var tile = Math.floor(x / 8) + 64 * Math.floor(y / 8);
      var xoff = x % 8;
      var yoff = y % 8;
      var color = tiles[tile][yoff * 8 + xoff];

      data[4*i + 0] = color;
      data[4*i + 1] = color;
      data[4*i + 2] = color;
      data[4*i + 3] = 0xff;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return main;
});
