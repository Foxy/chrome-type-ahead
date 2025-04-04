/*
 type-ahead-find: find text or links as you write. 
 
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
 Author: Arnau Sanchez <tokland@gmail.com> (2009) 
*/ 

/* Styles and addStyle borrowed from nice-alert.js project */

var styles = '\
  #type-ahead-box {\
    position: fixed;\
    top: 0;\
    right: 0;\
    margin: 0;\
    text-align: left;\
    z-index: 2147483647;\
    color: #000;\
    border-bottom: 1px solid #ccc;\
    border-bottom: 1px solid rgba(0,0,0,0.3);\
    padding: 4px 8px;\
    opacity: 0.9;\
    float: right;\
    clear: both;\
    overflow: hidden;\
    font-size: 18px;\
    font-family: Arial, Verdana, Georgia, Serif;\
    white-space: pre-wrap;\
    min-width: 60px;\
    outline: 0;\
    -webkit-box-shadow: 0px 2px 8px rgba(0,0,0,0.2);\
    -moz-box-shadow: 0px 2px 8px rgba(0,0,0,0.3);\
  }\
  \
  #type-ahead-box small {\
    letter-spacing: -0.12em;\
    color: #444;\
  }'

/* Generic functions */

function max(a, b) {
  return ((a > b) ? a : b); 
}

function escape_regexp(s, ignore) {        
  var special = ["\\", "?", ".", "+", "(", ")", "{", "}", "[", "]", "$", "^", "*"];
  special.forEach(function(re) {
    if (!ignore || ignore.indexOf(re) < 0) 
      s = s.replace(new RegExp("\\" + re, "g"), "\\" + re);
  });
  return s;
}

function get_current_zoom(doc) {
  var s = doc.body.parentElement.style.zoom;
  var zoom;
  if (s.match('%$'))
    zoom = parseFloat(s.slice(0, s.length - 1)) / 100;
  else if (s)
    zoom = parseFloat(s.replace(',', '.'));
  else
    zoom = 1;
  return zoom;
}

function addStyle(css) {
  var head = document.getElementsByTagName('head')[0];
  if (head) {
    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    head.appendChild(style);
  }
}

function stopEvent(ev) {
  ev.preventDefault();
  ev.stopPropagation();
}
    
function up(element, tagName) {
  var upTagName = tagName.toUpperCase();
  while (element && (!element.tagName || 
                     element.tagName.toUpperCase() != upTagName)) {
    element = element.parentNode;
  }
  return element;
}

function upMatch(element, matchFunction) {
  while (element) {
    var res = matchFunction(element);
    if (res == null)
      return null;
    else if (res)
      return element;
    element = element.parentNode;
  }
  return element;
}

function isVisible(element) {
  while (element && element.style) {    
    style = window.getComputedStyle(element);
    if (style && (style.getPropertyValue('display') == 'none' ||
                  style.getPropertyValue('visibility') == 'hidden'))
      return false;
    element = element.parentNode;
  }
  return true;
}

function getRootNodes() {  
  var rootNodes = new Array();
  var frames = document.getElementsByTagName('frame');
  for (var i = 0; i < frames.length; i++)
    rootNodes.push(frames[i]);
  return rootNodes;
}

function clearRanges() {
  var rootNodes = [window].concat(getRootNodes());
  for (var i = 0; i < rootNodes.length; i++) {
    var w = rootNodes[i].contentDocument || rootNodes[i];
    if (w && w.getSelection) { 
      var selection = w.getSelection();    
      selection.removeAllRanges();
    }
  }
}

function getActiveElement(doc) {
  return doc.activeElement || doc._tafActiveElement;
}

function getSelectedAnchor(doc) {
  var rootNodes = [document].concat(getRootNodes());
  for (var i = 0; i < rootNodes.length; i++) {
    var doc = rootNodes[i].contentDocument || rootNodes[i];
    var element = getActiveElement(doc);  
    if (element && element.tagName == "A")
      return(element);
  }
}

function isInputElementActive(doc) {
  var element = getActiveElement(doc);
  if (!element)
    return;
  var name = element.tagName.toLowerCase();
  if (["input", "select", "textarea", "object", "embed"].indexOf(name) >= 0)
    return true;
  if (name.match(/-/)) // Web Components
    return true;
  if (
    element.contentEditable &&
    element.contentEditable != "inherit" &&
    element.contentEditable != "false"
  ) {
    return true;
  }
  return null;
}

function selectOnchange(select) {
  if (select) {
    select.focus(); 
    if (select.onchange) 
      select.onchange();
    return true;
  }
}

