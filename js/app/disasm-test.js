define(['jquery', 'sprintf', './cpu-disasm', './test/memory',
    './roms', 'jquery-cookie'],
function($, sprintf, cpuDisasm, memory, roms) {

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
  }

  function selectRom() {
    var path = $('#rompicker').val();
    $.cookie("romPath", path, {expires: 1000});
    romSelected(path);
  }

  function romSelected(path) {
    var req = new XMLHttpRequest();
    req.open('get', 'roms/' + path, true);
    req.responseType = 'arraybuffer';
    req.onload = function(ev) { romLoaded(req.response) };
    req.send(null);
  };


  function romLoaded(arrayBuffer) {
    var data = new Uint8Array(arrayBuffer);
    var mem = memory.create(data);
    var disasm = cpuDisasm.create(mem, 0);
    $('#disasm').text(disasm.disasmRangePretty(0, Math.min(data.length, 0x10000), 0));
  };


  return main;
});
