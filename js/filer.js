Filer = function(filesystem, container, video, isSyncable) {
  this.filesystem = filesystem;
  this.video = video;
  this.isSyncable = isSyncable;

  // Directory path => ul node mapping.
  var nodes = {};
  this.getListNode = function(path) {
    console.log("getListNode for %o", path);
    return nodes[path];
  };
  this.setListNode = function(path, node) {
    console.log("Setting node %o at path %o", node, path);
    nodes[path] = node;
  };
  this.allNodes = function() { return nodes; };

  var container = document.getElementById(container);
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

  chrome.syncFileSystem.onFileStatusChanged.addListener(
    function(detail) {
      if (detail.direction == 'remote_to_local') {
        info('File ' + detail.fileEntry.fullPath +
             ' is ' + detail.action + ' by background sync.');
      }
      this.reload();
    }.bind(this));

  chrome.syncFileSystem.onServiceStatusChanged.addListener(
    function(detail) {
      log('Service state updated: ' + detail.state + ': '
          + detail.description);
    }.bind(this));
};

Filer.prototype.getNext = function() {
  console.log("getNext invocata!");
  try {
    // Select a random one!
    var nodes = this.allNodes()['/'].children;
    var keys = Object.keys(nodes);
    console.log("keys: %o", keys);
    var ci = keys[Math.floor(keys.length * Math.random())];
    console.log("ci: %o", ci);
    return nodes[ci];
  } catch (x) {
    console.log("getNext fallita! sob!");
    return null;
  }
};

Filer.prototype.list = function(dir) {
  // TODO(kinuko): This should be queued up.
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
    node.fetching = false;
    return;
  }

  hide('#filer-empty-label');

  for (var i = 0; i < entries.length; ++i) {
    if (entries[i].isFile) {
      // Get File object so that we can show the file size.
      entries[i].file(this.addEntry.bind(this, node, entries[i]),
                      error.bind(null, "Entry.file:", entries[i]));
    } else {
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

  if (this.isSyncable && chrome.syncFileSystem.getFileStatus) {
    chrome.syncFileSystem.getFileStatus(entry, function(status) {
      node.classList.add(status);
    });
  }

  if (!entry.isFile) {
    console.log('Skipping directory:' + entry.fullPath);
    return;
  }

  // Show size in a separate div '<div>[size] KB</div>'
  var sizeDiv = createElement('div', { class:'size' });
  sizeDiv.appendChild(document.createTextNode(this.formatSize(file.size)));
  node.appendChild(sizeDiv);

  // Set up click handler to open the file in the video.
  a.addEventListener('click', function(ev) {
    this.video.open(nameNode.textContent);
  }.bind(this));

  parentNode.appendChild(li);
};

Filer.prototype.showUsage = function() {
  if (this.isSyncable && chrome && chrome.syncFileSystem) {
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
