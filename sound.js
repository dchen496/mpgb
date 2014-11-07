(function() {
  "use strict"
  JSGBC.Sound = {
    create: function(gbc) {
      var sound = Object.create(JSGBC.Sound.proto);
      sound.init(gbc);
      return sound;
    }
  }

  JSGBC.Sound.proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }
})();
