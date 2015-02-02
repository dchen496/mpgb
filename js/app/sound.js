define(function() {
  "use strict"
  var proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },
  }

  return {
    create: function(gbc) {
      var sound = Object.create(proto);
      sound.init(gbc);
      return sound;
    }
  }
});
