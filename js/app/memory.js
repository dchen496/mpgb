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
    init: function(gbc) {
      this.gbc = gbc;
      this.wram = new Uint8Array(0x8000);
      this.wramBank = 1;
      this.hram = new Uint8Array(0xFF);
    },
    op: function(addr, read, value) {
      value &= 0xFF;
      addr &= 0xFFFF;
      switch(true) {
        case addr < 0x8000: // cartridge ROM
          return this.gbc.cartridge.romOp(addr, read, value);
        case addr < 0xA000: // video RAM
          return this.gbc.video.ramOp(addr, read, value);
        case addr < 0xC000: // cartridge RAM
          return this.gbc.cartridge.ramOp(addr, read, value);
        case addr < 0xE000: // work RAM
          return this.wramOp(addr, read, value);
        case addr < 0xFE00: // echo region
          return this.op(addr - 0xE000 + 0xC000, read, value);
        case addr < 0xFEA0: // sprite OAM
          return this.gbc.video.oamOp(addr - 0xFEA0, read, value);
        case addr < 0xFF00: // nothing
          return 0xFF;
        case addr < 0xFF80: // IO ports
          return this.ioOp(addr, read, value);
        case addr < 0xFFFF: // high RAM
          return this.hramOp(addr, read, value);
        case addr == 0xFFFF: // interrupt enable
          return this.imeOp(read, value);
        default: // invalid address
          return 0xFF;
      }
    },
    op16: function(addr, read, value) {
      if(read) {
        var lo = this.op(addr, true, 0);
        var hi = this.op(addr + 1, true, 0);
        return (hi << 8) | lo;
      } else {
        this.op(addr, false, value & 0xff);
        this.op(addr + 1, false, value >> 8);
        return value;
      }
    },
    wramOp: function(addr, read, value) {
      var off = addr - 0xC000;
      if(off >= 0x1000) {
        off = 0x1000 * this.wramBank + off - 0x1000;
      }
      if(read) {
        return this.wram[off];
      }
      return this.wram[off] = value;
    },
    hramOp: function(addr, read, value) {
      var off = addr - 0xFF80;
      if(read) {
        return this.hram[off];
      }
      return this.hram[off] = value;
    },
    ioOp: function(addr, read, value) {
      addr &= 0xFF;
      switch(addr) {
        case 0x40: // LCDC

        case 0x41: // STAT

        case 0x42: // SCY
        case 0x43: // SCX
        case 0x44: // LY
        case 0x45: // LYC
        case 0x4A: // WY
        case 0x4B: // WX

        case 0x47: // BGP
        case 0x48: // OBP0
        case 0x49: // OBP1

        case 0x68: // BCPS/BGPI
        case 0x69: // BCPD/BGPD
        case 0x6A: // OCPS/OBPI
        case 0x6B: // OCPD/OBPD

        case 0x4F: // VBK

        case 0x46: // DMA

        case 0x51: // HDMA1
        case 0x52: // HDMA2
        case 0x53: // HDMA3
        case 0x54: // HDMA4
        case 0x55: // HDMA5

        case 0x10: // NR10
        case 0x11: // NR11
        case 0x12: // NR12
        case 0x13: // NR13
        case 0x14: // NR14

        case 0x16: // NR21
        case 0x17: // NR22
        case 0x18: // NR23
        case 0x19: // NR24

        case 0x1A: // NR30
        case 0x1B: // NR31
        case 0x1C: // NR32
        case 0x1D: // NR33
        case 0x1E: // NR34

        case 0x20: // NR41
        case 0x21: // NR42
        case 0x22: // NR43
        case 0x23: // NR44

        case 0x24: // NR50
        case 0x25: // NR51
        case 0x26: // NR52

        case 0x00: // P1/JOYP
          
        case 0x01: // SB
        case 0x02: // SC

        case 0x04: // DIV
          return this.gbc.timer.divOp(read, value);
        case 0x05: // TIMA
          return this.gbc.timer.timaOp(read, value);
        case 0x06: // TMA
          return this.gbc.timer.tmaOp(read, value);
        case 0x07: // TAC
          return this.gbc.timer.tacOp(read, value);

        case 0x0F: // IF
          return this.cpu.iflagOp(read, value);

        case 0x4D: // KEY1
        case 0x56: // RP
        case 0x70: // SVBK

        case 0x6C: // undocumented
        case 0x72:
        case 0x73:
        case 0x74:
        case 0x75:
        case 0x76:
        case 0x77:

        default:
          if(0x30 <= addr && addr <= 0x3F) {
            // wave pattern RAM
            ;
          }
      }
    },
    ieOp: function(read, value) {
      return this.cpu.ienableOp(read, value);
    },
  }

  return {
    create: function(gbc) {
      var mem = Object.create(proto);
      mem.init(gbc);
      return mem;
    }
  }
})
