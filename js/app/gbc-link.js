define(['./gbc', './cpu', './event-manager'], function(gbc, cpu, evm) {
  "use strict"

  var proto = {
    init: function(romImage, frameCallback1, frameCallback2) {
      var v = this;
      this.gbc1 = gbc.create(romImage, function(gb, fb) {
        frameCallback1(v, gb, fb); 
      });
      this.gbc2 = gbc.create(romImage, function(gb, fb) {
        frameCallback2(v, gb, fb); 
      });
      this.serial1 = this.gbc1.serial;
      this.serial2 = this.gbc2.serial;
      this.run = false;
      this.serial1.linkWith(this.gbc2);
      this.serial2.linkWith(this.gbc1);
    },
    boot: function() {
      this.gbc1.boot();
      this.gbc2.boot();
    },
    pause: function() {
      this.run = false;
    },
    advance: function() {
      this.run = true;
      while(this.run) {
        this.gbc1.advance();
        this.gbc2.advance();
        this.tryTransfer();
      }
    },
    tryTransfer: function() {
      var start1 = this.serial1.transferStart;
      var start2 = this.serial2.transferStart;
      var clock1 = this.serial1.internalClock;
      var clock2 = this.serial2.internalClock;
      if(start1 && start2) {
        if(clock1 || clock2) {
          if(clock1 && clock2) {
            // abnormal: two masters
            // XXX: handle this case differently
            this.doTransfer();
          } else {
            // normal
            this.doTransfer();
          }
        } else {
          // normal: no master - both are waiting
          // do nothing
        }
      } else if(start1 && !start2) {
        if(clock1) {
          // abnormal: 2 hasn't started transfer
          this.gbc1.cpu.irq(cpu.irqvectors.SERIAL);
          this.serial1.sb = 0xff;
          this.serial1.transferStart = 0;
        }
      } else if(!start1 && start2) {
        if(clock2) {
          // abnormal: 1 hasn't started transfer
          this.gbc2.cpu.irq(cpu.irqvectors.SERIAL);
          this.serial2.sb = 0xff;
          this.serial2.transferStart = 0;
        }
      } else {
        // normal: neither has started transfer
        // do nothing
      }
    },
    doTransfer: function() {
      var tmp = this.serial1.sb;
      this.serial1.sb = this.serial2.sb;
      this.serial2.sb = tmp;
      this.serial1.transferStart = 0;
      this.serial2.transferStart = 0;

      this.gbc1.cpu.irq(cpu.irqvectors.SERIAL);
      this.gbc2.cpu.irq(cpu.irqvectors.SERIAL);
    }
  };

  return {
    create: function(romImage, frameCallback1, frameCallback2) {
      var gbcLink = Object.create(proto);
      gbcLink.init(romImage, frameCallback1, frameCallback2);
      return gbcLink;
    }
  }
});
