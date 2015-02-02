define(['./cpu', './event-manager'], function(cpu, evm) {
  "use strict"
  var proto = {
    init: function(cpu, evm) {
      this.cpu = cpu;
      this.evm = evm;

      this.tma = 0;
      this.started = 0;
      this.clockSelect = 0;

      this.divStart = 0;

      this.timaBase = 0;
      this.timaBaseClock = 0;

      this.shifts = [10, 4, 6, 8];
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
          var shift = this.shifts[this.clockSelect];
          return (this.cpu.clock - this.timaBaseClock) >> shift + this.timaBase;
        }
        return this.timaBase;
      }
      this.timaBaseClock = this.cpu.clock;
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
      if(value == oldTac)
        return;
      // store the old value of TIMA
      this.timaBase = this.timaOp(true, 0);
      this.timaBaseClock = this.cpu.clock;
      this.clockSelect = value & 0x03;
      this.started = value & 0x01;
      this.updateOverflowEvent();
      return value;
    },
    updateOverflowEvent: function() {
      if(this.started) {
        var shift = this.shifts[this.clockSelect];
        var ov = (0x100 - this.timaBase) << shift + this.timaBaseClock;
        this.evm.register(evm.events.TIMER_OVERFLOW, ov, overflowCallback);
      }
      this.evm.unregister(evm.events.TIMER_OVERFLOW);
    },
    overflowCallback: function(clock) {
      this.timaBase = this.tma;
      this.timaBaseClock = clock;
      this.cpu.irq(cpu.irqvectors.TIMER);
      this.updateOverflowEvent();
    }
  };

  return {
    create: function(cpu) {
      var timer = Object.create(proto);
      timer.init(cpu);
      return timer;
    }
  };
});
