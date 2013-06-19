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
  this.setCurrentPath(entry.fullPath);
  var vd = $('video');
  vd.src = entry.toURL();
  vd.loop = false;
  vd.play();
  // // Maledetto, se glielo setto subito non lo prende, e manco con la cb.
  // Una volta pero' se l'era presa e aumentava ogni volta!
  // setTimeout(function() {
  //   if (!vd.endedCallbackSet) {
  //     console.log("Setting callback once");
  //     // This event is supposed to work from 28.x and some.
  //     // For the time being better off leaving it commented!
  //     vd.addEventListener('ended', function(v) {
  // 	console.log("ended %o", v);
  // 	filer.getNext();
  //     });
  //     vd.endedCallbackSet = true;
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
    if (v.currentTime == v.duration) {
      // console.log("Playback terminato");
      return true;
    }
    if (v.error) {
      console.log("Playback error for video: %o", v.currentSrc);
      return true;
    }
    // if (v.title === '') {
    //   console.log("Video senza title, diciamo che non sta playando");
    //   return true;
    // }
    return false;
  } catch (x) {
    console.log("Errore calcolando hasEnded, diciamo di no: %o, currentSrc:", v.currentSrc);
    return false;
  }
};

Video.prototype.getCurrentPath = function() {
  return $('#editor-path').innerText;
};

Video.prototype.setCurrentPath = function(path) {
  $('#editor-path').innerText = path;
};
