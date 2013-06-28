// Controller dei video.
Video = function(filesystem, container, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  this.container = $(container);
  var v = this.container;

  // v.addEventListener('loadstart', function(e) {
  //   console.log("[Video - v.loadstart %o", e);
  // });
  // v.addEventListener('progress', function(e) {
  //   console.log("[Video - v.progress %o", e);
  // })
  // v.addEventListener('suspend', function(e) {
  //   console.log("[Video - v.suspend %o", e);
  // });
  // v.addEventListener('abort', function(e) {
  //   console.log("[Video - v.abort %o, reason: %o");
  // });
  v.addEventListener('error', function(e) {
    console.log("[Video] - Errore playback per %o, reason %o", v.currentSrc, failed(e));
    this.filer.deleteFile(v.currentSrc);
    this.loadNext();
  }.bind(this));
  // v.addEventListener('emptied', function(e) {
  //   console.log("[Video - v.emptied %o", e);
  // });
  // v.addEventListener('stalled', function(e) {
  //   console.log("[Video - v.stalled %o", e);
  // });
  // v.addEventListener('loadedmetadata', function(e) {
  //   console.log("[Video - v.loadedmetadata %o", e);
  // });
  // v.addEventListener('loadeddata', function(e) {
  //   console.log("[Video - v.loadeddata %o", e);
  // });
  // v.addEventListener('canplay', function(e) {
  //   console.log("[Video - v.canplay %o", e);
  // });
  // v.addEventListener('canplaythrough', function(e) {
  //   console.log("[Video - v.canplaythrough %o", e);
  // });
  // v.addEventListener('playing', function(e) {
  //   console.log("[Video - v.playing %o", e);
  // });
  // v.addEventListener('waiting', function(e) {
  //   console.log("[Video - v.waiting %o", e);
  // });
  // v.addEventListener('seeking', function(e) {
  //   console.log("[Video - v.seeking %o", e);
  // });
  // v.addEventListener('seeked', function(e) {
  //   console.log("[Video - v.seeked %o", e);
  // });
  // v.addEventListener('play', function(e) {
  //   console.log("[Video - v.play. %o", e);
  // });
  // v.addEventListener('ended', function(e) {
  //   console.log("[Video - v.ended. %o", e);
  //   // this.loadNext();
  // }.bind(this));
};

Video.prototype.open = function(path) {
  this.filesystem.root.getFile(path,
			       {},
			       this.loadVideo.bind(this),
			       error.bind(null, "getFile " + path));
};

Video.prototype.loadVideo = function(entry) {
  // console.log("Chiamata loadVideo con file %o", entry.name);
  var vd = $('#video');
  var my_filer = this.filer;
  vd.src = entry.toURL();
  vd.removeAttribute('controls');
  vd.pause();
  setTimeout(function() {
    vd.play();
    this.pausing = false;
  }.bind(this), 2000)
};

Video.prototype.loadNext = function() {
  var tmp = this.filer.getNext();
  if (tmp)
    this.open(tmp);
};

Video.prototype.hasEnded = function() {
  var v = $('#video');
  try {
    if (v.ended) {
      // console.log("[Video - Il video e' finito, lo dice lui stesso!");
      return true;
    }
    if (v.currentTime == v.duration) {
      // console.log("[Video - Playback terminato");
      return true;
    }
    return false;
  } catch (x) {
    console.log("[Video - Errore calcolando hasEnded, diciamo di no: %o, currentSrc:", v.currentSrc);
    return false;
  }
};

// Solo dopo lo start iniziale, setto le callback
// mie per continuare a playare
Video.prototype.setupCallbacks = function() {
  console.log("[Video - setup della callback veloce]");
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
