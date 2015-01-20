define(function(){
  "use strict"
  var proto = {
    init: function(gbc) {
      this.gbc = gbc;
    },

  }

  return {
    create: function(gbc) {
      var video = Object.create(proto);
      video.init(gbc);
      return video;
    }
  }
});
