/*global define:true, document:true, window:true, HTMLElement:true*/
const defaultSettings = {
  alignVert: false, // if true, textFit will align vertically using css tables
  alignHoriz: false, // if true, textFit will set text-align: center
  multiLine: false, // if true, textFit will not set white-space: no-wrap
  detectMultiLine: true, // disable to turn off automatic multi-line sensing
  minFontSize: 6,
  maxFontSize: 80,
  reProcess: true, // if true, textFit will re-process already-fit nodes. Set to 'false' for better performance
  widthOnly: false, // if true, textFit will fit text to element width, regardless of text height
  alignVertWithFlexbox: false, // if true, textFit will use flexbox for vertical alignment
};

(function ($) {
$.fn.sizeChanged = function (handleFunction) {
    var element = this;
    var lastWidth = element.width();
    var lastHeight = element.height();

    setInterval(function () {
        if (lastWidth === element.width()&&lastHeight === element.height())
            return;
        if (typeof (handleFunction) == 'function') {
            handleFunction({ width: lastWidth, height: lastHeight },
                           { width: element.width(), height: element.height() });
            lastWidth = element.width();
            lastHeight = element.height();
        }
    }, 100);

    return element;
};

}(jQuery));

$(document).ready(function() {
	$("body").on('DOMSubtreeModified', "[fit-text='true']", function() {
		startAutoFit();
	});
	
	$("[fit-text='true']").sizeChanged(function(){
		debugger;
		startAutoFit();
	});
	
    startAutoFit();
});

function startAutoFit() {
  $("[fit-text='true']").each(function (index, value) {
	  debugger;
	if(isNullOrEmpty(value.innerText)) return;
		  
    let attSettings = {
      alignVert: value.getAttribute('fit-align-vert') === 'true',
      alignHoriz: value.getAttribute('fit-align-horiz') === 'true',
      multiLine: value.getAttribute('fit-multi-line') === 'true',
      minFontSize: !isNullOrEmpty(value.getAttribute('fit-min-font')) ? parseInt(value.getAttribute('fit-min-font')) : 6,
      maxFontSize: !isNullOrEmpty(value.getAttribute('fit-max-font')) ? parseInt(value.getAttribute('fit-max-font')) : 80,
      widthOnly: value.getAttribute('fit-widthOnly') === 'true',
      detectMultiLine: !isNullOrEmpty(value.getAttribute('fit-detect-multi-line')) ? value.getAttribute('fit-detect-multi-line') === 'true' : true,
      reProcess: !isNullOrEmpty(value.getAttribute('fit-reProcess')) ? value.getAttribute('fit-reProcess') === 'true' : true,
      alignVertWithFlexbox: value.getAttribute('fit-align-vert-flexbox') === 'true',
    };

    let settings = {};
    for(var key in defaultSettings){
      if(attSettings.hasOwnProperty(key) && !isNullOrEmpty(attSettings[key])) {
        settings[key] = attSettings[key];
      } else {
        settings[key] = defaultSettings[key];
      }
    }

    textFit(value, settings);
  });
}

