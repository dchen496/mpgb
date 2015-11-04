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
      this.timaBase = 0;
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
      if(this.started) {
        var shift = shifts[this.clockSelect];
        if(read) {
          return (((this.cpu.clock - this.timaStart) >> shift) + this.timaBase) & 0xff;
        } else {
          var oldTimaStart = this.timaStart;
          this.timaStart += ((this.cpu.clock - this.timaStart) >> shift) << shift;
          this.timaBase = value;
          this._updateOverflowEvent();
          return value;
        }
      } else {
        if(read) {
          return this.timaBase;
        } else {
          this.timaBase = value;
        }
      }
    },
    tmaOp: function(read, value) {
      if(read) {
        return this.tma;
      }
      this.tma = value;
      return value;
    },
    tacOp: function(read, value) {
      var oldTac = (this.started << 2) | this.clockSelect;
      if(read) {
        return oldTac;
      }

      value &= 0x07;
      // avoid adjusting the start time if none of the parameters have
      // changed, since that drops fractional cycles
      if(value == oldTac) {
        return;
      }

      this.timaBase = this.timaOp(true, 0);
      this.timaStart = this.cpu.clock;
      this.clockSelect = value & 0x03;
      this.started = (value >> 2) & 0x01;

      this._updateOverflowEvent();
      return value;
    },
    _updateOverflowEvent: function() {
      if(this.started) {
        var shift = shifts[this.clockSelect];
        var ov = ((0x100 - this.timaBase) << shift) + this.timaStart;
        this.evm.register(evm.events.TIMER_OVERFLOW, ov, this, this._overflowCallback);
      } else {
        this.evm.unregister(evm.events.TIMER_OVERFLOW);
      }
    },
    _overflowCallback: function(clock) {
      this.timaBase = this.tma;
      this.timaStart = clock;
      this.cpu.irq(cpu.irqvectors.TIMER);
      this._updateOverflowEvent();
    },

    dump: function() {
      return sprintf("tima: %02x timaStart: %d timaBase: %02x\n",
          this.timaOp(true, 0), this.timaStart, this.timaBase) +
        sprintf("tma: %02x div: %02x started: %d cshift: %d", this.tmaOp(true,
              0), this.divOp(true, 0), this.started, shifts[this.clockSelect]);
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