function setAlternativeActiveDocument(doc) {
  function dom_trackActiveElement(evt) {
    if (evt && evt.target) { 
      doc._tafActiveElement = (evt.target == doc) ? null : evt.target;
    }
  }

  function dom_trackActiveElementLost(evt) { 
    doc._tafActiveElement = null;
  }

  if (doc._tafActiveElement == undefined && !doc.activeElement) {
    doc._tafActiveElement = null;
    doc.addEventListener("focus", dom_trackActiveElement, true);
    doc.addEventListener("blur", dom_trackActiveElementLost, true);
  }
}

/* Type-ahead specific functions */

function clearSearchBox() {
  var box = document.getElementById('type-ahead-box');
  if (box) {
    box.style.display = 'none';
  }
}

function isSearchBoxVisible() {
  var box = document.getElementById('type-ahead-box');
  return (box && box.style.display != 'none');
}


function showSearchBox(search, clear_function) {
  var colors = {
    text: {ok: search.options.color_text, ko: search.options.color_notfound},
    links: {ok: search.options.color_link, ko: search.options.color_notfound},
  }
  var box = document.getElementById('type-ahead-box');
  if (!box) { 
    box = document.createElement('TABOX');
    box.id = 'type-ahead-box';
    document.documentElement.appendChild(box);
    addStyle(styles);
  }
  box.style.display = 'block';
  if (search.mode) {
    var color = colors[search.mode][(search.total < 1 && search.text) ? 'ko' : 'ok'] 
    box.style['background-color'] = color;
  }
  box.innerHTML = search.text ? 
    (search.text + ' <small>(' + search.nmatch + ' of ' + search.total + ')</small>') : '&nbsp;';
  box.style['top'] = ''
  if (search.nmatch >= 1 && search.range) {
    var sel = search.range.getBoundingClientRect();
    if (sel.right >= box.offsetLeft && sel.top <= box.offsetTop + box.offsetHeight) {
      topval = (sel.bottom + 10);
      box.style['top'] = ((topval < 100) ? topval : 100)  + 'px';
    }
  }
  if (search.timeout && search.timeout > 0) {
    if (search.timeout_id)
      clearTimeout(search.timeout_id);  
    search.timeout_id = setTimeout(function() {
      clear_function(true); 
    }, search.timeout * 1000);
  }
}

function elementInViewport(el) {
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (top >= window.pageYOffset &&
          left >= window.pageXOffset &&
          (top + height) <= (window.pageYOffset + window.innerHeight) &&
          (left + width) <= (window.pageXOffset + window.innerWidth));
}

function processSearch(search, options) {
  var selected = false;    
  var selectedAnchor = getSelectedAnchor();
  
  if (selectedAnchor)
    selectedAnchor.blur();
  
  if (search.text.length <= 0 || !search.mode) {
    clearRanges();
    return(selected);
  }
  
  var matchedElements = new Array();
  var string = escape_regexp(search.text).replace(/\s+/g, "(\\s|\xa0)+");
  if (options.starts_link_only)
    string = '^' + string;
  // If string is lower case, search will be case-unsenstive.
  // If string is upper case, search will be case-senstive.
  var regexp = new RegExp(string, string == string.toLowerCase() ? 'ig' : 'g')
  // currently Xpath does not support regexp matches. That would be great:
  // document.evaluate('//a//*[matches(text(), "regexp")]', document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(N);
  var rootNodes = [window].concat(getRootNodes());
  for (var i = 0; i < rootNodes.length; i++) {    
    var doc = rootNodes[i].document || rootNodes[i].contentDocument;
    if (!doc || !doc.body)
      continue;
    var frame = rootNodes[i].contentWindow || rootNodes[i];
    var regexp2 = new RegExp(regexp);

    function match(textNode) {
      if (!textNode.data.match(regexp2))
        return NodeFilter.FILTER_REJECT;
      var anchor = up(textNode, 'a');
      if ((search.mode == 'links' && !anchor) || 
          !isVisible(textNode.parentNode) ||
           up(textNode.parentNode, 'script'))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }

    var nodeIterator = doc.createNodeIterator(doc.body, NodeFilter.SHOW_TEXT, match, true);
      
    while ((textNode = nodeIterator.nextNode()) != null) {
      var anchor = up(textNode, 'a');
      var option = up(textNode.parentNode, 'option');
      var regexp2 = new RegExp(regexp);
      var result;
      while (match = regexp2.exec(textNode.data)) {
        result = {doc: doc, frame: frame, node: textNode, 
                  anchor: anchor, option: option, 
                  start: match.index, end: regexp2.lastIndex};
        matchedElements.push(result);
      }          
    }
  }
  
  search.total = matchedElements.length;

  if (matchedElements.length > 0) {
    var index;
    
    // If this is the first search, start on the first match on viewport
    if (search.search_in_viewport) {
      index = 0;
      while (index < matchedElements.length && 
             !elementInViewport(matchedElements[index].node.parentNode)) {
        index += 1;
      }            
    } else {
      index = search.index;      
    }    

    index = index % matchedElements.length;
    if (index < 0)
      index += matchedElements.length;
    var result = matchedElements[index];    
    search.index = index;
    search.nmatch = index + 1;
    search.element = result.node.parentNode;
    if (result.option) {
      result.option.selected = 'selected';
      search.select = up(result.option, 'select');
    } else {
      search.select = null;
    }
    clearRanges();
    
    var range = result.doc.createRange();    
    range.setStart(result.node, result.start);
    range.setEnd(result.node, result.end);
    var selection = window.getSelection();
    selection.addRange(range);
    search.range = range;
    selected = true;
    if (result.anchor)
      result.anchor.focus();
    // Apparently A's with empty href don't trigger the window scroll when focused
    if (!result.anchor || !result.anchor.href) {
      var rect = range.getBoundingClientRect();      
      var doc_height = window.innerHeight;
      var zoom = get_current_zoom(result.doc);
      if (zoom*rect.top < (doc_height * 1) / 6.0 || zoom*rect.bottom > (doc_height * 5) / 6.0) {  
        var y = max(0, window.pageYOffset + zoom*rect.top - doc_height / 3.0);
        window.scrollTo(window.pageXOffset + zoom*rect.left, y);
      }
    }
  } else {
    search.nmatch = 0;
    clearRanges();
  } 
  
  return(selected);
}

