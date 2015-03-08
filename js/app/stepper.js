define(['jquery', './gbc', './cpu-disasm', 'sprintf', './roms', 'jquery-cookie'], 
    function($, gbc, cpuDisasm, sprintf, roms) {

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
    picker.change(reset);
    $('#reset').click(reset);
  }

  function reset() {
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
    var romImage = new Uint8Array(arrayBuffer);
    var gameboy = gbc.create(romImage, frameCallback);
    gameboy.boot();
    updateLog(gameboy, 0, 0);

    for(var i = 0; i < 9; i++) {
      $("#advance" + i).click(advanceHandler.bind(this, gameboy, Math.pow(10, i)));
    }
    $("#advance-custom").click(function() {
      var clocks = parseInt($("#advance-custom-input")[0].value);
      if(isNaN(clocks)) {
        return;
      }
      advanceHandler(gameboy, clocks);
    });

    $("#setmemaddr").click(updateMemory.bind(this, gameboy));
  }
  
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
    $("#stats").text(sprintf("wall: %.2fs %.2f M/s delta: %d clock: %d time: %.2fs",
      execTime / 1000.0, clocks / execTime / 1000.0, 
      clocks, gameboy.clock, gameboy.clock / Math.pow(2.0,22.0)));

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

  function frameCallback(gameboy, fb) {
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

    var newCanvas = $("<canvas>").attr("width", imageData.width).attr("height", imageData.height)[0];
    newCanvas.getContext("2d").putImageData(imageData, 0, 0);

    ctx.drawImage(newCanvas, 0, 0, canvas.width, canvas.height);
  }

  function drawTiles(tiles) {
    var canvas = $("#tiles")[0];
    var ctx = canvas.getContext("2d");
    var imageData = ctx.createImageData(canvas.width, canvas.height);
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
