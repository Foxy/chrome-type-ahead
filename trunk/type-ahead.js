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
    position: fixed !important;\
    top: 0 !important;\
    right: 0 !important;\
    margin: 0 !important;\
    text-align: left !important;\
    z-index: 9999 !important;\
    //background-color: #FFC !important;\
    color: #000 !important;\
    border-bottom: 1px solid #ccc !important;\
    border-bottom: 1px solid rgba(0,0,0,0.3) !important;\
    padding: 4px 8px;\
    opacity: 0.9;\
    float: right !important;\
    clear: both !important;\
    overflow: hidden !important;\
    font-size: 18px !important;\
    font-family: Arial, Verdana, Georgia, Serif;\
    white-space: pre-wrap !important;\
    min-width: 60px;\
    outline: 0 !important;\
    -webkit-box-shadow: 0px 2px 8px rgba(0,0,0,0.2);\
    -moz-box-shadow: 0px 2px 8px rgba(0,0,0,0.3);\
  }\
  \
  #type-ahead-box small {\
    letter-spacing: -0.12em;\
    color: #444;\
  }'

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

function getStyle(el, styleProp)
{
  return document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
}

function scrollToElement(element) {
  var selectedPosX = 0;
  var selectedPosY = 0;              
  while(element) {
    selectedPosX += element.offsetLeft;
    selectedPosY += element.offsetTop;
    element = element.offsetParent;
  }
  window.scrollTo(selectedPosX, selectedPosY);
}

function isInputElementActive() {
  var name = document.activeElement.tagName;
  return (name == "INPUT" || name == "SELECT" || name == "TEXTAREA");
}

function clearSearchBox() {
  var box = document.getElementById('type-ahead-box');
  if (box) {
    box.style.display = 'none';
  }
}

function showSearchBox(search) {
  var box = document.getElementById('type-ahead-box');
  if (!box) { 
    box = document.createElement('TABOX');
    box.id = 'type-ahead-box';
    document.documentElement.appendChild(box);
    addStyle(styles);
  }
  box.style.display = 'block';
  var color = (search.mode == 'text') ? '#FFD' : '#DDF'; 
  box.style['background-color'] = color;
  box.innerHTML = search.text ? 
    (search.text + ' <small>(' + search.nmatch + ' of ' + search.total + ')</small>') : '&nbsp;';
}

function processSearch(search, options) {
  var selected = false;    
  var selectedAnchor = getSelectedAnchor();
  var selection = window.getSelection();
  
  if (search.text.length > 0) {  
    var matchedElements = [];
    var string = search.text.replace(/\s+/g, "(\\s|\240)+");
    var regexp =  new RegExp(string, options.case_sensitive ? 'g' : 'ig')
    // thix xpath does not support matches :-(
    // document.evaluate('//a//*[matches(text(),"regexp")]', document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(N);
    var nodeIterator = document.createNodeIterator(
      document.body,
      NodeFilter.SHOW_TEXT,
      { 
        acceptNode: function (node) {
          return regexp.test(node.data) ? 
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      },
      true
    );    

    while ((textNode = nodeIterator.nextNode()) != null) {
      if (getStyle(textNode.parentNode, 'display') == 'none')
        continue;
      var anchor = up(textNode, 'a');
      if (search.mode == 'links' && !anchor)
        continue;
      var regexp2 = new RegExp(regexp);
      var start = textNode.data.search(regexp2);
      if (start >= 0) {
        regexp2.exec(textNode.data);
        var end = regexp2.lastIndex;
        var result = {node: textNode, anchor: anchor, start: start, end: end};
        matchedElements.push(result);
      }
    }
    
    if (matchedElements.length > 0) {
      search.total = matchedElements.length;
      var index = search.index % matchedElements.length;
      if (index < 0)
        index += matchedElements.length;
      search.nmatch = index + 1;      
      var node = matchedElements[index].node;
      if (matchedElements[index].anchor)
        matchedElements[index].anchor.focus();
      //else
        scrollToElement(node.parentNode);
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
    "escape": 27,
    "g": 71,
    "f3": 114,
  };

  function clearSearch() {
    search = {mode: null, text: '', index: 0, matches: 0, total: 0}; 
    selection = window.getSelection();
    selection.removeAllRanges();
    clearSearchBox();
  }
  
  clearSearch();    
   
  function processSearchWithOptions(blur_unless_found) {
    return processSearch(search, { 
      case_sensitive: options["case_sensitive"], 
      search_links: (search.mode == 'links'),
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
    } else if (search.text && (code == keycodes.f3 ||
                              (code == keycodes.g && ev.ctrlKey))) { 
      search.index += ev.shiftKey ? -1 : +1;
      processSearchWithOptions(true);
      showSearchBox(search);
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
    
    if (!ev.altKey && !ev.metaKey && !ev.ctrlKey && ascii && 
        (code != keycodes.spacebar || search.mode)) {
      var old_text = search.text;
      var add = true; 
      if (!search.mode) {
        search.mode = ((ascii == "'") ^ options.main_search_links) ? 'links' : 'text';
        if (ascii == "'")
          add = false;
      }
      if (add) 
        search.text += ascii;
      if (!processSearchWithOptions(false))
        search.text = old_text;
      showSearchBox(search);
      if (code == keycodes.spacebar) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }        
  }, false);
  
  document.body.addEventListener('mousedown', function(ev) {
    if (search.mode)
      clearSearch();      
  }, false);  
}

/*  
var options = {
*/

var options = {
  case_sensitive: false,
  main_search_links: false
};

if (chrome.extension) {
  chrome.extension.sendRequest({'get_options': true}, function(response) {
    options = {
      case_sensitive: (response.case_sensitive == '1'),
      main_search_links: (response.main_search_links == '1')
    };
    init(options);
  });
} else {
  window.addEventListener('load', function(ev) {
    init(options);
  });
}
