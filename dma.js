(function() {
  "use strict"
  JSGBC.DMA = {
    create: function(gbc) {
      var dma = Object.create(JSGBC.DMA.proto);
      dma.init(gbc);
      return dma;
    }
  }

  JSGBC.DMA.proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }
})();
