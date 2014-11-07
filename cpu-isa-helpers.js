(function() {
  "use strict"
  JSGBC.CPUISAHelpers = {
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
        "this.pc = (this.pc + offset) & 0xffff;";
    },
    call: function(operand) {
      return this.input16({reg16: "sp"}, "addr") +
        "addr = (addr + 0xfffe) & 0xffff;" +
        this.output16({reg16: "sp"}, "addr") +
        this.input16({reg16: "pc"}, "ret") +
        "ret = (ret + 3) & 0xffff;" +
        this.output16({ind16: "sp"}, "ret") +
        this.input16(operand, "loc") +
        "this.pc = loc;";
    },
    ret: function() {
      return this.pop({reg16: "pc"});
    },
    // ALU operations
    aluOp: function(operator, operand) {
      var func;
      var setZero = this.setFlag("z", "tmp == 0");
      switch(operator) {
        case 0: // add a, operand
          func = this.add(operand);
          break;
        case 1: // adc a, operand
          func = this.adc(operand);
          break;
        case 2: // sub operand
          func = this.sub(operand);
          break;
        case 3: // sbc a, operand
          func = this.sbc(operand);
          break;
        case 4: // and operand
          func = this.and(operand);
          break;
        case 5: // xor operand
          func = this.xor(operand);
          break;
        case 6: // or operand
          func = this.or(operand);
          break;
        case 7: // cp operand
          func = this.cp(operand);
          break;
        default:
          throw("bad alu op");
      }
      return func + setZero + this.incPcOperand([operand]) +
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
        this.setFlag("h", "(sp & 0xfff) + (tmp & 0xfff) > 0xfff") +
        this.setFlag("c", "sp + tmp > 0xffff") +
        "tmp = (tmp & 0x80) ? (tmp | 0xff00) : tmp;" + // sign extension
        "sp = (sp + tmp) & 0xffff;" +
        "this.fz = 0;" + 
        "this.fn = 0;" +
        this.output16(dest, "sp") +
        this.incPcOperand([dest, src]);
    },
    // conditionals
    cond: function(condition, trueCode, falseCode) {
      switch(condition) {
        case 0: // nz
          return sprintf("if(this.fz == 0) {%s} else {%s}", trueCode, falseCode);
        case 1: // z
          return sprintf("if(this.fz != 0) {%s} else {%s}", trueCode, falseCode);
        case 2: // nc
          return sprintf("if(this.fc == 0) {%s} else {%s}", trueCode, falseCode);
        case 3: // c
          return sprintf("if(this.fc != 0) {%s} else {%s}", trueCode, falseCode);
        default: 
          throw("bad condition");
      }
    },
    // rotation/shift operations
    rotOp: function(operator, operand) {
      var func;
      switch(operator) {
        case 0: // rlc operand
          func = this.rlc(operand);
          break;
        case 1: // rrc operand
          func = this.rrc(operand);
          break;
        case 2: // rl operand
          func = this.rl(operand);
          break;
        case 3: // rr operand
          func = this.rr(operand);
          break;
        case 4: // sla operand
          func = this.sla(operand);
          break;
        case 5: // sra operand
          func = this.sra(operand);
          break;
        case 6: // swap operand
          func = this.swap(operand);
          break;
        case 7: // srl operand
          func = this.srl(operand);
          break;
        default:
          throw("bad alu op");
      }
      // flag behavior of rlc a and rlca (and similar) are different
      var setZero = this.setFlag("z", "tmp == 0");
      return func + setZero + this.incPc(1) +
        this.incClockOperand(operand, this.rotClocks);
    },
    rlc: function(operand) {
      return this.input8(operand, "tmp") +
        "this.fc = tmp >> 7;" +
        "tmp = (tmp << 1) | this.fc;" +
        this.output8(operand, "tmp") +
        "this.fh = 0;" +
        "this.fn = 0;";
    },
    rl: function(operand) {
      return this.input8(operand, "tmp") +
        "var bit = tmp >> 7;" +
        "tmp = (tmp << 1) | this.fc;" +
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
        "tmp = tmp << 1;" +
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
        "tmp = (tmp >> 4) | ((tmp & 0x0f) << 4)" +
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
      imm: 1,
      imm16: 2,
      ima: 2,
      ima16: 2,
      reg: 0,
      reg16: 0,
      ind: 0,
      ind16: 0
    },
    input8: function(src, name) {
      if("imm" in src) {
        return sprintf("var %s = this.memory.op(this.pc + %d, true, 0);", name, src.imm);
      }
      if("ima" in src) {
        return sprintf("var %s = this.memory.op(this.memory.op16(this.pc + %d, true, 0), true, 0);", name, src.ima);
      }
      if("reg" in src) {
        if(src.reg == "f") {
          return sprintf("var %s = this.getF();", name);
        }
        return sprintf("var %s = this.%s;", name, src.reg);
      }
      if("ind" in src) {
        return sprintf("%s var %s = this.memory.op(%s_ind_addr, true, 0);", 
            this.input16({reg16: src.ind}, name + "_ind_addr"), name, name);
      }
      throw("Invalid 8-bit src");
    },
    input16: function(src, name) {
      if("imm16" in src) {
        return sprintf("var %s = this.memory.op16(this.pc + %d, true, 0);", name, src.imm16);
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
        return sprintf("var %s = this.memory.op16(this.memory.op16(this.pc + %d, true, 0), true, 0);", name, src.ima16);
      }
      if("ind16" in src) {
        return sprintf("%s var %s = this.memory.op16(%s_ind16_addr, true, 0);", 
            this.input16({reg16: src.ind16}, name + "_ind16_addr"), name, name);
      }
      throw("Invalid 16-bit src");
    },
    output8: function(dest, name) {
      if("ima" in dest) {
        return sprintf("this.memory.op(this.memory.op16(this.pc + %d, true, 0), false, %s);", dest.ima, name);
      }
      if("reg" in dest) {
        if(dest.reg == "f") {
          return sprintf("this.setF(%s);", name);
        }
        return sprintf("this.%s = %s;", dest.reg, name);
      }
      if("ind" in dest) {
        return sprintf("%s this.memory.op(%s_ind_addr, false, %s);", 
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
        return sprintf("this.memory.op16(this.memory.op16(this.pc + %d, true, 0), false, %s);", dest.ima16, name);
      }
      if("ind16" in dest) {
        return sprintf("%s this.memory.op16(%s_ind16_addr, false, %s);", 
            this.input16({reg16: dest.ind16}, name + "_ind16_addr"), name, name);
      }
      throw("Invalid 16-bit dest");
    },
    setFlag: function(flag, cond) {
      return sprintf("this.f%s = (%s) ? 1 : 0;", flag, cond);
    },
    incPc: function(lengths) {
      return sprintf("this.pc = (this.pc + %d) & 0xffff;", lengths);
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
    }
  }
)}();
