/*
This object downloads files, trying to be smart about it.
It is initialized with a filesystem and a filer; Uses XMLHttpRequest to
fetch files, and does so in 16M bits; Gets 6 files concurrently at most;
TODO: Should be made into a js worker to improve performance.
*/

Downloader = function(filesystem, filer) {
  this.filesystem = filesystem;
  this.filer = filer;
  // At the beginning it's none
  this.downloads_in_progress = [];
  this.CHUNK_SIZE = 1024 * 1024 * 16; // 16M

  this.registerDownload = function(filename) {
    console.log("Setting as downloading for %o", filename);
    this.downloads_in_progress.push(filename);
  }

  this.unregisterDownload = function(filename) {
    console.log("Unregistering download for %o", filename);
    if (! this.downloads_in_progress.delete(filename))
      console.log("Il file %o non mi risultava fra quelli che stavo scaricando.. strano!",
		  filename);
  }

  this.isDownloading = function(filename) {
    return (this.downloads_in_progress.indexOf(filename) >= 0);
  }

  this.canDownload = function(filename) {
    if (this.downloads_in_progress.length > 6) {
      console.log("Non lo scarico adesso, ho piu' di 6 dl in progress");
      return  false;
    }
    if (this.isDownloading(filename)) {
      console.log("Non lo scarico, e' gia' in coda");
      return false
    }
    return true;
  }

  // Takes a (serviced) XMLHttpRequest and returns hash with content range info.
  this.parseReqChunks = function(req) {
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

  this.isReqSingleChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] == 0) && ((info['end'] + 1) >= info['total']))
      return true;
    else
      return false;
  };

  this.isReqFirstChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] == 0) && ((info['end'] + 1) < info['total']))
      return true;
    else
      return false;
  };

  this.isReqMiddleChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] > 0) && ((info['end'] + 1) < info['total']))
      return true;
    else
      return false;
  };

  this.isReqLastChunk = function(req) {
    var info = this.parseReqChunks(req);
    if ((info['start'] > 0) && ((info['end'] + 1) == info['total']))
      return true;
    else
      return false;
  };
};

// Downloads a file. Splitting the download in chunks if need be.
Downloader.prototype.downloadFile = function(url, filename, chunk) {
  if (!chunk)
    chunk = 0;
  console.log("Richiesto download di filename %o, chunk %o...", filename, chunk);
  if ((chunk > 0) || this.canDownload(filename)) {
    console.log("...Ok scarico %o", filename);
  } else {
    return;
  }
  var oReq = new XMLHttpRequest;
  oReq.open("GET", url, true);
  oReq.responseType = "blob";
  var start = chunk * this.CHUNK_SIZE;
  var end = ((chunk + 1) * this.CHUNK_SIZE) - 1;
  oReq.setRequestHeader("Range", "bytes=" + start + '-' + end);
  // Funzione che scrive il blob quando abbiamo la risposta (ed e' un 200)
  oReq.onload = function(oEvent) {
    if (oEvent.target.status == 200) {
      console.log("Request for %o succeded in single run with a 200, saving file!", url);
      this.saveResponseToFile(oReq.response, filename);
    } else if (oEvent.target.status == 206) { // Partial
      if (this.isReqSingleChunk(oReq)) {
        this.saveResponseToFile(oReq.response, filename);
      } else if (this.isReqFirstChunk(oReq)) {
        this.startPartialResponse(oReq.response, filename, url);
      } else if (this.isReqMiddleChunk(oReq)) {
        this.savePartialResponseToFile(oReq.response, filename, url, chunk);
      } else { // Segna che e' finito
	console.log("Looks finished, parsed req %o", this.parseReqChunks(oReq));
        this.finishPartialResponseToFile(oReq.response, filename);
      }
    } else {
      console.log("Request for %o failed: %o", url, oEvent.target.status);
      this.unregisterDownload(filename);
    }
  }.bind(this);
  oReq.onloadstart = function() {
    if (chunk == 0)
    this.registerDownload(filename);
  }.bind(this);
  oReq.send();
};

// Appende a un file esistente
Downloader.prototype.savePartialResponseToFile = function(response, filename, url, chunk) {
  var ftemp = filename + '.tmp';
  console.log("in savePartialResponseToFile, saving %o bytes to file: %o",
              response.size,
              ftemp);
  this.filesystem.root.getFile(ftemp,
			       { create: false },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.seek(fileWriter.length);
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	this.downloadFile(url, filename, chunk + 1);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.startPartialResponse = function(response, filename, url) {
  var ftemp = filename + '.tmp';
  console.log("in startPartialResponse, saving first chunk to file: %o", ftemp);
  this.filesystem.root.getFile(ftemp,
			       { create: true,
			         exclusive: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	// Continuiamo!
        this.downloadFile(url, filename, 1);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.finishPartialResponseToFile = function(response, filename) {
  var ftemp = filename + '.tmp';
  console.log("in finishPartialResponseToFile, saving last %o bytes to file: %o",
              response.size,
              ftemp);
  this.filesystem.root.getFile(ftemp,
			       { create: false },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    // console.log("Ok aperto file %o", ftemp);
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.seek(fileWriter.length);
      fileWriter.write(response);
      fileWriter.onwriteend = function(e) {
	  this.filesystem.root.getFile(ftemp, { create: false }, function(fileEntry) {
	      // console.log("Riaperto %o per spostarlo", ftemp)
              fileEntry.moveTo(this.filesystem.root, filename, function() {
		  console.log("Ho spostato %o in %o", ftemp, filename)
		  this.filer.addFileByName(filename);
		  this.unregisterDownload(filename);
	      }.bind(this), error);
          }.bind(this), error);
      }.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

// Quello usato per scrivere direttamente, senza chunks
Downloader.prototype.saveResponseToFile = function(response, filename) {
  console.log("in saveResponseToFile, saving %o bytes to file: %o",
              response.size,
              filename);
  this.filesystem.root.getFile(filename,
			       { create: true,
			         exclusive: true },
			       function(fileEntry) {
    // Create a FileWriter object for our FileEntry
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.write(response);
        fileWriter.onwriteend = function(e) {
          console.log("Ultimato salvataggio di %o", filename);
	  this.unregisterDownload(filename);
	  this.filer.addFileByName(filename);
	}.bind(this);
    }.bind(this), error);
  }.bind(this), error);
};

Downloader.prototype.toString = function() {
  return "[Downloader downloading " + this.downloads_in_progress.length + ' files]';
};
