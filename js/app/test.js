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
        var res = modules[i].test();
        msg = msg + names[i];
        if(res) {
          msg = msg + " PASS";
        } else {
          msg = msg + " FAIL";
        }
        msg = msg + "<br />";
        success = success && res;
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
