define(['./gbc', './cpu', './event-manager'], function(gbc, cpu, evm) {
  "use strict"

  var proto = {
    init: function(romImage, frameCallback1, frameCallback2) {
      this.userFrameCallback1 = frameCallback1;
      this.userFrameCallback2 = frameCallback2;
      this.gbc1 = gbc.create(romImage, frameCallback1);
      this.gbc2 = gbc.create(romImage, frameCallback2);
      this.serial1 = this.gbc1.serial;
      this.serial2 = this.gbc2.serial;

      this.run = false;
      this.prevFrame = 1;
      this.prevFrame2 = 1;

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
        tryTransfer();
      }
    },
    frameCallback1: function(gbc, fb) {
      if(this.prevFrame2 == 1) {
        this.pause();
      }
      this.prevFrame2 = this.prevFrame;
      this.prevFrame = 1;
      this.userFrameCallback1(gbc, fb);
    },
    frameCallback2: function(gbc, fb) {
      if(this.prevFrame2 == 2) {
        this.pause();
      }
      this.prevFrame2 = this.prevFrame;
      this.prevFrame = 2;
      this.userFrameCallback2(gbc, fb);
    },
    tryTransfer: function() {
      if(this.serial1.transferStart && this.serial2.transferStart) {
        if(this.serial1.internalClock || this.serial2.internalClock) {
          if(this.serial1.internalClock && this.serial1.internalClock) {
            // abnormal: two masters
            // TODO: handle abnormal cases differently?
          }
          doTransfer();
        } else {
          // abnormal: no master
          // do nothing
        }
      } else if(this.serial1.transferStart && !this.serial2.transferStart) {
        // abnormal: 2 hasn't started transfer
        this.gbc1.cpu.irq(cpu.irqvectors.SERIAL);
        this.serial1.sb = 0xff;
        this.serial1.transferStart = 0;
      } else if(!this.serial1.transferStart && this.serial2.transferStart) {
        // abnormal: 1 hasn't started transfer
        this.gbc2.cpu.irq(cpu.irqvectors.SERIAL);
        this.serial2.sb = 0xff;
        this.serial2.transferStart = 0;
      } else {
        // normal: neither has started transfer
        // do nothing
      }
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

  return {
    create: function(romImage, frameCallback1, frameCallback2) {
      var gbcLink = Object.create(proto);
      gbcLink.init(romImage, frameCallback1, frameCallback2);
      return gbcLink;
    }
  }
});