function is_shortcut(ev) {
    var is_mac = navigator.appVersion.indexOf("Mac") !== -1;
    var is_windows = navigator.appVersion.indexOf("Windows") !== -1;
    var is_alternative_input = (is_mac && ev.altKey) || (is_windows && ev.ctrlKey && ev.altKey);
    return !is_alternative_input && (ev.altKey || ev.metaKey || ev.ctrlKey);
}

function check_blacklist(sites_blacklist) {
  if (sites_blacklist) {
    var url = window.location.href;
    var urls = options.sites_blacklist.split('\n');
    for (var i=0; i < urls.length; i++) {
      var s = urls[i].replace(/^\s+|\s+$/g, '');
      if (s[0] == '#') {
        // If URL starts with #, ignore it       
        continue;
      } else if (s[0] == '|') {
        // If URL starts with | assume it is a real regexp.
        var regexp = new RegExp('^' + s.slice(1) + '$');
        if (url.match(regexp))
          return true;
      } else {
      // Otherwise compare with the URL ('*' is the only wildcard available)
        var s2 = escape_regexp(s, ["*"]).replace(new RegExp("\\*", "g"), ".*");
        var regexp = new RegExp('^' + s2 + '$');
        if (url.match(regexp))
          return true;
      }
    }
  }
  return false;
}

