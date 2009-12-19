/*
 Chrome-type-ahead: find text as you write. 
 
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

/* Styles and addStyle borrowed from nice-alert.js */

var styles = '\
  #type-ahead-box {\
    font: 18px sans-serif !important;\
    position: fixed !important;\
    top: 0 !important;\
    right: 0 !important;\
    margin: 0 !important;\
    padding: 0 !important;\
    list-style-type: none !important;\
    float: left !important;\
    cursor: pointer !important;\
    text-align: left !important;\
    z-index: 9999 !important;\
  }\
  \
  #type-ahead-contents {\
    //background-color: #FFC !important;\
    color: #000 !important;\
    border-bottom: 1px solid #ccc !important;\
    border-bottom: 1px solid rgba(0,0,0,0.3) !important;\
    margin: 0 !important;\
    padding: 2px 5px;\
    opacity: 0.9;\
    float: right !important;\
    clear: both !important;\
    overflow: hidden !important;\
    font-size: 18px !important;\
    white-space: pre-wrap !important;\
    min-width: 50px;\
    outline: 0 !important;\
    -webkit-box-shadow: 0px 2px 8px rgba(0,0,0,0.2);\
    -moz-box-shadow: 0px 2px 8px rgba(0,0,0,0.3);'

function addStyle(css) {
  var head = document.getElementsByTagName('head')[0];
  if (head) {
    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    head.appendChild(style);
  }
}
    
function getSelectedAnchor() {
  if (document.activeElement.tagName == "A")
    return(document.activeElement);
}

function up(element, tagName) {
  var upTagName = tagName.toUpperCase();
  while (element && (!element.tagName || element.tagName.toUpperCase() != upTagName)) {
    element = element.parentNode;
  }
  return element;
}

function isInputElementActive() {
  var name = document.activeElement.tagName;
  return (name == "INPUT" || name == "SELECT" || name == "TEXTAREA");
}

// Based on http://james.padolsey.com/javascript/find-and-replace-text-with-javascript/
function findTextRecursively(searchNode, searchText, case_sensitive) {
  var regex_type = case_sensitive ? 'g' : 'ig';
  var regex = typeof searchText == 'string' ?
              new RegExp(searchText, regex_type) : searchText;
  var childNodes = (searchNode || document.body).childNodes;
  var cnLength = childNodes.length;
  var excludes = '';
  
  while (cnLength--) {
    var currentNode = childNodes[cnLength];
    if (currentNode.nodeType == 1 &&
        (excludes + ',').indexOf(currentNode.nodeName.toLowerCase() + ',') == -1) {
      result = findTextRecursively(currentNode, searchText, case_sensitive);
      if (result)
        return result;
    }
    if (currentNode.nodeType == Node.TEXT_NODE) {
      var start = currentNode.data.search(regex);
      if (start >= 0) {
        regex.exec(currentNode.data);
        var end = regex.lastIndex;
        return {node: currentNode, start: start, end: end}
      }
    }
  }
}

function clearSearchBox() {
  var box = document.getElementById('type-ahead-box');
  if (box) {
    box.style.display = 'none';
  }
}

function showSearchBox(search) {
  var contents = document.getElementById('type-ahead-contents');
  if (!contents) { 
    var box = document.createElement('TABOX');
    contents = document.createElement('TACONTENTS');
    contents.id = 'type-ahead-contents';
    box.appendChild(contents);
    box.id = 'type-ahead-box';
    document.documentElement.appendChild(box);
    addStyle(styles);
  }
  var box = document.getElementById('type-ahead-box');
  box.style.display = 'block';
  var color = (search.mode == 1) ? '#FFC' : '#FA7'; 
  console.log(color);
  contents.style['background-color'] = color;
  contents.innerHTML = search.text || '&nbsp;';
}

function processSearch(search, options) {
  var selected = false;    
  var selectedAnchor = getSelectedAnchor();
  var selection = window.getSelection();
  
  if (search.text.length > 0) {
    var matchedElements = [];
    var elements = options.search_only_links ? 
      document.body.getElementsByTagName('a') : [document.body]
    var smartSearch = search.text.replace(/\s+/g, "(\\s|\240)+");
    for(var index = 0; index < elements.length; index++) {
      anchor = elements[index];
      result = findTextRecursively(anchor, smartSearch, options.case_sensitive);
      if (result) {
        matchedElements.push(result);
      } 
    }
    if (matchedElements.length > 0) {
      var index = search.index % matchedElements.length;
      if (index < 0)
        index += matchedElements.length; 
      node = matchedElements[index].node;
      var upAnchor = up(node, 'a');
      if (upAnchor) {
        upAnchor.focus();
      }
      selection.removeAllRanges();
      var range = document.createRange();
      range.setStart(node, matchedElements[index].start);
      range.setEnd(node, matchedElements[index].end);
      selection.addRange(range);
      selected = true;
    } 
  } else {
    selection.removeAllRanges();
  }
  if (selectedAnchor && !selected && options.blur_unless_found)
    selectedAnchor.blur();
  
  return(selected);
}

function init(options) {
  var keycodes = {
    "backspace": 8,
    "tab": 9,
    "enter": 13,
    "spacebar": 32,
    "escape": 27
  };
  var search = {mode: null, text: '', index: 0}; 

  function clearSearch() {
    search = {mode: null, text: '', index: 0};
    selection = window.getSelection();
    selection.removeAllRanges();
    clearSearchBox();
  }    
   
  function processSearchWithOptions(blur_unless_found) {
    return processSearch(search, { 
      case_sensitive: options["case_sensitive"], 
      search_only_links: (search.mode == 1 && options.main_search_only_links) ||
                         (search.mode == 2 && !options.main_search_only_links),
      blur_unless_found: blur_unless_found
    });    
  }
 
  window.addEventListener('keydown', function(ev) {
    if (isInputElementActive())
      return;      
      
    var code = ev.keyCode;
    var selectedAnchor = getSelectedAnchor();    
        
    if (code == keycodes.backspace && search.mode) {
      if (search.text) {
        search.text = search.text.substr(0, search.text.length-1);
        processSearchWithOptions(true);
        showSearchBox(search);
      }
    } else if (code == keycodes.escape) {
      clearSearch();
    } else if (code == keycodes.enter && selectedAnchor) {
      clearSearch();
      return;
    } else if (code == keycodes.tab && selectedAnchor && search.text) {
      search.index += ev.shiftKey ? -1 : +1;
      processSearchWithOptions(true);
    } else {
      return;
    }
    
    ev.preventDefault();
    ev.stopPropagation();
  }, false);
  
  window.addEventListener('keypress', function(ev) {
    if (isInputElementActive())
      return;
    var code = ev.keyCode;
    var ascii = String.fromCharCode(code);
    
    if (!ev.altKey && !ev.metaKey && !ev.controlKey && ascii && 
        (code != keycodes.spacebar || search.mode)) {
      if (!search.mode) 
        search.mode = (ascii == "'") ? 2 : 1; 
      console.log(ascii);
      console.log(search.mode);
      var old_text = search.text; 
      search.text += ascii;
      if (!processSearchWithOptions(false)) {
        search.text = old_text;
      } 
      showSearchBox(search);
      if (code == keycodes.spacebar) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }        
  }, false);
  
  window.addEventListener('mousedown', function(ev) {
    if (search.mode)
      clearSearch();      
  }, false);  
}

/*  
var options = {
*/

chrome.extension.sendRequest({'get_options': true}, function(response) {
  var options = {
    case_sensitive: (response.case_sensitive == '1'),
    main_search_only_links: (response.main_search_only_links == '1')
  };
    
  init(options);
});
