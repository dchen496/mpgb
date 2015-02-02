define(['sprintf', './cpu-ops', './cpu-decoder'], function(sprintf, ops, decoder) {
  "use strict"

  var proto = {
    init: function(mem) {
      this.mem = mem;
    },

    disasmRange: function(start, end) {
      var pc = start;
      var res = [];
      while(pc < end) {
        var v = this.disasm(pc & 0xffff);
        res.push({addr: pc, ds: v.ds, len: v.len});
        pc += v.len;
      }
      return res;
    },

    disasm: function(pc) {
      var opcode = this.mem.read(pc);
      var instruction = decoder.getInstruction(opcode);
      var op = ops.ops[instruction[0]];
      var args = [this.mem, pc].concat(instruction.slice(1));
      var res = (op.ds == null) ? instruction[0] : op.ds.apply(this, args);
      return {ds: res, len: op.len == null ? 1 : op.len};
    },

    disasmCB: function(mem, pc) {
      var opcode = mem.read(pc+1);
      var instruction = decoder.getCBInstruction(opcode);
      var op = ops.cbOps[instruction[0]];
      var args = [mem, pc].concat(instruction.slice(1));
      return op.ds.apply(this, args);
    }
  }

  return {
    create: function(mem) {
      var ds = Object.create(proto);
      ds.init(mem);
      return ds;
    }
  };
});
