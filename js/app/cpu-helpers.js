define(['sprintf', './cpu-decoder'], function(sprintf, decoder) {
  "use strict"
  return {
    // code generation helpers
    // loads
    ld: function(dest, src) {
      return this.input8(src, "tmp") +
        this.output8(dest, "tmp") + 
        this.incPcOperand([src, dest]);
    },
    ldInc16: function(operand, increment) {
      return this.input16(operand, "tmp") +
        sprintf("tmp = (tmp + %d) & 0xffff;", increment) +
        this.output16(operand, "tmp");
    },
    // stack
    push: function(operand) {
      return this.input16({reg16: "sp"}, "addr") +
        "addr = (addr + 0xfffe) & 0xffff;" +
        this.output16({reg16: "sp"}, "addr") +
        this.input16(operand, "val") +
        this.output16({ind16: "sp"}, "val");
    },
    pop: function(operand) {
      return this.input16({ind16: "sp"}, "val") +
        this.output16(operand, "val") +
        this.input16({reg16: "sp"}, "addr") +
        "addr = (addr + 2) & 0xffff;" +
        this.output16({reg16: "sp"}, "addr");
    },
    // jumps
    jp: function(operand) {
      return this.input16(operand, "loc") +
        "this.pc = loc;";
    },
    jr: function(operand) {
      return this.input8(operand, "offset") +
        "offset = (offset & 0x80) ? (offset | 0xff00) : offset;" + // sign extension
        this.incPcOperand([operand]) +
        "this.pc = (this.pc + offset) & 0xffff;";
    },
    pushPc: function(offset) {
      return this.input16({reg16: "sp"}, "addr") +
        "addr = (addr + 0xfffe) & 0xffff;" +
        this.output16({reg16: "sp"}, "addr") +
        this.input16({reg16: "pc"}, "ret") +
        sprintf("ret = (ret + %d) & 0xffff;", offset) +
        this.output16({ind16: "sp"}, "ret");
    },
    call: function(operand) {
      return this.pushPc(3) + 
        this.input16(operand, "loc") +
        "this.pc = loc;";
    },
    rst: function(addr) {
      return this.pushPc(1) + 
        sprintf("this.pc = %d;", addr);
    },
    ret: function() {
      return this.pop({reg16: "pc"});
    },
    // ALU operations
    aluOp: function(operator, operand) {
      var func;
      if(decoder.tables.alu.indexOf(operator) < 0) {
        throw("bad alu op " + operator);
      }
      return this[operator](operand) + 
        this.setFlag("z", "tmp == 0") + 
        this.incPcOperand([operand]) +
        this.incClockOperand(operand, this.aluClocks);
    },
    aluClocks: {
      imm: 8, 
      reg: 4,
      ind: 8
    },
    add: function(operand) {
      return this.input8(operand, "tmp") + 
        this.setFlag("h", "(this.a & 0xf) + (tmp & 0xf) > 0xf") +
        "tmp += this.a;" +
        "this.fc = tmp >> 8;" +
        "tmp &= 0xff;" +
        "this.fn = 0;" +
        "this.a = tmp;";
    },
    sub: function(operand) {
      return this.input8(operand, "tmp") + 
        this.setFlag("h", "(this.a & 0xf) - (tmp & 0xf) < 0") +
        "tmp = this.a - tmp;" +
        "if(tmp < 0) { this.fc = 1; tmp += 0x100; } else { this.fc = 0; }" +
        "this.fn = 1;" +
        "this.a = tmp;";
    },
    adc: function(operand) {
      return this.input8(operand, "tmp") + 
        this.setFlag("h", "(this.a & 0xf) + (tmp & 0xf) + this.fc > 0xf") +
        "tmp += this.a + this.fc;" +
        "this.fc = tmp >> 8;" +
        "tmp &= 0xff;" +
        "this.fn = 0;" +
        "this.a = tmp;";
    },
    sbc: function(operand) {
      return this.input8(operand, "tmp") + 
        this.setFlag("h", "(this.a & 0xf) - (tmp & 0xf) - this.fc < 0") +
        "tmp = this.a - tmp - this.fc;" +
        "if(tmp < 0) { this.fc = 1; tmp += 0x100; } else { this.fc = 0; }" +
        "this.fn = 1;" +
        "this.a = tmp;";
    },
    and: function(operand) {
      return this.input8(operand, "tmp") + 
        "tmp &= this.a;" +
        "this.fh = 1;" +
        "this.fc = 0;" +
        "this.fn = 0;" +
        "this.a = tmp;";
    },
    xor: function(operand) {
      return this.input8(operand, "tmp") + 
        "tmp ^= this.a;" +
        "this.fh = 0;" +
        "this.fc = 0;" +
        "this.fn = 0;" +
        "this.a = tmp;";
    },
    or: function(operand) {
      return this.input8(operand, "tmp") + 
        "tmp |= this.a;" +
        "this.fh = 0;" +
        "this.fc = 0;" +
        "this.fn = 0;" +
        "this.a = tmp;";
    },
    cp: function(operand) {
      return this.input8(operand, "tmp") + 
        this.setFlag("h", "(this.a & 0xf) - (tmp & 0xf) < 0") +
        "tmp = this.a - tmp;" +
        "if(tmp < 0) { this.fc = 1; tmp += 0x100; } else { this.fc = 0; }" +
        "this.fn = 1;";
    },
    inc: function(operand) {
      return this.input8(operand, "tmp") +
        this.setFlag("h", "(tmp & 0xf) + 1 > 0xf") +
        "tmp = (tmp + 1) & 0xff;" +
        this.output8(operand, "tmp") +
        this.setFlag("z", "tmp == 0") +
        "this.fn = 0;" +
        this.incPcOperand([operand]) +
        this.incClockOperand(operand, this.incClocks);
    },
    dec: function(operand) {
      return this.input8(operand, "tmp") +
        this.setFlag("h", "(tmp & 0xf) - 1 < 0") +
        "tmp = (tmp + 0xff) & 0xff;" +
        this.output8(operand, "tmp") +
        this.setFlag("z", "tmp == 0") +
        "this.fn = 1;" +
        this.incPcOperand([operand]) +
        this.incClockOperand(operand, this.incClocks);
    },
    incClocks: {
      reg: 4,
      ind: 12
    },
    inc16: function(operand) {
      return this.input16(operand, "tmp") +
        "tmp = (tmp + 1) & 0xffff;" +
        this.output16(operand, "tmp") +
        this.incPcOperand([operand]) +
        this.incClock(8);
    },
    dec16: function(operand) {
      return this.input16(operand, "tmp") +
        "tmp = (tmp + 0xffff) & 0xffff;" +
        this.output16(operand, "tmp") +
        this.incPcOperand([operand]) +
        this.incClock(8);
    },
    addToSp: function(dest, src) {
      return this.input8(src, "tmp") +
        this.input16({reg16: "sp"}, "sp") + 
        // h and c flags set using unsigned addition (ie. before sign extension)
        //this.setFlag("h", "(sp & 0xfff) + (tmp & 0xfff) > 0xfff") +
        this.setFlag("h", "(sp & 0xf) + (tmp & 0xf) > 0xf") +
        //this.setFlag("c", "sp + tmp > 0xffff") +
        this.setFlag("c", "(sp & 0xff) + tmp > 0xff") +
        "tmp = (tmp & 0x80) ? (tmp - 0x100) : tmp;" + // sign extension
        "sp = (sp + tmp) & 0xffff;" +
        "this.fz = 0;" + 
        "this.fn = 0;" +
        this.output16(dest, "sp") +
        this.incPcOperand([dest, src]);
    },
    // conditionals
    cond: function(condition, trueCode, falseCode) {
      var conds = {
        "nz" : "this.fz == 0",
        "z" : "this.fz != 0",
        "nc" : "this.fc == 0",
        "c" : "this.fc != 0"
      }
      if(conds[condition] == null) {
        throw("bad condition " + condition);
      }
      return sprintf("if(%s) {%s} else {%s}", conds[condition], trueCode, falseCode);
    },
    // rotation/shift operations
    rotOp: function(operator, operand) {
      var rots = ["rlc", "rrc", "rl", "rr", "sla", "sra", "swap", "srl"];
      // flag behavior of rlc a and rlca (and similar) are different
      return this[rots[operator]](operand) + 
        this.setFlag("z", "tmp == 0") +
        this.incPc(2) +
        this.incClockOperand(operand, this.rotClocks);
    },
    rlc: function(operand) {
      return this.input8(operand, "tmp") +
        "this.fc = tmp >> 7;" +
        "tmp = ((tmp << 1) | this.fc) & 0xff;" +
        this.output8(operand, "tmp") +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    rl: function(operand) {
      return this.input8(operand, "tmp") +
        "var bit = tmp >> 7;" +
        "tmp = ((tmp << 1) | this.fc) & 0xff;" +
        this.output8(operand, "tmp") +
        "this.fc = bit;" +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    rrc: function(operand) {
      return this.input8(operand, "tmp") +
        "this.fc = tmp & 0x01;" +
        "tmp = (tmp >> 1) | (this.fc << 7);" +
        this.output8(operand, "tmp") +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    rr: function(operand) {
      return this.input8(operand, "tmp") +
        "var bit = tmp & 0x01;" +
        "tmp = (tmp >> 1) | (this.fc << 7);" +
        this.output8(operand, "tmp") +
        "this.fc = bit;" +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    sla: function(operand) {
      return this.input8(operand, "tmp") +
        "this.fc = tmp >> 7;" +
        "tmp = (tmp << 1) & 0xff;" +
        this.output8(operand, "tmp") +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    sra: function(operand) {
      return this.input8(operand, "tmp") +
        "this.fc = tmp & 0x01;" +
        "tmp = (tmp >> 1) | (tmp & 0x80);" +
        this.output8(operand, "tmp") +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    swap: function(operand) {
      return this.input8(operand, "tmp") +
        "tmp = (tmp >> 4) | ((tmp & 0x0f) << 4);" +
        this.output8(operand, "tmp") +
        "this.fc = 0;" +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    srl: function(operand) {
      return this.input8(operand, "tmp") +
        "this.fc = tmp & 0x01;" +
        "tmp = tmp >> 1;" +
        this.output8(operand, "tmp") +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    rotClocks: {
      reg: 8,
      ind: 16
    },
    // ** other instructions
    // ** misc generation functions
    // imm: immediate 8-bit value (in)
    // imm16: immediate 16-bit value (in)
    // ima: indirect 8-bit through immediate address (in, out)
    // ima16: indirect 16-bit through immediate address (in, out)
    // reg: register 8-bit (in, out)
    // reg16: register pair 16-bit (in, out)
    // ind: indirect 8-bit through register pair (in, out)
    // ind16: indirect 16-bit through register pair (in, out)
    operandLens: {
      imm: 1, imm16: 2,
      ima: 2, ima16: 2,
      reg: 0, reg16: 0,
      ind: 0, ind16: 0
    },
    input8: function(src, name) {
      if("imm" in src) {
        return sprintf("var %s = this.memory.read(this.pc + %d);", name, src.imm);
      }
      if("ima" in src) {
        return sprintf("var %s = this.memory.read(this.memory.read16(this.pc + %d));", name, src.ima);
      }
      if("reg" in src) {
        if(src.reg == "f") {
          return sprintf("var %s = this.getF();", name);
        }
        return sprintf("var %s = this.%s;", name, src.reg);
      }
      if("ind" in src) {
        return sprintf("%s var %s = this.memory.read(%s_ind_addr);", 
            this.input16({reg16: src.ind}, name + "_ind_addr"), name, name);
      }
      throw("Invalid 8-bit src");
    },
    input16: function(src, name) {
      if("imm16" in src) {
        return sprintf("var %s = this.memory.read16(this.pc + %d);", name, src.imm16);
      }
      if("reg16" in src) {
        switch(src.reg16) {
          case "af":
            return sprintf("var %s = (this.a << 8) | this.getF();", name);
          case "bc":
          case "de":
          case "hl":
            return sprintf("var %s = (this.%s << 8) | this.%s;", name, src.reg16[0], src.reg16[1]);
          default:
            return sprintf("var %s = this.%s;", name, src.reg16);
        }
      }
      if("ima16" in src) {
        return sprintf("var %s = this.memory.read16(this.memory.read16(this.pc + %d));", name, src.ima16);
      }
      if("ind16" in src) {
        return sprintf("%s var %s = this.memory.read16(%s_ind16_addr);", 
            this.input16({reg16: src.ind16}, name + "_ind16_addr"), name, name);
      }
      throw("Invalid 16-bit src");
    },
    output8: function(dest, name) {
      if("ima" in dest) {
        return sprintf("this.memory.write(this.memory.read16(this.pc + %d), %s);", dest.ima, name);
      }
      if("reg" in dest) {
        if(dest.reg == "f") {
          return sprintf("this.setF(%s);", name);
        }
        return sprintf("this.%s = %s;", dest.reg, name);
      }
      if("ind" in dest) {
        return sprintf("%s this.memory.write(%s_ind_addr, %s);", 
            this.input16({reg16: dest.ind}, name + "_ind_addr"), name, name);
      }
      throw("Invalid 8-bit dest");
    },
    output16: function(dest, name) {
      if("reg16" in dest) {
        switch(dest.reg16) {
          case "af":
            return sprintf("this.a = (%s >> 8) & 0xff; this.setF(%s & 0xff);", name, name);
          case "bc":
          case "de":
          case "hl":
            return sprintf("this.%s = (%s >> 8) & 0xff; this.%s = %s & 0xff;", dest.reg16[0], name, dest.reg16[1], name);
        }
        return sprintf("this.%s = %s;", dest.reg16, name);
      }
      if("ima16" in dest) {
        return sprintf("this.memory.write16(this.memory.read16(this.pc + %d), %s);", dest.ima16, name);
      }
      if("ind16" in dest) {
        return sprintf("%s this.memory.write16(%s_ind16_addr, %s);", 
            this.input16({reg16: dest.ind16}, name + "_ind16_addr"), name, name);
      }
      throw("Invalid 16-bit dest");
    },
    setFlag: function(flag, cond) {
      return sprintf("this.f%s = (%s) ? 1 : 0;", flag, cond);
    },
    incPc: function(length) {
      return sprintf("this.pc = (this.pc + %d) & 0xffff;", length);
    },
    incClock: function(clocks) {
      return sprintf("this.clock += %d;", clocks);
    },
    incPcOperand: function(operands) {
      var len = 1;
      for(var i in operands) {
        var operand = operands[i];
        len += this.operandLens[Object.keys(operand)[0]];
      }
      return this.incPc(len);
    },
    incClockOperand: function(operand, clocks) {
      var clock = clocks[Object.keys(operand)[0]];
      return this.incClock(clock);
    },
    type: function(operand) {
      return Object.keys(operand)[0];
    },
    getOperatorName: function(reg) { 
      if(reg.reg != null) {
        return reg.reg;
      }
      if(reg.reg16 != null) {
        return reg.reg16;
      }
      if(reg.ind != null) {
        return sprintf("(%s)", reg.ind);
      }
      throw("bad operand " + reg);
    },
    signExtend: function(n) {
      return (n & 0x80) ? n - 0x100 : n;
    },
    dump: function(str) {
      return sprintf("console.log(\"%s\", this.dump());", str);
    }
  }
});
