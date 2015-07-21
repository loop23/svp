/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem; Acts as main controller for the app.
 */
MainController = function(filesystem) {
  console.info("[MainController] - initializing w/fs: %o", filesystem);
  this.filesystem = filesystem;
  this.downloader = new Downloader(filesystem, this);
  // Adesso c'e' un unica playlist; contiene i prossimi files che
  // devo visualizzare.
  this.playList = new playList(this);

  // La mia idea dei files locali
  this.localFiles = [];

  // Stiamo leggendo la dir? in genere no!
  this.readingRoot = false;

  this.playList = new playList(this);
  this.listDir(this.filesystem.root);

  // L'ordine delle cose da playare
  this.playoutOrder = ['Video', 'Video', 'Video',
                       'Video', 'Video', 'Video',
                       'Video', 'Video', 'Video',
                       'StaticSpot'];
  this.playoutOrderIndex = 0;
  this.currentPlayoutItem = function() {
    return this.playoutOrder[this.playoutOrderIndex];
  },
  this.nextPlayoutItem = function() {
    this.playoutOrderIndex++;
    if (this.playoutOrderIndex >= this.playoutOrder.length) {
      this.playoutOrderIndex = 0;
    }
  };
  // takes new playoutorder and returns true if has swapped bcs different
  this.swapPlayoutOrder = function(newOrder) {
    if (JSON.stringify(this.playoutOrder)==JSON.stringify(newOrder)) {
      return false;
    }
    console.info("Swapping playout order with %o", newOrder);
    this.playoutOrder = newOrder;
    this.playoutOrderIndex = 0;
    return true;
  },

  // Ti voglio eliminare!
  this.initial_cb = setInterval(function() {
    console.debug("[MainController] Posso iniziare a playare?");
    if (this.playList.canPlay()) { // Can play
      console.debug("[MainController] playList dice di si, quindi provo!");
      this.clear_initial_cb();
      this.getNext();
      window.video.setupCallbacks();
    } else {
      console.debug("[MainController] non posso iniziare a playare");
    }
  }.bind(this), 1000 * 5);

  // Ogni minuto provo a ricaricare la playlist
  this.plrefreshtask = setInterval(function() {
    this.requestPlaylistDownload();
  }.bind(this), PLAYLIST_REFRESH_TIME);

  // E Ogni x provo a ricaricare il playoutOrder
  // Non in questa versione
  // this.plOrderRefreshTask = setInterval(function() {
  //   this.requestPlayoutOrderDownload();
  // }.bind(this), PLAYOUT_REFRESH_TIME);

  // Done!
  this.requestPlaylistDownload();
  console.info("[MainController] Initialized!");
};

// All'inizio si deve usare una cb diversa da video.ended (perche' prima
// del play del primo video, questa non verrebbe invocata!);
// questa funzione elimina la cb iniziale.
MainController.prototype.clear_initial_cb = function() {
  console.info("[MainController].clear_initial_cb");
  if (this.initial_cb == null) {
    console.warn("[MainController] ...Ma gia' la tolsi");
    return;
  } else {
    console.debug("[MainController] ...La tolgo davvero");
    window.clearInterval(this.initial_cb);
    this.initial_cb = null;
    $('#video').poster='';
  }
};

// Invocata tramite cb, torna la prossima cosa da mostrare
MainController.prototype.getNext = function() {
  switch (this.currentPlayoutItem()) {
  case 'Video': // playList.getNext non puo' tornare undefined, senno' si ferma tutto!
    window.video.openPlItem(this.playList.getNext());
    this.showStuff();
    break;
  case 'Advert':
    loadAdvert();
    break;
  case 'VideoAdvert':
    this.loadVideoAdvert();
  case 'OverlayAdvert':
    break;
  case 'StaticSpot':
    this.loadStaticSpot();
    break;
  default:
    console.warn("current playout item is not recognized: %o",
		 this.currentPlayoutItem());
  }
  this.nextPlayoutItem();
  return undefined;
};

