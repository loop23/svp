/*
This object downloads files, trying to be smart about it.
It is initialized with a filesystem and a filer; Uses XMLHttpRequest to
fetch files, and does so in 16M chunks; Gets 6 files concurrently at most;
TODO: Should be made into a js worker to improve performance.
*/

const CHUNK_SIZE = 1024 * 1024 * 16; // 16M

Downloader = function(filesystem, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  // At the beginning it's none
  this.downloads_in_progress = [];
}

Downloader.prototype.registerDownload = function(entry) {
  console.log("[Downloader] Setting as downloading for %o", entry);
  this.downloads_in_progress.push(entry);
  entry.startDownload();
}

Downloader.prototype.unregisterDownload = function(entry, status) {
  if (!status)
    status = 'DOWNLOADED'
  console.log("[Downloader] Unregistering download for %o with status %s", entry, status);
  if (! this.downloads_in_progress.delete(entry))
    console.log("[Downloader] La entry %o non mi risultava in downloads_in_progress.. strano!?",
		entry);
  try {
    entry.finishDownload(status);
  } catch (e) {
    console.log("entry non aveva metodo o qualcosa di simile? %o", e);
  }
}

Downloader.prototype.canDownload = function(entry) {
  if (this.downloads_in_progress.length > 6) {
    console.log("[Downloader] Non lo scarico adesso, ho piu' di 6 dl in progress");
    return  false;
  }
  if (entry.isDownloading()) {
    console.log("[Downloader] Non lo scarico, e' gia' in coda");
    return false
  }
  return true;
}

// Takes a (serviced) XMLHttpRequest and returns hash with content range info.
Downloader.prototype.parseReqChunks = function(req) {
  var md = req.getResponseHeader("Content-Range").match(/(\d+)-(\d+)\/(\d+)/);
  if (!md) {
    return {};
  }
  var start = md[1];
  var end = md[2];
  var total = md[3];
  return { start: parseInt(start),
	   end: parseInt(end),
	   total: parseInt(total) };
};

Downloader.prototype.isReqSingleChunk = function(req) {
  var info = this.parseReqChunks(req);
  if ((info['start'] == 0) && ((info['end'] + 1) >= info['total']))
    return true;
  else
    return false;
};

Downloader.prototype.isReqFirstChunk = function(req) {
  var info = this.parseReqChunks(req);
  if ((info['start'] == 0) && ((info['end'] + 1) < info['total']))
    return true;
  else
    return false;
};

Downloader.prototype.isReqMiddleChunk = function(req) {
  var info = this.parseReqChunks(req);
  if ((info['start'] > 0) && ((info['end'] + 1) < info['total']))
    return true;
  else
    return false;
};

Downloader.prototype.isReqLastChunk = function(req) {
  var info = this.parseReqChunks(req);
  if ((info['start'] > 0) && ((info['end'] + 1) == info['total']))
    return true;
  else
    return false;
};

Downloader.prototype.downloadFile = function(url, local) {
  console.log("[Downloader].downloadFile per url: %o su local: %o", url, local);
  var oReq = new XMLHttpRequest;
  oReq.open("GET", url, true);
  oReq.responseType = "blob";
  oReq.onload = function(oEvent) {
    if (oEvent.target.status == 200) {
      console.log("[Downloader] Request for %o succeded, saving file!", url);
      this.saveResponseToFile(oReq.response, local);
    } else {
      console.log("[Downloader] Request for %s failed: %s", url, oEvent.target.status);
    }
  }.bind(this);
  oReq.send();
}

