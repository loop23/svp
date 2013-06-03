/* This object evolved; it used to be the file list shown on the left hand
 * of the screen, is now more of a multi-playlist manager.
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

  // Le mie playlist separate
  var videos = new playList();
  var spot = new playList();
  var altri = new playList();
  this.getListNode = function(path) {
    console.log("getListNode for %o", path);
    return nodes[path];
  };
  this.setListNode = function(path, node) {
    console.log("Setting node %o at path %o", node, path);
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
    this.list(filesystem.root);
  };
  $('#filer-reload').addEventListener('click', this.reload.bind(this));
  this.reload();
  // Starts playing
  this.video.loadNext();

  if (!chrome.syncFileSystem.onFileStatusChanged) {
    error("onFileSystemStatusChanged unsupported. Maybe too new or too old browser!");
  } else {
    chrome.syncFileSystem.onFileStatusChanged.addListener(
      function(detail) {
	console.log("Callback per onFileStatusChanged, detail: %o", detail);
	if (detail.direction == 'remote_to_local') {
	  info('File ' + detail.fileEntry.fullPath +
               ' is ' + detail.action + ' by background sync.');
	}
	this.reload();
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
};

Filer.prototype.getNext = function() {
  var tmp = this.schedule.circulate();
  console.log("getNext invocata!, lavoro su %o", tmp);
  switch (tmp) {
    case 'video':
      return this.getVideos().circulate();
      break;
    case 'spot':
      return this.getSpot().circulate();
      break;
    case 'altri':
      return this.getAltri().circulate();
      break;
    default:
      return this.getVideos().circulate();
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
    console.log("entries vuoto!");
    node.fetching = false;
    return;
  }

  hide('#filer-empty-label');

  for (var i = 0; i < entries.length; ++i) {
    var tf = entries[i];
    console.log("Processing entry: %o", tf);
    if (tf.isFile) {
      // Get File object so that we can show the file size.
      tf.file(this.addEntry.bind(this, node, tf),
                      error.bind(null, "Entry.file:", tf));
      if (tf.name.match(/^video_/)) {
	this.getVideos().unshift(tf.name);
      } else if (tf.name.match(/^spot_/)) {
	this.getSpot().unshift(tf.name);
      } else if (tf.name.match(/^altri_/)) {
	this.getAltri().unshift(tf.name);
      }
    } else {
      console.log("Non succede mai! o si?");
      this.addEntry(node, entries[i]);
    }
  }

  // Continue reading.
  reader.readEntries(this.didReadEntries.bind(this, dir, reader), error);
};

Filer.prototype.rename = function(oldName, newName) {
  this.filesystem.root.getFile(
    oldName, {create:false},
    function(entry) {
      entry.moveTo(this.filesystem.root, newName,
                   log.bind(null, 'Renamed: ' + oldName + ' -> ' + newName),
                   error);
    }.bind(this), error.bind(null, 'getFile:' + oldName));
};

Filer.prototype.addEntry = function(parentNode, entry, file) {
  var li = createElement('li', {title: entry.name});
  var node = createElement('div');
  node.classList.add(entry.isFile ? 'file' : 'dir');
  node.classList.add('entry');
  var a = createElement('a', {href: '#'});
  var nameNode = document.createTextNode(entry.name);
  a.appendChild(nameNode);
  node.appendChild(a);
  li.appendChild(node);

  if (chrome.syncFileSystem.getFileStatus) {
    chrome.syncFileSystem.getFileStatus(entry, function(status) {
      node.classList.add(status);
    });
  }

  if (!entry.isFile) {
    console.log('Skipping directory:' + entry.fullPath);
    return;
  }

  // Show size in a separate div '<div>[size] KB</div>'
  var sizeDiv = createElement('div', { 'class':'size' });
  sizeDiv.appendChild(document.createTextNode(this.formatSize(file.size)));
  node.appendChild(sizeDiv);

  // Set up click handler to open the file in the video.
  a.addEventListener('click', function(ev) {
    this.video.open(nameNode.textContent);
  }.bind(this));

  parentNode.appendChild(li);
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
