/*
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
 
 Author: Arnau Sanchez <tokland@gmail.com> (web: http://www.arnau-sanchez.com/en)
*/ 

function getSelectedAnchor() {
  if (document.activeElement.tagName == "A")
    return(document.activeElement);
}

// Refactor of http://james.padolsey.com/javascript/find-and-replace-text-with-javascript/
function findTextRecursively(searchNode, searchText) {
  var regex = typeof searchText === 'string' ?
              new RegExp(searchText, 'i') : searchText;
  var childNodes = (searchNode || document.body).childNodes;
  var cnLength = childNodes.length;
  var excludes = 'html,head,style,title,link,meta,script,object,iframe';
  
  while (cnLength--) {
    var currentNode = childNodes[cnLength];
    if (currentNode.nodeType === 1 &&
      (excludes + ',').indexOf(currentNode.nodeName.toLowerCase() + ',') === -1) {
      result = arguments.callee(currentNode, searchText);
      if (result)
        return result;
    }
    if (currentNode.nodeType !== 3 || !regex.test(currentNode.data) )
      continue;
    return {node: currentNode, index: currentNode.data.search(regex)}
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
    
    for(var index = 0; index < anchors.length; index++) {
      anchor = anchors[index];
      result = findTextRecursively(anchor, search);
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
      var start = marchedAnchors[index].index;
      range.setStart(node, start);
      range.setEnd(node, start + search.length);
      selection.addRange(range);
      selected = true;
    } 
  }
  if (selectedAnchor && !selected && !skip_blur)
    selectedAnchor.blur();
    
  return(selected);
}

function setKeyboardListeners() {
  var search = "";
  var searchIndex = 0;
  var chars = "abcdefghijklmnopqrstuvwxyz0123456789";  
  var keycodes = {
    "backspace": 8,
    "tab": 9,
    "enter": 13,
    "escape": 27
  }
  
  window.addEventListener('keydown', function(ev) {
    if (document.activeElement.tagName == "INPUT")
      return;
      
    var code = ev.keyCode;
    var selectedAnchor = getSelectedAnchor();    
    
    if (code == keycodes.backspace) {
      if (search) {
        search = search.substr(0, search.length-1)
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
    var name = document.activeElement.tagName;
    if (name == "INPUT" ||name == "SELECT")
      return;
      
    var code = ev.keyCode;
    var ascii = String.fromCharCode(code);
    
    if (!ev.altKey && !ev.metaKey && !ev.controlKey && ascii) {
      var old_search = search; 
      search += ascii;
      if (!processSearch(search, searchIndex, true)) {
        search = old_search;
      }        
    }
  }, false);
}

setKeyboardListeners();
