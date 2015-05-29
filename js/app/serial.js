define(['./event-manager', './cpu'], function(evm, cpu) {
  "use strict"
  var TRANSFER_CLOCKS = 4096;

  var proto = {
    init: function(gbc, cpu, evm) {
      this.gbc = gbc;
      this.cpu = cpu;
      this.evm = evm;
      this.sb = 0;
      this.internalClock = 0;
      this.transferStart = 0;
      this.otherGameboy = null;
    },

    sbOp: function(read, value) {
      if(read) {
        return this.sb;
      }
      this.sb = value & 0xff;
    },
    scOp: function(read, value) {
      if(read) {
        return (this.transferStart << 7) & this.internalClock;
      }
      this.internalClock = value & 1;
      this.transferStart = (value >> 7) & 1;
      if(this.transferStart && this.internalClock && this.otherGameboy != null) {
        // stretch the sync interval to when the transfer actually completes
        this.evm.update(evm.events.SERIAL_SYNC, this.cpu.clock + TRANSFER_CLOCKS);
        this.otherGameboy.evm.update(evm.SERIAL_SYNC, this.cpu.clock + TRANSFER_CLOCKS);
      }
    },
    linkWith: function(otherGameboy) {
      this.otherGameboy = otherGameboy;
      this.evm.register(evm.events.SERIAL_SYNC, this.cpu.clock + TRANSFER_CLOCKS, this, this.sync);
    },
    sync: function() {
      this.evm.update(evm.events.SERIAL_SYNC, this.cpu.clock + TRANSFER_CLOCKS);
      this.gbc.pause();
    }
  }

  return {
    create: function(gbc, cpu, evm) {
      var serial = Object.create(proto);
      serial.init(gbc, cpu, evm);
      return serial;
    },
  }
});
