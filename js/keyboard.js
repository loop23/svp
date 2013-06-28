function keyHandler(e) {
  switch (String.fromCharCode(e.which)) {
    case 'q':
      showPlaylist();
      break;
    case 'w':
      showSchedule();
      break;
    case 'e':
      showCurrentVideo();
      break;
    // Azioni
    case 'z':
      skipVideo();
      break;
    case 'x':
      loadSchedule();
      break;

  }
};

function showPlaylist() {
  console.log("Playlist: %o", filer.playList);
}

function showSchedule() {
  console.log("Schedule: %o", filer.schedule);
}

function showCurrentVideo() {
  console.log("Current video: %o", video.container.currentSrc);
}

function skipVideo() {
  var v = video.container;
  v.currentTime = v.duration - 0.1;
}

function loadSchedule() {
  filer.reloadSchedule();
}

