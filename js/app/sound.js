define(function() {
  "use strict"
  var proto = {
    init: function() {
      this.nr10 = 0;
      this.nr11 = 0;
      this.nr12 = 0;
      this.nr13 = 0;
      this.nr14 = 0;

      this.nr21 = 0;
      this.nr22 = 0;
      this.nr23 = 0;
      this.nr24 = 0;

      this.nr30 = 0;
      this.nr31 = 0;
      this.nr32 = 0;
      this.nr33 = 0;
      this.nr34 = 0;

      this.nr41 = 0;
      this.nr42 = 0;
      this.nr43 = 0;
      this.nr44 = 0;

      this.nr50 = 0;
      this.nr51 = 0;
      this.nr52 = 0;
    },
    nr10Op: function(read, value) {
      if(read) {
        return this.nr10;
      }
      return this.nr10 = value;
    },
    nr11Op: function(read, value) {
      if(read) {
        return this.nr11;
      }
      return this.nr11 = value;
    },
    nr12Op: function(read, value) {
      if(read) {
        return this.nr12;
      }
      return this.nr12 = value;
    },
    nr13Op: function(read, value) {
      if(read) {
        return this.nr13;
      }
      return this.nr13 = value;
    },
    nr14Op: function(read, value) {
      if(read) {
        return this.nr14;
      }
      return this.nr14 = value;
    },
    nr21Op: function(read, value) {
      if(read) {
        return this.nr21;
      }
      return this.nr21 = value;
    },
    nr22Op: function(read, value) {
      if(read) {
        return this.nr22;
      }
      return this.nr22 = value;
    },
    nr23Op: function(read, value) {
      if(read) {
        return this.nr23;
      }
      return this.nr23 = value;
    },
    nr24Op: function(read, value) {
      if(read) {
        return this.nr24;
      }
      return this.nr24 = value;
    },
    nr30Op: function(read, value) {
      if(read) {
        return this.nr30;
      }
      return this.nr30 = value;
    },
    nr31Op: function(read, value) {
      if(read) {
        return this.nr31;
      }
      return this.nr31 = value;
    },
    nr32Op: function(read, value) {
      if(read) {
        return this.nr32;
      }
      return this.nr32 = value;
    },
    nr33Op: function(read, value) {
      if(read) {
        return this.nr33;
      }
      return this.nr33 = value;
    },
    nr34Op: function(read, value) {
      if(read) {
        return this.nr34;
      }
      return this.nr34 = value;
    },
    nr41Op: function(read, value) {
      if(read) {
        return this.nr41;
      }
      return this.nr41 = value;
    },
    nr42Op: function(read, value) {
      if(read) {
        return this.nr42;
      }
      return this.nr42 = value;
    },
    nr43Op: function(read, value) {
      if(read) {
        return this.nr43;
      }
      return this.nr43 = value;
    },
    nr44Op: function(read, value) {
      if(read) {
        return this.nr44;
      }
      return this.nr44 = value;
    },
    nr50Op: function(read, value) {
      if(read) {
        return this.nr50;
      }
      return this.nr50 = value;
    },
    nr51Op: function(read, value) {
      if(read) {
        return this.nr51;
      }
      return this.nr51 = value;
    },
    nr52Op: function(read, value) {
      if(read) {
        return this.nr52;
      }
      return this.nr52 = value;
    }
  }

  return {
    create: function() {
      var sound = Object.create(proto);
      sound.init();
      return sound;
    }
  }
});
