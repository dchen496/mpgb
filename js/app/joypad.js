var joy = null;
define(function() {
  "use strict"
  var proto = {
    init: function(cpu) {
      this.cpu = cpu;
      this.directionSelect = 0;
      this.buttonSelect = 0;
      this.directionsPressed = 0;
      this.buttonsPressed = 0;
    },
    joypOp: function(read, value) {
      if(read) {
        var ret = 0;
        if(!this.buttonSelect) {
          ret |= this.buttonsPressed;
        }
        if(!this.directionSelect) {
          ret |= this.directionsPressed;
        }
        return ~ret;
      }
      this.directionSelect = (value >> 4) & 1;
      this.buttonSelect = (value >> 5) & 1;
      return value;
    },
    pressKey: function(buttons, number) {
      if(buttons) {
        this.buttonsPressed |= (1 << number);
      } else {
        this.directionsPressed |= (1 << number);
      }
    },
    unpressKey: function(buttons, number) {
      if(buttons) {
        this.buttonsPressed &= ~(1 << number);
      } else {
        this.directionsPressed &= ~(1 << number);
      }
    }
  }

  return {
    create: function(cpu) {
      var joypad = Object.create(proto);
      joypad.init(cpu);
      joy = joypad;
      return joypad;
    }
  }
});
