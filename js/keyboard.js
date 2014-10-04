function keyHandler(e) {
  var paused = $('video').paused;
  var k = String.fromCharCode(e.which);
  console.log("Pressed: *" + k + '*');
  switch (k) {
    case 'q':
      showPlaylist();
      break;
    case 'w':
      showDownloader();
      break;
    case 'e':
      showCurrentVideo();
      break;
    // Azioni
    case 'z':
      skipVideo();
      break;
    case 'x':
      loadPlaylist();
      break;
    case ' ':
      if (paused) {
	$('video').play();
      } else {
	$('video').pause();
      }
      break;
  }
};

function showPlaylist() {
  alertify.alert("<p>Playlist</p>" + window.mainController.playList.asHtmlList());
}

function showDownloader() {
  alertify.alert(window.mainController.downloader.toString());
}

function showCurrentVideo() {
  alertify.alert("<p>Current video</p>" + video.container.currentSrc.split('/').last());
}

function skipVideo() {
  var v = video.container;
  v.currentTime = v.duration - 0.1;
}

function loadPlaylist() {
  window.mainController.requestPlaylistDownload();
}

