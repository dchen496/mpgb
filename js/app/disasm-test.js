define(['jquery', 'sprintf', './cpu-disasm', './test/memory'], 
function($, sprintf, cpuDisasm, memory) {

  function main() {
    var req = new XMLHttpRequest();
    req.open('get', 'roms/tetris.gb', true);
    req.responseType = 'arraybuffer';
    req.onload = function(ev) { romLoaded(req.response) };
    req.send(null);
  };


  function romLoaded(arrayBuffer) {
    var data = new Uint8Array(arrayBuffer);
    var mem = memory.create(data);
    var disasm = cpuDisasm.create(mem, 0);
    var dis = disasm.disasmRange(0, data.length);
    var lines = [];
    for(var i = 0; i < dis.length; i++) {
      lines.push.apply(lines, addInstruction(mem, dis[i]));
    }
    $('#disasm').html(lines.join('<br />'));
  };

  function addInstruction(mem, dis) {
    var rows = [];
    var cols = new Array(3);
    for(var i = 0; i < dis.len; i++) {
      cols[0] = sprintf("%04x", (dis.addr+i) & 0xffff);
      cols[1] = sprintf("%02x", mem.read(dis.addr+i));
      cols[2] = '';
      if(i == 0) {
        cols[2] = dis.ds;
      }
      rows.push(cols.join(' '));
    }
    return rows;
  };

  return main;
});
