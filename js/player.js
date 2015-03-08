requirejs.config({
  baseUrl: 'js/lib',
  paths: {
    app: '../app'
  }
});

// Start the main app logic.
requirejs(['app/player'], function(main) {
  main();
});
