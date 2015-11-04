(function() {
  "use strict"
  var names = ['cpu-isa'];
  var paths = names.map(function(s) { return './' + s });

  define(paths, function() {
    var modules = arguments;
    return function() {
      var success = true;
      var exp = null;
      var msg = "";
      for(var i = 0; i < modules.length; i++) {
        var tests = modules[i].tests;
        for(var j = 0; j < tests.length; j++) {
          var res;
          try {
            res = modules[i][tests[j]]();
          } catch(e) {
            res = false;
          }
          msg += names[i] + " " + tests[j];
          if(res) {
            msg += " PASS";
          } else {
            msg += " FAIL";
          }
          msg = msg + "<br />";
          success = success && res;
        }
      }
      if(success)
        msg = "<h1>PASS</h1>" + msg;
      else
        msg = "<h1>FAIL</h1>" + msg;
      document.write(msg);
      return success;
    }
  });
})();
