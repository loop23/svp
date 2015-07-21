// Controller dei video.
Video = function(filesystem, container) {
  console.info("Video initializing with %o, %o, %o", filesystem, container);
  this.filesystem = filesystem;
  this.container = $(container);
  // When we open a plItem, we set the title if need to
  this.title = '';
  // Try putting a handler to remove a file in case it's corrupted
  this.container.addEventListener('error', function(e) {
    console.error("[Video] - Errore playback per %o, reason %o",
		  this.container.currentSrc,
		  this.failed(e));
    window.mainController.deleteFile(this.container.currentSrc);
    window.mainController.getNext();
  }.bind(this));
};

// Apre il file locale in path e chiama loadVideo nella callback
Video.prototype.openPlItem = function(plItem) {
  console.debug("[Video].openPlItem con: %o", plItem);
  this.title = plItem.title;
  this.filesystem.root.getFile(plItem.localFile,
			       {},
			       this.loadVideo.bind(this),
			       error);
};

// Loads a video from a fileEntry; Called as callback of
Video.prototype.loadVideo = function(fileEntry) {
  console.debug("[Video] loadVideo con fileEntry %o", fileEntry);
  this.container.src = fileEntry.toURL();
  this.showTitle();
  this.container.play();
  $('#video-overlay').style.display = 'none';
};

// loads a video from a url - to be used by VideoAdvert
Video.prototype.loadUrl = function(url) {
  console.debug("[Video] - loading from url: %s", url);
  this.container.src = url;
  this.container.play();
  $('#video-overlay').style.display = 'none';
},

// Displays title and (not) clear it after a while
Video.prototype.showTitle = function() {
  if (this.title) {
    $('#video-titolo').innerHTML = this.title;
    show('#video-titolo');
    // window.setTimeout(function() {
    //   $('#video-titolo').innerHTML = '';
    // }, 4000);
  }
};

/*Video.prototype.loadNext = function() {
  var plItem = window.mainController.getNext();
  if (!plItem) { // Questo dovrebbe prevenire alcuni tipi di lockup?
    setTimeout(function() {
      this.loadNext();
    }, 3000);
    return false;
  }
  var v = this;
  var overlay =
  console.debug("[Video] loadNext, plItem tornato da mainController: %o, mostro ads", plItem);
  overlay.style.display = 'block';
  $('#video').style.display = 'none';
  console.debug("opening new video in bg");
  this.openPlItem(plItem);
  return null;
};
 */

// Solo dopo lo start iniziale, setto le callback
// mie per continuare a playare
Video.prototype.setupCallbacks = function() {
  console.info("[Video] - setup della callback veloce");
  $('#video').onended = function() {
    window.mainController.getNext();
  };
};

// video playback failed - show a message saying why
Video.prototype.failed = function(e) {
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
