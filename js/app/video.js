define(['sprintf', './cpu', './event-manager'], function(sprintf, cpu, evm) {
  "use strict"
  
  var MODE2_CLOCKS = 80;
  var MODE3_CLOCKS = 172;
  var HBLANK_CLOCKS = 204;
  var LINE_CLOCKS = MODE2_CLOCKS + MODE3_CLOCKS + HBLANK_CLOCKS;
  var ACTIVE_LINES = 144;
  var TOTAL_LINES = 154;
  var ACTIVE_CLOCKS = LINE_CLOCKS * ACTIVE_LINES;
  var LINE_WIDTH = 160;
  var OAM_ENTRIES = 40;

  var interrupts = {
    HBLANK: 0,
    VBLANK: 1,
    OAM: 2,
    COINCIDENCE: 3,
  };

  var colormap = [200, 150, 50, 0];

  var proto = {
    init: function(memory, cpu, evm, frameCallback) {
      this.memory = memory;
      this.cpu = cpu;
      this.evm = evm;
      this.frameCallback = frameCallback;

      this.bgDisplay = 0;
      this.spriteEnable = 0;
      this.spriteSize = 0;
      this.bgTileMapSelect = 0;
      this.tileDataSelect = 0;
      this.windowEnable = 0;
      this.windowTileMapSelect = 0;
      this.enable = 0;
      this.ienables = 0;
      this.scy = 0;
      this.scx = 0;
      this.ly = 0;
      this.lyc = 0;
      this.wy = 0;
      this.wx = 0;
      this.bgp = 0;
      this.obp0 = 0;
      this.obp1 = 0;
      this.vram = new Uint8Array(0x2000);
      this.oam = new Uint8Array(0xA0);

      this.frameStart = 0;
      this.lineStart = 0;
      this.fb = new Uint8Array(ACTIVE_LINES * LINE_WIDTH);
      this.oamEntries = new Array(OAM_ENTRIES);
      this.oamDirty = true;
    },
    lcdcOp: function(read, value) {
      if(read) {
        return (this.bgDisplay << 0) |
          (this.spriteEnable << 1) |
          (this.spriteSize << 2) |
          (this.bgTileMapSelect << 3) |
          (this.tileDataSelect << 4) |
          (this.windowEnable << 5) |
          (this.windowTileMapSelect << 6) |
          (this.enable << 7);
      }
      this.bgDisplay = value & 0x01;
      this.spriteEnable = (value >> 1) & 0x01;
      this.spriteSize = (value >> 2) & 0x01;
      this.bgTileMapSelect = (value >> 3) & 0x01;
      this.tileDataSelect = (value >> 4) & 0x01;
      this.windowEnable = (value >> 5) & 0x01;
      this.windowTileMapSelect = (value >> 6) & 0x01;

      var wasEnabled = this.enable;
      this.enable = (value >> 7) & 0x01;
      if(!wasEnabled && this.enable) {
        this.frameStart = this.cpu.clock;
        this.lineStart = this.cpu.clock;
        this.clearFb();
      } else if(!this.enable) {
        this.clearFb();
      }
      this.updateEvents();
    },
    getMode: function() {
      var mode = 0;
      if(this.enable) {
        var frameClocks = this.cpu.clock - this.frameStart;
        var lineClocks = this.cpu.clock - this.lineStart;
        switch(true) {
        case frameClocks >= ACTIVE_CLOCKS:
          mode = 1;
          break;
        case lineClocks < MODE2_CLOCKS:
          mode = 2;
          break;
        case lineClocks < MODE3_CLOCKS:
          mode = 3;
          break;
        default: // HBLANK
          mode = 0;
          break;
        }
      }
      return mode;
    },
    statOp: function(read, value) {
      console.log("stat op", read, value);
      if(read) {
        var coincidence = this.lyc == this.ly ? 1 : 0;
        return (this.ienables << 3) | (coincidence << 2) | this.getMode();
      }
      this.ienables = (value >> 3) & 0xf;
      return value;
    },
    scyOp: function(read, value) {
      if(read) {
        return this.scy;
      }
      return this.scy = value;
    },
    scxOp: function(read, value) {
      if(read) {
        return this.scx;
      }
      return this.scx = value;
    },
    lyOp: function(read, value) {
      if(read) {
        return this.ly;
      }
      this.frameStart = this.cpu.clock;
      return this.ly = 0;
    },
    lycOp: function(read, value) {
      if(read) {
        return this.lyc;
      }
      return this.lyc = value;
    },
    wyOp: function(read, value) {
      if(read) {
        return this.wy;
      }
      return this.wy = value;
    },
    wxOp: function(read, value) {
      if(read) {
        return this.wx;
      }
      return this.wx = value;
    },
    bgpOp: function(read, value) {
      if(read) {
        return this.bgp;
      }
      return this.bgp = value;
    },
    obp0Op: function(read, value) {
      if(read) {
        return this.obp0;
      }
      return this.obp0 = value;
    },
    obp1Op: function(read, value) {
      if(read) {
        return this.obp1;
      }
      return this.obp1 = value;
    },
    dmaOp: function(read, value) {
      if(read) {
        return 0;
      }
      // this takes 160us on real hardware, but we'll do it instantly
      // should be OK since correct programs cannot access VRAM/WRAM
      // when DMA is occuring
      var src = value * 0x100;
      for(var i = this.oam.length - 1; i >= 0; i--) {
        this.oam[i] = this.memory.read(src + i);
      }
      this.oamDirty = true;
    },

    vramOp: function(addr, read, value) {
      var off = addr - 0x8000;
      if(read) {
        return this.vram[off];
      }
      return this.vram[off] = value;
    },
    oamOp: function(addr, read, value) {
      var off = addr - 0xFE00;
      if(read) {
        return this.oam[off];
      }
      this.oamDirty = true;
      return this.oam[off] = value;
    },

    updateEvents: function() {
      if(this.enable) {
        this.evm.register(evm.events.VIDEO_LINE, this.lineStart +
            LINE_CLOCKS, this, this.lineCallback);
        this.evm.register(evm.events.VIDEO_HBLANK, this.lineStart +
            MODE2_CLOCKS + MODE3_CLOCKS, this, this.hblankCallback);
      } else {
        this.evm.unregister(evm.events.VIDEO_LINE);
        this.evm.unregister(evm.events.VIDEO_HBLANK);
      }
    },
    lineCallback: function() {
      if(this.ly < ACTIVE_LINES) {
        this.preprocessOAM();
        var buf = this.drawLine(this.ly);
        this.writeLineToFb(this.ly, buf);
      }
      this.ly++;
      if(this.ly >= TOTAL_LINES) {
        this.frameCallback(this.fb);
        this.frameStart = this.cpu.clock;
        this.ly = 0;
        this.clearFb();
        this.statIrq(interrupts.OAM);
      }
      if(this.ly == this.lyc) {
        this.statIrq(interrupts.COINCIDENCE);
      }
      if(this.ly == ACTIVE_LINES) {
        this.statIrq(interrupts.VBLANK);
      }
      this.lineStart = this.cpu.clock;
      this.updateEvents();
    },
    hblankCallback: function() {
      this.statIrq(interrupts.HBLANK);
    },
    statIrq: function(vector) {
      if(this.ienables & (1 << vector)) {
        this.cpu.irq(cpu.irqvectors.LCD);
      }
    },
    clearFb: function() {
      for(var i = 0; i < this.fb.length; i++) {
        this.fb[i] = 0;
      }
    },

    drawLine: function(line) {
      // initialize to white
      var buf = new Uint8Array(LINE_WIDTH);

      // z-priorities:
      // sprites above bg = 0..9
      // window color 1-3 = 10
      // bg color 1-3 = 11
      // sprites below bg = 12..21
      // window color 0 = 22
      // bg color 0 = 23
      // TODO investigate bg-sprite priority in
      // sprite < bg conflicting with sprite > bg case
      var zbuf = new Uint8Array(LINE_WIDTH);
      for(var i = 0; i < zbuf.length; i++) {
        zbuf[i] = 0xff;
      }

      this.drawBackgroundLine(line, buf, zbuf);
      this.drawWindowLine(line, buf, zbuf);
      this.drawSpriteLine(line, buf, zbuf);

      return buf;
    },

    writeLineToFb: function(line, buf) {
      var base = LINE_WIDTH * line;
      for(var i = 0; i < LINE_WIDTH; i++) {
        this.fb[base + i] = colormap[buf[i]];
      }
    },

    drawBackgroundLine: function(line, buf, zbuf) {
      if(!this.bgDisplay) {
        return;
      }

      var mapBase = this.bgTileMapSelect ? 0x1C00 : 0x1800;
      var y = (line + this.scy) & 0xff;
      for(var i = 0; i < LINE_WIDTH; i++) {
        var x = (i + this.scx) & 0xff;
        var color = this.getBackgroundPixel(mapBase, x, y);
        var z = color ? 11 : 23;
        if(z <= zbuf[i]) {
          zbuf[i] = z;
          buf[i] = (this.bgp >> (color << 1)) & 3;
        }
      }
    },

    drawWindowLine: function(line, buf, zbuf) {
      if(!this.windowEnable) {
        return;
      }

      var y = line - this.wy;
      if(y < 0) {
        return;
      }
      var x = this.wx - 7;
      if(x < 0) {
        x = 0;
      }

      var mapBase = this.windowTileMapSelect ? 0x1C00 : 0x1800;
      for(var i = x; i < LINE_WIDTH; i++) {
        var color = this.getBackgroundPixel(mapBase, x, y);
        var z = color ? 10 : 22;
        if(z <= zbuf[i]) {
          zbuf[i] = z;
          buf[i] = (this.bgp >> (color << 1)) & 3;
        }
      }
    },

    getBackgroundPixel: function(mapBase, x, y) {
      var mapIndex = ((y >> 3) << 5) + (x >> 3);
      var tileIndex = this.vram[mapBase + mapIndex];
      // This is equivalent to the spec for the tile data map, without
      // having to deal with negative numbers
      if(!this.tileDataSelect && tileIndex < 0x80) {
        tileIndex += 0x100;
      }
      // TODO cache tile pixel data
      return this.getPixel(tileIndex, x & 7, y & 7);
    },

    drawSpriteLine: function(line, buf, zbuf) {
      if(!this.spriteEnable) {
        return;
      }

      var sprites = this.getLineSprites(line);
      var height = this.spriteSize ? 16 : 8;

      for(var i = 0; i < sprites.length; i++) {
        var sprite = sprites[i];
        var x0 = sprite.x - 8;
        if(x0 >= LINE_WIDTH || sprite.x <= 0) {
          return;
        }

        var palette = sprite.palette ? this.obp1 : this.obp0;
        var y0 = sprite.y - 16;
        var yoff = line - y0;
        for(var xoff = x0; xoff < x0 + 8 && xoff < LINE_WIDTH; xoff++) {
          var color = this.getPixel(sprite.tile, xoff, yoff);
          var z = i + this.priority * 12;
          // color 0 is transparent
          if(color != 0 && z <= zbuf[i]) {
            zbuf[i] = z;
            buf[i] = (palette >> (color << 1)) & 3;
          }
        }
      }
    },

    getPixel: function(tileIndex, xoff, yoff) {
      var pixelAddr = (tileIndex << 4) + (yoff << 1);
      var pixel0 = this.vram[pixelAddr];
      var pixel1 = this.vram[pixelAddr + 1];
      var shift = 7 - xoff;
      var lsb = (pixel0 >> shift) & 1;
      var msb = (pixel1 >> shift) & 1;
      return (msb << 1) | lsb; 
    },

    preprocessOAM: function() {
      if(!this.oamDirty)
        return;
      this.oamDirty = false;
      for(var i = 0; i < OAM_ENTRIES; i++) {
        var off = i * 4;
        var attrs = this.oam[off+3];
        this.oamEntries[i] = {
          y: this.oam[off],
          x: this.oam[off+1],
          tile: this.oam[off+2],
          palette: (attrs >> 4) & 1,
          xflip: (attrs >> 5) & 1,
          yflip: (attrs >> 6) & 1,
          priority: (attrs >> 7) & 1
        }
      }
      this.oamEntries.sort(function(a, b) {
        return a.y - b.y;
      });
    },
    
    getLineSprites: function(line) {
      var spriteHeight = this.spriteSize ? 16 : 8;
      var oamBegin = 0;
      while(oamBegin < this.oamEntries.length) {
        if(line < this.oamEntries[oamBegin].y - 16 + spriteHeight) {
          break;
        }
        oamBegin++;
      }
      var oamEnd = oamBegin;
      while(oamEnd < this.oamEntries.length) {
        if(line < this.oamEntries[oamEnd].y) {
          break;
        }
        oamEnd++;
      }
      var sprites = this.oamEntries.slice(oamBegin, oamEnd);
      // need to change this for GBC - sprite priority is different
      sprites.sort(function(a, b) {
        if(a.x == b.x) {
          return a.tile - b.tile;
        }
        return a.x - b.x;
      });
      if(sprites.length > 10) {
        return sprites.slice(0, 10);
      }
      return sprites;
    },

    dump: function() {
      return sprintf("bgen: %d spen: %d spsz: %d bgts: %d tdat: %d wien: %d wits: %d en: %d ien: %02x\n",
            this.bgDisplay, this.spriteEnable, this.spriteSize, this.bgTileMapSelect, 
            this.tileDataSelect, this.windowEnable, this.windowTileMapSelect, this.enable, this.ienables) +
          sprintf("scy: %02x scx: %02x ly: %02x lyc: %02x wy: %02x wx: %02x bgp: %02x obp0: %02x obp1: %02x",
            this.scy, this.scx, this.ly, this.lyc, this.wy, this.wx, this.bgp, this.obp0, this.obp1);
    },

    dumpTiles: function() {
      var tiles = new Array(384);
      for(var i = 0; i < tiles.length; i++) {
        var tile = new Array(64);
        for(var y = 0; y < 8; y++) {
          for(var x = 0; x < 8; x++) {
            var color = this.getPixel(i, x, y);
            tile[y * 8 + x] = colormap[color];
          }
        }
        tiles[i] = tile;
      }
      return tiles;
    }
  }

  return {
    create: function(memory, cpu, evm, frameCallback) {
      var video = Object.create(proto);
      video.init(memory, cpu, evm, frameCallback);
      return video;
    }
  }
});
