define(['sprintf'], function(sprintf) {
  "use strict" 

  var CLOCK_MAX = Math.pow(2, 53);

  // statically allocated event table
  // events with lower numbers are executed first
  var events = {
    TIMER_OVERFLOW: 0,
    VIDEO_LINE: 1,
    VIDEO_HBLANK: 2,
    PAUSE: 3
  };

  var proto = {
    init: function() {
      var n = Object.keys(events).length;
      this.clocks = Array(n);
      this.callbacks = Array(n);
      this.contexts = Array(n);
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
      var bestClock = CLOCK_MAX;
      var ev = -1;
      for(var i = 0; i < this.clocks.length; i++) {
        var c = this.clocks[i];
        if(c >= this.clock && c < bestClock) {
          ev = i;
          bestClock = c;
        }
      }
      this.nextEventCache = ev;
      this.nextClockCache = bestClock;
      this.nextValid = true;
      return bestClock;
    },
    // It is safe to call register() and update() within a callback.
    register: function(ev, clock, context, callback) {
      this.callbacks[ev] = callback;
      this.contexts[ev] = context;
      this.update(ev, clock);
    },
    update: function(ev, clock) {
      if(clock < 0 || clock < this.clock) {
        clock = CLOCK_MAX;
      }
      this.nextValid = false;
      this.clocks[ev] = clock;
    },
    unregister: function(ev) {
      this.nextValid = false;
      this.clocks[ev] = CLOCK_MAX;
    },
    runEvent: function() {
      var next = this.nextClock();
      var ev = this.nextEvent();
      if(ev < 0)
        return;
      this.unregister(ev);
      this.callbacks[ev].call(this.contexts[ev], next);
      this.clock = next;
    },
    pause: function() {
      this.update(events.PAUSE, this.clock);
    },

    dump: function() {
      var keys = Object.keys(events);
      var res = [];
      for(var i = 0; i < keys.length; i++) {
        var ev = events[keys[i]];
        if(this.clocks[ev] == CLOCK_MAX) {
          res.push(sprintf("%s: DISABLED", keys[i]));
        } else {
          res.push(sprintf("%s: %d", keys[i], this.clocks[ev]));
        }
      }
      return res.join("\n");
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
