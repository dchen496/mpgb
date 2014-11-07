(function(){
  "use strict"
  JSGBC.Video = {
    create: function(gbc) {
      var video = Object.create(JSGBC.Video.proto);
      video.init(gbc);
      return video;
    }
  }

  JSGBC.Video.proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },

  }
})();
