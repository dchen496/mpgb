define(['./cpu', './event-manager'], function(cpu, evm) {
  "use strict"
  var proto = {
    init: function(cpu, evm) {
      this.cpu = cpu;
      this.evm = evm;
    },
    lcdcOp: function(read, value) {
    },
    statOp: function(read, value) {
    },
    scyOp: function(read, value) {
    },
    scxOp: function(read, value) {
    },
    lyOp: function(read, value) {
    },
    lycOp: function(read, value) {
    },
    wyOp: function(read, value) {
    },
    wxOp: function(read, value) {
    },
    bgpOp: function(read, value) {
    },
    obp0Op: function(read, value) {
    },
    obp1Op: function(read, value) {
    },
    dmaOp: function(read, value) {
    }
  }

  return {
    create: function(gbc) {
      var video = Object.create(proto);
      video.init(gbc);
      return video;
    }
  }
});