function init(options) {
  var keycodes = {
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
  
  var search = {};

  function clearSearch(clearRanges) {
    if (search.timeout_id) {
      clearTimeout(search.timeout_id);
    }
    search = {mode: null, text: '', index: 0, search_in_viewport: true, 
              matches: 0, total: 0, select: null, 
              timeout: parseInt(options.timeout), options: options};
    if (clearRanges) { 
      selection = window.getSelection();
      selection.removeAllRanges();
    }
    clearSearchBox();
  }
   
  function processSearchWithOptions(blur_unless_found) {
    return processSearch(search, { 
      search_links: (search.mode == 'links'),
      starts_link_only: options["starts_link_only"],
      blur_unless_found: blur_unless_found
    });    
  }

  function setEvents(rootNode) {
    var doc = rootNode.contentDocument || rootNode;
    var body = rootNode.body;
    
    if (!body || !body.addEventListener) {
        return;
    }

    setAlternativeActiveDocument(doc);

    doc.addEventListener('keydown', function(ev) {
      if (isInputElementActive(doc))
        return;      
        
      var code = ev.keyCode;
      var selectedAnchor = getSelectedAnchor(doc);
      var blacklisted = check_blacklist(options.sites_blacklist);

      // Disable blacklisted sites completely
      //if (blacklisted && !search.mode)
      if (blacklisted)
        return;      
        
      if (code == keycodes.backspace && search.mode) {
        if (search.text) {
          if (!ev.ctrlKey) {
            search.text = search.text.substr(0, search.text.length-1);
          } else { /* delete last word */              
            var index = search.text.lastIndexOf(' ');
            search.text = (index == -1) ? "": search.text.substr(0, index+1);
          }        
          processSearchWithOptions(true);
          showSearchBox(search, clearSearchBox);
        }
      } else if (code == keycodes.escape && search.mode) {
        clearSearch(true);
        processSearchWithOptions(true);
      } else if (code == keycodes.enter && 
                 (selectedAnchor || selectOnchange(search.select))) {
        clearSearch(true);
        return;
      } else if (search.mode && code == keycodes.tab && !selectedAnchor) {
        var nodeIterator = doc.createNodeIterator(
            doc.body,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        var textNode;
        while ((textNode = nodeIterator.nextNode()) != search.element);
        var nextNodeFuncName = ev.shiftKey ? "previousNode" : "nextNode"; 
        while ((textNode = nodeIterator[nextNodeFuncName]()) != null) {
          if ((textNode.tagName == 'A' && textNode.href) || 
               textNode.tagName == "INPUT" || 
               textNode.tagName == "TEXTAREA" ||
               textNode.tagName == "SELECT") {
            // Hack: If we directly textNode.focus() the cursor is not 
            // set in the field. Why? As a workaround, defer to a timeout 
            setTimeout(function() { textNode.focus(); }, 0);
            break;
          }
        }
        clearSearch(true);
        stopEvent(ev);
        return;
      } else if (search.mode && code == keycodes.tab) {
        clearSearch(true);
        return;
      } else if (code == keycodes.f4 && search.mode) {
        search.mode = (search.mode == 'text') ? 'links' : 'text'
        search.index = 0;
        processSearchWithOptions(true);
        showSearchBox(search, clearSearchBox);
      } else if (search.text && (code == keycodes.f3 ||
                                 (code == keycodes.g && (ev.ctrlKey || ev.metaKey)) ||
                                 (code == keycodes.n && ev.altKey) ||
                                 (code == keycodes.p && ev.altKey))) {
        search.search_in_viewport = false; 
        search.index += (ev.shiftKey || code == keycodes.p) ? -1 : +1;
        processSearchWithOptions(true);
        showSearchBox(search, clearSearchBox);
      } else {
        return;
      }
      
      stopEvent(ev);
    }, false);
    
    doc.addEventListener('keypress', function(ev) {
      if (isInputElementActive(doc))
        return;
      var blacklisted = check_blacklist(options.sites_blacklist);
      if (blacklisted)
        return;
      var code = ev.keyCode;
      var ascii = String.fromCharCode(code);
      if (!is_shortcut(ev) && ascii && [keycodes.enter].indexOf(code) == -1 &&
          (code != keycodes.spacebar || search.mode)) {
        if (!search.mode && ascii == "/") {
          search.mode = 'text';
        } else if (!search.mode && ascii == "'") {
          search.mode = 'links';
        } else if (!search.mode && blacklisted) {
          return;
        } else if (!search.mode && options.direct_search_mode == 'disabled') {
          return;
        } else if (!search.mode) {
          search.mode = options.direct_search_mode == 'links' ? 'links' : 'text';
          search.text += ascii;
        } else if (search.mode) {
          if (isSearchBoxVisible()) {
            search.text += ascii;
          } else {
            search.text = ascii;
          }
        }
        processSearchWithOptions(true)
        showSearchBox(search, clearSearchBox);
        stopEvent(ev)
      }
    }, false);
 
    doc.addEventListener('mousedown', function(ev) {
      if (search.mode)
        clearSearch(false);      
    }, false);
  }

  clearSearch(false);
  var rootNodes = [document].concat(getRootNodes());
  for (var i = 0; i < rootNodes.length; i++) {
    var rootNode = rootNodes[i];
    if (rootNode.contentDocument) { 
      rootNode.addEventListener('load', function(ev) {
        setEvents(ev.target.contentDocument);
      });
    }
    else if (!rootNode.contentDocument || rootNode.contentDocument.readyState == 'complete') {
      setEvents(rootNode.contentDocument ? rootNode.contentDocument : rootNode);
    }
  } 
}

/* Default options */
var default_options = {
  direct_search_mode: 'text',
  starts_link_only: false,
  sites_blacklist: '',
  color_link: '#DDF',
  color_text: '#FF5',
  color_notfound: 'F55'
};

function main(options) {
  // Use setInterval to add events to document.body as soon as possible
  interval_id = setInterval(function() {
    if (document.body) {
      clearInterval(interval_id);
      init(options);
    }
  }, 100);
}

setAlternativeActiveDocument(document);
options = default_options;

if (typeof(chrome) == "object" && chrome.runtime) {
  chrome.runtime.sendMessage({ get_options: true }, function(response) {
    options = {
      direct_search_mode: response.direct_search_mode,
      sites_blacklist: response.sites_blacklist,
      starts_link_only: (response.starts_link_only == '1'),
      timeout: response.timeout,
      color_link: response.color_link || default_options.color_link,
      color_text: response.color_text || default_options.color_text,
      color_notfound: response.color_notfound  || default_options.color_notfound
    };
    main(options);
  });
}
