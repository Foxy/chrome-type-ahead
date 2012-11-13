chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    if (request.get_options) {
      chrome.storage.sync.get(null, sendResponse);
    } else {
      sendResponse({});
    }
  }
);
