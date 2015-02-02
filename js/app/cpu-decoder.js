define(function() {
  "use strict"
  // operand tables
  var r = [ // r
    {reg: "b"}, 
    {reg: "c"}, 
    {reg: "d"}, 
    {reg: "e"}, 
    {reg: "h"}, 
    {reg: "l"},
    {ind: "hl"},
    {reg: "a"}
  ];
  var rp = [ // rp
    {reg16: "bc"},
    {reg16: "de"},
    {reg16: "hl"},
    {reg16: "sp"}
  ];
  var rp2 = [ // rp2
    {reg16: "bc"},
    {reg16: "de"},
    {reg16: "hl"},
    {reg16: "af"}
  ];
  var alu = ["add", "adc", "sub", "sbc", "and", "xor", "or", "cp"];
  var cc = ["nz", "z", "nc", "c"];

  var x = [];
  x[0] = function(y, z, p, q) {
    return x0z[z](y, p, q);
  }
  var x0z = [];
  x0z[0] = function(y, p, q) {
    switch(y) {
      case 0:
        return ["nop"];
      case 1:
        return ["ld (nn),sp"];
      case 2:
        return ["stop"];
      case 3:
        return ["jr d"];
      default:
        return ["jr cc[y-4],d", cc[y-4]];
    }
  }
  x0z[1] = function(y, p, q) {
    if(q == 0) { 
      return ["ld rp[p],nn", rp[p]];
    } else {
      return ["add hl,rp[p]", rp[p]];
    }
  }
  x0z[2] = function(y, p, q) {
    if(q == 0) {
      switch(p) {
        case 0:
          return ["ld (bc),a"];
        case 1:
          return ["ld (de),a"];
        case 2:
          return ["ldi (hl),a"];
        case 3:
          return ["ldd (hl),a"];
      }
    }
    switch(p) {
      case 0:
        return ["ld a,(bc)"];
      case 1:
        return ["ld a,(de)"];
      case 2:
        return ["ldi a,(hl)"];
      case 3:
        return ["ldd a,(hl)"];
    }
  }
  x0z[3] = function(y, p, q) {
    if(q == 0) { 
      return ["inc rp[p]", rp[p]];
    } else { 
      return ["dec rp[p]", rp[p]];
    }
  }
  x0z[4] = function(y, p, q) {
    return ["inc r[y]", r[y]];
  }
  x0z[5] = function(y, p, q) {
    return ["dec r[y]", r[y]];
  }
  x0z[6] = function(y, p, q) {
    return ["ld r[y],n", r[y]];
  }
  x0z[7] = function(y, p, q) {
    switch(y) {
      case 0:
        return ["rlca"];
      case 1:
        return ["rrca"];
      case 2:
        return ["rla"];
      case 3:
        return ["rra"];
      case 4:
        return ["daa"];
      case 5:
        return ["cpl"];
      case 6:
        return ["scf"];
      case 7:
        return ["ccf"];
    }
  }

  x[1] = function(y, z, p, q) {
    if(z == 6 && y == 6) {
      // halt
      return ["halt"];
    } else {
      return ["ld r[y],r[z]", r[y], r[z]];
    }
  }

  x[2] = function(y, z, p, q) {
    return ["alu[y] r[z]", alu[y], r[z]];
  }

  x[3] = function(y, z, p, q) {
    return x3z[z](y, p, q);
  }
  var x3z = [];
  x3z[0] = function(y, p, q) {
    switch(y) {
    case 4:
      return ["ld (ff00+n),a"];
    case 5:
      return ["add sp,d"];
    case 6:
      return ["ld a,(ff00+n)"];
    case 7:
      return ["ld hl,(sp+d)"];
    default:
      return ["ret cc[y]", cc[y]];
    }
  }
  x3z[1] = function(y, p, q) {
    if(q == 0) {
      return ["pop rp2[p]", rp2[p]];
    } else {
      switch(p) {
      case 0:
        return ["ret"];
      case 1:
        return ["reti"];
      case 2:
        return ["jp hl"];
      case 3:
        return ["ld sp,hl"];
      }
    }
  }
  x3z[2] = function(y, p, q) {
    switch(y) {
    case 4:
      return ["ld (ff00+c),a"];
    case 5:
      return ["ld (nn),a"];
    case 6:
      return ["ld a,(ff00+c)"];
    case 7:
      return ["ld a,(nn)"];
    default:
      return ["jp cc[y],nn", cc[y]];
    }
  }
  x3z[3] = function(y, p, q) {
    switch(y) {
      case 0:
        return ["jp nn"];
      case 1:
        return ["cb prefix"];
      case 2: // none (out (n), a)
        return ["undef"];
      case 3: // none (in a, (n))
        return ["undef"];
      case 4: // none (ex (sp), hl)
        return ["undef"];
      case 5: // none (ex de, hl)
        return ["undef"];
      case 6:
        return ["di"];
      case 7:
        return ["ei"];
    }
  }
  x3z[4] = function(y, p, q) {
    if(y < 4) {
      return ["call cc[y],nn", cc[y]];
    } else {
      // undefined
      return ["undef"];
    }
  }
  x3z[5] = function(y, p, q) {
    if(q == 0) {
      return ["push rp2[p]", rp2[p]];
    } else {
      if(p == 0) {
        return ["call nn"];
      } else {
        // none (dd, ed, fd prefixes)
        return ["undef"];
      }
    }
  }
  x3z[6] = function(y, p, q) {
    return ["alu[y] n", alu[y]];
  }
  x3z[7] = function(y, p, q) { 
    return ["rst y*8", y*8];
  }

  return {
    getInstruction: function(opcode) {
      var y = (opcode >> 3) & 0x7;
      var z = opcode & 0x7;
      var p = y >> 1;
      var q = y & 0x1;
      return x[opcode >> 6](y, z, p, q);
    },
    getCBInstruction: function(opcode) {
      var x = opcode >> 6;
      var y = (opcode >> 3) & 0x7;
      var z = opcode & 0x7;
      switch(x) {
      case 0:
        return ["rot y,r[z]", y, r[z]];
      case 1:
        return ["bit y,r[z]", y, r[z]];
      case 2:
        return ["res y,r[z]", y, r[z]];
      case 3:
        return ["set y,r[z]", y, r[z]];
      }
    },
    tables: {
      r: r,
      rp: rp,
      rp2: rp2,
      alu: alu,
      cc: cc
    }
  }
});
