define(['sprintf', './cpu-helpers'], function(sprintf, h) {
  "use strict"

  var gon = h.getOperatorName;

  var ops = {
    // 8-bit loads
    "ld r[y],r[z]": {
      op: function(r1, r2) {
        var clocks = 4;
        if(h.type(r1) == "ind" || h.type(r2) == "ind")
          clocks = 8;
        return h.ld(r1, r2) + h.incClock(clocks);
      },
      ds: function(mem, pc, r1, r2) {
        return sprintf("ld %s,%s", gon(r1), gon(r2));
      }
    },
    "ld r[y],n": {
      op: function(r) {
        return h.ld(r, {imm: 1}) +
          h.incClockOperand(r, {reg: 8, ind: 12});
      },
      ds: function(mem, pc, r) {
      return sprintf("ld %s,#%02x", gon(r), mem.read(pc+1));
      },
      len: 2
    },
    "ld a,(bc)": {
      op: h.ld({reg: "a"}, {ind: "bc"}) + h.incClock(8)
    },
    "ld a,(de)": {
      op: h.ld({reg: "a"}, {ind: "de"}) + h.incClock(8)
    },
    "ld a,(nn)": {
      op: h.ld({reg: "a"}, {ima: 1}) + h.incClock(16),
      ds: function(mem, pc) {
        return sprintf("ld a,(#%04x)", mem.read16(pc+1));
      },
      len: 3
    },
    "ld (bc),a": {
      op: h.ld({ind: "bc"}, {reg: "a"}) + h.incClock(8)
    },
    "ld (de),a": {
      op: h.ld({ind: "de"}, {reg: "a"}) + h.incClock(8)
    },
    "ld (nn),a": {
      op: h.ld({ima: 1}, {reg: "a"}) + h.incClock(16),
      ds: function(mem, pc) {
        return sprintf("ld (#%04x),a", mem.read16(pc+1));
      },
      len: 3
    },
    "ld (ff00+n),a": {
      op: h.input8({imm: 1}, "offset") +
        "var addr = (0xff00 + offset) & 0xffff;" +
        "this.memory.write(addr, this.a);" +
        h.incPc(2) + h.incClock(12),
      ds: function(mem, pc) {
        return sprintf("ld (ff00+#%02x),a", mem.read(pc+1));
      },
      len: 2
    },
    "ld a,(ff00+n)": {
      op: h.input8({imm: 1}, "offset") +
        "var addr = (0xff00 + offset) & 0xffff;" +
        "this.a = this.memory.read(addr);" +
        h.incPc(2) + h.incClock(12),
      ds: function(mem, pc) {
        return sprintf("ld a,(ff00+#%02x)", mem.read(pc+1));
      },
      len: 2
    },
    "ld (ff00+c),a": {
      op: h.input8({reg: "c"}, "offset") +
        "var addr = (0xff00 + offset) & 0xffff;" +
        "this.memory.write(addr, this.a);" +
        h.incPc(1) + h.incClock(8)
    },
    "ld a,(ff00+c)": {
      op: h.input8({reg: "c"}, "offset") +
        "var addr = (0xff00 + offset) & 0xffff;" +
        "this.a = this.memory.read(addr);" +
        h.incPc(1) + h.incClock(8)
    },
    "ldi (hl),a": {
      op: h.ld({ind: "hl"}, {reg: "a"}) +
        h.ldInc16({reg16: "hl"}, 1) +
        h.incClock(8)
    },
    "ldi a,(hl)": {
      op: h.ld({reg: "a"}, {ind: "hl"}) +
        h.ldInc16({reg16: "hl"}, 1) +
        h.incClock(8)
    },
    "ldd (hl),a": {
      op: h.ld({ind: "hl"}, {reg: "a"}) +
        h.ldInc16({reg16: "hl"}, 65535) +
        h.incClock(8)
    },
    "ldd a,(hl)": {
      op: h.ld({reg: "a"}, {ind: "hl"}) +
        h.ldInc16({reg16: "hl"}, 65535) +
        h.incClock(8)
    },

    // 16-bit loads
    "ld rp[p],nn": {
      op: function(rp) {
        return h.input16({imm16: 1}, "tmp") +
          h.output16(rp, "tmp") +
          h.incPc(3) + h.incClock(12);
      },
      ds: function(mem, pc, rp) {
        return sprintf("ld %s,#%04x", gon(rp), mem.read16(pc+1));
      },
      len: 3
    },
    "ld (nn),sp": {
      op: h.input16({reg16: "sp"}, "v") + 
        h.output16({ima16: 1}, "v") + 
        h.incPc(3) + h.incClock(20),
      ds: function(mem, pc) {
        return sprintf("ld (#%04x),sp", mem.read16(pc+1));
      },
      len: 3
    },
    "ld sp,hl": {
      op: h.input16({reg16: "hl"}, "tmp") + 
        h.output16({reg16: "sp"}, "tmp") + 
        h.incPc(1) + h.incClock(8)
    },
    "push rp2[p]": {
      op: function(rp) {
        return h.push(rp) + h.incPc(1) + h.incClock(16);
      },
      ds: function(mem, pc, rp) {
        return sprintf("push %s", gon(rp));
      }
    },
    "pop rp2[p]": {
      op: function(rp) {
        return h.pop(rp) + h.incPc(1) + h.incClock(16);
      },
      ds: function(mem, pc, rp) {
        return sprintf("pop %s", gon(rp));
      }
    },

    // 8-bit arithmetic
    "alu[y] n": {
      op: function(alu) {
        return h.aluOp(alu, {imm: 1});
      },
      ds: function(mem, pc, alu) {
        return sprintf("%s #%02x", alu, mem.read(pc+1));
      },
      len: 2
    },
    "alu[y] r[z]": {
      op: function(alu, r) {
        return h.aluOp(alu, r);
      },
      ds: function(mem, pc, alu, r) {
        return sprintf("%s %s", alu, gon(r));
      }
    },
    "inc r[y]": {
      op: function(r) {
        return h.inc(r);
      },
      ds: function(mem, pc, r) {
        return sprintf("inc %s", gon(r));
      }
    },
    "dec r[y]": {
      op: function(r) {
        return h.dec(r);
      },
      ds: function(mem, pc, r) {
        return sprintf("dec %s", gon(r));
      }
    },
    "daa": {
      op: "this.daa();" + h.incPc(1) + h.incClock(4)
    },
    "cpl": {
      op: h.input8({reg: "a"}, "tmp") +
        "tmp = tmp ^ 0xff;" +
        h.output8({reg: "a"}, "tmp") +
        "this.fn = 1; this.fh = 1;" +
        h.incPc(1) +
        h.incClock(4)
    },

    // 16-bit arithmetic
    "add hl,rp[p]": {
      op: function(rp) {
        return h.input16(rp, "tmp") +
          h.input16({reg16: "hl"}, "hl") +
          h.setFlag("h", "(hl & 0xfff) + (tmp & 0xfff) > 0xfff") +
          "tmp += hl;" +
          "this.fc = tmp >> 16;" +
          "tmp &= 0xffff;" +
          "this.fn = 0;" +
          h.output16({reg16: "hl"}, "tmp") +
          h.incPc(1) + h.incClock(8);
      },
      ds: function(mem, pc, rp) {
        return sprintf("add hl,%s", gon(rp));
      }
    },
    "inc rp[p]": {
      op: function(rp) {
        return h.inc16(rp);
      },
      ds: function(mem, pc, rp) {
        return sprintf("inc %s", gon(rp));
      }
    },
    "dec rp[p]": {
      op: function(rp) {
        return h.dec16(rp);
      },
      ds: function(mem, pc, rp) {
        return sprintf("dec %s", gon(rp));
      }
    },
    "add sp,d": {
      op: h.addToSp({reg16: "sp"}, {imm: 1}) +
        h.incClock(16),
      ds: function(mem, pc) {
        var d = h.signExtend(mem.read(pc+1));
        return sprintf("add sp,#%+02x", d);
      },
      len: 2
    },
    "ld hl,(sp+d)": {
      op: h.addToSp({reg16: "hl"}, {imm: 1}) +
        h.incClock(12),
      ds: function(mem, pc) {
        var d = h.signExtend(mem.read(pc+1));
        return sprintf("ld hl,(sp+#%+02x)", d);
      },
      len: 2
    },

    // rotate and shift, singlebit
    "rlca": {
      op: h.rlc({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4)
    },
    "rla": {
      op: h.rl({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4)
    },
    "rrca": {
      op: h.rrc({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4)
    },
    "rra": {
      op: h.rr({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4)
    },
    "cb prefix": {
      op: h.incPc(0) + h.incClock(0) +
        "var op = this.memory.read(this.pc+1);" +
        "this.cbops[op].call(this);",
      ds: function(mem, pc) {
        return this.disasmCB(mem, pc);
      },
      len: 2
    },

    // cpu control
    "ccf": {
      op: "this.fc = this.fc ^ 1;" +
        "this.fn = 0;" +
        "this.fh = 0;" +
        h.incPc(1) + h.incClock(4)
    },
    "scf": {
      op: "this.fc = 1;" +
        "this.fn = 0;" +
        "this.fh = 0;" +
        h.incPc(1) + h.incClock(4)
    },
    "nop": {
      op: h.incPc(1) + h.incClock(4)
    },
    "halt": {
      op: "this.halt();" + h.incPc(1) + h.incClock(0)
    },
    "stop": {
      op: "this.stop();" + h.incPc(2) + h.incClock(0), 
      // 2 because opcode is 0x10 0x00?
      len: 2
    },
    "di": {
      op: "this.di();" + h.incPc(1) + h.incClock(4)
    },
    "ei": {
      op: "this.ei();" + h.incPc(1) + h.incClock(4)
    },

    // jumps
    "jp nn": {
      op: h.jp({imm16: 1}) + h.incClock(16),
      ds: function(mem, pc) {
        return sprintf("jp #%04x", mem.read16(pc+1));
      },
      len: 3
    },
    "jp hl": {
      op: h.jp({reg16: "hl"}) + h.incClock(4),
    },
    "jp cc[y],nn": {
      op: function(cc) {
        return h.cond(cc, 
          h.jp({imm16: 1}) + h.incClock(16),
          h.incPc(3) + h.incClock(12)
        );
      },
      ds: function(mem, pc, cc) {
        return sprintf("jp %s,#%04x", cc, mem.read16(pc+1));
      },
      len: 3
    },
    "jr d": {
      op: h.jr({imm: 1}) + h.incClock(12),
      ds: function(mem, pc) {
        var d = h.signExtend(mem.read(pc+1));
        var target = (pc + d + 2 + 0x10000) & 0xffff;
        return sprintf("jr #%+02x=%04x", d, target);
      },
      len: 2
    },
    "jr cc[y-4],d": {
      op: function(cc) {
        return h.cond(cc, 
          h.jr({imm: 1}) + h.incClock(12),
          h.incPc(2) + h.incClock(8)
        );
      },
      ds: function(mem, pc, cc) {
        var d = h.signExtend(mem.read(pc+1));
        var target = (pc + d + 2 + 0x10000) & 0xffff;
        return sprintf("jr %s,#%+02x=%04x", cc, d, target);
      },
      len: 2
    },
    "call nn": {
      op: h.call({imm16: 1}) + h.incClock(24),
      ds: function(mem, pc) {
        return sprintf("call #%04x", mem.read16(pc+1));
      },
      len: 3
    },
    "call cc[y],nn": {
      op: function(cc) {
        return h.cond(cc, 
          h.call({imm16: 1}) + h.incClock(24),
          h.incPc(3) + h.incClock(12)
        );
      },
      ds: function(mem, pc, cc) {
        return sprintf("call %s,#%04x", cc, mem.read16(pc+1));
      },
      len: 3
    },
    "ret": {
      op: h.ret() + h.incClock(16)
    },
    "ret cc[y]": {
      op: function(cc) {
        return h.cond(cc,
          h.ret() + h.incClock(20),
          h.incPc(1) + h.incClock(8)
        );
      },
      ds: function(mem, pc, cc) {
        return sprintf("ret %s", cc);
      }
    },
    "reti": {
      op: h.ret() + "this.ei();" + h.incClock(16)
    },
    "rst y*8": {
      op: function(addr) {
        return h.rst(addr);
      },
      ds: function(mem, pc, addr) {
        return sprintf("rst #%02x", addr);
      }
    },

    // undefined
    "undef": {
      op: "this.undef(); this.pc += 0; this.clock += 0;"
    }
  };

  var cbOps = {
    // cb-prefixed operations
    "rot y,r[z]": {
      op: function(rot, r) {
        return h.rotOp(rot, r);
      },
      ds: function(mem, pc, rot, r) {
        return sprintf("rot %s,%s", rot, gon(r));
      }
    },
    "bit y,r[z]": {
      op: function(bit, r) {
        return h.input8(r, "tmp") +
        h.setFlag("z", sprintf("(tmp & (1 << %d)) == 0", bit)) +
        "this.fn = 0;" +
        "this.fh = 1;" +
        h.incPc(2) +
        h.incClockOperand(r, {reg: 8, ind: 12});
      },
      ds: function(mem, pc, bit, r) {
        return sprintf("bit %d,%s", bit, gon(r));
      }
    },
    "res y,r[z]": {
      op: function(bit, r) {
        return h.input8(r, "tmp") +
          sprintf("tmp &= ~(1 << %d);", bit) +
          h.output8(r, "tmp") +
          h.incPc(2) +
          h.incClockOperand(r, {reg: 8, ind: 16});
      },
      ds: function(mem, pc, bit, r) {
        return sprintf("res %d,%s", bit, gon(r));
      }
    },
    "set y,r[z]": {
      op: function(bit, r) {
        return h.input8(r, "tmp") +
          sprintf("tmp |= 1 << %d;", bit) +
          h.output8(r, "tmp") +
          h.incPc(2) +
          h.incClockOperand(r, {reg: 8, ind: 16});
      },
      ds: function(mem, pc, bit, r) {
        return sprintf("set %d,%s", bit, gon(r));
      }
    }
  };

  return {
    ops: ops,
    cbOps: cbOps
  };
});