(function(root, factory) {
  "use strict";

  // UMD shim
  if (typeof define === "function" && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof exports === "object") {
    // Node/CommonJS
    module.exports = factory();
  } else {
    // Browser
    root.textFit = factory();
  }

}(typeof global === "object" ? global : this, function () {
  "use strict";

  return function textFit(els, options) {

    if (!options) options = {};

    // Extend options.
    var settings = {};
    for(var key in defaultSettings){
      if(options.hasOwnProperty(key)){
        settings[key] = options[key];
      } else {
        settings[key] = defaultSettings[key];
      }
    }

    // Convert jQuery objects into arrays
    if (typeof els.toArray === "function") {
      els = els.toArray();
    }

    // Support passing a single el
    var elType = Object.prototype.toString.call(els);
    if (elType !== '[object Array]' && elType !== '[object NodeList]' &&
            elType !== '[object HTMLCollection]'){
      els = [els];
    }

    // Process each el we've passed.
    for(var i = 0; i < els.length; i++){
      processItem(els[i], settings);
    }
  };

  /**
   * The meat. Given an el, make the text inside it fit its parent.
   * @param  {DOMElement} el       Child el.
   * @param  {Object} settings     Options for fit.
   */
  function processItem(el, settings){
    if (!isElement(el)) {
      return false;
    }

    // Set textFitted attribute so we know this was processed.
    if(!settings.reProcess){
      el.setAttribute('textFitted', 1);
    }

    var innerSpan, originalHeight, originalHTML, originalWidth;
    var low, mid, high;

    // Get element data.
    originalHTML = el.innerHTML;

    // Add textFitted span inside this container.
    if (originalHTML.indexOf('textFitted') === -1) {
      innerSpan = document.createElement('span');
      innerSpan.className = 'textFitted';
      // Inline block ensure it takes on the size of its contents, even if they are enclosed
      // in other tags like <p>
      innerSpan.style['display'] = 'inline-block';
      innerSpan.innerHTML = originalHTML;
      el.innerHTML = '';
      el.appendChild(innerSpan);
    } else {
      // Reprocessing.
      innerSpan = el.querySelector('span.textFitted');
      // Remove vertical align if we're reprocessing.
      if (hasClass(innerSpan, 'textFitAlignVert')){
        innerSpan.className = innerSpan.className.replace('textFitAlignVert', '');
        innerSpan.style['height'] = '';
        el.className.replace('textFitAlignVertFlex', '');
      }
    }

    try{
      let viewBounds = el.getBoundingClientRect();
      originalWidth = el.offsetWidth;
      originalHeight = el.offsetHeight;
      innerSpan.style['width'] = originalWidth + 'px';
      innerSpan.style['height'] = originalHeight + 'px';
    } catch (err) {
      console.log(err.toString())
    }

    // Don't process if we can't find box dimensions
    if (!originalWidth || (!settings.widthOnly && !originalHeight)) {
      if(!settings.widthOnly)
        throw new Error('Set a static height and width on the target element ' + el.outerHTML +
          ' before using textFit!');
      else
        throw new Error('Set a static width on the target element ' + el.outerHTML +
          ' before using textFit!');
    }

    // Prepare & set alignment
    if (settings.alignHoriz) {
      el.style['text-align'] = 'center';
      innerSpan.style['text-align'] = 'center';
    }

    // Check if this string is multiple lines
    // Not guaranteed to always work if you use wonky line-heights
    var multiLine = settings.multiLine;
    if (settings.detectMultiLine && !multiLine &&
        innerSpan.scrollHeight >= parseInt(window.getComputedStyle(innerSpan)['font-size'], 10) * 2){
      multiLine = true;
    }

    // If we're not treating this as a multiline string, don't let it wrap.
    if (!multiLine) {
      el.style['white-space'] = 'nowrap';
    }

    low = settings.minFontSize;
    high = settings.maxFontSize;

    // Binary search for highest best fit
    var size = low;
    while (low <= high) {
      mid = (high + low) >> 1;
      innerSpan.style.fontSize = mid + 'px';
      debugger;
      if(innerSpan.scrollWidth <= originalWidth &&
         (settings.widthOnly || innerSpan.scrollHeight <= originalHeight)){
        size = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
      // await injection point
    }
    // found, updating font if differs:
    if( innerSpan.style.fontSize != size + 'px' ) innerSpan.style.fontSize = size + 'px';

    // Our height is finalized. If we are aligning vertically, set that up.
    if (settings.alignVert) {
      addStyleSheet();
      var height = innerSpan.scrollHeight;
      if (window.getComputedStyle(el)['position'] === "static"){
        el.style['position'] = 'relative';
      }
      if (!hasClass(innerSpan, "textFitAlignVert")){
        innerSpan.className = innerSpan.className + " textFitAlignVert";
      }
      innerSpan.style['height'] = height + "px";
      if (settings.alignVertWithFlexbox && !hasClass(el, "textFitAlignVertFlex")) {
        el.className = el.className + " textFitAlignVertFlex";
      }
    }
  }

  //Calculate text node bounds
  function getTextNodeBounds(textNode) {
    if (document.createRange) {
        var range = document.createRange();
        range.selectNodeContents(textNode);

        if (range.getBoundingClientRect) {
            return range.getBoundingClientRect();
        }
    }
    return null;
}

  // Calculate height without padding.
  function innerHeight(el){
    var style = window.getComputedStyle(el, null);
    return el.clientHeight -
      parseInt(style.getPropertyValue('padding-top'), 10) -
      parseInt(style.getPropertyValue('padding-bottom'), 10);
  }

  // Calculate width without padding.
  function innerWidth(el){
    var style = window.getComputedStyle(el, null);
    return el.clientWidth -
      parseInt(style.getPropertyValue('padding-left'), 10) -
      parseInt(style.getPropertyValue('padding-right'), 10);
  }

  //Returns true if it is a DOM element
  function isElement(o){
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  }

  function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
  }

  // Better than a stylesheet dependency
  function addStyleSheet() {
    if (document.getElementById("textFitStyleSheet")) return;
    var style = [
      ".textFitAlignVert{",
        "position: absolute;",
        "top: 0; right: 0; bottom: 0; left: 0;",
        "margin: auto;",
        "display: flex;",
        "justify-content: center;",
        "flex-direction: column;",
      "}",
      ".textFitAlignVertFlex{",
        "display: flex;",
      "}",
      ".textFitAlignVertFlex .textFitAlignVert{",
        "position: static;",
      "}",].join("");

    var css = document.createElement("style");
    css.type = "text/css";
    css.id = "textFitStyleSheet";
    css.innerHTML = style;
    document.body.appendChild(css);
  }
}));

function isNullOrEmpty(variable) {
  return variable === undefined ||
      variable === null ||
      variable === "null" ||
      variable == "" ||
      variable == " " ||
      variable == "\n";
}