define(['./cpu-isa', function(isa) {
  "use strict"
  var RUN_INSTRUCTIONS = 1;
  var RUN_INTERRUPT = 2;
  var RUN_DMA = 3;

  var irqs = {
    vblank: 0,
    lcd: 1,
    serial: 3,
    joypad: 4
  };

  var proto = {
    init: function(memory) {
      this.clock = 0;

      this.memory = memory;

      this.a = 0;
      this.b = 0;
      this.c = 0;
      this.d = 0;
      this.e = 0;

      this.h = 0;
      this.l = 0;

      this.sp = 0;
      this.pc = 0;

      this.fz = 0;
      this.fn = 0;
      this.fh = 0;
      this.fc = 0;

      this.ime = 0;
      this.iflag = [0, 0, 0, 0, 0];
      this.irqcount = 0;
      this.vectors = [0x0040, 0x0048, 0x0050, 0x0058, 0x0060];

      this.ops = isa.generateOps();
      this.disasm = isa.generateDisasm();
      this.cbops = isa.generateCBOps();
      this.cbdisasm = isa.generateCBDisasm();
    },
    run: function(clocks) {
    },
    runInstructions: function(clocks) {
      var startClock = this.clock;
      var stopClock = startClock + clocks;
      while(this.clock < stopClock) {
        var opcode = this.memory.op(this.pc, true, 0);
        this.ops[opcode]();
        if(this.state != this.RUN_INSTRUCTIONS) {
          return this.clock - startClock;
        }
      }
    },
    runInterrupt: function() {
      if(!this.ime || this.irqcount <= 0)
        return 0;
      for(var i = 0; i < 5; i++) {
        if(this.ienable[vector] && this.iflag[i]) {
          this.irqcount--;
          this.iflag[i] = 0;
          this.ime = 0;

          this.sp = (this.sp + 0xfffe) & 0xffff;
          this.memory.op16(this.sp, false, this.pc);
          this.pc = this.vectors[i];

          return 16; // estimated 16-cycle interrupt latency
        }
      }
      return 0;
    },

    irq: function(vector) {
      this.iflag[vector] = 1;
      if(this.ienable[vector]) 
        this.irqcount++;
    },
    

    iflagOp: function(read, value) {
      if(read) {
        var res = 0;
        for(var i = 0; i < 5; i++) {
          res |= (this.iflag[i] << i);
        }
        return res;
      }
      for(var i = 0; i < 5; i++) {
        if(value & (1 << i)) {
          this.iflag[i] = 1;
        } else {
          this.iflag[i] = 0;
        }
      }
    },
    ienableOp: function(read, value) {
      if(read) {
        var res = 0;
        for(var i = 0; i < 5; i++) {
          res |= (this.ienable[i] << i);
        }
        return res;
      }
      for(var i = 0; i < 5; i++) {
        if(value & (1 << i)) {
          this.ienable[i] = 1;
          if(this.iflag[vector])
            this.irqcount++;
        } else {
          this.ienable[i] = 0;
          if(this.iflag[vector])
            this.irqcount--;
        }
      }
    },

    stop: function() {
    },
    halt: function() {
    },
    getF: function(value) {
      return (this.fz << 7) | (this.fn << 6) | (this.fh << 5) | (this.fc << 4);
    },
    setF: function(value) {
      this.fz = (value >> 7) & 1;
      this.fn = (value >> 6) & 1; 
      this.fh = (value >> 5) & 1; 
      this.fc = (value >> 4) & 1;
    },
  }

  return {
    create: function(memory) {
      var cpu = Object.create(proto);
      cpu.init(memory);
      return cpu;
    },
    irqs: irqs
  }
});
