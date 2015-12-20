var map, displayTweet, template, geometryEng, limit,
  counter = 0,
  $APP = {
    "tweets" : {},
    "filter": null,
    "locationAdvice": "Para preservar la privacidad de los usuarios, se han incluído un margen de error en las localizaciones",
    "initialized": true,
    "debug": false
  };


require([
  "esri/map",

  "esri/geometry/geometryEngine",
  "esri/geometry/Point",
  "esri/geometry/webMercatorUtils",

  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",

  "esri/graphic",
  "esri/graphicsUtils",

  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",

  "dojo/_base/Color",
  "dojo/request",

  "esri/dijit/PopupTemplate",

  "esri/renderers/SimpleRenderer",
  "esri/renderers/ScaleDependentRenderer",

  "jquery",

  "dojo/domReady!"
], function(
  Map,
  geometryEngine, Point, webMercatorUtils,
  FeatureLayer,  GraphicsLayer,
  Graphic, graphicsUtils,
  PictureMarkerSymbol, SimpleLineSymbol, SimpleMarkerSymbol,
  Color, request,
  PopupTemplate,
  SimpleRenderer, ScaleDependentRenderer,
  $
  ){

  var i, tweets, symbol, bb, point, is_contained, content, labels, spainLimits, loadLimit,
    user, locations, aux, new_graphic, loc, socket,
  hour = new Date(Date.now()).getHours(),
    basemap = "gray";

  try{

    $("#tos i").click(function(){
      $("#tos").css("display", "none")
      $("#filter, #timeline").css("top","60px");
      $("#basemap").css("top","140px");
      $(".esriSimpleSlider").css("margin-top","15px");

    });

    if(hour > 19 || hour < 8){
      basemap = "dark-gray";
      $("body").addClass("dark");
      $("#attr").addClass("on");
      $("#basemap").addClass("on");
    }

    map = new Map("mapDiv", {
      center: [-0.32669, 39.541780],
      zoom: 6,
      basemap: basemap,
      showAttribution: false,
      logo: false
    });

    // Hide Labels
    labels = map.getLayer("layer1");
    labels.setVisibility(false);

    geometryEng = geometryEngine;

    spainLimits = new FeatureLayer("http://services2.arcgis.com/N7xJ30qLk08SBVO4/arcgis/rest/services/Espa%C3%B1a_simplificada/FeatureServer/0",{id:"boundaries", className: "boundaries"});
    spainLimits.setScaleRange(0,0);

    $APP.tweetLayer = new GraphicsLayer({id: "tweets"});

    symbol = new SimpleMarkerSymbol(
      SimpleMarkerSymbol.STYLE_CIRCLE,
      10,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color( [255, 255, 255] ), 1),
      new Color( [5, 112, 176, 1] )
    );

    map.addLayers([spainLimits, $APP.tweetLayer]);

    loadLimit = function(){
      if(boundaries.graphics[0] && boundaries.graphics[0].geometry){
        limit = boundaries.graphics[0].geometry;
      }else{
        setTimeout(loadLimit, 500);
      }
    };

    map.on("layer-add-result", function(obj) {
      if(obj.layer.id === "boundaries"){
        boundaries = map.getLayer("boundaries");

        boundaries.on("update-end",function(){
          //debug("log", "Boundaries loaded", limit);
          loadLimit();

          if($APP.initialized === false){
            $APP.initialized = true;
            request("http://80.85.87.124:8080/tweets",{headers: { "X-Requested-With": null}}).then(
              function(text){
                debug("log", "Recibido! ", formatDate(new Date(Date.now())));
                tweets = JSON.parse(text);
                for(i = 0; i < tweets.length; i++){

                  displayTweet(tweets[i])
                }
                debug("log", "Terminamos! ", formatDate(new Date(Date.now())));
              });
            }
        });
      }
    });


    //debug("log", "Start! ", formatDate(new Date(Date.now())));

    $.extend($.expr[":"], {
      "containsIN": function(elem, i, match, array) {
        return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
      }
    });

    displayTweet = function(tweet){
      //debug("log", tweet);

      var i, display = "block";


      if(limit && ( $APP.filter === null || (tweet.text.indexOf($APP.filter) != -1 ))){

        if(tweet.place && tweet.place.bounding_box){
          bb = tweet.place.bounding_box;
          //debug("log", "tweet con: place");
        }else if(tweet.user && tweet.user.geocoding){
          //bb = tweet.user.geocoding.boundingbox;

          locations = tweet.user.geocoding.locations;
          if(locations && locations.length > 0){
            aux = locations[0].extent;
            bb = [aux.ymin, aux.ymax, aux.xmin, aux.xmax];
          }
          //debug("log", "tweet con: user.geocoding");
        }else{
          // TODO: Mostrar estos tweets
          //debug("log", "ni place ni user.geocoding");

          //debug("log", "Tendrá geo o coordinates")
          //debug("log", "tweet=",tweet);
          if(tweet.geo){
            //debug("log", "Geo = ",tweet.geo);
          }
          if(tweet.coordinates){
            //debug("log", "Coordinates = ",tweet.coordinates);
          }
        }

        if(bb){

          i = 0;
          do{
            item = {
              lat: 0,
              lon: 0
            };

            item.lat = getRandomArbitrary(parseFloat(bb[0]), parseFloat(bb[1]));
            item.lon = getRandomArbitrary(parseFloat(bb[2]), parseFloat(bb[3]));

            point = new Point(item.lon, item.lat);
            point = webMercatorUtils.geographicToWebMercator(point);
            i++;
            is_contained = geometryEng.contains(limit, point);
          }while(!is_contained && i < 20);

          //TODO: check if no contained ... is added? (non-sense)
          //check if filter
          if(!is_contained){
            display = "none";
          }

          content = renderTweet(tweet, display, "popUp");

          template = new PopupTemplate({
            title: "{name}",
            "description": content,
            "className": "tweet"
          });

          if(is_contained){
            loc = new Point(item.lon, item.lat);
            new_graphic = new Graphic(loc, symbol, tweet, template);
            $APP.tweetLayer.add(new_graphic);
            $APP.tweets[tweet._id] = new_graphic;

            counter++;
            $("#counter").text(counter);
          }

          content = renderTweet(tweet, display, "screen");
          $("#timeline ul").prepend(content);
        }else{
          debug("warn", "Error: no boundary box found");
        }
      }else{
        debug("warn","Error: trying to display tweet but no boundaries layer loaded")
      }
    };

    socket = io.connect('http://80.85.87.124:8080');

    socket.on('connect', function () {
      debug("log", 'Socket connected');
      socket
        .on('tweets', function(tweet) {
          //debug("log", "New tweet! ",tweet);
          displayTweet(tweet);
        });
    });

    map.on("basemap-change",function(){
      labels = map.getLayer(map.layerIds[1]);
      labels.setVisibility(false);
    });

    //**************************************************************
    // Button behaviours

    $(".basemap").click(function(){
      toggleBasemap();
      mixpanel.track("Change basemap");
    });

    $('#more-maps, #esri-maps .close').click(function(){
      $("#esri-maps").toggleClass("hidden");

    });
    $('#more-maps').click(function(){
      mixpanel.track("View more maps");
    });

    $("#social-media .embed, #embed .close").click(function(e){
      e.preventDefault();
      $("#embed").toggleClass('show');
    });

    $('#esri-maps form input[type="submit"]').click(function(){
      user = {
        "$email": $('#mce-EMAIL').val(),
        "name": $('#mce-FNAME').val()
      };

      mixpanel.people.set(user);
      mixpanel.identify("12148");
      mixpanel.track("New subscriber", user);
      mixpanel.register("$email");
    });

    $("#esri-maps a").click(function(){
      mixpanel.track("Click [a] more-maps", {
        text: $(this).text(),
        href: $(this).attr('href')
      });
    });

    $('#beta .close').click(function(){
      $("#beta").removeClass("show");
    });

    $('#ie .close').click(function(){
      $("#ie").addClass("hide");
    });

    $('#tos a').click(function(){
      $("#cookies").show();
      if($("#cookies").hasClass("hide")){
        $("#cookies").removeClass("hide");
      }
    });

    $('#cookies .close').click(function(){
      $("#cookies").addClass("hide");
    });

    $("#social-media a").click(function(){
      mixpanel.track("Social share",{
        network: $(this).attr("class")
      });
    });

    // End button behaviours
    //**************************************************************

    loadScript('js/chardinjs.js',function(){
      $('body').chardinJs('start');
    });

    loadScript('http://s3.amazonaws.com/downloads.mailchimp.com/js/mc-validate.js',function(){
      (function($) {window.fnames = new Array(); window.ftypes = new Array();fnames[0]='EMAIL';ftypes[0]='email';fnames[1]='FNAME';ftypes[1]='text';
        $.extend($.validator.messages, {
          required: "Este campo es obligatorio.",
          remote: "Por favor, rellena este campo.",
          email: "Por favor, escribe una dirección de correo válida",
          url: "Por favor, escribe una URL válida.",
          date: "Por favor, escribe una fecha válida.",
          dateISO: "Por favor, escribe una fecha (ISO) válida.",
          number: "Por favor, escribe un número entero válido.",
          digits: "Por favor, escribe sólo dígitos.",
          creditcard: "Por favor, escribe un número de tarjeta válido.",
          equalTo: "Por favor, escribe el mismo valor de nuevo.",
          accept: "Por favor, escribe un valor con una extensión aceptada.",
          maxlength: $.validator.format("Por favor, no escribas más de {0} caracteres."),
          minlength: $.validator.format("Por favor, no escribas menos de {0} caracteres."),
          rangelength: $.validator.format("Por favor, escribe un valor entre {0} y {1} caracteres."),
          range: $.validator.format("Por favor, escribe un valor entre {0} y {1}."),
          max: $.validator.format("Por favor, escribe un valor menor o igual a {0}."),
          min: $.validator.format("Por favor, escribe un valor mayor o igual a {0}.")
        });}(jQuery));var $mcj = jQuery.noConflict(true);
    });
  }catch(e){
    showError(e);
  }

});


