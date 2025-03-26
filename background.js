chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.get_options) {
      chrome.storage.sync.get(null).then(sendResponse);
      return true;
    } else {
      sendResponse({});
    }
  }
);
