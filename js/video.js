Video = function(filesystem, container, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  this.container = $(container);

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
  var vd = $('video');
  var my_filer = this.filer;
  vd.src = entry.toURL();
  vd.removeAttribute('controls');
  vd.play();
  // Maledetto, se glielo setto subito non lo prende, e manco con la cb.
  // Una volta pero' se l'era presa e aumentava ogni volta!
  setTimeout(function() {
    if (!vd.endedCallbackSet) {
      console.log("Setting callback once");
      // This event is supposed to work from 28.x and some.
      // For the time being better off leaving it commented!
      vd.addEventListener('ended', function(v) {
  	console.log("Triggered ended di video %o", v);
  	my_filer.getNext();
      });
      vd.endedCallbackSet = true;
      // clearTimeout(my_filer.initial_cb);
    }
  } , 5000);
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
