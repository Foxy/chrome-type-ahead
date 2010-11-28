/*
 type-ahead-find: find text or links on a page as you write. 
 
 This script is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This script is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this script.  If not, see <http://www.gnu.org/licenses/>.
 
 Website: http://code.google.com/p/chrome-type-ahead/
 Author: Arnau Sanchez <tokland@gmail.com> 
*/ 

/* 
Pending:
 - alt+n/g
 - implement mode text/link
 - f4 (toggle mode)
 - test with frames
 - add zoom management
 - configurable keys: / '
 - blacklist to disable direct access 
 - move function to object's prototypes: up, isVisible, ...?
*/
var KEYCODES = {
  "backspace": 8,
  "tab": 9,
  "enter": 13,
  "spacebar": 32,
  "escape": 27,
  "n": 78,
  "p": 80,
  "g": 71,
  "f3": 114,
  "f4": 115,
};

var MAIN_CSS = '\
  #type-ahead-iframe {\
    position: fixed;\
    top: 0;\
    right: 0;\
    margin: 0;\
    text-align: left;\
    width: 300px;\
    height: 45px;\
    z-index: 2147483647;\
    border: none;\
  }\
'

var EXTENSION_CSS = '\
  body { margin: 0; }\
  #box {\
    margin:0;\
    background-color: #FFC;\
    color: #000;\
    border-bottom: 2px solid #ccc;\
    border-left: 2px solid #ccc;\
    padding: 4px 8px;\
    opacity: 0.9;\
    float: right;\
    clear: both;\
    overflow: hidden;\
    font-size: 18px;\
    font-family: Arial, Verdana, Georgia, Serif;\
    min-width: 60px;\
    outline: 0;\
    -webkit-box-shadow: 0px 2px 8px rgba(0,0,0,0.2);\
    -moz-box-shadow: 0px 2px 8px rgba(0,0,0,0.3);\
  }\
  #text {\
    float: left;\
    font-size: 18px;\
  }\
  \
  #results {\
    letter-spacing: -0.12em;\
    font-size: 20px;\
    color: #444;\
    position: relative;\
    top: 3px;\
  }'

function addStyle(parent, css) {
  var style = document.createElement("style");
  style.type = "text/css";
  style.appendChild(document.createTextNode(css));
  parent.appendChild(style);
}

/* Escape string from special characters used in regular expressions */
function escape_regexp(s, ignore) {        
  var special_chars = ["\\", "?", ".", "+", "(", ")", "{", "}", "[", "]", "$", "^", "*"];
  special_chars.forEach(function(c) {
    if (!ignore || ignore.indexOf(c) == -1) { 
      s = s.replace(new RegExp("\\"+c, "g"), "\\"+  c);
    }
  });
  return s;
}
   
/* Go through parent of element and return the first matching tagName */
function up(element, tagName) {
  var upTagName = tagName.toUpperCase();
  while (element && (!element.tagName || element.tagName.toUpperCase() != upTagName)) {
    element = element.parentNode;
  }
  return element;
}

/* Return true if element is visible */
function isVisible(element) {
  while (element) {    
    style = window.getComputedStyle(element);
    if (style && (style.getPropertyValue('display') == 'none' ||
                  style.getPropertyValue('visibility') == 'hidden')) {
      return false;
    }
    element = element.parentNode;
  }
  return true;
}

/* Return true if an input element is active */
function isInputActive(doc) {
  var element = document.activeElement;
  if (!element) 
    return false;
  var tagName = element.tagName.toLowerCase();
  if (tagName == "input" || tagName == "select" || tagName == "textarea")
    return true;
  while (element) {
    if (element.getAttribute && element.getAttribute('contenteditable') == 'true') {
      return true;
    }
    element = element.parentNode;
  }
  return false;
}

function clearRanges() {
  var rootNodes = [window] //.concat(getRootNodes());
  rootNodes.forEach(function(w) {
    var w = w.contentDocument || w;
    if (w && w.getSelection) { 
      var selection = w.getSelection();    
      selection.removeAllRanges();
    }
  });
}

