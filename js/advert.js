// chiamata da Video.showAdvert, carica un advert;
// Inizialmente lo toglieva dopo 6 secs.. ma ora non
// piu' perche' altrove gestiamo il fatto di mettere in front
// o in background la sua div; qui la settiamo e basta.

// Salviamo le vecchie request in advertCache per ETag;
// Probabilmente sarebbe meglio salvarle su disco, cosi'
// permarrebbero anche fra gli startup, ma non so se ho tempo.
var advertCache = {};

function displayAdvert() {
  $('#video-overlay').style.display = 'block';
  window.setTimeout(window.mainController.getNext.bind(window.mainController),
						       ADVERT_TIMEOUT);
}

function loadAdvert() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET',
           ADSERVER_URL,
	   true);
  xhr.responseType = 'blob';
  xhr.onload = function() {
    console.log("Loaded an advert! cool! loading but not quite displaying it");
    advertCache[this.getResponseHeader('ETag')] =
      $('#video-overlay img').src =
      window.URL.createObjectURL(this.response);
    displayAdvert();
  };
  xhr.onerror = function() {
    console.error("Error retrieving advert - displaying a random old one!");
    var ka = Object.keys(advertCache);
    var idx = Math.floor(Math.random() * ka.length);
    $('#video-overlay img').src = advertCache[ka[idx]];
    displayAdvert();
  };
  xhr.send();
  return true;
}
