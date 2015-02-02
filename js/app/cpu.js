define['./cpu-isa', function(isa) {
  "use strict"

  var irqvectors = {
    VBLANK: 0,
    LCD: 1,
    TIMER: 2,
    SERIAL: 3,
    JOYPAD: 4
  };

  var states = {
    NORMAL,
    IRQ,
    HALTED,
    STOPPED
//    HDMA for GBC
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
      this.iflags = 0;
      this.ienables = 0;
      this.ivectors = [0x0040, 0x0048, 0x0050, 0x0058, 0x0060];

      this.ops = isa.generateOps();
      this.cbops = isa.generateCBOps();

      this.state = states.NORMAL;
    },
    advanceToEvent: function(evm) {
      while(this.clock < evm.nextClock()) {
        switch(this.state) {
        case states.NORMAL:
          while(this.clock < evm.nextClock() && this.state == states.NORMAL) {
            var opcode = this.memory.read(this.pc);
            this.ops[opcode]();
          }
          break;
        case states.IRQ:
          this.handleIrq();
          this.state = NORMAL;
          break;
        case states.HALTED:
          this.clock = evm.nextClock();
          break;
        case states.STOPPED:
          this.clock = evm.nextClock();
          break;
        /*
        case states.HDMA:
          throw("cpu hdma mode not implemented");
        */
        }
      }
      return this.clock;
    },
    handleIrq: function() {
      var irqs = this.ienables & this.iflags;
      this.processIrqs = false;
      if(!this.ime || !irqs)
        return;
      for(var i = 0; i < 5; i++) {
        if(irqs & (1 << i)) {
          this.iflags &= ~(1 << i);
          this.ime = 0;
          // push pc onto stack
          this.sp = (this.sp + 0xfffe) & 0xffff;
          this.memory.write16(this.sp, this.pc);
          this.pc = this.ivectors[i];
          // estimated 16-cycle interrupt latency
          this.clock += 16;
        }
      }
    },
    irq: function(vector) {
      this.iflags |= (1 << vector);
      this.checkPendingIrq();
    },
    iflagOp: function(read, value) {
      if(read) {
        return this.iflags & 0x1F;
      }
      this.iflags = value & 0x1F;
      this.checkPendingIrq();
      return this.iflags;
    },
    ienableOp: function(read, value) {
      if(read) {
        return this.ienables & 0x1F;
      }
      this.ienables = value & 0x1F;
      this.checkPendingIrq();
      return this.ienables;
    },
    di: function() {
      this.ime = 0;
      this.checkPendingIrq();
    },
    ei: function() {
      // TODO: investigate timings when EI/RETI are themselves interrupted
      this.ime = 1;
      this.checkPendingIrq();
    },
    checkPendingIrq: function() {
      this.state = this.ime && (this.iflags & this.ienables);
    },
    stop: function() {
      this.state = STOPPED;
    },
    halt: function() {
      this.state = HALTED;
    },
    getF: function(value) {
      return (this.fz << 7) | (this.fn << 6) | (this.fh << 5) | (this.fc << 4);
    },
    setF: function(value) {
      this.fz = (value >> 7) & 1;
      this.fn = (value >> 6) & 1; 
      this.fh = (value >> 5) & 1; 
      this.fc = (value >> 4) & 1;
    }
  }

  return {
    create: function(memory) {
      var cpu = Object.create(proto);
      cpu.init(memory);
      return cpu;
    },
    irqvectors: irqvectors
  }
});
