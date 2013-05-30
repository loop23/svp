chrome.app.runtime.onLaunched.addListener(function (arg) {
  chrome.app.window.create(
    'main.html',
    { bounds: { left: 0, top: 0, width:1024, height:768 },
      frame:"none" },
  function(win) {
    win.maximize();
  });
});
