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

function getSelectedAnchor() {
  if (document.activeElement.tagName == "A")
    return(document.activeElement);
}

// Refactor of http://james.padolsey.com/javascript/find-and-replace-text-with-javascript/
function findTextRecursively(searchNode, searchText) {
  var regex = typeof searchText == 'string' ?
              new RegExp(searchText, 'ig') : searchText;
  var childNodes = (searchNode || document.body).childNodes;
  var cnLength = childNodes.length;
  var excludes = 'html,head,style,title,link,meta,script,object,iframe';
  
  while (cnLength--) {
    var currentNode = childNodes[cnLength];
    if (currentNode.nodeType == 1 &&
        (excludes + ',').indexOf(currentNode.nodeName.toLowerCase() + ',') == -1) {
      result = findTextRecursively(currentNode, searchText);
      if (result)
        return result;
    }
    if (currentNode.nodeType == 3) {
      var start = currentNode.data.search(regex);
      if (start >= 0) {
        regex.exec(currentNode.data);
        var end = regex.lastIndex;
        return {node: currentNode, start: start, end: end}
      }
    }
  }
}

function up(element, tagName) {
  var upTagName = tagName.toUpperCase();
  while (element && (!element.tagName || element.tagName.toUpperCase() != upTagName)) {
    element = element.parentNode;
  }
  return element;
}

function processSearch(search, searchIndex, skip_blur) {
  var selected = false;    
  var selectedAnchor = getSelectedAnchor();
  
  if (search.length > 0) {
    var marchedAnchors = [];
    anchors = document.getElementsByTagName('a');
    var smartSearch = search.replace(/\s+/g, "(\\s|\240)+");
    for(var index = 0; index < anchors.length; index++) {
      anchor = anchors[index];
      result = findTextRecursively(anchor, smartSearch);
      if (result) {
        marchedAnchors.push(result);
      } 
    }
    if (marchedAnchors.length > 0) {
      var index = searchIndex % marchedAnchors.length;
      if (index < 0)
        index += marchedAnchors.length; 
      node = marchedAnchors[index].node;
      up(node, 'a').focus();
      var selection = window.getSelection();
      selection.removeAllRanges();
      var range = document.createRange();
      range.setStart(node, marchedAnchors[index].start);
      range.setEnd(node, marchedAnchors[index].end);
      selection.addRange(range);
      selected = true;
    } 
  }
  if (selectedAnchor && !selected && !skip_blur)
    selectedAnchor.blur();
    
  return(selected);
}

function isInputElementActive() {
  var name = document.activeElement.tagName;
  return (name == "INPUT" || name == "SELECT" || name == "TEXTAREA");
}

function setKeyboardListeners() {
  var keycodes = {
    "backspace": 8,
    "tab": 9,
    "enter": 13,
    "spacebar": 32,
    "escape": 27
  };
  var search = "";
  var searchIndex = 0;
  
  window.addEventListener('keydown', function(ev) {
    if (isInputElementActive())
      return;
      
    var code = ev.keyCode;
    var selectedAnchor = getSelectedAnchor();    
    
    if (code == keycodes.backspace) {
      if (search) {
        search = search.substr(0, search.length-1);
        processSearch(search, searchIndex);
      }
    } else if (code == keycodes.escape && search) {
      selection = window.getSelection();
      selection.removeAllRanges();
      search = "";
      searchIndex = 0;
    } else if (code == keycodes.enter && selectedAnchor) {
      selection = window.getSelection();
      selection.removeAllRanges();
      search = "";
      searchIndex = 0;
      return;
    } else if (code == keycodes.tab && selectedAnchor && search) {
      searchIndex += ev.shiftKey ? -1 : +1;
      processSearch(search, searchIndex);
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
      if (!processSearch(search, searchIndex, true))
        search = old_search;
      if (code == keycodes.spacebar) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }        
  }, false);
}

setKeyboardListeners();
