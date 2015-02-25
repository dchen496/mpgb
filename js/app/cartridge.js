define(['sprintf', './event-manager'], function(sprintf, evm) {
  "use strict"
  function computeRomType(cartType) {
    // cart type, mbc type, ram, battery, rtc
    var romTypes = [
      [0x00, 0, 0, 0, 0],
      [0x01, 1, 0, 0, 0],
      [0x02, 1, 1, 0, 0],
      [0x02, 1, 1, 1, 0],
      [0x05, 2, 1, 0, 0],
      [0x06, 2, 1, 1, 0],
      [0x08, 0, 1, 0, 0],
      [0x09, 0, 1, 1, 0],
      [0x0B, 0, 0, 0, 0],
      [0x0C, 0, 1, 0, 0],
      [0x0D, 0, 1, 1, 0],
      [0x0F, 3, 0, 1, 1],
      [0x10, 3, 1, 1, 1],
      [0x11, 3, 0, 0, 0],
      [0x12, 3, 1, 0, 0],
      [0x13, 3, 1, 1, 0],
      [0x15, 4, 0, 0, 0],
      [0x16, 4, 1, 0, 0],
      [0x17, 4, 1, 1, 0],
      [0x19, 5, 0, 0, 0],
      [0x1A, 5, 1, 0, 0],
      [0x1B, 5, 1, 1, 0],
      [0x1C, 5, 0, 0, 0],
      [0x1D, 5, 1, 0, 0],
      [0x1E, 5, 1, 1, 0]
    ]

    var ret = {}
    for(var i = 0; i < romTypes.length; i++) {
      if(romTypes[i][0] == cartType) {
        ret.mbc = romTypes[i][1];
        ret.hasRam = romTypes[i][2] === 1;
        ret.hasBattery = romTypes[i][3] === 1;
        ret.hasRTC = romTypes[i][4] === 1;
        return ret;
      }
    }
    throw("unsupported cartridge type");
  }

  var mbcs = [];

  mbcs[0] = { // no MBC - direct mapping
    init: function(gbc, romImage, cartType) {
      this.gbc = gbc;
      this.romImage = romImage;
      this.ramImage = new Uint8Array(0x2000);
    },
    romOp: function(addr, read, value) {
      return this.romImage[addr];
    },
    ramOp: function(addr, read, value) {
      addr -= 0xA000;
      if(read) {
        return this.ramImage[addr];
      }
      return this.ramImage[addr] = value;
    },
    persist: function() {
      throw("MBC0 persist unimplemented");
    },
    dump: function() {
      return sprintf("MBC0");
    }
  }

  mbcs[1] = { // MBC1
    init: function(gbc, romImage, cartType) {
      this.gbc = gbc;
      this.romImage = romImage;
      this.ramImage = new Uint8Array(0x8000);
      this.ramEnable = 0;
      this.lowerBank = 0x01;
      this.upperBank = 0x00;
      this.mode = 0;
    },
    romOp: function(addr, read, value) {
      if(read) {
        var bankSize = 0x4000;
        if(addr >= bankSize) {
          if(this.mode) {
            addr += this.lowerBank * bankSize;
          } else {
            addr += ((this.upperBank << 5) + this.lowerBank) * bankSize;
          }
        }
        return this.romImage[addr];
      }
      this.gbc.evm.update(evm.events.BREAKPOINT, this.gbc.clock);
      console.log(addr, value);
      switch(true) {
      case addr < 0x2000:
        this.ramEnable = (value & 0x0f) == 0x0a ? 1 : 0;
        break;
      case addr < 0x4000:
        value &= 0x1f;
        this.lowerBank = value ? value : 1;
        break;
      case addr < 0x6000:
        this.upperBank = value & 0x03;
        break;
      case addr < 0x8000:
        // TODO do non-0, 1 values really do this?
        this.mode = value & 0x01;
        break;
      }
    },
    ramOp: function(addr, read, value) {
      if(!this.ramEnable) {
        return 0xff;
      }
      addr -= 0xa000;
      if(this.mode) {
        addr += this.upperBank * 0x2000;
      }
      
      if(read) {
        return this.ramImage[addr];
      }
      return this.ramImage[addr] = value;
    },
    persist: function() {
      throw("MBC1 persist unimplemented");
    },
    dump: function() {
      if(this.mode) {
        return sprintf("MBC1 mode: 1 romBank: %d ramBank: %d ramEnable: %d", 
            this.lowerBank, this.upperBank, this.ramEnable);
      } else {
        return sprintf("MBC1 mode: 0 romBank: %d ramBank: 0 ramEnable: %d",
            this.lowerBank + 32 * this.upperBank, this.ramEnable);
      }
    }
  }

  mbcs[2] = { // MBC2
    init: function(gbc, romImage, cartType) {
      throw("MBC2 unimplemented");
      this.gbc = gbc;
      this.romImage = romImage;
    },
    romOp: function(addr, read, value) {
      
    },
    ramOp: function(add, read, value) {
    },
    persist: function() {
    },
    dump: function() {
      return sprintf("MBC2");
    }
  }

  mbcs[3] = { // MBC3
    init: function(gbc, romImage, cartType) {
      throw("MBC3 unimplemented");
      this.gbc = gbc;
      this.romImage = romImage;
    },
    romOp: function(addr, read, value) {
      
    },
    ramOp: function(add, read, value) {
    },
    persist: function() {
    },
    dump: function() {
      return sprintf("MBC3");
    }
  }

  mbcs[4] = { // MBC4
    init: function(gbc, romImage, cartType) {
      throw("MBC4 unimplemented");
      this.gbc = gbc;
      this.romImage = romImage;
    },
    romOp: function(addr, read, value) {
      
    },
    ramOp: function(add, read, value) {
    },
    persist: function() {
    },
    dump: function() {
      return sprintf("MBC4");
    }
  }

  mbcs[5] = { // MBC5
    init: function(gbc, romImage, cartType) {
      throw("MBC5 unimplemented");
      this.gbc = gbc;
      this.romImage = romImage;
    },
    romOp: function(addr, read, value) {
      
    },
    ramOp: function(add, read, value) {
    },
    persist: function() {
    },
    dump: function() {
      return sprintf("MBC5");
    }
  };

  return {
    create: function(gbc, romImage) {
      var cartType = computeRomType(romImage[0x0147]);
      var cart = Object.create(mbcs[cartType.mbc]);
      cart.init(gbc, romImage, cartType);
      return cart;
    }
  };
});
