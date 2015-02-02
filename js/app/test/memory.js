define(function() {
  "use strict"

  var proto = {
    _init: function(image) {
      this.image = image;
    },

    read: function(addr) {
      return this._op(addr, true, 0);
    },
    write: function(addr, value) {
      this._op(addr, false, value);
    },
    read16: function(addr) {
      var lo = this._op(addr, true, 0);
      var hi = this._op(addr + 1, true, 0);
      return (hi << 8) | lo;
    },
    write16: function(addr, value) {
      this._op(addr, false, value & 0xff);
      this._op(addr + 1, false, value >> 8);
      return value;
    },

    _op: function(addr, read, value) {
      addr %= this.image.length;
      if(read) {
        return this.image[addr];
      }
      return this.image[addr] = value;
    },
  }

  return {
    create: function(image) {
      var mem = Object.create(proto);
      mem._init(image);
      return mem;
    }
  }
});
