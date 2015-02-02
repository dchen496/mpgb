define(function() {
  "use strict"
  var proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }

  return {
    create: function(gbc) {
      var joypad = Object.create(proto);
      joypad.init(gbc);
      return joypad;
    }
  }
});
