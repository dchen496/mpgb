define(function() {
  "use strict"
  var proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }

  return {
    create: function(gbc) {
      var serial = Object.create(proto);
      serial.init(gbc);
      return serial;
    }
  }
});
