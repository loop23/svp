function failed(e) {
   // video playback failed - show a message saying why
   if (!e.target.error) {
       console.log("Nessun errore");
       return;
   }
   switch (e.target.error.code) {
     case e.target.error.MEDIA_ERR_ABORTED:
       alert('You aborted the video playback.');
       break;
     case e.target.error.MEDIA_ERR_NETWORK:
       alert('A network error caused the video download to fail part-way.');
       break;
     case e.target.error.MEDIA_ERR_DECODE:
       alert('The video playback was aborted due to a corruption problem or because the video used features your browser did not support.');
       break;
     case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
       alert('The video could not be loaded, either because the server or network failed or because the format is not supported.');
       break;
     default:
       alert('An unknown error occurred.');
       break;
   }
 }

Video = function(filesystem, container, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  this.container = $(container);
  var v = this.container;
  v.onloadstart = function(e) {
    console.log("v.loadstart %o", e);
  }
  v.onprogress = function(e) {
    console.log("v.progress %o", e);
  }
  v.onsuspend = function(e) {
    console.log("v.suspend %o", e);
  }
  v.onabort = function(e) {
    console.log("v.abort %o, reason: %o", e, failed(e));
  }
  v.onerror = function(e) {
    console.log("v.error %o, reason: %o", e, failed(e));
  }
  v.onemptied = function(e) {
    console.log("v.emptied %o", e);
  }
  v.onstalled = function(e) {
    console.log("v.stalled %o", e);
  }
  v.onloadedmetadata = function(e) {
    console.log("v.loadedmetadata %o", e);
  }
  v.onloadeddata = function(e) {
    console.log("v.loadeddata %o", e);
  }
  v.oncanplay = function(e) {
    console.log("v.canplay %o", e);
  }
  v.oncanplaythrough = function(e) {
    console.log("v.canplaythrough %o", e);
  }
  v.onplaying = function(e) {
    console.log("v.playing %o", e);
  }
  v.onwaiting = function(e) {
    console.log("v.waiting %o", e);
  }
  v.onseeking = function(e) {
    console.log("v.seeking %o", e);
  }
  v.onseeked = function(e) {
    console.log("v.seeked %o", e);
  }
  v.onended = function(e) {
    console.log("v.ended %o", e);
  }
  v.onplay = function(e) {
    console.log("v.play. %o", e);
  }
};

Video.prototype.open = function(path) {
  this.filesystem.root.getFile(
    path,
    {},
    this.load.bind(this),
    error.bind(null, "getFile " + path));
};

Video.prototype.load = function(entry) {
  // console.log('Opening (in Video), fullpath: %o, toUrl: %o', entry.fullPath, entry.toURL());
  // entry.file(function (file) { console.log("Chi e' costui? %o", file); });
  // this.setCurrentPath(entry.fullPath);
  var vd = $('#video');
  var my_filer = this.filer;
  vd.src = entry.toURL();
  vd.removeAttribute('controls');
  // Maledetto, se glielo setto subito non lo prende, e manco con la cb.
  // Una volta pero' se l'era presa e aumentava ogni volta!
  // setTimeout(function() {
  //   if (!vd.endedCallbackSet) {
  //     console.log("Setting callback once");
  //     // This event is supposed to work from 28.x and some.
  //     // For the time being better off leaving it commented!
  //     vd.addEventListener('ended', function(v) {
  // 	console.log("Triggered ended di video %o", v);
  // 	my_filer.getNext();
  //     });
  //     vd.endedCallbackSet = true;
  //     // clearTimeout(my_filer.initial_cb);
  //   }
  // } , 1000);
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
      console.log("Il video e' finito, lo dice lui stesso!");
      return true;
    }
    if (v.currentTime == v.duration) {
      console.log("Playback terminato");
      return true;
    }
    if (v.currentTime == 0) {
	console.log("Ancora non started? riproviamoci!");
	return true;
    }
    if (v.error) {
      console.log("Playback error %o for video %o",
		  v.error.toString(),
		  v.currentSrc);
      filer.deleteFile(v.currentSrc);
      return true;
    }
    return false;
  } catch (x) {
    console.log("Errore calcolando hasEnded, diciamo di no: %o, currentSrc:", v.currentSrc);
    return false;
  }
};
