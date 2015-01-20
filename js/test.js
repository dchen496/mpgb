requirejs.config({
  baseUrl: 'js/lib',
  paths: {
    app: '../app'
  }
});

require(['app/test'], function(test) {
  document.write(test());
});
