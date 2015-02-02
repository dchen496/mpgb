define(function(require) {
  "use strict"
  var evm = require('./evm');
  var memory = require('./memory');
  var cpu = require('./cpu');
  var timer = require('./timer');

  var proto = {
    init: function(romImage) {
      this.clock = 0;

      this.evm = evm.create();
      this.memory = memory.create(this);
      this.cpu = cpu.create(this.memory);
      this.timer = timer.create(this.cpu, this.evm);
    },
    advance: function(clock) {
      while(this.clock < clock) {
        this.clock = this.cpu.advanceToEvent(this.evm);
        this.evm.advance(this.clock);
      }
    },
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
