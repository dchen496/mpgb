(function() {
  "use strict"
  JSGBC.Serial = {
    create: function(gbc) {
      var serial = Object.create(JSGBC.Serial.proto);
      serial.init(gbc);
      return serial;
    }
  }

  JSGBC.Serial.proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }
})();
