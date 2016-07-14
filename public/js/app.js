(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
/* global HTMLElement */

'use strict'

module.exports = function emptyElement (element) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('Expected an element')
  }

  var node
  while ((node = element.lastChild)) element.removeChild(node)
  return element
}

},{}],4:[function(require,module,exports){
/* jshint node:true */

'use strict';

var IntlMessageFormat = require('./lib/main')['default'];

// Add all locale data to `IntlMessageFormat`. This module will be ignored when
// bundling for the browser with Browserify/Webpack.
require('./lib/locales');

// Re-export `IntlMessageFormat` as the CommonJS default exports with all the
// locale data registered, and with English set as the default locale. Define
// the `default` prop for use with other compiled ES6 Modules.
exports = module.exports = IntlMessageFormat;
exports['default'] = exports;

},{"./lib/locales":1,"./lib/main":9}],5:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
exports["default"] = Compiler;

function Compiler(locales, formats, pluralFn) {
    this.locales  = locales;
    this.formats  = formats;
    this.pluralFn = pluralFn;
}

Compiler.prototype.compile = function (ast) {
    this.pluralStack        = [];
    this.currentPlural      = null;
    this.pluralNumberFormat = null;

    return this.compileMessage(ast);
};

Compiler.prototype.compileMessage = function (ast) {
    if (!(ast && ast.type === 'messageFormatPattern')) {
        throw new Error('Message AST is not of type: "messageFormatPattern"');
    }

    var elements = ast.elements,
        pattern  = [];

    var i, len, element;

    for (i = 0, len = elements.length; i < len; i += 1) {
        element = elements[i];

        switch (element.type) {
            case 'messageTextElement':
                pattern.push(this.compileMessageText(element));
                break;

            case 'argumentElement':
                pattern.push(this.compileArgument(element));
                break;

            default:
                throw new Error('Message element does not have a valid type');
        }
    }

    return pattern;
};

Compiler.prototype.compileMessageText = function (element) {
    // When this `element` is part of plural sub-pattern and its value contains
    // an unescaped '#', use a `PluralOffsetString` helper to properly output
    // the number with the correct offset in the string.
    if (this.currentPlural && /(^|[^\\])#/g.test(element.value)) {
        // Create a cache a NumberFormat instance that can be reused for any
        // PluralOffsetString instance in this message.
        if (!this.pluralNumberFormat) {
            this.pluralNumberFormat = new Intl.NumberFormat(this.locales);
        }

        return new PluralOffsetString(
                this.currentPlural.id,
                this.currentPlural.format.offset,
                this.pluralNumberFormat,
                element.value);
    }

    // Unescape the escaped '#'s in the message text.
    return element.value.replace(/\\#/g, '#');
};

Compiler.prototype.compileArgument = function (element) {
    var format = element.format;

    if (!format) {
        return new StringFormat(element.id);
    }

    var formats  = this.formats,
        locales  = this.locales,
        pluralFn = this.pluralFn,
        options;

    switch (format.type) {
        case 'numberFormat':
            options = formats.number[format.style];
            return {
                id    : element.id,
                format: new Intl.NumberFormat(locales, options).format
            };

        case 'dateFormat':
            options = formats.date[format.style];
            return {
                id    : element.id,
                format: new Intl.DateTimeFormat(locales, options).format
            };

        case 'timeFormat':
            options = formats.time[format.style];
            return {
                id    : element.id,
                format: new Intl.DateTimeFormat(locales, options).format
            };

        case 'pluralFormat':
            options = this.compileOptions(element);
            return new PluralFormat(
                element.id, format.ordinal, format.offset, options, pluralFn
            );

        case 'selectFormat':
            options = this.compileOptions(element);
            return new SelectFormat(element.id, options);

        default:
            throw new Error('Message element does not have a valid format type');
    }
};

Compiler.prototype.compileOptions = function (element) {
    var format      = element.format,
        options     = format.options,
        optionsHash = {};

    // Save the current plural element, if any, then set it to a new value when
    // compiling the options sub-patterns. This conforms the spec's algorithm
    // for handling `"#"` syntax in message text.
    this.pluralStack.push(this.currentPlural);
    this.currentPlural = format.type === 'pluralFormat' ? element : null;

    var i, len, option;

    for (i = 0, len = options.length; i < len; i += 1) {
        option = options[i];

        // Compile the sub-pattern and save it under the options's selector.
        optionsHash[option.selector] = this.compileMessage(option.value);
    }

    // Pop the plural stack to put back the original current plural value.
    this.currentPlural = this.pluralStack.pop();

    return optionsHash;
};

// -- Compiler Helper Classes --------------------------------------------------

function StringFormat(id) {
    this.id = id;
}

StringFormat.prototype.format = function (value) {
    if (!value) {
        return '';
    }

    return typeof value === 'string' ? value : String(value);
};

function PluralFormat(id, useOrdinal, offset, options, pluralFn) {
    this.id         = id;
    this.useOrdinal = useOrdinal;
    this.offset     = offset;
    this.options    = options;
    this.pluralFn   = pluralFn;
}

PluralFormat.prototype.getOption = function (value) {
    var options = this.options;

    var option = options['=' + value] ||
            options[this.pluralFn(value - this.offset, this.useOrdinal)];

    return option || options.other;
};

function PluralOffsetString(id, offset, numberFormat, string) {
    this.id           = id;
    this.offset       = offset;
    this.numberFormat = numberFormat;
    this.string       = string;
}

PluralOffsetString.prototype.format = function (value) {
    var number = this.numberFormat.format(value - this.offset);

    return this.string
            .replace(/(^|[^\\])#/g, '$1' + number)
            .replace(/\\#/g, '#');
};

function SelectFormat(id, options) {
    this.id      = id;
    this.options = options;
}

SelectFormat.prototype.getOption = function (value) {
    var options = this.options;
    return options[value] || options.other;
};


},{}],6:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
var src$utils$$ = require("./utils"), src$es5$$ = require("./es5"), src$compiler$$ = require("./compiler"), intl$messageformat$parser$$ = require("intl-messageformat-parser");
exports["default"] = MessageFormat;

// -- MessageFormat --------------------------------------------------------

function MessageFormat(message, locales, formats) {
    // Parse string messages into an AST.
    var ast = typeof message === 'string' ?
            MessageFormat.__parse(message) : message;

    if (!(ast && ast.type === 'messageFormatPattern')) {
        throw new TypeError('A message must be provided as a String or AST.');
    }

    // Creates a new object with the specified `formats` merged with the default
    // formats.
    formats = this._mergeFormats(MessageFormat.formats, formats);

    // Defined first because it's used to build the format pattern.
    src$es5$$.defineProperty(this, '_locale',  {value: this._resolveLocale(locales)});

    // Compile the `ast` to a pattern that is highly optimized for repeated
    // `format()` invocations. **Note:** This passes the `locales` set provided
    // to the constructor instead of just the resolved locale.
    var pluralFn = this._findPluralRuleFunction(this._locale);
    var pattern  = this._compilePattern(ast, locales, formats, pluralFn);

    // "Bind" `format()` method to `this` so it can be passed by reference like
    // the other `Intl` APIs.
    var messageFormat = this;
    this.format = function (values) {
        return messageFormat._format(pattern, values);
    };
}

// Default format options used as the prototype of the `formats` provided to the
// constructor. These are used when constructing the internal Intl.NumberFormat
// and Intl.DateTimeFormat instances.
src$es5$$.defineProperty(MessageFormat, 'formats', {
    enumerable: true,

    value: {
        number: {
            'currency': {
                style: 'currency'
            },

            'percent': {
                style: 'percent'
            }
        },

        date: {
            'short': {
                month: 'numeric',
                day  : 'numeric',
                year : '2-digit'
            },

            'medium': {
                month: 'short',
                day  : 'numeric',
                year : 'numeric'
            },

            'long': {
                month: 'long',
                day  : 'numeric',
                year : 'numeric'
            },

            'full': {
                weekday: 'long',
                month  : 'long',
                day    : 'numeric',
                year   : 'numeric'
            }
        },

        time: {
            'short': {
                hour  : 'numeric',
                minute: 'numeric'
            },

            'medium':  {
                hour  : 'numeric',
                minute: 'numeric',
                second: 'numeric'
            },

            'long': {
                hour        : 'numeric',
                minute      : 'numeric',
                second      : 'numeric',
                timeZoneName: 'short'
            },

            'full': {
                hour        : 'numeric',
                minute      : 'numeric',
                second      : 'numeric',
                timeZoneName: 'short'
            }
        }
    }
});

// Define internal private properties for dealing with locale data.
src$es5$$.defineProperty(MessageFormat, '__localeData__', {value: src$es5$$.objCreate(null)});
src$es5$$.defineProperty(MessageFormat, '__addLocaleData', {value: function (data) {
    if (!(data && data.locale)) {
        throw new Error(
            'Locale data provided to IntlMessageFormat is missing a ' +
            '`locale` property'
        );
    }

    MessageFormat.__localeData__[data.locale.toLowerCase()] = data;
}});

// Defines `__parse()` static method as an exposed private.
src$es5$$.defineProperty(MessageFormat, '__parse', {value: intl$messageformat$parser$$["default"].parse});

// Define public `defaultLocale` property which defaults to English, but can be
// set by the developer.
src$es5$$.defineProperty(MessageFormat, 'defaultLocale', {
    enumerable: true,
    writable  : true,
    value     : undefined
});

MessageFormat.prototype.resolvedOptions = function () {
    // TODO: Provide anything else?
    return {
        locale: this._locale
    };
};

MessageFormat.prototype._compilePattern = function (ast, locales, formats, pluralFn) {
    var compiler = new src$compiler$$["default"](locales, formats, pluralFn);
    return compiler.compile(ast);
};

MessageFormat.prototype._findPluralRuleFunction = function (locale) {
    var localeData = MessageFormat.__localeData__;
    var data       = localeData[locale.toLowerCase()];

    // The locale data is de-duplicated, so we have to traverse the locale's
    // hierarchy until we find a `pluralRuleFunction` to return.
    while (data) {
        if (data.pluralRuleFunction) {
            return data.pluralRuleFunction;
        }

        data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
    }

    throw new Error(
        'Locale data added to IntlMessageFormat is missing a ' +
        '`pluralRuleFunction` for :' + locale
    );
};

MessageFormat.prototype._format = function (pattern, values) {
    var result = '',
        i, len, part, id, value;

    for (i = 0, len = pattern.length; i < len; i += 1) {
        part = pattern[i];

        // Exist early for string parts.
        if (typeof part === 'string') {
            result += part;
            continue;
        }

        id = part.id;

        // Enforce that all required values are provided by the caller.
        if (!(values && src$utils$$.hop.call(values, id))) {
            throw new Error('A value must be provided for: ' + id);
        }

        value = values[id];

        // Recursively format plural and select parts' option — which can be a
        // nested pattern structure. The choosing of the option to use is
        // abstracted-by and delegated-to the part helper object.
        if (part.options) {
            result += this._format(part.getOption(value), values);
        } else {
            result += part.format(value);
        }
    }

    return result;
};

MessageFormat.prototype._mergeFormats = function (defaults, formats) {
    var mergedFormats = {},
        type, mergedType;

    for (type in defaults) {
        if (!src$utils$$.hop.call(defaults, type)) { continue; }

        mergedFormats[type] = mergedType = src$es5$$.objCreate(defaults[type]);

        if (formats && src$utils$$.hop.call(formats, type)) {
            src$utils$$.extend(mergedType, formats[type]);
        }
    }

    return mergedFormats;
};

MessageFormat.prototype._resolveLocale = function (locales) {
    if (typeof locales === 'string') {
        locales = [locales];
    }

    // Create a copy of the array so we can push on the default locale.
    locales = (locales || []).concat(MessageFormat.defaultLocale);

    var localeData = MessageFormat.__localeData__;
    var i, len, localeParts, data;

    // Using the set of locales + the default locale, we look for the first one
    // which that has been registered. When data does not exist for a locale, we
    // traverse its ancestors to find something that's been registered within
    // its hierarchy of locales. Since we lack the proper `parentLocale` data
    // here, we must take a naive approach to traversal.
    for (i = 0, len = locales.length; i < len; i += 1) {
        localeParts = locales[i].toLowerCase().split('-');

        while (localeParts.length) {
            data = localeData[localeParts.join('-')];
            if (data) {
                // Return the normalized locale string; e.g., we return "en-US",
                // instead of "en-us".
                return data.locale;
            }

            localeParts.pop();
        }
    }

    var defaultLocale = locales.pop();
    throw new Error(
        'No locale data has been added to IntlMessageFormat for: ' +
        locales.join(', ') + ', or the default locale: ' + defaultLocale
    );
};


},{"./compiler":5,"./es5":8,"./utils":10,"intl-messageformat-parser":11}],7:[function(require,module,exports){
// GENERATED FILE
"use strict";
exports["default"] = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"}};


},{}],8:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
var src$utils$$ = require("./utils");

// Purposely using the same implementation as the Intl.js `Intl` polyfill.
// Copyright 2013 Andy Earnshaw, MIT License

var realDefineProp = (function () {
    try { return !!Object.defineProperty({}, 'a', {}); }
    catch (e) { return false; }
})();

var es3 = !realDefineProp && !Object.prototype.__defineGetter__;

var defineProperty = realDefineProp ? Object.defineProperty :
        function (obj, name, desc) {

    if ('get' in desc && obj.__defineGetter__) {
        obj.__defineGetter__(name, desc.get);
    } else if (!src$utils$$.hop.call(obj, name) || 'value' in desc) {
        obj[name] = desc.value;
    }
};

var objCreate = Object.create || function (proto, props) {
    var obj, k;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (k in props) {
        if (src$utils$$.hop.call(props, k)) {
            defineProperty(obj, k, props[k]);
        }
    }

    return obj;
};
exports.defineProperty = defineProperty, exports.objCreate = objCreate;


},{"./utils":10}],9:[function(require,module,exports){
/* jslint esnext: true */

"use strict";
var src$core$$ = require("./core"), src$en$$ = require("./en");

src$core$$["default"].__addLocaleData(src$en$$["default"]);
src$core$$["default"].defaultLocale = 'en';

exports["default"] = src$core$$["default"];


},{"./core":6,"./en":7}],10:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
exports.extend = extend;
var hop = Object.prototype.hasOwnProperty;

function extend(obj) {
    var sources = Array.prototype.slice.call(arguments, 1),
        i, len, source, key;

    for (i = 0, len = sources.length; i < len; i += 1) {
        source = sources[i];
        if (!source) { continue; }

        for (key in source) {
            if (hop.call(source, key)) {
                obj[key] = source[key];
            }
        }
    }

    return obj;
}
exports.hop = hop;


},{}],11:[function(require,module,exports){
'use strict';

exports = module.exports = require('./lib/parser')['default'];
exports['default'] = exports;

},{"./lib/parser":12}],12:[function(require,module,exports){
"use strict";

exports["default"] = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = [],
        peg$c1 = function(elements) {
                return {
                    type    : 'messageFormatPattern',
                    elements: elements
                };
            },
        peg$c2 = peg$FAILED,
        peg$c3 = function(text) {
                var string = '',
                    i, j, outerLen, inner, innerLen;

                for (i = 0, outerLen = text.length; i < outerLen; i += 1) {
                    inner = text[i];

                    for (j = 0, innerLen = inner.length; j < innerLen; j += 1) {
                        string += inner[j];
                    }
                }

                return string;
            },
        peg$c4 = function(messageText) {
                return {
                    type : 'messageTextElement',
                    value: messageText
                };
            },
        peg$c5 = /^[^ \t\n\r,.+={}#]/,
        peg$c6 = { type: "class", value: "[^ \\t\\n\\r,.+={}#]", description: "[^ \\t\\n\\r,.+={}#]" },
        peg$c7 = "{",
        peg$c8 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c9 = null,
        peg$c10 = ",",
        peg$c11 = { type: "literal", value: ",", description: "\",\"" },
        peg$c12 = "}",
        peg$c13 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c14 = function(id, format) {
                return {
                    type  : 'argumentElement',
                    id    : id,
                    format: format && format[2]
                };
            },
        peg$c15 = "number",
        peg$c16 = { type: "literal", value: "number", description: "\"number\"" },
        peg$c17 = "date",
        peg$c18 = { type: "literal", value: "date", description: "\"date\"" },
        peg$c19 = "time",
        peg$c20 = { type: "literal", value: "time", description: "\"time\"" },
        peg$c21 = function(type, style) {
                return {
                    type : type + 'Format',
                    style: style && style[2]
                };
            },
        peg$c22 = "plural",
        peg$c23 = { type: "literal", value: "plural", description: "\"plural\"" },
        peg$c24 = function(pluralStyle) {
                return {
                    type   : pluralStyle.type,
                    ordinal: false,
                    offset : pluralStyle.offset || 0,
                    options: pluralStyle.options
                };
            },
        peg$c25 = "selectordinal",
        peg$c26 = { type: "literal", value: "selectordinal", description: "\"selectordinal\"" },
        peg$c27 = function(pluralStyle) {
                return {
                    type   : pluralStyle.type,
                    ordinal: true,
                    offset : pluralStyle.offset || 0,
                    options: pluralStyle.options
                }
            },
        peg$c28 = "select",
        peg$c29 = { type: "literal", value: "select", description: "\"select\"" },
        peg$c30 = function(options) {
                return {
                    type   : 'selectFormat',
                    options: options
                };
            },
        peg$c31 = "=",
        peg$c32 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c33 = function(selector, pattern) {
                return {
                    type    : 'optionalFormatPattern',
                    selector: selector,
                    value   : pattern
                };
            },
        peg$c34 = "offset:",
        peg$c35 = { type: "literal", value: "offset:", description: "\"offset:\"" },
        peg$c36 = function(number) {
                return number;
            },
        peg$c37 = function(offset, options) {
                return {
                    type   : 'pluralFormat',
                    offset : offset,
                    options: options
                };
            },
        peg$c38 = { type: "other", description: "whitespace" },
        peg$c39 = /^[ \t\n\r]/,
        peg$c40 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c41 = { type: "other", description: "optionalWhitespace" },
        peg$c42 = /^[0-9]/,
        peg$c43 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c44 = /^[0-9a-f]/i,
        peg$c45 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c46 = "0",
        peg$c47 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c48 = /^[1-9]/,
        peg$c49 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c50 = function(digits) {
            return parseInt(digits, 10);
        },
        peg$c51 = /^[^{}\\\0-\x1F \t\n\r]/,
        peg$c52 = { type: "class", value: "[^{}\\\\\\0-\\x1F \\t\\n\\r]", description: "[^{}\\\\\\0-\\x1F \\t\\n\\r]" },
        peg$c53 = "\\\\",
        peg$c54 = { type: "literal", value: "\\\\", description: "\"\\\\\\\\\"" },
        peg$c55 = function() { return '\\'; },
        peg$c56 = "\\#",
        peg$c57 = { type: "literal", value: "\\#", description: "\"\\\\#\"" },
        peg$c58 = function() { return '\\#'; },
        peg$c59 = "\\{",
        peg$c60 = { type: "literal", value: "\\{", description: "\"\\\\{\"" },
        peg$c61 = function() { return '\u007B'; },
        peg$c62 = "\\}",
        peg$c63 = { type: "literal", value: "\\}", description: "\"\\\\}\"" },
        peg$c64 = function() { return '\u007D'; },
        peg$c65 = "\\u",
        peg$c66 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
        peg$c67 = function(digits) {
                return String.fromCharCode(parseInt(digits, 16));
            },
        peg$c68 = function(chars) { return chars.join(''); },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parsemessageFormatPattern();

      return s0;
    }

    function peg$parsemessageFormatPattern() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsemessageFormatElement();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsemessageFormatElement();
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c1(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsemessageFormatElement() {
      var s0;

      s0 = peg$parsemessageTextElement();
      if (s0 === peg$FAILED) {
        s0 = peg$parseargumentElement();
      }

      return s0;
    }

    function peg$parsemessageText() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsechars();
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c2;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c2;
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsechars();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c3(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsews();
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parsemessageTextElement() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsemessageText();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c4(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseargument() {
      var s0, s1, s2;

      s0 = peg$parsenumber();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (peg$c5.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c6); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c5.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
          }
        } else {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseargumentElement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseargument();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c10;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseelementFormat();
                  if (s8 !== peg$FAILED) {
                    s6 = [s6, s7, s8];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c2;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c2;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c2;
              }
              if (s5 === peg$FAILED) {
                s5 = peg$c9;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 125) {
                    s7 = peg$c12;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c13); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c14(s3, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseelementFormat() {
      var s0;

      s0 = peg$parsesimpleFormat();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepluralFormat();
        if (s0 === peg$FAILED) {
          s0 = peg$parseselectOrdinalFormat();
          if (s0 === peg$FAILED) {
            s0 = peg$parseselectFormat();
          }
        }
      }

      return s0;
    }

    function peg$parsesimpleFormat() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c17) {
          s1 = peg$c17;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c18); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c19) {
            s1 = peg$c19;
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c20); }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 44) {
            s4 = peg$c10;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsechars();
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c2;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c2;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c2;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$c9;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c21(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsepluralFormat() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c22) {
        s1 = peg$c22;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsepluralStyle();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c24(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseselectOrdinalFormat() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 13) === peg$c25) {
        s1 = peg$c25;
        peg$currPos += 13;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsepluralStyle();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c27(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseselectFormat() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c28) {
        s1 = peg$c28;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseoptionalFormatPattern();
              if (s6 !== peg$FAILED) {
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parseoptionalFormatPattern();
                }
              } else {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c30(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseselector() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s2 = peg$c31;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsenumber();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c2;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$parsechars();
      }

      return s0;
    }

    function peg$parseoptionalFormatPattern() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseselector();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 123) {
              s4 = peg$c7;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c8); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsemessageFormatPattern();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 125) {
                      s8 = peg$c12;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c13); }
                    }
                    if (s8 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c33(s2, s6);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseoffset() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c34) {
        s1 = peg$c34;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsenumber();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c36(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsepluralStyle() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseoffset();
      if (s1 === peg$FAILED) {
        s1 = peg$c9;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseoptionalFormatPattern();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseoptionalFormatPattern();
            }
          } else {
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c37(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c39.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c40); }
      }
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          if (peg$c39.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c40); }
          }
        }
      } else {
        s0 = peg$c2;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsews();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsews();
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c41); }
      }

      return s0;
    }

    function peg$parsedigit() {
      var s0;

      if (peg$c42.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c43); }
      }

      return s0;
    }

    function peg$parsehexDigit() {
      var s0;

      if (peg$c44.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 48) {
        s1 = peg$c46;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = peg$currPos;
        if (peg$c48.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c49); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parsedigit();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parsedigit();
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s2 = input.substring(s1, peg$currPos);
        }
        s1 = s2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c50(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsechar() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      if (peg$c51.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c53) {
          s1 = peg$c53;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c54); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c55();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c56) {
            s1 = peg$c56;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c57); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c58();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c59) {
              s1 = peg$c59;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c60); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c61();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c62) {
                s1 = peg$c62;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c63); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c64();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c65) {
                  s1 = peg$c65;
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c66); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$currPos;
                  s3 = peg$currPos;
                  s4 = peg$parsehexDigit();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsehexDigit();
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parsehexDigit();
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parsehexDigit();
                        if (s7 !== peg$FAILED) {
                          s4 = [s4, s5, s6, s7];
                          s3 = s4;
                        } else {
                          peg$currPos = s3;
                          s3 = peg$c2;
                        }
                      } else {
                        peg$currPos = s3;
                        s3 = peg$c2;
                      }
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c2;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c2;
                  }
                  if (s3 !== peg$FAILED) {
                    s3 = input.substring(s2, peg$currPos);
                  }
                  s2 = s3;
                  if (s2 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c67(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsechars() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsechar();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsechar();
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c68(s1);
      }
      s0 = s1;

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();


},{}],13:[function(require,module,exports){
IntlRelativeFormat.__addLocaleData({"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"in {0} year","other":"in {0} years"},"past":{"one":"{0} year ago","other":"{0} years ago"}}},"month":{"displayName":"month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"in {0} month","other":"in {0} months"},"past":{"one":"{0} month ago","other":"{0} months ago"}}},"day":{"displayName":"day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"in {0} day","other":"in {0} days"},"past":{"one":"{0} day ago","other":"{0} days ago"}}},"hour":{"displayName":"hour","relativeTime":{"future":{"one":"in {0} hour","other":"in {0} hours"},"past":{"one":"{0} hour ago","other":"{0} hours ago"}}},"minute":{"displayName":"minute","relativeTime":{"future":{"one":"in {0} minute","other":"in {0} minutes"},"past":{"one":"{0} minute ago","other":"{0} minutes ago"}}},"second":{"displayName":"second","relative":{"0":"now"},"relativeTime":{"future":{"one":"in {0} second","other":"in {0} seconds"},"past":{"one":"{0} second ago","other":"{0} seconds ago"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"en-001","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-150","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AI","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AS","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AT","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-AU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BB","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BI","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-BZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CA","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CH","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CX","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-CY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DE","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DK","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-DM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-Dsrt","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"en-ER","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FI","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FJ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-FM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GB","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GD","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GH","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GI","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GU","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-GY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-HK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IL","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IN","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-IO","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-JE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-JM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KE","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KI","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KN","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-KY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-LC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-LR","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-LS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MH","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MO","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MP","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MT","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-MY","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NA","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NF","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NL","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NR","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-NZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PH","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PN","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PR","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-PW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-RW","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SB","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SD","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SE","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SH","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SI","parentLocale":"en-150"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SL","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SX","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-SZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-Shaw","pluralRuleFunction":function (n,ord){if(ord)return"other";return"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"other":"+{0} y"},"past":{"other":"-{0} y"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"other":"+{0} m"},"past":{"other":"-{0} m"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"other":"+{0} d"},"past":{"other":"-{0} d"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"other":"+{0} h"},"past":{"other":"-{0} h"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"other":"+{0} min"},"past":{"other":"-{0} min"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"other":"+{0} s"},"past":{"other":"-{0} s"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"en-TC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TK","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TO","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TT","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TV","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-TZ","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-UG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-UM","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-US","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VC","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VG","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VI","parentLocale":"en"});
IntlRelativeFormat.__addLocaleData({"locale":"en-VU","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-WS","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-ZA","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-ZM","parentLocale":"en-001"});
IntlRelativeFormat.__addLocaleData({"locale":"en-ZW","parentLocale":"en-001"});

},{}],14:[function(require,module,exports){
IntlRelativeFormat.__addLocaleData({"locale":"es","pluralRuleFunction":function (n,ord){if(ord)return"other";return n==1?"one":"other"},"fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"anteayer","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-419","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-AR","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-BO","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-CL","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-CO","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-CR","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-CU","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-DO","parentLocale":"es-419","fields":{"year":{"displayName":"Año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"Mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"Día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"anteayer","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"Minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"Segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-EA","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-EC","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-GQ","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-GT","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-HN","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-IC","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-MX","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el año próximo","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el mes próximo","-1":"el mes pasado"},"relativeTime":{"future":{"one":"en {0} mes","other":"en {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-NI","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-PA","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-PE","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-PH","parentLocale":"es"});
IntlRelativeFormat.__addLocaleData({"locale":"es-PR","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-PY","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antes de ayer","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-SV","parentLocale":"es-419","fields":{"year":{"displayName":"año","relative":{"0":"este año","1":"el próximo año","-1":"el año pasado"},"relativeTime":{"future":{"one":"dentro de {0} año","other":"dentro de {0} años"},"past":{"one":"hace {0} año","other":"hace {0} años"}}},"month":{"displayName":"mes","relative":{"0":"este mes","1":"el próximo mes","-1":"el mes pasado"},"relativeTime":{"future":{"one":"dentro de {0} mes","other":"dentro de {0} meses"},"past":{"one":"hace {0} mes","other":"hace {0} meses"}}},"day":{"displayName":"día","relative":{"0":"hoy","1":"mañana","2":"pasado mañana","-2":"antier","-1":"ayer"},"relativeTime":{"future":{"one":"dentro de {0} día","other":"dentro de {0} días"},"past":{"one":"hace {0} día","other":"hace {0} días"}}},"hour":{"displayName":"hora","relativeTime":{"future":{"one":"dentro de {0} hora","other":"dentro de {0} horas"},"past":{"one":"hace {0} hora","other":"hace {0} horas"}}},"minute":{"displayName":"minuto","relativeTime":{"future":{"one":"dentro de {0} minuto","other":"dentro de {0} minutos"},"past":{"one":"hace {0} minuto","other":"hace {0} minutos"}}},"second":{"displayName":"segundo","relative":{"0":"ahora"},"relativeTime":{"future":{"one":"dentro de {0} segundo","other":"dentro de {0} segundos"},"past":{"one":"hace {0} segundo","other":"hace {0} segundos"}}}}});
IntlRelativeFormat.__addLocaleData({"locale":"es-US","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-UY","parentLocale":"es-419"});
IntlRelativeFormat.__addLocaleData({"locale":"es-VE","parentLocale":"es-419"});

},{}],15:[function(require,module,exports){
/* jshint node:true */

'use strict';

var IntlRelativeFormat = require('./lib/main')['default'];

// Add all locale data to `IntlRelativeFormat`. This module will be ignored when
// bundling for the browser with Browserify/Webpack.
require('./lib/locales');

// Re-export `IntlRelativeFormat` as the CommonJS default exports with all the
// locale data registered, and with English set as the default locale. Define
// the `default` prop for use with other compiled ES6 Modules.
exports = module.exports = IntlRelativeFormat;
exports['default'] = exports;

},{"./lib/locales":1,"./lib/main":20}],16:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
var intl$messageformat$$ = require("intl-messageformat"), src$diff$$ = require("./diff"), src$es5$$ = require("./es5");
exports["default"] = RelativeFormat;

// -----------------------------------------------------------------------------

var FIELDS = ['second', 'minute', 'hour', 'day', 'month', 'year'];
var STYLES = ['best fit', 'numeric'];

// -- RelativeFormat -----------------------------------------------------------

function RelativeFormat(locales, options) {
    options = options || {};

    // Make a copy of `locales` if it's an array, so that it doesn't change
    // since it's used lazily.
    if (src$es5$$.isArray(locales)) {
        locales = locales.concat();
    }

    src$es5$$.defineProperty(this, '_locale', {value: this._resolveLocale(locales)});
    src$es5$$.defineProperty(this, '_options', {value: {
        style: this._resolveStyle(options.style),
        units: this._isValidUnits(options.units) && options.units
    }});

    src$es5$$.defineProperty(this, '_locales', {value: locales});
    src$es5$$.defineProperty(this, '_fields', {value: this._findFields(this._locale)});
    src$es5$$.defineProperty(this, '_messages', {value: src$es5$$.objCreate(null)});

    // "Bind" `format()` method to `this` so it can be passed by reference like
    // the other `Intl` APIs.
    var relativeFormat = this;
    this.format = function format(date, options) {
        return relativeFormat._format(date, options);
    };
}

// Define internal private properties for dealing with locale data.
src$es5$$.defineProperty(RelativeFormat, '__localeData__', {value: src$es5$$.objCreate(null)});
src$es5$$.defineProperty(RelativeFormat, '__addLocaleData', {value: function (data) {
    if (!(data && data.locale)) {
        throw new Error(
            'Locale data provided to IntlRelativeFormat is missing a ' +
            '`locale` property value'
        );
    }

    RelativeFormat.__localeData__[data.locale.toLowerCase()] = data;

    // Add data to IntlMessageFormat.
    intl$messageformat$$["default"].__addLocaleData(data);
}});

// Define public `defaultLocale` property which can be set by the developer, or
// it will be set when the first RelativeFormat instance is created by
// leveraging the resolved locale from `Intl`.
src$es5$$.defineProperty(RelativeFormat, 'defaultLocale', {
    enumerable: true,
    writable  : true,
    value     : undefined
});

// Define public `thresholds` property which can be set by the developer, and
// defaults to relative time thresholds from moment.js.
src$es5$$.defineProperty(RelativeFormat, 'thresholds', {
    enumerable: true,

    value: {
        second: 45,  // seconds to minute
        minute: 45,  // minutes to hour
        hour  : 22,  // hours to day
        day   : 26,  // days to month
        month : 11   // months to year
    }
});

RelativeFormat.prototype.resolvedOptions = function () {
    return {
        locale: this._locale,
        style : this._options.style,
        units : this._options.units
    };
};

RelativeFormat.prototype._compileMessage = function (units) {
    // `this._locales` is the original set of locales the user specified to the
    // constructor, while `this._locale` is the resolved root locale.
    var locales        = this._locales;
    var resolvedLocale = this._locale;

    var field        = this._fields[units];
    var relativeTime = field.relativeTime;
    var future       = '';
    var past         = '';
    var i;

    for (i in relativeTime.future) {
        if (relativeTime.future.hasOwnProperty(i)) {
            future += ' ' + i + ' {' +
                relativeTime.future[i].replace('{0}', '#') + '}';
        }
    }

    for (i in relativeTime.past) {
        if (relativeTime.past.hasOwnProperty(i)) {
            past += ' ' + i + ' {' +
                relativeTime.past[i].replace('{0}', '#') + '}';
        }
    }

    var message = '{when, select, future {{0, plural, ' + future + '}}' +
                                 'past {{0, plural, ' + past + '}}}';

    // Create the synthetic IntlMessageFormat instance using the original
    // locales value specified by the user when constructing the the parent
    // IntlRelativeFormat instance.
    return new intl$messageformat$$["default"](message, locales);
};

RelativeFormat.prototype._getMessage = function (units) {
    var messages = this._messages;

    // Create a new synthetic message based on the locale data from CLDR.
    if (!messages[units]) {
        messages[units] = this._compileMessage(units);
    }

    return messages[units];
};

RelativeFormat.prototype._getRelativeUnits = function (diff, units) {
    var field = this._fields[units];

    if (field.relative) {
        return field.relative[diff];
    }
};

RelativeFormat.prototype._findFields = function (locale) {
    var localeData = RelativeFormat.__localeData__;
    var data       = localeData[locale.toLowerCase()];

    // The locale data is de-duplicated, so we have to traverse the locale's
    // hierarchy until we find `fields` to return.
    while (data) {
        if (data.fields) {
            return data.fields;
        }

        data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
    }

    throw new Error(
        'Locale data added to IntlRelativeFormat is missing `fields` for :' +
        locale
    );
};

RelativeFormat.prototype._format = function (date, options) {
    var now = options && options.now !== undefined ? options.now : src$es5$$.dateNow();

    if (date === undefined) {
        date = now;
    }

    // Determine if the `date` and optional `now` values are valid, and throw a
    // similar error to what `Intl.DateTimeFormat#format()` would throw.
    if (!isFinite(now)) {
        throw new RangeError(
            'The `now` option provided to IntlRelativeFormat#format() is not ' +
            'in valid range.'
        );
    }

    if (!isFinite(date)) {
        throw new RangeError(
            'The date value provided to IntlRelativeFormat#format() is not ' +
            'in valid range.'
        );
    }

    var diffReport  = src$diff$$["default"](now, date);
    var units       = this._options.units || this._selectUnits(diffReport);
    var diffInUnits = diffReport[units];

    if (this._options.style !== 'numeric') {
        var relativeUnits = this._getRelativeUnits(diffInUnits, units);
        if (relativeUnits) {
            return relativeUnits;
        }
    }

    return this._getMessage(units).format({
        '0' : Math.abs(diffInUnits),
        when: diffInUnits < 0 ? 'past' : 'future'
    });
};

RelativeFormat.prototype._isValidUnits = function (units) {
    if (!units || src$es5$$.arrIndexOf.call(FIELDS, units) >= 0) {
        return true;
    }

    if (typeof units === 'string') {
        var suggestion = /s$/.test(units) && units.substr(0, units.length - 1);
        if (suggestion && src$es5$$.arrIndexOf.call(FIELDS, suggestion) >= 0) {
            throw new Error(
                '"' + units + '" is not a valid IntlRelativeFormat `units` ' +
                'value, did you mean: ' + suggestion
            );
        }
    }

    throw new Error(
        '"' + units + '" is not a valid IntlRelativeFormat `units` value, it ' +
        'must be one of: "' + FIELDS.join('", "') + '"'
    );
};

RelativeFormat.prototype._resolveLocale = function (locales) {
    if (typeof locales === 'string') {
        locales = [locales];
    }

    // Create a copy of the array so we can push on the default locale.
    locales = (locales || []).concat(RelativeFormat.defaultLocale);

    var localeData = RelativeFormat.__localeData__;
    var i, len, localeParts, data;

    // Using the set of locales + the default locale, we look for the first one
    // which that has been registered. When data does not exist for a locale, we
    // traverse its ancestors to find something that's been registered within
    // its hierarchy of locales. Since we lack the proper `parentLocale` data
    // here, we must take a naive approach to traversal.
    for (i = 0, len = locales.length; i < len; i += 1) {
        localeParts = locales[i].toLowerCase().split('-');

        while (localeParts.length) {
            data = localeData[localeParts.join('-')];
            if (data) {
                // Return the normalized locale string; e.g., we return "en-US",
                // instead of "en-us".
                return data.locale;
            }

            localeParts.pop();
        }
    }

    var defaultLocale = locales.pop();
    throw new Error(
        'No locale data has been added to IntlRelativeFormat for: ' +
        locales.join(', ') + ', or the default locale: ' + defaultLocale
    );
};

RelativeFormat.prototype._resolveStyle = function (style) {
    // Default to "best fit" style.
    if (!style) {
        return STYLES[0];
    }

    if (src$es5$$.arrIndexOf.call(STYLES, style) >= 0) {
        return style;
    }

    throw new Error(
        '"' + style + '" is not a valid IntlRelativeFormat `style` value, it ' +
        'must be one of: "' + STYLES.join('", "') + '"'
    );
};

RelativeFormat.prototype._selectUnits = function (diffReport) {
    var i, l, units;

    for (i = 0, l = FIELDS.length; i < l; i += 1) {
        units = FIELDS[i];

        if (Math.abs(diffReport[units]) < RelativeFormat.thresholds[units]) {
            break;
        }
    }

    return units;
};


},{"./diff":17,"./es5":19,"intl-messageformat":21}],17:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";

var round = Math.round;

function daysToYears(days) {
    // 400 years have 146097 days (taking into account leap year rules)
    return days * 400 / 146097;
}

exports["default"] = function (from, to) {
    // Convert to ms timestamps.
    from = +from;
    to   = +to;

    var millisecond = round(to - from),
        second      = round(millisecond / 1000),
        minute      = round(second / 60),
        hour        = round(minute / 60),
        day         = round(hour / 24),
        week        = round(day / 7);

    var rawYears = daysToYears(day),
        month    = round(rawYears * 12),
        year     = round(rawYears);

    return {
        millisecond: millisecond,
        second     : second,
        minute     : minute,
        hour       : hour,
        day        : day,
        week       : week,
        month      : month,
        year       : year
    };
};


},{}],18:[function(require,module,exports){
// GENERATED FILE
"use strict";
exports["default"] = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"in {0} year","other":"in {0} years"},"past":{"one":"{0} year ago","other":"{0} years ago"}}},"month":{"displayName":"month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"in {0} month","other":"in {0} months"},"past":{"one":"{0} month ago","other":"{0} months ago"}}},"day":{"displayName":"day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"in {0} day","other":"in {0} days"},"past":{"one":"{0} day ago","other":"{0} days ago"}}},"hour":{"displayName":"hour","relativeTime":{"future":{"one":"in {0} hour","other":"in {0} hours"},"past":{"one":"{0} hour ago","other":"{0} hours ago"}}},"minute":{"displayName":"minute","relativeTime":{"future":{"one":"in {0} minute","other":"in {0} minutes"},"past":{"one":"{0} minute ago","other":"{0} minutes ago"}}},"second":{"displayName":"second","relative":{"0":"now"},"relativeTime":{"future":{"one":"in {0} second","other":"in {0} seconds"},"past":{"one":"{0} second ago","other":"{0} seconds ago"}}}}};


},{}],19:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";

// Purposely using the same implementation as the Intl.js `Intl` polyfill.
// Copyright 2013 Andy Earnshaw, MIT License

var hop = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var realDefineProp = (function () {
    try { return !!Object.defineProperty({}, 'a', {}); }
    catch (e) { return false; }
})();

var es3 = !realDefineProp && !Object.prototype.__defineGetter__;

var defineProperty = realDefineProp ? Object.defineProperty :
        function (obj, name, desc) {

    if ('get' in desc && obj.__defineGetter__) {
        obj.__defineGetter__(name, desc.get);
    } else if (!hop.call(obj, name) || 'value' in desc) {
        obj[name] = desc.value;
    }
};

var objCreate = Object.create || function (proto, props) {
    var obj, k;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (k in props) {
        if (hop.call(props, k)) {
            defineProperty(obj, k, props[k]);
        }
    }

    return obj;
};

var arrIndexOf = Array.prototype.indexOf || function (search, fromIndex) {
    /*jshint validthis:true */
    var arr = this;
    if (!arr.length) {
        return -1;
    }

    for (var i = fromIndex || 0, max = arr.length; i < max; i++) {
        if (arr[i] === search) {
            return i;
        }
    }

    return -1;
};

var isArray = Array.isArray || function (obj) {
    return toString.call(obj) === '[object Array]';
};

var dateNow = Date.now || function () {
    return new Date().getTime();
};
exports.defineProperty = defineProperty, exports.objCreate = objCreate, exports.arrIndexOf = arrIndexOf, exports.isArray = isArray, exports.dateNow = dateNow;


},{}],20:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"./core":16,"./en":18,"dup":9}],21:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"./lib/locales":1,"./lib/main":26,"dup":4}],22:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],23:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"./compiler":22,"./es5":25,"./utils":27,"dup":6,"intl-messageformat-parser":28}],24:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],25:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"./utils":27,"dup":8}],26:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"./core":23,"./en":24,"dup":9}],27:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],28:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"./lib/parser":29,"dup":11}],29:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}],30:[function(require,module,exports){
(function (global){
// Expose `IntlPolyfill` as global to add locale data into runtime later on.
global.IntlPolyfill = require('./lib/core.js');

// Require all locale data for `Intl`. This module will be
// ignored when bundling for the browser with Browserify/Webpack.
require('./locale-data/complete.js');

// hack to export the polyfill as global Intl if needed
if (!global.Intl) {
    global.Intl = global.IntlPolyfill;
    global.IntlPolyfill.__applyLocaleSensitivePrototypes();
}

// providing an idiomatic api for the nodejs version of this module
module.exports = global.IntlPolyfill;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./lib/core.js":31,"./locale-data/complete.js":1}],31:[function(require,module,exports){
'use strict';

var babelHelpers = {};
babelHelpers.typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};
babelHelpers;

var realDefineProp = function () {
    var sentinel = {};
    try {
        Object.defineProperty(sentinel, 'a', {});
        return 'a' in sentinel;
    } catch (e) {
        return false;
    }
}();

// Need a workaround for getters in ES3
var es3 = !realDefineProp && !Object.prototype.__defineGetter__;

// We use this a lot (and need it for proto-less objects)
var hop = Object.prototype.hasOwnProperty;

// Naive defineProperty for compatibility
var defineProperty = realDefineProp ? Object.defineProperty : function (obj, name, desc) {
    if ('get' in desc && obj.__defineGetter__) obj.__defineGetter__(name, desc.get);else if (!hop.call(obj, name) || 'value' in desc) obj[name] = desc.value;
};

// Array.prototype.indexOf, as good as we need it to be
var arrIndexOf = Array.prototype.indexOf || function (search) {
    /*jshint validthis:true */
    var t = this;
    if (!t.length) return -1;

    for (var i = arguments[1] || 0, max = t.length; i < max; i++) {
        if (t[i] === search) return i;
    }

    return -1;
};

// Create an object with the specified prototype (2nd arg required for Record)
var objCreate = Object.create || function (proto, props) {
    var obj = void 0;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (var k in props) {
        if (hop.call(props, k)) defineProperty(obj, k, props[k]);
    }

    return obj;
};

// Snapshot some (hopefully still) native built-ins
var arrSlice = Array.prototype.slice;
var arrConcat = Array.prototype.concat;
var arrPush = Array.prototype.push;
var arrJoin = Array.prototype.join;
var arrShift = Array.prototype.shift;

// Naive Function.prototype.bind for compatibility
var fnBind = Function.prototype.bind || function (thisObj) {
    var fn = this,
        args = arrSlice.call(arguments, 1);

    // All our (presently) bound functions have either 1 or 0 arguments. By returning
    // different function signatures, we can pass some tests in ES3 environments
    if (fn.length === 1) {
        return function () {
            return fn.apply(thisObj, arrConcat.call(args, arrSlice.call(arguments)));
        };
    }
    return function () {
        return fn.apply(thisObj, arrConcat.call(args, arrSlice.call(arguments)));
    };
};

// Object housing internal properties for constructors
var internals = objCreate(null);

// Keep internal properties internal
var secret = Math.random();

// Helper functions
// ================

/**
 * A function to deal with the inaccuracy of calculating log10 in pre-ES6
 * JavaScript environments. Math.log(num) / Math.LN10 was responsible for
 * causing issue #62.
 */
function log10Floor(n) {
    // ES6 provides the more accurate Math.log10
    if (typeof Math.log10 === 'function') return Math.floor(Math.log10(n));

    var x = Math.round(Math.log(n) * Math.LOG10E);
    return x - (Number('1e' + x) > n);
}

/**
 * A map that doesn't contain Object in its prototype chain
 */
function Record(obj) {
    // Copy only own properties over unless this object is already a Record instance
    for (var k in obj) {
        if (obj instanceof Record || hop.call(obj, k)) defineProperty(this, k, { value: obj[k], enumerable: true, writable: true, configurable: true });
    }
}
Record.prototype = objCreate(null);

/**
 * An ordered list
 */
function List() {
    defineProperty(this, 'length', { writable: true, value: 0 });

    if (arguments.length) arrPush.apply(this, arrSlice.call(arguments));
}
List.prototype = objCreate(null);

/**
 * Constructs a regular expression to restore tainted RegExp properties
 */
function createRegExpRestore() {
    var esc = /[.?*+^$[\]\\(){}|-]/g,
        lm = RegExp.lastMatch || '',
        ml = RegExp.multiline ? 'm' : '',
        ret = { input: RegExp.input },
        reg = new List(),
        has = false,
        cap = {};

    // Create a snapshot of all the 'captured' properties
    for (var i = 1; i <= 9; i++) {
        has = (cap['$' + i] = RegExp['$' + i]) || has;
    } // Now we've snapshotted some properties, escape the lastMatch string
    lm = lm.replace(esc, '\\$&');

    // If any of the captured strings were non-empty, iterate over them all
    if (has) {
        for (var _i = 1; _i <= 9; _i++) {
            var m = cap['$' + _i];

            // If it's empty, add an empty capturing group
            if (!m) lm = '()' + lm;

            // Else find the string in lm and escape & wrap it to capture it
            else {
                    m = m.replace(esc, '\\$&');
                    lm = lm.replace(m, '(' + m + ')');
                }

            // Push it to the reg and chop lm to make sure further groups come after
            arrPush.call(reg, lm.slice(0, lm.indexOf('(') + 1));
            lm = lm.slice(lm.indexOf('(') + 1);
        }
    }

    // Create the regular expression that will reconstruct the RegExp properties
    ret.exp = new RegExp(arrJoin.call(reg, '') + lm, ml);

    return ret;
}

/**
 * Mimics ES5's abstract ToObject() function
 */
function toObject(arg) {
    if (arg === null) throw new TypeError('Cannot convert null or undefined to object');

    return Object(arg);
}

/**
 * Returns "internal" properties for an object
 */
function getInternalProperties(obj) {
    if (hop.call(obj, '__getInternalProperties')) return obj.__getInternalProperties(secret);

    return objCreate(null);
}

/**
* Defines regular expressions for various operations related to the BCP 47 syntax,
* as defined at http://tools.ietf.org/html/bcp47#section-2.1
*/

// extlang       = 3ALPHA              ; selected ISO 639 codes
//                 *2("-" 3ALPHA)      ; permanently reserved
var extlang = '[a-z]{3}(?:-[a-z]{3}){0,2}';

// language      = 2*3ALPHA            ; shortest ISO 639 code
//                 ["-" extlang]       ; sometimes followed by
//                                     ; extended language subtags
//               / 4ALPHA              ; or reserved for future use
//               / 5*8ALPHA            ; or registered language subtag
var language = '(?:[a-z]{2,3}(?:-' + extlang + ')?|[a-z]{4}|[a-z]{5,8})';

// script        = 4ALPHA              ; ISO 15924 code
var script = '[a-z]{4}';

// region        = 2ALPHA              ; ISO 3166-1 code
//               / 3DIGIT              ; UN M.49 code
var region = '(?:[a-z]{2}|\\d{3})';

// variant       = 5*8alphanum         ; registered variants
//               / (DIGIT 3alphanum)
var variant = '(?:[a-z0-9]{5,8}|\\d[a-z0-9]{3})';

//                                     ; Single alphanumerics
//                                     ; "x" reserved for private use
// singleton     = DIGIT               ; 0 - 9
//               / %x41-57             ; A - W
//               / %x59-5A             ; Y - Z
//               / %x61-77             ; a - w
//               / %x79-7A             ; y - z
var singleton = '[0-9a-wy-z]';

// extension     = singleton 1*("-" (2*8alphanum))
var extension = singleton + '(?:-[a-z0-9]{2,8})+';

// privateuse    = "x" 1*("-" (1*8alphanum))
var privateuse = 'x(?:-[a-z0-9]{1,8})+';

// irregular     = "en-GB-oed"         ; irregular tags do not match
//               / "i-ami"             ; the 'langtag' production and
//               / "i-bnn"             ; would not otherwise be
//               / "i-default"         ; considered 'well-formed'
//               / "i-enochian"        ; These tags are all valid,
//               / "i-hak"             ; but most are deprecated
//               / "i-klingon"         ; in favor of more modern
//               / "i-lux"             ; subtags or subtag
//               / "i-mingo"           ; combination
//               / "i-navajo"
//               / "i-pwn"
//               / "i-tao"
//               / "i-tay"
//               / "i-tsu"
//               / "sgn-BE-FR"
//               / "sgn-BE-NL"
//               / "sgn-CH-DE"
var irregular = '(?:en-GB-oed' + '|i-(?:ami|bnn|default|enochian|hak|klingon|lux|mingo|navajo|pwn|tao|tay|tsu)' + '|sgn-(?:BE-FR|BE-NL|CH-DE))';

// regular       = "art-lojban"        ; these tags match the 'langtag'
//               / "cel-gaulish"       ; production, but their subtags
//               / "no-bok"            ; are not extended language
//               / "no-nyn"            ; or variant subtags: their meaning
//               / "zh-guoyu"          ; is defined by their registration
//               / "zh-hakka"          ; and all of these are deprecated
//               / "zh-min"            ; in favor of a more modern
//               / "zh-min-nan"        ; subtag or sequence of subtags
//               / "zh-xiang"
var regular = '(?:art-lojban|cel-gaulish|no-bok|no-nyn' + '|zh-(?:guoyu|hakka|min|min-nan|xiang))';

// grandfathered = irregular           ; non-redundant tags registered
//               / regular             ; during the RFC 3066 era
var grandfathered = '(?:' + irregular + '|' + regular + ')';

// langtag       = language
//                 ["-" script]
//                 ["-" region]
//                 *("-" variant)
//                 *("-" extension)
//                 ["-" privateuse]
var langtag = language + '(?:-' + script + ')?(?:-' + region + ')?(?:-' + variant + ')*(?:-' + extension + ')*(?:-' + privateuse + ')?';

// Language-Tag  = langtag             ; normal language tags
//               / privateuse          ; private use tag
//               / grandfathered       ; grandfathered tags
var expBCP47Syntax = RegExp('^(?:' + langtag + '|' + privateuse + '|' + grandfathered + ')$', 'i');

// Match duplicate variants in a language tag
var expVariantDupes = RegExp('^(?!x).*?-(' + variant + ')-(?:\\w{4,8}-(?!x-))*\\1\\b', 'i');

// Match duplicate singletons in a language tag (except in private use)
var expSingletonDupes = RegExp('^(?!x).*?-(' + singleton + ')-(?:\\w+-(?!x-))*\\1\\b', 'i');

// Match all extension sequences
var expExtSequences = RegExp('-' + extension, 'ig');

// Default locale is the first-added locale data for us
var defaultLocale = void 0;
function setDefaultLocale(locale) {
    defaultLocale = locale;
}

// IANA Subtag Registry redundant tag and subtag maps
var redundantTags = {
    tags: {
        "art-lojban": "jbo",
        "i-ami": "ami",
        "i-bnn": "bnn",
        "i-hak": "hak",
        "i-klingon": "tlh",
        "i-lux": "lb",
        "i-navajo": "nv",
        "i-pwn": "pwn",
        "i-tao": "tao",
        "i-tay": "tay",
        "i-tsu": "tsu",
        "no-bok": "nb",
        "no-nyn": "nn",
        "sgn-BE-FR": "sfb",
        "sgn-BE-NL": "vgt",
        "sgn-CH-DE": "sgg",
        "zh-guoyu": "cmn",
        "zh-hakka": "hak",
        "zh-min-nan": "nan",
        "zh-xiang": "hsn",
        "sgn-BR": "bzs",
        "sgn-CO": "csn",
        "sgn-DE": "gsg",
        "sgn-DK": "dsl",
        "sgn-ES": "ssp",
        "sgn-FR": "fsl",
        "sgn-GB": "bfi",
        "sgn-GR": "gss",
        "sgn-IE": "isg",
        "sgn-IT": "ise",
        "sgn-JP": "jsl",
        "sgn-MX": "mfs",
        "sgn-NI": "ncs",
        "sgn-NL": "dse",
        "sgn-NO": "nsl",
        "sgn-PT": "psr",
        "sgn-SE": "swl",
        "sgn-US": "ase",
        "sgn-ZA": "sfs",
        "zh-cmn": "cmn",
        "zh-cmn-Hans": "cmn-Hans",
        "zh-cmn-Hant": "cmn-Hant",
        "zh-gan": "gan",
        "zh-wuu": "wuu",
        "zh-yue": "yue"
    },
    subtags: {
        BU: "MM",
        DD: "DE",
        FX: "FR",
        TP: "TL",
        YD: "YE",
        ZR: "CD",
        heploc: "alalc97",
        'in': "id",
        iw: "he",
        ji: "yi",
        jw: "jv",
        mo: "ro",
        ayx: "nun",
        bjd: "drl",
        ccq: "rki",
        cjr: "mom",
        cka: "cmr",
        cmk: "xch",
        drh: "khk",
        drw: "prs",
        gav: "dev",
        hrr: "jal",
        ibi: "opa",
        kgh: "kml",
        lcq: "ppr",
        mst: "mry",
        myt: "mry",
        sca: "hle",
        tie: "ras",
        tkk: "twm",
        tlw: "weo",
        tnf: "prs",
        ybd: "rki",
        yma: "lrr"
    },
    extLang: {
        aao: ["aao", "ar"],
        abh: ["abh", "ar"],
        abv: ["abv", "ar"],
        acm: ["acm", "ar"],
        acq: ["acq", "ar"],
        acw: ["acw", "ar"],
        acx: ["acx", "ar"],
        acy: ["acy", "ar"],
        adf: ["adf", "ar"],
        ads: ["ads", "sgn"],
        aeb: ["aeb", "ar"],
        aec: ["aec", "ar"],
        aed: ["aed", "sgn"],
        aen: ["aen", "sgn"],
        afb: ["afb", "ar"],
        afg: ["afg", "sgn"],
        ajp: ["ajp", "ar"],
        apc: ["apc", "ar"],
        apd: ["apd", "ar"],
        arb: ["arb", "ar"],
        arq: ["arq", "ar"],
        ars: ["ars", "ar"],
        ary: ["ary", "ar"],
        arz: ["arz", "ar"],
        ase: ["ase", "sgn"],
        asf: ["asf", "sgn"],
        asp: ["asp", "sgn"],
        asq: ["asq", "sgn"],
        asw: ["asw", "sgn"],
        auz: ["auz", "ar"],
        avl: ["avl", "ar"],
        ayh: ["ayh", "ar"],
        ayl: ["ayl", "ar"],
        ayn: ["ayn", "ar"],
        ayp: ["ayp", "ar"],
        bbz: ["bbz", "ar"],
        bfi: ["bfi", "sgn"],
        bfk: ["bfk", "sgn"],
        bjn: ["bjn", "ms"],
        bog: ["bog", "sgn"],
        bqn: ["bqn", "sgn"],
        bqy: ["bqy", "sgn"],
        btj: ["btj", "ms"],
        bve: ["bve", "ms"],
        bvl: ["bvl", "sgn"],
        bvu: ["bvu", "ms"],
        bzs: ["bzs", "sgn"],
        cdo: ["cdo", "zh"],
        cds: ["cds", "sgn"],
        cjy: ["cjy", "zh"],
        cmn: ["cmn", "zh"],
        coa: ["coa", "ms"],
        cpx: ["cpx", "zh"],
        csc: ["csc", "sgn"],
        csd: ["csd", "sgn"],
        cse: ["cse", "sgn"],
        csf: ["csf", "sgn"],
        csg: ["csg", "sgn"],
        csl: ["csl", "sgn"],
        csn: ["csn", "sgn"],
        csq: ["csq", "sgn"],
        csr: ["csr", "sgn"],
        czh: ["czh", "zh"],
        czo: ["czo", "zh"],
        doq: ["doq", "sgn"],
        dse: ["dse", "sgn"],
        dsl: ["dsl", "sgn"],
        dup: ["dup", "ms"],
        ecs: ["ecs", "sgn"],
        esl: ["esl", "sgn"],
        esn: ["esn", "sgn"],
        eso: ["eso", "sgn"],
        eth: ["eth", "sgn"],
        fcs: ["fcs", "sgn"],
        fse: ["fse", "sgn"],
        fsl: ["fsl", "sgn"],
        fss: ["fss", "sgn"],
        gan: ["gan", "zh"],
        gds: ["gds", "sgn"],
        gom: ["gom", "kok"],
        gse: ["gse", "sgn"],
        gsg: ["gsg", "sgn"],
        gsm: ["gsm", "sgn"],
        gss: ["gss", "sgn"],
        gus: ["gus", "sgn"],
        hab: ["hab", "sgn"],
        haf: ["haf", "sgn"],
        hak: ["hak", "zh"],
        hds: ["hds", "sgn"],
        hji: ["hji", "ms"],
        hks: ["hks", "sgn"],
        hos: ["hos", "sgn"],
        hps: ["hps", "sgn"],
        hsh: ["hsh", "sgn"],
        hsl: ["hsl", "sgn"],
        hsn: ["hsn", "zh"],
        icl: ["icl", "sgn"],
        ils: ["ils", "sgn"],
        inl: ["inl", "sgn"],
        ins: ["ins", "sgn"],
        ise: ["ise", "sgn"],
        isg: ["isg", "sgn"],
        isr: ["isr", "sgn"],
        jak: ["jak", "ms"],
        jax: ["jax", "ms"],
        jcs: ["jcs", "sgn"],
        jhs: ["jhs", "sgn"],
        jls: ["jls", "sgn"],
        jos: ["jos", "sgn"],
        jsl: ["jsl", "sgn"],
        jus: ["jus", "sgn"],
        kgi: ["kgi", "sgn"],
        knn: ["knn", "kok"],
        kvb: ["kvb", "ms"],
        kvk: ["kvk", "sgn"],
        kvr: ["kvr", "ms"],
        kxd: ["kxd", "ms"],
        lbs: ["lbs", "sgn"],
        lce: ["lce", "ms"],
        lcf: ["lcf", "ms"],
        liw: ["liw", "ms"],
        lls: ["lls", "sgn"],
        lsg: ["lsg", "sgn"],
        lsl: ["lsl", "sgn"],
        lso: ["lso", "sgn"],
        lsp: ["lsp", "sgn"],
        lst: ["lst", "sgn"],
        lsy: ["lsy", "sgn"],
        ltg: ["ltg", "lv"],
        lvs: ["lvs", "lv"],
        lzh: ["lzh", "zh"],
        max: ["max", "ms"],
        mdl: ["mdl", "sgn"],
        meo: ["meo", "ms"],
        mfa: ["mfa", "ms"],
        mfb: ["mfb", "ms"],
        mfs: ["mfs", "sgn"],
        min: ["min", "ms"],
        mnp: ["mnp", "zh"],
        mqg: ["mqg", "ms"],
        mre: ["mre", "sgn"],
        msd: ["msd", "sgn"],
        msi: ["msi", "ms"],
        msr: ["msr", "sgn"],
        mui: ["mui", "ms"],
        mzc: ["mzc", "sgn"],
        mzg: ["mzg", "sgn"],
        mzy: ["mzy", "sgn"],
        nan: ["nan", "zh"],
        nbs: ["nbs", "sgn"],
        ncs: ["ncs", "sgn"],
        nsi: ["nsi", "sgn"],
        nsl: ["nsl", "sgn"],
        nsp: ["nsp", "sgn"],
        nsr: ["nsr", "sgn"],
        nzs: ["nzs", "sgn"],
        okl: ["okl", "sgn"],
        orn: ["orn", "ms"],
        ors: ["ors", "ms"],
        pel: ["pel", "ms"],
        pga: ["pga", "ar"],
        pks: ["pks", "sgn"],
        prl: ["prl", "sgn"],
        prz: ["prz", "sgn"],
        psc: ["psc", "sgn"],
        psd: ["psd", "sgn"],
        pse: ["pse", "ms"],
        psg: ["psg", "sgn"],
        psl: ["psl", "sgn"],
        pso: ["pso", "sgn"],
        psp: ["psp", "sgn"],
        psr: ["psr", "sgn"],
        pys: ["pys", "sgn"],
        rms: ["rms", "sgn"],
        rsi: ["rsi", "sgn"],
        rsl: ["rsl", "sgn"],
        sdl: ["sdl", "sgn"],
        sfb: ["sfb", "sgn"],
        sfs: ["sfs", "sgn"],
        sgg: ["sgg", "sgn"],
        sgx: ["sgx", "sgn"],
        shu: ["shu", "ar"],
        slf: ["slf", "sgn"],
        sls: ["sls", "sgn"],
        sqk: ["sqk", "sgn"],
        sqs: ["sqs", "sgn"],
        ssh: ["ssh", "ar"],
        ssp: ["ssp", "sgn"],
        ssr: ["ssr", "sgn"],
        svk: ["svk", "sgn"],
        swc: ["swc", "sw"],
        swh: ["swh", "sw"],
        swl: ["swl", "sgn"],
        syy: ["syy", "sgn"],
        tmw: ["tmw", "ms"],
        tse: ["tse", "sgn"],
        tsm: ["tsm", "sgn"],
        tsq: ["tsq", "sgn"],
        tss: ["tss", "sgn"],
        tsy: ["tsy", "sgn"],
        tza: ["tza", "sgn"],
        ugn: ["ugn", "sgn"],
        ugy: ["ugy", "sgn"],
        ukl: ["ukl", "sgn"],
        uks: ["uks", "sgn"],
        urk: ["urk", "ms"],
        uzn: ["uzn", "uz"],
        uzs: ["uzs", "uz"],
        vgt: ["vgt", "sgn"],
        vkk: ["vkk", "ms"],
        vkt: ["vkt", "ms"],
        vsi: ["vsi", "sgn"],
        vsl: ["vsl", "sgn"],
        vsv: ["vsv", "sgn"],
        wuu: ["wuu", "zh"],
        xki: ["xki", "sgn"],
        xml: ["xml", "sgn"],
        xmm: ["xmm", "ms"],
        xms: ["xms", "sgn"],
        yds: ["yds", "sgn"],
        ysl: ["ysl", "sgn"],
        yue: ["yue", "zh"],
        zib: ["zib", "sgn"],
        zlm: ["zlm", "ms"],
        zmi: ["zmi", "ms"],
        zsl: ["zsl", "sgn"],
        zsm: ["zsm", "ms"]
    }
};

/**
 * Convert only a-z to uppercase as per section 6.1 of the spec
 */
function toLatinUpperCase(str) {
    var i = str.length;

    while (i--) {
        var ch = str.charAt(i);

        if (ch >= "a" && ch <= "z") str = str.slice(0, i) + ch.toUpperCase() + str.slice(i + 1);
    }

    return str;
}

/**
 * The IsStructurallyValidLanguageTag abstract operation verifies that the locale
 * argument (which must be a String value)
 *
 * - represents a well-formed BCP 47 language tag as specified in RFC 5646 section
 *   2.1, or successor,
 * - does not include duplicate variant subtags, and
 * - does not include duplicate singleton subtags.
 *
 * The abstract operation returns true if locale can be generated from the ABNF
 * grammar in section 2.1 of the RFC, starting with Language-Tag, and does not
 * contain duplicate variant or singleton subtags (other than as a private use
 * subtag). It returns false otherwise. Terminal value characters in the grammar are
 * interpreted as the Unicode equivalents of the ASCII octet values given.
 */
function /* 6.2.2 */IsStructurallyValidLanguageTag(locale) {
    // represents a well-formed BCP 47 language tag as specified in RFC 5646
    if (!expBCP47Syntax.test(locale)) return false;

    // does not include duplicate variant subtags, and
    if (expVariantDupes.test(locale)) return false;

    // does not include duplicate singleton subtags.
    if (expSingletonDupes.test(locale)) return false;

    return true;
}

/**
 * The CanonicalizeLanguageTag abstract operation returns the canonical and case-
 * regularized form of the locale argument (which must be a String value that is
 * a structurally valid BCP 47 language tag as verified by the
 * IsStructurallyValidLanguageTag abstract operation). It takes the steps
 * specified in RFC 5646 section 4.5, or successor, to bring the language tag
 * into canonical form, and to regularize the case of the subtags, but does not
 * take the steps to bring a language tag into “extlang form” and to reorder
 * variant subtags.

 * The specifications for extensions to BCP 47 language tags, such as RFC 6067,
 * may include canonicalization rules for the extension subtag sequences they
 * define that go beyond the canonicalization rules of RFC 5646 section 4.5.
 * Implementations are allowed, but not required, to apply these additional rules.
 */
function /* 6.2.3 */CanonicalizeLanguageTag(locale) {
    var match = void 0,
        parts = void 0;

    // A language tag is in 'canonical form' when the tag is well-formed
    // according to the rules in Sections 2.1 and 2.2

    // Section 2.1 says all subtags use lowercase...
    locale = locale.toLowerCase();

    // ...with 2 exceptions: 'two-letter and four-letter subtags that neither
    // appear at the start of the tag nor occur after singletons.  Such two-letter
    // subtags are all uppercase (as in the tags "en-CA-x-ca" or "sgn-BE-FR") and
    // four-letter subtags are titlecase (as in the tag "az-Latn-x-latn").
    parts = locale.split('-');
    for (var i = 1, max = parts.length; i < max; i++) {
        // Two-letter subtags are all uppercase
        if (parts[i].length === 2) parts[i] = parts[i].toUpperCase();

        // Four-letter subtags are titlecase
        else if (parts[i].length === 4) parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);

            // Is it a singleton?
            else if (parts[i].length === 1 && parts[i] !== 'x') break;
    }
    locale = arrJoin.call(parts, '-');

    // The steps laid out in RFC 5646 section 4.5 are as follows:

    // 1.  Extension sequences are ordered into case-insensitive ASCII order
    //     by singleton subtag.
    if ((match = locale.match(expExtSequences)) && match.length > 1) {
        // The built-in sort() sorts by ASCII order, so use that
        match.sort();

        // Replace all extensions with the joined, sorted array
        locale = locale.replace(RegExp('(?:' + expExtSequences.source + ')+', 'i'), arrJoin.call(match, ''));
    }

    // 2.  Redundant or grandfathered tags are replaced by their 'Preferred-
    //     Value', if there is one.
    if (hop.call(redundantTags.tags, locale)) locale = redundantTags.tags[locale];

    // 3.  Subtags are replaced by their 'Preferred-Value', if there is one.
    //     For extlangs, the original primary language subtag is also
    //     replaced if there is a primary language subtag in the 'Preferred-
    //     Value'.
    parts = locale.split('-');

    for (var _i = 1, _max = parts.length; _i < _max; _i++) {
        if (hop.call(redundantTags.subtags, parts[_i])) parts[_i] = redundantTags.subtags[parts[_i]];else if (hop.call(redundantTags.extLang, parts[_i])) {
            parts[_i] = redundantTags.extLang[parts[_i]][0];

            // For extlang tags, the prefix needs to be removed if it is redundant
            if (_i === 1 && redundantTags.extLang[parts[1]][1] === parts[0]) {
                parts = arrSlice.call(parts, _i++);
                _max -= 1;
            }
        }
    }

    return arrJoin.call(parts, '-');
}

/**
 * The DefaultLocale abstract operation returns a String value representing the
 * structurally valid (6.2.2) and canonicalized (6.2.3) BCP 47 language tag for the
 * host environment’s current locale.
 */
function /* 6.2.4 */DefaultLocale() {
    return defaultLocale;
}

// Sect 6.3 Currency Codes
// =======================

var expCurrencyCode = /^[A-Z]{3}$/;

/**
 * The IsWellFormedCurrencyCode abstract operation verifies that the currency argument
 * (after conversion to a String value) represents a well-formed 3-letter ISO currency
 * code. The following steps are taken:
 */
function /* 6.3.1 */IsWellFormedCurrencyCode(currency) {
    // 1. Let `c` be ToString(currency)
    var c = String(currency);

    // 2. Let `normalized` be the result of mapping c to upper case as described
    //    in 6.1.
    var normalized = toLatinUpperCase(c);

    // 3. If the string length of normalized is not 3, return false.
    // 4. If normalized contains any character that is not in the range "A" to "Z"
    //    (U+0041 to U+005A), return false.
    if (expCurrencyCode.test(normalized) === false) return false;

    // 5. Return true
    return true;
}

var expUnicodeExSeq = /-u(?:-[0-9a-z]{2,8})+/gi; // See `extension` below

function /* 9.2.1 */CanonicalizeLocaleList(locales) {
    // The abstract operation CanonicalizeLocaleList takes the following steps:

    // 1. If locales is undefined, then a. Return a new empty List
    if (locales === undefined) return new List();

    // 2. Let seen be a new empty List.
    var seen = new List();

    // 3. If locales is a String value, then
    //    a. Let locales be a new array created as if by the expression new
    //    Array(locales) where Array is the standard built-in constructor with
    //    that name and locales is the value of locales.
    locales = typeof locales === 'string' ? [locales] : locales;

    // 4. Let O be ToObject(locales).
    var O = toObject(locales);

    // 5. Let lenValue be the result of calling the [[Get]] internal method of
    //    O with the argument "length".
    // 6. Let len be ToUint32(lenValue).
    var len = O.length;

    // 7. Let k be 0.
    var k = 0;

    // 8. Repeat, while k < len
    while (k < len) {
        // a. Let Pk be ToString(k).
        var Pk = String(k);

        // b. Let kPresent be the result of calling the [[HasProperty]] internal
        //    method of O with argument Pk.
        var kPresent = Pk in O;

        // c. If kPresent is true, then
        if (kPresent) {
            // i. Let kValue be the result of calling the [[Get]] internal
            //     method of O with argument Pk.
            var kValue = O[Pk];

            // ii. If the type of kValue is not String or Object, then throw a
            //     TypeError exception.
            if (kValue === null || typeof kValue !== 'string' && (typeof kValue === "undefined" ? "undefined" : babelHelpers["typeof"](kValue)) !== 'object') throw new TypeError('String or Object type expected');

            // iii. Let tag be ToString(kValue).
            var tag = String(kValue);

            // iv. If the result of calling the abstract operation
            //     IsStructurallyValidLanguageTag (defined in 6.2.2), passing tag as
            //     the argument, is false, then throw a RangeError exception.
            if (!IsStructurallyValidLanguageTag(tag)) throw new RangeError("'" + tag + "' is not a structurally valid language tag");

            // v. Let tag be the result of calling the abstract operation
            //    CanonicalizeLanguageTag (defined in 6.2.3), passing tag as the
            //    argument.
            tag = CanonicalizeLanguageTag(tag);

            // vi. If tag is not an element of seen, then append tag as the last
            //     element of seen.
            if (arrIndexOf.call(seen, tag) === -1) arrPush.call(seen, tag);
        }

        // d. Increase k by 1.
        k++;
    }

    // 9. Return seen.
    return seen;
}

/**
 * The BestAvailableLocale abstract operation compares the provided argument
 * locale, which must be a String value with a structurally valid and
 * canonicalized BCP 47 language tag, against the locales in availableLocales and
 * returns either the longest non-empty prefix of locale that is an element of
 * availableLocales, or undefined if there is no such element. It uses the
 * fallback mechanism of RFC 4647, section 3.4. The following steps are taken:
 */
function /* 9.2.2 */BestAvailableLocale(availableLocales, locale) {
    // 1. Let candidate be locale
    var candidate = locale;

    // 2. Repeat
    while (candidate) {
        // a. If availableLocales contains an element equal to candidate, then return
        // candidate.
        if (arrIndexOf.call(availableLocales, candidate) > -1) return candidate;

        // b. Let pos be the character index of the last occurrence of "-"
        // (U+002D) within candidate. If that character does not occur, return
        // undefined.
        var pos = candidate.lastIndexOf('-');

        if (pos < 0) return;

        // c. If pos ≥ 2 and the character "-" occurs at index pos-2 of candidate,
        //    then decrease pos by 2.
        if (pos >= 2 && candidate.charAt(pos - 2) === '-') pos -= 2;

        // d. Let candidate be the substring of candidate from position 0, inclusive,
        //    to position pos, exclusive.
        candidate = candidate.substring(0, pos);
    }
}

/**
 * The LookupMatcher abstract operation compares requestedLocales, which must be
 * a List as returned by CanonicalizeLocaleList, against the locales in
 * availableLocales and determines the best available language to meet the
 * request. The following steps are taken:
 */
function /* 9.2.3 */LookupMatcher(availableLocales, requestedLocales) {
    // 1. Let i be 0.
    var i = 0;

    // 2. Let len be the number of elements in requestedLocales.
    var len = requestedLocales.length;

    // 3. Let availableLocale be undefined.
    var availableLocale = void 0;

    var locale = void 0,
        noExtensionsLocale = void 0;

    // 4. Repeat while i < len and availableLocale is undefined:
    while (i < len && !availableLocale) {
        // a. Let locale be the element of requestedLocales at 0-origined list
        //    position i.
        locale = requestedLocales[i];

        // b. Let noExtensionsLocale be the String value that is locale with all
        //    Unicode locale extension sequences removed.
        noExtensionsLocale = String(locale).replace(expUnicodeExSeq, '');

        // c. Let availableLocale be the result of calling the
        //    BestAvailableLocale abstract operation (defined in 9.2.2) with
        //    arguments availableLocales and noExtensionsLocale.
        availableLocale = BestAvailableLocale(availableLocales, noExtensionsLocale);

        // d. Increase i by 1.
        i++;
    }

    // 5. Let result be a new Record.
    var result = new Record();

    // 6. If availableLocale is not undefined, then
    if (availableLocale !== undefined) {
        // a. Set result.[[locale]] to availableLocale.
        result['[[locale]]'] = availableLocale;

        // b. If locale and noExtensionsLocale are not the same String value, then
        if (String(locale) !== String(noExtensionsLocale)) {
            // i. Let extension be the String value consisting of the first
            //    substring of locale that is a Unicode locale extension sequence.
            var extension = locale.match(expUnicodeExSeq)[0];

            // ii. Let extensionIndex be the character position of the initial
            //     "-" of the first Unicode locale extension sequence within locale.
            var extensionIndex = locale.indexOf('-u-');

            // iii. Set result.[[extension]] to extension.
            result['[[extension]]'] = extension;

            // iv. Set result.[[extensionIndex]] to extensionIndex.
            result['[[extensionIndex]]'] = extensionIndex;
        }
    }
    // 7. Else
    else
        // a. Set result.[[locale]] to the value returned by the DefaultLocale abstract
        //    operation (defined in 6.2.4).
        result['[[locale]]'] = DefaultLocale();

    // 8. Return result
    return result;
}

/**
 * The BestFitMatcher abstract operation compares requestedLocales, which must be
 * a List as returned by CanonicalizeLocaleList, against the locales in
 * availableLocales and determines the best available language to meet the
 * request. The algorithm is implementation dependent, but should produce results
 * that a typical user of the requested locales would perceive as at least as
 * good as those produced by the LookupMatcher abstract operation. Options
 * specified through Unicode locale extension sequences must be ignored by the
 * algorithm. Information about such subsequences is returned separately.
 * The abstract operation returns a record with a [[locale]] field, whose value
 * is the language tag of the selected locale, which must be an element of
 * availableLocales. If the language tag of the request locale that led to the
 * selected locale contained a Unicode locale extension sequence, then the
 * returned record also contains an [[extension]] field whose value is the first
 * Unicode locale extension sequence, and an [[extensionIndex]] field whose value
 * is the index of the first Unicode locale extension sequence within the request
 * locale language tag.
 */
function /* 9.2.4 */BestFitMatcher(availableLocales, requestedLocales) {
    return LookupMatcher(availableLocales, requestedLocales);
}

/**
 * The ResolveLocale abstract operation compares a BCP 47 language priority list
 * requestedLocales against the locales in availableLocales and determines the
 * best available language to meet the request. availableLocales and
 * requestedLocales must be provided as List values, options as a Record.
 */
function /* 9.2.5 */ResolveLocale(availableLocales, requestedLocales, options, relevantExtensionKeys, localeData) {
    if (availableLocales.length === 0) {
        throw new ReferenceError('No locale data has been provided for this object yet.');
    }

    // The following steps are taken:
    // 1. Let matcher be the value of options.[[localeMatcher]].
    var matcher = options['[[localeMatcher]]'];

    var r = void 0;

    // 2. If matcher is "lookup", then
    if (matcher === 'lookup')
        // a. Let r be the result of calling the LookupMatcher abstract operation
        //    (defined in 9.2.3) with arguments availableLocales and
        //    requestedLocales.
        r = LookupMatcher(availableLocales, requestedLocales);

        // 3. Else
    else
        // a. Let r be the result of calling the BestFitMatcher abstract
        //    operation (defined in 9.2.4) with arguments availableLocales and
        //    requestedLocales.
        r = BestFitMatcher(availableLocales, requestedLocales);

    // 4. Let foundLocale be the value of r.[[locale]].
    var foundLocale = r['[[locale]]'];

    var extensionSubtags = void 0,
        extensionSubtagsLength = void 0;

    // 5. If r has an [[extension]] field, then
    if (hop.call(r, '[[extension]]')) {
        // a. Let extension be the value of r.[[extension]].
        var extension = r['[[extension]]'];
        // b. Let split be the standard built-in function object defined in ES5,
        //    15.5.4.14.
        var split = String.prototype.split;
        // c. Let extensionSubtags be the result of calling the [[Call]] internal
        //    method of split with extension as the this value and an argument
        //    list containing the single item "-".
        extensionSubtags = split.call(extension, '-');
        // d. Let extensionSubtagsLength be the result of calling the [[Get]]
        //    internal method of extensionSubtags with argument "length".
        extensionSubtagsLength = extensionSubtags.length;
    }

    // 6. Let result be a new Record.
    var result = new Record();

    // 7. Set result.[[dataLocale]] to foundLocale.
    result['[[dataLocale]]'] = foundLocale;

    // 8. Let supportedExtension be "-u".
    var supportedExtension = '-u';
    // 9. Let i be 0.
    var i = 0;
    // 10. Let len be the result of calling the [[Get]] internal method of
    //     relevantExtensionKeys with argument "length".
    var len = relevantExtensionKeys.length;

    // 11 Repeat while i < len:
    while (i < len) {
        // a. Let key be the result of calling the [[Get]] internal method of
        //    relevantExtensionKeys with argument ToString(i).
        var key = relevantExtensionKeys[i];
        // b. Let foundLocaleData be the result of calling the [[Get]] internal
        //    method of localeData with the argument foundLocale.
        var foundLocaleData = localeData[foundLocale];
        // c. Let keyLocaleData be the result of calling the [[Get]] internal
        //    method of foundLocaleData with the argument key.
        var keyLocaleData = foundLocaleData[key];
        // d. Let value be the result of calling the [[Get]] internal method of
        //    keyLocaleData with argument "0".
        var value = keyLocaleData['0'];
        // e. Let supportedExtensionAddition be "".
        var supportedExtensionAddition = '';
        // f. Let indexOf be the standard built-in function object defined in
        //    ES5, 15.4.4.14.
        var indexOf = arrIndexOf;

        // g. If extensionSubtags is not undefined, then
        if (extensionSubtags !== undefined) {
            // i. Let keyPos be the result of calling the [[Call]] internal
            //    method of indexOf with extensionSubtags as the this value and
            // an argument list containing the single item key.
            var keyPos = indexOf.call(extensionSubtags, key);

            // ii. If keyPos ≠ -1, then
            if (keyPos !== -1) {
                // 1. If keyPos + 1 < extensionSubtagsLength and the length of the
                //    result of calling the [[Get]] internal method of
                //    extensionSubtags with argument ToString(keyPos +1) is greater
                //    than 2, then
                if (keyPos + 1 < extensionSubtagsLength && extensionSubtags[keyPos + 1].length > 2) {
                    // a. Let requestedValue be the result of calling the [[Get]]
                    //    internal method of extensionSubtags with argument
                    //    ToString(keyPos + 1).
                    var requestedValue = extensionSubtags[keyPos + 1];
                    // b. Let valuePos be the result of calling the [[Call]]
                    //    internal method of indexOf with keyLocaleData as the
                    //    this value and an argument list containing the single
                    //    item requestedValue.
                    var valuePos = indexOf.call(keyLocaleData, requestedValue);

                    // c. If valuePos ≠ -1, then
                    if (valuePos !== -1) {
                        // i. Let value be requestedValue.
                        value = requestedValue,
                        // ii. Let supportedExtensionAddition be the
                        //     concatenation of "-", key, "-", and value.
                        supportedExtensionAddition = '-' + key + '-' + value;
                    }
                }
                // 2. Else
                else {
                        // a. Let valuePos be the result of calling the [[Call]]
                        // internal method of indexOf with keyLocaleData as the this
                        // value and an argument list containing the single item
                        // "true".
                        var _valuePos = indexOf(keyLocaleData, 'true');

                        // b. If valuePos ≠ -1, then
                        if (_valuePos !== -1)
                            // i. Let value be "true".
                            value = 'true';
                    }
            }
        }
        // h. If options has a field [[<key>]], then
        if (hop.call(options, '[[' + key + ']]')) {
            // i. Let optionsValue be the value of options.[[<key>]].
            var optionsValue = options['[[' + key + ']]'];

            // ii. If the result of calling the [[Call]] internal method of indexOf
            //     with keyLocaleData as the this value and an argument list
            //     containing the single item optionsValue is not -1, then
            if (indexOf.call(keyLocaleData, optionsValue) !== -1) {
                // 1. If optionsValue is not equal to value, then
                if (optionsValue !== value) {
                    // a. Let value be optionsValue.
                    value = optionsValue;
                    // b. Let supportedExtensionAddition be "".
                    supportedExtensionAddition = '';
                }
            }
        }
        // i. Set result.[[<key>]] to value.
        result['[[' + key + ']]'] = value;

        // j. Append supportedExtensionAddition to supportedExtension.
        supportedExtension += supportedExtensionAddition;

        // k. Increase i by 1.
        i++;
    }
    // 12. If the length of supportedExtension is greater than 2, then
    if (supportedExtension.length > 2) {
        // a.
        var privateIndex = foundLocale.indexOf("-x-");
        // b.
        if (privateIndex === -1) {
            // i.
            foundLocale = foundLocale + supportedExtension;
        }
        // c.
        else {
                // i.
                var preExtension = foundLocale.substring(0, privateIndex);
                // ii.
                var postExtension = foundLocale.substring(privateIndex);
                // iii.
                foundLocale = preExtension + supportedExtension + postExtension;
            }
        // d. asserting - skipping
        // e.
        foundLocale = CanonicalizeLanguageTag(foundLocale);
    }
    // 13. Set result.[[locale]] to foundLocale.
    result['[[locale]]'] = foundLocale;

    // 14. Return result.
    return result;
}

/**
 * The LookupSupportedLocales abstract operation returns the subset of the
 * provided BCP 47 language priority list requestedLocales for which
 * availableLocales has a matching locale when using the BCP 47 Lookup algorithm.
 * Locales appear in the same order in the returned list as in requestedLocales.
 * The following steps are taken:
 */
function /* 9.2.6 */LookupSupportedLocales(availableLocales, requestedLocales) {
    // 1. Let len be the number of elements in requestedLocales.
    var len = requestedLocales.length;
    // 2. Let subset be a new empty List.
    var subset = new List();
    // 3. Let k be 0.
    var k = 0;

    // 4. Repeat while k < len
    while (k < len) {
        // a. Let locale be the element of requestedLocales at 0-origined list
        //    position k.
        var locale = requestedLocales[k];
        // b. Let noExtensionsLocale be the String value that is locale with all
        //    Unicode locale extension sequences removed.
        var noExtensionsLocale = String(locale).replace(expUnicodeExSeq, '');
        // c. Let availableLocale be the result of calling the
        //    BestAvailableLocale abstract operation (defined in 9.2.2) with
        //    arguments availableLocales and noExtensionsLocale.
        var availableLocale = BestAvailableLocale(availableLocales, noExtensionsLocale);

        // d. If availableLocale is not undefined, then append locale to the end of
        //    subset.
        if (availableLocale !== undefined) arrPush.call(subset, locale);

        // e. Increment k by 1.
        k++;
    }

    // 5. Let subsetArray be a new Array object whose elements are the same
    //    values in the same order as the elements of subset.
    var subsetArray = arrSlice.call(subset);

    // 6. Return subsetArray.
    return subsetArray;
}

/**
 * The BestFitSupportedLocales abstract operation returns the subset of the
 * provided BCP 47 language priority list requestedLocales for which
 * availableLocales has a matching locale when using the Best Fit Matcher
 * algorithm. Locales appear in the same order in the returned list as in
 * requestedLocales. The steps taken are implementation dependent.
 */
function /*9.2.7 */BestFitSupportedLocales(availableLocales, requestedLocales) {
    // ###TODO: implement this function as described by the specification###
    return LookupSupportedLocales(availableLocales, requestedLocales);
}

/**
 * The SupportedLocales abstract operation returns the subset of the provided BCP
 * 47 language priority list requestedLocales for which availableLocales has a
 * matching locale. Two algorithms are available to match the locales: the Lookup
 * algorithm described in RFC 4647 section 3.4, and an implementation dependent
 * best-fit algorithm. Locales appear in the same order in the returned list as
 * in requestedLocales. The following steps are taken:
 */
function /*9.2.8 */SupportedLocales(availableLocales, requestedLocales, options) {
    var matcher = void 0,
        subset = void 0;

    // 1. If options is not undefined, then
    if (options !== undefined) {
        // a. Let options be ToObject(options).
        options = new Record(toObject(options));
        // b. Let matcher be the result of calling the [[Get]] internal method of
        //    options with argument "localeMatcher".
        matcher = options.localeMatcher;

        // c. If matcher is not undefined, then
        if (matcher !== undefined) {
            // i. Let matcher be ToString(matcher).
            matcher = String(matcher);

            // ii. If matcher is not "lookup" or "best fit", then throw a RangeError
            //     exception.
            if (matcher !== 'lookup' && matcher !== 'best fit') throw new RangeError('matcher should be "lookup" or "best fit"');
        }
    }
    // 2. If matcher is undefined or "best fit", then
    if (matcher === undefined || matcher === 'best fit')
        // a. Let subset be the result of calling the BestFitSupportedLocales
        //    abstract operation (defined in 9.2.7) with arguments
        //    availableLocales and requestedLocales.
        subset = BestFitSupportedLocales(availableLocales, requestedLocales);
        // 3. Else
    else
        // a. Let subset be the result of calling the LookupSupportedLocales
        //    abstract operation (defined in 9.2.6) with arguments
        //    availableLocales and requestedLocales.
        subset = LookupSupportedLocales(availableLocales, requestedLocales);

    // 4. For each named own property name P of subset,
    for (var P in subset) {
        if (!hop.call(subset, P)) continue;

        // a. Let desc be the result of calling the [[GetOwnProperty]] internal
        //    method of subset with P.
        // b. Set desc.[[Writable]] to false.
        // c. Set desc.[[Configurable]] to false.
        // d. Call the [[DefineOwnProperty]] internal method of subset with P, desc,
        //    and true as arguments.
        defineProperty(subset, P, {
            writable: false, configurable: false, value: subset[P]
        });
    }
    // "Freeze" the array so no new elements can be added
    defineProperty(subset, 'length', { writable: false });

    // 5. Return subset
    return subset;
}

/**
 * The GetOption abstract operation extracts the value of the property named
 * property from the provided options object, converts it to the required type,
 * checks whether it is one of a List of allowed values, and fills in a fallback
 * value if necessary.
 */
function /*9.2.9 */GetOption(options, property, type, values, fallback) {
    // 1. Let value be the result of calling the [[Get]] internal method of
    //    options with argument property.
    var value = options[property];

    // 2. If value is not undefined, then
    if (value !== undefined) {
        // a. Assert: type is "boolean" or "string".
        // b. If type is "boolean", then let value be ToBoolean(value).
        // c. If type is "string", then let value be ToString(value).
        value = type === 'boolean' ? Boolean(value) : type === 'string' ? String(value) : value;

        // d. If values is not undefined, then
        if (values !== undefined) {
            // i. If values does not contain an element equal to value, then throw a
            //    RangeError exception.
            if (arrIndexOf.call(values, value) === -1) throw new RangeError("'" + value + "' is not an allowed value for `" + property + '`');
        }

        // e. Return value.
        return value;
    }
    // Else return fallback.
    return fallback;
}

/**
 * The GetNumberOption abstract operation extracts a property value from the
 * provided options object, converts it to a Number value, checks whether it is
 * in the allowed range, and fills in a fallback value if necessary.
 */
function /* 9.2.10 */GetNumberOption(options, property, minimum, maximum, fallback) {
    // 1. Let value be the result of calling the [[Get]] internal method of
    //    options with argument property.
    var value = options[property];

    // 2. If value is not undefined, then
    if (value !== undefined) {
        // a. Let value be ToNumber(value).
        value = Number(value);

        // b. If value is NaN or less than minimum or greater than maximum, throw a
        //    RangeError exception.
        if (isNaN(value) || value < minimum || value > maximum) throw new RangeError('Value is not a number or outside accepted range');

        // c. Return floor(value).
        return Math.floor(value);
    }
    // 3. Else return fallback.
    return fallback;
}

// 8 The Intl Object
var Intl = {};

// 8.2 Function Properties of the Intl Object

// 8.2.1
// @spec[tc39/ecma402/master/spec/intl.html]
// @clause[sec-intl.getcanonicallocales]
Intl.getCanonicalLocales = function (locales) {
    // 1. Let ll be ? CanonicalizeLocaleList(locales).
    var ll = CanonicalizeLocaleList(locales);
    // 2. Return CreateArrayFromList(ll).
    {
        var result = [];
        for (var code in ll) {
            result.push(ll[code]);
        }
        return result;
    }
};

// Currency minor units output from get-4217 grunt task, formatted
var currencyMinorUnits = {
    BHD: 3, BYR: 0, XOF: 0, BIF: 0, XAF: 0, CLF: 4, CLP: 0, KMF: 0, DJF: 0,
    XPF: 0, GNF: 0, ISK: 0, IQD: 3, JPY: 0, JOD: 3, KRW: 0, KWD: 3, LYD: 3,
    OMR: 3, PYG: 0, RWF: 0, TND: 3, UGX: 0, UYI: 0, VUV: 0, VND: 0
};

// Define the NumberFormat constructor internally so it cannot be tainted
function NumberFormatConstructor() {
    var locales = arguments[0];
    var options = arguments[1];

    if (!this || this === Intl) {
        return new Intl.NumberFormat(locales, options);
    }

    return InitializeNumberFormat(toObject(this), locales, options);
}

defineProperty(Intl, 'NumberFormat', {
    configurable: true,
    writable: true,
    value: NumberFormatConstructor
});

// Must explicitly set prototypes as unwritable
defineProperty(Intl.NumberFormat, 'prototype', {
    writable: false
});

/**
 * The abstract operation InitializeNumberFormat accepts the arguments
 * numberFormat (which must be an object), locales, and options. It initializes
 * numberFormat as a NumberFormat object.
 */
function /*11.1.1.1 */InitializeNumberFormat(numberFormat, locales, options) {
    // This will be a internal properties object if we're not already initialized
    var internal = getInternalProperties(numberFormat);

    // Create an object whose props can be used to restore the values of RegExp props
    var regexpState = createRegExpRestore();

    // 1. If numberFormat has an [[initializedIntlObject]] internal property with
    // value true, throw a TypeError exception.
    if (internal['[[initializedIntlObject]]'] === true) throw new TypeError('`this` object has already been initialized as an Intl object');

    // Need this to access the `internal` object
    defineProperty(numberFormat, '__getInternalProperties', {
        value: function value() {
            // NOTE: Non-standard, for internal use only
            if (arguments[0] === secret) return internal;
        }
    });

    // 2. Set the [[initializedIntlObject]] internal property of numberFormat to true.
    internal['[[initializedIntlObject]]'] = true;

    // 3. Let requestedLocales be the result of calling the CanonicalizeLocaleList
    //    abstract operation (defined in 9.2.1) with argument locales.
    var requestedLocales = CanonicalizeLocaleList(locales);

    // 4. If options is undefined, then
    if (options === undefined)
        // a. Let options be the result of creating a new object as if by the
        // expression new Object() where Object is the standard built-in constructor
        // with that name.
        options = {};

        // 5. Else
    else
        // a. Let options be ToObject(options).
        options = toObject(options);

    // 6. Let opt be a new Record.
    var opt = new Record(),


    // 7. Let matcher be the result of calling the GetOption abstract operation
    //    (defined in 9.2.9) with the arguments options, "localeMatcher", "string",
    //    a List containing the two String values "lookup" and "best fit", and
    //    "best fit".
    matcher = GetOption(options, 'localeMatcher', 'string', new List('lookup', 'best fit'), 'best fit');

    // 8. Set opt.[[localeMatcher]] to matcher.
    opt['[[localeMatcher]]'] = matcher;

    // 9. Let NumberFormat be the standard built-in object that is the initial value
    //    of Intl.NumberFormat.
    // 10. Let localeData be the value of the [[localeData]] internal property of
    //     NumberFormat.
    var localeData = internals.NumberFormat['[[localeData]]'];

    // 11. Let r be the result of calling the ResolveLocale abstract operation
    //     (defined in 9.2.5) with the [[availableLocales]] internal property of
    //     NumberFormat, requestedLocales, opt, the [[relevantExtensionKeys]]
    //     internal property of NumberFormat, and localeData.
    var r = ResolveLocale(internals.NumberFormat['[[availableLocales]]'], requestedLocales, opt, internals.NumberFormat['[[relevantExtensionKeys]]'], localeData);

    // 12. Set the [[locale]] internal property of numberFormat to the value of
    //     r.[[locale]].
    internal['[[locale]]'] = r['[[locale]]'];

    // 13. Set the [[numberingSystem]] internal property of numberFormat to the value
    //     of r.[[nu]].
    internal['[[numberingSystem]]'] = r['[[nu]]'];

    // The specification doesn't tell us to do this, but it's helpful later on
    internal['[[dataLocale]]'] = r['[[dataLocale]]'];

    // 14. Let dataLocale be the value of r.[[dataLocale]].
    var dataLocale = r['[[dataLocale]]'];

    // 15. Let s be the result of calling the GetOption abstract operation with the
    //     arguments options, "style", "string", a List containing the three String
    //     values "decimal", "percent", and "currency", and "decimal".
    var s = GetOption(options, 'style', 'string', new List('decimal', 'percent', 'currency'), 'decimal');

    // 16. Set the [[style]] internal property of numberFormat to s.
    internal['[[style]]'] = s;

    // 17. Let c be the result of calling the GetOption abstract operation with the
    //     arguments options, "currency", "string", undefined, and undefined.
    var c = GetOption(options, 'currency', 'string');

    // 18. If c is not undefined and the result of calling the
    //     IsWellFormedCurrencyCode abstract operation (defined in 6.3.1) with
    //     argument c is false, then throw a RangeError exception.
    if (c !== undefined && !IsWellFormedCurrencyCode(c)) throw new RangeError("'" + c + "' is not a valid currency code");

    // 19. If s is "currency" and c is undefined, throw a TypeError exception.
    if (s === 'currency' && c === undefined) throw new TypeError('Currency code is required when style is currency');

    var cDigits = void 0;

    // 20. If s is "currency", then
    if (s === 'currency') {
        // a. Let c be the result of converting c to upper case as specified in 6.1.
        c = c.toUpperCase();

        // b. Set the [[currency]] internal property of numberFormat to c.
        internal['[[currency]]'] = c;

        // c. Let cDigits be the result of calling the CurrencyDigits abstract
        //    operation (defined below) with argument c.
        cDigits = CurrencyDigits(c);
    }

    // 21. Let cd be the result of calling the GetOption abstract operation with the
    //     arguments options, "currencyDisplay", "string", a List containing the
    //     three String values "code", "symbol", and "name", and "symbol".
    var cd = GetOption(options, 'currencyDisplay', 'string', new List('code', 'symbol', 'name'), 'symbol');

    // 22. If s is "currency", then set the [[currencyDisplay]] internal property of
    //     numberFormat to cd.
    if (s === 'currency') internal['[[currencyDisplay]]'] = cd;

    // 23. Let mnid be the result of calling the GetNumberOption abstract operation
    //     (defined in 9.2.10) with arguments options, "minimumIntegerDigits", 1, 21,
    //     and 1.
    var mnid = GetNumberOption(options, 'minimumIntegerDigits', 1, 21, 1);

    // 24. Set the [[minimumIntegerDigits]] internal property of numberFormat to mnid.
    internal['[[minimumIntegerDigits]]'] = mnid;

    // 25. If s is "currency", then let mnfdDefault be cDigits; else let mnfdDefault
    //     be 0.
    var mnfdDefault = s === 'currency' ? cDigits : 0;

    // 26. Let mnfd be the result of calling the GetNumberOption abstract operation
    //     with arguments options, "minimumFractionDigits", 0, 20, and mnfdDefault.
    var mnfd = GetNumberOption(options, 'minimumFractionDigits', 0, 20, mnfdDefault);

    // 27. Set the [[minimumFractionDigits]] internal property of numberFormat to mnfd.
    internal['[[minimumFractionDigits]]'] = mnfd;

    // 28. If s is "currency", then let mxfdDefault be max(mnfd, cDigits); else if s
    //     is "percent", then let mxfdDefault be max(mnfd, 0); else let mxfdDefault
    //     be max(mnfd, 3).
    var mxfdDefault = s === 'currency' ? Math.max(mnfd, cDigits) : s === 'percent' ? Math.max(mnfd, 0) : Math.max(mnfd, 3);

    // 29. Let mxfd be the result of calling the GetNumberOption abstract operation
    //     with arguments options, "maximumFractionDigits", mnfd, 20, and mxfdDefault.
    var mxfd = GetNumberOption(options, 'maximumFractionDigits', mnfd, 20, mxfdDefault);

    // 30. Set the [[maximumFractionDigits]] internal property of numberFormat to mxfd.
    internal['[[maximumFractionDigits]]'] = mxfd;

    // 31. Let mnsd be the result of calling the [[Get]] internal method of options
    //     with argument "minimumSignificantDigits".
    var mnsd = options.minimumSignificantDigits;

    // 32. Let mxsd be the result of calling the [[Get]] internal method of options
    //     with argument "maximumSignificantDigits".
    var mxsd = options.maximumSignificantDigits;

    // 33. If mnsd is not undefined or mxsd is not undefined, then:
    if (mnsd !== undefined || mxsd !== undefined) {
        // a. Let mnsd be the result of calling the GetNumberOption abstract
        //    operation with arguments options, "minimumSignificantDigits", 1, 21,
        //    and 1.
        mnsd = GetNumberOption(options, 'minimumSignificantDigits', 1, 21, 1);

        // b. Let mxsd be the result of calling the GetNumberOption abstract
        //     operation with arguments options, "maximumSignificantDigits", mnsd,
        //     21, and 21.
        mxsd = GetNumberOption(options, 'maximumSignificantDigits', mnsd, 21, 21);

        // c. Set the [[minimumSignificantDigits]] internal property of numberFormat
        //    to mnsd, and the [[maximumSignificantDigits]] internal property of
        //    numberFormat to mxsd.
        internal['[[minimumSignificantDigits]]'] = mnsd;
        internal['[[maximumSignificantDigits]]'] = mxsd;
    }
    // 34. Let g be the result of calling the GetOption abstract operation with the
    //     arguments options, "useGrouping", "boolean", undefined, and true.
    var g = GetOption(options, 'useGrouping', 'boolean', undefined, true);

    // 35. Set the [[useGrouping]] internal property of numberFormat to g.
    internal['[[useGrouping]]'] = g;

    // 36. Let dataLocaleData be the result of calling the [[Get]] internal method of
    //     localeData with argument dataLocale.
    var dataLocaleData = localeData[dataLocale];

    // 37. Let patterns be the result of calling the [[Get]] internal method of
    //     dataLocaleData with argument "patterns".
    var patterns = dataLocaleData.patterns;

    // 38. Assert: patterns is an object (see 11.2.3)

    // 39. Let stylePatterns be the result of calling the [[Get]] internal method of
    //     patterns with argument s.
    var stylePatterns = patterns[s];

    // 40. Set the [[positivePattern]] internal property of numberFormat to the
    //     result of calling the [[Get]] internal method of stylePatterns with the
    //     argument "positivePattern".
    internal['[[positivePattern]]'] = stylePatterns.positivePattern;

    // 41. Set the [[negativePattern]] internal property of numberFormat to the
    //     result of calling the [[Get]] internal method of stylePatterns with the
    //     argument "negativePattern".
    internal['[[negativePattern]]'] = stylePatterns.negativePattern;

    // 42. Set the [[boundFormat]] internal property of numberFormat to undefined.
    internal['[[boundFormat]]'] = undefined;

    // 43. Set the [[initializedNumberFormat]] internal property of numberFormat to
    //     true.
    internal['[[initializedNumberFormat]]'] = true;

    // In ES3, we need to pre-bind the format() function
    if (es3) numberFormat.format = GetFormatNumber.call(numberFormat);

    // Restore the RegExp properties
    regexpState.exp.test(regexpState.input);

    // Return the newly initialised object
    return numberFormat;
}

function CurrencyDigits(currency) {
    // When the CurrencyDigits abstract operation is called with an argument currency
    // (which must be an upper case String value), the following steps are taken:

    // 1. If the ISO 4217 currency and funds code list contains currency as an
    // alphabetic code, then return the minor unit value corresponding to the
    // currency from the list; else return 2.
    return currencyMinorUnits[currency] !== undefined ? currencyMinorUnits[currency] : 2;
}

/* 11.2.3 */internals.NumberFormat = {
    '[[availableLocales]]': [],
    '[[relevantExtensionKeys]]': ['nu'],
    '[[localeData]]': {}
};

/**
 * When the supportedLocalesOf method of Intl.NumberFormat is called, the
 * following steps are taken:
 */
/* 11.2.2 */
defineProperty(Intl.NumberFormat, 'supportedLocalesOf', {
    configurable: true,
    writable: true,
    value: fnBind.call(function (locales) {
        // Bound functions only have the `this` value altered if being used as a constructor,
        // this lets us imitate a native function that has no constructor
        if (!hop.call(this, '[[availableLocales]]')) throw new TypeError('supportedLocalesOf() is not a constructor');

        // Create an object whose props can be used to restore the values of RegExp props
        var regexpState = createRegExpRestore(),


        // 1. If options is not provided, then let options be undefined.
        options = arguments[1],


        // 2. Let availableLocales be the value of the [[availableLocales]] internal
        //    property of the standard built-in object that is the initial value of
        //    Intl.NumberFormat.

        availableLocales = this['[[availableLocales]]'],


        // 3. Let requestedLocales be the result of calling the CanonicalizeLocaleList
        //    abstract operation (defined in 9.2.1) with argument locales.
        requestedLocales = CanonicalizeLocaleList(locales);

        // Restore the RegExp properties
        regexpState.exp.test(regexpState.input);

        // 4. Return the result of calling the SupportedLocales abstract operation
        //    (defined in 9.2.8) with arguments availableLocales, requestedLocales,
        //    and options.
        return SupportedLocales(availableLocales, requestedLocales, options);
    }, internals.NumberFormat)
});

/**
 * This named accessor property returns a function that formats a number
 * according to the effective locale and the formatting options of this
 * NumberFormat object.
 */
/* 11.3.2 */defineProperty(Intl.NumberFormat.prototype, 'format', {
    configurable: true,
    get: GetFormatNumber
});

function GetFormatNumber() {
    var internal = this !== null && babelHelpers["typeof"](this) === 'object' && getInternalProperties(this);

    // Satisfy test 11.3_b
    if (!internal || !internal['[[initializedNumberFormat]]']) throw new TypeError('`this` value for format() is not an initialized Intl.NumberFormat object.');

    // The value of the [[Get]] attribute is a function that takes the following
    // steps:

    // 1. If the [[boundFormat]] internal property of this NumberFormat object
    //    is undefined, then:
    if (internal['[[boundFormat]]'] === undefined) {
        // a. Let F be a Function object, with internal properties set as
        //    specified for built-in functions in ES5, 15, or successor, and the
        //    length property set to 1, that takes the argument value and
        //    performs the following steps:
        var F = function F(value) {
            // i. If value is not provided, then let value be undefined.
            // ii. Let x be ToNumber(value).
            // iii. Return the result of calling the FormatNumber abstract
            //      operation (defined below) with arguments this and x.
            return FormatNumber(this, /* x = */Number(value));
        };

        // b. Let bind be the standard built-in function object defined in ES5,
        //    15.3.4.5.
        // c. Let bf be the result of calling the [[Call]] internal method of
        //    bind with F as the this value and an argument list containing
        //    the single item this.
        var bf = fnBind.call(F, this);

        // d. Set the [[boundFormat]] internal property of this NumberFormat
        //    object to bf.
        internal['[[boundFormat]]'] = bf;
    }
    // Return the value of the [[boundFormat]] internal property of this
    // NumberFormat object.
    return internal['[[boundFormat]]'];
}

Intl.NumberFormat.prototype.formatToParts = function (value) {
    var internal = this !== null && babelHelpers["typeof"](this) === 'object' && getInternalProperties(this);
    if (!internal || !internal['[[initializedNumberFormat]]']) throw new TypeError('`this` value for formatToParts() is not an initialized Intl.NumberFormat object.');

    var x = Number(value);
    return FormatNumberToParts(this, x);
};

/*
 * @spec[stasm/ecma402/number-format-to-parts/spec/numberformat.html]
 * @clause[sec-formatnumbertoparts]
 */
function FormatNumberToParts(numberFormat, x) {
    // 1. Let parts be ? PartitionNumberPattern(numberFormat, x).
    var parts = PartitionNumberPattern(numberFormat, x);
    // 2. Let result be ArrayCreate(0).
    var result = [];
    // 3. Let n be 0.
    var n = 0;
    // 4. For each part in parts, do:
    for (var i = 0; parts.length > i; i++) {
        var part = parts[i];
        // a. Let O be ObjectCreate(%ObjectPrototype%).
        var O = {};
        // a. Perform ? CreateDataPropertyOrThrow(O, "type", part.[[type]]).
        O.type = part['[[type]]'];
        // a. Perform ? CreateDataPropertyOrThrow(O, "value", part.[[value]]).
        O.value = part['[[value]]'];
        // a. Perform ? CreateDataPropertyOrThrow(result, ? ToString(n), O).
        result[n] = O;
        // a. Increment n by 1.
        n += 1;
    }
    // 5. Return result.
    return result;
}

/*
 * @spec[stasm/ecma402/number-format-to-parts/spec/numberformat.html]
 * @clause[sec-partitionnumberpattern]
 */
function PartitionNumberPattern(numberFormat, x) {

    var internal = getInternalProperties(numberFormat),
        locale = internal['[[dataLocale]]'],
        nums = internal['[[numberingSystem]]'],
        data = internals.NumberFormat['[[localeData]]'][locale],
        ild = data.symbols[nums] || data.symbols.latn,
        pattern = void 0;

    // 1. If x is not NaN and x < 0, then:
    if (!isNaN(x) && x < 0) {
        // a. Let x be -x.
        x = -x;
        // a. Let pattern be the value of numberFormat.[[negativePattern]].
        pattern = internal['[[negativePattern]]'];
    }
    // 2. Else,
    else {
            // a. Let pattern be the value of numberFormat.[[positivePattern]].
            pattern = internal['[[positivePattern]]'];
        }
    // 3. Let result be a new empty List.
    var result = new List();
    // 4. Let beginIndex be Call(%StringProto_indexOf%, pattern, "{", 0).
    var beginIndex = pattern.indexOf('{', 0);
    // 5. Let endIndex be 0.
    var endIndex = 0;
    // 6. Let nextIndex be 0.
    var nextIndex = 0;
    // 7. Let length be the number of code units in pattern.
    var length = pattern.length;
    // 8. Repeat while beginIndex is an integer index into pattern:
    while (beginIndex > -1 && beginIndex < length) {
        // a. Set endIndex to Call(%StringProto_indexOf%, pattern, "}", beginIndex)
        endIndex = pattern.indexOf('}', beginIndex);
        // a. If endIndex = -1, throw new Error exception.
        if (endIndex === -1) throw new Error();
        // a. If beginIndex is greater than nextIndex, then:
        if (beginIndex > nextIndex) {
            // i. Let literal be a substring of pattern from position nextIndex, inclusive, to position beginIndex, exclusive.
            var literal = pattern.substring(nextIndex, beginIndex);
            // ii. Add new part record { [[type]]: "literal", [[value]]: literal } as a new element of the list result.
            arrPush.call(result, { '[[type]]': 'literal', '[[value]]': literal });
        }
        // a. Let p be the substring of pattern from position beginIndex, exclusive, to position endIndex, exclusive.
        var p = pattern.substring(beginIndex + 1, endIndex);
        // a. If p is equal "number", then:
        if (p === "number") {
            // i. If x is NaN,
            if (isNaN(x)) {
                // 1. Let n be an ILD String value indicating the NaN value.
                var n = ild.nan;
                // 2. Add new part record { [[type]]: "nan", [[value]]: n } as a new element of the list result.
                arrPush.call(result, { '[[type]]': 'nan', '[[value]]': n });
            }
            // ii. Else if isFinite(x) is false,
            else if (!isFinite(x)) {
                    // 1. Let n be an ILD String value indicating infinity.
                    var _n = ild.infinity;
                    // 2. Add new part record { [[type]]: "infinity", [[value]]: n } as a new element of the list result.
                    arrPush.call(result, { '[[type]]': 'infinity', '[[value]]': _n });
                }
                // iii. Else,
                else {
                        // 1. If the value of numberFormat.[[style]] is "percent" and isFinite(x), let x be 100 × x.
                        if (internal['[[style]]'] === 'percent' && isFinite(x)) x *= 100;

                        var _n2 = void 0;
                        // 2. If the numberFormat.[[minimumSignificantDigits]] and numberFormat.[[maximumSignificantDigits]] are present, then
                        if (hop.call(internal, '[[minimumSignificantDigits]]') && hop.call(internal, '[[maximumSignificantDigits]]')) {
                            // a. Let n be ToRawPrecision(x, numberFormat.[[minimumSignificantDigits]], numberFormat.[[maximumSignificantDigits]]).
                            _n2 = ToRawPrecision(x, internal['[[minimumSignificantDigits]]'], internal['[[maximumSignificantDigits]]']);
                        }
                        // 3. Else,
                        else {
                                // a. Let n be ToRawFixed(x, numberFormat.[[minimumIntegerDigits]], numberFormat.[[minimumFractionDigits]], numberFormat.[[maximumFractionDigits]]).
                                _n2 = ToRawFixed(x, internal['[[minimumIntegerDigits]]'], internal['[[minimumFractionDigits]]'], internal['[[maximumFractionDigits]]']);
                            }
                        // 4. If the value of the numberFormat.[[numberingSystem]] matches one of the values in the "Numbering System" column of Table 2 below, then
                        if (numSys[nums]) {
                            (function () {
                                // a. Let digits be an array whose 10 String valued elements are the UTF-16 string representations of the 10 digits specified in the "Digits" column of the matching row in Table 2.
                                var digits = numSys[nums];
                                // a. Replace each digit in n with the value of digits[digit].
                                _n2 = String(_n2).replace(/\d/g, function (digit) {
                                    return digits[digit];
                                });
                            })();
                        }
                        // 5. Else use an implementation dependent algorithm to map n to the appropriate representation of n in the given numbering system.
                        else _n2 = String(_n2); // ###TODO###

                        var integer = void 0;
                        var fraction = void 0;
                        // 6. Let decimalSepIndex be Call(%StringProto_indexOf%, n, ".", 0).
                        var decimalSepIndex = _n2.indexOf('.', 0);
                        // 7. If decimalSepIndex > 0, then:
                        if (decimalSepIndex > 0) {
                            // a. Let integer be the substring of n from position 0, inclusive, to position decimalSepIndex, exclusive.
                            integer = _n2.substring(0, decimalSepIndex);
                            // a. Let fraction be the substring of n from position decimalSepIndex, exclusive, to the end of n.
                            fraction = _n2.substring(decimalSepIndex + 1, decimalSepIndex.length);
                        }
                        // 8. Else:
                        else {
                                // a. Let integer be n.
                                integer = _n2;
                                // a. Let fraction be undefined.
                                fraction = undefined;
                            }
                        // 9. If the value of the numberFormat.[[useGrouping]] is true,
                        if (internal['[[useGrouping]]'] === true) {
                            // a. Let groupSepSymbol be the ILND String representing the grouping separator.
                            var groupSepSymbol = ild.group;
                            // a. Let groups be a List whose elements are, in left to right order, the substrings defined by ILND set of locations within the integer.
                            var groups = [];
                            // ----> implementation:
                            // Primary group represents the group closest to the decimal
                            var pgSize = data.patterns.primaryGroupSize || 3;
                            // Secondary group is every other group
                            var sgSize = data.patterns.secondaryGroupSize || pgSize;
                            // Group only if necessary
                            if (integer.length > pgSize) {
                                // Index of the primary grouping separator
                                var end = integer.length - pgSize;
                                // Starting index for our loop
                                var idx = end % sgSize;
                                var start = integer.slice(0, idx);
                                if (start.length) arrPush.call(groups, start);
                                // Loop to separate into secondary grouping digits
                                while (idx < end) {
                                    arrPush.call(groups, integer.slice(idx, idx + sgSize));
                                    idx += sgSize;
                                }
                                // Add the primary grouping digits
                                arrPush.call(groups, integer.slice(end));
                            } else {
                                arrPush.call(groups, integer);
                            }
                            // a. Assert: The number of elements in groups List is greater than 0.
                            if (groups.length === 0) throw new Error();
                            // a. Repeat, while groups List is not empty:
                            while (groups.length) {
                                // i. Remove the first element from groups and let integerGroup be the value of that element.
                                var integerGroup = arrShift.call(groups);
                                // ii. Add new part record { [[type]]: "integer", [[value]]: integerGroup } as a new element of the list result.
                                arrPush.call(result, { '[[type]]': 'integer', '[[value]]': integerGroup });
                                // iii. If groups List is not empty, then:
                                if (groups.length) {
                                    // 1. Add new part record { [[type]]: "group", [[value]]: groupSepSymbol } as a new element of the list result.
                                    arrPush.call(result, { '[[type]]': 'group', '[[value]]': groupSepSymbol });
                                }
                            }
                        }
                        // 10. Else,
                        else {
                                // a. Add new part record { [[type]]: "integer", [[value]]: integer } as a new element of the list result.
                                arrPush.call(result, { '[[type]]': 'integer', '[[value]]': integer });
                            }
                        // 11. If fraction is not undefined, then:
                        if (fraction !== undefined) {
                            // a. Let decimalSepSymbol be the ILND String representing the decimal separator.
                            var decimalSepSymbol = ild.decimal;
                            // a. Add new part record { [[type]]: "decimal", [[value]]: decimalSepSymbol } as a new element of the list result.
                            arrPush.call(result, { '[[type]]': 'decimal', '[[value]]': decimalSepSymbol });
                            // a. Add new part record { [[type]]: "fraction", [[value]]: fraction } as a new element of the list result.
                            arrPush.call(result, { '[[type]]': 'fraction', '[[value]]': fraction });
                        }
                    }
        }
        // a. Else if p is equal "plusSign", then:
        else if (p === "plusSign") {
                // i. Let plusSignSymbol be the ILND String representing the plus sign.
                var plusSignSymbol = ild.plusSign;
                // ii. Add new part record { [[type]]: "plusSign", [[value]]: plusSignSymbol } as a new element of the list result.
                arrPush.call(result, { '[[type]]': 'plusSign', '[[value]]': plusSignSymbol });
            }
            // a. Else if p is equal "minusSign", then:
            else if (p === "minusSign") {
                    // i. Let minusSignSymbol be the ILND String representing the minus sign.
                    var minusSignSymbol = ild.minusSign;
                    // ii. Add new part record { [[type]]: "minusSign", [[value]]: minusSignSymbol } as a new element of the list result.
                    arrPush.call(result, { '[[type]]': 'minusSign', '[[value]]': minusSignSymbol });
                }
                // a. Else if p is equal "percentSign" and numberFormat.[[style]] is "percent", then:
                else if (p === "percentSign" && internal['[[style]]'] === "percent") {
                        // i. Let percentSignSymbol be the ILND String representing the percent sign.
                        var percentSignSymbol = ild.percentSign;
                        // ii. Add new part record { [[type]]: "percentSign", [[value]]: percentSignSymbol } as a new element of the list result.
                        arrPush.call(result, { '[[type]]': 'literal', '[[value]]': percentSignSymbol });
                    }
                    // a. Else if p is equal "currency" and numberFormat.[[style]] is "currency", then:
                    else if (p === "currency" && internal['[[style]]'] === "currency") {
                            // i. Let currency be the value of numberFormat.[[currency]].
                            var currency = internal['[[currency]]'];

                            var cd = void 0;

                            // ii. If numberFormat.[[currencyDisplay]] is "code", then
                            if (internal['[[currencyDisplay]]'] === "code") {
                                // 1. Let cd be currency.
                                cd = currency;
                            }
                            // iii. Else if numberFormat.[[currencyDisplay]] is "symbol", then
                            else if (internal['[[currencyDisplay]]'] === "symbol") {
                                    // 1. Let cd be an ILD string representing currency in short form. If the implementation does not have such a representation of currency, use currency itself.
                                    cd = data.currencies[currency] || currency;
                                }
                                // iv. Else if numberFormat.[[currencyDisplay]] is "name", then
                                else if (internal['[[currencyDisplay]]'] === "name") {
                                        // 1. Let cd be an ILD string representing currency in long form. If the implementation does not have such a representation of currency, then use currency itself.
                                        cd = currency;
                                    }
                            // v. Add new part record { [[type]]: "currency", [[value]]: cd } as a new element of the list result.
                            arrPush.call(result, { '[[type]]': 'currency', '[[value]]': cd });
                        }
                        // a. Else,
                        else {
                                // i. Let literal be the substring of pattern from position beginIndex, inclusive, to position endIndex, inclusive.
                                var _literal = pattern.substring(beginIndex, endIndex);
                                // ii. Add new part record { [[type]]: "literal", [[value]]: literal } as a new element of the list result.
                                arrPush.call(result, { '[[type]]': 'literal', '[[value]]': _literal });
                            }
        // a. Set nextIndex to endIndex + 1.
        nextIndex = endIndex + 1;
        // a. Set beginIndex to Call(%StringProto_indexOf%, pattern, "{", nextIndex)
        beginIndex = pattern.indexOf('{', nextIndex);
    }
    // 9. If nextIndex is less than length, then:
    if (nextIndex < length) {
        // a. Let literal be the substring of pattern from position nextIndex, inclusive, to position length, exclusive.
        var _literal2 = pattern.substring(nextIndex, length);
        // a. Add new part record { [[type]]: "literal", [[value]]: literal } as a new element of the list result.
        arrPush.call(result, { '[[type]]': 'literal', '[[value]]': _literal2 });
    }
    // 10. Return result.
    return result;
}

/*
 * @spec[stasm/ecma402/number-format-to-parts/spec/numberformat.html]
 * @clause[sec-formatnumber]
 */
function FormatNumber(numberFormat, x) {
    // 1. Let parts be ? PartitionNumberPattern(numberFormat, x).
    var parts = PartitionNumberPattern(numberFormat, x);
    // 2. Let result be an empty String.
    var result = '';
    // 3. For each part in parts, do:
    for (var i = 0; parts.length > i; i++) {
        var part = parts[i];
        // a. Set result to a String value produced by concatenating result and part.[[value]].
        result += part['[[value]]'];
    }
    // 4. Return result.
    return result;
}

/**
 * When the ToRawPrecision abstract operation is called with arguments x (which
 * must be a finite non-negative number), minPrecision, and maxPrecision (both
 * must be integers between 1 and 21) the following steps are taken:
 */
function ToRawPrecision(x, minPrecision, maxPrecision) {
    // 1. Let p be maxPrecision.
    var p = maxPrecision;

    var m = void 0,
        e = void 0;

    // 2. If x = 0, then
    if (x === 0) {
        // a. Let m be the String consisting of p occurrences of the character "0".
        m = arrJoin.call(Array(p + 1), '0');
        // b. Let e be 0.
        e = 0;
    }
    // 3. Else
    else {
            // a. Let e and n be integers such that 10ᵖ⁻¹ ≤ n < 10ᵖ and for which the
            //    exact mathematical value of n × 10ᵉ⁻ᵖ⁺¹ – x is as close to zero as
            //    possible. If there are two such sets of e and n, pick the e and n for
            //    which n × 10ᵉ⁻ᵖ⁺¹ is larger.
            e = log10Floor(Math.abs(x));

            // Easier to get to m from here
            var f = Math.round(Math.exp(Math.abs(e - p + 1) * Math.LN10));

            // b. Let m be the String consisting of the digits of the decimal
            //    representation of n (in order, with no leading zeroes)
            m = String(Math.round(e - p + 1 < 0 ? x * f : x / f));
        }

    // 4. If e ≥ p, then
    if (e >= p)
        // a. Return the concatenation of m and e-p+1 occurrences of the character "0".
        return m + arrJoin.call(Array(e - p + 1 + 1), '0');

        // 5. If e = p-1, then
    else if (e === p - 1)
            // a. Return m.
            return m;

            // 6. If e ≥ 0, then
        else if (e >= 0)
                // a. Let m be the concatenation of the first e+1 characters of m, the character
                //    ".", and the remaining p–(e+1) characters of m.
                m = m.slice(0, e + 1) + '.' + m.slice(e + 1);

                // 7. If e < 0, then
            else if (e < 0)
                    // a. Let m be the concatenation of the String "0.", –(e+1) occurrences of the
                    //    character "0", and the string m.
                    m = '0.' + arrJoin.call(Array(-(e + 1) + 1), '0') + m;

    // 8. If m contains the character ".", and maxPrecision > minPrecision, then
    if (m.indexOf(".") >= 0 && maxPrecision > minPrecision) {
        // a. Let cut be maxPrecision – minPrecision.
        var cut = maxPrecision - minPrecision;

        // b. Repeat while cut > 0 and the last character of m is "0":
        while (cut > 0 && m.charAt(m.length - 1) === '0') {
            //  i. Remove the last character from m.
            m = m.slice(0, -1);

            //  ii. Decrease cut by 1.
            cut--;
        }

        // c. If the last character of m is ".", then
        if (m.charAt(m.length - 1) === '.')
            //    i. Remove the last character from m.
            m = m.slice(0, -1);
    }
    // 9. Return m.
    return m;
}

/**
 * @spec[tc39/ecma402/master/spec/numberformat.html]
 * @clause[sec-torawfixed]
 * When the ToRawFixed abstract operation is called with arguments x (which must
 * be a finite non-negative number), minInteger (which must be an integer between
 * 1 and 21), minFraction, and maxFraction (which must be integers between 0 and
 * 20) the following steps are taken:
 */
function ToRawFixed(x, minInteger, minFraction, maxFraction) {
    // 1. Let f be maxFraction.
    var f = maxFraction;
    // 2. Let n be an integer for which the exact mathematical value of n ÷ 10f – x is as close to zero as possible. If there are two such n, pick the larger n.
    var n = Math.pow(10, f) * x; // diverging...
    // 3. If n = 0, let m be the String "0". Otherwise, let m be the String consisting of the digits of the decimal representation of n (in order, with no leading zeroes).
    var m = n === 0 ? "0" : n.toFixed(0); // divering...

    {
        // this diversion is needed to take into consideration big numbers, e.g.:
        // 1.2344501e+37 -> 12344501000000000000000000000000000000
        var idx = void 0;
        var exp = (idx = m.indexOf('e')) > -1 ? m.slice(idx + 1) : 0;
        if (exp) {
            m = m.slice(0, idx).replace('.', '');
            m += arrJoin.call(Array(exp - (m.length - 1) + 1), '0');
        }
    }

    var int = void 0;
    // 4. If f ≠ 0, then
    if (f !== 0) {
        // a. Let k be the number of characters in m.
        var k = m.length;
        // a. If k ≤ f, then
        if (k <= f) {
            // i. Let z be the String consisting of f+1–k occurrences of the character "0".
            var z = arrJoin.call(Array(f + 1 - k + 1), '0');
            // ii. Let m be the concatenation of Strings z and m.
            m = z + m;
            // iii. Let k be f+1.
            k = f + 1;
        }
        // a. Let a be the first k–f characters of m, and let b be the remaining f characters of m.
        var a = m.substring(0, k - f),
            b = m.substring(k - f, m.length);
        // a. Let m be the concatenation of the three Strings a, ".", and b.
        m = a + "." + b;
        // a. Let int be the number of characters in a.
        int = a.length;
    }
    // 5. Else, let int be the number of characters in m.
    else int = m.length;
    // 6. Let cut be maxFraction – minFraction.
    var cut = maxFraction - minFraction;
    // 7. Repeat while cut > 0 and the last character of m is "0":
    while (cut > 0 && m.slice(-1) === "0") {
        // a. Remove the last character from m.
        m = m.slice(0, -1);
        // a. Decrease cut by 1.
        cut--;
    }
    // 8. If the last character of m is ".", then
    if (m.slice(-1) === ".") {
        // a. Remove the last character from m.
        m = m.slice(0, -1);
    }
    // 9. If int < minInteger, then
    if (int < minInteger) {
        // a. Let z be the String consisting of minInteger–int occurrences of the character "0".
        var _z = arrJoin.call(Array(minInteger - int + 1), '0');
        // a. Let m be the concatenation of Strings z and m.
        m = _z + m;
    }
    // 10. Return m.
    return m;
}

// Sect 11.3.2 Table 2, Numbering systems
// ======================================
var numSys = {
    arab: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],
    arabext: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
    bali: ["᭐", "᭑", "᭒", "᭓", "᭔", "᭕", "᭖", "᭗", "᭘", "᭙"],
    beng: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
    deva: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
    fullwide: ["０", "１", "２", "３", "４", "５", "６", "７", "８", "９"],
    gujr: ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"],
    guru: ["੦", "੧", "੨", "੩", "੪", "੫", "੬", "੭", "੮", "੯"],
    hanidec: ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"],
    khmr: ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"],
    knda: ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"],
    laoo: ["໐", "໑", "໒", "໓", "໔", "໕", "໖", "໗", "໘", "໙"],
    latn: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    limb: ["᥆", "᥇", "᥈", "᥉", "᥊", "᥋", "᥌", "᥍", "᥎", "᥏"],
    mlym: ["൦", "൧", "൨", "൩", "൪", "൫", "൬", "൭", "൮", "൯"],
    mong: ["᠐", "᠑", "᠒", "᠓", "᠔", "᠕", "᠖", "᠗", "᠘", "᠙"],
    mymr: ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"],
    orya: ["୦", "୧", "୨", "୩", "୪", "୫", "୬", "୭", "୮", "୯"],
    tamldec: ["௦", "௧", "௨", "௩", "௪", "௫", "௬", "௭", "௮", "௯"],
    telu: ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"],
    thai: ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"],
    tibt: ["༠", "༡", "༢", "༣", "༤", "༥", "༦", "༧", "༨", "༩"]
};

/**
 * This function provides access to the locale and formatting options computed
 * during initialization of the object.
 *
 * The function returns a new object whose properties and attributes are set as
 * if constructed by an object literal assigning to each of the following
 * properties the value of the corresponding internal property of this
 * NumberFormat object (see 11.4): locale, numberingSystem, style, currency,
 * currencyDisplay, minimumIntegerDigits, minimumFractionDigits,
 * maximumFractionDigits, minimumSignificantDigits, maximumSignificantDigits, and
 * useGrouping. Properties whose corresponding internal properties are not present
 * are not assigned.
 */
/* 11.3.3 */defineProperty(Intl.NumberFormat.prototype, 'resolvedOptions', {
    configurable: true,
    writable: true,
    value: function value() {
        var prop = void 0,
            descs = new Record(),
            props = ['locale', 'numberingSystem', 'style', 'currency', 'currencyDisplay', 'minimumIntegerDigits', 'minimumFractionDigits', 'maximumFractionDigits', 'minimumSignificantDigits', 'maximumSignificantDigits', 'useGrouping'],
            internal = this !== null && babelHelpers["typeof"](this) === 'object' && getInternalProperties(this);

        // Satisfy test 11.3_b
        if (!internal || !internal['[[initializedNumberFormat]]']) throw new TypeError('`this` value for resolvedOptions() is not an initialized Intl.NumberFormat object.');

        for (var i = 0, max = props.length; i < max; i++) {
            if (hop.call(internal, prop = '[[' + props[i] + ']]')) descs[props[i]] = { value: internal[prop], writable: true, configurable: true, enumerable: true };
        }

        return objCreate({}, descs);
    }
});

/* jslint esnext: true */

// Match these datetime components in a CLDR pattern, except those in single quotes
var expDTComponents = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
// trim patterns after transformations
var expPatternTrimmer = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
// Skip over patterns with these datetime components because we don't have data
// to back them up:
// timezone, weekday, amoung others
var unwantedDTCs = /[rqQASjJgwWIQq]/; // xXVO were removed from this list in favor of computing matches with timeZoneName values but printing as empty string

var dtKeys = ["weekday", "era", "year", "month", "day", "weekday", "quarter"];
var tmKeys = ["hour", "minute", "second", "hour12", "timeZoneName"];

function isDateFormatOnly(obj) {
    for (var i = 0; i < tmKeys.length; i += 1) {
        if (obj.hasOwnProperty(tmKeys[i])) {
            return false;
        }
    }
    return true;
}

function isTimeFormatOnly(obj) {
    for (var i = 0; i < dtKeys.length; i += 1) {
        if (obj.hasOwnProperty(dtKeys[i])) {
            return false;
        }
    }
    return true;
}

function joinDateAndTimeFormats(dateFormatObj, timeFormatObj) {
    var o = { _: {} };
    for (var i = 0; i < dtKeys.length; i += 1) {
        if (dateFormatObj[dtKeys[i]]) {
            o[dtKeys[i]] = dateFormatObj[dtKeys[i]];
        }
        if (dateFormatObj._[dtKeys[i]]) {
            o._[dtKeys[i]] = dateFormatObj._[dtKeys[i]];
        }
    }
    for (var j = 0; j < tmKeys.length; j += 1) {
        if (timeFormatObj[tmKeys[j]]) {
            o[tmKeys[j]] = timeFormatObj[tmKeys[j]];
        }
        if (timeFormatObj._[tmKeys[j]]) {
            o._[tmKeys[j]] = timeFormatObj._[tmKeys[j]];
        }
    }
    return o;
}

function computeFinalPatterns(formatObj) {
    // From http://www.unicode.org/reports/tr35/tr35-dates.html#Date_Format_Patterns:
    //  'In patterns, two single quotes represents a literal single quote, either
    //   inside or outside single quotes. Text within single quotes is not
    //   interpreted in any way (except for two adjacent single quotes).'
    formatObj.pattern12 = formatObj.extendedPattern.replace(/'([^']*)'/g, function ($0, literal) {
        return literal ? literal : "'";
    });

    // pattern 12 is always the default. we can produce the 24 by removing {ampm}
    formatObj.pattern = formatObj.pattern12.replace('{ampm}', '').replace(expPatternTrimmer, '');
    return formatObj;
}

function expDTComponentsMeta($0, formatObj) {
    switch ($0.charAt(0)) {
        // --- Era
        case 'G':
            formatObj.era = ['short', 'short', 'short', 'long', 'narrow'][$0.length - 1];
            return '{era}';

        // --- Year
        case 'y':
        case 'Y':
        case 'u':
        case 'U':
        case 'r':
            formatObj.year = $0.length === 2 ? '2-digit' : 'numeric';
            return '{year}';

        // --- Quarter (not supported in this polyfill)
        case 'Q':
        case 'q':
            formatObj.quarter = ['numeric', '2-digit', 'short', 'long', 'narrow'][$0.length - 1];
            return '{quarter}';

        // --- Month
        case 'M':
        case 'L':
            formatObj.month = ['numeric', '2-digit', 'short', 'long', 'narrow'][$0.length - 1];
            return '{month}';

        // --- Week (not supported in this polyfill)
        case 'w':
            // week of the year
            formatObj.week = $0.length === 2 ? '2-digit' : 'numeric';
            return '{weekday}';
        case 'W':
            // week of the month
            formatObj.week = 'numeric';
            return '{weekday}';

        // --- Day
        case 'd':
            // day of the month
            formatObj.day = $0.length === 2 ? '2-digit' : 'numeric';
            return '{day}';
        case 'D': // day of the year
        case 'F': // day of the week
        case 'g':
            // 1..n: Modified Julian day
            formatObj.day = 'numeric';
            return '{day}';

        // --- Week Day
        case 'E':
            // day of the week
            formatObj.weekday = ['short', 'short', 'short', 'long', 'narrow', 'short'][$0.length - 1];
            return '{weekday}';
        case 'e':
            // local day of the week
            formatObj.weekday = ['numeric', '2-digit', 'short', 'long', 'narrow', 'short'][$0.length - 1];
            return '{weekday}';
        case 'c':
            // stand alone local day of the week
            formatObj.weekday = ['numeric', undefined, 'short', 'long', 'narrow', 'short'][$0.length - 1];
            return '{weekday}';

        // --- Period
        case 'a': // AM, PM
        case 'b': // am, pm, noon, midnight
        case 'B':
            // flexible day periods
            formatObj.hour12 = true;
            return '{ampm}';

        // --- Hour
        case 'h':
        case 'H':
            formatObj.hour = $0.length === 2 ? '2-digit' : 'numeric';
            return '{hour}';
        case 'k':
        case 'K':
            formatObj.hour12 = true; // 12-hour-cycle time formats (using h or K)
            formatObj.hour = $0.length === 2 ? '2-digit' : 'numeric';
            return '{hour}';

        // --- Minute
        case 'm':
            formatObj.minute = $0.length === 2 ? '2-digit' : 'numeric';
            return '{minute}';

        // --- Second
        case 's':
            formatObj.second = $0.length === 2 ? '2-digit' : 'numeric';
            return '{second}';
        case 'S':
        case 'A':
            formatObj.second = 'numeric';
            return '{second}';

        // --- Timezone
        case 'z': // 1..3, 4: specific non-location format
        case 'Z': // 1..3, 4, 5: The ISO8601 varios formats
        case 'O': // 1, 4: miliseconds in day short, long
        case 'v': // 1, 4: generic non-location format
        case 'V': // 1, 2, 3, 4: time zone ID or city
        case 'X': // 1, 2, 3, 4: The ISO8601 varios formats
        case 'x':
            // 1, 2, 3, 4: The ISO8601 varios formats
            // this polyfill only supports much, for now, we are just doing something dummy
            formatObj.timeZoneName = $0.length < 4 ? 'short' : 'long';
            return '{timeZoneName}';
    }
}

/**
 * Converts the CLDR availableFormats into the objects and patterns required by
 * the ECMAScript Internationalization API specification.
 */
function createDateTimeFormat(skeleton, pattern) {
    // we ignore certain patterns that are unsupported to avoid this expensive op.
    if (unwantedDTCs.test(pattern)) return undefined;

    var formatObj = {
        originalPattern: pattern,
        _: {}
    };

    // Replace the pattern string with the one required by the specification, whilst
    // at the same time evaluating it for the subsets and formats
    formatObj.extendedPattern = pattern.replace(expDTComponents, function ($0) {
        // See which symbol we're dealing with
        return expDTComponentsMeta($0, formatObj._);
    });

    // Match the skeleton string with the one required by the specification
    // this implementation is based on the Date Field Symbol Table:
    // http://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
    // Note: we are adding extra data to the formatObject even though this polyfill
    //       might not support it.
    skeleton.replace(expDTComponents, function ($0) {
        // See which symbol we're dealing with
        return expDTComponentsMeta($0, formatObj);
    });

    return computeFinalPatterns(formatObj);
}

/**
 * Processes DateTime formats from CLDR to an easier-to-parse format.
 * the result of this operation should be cached the first time a particular
 * calendar is analyzed.
 *
 * The specification requires we support at least the following subsets of
 * date/time components:
 *
 *   - 'weekday', 'year', 'month', 'day', 'hour', 'minute', 'second'
 *   - 'weekday', 'year', 'month', 'day'
 *   - 'year', 'month', 'day'
 *   - 'year', 'month'
 *   - 'month', 'day'
 *   - 'hour', 'minute', 'second'
 *   - 'hour', 'minute'
 *
 * We need to cherry pick at least these subsets from the CLDR data and convert
 * them into the pattern objects used in the ECMA-402 API.
 */
function createDateTimeFormats(formats) {
    var availableFormats = formats.availableFormats;
    var timeFormats = formats.timeFormats;
    var dateFormats = formats.dateFormats;
    var result = [];
    var skeleton = void 0,
        pattern = void 0,
        computed = void 0,
        i = void 0,
        j = void 0;
    var timeRelatedFormats = [];
    var dateRelatedFormats = [];

    // Map available (custom) formats into a pattern for createDateTimeFormats
    for (skeleton in availableFormats) {
        if (availableFormats.hasOwnProperty(skeleton)) {
            pattern = availableFormats[skeleton];
            computed = createDateTimeFormat(skeleton, pattern);
            if (computed) {
                result.push(computed);
                // in some cases, the format is only displaying date specific props
                // or time specific props, in which case we need to also produce the
                // combined formats.
                if (isDateFormatOnly(computed)) {
                    dateRelatedFormats.push(computed);
                } else if (isTimeFormatOnly(computed)) {
                    timeRelatedFormats.push(computed);
                }
            }
        }
    }

    // Map time formats into a pattern for createDateTimeFormats
    for (skeleton in timeFormats) {
        if (timeFormats.hasOwnProperty(skeleton)) {
            pattern = timeFormats[skeleton];
            computed = createDateTimeFormat(skeleton, pattern);
            if (computed) {
                result.push(computed);
                timeRelatedFormats.push(computed);
            }
        }
    }

    // Map date formats into a pattern for createDateTimeFormats
    for (skeleton in dateFormats) {
        if (dateFormats.hasOwnProperty(skeleton)) {
            pattern = dateFormats[skeleton];
            computed = createDateTimeFormat(skeleton, pattern);
            if (computed) {
                result.push(computed);
                dateRelatedFormats.push(computed);
            }
        }
    }

    // combine custom time and custom date formats when they are orthogonals to complete the
    // formats supported by CLDR.
    // This Algo is based on section "Missing Skeleton Fields" from:
    // http://unicode.org/reports/tr35/tr35-dates.html#availableFormats_appendItems
    for (i = 0; i < timeRelatedFormats.length; i += 1) {
        for (j = 0; j < dateRelatedFormats.length; j += 1) {
            if (dateRelatedFormats[j].month === 'long') {
                pattern = dateRelatedFormats[j].weekday ? formats.full : formats.long;
            } else if (dateRelatedFormats[j].month === 'short') {
                pattern = formats.medium;
            } else {
                pattern = formats.short;
            }
            computed = joinDateAndTimeFormats(dateRelatedFormats[j], timeRelatedFormats[i]);
            computed.originalPattern = pattern;
            computed.extendedPattern = pattern.replace('{0}', timeRelatedFormats[i].extendedPattern).replace('{1}', dateRelatedFormats[j].extendedPattern).replace(/^[,\s]+|[,\s]+$/gi, '');
            result.push(computeFinalPatterns(computed));
        }
    }

    return result;
}

// An object map of date component keys, saves using a regex later
var dateWidths = objCreate(null, { narrow: {}, short: {}, long: {} });

/**
 * Returns a string for a date component, resolved using multiple inheritance as specified
 * as specified in the Unicode Technical Standard 35.
 */
function resolveDateString(data, ca, component, width, key) {
    // From http://www.unicode.org/reports/tr35/tr35.html#Multiple_Inheritance:
    // 'In clearly specified instances, resources may inherit from within the same locale.
    //  For example, ... the Buddhist calendar inherits from the Gregorian calendar.'
    var obj = data[ca] && data[ca][component] ? data[ca][component] : data.gregory[component],


    // "sideways" inheritance resolves strings when a key doesn't exist
    alts = {
        narrow: ['short', 'long'],
        short: ['long', 'narrow'],
        long: ['short', 'narrow']
    },


    //
    resolved = hop.call(obj, width) ? obj[width] : hop.call(obj, alts[width][0]) ? obj[alts[width][0]] : obj[alts[width][1]];

    // `key` wouldn't be specified for components 'dayPeriods'
    return key !== null ? resolved[key] : resolved;
}

// Define the DateTimeFormat constructor internally so it cannot be tainted
function DateTimeFormatConstructor() {
    var locales = arguments[0];
    var options = arguments[1];

    if (!this || this === Intl) {
        return new Intl.DateTimeFormat(locales, options);
    }
    return InitializeDateTimeFormat(toObject(this), locales, options);
}

defineProperty(Intl, 'DateTimeFormat', {
    configurable: true,
    writable: true,
    value: DateTimeFormatConstructor
});

// Must explicitly set prototypes as unwritable
defineProperty(DateTimeFormatConstructor, 'prototype', {
    writable: false
});

/**
 * The abstract operation InitializeDateTimeFormat accepts the arguments dateTimeFormat
 * (which must be an object), locales, and options. It initializes dateTimeFormat as a
 * DateTimeFormat object.
 */
function /* 12.1.1.1 */InitializeDateTimeFormat(dateTimeFormat, locales, options) {
    // This will be a internal properties object if we're not already initialized
    var internal = getInternalProperties(dateTimeFormat);

    // Create an object whose props can be used to restore the values of RegExp props
    var regexpState = createRegExpRestore();

    // 1. If dateTimeFormat has an [[initializedIntlObject]] internal property with
    //    value true, throw a TypeError exception.
    if (internal['[[initializedIntlObject]]'] === true) throw new TypeError('`this` object has already been initialized as an Intl object');

    // Need this to access the `internal` object
    defineProperty(dateTimeFormat, '__getInternalProperties', {
        value: function value() {
            // NOTE: Non-standard, for internal use only
            if (arguments[0] === secret) return internal;
        }
    });

    // 2. Set the [[initializedIntlObject]] internal property of numberFormat to true.
    internal['[[initializedIntlObject]]'] = true;

    // 3. Let requestedLocales be the result of calling the CanonicalizeLocaleList
    //    abstract operation (defined in 9.2.1) with argument locales.
    var requestedLocales = CanonicalizeLocaleList(locales);

    // 4. Let options be the result of calling the ToDateTimeOptions abstract
    //    operation (defined below) with arguments options, "any", and "date".
    options = ToDateTimeOptions(options, 'any', 'date');

    // 5. Let opt be a new Record.
    var opt = new Record();

    // 6. Let matcher be the result of calling the GetOption abstract operation
    //    (defined in 9.2.9) with arguments options, "localeMatcher", "string", a List
    //    containing the two String values "lookup" and "best fit", and "best fit".
    var matcher = GetOption(options, 'localeMatcher', 'string', new List('lookup', 'best fit'), 'best fit');

    // 7. Set opt.[[localeMatcher]] to matcher.
    opt['[[localeMatcher]]'] = matcher;

    // 8. Let DateTimeFormat be the standard built-in object that is the initial
    //    value of Intl.DateTimeFormat.
    var DateTimeFormat = internals.DateTimeFormat; // This is what we *really* need

    // 9. Let localeData be the value of the [[localeData]] internal property of
    //    DateTimeFormat.
    var localeData = DateTimeFormat['[[localeData]]'];

    // 10. Let r be the result of calling the ResolveLocale abstract operation
    //     (defined in 9.2.5) with the [[availableLocales]] internal property of
    //      DateTimeFormat, requestedLocales, opt, the [[relevantExtensionKeys]]
    //      internal property of DateTimeFormat, and localeData.
    var r = ResolveLocale(DateTimeFormat['[[availableLocales]]'], requestedLocales, opt, DateTimeFormat['[[relevantExtensionKeys]]'], localeData);

    // 11. Set the [[locale]] internal property of dateTimeFormat to the value of
    //     r.[[locale]].
    internal['[[locale]]'] = r['[[locale]]'];

    // 12. Set the [[calendar]] internal property of dateTimeFormat to the value of
    //     r.[[ca]].
    internal['[[calendar]]'] = r['[[ca]]'];

    // 13. Set the [[numberingSystem]] internal property of dateTimeFormat to the value of
    //     r.[[nu]].
    internal['[[numberingSystem]]'] = r['[[nu]]'];

    // The specification doesn't tell us to do this, but it's helpful later on
    internal['[[dataLocale]]'] = r['[[dataLocale]]'];

    // 14. Let dataLocale be the value of r.[[dataLocale]].
    var dataLocale = r['[[dataLocale]]'];

    // 15. Let tz be the result of calling the [[Get]] internal method of options with
    //     argument "timeZone".
    var tz = options.timeZone;

    // 16. If tz is not undefined, then
    if (tz !== undefined) {
        // a. Let tz be ToString(tz).
        // b. Convert tz to upper case as described in 6.1.
        //    NOTE: If an implementation accepts additional time zone values, as permitted
        //          under certain conditions by the Conformance clause, different casing
        //          rules apply.
        tz = toLatinUpperCase(tz);

        // c. If tz is not "UTC", then throw a RangeError exception.
        // ###TODO: accept more time zones###
        if (tz !== 'UTC') throw new RangeError('timeZone is not supported.');
    }

    // 17. Set the [[timeZone]] internal property of dateTimeFormat to tz.
    internal['[[timeZone]]'] = tz;

    // 18. Let opt be a new Record.
    opt = new Record();

    // 19. For each row of Table 3, except the header row, do:
    for (var prop in dateTimeComponents) {
        if (!hop.call(dateTimeComponents, prop)) continue;

        // 20. Let prop be the name given in the Property column of the row.
        // 21. Let value be the result of calling the GetOption abstract operation,
        //     passing as argument options, the name given in the Property column of the
        //     row, "string", a List containing the strings given in the Values column of
        //     the row, and undefined.
        var value = GetOption(options, prop, 'string', dateTimeComponents[prop]);

        // 22. Set opt.[[<prop>]] to value.
        opt['[[' + prop + ']]'] = value;
    }

    // Assigned a value below
    var bestFormat = void 0;

    // 23. Let dataLocaleData be the result of calling the [[Get]] internal method of
    //     localeData with argument dataLocale.
    var dataLocaleData = localeData[dataLocale];

    // 24. Let formats be the result of calling the [[Get]] internal method of
    //     dataLocaleData with argument "formats".
    //     Note: we process the CLDR formats into the spec'd structure
    var formats = ToDateTimeFormats(dataLocaleData.formats);

    // 25. Let matcher be the result of calling the GetOption abstract operation with
    //     arguments options, "formatMatcher", "string", a List containing the two String
    //     values "basic" and "best fit", and "best fit".
    matcher = GetOption(options, 'formatMatcher', 'string', new List('basic', 'best fit'), 'best fit');

    // Optimization: caching the processed formats as a one time operation by
    // replacing the initial structure from localeData
    dataLocaleData.formats = formats;

    // 26. If matcher is "basic", then
    if (matcher === 'basic') {
        // 27. Let bestFormat be the result of calling the BasicFormatMatcher abstract
        //     operation (defined below) with opt and formats.
        bestFormat = BasicFormatMatcher(opt, formats);

        // 28. Else
    } else {
            {
                // diverging
                var _hr = GetOption(options, 'hour12', 'boolean' /*, undefined, undefined*/);
                opt.hour12 = _hr === undefined ? dataLocaleData.hour12 : _hr;
            }
            // 29. Let bestFormat be the result of calling the BestFitFormatMatcher
            //     abstract operation (defined below) with opt and formats.
            bestFormat = BestFitFormatMatcher(opt, formats);
        }

    // 30. For each row in Table 3, except the header row, do
    for (var _prop in dateTimeComponents) {
        if (!hop.call(dateTimeComponents, _prop)) continue;

        // a. Let prop be the name given in the Property column of the row.
        // b. Let pDesc be the result of calling the [[GetOwnProperty]] internal method of
        //    bestFormat with argument prop.
        // c. If pDesc is not undefined, then
        if (hop.call(bestFormat, _prop)) {
            // i. Let p be the result of calling the [[Get]] internal method of bestFormat
            //    with argument prop.
            var p = bestFormat[_prop];
            {
                // diverging
                p = bestFormat._ && hop.call(bestFormat._, _prop) ? bestFormat._[_prop] : p;
            }

            // ii. Set the [[<prop>]] internal property of dateTimeFormat to p.
            internal['[[' + _prop + ']]'] = p;
        }
    }

    var pattern = void 0; // Assigned a value below

    // 31. Let hr12 be the result of calling the GetOption abstract operation with
    //     arguments options, "hour12", "boolean", undefined, and undefined.
    var hr12 = GetOption(options, 'hour12', 'boolean' /*, undefined, undefined*/);

    // 32. If dateTimeFormat has an internal property [[hour]], then
    if (internal['[[hour]]']) {
        // a. If hr12 is undefined, then let hr12 be the result of calling the [[Get]]
        //    internal method of dataLocaleData with argument "hour12".
        hr12 = hr12 === undefined ? dataLocaleData.hour12 : hr12;

        // b. Set the [[hour12]] internal property of dateTimeFormat to hr12.
        internal['[[hour12]]'] = hr12;

        // c. If hr12 is true, then
        if (hr12 === true) {
            // i. Let hourNo0 be the result of calling the [[Get]] internal method of
            //    dataLocaleData with argument "hourNo0".
            var hourNo0 = dataLocaleData.hourNo0;

            // ii. Set the [[hourNo0]] internal property of dateTimeFormat to hourNo0.
            internal['[[hourNo0]]'] = hourNo0;

            // iii. Let pattern be the result of calling the [[Get]] internal method of
            //      bestFormat with argument "pattern12".
            pattern = bestFormat.pattern12;
        }

        // d. Else
        else
            // i. Let pattern be the result of calling the [[Get]] internal method of
            //    bestFormat with argument "pattern".
            pattern = bestFormat.pattern;
    }

    // 33. Else
    else
        // a. Let pattern be the result of calling the [[Get]] internal method of
        //    bestFormat with argument "pattern".
        pattern = bestFormat.pattern;

    // 34. Set the [[pattern]] internal property of dateTimeFormat to pattern.
    internal['[[pattern]]'] = pattern;

    // 35. Set the [[boundFormat]] internal property of dateTimeFormat to undefined.
    internal['[[boundFormat]]'] = undefined;

    // 36. Set the [[initializedDateTimeFormat]] internal property of dateTimeFormat to
    //     true.
    internal['[[initializedDateTimeFormat]]'] = true;

    // In ES3, we need to pre-bind the format() function
    if (es3) dateTimeFormat.format = GetFormatDateTime.call(dateTimeFormat);

    // Restore the RegExp properties
    regexpState.exp.test(regexpState.input);

    // Return the newly initialised object
    return dateTimeFormat;
}

/**
 * Several DateTimeFormat algorithms use values from the following table, which provides
 * property names and allowable values for the components of date and time formats:
 */
var dateTimeComponents = {
    weekday: ["narrow", "short", "long"],
    era: ["narrow", "short", "long"],
    year: ["2-digit", "numeric"],
    month: ["2-digit", "numeric", "narrow", "short", "long"],
    day: ["2-digit", "numeric"],
    hour: ["2-digit", "numeric"],
    minute: ["2-digit", "numeric"],
    second: ["2-digit", "numeric"],
    timeZoneName: ["short", "long"]
};

/**
 * When the ToDateTimeOptions abstract operation is called with arguments options,
 * required, and defaults, the following steps are taken:
 */
function ToDateTimeFormats(formats) {
    if (Object.prototype.toString.call(formats) === '[object Array]') {
        return formats;
    }
    return createDateTimeFormats(formats);
}

/**
 * When the ToDateTimeOptions abstract operation is called with arguments options,
 * required, and defaults, the following steps are taken:
 */
function ToDateTimeOptions(options, required, defaults) {
    // 1. If options is undefined, then let options be null, else let options be
    //    ToObject(options).
    if (options === undefined) options = null;else {
        // (#12) options needs to be a Record, but it also needs to inherit properties
        var opt2 = toObject(options);
        options = new Record();

        for (var k in opt2) {
            options[k] = opt2[k];
        }
    }

    // 2. Let create be the standard built-in function object defined in ES5, 15.2.3.5.
    var create = objCreate;

    // 3. Let options be the result of calling the [[Call]] internal method of create with
    //    undefined as the this value and an argument list containing the single item
    //    options.
    options = create(options);

    // 4. Let needDefaults be true.
    var needDefaults = true;

    // 5. If required is "date" or "any", then
    if (required === 'date' || required === 'any') {
        // a. For each of the property names "weekday", "year", "month", "day":
        // i. If the result of calling the [[Get]] internal method of options with the
        //    property name is not undefined, then let needDefaults be false.
        if (options.weekday !== undefined || options.year !== undefined || options.month !== undefined || options.day !== undefined) needDefaults = false;
    }

    // 6. If required is "time" or "any", then
    if (required === 'time' || required === 'any') {
        // a. For each of the property names "hour", "minute", "second":
        // i. If the result of calling the [[Get]] internal method of options with the
        //    property name is not undefined, then let needDefaults be false.
        if (options.hour !== undefined || options.minute !== undefined || options.second !== undefined) needDefaults = false;
    }

    // 7. If needDefaults is true and defaults is either "date" or "all", then
    if (needDefaults && (defaults === 'date' || defaults === 'all'))
        // a. For each of the property names "year", "month", "day":
        // i. Call the [[DefineOwnProperty]] internal method of options with the
        //    property name, Property Descriptor {[[Value]]: "numeric", [[Writable]]:
        //    true, [[Enumerable]]: true, [[Configurable]]: true}, and false.
        options.year = options.month = options.day = 'numeric';

    // 8. If needDefaults is true and defaults is either "time" or "all", then
    if (needDefaults && (defaults === 'time' || defaults === 'all'))
        // a. For each of the property names "hour", "minute", "second":
        // i. Call the [[DefineOwnProperty]] internal method of options with the
        //    property name, Property Descriptor {[[Value]]: "numeric", [[Writable]]:
        //    true, [[Enumerable]]: true, [[Configurable]]: true}, and false.
        options.hour = options.minute = options.second = 'numeric';

    // 9. Return options.
    return options;
}

/**
 * When the BasicFormatMatcher abstract operation is called with two arguments options and
 * formats, the following steps are taken:
 */
function BasicFormatMatcher(options, formats) {
    // 1. Let removalPenalty be 120.
    var removalPenalty = 120;

    // 2. Let additionPenalty be 20.
    var additionPenalty = 20;

    // 3. Let longLessPenalty be 8.
    var longLessPenalty = 8;

    // 4. Let longMorePenalty be 6.
    var longMorePenalty = 6;

    // 5. Let shortLessPenalty be 6.
    var shortLessPenalty = 6;

    // 6. Let shortMorePenalty be 3.
    var shortMorePenalty = 3;

    // 7. Let bestScore be -Infinity.
    var bestScore = -Infinity;

    // 8. Let bestFormat be undefined.
    var bestFormat = void 0;

    // 9. Let i be 0.
    var i = 0;

    // 10. Assert: formats is an Array object.

    // 11. Let len be the result of calling the [[Get]] internal method of formats with argument "length".
    var len = formats.length;

    // 12. Repeat while i < len:
    while (i < len) {
        // a. Let format be the result of calling the [[Get]] internal method of formats with argument ToString(i).
        var format = formats[i];

        // b. Let score be 0.
        var score = 0;

        // c. For each property shown in Table 3:
        for (var property in dateTimeComponents) {
            if (!hop.call(dateTimeComponents, property)) continue;

            // i. Let optionsProp be options.[[<property>]].
            var optionsProp = options['[[' + property + ']]'];

            // ii. Let formatPropDesc be the result of calling the [[GetOwnProperty]] internal method of format
            //     with argument property.
            // iii. If formatPropDesc is not undefined, then
            //     1. Let formatProp be the result of calling the [[Get]] internal method of format with argument property.
            var formatProp = hop.call(format, property) ? format[property] : undefined;

            // iv. If optionsProp is undefined and formatProp is not undefined, then decrease score by
            //     additionPenalty.
            if (optionsProp === undefined && formatProp !== undefined) score -= additionPenalty;

            // v. Else if optionsProp is not undefined and formatProp is undefined, then decrease score by
            //    removalPenalty.
            else if (optionsProp !== undefined && formatProp === undefined) score -= removalPenalty;

                // vi. Else
                else {
                        // 1. Let values be the array ["2-digit", "numeric", "narrow", "short",
                        //    "long"].
                        var values = ['2-digit', 'numeric', 'narrow', 'short', 'long'];

                        // 2. Let optionsPropIndex be the index of optionsProp within values.
                        var optionsPropIndex = arrIndexOf.call(values, optionsProp);

                        // 3. Let formatPropIndex be the index of formatProp within values.
                        var formatPropIndex = arrIndexOf.call(values, formatProp);

                        // 4. Let delta be max(min(formatPropIndex - optionsPropIndex, 2), -2).
                        var delta = Math.max(Math.min(formatPropIndex - optionsPropIndex, 2), -2);

                        // 5. If delta = 2, decrease score by longMorePenalty.
                        if (delta === 2) score -= longMorePenalty;

                        // 6. Else if delta = 1, decrease score by shortMorePenalty.
                        else if (delta === 1) score -= shortMorePenalty;

                            // 7. Else if delta = -1, decrease score by shortLessPenalty.
                            else if (delta === -1) score -= shortLessPenalty;

                                // 8. Else if delta = -2, decrease score by longLessPenalty.
                                else if (delta === -2) score -= longLessPenalty;
                    }
        }

        // d. If score > bestScore, then
        if (score > bestScore) {
            // i. Let bestScore be score.
            bestScore = score;

            // ii. Let bestFormat be format.
            bestFormat = format;
        }

        // e. Increase i by 1.
        i++;
    }

    // 13. Return bestFormat.
    return bestFormat;
}

/**
 * When the BestFitFormatMatcher abstract operation is called with two arguments options
 * and formats, it performs implementation dependent steps, which should return a set of
 * component representations that a typical user of the selected locale would perceive as
 * at least as good as the one returned by BasicFormatMatcher.
 *
 * This polyfill defines the algorithm to be the same as BasicFormatMatcher,
 * with the addition of bonus points awarded where the requested format is of
 * the same data type as the potentially matching format.
 *
 * This algo relies on the concept of closest distance matching described here:
 * http://unicode.org/reports/tr35/tr35-dates.html#Matching_Skeletons
 * Typically a “best match” is found using a closest distance match, such as:
 *
 * Symbols requesting a best choice for the locale are replaced.
 *      j → one of {H, k, h, K}; C → one of {a, b, B}
 * -> Covered by cldr.js matching process
 *
 * For fields with symbols representing the same type (year, month, day, etc):
 *     Most symbols have a small distance from each other.
 *         M ≅ L; E ≅ c; a ≅ b ≅ B; H ≅ k ≅ h ≅ K; ...
 *     -> Covered by cldr.js matching process
 *
 *     Width differences among fields, other than those marking text vs numeric, are given small distance from each other.
 *         MMM ≅ MMMM
 *         MM ≅ M
 *     Numeric and text fields are given a larger distance from each other.
 *         MMM ≈ MM
 *     Symbols representing substantial differences (week of year vs week of month) are given much larger a distances from each other.
 *         d ≋ D; ...
 *     Missing or extra fields cause a match to fail. (But see Missing Skeleton Fields).
 *
 *
 * For example,
 *
 *     { month: 'numeric', day: 'numeric' }
 *
 * should match
 *
 *     { month: '2-digit', day: '2-digit' }
 *
 * rather than
 *
 *     { month: 'short', day: 'numeric' }
 *
 * This makes sense because a user requesting a formatted date with numeric parts would
 * not expect to see the returned format containing narrow, short or long part names
 */
function BestFitFormatMatcher(options, formats) {

    // 1. Let removalPenalty be 120.
    var removalPenalty = 120;

    // 2. Let additionPenalty be 20.
    var additionPenalty = 20;

    // 3. Let longLessPenalty be 8.
    var longLessPenalty = 8;

    // 4. Let longMorePenalty be 6.
    var longMorePenalty = 6;

    // 5. Let shortLessPenalty be 6.
    var shortLessPenalty = 6;

    // 6. Let shortMorePenalty be 3.
    var shortMorePenalty = 3;

    var hour12Penalty = 1;

    // 7. Let bestScore be -Infinity.
    var bestScore = -Infinity;

    // 8. Let bestFormat be undefined.
    var bestFormat = void 0;

    // 9. Let i be 0.
    var i = 0;

    // 10. Assert: formats is an Array object.

    // 11. Let len be the result of calling the [[Get]] internal method of formats with argument "length".
    var len = formats.length;

    // 12. Repeat while i < len:
    while (i < len) {
        // a. Let format be the result of calling the [[Get]] internal method of formats with argument ToString(i).
        var format = formats[i];

        // b. Let score be 0.
        var score = 0;

        // c. For each property shown in Table 3:
        for (var property in dateTimeComponents) {
            if (!hop.call(dateTimeComponents, property)) continue;

            // i. Let optionsProp be options.[[<property>]].
            var optionsProp = options['[[' + property + ']]'];

            // ii. Let formatPropDesc be the result of calling the [[GetOwnProperty]] internal method of format
            //     with argument property.
            // iii. If formatPropDesc is not undefined, then
            //     1. Let formatProp be the result of calling the [[Get]] internal method of format with argument property.
            var formatProp = hop.call(format, property) ? format[property] : undefined;

            // iv. If optionsProp is undefined and formatProp is not undefined, then decrease score by
            //     additionPenalty.
            if (optionsProp === undefined && formatProp !== undefined) score -= additionPenalty;

            // v. Else if optionsProp is not undefined and formatProp is undefined, then decrease score by
            //    removalPenalty.
            else if (optionsProp !== undefined && formatProp === undefined) score -= removalPenalty;

                // vi. Else
                else {
                        // 1. Let values be the array ["2-digit", "numeric", "narrow", "short",
                        //    "long"].
                        var values = ['2-digit', 'numeric', 'narrow', 'short', 'long'];

                        // 2. Let optionsPropIndex be the index of optionsProp within values.
                        var optionsPropIndex = arrIndexOf.call(values, optionsProp);

                        // 3. Let formatPropIndex be the index of formatProp within values.
                        var formatPropIndex = arrIndexOf.call(values, formatProp);

                        // 4. Let delta be max(min(formatPropIndex - optionsPropIndex, 2), -2).
                        var delta = Math.max(Math.min(formatPropIndex - optionsPropIndex, 2), -2);

                        {
                            // diverging from spec
                            // When the bestFit argument is true, subtract additional penalty where data types are not the same
                            if (formatPropIndex <= 1 && optionsPropIndex >= 2 || formatPropIndex >= 2 && optionsPropIndex <= 1) {
                                // 5. If delta = 2, decrease score by longMorePenalty.
                                if (delta > 0) score -= longMorePenalty;else if (delta < 0) score -= longLessPenalty;
                            } else {
                                // 5. If delta = 2, decrease score by longMorePenalty.
                                if (delta > 1) score -= shortMorePenalty;else if (delta < -1) score -= shortLessPenalty;
                            }
                        }
                    }
        }

        {
            // diverging to also take into consideration differences between 12 or 24 hours
            // which is special for the best fit only.
            if (format._.hour12 !== options.hour12) {
                score -= hour12Penalty;
            }
        }

        // d. If score > bestScore, then
        if (score > bestScore) {
            // i. Let bestScore be score.
            bestScore = score;
            // ii. Let bestFormat be format.
            bestFormat = format;
        }

        // e. Increase i by 1.
        i++;
    }

    // 13. Return bestFormat.
    return bestFormat;
}

/* 12.2.3 */internals.DateTimeFormat = {
    '[[availableLocales]]': [],
    '[[relevantExtensionKeys]]': ['ca', 'nu'],
    '[[localeData]]': {}
};

/**
 * When the supportedLocalesOf method of Intl.DateTimeFormat is called, the
 * following steps are taken:
 */
/* 12.2.2 */
defineProperty(Intl.DateTimeFormat, 'supportedLocalesOf', {
    configurable: true,
    writable: true,
    value: fnBind.call(function (locales) {
        // Bound functions only have the `this` value altered if being used as a constructor,
        // this lets us imitate a native function that has no constructor
        if (!hop.call(this, '[[availableLocales]]')) throw new TypeError('supportedLocalesOf() is not a constructor');

        // Create an object whose props can be used to restore the values of RegExp props
        var regexpState = createRegExpRestore(),


        // 1. If options is not provided, then let options be undefined.
        options = arguments[1],


        // 2. Let availableLocales be the value of the [[availableLocales]] internal
        //    property of the standard built-in object that is the initial value of
        //    Intl.NumberFormat.

        availableLocales = this['[[availableLocales]]'],


        // 3. Let requestedLocales be the result of calling the CanonicalizeLocaleList
        //    abstract operation (defined in 9.2.1) with argument locales.
        requestedLocales = CanonicalizeLocaleList(locales);

        // Restore the RegExp properties
        regexpState.exp.test(regexpState.input);

        // 4. Return the result of calling the SupportedLocales abstract operation
        //    (defined in 9.2.8) with arguments availableLocales, requestedLocales,
        //    and options.
        return SupportedLocales(availableLocales, requestedLocales, options);
    }, internals.NumberFormat)
});

/**
 * This named accessor property returns a function that formats a number
 * according to the effective locale and the formatting options of this
 * DateTimeFormat object.
 */
/* 12.3.2 */defineProperty(Intl.DateTimeFormat.prototype, 'format', {
    configurable: true,
    get: GetFormatDateTime
});

defineProperty(Intl.DateTimeFormat.prototype, 'formatToParts', {
    configurable: true,
    get: GetFormatToPartsDateTime
});

function GetFormatDateTime() {
    var internal = this !== null && babelHelpers["typeof"](this) === 'object' && getInternalProperties(this);

    // Satisfy test 12.3_b
    if (!internal || !internal['[[initializedDateTimeFormat]]']) throw new TypeError('`this` value for format() is not an initialized Intl.DateTimeFormat object.');

    // The value of the [[Get]] attribute is a function that takes the following
    // steps:

    // 1. If the [[boundFormat]] internal property of this DateTimeFormat object
    //    is undefined, then:
    if (internal['[[boundFormat]]'] === undefined) {
        // a. Let F be a Function object, with internal properties set as
        //    specified for built-in functions in ES5, 15, or successor, and the
        //    length property set to 0, that takes the argument date and
        //    performs the following steps:
        var F = function F() {
            //   i. If date is not provided or is undefined, then let x be the
            //      result as if by the expression Date.now() where Date.now is
            //      the standard built-in function defined in ES5, 15.9.4.4.
            //  ii. Else let x be ToNumber(date).
            // iii. Return the result of calling the FormatDateTime abstract
            //      operation (defined below) with arguments this and x.
            var x = Number(arguments.length === 0 ? Date.now() : arguments[0]);
            return FormatDateTime(this, x);
        };
        // b. Let bind be the standard built-in function object defined in ES5,
        //    15.3.4.5.
        // c. Let bf be the result of calling the [[Call]] internal method of
        //    bind with F as the this value and an argument list containing
        //    the single item this.
        var bf = fnBind.call(F, this);
        // d. Set the [[boundFormat]] internal property of this NumberFormat
        //    object to bf.
        internal['[[boundFormat]]'] = bf;
    }
    // Return the value of the [[boundFormat]] internal property of this
    // NumberFormat object.
    return internal['[[boundFormat]]'];
}

function GetFormatToPartsDateTime() {
    var internal = this !== null && babelHelpers["typeof"](this) === 'object' && getInternalProperties(this);

    if (!internal || !internal['[[initializedDateTimeFormat]]']) throw new TypeError('`this` value for formatToParts() is not an initialized Intl.DateTimeFormat object.');

    if (internal['[[boundFormatToParts]]'] === undefined) {
        var F = function F() {
            var x = Number(arguments.length === 0 ? Date.now() : arguments[0]);
            return FormatToPartsDateTime(this, x);
        };
        var bf = fnBind.call(F, this);
        internal['[[boundFormatToParts]]'] = bf;
    }
    return internal['[[boundFormatToParts]]'];
}

function CreateDateTimeParts(dateTimeFormat, x) {
    // 1. If x is not a finite Number, then throw a RangeError exception.
    if (!isFinite(x)) throw new RangeError('Invalid valid date passed to format');

    var internal = dateTimeFormat.__getInternalProperties(secret);

    // Creating restore point for properties on the RegExp object... please wait
    /* let regexpState = */createRegExpRestore(); // ###TODO: review this

    // 2. Let locale be the value of the [[locale]] internal property of dateTimeFormat.
    var locale = internal['[[locale]]'];

    // 3. Let nf be the result of creating a new NumberFormat object as if by the
    // expression new Intl.NumberFormat([locale], {useGrouping: false}) where
    // Intl.NumberFormat is the standard built-in constructor defined in 11.1.3.
    var nf = new Intl.NumberFormat([locale], { useGrouping: false });

    // 4. Let nf2 be the result of creating a new NumberFormat object as if by the
    // expression new Intl.NumberFormat([locale], {minimumIntegerDigits: 2, useGrouping:
    // false}) where Intl.NumberFormat is the standard built-in constructor defined in
    // 11.1.3.
    var nf2 = new Intl.NumberFormat([locale], { minimumIntegerDigits: 2, useGrouping: false });

    // 5. Let tm be the result of calling the ToLocalTime abstract operation (defined
    // below) with x, the value of the [[calendar]] internal property of dateTimeFormat,
    // and the value of the [[timeZone]] internal property of dateTimeFormat.
    var tm = ToLocalTime(x, internal['[[calendar]]'], internal['[[timeZone]]']);

    // 6. Let result be the value of the [[pattern]] internal property of dateTimeFormat.
    var pattern = internal['[[pattern]]'];

    // 7.
    var result = new List();

    // 8.
    var index = 0;

    // 9.
    var beginIndex = pattern.indexOf('{');

    // 10.
    var endIndex = 0;

    // Need the locale minus any extensions
    var dataLocale = internal['[[dataLocale]]'];

    // Need the calendar data from CLDR
    var localeData = internals.DateTimeFormat['[[localeData]]'][dataLocale].calendars;
    var ca = internal['[[calendar]]'];

    // 11.
    while (beginIndex !== -1) {
        var fv = void 0;
        // a.
        endIndex = pattern.indexOf('}', beginIndex);
        // b.
        if (endIndex === -1) {
            throw new Error('Unclosed pattern');
        }
        // c.
        if (beginIndex > index) {
            arrPush.call(result, {
                type: 'literal',
                value: pattern.substring(index, beginIndex)
            });
        }
        // d.
        var p = pattern.substring(beginIndex + 1, endIndex);
        // e.
        if (dateTimeComponents.hasOwnProperty(p)) {
            //   i. Let f be the value of the [[<p>]] internal property of dateTimeFormat.
            var f = internal['[[' + p + ']]'];
            //  ii. Let v be the value of tm.[[<p>]].
            var v = tm['[[' + p + ']]'];
            // iii. If p is "year" and v ≤ 0, then let v be 1 - v.
            if (p === 'year' && v <= 0) {
                v = 1 - v;
            }
            //  iv. If p is "month", then increase v by 1.
            else if (p === 'month') {
                    v++;
                }
                //   v. If p is "hour" and the value of the [[hour12]] internal property of
                //      dateTimeFormat is true, then
                else if (p === 'hour' && internal['[[hour12]]'] === true) {
                        // 1. Let v be v modulo 12.
                        v = v % 12;
                        // 2. If v is 0 and the value of the [[hourNo0]] internal property of
                        //    dateTimeFormat is true, then let v be 12.
                        if (v === 0 && internal['[[hourNo0]]'] === true) {
                            v = 12;
                        }
                    }

            //  vi. If f is "numeric", then
            if (f === 'numeric') {
                // 1. Let fv be the result of calling the FormatNumber abstract operation
                //    (defined in 11.3.2) with arguments nf and v.
                fv = FormatNumber(nf, v);
            }
            // vii. Else if f is "2-digit", then
            else if (f === '2-digit') {
                    // 1. Let fv be the result of calling the FormatNumber abstract operation
                    //    with arguments nf2 and v.
                    fv = FormatNumber(nf2, v);
                    // 2. If the length of fv is greater than 2, let fv be the substring of fv
                    //    containing the last two characters.
                    if (fv.length > 2) {
                        fv = fv.slice(-2);
                    }
                }
                // viii. Else if f is "narrow", "short", or "long", then let fv be a String
                //     value representing f in the desired form; the String value depends upon
                //     the implementation and the effective locale and calendar of
                //     dateTimeFormat. If p is "month", then the String value may also depend
                //     on whether dateTimeFormat has a [[day]] internal property. If p is
                //     "timeZoneName", then the String value may also depend on the value of
                //     the [[inDST]] field of tm.
                else if (f in dateWidths) {
                        switch (p) {
                            case 'month':
                                fv = resolveDateString(localeData, ca, 'months', f, tm['[[' + p + ']]']);
                                break;

                            case 'weekday':
                                try {
                                    fv = resolveDateString(localeData, ca, 'days', f, tm['[[' + p + ']]']);
                                    // fv = resolveDateString(ca.days, f)[tm['[['+ p +']]']];
                                } catch (e) {
                                    throw new Error('Could not find weekday data for locale ' + locale);
                                }
                                break;

                            case 'timeZoneName':
                                fv = ''; // ###TODO
                                break;

                            case 'era':
                                try {
                                    fv = resolveDateString(localeData, ca, 'eras', f, tm['[[' + p + ']]']);
                                } catch (e) {
                                    throw new Error('Could not find era data for locale ' + locale);
                                }
                                break;

                            default:
                                fv = tm['[[' + p + ']]'];
                        }
                    }
            // ix
            arrPush.call(result, {
                type: p,
                value: fv
            });
            // f.
        } else if (p === 'ampm') {
                // i.
                var _v = tm['[[hour]]'];
                // ii./iii.
                fv = resolveDateString(localeData, ca, 'dayPeriods', _v > 11 ? 'pm' : 'am', null);
                // iv.
                arrPush.call(result, {
                    type: 'dayPeriod',
                    value: fv
                });
                // g.
            } else {
                    arrPush.call(result, {
                        type: 'literal',
                        value: pattern.substring(beginIndex, endIndex + 1)
                    });
                }
        // h.
        index = endIndex + 1;
        // i.
        beginIndex = pattern.indexOf('{', index);
    }
    // 12.
    if (endIndex < pattern.length - 1) {
        arrPush.call(result, {
            type: 'literal',
            value: pattern.substr(endIndex + 1)
        });
    }
    // 13.
    return result;
}

/**
 * When the FormatDateTime abstract operation is called with arguments dateTimeFormat
 * (which must be an object initialized as a DateTimeFormat) and x (which must be a Number
 * value), it returns a String value representing x (interpreted as a time value as
 * specified in ES5, 15.9.1.1) according to the effective locale and the formatting
 * options of dateTimeFormat.
 */
function FormatDateTime(dateTimeFormat, x) {
    var parts = CreateDateTimeParts(dateTimeFormat, x);
    var result = '';

    for (var i = 0; parts.length > i; i++) {
        var part = parts[i];
        result += part.value;
    }
    return result;
}

function FormatToPartsDateTime(dateTimeFormat, x) {
    var parts = CreateDateTimeParts(dateTimeFormat, x);
    var result = [];
    for (var i = 0; parts.length > i; i++) {
        var part = parts[i];
        result.push({
            type: part.type,
            value: part.value
        });
    }
    return result;
}

/**
 * When the ToLocalTime abstract operation is called with arguments date, calendar, and
 * timeZone, the following steps are taken:
 */
function ToLocalTime(date, calendar, timeZone) {
    // 1. Apply calendrical calculations on date for the given calendar and time zone to
    //    produce weekday, era, year, month, day, hour, minute, second, and inDST values.
    //    The calculations should use best available information about the specified
    //    calendar and time zone. If the calendar is "gregory", then the calculations must
    //    match the algorithms specified in ES5, 15.9.1, except that calculations are not
    //    bound by the restrictions on the use of best available information on time zones
    //    for local time zone adjustment and daylight saving time adjustment imposed by
    //    ES5, 15.9.1.7 and 15.9.1.8.
    // ###TODO###
    var d = new Date(date),
        m = 'get' + (timeZone || '');

    // 2. Return a Record with fields [[weekday]], [[era]], [[year]], [[month]], [[day]],
    //    [[hour]], [[minute]], [[second]], and [[inDST]], each with the corresponding
    //    calculated value.
    return new Record({
        '[[weekday]]': d[m + 'Day'](),
        '[[era]]': +(d[m + 'FullYear']() >= 0),
        '[[year]]': d[m + 'FullYear'](),
        '[[month]]': d[m + 'Month'](),
        '[[day]]': d[m + 'Date'](),
        '[[hour]]': d[m + 'Hours'](),
        '[[minute]]': d[m + 'Minutes'](),
        '[[second]]': d[m + 'Seconds'](),
        '[[inDST]]': false });
}

/**
 * The function returns a new object whose properties and attributes are set as if
 * constructed by an object literal assigning to each of the following properties the
 * value of the corresponding internal property of this DateTimeFormat object (see 12.4):
 * locale, calendar, numberingSystem, timeZone, hour12, weekday, era, year, month, day,
 * hour, minute, second, and timeZoneName. Properties whose corresponding internal
 * properties are not present are not assigned.
 */
/* 12.3.3 */ // ###TODO###
defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
    writable: true,
    configurable: true,
    value: function value() {
        var prop = void 0,
            descs = new Record(),
            props = ['locale', 'calendar', 'numberingSystem', 'timeZone', 'hour12', 'weekday', 'era', 'year', 'month', 'day', 'hour', 'minute', 'second', 'timeZoneName'],
            internal = this !== null && babelHelpers["typeof"](this) === 'object' && getInternalProperties(this);

        // Satisfy test 12.3_b
        if (!internal || !internal['[[initializedDateTimeFormat]]']) throw new TypeError('`this` value for resolvedOptions() is not an initialized Intl.DateTimeFormat object.');

        for (var i = 0, max = props.length; i < max; i++) {
            if (hop.call(internal, prop = '[[' + props[i] + ']]')) descs[props[i]] = { value: internal[prop], writable: true, configurable: true, enumerable: true };
        }

        return objCreate({}, descs);
    }
});

var ls = Intl.__localeSensitiveProtos = {
    Number: {},
    Date: {}
};

/**
 * When the toLocaleString method is called with optional arguments locales and options,
 * the following steps are taken:
 */
/* 13.2.1 */ls.Number.toLocaleString = function () {
    // Satisfy test 13.2.1_1
    if (Object.prototype.toString.call(this) !== '[object Number]') throw new TypeError('`this` value must be a number for Number.prototype.toLocaleString()');

    // 1. Let x be this Number value (as defined in ES5, 15.7.4).
    // 2. If locales is not provided, then let locales be undefined.
    // 3. If options is not provided, then let options be undefined.
    // 4. Let numberFormat be the result of creating a new object as if by the
    //    expression new Intl.NumberFormat(locales, options) where
    //    Intl.NumberFormat is the standard built-in constructor defined in 11.1.3.
    // 5. Return the result of calling the FormatNumber abstract operation
    //    (defined in 11.3.2) with arguments numberFormat and x.
    return FormatNumber(new NumberFormatConstructor(arguments[0], arguments[1]), this);
};

/**
 * When the toLocaleString method is called with optional arguments locales and options,
 * the following steps are taken:
 */
/* 13.3.1 */ls.Date.toLocaleString = function () {
    // Satisfy test 13.3.0_1
    if (Object.prototype.toString.call(this) !== '[object Date]') throw new TypeError('`this` value must be a Date instance for Date.prototype.toLocaleString()');

    // 1. Let x be this time value (as defined in ES5, 15.9.5).
    var x = +this;

    // 2. If x is NaN, then return "Invalid Date".
    if (isNaN(x)) return 'Invalid Date';

    // 3. If locales is not provided, then let locales be undefined.
    var locales = arguments[0];

    // 4. If options is not provided, then let options be undefined.
    var options = arguments[1];

    // 5. Let options be the result of calling the ToDateTimeOptions abstract
    //    operation (defined in 12.1.1) with arguments options, "any", and "all".
    options = ToDateTimeOptions(options, 'any', 'all');

    // 6. Let dateTimeFormat be the result of creating a new object as if by the
    //    expression new Intl.DateTimeFormat(locales, options) where
    //    Intl.DateTimeFormat is the standard built-in constructor defined in 12.1.3.
    var dateTimeFormat = new DateTimeFormatConstructor(locales, options);

    // 7. Return the result of calling the FormatDateTime abstract operation (defined
    //    in 12.3.2) with arguments dateTimeFormat and x.
    return FormatDateTime(dateTimeFormat, x);
};

/**
 * When the toLocaleDateString method is called with optional arguments locales and
 * options, the following steps are taken:
 */
/* 13.3.2 */ls.Date.toLocaleDateString = function () {
    // Satisfy test 13.3.0_1
    if (Object.prototype.toString.call(this) !== '[object Date]') throw new TypeError('`this` value must be a Date instance for Date.prototype.toLocaleDateString()');

    // 1. Let x be this time value (as defined in ES5, 15.9.5).
    var x = +this;

    // 2. If x is NaN, then return "Invalid Date".
    if (isNaN(x)) return 'Invalid Date';

    // 3. If locales is not provided, then let locales be undefined.
    var locales = arguments[0],


    // 4. If options is not provided, then let options be undefined.
    options = arguments[1];

    // 5. Let options be the result of calling the ToDateTimeOptions abstract
    //    operation (defined in 12.1.1) with arguments options, "date", and "date".
    options = ToDateTimeOptions(options, 'date', 'date');

    // 6. Let dateTimeFormat be the result of creating a new object as if by the
    //    expression new Intl.DateTimeFormat(locales, options) where
    //    Intl.DateTimeFormat is the standard built-in constructor defined in 12.1.3.
    var dateTimeFormat = new DateTimeFormatConstructor(locales, options);

    // 7. Return the result of calling the FormatDateTime abstract operation (defined
    //    in 12.3.2) with arguments dateTimeFormat and x.
    return FormatDateTime(dateTimeFormat, x);
};

/**
 * When the toLocaleTimeString method is called with optional arguments locales and
 * options, the following steps are taken:
 */
/* 13.3.3 */ls.Date.toLocaleTimeString = function () {
    // Satisfy test 13.3.0_1
    if (Object.prototype.toString.call(this) !== '[object Date]') throw new TypeError('`this` value must be a Date instance for Date.prototype.toLocaleTimeString()');

    // 1. Let x be this time value (as defined in ES5, 15.9.5).
    var x = +this;

    // 2. If x is NaN, then return "Invalid Date".
    if (isNaN(x)) return 'Invalid Date';

    // 3. If locales is not provided, then let locales be undefined.
    var locales = arguments[0];

    // 4. If options is not provided, then let options be undefined.
    var options = arguments[1];

    // 5. Let options be the result of calling the ToDateTimeOptions abstract
    //    operation (defined in 12.1.1) with arguments options, "time", and "time".
    options = ToDateTimeOptions(options, 'time', 'time');

    // 6. Let dateTimeFormat be the result of creating a new object as if by the
    //    expression new Intl.DateTimeFormat(locales, options) where
    //    Intl.DateTimeFormat is the standard built-in constructor defined in 12.1.3.
    var dateTimeFormat = new DateTimeFormatConstructor(locales, options);

    // 7. Return the result of calling the FormatDateTime abstract operation (defined
    //    in 12.3.2) with arguments dateTimeFormat and x.
    return FormatDateTime(dateTimeFormat, x);
};

defineProperty(Intl, '__applyLocaleSensitivePrototypes', {
    writable: true,
    configurable: true,
    value: function value() {
        defineProperty(Number.prototype, 'toLocaleString', { writable: true, configurable: true, value: ls.Number.toLocaleString });
        // Need this here for IE 8, to avoid the _DontEnum_ bug
        defineProperty(Date.prototype, 'toLocaleString', { writable: true, configurable: true, value: ls.Date.toLocaleString });

        for (var k in ls.Date) {
            if (hop.call(ls.Date, k)) defineProperty(Date.prototype, k, { writable: true, configurable: true, value: ls.Date[k] });
        }
    }
});

/**
 * Can't really ship a single script with data for hundreds of locales, so we provide
 * this __addLocaleData method as a means for the developer to add the data on an
 * as-needed basis
 */
defineProperty(Intl, '__addLocaleData', {
    value: function value(data) {
        if (!IsStructurallyValidLanguageTag(data.locale)) throw new Error("Object passed doesn't identify itself with a valid language tag");

        addLocaleData(data, data.locale);
    }
});

function addLocaleData(data, tag) {
    // Both NumberFormat and DateTimeFormat require number data, so throw if it isn't present
    if (!data.number) throw new Error("Object passed doesn't contain locale data for Intl.NumberFormat");

    var locale = void 0,
        locales = [tag],
        parts = tag.split('-');

    // Create fallbacks for locale data with scripts, e.g. Latn, Hans, Vaii, etc
    if (parts.length > 2 && parts[1].length === 4) arrPush.call(locales, parts[0] + '-' + parts[2]);

    while (locale = arrShift.call(locales)) {
        // Add to NumberFormat internal properties as per 11.2.3
        arrPush.call(internals.NumberFormat['[[availableLocales]]'], locale);
        internals.NumberFormat['[[localeData]]'][locale] = data.number;

        // ...and DateTimeFormat internal properties as per 12.2.3
        if (data.date) {
            data.date.nu = data.number.nu;
            arrPush.call(internals.DateTimeFormat['[[availableLocales]]'], locale);
            internals.DateTimeFormat['[[localeData]]'][locale] = data.date;
        }
    }

    // If this is the first set of locale data added, make it the default
    if (defaultLocale === undefined) setDefaultLocale(tag);
}

module.exports = Intl;
},{}],32:[function(require,module,exports){
IntlPolyfill.__addLocaleData({locale:"en-US",date:{ca:["gregory","buddhist","chinese","coptic","dangi","ethioaa","ethiopic","generic","hebrew","indian","islamic","islamicc","japanese","persian","roc"],hourNo0:true,hour12:true,formats:{short:"{1}, {0}",medium:"{1}, {0}",full:"{1} 'at' {0}",long:"{1} 'at' {0}",availableFormats:{"d":"d","E":"ccc",Ed:"d E",Ehm:"E h:mm a",EHm:"E HH:mm",Ehms:"E h:mm:ss a",EHms:"E HH:mm:ss",Gy:"y G",GyMMM:"MMM y G",GyMMMd:"MMM d, y G",GyMMMEd:"E, MMM d, y G","h":"h a","H":"HH",hm:"h:mm a",Hm:"HH:mm",hms:"h:mm:ss a",Hms:"HH:mm:ss",hmsv:"h:mm:ss a v",Hmsv:"HH:mm:ss v",hmv:"h:mm a v",Hmv:"HH:mm v","M":"L",Md:"M/d",MEd:"E, M/d",MMM:"LLL",MMMd:"MMM d",MMMEd:"E, MMM d",MMMMd:"MMMM d",ms:"mm:ss","y":"y",yM:"M/y",yMd:"M/d/y",yMEd:"E, M/d/y",yMMM:"MMM y",yMMMd:"MMM d, y",yMMMEd:"E, MMM d, y",yMMMM:"MMMM y",yQQQ:"QQQ y",yQQQQ:"QQQQ y"},dateFormats:{yMMMMEEEEd:"EEEE, MMMM d, y",yMMMMd:"MMMM d, y",yMMMd:"MMM d, y",yMd:"M/d/yy"},timeFormats:{hmmsszzzz:"h:mm:ss a zzzz",hmsz:"h:mm:ss a z",hms:"h:mm:ss a",hm:"h:mm a"}},calendars:{buddhist:{months:{narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],long:["January","February","March","April","May","June","July","August","September","October","November","December"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["BE"],short:["BE"],long:["BE"]},dayPeriods:{am:"AM",pm:"PM"}},chinese:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Mo1","Mo2","Mo3","Mo4","Mo5","Mo6","Mo7","Mo8","Mo9","Mo10","Mo11","Mo12"],long:["Month1","Month2","Month3","Month4","Month5","Month6","Month7","Month8","Month9","Month10","Month11","Month12"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},dayPeriods:{am:"AM",pm:"PM"}},coptic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13"],short:["Tout","Baba","Hator","Kiahk","Toba","Amshir","Baramhat","Baramouda","Bashans","Paona","Epep","Mesra","Nasie"],long:["Tout","Baba","Hator","Kiahk","Toba","Amshir","Baramhat","Baramouda","Bashans","Paona","Epep","Mesra","Nasie"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["ERA0","ERA1"],short:["ERA0","ERA1"],long:["ERA0","ERA1"]},dayPeriods:{am:"AM",pm:"PM"}},dangi:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Mo1","Mo2","Mo3","Mo4","Mo5","Mo6","Mo7","Mo8","Mo9","Mo10","Mo11","Mo12"],long:["Month1","Month2","Month3","Month4","Month5","Month6","Month7","Month8","Month9","Month10","Month11","Month12"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},dayPeriods:{am:"AM",pm:"PM"}},ethiopic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13"],short:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"],long:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["ERA0","ERA1"],short:["ERA0","ERA1"],long:["ERA0","ERA1"]},dayPeriods:{am:"AM",pm:"PM"}},ethioaa:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13"],short:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"],long:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["ERA0"],short:["ERA0"],long:["ERA0"]},dayPeriods:{am:"AM",pm:"PM"}},generic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],long:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["ERA0","ERA1"],short:["ERA0","ERA1"],long:["ERA0","ERA1"]},dayPeriods:{am:"AM",pm:"PM"}},gregory:{months:{narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],long:["January","February","March","April","May","June","July","August","September","October","November","December"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["B","A","BCE","CE"],short:["BC","AD","BCE","CE"],long:["Before Christ","Anno Domini","Before Common Era","Common Era"]},dayPeriods:{am:"AM",pm:"PM"}},hebrew:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13","7"],short:["Tishri","Heshvan","Kislev","Tevet","Shevat","Adar I","Adar","Nisan","Iyar","Sivan","Tamuz","Av","Elul","Adar II"],long:["Tishri","Heshvan","Kislev","Tevet","Shevat","Adar I","Adar","Nisan","Iyar","Sivan","Tamuz","Av","Elul","Adar II"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["AM"],short:["AM"],long:["AM"]},dayPeriods:{am:"AM",pm:"PM"}},indian:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Chaitra","Vaisakha","Jyaistha","Asadha","Sravana","Bhadra","Asvina","Kartika","Agrahayana","Pausa","Magha","Phalguna"],long:["Chaitra","Vaisakha","Jyaistha","Asadha","Sravana","Bhadra","Asvina","Kartika","Agrahayana","Pausa","Magha","Phalguna"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["Saka"],short:["Saka"],long:["Saka"]},dayPeriods:{am:"AM",pm:"PM"}},islamic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Muh.","Saf.","Rab. I","Rab. II","Jum. I","Jum. II","Raj.","Sha.","Ram.","Shaw.","Dhuʻl-Q.","Dhuʻl-H."],long:["Muharram","Safar","Rabiʻ I","Rabiʻ II","Jumada I","Jumada II","Rajab","Shaʻban","Ramadan","Shawwal","Dhuʻl-Qiʻdah","Dhuʻl-Hijjah"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["AH"],short:["AH"],long:["AH"]},dayPeriods:{am:"AM",pm:"PM"}},islamicc:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Muh.","Saf.","Rab. I","Rab. II","Jum. I","Jum. II","Raj.","Sha.","Ram.","Shaw.","Dhuʻl-Q.","Dhuʻl-H."],long:["Muharram","Safar","Rabiʻ I","Rabiʻ II","Jumada I","Jumada II","Rajab","Shaʻban","Ramadan","Shawwal","Dhuʻl-Qiʻdah","Dhuʻl-Hijjah"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["AH"],short:["AH"],long:["AH"]},dayPeriods:{am:"AM",pm:"PM"}},japanese:{months:{narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],long:["January","February","March","April","May","June","July","August","September","October","November","December"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["Taika (645–650)","Hakuchi (650–671)","Hakuhō (672–686)","Shuchō (686–701)","Taihō (701–704)","Keiun (704–708)","Wadō (708–715)","Reiki (715–717)","Yōrō (717–724)","Jinki (724–729)","Tenpyō (729–749)","Tenpyō-kampō (749-749)","Tenpyō-shōhō (749-757)","Tenpyō-hōji (757-765)","Tenpyō-jingo (765-767)","Jingo-keiun (767-770)","Hōki (770–780)","Ten-ō (781-782)","Enryaku (782–806)","Daidō (806–810)","Kōnin (810–824)","Tenchō (824–834)","Jōwa (834–848)","Kajō (848–851)","Ninju (851–854)","Saikō (854–857)","Ten-an (857-859)","Jōgan (859–877)","Gangyō (877–885)","Ninna (885–889)","Kanpyō (889–898)","Shōtai (898–901)","Engi (901–923)","Enchō (923–931)","Jōhei (931–938)","Tengyō (938–947)","Tenryaku (947–957)","Tentoku (957–961)","Ōwa (961–964)","Kōhō (964–968)","Anna (968–970)","Tenroku (970–973)","Ten’en (973–976)","Jōgen (976–978)","Tengen (978–983)","Eikan (983–985)","Kanna (985–987)","Eien (987–989)","Eiso (989–990)","Shōryaku (990–995)","Chōtoku (995–999)","Chōhō (999–1004)","Kankō (1004–1012)","Chōwa (1012–1017)","Kannin (1017–1021)","Jian (1021–1024)","Manju (1024–1028)","Chōgen (1028–1037)","Chōryaku (1037–1040)","Chōkyū (1040–1044)","Kantoku (1044–1046)","Eishō (1046–1053)","Tengi (1053–1058)","Kōhei (1058–1065)","Jiryaku (1065–1069)","Enkyū (1069–1074)","Shōho (1074–1077)","Shōryaku (1077–1081)","Eihō (1081–1084)","Ōtoku (1084–1087)","Kanji (1087–1094)","Kahō (1094–1096)","Eichō (1096–1097)","Jōtoku (1097–1099)","Kōwa (1099–1104)","Chōji (1104–1106)","Kashō (1106–1108)","Tennin (1108–1110)","Ten-ei (1110-1113)","Eikyū (1113–1118)","Gen’ei (1118–1120)","Hōan (1120–1124)","Tenji (1124–1126)","Daiji (1126–1131)","Tenshō (1131–1132)","Chōshō (1132–1135)","Hōen (1135–1141)","Eiji (1141–1142)","Kōji (1142–1144)","Ten’yō (1144–1145)","Kyūan (1145–1151)","Ninpei (1151–1154)","Kyūju (1154–1156)","Hōgen (1156–1159)","Heiji (1159–1160)","Eiryaku (1160–1161)","Ōho (1161–1163)","Chōkan (1163–1165)","Eiman (1165–1166)","Nin’an (1166–1169)","Kaō (1169–1171)","Shōan (1171–1175)","Angen (1175–1177)","Jishō (1177–1181)","Yōwa (1181–1182)","Juei (1182–1184)","Genryaku (1184–1185)","Bunji (1185–1190)","Kenkyū (1190–1199)","Shōji (1199–1201)","Kennin (1201–1204)","Genkyū (1204–1206)","Ken’ei (1206–1207)","Jōgen (1207–1211)","Kenryaku (1211–1213)","Kenpō (1213–1219)","Jōkyū (1219–1222)","Jōō (1222–1224)","Gennin (1224–1225)","Karoku (1225–1227)","Antei (1227–1229)","Kanki (1229–1232)","Jōei (1232–1233)","Tenpuku (1233–1234)","Bunryaku (1234–1235)","Katei (1235–1238)","Ryakunin (1238–1239)","En’ō (1239–1240)","Ninji (1240–1243)","Kangen (1243–1247)","Hōji (1247–1249)","Kenchō (1249–1256)","Kōgen (1256–1257)","Shōka (1257–1259)","Shōgen (1259–1260)","Bun’ō (1260–1261)","Kōchō (1261–1264)","Bun’ei (1264–1275)","Kenji (1275–1278)","Kōan (1278–1288)","Shōō (1288–1293)","Einin (1293–1299)","Shōan (1299–1302)","Kengen (1302–1303)","Kagen (1303–1306)","Tokuji (1306–1308)","Enkyō (1308–1311)","Ōchō (1311–1312)","Shōwa (1312–1317)","Bunpō (1317–1319)","Genō (1319–1321)","Genkō (1321–1324)","Shōchū (1324–1326)","Karyaku (1326–1329)","Gentoku (1329–1331)","Genkō (1331–1334)","Kenmu (1334–1336)","Engen (1336–1340)","Kōkoku (1340–1346)","Shōhei (1346–1370)","Kentoku (1370–1372)","Bunchū (1372–1375)","Tenju (1375–1379)","Kōryaku (1379–1381)","Kōwa (1381–1384)","Genchū (1384–1392)","Meitoku (1384–1387)","Kakei (1387–1389)","Kōō (1389–1390)","Meitoku (1390–1394)","Ōei (1394–1428)","Shōchō (1428–1429)","Eikyō (1429–1441)","Kakitsu (1441–1444)","Bun’an (1444–1449)","Hōtoku (1449–1452)","Kyōtoku (1452–1455)","Kōshō (1455–1457)","Chōroku (1457–1460)","Kanshō (1460–1466)","Bunshō (1466–1467)","Ōnin (1467–1469)","Bunmei (1469–1487)","Chōkyō (1487–1489)","Entoku (1489–1492)","Meiō (1492–1501)","Bunki (1501–1504)","Eishō (1504–1521)","Taiei (1521–1528)","Kyōroku (1528–1532)","Tenbun (1532–1555)","Kōji (1555–1558)","Eiroku (1558–1570)","Genki (1570–1573)","Tenshō (1573–1592)","Bunroku (1592–1596)","Keichō (1596–1615)","Genna (1615–1624)","Kan’ei (1624–1644)","Shōho (1644–1648)","Keian (1648–1652)","Jōō (1652–1655)","Meireki (1655–1658)","Manji (1658–1661)","Kanbun (1661–1673)","Enpō (1673–1681)","Tenna (1681–1684)","Jōkyō (1684–1688)","Genroku (1688–1704)","Hōei (1704–1711)","Shōtoku (1711–1716)","Kyōhō (1716–1736)","Genbun (1736–1741)","Kanpō (1741–1744)","Enkyō (1744–1748)","Kan’en (1748–1751)","Hōreki (1751–1764)","Meiwa (1764–1772)","An’ei (1772–1781)","Tenmei (1781–1789)","Kansei (1789–1801)","Kyōwa (1801–1804)","Bunka (1804–1818)","Bunsei (1818–1830)","Tenpō (1830–1844)","Kōka (1844–1848)","Kaei (1848–1854)","Ansei (1854–1860)","Man’en (1860–1861)","Bunkyū (1861–1864)","Genji (1864–1865)","Keiō (1865–1868)","M","T","S","H"],short:["Taika (645–650)","Hakuchi (650–671)","Hakuhō (672–686)","Shuchō (686–701)","Taihō (701–704)","Keiun (704–708)","Wadō (708–715)","Reiki (715–717)","Yōrō (717–724)","Jinki (724–729)","Tenpyō (729–749)","Tenpyō-kampō (749-749)","Tenpyō-shōhō (749-757)","Tenpyō-hōji (757-765)","Tenpyō-jingo (765-767)","Jingo-keiun (767-770)","Hōki (770–780)","Ten-ō (781-782)","Enryaku (782–806)","Daidō (806–810)","Kōnin (810–824)","Tenchō (824–834)","Jōwa (834–848)","Kajō (848–851)","Ninju (851–854)","Saikō (854–857)","Ten-an (857-859)","Jōgan (859–877)","Gangyō (877–885)","Ninna (885–889)","Kanpyō (889–898)","Shōtai (898–901)","Engi (901–923)","Enchō (923–931)","Jōhei (931–938)","Tengyō (938–947)","Tenryaku (947–957)","Tentoku (957–961)","Ōwa (961–964)","Kōhō (964–968)","Anna (968–970)","Tenroku (970–973)","Ten’en (973–976)","Jōgen (976–978)","Tengen (978–983)","Eikan (983–985)","Kanna (985–987)","Eien (987–989)","Eiso (989–990)","Shōryaku (990–995)","Chōtoku (995–999)","Chōhō (999–1004)","Kankō (1004–1012)","Chōwa (1012–1017)","Kannin (1017–1021)","Jian (1021–1024)","Manju (1024–1028)","Chōgen (1028–1037)","Chōryaku (1037–1040)","Chōkyū (1040–1044)","Kantoku (1044–1046)","Eishō (1046–1053)","Tengi (1053–1058)","Kōhei (1058–1065)","Jiryaku (1065–1069)","Enkyū (1069–1074)","Shōho (1074–1077)","Shōryaku (1077–1081)","Eihō (1081–1084)","Ōtoku (1084–1087)","Kanji (1087–1094)","Kahō (1094–1096)","Eichō (1096–1097)","Jōtoku (1097–1099)","Kōwa (1099–1104)","Chōji (1104–1106)","Kashō (1106–1108)","Tennin (1108–1110)","Ten-ei (1110-1113)","Eikyū (1113–1118)","Gen’ei (1118–1120)","Hōan (1120–1124)","Tenji (1124–1126)","Daiji (1126–1131)","Tenshō (1131–1132)","Chōshō (1132–1135)","Hōen (1135–1141)","Eiji (1141–1142)","Kōji (1142–1144)","Ten’yō (1144–1145)","Kyūan (1145–1151)","Ninpei (1151–1154)","Kyūju (1154–1156)","Hōgen (1156–1159)","Heiji (1159–1160)","Eiryaku (1160–1161)","Ōho (1161–1163)","Chōkan (1163–1165)","Eiman (1165–1166)","Nin’an (1166–1169)","Kaō (1169–1171)","Shōan (1171–1175)","Angen (1175–1177)","Jishō (1177–1181)","Yōwa (1181–1182)","Juei (1182–1184)","Genryaku (1184–1185)","Bunji (1185–1190)","Kenkyū (1190–1199)","Shōji (1199–1201)","Kennin (1201–1204)","Genkyū (1204–1206)","Ken’ei (1206–1207)","Jōgen (1207–1211)","Kenryaku (1211–1213)","Kenpō (1213–1219)","Jōkyū (1219–1222)","Jōō (1222–1224)","Gennin (1224–1225)","Karoku (1225–1227)","Antei (1227–1229)","Kanki (1229–1232)","Jōei (1232–1233)","Tenpuku (1233–1234)","Bunryaku (1234–1235)","Katei (1235–1238)","Ryakunin (1238–1239)","En’ō (1239–1240)","Ninji (1240–1243)","Kangen (1243–1247)","Hōji (1247–1249)","Kenchō (1249–1256)","Kōgen (1256–1257)","Shōka (1257–1259)","Shōgen (1259–1260)","Bun’ō (1260–1261)","Kōchō (1261–1264)","Bun’ei (1264–1275)","Kenji (1275–1278)","Kōan (1278–1288)","Shōō (1288–1293)","Einin (1293–1299)","Shōan (1299–1302)","Kengen (1302–1303)","Kagen (1303–1306)","Tokuji (1306–1308)","Enkyō (1308–1311)","Ōchō (1311–1312)","Shōwa (1312–1317)","Bunpō (1317–1319)","Genō (1319–1321)","Genkō (1321–1324)","Shōchū (1324–1326)","Karyaku (1326–1329)","Gentoku (1329–1331)","Genkō (1331–1334)","Kenmu (1334–1336)","Engen (1336–1340)","Kōkoku (1340–1346)","Shōhei (1346–1370)","Kentoku (1370–1372)","Bunchū (1372–1375)","Tenju (1375–1379)","Kōryaku (1379–1381)","Kōwa (1381–1384)","Genchū (1384–1392)","Meitoku (1384–1387)","Kakei (1387–1389)","Kōō (1389–1390)","Meitoku (1390–1394)","Ōei (1394–1428)","Shōchō (1428–1429)","Eikyō (1429–1441)","Kakitsu (1441–1444)","Bun’an (1444–1449)","Hōtoku (1449–1452)","Kyōtoku (1452–1455)","Kōshō (1455–1457)","Chōroku (1457–1460)","Kanshō (1460–1466)","Bunshō (1466–1467)","Ōnin (1467–1469)","Bunmei (1469–1487)","Chōkyō (1487–1489)","Entoku (1489–1492)","Meiō (1492–1501)","Bunki (1501–1504)","Eishō (1504–1521)","Taiei (1521–1528)","Kyōroku (1528–1532)","Tenbun (1532–1555)","Kōji (1555–1558)","Eiroku (1558–1570)","Genki (1570–1573)","Tenshō (1573–1592)","Bunroku (1592–1596)","Keichō (1596–1615)","Genna (1615–1624)","Kan’ei (1624–1644)","Shōho (1644–1648)","Keian (1648–1652)","Jōō (1652–1655)","Meireki (1655–1658)","Manji (1658–1661)","Kanbun (1661–1673)","Enpō (1673–1681)","Tenna (1681–1684)","Jōkyō (1684–1688)","Genroku (1688–1704)","Hōei (1704–1711)","Shōtoku (1711–1716)","Kyōhō (1716–1736)","Genbun (1736–1741)","Kanpō (1741–1744)","Enkyō (1744–1748)","Kan’en (1748–1751)","Hōreki (1751–1764)","Meiwa (1764–1772)","An’ei (1772–1781)","Tenmei (1781–1789)","Kansei (1789–1801)","Kyōwa (1801–1804)","Bunka (1804–1818)","Bunsei (1818–1830)","Tenpō (1830–1844)","Kōka (1844–1848)","Kaei (1848–1854)","Ansei (1854–1860)","Man’en (1860–1861)","Bunkyū (1861–1864)","Genji (1864–1865)","Keiō (1865–1868)","Meiji","Taishō","Shōwa","Heisei"],long:["Taika (645–650)","Hakuchi (650–671)","Hakuhō (672–686)","Shuchō (686–701)","Taihō (701–704)","Keiun (704–708)","Wadō (708–715)","Reiki (715–717)","Yōrō (717–724)","Jinki (724–729)","Tenpyō (729–749)","Tenpyō-kampō (749-749)","Tenpyō-shōhō (749-757)","Tenpyō-hōji (757-765)","Tenpyō-jingo (765-767)","Jingo-keiun (767-770)","Hōki (770–780)","Ten-ō (781-782)","Enryaku (782–806)","Daidō (806–810)","Kōnin (810–824)","Tenchō (824–834)","Jōwa (834–848)","Kajō (848–851)","Ninju (851–854)","Saikō (854–857)","Ten-an (857-859)","Jōgan (859–877)","Gangyō (877–885)","Ninna (885–889)","Kanpyō (889–898)","Shōtai (898–901)","Engi (901–923)","Enchō (923–931)","Jōhei (931–938)","Tengyō (938–947)","Tenryaku (947–957)","Tentoku (957–961)","Ōwa (961–964)","Kōhō (964–968)","Anna (968–970)","Tenroku (970–973)","Ten’en (973–976)","Jōgen (976–978)","Tengen (978–983)","Eikan (983–985)","Kanna (985–987)","Eien (987–989)","Eiso (989–990)","Shōryaku (990–995)","Chōtoku (995–999)","Chōhō (999–1004)","Kankō (1004–1012)","Chōwa (1012–1017)","Kannin (1017–1021)","Jian (1021–1024)","Manju (1024–1028)","Chōgen (1028–1037)","Chōryaku (1037–1040)","Chōkyū (1040–1044)","Kantoku (1044–1046)","Eishō (1046–1053)","Tengi (1053–1058)","Kōhei (1058–1065)","Jiryaku (1065–1069)","Enkyū (1069–1074)","Shōho (1074–1077)","Shōryaku (1077–1081)","Eihō (1081–1084)","Ōtoku (1084–1087)","Kanji (1087–1094)","Kahō (1094–1096)","Eichō (1096–1097)","Jōtoku (1097–1099)","Kōwa (1099–1104)","Chōji (1104–1106)","Kashō (1106–1108)","Tennin (1108–1110)","Ten-ei (1110-1113)","Eikyū (1113–1118)","Gen’ei (1118–1120)","Hōan (1120–1124)","Tenji (1124–1126)","Daiji (1126–1131)","Tenshō (1131–1132)","Chōshō (1132–1135)","Hōen (1135–1141)","Eiji (1141–1142)","Kōji (1142–1144)","Ten’yō (1144–1145)","Kyūan (1145–1151)","Ninpei (1151–1154)","Kyūju (1154–1156)","Hōgen (1156–1159)","Heiji (1159–1160)","Eiryaku (1160–1161)","Ōho (1161–1163)","Chōkan (1163–1165)","Eiman (1165–1166)","Nin’an (1166–1169)","Kaō (1169–1171)","Shōan (1171–1175)","Angen (1175–1177)","Jishō (1177–1181)","Yōwa (1181–1182)","Juei (1182–1184)","Genryaku (1184–1185)","Bunji (1185–1190)","Kenkyū (1190–1199)","Shōji (1199–1201)","Kennin (1201–1204)","Genkyū (1204–1206)","Ken’ei (1206–1207)","Jōgen (1207–1211)","Kenryaku (1211–1213)","Kenpō (1213–1219)","Jōkyū (1219–1222)","Jōō (1222–1224)","Gennin (1224–1225)","Karoku (1225–1227)","Antei (1227–1229)","Kanki (1229–1232)","Jōei (1232–1233)","Tenpuku (1233–1234)","Bunryaku (1234–1235)","Katei (1235–1238)","Ryakunin (1238–1239)","En’ō (1239–1240)","Ninji (1240–1243)","Kangen (1243–1247)","Hōji (1247–1249)","Kenchō (1249–1256)","Kōgen (1256–1257)","Shōka (1257–1259)","Shōgen (1259–1260)","Bun’ō (1260–1261)","Kōchō (1261–1264)","Bun’ei (1264–1275)","Kenji (1275–1278)","Kōan (1278–1288)","Shōō (1288–1293)","Einin (1293–1299)","Shōan (1299–1302)","Kengen (1302–1303)","Kagen (1303–1306)","Tokuji (1306–1308)","Enkyō (1308–1311)","Ōchō (1311–1312)","Shōwa (1312–1317)","Bunpō (1317–1319)","Genō (1319–1321)","Genkō (1321–1324)","Shōchū (1324–1326)","Karyaku (1326–1329)","Gentoku (1329–1331)","Genkō (1331–1334)","Kenmu (1334–1336)","Engen (1336–1340)","Kōkoku (1340–1346)","Shōhei (1346–1370)","Kentoku (1370–1372)","Bunchū (1372–1375)","Tenju (1375–1379)","Kōryaku (1379–1381)","Kōwa (1381–1384)","Genchū (1384–1392)","Meitoku (1384–1387)","Kakei (1387–1389)","Kōō (1389–1390)","Meitoku (1390–1394)","Ōei (1394–1428)","Shōchō (1428–1429)","Eikyō (1429–1441)","Kakitsu (1441–1444)","Bun’an (1444–1449)","Hōtoku (1449–1452)","Kyōtoku (1452–1455)","Kōshō (1455–1457)","Chōroku (1457–1460)","Kanshō (1460–1466)","Bunshō (1466–1467)","Ōnin (1467–1469)","Bunmei (1469–1487)","Chōkyō (1487–1489)","Entoku (1489–1492)","Meiō (1492–1501)","Bunki (1501–1504)","Eishō (1504–1521)","Taiei (1521–1528)","Kyōroku (1528–1532)","Tenbun (1532–1555)","Kōji (1555–1558)","Eiroku (1558–1570)","Genki (1570–1573)","Tenshō (1573–1592)","Bunroku (1592–1596)","Keichō (1596–1615)","Genna (1615–1624)","Kan’ei (1624–1644)","Shōho (1644–1648)","Keian (1648–1652)","Jōō (1652–1655)","Meireki (1655–1658)","Manji (1658–1661)","Kanbun (1661–1673)","Enpō (1673–1681)","Tenna (1681–1684)","Jōkyō (1684–1688)","Genroku (1688–1704)","Hōei (1704–1711)","Shōtoku (1711–1716)","Kyōhō (1716–1736)","Genbun (1736–1741)","Kanpō (1741–1744)","Enkyō (1744–1748)","Kan’en (1748–1751)","Hōreki (1751–1764)","Meiwa (1764–1772)","An’ei (1772–1781)","Tenmei (1781–1789)","Kansei (1789–1801)","Kyōwa (1801–1804)","Bunka (1804–1818)","Bunsei (1818–1830)","Tenpō (1830–1844)","Kōka (1844–1848)","Kaei (1848–1854)","Ansei (1854–1860)","Man’en (1860–1861)","Bunkyū (1861–1864)","Genji (1864–1865)","Keiō (1865–1868)","Meiji","Taishō","Shōwa","Heisei"]},dayPeriods:{am:"AM",pm:"PM"}},persian:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Farvardin","Ordibehesht","Khordad","Tir","Mordad","Shahrivar","Mehr","Aban","Azar","Dey","Bahman","Esfand"],long:["Farvardin","Ordibehesht","Khordad","Tir","Mordad","Shahrivar","Mehr","Aban","Azar","Dey","Bahman","Esfand"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["AP"],short:["AP"],long:["AP"]},dayPeriods:{am:"AM",pm:"PM"}},roc:{months:{narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],long:["January","February","March","April","May","June","July","August","September","October","November","December"]},days:{narrow:["S","M","T","W","T","F","S"],short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],long:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},eras:{narrow:["Before R.O.C.","Minguo"],short:["Before R.O.C.","Minguo"],long:["Before R.O.C.","Minguo"]},dayPeriods:{am:"AM",pm:"PM"}}}},number:{nu:["latn"],patterns:{decimal:{positivePattern:"{number}",negativePattern:"{minusSign}{number}"},currency:{positivePattern:"{currency}{number}",negativePattern:"{minusSign}{currency}{number}"},percent:{positivePattern:"{number}{percentSign}",negativePattern:"{minusSign}{number}{percentSign}"}},symbols:{latn:{decimal:".",group:",",nan:"NaN",plusSign:"+",minusSign:"-",percentSign:"%",infinity:"∞"}},currencies:{AUD:"A$",BRL:"R$",CAD:"CA$",CNY:"CN¥",EUR:"€",GBP:"£",HKD:"HK$",ILS:"₪",INR:"₹",JPY:"¥",KRW:"₩",MXN:"MX$",NZD:"NZ$",TWD:"NT$",USD:"$",VND:"₫",XAF:"FCFA",XCD:"EC$",XOF:"CFA",XPF:"CFPF"}}});
},{}],33:[function(require,module,exports){
IntlPolyfill.__addLocaleData({locale:"es",date:{ca:["gregory","buddhist","chinese","coptic","dangi","ethioaa","ethiopic","generic","hebrew","indian","islamic","islamicc","japanese","persian","roc"],hourNo0:true,hour12:false,formats:{short:"{1} {0}",medium:"{1} {0}",full:"{1}, {0}",long:"{1}, {0}",availableFormats:{"d":"d","E":"ccc",Ed:"E d",Ehm:"E, h:mm a",EHm:"E, H:mm",Ehms:"E, h:mm:ss a",EHms:"E, H:mm:ss",Gy:"y G",GyMMM:"MMM y G",GyMMMd:"d MMM y G",GyMMMEd:"E, d MMM y G",GyMMMM:"MMMM 'de' y G",GyMMMMd:"d 'de' MMMM 'de' y G",GyMMMMEd:"E, d 'de' MMMM 'de' y G","h":"h a","H":"H",hm:"h:mm a",Hm:"H:mm",hms:"h:mm:ss a",Hms:"H:mm:ss",hmsv:"h:mm:ss a v",Hmsv:"H:mm:ss v",hmsvvvv:"h:mm:ss a (vvvv)",Hmsvvvv:"H:mm:ss (vvvv)",hmv:"h:mm a v",Hmv:"H:mm v","M":"L",Md:"d/M",MEd:"E, d/M",MMd:"d/M",MMdd:"d/M",MMM:"LLL",MMMd:"d MMM",MMMEd:"E, d MMM",MMMMd:"d 'de' MMMM",MMMMEd:"E, d 'de' MMMM",ms:"mm:ss","y":"y",yM:"M/y",yMd:"d/M/y",yMEd:"EEE, d/M/y",yMM:"M/y",yMMM:"MMM y",yMMMd:"d MMM y",yMMMEd:"EEE, d MMM y",yMMMM:"MMMM 'de' y",yMMMMd:"d 'de' MMMM 'de' y",yMMMMEd:"EEE, d 'de' MMMM 'de' y",yQQQ:"QQQ y",yQQQQ:"QQQQ 'de' y"},dateFormats:{yMMMMEEEEd:"EEEE, d 'de' MMMM 'de' y",yMMMMd:"d 'de' MMMM 'de' y",yMMMd:"d MMM y",yMd:"d/M/yy"},timeFormats:{hmmsszzzz:"H:mm:ss (zzzz)",hmsz:"H:mm:ss z",hms:"H:mm:ss",hm:"H:mm"}},calendars:{buddhist:{months:{narrow:["E","F","M","A","M","J","J","A","S","O","N","D"],short:["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sept.","oct.","nov.","dic."],long:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["BE"],short:["BE"],long:["BE"]},dayPeriods:{am:"a. m.",pm:"p. m."}},chinese:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],long:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},dayPeriods:{am:"a. m.",pm:"p. m."}},coptic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13"],short:["Tout","Baba","Hator","Kiahk","Toba","Amshir","Baramhat","Baramouda","Bashans","Paona","Epep","Mesra","Nasie"],long:["Tout","Baba","Hator","Kiahk","Toba","Amshir","Baramhat","Baramouda","Bashans","Paona","Epep","Mesra","Nasie"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["ERA0","ERA1"],short:["ERA0","ERA1"],long:["ERA0","ERA1"]},dayPeriods:{am:"a. m.",pm:"p. m."}},dangi:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],long:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},dayPeriods:{am:"a. m.",pm:"p. m."}},ethiopic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13"],short:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"],long:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["ERA0","ERA1"],short:["ERA0","ERA1"],long:["ERA0","ERA1"]},dayPeriods:{am:"a. m.",pm:"p. m."}},ethioaa:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13"],short:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"],long:["Meskerem","Tekemt","Hedar","Tahsas","Ter","Yekatit","Megabit","Miazia","Genbot","Sene","Hamle","Nehasse","Pagumen"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["ERA0"],short:["ERA0"],long:["ERA0"]},dayPeriods:{am:"a. m.",pm:"p. m."}},generic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],long:["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["ERA0","ERA1"],short:["ERA0","ERA1"],long:["ERA0","ERA1"]},dayPeriods:{am:"a. m.",pm:"p. m."}},gregory:{months:{narrow:["E","F","M","A","M","J","J","A","S","O","N","D"],short:["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sept.","oct.","nov.","dic."],long:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["a. C.","d. C.","a. e. c.","e. c."],short:["a. C.","d. C.","a. e. c.","e. c."],long:["antes de Cristo","después de Cristo","antes de la era común","era común"]},dayPeriods:{am:"a. m.",pm:"p. m."}},hebrew:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12","13","7"],short:["Tishri","Heshvan","Kislev","Tevet","Shevat","Adar I","Adar","Nisan","Iyar","Sivan","Tamuz","Av","Elul","Adar II"],long:["Tishri","Heshvan","Kislev","Tevet","Shevat","Adar I","Adar","Nisan","Iyar","Sivan","Tamuz","Av","Elul","Adar II"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["AM"],short:["AM"],long:["AM"]},dayPeriods:{am:"a. m.",pm:"p. m."}},indian:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Chaitra","Vaisakha","Jyaistha","Asadha","Sravana","Bhadra","Asvina","Kartika","Agrahayana","Pausa","Magha","Phalguna"],long:["Chaitra","Vaisakha","Jyaistha","Asadha","Sravana","Bhadra","Asvina","Kartika","Agrahayana","Pausa","Magha","Phalguna"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["Saka"],short:["Saka"],long:["Saka"]},dayPeriods:{am:"a. m.",pm:"p. m."}},islamic:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Muh.","Saf.","Rab. I","Rab. II","Jum. I","Jum. II","Raj.","Sha.","Ram.","Shaw.","Dhuʻl-Q.","Dhuʻl-H."],long:["Muharram","Safar","Rabiʻ I","Rabiʻ II","Jumada I","Jumada II","Rajab","Shaʻban","Ramadan","Shawwal","Dhuʻl-Qiʻdah","Dhuʻl-Hijjah"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["AH"],short:["AH"],long:["AH"]},dayPeriods:{am:"a. m.",pm:"p. m."}},islamicc:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Muh.","Saf.","Rab. I","Rab. II","Jum. I","Jum. II","Raj.","Sha.","Ram.","Shaw.","Dhuʻl-Q.","Dhuʻl-H."],long:["Muharram","Safar","Rabiʻ I","Rabiʻ II","Jumada I","Jumada II","Rajab","Shaʻban","Ramadan","Shawwal","Dhuʻl-Qiʻdah","Dhuʻl-Hijjah"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["AH"],short:["AH"],long:["AH"]},dayPeriods:{am:"a. m.",pm:"p. m."}},japanese:{months:{narrow:["E","F","M","A","M","J","J","A","S","O","N","D"],short:["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sept.","oct.","nov.","dic."],long:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["Taika (645–650)","Hakuchi (650–671)","Hakuhō (672–686)","Shuchō (686–701)","Taihō (701–704)","Keiun (704–708)","Wadō (708–715)","Reiki (715–717)","Yōrō (717–724)","Jinki (724–729)","Tenpyō (729–749)","Tenpyō-kampō (749-749)","Tenpyō-shōhō (749-757)","Tenpyō-hōji (757-765)","Tenpyō-jingo (765-767)","Jingo-keiun (767-770)","Hōki (770–780)","Ten-ō (781-782)","Enryaku (782–806)","Daidō (806–810)","Kōnin (810–824)","Tenchō (824–834)","Jōwa (834–848)","Kajō (848–851)","Ninju (851–854)","Saikō (854–857)","Ten-an (857-859)","Jōgan (859–877)","Gangyō (877–885)","Ninna (885–889)","Kanpyō (889–898)","Shōtai (898–901)","Engi (901–923)","Enchō (923–931)","Jōhei (931–938)","Tengyō (938–947)","Tenryaku (947–957)","Tentoku (957–961)","Ōwa (961–964)","Kōhō (964–968)","Anna (968–970)","Tenroku (970–973)","Ten’en (973–976)","Jōgen (976–978)","Tengen (978–983)","Eikan (983–985)","Kanna (985–987)","Eien (987–989)","Eiso (989–990)","Shōryaku (990–995)","Chōtoku (995–999)","Chōhō (999–1004)","Kankō (1004–1012)","Chōwa (1012–1017)","Kannin (1017–1021)","Jian (1021–1024)","Manju (1024–1028)","Chōgen (1028–1037)","Chōryaku (1037–1040)","Chōkyū (1040–1044)","Kantoku (1044–1046)","Eishō (1046–1053)","Tengi (1053–1058)","Kōhei (1058–1065)","Jiryaku (1065–1069)","Enkyū (1069–1074)","Shōho (1074–1077)","Shōryaku (1077–1081)","Eihō (1081–1084)","Ōtoku (1084–1087)","Kanji (1087–1094)","Kahō (1094–1096)","Eichō (1096–1097)","Jōtoku (1097–1099)","Kōwa (1099–1104)","Chōji (1104–1106)","Kashō (1106–1108)","Tennin (1108–1110)","Ten-ei (1110-1113)","Eikyū (1113–1118)","Gen’ei (1118–1120)","Hōan (1120–1124)","Tenji (1124–1126)","Daiji (1126–1131)","Tenshō (1131–1132)","Chōshō (1132–1135)","Hōen (1135–1141)","Eiji (1141–1142)","Kōji (1142–1144)","Ten’yō (1144–1145)","Kyūan (1145–1151)","Ninpei (1151–1154)","Kyūju (1154–1156)","Hōgen (1156–1159)","Heiji (1159–1160)","Eiryaku (1160–1161)","Ōho (1161–1163)","Chōkan (1163–1165)","Eiman (1165–1166)","Nin’an (1166–1169)","Kaō (1169–1171)","Shōan (1171–1175)","Angen (1175–1177)","Jishō (1177–1181)","Yōwa (1181–1182)","Juei (1182–1184)","Genryaku (1184–1185)","Bunji (1185–1190)","Kenkyū (1190–1199)","Shōji (1199–1201)","Kennin (1201–1204)","Genkyū (1204–1206)","Ken’ei (1206–1207)","Jōgen (1207–1211)","Kenryaku (1211–1213)","Kenpō (1213–1219)","Jōkyū (1219–1222)","Jōō (1222–1224)","Gennin (1224–1225)","Karoku (1225–1227)","Antei (1227–1229)","Kanki (1229–1232)","Jōei (1232–1233)","Tenpuku (1233–1234)","Bunryaku (1234–1235)","Katei (1235–1238)","Ryakunin (1238–1239)","En’ō (1239–1240)","Ninji (1240–1243)","Kangen (1243–1247)","Hōji (1247–1249)","Kenchō (1249–1256)","Kōgen (1256–1257)","Shōka (1257–1259)","Shōgen (1259–1260)","Bun’ō (1260–1261)","Kōchō (1261–1264)","Bun’ei (1264–1275)","Kenji (1275–1278)","Kōan (1278–1288)","Shōō (1288–1293)","Einin (1293–1299)","Shōan (1299–1302)","Kengen (1302–1303)","Kagen (1303–1306)","Tokuji (1306–1308)","Enkyō (1308–1311)","Ōchō (1311–1312)","Shōwa (1312–1317)","Bunpō (1317–1319)","Genō (1319–1321)","Genkō (1321–1324)","Shōchū (1324–1326)","Karyaku (1326–1329)","Gentoku (1329–1331)","Genkō (1331–1334)","Kenmu (1334–1336)","Engen (1336–1340)","Kōkoku (1340–1346)","Shōhei (1346–1370)","Kentoku (1370–1372)","Bunchū (1372–1375)","Tenju (1375–1379)","Kōryaku (1379–1381)","Kōwa (1381–1384)","Genchū (1384–1392)","Meitoku (1384–1387)","Kakei (1387–1389)","Kōō (1389–1390)","Meitoku (1390–1394)","Ōei (1394–1428)","Shōchō (1428–1429)","Eikyō (1429–1441)","Kakitsu (1441–1444)","Bun’an (1444–1449)","Hōtoku (1449–1452)","Kyōtoku (1452–1455)","Kōshō (1455–1457)","Chōroku (1457–1460)","Kanshō (1460–1466)","Bunshō (1466–1467)","Ōnin (1467–1469)","Bunmei (1469–1487)","Chōkyō (1487–1489)","Entoku (1489–1492)","Meiō (1492–1501)","Bunki (1501–1504)","Eishō (1504–1521)","Taiei (1521–1528)","Kyōroku (1528–1532)","Tenbun (1532–1555)","Kōji (1555–1558)","Eiroku (1558–1570)","Genki (1570–1573)","Tenshō (1573–1592)","Bunroku (1592–1596)","Keichō (1596–1615)","Genna (1615–1624)","Kan’ei (1624–1644)","Shōho (1644–1648)","Keian (1648–1652)","Jōō (1652–1655)","Meireki (1655–1658)","Manji (1658–1661)","Kanbun (1661–1673)","Enpō (1673–1681)","Tenna (1681–1684)","Jōkyō (1684–1688)","Genroku (1688–1704)","Hōei (1704–1711)","Shōtoku (1711–1716)","Kyōhō (1716–1736)","Genbun (1736–1741)","Kanpō (1741–1744)","Enkyō (1744–1748)","Kan’en (1748–1751)","Hōreki (1751–1764)","Meiwa (1764–1772)","An’ei (1772–1781)","Tenmei (1781–1789)","Kansei (1789–1801)","Kyōwa (1801–1804)","Bunka (1804–1818)","Bunsei (1818–1830)","Tenpō (1830–1844)","Kōka (1844–1848)","Kaei (1848–1854)","Ansei (1854–1860)","Man’en (1860–1861)","Bunkyū (1861–1864)","Genji (1864–1865)","Keiō (1865–1868)","M","T","S","H"],short:["Taika (645–650)","Hakuchi (650–671)","Hakuhō (672–686)","Shuchō (686–701)","Taihō (701–704)","Keiun (704–708)","Wadō (708–715)","Reiki (715–717)","Yōrō (717–724)","Jinki (724–729)","Tenpyō (729–749)","Tenpyō-kampō (749-749)","Tenpyō-shōhō (749-757)","Tenpyō-hōji (757-765)","Tenpyō-jingo (765-767)","Jingo-keiun (767-770)","Hōki (770–780)","Ten-ō (781-782)","Enryaku (782–806)","Daidō (806–810)","Kōnin (810–824)","Tenchō (824–834)","Jōwa (834–848)","Kajō (848–851)","Ninju (851–854)","Saikō (854–857)","Ten-an (857-859)","Jōgan (859–877)","Gangyō (877–885)","Ninna (885–889)","Kanpyō (889–898)","Shōtai (898–901)","Engi (901–923)","Enchō (923–931)","Jōhei (931–938)","Tengyō (938–947)","Tenryaku (947–957)","Tentoku (957–961)","Ōwa (961–964)","Kōhō (964–968)","Anna (968–970)","Tenroku (970–973)","Ten’en (973–976)","Jōgen (976–978)","Tengen (978–983)","Eikan (983–985)","Kanna (985–987)","Eien (987–989)","Eiso (989–990)","Shōryaku (990–995)","Chōtoku (995–999)","Chōhō (999–1004)","Kankō (1004–1012)","Chōwa (1012–1017)","Kannin (1017–1021)","Jian (1021–1024)","Manju (1024–1028)","Chōgen (1028–1037)","Chōryaku (1037–1040)","Chōkyū (1040–1044)","Kantoku (1044–1046)","Eishō (1046–1053)","Tengi (1053–1058)","Kōhei (1058–1065)","Jiryaku (1065–1069)","Enkyū (1069–1074)","Shōho (1074–1077)","Shōryaku (1077–1081)","Eihō (1081–1084)","Ōtoku (1084–1087)","Kanji (1087–1094)","Kahō (1094–1096)","Eichō (1096–1097)","Jōtoku (1097–1099)","Kōwa (1099–1104)","Chōji (1104–1106)","Kashō (1106–1108)","Tennin (1108–1110)","Ten-ei (1110-1113)","Eikyū (1113–1118)","Gen’ei (1118–1120)","Hōan (1120–1124)","Tenji (1124–1126)","Daiji (1126–1131)","Tenshō (1131–1132)","Chōshō (1132–1135)","Hōen (1135–1141)","Eiji (1141–1142)","Kōji (1142–1144)","Ten’yō (1144–1145)","Kyūan (1145–1151)","Ninpei (1151–1154)","Kyūju (1154–1156)","Hōgen (1156–1159)","Heiji (1159–1160)","Eiryaku (1160–1161)","Ōho (1161–1163)","Chōkan (1163–1165)","Eiman (1165–1166)","Nin’an (1166–1169)","Kaō (1169–1171)","Shōan (1171–1175)","Angen (1175–1177)","Jishō (1177–1181)","Yōwa (1181–1182)","Juei (1182–1184)","Genryaku (1184–1185)","Bunji (1185–1190)","Kenkyū (1190–1199)","Shōji (1199–1201)","Kennin (1201–1204)","Genkyū (1204–1206)","Ken’ei (1206–1207)","Jōgen (1207–1211)","Kenryaku (1211–1213)","Kenpō (1213–1219)","Jōkyū (1219–1222)","Jōō (1222–1224)","Gennin (1224–1225)","Karoku (1225–1227)","Antei (1227–1229)","Kanki (1229–1232)","Jōei (1232–1233)","Tenpuku (1233–1234)","Bunryaku (1234–1235)","Katei (1235–1238)","Ryakunin (1238–1239)","En’ō (1239–1240)","Ninji (1240–1243)","Kangen (1243–1247)","Hōji (1247–1249)","Kenchō (1249–1256)","Kōgen (1256–1257)","Shōka (1257–1259)","Shōgen (1259–1260)","Bun’ō (1260–1261)","Kōchō (1261–1264)","Bun’ei (1264–1275)","Kenji (1275–1278)","Kōan (1278–1288)","Shōō (1288–1293)","Einin (1293–1299)","Shōan (1299–1302)","Kengen (1302–1303)","Kagen (1303–1306)","Tokuji (1306–1308)","Enkyō (1308–1311)","Ōchō (1311–1312)","Shōwa (1312–1317)","Bunpō (1317–1319)","Genō (1319–1321)","Genkō (1321–1324)","Shōchū (1324–1326)","Karyaku (1326–1329)","Gentoku (1329–1331)","Genkō (1331–1334)","Kenmu (1334–1336)","Engen (1336–1340)","Kōkoku (1340–1346)","Shōhei (1346–1370)","Kentoku (1370–1372)","Bunchū (1372–1375)","Tenju (1375–1379)","Kōryaku (1379–1381)","Kōwa (1381–1384)","Genchū (1384–1392)","Meitoku (1384–1387)","Kakei (1387–1389)","Kōō (1389–1390)","Meitoku (1390–1394)","Ōei (1394–1428)","Shōchō (1428–1429)","Eikyō (1429–1441)","Kakitsu (1441–1444)","Bun’an (1444–1449)","Hōtoku (1449–1452)","Kyōtoku (1452–1455)","Kōshō (1455–1457)","Chōroku (1457–1460)","Kanshō (1460–1466)","Bunshō (1466–1467)","Ōnin (1467–1469)","Bunmei (1469–1487)","Chōkyō (1487–1489)","Entoku (1489–1492)","Meiō (1492–1501)","Bunki (1501–1504)","Eishō (1504–1521)","Taiei (1521–1528)","Kyōroku (1528–1532)","Tenbun (1532–1555)","Kōji (1555–1558)","Eiroku (1558–1570)","Genki (1570–1573)","Tenshō (1573–1592)","Bunroku (1592–1596)","Keichō (1596–1615)","Genna (1615–1624)","Kan’ei (1624–1644)","Shōho (1644–1648)","Keian (1648–1652)","Jōō (1652–1655)","Meireki (1655–1658)","Manji (1658–1661)","Kanbun (1661–1673)","Enpō (1673–1681)","Tenna (1681–1684)","Jōkyō (1684–1688)","Genroku (1688–1704)","Hōei (1704–1711)","Shōtoku (1711–1716)","Kyōhō (1716–1736)","Genbun (1736–1741)","Kanpō (1741–1744)","Enkyō (1744–1748)","Kan’en (1748–1751)","Hōreki (1751–1764)","Meiwa (1764–1772)","An’ei (1772–1781)","Tenmei (1781–1789)","Kansei (1789–1801)","Kyōwa (1801–1804)","Bunka (1804–1818)","Bunsei (1818–1830)","Tenpō (1830–1844)","Kōka (1844–1848)","Kaei (1848–1854)","Ansei (1854–1860)","Man’en (1860–1861)","Bunkyū (1861–1864)","Genji (1864–1865)","Keiō (1865–1868)","Meiji","Taishō","Shōwa","Heisei"],long:["Taika (645–650)","Hakuchi (650–671)","Hakuhō (672–686)","Shuchō (686–701)","Taihō (701–704)","Keiun (704–708)","Wadō (708–715)","Reiki (715–717)","Yōrō (717–724)","Jinki (724–729)","Tenpyō (729–749)","Tenpyō-kampō (749-749)","Tenpyō-shōhō (749-757)","Tenpyō-hōji (757-765)","Tenpyō-jingo (765-767)","Jingo-keiun (767-770)","Hōki (770–780)","Ten-ō (781-782)","Enryaku (782–806)","Daidō (806–810)","Kōnin (810–824)","Tenchō (824–834)","Jōwa (834–848)","Kajō (848–851)","Ninju (851–854)","Saikō (854–857)","Ten-an (857-859)","Jōgan (859–877)","Gangyō (877–885)","Ninna (885–889)","Kanpyō (889–898)","Shōtai (898–901)","Engi (901–923)","Enchō (923–931)","Jōhei (931–938)","Tengyō (938–947)","Tenryaku (947–957)","Tentoku (957–961)","Ōwa (961–964)","Kōhō (964–968)","Anna (968–970)","Tenroku (970–973)","Ten’en (973–976)","Jōgen (976–978)","Tengen (978–983)","Eikan (983–985)","Kanna (985–987)","Eien (987–989)","Eiso (989–990)","Shōryaku (990–995)","Chōtoku (995–999)","Chōhō (999–1004)","Kankō (1004–1012)","Chōwa (1012–1017)","Kannin (1017–1021)","Jian (1021–1024)","Manju (1024–1028)","Chōgen (1028–1037)","Chōryaku (1037–1040)","Chōkyū (1040–1044)","Kantoku (1044–1046)","Eishō (1046–1053)","Tengi (1053–1058)","Kōhei (1058–1065)","Jiryaku (1065–1069)","Enkyū (1069–1074)","Shōho (1074–1077)","Shōryaku (1077–1081)","Eihō (1081–1084)","Ōtoku (1084–1087)","Kanji (1087–1094)","Kahō (1094–1096)","Eichō (1096–1097)","Jōtoku (1097–1099)","Kōwa (1099–1104)","Chōji (1104–1106)","Kashō (1106–1108)","Tennin (1108–1110)","Ten-ei (1110-1113)","Eikyū (1113–1118)","Gen’ei (1118–1120)","Hōan (1120–1124)","Tenji (1124–1126)","Daiji (1126–1131)","Tenshō (1131–1132)","Chōshō (1132–1135)","Hōen (1135–1141)","Eiji (1141–1142)","Kōji (1142–1144)","Ten’yō (1144–1145)","Kyūan (1145–1151)","Ninpei (1151–1154)","Kyūju (1154–1156)","Hōgen (1156–1159)","Heiji (1159–1160)","Eiryaku (1160–1161)","Ōho (1161–1163)","Chōkan (1163–1165)","Eiman (1165–1166)","Nin’an (1166–1169)","Kaō (1169–1171)","Shōan (1171–1175)","Angen (1175–1177)","Jishō (1177–1181)","Yōwa (1181–1182)","Juei (1182–1184)","Genryaku (1184–1185)","Bunji (1185–1190)","Kenkyū (1190–1199)","Shōji (1199–1201)","Kennin (1201–1204)","Genkyū (1204–1206)","Ken’ei (1206–1207)","Jōgen (1207–1211)","Kenryaku (1211–1213)","Kenpō (1213–1219)","Jōkyū (1219–1222)","Jōō (1222–1224)","Gennin (1224–1225)","Karoku (1225–1227)","Antei (1227–1229)","Kanki (1229–1232)","Jōei (1232–1233)","Tenpuku (1233–1234)","Bunryaku (1234–1235)","Katei (1235–1238)","Ryakunin (1238–1239)","En’ō (1239–1240)","Ninji (1240–1243)","Kangen (1243–1247)","Hōji (1247–1249)","Kenchō (1249–1256)","Kōgen (1256–1257)","Shōka (1257–1259)","Shōgen (1259–1260)","Bun’ō (1260–1261)","Kōchō (1261–1264)","Bun’ei (1264–1275)","Kenji (1275–1278)","Kōan (1278–1288)","Shōō (1288–1293)","Einin (1293–1299)","Shōan (1299–1302)","Kengen (1302–1303)","Kagen (1303–1306)","Tokuji (1306–1308)","Enkyō (1308–1311)","Ōchō (1311–1312)","Shōwa (1312–1317)","Bunpō (1317–1319)","Genō (1319–1321)","Genkō (1321–1324)","Shōchū (1324–1326)","Karyaku (1326–1329)","Gentoku (1329–1331)","Genkō (1331–1334)","Kenmu (1334–1336)","Engen (1336–1340)","Kōkoku (1340–1346)","Shōhei (1346–1370)","Kentoku (1370–1372)","Bunchū (1372–1375)","Tenju (1375–1379)","Kōryaku (1379–1381)","Kōwa (1381–1384)","Genchū (1384–1392)","Meitoku (1384–1387)","Kakei (1387–1389)","Kōō (1389–1390)","Meitoku (1390–1394)","Ōei (1394–1428)","Shōchō (1428–1429)","Eikyō (1429–1441)","Kakitsu (1441–1444)","Bun’an (1444–1449)","Hōtoku (1449–1452)","Kyōtoku (1452–1455)","Kōshō (1455–1457)","Chōroku (1457–1460)","Kanshō (1460–1466)","Bunshō (1466–1467)","Ōnin (1467–1469)","Bunmei (1469–1487)","Chōkyō (1487–1489)","Entoku (1489–1492)","Meiō (1492–1501)","Bunki (1501–1504)","Eishō (1504–1521)","Taiei (1521–1528)","Kyōroku (1528–1532)","Tenbun (1532–1555)","Kōji (1555–1558)","Eiroku (1558–1570)","Genki (1570–1573)","Tenshō (1573–1592)","Bunroku (1592–1596)","Keichō (1596–1615)","Genna (1615–1624)","Kan’ei (1624–1644)","Shōho (1644–1648)","Keian (1648–1652)","Jōō (1652–1655)","Meireki (1655–1658)","Manji (1658–1661)","Kanbun (1661–1673)","Enpō (1673–1681)","Tenna (1681–1684)","Jōkyō (1684–1688)","Genroku (1688–1704)","Hōei (1704–1711)","Shōtoku (1711–1716)","Kyōhō (1716–1736)","Genbun (1736–1741)","Kanpō (1741–1744)","Enkyō (1744–1748)","Kan’en (1748–1751)","Hōreki (1751–1764)","Meiwa (1764–1772)","An’ei (1772–1781)","Tenmei (1781–1789)","Kansei (1789–1801)","Kyōwa (1801–1804)","Bunka (1804–1818)","Bunsei (1818–1830)","Tenpō (1830–1844)","Kōka (1844–1848)","Kaei (1848–1854)","Ansei (1854–1860)","Man’en (1860–1861)","Bunkyū (1861–1864)","Genji (1864–1865)","Keiō (1865–1868)","Meiji","Taishō","Shōwa","Heisei"]},dayPeriods:{am:"a. m.",pm:"p. m."}},persian:{months:{narrow:["1","2","3","4","5","6","7","8","9","10","11","12"],short:["Farvardin","Ordibehesht","Khordad","Tir","Mordad","Shahrivar","Mehr","Aban","Azar","Dey","Bahman","Esfand"],long:["Farvardin","Ordibehesht","Khordad","Tir","Mordad","Shahrivar","Mehr","Aban","Azar","Dey","Bahman","Esfand"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["AP"],short:["AP"],long:["AP"]},dayPeriods:{am:"a. m.",pm:"p. m."}},roc:{months:{narrow:["E","F","M","A","M","J","J","A","S","O","N","D"],short:["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sept.","oct.","nov.","dic."],long:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},days:{narrow:["D","L","M","X","J","V","S"],short:["dom.","lun.","mar.","mié.","jue.","vie.","sáb."],long:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},eras:{narrow:["antes de R.O.C.","R.O.C."],short:["antes de R.O.C.","R.O.C."],long:["antes de R.O.C.","R.O.C."]},dayPeriods:{am:"a. m.",pm:"p. m."}}}},number:{nu:["latn"],patterns:{decimal:{positivePattern:"{number}",negativePattern:"{minusSign}{number}"},currency:{positivePattern:"{number} {currency}",negativePattern:"{minusSign}{number} {currency}"},percent:{positivePattern:"{number} {percentSign}",negativePattern:"{minusSign}{number} {percentSign}"}},symbols:{latn:{decimal:",",group:".",nan:"NaN",plusSign:"+",minusSign:"-",percentSign:"%",infinity:"∞"}},currencies:{CAD:"CA$",ESP:"₧",EUR:"€",THB:"฿",USD:"$",VND:"₫",XPF:"CFPF"}}});
},{}],34:[function(require,module,exports){
(function (process){
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('path-to-regexp');

  /**
   * Module exports.
   */

  module.exports = page;

  /**
   * Detect click event
   */
  var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var location = ('undefined' !== typeof window) && (window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path));
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {string}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) {
      document.addEventListener(clickEvent, onclick, false);
    }
    if (true === options.hashbang) hashbang = true;
    if (!dispatch) return;
    var url = (hashbang && ~location.hash.indexOf('#!')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    document.removeEventListener(clickEvent, onclick, false);
    window.removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(base, state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */
  page.dispatch = function(ctx) {
    var prev = prevContext,
      i = 0,
      j = 0;

    prevContext = ctx;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = base + location.hash.replace('#!', '');
    } else {
      current = location.pathname + location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    location.href = ctx.canonicalPath;
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state) {
    if ('/' === path[0] && 0 !== path.indexOf(base)) path = base + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ('undefined' === typeof window) {
      return;
    }
    if (document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else {
        page.show(location.pathname + location.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  function onclick(e) {

    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;



    // ensure link
    // use shadow dom when available
    var el = e.path ? e.path[0] : e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;



    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;



    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (base && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return (href && (0 === href.indexOf(origin)));
  }

  page.sameOrigin = sameOrigin;

}).call(this,require('_process'))

},{"_process":2,"path-to-regexp":35}],35:[function(require,module,exports){
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var suffix = res[6]
    var asterisk = res[7]

    var repeat = suffix === '+' || suffix === '*'
    var optional = suffix === '?' || suffix === '*'
    var delimiter = prefix || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$')
    }
  }

  return function (obj) {
    var path = ''
    var data = obj || {}

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = encodeURIComponent(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.pattern

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = keys
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

},{"isarray":36}],36:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],37:[function(require,module,exports){

var orig = document.title;

exports = module.exports = set;

function set(str) {
  var i = 1;
  var args = arguments;
  document.title = str.replace(/%[os]/g, function(_){
    switch (_) {
      case '%o':
        return orig;
      case '%s':
        return args[i++];
    }
  });
}

exports.reset = function(){
  set(orig);
};

},{}],38:[function(require,module,exports){
var bel = require('bel') // turns template tag into DOM elements
var morphdom = require('morphdom') // efficiently diffs + morphs two DOM elements
var defaultEvents = require('./update-events.js') // default events to be copied when dom elements update

module.exports = bel

// TODO move this + defaultEvents to a new module once we receive more feedback
module.exports.update = function (fromNode, toNode, opts) {
  if (!opts) opts = {}
  if (opts.events !== false) {
    if (!opts.onBeforeMorphEl) opts.onBeforeMorphEl = copier
  }

  return morphdom(fromNode, toNode, opts)

  // morphdom only copies attributes. we decided we also wanted to copy events
  // that can be set via attributes
  function copier (f, t) {
    // copy events:
    var events = opts.events || defaultEvents
    for (var i = 0; i < events.length; i++) {
      var ev = events[i]
      if (t[ev]) { // if new element has a whitelisted attribute
        f[ev] = t[ev] // update existing element
      } else if (f[ev]) { // if existing element has it and new one doesnt
        f[ev] = undefined // remove it from existing element
      }
    }
    // copy values for form elements
    if ((f.nodeName === 'INPUT' && f.type !== 'file') || f.nodeName === 'TEXTAREA' || f.nodeName === 'SELECT') {
      if (t.getAttribute('value') === null) t.value = f.value
    }
  }
}

},{"./update-events.js":46,"bel":39,"morphdom":45}],39:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  willvalidate: 1
}
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function bel_onload () {
      load(el)
    }, function bel_onunload () {
      unload(el)
    })
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          el.setAttributeNS(null, p, val)
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement)
module.exports.createElement = belCreateElement

},{"global/document":40,"hyperx":42,"on-load":44}],40:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":1}],41:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],42:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12

module.exports = function (h, opts) {
  h = attrToProp(h)
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state)) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === TEXT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[\w-]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":43}],43:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],44:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  if (!watch[mutation.oldValue]) {
    return
  }
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  Object.keys(watch).forEach(function (k) {
    if (mutation.oldValue === k) {
      off(k, mutation.target)
    }
    if (newValue === k) {
      on(k, mutation.target)
    }
  })
}

function sameOrigin (oldValue, newValue) {
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":40,"global/window":41}],45:[function(require,module,exports){
// Create a range object for efficently rendering strings to elements.
var range;

var testEl = (typeof document !== 'undefined') ?
    document.body || document.createElement('div') :
    {};

var XHTML = 'http://www.w3.org/1999/xhtml';
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var hasAttributeNS;

if (testEl.hasAttributeNS) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    hasAttributeNS = function(el, namespaceURI, name) {
        return !!el.getAttributeNode(name);
    };
}

function empty(o) {
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
}

function toElement(str) {
    if (!range && document.createRange) {
        range = document.createRange();
        range.selectNode(document.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = document.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        fromEl.selected = toEl.selected;
        if (fromEl.selected) {
            fromEl.setAttribute('selected', '');
        } else {
            fromEl.removeAttribute('selected', '');
        }
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        fromEl.checked = toEl.checked;
        if (fromEl.checked) {
            fromEl.setAttribute('checked', '');
        } else {
            fromEl.removeAttribute('checked');
        }

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }

        fromEl.disabled = toEl.disabled;
        if (fromEl.disabled) {
            fromEl.setAttribute('disabled', '');
        } else {
            fromEl.removeAttribute('disabled');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            fromEl.firstChild.nodeValue = newValue;
        }
    }
};

function noop() {}

/**
 * Returns true if two node's names and namespace URIs are the same.
 *
 * @param {Element} a
 * @param {Element} b
 * @return {boolean}
 */
var compareNodeNames = function(a, b) {
    return a.nodeName === b.nodeName &&
           a.namespaceURI === b.namespaceURI;
};

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === XHTML ?
        document.createElement(name) :
        document.createElementNS(namespaceURI, name);
}

/**
 * Loop over all of the attributes on the target node and make sure the original
 * DOM node has the same attributes. If an attribute found on the original node
 * is not on the new node then remove it from the original node.
 *
 * @param  {Element} fromNode
 * @param  {Element} toNode
 */
function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    for (i = attrs.length - 1; i >= 0; i--) {
        attr = attrs[i];
        attrName = attr.name;
        attrValue = attr.value;
        attrNamespaceURI = attr.namespaceURI;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
        } else {
            fromValue = fromNode.getAttribute(attrName);
        }

        if (fromValue !== attrValue) {
            if (attrNamespaceURI) {
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            } else {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; i--) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (!hasAttributeNS(toNode, attrNamespaceURI, attrNamespaceURI ? attrName = attr.localName || attrName : attrName)) {
                fromNode.removeAttributeNode(attr);
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
            var toNodeHtml = toNode;
            toNode = document.createElement('html');
            toNode.innerHTML = toNodeHtml;
        } else {
            toNode = toElement(toNode);
        }
    }

    // XXX optimization: if the nodes are equal, don't morph them
    /*
    if (fromNode.isEqualNode(toNode)) {
      return fromNode;
    }
    */

    var savedEls = {}; // Used to save off DOM elements with IDs
    var unmatchedEls = {};
    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || options.onBeforeMorphEl || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || options.onBeforeMorphElChildren || noop;
    var childrenOnly = options.childrenOnly === true;
    var movedEls = [];

    function removeNodeHelper(node, nestedInSavedEl) {
        var id = getNodeKey(node);
        // If the node has an ID then save it off since we will want
        // to reuse it in case the target DOM tree has a DOM element
        // with the same ID
        if (id) {
            savedEls[id] = node;
        } else if (!nestedInSavedEl) {
            // If we are not nested in a saved element then we know that this node has been
            // completely discarded and will not exist in the final DOM.
            onNodeDiscarded(node);
        }

        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {
                removeNodeHelper(curChild, nestedInSavedEl || id);
                curChild = curChild.nextSibling;
            }
        }
    }

    function walkDiscardedChildNodes(node) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {


                if (!getNodeKey(curChild)) {
                    // We only want to handle nodes that don't have an ID to avoid double
                    // walking the same saved element.

                    onNodeDiscarded(curChild);

                    // Walk recursively
                    walkDiscardedChildNodes(curChild);
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    function removeNode(node, parentNode, alreadyVisited) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        parentNode.removeChild(node);
        if (alreadyVisited) {
            if (!getNodeKey(node)) {
                onNodeDiscarded(node);
                walkDiscardedChildNodes(node);
            }
        } else {
            removeNodeHelper(node);
        }
    }

    function morphEl(fromEl, toEl, alreadyVisited, childrenOnly) {
        var toElKey = getNodeKey(toEl);
        if (toElKey) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete savedEls[toElKey];
        }

        if (!childrenOnly) {
            if (onBeforeElUpdated(fromEl, toEl) === false) {
                return;
            }

            morphAttrs(fromEl, toEl);
            onElUpdated(fromEl);

            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                return;
            }
        }

        if (fromEl.nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeId;

            var fromNextSibling;
            var toNextSibling;
            var savedEl;
            var unmatchedEl;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeId = getNodeKey(curToNodeChild);

                while (curFromNodeChild) {
                    var curFromNodeId = getNodeKey(curFromNodeChild);
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (!alreadyVisited) {
                        if (curFromNodeId && (unmatchedEl = unmatchedEls[curFromNodeId])) {
                            unmatchedEl.parentNode.replaceChild(curFromNodeChild, unmatchedEl);
                            morphEl(curFromNodeChild, unmatchedEl, alreadyVisited);
                            curFromNodeChild = fromNextSibling;
                            continue;
                        }
                    }

                    var curFromNodeType = curFromNodeChild.nodeType;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        var isCompatible = false;

                        // Both nodes being compared are Element nodes
                        if (curFromNodeType === ELEMENT_NODE) {
                            if (compareNodeNames(curFromNodeChild, curToNodeChild)) {
                                // We have compatible DOM elements
                                if (curFromNodeId || curToNodeId) {
                                    // If either DOM element has an ID then we
                                    // handle those differently since we want to
                                    // match up by ID
                                    if (curToNodeId === curFromNodeId) {
                                        isCompatible = true;
                                    }
                                } else {
                                    isCompatible = true;
                                }
                            }

                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild, alreadyVisited);
                            }
                        // Both nodes being compared are Text or Comment nodes
                    } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }

                        if (isCompatible) {
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }
                    }

                    // No compatible match so remove the old node from the DOM
                    // and continue trying to find a match in the original DOM
                    removeNode(curFromNodeChild, fromEl, alreadyVisited);
                    curFromNodeChild = fromNextSibling;
                }

                if (curToNodeId) {
                    if ((savedEl = savedEls[curToNodeId])) {
                        morphEl(savedEl, curToNodeChild, true);
                        // We want to append the saved element instead
                        curToNodeChild = savedEl;
                    } else {
                        // The current DOM element in the target tree has an ID
                        // but we did not find a match in any of the
                        // corresponding siblings. We just put the target
                        // element in the old DOM tree but if we later find an
                        // element in the old DOM tree that has a matching ID
                        // then we will replace the target element with the
                        // corresponding old element and morph the old element
                        unmatchedEls[curToNodeId] = curToNodeChild;
                    }
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to node"
                // to the end
                if (onBeforeNodeAdded(curToNodeChild) !== false) {
                    fromEl.appendChild(curToNodeChild);
                    onNodeAdded(curToNodeChild);
                }

                if (curToNodeChild.nodeType === ELEMENT_NODE &&
                    (curToNodeId || curToNodeChild.firstChild)) {
                    // The element that was just added to the original DOM may
                    // have some nested elements with a key/ID that needs to be
                    // matched up with other elements. We'll add the element to
                    // a list so that we can later process the nested elements
                    // if there are any unmatched keyed elements that were
                    // discarded
                    movedEls.push(curToNodeChild);
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                removeNode(curFromNodeChild, fromEl, alreadyVisited);
                curFromNodeChild = fromNextSibling;
            }
        }

        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === ELEMENT_NODE) {
            if (toNodeType === ELEMENT_NODE) {
                if (!compareNodeNames(fromNode, toNode)) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                }
            } else {
                // Going from an element node to a text node
                morphedNode = toNode;
            }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
            if (toNodeType === morphedNodeType) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                // Text node to something else
                morphedNode = toNode;
            }
        }
    }

    if (morphedNode === toNode) {
        // The "to node" was not compatible with the "from node" so we had to
        // toss out the "from node" and use the "to node"
        onNodeDiscarded(fromNode);
    } else {
        morphEl(morphedNode, toNode, false, childrenOnly);

        /**
         * What we will do here is walk the tree for the DOM element that was
         * moved from the target DOM tree to the original DOM tree and we will
         * look for keyed elements that could be matched to keyed elements that
         * were earlier discarded.  If we find a match then we will move the
         * saved element into the final DOM tree.
         */
        var handleMovedEl = function(el) {
            var curChild = el.firstChild;
            while (curChild) {
                var nextSibling = curChild.nextSibling;

                var key = getNodeKey(curChild);
                if (key) {
                    var savedEl = savedEls[key];
                    if (savedEl && compareNodeNames(curChild, savedEl)) {
                        curChild.parentNode.replaceChild(savedEl, curChild);
                        // true: already visited the saved el tree
                        morphEl(savedEl, curChild, true);
                        curChild = nextSibling;
                        if (empty(savedEls)) {
                            return false;
                        }
                        continue;
                    }
                }

                if (curChild.nodeType === ELEMENT_NODE) {
                    handleMovedEl(curChild);
                }

                curChild = nextSibling;
            }
        };

        // The loop below is used to possibly match up any discarded
        // elements in the original DOM tree with elemenets from the
        // target tree that were moved over without visiting their
        // children
        if (!empty(savedEls)) {
            handleMovedElsLoop:
            while (movedEls.length) {
                var movedElsTemp = movedEls;
                movedEls = [];
                for (var i=0; i<movedElsTemp.length; i++) {
                    if (handleMovedEl(movedElsTemp[i]) === false) {
                        // There are no more unmatched elements so completely end
                        // the loop
                        break handleMovedElsLoop;
                    }
                }
            }
        }

        // Fire the "onNodeDiscarded" event for any saved elements
        // that never found a new home in the morphed DOM
        for (var savedElId in savedEls) {
            if (savedEls.hasOwnProperty(savedElId)) {
                var savedEl = savedEls[savedElId];
                onNodeDiscarded(savedEl);
                walkDiscardedChildNodes(savedEl);
            }
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;

},{}],46:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],47:[function(require,module,exports){
var page = require('page');
var empty = require('empty-element');
var template = require('./template.js');
var title = require('title');

page('/', function (ctx, next) {
	title('Timbagram');
	var main = document.getElementById('main-container');
	var pictures = [{
		user: {
			username: 'lliccien',
			avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
		},
		imageUrl: 'images/office.jpg',
		likes: 0,
		liked: false,
		createAt: new Date()

	}, {
		user: {
			username: 'lliccien',
			avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
		},
		imageUrl: 'images/office.jpg',
		likes: 1,
		liked: false,
		createAt: new Date().setDate(new Date().getDate() - 10)

	}, {
		user: {
			username: 'lliccien',
			avatar: 'https://scontent-mia1-1.xx.fbcdn.net/v/t1.0-9/12046790_10153790001424155_2301715220594432632_n.jpg?oh=511ac0b4303aae266995720a06fc7283&oe=57F6EF38'
		},
		imageUrl: 'images/office.jpg',
		likes: 31,
		liked: true,
		createAt: new Date().setDate(new Date().getDate() - 30)

	}];
	empty(main).appendChild(template(pictures));
});

},{"./template.js":48,"empty-element":3,"page":34,"title":37}],48:[function(require,module,exports){
var yo = require('yo-yo');
var layout = require('../layout/index.js');
var picture = require('../picture-card/index.js');

module.exports = function (pictures) {
	var homepage = yo`	<div class="container timeline">
						<div class="row">
							<div class="col s12 m10 offset-m1 l6 offset-l3">
								${ pictures.map(function (pic) {
		return picture(pic);
	}) }
							</div>
						</div>
					</div>`;

	return layout(homepage);
};

},{"../layout/index.js":51,"../picture-card/index.js":52,"yo-yo":38}],49:[function(require,module,exports){
var page = require('page');

require('./homepage');
require('./signup');
require('./signin');

page();

},{"./homepage":47,"./signin":53,"./signup":55,"page":34}],50:[function(require,module,exports){
var yo = require('yo-yo');

module.exports = function landing(box) {
	return yo`<div class="container landing">
					<div class="row">
						<div class="col s10 push-s1">
							<div class="row">
								<div class="col m5 hide-on-small-only">
									<img src="images/iphone.png" alt="Iphone" class="iphone">
								</div>
								${ box }
							</div>
						</div>
					</div>
				</div>`;
};

},{"yo-yo":38}],51:[function(require,module,exports){
var yo = require('yo-yo');

module.exports = function layout(content) {
	return yo`	<div>
					<nav class="header">
						<div class="nav-wrapper">
							<div class="conteiner">
								<div class="row">
									<div class="col s12 m6 offset-m1">
										<a href="/" class="brand-logo timbagram">
											<img class="logo" src="images/favicon-96x96.png" />
											<span>Timbagram</span>
										</a>
									</div>
									<div class="col s2 m6 push-s10 push-m10">
										<a href="#" class="btn btn-large btn-flat dropdown-button" data-activates="drop-user">
											<i class="fa fa-user" aria-hidden="true"></i>
										</a>
										<ul id="drop-user" class="dropdown-content">
											<li><a href="#">Salir</a></li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					</nav>
					<div class="content">
						${ content }
					</div>
				</div>`;
};

},{"yo-yo":38}],52:[function(require,module,exports){
var yo = require('yo-yo');
var translate = require('../translate/index.js');

module.exports = function pictueCard(pic) {

	var el;

	function render(picture) {

		return yo`<div class="card ${ picture.liked ? 'liked' : '' }">
					<div class="card-image">
					  <img class="activator" src="${ picture.imageUrl }">
					</div>
					<div class="card-content">
					  <a  href="/user/${ picture.user.username }" class="card-title">
						<img src="${ picture.user.avatar }" class="avatar" />
						<span class="username">${ picture.user.username }</span>
					  </a>
					  <small class="right time">${ translate.date.format(picture.createAt) }</small>
					  <p>
					  	<a class="left" href="#" onclick=${ like.bind(null, true) }><i class="fa fa-heart-o" aria-hidden="true"></i></a>
					  	<a class="left" href="#" onclick=${ like.bind(null, false) }><i class="fa fa-heart" aria-hidden="true"></i></a>
					  	<span class="left likes">${ translate.message('likes', { likes: picture.likes }) }</span>
					  </p>
					</div>
				  </div>`;
	}

	function like(liked) {
		pic.liked = liked;
		pic.likes += liked ? 1 : -1;
		var newEl = render(pic);
		yo.update(el, newEl);
		return false;
	}

	el = render(pic);
	return el;
};

},{"../translate/index.js":59,"yo-yo":38}],53:[function(require,module,exports){
var page = require('page');
var empty = require('empty-element');
var template = require('./template.js');
var title = require('title');

page('/signin', function (ctx, next) {
	title('Timbagram - Signin');
	var main = document.getElementById('main-container');
	empty(main).appendChild(template);
});

},{"./template.js":54,"empty-element":3,"page":34,"title":37}],54:[function(require,module,exports){
var yo = require('yo-yo');
var landing = require('../landing/index.js');

var signinForm = yo`<div class="col s12 m7">
						<div class="row">
							<div class="signup-box">
								<h1 class="timbagram">Timbagram</h1>
								<form class="signup-form">
									<div class="section">
										<a href="" class="btn btn-fb hide-on-small-only">Inicia sesión con Facebook</a>
										<a href="" class="btn btn-fb hide-on-med-and-up">Inicia sesión</a>
									</div>
									<div class="divider"></div>
									<div class="section">
										<input type="text" name="username" id="" placeholder="Nombre de usuario">
										<input type="password" name="password" id="" placeholder="Contraseña">
										<button class="btn waves-effect waves light btn-signup" type="submit">Inicia sesión</button>
									</div>
								</form>
							</div>
						</div>
						<div class="row">
							<div class="login-box">
								¿No tienes una cuenta? <a href="/signup">Regístrate</a>
							</div>
						</div>
					</div>`;

module.exports = landing(signinForm);

},{"../landing/index.js":50,"yo-yo":38}],55:[function(require,module,exports){
var page = require('page');
var empty = require('empty-element');
var template = require('./template.js');
var title = require('title');

page('/signup', function (ctx, next) {
	title('Timbagram - Signup');
	var main = document.getElementById('main-container');
	empty(main).appendChild(template);
});

},{"./template.js":56,"empty-element":3,"page":34,"title":37}],56:[function(require,module,exports){
var yo = require('yo-yo');
var landing = require('../landing');

var signupForm = yo`<div class="col s12 m7">
						<div class="row">
							<div class="signup-box">
								<h1 class="timbagram">Timbagram</h1>
								<form class="signup-form">
									<h2>Regitrate para ver fotos de tus Amig@s Casineros</h2>
									<div class="section">
										<a href="" class="btn btn-fb hide-on-small-only">Inicia sesión con Facebook</a>
										<a href="" class="btn btn-fb hide-on-med-and-up"><i class="fa fa-facebook-official" aria-hidden="true"></i>Inicia sesión</a>
									</div>
									<div class="divider"></div>
									<div class="section">
										<input type="email" name="email" id="" placeholder="Correo electrónico">
										<input type="text" name="name" id="" placeholder="Nombre completo">
										<input type="text" name="username" id="" placeholder="Nombre de usuario">
										<input type="password" name="password" id="" placeholder="Contraseña">
										<button class="btn waves-effect waves light btn-signup" type="submit">Registrate</button>
									</div>
								</form>
							</div>
						</div>
						<div class="row">
							<div class="login-box">
								¿Tienes una cuenta? <a href="/signin">Entrar</a>
							</div>
						</div>
					</div>`;

module.exports = landing(signupForm);

},{"../landing":50,"yo-yo":38}],57:[function(require,module,exports){
module.exports = {
           likes: '{likes, plural, ' + '=0 {no likes.}' + '=1 {# like.}' + 'other {# likes.}}'
};

},{}],58:[function(require,module,exports){
module.exports = {
	likes: '{likes, number} me gusta.'
};

},{}],59:[function(require,module,exports){
// Soporte para safari
if (!window.Intl) {
  window.Intl = require('intl');
  require('intl/locale-data/jsonp/en-US.js');
  require('intl/locale-data/jsonp/es.js');
}

var IntlRelativeFormat = window.IntlRelativeFormat = require('intl-relativeformat');
var IntlMessageFormat = require('intl-messageformat');

require('intl-relativeformat/dist/locale-data/en.js');
require('intl-relativeformat/dist/locale-data/es.js');

var es = require('./es.js');
var en = require('./en-US.js');

var MESSAGES = {};
MESSAGES.es = es;
MESSAGES['en-US'] = en;

var locale = 'es';

module.exports = {
  message: function (text, opts) {
    opts = opts || {};
    var msg = new IntlMessageFormat(MESSAGES[locale][text], locale, null);
    return msg.format(opts);
  },
  date: new IntlRelativeFormat(locale)
};

},{"./en-US.js":57,"./es.js":58,"intl":30,"intl-messageformat":4,"intl-relativeformat":15,"intl-relativeformat/dist/locale-data/en.js":13,"intl-relativeformat/dist/locale-data/es.js":14,"intl/locale-data/jsonp/en-US.js":32,"intl/locale-data/jsonp/es.js":33}]},{},[49])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9lbXB0eS1lbGVtZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsLW1lc3NhZ2Vmb3JtYXQvbGliL2NvbXBpbGVyLmpzIiwibm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC9saWIvY29yZS5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsLW1lc3NhZ2Vmb3JtYXQvbGliL2VuLmpzIiwibm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC9saWIvZXM1LmpzIiwibm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC9saWIvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsLW1lc3NhZ2Vmb3JtYXQvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC9ub2RlX21vZHVsZXMvaW50bC1tZXNzYWdlZm9ybWF0LXBhcnNlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsLW1lc3NhZ2Vmb3JtYXQvbm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC1wYXJzZXIvbGliL3BhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsLXJlbGF0aXZlZm9ybWF0L2Rpc3QvbG9jYWxlLWRhdGEvZW4uanMiLCJub2RlX21vZHVsZXMvaW50bC1yZWxhdGl2ZWZvcm1hdC9kaXN0L2xvY2FsZS1kYXRhL2VzLmpzIiwibm9kZV9tb2R1bGVzL2ludGwtcmVsYXRpdmVmb3JtYXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaW50bC1yZWxhdGl2ZWZvcm1hdC9saWIvY29yZS5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsLXJlbGF0aXZlZm9ybWF0L2xpYi9kaWZmLmpzIiwibm9kZV9tb2R1bGVzL2ludGwtcmVsYXRpdmVmb3JtYXQvbGliL2VuLmpzIiwibm9kZV9tb2R1bGVzL2ludGwtcmVsYXRpdmVmb3JtYXQvbGliL2VzNS5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ludGwvbGliL2NvcmUuanMiLCJub2RlX21vZHVsZXMvaW50bC9sb2NhbGUtZGF0YS9qc29ucC9lbi1VUy5qcyIsIm5vZGVfbW9kdWxlcy9pbnRsL2xvY2FsZS1kYXRhL2pzb25wL2VzLmpzIiwibm9kZV9tb2R1bGVzL3BhZ2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGFnZS9ub2RlX21vZHVsZXMvcGF0aC10by1yZWdleHAvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGFnZS9ub2RlX21vZHVsZXMvcGF0aC10by1yZWdleHAvbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGl0bGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW8teW8vaW5kZXguanMiLCJub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCJub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsIm5vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvaHlwZXJ4L25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvb24tbG9hZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvbW9ycGhkb20vbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3lvLXlvL3VwZGF0ZS1ldmVudHMuanMiLCJzcmNcXGhvbWVwYWdlXFxpbmRleC5qcyIsInNyY1xcaG9tZXBhZ2VcXHRlbXBsYXRlLmpzIiwic3JjXFxpbmRleC5qcyIsInNyY1xcbGFuZGluZ1xcaW5kZXguanMiLCJzcmNcXGxheW91dFxcaW5kZXguanMiLCJzcmNcXHBpY3R1cmUtY2FyZFxcaW5kZXguanMiLCJzcmNcXHNpZ25pblxcaW5kZXguanMiLCJzcmNcXHNpZ25pblxcdGVtcGxhdGUuanMiLCJzcmNcXHNpZ251cFxcaW5kZXguanMiLCJzcmNcXHNpZ251cFxcdGVtcGxhdGUuanMiLCJzcmNcXHRyYW5zbGF0ZVxcZW4tVVMuanMiLCJzcmNcXHRyYW5zbGF0ZVxcZXMuanMiLCJzcmNcXHRyYW5zbGF0ZVxcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ250SEE7O0FDQUE7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RZQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQSxJQUFJLE9BQU8sUUFBWCxBQUFXLEFBQVE7QUFDbkIsSUFBSSxRQUFRLFFBQVosQUFBWSxBQUFRO0FBQ3BCLElBQUksV0FBVyxRQUFmLEFBQWUsQUFBUTtBQUN2QixJQUFJLFFBQVEsUUFBWixBQUFZLEFBQVE7O0FBRXBCLEtBQUEsQUFBSyxLQUFLLFVBQUEsQUFBUyxLQUFULEFBQWMsTUFBTSxBQUM3QjtPQUFBLEFBQU0sQUFDTjtLQUFJLE9BQU8sU0FBQSxBQUFTLGVBQXBCLEFBQVcsQUFBd0IsQUFDbkM7S0FBSTs7YUFFRyxBQUNLLEFBQ1Y7V0FIRixBQUNPLEFBQ0wsQUFDUSxBQUVUOztZQUxELEFBS1csQUFDVjtTQU5ELEFBTVEsQUFDUDtTQVBELEFBT1EsQUFDUDtZQUFVLElBVEksQUFDZixBQUNDLEFBT1UsQUFBSTs7OzthQUlSLEFBQ0ssQUFDVjtXQUhGLEFBQ08sQUFDTCxBQUNRLEFBRVQ7O1lBTEQsQUFLVyxBQUNWO1NBTkQsQUFNUSxBQUNQO1NBUEQsQUFPUSxBQUNQO1lBQVUsSUFBQSxBQUFJLE9BQUosQUFBVyxRQUFRLElBQUEsQUFBSSxPQUFKLEFBQVcsWUFwQjFCLEFBWWYsQUFDQyxBQU9VLEFBQTBDOzs7O2FBSTlDLEFBQ0ssQUFDVjtXQUhGLEFBQ08sQUFDTCxBQUNRLEFBRVQ7O1lBTEQsQUFLVyxBQUNWO1NBTkQsQUFNUSxBQUNQO1NBUEQsQUFPUSxBQUNQO1lBQVUsSUFBQSxBQUFJLE9BQUosQUFBVyxRQUFRLElBQUEsQUFBSSxPQUFKLEFBQVcsWUEvQnpDLEFBQWUsQUF1QmYsQUFDQyxBQU9VLEFBQTBDLEFBSXJEOzs7T0FBQSxBQUFNLE1BQU4sQUFBWSxZQUFZLFNBdEN6QixBQXNDQyxBQUF3QixBQUFTLEFBQ2pDOzs7O0FDNUNELElBQUksS0FBSyxRQUFULEFBQVMsQUFBUTtBQUNqQixJQUFJLFNBQVMsUUFBYixBQUFhLEFBQVE7QUFDckIsSUFBSSxVQUFVLFFBQWQsQUFBYyxBQUFROztBQUV0QixPQUFBLEFBQU8sVUFBVSxVQUFBLEFBQVUsVUFBVSxBQUNwQztLQUFJLFdBQVcsQUFBRzs7O1VBQUEsVUFHVCxBQUFTLElBQUksVUFBQSxBQUFVLEtBQUssQUFDN0I7U0FBTyxRQUpmLEFBR1MsQUFDRCxBQUFPLEFBQVEsQUFDZixBQUFFLEFBS1Y7Ozs7OztRQUFPLE9BWFIsQUFXQyxBQUFPLEFBQU8sQUFDZDs7OztBQ2hCRCxJQUFJLE9BQU8sUUFBWCxBQUFXLEFBQVE7O0FBR25CLFFBQUEsQUFBUTtBQUNSLFFBQUEsQUFBUTtBQUNSLFFBQUEsQUFBUTs7QUFFUjs7O0FDUEEsSUFBSSxLQUFLLFFBQVQsQUFBUyxBQUFROztBQUdqQixPQUFBLEFBQU8sVUFBVSxTQUFBLEFBQVMsUUFBVCxBQUFpQixLQUFLLEFBQ3RDO1FBQU8sQUFBRzs7Ozs7OztXQURYLEFBQ0MsQUFPUyxBQUFJLEFBS2I7Ozs7Ozs7O0FDaEJELElBQUksS0FBSyxRQUFULEFBQVMsQUFBUTs7QUFHakIsT0FBQSxBQUFPLFVBQVUsU0FBQSxBQUFTLE9BQVQsQUFBZ0IsU0FBUyxBQUN6QztRQUFPLEFBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQUFBLENBRFgsQUFDQyxBQXdCTyxBQUFRLEFBR2Y7Ozs7OztBQy9CRCxJQUFJLEtBQUssUUFBVCxBQUFTLEFBQVE7QUFDakIsSUFBSSxZQUFZLFFBQWhCLEFBQWdCLEFBQVE7O0FBR3hCLE9BQUEsQUFBTyxVQUFVLFNBQUEsQUFBUyxXQUFULEFBQW9CLEtBQUssQUFFekM7O0tBQUEsQUFBSSxBQUVKOztVQUFBLEFBQVMsT0FBVCxBQUFnQixTQUFTLEFBRXhCOztTQUFPLEFBQUksdUJBQW1CLFFBQUEsQUFBUSxRQUFSLEFBQWdCLFVBQVUsQUFBRzs7cUNBQUEsQ0FFeEIsUUFBUSxBQUFTOzs7eUJBQUEsQ0FHN0IsUUFBQSxBQUFRLEtBQUssQUFBUztrQkFBQSxDQUM3QixRQUFBLEFBQVEsS0FBSyxBQUFPOytCQUFBLENBQ1AsUUFBQSxBQUFRLEtBQUssQUFBUzs7bUNBQUEsQ0FFbEIsVUFBQSxBQUFVLEtBQVYsQUFBZSxPQUFPLFFBQXRCLEFBQThCLEFBQVU7OzJDQUFBLENBRWhDLEtBQUEsQUFBSyxLQUFMLEFBQVUsTUFBVixBQUFnQixBQUFNOzJDQUFBLENBQ3RCLEtBQUEsQUFBSyxLQUFMLEFBQVUsTUFBVixBQUFnQixBQUFPO21DQUFBLENBQy9CLFVBQUEsQUFBVSxRQUFWLEFBQWtCLFNBQVMsRUFBQyxPQUFPLFFBYnBFLEFBYWlDLEFBQTJCLEFBQWdCLEFBQVEsQUFJcEYsQUFFRDs7Ozs7O1VBQUEsQUFBUyxLQUFULEFBQWMsT0FBTyxBQUNwQjtNQUFBLEFBQUksUUFBSixBQUFXLEFBQ1g7TUFBQSxBQUFJLFNBQVMsUUFBQSxBQUFRLElBQUksQ0FBekIsQUFBMEIsQUFDMUI7TUFBSSxRQUFRLE9BQVosQUFBWSxBQUFPLEFBQ25CO0tBQUEsQUFBRyxPQUFILEFBQVUsSUFBVixBQUFjLEFBQ2Q7U0FBQSxBQUFPLEFBRVAsQUFFRDs7O01BQUssT0FBTCxBQUFLLEFBQU8sQUFDWjtRQW5DRCxBQW1DQyxBQUFPLEFBQ1A7Ozs7QUN4Q0QsSUFBSSxPQUFPLFFBQVgsQUFBVyxBQUFRO0FBQ25CLElBQUksUUFBUSxRQUFaLEFBQVksQUFBUTtBQUNwQixJQUFJLFdBQVcsUUFBZixBQUFlLEFBQVE7QUFDdkIsSUFBSSxRQUFRLFFBQVosQUFBWSxBQUFROztBQUVwQixLQUFBLEFBQUssV0FBVyxVQUFBLEFBQVMsS0FBVCxBQUFjLE1BQU0sQUFDbkM7T0FBQSxBQUFNLEFBQ047S0FBSSxPQUFPLFNBQUEsQUFBUyxlQUFwQixBQUFXLEFBQXdCLEFBQ25DO09BQUEsQUFBTSxNQUFOLEFBQVksWUFIYixBQUdDLEFBQXdCLEFBQ3hCOzs7O0FDVEQsSUFBSSxLQUFLLFFBQVQsQUFBUyxBQUFRO0FBQ2pCLElBQUksVUFBVSxRQUFkLEFBQWMsQUFBUTs7QUFFckIsSUFBSSxhQUFKLEFBQWlCLEFBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF5QnJCLE9BQUEsQUFBTyxVQUFVLFFBQWpCLEFBQWlCLEFBQVE7OztBQzVCekIsSUFBSSxPQUFPLFFBQVgsQUFBVyxBQUFRO0FBQ25CLElBQUksUUFBUSxRQUFaLEFBQVksQUFBUTtBQUNwQixJQUFJLFdBQVcsUUFBZixBQUFlLEFBQVE7QUFDdkIsSUFBSSxRQUFRLFFBQVosQUFBWSxBQUFROztBQUVwQixLQUFBLEFBQUssV0FBVyxVQUFBLEFBQVMsS0FBVCxBQUFjLE1BQU0sQUFDbkM7T0FBQSxBQUFNLEFBQ047S0FBSSxPQUFPLFNBQUEsQUFBUyxlQUFwQixBQUFXLEFBQXdCLEFBQ25DO09BQUEsQUFBTSxNQUFOLEFBQVksWUFIYixBQUdDLEFBQXdCLEFBQ3hCOzs7O0FDVEQsSUFBSSxLQUFLLFFBQVQsQUFBUyxBQUFRO0FBQ2pCLElBQUksVUFBVSxRQUFkLEFBQWMsQUFBUTs7QUFFckIsSUFBSSxhQUFKLEFBQWlCLEFBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE0QnJCLE9BQUEsQUFBTyxVQUFVLFFBQWpCLEFBQWlCLEFBQVE7OztBQy9CekIsT0FBQSxBQUFPO2tCQUNDLHFCQUFBLEFBQ0ksbUJBREosQUFFSSxpQkFIWixBQUFpQixBQUNoQixBQUdXOzs7O0FDSlosT0FBQSxBQUFPO1FBQVAsQUFBaUIsQUFDaEIsQUFBTzs7Ozs7QUNBUixJQUFJLENBQUMsT0FBTCxBQUFZLE1BQU0sQUFDaEI7U0FBQSxBQUFPLE9BQU8sUUFBZCxBQUFjLEFBQVEsQUFDdEI7VUFBQSxBQUFRLEFBQ1I7VUFBQSxBQUFRLEFBQ1Q7OztBQUVELElBQUkscUJBQXFCLE9BQUEsQUFBTyxxQkFBcUIsUUFBckQsQUFBcUQsQUFBUTtBQUM3RCxJQUFJLG9CQUFvQixRQUF4QixBQUF3QixBQUFROztBQUVoQyxRQUFBLEFBQVE7QUFDUixRQUFBLEFBQVE7O0FBRVIsSUFBSSxLQUFLLFFBQVQsQUFBUyxBQUFRO0FBQ2pCLElBQUksS0FBSyxRQUFULEFBQVMsQUFBUTs7QUFFakIsSUFBSSxXQUFKLEFBQWU7QUFDZixTQUFBLEFBQVMsS0FBVCxBQUFjO0FBQ2QsU0FBQSxBQUFTLFdBQVQsQUFBb0I7O0FBRXBCLElBQUksU0FBSixBQUFhOztBQUViLE9BQUEsQUFBTztXQUNJLFVBQUEsQUFBVSxNQUFWLEFBQWdCLE1BQU0sQUFDekI7V0FBTyxRQUFQLEFBQWUsQUFDZjtRQUFJLE1BQU0sSUFBQSxBQUFJLGtCQUFrQixTQUFBLEFBQVMsUUFBL0IsQUFBc0IsQUFBaUIsT0FBdkMsQUFBOEMsUUFBeEQsQUFBVSxBQUFzRCxBQUNoRTtXQUFPLElBQUEsQUFBSSxPQUpGLEFBSVQsQUFBTyxBQUFXLEFBQ25CLEFBQ0w7O1FBQU0sSUFBQSxBQUFJLG1CQU5aLEFBQWlCLEFBQ2YsQUFLTSxBQUF1QiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG4oZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICB9IGNhdGNoIChlKSB7XG4gICAgY2FjaGVkU2V0VGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBpcyBub3QgZGVmaW5lZCcpO1xuICAgIH1cbiAgfVxuICB0cnkge1xuICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgfVxuICB9XG59ICgpKVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gY2FjaGVkU2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2FjaGVkQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbCBIVE1MRWxlbWVudCAqL1xuXG4ndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbXB0eUVsZW1lbnQgKGVsZW1lbnQpIHtcbiAgaWYgKCEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFuIGVsZW1lbnQnKVxuICB9XG5cbiAgdmFyIG5vZGVcbiAgd2hpbGUgKChub2RlID0gZWxlbWVudC5sYXN0Q2hpbGQpKSBlbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUpXG4gIHJldHVybiBlbGVtZW50XG59XG4iLCIvKiBqc2hpbnQgbm9kZTp0cnVlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEludGxNZXNzYWdlRm9ybWF0ID0gcmVxdWlyZSgnLi9saWIvbWFpbicpWydkZWZhdWx0J107XG5cbi8vIEFkZCBhbGwgbG9jYWxlIGRhdGEgdG8gYEludGxNZXNzYWdlRm9ybWF0YC4gVGhpcyBtb2R1bGUgd2lsbCBiZSBpZ25vcmVkIHdoZW5cbi8vIGJ1bmRsaW5nIGZvciB0aGUgYnJvd3NlciB3aXRoIEJyb3dzZXJpZnkvV2VicGFjay5cbnJlcXVpcmUoJy4vbGliL2xvY2FsZXMnKTtcblxuLy8gUmUtZXhwb3J0IGBJbnRsTWVzc2FnZUZvcm1hdGAgYXMgdGhlIENvbW1vbkpTIGRlZmF1bHQgZXhwb3J0cyB3aXRoIGFsbCB0aGVcbi8vIGxvY2FsZSBkYXRhIHJlZ2lzdGVyZWQsIGFuZCB3aXRoIEVuZ2xpc2ggc2V0IGFzIHRoZSBkZWZhdWx0IGxvY2FsZS4gRGVmaW5lXG4vLyB0aGUgYGRlZmF1bHRgIHByb3AgZm9yIHVzZSB3aXRoIG90aGVyIGNvbXBpbGVkIEVTNiBNb2R1bGVzLlxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gSW50bE1lc3NhZ2VGb3JtYXQ7XG5leHBvcnRzWydkZWZhdWx0J10gPSBleHBvcnRzO1xuIiwiLypcbkNvcHlyaWdodCAoYykgMjAxNCwgWWFob28hIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbkNvcHlyaWdodHMgbGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgTGljZW5zZS5cblNlZSB0aGUgYWNjb21wYW55aW5nIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMuXG4qL1xuXG4vKiBqc2xpbnQgZXNuZXh0OiB0cnVlICovXG5cblwidXNlIHN0cmljdFwiO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBDb21waWxlcjtcblxuZnVuY3Rpb24gQ29tcGlsZXIobG9jYWxlcywgZm9ybWF0cywgcGx1cmFsRm4pIHtcbiAgICB0aGlzLmxvY2FsZXMgID0gbG9jYWxlcztcbiAgICB0aGlzLmZvcm1hdHMgID0gZm9ybWF0cztcbiAgICB0aGlzLnBsdXJhbEZuID0gcGx1cmFsRm47XG59XG5cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24gKGFzdCkge1xuICAgIHRoaXMucGx1cmFsU3RhY2sgICAgICAgID0gW107XG4gICAgdGhpcy5jdXJyZW50UGx1cmFsICAgICAgPSBudWxsO1xuICAgIHRoaXMucGx1cmFsTnVtYmVyRm9ybWF0ID0gbnVsbDtcblxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVNZXNzYWdlKGFzdCk7XG59O1xuXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZU1lc3NhZ2UgPSBmdW5jdGlvbiAoYXN0KSB7XG4gICAgaWYgKCEoYXN0ICYmIGFzdC50eXBlID09PSAnbWVzc2FnZUZvcm1hdFBhdHRlcm4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01lc3NhZ2UgQVNUIGlzIG5vdCBvZiB0eXBlOiBcIm1lc3NhZ2VGb3JtYXRQYXR0ZXJuXCInKTtcbiAgICB9XG5cbiAgICB2YXIgZWxlbWVudHMgPSBhc3QuZWxlbWVudHMsXG4gICAgICAgIHBhdHRlcm4gID0gW107XG5cbiAgICB2YXIgaSwgbGVuLCBlbGVtZW50O1xuXG4gICAgZm9yIChpID0gMCwgbGVuID0gZWxlbWVudHMubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuXG4gICAgICAgIHN3aXRjaCAoZWxlbWVudC50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdtZXNzYWdlVGV4dEVsZW1lbnQnOlxuICAgICAgICAgICAgICAgIHBhdHRlcm4ucHVzaCh0aGlzLmNvbXBpbGVNZXNzYWdlVGV4dChlbGVtZW50KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2FyZ3VtZW50RWxlbWVudCc6XG4gICAgICAgICAgICAgICAgcGF0dGVybi5wdXNoKHRoaXMuY29tcGlsZUFyZ3VtZW50KGVsZW1lbnQpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01lc3NhZ2UgZWxlbWVudCBkb2VzIG5vdCBoYXZlIGEgdmFsaWQgdHlwZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdHRlcm47XG59O1xuXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZU1lc3NhZ2VUZXh0ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBXaGVuIHRoaXMgYGVsZW1lbnRgIGlzIHBhcnQgb2YgcGx1cmFsIHN1Yi1wYXR0ZXJuIGFuZCBpdHMgdmFsdWUgY29udGFpbnNcbiAgICAvLyBhbiB1bmVzY2FwZWQgJyMnLCB1c2UgYSBgUGx1cmFsT2Zmc2V0U3RyaW5nYCBoZWxwZXIgdG8gcHJvcGVybHkgb3V0cHV0XG4gICAgLy8gdGhlIG51bWJlciB3aXRoIHRoZSBjb3JyZWN0IG9mZnNldCBpbiB0aGUgc3RyaW5nLlxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVyYWwgJiYgLyhefFteXFxcXF0pIy9nLnRlc3QoZWxlbWVudC52YWx1ZSkpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgY2FjaGUgYSBOdW1iZXJGb3JtYXQgaW5zdGFuY2UgdGhhdCBjYW4gYmUgcmV1c2VkIGZvciBhbnlcbiAgICAgICAgLy8gUGx1cmFsT2Zmc2V0U3RyaW5nIGluc3RhbmNlIGluIHRoaXMgbWVzc2FnZS5cbiAgICAgICAgaWYgKCF0aGlzLnBsdXJhbE51bWJlckZvcm1hdCkge1xuICAgICAgICAgICAgdGhpcy5wbHVyYWxOdW1iZXJGb3JtYXQgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQodGhpcy5sb2NhbGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUGx1cmFsT2Zmc2V0U3RyaW5nKFxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFBsdXJhbC5pZCxcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRQbHVyYWwuZm9ybWF0Lm9mZnNldCxcbiAgICAgICAgICAgICAgICB0aGlzLnBsdXJhbE51bWJlckZvcm1hdCxcbiAgICAgICAgICAgICAgICBlbGVtZW50LnZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBVbmVzY2FwZSB0aGUgZXNjYXBlZCAnIydzIGluIHRoZSBtZXNzYWdlIHRleHQuXG4gICAgcmV0dXJuIGVsZW1lbnQudmFsdWUucmVwbGFjZSgvXFxcXCMvZywgJyMnKTtcbn07XG5cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlQXJndW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciBmb3JtYXQgPSBlbGVtZW50LmZvcm1hdDtcblxuICAgIGlmICghZm9ybWF0KSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyaW5nRm9ybWF0KGVsZW1lbnQuaWQpO1xuICAgIH1cblxuICAgIHZhciBmb3JtYXRzICA9IHRoaXMuZm9ybWF0cyxcbiAgICAgICAgbG9jYWxlcyAgPSB0aGlzLmxvY2FsZXMsXG4gICAgICAgIHBsdXJhbEZuID0gdGhpcy5wbHVyYWxGbixcbiAgICAgICAgb3B0aW9ucztcblxuICAgIHN3aXRjaCAoZm9ybWF0LnR5cGUpIHtcbiAgICAgICAgY2FzZSAnbnVtYmVyRm9ybWF0JzpcbiAgICAgICAgICAgIG9wdGlvbnMgPSBmb3JtYXRzLm51bWJlcltmb3JtYXQuc3R5bGVdO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBpZCAgICA6IGVsZW1lbnQuaWQsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG9jYWxlcywgb3B0aW9ucykuZm9ybWF0XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGNhc2UgJ2RhdGVGb3JtYXQnOlxuICAgICAgICAgICAgb3B0aW9ucyA9IGZvcm1hdHMuZGF0ZVtmb3JtYXQuc3R5bGVdO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBpZCAgICA6IGVsZW1lbnQuaWQsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdChsb2NhbGVzLCBvcHRpb25zKS5mb3JtYXRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgY2FzZSAndGltZUZvcm1hdCc6XG4gICAgICAgICAgICBvcHRpb25zID0gZm9ybWF0cy50aW1lW2Zvcm1hdC5zdHlsZV07XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGlkICAgIDogZWxlbWVudC5pZCxcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGxvY2FsZXMsIG9wdGlvbnMpLmZvcm1hdFxuICAgICAgICAgICAgfTtcblxuICAgICAgICBjYXNlICdwbHVyYWxGb3JtYXQnOlxuICAgICAgICAgICAgb3B0aW9ucyA9IHRoaXMuY29tcGlsZU9wdGlvbnMoZWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBsdXJhbEZvcm1hdChcbiAgICAgICAgICAgICAgICBlbGVtZW50LmlkLCBmb3JtYXQub3JkaW5hbCwgZm9ybWF0Lm9mZnNldCwgb3B0aW9ucywgcGx1cmFsRm5cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY2FzZSAnc2VsZWN0Rm9ybWF0JzpcbiAgICAgICAgICAgIG9wdGlvbnMgPSB0aGlzLmNvbXBpbGVPcHRpb25zKGVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTZWxlY3RGb3JtYXQoZWxlbWVudC5pZCwgb3B0aW9ucyk7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWVzc2FnZSBlbGVtZW50IGRvZXMgbm90IGhhdmUgYSB2YWxpZCBmb3JtYXQgdHlwZScpO1xuICAgIH1cbn07XG5cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlT3B0aW9ucyA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdmFyIGZvcm1hdCAgICAgID0gZWxlbWVudC5mb3JtYXQsXG4gICAgICAgIG9wdGlvbnMgICAgID0gZm9ybWF0Lm9wdGlvbnMsXG4gICAgICAgIG9wdGlvbnNIYXNoID0ge307XG5cbiAgICAvLyBTYXZlIHRoZSBjdXJyZW50IHBsdXJhbCBlbGVtZW50LCBpZiBhbnksIHRoZW4gc2V0IGl0IHRvIGEgbmV3IHZhbHVlIHdoZW5cbiAgICAvLyBjb21waWxpbmcgdGhlIG9wdGlvbnMgc3ViLXBhdHRlcm5zLiBUaGlzIGNvbmZvcm1zIHRoZSBzcGVjJ3MgYWxnb3JpdGhtXG4gICAgLy8gZm9yIGhhbmRsaW5nIGBcIiNcImAgc3ludGF4IGluIG1lc3NhZ2UgdGV4dC5cbiAgICB0aGlzLnBsdXJhbFN0YWNrLnB1c2godGhpcy5jdXJyZW50UGx1cmFsKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVyYWwgPSBmb3JtYXQudHlwZSA9PT0gJ3BsdXJhbEZvcm1hdCcgPyBlbGVtZW50IDogbnVsbDtcblxuICAgIHZhciBpLCBsZW4sIG9wdGlvbjtcblxuICAgIGZvciAoaSA9IDAsIGxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgb3B0aW9uID0gb3B0aW9uc1tpXTtcblxuICAgICAgICAvLyBDb21waWxlIHRoZSBzdWItcGF0dGVybiBhbmQgc2F2ZSBpdCB1bmRlciB0aGUgb3B0aW9ucydzIHNlbGVjdG9yLlxuICAgICAgICBvcHRpb25zSGFzaFtvcHRpb24uc2VsZWN0b3JdID0gdGhpcy5jb21waWxlTWVzc2FnZShvcHRpb24udmFsdWUpO1xuICAgIH1cblxuICAgIC8vIFBvcCB0aGUgcGx1cmFsIHN0YWNrIHRvIHB1dCBiYWNrIHRoZSBvcmlnaW5hbCBjdXJyZW50IHBsdXJhbCB2YWx1ZS5cbiAgICB0aGlzLmN1cnJlbnRQbHVyYWwgPSB0aGlzLnBsdXJhbFN0YWNrLnBvcCgpO1xuXG4gICAgcmV0dXJuIG9wdGlvbnNIYXNoO1xufTtcblxuLy8gLS0gQ29tcGlsZXIgSGVscGVyIENsYXNzZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gU3RyaW5nRm9ybWF0KGlkKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xufVxuXG5TdHJpbmdGb3JtYXQucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBTdHJpbmcodmFsdWUpO1xufTtcblxuZnVuY3Rpb24gUGx1cmFsRm9ybWF0KGlkLCB1c2VPcmRpbmFsLCBvZmZzZXQsIG9wdGlvbnMsIHBsdXJhbEZuKSB7XG4gICAgdGhpcy5pZCAgICAgICAgID0gaWQ7XG4gICAgdGhpcy51c2VPcmRpbmFsID0gdXNlT3JkaW5hbDtcbiAgICB0aGlzLm9mZnNldCAgICAgPSBvZmZzZXQ7XG4gICAgdGhpcy5vcHRpb25zICAgID0gb3B0aW9ucztcbiAgICB0aGlzLnBsdXJhbEZuICAgPSBwbHVyYWxGbjtcbn1cblxuUGx1cmFsRm9ybWF0LnByb3RvdHlwZS5nZXRPcHRpb24gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuICAgIHZhciBvcHRpb24gPSBvcHRpb25zWyc9JyArIHZhbHVlXSB8fFxuICAgICAgICAgICAgb3B0aW9uc1t0aGlzLnBsdXJhbEZuKHZhbHVlIC0gdGhpcy5vZmZzZXQsIHRoaXMudXNlT3JkaW5hbCldO1xuXG4gICAgcmV0dXJuIG9wdGlvbiB8fCBvcHRpb25zLm90aGVyO1xufTtcblxuZnVuY3Rpb24gUGx1cmFsT2Zmc2V0U3RyaW5nKGlkLCBvZmZzZXQsIG51bWJlckZvcm1hdCwgc3RyaW5nKSB7XG4gICAgdGhpcy5pZCAgICAgICAgICAgPSBpZDtcbiAgICB0aGlzLm9mZnNldCAgICAgICA9IG9mZnNldDtcbiAgICB0aGlzLm51bWJlckZvcm1hdCA9IG51bWJlckZvcm1hdDtcbiAgICB0aGlzLnN0cmluZyAgICAgICA9IHN0cmluZztcbn1cblxuUGx1cmFsT2Zmc2V0U3RyaW5nLnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgbnVtYmVyID0gdGhpcy5udW1iZXJGb3JtYXQuZm9ybWF0KHZhbHVlIC0gdGhpcy5vZmZzZXQpO1xuXG4gICAgcmV0dXJuIHRoaXMuc3RyaW5nXG4gICAgICAgICAgICAucmVwbGFjZSgvKF58W15cXFxcXSkjL2csICckMScgKyBudW1iZXIpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxcXCMvZywgJyMnKTtcbn07XG5cbmZ1bmN0aW9uIFNlbGVjdEZvcm1hdChpZCwgb3B0aW9ucykge1xuICAgIHRoaXMuaWQgICAgICA9IGlkO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG59XG5cblNlbGVjdEZvcm1hdC5wcm90b3R5cGUuZ2V0T3B0aW9uID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgcmV0dXJuIG9wdGlvbnNbdmFsdWVdIHx8IG9wdGlvbnMub3RoZXI7XG59O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21waWxlci5qcy5tYXAiLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE0LCBZYWhvbyEgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBMaWNlbnNlLlxuU2VlIHRoZSBhY2NvbXBhbnlpbmcgTElDRU5TRSBmaWxlIGZvciB0ZXJtcy5cbiovXG5cbi8qIGpzbGludCBlc25leHQ6IHRydWUgKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgc3JjJHV0aWxzJCQgPSByZXF1aXJlKFwiLi91dGlsc1wiKSwgc3JjJGVzNSQkID0gcmVxdWlyZShcIi4vZXM1XCIpLCBzcmMkY29tcGlsZXIkJCA9IHJlcXVpcmUoXCIuL2NvbXBpbGVyXCIpLCBpbnRsJG1lc3NhZ2Vmb3JtYXQkcGFyc2VyJCQgPSByZXF1aXJlKFwiaW50bC1tZXNzYWdlZm9ybWF0LXBhcnNlclwiKTtcbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gTWVzc2FnZUZvcm1hdDtcblxuLy8gLS0gTWVzc2FnZUZvcm1hdCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBNZXNzYWdlRm9ybWF0KG1lc3NhZ2UsIGxvY2FsZXMsIGZvcm1hdHMpIHtcbiAgICAvLyBQYXJzZSBzdHJpbmcgbWVzc2FnZXMgaW50byBhbiBBU1QuXG4gICAgdmFyIGFzdCA9IHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICBNZXNzYWdlRm9ybWF0Ll9fcGFyc2UobWVzc2FnZSkgOiBtZXNzYWdlO1xuXG4gICAgaWYgKCEoYXN0ICYmIGFzdC50eXBlID09PSAnbWVzc2FnZUZvcm1hdFBhdHRlcm4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIG1lc3NhZ2UgbXVzdCBiZSBwcm92aWRlZCBhcyBhIFN0cmluZyBvciBBU1QuJyk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlcyBhIG5ldyBvYmplY3Qgd2l0aCB0aGUgc3BlY2lmaWVkIGBmb3JtYXRzYCBtZXJnZWQgd2l0aCB0aGUgZGVmYXVsdFxuICAgIC8vIGZvcm1hdHMuXG4gICAgZm9ybWF0cyA9IHRoaXMuX21lcmdlRm9ybWF0cyhNZXNzYWdlRm9ybWF0LmZvcm1hdHMsIGZvcm1hdHMpO1xuXG4gICAgLy8gRGVmaW5lZCBmaXJzdCBiZWNhdXNlIGl0J3MgdXNlZCB0byBidWlsZCB0aGUgZm9ybWF0IHBhdHRlcm4uXG4gICAgc3JjJGVzNSQkLmRlZmluZVByb3BlcnR5KHRoaXMsICdfbG9jYWxlJywgIHt2YWx1ZTogdGhpcy5fcmVzb2x2ZUxvY2FsZShsb2NhbGVzKX0pO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgYGFzdGAgdG8gYSBwYXR0ZXJuIHRoYXQgaXMgaGlnaGx5IG9wdGltaXplZCBmb3IgcmVwZWF0ZWRcbiAgICAvLyBgZm9ybWF0KClgIGludm9jYXRpb25zLiAqKk5vdGU6KiogVGhpcyBwYXNzZXMgdGhlIGBsb2NhbGVzYCBzZXQgcHJvdmlkZWRcbiAgICAvLyB0byB0aGUgY29uc3RydWN0b3IgaW5zdGVhZCBvZiBqdXN0IHRoZSByZXNvbHZlZCBsb2NhbGUuXG4gICAgdmFyIHBsdXJhbEZuID0gdGhpcy5fZmluZFBsdXJhbFJ1bGVGdW5jdGlvbih0aGlzLl9sb2NhbGUpO1xuICAgIHZhciBwYXR0ZXJuICA9IHRoaXMuX2NvbXBpbGVQYXR0ZXJuKGFzdCwgbG9jYWxlcywgZm9ybWF0cywgcGx1cmFsRm4pO1xuXG4gICAgLy8gXCJCaW5kXCIgYGZvcm1hdCgpYCBtZXRob2QgdG8gYHRoaXNgIHNvIGl0IGNhbiBiZSBwYXNzZWQgYnkgcmVmZXJlbmNlIGxpa2VcbiAgICAvLyB0aGUgb3RoZXIgYEludGxgIEFQSXMuXG4gICAgdmFyIG1lc3NhZ2VGb3JtYXQgPSB0aGlzO1xuICAgIHRoaXMuZm9ybWF0ID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICByZXR1cm4gbWVzc2FnZUZvcm1hdC5fZm9ybWF0KHBhdHRlcm4sIHZhbHVlcyk7XG4gICAgfTtcbn1cblxuLy8gRGVmYXVsdCBmb3JtYXQgb3B0aW9ucyB1c2VkIGFzIHRoZSBwcm90b3R5cGUgb2YgdGhlIGBmb3JtYXRzYCBwcm92aWRlZCB0byB0aGVcbi8vIGNvbnN0cnVjdG9yLiBUaGVzZSBhcmUgdXNlZCB3aGVuIGNvbnN0cnVjdGluZyB0aGUgaW50ZXJuYWwgSW50bC5OdW1iZXJGb3JtYXRcbi8vIGFuZCBJbnRsLkRhdGVUaW1lRm9ybWF0IGluc3RhbmNlcy5cbnNyYyRlczUkJC5kZWZpbmVQcm9wZXJ0eShNZXNzYWdlRm9ybWF0LCAnZm9ybWF0cycsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuXG4gICAgdmFsdWU6IHtcbiAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICAnY3VycmVuY3knOiB7XG4gICAgICAgICAgICAgICAgc3R5bGU6ICdjdXJyZW5jeSdcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICdwZXJjZW50Jzoge1xuICAgICAgICAgICAgICAgIHN0eWxlOiAncGVyY2VudCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBkYXRlOiB7XG4gICAgICAgICAgICAnc2hvcnQnOiB7XG4gICAgICAgICAgICAgICAgbW9udGg6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICBkYXkgIDogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgIHllYXIgOiAnMi1kaWdpdCdcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICdtZWRpdW0nOiB7XG4gICAgICAgICAgICAgICAgbW9udGg6ICdzaG9ydCcsXG4gICAgICAgICAgICAgICAgZGF5ICA6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICB5ZWFyIDogJ251bWVyaWMnXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAnbG9uZyc6IHtcbiAgICAgICAgICAgICAgICBtb250aDogJ2xvbmcnLFxuICAgICAgICAgICAgICAgIGRheSAgOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgeWVhciA6ICdudW1lcmljJ1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgJ2Z1bGwnOiB7XG4gICAgICAgICAgICAgICAgd2Vla2RheTogJ2xvbmcnLFxuICAgICAgICAgICAgICAgIG1vbnRoICA6ICdsb25nJyxcbiAgICAgICAgICAgICAgICBkYXkgICAgOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgeWVhciAgIDogJ251bWVyaWMnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgdGltZToge1xuICAgICAgICAgICAgJ3Nob3J0Jzoge1xuICAgICAgICAgICAgICAgIGhvdXIgIDogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgIG1pbnV0ZTogJ251bWVyaWMnXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAnbWVkaXVtJzogIHtcbiAgICAgICAgICAgICAgICBob3VyICA6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICBtaW51dGU6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICBzZWNvbmQ6ICdudW1lcmljJ1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgJ2xvbmcnOiB7XG4gICAgICAgICAgICAgICAgaG91ciAgICAgICAgOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgbWludXRlICAgICAgOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgc2Vjb25kICAgICAgOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgdGltZVpvbmVOYW1lOiAnc2hvcnQnXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAnZnVsbCc6IHtcbiAgICAgICAgICAgICAgICBob3VyICAgICAgICA6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICBtaW51dGUgICAgICA6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICBzZWNvbmQgICAgICA6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICB0aW1lWm9uZU5hbWU6ICdzaG9ydCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vLyBEZWZpbmUgaW50ZXJuYWwgcHJpdmF0ZSBwcm9wZXJ0aWVzIGZvciBkZWFsaW5nIHdpdGggbG9jYWxlIGRhdGEuXG5zcmMkZXM1JCQuZGVmaW5lUHJvcGVydHkoTWVzc2FnZUZvcm1hdCwgJ19fbG9jYWxlRGF0YV9fJywge3ZhbHVlOiBzcmMkZXM1JCQub2JqQ3JlYXRlKG51bGwpfSk7XG5zcmMkZXM1JCQuZGVmaW5lUHJvcGVydHkoTWVzc2FnZUZvcm1hdCwgJ19fYWRkTG9jYWxlRGF0YScsIHt2YWx1ZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoIShkYXRhICYmIGRhdGEubG9jYWxlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnTG9jYWxlIGRhdGEgcHJvdmlkZWQgdG8gSW50bE1lc3NhZ2VGb3JtYXQgaXMgbWlzc2luZyBhICcgK1xuICAgICAgICAgICAgJ2Bsb2NhbGVgIHByb3BlcnR5J1xuICAgICAgICApO1xuICAgIH1cblxuICAgIE1lc3NhZ2VGb3JtYXQuX19sb2NhbGVEYXRhX19bZGF0YS5sb2NhbGUudG9Mb3dlckNhc2UoKV0gPSBkYXRhO1xufX0pO1xuXG4vLyBEZWZpbmVzIGBfX3BhcnNlKClgIHN0YXRpYyBtZXRob2QgYXMgYW4gZXhwb3NlZCBwcml2YXRlLlxuc3JjJGVzNSQkLmRlZmluZVByb3BlcnR5KE1lc3NhZ2VGb3JtYXQsICdfX3BhcnNlJywge3ZhbHVlOiBpbnRsJG1lc3NhZ2Vmb3JtYXQkcGFyc2VyJCRbXCJkZWZhdWx0XCJdLnBhcnNlfSk7XG5cbi8vIERlZmluZSBwdWJsaWMgYGRlZmF1bHRMb2NhbGVgIHByb3BlcnR5IHdoaWNoIGRlZmF1bHRzIHRvIEVuZ2xpc2gsIGJ1dCBjYW4gYmVcbi8vIHNldCBieSB0aGUgZGV2ZWxvcGVyLlxuc3JjJGVzNSQkLmRlZmluZVByb3BlcnR5KE1lc3NhZ2VGb3JtYXQsICdkZWZhdWx0TG9jYWxlJywge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGUgIDogdHJ1ZSxcbiAgICB2YWx1ZSAgICAgOiB1bmRlZmluZWRcbn0pO1xuXG5NZXNzYWdlRm9ybWF0LnByb3RvdHlwZS5yZXNvbHZlZE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogUHJvdmlkZSBhbnl0aGluZyBlbHNlP1xuICAgIHJldHVybiB7XG4gICAgICAgIGxvY2FsZTogdGhpcy5fbG9jYWxlXG4gICAgfTtcbn07XG5cbk1lc3NhZ2VGb3JtYXQucHJvdG90eXBlLl9jb21waWxlUGF0dGVybiA9IGZ1bmN0aW9uIChhc3QsIGxvY2FsZXMsIGZvcm1hdHMsIHBsdXJhbEZuKSB7XG4gICAgdmFyIGNvbXBpbGVyID0gbmV3IHNyYyRjb21waWxlciQkW1wiZGVmYXVsdFwiXShsb2NhbGVzLCBmb3JtYXRzLCBwbHVyYWxGbik7XG4gICAgcmV0dXJuIGNvbXBpbGVyLmNvbXBpbGUoYXN0KTtcbn07XG5cbk1lc3NhZ2VGb3JtYXQucHJvdG90eXBlLl9maW5kUGx1cmFsUnVsZUZ1bmN0aW9uID0gZnVuY3Rpb24gKGxvY2FsZSkge1xuICAgIHZhciBsb2NhbGVEYXRhID0gTWVzc2FnZUZvcm1hdC5fX2xvY2FsZURhdGFfXztcbiAgICB2YXIgZGF0YSAgICAgICA9IGxvY2FsZURhdGFbbG9jYWxlLnRvTG93ZXJDYXNlKCldO1xuXG4gICAgLy8gVGhlIGxvY2FsZSBkYXRhIGlzIGRlLWR1cGxpY2F0ZWQsIHNvIHdlIGhhdmUgdG8gdHJhdmVyc2UgdGhlIGxvY2FsZSdzXG4gICAgLy8gaGllcmFyY2h5IHVudGlsIHdlIGZpbmQgYSBgcGx1cmFsUnVsZUZ1bmN0aW9uYCB0byByZXR1cm4uXG4gICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEucGx1cmFsUnVsZUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS5wbHVyYWxSdWxlRnVuY3Rpb247XG4gICAgICAgIH1cblxuICAgICAgICBkYXRhID0gZGF0YS5wYXJlbnRMb2NhbGUgJiYgbG9jYWxlRGF0YVtkYXRhLnBhcmVudExvY2FsZS50b0xvd2VyQ2FzZSgpXTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdMb2NhbGUgZGF0YSBhZGRlZCB0byBJbnRsTWVzc2FnZUZvcm1hdCBpcyBtaXNzaW5nIGEgJyArXG4gICAgICAgICdgcGx1cmFsUnVsZUZ1bmN0aW9uYCBmb3IgOicgKyBsb2NhbGVcbiAgICApO1xufTtcblxuTWVzc2FnZUZvcm1hdC5wcm90b3R5cGUuX2Zvcm1hdCA9IGZ1bmN0aW9uIChwYXR0ZXJuLCB2YWx1ZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gJycsXG4gICAgICAgIGksIGxlbiwgcGFydCwgaWQsIHZhbHVlO1xuXG4gICAgZm9yIChpID0gMCwgbGVuID0gcGF0dGVybi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBwYXJ0ID0gcGF0dGVybltpXTtcblxuICAgICAgICAvLyBFeGlzdCBlYXJseSBmb3Igc3RyaW5nIHBhcnRzLlxuICAgICAgICBpZiAodHlwZW9mIHBhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gcGFydDtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWQgPSBwYXJ0LmlkO1xuXG4gICAgICAgIC8vIEVuZm9yY2UgdGhhdCBhbGwgcmVxdWlyZWQgdmFsdWVzIGFyZSBwcm92aWRlZCBieSB0aGUgY2FsbGVyLlxuICAgICAgICBpZiAoISh2YWx1ZXMgJiYgc3JjJHV0aWxzJCQuaG9wLmNhbGwodmFsdWVzLCBpZCkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgdmFsdWUgbXVzdCBiZSBwcm92aWRlZCBmb3I6ICcgKyBpZCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YWx1ZSA9IHZhbHVlc1tpZF07XG5cbiAgICAgICAgLy8gUmVjdXJzaXZlbHkgZm9ybWF0IHBsdXJhbCBhbmQgc2VsZWN0IHBhcnRzJyBvcHRpb24g4oCUIHdoaWNoIGNhbiBiZSBhXG4gICAgICAgIC8vIG5lc3RlZCBwYXR0ZXJuIHN0cnVjdHVyZS4gVGhlIGNob29zaW5nIG9mIHRoZSBvcHRpb24gdG8gdXNlIGlzXG4gICAgICAgIC8vIGFic3RyYWN0ZWQtYnkgYW5kIGRlbGVnYXRlZC10byB0aGUgcGFydCBoZWxwZXIgb2JqZWN0LlxuICAgICAgICBpZiAocGFydC5vcHRpb25zKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gdGhpcy5fZm9ybWF0KHBhcnQuZ2V0T3B0aW9uKHZhbHVlKSwgdmFsdWVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBwYXJ0LmZvcm1hdCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuTWVzc2FnZUZvcm1hdC5wcm90b3R5cGUuX21lcmdlRm9ybWF0cyA9IGZ1bmN0aW9uIChkZWZhdWx0cywgZm9ybWF0cykge1xuICAgIHZhciBtZXJnZWRGb3JtYXRzID0ge30sXG4gICAgICAgIHR5cGUsIG1lcmdlZFR5cGU7XG5cbiAgICBmb3IgKHR5cGUgaW4gZGVmYXVsdHMpIHtcbiAgICAgICAgaWYgKCFzcmMkdXRpbHMkJC5ob3AuY2FsbChkZWZhdWx0cywgdHlwZSkpIHsgY29udGludWU7IH1cblxuICAgICAgICBtZXJnZWRGb3JtYXRzW3R5cGVdID0gbWVyZ2VkVHlwZSA9IHNyYyRlczUkJC5vYmpDcmVhdGUoZGVmYXVsdHNbdHlwZV0pO1xuXG4gICAgICAgIGlmIChmb3JtYXRzICYmIHNyYyR1dGlscyQkLmhvcC5jYWxsKGZvcm1hdHMsIHR5cGUpKSB7XG4gICAgICAgICAgICBzcmMkdXRpbHMkJC5leHRlbmQobWVyZ2VkVHlwZSwgZm9ybWF0c1t0eXBlXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWVyZ2VkRm9ybWF0cztcbn07XG5cbk1lc3NhZ2VGb3JtYXQucHJvdG90eXBlLl9yZXNvbHZlTG9jYWxlID0gZnVuY3Rpb24gKGxvY2FsZXMpIHtcbiAgICBpZiAodHlwZW9mIGxvY2FsZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGxvY2FsZXMgPSBbbG9jYWxlc107XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgY29weSBvZiB0aGUgYXJyYXkgc28gd2UgY2FuIHB1c2ggb24gdGhlIGRlZmF1bHQgbG9jYWxlLlxuICAgIGxvY2FsZXMgPSAobG9jYWxlcyB8fCBbXSkuY29uY2F0KE1lc3NhZ2VGb3JtYXQuZGVmYXVsdExvY2FsZSk7XG5cbiAgICB2YXIgbG9jYWxlRGF0YSA9IE1lc3NhZ2VGb3JtYXQuX19sb2NhbGVEYXRhX187XG4gICAgdmFyIGksIGxlbiwgbG9jYWxlUGFydHMsIGRhdGE7XG5cbiAgICAvLyBVc2luZyB0aGUgc2V0IG9mIGxvY2FsZXMgKyB0aGUgZGVmYXVsdCBsb2NhbGUsIHdlIGxvb2sgZm9yIHRoZSBmaXJzdCBvbmVcbiAgICAvLyB3aGljaCB0aGF0IGhhcyBiZWVuIHJlZ2lzdGVyZWQuIFdoZW4gZGF0YSBkb2VzIG5vdCBleGlzdCBmb3IgYSBsb2NhbGUsIHdlXG4gICAgLy8gdHJhdmVyc2UgaXRzIGFuY2VzdG9ycyB0byBmaW5kIHNvbWV0aGluZyB0aGF0J3MgYmVlbiByZWdpc3RlcmVkIHdpdGhpblxuICAgIC8vIGl0cyBoaWVyYXJjaHkgb2YgbG9jYWxlcy4gU2luY2Ugd2UgbGFjayB0aGUgcHJvcGVyIGBwYXJlbnRMb2NhbGVgIGRhdGFcbiAgICAvLyBoZXJlLCB3ZSBtdXN0IHRha2UgYSBuYWl2ZSBhcHByb2FjaCB0byB0cmF2ZXJzYWwuXG4gICAgZm9yIChpID0gMCwgbGVuID0gbG9jYWxlcy5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBsb2NhbGVQYXJ0cyA9IGxvY2FsZXNbaV0udG9Mb3dlckNhc2UoKS5zcGxpdCgnLScpO1xuXG4gICAgICAgIHdoaWxlIChsb2NhbGVQYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGRhdGEgPSBsb2NhbGVEYXRhW2xvY2FsZVBhcnRzLmpvaW4oJy0nKV07XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgbm9ybWFsaXplZCBsb2NhbGUgc3RyaW5nOyBlLmcuLCB3ZSByZXR1cm4gXCJlbi1VU1wiLFxuICAgICAgICAgICAgICAgIC8vIGluc3RlYWQgb2YgXCJlbi11c1wiLlxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLmxvY2FsZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG9jYWxlUGFydHMucG9wKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdExvY2FsZSA9IGxvY2FsZXMucG9wKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnTm8gbG9jYWxlIGRhdGEgaGFzIGJlZW4gYWRkZWQgdG8gSW50bE1lc3NhZ2VGb3JtYXQgZm9yOiAnICtcbiAgICAgICAgbG9jYWxlcy5qb2luKCcsICcpICsgJywgb3IgdGhlIGRlZmF1bHQgbG9jYWxlOiAnICsgZGVmYXVsdExvY2FsZVxuICAgICk7XG59O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb3JlLmpzLm1hcCIsIi8vIEdFTkVSQVRFRCBGSUxFXG5cInVzZSBzdHJpY3RcIjtcbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0ge1wibG9jYWxlXCI6XCJlblwiLFwicGx1cmFsUnVsZUZ1bmN0aW9uXCI6ZnVuY3Rpb24gKG4sb3JkKXt2YXIgcz1TdHJpbmcobikuc3BsaXQoXCIuXCIpLHYwPSFzWzFdLHQwPU51bWJlcihzWzBdKT09bixuMTA9dDAmJnNbMF0uc2xpY2UoLTEpLG4xMDA9dDAmJnNbMF0uc2xpY2UoLTIpO2lmKG9yZClyZXR1cm4gbjEwPT0xJiZuMTAwIT0xMT9cIm9uZVwiOm4xMD09MiYmbjEwMCE9MTI/XCJ0d29cIjpuMTA9PTMmJm4xMDAhPTEzP1wiZmV3XCI6XCJvdGhlclwiO3JldHVybiBuPT0xJiZ2MD9cIm9uZVwiOlwib3RoZXJcIn19O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lbi5qcy5tYXAiLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE0LCBZYWhvbyEgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBMaWNlbnNlLlxuU2VlIHRoZSBhY2NvbXBhbnlpbmcgTElDRU5TRSBmaWxlIGZvciB0ZXJtcy5cbiovXG5cbi8qIGpzbGludCBlc25leHQ6IHRydWUgKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgc3JjJHV0aWxzJCQgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcblxuLy8gUHVycG9zZWx5IHVzaW5nIHRoZSBzYW1lIGltcGxlbWVudGF0aW9uIGFzIHRoZSBJbnRsLmpzIGBJbnRsYCBwb2x5ZmlsbC5cbi8vIENvcHlyaWdodCAyMDEzIEFuZHkgRWFybnNoYXcsIE1JVCBMaWNlbnNlXG5cbnZhciByZWFsRGVmaW5lUHJvcCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHsgcmV0dXJuICEhT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAnYScsIHt9KTsgfVxuICAgIGNhdGNoIChlKSB7IHJldHVybiBmYWxzZTsgfVxufSkoKTtcblxudmFyIGVzMyA9ICFyZWFsRGVmaW5lUHJvcCAmJiAhT2JqZWN0LnByb3RvdHlwZS5fX2RlZmluZUdldHRlcl9fO1xuXG52YXIgZGVmaW5lUHJvcGVydHkgPSByZWFsRGVmaW5lUHJvcCA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSA6XG4gICAgICAgIGZ1bmN0aW9uIChvYmosIG5hbWUsIGRlc2MpIHtcblxuICAgIGlmICgnZ2V0JyBpbiBkZXNjICYmIG9iai5fX2RlZmluZUdldHRlcl9fKSB7XG4gICAgICAgIG9iai5fX2RlZmluZUdldHRlcl9fKG5hbWUsIGRlc2MuZ2V0KTtcbiAgICB9IGVsc2UgaWYgKCFzcmMkdXRpbHMkJC5ob3AuY2FsbChvYmosIG5hbWUpIHx8ICd2YWx1ZScgaW4gZGVzYykge1xuICAgICAgICBvYmpbbmFtZV0gPSBkZXNjLnZhbHVlO1xuICAgIH1cbn07XG5cbnZhciBvYmpDcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90bywgcHJvcHMpIHtcbiAgICB2YXIgb2JqLCBrO1xuXG4gICAgZnVuY3Rpb24gRigpIHt9XG4gICAgRi5wcm90b3R5cGUgPSBwcm90bztcbiAgICBvYmogPSBuZXcgRigpO1xuXG4gICAgZm9yIChrIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChzcmMkdXRpbHMkJC5ob3AuY2FsbChwcm9wcywgaykpIHtcbiAgICAgICAgICAgIGRlZmluZVByb3BlcnR5KG9iaiwgaywgcHJvcHNba10pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5leHBvcnRzLmRlZmluZVByb3BlcnR5ID0gZGVmaW5lUHJvcGVydHksIGV4cG9ydHMub2JqQ3JlYXRlID0gb2JqQ3JlYXRlO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lczUuanMubWFwIiwiLyoganNsaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG5cInVzZSBzdHJpY3RcIjtcbnZhciBzcmMkY29yZSQkID0gcmVxdWlyZShcIi4vY29yZVwiKSwgc3JjJGVuJCQgPSByZXF1aXJlKFwiLi9lblwiKTtcblxuc3JjJGNvcmUkJFtcImRlZmF1bHRcIl0uX19hZGRMb2NhbGVEYXRhKHNyYyRlbiQkW1wiZGVmYXVsdFwiXSk7XG5zcmMkY29yZSQkW1wiZGVmYXVsdFwiXS5kZWZhdWx0TG9jYWxlID0gJ2VuJztcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBzcmMkY29yZSQkW1wiZGVmYXVsdFwiXTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFpbi5qcy5tYXAiLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE0LCBZYWhvbyEgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBMaWNlbnNlLlxuU2VlIHRoZSBhY2NvbXBhbnlpbmcgTElDRU5TRSBmaWxlIGZvciB0ZXJtcy5cbiovXG5cbi8qIGpzbGludCBlc25leHQ6IHRydWUgKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDtcbnZhciBob3AgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gICAgdmFyIHNvdXJjZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICBpLCBsZW4sIHNvdXJjZSwga2V5O1xuXG4gICAgZm9yIChpID0gMCwgbGVuID0gc291cmNlcy5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBzb3VyY2UgPSBzb3VyY2VzW2ldO1xuICAgICAgICBpZiAoIXNvdXJjZSkgeyBjb250aW51ZTsgfVxuXG4gICAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKGhvcC5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIG9ialtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufVxuZXhwb3J0cy5ob3AgPSBob3A7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0aWxzLmpzLm1hcCIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvcGFyc2VyJylbJ2RlZmF1bHQnXTtcbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGV4cG9ydHM7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSAoZnVuY3Rpb24oKSB7XG4gIC8qXG4gICAqIEdlbmVyYXRlZCBieSBQRUcuanMgMC44LjAuXG4gICAqXG4gICAqIGh0dHA6Ly9wZWdqcy5tYWpkYS5jei9cbiAgICovXG5cbiAgZnVuY3Rpb24gcGVnJHN1YmNsYXNzKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBmdW5jdGlvbiBjdG9yKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH1cbiAgICBjdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIFN5bnRheEVycm9yKG1lc3NhZ2UsIGV4cGVjdGVkLCBmb3VuZCwgb2Zmc2V0LCBsaW5lLCBjb2x1bW4pIHtcbiAgICB0aGlzLm1lc3NhZ2UgID0gbWVzc2FnZTtcbiAgICB0aGlzLmV4cGVjdGVkID0gZXhwZWN0ZWQ7XG4gICAgdGhpcy5mb3VuZCAgICA9IGZvdW5kO1xuICAgIHRoaXMub2Zmc2V0ICAgPSBvZmZzZXQ7XG4gICAgdGhpcy5saW5lICAgICA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gICA9IGNvbHVtbjtcblxuICAgIHRoaXMubmFtZSAgICAgPSBcIlN5bnRheEVycm9yXCI7XG4gIH1cblxuICBwZWckc3ViY2xhc3MoU3ludGF4RXJyb3IsIEVycm9yKTtcblxuICBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB7fSxcblxuICAgICAgICBwZWckRkFJTEVEID0ge30sXG5cbiAgICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9ucyA9IHsgc3RhcnQ6IHBlZyRwYXJzZXN0YXJ0IH0sXG4gICAgICAgIHBlZyRzdGFydFJ1bGVGdW5jdGlvbiAgPSBwZWckcGFyc2VzdGFydCxcblxuICAgICAgICBwZWckYzAgPSBbXSxcbiAgICAgICAgcGVnJGMxID0gZnVuY3Rpb24oZWxlbWVudHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlICAgIDogJ21lc3NhZ2VGb3JtYXRQYXR0ZXJuJyxcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHM6IGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIHBlZyRjMiA9IHBlZyRGQUlMRUQsXG4gICAgICAgIHBlZyRjMyA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RyaW5nID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGksIGosIG91dGVyTGVuLCBpbm5lciwgaW5uZXJMZW47XG5cbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBvdXRlckxlbiA9IHRleHQubGVuZ3RoOyBpIDwgb3V0ZXJMZW47IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpbm5lciA9IHRleHRbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMCwgaW5uZXJMZW4gPSBpbm5lci5sZW5ndGg7IGogPCBpbm5lckxlbjsgaiArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmcgKz0gaW5uZXJbal07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgcGVnJGM0ID0gZnVuY3Rpb24obWVzc2FnZVRleHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ21lc3NhZ2VUZXh0RWxlbWVudCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBtZXNzYWdlVGV4dFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICBwZWckYzUgPSAvXlteIFxcdFxcblxcciwuKz17fSNdLyxcbiAgICAgICAgcGVnJGM2ID0geyB0eXBlOiBcImNsYXNzXCIsIHZhbHVlOiBcIlteIFxcXFx0XFxcXG5cXFxcciwuKz17fSNdXCIsIGRlc2NyaXB0aW9uOiBcIlteIFxcXFx0XFxcXG5cXFxcciwuKz17fSNdXCIgfSxcbiAgICAgICAgcGVnJGM3ID0gXCJ7XCIsXG4gICAgICAgIHBlZyRjOCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIntcIiwgZGVzY3JpcHRpb246IFwiXFxcIntcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM5ID0gbnVsbCxcbiAgICAgICAgcGVnJGMxMCA9IFwiLFwiLFxuICAgICAgICBwZWckYzExID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiLFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiLFxcXCJcIiB9LFxuICAgICAgICBwZWckYzEyID0gXCJ9XCIsXG4gICAgICAgIHBlZyRjMTMgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJ9XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ9XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTQgPSBmdW5jdGlvbihpZCwgZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSAgOiAnYXJndW1lbnRFbGVtZW50JyxcbiAgICAgICAgICAgICAgICAgICAgaWQgICAgOiBpZCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBmb3JtYXQgJiYgZm9ybWF0WzJdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIHBlZyRjMTUgPSBcIm51bWJlclwiLFxuICAgICAgICBwZWckYzE2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJudW1iZXJcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxNyA9IFwiZGF0ZVwiLFxuICAgICAgICBwZWckYzE4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiZGF0ZVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiZGF0ZVxcXCJcIiB9LFxuICAgICAgICBwZWckYzE5ID0gXCJ0aW1lXCIsXG4gICAgICAgIHBlZyRjMjAgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJ0aW1lXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ0aW1lXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjEgPSBmdW5jdGlvbih0eXBlLCBzdHlsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiB0eXBlICsgJ0Zvcm1hdCcsXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiBzdHlsZSAmJiBzdHlsZVsyXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICBwZWckYzIyID0gXCJwbHVyYWxcIixcbiAgICAgICAgcGVnJGMyMyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcInBsdXJhbFwiLCBkZXNjcmlwdGlvbjogXCJcXFwicGx1cmFsXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjQgPSBmdW5jdGlvbihwbHVyYWxTdHlsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgICA6IHBsdXJhbFN0eWxlLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIG9yZGluYWw6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgOiBwbHVyYWxTdHlsZS5vZmZzZXQgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogcGx1cmFsU3R5bGUub3B0aW9uc1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICBwZWckYzI1ID0gXCJzZWxlY3RvcmRpbmFsXCIsXG4gICAgICAgIHBlZyRjMjYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJzZWxlY3RvcmRpbmFsXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJzZWxlY3RvcmRpbmFsXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMjcgPSBmdW5jdGlvbihwbHVyYWxTdHlsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgICA6IHBsdXJhbFN0eWxlLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIG9yZGluYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA6IHBsdXJhbFN0eWxlLm9mZnNldCB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBwbHVyYWxTdHlsZS5vcHRpb25zXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgcGVnJGMyOCA9IFwic2VsZWN0XCIsXG4gICAgICAgIHBlZyRjMjkgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJzZWxlY3RcIiwgZGVzY3JpcHRpb246IFwiXFxcInNlbGVjdFxcXCJcIiB9LFxuICAgICAgICBwZWckYzMwID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgICA6ICdzZWxlY3RGb3JtYXQnLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIHBlZyRjMzEgPSBcIj1cIixcbiAgICAgICAgcGVnJGMzMiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIj1cIiwgZGVzY3JpcHRpb246IFwiXFxcIj1cXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzMyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBwYXR0ZXJuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSAgICA6ICdvcHRpb25hbEZvcm1hdFBhdHRlcm4nLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgOiBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIHBlZyRjMzQgPSBcIm9mZnNldDpcIixcbiAgICAgICAgcGVnJGMzNSA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm9mZnNldDpcIiwgZGVzY3JpcHRpb246IFwiXFxcIm9mZnNldDpcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMzNiA9IGZ1bmN0aW9uKG51bWJlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICBwZWckYzM3ID0gZnVuY3Rpb24ob2Zmc2V0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSAgIDogJ3BsdXJhbEZvcm1hdCcsXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA6IG9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICBwZWckYzM4ID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcIndoaXRlc3BhY2VcIiB9LFxuICAgICAgICBwZWckYzM5ID0gL15bIFxcdFxcblxccl0vLFxuICAgICAgICBwZWckYzQwID0geyB0eXBlOiBcImNsYXNzXCIsIHZhbHVlOiBcIlsgXFxcXHRcXFxcblxcXFxyXVwiLCBkZXNjcmlwdGlvbjogXCJbIFxcXFx0XFxcXG5cXFxccl1cIiB9LFxuICAgICAgICBwZWckYzQxID0geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBcIm9wdGlvbmFsV2hpdGVzcGFjZVwiIH0sXG4gICAgICAgIHBlZyRjNDIgPSAvXlswLTldLyxcbiAgICAgICAgcGVnJGM0MyA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbMC05XVwiLCBkZXNjcmlwdGlvbjogXCJbMC05XVwiIH0sXG4gICAgICAgIHBlZyRjNDQgPSAvXlswLTlhLWZdL2ksXG4gICAgICAgIHBlZyRjNDUgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiWzAtOWEtZl1pXCIsIGRlc2NyaXB0aW9uOiBcIlswLTlhLWZdaVwiIH0sXG4gICAgICAgIHBlZyRjNDYgPSBcIjBcIixcbiAgICAgICAgcGVnJGM0NyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIjBcIiwgZGVzY3JpcHRpb246IFwiXFxcIjBcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM0OCA9IC9eWzEtOV0vLFxuICAgICAgICBwZWckYzQ5ID0geyB0eXBlOiBcImNsYXNzXCIsIHZhbHVlOiBcIlsxLTldXCIsIGRlc2NyaXB0aW9uOiBcIlsxLTldXCIgfSxcbiAgICAgICAgcGVnJGM1MCA9IGZ1bmN0aW9uKGRpZ2l0cykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KGRpZ2l0cywgMTApO1xuICAgICAgICB9LFxuICAgICAgICBwZWckYzUxID0gL15bXnt9XFxcXFxcMC1cXHgxRn8gXFx0XFxuXFxyXS8sXG4gICAgICAgIHBlZyRjNTIgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiW157fVxcXFxcXFxcXFxcXDAtXFxcXHgxRn8gXFxcXHRcXFxcblxcXFxyXVwiLCBkZXNjcmlwdGlvbjogXCJbXnt9XFxcXFxcXFxcXFxcMC1cXFxceDFGfyBcXFxcdFxcXFxuXFxcXHJdXCIgfSxcbiAgICAgICAgcGVnJGM1MyA9IFwiXFxcXFxcXFxcIixcbiAgICAgICAgcGVnJGM1NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIlxcXFxcXFxcXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJcXFxcXFxcXFxcXFxcXFxcXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNTUgPSBmdW5jdGlvbigpIHsgcmV0dXJuICdcXFxcJzsgfSxcbiAgICAgICAgcGVnJGM1NiA9IFwiXFxcXCNcIixcbiAgICAgICAgcGVnJGM1NyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIlxcXFwjXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJcXFxcXFxcXCNcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM1OCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJ1xcXFwjJzsgfSxcbiAgICAgICAgcGVnJGM1OSA9IFwiXFxcXHtcIixcbiAgICAgICAgcGVnJGM2MCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIlxcXFx7XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJcXFxcXFxcXHtcXFwiXCIgfSxcbiAgICAgICAgcGVnJGM2MSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJ1xcdTAwN0InOyB9LFxuICAgICAgICBwZWckYzYyID0gXCJcXFxcfVwiLFxuICAgICAgICBwZWckYzYzID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiXFxcXH1cIiwgZGVzY3JpcHRpb246IFwiXFxcIlxcXFxcXFxcfVxcXCJcIiB9LFxuICAgICAgICBwZWckYzY0ID0gZnVuY3Rpb24oKSB7IHJldHVybiAnXFx1MDA3RCc7IH0sXG4gICAgICAgIHBlZyRjNjUgPSBcIlxcXFx1XCIsXG4gICAgICAgIHBlZyRjNjYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJcXFxcdVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiXFxcXFxcXFx1XFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNjcgPSBmdW5jdGlvbihkaWdpdHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShwYXJzZUludChkaWdpdHMsIDE2KSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICBwZWckYzY4ID0gZnVuY3Rpb24oY2hhcnMpIHsgcmV0dXJuIGNoYXJzLmpvaW4oJycpOyB9LFxuXG4gICAgICAgIHBlZyRjdXJyUG9zICAgICAgICAgID0gMCxcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zICAgICAgPSAwLFxuICAgICAgICBwZWckY2FjaGVkUG9zICAgICAgICA9IDAsXG4gICAgICAgIHBlZyRjYWNoZWRQb3NEZXRhaWxzID0geyBsaW5lOiAxLCBjb2x1bW46IDEsIHNlZW5DUjogZmFsc2UgfSxcbiAgICAgICAgcGVnJG1heEZhaWxQb3MgICAgICAgPSAwLFxuICAgICAgICBwZWckbWF4RmFpbEV4cGVjdGVkICA9IFtdLFxuICAgICAgICBwZWckc2lsZW50RmFpbHMgICAgICA9IDAsXG5cbiAgICAgICAgcGVnJHJlc3VsdDtcblxuICAgIGlmIChcInN0YXJ0UnVsZVwiIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmICghKG9wdGlvbnMuc3RhcnRSdWxlIGluIHBlZyRzdGFydFJ1bGVGdW5jdGlvbnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHN0YXJ0IHBhcnNpbmcgZnJvbSBydWxlIFxcXCJcIiArIG9wdGlvbnMuc3RhcnRSdWxlICsgXCJcXFwiLlwiKTtcbiAgICAgIH1cblxuICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uID0gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uc1tvcHRpb25zLnN0YXJ0UnVsZV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGV4dCgpIHtcbiAgICAgIHJldHVybiBpbnB1dC5zdWJzdHJpbmcocGVnJHJlcG9ydGVkUG9zLCBwZWckY3VyclBvcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2Zmc2V0KCkge1xuICAgICAgcmV0dXJuIHBlZyRyZXBvcnRlZFBvcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaW5lKCkge1xuICAgICAgcmV0dXJuIHBlZyRjb21wdXRlUG9zRGV0YWlscyhwZWckcmVwb3J0ZWRQb3MpLmxpbmU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sdW1uKCkge1xuICAgICAgcmV0dXJuIHBlZyRjb21wdXRlUG9zRGV0YWlscyhwZWckcmVwb3J0ZWRQb3MpLmNvbHVtbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHBlY3RlZChkZXNjcmlwdGlvbikge1xuICAgICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKFxuICAgICAgICBudWxsLFxuICAgICAgICBbeyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbiB9XSxcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zXG4gICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UpIHtcbiAgICAgIHRocm93IHBlZyRidWlsZEV4Y2VwdGlvbihtZXNzYWdlLCBudWxsLCBwZWckcmVwb3J0ZWRQb3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRjb21wdXRlUG9zRGV0YWlscyhwb3MpIHtcbiAgICAgIGZ1bmN0aW9uIGFkdmFuY2UoZGV0YWlscywgc3RhcnRQb3MsIGVuZFBvcykge1xuICAgICAgICB2YXIgcCwgY2g7XG5cbiAgICAgICAgZm9yIChwID0gc3RhcnRQb3M7IHAgPCBlbmRQb3M7IHArKykge1xuICAgICAgICAgIGNoID0gaW5wdXQuY2hhckF0KHApO1xuICAgICAgICAgIGlmIChjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgaWYgKCFkZXRhaWxzLnNlZW5DUikgeyBkZXRhaWxzLmxpbmUrKzsgfVxuICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4gPSAxO1xuICAgICAgICAgICAgZGV0YWlscy5zZWVuQ1IgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIlxcclwiIHx8IGNoID09PSBcIlxcdTIwMjhcIiB8fCBjaCA9PT0gXCJcXHUyMDI5XCIpIHtcbiAgICAgICAgICAgIGRldGFpbHMubGluZSsrO1xuICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4gPSAxO1xuICAgICAgICAgICAgZGV0YWlscy5zZWVuQ1IgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXRhaWxzLmNvbHVtbisrO1xuICAgICAgICAgICAgZGV0YWlscy5zZWVuQ1IgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHBlZyRjYWNoZWRQb3MgIT09IHBvcykge1xuICAgICAgICBpZiAocGVnJGNhY2hlZFBvcyA+IHBvcykge1xuICAgICAgICAgIHBlZyRjYWNoZWRQb3MgPSAwO1xuICAgICAgICAgIHBlZyRjYWNoZWRQb3NEZXRhaWxzID0geyBsaW5lOiAxLCBjb2x1bW46IDEsIHNlZW5DUjogZmFsc2UgfTtcbiAgICAgICAgfVxuICAgICAgICBhZHZhbmNlKHBlZyRjYWNoZWRQb3NEZXRhaWxzLCBwZWckY2FjaGVkUG9zLCBwb3MpO1xuICAgICAgICBwZWckY2FjaGVkUG9zID0gcG9zO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGVnJGNhY2hlZFBvc0RldGFpbHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJGZhaWwoZXhwZWN0ZWQpIHtcbiAgICAgIGlmIChwZWckY3VyclBvcyA8IHBlZyRtYXhGYWlsUG9zKSB7IHJldHVybjsgfVxuXG4gICAgICBpZiAocGVnJGN1cnJQb3MgPiBwZWckbWF4RmFpbFBvcykge1xuICAgICAgICBwZWckbWF4RmFpbFBvcyA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBwZWckbWF4RmFpbEV4cGVjdGVkID0gW107XG4gICAgICB9XG5cbiAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQucHVzaChleHBlY3RlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJGJ1aWxkRXhjZXB0aW9uKG1lc3NhZ2UsIGV4cGVjdGVkLCBwb3MpIHtcbiAgICAgIGZ1bmN0aW9uIGNsZWFudXBFeHBlY3RlZChleHBlY3RlZCkge1xuICAgICAgICB2YXIgaSA9IDE7XG5cbiAgICAgICAgZXhwZWN0ZWQuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgaWYgKGEuZGVzY3JpcHRpb24gPCBiLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgfSBlbHNlIGlmIChhLmRlc2NyaXB0aW9uID4gYi5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBleHBlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgICBpZiAoZXhwZWN0ZWRbaSAtIDFdID09PSBleHBlY3RlZFtpXSkge1xuICAgICAgICAgICAgZXhwZWN0ZWQuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGJ1aWxkTWVzc2FnZShleHBlY3RlZCwgZm91bmQpIHtcbiAgICAgICAgZnVuY3Rpb24gc3RyaW5nRXNjYXBlKHMpIHtcbiAgICAgICAgICBmdW5jdGlvbiBoZXgoY2gpIHsgcmV0dXJuIGNoLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH1cblxuICAgICAgICAgIHJldHVybiBzXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAgICdcXFxcXFxcXCcpXG4gICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgICAgJ1xcXFxcIicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx4MDgvZywgJ1xcXFxiJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHQvZywgICAnXFxcXHQnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAgICdcXFxcbicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxmL2csICAgJ1xcXFxmJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgICAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHgwMC1cXHgwN1xceDBCXFx4MEVcXHgwRl0vZywgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxceDAnICsgaGV4KGNoKTsgfSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx4MTAtXFx4MUZcXHg4MC1cXHhGRl0vZywgICAgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxceCcgICsgaGV4KGNoKTsgfSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx1MDE4MC1cXHUwRkZGXS9nLCAgICAgICAgIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHUwJyArIGhleChjaCk7IH0pXG4gICAgICAgICAgICAucmVwbGFjZSgvW1xcdTEwODAtXFx1RkZGRl0vZywgICAgICAgICBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx1JyAgKyBoZXgoY2gpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBleHBlY3RlZERlc2NzID0gbmV3IEFycmF5KGV4cGVjdGVkLmxlbmd0aCksXG4gICAgICAgICAgICBleHBlY3RlZERlc2MsIGZvdW5kRGVzYywgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXhwZWN0ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBleHBlY3RlZERlc2NzW2ldID0gZXhwZWN0ZWRbaV0uZGVzY3JpcHRpb247XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3RlZERlc2MgPSBleHBlY3RlZC5sZW5ndGggPiAxXG4gICAgICAgICAgPyBleHBlY3RlZERlc2NzLnNsaWNlKDAsIC0xKS5qb2luKFwiLCBcIilcbiAgICAgICAgICAgICAgKyBcIiBvciBcIlxuICAgICAgICAgICAgICArIGV4cGVjdGVkRGVzY3NbZXhwZWN0ZWQubGVuZ3RoIC0gMV1cbiAgICAgICAgICA6IGV4cGVjdGVkRGVzY3NbMF07XG5cbiAgICAgICAgZm91bmREZXNjID0gZm91bmQgPyBcIlxcXCJcIiArIHN0cmluZ0VzY2FwZShmb3VuZCkgKyBcIlxcXCJcIiA6IFwiZW5kIG9mIGlucHV0XCI7XG5cbiAgICAgICAgcmV0dXJuIFwiRXhwZWN0ZWQgXCIgKyBleHBlY3RlZERlc2MgKyBcIiBidXQgXCIgKyBmb3VuZERlc2MgKyBcIiBmb3VuZC5cIjtcbiAgICAgIH1cblxuICAgICAgdmFyIHBvc0RldGFpbHMgPSBwZWckY29tcHV0ZVBvc0RldGFpbHMocG9zKSxcbiAgICAgICAgICBmb3VuZCAgICAgID0gcG9zIDwgaW5wdXQubGVuZ3RoID8gaW5wdXQuY2hhckF0KHBvcykgOiBudWxsO1xuXG4gICAgICBpZiAoZXhwZWN0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgY2xlYW51cEV4cGVjdGVkKGV4cGVjdGVkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgbWVzc2FnZSAhPT0gbnVsbCA/IG1lc3NhZ2UgOiBidWlsZE1lc3NhZ2UoZXhwZWN0ZWQsIGZvdW5kKSxcbiAgICAgICAgZXhwZWN0ZWQsXG4gICAgICAgIGZvdW5kLFxuICAgICAgICBwb3MsXG4gICAgICAgIHBvc0RldGFpbHMubGluZSxcbiAgICAgICAgcG9zRGV0YWlscy5jb2x1bW5cbiAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlc3RhcnQoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlbWVzc2FnZUZvcm1hdFBhdHRlcm4oKTtcblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW1lc3NhZ2VGb3JtYXRQYXR0ZXJuKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczI7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgczIgPSBwZWckcGFyc2VtZXNzYWdlRm9ybWF0RWxlbWVudCgpO1xuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBzMiA9IHBlZyRwYXJzZW1lc3NhZ2VGb3JtYXRFbGVtZW50KCk7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgIHMxID0gcGVnJGMxKHMxKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VtZXNzYWdlRm9ybWF0RWxlbWVudCgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgczAgPSBwZWckcGFyc2VtZXNzYWdlVGV4dEVsZW1lbnQoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZWFyZ3VtZW50RWxlbWVudCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbWVzc2FnZVRleHQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gW107XG4gICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczQgPSBwZWckcGFyc2VjaGFycygpO1xuICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzNSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gW3MzLCBzNCwgczVdO1xuICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICBzMiA9IHBlZyRjMjtcbiAgICAgIH1cbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VjaGFycygpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMyA9IFtzMywgczQsIHM1XTtcbiAgICAgICAgICAgICAgICBzMiA9IHMzO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgICAgczIgPSBwZWckYzI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgczIgPSBwZWckYzI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRjMjtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgczEgPSBwZWckYzMoczEpO1xuICAgICAgfVxuICAgICAgczAgPSBzMTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IHBlZyRwYXJzZXdzKCk7XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyaW5nKHMwLCBwZWckY3VyclBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW1lc3NhZ2VUZXh0RWxlbWVudCgpIHtcbiAgICAgIHZhciBzMCwgczE7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZW1lc3NhZ2VUZXh0KCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgIHMxID0gcGVnJGM0KHMxKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vhcmd1bWVudCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZW51bWJlcigpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gW107XG4gICAgICAgIGlmIChwZWckYzUudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICAgICAgaWYgKHBlZyRjNS50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzYpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMxID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMxID0gaW5wdXQuc3Vic3RyaW5nKHMwLCBwZWckY3VyclBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWFyZ3VtZW50RWxlbWVudCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAxMjMpIHtcbiAgICAgICAgczEgPSBwZWckYzc7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM4KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZWFyZ3VtZW50KCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNSA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgczYgPSBwZWckYzEwO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgczYgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMSk7IH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlZWxlbWVudEZvcm1hdCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM2ID0gW3M2LCBzNywgczhdO1xuICAgICAgICAgICAgICAgICAgICBzNSA9IHM2O1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNTtcbiAgICAgICAgICAgICAgICAgICAgczUgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczU7XG4gICAgICAgICAgICAgICAgICBzNSA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzNTtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczUgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRjOTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTI1KSB7XG4gICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJGMxMjtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEzKTsgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMTQoczMsIHM1KTtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlZWxlbWVudEZvcm1hdCgpIHtcbiAgICAgIHZhciBzMDtcblxuICAgICAgczAgPSBwZWckcGFyc2VzaW1wbGVGb3JtYXQoKTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZXBsdXJhbEZvcm1hdCgpO1xuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMCA9IHBlZyRwYXJzZXNlbGVjdE9yZGluYWxGb3JtYXQoKTtcbiAgICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMwID0gcGVnJHBhcnNlc2VsZWN0Rm9ybWF0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzaW1wbGVGb3JtYXQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczY7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KSA9PT0gcGVnJGMxNSkge1xuICAgICAgICBzMSA9IHBlZyRjMTU7XG4gICAgICAgIHBlZyRjdXJyUG9zICs9IDY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxNik7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KSA9PT0gcGVnJGMxNykge1xuICAgICAgICAgIHMxID0gcGVnJGMxNztcbiAgICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTgpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkgPT09IHBlZyRjMTkpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJGMxOTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMyMCk7IH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRjMTA7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTEpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VjaGFycygpO1xuICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNCA9IFtzNCwgczUsIHM2XTtcbiAgICAgICAgICAgICAgICBzMyA9IHM0O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgICAgczMgPSBwZWckYzI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgIHMzID0gcGVnJGMyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgczMgPSBwZWckYzI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSBwZWckYzk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMjEoczEsIHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VwbHVyYWxGb3JtYXQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDYpID09PSBwZWckYzIyKSB7XG4gICAgICAgIHMxID0gcGVnJGMyMjtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gNjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzIzKTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMTA7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTEpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VwbHVyYWxTdHlsZSgpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMjQoczUpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzZWxlY3RPcmRpbmFsRm9ybWF0KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczU7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMykgPT09IHBlZyRjMjUpIHtcbiAgICAgICAgczEgPSBwZWckYzI1O1xuICAgICAgICBwZWckY3VyclBvcyArPSAxMztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzI2KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMTA7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTEpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VwbHVyYWxTdHlsZSgpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMjcoczUpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzZWxlY3RGb3JtYXQoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczY7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KSA9PT0gcGVnJGMyOCkge1xuICAgICAgICBzMSA9IHBlZyRjMjg7XG4gICAgICAgIHBlZyRjdXJyUG9zICs9IDY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMyOSk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgczMgPSBwZWckYzEwO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzExKTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gW107XG4gICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlb3B0aW9uYWxGb3JtYXRQYXR0ZXJuKCk7XG4gICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgczUucHVzaChzNik7XG4gICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZW9wdGlvbmFsRm9ybWF0UGF0dGVybigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNSA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMzAoczUpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzZWxlY3RvcigpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDYxKSB7XG4gICAgICAgIHMyID0gcGVnJGMzMTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzMyKTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMzID0gcGVnJHBhcnNlbnVtYmVyKCk7XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gW3MyLCBzM107XG4gICAgICAgICAgczEgPSBzMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgIHMxID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICBzMSA9IHBlZyRjMjtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IGlucHV0LnN1YnN0cmluZyhzMCwgcGVnJGN1cnJQb3MpO1xuICAgICAgfVxuICAgICAgczAgPSBzMTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRwYXJzZWNoYXJzKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VvcHRpb25hbEZvcm1hdFBhdHRlcm4oKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3LCBzODtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlXygpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNlc2VsZWN0b3IoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEyMykge1xuICAgICAgICAgICAgICBzNCA9IHBlZyRjNztcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzgpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlbWVzc2FnZUZvcm1hdFBhdHRlcm4oKTtcbiAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTI1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgczggPSBwZWckYzEyO1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgczggPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMyk7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczggIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMzMoczIsIHM2KTtcbiAgICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlb2Zmc2V0KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNykgPT09IHBlZyRjMzQpIHtcbiAgICAgICAgczEgPSBwZWckYzM0O1xuICAgICAgICBwZWckY3VyclBvcyArPSA3O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzUpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMzID0gcGVnJHBhcnNlbnVtYmVyKCk7XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzNihzMyk7XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlcGx1cmFsU3R5bGUoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBwZWckcGFyc2VvZmZzZXQoKTtcbiAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRjOTtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICBzNCA9IHBlZyRwYXJzZW9wdGlvbmFsRm9ybWF0UGF0dGVybigpO1xuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgd2hpbGUgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHMzLnB1c2goczQpO1xuICAgICAgICAgICAgICBzNCA9IHBlZyRwYXJzZW9wdGlvbmFsRm9ybWF0UGF0dGVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzNyhzMSwgczMpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXdzKCkge1xuICAgICAgdmFyIHMwLCBzMTtcblxuICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICBzMCA9IFtdO1xuICAgICAgaWYgKHBlZyRjMzkudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0MCk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMC5wdXNoKHMxKTtcbiAgICAgICAgICBpZiAocGVnJGMzOS50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzMSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDApOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgIH1cbiAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM4KTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlXygpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgczIgPSBwZWckcGFyc2V3cygpO1xuICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICBzMiA9IHBlZyRwYXJzZXdzKCk7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBpbnB1dC5zdWJzdHJpbmcoczAsIHBlZyRjdXJyUG9zKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG4gICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM0MSk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWRpZ2l0KCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBpZiAocGVnJGM0Mi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMwID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQzKTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlaGV4RGlnaXQoKSB7XG4gICAgICB2YXIgczA7XG5cbiAgICAgIGlmIChwZWckYzQ0LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczAgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDUpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VudW1iZXIoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDgpIHtcbiAgICAgICAgczEgPSBwZWckYzQ2O1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDcpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEgPSBwZWckY3VyclBvcztcbiAgICAgICAgczIgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKHBlZyRjNDgudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgIHMzID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDkpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczQgPSBbXTtcbiAgICAgICAgICBzNSA9IHBlZyRwYXJzZWRpZ2l0KCk7XG4gICAgICAgICAgd2hpbGUgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNC5wdXNoKHM1KTtcbiAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlZGlnaXQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IFtzMywgczRdO1xuICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMjtcbiAgICAgICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgIHMyID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gaW5wdXQuc3Vic3RyaW5nKHMxLCBwZWckY3VyclBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgczEgPSBzMjtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgczEgPSBwZWckYzUwKHMxKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VjaGFyKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNztcblxuICAgICAgaWYgKHBlZyRjNTEudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM1Mik7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKSA9PT0gcGVnJGM1Mykge1xuICAgICAgICAgIHMxID0gcGVnJGM1MztcbiAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTQpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzU1KCk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKSA9PT0gcGVnJGM1Nikge1xuICAgICAgICAgICAgczEgPSBwZWckYzU2O1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzU3KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzU4KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMikgPT09IHBlZyRjNTkpIHtcbiAgICAgICAgICAgICAgczEgPSBwZWckYzU5O1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjApOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgIHMxID0gcGVnJGM2MSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKSA9PT0gcGVnJGM2Mikge1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGM2MjtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjMpOyB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczEgPSBwZWckYzY0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKSA9PT0gcGVnJGM2NSkge1xuICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzY1O1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzY2KTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgIHMyID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgICBzMyA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICAgICAgczQgPSBwZWckcGFyc2VoZXhEaWdpdCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlaGV4RGlnaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VoZXhEaWdpdCgpO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckcGFyc2VoZXhEaWdpdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gW3M0LCBzNSwgczYsIHM3XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgczMgPSBzNDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgICAgICAgICAgczMgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgICAgICAgICAgczMgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczM7XG4gICAgICAgICAgICAgICAgICAgIHMzID0gcGVnJGMyO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzID0gaW5wdXQuc3Vic3RyaW5nKHMyLCBwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBzMiA9IHMzO1xuICAgICAgICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNjcoczIpO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWNoYXJzKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczI7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgczIgPSBwZWckcGFyc2VjaGFyKCk7XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgICAgczIgPSBwZWckcGFyc2VjaGFyKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJGMyO1xuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICBzMSA9IHBlZyRjNjgoczEpO1xuICAgICAgfVxuICAgICAgczAgPSBzMTtcblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIHBlZyRyZXN1bHQgPSBwZWckc3RhcnRSdWxlRnVuY3Rpb24oKTtcblxuICAgIGlmIChwZWckcmVzdWx0ICE9PSBwZWckRkFJTEVEICYmIHBlZyRjdXJyUG9zID09PSBpbnB1dC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBwZWckcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocGVnJHJlc3VsdCAhPT0gcGVnJEZBSUxFRCAmJiBwZWckY3VyclBvcyA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBwZWckZmFpbCh7IHR5cGU6IFwiZW5kXCIsIGRlc2NyaXB0aW9uOiBcImVuZCBvZiBpbnB1dFwiIH0pO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBwZWckYnVpbGRFeGNlcHRpb24obnVsbCwgcGVnJG1heEZhaWxFeHBlY3RlZCwgcGVnJG1heEZhaWxQb3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgU3ludGF4RXJyb3I6IFN5bnRheEVycm9yLFxuICAgIHBhcnNlOiAgICAgICBwYXJzZVxuICB9O1xufSkoKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGFyc2VyLmpzLm1hcCIsIkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlblwiLFwicGx1cmFsUnVsZUZ1bmN0aW9uXCI6ZnVuY3Rpb24gKG4sb3JkKXt2YXIgcz1TdHJpbmcobikuc3BsaXQoXCIuXCIpLHYwPSFzWzFdLHQwPU51bWJlcihzWzBdKT09bixuMTA9dDAmJnNbMF0uc2xpY2UoLTEpLG4xMDA9dDAmJnNbMF0uc2xpY2UoLTIpO2lmKG9yZClyZXR1cm4gbjEwPT0xJiZuMTAwIT0xMT9cIm9uZVwiOm4xMD09MiYmbjEwMCE9MTI/XCJ0d29cIjpuMTA9PTMmJm4xMDAhPTEzP1wiZmV3XCI6XCJvdGhlclwiO3JldHVybiBuPT0xJiZ2MD9cIm9uZVwiOlwib3RoZXJcIn0sXCJmaWVsZHNcIjp7XCJ5ZWFyXCI6e1wiZGlzcGxheU5hbWVcIjpcInllYXJcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwidGhpcyB5ZWFyXCIsXCIxXCI6XCJuZXh0IHllYXJcIixcIi0xXCI6XCJsYXN0IHllYXJcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImluIHswfSB5ZWFyXCIsXCJvdGhlclwiOlwiaW4gezB9IHllYXJzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiezB9IHllYXIgYWdvXCIsXCJvdGhlclwiOlwiezB9IHllYXJzIGFnb1wifX19LFwibW9udGhcIjp7XCJkaXNwbGF5TmFtZVwiOlwibW9udGhcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwidGhpcyBtb250aFwiLFwiMVwiOlwibmV4dCBtb250aFwiLFwiLTFcIjpcImxhc3QgbW9udGhcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImluIHswfSBtb250aFwiLFwib3RoZXJcIjpcImluIHswfSBtb250aHNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJ7MH0gbW9udGggYWdvXCIsXCJvdGhlclwiOlwiezB9IG1vbnRocyBhZ29cIn19fSxcImRheVwiOntcImRpc3BsYXlOYW1lXCI6XCJkYXlcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwidG9kYXlcIixcIjFcIjpcInRvbW9ycm93XCIsXCItMVwiOlwieWVzdGVyZGF5XCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJpbiB7MH0gZGF5XCIsXCJvdGhlclwiOlwiaW4gezB9IGRheXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJ7MH0gZGF5IGFnb1wiLFwib3RoZXJcIjpcInswfSBkYXlzIGFnb1wifX19LFwiaG91clwiOntcImRpc3BsYXlOYW1lXCI6XCJob3VyXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImluIHswfSBob3VyXCIsXCJvdGhlclwiOlwiaW4gezB9IGhvdXJzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiezB9IGhvdXIgYWdvXCIsXCJvdGhlclwiOlwiezB9IGhvdXJzIGFnb1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1pbnV0ZVwiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJpbiB7MH0gbWludXRlXCIsXCJvdGhlclwiOlwiaW4gezB9IG1pbnV0ZXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJ7MH0gbWludXRlIGFnb1wiLFwib3RoZXJcIjpcInswfSBtaW51dGVzIGFnb1wifX19LFwic2Vjb25kXCI6e1wiZGlzcGxheU5hbWVcIjpcInNlY29uZFwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJub3dcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImluIHswfSBzZWNvbmRcIixcIm90aGVyXCI6XCJpbiB7MH0gc2Vjb25kc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcInswfSBzZWNvbmQgYWdvXCIsXCJvdGhlclwiOlwiezB9IHNlY29uZHMgYWdvXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tMDAxXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi0xNTBcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1BR1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUFJXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQVNcIixcInBhcmVudExvY2FsZVwiOlwiZW5cIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUFUXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTE1MFwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQVVcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1CQlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUJFXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQklcIixcInBhcmVudExvY2FsZVwiOlwiZW5cIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUJNXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQlNcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1CV1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUJaXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQ0FcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1DQ1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUNIXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTE1MFwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQ0tcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1DTVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUNYXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tQ1lcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1ERVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0xNTBcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLURHXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tREtcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMTUwXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1ETVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLURzcnRcIixcInBsdXJhbFJ1bGVGdW5jdGlvblwiOmZ1bmN0aW9uIChuLG9yZCl7aWYob3JkKXJldHVyblwib3RoZXJcIjtyZXR1cm5cIm90aGVyXCJ9LFwiZmllbGRzXCI6e1wieWVhclwiOntcImRpc3BsYXlOYW1lXCI6XCJZZWFyXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcInRoaXMgeWVhclwiLFwiMVwiOlwibmV4dCB5ZWFyXCIsXCItMVwiOlwibGFzdCB5ZWFyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib3RoZXJcIjpcIit7MH0geVwifSxcInBhc3RcIjp7XCJvdGhlclwiOlwiLXswfSB5XCJ9fX0sXCJtb250aFwiOntcImRpc3BsYXlOYW1lXCI6XCJNb250aFwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0aGlzIG1vbnRoXCIsXCIxXCI6XCJuZXh0IG1vbnRoXCIsXCItMVwiOlwibGFzdCBtb250aFwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm90aGVyXCI6XCIrezB9IG1cIn0sXCJwYXN0XCI6e1wib3RoZXJcIjpcIi17MH0gbVwifX19LFwiZGF5XCI6e1wiZGlzcGxheU5hbWVcIjpcIkRheVwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0b2RheVwiLFwiMVwiOlwidG9tb3Jyb3dcIixcIi0xXCI6XCJ5ZXN0ZXJkYXlcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvdGhlclwiOlwiK3swfSBkXCJ9LFwicGFzdFwiOntcIm90aGVyXCI6XCItezB9IGRcIn19fSxcImhvdXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiSG91clwiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib3RoZXJcIjpcIit7MH0gaFwifSxcInBhc3RcIjp7XCJvdGhlclwiOlwiLXswfSBoXCJ9fX0sXCJtaW51dGVcIjp7XCJkaXNwbGF5TmFtZVwiOlwiTWludXRlXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvdGhlclwiOlwiK3swfSBtaW5cIn0sXCJwYXN0XCI6e1wib3RoZXJcIjpcIi17MH0gbWluXCJ9fX0sXCJzZWNvbmRcIjp7XCJkaXNwbGF5TmFtZVwiOlwiU2Vjb25kXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcIm5vd1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm90aGVyXCI6XCIrezB9IHNcIn0sXCJwYXN0XCI6e1wib3RoZXJcIjpcIi17MH0gc1wifX19fX0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUVSXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tRklcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMTUwXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1GSlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUZLXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tRk1cIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1HQlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUdEXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tR0dcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1HSFwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUdJXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tR01cIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1HVVwiLFwicGFyZW50TG9jYWxlXCI6XCJlblwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tR1lcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1IS1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUlFXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tSUxcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1JTVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUlOXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tSU9cIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1KRVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUpNXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tS0VcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1LSVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUtOXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tS1lcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1MQ1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLUxSXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tTFNcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1NR1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLU1IXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1NT1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLU1QXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1NU1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLU1UXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tTVVcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1NV1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLU1ZXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tTkFcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1ORlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLU5HXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tTkxcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMTUwXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1OUlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLU5VXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tTlpcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1QR1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVBIXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tUEtcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1QTlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVBSXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1QV1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVJXXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tU0JcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1TQ1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVNEXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tU0VcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMTUwXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1TR1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVNIXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tU0lcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMTUwXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1TTFwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVNTXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tU1hcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1TWlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVNoYXdcIixcInBsdXJhbFJ1bGVGdW5jdGlvblwiOmZ1bmN0aW9uIChuLG9yZCl7aWYob3JkKXJldHVyblwib3RoZXJcIjtyZXR1cm5cIm90aGVyXCJ9LFwiZmllbGRzXCI6e1wieWVhclwiOntcImRpc3BsYXlOYW1lXCI6XCJZZWFyXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcInRoaXMgeWVhclwiLFwiMVwiOlwibmV4dCB5ZWFyXCIsXCItMVwiOlwibGFzdCB5ZWFyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib3RoZXJcIjpcIit7MH0geVwifSxcInBhc3RcIjp7XCJvdGhlclwiOlwiLXswfSB5XCJ9fX0sXCJtb250aFwiOntcImRpc3BsYXlOYW1lXCI6XCJNb250aFwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0aGlzIG1vbnRoXCIsXCIxXCI6XCJuZXh0IG1vbnRoXCIsXCItMVwiOlwibGFzdCBtb250aFwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm90aGVyXCI6XCIrezB9IG1cIn0sXCJwYXN0XCI6e1wib3RoZXJcIjpcIi17MH0gbVwifX19LFwiZGF5XCI6e1wiZGlzcGxheU5hbWVcIjpcIkRheVwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0b2RheVwiLFwiMVwiOlwidG9tb3Jyb3dcIixcIi0xXCI6XCJ5ZXN0ZXJkYXlcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvdGhlclwiOlwiK3swfSBkXCJ9LFwicGFzdFwiOntcIm90aGVyXCI6XCItezB9IGRcIn19fSxcImhvdXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiSG91clwiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib3RoZXJcIjpcIit7MH0gaFwifSxcInBhc3RcIjp7XCJvdGhlclwiOlwiLXswfSBoXCJ9fX0sXCJtaW51dGVcIjp7XCJkaXNwbGF5TmFtZVwiOlwiTWludXRlXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvdGhlclwiOlwiK3swfSBtaW5cIn0sXCJwYXN0XCI6e1wib3RoZXJcIjpcIi17MH0gbWluXCJ9fX0sXCJzZWNvbmRcIjp7XCJkaXNwbGF5TmFtZVwiOlwiU2Vjb25kXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcIm5vd1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm90aGVyXCI6XCIrezB9IHNcIn0sXCJwYXN0XCI6e1wib3RoZXJcIjpcIi17MH0gc1wifX19fX0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVRDXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tVEtcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1UT1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVRUXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tVFZcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1UWlwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVVHXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tVU1cIixcInBhcmVudExvY2FsZVwiOlwiZW5cIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVVTXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1WQ1wiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVZHXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tVklcIixcInBhcmVudExvY2FsZVwiOlwiZW5cIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVZVXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tV1NcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlbi1aQVwiLFwicGFyZW50TG9jYWxlXCI6XCJlbi0wMDFcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVuLVpNXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVuLTAwMVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZW4tWldcIixcInBhcmVudExvY2FsZVwiOlwiZW4tMDAxXCJ9KTtcbiIsIkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlc1wiLFwicGx1cmFsUnVsZUZ1bmN0aW9uXCI6ZnVuY3Rpb24gKG4sb3JkKXtpZihvcmQpcmV0dXJuXCJvdGhlclwiO3JldHVybiBuPT0xP1wib25lXCI6XCJvdGhlclwifSxcImZpZWxkc1wiOntcInllYXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiYcOxb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIGHDsW9cIixcIjFcIjpcImVsIHByw7N4aW1vIGHDsW9cIixcIi0xXCI6XCJlbCBhw7FvIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBhw7Fvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGHDsW9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBhw7Fvc1wifX19LFwibW9udGhcIjp7XCJkaXNwbGF5TmFtZVwiOlwibWVzXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgbWVzXCIsXCIxXCI6XCJlbCBwcsOzeGltbyBtZXNcIixcIi0xXCI6XCJlbCBtZXMgcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1lc1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWVzZXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBtZXNcIixcIm90aGVyXCI6XCJoYWNlIHswfSBtZXNlc1wifX19LFwiZGF5XCI6e1wiZGlzcGxheU5hbWVcIjpcImTDrWFcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiaG95XCIsXCIxXCI6XCJtYcOxYW5hXCIsXCIyXCI6XCJwYXNhZG8gbWHDsWFuYVwiLFwiLTJcIjpcImFudGVheWVyXCIsXCItMVwiOlwiYXllclwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBkw61hXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBkw61hc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGTDrWFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBkw61hc1wifX19LFwiaG91clwiOntcImRpc3BsYXlOYW1lXCI6XCJob3JhXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gaG9yYVwiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gaG9yYXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gaG9yYXNcIn19fSxcIm1pbnV0ZVwiOntcImRpc3BsYXlOYW1lXCI6XCJtaW51dG9cIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBtaW51dG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBtaW51dG9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBtaW51dG9zXCJ9fX0sXCJzZWNvbmRcIjp7XCJkaXNwbGF5TmFtZVwiOlwic2VndW5kb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJhaG9yYVwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBzZWd1bmRvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBzZWd1bmRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBzZWd1bmRvc1wifX19fX0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLTQxOVwiLFwicGFyZW50TG9jYWxlXCI6XCJlc1wifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtQVJcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1CT1wiLFwicGFyZW50TG9jYWxlXCI6XCJlcy00MTlcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLUNMXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzLTQxOVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtQ09cIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1DUlwiLFwicGFyZW50TG9jYWxlXCI6XCJlcy00MTlcIixcImZpZWxkc1wiOntcInllYXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiYcOxb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIGHDsW9cIixcIjFcIjpcImVsIHByw7N4aW1vIGHDsW9cIixcIi0xXCI6XCJlbCBhw7FvIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBhw7Fvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGHDsW9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBhw7Fvc1wifX19LFwibW9udGhcIjp7XCJkaXNwbGF5TmFtZVwiOlwibWVzXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgbWVzXCIsXCIxXCI6XCJlbCBwcsOzeGltbyBtZXNcIixcIi0xXCI6XCJlbCBtZXMgcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1lc1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWVzZXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBtZXNcIixcIm90aGVyXCI6XCJoYWNlIHswfSBtZXNlc1wifX19LFwiZGF5XCI6e1wiZGlzcGxheU5hbWVcIjpcImTDrWFcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiaG95XCIsXCIxXCI6XCJtYcOxYW5hXCIsXCIyXCI6XCJwYXNhZG8gbWHDsWFuYVwiLFwiLTJcIjpcImFudGllclwiLFwiLTFcIjpcImF5ZXJcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gZMOtYXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBkw61hXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gZMOtYXNcIn19fSxcImhvdXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiaG9yYVwiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGhvcmFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGhvcmFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gaG9yYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGhvcmFzXCJ9fX0sXCJtaW51dGVcIjp7XCJkaXNwbGF5TmFtZVwiOlwibWludXRvXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gbWludXRvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBtaW51dG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gbWludXRvXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gbWludXRvc1wifX19LFwic2Vjb25kXCI6e1wiZGlzcGxheU5hbWVcIjpcInNlZ3VuZG9cIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiYWhvcmFcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gc2VndW5kb3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBzZWd1bmRvXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gc2VndW5kb3NcIn19fX19KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1DVVwiLFwicGFyZW50TG9jYWxlXCI6XCJlcy00MTlcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLURPXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzLTQxOVwiLFwiZmllbGRzXCI6e1wieWVhclwiOntcImRpc3BsYXlOYW1lXCI6XCJBw7FvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgYcOxb1wiLFwiMVwiOlwiZWwgcHLDs3hpbW8gYcOxb1wiLFwiLTFcIjpcImVsIGHDsW8gcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGHDsW9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGHDsW9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gYcOxb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IGHDsW9zXCJ9fX0sXCJtb250aFwiOntcImRpc3BsYXlOYW1lXCI6XCJNZXNcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiZXN0ZSBtZXNcIixcIjFcIjpcImVsIHByw7N4aW1vIG1lc1wiLFwiLTFcIjpcImVsIG1lcyBwYXNhZG9cIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBtZXNlc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1lc1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1lc2VzXCJ9fX0sXCJkYXlcIjp7XCJkaXNwbGF5TmFtZVwiOlwiRMOtYVwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJob3lcIixcIjFcIjpcIm1hw7FhbmFcIixcIjJcIjpcInBhc2FkbyBtYcOxYW5hXCIsXCItMlwiOlwiYW50ZWF5ZXJcIixcIi0xXCI6XCJheWVyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGTDrWFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGTDrWFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGTDrWFzXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvcmFcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBob3Jhc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGhvcmFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBob3Jhc1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIk1pbnV0b1wiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWludXRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1pbnV0b3NcIn19fSxcInNlY29uZFwiOntcImRpc3BsYXlOYW1lXCI6XCJTZWd1bmRvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImFob3JhXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IHNlZ3VuZG9zXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtRUFcIixcInBhcmVudExvY2FsZVwiOlwiZXNcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLUVDXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzLTQxOVwifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtR1FcIixcInBhcmVudExvY2FsZVwiOlwiZXNcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLUdUXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzLTQxOVwiLFwiZmllbGRzXCI6e1wieWVhclwiOntcImRpc3BsYXlOYW1lXCI6XCJhw7FvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgYcOxb1wiLFwiMVwiOlwiZWwgcHLDs3hpbW8gYcOxb1wiLFwiLTFcIjpcImVsIGHDsW8gcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGHDsW9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGHDsW9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gYcOxb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IGHDsW9zXCJ9fX0sXCJtb250aFwiOntcImRpc3BsYXlOYW1lXCI6XCJtZXNcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiZXN0ZSBtZXNcIixcIjFcIjpcImVsIHByw7N4aW1vIG1lc1wiLFwiLTFcIjpcImVsIG1lcyBwYXNhZG9cIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBtZXNlc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1lc1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1lc2VzXCJ9fX0sXCJkYXlcIjp7XCJkaXNwbGF5TmFtZVwiOlwiZMOtYVwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJob3lcIixcIjFcIjpcIm1hw7FhbmFcIixcIjJcIjpcInBhc2FkbyBtYcOxYW5hXCIsXCItMlwiOlwiYW50aWVyXCIsXCItMVwiOlwiYXllclwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBkw61hXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBkw61hc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGTDrWFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBkw61hc1wifX19LFwiaG91clwiOntcImRpc3BsYXlOYW1lXCI6XCJob3JhXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gaG9yYVwiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gaG9yYXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gaG9yYXNcIn19fSxcIm1pbnV0ZVwiOntcImRpc3BsYXlOYW1lXCI6XCJtaW51dG9cIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBtaW51dG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBtaW51dG9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBtaW51dG9zXCJ9fX0sXCJzZWNvbmRcIjp7XCJkaXNwbGF5TmFtZVwiOlwic2VndW5kb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJhaG9yYVwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBzZWd1bmRvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBzZWd1bmRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBzZWd1bmRvc1wifX19fX0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLUhOXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzLTQxOVwiLFwiZmllbGRzXCI6e1wieWVhclwiOntcImRpc3BsYXlOYW1lXCI6XCJhw7FvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgYcOxb1wiLFwiMVwiOlwiZWwgcHLDs3hpbW8gYcOxb1wiLFwiLTFcIjpcImVsIGHDsW8gcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGHDsW9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGHDsW9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gYcOxb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IGHDsW9zXCJ9fX0sXCJtb250aFwiOntcImRpc3BsYXlOYW1lXCI6XCJtZXNcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiZXN0ZSBtZXNcIixcIjFcIjpcImVsIHByw7N4aW1vIG1lc1wiLFwiLTFcIjpcImVsIG1lcyBwYXNhZG9cIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBtZXNlc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1lc1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1lc2VzXCJ9fX0sXCJkYXlcIjp7XCJkaXNwbGF5TmFtZVwiOlwiZMOtYVwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJob3lcIixcIjFcIjpcIm1hw7FhbmFcIixcIjJcIjpcInBhc2FkbyBtYcOxYW5hXCIsXCItMlwiOlwiYW50aWVyXCIsXCItMVwiOlwiYXllclwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBkw61hXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBkw61hc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGTDrWFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBkw61hc1wifX19LFwiaG91clwiOntcImRpc3BsYXlOYW1lXCI6XCJob3JhXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gaG9yYVwiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gaG9yYXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gaG9yYXNcIn19fSxcIm1pbnV0ZVwiOntcImRpc3BsYXlOYW1lXCI6XCJtaW51dG9cIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBtaW51dG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBtaW51dG9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBtaW51dG9zXCJ9fX0sXCJzZWNvbmRcIjp7XCJkaXNwbGF5TmFtZVwiOlwic2VndW5kb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJhaG9yYVwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBzZWd1bmRvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBzZWd1bmRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBzZWd1bmRvc1wifX19fX0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLUlDXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzXCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1NWFwiLFwicGFyZW50TG9jYWxlXCI6XCJlcy00MTlcIixcImZpZWxkc1wiOntcInllYXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiYcOxb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIGHDsW9cIixcIjFcIjpcImVsIGHDsW8gcHLDs3hpbW9cIixcIi0xXCI6XCJlbCBhw7FvIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBhw7Fvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGHDsW9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBhw7Fvc1wifX19LFwibW9udGhcIjp7XCJkaXNwbGF5TmFtZVwiOlwibWVzXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgbWVzXCIsXCIxXCI6XCJlbCBtZXMgcHLDs3hpbW9cIixcIi0xXCI6XCJlbCBtZXMgcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJlbiB7MH0gbWVzXCIsXCJvdGhlclwiOlwiZW4gezB9IG1lc2VzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gbWVzZXNcIn19fSxcImRheVwiOntcImRpc3BsYXlOYW1lXCI6XCJkw61hXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImhveVwiLFwiMVwiOlwibWHDsWFuYVwiLFwiMlwiOlwicGFzYWRvIG1hw7FhbmFcIixcIi0yXCI6XCJhbnRpZXJcIixcIi0xXCI6XCJheWVyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGTDrWFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGTDrWFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGTDrWFzXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvcmFcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBob3Jhc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGhvcmFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBob3Jhc1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1pbnV0b1wiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWludXRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1pbnV0b3NcIn19fSxcInNlY29uZFwiOntcImRpc3BsYXlOYW1lXCI6XCJzZWd1bmRvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImFob3JhXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IHNlZ3VuZG9zXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtTklcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCIsXCJmaWVsZHNcIjp7XCJ5ZWFyXCI6e1wiZGlzcGxheU5hbWVcIjpcImHDsW9cIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiZXN0ZSBhw7FvXCIsXCIxXCI6XCJlbCBwcsOzeGltbyBhw7FvXCIsXCItMVwiOlwiZWwgYcOxbyBwYXNhZG9cIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gYcOxb1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gYcOxb3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gYcOxb3NcIn19fSxcIm1vbnRoXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1lc1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIG1lc1wiLFwiMVwiOlwiZWwgcHLDs3hpbW8gbWVzXCIsXCItMVwiOlwiZWwgbWVzIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBtZXNcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IG1lc2VzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gbWVzZXNcIn19fSxcImRheVwiOntcImRpc3BsYXlOYW1lXCI6XCJkw61hXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImhveVwiLFwiMVwiOlwibWHDsWFuYVwiLFwiMlwiOlwicGFzYWRvIG1hw7FhbmFcIixcIi0yXCI6XCJhbnRpZXJcIixcIi0xXCI6XCJheWVyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGTDrWFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGTDrWFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGTDrWFzXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvcmFcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBob3Jhc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGhvcmFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBob3Jhc1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1pbnV0b1wiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWludXRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1pbnV0b3NcIn19fSxcInNlY29uZFwiOntcImRpc3BsYXlOYW1lXCI6XCJzZWd1bmRvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImFob3JhXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IHNlZ3VuZG9zXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtUEFcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCIsXCJmaWVsZHNcIjp7XCJ5ZWFyXCI6e1wiZGlzcGxheU5hbWVcIjpcImHDsW9cIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiZXN0ZSBhw7FvXCIsXCIxXCI6XCJlbCBwcsOzeGltbyBhw7FvXCIsXCItMVwiOlwiZWwgYcOxbyBwYXNhZG9cIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gYcOxb1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gYcOxb3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gYcOxb3NcIn19fSxcIm1vbnRoXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1lc1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIG1lc1wiLFwiMVwiOlwiZWwgcHLDs3hpbW8gbWVzXCIsXCItMVwiOlwiZWwgbWVzIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBtZXNcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IG1lc2VzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gbWVzZXNcIn19fSxcImRheVwiOntcImRpc3BsYXlOYW1lXCI6XCJkw61hXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImhveVwiLFwiMVwiOlwibWHDsWFuYVwiLFwiMlwiOlwicGFzYWRvIG1hw7FhbmFcIixcIi0yXCI6XCJhbnRpZXJcIixcIi0xXCI6XCJheWVyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGTDrWFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGTDrWFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGTDrWFzXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvcmFcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBob3Jhc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGhvcmFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBob3Jhc1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1pbnV0b1wiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWludXRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1pbnV0b3NcIn19fSxcInNlY29uZFwiOntcImRpc3BsYXlOYW1lXCI6XCJzZWd1bmRvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImFob3JhXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IHNlZ3VuZG9zXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtUEVcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1QSFwiLFwicGFyZW50TG9jYWxlXCI6XCJlc1wifSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtUFJcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1QWVwiLFwicGFyZW50TG9jYWxlXCI6XCJlcy00MTlcIixcImZpZWxkc1wiOntcInllYXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwiYcOxb1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIGHDsW9cIixcIjFcIjpcImVsIHByw7N4aW1vIGHDsW9cIixcIi0xXCI6XCJlbCBhw7FvIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBhw7Fvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGHDsW9cIixcIm90aGVyXCI6XCJoYWNlIHswfSBhw7Fvc1wifX19LFwibW9udGhcIjp7XCJkaXNwbGF5TmFtZVwiOlwibWVzXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImVzdGUgbWVzXCIsXCIxXCI6XCJlbCBwcsOzeGltbyBtZXNcIixcIi0xXCI6XCJlbCBtZXMgcGFzYWRvXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1lc1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWVzZXNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBtZXNcIixcIm90aGVyXCI6XCJoYWNlIHswfSBtZXNlc1wifX19LFwiZGF5XCI6e1wiZGlzcGxheU5hbWVcIjpcImTDrWFcIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiaG95XCIsXCIxXCI6XCJtYcOxYW5hXCIsXCIyXCI6XCJwYXNhZG8gbWHDsWFuYVwiLFwiLTJcIjpcImFudGVzIGRlIGF5ZXJcIixcIi0xXCI6XCJheWVyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGTDrWFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGTDrWFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGTDrWFzXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvcmFcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBob3Jhc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGhvcmFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBob3Jhc1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1pbnV0b1wiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWludXRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1pbnV0b3NcIn19fSxcInNlY29uZFwiOntcImRpc3BsYXlOYW1lXCI6XCJzZWd1bmRvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImFob3JhXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IHNlZ3VuZG9zXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtU1ZcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCIsXCJmaWVsZHNcIjp7XCJ5ZWFyXCI6e1wiZGlzcGxheU5hbWVcIjpcImHDsW9cIixcInJlbGF0aXZlXCI6e1wiMFwiOlwiZXN0ZSBhw7FvXCIsXCIxXCI6XCJlbCBwcsOzeGltbyBhw7FvXCIsXCItMVwiOlwiZWwgYcOxbyBwYXNhZG9cIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImRlbnRybyBkZSB7MH0gYcOxb1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gYcOxb3NcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJoYWNlIHswfSBhw7FvXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gYcOxb3NcIn19fSxcIm1vbnRoXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1lc1wiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJlc3RlIG1lc1wiLFwiMVwiOlwiZWwgcHLDs3hpbW8gbWVzXCIsXCItMVwiOlwiZWwgbWVzIHBhc2Fkb1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBtZXNcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IG1lc2VzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gbWVzXCIsXCJvdGhlclwiOlwiaGFjZSB7MH0gbWVzZXNcIn19fSxcImRheVwiOntcImRpc3BsYXlOYW1lXCI6XCJkw61hXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImhveVwiLFwiMVwiOlwibWHDsWFuYVwiLFwiMlwiOlwicGFzYWRvIG1hw7FhbmFcIixcIi0yXCI6XCJhbnRpZXJcIixcIi0xXCI6XCJheWVyXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IGTDrWFcIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IGTDrWFzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gZMOtYVwiLFwib3RoZXJcIjpcImhhY2UgezB9IGTDrWFzXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvcmFcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiZGVudHJvIGRlIHswfSBob3JhXCIsXCJvdGhlclwiOlwiZGVudHJvIGRlIHswfSBob3Jhc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IGhvcmFcIixcIm90aGVyXCI6XCJoYWNlIHswfSBob3Jhc1wifX19LFwibWludXRlXCI6e1wiZGlzcGxheU5hbWVcIjpcIm1pbnV0b1wiLFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImRlbnRybyBkZSB7MH0gbWludXRvc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcImhhY2UgezB9IG1pbnV0b1wiLFwib3RoZXJcIjpcImhhY2UgezB9IG1pbnV0b3NcIn19fSxcInNlY29uZFwiOntcImRpc3BsYXlOYW1lXCI6XCJzZWd1bmRvXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcImFob3JhXCJ9LFwicmVsYXRpdmVUaW1lXCI6e1wiZnV0dXJlXCI6e1wib25lXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9cIixcIm90aGVyXCI6XCJkZW50cm8gZGUgezB9IHNlZ3VuZG9zXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiaGFjZSB7MH0gc2VndW5kb1wiLFwib3RoZXJcIjpcImhhY2UgezB9IHNlZ3VuZG9zXCJ9fX19fSk7XG5JbnRsUmVsYXRpdmVGb3JtYXQuX19hZGRMb2NhbGVEYXRhKHtcImxvY2FsZVwiOlwiZXMtVVNcIixcInBhcmVudExvY2FsZVwiOlwiZXMtNDE5XCJ9KTtcbkludGxSZWxhdGl2ZUZvcm1hdC5fX2FkZExvY2FsZURhdGEoe1wibG9jYWxlXCI6XCJlcy1VWVwiLFwicGFyZW50TG9jYWxlXCI6XCJlcy00MTlcIn0pO1xuSW50bFJlbGF0aXZlRm9ybWF0Ll9fYWRkTG9jYWxlRGF0YSh7XCJsb2NhbGVcIjpcImVzLVZFXCIsXCJwYXJlbnRMb2NhbGVcIjpcImVzLTQxOVwifSk7XG4iLCIvKiBqc2hpbnQgbm9kZTp0cnVlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEludGxSZWxhdGl2ZUZvcm1hdCA9IHJlcXVpcmUoJy4vbGliL21haW4nKVsnZGVmYXVsdCddO1xuXG4vLyBBZGQgYWxsIGxvY2FsZSBkYXRhIHRvIGBJbnRsUmVsYXRpdmVGb3JtYXRgLiBUaGlzIG1vZHVsZSB3aWxsIGJlIGlnbm9yZWQgd2hlblxuLy8gYnVuZGxpbmcgZm9yIHRoZSBicm93c2VyIHdpdGggQnJvd3NlcmlmeS9XZWJwYWNrLlxucmVxdWlyZSgnLi9saWIvbG9jYWxlcycpO1xuXG4vLyBSZS1leHBvcnQgYEludGxSZWxhdGl2ZUZvcm1hdGAgYXMgdGhlIENvbW1vbkpTIGRlZmF1bHQgZXhwb3J0cyB3aXRoIGFsbCB0aGVcbi8vIGxvY2FsZSBkYXRhIHJlZ2lzdGVyZWQsIGFuZCB3aXRoIEVuZ2xpc2ggc2V0IGFzIHRoZSBkZWZhdWx0IGxvY2FsZS4gRGVmaW5lXG4vLyB0aGUgYGRlZmF1bHRgIHByb3AgZm9yIHVzZSB3aXRoIG90aGVyIGNvbXBpbGVkIEVTNiBNb2R1bGVzLlxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gSW50bFJlbGF0aXZlRm9ybWF0O1xuZXhwb3J0c1snZGVmYXVsdCddID0gZXhwb3J0cztcbiIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTQsIFlhaG9vISBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5Db3B5cmlnaHRzIGxpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIExpY2Vuc2UuXG5TZWUgdGhlIGFjY29tcGFueWluZyBMSUNFTlNFIGZpbGUgZm9yIHRlcm1zLlxuKi9cblxuLyoganNsaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG5cInVzZSBzdHJpY3RcIjtcbnZhciBpbnRsJG1lc3NhZ2Vmb3JtYXQkJCA9IHJlcXVpcmUoXCJpbnRsLW1lc3NhZ2Vmb3JtYXRcIiksIHNyYyRkaWZmJCQgPSByZXF1aXJlKFwiLi9kaWZmXCIpLCBzcmMkZXM1JCQgPSByZXF1aXJlKFwiLi9lczVcIik7XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IFJlbGF0aXZlRm9ybWF0O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgRklFTERTID0gWydzZWNvbmQnLCAnbWludXRlJywgJ2hvdXInLCAnZGF5JywgJ21vbnRoJywgJ3llYXInXTtcbnZhciBTVFlMRVMgPSBbJ2Jlc3QgZml0JywgJ251bWVyaWMnXTtcblxuLy8gLS0gUmVsYXRpdmVGb3JtYXQgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gUmVsYXRpdmVGb3JtYXQobG9jYWxlcywgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gTWFrZSBhIGNvcHkgb2YgYGxvY2FsZXNgIGlmIGl0J3MgYW4gYXJyYXksIHNvIHRoYXQgaXQgZG9lc24ndCBjaGFuZ2VcbiAgICAvLyBzaW5jZSBpdCdzIHVzZWQgbGF6aWx5LlxuICAgIGlmIChzcmMkZXM1JCQuaXNBcnJheShsb2NhbGVzKSkge1xuICAgICAgICBsb2NhbGVzID0gbG9jYWxlcy5jb25jYXQoKTtcbiAgICB9XG5cbiAgICBzcmMkZXM1JCQuZGVmaW5lUHJvcGVydHkodGhpcywgJ19sb2NhbGUnLCB7dmFsdWU6IHRoaXMuX3Jlc29sdmVMb2NhbGUobG9jYWxlcyl9KTtcbiAgICBzcmMkZXM1JCQuZGVmaW5lUHJvcGVydHkodGhpcywgJ19vcHRpb25zJywge3ZhbHVlOiB7XG4gICAgICAgIHN0eWxlOiB0aGlzLl9yZXNvbHZlU3R5bGUob3B0aW9ucy5zdHlsZSksXG4gICAgICAgIHVuaXRzOiB0aGlzLl9pc1ZhbGlkVW5pdHMob3B0aW9ucy51bml0cykgJiYgb3B0aW9ucy51bml0c1xuICAgIH19KTtcblxuICAgIHNyYyRlczUkJC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX2xvY2FsZXMnLCB7dmFsdWU6IGxvY2FsZXN9KTtcbiAgICBzcmMkZXM1JCQuZGVmaW5lUHJvcGVydHkodGhpcywgJ19maWVsZHMnLCB7dmFsdWU6IHRoaXMuX2ZpbmRGaWVsZHModGhpcy5fbG9jYWxlKX0pO1xuICAgIHNyYyRlczUkJC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX21lc3NhZ2VzJywge3ZhbHVlOiBzcmMkZXM1JCQub2JqQ3JlYXRlKG51bGwpfSk7XG5cbiAgICAvLyBcIkJpbmRcIiBgZm9ybWF0KClgIG1ldGhvZCB0byBgdGhpc2Agc28gaXQgY2FuIGJlIHBhc3NlZCBieSByZWZlcmVuY2UgbGlrZVxuICAgIC8vIHRoZSBvdGhlciBgSW50bGAgQVBJcy5cbiAgICB2YXIgcmVsYXRpdmVGb3JtYXQgPSB0aGlzO1xuICAgIHRoaXMuZm9ybWF0ID0gZnVuY3Rpb24gZm9ybWF0KGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0aXZlRm9ybWF0Ll9mb3JtYXQoZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcbn1cblxuLy8gRGVmaW5lIGludGVybmFsIHByaXZhdGUgcHJvcGVydGllcyBmb3IgZGVhbGluZyB3aXRoIGxvY2FsZSBkYXRhLlxuc3JjJGVzNSQkLmRlZmluZVByb3BlcnR5KFJlbGF0aXZlRm9ybWF0LCAnX19sb2NhbGVEYXRhX18nLCB7dmFsdWU6IHNyYyRlczUkJC5vYmpDcmVhdGUobnVsbCl9KTtcbnNyYyRlczUkJC5kZWZpbmVQcm9wZXJ0eShSZWxhdGl2ZUZvcm1hdCwgJ19fYWRkTG9jYWxlRGF0YScsIHt2YWx1ZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoIShkYXRhICYmIGRhdGEubG9jYWxlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnTG9jYWxlIGRhdGEgcHJvdmlkZWQgdG8gSW50bFJlbGF0aXZlRm9ybWF0IGlzIG1pc3NpbmcgYSAnICtcbiAgICAgICAgICAgICdgbG9jYWxlYCBwcm9wZXJ0eSB2YWx1ZSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBSZWxhdGl2ZUZvcm1hdC5fX2xvY2FsZURhdGFfX1tkYXRhLmxvY2FsZS50b0xvd2VyQ2FzZSgpXSA9IGRhdGE7XG5cbiAgICAvLyBBZGQgZGF0YSB0byBJbnRsTWVzc2FnZUZvcm1hdC5cbiAgICBpbnRsJG1lc3NhZ2Vmb3JtYXQkJFtcImRlZmF1bHRcIl0uX19hZGRMb2NhbGVEYXRhKGRhdGEpO1xufX0pO1xuXG4vLyBEZWZpbmUgcHVibGljIGBkZWZhdWx0TG9jYWxlYCBwcm9wZXJ0eSB3aGljaCBjYW4gYmUgc2V0IGJ5IHRoZSBkZXZlbG9wZXIsIG9yXG4vLyBpdCB3aWxsIGJlIHNldCB3aGVuIHRoZSBmaXJzdCBSZWxhdGl2ZUZvcm1hdCBpbnN0YW5jZSBpcyBjcmVhdGVkIGJ5XG4vLyBsZXZlcmFnaW5nIHRoZSByZXNvbHZlZCBsb2NhbGUgZnJvbSBgSW50bGAuXG5zcmMkZXM1JCQuZGVmaW5lUHJvcGVydHkoUmVsYXRpdmVGb3JtYXQsICdkZWZhdWx0TG9jYWxlJywge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGUgIDogdHJ1ZSxcbiAgICB2YWx1ZSAgICAgOiB1bmRlZmluZWRcbn0pO1xuXG4vLyBEZWZpbmUgcHVibGljIGB0aHJlc2hvbGRzYCBwcm9wZXJ0eSB3aGljaCBjYW4gYmUgc2V0IGJ5IHRoZSBkZXZlbG9wZXIsIGFuZFxuLy8gZGVmYXVsdHMgdG8gcmVsYXRpdmUgdGltZSB0aHJlc2hvbGRzIGZyb20gbW9tZW50LmpzLlxuc3JjJGVzNSQkLmRlZmluZVByb3BlcnR5KFJlbGF0aXZlRm9ybWF0LCAndGhyZXNob2xkcycsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuXG4gICAgdmFsdWU6IHtcbiAgICAgICAgc2Vjb25kOiA0NSwgIC8vIHNlY29uZHMgdG8gbWludXRlXG4gICAgICAgIG1pbnV0ZTogNDUsICAvLyBtaW51dGVzIHRvIGhvdXJcbiAgICAgICAgaG91ciAgOiAyMiwgIC8vIGhvdXJzIHRvIGRheVxuICAgICAgICBkYXkgICA6IDI2LCAgLy8gZGF5cyB0byBtb250aFxuICAgICAgICBtb250aCA6IDExICAgLy8gbW9udGhzIHRvIHllYXJcbiAgICB9XG59KTtcblxuUmVsYXRpdmVGb3JtYXQucHJvdG90eXBlLnJlc29sdmVkT3B0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBsb2NhbGU6IHRoaXMuX2xvY2FsZSxcbiAgICAgICAgc3R5bGUgOiB0aGlzLl9vcHRpb25zLnN0eWxlLFxuICAgICAgICB1bml0cyA6IHRoaXMuX29wdGlvbnMudW5pdHNcbiAgICB9O1xufTtcblxuUmVsYXRpdmVGb3JtYXQucHJvdG90eXBlLl9jb21waWxlTWVzc2FnZSA9IGZ1bmN0aW9uICh1bml0cykge1xuICAgIC8vIGB0aGlzLl9sb2NhbGVzYCBpcyB0aGUgb3JpZ2luYWwgc2V0IG9mIGxvY2FsZXMgdGhlIHVzZXIgc3BlY2lmaWVkIHRvIHRoZVxuICAgIC8vIGNvbnN0cnVjdG9yLCB3aGlsZSBgdGhpcy5fbG9jYWxlYCBpcyB0aGUgcmVzb2x2ZWQgcm9vdCBsb2NhbGUuXG4gICAgdmFyIGxvY2FsZXMgICAgICAgID0gdGhpcy5fbG9jYWxlcztcbiAgICB2YXIgcmVzb2x2ZWRMb2NhbGUgPSB0aGlzLl9sb2NhbGU7XG5cbiAgICB2YXIgZmllbGQgICAgICAgID0gdGhpcy5fZmllbGRzW3VuaXRzXTtcbiAgICB2YXIgcmVsYXRpdmVUaW1lID0gZmllbGQucmVsYXRpdmVUaW1lO1xuICAgIHZhciBmdXR1cmUgICAgICAgPSAnJztcbiAgICB2YXIgcGFzdCAgICAgICAgID0gJyc7XG4gICAgdmFyIGk7XG5cbiAgICBmb3IgKGkgaW4gcmVsYXRpdmVUaW1lLmZ1dHVyZSkge1xuICAgICAgICBpZiAocmVsYXRpdmVUaW1lLmZ1dHVyZS5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgZnV0dXJlICs9ICcgJyArIGkgKyAnIHsnICtcbiAgICAgICAgICAgICAgICByZWxhdGl2ZVRpbWUuZnV0dXJlW2ldLnJlcGxhY2UoJ3swfScsICcjJykgKyAnfSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGkgaW4gcmVsYXRpdmVUaW1lLnBhc3QpIHtcbiAgICAgICAgaWYgKHJlbGF0aXZlVGltZS5wYXN0Lmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBwYXN0ICs9ICcgJyArIGkgKyAnIHsnICtcbiAgICAgICAgICAgICAgICByZWxhdGl2ZVRpbWUucGFzdFtpXS5yZXBsYWNlKCd7MH0nLCAnIycpICsgJ30nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG1lc3NhZ2UgPSAne3doZW4sIHNlbGVjdCwgZnV0dXJlIHt7MCwgcGx1cmFsLCAnICsgZnV0dXJlICsgJ319JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAncGFzdCB7ezAsIHBsdXJhbCwgJyArIHBhc3QgKyAnfX19JztcblxuICAgIC8vIENyZWF0ZSB0aGUgc3ludGhldGljIEludGxNZXNzYWdlRm9ybWF0IGluc3RhbmNlIHVzaW5nIHRoZSBvcmlnaW5hbFxuICAgIC8vIGxvY2FsZXMgdmFsdWUgc3BlY2lmaWVkIGJ5IHRoZSB1c2VyIHdoZW4gY29uc3RydWN0aW5nIHRoZSB0aGUgcGFyZW50XG4gICAgLy8gSW50bFJlbGF0aXZlRm9ybWF0IGluc3RhbmNlLlxuICAgIHJldHVybiBuZXcgaW50bCRtZXNzYWdlZm9ybWF0JCRbXCJkZWZhdWx0XCJdKG1lc3NhZ2UsIGxvY2FsZXMpO1xufTtcblxuUmVsYXRpdmVGb3JtYXQucHJvdG90eXBlLl9nZXRNZXNzYWdlID0gZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgdmFyIG1lc3NhZ2VzID0gdGhpcy5fbWVzc2FnZXM7XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgc3ludGhldGljIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGxvY2FsZSBkYXRhIGZyb20gQ0xEUi5cbiAgICBpZiAoIW1lc3NhZ2VzW3VuaXRzXSkge1xuICAgICAgICBtZXNzYWdlc1t1bml0c10gPSB0aGlzLl9jb21waWxlTWVzc2FnZSh1bml0cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lc3NhZ2VzW3VuaXRzXTtcbn07XG5cblJlbGF0aXZlRm9ybWF0LnByb3RvdHlwZS5fZ2V0UmVsYXRpdmVVbml0cyA9IGZ1bmN0aW9uIChkaWZmLCB1bml0cykge1xuICAgIHZhciBmaWVsZCA9IHRoaXMuX2ZpZWxkc1t1bml0c107XG5cbiAgICBpZiAoZmllbGQucmVsYXRpdmUpIHtcbiAgICAgICAgcmV0dXJuIGZpZWxkLnJlbGF0aXZlW2RpZmZdO1xuICAgIH1cbn07XG5cblJlbGF0aXZlRm9ybWF0LnByb3RvdHlwZS5fZmluZEZpZWxkcyA9IGZ1bmN0aW9uIChsb2NhbGUpIHtcbiAgICB2YXIgbG9jYWxlRGF0YSA9IFJlbGF0aXZlRm9ybWF0Ll9fbG9jYWxlRGF0YV9fO1xuICAgIHZhciBkYXRhICAgICAgID0gbG9jYWxlRGF0YVtsb2NhbGUudG9Mb3dlckNhc2UoKV07XG5cbiAgICAvLyBUaGUgbG9jYWxlIGRhdGEgaXMgZGUtZHVwbGljYXRlZCwgc28gd2UgaGF2ZSB0byB0cmF2ZXJzZSB0aGUgbG9jYWxlJ3NcbiAgICAvLyBoaWVyYXJjaHkgdW50aWwgd2UgZmluZCBgZmllbGRzYCB0byByZXR1cm4uXG4gICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEuZmllbGRzKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS5maWVsZHM7XG4gICAgICAgIH1cblxuICAgICAgICBkYXRhID0gZGF0YS5wYXJlbnRMb2NhbGUgJiYgbG9jYWxlRGF0YVtkYXRhLnBhcmVudExvY2FsZS50b0xvd2VyQ2FzZSgpXTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdMb2NhbGUgZGF0YSBhZGRlZCB0byBJbnRsUmVsYXRpdmVGb3JtYXQgaXMgbWlzc2luZyBgZmllbGRzYCBmb3IgOicgK1xuICAgICAgICBsb2NhbGVcbiAgICApO1xufTtcblxuUmVsYXRpdmVGb3JtYXQucHJvdG90eXBlLl9mb3JtYXQgPSBmdW5jdGlvbiAoZGF0ZSwgb3B0aW9ucykge1xuICAgIHZhciBub3cgPSBvcHRpb25zICYmIG9wdGlvbnMubm93ICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5vdyA6IHNyYyRlczUkJC5kYXRlTm93KCk7XG5cbiAgICBpZiAoZGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRhdGUgPSBub3c7XG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBgZGF0ZWAgYW5kIG9wdGlvbmFsIGBub3dgIHZhbHVlcyBhcmUgdmFsaWQsIGFuZCB0aHJvdyBhXG4gICAgLy8gc2ltaWxhciBlcnJvciB0byB3aGF0IGBJbnRsLkRhdGVUaW1lRm9ybWF0I2Zvcm1hdCgpYCB3b3VsZCB0aHJvdy5cbiAgICBpZiAoIWlzRmluaXRlKG5vdykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXG4gICAgICAgICAgICAnVGhlIGBub3dgIG9wdGlvbiBwcm92aWRlZCB0byBJbnRsUmVsYXRpdmVGb3JtYXQjZm9ybWF0KCkgaXMgbm90ICcgK1xuICAgICAgICAgICAgJ2luIHZhbGlkIHJhbmdlLidcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRmluaXRlKGRhdGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFxuICAgICAgICAgICAgJ1RoZSBkYXRlIHZhbHVlIHByb3ZpZGVkIHRvIEludGxSZWxhdGl2ZUZvcm1hdCNmb3JtYXQoKSBpcyBub3QgJyArXG4gICAgICAgICAgICAnaW4gdmFsaWQgcmFuZ2UuJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIHZhciBkaWZmUmVwb3J0ICA9IHNyYyRkaWZmJCRbXCJkZWZhdWx0XCJdKG5vdywgZGF0ZSk7XG4gICAgdmFyIHVuaXRzICAgICAgID0gdGhpcy5fb3B0aW9ucy51bml0cyB8fCB0aGlzLl9zZWxlY3RVbml0cyhkaWZmUmVwb3J0KTtcbiAgICB2YXIgZGlmZkluVW5pdHMgPSBkaWZmUmVwb3J0W3VuaXRzXTtcblxuICAgIGlmICh0aGlzLl9vcHRpb25zLnN0eWxlICE9PSAnbnVtZXJpYycpIHtcbiAgICAgICAgdmFyIHJlbGF0aXZlVW5pdHMgPSB0aGlzLl9nZXRSZWxhdGl2ZVVuaXRzKGRpZmZJblVuaXRzLCB1bml0cyk7XG4gICAgICAgIGlmIChyZWxhdGl2ZVVuaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpdmVVbml0cztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9nZXRNZXNzYWdlKHVuaXRzKS5mb3JtYXQoe1xuICAgICAgICAnMCcgOiBNYXRoLmFicyhkaWZmSW5Vbml0cyksXG4gICAgICAgIHdoZW46IGRpZmZJblVuaXRzIDwgMCA/ICdwYXN0JyA6ICdmdXR1cmUnXG4gICAgfSk7XG59O1xuXG5SZWxhdGl2ZUZvcm1hdC5wcm90b3R5cGUuX2lzVmFsaWRVbml0cyA9IGZ1bmN0aW9uICh1bml0cykge1xuICAgIGlmICghdW5pdHMgfHwgc3JjJGVzNSQkLmFyckluZGV4T2YuY2FsbChGSUVMRFMsIHVuaXRzKSA+PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdW5pdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBzdWdnZXN0aW9uID0gL3MkLy50ZXN0KHVuaXRzKSAmJiB1bml0cy5zdWJzdHIoMCwgdW5pdHMubGVuZ3RoIC0gMSk7XG4gICAgICAgIGlmIChzdWdnZXN0aW9uICYmIHNyYyRlczUkJC5hcnJJbmRleE9mLmNhbGwoRklFTERTLCBzdWdnZXN0aW9uKSA+PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgJ1wiJyArIHVuaXRzICsgJ1wiIGlzIG5vdCBhIHZhbGlkIEludGxSZWxhdGl2ZUZvcm1hdCBgdW5pdHNgICcgK1xuICAgICAgICAgICAgICAgICd2YWx1ZSwgZGlkIHlvdSBtZWFuOiAnICsgc3VnZ2VzdGlvblxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1wiJyArIHVuaXRzICsgJ1wiIGlzIG5vdCBhIHZhbGlkIEludGxSZWxhdGl2ZUZvcm1hdCBgdW5pdHNgIHZhbHVlLCBpdCAnICtcbiAgICAgICAgJ211c3QgYmUgb25lIG9mOiBcIicgKyBGSUVMRFMuam9pbignXCIsIFwiJykgKyAnXCInXG4gICAgKTtcbn07XG5cblJlbGF0aXZlRm9ybWF0LnByb3RvdHlwZS5fcmVzb2x2ZUxvY2FsZSA9IGZ1bmN0aW9uIChsb2NhbGVzKSB7XG4gICAgaWYgKHR5cGVvZiBsb2NhbGVzID09PSAnc3RyaW5nJykge1xuICAgICAgICBsb2NhbGVzID0gW2xvY2FsZXNdO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIGNvcHkgb2YgdGhlIGFycmF5IHNvIHdlIGNhbiBwdXNoIG9uIHRoZSBkZWZhdWx0IGxvY2FsZS5cbiAgICBsb2NhbGVzID0gKGxvY2FsZXMgfHwgW10pLmNvbmNhdChSZWxhdGl2ZUZvcm1hdC5kZWZhdWx0TG9jYWxlKTtcblxuICAgIHZhciBsb2NhbGVEYXRhID0gUmVsYXRpdmVGb3JtYXQuX19sb2NhbGVEYXRhX187XG4gICAgdmFyIGksIGxlbiwgbG9jYWxlUGFydHMsIGRhdGE7XG5cbiAgICAvLyBVc2luZyB0aGUgc2V0IG9mIGxvY2FsZXMgKyB0aGUgZGVmYXVsdCBsb2NhbGUsIHdlIGxvb2sgZm9yIHRoZSBmaXJzdCBvbmVcbiAgICAvLyB3aGljaCB0aGF0IGhhcyBiZWVuIHJlZ2lzdGVyZWQuIFdoZW4gZGF0YSBkb2VzIG5vdCBleGlzdCBmb3IgYSBsb2NhbGUsIHdlXG4gICAgLy8gdHJhdmVyc2UgaXRzIGFuY2VzdG9ycyB0byBmaW5kIHNvbWV0aGluZyB0aGF0J3MgYmVlbiByZWdpc3RlcmVkIHdpdGhpblxuICAgIC8vIGl0cyBoaWVyYXJjaHkgb2YgbG9jYWxlcy4gU2luY2Ugd2UgbGFjayB0aGUgcHJvcGVyIGBwYXJlbnRMb2NhbGVgIGRhdGFcbiAgICAvLyBoZXJlLCB3ZSBtdXN0IHRha2UgYSBuYWl2ZSBhcHByb2FjaCB0byB0cmF2ZXJzYWwuXG4gICAgZm9yIChpID0gMCwgbGVuID0gbG9jYWxlcy5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBsb2NhbGVQYXJ0cyA9IGxvY2FsZXNbaV0udG9Mb3dlckNhc2UoKS5zcGxpdCgnLScpO1xuXG4gICAgICAgIHdoaWxlIChsb2NhbGVQYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGRhdGEgPSBsb2NhbGVEYXRhW2xvY2FsZVBhcnRzLmpvaW4oJy0nKV07XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgbm9ybWFsaXplZCBsb2NhbGUgc3RyaW5nOyBlLmcuLCB3ZSByZXR1cm4gXCJlbi1VU1wiLFxuICAgICAgICAgICAgICAgIC8vIGluc3RlYWQgb2YgXCJlbi11c1wiLlxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLmxvY2FsZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG9jYWxlUGFydHMucG9wKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdExvY2FsZSA9IGxvY2FsZXMucG9wKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnTm8gbG9jYWxlIGRhdGEgaGFzIGJlZW4gYWRkZWQgdG8gSW50bFJlbGF0aXZlRm9ybWF0IGZvcjogJyArXG4gICAgICAgIGxvY2FsZXMuam9pbignLCAnKSArICcsIG9yIHRoZSBkZWZhdWx0IGxvY2FsZTogJyArIGRlZmF1bHRMb2NhbGVcbiAgICApO1xufTtcblxuUmVsYXRpdmVGb3JtYXQucHJvdG90eXBlLl9yZXNvbHZlU3R5bGUgPSBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAvLyBEZWZhdWx0IHRvIFwiYmVzdCBmaXRcIiBzdHlsZS5cbiAgICBpZiAoIXN0eWxlKSB7XG4gICAgICAgIHJldHVybiBTVFlMRVNbMF07XG4gICAgfVxuXG4gICAgaWYgKHNyYyRlczUkJC5hcnJJbmRleE9mLmNhbGwoU1RZTEVTLCBzdHlsZSkgPj0gMCkge1xuICAgICAgICByZXR1cm4gc3R5bGU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnXCInICsgc3R5bGUgKyAnXCIgaXMgbm90IGEgdmFsaWQgSW50bFJlbGF0aXZlRm9ybWF0IGBzdHlsZWAgdmFsdWUsIGl0ICcgK1xuICAgICAgICAnbXVzdCBiZSBvbmUgb2Y6IFwiJyArIFNUWUxFUy5qb2luKCdcIiwgXCInKSArICdcIidcbiAgICApO1xufTtcblxuUmVsYXRpdmVGb3JtYXQucHJvdG90eXBlLl9zZWxlY3RVbml0cyA9IGZ1bmN0aW9uIChkaWZmUmVwb3J0KSB7XG4gICAgdmFyIGksIGwsIHVuaXRzO1xuXG4gICAgZm9yIChpID0gMCwgbCA9IEZJRUxEUy5sZW5ndGg7IGkgPCBsOyBpICs9IDEpIHtcbiAgICAgICAgdW5pdHMgPSBGSUVMRFNbaV07XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKGRpZmZSZXBvcnRbdW5pdHNdKSA8IFJlbGF0aXZlRm9ybWF0LnRocmVzaG9sZHNbdW5pdHNdKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bml0cztcbn07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvcmUuanMubWFwIiwiLypcbkNvcHlyaWdodCAoYykgMjAxNCwgWWFob28hIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbkNvcHlyaWdodHMgbGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgTGljZW5zZS5cblNlZSB0aGUgYWNjb21wYW55aW5nIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMuXG4qL1xuXG4vKiBqc2xpbnQgZXNuZXh0OiB0cnVlICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgcm91bmQgPSBNYXRoLnJvdW5kO1xuXG5mdW5jdGlvbiBkYXlzVG9ZZWFycyhkYXlzKSB7XG4gICAgLy8gNDAwIHllYXJzIGhhdmUgMTQ2MDk3IGRheXMgKHRha2luZyBpbnRvIGFjY291bnQgbGVhcCB5ZWFyIHJ1bGVzKVxuICAgIHJldHVybiBkYXlzICogNDAwIC8gMTQ2MDk3O1xufVxuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IGZ1bmN0aW9uIChmcm9tLCB0bykge1xuICAgIC8vIENvbnZlcnQgdG8gbXMgdGltZXN0YW1wcy5cbiAgICBmcm9tID0gK2Zyb207XG4gICAgdG8gICA9ICt0bztcblxuICAgIHZhciBtaWxsaXNlY29uZCA9IHJvdW5kKHRvIC0gZnJvbSksXG4gICAgICAgIHNlY29uZCAgICAgID0gcm91bmQobWlsbGlzZWNvbmQgLyAxMDAwKSxcbiAgICAgICAgbWludXRlICAgICAgPSByb3VuZChzZWNvbmQgLyA2MCksXG4gICAgICAgIGhvdXIgICAgICAgID0gcm91bmQobWludXRlIC8gNjApLFxuICAgICAgICBkYXkgICAgICAgICA9IHJvdW5kKGhvdXIgLyAyNCksXG4gICAgICAgIHdlZWsgICAgICAgID0gcm91bmQoZGF5IC8gNyk7XG5cbiAgICB2YXIgcmF3WWVhcnMgPSBkYXlzVG9ZZWFycyhkYXkpLFxuICAgICAgICBtb250aCAgICA9IHJvdW5kKHJhd1llYXJzICogMTIpLFxuICAgICAgICB5ZWFyICAgICA9IHJvdW5kKHJhd1llYXJzKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1pbGxpc2Vjb25kOiBtaWxsaXNlY29uZCxcbiAgICAgICAgc2Vjb25kICAgICA6IHNlY29uZCxcbiAgICAgICAgbWludXRlICAgICA6IG1pbnV0ZSxcbiAgICAgICAgaG91ciAgICAgICA6IGhvdXIsXG4gICAgICAgIGRheSAgICAgICAgOiBkYXksXG4gICAgICAgIHdlZWsgICAgICAgOiB3ZWVrLFxuICAgICAgICBtb250aCAgICAgIDogbW9udGgsXG4gICAgICAgIHllYXIgICAgICAgOiB5ZWFyXG4gICAgfTtcbn07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRpZmYuanMubWFwIiwiLy8gR0VORVJBVEVEIEZJTEVcblwidXNlIHN0cmljdFwiO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSB7XCJsb2NhbGVcIjpcImVuXCIsXCJwbHVyYWxSdWxlRnVuY3Rpb25cIjpmdW5jdGlvbiAobixvcmQpe3ZhciBzPVN0cmluZyhuKS5zcGxpdChcIi5cIiksdjA9IXNbMV0sdDA9TnVtYmVyKHNbMF0pPT1uLG4xMD10MCYmc1swXS5zbGljZSgtMSksbjEwMD10MCYmc1swXS5zbGljZSgtMik7aWYob3JkKXJldHVybiBuMTA9PTEmJm4xMDAhPTExP1wib25lXCI6bjEwPT0yJiZuMTAwIT0xMj9cInR3b1wiOm4xMD09MyYmbjEwMCE9MTM/XCJmZXdcIjpcIm90aGVyXCI7cmV0dXJuIG49PTEmJnYwP1wib25lXCI6XCJvdGhlclwifSxcImZpZWxkc1wiOntcInllYXJcIjp7XCJkaXNwbGF5TmFtZVwiOlwieWVhclwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0aGlzIHllYXJcIixcIjFcIjpcIm5leHQgeWVhclwiLFwiLTFcIjpcImxhc3QgeWVhclwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiaW4gezB9IHllYXJcIixcIm90aGVyXCI6XCJpbiB7MH0geWVhcnNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJ7MH0geWVhciBhZ29cIixcIm90aGVyXCI6XCJ7MH0geWVhcnMgYWdvXCJ9fX0sXCJtb250aFwiOntcImRpc3BsYXlOYW1lXCI6XCJtb250aFwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0aGlzIG1vbnRoXCIsXCIxXCI6XCJuZXh0IG1vbnRoXCIsXCItMVwiOlwibGFzdCBtb250aFwifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiaW4gezB9IG1vbnRoXCIsXCJvdGhlclwiOlwiaW4gezB9IG1vbnRoc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcInswfSBtb250aCBhZ29cIixcIm90aGVyXCI6XCJ7MH0gbW9udGhzIGFnb1wifX19LFwiZGF5XCI6e1wiZGlzcGxheU5hbWVcIjpcImRheVwiLFwicmVsYXRpdmVcIjp7XCIwXCI6XCJ0b2RheVwiLFwiMVwiOlwidG9tb3Jyb3dcIixcIi0xXCI6XCJ5ZXN0ZXJkYXlcIn0sXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImluIHswfSBkYXlcIixcIm90aGVyXCI6XCJpbiB7MH0gZGF5c1wifSxcInBhc3RcIjp7XCJvbmVcIjpcInswfSBkYXkgYWdvXCIsXCJvdGhlclwiOlwiezB9IGRheXMgYWdvXCJ9fX0sXCJob3VyXCI6e1wiZGlzcGxheU5hbWVcIjpcImhvdXJcIixcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiaW4gezB9IGhvdXJcIixcIm90aGVyXCI6XCJpbiB7MH0gaG91cnNcIn0sXCJwYXN0XCI6e1wib25lXCI6XCJ7MH0gaG91ciBhZ29cIixcIm90aGVyXCI6XCJ7MH0gaG91cnMgYWdvXCJ9fX0sXCJtaW51dGVcIjp7XCJkaXNwbGF5TmFtZVwiOlwibWludXRlXCIsXCJyZWxhdGl2ZVRpbWVcIjp7XCJmdXR1cmVcIjp7XCJvbmVcIjpcImluIHswfSBtaW51dGVcIixcIm90aGVyXCI6XCJpbiB7MH0gbWludXRlc1wifSxcInBhc3RcIjp7XCJvbmVcIjpcInswfSBtaW51dGUgYWdvXCIsXCJvdGhlclwiOlwiezB9IG1pbnV0ZXMgYWdvXCJ9fX0sXCJzZWNvbmRcIjp7XCJkaXNwbGF5TmFtZVwiOlwic2Vjb25kXCIsXCJyZWxhdGl2ZVwiOntcIjBcIjpcIm5vd1wifSxcInJlbGF0aXZlVGltZVwiOntcImZ1dHVyZVwiOntcIm9uZVwiOlwiaW4gezB9IHNlY29uZFwiLFwib3RoZXJcIjpcImluIHswfSBzZWNvbmRzXCJ9LFwicGFzdFwiOntcIm9uZVwiOlwiezB9IHNlY29uZCBhZ29cIixcIm90aGVyXCI6XCJ7MH0gc2Vjb25kcyBhZ29cIn19fX19O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lbi5qcy5tYXAiLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE0LCBZYWhvbyEgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBMaWNlbnNlLlxuU2VlIHRoZSBhY2NvbXBhbnlpbmcgTElDRU5TRSBmaWxlIGZvciB0ZXJtcy5cbiovXG5cbi8qIGpzbGludCBlc25leHQ6IHRydWUgKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIFB1cnBvc2VseSB1c2luZyB0aGUgc2FtZSBpbXBsZW1lbnRhdGlvbiBhcyB0aGUgSW50bC5qcyBgSW50bGAgcG9seWZpbGwuXG4vLyBDb3B5cmlnaHQgMjAxMyBBbmR5IEVhcm5zaGF3LCBNSVQgTGljZW5zZVxuXG52YXIgaG9wID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciByZWFsRGVmaW5lUHJvcCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHsgcmV0dXJuICEhT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAnYScsIHt9KTsgfVxuICAgIGNhdGNoIChlKSB7IHJldHVybiBmYWxzZTsgfVxufSkoKTtcblxudmFyIGVzMyA9ICFyZWFsRGVmaW5lUHJvcCAmJiAhT2JqZWN0LnByb3RvdHlwZS5fX2RlZmluZUdldHRlcl9fO1xuXG52YXIgZGVmaW5lUHJvcGVydHkgPSByZWFsRGVmaW5lUHJvcCA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSA6XG4gICAgICAgIGZ1bmN0aW9uIChvYmosIG5hbWUsIGRlc2MpIHtcblxuICAgIGlmICgnZ2V0JyBpbiBkZXNjICYmIG9iai5fX2RlZmluZUdldHRlcl9fKSB7XG4gICAgICAgIG9iai5fX2RlZmluZUdldHRlcl9fKG5hbWUsIGRlc2MuZ2V0KTtcbiAgICB9IGVsc2UgaWYgKCFob3AuY2FsbChvYmosIG5hbWUpIHx8ICd2YWx1ZScgaW4gZGVzYykge1xuICAgICAgICBvYmpbbmFtZV0gPSBkZXNjLnZhbHVlO1xuICAgIH1cbn07XG5cbnZhciBvYmpDcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90bywgcHJvcHMpIHtcbiAgICB2YXIgb2JqLCBrO1xuXG4gICAgZnVuY3Rpb24gRigpIHt9XG4gICAgRi5wcm90b3R5cGUgPSBwcm90bztcbiAgICBvYmogPSBuZXcgRigpO1xuXG4gICAgZm9yIChrIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChob3AuY2FsbChwcm9wcywgaykpIHtcbiAgICAgICAgICAgIGRlZmluZVByb3BlcnR5KG9iaiwgaywgcHJvcHNba10pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBhcnJJbmRleE9mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YgfHwgZnVuY3Rpb24gKHNlYXJjaCwgZnJvbUluZGV4KSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICB2YXIgYXJyID0gdGhpcztcbiAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSBmcm9tSW5kZXggfHwgMCwgbWF4ID0gYXJyLmxlbmd0aDsgaSA8IG1heDsgaSsrKSB7XG4gICAgICAgIGlmIChhcnJbaV0gPT09IHNlYXJjaCkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTE7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG52YXIgZGF0ZU5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59O1xuZXhwb3J0cy5kZWZpbmVQcm9wZXJ0eSA9IGRlZmluZVByb3BlcnR5LCBleHBvcnRzLm9iakNyZWF0ZSA9IG9iakNyZWF0ZSwgZXhwb3J0cy5hcnJJbmRleE9mID0gYXJySW5kZXhPZiwgZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheSwgZXhwb3J0cy5kYXRlTm93ID0gZGF0ZU5vdztcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXM1LmpzLm1hcCIsIi8vIEV4cG9zZSBgSW50bFBvbHlmaWxsYCBhcyBnbG9iYWwgdG8gYWRkIGxvY2FsZSBkYXRhIGludG8gcnVudGltZSBsYXRlciBvbi5cbmdsb2JhbC5JbnRsUG9seWZpbGwgPSByZXF1aXJlKCcuL2xpYi9jb3JlLmpzJyk7XG5cbi8vIFJlcXVpcmUgYWxsIGxvY2FsZSBkYXRhIGZvciBgSW50bGAuIFRoaXMgbW9kdWxlIHdpbGwgYmVcbi8vIGlnbm9yZWQgd2hlbiBidW5kbGluZyBmb3IgdGhlIGJyb3dzZXIgd2l0aCBCcm93c2VyaWZ5L1dlYnBhY2suXG5yZXF1aXJlKCcuL2xvY2FsZS1kYXRhL2NvbXBsZXRlLmpzJyk7XG5cbi8vIGhhY2sgdG8gZXhwb3J0IHRoZSBwb2x5ZmlsbCBhcyBnbG9iYWwgSW50bCBpZiBuZWVkZWRcbmlmICghZ2xvYmFsLkludGwpIHtcbiAgICBnbG9iYWwuSW50bCA9IGdsb2JhbC5JbnRsUG9seWZpbGw7XG4gICAgZ2xvYmFsLkludGxQb2x5ZmlsbC5fX2FwcGx5TG9jYWxlU2Vuc2l0aXZlUHJvdG90eXBlcygpO1xufVxuXG4vLyBwcm92aWRpbmcgYW4gaWRpb21hdGljIGFwaSBmb3IgdGhlIG5vZGVqcyB2ZXJzaW9uIG9mIHRoaXMgbW9kdWxlXG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5JbnRsUG9seWZpbGw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiYWJlbEhlbHBlcnMgPSB7fTtcbmJhYmVsSGVscGVycy50eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmo7XG59IDogZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqO1xufTtcbmJhYmVsSGVscGVycztcblxudmFyIHJlYWxEZWZpbmVQcm9wID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZW50aW5lbCA9IHt9O1xuICAgIHRyeSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZW50aW5lbCwgJ2EnLCB7fSk7XG4gICAgICAgIHJldHVybiAnYScgaW4gc2VudGluZWw7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufSgpO1xuXG4vLyBOZWVkIGEgd29ya2Fyb3VuZCBmb3IgZ2V0dGVycyBpbiBFUzNcbnZhciBlczMgPSAhcmVhbERlZmluZVByb3AgJiYgIU9iamVjdC5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXztcblxuLy8gV2UgdXNlIHRoaXMgYSBsb3QgKGFuZCBuZWVkIGl0IGZvciBwcm90by1sZXNzIG9iamVjdHMpXG52YXIgaG9wID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gTmFpdmUgZGVmaW5lUHJvcGVydHkgZm9yIGNvbXBhdGliaWxpdHlcbnZhciBkZWZpbmVQcm9wZXJ0eSA9IHJlYWxEZWZpbmVQcm9wID8gT2JqZWN0LmRlZmluZVByb3BlcnR5IDogZnVuY3Rpb24gKG9iaiwgbmFtZSwgZGVzYykge1xuICAgIGlmICgnZ2V0JyBpbiBkZXNjICYmIG9iai5fX2RlZmluZUdldHRlcl9fKSBvYmouX19kZWZpbmVHZXR0ZXJfXyhuYW1lLCBkZXNjLmdldCk7ZWxzZSBpZiAoIWhvcC5jYWxsKG9iaiwgbmFtZSkgfHwgJ3ZhbHVlJyBpbiBkZXNjKSBvYmpbbmFtZV0gPSBkZXNjLnZhbHVlO1xufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLmluZGV4T2YsIGFzIGdvb2QgYXMgd2UgbmVlZCBpdCB0byBiZVxudmFyIGFyckluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiB8fCBmdW5jdGlvbiAoc2VhcmNoKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICB2YXIgdCA9IHRoaXM7XG4gICAgaWYgKCF0Lmxlbmd0aCkgcmV0dXJuIC0xO1xuXG4gICAgZm9yICh2YXIgaSA9IGFyZ3VtZW50c1sxXSB8fCAwLCBtYXggPSB0Lmxlbmd0aDsgaSA8IG1heDsgaSsrKSB7XG4gICAgICAgIGlmICh0W2ldID09PSBzZWFyY2gpIHJldHVybiBpO1xuICAgIH1cblxuICAgIHJldHVybiAtMTtcbn07XG5cbi8vIENyZWF0ZSBhbiBvYmplY3Qgd2l0aCB0aGUgc3BlY2lmaWVkIHByb3RvdHlwZSAoMm5kIGFyZyByZXF1aXJlZCBmb3IgUmVjb3JkKVxudmFyIG9iakNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvLCBwcm9wcykge1xuICAgIHZhciBvYmogPSB2b2lkIDA7XG5cbiAgICBmdW5jdGlvbiBGKCkge31cbiAgICBGLnByb3RvdHlwZSA9IHByb3RvO1xuICAgIG9iaiA9IG5ldyBGKCk7XG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChob3AuY2FsbChwcm9wcywgaykpIGRlZmluZVByb3BlcnR5KG9iaiwgaywgcHJvcHNba10pO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG4vLyBTbmFwc2hvdCBzb21lIChob3BlZnVsbHkgc3RpbGwpIG5hdGl2ZSBidWlsdC1pbnNcbnZhciBhcnJTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBhcnJDb25jYXQgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0O1xudmFyIGFyclB1c2ggPSBBcnJheS5wcm90b3R5cGUucHVzaDtcbnZhciBhcnJKb2luID0gQXJyYXkucHJvdG90eXBlLmpvaW47XG52YXIgYXJyU2hpZnQgPSBBcnJheS5wcm90b3R5cGUuc2hpZnQ7XG5cbi8vIE5haXZlIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIGZvciBjb21wYXRpYmlsaXR5XG52YXIgZm5CaW5kID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgfHwgZnVuY3Rpb24gKHRoaXNPYmopIHtcbiAgICB2YXIgZm4gPSB0aGlzLFxuICAgICAgICBhcmdzID0gYXJyU2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgLy8gQWxsIG91ciAocHJlc2VudGx5KSBib3VuZCBmdW5jdGlvbnMgaGF2ZSBlaXRoZXIgMSBvciAwIGFyZ3VtZW50cy4gQnkgcmV0dXJuaW5nXG4gICAgLy8gZGlmZmVyZW50IGZ1bmN0aW9uIHNpZ25hdHVyZXMsIHdlIGNhbiBwYXNzIHNvbWUgdGVzdHMgaW4gRVMzIGVudmlyb25tZW50c1xuICAgIGlmIChmbi5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzT2JqLCBhcnJDb25jYXQuY2FsbChhcmdzLCBhcnJTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNPYmosIGFyckNvbmNhdC5jYWxsKGFyZ3MsIGFyclNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG59O1xuXG4vLyBPYmplY3QgaG91c2luZyBpbnRlcm5hbCBwcm9wZXJ0aWVzIGZvciBjb25zdHJ1Y3RvcnNcbnZhciBpbnRlcm5hbHMgPSBvYmpDcmVhdGUobnVsbCk7XG5cbi8vIEtlZXAgaW50ZXJuYWwgcHJvcGVydGllcyBpbnRlcm5hbFxudmFyIHNlY3JldCA9IE1hdGgucmFuZG9tKCk7XG5cbi8vIEhlbHBlciBmdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHRvIGRlYWwgd2l0aCB0aGUgaW5hY2N1cmFjeSBvZiBjYWxjdWxhdGluZyBsb2cxMCBpbiBwcmUtRVM2XG4gKiBKYXZhU2NyaXB0IGVudmlyb25tZW50cy4gTWF0aC5sb2cobnVtKSAvIE1hdGguTE4xMCB3YXMgcmVzcG9uc2libGUgZm9yXG4gKiBjYXVzaW5nIGlzc3VlICM2Mi5cbiAqL1xuZnVuY3Rpb24gbG9nMTBGbG9vcihuKSB7XG4gICAgLy8gRVM2IHByb3ZpZGVzIHRoZSBtb3JlIGFjY3VyYXRlIE1hdGgubG9nMTBcbiAgICBpZiAodHlwZW9mIE1hdGgubG9nMTAgPT09ICdmdW5jdGlvbicpIHJldHVybiBNYXRoLmZsb29yKE1hdGgubG9nMTAobikpO1xuXG4gICAgdmFyIHggPSBNYXRoLnJvdW5kKE1hdGgubG9nKG4pICogTWF0aC5MT0cxMEUpO1xuICAgIHJldHVybiB4IC0gKE51bWJlcignMWUnICsgeCkgPiBuKTtcbn1cblxuLyoqXG4gKiBBIG1hcCB0aGF0IGRvZXNuJ3QgY29udGFpbiBPYmplY3QgaW4gaXRzIHByb3RvdHlwZSBjaGFpblxuICovXG5mdW5jdGlvbiBSZWNvcmQob2JqKSB7XG4gICAgLy8gQ29weSBvbmx5IG93biBwcm9wZXJ0aWVzIG92ZXIgdW5sZXNzIHRoaXMgb2JqZWN0IGlzIGFscmVhZHkgYSBSZWNvcmQgaW5zdGFuY2VcbiAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICBpZiAob2JqIGluc3RhbmNlb2YgUmVjb3JkIHx8IGhvcC5jYWxsKG9iaiwgaykpIGRlZmluZVByb3BlcnR5KHRoaXMsIGssIHsgdmFsdWU6IG9ialtrXSwgZW51bWVyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcbiAgICB9XG59XG5SZWNvcmQucHJvdG90eXBlID0gb2JqQ3JlYXRlKG51bGwpO1xuXG4vKipcbiAqIEFuIG9yZGVyZWQgbGlzdFxuICovXG5mdW5jdGlvbiBMaXN0KCkge1xuICAgIGRlZmluZVByb3BlcnR5KHRoaXMsICdsZW5ndGgnLCB7IHdyaXRhYmxlOiB0cnVlLCB2YWx1ZTogMCB9KTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSBhcnJQdXNoLmFwcGx5KHRoaXMsIGFyclNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG59XG5MaXN0LnByb3RvdHlwZSA9IG9iakNyZWF0ZShudWxsKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgcmVndWxhciBleHByZXNzaW9uIHRvIHJlc3RvcmUgdGFpbnRlZCBSZWdFeHAgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBjcmVhdGVSZWdFeHBSZXN0b3JlKCkge1xuICAgIHZhciBlc2MgPSAvWy4/KiteJFtcXF1cXFxcKCl7fXwtXS9nLFxuICAgICAgICBsbSA9IFJlZ0V4cC5sYXN0TWF0Y2ggfHwgJycsXG4gICAgICAgIG1sID0gUmVnRXhwLm11bHRpbGluZSA/ICdtJyA6ICcnLFxuICAgICAgICByZXQgPSB7IGlucHV0OiBSZWdFeHAuaW5wdXQgfSxcbiAgICAgICAgcmVnID0gbmV3IExpc3QoKSxcbiAgICAgICAgaGFzID0gZmFsc2UsXG4gICAgICAgIGNhcCA9IHt9O1xuXG4gICAgLy8gQ3JlYXRlIGEgc25hcHNob3Qgb2YgYWxsIHRoZSAnY2FwdHVyZWQnIHByb3BlcnRpZXNcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8PSA5OyBpKyspIHtcbiAgICAgICAgaGFzID0gKGNhcFsnJCcgKyBpXSA9IFJlZ0V4cFsnJCcgKyBpXSkgfHwgaGFzO1xuICAgIH0gLy8gTm93IHdlJ3ZlIHNuYXBzaG90dGVkIHNvbWUgcHJvcGVydGllcywgZXNjYXBlIHRoZSBsYXN0TWF0Y2ggc3RyaW5nXG4gICAgbG0gPSBsbS5yZXBsYWNlKGVzYywgJ1xcXFwkJicpO1xuXG4gICAgLy8gSWYgYW55IG9mIHRoZSBjYXB0dXJlZCBzdHJpbmdzIHdlcmUgbm9uLWVtcHR5LCBpdGVyYXRlIG92ZXIgdGhlbSBhbGxcbiAgICBpZiAoaGFzKSB7XG4gICAgICAgIGZvciAodmFyIF9pID0gMTsgX2kgPD0gOTsgX2krKykge1xuICAgICAgICAgICAgdmFyIG0gPSBjYXBbJyQnICsgX2ldO1xuXG4gICAgICAgICAgICAvLyBJZiBpdCdzIGVtcHR5LCBhZGQgYW4gZW1wdHkgY2FwdHVyaW5nIGdyb3VwXG4gICAgICAgICAgICBpZiAoIW0pIGxtID0gJygpJyArIGxtO1xuXG4gICAgICAgICAgICAvLyBFbHNlIGZpbmQgdGhlIHN0cmluZyBpbiBsbSBhbmQgZXNjYXBlICYgd3JhcCBpdCB0byBjYXB0dXJlIGl0XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbSA9IG0ucmVwbGFjZShlc2MsICdcXFxcJCYnKTtcbiAgICAgICAgICAgICAgICAgICAgbG0gPSBsbS5yZXBsYWNlKG0sICcoJyArIG0gKyAnKScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHVzaCBpdCB0byB0aGUgcmVnIGFuZCBjaG9wIGxtIHRvIG1ha2Ugc3VyZSBmdXJ0aGVyIGdyb3VwcyBjb21lIGFmdGVyXG4gICAgICAgICAgICBhcnJQdXNoLmNhbGwocmVnLCBsbS5zbGljZSgwLCBsbS5pbmRleE9mKCcoJykgKyAxKSk7XG4gICAgICAgICAgICBsbSA9IGxtLnNsaWNlKGxtLmluZGV4T2YoJygnKSArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdGhhdCB3aWxsIHJlY29uc3RydWN0IHRoZSBSZWdFeHAgcHJvcGVydGllc1xuICAgIHJldC5leHAgPSBuZXcgUmVnRXhwKGFyckpvaW4uY2FsbChyZWcsICcnKSArIGxtLCBtbCk7XG5cbiAgICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIE1pbWljcyBFUzUncyBhYnN0cmFjdCBUb09iamVjdCgpIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIHRvT2JqZWN0KGFyZykge1xuICAgIGlmIChhcmcgPT09IG51bGwpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IG51bGwgb3IgdW5kZWZpbmVkIHRvIG9iamVjdCcpO1xuXG4gICAgcmV0dXJuIE9iamVjdChhcmcpO1xufVxuXG4vKipcbiAqIFJldHVybnMgXCJpbnRlcm5hbFwiIHByb3BlcnRpZXMgZm9yIGFuIG9iamVjdFxuICovXG5mdW5jdGlvbiBnZXRJbnRlcm5hbFByb3BlcnRpZXMob2JqKSB7XG4gICAgaWYgKGhvcC5jYWxsKG9iaiwgJ19fZ2V0SW50ZXJuYWxQcm9wZXJ0aWVzJykpIHJldHVybiBvYmouX19nZXRJbnRlcm5hbFByb3BlcnRpZXMoc2VjcmV0KTtcblxuICAgIHJldHVybiBvYmpDcmVhdGUobnVsbCk7XG59XG5cbi8qKlxuKiBEZWZpbmVzIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZm9yIHZhcmlvdXMgb3BlcmF0aW9ucyByZWxhdGVkIHRvIHRoZSBCQ1AgNDcgc3ludGF4LFxuKiBhcyBkZWZpbmVkIGF0IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2JjcDQ3I3NlY3Rpb24tMi4xXG4qL1xuXG4vLyBleHRsYW5nICAgICAgID0gM0FMUEhBICAgICAgICAgICAgICA7IHNlbGVjdGVkIElTTyA2MzkgY29kZXNcbi8vICAgICAgICAgICAgICAgICAqMihcIi1cIiAzQUxQSEEpICAgICAgOyBwZXJtYW5lbnRseSByZXNlcnZlZFxudmFyIGV4dGxhbmcgPSAnW2Etel17M30oPzotW2Etel17M30pezAsMn0nO1xuXG4vLyBsYW5ndWFnZSAgICAgID0gMiozQUxQSEEgICAgICAgICAgICA7IHNob3J0ZXN0IElTTyA2MzkgY29kZVxuLy8gICAgICAgICAgICAgICAgIFtcIi1cIiBleHRsYW5nXSAgICAgICA7IHNvbWV0aW1lcyBmb2xsb3dlZCBieVxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOyBleHRlbmRlZCBsYW5ndWFnZSBzdWJ0YWdzXG4vLyAgICAgICAgICAgICAgIC8gNEFMUEhBICAgICAgICAgICAgICA7IG9yIHJlc2VydmVkIGZvciBmdXR1cmUgdXNlXG4vLyAgICAgICAgICAgICAgIC8gNSo4QUxQSEEgICAgICAgICAgICA7IG9yIHJlZ2lzdGVyZWQgbGFuZ3VhZ2Ugc3VidGFnXG52YXIgbGFuZ3VhZ2UgPSAnKD86W2Etel17MiwzfSg/Oi0nICsgZXh0bGFuZyArICcpP3xbYS16XXs0fXxbYS16XXs1LDh9KSc7XG5cbi8vIHNjcmlwdCAgICAgICAgPSA0QUxQSEEgICAgICAgICAgICAgIDsgSVNPIDE1OTI0IGNvZGVcbnZhciBzY3JpcHQgPSAnW2Etel17NH0nO1xuXG4vLyByZWdpb24gICAgICAgID0gMkFMUEhBICAgICAgICAgICAgICA7IElTTyAzMTY2LTEgY29kZVxuLy8gICAgICAgICAgICAgICAvIDNESUdJVCAgICAgICAgICAgICAgOyBVTiBNLjQ5IGNvZGVcbnZhciByZWdpb24gPSAnKD86W2Etel17Mn18XFxcXGR7M30pJztcblxuLy8gdmFyaWFudCAgICAgICA9IDUqOGFscGhhbnVtICAgICAgICAgOyByZWdpc3RlcmVkIHZhcmlhbnRzXG4vLyAgICAgICAgICAgICAgIC8gKERJR0lUIDNhbHBoYW51bSlcbnZhciB2YXJpYW50ID0gJyg/OlthLXowLTldezUsOH18XFxcXGRbYS16MC05XXszfSknO1xuXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA7IFNpbmdsZSBhbHBoYW51bWVyaWNzXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA7IFwieFwiIHJlc2VydmVkIGZvciBwcml2YXRlIHVzZVxuLy8gc2luZ2xldG9uICAgICA9IERJR0lUICAgICAgICAgICAgICAgOyAwIC0gOVxuLy8gICAgICAgICAgICAgICAvICV4NDEtNTcgICAgICAgICAgICAgOyBBIC0gV1xuLy8gICAgICAgICAgICAgICAvICV4NTktNUEgICAgICAgICAgICAgOyBZIC0gWlxuLy8gICAgICAgICAgICAgICAvICV4NjEtNzcgICAgICAgICAgICAgOyBhIC0gd1xuLy8gICAgICAgICAgICAgICAvICV4NzktN0EgICAgICAgICAgICAgOyB5IC0gelxudmFyIHNpbmdsZXRvbiA9ICdbMC05YS13eS16XSc7XG5cbi8vIGV4dGVuc2lvbiAgICAgPSBzaW5nbGV0b24gMSooXCItXCIgKDIqOGFscGhhbnVtKSlcbnZhciBleHRlbnNpb24gPSBzaW5nbGV0b24gKyAnKD86LVthLXowLTldezIsOH0pKyc7XG5cbi8vIHByaXZhdGV1c2UgICAgPSBcInhcIiAxKihcIi1cIiAoMSo4YWxwaGFudW0pKVxudmFyIHByaXZhdGV1c2UgPSAneCg/Oi1bYS16MC05XXsxLDh9KSsnO1xuXG4vLyBpcnJlZ3VsYXIgICAgID0gXCJlbi1HQi1vZWRcIiAgICAgICAgIDsgaXJyZWd1bGFyIHRhZ3MgZG8gbm90IG1hdGNoXG4vLyAgICAgICAgICAgICAgIC8gXCJpLWFtaVwiICAgICAgICAgICAgIDsgdGhlICdsYW5ndGFnJyBwcm9kdWN0aW9uIGFuZFxuLy8gICAgICAgICAgICAgICAvIFwiaS1ibm5cIiAgICAgICAgICAgICA7IHdvdWxkIG5vdCBvdGhlcndpc2UgYmVcbi8vICAgICAgICAgICAgICAgLyBcImktZGVmYXVsdFwiICAgICAgICAgOyBjb25zaWRlcmVkICd3ZWxsLWZvcm1lZCdcbi8vICAgICAgICAgICAgICAgLyBcImktZW5vY2hpYW5cIiAgICAgICAgOyBUaGVzZSB0YWdzIGFyZSBhbGwgdmFsaWQsXG4vLyAgICAgICAgICAgICAgIC8gXCJpLWhha1wiICAgICAgICAgICAgIDsgYnV0IG1vc3QgYXJlIGRlcHJlY2F0ZWRcbi8vICAgICAgICAgICAgICAgLyBcImkta2xpbmdvblwiICAgICAgICAgOyBpbiBmYXZvciBvZiBtb3JlIG1vZGVyblxuLy8gICAgICAgICAgICAgICAvIFwiaS1sdXhcIiAgICAgICAgICAgICA7IHN1YnRhZ3Mgb3Igc3VidGFnXG4vLyAgICAgICAgICAgICAgIC8gXCJpLW1pbmdvXCIgICAgICAgICAgIDsgY29tYmluYXRpb25cbi8vICAgICAgICAgICAgICAgLyBcImktbmF2YWpvXCJcbi8vICAgICAgICAgICAgICAgLyBcImktcHduXCJcbi8vICAgICAgICAgICAgICAgLyBcImktdGFvXCJcbi8vICAgICAgICAgICAgICAgLyBcImktdGF5XCJcbi8vICAgICAgICAgICAgICAgLyBcImktdHN1XCJcbi8vICAgICAgICAgICAgICAgLyBcInNnbi1CRS1GUlwiXG4vLyAgICAgICAgICAgICAgIC8gXCJzZ24tQkUtTkxcIlxuLy8gICAgICAgICAgICAgICAvIFwic2duLUNILURFXCJcbnZhciBpcnJlZ3VsYXIgPSAnKD86ZW4tR0Itb2VkJyArICd8aS0oPzphbWl8Ym5ufGRlZmF1bHR8ZW5vY2hpYW58aGFrfGtsaW5nb258bHV4fG1pbmdvfG5hdmFqb3xwd258dGFvfHRheXx0c3UpJyArICd8c2duLSg/OkJFLUZSfEJFLU5MfENILURFKSknO1xuXG4vLyByZWd1bGFyICAgICAgID0gXCJhcnQtbG9qYmFuXCIgICAgICAgIDsgdGhlc2UgdGFncyBtYXRjaCB0aGUgJ2xhbmd0YWcnXG4vLyAgICAgICAgICAgICAgIC8gXCJjZWwtZ2F1bGlzaFwiICAgICAgIDsgcHJvZHVjdGlvbiwgYnV0IHRoZWlyIHN1YnRhZ3Ncbi8vICAgICAgICAgICAgICAgLyBcIm5vLWJva1wiICAgICAgICAgICAgOyBhcmUgbm90IGV4dGVuZGVkIGxhbmd1YWdlXG4vLyAgICAgICAgICAgICAgIC8gXCJuby1ueW5cIiAgICAgICAgICAgIDsgb3IgdmFyaWFudCBzdWJ0YWdzOiB0aGVpciBtZWFuaW5nXG4vLyAgICAgICAgICAgICAgIC8gXCJ6aC1ndW95dVwiICAgICAgICAgIDsgaXMgZGVmaW5lZCBieSB0aGVpciByZWdpc3RyYXRpb25cbi8vICAgICAgICAgICAgICAgLyBcInpoLWhha2thXCIgICAgICAgICAgOyBhbmQgYWxsIG9mIHRoZXNlIGFyZSBkZXByZWNhdGVkXG4vLyAgICAgICAgICAgICAgIC8gXCJ6aC1taW5cIiAgICAgICAgICAgIDsgaW4gZmF2b3Igb2YgYSBtb3JlIG1vZGVyblxuLy8gICAgICAgICAgICAgICAvIFwiemgtbWluLW5hblwiICAgICAgICA7IHN1YnRhZyBvciBzZXF1ZW5jZSBvZiBzdWJ0YWdzXG4vLyAgICAgICAgICAgICAgIC8gXCJ6aC14aWFuZ1wiXG52YXIgcmVndWxhciA9ICcoPzphcnQtbG9qYmFufGNlbC1nYXVsaXNofG5vLWJva3xuby1ueW4nICsgJ3x6aC0oPzpndW95dXxoYWtrYXxtaW58bWluLW5hbnx4aWFuZykpJztcblxuLy8gZ3JhbmRmYXRoZXJlZCA9IGlycmVndWxhciAgICAgICAgICAgOyBub24tcmVkdW5kYW50IHRhZ3MgcmVnaXN0ZXJlZFxuLy8gICAgICAgICAgICAgICAvIHJlZ3VsYXIgICAgICAgICAgICAgOyBkdXJpbmcgdGhlIFJGQyAzMDY2IGVyYVxudmFyIGdyYW5kZmF0aGVyZWQgPSAnKD86JyArIGlycmVndWxhciArICd8JyArIHJlZ3VsYXIgKyAnKSc7XG5cbi8vIGxhbmd0YWcgICAgICAgPSBsYW5ndWFnZVxuLy8gICAgICAgICAgICAgICAgIFtcIi1cIiBzY3JpcHRdXG4vLyAgICAgICAgICAgICAgICAgW1wiLVwiIHJlZ2lvbl1cbi8vICAgICAgICAgICAgICAgICAqKFwiLVwiIHZhcmlhbnQpXG4vLyAgICAgICAgICAgICAgICAgKihcIi1cIiBleHRlbnNpb24pXG4vLyAgICAgICAgICAgICAgICAgW1wiLVwiIHByaXZhdGV1c2VdXG52YXIgbGFuZ3RhZyA9IGxhbmd1YWdlICsgJyg/Oi0nICsgc2NyaXB0ICsgJyk/KD86LScgKyByZWdpb24gKyAnKT8oPzotJyArIHZhcmlhbnQgKyAnKSooPzotJyArIGV4dGVuc2lvbiArICcpKig/Oi0nICsgcHJpdmF0ZXVzZSArICcpPyc7XG5cbi8vIExhbmd1YWdlLVRhZyAgPSBsYW5ndGFnICAgICAgICAgICAgIDsgbm9ybWFsIGxhbmd1YWdlIHRhZ3Ncbi8vICAgICAgICAgICAgICAgLyBwcml2YXRldXNlICAgICAgICAgIDsgcHJpdmF0ZSB1c2UgdGFnXG4vLyAgICAgICAgICAgICAgIC8gZ3JhbmRmYXRoZXJlZCAgICAgICA7IGdyYW5kZmF0aGVyZWQgdGFnc1xudmFyIGV4cEJDUDQ3U3ludGF4ID0gUmVnRXhwKCdeKD86JyArIGxhbmd0YWcgKyAnfCcgKyBwcml2YXRldXNlICsgJ3wnICsgZ3JhbmRmYXRoZXJlZCArICcpJCcsICdpJyk7XG5cbi8vIE1hdGNoIGR1cGxpY2F0ZSB2YXJpYW50cyBpbiBhIGxhbmd1YWdlIHRhZ1xudmFyIGV4cFZhcmlhbnREdXBlcyA9IFJlZ0V4cCgnXig/IXgpLio/LSgnICsgdmFyaWFudCArICcpLSg/OlxcXFx3ezQsOH0tKD8heC0pKSpcXFxcMVxcXFxiJywgJ2knKTtcblxuLy8gTWF0Y2ggZHVwbGljYXRlIHNpbmdsZXRvbnMgaW4gYSBsYW5ndWFnZSB0YWcgKGV4Y2VwdCBpbiBwcml2YXRlIHVzZSlcbnZhciBleHBTaW5nbGV0b25EdXBlcyA9IFJlZ0V4cCgnXig/IXgpLio/LSgnICsgc2luZ2xldG9uICsgJyktKD86XFxcXHcrLSg/IXgtKSkqXFxcXDFcXFxcYicsICdpJyk7XG5cbi8vIE1hdGNoIGFsbCBleHRlbnNpb24gc2VxdWVuY2VzXG52YXIgZXhwRXh0U2VxdWVuY2VzID0gUmVnRXhwKCctJyArIGV4dGVuc2lvbiwgJ2lnJyk7XG5cbi8vIERlZmF1bHQgbG9jYWxlIGlzIHRoZSBmaXJzdC1hZGRlZCBsb2NhbGUgZGF0YSBmb3IgdXNcbnZhciBkZWZhdWx0TG9jYWxlID0gdm9pZCAwO1xuZnVuY3Rpb24gc2V0RGVmYXVsdExvY2FsZShsb2NhbGUpIHtcbiAgICBkZWZhdWx0TG9jYWxlID0gbG9jYWxlO1xufVxuXG4vLyBJQU5BIFN1YnRhZyBSZWdpc3RyeSByZWR1bmRhbnQgdGFnIGFuZCBzdWJ0YWcgbWFwc1xudmFyIHJlZHVuZGFudFRhZ3MgPSB7XG4gICAgdGFnczoge1xuICAgICAgICBcImFydC1sb2piYW5cIjogXCJqYm9cIixcbiAgICAgICAgXCJpLWFtaVwiOiBcImFtaVwiLFxuICAgICAgICBcImktYm5uXCI6IFwiYm5uXCIsXG4gICAgICAgIFwiaS1oYWtcIjogXCJoYWtcIixcbiAgICAgICAgXCJpLWtsaW5nb25cIjogXCJ0bGhcIixcbiAgICAgICAgXCJpLWx1eFwiOiBcImxiXCIsXG4gICAgICAgIFwiaS1uYXZham9cIjogXCJudlwiLFxuICAgICAgICBcImktcHduXCI6IFwicHduXCIsXG4gICAgICAgIFwiaS10YW9cIjogXCJ0YW9cIixcbiAgICAgICAgXCJpLXRheVwiOiBcInRheVwiLFxuICAgICAgICBcImktdHN1XCI6IFwidHN1XCIsXG4gICAgICAgIFwibm8tYm9rXCI6IFwibmJcIixcbiAgICAgICAgXCJuby1ueW5cIjogXCJublwiLFxuICAgICAgICBcInNnbi1CRS1GUlwiOiBcInNmYlwiLFxuICAgICAgICBcInNnbi1CRS1OTFwiOiBcInZndFwiLFxuICAgICAgICBcInNnbi1DSC1ERVwiOiBcInNnZ1wiLFxuICAgICAgICBcInpoLWd1b3l1XCI6IFwiY21uXCIsXG4gICAgICAgIFwiemgtaGFra2FcIjogXCJoYWtcIixcbiAgICAgICAgXCJ6aC1taW4tbmFuXCI6IFwibmFuXCIsXG4gICAgICAgIFwiemgteGlhbmdcIjogXCJoc25cIixcbiAgICAgICAgXCJzZ24tQlJcIjogXCJienNcIixcbiAgICAgICAgXCJzZ24tQ09cIjogXCJjc25cIixcbiAgICAgICAgXCJzZ24tREVcIjogXCJnc2dcIixcbiAgICAgICAgXCJzZ24tREtcIjogXCJkc2xcIixcbiAgICAgICAgXCJzZ24tRVNcIjogXCJzc3BcIixcbiAgICAgICAgXCJzZ24tRlJcIjogXCJmc2xcIixcbiAgICAgICAgXCJzZ24tR0JcIjogXCJiZmlcIixcbiAgICAgICAgXCJzZ24tR1JcIjogXCJnc3NcIixcbiAgICAgICAgXCJzZ24tSUVcIjogXCJpc2dcIixcbiAgICAgICAgXCJzZ24tSVRcIjogXCJpc2VcIixcbiAgICAgICAgXCJzZ24tSlBcIjogXCJqc2xcIixcbiAgICAgICAgXCJzZ24tTVhcIjogXCJtZnNcIixcbiAgICAgICAgXCJzZ24tTklcIjogXCJuY3NcIixcbiAgICAgICAgXCJzZ24tTkxcIjogXCJkc2VcIixcbiAgICAgICAgXCJzZ24tTk9cIjogXCJuc2xcIixcbiAgICAgICAgXCJzZ24tUFRcIjogXCJwc3JcIixcbiAgICAgICAgXCJzZ24tU0VcIjogXCJzd2xcIixcbiAgICAgICAgXCJzZ24tVVNcIjogXCJhc2VcIixcbiAgICAgICAgXCJzZ24tWkFcIjogXCJzZnNcIixcbiAgICAgICAgXCJ6aC1jbW5cIjogXCJjbW5cIixcbiAgICAgICAgXCJ6aC1jbW4tSGFuc1wiOiBcImNtbi1IYW5zXCIsXG4gICAgICAgIFwiemgtY21uLUhhbnRcIjogXCJjbW4tSGFudFwiLFxuICAgICAgICBcInpoLWdhblwiOiBcImdhblwiLFxuICAgICAgICBcInpoLXd1dVwiOiBcInd1dVwiLFxuICAgICAgICBcInpoLXl1ZVwiOiBcInl1ZVwiXG4gICAgfSxcbiAgICBzdWJ0YWdzOiB7XG4gICAgICAgIEJVOiBcIk1NXCIsXG4gICAgICAgIEREOiBcIkRFXCIsXG4gICAgICAgIEZYOiBcIkZSXCIsXG4gICAgICAgIFRQOiBcIlRMXCIsXG4gICAgICAgIFlEOiBcIllFXCIsXG4gICAgICAgIFpSOiBcIkNEXCIsXG4gICAgICAgIGhlcGxvYzogXCJhbGFsYzk3XCIsXG4gICAgICAgICdpbic6IFwiaWRcIixcbiAgICAgICAgaXc6IFwiaGVcIixcbiAgICAgICAgamk6IFwieWlcIixcbiAgICAgICAganc6IFwianZcIixcbiAgICAgICAgbW86IFwicm9cIixcbiAgICAgICAgYXl4OiBcIm51blwiLFxuICAgICAgICBiamQ6IFwiZHJsXCIsXG4gICAgICAgIGNjcTogXCJya2lcIixcbiAgICAgICAgY2pyOiBcIm1vbVwiLFxuICAgICAgICBja2E6IFwiY21yXCIsXG4gICAgICAgIGNtazogXCJ4Y2hcIixcbiAgICAgICAgZHJoOiBcImtoa1wiLFxuICAgICAgICBkcnc6IFwicHJzXCIsXG4gICAgICAgIGdhdjogXCJkZXZcIixcbiAgICAgICAgaHJyOiBcImphbFwiLFxuICAgICAgICBpYmk6IFwib3BhXCIsXG4gICAgICAgIGtnaDogXCJrbWxcIixcbiAgICAgICAgbGNxOiBcInBwclwiLFxuICAgICAgICBtc3Q6IFwibXJ5XCIsXG4gICAgICAgIG15dDogXCJtcnlcIixcbiAgICAgICAgc2NhOiBcImhsZVwiLFxuICAgICAgICB0aWU6IFwicmFzXCIsXG4gICAgICAgIHRrazogXCJ0d21cIixcbiAgICAgICAgdGx3OiBcIndlb1wiLFxuICAgICAgICB0bmY6IFwicHJzXCIsXG4gICAgICAgIHliZDogXCJya2lcIixcbiAgICAgICAgeW1hOiBcImxyclwiXG4gICAgfSxcbiAgICBleHRMYW5nOiB7XG4gICAgICAgIGFhbzogW1wiYWFvXCIsIFwiYXJcIl0sXG4gICAgICAgIGFiaDogW1wiYWJoXCIsIFwiYXJcIl0sXG4gICAgICAgIGFidjogW1wiYWJ2XCIsIFwiYXJcIl0sXG4gICAgICAgIGFjbTogW1wiYWNtXCIsIFwiYXJcIl0sXG4gICAgICAgIGFjcTogW1wiYWNxXCIsIFwiYXJcIl0sXG4gICAgICAgIGFjdzogW1wiYWN3XCIsIFwiYXJcIl0sXG4gICAgICAgIGFjeDogW1wiYWN4XCIsIFwiYXJcIl0sXG4gICAgICAgIGFjeTogW1wiYWN5XCIsIFwiYXJcIl0sXG4gICAgICAgIGFkZjogW1wiYWRmXCIsIFwiYXJcIl0sXG4gICAgICAgIGFkczogW1wiYWRzXCIsIFwic2duXCJdLFxuICAgICAgICBhZWI6IFtcImFlYlwiLCBcImFyXCJdLFxuICAgICAgICBhZWM6IFtcImFlY1wiLCBcImFyXCJdLFxuICAgICAgICBhZWQ6IFtcImFlZFwiLCBcInNnblwiXSxcbiAgICAgICAgYWVuOiBbXCJhZW5cIiwgXCJzZ25cIl0sXG4gICAgICAgIGFmYjogW1wiYWZiXCIsIFwiYXJcIl0sXG4gICAgICAgIGFmZzogW1wiYWZnXCIsIFwic2duXCJdLFxuICAgICAgICBhanA6IFtcImFqcFwiLCBcImFyXCJdLFxuICAgICAgICBhcGM6IFtcImFwY1wiLCBcImFyXCJdLFxuICAgICAgICBhcGQ6IFtcImFwZFwiLCBcImFyXCJdLFxuICAgICAgICBhcmI6IFtcImFyYlwiLCBcImFyXCJdLFxuICAgICAgICBhcnE6IFtcImFycVwiLCBcImFyXCJdLFxuICAgICAgICBhcnM6IFtcImFyc1wiLCBcImFyXCJdLFxuICAgICAgICBhcnk6IFtcImFyeVwiLCBcImFyXCJdLFxuICAgICAgICBhcno6IFtcImFyelwiLCBcImFyXCJdLFxuICAgICAgICBhc2U6IFtcImFzZVwiLCBcInNnblwiXSxcbiAgICAgICAgYXNmOiBbXCJhc2ZcIiwgXCJzZ25cIl0sXG4gICAgICAgIGFzcDogW1wiYXNwXCIsIFwic2duXCJdLFxuICAgICAgICBhc3E6IFtcImFzcVwiLCBcInNnblwiXSxcbiAgICAgICAgYXN3OiBbXCJhc3dcIiwgXCJzZ25cIl0sXG4gICAgICAgIGF1ejogW1wiYXV6XCIsIFwiYXJcIl0sXG4gICAgICAgIGF2bDogW1wiYXZsXCIsIFwiYXJcIl0sXG4gICAgICAgIGF5aDogW1wiYXloXCIsIFwiYXJcIl0sXG4gICAgICAgIGF5bDogW1wiYXlsXCIsIFwiYXJcIl0sXG4gICAgICAgIGF5bjogW1wiYXluXCIsIFwiYXJcIl0sXG4gICAgICAgIGF5cDogW1wiYXlwXCIsIFwiYXJcIl0sXG4gICAgICAgIGJiejogW1wiYmJ6XCIsIFwiYXJcIl0sXG4gICAgICAgIGJmaTogW1wiYmZpXCIsIFwic2duXCJdLFxuICAgICAgICBiZms6IFtcImJma1wiLCBcInNnblwiXSxcbiAgICAgICAgYmpuOiBbXCJiam5cIiwgXCJtc1wiXSxcbiAgICAgICAgYm9nOiBbXCJib2dcIiwgXCJzZ25cIl0sXG4gICAgICAgIGJxbjogW1wiYnFuXCIsIFwic2duXCJdLFxuICAgICAgICBicXk6IFtcImJxeVwiLCBcInNnblwiXSxcbiAgICAgICAgYnRqOiBbXCJidGpcIiwgXCJtc1wiXSxcbiAgICAgICAgYnZlOiBbXCJidmVcIiwgXCJtc1wiXSxcbiAgICAgICAgYnZsOiBbXCJidmxcIiwgXCJzZ25cIl0sXG4gICAgICAgIGJ2dTogW1wiYnZ1XCIsIFwibXNcIl0sXG4gICAgICAgIGJ6czogW1wiYnpzXCIsIFwic2duXCJdLFxuICAgICAgICBjZG86IFtcImNkb1wiLCBcInpoXCJdLFxuICAgICAgICBjZHM6IFtcImNkc1wiLCBcInNnblwiXSxcbiAgICAgICAgY2p5OiBbXCJjanlcIiwgXCJ6aFwiXSxcbiAgICAgICAgY21uOiBbXCJjbW5cIiwgXCJ6aFwiXSxcbiAgICAgICAgY29hOiBbXCJjb2FcIiwgXCJtc1wiXSxcbiAgICAgICAgY3B4OiBbXCJjcHhcIiwgXCJ6aFwiXSxcbiAgICAgICAgY3NjOiBbXCJjc2NcIiwgXCJzZ25cIl0sXG4gICAgICAgIGNzZDogW1wiY3NkXCIsIFwic2duXCJdLFxuICAgICAgICBjc2U6IFtcImNzZVwiLCBcInNnblwiXSxcbiAgICAgICAgY3NmOiBbXCJjc2ZcIiwgXCJzZ25cIl0sXG4gICAgICAgIGNzZzogW1wiY3NnXCIsIFwic2duXCJdLFxuICAgICAgICBjc2w6IFtcImNzbFwiLCBcInNnblwiXSxcbiAgICAgICAgY3NuOiBbXCJjc25cIiwgXCJzZ25cIl0sXG4gICAgICAgIGNzcTogW1wiY3NxXCIsIFwic2duXCJdLFxuICAgICAgICBjc3I6IFtcImNzclwiLCBcInNnblwiXSxcbiAgICAgICAgY3poOiBbXCJjemhcIiwgXCJ6aFwiXSxcbiAgICAgICAgY3pvOiBbXCJjem9cIiwgXCJ6aFwiXSxcbiAgICAgICAgZG9xOiBbXCJkb3FcIiwgXCJzZ25cIl0sXG4gICAgICAgIGRzZTogW1wiZHNlXCIsIFwic2duXCJdLFxuICAgICAgICBkc2w6IFtcImRzbFwiLCBcInNnblwiXSxcbiAgICAgICAgZHVwOiBbXCJkdXBcIiwgXCJtc1wiXSxcbiAgICAgICAgZWNzOiBbXCJlY3NcIiwgXCJzZ25cIl0sXG4gICAgICAgIGVzbDogW1wiZXNsXCIsIFwic2duXCJdLFxuICAgICAgICBlc246IFtcImVzblwiLCBcInNnblwiXSxcbiAgICAgICAgZXNvOiBbXCJlc29cIiwgXCJzZ25cIl0sXG4gICAgICAgIGV0aDogW1wiZXRoXCIsIFwic2duXCJdLFxuICAgICAgICBmY3M6IFtcImZjc1wiLCBcInNnblwiXSxcbiAgICAgICAgZnNlOiBbXCJmc2VcIiwgXCJzZ25cIl0sXG4gICAgICAgIGZzbDogW1wiZnNsXCIsIFwic2duXCJdLFxuICAgICAgICBmc3M6IFtcImZzc1wiLCBcInNnblwiXSxcbiAgICAgICAgZ2FuOiBbXCJnYW5cIiwgXCJ6aFwiXSxcbiAgICAgICAgZ2RzOiBbXCJnZHNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGdvbTogW1wiZ29tXCIsIFwia29rXCJdLFxuICAgICAgICBnc2U6IFtcImdzZVwiLCBcInNnblwiXSxcbiAgICAgICAgZ3NnOiBbXCJnc2dcIiwgXCJzZ25cIl0sXG4gICAgICAgIGdzbTogW1wiZ3NtXCIsIFwic2duXCJdLFxuICAgICAgICBnc3M6IFtcImdzc1wiLCBcInNnblwiXSxcbiAgICAgICAgZ3VzOiBbXCJndXNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGhhYjogW1wiaGFiXCIsIFwic2duXCJdLFxuICAgICAgICBoYWY6IFtcImhhZlwiLCBcInNnblwiXSxcbiAgICAgICAgaGFrOiBbXCJoYWtcIiwgXCJ6aFwiXSxcbiAgICAgICAgaGRzOiBbXCJoZHNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGhqaTogW1wiaGppXCIsIFwibXNcIl0sXG4gICAgICAgIGhrczogW1wiaGtzXCIsIFwic2duXCJdLFxuICAgICAgICBob3M6IFtcImhvc1wiLCBcInNnblwiXSxcbiAgICAgICAgaHBzOiBbXCJocHNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGhzaDogW1wiaHNoXCIsIFwic2duXCJdLFxuICAgICAgICBoc2w6IFtcImhzbFwiLCBcInNnblwiXSxcbiAgICAgICAgaHNuOiBbXCJoc25cIiwgXCJ6aFwiXSxcbiAgICAgICAgaWNsOiBbXCJpY2xcIiwgXCJzZ25cIl0sXG4gICAgICAgIGlsczogW1wiaWxzXCIsIFwic2duXCJdLFxuICAgICAgICBpbmw6IFtcImlubFwiLCBcInNnblwiXSxcbiAgICAgICAgaW5zOiBbXCJpbnNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGlzZTogW1wiaXNlXCIsIFwic2duXCJdLFxuICAgICAgICBpc2c6IFtcImlzZ1wiLCBcInNnblwiXSxcbiAgICAgICAgaXNyOiBbXCJpc3JcIiwgXCJzZ25cIl0sXG4gICAgICAgIGphazogW1wiamFrXCIsIFwibXNcIl0sXG4gICAgICAgIGpheDogW1wiamF4XCIsIFwibXNcIl0sXG4gICAgICAgIGpjczogW1wiamNzXCIsIFwic2duXCJdLFxuICAgICAgICBqaHM6IFtcImpoc1wiLCBcInNnblwiXSxcbiAgICAgICAgamxzOiBbXCJqbHNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGpvczogW1wiam9zXCIsIFwic2duXCJdLFxuICAgICAgICBqc2w6IFtcImpzbFwiLCBcInNnblwiXSxcbiAgICAgICAganVzOiBbXCJqdXNcIiwgXCJzZ25cIl0sXG4gICAgICAgIGtnaTogW1wia2dpXCIsIFwic2duXCJdLFxuICAgICAgICBrbm46IFtcImtublwiLCBcImtva1wiXSxcbiAgICAgICAga3ZiOiBbXCJrdmJcIiwgXCJtc1wiXSxcbiAgICAgICAga3ZrOiBbXCJrdmtcIiwgXCJzZ25cIl0sXG4gICAgICAgIGt2cjogW1wia3ZyXCIsIFwibXNcIl0sXG4gICAgICAgIGt4ZDogW1wia3hkXCIsIFwibXNcIl0sXG4gICAgICAgIGxiczogW1wibGJzXCIsIFwic2duXCJdLFxuICAgICAgICBsY2U6IFtcImxjZVwiLCBcIm1zXCJdLFxuICAgICAgICBsY2Y6IFtcImxjZlwiLCBcIm1zXCJdLFxuICAgICAgICBsaXc6IFtcImxpd1wiLCBcIm1zXCJdLFxuICAgICAgICBsbHM6IFtcImxsc1wiLCBcInNnblwiXSxcbiAgICAgICAgbHNnOiBbXCJsc2dcIiwgXCJzZ25cIl0sXG4gICAgICAgIGxzbDogW1wibHNsXCIsIFwic2duXCJdLFxuICAgICAgICBsc286IFtcImxzb1wiLCBcInNnblwiXSxcbiAgICAgICAgbHNwOiBbXCJsc3BcIiwgXCJzZ25cIl0sXG4gICAgICAgIGxzdDogW1wibHN0XCIsIFwic2duXCJdLFxuICAgICAgICBsc3k6IFtcImxzeVwiLCBcInNnblwiXSxcbiAgICAgICAgbHRnOiBbXCJsdGdcIiwgXCJsdlwiXSxcbiAgICAgICAgbHZzOiBbXCJsdnNcIiwgXCJsdlwiXSxcbiAgICAgICAgbHpoOiBbXCJsemhcIiwgXCJ6aFwiXSxcbiAgICAgICAgbWF4OiBbXCJtYXhcIiwgXCJtc1wiXSxcbiAgICAgICAgbWRsOiBbXCJtZGxcIiwgXCJzZ25cIl0sXG4gICAgICAgIG1lbzogW1wibWVvXCIsIFwibXNcIl0sXG4gICAgICAgIG1mYTogW1wibWZhXCIsIFwibXNcIl0sXG4gICAgICAgIG1mYjogW1wibWZiXCIsIFwibXNcIl0sXG4gICAgICAgIG1mczogW1wibWZzXCIsIFwic2duXCJdLFxuICAgICAgICBtaW46IFtcIm1pblwiLCBcIm1zXCJdLFxuICAgICAgICBtbnA6IFtcIm1ucFwiLCBcInpoXCJdLFxuICAgICAgICBtcWc6IFtcIm1xZ1wiLCBcIm1zXCJdLFxuICAgICAgICBtcmU6IFtcIm1yZVwiLCBcInNnblwiXSxcbiAgICAgICAgbXNkOiBbXCJtc2RcIiwgXCJzZ25cIl0sXG4gICAgICAgIG1zaTogW1wibXNpXCIsIFwibXNcIl0sXG4gICAgICAgIG1zcjogW1wibXNyXCIsIFwic2duXCJdLFxuICAgICAgICBtdWk6IFtcIm11aVwiLCBcIm1zXCJdLFxuICAgICAgICBtemM6IFtcIm16Y1wiLCBcInNnblwiXSxcbiAgICAgICAgbXpnOiBbXCJtemdcIiwgXCJzZ25cIl0sXG4gICAgICAgIG16eTogW1wibXp5XCIsIFwic2duXCJdLFxuICAgICAgICBuYW46IFtcIm5hblwiLCBcInpoXCJdLFxuICAgICAgICBuYnM6IFtcIm5ic1wiLCBcInNnblwiXSxcbiAgICAgICAgbmNzOiBbXCJuY3NcIiwgXCJzZ25cIl0sXG4gICAgICAgIG5zaTogW1wibnNpXCIsIFwic2duXCJdLFxuICAgICAgICBuc2w6IFtcIm5zbFwiLCBcInNnblwiXSxcbiAgICAgICAgbnNwOiBbXCJuc3BcIiwgXCJzZ25cIl0sXG4gICAgICAgIG5zcjogW1wibnNyXCIsIFwic2duXCJdLFxuICAgICAgICBuenM6IFtcIm56c1wiLCBcInNnblwiXSxcbiAgICAgICAgb2tsOiBbXCJva2xcIiwgXCJzZ25cIl0sXG4gICAgICAgIG9ybjogW1wib3JuXCIsIFwibXNcIl0sXG4gICAgICAgIG9yczogW1wib3JzXCIsIFwibXNcIl0sXG4gICAgICAgIHBlbDogW1wicGVsXCIsIFwibXNcIl0sXG4gICAgICAgIHBnYTogW1wicGdhXCIsIFwiYXJcIl0sXG4gICAgICAgIHBrczogW1wicGtzXCIsIFwic2duXCJdLFxuICAgICAgICBwcmw6IFtcInBybFwiLCBcInNnblwiXSxcbiAgICAgICAgcHJ6OiBbXCJwcnpcIiwgXCJzZ25cIl0sXG4gICAgICAgIHBzYzogW1wicHNjXCIsIFwic2duXCJdLFxuICAgICAgICBwc2Q6IFtcInBzZFwiLCBcInNnblwiXSxcbiAgICAgICAgcHNlOiBbXCJwc2VcIiwgXCJtc1wiXSxcbiAgICAgICAgcHNnOiBbXCJwc2dcIiwgXCJzZ25cIl0sXG4gICAgICAgIHBzbDogW1wicHNsXCIsIFwic2duXCJdLFxuICAgICAgICBwc286IFtcInBzb1wiLCBcInNnblwiXSxcbiAgICAgICAgcHNwOiBbXCJwc3BcIiwgXCJzZ25cIl0sXG4gICAgICAgIHBzcjogW1wicHNyXCIsIFwic2duXCJdLFxuICAgICAgICBweXM6IFtcInB5c1wiLCBcInNnblwiXSxcbiAgICAgICAgcm1zOiBbXCJybXNcIiwgXCJzZ25cIl0sXG4gICAgICAgIHJzaTogW1wicnNpXCIsIFwic2duXCJdLFxuICAgICAgICByc2w6IFtcInJzbFwiLCBcInNnblwiXSxcbiAgICAgICAgc2RsOiBbXCJzZGxcIiwgXCJzZ25cIl0sXG4gICAgICAgIHNmYjogW1wic2ZiXCIsIFwic2duXCJdLFxuICAgICAgICBzZnM6IFtcInNmc1wiLCBcInNnblwiXSxcbiAgICAgICAgc2dnOiBbXCJzZ2dcIiwgXCJzZ25cIl0sXG4gICAgICAgIHNneDogW1wic2d4XCIsIFwic2duXCJdLFxuICAgICAgICBzaHU6IFtcInNodVwiLCBcImFyXCJdLFxuICAgICAgICBzbGY6IFtcInNsZlwiLCBcInNnblwiXSxcbiAgICAgICAgc2xzOiBbXCJzbHNcIiwgXCJzZ25cIl0sXG4gICAgICAgIHNxazogW1wic3FrXCIsIFwic2duXCJdLFxuICAgICAgICBzcXM6IFtcInNxc1wiLCBcInNnblwiXSxcbiAgICAgICAgc3NoOiBbXCJzc2hcIiwgXCJhclwiXSxcbiAgICAgICAgc3NwOiBbXCJzc3BcIiwgXCJzZ25cIl0sXG4gICAgICAgIHNzcjogW1wic3NyXCIsIFwic2duXCJdLFxuICAgICAgICBzdms6IFtcInN2a1wiLCBcInNnblwiXSxcbiAgICAgICAgc3djOiBbXCJzd2NcIiwgXCJzd1wiXSxcbiAgICAgICAgc3doOiBbXCJzd2hcIiwgXCJzd1wiXSxcbiAgICAgICAgc3dsOiBbXCJzd2xcIiwgXCJzZ25cIl0sXG4gICAgICAgIHN5eTogW1wic3l5XCIsIFwic2duXCJdLFxuICAgICAgICB0bXc6IFtcInRtd1wiLCBcIm1zXCJdLFxuICAgICAgICB0c2U6IFtcInRzZVwiLCBcInNnblwiXSxcbiAgICAgICAgdHNtOiBbXCJ0c21cIiwgXCJzZ25cIl0sXG4gICAgICAgIHRzcTogW1widHNxXCIsIFwic2duXCJdLFxuICAgICAgICB0c3M6IFtcInRzc1wiLCBcInNnblwiXSxcbiAgICAgICAgdHN5OiBbXCJ0c3lcIiwgXCJzZ25cIl0sXG4gICAgICAgIHR6YTogW1widHphXCIsIFwic2duXCJdLFxuICAgICAgICB1Z246IFtcInVnblwiLCBcInNnblwiXSxcbiAgICAgICAgdWd5OiBbXCJ1Z3lcIiwgXCJzZ25cIl0sXG4gICAgICAgIHVrbDogW1widWtsXCIsIFwic2duXCJdLFxuICAgICAgICB1a3M6IFtcInVrc1wiLCBcInNnblwiXSxcbiAgICAgICAgdXJrOiBbXCJ1cmtcIiwgXCJtc1wiXSxcbiAgICAgICAgdXpuOiBbXCJ1em5cIiwgXCJ1elwiXSxcbiAgICAgICAgdXpzOiBbXCJ1enNcIiwgXCJ1elwiXSxcbiAgICAgICAgdmd0OiBbXCJ2Z3RcIiwgXCJzZ25cIl0sXG4gICAgICAgIHZrazogW1widmtrXCIsIFwibXNcIl0sXG4gICAgICAgIHZrdDogW1widmt0XCIsIFwibXNcIl0sXG4gICAgICAgIHZzaTogW1widnNpXCIsIFwic2duXCJdLFxuICAgICAgICB2c2w6IFtcInZzbFwiLCBcInNnblwiXSxcbiAgICAgICAgdnN2OiBbXCJ2c3ZcIiwgXCJzZ25cIl0sXG4gICAgICAgIHd1dTogW1wid3V1XCIsIFwiemhcIl0sXG4gICAgICAgIHhraTogW1wieGtpXCIsIFwic2duXCJdLFxuICAgICAgICB4bWw6IFtcInhtbFwiLCBcInNnblwiXSxcbiAgICAgICAgeG1tOiBbXCJ4bW1cIiwgXCJtc1wiXSxcbiAgICAgICAgeG1zOiBbXCJ4bXNcIiwgXCJzZ25cIl0sXG4gICAgICAgIHlkczogW1wieWRzXCIsIFwic2duXCJdLFxuICAgICAgICB5c2w6IFtcInlzbFwiLCBcInNnblwiXSxcbiAgICAgICAgeXVlOiBbXCJ5dWVcIiwgXCJ6aFwiXSxcbiAgICAgICAgemliOiBbXCJ6aWJcIiwgXCJzZ25cIl0sXG4gICAgICAgIHpsbTogW1wiemxtXCIsIFwibXNcIl0sXG4gICAgICAgIHptaTogW1wiem1pXCIsIFwibXNcIl0sXG4gICAgICAgIHpzbDogW1wienNsXCIsIFwic2duXCJdLFxuICAgICAgICB6c206IFtcInpzbVwiLCBcIm1zXCJdXG4gICAgfVxufTtcblxuLyoqXG4gKiBDb252ZXJ0IG9ubHkgYS16IHRvIHVwcGVyY2FzZSBhcyBwZXIgc2VjdGlvbiA2LjEgb2YgdGhlIHNwZWNcbiAqL1xuZnVuY3Rpb24gdG9MYXRpblVwcGVyQ2FzZShzdHIpIHtcbiAgICB2YXIgaSA9IHN0ci5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHZhciBjaCA9IHN0ci5jaGFyQXQoaSk7XG5cbiAgICAgICAgaWYgKGNoID49IFwiYVwiICYmIGNoIDw9IFwielwiKSBzdHIgPSBzdHIuc2xpY2UoMCwgaSkgKyBjaC50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKGkgKyAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyO1xufVxuXG4vKipcbiAqIFRoZSBJc1N0cnVjdHVyYWxseVZhbGlkTGFuZ3VhZ2VUYWcgYWJzdHJhY3Qgb3BlcmF0aW9uIHZlcmlmaWVzIHRoYXQgdGhlIGxvY2FsZVxuICogYXJndW1lbnQgKHdoaWNoIG11c3QgYmUgYSBTdHJpbmcgdmFsdWUpXG4gKlxuICogLSByZXByZXNlbnRzIGEgd2VsbC1mb3JtZWQgQkNQIDQ3IGxhbmd1YWdlIHRhZyBhcyBzcGVjaWZpZWQgaW4gUkZDIDU2NDYgc2VjdGlvblxuICogICAyLjEsIG9yIHN1Y2Nlc3NvcixcbiAqIC0gZG9lcyBub3QgaW5jbHVkZSBkdXBsaWNhdGUgdmFyaWFudCBzdWJ0YWdzLCBhbmRcbiAqIC0gZG9lcyBub3QgaW5jbHVkZSBkdXBsaWNhdGUgc2luZ2xldG9uIHN1YnRhZ3MuXG4gKlxuICogVGhlIGFic3RyYWN0IG9wZXJhdGlvbiByZXR1cm5zIHRydWUgaWYgbG9jYWxlIGNhbiBiZSBnZW5lcmF0ZWQgZnJvbSB0aGUgQUJORlxuICogZ3JhbW1hciBpbiBzZWN0aW9uIDIuMSBvZiB0aGUgUkZDLCBzdGFydGluZyB3aXRoIExhbmd1YWdlLVRhZywgYW5kIGRvZXMgbm90XG4gKiBjb250YWluIGR1cGxpY2F0ZSB2YXJpYW50IG9yIHNpbmdsZXRvbiBzdWJ0YWdzIChvdGhlciB0aGFuIGFzIGEgcHJpdmF0ZSB1c2VcbiAqIHN1YnRhZykuIEl0IHJldHVybnMgZmFsc2Ugb3RoZXJ3aXNlLiBUZXJtaW5hbCB2YWx1ZSBjaGFyYWN0ZXJzIGluIHRoZSBncmFtbWFyIGFyZVxuICogaW50ZXJwcmV0ZWQgYXMgdGhlIFVuaWNvZGUgZXF1aXZhbGVudHMgb2YgdGhlIEFTQ0lJIG9jdGV0IHZhbHVlcyBnaXZlbi5cbiAqL1xuZnVuY3Rpb24gLyogNi4yLjIgKi9Jc1N0cnVjdHVyYWxseVZhbGlkTGFuZ3VhZ2VUYWcobG9jYWxlKSB7XG4gICAgLy8gcmVwcmVzZW50cyBhIHdlbGwtZm9ybWVkIEJDUCA0NyBsYW5ndWFnZSB0YWcgYXMgc3BlY2lmaWVkIGluIFJGQyA1NjQ2XG4gICAgaWYgKCFleHBCQ1A0N1N5bnRheC50ZXN0KGxvY2FsZSkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvZXMgbm90IGluY2x1ZGUgZHVwbGljYXRlIHZhcmlhbnQgc3VidGFncywgYW5kXG4gICAgaWYgKGV4cFZhcmlhbnREdXBlcy50ZXN0KGxvY2FsZSkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGRvZXMgbm90IGluY2x1ZGUgZHVwbGljYXRlIHNpbmdsZXRvbiBzdWJ0YWdzLlxuICAgIGlmIChleHBTaW5nbGV0b25EdXBlcy50ZXN0KGxvY2FsZSkpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFRoZSBDYW5vbmljYWxpemVMYW5ndWFnZVRhZyBhYnN0cmFjdCBvcGVyYXRpb24gcmV0dXJucyB0aGUgY2Fub25pY2FsIGFuZCBjYXNlLVxuICogcmVndWxhcml6ZWQgZm9ybSBvZiB0aGUgbG9jYWxlIGFyZ3VtZW50ICh3aGljaCBtdXN0IGJlIGEgU3RyaW5nIHZhbHVlIHRoYXQgaXNcbiAqIGEgc3RydWN0dXJhbGx5IHZhbGlkIEJDUCA0NyBsYW5ndWFnZSB0YWcgYXMgdmVyaWZpZWQgYnkgdGhlXG4gKiBJc1N0cnVjdHVyYWxseVZhbGlkTGFuZ3VhZ2VUYWcgYWJzdHJhY3Qgb3BlcmF0aW9uKS4gSXQgdGFrZXMgdGhlIHN0ZXBzXG4gKiBzcGVjaWZpZWQgaW4gUkZDIDU2NDYgc2VjdGlvbiA0LjUsIG9yIHN1Y2Nlc3NvciwgdG8gYnJpbmcgdGhlIGxhbmd1YWdlIHRhZ1xuICogaW50byBjYW5vbmljYWwgZm9ybSwgYW5kIHRvIHJlZ3VsYXJpemUgdGhlIGNhc2Ugb2YgdGhlIHN1YnRhZ3MsIGJ1dCBkb2VzIG5vdFxuICogdGFrZSB0aGUgc3RlcHMgdG8gYnJpbmcgYSBsYW5ndWFnZSB0YWcgaW50byDigJxleHRsYW5nIGZvcm3igJ0gYW5kIHRvIHJlb3JkZXJcbiAqIHZhcmlhbnQgc3VidGFncy5cblxuICogVGhlIHNwZWNpZmljYXRpb25zIGZvciBleHRlbnNpb25zIHRvIEJDUCA0NyBsYW5ndWFnZSB0YWdzLCBzdWNoIGFzIFJGQyA2MDY3LFxuICogbWF5IGluY2x1ZGUgY2Fub25pY2FsaXphdGlvbiBydWxlcyBmb3IgdGhlIGV4dGVuc2lvbiBzdWJ0YWcgc2VxdWVuY2VzIHRoZXlcbiAqIGRlZmluZSB0aGF0IGdvIGJleW9uZCB0aGUgY2Fub25pY2FsaXphdGlvbiBydWxlcyBvZiBSRkMgNTY0NiBzZWN0aW9uIDQuNS5cbiAqIEltcGxlbWVudGF0aW9ucyBhcmUgYWxsb3dlZCwgYnV0IG5vdCByZXF1aXJlZCwgdG8gYXBwbHkgdGhlc2UgYWRkaXRpb25hbCBydWxlcy5cbiAqL1xuZnVuY3Rpb24gLyogNi4yLjMgKi9DYW5vbmljYWxpemVMYW5ndWFnZVRhZyhsb2NhbGUpIHtcbiAgICB2YXIgbWF0Y2ggPSB2b2lkIDAsXG4gICAgICAgIHBhcnRzID0gdm9pZCAwO1xuXG4gICAgLy8gQSBsYW5ndWFnZSB0YWcgaXMgaW4gJ2Nhbm9uaWNhbCBmb3JtJyB3aGVuIHRoZSB0YWcgaXMgd2VsbC1mb3JtZWRcbiAgICAvLyBhY2NvcmRpbmcgdG8gdGhlIHJ1bGVzIGluIFNlY3Rpb25zIDIuMSBhbmQgMi4yXG5cbiAgICAvLyBTZWN0aW9uIDIuMSBzYXlzIGFsbCBzdWJ0YWdzIHVzZSBsb3dlcmNhc2UuLi5cbiAgICBsb2NhbGUgPSBsb2NhbGUudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIC4uLndpdGggMiBleGNlcHRpb25zOiAndHdvLWxldHRlciBhbmQgZm91ci1sZXR0ZXIgc3VidGFncyB0aGF0IG5laXRoZXJcbiAgICAvLyBhcHBlYXIgYXQgdGhlIHN0YXJ0IG9mIHRoZSB0YWcgbm9yIG9jY3VyIGFmdGVyIHNpbmdsZXRvbnMuICBTdWNoIHR3by1sZXR0ZXJcbiAgICAvLyBzdWJ0YWdzIGFyZSBhbGwgdXBwZXJjYXNlIChhcyBpbiB0aGUgdGFncyBcImVuLUNBLXgtY2FcIiBvciBcInNnbi1CRS1GUlwiKSBhbmRcbiAgICAvLyBmb3VyLWxldHRlciBzdWJ0YWdzIGFyZSB0aXRsZWNhc2UgKGFzIGluIHRoZSB0YWcgXCJhei1MYXRuLXgtbGF0blwiKS5cbiAgICBwYXJ0cyA9IGxvY2FsZS5zcGxpdCgnLScpO1xuICAgIGZvciAodmFyIGkgPSAxLCBtYXggPSBwYXJ0cy5sZW5ndGg7IGkgPCBtYXg7IGkrKykge1xuICAgICAgICAvLyBUd28tbGV0dGVyIHN1YnRhZ3MgYXJlIGFsbCB1cHBlcmNhc2VcbiAgICAgICAgaWYgKHBhcnRzW2ldLmxlbmd0aCA9PT0gMikgcGFydHNbaV0gPSBwYXJ0c1tpXS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIC8vIEZvdXItbGV0dGVyIHN1YnRhZ3MgYXJlIHRpdGxlY2FzZVxuICAgICAgICBlbHNlIGlmIChwYXJ0c1tpXS5sZW5ndGggPT09IDQpIHBhcnRzW2ldID0gcGFydHNbaV0uY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwYXJ0c1tpXS5zbGljZSgxKTtcblxuICAgICAgICAgICAgLy8gSXMgaXQgYSBzaW5nbGV0b24/XG4gICAgICAgICAgICBlbHNlIGlmIChwYXJ0c1tpXS5sZW5ndGggPT09IDEgJiYgcGFydHNbaV0gIT09ICd4JykgYnJlYWs7XG4gICAgfVxuICAgIGxvY2FsZSA9IGFyckpvaW4uY2FsbChwYXJ0cywgJy0nKTtcblxuICAgIC8vIFRoZSBzdGVwcyBsYWlkIG91dCBpbiBSRkMgNTY0NiBzZWN0aW9uIDQuNSBhcmUgYXMgZm9sbG93czpcblxuICAgIC8vIDEuICBFeHRlbnNpb24gc2VxdWVuY2VzIGFyZSBvcmRlcmVkIGludG8gY2FzZS1pbnNlbnNpdGl2ZSBBU0NJSSBvcmRlclxuICAgIC8vICAgICBieSBzaW5nbGV0b24gc3VidGFnLlxuICAgIGlmICgobWF0Y2ggPSBsb2NhbGUubWF0Y2goZXhwRXh0U2VxdWVuY2VzKSkgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAvLyBUaGUgYnVpbHQtaW4gc29ydCgpIHNvcnRzIGJ5IEFTQ0lJIG9yZGVyLCBzbyB1c2UgdGhhdFxuICAgICAgICBtYXRjaC5zb3J0KCk7XG5cbiAgICAgICAgLy8gUmVwbGFjZSBhbGwgZXh0ZW5zaW9ucyB3aXRoIHRoZSBqb2luZWQsIHNvcnRlZCBhcnJheVxuICAgICAgICBsb2NhbGUgPSBsb2NhbGUucmVwbGFjZShSZWdFeHAoJyg/OicgKyBleHBFeHRTZXF1ZW5jZXMuc291cmNlICsgJykrJywgJ2knKSwgYXJySm9pbi5jYWxsKG1hdGNoLCAnJykpO1xuICAgIH1cblxuICAgIC8vIDIuICBSZWR1bmRhbnQgb3IgZ3JhbmRmYXRoZXJlZCB0YWdzIGFyZSByZXBsYWNlZCBieSB0aGVpciAnUHJlZmVycmVkLVxuICAgIC8vICAgICBWYWx1ZScsIGlmIHRoZXJlIGlzIG9uZS5cbiAgICBpZiAoaG9wLmNhbGwocmVkdW5kYW50VGFncy50YWdzLCBsb2NhbGUpKSBsb2NhbGUgPSByZWR1bmRhbnRUYWdzLnRhZ3NbbG9jYWxlXTtcblxuICAgIC8vIDMuICBTdWJ0YWdzIGFyZSByZXBsYWNlZCBieSB0aGVpciAnUHJlZmVycmVkLVZhbHVlJywgaWYgdGhlcmUgaXMgb25lLlxuICAgIC8vICAgICBGb3IgZXh0bGFuZ3MsIHRoZSBvcmlnaW5hbCBwcmltYXJ5IGxhbmd1YWdlIHN1YnRhZyBpcyBhbHNvXG4gICAgLy8gICAgIHJlcGxhY2VkIGlmIHRoZXJlIGlzIGEgcHJpbWFyeSBsYW5ndWFnZSBzdWJ0YWcgaW4gdGhlICdQcmVmZXJyZWQtXG4gICAgLy8gICAgIFZhbHVlJy5cbiAgICBwYXJ0cyA9IGxvY2FsZS5zcGxpdCgnLScpO1xuXG4gICAgZm9yICh2YXIgX2kgPSAxLCBfbWF4ID0gcGFydHMubGVuZ3RoOyBfaSA8IF9tYXg7IF9pKyspIHtcbiAgICAgICAgaWYgKGhvcC5jYWxsKHJlZHVuZGFudFRhZ3Muc3VidGFncywgcGFydHNbX2ldKSkgcGFydHNbX2ldID0gcmVkdW5kYW50VGFncy5zdWJ0YWdzW3BhcnRzW19pXV07ZWxzZSBpZiAoaG9wLmNhbGwocmVkdW5kYW50VGFncy5leHRMYW5nLCBwYXJ0c1tfaV0pKSB7XG4gICAgICAgICAgICBwYXJ0c1tfaV0gPSByZWR1bmRhbnRUYWdzLmV4dExhbmdbcGFydHNbX2ldXVswXTtcblxuICAgICAgICAgICAgLy8gRm9yIGV4dGxhbmcgdGFncywgdGhlIHByZWZpeCBuZWVkcyB0byBiZSByZW1vdmVkIGlmIGl0IGlzIHJlZHVuZGFudFxuICAgICAgICAgICAgaWYgKF9pID09PSAxICYmIHJlZHVuZGFudFRhZ3MuZXh0TGFuZ1twYXJ0c1sxXV1bMV0gPT09IHBhcnRzWzBdKSB7XG4gICAgICAgICAgICAgICAgcGFydHMgPSBhcnJTbGljZS5jYWxsKHBhcnRzLCBfaSsrKTtcbiAgICAgICAgICAgICAgICBfbWF4IC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXJySm9pbi5jYWxsKHBhcnRzLCAnLScpO1xufVxuXG4vKipcbiAqIFRoZSBEZWZhdWx0TG9jYWxlIGFic3RyYWN0IG9wZXJhdGlvbiByZXR1cm5zIGEgU3RyaW5nIHZhbHVlIHJlcHJlc2VudGluZyB0aGVcbiAqIHN0cnVjdHVyYWxseSB2YWxpZCAoNi4yLjIpIGFuZCBjYW5vbmljYWxpemVkICg2LjIuMykgQkNQIDQ3IGxhbmd1YWdlIHRhZyBmb3IgdGhlXG4gKiBob3N0IGVudmlyb25tZW504oCZcyBjdXJyZW50IGxvY2FsZS5cbiAqL1xuZnVuY3Rpb24gLyogNi4yLjQgKi9EZWZhdWx0TG9jYWxlKCkge1xuICAgIHJldHVybiBkZWZhdWx0TG9jYWxlO1xufVxuXG4vLyBTZWN0IDYuMyBDdXJyZW5jeSBDb2Rlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT1cblxudmFyIGV4cEN1cnJlbmN5Q29kZSA9IC9eW0EtWl17M30kLztcblxuLyoqXG4gKiBUaGUgSXNXZWxsRm9ybWVkQ3VycmVuY3lDb2RlIGFic3RyYWN0IG9wZXJhdGlvbiB2ZXJpZmllcyB0aGF0IHRoZSBjdXJyZW5jeSBhcmd1bWVudFxuICogKGFmdGVyIGNvbnZlcnNpb24gdG8gYSBTdHJpbmcgdmFsdWUpIHJlcHJlc2VudHMgYSB3ZWxsLWZvcm1lZCAzLWxldHRlciBJU08gY3VycmVuY3lcbiAqIGNvZGUuIFRoZSBmb2xsb3dpbmcgc3RlcHMgYXJlIHRha2VuOlxuICovXG5mdW5jdGlvbiAvKiA2LjMuMSAqL0lzV2VsbEZvcm1lZEN1cnJlbmN5Q29kZShjdXJyZW5jeSkge1xuICAgIC8vIDEuIExldCBgY2AgYmUgVG9TdHJpbmcoY3VycmVuY3kpXG4gICAgdmFyIGMgPSBTdHJpbmcoY3VycmVuY3kpO1xuXG4gICAgLy8gMi4gTGV0IGBub3JtYWxpemVkYCBiZSB0aGUgcmVzdWx0IG9mIG1hcHBpbmcgYyB0byB1cHBlciBjYXNlIGFzIGRlc2NyaWJlZFxuICAgIC8vICAgIGluIDYuMS5cbiAgICB2YXIgbm9ybWFsaXplZCA9IHRvTGF0aW5VcHBlckNhc2UoYyk7XG5cbiAgICAvLyAzLiBJZiB0aGUgc3RyaW5nIGxlbmd0aCBvZiBub3JtYWxpemVkIGlzIG5vdCAzLCByZXR1cm4gZmFsc2UuXG4gICAgLy8gNC4gSWYgbm9ybWFsaXplZCBjb250YWlucyBhbnkgY2hhcmFjdGVyIHRoYXQgaXMgbm90IGluIHRoZSByYW5nZSBcIkFcIiB0byBcIlpcIlxuICAgIC8vICAgIChVKzAwNDEgdG8gVSswMDVBKSwgcmV0dXJuIGZhbHNlLlxuICAgIGlmIChleHBDdXJyZW5jeUNvZGUudGVzdChub3JtYWxpemVkKSA9PT0gZmFsc2UpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIDUuIFJldHVybiB0cnVlXG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBleHBVbmljb2RlRXhTZXEgPSAvLXUoPzotWzAtOWEtel17Miw4fSkrL2dpOyAvLyBTZWUgYGV4dGVuc2lvbmAgYmVsb3dcblxuZnVuY3Rpb24gLyogOS4yLjEgKi9DYW5vbmljYWxpemVMb2NhbGVMaXN0KGxvY2FsZXMpIHtcbiAgICAvLyBUaGUgYWJzdHJhY3Qgb3BlcmF0aW9uIENhbm9uaWNhbGl6ZUxvY2FsZUxpc3QgdGFrZXMgdGhlIGZvbGxvd2luZyBzdGVwczpcblxuICAgIC8vIDEuIElmIGxvY2FsZXMgaXMgdW5kZWZpbmVkLCB0aGVuIGEuIFJldHVybiBhIG5ldyBlbXB0eSBMaXN0XG4gICAgaWYgKGxvY2FsZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG5ldyBMaXN0KCk7XG5cbiAgICAvLyAyLiBMZXQgc2VlbiBiZSBhIG5ldyBlbXB0eSBMaXN0LlxuICAgIHZhciBzZWVuID0gbmV3IExpc3QoKTtcblxuICAgIC8vIDMuIElmIGxvY2FsZXMgaXMgYSBTdHJpbmcgdmFsdWUsIHRoZW5cbiAgICAvLyAgICBhLiBMZXQgbG9jYWxlcyBiZSBhIG5ldyBhcnJheSBjcmVhdGVkIGFzIGlmIGJ5IHRoZSBleHByZXNzaW9uIG5ld1xuICAgIC8vICAgIEFycmF5KGxvY2FsZXMpIHdoZXJlIEFycmF5IGlzIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBjb25zdHJ1Y3RvciB3aXRoXG4gICAgLy8gICAgdGhhdCBuYW1lIGFuZCBsb2NhbGVzIGlzIHRoZSB2YWx1ZSBvZiBsb2NhbGVzLlxuICAgIGxvY2FsZXMgPSB0eXBlb2YgbG9jYWxlcyA9PT0gJ3N0cmluZycgPyBbbG9jYWxlc10gOiBsb2NhbGVzO1xuXG4gICAgLy8gNC4gTGV0IE8gYmUgVG9PYmplY3QobG9jYWxlcykuXG4gICAgdmFyIE8gPSB0b09iamVjdChsb2NhbGVzKTtcblxuICAgIC8vIDUuIExldCBsZW5WYWx1ZSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgLy8gICAgTyB3aXRoIHRoZSBhcmd1bWVudCBcImxlbmd0aFwiLlxuICAgIC8vIDYuIExldCBsZW4gYmUgVG9VaW50MzIobGVuVmFsdWUpLlxuICAgIHZhciBsZW4gPSBPLmxlbmd0aDtcblxuICAgIC8vIDcuIExldCBrIGJlIDAuXG4gICAgdmFyIGsgPSAwO1xuXG4gICAgLy8gOC4gUmVwZWF0LCB3aGlsZSBrIDwgbGVuXG4gICAgd2hpbGUgKGsgPCBsZW4pIHtcbiAgICAgICAgLy8gYS4gTGV0IFBrIGJlIFRvU3RyaW5nKGspLlxuICAgICAgICB2YXIgUGsgPSBTdHJpbmcoayk7XG5cbiAgICAgICAgLy8gYi4gTGV0IGtQcmVzZW50IGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tIYXNQcm9wZXJ0eV1dIGludGVybmFsXG4gICAgICAgIC8vICAgIG1ldGhvZCBvZiBPIHdpdGggYXJndW1lbnQgUGsuXG4gICAgICAgIHZhciBrUHJlc2VudCA9IFBrIGluIE87XG5cbiAgICAgICAgLy8gYy4gSWYga1ByZXNlbnQgaXMgdHJ1ZSwgdGhlblxuICAgICAgICBpZiAoa1ByZXNlbnQpIHtcbiAgICAgICAgICAgIC8vIGkuIExldCBrVmFsdWUgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsXG4gICAgICAgICAgICAvLyAgICAgbWV0aG9kIG9mIE8gd2l0aCBhcmd1bWVudCBQay5cbiAgICAgICAgICAgIHZhciBrVmFsdWUgPSBPW1BrXTtcblxuICAgICAgICAgICAgLy8gaWkuIElmIHRoZSB0eXBlIG9mIGtWYWx1ZSBpcyBub3QgU3RyaW5nIG9yIE9iamVjdCwgdGhlbiB0aHJvdyBhXG4gICAgICAgICAgICAvLyAgICAgVHlwZUVycm9yIGV4Y2VwdGlvbi5cbiAgICAgICAgICAgIGlmIChrVmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIGtWYWx1ZSAhPT0gJ3N0cmluZycgJiYgKHR5cGVvZiBrVmFsdWUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogYmFiZWxIZWxwZXJzW1widHlwZW9mXCJdKGtWYWx1ZSkpICE9PSAnb2JqZWN0JykgdGhyb3cgbmV3IFR5cGVFcnJvcignU3RyaW5nIG9yIE9iamVjdCB0eXBlIGV4cGVjdGVkJyk7XG5cbiAgICAgICAgICAgIC8vIGlpaS4gTGV0IHRhZyBiZSBUb1N0cmluZyhrVmFsdWUpLlxuICAgICAgICAgICAgdmFyIHRhZyA9IFN0cmluZyhrVmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBpdi4gSWYgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBhYnN0cmFjdCBvcGVyYXRpb25cbiAgICAgICAgICAgIC8vICAgICBJc1N0cnVjdHVyYWxseVZhbGlkTGFuZ3VhZ2VUYWcgKGRlZmluZWQgaW4gNi4yLjIpLCBwYXNzaW5nIHRhZyBhc1xuICAgICAgICAgICAgLy8gICAgIHRoZSBhcmd1bWVudCwgaXMgZmFsc2UsIHRoZW4gdGhyb3cgYSBSYW5nZUVycm9yIGV4Y2VwdGlvbi5cbiAgICAgICAgICAgIGlmICghSXNTdHJ1Y3R1cmFsbHlWYWxpZExhbmd1YWdlVGFnKHRhZykpIHRocm93IG5ldyBSYW5nZUVycm9yKFwiJ1wiICsgdGFnICsgXCInIGlzIG5vdCBhIHN0cnVjdHVyYWxseSB2YWxpZCBsYW5ndWFnZSB0YWdcIik7XG5cbiAgICAgICAgICAgIC8vIHYuIExldCB0YWcgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBhYnN0cmFjdCBvcGVyYXRpb25cbiAgICAgICAgICAgIC8vICAgIENhbm9uaWNhbGl6ZUxhbmd1YWdlVGFnIChkZWZpbmVkIGluIDYuMi4zKSwgcGFzc2luZyB0YWcgYXMgdGhlXG4gICAgICAgICAgICAvLyAgICBhcmd1bWVudC5cbiAgICAgICAgICAgIHRhZyA9IENhbm9uaWNhbGl6ZUxhbmd1YWdlVGFnKHRhZyk7XG5cbiAgICAgICAgICAgIC8vIHZpLiBJZiB0YWcgaXMgbm90IGFuIGVsZW1lbnQgb2Ygc2VlbiwgdGhlbiBhcHBlbmQgdGFnIGFzIHRoZSBsYXN0XG4gICAgICAgICAgICAvLyAgICAgZWxlbWVudCBvZiBzZWVuLlxuICAgICAgICAgICAgaWYgKGFyckluZGV4T2YuY2FsbChzZWVuLCB0YWcpID09PSAtMSkgYXJyUHVzaC5jYWxsKHNlZW4sIHRhZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkLiBJbmNyZWFzZSBrIGJ5IDEuXG4gICAgICAgIGsrKztcbiAgICB9XG5cbiAgICAvLyA5LiBSZXR1cm4gc2Vlbi5cbiAgICByZXR1cm4gc2Vlbjtcbn1cblxuLyoqXG4gKiBUaGUgQmVzdEF2YWlsYWJsZUxvY2FsZSBhYnN0cmFjdCBvcGVyYXRpb24gY29tcGFyZXMgdGhlIHByb3ZpZGVkIGFyZ3VtZW50XG4gKiBsb2NhbGUsIHdoaWNoIG11c3QgYmUgYSBTdHJpbmcgdmFsdWUgd2l0aCBhIHN0cnVjdHVyYWxseSB2YWxpZCBhbmRcbiAqIGNhbm9uaWNhbGl6ZWQgQkNQIDQ3IGxhbmd1YWdlIHRhZywgYWdhaW5zdCB0aGUgbG9jYWxlcyBpbiBhdmFpbGFibGVMb2NhbGVzIGFuZFxuICogcmV0dXJucyBlaXRoZXIgdGhlIGxvbmdlc3Qgbm9uLWVtcHR5IHByZWZpeCBvZiBsb2NhbGUgdGhhdCBpcyBhbiBlbGVtZW50IG9mXG4gKiBhdmFpbGFibGVMb2NhbGVzLCBvciB1bmRlZmluZWQgaWYgdGhlcmUgaXMgbm8gc3VjaCBlbGVtZW50LiBJdCB1c2VzIHRoZVxuICogZmFsbGJhY2sgbWVjaGFuaXNtIG9mIFJGQyA0NjQ3LCBzZWN0aW9uIDMuNC4gVGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbmZ1bmN0aW9uIC8qIDkuMi4yICovQmVzdEF2YWlsYWJsZUxvY2FsZShhdmFpbGFibGVMb2NhbGVzLCBsb2NhbGUpIHtcbiAgICAvLyAxLiBMZXQgY2FuZGlkYXRlIGJlIGxvY2FsZVxuICAgIHZhciBjYW5kaWRhdGUgPSBsb2NhbGU7XG5cbiAgICAvLyAyLiBSZXBlYXRcbiAgICB3aGlsZSAoY2FuZGlkYXRlKSB7XG4gICAgICAgIC8vIGEuIElmIGF2YWlsYWJsZUxvY2FsZXMgY29udGFpbnMgYW4gZWxlbWVudCBlcXVhbCB0byBjYW5kaWRhdGUsIHRoZW4gcmV0dXJuXG4gICAgICAgIC8vIGNhbmRpZGF0ZS5cbiAgICAgICAgaWYgKGFyckluZGV4T2YuY2FsbChhdmFpbGFibGVMb2NhbGVzLCBjYW5kaWRhdGUpID4gLTEpIHJldHVybiBjYW5kaWRhdGU7XG5cbiAgICAgICAgLy8gYi4gTGV0IHBvcyBiZSB0aGUgY2hhcmFjdGVyIGluZGV4IG9mIHRoZSBsYXN0IG9jY3VycmVuY2Ugb2YgXCItXCJcbiAgICAgICAgLy8gKFUrMDAyRCkgd2l0aGluIGNhbmRpZGF0ZS4gSWYgdGhhdCBjaGFyYWN0ZXIgZG9lcyBub3Qgb2NjdXIsIHJldHVyblxuICAgICAgICAvLyB1bmRlZmluZWQuXG4gICAgICAgIHZhciBwb3MgPSBjYW5kaWRhdGUubGFzdEluZGV4T2YoJy0nKTtcblxuICAgICAgICBpZiAocG9zIDwgMCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIGMuIElmIHBvcyDiiaUgMiBhbmQgdGhlIGNoYXJhY3RlciBcIi1cIiBvY2N1cnMgYXQgaW5kZXggcG9zLTIgb2YgY2FuZGlkYXRlLFxuICAgICAgICAvLyAgICB0aGVuIGRlY3JlYXNlIHBvcyBieSAyLlxuICAgICAgICBpZiAocG9zID49IDIgJiYgY2FuZGlkYXRlLmNoYXJBdChwb3MgLSAyKSA9PT0gJy0nKSBwb3MgLT0gMjtcblxuICAgICAgICAvLyBkLiBMZXQgY2FuZGlkYXRlIGJlIHRoZSBzdWJzdHJpbmcgb2YgY2FuZGlkYXRlIGZyb20gcG9zaXRpb24gMCwgaW5jbHVzaXZlLFxuICAgICAgICAvLyAgICB0byBwb3NpdGlvbiBwb3MsIGV4Y2x1c2l2ZS5cbiAgICAgICAgY2FuZGlkYXRlID0gY2FuZGlkYXRlLnN1YnN0cmluZygwLCBwb3MpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaGUgTG9va3VwTWF0Y2hlciBhYnN0cmFjdCBvcGVyYXRpb24gY29tcGFyZXMgcmVxdWVzdGVkTG9jYWxlcywgd2hpY2ggbXVzdCBiZVxuICogYSBMaXN0IGFzIHJldHVybmVkIGJ5IENhbm9uaWNhbGl6ZUxvY2FsZUxpc3QsIGFnYWluc3QgdGhlIGxvY2FsZXMgaW5cbiAqIGF2YWlsYWJsZUxvY2FsZXMgYW5kIGRldGVybWluZXMgdGhlIGJlc3QgYXZhaWxhYmxlIGxhbmd1YWdlIHRvIG1lZXQgdGhlXG4gKiByZXF1ZXN0LiBUaGUgZm9sbG93aW5nIHN0ZXBzIGFyZSB0YWtlbjpcbiAqL1xuZnVuY3Rpb24gLyogOS4yLjMgKi9Mb29rdXBNYXRjaGVyKGF2YWlsYWJsZUxvY2FsZXMsIHJlcXVlc3RlZExvY2FsZXMpIHtcbiAgICAvLyAxLiBMZXQgaSBiZSAwLlxuICAgIHZhciBpID0gMDtcblxuICAgIC8vIDIuIExldCBsZW4gYmUgdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiByZXF1ZXN0ZWRMb2NhbGVzLlxuICAgIHZhciBsZW4gPSByZXF1ZXN0ZWRMb2NhbGVzLmxlbmd0aDtcblxuICAgIC8vIDMuIExldCBhdmFpbGFibGVMb2NhbGUgYmUgdW5kZWZpbmVkLlxuICAgIHZhciBhdmFpbGFibGVMb2NhbGUgPSB2b2lkIDA7XG5cbiAgICB2YXIgbG9jYWxlID0gdm9pZCAwLFxuICAgICAgICBub0V4dGVuc2lvbnNMb2NhbGUgPSB2b2lkIDA7XG5cbiAgICAvLyA0LiBSZXBlYXQgd2hpbGUgaSA8IGxlbiBhbmQgYXZhaWxhYmxlTG9jYWxlIGlzIHVuZGVmaW5lZDpcbiAgICB3aGlsZSAoaSA8IGxlbiAmJiAhYXZhaWxhYmxlTG9jYWxlKSB7XG4gICAgICAgIC8vIGEuIExldCBsb2NhbGUgYmUgdGhlIGVsZW1lbnQgb2YgcmVxdWVzdGVkTG9jYWxlcyBhdCAwLW9yaWdpbmVkIGxpc3RcbiAgICAgICAgLy8gICAgcG9zaXRpb24gaS5cbiAgICAgICAgbG9jYWxlID0gcmVxdWVzdGVkTG9jYWxlc1tpXTtcblxuICAgICAgICAvLyBiLiBMZXQgbm9FeHRlbnNpb25zTG9jYWxlIGJlIHRoZSBTdHJpbmcgdmFsdWUgdGhhdCBpcyBsb2NhbGUgd2l0aCBhbGxcbiAgICAgICAgLy8gICAgVW5pY29kZSBsb2NhbGUgZXh0ZW5zaW9uIHNlcXVlbmNlcyByZW1vdmVkLlxuICAgICAgICBub0V4dGVuc2lvbnNMb2NhbGUgPSBTdHJpbmcobG9jYWxlKS5yZXBsYWNlKGV4cFVuaWNvZGVFeFNlcSwgJycpO1xuXG4gICAgICAgIC8vIGMuIExldCBhdmFpbGFibGVMb2NhbGUgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZVxuICAgICAgICAvLyAgICBCZXN0QXZhaWxhYmxlTG9jYWxlIGFic3RyYWN0IG9wZXJhdGlvbiAoZGVmaW5lZCBpbiA5LjIuMikgd2l0aFxuICAgICAgICAvLyAgICBhcmd1bWVudHMgYXZhaWxhYmxlTG9jYWxlcyBhbmQgbm9FeHRlbnNpb25zTG9jYWxlLlxuICAgICAgICBhdmFpbGFibGVMb2NhbGUgPSBCZXN0QXZhaWxhYmxlTG9jYWxlKGF2YWlsYWJsZUxvY2FsZXMsIG5vRXh0ZW5zaW9uc0xvY2FsZSk7XG5cbiAgICAgICAgLy8gZC4gSW5jcmVhc2UgaSBieSAxLlxuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgLy8gNS4gTGV0IHJlc3VsdCBiZSBhIG5ldyBSZWNvcmQuXG4gICAgdmFyIHJlc3VsdCA9IG5ldyBSZWNvcmQoKTtcblxuICAgIC8vIDYuIElmIGF2YWlsYWJsZUxvY2FsZSBpcyBub3QgdW5kZWZpbmVkLCB0aGVuXG4gICAgaWYgKGF2YWlsYWJsZUxvY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGEuIFNldCByZXN1bHQuW1tsb2NhbGVdXSB0byBhdmFpbGFibGVMb2NhbGUuXG4gICAgICAgIHJlc3VsdFsnW1tsb2NhbGVdXSddID0gYXZhaWxhYmxlTG9jYWxlO1xuXG4gICAgICAgIC8vIGIuIElmIGxvY2FsZSBhbmQgbm9FeHRlbnNpb25zTG9jYWxlIGFyZSBub3QgdGhlIHNhbWUgU3RyaW5nIHZhbHVlLCB0aGVuXG4gICAgICAgIGlmIChTdHJpbmcobG9jYWxlKSAhPT0gU3RyaW5nKG5vRXh0ZW5zaW9uc0xvY2FsZSkpIHtcbiAgICAgICAgICAgIC8vIGkuIExldCBleHRlbnNpb24gYmUgdGhlIFN0cmluZyB2YWx1ZSBjb25zaXN0aW5nIG9mIHRoZSBmaXJzdFxuICAgICAgICAgICAgLy8gICAgc3Vic3RyaW5nIG9mIGxvY2FsZSB0aGF0IGlzIGEgVW5pY29kZSBsb2NhbGUgZXh0ZW5zaW9uIHNlcXVlbmNlLlxuICAgICAgICAgICAgdmFyIGV4dGVuc2lvbiA9IGxvY2FsZS5tYXRjaChleHBVbmljb2RlRXhTZXEpWzBdO1xuXG4gICAgICAgICAgICAvLyBpaS4gTGV0IGV4dGVuc2lvbkluZGV4IGJlIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24gb2YgdGhlIGluaXRpYWxcbiAgICAgICAgICAgIC8vICAgICBcIi1cIiBvZiB0aGUgZmlyc3QgVW5pY29kZSBsb2NhbGUgZXh0ZW5zaW9uIHNlcXVlbmNlIHdpdGhpbiBsb2NhbGUuXG4gICAgICAgICAgICB2YXIgZXh0ZW5zaW9uSW5kZXggPSBsb2NhbGUuaW5kZXhPZignLXUtJyk7XG5cbiAgICAgICAgICAgIC8vIGlpaS4gU2V0IHJlc3VsdC5bW2V4dGVuc2lvbl1dIHRvIGV4dGVuc2lvbi5cbiAgICAgICAgICAgIHJlc3VsdFsnW1tleHRlbnNpb25dXSddID0gZXh0ZW5zaW9uO1xuXG4gICAgICAgICAgICAvLyBpdi4gU2V0IHJlc3VsdC5bW2V4dGVuc2lvbkluZGV4XV0gdG8gZXh0ZW5zaW9uSW5kZXguXG4gICAgICAgICAgICByZXN1bHRbJ1tbZXh0ZW5zaW9uSW5kZXhdXSddID0gZXh0ZW5zaW9uSW5kZXg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gNy4gRWxzZVxuICAgIGVsc2VcbiAgICAgICAgLy8gYS4gU2V0IHJlc3VsdC5bW2xvY2FsZV1dIHRvIHRoZSB2YWx1ZSByZXR1cm5lZCBieSB0aGUgRGVmYXVsdExvY2FsZSBhYnN0cmFjdFxuICAgICAgICAvLyAgICBvcGVyYXRpb24gKGRlZmluZWQgaW4gNi4yLjQpLlxuICAgICAgICByZXN1bHRbJ1tbbG9jYWxlXV0nXSA9IERlZmF1bHRMb2NhbGUoKTtcblxuICAgIC8vIDguIFJldHVybiByZXN1bHRcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFRoZSBCZXN0Rml0TWF0Y2hlciBhYnN0cmFjdCBvcGVyYXRpb24gY29tcGFyZXMgcmVxdWVzdGVkTG9jYWxlcywgd2hpY2ggbXVzdCBiZVxuICogYSBMaXN0IGFzIHJldHVybmVkIGJ5IENhbm9uaWNhbGl6ZUxvY2FsZUxpc3QsIGFnYWluc3QgdGhlIGxvY2FsZXMgaW5cbiAqIGF2YWlsYWJsZUxvY2FsZXMgYW5kIGRldGVybWluZXMgdGhlIGJlc3QgYXZhaWxhYmxlIGxhbmd1YWdlIHRvIG1lZXQgdGhlXG4gKiByZXF1ZXN0LiBUaGUgYWxnb3JpdGhtIGlzIGltcGxlbWVudGF0aW9uIGRlcGVuZGVudCwgYnV0IHNob3VsZCBwcm9kdWNlIHJlc3VsdHNcbiAqIHRoYXQgYSB0eXBpY2FsIHVzZXIgb2YgdGhlIHJlcXVlc3RlZCBsb2NhbGVzIHdvdWxkIHBlcmNlaXZlIGFzIGF0IGxlYXN0IGFzXG4gKiBnb29kIGFzIHRob3NlIHByb2R1Y2VkIGJ5IHRoZSBMb29rdXBNYXRjaGVyIGFic3RyYWN0IG9wZXJhdGlvbi4gT3B0aW9uc1xuICogc3BlY2lmaWVkIHRocm91Z2ggVW5pY29kZSBsb2NhbGUgZXh0ZW5zaW9uIHNlcXVlbmNlcyBtdXN0IGJlIGlnbm9yZWQgYnkgdGhlXG4gKiBhbGdvcml0aG0uIEluZm9ybWF0aW9uIGFib3V0IHN1Y2ggc3Vic2VxdWVuY2VzIGlzIHJldHVybmVkIHNlcGFyYXRlbHkuXG4gKiBUaGUgYWJzdHJhY3Qgb3BlcmF0aW9uIHJldHVybnMgYSByZWNvcmQgd2l0aCBhIFtbbG9jYWxlXV0gZmllbGQsIHdob3NlIHZhbHVlXG4gKiBpcyB0aGUgbGFuZ3VhZ2UgdGFnIG9mIHRoZSBzZWxlY3RlZCBsb2NhbGUsIHdoaWNoIG11c3QgYmUgYW4gZWxlbWVudCBvZlxuICogYXZhaWxhYmxlTG9jYWxlcy4gSWYgdGhlIGxhbmd1YWdlIHRhZyBvZiB0aGUgcmVxdWVzdCBsb2NhbGUgdGhhdCBsZWQgdG8gdGhlXG4gKiBzZWxlY3RlZCBsb2NhbGUgY29udGFpbmVkIGEgVW5pY29kZSBsb2NhbGUgZXh0ZW5zaW9uIHNlcXVlbmNlLCB0aGVuIHRoZVxuICogcmV0dXJuZWQgcmVjb3JkIGFsc28gY29udGFpbnMgYW4gW1tleHRlbnNpb25dXSBmaWVsZCB3aG9zZSB2YWx1ZSBpcyB0aGUgZmlyc3RcbiAqIFVuaWNvZGUgbG9jYWxlIGV4dGVuc2lvbiBzZXF1ZW5jZSwgYW5kIGFuIFtbZXh0ZW5zaW9uSW5kZXhdXSBmaWVsZCB3aG9zZSB2YWx1ZVxuICogaXMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBVbmljb2RlIGxvY2FsZSBleHRlbnNpb24gc2VxdWVuY2Ugd2l0aGluIHRoZSByZXF1ZXN0XG4gKiBsb2NhbGUgbGFuZ3VhZ2UgdGFnLlxuICovXG5mdW5jdGlvbiAvKiA5LjIuNCAqL0Jlc3RGaXRNYXRjaGVyKGF2YWlsYWJsZUxvY2FsZXMsIHJlcXVlc3RlZExvY2FsZXMpIHtcbiAgICByZXR1cm4gTG9va3VwTWF0Y2hlcihhdmFpbGFibGVMb2NhbGVzLCByZXF1ZXN0ZWRMb2NhbGVzKTtcbn1cblxuLyoqXG4gKiBUaGUgUmVzb2x2ZUxvY2FsZSBhYnN0cmFjdCBvcGVyYXRpb24gY29tcGFyZXMgYSBCQ1AgNDcgbGFuZ3VhZ2UgcHJpb3JpdHkgbGlzdFxuICogcmVxdWVzdGVkTG9jYWxlcyBhZ2FpbnN0IHRoZSBsb2NhbGVzIGluIGF2YWlsYWJsZUxvY2FsZXMgYW5kIGRldGVybWluZXMgdGhlXG4gKiBiZXN0IGF2YWlsYWJsZSBsYW5ndWFnZSB0byBtZWV0IHRoZSByZXF1ZXN0LiBhdmFpbGFibGVMb2NhbGVzIGFuZFxuICogcmVxdWVzdGVkTG9jYWxlcyBtdXN0IGJlIHByb3ZpZGVkIGFzIExpc3QgdmFsdWVzLCBvcHRpb25zIGFzIGEgUmVjb3JkLlxuICovXG5mdW5jdGlvbiAvKiA5LjIuNSAqL1Jlc29sdmVMb2NhbGUoYXZhaWxhYmxlTG9jYWxlcywgcmVxdWVzdGVkTG9jYWxlcywgb3B0aW9ucywgcmVsZXZhbnRFeHRlbnNpb25LZXlzLCBsb2NhbGVEYXRhKSB7XG4gICAgaWYgKGF2YWlsYWJsZUxvY2FsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcignTm8gbG9jYWxlIGRhdGEgaGFzIGJlZW4gcHJvdmlkZWQgZm9yIHRoaXMgb2JqZWN0IHlldC4nKTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIHN0ZXBzIGFyZSB0YWtlbjpcbiAgICAvLyAxLiBMZXQgbWF0Y2hlciBiZSB0aGUgdmFsdWUgb2Ygb3B0aW9ucy5bW2xvY2FsZU1hdGNoZXJdXS5cbiAgICB2YXIgbWF0Y2hlciA9IG9wdGlvbnNbJ1tbbG9jYWxlTWF0Y2hlcl1dJ107XG5cbiAgICB2YXIgciA9IHZvaWQgMDtcblxuICAgIC8vIDIuIElmIG1hdGNoZXIgaXMgXCJsb29rdXBcIiwgdGhlblxuICAgIGlmIChtYXRjaGVyID09PSAnbG9va3VwJylcbiAgICAgICAgLy8gYS4gTGV0IHIgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBMb29rdXBNYXRjaGVyIGFic3RyYWN0IG9wZXJhdGlvblxuICAgICAgICAvLyAgICAoZGVmaW5lZCBpbiA5LjIuMykgd2l0aCBhcmd1bWVudHMgYXZhaWxhYmxlTG9jYWxlcyBhbmRcbiAgICAgICAgLy8gICAgcmVxdWVzdGVkTG9jYWxlcy5cbiAgICAgICAgciA9IExvb2t1cE1hdGNoZXIoYXZhaWxhYmxlTG9jYWxlcywgcmVxdWVzdGVkTG9jYWxlcyk7XG5cbiAgICAgICAgLy8gMy4gRWxzZVxuICAgIGVsc2VcbiAgICAgICAgLy8gYS4gTGV0IHIgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBCZXN0Rml0TWF0Y2hlciBhYnN0cmFjdFxuICAgICAgICAvLyAgICBvcGVyYXRpb24gKGRlZmluZWQgaW4gOS4yLjQpIHdpdGggYXJndW1lbnRzIGF2YWlsYWJsZUxvY2FsZXMgYW5kXG4gICAgICAgIC8vICAgIHJlcXVlc3RlZExvY2FsZXMuXG4gICAgICAgIHIgPSBCZXN0Rml0TWF0Y2hlcihhdmFpbGFibGVMb2NhbGVzLCByZXF1ZXN0ZWRMb2NhbGVzKTtcblxuICAgIC8vIDQuIExldCBmb3VuZExvY2FsZSBiZSB0aGUgdmFsdWUgb2Ygci5bW2xvY2FsZV1dLlxuICAgIHZhciBmb3VuZExvY2FsZSA9IHJbJ1tbbG9jYWxlXV0nXTtcblxuICAgIHZhciBleHRlbnNpb25TdWJ0YWdzID0gdm9pZCAwLFxuICAgICAgICBleHRlbnNpb25TdWJ0YWdzTGVuZ3RoID0gdm9pZCAwO1xuXG4gICAgLy8gNS4gSWYgciBoYXMgYW4gW1tleHRlbnNpb25dXSBmaWVsZCwgdGhlblxuICAgIGlmIChob3AuY2FsbChyLCAnW1tleHRlbnNpb25dXScpKSB7XG4gICAgICAgIC8vIGEuIExldCBleHRlbnNpb24gYmUgdGhlIHZhbHVlIG9mIHIuW1tleHRlbnNpb25dXS5cbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHJbJ1tbZXh0ZW5zaW9uXV0nXTtcbiAgICAgICAgLy8gYi4gTGV0IHNwbGl0IGJlIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBmdW5jdGlvbiBvYmplY3QgZGVmaW5lZCBpbiBFUzUsXG4gICAgICAgIC8vICAgIDE1LjUuNC4xNC5cbiAgICAgICAgdmFyIHNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdDtcbiAgICAgICAgLy8gYy4gTGV0IGV4dGVuc2lvblN1YnRhZ3MgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0NhbGxdXSBpbnRlcm5hbFxuICAgICAgICAvLyAgICBtZXRob2Qgb2Ygc3BsaXQgd2l0aCBleHRlbnNpb24gYXMgdGhlIHRoaXMgdmFsdWUgYW5kIGFuIGFyZ3VtZW50XG4gICAgICAgIC8vICAgIGxpc3QgY29udGFpbmluZyB0aGUgc2luZ2xlIGl0ZW0gXCItXCIuXG4gICAgICAgIGV4dGVuc2lvblN1YnRhZ3MgPSBzcGxpdC5jYWxsKGV4dGVuc2lvbiwgJy0nKTtcbiAgICAgICAgLy8gZC4gTGV0IGV4dGVuc2lvblN1YnRhZ3NMZW5ndGggYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dXG4gICAgICAgIC8vICAgIGludGVybmFsIG1ldGhvZCBvZiBleHRlbnNpb25TdWJ0YWdzIHdpdGggYXJndW1lbnQgXCJsZW5ndGhcIi5cbiAgICAgICAgZXh0ZW5zaW9uU3VidGFnc0xlbmd0aCA9IGV4dGVuc2lvblN1YnRhZ3MubGVuZ3RoO1xuICAgIH1cblxuICAgIC8vIDYuIExldCByZXN1bHQgYmUgYSBuZXcgUmVjb3JkLlxuICAgIHZhciByZXN1bHQgPSBuZXcgUmVjb3JkKCk7XG5cbiAgICAvLyA3LiBTZXQgcmVzdWx0LltbZGF0YUxvY2FsZV1dIHRvIGZvdW5kTG9jYWxlLlxuICAgIHJlc3VsdFsnW1tkYXRhTG9jYWxlXV0nXSA9IGZvdW5kTG9jYWxlO1xuXG4gICAgLy8gOC4gTGV0IHN1cHBvcnRlZEV4dGVuc2lvbiBiZSBcIi11XCIuXG4gICAgdmFyIHN1cHBvcnRlZEV4dGVuc2lvbiA9ICctdSc7XG4gICAgLy8gOS4gTGV0IGkgYmUgMC5cbiAgICB2YXIgaSA9IDA7XG4gICAgLy8gMTAuIExldCBsZW4gYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsIG1ldGhvZCBvZlxuICAgIC8vICAgICByZWxldmFudEV4dGVuc2lvbktleXMgd2l0aCBhcmd1bWVudCBcImxlbmd0aFwiLlxuICAgIHZhciBsZW4gPSByZWxldmFudEV4dGVuc2lvbktleXMubGVuZ3RoO1xuXG4gICAgLy8gMTEgUmVwZWF0IHdoaWxlIGkgPCBsZW46XG4gICAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICAgICAgLy8gYS4gTGV0IGtleSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgICAgIC8vICAgIHJlbGV2YW50RXh0ZW5zaW9uS2V5cyB3aXRoIGFyZ3VtZW50IFRvU3RyaW5nKGkpLlxuICAgICAgICB2YXIga2V5ID0gcmVsZXZhbnRFeHRlbnNpb25LZXlzW2ldO1xuICAgICAgICAvLyBiLiBMZXQgZm91bmRMb2NhbGVEYXRhIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbFxuICAgICAgICAvLyAgICBtZXRob2Qgb2YgbG9jYWxlRGF0YSB3aXRoIHRoZSBhcmd1bWVudCBmb3VuZExvY2FsZS5cbiAgICAgICAgdmFyIGZvdW5kTG9jYWxlRGF0YSA9IGxvY2FsZURhdGFbZm91bmRMb2NhbGVdO1xuICAgICAgICAvLyBjLiBMZXQga2V5TG9jYWxlRGF0YSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWxcbiAgICAgICAgLy8gICAgbWV0aG9kIG9mIGZvdW5kTG9jYWxlRGF0YSB3aXRoIHRoZSBhcmd1bWVudCBrZXkuXG4gICAgICAgIHZhciBrZXlMb2NhbGVEYXRhID0gZm91bmRMb2NhbGVEYXRhW2tleV07XG4gICAgICAgIC8vIGQuIExldCB2YWx1ZSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgICAgIC8vICAgIGtleUxvY2FsZURhdGEgd2l0aCBhcmd1bWVudCBcIjBcIi5cbiAgICAgICAgdmFyIHZhbHVlID0ga2V5TG9jYWxlRGF0YVsnMCddO1xuICAgICAgICAvLyBlLiBMZXQgc3VwcG9ydGVkRXh0ZW5zaW9uQWRkaXRpb24gYmUgXCJcIi5cbiAgICAgICAgdmFyIHN1cHBvcnRlZEV4dGVuc2lvbkFkZGl0aW9uID0gJyc7XG4gICAgICAgIC8vIGYuIExldCBpbmRleE9mIGJlIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBmdW5jdGlvbiBvYmplY3QgZGVmaW5lZCBpblxuICAgICAgICAvLyAgICBFUzUsIDE1LjQuNC4xNC5cbiAgICAgICAgdmFyIGluZGV4T2YgPSBhcnJJbmRleE9mO1xuXG4gICAgICAgIC8vIGcuIElmIGV4dGVuc2lvblN1YnRhZ3MgaXMgbm90IHVuZGVmaW5lZCwgdGhlblxuICAgICAgICBpZiAoZXh0ZW5zaW9uU3VidGFncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBpLiBMZXQga2V5UG9zIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tDYWxsXV0gaW50ZXJuYWxcbiAgICAgICAgICAgIC8vICAgIG1ldGhvZCBvZiBpbmRleE9mIHdpdGggZXh0ZW5zaW9uU3VidGFncyBhcyB0aGUgdGhpcyB2YWx1ZSBhbmRcbiAgICAgICAgICAgIC8vIGFuIGFyZ3VtZW50IGxpc3QgY29udGFpbmluZyB0aGUgc2luZ2xlIGl0ZW0ga2V5LlxuICAgICAgICAgICAgdmFyIGtleVBvcyA9IGluZGV4T2YuY2FsbChleHRlbnNpb25TdWJ0YWdzLCBrZXkpO1xuXG4gICAgICAgICAgICAvLyBpaS4gSWYga2V5UG9zIOKJoCAtMSwgdGhlblxuICAgICAgICAgICAgaWYgKGtleVBvcyAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyAxLiBJZiBrZXlQb3MgKyAxIDwgZXh0ZW5zaW9uU3VidGFnc0xlbmd0aCBhbmQgdGhlIGxlbmd0aCBvZiB0aGVcbiAgICAgICAgICAgICAgICAvLyAgICByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAgICAgICAgICAgICAvLyAgICBleHRlbnNpb25TdWJ0YWdzIHdpdGggYXJndW1lbnQgVG9TdHJpbmcoa2V5UG9zICsxKSBpcyBncmVhdGVyXG4gICAgICAgICAgICAgICAgLy8gICAgdGhhbiAyLCB0aGVuXG4gICAgICAgICAgICAgICAgaWYgKGtleVBvcyArIDEgPCBleHRlbnNpb25TdWJ0YWdzTGVuZ3RoICYmIGV4dGVuc2lvblN1YnRhZ3Nba2V5UG9zICsgMV0ubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBhLiBMZXQgcmVxdWVzdGVkVmFsdWUgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dXG4gICAgICAgICAgICAgICAgICAgIC8vICAgIGludGVybmFsIG1ldGhvZCBvZiBleHRlbnNpb25TdWJ0YWdzIHdpdGggYXJndW1lbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgVG9TdHJpbmcoa2V5UG9zICsgMSkuXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXF1ZXN0ZWRWYWx1ZSA9IGV4dGVuc2lvblN1YnRhZ3Nba2V5UG9zICsgMV07XG4gICAgICAgICAgICAgICAgICAgIC8vIGIuIExldCB2YWx1ZVBvcyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbQ2FsbF1dXG4gICAgICAgICAgICAgICAgICAgIC8vICAgIGludGVybmFsIG1ldGhvZCBvZiBpbmRleE9mIHdpdGgga2V5TG9jYWxlRGF0YSBhcyB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgdGhpcyB2YWx1ZSBhbmQgYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nIHRoZSBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgaXRlbSByZXF1ZXN0ZWRWYWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlUG9zID0gaW5kZXhPZi5jYWxsKGtleUxvY2FsZURhdGEsIHJlcXVlc3RlZFZhbHVlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjLiBJZiB2YWx1ZVBvcyDiiaAgLTEsIHRoZW5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlUG9zICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS4gTGV0IHZhbHVlIGJlIHJlcXVlc3RlZFZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSByZXF1ZXN0ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlpLiBMZXQgc3VwcG9ydGVkRXh0ZW5zaW9uQWRkaXRpb24gYmUgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgY29uY2F0ZW5hdGlvbiBvZiBcIi1cIiwga2V5LCBcIi1cIiwgYW5kIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgc3VwcG9ydGVkRXh0ZW5zaW9uQWRkaXRpb24gPSAnLScgKyBrZXkgKyAnLScgKyB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAyLiBFbHNlXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhLiBMZXQgdmFsdWVQb3MgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0NhbGxdXVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW50ZXJuYWwgbWV0aG9kIG9mIGluZGV4T2Ygd2l0aCBrZXlMb2NhbGVEYXRhIGFzIHRoZSB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB2YWx1ZSBhbmQgYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nIHRoZSBzaW5nbGUgaXRlbVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJ0cnVlXCIuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX3ZhbHVlUG9zID0gaW5kZXhPZihrZXlMb2NhbGVEYXRhLCAndHJ1ZScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiLiBJZiB2YWx1ZVBvcyDiiaAgLTEsIHRoZW5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfdmFsdWVQb3MgIT09IC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGkuIExldCB2YWx1ZSBiZSBcInRydWVcIi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9ICd0cnVlJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGguIElmIG9wdGlvbnMgaGFzIGEgZmllbGQgW1s8a2V5Pl1dLCB0aGVuXG4gICAgICAgIGlmIChob3AuY2FsbChvcHRpb25zLCAnW1snICsga2V5ICsgJ11dJykpIHtcbiAgICAgICAgICAgIC8vIGkuIExldCBvcHRpb25zVmFsdWUgYmUgdGhlIHZhbHVlIG9mIG9wdGlvbnMuW1s8a2V5Pl1dLlxuICAgICAgICAgICAgdmFyIG9wdGlvbnNWYWx1ZSA9IG9wdGlvbnNbJ1tbJyArIGtleSArICddXSddO1xuXG4gICAgICAgICAgICAvLyBpaS4gSWYgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0NhbGxdXSBpbnRlcm5hbCBtZXRob2Qgb2YgaW5kZXhPZlxuICAgICAgICAgICAgLy8gICAgIHdpdGgga2V5TG9jYWxlRGF0YSBhcyB0aGUgdGhpcyB2YWx1ZSBhbmQgYW4gYXJndW1lbnQgbGlzdFxuICAgICAgICAgICAgLy8gICAgIGNvbnRhaW5pbmcgdGhlIHNpbmdsZSBpdGVtIG9wdGlvbnNWYWx1ZSBpcyBub3QgLTEsIHRoZW5cbiAgICAgICAgICAgIGlmIChpbmRleE9mLmNhbGwoa2V5TG9jYWxlRGF0YSwgb3B0aW9uc1ZhbHVlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyAxLiBJZiBvcHRpb25zVmFsdWUgaXMgbm90IGVxdWFsIHRvIHZhbHVlLCB0aGVuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnNWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYS4gTGV0IHZhbHVlIGJlIG9wdGlvbnNWYWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIC8vIGIuIExldCBzdXBwb3J0ZWRFeHRlbnNpb25BZGRpdGlvbiBiZSBcIlwiLlxuICAgICAgICAgICAgICAgICAgICBzdXBwb3J0ZWRFeHRlbnNpb25BZGRpdGlvbiA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBpLiBTZXQgcmVzdWx0LltbPGtleT5dXSB0byB2YWx1ZS5cbiAgICAgICAgcmVzdWx0WydbWycgKyBrZXkgKyAnXV0nXSA9IHZhbHVlO1xuXG4gICAgICAgIC8vIGouIEFwcGVuZCBzdXBwb3J0ZWRFeHRlbnNpb25BZGRpdGlvbiB0byBzdXBwb3J0ZWRFeHRlbnNpb24uXG4gICAgICAgIHN1cHBvcnRlZEV4dGVuc2lvbiArPSBzdXBwb3J0ZWRFeHRlbnNpb25BZGRpdGlvbjtcblxuICAgICAgICAvLyBrLiBJbmNyZWFzZSBpIGJ5IDEuXG4gICAgICAgIGkrKztcbiAgICB9XG4gICAgLy8gMTIuIElmIHRoZSBsZW5ndGggb2Ygc3VwcG9ydGVkRXh0ZW5zaW9uIGlzIGdyZWF0ZXIgdGhhbiAyLCB0aGVuXG4gICAgaWYgKHN1cHBvcnRlZEV4dGVuc2lvbi5sZW5ndGggPiAyKSB7XG4gICAgICAgIC8vIGEuXG4gICAgICAgIHZhciBwcml2YXRlSW5kZXggPSBmb3VuZExvY2FsZS5pbmRleE9mKFwiLXgtXCIpO1xuICAgICAgICAvLyBiLlxuICAgICAgICBpZiAocHJpdmF0ZUluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgLy8gaS5cbiAgICAgICAgICAgIGZvdW5kTG9jYWxlID0gZm91bmRMb2NhbGUgKyBzdXBwb3J0ZWRFeHRlbnNpb247XG4gICAgICAgIH1cbiAgICAgICAgLy8gYy5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gaS5cbiAgICAgICAgICAgICAgICB2YXIgcHJlRXh0ZW5zaW9uID0gZm91bmRMb2NhbGUuc3Vic3RyaW5nKDAsIHByaXZhdGVJbmRleCk7XG4gICAgICAgICAgICAgICAgLy8gaWkuXG4gICAgICAgICAgICAgICAgdmFyIHBvc3RFeHRlbnNpb24gPSBmb3VuZExvY2FsZS5zdWJzdHJpbmcocHJpdmF0ZUluZGV4KTtcbiAgICAgICAgICAgICAgICAvLyBpaWkuXG4gICAgICAgICAgICAgICAgZm91bmRMb2NhbGUgPSBwcmVFeHRlbnNpb24gKyBzdXBwb3J0ZWRFeHRlbnNpb24gKyBwb3N0RXh0ZW5zaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAvLyBkLiBhc3NlcnRpbmcgLSBza2lwcGluZ1xuICAgICAgICAvLyBlLlxuICAgICAgICBmb3VuZExvY2FsZSA9IENhbm9uaWNhbGl6ZUxhbmd1YWdlVGFnKGZvdW5kTG9jYWxlKTtcbiAgICB9XG4gICAgLy8gMTMuIFNldCByZXN1bHQuW1tsb2NhbGVdXSB0byBmb3VuZExvY2FsZS5cbiAgICByZXN1bHRbJ1tbbG9jYWxlXV0nXSA9IGZvdW5kTG9jYWxlO1xuXG4gICAgLy8gMTQuIFJldHVybiByZXN1bHQuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBUaGUgTG9va3VwU3VwcG9ydGVkTG9jYWxlcyBhYnN0cmFjdCBvcGVyYXRpb24gcmV0dXJucyB0aGUgc3Vic2V0IG9mIHRoZVxuICogcHJvdmlkZWQgQkNQIDQ3IGxhbmd1YWdlIHByaW9yaXR5IGxpc3QgcmVxdWVzdGVkTG9jYWxlcyBmb3Igd2hpY2hcbiAqIGF2YWlsYWJsZUxvY2FsZXMgaGFzIGEgbWF0Y2hpbmcgbG9jYWxlIHdoZW4gdXNpbmcgdGhlIEJDUCA0NyBMb29rdXAgYWxnb3JpdGhtLlxuICogTG9jYWxlcyBhcHBlYXIgaW4gdGhlIHNhbWUgb3JkZXIgaW4gdGhlIHJldHVybmVkIGxpc3QgYXMgaW4gcmVxdWVzdGVkTG9jYWxlcy5cbiAqIFRoZSBmb2xsb3dpbmcgc3RlcHMgYXJlIHRha2VuOlxuICovXG5mdW5jdGlvbiAvKiA5LjIuNiAqL0xvb2t1cFN1cHBvcnRlZExvY2FsZXMoYXZhaWxhYmxlTG9jYWxlcywgcmVxdWVzdGVkTG9jYWxlcykge1xuICAgIC8vIDEuIExldCBsZW4gYmUgdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiByZXF1ZXN0ZWRMb2NhbGVzLlxuICAgIHZhciBsZW4gPSByZXF1ZXN0ZWRMb2NhbGVzLmxlbmd0aDtcbiAgICAvLyAyLiBMZXQgc3Vic2V0IGJlIGEgbmV3IGVtcHR5IExpc3QuXG4gICAgdmFyIHN1YnNldCA9IG5ldyBMaXN0KCk7XG4gICAgLy8gMy4gTGV0IGsgYmUgMC5cbiAgICB2YXIgayA9IDA7XG5cbiAgICAvLyA0LiBSZXBlYXQgd2hpbGUgayA8IGxlblxuICAgIHdoaWxlIChrIDwgbGVuKSB7XG4gICAgICAgIC8vIGEuIExldCBsb2NhbGUgYmUgdGhlIGVsZW1lbnQgb2YgcmVxdWVzdGVkTG9jYWxlcyBhdCAwLW9yaWdpbmVkIGxpc3RcbiAgICAgICAgLy8gICAgcG9zaXRpb24gay5cbiAgICAgICAgdmFyIGxvY2FsZSA9IHJlcXVlc3RlZExvY2FsZXNba107XG4gICAgICAgIC8vIGIuIExldCBub0V4dGVuc2lvbnNMb2NhbGUgYmUgdGhlIFN0cmluZyB2YWx1ZSB0aGF0IGlzIGxvY2FsZSB3aXRoIGFsbFxuICAgICAgICAvLyAgICBVbmljb2RlIGxvY2FsZSBleHRlbnNpb24gc2VxdWVuY2VzIHJlbW92ZWQuXG4gICAgICAgIHZhciBub0V4dGVuc2lvbnNMb2NhbGUgPSBTdHJpbmcobG9jYWxlKS5yZXBsYWNlKGV4cFVuaWNvZGVFeFNlcSwgJycpO1xuICAgICAgICAvLyBjLiBMZXQgYXZhaWxhYmxlTG9jYWxlIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGVcbiAgICAgICAgLy8gICAgQmVzdEF2YWlsYWJsZUxvY2FsZSBhYnN0cmFjdCBvcGVyYXRpb24gKGRlZmluZWQgaW4gOS4yLjIpIHdpdGhcbiAgICAgICAgLy8gICAgYXJndW1lbnRzIGF2YWlsYWJsZUxvY2FsZXMgYW5kIG5vRXh0ZW5zaW9uc0xvY2FsZS5cbiAgICAgICAgdmFyIGF2YWlsYWJsZUxvY2FsZSA9IEJlc3RBdmFpbGFibGVMb2NhbGUoYXZhaWxhYmxlTG9jYWxlcywgbm9FeHRlbnNpb25zTG9jYWxlKTtcblxuICAgICAgICAvLyBkLiBJZiBhdmFpbGFibGVMb2NhbGUgaXMgbm90IHVuZGVmaW5lZCwgdGhlbiBhcHBlbmQgbG9jYWxlIHRvIHRoZSBlbmQgb2ZcbiAgICAgICAgLy8gICAgc3Vic2V0LlxuICAgICAgICBpZiAoYXZhaWxhYmxlTG9jYWxlICE9PSB1bmRlZmluZWQpIGFyclB1c2guY2FsbChzdWJzZXQsIGxvY2FsZSk7XG5cbiAgICAgICAgLy8gZS4gSW5jcmVtZW50IGsgYnkgMS5cbiAgICAgICAgaysrO1xuICAgIH1cblxuICAgIC8vIDUuIExldCBzdWJzZXRBcnJheSBiZSBhIG5ldyBBcnJheSBvYmplY3Qgd2hvc2UgZWxlbWVudHMgYXJlIHRoZSBzYW1lXG4gICAgLy8gICAgdmFsdWVzIGluIHRoZSBzYW1lIG9yZGVyIGFzIHRoZSBlbGVtZW50cyBvZiBzdWJzZXQuXG4gICAgdmFyIHN1YnNldEFycmF5ID0gYXJyU2xpY2UuY2FsbChzdWJzZXQpO1xuXG4gICAgLy8gNi4gUmV0dXJuIHN1YnNldEFycmF5LlxuICAgIHJldHVybiBzdWJzZXRBcnJheTtcbn1cblxuLyoqXG4gKiBUaGUgQmVzdEZpdFN1cHBvcnRlZExvY2FsZXMgYWJzdHJhY3Qgb3BlcmF0aW9uIHJldHVybnMgdGhlIHN1YnNldCBvZiB0aGVcbiAqIHByb3ZpZGVkIEJDUCA0NyBsYW5ndWFnZSBwcmlvcml0eSBsaXN0IHJlcXVlc3RlZExvY2FsZXMgZm9yIHdoaWNoXG4gKiBhdmFpbGFibGVMb2NhbGVzIGhhcyBhIG1hdGNoaW5nIGxvY2FsZSB3aGVuIHVzaW5nIHRoZSBCZXN0IEZpdCBNYXRjaGVyXG4gKiBhbGdvcml0aG0uIExvY2FsZXMgYXBwZWFyIGluIHRoZSBzYW1lIG9yZGVyIGluIHRoZSByZXR1cm5lZCBsaXN0IGFzIGluXG4gKiByZXF1ZXN0ZWRMb2NhbGVzLiBUaGUgc3RlcHMgdGFrZW4gYXJlIGltcGxlbWVudGF0aW9uIGRlcGVuZGVudC5cbiAqL1xuZnVuY3Rpb24gLyo5LjIuNyAqL0Jlc3RGaXRTdXBwb3J0ZWRMb2NhbGVzKGF2YWlsYWJsZUxvY2FsZXMsIHJlcXVlc3RlZExvY2FsZXMpIHtcbiAgICAvLyAjIyNUT0RPOiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBhcyBkZXNjcmliZWQgYnkgdGhlIHNwZWNpZmljYXRpb24jIyNcbiAgICByZXR1cm4gTG9va3VwU3VwcG9ydGVkTG9jYWxlcyhhdmFpbGFibGVMb2NhbGVzLCByZXF1ZXN0ZWRMb2NhbGVzKTtcbn1cblxuLyoqXG4gKiBUaGUgU3VwcG9ydGVkTG9jYWxlcyBhYnN0cmFjdCBvcGVyYXRpb24gcmV0dXJucyB0aGUgc3Vic2V0IG9mIHRoZSBwcm92aWRlZCBCQ1BcbiAqIDQ3IGxhbmd1YWdlIHByaW9yaXR5IGxpc3QgcmVxdWVzdGVkTG9jYWxlcyBmb3Igd2hpY2ggYXZhaWxhYmxlTG9jYWxlcyBoYXMgYVxuICogbWF0Y2hpbmcgbG9jYWxlLiBUd28gYWxnb3JpdGhtcyBhcmUgYXZhaWxhYmxlIHRvIG1hdGNoIHRoZSBsb2NhbGVzOiB0aGUgTG9va3VwXG4gKiBhbGdvcml0aG0gZGVzY3JpYmVkIGluIFJGQyA0NjQ3IHNlY3Rpb24gMy40LCBhbmQgYW4gaW1wbGVtZW50YXRpb24gZGVwZW5kZW50XG4gKiBiZXN0LWZpdCBhbGdvcml0aG0uIExvY2FsZXMgYXBwZWFyIGluIHRoZSBzYW1lIG9yZGVyIGluIHRoZSByZXR1cm5lZCBsaXN0IGFzXG4gKiBpbiByZXF1ZXN0ZWRMb2NhbGVzLiBUaGUgZm9sbG93aW5nIHN0ZXBzIGFyZSB0YWtlbjpcbiAqL1xuZnVuY3Rpb24gLyo5LjIuOCAqL1N1cHBvcnRlZExvY2FsZXMoYXZhaWxhYmxlTG9jYWxlcywgcmVxdWVzdGVkTG9jYWxlcywgb3B0aW9ucykge1xuICAgIHZhciBtYXRjaGVyID0gdm9pZCAwLFxuICAgICAgICBzdWJzZXQgPSB2b2lkIDA7XG5cbiAgICAvLyAxLiBJZiBvcHRpb25zIGlzIG5vdCB1bmRlZmluZWQsIHRoZW5cbiAgICBpZiAob3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGEuIExldCBvcHRpb25zIGJlIFRvT2JqZWN0KG9wdGlvbnMpLlxuICAgICAgICBvcHRpb25zID0gbmV3IFJlY29yZCh0b09iamVjdChvcHRpb25zKSk7XG4gICAgICAgIC8vIGIuIExldCBtYXRjaGVyIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAgICAgLy8gICAgb3B0aW9ucyB3aXRoIGFyZ3VtZW50IFwibG9jYWxlTWF0Y2hlclwiLlxuICAgICAgICBtYXRjaGVyID0gb3B0aW9ucy5sb2NhbGVNYXRjaGVyO1xuXG4gICAgICAgIC8vIGMuIElmIG1hdGNoZXIgaXMgbm90IHVuZGVmaW5lZCwgdGhlblxuICAgICAgICBpZiAobWF0Y2hlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBpLiBMZXQgbWF0Y2hlciBiZSBUb1N0cmluZyhtYXRjaGVyKS5cbiAgICAgICAgICAgIG1hdGNoZXIgPSBTdHJpbmcobWF0Y2hlcik7XG5cbiAgICAgICAgICAgIC8vIGlpLiBJZiBtYXRjaGVyIGlzIG5vdCBcImxvb2t1cFwiIG9yIFwiYmVzdCBmaXRcIiwgdGhlbiB0aHJvdyBhIFJhbmdlRXJyb3JcbiAgICAgICAgICAgIC8vICAgICBleGNlcHRpb24uXG4gICAgICAgICAgICBpZiAobWF0Y2hlciAhPT0gJ2xvb2t1cCcgJiYgbWF0Y2hlciAhPT0gJ2Jlc3QgZml0JykgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ21hdGNoZXIgc2hvdWxkIGJlIFwibG9va3VwXCIgb3IgXCJiZXN0IGZpdFwiJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gMi4gSWYgbWF0Y2hlciBpcyB1bmRlZmluZWQgb3IgXCJiZXN0IGZpdFwiLCB0aGVuXG4gICAgaWYgKG1hdGNoZXIgPT09IHVuZGVmaW5lZCB8fCBtYXRjaGVyID09PSAnYmVzdCBmaXQnKVxuICAgICAgICAvLyBhLiBMZXQgc3Vic2V0IGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgQmVzdEZpdFN1cHBvcnRlZExvY2FsZXNcbiAgICAgICAgLy8gICAgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkIGluIDkuMi43KSB3aXRoIGFyZ3VtZW50c1xuICAgICAgICAvLyAgICBhdmFpbGFibGVMb2NhbGVzIGFuZCByZXF1ZXN0ZWRMb2NhbGVzLlxuICAgICAgICBzdWJzZXQgPSBCZXN0Rml0U3VwcG9ydGVkTG9jYWxlcyhhdmFpbGFibGVMb2NhbGVzLCByZXF1ZXN0ZWRMb2NhbGVzKTtcbiAgICAgICAgLy8gMy4gRWxzZVxuICAgIGVsc2VcbiAgICAgICAgLy8gYS4gTGV0IHN1YnNldCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIExvb2t1cFN1cHBvcnRlZExvY2FsZXNcbiAgICAgICAgLy8gICAgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkIGluIDkuMi42KSB3aXRoIGFyZ3VtZW50c1xuICAgICAgICAvLyAgICBhdmFpbGFibGVMb2NhbGVzIGFuZCByZXF1ZXN0ZWRMb2NhbGVzLlxuICAgICAgICBzdWJzZXQgPSBMb29rdXBTdXBwb3J0ZWRMb2NhbGVzKGF2YWlsYWJsZUxvY2FsZXMsIHJlcXVlc3RlZExvY2FsZXMpO1xuXG4gICAgLy8gNC4gRm9yIGVhY2ggbmFtZWQgb3duIHByb3BlcnR5IG5hbWUgUCBvZiBzdWJzZXQsXG4gICAgZm9yICh2YXIgUCBpbiBzdWJzZXQpIHtcbiAgICAgICAgaWYgKCFob3AuY2FsbChzdWJzZXQsIFApKSBjb250aW51ZTtcblxuICAgICAgICAvLyBhLiBMZXQgZGVzYyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0T3duUHJvcGVydHldXSBpbnRlcm5hbFxuICAgICAgICAvLyAgICBtZXRob2Qgb2Ygc3Vic2V0IHdpdGggUC5cbiAgICAgICAgLy8gYi4gU2V0IGRlc2MuW1tXcml0YWJsZV1dIHRvIGZhbHNlLlxuICAgICAgICAvLyBjLiBTZXQgZGVzYy5bW0NvbmZpZ3VyYWJsZV1dIHRvIGZhbHNlLlxuICAgICAgICAvLyBkLiBDYWxsIHRoZSBbW0RlZmluZU93blByb3BlcnR5XV0gaW50ZXJuYWwgbWV0aG9kIG9mIHN1YnNldCB3aXRoIFAsIGRlc2MsXG4gICAgICAgIC8vICAgIGFuZCB0cnVlIGFzIGFyZ3VtZW50cy5cbiAgICAgICAgZGVmaW5lUHJvcGVydHkoc3Vic2V0LCBQLCB7XG4gICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsIGNvbmZpZ3VyYWJsZTogZmFsc2UsIHZhbHVlOiBzdWJzZXRbUF1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIFwiRnJlZXplXCIgdGhlIGFycmF5IHNvIG5vIG5ldyBlbGVtZW50cyBjYW4gYmUgYWRkZWRcbiAgICBkZWZpbmVQcm9wZXJ0eShzdWJzZXQsICdsZW5ndGgnLCB7IHdyaXRhYmxlOiBmYWxzZSB9KTtcblxuICAgIC8vIDUuIFJldHVybiBzdWJzZXRcbiAgICByZXR1cm4gc3Vic2V0O1xufVxuXG4vKipcbiAqIFRoZSBHZXRPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uIGV4dHJhY3RzIHRoZSB2YWx1ZSBvZiB0aGUgcHJvcGVydHkgbmFtZWRcbiAqIHByb3BlcnR5IGZyb20gdGhlIHByb3ZpZGVkIG9wdGlvbnMgb2JqZWN0LCBjb252ZXJ0cyBpdCB0byB0aGUgcmVxdWlyZWQgdHlwZSxcbiAqIGNoZWNrcyB3aGV0aGVyIGl0IGlzIG9uZSBvZiBhIExpc3Qgb2YgYWxsb3dlZCB2YWx1ZXMsIGFuZCBmaWxscyBpbiBhIGZhbGxiYWNrXG4gKiB2YWx1ZSBpZiBuZWNlc3NhcnkuXG4gKi9cbmZ1bmN0aW9uIC8qOS4yLjkgKi9HZXRPcHRpb24ob3B0aW9ucywgcHJvcGVydHksIHR5cGUsIHZhbHVlcywgZmFsbGJhY2spIHtcbiAgICAvLyAxLiBMZXQgdmFsdWUgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsIG1ldGhvZCBvZlxuICAgIC8vICAgIG9wdGlvbnMgd2l0aCBhcmd1bWVudCBwcm9wZXJ0eS5cbiAgICB2YXIgdmFsdWUgPSBvcHRpb25zW3Byb3BlcnR5XTtcblxuICAgIC8vIDIuIElmIHZhbHVlIGlzIG5vdCB1bmRlZmluZWQsIHRoZW5cbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBhLiBBc3NlcnQ6IHR5cGUgaXMgXCJib29sZWFuXCIgb3IgXCJzdHJpbmdcIi5cbiAgICAgICAgLy8gYi4gSWYgdHlwZSBpcyBcImJvb2xlYW5cIiwgdGhlbiBsZXQgdmFsdWUgYmUgVG9Cb29sZWFuKHZhbHVlKS5cbiAgICAgICAgLy8gYy4gSWYgdHlwZSBpcyBcInN0cmluZ1wiLCB0aGVuIGxldCB2YWx1ZSBiZSBUb1N0cmluZyh2YWx1ZSkuXG4gICAgICAgIHZhbHVlID0gdHlwZSA9PT0gJ2Jvb2xlYW4nID8gQm9vbGVhbih2YWx1ZSkgOiB0eXBlID09PSAnc3RyaW5nJyA/IFN0cmluZyh2YWx1ZSkgOiB2YWx1ZTtcblxuICAgICAgICAvLyBkLiBJZiB2YWx1ZXMgaXMgbm90IHVuZGVmaW5lZCwgdGhlblxuICAgICAgICBpZiAodmFsdWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIGkuIElmIHZhbHVlcyBkb2VzIG5vdCBjb250YWluIGFuIGVsZW1lbnQgZXF1YWwgdG8gdmFsdWUsIHRoZW4gdGhyb3cgYVxuICAgICAgICAgICAgLy8gICAgUmFuZ2VFcnJvciBleGNlcHRpb24uXG4gICAgICAgICAgICBpZiAoYXJySW5kZXhPZi5jYWxsKHZhbHVlcywgdmFsdWUpID09PSAtMSkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCInXCIgKyB2YWx1ZSArIFwiJyBpcyBub3QgYW4gYWxsb3dlZCB2YWx1ZSBmb3IgYFwiICsgcHJvcGVydHkgKyAnYCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZS4gUmV0dXJuIHZhbHVlLlxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIC8vIEVsc2UgcmV0dXJuIGZhbGxiYWNrLlxuICAgIHJldHVybiBmYWxsYmFjaztcbn1cblxuLyoqXG4gKiBUaGUgR2V0TnVtYmVyT3B0aW9uIGFic3RyYWN0IG9wZXJhdGlvbiBleHRyYWN0cyBhIHByb3BlcnR5IHZhbHVlIGZyb20gdGhlXG4gKiBwcm92aWRlZCBvcHRpb25zIG9iamVjdCwgY29udmVydHMgaXQgdG8gYSBOdW1iZXIgdmFsdWUsIGNoZWNrcyB3aGV0aGVyIGl0IGlzXG4gKiBpbiB0aGUgYWxsb3dlZCByYW5nZSwgYW5kIGZpbGxzIGluIGEgZmFsbGJhY2sgdmFsdWUgaWYgbmVjZXNzYXJ5LlxuICovXG5mdW5jdGlvbiAvKiA5LjIuMTAgKi9HZXROdW1iZXJPcHRpb24ob3B0aW9ucywgcHJvcGVydHksIG1pbmltdW0sIG1heGltdW0sIGZhbGxiYWNrKSB7XG4gICAgLy8gMS4gTGV0IHZhbHVlIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAvLyAgICBvcHRpb25zIHdpdGggYXJndW1lbnQgcHJvcGVydHkuXG4gICAgdmFyIHZhbHVlID0gb3B0aW9uc1twcm9wZXJ0eV07XG5cbiAgICAvLyAyLiBJZiB2YWx1ZSBpcyBub3QgdW5kZWZpbmVkLCB0aGVuXG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gYS4gTGV0IHZhbHVlIGJlIFRvTnVtYmVyKHZhbHVlKS5cbiAgICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuXG4gICAgICAgIC8vIGIuIElmIHZhbHVlIGlzIE5hTiBvciBsZXNzIHRoYW4gbWluaW11bSBvciBncmVhdGVyIHRoYW4gbWF4aW11bSwgdGhyb3cgYVxuICAgICAgICAvLyAgICBSYW5nZUVycm9yIGV4Y2VwdGlvbi5cbiAgICAgICAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA8IG1pbmltdW0gfHwgdmFsdWUgPiBtYXhpbXVtKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVmFsdWUgaXMgbm90IGEgbnVtYmVyIG9yIG91dHNpZGUgYWNjZXB0ZWQgcmFuZ2UnKTtcblxuICAgICAgICAvLyBjLiBSZXR1cm4gZmxvb3IodmFsdWUpLlxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcih2YWx1ZSk7XG4gICAgfVxuICAgIC8vIDMuIEVsc2UgcmV0dXJuIGZhbGxiYWNrLlxuICAgIHJldHVybiBmYWxsYmFjaztcbn1cblxuLy8gOCBUaGUgSW50bCBPYmplY3RcbnZhciBJbnRsID0ge307XG5cbi8vIDguMiBGdW5jdGlvbiBQcm9wZXJ0aWVzIG9mIHRoZSBJbnRsIE9iamVjdFxuXG4vLyA4LjIuMVxuLy8gQHNwZWNbdGMzOS9lY21hNDAyL21hc3Rlci9zcGVjL2ludGwuaHRtbF1cbi8vIEBjbGF1c2Vbc2VjLWludGwuZ2V0Y2Fub25pY2FsbG9jYWxlc11cbkludGwuZ2V0Q2Fub25pY2FsTG9jYWxlcyA9IGZ1bmN0aW9uIChsb2NhbGVzKSB7XG4gICAgLy8gMS4gTGV0IGxsIGJlID8gQ2Fub25pY2FsaXplTG9jYWxlTGlzdChsb2NhbGVzKS5cbiAgICB2YXIgbGwgPSBDYW5vbmljYWxpemVMb2NhbGVMaXN0KGxvY2FsZXMpO1xuICAgIC8vIDIuIFJldHVybiBDcmVhdGVBcnJheUZyb21MaXN0KGxsKS5cbiAgICB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgY29kZSBpbiBsbCkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gobGxbY29kZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufTtcblxuLy8gQ3VycmVuY3kgbWlub3IgdW5pdHMgb3V0cHV0IGZyb20gZ2V0LTQyMTcgZ3J1bnQgdGFzaywgZm9ybWF0dGVkXG52YXIgY3VycmVuY3lNaW5vclVuaXRzID0ge1xuICAgIEJIRDogMywgQllSOiAwLCBYT0Y6IDAsIEJJRjogMCwgWEFGOiAwLCBDTEY6IDQsIENMUDogMCwgS01GOiAwLCBESkY6IDAsXG4gICAgWFBGOiAwLCBHTkY6IDAsIElTSzogMCwgSVFEOiAzLCBKUFk6IDAsIEpPRDogMywgS1JXOiAwLCBLV0Q6IDMsIExZRDogMyxcbiAgICBPTVI6IDMsIFBZRzogMCwgUldGOiAwLCBUTkQ6IDMsIFVHWDogMCwgVVlJOiAwLCBWVVY6IDAsIFZORDogMFxufTtcblxuLy8gRGVmaW5lIHRoZSBOdW1iZXJGb3JtYXQgY29uc3RydWN0b3IgaW50ZXJuYWxseSBzbyBpdCBjYW5ub3QgYmUgdGFpbnRlZFxuZnVuY3Rpb24gTnVtYmVyRm9ybWF0Q29uc3RydWN0b3IoKSB7XG4gICAgdmFyIGxvY2FsZXMgPSBhcmd1bWVudHNbMF07XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV07XG5cbiAgICBpZiAoIXRoaXMgfHwgdGhpcyA9PT0gSW50bCkge1xuICAgICAgICByZXR1cm4gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxvY2FsZXMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiBJbml0aWFsaXplTnVtYmVyRm9ybWF0KHRvT2JqZWN0KHRoaXMpLCBsb2NhbGVzLCBvcHRpb25zKTtcbn1cblxuZGVmaW5lUHJvcGVydHkoSW50bCwgJ051bWJlckZvcm1hdCcsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IE51bWJlckZvcm1hdENvbnN0cnVjdG9yXG59KTtcblxuLy8gTXVzdCBleHBsaWNpdGx5IHNldCBwcm90b3R5cGVzIGFzIHVud3JpdGFibGVcbmRlZmluZVByb3BlcnR5KEludGwuTnVtYmVyRm9ybWF0LCAncHJvdG90eXBlJywge1xuICAgIHdyaXRhYmxlOiBmYWxzZVxufSk7XG5cbi8qKlxuICogVGhlIGFic3RyYWN0IG9wZXJhdGlvbiBJbml0aWFsaXplTnVtYmVyRm9ybWF0IGFjY2VwdHMgdGhlIGFyZ3VtZW50c1xuICogbnVtYmVyRm9ybWF0ICh3aGljaCBtdXN0IGJlIGFuIG9iamVjdCksIGxvY2FsZXMsIGFuZCBvcHRpb25zLiBJdCBpbml0aWFsaXplc1xuICogbnVtYmVyRm9ybWF0IGFzIGEgTnVtYmVyRm9ybWF0IG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gLyoxMS4xLjEuMSAqL0luaXRpYWxpemVOdW1iZXJGb3JtYXQobnVtYmVyRm9ybWF0LCBsb2NhbGVzLCBvcHRpb25zKSB7XG4gICAgLy8gVGhpcyB3aWxsIGJlIGEgaW50ZXJuYWwgcHJvcGVydGllcyBvYmplY3QgaWYgd2UncmUgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICB2YXIgaW50ZXJuYWwgPSBnZXRJbnRlcm5hbFByb3BlcnRpZXMobnVtYmVyRm9ybWF0KTtcblxuICAgIC8vIENyZWF0ZSBhbiBvYmplY3Qgd2hvc2UgcHJvcHMgY2FuIGJlIHVzZWQgdG8gcmVzdG9yZSB0aGUgdmFsdWVzIG9mIFJlZ0V4cCBwcm9wc1xuICAgIHZhciByZWdleHBTdGF0ZSA9IGNyZWF0ZVJlZ0V4cFJlc3RvcmUoKTtcblxuICAgIC8vIDEuIElmIG51bWJlckZvcm1hdCBoYXMgYW4gW1tpbml0aWFsaXplZEludGxPYmplY3RdXSBpbnRlcm5hbCBwcm9wZXJ0eSB3aXRoXG4gICAgLy8gdmFsdWUgdHJ1ZSwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uLlxuICAgIGlmIChpbnRlcm5hbFsnW1tpbml0aWFsaXplZEludGxPYmplY3RdXSddID09PSB0cnVlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdGhpc2Agb2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gaW5pdGlhbGl6ZWQgYXMgYW4gSW50bCBvYmplY3QnKTtcblxuICAgIC8vIE5lZWQgdGhpcyB0byBhY2Nlc3MgdGhlIGBpbnRlcm5hbGAgb2JqZWN0XG4gICAgZGVmaW5lUHJvcGVydHkobnVtYmVyRm9ybWF0LCAnX19nZXRJbnRlcm5hbFByb3BlcnRpZXMnLCB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiB2YWx1ZSgpIHtcbiAgICAgICAgICAgIC8vIE5PVEU6IE5vbi1zdGFuZGFyZCwgZm9yIGludGVybmFsIHVzZSBvbmx5XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzWzBdID09PSBzZWNyZXQpIHJldHVybiBpbnRlcm5hbDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gMi4gU2V0IHRoZSBbW2luaXRpYWxpemVkSW50bE9iamVjdF1dIGludGVybmFsIHByb3BlcnR5IG9mIG51bWJlckZvcm1hdCB0byB0cnVlLlxuICAgIGludGVybmFsWydbW2luaXRpYWxpemVkSW50bE9iamVjdF1dJ10gPSB0cnVlO1xuXG4gICAgLy8gMy4gTGV0IHJlcXVlc3RlZExvY2FsZXMgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBDYW5vbmljYWxpemVMb2NhbGVMaXN0XG4gICAgLy8gICAgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkIGluIDkuMi4xKSB3aXRoIGFyZ3VtZW50IGxvY2FsZXMuXG4gICAgdmFyIHJlcXVlc3RlZExvY2FsZXMgPSBDYW5vbmljYWxpemVMb2NhbGVMaXN0KGxvY2FsZXMpO1xuXG4gICAgLy8gNC4gSWYgb3B0aW9ucyBpcyB1bmRlZmluZWQsIHRoZW5cbiAgICBpZiAob3B0aW9ucyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAvLyBhLiBMZXQgb3B0aW9ucyBiZSB0aGUgcmVzdWx0IG9mIGNyZWF0aW5nIGEgbmV3IG9iamVjdCBhcyBpZiBieSB0aGVcbiAgICAgICAgLy8gZXhwcmVzc2lvbiBuZXcgT2JqZWN0KCkgd2hlcmUgT2JqZWN0IGlzIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBjb25zdHJ1Y3RvclxuICAgICAgICAvLyB3aXRoIHRoYXQgbmFtZS5cbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIC8vIDUuIEVsc2VcbiAgICBlbHNlXG4gICAgICAgIC8vIGEuIExldCBvcHRpb25zIGJlIFRvT2JqZWN0KG9wdGlvbnMpLlxuICAgICAgICBvcHRpb25zID0gdG9PYmplY3Qob3B0aW9ucyk7XG5cbiAgICAvLyA2LiBMZXQgb3B0IGJlIGEgbmV3IFJlY29yZC5cbiAgICB2YXIgb3B0ID0gbmV3IFJlY29yZCgpLFxuXG5cbiAgICAvLyA3LiBMZXQgbWF0Y2hlciBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEdldE9wdGlvbiBhYnN0cmFjdCBvcGVyYXRpb25cbiAgICAvLyAgICAoZGVmaW5lZCBpbiA5LjIuOSkgd2l0aCB0aGUgYXJndW1lbnRzIG9wdGlvbnMsIFwibG9jYWxlTWF0Y2hlclwiLCBcInN0cmluZ1wiLFxuICAgIC8vICAgIGEgTGlzdCBjb250YWluaW5nIHRoZSB0d28gU3RyaW5nIHZhbHVlcyBcImxvb2t1cFwiIGFuZCBcImJlc3QgZml0XCIsIGFuZFxuICAgIC8vICAgIFwiYmVzdCBmaXRcIi5cbiAgICBtYXRjaGVyID0gR2V0T3B0aW9uKG9wdGlvbnMsICdsb2NhbGVNYXRjaGVyJywgJ3N0cmluZycsIG5ldyBMaXN0KCdsb29rdXAnLCAnYmVzdCBmaXQnKSwgJ2Jlc3QgZml0Jyk7XG5cbiAgICAvLyA4LiBTZXQgb3B0LltbbG9jYWxlTWF0Y2hlcl1dIHRvIG1hdGNoZXIuXG4gICAgb3B0WydbW2xvY2FsZU1hdGNoZXJdXSddID0gbWF0Y2hlcjtcblxuICAgIC8vIDkuIExldCBOdW1iZXJGb3JtYXQgYmUgdGhlIHN0YW5kYXJkIGJ1aWx0LWluIG9iamVjdCB0aGF0IGlzIHRoZSBpbml0aWFsIHZhbHVlXG4gICAgLy8gICAgb2YgSW50bC5OdW1iZXJGb3JtYXQuXG4gICAgLy8gMTAuIExldCBsb2NhbGVEYXRhIGJlIHRoZSB2YWx1ZSBvZiB0aGUgW1tsb2NhbGVEYXRhXV0gaW50ZXJuYWwgcHJvcGVydHkgb2ZcbiAgICAvLyAgICAgTnVtYmVyRm9ybWF0LlxuICAgIHZhciBsb2NhbGVEYXRhID0gaW50ZXJuYWxzLk51bWJlckZvcm1hdFsnW1tsb2NhbGVEYXRhXV0nXTtcblxuICAgIC8vIDExLiBMZXQgciBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFJlc29sdmVMb2NhbGUgYWJzdHJhY3Qgb3BlcmF0aW9uXG4gICAgLy8gICAgIChkZWZpbmVkIGluIDkuMi41KSB3aXRoIHRoZSBbW2F2YWlsYWJsZUxvY2FsZXNdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZlxuICAgIC8vICAgICBOdW1iZXJGb3JtYXQsIHJlcXVlc3RlZExvY2FsZXMsIG9wdCwgdGhlIFtbcmVsZXZhbnRFeHRlbnNpb25LZXlzXV1cbiAgICAvLyAgICAgaW50ZXJuYWwgcHJvcGVydHkgb2YgTnVtYmVyRm9ybWF0LCBhbmQgbG9jYWxlRGF0YS5cbiAgICB2YXIgciA9IFJlc29sdmVMb2NhbGUoaW50ZXJuYWxzLk51bWJlckZvcm1hdFsnW1thdmFpbGFibGVMb2NhbGVzXV0nXSwgcmVxdWVzdGVkTG9jYWxlcywgb3B0LCBpbnRlcm5hbHMuTnVtYmVyRm9ybWF0WydbW3JlbGV2YW50RXh0ZW5zaW9uS2V5c11dJ10sIGxvY2FsZURhdGEpO1xuXG4gICAgLy8gMTIuIFNldCB0aGUgW1tsb2NhbGVdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gdGhlIHZhbHVlIG9mXG4gICAgLy8gICAgIHIuW1tsb2NhbGVdXS5cbiAgICBpbnRlcm5hbFsnW1tsb2NhbGVdXSddID0gclsnW1tsb2NhbGVdXSddO1xuXG4gICAgLy8gMTMuIFNldCB0aGUgW1tudW1iZXJpbmdTeXN0ZW1dXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gdGhlIHZhbHVlXG4gICAgLy8gICAgIG9mIHIuW1tudV1dLlxuICAgIGludGVybmFsWydbW251bWJlcmluZ1N5c3RlbV1dJ10gPSByWydbW251XV0nXTtcblxuICAgIC8vIFRoZSBzcGVjaWZpY2F0aW9uIGRvZXNuJ3QgdGVsbCB1cyB0byBkbyB0aGlzLCBidXQgaXQncyBoZWxwZnVsIGxhdGVyIG9uXG4gICAgaW50ZXJuYWxbJ1tbZGF0YUxvY2FsZV1dJ10gPSByWydbW2RhdGFMb2NhbGVdXSddO1xuXG4gICAgLy8gMTQuIExldCBkYXRhTG9jYWxlIGJlIHRoZSB2YWx1ZSBvZiByLltbZGF0YUxvY2FsZV1dLlxuICAgIHZhciBkYXRhTG9jYWxlID0gclsnW1tkYXRhTG9jYWxlXV0nXTtcblxuICAgIC8vIDE1LiBMZXQgcyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEdldE9wdGlvbiBhYnN0cmFjdCBvcGVyYXRpb24gd2l0aCB0aGVcbiAgICAvLyAgICAgYXJndW1lbnRzIG9wdGlvbnMsIFwic3R5bGVcIiwgXCJzdHJpbmdcIiwgYSBMaXN0IGNvbnRhaW5pbmcgdGhlIHRocmVlIFN0cmluZ1xuICAgIC8vICAgICB2YWx1ZXMgXCJkZWNpbWFsXCIsIFwicGVyY2VudFwiLCBhbmQgXCJjdXJyZW5jeVwiLCBhbmQgXCJkZWNpbWFsXCIuXG4gICAgdmFyIHMgPSBHZXRPcHRpb24ob3B0aW9ucywgJ3N0eWxlJywgJ3N0cmluZycsIG5ldyBMaXN0KCdkZWNpbWFsJywgJ3BlcmNlbnQnLCAnY3VycmVuY3knKSwgJ2RlY2ltYWwnKTtcblxuICAgIC8vIDE2LiBTZXQgdGhlIFtbc3R5bGVdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gcy5cbiAgICBpbnRlcm5hbFsnW1tzdHlsZV1dJ10gPSBzO1xuXG4gICAgLy8gMTcuIExldCBjIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgR2V0T3B0aW9uIGFic3RyYWN0IG9wZXJhdGlvbiB3aXRoIHRoZVxuICAgIC8vICAgICBhcmd1bWVudHMgb3B0aW9ucywgXCJjdXJyZW5jeVwiLCBcInN0cmluZ1wiLCB1bmRlZmluZWQsIGFuZCB1bmRlZmluZWQuXG4gICAgdmFyIGMgPSBHZXRPcHRpb24ob3B0aW9ucywgJ2N1cnJlbmN5JywgJ3N0cmluZycpO1xuXG4gICAgLy8gMTguIElmIGMgaXMgbm90IHVuZGVmaW5lZCBhbmQgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZVxuICAgIC8vICAgICBJc1dlbGxGb3JtZWRDdXJyZW5jeUNvZGUgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkIGluIDYuMy4xKSB3aXRoXG4gICAgLy8gICAgIGFyZ3VtZW50IGMgaXMgZmFsc2UsIHRoZW4gdGhyb3cgYSBSYW5nZUVycm9yIGV4Y2VwdGlvbi5cbiAgICBpZiAoYyAhPT0gdW5kZWZpbmVkICYmICFJc1dlbGxGb3JtZWRDdXJyZW5jeUNvZGUoYykpIHRocm93IG5ldyBSYW5nZUVycm9yKFwiJ1wiICsgYyArIFwiJyBpcyBub3QgYSB2YWxpZCBjdXJyZW5jeSBjb2RlXCIpO1xuXG4gICAgLy8gMTkuIElmIHMgaXMgXCJjdXJyZW5jeVwiIGFuZCBjIGlzIHVuZGVmaW5lZCwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uLlxuICAgIGlmIChzID09PSAnY3VycmVuY3knICYmIGMgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IFR5cGVFcnJvcignQ3VycmVuY3kgY29kZSBpcyByZXF1aXJlZCB3aGVuIHN0eWxlIGlzIGN1cnJlbmN5Jyk7XG5cbiAgICB2YXIgY0RpZ2l0cyA9IHZvaWQgMDtcblxuICAgIC8vIDIwLiBJZiBzIGlzIFwiY3VycmVuY3lcIiwgdGhlblxuICAgIGlmIChzID09PSAnY3VycmVuY3knKSB7XG4gICAgICAgIC8vIGEuIExldCBjIGJlIHRoZSByZXN1bHQgb2YgY29udmVydGluZyBjIHRvIHVwcGVyIGNhc2UgYXMgc3BlY2lmaWVkIGluIDYuMS5cbiAgICAgICAgYyA9IGMudG9VcHBlckNhc2UoKTtcblxuICAgICAgICAvLyBiLiBTZXQgdGhlIFtbY3VycmVuY3ldXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gYy5cbiAgICAgICAgaW50ZXJuYWxbJ1tbY3VycmVuY3ldXSddID0gYztcblxuICAgICAgICAvLyBjLiBMZXQgY0RpZ2l0cyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEN1cnJlbmN5RGlnaXRzIGFic3RyYWN0XG4gICAgICAgIC8vICAgIG9wZXJhdGlvbiAoZGVmaW5lZCBiZWxvdykgd2l0aCBhcmd1bWVudCBjLlxuICAgICAgICBjRGlnaXRzID0gQ3VycmVuY3lEaWdpdHMoYyk7XG4gICAgfVxuXG4gICAgLy8gMjEuIExldCBjZCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEdldE9wdGlvbiBhYnN0cmFjdCBvcGVyYXRpb24gd2l0aCB0aGVcbiAgICAvLyAgICAgYXJndW1lbnRzIG9wdGlvbnMsIFwiY3VycmVuY3lEaXNwbGF5XCIsIFwic3RyaW5nXCIsIGEgTGlzdCBjb250YWluaW5nIHRoZVxuICAgIC8vICAgICB0aHJlZSBTdHJpbmcgdmFsdWVzIFwiY29kZVwiLCBcInN5bWJvbFwiLCBhbmQgXCJuYW1lXCIsIGFuZCBcInN5bWJvbFwiLlxuICAgIHZhciBjZCA9IEdldE9wdGlvbihvcHRpb25zLCAnY3VycmVuY3lEaXNwbGF5JywgJ3N0cmluZycsIG5ldyBMaXN0KCdjb2RlJywgJ3N5bWJvbCcsICduYW1lJyksICdzeW1ib2wnKTtcblxuICAgIC8vIDIyLiBJZiBzIGlzIFwiY3VycmVuY3lcIiwgdGhlbiBzZXQgdGhlIFtbY3VycmVuY3lEaXNwbGF5XV0gaW50ZXJuYWwgcHJvcGVydHkgb2ZcbiAgICAvLyAgICAgbnVtYmVyRm9ybWF0IHRvIGNkLlxuICAgIGlmIChzID09PSAnY3VycmVuY3knKSBpbnRlcm5hbFsnW1tjdXJyZW5jeURpc3BsYXldXSddID0gY2Q7XG5cbiAgICAvLyAyMy4gTGV0IG1uaWQgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXROdW1iZXJPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uXG4gICAgLy8gICAgIChkZWZpbmVkIGluIDkuMi4xMCkgd2l0aCBhcmd1bWVudHMgb3B0aW9ucywgXCJtaW5pbXVtSW50ZWdlckRpZ2l0c1wiLCAxLCAyMSxcbiAgICAvLyAgICAgYW5kIDEuXG4gICAgdmFyIG1uaWQgPSBHZXROdW1iZXJPcHRpb24ob3B0aW9ucywgJ21pbmltdW1JbnRlZ2VyRGlnaXRzJywgMSwgMjEsIDEpO1xuXG4gICAgLy8gMjQuIFNldCB0aGUgW1ttaW5pbXVtSW50ZWdlckRpZ2l0c11dIGludGVybmFsIHByb3BlcnR5IG9mIG51bWJlckZvcm1hdCB0byBtbmlkLlxuICAgIGludGVybmFsWydbW21pbmltdW1JbnRlZ2VyRGlnaXRzXV0nXSA9IG1uaWQ7XG5cbiAgICAvLyAyNS4gSWYgcyBpcyBcImN1cnJlbmN5XCIsIHRoZW4gbGV0IG1uZmREZWZhdWx0IGJlIGNEaWdpdHM7IGVsc2UgbGV0IG1uZmREZWZhdWx0XG4gICAgLy8gICAgIGJlIDAuXG4gICAgdmFyIG1uZmREZWZhdWx0ID0gcyA9PT0gJ2N1cnJlbmN5JyA/IGNEaWdpdHMgOiAwO1xuXG4gICAgLy8gMjYuIExldCBtbmZkIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgR2V0TnVtYmVyT3B0aW9uIGFic3RyYWN0IG9wZXJhdGlvblxuICAgIC8vICAgICB3aXRoIGFyZ3VtZW50cyBvcHRpb25zLCBcIm1pbmltdW1GcmFjdGlvbkRpZ2l0c1wiLCAwLCAyMCwgYW5kIG1uZmREZWZhdWx0LlxuICAgIHZhciBtbmZkID0gR2V0TnVtYmVyT3B0aW9uKG9wdGlvbnMsICdtaW5pbXVtRnJhY3Rpb25EaWdpdHMnLCAwLCAyMCwgbW5mZERlZmF1bHQpO1xuXG4gICAgLy8gMjcuIFNldCB0aGUgW1ttaW5pbXVtRnJhY3Rpb25EaWdpdHNdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gbW5mZC5cbiAgICBpbnRlcm5hbFsnW1ttaW5pbXVtRnJhY3Rpb25EaWdpdHNdXSddID0gbW5mZDtcblxuICAgIC8vIDI4LiBJZiBzIGlzIFwiY3VycmVuY3lcIiwgdGhlbiBsZXQgbXhmZERlZmF1bHQgYmUgbWF4KG1uZmQsIGNEaWdpdHMpOyBlbHNlIGlmIHNcbiAgICAvLyAgICAgaXMgXCJwZXJjZW50XCIsIHRoZW4gbGV0IG14ZmREZWZhdWx0IGJlIG1heChtbmZkLCAwKTsgZWxzZSBsZXQgbXhmZERlZmF1bHRcbiAgICAvLyAgICAgYmUgbWF4KG1uZmQsIDMpLlxuICAgIHZhciBteGZkRGVmYXVsdCA9IHMgPT09ICdjdXJyZW5jeScgPyBNYXRoLm1heChtbmZkLCBjRGlnaXRzKSA6IHMgPT09ICdwZXJjZW50JyA/IE1hdGgubWF4KG1uZmQsIDApIDogTWF0aC5tYXgobW5mZCwgMyk7XG5cbiAgICAvLyAyOS4gTGV0IG14ZmQgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXROdW1iZXJPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uXG4gICAgLy8gICAgIHdpdGggYXJndW1lbnRzIG9wdGlvbnMsIFwibWF4aW11bUZyYWN0aW9uRGlnaXRzXCIsIG1uZmQsIDIwLCBhbmQgbXhmZERlZmF1bHQuXG4gICAgdmFyIG14ZmQgPSBHZXROdW1iZXJPcHRpb24ob3B0aW9ucywgJ21heGltdW1GcmFjdGlvbkRpZ2l0cycsIG1uZmQsIDIwLCBteGZkRGVmYXVsdCk7XG5cbiAgICAvLyAzMC4gU2V0IHRoZSBbW21heGltdW1GcmFjdGlvbkRpZ2l0c11dIGludGVybmFsIHByb3BlcnR5IG9mIG51bWJlckZvcm1hdCB0byBteGZkLlxuICAgIGludGVybmFsWydbW21heGltdW1GcmFjdGlvbkRpZ2l0c11dJ10gPSBteGZkO1xuXG4gICAgLy8gMzEuIExldCBtbnNkIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2Ygb3B0aW9uc1xuICAgIC8vICAgICB3aXRoIGFyZ3VtZW50IFwibWluaW11bVNpZ25pZmljYW50RGlnaXRzXCIuXG4gICAgdmFyIG1uc2QgPSBvcHRpb25zLm1pbmltdW1TaWduaWZpY2FudERpZ2l0cztcblxuICAgIC8vIDMyLiBMZXQgbXhzZCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mIG9wdGlvbnNcbiAgICAvLyAgICAgd2l0aCBhcmd1bWVudCBcIm1heGltdW1TaWduaWZpY2FudERpZ2l0c1wiLlxuICAgIHZhciBteHNkID0gb3B0aW9ucy5tYXhpbXVtU2lnbmlmaWNhbnREaWdpdHM7XG5cbiAgICAvLyAzMy4gSWYgbW5zZCBpcyBub3QgdW5kZWZpbmVkIG9yIG14c2QgaXMgbm90IHVuZGVmaW5lZCwgdGhlbjpcbiAgICBpZiAobW5zZCAhPT0gdW5kZWZpbmVkIHx8IG14c2QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBhLiBMZXQgbW5zZCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEdldE51bWJlck9wdGlvbiBhYnN0cmFjdFxuICAgICAgICAvLyAgICBvcGVyYXRpb24gd2l0aCBhcmd1bWVudHMgb3B0aW9ucywgXCJtaW5pbXVtU2lnbmlmaWNhbnREaWdpdHNcIiwgMSwgMjEsXG4gICAgICAgIC8vICAgIGFuZCAxLlxuICAgICAgICBtbnNkID0gR2V0TnVtYmVyT3B0aW9uKG9wdGlvbnMsICdtaW5pbXVtU2lnbmlmaWNhbnREaWdpdHMnLCAxLCAyMSwgMSk7XG5cbiAgICAgICAgLy8gYi4gTGV0IG14c2QgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXROdW1iZXJPcHRpb24gYWJzdHJhY3RcbiAgICAgICAgLy8gICAgIG9wZXJhdGlvbiB3aXRoIGFyZ3VtZW50cyBvcHRpb25zLCBcIm1heGltdW1TaWduaWZpY2FudERpZ2l0c1wiLCBtbnNkLFxuICAgICAgICAvLyAgICAgMjEsIGFuZCAyMS5cbiAgICAgICAgbXhzZCA9IEdldE51bWJlck9wdGlvbihvcHRpb25zLCAnbWF4aW11bVNpZ25pZmljYW50RGlnaXRzJywgbW5zZCwgMjEsIDIxKTtcblxuICAgICAgICAvLyBjLiBTZXQgdGhlIFtbbWluaW11bVNpZ25pZmljYW50RGlnaXRzXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgbnVtYmVyRm9ybWF0XG4gICAgICAgIC8vICAgIHRvIG1uc2QsIGFuZCB0aGUgW1ttYXhpbXVtU2lnbmlmaWNhbnREaWdpdHNdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZlxuICAgICAgICAvLyAgICBudW1iZXJGb3JtYXQgdG8gbXhzZC5cbiAgICAgICAgaW50ZXJuYWxbJ1tbbWluaW11bVNpZ25pZmljYW50RGlnaXRzXV0nXSA9IG1uc2Q7XG4gICAgICAgIGludGVybmFsWydbW21heGltdW1TaWduaWZpY2FudERpZ2l0c11dJ10gPSBteHNkO1xuICAgIH1cbiAgICAvLyAzNC4gTGV0IGcgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXRPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uIHdpdGggdGhlXG4gICAgLy8gICAgIGFyZ3VtZW50cyBvcHRpb25zLCBcInVzZUdyb3VwaW5nXCIsIFwiYm9vbGVhblwiLCB1bmRlZmluZWQsIGFuZCB0cnVlLlxuICAgIHZhciBnID0gR2V0T3B0aW9uKG9wdGlvbnMsICd1c2VHcm91cGluZycsICdib29sZWFuJywgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIC8vIDM1LiBTZXQgdGhlIFtbdXNlR3JvdXBpbmddXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gZy5cbiAgICBpbnRlcm5hbFsnW1t1c2VHcm91cGluZ11dJ10gPSBnO1xuXG4gICAgLy8gMzYuIExldCBkYXRhTG9jYWxlRGF0YSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgLy8gICAgIGxvY2FsZURhdGEgd2l0aCBhcmd1bWVudCBkYXRhTG9jYWxlLlxuICAgIHZhciBkYXRhTG9jYWxlRGF0YSA9IGxvY2FsZURhdGFbZGF0YUxvY2FsZV07XG5cbiAgICAvLyAzNy4gTGV0IHBhdHRlcm5zIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAvLyAgICAgZGF0YUxvY2FsZURhdGEgd2l0aCBhcmd1bWVudCBcInBhdHRlcm5zXCIuXG4gICAgdmFyIHBhdHRlcm5zID0gZGF0YUxvY2FsZURhdGEucGF0dGVybnM7XG5cbiAgICAvLyAzOC4gQXNzZXJ0OiBwYXR0ZXJucyBpcyBhbiBvYmplY3QgKHNlZSAxMS4yLjMpXG5cbiAgICAvLyAzOS4gTGV0IHN0eWxlUGF0dGVybnMgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsIG1ldGhvZCBvZlxuICAgIC8vICAgICBwYXR0ZXJucyB3aXRoIGFyZ3VtZW50IHMuXG4gICAgdmFyIHN0eWxlUGF0dGVybnMgPSBwYXR0ZXJuc1tzXTtcblxuICAgIC8vIDQwLiBTZXQgdGhlIFtbcG9zaXRpdmVQYXR0ZXJuXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgbnVtYmVyRm9ybWF0IHRvIHRoZVxuICAgIC8vICAgICByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2Ygc3R5bGVQYXR0ZXJucyB3aXRoIHRoZVxuICAgIC8vICAgICBhcmd1bWVudCBcInBvc2l0aXZlUGF0dGVyblwiLlxuICAgIGludGVybmFsWydbW3Bvc2l0aXZlUGF0dGVybl1dJ10gPSBzdHlsZVBhdHRlcm5zLnBvc2l0aXZlUGF0dGVybjtcblxuICAgIC8vIDQxLiBTZXQgdGhlIFtbbmVnYXRpdmVQYXR0ZXJuXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgbnVtYmVyRm9ybWF0IHRvIHRoZVxuICAgIC8vICAgICByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2Ygc3R5bGVQYXR0ZXJucyB3aXRoIHRoZVxuICAgIC8vICAgICBhcmd1bWVudCBcIm5lZ2F0aXZlUGF0dGVyblwiLlxuICAgIGludGVybmFsWydbW25lZ2F0aXZlUGF0dGVybl1dJ10gPSBzdHlsZVBhdHRlcm5zLm5lZ2F0aXZlUGF0dGVybjtcblxuICAgIC8vIDQyLiBTZXQgdGhlIFtbYm91bmRGb3JtYXRdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG8gdW5kZWZpbmVkLlxuICAgIGludGVybmFsWydbW2JvdW5kRm9ybWF0XV0nXSA9IHVuZGVmaW5lZDtcblxuICAgIC8vIDQzLiBTZXQgdGhlIFtbaW5pdGlhbGl6ZWROdW1iZXJGb3JtYXRdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBudW1iZXJGb3JtYXQgdG9cbiAgICAvLyAgICAgdHJ1ZS5cbiAgICBpbnRlcm5hbFsnW1tpbml0aWFsaXplZE51bWJlckZvcm1hdF1dJ10gPSB0cnVlO1xuXG4gICAgLy8gSW4gRVMzLCB3ZSBuZWVkIHRvIHByZS1iaW5kIHRoZSBmb3JtYXQoKSBmdW5jdGlvblxuICAgIGlmIChlczMpIG51bWJlckZvcm1hdC5mb3JtYXQgPSBHZXRGb3JtYXROdW1iZXIuY2FsbChudW1iZXJGb3JtYXQpO1xuXG4gICAgLy8gUmVzdG9yZSB0aGUgUmVnRXhwIHByb3BlcnRpZXNcbiAgICByZWdleHBTdGF0ZS5leHAudGVzdChyZWdleHBTdGF0ZS5pbnB1dCk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIG5ld2x5IGluaXRpYWxpc2VkIG9iamVjdFxuICAgIHJldHVybiBudW1iZXJGb3JtYXQ7XG59XG5cbmZ1bmN0aW9uIEN1cnJlbmN5RGlnaXRzKGN1cnJlbmN5KSB7XG4gICAgLy8gV2hlbiB0aGUgQ3VycmVuY3lEaWdpdHMgYWJzdHJhY3Qgb3BlcmF0aW9uIGlzIGNhbGxlZCB3aXRoIGFuIGFyZ3VtZW50IGN1cnJlbmN5XG4gICAgLy8gKHdoaWNoIG11c3QgYmUgYW4gdXBwZXIgY2FzZSBTdHJpbmcgdmFsdWUpLCB0aGUgZm9sbG93aW5nIHN0ZXBzIGFyZSB0YWtlbjpcblxuICAgIC8vIDEuIElmIHRoZSBJU08gNDIxNyBjdXJyZW5jeSBhbmQgZnVuZHMgY29kZSBsaXN0IGNvbnRhaW5zIGN1cnJlbmN5IGFzIGFuXG4gICAgLy8gYWxwaGFiZXRpYyBjb2RlLCB0aGVuIHJldHVybiB0aGUgbWlub3IgdW5pdCB2YWx1ZSBjb3JyZXNwb25kaW5nIHRvIHRoZVxuICAgIC8vIGN1cnJlbmN5IGZyb20gdGhlIGxpc3Q7IGVsc2UgcmV0dXJuIDIuXG4gICAgcmV0dXJuIGN1cnJlbmN5TWlub3JVbml0c1tjdXJyZW5jeV0gIT09IHVuZGVmaW5lZCA/IGN1cnJlbmN5TWlub3JVbml0c1tjdXJyZW5jeV0gOiAyO1xufVxuXG4vKiAxMS4yLjMgKi9pbnRlcm5hbHMuTnVtYmVyRm9ybWF0ID0ge1xuICAgICdbW2F2YWlsYWJsZUxvY2FsZXNdXSc6IFtdLFxuICAgICdbW3JlbGV2YW50RXh0ZW5zaW9uS2V5c11dJzogWydudSddLFxuICAgICdbW2xvY2FsZURhdGFdXSc6IHt9XG59O1xuXG4vKipcbiAqIFdoZW4gdGhlIHN1cHBvcnRlZExvY2FsZXNPZiBtZXRob2Qgb2YgSW50bC5OdW1iZXJGb3JtYXQgaXMgY2FsbGVkLCB0aGVcbiAqIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbi8qIDExLjIuMiAqL1xuZGVmaW5lUHJvcGVydHkoSW50bC5OdW1iZXJGb3JtYXQsICdzdXBwb3J0ZWRMb2NhbGVzT2YnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBmbkJpbmQuY2FsbChmdW5jdGlvbiAobG9jYWxlcykge1xuICAgICAgICAvLyBCb3VuZCBmdW5jdGlvbnMgb25seSBoYXZlIHRoZSBgdGhpc2AgdmFsdWUgYWx0ZXJlZCBpZiBiZWluZyB1c2VkIGFzIGEgY29uc3RydWN0b3IsXG4gICAgICAgIC8vIHRoaXMgbGV0cyB1cyBpbWl0YXRlIGEgbmF0aXZlIGZ1bmN0aW9uIHRoYXQgaGFzIG5vIGNvbnN0cnVjdG9yXG4gICAgICAgIGlmICghaG9wLmNhbGwodGhpcywgJ1tbYXZhaWxhYmxlTG9jYWxlc11dJykpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N1cHBvcnRlZExvY2FsZXNPZigpIGlzIG5vdCBhIGNvbnN0cnVjdG9yJyk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGFuIG9iamVjdCB3aG9zZSBwcm9wcyBjYW4gYmUgdXNlZCB0byByZXN0b3JlIHRoZSB2YWx1ZXMgb2YgUmVnRXhwIHByb3BzXG4gICAgICAgIHZhciByZWdleHBTdGF0ZSA9IGNyZWF0ZVJlZ0V4cFJlc3RvcmUoKSxcblxuXG4gICAgICAgIC8vIDEuIElmIG9wdGlvbnMgaXMgbm90IHByb3ZpZGVkLCB0aGVuIGxldCBvcHRpb25zIGJlIHVuZGVmaW5lZC5cbiAgICAgICAgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSxcblxuXG4gICAgICAgIC8vIDIuIExldCBhdmFpbGFibGVMb2NhbGVzIGJlIHRoZSB2YWx1ZSBvZiB0aGUgW1thdmFpbGFibGVMb2NhbGVzXV0gaW50ZXJuYWxcbiAgICAgICAgLy8gICAgcHJvcGVydHkgb2YgdGhlIHN0YW5kYXJkIGJ1aWx0LWluIG9iamVjdCB0aGF0IGlzIHRoZSBpbml0aWFsIHZhbHVlIG9mXG4gICAgICAgIC8vICAgIEludGwuTnVtYmVyRm9ybWF0LlxuXG4gICAgICAgIGF2YWlsYWJsZUxvY2FsZXMgPSB0aGlzWydbW2F2YWlsYWJsZUxvY2FsZXNdXSddLFxuXG5cbiAgICAgICAgLy8gMy4gTGV0IHJlcXVlc3RlZExvY2FsZXMgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBDYW5vbmljYWxpemVMb2NhbGVMaXN0XG4gICAgICAgIC8vICAgIGFic3RyYWN0IG9wZXJhdGlvbiAoZGVmaW5lZCBpbiA5LjIuMSkgd2l0aCBhcmd1bWVudCBsb2NhbGVzLlxuICAgICAgICByZXF1ZXN0ZWRMb2NhbGVzID0gQ2Fub25pY2FsaXplTG9jYWxlTGlzdChsb2NhbGVzKTtcblxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBSZWdFeHAgcHJvcGVydGllc1xuICAgICAgICByZWdleHBTdGF0ZS5leHAudGVzdChyZWdleHBTdGF0ZS5pbnB1dCk7XG5cbiAgICAgICAgLy8gNC4gUmV0dXJuIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgU3VwcG9ydGVkTG9jYWxlcyBhYnN0cmFjdCBvcGVyYXRpb25cbiAgICAgICAgLy8gICAgKGRlZmluZWQgaW4gOS4yLjgpIHdpdGggYXJndW1lbnRzIGF2YWlsYWJsZUxvY2FsZXMsIHJlcXVlc3RlZExvY2FsZXMsXG4gICAgICAgIC8vICAgIGFuZCBvcHRpb25zLlxuICAgICAgICByZXR1cm4gU3VwcG9ydGVkTG9jYWxlcyhhdmFpbGFibGVMb2NhbGVzLCByZXF1ZXN0ZWRMb2NhbGVzLCBvcHRpb25zKTtcbiAgICB9LCBpbnRlcm5hbHMuTnVtYmVyRm9ybWF0KVxufSk7XG5cbi8qKlxuICogVGhpcyBuYW1lZCBhY2Nlc3NvciBwcm9wZXJ0eSByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBmb3JtYXRzIGEgbnVtYmVyXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGVmZmVjdGl2ZSBsb2NhbGUgYW5kIHRoZSBmb3JtYXR0aW5nIG9wdGlvbnMgb2YgdGhpc1xuICogTnVtYmVyRm9ybWF0IG9iamVjdC5cbiAqL1xuLyogMTEuMy4yICovZGVmaW5lUHJvcGVydHkoSW50bC5OdW1iZXJGb3JtYXQucHJvdG90eXBlLCAnZm9ybWF0Jywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IEdldEZvcm1hdE51bWJlclxufSk7XG5cbmZ1bmN0aW9uIEdldEZvcm1hdE51bWJlcigpIHtcbiAgICB2YXIgaW50ZXJuYWwgPSB0aGlzICE9PSBudWxsICYmIGJhYmVsSGVscGVyc1tcInR5cGVvZlwiXSh0aGlzKSA9PT0gJ29iamVjdCcgJiYgZ2V0SW50ZXJuYWxQcm9wZXJ0aWVzKHRoaXMpO1xuXG4gICAgLy8gU2F0aXNmeSB0ZXN0IDExLjNfYlxuICAgIGlmICghaW50ZXJuYWwgfHwgIWludGVybmFsWydbW2luaXRpYWxpemVkTnVtYmVyRm9ybWF0XV0nXSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYHRoaXNgIHZhbHVlIGZvciBmb3JtYXQoKSBpcyBub3QgYW4gaW5pdGlhbGl6ZWQgSW50bC5OdW1iZXJGb3JtYXQgb2JqZWN0LicpO1xuXG4gICAgLy8gVGhlIHZhbHVlIG9mIHRoZSBbW0dldF1dIGF0dHJpYnV0ZSBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGZvbGxvd2luZ1xuICAgIC8vIHN0ZXBzOlxuXG4gICAgLy8gMS4gSWYgdGhlIFtbYm91bmRGb3JtYXRdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiB0aGlzIE51bWJlckZvcm1hdCBvYmplY3RcbiAgICAvLyAgICBpcyB1bmRlZmluZWQsIHRoZW46XG4gICAgaWYgKGludGVybmFsWydbW2JvdW5kRm9ybWF0XV0nXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGEuIExldCBGIGJlIGEgRnVuY3Rpb24gb2JqZWN0LCB3aXRoIGludGVybmFsIHByb3BlcnRpZXMgc2V0IGFzXG4gICAgICAgIC8vICAgIHNwZWNpZmllZCBmb3IgYnVpbHQtaW4gZnVuY3Rpb25zIGluIEVTNSwgMTUsIG9yIHN1Y2Nlc3NvciwgYW5kIHRoZVxuICAgICAgICAvLyAgICBsZW5ndGggcHJvcGVydHkgc2V0IHRvIDEsIHRoYXQgdGFrZXMgdGhlIGFyZ3VtZW50IHZhbHVlIGFuZFxuICAgICAgICAvLyAgICBwZXJmb3JtcyB0aGUgZm9sbG93aW5nIHN0ZXBzOlxuICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uIEYodmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGkuIElmIHZhbHVlIGlzIG5vdCBwcm92aWRlZCwgdGhlbiBsZXQgdmFsdWUgYmUgdW5kZWZpbmVkLlxuICAgICAgICAgICAgLy8gaWkuIExldCB4IGJlIFRvTnVtYmVyKHZhbHVlKS5cbiAgICAgICAgICAgIC8vIGlpaS4gUmV0dXJuIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgRm9ybWF0TnVtYmVyIGFic3RyYWN0XG4gICAgICAgICAgICAvLyAgICAgIG9wZXJhdGlvbiAoZGVmaW5lZCBiZWxvdykgd2l0aCBhcmd1bWVudHMgdGhpcyBhbmQgeC5cbiAgICAgICAgICAgIHJldHVybiBGb3JtYXROdW1iZXIodGhpcywgLyogeCA9ICovTnVtYmVyKHZhbHVlKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYi4gTGV0IGJpbmQgYmUgdGhlIHN0YW5kYXJkIGJ1aWx0LWluIGZ1bmN0aW9uIG9iamVjdCBkZWZpbmVkIGluIEVTNSxcbiAgICAgICAgLy8gICAgMTUuMy40LjUuXG4gICAgICAgIC8vIGMuIExldCBiZiBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbQ2FsbF1dIGludGVybmFsIG1ldGhvZCBvZlxuICAgICAgICAvLyAgICBiaW5kIHdpdGggRiBhcyB0aGUgdGhpcyB2YWx1ZSBhbmQgYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nXG4gICAgICAgIC8vICAgIHRoZSBzaW5nbGUgaXRlbSB0aGlzLlxuICAgICAgICB2YXIgYmYgPSBmbkJpbmQuY2FsbChGLCB0aGlzKTtcblxuICAgICAgICAvLyBkLiBTZXQgdGhlIFtbYm91bmRGb3JtYXRdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiB0aGlzIE51bWJlckZvcm1hdFxuICAgICAgICAvLyAgICBvYmplY3QgdG8gYmYuXG4gICAgICAgIGludGVybmFsWydbW2JvdW5kRm9ybWF0XV0nXSA9IGJmO1xuICAgIH1cbiAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBbW2JvdW5kRm9ybWF0XV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgdGhpc1xuICAgIC8vIE51bWJlckZvcm1hdCBvYmplY3QuXG4gICAgcmV0dXJuIGludGVybmFsWydbW2JvdW5kRm9ybWF0XV0nXTtcbn1cblxuSW50bC5OdW1iZXJGb3JtYXQucHJvdG90eXBlLmZvcm1hdFRvUGFydHMgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgaW50ZXJuYWwgPSB0aGlzICE9PSBudWxsICYmIGJhYmVsSGVscGVyc1tcInR5cGVvZlwiXSh0aGlzKSA9PT0gJ29iamVjdCcgJiYgZ2V0SW50ZXJuYWxQcm9wZXJ0aWVzKHRoaXMpO1xuICAgIGlmICghaW50ZXJuYWwgfHwgIWludGVybmFsWydbW2luaXRpYWxpemVkTnVtYmVyRm9ybWF0XV0nXSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYHRoaXNgIHZhbHVlIGZvciBmb3JtYXRUb1BhcnRzKCkgaXMgbm90IGFuIGluaXRpYWxpemVkIEludGwuTnVtYmVyRm9ybWF0IG9iamVjdC4nKTtcblxuICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICByZXR1cm4gRm9ybWF0TnVtYmVyVG9QYXJ0cyh0aGlzLCB4KTtcbn07XG5cbi8qXG4gKiBAc3BlY1tzdGFzbS9lY21hNDAyL251bWJlci1mb3JtYXQtdG8tcGFydHMvc3BlYy9udW1iZXJmb3JtYXQuaHRtbF1cbiAqIEBjbGF1c2Vbc2VjLWZvcm1hdG51bWJlcnRvcGFydHNdXG4gKi9cbmZ1bmN0aW9uIEZvcm1hdE51bWJlclRvUGFydHMobnVtYmVyRm9ybWF0LCB4KSB7XG4gICAgLy8gMS4gTGV0IHBhcnRzIGJlID8gUGFydGl0aW9uTnVtYmVyUGF0dGVybihudW1iZXJGb3JtYXQsIHgpLlxuICAgIHZhciBwYXJ0cyA9IFBhcnRpdGlvbk51bWJlclBhdHRlcm4obnVtYmVyRm9ybWF0LCB4KTtcbiAgICAvLyAyLiBMZXQgcmVzdWx0IGJlIEFycmF5Q3JlYXRlKDApLlxuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAvLyAzLiBMZXQgbiBiZSAwLlxuICAgIHZhciBuID0gMDtcbiAgICAvLyA0LiBGb3IgZWFjaCBwYXJ0IGluIHBhcnRzLCBkbzpcbiAgICBmb3IgKHZhciBpID0gMDsgcGFydHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgICAgIC8vIGEuIExldCBPIGJlIE9iamVjdENyZWF0ZSglT2JqZWN0UHJvdG90eXBlJSkuXG4gICAgICAgIHZhciBPID0ge307XG4gICAgICAgIC8vIGEuIFBlcmZvcm0gPyBDcmVhdGVEYXRhUHJvcGVydHlPclRocm93KE8sIFwidHlwZVwiLCBwYXJ0LltbdHlwZV1dKS5cbiAgICAgICAgTy50eXBlID0gcGFydFsnW1t0eXBlXV0nXTtcbiAgICAgICAgLy8gYS4gUGVyZm9ybSA/IENyZWF0ZURhdGFQcm9wZXJ0eU9yVGhyb3coTywgXCJ2YWx1ZVwiLCBwYXJ0LltbdmFsdWVdXSkuXG4gICAgICAgIE8udmFsdWUgPSBwYXJ0WydbW3ZhbHVlXV0nXTtcbiAgICAgICAgLy8gYS4gUGVyZm9ybSA/IENyZWF0ZURhdGFQcm9wZXJ0eU9yVGhyb3cocmVzdWx0LCA/IFRvU3RyaW5nKG4pLCBPKS5cbiAgICAgICAgcmVzdWx0W25dID0gTztcbiAgICAgICAgLy8gYS4gSW5jcmVtZW50IG4gYnkgMS5cbiAgICAgICAgbiArPSAxO1xuICAgIH1cbiAgICAvLyA1LiBSZXR1cm4gcmVzdWx0LlxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qXG4gKiBAc3BlY1tzdGFzbS9lY21hNDAyL251bWJlci1mb3JtYXQtdG8tcGFydHMvc3BlYy9udW1iZXJmb3JtYXQuaHRtbF1cbiAqIEBjbGF1c2Vbc2VjLXBhcnRpdGlvbm51bWJlcnBhdHRlcm5dXG4gKi9cbmZ1bmN0aW9uIFBhcnRpdGlvbk51bWJlclBhdHRlcm4obnVtYmVyRm9ybWF0LCB4KSB7XG5cbiAgICB2YXIgaW50ZXJuYWwgPSBnZXRJbnRlcm5hbFByb3BlcnRpZXMobnVtYmVyRm9ybWF0KSxcbiAgICAgICAgbG9jYWxlID0gaW50ZXJuYWxbJ1tbZGF0YUxvY2FsZV1dJ10sXG4gICAgICAgIG51bXMgPSBpbnRlcm5hbFsnW1tudW1iZXJpbmdTeXN0ZW1dXSddLFxuICAgICAgICBkYXRhID0gaW50ZXJuYWxzLk51bWJlckZvcm1hdFsnW1tsb2NhbGVEYXRhXV0nXVtsb2NhbGVdLFxuICAgICAgICBpbGQgPSBkYXRhLnN5bWJvbHNbbnVtc10gfHwgZGF0YS5zeW1ib2xzLmxhdG4sXG4gICAgICAgIHBhdHRlcm4gPSB2b2lkIDA7XG5cbiAgICAvLyAxLiBJZiB4IGlzIG5vdCBOYU4gYW5kIHggPCAwLCB0aGVuOlxuICAgIGlmICghaXNOYU4oeCkgJiYgeCA8IDApIHtcbiAgICAgICAgLy8gYS4gTGV0IHggYmUgLXguXG4gICAgICAgIHggPSAteDtcbiAgICAgICAgLy8gYS4gTGV0IHBhdHRlcm4gYmUgdGhlIHZhbHVlIG9mIG51bWJlckZvcm1hdC5bW25lZ2F0aXZlUGF0dGVybl1dLlxuICAgICAgICBwYXR0ZXJuID0gaW50ZXJuYWxbJ1tbbmVnYXRpdmVQYXR0ZXJuXV0nXTtcbiAgICB9XG4gICAgLy8gMi4gRWxzZSxcbiAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGEuIExldCBwYXR0ZXJuIGJlIHRoZSB2YWx1ZSBvZiBudW1iZXJGb3JtYXQuW1twb3NpdGl2ZVBhdHRlcm5dXS5cbiAgICAgICAgICAgIHBhdHRlcm4gPSBpbnRlcm5hbFsnW1twb3NpdGl2ZVBhdHRlcm5dXSddO1xuICAgICAgICB9XG4gICAgLy8gMy4gTGV0IHJlc3VsdCBiZSBhIG5ldyBlbXB0eSBMaXN0LlxuICAgIHZhciByZXN1bHQgPSBuZXcgTGlzdCgpO1xuICAgIC8vIDQuIExldCBiZWdpbkluZGV4IGJlIENhbGwoJVN0cmluZ1Byb3RvX2luZGV4T2YlLCBwYXR0ZXJuLCBcIntcIiwgMCkuXG4gICAgdmFyIGJlZ2luSW5kZXggPSBwYXR0ZXJuLmluZGV4T2YoJ3snLCAwKTtcbiAgICAvLyA1LiBMZXQgZW5kSW5kZXggYmUgMC5cbiAgICB2YXIgZW5kSW5kZXggPSAwO1xuICAgIC8vIDYuIExldCBuZXh0SW5kZXggYmUgMC5cbiAgICB2YXIgbmV4dEluZGV4ID0gMDtcbiAgICAvLyA3LiBMZXQgbGVuZ3RoIGJlIHRoZSBudW1iZXIgb2YgY29kZSB1bml0cyBpbiBwYXR0ZXJuLlxuICAgIHZhciBsZW5ndGggPSBwYXR0ZXJuLmxlbmd0aDtcbiAgICAvLyA4LiBSZXBlYXQgd2hpbGUgYmVnaW5JbmRleCBpcyBhbiBpbnRlZ2VyIGluZGV4IGludG8gcGF0dGVybjpcbiAgICB3aGlsZSAoYmVnaW5JbmRleCA+IC0xICYmIGJlZ2luSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgLy8gYS4gU2V0IGVuZEluZGV4IHRvIENhbGwoJVN0cmluZ1Byb3RvX2luZGV4T2YlLCBwYXR0ZXJuLCBcIn1cIiwgYmVnaW5JbmRleClcbiAgICAgICAgZW5kSW5kZXggPSBwYXR0ZXJuLmluZGV4T2YoJ30nLCBiZWdpbkluZGV4KTtcbiAgICAgICAgLy8gYS4gSWYgZW5kSW5kZXggPSAtMSwgdGhyb3cgbmV3IEVycm9yIGV4Y2VwdGlvbi5cbiAgICAgICAgaWYgKGVuZEluZGV4ID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgIC8vIGEuIElmIGJlZ2luSW5kZXggaXMgZ3JlYXRlciB0aGFuIG5leHRJbmRleCwgdGhlbjpcbiAgICAgICAgaWYgKGJlZ2luSW5kZXggPiBuZXh0SW5kZXgpIHtcbiAgICAgICAgICAgIC8vIGkuIExldCBsaXRlcmFsIGJlIGEgc3Vic3RyaW5nIG9mIHBhdHRlcm4gZnJvbSBwb3NpdGlvbiBuZXh0SW5kZXgsIGluY2x1c2l2ZSwgdG8gcG9zaXRpb24gYmVnaW5JbmRleCwgZXhjbHVzaXZlLlxuICAgICAgICAgICAgdmFyIGxpdGVyYWwgPSBwYXR0ZXJuLnN1YnN0cmluZyhuZXh0SW5kZXgsIGJlZ2luSW5kZXgpO1xuICAgICAgICAgICAgLy8gaWkuIEFkZCBuZXcgcGFydCByZWNvcmQgeyBbW3R5cGVdXTogXCJsaXRlcmFsXCIsIFtbdmFsdWVdXTogbGl0ZXJhbCB9IGFzIGEgbmV3IGVsZW1lbnQgb2YgdGhlIGxpc3QgcmVzdWx0LlxuICAgICAgICAgICAgYXJyUHVzaC5jYWxsKHJlc3VsdCwgeyAnW1t0eXBlXV0nOiAnbGl0ZXJhbCcsICdbW3ZhbHVlXV0nOiBsaXRlcmFsIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGEuIExldCBwIGJlIHRoZSBzdWJzdHJpbmcgb2YgcGF0dGVybiBmcm9tIHBvc2l0aW9uIGJlZ2luSW5kZXgsIGV4Y2x1c2l2ZSwgdG8gcG9zaXRpb24gZW5kSW5kZXgsIGV4Y2x1c2l2ZS5cbiAgICAgICAgdmFyIHAgPSBwYXR0ZXJuLnN1YnN0cmluZyhiZWdpbkluZGV4ICsgMSwgZW5kSW5kZXgpO1xuICAgICAgICAvLyBhLiBJZiBwIGlzIGVxdWFsIFwibnVtYmVyXCIsIHRoZW46XG4gICAgICAgIGlmIChwID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAvLyBpLiBJZiB4IGlzIE5hTixcbiAgICAgICAgICAgIGlmIChpc05hTih4KSkge1xuICAgICAgICAgICAgICAgIC8vIDEuIExldCBuIGJlIGFuIElMRCBTdHJpbmcgdmFsdWUgaW5kaWNhdGluZyB0aGUgTmFOIHZhbHVlLlxuICAgICAgICAgICAgICAgIHZhciBuID0gaWxkLm5hbjtcbiAgICAgICAgICAgICAgICAvLyAyLiBBZGQgbmV3IHBhcnQgcmVjb3JkIHsgW1t0eXBlXV06IFwibmFuXCIsIFtbdmFsdWVdXTogbiB9IGFzIGEgbmV3IGVsZW1lbnQgb2YgdGhlIGxpc3QgcmVzdWx0LlxuICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ25hbicsICdbW3ZhbHVlXV0nOiBuIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWkuIEVsc2UgaWYgaXNGaW5pdGUoeCkgaXMgZmFsc2UsXG4gICAgICAgICAgICBlbHNlIGlmICghaXNGaW5pdGUoeCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gMS4gTGV0IG4gYmUgYW4gSUxEIFN0cmluZyB2YWx1ZSBpbmRpY2F0aW5nIGluZmluaXR5LlxuICAgICAgICAgICAgICAgICAgICB2YXIgX24gPSBpbGQuaW5maW5pdHk7XG4gICAgICAgICAgICAgICAgICAgIC8vIDIuIEFkZCBuZXcgcGFydCByZWNvcmQgeyBbW3R5cGVdXTogXCJpbmZpbml0eVwiLCBbW3ZhbHVlXV06IG4gfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgYXJyUHVzaC5jYWxsKHJlc3VsdCwgeyAnW1t0eXBlXV0nOiAnaW5maW5pdHknLCAnW1t2YWx1ZV1dJzogX24gfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlpaS4gRWxzZSxcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIElmIHRoZSB2YWx1ZSBvZiBudW1iZXJGb3JtYXQuW1tzdHlsZV1dIGlzIFwicGVyY2VudFwiIGFuZCBpc0Zpbml0ZSh4KSwgbGV0IHggYmUgMTAwIMOXIHguXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW50ZXJuYWxbJ1tbc3R5bGVdXSddID09PSAncGVyY2VudCcgJiYgaXNGaW5pdGUoeCkpIHggKj0gMTAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX24yID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMi4gSWYgdGhlIG51bWJlckZvcm1hdC5bW21pbmltdW1TaWduaWZpY2FudERpZ2l0c11dIGFuZCBudW1iZXJGb3JtYXQuW1ttYXhpbXVtU2lnbmlmaWNhbnREaWdpdHNdXSBhcmUgcHJlc2VudCwgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcC5jYWxsKGludGVybmFsLCAnW1ttaW5pbXVtU2lnbmlmaWNhbnREaWdpdHNdXScpICYmIGhvcC5jYWxsKGludGVybmFsLCAnW1ttYXhpbXVtU2lnbmlmaWNhbnREaWdpdHNdXScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYS4gTGV0IG4gYmUgVG9SYXdQcmVjaXNpb24oeCwgbnVtYmVyRm9ybWF0LltbbWluaW11bVNpZ25pZmljYW50RGlnaXRzXV0sIG51bWJlckZvcm1hdC5bW21heGltdW1TaWduaWZpY2FudERpZ2l0c11dKS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfbjIgPSBUb1Jhd1ByZWNpc2lvbih4LCBpbnRlcm5hbFsnW1ttaW5pbXVtU2lnbmlmaWNhbnREaWdpdHNdXSddLCBpbnRlcm5hbFsnW1ttYXhpbXVtU2lnbmlmaWNhbnREaWdpdHNdXSddKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMuIEVsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYS4gTGV0IG4gYmUgVG9SYXdGaXhlZCh4LCBudW1iZXJGb3JtYXQuW1ttaW5pbXVtSW50ZWdlckRpZ2l0c11dLCBudW1iZXJGb3JtYXQuW1ttaW5pbXVtRnJhY3Rpb25EaWdpdHNdXSwgbnVtYmVyRm9ybWF0LltbbWF4aW11bUZyYWN0aW9uRGlnaXRzXV0pLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfbjIgPSBUb1Jhd0ZpeGVkKHgsIGludGVybmFsWydbW21pbmltdW1JbnRlZ2VyRGlnaXRzXV0nXSwgaW50ZXJuYWxbJ1tbbWluaW11bUZyYWN0aW9uRGlnaXRzXV0nXSwgaW50ZXJuYWxbJ1tbbWF4aW11bUZyYWN0aW9uRGlnaXRzXV0nXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gNC4gSWYgdGhlIHZhbHVlIG9mIHRoZSBudW1iZXJGb3JtYXQuW1tudW1iZXJpbmdTeXN0ZW1dXSBtYXRjaGVzIG9uZSBvZiB0aGUgdmFsdWVzIGluIHRoZSBcIk51bWJlcmluZyBTeXN0ZW1cIiBjb2x1bW4gb2YgVGFibGUgMiBiZWxvdywgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bVN5c1tudW1zXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIExldCBkaWdpdHMgYmUgYW4gYXJyYXkgd2hvc2UgMTAgU3RyaW5nIHZhbHVlZCBlbGVtZW50cyBhcmUgdGhlIFVURi0xNiBzdHJpbmcgcmVwcmVzZW50YXRpb25zIG9mIHRoZSAxMCBkaWdpdHMgc3BlY2lmaWVkIGluIHRoZSBcIkRpZ2l0c1wiIGNvbHVtbiBvZiB0aGUgbWF0Y2hpbmcgcm93IGluIFRhYmxlIDIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaWdpdHMgPSBudW1TeXNbbnVtc107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIFJlcGxhY2UgZWFjaCBkaWdpdCBpbiBuIHdpdGggdGhlIHZhbHVlIG9mIGRpZ2l0c1tkaWdpdF0uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9uMiA9IFN0cmluZyhfbjIpLnJlcGxhY2UoL1xcZC9nLCBmdW5jdGlvbiAoZGlnaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkaWdpdHNbZGlnaXRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4gRWxzZSB1c2UgYW4gaW1wbGVtZW50YXRpb24gZGVwZW5kZW50IGFsZ29yaXRobSB0byBtYXAgbiB0byB0aGUgYXBwcm9wcmlhdGUgcmVwcmVzZW50YXRpb24gb2YgbiBpbiB0aGUgZ2l2ZW4gbnVtYmVyaW5nIHN5c3RlbS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgX24yID0gU3RyaW5nKF9uMik7IC8vICMjI1RPRE8jIyNcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGludGVnZXIgPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnJhY3Rpb24gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyA2LiBMZXQgZGVjaW1hbFNlcEluZGV4IGJlIENhbGwoJVN0cmluZ1Byb3RvX2luZGV4T2YlLCBuLCBcIi5cIiwgMCkuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGVjaW1hbFNlcEluZGV4ID0gX24yLmluZGV4T2YoJy4nLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDcuIElmIGRlY2ltYWxTZXBJbmRleCA+IDAsIHRoZW46XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVjaW1hbFNlcEluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIExldCBpbnRlZ2VyIGJlIHRoZSBzdWJzdHJpbmcgb2YgbiBmcm9tIHBvc2l0aW9uIDAsIGluY2x1c2l2ZSwgdG8gcG9zaXRpb24gZGVjaW1hbFNlcEluZGV4LCBleGNsdXNpdmUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZWdlciA9IF9uMi5zdWJzdHJpbmcoMCwgZGVjaW1hbFNlcEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhLiBMZXQgZnJhY3Rpb24gYmUgdGhlIHN1YnN0cmluZyBvZiBuIGZyb20gcG9zaXRpb24gZGVjaW1hbFNlcEluZGV4LCBleGNsdXNpdmUsIHRvIHRoZSBlbmQgb2Ygbi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFjdGlvbiA9IF9uMi5zdWJzdHJpbmcoZGVjaW1hbFNlcEluZGV4ICsgMSwgZGVjaW1hbFNlcEluZGV4Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyA4LiBFbHNlOlxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIExldCBpbnRlZ2VyIGJlIG4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVnZXIgPSBfbjI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIExldCBmcmFjdGlvbiBiZSB1bmRlZmluZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYWN0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDkuIElmIHRoZSB2YWx1ZSBvZiB0aGUgbnVtYmVyRm9ybWF0LltbdXNlR3JvdXBpbmddXSBpcyB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGludGVybmFsWydbW3VzZUdyb3VwaW5nXV0nXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIExldCBncm91cFNlcFN5bWJvbCBiZSB0aGUgSUxORCBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBncm91cGluZyBzZXBhcmF0b3IuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyb3VwU2VwU3ltYm9sID0gaWxkLmdyb3VwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIExldCBncm91cHMgYmUgYSBMaXN0IHdob3NlIGVsZW1lbnRzIGFyZSwgaW4gbGVmdCB0byByaWdodCBvcmRlciwgdGhlIHN1YnN0cmluZ3MgZGVmaW5lZCBieSBJTE5EIHNldCBvZiBsb2NhdGlvbnMgd2l0aGluIHRoZSBpbnRlZ2VyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncm91cHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAtLS0tPiBpbXBsZW1lbnRhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmltYXJ5IGdyb3VwIHJlcHJlc2VudHMgdGhlIGdyb3VwIGNsb3Nlc3QgdG8gdGhlIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGdTaXplID0gZGF0YS5wYXR0ZXJucy5wcmltYXJ5R3JvdXBTaXplIHx8IDM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Vjb25kYXJ5IGdyb3VwIGlzIGV2ZXJ5IG90aGVyIGdyb3VwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNnU2l6ZSA9IGRhdGEucGF0dGVybnMuc2Vjb25kYXJ5R3JvdXBTaXplIHx8IHBnU2l6ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHcm91cCBvbmx5IGlmIG5lY2Vzc2FyeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlZ2VyLmxlbmd0aCA+IHBnU2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbmRleCBvZiB0aGUgcHJpbWFyeSBncm91cGluZyBzZXBhcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZCA9IGludGVnZXIubGVuZ3RoIC0gcGdTaXplO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdGFydGluZyBpbmRleCBmb3Igb3VyIGxvb3BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IGVuZCAlIHNnU2l6ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gaW50ZWdlci5zbGljZSgwLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnQubGVuZ3RoKSBhcnJQdXNoLmNhbGwoZ3JvdXBzLCBzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvb3AgdG8gc2VwYXJhdGUgaW50byBzZWNvbmRhcnkgZ3JvdXBpbmcgZGlnaXRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChpZHggPCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChncm91cHMsIGludGVnZXIuc2xpY2UoaWR4LCBpZHggKyBzZ1NpemUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkeCArPSBzZ1NpemU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBwcmltYXJ5IGdyb3VwaW5nIGRpZ2l0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJQdXNoLmNhbGwoZ3JvdXBzLCBpbnRlZ2VyLnNsaWNlKGVuZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChncm91cHMsIGludGVnZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhLiBBc3NlcnQ6IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gZ3JvdXBzIExpc3QgaXMgZ3JlYXRlciB0aGFuIDAuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyb3Vwcy5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEuIFJlcGVhdCwgd2hpbGUgZ3JvdXBzIExpc3QgaXMgbm90IGVtcHR5OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChncm91cHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGkuIFJlbW92ZSB0aGUgZmlyc3QgZWxlbWVudCBmcm9tIGdyb3VwcyBhbmQgbGV0IGludGVnZXJHcm91cCBiZSB0aGUgdmFsdWUgb2YgdGhhdCBlbGVtZW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW50ZWdlckdyb3VwID0gYXJyU2hpZnQuY2FsbChncm91cHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpaS4gQWRkIG5ldyBwYXJ0IHJlY29yZCB7IFtbdHlwZV1dOiBcImludGVnZXJcIiwgW1t2YWx1ZV1dOiBpbnRlZ2VyR3JvdXAgfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJyUHVzaC5jYWxsKHJlc3VsdCwgeyAnW1t0eXBlXV0nOiAnaW50ZWdlcicsICdbW3ZhbHVlXV0nOiBpbnRlZ2VyR3JvdXAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlpaS4gSWYgZ3JvdXBzIExpc3QgaXMgbm90IGVtcHR5LCB0aGVuOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JvdXBzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4gQWRkIG5ldyBwYXJ0IHJlY29yZCB7IFtbdHlwZV1dOiBcImdyb3VwXCIsIFtbdmFsdWVdXTogZ3JvdXBTZXBTeW1ib2wgfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ2dyb3VwJywgJ1tbdmFsdWVdXSc6IGdyb3VwU2VwU3ltYm9sIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMTAuIEVsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYS4gQWRkIG5ldyBwYXJ0IHJlY29yZCB7IFtbdHlwZV1dOiBcImludGVnZXJcIiwgW1t2YWx1ZV1dOiBpbnRlZ2VyIH0gYXMgYSBuZXcgZWxlbWVudCBvZiB0aGUgbGlzdCByZXN1bHQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ2ludGVnZXInLCAnW1t2YWx1ZV1dJzogaW50ZWdlciB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAxMS4gSWYgZnJhY3Rpb24gaXMgbm90IHVuZGVmaW5lZCwgdGhlbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcmFjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYS4gTGV0IGRlY2ltYWxTZXBTeW1ib2wgYmUgdGhlIElMTkQgU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZGVjaW1hbCBzZXBhcmF0b3IuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlY2ltYWxTZXBTeW1ib2wgPSBpbGQuZGVjaW1hbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhLiBBZGQgbmV3IHBhcnQgcmVjb3JkIHsgW1t0eXBlXV06IFwiZGVjaW1hbFwiLCBbW3ZhbHVlXV06IGRlY2ltYWxTZXBTeW1ib2wgfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJQdXNoLmNhbGwocmVzdWx0LCB7ICdbW3R5cGVdXSc6ICdkZWNpbWFsJywgJ1tbdmFsdWVdXSc6IGRlY2ltYWxTZXBTeW1ib2wgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYS4gQWRkIG5ldyBwYXJ0IHJlY29yZCB7IFtbdHlwZV1dOiBcImZyYWN0aW9uXCIsIFtbdmFsdWVdXTogZnJhY3Rpb24gfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJQdXNoLmNhbGwocmVzdWx0LCB7ICdbW3R5cGVdXSc6ICdmcmFjdGlvbicsICdbW3ZhbHVlXV0nOiBmcmFjdGlvbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGEuIEVsc2UgaWYgcCBpcyBlcXVhbCBcInBsdXNTaWduXCIsIHRoZW46XG4gICAgICAgIGVsc2UgaWYgKHAgPT09IFwicGx1c1NpZ25cIikge1xuICAgICAgICAgICAgICAgIC8vIGkuIExldCBwbHVzU2lnblN5bWJvbCBiZSB0aGUgSUxORCBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBwbHVzIHNpZ24uXG4gICAgICAgICAgICAgICAgdmFyIHBsdXNTaWduU3ltYm9sID0gaWxkLnBsdXNTaWduO1xuICAgICAgICAgICAgICAgIC8vIGlpLiBBZGQgbmV3IHBhcnQgcmVjb3JkIHsgW1t0eXBlXV06IFwicGx1c1NpZ25cIiwgW1t2YWx1ZV1dOiBwbHVzU2lnblN5bWJvbCB9IGFzIGEgbmV3IGVsZW1lbnQgb2YgdGhlIGxpc3QgcmVzdWx0LlxuICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ3BsdXNTaWduJywgJ1tbdmFsdWVdXSc6IHBsdXNTaWduU3ltYm9sIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYS4gRWxzZSBpZiBwIGlzIGVxdWFsIFwibWludXNTaWduXCIsIHRoZW46XG4gICAgICAgICAgICBlbHNlIGlmIChwID09PSBcIm1pbnVzU2lnblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGkuIExldCBtaW51c1NpZ25TeW1ib2wgYmUgdGhlIElMTkQgU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWludXMgc2lnbi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG1pbnVzU2lnblN5bWJvbCA9IGlsZC5taW51c1NpZ247XG4gICAgICAgICAgICAgICAgICAgIC8vIGlpLiBBZGQgbmV3IHBhcnQgcmVjb3JkIHsgW1t0eXBlXV06IFwibWludXNTaWduXCIsIFtbdmFsdWVdXTogbWludXNTaWduU3ltYm9sIH0gYXMgYSBuZXcgZWxlbWVudCBvZiB0aGUgbGlzdCByZXN1bHQuXG4gICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ21pbnVzU2lnbicsICdbW3ZhbHVlXV0nOiBtaW51c1NpZ25TeW1ib2wgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGEuIEVsc2UgaWYgcCBpcyBlcXVhbCBcInBlcmNlbnRTaWduXCIgYW5kIG51bWJlckZvcm1hdC5bW3N0eWxlXV0gaXMgXCJwZXJjZW50XCIsIHRoZW46XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocCA9PT0gXCJwZXJjZW50U2lnblwiICYmIGludGVybmFsWydbW3N0eWxlXV0nXSA9PT0gXCJwZXJjZW50XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGkuIExldCBwZXJjZW50U2lnblN5bWJvbCBiZSB0aGUgSUxORCBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBwZXJjZW50IHNpZ24uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGVyY2VudFNpZ25TeW1ib2wgPSBpbGQucGVyY2VudFNpZ247XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpaS4gQWRkIG5ldyBwYXJ0IHJlY29yZCB7IFtbdHlwZV1dOiBcInBlcmNlbnRTaWduXCIsIFtbdmFsdWVdXTogcGVyY2VudFNpZ25TeW1ib2wgfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ2xpdGVyYWwnLCAnW1t2YWx1ZV1dJzogcGVyY2VudFNpZ25TeW1ib2wgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gYS4gRWxzZSBpZiBwIGlzIGVxdWFsIFwiY3VycmVuY3lcIiBhbmQgbnVtYmVyRm9ybWF0Lltbc3R5bGVdXSBpcyBcImN1cnJlbmN5XCIsIHRoZW46XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHAgPT09IFwiY3VycmVuY3lcIiAmJiBpbnRlcm5hbFsnW1tzdHlsZV1dJ10gPT09IFwiY3VycmVuY3lcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGkuIExldCBjdXJyZW5jeSBiZSB0aGUgdmFsdWUgb2YgbnVtYmVyRm9ybWF0LltbY3VycmVuY3ldXS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3VycmVuY3kgPSBpbnRlcm5hbFsnW1tjdXJyZW5jeV1dJ107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2QgPSB2b2lkIDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpaS4gSWYgbnVtYmVyRm9ybWF0LltbY3VycmVuY3lEaXNwbGF5XV0gaXMgXCJjb2RlXCIsIHRoZW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW50ZXJuYWxbJ1tbY3VycmVuY3lEaXNwbGF5XV0nXSA9PT0gXCJjb2RlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4gTGV0IGNkIGJlIGN1cnJlbmN5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZCA9IGN1cnJlbmN5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpaWkuIEVsc2UgaWYgbnVtYmVyRm9ybWF0LltbY3VycmVuY3lEaXNwbGF5XV0gaXMgXCJzeW1ib2xcIiwgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGludGVybmFsWydbW2N1cnJlbmN5RGlzcGxheV1dJ10gPT09IFwic3ltYm9sXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIExldCBjZCBiZSBhbiBJTEQgc3RyaW5nIHJlcHJlc2VudGluZyBjdXJyZW5jeSBpbiBzaG9ydCBmb3JtLiBJZiB0aGUgaW1wbGVtZW50YXRpb24gZG9lcyBub3QgaGF2ZSBzdWNoIGEgcmVwcmVzZW50YXRpb24gb2YgY3VycmVuY3ksIHVzZSBjdXJyZW5jeSBpdHNlbGYuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZCA9IGRhdGEuY3VycmVuY2llc1tjdXJyZW5jeV0gfHwgY3VycmVuY3k7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXYuIEVsc2UgaWYgbnVtYmVyRm9ybWF0LltbY3VycmVuY3lEaXNwbGF5XV0gaXMgXCJuYW1lXCIsIHRoZW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoaW50ZXJuYWxbJ1tbY3VycmVuY3lEaXNwbGF5XV0nXSA9PT0gXCJuYW1lXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiBMZXQgY2QgYmUgYW4gSUxEIHN0cmluZyByZXByZXNlbnRpbmcgY3VycmVuY3kgaW4gbG9uZyBmb3JtLiBJZiB0aGUgaW1wbGVtZW50YXRpb24gZG9lcyBub3QgaGF2ZSBzdWNoIGEgcmVwcmVzZW50YXRpb24gb2YgY3VycmVuY3ksIHRoZW4gdXNlIGN1cnJlbmN5IGl0c2VsZi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZCA9IGN1cnJlbmN5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHYuIEFkZCBuZXcgcGFydCByZWNvcmQgeyBbW3R5cGVdXTogXCJjdXJyZW5jeVwiLCBbW3ZhbHVlXV06IGNkIH0gYXMgYSBuZXcgZWxlbWVudCBvZiB0aGUgbGlzdCByZXN1bHQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJyUHVzaC5jYWxsKHJlc3VsdCwgeyAnW1t0eXBlXV0nOiAnY3VycmVuY3knLCAnW1t2YWx1ZV1dJzogY2QgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhLiBFbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGkuIExldCBsaXRlcmFsIGJlIHRoZSBzdWJzdHJpbmcgb2YgcGF0dGVybiBmcm9tIHBvc2l0aW9uIGJlZ2luSW5kZXgsIGluY2x1c2l2ZSwgdG8gcG9zaXRpb24gZW5kSW5kZXgsIGluY2x1c2l2ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF9saXRlcmFsID0gcGF0dGVybi5zdWJzdHJpbmcoYmVnaW5JbmRleCwgZW5kSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpaS4gQWRkIG5ldyBwYXJ0IHJlY29yZCB7IFtbdHlwZV1dOiBcImxpdGVyYWxcIiwgW1t2YWx1ZV1dOiBsaXRlcmFsIH0gYXMgYSBuZXcgZWxlbWVudCBvZiB0aGUgbGlzdCByZXN1bHQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHsgJ1tbdHlwZV1dJzogJ2xpdGVyYWwnLCAnW1t2YWx1ZV1dJzogX2xpdGVyYWwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAvLyBhLiBTZXQgbmV4dEluZGV4IHRvIGVuZEluZGV4ICsgMS5cbiAgICAgICAgbmV4dEluZGV4ID0gZW5kSW5kZXggKyAxO1xuICAgICAgICAvLyBhLiBTZXQgYmVnaW5JbmRleCB0byBDYWxsKCVTdHJpbmdQcm90b19pbmRleE9mJSwgcGF0dGVybiwgXCJ7XCIsIG5leHRJbmRleClcbiAgICAgICAgYmVnaW5JbmRleCA9IHBhdHRlcm4uaW5kZXhPZigneycsIG5leHRJbmRleCk7XG4gICAgfVxuICAgIC8vIDkuIElmIG5leHRJbmRleCBpcyBsZXNzIHRoYW4gbGVuZ3RoLCB0aGVuOlxuICAgIGlmIChuZXh0SW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgLy8gYS4gTGV0IGxpdGVyYWwgYmUgdGhlIHN1YnN0cmluZyBvZiBwYXR0ZXJuIGZyb20gcG9zaXRpb24gbmV4dEluZGV4LCBpbmNsdXNpdmUsIHRvIHBvc2l0aW9uIGxlbmd0aCwgZXhjbHVzaXZlLlxuICAgICAgICB2YXIgX2xpdGVyYWwyID0gcGF0dGVybi5zdWJzdHJpbmcobmV4dEluZGV4LCBsZW5ndGgpO1xuICAgICAgICAvLyBhLiBBZGQgbmV3IHBhcnQgcmVjb3JkIHsgW1t0eXBlXV06IFwibGl0ZXJhbFwiLCBbW3ZhbHVlXV06IGxpdGVyYWwgfSBhcyBhIG5ldyBlbGVtZW50IG9mIHRoZSBsaXN0IHJlc3VsdC5cbiAgICAgICAgYXJyUHVzaC5jYWxsKHJlc3VsdCwgeyAnW1t0eXBlXV0nOiAnbGl0ZXJhbCcsICdbW3ZhbHVlXV0nOiBfbGl0ZXJhbDIgfSk7XG4gICAgfVxuICAgIC8vIDEwLiBSZXR1cm4gcmVzdWx0LlxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qXG4gKiBAc3BlY1tzdGFzbS9lY21hNDAyL251bWJlci1mb3JtYXQtdG8tcGFydHMvc3BlYy9udW1iZXJmb3JtYXQuaHRtbF1cbiAqIEBjbGF1c2Vbc2VjLWZvcm1hdG51bWJlcl1cbiAqL1xuZnVuY3Rpb24gRm9ybWF0TnVtYmVyKG51bWJlckZvcm1hdCwgeCkge1xuICAgIC8vIDEuIExldCBwYXJ0cyBiZSA/IFBhcnRpdGlvbk51bWJlclBhdHRlcm4obnVtYmVyRm9ybWF0LCB4KS5cbiAgICB2YXIgcGFydHMgPSBQYXJ0aXRpb25OdW1iZXJQYXR0ZXJuKG51bWJlckZvcm1hdCwgeCk7XG4gICAgLy8gMi4gTGV0IHJlc3VsdCBiZSBhbiBlbXB0eSBTdHJpbmcuXG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIC8vIDMuIEZvciBlYWNoIHBhcnQgaW4gcGFydHMsIGRvOlxuICAgIGZvciAodmFyIGkgPSAwOyBwYXJ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgICAgLy8gYS4gU2V0IHJlc3VsdCB0byBhIFN0cmluZyB2YWx1ZSBwcm9kdWNlZCBieSBjb25jYXRlbmF0aW5nIHJlc3VsdCBhbmQgcGFydC5bW3ZhbHVlXV0uXG4gICAgICAgIHJlc3VsdCArPSBwYXJ0WydbW3ZhbHVlXV0nXTtcbiAgICB9XG4gICAgLy8gNC4gUmV0dXJuIHJlc3VsdC5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIFRvUmF3UHJlY2lzaW9uIGFic3RyYWN0IG9wZXJhdGlvbiBpcyBjYWxsZWQgd2l0aCBhcmd1bWVudHMgeCAod2hpY2hcbiAqIG11c3QgYmUgYSBmaW5pdGUgbm9uLW5lZ2F0aXZlIG51bWJlciksIG1pblByZWNpc2lvbiwgYW5kIG1heFByZWNpc2lvbiAoYm90aFxuICogbXVzdCBiZSBpbnRlZ2VycyBiZXR3ZWVuIDEgYW5kIDIxKSB0aGUgZm9sbG93aW5nIHN0ZXBzIGFyZSB0YWtlbjpcbiAqL1xuZnVuY3Rpb24gVG9SYXdQcmVjaXNpb24oeCwgbWluUHJlY2lzaW9uLCBtYXhQcmVjaXNpb24pIHtcbiAgICAvLyAxLiBMZXQgcCBiZSBtYXhQcmVjaXNpb24uXG4gICAgdmFyIHAgPSBtYXhQcmVjaXNpb247XG5cbiAgICB2YXIgbSA9IHZvaWQgMCxcbiAgICAgICAgZSA9IHZvaWQgMDtcblxuICAgIC8vIDIuIElmIHggPSAwLCB0aGVuXG4gICAgaWYgKHggPT09IDApIHtcbiAgICAgICAgLy8gYS4gTGV0IG0gYmUgdGhlIFN0cmluZyBjb25zaXN0aW5nIG9mIHAgb2NjdXJyZW5jZXMgb2YgdGhlIGNoYXJhY3RlciBcIjBcIi5cbiAgICAgICAgbSA9IGFyckpvaW4uY2FsbChBcnJheShwICsgMSksICcwJyk7XG4gICAgICAgIC8vIGIuIExldCBlIGJlIDAuXG4gICAgICAgIGUgPSAwO1xuICAgIH1cbiAgICAvLyAzLiBFbHNlXG4gICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBhLiBMZXQgZSBhbmQgbiBiZSBpbnRlZ2VycyBzdWNoIHRoYXQgMTDhtZbigbvCuSDiiaQgbiA8IDEw4bWWIGFuZCBmb3Igd2hpY2ggdGhlXG4gICAgICAgICAgICAvLyAgICBleGFjdCBtYXRoZW1hdGljYWwgdmFsdWUgb2YgbiDDlyAxMOG1ieKBu+G1luKBusK5IOKAkyB4IGlzIGFzIGNsb3NlIHRvIHplcm8gYXNcbiAgICAgICAgICAgIC8vICAgIHBvc3NpYmxlLiBJZiB0aGVyZSBhcmUgdHdvIHN1Y2ggc2V0cyBvZiBlIGFuZCBuLCBwaWNrIHRoZSBlIGFuZCBuIGZvclxuICAgICAgICAgICAgLy8gICAgd2hpY2ggbiDDlyAxMOG1ieKBu+G1luKBusK5IGlzIGxhcmdlci5cbiAgICAgICAgICAgIGUgPSBsb2cxMEZsb29yKE1hdGguYWJzKHgpKTtcblxuICAgICAgICAgICAgLy8gRWFzaWVyIHRvIGdldCB0byBtIGZyb20gaGVyZVxuICAgICAgICAgICAgdmFyIGYgPSBNYXRoLnJvdW5kKE1hdGguZXhwKE1hdGguYWJzKGUgLSBwICsgMSkgKiBNYXRoLkxOMTApKTtcblxuICAgICAgICAgICAgLy8gYi4gTGV0IG0gYmUgdGhlIFN0cmluZyBjb25zaXN0aW5nIG9mIHRoZSBkaWdpdHMgb2YgdGhlIGRlY2ltYWxcbiAgICAgICAgICAgIC8vICAgIHJlcHJlc2VudGF0aW9uIG9mIG4gKGluIG9yZGVyLCB3aXRoIG5vIGxlYWRpbmcgemVyb2VzKVxuICAgICAgICAgICAgbSA9IFN0cmluZyhNYXRoLnJvdW5kKGUgLSBwICsgMSA8IDAgPyB4ICogZiA6IHggLyBmKSk7XG4gICAgICAgIH1cblxuICAgIC8vIDQuIElmIGUg4omlIHAsIHRoZW5cbiAgICBpZiAoZSA+PSBwKVxuICAgICAgICAvLyBhLiBSZXR1cm4gdGhlIGNvbmNhdGVuYXRpb24gb2YgbSBhbmQgZS1wKzEgb2NjdXJyZW5jZXMgb2YgdGhlIGNoYXJhY3RlciBcIjBcIi5cbiAgICAgICAgcmV0dXJuIG0gKyBhcnJKb2luLmNhbGwoQXJyYXkoZSAtIHAgKyAxICsgMSksICcwJyk7XG5cbiAgICAgICAgLy8gNS4gSWYgZSA9IHAtMSwgdGhlblxuICAgIGVsc2UgaWYgKGUgPT09IHAgLSAxKVxuICAgICAgICAgICAgLy8gYS4gUmV0dXJuIG0uXG4gICAgICAgICAgICByZXR1cm4gbTtcblxuICAgICAgICAgICAgLy8gNi4gSWYgZSDiiaUgMCwgdGhlblxuICAgICAgICBlbHNlIGlmIChlID49IDApXG4gICAgICAgICAgICAgICAgLy8gYS4gTGV0IG0gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgdGhlIGZpcnN0IGUrMSBjaGFyYWN0ZXJzIG9mIG0sIHRoZSBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICAvLyAgICBcIi5cIiwgYW5kIHRoZSByZW1haW5pbmcgcOKAkyhlKzEpIGNoYXJhY3RlcnMgb2YgbS5cbiAgICAgICAgICAgICAgICBtID0gbS5zbGljZSgwLCBlICsgMSkgKyAnLicgKyBtLnNsaWNlKGUgKyAxKTtcblxuICAgICAgICAgICAgICAgIC8vIDcuIElmIGUgPCAwLCB0aGVuXG4gICAgICAgICAgICBlbHNlIGlmIChlIDwgMClcbiAgICAgICAgICAgICAgICAgICAgLy8gYS4gTGV0IG0gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgdGhlIFN0cmluZyBcIjAuXCIsIOKAkyhlKzEpIG9jY3VycmVuY2VzIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyAgICBjaGFyYWN0ZXIgXCIwXCIsIGFuZCB0aGUgc3RyaW5nIG0uXG4gICAgICAgICAgICAgICAgICAgIG0gPSAnMC4nICsgYXJySm9pbi5jYWxsKEFycmF5KC0oZSArIDEpICsgMSksICcwJykgKyBtO1xuXG4gICAgLy8gOC4gSWYgbSBjb250YWlucyB0aGUgY2hhcmFjdGVyIFwiLlwiLCBhbmQgbWF4UHJlY2lzaW9uID4gbWluUHJlY2lzaW9uLCB0aGVuXG4gICAgaWYgKG0uaW5kZXhPZihcIi5cIikgPj0gMCAmJiBtYXhQcmVjaXNpb24gPiBtaW5QcmVjaXNpb24pIHtcbiAgICAgICAgLy8gYS4gTGV0IGN1dCBiZSBtYXhQcmVjaXNpb24g4oCTIG1pblByZWNpc2lvbi5cbiAgICAgICAgdmFyIGN1dCA9IG1heFByZWNpc2lvbiAtIG1pblByZWNpc2lvbjtcblxuICAgICAgICAvLyBiLiBSZXBlYXQgd2hpbGUgY3V0ID4gMCBhbmQgdGhlIGxhc3QgY2hhcmFjdGVyIG9mIG0gaXMgXCIwXCI6XG4gICAgICAgIHdoaWxlIChjdXQgPiAwICYmIG0uY2hhckF0KG0ubGVuZ3RoIC0gMSkgPT09ICcwJykge1xuICAgICAgICAgICAgLy8gIGkuIFJlbW92ZSB0aGUgbGFzdCBjaGFyYWN0ZXIgZnJvbSBtLlxuICAgICAgICAgICAgbSA9IG0uc2xpY2UoMCwgLTEpO1xuXG4gICAgICAgICAgICAvLyAgaWkuIERlY3JlYXNlIGN1dCBieSAxLlxuICAgICAgICAgICAgY3V0LS07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjLiBJZiB0aGUgbGFzdCBjaGFyYWN0ZXIgb2YgbSBpcyBcIi5cIiwgdGhlblxuICAgICAgICBpZiAobS5jaGFyQXQobS5sZW5ndGggLSAxKSA9PT0gJy4nKVxuICAgICAgICAgICAgLy8gICAgaS4gUmVtb3ZlIHRoZSBsYXN0IGNoYXJhY3RlciBmcm9tIG0uXG4gICAgICAgICAgICBtID0gbS5zbGljZSgwLCAtMSk7XG4gICAgfVxuICAgIC8vIDkuIFJldHVybiBtLlxuICAgIHJldHVybiBtO1xufVxuXG4vKipcbiAqIEBzcGVjW3RjMzkvZWNtYTQwMi9tYXN0ZXIvc3BlYy9udW1iZXJmb3JtYXQuaHRtbF1cbiAqIEBjbGF1c2Vbc2VjLXRvcmF3Zml4ZWRdXG4gKiBXaGVuIHRoZSBUb1Jhd0ZpeGVkIGFic3RyYWN0IG9wZXJhdGlvbiBpcyBjYWxsZWQgd2l0aCBhcmd1bWVudHMgeCAod2hpY2ggbXVzdFxuICogYmUgYSBmaW5pdGUgbm9uLW5lZ2F0aXZlIG51bWJlciksIG1pbkludGVnZXIgKHdoaWNoIG11c3QgYmUgYW4gaW50ZWdlciBiZXR3ZWVuXG4gKiAxIGFuZCAyMSksIG1pbkZyYWN0aW9uLCBhbmQgbWF4RnJhY3Rpb24gKHdoaWNoIG11c3QgYmUgaW50ZWdlcnMgYmV0d2VlbiAwIGFuZFxuICogMjApIHRoZSBmb2xsb3dpbmcgc3RlcHMgYXJlIHRha2VuOlxuICovXG5mdW5jdGlvbiBUb1Jhd0ZpeGVkKHgsIG1pbkludGVnZXIsIG1pbkZyYWN0aW9uLCBtYXhGcmFjdGlvbikge1xuICAgIC8vIDEuIExldCBmIGJlIG1heEZyYWN0aW9uLlxuICAgIHZhciBmID0gbWF4RnJhY3Rpb247XG4gICAgLy8gMi4gTGV0IG4gYmUgYW4gaW50ZWdlciBmb3Igd2hpY2ggdGhlIGV4YWN0IG1hdGhlbWF0aWNhbCB2YWx1ZSBvZiBuIMO3IDEwZiDigJMgeCBpcyBhcyBjbG9zZSB0byB6ZXJvIGFzIHBvc3NpYmxlLiBJZiB0aGVyZSBhcmUgdHdvIHN1Y2ggbiwgcGljayB0aGUgbGFyZ2VyIG4uXG4gICAgdmFyIG4gPSBNYXRoLnBvdygxMCwgZikgKiB4OyAvLyBkaXZlcmdpbmcuLi5cbiAgICAvLyAzLiBJZiBuID0gMCwgbGV0IG0gYmUgdGhlIFN0cmluZyBcIjBcIi4gT3RoZXJ3aXNlLCBsZXQgbSBiZSB0aGUgU3RyaW5nIGNvbnNpc3Rpbmcgb2YgdGhlIGRpZ2l0cyBvZiB0aGUgZGVjaW1hbCByZXByZXNlbnRhdGlvbiBvZiBuIChpbiBvcmRlciwgd2l0aCBubyBsZWFkaW5nIHplcm9lcykuXG4gICAgdmFyIG0gPSBuID09PSAwID8gXCIwXCIgOiBuLnRvRml4ZWQoMCk7IC8vIGRpdmVyaW5nLi4uXG5cbiAgICB7XG4gICAgICAgIC8vIHRoaXMgZGl2ZXJzaW9uIGlzIG5lZWRlZCB0byB0YWtlIGludG8gY29uc2lkZXJhdGlvbiBiaWcgbnVtYmVycywgZS5nLjpcbiAgICAgICAgLy8gMS4yMzQ0NTAxZSszNyAtPiAxMjM0NDUwMTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMFxuICAgICAgICB2YXIgaWR4ID0gdm9pZCAwO1xuICAgICAgICB2YXIgZXhwID0gKGlkeCA9IG0uaW5kZXhPZignZScpKSA+IC0xID8gbS5zbGljZShpZHggKyAxKSA6IDA7XG4gICAgICAgIGlmIChleHApIHtcbiAgICAgICAgICAgIG0gPSBtLnNsaWNlKDAsIGlkeCkucmVwbGFjZSgnLicsICcnKTtcbiAgICAgICAgICAgIG0gKz0gYXJySm9pbi5jYWxsKEFycmF5KGV4cCAtIChtLmxlbmd0aCAtIDEpICsgMSksICcwJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW50ID0gdm9pZCAwO1xuICAgIC8vIDQuIElmIGYg4omgIDAsIHRoZW5cbiAgICBpZiAoZiAhPT0gMCkge1xuICAgICAgICAvLyBhLiBMZXQgayBiZSB0aGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgaW4gbS5cbiAgICAgICAgdmFyIGsgPSBtLmxlbmd0aDtcbiAgICAgICAgLy8gYS4gSWYgayDiiaQgZiwgdGhlblxuICAgICAgICBpZiAoayA8PSBmKSB7XG4gICAgICAgICAgICAvLyBpLiBMZXQgeiBiZSB0aGUgU3RyaW5nIGNvbnNpc3Rpbmcgb2YgZisx4oCTayBvY2N1cnJlbmNlcyBvZiB0aGUgY2hhcmFjdGVyIFwiMFwiLlxuICAgICAgICAgICAgdmFyIHogPSBhcnJKb2luLmNhbGwoQXJyYXkoZiArIDEgLSBrICsgMSksICcwJyk7XG4gICAgICAgICAgICAvLyBpaS4gTGV0IG0gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgU3RyaW5ncyB6IGFuZCBtLlxuICAgICAgICAgICAgbSA9IHogKyBtO1xuICAgICAgICAgICAgLy8gaWlpLiBMZXQgayBiZSBmKzEuXG4gICAgICAgICAgICBrID0gZiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYS4gTGV0IGEgYmUgdGhlIGZpcnN0IGvigJNmIGNoYXJhY3RlcnMgb2YgbSwgYW5kIGxldCBiIGJlIHRoZSByZW1haW5pbmcgZiBjaGFyYWN0ZXJzIG9mIG0uXG4gICAgICAgIHZhciBhID0gbS5zdWJzdHJpbmcoMCwgayAtIGYpLFxuICAgICAgICAgICAgYiA9IG0uc3Vic3RyaW5nKGsgLSBmLCBtLmxlbmd0aCk7XG4gICAgICAgIC8vIGEuIExldCBtIGJlIHRoZSBjb25jYXRlbmF0aW9uIG9mIHRoZSB0aHJlZSBTdHJpbmdzIGEsIFwiLlwiLCBhbmQgYi5cbiAgICAgICAgbSA9IGEgKyBcIi5cIiArIGI7XG4gICAgICAgIC8vIGEuIExldCBpbnQgYmUgdGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIGluIGEuXG4gICAgICAgIGludCA9IGEubGVuZ3RoO1xuICAgIH1cbiAgICAvLyA1LiBFbHNlLCBsZXQgaW50IGJlIHRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBpbiBtLlxuICAgIGVsc2UgaW50ID0gbS5sZW5ndGg7XG4gICAgLy8gNi4gTGV0IGN1dCBiZSBtYXhGcmFjdGlvbiDigJMgbWluRnJhY3Rpb24uXG4gICAgdmFyIGN1dCA9IG1heEZyYWN0aW9uIC0gbWluRnJhY3Rpb247XG4gICAgLy8gNy4gUmVwZWF0IHdoaWxlIGN1dCA+IDAgYW5kIHRoZSBsYXN0IGNoYXJhY3RlciBvZiBtIGlzIFwiMFwiOlxuICAgIHdoaWxlIChjdXQgPiAwICYmIG0uc2xpY2UoLTEpID09PSBcIjBcIikge1xuICAgICAgICAvLyBhLiBSZW1vdmUgdGhlIGxhc3QgY2hhcmFjdGVyIGZyb20gbS5cbiAgICAgICAgbSA9IG0uc2xpY2UoMCwgLTEpO1xuICAgICAgICAvLyBhLiBEZWNyZWFzZSBjdXQgYnkgMS5cbiAgICAgICAgY3V0LS07XG4gICAgfVxuICAgIC8vIDguIElmIHRoZSBsYXN0IGNoYXJhY3RlciBvZiBtIGlzIFwiLlwiLCB0aGVuXG4gICAgaWYgKG0uc2xpY2UoLTEpID09PSBcIi5cIikge1xuICAgICAgICAvLyBhLiBSZW1vdmUgdGhlIGxhc3QgY2hhcmFjdGVyIGZyb20gbS5cbiAgICAgICAgbSA9IG0uc2xpY2UoMCwgLTEpO1xuICAgIH1cbiAgICAvLyA5LiBJZiBpbnQgPCBtaW5JbnRlZ2VyLCB0aGVuXG4gICAgaWYgKGludCA8IG1pbkludGVnZXIpIHtcbiAgICAgICAgLy8gYS4gTGV0IHogYmUgdGhlIFN0cmluZyBjb25zaXN0aW5nIG9mIG1pbkludGVnZXLigJNpbnQgb2NjdXJyZW5jZXMgb2YgdGhlIGNoYXJhY3RlciBcIjBcIi5cbiAgICAgICAgdmFyIF96ID0gYXJySm9pbi5jYWxsKEFycmF5KG1pbkludGVnZXIgLSBpbnQgKyAxKSwgJzAnKTtcbiAgICAgICAgLy8gYS4gTGV0IG0gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgU3RyaW5ncyB6IGFuZCBtLlxuICAgICAgICBtID0gX3ogKyBtO1xuICAgIH1cbiAgICAvLyAxMC4gUmV0dXJuIG0uXG4gICAgcmV0dXJuIG07XG59XG5cbi8vIFNlY3QgMTEuMy4yIFRhYmxlIDIsIE51bWJlcmluZyBzeXN0ZW1zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxudmFyIG51bVN5cyA9IHtcbiAgICBhcmFiOiBbXCLZoFwiLCBcItmhXCIsIFwi2aJcIiwgXCLZo1wiLCBcItmkXCIsIFwi2aVcIiwgXCLZplwiLCBcItmnXCIsIFwi2ahcIiwgXCLZqVwiXSxcbiAgICBhcmFiZXh0OiBbXCLbsFwiLCBcItuxXCIsIFwi27JcIiwgXCLbs1wiLCBcItu0XCIsIFwi27VcIiwgXCLbtlwiLCBcItu3XCIsIFwi27hcIiwgXCLbuVwiXSxcbiAgICBiYWxpOiBbXCLhrZBcIiwgXCLhrZFcIiwgXCLhrZJcIiwgXCLhrZNcIiwgXCLhrZRcIiwgXCLhrZVcIiwgXCLhrZZcIiwgXCLhrZdcIiwgXCLhrZhcIiwgXCLhrZlcIl0sXG4gICAgYmVuZzogW1wi4KemXCIsIFwi4KenXCIsIFwi4KeoXCIsIFwi4KepXCIsIFwi4KeqXCIsIFwi4KerXCIsIFwi4KesXCIsIFwi4KetXCIsIFwi4KeuXCIsIFwi4KevXCJdLFxuICAgIGRldmE6IFtcIuClplwiLCBcIuClp1wiLCBcIuClqFwiLCBcIuClqVwiLCBcIuClqlwiLCBcIuClq1wiLCBcIuClrFwiLCBcIuClrVwiLCBcIuClrlwiLCBcIuClr1wiXSxcbiAgICBmdWxsd2lkZTogW1wi77yQXCIsIFwi77yRXCIsIFwi77ySXCIsIFwi77yTXCIsIFwi77yUXCIsIFwi77yVXCIsIFwi77yWXCIsIFwi77yXXCIsIFwi77yYXCIsIFwi77yZXCJdLFxuICAgIGd1anI6IFtcIuCrplwiLCBcIuCrp1wiLCBcIuCrqFwiLCBcIuCrqVwiLCBcIuCrqlwiLCBcIuCrq1wiLCBcIuCrrFwiLCBcIuCrrVwiLCBcIuCrrlwiLCBcIuCrr1wiXSxcbiAgICBndXJ1OiBbXCLgqaZcIiwgXCLgqadcIiwgXCLgqahcIiwgXCLgqalcIiwgXCLgqapcIiwgXCLgqatcIiwgXCLgqaxcIiwgXCLgqa1cIiwgXCLgqa5cIiwgXCLgqa9cIl0sXG4gICAgaGFuaWRlYzogW1wi44CHXCIsIFwi5LiAXCIsIFwi5LqMXCIsIFwi5LiJXCIsIFwi5ZubXCIsIFwi5LqUXCIsIFwi5YWtXCIsIFwi5LiDXCIsIFwi5YWrXCIsIFwi5LmdXCJdLFxuICAgIGtobXI6IFtcIuGfoFwiLCBcIuGfoVwiLCBcIuGfolwiLCBcIuGfo1wiLCBcIuGfpFwiLCBcIuGfpVwiLCBcIuGfplwiLCBcIuGfp1wiLCBcIuGfqFwiLCBcIuGfqVwiXSxcbiAgICBrbmRhOiBbXCLgs6ZcIiwgXCLgs6dcIiwgXCLgs6hcIiwgXCLgs6lcIiwgXCLgs6pcIiwgXCLgs6tcIiwgXCLgs6xcIiwgXCLgs61cIiwgXCLgs65cIiwgXCLgs69cIl0sXG4gICAgbGFvbzogW1wi4LuQXCIsIFwi4LuRXCIsIFwi4LuSXCIsIFwi4LuTXCIsIFwi4LuUXCIsIFwi4LuVXCIsIFwi4LuWXCIsIFwi4LuXXCIsIFwi4LuYXCIsIFwi4LuZXCJdLFxuICAgIGxhdG46IFtcIjBcIiwgXCIxXCIsIFwiMlwiLCBcIjNcIiwgXCI0XCIsIFwiNVwiLCBcIjZcIiwgXCI3XCIsIFwiOFwiLCBcIjlcIl0sXG4gICAgbGltYjogW1wi4aWGXCIsIFwi4aWHXCIsIFwi4aWIXCIsIFwi4aWJXCIsIFwi4aWKXCIsIFwi4aWLXCIsIFwi4aWMXCIsIFwi4aWNXCIsIFwi4aWOXCIsIFwi4aWPXCJdLFxuICAgIG1seW06IFtcIuC1plwiLCBcIuC1p1wiLCBcIuC1qFwiLCBcIuC1qVwiLCBcIuC1qlwiLCBcIuC1q1wiLCBcIuC1rFwiLCBcIuC1rVwiLCBcIuC1rlwiLCBcIuC1r1wiXSxcbiAgICBtb25nOiBbXCLhoJBcIiwgXCLhoJFcIiwgXCLhoJJcIiwgXCLhoJNcIiwgXCLhoJRcIiwgXCLhoJVcIiwgXCLhoJZcIiwgXCLhoJdcIiwgXCLhoJhcIiwgXCLhoJlcIl0sXG4gICAgbXltcjogW1wi4YGAXCIsIFwi4YGBXCIsIFwi4YGCXCIsIFwi4YGDXCIsIFwi4YGEXCIsIFwi4YGFXCIsIFwi4YGGXCIsIFwi4YGHXCIsIFwi4YGIXCIsIFwi4YGJXCJdLFxuICAgIG9yeWE6IFtcIuCtplwiLCBcIuCtp1wiLCBcIuCtqFwiLCBcIuCtqVwiLCBcIuCtqlwiLCBcIuCtq1wiLCBcIuCtrFwiLCBcIuCtrVwiLCBcIuCtrlwiLCBcIuCtr1wiXSxcbiAgICB0YW1sZGVjOiBbXCLgr6ZcIiwgXCLgr6dcIiwgXCLgr6hcIiwgXCLgr6lcIiwgXCLgr6pcIiwgXCLgr6tcIiwgXCLgr6xcIiwgXCLgr61cIiwgXCLgr65cIiwgXCLgr69cIl0sXG4gICAgdGVsdTogW1wi4LGmXCIsIFwi4LGnXCIsIFwi4LGoXCIsIFwi4LGpXCIsIFwi4LGqXCIsIFwi4LGrXCIsIFwi4LGsXCIsIFwi4LGtXCIsIFwi4LGuXCIsIFwi4LGvXCJdLFxuICAgIHRoYWk6IFtcIuC5kFwiLCBcIuC5kVwiLCBcIuC5klwiLCBcIuC5k1wiLCBcIuC5lFwiLCBcIuC5lVwiLCBcIuC5llwiLCBcIuC5l1wiLCBcIuC5mFwiLCBcIuC5mVwiXSxcbiAgICB0aWJ0OiBbXCLgvKBcIiwgXCLgvKFcIiwgXCLgvKJcIiwgXCLgvKNcIiwgXCLgvKRcIiwgXCLgvKVcIiwgXCLgvKZcIiwgXCLgvKdcIiwgXCLgvKhcIiwgXCLgvKlcIl1cbn07XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBwcm92aWRlcyBhY2Nlc3MgdG8gdGhlIGxvY2FsZSBhbmQgZm9ybWF0dGluZyBvcHRpb25zIGNvbXB1dGVkXG4gKiBkdXJpbmcgaW5pdGlhbGl6YXRpb24gb2YgdGhlIG9iamVjdC5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcmV0dXJucyBhIG5ldyBvYmplY3Qgd2hvc2UgcHJvcGVydGllcyBhbmQgYXR0cmlidXRlcyBhcmUgc2V0IGFzXG4gKiBpZiBjb25zdHJ1Y3RlZCBieSBhbiBvYmplY3QgbGl0ZXJhbCBhc3NpZ25pbmcgdG8gZWFjaCBvZiB0aGUgZm9sbG93aW5nXG4gKiBwcm9wZXJ0aWVzIHRoZSB2YWx1ZSBvZiB0aGUgY29ycmVzcG9uZGluZyBpbnRlcm5hbCBwcm9wZXJ0eSBvZiB0aGlzXG4gKiBOdW1iZXJGb3JtYXQgb2JqZWN0IChzZWUgMTEuNCk6IGxvY2FsZSwgbnVtYmVyaW5nU3lzdGVtLCBzdHlsZSwgY3VycmVuY3ksXG4gKiBjdXJyZW5jeURpc3BsYXksIG1pbmltdW1JbnRlZ2VyRGlnaXRzLCBtaW5pbXVtRnJhY3Rpb25EaWdpdHMsXG4gKiBtYXhpbXVtRnJhY3Rpb25EaWdpdHMsIG1pbmltdW1TaWduaWZpY2FudERpZ2l0cywgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzLCBhbmRcbiAqIHVzZUdyb3VwaW5nLiBQcm9wZXJ0aWVzIHdob3NlIGNvcnJlc3BvbmRpbmcgaW50ZXJuYWwgcHJvcGVydGllcyBhcmUgbm90IHByZXNlbnRcbiAqIGFyZSBub3QgYXNzaWduZWQuXG4gKi9cbi8qIDExLjMuMyAqL2RlZmluZVByb3BlcnR5KEludGwuTnVtYmVyRm9ybWF0LnByb3RvdHlwZSwgJ3Jlc29sdmVkT3B0aW9ucycsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHZhbHVlKCkge1xuICAgICAgICB2YXIgcHJvcCA9IHZvaWQgMCxcbiAgICAgICAgICAgIGRlc2NzID0gbmV3IFJlY29yZCgpLFxuICAgICAgICAgICAgcHJvcHMgPSBbJ2xvY2FsZScsICdudW1iZXJpbmdTeXN0ZW0nLCAnc3R5bGUnLCAnY3VycmVuY3knLCAnY3VycmVuY3lEaXNwbGF5JywgJ21pbmltdW1JbnRlZ2VyRGlnaXRzJywgJ21pbmltdW1GcmFjdGlvbkRpZ2l0cycsICdtYXhpbXVtRnJhY3Rpb25EaWdpdHMnLCAnbWluaW11bVNpZ25pZmljYW50RGlnaXRzJywgJ21heGltdW1TaWduaWZpY2FudERpZ2l0cycsICd1c2VHcm91cGluZyddLFxuICAgICAgICAgICAgaW50ZXJuYWwgPSB0aGlzICE9PSBudWxsICYmIGJhYmVsSGVscGVyc1tcInR5cGVvZlwiXSh0aGlzKSA9PT0gJ29iamVjdCcgJiYgZ2V0SW50ZXJuYWxQcm9wZXJ0aWVzKHRoaXMpO1xuXG4gICAgICAgIC8vIFNhdGlzZnkgdGVzdCAxMS4zX2JcbiAgICAgICAgaWYgKCFpbnRlcm5hbCB8fCAhaW50ZXJuYWxbJ1tbaW5pdGlhbGl6ZWROdW1iZXJGb3JtYXRdXSddKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdGhpc2AgdmFsdWUgZm9yIHJlc29sdmVkT3B0aW9ucygpIGlzIG5vdCBhbiBpbml0aWFsaXplZCBJbnRsLk51bWJlckZvcm1hdCBvYmplY3QuJyk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG1heCA9IHByb3BzLmxlbmd0aDsgaSA8IG1heDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaG9wLmNhbGwoaW50ZXJuYWwsIHByb3AgPSAnW1snICsgcHJvcHNbaV0gKyAnXV0nKSkgZGVzY3NbcHJvcHNbaV1dID0geyB2YWx1ZTogaW50ZXJuYWxbcHJvcF0sIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIGVudW1lcmFibGU6IHRydWUgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvYmpDcmVhdGUoe30sIGRlc2NzKTtcbiAgICB9XG59KTtcblxuLyoganNsaW50IGVzbmV4dDogdHJ1ZSAqL1xuXG4vLyBNYXRjaCB0aGVzZSBkYXRldGltZSBjb21wb25lbnRzIGluIGEgQ0xEUiBwYXR0ZXJuLCBleGNlcHQgdGhvc2UgaW4gc2luZ2xlIHF1b3Rlc1xudmFyIGV4cERUQ29tcG9uZW50cyA9IC8oPzpbRWVjXXsxLDZ9fEd7MSw1fXxbUXFdezEsNX18KD86W3lZdXJdK3xVezEsNX0pfFtNTF17MSw1fXxkezEsMn18RHsxLDN9fEZ7MX18W2FiQl17MSw1fXxbaGtIS117MSwyfXx3ezEsMn18V3sxfXxtezEsMn18c3sxLDJ9fFt6Wk92VnhYXXsxLDR9KSg/PShbXiddKidbXiddKicpKlteJ10qJCkvZztcbi8vIHRyaW0gcGF0dGVybnMgYWZ0ZXIgdHJhbnNmb3JtYXRpb25zXG52YXIgZXhwUGF0dGVyblRyaW1tZXIgPSAvXltcXHNcXHVGRUZGXFx4QTBdK3xbXFxzXFx1RkVGRlxceEEwXSskL2c7XG4vLyBTa2lwIG92ZXIgcGF0dGVybnMgd2l0aCB0aGVzZSBkYXRldGltZSBjb21wb25lbnRzIGJlY2F1c2Ugd2UgZG9uJ3QgaGF2ZSBkYXRhXG4vLyB0byBiYWNrIHRoZW0gdXA6XG4vLyB0aW1lem9uZSwgd2Vla2RheSwgYW1vdW5nIG90aGVyc1xudmFyIHVud2FudGVkRFRDcyA9IC9bcnFRQVNqSmd3V0lRcV0vOyAvLyB4WFZPIHdlcmUgcmVtb3ZlZCBmcm9tIHRoaXMgbGlzdCBpbiBmYXZvciBvZiBjb21wdXRpbmcgbWF0Y2hlcyB3aXRoIHRpbWVab25lTmFtZSB2YWx1ZXMgYnV0IHByaW50aW5nIGFzIGVtcHR5IHN0cmluZ1xuXG52YXIgZHRLZXlzID0gW1wid2Vla2RheVwiLCBcImVyYVwiLCBcInllYXJcIiwgXCJtb250aFwiLCBcImRheVwiLCBcIndlZWtkYXlcIiwgXCJxdWFydGVyXCJdO1xudmFyIHRtS2V5cyA9IFtcImhvdXJcIiwgXCJtaW51dGVcIiwgXCJzZWNvbmRcIiwgXCJob3VyMTJcIiwgXCJ0aW1lWm9uZU5hbWVcIl07XG5cbmZ1bmN0aW9uIGlzRGF0ZUZvcm1hdE9ubHkob2JqKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0bUtleXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eSh0bUtleXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzVGltZUZvcm1hdE9ubHkob2JqKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkdEtleXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShkdEtleXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGpvaW5EYXRlQW5kVGltZUZvcm1hdHMoZGF0ZUZvcm1hdE9iaiwgdGltZUZvcm1hdE9iaikge1xuICAgIHZhciBvID0geyBfOiB7fSB9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZHRLZXlzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmIChkYXRlRm9ybWF0T2JqW2R0S2V5c1tpXV0pIHtcbiAgICAgICAgICAgIG9bZHRLZXlzW2ldXSA9IGRhdGVGb3JtYXRPYmpbZHRLZXlzW2ldXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZUZvcm1hdE9iai5fW2R0S2V5c1tpXV0pIHtcbiAgICAgICAgICAgIG8uX1tkdEtleXNbaV1dID0gZGF0ZUZvcm1hdE9iai5fW2R0S2V5c1tpXV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0bUtleXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgaWYgKHRpbWVGb3JtYXRPYmpbdG1LZXlzW2pdXSkge1xuICAgICAgICAgICAgb1t0bUtleXNbal1dID0gdGltZUZvcm1hdE9ialt0bUtleXNbal1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aW1lRm9ybWF0T2JqLl9bdG1LZXlzW2pdXSkge1xuICAgICAgICAgICAgby5fW3RtS2V5c1tqXV0gPSB0aW1lRm9ybWF0T2JqLl9bdG1LZXlzW2pdXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbztcbn1cblxuZnVuY3Rpb24gY29tcHV0ZUZpbmFsUGF0dGVybnMoZm9ybWF0T2JqKSB7XG4gICAgLy8gRnJvbSBodHRwOi8vd3d3LnVuaWNvZGUub3JnL3JlcG9ydHMvdHIzNS90cjM1LWRhdGVzLmh0bWwjRGF0ZV9Gb3JtYXRfUGF0dGVybnM6XG4gICAgLy8gICdJbiBwYXR0ZXJucywgdHdvIHNpbmdsZSBxdW90ZXMgcmVwcmVzZW50cyBhIGxpdGVyYWwgc2luZ2xlIHF1b3RlLCBlaXRoZXJcbiAgICAvLyAgIGluc2lkZSBvciBvdXRzaWRlIHNpbmdsZSBxdW90ZXMuIFRleHQgd2l0aGluIHNpbmdsZSBxdW90ZXMgaXMgbm90XG4gICAgLy8gICBpbnRlcnByZXRlZCBpbiBhbnkgd2F5IChleGNlcHQgZm9yIHR3byBhZGphY2VudCBzaW5nbGUgcXVvdGVzKS4nXG4gICAgZm9ybWF0T2JqLnBhdHRlcm4xMiA9IGZvcm1hdE9iai5leHRlbmRlZFBhdHRlcm4ucmVwbGFjZSgvJyhbXiddKiknL2csIGZ1bmN0aW9uICgkMCwgbGl0ZXJhbCkge1xuICAgICAgICByZXR1cm4gbGl0ZXJhbCA/IGxpdGVyYWwgOiBcIidcIjtcbiAgICB9KTtcblxuICAgIC8vIHBhdHRlcm4gMTIgaXMgYWx3YXlzIHRoZSBkZWZhdWx0LiB3ZSBjYW4gcHJvZHVjZSB0aGUgMjQgYnkgcmVtb3Zpbmcge2FtcG19XG4gICAgZm9ybWF0T2JqLnBhdHRlcm4gPSBmb3JtYXRPYmoucGF0dGVybjEyLnJlcGxhY2UoJ3thbXBtfScsICcnKS5yZXBsYWNlKGV4cFBhdHRlcm5UcmltbWVyLCAnJyk7XG4gICAgcmV0dXJuIGZvcm1hdE9iajtcbn1cblxuZnVuY3Rpb24gZXhwRFRDb21wb25lbnRzTWV0YSgkMCwgZm9ybWF0T2JqKSB7XG4gICAgc3dpdGNoICgkMC5jaGFyQXQoMCkpIHtcbiAgICAgICAgLy8gLS0tIEVyYVxuICAgICAgICBjYXNlICdHJzpcbiAgICAgICAgICAgIGZvcm1hdE9iai5lcmEgPSBbJ3Nob3J0JywgJ3Nob3J0JywgJ3Nob3J0JywgJ2xvbmcnLCAnbmFycm93J11bJDAubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gJ3tlcmF9JztcblxuICAgICAgICAvLyAtLS0gWWVhclxuICAgICAgICBjYXNlICd5JzpcbiAgICAgICAgY2FzZSAnWSc6XG4gICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICBjYXNlICdVJzpcbiAgICAgICAgY2FzZSAncic6XG4gICAgICAgICAgICBmb3JtYXRPYmoueWVhciA9ICQwLmxlbmd0aCA9PT0gMiA/ICcyLWRpZ2l0JyA6ICdudW1lcmljJztcbiAgICAgICAgICAgIHJldHVybiAne3llYXJ9JztcblxuICAgICAgICAvLyAtLS0gUXVhcnRlciAobm90IHN1cHBvcnRlZCBpbiB0aGlzIHBvbHlmaWxsKVxuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgY2FzZSAncSc6XG4gICAgICAgICAgICBmb3JtYXRPYmoucXVhcnRlciA9IFsnbnVtZXJpYycsICcyLWRpZ2l0JywgJ3Nob3J0JywgJ2xvbmcnLCAnbmFycm93J11bJDAubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gJ3txdWFydGVyfSc7XG5cbiAgICAgICAgLy8gLS0tIE1vbnRoXG4gICAgICAgIGNhc2UgJ00nOlxuICAgICAgICBjYXNlICdMJzpcbiAgICAgICAgICAgIGZvcm1hdE9iai5tb250aCA9IFsnbnVtZXJpYycsICcyLWRpZ2l0JywgJ3Nob3J0JywgJ2xvbmcnLCAnbmFycm93J11bJDAubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gJ3ttb250aH0nO1xuXG4gICAgICAgIC8vIC0tLSBXZWVrIChub3Qgc3VwcG9ydGVkIGluIHRoaXMgcG9seWZpbGwpXG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgLy8gd2VlayBvZiB0aGUgeWVhclxuICAgICAgICAgICAgZm9ybWF0T2JqLndlZWsgPSAkMC5sZW5ndGggPT09IDIgPyAnMi1kaWdpdCcgOiAnbnVtZXJpYyc7XG4gICAgICAgICAgICByZXR1cm4gJ3t3ZWVrZGF5fSc7XG4gICAgICAgIGNhc2UgJ1cnOlxuICAgICAgICAgICAgLy8gd2VlayBvZiB0aGUgbW9udGhcbiAgICAgICAgICAgIGZvcm1hdE9iai53ZWVrID0gJ251bWVyaWMnO1xuICAgICAgICAgICAgcmV0dXJuICd7d2Vla2RheX0nO1xuXG4gICAgICAgIC8vIC0tLSBEYXlcbiAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgICAgICAvLyBkYXkgb2YgdGhlIG1vbnRoXG4gICAgICAgICAgICBmb3JtYXRPYmouZGF5ID0gJDAubGVuZ3RoID09PSAyID8gJzItZGlnaXQnIDogJ251bWVyaWMnO1xuICAgICAgICAgICAgcmV0dXJuICd7ZGF5fSc7XG4gICAgICAgIGNhc2UgJ0QnOiAvLyBkYXkgb2YgdGhlIHllYXJcbiAgICAgICAgY2FzZSAnRic6IC8vIGRheSBvZiB0aGUgd2Vla1xuICAgICAgICBjYXNlICdnJzpcbiAgICAgICAgICAgIC8vIDEuLm46IE1vZGlmaWVkIEp1bGlhbiBkYXlcbiAgICAgICAgICAgIGZvcm1hdE9iai5kYXkgPSAnbnVtZXJpYyc7XG4gICAgICAgICAgICByZXR1cm4gJ3tkYXl9JztcblxuICAgICAgICAvLyAtLS0gV2VlayBEYXlcbiAgICAgICAgY2FzZSAnRSc6XG4gICAgICAgICAgICAvLyBkYXkgb2YgdGhlIHdlZWtcbiAgICAgICAgICAgIGZvcm1hdE9iai53ZWVrZGF5ID0gWydzaG9ydCcsICdzaG9ydCcsICdzaG9ydCcsICdsb25nJywgJ25hcnJvdycsICdzaG9ydCddWyQwLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcmV0dXJuICd7d2Vla2RheX0nO1xuICAgICAgICBjYXNlICdlJzpcbiAgICAgICAgICAgIC8vIGxvY2FsIGRheSBvZiB0aGUgd2Vla1xuICAgICAgICAgICAgZm9ybWF0T2JqLndlZWtkYXkgPSBbJ251bWVyaWMnLCAnMi1kaWdpdCcsICdzaG9ydCcsICdsb25nJywgJ25hcnJvdycsICdzaG9ydCddWyQwLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcmV0dXJuICd7d2Vla2RheX0nO1xuICAgICAgICBjYXNlICdjJzpcbiAgICAgICAgICAgIC8vIHN0YW5kIGFsb25lIGxvY2FsIGRheSBvZiB0aGUgd2Vla1xuICAgICAgICAgICAgZm9ybWF0T2JqLndlZWtkYXkgPSBbJ251bWVyaWMnLCB1bmRlZmluZWQsICdzaG9ydCcsICdsb25nJywgJ25hcnJvdycsICdzaG9ydCddWyQwLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcmV0dXJuICd7d2Vla2RheX0nO1xuXG4gICAgICAgIC8vIC0tLSBQZXJpb2RcbiAgICAgICAgY2FzZSAnYSc6IC8vIEFNLCBQTVxuICAgICAgICBjYXNlICdiJzogLy8gYW0sIHBtLCBub29uLCBtaWRuaWdodFxuICAgICAgICBjYXNlICdCJzpcbiAgICAgICAgICAgIC8vIGZsZXhpYmxlIGRheSBwZXJpb2RzXG4gICAgICAgICAgICBmb3JtYXRPYmouaG91cjEyID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiAne2FtcG19JztcblxuICAgICAgICAvLyAtLS0gSG91clxuICAgICAgICBjYXNlICdoJzpcbiAgICAgICAgY2FzZSAnSCc6XG4gICAgICAgICAgICBmb3JtYXRPYmouaG91ciA9ICQwLmxlbmd0aCA9PT0gMiA/ICcyLWRpZ2l0JyA6ICdudW1lcmljJztcbiAgICAgICAgICAgIHJldHVybiAne2hvdXJ9JztcbiAgICAgICAgY2FzZSAnayc6XG4gICAgICAgIGNhc2UgJ0snOlxuICAgICAgICAgICAgZm9ybWF0T2JqLmhvdXIxMiA9IHRydWU7IC8vIDEyLWhvdXItY3ljbGUgdGltZSBmb3JtYXRzICh1c2luZyBoIG9yIEspXG4gICAgICAgICAgICBmb3JtYXRPYmouaG91ciA9ICQwLmxlbmd0aCA9PT0gMiA/ICcyLWRpZ2l0JyA6ICdudW1lcmljJztcbiAgICAgICAgICAgIHJldHVybiAne2hvdXJ9JztcblxuICAgICAgICAvLyAtLS0gTWludXRlXG4gICAgICAgIGNhc2UgJ20nOlxuICAgICAgICAgICAgZm9ybWF0T2JqLm1pbnV0ZSA9ICQwLmxlbmd0aCA9PT0gMiA/ICcyLWRpZ2l0JyA6ICdudW1lcmljJztcbiAgICAgICAgICAgIHJldHVybiAne21pbnV0ZX0nO1xuXG4gICAgICAgIC8vIC0tLSBTZWNvbmRcbiAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICBmb3JtYXRPYmouc2Vjb25kID0gJDAubGVuZ3RoID09PSAyID8gJzItZGlnaXQnIDogJ251bWVyaWMnO1xuICAgICAgICAgICAgcmV0dXJuICd7c2Vjb25kfSc7XG4gICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICBjYXNlICdBJzpcbiAgICAgICAgICAgIGZvcm1hdE9iai5zZWNvbmQgPSAnbnVtZXJpYyc7XG4gICAgICAgICAgICByZXR1cm4gJ3tzZWNvbmR9JztcblxuICAgICAgICAvLyAtLS0gVGltZXpvbmVcbiAgICAgICAgY2FzZSAneic6IC8vIDEuLjMsIDQ6IHNwZWNpZmljIG5vbi1sb2NhdGlvbiBmb3JtYXRcbiAgICAgICAgY2FzZSAnWic6IC8vIDEuLjMsIDQsIDU6IFRoZSBJU084NjAxIHZhcmlvcyBmb3JtYXRzXG4gICAgICAgIGNhc2UgJ08nOiAvLyAxLCA0OiBtaWxpc2Vjb25kcyBpbiBkYXkgc2hvcnQsIGxvbmdcbiAgICAgICAgY2FzZSAndic6IC8vIDEsIDQ6IGdlbmVyaWMgbm9uLWxvY2F0aW9uIGZvcm1hdFxuICAgICAgICBjYXNlICdWJzogLy8gMSwgMiwgMywgNDogdGltZSB6b25lIElEIG9yIGNpdHlcbiAgICAgICAgY2FzZSAnWCc6IC8vIDEsIDIsIDMsIDQ6IFRoZSBJU084NjAxIHZhcmlvcyBmb3JtYXRzXG4gICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgLy8gMSwgMiwgMywgNDogVGhlIElTTzg2MDEgdmFyaW9zIGZvcm1hdHNcbiAgICAgICAgICAgIC8vIHRoaXMgcG9seWZpbGwgb25seSBzdXBwb3J0cyBtdWNoLCBmb3Igbm93LCB3ZSBhcmUganVzdCBkb2luZyBzb21ldGhpbmcgZHVtbXlcbiAgICAgICAgICAgIGZvcm1hdE9iai50aW1lWm9uZU5hbWUgPSAkMC5sZW5ndGggPCA0ID8gJ3Nob3J0JyA6ICdsb25nJztcbiAgICAgICAgICAgIHJldHVybiAne3RpbWVab25lTmFtZX0nO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGUgQ0xEUiBhdmFpbGFibGVGb3JtYXRzIGludG8gdGhlIG9iamVjdHMgYW5kIHBhdHRlcm5zIHJlcXVpcmVkIGJ5XG4gKiB0aGUgRUNNQVNjcmlwdCBJbnRlcm5hdGlvbmFsaXphdGlvbiBBUEkgc3BlY2lmaWNhdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGF0ZVRpbWVGb3JtYXQoc2tlbGV0b24sIHBhdHRlcm4pIHtcbiAgICAvLyB3ZSBpZ25vcmUgY2VydGFpbiBwYXR0ZXJucyB0aGF0IGFyZSB1bnN1cHBvcnRlZCB0byBhdm9pZCB0aGlzIGV4cGVuc2l2ZSBvcC5cbiAgICBpZiAodW53YW50ZWREVENzLnRlc3QocGF0dGVybikpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICB2YXIgZm9ybWF0T2JqID0ge1xuICAgICAgICBvcmlnaW5hbFBhdHRlcm46IHBhdHRlcm4sXG4gICAgICAgIF86IHt9XG4gICAgfTtcblxuICAgIC8vIFJlcGxhY2UgdGhlIHBhdHRlcm4gc3RyaW5nIHdpdGggdGhlIG9uZSByZXF1aXJlZCBieSB0aGUgc3BlY2lmaWNhdGlvbiwgd2hpbHN0XG4gICAgLy8gYXQgdGhlIHNhbWUgdGltZSBldmFsdWF0aW5nIGl0IGZvciB0aGUgc3Vic2V0cyBhbmQgZm9ybWF0c1xuICAgIGZvcm1hdE9iai5leHRlbmRlZFBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UoZXhwRFRDb21wb25lbnRzLCBmdW5jdGlvbiAoJDApIHtcbiAgICAgICAgLy8gU2VlIHdoaWNoIHN5bWJvbCB3ZSdyZSBkZWFsaW5nIHdpdGhcbiAgICAgICAgcmV0dXJuIGV4cERUQ29tcG9uZW50c01ldGEoJDAsIGZvcm1hdE9iai5fKTtcbiAgICB9KTtcblxuICAgIC8vIE1hdGNoIHRoZSBza2VsZXRvbiBzdHJpbmcgd2l0aCB0aGUgb25lIHJlcXVpcmVkIGJ5IHRoZSBzcGVjaWZpY2F0aW9uXG4gICAgLy8gdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBiYXNlZCBvbiB0aGUgRGF0ZSBGaWVsZCBTeW1ib2wgVGFibGU6XG4gICAgLy8gaHR0cDovL3VuaWNvZGUub3JnL3JlcG9ydHMvdHIzNS90cjM1LWRhdGVzLmh0bWwjRGF0ZV9GaWVsZF9TeW1ib2xfVGFibGVcbiAgICAvLyBOb3RlOiB3ZSBhcmUgYWRkaW5nIGV4dHJhIGRhdGEgdG8gdGhlIGZvcm1hdE9iamVjdCBldmVuIHRob3VnaCB0aGlzIHBvbHlmaWxsXG4gICAgLy8gICAgICAgbWlnaHQgbm90IHN1cHBvcnQgaXQuXG4gICAgc2tlbGV0b24ucmVwbGFjZShleHBEVENvbXBvbmVudHMsIGZ1bmN0aW9uICgkMCkge1xuICAgICAgICAvLyBTZWUgd2hpY2ggc3ltYm9sIHdlJ3JlIGRlYWxpbmcgd2l0aFxuICAgICAgICByZXR1cm4gZXhwRFRDb21wb25lbnRzTWV0YSgkMCwgZm9ybWF0T2JqKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb21wdXRlRmluYWxQYXR0ZXJucyhmb3JtYXRPYmopO1xufVxuXG4vKipcbiAqIFByb2Nlc3NlcyBEYXRlVGltZSBmb3JtYXRzIGZyb20gQ0xEUiB0byBhbiBlYXNpZXItdG8tcGFyc2UgZm9ybWF0LlxuICogdGhlIHJlc3VsdCBvZiB0aGlzIG9wZXJhdGlvbiBzaG91bGQgYmUgY2FjaGVkIHRoZSBmaXJzdCB0aW1lIGEgcGFydGljdWxhclxuICogY2FsZW5kYXIgaXMgYW5hbHl6ZWQuXG4gKlxuICogVGhlIHNwZWNpZmljYXRpb24gcmVxdWlyZXMgd2Ugc3VwcG9ydCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nIHN1YnNldHMgb2ZcbiAqIGRhdGUvdGltZSBjb21wb25lbnRzOlxuICpcbiAqICAgLSAnd2Vla2RheScsICd5ZWFyJywgJ21vbnRoJywgJ2RheScsICdob3VyJywgJ21pbnV0ZScsICdzZWNvbmQnXG4gKiAgIC0gJ3dlZWtkYXknLCAneWVhcicsICdtb250aCcsICdkYXknXG4gKiAgIC0gJ3llYXInLCAnbW9udGgnLCAnZGF5J1xuICogICAtICd5ZWFyJywgJ21vbnRoJ1xuICogICAtICdtb250aCcsICdkYXknXG4gKiAgIC0gJ2hvdXInLCAnbWludXRlJywgJ3NlY29uZCdcbiAqICAgLSAnaG91cicsICdtaW51dGUnXG4gKlxuICogV2UgbmVlZCB0byBjaGVycnkgcGljayBhdCBsZWFzdCB0aGVzZSBzdWJzZXRzIGZyb20gdGhlIENMRFIgZGF0YSBhbmQgY29udmVydFxuICogdGhlbSBpbnRvIHRoZSBwYXR0ZXJuIG9iamVjdHMgdXNlZCBpbiB0aGUgRUNNQS00MDIgQVBJLlxuICovXG5mdW5jdGlvbiBjcmVhdGVEYXRlVGltZUZvcm1hdHMoZm9ybWF0cykge1xuICAgIHZhciBhdmFpbGFibGVGb3JtYXRzID0gZm9ybWF0cy5hdmFpbGFibGVGb3JtYXRzO1xuICAgIHZhciB0aW1lRm9ybWF0cyA9IGZvcm1hdHMudGltZUZvcm1hdHM7XG4gICAgdmFyIGRhdGVGb3JtYXRzID0gZm9ybWF0cy5kYXRlRm9ybWF0cztcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHNrZWxldG9uID0gdm9pZCAwLFxuICAgICAgICBwYXR0ZXJuID0gdm9pZCAwLFxuICAgICAgICBjb21wdXRlZCA9IHZvaWQgMCxcbiAgICAgICAgaSA9IHZvaWQgMCxcbiAgICAgICAgaiA9IHZvaWQgMDtcbiAgICB2YXIgdGltZVJlbGF0ZWRGb3JtYXRzID0gW107XG4gICAgdmFyIGRhdGVSZWxhdGVkRm9ybWF0cyA9IFtdO1xuXG4gICAgLy8gTWFwIGF2YWlsYWJsZSAoY3VzdG9tKSBmb3JtYXRzIGludG8gYSBwYXR0ZXJuIGZvciBjcmVhdGVEYXRlVGltZUZvcm1hdHNcbiAgICBmb3IgKHNrZWxldG9uIGluIGF2YWlsYWJsZUZvcm1hdHMpIHtcbiAgICAgICAgaWYgKGF2YWlsYWJsZUZvcm1hdHMuaGFzT3duUHJvcGVydHkoc2tlbGV0b24pKSB7XG4gICAgICAgICAgICBwYXR0ZXJuID0gYXZhaWxhYmxlRm9ybWF0c1tza2VsZXRvbl07XG4gICAgICAgICAgICBjb21wdXRlZCA9IGNyZWF0ZURhdGVUaW1lRm9ybWF0KHNrZWxldG9uLCBwYXR0ZXJuKTtcbiAgICAgICAgICAgIGlmIChjb21wdXRlZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGNvbXB1dGVkKTtcbiAgICAgICAgICAgICAgICAvLyBpbiBzb21lIGNhc2VzLCB0aGUgZm9ybWF0IGlzIG9ubHkgZGlzcGxheWluZyBkYXRlIHNwZWNpZmljIHByb3BzXG4gICAgICAgICAgICAgICAgLy8gb3IgdGltZSBzcGVjaWZpYyBwcm9wcywgaW4gd2hpY2ggY2FzZSB3ZSBuZWVkIHRvIGFsc28gcHJvZHVjZSB0aGVcbiAgICAgICAgICAgICAgICAvLyBjb21iaW5lZCBmb3JtYXRzLlxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGVGb3JtYXRPbmx5KGNvbXB1dGVkKSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRlUmVsYXRlZEZvcm1hdHMucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1RpbWVGb3JtYXRPbmx5KGNvbXB1dGVkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lUmVsYXRlZEZvcm1hdHMucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFwIHRpbWUgZm9ybWF0cyBpbnRvIGEgcGF0dGVybiBmb3IgY3JlYXRlRGF0ZVRpbWVGb3JtYXRzXG4gICAgZm9yIChza2VsZXRvbiBpbiB0aW1lRm9ybWF0cykge1xuICAgICAgICBpZiAodGltZUZvcm1hdHMuaGFzT3duUHJvcGVydHkoc2tlbGV0b24pKSB7XG4gICAgICAgICAgICBwYXR0ZXJuID0gdGltZUZvcm1hdHNbc2tlbGV0b25dO1xuICAgICAgICAgICAgY29tcHV0ZWQgPSBjcmVhdGVEYXRlVGltZUZvcm1hdChza2VsZXRvbiwgcGF0dGVybik7XG4gICAgICAgICAgICBpZiAoY29tcHV0ZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgICAgICAgdGltZVJlbGF0ZWRGb3JtYXRzLnB1c2goY29tcHV0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFwIGRhdGUgZm9ybWF0cyBpbnRvIGEgcGF0dGVybiBmb3IgY3JlYXRlRGF0ZVRpbWVGb3JtYXRzXG4gICAgZm9yIChza2VsZXRvbiBpbiBkYXRlRm9ybWF0cykge1xuICAgICAgICBpZiAoZGF0ZUZvcm1hdHMuaGFzT3duUHJvcGVydHkoc2tlbGV0b24pKSB7XG4gICAgICAgICAgICBwYXR0ZXJuID0gZGF0ZUZvcm1hdHNbc2tlbGV0b25dO1xuICAgICAgICAgICAgY29tcHV0ZWQgPSBjcmVhdGVEYXRlVGltZUZvcm1hdChza2VsZXRvbiwgcGF0dGVybik7XG4gICAgICAgICAgICBpZiAoY29tcHV0ZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgICAgICAgZGF0ZVJlbGF0ZWRGb3JtYXRzLnB1c2goY29tcHV0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29tYmluZSBjdXN0b20gdGltZSBhbmQgY3VzdG9tIGRhdGUgZm9ybWF0cyB3aGVuIHRoZXkgYXJlIG9ydGhvZ29uYWxzIHRvIGNvbXBsZXRlIHRoZVxuICAgIC8vIGZvcm1hdHMgc3VwcG9ydGVkIGJ5IENMRFIuXG4gICAgLy8gVGhpcyBBbGdvIGlzIGJhc2VkIG9uIHNlY3Rpb24gXCJNaXNzaW5nIFNrZWxldG9uIEZpZWxkc1wiIGZyb206XG4gICAgLy8gaHR0cDovL3VuaWNvZGUub3JnL3JlcG9ydHMvdHIzNS90cjM1LWRhdGVzLmh0bWwjYXZhaWxhYmxlRm9ybWF0c19hcHBlbmRJdGVtc1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aW1lUmVsYXRlZEZvcm1hdHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGRhdGVSZWxhdGVkRm9ybWF0cy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICAgICAgaWYgKGRhdGVSZWxhdGVkRm9ybWF0c1tqXS5tb250aCA9PT0gJ2xvbmcnKSB7XG4gICAgICAgICAgICAgICAgcGF0dGVybiA9IGRhdGVSZWxhdGVkRm9ybWF0c1tqXS53ZWVrZGF5ID8gZm9ybWF0cy5mdWxsIDogZm9ybWF0cy5sb25nO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRlUmVsYXRlZEZvcm1hdHNbal0ubW9udGggPT09ICdzaG9ydCcpIHtcbiAgICAgICAgICAgICAgICBwYXR0ZXJuID0gZm9ybWF0cy5tZWRpdW07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhdHRlcm4gPSBmb3JtYXRzLnNob3J0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcHV0ZWQgPSBqb2luRGF0ZUFuZFRpbWVGb3JtYXRzKGRhdGVSZWxhdGVkRm9ybWF0c1tqXSwgdGltZVJlbGF0ZWRGb3JtYXRzW2ldKTtcbiAgICAgICAgICAgIGNvbXB1dGVkLm9yaWdpbmFsUGF0dGVybiA9IHBhdHRlcm47XG4gICAgICAgICAgICBjb21wdXRlZC5leHRlbmRlZFBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UoJ3swfScsIHRpbWVSZWxhdGVkRm9ybWF0c1tpXS5leHRlbmRlZFBhdHRlcm4pLnJlcGxhY2UoJ3sxfScsIGRhdGVSZWxhdGVkRm9ybWF0c1tqXS5leHRlbmRlZFBhdHRlcm4pLnJlcGxhY2UoL15bLFxcc10rfFssXFxzXSskL2dpLCAnJyk7XG4gICAgICAgICAgICByZXN1bHQucHVzaChjb21wdXRlRmluYWxQYXR0ZXJucyhjb21wdXRlZCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gQW4gb2JqZWN0IG1hcCBvZiBkYXRlIGNvbXBvbmVudCBrZXlzLCBzYXZlcyB1c2luZyBhIHJlZ2V4IGxhdGVyXG52YXIgZGF0ZVdpZHRocyA9IG9iakNyZWF0ZShudWxsLCB7IG5hcnJvdzoge30sIHNob3J0OiB7fSwgbG9uZzoge30gfSk7XG5cbi8qKlxuICogUmV0dXJucyBhIHN0cmluZyBmb3IgYSBkYXRlIGNvbXBvbmVudCwgcmVzb2x2ZWQgdXNpbmcgbXVsdGlwbGUgaW5oZXJpdGFuY2UgYXMgc3BlY2lmaWVkXG4gKiBhcyBzcGVjaWZpZWQgaW4gdGhlIFVuaWNvZGUgVGVjaG5pY2FsIFN0YW5kYXJkIDM1LlxuICovXG5mdW5jdGlvbiByZXNvbHZlRGF0ZVN0cmluZyhkYXRhLCBjYSwgY29tcG9uZW50LCB3aWR0aCwga2V5KSB7XG4gICAgLy8gRnJvbSBodHRwOi8vd3d3LnVuaWNvZGUub3JnL3JlcG9ydHMvdHIzNS90cjM1Lmh0bWwjTXVsdGlwbGVfSW5oZXJpdGFuY2U6XG4gICAgLy8gJ0luIGNsZWFybHkgc3BlY2lmaWVkIGluc3RhbmNlcywgcmVzb3VyY2VzIG1heSBpbmhlcml0IGZyb20gd2l0aGluIHRoZSBzYW1lIGxvY2FsZS5cbiAgICAvLyAgRm9yIGV4YW1wbGUsIC4uLiB0aGUgQnVkZGhpc3QgY2FsZW5kYXIgaW5oZXJpdHMgZnJvbSB0aGUgR3JlZ29yaWFuIGNhbGVuZGFyLidcbiAgICB2YXIgb2JqID0gZGF0YVtjYV0gJiYgZGF0YVtjYV1bY29tcG9uZW50XSA/IGRhdGFbY2FdW2NvbXBvbmVudF0gOiBkYXRhLmdyZWdvcnlbY29tcG9uZW50XSxcblxuXG4gICAgLy8gXCJzaWRld2F5c1wiIGluaGVyaXRhbmNlIHJlc29sdmVzIHN0cmluZ3Mgd2hlbiBhIGtleSBkb2Vzbid0IGV4aXN0XG4gICAgYWx0cyA9IHtcbiAgICAgICAgbmFycm93OiBbJ3Nob3J0JywgJ2xvbmcnXSxcbiAgICAgICAgc2hvcnQ6IFsnbG9uZycsICduYXJyb3cnXSxcbiAgICAgICAgbG9uZzogWydzaG9ydCcsICduYXJyb3cnXVxuICAgIH0sXG5cblxuICAgIC8vXG4gICAgcmVzb2x2ZWQgPSBob3AuY2FsbChvYmosIHdpZHRoKSA/IG9ialt3aWR0aF0gOiBob3AuY2FsbChvYmosIGFsdHNbd2lkdGhdWzBdKSA/IG9ialthbHRzW3dpZHRoXVswXV0gOiBvYmpbYWx0c1t3aWR0aF1bMV1dO1xuXG4gICAgLy8gYGtleWAgd291bGRuJ3QgYmUgc3BlY2lmaWVkIGZvciBjb21wb25lbnRzICdkYXlQZXJpb2RzJ1xuICAgIHJldHVybiBrZXkgIT09IG51bGwgPyByZXNvbHZlZFtrZXldIDogcmVzb2x2ZWQ7XG59XG5cbi8vIERlZmluZSB0aGUgRGF0ZVRpbWVGb3JtYXQgY29uc3RydWN0b3IgaW50ZXJuYWxseSBzbyBpdCBjYW5ub3QgYmUgdGFpbnRlZFxuZnVuY3Rpb24gRGF0ZVRpbWVGb3JtYXRDb25zdHJ1Y3RvcigpIHtcbiAgICB2YXIgbG9jYWxlcyA9IGFyZ3VtZW50c1swXTtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXTtcblxuICAgIGlmICghdGhpcyB8fCB0aGlzID09PSBJbnRsKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdChsb2NhbGVzLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIEluaXRpYWxpemVEYXRlVGltZUZvcm1hdCh0b09iamVjdCh0aGlzKSwgbG9jYWxlcywgb3B0aW9ucyk7XG59XG5cbmRlZmluZVByb3BlcnR5KEludGwsICdEYXRlVGltZUZvcm1hdCcsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IERhdGVUaW1lRm9ybWF0Q29uc3RydWN0b3Jcbn0pO1xuXG4vLyBNdXN0IGV4cGxpY2l0bHkgc2V0IHByb3RvdHlwZXMgYXMgdW53cml0YWJsZVxuZGVmaW5lUHJvcGVydHkoRGF0ZVRpbWVGb3JtYXRDb25zdHJ1Y3RvciwgJ3Byb3RvdHlwZScsIHtcbiAgICB3cml0YWJsZTogZmFsc2Vcbn0pO1xuXG4vKipcbiAqIFRoZSBhYnN0cmFjdCBvcGVyYXRpb24gSW5pdGlhbGl6ZURhdGVUaW1lRm9ybWF0IGFjY2VwdHMgdGhlIGFyZ3VtZW50cyBkYXRlVGltZUZvcm1hdFxuICogKHdoaWNoIG11c3QgYmUgYW4gb2JqZWN0KSwgbG9jYWxlcywgYW5kIG9wdGlvbnMuIEl0IGluaXRpYWxpemVzIGRhdGVUaW1lRm9ybWF0IGFzIGFcbiAqIERhdGVUaW1lRm9ybWF0IG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gLyogMTIuMS4xLjEgKi9Jbml0aWFsaXplRGF0ZVRpbWVGb3JtYXQoZGF0ZVRpbWVGb3JtYXQsIGxvY2FsZXMsIG9wdGlvbnMpIHtcbiAgICAvLyBUaGlzIHdpbGwgYmUgYSBpbnRlcm5hbCBwcm9wZXJ0aWVzIG9iamVjdCBpZiB3ZSdyZSBub3QgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgIHZhciBpbnRlcm5hbCA9IGdldEludGVybmFsUHJvcGVydGllcyhkYXRlVGltZUZvcm1hdCk7XG5cbiAgICAvLyBDcmVhdGUgYW4gb2JqZWN0IHdob3NlIHByb3BzIGNhbiBiZSB1c2VkIHRvIHJlc3RvcmUgdGhlIHZhbHVlcyBvZiBSZWdFeHAgcHJvcHNcbiAgICB2YXIgcmVnZXhwU3RhdGUgPSBjcmVhdGVSZWdFeHBSZXN0b3JlKCk7XG5cbiAgICAvLyAxLiBJZiBkYXRlVGltZUZvcm1hdCBoYXMgYW4gW1tpbml0aWFsaXplZEludGxPYmplY3RdXSBpbnRlcm5hbCBwcm9wZXJ0eSB3aXRoXG4gICAgLy8gICAgdmFsdWUgdHJ1ZSwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uLlxuICAgIGlmIChpbnRlcm5hbFsnW1tpbml0aWFsaXplZEludGxPYmplY3RdXSddID09PSB0cnVlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdGhpc2Agb2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gaW5pdGlhbGl6ZWQgYXMgYW4gSW50bCBvYmplY3QnKTtcblxuICAgIC8vIE5lZWQgdGhpcyB0byBhY2Nlc3MgdGhlIGBpbnRlcm5hbGAgb2JqZWN0XG4gICAgZGVmaW5lUHJvcGVydHkoZGF0ZVRpbWVGb3JtYXQsICdfX2dldEludGVybmFsUHJvcGVydGllcycsIHtcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIHZhbHVlKCkge1xuICAgICAgICAgICAgLy8gTk9URTogTm9uLXN0YW5kYXJkLCBmb3IgaW50ZXJuYWwgdXNlIG9ubHlcbiAgICAgICAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHNlY3JldCkgcmV0dXJuIGludGVybmFsO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyAyLiBTZXQgdGhlIFtbaW5pdGlhbGl6ZWRJbnRsT2JqZWN0XV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgbnVtYmVyRm9ybWF0IHRvIHRydWUuXG4gICAgaW50ZXJuYWxbJ1tbaW5pdGlhbGl6ZWRJbnRsT2JqZWN0XV0nXSA9IHRydWU7XG5cbiAgICAvLyAzLiBMZXQgcmVxdWVzdGVkTG9jYWxlcyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIENhbm9uaWNhbGl6ZUxvY2FsZUxpc3RcbiAgICAvLyAgICBhYnN0cmFjdCBvcGVyYXRpb24gKGRlZmluZWQgaW4gOS4yLjEpIHdpdGggYXJndW1lbnQgbG9jYWxlcy5cbiAgICB2YXIgcmVxdWVzdGVkTG9jYWxlcyA9IENhbm9uaWNhbGl6ZUxvY2FsZUxpc3QobG9jYWxlcyk7XG5cbiAgICAvLyA0LiBMZXQgb3B0aW9ucyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFRvRGF0ZVRpbWVPcHRpb25zIGFic3RyYWN0XG4gICAgLy8gICAgb3BlcmF0aW9uIChkZWZpbmVkIGJlbG93KSB3aXRoIGFyZ3VtZW50cyBvcHRpb25zLCBcImFueVwiLCBhbmQgXCJkYXRlXCIuXG4gICAgb3B0aW9ucyA9IFRvRGF0ZVRpbWVPcHRpb25zKG9wdGlvbnMsICdhbnknLCAnZGF0ZScpO1xuXG4gICAgLy8gNS4gTGV0IG9wdCBiZSBhIG5ldyBSZWNvcmQuXG4gICAgdmFyIG9wdCA9IG5ldyBSZWNvcmQoKTtcblxuICAgIC8vIDYuIExldCBtYXRjaGVyIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgR2V0T3B0aW9uIGFic3RyYWN0IG9wZXJhdGlvblxuICAgIC8vICAgIChkZWZpbmVkIGluIDkuMi45KSB3aXRoIGFyZ3VtZW50cyBvcHRpb25zLCBcImxvY2FsZU1hdGNoZXJcIiwgXCJzdHJpbmdcIiwgYSBMaXN0XG4gICAgLy8gICAgY29udGFpbmluZyB0aGUgdHdvIFN0cmluZyB2YWx1ZXMgXCJsb29rdXBcIiBhbmQgXCJiZXN0IGZpdFwiLCBhbmQgXCJiZXN0IGZpdFwiLlxuICAgIHZhciBtYXRjaGVyID0gR2V0T3B0aW9uKG9wdGlvbnMsICdsb2NhbGVNYXRjaGVyJywgJ3N0cmluZycsIG5ldyBMaXN0KCdsb29rdXAnLCAnYmVzdCBmaXQnKSwgJ2Jlc3QgZml0Jyk7XG5cbiAgICAvLyA3LiBTZXQgb3B0LltbbG9jYWxlTWF0Y2hlcl1dIHRvIG1hdGNoZXIuXG4gICAgb3B0WydbW2xvY2FsZU1hdGNoZXJdXSddID0gbWF0Y2hlcjtcblxuICAgIC8vIDguIExldCBEYXRlVGltZUZvcm1hdCBiZSB0aGUgc3RhbmRhcmQgYnVpbHQtaW4gb2JqZWN0IHRoYXQgaXMgdGhlIGluaXRpYWxcbiAgICAvLyAgICB2YWx1ZSBvZiBJbnRsLkRhdGVUaW1lRm9ybWF0LlxuICAgIHZhciBEYXRlVGltZUZvcm1hdCA9IGludGVybmFscy5EYXRlVGltZUZvcm1hdDsgLy8gVGhpcyBpcyB3aGF0IHdlICpyZWFsbHkqIG5lZWRcblxuICAgIC8vIDkuIExldCBsb2NhbGVEYXRhIGJlIHRoZSB2YWx1ZSBvZiB0aGUgW1tsb2NhbGVEYXRhXV0gaW50ZXJuYWwgcHJvcGVydHkgb2ZcbiAgICAvLyAgICBEYXRlVGltZUZvcm1hdC5cbiAgICB2YXIgbG9jYWxlRGF0YSA9IERhdGVUaW1lRm9ybWF0WydbW2xvY2FsZURhdGFdXSddO1xuXG4gICAgLy8gMTAuIExldCByIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgUmVzb2x2ZUxvY2FsZSBhYnN0cmFjdCBvcGVyYXRpb25cbiAgICAvLyAgICAgKGRlZmluZWQgaW4gOS4yLjUpIHdpdGggdGhlIFtbYXZhaWxhYmxlTG9jYWxlc11dIGludGVybmFsIHByb3BlcnR5IG9mXG4gICAgLy8gICAgICBEYXRlVGltZUZvcm1hdCwgcmVxdWVzdGVkTG9jYWxlcywgb3B0LCB0aGUgW1tyZWxldmFudEV4dGVuc2lvbktleXNdXVxuICAgIC8vICAgICAgaW50ZXJuYWwgcHJvcGVydHkgb2YgRGF0ZVRpbWVGb3JtYXQsIGFuZCBsb2NhbGVEYXRhLlxuICAgIHZhciByID0gUmVzb2x2ZUxvY2FsZShEYXRlVGltZUZvcm1hdFsnW1thdmFpbGFibGVMb2NhbGVzXV0nXSwgcmVxdWVzdGVkTG9jYWxlcywgb3B0LCBEYXRlVGltZUZvcm1hdFsnW1tyZWxldmFudEV4dGVuc2lvbktleXNdXSddLCBsb2NhbGVEYXRhKTtcblxuICAgIC8vIDExLiBTZXQgdGhlIFtbbG9jYWxlXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQgdG8gdGhlIHZhbHVlIG9mXG4gICAgLy8gICAgIHIuW1tsb2NhbGVdXS5cbiAgICBpbnRlcm5hbFsnW1tsb2NhbGVdXSddID0gclsnW1tsb2NhbGVdXSddO1xuXG4gICAgLy8gMTIuIFNldCB0aGUgW1tjYWxlbmRhcl1dIGludGVybmFsIHByb3BlcnR5IG9mIGRhdGVUaW1lRm9ybWF0IHRvIHRoZSB2YWx1ZSBvZlxuICAgIC8vICAgICByLltbY2FdXS5cbiAgICBpbnRlcm5hbFsnW1tjYWxlbmRhcl1dJ10gPSByWydbW2NhXV0nXTtcblxuICAgIC8vIDEzLiBTZXQgdGhlIFtbbnVtYmVyaW5nU3lzdGVtXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQgdG8gdGhlIHZhbHVlIG9mXG4gICAgLy8gICAgIHIuW1tudV1dLlxuICAgIGludGVybmFsWydbW251bWJlcmluZ1N5c3RlbV1dJ10gPSByWydbW251XV0nXTtcblxuICAgIC8vIFRoZSBzcGVjaWZpY2F0aW9uIGRvZXNuJ3QgdGVsbCB1cyB0byBkbyB0aGlzLCBidXQgaXQncyBoZWxwZnVsIGxhdGVyIG9uXG4gICAgaW50ZXJuYWxbJ1tbZGF0YUxvY2FsZV1dJ10gPSByWydbW2RhdGFMb2NhbGVdXSddO1xuXG4gICAgLy8gMTQuIExldCBkYXRhTG9jYWxlIGJlIHRoZSB2YWx1ZSBvZiByLltbZGF0YUxvY2FsZV1dLlxuICAgIHZhciBkYXRhTG9jYWxlID0gclsnW1tkYXRhTG9jYWxlXV0nXTtcblxuICAgIC8vIDE1LiBMZXQgdHogYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsIG1ldGhvZCBvZiBvcHRpb25zIHdpdGhcbiAgICAvLyAgICAgYXJndW1lbnQgXCJ0aW1lWm9uZVwiLlxuICAgIHZhciB0eiA9IG9wdGlvbnMudGltZVpvbmU7XG5cbiAgICAvLyAxNi4gSWYgdHogaXMgbm90IHVuZGVmaW5lZCwgdGhlblxuICAgIGlmICh0eiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIGEuIExldCB0eiBiZSBUb1N0cmluZyh0eikuXG4gICAgICAgIC8vIGIuIENvbnZlcnQgdHogdG8gdXBwZXIgY2FzZSBhcyBkZXNjcmliZWQgaW4gNi4xLlxuICAgICAgICAvLyAgICBOT1RFOiBJZiBhbiBpbXBsZW1lbnRhdGlvbiBhY2NlcHRzIGFkZGl0aW9uYWwgdGltZSB6b25lIHZhbHVlcywgYXMgcGVybWl0dGVkXG4gICAgICAgIC8vICAgICAgICAgIHVuZGVyIGNlcnRhaW4gY29uZGl0aW9ucyBieSB0aGUgQ29uZm9ybWFuY2UgY2xhdXNlLCBkaWZmZXJlbnQgY2FzaW5nXG4gICAgICAgIC8vICAgICAgICAgIHJ1bGVzIGFwcGx5LlxuICAgICAgICB0eiA9IHRvTGF0aW5VcHBlckNhc2UodHopO1xuXG4gICAgICAgIC8vIGMuIElmIHR6IGlzIG5vdCBcIlVUQ1wiLCB0aGVuIHRocm93IGEgUmFuZ2VFcnJvciBleGNlcHRpb24uXG4gICAgICAgIC8vICMjI1RPRE86IGFjY2VwdCBtb3JlIHRpbWUgem9uZXMjIyNcbiAgICAgICAgaWYgKHR6ICE9PSAnVVRDJykgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RpbWVab25lIGlzIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgfVxuXG4gICAgLy8gMTcuIFNldCB0aGUgW1t0aW1lWm9uZV1dIGludGVybmFsIHByb3BlcnR5IG9mIGRhdGVUaW1lRm9ybWF0IHRvIHR6LlxuICAgIGludGVybmFsWydbW3RpbWVab25lXV0nXSA9IHR6O1xuXG4gICAgLy8gMTguIExldCBvcHQgYmUgYSBuZXcgUmVjb3JkLlxuICAgIG9wdCA9IG5ldyBSZWNvcmQoKTtcblxuICAgIC8vIDE5LiBGb3IgZWFjaCByb3cgb2YgVGFibGUgMywgZXhjZXB0IHRoZSBoZWFkZXIgcm93LCBkbzpcbiAgICBmb3IgKHZhciBwcm9wIGluIGRhdGVUaW1lQ29tcG9uZW50cykge1xuICAgICAgICBpZiAoIWhvcC5jYWxsKGRhdGVUaW1lQ29tcG9uZW50cywgcHJvcCkpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIDIwLiBMZXQgcHJvcCBiZSB0aGUgbmFtZSBnaXZlbiBpbiB0aGUgUHJvcGVydHkgY29sdW1uIG9mIHRoZSByb3cuXG4gICAgICAgIC8vIDIxLiBMZXQgdmFsdWUgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXRPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uLFxuICAgICAgICAvLyAgICAgcGFzc2luZyBhcyBhcmd1bWVudCBvcHRpb25zLCB0aGUgbmFtZSBnaXZlbiBpbiB0aGUgUHJvcGVydHkgY29sdW1uIG9mIHRoZVxuICAgICAgICAvLyAgICAgcm93LCBcInN0cmluZ1wiLCBhIExpc3QgY29udGFpbmluZyB0aGUgc3RyaW5ncyBnaXZlbiBpbiB0aGUgVmFsdWVzIGNvbHVtbiBvZlxuICAgICAgICAvLyAgICAgdGhlIHJvdywgYW5kIHVuZGVmaW5lZC5cbiAgICAgICAgdmFyIHZhbHVlID0gR2V0T3B0aW9uKG9wdGlvbnMsIHByb3AsICdzdHJpbmcnLCBkYXRlVGltZUNvbXBvbmVudHNbcHJvcF0pO1xuXG4gICAgICAgIC8vIDIyLiBTZXQgb3B0LltbPHByb3A+XV0gdG8gdmFsdWUuXG4gICAgICAgIG9wdFsnW1snICsgcHJvcCArICddXSddID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gQXNzaWduZWQgYSB2YWx1ZSBiZWxvd1xuICAgIHZhciBiZXN0Rm9ybWF0ID0gdm9pZCAwO1xuXG4gICAgLy8gMjMuIExldCBkYXRhTG9jYWxlRGF0YSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgLy8gICAgIGxvY2FsZURhdGEgd2l0aCBhcmd1bWVudCBkYXRhTG9jYWxlLlxuICAgIHZhciBkYXRhTG9jYWxlRGF0YSA9IGxvY2FsZURhdGFbZGF0YUxvY2FsZV07XG5cbiAgICAvLyAyNC4gTGV0IGZvcm1hdHMgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsIG1ldGhvZCBvZlxuICAgIC8vICAgICBkYXRhTG9jYWxlRGF0YSB3aXRoIGFyZ3VtZW50IFwiZm9ybWF0c1wiLlxuICAgIC8vICAgICBOb3RlOiB3ZSBwcm9jZXNzIHRoZSBDTERSIGZvcm1hdHMgaW50byB0aGUgc3BlYydkIHN0cnVjdHVyZVxuICAgIHZhciBmb3JtYXRzID0gVG9EYXRlVGltZUZvcm1hdHMoZGF0YUxvY2FsZURhdGEuZm9ybWF0cyk7XG5cbiAgICAvLyAyNS4gTGV0IG1hdGNoZXIgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXRPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uIHdpdGhcbiAgICAvLyAgICAgYXJndW1lbnRzIG9wdGlvbnMsIFwiZm9ybWF0TWF0Y2hlclwiLCBcInN0cmluZ1wiLCBhIExpc3QgY29udGFpbmluZyB0aGUgdHdvIFN0cmluZ1xuICAgIC8vICAgICB2YWx1ZXMgXCJiYXNpY1wiIGFuZCBcImJlc3QgZml0XCIsIGFuZCBcImJlc3QgZml0XCIuXG4gICAgbWF0Y2hlciA9IEdldE9wdGlvbihvcHRpb25zLCAnZm9ybWF0TWF0Y2hlcicsICdzdHJpbmcnLCBuZXcgTGlzdCgnYmFzaWMnLCAnYmVzdCBmaXQnKSwgJ2Jlc3QgZml0Jyk7XG5cbiAgICAvLyBPcHRpbWl6YXRpb246IGNhY2hpbmcgdGhlIHByb2Nlc3NlZCBmb3JtYXRzIGFzIGEgb25lIHRpbWUgb3BlcmF0aW9uIGJ5XG4gICAgLy8gcmVwbGFjaW5nIHRoZSBpbml0aWFsIHN0cnVjdHVyZSBmcm9tIGxvY2FsZURhdGFcbiAgICBkYXRhTG9jYWxlRGF0YS5mb3JtYXRzID0gZm9ybWF0cztcblxuICAgIC8vIDI2LiBJZiBtYXRjaGVyIGlzIFwiYmFzaWNcIiwgdGhlblxuICAgIGlmIChtYXRjaGVyID09PSAnYmFzaWMnKSB7XG4gICAgICAgIC8vIDI3LiBMZXQgYmVzdEZvcm1hdCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEJhc2ljRm9ybWF0TWF0Y2hlciBhYnN0cmFjdFxuICAgICAgICAvLyAgICAgb3BlcmF0aW9uIChkZWZpbmVkIGJlbG93KSB3aXRoIG9wdCBhbmQgZm9ybWF0cy5cbiAgICAgICAgYmVzdEZvcm1hdCA9IEJhc2ljRm9ybWF0TWF0Y2hlcihvcHQsIGZvcm1hdHMpO1xuXG4gICAgICAgIC8vIDI4LiBFbHNlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLyBkaXZlcmdpbmdcbiAgICAgICAgICAgICAgICB2YXIgX2hyID0gR2V0T3B0aW9uKG9wdGlvbnMsICdob3VyMTInLCAnYm9vbGVhbicgLyosIHVuZGVmaW5lZCwgdW5kZWZpbmVkKi8pO1xuICAgICAgICAgICAgICAgIG9wdC5ob3VyMTIgPSBfaHIgPT09IHVuZGVmaW5lZCA/IGRhdGFMb2NhbGVEYXRhLmhvdXIxMiA6IF9ocjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIDI5LiBMZXQgYmVzdEZvcm1hdCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEJlc3RGaXRGb3JtYXRNYXRjaGVyXG4gICAgICAgICAgICAvLyAgICAgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkIGJlbG93KSB3aXRoIG9wdCBhbmQgZm9ybWF0cy5cbiAgICAgICAgICAgIGJlc3RGb3JtYXQgPSBCZXN0Rml0Rm9ybWF0TWF0Y2hlcihvcHQsIGZvcm1hdHMpO1xuICAgICAgICB9XG5cbiAgICAvLyAzMC4gRm9yIGVhY2ggcm93IGluIFRhYmxlIDMsIGV4Y2VwdCB0aGUgaGVhZGVyIHJvdywgZG9cbiAgICBmb3IgKHZhciBfcHJvcCBpbiBkYXRlVGltZUNvbXBvbmVudHMpIHtcbiAgICAgICAgaWYgKCFob3AuY2FsbChkYXRlVGltZUNvbXBvbmVudHMsIF9wcm9wKSkgY29udGludWU7XG5cbiAgICAgICAgLy8gYS4gTGV0IHByb3AgYmUgdGhlIG5hbWUgZ2l2ZW4gaW4gdGhlIFByb3BlcnR5IGNvbHVtbiBvZiB0aGUgcm93LlxuICAgICAgICAvLyBiLiBMZXQgcERlc2MgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldE93blByb3BlcnR5XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgICAgIC8vICAgIGJlc3RGb3JtYXQgd2l0aCBhcmd1bWVudCBwcm9wLlxuICAgICAgICAvLyBjLiBJZiBwRGVzYyBpcyBub3QgdW5kZWZpbmVkLCB0aGVuXG4gICAgICAgIGlmIChob3AuY2FsbChiZXN0Rm9ybWF0LCBfcHJvcCkpIHtcbiAgICAgICAgICAgIC8vIGkuIExldCBwIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2YgYmVzdEZvcm1hdFxuICAgICAgICAgICAgLy8gICAgd2l0aCBhcmd1bWVudCBwcm9wLlxuICAgICAgICAgICAgdmFyIHAgPSBiZXN0Rm9ybWF0W19wcm9wXTtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLyBkaXZlcmdpbmdcbiAgICAgICAgICAgICAgICBwID0gYmVzdEZvcm1hdC5fICYmIGhvcC5jYWxsKGJlc3RGb3JtYXQuXywgX3Byb3ApID8gYmVzdEZvcm1hdC5fW19wcm9wXSA6IHA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlpLiBTZXQgdGhlIFtbPHByb3A+XV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQgdG8gcC5cbiAgICAgICAgICAgIGludGVybmFsWydbWycgKyBfcHJvcCArICddXSddID0gcDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBwYXR0ZXJuID0gdm9pZCAwOyAvLyBBc3NpZ25lZCBhIHZhbHVlIGJlbG93XG5cbiAgICAvLyAzMS4gTGV0IGhyMTIgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBHZXRPcHRpb24gYWJzdHJhY3Qgb3BlcmF0aW9uIHdpdGhcbiAgICAvLyAgICAgYXJndW1lbnRzIG9wdGlvbnMsIFwiaG91cjEyXCIsIFwiYm9vbGVhblwiLCB1bmRlZmluZWQsIGFuZCB1bmRlZmluZWQuXG4gICAgdmFyIGhyMTIgPSBHZXRPcHRpb24ob3B0aW9ucywgJ2hvdXIxMicsICdib29sZWFuJyAvKiwgdW5kZWZpbmVkLCB1bmRlZmluZWQqLyk7XG5cbiAgICAvLyAzMi4gSWYgZGF0ZVRpbWVGb3JtYXQgaGFzIGFuIGludGVybmFsIHByb3BlcnR5IFtbaG91cl1dLCB0aGVuXG4gICAgaWYgKGludGVybmFsWydbW2hvdXJdXSddKSB7XG4gICAgICAgIC8vIGEuIElmIGhyMTIgaXMgdW5kZWZpbmVkLCB0aGVuIGxldCBocjEyIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXVxuICAgICAgICAvLyAgICBpbnRlcm5hbCBtZXRob2Qgb2YgZGF0YUxvY2FsZURhdGEgd2l0aCBhcmd1bWVudCBcImhvdXIxMlwiLlxuICAgICAgICBocjEyID0gaHIxMiA9PT0gdW5kZWZpbmVkID8gZGF0YUxvY2FsZURhdGEuaG91cjEyIDogaHIxMjtcblxuICAgICAgICAvLyBiLiBTZXQgdGhlIFtbaG91cjEyXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQgdG8gaHIxMi5cbiAgICAgICAgaW50ZXJuYWxbJ1tbaG91cjEyXV0nXSA9IGhyMTI7XG5cbiAgICAgICAgLy8gYy4gSWYgaHIxMiBpcyB0cnVlLCB0aGVuXG4gICAgICAgIGlmIChocjEyID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBpLiBMZXQgaG91ck5vMCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mXG4gICAgICAgICAgICAvLyAgICBkYXRhTG9jYWxlRGF0YSB3aXRoIGFyZ3VtZW50IFwiaG91ck5vMFwiLlxuICAgICAgICAgICAgdmFyIGhvdXJObzAgPSBkYXRhTG9jYWxlRGF0YS5ob3VyTm8wO1xuXG4gICAgICAgICAgICAvLyBpaS4gU2V0IHRoZSBbW2hvdXJObzBdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBkYXRlVGltZUZvcm1hdCB0byBob3VyTm8wLlxuICAgICAgICAgICAgaW50ZXJuYWxbJ1tbaG91ck5vMF1dJ10gPSBob3VyTm8wO1xuXG4gICAgICAgICAgICAvLyBpaWkuIExldCBwYXR0ZXJuIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAgICAgICAgIC8vICAgICAgYmVzdEZvcm1hdCB3aXRoIGFyZ3VtZW50IFwicGF0dGVybjEyXCIuXG4gICAgICAgICAgICBwYXR0ZXJuID0gYmVzdEZvcm1hdC5wYXR0ZXJuMTI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkLiBFbHNlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIC8vIGkuIExldCBwYXR0ZXJuIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAgICAgICAgIC8vICAgIGJlc3RGb3JtYXQgd2l0aCBhcmd1bWVudCBcInBhdHRlcm5cIi5cbiAgICAgICAgICAgIHBhdHRlcm4gPSBiZXN0Rm9ybWF0LnBhdHRlcm47XG4gICAgfVxuXG4gICAgLy8gMzMuIEVsc2VcbiAgICBlbHNlXG4gICAgICAgIC8vIGEuIExldCBwYXR0ZXJuIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2ZcbiAgICAgICAgLy8gICAgYmVzdEZvcm1hdCB3aXRoIGFyZ3VtZW50IFwicGF0dGVyblwiLlxuICAgICAgICBwYXR0ZXJuID0gYmVzdEZvcm1hdC5wYXR0ZXJuO1xuXG4gICAgLy8gMzQuIFNldCB0aGUgW1twYXR0ZXJuXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQgdG8gcGF0dGVybi5cbiAgICBpbnRlcm5hbFsnW1twYXR0ZXJuXV0nXSA9IHBhdHRlcm47XG5cbiAgICAvLyAzNS4gU2V0IHRoZSBbW2JvdW5kRm9ybWF0XV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQgdG8gdW5kZWZpbmVkLlxuICAgIGludGVybmFsWydbW2JvdW5kRm9ybWF0XV0nXSA9IHVuZGVmaW5lZDtcblxuICAgIC8vIDM2LiBTZXQgdGhlIFtbaW5pdGlhbGl6ZWREYXRlVGltZUZvcm1hdF1dIGludGVybmFsIHByb3BlcnR5IG9mIGRhdGVUaW1lRm9ybWF0IHRvXG4gICAgLy8gICAgIHRydWUuXG4gICAgaW50ZXJuYWxbJ1tbaW5pdGlhbGl6ZWREYXRlVGltZUZvcm1hdF1dJ10gPSB0cnVlO1xuXG4gICAgLy8gSW4gRVMzLCB3ZSBuZWVkIHRvIHByZS1iaW5kIHRoZSBmb3JtYXQoKSBmdW5jdGlvblxuICAgIGlmIChlczMpIGRhdGVUaW1lRm9ybWF0LmZvcm1hdCA9IEdldEZvcm1hdERhdGVUaW1lLmNhbGwoZGF0ZVRpbWVGb3JtYXQpO1xuXG4gICAgLy8gUmVzdG9yZSB0aGUgUmVnRXhwIHByb3BlcnRpZXNcbiAgICByZWdleHBTdGF0ZS5leHAudGVzdChyZWdleHBTdGF0ZS5pbnB1dCk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIG5ld2x5IGluaXRpYWxpc2VkIG9iamVjdFxuICAgIHJldHVybiBkYXRlVGltZUZvcm1hdDtcbn1cblxuLyoqXG4gKiBTZXZlcmFsIERhdGVUaW1lRm9ybWF0IGFsZ29yaXRobXMgdXNlIHZhbHVlcyBmcm9tIHRoZSBmb2xsb3dpbmcgdGFibGUsIHdoaWNoIHByb3ZpZGVzXG4gKiBwcm9wZXJ0eSBuYW1lcyBhbmQgYWxsb3dhYmxlIHZhbHVlcyBmb3IgdGhlIGNvbXBvbmVudHMgb2YgZGF0ZSBhbmQgdGltZSBmb3JtYXRzOlxuICovXG52YXIgZGF0ZVRpbWVDb21wb25lbnRzID0ge1xuICAgIHdlZWtkYXk6IFtcIm5hcnJvd1wiLCBcInNob3J0XCIsIFwibG9uZ1wiXSxcbiAgICBlcmE6IFtcIm5hcnJvd1wiLCBcInNob3J0XCIsIFwibG9uZ1wiXSxcbiAgICB5ZWFyOiBbXCIyLWRpZ2l0XCIsIFwibnVtZXJpY1wiXSxcbiAgICBtb250aDogW1wiMi1kaWdpdFwiLCBcIm51bWVyaWNcIiwgXCJuYXJyb3dcIiwgXCJzaG9ydFwiLCBcImxvbmdcIl0sXG4gICAgZGF5OiBbXCIyLWRpZ2l0XCIsIFwibnVtZXJpY1wiXSxcbiAgICBob3VyOiBbXCIyLWRpZ2l0XCIsIFwibnVtZXJpY1wiXSxcbiAgICBtaW51dGU6IFtcIjItZGlnaXRcIiwgXCJudW1lcmljXCJdLFxuICAgIHNlY29uZDogW1wiMi1kaWdpdFwiLCBcIm51bWVyaWNcIl0sXG4gICAgdGltZVpvbmVOYW1lOiBbXCJzaG9ydFwiLCBcImxvbmdcIl1cbn07XG5cbi8qKlxuICogV2hlbiB0aGUgVG9EYXRlVGltZU9wdGlvbnMgYWJzdHJhY3Qgb3BlcmF0aW9uIGlzIGNhbGxlZCB3aXRoIGFyZ3VtZW50cyBvcHRpb25zLFxuICogcmVxdWlyZWQsIGFuZCBkZWZhdWx0cywgdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbmZ1bmN0aW9uIFRvRGF0ZVRpbWVGb3JtYXRzKGZvcm1hdHMpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGZvcm1hdHMpID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAgIHJldHVybiBmb3JtYXRzO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlRGF0ZVRpbWVGb3JtYXRzKGZvcm1hdHMpO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIFRvRGF0ZVRpbWVPcHRpb25zIGFic3RyYWN0IG9wZXJhdGlvbiBpcyBjYWxsZWQgd2l0aCBhcmd1bWVudHMgb3B0aW9ucyxcbiAqIHJlcXVpcmVkLCBhbmQgZGVmYXVsdHMsIHRoZSBmb2xsb3dpbmcgc3RlcHMgYXJlIHRha2VuOlxuICovXG5mdW5jdGlvbiBUb0RhdGVUaW1lT3B0aW9ucyhvcHRpb25zLCByZXF1aXJlZCwgZGVmYXVsdHMpIHtcbiAgICAvLyAxLiBJZiBvcHRpb25zIGlzIHVuZGVmaW5lZCwgdGhlbiBsZXQgb3B0aW9ucyBiZSBudWxsLCBlbHNlIGxldCBvcHRpb25zIGJlXG4gICAgLy8gICAgVG9PYmplY3Qob3B0aW9ucykuXG4gICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IG51bGw7ZWxzZSB7XG4gICAgICAgIC8vICgjMTIpIG9wdGlvbnMgbmVlZHMgdG8gYmUgYSBSZWNvcmQsIGJ1dCBpdCBhbHNvIG5lZWRzIHRvIGluaGVyaXQgcHJvcGVydGllc1xuICAgICAgICB2YXIgb3B0MiA9IHRvT2JqZWN0KG9wdGlvbnMpO1xuICAgICAgICBvcHRpb25zID0gbmV3IFJlY29yZCgpO1xuXG4gICAgICAgIGZvciAodmFyIGsgaW4gb3B0Mikge1xuICAgICAgICAgICAgb3B0aW9uc1trXSA9IG9wdDJba107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAyLiBMZXQgY3JlYXRlIGJlIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBmdW5jdGlvbiBvYmplY3QgZGVmaW5lZCBpbiBFUzUsIDE1LjIuMy41LlxuICAgIHZhciBjcmVhdGUgPSBvYmpDcmVhdGU7XG5cbiAgICAvLyAzLiBMZXQgb3B0aW9ucyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbQ2FsbF1dIGludGVybmFsIG1ldGhvZCBvZiBjcmVhdGUgd2l0aFxuICAgIC8vICAgIHVuZGVmaW5lZCBhcyB0aGUgdGhpcyB2YWx1ZSBhbmQgYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nIHRoZSBzaW5nbGUgaXRlbVxuICAgIC8vICAgIG9wdGlvbnMuXG4gICAgb3B0aW9ucyA9IGNyZWF0ZShvcHRpb25zKTtcblxuICAgIC8vIDQuIExldCBuZWVkRGVmYXVsdHMgYmUgdHJ1ZS5cbiAgICB2YXIgbmVlZERlZmF1bHRzID0gdHJ1ZTtcblxuICAgIC8vIDUuIElmIHJlcXVpcmVkIGlzIFwiZGF0ZVwiIG9yIFwiYW55XCIsIHRoZW5cbiAgICBpZiAocmVxdWlyZWQgPT09ICdkYXRlJyB8fCByZXF1aXJlZCA9PT0gJ2FueScpIHtcbiAgICAgICAgLy8gYS4gRm9yIGVhY2ggb2YgdGhlIHByb3BlcnR5IG5hbWVzIFwid2Vla2RheVwiLCBcInllYXJcIiwgXCJtb250aFwiLCBcImRheVwiOlxuICAgICAgICAvLyBpLiBJZiB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mIG9wdGlvbnMgd2l0aCB0aGVcbiAgICAgICAgLy8gICAgcHJvcGVydHkgbmFtZSBpcyBub3QgdW5kZWZpbmVkLCB0aGVuIGxldCBuZWVkRGVmYXVsdHMgYmUgZmFsc2UuXG4gICAgICAgIGlmIChvcHRpb25zLndlZWtkYXkgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLnllYXIgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLm1vbnRoICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5kYXkgIT09IHVuZGVmaW5lZCkgbmVlZERlZmF1bHRzID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gNi4gSWYgcmVxdWlyZWQgaXMgXCJ0aW1lXCIgb3IgXCJhbnlcIiwgdGhlblxuICAgIGlmIChyZXF1aXJlZCA9PT0gJ3RpbWUnIHx8IHJlcXVpcmVkID09PSAnYW55Jykge1xuICAgICAgICAvLyBhLiBGb3IgZWFjaCBvZiB0aGUgcHJvcGVydHkgbmFtZXMgXCJob3VyXCIsIFwibWludXRlXCIsIFwic2Vjb25kXCI6XG4gICAgICAgIC8vIGkuIElmIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2Ygb3B0aW9ucyB3aXRoIHRoZVxuICAgICAgICAvLyAgICBwcm9wZXJ0eSBuYW1lIGlzIG5vdCB1bmRlZmluZWQsIHRoZW4gbGV0IG5lZWREZWZhdWx0cyBiZSBmYWxzZS5cbiAgICAgICAgaWYgKG9wdGlvbnMuaG91ciAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMubWludXRlICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5zZWNvbmQgIT09IHVuZGVmaW5lZCkgbmVlZERlZmF1bHRzID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gNy4gSWYgbmVlZERlZmF1bHRzIGlzIHRydWUgYW5kIGRlZmF1bHRzIGlzIGVpdGhlciBcImRhdGVcIiBvciBcImFsbFwiLCB0aGVuXG4gICAgaWYgKG5lZWREZWZhdWx0cyAmJiAoZGVmYXVsdHMgPT09ICdkYXRlJyB8fCBkZWZhdWx0cyA9PT0gJ2FsbCcpKVxuICAgICAgICAvLyBhLiBGb3IgZWFjaCBvZiB0aGUgcHJvcGVydHkgbmFtZXMgXCJ5ZWFyXCIsIFwibW9udGhcIiwgXCJkYXlcIjpcbiAgICAgICAgLy8gaS4gQ2FsbCB0aGUgW1tEZWZpbmVPd25Qcm9wZXJ0eV1dIGludGVybmFsIG1ldGhvZCBvZiBvcHRpb25zIHdpdGggdGhlXG4gICAgICAgIC8vICAgIHByb3BlcnR5IG5hbWUsIFByb3BlcnR5IERlc2NyaXB0b3Ige1tbVmFsdWVdXTogXCJudW1lcmljXCIsIFtbV3JpdGFibGVdXTpcbiAgICAgICAgLy8gICAgdHJ1ZSwgW1tFbnVtZXJhYmxlXV06IHRydWUsIFtbQ29uZmlndXJhYmxlXV06IHRydWV9LCBhbmQgZmFsc2UuXG4gICAgICAgIG9wdGlvbnMueWVhciA9IG9wdGlvbnMubW9udGggPSBvcHRpb25zLmRheSA9ICdudW1lcmljJztcblxuICAgIC8vIDguIElmIG5lZWREZWZhdWx0cyBpcyB0cnVlIGFuZCBkZWZhdWx0cyBpcyBlaXRoZXIgXCJ0aW1lXCIgb3IgXCJhbGxcIiwgdGhlblxuICAgIGlmIChuZWVkRGVmYXVsdHMgJiYgKGRlZmF1bHRzID09PSAndGltZScgfHwgZGVmYXVsdHMgPT09ICdhbGwnKSlcbiAgICAgICAgLy8gYS4gRm9yIGVhY2ggb2YgdGhlIHByb3BlcnR5IG5hbWVzIFwiaG91clwiLCBcIm1pbnV0ZVwiLCBcInNlY29uZFwiOlxuICAgICAgICAvLyBpLiBDYWxsIHRoZSBbW0RlZmluZU93blByb3BlcnR5XV0gaW50ZXJuYWwgbWV0aG9kIG9mIG9wdGlvbnMgd2l0aCB0aGVcbiAgICAgICAgLy8gICAgcHJvcGVydHkgbmFtZSwgUHJvcGVydHkgRGVzY3JpcHRvciB7W1tWYWx1ZV1dOiBcIm51bWVyaWNcIiwgW1tXcml0YWJsZV1dOlxuICAgICAgICAvLyAgICB0cnVlLCBbW0VudW1lcmFibGVdXTogdHJ1ZSwgW1tDb25maWd1cmFibGVdXTogdHJ1ZX0sIGFuZCBmYWxzZS5cbiAgICAgICAgb3B0aW9ucy5ob3VyID0gb3B0aW9ucy5taW51dGUgPSBvcHRpb25zLnNlY29uZCA9ICdudW1lcmljJztcblxuICAgIC8vIDkuIFJldHVybiBvcHRpb25zLlxuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIEJhc2ljRm9ybWF0TWF0Y2hlciBhYnN0cmFjdCBvcGVyYXRpb24gaXMgY2FsbGVkIHdpdGggdHdvIGFyZ3VtZW50cyBvcHRpb25zIGFuZFxuICogZm9ybWF0cywgdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbmZ1bmN0aW9uIEJhc2ljRm9ybWF0TWF0Y2hlcihvcHRpb25zLCBmb3JtYXRzKSB7XG4gICAgLy8gMS4gTGV0IHJlbW92YWxQZW5hbHR5IGJlIDEyMC5cbiAgICB2YXIgcmVtb3ZhbFBlbmFsdHkgPSAxMjA7XG5cbiAgICAvLyAyLiBMZXQgYWRkaXRpb25QZW5hbHR5IGJlIDIwLlxuICAgIHZhciBhZGRpdGlvblBlbmFsdHkgPSAyMDtcblxuICAgIC8vIDMuIExldCBsb25nTGVzc1BlbmFsdHkgYmUgOC5cbiAgICB2YXIgbG9uZ0xlc3NQZW5hbHR5ID0gODtcblxuICAgIC8vIDQuIExldCBsb25nTW9yZVBlbmFsdHkgYmUgNi5cbiAgICB2YXIgbG9uZ01vcmVQZW5hbHR5ID0gNjtcblxuICAgIC8vIDUuIExldCBzaG9ydExlc3NQZW5hbHR5IGJlIDYuXG4gICAgdmFyIHNob3J0TGVzc1BlbmFsdHkgPSA2O1xuXG4gICAgLy8gNi4gTGV0IHNob3J0TW9yZVBlbmFsdHkgYmUgMy5cbiAgICB2YXIgc2hvcnRNb3JlUGVuYWx0eSA9IDM7XG5cbiAgICAvLyA3LiBMZXQgYmVzdFNjb3JlIGJlIC1JbmZpbml0eS5cbiAgICB2YXIgYmVzdFNjb3JlID0gLUluZmluaXR5O1xuXG4gICAgLy8gOC4gTGV0IGJlc3RGb3JtYXQgYmUgdW5kZWZpbmVkLlxuICAgIHZhciBiZXN0Rm9ybWF0ID0gdm9pZCAwO1xuXG4gICAgLy8gOS4gTGV0IGkgYmUgMC5cbiAgICB2YXIgaSA9IDA7XG5cbiAgICAvLyAxMC4gQXNzZXJ0OiBmb3JtYXRzIGlzIGFuIEFycmF5IG9iamVjdC5cblxuICAgIC8vIDExLiBMZXQgbGVuIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2YgZm9ybWF0cyB3aXRoIGFyZ3VtZW50IFwibGVuZ3RoXCIuXG4gICAgdmFyIGxlbiA9IGZvcm1hdHMubGVuZ3RoO1xuXG4gICAgLy8gMTIuIFJlcGVhdCB3aGlsZSBpIDwgbGVuOlxuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgIC8vIGEuIExldCBmb3JtYXQgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldF1dIGludGVybmFsIG1ldGhvZCBvZiBmb3JtYXRzIHdpdGggYXJndW1lbnQgVG9TdHJpbmcoaSkuXG4gICAgICAgIHZhciBmb3JtYXQgPSBmb3JtYXRzW2ldO1xuXG4gICAgICAgIC8vIGIuIExldCBzY29yZSBiZSAwLlxuICAgICAgICB2YXIgc2NvcmUgPSAwO1xuXG4gICAgICAgIC8vIGMuIEZvciBlYWNoIHByb3BlcnR5IHNob3duIGluIFRhYmxlIDM6XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGRhdGVUaW1lQ29tcG9uZW50cykge1xuICAgICAgICAgICAgaWYgKCFob3AuY2FsbChkYXRlVGltZUNvbXBvbmVudHMsIHByb3BlcnR5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIGkuIExldCBvcHRpb25zUHJvcCBiZSBvcHRpb25zLltbPHByb3BlcnR5Pl1dLlxuICAgICAgICAgICAgdmFyIG9wdGlvbnNQcm9wID0gb3B0aW9uc1snW1snICsgcHJvcGVydHkgKyAnXV0nXTtcblxuICAgICAgICAgICAgLy8gaWkuIExldCBmb3JtYXRQcm9wRGVzYyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0T3duUHJvcGVydHldXSBpbnRlcm5hbCBtZXRob2Qgb2YgZm9ybWF0XG4gICAgICAgICAgICAvLyAgICAgd2l0aCBhcmd1bWVudCBwcm9wZXJ0eS5cbiAgICAgICAgICAgIC8vIGlpaS4gSWYgZm9ybWF0UHJvcERlc2MgaXMgbm90IHVuZGVmaW5lZCwgdGhlblxuICAgICAgICAgICAgLy8gICAgIDEuIExldCBmb3JtYXRQcm9wIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2YgZm9ybWF0IHdpdGggYXJndW1lbnQgcHJvcGVydHkuXG4gICAgICAgICAgICB2YXIgZm9ybWF0UHJvcCA9IGhvcC5jYWxsKGZvcm1hdCwgcHJvcGVydHkpID8gZm9ybWF0W3Byb3BlcnR5XSA6IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgLy8gaXYuIElmIG9wdGlvbnNQcm9wIGlzIHVuZGVmaW5lZCBhbmQgZm9ybWF0UHJvcCBpcyBub3QgdW5kZWZpbmVkLCB0aGVuIGRlY3JlYXNlIHNjb3JlIGJ5XG4gICAgICAgICAgICAvLyAgICAgYWRkaXRpb25QZW5hbHR5LlxuICAgICAgICAgICAgaWYgKG9wdGlvbnNQcm9wID09PSB1bmRlZmluZWQgJiYgZm9ybWF0UHJvcCAhPT0gdW5kZWZpbmVkKSBzY29yZSAtPSBhZGRpdGlvblBlbmFsdHk7XG5cbiAgICAgICAgICAgIC8vIHYuIEVsc2UgaWYgb3B0aW9uc1Byb3AgaXMgbm90IHVuZGVmaW5lZCBhbmQgZm9ybWF0UHJvcCBpcyB1bmRlZmluZWQsIHRoZW4gZGVjcmVhc2Ugc2NvcmUgYnlcbiAgICAgICAgICAgIC8vICAgIHJlbW92YWxQZW5hbHR5LlxuICAgICAgICAgICAgZWxzZSBpZiAob3B0aW9uc1Byb3AgIT09IHVuZGVmaW5lZCAmJiBmb3JtYXRQcm9wID09PSB1bmRlZmluZWQpIHNjb3JlIC09IHJlbW92YWxQZW5hbHR5O1xuXG4gICAgICAgICAgICAgICAgLy8gdmkuIEVsc2VcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIExldCB2YWx1ZXMgYmUgdGhlIGFycmF5IFtcIjItZGlnaXRcIiwgXCJudW1lcmljXCIsIFwibmFycm93XCIsIFwic2hvcnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgIFwibG9uZ1wiXS5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBbJzItZGlnaXQnLCAnbnVtZXJpYycsICduYXJyb3cnLCAnc2hvcnQnLCAnbG9uZyddO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiBMZXQgb3B0aW9uc1Byb3BJbmRleCBiZSB0aGUgaW5kZXggb2Ygb3B0aW9uc1Byb3Agd2l0aGluIHZhbHVlcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zUHJvcEluZGV4ID0gYXJySW5kZXhPZi5jYWxsKHZhbHVlcywgb3B0aW9uc1Byb3ApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiBMZXQgZm9ybWF0UHJvcEluZGV4IGJlIHRoZSBpbmRleCBvZiBmb3JtYXRQcm9wIHdpdGhpbiB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm9ybWF0UHJvcEluZGV4ID0gYXJySW5kZXhPZi5jYWxsKHZhbHVlcywgZm9ybWF0UHJvcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIExldCBkZWx0YSBiZSBtYXgobWluKGZvcm1hdFByb3BJbmRleCAtIG9wdGlvbnNQcm9wSW5kZXgsIDIpLCAtMikuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBNYXRoLm1heChNYXRoLm1pbihmb3JtYXRQcm9wSW5kZXggLSBvcHRpb25zUHJvcEluZGV4LCAyKSwgLTIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyA1LiBJZiBkZWx0YSA9IDIsIGRlY3JlYXNlIHNjb3JlIGJ5IGxvbmdNb3JlUGVuYWx0eS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWx0YSA9PT0gMikgc2NvcmUgLT0gbG9uZ01vcmVQZW5hbHR5O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyA2LiBFbHNlIGlmIGRlbHRhID0gMSwgZGVjcmVhc2Ugc2NvcmUgYnkgc2hvcnRNb3JlUGVuYWx0eS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbHRhID09PSAxKSBzY29yZSAtPSBzaG9ydE1vcmVQZW5hbHR5O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNy4gRWxzZSBpZiBkZWx0YSA9IC0xLCBkZWNyZWFzZSBzY29yZSBieSBzaG9ydExlc3NQZW5hbHR5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbHRhID09PSAtMSkgc2NvcmUgLT0gc2hvcnRMZXNzUGVuYWx0eTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA4LiBFbHNlIGlmIGRlbHRhID0gLTIsIGRlY3JlYXNlIHNjb3JlIGJ5IGxvbmdMZXNzUGVuYWx0eS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGVsdGEgPT09IC0yKSBzY29yZSAtPSBsb25nTGVzc1BlbmFsdHk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGQuIElmIHNjb3JlID4gYmVzdFNjb3JlLCB0aGVuXG4gICAgICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xuICAgICAgICAgICAgLy8gaS4gTGV0IGJlc3RTY29yZSBiZSBzY29yZS5cbiAgICAgICAgICAgIGJlc3RTY29yZSA9IHNjb3JlO1xuXG4gICAgICAgICAgICAvLyBpaS4gTGV0IGJlc3RGb3JtYXQgYmUgZm9ybWF0LlxuICAgICAgICAgICAgYmVzdEZvcm1hdCA9IGZvcm1hdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGUuIEluY3JlYXNlIGkgYnkgMS5cbiAgICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIDEzLiBSZXR1cm4gYmVzdEZvcm1hdC5cbiAgICByZXR1cm4gYmVzdEZvcm1hdDtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBCZXN0Rml0Rm9ybWF0TWF0Y2hlciBhYnN0cmFjdCBvcGVyYXRpb24gaXMgY2FsbGVkIHdpdGggdHdvIGFyZ3VtZW50cyBvcHRpb25zXG4gKiBhbmQgZm9ybWF0cywgaXQgcGVyZm9ybXMgaW1wbGVtZW50YXRpb24gZGVwZW5kZW50IHN0ZXBzLCB3aGljaCBzaG91bGQgcmV0dXJuIGEgc2V0IG9mXG4gKiBjb21wb25lbnQgcmVwcmVzZW50YXRpb25zIHRoYXQgYSB0eXBpY2FsIHVzZXIgb2YgdGhlIHNlbGVjdGVkIGxvY2FsZSB3b3VsZCBwZXJjZWl2ZSBhc1xuICogYXQgbGVhc3QgYXMgZ29vZCBhcyB0aGUgb25lIHJldHVybmVkIGJ5IEJhc2ljRm9ybWF0TWF0Y2hlci5cbiAqXG4gKiBUaGlzIHBvbHlmaWxsIGRlZmluZXMgdGhlIGFsZ29yaXRobSB0byBiZSB0aGUgc2FtZSBhcyBCYXNpY0Zvcm1hdE1hdGNoZXIsXG4gKiB3aXRoIHRoZSBhZGRpdGlvbiBvZiBib251cyBwb2ludHMgYXdhcmRlZCB3aGVyZSB0aGUgcmVxdWVzdGVkIGZvcm1hdCBpcyBvZlxuICogdGhlIHNhbWUgZGF0YSB0eXBlIGFzIHRoZSBwb3RlbnRpYWxseSBtYXRjaGluZyBmb3JtYXQuXG4gKlxuICogVGhpcyBhbGdvIHJlbGllcyBvbiB0aGUgY29uY2VwdCBvZiBjbG9zZXN0IGRpc3RhbmNlIG1hdGNoaW5nIGRlc2NyaWJlZCBoZXJlOlxuICogaHR0cDovL3VuaWNvZGUub3JnL3JlcG9ydHMvdHIzNS90cjM1LWRhdGVzLmh0bWwjTWF0Y2hpbmdfU2tlbGV0b25zXG4gKiBUeXBpY2FsbHkgYSDigJxiZXN0IG1hdGNo4oCdIGlzIGZvdW5kIHVzaW5nIGEgY2xvc2VzdCBkaXN0YW5jZSBtYXRjaCwgc3VjaCBhczpcbiAqXG4gKiBTeW1ib2xzIHJlcXVlc3RpbmcgYSBiZXN0IGNob2ljZSBmb3IgdGhlIGxvY2FsZSBhcmUgcmVwbGFjZWQuXG4gKiAgICAgIGog4oaSIG9uZSBvZiB7SCwgaywgaCwgS307IEMg4oaSIG9uZSBvZiB7YSwgYiwgQn1cbiAqIC0+IENvdmVyZWQgYnkgY2xkci5qcyBtYXRjaGluZyBwcm9jZXNzXG4gKlxuICogRm9yIGZpZWxkcyB3aXRoIHN5bWJvbHMgcmVwcmVzZW50aW5nIHRoZSBzYW1lIHR5cGUgKHllYXIsIG1vbnRoLCBkYXksIGV0Yyk6XG4gKiAgICAgTW9zdCBzeW1ib2xzIGhhdmUgYSBzbWFsbCBkaXN0YW5jZSBmcm9tIGVhY2ggb3RoZXIuXG4gKiAgICAgICAgIE0g4omFIEw7IEUg4omFIGM7IGEg4omFIGIg4omFIEI7IEgg4omFIGsg4omFIGgg4omFIEs7IC4uLlxuICogICAgIC0+IENvdmVyZWQgYnkgY2xkci5qcyBtYXRjaGluZyBwcm9jZXNzXG4gKlxuICogICAgIFdpZHRoIGRpZmZlcmVuY2VzIGFtb25nIGZpZWxkcywgb3RoZXIgdGhhbiB0aG9zZSBtYXJraW5nIHRleHQgdnMgbnVtZXJpYywgYXJlIGdpdmVuIHNtYWxsIGRpc3RhbmNlIGZyb20gZWFjaCBvdGhlci5cbiAqICAgICAgICAgTU1NIOKJhSBNTU1NXG4gKiAgICAgICAgIE1NIOKJhSBNXG4gKiAgICAgTnVtZXJpYyBhbmQgdGV4dCBmaWVsZHMgYXJlIGdpdmVuIGEgbGFyZ2VyIGRpc3RhbmNlIGZyb20gZWFjaCBvdGhlci5cbiAqICAgICAgICAgTU1NIOKJiCBNTVxuICogICAgIFN5bWJvbHMgcmVwcmVzZW50aW5nIHN1YnN0YW50aWFsIGRpZmZlcmVuY2VzICh3ZWVrIG9mIHllYXIgdnMgd2VlayBvZiBtb250aCkgYXJlIGdpdmVuIG11Y2ggbGFyZ2VyIGEgZGlzdGFuY2VzIGZyb20gZWFjaCBvdGhlci5cbiAqICAgICAgICAgZCDiiYsgRDsgLi4uXG4gKiAgICAgTWlzc2luZyBvciBleHRyYSBmaWVsZHMgY2F1c2UgYSBtYXRjaCB0byBmYWlsLiAoQnV0IHNlZSBNaXNzaW5nIFNrZWxldG9uIEZpZWxkcykuXG4gKlxuICpcbiAqIEZvciBleGFtcGxlLFxuICpcbiAqICAgICB7IG1vbnRoOiAnbnVtZXJpYycsIGRheTogJ251bWVyaWMnIH1cbiAqXG4gKiBzaG91bGQgbWF0Y2hcbiAqXG4gKiAgICAgeyBtb250aDogJzItZGlnaXQnLCBkYXk6ICcyLWRpZ2l0JyB9XG4gKlxuICogcmF0aGVyIHRoYW5cbiAqXG4gKiAgICAgeyBtb250aDogJ3Nob3J0JywgZGF5OiAnbnVtZXJpYycgfVxuICpcbiAqIFRoaXMgbWFrZXMgc2Vuc2UgYmVjYXVzZSBhIHVzZXIgcmVxdWVzdGluZyBhIGZvcm1hdHRlZCBkYXRlIHdpdGggbnVtZXJpYyBwYXJ0cyB3b3VsZFxuICogbm90IGV4cGVjdCB0byBzZWUgdGhlIHJldHVybmVkIGZvcm1hdCBjb250YWluaW5nIG5hcnJvdywgc2hvcnQgb3IgbG9uZyBwYXJ0IG5hbWVzXG4gKi9cbmZ1bmN0aW9uIEJlc3RGaXRGb3JtYXRNYXRjaGVyKG9wdGlvbnMsIGZvcm1hdHMpIHtcblxuICAgIC8vIDEuIExldCByZW1vdmFsUGVuYWx0eSBiZSAxMjAuXG4gICAgdmFyIHJlbW92YWxQZW5hbHR5ID0gMTIwO1xuXG4gICAgLy8gMi4gTGV0IGFkZGl0aW9uUGVuYWx0eSBiZSAyMC5cbiAgICB2YXIgYWRkaXRpb25QZW5hbHR5ID0gMjA7XG5cbiAgICAvLyAzLiBMZXQgbG9uZ0xlc3NQZW5hbHR5IGJlIDguXG4gICAgdmFyIGxvbmdMZXNzUGVuYWx0eSA9IDg7XG5cbiAgICAvLyA0LiBMZXQgbG9uZ01vcmVQZW5hbHR5IGJlIDYuXG4gICAgdmFyIGxvbmdNb3JlUGVuYWx0eSA9IDY7XG5cbiAgICAvLyA1LiBMZXQgc2hvcnRMZXNzUGVuYWx0eSBiZSA2LlxuICAgIHZhciBzaG9ydExlc3NQZW5hbHR5ID0gNjtcblxuICAgIC8vIDYuIExldCBzaG9ydE1vcmVQZW5hbHR5IGJlIDMuXG4gICAgdmFyIHNob3J0TW9yZVBlbmFsdHkgPSAzO1xuXG4gICAgdmFyIGhvdXIxMlBlbmFsdHkgPSAxO1xuXG4gICAgLy8gNy4gTGV0IGJlc3RTY29yZSBiZSAtSW5maW5pdHkuXG4gICAgdmFyIGJlc3RTY29yZSA9IC1JbmZpbml0eTtcblxuICAgIC8vIDguIExldCBiZXN0Rm9ybWF0IGJlIHVuZGVmaW5lZC5cbiAgICB2YXIgYmVzdEZvcm1hdCA9IHZvaWQgMDtcblxuICAgIC8vIDkuIExldCBpIGJlIDAuXG4gICAgdmFyIGkgPSAwO1xuXG4gICAgLy8gMTAuIEFzc2VydDogZm9ybWF0cyBpcyBhbiBBcnJheSBvYmplY3QuXG5cbiAgICAvLyAxMS4gTGV0IGxlbiBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mIGZvcm1hdHMgd2l0aCBhcmd1bWVudCBcImxlbmd0aFwiLlxuICAgIHZhciBsZW4gPSBmb3JtYXRzLmxlbmd0aDtcblxuICAgIC8vIDEyLiBSZXBlYXQgd2hpbGUgaSA8IGxlbjpcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgICAvLyBhLiBMZXQgZm9ybWF0IGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tHZXRdXSBpbnRlcm5hbCBtZXRob2Qgb2YgZm9ybWF0cyB3aXRoIGFyZ3VtZW50IFRvU3RyaW5nKGkpLlxuICAgICAgICB2YXIgZm9ybWF0ID0gZm9ybWF0c1tpXTtcblxuICAgICAgICAvLyBiLiBMZXQgc2NvcmUgYmUgMC5cbiAgICAgICAgdmFyIHNjb3JlID0gMDtcblxuICAgICAgICAvLyBjLiBGb3IgZWFjaCBwcm9wZXJ0eSBzaG93biBpbiBUYWJsZSAzOlxuICAgICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBkYXRlVGltZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIGlmICghaG9wLmNhbGwoZGF0ZVRpbWVDb21wb25lbnRzLCBwcm9wZXJ0eSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvLyBpLiBMZXQgb3B0aW9uc1Byb3AgYmUgb3B0aW9ucy5bWzxwcm9wZXJ0eT5dXS5cbiAgICAgICAgICAgIHZhciBvcHRpb25zUHJvcCA9IG9wdGlvbnNbJ1tbJyArIHByb3BlcnR5ICsgJ11dJ107XG5cbiAgICAgICAgICAgIC8vIGlpLiBMZXQgZm9ybWF0UHJvcERlc2MgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0dldE93blByb3BlcnR5XV0gaW50ZXJuYWwgbWV0aG9kIG9mIGZvcm1hdFxuICAgICAgICAgICAgLy8gICAgIHdpdGggYXJndW1lbnQgcHJvcGVydHkuXG4gICAgICAgICAgICAvLyBpaWkuIElmIGZvcm1hdFByb3BEZXNjIGlzIG5vdCB1bmRlZmluZWQsIHRoZW5cbiAgICAgICAgICAgIC8vICAgICAxLiBMZXQgZm9ybWF0UHJvcCBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbR2V0XV0gaW50ZXJuYWwgbWV0aG9kIG9mIGZvcm1hdCB3aXRoIGFyZ3VtZW50IHByb3BlcnR5LlxuICAgICAgICAgICAgdmFyIGZvcm1hdFByb3AgPSBob3AuY2FsbChmb3JtYXQsIHByb3BlcnR5KSA/IGZvcm1hdFtwcm9wZXJ0eV0gOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIC8vIGl2LiBJZiBvcHRpb25zUHJvcCBpcyB1bmRlZmluZWQgYW5kIGZvcm1hdFByb3AgaXMgbm90IHVuZGVmaW5lZCwgdGhlbiBkZWNyZWFzZSBzY29yZSBieVxuICAgICAgICAgICAgLy8gICAgIGFkZGl0aW9uUGVuYWx0eS5cbiAgICAgICAgICAgIGlmIChvcHRpb25zUHJvcCA9PT0gdW5kZWZpbmVkICYmIGZvcm1hdFByb3AgIT09IHVuZGVmaW5lZCkgc2NvcmUgLT0gYWRkaXRpb25QZW5hbHR5O1xuXG4gICAgICAgICAgICAvLyB2LiBFbHNlIGlmIG9wdGlvbnNQcm9wIGlzIG5vdCB1bmRlZmluZWQgYW5kIGZvcm1hdFByb3AgaXMgdW5kZWZpbmVkLCB0aGVuIGRlY3JlYXNlIHNjb3JlIGJ5XG4gICAgICAgICAgICAvLyAgICByZW1vdmFsUGVuYWx0eS5cbiAgICAgICAgICAgIGVsc2UgaWYgKG9wdGlvbnNQcm9wICE9PSB1bmRlZmluZWQgJiYgZm9ybWF0UHJvcCA9PT0gdW5kZWZpbmVkKSBzY29yZSAtPSByZW1vdmFsUGVuYWx0eTtcblxuICAgICAgICAgICAgICAgIC8vIHZpLiBFbHNlXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiBMZXQgdmFsdWVzIGJlIHRoZSBhcnJheSBbXCIyLWRpZ2l0XCIsIFwibnVtZXJpY1wiLCBcIm5hcnJvd1wiLCBcInNob3J0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICBcImxvbmdcIl0uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gWycyLWRpZ2l0JywgJ251bWVyaWMnLCAnbmFycm93JywgJ3Nob3J0JywgJ2xvbmcnXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMi4gTGV0IG9wdGlvbnNQcm9wSW5kZXggYmUgdGhlIGluZGV4IG9mIG9wdGlvbnNQcm9wIHdpdGhpbiB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9uc1Byb3BJbmRleCA9IGFyckluZGV4T2YuY2FsbCh2YWx1ZXMsIG9wdGlvbnNQcm9wKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4gTGV0IGZvcm1hdFByb3BJbmRleCBiZSB0aGUgaW5kZXggb2YgZm9ybWF0UHJvcCB3aXRoaW4gdmFsdWVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvcm1hdFByb3BJbmRleCA9IGFyckluZGV4T2YuY2FsbCh2YWx1ZXMsIGZvcm1hdFByb3ApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiBMZXQgZGVsdGEgYmUgbWF4KG1pbihmb3JtYXRQcm9wSW5kZXggLSBvcHRpb25zUHJvcEluZGV4LCAyKSwgLTIpLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gTWF0aC5tYXgoTWF0aC5taW4oZm9ybWF0UHJvcEluZGV4IC0gb3B0aW9uc1Byb3BJbmRleCwgMiksIC0yKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRpdmVyZ2luZyBmcm9tIHNwZWNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHRoZSBiZXN0Rml0IGFyZ3VtZW50IGlzIHRydWUsIHN1YnRyYWN0IGFkZGl0aW9uYWwgcGVuYWx0eSB3aGVyZSBkYXRhIHR5cGVzIGFyZSBub3QgdGhlIHNhbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9ybWF0UHJvcEluZGV4IDw9IDEgJiYgb3B0aW9uc1Byb3BJbmRleCA+PSAyIHx8IGZvcm1hdFByb3BJbmRleCA+PSAyICYmIG9wdGlvbnNQcm9wSW5kZXggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA1LiBJZiBkZWx0YSA9IDIsIGRlY3JlYXNlIHNjb3JlIGJ5IGxvbmdNb3JlUGVuYWx0eS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhID4gMCkgc2NvcmUgLT0gbG9uZ01vcmVQZW5hbHR5O2Vsc2UgaWYgKGRlbHRhIDwgMCkgc2NvcmUgLT0gbG9uZ0xlc3NQZW5hbHR5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDUuIElmIGRlbHRhID0gMiwgZGVjcmVhc2Ugc2NvcmUgYnkgbG9uZ01vcmVQZW5hbHR5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVsdGEgPiAxKSBzY29yZSAtPSBzaG9ydE1vcmVQZW5hbHR5O2Vsc2UgaWYgKGRlbHRhIDwgLTEpIHNjb3JlIC09IHNob3J0TGVzc1BlbmFsdHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBkaXZlcmdpbmcgdG8gYWxzbyB0YWtlIGludG8gY29uc2lkZXJhdGlvbiBkaWZmZXJlbmNlcyBiZXR3ZWVuIDEyIG9yIDI0IGhvdXJzXG4gICAgICAgICAgICAvLyB3aGljaCBpcyBzcGVjaWFsIGZvciB0aGUgYmVzdCBmaXQgb25seS5cbiAgICAgICAgICAgIGlmIChmb3JtYXQuXy5ob3VyMTIgIT09IG9wdGlvbnMuaG91cjEyKSB7XG4gICAgICAgICAgICAgICAgc2NvcmUgLT0gaG91cjEyUGVuYWx0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGQuIElmIHNjb3JlID4gYmVzdFNjb3JlLCB0aGVuXG4gICAgICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xuICAgICAgICAgICAgLy8gaS4gTGV0IGJlc3RTY29yZSBiZSBzY29yZS5cbiAgICAgICAgICAgIGJlc3RTY29yZSA9IHNjb3JlO1xuICAgICAgICAgICAgLy8gaWkuIExldCBiZXN0Rm9ybWF0IGJlIGZvcm1hdC5cbiAgICAgICAgICAgIGJlc3RGb3JtYXQgPSBmb3JtYXQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlLiBJbmNyZWFzZSBpIGJ5IDEuXG4gICAgICAgIGkrKztcbiAgICB9XG5cbiAgICAvLyAxMy4gUmV0dXJuIGJlc3RGb3JtYXQuXG4gICAgcmV0dXJuIGJlc3RGb3JtYXQ7XG59XG5cbi8qIDEyLjIuMyAqL2ludGVybmFscy5EYXRlVGltZUZvcm1hdCA9IHtcbiAgICAnW1thdmFpbGFibGVMb2NhbGVzXV0nOiBbXSxcbiAgICAnW1tyZWxldmFudEV4dGVuc2lvbktleXNdXSc6IFsnY2EnLCAnbnUnXSxcbiAgICAnW1tsb2NhbGVEYXRhXV0nOiB7fVxufTtcblxuLyoqXG4gKiBXaGVuIHRoZSBzdXBwb3J0ZWRMb2NhbGVzT2YgbWV0aG9kIG9mIEludGwuRGF0ZVRpbWVGb3JtYXQgaXMgY2FsbGVkLCB0aGVcbiAqIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbi8qIDEyLjIuMiAqL1xuZGVmaW5lUHJvcGVydHkoSW50bC5EYXRlVGltZUZvcm1hdCwgJ3N1cHBvcnRlZExvY2FsZXNPZicsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IGZuQmluZC5jYWxsKGZ1bmN0aW9uIChsb2NhbGVzKSB7XG4gICAgICAgIC8vIEJvdW5kIGZ1bmN0aW9ucyBvbmx5IGhhdmUgdGhlIGB0aGlzYCB2YWx1ZSBhbHRlcmVkIGlmIGJlaW5nIHVzZWQgYXMgYSBjb25zdHJ1Y3RvcixcbiAgICAgICAgLy8gdGhpcyBsZXRzIHVzIGltaXRhdGUgYSBuYXRpdmUgZnVuY3Rpb24gdGhhdCBoYXMgbm8gY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFob3AuY2FsbCh0aGlzLCAnW1thdmFpbGFibGVMb2NhbGVzXV0nKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignc3VwcG9ydGVkTG9jYWxlc09mKCkgaXMgbm90IGEgY29uc3RydWN0b3InKTtcblxuICAgICAgICAvLyBDcmVhdGUgYW4gb2JqZWN0IHdob3NlIHByb3BzIGNhbiBiZSB1c2VkIHRvIHJlc3RvcmUgdGhlIHZhbHVlcyBvZiBSZWdFeHAgcHJvcHNcbiAgICAgICAgdmFyIHJlZ2V4cFN0YXRlID0gY3JlYXRlUmVnRXhwUmVzdG9yZSgpLFxuXG5cbiAgICAgICAgLy8gMS4gSWYgb3B0aW9ucyBpcyBub3QgcHJvdmlkZWQsIHRoZW4gbGV0IG9wdGlvbnMgYmUgdW5kZWZpbmVkLlxuICAgICAgICBvcHRpb25zID0gYXJndW1lbnRzWzFdLFxuXG5cbiAgICAgICAgLy8gMi4gTGV0IGF2YWlsYWJsZUxvY2FsZXMgYmUgdGhlIHZhbHVlIG9mIHRoZSBbW2F2YWlsYWJsZUxvY2FsZXNdXSBpbnRlcm5hbFxuICAgICAgICAvLyAgICBwcm9wZXJ0eSBvZiB0aGUgc3RhbmRhcmQgYnVpbHQtaW4gb2JqZWN0IHRoYXQgaXMgdGhlIGluaXRpYWwgdmFsdWUgb2ZcbiAgICAgICAgLy8gICAgSW50bC5OdW1iZXJGb3JtYXQuXG5cbiAgICAgICAgYXZhaWxhYmxlTG9jYWxlcyA9IHRoaXNbJ1tbYXZhaWxhYmxlTG9jYWxlc11dJ10sXG5cblxuICAgICAgICAvLyAzLiBMZXQgcmVxdWVzdGVkTG9jYWxlcyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIENhbm9uaWNhbGl6ZUxvY2FsZUxpc3RcbiAgICAgICAgLy8gICAgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkIGluIDkuMi4xKSB3aXRoIGFyZ3VtZW50IGxvY2FsZXMuXG4gICAgICAgIHJlcXVlc3RlZExvY2FsZXMgPSBDYW5vbmljYWxpemVMb2NhbGVMaXN0KGxvY2FsZXMpO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIFJlZ0V4cCBwcm9wZXJ0aWVzXG4gICAgICAgIHJlZ2V4cFN0YXRlLmV4cC50ZXN0KHJlZ2V4cFN0YXRlLmlucHV0KTtcblxuICAgICAgICAvLyA0LiBSZXR1cm4gdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBTdXBwb3J0ZWRMb2NhbGVzIGFic3RyYWN0IG9wZXJhdGlvblxuICAgICAgICAvLyAgICAoZGVmaW5lZCBpbiA5LjIuOCkgd2l0aCBhcmd1bWVudHMgYXZhaWxhYmxlTG9jYWxlcywgcmVxdWVzdGVkTG9jYWxlcyxcbiAgICAgICAgLy8gICAgYW5kIG9wdGlvbnMuXG4gICAgICAgIHJldHVybiBTdXBwb3J0ZWRMb2NhbGVzKGF2YWlsYWJsZUxvY2FsZXMsIHJlcXVlc3RlZExvY2FsZXMsIG9wdGlvbnMpO1xuICAgIH0sIGludGVybmFscy5OdW1iZXJGb3JtYXQpXG59KTtcblxuLyoqXG4gKiBUaGlzIG5hbWVkIGFjY2Vzc29yIHByb3BlcnR5IHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGZvcm1hdHMgYSBudW1iZXJcbiAqIGFjY29yZGluZyB0byB0aGUgZWZmZWN0aXZlIGxvY2FsZSBhbmQgdGhlIGZvcm1hdHRpbmcgb3B0aW9ucyBvZiB0aGlzXG4gKiBEYXRlVGltZUZvcm1hdCBvYmplY3QuXG4gKi9cbi8qIDEyLjMuMiAqL2RlZmluZVByb3BlcnR5KEludGwuRGF0ZVRpbWVGb3JtYXQucHJvdG90eXBlLCAnZm9ybWF0Jywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IEdldEZvcm1hdERhdGVUaW1lXG59KTtcblxuZGVmaW5lUHJvcGVydHkoSW50bC5EYXRlVGltZUZvcm1hdC5wcm90b3R5cGUsICdmb3JtYXRUb1BhcnRzJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IEdldEZvcm1hdFRvUGFydHNEYXRlVGltZVxufSk7XG5cbmZ1bmN0aW9uIEdldEZvcm1hdERhdGVUaW1lKCkge1xuICAgIHZhciBpbnRlcm5hbCA9IHRoaXMgIT09IG51bGwgJiYgYmFiZWxIZWxwZXJzW1widHlwZW9mXCJdKHRoaXMpID09PSAnb2JqZWN0JyAmJiBnZXRJbnRlcm5hbFByb3BlcnRpZXModGhpcyk7XG5cbiAgICAvLyBTYXRpc2Z5IHRlc3QgMTIuM19iXG4gICAgaWYgKCFpbnRlcm5hbCB8fCAhaW50ZXJuYWxbJ1tbaW5pdGlhbGl6ZWREYXRlVGltZUZvcm1hdF1dJ10pIHRocm93IG5ldyBUeXBlRXJyb3IoJ2B0aGlzYCB2YWx1ZSBmb3IgZm9ybWF0KCkgaXMgbm90IGFuIGluaXRpYWxpemVkIEludGwuRGF0ZVRpbWVGb3JtYXQgb2JqZWN0LicpO1xuXG4gICAgLy8gVGhlIHZhbHVlIG9mIHRoZSBbW0dldF1dIGF0dHJpYnV0ZSBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGZvbGxvd2luZ1xuICAgIC8vIHN0ZXBzOlxuXG4gICAgLy8gMS4gSWYgdGhlIFtbYm91bmRGb3JtYXRdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiB0aGlzIERhdGVUaW1lRm9ybWF0IG9iamVjdFxuICAgIC8vICAgIGlzIHVuZGVmaW5lZCwgdGhlbjpcbiAgICBpZiAoaW50ZXJuYWxbJ1tbYm91bmRGb3JtYXRdXSddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gYS4gTGV0IEYgYmUgYSBGdW5jdGlvbiBvYmplY3QsIHdpdGggaW50ZXJuYWwgcHJvcGVydGllcyBzZXQgYXNcbiAgICAgICAgLy8gICAgc3BlY2lmaWVkIGZvciBidWlsdC1pbiBmdW5jdGlvbnMgaW4gRVM1LCAxNSwgb3Igc3VjY2Vzc29yLCBhbmQgdGhlXG4gICAgICAgIC8vICAgIGxlbmd0aCBwcm9wZXJ0eSBzZXQgdG8gMCwgdGhhdCB0YWtlcyB0aGUgYXJndW1lbnQgZGF0ZSBhbmRcbiAgICAgICAgLy8gICAgcGVyZm9ybXMgdGhlIGZvbGxvd2luZyBzdGVwczpcbiAgICAgICAgdmFyIEYgPSBmdW5jdGlvbiBGKCkge1xuICAgICAgICAgICAgLy8gICBpLiBJZiBkYXRlIGlzIG5vdCBwcm92aWRlZCBvciBpcyB1bmRlZmluZWQsIHRoZW4gbGV0IHggYmUgdGhlXG4gICAgICAgICAgICAvLyAgICAgIHJlc3VsdCBhcyBpZiBieSB0aGUgZXhwcmVzc2lvbiBEYXRlLm5vdygpIHdoZXJlIERhdGUubm93IGlzXG4gICAgICAgICAgICAvLyAgICAgIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBmdW5jdGlvbiBkZWZpbmVkIGluIEVTNSwgMTUuOS40LjQuXG4gICAgICAgICAgICAvLyAgaWkuIEVsc2UgbGV0IHggYmUgVG9OdW1iZXIoZGF0ZSkuXG4gICAgICAgICAgICAvLyBpaWkuIFJldHVybiB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEZvcm1hdERhdGVUaW1lIGFic3RyYWN0XG4gICAgICAgICAgICAvLyAgICAgIG9wZXJhdGlvbiAoZGVmaW5lZCBiZWxvdykgd2l0aCBhcmd1bWVudHMgdGhpcyBhbmQgeC5cbiAgICAgICAgICAgIHZhciB4ID0gTnVtYmVyKGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBEYXRlLm5vdygpIDogYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBGb3JtYXREYXRlVGltZSh0aGlzLCB4KTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gYi4gTGV0IGJpbmQgYmUgdGhlIHN0YW5kYXJkIGJ1aWx0LWluIGZ1bmN0aW9uIG9iamVjdCBkZWZpbmVkIGluIEVTNSxcbiAgICAgICAgLy8gICAgMTUuMy40LjUuXG4gICAgICAgIC8vIGMuIExldCBiZiBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbQ2FsbF1dIGludGVybmFsIG1ldGhvZCBvZlxuICAgICAgICAvLyAgICBiaW5kIHdpdGggRiBhcyB0aGUgdGhpcyB2YWx1ZSBhbmQgYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nXG4gICAgICAgIC8vICAgIHRoZSBzaW5nbGUgaXRlbSB0aGlzLlxuICAgICAgICB2YXIgYmYgPSBmbkJpbmQuY2FsbChGLCB0aGlzKTtcbiAgICAgICAgLy8gZC4gU2V0IHRoZSBbW2JvdW5kRm9ybWF0XV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgdGhpcyBOdW1iZXJGb3JtYXRcbiAgICAgICAgLy8gICAgb2JqZWN0IHRvIGJmLlxuICAgICAgICBpbnRlcm5hbFsnW1tib3VuZEZvcm1hdF1dJ10gPSBiZjtcbiAgICB9XG4gICAgLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgW1tib3VuZEZvcm1hdF1dIGludGVybmFsIHByb3BlcnR5IG9mIHRoaXNcbiAgICAvLyBOdW1iZXJGb3JtYXQgb2JqZWN0LlxuICAgIHJldHVybiBpbnRlcm5hbFsnW1tib3VuZEZvcm1hdF1dJ107XG59XG5cbmZ1bmN0aW9uIEdldEZvcm1hdFRvUGFydHNEYXRlVGltZSgpIHtcbiAgICB2YXIgaW50ZXJuYWwgPSB0aGlzICE9PSBudWxsICYmIGJhYmVsSGVscGVyc1tcInR5cGVvZlwiXSh0aGlzKSA9PT0gJ29iamVjdCcgJiYgZ2V0SW50ZXJuYWxQcm9wZXJ0aWVzKHRoaXMpO1xuXG4gICAgaWYgKCFpbnRlcm5hbCB8fCAhaW50ZXJuYWxbJ1tbaW5pdGlhbGl6ZWREYXRlVGltZUZvcm1hdF1dJ10pIHRocm93IG5ldyBUeXBlRXJyb3IoJ2B0aGlzYCB2YWx1ZSBmb3IgZm9ybWF0VG9QYXJ0cygpIGlzIG5vdCBhbiBpbml0aWFsaXplZCBJbnRsLkRhdGVUaW1lRm9ybWF0IG9iamVjdC4nKTtcblxuICAgIGlmIChpbnRlcm5hbFsnW1tib3VuZEZvcm1hdFRvUGFydHNdXSddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIEYgPSBmdW5jdGlvbiBGKCkge1xuICAgICAgICAgICAgdmFyIHggPSBOdW1iZXIoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCA/IERhdGUubm93KCkgOiBhcmd1bWVudHNbMF0pO1xuICAgICAgICAgICAgcmV0dXJuIEZvcm1hdFRvUGFydHNEYXRlVGltZSh0aGlzLCB4KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGJmID0gZm5CaW5kLmNhbGwoRiwgdGhpcyk7XG4gICAgICAgIGludGVybmFsWydbW2JvdW5kRm9ybWF0VG9QYXJ0c11dJ10gPSBiZjtcbiAgICB9XG4gICAgcmV0dXJuIGludGVybmFsWydbW2JvdW5kRm9ybWF0VG9QYXJ0c11dJ107XG59XG5cbmZ1bmN0aW9uIENyZWF0ZURhdGVUaW1lUGFydHMoZGF0ZVRpbWVGb3JtYXQsIHgpIHtcbiAgICAvLyAxLiBJZiB4IGlzIG5vdCBhIGZpbml0ZSBOdW1iZXIsIHRoZW4gdGhyb3cgYSBSYW5nZUVycm9yIGV4Y2VwdGlvbi5cbiAgICBpZiAoIWlzRmluaXRlKHgpKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCB2YWxpZCBkYXRlIHBhc3NlZCB0byBmb3JtYXQnKTtcblxuICAgIHZhciBpbnRlcm5hbCA9IGRhdGVUaW1lRm9ybWF0Ll9fZ2V0SW50ZXJuYWxQcm9wZXJ0aWVzKHNlY3JldCk7XG5cbiAgICAvLyBDcmVhdGluZyByZXN0b3JlIHBvaW50IGZvciBwcm9wZXJ0aWVzIG9uIHRoZSBSZWdFeHAgb2JqZWN0Li4uIHBsZWFzZSB3YWl0XG4gICAgLyogbGV0IHJlZ2V4cFN0YXRlID0gKi9jcmVhdGVSZWdFeHBSZXN0b3JlKCk7IC8vICMjI1RPRE86IHJldmlldyB0aGlzXG5cbiAgICAvLyAyLiBMZXQgbG9jYWxlIGJlIHRoZSB2YWx1ZSBvZiB0aGUgW1tsb2NhbGVdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBkYXRlVGltZUZvcm1hdC5cbiAgICB2YXIgbG9jYWxlID0gaW50ZXJuYWxbJ1tbbG9jYWxlXV0nXTtcblxuICAgIC8vIDMuIExldCBuZiBiZSB0aGUgcmVzdWx0IG9mIGNyZWF0aW5nIGEgbmV3IE51bWJlckZvcm1hdCBvYmplY3QgYXMgaWYgYnkgdGhlXG4gICAgLy8gZXhwcmVzc2lvbiBuZXcgSW50bC5OdW1iZXJGb3JtYXQoW2xvY2FsZV0sIHt1c2VHcm91cGluZzogZmFsc2V9KSB3aGVyZVxuICAgIC8vIEludGwuTnVtYmVyRm9ybWF0IGlzIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBjb25zdHJ1Y3RvciBkZWZpbmVkIGluIDExLjEuMy5cbiAgICB2YXIgbmYgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQoW2xvY2FsZV0sIHsgdXNlR3JvdXBpbmc6IGZhbHNlIH0pO1xuXG4gICAgLy8gNC4gTGV0IG5mMiBiZSB0aGUgcmVzdWx0IG9mIGNyZWF0aW5nIGEgbmV3IE51bWJlckZvcm1hdCBvYmplY3QgYXMgaWYgYnkgdGhlXG4gICAgLy8gZXhwcmVzc2lvbiBuZXcgSW50bC5OdW1iZXJGb3JtYXQoW2xvY2FsZV0sIHttaW5pbXVtSW50ZWdlckRpZ2l0czogMiwgdXNlR3JvdXBpbmc6XG4gICAgLy8gZmFsc2V9KSB3aGVyZSBJbnRsLk51bWJlckZvcm1hdCBpcyB0aGUgc3RhbmRhcmQgYnVpbHQtaW4gY29uc3RydWN0b3IgZGVmaW5lZCBpblxuICAgIC8vIDExLjEuMy5cbiAgICB2YXIgbmYyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KFtsb2NhbGVdLCB7IG1pbmltdW1JbnRlZ2VyRGlnaXRzOiAyLCB1c2VHcm91cGluZzogZmFsc2UgfSk7XG5cbiAgICAvLyA1LiBMZXQgdG0gYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBUb0xvY2FsVGltZSBhYnN0cmFjdCBvcGVyYXRpb24gKGRlZmluZWRcbiAgICAvLyBiZWxvdykgd2l0aCB4LCB0aGUgdmFsdWUgb2YgdGhlIFtbY2FsZW5kYXJdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZiBkYXRlVGltZUZvcm1hdCxcbiAgICAvLyBhbmQgdGhlIHZhbHVlIG9mIHRoZSBbW3RpbWVab25lXV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQuXG4gICAgdmFyIHRtID0gVG9Mb2NhbFRpbWUoeCwgaW50ZXJuYWxbJ1tbY2FsZW5kYXJdXSddLCBpbnRlcm5hbFsnW1t0aW1lWm9uZV1dJ10pO1xuXG4gICAgLy8gNi4gTGV0IHJlc3VsdCBiZSB0aGUgdmFsdWUgb2YgdGhlIFtbcGF0dGVybl1dIGludGVybmFsIHByb3BlcnR5IG9mIGRhdGVUaW1lRm9ybWF0LlxuICAgIHZhciBwYXR0ZXJuID0gaW50ZXJuYWxbJ1tbcGF0dGVybl1dJ107XG5cbiAgICAvLyA3LlxuICAgIHZhciByZXN1bHQgPSBuZXcgTGlzdCgpO1xuXG4gICAgLy8gOC5cbiAgICB2YXIgaW5kZXggPSAwO1xuXG4gICAgLy8gOS5cbiAgICB2YXIgYmVnaW5JbmRleCA9IHBhdHRlcm4uaW5kZXhPZigneycpO1xuXG4gICAgLy8gMTAuXG4gICAgdmFyIGVuZEluZGV4ID0gMDtcblxuICAgIC8vIE5lZWQgdGhlIGxvY2FsZSBtaW51cyBhbnkgZXh0ZW5zaW9uc1xuICAgIHZhciBkYXRhTG9jYWxlID0gaW50ZXJuYWxbJ1tbZGF0YUxvY2FsZV1dJ107XG5cbiAgICAvLyBOZWVkIHRoZSBjYWxlbmRhciBkYXRhIGZyb20gQ0xEUlxuICAgIHZhciBsb2NhbGVEYXRhID0gaW50ZXJuYWxzLkRhdGVUaW1lRm9ybWF0WydbW2xvY2FsZURhdGFdXSddW2RhdGFMb2NhbGVdLmNhbGVuZGFycztcbiAgICB2YXIgY2EgPSBpbnRlcm5hbFsnW1tjYWxlbmRhcl1dJ107XG5cbiAgICAvLyAxMS5cbiAgICB3aGlsZSAoYmVnaW5JbmRleCAhPT0gLTEpIHtcbiAgICAgICAgdmFyIGZ2ID0gdm9pZCAwO1xuICAgICAgICAvLyBhLlxuICAgICAgICBlbmRJbmRleCA9IHBhdHRlcm4uaW5kZXhPZignfScsIGJlZ2luSW5kZXgpO1xuICAgICAgICAvLyBiLlxuICAgICAgICBpZiAoZW5kSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuY2xvc2VkIHBhdHRlcm4nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjLlxuICAgICAgICBpZiAoYmVnaW5JbmRleCA+IGluZGV4KSB7XG4gICAgICAgICAgICBhcnJQdXNoLmNhbGwocmVzdWx0LCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2xpdGVyYWwnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBwYXR0ZXJuLnN1YnN0cmluZyhpbmRleCwgYmVnaW5JbmRleClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGQuXG4gICAgICAgIHZhciBwID0gcGF0dGVybi5zdWJzdHJpbmcoYmVnaW5JbmRleCArIDEsIGVuZEluZGV4KTtcbiAgICAgICAgLy8gZS5cbiAgICAgICAgaWYgKGRhdGVUaW1lQ29tcG9uZW50cy5oYXNPd25Qcm9wZXJ0eShwKSkge1xuICAgICAgICAgICAgLy8gICBpLiBMZXQgZiBiZSB0aGUgdmFsdWUgb2YgdGhlIFtbPHA+XV0gaW50ZXJuYWwgcHJvcGVydHkgb2YgZGF0ZVRpbWVGb3JtYXQuXG4gICAgICAgICAgICB2YXIgZiA9IGludGVybmFsWydbWycgKyBwICsgJ11dJ107XG4gICAgICAgICAgICAvLyAgaWkuIExldCB2IGJlIHRoZSB2YWx1ZSBvZiB0bS5bWzxwPl1dLlxuICAgICAgICAgICAgdmFyIHYgPSB0bVsnW1snICsgcCArICddXSddO1xuICAgICAgICAgICAgLy8gaWlpLiBJZiBwIGlzIFwieWVhclwiIGFuZCB2IOKJpCAwLCB0aGVuIGxldCB2IGJlIDEgLSB2LlxuICAgICAgICAgICAgaWYgKHAgPT09ICd5ZWFyJyAmJiB2IDw9IDApIHtcbiAgICAgICAgICAgICAgICB2ID0gMSAtIHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAgaXYuIElmIHAgaXMgXCJtb250aFwiLCB0aGVuIGluY3JlYXNlIHYgYnkgMS5cbiAgICAgICAgICAgIGVsc2UgaWYgKHAgPT09ICdtb250aCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdisrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgIHYuIElmIHAgaXMgXCJob3VyXCIgYW5kIHRoZSB2YWx1ZSBvZiB0aGUgW1tob3VyMTJdXSBpbnRlcm5hbCBwcm9wZXJ0eSBvZlxuICAgICAgICAgICAgICAgIC8vICAgICAgZGF0ZVRpbWVGb3JtYXQgaXMgdHJ1ZSwgdGhlblxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHAgPT09ICdob3VyJyAmJiBpbnRlcm5hbFsnW1tob3VyMTJdXSddID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiBMZXQgdiBiZSB2IG1vZHVsbyAxMi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHYgPSB2ICUgMTI7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiBJZiB2IGlzIDAgYW5kIHRoZSB2YWx1ZSBvZiB0aGUgW1tob3VyTm8wXV0gaW50ZXJuYWwgcHJvcGVydHkgb2ZcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgIGRhdGVUaW1lRm9ybWF0IGlzIHRydWUsIHRoZW4gbGV0IHYgYmUgMTIuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodiA9PT0gMCAmJiBpbnRlcm5hbFsnW1tob3VyTm8wXV0nXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYgPSAxMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAgdmkuIElmIGYgaXMgXCJudW1lcmljXCIsIHRoZW5cbiAgICAgICAgICAgIGlmIChmID09PSAnbnVtZXJpYycpIHtcbiAgICAgICAgICAgICAgICAvLyAxLiBMZXQgZnYgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBGb3JtYXROdW1iZXIgYWJzdHJhY3Qgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgLy8gICAgKGRlZmluZWQgaW4gMTEuMy4yKSB3aXRoIGFyZ3VtZW50cyBuZiBhbmQgdi5cbiAgICAgICAgICAgICAgICBmdiA9IEZvcm1hdE51bWJlcihuZiwgdik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB2aWkuIEVsc2UgaWYgZiBpcyBcIjItZGlnaXRcIiwgdGhlblxuICAgICAgICAgICAgZWxzZSBpZiAoZiA9PT0gJzItZGlnaXQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIDEuIExldCBmdiBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEZvcm1hdE51bWJlciBhYnN0cmFjdCBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgLy8gICAgd2l0aCBhcmd1bWVudHMgbmYyIGFuZCB2LlxuICAgICAgICAgICAgICAgICAgICBmdiA9IEZvcm1hdE51bWJlcihuZjIsIHYpO1xuICAgICAgICAgICAgICAgICAgICAvLyAyLiBJZiB0aGUgbGVuZ3RoIG9mIGZ2IGlzIGdyZWF0ZXIgdGhhbiAyLCBsZXQgZnYgYmUgdGhlIHN1YnN0cmluZyBvZiBmdlxuICAgICAgICAgICAgICAgICAgICAvLyAgICBjb250YWluaW5nIHRoZSBsYXN0IHR3byBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgICAgICBpZiAoZnYubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnYgPSBmdi5zbGljZSgtMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gdmlpaS4gRWxzZSBpZiBmIGlzIFwibmFycm93XCIsIFwic2hvcnRcIiwgb3IgXCJsb25nXCIsIHRoZW4gbGV0IGZ2IGJlIGEgU3RyaW5nXG4gICAgICAgICAgICAgICAgLy8gICAgIHZhbHVlIHJlcHJlc2VudGluZyBmIGluIHRoZSBkZXNpcmVkIGZvcm07IHRoZSBTdHJpbmcgdmFsdWUgZGVwZW5kcyB1cG9uXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoZSBpbXBsZW1lbnRhdGlvbiBhbmQgdGhlIGVmZmVjdGl2ZSBsb2NhbGUgYW5kIGNhbGVuZGFyIG9mXG4gICAgICAgICAgICAgICAgLy8gICAgIGRhdGVUaW1lRm9ybWF0LiBJZiBwIGlzIFwibW9udGhcIiwgdGhlbiB0aGUgU3RyaW5nIHZhbHVlIG1heSBhbHNvIGRlcGVuZFxuICAgICAgICAgICAgICAgIC8vICAgICBvbiB3aGV0aGVyIGRhdGVUaW1lRm9ybWF0IGhhcyBhIFtbZGF5XV0gaW50ZXJuYWwgcHJvcGVydHkuIElmIHAgaXNcbiAgICAgICAgICAgICAgICAvLyAgICAgXCJ0aW1lWm9uZU5hbWVcIiwgdGhlbiB0aGUgU3RyaW5nIHZhbHVlIG1heSBhbHNvIGRlcGVuZCBvbiB0aGUgdmFsdWUgb2ZcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhlIFtbaW5EU1RdXSBmaWVsZCBvZiB0bS5cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChmIGluIGRhdGVXaWR0aHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAocCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRoJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnYgPSByZXNvbHZlRGF0ZVN0cmluZyhsb2NhbGVEYXRhLCBjYSwgJ21vbnRocycsIGYsIHRtWydbWycgKyBwICsgJ11dJ10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3dlZWtkYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnYgPSByZXNvbHZlRGF0ZVN0cmluZyhsb2NhbGVEYXRhLCBjYSwgJ2RheXMnLCBmLCB0bVsnW1snICsgcCArICddXSddKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZ2ID0gcmVzb2x2ZURhdGVTdHJpbmcoY2EuZGF5cywgZilbdG1bJ1tbJysgcCArJ11dJ11dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHdlZWtkYXkgZGF0YSBmb3IgbG9jYWxlICcgKyBsb2NhbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAndGltZVpvbmVOYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnYgPSAnJzsgLy8gIyMjVE9ET1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VyYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdiA9IHJlc29sdmVEYXRlU3RyaW5nKGxvY2FsZURhdGEsIGNhLCAnZXJhcycsIGYsIHRtWydbWycgKyBwICsgJ11dJ10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIGVyYSBkYXRhIGZvciBsb2NhbGUgJyArIGxvY2FsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdiA9IHRtWydbWycgKyBwICsgJ11dJ107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGl4XG4gICAgICAgICAgICBhcnJQdXNoLmNhbGwocmVzdWx0LCB7XG4gICAgICAgICAgICAgICAgdHlwZTogcCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZnZcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gZi5cbiAgICAgICAgfSBlbHNlIGlmIChwID09PSAnYW1wbScpIHtcbiAgICAgICAgICAgICAgICAvLyBpLlxuICAgICAgICAgICAgICAgIHZhciBfdiA9IHRtWydbW2hvdXJdXSddO1xuICAgICAgICAgICAgICAgIC8vIGlpLi9paWkuXG4gICAgICAgICAgICAgICAgZnYgPSByZXNvbHZlRGF0ZVN0cmluZyhsb2NhbGVEYXRhLCBjYSwgJ2RheVBlcmlvZHMnLCBfdiA+IDExID8gJ3BtJyA6ICdhbScsIG51bGwpO1xuICAgICAgICAgICAgICAgIC8vIGl2LlxuICAgICAgICAgICAgICAgIGFyclB1c2guY2FsbChyZXN1bHQsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RheVBlcmlvZCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmdlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGcuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcnJQdXNoLmNhbGwocmVzdWx0LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbGl0ZXJhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGF0dGVybi5zdWJzdHJpbmcoYmVnaW5JbmRleCwgZW5kSW5kZXggKyAxKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIC8vIGguXG4gICAgICAgIGluZGV4ID0gZW5kSW5kZXggKyAxO1xuICAgICAgICAvLyBpLlxuICAgICAgICBiZWdpbkluZGV4ID0gcGF0dGVybi5pbmRleE9mKCd7JywgaW5kZXgpO1xuICAgIH1cbiAgICAvLyAxMi5cbiAgICBpZiAoZW5kSW5kZXggPCBwYXR0ZXJuLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgYXJyUHVzaC5jYWxsKHJlc3VsdCwge1xuICAgICAgICAgICAgdHlwZTogJ2xpdGVyYWwnLFxuICAgICAgICAgICAgdmFsdWU6IHBhdHRlcm4uc3Vic3RyKGVuZEluZGV4ICsgMSlcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIDEzLlxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgRm9ybWF0RGF0ZVRpbWUgYWJzdHJhY3Qgb3BlcmF0aW9uIGlzIGNhbGxlZCB3aXRoIGFyZ3VtZW50cyBkYXRlVGltZUZvcm1hdFxuICogKHdoaWNoIG11c3QgYmUgYW4gb2JqZWN0IGluaXRpYWxpemVkIGFzIGEgRGF0ZVRpbWVGb3JtYXQpIGFuZCB4ICh3aGljaCBtdXN0IGJlIGEgTnVtYmVyXG4gKiB2YWx1ZSksIGl0IHJldHVybnMgYSBTdHJpbmcgdmFsdWUgcmVwcmVzZW50aW5nIHggKGludGVycHJldGVkIGFzIGEgdGltZSB2YWx1ZSBhc1xuICogc3BlY2lmaWVkIGluIEVTNSwgMTUuOS4xLjEpIGFjY29yZGluZyB0byB0aGUgZWZmZWN0aXZlIGxvY2FsZSBhbmQgdGhlIGZvcm1hdHRpbmdcbiAqIG9wdGlvbnMgb2YgZGF0ZVRpbWVGb3JtYXQuXG4gKi9cbmZ1bmN0aW9uIEZvcm1hdERhdGVUaW1lKGRhdGVUaW1lRm9ybWF0LCB4KSB7XG4gICAgdmFyIHBhcnRzID0gQ3JlYXRlRGF0ZVRpbWVQYXJ0cyhkYXRlVGltZUZvcm1hdCwgeCk7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IHBhcnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICByZXN1bHQgKz0gcGFydC52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gRm9ybWF0VG9QYXJ0c0RhdGVUaW1lKGRhdGVUaW1lRm9ybWF0LCB4KSB7XG4gICAgdmFyIHBhcnRzID0gQ3JlYXRlRGF0ZVRpbWVQYXJ0cyhkYXRlVGltZUZvcm1hdCwgeCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBwYXJ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgdHlwZTogcGFydC50eXBlLFxuICAgICAgICAgICAgdmFsdWU6IHBhcnQudmFsdWVcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgVG9Mb2NhbFRpbWUgYWJzdHJhY3Qgb3BlcmF0aW9uIGlzIGNhbGxlZCB3aXRoIGFyZ3VtZW50cyBkYXRlLCBjYWxlbmRhciwgYW5kXG4gKiB0aW1lWm9uZSwgdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbmZ1bmN0aW9uIFRvTG9jYWxUaW1lKGRhdGUsIGNhbGVuZGFyLCB0aW1lWm9uZSkge1xuICAgIC8vIDEuIEFwcGx5IGNhbGVuZHJpY2FsIGNhbGN1bGF0aW9ucyBvbiBkYXRlIGZvciB0aGUgZ2l2ZW4gY2FsZW5kYXIgYW5kIHRpbWUgem9uZSB0b1xuICAgIC8vICAgIHByb2R1Y2Ugd2Vla2RheSwgZXJhLCB5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgYW5kIGluRFNUIHZhbHVlcy5cbiAgICAvLyAgICBUaGUgY2FsY3VsYXRpb25zIHNob3VsZCB1c2UgYmVzdCBhdmFpbGFibGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwZWNpZmllZFxuICAgIC8vICAgIGNhbGVuZGFyIGFuZCB0aW1lIHpvbmUuIElmIHRoZSBjYWxlbmRhciBpcyBcImdyZWdvcnlcIiwgdGhlbiB0aGUgY2FsY3VsYXRpb25zIG11c3RcbiAgICAvLyAgICBtYXRjaCB0aGUgYWxnb3JpdGhtcyBzcGVjaWZpZWQgaW4gRVM1LCAxNS45LjEsIGV4Y2VwdCB0aGF0IGNhbGN1bGF0aW9ucyBhcmUgbm90XG4gICAgLy8gICAgYm91bmQgYnkgdGhlIHJlc3RyaWN0aW9ucyBvbiB0aGUgdXNlIG9mIGJlc3QgYXZhaWxhYmxlIGluZm9ybWF0aW9uIG9uIHRpbWUgem9uZXNcbiAgICAvLyAgICBmb3IgbG9jYWwgdGltZSB6b25lIGFkanVzdG1lbnQgYW5kIGRheWxpZ2h0IHNhdmluZyB0aW1lIGFkanVzdG1lbnQgaW1wb3NlZCBieVxuICAgIC8vICAgIEVTNSwgMTUuOS4xLjcgYW5kIDE1LjkuMS44LlxuICAgIC8vICMjI1RPRE8jIyNcbiAgICB2YXIgZCA9IG5ldyBEYXRlKGRhdGUpLFxuICAgICAgICBtID0gJ2dldCcgKyAodGltZVpvbmUgfHwgJycpO1xuXG4gICAgLy8gMi4gUmV0dXJuIGEgUmVjb3JkIHdpdGggZmllbGRzIFtbd2Vla2RheV1dLCBbW2VyYV1dLCBbW3llYXJdXSwgW1ttb250aF1dLCBbW2RheV1dLFxuICAgIC8vICAgIFtbaG91cl1dLCBbW21pbnV0ZV1dLCBbW3NlY29uZF1dLCBhbmQgW1tpbkRTVF1dLCBlYWNoIHdpdGggdGhlIGNvcnJlc3BvbmRpbmdcbiAgICAvLyAgICBjYWxjdWxhdGVkIHZhbHVlLlxuICAgIHJldHVybiBuZXcgUmVjb3JkKHtcbiAgICAgICAgJ1tbd2Vla2RheV1dJzogZFttICsgJ0RheSddKCksXG4gICAgICAgICdbW2VyYV1dJzogKyhkW20gKyAnRnVsbFllYXInXSgpID49IDApLFxuICAgICAgICAnW1t5ZWFyXV0nOiBkW20gKyAnRnVsbFllYXInXSgpLFxuICAgICAgICAnW1ttb250aF1dJzogZFttICsgJ01vbnRoJ10oKSxcbiAgICAgICAgJ1tbZGF5XV0nOiBkW20gKyAnRGF0ZSddKCksXG4gICAgICAgICdbW2hvdXJdXSc6IGRbbSArICdIb3VycyddKCksXG4gICAgICAgICdbW21pbnV0ZV1dJzogZFttICsgJ01pbnV0ZXMnXSgpLFxuICAgICAgICAnW1tzZWNvbmRdXSc6IGRbbSArICdTZWNvbmRzJ10oKSxcbiAgICAgICAgJ1tbaW5EU1RdXSc6IGZhbHNlIH0pO1xufVxuXG4vKipcbiAqIFRoZSBmdW5jdGlvbiByZXR1cm5zIGEgbmV3IG9iamVjdCB3aG9zZSBwcm9wZXJ0aWVzIGFuZCBhdHRyaWJ1dGVzIGFyZSBzZXQgYXMgaWZcbiAqIGNvbnN0cnVjdGVkIGJ5IGFuIG9iamVjdCBsaXRlcmFsIGFzc2lnbmluZyB0byBlYWNoIG9mIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyB0aGVcbiAqIHZhbHVlIG9mIHRoZSBjb3JyZXNwb25kaW5nIGludGVybmFsIHByb3BlcnR5IG9mIHRoaXMgRGF0ZVRpbWVGb3JtYXQgb2JqZWN0IChzZWUgMTIuNCk6XG4gKiBsb2NhbGUsIGNhbGVuZGFyLCBudW1iZXJpbmdTeXN0ZW0sIHRpbWVab25lLCBob3VyMTIsIHdlZWtkYXksIGVyYSwgeWVhciwgbW9udGgsIGRheSxcbiAqIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBhbmQgdGltZVpvbmVOYW1lLiBQcm9wZXJ0aWVzIHdob3NlIGNvcnJlc3BvbmRpbmcgaW50ZXJuYWxcbiAqIHByb3BlcnRpZXMgYXJlIG5vdCBwcmVzZW50IGFyZSBub3QgYXNzaWduZWQuXG4gKi9cbi8qIDEyLjMuMyAqLyAvLyAjIyNUT0RPIyMjXG5kZWZpbmVQcm9wZXJ0eShJbnRsLkRhdGVUaW1lRm9ybWF0LnByb3RvdHlwZSwgJ3Jlc29sdmVkT3B0aW9ucycsIHtcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHZhbHVlKCkge1xuICAgICAgICB2YXIgcHJvcCA9IHZvaWQgMCxcbiAgICAgICAgICAgIGRlc2NzID0gbmV3IFJlY29yZCgpLFxuICAgICAgICAgICAgcHJvcHMgPSBbJ2xvY2FsZScsICdjYWxlbmRhcicsICdudW1iZXJpbmdTeXN0ZW0nLCAndGltZVpvbmUnLCAnaG91cjEyJywgJ3dlZWtkYXknLCAnZXJhJywgJ3llYXInLCAnbW9udGgnLCAnZGF5JywgJ2hvdXInLCAnbWludXRlJywgJ3NlY29uZCcsICd0aW1lWm9uZU5hbWUnXSxcbiAgICAgICAgICAgIGludGVybmFsID0gdGhpcyAhPT0gbnVsbCAmJiBiYWJlbEhlbHBlcnNbXCJ0eXBlb2ZcIl0odGhpcykgPT09ICdvYmplY3QnICYmIGdldEludGVybmFsUHJvcGVydGllcyh0aGlzKTtcblxuICAgICAgICAvLyBTYXRpc2Z5IHRlc3QgMTIuM19iXG4gICAgICAgIGlmICghaW50ZXJuYWwgfHwgIWludGVybmFsWydbW2luaXRpYWxpemVkRGF0ZVRpbWVGb3JtYXRdXSddKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdGhpc2AgdmFsdWUgZm9yIHJlc29sdmVkT3B0aW9ucygpIGlzIG5vdCBhbiBpbml0aWFsaXplZCBJbnRsLkRhdGVUaW1lRm9ybWF0IG9iamVjdC4nKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbWF4ID0gcHJvcHMubGVuZ3RoOyBpIDwgbWF4OyBpKyspIHtcbiAgICAgICAgICAgIGlmIChob3AuY2FsbChpbnRlcm5hbCwgcHJvcCA9ICdbWycgKyBwcm9wc1tpXSArICddXScpKSBkZXNjc1twcm9wc1tpXV0gPSB7IHZhbHVlOiBpbnRlcm5hbFtwcm9wXSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgZW51bWVyYWJsZTogdHJ1ZSB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9iakNyZWF0ZSh7fSwgZGVzY3MpO1xuICAgIH1cbn0pO1xuXG52YXIgbHMgPSBJbnRsLl9fbG9jYWxlU2Vuc2l0aXZlUHJvdG9zID0ge1xuICAgIE51bWJlcjoge30sXG4gICAgRGF0ZToge31cbn07XG5cbi8qKlxuICogV2hlbiB0aGUgdG9Mb2NhbGVTdHJpbmcgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cyBsb2NhbGVzIGFuZCBvcHRpb25zLFxuICogdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbi8qIDEzLjIuMSAqL2xzLk51bWJlci50b0xvY2FsZVN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBTYXRpc2Z5IHRlc3QgMTMuMi4xXzFcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMpICE9PSAnW29iamVjdCBOdW1iZXJdJykgdGhyb3cgbmV3IFR5cGVFcnJvcignYHRoaXNgIHZhbHVlIG11c3QgYmUgYSBudW1iZXIgZm9yIE51bWJlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcoKScpO1xuXG4gICAgLy8gMS4gTGV0IHggYmUgdGhpcyBOdW1iZXIgdmFsdWUgKGFzIGRlZmluZWQgaW4gRVM1LCAxNS43LjQpLlxuICAgIC8vIDIuIElmIGxvY2FsZXMgaXMgbm90IHByb3ZpZGVkLCB0aGVuIGxldCBsb2NhbGVzIGJlIHVuZGVmaW5lZC5cbiAgICAvLyAzLiBJZiBvcHRpb25zIGlzIG5vdCBwcm92aWRlZCwgdGhlbiBsZXQgb3B0aW9ucyBiZSB1bmRlZmluZWQuXG4gICAgLy8gNC4gTGV0IG51bWJlckZvcm1hdCBiZSB0aGUgcmVzdWx0IG9mIGNyZWF0aW5nIGEgbmV3IG9iamVjdCBhcyBpZiBieSB0aGVcbiAgICAvLyAgICBleHByZXNzaW9uIG5ldyBJbnRsLk51bWJlckZvcm1hdChsb2NhbGVzLCBvcHRpb25zKSB3aGVyZVxuICAgIC8vICAgIEludGwuTnVtYmVyRm9ybWF0IGlzIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBjb25zdHJ1Y3RvciBkZWZpbmVkIGluIDExLjEuMy5cbiAgICAvLyA1LiBSZXR1cm4gdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBGb3JtYXROdW1iZXIgYWJzdHJhY3Qgb3BlcmF0aW9uXG4gICAgLy8gICAgKGRlZmluZWQgaW4gMTEuMy4yKSB3aXRoIGFyZ3VtZW50cyBudW1iZXJGb3JtYXQgYW5kIHguXG4gICAgcmV0dXJuIEZvcm1hdE51bWJlcihuZXcgTnVtYmVyRm9ybWF0Q29uc3RydWN0b3IoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pLCB0aGlzKTtcbn07XG5cbi8qKlxuICogV2hlbiB0aGUgdG9Mb2NhbGVTdHJpbmcgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cyBsb2NhbGVzIGFuZCBvcHRpb25zLFxuICogdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbi8qIDEzLjMuMSAqL2xzLkRhdGUudG9Mb2NhbGVTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gU2F0aXNmeSB0ZXN0IDEzLjMuMF8xXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzKSAhPT0gJ1tvYmplY3QgRGF0ZV0nKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdGhpc2AgdmFsdWUgbXVzdCBiZSBhIERhdGUgaW5zdGFuY2UgZm9yIERhdGUucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nKCknKTtcblxuICAgIC8vIDEuIExldCB4IGJlIHRoaXMgdGltZSB2YWx1ZSAoYXMgZGVmaW5lZCBpbiBFUzUsIDE1LjkuNSkuXG4gICAgdmFyIHggPSArdGhpcztcblxuICAgIC8vIDIuIElmIHggaXMgTmFOLCB0aGVuIHJldHVybiBcIkludmFsaWQgRGF0ZVwiLlxuICAgIGlmIChpc05hTih4KSkgcmV0dXJuICdJbnZhbGlkIERhdGUnO1xuXG4gICAgLy8gMy4gSWYgbG9jYWxlcyBpcyBub3QgcHJvdmlkZWQsIHRoZW4gbGV0IGxvY2FsZXMgYmUgdW5kZWZpbmVkLlxuICAgIHZhciBsb2NhbGVzID0gYXJndW1lbnRzWzBdO1xuXG4gICAgLy8gNC4gSWYgb3B0aW9ucyBpcyBub3QgcHJvdmlkZWQsIHRoZW4gbGV0IG9wdGlvbnMgYmUgdW5kZWZpbmVkLlxuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdO1xuXG4gICAgLy8gNS4gTGV0IG9wdGlvbnMgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBUb0RhdGVUaW1lT3B0aW9ucyBhYnN0cmFjdFxuICAgIC8vICAgIG9wZXJhdGlvbiAoZGVmaW5lZCBpbiAxMi4xLjEpIHdpdGggYXJndW1lbnRzIG9wdGlvbnMsIFwiYW55XCIsIGFuZCBcImFsbFwiLlxuICAgIG9wdGlvbnMgPSBUb0RhdGVUaW1lT3B0aW9ucyhvcHRpb25zLCAnYW55JywgJ2FsbCcpO1xuXG4gICAgLy8gNi4gTGV0IGRhdGVUaW1lRm9ybWF0IGJlIHRoZSByZXN1bHQgb2YgY3JlYXRpbmcgYSBuZXcgb2JqZWN0IGFzIGlmIGJ5IHRoZVxuICAgIC8vICAgIGV4cHJlc3Npb24gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG9jYWxlcywgb3B0aW9ucykgd2hlcmVcbiAgICAvLyAgICBJbnRsLkRhdGVUaW1lRm9ybWF0IGlzIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBjb25zdHJ1Y3RvciBkZWZpbmVkIGluIDEyLjEuMy5cbiAgICB2YXIgZGF0ZVRpbWVGb3JtYXQgPSBuZXcgRGF0ZVRpbWVGb3JtYXRDb25zdHJ1Y3Rvcihsb2NhbGVzLCBvcHRpb25zKTtcblxuICAgIC8vIDcuIFJldHVybiB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEZvcm1hdERhdGVUaW1lIGFic3RyYWN0IG9wZXJhdGlvbiAoZGVmaW5lZFxuICAgIC8vICAgIGluIDEyLjMuMikgd2l0aCBhcmd1bWVudHMgZGF0ZVRpbWVGb3JtYXQgYW5kIHguXG4gICAgcmV0dXJuIEZvcm1hdERhdGVUaW1lKGRhdGVUaW1lRm9ybWF0LCB4KTtcbn07XG5cbi8qKlxuICogV2hlbiB0aGUgdG9Mb2NhbGVEYXRlU3RyaW5nIG1ldGhvZCBpcyBjYWxsZWQgd2l0aCBvcHRpb25hbCBhcmd1bWVudHMgbG9jYWxlcyBhbmRcbiAqIG9wdGlvbnMsIHRoZSBmb2xsb3dpbmcgc3RlcHMgYXJlIHRha2VuOlxuICovXG4vKiAxMy4zLjIgKi9scy5EYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBTYXRpc2Z5IHRlc3QgMTMuMy4wXzFcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMpICE9PSAnW29iamVjdCBEYXRlXScpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2B0aGlzYCB2YWx1ZSBtdXN0IGJlIGEgRGF0ZSBpbnN0YW5jZSBmb3IgRGF0ZS5wcm90b3R5cGUudG9Mb2NhbGVEYXRlU3RyaW5nKCknKTtcblxuICAgIC8vIDEuIExldCB4IGJlIHRoaXMgdGltZSB2YWx1ZSAoYXMgZGVmaW5lZCBpbiBFUzUsIDE1LjkuNSkuXG4gICAgdmFyIHggPSArdGhpcztcblxuICAgIC8vIDIuIElmIHggaXMgTmFOLCB0aGVuIHJldHVybiBcIkludmFsaWQgRGF0ZVwiLlxuICAgIGlmIChpc05hTih4KSkgcmV0dXJuICdJbnZhbGlkIERhdGUnO1xuXG4gICAgLy8gMy4gSWYgbG9jYWxlcyBpcyBub3QgcHJvdmlkZWQsIHRoZW4gbGV0IGxvY2FsZXMgYmUgdW5kZWZpbmVkLlxuICAgIHZhciBsb2NhbGVzID0gYXJndW1lbnRzWzBdLFxuXG5cbiAgICAvLyA0LiBJZiBvcHRpb25zIGlzIG5vdCBwcm92aWRlZCwgdGhlbiBsZXQgb3B0aW9ucyBiZSB1bmRlZmluZWQuXG4gICAgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXTtcblxuICAgIC8vIDUuIExldCBvcHRpb25zIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgVG9EYXRlVGltZU9wdGlvbnMgYWJzdHJhY3RcbiAgICAvLyAgICBvcGVyYXRpb24gKGRlZmluZWQgaW4gMTIuMS4xKSB3aXRoIGFyZ3VtZW50cyBvcHRpb25zLCBcImRhdGVcIiwgYW5kIFwiZGF0ZVwiLlxuICAgIG9wdGlvbnMgPSBUb0RhdGVUaW1lT3B0aW9ucyhvcHRpb25zLCAnZGF0ZScsICdkYXRlJyk7XG5cbiAgICAvLyA2LiBMZXQgZGF0ZVRpbWVGb3JtYXQgYmUgdGhlIHJlc3VsdCBvZiBjcmVhdGluZyBhIG5ldyBvYmplY3QgYXMgaWYgYnkgdGhlXG4gICAgLy8gICAgZXhwcmVzc2lvbiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdChsb2NhbGVzLCBvcHRpb25zKSB3aGVyZVxuICAgIC8vICAgIEludGwuRGF0ZVRpbWVGb3JtYXQgaXMgdGhlIHN0YW5kYXJkIGJ1aWx0LWluIGNvbnN0cnVjdG9yIGRlZmluZWQgaW4gMTIuMS4zLlxuICAgIHZhciBkYXRlVGltZUZvcm1hdCA9IG5ldyBEYXRlVGltZUZvcm1hdENvbnN0cnVjdG9yKGxvY2FsZXMsIG9wdGlvbnMpO1xuXG4gICAgLy8gNy4gUmV0dXJuIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgRm9ybWF0RGF0ZVRpbWUgYWJzdHJhY3Qgb3BlcmF0aW9uIChkZWZpbmVkXG4gICAgLy8gICAgaW4gMTIuMy4yKSB3aXRoIGFyZ3VtZW50cyBkYXRlVGltZUZvcm1hdCBhbmQgeC5cbiAgICByZXR1cm4gRm9ybWF0RGF0ZVRpbWUoZGF0ZVRpbWVGb3JtYXQsIHgpO1xufTtcblxuLyoqXG4gKiBXaGVuIHRoZSB0b0xvY2FsZVRpbWVTdHJpbmcgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cyBsb2NhbGVzIGFuZFxuICogb3B0aW9ucywgdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG4gKi9cbi8qIDEzLjMuMyAqL2xzLkRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFNhdGlzZnkgdGVzdCAxMy4zLjBfMVxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcykgIT09ICdbb2JqZWN0IERhdGVdJykgdGhyb3cgbmV3IFR5cGVFcnJvcignYHRoaXNgIHZhbHVlIG11c3QgYmUgYSBEYXRlIGluc3RhbmNlIGZvciBEYXRlLnByb3RvdHlwZS50b0xvY2FsZVRpbWVTdHJpbmcoKScpO1xuXG4gICAgLy8gMS4gTGV0IHggYmUgdGhpcyB0aW1lIHZhbHVlIChhcyBkZWZpbmVkIGluIEVTNSwgMTUuOS41KS5cbiAgICB2YXIgeCA9ICt0aGlzO1xuXG4gICAgLy8gMi4gSWYgeCBpcyBOYU4sIHRoZW4gcmV0dXJuIFwiSW52YWxpZCBEYXRlXCIuXG4gICAgaWYgKGlzTmFOKHgpKSByZXR1cm4gJ0ludmFsaWQgRGF0ZSc7XG5cbiAgICAvLyAzLiBJZiBsb2NhbGVzIGlzIG5vdCBwcm92aWRlZCwgdGhlbiBsZXQgbG9jYWxlcyBiZSB1bmRlZmluZWQuXG4gICAgdmFyIGxvY2FsZXMgPSBhcmd1bWVudHNbMF07XG5cbiAgICAvLyA0LiBJZiBvcHRpb25zIGlzIG5vdCBwcm92aWRlZCwgdGhlbiBsZXQgb3B0aW9ucyBiZSB1bmRlZmluZWQuXG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV07XG5cbiAgICAvLyA1LiBMZXQgb3B0aW9ucyBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFRvRGF0ZVRpbWVPcHRpb25zIGFic3RyYWN0XG4gICAgLy8gICAgb3BlcmF0aW9uIChkZWZpbmVkIGluIDEyLjEuMSkgd2l0aCBhcmd1bWVudHMgb3B0aW9ucywgXCJ0aW1lXCIsIGFuZCBcInRpbWVcIi5cbiAgICBvcHRpb25zID0gVG9EYXRlVGltZU9wdGlvbnMob3B0aW9ucywgJ3RpbWUnLCAndGltZScpO1xuXG4gICAgLy8gNi4gTGV0IGRhdGVUaW1lRm9ybWF0IGJlIHRoZSByZXN1bHQgb2YgY3JlYXRpbmcgYSBuZXcgb2JqZWN0IGFzIGlmIGJ5IHRoZVxuICAgIC8vICAgIGV4cHJlc3Npb24gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG9jYWxlcywgb3B0aW9ucykgd2hlcmVcbiAgICAvLyAgICBJbnRsLkRhdGVUaW1lRm9ybWF0IGlzIHRoZSBzdGFuZGFyZCBidWlsdC1pbiBjb25zdHJ1Y3RvciBkZWZpbmVkIGluIDEyLjEuMy5cbiAgICB2YXIgZGF0ZVRpbWVGb3JtYXQgPSBuZXcgRGF0ZVRpbWVGb3JtYXRDb25zdHJ1Y3Rvcihsb2NhbGVzLCBvcHRpb25zKTtcblxuICAgIC8vIDcuIFJldHVybiB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIEZvcm1hdERhdGVUaW1lIGFic3RyYWN0IG9wZXJhdGlvbiAoZGVmaW5lZFxuICAgIC8vICAgIGluIDEyLjMuMikgd2l0aCBhcmd1bWVudHMgZGF0ZVRpbWVGb3JtYXQgYW5kIHguXG4gICAgcmV0dXJuIEZvcm1hdERhdGVUaW1lKGRhdGVUaW1lRm9ybWF0LCB4KTtcbn07XG5cbmRlZmluZVByb3BlcnR5KEludGwsICdfX2FwcGx5TG9jYWxlU2Vuc2l0aXZlUHJvdG90eXBlcycsIHtcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHZhbHVlKCkge1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShOdW1iZXIucHJvdG90eXBlLCAndG9Mb2NhbGVTdHJpbmcnLCB7IHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBscy5OdW1iZXIudG9Mb2NhbGVTdHJpbmcgfSk7XG4gICAgICAgIC8vIE5lZWQgdGhpcyBoZXJlIGZvciBJRSA4LCB0byBhdm9pZCB0aGUgX0RvbnRFbnVtXyBidWdcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoRGF0ZS5wcm90b3R5cGUsICd0b0xvY2FsZVN0cmluZycsIHsgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IGxzLkRhdGUudG9Mb2NhbGVTdHJpbmcgfSk7XG5cbiAgICAgICAgZm9yICh2YXIgayBpbiBscy5EYXRlKSB7XG4gICAgICAgICAgICBpZiAoaG9wLmNhbGwobHMuRGF0ZSwgaykpIGRlZmluZVByb3BlcnR5KERhdGUucHJvdG90eXBlLCBrLCB7IHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBscy5EYXRlW2tdIH0pO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbi8qKlxuICogQ2FuJ3QgcmVhbGx5IHNoaXAgYSBzaW5nbGUgc2NyaXB0IHdpdGggZGF0YSBmb3IgaHVuZHJlZHMgb2YgbG9jYWxlcywgc28gd2UgcHJvdmlkZVxuICogdGhpcyBfX2FkZExvY2FsZURhdGEgbWV0aG9kIGFzIGEgbWVhbnMgZm9yIHRoZSBkZXZlbG9wZXIgdG8gYWRkIHRoZSBkYXRhIG9uIGFuXG4gKiBhcy1uZWVkZWQgYmFzaXNcbiAqL1xuZGVmaW5lUHJvcGVydHkoSW50bCwgJ19fYWRkTG9jYWxlRGF0YScsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24gdmFsdWUoZGF0YSkge1xuICAgICAgICBpZiAoIUlzU3RydWN0dXJhbGx5VmFsaWRMYW5ndWFnZVRhZyhkYXRhLmxvY2FsZSkpIHRocm93IG5ldyBFcnJvcihcIk9iamVjdCBwYXNzZWQgZG9lc24ndCBpZGVudGlmeSBpdHNlbGYgd2l0aCBhIHZhbGlkIGxhbmd1YWdlIHRhZ1wiKTtcblxuICAgICAgICBhZGRMb2NhbGVEYXRhKGRhdGEsIGRhdGEubG9jYWxlKTtcbiAgICB9XG59KTtcblxuZnVuY3Rpb24gYWRkTG9jYWxlRGF0YShkYXRhLCB0YWcpIHtcbiAgICAvLyBCb3RoIE51bWJlckZvcm1hdCBhbmQgRGF0ZVRpbWVGb3JtYXQgcmVxdWlyZSBudW1iZXIgZGF0YSwgc28gdGhyb3cgaWYgaXQgaXNuJ3QgcHJlc2VudFxuICAgIGlmICghZGF0YS5udW1iZXIpIHRocm93IG5ldyBFcnJvcihcIk9iamVjdCBwYXNzZWQgZG9lc24ndCBjb250YWluIGxvY2FsZSBkYXRhIGZvciBJbnRsLk51bWJlckZvcm1hdFwiKTtcblxuICAgIHZhciBsb2NhbGUgPSB2b2lkIDAsXG4gICAgICAgIGxvY2FsZXMgPSBbdGFnXSxcbiAgICAgICAgcGFydHMgPSB0YWcuc3BsaXQoJy0nKTtcblxuICAgIC8vIENyZWF0ZSBmYWxsYmFja3MgZm9yIGxvY2FsZSBkYXRhIHdpdGggc2NyaXB0cywgZS5nLiBMYXRuLCBIYW5zLCBWYWlpLCBldGNcbiAgICBpZiAocGFydHMubGVuZ3RoID4gMiAmJiBwYXJ0c1sxXS5sZW5ndGggPT09IDQpIGFyclB1c2guY2FsbChsb2NhbGVzLCBwYXJ0c1swXSArICctJyArIHBhcnRzWzJdKTtcblxuICAgIHdoaWxlIChsb2NhbGUgPSBhcnJTaGlmdC5jYWxsKGxvY2FsZXMpKSB7XG4gICAgICAgIC8vIEFkZCB0byBOdW1iZXJGb3JtYXQgaW50ZXJuYWwgcHJvcGVydGllcyBhcyBwZXIgMTEuMi4zXG4gICAgICAgIGFyclB1c2guY2FsbChpbnRlcm5hbHMuTnVtYmVyRm9ybWF0WydbW2F2YWlsYWJsZUxvY2FsZXNdXSddLCBsb2NhbGUpO1xuICAgICAgICBpbnRlcm5hbHMuTnVtYmVyRm9ybWF0WydbW2xvY2FsZURhdGFdXSddW2xvY2FsZV0gPSBkYXRhLm51bWJlcjtcblxuICAgICAgICAvLyAuLi5hbmQgRGF0ZVRpbWVGb3JtYXQgaW50ZXJuYWwgcHJvcGVydGllcyBhcyBwZXIgMTIuMi4zXG4gICAgICAgIGlmIChkYXRhLmRhdGUpIHtcbiAgICAgICAgICAgIGRhdGEuZGF0ZS5udSA9IGRhdGEubnVtYmVyLm51O1xuICAgICAgICAgICAgYXJyUHVzaC5jYWxsKGludGVybmFscy5EYXRlVGltZUZvcm1hdFsnW1thdmFpbGFibGVMb2NhbGVzXV0nXSwgbG9jYWxlKTtcbiAgICAgICAgICAgIGludGVybmFscy5EYXRlVGltZUZvcm1hdFsnW1tsb2NhbGVEYXRhXV0nXVtsb2NhbGVdID0gZGF0YS5kYXRlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBpcyB0aGUgZmlyc3Qgc2V0IG9mIGxvY2FsZSBkYXRhIGFkZGVkLCBtYWtlIGl0IHRoZSBkZWZhdWx0XG4gICAgaWYgKGRlZmF1bHRMb2NhbGUgPT09IHVuZGVmaW5lZCkgc2V0RGVmYXVsdExvY2FsZSh0YWcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEludGw7IiwiSW50bFBvbHlmaWxsLl9fYWRkTG9jYWxlRGF0YSh7bG9jYWxlOlwiZW4tVVNcIixkYXRlOntjYTpbXCJncmVnb3J5XCIsXCJidWRkaGlzdFwiLFwiY2hpbmVzZVwiLFwiY29wdGljXCIsXCJkYW5naVwiLFwiZXRoaW9hYVwiLFwiZXRoaW9waWNcIixcImdlbmVyaWNcIixcImhlYnJld1wiLFwiaW5kaWFuXCIsXCJpc2xhbWljXCIsXCJpc2xhbWljY1wiLFwiamFwYW5lc2VcIixcInBlcnNpYW5cIixcInJvY1wiXSxob3VyTm8wOnRydWUsaG91cjEyOnRydWUsZm9ybWF0czp7c2hvcnQ6XCJ7MX0sIHswfVwiLG1lZGl1bTpcInsxfSwgezB9XCIsZnVsbDpcInsxfSAnYXQnIHswfVwiLGxvbmc6XCJ7MX0gJ2F0JyB7MH1cIixhdmFpbGFibGVGb3JtYXRzOntcImRcIjpcImRcIixcIkVcIjpcImNjY1wiLEVkOlwiZCBFXCIsRWhtOlwiRSBoOm1tIGFcIixFSG06XCJFIEhIOm1tXCIsRWhtczpcIkUgaDptbTpzcyBhXCIsRUhtczpcIkUgSEg6bW06c3NcIixHeTpcInkgR1wiLEd5TU1NOlwiTU1NIHkgR1wiLEd5TU1NZDpcIk1NTSBkLCB5IEdcIixHeU1NTUVkOlwiRSwgTU1NIGQsIHkgR1wiLFwiaFwiOlwiaCBhXCIsXCJIXCI6XCJISFwiLGhtOlwiaDptbSBhXCIsSG06XCJISDptbVwiLGhtczpcImg6bW06c3MgYVwiLEhtczpcIkhIOm1tOnNzXCIsaG1zdjpcImg6bW06c3MgYSB2XCIsSG1zdjpcIkhIOm1tOnNzIHZcIixobXY6XCJoOm1tIGEgdlwiLEhtdjpcIkhIOm1tIHZcIixcIk1cIjpcIkxcIixNZDpcIk0vZFwiLE1FZDpcIkUsIE0vZFwiLE1NTTpcIkxMTFwiLE1NTWQ6XCJNTU0gZFwiLE1NTUVkOlwiRSwgTU1NIGRcIixNTU1NZDpcIk1NTU0gZFwiLG1zOlwibW06c3NcIixcInlcIjpcInlcIix5TTpcIk0veVwiLHlNZDpcIk0vZC95XCIseU1FZDpcIkUsIE0vZC95XCIseU1NTTpcIk1NTSB5XCIseU1NTWQ6XCJNTU0gZCwgeVwiLHlNTU1FZDpcIkUsIE1NTSBkLCB5XCIseU1NTU06XCJNTU1NIHlcIix5UVFROlwiUVFRIHlcIix5UVFRUTpcIlFRUVEgeVwifSxkYXRlRm9ybWF0czp7eU1NTU1FRUVFZDpcIkVFRUUsIE1NTU0gZCwgeVwiLHlNTU1NZDpcIk1NTU0gZCwgeVwiLHlNTU1kOlwiTU1NIGQsIHlcIix5TWQ6XCJNL2QveXlcIn0sdGltZUZvcm1hdHM6e2htbXNzenp6ejpcImg6bW06c3MgYSB6enp6XCIsaG1zejpcImg6bW06c3MgYSB6XCIsaG1zOlwiaDptbTpzcyBhXCIsaG06XCJoOm1tIGFcIn19LGNhbGVuZGFyczp7YnVkZGhpc3Q6e21vbnRoczp7bmFycm93OltcIkpcIixcIkZcIixcIk1cIixcIkFcIixcIk1cIixcIkpcIixcIkpcIixcIkFcIixcIlNcIixcIk9cIixcIk5cIixcIkRcIl0sc2hvcnQ6W1wiSmFuXCIsXCJGZWJcIixcIk1hclwiLFwiQXByXCIsXCJNYXlcIixcIkp1blwiLFwiSnVsXCIsXCJBdWdcIixcIlNlcFwiLFwiT2N0XCIsXCJOb3ZcIixcIkRlY1wiXSxsb25nOltcIkphbnVhcnlcIixcIkZlYnJ1YXJ5XCIsXCJNYXJjaFwiLFwiQXByaWxcIixcIk1heVwiLFwiSnVuZVwiLFwiSnVseVwiLFwiQXVndXN0XCIsXCJTZXB0ZW1iZXJcIixcIk9jdG9iZXJcIixcIk5vdmVtYmVyXCIsXCJEZWNlbWJlclwiXX0sZGF5czp7bmFycm93OltcIlNcIixcIk1cIixcIlRcIixcIldcIixcIlRcIixcIkZcIixcIlNcIl0sc2hvcnQ6W1wiU3VuXCIsXCJNb25cIixcIlR1ZVwiLFwiV2VkXCIsXCJUaHVcIixcIkZyaVwiLFwiU2F0XCJdLGxvbmc6W1wiU3VuZGF5XCIsXCJNb25kYXlcIixcIlR1ZXNkYXlcIixcIldlZG5lc2RheVwiLFwiVGh1cnNkYXlcIixcIkZyaWRheVwiLFwiU2F0dXJkYXlcIl19LGVyYXM6e25hcnJvdzpbXCJCRVwiXSxzaG9ydDpbXCJCRVwiXSxsb25nOltcIkJFXCJdfSxkYXlQZXJpb2RzOnthbTpcIkFNXCIscG06XCJQTVwifX0sY2hpbmVzZTp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiXSxzaG9ydDpbXCJNbzFcIixcIk1vMlwiLFwiTW8zXCIsXCJNbzRcIixcIk1vNVwiLFwiTW82XCIsXCJNbzdcIixcIk1vOFwiLFwiTW85XCIsXCJNbzEwXCIsXCJNbzExXCIsXCJNbzEyXCJdLGxvbmc6W1wiTW9udGgxXCIsXCJNb250aDJcIixcIk1vbnRoM1wiLFwiTW9udGg0XCIsXCJNb250aDVcIixcIk1vbnRoNlwiLFwiTW9udGg3XCIsXCJNb250aDhcIixcIk1vbnRoOVwiLFwiTW9udGgxMFwiLFwiTW9udGgxMVwiLFwiTW9udGgxMlwiXX0sZGF5czp7bmFycm93OltcIlNcIixcIk1cIixcIlRcIixcIldcIixcIlRcIixcIkZcIixcIlNcIl0sc2hvcnQ6W1wiU3VuXCIsXCJNb25cIixcIlR1ZVwiLFwiV2VkXCIsXCJUaHVcIixcIkZyaVwiLFwiU2F0XCJdLGxvbmc6W1wiU3VuZGF5XCIsXCJNb25kYXlcIixcIlR1ZXNkYXlcIixcIldlZG5lc2RheVwiLFwiVGh1cnNkYXlcIixcIkZyaWRheVwiLFwiU2F0dXJkYXlcIl19LGRheVBlcmlvZHM6e2FtOlwiQU1cIixwbTpcIlBNXCJ9fSxjb3B0aWM6e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIixcIjEzXCJdLHNob3J0OltcIlRvdXRcIixcIkJhYmFcIixcIkhhdG9yXCIsXCJLaWFoa1wiLFwiVG9iYVwiLFwiQW1zaGlyXCIsXCJCYXJhbWhhdFwiLFwiQmFyYW1vdWRhXCIsXCJCYXNoYW5zXCIsXCJQYW9uYVwiLFwiRXBlcFwiLFwiTWVzcmFcIixcIk5hc2llXCJdLGxvbmc6W1wiVG91dFwiLFwiQmFiYVwiLFwiSGF0b3JcIixcIktpYWhrXCIsXCJUb2JhXCIsXCJBbXNoaXJcIixcIkJhcmFtaGF0XCIsXCJCYXJhbW91ZGFcIixcIkJhc2hhbnNcIixcIlBhb25hXCIsXCJFcGVwXCIsXCJNZXNyYVwiLFwiTmFzaWVcIl19LGRheXM6e25hcnJvdzpbXCJTXCIsXCJNXCIsXCJUXCIsXCJXXCIsXCJUXCIsXCJGXCIsXCJTXCJdLHNob3J0OltcIlN1blwiLFwiTW9uXCIsXCJUdWVcIixcIldlZFwiLFwiVGh1XCIsXCJGcmlcIixcIlNhdFwiXSxsb25nOltcIlN1bmRheVwiLFwiTW9uZGF5XCIsXCJUdWVzZGF5XCIsXCJXZWRuZXNkYXlcIixcIlRodXJzZGF5XCIsXCJGcmlkYXlcIixcIlNhdHVyZGF5XCJdfSxlcmFzOntuYXJyb3c6W1wiRVJBMFwiLFwiRVJBMVwiXSxzaG9ydDpbXCJFUkEwXCIsXCJFUkExXCJdLGxvbmc6W1wiRVJBMFwiLFwiRVJBMVwiXX0sZGF5UGVyaW9kczp7YW06XCJBTVwiLHBtOlwiUE1cIn19LGRhbmdpOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCJdLHNob3J0OltcIk1vMVwiLFwiTW8yXCIsXCJNbzNcIixcIk1vNFwiLFwiTW81XCIsXCJNbzZcIixcIk1vN1wiLFwiTW84XCIsXCJNbzlcIixcIk1vMTBcIixcIk1vMTFcIixcIk1vMTJcIl0sbG9uZzpbXCJNb250aDFcIixcIk1vbnRoMlwiLFwiTW9udGgzXCIsXCJNb250aDRcIixcIk1vbnRoNVwiLFwiTW9udGg2XCIsXCJNb250aDdcIixcIk1vbnRoOFwiLFwiTW9udGg5XCIsXCJNb250aDEwXCIsXCJNb250aDExXCIsXCJNb250aDEyXCJdfSxkYXlzOntuYXJyb3c6W1wiU1wiLFwiTVwiLFwiVFwiLFwiV1wiLFwiVFwiLFwiRlwiLFwiU1wiXSxzaG9ydDpbXCJTdW5cIixcIk1vblwiLFwiVHVlXCIsXCJXZWRcIixcIlRodVwiLFwiRnJpXCIsXCJTYXRcIl0sbG9uZzpbXCJTdW5kYXlcIixcIk1vbmRheVwiLFwiVHVlc2RheVwiLFwiV2VkbmVzZGF5XCIsXCJUaHVyc2RheVwiLFwiRnJpZGF5XCIsXCJTYXR1cmRheVwiXX0sZGF5UGVyaW9kczp7YW06XCJBTVwiLHBtOlwiUE1cIn19LGV0aGlvcGljOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCIsXCIxM1wiXSxzaG9ydDpbXCJNZXNrZXJlbVwiLFwiVGVrZW10XCIsXCJIZWRhclwiLFwiVGFoc2FzXCIsXCJUZXJcIixcIllla2F0aXRcIixcIk1lZ2FiaXRcIixcIk1pYXppYVwiLFwiR2VuYm90XCIsXCJTZW5lXCIsXCJIYW1sZVwiLFwiTmVoYXNzZVwiLFwiUGFndW1lblwiXSxsb25nOltcIk1lc2tlcmVtXCIsXCJUZWtlbXRcIixcIkhlZGFyXCIsXCJUYWhzYXNcIixcIlRlclwiLFwiWWVrYXRpdFwiLFwiTWVnYWJpdFwiLFwiTWlhemlhXCIsXCJHZW5ib3RcIixcIlNlbmVcIixcIkhhbWxlXCIsXCJOZWhhc3NlXCIsXCJQYWd1bWVuXCJdfSxkYXlzOntuYXJyb3c6W1wiU1wiLFwiTVwiLFwiVFwiLFwiV1wiLFwiVFwiLFwiRlwiLFwiU1wiXSxzaG9ydDpbXCJTdW5cIixcIk1vblwiLFwiVHVlXCIsXCJXZWRcIixcIlRodVwiLFwiRnJpXCIsXCJTYXRcIl0sbG9uZzpbXCJTdW5kYXlcIixcIk1vbmRheVwiLFwiVHVlc2RheVwiLFwiV2VkbmVzZGF5XCIsXCJUaHVyc2RheVwiLFwiRnJpZGF5XCIsXCJTYXR1cmRheVwiXX0sZXJhczp7bmFycm93OltcIkVSQTBcIixcIkVSQTFcIl0sc2hvcnQ6W1wiRVJBMFwiLFwiRVJBMVwiXSxsb25nOltcIkVSQTBcIixcIkVSQTFcIl19LGRheVBlcmlvZHM6e2FtOlwiQU1cIixwbTpcIlBNXCJ9fSxldGhpb2FhOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCIsXCIxM1wiXSxzaG9ydDpbXCJNZXNrZXJlbVwiLFwiVGVrZW10XCIsXCJIZWRhclwiLFwiVGFoc2FzXCIsXCJUZXJcIixcIllla2F0aXRcIixcIk1lZ2FiaXRcIixcIk1pYXppYVwiLFwiR2VuYm90XCIsXCJTZW5lXCIsXCJIYW1sZVwiLFwiTmVoYXNzZVwiLFwiUGFndW1lblwiXSxsb25nOltcIk1lc2tlcmVtXCIsXCJUZWtlbXRcIixcIkhlZGFyXCIsXCJUYWhzYXNcIixcIlRlclwiLFwiWWVrYXRpdFwiLFwiTWVnYWJpdFwiLFwiTWlhemlhXCIsXCJHZW5ib3RcIixcIlNlbmVcIixcIkhhbWxlXCIsXCJOZWhhc3NlXCIsXCJQYWd1bWVuXCJdfSxkYXlzOntuYXJyb3c6W1wiU1wiLFwiTVwiLFwiVFwiLFwiV1wiLFwiVFwiLFwiRlwiLFwiU1wiXSxzaG9ydDpbXCJTdW5cIixcIk1vblwiLFwiVHVlXCIsXCJXZWRcIixcIlRodVwiLFwiRnJpXCIsXCJTYXRcIl0sbG9uZzpbXCJTdW5kYXlcIixcIk1vbmRheVwiLFwiVHVlc2RheVwiLFwiV2VkbmVzZGF5XCIsXCJUaHVyc2RheVwiLFwiRnJpZGF5XCIsXCJTYXR1cmRheVwiXX0sZXJhczp7bmFycm93OltcIkVSQTBcIl0sc2hvcnQ6W1wiRVJBMFwiXSxsb25nOltcIkVSQTBcIl19LGRheVBlcmlvZHM6e2FtOlwiQU1cIixwbTpcIlBNXCJ9fSxnZW5lcmljOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCJdLHNob3J0OltcIk0wMVwiLFwiTTAyXCIsXCJNMDNcIixcIk0wNFwiLFwiTTA1XCIsXCJNMDZcIixcIk0wN1wiLFwiTTA4XCIsXCJNMDlcIixcIk0xMFwiLFwiTTExXCIsXCJNMTJcIl0sbG9uZzpbXCJNMDFcIixcIk0wMlwiLFwiTTAzXCIsXCJNMDRcIixcIk0wNVwiLFwiTTA2XCIsXCJNMDdcIixcIk0wOFwiLFwiTTA5XCIsXCJNMTBcIixcIk0xMVwiLFwiTTEyXCJdfSxkYXlzOntuYXJyb3c6W1wiU1wiLFwiTVwiLFwiVFwiLFwiV1wiLFwiVFwiLFwiRlwiLFwiU1wiXSxzaG9ydDpbXCJTdW5cIixcIk1vblwiLFwiVHVlXCIsXCJXZWRcIixcIlRodVwiLFwiRnJpXCIsXCJTYXRcIl0sbG9uZzpbXCJTdW5kYXlcIixcIk1vbmRheVwiLFwiVHVlc2RheVwiLFwiV2VkbmVzZGF5XCIsXCJUaHVyc2RheVwiLFwiRnJpZGF5XCIsXCJTYXR1cmRheVwiXX0sZXJhczp7bmFycm93OltcIkVSQTBcIixcIkVSQTFcIl0sc2hvcnQ6W1wiRVJBMFwiLFwiRVJBMVwiXSxsb25nOltcIkVSQTBcIixcIkVSQTFcIl19LGRheVBlcmlvZHM6e2FtOlwiQU1cIixwbTpcIlBNXCJ9fSxncmVnb3J5Onttb250aHM6e25hcnJvdzpbXCJKXCIsXCJGXCIsXCJNXCIsXCJBXCIsXCJNXCIsXCJKXCIsXCJKXCIsXCJBXCIsXCJTXCIsXCJPXCIsXCJOXCIsXCJEXCJdLHNob3J0OltcIkphblwiLFwiRmViXCIsXCJNYXJcIixcIkFwclwiLFwiTWF5XCIsXCJKdW5cIixcIkp1bFwiLFwiQXVnXCIsXCJTZXBcIixcIk9jdFwiLFwiTm92XCIsXCJEZWNcIl0sbG9uZzpbXCJKYW51YXJ5XCIsXCJGZWJydWFyeVwiLFwiTWFyY2hcIixcIkFwcmlsXCIsXCJNYXlcIixcIkp1bmVcIixcIkp1bHlcIixcIkF1Z3VzdFwiLFwiU2VwdGVtYmVyXCIsXCJPY3RvYmVyXCIsXCJOb3ZlbWJlclwiLFwiRGVjZW1iZXJcIl19LGRheXM6e25hcnJvdzpbXCJTXCIsXCJNXCIsXCJUXCIsXCJXXCIsXCJUXCIsXCJGXCIsXCJTXCJdLHNob3J0OltcIlN1blwiLFwiTW9uXCIsXCJUdWVcIixcIldlZFwiLFwiVGh1XCIsXCJGcmlcIixcIlNhdFwiXSxsb25nOltcIlN1bmRheVwiLFwiTW9uZGF5XCIsXCJUdWVzZGF5XCIsXCJXZWRuZXNkYXlcIixcIlRodXJzZGF5XCIsXCJGcmlkYXlcIixcIlNhdHVyZGF5XCJdfSxlcmFzOntuYXJyb3c6W1wiQlwiLFwiQVwiLFwiQkNFXCIsXCJDRVwiXSxzaG9ydDpbXCJCQ1wiLFwiQURcIixcIkJDRVwiLFwiQ0VcIl0sbG9uZzpbXCJCZWZvcmUgQ2hyaXN0XCIsXCJBbm5vIERvbWluaVwiLFwiQmVmb3JlIENvbW1vbiBFcmFcIixcIkNvbW1vbiBFcmFcIl19LGRheVBlcmlvZHM6e2FtOlwiQU1cIixwbTpcIlBNXCJ9fSxoZWJyZXc6e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIixcIjEzXCIsXCI3XCJdLHNob3J0OltcIlRpc2hyaVwiLFwiSGVzaHZhblwiLFwiS2lzbGV2XCIsXCJUZXZldFwiLFwiU2hldmF0XCIsXCJBZGFyIElcIixcIkFkYXJcIixcIk5pc2FuXCIsXCJJeWFyXCIsXCJTaXZhblwiLFwiVGFtdXpcIixcIkF2XCIsXCJFbHVsXCIsXCJBZGFyIElJXCJdLGxvbmc6W1wiVGlzaHJpXCIsXCJIZXNodmFuXCIsXCJLaXNsZXZcIixcIlRldmV0XCIsXCJTaGV2YXRcIixcIkFkYXIgSVwiLFwiQWRhclwiLFwiTmlzYW5cIixcIkl5YXJcIixcIlNpdmFuXCIsXCJUYW11elwiLFwiQXZcIixcIkVsdWxcIixcIkFkYXIgSUlcIl19LGRheXM6e25hcnJvdzpbXCJTXCIsXCJNXCIsXCJUXCIsXCJXXCIsXCJUXCIsXCJGXCIsXCJTXCJdLHNob3J0OltcIlN1blwiLFwiTW9uXCIsXCJUdWVcIixcIldlZFwiLFwiVGh1XCIsXCJGcmlcIixcIlNhdFwiXSxsb25nOltcIlN1bmRheVwiLFwiTW9uZGF5XCIsXCJUdWVzZGF5XCIsXCJXZWRuZXNkYXlcIixcIlRodXJzZGF5XCIsXCJGcmlkYXlcIixcIlNhdHVyZGF5XCJdfSxlcmFzOntuYXJyb3c6W1wiQU1cIl0sc2hvcnQ6W1wiQU1cIl0sbG9uZzpbXCJBTVwiXX0sZGF5UGVyaW9kczp7YW06XCJBTVwiLHBtOlwiUE1cIn19LGluZGlhbjp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiXSxzaG9ydDpbXCJDaGFpdHJhXCIsXCJWYWlzYWtoYVwiLFwiSnlhaXN0aGFcIixcIkFzYWRoYVwiLFwiU3JhdmFuYVwiLFwiQmhhZHJhXCIsXCJBc3ZpbmFcIixcIkthcnRpa2FcIixcIkFncmFoYXlhbmFcIixcIlBhdXNhXCIsXCJNYWdoYVwiLFwiUGhhbGd1bmFcIl0sbG9uZzpbXCJDaGFpdHJhXCIsXCJWYWlzYWtoYVwiLFwiSnlhaXN0aGFcIixcIkFzYWRoYVwiLFwiU3JhdmFuYVwiLFwiQmhhZHJhXCIsXCJBc3ZpbmFcIixcIkthcnRpa2FcIixcIkFncmFoYXlhbmFcIixcIlBhdXNhXCIsXCJNYWdoYVwiLFwiUGhhbGd1bmFcIl19LGRheXM6e25hcnJvdzpbXCJTXCIsXCJNXCIsXCJUXCIsXCJXXCIsXCJUXCIsXCJGXCIsXCJTXCJdLHNob3J0OltcIlN1blwiLFwiTW9uXCIsXCJUdWVcIixcIldlZFwiLFwiVGh1XCIsXCJGcmlcIixcIlNhdFwiXSxsb25nOltcIlN1bmRheVwiLFwiTW9uZGF5XCIsXCJUdWVzZGF5XCIsXCJXZWRuZXNkYXlcIixcIlRodXJzZGF5XCIsXCJGcmlkYXlcIixcIlNhdHVyZGF5XCJdfSxlcmFzOntuYXJyb3c6W1wiU2FrYVwiXSxzaG9ydDpbXCJTYWthXCJdLGxvbmc6W1wiU2FrYVwiXX0sZGF5UGVyaW9kczp7YW06XCJBTVwiLHBtOlwiUE1cIn19LGlzbGFtaWM6e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIl0sc2hvcnQ6W1wiTXVoLlwiLFwiU2FmLlwiLFwiUmFiLiBJXCIsXCJSYWIuIElJXCIsXCJKdW0uIElcIixcIkp1bS4gSUlcIixcIlJhai5cIixcIlNoYS5cIixcIlJhbS5cIixcIlNoYXcuXCIsXCJEaHXKu2wtUS5cIixcIkRodcq7bC1ILlwiXSxsb25nOltcIk11aGFycmFtXCIsXCJTYWZhclwiLFwiUmFiacq7IElcIixcIlJhYmnKuyBJSVwiLFwiSnVtYWRhIElcIixcIkp1bWFkYSBJSVwiLFwiUmFqYWJcIixcIlNoYcq7YmFuXCIsXCJSYW1hZGFuXCIsXCJTaGF3d2FsXCIsXCJEaHXKu2wtUWnKu2RhaFwiLFwiRGh1yrtsLUhpamphaFwiXX0sZGF5czp7bmFycm93OltcIlNcIixcIk1cIixcIlRcIixcIldcIixcIlRcIixcIkZcIixcIlNcIl0sc2hvcnQ6W1wiU3VuXCIsXCJNb25cIixcIlR1ZVwiLFwiV2VkXCIsXCJUaHVcIixcIkZyaVwiLFwiU2F0XCJdLGxvbmc6W1wiU3VuZGF5XCIsXCJNb25kYXlcIixcIlR1ZXNkYXlcIixcIldlZG5lc2RheVwiLFwiVGh1cnNkYXlcIixcIkZyaWRheVwiLFwiU2F0dXJkYXlcIl19LGVyYXM6e25hcnJvdzpbXCJBSFwiXSxzaG9ydDpbXCJBSFwiXSxsb25nOltcIkFIXCJdfSxkYXlQZXJpb2RzOnthbTpcIkFNXCIscG06XCJQTVwifX0saXNsYW1pY2M6e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIl0sc2hvcnQ6W1wiTXVoLlwiLFwiU2FmLlwiLFwiUmFiLiBJXCIsXCJSYWIuIElJXCIsXCJKdW0uIElcIixcIkp1bS4gSUlcIixcIlJhai5cIixcIlNoYS5cIixcIlJhbS5cIixcIlNoYXcuXCIsXCJEaHXKu2wtUS5cIixcIkRodcq7bC1ILlwiXSxsb25nOltcIk11aGFycmFtXCIsXCJTYWZhclwiLFwiUmFiacq7IElcIixcIlJhYmnKuyBJSVwiLFwiSnVtYWRhIElcIixcIkp1bWFkYSBJSVwiLFwiUmFqYWJcIixcIlNoYcq7YmFuXCIsXCJSYW1hZGFuXCIsXCJTaGF3d2FsXCIsXCJEaHXKu2wtUWnKu2RhaFwiLFwiRGh1yrtsLUhpamphaFwiXX0sZGF5czp7bmFycm93OltcIlNcIixcIk1cIixcIlRcIixcIldcIixcIlRcIixcIkZcIixcIlNcIl0sc2hvcnQ6W1wiU3VuXCIsXCJNb25cIixcIlR1ZVwiLFwiV2VkXCIsXCJUaHVcIixcIkZyaVwiLFwiU2F0XCJdLGxvbmc6W1wiU3VuZGF5XCIsXCJNb25kYXlcIixcIlR1ZXNkYXlcIixcIldlZG5lc2RheVwiLFwiVGh1cnNkYXlcIixcIkZyaWRheVwiLFwiU2F0dXJkYXlcIl19LGVyYXM6e25hcnJvdzpbXCJBSFwiXSxzaG9ydDpbXCJBSFwiXSxsb25nOltcIkFIXCJdfSxkYXlQZXJpb2RzOnthbTpcIkFNXCIscG06XCJQTVwifX0samFwYW5lc2U6e21vbnRoczp7bmFycm93OltcIkpcIixcIkZcIixcIk1cIixcIkFcIixcIk1cIixcIkpcIixcIkpcIixcIkFcIixcIlNcIixcIk9cIixcIk5cIixcIkRcIl0sc2hvcnQ6W1wiSmFuXCIsXCJGZWJcIixcIk1hclwiLFwiQXByXCIsXCJNYXlcIixcIkp1blwiLFwiSnVsXCIsXCJBdWdcIixcIlNlcFwiLFwiT2N0XCIsXCJOb3ZcIixcIkRlY1wiXSxsb25nOltcIkphbnVhcnlcIixcIkZlYnJ1YXJ5XCIsXCJNYXJjaFwiLFwiQXByaWxcIixcIk1heVwiLFwiSnVuZVwiLFwiSnVseVwiLFwiQXVndXN0XCIsXCJTZXB0ZW1iZXJcIixcIk9jdG9iZXJcIixcIk5vdmVtYmVyXCIsXCJEZWNlbWJlclwiXX0sZGF5czp7bmFycm93OltcIlNcIixcIk1cIixcIlRcIixcIldcIixcIlRcIixcIkZcIixcIlNcIl0sc2hvcnQ6W1wiU3VuXCIsXCJNb25cIixcIlR1ZVwiLFwiV2VkXCIsXCJUaHVcIixcIkZyaVwiLFwiU2F0XCJdLGxvbmc6W1wiU3VuZGF5XCIsXCJNb25kYXlcIixcIlR1ZXNkYXlcIixcIldlZG5lc2RheVwiLFwiVGh1cnNkYXlcIixcIkZyaWRheVwiLFwiU2F0dXJkYXlcIl19LGVyYXM6e25hcnJvdzpbXCJUYWlrYSAoNjQ14oCTNjUwKVwiLFwiSGFrdWNoaSAoNjUw4oCTNjcxKVwiLFwiSGFrdWjFjSAoNjcy4oCTNjg2KVwiLFwiU2h1Y2jFjSAoNjg24oCTNzAxKVwiLFwiVGFpaMWNICg3MDHigJM3MDQpXCIsXCJLZWl1biAoNzA04oCTNzA4KVwiLFwiV2FkxY0gKDcwOOKAkzcxNSlcIixcIlJlaWtpICg3MTXigJM3MTcpXCIsXCJZxY1yxY0gKDcxN+KAkzcyNClcIixcIkppbmtpICg3MjTigJM3MjkpXCIsXCJUZW5wecWNICg3MjnigJM3NDkpXCIsXCJUZW5wecWNLWthbXDFjSAoNzQ5LTc0OSlcIixcIlRlbnB5xY0tc2jFjWjFjSAoNzQ5LTc1NylcIixcIlRlbnB5xY0taMWNamkgKDc1Ny03NjUpXCIsXCJUZW5wecWNLWppbmdvICg3NjUtNzY3KVwiLFwiSmluZ28ta2VpdW4gKDc2Ny03NzApXCIsXCJIxY1raSAoNzcw4oCTNzgwKVwiLFwiVGVuLcWNICg3ODEtNzgyKVwiLFwiRW5yeWFrdSAoNzgy4oCTODA2KVwiLFwiRGFpZMWNICg4MDbigJM4MTApXCIsXCJLxY1uaW4gKDgxMOKAkzgyNClcIixcIlRlbmNoxY0gKDgyNOKAkzgzNClcIixcIkrFjXdhICg4MzTigJM4NDgpXCIsXCJLYWrFjSAoODQ44oCTODUxKVwiLFwiTmluanUgKDg1MeKAkzg1NClcIixcIlNhaWvFjSAoODU04oCTODU3KVwiLFwiVGVuLWFuICg4NTctODU5KVwiLFwiSsWNZ2FuICg4NTnigJM4NzcpXCIsXCJHYW5necWNICg4NzfigJM4ODUpXCIsXCJOaW5uYSAoODg14oCTODg5KVwiLFwiS2FucHnFjSAoODg54oCTODk4KVwiLFwiU2jFjXRhaSAoODk44oCTOTAxKVwiLFwiRW5naSAoOTAx4oCTOTIzKVwiLFwiRW5jaMWNICg5MjPigJM5MzEpXCIsXCJKxY1oZWkgKDkzMeKAkzkzOClcIixcIlRlbmd5xY0gKDkzOOKAkzk0NylcIixcIlRlbnJ5YWt1ICg5NDfigJM5NTcpXCIsXCJUZW50b2t1ICg5NTfigJM5NjEpXCIsXCLFjHdhICg5NjHigJM5NjQpXCIsXCJLxY1oxY0gKDk2NOKAkzk2OClcIixcIkFubmEgKDk2OOKAkzk3MClcIixcIlRlbnJva3UgKDk3MOKAkzk3MylcIixcIlRlbuKAmWVuICg5NzPigJM5NzYpXCIsXCJKxY1nZW4gKDk3NuKAkzk3OClcIixcIlRlbmdlbiAoOTc44oCTOTgzKVwiLFwiRWlrYW4gKDk4M+KAkzk4NSlcIixcIkthbm5hICg5ODXigJM5ODcpXCIsXCJFaWVuICg5ODfigJM5ODkpXCIsXCJFaXNvICg5ODnigJM5OTApXCIsXCJTaMWNcnlha3UgKDk5MOKAkzk5NSlcIixcIkNoxY10b2t1ICg5OTXigJM5OTkpXCIsXCJDaMWNaMWNICg5OTnigJMxMDA0KVwiLFwiS2Fua8WNICgxMDA04oCTMTAxMilcIixcIkNoxY13YSAoMTAxMuKAkzEwMTcpXCIsXCJLYW5uaW4gKDEwMTfigJMxMDIxKVwiLFwiSmlhbiAoMTAyMeKAkzEwMjQpXCIsXCJNYW5qdSAoMTAyNOKAkzEwMjgpXCIsXCJDaMWNZ2VuICgxMDI44oCTMTAzNylcIixcIkNoxY1yeWFrdSAoMTAzN+KAkzEwNDApXCIsXCJDaMWNa3nFqyAoMTA0MOKAkzEwNDQpXCIsXCJLYW50b2t1ICgxMDQ04oCTMTA0NilcIixcIkVpc2jFjSAoMTA0NuKAkzEwNTMpXCIsXCJUZW5naSAoMTA1M+KAkzEwNTgpXCIsXCJLxY1oZWkgKDEwNTjigJMxMDY1KVwiLFwiSmlyeWFrdSAoMTA2NeKAkzEwNjkpXCIsXCJFbmt5xasgKDEwNjnigJMxMDc0KVwiLFwiU2jFjWhvICgxMDc04oCTMTA3NylcIixcIlNoxY1yeWFrdSAoMTA3N+KAkzEwODEpXCIsXCJFaWjFjSAoMTA4MeKAkzEwODQpXCIsXCLFjHRva3UgKDEwODTigJMxMDg3KVwiLFwiS2FuamkgKDEwODfigJMxMDk0KVwiLFwiS2FoxY0gKDEwOTTigJMxMDk2KVwiLFwiRWljaMWNICgxMDk24oCTMTA5NylcIixcIkrFjXRva3UgKDEwOTfigJMxMDk5KVwiLFwiS8WNd2EgKDEwOTnigJMxMTA0KVwiLFwiQ2jFjWppICgxMTA04oCTMTEwNilcIixcIkthc2jFjSAoMTEwNuKAkzExMDgpXCIsXCJUZW5uaW4gKDExMDjigJMxMTEwKVwiLFwiVGVuLWVpICgxMTEwLTExMTMpXCIsXCJFaWt5xasgKDExMTPigJMxMTE4KVwiLFwiR2Vu4oCZZWkgKDExMTjigJMxMTIwKVwiLFwiSMWNYW4gKDExMjDigJMxMTI0KVwiLFwiVGVuamkgKDExMjTigJMxMTI2KVwiLFwiRGFpamkgKDExMjbigJMxMTMxKVwiLFwiVGVuc2jFjSAoMTEzMeKAkzExMzIpXCIsXCJDaMWNc2jFjSAoMTEzMuKAkzExMzUpXCIsXCJIxY1lbiAoMTEzNeKAkzExNDEpXCIsXCJFaWppICgxMTQx4oCTMTE0MilcIixcIkvFjWppICgxMTQy4oCTMTE0NClcIixcIlRlbuKAmXnFjSAoMTE0NOKAkzExNDUpXCIsXCJLecWrYW4gKDExNDXigJMxMTUxKVwiLFwiTmlucGVpICgxMTUx4oCTMTE1NClcIixcIkt5xatqdSAoMTE1NOKAkzExNTYpXCIsXCJIxY1nZW4gKDExNTbigJMxMTU5KVwiLFwiSGVpamkgKDExNTnigJMxMTYwKVwiLFwiRWlyeWFrdSAoMTE2MOKAkzExNjEpXCIsXCLFjGhvICgxMTYx4oCTMTE2MylcIixcIkNoxY1rYW4gKDExNjPigJMxMTY1KVwiLFwiRWltYW4gKDExNjXigJMxMTY2KVwiLFwiTmlu4oCZYW4gKDExNjbigJMxMTY5KVwiLFwiS2HFjSAoMTE2OeKAkzExNzEpXCIsXCJTaMWNYW4gKDExNzHigJMxMTc1KVwiLFwiQW5nZW4gKDExNzXigJMxMTc3KVwiLFwiSmlzaMWNICgxMTc34oCTMTE4MSlcIixcIlnFjXdhICgxMTgx4oCTMTE4MilcIixcIkp1ZWkgKDExODLigJMxMTg0KVwiLFwiR2Vucnlha3UgKDExODTigJMxMTg1KVwiLFwiQnVuamkgKDExODXigJMxMTkwKVwiLFwiS2Vua3nFqyAoMTE5MOKAkzExOTkpXCIsXCJTaMWNamkgKDExOTnigJMxMjAxKVwiLFwiS2VubmluICgxMjAx4oCTMTIwNClcIixcIkdlbmt5xasgKDEyMDTigJMxMjA2KVwiLFwiS2Vu4oCZZWkgKDEyMDbigJMxMjA3KVwiLFwiSsWNZ2VuICgxMjA34oCTMTIxMSlcIixcIktlbnJ5YWt1ICgxMjEx4oCTMTIxMylcIixcIktlbnDFjSAoMTIxM+KAkzEyMTkpXCIsXCJKxY1recWrICgxMjE54oCTMTIyMilcIixcIkrFjcWNICgxMjIy4oCTMTIyNClcIixcIkdlbm5pbiAoMTIyNOKAkzEyMjUpXCIsXCJLYXJva3UgKDEyMjXigJMxMjI3KVwiLFwiQW50ZWkgKDEyMjfigJMxMjI5KVwiLFwiS2Fua2kgKDEyMjnigJMxMjMyKVwiLFwiSsWNZWkgKDEyMzLigJMxMjMzKVwiLFwiVGVucHVrdSAoMTIzM+KAkzEyMzQpXCIsXCJCdW5yeWFrdSAoMTIzNOKAkzEyMzUpXCIsXCJLYXRlaSAoMTIzNeKAkzEyMzgpXCIsXCJSeWFrdW5pbiAoMTIzOOKAkzEyMzkpXCIsXCJFbuKAmcWNICgxMjM54oCTMTI0MClcIixcIk5pbmppICgxMjQw4oCTMTI0MylcIixcIkthbmdlbiAoMTI0M+KAkzEyNDcpXCIsXCJIxY1qaSAoMTI0N+KAkzEyNDkpXCIsXCJLZW5jaMWNICgxMjQ54oCTMTI1NilcIixcIkvFjWdlbiAoMTI1NuKAkzEyNTcpXCIsXCJTaMWNa2EgKDEyNTfigJMxMjU5KVwiLFwiU2jFjWdlbiAoMTI1OeKAkzEyNjApXCIsXCJCdW7igJnFjSAoMTI2MOKAkzEyNjEpXCIsXCJLxY1jaMWNICgxMjYx4oCTMTI2NClcIixcIkJ1buKAmWVpICgxMjY04oCTMTI3NSlcIixcIktlbmppICgxMjc14oCTMTI3OClcIixcIkvFjWFuICgxMjc44oCTMTI4OClcIixcIlNoxY3FjSAoMTI4OOKAkzEyOTMpXCIsXCJFaW5pbiAoMTI5M+KAkzEyOTkpXCIsXCJTaMWNYW4gKDEyOTnigJMxMzAyKVwiLFwiS2VuZ2VuICgxMzAy4oCTMTMwMylcIixcIkthZ2VuICgxMzAz4oCTMTMwNilcIixcIlRva3VqaSAoMTMwNuKAkzEzMDgpXCIsXCJFbmt5xY0gKDEzMDjigJMxMzExKVwiLFwixYxjaMWNICgxMzEx4oCTMTMxMilcIixcIlNoxY13YSAoMTMxMuKAkzEzMTcpXCIsXCJCdW5wxY0gKDEzMTfigJMxMzE5KVwiLFwiR2VuxY0gKDEzMTnigJMxMzIxKVwiLFwiR2Vua8WNICgxMzIx4oCTMTMyNClcIixcIlNoxY1jaMWrICgxMzI04oCTMTMyNilcIixcIkthcnlha3UgKDEzMjbigJMxMzI5KVwiLFwiR2VudG9rdSAoMTMyOeKAkzEzMzEpXCIsXCJHZW5rxY0gKDEzMzHigJMxMzM0KVwiLFwiS2VubXUgKDEzMzTigJMxMzM2KVwiLFwiRW5nZW4gKDEzMzbigJMxMzQwKVwiLFwiS8WNa29rdSAoMTM0MOKAkzEzNDYpXCIsXCJTaMWNaGVpICgxMzQ24oCTMTM3MClcIixcIktlbnRva3UgKDEzNzDigJMxMzcyKVwiLFwiQnVuY2jFqyAoMTM3MuKAkzEzNzUpXCIsXCJUZW5qdSAoMTM3NeKAkzEzNzkpXCIsXCJLxY1yeWFrdSAoMTM3OeKAkzEzODEpXCIsXCJLxY13YSAoMTM4MeKAkzEzODQpXCIsXCJHZW5jaMWrICgxMzg04oCTMTM5MilcIixcIk1laXRva3UgKDEzODTigJMxMzg3KVwiLFwiS2FrZWkgKDEzODfigJMxMzg5KVwiLFwiS8WNxY0gKDEzODnigJMxMzkwKVwiLFwiTWVpdG9rdSAoMTM5MOKAkzEzOTQpXCIsXCLFjGVpICgxMzk04oCTMTQyOClcIixcIlNoxY1jaMWNICgxNDI44oCTMTQyOSlcIixcIkVpa3nFjSAoMTQyOeKAkzE0NDEpXCIsXCJLYWtpdHN1ICgxNDQx4oCTMTQ0NClcIixcIkJ1buKAmWFuICgxNDQ04oCTMTQ0OSlcIixcIkjFjXRva3UgKDE0NDnigJMxNDUyKVwiLFwiS3nFjXRva3UgKDE0NTLigJMxNDU1KVwiLFwiS8WNc2jFjSAoMTQ1NeKAkzE0NTcpXCIsXCJDaMWNcm9rdSAoMTQ1N+KAkzE0NjApXCIsXCJLYW5zaMWNICgxNDYw4oCTMTQ2NilcIixcIkJ1bnNoxY0gKDE0NjbigJMxNDY3KVwiLFwixYxuaW4gKDE0NjfigJMxNDY5KVwiLFwiQnVubWVpICgxNDY54oCTMTQ4NylcIixcIkNoxY1recWNICgxNDg34oCTMTQ4OSlcIixcIkVudG9rdSAoMTQ4OeKAkzE0OTIpXCIsXCJNZWnFjSAoMTQ5MuKAkzE1MDEpXCIsXCJCdW5raSAoMTUwMeKAkzE1MDQpXCIsXCJFaXNoxY0gKDE1MDTigJMxNTIxKVwiLFwiVGFpZWkgKDE1MjHigJMxNTI4KVwiLFwiS3nFjXJva3UgKDE1MjjigJMxNTMyKVwiLFwiVGVuYnVuICgxNTMy4oCTMTU1NSlcIixcIkvFjWppICgxNTU14oCTMTU1OClcIixcIkVpcm9rdSAoMTU1OOKAkzE1NzApXCIsXCJHZW5raSAoMTU3MOKAkzE1NzMpXCIsXCJUZW5zaMWNICgxNTcz4oCTMTU5MilcIixcIkJ1bnJva3UgKDE1OTLigJMxNTk2KVwiLFwiS2VpY2jFjSAoMTU5NuKAkzE2MTUpXCIsXCJHZW5uYSAoMTYxNeKAkzE2MjQpXCIsXCJLYW7igJllaSAoMTYyNOKAkzE2NDQpXCIsXCJTaMWNaG8gKDE2NDTigJMxNjQ4KVwiLFwiS2VpYW4gKDE2NDjigJMxNjUyKVwiLFwiSsWNxY0gKDE2NTLigJMxNjU1KVwiLFwiTWVpcmVraSAoMTY1NeKAkzE2NTgpXCIsXCJNYW5qaSAoMTY1OOKAkzE2NjEpXCIsXCJLYW5idW4gKDE2NjHigJMxNjczKVwiLFwiRW5wxY0gKDE2NzPigJMxNjgxKVwiLFwiVGVubmEgKDE2ODHigJMxNjg0KVwiLFwiSsWNa3nFjSAoMTY4NOKAkzE2ODgpXCIsXCJHZW5yb2t1ICgxNjg44oCTMTcwNClcIixcIkjFjWVpICgxNzA04oCTMTcxMSlcIixcIlNoxY10b2t1ICgxNzEx4oCTMTcxNilcIixcIkt5xY1oxY0gKDE3MTbigJMxNzM2KVwiLFwiR2VuYnVuICgxNzM24oCTMTc0MSlcIixcIkthbnDFjSAoMTc0MeKAkzE3NDQpXCIsXCJFbmt5xY0gKDE3NDTigJMxNzQ4KVwiLFwiS2Fu4oCZZW4gKDE3NDjigJMxNzUxKVwiLFwiSMWNcmVraSAoMTc1MeKAkzE3NjQpXCIsXCJNZWl3YSAoMTc2NOKAkzE3NzIpXCIsXCJBbuKAmWVpICgxNzcy4oCTMTc4MSlcIixcIlRlbm1laSAoMTc4MeKAkzE3ODkpXCIsXCJLYW5zZWkgKDE3ODnigJMxODAxKVwiLFwiS3nFjXdhICgxODAx4oCTMTgwNClcIixcIkJ1bmthICgxODA04oCTMTgxOClcIixcIkJ1bnNlaSAoMTgxOOKAkzE4MzApXCIsXCJUZW5wxY0gKDE4MzDigJMxODQ0KVwiLFwiS8WNa2EgKDE4NDTigJMxODQ4KVwiLFwiS2FlaSAoMTg0OOKAkzE4NTQpXCIsXCJBbnNlaSAoMTg1NOKAkzE4NjApXCIsXCJNYW7igJllbiAoMTg2MOKAkzE4NjEpXCIsXCJCdW5recWrICgxODYx4oCTMTg2NClcIixcIkdlbmppICgxODY04oCTMTg2NSlcIixcIktlacWNICgxODY14oCTMTg2OClcIixcIk1cIixcIlRcIixcIlNcIixcIkhcIl0sc2hvcnQ6W1wiVGFpa2EgKDY0NeKAkzY1MClcIixcIkhha3VjaGkgKDY1MOKAkzY3MSlcIixcIkhha3VoxY0gKDY3MuKAkzY4NilcIixcIlNodWNoxY0gKDY4NuKAkzcwMSlcIixcIlRhaWjFjSAoNzAx4oCTNzA0KVwiLFwiS2VpdW4gKDcwNOKAkzcwOClcIixcIldhZMWNICg3MDjigJM3MTUpXCIsXCJSZWlraSAoNzE14oCTNzE3KVwiLFwiWcWNcsWNICg3MTfigJM3MjQpXCIsXCJKaW5raSAoNzI04oCTNzI5KVwiLFwiVGVucHnFjSAoNzI54oCTNzQ5KVwiLFwiVGVucHnFjS1rYW1wxY0gKDc0OS03NDkpXCIsXCJUZW5wecWNLXNoxY1oxY0gKDc0OS03NTcpXCIsXCJUZW5wecWNLWjFjWppICg3NTctNzY1KVwiLFwiVGVucHnFjS1qaW5nbyAoNzY1LTc2NylcIixcIkppbmdvLWtlaXVuICg3NjctNzcwKVwiLFwiSMWNa2kgKDc3MOKAkzc4MClcIixcIlRlbi3FjSAoNzgxLTc4MilcIixcIkVucnlha3UgKDc4MuKAkzgwNilcIixcIkRhaWTFjSAoODA24oCTODEwKVwiLFwiS8WNbmluICg4MTDigJM4MjQpXCIsXCJUZW5jaMWNICg4MjTigJM4MzQpXCIsXCJKxY13YSAoODM04oCTODQ4KVwiLFwiS2FqxY0gKDg0OOKAkzg1MSlcIixcIk5pbmp1ICg4NTHigJM4NTQpXCIsXCJTYWlrxY0gKDg1NOKAkzg1NylcIixcIlRlbi1hbiAoODU3LTg1OSlcIixcIkrFjWdhbiAoODU54oCTODc3KVwiLFwiR2FuZ3nFjSAoODc34oCTODg1KVwiLFwiTmlubmEgKDg4NeKAkzg4OSlcIixcIkthbnB5xY0gKDg4OeKAkzg5OClcIixcIlNoxY10YWkgKDg5OOKAkzkwMSlcIixcIkVuZ2kgKDkwMeKAkzkyMylcIixcIkVuY2jFjSAoOTIz4oCTOTMxKVwiLFwiSsWNaGVpICg5MzHigJM5MzgpXCIsXCJUZW5necWNICg5MzjigJM5NDcpXCIsXCJUZW5yeWFrdSAoOTQ34oCTOTU3KVwiLFwiVGVudG9rdSAoOTU34oCTOTYxKVwiLFwixYx3YSAoOTYx4oCTOTY0KVwiLFwiS8WNaMWNICg5NjTigJM5NjgpXCIsXCJBbm5hICg5NjjigJM5NzApXCIsXCJUZW5yb2t1ICg5NzDigJM5NzMpXCIsXCJUZW7igJllbiAoOTcz4oCTOTc2KVwiLFwiSsWNZ2VuICg5NzbigJM5NzgpXCIsXCJUZW5nZW4gKDk3OOKAkzk4MylcIixcIkVpa2FuICg5ODPigJM5ODUpXCIsXCJLYW5uYSAoOTg14oCTOTg3KVwiLFwiRWllbiAoOTg34oCTOTg5KVwiLFwiRWlzbyAoOTg54oCTOTkwKVwiLFwiU2jFjXJ5YWt1ICg5OTDigJM5OTUpXCIsXCJDaMWNdG9rdSAoOTk14oCTOTk5KVwiLFwiQ2jFjWjFjSAoOTk54oCTMTAwNClcIixcIkthbmvFjSAoMTAwNOKAkzEwMTIpXCIsXCJDaMWNd2EgKDEwMTLigJMxMDE3KVwiLFwiS2FubmluICgxMDE34oCTMTAyMSlcIixcIkppYW4gKDEwMjHigJMxMDI0KVwiLFwiTWFuanUgKDEwMjTigJMxMDI4KVwiLFwiQ2jFjWdlbiAoMTAyOOKAkzEwMzcpXCIsXCJDaMWNcnlha3UgKDEwMzfigJMxMDQwKVwiLFwiQ2jFjWt5xasgKDEwNDDigJMxMDQ0KVwiLFwiS2FudG9rdSAoMTA0NOKAkzEwNDYpXCIsXCJFaXNoxY0gKDEwNDbigJMxMDUzKVwiLFwiVGVuZ2kgKDEwNTPigJMxMDU4KVwiLFwiS8WNaGVpICgxMDU44oCTMTA2NSlcIixcIkppcnlha3UgKDEwNjXigJMxMDY5KVwiLFwiRW5recWrICgxMDY54oCTMTA3NClcIixcIlNoxY1obyAoMTA3NOKAkzEwNzcpXCIsXCJTaMWNcnlha3UgKDEwNzfigJMxMDgxKVwiLFwiRWloxY0gKDEwODHigJMxMDg0KVwiLFwixYx0b2t1ICgxMDg04oCTMTA4NylcIixcIkthbmppICgxMDg34oCTMTA5NClcIixcIkthaMWNICgxMDk04oCTMTA5NilcIixcIkVpY2jFjSAoMTA5NuKAkzEwOTcpXCIsXCJKxY10b2t1ICgxMDk34oCTMTA5OSlcIixcIkvFjXdhICgxMDk54oCTMTEwNClcIixcIkNoxY1qaSAoMTEwNOKAkzExMDYpXCIsXCJLYXNoxY0gKDExMDbigJMxMTA4KVwiLFwiVGVubmluICgxMTA44oCTMTExMClcIixcIlRlbi1laSAoMTExMC0xMTEzKVwiLFwiRWlrecWrICgxMTEz4oCTMTExOClcIixcIkdlbuKAmWVpICgxMTE44oCTMTEyMClcIixcIkjFjWFuICgxMTIw4oCTMTEyNClcIixcIlRlbmppICgxMTI04oCTMTEyNilcIixcIkRhaWppICgxMTI24oCTMTEzMSlcIixcIlRlbnNoxY0gKDExMzHigJMxMTMyKVwiLFwiQ2jFjXNoxY0gKDExMzLigJMxMTM1KVwiLFwiSMWNZW4gKDExMzXigJMxMTQxKVwiLFwiRWlqaSAoMTE0MeKAkzExNDIpXCIsXCJLxY1qaSAoMTE0MuKAkzExNDQpXCIsXCJUZW7igJl5xY0gKDExNDTigJMxMTQ1KVwiLFwiS3nFq2FuICgxMTQ14oCTMTE1MSlcIixcIk5pbnBlaSAoMTE1MeKAkzExNTQpXCIsXCJLecWranUgKDExNTTigJMxMTU2KVwiLFwiSMWNZ2VuICgxMTU24oCTMTE1OSlcIixcIkhlaWppICgxMTU54oCTMTE2MClcIixcIkVpcnlha3UgKDExNjDigJMxMTYxKVwiLFwixYxobyAoMTE2MeKAkzExNjMpXCIsXCJDaMWNa2FuICgxMTYz4oCTMTE2NSlcIixcIkVpbWFuICgxMTY14oCTMTE2NilcIixcIk5pbuKAmWFuICgxMTY24oCTMTE2OSlcIixcIkthxY0gKDExNjnigJMxMTcxKVwiLFwiU2jFjWFuICgxMTcx4oCTMTE3NSlcIixcIkFuZ2VuICgxMTc14oCTMTE3NylcIixcIkppc2jFjSAoMTE3N+KAkzExODEpXCIsXCJZxY13YSAoMTE4MeKAkzExODIpXCIsXCJKdWVpICgxMTgy4oCTMTE4NClcIixcIkdlbnJ5YWt1ICgxMTg04oCTMTE4NSlcIixcIkJ1bmppICgxMTg14oCTMTE5MClcIixcIktlbmt5xasgKDExOTDigJMxMTk5KVwiLFwiU2jFjWppICgxMTk54oCTMTIwMSlcIixcIktlbm5pbiAoMTIwMeKAkzEyMDQpXCIsXCJHZW5recWrICgxMjA04oCTMTIwNilcIixcIktlbuKAmWVpICgxMjA24oCTMTIwNylcIixcIkrFjWdlbiAoMTIwN+KAkzEyMTEpXCIsXCJLZW5yeWFrdSAoMTIxMeKAkzEyMTMpXCIsXCJLZW5wxY0gKDEyMTPigJMxMjE5KVwiLFwiSsWNa3nFqyAoMTIxOeKAkzEyMjIpXCIsXCJKxY3FjSAoMTIyMuKAkzEyMjQpXCIsXCJHZW5uaW4gKDEyMjTigJMxMjI1KVwiLFwiS2Fyb2t1ICgxMjI14oCTMTIyNylcIixcIkFudGVpICgxMjI34oCTMTIyOSlcIixcIkthbmtpICgxMjI54oCTMTIzMilcIixcIkrFjWVpICgxMjMy4oCTMTIzMylcIixcIlRlbnB1a3UgKDEyMzPigJMxMjM0KVwiLFwiQnVucnlha3UgKDEyMzTigJMxMjM1KVwiLFwiS2F0ZWkgKDEyMzXigJMxMjM4KVwiLFwiUnlha3VuaW4gKDEyMzjigJMxMjM5KVwiLFwiRW7igJnFjSAoMTIzOeKAkzEyNDApXCIsXCJOaW5qaSAoMTI0MOKAkzEyNDMpXCIsXCJLYW5nZW4gKDEyNDPigJMxMjQ3KVwiLFwiSMWNamkgKDEyNDfigJMxMjQ5KVwiLFwiS2VuY2jFjSAoMTI0OeKAkzEyNTYpXCIsXCJLxY1nZW4gKDEyNTbigJMxMjU3KVwiLFwiU2jFjWthICgxMjU34oCTMTI1OSlcIixcIlNoxY1nZW4gKDEyNTnigJMxMjYwKVwiLFwiQnVu4oCZxY0gKDEyNjDigJMxMjYxKVwiLFwiS8WNY2jFjSAoMTI2MeKAkzEyNjQpXCIsXCJCdW7igJllaSAoMTI2NOKAkzEyNzUpXCIsXCJLZW5qaSAoMTI3NeKAkzEyNzgpXCIsXCJLxY1hbiAoMTI3OOKAkzEyODgpXCIsXCJTaMWNxY0gKDEyODjigJMxMjkzKVwiLFwiRWluaW4gKDEyOTPigJMxMjk5KVwiLFwiU2jFjWFuICgxMjk54oCTMTMwMilcIixcIktlbmdlbiAoMTMwMuKAkzEzMDMpXCIsXCJLYWdlbiAoMTMwM+KAkzEzMDYpXCIsXCJUb2t1amkgKDEzMDbigJMxMzA4KVwiLFwiRW5recWNICgxMzA44oCTMTMxMSlcIixcIsWMY2jFjSAoMTMxMeKAkzEzMTIpXCIsXCJTaMWNd2EgKDEzMTLigJMxMzE3KVwiLFwiQnVucMWNICgxMzE34oCTMTMxOSlcIixcIkdlbsWNICgxMzE54oCTMTMyMSlcIixcIkdlbmvFjSAoMTMyMeKAkzEzMjQpXCIsXCJTaMWNY2jFqyAoMTMyNOKAkzEzMjYpXCIsXCJLYXJ5YWt1ICgxMzI24oCTMTMyOSlcIixcIkdlbnRva3UgKDEzMjnigJMxMzMxKVwiLFwiR2Vua8WNICgxMzMx4oCTMTMzNClcIixcIktlbm11ICgxMzM04oCTMTMzNilcIixcIkVuZ2VuICgxMzM24oCTMTM0MClcIixcIkvFjWtva3UgKDEzNDDigJMxMzQ2KVwiLFwiU2jFjWhlaSAoMTM0NuKAkzEzNzApXCIsXCJLZW50b2t1ICgxMzcw4oCTMTM3MilcIixcIkJ1bmNoxasgKDEzNzLigJMxMzc1KVwiLFwiVGVuanUgKDEzNzXigJMxMzc5KVwiLFwiS8WNcnlha3UgKDEzNznigJMxMzgxKVwiLFwiS8WNd2EgKDEzODHigJMxMzg0KVwiLFwiR2VuY2jFqyAoMTM4NOKAkzEzOTIpXCIsXCJNZWl0b2t1ICgxMzg04oCTMTM4NylcIixcIktha2VpICgxMzg34oCTMTM4OSlcIixcIkvFjcWNICgxMzg54oCTMTM5MClcIixcIk1laXRva3UgKDEzOTDigJMxMzk0KVwiLFwixYxlaSAoMTM5NOKAkzE0MjgpXCIsXCJTaMWNY2jFjSAoMTQyOOKAkzE0MjkpXCIsXCJFaWt5xY0gKDE0MjnigJMxNDQxKVwiLFwiS2FraXRzdSAoMTQ0MeKAkzE0NDQpXCIsXCJCdW7igJlhbiAoMTQ0NOKAkzE0NDkpXCIsXCJIxY10b2t1ICgxNDQ54oCTMTQ1MilcIixcIkt5xY10b2t1ICgxNDUy4oCTMTQ1NSlcIixcIkvFjXNoxY0gKDE0NTXigJMxNDU3KVwiLFwiQ2jFjXJva3UgKDE0NTfigJMxNDYwKVwiLFwiS2Fuc2jFjSAoMTQ2MOKAkzE0NjYpXCIsXCJCdW5zaMWNICgxNDY24oCTMTQ2NylcIixcIsWMbmluICgxNDY34oCTMTQ2OSlcIixcIkJ1bm1laSAoMTQ2OeKAkzE0ODcpXCIsXCJDaMWNa3nFjSAoMTQ4N+KAkzE0ODkpXCIsXCJFbnRva3UgKDE0ODnigJMxNDkyKVwiLFwiTWVpxY0gKDE0OTLigJMxNTAxKVwiLFwiQnVua2kgKDE1MDHigJMxNTA0KVwiLFwiRWlzaMWNICgxNTA04oCTMTUyMSlcIixcIlRhaWVpICgxNTIx4oCTMTUyOClcIixcIkt5xY1yb2t1ICgxNTI44oCTMTUzMilcIixcIlRlbmJ1biAoMTUzMuKAkzE1NTUpXCIsXCJLxY1qaSAoMTU1NeKAkzE1NTgpXCIsXCJFaXJva3UgKDE1NTjigJMxNTcwKVwiLFwiR2Vua2kgKDE1NzDigJMxNTczKVwiLFwiVGVuc2jFjSAoMTU3M+KAkzE1OTIpXCIsXCJCdW5yb2t1ICgxNTky4oCTMTU5NilcIixcIktlaWNoxY0gKDE1OTbigJMxNjE1KVwiLFwiR2VubmEgKDE2MTXigJMxNjI0KVwiLFwiS2Fu4oCZZWkgKDE2MjTigJMxNjQ0KVwiLFwiU2jFjWhvICgxNjQ04oCTMTY0OClcIixcIktlaWFuICgxNjQ44oCTMTY1MilcIixcIkrFjcWNICgxNjUy4oCTMTY1NSlcIixcIk1laXJla2kgKDE2NTXigJMxNjU4KVwiLFwiTWFuamkgKDE2NTjigJMxNjYxKVwiLFwiS2FuYnVuICgxNjYx4oCTMTY3MylcIixcIkVucMWNICgxNjcz4oCTMTY4MSlcIixcIlRlbm5hICgxNjgx4oCTMTY4NClcIixcIkrFjWt5xY0gKDE2ODTigJMxNjg4KVwiLFwiR2Vucm9rdSAoMTY4OOKAkzE3MDQpXCIsXCJIxY1laSAoMTcwNOKAkzE3MTEpXCIsXCJTaMWNdG9rdSAoMTcxMeKAkzE3MTYpXCIsXCJLecWNaMWNICgxNzE24oCTMTczNilcIixcIkdlbmJ1biAoMTczNuKAkzE3NDEpXCIsXCJLYW5wxY0gKDE3NDHigJMxNzQ0KVwiLFwiRW5recWNICgxNzQ04oCTMTc0OClcIixcIkthbuKAmWVuICgxNzQ44oCTMTc1MSlcIixcIkjFjXJla2kgKDE3NTHigJMxNzY0KVwiLFwiTWVpd2EgKDE3NjTigJMxNzcyKVwiLFwiQW7igJllaSAoMTc3MuKAkzE3ODEpXCIsXCJUZW5tZWkgKDE3ODHigJMxNzg5KVwiLFwiS2Fuc2VpICgxNzg54oCTMTgwMSlcIixcIkt5xY13YSAoMTgwMeKAkzE4MDQpXCIsXCJCdW5rYSAoMTgwNOKAkzE4MTgpXCIsXCJCdW5zZWkgKDE4MTjigJMxODMwKVwiLFwiVGVucMWNICgxODMw4oCTMTg0NClcIixcIkvFjWthICgxODQ04oCTMTg0OClcIixcIkthZWkgKDE4NDjigJMxODU0KVwiLFwiQW5zZWkgKDE4NTTigJMxODYwKVwiLFwiTWFu4oCZZW4gKDE4NjDigJMxODYxKVwiLFwiQnVua3nFqyAoMTg2MeKAkzE4NjQpXCIsXCJHZW5qaSAoMTg2NOKAkzE4NjUpXCIsXCJLZWnFjSAoMTg2NeKAkzE4NjgpXCIsXCJNZWlqaVwiLFwiVGFpc2jFjVwiLFwiU2jFjXdhXCIsXCJIZWlzZWlcIl0sbG9uZzpbXCJUYWlrYSAoNjQ14oCTNjUwKVwiLFwiSGFrdWNoaSAoNjUw4oCTNjcxKVwiLFwiSGFrdWjFjSAoNjcy4oCTNjg2KVwiLFwiU2h1Y2jFjSAoNjg24oCTNzAxKVwiLFwiVGFpaMWNICg3MDHigJM3MDQpXCIsXCJLZWl1biAoNzA04oCTNzA4KVwiLFwiV2FkxY0gKDcwOOKAkzcxNSlcIixcIlJlaWtpICg3MTXigJM3MTcpXCIsXCJZxY1yxY0gKDcxN+KAkzcyNClcIixcIkppbmtpICg3MjTigJM3MjkpXCIsXCJUZW5wecWNICg3MjnigJM3NDkpXCIsXCJUZW5wecWNLWthbXDFjSAoNzQ5LTc0OSlcIixcIlRlbnB5xY0tc2jFjWjFjSAoNzQ5LTc1NylcIixcIlRlbnB5xY0taMWNamkgKDc1Ny03NjUpXCIsXCJUZW5wecWNLWppbmdvICg3NjUtNzY3KVwiLFwiSmluZ28ta2VpdW4gKDc2Ny03NzApXCIsXCJIxY1raSAoNzcw4oCTNzgwKVwiLFwiVGVuLcWNICg3ODEtNzgyKVwiLFwiRW5yeWFrdSAoNzgy4oCTODA2KVwiLFwiRGFpZMWNICg4MDbigJM4MTApXCIsXCJLxY1uaW4gKDgxMOKAkzgyNClcIixcIlRlbmNoxY0gKDgyNOKAkzgzNClcIixcIkrFjXdhICg4MzTigJM4NDgpXCIsXCJLYWrFjSAoODQ44oCTODUxKVwiLFwiTmluanUgKDg1MeKAkzg1NClcIixcIlNhaWvFjSAoODU04oCTODU3KVwiLFwiVGVuLWFuICg4NTctODU5KVwiLFwiSsWNZ2FuICg4NTnigJM4NzcpXCIsXCJHYW5necWNICg4NzfigJM4ODUpXCIsXCJOaW5uYSAoODg14oCTODg5KVwiLFwiS2FucHnFjSAoODg54oCTODk4KVwiLFwiU2jFjXRhaSAoODk44oCTOTAxKVwiLFwiRW5naSAoOTAx4oCTOTIzKVwiLFwiRW5jaMWNICg5MjPigJM5MzEpXCIsXCJKxY1oZWkgKDkzMeKAkzkzOClcIixcIlRlbmd5xY0gKDkzOOKAkzk0NylcIixcIlRlbnJ5YWt1ICg5NDfigJM5NTcpXCIsXCJUZW50b2t1ICg5NTfigJM5NjEpXCIsXCLFjHdhICg5NjHigJM5NjQpXCIsXCJLxY1oxY0gKDk2NOKAkzk2OClcIixcIkFubmEgKDk2OOKAkzk3MClcIixcIlRlbnJva3UgKDk3MOKAkzk3MylcIixcIlRlbuKAmWVuICg5NzPigJM5NzYpXCIsXCJKxY1nZW4gKDk3NuKAkzk3OClcIixcIlRlbmdlbiAoOTc44oCTOTgzKVwiLFwiRWlrYW4gKDk4M+KAkzk4NSlcIixcIkthbm5hICg5ODXigJM5ODcpXCIsXCJFaWVuICg5ODfigJM5ODkpXCIsXCJFaXNvICg5ODnigJM5OTApXCIsXCJTaMWNcnlha3UgKDk5MOKAkzk5NSlcIixcIkNoxY10b2t1ICg5OTXigJM5OTkpXCIsXCJDaMWNaMWNICg5OTnigJMxMDA0KVwiLFwiS2Fua8WNICgxMDA04oCTMTAxMilcIixcIkNoxY13YSAoMTAxMuKAkzEwMTcpXCIsXCJLYW5uaW4gKDEwMTfigJMxMDIxKVwiLFwiSmlhbiAoMTAyMeKAkzEwMjQpXCIsXCJNYW5qdSAoMTAyNOKAkzEwMjgpXCIsXCJDaMWNZ2VuICgxMDI44oCTMTAzNylcIixcIkNoxY1yeWFrdSAoMTAzN+KAkzEwNDApXCIsXCJDaMWNa3nFqyAoMTA0MOKAkzEwNDQpXCIsXCJLYW50b2t1ICgxMDQ04oCTMTA0NilcIixcIkVpc2jFjSAoMTA0NuKAkzEwNTMpXCIsXCJUZW5naSAoMTA1M+KAkzEwNTgpXCIsXCJLxY1oZWkgKDEwNTjigJMxMDY1KVwiLFwiSmlyeWFrdSAoMTA2NeKAkzEwNjkpXCIsXCJFbmt5xasgKDEwNjnigJMxMDc0KVwiLFwiU2jFjWhvICgxMDc04oCTMTA3NylcIixcIlNoxY1yeWFrdSAoMTA3N+KAkzEwODEpXCIsXCJFaWjFjSAoMTA4MeKAkzEwODQpXCIsXCLFjHRva3UgKDEwODTigJMxMDg3KVwiLFwiS2FuamkgKDEwODfigJMxMDk0KVwiLFwiS2FoxY0gKDEwOTTigJMxMDk2KVwiLFwiRWljaMWNICgxMDk24oCTMTA5NylcIixcIkrFjXRva3UgKDEwOTfigJMxMDk5KVwiLFwiS8WNd2EgKDEwOTnigJMxMTA0KVwiLFwiQ2jFjWppICgxMTA04oCTMTEwNilcIixcIkthc2jFjSAoMTEwNuKAkzExMDgpXCIsXCJUZW5uaW4gKDExMDjigJMxMTEwKVwiLFwiVGVuLWVpICgxMTEwLTExMTMpXCIsXCJFaWt5xasgKDExMTPigJMxMTE4KVwiLFwiR2Vu4oCZZWkgKDExMTjigJMxMTIwKVwiLFwiSMWNYW4gKDExMjDigJMxMTI0KVwiLFwiVGVuamkgKDExMjTigJMxMTI2KVwiLFwiRGFpamkgKDExMjbigJMxMTMxKVwiLFwiVGVuc2jFjSAoMTEzMeKAkzExMzIpXCIsXCJDaMWNc2jFjSAoMTEzMuKAkzExMzUpXCIsXCJIxY1lbiAoMTEzNeKAkzExNDEpXCIsXCJFaWppICgxMTQx4oCTMTE0MilcIixcIkvFjWppICgxMTQy4oCTMTE0NClcIixcIlRlbuKAmXnFjSAoMTE0NOKAkzExNDUpXCIsXCJLecWrYW4gKDExNDXigJMxMTUxKVwiLFwiTmlucGVpICgxMTUx4oCTMTE1NClcIixcIkt5xatqdSAoMTE1NOKAkzExNTYpXCIsXCJIxY1nZW4gKDExNTbigJMxMTU5KVwiLFwiSGVpamkgKDExNTnigJMxMTYwKVwiLFwiRWlyeWFrdSAoMTE2MOKAkzExNjEpXCIsXCLFjGhvICgxMTYx4oCTMTE2MylcIixcIkNoxY1rYW4gKDExNjPigJMxMTY1KVwiLFwiRWltYW4gKDExNjXigJMxMTY2KVwiLFwiTmlu4oCZYW4gKDExNjbigJMxMTY5KVwiLFwiS2HFjSAoMTE2OeKAkzExNzEpXCIsXCJTaMWNYW4gKDExNzHigJMxMTc1KVwiLFwiQW5nZW4gKDExNzXigJMxMTc3KVwiLFwiSmlzaMWNICgxMTc34oCTMTE4MSlcIixcIlnFjXdhICgxMTgx4oCTMTE4MilcIixcIkp1ZWkgKDExODLigJMxMTg0KVwiLFwiR2Vucnlha3UgKDExODTigJMxMTg1KVwiLFwiQnVuamkgKDExODXigJMxMTkwKVwiLFwiS2Vua3nFqyAoMTE5MOKAkzExOTkpXCIsXCJTaMWNamkgKDExOTnigJMxMjAxKVwiLFwiS2VubmluICgxMjAx4oCTMTIwNClcIixcIkdlbmt5xasgKDEyMDTigJMxMjA2KVwiLFwiS2Vu4oCZZWkgKDEyMDbigJMxMjA3KVwiLFwiSsWNZ2VuICgxMjA34oCTMTIxMSlcIixcIktlbnJ5YWt1ICgxMjEx4oCTMTIxMylcIixcIktlbnDFjSAoMTIxM+KAkzEyMTkpXCIsXCJKxY1recWrICgxMjE54oCTMTIyMilcIixcIkrFjcWNICgxMjIy4oCTMTIyNClcIixcIkdlbm5pbiAoMTIyNOKAkzEyMjUpXCIsXCJLYXJva3UgKDEyMjXigJMxMjI3KVwiLFwiQW50ZWkgKDEyMjfigJMxMjI5KVwiLFwiS2Fua2kgKDEyMjnigJMxMjMyKVwiLFwiSsWNZWkgKDEyMzLigJMxMjMzKVwiLFwiVGVucHVrdSAoMTIzM+KAkzEyMzQpXCIsXCJCdW5yeWFrdSAoMTIzNOKAkzEyMzUpXCIsXCJLYXRlaSAoMTIzNeKAkzEyMzgpXCIsXCJSeWFrdW5pbiAoMTIzOOKAkzEyMzkpXCIsXCJFbuKAmcWNICgxMjM54oCTMTI0MClcIixcIk5pbmppICgxMjQw4oCTMTI0MylcIixcIkthbmdlbiAoMTI0M+KAkzEyNDcpXCIsXCJIxY1qaSAoMTI0N+KAkzEyNDkpXCIsXCJLZW5jaMWNICgxMjQ54oCTMTI1NilcIixcIkvFjWdlbiAoMTI1NuKAkzEyNTcpXCIsXCJTaMWNa2EgKDEyNTfigJMxMjU5KVwiLFwiU2jFjWdlbiAoMTI1OeKAkzEyNjApXCIsXCJCdW7igJnFjSAoMTI2MOKAkzEyNjEpXCIsXCJLxY1jaMWNICgxMjYx4oCTMTI2NClcIixcIkJ1buKAmWVpICgxMjY04oCTMTI3NSlcIixcIktlbmppICgxMjc14oCTMTI3OClcIixcIkvFjWFuICgxMjc44oCTMTI4OClcIixcIlNoxY3FjSAoMTI4OOKAkzEyOTMpXCIsXCJFaW5pbiAoMTI5M+KAkzEyOTkpXCIsXCJTaMWNYW4gKDEyOTnigJMxMzAyKVwiLFwiS2VuZ2VuICgxMzAy4oCTMTMwMylcIixcIkthZ2VuICgxMzAz4oCTMTMwNilcIixcIlRva3VqaSAoMTMwNuKAkzEzMDgpXCIsXCJFbmt5xY0gKDEzMDjigJMxMzExKVwiLFwixYxjaMWNICgxMzEx4oCTMTMxMilcIixcIlNoxY13YSAoMTMxMuKAkzEzMTcpXCIsXCJCdW5wxY0gKDEzMTfigJMxMzE5KVwiLFwiR2VuxY0gKDEzMTnigJMxMzIxKVwiLFwiR2Vua8WNICgxMzIx4oCTMTMyNClcIixcIlNoxY1jaMWrICgxMzI04oCTMTMyNilcIixcIkthcnlha3UgKDEzMjbigJMxMzI5KVwiLFwiR2VudG9rdSAoMTMyOeKAkzEzMzEpXCIsXCJHZW5rxY0gKDEzMzHigJMxMzM0KVwiLFwiS2VubXUgKDEzMzTigJMxMzM2KVwiLFwiRW5nZW4gKDEzMzbigJMxMzQwKVwiLFwiS8WNa29rdSAoMTM0MOKAkzEzNDYpXCIsXCJTaMWNaGVpICgxMzQ24oCTMTM3MClcIixcIktlbnRva3UgKDEzNzDigJMxMzcyKVwiLFwiQnVuY2jFqyAoMTM3MuKAkzEzNzUpXCIsXCJUZW5qdSAoMTM3NeKAkzEzNzkpXCIsXCJLxY1yeWFrdSAoMTM3OeKAkzEzODEpXCIsXCJLxY13YSAoMTM4MeKAkzEzODQpXCIsXCJHZW5jaMWrICgxMzg04oCTMTM5MilcIixcIk1laXRva3UgKDEzODTigJMxMzg3KVwiLFwiS2FrZWkgKDEzODfigJMxMzg5KVwiLFwiS8WNxY0gKDEzODnigJMxMzkwKVwiLFwiTWVpdG9rdSAoMTM5MOKAkzEzOTQpXCIsXCLFjGVpICgxMzk04oCTMTQyOClcIixcIlNoxY1jaMWNICgxNDI44oCTMTQyOSlcIixcIkVpa3nFjSAoMTQyOeKAkzE0NDEpXCIsXCJLYWtpdHN1ICgxNDQx4oCTMTQ0NClcIixcIkJ1buKAmWFuICgxNDQ04oCTMTQ0OSlcIixcIkjFjXRva3UgKDE0NDnigJMxNDUyKVwiLFwiS3nFjXRva3UgKDE0NTLigJMxNDU1KVwiLFwiS8WNc2jFjSAoMTQ1NeKAkzE0NTcpXCIsXCJDaMWNcm9rdSAoMTQ1N+KAkzE0NjApXCIsXCJLYW5zaMWNICgxNDYw4oCTMTQ2NilcIixcIkJ1bnNoxY0gKDE0NjbigJMxNDY3KVwiLFwixYxuaW4gKDE0NjfigJMxNDY5KVwiLFwiQnVubWVpICgxNDY54oCTMTQ4NylcIixcIkNoxY1recWNICgxNDg34oCTMTQ4OSlcIixcIkVudG9rdSAoMTQ4OeKAkzE0OTIpXCIsXCJNZWnFjSAoMTQ5MuKAkzE1MDEpXCIsXCJCdW5raSAoMTUwMeKAkzE1MDQpXCIsXCJFaXNoxY0gKDE1MDTigJMxNTIxKVwiLFwiVGFpZWkgKDE1MjHigJMxNTI4KVwiLFwiS3nFjXJva3UgKDE1MjjigJMxNTMyKVwiLFwiVGVuYnVuICgxNTMy4oCTMTU1NSlcIixcIkvFjWppICgxNTU14oCTMTU1OClcIixcIkVpcm9rdSAoMTU1OOKAkzE1NzApXCIsXCJHZW5raSAoMTU3MOKAkzE1NzMpXCIsXCJUZW5zaMWNICgxNTcz4oCTMTU5MilcIixcIkJ1bnJva3UgKDE1OTLigJMxNTk2KVwiLFwiS2VpY2jFjSAoMTU5NuKAkzE2MTUpXCIsXCJHZW5uYSAoMTYxNeKAkzE2MjQpXCIsXCJLYW7igJllaSAoMTYyNOKAkzE2NDQpXCIsXCJTaMWNaG8gKDE2NDTigJMxNjQ4KVwiLFwiS2VpYW4gKDE2NDjigJMxNjUyKVwiLFwiSsWNxY0gKDE2NTLigJMxNjU1KVwiLFwiTWVpcmVraSAoMTY1NeKAkzE2NTgpXCIsXCJNYW5qaSAoMTY1OOKAkzE2NjEpXCIsXCJLYW5idW4gKDE2NjHigJMxNjczKVwiLFwiRW5wxY0gKDE2NzPigJMxNjgxKVwiLFwiVGVubmEgKDE2ODHigJMxNjg0KVwiLFwiSsWNa3nFjSAoMTY4NOKAkzE2ODgpXCIsXCJHZW5yb2t1ICgxNjg44oCTMTcwNClcIixcIkjFjWVpICgxNzA04oCTMTcxMSlcIixcIlNoxY10b2t1ICgxNzEx4oCTMTcxNilcIixcIkt5xY1oxY0gKDE3MTbigJMxNzM2KVwiLFwiR2VuYnVuICgxNzM24oCTMTc0MSlcIixcIkthbnDFjSAoMTc0MeKAkzE3NDQpXCIsXCJFbmt5xY0gKDE3NDTigJMxNzQ4KVwiLFwiS2Fu4oCZZW4gKDE3NDjigJMxNzUxKVwiLFwiSMWNcmVraSAoMTc1MeKAkzE3NjQpXCIsXCJNZWl3YSAoMTc2NOKAkzE3NzIpXCIsXCJBbuKAmWVpICgxNzcy4oCTMTc4MSlcIixcIlRlbm1laSAoMTc4MeKAkzE3ODkpXCIsXCJLYW5zZWkgKDE3ODnigJMxODAxKVwiLFwiS3nFjXdhICgxODAx4oCTMTgwNClcIixcIkJ1bmthICgxODA04oCTMTgxOClcIixcIkJ1bnNlaSAoMTgxOOKAkzE4MzApXCIsXCJUZW5wxY0gKDE4MzDigJMxODQ0KVwiLFwiS8WNa2EgKDE4NDTigJMxODQ4KVwiLFwiS2FlaSAoMTg0OOKAkzE4NTQpXCIsXCJBbnNlaSAoMTg1NOKAkzE4NjApXCIsXCJNYW7igJllbiAoMTg2MOKAkzE4NjEpXCIsXCJCdW5recWrICgxODYx4oCTMTg2NClcIixcIkdlbmppICgxODY04oCTMTg2NSlcIixcIktlacWNICgxODY14oCTMTg2OClcIixcIk1laWppXCIsXCJUYWlzaMWNXCIsXCJTaMWNd2FcIixcIkhlaXNlaVwiXX0sZGF5UGVyaW9kczp7YW06XCJBTVwiLHBtOlwiUE1cIn19LHBlcnNpYW46e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIl0sc2hvcnQ6W1wiRmFydmFyZGluXCIsXCJPcmRpYmVoZXNodFwiLFwiS2hvcmRhZFwiLFwiVGlyXCIsXCJNb3JkYWRcIixcIlNoYWhyaXZhclwiLFwiTWVoclwiLFwiQWJhblwiLFwiQXphclwiLFwiRGV5XCIsXCJCYWhtYW5cIixcIkVzZmFuZFwiXSxsb25nOltcIkZhcnZhcmRpblwiLFwiT3JkaWJlaGVzaHRcIixcIktob3JkYWRcIixcIlRpclwiLFwiTW9yZGFkXCIsXCJTaGFocml2YXJcIixcIk1laHJcIixcIkFiYW5cIixcIkF6YXJcIixcIkRleVwiLFwiQmFobWFuXCIsXCJFc2ZhbmRcIl19LGRheXM6e25hcnJvdzpbXCJTXCIsXCJNXCIsXCJUXCIsXCJXXCIsXCJUXCIsXCJGXCIsXCJTXCJdLHNob3J0OltcIlN1blwiLFwiTW9uXCIsXCJUdWVcIixcIldlZFwiLFwiVGh1XCIsXCJGcmlcIixcIlNhdFwiXSxsb25nOltcIlN1bmRheVwiLFwiTW9uZGF5XCIsXCJUdWVzZGF5XCIsXCJXZWRuZXNkYXlcIixcIlRodXJzZGF5XCIsXCJGcmlkYXlcIixcIlNhdHVyZGF5XCJdfSxlcmFzOntuYXJyb3c6W1wiQVBcIl0sc2hvcnQ6W1wiQVBcIl0sbG9uZzpbXCJBUFwiXX0sZGF5UGVyaW9kczp7YW06XCJBTVwiLHBtOlwiUE1cIn19LHJvYzp7bW9udGhzOntuYXJyb3c6W1wiSlwiLFwiRlwiLFwiTVwiLFwiQVwiLFwiTVwiLFwiSlwiLFwiSlwiLFwiQVwiLFwiU1wiLFwiT1wiLFwiTlwiLFwiRFwiXSxzaG9ydDpbXCJKYW5cIixcIkZlYlwiLFwiTWFyXCIsXCJBcHJcIixcIk1heVwiLFwiSnVuXCIsXCJKdWxcIixcIkF1Z1wiLFwiU2VwXCIsXCJPY3RcIixcIk5vdlwiLFwiRGVjXCJdLGxvbmc6W1wiSmFudWFyeVwiLFwiRmVicnVhcnlcIixcIk1hcmNoXCIsXCJBcHJpbFwiLFwiTWF5XCIsXCJKdW5lXCIsXCJKdWx5XCIsXCJBdWd1c3RcIixcIlNlcHRlbWJlclwiLFwiT2N0b2JlclwiLFwiTm92ZW1iZXJcIixcIkRlY2VtYmVyXCJdfSxkYXlzOntuYXJyb3c6W1wiU1wiLFwiTVwiLFwiVFwiLFwiV1wiLFwiVFwiLFwiRlwiLFwiU1wiXSxzaG9ydDpbXCJTdW5cIixcIk1vblwiLFwiVHVlXCIsXCJXZWRcIixcIlRodVwiLFwiRnJpXCIsXCJTYXRcIl0sbG9uZzpbXCJTdW5kYXlcIixcIk1vbmRheVwiLFwiVHVlc2RheVwiLFwiV2VkbmVzZGF5XCIsXCJUaHVyc2RheVwiLFwiRnJpZGF5XCIsXCJTYXR1cmRheVwiXX0sZXJhczp7bmFycm93OltcIkJlZm9yZSBSLk8uQy5cIixcIk1pbmd1b1wiXSxzaG9ydDpbXCJCZWZvcmUgUi5PLkMuXCIsXCJNaW5ndW9cIl0sbG9uZzpbXCJCZWZvcmUgUi5PLkMuXCIsXCJNaW5ndW9cIl19LGRheVBlcmlvZHM6e2FtOlwiQU1cIixwbTpcIlBNXCJ9fX19LG51bWJlcjp7bnU6W1wibGF0blwiXSxwYXR0ZXJuczp7ZGVjaW1hbDp7cG9zaXRpdmVQYXR0ZXJuOlwie251bWJlcn1cIixuZWdhdGl2ZVBhdHRlcm46XCJ7bWludXNTaWdufXtudW1iZXJ9XCJ9LGN1cnJlbmN5Ontwb3NpdGl2ZVBhdHRlcm46XCJ7Y3VycmVuY3l9e251bWJlcn1cIixuZWdhdGl2ZVBhdHRlcm46XCJ7bWludXNTaWdufXtjdXJyZW5jeX17bnVtYmVyfVwifSxwZXJjZW50Ontwb3NpdGl2ZVBhdHRlcm46XCJ7bnVtYmVyfXtwZXJjZW50U2lnbn1cIixuZWdhdGl2ZVBhdHRlcm46XCJ7bWludXNTaWdufXtudW1iZXJ9e3BlcmNlbnRTaWdufVwifX0sc3ltYm9sczp7bGF0bjp7ZGVjaW1hbDpcIi5cIixncm91cDpcIixcIixuYW46XCJOYU5cIixwbHVzU2lnbjpcIitcIixtaW51c1NpZ246XCItXCIscGVyY2VudFNpZ246XCIlXCIsaW5maW5pdHk6XCLiiJ5cIn19LGN1cnJlbmNpZXM6e0FVRDpcIkEkXCIsQlJMOlwiUiRcIixDQUQ6XCJDQSRcIixDTlk6XCJDTsKlXCIsRVVSOlwi4oKsXCIsR0JQOlwiwqNcIixIS0Q6XCJISyRcIixJTFM6XCLigqpcIixJTlI6XCLigrlcIixKUFk6XCLCpVwiLEtSVzpcIuKCqVwiLE1YTjpcIk1YJFwiLE5aRDpcIk5aJFwiLFRXRDpcIk5UJFwiLFVTRDpcIiRcIixWTkQ6XCLigqtcIixYQUY6XCJGQ0ZBXCIsWENEOlwiRUMkXCIsWE9GOlwiQ0ZBXCIsWFBGOlwiQ0ZQRlwifX19KTsiLCJJbnRsUG9seWZpbGwuX19hZGRMb2NhbGVEYXRhKHtsb2NhbGU6XCJlc1wiLGRhdGU6e2NhOltcImdyZWdvcnlcIixcImJ1ZGRoaXN0XCIsXCJjaGluZXNlXCIsXCJjb3B0aWNcIixcImRhbmdpXCIsXCJldGhpb2FhXCIsXCJldGhpb3BpY1wiLFwiZ2VuZXJpY1wiLFwiaGVicmV3XCIsXCJpbmRpYW5cIixcImlzbGFtaWNcIixcImlzbGFtaWNjXCIsXCJqYXBhbmVzZVwiLFwicGVyc2lhblwiLFwicm9jXCJdLGhvdXJObzA6dHJ1ZSxob3VyMTI6ZmFsc2UsZm9ybWF0czp7c2hvcnQ6XCJ7MX0gezB9XCIsbWVkaXVtOlwiezF9IHswfVwiLGZ1bGw6XCJ7MX0sIHswfVwiLGxvbmc6XCJ7MX0sIHswfVwiLGF2YWlsYWJsZUZvcm1hdHM6e1wiZFwiOlwiZFwiLFwiRVwiOlwiY2NjXCIsRWQ6XCJFIGRcIixFaG06XCJFLCBoOm1tIGFcIixFSG06XCJFLCBIOm1tXCIsRWhtczpcIkUsIGg6bW06c3MgYVwiLEVIbXM6XCJFLCBIOm1tOnNzXCIsR3k6XCJ5IEdcIixHeU1NTTpcIk1NTSB5IEdcIixHeU1NTWQ6XCJkIE1NTSB5IEdcIixHeU1NTUVkOlwiRSwgZCBNTU0geSBHXCIsR3lNTU1NOlwiTU1NTSAnZGUnIHkgR1wiLEd5TU1NTWQ6XCJkICdkZScgTU1NTSAnZGUnIHkgR1wiLEd5TU1NTUVkOlwiRSwgZCAnZGUnIE1NTU0gJ2RlJyB5IEdcIixcImhcIjpcImggYVwiLFwiSFwiOlwiSFwiLGhtOlwiaDptbSBhXCIsSG06XCJIOm1tXCIsaG1zOlwiaDptbTpzcyBhXCIsSG1zOlwiSDptbTpzc1wiLGhtc3Y6XCJoOm1tOnNzIGEgdlwiLEhtc3Y6XCJIOm1tOnNzIHZcIixobXN2dnZ2OlwiaDptbTpzcyBhICh2dnZ2KVwiLEhtc3Z2dnY6XCJIOm1tOnNzICh2dnZ2KVwiLGhtdjpcImg6bW0gYSB2XCIsSG12OlwiSDptbSB2XCIsXCJNXCI6XCJMXCIsTWQ6XCJkL01cIixNRWQ6XCJFLCBkL01cIixNTWQ6XCJkL01cIixNTWRkOlwiZC9NXCIsTU1NOlwiTExMXCIsTU1NZDpcImQgTU1NXCIsTU1NRWQ6XCJFLCBkIE1NTVwiLE1NTU1kOlwiZCAnZGUnIE1NTU1cIixNTU1NRWQ6XCJFLCBkICdkZScgTU1NTVwiLG1zOlwibW06c3NcIixcInlcIjpcInlcIix5TTpcIk0veVwiLHlNZDpcImQvTS95XCIseU1FZDpcIkVFRSwgZC9NL3lcIix5TU06XCJNL3lcIix5TU1NOlwiTU1NIHlcIix5TU1NZDpcImQgTU1NIHlcIix5TU1NRWQ6XCJFRUUsIGQgTU1NIHlcIix5TU1NTTpcIk1NTU0gJ2RlJyB5XCIseU1NTU1kOlwiZCAnZGUnIE1NTU0gJ2RlJyB5XCIseU1NTU1FZDpcIkVFRSwgZCAnZGUnIE1NTU0gJ2RlJyB5XCIseVFRUTpcIlFRUSB5XCIseVFRUVE6XCJRUVFRICdkZScgeVwifSxkYXRlRm9ybWF0czp7eU1NTU1FRUVFZDpcIkVFRUUsIGQgJ2RlJyBNTU1NICdkZScgeVwiLHlNTU1NZDpcImQgJ2RlJyBNTU1NICdkZScgeVwiLHlNTU1kOlwiZCBNTU0geVwiLHlNZDpcImQvTS95eVwifSx0aW1lRm9ybWF0czp7aG1tc3N6enp6OlwiSDptbTpzcyAoenp6eilcIixobXN6OlwiSDptbTpzcyB6XCIsaG1zOlwiSDptbTpzc1wiLGhtOlwiSDptbVwifX0sY2FsZW5kYXJzOntidWRkaGlzdDp7bW9udGhzOntuYXJyb3c6W1wiRVwiLFwiRlwiLFwiTVwiLFwiQVwiLFwiTVwiLFwiSlwiLFwiSlwiLFwiQVwiLFwiU1wiLFwiT1wiLFwiTlwiLFwiRFwiXSxzaG9ydDpbXCJlbmUuXCIsXCJmZWIuXCIsXCJtYXIuXCIsXCJhYnIuXCIsXCJtYXkuXCIsXCJqdW4uXCIsXCJqdWwuXCIsXCJhZ28uXCIsXCJzZXB0LlwiLFwib2N0LlwiLFwibm92LlwiLFwiZGljLlwiXSxsb25nOltcImVuZXJvXCIsXCJmZWJyZXJvXCIsXCJtYXJ6b1wiLFwiYWJyaWxcIixcIm1heW9cIixcImp1bmlvXCIsXCJqdWxpb1wiLFwiYWdvc3RvXCIsXCJzZXB0aWVtYnJlXCIsXCJvY3R1YnJlXCIsXCJub3ZpZW1icmVcIixcImRpY2llbWJyZVwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiQkVcIl0sc2hvcnQ6W1wiQkVcIl0sbG9uZzpbXCJCRVwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LGNoaW5lc2U6e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIl0sc2hvcnQ6W1wiTTAxXCIsXCJNMDJcIixcIk0wM1wiLFwiTTA0XCIsXCJNMDVcIixcIk0wNlwiLFwiTTA3XCIsXCJNMDhcIixcIk0wOVwiLFwiTTEwXCIsXCJNMTFcIixcIk0xMlwiXSxsb25nOltcIk0wMVwiLFwiTTAyXCIsXCJNMDNcIixcIk0wNFwiLFwiTTA1XCIsXCJNMDZcIixcIk0wN1wiLFwiTTA4XCIsXCJNMDlcIixcIk0xMFwiLFwiTTExXCIsXCJNMTJcIl19LGRheXM6e25hcnJvdzpbXCJEXCIsXCJMXCIsXCJNXCIsXCJYXCIsXCJKXCIsXCJWXCIsXCJTXCJdLHNob3J0OltcImRvbS5cIixcImx1bi5cIixcIm1hci5cIixcIm1pw6kuXCIsXCJqdWUuXCIsXCJ2aWUuXCIsXCJzw6FiLlwiXSxsb25nOltcImRvbWluZ29cIixcImx1bmVzXCIsXCJtYXJ0ZXNcIixcIm1pw6lyY29sZXNcIixcImp1ZXZlc1wiLFwidmllcm5lc1wiLFwic8OhYmFkb1wiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LGNvcHRpYzp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiLFwiMTNcIl0sc2hvcnQ6W1wiVG91dFwiLFwiQmFiYVwiLFwiSGF0b3JcIixcIktpYWhrXCIsXCJUb2JhXCIsXCJBbXNoaXJcIixcIkJhcmFtaGF0XCIsXCJCYXJhbW91ZGFcIixcIkJhc2hhbnNcIixcIlBhb25hXCIsXCJFcGVwXCIsXCJNZXNyYVwiLFwiTmFzaWVcIl0sbG9uZzpbXCJUb3V0XCIsXCJCYWJhXCIsXCJIYXRvclwiLFwiS2lhaGtcIixcIlRvYmFcIixcIkFtc2hpclwiLFwiQmFyYW1oYXRcIixcIkJhcmFtb3VkYVwiLFwiQmFzaGFuc1wiLFwiUGFvbmFcIixcIkVwZXBcIixcIk1lc3JhXCIsXCJOYXNpZVwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiRVJBMFwiLFwiRVJBMVwiXSxzaG9ydDpbXCJFUkEwXCIsXCJFUkExXCJdLGxvbmc6W1wiRVJBMFwiLFwiRVJBMVwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LGRhbmdpOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCJdLHNob3J0OltcIk0wMVwiLFwiTTAyXCIsXCJNMDNcIixcIk0wNFwiLFwiTTA1XCIsXCJNMDZcIixcIk0wN1wiLFwiTTA4XCIsXCJNMDlcIixcIk0xMFwiLFwiTTExXCIsXCJNMTJcIl0sbG9uZzpbXCJNMDFcIixcIk0wMlwiLFwiTTAzXCIsXCJNMDRcIixcIk0wNVwiLFwiTTA2XCIsXCJNMDdcIixcIk0wOFwiLFwiTTA5XCIsXCJNMTBcIixcIk0xMVwiLFwiTTEyXCJdfSxkYXlzOntuYXJyb3c6W1wiRFwiLFwiTFwiLFwiTVwiLFwiWFwiLFwiSlwiLFwiVlwiLFwiU1wiXSxzaG9ydDpbXCJkb20uXCIsXCJsdW4uXCIsXCJtYXIuXCIsXCJtacOpLlwiLFwianVlLlwiLFwidmllLlwiLFwic8OhYi5cIl0sbG9uZzpbXCJkb21pbmdvXCIsXCJsdW5lc1wiLFwibWFydGVzXCIsXCJtacOpcmNvbGVzXCIsXCJqdWV2ZXNcIixcInZpZXJuZXNcIixcInPDoWJhZG9cIl19LGRheVBlcmlvZHM6e2FtOlwiYS4gbS5cIixwbTpcInAuIG0uXCJ9fSxldGhpb3BpYzp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiLFwiMTNcIl0sc2hvcnQ6W1wiTWVza2VyZW1cIixcIlRla2VtdFwiLFwiSGVkYXJcIixcIlRhaHNhc1wiLFwiVGVyXCIsXCJZZWthdGl0XCIsXCJNZWdhYml0XCIsXCJNaWF6aWFcIixcIkdlbmJvdFwiLFwiU2VuZVwiLFwiSGFtbGVcIixcIk5laGFzc2VcIixcIlBhZ3VtZW5cIl0sbG9uZzpbXCJNZXNrZXJlbVwiLFwiVGVrZW10XCIsXCJIZWRhclwiLFwiVGFoc2FzXCIsXCJUZXJcIixcIllla2F0aXRcIixcIk1lZ2FiaXRcIixcIk1pYXppYVwiLFwiR2VuYm90XCIsXCJTZW5lXCIsXCJIYW1sZVwiLFwiTmVoYXNzZVwiLFwiUGFndW1lblwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiRVJBMFwiLFwiRVJBMVwiXSxzaG9ydDpbXCJFUkEwXCIsXCJFUkExXCJdLGxvbmc6W1wiRVJBMFwiLFwiRVJBMVwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LGV0aGlvYWE6e21vbnRoczp7bmFycm93OltcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIjEwXCIsXCIxMVwiLFwiMTJcIixcIjEzXCJdLHNob3J0OltcIk1lc2tlcmVtXCIsXCJUZWtlbXRcIixcIkhlZGFyXCIsXCJUYWhzYXNcIixcIlRlclwiLFwiWWVrYXRpdFwiLFwiTWVnYWJpdFwiLFwiTWlhemlhXCIsXCJHZW5ib3RcIixcIlNlbmVcIixcIkhhbWxlXCIsXCJOZWhhc3NlXCIsXCJQYWd1bWVuXCJdLGxvbmc6W1wiTWVza2VyZW1cIixcIlRla2VtdFwiLFwiSGVkYXJcIixcIlRhaHNhc1wiLFwiVGVyXCIsXCJZZWthdGl0XCIsXCJNZWdhYml0XCIsXCJNaWF6aWFcIixcIkdlbmJvdFwiLFwiU2VuZVwiLFwiSGFtbGVcIixcIk5laGFzc2VcIixcIlBhZ3VtZW5cIl19LGRheXM6e25hcnJvdzpbXCJEXCIsXCJMXCIsXCJNXCIsXCJYXCIsXCJKXCIsXCJWXCIsXCJTXCJdLHNob3J0OltcImRvbS5cIixcImx1bi5cIixcIm1hci5cIixcIm1pw6kuXCIsXCJqdWUuXCIsXCJ2aWUuXCIsXCJzw6FiLlwiXSxsb25nOltcImRvbWluZ29cIixcImx1bmVzXCIsXCJtYXJ0ZXNcIixcIm1pw6lyY29sZXNcIixcImp1ZXZlc1wiLFwidmllcm5lc1wiLFwic8OhYmFkb1wiXX0sZXJhczp7bmFycm93OltcIkVSQTBcIl0sc2hvcnQ6W1wiRVJBMFwiXSxsb25nOltcIkVSQTBcIl19LGRheVBlcmlvZHM6e2FtOlwiYS4gbS5cIixwbTpcInAuIG0uXCJ9fSxnZW5lcmljOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCJdLHNob3J0OltcIk0wMVwiLFwiTTAyXCIsXCJNMDNcIixcIk0wNFwiLFwiTTA1XCIsXCJNMDZcIixcIk0wN1wiLFwiTTA4XCIsXCJNMDlcIixcIk0xMFwiLFwiTTExXCIsXCJNMTJcIl0sbG9uZzpbXCJNMDFcIixcIk0wMlwiLFwiTTAzXCIsXCJNMDRcIixcIk0wNVwiLFwiTTA2XCIsXCJNMDdcIixcIk0wOFwiLFwiTTA5XCIsXCJNMTBcIixcIk0xMVwiLFwiTTEyXCJdfSxkYXlzOntuYXJyb3c6W1wiRFwiLFwiTFwiLFwiTVwiLFwiWFwiLFwiSlwiLFwiVlwiLFwiU1wiXSxzaG9ydDpbXCJkb20uXCIsXCJsdW4uXCIsXCJtYXIuXCIsXCJtacOpLlwiLFwianVlLlwiLFwidmllLlwiLFwic8OhYi5cIl0sbG9uZzpbXCJkb21pbmdvXCIsXCJsdW5lc1wiLFwibWFydGVzXCIsXCJtacOpcmNvbGVzXCIsXCJqdWV2ZXNcIixcInZpZXJuZXNcIixcInPDoWJhZG9cIl19LGVyYXM6e25hcnJvdzpbXCJFUkEwXCIsXCJFUkExXCJdLHNob3J0OltcIkVSQTBcIixcIkVSQTFcIl0sbG9uZzpbXCJFUkEwXCIsXCJFUkExXCJdfSxkYXlQZXJpb2RzOnthbTpcImEuIG0uXCIscG06XCJwLiBtLlwifX0sZ3JlZ29yeTp7bW9udGhzOntuYXJyb3c6W1wiRVwiLFwiRlwiLFwiTVwiLFwiQVwiLFwiTVwiLFwiSlwiLFwiSlwiLFwiQVwiLFwiU1wiLFwiT1wiLFwiTlwiLFwiRFwiXSxzaG9ydDpbXCJlbmUuXCIsXCJmZWIuXCIsXCJtYXIuXCIsXCJhYnIuXCIsXCJtYXkuXCIsXCJqdW4uXCIsXCJqdWwuXCIsXCJhZ28uXCIsXCJzZXB0LlwiLFwib2N0LlwiLFwibm92LlwiLFwiZGljLlwiXSxsb25nOltcImVuZXJvXCIsXCJmZWJyZXJvXCIsXCJtYXJ6b1wiLFwiYWJyaWxcIixcIm1heW9cIixcImp1bmlvXCIsXCJqdWxpb1wiLFwiYWdvc3RvXCIsXCJzZXB0aWVtYnJlXCIsXCJvY3R1YnJlXCIsXCJub3ZpZW1icmVcIixcImRpY2llbWJyZVwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiYS4gQy5cIixcImQuIEMuXCIsXCJhLiBlLiBjLlwiLFwiZS4gYy5cIl0sc2hvcnQ6W1wiYS4gQy5cIixcImQuIEMuXCIsXCJhLiBlLiBjLlwiLFwiZS4gYy5cIl0sbG9uZzpbXCJhbnRlcyBkZSBDcmlzdG9cIixcImRlc3B1w6lzIGRlIENyaXN0b1wiLFwiYW50ZXMgZGUgbGEgZXJhIGNvbcO6blwiLFwiZXJhIGNvbcO6blwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LGhlYnJldzp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiLFwiMTNcIixcIjdcIl0sc2hvcnQ6W1wiVGlzaHJpXCIsXCJIZXNodmFuXCIsXCJLaXNsZXZcIixcIlRldmV0XCIsXCJTaGV2YXRcIixcIkFkYXIgSVwiLFwiQWRhclwiLFwiTmlzYW5cIixcIkl5YXJcIixcIlNpdmFuXCIsXCJUYW11elwiLFwiQXZcIixcIkVsdWxcIixcIkFkYXIgSUlcIl0sbG9uZzpbXCJUaXNocmlcIixcIkhlc2h2YW5cIixcIktpc2xldlwiLFwiVGV2ZXRcIixcIlNoZXZhdFwiLFwiQWRhciBJXCIsXCJBZGFyXCIsXCJOaXNhblwiLFwiSXlhclwiLFwiU2l2YW5cIixcIlRhbXV6XCIsXCJBdlwiLFwiRWx1bFwiLFwiQWRhciBJSVwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiQU1cIl0sc2hvcnQ6W1wiQU1cIl0sbG9uZzpbXCJBTVwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LGluZGlhbjp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiXSxzaG9ydDpbXCJDaGFpdHJhXCIsXCJWYWlzYWtoYVwiLFwiSnlhaXN0aGFcIixcIkFzYWRoYVwiLFwiU3JhdmFuYVwiLFwiQmhhZHJhXCIsXCJBc3ZpbmFcIixcIkthcnRpa2FcIixcIkFncmFoYXlhbmFcIixcIlBhdXNhXCIsXCJNYWdoYVwiLFwiUGhhbGd1bmFcIl0sbG9uZzpbXCJDaGFpdHJhXCIsXCJWYWlzYWtoYVwiLFwiSnlhaXN0aGFcIixcIkFzYWRoYVwiLFwiU3JhdmFuYVwiLFwiQmhhZHJhXCIsXCJBc3ZpbmFcIixcIkthcnRpa2FcIixcIkFncmFoYXlhbmFcIixcIlBhdXNhXCIsXCJNYWdoYVwiLFwiUGhhbGd1bmFcIl19LGRheXM6e25hcnJvdzpbXCJEXCIsXCJMXCIsXCJNXCIsXCJYXCIsXCJKXCIsXCJWXCIsXCJTXCJdLHNob3J0OltcImRvbS5cIixcImx1bi5cIixcIm1hci5cIixcIm1pw6kuXCIsXCJqdWUuXCIsXCJ2aWUuXCIsXCJzw6FiLlwiXSxsb25nOltcImRvbWluZ29cIixcImx1bmVzXCIsXCJtYXJ0ZXNcIixcIm1pw6lyY29sZXNcIixcImp1ZXZlc1wiLFwidmllcm5lc1wiLFwic8OhYmFkb1wiXX0sZXJhczp7bmFycm93OltcIlNha2FcIl0sc2hvcnQ6W1wiU2FrYVwiXSxsb25nOltcIlNha2FcIl19LGRheVBlcmlvZHM6e2FtOlwiYS4gbS5cIixwbTpcInAuIG0uXCJ9fSxpc2xhbWljOnttb250aHM6e25hcnJvdzpbXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCIxMFwiLFwiMTFcIixcIjEyXCJdLHNob3J0OltcIk11aC5cIixcIlNhZi5cIixcIlJhYi4gSVwiLFwiUmFiLiBJSVwiLFwiSnVtLiBJXCIsXCJKdW0uIElJXCIsXCJSYWouXCIsXCJTaGEuXCIsXCJSYW0uXCIsXCJTaGF3LlwiLFwiRGh1yrtsLVEuXCIsXCJEaHXKu2wtSC5cIl0sbG9uZzpbXCJNdWhhcnJhbVwiLFwiU2FmYXJcIixcIlJhYmnKuyBJXCIsXCJSYWJpyrsgSUlcIixcIkp1bWFkYSBJXCIsXCJKdW1hZGEgSUlcIixcIlJhamFiXCIsXCJTaGHKu2JhblwiLFwiUmFtYWRhblwiLFwiU2hhd3dhbFwiLFwiRGh1yrtsLVFpyrtkYWhcIixcIkRodcq7bC1IaWpqYWhcIl19LGRheXM6e25hcnJvdzpbXCJEXCIsXCJMXCIsXCJNXCIsXCJYXCIsXCJKXCIsXCJWXCIsXCJTXCJdLHNob3J0OltcImRvbS5cIixcImx1bi5cIixcIm1hci5cIixcIm1pw6kuXCIsXCJqdWUuXCIsXCJ2aWUuXCIsXCJzw6FiLlwiXSxsb25nOltcImRvbWluZ29cIixcImx1bmVzXCIsXCJtYXJ0ZXNcIixcIm1pw6lyY29sZXNcIixcImp1ZXZlc1wiLFwidmllcm5lc1wiLFwic8OhYmFkb1wiXX0sZXJhczp7bmFycm93OltcIkFIXCJdLHNob3J0OltcIkFIXCJdLGxvbmc6W1wiQUhcIl19LGRheVBlcmlvZHM6e2FtOlwiYS4gbS5cIixwbTpcInAuIG0uXCJ9fSxpc2xhbWljYzp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiXSxzaG9ydDpbXCJNdWguXCIsXCJTYWYuXCIsXCJSYWIuIElcIixcIlJhYi4gSUlcIixcIkp1bS4gSVwiLFwiSnVtLiBJSVwiLFwiUmFqLlwiLFwiU2hhLlwiLFwiUmFtLlwiLFwiU2hhdy5cIixcIkRodcq7bC1RLlwiLFwiRGh1yrtsLUguXCJdLGxvbmc6W1wiTXVoYXJyYW1cIixcIlNhZmFyXCIsXCJSYWJpyrsgSVwiLFwiUmFiacq7IElJXCIsXCJKdW1hZGEgSVwiLFwiSnVtYWRhIElJXCIsXCJSYWphYlwiLFwiU2hhyrtiYW5cIixcIlJhbWFkYW5cIixcIlNoYXd3YWxcIixcIkRodcq7bC1Racq7ZGFoXCIsXCJEaHXKu2wtSGlqamFoXCJdfSxkYXlzOntuYXJyb3c6W1wiRFwiLFwiTFwiLFwiTVwiLFwiWFwiLFwiSlwiLFwiVlwiLFwiU1wiXSxzaG9ydDpbXCJkb20uXCIsXCJsdW4uXCIsXCJtYXIuXCIsXCJtacOpLlwiLFwianVlLlwiLFwidmllLlwiLFwic8OhYi5cIl0sbG9uZzpbXCJkb21pbmdvXCIsXCJsdW5lc1wiLFwibWFydGVzXCIsXCJtacOpcmNvbGVzXCIsXCJqdWV2ZXNcIixcInZpZXJuZXNcIixcInPDoWJhZG9cIl19LGVyYXM6e25hcnJvdzpbXCJBSFwiXSxzaG9ydDpbXCJBSFwiXSxsb25nOltcIkFIXCJdfSxkYXlQZXJpb2RzOnthbTpcImEuIG0uXCIscG06XCJwLiBtLlwifX0samFwYW5lc2U6e21vbnRoczp7bmFycm93OltcIkVcIixcIkZcIixcIk1cIixcIkFcIixcIk1cIixcIkpcIixcIkpcIixcIkFcIixcIlNcIixcIk9cIixcIk5cIixcIkRcIl0sc2hvcnQ6W1wiZW5lLlwiLFwiZmViLlwiLFwibWFyLlwiLFwiYWJyLlwiLFwibWF5LlwiLFwianVuLlwiLFwianVsLlwiLFwiYWdvLlwiLFwic2VwdC5cIixcIm9jdC5cIixcIm5vdi5cIixcImRpYy5cIl0sbG9uZzpbXCJlbmVyb1wiLFwiZmVicmVyb1wiLFwibWFyem9cIixcImFicmlsXCIsXCJtYXlvXCIsXCJqdW5pb1wiLFwianVsaW9cIixcImFnb3N0b1wiLFwic2VwdGllbWJyZVwiLFwib2N0dWJyZVwiLFwibm92aWVtYnJlXCIsXCJkaWNpZW1icmVcIl19LGRheXM6e25hcnJvdzpbXCJEXCIsXCJMXCIsXCJNXCIsXCJYXCIsXCJKXCIsXCJWXCIsXCJTXCJdLHNob3J0OltcImRvbS5cIixcImx1bi5cIixcIm1hci5cIixcIm1pw6kuXCIsXCJqdWUuXCIsXCJ2aWUuXCIsXCJzw6FiLlwiXSxsb25nOltcImRvbWluZ29cIixcImx1bmVzXCIsXCJtYXJ0ZXNcIixcIm1pw6lyY29sZXNcIixcImp1ZXZlc1wiLFwidmllcm5lc1wiLFwic8OhYmFkb1wiXX0sZXJhczp7bmFycm93OltcIlRhaWthICg2NDXigJM2NTApXCIsXCJIYWt1Y2hpICg2NTDigJM2NzEpXCIsXCJIYWt1aMWNICg2NzLigJM2ODYpXCIsXCJTaHVjaMWNICg2ODbigJM3MDEpXCIsXCJUYWloxY0gKDcwMeKAkzcwNClcIixcIktlaXVuICg3MDTigJM3MDgpXCIsXCJXYWTFjSAoNzA44oCTNzE1KVwiLFwiUmVpa2kgKDcxNeKAkzcxNylcIixcIlnFjXLFjSAoNzE34oCTNzI0KVwiLFwiSmlua2kgKDcyNOKAkzcyOSlcIixcIlRlbnB5xY0gKDcyOeKAkzc0OSlcIixcIlRlbnB5xY0ta2FtcMWNICg3NDktNzQ5KVwiLFwiVGVucHnFjS1zaMWNaMWNICg3NDktNzU3KVwiLFwiVGVucHnFjS1oxY1qaSAoNzU3LTc2NSlcIixcIlRlbnB5xY0tamluZ28gKDc2NS03NjcpXCIsXCJKaW5nby1rZWl1biAoNzY3LTc3MClcIixcIkjFjWtpICg3NzDigJM3ODApXCIsXCJUZW4txY0gKDc4MS03ODIpXCIsXCJFbnJ5YWt1ICg3ODLigJM4MDYpXCIsXCJEYWlkxY0gKDgwNuKAkzgxMClcIixcIkvFjW5pbiAoODEw4oCTODI0KVwiLFwiVGVuY2jFjSAoODI04oCTODM0KVwiLFwiSsWNd2EgKDgzNOKAkzg0OClcIixcIkthasWNICg4NDjigJM4NTEpXCIsXCJOaW5qdSAoODUx4oCTODU0KVwiLFwiU2Fpa8WNICg4NTTigJM4NTcpXCIsXCJUZW4tYW4gKDg1Ny04NTkpXCIsXCJKxY1nYW4gKDg1OeKAkzg3NylcIixcIkdhbmd5xY0gKDg3N+KAkzg4NSlcIixcIk5pbm5hICg4ODXigJM4ODkpXCIsXCJLYW5wecWNICg4ODnigJM4OTgpXCIsXCJTaMWNdGFpICg4OTjigJM5MDEpXCIsXCJFbmdpICg5MDHigJM5MjMpXCIsXCJFbmNoxY0gKDkyM+KAkzkzMSlcIixcIkrFjWhlaSAoOTMx4oCTOTM4KVwiLFwiVGVuZ3nFjSAoOTM44oCTOTQ3KVwiLFwiVGVucnlha3UgKDk0N+KAkzk1NylcIixcIlRlbnRva3UgKDk1N+KAkzk2MSlcIixcIsWMd2EgKDk2MeKAkzk2NClcIixcIkvFjWjFjSAoOTY04oCTOTY4KVwiLFwiQW5uYSAoOTY44oCTOTcwKVwiLFwiVGVucm9rdSAoOTcw4oCTOTczKVwiLFwiVGVu4oCZZW4gKDk3M+KAkzk3NilcIixcIkrFjWdlbiAoOTc24oCTOTc4KVwiLFwiVGVuZ2VuICg5NzjigJM5ODMpXCIsXCJFaWthbiAoOTgz4oCTOTg1KVwiLFwiS2FubmEgKDk4NeKAkzk4NylcIixcIkVpZW4gKDk4N+KAkzk4OSlcIixcIkVpc28gKDk4OeKAkzk5MClcIixcIlNoxY1yeWFrdSAoOTkw4oCTOTk1KVwiLFwiQ2jFjXRva3UgKDk5NeKAkzk5OSlcIixcIkNoxY1oxY0gKDk5OeKAkzEwMDQpXCIsXCJLYW5rxY0gKDEwMDTigJMxMDEyKVwiLFwiQ2jFjXdhICgxMDEy4oCTMTAxNylcIixcIkthbm5pbiAoMTAxN+KAkzEwMjEpXCIsXCJKaWFuICgxMDIx4oCTMTAyNClcIixcIk1hbmp1ICgxMDI04oCTMTAyOClcIixcIkNoxY1nZW4gKDEwMjjigJMxMDM3KVwiLFwiQ2jFjXJ5YWt1ICgxMDM34oCTMTA0MClcIixcIkNoxY1recWrICgxMDQw4oCTMTA0NClcIixcIkthbnRva3UgKDEwNDTigJMxMDQ2KVwiLFwiRWlzaMWNICgxMDQ24oCTMTA1MylcIixcIlRlbmdpICgxMDUz4oCTMTA1OClcIixcIkvFjWhlaSAoMTA1OOKAkzEwNjUpXCIsXCJKaXJ5YWt1ICgxMDY14oCTMTA2OSlcIixcIkVua3nFqyAoMTA2OeKAkzEwNzQpXCIsXCJTaMWNaG8gKDEwNzTigJMxMDc3KVwiLFwiU2jFjXJ5YWt1ICgxMDc34oCTMTA4MSlcIixcIkVpaMWNICgxMDgx4oCTMTA4NClcIixcIsWMdG9rdSAoMTA4NOKAkzEwODcpXCIsXCJLYW5qaSAoMTA4N+KAkzEwOTQpXCIsXCJLYWjFjSAoMTA5NOKAkzEwOTYpXCIsXCJFaWNoxY0gKDEwOTbigJMxMDk3KVwiLFwiSsWNdG9rdSAoMTA5N+KAkzEwOTkpXCIsXCJLxY13YSAoMTA5OeKAkzExMDQpXCIsXCJDaMWNamkgKDExMDTigJMxMTA2KVwiLFwiS2FzaMWNICgxMTA24oCTMTEwOClcIixcIlRlbm5pbiAoMTEwOOKAkzExMTApXCIsXCJUZW4tZWkgKDExMTAtMTExMylcIixcIkVpa3nFqyAoMTExM+KAkzExMTgpXCIsXCJHZW7igJllaSAoMTExOOKAkzExMjApXCIsXCJIxY1hbiAoMTEyMOKAkzExMjQpXCIsXCJUZW5qaSAoMTEyNOKAkzExMjYpXCIsXCJEYWlqaSAoMTEyNuKAkzExMzEpXCIsXCJUZW5zaMWNICgxMTMx4oCTMTEzMilcIixcIkNoxY1zaMWNICgxMTMy4oCTMTEzNSlcIixcIkjFjWVuICgxMTM14oCTMTE0MSlcIixcIkVpamkgKDExNDHigJMxMTQyKVwiLFwiS8WNamkgKDExNDLigJMxMTQ0KVwiLFwiVGVu4oCZecWNICgxMTQ04oCTMTE0NSlcIixcIkt5xathbiAoMTE0NeKAkzExNTEpXCIsXCJOaW5wZWkgKDExNTHigJMxMTU0KVwiLFwiS3nFq2p1ICgxMTU04oCTMTE1NilcIixcIkjFjWdlbiAoMTE1NuKAkzExNTkpXCIsXCJIZWlqaSAoMTE1OeKAkzExNjApXCIsXCJFaXJ5YWt1ICgxMTYw4oCTMTE2MSlcIixcIsWMaG8gKDExNjHigJMxMTYzKVwiLFwiQ2jFjWthbiAoMTE2M+KAkzExNjUpXCIsXCJFaW1hbiAoMTE2NeKAkzExNjYpXCIsXCJOaW7igJlhbiAoMTE2NuKAkzExNjkpXCIsXCJLYcWNICgxMTY54oCTMTE3MSlcIixcIlNoxY1hbiAoMTE3MeKAkzExNzUpXCIsXCJBbmdlbiAoMTE3NeKAkzExNzcpXCIsXCJKaXNoxY0gKDExNzfigJMxMTgxKVwiLFwiWcWNd2EgKDExODHigJMxMTgyKVwiLFwiSnVlaSAoMTE4MuKAkzExODQpXCIsXCJHZW5yeWFrdSAoMTE4NOKAkzExODUpXCIsXCJCdW5qaSAoMTE4NeKAkzExOTApXCIsXCJLZW5recWrICgxMTkw4oCTMTE5OSlcIixcIlNoxY1qaSAoMTE5OeKAkzEyMDEpXCIsXCJLZW5uaW4gKDEyMDHigJMxMjA0KVwiLFwiR2Vua3nFqyAoMTIwNOKAkzEyMDYpXCIsXCJLZW7igJllaSAoMTIwNuKAkzEyMDcpXCIsXCJKxY1nZW4gKDEyMDfigJMxMjExKVwiLFwiS2Vucnlha3UgKDEyMTHigJMxMjEzKVwiLFwiS2VucMWNICgxMjEz4oCTMTIxOSlcIixcIkrFjWt5xasgKDEyMTnigJMxMjIyKVwiLFwiSsWNxY0gKDEyMjLigJMxMjI0KVwiLFwiR2VubmluICgxMjI04oCTMTIyNSlcIixcIkthcm9rdSAoMTIyNeKAkzEyMjcpXCIsXCJBbnRlaSAoMTIyN+KAkzEyMjkpXCIsXCJLYW5raSAoMTIyOeKAkzEyMzIpXCIsXCJKxY1laSAoMTIzMuKAkzEyMzMpXCIsXCJUZW5wdWt1ICgxMjMz4oCTMTIzNClcIixcIkJ1bnJ5YWt1ICgxMjM04oCTMTIzNSlcIixcIkthdGVpICgxMjM14oCTMTIzOClcIixcIlJ5YWt1bmluICgxMjM44oCTMTIzOSlcIixcIkVu4oCZxY0gKDEyMznigJMxMjQwKVwiLFwiTmluamkgKDEyNDDigJMxMjQzKVwiLFwiS2FuZ2VuICgxMjQz4oCTMTI0NylcIixcIkjFjWppICgxMjQ34oCTMTI0OSlcIixcIktlbmNoxY0gKDEyNDnigJMxMjU2KVwiLFwiS8WNZ2VuICgxMjU24oCTMTI1NylcIixcIlNoxY1rYSAoMTI1N+KAkzEyNTkpXCIsXCJTaMWNZ2VuICgxMjU54oCTMTI2MClcIixcIkJ1buKAmcWNICgxMjYw4oCTMTI2MSlcIixcIkvFjWNoxY0gKDEyNjHigJMxMjY0KVwiLFwiQnVu4oCZZWkgKDEyNjTigJMxMjc1KVwiLFwiS2VuamkgKDEyNzXigJMxMjc4KVwiLFwiS8WNYW4gKDEyNzjigJMxMjg4KVwiLFwiU2jFjcWNICgxMjg44oCTMTI5MylcIixcIkVpbmluICgxMjkz4oCTMTI5OSlcIixcIlNoxY1hbiAoMTI5OeKAkzEzMDIpXCIsXCJLZW5nZW4gKDEzMDLigJMxMzAzKVwiLFwiS2FnZW4gKDEzMDPigJMxMzA2KVwiLFwiVG9rdWppICgxMzA24oCTMTMwOClcIixcIkVua3nFjSAoMTMwOOKAkzEzMTEpXCIsXCLFjGNoxY0gKDEzMTHigJMxMzEyKVwiLFwiU2jFjXdhICgxMzEy4oCTMTMxNylcIixcIkJ1bnDFjSAoMTMxN+KAkzEzMTkpXCIsXCJHZW7FjSAoMTMxOeKAkzEzMjEpXCIsXCJHZW5rxY0gKDEzMjHigJMxMzI0KVwiLFwiU2jFjWNoxasgKDEzMjTigJMxMzI2KVwiLFwiS2FyeWFrdSAoMTMyNuKAkzEzMjkpXCIsXCJHZW50b2t1ICgxMzI54oCTMTMzMSlcIixcIkdlbmvFjSAoMTMzMeKAkzEzMzQpXCIsXCJLZW5tdSAoMTMzNOKAkzEzMzYpXCIsXCJFbmdlbiAoMTMzNuKAkzEzNDApXCIsXCJLxY1rb2t1ICgxMzQw4oCTMTM0NilcIixcIlNoxY1oZWkgKDEzNDbigJMxMzcwKVwiLFwiS2VudG9rdSAoMTM3MOKAkzEzNzIpXCIsXCJCdW5jaMWrICgxMzcy4oCTMTM3NSlcIixcIlRlbmp1ICgxMzc14oCTMTM3OSlcIixcIkvFjXJ5YWt1ICgxMzc54oCTMTM4MSlcIixcIkvFjXdhICgxMzgx4oCTMTM4NClcIixcIkdlbmNoxasgKDEzODTigJMxMzkyKVwiLFwiTWVpdG9rdSAoMTM4NOKAkzEzODcpXCIsXCJLYWtlaSAoMTM4N+KAkzEzODkpXCIsXCJLxY3FjSAoMTM4OeKAkzEzOTApXCIsXCJNZWl0b2t1ICgxMzkw4oCTMTM5NClcIixcIsWMZWkgKDEzOTTigJMxNDI4KVwiLFwiU2jFjWNoxY0gKDE0MjjigJMxNDI5KVwiLFwiRWlrecWNICgxNDI54oCTMTQ0MSlcIixcIktha2l0c3UgKDE0NDHigJMxNDQ0KVwiLFwiQnVu4oCZYW4gKDE0NDTigJMxNDQ5KVwiLFwiSMWNdG9rdSAoMTQ0OeKAkzE0NTIpXCIsXCJLecWNdG9rdSAoMTQ1MuKAkzE0NTUpXCIsXCJLxY1zaMWNICgxNDU14oCTMTQ1NylcIixcIkNoxY1yb2t1ICgxNDU34oCTMTQ2MClcIixcIkthbnNoxY0gKDE0NjDigJMxNDY2KVwiLFwiQnVuc2jFjSAoMTQ2NuKAkzE0NjcpXCIsXCLFjG5pbiAoMTQ2N+KAkzE0NjkpXCIsXCJCdW5tZWkgKDE0NjnigJMxNDg3KVwiLFwiQ2jFjWt5xY0gKDE0ODfigJMxNDg5KVwiLFwiRW50b2t1ICgxNDg54oCTMTQ5MilcIixcIk1lacWNICgxNDky4oCTMTUwMSlcIixcIkJ1bmtpICgxNTAx4oCTMTUwNClcIixcIkVpc2jFjSAoMTUwNOKAkzE1MjEpXCIsXCJUYWllaSAoMTUyMeKAkzE1MjgpXCIsXCJLecWNcm9rdSAoMTUyOOKAkzE1MzIpXCIsXCJUZW5idW4gKDE1MzLigJMxNTU1KVwiLFwiS8WNamkgKDE1NTXigJMxNTU4KVwiLFwiRWlyb2t1ICgxNTU44oCTMTU3MClcIixcIkdlbmtpICgxNTcw4oCTMTU3MylcIixcIlRlbnNoxY0gKDE1NzPigJMxNTkyKVwiLFwiQnVucm9rdSAoMTU5MuKAkzE1OTYpXCIsXCJLZWljaMWNICgxNTk24oCTMTYxNSlcIixcIkdlbm5hICgxNjE14oCTMTYyNClcIixcIkthbuKAmWVpICgxNjI04oCTMTY0NClcIixcIlNoxY1obyAoMTY0NOKAkzE2NDgpXCIsXCJLZWlhbiAoMTY0OOKAkzE2NTIpXCIsXCJKxY3FjSAoMTY1MuKAkzE2NTUpXCIsXCJNZWlyZWtpICgxNjU14oCTMTY1OClcIixcIk1hbmppICgxNjU44oCTMTY2MSlcIixcIkthbmJ1biAoMTY2MeKAkzE2NzMpXCIsXCJFbnDFjSAoMTY3M+KAkzE2ODEpXCIsXCJUZW5uYSAoMTY4MeKAkzE2ODQpXCIsXCJKxY1recWNICgxNjg04oCTMTY4OClcIixcIkdlbnJva3UgKDE2ODjigJMxNzA0KVwiLFwiSMWNZWkgKDE3MDTigJMxNzExKVwiLFwiU2jFjXRva3UgKDE3MTHigJMxNzE2KVwiLFwiS3nFjWjFjSAoMTcxNuKAkzE3MzYpXCIsXCJHZW5idW4gKDE3MzbigJMxNzQxKVwiLFwiS2FucMWNICgxNzQx4oCTMTc0NClcIixcIkVua3nFjSAoMTc0NOKAkzE3NDgpXCIsXCJLYW7igJllbiAoMTc0OOKAkzE3NTEpXCIsXCJIxY1yZWtpICgxNzUx4oCTMTc2NClcIixcIk1laXdhICgxNzY04oCTMTc3MilcIixcIkFu4oCZZWkgKDE3NzLigJMxNzgxKVwiLFwiVGVubWVpICgxNzgx4oCTMTc4OSlcIixcIkthbnNlaSAoMTc4OeKAkzE4MDEpXCIsXCJLecWNd2EgKDE4MDHigJMxODA0KVwiLFwiQnVua2EgKDE4MDTigJMxODE4KVwiLFwiQnVuc2VpICgxODE44oCTMTgzMClcIixcIlRlbnDFjSAoMTgzMOKAkzE4NDQpXCIsXCJLxY1rYSAoMTg0NOKAkzE4NDgpXCIsXCJLYWVpICgxODQ44oCTMTg1NClcIixcIkFuc2VpICgxODU04oCTMTg2MClcIixcIk1hbuKAmWVuICgxODYw4oCTMTg2MSlcIixcIkJ1bmt5xasgKDE4NjHigJMxODY0KVwiLFwiR2VuamkgKDE4NjTigJMxODY1KVwiLFwiS2VpxY0gKDE4NjXigJMxODY4KVwiLFwiTVwiLFwiVFwiLFwiU1wiLFwiSFwiXSxzaG9ydDpbXCJUYWlrYSAoNjQ14oCTNjUwKVwiLFwiSGFrdWNoaSAoNjUw4oCTNjcxKVwiLFwiSGFrdWjFjSAoNjcy4oCTNjg2KVwiLFwiU2h1Y2jFjSAoNjg24oCTNzAxKVwiLFwiVGFpaMWNICg3MDHigJM3MDQpXCIsXCJLZWl1biAoNzA04oCTNzA4KVwiLFwiV2FkxY0gKDcwOOKAkzcxNSlcIixcIlJlaWtpICg3MTXigJM3MTcpXCIsXCJZxY1yxY0gKDcxN+KAkzcyNClcIixcIkppbmtpICg3MjTigJM3MjkpXCIsXCJUZW5wecWNICg3MjnigJM3NDkpXCIsXCJUZW5wecWNLWthbXDFjSAoNzQ5LTc0OSlcIixcIlRlbnB5xY0tc2jFjWjFjSAoNzQ5LTc1NylcIixcIlRlbnB5xY0taMWNamkgKDc1Ny03NjUpXCIsXCJUZW5wecWNLWppbmdvICg3NjUtNzY3KVwiLFwiSmluZ28ta2VpdW4gKDc2Ny03NzApXCIsXCJIxY1raSAoNzcw4oCTNzgwKVwiLFwiVGVuLcWNICg3ODEtNzgyKVwiLFwiRW5yeWFrdSAoNzgy4oCTODA2KVwiLFwiRGFpZMWNICg4MDbigJM4MTApXCIsXCJLxY1uaW4gKDgxMOKAkzgyNClcIixcIlRlbmNoxY0gKDgyNOKAkzgzNClcIixcIkrFjXdhICg4MzTigJM4NDgpXCIsXCJLYWrFjSAoODQ44oCTODUxKVwiLFwiTmluanUgKDg1MeKAkzg1NClcIixcIlNhaWvFjSAoODU04oCTODU3KVwiLFwiVGVuLWFuICg4NTctODU5KVwiLFwiSsWNZ2FuICg4NTnigJM4NzcpXCIsXCJHYW5necWNICg4NzfigJM4ODUpXCIsXCJOaW5uYSAoODg14oCTODg5KVwiLFwiS2FucHnFjSAoODg54oCTODk4KVwiLFwiU2jFjXRhaSAoODk44oCTOTAxKVwiLFwiRW5naSAoOTAx4oCTOTIzKVwiLFwiRW5jaMWNICg5MjPigJM5MzEpXCIsXCJKxY1oZWkgKDkzMeKAkzkzOClcIixcIlRlbmd5xY0gKDkzOOKAkzk0NylcIixcIlRlbnJ5YWt1ICg5NDfigJM5NTcpXCIsXCJUZW50b2t1ICg5NTfigJM5NjEpXCIsXCLFjHdhICg5NjHigJM5NjQpXCIsXCJLxY1oxY0gKDk2NOKAkzk2OClcIixcIkFubmEgKDk2OOKAkzk3MClcIixcIlRlbnJva3UgKDk3MOKAkzk3MylcIixcIlRlbuKAmWVuICg5NzPigJM5NzYpXCIsXCJKxY1nZW4gKDk3NuKAkzk3OClcIixcIlRlbmdlbiAoOTc44oCTOTgzKVwiLFwiRWlrYW4gKDk4M+KAkzk4NSlcIixcIkthbm5hICg5ODXigJM5ODcpXCIsXCJFaWVuICg5ODfigJM5ODkpXCIsXCJFaXNvICg5ODnigJM5OTApXCIsXCJTaMWNcnlha3UgKDk5MOKAkzk5NSlcIixcIkNoxY10b2t1ICg5OTXigJM5OTkpXCIsXCJDaMWNaMWNICg5OTnigJMxMDA0KVwiLFwiS2Fua8WNICgxMDA04oCTMTAxMilcIixcIkNoxY13YSAoMTAxMuKAkzEwMTcpXCIsXCJLYW5uaW4gKDEwMTfigJMxMDIxKVwiLFwiSmlhbiAoMTAyMeKAkzEwMjQpXCIsXCJNYW5qdSAoMTAyNOKAkzEwMjgpXCIsXCJDaMWNZ2VuICgxMDI44oCTMTAzNylcIixcIkNoxY1yeWFrdSAoMTAzN+KAkzEwNDApXCIsXCJDaMWNa3nFqyAoMTA0MOKAkzEwNDQpXCIsXCJLYW50b2t1ICgxMDQ04oCTMTA0NilcIixcIkVpc2jFjSAoMTA0NuKAkzEwNTMpXCIsXCJUZW5naSAoMTA1M+KAkzEwNTgpXCIsXCJLxY1oZWkgKDEwNTjigJMxMDY1KVwiLFwiSmlyeWFrdSAoMTA2NeKAkzEwNjkpXCIsXCJFbmt5xasgKDEwNjnigJMxMDc0KVwiLFwiU2jFjWhvICgxMDc04oCTMTA3NylcIixcIlNoxY1yeWFrdSAoMTA3N+KAkzEwODEpXCIsXCJFaWjFjSAoMTA4MeKAkzEwODQpXCIsXCLFjHRva3UgKDEwODTigJMxMDg3KVwiLFwiS2FuamkgKDEwODfigJMxMDk0KVwiLFwiS2FoxY0gKDEwOTTigJMxMDk2KVwiLFwiRWljaMWNICgxMDk24oCTMTA5NylcIixcIkrFjXRva3UgKDEwOTfigJMxMDk5KVwiLFwiS8WNd2EgKDEwOTnigJMxMTA0KVwiLFwiQ2jFjWppICgxMTA04oCTMTEwNilcIixcIkthc2jFjSAoMTEwNuKAkzExMDgpXCIsXCJUZW5uaW4gKDExMDjigJMxMTEwKVwiLFwiVGVuLWVpICgxMTEwLTExMTMpXCIsXCJFaWt5xasgKDExMTPigJMxMTE4KVwiLFwiR2Vu4oCZZWkgKDExMTjigJMxMTIwKVwiLFwiSMWNYW4gKDExMjDigJMxMTI0KVwiLFwiVGVuamkgKDExMjTigJMxMTI2KVwiLFwiRGFpamkgKDExMjbigJMxMTMxKVwiLFwiVGVuc2jFjSAoMTEzMeKAkzExMzIpXCIsXCJDaMWNc2jFjSAoMTEzMuKAkzExMzUpXCIsXCJIxY1lbiAoMTEzNeKAkzExNDEpXCIsXCJFaWppICgxMTQx4oCTMTE0MilcIixcIkvFjWppICgxMTQy4oCTMTE0NClcIixcIlRlbuKAmXnFjSAoMTE0NOKAkzExNDUpXCIsXCJLecWrYW4gKDExNDXigJMxMTUxKVwiLFwiTmlucGVpICgxMTUx4oCTMTE1NClcIixcIkt5xatqdSAoMTE1NOKAkzExNTYpXCIsXCJIxY1nZW4gKDExNTbigJMxMTU5KVwiLFwiSGVpamkgKDExNTnigJMxMTYwKVwiLFwiRWlyeWFrdSAoMTE2MOKAkzExNjEpXCIsXCLFjGhvICgxMTYx4oCTMTE2MylcIixcIkNoxY1rYW4gKDExNjPigJMxMTY1KVwiLFwiRWltYW4gKDExNjXigJMxMTY2KVwiLFwiTmlu4oCZYW4gKDExNjbigJMxMTY5KVwiLFwiS2HFjSAoMTE2OeKAkzExNzEpXCIsXCJTaMWNYW4gKDExNzHigJMxMTc1KVwiLFwiQW5nZW4gKDExNzXigJMxMTc3KVwiLFwiSmlzaMWNICgxMTc34oCTMTE4MSlcIixcIlnFjXdhICgxMTgx4oCTMTE4MilcIixcIkp1ZWkgKDExODLigJMxMTg0KVwiLFwiR2Vucnlha3UgKDExODTigJMxMTg1KVwiLFwiQnVuamkgKDExODXigJMxMTkwKVwiLFwiS2Vua3nFqyAoMTE5MOKAkzExOTkpXCIsXCJTaMWNamkgKDExOTnigJMxMjAxKVwiLFwiS2VubmluICgxMjAx4oCTMTIwNClcIixcIkdlbmt5xasgKDEyMDTigJMxMjA2KVwiLFwiS2Vu4oCZZWkgKDEyMDbigJMxMjA3KVwiLFwiSsWNZ2VuICgxMjA34oCTMTIxMSlcIixcIktlbnJ5YWt1ICgxMjEx4oCTMTIxMylcIixcIktlbnDFjSAoMTIxM+KAkzEyMTkpXCIsXCJKxY1recWrICgxMjE54oCTMTIyMilcIixcIkrFjcWNICgxMjIy4oCTMTIyNClcIixcIkdlbm5pbiAoMTIyNOKAkzEyMjUpXCIsXCJLYXJva3UgKDEyMjXigJMxMjI3KVwiLFwiQW50ZWkgKDEyMjfigJMxMjI5KVwiLFwiS2Fua2kgKDEyMjnigJMxMjMyKVwiLFwiSsWNZWkgKDEyMzLigJMxMjMzKVwiLFwiVGVucHVrdSAoMTIzM+KAkzEyMzQpXCIsXCJCdW5yeWFrdSAoMTIzNOKAkzEyMzUpXCIsXCJLYXRlaSAoMTIzNeKAkzEyMzgpXCIsXCJSeWFrdW5pbiAoMTIzOOKAkzEyMzkpXCIsXCJFbuKAmcWNICgxMjM54oCTMTI0MClcIixcIk5pbmppICgxMjQw4oCTMTI0MylcIixcIkthbmdlbiAoMTI0M+KAkzEyNDcpXCIsXCJIxY1qaSAoMTI0N+KAkzEyNDkpXCIsXCJLZW5jaMWNICgxMjQ54oCTMTI1NilcIixcIkvFjWdlbiAoMTI1NuKAkzEyNTcpXCIsXCJTaMWNa2EgKDEyNTfigJMxMjU5KVwiLFwiU2jFjWdlbiAoMTI1OeKAkzEyNjApXCIsXCJCdW7igJnFjSAoMTI2MOKAkzEyNjEpXCIsXCJLxY1jaMWNICgxMjYx4oCTMTI2NClcIixcIkJ1buKAmWVpICgxMjY04oCTMTI3NSlcIixcIktlbmppICgxMjc14oCTMTI3OClcIixcIkvFjWFuICgxMjc44oCTMTI4OClcIixcIlNoxY3FjSAoMTI4OOKAkzEyOTMpXCIsXCJFaW5pbiAoMTI5M+KAkzEyOTkpXCIsXCJTaMWNYW4gKDEyOTnigJMxMzAyKVwiLFwiS2VuZ2VuICgxMzAy4oCTMTMwMylcIixcIkthZ2VuICgxMzAz4oCTMTMwNilcIixcIlRva3VqaSAoMTMwNuKAkzEzMDgpXCIsXCJFbmt5xY0gKDEzMDjigJMxMzExKVwiLFwixYxjaMWNICgxMzEx4oCTMTMxMilcIixcIlNoxY13YSAoMTMxMuKAkzEzMTcpXCIsXCJCdW5wxY0gKDEzMTfigJMxMzE5KVwiLFwiR2VuxY0gKDEzMTnigJMxMzIxKVwiLFwiR2Vua8WNICgxMzIx4oCTMTMyNClcIixcIlNoxY1jaMWrICgxMzI04oCTMTMyNilcIixcIkthcnlha3UgKDEzMjbigJMxMzI5KVwiLFwiR2VudG9rdSAoMTMyOeKAkzEzMzEpXCIsXCJHZW5rxY0gKDEzMzHigJMxMzM0KVwiLFwiS2VubXUgKDEzMzTigJMxMzM2KVwiLFwiRW5nZW4gKDEzMzbigJMxMzQwKVwiLFwiS8WNa29rdSAoMTM0MOKAkzEzNDYpXCIsXCJTaMWNaGVpICgxMzQ24oCTMTM3MClcIixcIktlbnRva3UgKDEzNzDigJMxMzcyKVwiLFwiQnVuY2jFqyAoMTM3MuKAkzEzNzUpXCIsXCJUZW5qdSAoMTM3NeKAkzEzNzkpXCIsXCJLxY1yeWFrdSAoMTM3OeKAkzEzODEpXCIsXCJLxY13YSAoMTM4MeKAkzEzODQpXCIsXCJHZW5jaMWrICgxMzg04oCTMTM5MilcIixcIk1laXRva3UgKDEzODTigJMxMzg3KVwiLFwiS2FrZWkgKDEzODfigJMxMzg5KVwiLFwiS8WNxY0gKDEzODnigJMxMzkwKVwiLFwiTWVpdG9rdSAoMTM5MOKAkzEzOTQpXCIsXCLFjGVpICgxMzk04oCTMTQyOClcIixcIlNoxY1jaMWNICgxNDI44oCTMTQyOSlcIixcIkVpa3nFjSAoMTQyOeKAkzE0NDEpXCIsXCJLYWtpdHN1ICgxNDQx4oCTMTQ0NClcIixcIkJ1buKAmWFuICgxNDQ04oCTMTQ0OSlcIixcIkjFjXRva3UgKDE0NDnigJMxNDUyKVwiLFwiS3nFjXRva3UgKDE0NTLigJMxNDU1KVwiLFwiS8WNc2jFjSAoMTQ1NeKAkzE0NTcpXCIsXCJDaMWNcm9rdSAoMTQ1N+KAkzE0NjApXCIsXCJLYW5zaMWNICgxNDYw4oCTMTQ2NilcIixcIkJ1bnNoxY0gKDE0NjbigJMxNDY3KVwiLFwixYxuaW4gKDE0NjfigJMxNDY5KVwiLFwiQnVubWVpICgxNDY54oCTMTQ4NylcIixcIkNoxY1recWNICgxNDg34oCTMTQ4OSlcIixcIkVudG9rdSAoMTQ4OeKAkzE0OTIpXCIsXCJNZWnFjSAoMTQ5MuKAkzE1MDEpXCIsXCJCdW5raSAoMTUwMeKAkzE1MDQpXCIsXCJFaXNoxY0gKDE1MDTigJMxNTIxKVwiLFwiVGFpZWkgKDE1MjHigJMxNTI4KVwiLFwiS3nFjXJva3UgKDE1MjjigJMxNTMyKVwiLFwiVGVuYnVuICgxNTMy4oCTMTU1NSlcIixcIkvFjWppICgxNTU14oCTMTU1OClcIixcIkVpcm9rdSAoMTU1OOKAkzE1NzApXCIsXCJHZW5raSAoMTU3MOKAkzE1NzMpXCIsXCJUZW5zaMWNICgxNTcz4oCTMTU5MilcIixcIkJ1bnJva3UgKDE1OTLigJMxNTk2KVwiLFwiS2VpY2jFjSAoMTU5NuKAkzE2MTUpXCIsXCJHZW5uYSAoMTYxNeKAkzE2MjQpXCIsXCJLYW7igJllaSAoMTYyNOKAkzE2NDQpXCIsXCJTaMWNaG8gKDE2NDTigJMxNjQ4KVwiLFwiS2VpYW4gKDE2NDjigJMxNjUyKVwiLFwiSsWNxY0gKDE2NTLigJMxNjU1KVwiLFwiTWVpcmVraSAoMTY1NeKAkzE2NTgpXCIsXCJNYW5qaSAoMTY1OOKAkzE2NjEpXCIsXCJLYW5idW4gKDE2NjHigJMxNjczKVwiLFwiRW5wxY0gKDE2NzPigJMxNjgxKVwiLFwiVGVubmEgKDE2ODHigJMxNjg0KVwiLFwiSsWNa3nFjSAoMTY4NOKAkzE2ODgpXCIsXCJHZW5yb2t1ICgxNjg44oCTMTcwNClcIixcIkjFjWVpICgxNzA04oCTMTcxMSlcIixcIlNoxY10b2t1ICgxNzEx4oCTMTcxNilcIixcIkt5xY1oxY0gKDE3MTbigJMxNzM2KVwiLFwiR2VuYnVuICgxNzM24oCTMTc0MSlcIixcIkthbnDFjSAoMTc0MeKAkzE3NDQpXCIsXCJFbmt5xY0gKDE3NDTigJMxNzQ4KVwiLFwiS2Fu4oCZZW4gKDE3NDjigJMxNzUxKVwiLFwiSMWNcmVraSAoMTc1MeKAkzE3NjQpXCIsXCJNZWl3YSAoMTc2NOKAkzE3NzIpXCIsXCJBbuKAmWVpICgxNzcy4oCTMTc4MSlcIixcIlRlbm1laSAoMTc4MeKAkzE3ODkpXCIsXCJLYW5zZWkgKDE3ODnigJMxODAxKVwiLFwiS3nFjXdhICgxODAx4oCTMTgwNClcIixcIkJ1bmthICgxODA04oCTMTgxOClcIixcIkJ1bnNlaSAoMTgxOOKAkzE4MzApXCIsXCJUZW5wxY0gKDE4MzDigJMxODQ0KVwiLFwiS8WNa2EgKDE4NDTigJMxODQ4KVwiLFwiS2FlaSAoMTg0OOKAkzE4NTQpXCIsXCJBbnNlaSAoMTg1NOKAkzE4NjApXCIsXCJNYW7igJllbiAoMTg2MOKAkzE4NjEpXCIsXCJCdW5recWrICgxODYx4oCTMTg2NClcIixcIkdlbmppICgxODY04oCTMTg2NSlcIixcIktlacWNICgxODY14oCTMTg2OClcIixcIk1laWppXCIsXCJUYWlzaMWNXCIsXCJTaMWNd2FcIixcIkhlaXNlaVwiXSxsb25nOltcIlRhaWthICg2NDXigJM2NTApXCIsXCJIYWt1Y2hpICg2NTDigJM2NzEpXCIsXCJIYWt1aMWNICg2NzLigJM2ODYpXCIsXCJTaHVjaMWNICg2ODbigJM3MDEpXCIsXCJUYWloxY0gKDcwMeKAkzcwNClcIixcIktlaXVuICg3MDTigJM3MDgpXCIsXCJXYWTFjSAoNzA44oCTNzE1KVwiLFwiUmVpa2kgKDcxNeKAkzcxNylcIixcIlnFjXLFjSAoNzE34oCTNzI0KVwiLFwiSmlua2kgKDcyNOKAkzcyOSlcIixcIlRlbnB5xY0gKDcyOeKAkzc0OSlcIixcIlRlbnB5xY0ta2FtcMWNICg3NDktNzQ5KVwiLFwiVGVucHnFjS1zaMWNaMWNICg3NDktNzU3KVwiLFwiVGVucHnFjS1oxY1qaSAoNzU3LTc2NSlcIixcIlRlbnB5xY0tamluZ28gKDc2NS03NjcpXCIsXCJKaW5nby1rZWl1biAoNzY3LTc3MClcIixcIkjFjWtpICg3NzDigJM3ODApXCIsXCJUZW4txY0gKDc4MS03ODIpXCIsXCJFbnJ5YWt1ICg3ODLigJM4MDYpXCIsXCJEYWlkxY0gKDgwNuKAkzgxMClcIixcIkvFjW5pbiAoODEw4oCTODI0KVwiLFwiVGVuY2jFjSAoODI04oCTODM0KVwiLFwiSsWNd2EgKDgzNOKAkzg0OClcIixcIkthasWNICg4NDjigJM4NTEpXCIsXCJOaW5qdSAoODUx4oCTODU0KVwiLFwiU2Fpa8WNICg4NTTigJM4NTcpXCIsXCJUZW4tYW4gKDg1Ny04NTkpXCIsXCJKxY1nYW4gKDg1OeKAkzg3NylcIixcIkdhbmd5xY0gKDg3N+KAkzg4NSlcIixcIk5pbm5hICg4ODXigJM4ODkpXCIsXCJLYW5wecWNICg4ODnigJM4OTgpXCIsXCJTaMWNdGFpICg4OTjigJM5MDEpXCIsXCJFbmdpICg5MDHigJM5MjMpXCIsXCJFbmNoxY0gKDkyM+KAkzkzMSlcIixcIkrFjWhlaSAoOTMx4oCTOTM4KVwiLFwiVGVuZ3nFjSAoOTM44oCTOTQ3KVwiLFwiVGVucnlha3UgKDk0N+KAkzk1NylcIixcIlRlbnRva3UgKDk1N+KAkzk2MSlcIixcIsWMd2EgKDk2MeKAkzk2NClcIixcIkvFjWjFjSAoOTY04oCTOTY4KVwiLFwiQW5uYSAoOTY44oCTOTcwKVwiLFwiVGVucm9rdSAoOTcw4oCTOTczKVwiLFwiVGVu4oCZZW4gKDk3M+KAkzk3NilcIixcIkrFjWdlbiAoOTc24oCTOTc4KVwiLFwiVGVuZ2VuICg5NzjigJM5ODMpXCIsXCJFaWthbiAoOTgz4oCTOTg1KVwiLFwiS2FubmEgKDk4NeKAkzk4NylcIixcIkVpZW4gKDk4N+KAkzk4OSlcIixcIkVpc28gKDk4OeKAkzk5MClcIixcIlNoxY1yeWFrdSAoOTkw4oCTOTk1KVwiLFwiQ2jFjXRva3UgKDk5NeKAkzk5OSlcIixcIkNoxY1oxY0gKDk5OeKAkzEwMDQpXCIsXCJLYW5rxY0gKDEwMDTigJMxMDEyKVwiLFwiQ2jFjXdhICgxMDEy4oCTMTAxNylcIixcIkthbm5pbiAoMTAxN+KAkzEwMjEpXCIsXCJKaWFuICgxMDIx4oCTMTAyNClcIixcIk1hbmp1ICgxMDI04oCTMTAyOClcIixcIkNoxY1nZW4gKDEwMjjigJMxMDM3KVwiLFwiQ2jFjXJ5YWt1ICgxMDM34oCTMTA0MClcIixcIkNoxY1recWrICgxMDQw4oCTMTA0NClcIixcIkthbnRva3UgKDEwNDTigJMxMDQ2KVwiLFwiRWlzaMWNICgxMDQ24oCTMTA1MylcIixcIlRlbmdpICgxMDUz4oCTMTA1OClcIixcIkvFjWhlaSAoMTA1OOKAkzEwNjUpXCIsXCJKaXJ5YWt1ICgxMDY14oCTMTA2OSlcIixcIkVua3nFqyAoMTA2OeKAkzEwNzQpXCIsXCJTaMWNaG8gKDEwNzTigJMxMDc3KVwiLFwiU2jFjXJ5YWt1ICgxMDc34oCTMTA4MSlcIixcIkVpaMWNICgxMDgx4oCTMTA4NClcIixcIsWMdG9rdSAoMTA4NOKAkzEwODcpXCIsXCJLYW5qaSAoMTA4N+KAkzEwOTQpXCIsXCJLYWjFjSAoMTA5NOKAkzEwOTYpXCIsXCJFaWNoxY0gKDEwOTbigJMxMDk3KVwiLFwiSsWNdG9rdSAoMTA5N+KAkzEwOTkpXCIsXCJLxY13YSAoMTA5OeKAkzExMDQpXCIsXCJDaMWNamkgKDExMDTigJMxMTA2KVwiLFwiS2FzaMWNICgxMTA24oCTMTEwOClcIixcIlRlbm5pbiAoMTEwOOKAkzExMTApXCIsXCJUZW4tZWkgKDExMTAtMTExMylcIixcIkVpa3nFqyAoMTExM+KAkzExMTgpXCIsXCJHZW7igJllaSAoMTExOOKAkzExMjApXCIsXCJIxY1hbiAoMTEyMOKAkzExMjQpXCIsXCJUZW5qaSAoMTEyNOKAkzExMjYpXCIsXCJEYWlqaSAoMTEyNuKAkzExMzEpXCIsXCJUZW5zaMWNICgxMTMx4oCTMTEzMilcIixcIkNoxY1zaMWNICgxMTMy4oCTMTEzNSlcIixcIkjFjWVuICgxMTM14oCTMTE0MSlcIixcIkVpamkgKDExNDHigJMxMTQyKVwiLFwiS8WNamkgKDExNDLigJMxMTQ0KVwiLFwiVGVu4oCZecWNICgxMTQ04oCTMTE0NSlcIixcIkt5xathbiAoMTE0NeKAkzExNTEpXCIsXCJOaW5wZWkgKDExNTHigJMxMTU0KVwiLFwiS3nFq2p1ICgxMTU04oCTMTE1NilcIixcIkjFjWdlbiAoMTE1NuKAkzExNTkpXCIsXCJIZWlqaSAoMTE1OeKAkzExNjApXCIsXCJFaXJ5YWt1ICgxMTYw4oCTMTE2MSlcIixcIsWMaG8gKDExNjHigJMxMTYzKVwiLFwiQ2jFjWthbiAoMTE2M+KAkzExNjUpXCIsXCJFaW1hbiAoMTE2NeKAkzExNjYpXCIsXCJOaW7igJlhbiAoMTE2NuKAkzExNjkpXCIsXCJLYcWNICgxMTY54oCTMTE3MSlcIixcIlNoxY1hbiAoMTE3MeKAkzExNzUpXCIsXCJBbmdlbiAoMTE3NeKAkzExNzcpXCIsXCJKaXNoxY0gKDExNzfigJMxMTgxKVwiLFwiWcWNd2EgKDExODHigJMxMTgyKVwiLFwiSnVlaSAoMTE4MuKAkzExODQpXCIsXCJHZW5yeWFrdSAoMTE4NOKAkzExODUpXCIsXCJCdW5qaSAoMTE4NeKAkzExOTApXCIsXCJLZW5recWrICgxMTkw4oCTMTE5OSlcIixcIlNoxY1qaSAoMTE5OeKAkzEyMDEpXCIsXCJLZW5uaW4gKDEyMDHigJMxMjA0KVwiLFwiR2Vua3nFqyAoMTIwNOKAkzEyMDYpXCIsXCJLZW7igJllaSAoMTIwNuKAkzEyMDcpXCIsXCJKxY1nZW4gKDEyMDfigJMxMjExKVwiLFwiS2Vucnlha3UgKDEyMTHigJMxMjEzKVwiLFwiS2VucMWNICgxMjEz4oCTMTIxOSlcIixcIkrFjWt5xasgKDEyMTnigJMxMjIyKVwiLFwiSsWNxY0gKDEyMjLigJMxMjI0KVwiLFwiR2VubmluICgxMjI04oCTMTIyNSlcIixcIkthcm9rdSAoMTIyNeKAkzEyMjcpXCIsXCJBbnRlaSAoMTIyN+KAkzEyMjkpXCIsXCJLYW5raSAoMTIyOeKAkzEyMzIpXCIsXCJKxY1laSAoMTIzMuKAkzEyMzMpXCIsXCJUZW5wdWt1ICgxMjMz4oCTMTIzNClcIixcIkJ1bnJ5YWt1ICgxMjM04oCTMTIzNSlcIixcIkthdGVpICgxMjM14oCTMTIzOClcIixcIlJ5YWt1bmluICgxMjM44oCTMTIzOSlcIixcIkVu4oCZxY0gKDEyMznigJMxMjQwKVwiLFwiTmluamkgKDEyNDDigJMxMjQzKVwiLFwiS2FuZ2VuICgxMjQz4oCTMTI0NylcIixcIkjFjWppICgxMjQ34oCTMTI0OSlcIixcIktlbmNoxY0gKDEyNDnigJMxMjU2KVwiLFwiS8WNZ2VuICgxMjU24oCTMTI1NylcIixcIlNoxY1rYSAoMTI1N+KAkzEyNTkpXCIsXCJTaMWNZ2VuICgxMjU54oCTMTI2MClcIixcIkJ1buKAmcWNICgxMjYw4oCTMTI2MSlcIixcIkvFjWNoxY0gKDEyNjHigJMxMjY0KVwiLFwiQnVu4oCZZWkgKDEyNjTigJMxMjc1KVwiLFwiS2VuamkgKDEyNzXigJMxMjc4KVwiLFwiS8WNYW4gKDEyNzjigJMxMjg4KVwiLFwiU2jFjcWNICgxMjg44oCTMTI5MylcIixcIkVpbmluICgxMjkz4oCTMTI5OSlcIixcIlNoxY1hbiAoMTI5OeKAkzEzMDIpXCIsXCJLZW5nZW4gKDEzMDLigJMxMzAzKVwiLFwiS2FnZW4gKDEzMDPigJMxMzA2KVwiLFwiVG9rdWppICgxMzA24oCTMTMwOClcIixcIkVua3nFjSAoMTMwOOKAkzEzMTEpXCIsXCLFjGNoxY0gKDEzMTHigJMxMzEyKVwiLFwiU2jFjXdhICgxMzEy4oCTMTMxNylcIixcIkJ1bnDFjSAoMTMxN+KAkzEzMTkpXCIsXCJHZW7FjSAoMTMxOeKAkzEzMjEpXCIsXCJHZW5rxY0gKDEzMjHigJMxMzI0KVwiLFwiU2jFjWNoxasgKDEzMjTigJMxMzI2KVwiLFwiS2FyeWFrdSAoMTMyNuKAkzEzMjkpXCIsXCJHZW50b2t1ICgxMzI54oCTMTMzMSlcIixcIkdlbmvFjSAoMTMzMeKAkzEzMzQpXCIsXCJLZW5tdSAoMTMzNOKAkzEzMzYpXCIsXCJFbmdlbiAoMTMzNuKAkzEzNDApXCIsXCJLxY1rb2t1ICgxMzQw4oCTMTM0NilcIixcIlNoxY1oZWkgKDEzNDbigJMxMzcwKVwiLFwiS2VudG9rdSAoMTM3MOKAkzEzNzIpXCIsXCJCdW5jaMWrICgxMzcy4oCTMTM3NSlcIixcIlRlbmp1ICgxMzc14oCTMTM3OSlcIixcIkvFjXJ5YWt1ICgxMzc54oCTMTM4MSlcIixcIkvFjXdhICgxMzgx4oCTMTM4NClcIixcIkdlbmNoxasgKDEzODTigJMxMzkyKVwiLFwiTWVpdG9rdSAoMTM4NOKAkzEzODcpXCIsXCJLYWtlaSAoMTM4N+KAkzEzODkpXCIsXCJLxY3FjSAoMTM4OeKAkzEzOTApXCIsXCJNZWl0b2t1ICgxMzkw4oCTMTM5NClcIixcIsWMZWkgKDEzOTTigJMxNDI4KVwiLFwiU2jFjWNoxY0gKDE0MjjigJMxNDI5KVwiLFwiRWlrecWNICgxNDI54oCTMTQ0MSlcIixcIktha2l0c3UgKDE0NDHigJMxNDQ0KVwiLFwiQnVu4oCZYW4gKDE0NDTigJMxNDQ5KVwiLFwiSMWNdG9rdSAoMTQ0OeKAkzE0NTIpXCIsXCJLecWNdG9rdSAoMTQ1MuKAkzE0NTUpXCIsXCJLxY1zaMWNICgxNDU14oCTMTQ1NylcIixcIkNoxY1yb2t1ICgxNDU34oCTMTQ2MClcIixcIkthbnNoxY0gKDE0NjDigJMxNDY2KVwiLFwiQnVuc2jFjSAoMTQ2NuKAkzE0NjcpXCIsXCLFjG5pbiAoMTQ2N+KAkzE0NjkpXCIsXCJCdW5tZWkgKDE0NjnigJMxNDg3KVwiLFwiQ2jFjWt5xY0gKDE0ODfigJMxNDg5KVwiLFwiRW50b2t1ICgxNDg54oCTMTQ5MilcIixcIk1lacWNICgxNDky4oCTMTUwMSlcIixcIkJ1bmtpICgxNTAx4oCTMTUwNClcIixcIkVpc2jFjSAoMTUwNOKAkzE1MjEpXCIsXCJUYWllaSAoMTUyMeKAkzE1MjgpXCIsXCJLecWNcm9rdSAoMTUyOOKAkzE1MzIpXCIsXCJUZW5idW4gKDE1MzLigJMxNTU1KVwiLFwiS8WNamkgKDE1NTXigJMxNTU4KVwiLFwiRWlyb2t1ICgxNTU44oCTMTU3MClcIixcIkdlbmtpICgxNTcw4oCTMTU3MylcIixcIlRlbnNoxY0gKDE1NzPigJMxNTkyKVwiLFwiQnVucm9rdSAoMTU5MuKAkzE1OTYpXCIsXCJLZWljaMWNICgxNTk24oCTMTYxNSlcIixcIkdlbm5hICgxNjE14oCTMTYyNClcIixcIkthbuKAmWVpICgxNjI04oCTMTY0NClcIixcIlNoxY1obyAoMTY0NOKAkzE2NDgpXCIsXCJLZWlhbiAoMTY0OOKAkzE2NTIpXCIsXCJKxY3FjSAoMTY1MuKAkzE2NTUpXCIsXCJNZWlyZWtpICgxNjU14oCTMTY1OClcIixcIk1hbmppICgxNjU44oCTMTY2MSlcIixcIkthbmJ1biAoMTY2MeKAkzE2NzMpXCIsXCJFbnDFjSAoMTY3M+KAkzE2ODEpXCIsXCJUZW5uYSAoMTY4MeKAkzE2ODQpXCIsXCJKxY1recWNICgxNjg04oCTMTY4OClcIixcIkdlbnJva3UgKDE2ODjigJMxNzA0KVwiLFwiSMWNZWkgKDE3MDTigJMxNzExKVwiLFwiU2jFjXRva3UgKDE3MTHigJMxNzE2KVwiLFwiS3nFjWjFjSAoMTcxNuKAkzE3MzYpXCIsXCJHZW5idW4gKDE3MzbigJMxNzQxKVwiLFwiS2FucMWNICgxNzQx4oCTMTc0NClcIixcIkVua3nFjSAoMTc0NOKAkzE3NDgpXCIsXCJLYW7igJllbiAoMTc0OOKAkzE3NTEpXCIsXCJIxY1yZWtpICgxNzUx4oCTMTc2NClcIixcIk1laXdhICgxNzY04oCTMTc3MilcIixcIkFu4oCZZWkgKDE3NzLigJMxNzgxKVwiLFwiVGVubWVpICgxNzgx4oCTMTc4OSlcIixcIkthbnNlaSAoMTc4OeKAkzE4MDEpXCIsXCJLecWNd2EgKDE4MDHigJMxODA0KVwiLFwiQnVua2EgKDE4MDTigJMxODE4KVwiLFwiQnVuc2VpICgxODE44oCTMTgzMClcIixcIlRlbnDFjSAoMTgzMOKAkzE4NDQpXCIsXCJLxY1rYSAoMTg0NOKAkzE4NDgpXCIsXCJLYWVpICgxODQ44oCTMTg1NClcIixcIkFuc2VpICgxODU04oCTMTg2MClcIixcIk1hbuKAmWVuICgxODYw4oCTMTg2MSlcIixcIkJ1bmt5xasgKDE4NjHigJMxODY0KVwiLFwiR2VuamkgKDE4NjTigJMxODY1KVwiLFwiS2VpxY0gKDE4NjXigJMxODY4KVwiLFwiTWVpamlcIixcIlRhaXNoxY1cIixcIlNoxY13YVwiLFwiSGVpc2VpXCJdfSxkYXlQZXJpb2RzOnthbTpcImEuIG0uXCIscG06XCJwLiBtLlwifX0scGVyc2lhbjp7bW9udGhzOntuYXJyb3c6W1wiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiMTBcIixcIjExXCIsXCIxMlwiXSxzaG9ydDpbXCJGYXJ2YXJkaW5cIixcIk9yZGliZWhlc2h0XCIsXCJLaG9yZGFkXCIsXCJUaXJcIixcIk1vcmRhZFwiLFwiU2hhaHJpdmFyXCIsXCJNZWhyXCIsXCJBYmFuXCIsXCJBemFyXCIsXCJEZXlcIixcIkJhaG1hblwiLFwiRXNmYW5kXCJdLGxvbmc6W1wiRmFydmFyZGluXCIsXCJPcmRpYmVoZXNodFwiLFwiS2hvcmRhZFwiLFwiVGlyXCIsXCJNb3JkYWRcIixcIlNoYWhyaXZhclwiLFwiTWVoclwiLFwiQWJhblwiLFwiQXphclwiLFwiRGV5XCIsXCJCYWhtYW5cIixcIkVzZmFuZFwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiQVBcIl0sc2hvcnQ6W1wiQVBcIl0sbG9uZzpbXCJBUFwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19LHJvYzp7bW9udGhzOntuYXJyb3c6W1wiRVwiLFwiRlwiLFwiTVwiLFwiQVwiLFwiTVwiLFwiSlwiLFwiSlwiLFwiQVwiLFwiU1wiLFwiT1wiLFwiTlwiLFwiRFwiXSxzaG9ydDpbXCJlbmUuXCIsXCJmZWIuXCIsXCJtYXIuXCIsXCJhYnIuXCIsXCJtYXkuXCIsXCJqdW4uXCIsXCJqdWwuXCIsXCJhZ28uXCIsXCJzZXB0LlwiLFwib2N0LlwiLFwibm92LlwiLFwiZGljLlwiXSxsb25nOltcImVuZXJvXCIsXCJmZWJyZXJvXCIsXCJtYXJ6b1wiLFwiYWJyaWxcIixcIm1heW9cIixcImp1bmlvXCIsXCJqdWxpb1wiLFwiYWdvc3RvXCIsXCJzZXB0aWVtYnJlXCIsXCJvY3R1YnJlXCIsXCJub3ZpZW1icmVcIixcImRpY2llbWJyZVwiXX0sZGF5czp7bmFycm93OltcIkRcIixcIkxcIixcIk1cIixcIlhcIixcIkpcIixcIlZcIixcIlNcIl0sc2hvcnQ6W1wiZG9tLlwiLFwibHVuLlwiLFwibWFyLlwiLFwibWnDqS5cIixcImp1ZS5cIixcInZpZS5cIixcInPDoWIuXCJdLGxvbmc6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdfSxlcmFzOntuYXJyb3c6W1wiYW50ZXMgZGUgUi5PLkMuXCIsXCJSLk8uQy5cIl0sc2hvcnQ6W1wiYW50ZXMgZGUgUi5PLkMuXCIsXCJSLk8uQy5cIl0sbG9uZzpbXCJhbnRlcyBkZSBSLk8uQy5cIixcIlIuTy5DLlwiXX0sZGF5UGVyaW9kczp7YW06XCJhLiBtLlwiLHBtOlwicC4gbS5cIn19fX0sbnVtYmVyOntudTpbXCJsYXRuXCJdLHBhdHRlcm5zOntkZWNpbWFsOntwb3NpdGl2ZVBhdHRlcm46XCJ7bnVtYmVyfVwiLG5lZ2F0aXZlUGF0dGVybjpcInttaW51c1NpZ259e251bWJlcn1cIn0sY3VycmVuY3k6e3Bvc2l0aXZlUGF0dGVybjpcIntudW1iZXJ9wqB7Y3VycmVuY3l9XCIsbmVnYXRpdmVQYXR0ZXJuOlwie21pbnVzU2lnbn17bnVtYmVyfcKge2N1cnJlbmN5fVwifSxwZXJjZW50Ontwb3NpdGl2ZVBhdHRlcm46XCJ7bnVtYmVyfcKge3BlcmNlbnRTaWdufVwiLG5lZ2F0aXZlUGF0dGVybjpcInttaW51c1NpZ259e251bWJlcn3CoHtwZXJjZW50U2lnbn1cIn19LHN5bWJvbHM6e2xhdG46e2RlY2ltYWw6XCIsXCIsZ3JvdXA6XCIuXCIsbmFuOlwiTmFOXCIscGx1c1NpZ246XCIrXCIsbWludXNTaWduOlwiLVwiLHBlcmNlbnRTaWduOlwiJVwiLGluZmluaXR5Olwi4oieXCJ9fSxjdXJyZW5jaWVzOntDQUQ6XCJDQSRcIixFU1A6XCLigqdcIixFVVI6XCLigqxcIixUSEI6XCLguL9cIixVU0Q6XCIkXCIsVk5EOlwi4oKrXCIsWFBGOlwiQ0ZQRlwifX19KTsiLCIgIC8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICAgKi9cblxuICB2YXIgcGF0aHRvUmVnZXhwID0gcmVxdWlyZSgncGF0aC10by1yZWdleHAnKTtcblxuICAvKipcbiAgICogTW9kdWxlIGV4cG9ydHMuXG4gICAqL1xuXG4gIG1vZHVsZS5leHBvcnRzID0gcGFnZTtcblxuICAvKipcbiAgICogRGV0ZWN0IGNsaWNrIGV2ZW50XG4gICAqL1xuICB2YXIgY2xpY2tFdmVudCA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRvY3VtZW50KSAmJiBkb2N1bWVudC5vbnRvdWNoc3RhcnQgPyAndG91Y2hzdGFydCcgOiAnY2xpY2snO1xuXG4gIC8qKlxuICAgKiBUbyB3b3JrIHByb3Blcmx5IHdpdGggdGhlIFVSTFxuICAgKiBoaXN0b3J5LmxvY2F0aW9uIGdlbmVyYXRlZCBwb2x5ZmlsbCBpbiBodHRwczovL2dpdGh1Yi5jb20vZGV2b3RlL0hUTUw1LUhpc3RvcnktQVBJXG4gICAqL1xuXG4gIHZhciBsb2NhdGlvbiA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdpbmRvdykgJiYgKHdpbmRvdy5oaXN0b3J5LmxvY2F0aW9uIHx8IHdpbmRvdy5sb2NhdGlvbik7XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gaW5pdGlhbCBkaXNwYXRjaC5cbiAgICovXG5cbiAgdmFyIGRpc3BhdGNoID0gdHJ1ZTtcblxuXG4gIC8qKlxuICAgKiBEZWNvZGUgVVJMIGNvbXBvbmVudHMgKHF1ZXJ5IHN0cmluZywgcGF0aG5hbWUsIGhhc2gpLlxuICAgKiBBY2NvbW1vZGF0ZXMgYm90aCByZWd1bGFyIHBlcmNlbnQgZW5jb2RpbmcgYW5kIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBmb3JtYXQuXG4gICAqL1xuICB2YXIgZGVjb2RlVVJMQ29tcG9uZW50cyA9IHRydWU7XG5cbiAgLyoqXG4gICAqIEJhc2UgcGF0aC5cbiAgICovXG5cbiAgdmFyIGJhc2UgPSAnJztcblxuICAvKipcbiAgICogUnVubmluZyBmbGFnLlxuICAgKi9cblxuICB2YXIgcnVubmluZztcblxuICAvKipcbiAgICogSGFzaEJhbmcgb3B0aW9uXG4gICAqL1xuXG4gIHZhciBoYXNoYmFuZyA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBQcmV2aW91cyBjb250ZXh0LCBmb3IgY2FwdHVyaW5nXG4gICAqIHBhZ2UgZXhpdCBldmVudHMuXG4gICAqL1xuXG4gIHZhciBwcmV2Q29udGV4dDtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYHBhdGhgIHdpdGggY2FsbGJhY2sgYGZuKClgLFxuICAgKiBvciByb3V0ZSBgcGF0aGAsIG9yIHJlZGlyZWN0aW9uLFxuICAgKiBvciBgcGFnZS5zdGFydCgpYC5cbiAgICpcbiAgICogICBwYWdlKGZuKTtcbiAgICogICBwYWdlKCcqJywgZm4pO1xuICAgKiAgIHBhZ2UoJy91c2VyLzppZCcsIGxvYWQsIHVzZXIpO1xuICAgKiAgIHBhZ2UoJy91c2VyLycgKyB1c2VyLmlkLCB7IHNvbWU6ICd0aGluZycgfSk7XG4gICAqICAgcGFnZSgnL3VzZXIvJyArIHVzZXIuaWQpO1xuICAgKiAgIHBhZ2UoJy9mcm9tJywgJy90bycpXG4gICAqICAgcGFnZSgpO1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3whRnVuY3Rpb258IU9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZm5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gcGFnZShwYXRoLCBmbikge1xuICAgIC8vIDxjYWxsYmFjaz5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHBhdGgpIHtcbiAgICAgIHJldHVybiBwYWdlKCcqJywgcGF0aCk7XG4gICAgfVxuXG4gICAgLy8gcm91dGUgPHBhdGg+IHRvIDxjYWxsYmFjayAuLi4+XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmbikge1xuICAgICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKC8qKiBAdHlwZSB7c3RyaW5nfSAqLyAocGF0aCkpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcGFnZS5jYWxsYmFja3MucHVzaChyb3V0ZS5taWRkbGV3YXJlKGFyZ3VtZW50c1tpXSkpO1xuICAgICAgfVxuICAgICAgLy8gc2hvdyA8cGF0aD4gd2l0aCBbc3RhdGVdXG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHBhdGgpIHtcbiAgICAgIHBhZ2VbJ3N0cmluZycgPT09IHR5cGVvZiBmbiA/ICdyZWRpcmVjdCcgOiAnc2hvdyddKHBhdGgsIGZuKTtcbiAgICAgIC8vIHN0YXJ0IFtvcHRpb25zXVxuICAgIH0gZWxzZSB7XG4gICAgICBwYWdlLnN0YXJ0KHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbnMuXG4gICAqL1xuXG4gIHBhZ2UuY2FsbGJhY2tzID0gW107XG4gIHBhZ2UuZXhpdHMgPSBbXTtcblxuICAvKipcbiAgICogQ3VycmVudCBwYXRoIGJlaW5nIHByb2Nlc3NlZFxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgcGFnZS5jdXJyZW50ID0gJyc7XG5cbiAgLyoqXG4gICAqIE51bWJlciBvZiBwYWdlcyBuYXZpZ2F0ZWQgdG8uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqXG4gICAqICAgICBwYWdlLmxlbiA9PSAwO1xuICAgKiAgICAgcGFnZSgnL2xvZ2luJyk7XG4gICAqICAgICBwYWdlLmxlbiA9PSAxO1xuICAgKi9cblxuICBwYWdlLmxlbiA9IDA7XG5cbiAgLyoqXG4gICAqIEdldCBvciBzZXQgYmFzZXBhdGggdG8gYHBhdGhgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLmJhc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgaWYgKDAgPT09IGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBiYXNlO1xuICAgIGJhc2UgPSBwYXRoO1xuICB9O1xuXG4gIC8qKlxuICAgKiBCaW5kIHdpdGggdGhlIGdpdmVuIGBvcHRpb25zYC5cbiAgICpcbiAgICogT3B0aW9uczpcbiAgICpcbiAgICogICAgLSBgY2xpY2tgIGJpbmQgdG8gY2xpY2sgZXZlbnRzIFt0cnVlXVxuICAgKiAgICAtIGBwb3BzdGF0ZWAgYmluZCB0byBwb3BzdGF0ZSBbdHJ1ZV1cbiAgICogICAgLSBgZGlzcGF0Y2hgIHBlcmZvcm0gaW5pdGlhbCBkaXNwYXRjaCBbdHJ1ZV1cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgcGFnZS5zdGFydCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBpZiAocnVubmluZykgcmV0dXJuO1xuICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgIGlmIChmYWxzZSA9PT0gb3B0aW9ucy5kaXNwYXRjaCkgZGlzcGF0Y2ggPSBmYWxzZTtcbiAgICBpZiAoZmFsc2UgPT09IG9wdGlvbnMuZGVjb2RlVVJMQ29tcG9uZW50cykgZGVjb2RlVVJMQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5wb3BzdGF0ZSkgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xuICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5jbGljaykge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihjbGlja0V2ZW50LCBvbmNsaWNrLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmICh0cnVlID09PSBvcHRpb25zLmhhc2hiYW5nKSBoYXNoYmFuZyA9IHRydWU7XG4gICAgaWYgKCFkaXNwYXRjaCkgcmV0dXJuO1xuICAgIHZhciB1cmwgPSAoaGFzaGJhbmcgJiYgfmxvY2F0aW9uLmhhc2guaW5kZXhPZignIyEnKSkgPyBsb2NhdGlvbi5oYXNoLnN1YnN0cigyKSArIGxvY2F0aW9uLnNlYXJjaCA6IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoICsgbG9jYXRpb24uaGFzaDtcbiAgICBwYWdlLnJlcGxhY2UodXJsLCBudWxsLCB0cnVlLCBkaXNwYXRjaCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVuYmluZCBjbGljayBhbmQgcG9wc3RhdGUgZXZlbnQgaGFuZGxlcnMuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2Uuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghcnVubmluZykgcmV0dXJuO1xuICAgIHBhZ2UuY3VycmVudCA9ICcnO1xuICAgIHBhZ2UubGVuID0gMDtcbiAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihjbGlja0V2ZW50LCBvbmNsaWNrLCBmYWxzZSk7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTaG93IGBwYXRoYCB3aXRoIG9wdGlvbmFsIGBzdGF0ZWAgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IGRpc3BhdGNoXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IHB1c2hcbiAgICogQHJldHVybiB7IUNvbnRleHR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2Uuc2hvdyA9IGZ1bmN0aW9uKHBhdGgsIHN0YXRlLCBkaXNwYXRjaCwgcHVzaCkge1xuICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwYXRoLCBzdGF0ZSk7XG4gICAgcGFnZS5jdXJyZW50ID0gY3R4LnBhdGg7XG4gICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaCkgcGFnZS5kaXNwYXRjaChjdHgpO1xuICAgIGlmIChmYWxzZSAhPT0gY3R4LmhhbmRsZWQgJiYgZmFsc2UgIT09IHB1c2gpIGN0eC5wdXNoU3RhdGUoKTtcbiAgICByZXR1cm4gY3R4O1xuICB9O1xuXG4gIC8qKlxuICAgKiBHb2VzIGJhY2sgaW4gdGhlIGhpc3RvcnlcbiAgICogQmFjayBzaG91bGQgYWx3YXlzIGxldCB0aGUgY3VycmVudCByb3V0ZSBwdXNoIHN0YXRlIGFuZCB0aGVuIGdvIGJhY2suXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gZmFsbGJhY2sgcGF0aCB0byBnbyBiYWNrIGlmIG5vIG1vcmUgaGlzdG9yeSBleGlzdHMsIGlmIHVuZGVmaW5lZCBkZWZhdWx0cyB0byBwYWdlLmJhc2VcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLmJhY2sgPSBmdW5jdGlvbihwYXRoLCBzdGF0ZSkge1xuICAgIGlmIChwYWdlLmxlbiA+IDApIHtcbiAgICAgIC8vIHRoaXMgbWF5IG5lZWQgbW9yZSB0ZXN0aW5nIHRvIHNlZSBpZiBhbGwgYnJvd3NlcnNcbiAgICAgIC8vIHdhaXQgZm9yIHRoZSBuZXh0IHRpY2sgdG8gZ28gYmFjayBpbiBoaXN0b3J5XG4gICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIHBhZ2UubGVuLS07XG4gICAgfSBlbHNlIGlmIChwYXRoKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnNob3cocGF0aCwgc3RhdGUpO1xuICAgICAgfSk7XG4gICAgfWVsc2V7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnNob3coYmFzZSwgc3RhdGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHJvdXRlIHRvIHJlZGlyZWN0IGZyb20gb25lIHBhdGggdG8gb3RoZXJcbiAgICogb3IganVzdCByZWRpcmVjdCB0byBhbm90aGVyIHJvdXRlXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmcm9tIC0gaWYgcGFyYW0gJ3RvJyBpcyB1bmRlZmluZWQgcmVkaXJlY3RzIHRvICdmcm9tJ1xuICAgKiBAcGFyYW0ge3N0cmluZz19IHRvXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwYWdlLnJlZGlyZWN0ID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgICAvLyBEZWZpbmUgcm91dGUgZnJvbSBhIHBhdGggdG8gYW5vdGhlclxuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGZyb20gJiYgJ3N0cmluZycgPT09IHR5cGVvZiB0bykge1xuICAgICAgcGFnZShmcm9tLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcGFnZS5yZXBsYWNlKC8qKiBAdHlwZSB7IXN0cmluZ30gKi8gKHRvKSk7XG4gICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2FpdCBmb3IgdGhlIHB1c2ggc3RhdGUgYW5kIHJlcGxhY2UgaXQgd2l0aCBhbm90aGVyXG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgZnJvbSAmJiAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRvKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnJlcGxhY2UoZnJvbSk7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcGxhY2UgYHBhdGhgIHdpdGggb3B0aW9uYWwgYHN0YXRlYCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gc3RhdGVcbiAgICogQHBhcmFtIHtib29sZWFuPX0gaW5pdFxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBkaXNwYXRjaFxuICAgKiBAcmV0dXJuIHshQ29udGV4dH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cblxuICBwYWdlLnJlcGxhY2UgPSBmdW5jdGlvbihwYXRoLCBzdGF0ZSwgaW5pdCwgZGlzcGF0Y2gpIHtcbiAgICB2YXIgY3R4ID0gbmV3IENvbnRleHQocGF0aCwgc3RhdGUpO1xuICAgIHBhZ2UuY3VycmVudCA9IGN0eC5wYXRoO1xuICAgIGN0eC5pbml0ID0gaW5pdDtcbiAgICBjdHguc2F2ZSgpOyAvLyBzYXZlIGJlZm9yZSBkaXNwYXRjaGluZywgd2hpY2ggbWF5IHJlZGlyZWN0XG4gICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaCkgcGFnZS5kaXNwYXRjaChjdHgpO1xuICAgIHJldHVybiBjdHg7XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHRoZSBnaXZlbiBgY3R4YC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBwYWdlLmRpc3BhdGNoID0gZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHByZXYgPSBwcmV2Q29udGV4dCxcbiAgICAgIGkgPSAwLFxuICAgICAgaiA9IDA7XG5cbiAgICBwcmV2Q29udGV4dCA9IGN0eDtcblxuICAgIGZ1bmN0aW9uIG5leHRFeGl0KCkge1xuICAgICAgdmFyIGZuID0gcGFnZS5leGl0c1tqKytdO1xuICAgICAgaWYgKCFmbikgcmV0dXJuIG5leHRFbnRlcigpO1xuICAgICAgZm4ocHJldiwgbmV4dEV4aXQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHRFbnRlcigpIHtcbiAgICAgIHZhciBmbiA9IHBhZ2UuY2FsbGJhY2tzW2krK107XG5cbiAgICAgIGlmIChjdHgucGF0aCAhPT0gcGFnZS5jdXJyZW50KSB7XG4gICAgICAgIGN0eC5oYW5kbGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghZm4pIHJldHVybiB1bmhhbmRsZWQoY3R4KTtcbiAgICAgIGZuKGN0eCwgbmV4dEVudGVyKTtcbiAgICB9XG5cbiAgICBpZiAocHJldikge1xuICAgICAgbmV4dEV4aXQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dEVudGVyKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbmhhbmRsZWQgYGN0eGAuIFdoZW4gaXQncyBub3QgdGhlIGluaXRpYWxcbiAgICogcG9wc3RhdGUgdGhlbiByZWRpcmVjdC4gSWYgeW91IHdpc2ggdG8gaGFuZGxlXG4gICAqIDQwNHMgb24geW91ciBvd24gdXNlIGBwYWdlKCcqJywgY2FsbGJhY2spYC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiB1bmhhbmRsZWQoY3R4KSB7XG4gICAgaWYgKGN0eC5oYW5kbGVkKSByZXR1cm47XG4gICAgdmFyIGN1cnJlbnQ7XG5cbiAgICBpZiAoaGFzaGJhbmcpIHtcbiAgICAgIGN1cnJlbnQgPSBiYXNlICsgbG9jYXRpb24uaGFzaC5yZXBsYWNlKCcjIScsICcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCA9IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50ID09PSBjdHguY2Fub25pY2FsUGF0aCkgcmV0dXJuO1xuICAgIHBhZ2Uuc3RvcCgpO1xuICAgIGN0eC5oYW5kbGVkID0gZmFsc2U7XG4gICAgbG9jYXRpb24uaHJlZiA9IGN0eC5jYW5vbmljYWxQYXRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGFuIGV4aXQgcm91dGUgb24gYHBhdGhgIHdpdGhcbiAgICogY2FsbGJhY2sgYGZuKClgLCB3aGljaCB3aWxsIGJlIGNhbGxlZFxuICAgKiBvbiB0aGUgcHJldmlvdXMgY29udGV4dCB3aGVuIGEgbmV3XG4gICAqIHBhZ2UgaXMgdmlzaXRlZC5cbiAgICovXG4gIHBhZ2UuZXhpdCA9IGZ1bmN0aW9uKHBhdGgsIGZuKSB7XG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGFnZS5leGl0KCcqJywgcGF0aCk7XG4gICAgfVxuXG4gICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKHBhdGgpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBwYWdlLmV4aXRzLnB1c2gocm91dGUubWlkZGxld2FyZShhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBVUkwgZW5jb2RpbmcgZnJvbSB0aGUgZ2l2ZW4gYHN0cmAuXG4gICAqIEFjY29tbW9kYXRlcyB3aGl0ZXNwYWNlIGluIGJvdGggeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gICAqIGFuZCByZWd1bGFyIHBlcmNlbnQtZW5jb2RlZCBmb3JtLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsIC0gVVJMIGNvbXBvbmVudCB0byBkZWNvZGVcbiAgICovXG4gIGZ1bmN0aW9uIGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQodmFsKSB7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnKSB7IHJldHVybiB2YWw7IH1cbiAgICByZXR1cm4gZGVjb2RlVVJMQ29tcG9uZW50cyA/IGRlY29kZVVSSUNvbXBvbmVudCh2YWwucmVwbGFjZSgvXFwrL2csICcgJykpIDogdmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBuZXcgXCJyZXF1ZXN0XCIgYENvbnRleHRgXG4gICAqIHdpdGggdGhlIGdpdmVuIGBwYXRoYCBhbmQgb3B0aW9uYWwgaW5pdGlhbCBgc3RhdGVgLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBDb250ZXh0KHBhdGgsIHN0YXRlKSB7XG4gICAgaWYgKCcvJyA9PT0gcGF0aFswXSAmJiAwICE9PSBwYXRoLmluZGV4T2YoYmFzZSkpIHBhdGggPSBiYXNlICsgKGhhc2hiYW5nID8gJyMhJyA6ICcnKSArIHBhdGg7XG4gICAgdmFyIGkgPSBwYXRoLmluZGV4T2YoJz8nKTtcblxuICAgIHRoaXMuY2Fub25pY2FsUGF0aCA9IHBhdGg7XG4gICAgdGhpcy5wYXRoID0gcGF0aC5yZXBsYWNlKGJhc2UsICcnKSB8fCAnLyc7XG4gICAgaWYgKGhhc2hiYW5nKSB0aGlzLnBhdGggPSB0aGlzLnBhdGgucmVwbGFjZSgnIyEnLCAnJykgfHwgJy8nO1xuXG4gICAgdGhpcy50aXRsZSA9IGRvY3VtZW50LnRpdGxlO1xuICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICB0aGlzLnN0YXRlLnBhdGggPSBwYXRoO1xuICAgIHRoaXMucXVlcnlzdHJpbmcgPSB+aSA/IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQocGF0aC5zbGljZShpICsgMSkpIDogJyc7XG4gICAgdGhpcy5wYXRobmFtZSA9IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQofmkgPyBwYXRoLnNsaWNlKDAsIGkpIDogcGF0aCk7XG4gICAgdGhpcy5wYXJhbXMgPSB7fTtcblxuICAgIC8vIGZyYWdtZW50XG4gICAgdGhpcy5oYXNoID0gJyc7XG4gICAgaWYgKCFoYXNoYmFuZykge1xuICAgICAgaWYgKCF+dGhpcy5wYXRoLmluZGV4T2YoJyMnKSkgcmV0dXJuO1xuICAgICAgdmFyIHBhcnRzID0gdGhpcy5wYXRoLnNwbGl0KCcjJyk7XG4gICAgICB0aGlzLnBhdGggPSBwYXJ0c1swXTtcbiAgICAgIHRoaXMuaGFzaCA9IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQocGFydHNbMV0pIHx8ICcnO1xuICAgICAgdGhpcy5xdWVyeXN0cmluZyA9IHRoaXMucXVlcnlzdHJpbmcuc3BsaXQoJyMnKVswXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXhwb3NlIGBDb250ZXh0YC5cbiAgICovXG5cbiAgcGFnZS5Db250ZXh0ID0gQ29udGV4dDtcblxuICAvKipcbiAgICogUHVzaCBzdGF0ZS5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIENvbnRleHQucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhZ2UubGVuKys7XG4gICAgaGlzdG9yeS5wdXNoU3RhdGUodGhpcy5zdGF0ZSwgdGhpcy50aXRsZSwgaGFzaGJhbmcgJiYgdGhpcy5wYXRoICE9PSAnLycgPyAnIyEnICsgdGhpcy5wYXRoIDogdGhpcy5jYW5vbmljYWxQYXRoKTtcbiAgfTtcblxuICAvKipcbiAgICogU2F2ZSB0aGUgY29udGV4dCBzdGF0ZS5cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgQ29udGV4dC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsIHRoaXMudGl0bGUsIGhhc2hiYW5nICYmIHRoaXMucGF0aCAhPT0gJy8nID8gJyMhJyArIHRoaXMucGF0aCA6IHRoaXMuY2Fub25pY2FsUGF0aCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYFJvdXRlYCB3aXRoIHRoZSBnaXZlbiBIVFRQIGBwYXRoYCxcbiAgICogYW5kIGFuIGFycmF5IG9mIGBjYWxsYmFja3NgIGFuZCBgb3B0aW9uc2AuXG4gICAqXG4gICAqIE9wdGlvbnM6XG4gICAqXG4gICAqICAgLSBgc2Vuc2l0aXZlYCAgICBlbmFibGUgY2FzZS1zZW5zaXRpdmUgcm91dGVzXG4gICAqICAgLSBgc3RyaWN0YCAgICAgICBlbmFibGUgc3RyaWN0IG1hdGNoaW5nIGZvciB0cmFpbGluZyBzbGFzaGVzXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnNcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIFJvdXRlKHBhdGgsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLnBhdGggPSAocGF0aCA9PT0gJyonKSA/ICcoLiopJyA6IHBhdGg7XG4gICAgdGhpcy5tZXRob2QgPSAnR0VUJztcbiAgICB0aGlzLnJlZ2V4cCA9IHBhdGh0b1JlZ2V4cCh0aGlzLnBhdGgsXG4gICAgICB0aGlzLmtleXMgPSBbXSxcbiAgICAgIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4cG9zZSBgUm91dGVgLlxuICAgKi9cblxuICBwYWdlLlJvdXRlID0gUm91dGU7XG5cbiAgLyoqXG4gICAqIFJldHVybiByb3V0ZSBtaWRkbGV3YXJlIHdpdGhcbiAgICogdGhlIGdpdmVuIGNhbGxiYWNrIGBmbigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFJvdXRlLnByb3RvdHlwZS5taWRkbGV3YXJlID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGN0eCwgbmV4dCkge1xuICAgICAgaWYgKHNlbGYubWF0Y2goY3R4LnBhdGgsIGN0eC5wYXJhbXMpKSByZXR1cm4gZm4oY3R4LCBuZXh0KTtcbiAgICAgIG5leHQoKTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGlzIHJvdXRlIG1hdGNoZXMgYHBhdGhgLCBpZiBzb1xuICAgKiBwb3B1bGF0ZSBgcGFyYW1zYC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtc1xuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgUm91dGUucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24ocGF0aCwgcGFyYW1zKSB7XG4gICAgdmFyIGtleXMgPSB0aGlzLmtleXMsXG4gICAgICBxc0luZGV4ID0gcGF0aC5pbmRleE9mKCc/JyksXG4gICAgICBwYXRobmFtZSA9IH5xc0luZGV4ID8gcGF0aC5zbGljZSgwLCBxc0luZGV4KSA6IHBhdGgsXG4gICAgICBtID0gdGhpcy5yZWdleHAuZXhlYyhkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpKTtcblxuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbiA9IG0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIHZhciB2YWwgPSBkZWNvZGVVUkxFbmNvZGVkVVJJQ29tcG9uZW50KG1baV0pO1xuICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkIHx8ICEoaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbXMsIGtleS5uYW1lKSkpIHtcbiAgICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuXG4gIC8qKlxuICAgKiBIYW5kbGUgXCJwb3B1bGF0ZVwiIGV2ZW50cy5cbiAgICovXG5cbiAgdmFyIG9ucG9wc3RhdGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB3aW5kb3cpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgIGxvYWRlZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG9ucG9wc3RhdGUoZSkge1xuICAgICAgaWYgKCFsb2FkZWQpIHJldHVybjtcbiAgICAgIGlmIChlLnN0YXRlKSB7XG4gICAgICAgIHZhciBwYXRoID0gZS5zdGF0ZS5wYXRoO1xuICAgICAgICBwYWdlLnJlcGxhY2UocGF0aCwgZS5zdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYWdlLnNob3cobG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5oYXNoLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG4gIC8qKlxuICAgKiBIYW5kbGUgXCJjbGlja1wiIGV2ZW50cy5cbiAgICovXG5cbiAgZnVuY3Rpb24gb25jbGljayhlKSB7XG5cbiAgICBpZiAoMSAhPT0gd2hpY2goZSkpIHJldHVybjtcblxuICAgIGlmIChlLm1ldGFLZXkgfHwgZS5jdHJsS2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcbiAgICBpZiAoZS5kZWZhdWx0UHJldmVudGVkKSByZXR1cm47XG5cblxuXG4gICAgLy8gZW5zdXJlIGxpbmtcbiAgICAvLyB1c2Ugc2hhZG93IGRvbSB3aGVuIGF2YWlsYWJsZVxuICAgIHZhciBlbCA9IGUucGF0aCA/IGUucGF0aFswXSA6IGUudGFyZ2V0O1xuICAgIHdoaWxlIChlbCAmJiAnQScgIT09IGVsLm5vZGVOYW1lKSBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgaWYgKCFlbCB8fCAnQScgIT09IGVsLm5vZGVOYW1lKSByZXR1cm47XG5cblxuXG4gICAgLy8gSWdub3JlIGlmIHRhZyBoYXNcbiAgICAvLyAxLiBcImRvd25sb2FkXCIgYXR0cmlidXRlXG4gICAgLy8gMi4gcmVsPVwiZXh0ZXJuYWxcIiBhdHRyaWJ1dGVcbiAgICBpZiAoZWwuaGFzQXR0cmlidXRlKCdkb3dubG9hZCcpIHx8IGVsLmdldEF0dHJpYnV0ZSgncmVsJykgPT09ICdleHRlcm5hbCcpIHJldHVybjtcblxuICAgIC8vIGVuc3VyZSBub24taGFzaCBmb3IgdGhlIHNhbWUgcGF0aFxuICAgIHZhciBsaW5rID0gZWwuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgaWYgKCFoYXNoYmFuZyAmJiBlbC5wYXRobmFtZSA9PT0gbG9jYXRpb24ucGF0aG5hbWUgJiYgKGVsLmhhc2ggfHwgJyMnID09PSBsaW5rKSkgcmV0dXJuO1xuXG5cblxuICAgIC8vIENoZWNrIGZvciBtYWlsdG86IGluIHRoZSBocmVmXG4gICAgaWYgKGxpbmsgJiYgbGluay5pbmRleE9mKCdtYWlsdG86JykgPiAtMSkgcmV0dXJuO1xuXG4gICAgLy8gY2hlY2sgdGFyZ2V0XG4gICAgaWYgKGVsLnRhcmdldCkgcmV0dXJuO1xuXG4gICAgLy8geC1vcmlnaW5cbiAgICBpZiAoIXNhbWVPcmlnaW4oZWwuaHJlZikpIHJldHVybjtcblxuXG5cbiAgICAvLyByZWJ1aWxkIHBhdGhcbiAgICB2YXIgcGF0aCA9IGVsLnBhdGhuYW1lICsgZWwuc2VhcmNoICsgKGVsLmhhc2ggfHwgJycpO1xuXG4gICAgLy8gc3RyaXAgbGVhZGluZyBcIi9bZHJpdmUgbGV0dGVyXTpcIiBvbiBOVy5qcyBvbiBXaW5kb3dzXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwYXRoLm1hdGNoKC9eXFwvW2EtekEtWl06XFwvLykpIHtcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC9bYS16QS1aXTpcXC8vLCAnLycpO1xuICAgIH1cblxuICAgIC8vIHNhbWUgcGFnZVxuICAgIHZhciBvcmlnID0gcGF0aDtcblxuICAgIGlmIChwYXRoLmluZGV4T2YoYmFzZSkgPT09IDApIHtcbiAgICAgIHBhdGggPSBwYXRoLnN1YnN0cihiYXNlLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgaWYgKGhhc2hiYW5nKSBwYXRoID0gcGF0aC5yZXBsYWNlKCcjIScsICcnKTtcblxuICAgIGlmIChiYXNlICYmIG9yaWcgPT09IHBhdGgpIHJldHVybjtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBwYWdlLnNob3cob3JpZyk7XG4gIH1cblxuICAvKipcbiAgICogRXZlbnQgYnV0dG9uLlxuICAgKi9cblxuICBmdW5jdGlvbiB3aGljaChlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHJldHVybiBudWxsID09PSBlLndoaWNoID8gZS5idXR0b24gOiBlLndoaWNoO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGBocmVmYCBpcyB0aGUgc2FtZSBvcmlnaW4uXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHNhbWVPcmlnaW4oaHJlZikge1xuICAgIHZhciBvcmlnaW4gPSBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0bmFtZTtcbiAgICBpZiAobG9jYXRpb24ucG9ydCkgb3JpZ2luICs9ICc6JyArIGxvY2F0aW9uLnBvcnQ7XG4gICAgcmV0dXJuIChocmVmICYmICgwID09PSBocmVmLmluZGV4T2Yob3JpZ2luKSkpO1xuICB9XG5cbiAgcGFnZS5zYW1lT3JpZ2luID0gc2FtZU9yaWdpbjtcbiIsInZhciBpc2FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbi8qKlxuICogRXhwb3NlIGBwYXRoVG9SZWdleHBgLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGhUb1JlZ2V4cFxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxubW9kdWxlLmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGVcbm1vZHVsZS5leHBvcnRzLnRva2Vuc1RvRnVuY3Rpb24gPSB0b2tlbnNUb0Z1bmN0aW9uXG5tb2R1bGUuZXhwb3J0cy50b2tlbnNUb1JlZ0V4cCA9IHRva2Vuc1RvUmVnRXhwXG5cbi8qKlxuICogVGhlIG1haW4gcGF0aCBtYXRjaGluZyByZWdleHAgdXRpbGl0eS5cbiAqXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG52YXIgUEFUSF9SRUdFWFAgPSBuZXcgUmVnRXhwKFtcbiAgLy8gTWF0Y2ggZXNjYXBlZCBjaGFyYWN0ZXJzIHRoYXQgd291bGQgb3RoZXJ3aXNlIGFwcGVhciBpbiBmdXR1cmUgbWF0Y2hlcy5cbiAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyB0aGF0IHdvbid0IHRyYW5zZm9ybS5cbiAgJyhcXFxcXFxcXC4pJyxcbiAgLy8gTWF0Y2ggRXhwcmVzcy1zdHlsZSBwYXJhbWV0ZXJzIGFuZCB1bi1uYW1lZCBwYXJhbWV0ZXJzIHdpdGggYSBwcmVmaXhcbiAgLy8gYW5kIG9wdGlvbmFsIHN1ZmZpeGVzLiBNYXRjaGVzIGFwcGVhciBhczpcbiAgLy9cbiAgLy8gXCIvOnRlc3QoXFxcXGQrKT9cIiA9PiBbXCIvXCIsIFwidGVzdFwiLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCBcIj9cIiwgdW5kZWZpbmVkXVxuICAvLyBcIi9yb3V0ZShcXFxcZCspXCIgID0+IFt1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXG4gIC8vIFwiLypcIiAgICAgICAgICAgID0+IFtcIi9cIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIipcIl1cbiAgJyhbXFxcXC8uXSk/KD86KD86XFxcXDooXFxcXHcrKSg/OlxcXFwoKCg/OlxcXFxcXFxcLnxbXigpXSkrKVxcXFwpKT98XFxcXCgoKD86XFxcXFxcXFwufFteKCldKSspXFxcXCkpKFsrKj9dKT98KFxcXFwqKSknXG5dLmpvaW4oJ3wnKSwgJ2cnKVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgdmFyIHRva2VucyA9IFtdXG4gIHZhciBrZXkgPSAwXG4gIHZhciBpbmRleCA9IDBcbiAgdmFyIHBhdGggPSAnJ1xuICB2YXIgcmVzXG5cbiAgd2hpbGUgKChyZXMgPSBQQVRIX1JFR0VYUC5leGVjKHN0cikpICE9IG51bGwpIHtcbiAgICB2YXIgbSA9IHJlc1swXVxuICAgIHZhciBlc2NhcGVkID0gcmVzWzFdXG4gICAgdmFyIG9mZnNldCA9IHJlcy5pbmRleFxuICAgIHBhdGggKz0gc3RyLnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgaW5kZXggPSBvZmZzZXQgKyBtLmxlbmd0aFxuXG4gICAgLy8gSWdub3JlIGFscmVhZHkgZXNjYXBlZCBzZXF1ZW5jZXMuXG4gICAgaWYgKGVzY2FwZWQpIHtcbiAgICAgIHBhdGggKz0gZXNjYXBlZFsxXVxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICAvLyBQdXNoIHRoZSBjdXJyZW50IHBhdGggb250byB0aGUgdG9rZW5zLlxuICAgIGlmIChwYXRoKSB7XG4gICAgICB0b2tlbnMucHVzaChwYXRoKVxuICAgICAgcGF0aCA9ICcnXG4gICAgfVxuXG4gICAgdmFyIHByZWZpeCA9IHJlc1syXVxuICAgIHZhciBuYW1lID0gcmVzWzNdXG4gICAgdmFyIGNhcHR1cmUgPSByZXNbNF1cbiAgICB2YXIgZ3JvdXAgPSByZXNbNV1cbiAgICB2YXIgc3VmZml4ID0gcmVzWzZdXG4gICAgdmFyIGFzdGVyaXNrID0gcmVzWzddXG5cbiAgICB2YXIgcmVwZWF0ID0gc3VmZml4ID09PSAnKycgfHwgc3VmZml4ID09PSAnKidcbiAgICB2YXIgb3B0aW9uYWwgPSBzdWZmaXggPT09ICc/JyB8fCBzdWZmaXggPT09ICcqJ1xuICAgIHZhciBkZWxpbWl0ZXIgPSBwcmVmaXggfHwgJy8nXG4gICAgdmFyIHBhdHRlcm4gPSBjYXB0dXJlIHx8IGdyb3VwIHx8IChhc3RlcmlzayA/ICcuKicgOiAnW14nICsgZGVsaW1pdGVyICsgJ10rPycpXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBuYW1lOiBuYW1lIHx8IGtleSsrLFxuICAgICAgcHJlZml4OiBwcmVmaXggfHwgJycsXG4gICAgICBkZWxpbWl0ZXI6IGRlbGltaXRlcixcbiAgICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcbiAgICAgIHJlcGVhdDogcmVwZWF0LFxuICAgICAgcGF0dGVybjogZXNjYXBlR3JvdXAocGF0dGVybilcbiAgICB9KVxuICB9XG5cbiAgLy8gTWF0Y2ggYW55IGNoYXJhY3RlcnMgc3RpbGwgcmVtYWluaW5nLlxuICBpZiAoaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgcGF0aCArPSBzdHIuc3Vic3RyKGluZGV4KVxuICB9XG5cbiAgLy8gSWYgdGhlIHBhdGggZXhpc3RzLCBwdXNoIGl0IG9udG8gdGhlIGVuZC5cbiAgaWYgKHBhdGgpIHtcbiAgICB0b2tlbnMucHVzaChwYXRoKVxuICB9XG5cbiAgcmV0dXJuIHRva2Vuc1xufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzdHJpbmcgdG8gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmb3IgdGhlIHBhdGguXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIHN0clxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHN0cikge1xuICByZXR1cm4gdG9rZW5zVG9GdW5jdGlvbihwYXJzZShzdHIpKVxufVxuXG4vKipcbiAqIEV4cG9zZSBhIG1ldGhvZCBmb3IgdHJhbnNmb3JtaW5nIHRva2VucyBpbnRvIHRoZSBwYXRoIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uICh0b2tlbnMpIHtcbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHRva2VucyBpbnRvIHJlZ2V4cHMuXG4gIHZhciBtYXRjaGVzID0gbmV3IEFycmF5KHRva2Vucy5sZW5ndGgpXG5cbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHBhdHRlcm5zIGJlZm9yZSBjb21waWxhdGlvbi5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHRva2Vuc1tpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIG1hdGNoZXNbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRva2Vuc1tpXS5wYXR0ZXJuICsgJyQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHBhdGggPSAnJ1xuICAgIHZhciBkYXRhID0gb2JqIHx8IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggKz0gdG9rZW5cblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdXG4gICAgICB2YXIgc2VnbWVudFxuXG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICBpZiAodG9rZW4ub3B0aW9uYWwpIHtcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gYmUgZGVmaW5lZCcpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGlzYXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGlmICghdG9rZW4ucmVwZWF0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBub3QgcmVwZWF0LCBidXQgcmVjZWl2ZWQgXCInICsgdmFsdWUgKyAnXCInKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmICh0b2tlbi5vcHRpb25hbCkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBub3QgYmUgZW1wdHknKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsdWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBzZWdtZW50ID0gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlW2pdKVxuXG4gICAgICAgICAgaWYgKCFtYXRjaGVzW2ldLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFsbCBcIicgKyB0b2tlbi5uYW1lICsgJ1wiIHRvIG1hdGNoIFwiJyArIHRva2VuLnBhdHRlcm4gKyAnXCIsIGJ1dCByZWNlaXZlZCBcIicgKyBzZWdtZW50ICsgJ1wiJylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXRoICs9IChqID09PSAwID8gdG9rZW4ucHJlZml4IDogdG9rZW4uZGVsaW1pdGVyKSArIHNlZ21lbnRcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIHNlZ21lbnQgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpXG5cbiAgICAgIGlmICghbWF0Y2hlc1tpXS50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gbWF0Y2ggXCInICsgdG9rZW4ucGF0dGVybiArICdcIiwgYnV0IHJlY2VpdmVkIFwiJyArIHNlZ21lbnQgKyAnXCInKVxuICAgICAgfVxuXG4gICAgICBwYXRoICs9IHRva2VuLnByZWZpeCArIHNlZ21lbnRcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aFxuICB9XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBlc2NhcGVTdHJpbmcgKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLisqPz1eIToke30oKVtcXF18XFwvXSkvZywgJ1xcXFwkMScpXG59XG5cbi8qKlxuICogRXNjYXBlIHRoZSBjYXB0dXJpbmcgZ3JvdXAgYnkgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFuZCBtZWFuaW5nLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gZ3JvdXBcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXNjYXBlR3JvdXAgKGdyb3VwKSB7XG4gIHJldHVybiBncm91cC5yZXBsYWNlKC8oWz0hOiRcXC8oKV0pL2csICdcXFxcJDEnKVxufVxuXG4vKipcbiAqIEF0dGFjaCB0aGUga2V5cyBhcyBhIHByb3BlcnR5IG9mIHRoZSByZWdleHAuXG4gKlxuICogQHBhcmFtICB7UmVnRXhwfSByZVxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIGF0dGFjaEtleXMgKHJlLCBrZXlzKSB7XG4gIHJlLmtleXMgPSBrZXlzXG4gIHJldHVybiByZVxufVxuXG4vKipcbiAqIEdldCB0aGUgZmxhZ3MgZm9yIGEgcmVnZXhwIGZyb20gdGhlIG9wdGlvbnMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGZsYWdzIChvcHRpb25zKSB7XG4gIHJldHVybiBvcHRpb25zLnNlbnNpdGl2ZSA/ICcnIDogJ2knXG59XG5cbi8qKlxuICogUHVsbCBvdXQga2V5cyBmcm9tIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge1JlZ0V4cH0gcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIHJlZ2V4cFRvUmVnZXhwIChwYXRoLCBrZXlzKSB7XG4gIC8vIFVzZSBhIG5lZ2F0aXZlIGxvb2thaGVhZCB0byBtYXRjaCBvbmx5IGNhcHR1cmluZyBncm91cHMuXG4gIHZhciBncm91cHMgPSBwYXRoLnNvdXJjZS5tYXRjaCgvXFwoKD8hXFw/KS9nKVxuXG4gIGlmIChncm91cHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAga2V5cy5wdXNoKHtcbiAgICAgICAgbmFtZTogaSxcbiAgICAgICAgcHJlZml4OiBudWxsLFxuICAgICAgICBkZWxpbWl0ZXI6IG51bGwsXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgcmVwZWF0OiBmYWxzZSxcbiAgICAgICAgcGF0dGVybjogbnVsbFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXR0YWNoS2V5cyhwYXRoLCBrZXlzKVxufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBhcnJheSBpbnRvIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gYXJyYXlUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucykge1xuICB2YXIgcGFydHMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgIHBhcnRzLnB1c2gocGF0aFRvUmVnZXhwKHBhdGhbaV0sIGtleXMsIG9wdGlvbnMpLnNvdXJjZSlcbiAgfVxuXG4gIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCcoPzonICsgcGFydHMuam9pbignfCcpICsgJyknLCBmbGFncyhvcHRpb25zKSlcblxuICByZXR1cm4gYXR0YWNoS2V5cyhyZWdleHAsIGtleXMpXG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCByZWdleHAgZnJvbSBzdHJpbmcgaW5wdXQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiBzdHJpbmdUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucykge1xuICB2YXIgdG9rZW5zID0gcGFyc2UocGF0aClcbiAgdmFyIHJlID0gdG9rZW5zVG9SZWdFeHAodG9rZW5zLCBvcHRpb25zKVxuXG4gIC8vIEF0dGFjaCBrZXlzIGJhY2sgdG8gdGhlIHJlZ2V4cC5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHRva2Vuc1tpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGtleXMucHVzaCh0b2tlbnNbaV0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGF0dGFjaEtleXMocmUsIGtleXMpXG59XG5cbi8qKlxuICogRXhwb3NlIGEgZnVuY3Rpb24gZm9yIHRha2luZyB0b2tlbnMgYW5kIHJldHVybmluZyBhIFJlZ0V4cC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gIHRva2Vuc1xuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gdG9rZW5zVG9SZWdFeHAgKHRva2Vucywgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gIHZhciBzdHJpY3QgPSBvcHRpb25zLnN0cmljdFxuICB2YXIgZW5kID0gb3B0aW9ucy5lbmQgIT09IGZhbHNlXG4gIHZhciByb3V0ZSA9ICcnXG4gIHZhciBsYXN0VG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdXG4gIHZhciBlbmRzV2l0aFNsYXNoID0gdHlwZW9mIGxhc3RUb2tlbiA9PT0gJ3N0cmluZycgJiYgL1xcLyQvLnRlc3QobGFzdFRva2VuKVxuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgdG9rZW5zIGFuZCBjcmVhdGUgb3VyIHJlZ2V4cCBzdHJpbmcuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICBpZiAodHlwZW9mIHRva2VuID09PSAnc3RyaW5nJykge1xuICAgICAgcm91dGUgKz0gZXNjYXBlU3RyaW5nKHRva2VuKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcHJlZml4ID0gZXNjYXBlU3RyaW5nKHRva2VuLnByZWZpeClcbiAgICAgIHZhciBjYXB0dXJlID0gdG9rZW4ucGF0dGVyblxuXG4gICAgICBpZiAodG9rZW4ucmVwZWF0KSB7XG4gICAgICAgIGNhcHR1cmUgKz0gJyg/OicgKyBwcmVmaXggKyBjYXB0dXJlICsgJykqJ1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4ub3B0aW9uYWwpIHtcbiAgICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICAgIGNhcHR1cmUgPSAnKD86JyArIHByZWZpeCArICcoJyArIGNhcHR1cmUgKyAnKSk/J1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhcHR1cmUgPSAnKCcgKyBjYXB0dXJlICsgJyk/J1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXB0dXJlID0gcHJlZml4ICsgJygnICsgY2FwdHVyZSArICcpJ1xuICAgICAgfVxuXG4gICAgICByb3V0ZSArPSBjYXB0dXJlXG4gICAgfVxuICB9XG5cbiAgLy8gSW4gbm9uLXN0cmljdCBtb2RlIHdlIGFsbG93IGEgc2xhc2ggYXQgdGhlIGVuZCBvZiBtYXRjaC4gSWYgdGhlIHBhdGggdG9cbiAgLy8gbWF0Y2ggYWxyZWFkeSBlbmRzIHdpdGggYSBzbGFzaCwgd2UgcmVtb3ZlIGl0IGZvciBjb25zaXN0ZW5jeS4gVGhlIHNsYXNoXG4gIC8vIGlzIHZhbGlkIGF0IHRoZSBlbmQgb2YgYSBwYXRoIG1hdGNoLCBub3QgaW4gdGhlIG1pZGRsZS4gVGhpcyBpcyBpbXBvcnRhbnRcbiAgLy8gaW4gbm9uLWVuZGluZyBtb2RlLCB3aGVyZSBcIi90ZXN0L1wiIHNob3VsZG4ndCBtYXRjaCBcIi90ZXN0Ly9yb3V0ZVwiLlxuICBpZiAoIXN0cmljdCkge1xuICAgIHJvdXRlID0gKGVuZHNXaXRoU2xhc2ggPyByb3V0ZS5zbGljZSgwLCAtMikgOiByb3V0ZSkgKyAnKD86XFxcXC8oPz0kKSk/J1xuICB9XG5cbiAgaWYgKGVuZCkge1xuICAgIHJvdXRlICs9ICckJ1xuICB9IGVsc2Uge1xuICAgIC8vIEluIG5vbi1lbmRpbmcgbW9kZSwgd2UgbmVlZCB0aGUgY2FwdHVyaW5nIGdyb3VwcyB0byBtYXRjaCBhcyBtdWNoIGFzXG4gICAgLy8gcG9zc2libGUgYnkgdXNpbmcgYSBwb3NpdGl2ZSBsb29rYWhlYWQgdG8gdGhlIGVuZCBvciBuZXh0IHBhdGggc2VnbWVudC5cbiAgICByb3V0ZSArPSBzdHJpY3QgJiYgZW5kc1dpdGhTbGFzaCA/ICcnIDogJyg/PVxcXFwvfCQpJ1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAoJ14nICsgcm91dGUsIGZsYWdzKG9wdGlvbnMpKVxufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBBbiBlbXB0eSBhcnJheSBjYW4gYmUgcGFzc2VkIGluIGZvciB0aGUga2V5cywgd2hpY2ggd2lsbCBob2xkIHRoZVxuICogcGxhY2Vob2xkZXIga2V5IGRlc2NyaXB0aW9ucy4gRm9yIGV4YW1wbGUsIHVzaW5nIGAvdXNlci86aWRgLCBga2V5c2Agd2lsbFxuICogY29udGFpbiBgW3sgbmFtZTogJ2lkJywgZGVsaW1pdGVyOiAnLycsIG9wdGlvbmFsOiBmYWxzZSwgcmVwZWF0OiBmYWxzZSB9XWAuXG4gKlxuICogQHBhcmFtICB7KFN0cmluZ3xSZWdFeHB8QXJyYXkpfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgICAgICAgICAgICAgIFtrZXlzXVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgICAgICAgICBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gcGF0aFRvUmVnZXhwIChwYXRoLCBrZXlzLCBvcHRpb25zKSB7XG4gIGtleXMgPSBrZXlzIHx8IFtdXG5cbiAgaWYgKCFpc2FycmF5KGtleXMpKSB7XG4gICAgb3B0aW9ucyA9IGtleXNcbiAgICBrZXlzID0gW11cbiAgfSBlbHNlIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fVxuICB9XG5cbiAgaWYgKHBhdGggaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gcmVnZXhwVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucylcbiAgfVxuXG4gIGlmIChpc2FycmF5KHBhdGgpKSB7XG4gICAgcmV0dXJuIGFycmF5VG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucylcbiAgfVxuXG4gIHJldHVybiBzdHJpbmdUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiXG52YXIgb3JpZyA9IGRvY3VtZW50LnRpdGxlO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBzZXQ7XG5cbmZ1bmN0aW9uIHNldChzdHIpIHtcbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgZG9jdW1lbnQudGl0bGUgPSBzdHIucmVwbGFjZSgvJVtvc10vZywgZnVuY3Rpb24oXyl7XG4gICAgc3dpdGNoIChfKSB7XG4gICAgICBjYXNlICclbyc6XG4gICAgICAgIHJldHVybiBvcmlnO1xuICAgICAgY2FzZSAnJXMnOlxuICAgICAgICByZXR1cm4gYXJnc1tpKytdO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydHMucmVzZXQgPSBmdW5jdGlvbigpe1xuICBzZXQob3JpZyk7XG59O1xuIiwidmFyIGJlbCA9IHJlcXVpcmUoJ2JlbCcpIC8vIHR1cm5zIHRlbXBsYXRlIHRhZyBpbnRvIERPTSBlbGVtZW50c1xudmFyIG1vcnBoZG9tID0gcmVxdWlyZSgnbW9ycGhkb20nKSAvLyBlZmZpY2llbnRseSBkaWZmcyArIG1vcnBocyB0d28gRE9NIGVsZW1lbnRzXG52YXIgZGVmYXVsdEV2ZW50cyA9IHJlcXVpcmUoJy4vdXBkYXRlLWV2ZW50cy5qcycpIC8vIGRlZmF1bHQgZXZlbnRzIHRvIGJlIGNvcGllZCB3aGVuIGRvbSBlbGVtZW50cyB1cGRhdGVcblxubW9kdWxlLmV4cG9ydHMgPSBiZWxcblxuLy8gVE9ETyBtb3ZlIHRoaXMgKyBkZWZhdWx0RXZlbnRzIHRvIGEgbmV3IG1vZHVsZSBvbmNlIHdlIHJlY2VpdmUgbW9yZSBmZWVkYmFja1xubW9kdWxlLmV4cG9ydHMudXBkYXRlID0gZnVuY3Rpb24gKGZyb21Ob2RlLCB0b05vZGUsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge31cbiAgaWYgKG9wdHMuZXZlbnRzICE9PSBmYWxzZSkge1xuICAgIGlmICghb3B0cy5vbkJlZm9yZU1vcnBoRWwpIG9wdHMub25CZWZvcmVNb3JwaEVsID0gY29waWVyXG4gIH1cblxuICByZXR1cm4gbW9ycGhkb20oZnJvbU5vZGUsIHRvTm9kZSwgb3B0cylcblxuICAvLyBtb3JwaGRvbSBvbmx5IGNvcGllcyBhdHRyaWJ1dGVzLiB3ZSBkZWNpZGVkIHdlIGFsc28gd2FudGVkIHRvIGNvcHkgZXZlbnRzXG4gIC8vIHRoYXQgY2FuIGJlIHNldCB2aWEgYXR0cmlidXRlc1xuICBmdW5jdGlvbiBjb3BpZXIgKGYsIHQpIHtcbiAgICAvLyBjb3B5IGV2ZW50czpcbiAgICB2YXIgZXZlbnRzID0gb3B0cy5ldmVudHMgfHwgZGVmYXVsdEV2ZW50c1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZXYgPSBldmVudHNbaV1cbiAgICAgIGlmICh0W2V2XSkgeyAvLyBpZiBuZXcgZWxlbWVudCBoYXMgYSB3aGl0ZWxpc3RlZCBhdHRyaWJ1dGVcbiAgICAgICAgZltldl0gPSB0W2V2XSAvLyB1cGRhdGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgfSBlbHNlIGlmIChmW2V2XSkgeyAvLyBpZiBleGlzdGluZyBlbGVtZW50IGhhcyBpdCBhbmQgbmV3IG9uZSBkb2VzbnRcbiAgICAgICAgZltldl0gPSB1bmRlZmluZWQgLy8gcmVtb3ZlIGl0IGZyb20gZXhpc3RpbmcgZWxlbWVudFxuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb3B5IHZhbHVlcyBmb3IgZm9ybSBlbGVtZW50c1xuICAgIGlmICgoZi5ub2RlTmFtZSA9PT0gJ0lOUFVUJyAmJiBmLnR5cGUgIT09ICdmaWxlJykgfHwgZi5ub2RlTmFtZSA9PT0gJ1RFWFRBUkVBJyB8fCBmLm5vZGVOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgaWYgKHQuZ2V0QXR0cmlidXRlKCd2YWx1ZScpID09PSBudWxsKSB0LnZhbHVlID0gZi52YWx1ZVxuICAgIH1cbiAgfVxufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50JylcbnZhciBoeXBlcnggPSByZXF1aXJlKCdoeXBlcngnKVxudmFyIG9ubG9hZCA9IHJlcXVpcmUoJ29uLWxvYWQnKVxuXG52YXIgU1ZHTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnXG52YXIgQk9PTF9QUk9QUyA9IHtcbiAgYXV0b2ZvY3VzOiAxLFxuICBjaGVja2VkOiAxLFxuICBkZWZhdWx0Y2hlY2tlZDogMSxcbiAgZGlzYWJsZWQ6IDEsXG4gIGZvcm1ub3ZhbGlkYXRlOiAxLFxuICBpbmRldGVybWluYXRlOiAxLFxuICByZWFkb25seTogMSxcbiAgcmVxdWlyZWQ6IDEsXG4gIHdpbGx2YWxpZGF0ZTogMVxufVxudmFyIFNWR19UQUdTID0gW1xuICAnc3ZnJyxcbiAgJ2FsdEdseXBoJywgJ2FsdEdseXBoRGVmJywgJ2FsdEdseXBoSXRlbScsICdhbmltYXRlJywgJ2FuaW1hdGVDb2xvcicsXG4gICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yLXByb2ZpbGUnLFxuICAnY3Vyc29yJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsXG4gICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLFxuICAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLFxuICAnZmVGdW5jRycsICdmZUZ1bmNSJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZScsICdmZU1lcmdlTm9kZScsXG4gICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsXG4gICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsICdmb250JywgJ2ZvbnQtZmFjZScsXG4gICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS1zcmMnLCAnZm9udC1mYWNlLXVyaScsXG4gICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsXG4gICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nLWdseXBoJywgJ21wYXRoJyxcbiAgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLFxuICAnc2V0JywgJ3N0b3AnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJywgJ3RyZWYnLFxuICAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dXG5cbmZ1bmN0aW9uIGJlbENyZWF0ZUVsZW1lbnQgKHRhZywgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIHZhciBlbFxuXG4gIC8vIElmIGFuIHN2ZyB0YWcsIGl0IG5lZWRzIGEgbmFtZXNwYWNlXG4gIGlmIChTVkdfVEFHUy5pbmRleE9mKHRhZykgIT09IC0xKSB7XG4gICAgcHJvcHMubmFtZXNwYWNlID0gU1ZHTlNcbiAgfVxuXG4gIC8vIElmIHdlIGFyZSB1c2luZyBhIG5hbWVzcGFjZVxuICB2YXIgbnMgPSBmYWxzZVxuICBpZiAocHJvcHMubmFtZXNwYWNlKSB7XG4gICAgbnMgPSBwcm9wcy5uYW1lc3BhY2VcbiAgICBkZWxldGUgcHJvcHMubmFtZXNwYWNlXG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgaWYgKG5zKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgfSBlbHNlIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKVxuICB9XG5cbiAgLy8gSWYgYWRkaW5nIG9ubG9hZCBldmVudHNcbiAgaWYgKHByb3BzLm9ubG9hZCB8fCBwcm9wcy5vbnVubG9hZCkge1xuICAgIHZhciBsb2FkID0gcHJvcHMub25sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgdmFyIHVubG9hZCA9IHByb3BzLm9udW5sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgb25sb2FkKGVsLCBmdW5jdGlvbiBiZWxfb25sb2FkICgpIHtcbiAgICAgIGxvYWQoZWwpXG4gICAgfSwgZnVuY3Rpb24gYmVsX29udW5sb2FkICgpIHtcbiAgICAgIHVubG9hZChlbClcbiAgICB9KVxuICAgIGRlbGV0ZSBwcm9wcy5vbmxvYWRcbiAgICBkZWxldGUgcHJvcHMub251bmxvYWRcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgcHJvcGVydGllc1xuICBmb3IgKHZhciBwIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICB2YXIga2V5ID0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB2YXIgdmFsID0gcHJvcHNbcF1cbiAgICAgIC8vIE5vcm1hbGl6ZSBjbGFzc05hbWVcbiAgICAgIGlmIChrZXkgPT09ICdjbGFzc25hbWUnKSB7XG4gICAgICAgIGtleSA9ICdjbGFzcydcbiAgICAgICAgcCA9ICdjbGFzcydcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBmb3IgYXR0cmlidXRlIGdldHMgdHJhbnNmb3JtZWQgdG8gaHRtbEZvciwgYnV0IHdlIGp1c3Qgc2V0IGFzIGZvclxuICAgICAgaWYgKHAgPT09ICdodG1sRm9yJykge1xuICAgICAgICBwID0gJ2ZvcidcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgaXMgYm9vbGVhbiwgc2V0IGl0c2VsZiB0byB0aGUga2V5XG4gICAgICBpZiAoQk9PTF9QUk9QU1trZXldKSB7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgdmFsID0ga2V5XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgcHJlZmVycyBiZWluZyBzZXQgZGlyZWN0bHkgdnMgc2V0QXR0cmlidXRlXG4gICAgICBpZiAoa2V5LnNsaWNlKDAsIDIpID09PSAnb24nKSB7XG4gICAgICAgIGVsW3BdID0gdmFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobnMpIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhudWxsLCBwLCB2YWwpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuc2V0QXR0cmlidXRlKHAsIHZhbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGVuZENoaWxkIChjaGlsZHMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRzKSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRzW2ldXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgICBhcHBlbmRDaGlsZChub2RlKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdudW1iZXInIHx8XG4gICAgICAgIHR5cGVvZiBub2RlID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIERhdGUgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICBub2RlID0gbm9kZS50b1N0cmluZygpXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVsLmxhc3RDaGlsZCAmJiBlbC5sYXN0Q2hpbGQubm9kZU5hbWUgPT09ICcjdGV4dCcpIHtcbiAgICAgICAgICBlbC5sYXN0Q2hpbGQubm9kZVZhbHVlICs9IG5vZGVcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKVxuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFwcGVuZENoaWxkKGNoaWxkcmVuKVxuXG4gIHJldHVybiBlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGh5cGVyeChiZWxDcmVhdGVFbGVtZW50KVxubW9kdWxlLmV4cG9ydHMuY3JlYXRlRWxlbWVudCA9IGJlbENyZWF0ZUVsZW1lbnRcbiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG4iLCJpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWw7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKXtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNlbGY7XG59IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge307XG59XG4iLCJ2YXIgYXR0clRvUHJvcCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eScpXG5cbnZhciBWQVIgPSAwLCBURVhUID0gMSwgT1BFTiA9IDIsIENMT1NFID0gMywgQVRUUiA9IDRcbnZhciBBVFRSX0tFWSA9IDUsIEFUVFJfS0VZX1cgPSA2XG52YXIgQVRUUl9WQUxVRV9XID0gNywgQVRUUl9WQUxVRSA9IDhcbnZhciBBVFRSX1ZBTFVFX1NRID0gOSwgQVRUUl9WQUxVRV9EUSA9IDEwXG52YXIgQVRUUl9FUSA9IDExLCBBVFRSX0JSRUFLID0gMTJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaCwgb3B0cykge1xuICBoID0gYXR0clRvUHJvcChoKVxuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICB2YXIgY29uY2F0ID0gb3B0cy5jb25jYXQgfHwgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gU3RyaW5nKGEpICsgU3RyaW5nKGIpXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKHN0cmluZ3MpIHtcbiAgICB2YXIgc3RhdGUgPSBURVhULCByZWcgPSAnJ1xuICAgIHZhciBhcmdsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgdmFyIHBhcnRzID0gW11cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPCBhcmdsZW4gLSAxKSB7XG4gICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaSsxXVxuICAgICAgICB2YXIgcCA9IHBhcnNlKHN0cmluZ3NbaV0pXG4gICAgICAgIHZhciB4c3RhdGUgPSBzdGF0ZVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfU1EpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFIpIHhzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgIHAucHVzaChbIFZBUiwgeHN0YXRlLCBhcmcgXSlcbiAgICAgICAgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcClcbiAgICAgIH0gZWxzZSBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwYXJzZShzdHJpbmdzW2ldKSlcbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IFtudWxsLHt9LFtdXVxuICAgIHZhciBzdGFjayA9IFtbdHJlZSwtMV1dXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGN1ciA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVxuICAgICAgdmFyIHAgPSBwYXJ0c1tpXSwgcyA9IHBbMF1cbiAgICAgIGlmIChzID09PSBPUEVOICYmIC9eXFwvLy50ZXN0KHBbMV0pKSB7XG4gICAgICAgIHZhciBpeCA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVsxXVxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMSkge1xuICAgICAgICAgIHN0YWNrLnBvcCgpXG4gICAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdWzJdW2l4XSA9IGgoXG4gICAgICAgICAgICBjdXJbMF0sIGN1clsxXSwgY3VyWzJdLmxlbmd0aCA/IGN1clsyXSA6IHVuZGVmaW5lZFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBPUEVOKSB7XG4gICAgICAgIHZhciBjID0gW3BbMV0se30sW11dXG4gICAgICAgIGN1clsyXS5wdXNoKGMpXG4gICAgICAgIHN0YWNrLnB1c2goW2MsY3VyWzJdLmxlbmd0aC0xXSlcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkgfHwgKHMgPT09IFZBUiAmJiBwWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgdmFyIGtleSA9ICcnXG4gICAgICAgIHZhciBjb3B5S2V5XG4gICAgICAgIGZvciAoOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsxXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVIgJiYgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcnRzW2ldWzJdID09PSAnb2JqZWN0JyAmJiAha2V5KSB7XG4gICAgICAgICAgICAgIGZvciAoY29weUtleSBpbiBwYXJ0c1tpXVsyXSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0c1tpXVsyXS5oYXNPd25Qcm9wZXJ0eShjb3B5S2V5KSAmJiAhY3VyWzFdW2NvcHlLZXldKSB7XG4gICAgICAgICAgICAgICAgICBjdXJbMV1bY29weUtleV0gPSBwYXJ0c1tpXVsyXVtjb3B5S2V5XVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAga2V5ID0gY29uY2F0KGtleSwgcGFydHNbaV1bMl0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX0VRKSBpKytcbiAgICAgICAgdmFyIGogPSBpXG4gICAgICAgIGZvciAoOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBpZiAoIWN1clsxXVtrZXldKSBjdXJbMV1ba2V5XSA9IHN0cmZuKHBhcnRzW2ldWzFdKVxuICAgICAgICAgICAgZWxzZSBjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMV0pXG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSXG4gICAgICAgICAgJiYgKHBhcnRzW2ldWzFdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMl0pXG4gICAgICAgICAgICBlbHNlIGN1clsxXVtrZXldID0gY29uY2F0KGN1clsxXVtrZXldLCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGtleS5sZW5ndGggJiYgIWN1clsxXVtrZXldICYmIGkgPT09IGpcbiAgICAgICAgICAgICYmIChwYXJ0c1tpXVswXSA9PT0gQ0xPU0UgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfQlJFQUspKSB7XG4gICAgICAgICAgICAgIC8vIGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2luZnJhc3RydWN0dXJlLmh0bWwjYm9vbGVhbi1hdHRyaWJ1dGVzXG4gICAgICAgICAgICAgIC8vIGVtcHR5IHN0cmluZyBpcyBmYWxzeSwgbm90IHdlbGwgYmVoYXZlZCB2YWx1ZSBpbiBicm93c2VyXG4gICAgICAgICAgICAgIGN1clsxXVtrZXldID0ga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIGN1clsxXVtwWzFdXSA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIGN1clsxXVtwWzJdXSA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQ0xPU0UpIHtcbiAgICAgICAgaWYgKHNlbGZDbG9zaW5nKGN1clswXSkgJiYgc3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFZBUiAmJiBwWzFdID09PSBURVhUKSB7XG4gICAgICAgIGlmIChwWzJdID09PSB1bmRlZmluZWQgfHwgcFsyXSA9PT0gbnVsbCkgcFsyXSA9ICcnXG4gICAgICAgIGVsc2UgaWYgKCFwWzJdKSBwWzJdID0gY29uY2F0KCcnLCBwWzJdKVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwWzJdWzBdKSkge1xuICAgICAgICAgIGN1clsyXS5wdXNoLmFwcGx5KGN1clsyXSwgcFsyXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdXJbMl0ucHVzaChwWzJdKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFRFWFQpIHtcbiAgICAgICAgY3VyWzJdLnB1c2gocFsxXSlcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9FUSB8fCBzID09PSBBVFRSX0JSRUFLKSB7XG4gICAgICAgIC8vIG5vLW9wXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3VuaGFuZGxlZDogJyArIHMpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRyZWVbMl0ubGVuZ3RoID4gMSAmJiAvXlxccyokLy50ZXN0KHRyZWVbMl1bMF0pKSB7XG4gICAgICB0cmVlWzJdLnNoaWZ0KClcbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAyXG4gICAgfHwgKHRyZWVbMl0ubGVuZ3RoID09PSAyICYmIC9cXFMvLnRlc3QodHJlZVsyXVsxXSkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdtdWx0aXBsZSByb290IGVsZW1lbnRzIG11c3QgYmUgd3JhcHBlZCBpbiBhbiBlbmNsb3NpbmcgdGFnJ1xuICAgICAgKVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdKSAmJiB0eXBlb2YgdHJlZVsyXVswXVswXSA9PT0gJ3N0cmluZydcbiAgICAmJiBBcnJheS5pc0FycmF5KHRyZWVbMl1bMF1bMl0pKSB7XG4gICAgICB0cmVlWzJdWzBdID0gaCh0cmVlWzJdWzBdWzBdLCB0cmVlWzJdWzBdWzFdLCB0cmVlWzJdWzBdWzJdKVxuICAgIH1cbiAgICByZXR1cm4gdHJlZVsyXVswXVxuXG4gICAgZnVuY3Rpb24gcGFyc2UgKHN0cikge1xuICAgICAgdmFyIHJlcyA9IFtdXG4gICAgICBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVykgc3RhdGUgPSBBVFRSXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYyA9IHN0ci5jaGFyQXQoaSlcbiAgICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIGMgPT09ICc8Jykge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbVEVYVCwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gT1BFTlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc+JyAmJiAhcXVvdChzdGF0ZSkpIHtcbiAgICAgICAgICBpZiAoc3RhdGUgPT09IE9QRU4pIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzLnB1c2goW0NMT1NFXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gVEVYVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBURVhUKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1tcXHctXS8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlfV1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSAmJiBjID09PSAnPScpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSxbQVRUUl9FUV0pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoKHN0YXRlID09PSBBVFRSX0tFWV9XIHx8IHN0YXRlID09PSBBVFRSKSAmJiBjID09PSAnPScpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9FUV0pXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1dcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmICEvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIGlmICgvW1xcdy1dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgICByZWcgKz0gY1xuICAgICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIH0gZWxzZSBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfRFFcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmIGMgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgICBpLS1cbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUVxuICAgICAgICB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtURVhULHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdHJmbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpIHJldHVybiB4XG4gICAgZWxzZSBpZiAoeCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcpIHJldHVybiB4XG4gICAgZWxzZSByZXR1cm4gY29uY2F0KCcnLCB4KVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1b3QgKHN0YXRlKSB7XG4gIHJldHVybiBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUVxufVxuXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuZnVuY3Rpb24gaGFzIChvYmosIGtleSkgeyByZXR1cm4gaGFzT3duLmNhbGwob2JqLCBrZXkpIH1cblxudmFyIGNsb3NlUkUgPSBSZWdFeHAoJ14oJyArIFtcbiAgJ2FyZWEnLCAnYmFzZScsICdiYXNlZm9udCcsICdiZ3NvdW5kJywgJ2JyJywgJ2NvbCcsICdjb21tYW5kJywgJ2VtYmVkJyxcbiAgJ2ZyYW1lJywgJ2hyJywgJ2ltZycsICdpbnB1dCcsICdpc2luZGV4JywgJ2tleWdlbicsICdsaW5rJywgJ21ldGEnLCAncGFyYW0nLFxuICAnc291cmNlJywgJ3RyYWNrJywgJ3dicicsXG4gIC8vIFNWRyBUQUdTXG4gICdhbmltYXRlJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2N1cnNvcicsICdkZXNjJywgJ2VsbGlwc2UnLFxuICAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JywgJ2ZlQ29tcG9uZW50VHJhbnNmZXInLCAnZmVDb21wb3NpdGUnLFxuICAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLFxuICAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLFxuICAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLFxuICAnZmVUdXJidWxlbmNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXVyaScsXG4gICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JlY3QnLCAnc2V0JywgJ3N0b3AnLCAndHJlZicsICd1c2UnLCAndmlldycsXG4gICd2a2Vybidcbl0uam9pbignfCcpICsgJykoPzpbXFwuI11bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspKiQnKVxuZnVuY3Rpb24gc2VsZkNsb3NpbmcgKHRhZykgeyByZXR1cm4gY2xvc2VSRS50ZXN0KHRhZykgfVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhdHRyaWJ1dGVUb1Byb3BlcnR5XG5cbnZhciB0cmFuc2Zvcm0gPSB7XG4gICdjbGFzcyc6ICdjbGFzc05hbWUnLFxuICAnZm9yJzogJ2h0bWxGb3InLFxuICAnaHR0cC1lcXVpdic6ICdodHRwRXF1aXYnXG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZVRvUHJvcGVydHkgKGgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YWdOYW1lLCBhdHRycywgY2hpbGRyZW4pIHtcbiAgICBmb3IgKHZhciBhdHRyIGluIGF0dHJzKSB7XG4gICAgICBpZiAoYXR0ciBpbiB0cmFuc2Zvcm0pIHtcbiAgICAgICAgYXR0cnNbdHJhbnNmb3JtW2F0dHJdXSA9IGF0dHJzW2F0dHJdXG4gICAgICAgIGRlbGV0ZSBhdHRyc1thdHRyXVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaCh0YWdOYW1lLCBhdHRycywgY2hpbGRyZW4pXG4gIH1cbn1cbiIsIi8qIGdsb2JhbCBNdXRhdGlvbk9ic2VydmVyICovXG52YXIgZG9jdW1lbnQgPSByZXF1aXJlKCdnbG9iYWwvZG9jdW1lbnQnKVxudmFyIHdpbmRvdyA9IHJlcXVpcmUoJ2dsb2JhbC93aW5kb3cnKVxudmFyIHdhdGNoID0gT2JqZWN0LmNyZWF0ZShudWxsKVxudmFyIEtFWV9JRCA9ICdvbmxvYWRpZCcgKyAobmV3IERhdGUoKSAlIDllNikudG9TdHJpbmcoMzYpXG52YXIgS0VZX0FUVFIgPSAnZGF0YS0nICsgS0VZX0lEXG52YXIgSU5ERVggPSAwXG5cbmlmICh3aW5kb3cgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xuICAgIGlmIChPYmplY3Qua2V5cyh3YXRjaCkubGVuZ3RoIDwgMSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtdXRhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtdXRhdGlvbnNbaV0uYXR0cmlidXRlTmFtZSA9PT0gS0VZX0FUVFIpIHtcbiAgICAgICAgZWFjaEF0dHIobXV0YXRpb25zW2ldLCB0dXJub24sIHR1cm5vZmYpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBlYWNoTXV0YXRpb24obXV0YXRpb25zW2ldLnJlbW92ZWROb2RlcywgdHVybm9mZilcbiAgICAgIGVhY2hNdXRhdGlvbihtdXRhdGlvbnNbaV0uYWRkZWROb2RlcywgdHVybm9uKVxuICAgIH1cbiAgfSlcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWUsXG4gICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVPbGRWYWx1ZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVGaWx0ZXI6IFtLRVlfQVRUUl1cbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBvbmxvYWQgKGVsLCBvbiwgb2ZmKSB7XG4gIG9uID0gb24gfHwgZnVuY3Rpb24gKCkge31cbiAgb2ZmID0gb2ZmIHx8IGZ1bmN0aW9uICgpIHt9XG4gIGVsLnNldEF0dHJpYnV0ZShLRVlfQVRUUiwgJ28nICsgSU5ERVgpXG4gIHdhdGNoWydvJyArIElOREVYXSA9IFtvbiwgb2ZmLCAwLCBvbmxvYWQuY2FsbGVyXVxuICBJTkRFWCArPSAxXG4gIHJldHVybiBlbFxufVxuXG5mdW5jdGlvbiB0dXJub24gKGluZGV4LCBlbCkge1xuICBpZiAod2F0Y2hbaW5kZXhdWzBdICYmIHdhdGNoW2luZGV4XVsyXSA9PT0gMCkge1xuICAgIHdhdGNoW2luZGV4XVswXShlbClcbiAgICB3YXRjaFtpbmRleF1bMl0gPSAxXG4gIH1cbn1cblxuZnVuY3Rpb24gdHVybm9mZiAoaW5kZXgsIGVsKSB7XG4gIGlmICh3YXRjaFtpbmRleF1bMV0gJiYgd2F0Y2hbaW5kZXhdWzJdID09PSAxKSB7XG4gICAgd2F0Y2hbaW5kZXhdWzFdKGVsKVxuICAgIHdhdGNoW2luZGV4XVsyXSA9IDBcbiAgfVxufVxuXG5mdW5jdGlvbiBlYWNoQXR0ciAobXV0YXRpb24sIG9uLCBvZmYpIHtcbiAgaWYgKCF3YXRjaFttdXRhdGlvbi5vbGRWYWx1ZV0pIHtcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgbmV3VmFsdWUgPSBtdXRhdGlvbi50YXJnZXQuZ2V0QXR0cmlidXRlKEtFWV9BVFRSKVxuICBpZiAoc2FtZU9yaWdpbihtdXRhdGlvbi5vbGRWYWx1ZSwgbmV3VmFsdWUpKSB7XG4gICAgd2F0Y2hbbmV3VmFsdWVdID0gd2F0Y2hbbXV0YXRpb24ub2xkVmFsdWVdXG4gICAgcmV0dXJuXG4gIH1cbiAgT2JqZWN0LmtleXMod2F0Y2gpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICBpZiAobXV0YXRpb24ub2xkVmFsdWUgPT09IGspIHtcbiAgICAgIG9mZihrLCBtdXRhdGlvbi50YXJnZXQpXG4gICAgfVxuICAgIGlmIChuZXdWYWx1ZSA9PT0gaykge1xuICAgICAgb24oaywgbXV0YXRpb24udGFyZ2V0KVxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gc2FtZU9yaWdpbiAob2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gIHJldHVybiB3YXRjaFtvbGRWYWx1ZV1bM10gPT09IHdhdGNoW25ld1ZhbHVlXVszXVxufVxuXG5mdW5jdGlvbiBlYWNoTXV0YXRpb24gKG5vZGVzLCBmbikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHdhdGNoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG5vZGVzW2ldICYmIG5vZGVzW2ldLmdldEF0dHJpYnV0ZSAmJiBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpKSB7XG4gICAgICB2YXIgb25sb2FkaWQgPSBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpXG4gICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgaWYgKG9ubG9hZGlkID09PSBrKSB7XG4gICAgICAgICAgZm4oaywgbm9kZXNbaV0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmIChub2Rlc1tpXS5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVhY2hNdXRhdGlvbihub2Rlc1tpXS5jaGlsZE5vZGVzLCBmbilcbiAgICB9XG4gIH1cbn1cbiIsIi8vIENyZWF0ZSBhIHJhbmdlIG9iamVjdCBmb3IgZWZmaWNlbnRseSByZW5kZXJpbmcgc3RyaW5ncyB0byBlbGVtZW50cy5cbnZhciByYW5nZTtcblxudmFyIHRlc3RFbCA9ICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSA/XG4gICAgZG9jdW1lbnQuYm9keSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSA6XG4gICAge307XG5cbnZhciBYSFRNTCA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcbnZhciBFTEVNRU5UX05PREUgPSAxO1xudmFyIFRFWFRfTk9ERSA9IDM7XG52YXIgQ09NTUVOVF9OT0RFID0gODtcblxuLy8gRml4ZXMgPGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2lzc3Vlcy8zMj5cbi8vIChJRTcrIHN1cHBvcnQpIDw9SUU3IGRvZXMgbm90IHN1cHBvcnQgZWwuaGFzQXR0cmlidXRlKG5hbWUpXG52YXIgaGFzQXR0cmlidXRlTlM7XG5cbmlmICh0ZXN0RWwuaGFzQXR0cmlidXRlTlMpIHtcbiAgICBoYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG4gICAgfTtcbn0gZWxzZSBpZiAodGVzdEVsLmhhc0F0dHJpYnV0ZSkge1xuICAgIGhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKG5hbWUpO1xuICAgIH07XG59IGVsc2Uge1xuICAgIGhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gISFlbC5nZXRBdHRyaWJ1dGVOb2RlKG5hbWUpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGVtcHR5KG8pIHtcbiAgICBmb3IgKHZhciBrIGluIG8pIHtcbiAgICAgICAgaWYgKG8uaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdG9FbGVtZW50KHN0cikge1xuICAgIGlmICghcmFuZ2UgJiYgZG9jdW1lbnQuY3JlYXRlUmFuZ2UpIHtcbiAgICAgICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByYW5nZS5zZWxlY3ROb2RlKGRvY3VtZW50LmJvZHkpO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudDtcbiAgICBpZiAocmFuZ2UgJiYgcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KSB7XG4gICAgICAgIGZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib2R5Jyk7XG4gICAgICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIGZyYWdtZW50LmNoaWxkTm9kZXNbMF07XG59XG5cbnZhciBzcGVjaWFsRWxIYW5kbGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIGRvZXNuJ3QgdGhpbmsgdGhhdCBcInNlbGVjdGVkXCIgaXMgYW5cbiAgICAgKiBhdHRyaWJ1dGUgd2hlbiByZWFkaW5nIG92ZXIgdGhlIGF0dHJpYnV0ZXMgdXNpbmcgc2VsZWN0RWwuYXR0cmlidXRlc1xuICAgICAqL1xuICAgIE9QVElPTjogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIGZyb21FbC5zZWxlY3RlZCA9IHRvRWwuc2VsZWN0ZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0c1xuICAgICAqIHRoZSBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZVxuICAgICAqIFwidmFsdWVcIiBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZVxuICAgICAqIGluaXRpYWwgdmFsdWUuICBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuICAgICAqL1xuICAgIElOUFVUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgZnJvbUVsLmNoZWNrZWQgPSB0b0VsLmNoZWNrZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuY2hlY2tlZCkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZSgnY2hlY2tlZCcsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21FbC5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IHRvRWwudmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICd2YWx1ZScpKSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnJvbUVsLmRpc2FibGVkID0gdG9FbC5kaXNhYmxlZDtcbiAgICAgICAgaWYgKGZyb21FbC5kaXNhYmxlZCkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIFRFWFRBUkVBOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gdG9FbC52YWx1ZTtcbiAgICAgICAgaWYgKGZyb21FbC52YWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZyb21FbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBmcm9tRWwuZmlyc3RDaGlsZC5ub2RlVmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0d28gbm9kZSdzIG5hbWVzIGFuZCBuYW1lc3BhY2UgVVJJcyBhcmUgdGhlIHNhbWUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBhXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGJcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjb21wYXJlTm9kZU5hbWVzID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLm5vZGVOYW1lID09PSBiLm5vZGVOYW1lICYmXG4gICAgICAgICAgIGEubmFtZXNwYWNlVVJJID09PSBiLm5hbWVzcGFjZVVSSTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVsZW1lbnQsIG9wdGlvbmFsbHkgd2l0aCBhIGtub3duIG5hbWVzcGFjZSBVUkkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIGVsZW1lbnQgbmFtZSwgZS5nLiAnZGl2JyBvciAnc3ZnJ1xuICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lc3BhY2VVUkldIHRoZSBlbGVtZW50J3MgbmFtZXNwYWNlIFVSSSwgaS5lLiB0aGUgdmFsdWUgb2ZcbiAqIGl0cyBgeG1sbnNgIGF0dHJpYnV0ZSBvciBpdHMgaW5mZXJyZWQgbmFtZXNwYWNlLlxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lLCBuYW1lc3BhY2VVUkkpIHtcbiAgICByZXR1cm4gIW5hbWVzcGFjZVVSSSB8fCBuYW1lc3BhY2VVUkkgPT09IFhIVE1MID9cbiAgICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKSA6XG4gICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIG5hbWUpO1xufVxuXG4vKipcbiAqIExvb3Agb3ZlciBhbGwgb2YgdGhlIGF0dHJpYnV0ZXMgb24gdGhlIHRhcmdldCBub2RlIGFuZCBtYWtlIHN1cmUgdGhlIG9yaWdpbmFsXG4gKiBET00gbm9kZSBoYXMgdGhlIHNhbWUgYXR0cmlidXRlcy4gSWYgYW4gYXR0cmlidXRlIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBub2RlXG4gKiBpcyBub3Qgb24gdGhlIG5ldyBub2RlIHRoZW4gcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIG5vZGUuXG4gKlxuICogQHBhcmFtICB7RWxlbWVudH0gZnJvbU5vZGVcbiAqIEBwYXJhbSAge0VsZW1lbnR9IHRvTm9kZVxuICovXG5mdW5jdGlvbiBtb3JwaEF0dHJzKGZyb21Ob2RlLCB0b05vZGUpIHtcbiAgICB2YXIgYXR0cnMgPSB0b05vZGUuYXR0cmlidXRlcztcbiAgICB2YXIgaTtcbiAgICB2YXIgYXR0cjtcbiAgICB2YXIgYXR0ck5hbWU7XG4gICAgdmFyIGF0dHJOYW1lc3BhY2VVUkk7XG4gICAgdmFyIGF0dHJWYWx1ZTtcbiAgICB2YXIgZnJvbVZhbHVlO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgYXR0clZhbHVlID0gYXR0ci52YWx1ZTtcbiAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuXG4gICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGFueSBleHRyYSBhdHRyaWJ1dGVzIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBET00gZWxlbWVudCB0aGF0XG4gICAgLy8gd2VyZW4ndCBmb3VuZCBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gICAgYXR0cnMgPSBmcm9tTm9kZS5hdHRyaWJ1dGVzO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBpZiAoYXR0ci5zcGVjaWZpZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcblxuICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lc3BhY2VVUkkgPyBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lIDogYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlTm9kZShhdHRyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBDb3BpZXMgdGhlIGNoaWxkcmVuIG9mIG9uZSBET00gZWxlbWVudCB0byBhbm90aGVyIERPTSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG1vdmVDaGlsZHJlbihmcm9tRWwsIHRvRWwpIHtcbiAgICB2YXIgY3VyQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgdmFyIG5leHRDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICB0b0VsLmFwcGVuZENoaWxkKGN1ckNoaWxkKTtcbiAgICAgICAgY3VyQ2hpbGQgPSBuZXh0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiB0b0VsO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0R2V0Tm9kZUtleShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuaWQ7XG59XG5cbmZ1bmN0aW9uIG1vcnBoZG9tKGZyb21Ob2RlLCB0b05vZGUsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdG9Ob2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoZnJvbU5vZGUubm9kZU5hbWUgPT09ICcjZG9jdW1lbnQnIHx8IGZyb21Ob2RlLm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgICAgICAgIHZhciB0b05vZGVIdG1sID0gdG9Ob2RlO1xuICAgICAgICAgICAgdG9Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaHRtbCcpO1xuICAgICAgICAgICAgdG9Ob2RlLmlubmVySFRNTCA9IHRvTm9kZUh0bWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b05vZGUgPSB0b0VsZW1lbnQodG9Ob2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFhYWCBvcHRpbWl6YXRpb246IGlmIHRoZSBub2RlcyBhcmUgZXF1YWwsIGRvbid0IG1vcnBoIHRoZW1cbiAgICAvKlxuICAgIGlmIChmcm9tTm9kZS5pc0VxdWFsTm9kZSh0b05vZGUpKSB7XG4gICAgICByZXR1cm4gZnJvbU5vZGU7XG4gICAgfVxuICAgICovXG5cbiAgICB2YXIgc2F2ZWRFbHMgPSB7fTsgLy8gVXNlZCB0byBzYXZlIG9mZiBET00gZWxlbWVudHMgd2l0aCBJRHNcbiAgICB2YXIgdW5tYXRjaGVkRWxzID0ge307XG4gICAgdmFyIGdldE5vZGVLZXkgPSBvcHRpb25zLmdldE5vZGVLZXkgfHwgZGVmYXVsdEdldE5vZGVLZXk7XG4gICAgdmFyIG9uQmVmb3JlTm9kZUFkZGVkID0gb3B0aW9ucy5vbkJlZm9yZU5vZGVBZGRlZCB8fCBub29wO1xuICAgIHZhciBvbk5vZGVBZGRlZCA9IG9wdGlvbnMub25Ob2RlQWRkZWQgfHwgbm9vcDtcbiAgICB2YXIgb25CZWZvcmVFbFVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxVcGRhdGVkIHx8IG9wdGlvbnMub25CZWZvcmVNb3JwaEVsIHx8IG5vb3A7XG4gICAgdmFyIG9uRWxVcGRhdGVkID0gb3B0aW9ucy5vbkVsVXBkYXRlZCB8fCBub29wO1xuICAgIHZhciBvbkJlZm9yZU5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgIHZhciBvbk5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgIHZhciBvbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkID0gb3B0aW9ucy5vbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkIHx8IG9wdGlvbnMub25CZWZvcmVNb3JwaEVsQ2hpbGRyZW4gfHwgbm9vcDtcbiAgICB2YXIgY2hpbGRyZW5Pbmx5ID0gb3B0aW9ucy5jaGlsZHJlbk9ubHkgPT09IHRydWU7XG4gICAgdmFyIG1vdmVkRWxzID0gW107XG5cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlSGVscGVyKG5vZGUsIG5lc3RlZEluU2F2ZWRFbCkge1xuICAgICAgICB2YXIgaWQgPSBnZXROb2RlS2V5KG5vZGUpO1xuICAgICAgICAvLyBJZiB0aGUgbm9kZSBoYXMgYW4gSUQgdGhlbiBzYXZlIGl0IG9mZiBzaW5jZSB3ZSB3aWxsIHdhbnRcbiAgICAgICAgLy8gdG8gcmV1c2UgaXQgaW4gY2FzZSB0aGUgdGFyZ2V0IERPTSB0cmVlIGhhcyBhIERPTSBlbGVtZW50XG4gICAgICAgIC8vIHdpdGggdGhlIHNhbWUgSURcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICBzYXZlZEVsc1tpZF0gPSBub2RlO1xuICAgICAgICB9IGVsc2UgaWYgKCFuZXN0ZWRJblNhdmVkRWwpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGFyZSBub3QgbmVzdGVkIGluIGEgc2F2ZWQgZWxlbWVudCB0aGVuIHdlIGtub3cgdGhhdCB0aGlzIG5vZGUgaGFzIGJlZW5cbiAgICAgICAgICAgIC8vIGNvbXBsZXRlbHkgZGlzY2FyZGVkIGFuZCB3aWxsIG5vdCBleGlzdCBpbiB0aGUgZmluYWwgRE9NLlxuICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gbm9kZS5maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlTm9kZUhlbHBlcihjdXJDaGlsZCwgbmVzdGVkSW5TYXZlZEVsIHx8IGlkKTtcbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcblxuXG4gICAgICAgICAgICAgICAgaWYgKCFnZXROb2RlS2V5KGN1ckNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBvbmx5IHdhbnQgdG8gaGFuZGxlIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSBhbiBJRCB0byBhdm9pZCBkb3VibGVcbiAgICAgICAgICAgICAgICAgICAgLy8gd2Fsa2luZyB0aGUgc2FtZSBzYXZlZCBlbGVtZW50LlxuXG4gICAgICAgICAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChjdXJDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV2FsayByZWN1cnNpdmVseVxuICAgICAgICAgICAgICAgICAgICB3YWxrRGlzY2FyZGVkQ2hpbGROb2RlcyhjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSwgcGFyZW50Tm9kZSwgYWxyZWFkeVZpc2l0ZWQpIHtcbiAgICAgICAgaWYgKG9uQmVmb3JlTm9kZURpc2NhcmRlZChub2RlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgIGlmIChhbHJlYWR5VmlzaXRlZCkge1xuICAgICAgICAgICAgaWYgKCFnZXROb2RlS2V5KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKG5vZGUpO1xuICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlTm9kZUhlbHBlcihub2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vcnBoRWwoZnJvbUVsLCB0b0VsLCBhbHJlYWR5VmlzaXRlZCwgY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgIHZhciB0b0VsS2V5ID0gZ2V0Tm9kZUtleSh0b0VsKTtcbiAgICAgICAgaWYgKHRvRWxLZXkpIHtcbiAgICAgICAgICAgIC8vIElmIGFuIGVsZW1lbnQgd2l0aCBhbiBJRCBpcyBiZWluZyBtb3JwaGVkIHRoZW4gaXQgaXMgd2lsbCBiZSBpbiB0aGUgZmluYWxcbiAgICAgICAgICAgIC8vIERPTSBzbyBjbGVhciBpdCBvdXQgb2YgdGhlIHNhdmVkIGVsZW1lbnRzIGNvbGxlY3Rpb25cbiAgICAgICAgICAgIGRlbGV0ZSBzYXZlZEVsc1t0b0VsS2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICBpZiAob25CZWZvcmVFbFVwZGF0ZWQoZnJvbUVsLCB0b0VsKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vcnBoQXR0cnMoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgICAgIG9uRWxVcGRhdGVkKGZyb21FbCk7XG5cbiAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkKGZyb21FbCwgdG9FbCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZyb21FbC5ub2RlTmFtZSAhPT0gJ1RFWFRBUkVBJykge1xuICAgICAgICAgICAgdmFyIGN1clRvTm9kZUNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHZhciBjdXJUb05vZGVJZDtcblxuICAgICAgICAgICAgdmFyIGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgIHZhciB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgdmFyIHNhdmVkRWw7XG4gICAgICAgICAgICB2YXIgdW5tYXRjaGVkRWw7XG5cbiAgICAgICAgICAgIG91dGVyOiB3aGlsZSAoY3VyVG9Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB0b05leHRTaWJsaW5nID0gY3VyVG9Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgY3VyVG9Ob2RlSWQgPSBnZXROb2RlS2V5KGN1clRvTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJGcm9tTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZUlkID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5leHRTaWJsaW5nID0gY3VyRnJvbU5vZGVDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFscmVhZHlWaXNpdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVJZCAmJiAodW5tYXRjaGVkRWwgPSB1bm1hdGNoZWRFbHNbY3VyRnJvbU5vZGVJZF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5tYXRjaGVkRWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY3VyRnJvbU5vZGVDaGlsZCwgdW5tYXRjaGVkRWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgdW5tYXRjaGVkRWwsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlVHlwZSA9IGN1ckZyb21Ob2RlQ2hpbGQubm9kZVR5cGU7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gY3VyVG9Ob2RlQ2hpbGQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0NvbXBhdGlibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgRWxlbWVudCBub2Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVOb2RlTmFtZXMoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIGhhdmUgY29tcGF0aWJsZSBET00gZWxlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlSWQgfHwgY3VyVG9Ob2RlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGVpdGhlciBET00gZWxlbWVudCBoYXMgYW4gSUQgdGhlbiB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIHRob3NlIGRpZmZlcmVudGx5IHNpbmNlIHdlIHdhbnQgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoIHVwIGJ5IElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlSWQgPT09IGN1ckZyb21Ob2RlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgY29tcGF0aWJsZSBET00gZWxlbWVudHMgc28gdHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IFwiZnJvbVwiIG5vZGUgdG8gbWF0Y2ggdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFyZ2V0IERPTSBub2RlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKGN1ckZyb21Ob2RlQ2hpbGQsIGN1clRvTm9kZUNoaWxkLCBhbHJlYWR5VmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgVGV4dCBvciBDb21tZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBURVhUX05PREUgfHwgY3VyRnJvbU5vZGVUeXBlID09IENPTU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGx5IHVwZGF0ZSBub2RlVmFsdWUgb24gdGhlIG9yaWdpbmFsIG5vZGUgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHRleHQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkLm5vZGVWYWx1ZSA9IGN1clRvTm9kZUNoaWxkLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gY29tcGF0aWJsZSBtYXRjaCBzbyByZW1vdmUgdGhlIG9sZCBub2RlIGZyb20gdGhlIERPTVxuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgY29udGludWUgdHJ5aW5nIHRvIGZpbmQgYSBtYXRjaCBpbiB0aGUgb3JpZ2luYWwgRE9NXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCBhbHJlYWR5VmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoc2F2ZWRFbCA9IHNhdmVkRWxzW2N1clRvTm9kZUlkXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoc2F2ZWRFbCwgY3VyVG9Ob2RlQ2hpbGQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBhcHBlbmQgdGhlIHNhdmVkIGVsZW1lbnQgaW5zdGVhZFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSBzYXZlZEVsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgRE9NIGVsZW1lbnQgaW4gdGhlIHRhcmdldCB0cmVlIGhhcyBhbiBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYnV0IHdlIGRpZCBub3QgZmluZCBhIG1hdGNoIGluIGFueSBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmRpbmcgc2libGluZ3MuIFdlIGp1c3QgcHV0IHRoZSB0YXJnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgaW4gdGhlIG9sZCBET00gdHJlZSBidXQgaWYgd2UgbGF0ZXIgZmluZCBhblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgb2xkIERPTSB0cmVlIHRoYXQgaGFzIGEgbWF0Y2hpbmcgSURcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZW4gd2Ugd2lsbCByZXBsYWNlIHRoZSB0YXJnZXQgZWxlbWVudCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZGluZyBvbGQgZWxlbWVudCBhbmQgbW9ycGggdGhlIG9sZCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB1bm1hdGNoZWRFbHNbY3VyVG9Ob2RlSWRdID0gY3VyVG9Ob2RlQ2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnb3QgdGhpcyBmYXIgdGhlbiB3ZSBkaWQgbm90IGZpbmQgYSBjYW5kaWRhdGUgbWF0Y2ggZm9yXG4gICAgICAgICAgICAgICAgLy8gb3VyIFwidG8gbm9kZVwiIGFuZCB3ZSBleGhhdXN0ZWQgYWxsIG9mIHRoZSBjaGlsZHJlbiBcImZyb21cIlxuICAgICAgICAgICAgICAgIC8vIG5vZGVzLiBUaGVyZWZvcmUsIHdlIHdpbGwganVzdCBhcHBlbmQgdGhlIGN1cnJlbnQgXCJ0byBub2RlXCJcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgZW5kXG4gICAgICAgICAgICAgICAgaWYgKG9uQmVmb3JlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmFwcGVuZENoaWxkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgb25Ob2RlQWRkZWQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVDaGlsZC5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFICYmXG4gICAgICAgICAgICAgICAgICAgIChjdXJUb05vZGVJZCB8fCBjdXJUb05vZGVDaGlsZC5maXJzdENoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgZWxlbWVudCB0aGF0IHdhcyBqdXN0IGFkZGVkIHRvIHRoZSBvcmlnaW5hbCBET00gbWF5XG4gICAgICAgICAgICAgICAgICAgIC8vIGhhdmUgc29tZSBuZXN0ZWQgZWxlbWVudHMgd2l0aCBhIGtleS9JRCB0aGF0IG5lZWRzIHRvIGJlXG4gICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoZWQgdXAgd2l0aCBvdGhlciBlbGVtZW50cy4gV2UnbGwgYWRkIHRoZSBlbGVtZW50IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGEgbGlzdCBzbyB0aGF0IHdlIGNhbiBsYXRlciBwcm9jZXNzIHRoZSBuZXN0ZWQgZWxlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgYXJlIGFueSB1bm1hdGNoZWQga2V5ZWQgZWxlbWVudHMgdGhhdCB3ZXJlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRpc2NhcmRlZFxuICAgICAgICAgICAgICAgICAgICBtb3ZlZEVscy5wdXNoKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UgaGF2ZSBwcm9jZXNzZWQgYWxsIG9mIHRoZSBcInRvIG5vZGVzXCIuIElmIGN1ckZyb21Ob2RlQ2hpbGQgaXNcbiAgICAgICAgICAgIC8vIG5vbi1udWxsIHRoZW4gd2Ugc3RpbGwgaGF2ZSBzb21lIGZyb20gbm9kZXMgbGVmdCBvdmVyIHRoYXQgbmVlZFxuICAgICAgICAgICAgLy8gdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgd2hpbGUgKGN1ckZyb21Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCBhbHJlYWR5VmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcGVjaWFsRWxIYW5kbGVyID0gc3BlY2lhbEVsSGFuZGxlcnNbZnJvbUVsLm5vZGVOYW1lXTtcbiAgICAgICAgaWYgKHNwZWNpYWxFbEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHNwZWNpYWxFbEhhbmRsZXIoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgfVxuICAgIH0gLy8gRU5EOiBtb3JwaEVsKC4uLilcblxuICAgIHZhciBtb3JwaGVkTm9kZSA9IGZyb21Ob2RlO1xuICAgIHZhciBtb3JwaGVkTm9kZVR5cGUgPSBtb3JwaGVkTm9kZS5ub2RlVHlwZTtcbiAgICB2YXIgdG9Ob2RlVHlwZSA9IHRvTm9kZS5ub2RlVHlwZTtcblxuICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgIC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBhcmUgZ2l2ZW4gdHdvIERPTSBub2RlcyB0aGF0IGFyZSBub3RcbiAgICAgICAgLy8gY29tcGF0aWJsZSAoZS5nLiA8ZGl2PiAtLT4gPHNwYW4+IG9yIDxkaXY+IC0tPiBURVhUKVxuICAgICAgICBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgIGlmICh0b05vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBhcmVOb2RlTmFtZXMoZnJvbU5vZGUsIHRvTm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICAgICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSBtb3ZlQ2hpbGRyZW4oZnJvbU5vZGUsIGNyZWF0ZUVsZW1lbnROUyh0b05vZGUubm9kZU5hbWUsIHRvTm9kZS5uYW1lc3BhY2VVUkkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEdvaW5nIGZyb20gYW4gZWxlbWVudCBub2RlIHRvIGEgdGV4dCBub2RlXG4gICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSB0b05vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBURVhUX05PREUgfHwgbW9ycGhlZE5vZGVUeXBlID09PSBDT01NRU5UX05PREUpIHsgLy8gVGV4dCBvciBjb21tZW50IG5vZGVcbiAgICAgICAgICAgIGlmICh0b05vZGVUeXBlID09PSBtb3JwaGVkTm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZS5ub2RlVmFsdWUgPSB0b05vZGUubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBtb3JwaGVkTm9kZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVGV4dCBub2RlIHRvIHNvbWV0aGluZyBlbHNlXG4gICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSB0b05vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobW9ycGhlZE5vZGUgPT09IHRvTm9kZSkge1xuICAgICAgICAvLyBUaGUgXCJ0byBub2RlXCIgd2FzIG5vdCBjb21wYXRpYmxlIHdpdGggdGhlIFwiZnJvbSBub2RlXCIgc28gd2UgaGFkIHRvXG4gICAgICAgIC8vIHRvc3Mgb3V0IHRoZSBcImZyb20gbm9kZVwiIGFuZCB1c2UgdGhlIFwidG8gbm9kZVwiXG4gICAgICAgIG9uTm9kZURpc2NhcmRlZChmcm9tTm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbW9ycGhFbChtb3JwaGVkTm9kZSwgdG9Ob2RlLCBmYWxzZSwgY2hpbGRyZW5Pbmx5KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hhdCB3ZSB3aWxsIGRvIGhlcmUgaXMgd2FsayB0aGUgdHJlZSBmb3IgdGhlIERPTSBlbGVtZW50IHRoYXQgd2FzXG4gICAgICAgICAqIG1vdmVkIGZyb20gdGhlIHRhcmdldCBET00gdHJlZSB0byB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgYW5kIHdlIHdpbGxcbiAgICAgICAgICogbG9vayBmb3Iga2V5ZWQgZWxlbWVudHMgdGhhdCBjb3VsZCBiZSBtYXRjaGVkIHRvIGtleWVkIGVsZW1lbnRzIHRoYXRcbiAgICAgICAgICogd2VyZSBlYXJsaWVyIGRpc2NhcmRlZC4gIElmIHdlIGZpbmQgYSBtYXRjaCB0aGVuIHdlIHdpbGwgbW92ZSB0aGVcbiAgICAgICAgICogc2F2ZWQgZWxlbWVudCBpbnRvIHRoZSBmaW5hbCBET00gdHJlZS5cbiAgICAgICAgICovXG4gICAgICAgIHZhciBoYW5kbGVNb3ZlZEVsID0gZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBjdXJDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzYXZlZEVsID0gc2F2ZWRFbHNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVkRWwgJiYgY29tcGFyZU5vZGVOYW1lcyhjdXJDaGlsZCwgc2F2ZWRFbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHNhdmVkRWwsIGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRydWU6IGFscmVhZHkgdmlzaXRlZCB0aGUgc2F2ZWQgZWwgdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChzYXZlZEVsLCBjdXJDaGlsZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IG5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVtcHR5KHNhdmVkRWxzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1ckNoaWxkLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlTW92ZWRFbChjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBuZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUaGUgbG9vcCBiZWxvdyBpcyB1c2VkIHRvIHBvc3NpYmx5IG1hdGNoIHVwIGFueSBkaXNjYXJkZWRcbiAgICAgICAgLy8gZWxlbWVudHMgaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlIHdpdGggZWxlbWVuZXRzIGZyb20gdGhlXG4gICAgICAgIC8vIHRhcmdldCB0cmVlIHRoYXQgd2VyZSBtb3ZlZCBvdmVyIHdpdGhvdXQgdmlzaXRpbmcgdGhlaXJcbiAgICAgICAgLy8gY2hpbGRyZW5cbiAgICAgICAgaWYgKCFlbXB0eShzYXZlZEVscykpIHtcbiAgICAgICAgICAgIGhhbmRsZU1vdmVkRWxzTG9vcDpcbiAgICAgICAgICAgIHdoaWxlIChtb3ZlZEVscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbW92ZWRFbHNUZW1wID0gbW92ZWRFbHM7XG4gICAgICAgICAgICAgICAgbW92ZWRFbHMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bW92ZWRFbHNUZW1wLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVNb3ZlZEVsKG1vdmVkRWxzVGVtcFtpXSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGVyZSBhcmUgbm8gbW9yZSB1bm1hdGNoZWQgZWxlbWVudHMgc28gY29tcGxldGVseSBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBsb29wXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhayBoYW5kbGVNb3ZlZEVsc0xvb3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaXJlIHRoZSBcIm9uTm9kZURpc2NhcmRlZFwiIGV2ZW50IGZvciBhbnkgc2F2ZWQgZWxlbWVudHNcbiAgICAgICAgLy8gdGhhdCBuZXZlciBmb3VuZCBhIG5ldyBob21lIGluIHRoZSBtb3JwaGVkIERPTVxuICAgICAgICBmb3IgKHZhciBzYXZlZEVsSWQgaW4gc2F2ZWRFbHMpIHtcbiAgICAgICAgICAgIGlmIChzYXZlZEVscy5oYXNPd25Qcm9wZXJ0eShzYXZlZEVsSWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNhdmVkRWwgPSBzYXZlZEVsc1tzYXZlZEVsSWRdO1xuICAgICAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChzYXZlZEVsKTtcbiAgICAgICAgICAgICAgICB3YWxrRGlzY2FyZGVkQ2hpbGROb2RlcyhzYXZlZEVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICghY2hpbGRyZW5Pbmx5ICYmIG1vcnBoZWROb2RlICE9PSBmcm9tTm9kZSAmJiBmcm9tTm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgIC8vIElmIHdlIGhhZCB0byBzd2FwIG91dCB0aGUgZnJvbSBub2RlIHdpdGggYSBuZXcgbm9kZSBiZWNhdXNlIHRoZSBvbGRcbiAgICAgICAgLy8gbm9kZSB3YXMgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgdGFyZ2V0IG5vZGUgdGhlbiB3ZSBuZWVkIHRvXG4gICAgICAgIC8vIHJlcGxhY2UgdGhlIG9sZCBET00gbm9kZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuIFRoaXMgaXMgb25seVxuICAgICAgICAvLyBwb3NzaWJsZSBpZiB0aGUgb3JpZ2luYWwgRE9NIG5vZGUgd2FzIHBhcnQgb2YgYSBET00gdHJlZSB3aGljaFxuICAgICAgICAvLyB3ZSBrbm93IGlzIHRoZSBjYXNlIGlmIGl0IGhhcyBhIHBhcmVudCBub2RlLlxuICAgICAgICBmcm9tTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChtb3JwaGVkTm9kZSwgZnJvbU5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBtb3JwaGVkTm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtb3JwaGRvbTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuICAvLyBhdHRyaWJ1dGUgZXZlbnRzIChjYW4gYmUgc2V0IHdpdGggYXR0cmlidXRlcylcbiAgJ29uY2xpY2snLFxuICAnb25kYmxjbGljaycsXG4gICdvbm1vdXNlZG93bicsXG4gICdvbm1vdXNldXAnLFxuICAnb25tb3VzZW92ZXInLFxuICAnb25tb3VzZW1vdmUnLFxuICAnb25tb3VzZW91dCcsXG4gICdvbmRyYWdzdGFydCcsXG4gICdvbmRyYWcnLFxuICAnb25kcmFnZW50ZXInLFxuICAnb25kcmFnbGVhdmUnLFxuICAnb25kcmFnb3ZlcicsXG4gICdvbmRyb3AnLFxuICAnb25kcmFnZW5kJyxcbiAgJ29ua2V5ZG93bicsXG4gICdvbmtleXByZXNzJyxcbiAgJ29ua2V5dXAnLFxuICAnb251bmxvYWQnLFxuICAnb25hYm9ydCcsXG4gICdvbmVycm9yJyxcbiAgJ29ucmVzaXplJyxcbiAgJ29uc2Nyb2xsJyxcbiAgJ29uc2VsZWN0JyxcbiAgJ29uY2hhbmdlJyxcbiAgJ29uc3VibWl0JyxcbiAgJ29ucmVzZXQnLFxuICAnb25mb2N1cycsXG4gICdvbmJsdXInLFxuICAnb25pbnB1dCcsXG4gIC8vIG90aGVyIGNvbW1vbiBldmVudHNcbiAgJ29uY29udGV4dG1lbnUnLFxuICAnb25mb2N1c2luJyxcbiAgJ29uZm9jdXNvdXQnXG5dXG4iLCJ2YXIgcGFnZSA9IHJlcXVpcmUoJ3BhZ2UnKTtcclxudmFyIGVtcHR5ID0gcmVxdWlyZSgnZW1wdHktZWxlbWVudCcpO1xyXG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlLmpzJyk7XHJcbnZhciB0aXRsZSA9IHJlcXVpcmUoJ3RpdGxlJyk7XHJcblxyXG5wYWdlKCcvJywgZnVuY3Rpb24oY3R4LCBuZXh0KSB7XHJcblx0dGl0bGUoJ1RpbWJhZ3JhbScpO1xyXG5cdHZhciBtYWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGFpbmVyJyk7XHJcblx0dmFyIHBpY3R1cmVzID0gW1xyXG5cdHtcclxuXHRcdHVzZXI6IHtcclxuXHRcdFx0dXNlcm5hbWU6ICdsbGljY2llbicsXHJcblx0XHRcdGF2YXRhcjogJ2h0dHBzOi8vc2NvbnRlbnQtbWlhMS0xLnh4LmZiY2RuLm5ldC92L3QxLjAtOS8xMjA0Njc5MF8xMDE1Mzc5MDAwMTQyNDE1NV8yMzAxNzE1MjIwNTk0NDMyNjMyX24uanBnP29oPTUxMWFjMGI0MzAzYWFlMjY2OTk1NzIwYTA2ZmM3MjgzJm9lPTU3RjZFRjM4J1xyXG5cdFx0fSxcclxuXHRcdGltYWdlVXJsOiAnaW1hZ2VzL29mZmljZS5qcGcnLFxyXG5cdFx0bGlrZXM6IDAsXHJcblx0XHRsaWtlZDogZmFsc2UsXHJcblx0XHRjcmVhdGVBdDogbmV3IERhdGUoKVxyXG5cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVzZXI6IHtcclxuXHRcdFx0dXNlcm5hbWU6ICdsbGljY2llbicsXHJcblx0XHRcdGF2YXRhcjogJ2h0dHBzOi8vc2NvbnRlbnQtbWlhMS0xLnh4LmZiY2RuLm5ldC92L3QxLjAtOS8xMjA0Njc5MF8xMDE1Mzc5MDAwMTQyNDE1NV8yMzAxNzE1MjIwNTk0NDMyNjMyX24uanBnP29oPTUxMWFjMGI0MzAzYWFlMjY2OTk1NzIwYTA2ZmM3MjgzJm9lPTU3RjZFRjM4J1xyXG5cdFx0fSxcclxuXHRcdGltYWdlVXJsOiAnaW1hZ2VzL29mZmljZS5qcGcnLFxyXG5cdFx0bGlrZXM6IDEsXHJcblx0XHRsaWtlZDogZmFsc2UsXHJcblx0XHRjcmVhdGVBdDogbmV3IERhdGUoKS5zZXREYXRlKG5ldyBEYXRlKCkuZ2V0RGF0ZSgpIC0gMTApXHJcblxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXNlcjoge1xyXG5cdFx0XHR1c2VybmFtZTogJ2xsaWNjaWVuJyxcclxuXHRcdFx0YXZhdGFyOiAnaHR0cHM6Ly9zY29udGVudC1taWExLTEueHguZmJjZG4ubmV0L3YvdDEuMC05LzEyMDQ2NzkwXzEwMTUzNzkwMDAxNDI0MTU1XzIzMDE3MTUyMjA1OTQ0MzI2MzJfbi5qcGc/b2g9NTExYWMwYjQzMDNhYWUyNjY5OTU3MjBhMDZmYzcyODMmb2U9NTdGNkVGMzgnXHJcblx0XHR9LFxyXG5cdFx0aW1hZ2VVcmw6ICdpbWFnZXMvb2ZmaWNlLmpwZycsXHJcblx0XHRsaWtlczogMzEsXHJcblx0XHRsaWtlZDogdHJ1ZSxcclxuXHRcdGNyZWF0ZUF0OiBuZXcgRGF0ZSgpLnNldERhdGUobmV3IERhdGUoKS5nZXREYXRlKCkgLSAzMClcclxuXHJcblx0fSxcdFx0XHJcblx0XTtcclxuXHRlbXB0eShtYWluKS5hcHBlbmRDaGlsZCh0ZW1wbGF0ZShwaWN0dXJlcykpO1xyXG59KSIsInZhciB5byA9IHJlcXVpcmUoJ3lvLXlvJyk7XHJcbnZhciBsYXlvdXQgPSByZXF1aXJlKCcuLi9sYXlvdXQvaW5kZXguanMnKTtcclxudmFyIHBpY3R1cmUgPSByZXF1aXJlKCcuLi9waWN0dXJlLWNhcmQvaW5kZXguanMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBpY3R1cmVzKSB7XHJcblx0dmFyIGhvbWVwYWdlID0geW9gXHQ8ZGl2IGNsYXNzPVwiY29udGFpbmVyIHRpbWVsaW5lXCI+XHJcblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJyb3dcIj5cclxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY29sIHMxMiBtMTAgb2Zmc2V0LW0xIGw2IG9mZnNldC1sM1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0JHtwaWN0dXJlcy5tYXAoZnVuY3Rpb24gKHBpYykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gcGljdHVyZShwaWMpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSl9XHJcblx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0PC9kaXY+YDtcclxuXHJcblx0cmV0dXJuIGxheW91dChob21lcGFnZSk7XHJcbn1cclxuXHJcblxyXG4gIiwidmFyIHBhZ2UgPSByZXF1aXJlKCdwYWdlJyk7XHJcblxyXG5cclxucmVxdWlyZSgnLi9ob21lcGFnZScpO1xyXG5yZXF1aXJlKCcuL3NpZ251cCcpO1xyXG5yZXF1aXJlKCcuL3NpZ25pbicpO1xyXG5cclxucGFnZSgpOyIsInZhciB5byA9IHJlcXVpcmUoJ3lvLXlvJyk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBsYW5kaW5nKGJveCkge1xyXG5cdHJldHVybiB5b2A8ZGl2IGNsYXNzPVwiY29udGFpbmVyIGxhbmRpbmdcIj5cclxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJyb3dcIj5cclxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNvbCBzMTAgcHVzaC1zMVwiPlxyXG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJyb3dcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjb2wgbTUgaGlkZS1vbi1zbWFsbC1vbmx5XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxpbWcgc3JjPVwiaW1hZ2VzL2lwaG9uZS5wbmdcIiBhbHQ9XCJJcGhvbmVcIiBjbGFzcz1cImlwaG9uZVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHQke2JveH1cclxuXHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHQ8L2Rpdj5gXHJcbn1cclxuIiwidmFyIHlvID0gcmVxdWlyZSgneW8teW8nKTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGxheW91dChjb250ZW50KSB7XHJcblx0cmV0dXJuIHlvYFx0PGRpdj5cclxuXHRcdFx0XHRcdDxuYXYgY2xhc3M9XCJoZWFkZXJcIj5cclxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cIm5hdi13cmFwcGVyXCI+XHJcblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNvbnRlaW5lclwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInJvd1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY29sIHMxMiBtNiBvZmZzZXQtbTFcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8YSBocmVmPVwiL1wiIGNsYXNzPVwiYnJhbmQtbG9nbyB0aW1iYWdyYW1cIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxpbWcgY2xhc3M9XCJsb2dvXCIgc3JjPVwiaW1hZ2VzL2Zhdmljb24tOTZ4OTYucG5nXCIgLz5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuPlRpbWJhZ3JhbTwvc3Bhbj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8L2E+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY29sIHMyIG02IHB1c2gtczEwIHB1c2gtbTEwXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cImJ0biBidG4tbGFyZ2UgYnRuLWZsYXQgZHJvcGRvd24tYnV0dG9uXCIgZGF0YS1hY3RpdmF0ZXM9XCJkcm9wLXVzZXJcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiZmEgZmEtdXNlclwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvaT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8L2E+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PHVsIGlkPVwiZHJvcC11c2VyXCIgY2xhc3M9XCJkcm9wZG93bi1jb250ZW50XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ8bGk+PGEgaHJlZj1cIiNcIj5TYWxpcjwvYT48L2xpPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDwvdWw+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0PC9uYXY+XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxyXG5cdFx0XHRcdFx0XHQke2NvbnRlbnR9XHJcblx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHQ8L2Rpdj5gO1xyXG59XHJcbiIsInZhciB5byA9IHJlcXVpcmUoJ3lvLXlvJyk7XHJcbnZhciB0cmFuc2xhdGUgPSByZXF1aXJlKCcuLi90cmFuc2xhdGUvaW5kZXguanMnKTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBpY3R1ZUNhcmQocGljKSB7XHJcblx0XHJcblx0dmFyIGVsO1xyXG5cclxuXHRmdW5jdGlvbiByZW5kZXIocGljdHVyZSkge1xyXG5cdFx0XHJcblx0XHRyZXR1cm4geW8gYDxkaXYgY2xhc3M9XCJjYXJkICR7cGljdHVyZS5saWtlZCA/ICdsaWtlZCcgOiAnJ31cIj5cclxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjYXJkLWltYWdlXCI+XHJcblx0XHRcdFx0XHQgIDxpbWcgY2xhc3M9XCJhY3RpdmF0b3JcIiBzcmM9XCIke3BpY3R1cmUuaW1hZ2VVcmx9XCI+XHJcblx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJjYXJkLWNvbnRlbnRcIj5cclxuXHRcdFx0XHRcdCAgPGEgIGhyZWY9XCIvdXNlci8ke3BpY3R1cmUudXNlci51c2VybmFtZX1cIiBjbGFzcz1cImNhcmQtdGl0bGVcIj5cclxuXHRcdFx0XHRcdFx0PGltZyBzcmM9XCIke3BpY3R1cmUudXNlci5hdmF0YXJ9XCIgY2xhc3M9XCJhdmF0YXJcIiAvPlxyXG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInVzZXJuYW1lXCI+JHtwaWN0dXJlLnVzZXIudXNlcm5hbWV9PC9zcGFuPlxyXG5cdFx0XHRcdFx0ICA8L2E+XHJcblx0XHRcdFx0XHQgIDxzbWFsbCBjbGFzcz1cInJpZ2h0IHRpbWVcIj4ke3RyYW5zbGF0ZS5kYXRlLmZvcm1hdChwaWN0dXJlLmNyZWF0ZUF0KX08L3NtYWxsPlxyXG5cdFx0XHRcdFx0ICA8cD5cclxuXHRcdFx0XHRcdCAgXHQ8YSBjbGFzcz1cImxlZnRcIiBocmVmPVwiI1wiIG9uY2xpY2s9JHtsaWtlLmJpbmQobnVsbCwgdHJ1ZSl9PjxpIGNsYXNzPVwiZmEgZmEtaGVhcnQtb1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvaT48L2E+XHJcblx0XHRcdFx0XHQgIFx0PGEgY2xhc3M9XCJsZWZ0XCIgaHJlZj1cIiNcIiBvbmNsaWNrPSR7bGlrZS5iaW5kKG51bGwsIGZhbHNlKX0+PGkgY2xhc3M9XCJmYSBmYS1oZWFydFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvaT48L2E+XHJcblx0XHRcdFx0XHQgIFx0PHNwYW4gY2xhc3M9XCJsZWZ0IGxpa2VzXCI+JHt0cmFuc2xhdGUubWVzc2FnZSgnbGlrZXMnLCB7bGlrZXM6IHBpY3R1cmUubGlrZXN9KX08L3NwYW4+XHJcblx0XHRcdFx0XHQgIDwvcD5cclxuXHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdCAgPC9kaXY+YDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGxpa2UobGlrZWQpIHtcclxuXHRcdHBpYy5saWtlZCA9bGlrZWQ7XHJcblx0XHRwaWMubGlrZXMgKz0gbGlrZWQgPyAxIDogLTE7XHJcblx0XHR2YXIgbmV3RWwgPSByZW5kZXIocGljKTtcclxuXHRcdHlvLnVwZGF0ZShlbCwgbmV3RWwpO1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHR9XHJcblxyXG5cdGVsID0gcmVuZGVyKHBpYyk7XHJcblx0cmV0dXJuIGVsO1xyXG59XHJcbiIsInZhciBwYWdlID0gcmVxdWlyZSgncGFnZScpO1xyXG52YXIgZW1wdHkgPSByZXF1aXJlKCdlbXB0eS1lbGVtZW50Jyk7XHJcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUuanMnKTtcclxudmFyIHRpdGxlID0gcmVxdWlyZSgndGl0bGUnKTtcclxuXHJcbnBhZ2UoJy9zaWduaW4nLCBmdW5jdGlvbihjdHgsIG5leHQpIHtcclxuXHR0aXRsZSgnVGltYmFncmFtIC0gU2lnbmluJyk7XHJcblx0dmFyIG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250YWluZXInKTtcclxuXHRlbXB0eShtYWluKS5hcHBlbmRDaGlsZCh0ZW1wbGF0ZSk7XHJcbn0pIiwidmFyIHlvID0gcmVxdWlyZSgneW8teW8nKTtcclxudmFyIGxhbmRpbmcgPSByZXF1aXJlKCcuLi9sYW5kaW5nL2luZGV4LmpzJyk7XHJcblxyXG4gdmFyIHNpZ25pbkZvcm0gPSB5b2A8ZGl2IGNsYXNzPVwiY29sIHMxMiBtN1wiPlxyXG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicm93XCI+XHJcblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInNpZ251cC1ib3hcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxoMSBjbGFzcz1cInRpbWJhZ3JhbVwiPlRpbWJhZ3JhbTwvaDE+XHJcblx0XHRcdFx0XHRcdFx0XHQ8Zm9ybSBjbGFzcz1cInNpZ251cC1mb3JtXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJzZWN0aW9uXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIlwiIGNsYXNzPVwiYnRuIGJ0bi1mYiBoaWRlLW9uLXNtYWxsLW9ubHlcIj5JbmljaWEgc2VzacOzbiBjb24gRmFjZWJvb2s8L2E+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIlwiIGNsYXNzPVwiYnRuIGJ0bi1mYiBoaWRlLW9uLW1lZC1hbmQtdXBcIj5JbmljaWEgc2VzacOzbjwvYT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJzZWN0aW9uXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cInVzZXJuYW1lXCIgaWQ9XCJcIiBwbGFjZWhvbGRlcj1cIk5vbWJyZSBkZSB1c3VhcmlvXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGlucHV0IHR5cGU9XCJwYXNzd29yZFwiIG5hbWU9XCJwYXNzd29yZFwiIGlkPVwiXCIgcGxhY2Vob2xkZXI9XCJDb250cmFzZcOxYVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XCJidG4gd2F2ZXMtZWZmZWN0IHdhdmVzIGxpZ2h0IGJ0bi1zaWdudXBcIiB0eXBlPVwic3VibWl0XCI+SW5pY2lhIHNlc2nDs248L2J1dHRvbj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L2Zvcm0+XHJcblx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicm93XCI+XHJcblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImxvZ2luLWJveFwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0wr9ObyB0aWVuZXMgdW5hIGN1ZW50YT8gPGEgaHJlZj1cIi9zaWdudXBcIj5SZWfDrXN0cmF0ZTwvYT5cclxuXHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHQ8L2Rpdj5gO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBsYW5kaW5nKHNpZ25pbkZvcm0pOyIsInZhciBwYWdlID0gcmVxdWlyZSgncGFnZScpO1xyXG52YXIgZW1wdHkgPSByZXF1aXJlKCdlbXB0eS1lbGVtZW50Jyk7XHJcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUuanMnKTtcclxudmFyIHRpdGxlID0gcmVxdWlyZSgndGl0bGUnKTtcclxuXHJcbnBhZ2UoJy9zaWdudXAnLCBmdW5jdGlvbihjdHgsIG5leHQpIHtcclxuXHR0aXRsZSgnVGltYmFncmFtIC0gU2lnbnVwJyk7XHJcblx0dmFyIG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250YWluZXInKTtcclxuXHRlbXB0eShtYWluKS5hcHBlbmRDaGlsZCh0ZW1wbGF0ZSk7XHJcbn0pXHJcbiIsInZhciB5byA9IHJlcXVpcmUoJ3lvLXlvJyk7XHJcbnZhciBsYW5kaW5nID0gcmVxdWlyZSgnLi4vbGFuZGluZycpO1xyXG5cclxuIHZhciBzaWdudXBGb3JtID0geW9gPGRpdiBjbGFzcz1cImNvbCBzMTIgbTdcIj5cclxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInJvd1wiPlxyXG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJzaWdudXAtYm94XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8aDEgY2xhc3M9XCJ0aW1iYWdyYW1cIj5UaW1iYWdyYW08L2gxPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGZvcm0gY2xhc3M9XCJzaWdudXAtZm9ybVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8aDI+UmVnaXRyYXRlIHBhcmEgdmVyIGZvdG9zIGRlIHR1cyBBbWlnQHMgQ2FzaW5lcm9zPC9oMj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInNlY3Rpb25cIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8YSBocmVmPVwiXCIgY2xhc3M9XCJidG4gYnRuLWZiIGhpZGUtb24tc21hbGwtb25seVwiPkluaWNpYSBzZXNpw7NuIGNvbiBGYWNlYm9vazwvYT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8YSBocmVmPVwiXCIgY2xhc3M9XCJidG4gYnRuLWZiIGhpZGUtb24tbWVkLWFuZC11cFwiPjxpIGNsYXNzPVwiZmEgZmEtZmFjZWJvb2stb2ZmaWNpYWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L2k+SW5pY2lhIHNlc2nDs248L2E+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwic2VjdGlvblwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwiZW1haWxcIiBuYW1lPVwiZW1haWxcIiBpZD1cIlwiIHBsYWNlaG9sZGVyPVwiQ29ycmVvIGVsZWN0csOzbmljb1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXCIgaWQ9XCJcIiBwbGFjZWhvbGRlcj1cIk5vbWJyZSBjb21wbGV0b1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ1c2VybmFtZVwiIGlkPVwiXCIgcGxhY2Vob2xkZXI9XCJOb21icmUgZGUgdXN1YXJpb1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwicGFzc3dvcmRcIiBuYW1lPVwicGFzc3dvcmRcIiBpZD1cIlwiIHBsYWNlaG9sZGVyPVwiQ29udHJhc2XDsWFcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVwiYnRuIHdhdmVzLWVmZmVjdCB3YXZlcyBsaWdodCBidG4tc2lnbnVwXCIgdHlwZT1cInN1Ym1pdFwiPlJlZ2lzdHJhdGU8L2J1dHRvbj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L2Zvcm0+XHJcblx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicm93XCI+XHJcblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImxvZ2luLWJveFwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0wr9UaWVuZXMgdW5hIGN1ZW50YT8gPGEgaHJlZj1cIi9zaWduaW5cIj5FbnRyYXI8L2E+XHJcblx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0PC9kaXY+YDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbGFuZGluZyhzaWdudXBGb3JtKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRsaWtlczogJ3tsaWtlcywgcGx1cmFsLCAnICtcclxuICAgICAgICAgICAgJz0wIHtubyBsaWtlcy59JyArXHJcbiAgICAgICAgICAgICc9MSB7IyBsaWtlLn0nICtcclxuICAgICAgICAgICAgJ290aGVyIHsjIGxpa2VzLn19J1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0bGlrZXM6ICd7bGlrZXMsIG51bWJlcn0gbWUgZ3VzdGEuJ1xyXG59IiwiLy8gU29wb3J0ZSBwYXJhIHNhZmFyaVxyXG5pZiAoIXdpbmRvdy5JbnRsKSB7XHJcbiAgd2luZG93LkludGwgPSByZXF1aXJlKCdpbnRsJyk7XHJcbiAgcmVxdWlyZSgnaW50bC9sb2NhbGUtZGF0YS9qc29ucC9lbi1VUy5qcycpO1xyXG4gIHJlcXVpcmUoJ2ludGwvbG9jYWxlLWRhdGEvanNvbnAvZXMuanMnKTtcclxufVxyXG5cclxudmFyIEludGxSZWxhdGl2ZUZvcm1hdCA9IHdpbmRvdy5JbnRsUmVsYXRpdmVGb3JtYXQgPSByZXF1aXJlKCdpbnRsLXJlbGF0aXZlZm9ybWF0Jyk7XHJcbnZhciBJbnRsTWVzc2FnZUZvcm1hdCA9IHJlcXVpcmUoJ2ludGwtbWVzc2FnZWZvcm1hdCcpO1xyXG5cclxucmVxdWlyZSgnaW50bC1yZWxhdGl2ZWZvcm1hdC9kaXN0L2xvY2FsZS1kYXRhL2VuLmpzJyk7XHJcbnJlcXVpcmUoJ2ludGwtcmVsYXRpdmVmb3JtYXQvZGlzdC9sb2NhbGUtZGF0YS9lcy5qcycpO1xyXG5cclxudmFyIGVzID0gcmVxdWlyZSgnLi9lcy5qcycpO1xyXG52YXIgZW4gPSByZXF1aXJlKCcuL2VuLVVTLmpzJyk7XHJcblxyXG52YXIgTUVTU0FHRVMgPSB7fTtcclxuTUVTU0FHRVMuZXMgPSBlcztcclxuTUVTU0FHRVNbJ2VuLVVTJ10gPSBlbjtcclxuXHJcbnZhciBsb2NhbGUgPSAnZXMnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgbWVzc2FnZTogZnVuY3Rpb24gKHRleHQsIG9wdHMpIHtcclxuICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgICB2YXIgbXNnID0gbmV3IEludGxNZXNzYWdlRm9ybWF0KE1FU1NBR0VTW2xvY2FsZV1bdGV4dF0sIGxvY2FsZSwgbnVsbCk7XHJcbiAgICAgICAgcmV0dXJuIG1zZy5mb3JtYXQob3B0cylcclxuICAgICAgfSxcclxuICBkYXRlOiBuZXcgSW50bFJlbGF0aXZlRm9ybWF0KGxvY2FsZSlcclxufVxyXG4iXX0=
