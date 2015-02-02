requirejs.config({
  baseUrl: 'js/lib',
  paths: {
    app: '../app'
  }
});

// Start the main app logic.
requirejs(['app/test'], function(test) {
  test();
});
