define(function() {
  "use strict"

  var buttons = {
    A : 0,
    B : 1,
    SELECT : 2,
    START : 3,
    RIGHT : 4,
    LEFT : 5,
    UP : 6,
    DOWN: 7
  }

  var proto = {
    init: function(cpu) {
      this.cpu = cpu;
      this.directionSelect = 0;
      this.buttonSelect = 0;
      this.buttonsPressed = 0;
    },
    joypOp: function(read, value) {
      if(read) {
        var ret = 0x0f;
        if(this.directionSelect) {
          ret &= ~(this.buttonsPressed >> 4);
        } else {
          ret |= (1 << 4);
        }
        if(this.buttonSelect) {
          ret &= ~(this.buttonsPressed & 0x0f);
        } else {
          ret |= (1 << 5);
        }
        return ret;
      }
      // this register is inverted
      var inv = ~value;
      this.directionSelect = (inv >> 4) & 1;
      this.buttonSelect = (inv >> 5) & 1;
      return value;
    },
    press: function(button) {
      this.buttonsPressed |= (1 << button);
    },
    unpress: function(button) {
      this.buttonsPressed &= ~(1 << button);
    }
  }

  return {
    create: function(cpu) {
      var joypad = Object.create(proto);
      joypad.init(cpu);
      return joypad;
    },
    buttons: buttons
  }
});
