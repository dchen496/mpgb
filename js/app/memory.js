define(['sprintf', './event-manager'], function(sprintf, evm) {
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
          return this.gbc.video.lcdcOp(read, value);
        case 0x41: // STAT
          return this.gbc.video.statOp(read, value);
        case 0x42: // SCY
          return this.gbc.video.scyOp(read, value);
        case 0x43: // SCX
          return this.gbc.video.scxOp(read, value);
        case 0x44: // LY
          return this.gbc.video.lyOp(read, value);
        case 0x45: // LYC
          return this.gbc.video.lycOp(read, value);
        case 0x4A: // WY
          return this.gbc.video.wyOp(read, value);
        case 0x4B: // WX
          return this.gbc.video.wxOp(read, value);
        case 0x47: // BGP
          return this.gbc.video.bgpOp(read, value);
        case 0x48: // OBP0
          return this.gbc.video.obp0Op(read, value);
        case 0x49: // OBP1
          return this.gbc.video.obp1Op(read, value);
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
          return this.gbc.video.dmaOp(read, value);

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
          return this.gbc.sound.nr10Op(read, value);
        case 0x11: // NR11
          return this.gbc.sound.nr11Op(read, value);
        case 0x12: // NR12
          return this.gbc.sound.nr12Op(read, value);
        case 0x13: // NR13
          return this.gbc.sound.nr13Op(read, value);
        case 0x14: // NR14
          return this.gbc.sound.nr14Op(read, value);

        case 0x16: // NR21
          return this.gbc.sound.nr21Op(read, value);
        case 0x17: // NR22
          return this.gbc.sound.nr22Op(read, value);
        case 0x18: // NR23
          return this.gbc.sound.nr23Op(read, value);
        case 0x19: // NR24
          return this.gbc.sound.nr24Op(read, value);

        case 0x1A: // NR30
          return this.gbc.sound.nr30Op(read, value);
        case 0x1B: // NR31
          return this.gbc.sound.nr31Op(read, value);
        case 0x1C: // NR32
          return this.gbc.sound.nr32Op(read, value);
        case 0x1D: // NR33
          return this.gbc.sound.nr33Op(read, value);
        case 0x1E: // NR34
          return this.gbc.sound.nr34Op(read, value);

        case 0x20: // NR41
          return this.gbc.sound.nr41Op(read, value);
        case 0x21: // NR42
          return this.gbc.sound.nr42Op(read, value);
        case 0x22: // NR43
          return this.gbc.sound.nr43Op(read, value);
        case 0x23: // NR44
          return this.gbc.sound.nr44Op(read, value);

        case 0x24: // NR50
          return this.gbc.sound.nr50Op(read, value);
        case 0x25: // NR51
          return this.gbc.sound.nr51Op(read, value);
        case 0x26: // NR52
          return this.gbc.sound.nr52Op(read, value);

        case 0x00: // P1/JOYP
          return this.gbc.joypad.joypOp(read, value);

        case 0x01: // SB
          return this.gbc.serial.sbOp(read, value);
        case 0x02: // SC
          return this.gbc.serial.scOp(read, value);

        case 0x04: // DIV
          return this.gbc.timer.divOp(read, value);
        case 0x05: // TIMA
          return this.gbc.timer.timaOp(read, value);
        case 0x06: // TMA
          return this.gbc.timer.tmaOp(read, value);
        case 0x07: // TAC
          return this.gbc.timer.tacOp(read, value);

        case 0x0F: // IF
          return this.gbc.cpu.iflagOp(read, value);

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
      return 0xff;
    },
    _ieOp: function(read, value) {
      return this.gbc.cpu.ienableOp(read, value);
    },

    dump: function(min, max, highlight) {
      var res = [];
      min = Math.floor(min / 4);
      max = Math.ceil(max / 4);
      for(var i = min; i <= max; i++) {
        var addr = (i*4) & 0xffff;
        var s = addr == (highlight - highlight % 4) ? '*' : ' ';
        res.push(sprintf("%s%04x: %04x %04x",
              s, addr, this.read16(addr), this.read16(addr+2)));
      }
      return res.join("\n");
    },
    dumpStack: function(min, max) {
      return this.dump(this.gbc.cpu.sp + min, this.gbc.cpu.sp + max,
          this.gbc.cpu.sp);
    }
  }

  return {
    create: function(gbc) {
      var mem = Object.create(proto);
      mem._init(gbc);
      return mem;
    }
  }
});
