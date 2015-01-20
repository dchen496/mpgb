define(function() {
  "use strict" 
  var proto = {
    init: function(gbc) {
      this.clock = 0;
      this.events = [];
      this.gbc = gbc;
      this.cores = [];
    },
    addEvent: function(clock, callback) {
      var i = 0;
      while(i < this.events.length && this.events[i].clock > clock)
        i++;
      var tail = this.events.splice(i);
      this.events.push({clock: clock, callback: callback})
      this.events = this.events.concat(tail);
    },
    addCore: function(core) {
      this.cores.push(core);
    },
    run: function(clock) {
      var gbc = this.gbc;

      while(this.clock < clock) {
        var eventClock = clock;
        if(this.events.length > 0) {
          eventClock = Math.min(clock, this.events[this.events.length-1].clock);
        }

        var cpuClock = gbc.cpu.advance(eventClock);

        for(var i = 0; i < this.cores.length; i++) {
          this.cores[i].advance(cpuClock);
        }

        this.clock = cpuClock;

        while(this.events.length > 0) {
          var nextEvent = this.events[this.events.length-1];
          if(nextEvent.clock > this.clock)
            break;
          if(nextEvent.callback != null)
            nextEvent.callback.apply(gbc);
          this.events.pop();
        }
      }
    }
  }

  return {
    create: function(gbc) {
      var evm = Object.create(proto);
      evm.init(gbc);
      return evm;
    },
    test: function() {
      var success = true;
      var eventScheduled = false;
      var gbc = {
        cpu: {
          advance: function(clock) {
            if(!eventScheduled) {
              evm.addEvent(27, null);
              eventScheduled = true;
              return 13;
            }
            return clock;
          }
        }
      }
      var dummyCore = {
        clocks: [],
        advance: function(clock) {
          if(clock == 27) {
            evm.addEvent(42, null);
          }
          this.clocks.push(clock);
        }
      }
      var evm = JSGBC.EventManager.create(gbc);
      evm.addCore(dummyCore);
      evm.addEvent(17, function() {
          evm.addEvent(35, null);
      });

      evm.run(50);
      
      var expected = [13, 17, 27, 35, 42, 50];
      for(var i = 0; i < expected.length; i++) {
        if(expected[i] != dummyCore.clocks[i]) {
          console.log(dummyCore.clocks);
          return false;
        }
      }
      return true;
    }
  }

});
