(function() {
  "use strict"
  JSGBC.Cartridge = {
    create: function(gbc, romImage) {
      var cartType = JSGBC.Cartridge.computeRomType(romImage[0x0147]);
      var cart = Object.create(JSGBC.Cartridge.protos[cartType.mbc]);
      cart.init(gbc, romImage, cartType);
      return cart;
    },
    computeRomType: function(cartType) {
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
    },
  }

  JSGBC.Cartridge.protos = [];

  JSGBC.Cartridge.protos[0] = { // no MBC
    init: function(gbc, romImage, cartType) {
      this.gbc = gbc;
      this.romImage = romImage;
      this.ramImage = new Uint8Array(0x2000);
    },
    romOp: function(addr, read, value) {
      return romImage[addr];
    },
    ramOp: function(addr, read, value) {
      addr -= 0xA000;
      if(read) {
        return ramImage[addr];
      }
      return ramImage[addr] = value;
    },
    persist: function() {
    }
  }

  JSGBC.Cartridge.protos[1] = { // MBC1
    init: function(gbc, romImage, cartType) {
      throw("MBC1 unimplemented");
      this.gbc = gbc;
      this.romImage = romImage;
    },
    romOp: function(addr, read, value) {
      
    },
    ramOp: function(add, read, value) {
    },
    persist: function() {
    }
  }

  JSGBC.Cartridge.protos[2] = { // MBC2
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
    }
  }

  JSGBC.Cartridge.protos[3] = { // MBC3
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
    }
  }

  JSGBC.Cartridge.protos[4] = { // MBC4
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
    }
  }

  JSGBC.Cartridge.protos[5] = { // MBC5
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
    }
  }
})();
