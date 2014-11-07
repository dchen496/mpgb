(function() {
  "use strict"
  JSGBC.CPUISADecoder = {
    // operand tables
    rm8: [ // r
      {reg: "b"}, 
      {reg: "c"}, 
      {reg: "d"}, 
      {reg: "e"}, 
      {reg: "h"}, 
      {reg: "l"},
      {ind: "hl"},
      {reg: "a"}
    ],
    rm16sp: [ // rp
      {reg16: "bc"},
      {reg16: "de"},
      {reg16: "hl"},
      {reg16: "sp"}
    ],
    rm16af: [ // rp2
      {reg16: "bc"},
      {reg16: "de"},
      {reg16: "hl"},
      {reg16: "af"}
    ],

    getInstruction: function(opcode) {
      var x = opcode >> 6;
      var y = (opcode >> 3) & 0x7;
      var z = opcode & 0x7;
      var p = y >> 1;
      var q = y & 0x1;
      return this["x" + x](y, z, p, q);
    },

    x0: function(y, z, p, q) {
      return this["x0z" + z](y, p, q);
    },
    x0z0: function(y, p, q) {
      switch(y) {
        case 0: // nop
          return ["nop"];
        case 1: // ld (nn),sp
          return ["ld (nn),sp"];
        case 2: // stop
          return ["stop"];
        case 3: // jr d
          return ["jr_d"];
        default: // jr cc[y-4],d
          return ["jr_cc_d", y-4];
      }
    },
    x0z1: function(y, p, q) {
      if(q == 0) { 
        // ld rp[p], nn
        return ["ld_rp_nn", this.rm16sp[p]];
      } else {
        // add hl, rp[p]
        return ["add_hl_rp", this.rm16sp[p]];
      }
    },
    x0z2: function(y, p, q) {
      if(q == 0) {
        switch(p) {
          case 0: // ld (bc), a
            return ["ld_bc_a"];
          case 1: // ld (de), a
            return ["ld_de_a"];
          case 2: // ldi (hl), a
            return ["ldi_hl_a"];
          case 3: // ldi a, (hl)
            return ["ldi_a_hl"];
        }
      }
      switch(p) {
        case 0: // ld a, (bc)
          return ["ld_a_bc"];
        case 1: // ld a, (de)
          return ["ld_a_de"];
        case 2: // ldd (hl), a
          return ["ldd_hl_a"];
        case 3: // ldd a, (hl)
          return ["ldd_a_hl"];
      }
    },
    x0z3: function(y, p, q) {
      if(q == 0) { 
        // inc rp[p]
        return ["inc_rp", this.rm16sp[p]];
      } else { 
        // dec rp[p]
        return ["dec_rp", this.rm16sp[p]];
      }
    },
    x0z4: function(y, p, q) {
      // inc r[y]
      return ["inc_r", this.rm8[y]];
    },
    x0z5: function(y, p, q) {
      // dec r[y]
      return ["dec_r", this.rm8[y]];
    },
    x0z6: function(y, p, q) {
      // ld r[y], n
      return ["ld_r_n", this.rm8[y]];
    },
    // TODO
    x0z7: function(y, p, q) {
      switch(y) {
        case 0: // rlca
          return ["rlca"];
        case 1: // rrca
          return ["rrca"];
        case 2: // rla
          return ["rla"];
        case 3: // rra
          return ["rra"];
        case 4: // daa
          return ["daa"];
        case 5: // cpl
          return ["cpl"];
        case 6: // scf
          return ["scf"];
        case 7: // ccf
          return ["ccf"];
      }
    },
    x1: function(y, z, p, q) {
      if(z == 6 && y == 6) {
        // halt
        return ["halt"];
      } else {
        // ld r[y], r[z]
        return ["ld_r_r", this.rm8[y], this.rm8[z]];
      }
    },
    x2: function(y, z, p, q) {
      // alu[y] r[z]
      return ["alu_r", y, this.rm8[z]];
    },
    x3: function(y, z, p, q) {
      return this["x3z" + z](y, p, q);
    },
    x3z0: function(y, p, q) {
      switch(y) {
      case 4: // ld (ff00+n), a
        return ["ld_ff00_n_a"];
      case 5: // add sp, dd
        return ["add_sp_dd"];
      case 6: // ld a, (ff00+n)
        return ["ld_a_ff00_n"];
      case 7: // ld hl, (sp+dd) 
        return ["ld_hl_sp_dd"];
      default: // ret cc[y]
        return ["ret_cc", y];
      }
    },
    x3z1: function(y, p, q) {
      if(q == 0) {
        // pop rp2[p]
        return ["pop_rp", this.rm16af[p]];
      } else {
        switch(p) {
        case 0: // ret
          return ["ret"];
        case 1: // reti TODO
          return ["reti"];
        case 2: // jp hl
          return ["jp_hl"];
        case 3: // ld sp, hl
          return ["ld_sp_hl"];
        }
      }
    },
    x3z2: function(y, p, q) {
      // jp cc[y], nn
      switch(y) {
      case 4: // ld (ff00+C), a
        return ["ld_ff00_c_a"];
      case 5: // ld (nn), a
        return ["ld_nn_a"];
      case 6: // ld a, (ff00+C)
        return ["ld_a_ff00_c"];
      case 7: // ld a, (nn)
        return ["ld_a_nn"];
      default: // jp cc[y], nn
        return ["jp_cc_nn", y];
      }
    },
    x3z3: function(y, p, q) {
      switch(y) {
        case 0: // jp nn
          return ["jp_nn"];
        case 1: // cb-prefix 
          return ["cb"]; // TODO
        case 2: // none (out (n), a)
          return ["undef"];
        case 3: // none (in a, (n))
          return ["undef"];
        case 4: // none (ex (sp), hl)
          return ["undef"];
        case 5: // none (ex de, hl)
          return ["undef"];
        case 6: // di TODO
          return ["di"];
        case 7: // ei TODO
          return ["ei"];
      }
    },
    x3z4: function(y, p, q) {
      if(y < 4) {
        // call cc[y], nn
        return ["call_cc_nn", y];
      } else {
        // undefined
        return ["undef"];
      }
    },
    x3z5: function(y, p, q) {
      if(q == 0) {
        // push rp2[p]
        return ["push_rp", this.rm16af[p]];
      } else {
        if(p == 0) {
          // call nn
          return ["call_nn"];
        } else {
          // none (dd, ed, fd prefixes)
          return ["undef"];
        }
      }
    },
    x3z6: function(y, p, q) {
      // alu[y] n
      return ["alu", y];
    },
    x3z7: function(y, p, q) { 
      // rst y*8
      return ["rst", y*8];
    },

    getCBInstruction: function(opcode) {
      var x = opcode >> 6;
      var y = (opcode >> 3) & 0x7;
      var z = opcode & 0x7;
      switch(x) {
      case 0:
        return ["cb_rot_r", y, this.rm8[z]];
      case 1:
        return ["cb_bit_r", y, this.rm8[z]];
      case 2:
        return ["cb_res_r", y, this.rm8[z]];
      case 3:
        return ["cb_set_r", y, this.rm8[z]];
      }
    }
  }
})();
