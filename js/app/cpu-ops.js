define(['sprintf', './cpu-helpers'], function(sprintf, h) {
  "use strict"
  return {
    // 8-bit loads
    "ld r[y],r[z]": function(r1, r2) {
      var clocks = 4;
      if(h.type(r1) == "ind" || h.type(r2) == "ind")
        clocks = 8;
      return h.ld(r1, r2) +
        h.incClock(clocks);
    },
    "ld r[y],n": function(r) {
      return h.ld(r, {imm: 1}) +
        h.incClockOperand(r, {reg: 8, ind: 12});
    },
    "ld a,(bc)": 
      h.ld({reg: "a"}, {ind: "bc"}) + h.incClock(8),
    "ld a,(de)": 
      h.ld({reg: "a"}, {ind: "de"}) + h.incClock(8),
    "ld a,(nn)":
      h.ld({reg: "a"}, {ima: 1}) + h.incClock(16),
    "ld (bc),a": 
      h.ld({ind: "bc"}, {reg: "a"}) + h.incClock(8),
    "ld (de),a": 
      h.ld({ind: "de"}, {reg: "a"}) + h.incClock(8),
    "ld (nn),a":
      h.ld({ima: 1}, {reg: "a"}) + h.incClock(16),
    "ld (ff00+n),a": 
      h.input8({imm: 1}, "offset") +
      "var addr = (0xff00 + offset) & 0xffff;" +
      "this.memory.op(addr, false, this.a);" +
      h.incPc(2) + h.incClock(12),
    "ld a,(ff00+n)": 
      h.input8({imm: 1}, "offset") +
      "var addr = (0xff00 + offset) & 0xffff;" +
      "this.a = this.memory.op(addr, true, 0);" +
      h.incPc(2) + h.incClock(12),
    "ld (ff00+c),a": 
      h.input8({reg: "c"}, "offset") +
      "var addr = (0xff00 + offset) & 0xffff;" +
      "this.memory.op(addr, false, this.a);" +
      h.incPc(1) + h.incClock(8),
    "ld a,(ff00+c)": 
      h.input8({reg: "c"}, "offset") +
      "var addr = (0xff00 + offset) & 0xffff;" +
      "this.a = this.memory.op(addr, true, 0);" +
      h.incPc(1) + h.incClock(8),
    "ldi (hl),a": 
      h.ld({ind: "hl"}, {reg: "a"}) +
      h.ldInc16({reg16: "hl"}, 1) +
      h.incClock(8),
    "ldi a,(hl)": 
      h.ld({reg: "a"}, {ind: "hl"}) +
      h.ldInc16({reg16: "hl"}, 1) +
      h.incClock(8),
    "ldd (hl),a": 
      h.ld({ind: "hl"}, {reg: "a"}) +
      h.ldInc16({reg16: "hl"}, 65535) +
      h.incClock(8),
    "ldd a,(hl)": 
      h.ld({reg: "a"}, {ind: "hl"}) +
      h.ldInc16({reg16: "hl"}, 65535) +
      h.incClock(8),

    // 16-bit loads
    "ld rp[p],nn": function(rp) {
      return h.input16({imm16: 1}, "tmp") +
        h.output16(rp, "tmp") +
        h.incPc(3) + h.incClock(12);
    },
    "ld (nn),sp": 
      h.input16({reg16: "sp"}, "v") + 
      h.output16({ima16: 1}, "v") + 
      h.incPc(3) + h.incClock(20),
    "ld sp,hl":
      h.input16({reg16: "hl"}, "tmp") + 
      h.output16({reg16: "sp"}, "tmp") + 
      h.incPc(1) + h.incClock(8),
    "push rp2[p]": function(rp) {
      return h.push(rp) + h.incPc(1) + h.incClock(16);
    },
    "pop rp2[p]": function(rp) {
      return h.pop(rp) + h.incPc(1) + h.incClock(16);
    },

    // 8-bit arithmetic
    "alu[y] n": function(alu) {
      return h.aluOp(alu, {imm: 1});
    },
    "alu[y] r[z]": function(alu, r) {
      return h.aluOp(alu, r);
    },
    "inc r[y]": function(r) {
      return h.inc(r);
    },
    "dec r[y]": function(r) {
      return h.dec(r);
    },
    daa:
      "var diff = 0;" +
      "if(this.a > 0x99 || this.fc) diff |= 0x60;" +
      "if((this.a & 0x0f) > 0x09 || this.fh) diff |= 0x06;" +
      "this.fh = (this.a >> 4) & 1;" +
      "if(this.fn) this.a = (this.a + 0xff - diff) & 0xff;" +
      "else this.a = (this.a + diff) & 0xff;" +
      "this.fh = (this.fh ^ (this.a >> 4)) & 1;" +
      "this.fc = diff >> 6;" +
      h.setFlag("z", "this.a == 0") +
      h.incPc(1) + 
      h.incClock(4),
    cpl:
      h.input8({reg: "a"}, "tmp") +
      "tmp = tmp ^ 0xff;" +
      h.output8({reg: "a"}, "tmp") +
      "this.fn = 1; this.fh = 1;" +
      h.incPc(1) +
      h.incClock(4),

    // 16-bit arithmetic
    "add hl,rp[p]": function(rp) {
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
    "inc rp[p]": function(rp) {
      return h.inc16(rp);
    },
    "dec rp[p]": function(rp) {
      return h.dec16(rp);
    },
    "add sp,dd": 
      h.addToSp({reg16: "sp"}, {imm: 1}) +
      h.incClock(16),
    "ld hl,(sp+dd)": 
      h.addToSp({reg16: "hl"}, {imm: 1}) +
      h.incClock(12),

    // rotate and shift, singlebit
    rlca:
      h.rlc({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4),
    rla:
      h.rl({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4),
    rrca:
      h.rrc({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4),
    rra:
      h.rr({reg: "a"}) + "this.fz = 0;" + h.incPc(1) + h.incClock(4),
    "cb prefix":
      h.incPc(1) +
      h.incClock(0) +
      "var op = this.memory.op(this.pc, true, 0);" +
      "this.cbops[op]();",
    // cpu control
    ccf:
      "this.fc = this.fc ^ 1;" +
      "this.fn = 0;" +
      "this.fh = 0;" +
      h.incPc(1) + h.incClock(4),
    scf:
      "this.fc = 1;" +
      "this.fn = 0;" +
      "this.fh = 0;" +
      h.incPc(1) + h.incClock(4),
    nop: 
      h.incPc(1) + h.incClock(4),
    halt: "this.halt();" + h.incPc(1) + h.incClock(0),
    stop: "this.stop();" + h.incPc(2) + h.incClock(0), // 2 because opcode is 0x10 0x00?
    di: "this.ime = 0;" + h.incPc(1) + h.incClock(4),
    ei: "this.ime = 2;" + h.incPc(1) + h.incClock(4),

    // jumps
    "jp nn": 
      h.jp({imm16: 1}) + h.incClock(16),
    "jp hl": 
      h.jp({reg16: "hl"}) + h.incClock(4),
    "jp cc[y],nn": function(cc) {
      return h.cond(cc, 
        h.jp({imm16: 1}) + h.incClock(16),
        h.incPc(3) + h.incClock(12)
      );
    },
    "jr d": 
      h.jr({imm: 1}) + h.incClock(12),
    "jr cc[y-4],d": function(cc) {
      return h.cond(cc, 
        h.jr({imm: 1}) + h.incClock(12),
        h.incPc(2) + h.incClock(8)
      );
    },
    "call nn": 
      h.call({imm16: 1}) + h.incClock(24),
    "call cc[y],nn": function(cc) {
      return h.cond(cc, 
        h.call({imm16: 1}) + h.incClock(24),
        h.incPc(3) + h.incClock(12)
      );
    },
    ret: 
      h.ret() + h.incClock(16),
    "ret cc[y]": function(cc) {
      return h.cond(cc,
        h.ret() + h.incClock(20),
        h.incPc(1) + h.incClock(8)
      );
    },
    reti:
      h.ret() + "this.ime = 1;" + h.incClock(16),
    "rst y*8": function(addr) {
      return sprintf("this.pc = %d;", addr) +
        h.incClock(16);
    },

    // cb-prefixed
    "rot y,r[z]": function(rot, r) {
      return h.rotOp(rot, r);
    },
    "bit y,r[z]": function(bit, r) {
      return h.input8(r, "tmp") +
      h.setFlag("z", sprintf("(tmp >> %d) & 0x01 == 0", bit)) +
      "this.fn = 0;" +
      "this.fh = 1;" +
      h.incPc(1) +
      h.incClockOperand({reg: 8, ind: 12});
    },
    "res y,r[z]": function(bit, r) {
      return h.input8(r, "tmp") +
        sprintf("tmp &= ~(1 << %d);", bit) +
        h.output8(r, "tmp") +
        h.incPc(1) +
        h.incClockOperand({reg: 8, ind: 16});
    },
    "set y,r[z]": function(bit, r) {
      return h.input8(r, "tmp") +
        sprintf("tmp |= 1 << %d;", bit) +
        h.output8(r, "tmp") +
        h.incPc(1) +
        h.incClockOperand({reg: 8, ind: 16});
    },

    // undefined
    undef: "this.undef(); this.pc += 0; this.clock += 0;"
  }
});
