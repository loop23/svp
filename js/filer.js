/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
 * It gets initialized with a filesystem, parent container name and video
 * object
 */
Filer = function(filesystem, container_name, video) {

  this.filesystem = filesystem;
  this.video = video;

  this.schedule = new playList();
  this.schedule.push('spot', 'video', 'video', 'altri', 'video', 'video');

  chrome.syncFileSystem.getUsageAndQuota(filesystem, function (info) {
    console.log("Info: %o", info);
  });

  console.log("filer ha video? %o", video);

  // Directory path => ul node mapping.
  var nodes = {};

  // Le mie playlist separate - e' inutile inizializzarle qui, lo fara' reload
  // this.resetPlaylists();
  this.getListNode = function(path) {
    // console.log("getListNode for %o", path);
    return nodes[path];
  };
  this.setListNode = function(path, node) {
    // console.log("Setting node %o at path %o", node, path);
    nodes[path] = node;
  };
  this.allNodes = function() { return nodes; };
  this.getVideos = function() { return videos; };
  this.getSpot = function() { return spot; };
  this.getAltri = function() { return altri; };

  var container = $(container_name);
  container.innerHTML = '';

  var tools = createElement('div', {'class': 'filer-tools'});
  tools.appendChild(createElement('span', {id:'filer-usage'}));
  tools.appendChild(createElement(
      'button', {id:'filer-reload', 'class':'button', innerText:'Reload'}));
  container.appendChild(tools);
  container.appendChild(createElement(
      'div', {id:'filer-empty-label', innerText:'-- empty --'}));

  // Set up the root node.
  var rootNode = createElement('ul');
  this.setListNode('/', rootNode);
  container.appendChild(rootNode);

  this.reload = function() {
    rootNode.innerHTML = '';
    this.showUsage();
    this.resetPlaylists();
    this.list(filesystem.root);
  };
  $('#filer-reload').addEventListener('click', this.reload.bind(this));
  this.reload();

  if (!chrome.syncFileSystem.onFileStatusChanged) {
    error("onFileSystemStatusChanged unsupported. Maybe too new or too old browser!");
  } else {
    chrome.syncFileSystem.onFileStatusChanged.addListener(
      function(detail) {
	console.log("Callback per onFileStatusChanged, detail: %o", detail);
	if (detail.direction == 'remote_to_local') {
	  info('File ' + detail.fileEntry.fullPath +
               ' is ' + detail.action + ' by background sync.');
	  if (detail.action == "added") {
	    this.addFile(detail.fileEntry);
	  } else {
	    this.reload();
	  }
	}
	// this.reload();
      }.bind(this));
  };

  if (!chrome.syncFileSystem.onServiceStatusChanged) {
    error("onServiceStatusChanged unsupported. Maybe too new or too old browser!");
  } else {
    chrome.syncFileSystem.onServiceStatusChanged.addListener(
      function(detail) {
	log('Service state updated: ' + detail.state + ': '
          + detail.description);
	console.log("onServiceStatusChanged with detail: %o", detail);
      }.bind(this));
  };
  console.log("filer initialized");
};

Filer.prototype.resetPlaylists = function() {
  this.videos = new playList();
  this.spot = new playList();
  this.altri = new playList();
};

Filer.prototype.getNext = function() {
  var tmp = this.schedule.circulate();
  console.log("getNext invocata!, lavoro su %o", tmp);
  // console.log("ma cazzo! %o, %o, %o", this.videos, this.altri, this.spot);
  switch (tmp) {
    case 'video':
      return this.videos.circulate();
    case 'spot':
      return this.spot.circulate();
    case 'altri':
      return this.altri.circulate();
    default:
      return this.videos.circulate();
   }
};

Filer.prototype.list = function(dir) {
  // TODO(kinuko): This should be queued up.
  console.log("Invocata list per dir %o", dir);
  var node = this.getListNode(dir.fullPath);
  if (node.fetching)
    return;
  node.fetching = true;
  var reader = dir.createReader();
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

Filer.prototype.didReadEntries = function(dir, reader, entries) {
  var node = this.getListNode(dir.fullPath);
  if (!entries.length) {
    console.log("entries vuoto - ovvero ha finito!");
    node.fetching = false;
    return;
  }

  hide('#filer-empty-label');

  for (var i = 0; i < entries.length; ++i) {
    this.addFile(entries[i]);
  }

  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

Filer.prototype.addFile = function(fileEntry) {
  console.log("file.AddFile Processing entry: %o", fileEntry);
  if (fileEntry.isFile) {
    if (fileEntry.name.match(/^video_/)) {
      this.videos.unshift(fileEntry.name);
    } else if (fileEntry.name.match(/^spot_/)) {
      this.spot.unshift(fileEntry.name);
    } else if (fileEntry.name.match(/^altri_/)) {
      this.altri.unshift(fileEntry.name);
    }
  }
};

Filer.prototype.showUsage = function() {
  if (chrome.syncFileSystem) {
    chrome.syncFileSystem.getUsageAndQuota(
      this.filesystem,
      function(info) {
        if (chrome.runtime.lastError) {
          error('getUsageAndQuota: ' + chrome.runtime.lastError.message);
          return;
        }
        $('#filer-usage').innerText =
            'Usage:' + this.formatSize(info.usageBytes);
      }.bind(this));
    return;
  }
  webkitStorageInfo.queryUsageAndQuota(
      this.filesystem,
      function(usage, quota) {
        $('#filer-usage').innerText =
            'Usage:' + this.formatSize(usage);
      }.bind(this));
};

Filer.prototype.formatSize = function(size) {
  var unit = 0;
  while (size > 1024 && unit < 5) {
    size /= 1024;
    unit++;
  }
  size = Math.floor(size);
  return size + ' ' + ['', 'K', 'M', 'G', 'T'][unit] + 'B';
};
