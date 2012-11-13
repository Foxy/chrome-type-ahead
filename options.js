window.addEventListener('load', function(ev) { 
  restore_options();
  document.getElementById("save").addEventListener("click", function(ev) {
    save_options();
  }); 
});

function feedback() {
  var status = document.getElementById("status");
  status.innerHTML = "<i>Options saved</i>";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);
}

function storage_set(key, value) {
  var object = {};
  object[key] = value;
  chrome.storage.sync.set(object);
}

function storage_get(key, callback) {
  chrome.storage.sync.get(key, function(obj) { callback(obj[key]); });
}
      
function save_options() {
  function save_boolean(name) {
    var checkbox = document.getElementById(name);
    storage_set(name, checkbox.checked ? '1': '0');
  }
  function save_string(name) {
    var field = document.getElementById(name);
    storage_set(name, field.value || '');
  }
  
  save_string("direct_search_mode");
  save_boolean("starts_link_only");
  save_string("sites_blacklist");                 
  save_string("timeout");
  save_string("color_link");
  save_string("color_text");
  save_string("color_notfound");
  feedback();
}

function restore_options() {
  function restore_boolean(name) {
    var checkbox = document.getElementById(name);
    storage_get(name, function(val) {
      checkbox.checked = (val == '1');
    });
  }
  function restore_string(name, default_value) {
    var field = document.getElementById(name);
    storage_get(name, function(val) {
      field.value = val || default_value || "";
    });
  }
  
  restore_string("direct_search_mode");
  restore_boolean("starts_link_only");
  restore_string("sites_blacklist");
  restore_string("timeout");
  restore_string("color_link", '#DDF');
  restore_string("color_text", '#FF5');
  restore_string("color_notfound", 'F55');
}