MainController.prototype.loadVideoAdvert = function() {
  console.debug("[MainController] - Requesting a video advert");
  var xhr = new XMLHttpRequest();
  xhr.open('GET',
	   VIDEOADSERVER_URL,
	   true);
  xhr.onload = function(e) {
    if (e.target.status != 200) {
      console.debug("can't get to video, resp: %o", e.target);
      return false;
    }
    var videourl = xhr.responseText.match(/(https[^\]]+)/m)[1];
    window.video.loadUrl(videourl);
    return false;
  }.bind(this);
  xhr.send();
  return true;
};

MainController.prototype.hideStuff = function() {
  hide('#video-overlay');
  hide('#video-titolo');
  hide('#top-logo');
  hide('#bottom-logo');
};

MainController.prototype.showStuff = function() {
  show('#video-overlay');
  show('#video-titolo');
  show('#top-logo');
  show('#bottom-logo');
};

MainController.prototype.loadStaticSpot = function() {
  console.debug("[MainController] - Requesting the static spot");
  window.video.loadUrl(STATIC_SPOT_URL);
  this.hideStuff();
  return false;
};

// List (della root); Invocata allo startup
MainController.prototype.listDir = function(dir) {
  console.info("[MainController] Invocata list per dir '%s'", dir.fullPath);
  if (this.readingRoot) // Already fetching
    return;
  this.readingRoot = true;
  var reader = dir.createReader();
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Invocata quando si e' finito di leggere le entries (ls)
// Dovrebbe capitare solo allo startup?
MainController.prototype.didReadEntries = function(dir, reader, entries) {
  console.debug("[MainController] didReadEntries con %i entries", entries.length);
  if (!entries.length) { // Finito di leggere la root
    this.readingRoot = false;
    return;
  }
  for (var i = 0; i < entries.length; ++i) {
    var entry = entries[i];
    if (entry.name.match(/\.tmp$/)) {
      console.debug("[MainController] Provo a eliminare il tmpfile %o", entry);
      entry.remove(function() {
	console.debug("[MainController] Eliminata entry %o da filesystem locale", entry);
      });
    } else {
      this.addFile(entry);
    }
  }
  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

// Callback invocata durante la listdir per ogni fileEntry, decide cosa farci
MainController.prototype.addFile = function(fileEntry) {
  console.debug("[MainController].addFile Processing entry: %o", fileEntry.name);
  if (!fileEntry.isFile) {
    console.warn("[MainController] Toh, e' stato aggiunto un non-file: %o, non ci faccio niente", fileEntry);
    return;
  }
  if (fileEntry.name.match(/\.tmp$/)) // tmpfile
    return;
  if (fileEntry.name === 'playlist') {
    this.readLocalPlaylist();
  } else if (fileEntry.name.match(/\.mp4$/)) { // files video
    this.localFiles.push(fileEntry.name);
  } else {
    console.warn("[MainController] Aggiunto file inutile (che non verra' playato perche' non corrisponde a nulla che io conosca) - lo elimino: %o",
		fileEntry.name);
    fileEntry.remove(function() {
      console.info("[MainController] Eliminato file inutile!");
    });
  }
};

// Aggiunge un file (per nome) alla lista dei files a me noti.
MainController.prototype.addFileByName = function(filename) {
  console.debug("[MainController].addFileByName per file: %o..Io sono" + this, filename);
  this.filesystem.root.getFile(filename,
			       { create: false },
    function(fileEntry) {
      this.addFile(fileEntry);
    }.bind(this),error);
};

// Controlla se un file col nome filename e' stato scaricato; Controlla su localFiles
MainController.prototype.fileExistsLocally = function(filename) {
  return this.localFiles.some(function(e) { return e == filename; });
};

MainController.prototype.deleteRemoved = function(delenda) {
  console.debug("[MainController] deleting removed: delenda: %o", delenda);
  delenda.forEach(function(filename) {
    console.debug("[MainController] deleting ... %o", filename);
    this.deleteFile(filename);
  }.bind(this), error);
}

// Legge la playlist locale e invoca il suo parser
MainController.prototype.readLocalPlaylist = function() {
  console.debug("[MainController] ReadLocalPlaylist called");
  this.filesystem.root.getFile('playlist',
			       { create: false },
			       function(fileEntry) {
    console.debug("[MainController] 1 Ottenuta entry di playlist");
    fileEntry.file(function(file) {
       console.debug("[MainController] 2 Ottenuto file");
       var reader = new FileReader();
       reader.onload = function(e) {
	 var txt = e.target.result;
	 console.debug("[MainController] 3 Dovrei avere il testo:\n%o", txt);
	 if (!txt) {
	   console.warn("[MainController] Strano, niente testo!");
	   return; // Non c'e' nessun testo!
	 }
	 this.deleteRemoved(this.playList.parsePlaylistText(txt));
       }.bind(this);
       console.debug("[MainController] - mi accingo a chiamare reader.readastext su file %o", file);
       reader.readAsText(file);
    }.bind(this), error);
  }.bind(this), error);
};

// Cancella il file della playlist (se c'e') e dopo la riscarica.
MainController.prototype.requestPlaylistDownload = function() {
  console.debug("[MainController] - Requesting pl download");
  var xhr = new XMLHttpRequest();
  xhr.open('HEAD',
	   PLAYLIST_URL,
	   true);
  xhr.onload = function() {
    this.deleteFile('playlist', function() {
      this.downloader.downloadFile(PLAYLIST_URL,
  	   			   'playlist');
    });
  }.bind(this);
  xhr.send();
  return true;
};

MainController.prototype.requestPlayoutOrderDownload = function() {
  console.debug("[MainController] - Requesting playout order download");
  var xhr = new XMLHttpRequest();
  xhr.open('GET',
	   PLAYOUT_URL,
	   true);
  xhr.onload = function(e) {
    if (e.target.status != 200) {
      console.debug("can't get to playout, resp: %o", e.target);
      return false;
    }
    var newPlOrder = JSON.parse(xhr.responseText);
    if (! newPlOrder instanceof Array) {
      console.warn("new playout is not array, ignoring: %o", newPlOrder);
    } else {
      this.swapPlayoutOrder(newPlOrder);
    }
    return false;
  }.bind(this);
  xhr.send();
  return true;
}

// Chiaramente, elimina un file; Se ha successo lo elimina dalla playList;
// cb se passata viene eseguita sia in caso di successo che di fallimento
// della delete (se remove fallisce, in linea di massima vuol dire che
// il file non esisteva, e capita solo con la playlist)
MainController.prototype.deleteFile = function(filename, cb) {
  console.debug("[MainController].deleteFile con filename: %o", filename);
  this.filesystem.root.getFile(filename,
			       { create: false },
			       function(fileEntry) {
				 fileEntry.remove(function() {
				   this.localFiles = this.localFiles.filter(function(e) {
				     return e != filename;
				   });
				   console.debug("[MainController] Rimosso %o da localFiles, invoco cb", filename);
				   if (cb) {
				     cb.call(this);
				   }
				 }.bind(this));
			       }.bind(this),
			       function() { // error opening file
				 if (cb) {
				   cb.call(this);
				 }}.bind(this));
};

// Invocata quando il downloader ha finito di scaricare filename
// e lo ha salvato
MainController.prototype.notifyDownload = function(filename) {
  console.debug("[MainController] notifyDownload per %s", filename);
  this.localFiles.push(filename);
  this.playList.finishDownload(filename);
};

MainController.prototype.toString = function() {
  return("[MainController con pl:" + this.playList.toString() + ']');
};
