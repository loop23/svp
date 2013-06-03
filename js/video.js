Video = function(filesystem, container, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  console.log("video inizializing with filer? %o", this.filer);
  this.container = $(container);
  console.log("Video initialized!");
};

Video.prototype.open = function(path) {
  this.filesystem.root.getFile(
      path, {},
      this.load.bind(this),
      error.bind(null, "getFile " + path));
};

Video.prototype.load = function(entry) {
  console.log('Opening (in Video), fullpath: %o, toUrl: %o', entry.fullPath, entry.toURL());
  entry.file(function (file) { console.log("Chi e' costui? %o", file); });
  this.setCurrentPath(entry.fullPath);
  var vd = $('video');
  // This event is supposed to work from 28.x and some. For the time being better off leaving it commented!
  vd.addEventListener('ended', function(v) {
    console.log("ended %o", v);
    filer.getNext();
  });
  vd.src = entry.toURL();
  vd.loop = false;
  vd.play();
};

Video.prototype.loadNext = function() {
  // console.log("Chi e' il mio filer? %o", this.filer);
  var nf = this.filer.getNext();
  // console.log("Next is: %o", nf);
  this.open(nf);
};

Video.prototype.hasEnded = function() {
  return ($('video').currentTime == $('video').duration);
};

Video.prototype.getCurrentPath = function() {
  return $('#editor-path').innerText;
};

Video.prototype.setCurrentPath = function(path) {
  $('#editor-path').innerText = path;
};
