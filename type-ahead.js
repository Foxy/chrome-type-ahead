/*
 Chrome-type-ahead: search for links when you start typing. 
 
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

/* Styles taken from nice-alert.js */

var styles = '\
  #type-ahead-box {\
    font: 14px/16px sans-serif !important;\
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
    background-color: InfoBackground !important;\
    color: InfoText !important;\
    border-bottom: 1px solid #ccc !important;\
    border-bottom: 1px solid rgba(0,0,0,0.3) !important;\
    margin: 0 !important;\
    padding: 2px 5px;\
    float: right !important;\
    clear: both !important;\
    overflow: hidden !important;\
    font-size: 14px !important;\
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

function showSearchBox(string) {
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
  contents.innerHTML = string || '&nbsp;';
}

function processSearch(search, searchIndex, options) {
  var selected = false;    
  var selectedAnchor = getSelectedAnchor();
  var selection = window.getSelection();
  
  if (search.length > 0) {
    var matchedElements = [];
    var elements = options.search_only_links ? 
      document.body.getElementsByTagName('a') : [document.body]
    var smartSearch = search.replace(/\s+/g, "(\\s|\240)+");
    for(var index = 0; index < elements.length; index++) {
      anchor = elements[index];
      result = findTextRecursively(anchor, smartSearch, options.case_sensitive);
      if (result) {
        matchedElements.push(result);
      } 
    }
    if (matchedElements.length > 0) {
      var index = searchIndex % matchedElements.length;
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

function init(typeAheadOptions) {
  var keycodes = {
    "backspace": 8,
    "tab": 9,
    "enter": 13,
    "spacebar": 32,
    "escape": 27
  };
  var search_mode = null;
  var search = "";
  var searchIndex = 0;

  function clearSearch() {
    search = '';
    searchIndex = 0;
    search_mode = null;
    selection = window.getSelection();
    selection.removeAllRanges();
    clearSearchBox();
  }    
   
  function processSearchWithOptions(blur_unless_found) {
    return processSearch(search, searchIndex, 
      {case_sensitive: typeAheadOptions["case_sensitive"], 
       search_only_links: typeAheadOptions["search_only_links"],
       blur_unless_found: blur_unless_found
      });    
  }
 
  window.addEventListener('keydown', function(ev) {
    if (isInputElementActive())
      return;      
      
    var code = ev.keyCode;
    var selectedAnchor = getSelectedAnchor();    
        
    if (code == keycodes.backspace && search_mode) {
      if (search) {
        search = search.substr(0, search.length-1);
        processSearchWithOptions(true);
        showSearchBox(search);
      }
    } else if (code == keycodes.escape) {
      clearSearch();
    } else if (code == keycodes.enter && selectedAnchor) {
      clearSearch();
      return;
    } else if (code == keycodes.tab && selectedAnchor && search) {
      searchIndex += ev.shiftKey ? -1 : +1;
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
        (code != keycodes.spacebar || search)) {
      var old_search = search; 
      search += ascii;
      if (!processSearchWithOptions(false)) {
        search = old_search;
      } else {
        search_mode = 1;
        showSearchBox(search);
      }
      if (code == keycodes.spacebar) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }        
  }, false);
  
  window.addEventListener('mousedown', function(ev) {
    if (search_mode) {
      clearSearch();      
    }  
  }, false);  
}

/*  
var typeAheadOptions = {
*/

chrome.extension.sendRequest({'get_options': true}, function(response) {
  var options = {
    case_sensitive: (response.case_sensitive == '1'),
    search_only_links: (response.search_only_links == '1')
  };
    
  init(options);
});
