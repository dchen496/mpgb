define(['./cpu'], function(cpu) {
  "use strict"
  var proto = {
    init: function(cpu) {
      this.cpu = cpu;
      this.clock = 0;

      this.tma = 0;
      this.started = 0;
      this.clockSelect = 0;

      this.divStart = 0;

      this.timaStart = 0;
      this.timaBase = 0;

      this.shifts = [10, 4, 6, 8];
    },
    divOp: function(read, value) {
      if(read) {
        var cycles = (this.clock - this.divStart) >> 8;
        return cycles & 0xff;
      }
      this.divStart = this.clock;
      return 0;
    },
    timaOp: function(read, value) {
      if(read) {
        if(this.started) {
          var shift = this.shifts[this.clockSelect];
          return (this.clock - this.timaStart) >> shift + this.timaBase;
        }
        return this.timaBase;
      }
      this.timaStart = this.clock;
      this.timaBase = value;
      this.cpu.updateTiming();
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
      if(read) {
        return this.started << 2 | this.clockSelect;
      }
      var newStarted = (value & 0x04) >> 2;
      if(!this.started && newStarted) { // enable
        this.timaStart = this.clock;
      } else if(this.started && !newStarted) { // disable
        this.timaBase = this.timaOp(true, 0);
      }
      this.started = newStarted;
      this.clockSelect = value & 0x03;
      this.cpu.updateTiming();
      return value;
    },
    overflow: function() {
      this.timaStart = this.clock;
      this.timaBase = this.tma;
      this.cpu.irq(cpu.irqs.timer);
    },
    nextOverflowClock: function() {
      if(!this.started)
        return -1;
      var diff = 0x100 - this.timaBase;
      return diff << this.shifts[this.clockSelect] + this.timaStart;
    }
  }

  return {
    create: function(cpu) {
      var timer = Object.create(proto);
      timer.init(cpu);
      return timer;
    }
  }
});
