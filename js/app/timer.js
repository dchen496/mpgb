define(['sprintf', './cpu', './event-manager'], function(sprintf, cpu, evm) {
  "use strict"

  var shifts = [10, 4, 6, 8];

  var proto = {
    init: function(cpu, evm) {
      this.cpu = cpu;
      this.evm = evm;

      this.tma = 0;
      this.started = 0;
      this.clockSelect = 0;

      this.divStart = 0;
      this.timaStart = 0;
      this.timaStartValue = 0;
    },
    divOp: function(read, value) {
      if(read) {
        var cycles = (this.cpu.clock - this.divStart) >> 8;
        return cycles & 0xff;
      }
      this.divStart = this.cpu.clock;
      return 0;
    },
    timaOp: function(read, value) {
      if(read) {
        if(this.started) {
          var shift = shifts[this.clockSelect];
          return (this.cpu.clock - this.timaStart) >> shift + this.timaStartValue;
        }
        return this.timaStartValue;
      }
      this.timaStart = this.cpu.clock;
      this.updateOverflowEvent();
      return value;
    },
    tmaOp: function(read, value) {
      if(read) {
        return this.tma;
      }
      this.tma = value;
      return value;
    },
    tacOp: function(read, value) {
      var oldTac = this.started << 2 | this.clockSelect;
      if(read) {
        return oldTac;
      }

      value &= 0x07;
      // avoid adjusting the start time if none of the parameters have
      // changed, since that drops fractional cycles
      if(value == oldTac) {
        return;
      }

      this.clockSelect = value & 0x03;
      this.started = (value >> 2) & 0x01;

      // use the old value of TIMA as the base
      this.timaStart = this.cpu.clock;
      this.timaStartValue = this.timaOp(true, 0);
      this.updateOverflowEvent();
      return value;
    },
    updateOverflowEvent: function() {
      if(this.started) {
        var shift = shifts[this.clockSelect];
        var ov = ((0x100 - this.timaStartValue) << shift) + this.timaStart;
        this.evm.register(evm.events.TIMER_OVERFLOW, ov, this, this.overflowCallback);
      } else {
        this.evm.unregister(evm.events.TIMER_OVERFLOW);
      }
    },
    overflowCallback: function(clock) {
      this.timaStartValue = this.tma;
      this.timaStart = clock;
      this.cpu.irq(cpu.irqvectors.TIMER);
      this.updateOverflowEvent();
    },

    dump: function() {
      return sprintf("tima: %02x tma: %02x div: %02x started: %d cshift: %d",
          this.timaOp(1, 0), this.tmaOp(1, 0), this.divOp(1, 0), this.started, shifts[this.clockSelect]);
    }
  };

  return {
    create: function(cpu, evm) {
      var timer = Object.create(proto);
      timer.init(cpu, evm);
      return timer;
    }
  };
});
