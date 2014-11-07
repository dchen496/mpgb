(function() {
  "use strict"
  JSGBC.GBC = {
    create: function(romImage) {
      var gbc = Object.create(JSGBC.GBC.proto);
      gbc.init(romImage);
      return gbc;
    },
    test: function() {
      var romImage = new Uint8Array(0x8000);
      JSGBC.GBC.create(romImage);
      return true;
    }
  }

  JSGBC.GBC.proto = {
    init: function(romImage) {
      this.evm = JSGBC.EventManager.create(this);
      this.memory = JSGBC.Memory.create(this);
      this.cpu = JSGBC.CPU.create(this);
      this.video = JSGBC.Video.create(this);
      this.sound = JSGBC.Sound.create(this);
      this.cartridge = JSGBC.Cartridge.create(this, romImage);
      this.serial = JSGBC.Serial.create(this);
      this.dma = JSGBC.DMA.create(this);
      this.joypad = JSGBC.Joypad.create(this);
      this.timer = JSGBC.Timer.create(this);

      this.evm.addCore(this.video);
      this.evm.addCore(this.sound);
      this.evm.addCore(this.serial);
      this.evm.addCore(this.dma);
      this.evm.addCore(this.joypad);
      this.evm.addCore(this.timer);
    },
    run: function(run) {
      var v = this;
      var clocksPerSecond = Math.pow(2, 23);
      var itersPerSecond = 60.0;
      return setTimeout(function() {
        v.evm.run(clocksPerSecond / itersPerSecond);
      }, 1000.0 / itersPerSecond); 
    }
  }
})();
