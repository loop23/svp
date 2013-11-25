// Controller dei video.
Video = function(filesystem, container, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  this.container = $(container);
  var v = this.container;

  v.addEventListener('error', function(e) {
    console.log("[Video] - Errore playback per %o, reason %o", v.currentSrc, failed(e));
    this.filer.deleteFile(v.currentSrc);
    this.loadNext();
  }.bind(this));
};

// Apre il file locale in path e e lo
Video.prototype.open = function(entry) {
  console.log("[Video].open con entry?: %o", entry);
  this.filesystem.root.getFile(entry.localFile,
			       {},
			       this.loadVideo.bind(this),
			       error); //.bind(null, "getFile: " + item.localFile));
}

Video.prototype.loadVideo = function(entry) {
  console.log("[Video] loadVideo con entry %o", entry);
  var vd = $('#video');
  vd.src = entry.toURL();
  vd.removeAttribute('controls');
  vd.pause();
  setTimeout(function() {
    vd.play();
    this.pausing = false;
  }.bind(this), 2000)
};

Video.prototype.loadNext = function() {
  var item = this.filer.getNext();
  console.log("[Video] loadNext, item tornato da filer: %o", item);
  if (item)
    this.open(item);
};

Video.prototype.hasEnded = function() {
  var v = $('#video');
  try {
    if (v.ended) {
      return true;
    }
    if (v.currentTime == v.duration) {
      return true;
    }
    return false;
  } catch (x) {
    console.log("[Video] - Errore calcolando hasEnded, diciamo di no: %o, $('video').currentSrc: ", v.currentSrc);
    return false;
  }
};

// Solo dopo lo start iniziale, setto le callback
// mie per continuare a playare
Video.prototype.setupCallbacks = function() {
  console.log("[Video] - setup della callback veloce");
  var _me = this;
  this.pausing = false;
  // Questa viene eseguita spesso, controlla se il video e' finito
  setInterval(function() {
    // console.log("Dentro cb veloce, pausing? %o", _me.pausing);
    if (_me.pausing)
      return;
    // console.log("[Video - Vediamo se e' finito, me: %o", _me);
    if (_me.hasEnded()) {
      _me.pausing = true;
      _me.loadNext();
    }
  }, 100);
}

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