Downloader.prototype.downloadPlaylistEntry = function(entry, chunk) {
  if (!chunk)
    chunk = 0;
  console.log("[Downloader] Richiesto dl di %o, chunk: %i", entry, chunk);
  if (chunk > 0 || this.canDownload(entry)) {
    console.log("[Downloader] ...Ok scarico %o", entry);
  } else {
    return;
  }
  var oReq = new XMLHttpRequest;
  oReq.open("GET", entry.remoteUrl, true);
  oReq.responseType = "blob";
  var start = chunk * CHUNK_SIZE;
  var end = ((chunk + 1) * CHUNK_SIZE) - 1;
  oReq.setRequestHeader("Range", "bytes=" + start + '-' + end);
  // Funzione che scrive il blob quando abbiamo la risposta (ed e' un 200)
  oReq.onload = function(oEvent) {
    if (oEvent.target.status == 200) {
      console.log("[Downloader] Request for %o succeded in single run with a 200, saving file!", url);
      this.saveResponseToFile(oReq.response, entry);
    } else if (oEvent.target.status == 206) { // Partial
      if (this.isReqSingleChunk(oReq)) {
        this.saveResponseToFile(oReq.response, entry);
      } else if (this.isReqFirstChunk(oReq)) {
        this.startPartialResponse(oReq.response, entry);
      } else if (this.isReqMiddleChunk(oReq)) {
        this.savePartialResponseToFile(oReq.response, entry, chunk);
      } else { // Segna che e' finito
	console.log("[Downloader] Looks finished, parsed req %o", this.parseReqChunks(oReq));
        this.finishPartialResponseToFile(oReq.response, entry);
      }
    } else {
      console.log("[Downloader] Request for %o failed: %o", entry, oEvent.target.status);
      this.unregisterDownload(entry, 'ERROR');

    }
  }.bind(this);
  oReq.onloadstart = function() {
    if (chunk == 0)
    this.registerDownload(entry.localFile);
  }.bind(this);
  oReq.send();
};

// Appende a un file esistente
Downloader.prototype.savePartialResponseToFile = function(response, entry, chunk) {
  console.log("[Downloader] in savePartialResponseToFile, saving %o bytes to file: %o",
              response.size,
              entry.tmpFile());
  this.filesystem.root.getFile(entry.tmpFile(),
			       { create: false },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.seek(fileWriter.length);
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	this.downloadFile(entry, chunk + 1);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.startPartialResponse = function(response, entry) {
  console.log("[Downloader] in startPartialResponse, saving first chunk to file: %o", entry.tmpFile());
  this.filesystem.root.getFile(entry.tmpFile(),
			       { create: true,
			         exclusive: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	// Continuiamo!
        this.downloadFile(url, entry, 1);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.finishPartialResponseToFile = function(response, entry) {
  console.log("[Downloader] in finishPartialResponseToFile, saving last %o bytes to file: %o",
              response.size,
              entry.tmpFile());
  this.filesystem.root.getFile(entry.tmpFile(),
			       { create: false },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry, and seek to end
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.seek(fileWriter.length);
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	console.log("[Downloader] Riapro %o per spostarlo", entry.tmpFile())

	this.filesystem.root.getFile(entry.tmpFile(), { create: false }, function(fileEntry) {
          fileEntry.moveTo(this.filesystem.root, entry.localFile, function() {
	    console.log("[Downloader] Ho spostato %o in %o", entry.tmpFile(), entry.localFile)
	    this.filer.addFileByName(entry.localFile);
	    this.unregisterDownload(entry);
	    entry.finishDownload();
	  }.bind(this), error);
        }.bind(this), error);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

// Quello usato per scrivere direttamente, senza chunks; Ha richiesto accrocco per cui
// entry puo' essere sia un playlistItem sia una stringa (in tal caso, il filename)
Downloader.prototype.saveResponseToFile = function(response, entry) {
  console.log("[Downloader] in saveResponseToFile, saving %o bytes to file: %o",
              response.size,
              entry.localFile || entry);
  this.filesystem.root.getFile(entry.localFile || entry,
			       { create: true,
			         exclusive: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
        fileWriter.onwriteend = function(e) {
          console.log("[Downloader] Ultimato salvataggio di %o", entry);
	  this.unregisterDownload(entry);
	  this.filer.addFileByName(entry.localFile || entry);
	  if (entry.localFile)
	    entry.finishDownload();
	}.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.toString = function() {
  return "[Downloader downloading " + this.downloads_in_progress.length + ' files]';
};
