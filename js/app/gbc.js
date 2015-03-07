define(function(require) {
  "use strict"
  var evm = require('./event-manager');
  var memory = require('./memory');
  var cpu = require('./cpu');
  var cartridge = require('./cartridge');
  var timer = require('./timer');
  var video = require('./video');
  var joypad = require('./joypad');

  var CLOCKS_PER_SEC = 1 << 22;
  var CLOCKS_PER_FRAME = Math.round(CLOCKS_PER_SEC / 60);

  var proto = {
    init: function(romImage, frameCallback) {
      this.clock = 0;

      this.evm = evm.create();
      this.memory = memory.create(this);
      this.cpu = cpu.create(this.memory, this.evm);
      this.cartridge = cartridge.create(this, romImage);
      this.timer = timer.create(this.cpu, this.evm);
      this.video = video.create(this.memory, this.cpu, this.evm, frameCallback);
      this.joypad = joypad.create(this.cpu);
    },
    advance: function(clock) {
      var run = true;
      this.evm.register(evm.events.BREAKPOINT, clock, this, function() {
        run = false;
      });
      while(run) {
        this.clock = this.cpu.advanceToEvent(this.evm);
        this.evm.runEvent();
      }
    },
    advanceBy: function(clocks) {
      this.advance(this.clock + clocks);
    },
    boot: function() {
      this.cpu.pc = 0x0100;
      this.cpu.sp = 0xFFFE;

      var regs = [
        ["a", 0x01],
        ["b", 0xB0],
        ["c", 0x00],
        ["d", 0x13],
        ["e", 0x00],
        ["f", 0xD8],
        ["h", 0x01],
        ["l", 0x4D],
      ];
      for(var i = 0; i < regs.length; i++) {
        this.cpu[regs[i][0]] = regs[i][1];
      }

      var writes = [
        [0xFF05, 0x00], // TIMA
        [0xFF06, 0x00], // TMA
        [0xFF07, 0x00], // TAC
        [0xFF10, 0x80], // NR10
        [0xFF11, 0xBF], // NR11
        [0xFF12, 0xF3], // NR12
        [0xFF14, 0xBF], // NR14
        [0xFF16, 0x3F], // NR21
        [0xFF17, 0x00], // NR22
        [0xFF19, 0xBF], // NR24
        [0xFF1A, 0x7F], // NR30
        [0xFF1B, 0xFF], // NR31
        [0xFF1C, 0x9F], // NR32
        [0xFF1E, 0xBF], // NR33
        [0xFF20, 0xFF], // NR41
        [0xFF21, 0x00], // NR42
        [0xFF22, 0x00], // NR43
        [0xFF23, 0xBF], // NR30
        [0xFF24, 0x77], // NR50
        [0xFF25, 0xF3], // NR51
        [0xFF26, 0xF1], // NR52
        [0xFF40, 0x91], // LCDC
        [0xFF42, 0x00], // SCY
        [0xFF43, 0x00], // SCX
        [0xFF45, 0x00], // LYC
        [0xFF47, 0xFC], // BGP
        [0xFF48, 0xFF], // OBP0
        [0xFF49, 0xFF], // OBP0
        [0xFF4A, 0x00], // WY
        [0xFF4B, 0x00], // WX
        [0xFFFF, 0x00], // IE
      ];
      for(var i = 0; i < writes.length; i++) {
        this.memory.write(writes[i][0], writes[i][1]);
      }
    }
  }

  return {
    create: function(romImage, frameCallback) {
      var gbc = Object.create(proto);
      gbc.init(romImage, frameCallback);
      return gbc;
    },
    test: function() {
      var romImage = new Uint8Array(0x8000);
      JSGBC.GBC.create(romImage);
      return true;
    }
  };
});
