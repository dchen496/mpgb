(function() {
  "use strict"

  function test() {
    var success = true;
    var exp = null;
    //var modules = ['GBC', 'EventManager', 'CPU'];
    var modules = ['CPUISA'];
    for(var i = 0; i < modules.length; i++) {
      var res = JSGBC[modules[i]].test();
      if(!res) {
        console.log(modules[i], "failed");
      }
      success = success && res;
    }
    if(!success) {
      return "FAIL";
    } else {
      return "PASS";
    }
  }
})();