function search_document(string, options) {
  var flags = (string == string.toLowerCase()) ? 'ig' : 'g'
  var regexp = new RegExp(escape_regexp(string), flags);
  
  function match(textNode) {
    if (!textNode.data.match(regexp)) {
      return NodeFilter.FILTER_REJECT;
    } else if ((options.only_links && !up(textNode, 'a')) || 
               !isVisible(textNode.parentNode) ||
               up(textNode.parentNode, 'script')) {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  }

  var evdoc = document; //ev.srcElement...; 
  var it = evdoc.createNodeIterator(evdoc.body, NodeFilter.SHOW_TEXT, match, true);
  var matches = []
  while ((textNode = it.nextNode()) != null) {
      var regexp2 = regexp;
      while (res = regexp2.exec(textNode.data)) {
        match = {node: textNode,start: res.index, end: regexp2.lastIndex};
        matches.push(match)
      }
  }
  return (matches);
}

function update_result(state, iframe, matches) {
  clearRanges();    
  var range = document.createRange();
  var results = iframe.contentWindow.document.getElementById("results");
  var match = state.current_match;
  var m1, m2;
  if (match) {
    range.setStart(match.node, match.start);
    range.setEnd(match.node, match.end);
    gwindow = window;
    var selection = window.getSelection();
    selection.addRange(range);
    m1 = state.match_index + 1;
    m2 = matches.length;
  } else {
    m1 = 0;
    m2 = 0;
  }
  results.innerHTML = m1 + " of " + m2;
  var colors = {
    text: {true: '#FF5', false: '#F55'},
    links: {true: '#DDF', false: '#F55'},
  }
  var box = iframe.contentWindow.document.getElementById("box");
  box.style["background-color"] = colors["links"][matches.length > 0];
}

function insert_search_box() {
  var div = document.getElementById("type-ahead");
  var iframe;
  if (!div) {
    div = document.createElement('div');
    div.id = "type-ahead";
    addStyle(div, MAIN_CSS);
    document.body.appendChild(div)    
    iframe = document.createElement('iframe');
    iframe.height = "50px"
    iframe.id = 'type-ahead-iframe';
    div.appendChild(iframe);    
    var iframedoc = iframe.contentWindow.document
    addStyle(iframedoc.head, EXTENSION_CSS);
    iframedoc.body.innerHTML = '\
      <div id="box">\
        <input type="text" id="text"></input>\
        <span id="results"></span>\
      </div>';
  } else {
    iframe = document.getElementById("type-ahead-iframe");
  }
  return {div: div, iframe: iframe, input_text: iframe.contentWindow.document.getElementById("text")};
}

function process_search(state, box) {
  var string = box.input_text.value;
  if (string) {
    state.active = true;
    delete box.input_text.disabled;
    matches = search_document(string, {only_links: false})
    state.match_index = state.match_index || 0; 
    state.matches_length = matches.length;
    state.current_match = matches[state.match_index];
    update_result(state, box.iframe, matches)
  } else {
    clearRanges();
  }
}

function hide(state, box) {
  state.active = false;
  box.div.parentElement.removeChild(box.div); 
  //box.iframe.style.display = "none";
  //box.input_text.disabled = "disabled";
  box.input_text.blur();
  document.body.focus();
}

function on_keypress(ev) {
  var ascii = String.fromCharCode(ev.keyCode);
  state = {active: false, match_index: null, current_match: null} //
  if (ascii && ascii.match(/[^\s]/) && !isInputActive()) {
    box = insert_search_box()
    box.input_text.value = ascii;
    box.input_text.focus();
    box.input_text.addEventListener("keydown", function(ev) {
      if (!state.active)
        return;
      if (ev.keyCode == KEYCODES.f3) {
        state.match_index = (state.match_index + 1) % state.matches_length;
        process_search(state, box);
        ev.preventDefault();
      } else if (ev.keyCode == KEYCODES.escape) {
        if (state.current_match && state.current_match.node.parentNode.focus) {
          state.current_match.node.parentNode.focus();
        }
        hide(state, box);
      } else if (ev.keyCode == KEYCODES.enter && state.current_match) {
        var a = up(state.current_match.node, "a");
        if (a) {
          window.location = a.href;
          hide(state, box);
        }
      }
    });
    
    box.input_text.addEventListener("keydown", function(ev) {
      setTimeout(function() { process_search(state, box); }, 0)
    });
    box.input_text.addEventListener("blur", function(ev) {
      //hide(state, box);
    });      
  }  
}

function init(options) {
  window.addEventListener('keypress', on_keypress);
}

/* Main */

if (typeof(chrome) != "undefined" && chrome.extension) {
  chrome.extension.sendRequest({'get_options': true}, function(response) {
    init({
      direct_search_mode: response.direct_search_mode,
      starts_link_only: response.starts_link_only == '1',
      sites_blacklist: response.sites_blacklist,
    });
  });
} else if (typeof(window) != "undefined") {
  window.addEventListener('load', function(ev) {
    init({
      direct_search_mode: 'text',
      starts_link_only: false,
      sites_blacklist: '',
    });
  });
}
