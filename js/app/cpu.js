define(['./cpu-isa', './event-manager', 'sprintf'], function(isa, evm, sprintf) {
  "use strict"

  var irqvectors = {
    VBLANK: 0,
    LCD: 1,
    TIMER: 2,
    SERIAL: 3,
    JOYPAD: 4
  };

  var states = {
    NORMAL: 0,
    IRQ: 1,
    HALTED: 2,
    STOPPED: 3
//    HDMA: 4 for GBC
  };

  var proto = {
    init: function(memory, evm) {
      this.clock = 0;

      this.memory = memory;
      this.evm = evm;

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

      this.ops = isa.generateOps();
      this.cbops = isa.generateCBOps();

      this.state = states.NORMAL;
    },
    advanceToEvent: function() {
      while(this.clock < this.evm.nextClock()) {
        switch(this.state) {
        case states.NORMAL:
          while(this.clock < this.evm.nextClock() && this.state == states.NORMAL) {
            var opcode = this.memory.read(this.pc);
            this.ops[opcode].call(this);
          }
          break;
        case states.IRQ:
          this.handleIrq();
          break;
        case states.HALTED:
          this.clock = this.evm.nextClock();
          break;
        case states.STOPPED:
          this.clock = this.evm.nextClock();
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
      this.state = states.NORMAL;
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
          // jump to handler
          this.pc = 0x0040 + i * 8;
          // 16-cycle interrupt latency (estimated)
          this.clock += 16;
          return;
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
      var irqs = this.iflags & this.ienables;
      if((this.ime || this.state == states.HALTED) && irqs) {
        this.state = states.IRQ;
      }
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
    halt: function() {
      this.state = states.HALTED;
    },
    stop: function() {
      this.state = states.STOPPED;
    },
    dump: function() {
      return sprintf("bc: %02x%02x de: %02x%02x af: %02x%02x hl: %02x%02x sp: %04x\n",
            this.b, this.c, this.d, this.e, this.a, this.getF(), this.h, this.l, this.sp) +
          sprintf("pc: %04x fz: %d fn: %d fh: %d fc: %d ime: %d if: %02x ie: %02x clock: %d",
            this.pc, this.fz, this.fn, this.fh, this.fc, this.ime, this.iflags, this.ienables, this.clock);
    }
  };

  return {
    create: function(memory, evm) {
      var cpu = Object.create(proto);
      cpu.init(memory, evm);
      return cpu;
    },
    irqvectors: irqvectors
  };

});
