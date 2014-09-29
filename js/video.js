// Controller dei video.
Video = function(filesystem, container, filer) {
  console.info("Video initializing with %o, %o, %o", filesystem, container, filer);
  this.filesystem = filesystem;
  this.container = $(container);
  this.filer = filer;
  var v = this.container;
  this.container.addEventListener('error', function(e) {
    console.log("[Video] - Errore playback per %o, reason %o",
		this.container.currentSrc,
		failed(e));
    this.filer.deleteFile(this.container.currentSrc);
    this.loadNext();
  }.bind(this));
};

// Apre il file locale in path e chiama loadVideo nella callback
Video.prototype.openPlItem = function(plItem) {
  console.log("[Video].openPlItem con: %o", plItem);
  this.filesystem.root.getFile(plItem.localFile,
			       {},
			       this.loadVideo.bind(this),
			       error);
};

Video.prototype.showTitle = function(entry) {
  var text = $('#video-cc');
  if (entry.title) {
    text.innerHTML = entry.title;
    setTimeout(function() { text.innerHTML = ''; }, 2000);
  }
};
  
// Sets up a callaback that calls video.play in 2 secs
Video.prototype.loadVideo = function(fileEntry) {
  console.log("[Video] loadVideo con fileEntry %o", fileEntry);
  var vd = $('#video');
  this.showTitle(fileEntry); // TODO - mi sa che fileEntry non ha title, plItem ce l'ha
  vd.src = fileEntry.toURL();
  vd.removeAttribute('controls');
  vd.pause();
  this.showAdvert();
  window.setTimeout(function() {
    console.log("hiding ads and playing");
    $('#video-overlay').style.display  = 'none' ;
    $('#video').style.display = 'block';  
    $('#video').play();
  }, 6000);
};

Video.prototype.showAdvert = function() {
  loadAdvert();
};

Video.prototype.loadNext = function() {
  var plItem = window.filer.getNext();
  if (!plItem) { // Questo dovrebbe prevenire alcuni tipi di lockup?
    setTimeout(function() {
      this.loadNext();
    }, 3000);
    return false;
  }
  var v = this;
  var overlay = $('#video-overlay');
  console.log("[Video] loadNext, plItem tornato da filer: %o, mostro ads", plItem);
  overlay.style.display = 'block';
  $('#video').style.display = 'none';
  console.log("opening new video in bg");
  this.openPlItem(plItem);
  return null;
};

// Solo dopo lo start iniziale, setto le callback
// mie per continuare a playare
Video.prototype.setupCallbacks = function() {
  console.debug("[Video] - setup della callback veloce");
  $('#video').onended = function() {
    console.log("ended!");
    this.loadNext();
  }.bind(this);
};

function failed(e) {
 // video playback failed - show a message saying why
 if (!e.target.error) {
   return "Nessun errore";
 }
 switch (e.target.error.code) {
   case e.target.error.MEDIA_ERR_ABORTED:
     return 'You aborted the video playback.';
   case e.target.error.MEDIA_ERR_NETWORK:
     return 'A network error caused the video download to fail part-way.';
   case e.target.error.MEDIA_ERR_DECODE:
     return 'The video playback was aborted due to a corruption problem or because the video used features your browser did not support.';
   case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
     return 'The video could not be loaded, either because the server or network failed or because the format is not supported.';
   default:
     return 'An unknown error occurred';
 }
}
