var dojoConfig = (function () {
  var base = "http://localhost:9090"

  return {
    async: true,
    isDebug: true,
    parseOnLoad: false,
    packages: [{
      name: 'jquery',
      location: 'http://ajax.googleapis.com/ajax/libs/jquery/1.11.1',
      main: 'jquery'
    }]
  };
})();