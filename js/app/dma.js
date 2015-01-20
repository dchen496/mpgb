define(function() {
  "use strict"
  var proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }

  return {
    create: function(gbc) {
      var dma = Object.create(proto);
      dma.init(gbc);
      return dma;
    }
  }
});
