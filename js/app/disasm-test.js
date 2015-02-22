define(['jquery', 'sprintf', './cpu-disasm', './test/memory'], 
function($, sprintf, cpuDisasm, memory) {

  function main() {
    var req = new XMLHttpRequest();
    //req.open('get', 'roms/tetris.gb', true);
    req.open('get', 'roms/cpu_instrs/cpu_instrs.gb', true);
    req.responseType = 'arraybuffer';
    req.onload = function(ev) { romLoaded(req.response) };
    req.send(null);
  };


  function romLoaded(arrayBuffer) {
    var data = new Uint8Array(arrayBuffer);
    var mem = memory.create(data);
    var disasm = cpuDisasm.create(mem, 0);
    $('#disasm').text(disasm.disasmRangePretty(0, data.length, 0));
  };


  return main;
});
