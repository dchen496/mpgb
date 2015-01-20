define(function(require) {
  "use strict"
  var evm = require('./event-manager');
  var memory = require('./memory');
  var cpu = require('./cpu');
  var video = require('./video');
  var sound = require('./sound');
  var cartridge = require('./cartridge');
  var serial = require('./serial');
  var dma = require('./dma');
  var joypad = require('./joypad');
  var timer = require('./timer');

  var proto = {
    init: function(romImage) {
      this.evm = evm.create(this);
      this.memory = memory.create(this);
      this.cpu = cpu.create(this);
      this.video = video.create(this);
      this.sound = sound.create(this);
      this.cartridge = cartridge.create(this, romImage);
      this.serial = serial.create(this);
      this.dma = dma.create(this);
      this.joypad = joypad.create(this);
      this.timer = timer.create(this);

      this.evm.addCore(this.video);
      this.evm.addCore(this.sound);
      this.evm.addCore(this.serial);
      this.evm.addCore(this.dma);
      this.evm.addCore(this.joypad);
      this.evm.addCore(this.timer);
    },
    run: function(run) {
      var v = this;
      var clocksPerSecond = Math.pow(2, 23);
      var itersPerSecond = 60.0;
      return setTimeout(function() {
        v.evm.run(clocksPerSecond / itersPerSecond);
      }, 1000.0 / itersPerSecond); 
    }
  }

  return {
    create: function(romImage) {
      var gbc = Object.create(proto);
      gbc.init(romImage);
      return gbc;
    },
    test: function() {
      var romImage = new Uint8Array(0x8000);
      JSGBC.GBC.create(romImage);
      return true;
    }
  }
});
