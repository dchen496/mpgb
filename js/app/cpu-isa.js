define(['sprintf', './cpu-ops', './cpu-decoder'], function(sprintf, ops, decoder) {
  "use strict"
  return {
    generateOpStr: function(i) {
      var decoded = decoder.getInstruction(i);
      if(decoded.length == 1) {
        return ops.ops[decoded[0]].op;
      }
      return ops.ops[decoded[0]].op.apply(this, decoded.slice(1));
    },
    generateCBOpStr: function(i) {
      var decoded = decoder.getCBInstruction(i);
      if(decoded.length == 1) {
        return ops.cbOps[decoded[0]].op;
      }
      return ops.cbOps[decoded[0]].op.apply(this, decoded.slice(1));
    },

    generateOps: function() {
      var ops = Array(256);
      for(var i = 0; i < 256; i++) {
        ops[i] = Function(this.generateOpStr(i));
      }
      return instructions;
    },
    generateCBOps: function() {
      var ops = Array(256);
      for(var i = 0; i < 256; i++) {
        ops[i] = Function(this.generateCBOpStr(i));
      }
      return instructions;
    },

    test: function() {
      return this.testGenOpStrs();
    },
    testGenOpStrs: function() {
      var x = 0;
      var pass = true;
      for(var i = 0; i < 256; i++) {
        var func = this.generateOpStr(i);
        if(func != null) {
          //console.log(func);
          if(func.indexOf("this.pc +=") === -1 && func.indexOf("this.pc =") === -1) {
            console.log("pc undefined for instruction", i, func);
            pass = false;
          }
          if(func.indexOf("this.clock +=") === -1) {
            console.log("clock undefined for instruction", i, func);
            pass = false;
          }
          try {
            Function(func);
            x++;
          } catch(e) {
            console.log("compile error:", i, e, func);
          }
        } else {
          console.log("instruction undefined", i);
        }
      }
      console.log(x, "of 256 instructions defined", x / 256.0 * 100.0, "%");
      return pass && x == 256;
    },
    debugGetFormattedOps: function() {
      var out = [];
      for(var i = 0; i < 256; i++) {
        var info = decoder.getInstruction(i);
        var func = this.generateOpStr(i);
        var wrapped = sprintf("// %s \nfunction op%d { %s }", JSON.stringify(info), i, func);
        out.push(wrapped);
      }
      return out.join("\n");
    }
  }
});
