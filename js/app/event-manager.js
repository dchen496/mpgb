define(function() {
  "use strict" 

  var CLOCK_MAX = (1 << 53);

  // statically allocate event table
  var events = {
    TIMER_OVERFLOW: 0
  };

  var proto = {
    init: function() {
      var n = Object.keys(events).length;
      this.clocks = Array(n);
      this.callbacks = Array(n);
      for(var i = 0; i < n; i++) {
        this.clocks[i] = CLOCK_MAX;
      }
      this.nextEventCache = -1;
      this.nextClockCache = CLOCK_MAX;
      this.nextValid = true;

      this.clock = 0;
    },
    nextEvent: function() {
      this.nextClock(); // fill cache
      return this.nextEventCache;
    },
    nextClock: function() {
      if(this.nextValid) 
        return this.nextClockCache;
      var clock = CLOCK_MAX;
      var ev = -1;
      for(var i = 0; i < events.length; i++) {
        var c = this.clocks[i];
        if(c > this.clock && c < clock) {
          ev = i;
          clock = c;
        }
      }
      this.nextEventCache = ev;
      this.nextClockCache = clock;
      this.nextValid = true;
      return clock;
    },
    register: function(ev, clock, callback) {
      if(clock < 0) {
        clock = CLOCK_MAX;
      }
      this.nextValid = false;
      this.clocks[ev] = clock;
      this.callbacks[ev] = callback;
    },
    unregister: function(ev) {
      this.nextCacheValid = false;
      this.clocks[ev] = CLOCK_MAX;
    },
    advance: function(clock) {
      var next;
      while((next = this.nextClock()) < clock) {
        var ev = this.nextEvent();
        this.callbacks[ev](next);

        this.unregister(ev);
      }
      this.clock = clock;
    }
  }

  return {
    create: function() {
      var evm = Object.create(proto);
      evm.init();
      return evm;
    },
    events: events
  }
});
