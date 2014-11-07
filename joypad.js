(function() {
  "use strict"
  JSGBC.Joypad = {
    create: function(gbc) {
      var joypad = Object.create(JSGBC.Joypad.proto);
      joypad.init(gbc);
      return joypad;
    }
  }

  JSGBC.Joypad.proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }
})();
