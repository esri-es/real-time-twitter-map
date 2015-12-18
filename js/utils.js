/************************************************************************************
 * debug
 *
 * @param a
 * @param b
 */
function debug(a, b){
    if (document.location.hostname == "localhost"){
      console.log(a, b);
    }
}



/************************************************************************************
 * jump
 *
 * @param id
 */
function jump(id){
  var tweet_node = $APP.tweets[id];

  $APP.last_animation = tweet_node;

  try{
    //var a = tweet_node.asdasd.asd;
    map.centerAt(tweet_node.geometry);

    map.on("pan-end",function(){
      if($APP.last_animation){
        var domElem = $APP.last_animation.getShape().rawNode;
        console.log("disparo!");
        if(!$(domElem).attr("jump")){
          $(domElem).attr("jump", true);

          //Wait until remove class (to be able to jump again)
          setTimeout(function(id){

            var domElem = $APP.last_animation.getShape().rawNode;
            $(domElem).removeAttr("jump");
            $APP.last_animation = null;
          },1000);

        }
      }

    });
  }catch(e){
    showError(e);
  }
}



/************************************************************************************
 * showError
 * @param e
 */
function showError(e){
  console.error("Error: ",e);

  $("#errorCode").html(e);
  $("#beta").addClass("show");


}



/************************************************************************************
 * loadScript
 *
 * @param path
 * @param callback
 */
function loadScript(path, callback) {

  var done = false;
  var scr = document.createElement('script');

  scr.onload = handleLoad;
  scr.onreadystatechange = handleReadyStateChange;
  scr.onerror = handleError;
  scr.src = path;
  document.body.appendChild(scr);

  function handleLoad() {
    if (!done) {
      done = true;
      callback(path, "ok");
    }
  }

  function handleReadyStateChange() {
    var state;

    if (!done) {
      state = scr.readyState;
      if (state === "complete") {
        handleLoad();
      }
    }
  }
  function handleError() {
    if (!done) {
      done = true;
      callback(path, "error");
    }
  }
}



/************************************************************************************
 * filter
 */
function filter(){
  //e.preventDefault();
  //console.log("filtro=",$("#filter input").val())
  $APP.filter = $("#filter input").val();

  if($APP.filter === ""){
    $APP.filter = null;
    $APP.tweetLayer.clear();
    for (var id in $APP.tweets) {
      if ($APP.tweets.hasOwnProperty(id)) {
        $APP.tweetLayer.add($APP.tweets[id]);
        //alert(key + " -> " + p[key]);
      }
    }
    var all_tweets = $("#timeline ul li");
    all_tweets.show();
    counter = all_tweets.length;

  }else{
    var i, tweet_layer = map.getLayer("tweets");

    // Show hidden tweets
    var show_tweets = $("#timeline ul > li:contains("+$APP.filter+")");
    for(i = 0 ; i < show_tweets.length; i++){
      tweet_graphic = $APP.tweets[$(show_tweets[i]).attr("id")];
      if(tweet_graphic && tweet_graphic.getShape && tweet_graphic.getShape()){
        tweet_layer.add(tweet_graphic);
      }
    };
    show_tweets.show()

    var hide_tweets = $("#timeline ul > li:not(:containsIN("+$APP.filter+"))");

    var tweet_graphic;

    for(i = 0 ; i < hide_tweets.length; i++){
      tweet_graphic = $APP.tweets[$(hide_tweets[i]).attr("id")];
      tweet_layer.remove(tweet_graphic);
    };
    hide_tweets.hide();
    counter = $("#timeline ul > li:containsIN("+$APP.filter+")").length;
  }

  $("#counter").text(counter);

};


/************************************************************************************
 * renderTweet
 *
 * @param tweet
 * @param display
 * @param type
 */
function renderTweet(tweet, display, type){

  var content = "";

  if(type === "screen"){
    content = '<li id="'+ tweet._id +'" class="tweet" style="display:'+display+'">';
  }

  content += '<a href="http://www.twitter.com/'+ tweet.user.screen_name +'" target="_blank"><img src="'+tweet.user.profile_image_url+'"></a>'+
    '<span class="usename"><a href="http://www.twitter.com/'+ tweet.user.screen_name +'" target="_blank">@'+ tweet.user.screen_name + '</a></span><br>' +
    '<span class="rts"><i class="fa fa-retweet"></i>'+ (tweet.retweet_count? tweet.retweet_count : 0) + '</span> ' +
    '<span class="favs"><i class="fa fa-heart-o"></i>'+ (tweet.favorite_count? tweet.favorite_count : 0) + '</span><br>'+
    '<span class="location">'+ tweet.user.location + '</span> ';


  if(tweet.place){
    content += '<span class="place">'+ tweet.place + '</span>';
  }

  if(tweet.geo){
    content += '<span class="geo">'+ tweet.geo + '</span>';
  }
  content += 	'<br><span class="text">' + linkify(tweet.text) + '</span>';

  if(tweet.timestamp_ms){
    d = new Date(tweet.timestamp_ms);
    content += '<small>Enviado el ' + formatDate(d) + '</small>';
  }

  if(type === "screen"){
    content += 	'<div class="geolocate" id="'+ tweet._id +'" onclick="jump(\''+ tweet._id +'\')">'+
      '<i class="fa fa-map-marker"></i> Geolocalizar '+
      '<i class="fa fa-info-circle" title="'+ $APP.locationAdvice +'"></i></div>';

    content += '</li>';
  }


  return content;
}



/************************************************************************************
 * linkify
 *
 * @param inputText
 * @returns {XML|string}
 */
function linkify(inputText) {
  var replacedText, replacePattern1, replacePattern2, replacePattern3;

  //URLs starting with http://, https://, or ftp://
  replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

  //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
  replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

  //Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

  return replacedText;
}



/************************************************************************************
 * getRandomArbitrary
 *
 * @param min
 * @param max
 * @returns {*}
 */
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
};



/************************************************************************************
 * formatDate
 *
 * @param d
 * @returns {string}
 */
function formatDate(d){
  return [d.getMonth()+1,
    d.getDate(),
    d.getFullYear()].join('/')+' '+
    [d.getHours(),
      d.getMinutes(),
      d.getSeconds()].join(':');
};

function initializeTweets(){

//boundaries.setVisibility(false);
  if(!limit){
    setTimeout(initializeTweets, 500)
  }else{
    request("http://80.85.87.124:8080/tweets",{headers: { "X-Requested-With": null}}).then(
      function(text){
        console.log("Recibido! ", formatDate(new Date(Date.now())));
        tweets = JSON.parse(text);
        for(i = 0; i < tweets.length; i++){

          displayTweet(tweets[i])
        }
        debug("Terminamos! ", formatDate(new Date(Date.now())));
      });
  }


}

