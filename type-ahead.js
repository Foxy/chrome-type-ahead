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
    
function up(element, tagName) {
  var upTagName = tagName.toUpperCase();
  while (element && (!element.tagName || element.tagName.toUpperCase() != upTagName)) {
    element = element.parentNode;
  }
  return element;
}

function isVisible(element) {
  while (element) {
    style = window.getComputedStyle(element);
    if (style && style.getPropertyValue('display') == 'none')
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

function getSelectedAnchor() {
  var rootNodes = [document].concat(getRootNodes());
  for (var i = 0; i < rootNodes.length; i++) {
    var doc = rootNodes[i].contentDocument || rootNodes[i];  
    if (doc.activeElement && doc.activeElement.tagName == "A")
      return(doc.activeElement);
  }
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

function isInputElementActive(doc) {
  var name = document.activeElement && document.activeElement.tagName;
  return (name == "INPUT" || name == "SELECT" || name == "TEXTAREA");
}

function selectOnchange(select) {
  if (select) {
    select.focus(); 
    if (select.onchange) 
      select.onchange();
    return true;
  }
}

function clearSearchBox() {
  var box = document.getElementById('type-ahead-box');
  if (box) {
    box.style.display = 'none';
  }
}

function showSearchBox(search) {
  var colors = {
    text: {ok: '#FFD', ko: '#FDD'},
    links: {ok: '#DDF', ko: '#FDF'},
  }
  var box = document.getElementById('type-ahead-box');
  if (!box) { 
    box = document.createElement('TABOX');
    box.id = 'type-ahead-box';
    document.documentElement.appendChild(box);
    addStyle(styles);
  }
  box.style.display = 'block';
  var color = colors[search.mode][(search.total < 1 && search.text) ? 'ko' : 'ok'] 
  box.style['background-color'] = color;
  box.innerHTML = search.text ? 
    (search.text + ' <small>(' + search.nmatch + ' of ' + search.total + ')</small>') : '&nbsp;';
}

function processSearch(search, options) {
  var selected = false;    
  var selectedAnchor = getSelectedAnchor();
  
  if (selectedAnchor)
    selectedAnchor.blur();
  
  if (search.text.length > 0) {  
    var matchedElements = [];
    var string = search.text.replace(/\s+/g, "(\\s|\240)+");
    var regexp =  new RegExp(string, options.case_sensitive ? 'g' : 'ig')
    // thix xpath does not support matches :-(
    // document.evaluate('//a//*[matches(text(),"regexp")]', document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(N);
    var rootNodes = new Array(window);
    var frames = document.getElementsByTagName('frame');
    for (var i = 0; i < frames.length; i++)
      rootNodes.push(frames[i]);
    for (var i = 0; i < rootNodes.length; i++) {    
      var doc = rootNodes[i].document || rootNodes[i].contentDocument;
      if (!doc)
        continue;
      var frame = rootNodes[i].contentWindow || rootNodes[i];
    
      var nodeIterator = doc.createNodeIterator(
        doc.body,
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
        if (!isVisible(textNode.parentNode))
          continue;
        if (up(textNode, 'script'))
          continue;
        var anchor = up(textNode, 'a');
        if (search.mode == 'links' && !anchor)
          continue;
        var regexp2 = new RegExp(regexp);
        var start = textNode.data.search(regexp2);
        if (start >= 0) {
          regexp2.exec(textNode.data);
          var end = regexp2.lastIndex;
          var result = {doc: doc, frame: frame, node: textNode, anchor: anchor, start: start, end: end};
          matchedElements.push(result);
        }
      }
    }
    
    search.total = matchedElements.length;

    if (matchedElements.length > 0) {
      var index = search.index % matchedElements.length;
      if (index < 0)
        index += matchedElements.length;
      search.nmatch = index + 1;      
      var node = matchedElements[index].node;
      var frame = matchedElements[index].frame;
      if (matchedElements[index].anchor)
        matchedElements[index].anchor.focus();
      else
        scrollToElement(node.parentNode);
      var option = up(node.parentNode, 'option');
      if (option) {
        option.selected = 'selected';
        search.select = up(option, 'select');
      } else {
        search.select = null;
      }
      clearRanges();
      var doc = matchedElements[index].doc;
      var range = doc.createRange();
      range.setStart(node, matchedElements[index].start);
      range.setEnd(node, matchedElements[index].end);
      var selection = window.getSelection();
      selection.addRange(range);
      selected = true;
    } else {
      search.nmatch = 0;    
      clearRanges();
    } 
  } else {
    clearRanges();
  }
  
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
    "f4": 115,
  };

  function clearSearch(clearRanges) {
    search = {mode: null, text: '', index: 0, matches: 0, total: 0, select: null};
    if (clearRanges) { 
      selection = window.getSelection();
      selection.removeAllRanges();
    }
    clearSearchBox();
  }
   
  function processSearchWithOptions(blur_unless_found) {
    return processSearch(search, { 
      case_sensitive: options["case_sensitive"], 
      search_links: (search.mode == 'links'),
      blur_unless_found: blur_unless_found
    });    
  }

  function setEvents(rootNode) {
    rootNode.addEventListener('keydown', function(ev) {
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
        clearSearch(false);
      } else if (code == keycodes.enter && (selectedAnchor || selectOnchange(search.select))) {
        clearSearch(true);
        return;
      } else if (code == keycodes.f4 && search.mode) {
        search.mode = (search.mode == 'text') ? 'links' : 'text'
        search.index = 0;
        processSearchWithOptions(true);
        showSearchBox(search);
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
    
    clearSearch(false);    
    rootNode.addEventListener('keypress', function(ev) {
      if (isInputElementActive())
        return;
      var code = ev.keyCode;
      var ascii = String.fromCharCode(code);
      
      if (!ev.altKey && !ev.metaKey && !ev.ctrlKey && 
          ascii && code != keycodes.enter &&
          (code != keycodes.spacebar || search.mode)) {
        var add = true; 
        if (!search.mode) {
          search.mode = ((ascii == "'") ^ options.main_search_links) ? 'links' : 'text';
          if (ascii == "'")
            add = false;
        }
        if (add) 
          search.text += ascii;
        processSearchWithOptions(true)
        showSearchBox(search);
        if (code == keycodes.spacebar) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      }        
    }, false);
 
    var mouseNode = (rootNode != window) ? rootNode : document.body
    mouseNode.addEventListener('mousedown', function(ev) {
      if (search.mode)
        clearSearch(false);      
    }, false);
  }
  
  var rootNodes = [window].concat(getRootNodes());
  for (var i = 0; i < rootNodes.length; i++) {
    var rootNode = rootNodes[i];
    if (rootNode.contentDocument) { 
      rootNode.addEventListener('load', function(ev) {
        setEvents(ev.target.contentDocument.body);
      });
    }
    if (!rootNode.contentDocument || rootNode.contentDocument.readyState == 'complete')
      setEvents(rootNode.contentDocument ? rootNode.contentDocument.body : rootNode);
  }  
}

/* Default options */
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
  // This code works also as stand-alone script
  window.addEventListener('load', function(ev) {
    init(options);
  });
}
