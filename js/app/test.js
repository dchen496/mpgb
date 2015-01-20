define(function(require) {
  "use strict"
  var cpuIsa = require('./cpu-isa');
  var modules = [];
  modules.push(['cpu-isa', cpuIsa]);

  return function() {
    var success = true;
    var exp = null;
    for(var i = 0; i < modules.length; i++) {
      var res = modules[i][1].test();
      if(!res) {
        console.log(modules[i][0], "failed");
      }
      success = success && res;
    }
    if(!success) {
      return "FAIL";
    } else {
      return "PASS";
    }
  }
});
