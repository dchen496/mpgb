define(function() {
  "use strict"

  /*
   * Memory Map
   *
   * 0000-3FFF   16KB ROM Bank 00     (in cartridge, fixed at bank 00)
   * 4000-7FFF   16KB ROM Bank 01..NN (in cartridge, switchable bank number)
   * 8000-9FFF   8KB Video RAM (VRAM) (switchable bank 0-1 in CGB Mode)
   * A000-BFFF   8KB External RAM     (in cartridge, switchable bank, if any)
   * C000-CFFF   4KB Work RAM Bank 0 (WRAM)
   * D000-DFFF   4KB Work RAM Bank 1 (WRAM)  (switchable bank 1-7 in CGB Mode)
   * E000-FDFF   Same as C000-DDFF (ECHO)    (typically not used)
   * FE00-FE9F   Sprite Attribute Table (OAM)
   * FEA0-FEFF   Not Usable
   * FF00-FF7F   I/O Ports
   * FF80-FFFE   High RAM (HRAM)
   * FFFF        Interrupt Enable Register
   */

  var proto = {
    _init: function(gbc) {
      this.gbc = gbc;
      this.wram = new Uint8Array(0x8000);
      this.wramBank = 1;
      this.hram = new Uint8Array(0xFF);
    },

    read: function(addr) {
      return this._op(addr, true, 0);
    },
    write: function(addr, value) {
      this._op(addr, false, value);
    },
    read16: function(addr) {
      var lo = this._op(addr, true, 0);
      var hi = this._op(addr + 1, true, 0);
      return (hi << 8) | lo;
    },
    write16: function(addr, value) {
      this._op(addr, false, value & 0xff);
      this._op(addr + 1, false, value >> 8);
      return value;
    },

    _op: function(addr, read, value) {
      value &= 0xFF;
      addr &= 0xFFFF;
      switch(true) {
        case addr < 0x8000: // cartridge ROM
          return this.gbc.cartridge.romOp(addr, read, value);
        case addr < 0xA000: // video RAM
          return this.gbc.video.vramOp(addr, read, value);
        case addr < 0xC000: // cartridge RAM
          return this.gbc.cartridge.ramOp(addr, read, value);
        case addr < 0xE000: // work RAM
          return this._wramOp(addr, read, value);
        case addr < 0xFE00: // echo region
          return this._op(addr - 0xE000 + 0xC000, read, value);
        case addr < 0xFEA0: // sprite OAM
          return this.gbc.video.oamOp(addr, read, value);
        case addr < 0xFF00: // nothing
          return 0xFF;
        case addr < 0xFF80: // IO ports
          return this._ioOp(addr, read, value);
        case addr < 0xFFFF: // high RAM
          return this._hramOp(addr, read, value);
        case addr == 0xFFFF: // interrupt enable
          return this._ieOp(read, value);
        default: // invalid address
          return 0xFF;
      }
    },
    _wramOp: function(addr, read, value) {
      var off = addr - 0xC000;
      if(off >= 0x1000) {
        off = 0x1000 * this.wramBank + off - 0x1000;
      }
      if(read) {
        return this.wram[off];
      }
      return this.wram[off] = value;
    },
    _hramOp: function(addr, read, value) {
      var off = addr - 0xFF80;
      if(read) {
        return this.hram[off];
      }
      return this.hram[off] = value;
    },
    _ioOp: function(addr, read, value) {
      addr &= 0xFF;
      switch(addr) {
        case 0x40: // LCDC
          this.gbc.video.lcdcOp(read, value);
          break;
        case 0x41: // STAT
          this.gbc.video.statOp(read, value);
          break;
        case 0x42: // SCY
          this.gbc.video.scyOp(read, value);
          break;
        case 0x43: // SCX
          this.gbc.video.scxOp(read, value);
          break;
        case 0x44: // LY
          this.gbc.video.lyOp(read, value);
          break;
        case 0x45: // LYC
          this.gbc.video.lycOp(read, value);
          break;
        case 0x4A: // WY
          this.gbc.video.wyOp(read, value);
          break;
        case 0x4B: // WX
          this.gbc.video.wxOp(read, value);
          break;
        case 0x47: // BGP
          this.gbc.video.bgpOp(read, value);
          break;
        case 0x48: // OBP0
          this.gbc.video.obp0Op(read, value);
          break;
        case 0x49: // OBP1
          this.gbc.video.obp1Op(read, value);
          break;
        /* GBC only
        case 0x68: // BCPS/BGPI
          break;
        case 0x69: // BCPD/BGPD
          break;
        case 0x6A: // OCPS/OBPI
          break;
        case 0x6B: // OCPD/OBPD
          break;

        case 0x4F: // VBK
          break;
        */
        case 0x46: // DMA
          this.gbc.video.dmaOp(read, value);
          break;

        /* GBC only
        case 0x51: // HDMA1
          break;
        case 0x52: // HDMA2
          break;
        case 0x53: // HDMA3
          break;
        case 0x54: // HDMA4
          break;
        case 0x55: // HDMA5
          break;
        */

        case 0x10: // NR10
          break;
        case 0x11: // NR11
          break;
        case 0x12: // NR12
          break;
        case 0x13: // NR13
          break;
        case 0x14: // NR14
          break;

        case 0x16: // NR21
          break;
        case 0x17: // NR22
          break;
        case 0x18: // NR23
          break;
        case 0x19: // NR24
          break;

        case 0x1A: // NR30
          break;
        case 0x1B: // NR31
          break;
        case 0x1C: // NR32
          break;
        case 0x1D: // NR33
          break;
        case 0x1E: // NR34
          break;

        case 0x20: // NR41
          break;
        case 0x21: // NR42
          break;
        case 0x22: // NR43
          break;
        case 0x23: // NR44
          break;

        case 0x24: // NR50
          break;
        case 0x25: // NR51
          break;
        case 0x26: // NR52
          break;

        case 0x00: // P1/JOYP
          break;
          
        case 0x01: // SB
          break;
        case 0x02: // SC
          break;

        case 0x04: // DIV
          return this.gbc.timer.divOp(read, value);
          break;
        case 0x05: // TIMA
          return this.gbc.timer.timaOp(read, value);
          break;
        case 0x06: // TMA
          return this.gbc.timer.tmaOp(read, value);
          break;
        case 0x07: // TAC
          return this.gbc.timer.tacOp(read, value);
          break;

        case 0x0F: // IF
          return this.cpu.iflagOp(read, value);
          break;

        case 0x4D: // KEY1
          break;
        case 0x56: // RP
          break;
        case 0x70: // SVBK
          break;

        case 0x6C: // undocumented
          break;
        case 0x72:
          break;
        case 0x73:
          break;
        case 0x74:
          break;
        case 0x75:
          break;
        case 0x76:
          break;
        case 0x77:
          break;

        default:
          if(0x30 <= addr && addr <= 0x3F) {
            // wave pattern RAM
            ;
          }
      }
    },
    _ieOp: function(read, value) {
      return this.cpu.ienableOp(read, value);
    },
  }

  return {
    create: function(gbc) {
      var mem = Object.create(proto);
      mem._init(gbc);
      return mem;
    }
  }
});
