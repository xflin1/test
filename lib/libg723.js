// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          (((codePoint - 0x10000) / 0x400)|0) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;


function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;


function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 5242880;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

//console.log('OK');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
//console.log(TOTAL_MEMORY);

HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 41200;
  /* global initializers */ __ATINIT__.push();
  

/* memory initializer */ allocate([24,0,20,0,4,0,1,0,0,0,0,0,0,0,0,0,0,0,128,62,0,0,0,63,0,0,64,63,0,0,128,63,0,0,128,63,0,0,0,63,0,0,128,62,0,0,0,0,10,215,163,61,106,107,164,61,15,41,166,61,237,14,169,61,126,28,173,61,47,80,178,61,231,167,184,61,154,34,192,61,169,189,200,61,239,117,210,61,203,72,221,61,148,50,233,61,157,47,246,61,218,29,2,62,84,169,9,62,225,183,17,62,157,70,26,62,114,83,35,62,245,218,44,62,69,218,54,62,60,78,65,62,248,51,76,62,139,135,87,62,74,69,99,62,14,106,111,62,166,241,123,62,18,108,132,62,204,12,139,62,199,216,145,62,12,206,152,62,96,234,159,62,69,43,167,62,197,142,174,62,98,18,182,62,225,179,189,62,164,112,197,62,78,70,205,62,131,50,213,62,131,50,221,62,19,68,229,62,149,100,237,62,71,145,245,62,206,199,253,62,197,2,3,63,221,35,7,63,2,70,11,63,195,103,15,63,223,135,19,63,26,165,23,63,18,190,27,63,137,209,31,63,47,222,35,63,197,226,39,63,253,221,43,63,167,206,47,63,99,179,51,63,21,139,55,63,126,84,59,63,111,14,63,63,187,183,66,63,34,79,70,63,170,211,73,63,36,68,77,63,115,159,80,63,138,228,83,63,111,18,87,63,19,40,90,63,141,36,93,63,209,6,96,63,20,206,98,63,108,121,101,63,238,7,104,63,226,120,106,63,125,203,108,63,9,255,110,63,203,18,113,63,28,6,115,63,86,216,116,63,1,137,118,63,135,23,120,63,81,131,121,63,29,204,122,63,82,241,123,63,191,242,124,63,238,207,125,63,173,136,126,63,201,28,127,63,0,140,127,63,65,214,127,63,89,251,127,63,89,251,127,63,65,214,127,63,0,140,127,63,201,28,127,63,173,136,126,63,238,207,125,63,191,242,124,63,82,241,123,63,29,204,122,63,81,131,121,63,135,23,120,63,1,137,118,63,102,216,116,63,28,6,115,63,203,18,113,63,9,255,110,63,125,203,108,63,226,120,106,63,238,7,104,63,108,121,101,63,20,206,98,63,209,6,96,63,141,36,93,63,19,40,90,63,111,18,87,63,138,228,83,63,115,159,80,63,36,68,77,63,170,211,73,63,34,79,70,63,187,183,66,63,111,14,63,63,126,84,59,63,21,139,55,63,99,179,51,63,167,206,47,63,253,221,43,63,197,226,39,63,64,222,35,63,137,209,31,63,18,190,27,63,26,165,23,63,223,135,19,63,195,103,15,63,2,70,11,63,221,35,7,63,197,2,3,63,206,199,253,62,71,145,245,62,149,100,237,62,19,68,229,62,165,50,221,62,131,50,213,62,78,70,205,62,164,112,197,62,225,179,189,62,98,18,182,62,197,142,174,62,69,43,167,62,96,234,159,62,12,206,152,62,199,216,145,62,204,12,139,62,18,108,132,62,166,241,123,62,14,106,111,62,141,69,99,62,139,135,87,62,248,51,76,62,60,78,65,62,69,218,54,62,245,218,44,62,114,83,35,62,157,70,26,62,225,183,17,62,84,169,9,62,218,29,2,62,157,47,246,61,148,50,233,61,203,72,221,61,239,117,210,61,169,189,200,61,154,34,192,61,231,167,184,61,47,80,178,61,126,28,173,61,237,14,169,61,15,41,166,61,106,107,164,61,10,215,163,61,127,219,127,63,47,110,127,63,115,184,126,63,212,186,125,63,41,118,124,63,146,235,122,63,76,28,121,63,234,9,119,63,49,182,116,63,7,35,114,63,0,0,128,63,1,252,127,63,3,236,127,63,6,212,127,63,251,175,127,63,2,132,127,63,248,79,127,63,2,16,127,63,252,195,126,63,248,111,126,63,5,20,126,63,4,172,125,63,4,60,125,63,5,192,124,63,8,60,124,63,252,171,123,63,1,20,123,63,8,116,122,63,0,200,121,63,249,19,121,63,4,84,120,63,0,140,119,63,253,187,118,63,252,223,117,63,252,251,116,63,254,11,116,63,1,20,115,63,5,20,114,63,251,7,113,63,2,244,111,63,249,215,110,63,3,180,109,63,253,131,108,63,249,75,107,63,7,8,106,63,5,192,104,63,5,108,103,63,6,16,102,63,8,172,100,63,251,59,99,63,0,196,97,63,6,72,96,63,253,191,94,63,6,44,93,63,255,147,91,63,249,243,89,63,6,72,88,63,3,148,86,63,1,220,84,63,1,24,83,63,1,76,81,63,3,124,79,63,6,160,77,63,249,187,75,63,255,207,73,63,5,224,71,63,252,227,69,63,4,228,67,63,254,215,65,63,8,200,63,63,3,176,61,63,0,144,59,63,253,103,57,63,251,59,55,63,251,3,53,63,252,199,50,63,253,131,48,63,0,60,46,63,3,236,43,63,8,148,41,63,252,55,39,63,2,212,36,63,249,103,34,63,1,248,31,63,250,127,29,63,4,4,27,63,254,127,24,63,249,247,21,63,6,104,19,63,2,212,16,63,0,56,14,63,254,155,11,63,254,243,8,63,253,75,6,63,254,155,3,63,255,231,0,63,3,96,252,62,9,224,246,62,16,88,241,62,247,199,235,62,1,48,230,62,12,144,224,62,247,231,218,62,4,56,213,62,242,119,207,62,2,184,201,62,242,239,195,62,4,32,190,62,245,71,184,62,11,96,178,62,254,127,172,62,243,143,166,62,11,152,160,62,2,160,154,62,249,159,148,62,242,151,142,62,12,144,136,62,6,128,130,62,3,208,120,62,249,159,108,62,242,95,96,62,237,15,84,62,232,191,71,62,227,111,59,62,224,15,47,62,33,176,34,62,33,64,22,62,32,208,9,62,64,192,250,61,190,191,225,61,5,192,200,61,252,191,175,61,5,160,150,61,247,63,123,61,9,0,73,61,0,192,22,61,238,255,200,60,36,0,73,60,0,0,0,0,36,0,73,188,238,255,200,188,0,192,22,189,9,0,73,189,247,63,123,189,5,160,150,189,252,191,175,189,5,192,200,189,190,191,225,189,64,192,250,189,32,208,9,190,33,64,22,190,33,176,34,190,224,15,47,190,227,111,59,190,232,191,71,190,237,15,84,190,242,95,96,190,249,159,108,190,3,208,120,190,6,128,130,190,12,144,136,190,242,151,142,190,249,159,148,190,2,160,154,190,11,152,160,190,243,143,166,190,254,127,172,190,11,96,178,190,245,71,184,190,4,32,190,190,242,239,195,190,2,184,201,190,242,119,207,190,4,56,213,190,247,231,218,190,12,144,224,190,1,48,230,190,247,199,235,190,16,88,241,190,9,224,246,190,3,96,252,190,255,231,0,191,254,155,3,191,253,75,6,191,254,243,8,191,254,155,11,191,0,56,14,191,2,212,16,191,6,104,19,191,249,247,21,191,254,127,24,191,4,4,27,191,250,127,29,191,1,248,31,191,249,103,34,191,2,212,36,191,252,55,39,191,8,148,41,191,3,236,43,191,0,60,46,191,253,131,48,191,252,199,50,191,251,3,53,191,251,59,55,191,253,103,57,191,0,144,59,191,3,176,61,191,8,200,63,191,254,215,65,191,4,228,67,191,252,227,69,191,5,224,71,191,255,207,73,191,249,187,75,191,6,160,77,191,3,124,79,191,1,76,81,191,1,24,83,191,1,220,84,191,3,148,86,191,6,72,88,191,249,243,89,191,255,147,91,191,6,44,93,191,253,191,94,191,6,72,96,191,0,196,97,191,251,59,99,191,8,172,100,191,6,16,102,191,5,108,103,191,5,192,104,191,7,8,106,191,249,75,107,191,253,131,108,191,3,180,109,191,249,215,110,191,2,244,111,191,251,7,113,191,5,20,114,191,1,20,115,191,254,11,116,191,252,251,116,191,252,223,117,191,253,187,118,191,0,140,119,191,4,84,120,191,249,19,121,191,0,200,121,191,8,116,122,191,1,20,123,191,252,171,123,191,8,60,124,191,5,192,124,191,4,60,125,191,4,172,125,191,5,20,126,191,248,111,126,191,252,195,126,191,2,16,127,191,248,79,127,191,2,132,127,191,251,175,127,191,6,212,127,191,3,236,127,191,1,252,127,191,0,0,128,191,1,252,127,191,3,236,127,191,6,212,127,191,251,175,127,191,2,132,127,191,248,79,127,191,2,16,127,191,252,195,126,191,248,111,126,191,5,20,126,191,4,172,125,191,4,60,125,191,5,192,124,191,8,60,124,191,252,171,123,191,1,20,123,191,8,116,122,191,0,200,121,191,249,19,121,191,4,84,120,191,0,140,119,191,253,187,118,191,252,223,117,191,252,251,116,191,254,11,116,191,1,20,115,191,5,20,114,191,251,7,113,191,2,244,111,191,249,215,110,191,3,180,109,191,253,131,108,191,249,75,107,191,7,8,106,191,5,192,104,191,5,108,103,191,6,16,102,191,8,172,100,191,251,59,99,191,0,196,97,191,6,72,96,191,253,191,94,191,6,44,93,191,255,147,91,191,249,243,89,191,6,72,88,191,3,148,86,191,1,220,84,191,1,24,83,191,1,76,81,191,3,124,79,191,6,160,77,191,249,187,75,191,255,207,73,191,5,224,71,191,252,227,69,191,4,228,67,191,254,215,65,191,8,200,63,191,3,176,61,191,0,144,59,191,253,103,57,191,251,59,55,191,251,3,53,191,252,199,50,191,253,131,48,191,0,60,46,191,3,236,43,191,8,148,41,191,252,55,39,191,2,212,36,191,249,103,34,191,1,248,31,191,250,127,29,191,4,4,27,191,254,127,24,191,249,247,21,191,6,104,19,191,2,212,16,191,0,56,14,191,254,155,11,191,254,243,8,191,253,75,6,191,254,155,3,191,255,231,0,191,3,96,252,190,9,224,246,190,16,88,241,190,247,199,235,190,1,48,230,190,12,144,224,190,247,231,218,190,4,56,213,190,242,119,207,190,2,184,201,190,242,239,195,190,4,32,190,190,245,71,184,190,11,96,178,190,254,127,172,190,243,143,166,190,11,152,160,190,2,160,154,190,249,159,148,190,242,151,142,190,12,144,136,190,6,128,130,190,3,208,120,190,249,159,108,190,242,95,96,190,237,15,84,190,232,191,71,190,227,111,59,190,224,15,47,190,33,176,34,190,33,64,22,190,32,208,9,190,64,192,250,189,190,191,225,189,5,192,200,189,252,191,175,189,5,160,150,189,247,63,123,189,9,0,73,189,0,192,22,189,238,255,200,188,36,0,73,188,0,0,0,0,36,0,73,60,238,255,200,60,0,192,22,61,9,0,73,61,247,63,123,61,5,160,150,61,252,191,175,61,5,192,200,61,190,191,225,61,64,192,250,61,32,208,9,62,33,64,22,62,33,176,34,62,224,15,47,62,227,111,59,62,232,191,71,62,237,15,84,62,242,95,96,62,249,159,108,62,3,208,120,62,6,128,130,62,12,144,136,62,242,151,142,62,249,159,148,62,2,160,154,62,11,152,160,62,243,143,166,62,254,127,172,62,11,96,178,62,245,71,184,62,4,32,190,62,242,239,195,62,2,184,201,62,242,119,207,62,4,56,213,62,247,231,218,62,12,144,224,62,1,48,230,62,247,199,235,62,16,88,241,62,9,224,246,62,3,96,252,62,255,231,0,63,254,155,3,63,253,75,6,63,254,243,8,63,254,155,11,63,0,56,14,63,2,212,16,63,6,104,19,63,249,247,21,63,254,127,24,63,4,4,27,63,250,127,29,63,1,248,31,63,249,103,34,63,2,212,36,63,252,55,39,63,8,148,41,63,3,236,43,63,0,60,46,63,253,131,48,63,252,199,50,63,251,3,53,63,251,59,55,63,253,103,57,63,0,144,59,63,3,176,61,63,8,200,63,63,254,215,65,63,4,228,67,63,252,227,69,63,5,224,71,63,255,207,73,63,249,187,75,63,6,160,77,63,3,124,79,63,1,76,81,63,1,24,83,63,1,220,84,63,3,148,86,63,6,72,88,63,249,243,89,63,255,147,91,63,6,44,93,63,253,191,94,63,6,72,96,63,0,196,97,63,251,59,99,63,8,172,100,63,6,16,102,63,5,108,103,63,5,192,104,63,7,8,106,63,249,75,107,63,253,131,108,63,3,180,109,63,249,215,110,63,2,244,111,63,251,7,113,63,5,20,114,63,1,20,115,63,254,11,116,63,252,251,116,63,252,223,117,63,253,187,118,63,0,140,119,63,4,84,120,63,249,19,121,63,0,200,121,63,8,116,122,63,1,20,123,63,252,171,123,63,8,60,124,63,5,192,124,63,4,60,125,63,4,172,125,63,5,20,126,63,248,111,126,63,252,195,126,63,2,16,127,63,248,79,127,63,2,132,127,63,251,175,127,63,6,212,127,63,3,236,127,63,1,252,127,63,0,0,0,0,0,0,0,0,0,0,0,0,21,0,7,192,52,128,43,193,0,0,1,193,251,63,135,192,230,63,78,193,26,192,44,193,5,192,180,192,217,95,123,193,20,80,138,193,251,63,235,192,251,63,12,193,26,192,114,193,0,0,195,192,253,31,15,193,13,96,153,193,0,0,221,192,39,160,35,193,39,160,43,193,3,96,3,193,217,95,62,193,26,192,92,193,3,96,7,193,26,192,74,193,26,192,143,193,251,63,194,192,243,31,44,193,236,47,134,193,5,192,233,192,217,95,55,193,236,175,172,193,246,127,200,192,13,224,37,193,7,240,216,193,5,192,233,192,13,224,116,193,7,240,249,193,0,0,240,191,248,255,49,191,42,0,222,63,251,63,165,192,246,127,0,192,0,0,160,191,246,127,248,192,235,255,104,192,10,128,81,192,0,0,188,191,0,0,164,191,21,0,11,192,21,0,43,192,0,0,128,192,10,128,79,192,5,192,151,192,10,128,127,192,251,63,199,192,0,0,0,62,34,0,24,62,0,0,179,192,21,0,59,64,246,127,84,64,0,0,243,192,235,255,44,192,235,255,244,63,235,255,12,192,246,127,4,192,235,255,124,64,246,127,188,192,0,0,155,192,21,0,147,191,217,95,116,65,10,128,185,192,0,0,215,192,20,80,162,65,42,0,150,191,0,0,48,192,0,0,169,65,246,127,24,64,0,0,220,64,230,63,116,65,8,0,118,63,5,192,182,64,13,224,172,65,0,0,46,192,251,63,191,64,7,240,207,65,246,127,154,64,235,255,220,63,243,159,203,65,214,255,177,191,17,0,188,190,246,215,3,66,246,127,68,64,0,0,35,65,243,31,240,65,246,127,174,64,26,192,84,65,253,7,22,66,17,0,252,62,0,0,146,192,253,159,25,65,21,0,215,191,0,0,183,192,0,0,85,65,0,0,172,63,10,128,39,192,39,160,110,65,0,0,128,188,0,0,216,63,39,160,96,65,246,127,48,64,8,0,126,63,20,208,137,65,0,0,23,193,0,0,188,63,0,0,176,61,251,63,128,192,8,0,22,191,5,192,170,192,251,63,243,192,42,0,222,63,10,128,161,192,0,0,154,192,5,192,210,192,0,0,66,192,10,128,237,192,253,31,11,193,10,128,51,192,13,224,50,193,5,192,155,192,251,63,176,192,26,192,46,193,3,224,4,193,214,255,177,191,239,255,179,190,246,127,102,192,17,0,140,62,0,0,144,189,251,63,164,192,0,0,216,191,8,0,126,63,5,192,6,193,8,0,62,63,10,128,237,192,0,128,16,193,0,0,146,64,0,0,57,193,26,192,58,193,246,127,96,64,0,0,112,191,251,63,176,192,0,0,129,64,0,0,56,192,251,63,240,192,5,192,181,64,235,255,60,192,10,128,131,192,251,63,243,64,251,63,198,192,10,128,153,192,0,0,169,64,251,63,200,192,5,192,188,192,13,224,32,65,204,127,56,193,0,0,42,192,204,127,76,65,246,127,124,192,5,192,28,193,13,224,64,65,3,96,27,193,26,192,74,193,52,128,63,65,0,0,194,192,39,160,56,193,5,192,163,192,3,224,15,193,0,0,34,193,5,192,205,192,253,31,16,193,0,0,81,193,0,128,12,193,217,95,33,193,217,95,122,193,26,192,84,193,10,128,155,192,217,95,32,193,239,255,227,62,10,128,107,192,217,95,73,193,246,127,126,64,0,128,4,193,230,63,68,193,21,0,139,191,251,63,218,192,26,192,134,193,0,0,134,192,204,127,86,193,39,160,124,193,0,0,54,192,13,96,134,193,243,31,201,193,217,95,33,193,0,0,28,193,243,31,115,193,0,128,181,193,3,224,23,193,249,143,164,193,7,112,178,193,21,0,167,63,0,0,244,191,0,0,40,63,246,127,46,64,0,0,78,192,235,255,216,191,0,0,160,190,0,0,48,192,0,0,158,64,21,0,227,63,251,63,132,192,246,127,74,64,0,0,8,63,10,128,63,192,10,128,93,192,21,0,167,63,10,128,139,192,246,127,176,192,10,128,9,192,10,128,213,192,0,0,224,189,10,128,47,192,253,31,8,193,246,127,96,192,246,127,42,64,0,0,16,191,246,127,16,192,5,192,150,64,0,0,84,191,235,255,108,192,235,255,32,64,21,0,219,191,251,63,162,192,21,0,179,63,246,127,30,192,10,128,249,192,235,255,96,64,10,128,17,192,0,0,249,192,5,192,138,64,21,0,195,63,251,63,131,192,0,0,196,64,0,0,8,64,5,192,207,192,0,0,148,191,0,0,64,192,251,63,212,192,0,0,36,63,0,0,134,192,39,160,41,193,42,0,238,63,0,0,172,191,230,63,41,193,21,0,83,64,0,0,6,192,243,31,102,193,246,127,20,64,251,63,184,192,7,240,129,193,8,0,94,191,251,63,200,192,10,128,149,192,0,0,0,60,0,0,167,192,0,0,246,192,21,0,131,191,246,127,204,192,217,95,34,193,246,127,36,192,251,63,130,192,26,192,35,193,21,0,151,191,246,127,194,192,230,63,101,193,248,255,57,191,0,0,48,192,230,63,90,193,0,0,142,192,0,0,160,192,39,160,99,193,246,127,126,192,251,63,235,192,7,112,136,193,0,0,104,64,5,192,203,192,251,63,28,193,8,0,30,63,253,159,13,193,39,160,71,193,0,0,184,191,243,31,41,193,236,175,132,193,0,0,196,191,235,255,76,192,236,175,151,193,0,0,192,191,251,63,208,192,243,159,175,193,10,128,1,192,26,192,44,193,20,80,190,193,235,255,216,191,0,0,0,61,5,192,17,193,0,0,200,192,246,127,34,192,3,96,24,193,10,128,53,192,10,128,207,192,246,127,224,192,251,63,165,192,5,192,13,193,0,0,240,192,235,255,64,192,0,0,245,192,39,160,59,193,5,192,156,192,3,224,16,193,230,63,87,193,5,192,225,192,251,63,207,192,5,192,213,192,251,63,171,192,251,63,207,192,243,31,36,193,253,31,5,193,5,192,239,192,39,160,47,193,246,127,92,64,222,255,71,62,5,192,211,192,5,192,163,64,34,0,88,190,253,159,19,193,3,224,16,65,0,0,92,191,251,63,176,192,0,0,214,64,235,255,252,63,13,224,80,193,10,128,79,64,0,0,74,64,0,0,0,188,235,255,32,64,5,192,225,64,21,0,71,192,10,128,167,64,10,128,121,64,0,0,18,192,5,192,200,64,5,192,147,64,246,127,152,192,0,0,15,65,5,192,147,64,10,128,203,192,251,63,179,64,21,0,183,63,246,127,68,64,251,63,214,64,246,127,62,64,0,0,84,63,251,63,152,64,0,0,248,62,34,0,88,190,0,0,198,64,42,0,198,63,246,127,34,192,5,192,183,64,251,63,201,64,0,0,48,63,5,192,14,65,0,0,203,64,0,0,28,63,0,128,0,65,21,0,55,64,0,0,18,192,39,160,35,65,5,192,185,64,235,255,236,191,13,224,73,65,251,63,147,64,8,0,30,191,246,127,252,64,5,192,159,64,21,0,243,191,5,192,249,64,0,0,241,64,10,128,27,192,52,128,59,65,253,31,14,65,5,192,153,192,0,0,247,64,246,127,50,64,10,128,161,64,3,96,25,65,5,192,166,64,5,192,170,64,0,128,17,65,39,160,67,65,10,128,223,64,0,0,46,65,13,224,123,65,246,127,110,64,251,63,14,65,251,63,133,64,214,255,249,63,39,160,51,65,0,0,224,64,10,128,67,64,39,160,92,65,5,192,11,65,8,0,70,63,0,0,11,65,251,63,8,65,246,127,200,64,52,128,71,65,10,128,211,64,5,192,13,65,251,63,234,64,253,31,17,65,10,128,11,64,13,224,86,65,5,192,28,65,5,192,170,64,230,63,39,65,5,192,7,65,17,0,140,62,217,95,49,65,52,128,37,65,0,0,86,64,204,127,50,65,204,127,62,65,0,0,160,62,26,192,131,65,230,63,71,65,248,255,49,63,5,192,253,64,0,0,136,64,5,192,24,65,253,31,12,65,251,63,231,64,3,224,29,65,5,192,0,65,26,192,36,65,39,160,57,65,13,224,33,65,251,63,197,64,243,31,99,65,217,95,37,65,0,0,31,65,39,160,110,65,52,128,87,65,253,159,26,65,217,95,97,65,39,160,96,65,243,31,83,65,246,127,214,64,20,80,134,65,13,224,42,65,39,160,34,65,13,224,143,65,217,95,105,65,251,63,190,64,7,240,178,65,7,240,146,65,253,159,3,65,0,0,208,62,21,0,163,63,0,0,24,191,42,0,230,63,246,127,26,64,0,0,118,192,8,0,14,191,5,192,154,64,17,0,156,62,214,255,217,191,0,0,214,64,10,128,121,64,10,128,163,192,0,0,184,64,21,0,207,191,5,192,133,192,3,96,29,65,21,0,155,63,0,0,112,192,204,127,56,65,5,192,160,64,21,0,3,64,253,31,7,65,0,0,76,63,246,127,26,64,0,0,71,65,42,0,182,191,5,192,156,64,39,160,75,65,10,128,133,64,246,127,40,64,5,192,160,64,0,0,100,64,10,128,189,64,10,128,167,64,251,63,178,64,214,255,201,63,5,192,12,65,246,127,164,64,0,0,153,64,3,96,13,65,246,127,166,64,10,128,171,64,3,224,24,65,0,0,14,65,21,0,131,191,246,127,60,64,251,63,131,64,0,0,168,62,0,0,177,64,5,192,226,64,8,0,46,63,0,0,58,65,3,96,1,65,0,0,88,64,20,80,132,65,0,0,226,64,235,255,136,63,251,63,245,64,204,127,38,65,10,128,95,192,10,128,253,64,0,0,14,65,5,192,209,192,243,31,96,65,5,192,27,65,5,192,139,192,246,127,20,64,42,0,198,63,246,127,212,192,251,63,171,64,21,0,95,64,253,31,31,193,0,0,158,64,246,127,206,64,246,127,72,192,0,0,136,192,235,255,172,63,251,63,188,192,251,63,198,192,0,0,144,63,0,0,90,192,0,0,144,189,0,0,193,64,8,0,102,191,21,0,243,191,26,192,35,65,10,128,167,192,246,127,6,192,21,0,59,64,3,96,0,193,189,255,207,189,5,192,159,64,5,192,221,192,248,255,33,191,253,31,14,65,253,159,31,193,10,128,99,192,42,0,158,63,217,95,48,193,0,0,180,192,0,0,184,64,0,0,172,63,0,0,48,63,10,128,73,64,235,255,64,64,21,0,255,63,0,0,189,64,0,0,122,192,246,127,130,64,10,128,227,64,10,128,239,192,5,192,164,64,52,128,45,65,10,128,69,192,246,127,22,64,0,0,40,65,0,0,50,192,0,0,192,64,39,160,98,65,251,63,153,192,251,63,210,64,236,47,151,65,246,127,94,64,0,0,116,191,0,0,252,63,251,63,157,64,8,0,46,191,5,192,180,64,10,128,13,64,235,255,252,191,10,128,217,64,0,0,100,64,0,0,104,191,39,160,44,65,251,63,189,64,0,0,180,63,3,96,4,65,0,0,133,64,0,0,76,64,39,160,60,65,5,192,236,64,0,0,16,64,26,192,97,65,39,160,37,65,246,127,248,64,26,192,157,65,0,0,223,64,3,96,24,65,7,240,188,65,39,160,46,65,52,128,71,65,13,224,212,65,3,224,14,65,0,0,66,65,243,31,159,65,230,63,103,65,243,31,51,65,13,96,169,65,0,0,160,189,42,0,134,63,246,127,250,64,214,255,153,63,10,128,121,64,217,95,37,65,0,0,126,64,0,0,198,64,253,159,11,65,246,127,126,64,52,128,39,65,0,0,74,65,246,127,190,64,10,128,215,64,0,0,73,65,5,192,196,64,0,0,185,64,0,0,145,65,246,127,198,64,13,224,87,65,217,95,32,65,246,127,104,64,26,192,131,65,52,128,79,65,0,0,112,191,217,95,53,65,39,160,73,65,235,255,64,192,0,0,124,65,249,143,135,65,5,192,222,64,253,31,25,65,243,31,128,65,0,0,100,64,0,0,57,65,249,143,136,65,39,160,58,65,217,95,32,65,253,31,23,65,39,160,46,65,204,127,76,65,26,192,61,65,0,0,94,65,230,63,89,65,0,0,66,65,204,127,68,65,230,63,84,65,20,208,133,65,39,160,45,65,13,224,132,65,3,224,30,65,13,224,116,65,20,208,150,65,3,224,11,65,39,160,42,65,26,192,180,65,243,31,60,65,13,224,137,65,217,95,118,65,13,224,74,65,26,192,129,65,26,192,115,65,0,128,142,65,39,160,86,65,236,47,143,65,217,95,105,65,13,224,147,65,236,47,157,65,243,31,116,65,249,15,179,65,13,96,177,65,243,159,157,65,7,112,158,65,249,143,216,65,217,95,123,65,20,80,211,65,3,248,0,66,13,224,164,65,0,0,209,64,236,175,166,65,249,15,143,65,243,31,92,65,20,80,173,65,249,15,146,65,13,224,48,65,20,208,207,65,7,240,181,65,243,31,147,65,243,31,196,65,13,96,195,65,236,47,166,65,0,0,3,66,243,159,250,65,0,0,3,65,230,63,95,65,230,63,99,65,251,63,27,65,7,240,131,65,0,0,140,65,0,0,61,65,7,240,129,65,26,192,173,65,39,160,68,65,236,175,155,65,243,31,196,65,13,96,139,65,249,143,148,65,13,224,173,65,0,0,80,64,39,160,93,65,0,0,169,65,251,63,181,64,0,0,146,65,249,15,206,65,0,128,28,65,20,80,148,65,243,159,248,65,13,224,130,65,26,192,141,65,0,0,223,65,217,95,123,65,0,128,169,65,0,128,13,66,39,160,39,65,236,47,219,65,230,63,242,65,0,0,24,65,7,240,244,65,249,207,25,66,39,160,83,65,253,199,21,66,13,224,59,66,0,0,0,0,0,0,0,0,0,0,0,0,243,31,132,193,26,192,34,193,0,0,24,63,26,192,165,193,5,192,31,193,0,0,43,193,7,240,177,193,0,0,207,192,246,127,46,192,230,63,238,193,13,224,136,193,246,127,46,192,243,159,246,193,0,0,54,192,246,127,96,192,20,80,170,193,13,96,12,194,7,112,225,193,7,112,218,193,13,224,20,194,0,0,90,193,17,0,204,190,0,0,189,192,0,0,40,63,235,255,152,191,3,224,20,193,0,0,124,64,0,0,88,63,230,63,49,193,3,224,17,65,5,192,208,192,0,0,224,192,21,0,67,64,251,63,142,192,26,192,84,193,8,0,46,63,3,224,15,193,230,63,99,193,251,63,233,64,230,63,100,193,236,47,159,193,10,128,77,64,230,63,102,193,230,63,99,193,217,95,53,65,13,96,152,193,217,95,73,193,251,63,195,64,236,175,171,193,20,208,154,193,13,224,35,65,0,0,235,192,0,128,28,65,246,127,110,64,39,160,75,193,0,0,83,65,246,127,150,64,251,63,22,193,251,63,154,64,0,0,12,64,243,31,89,193,246,127,68,64,0,0,145,64,0,0,63,193,253,159,6,65,3,224,21,65,20,80,135,193,235,255,160,191,0,0,48,65,0,128,156,193,3,224,7,193,236,47,148,65,243,31,216,193,21,0,175,191,217,95,46,65,39,160,46,193,0,0,68,191,5,192,210,192,26,192,140,193,235,255,176,191,253,159,15,193,243,31,58,193,10,128,181,192,217,95,32,193,26,192,66,193,246,127,4,192,0,0,90,193,217,95,105,193,251,63,205,192,243,31,109,193,13,224,128,193,52,128,61,193,230,63,146,193,236,47,162,193,5,192,14,193,20,208,178,193,214,255,169,63,0,0,184,62,5,192,204,192,235,255,192,191,0,0,204,191,3,224,15,193,21,0,35,64,0,0,196,191,52,128,63,193,0,0,195,64,246,127,36,64,0,0,204,192,235,255,200,63,246,127,56,64,3,96,27,193,246,127,162,64,235,255,208,191,0,128,4,193,0,0,15,65,67,0,240,189,0,0,24,193,3,96,22,65,10,128,1,192,217,95,105,193,246,127,222,192,0,0,141,192,26,192,50,193,10,128,159,192,0,0,213,192,243,31,112,193,235,255,176,63,5,192,184,192,26,192,41,193,246,127,2,192,10,128,131,192,230,63,80,193,42,0,206,63,10,128,75,192,7,240,140,193,235,255,40,64,10,128,131,192,10,128,205,192,246,127,82,64,3,224,8,193,251,63,252,192,251,63,191,64,5,192,151,192,0,0,48,193,251,63,206,64,13,224,33,193,204,127,122,193,246,127,50,64,251,63,226,192,13,224,98,193,0,0,232,190,0,0,28,193,204,127,70,193,0,0,149,192,52,128,51,193,26,192,127,193,248,255,17,191,3,224,16,193,230,63,132,193,8,0,102,191,26,192,44,193,20,80,161,193,0,0,160,191,217,95,87,193,0,0,116,193,0,0,64,189,230,63,137,193,243,159,184,193,251,63,162,192,243,31,85,193,236,175,162,193,251,63,154,192,39,160,53,193,243,31,205,193,251,63,237,192,217,95,124,193,13,224,193,193,0,0,203,192,0,0,65,65,243,31,114,65,26,192,103,193,10,128,143,64,0,0,122,65,13,224,54,193,0,128,14,65,249,143,165,65,236,175,167,193,204,127,90,65,52,128,53,65,13,96,155,193,249,15,140,65,236,175,157,65,5,192,195,64,26,192,110,65,217,95,51,65,251,63,145,64,243,159,167,65,0,0,44,65,0,0,236,63,20,80,137,65,39,160,107,65,246,127,98,192,7,240,183,65,249,143,128,65,246,127,170,192,243,31,136,65,20,80,160,65,26,192,39,193,249,15,200,65,0,0,208,65,0,0,16,192,0,0,184,191,21,0,3,64,248,255,113,63,235,255,148,191,21,0,183,191,10,128,189,64,0,0,78,192,42,0,206,63,5,192,1,65,0,0,204,191,251,63,213,64,243,31,69,65,246,127,100,192,0,0,175,64,251,63,234,64,0,0,160,192,5,192,141,192,204,127,60,65,0,0,132,192,0,0,0,193,235,255,224,191,5,192,131,192,10,128,85,192,0,0,141,192,3,224,8,193,0,0,38,192,10,128,185,192,246,127,48,192,214,255,185,191,0,0,33,193,10,128,101,192,0,0,40,63,39,160,103,193,0,0,114,192,235,255,8,192,230,63,66,193,5,192,182,192,251,63,206,64,249,143,151,193,214,255,233,191,21,0,63,64,230,63,87,193,246,127,18,64,10,128,7,192,236,47,157,193,246,127,84,64,0,0,141,192,7,112,162,193,246,127,204,64,0,0,104,64,21,0,51,192,0,0,108,63,10,128,59,192,251,63,153,192,42,0,198,63,246,127,218,192,246,127,172,192,5,192,170,64,0,0,34,192,0,0,41,193,3,96,16,65,0,0,168,191,253,159,8,193,235,255,128,63,0,0,34,192,0,0,20,193,5,192,152,64,246,127,214,192,246,127,88,64,235,255,64,64,0,0,58,192,0,0,112,191,21,0,115,64,246,127,158,192,214,255,233,63,5,192,212,64,5,192,157,192,246,127,150,64,0,0,128,63,0,0,184,62,3,96,9,65,235,255,76,64,21,0,159,63,5,192,178,64,235,255,144,191,0,0,84,192,5,192,21,65,248,255,41,191,251,63,148,192,26,192,45,65,10,128,55,64,21,0,51,192,217,95,82,65,235,255,52,64,0,0,241,192,13,224,85,65,10,128,155,64,239,255,179,62,243,31,126,65,251,63,208,64,10,128,63,192,243,159,180,65,251,63,137,64,235,255,124,192,0,0,96,61,246,127,72,64,0,0,208,62,0,0,16,63,5,192,202,64,10,128,79,64,10,128,141,64,0,0,167,64,239,255,163,62,10,128,105,64,251,63,24,65,214,255,129,63,0,0,8,63,251,63,239,64,21,0,187,191,222,255,71,190,243,31,78,65,8,0,78,191,251,63,165,192,0,0,2,64,42,0,214,63,251,63,231,192,0,0,60,191,0,0,153,64,246,127,32,192,21,0,83,192,251,63,241,64,0,0,197,192,0,0,168,192,13,224,94,65,0,0,72,64,251,63,168,192,5,192,194,64,251,63,185,64,5,192,148,192,217,95,76,65,235,255,160,191,10,128,25,64,251,63,164,64,21,0,63,192,0,0,209,64,5,192,217,64,10,128,203,192,0,0,72,64,3,224,24,65,0,0,54,64,10,128,151,64,3,224,27,65,239,255,227,62,8,0,22,63,217,95,68,65,21,0,151,63,10,128,107,64,7,240,142,65,248,255,33,191,251,63,255,64,26,192,59,65,21,0,227,63,26,192,55,65,253,31,9,65,246,127,164,64,3,96,31,65,39,160,78,65,0,0,166,64,26,192,56,65,249,143,148,65,10,128,3,64,8,0,126,191,0,0,94,64,0,0,4,64,248,255,49,63,251,63,242,64,246,127,198,64,21,0,171,63,0,0,144,64,251,63,205,64,214,255,185,63,251,63,25,65,0,0,74,64,21,0,103,64,251,63,129,64,10,128,41,64,10,128,229,64,246,127,198,64,0,0,32,65,13,224,49,65,0,0,196,63,39,160,53,65,217,95,124,65,246,127,54,64,13,224,73,65,243,31,57,65,0,0,168,64,243,159,149,65,52,128,85,65,0,0,126,64,10,128,201,64,5,192,26,65,251,63,143,64,251,63,178,64,5,192,16,65,5,192,6,65,39,160,32,65,52,128,51,65,0,0,26,65,26,192,95,65,0,128,20,65,253,159,14,65,251,63,191,64,5,192,160,64,0,0,216,64,0,0,1,65,251,63,199,64,3,224,31,65,0,0,225,64,5,192,140,64,217,95,100,65,230,63,61,65,251,63,168,64,0,128,144,65,0,0,65,65,253,31,13,65,0,128,202,65,39,160,55,65,251,63,3,65,230,63,71,65,243,31,115,65,26,192,36,65,204,127,120,65,20,208,149,65,230,63,125,65,26,192,128,65,243,31,221,65,249,143,128,65,26,192,163,65,253,31,28,65,0,0,108,191,0,0,20,63,13,224,87,65,214,255,193,63,246,127,82,64,13,224,129,65,0,0,200,190,10,128,103,192,246,127,242,64,0,0,172,64,0,0,88,192,253,159,15,65,0,0,238,64,0,0,92,191,5,192,28,65,3,96,31,65,5,192,162,192,230,63,45,65,251,63,232,64,246,127,72,64,0,0,117,65,3,224,17,65,0,0,232,63,10,128,75,64,0,0,188,192,21,0,243,191,5,192,214,64,5,192,11,193,0,0,172,63,21,0,227,191,0,0,215,192,0,0,248,192,0,0,199,192,3,224,18,193,204,127,44,193,0,0,128,61,230,63,32,193,0,0,66,192,246,127,48,64,39,160,94,193,253,159,1,193,0,0,183,192,246,127,70,192,5,192,201,192,251,63,213,192,0,0,96,190,26,192,39,193,253,159,25,193,3,224,22,193,13,224,116,193,5,192,253,192,253,159,12,193,7,240,158,193,52,128,53,193,13,224,95,193,20,80,170,193,217,95,108,193,0,0,151,193,20,80,204,193,10,128,229,192,39,160,75,193,5,192,195,192,0,0,145,192,236,175,134,193,246,127,174,192,253,31,9,193,26,192,147,193,0,0,64,191,217,95,45,193,243,31,61,193,0,0,96,61,204,127,70,193,26,192,129,193,0,0,166,192,243,31,56,193,230,63,171,193,0,0,196,192,243,159,148,193,20,208,196,193,0,0,224,190,0,128,178,193,26,192,130,193,235,255,168,191,7,240,211,193,26,192,231,193,0,0,30,64,0,0,19,193,246,127,222,192,10,128,153,192,0,0,115,193,253,159,4,193,0,0,200,192,10,128,21,192,39,160,61,193,0,0,250,192,0,0,160,192,230,63,103,193,26,192,62,193,26,192,53,193,0,0,64,193,253,31,26,193,230,63,108,193,217,95,116,193,52,128,91,193,5,192,7,193,243,31,112,193,243,159,132,193,10,128,187,192,20,80,145,193,230,63,141,193,39,160,37,193,20,208,150,193,249,15,167,193,251,63,11,193,13,224,158,193,236,47,216,193,39,160,39,193,20,80,181,193,236,175,247,193,0,0,17,193,243,31,139,193,243,31,46,193,251,63,250,192,230,63,173,193,39,160,68,193,230,63,71,193,249,15,165,193,230,63,119,193,26,192,63,193,13,96,190,193,0,0,164,193,0,0,139,193,230,63,137,193,5,192,168,192,7,112,175,193,13,224,190,193,5,192,9,193,0,0,123,193,0,128,177,193,251,63,20,193,52,128,119,193,230,63,208,193,13,224,83,193,217,95,86,193,243,159,222,193,246,127,124,192,7,240,157,193,0,0,250,193,13,224,107,193,20,208,145,193,13,224,170,193,0,128,143,193,0,0,215,193,249,15,150,193,236,175,200,193,0,0,123,193,0,128,220,193,249,143,208,193,7,112,140,193,236,175,205,193,7,240,12,194,10,128,109,192,251,63,237,64,21,0,155,63,235,255,148,191,39,160,42,65,251,63,136,64,251,63,189,192,52,128,77,65,3,96,7,65,235,255,216,191,20,80,128,65,243,31,41,65,243,31,51,193,20,208,143,65,26,192,54,65,10,128,119,64,39,160,79,65,251,63,132,64,0,0,160,61,39,160,126,65,0,0,185,64,243,31,130,65,230,63,109,65,246,127,244,64,7,240,176,65,13,96,143,65,5,192,227,64,246,127,210,64,251,63,198,64,0,0,82,64,3,224,24,65,5,192,255,64,5,192,215,64,253,159,26,65,10,128,97,64,0,0,195,64,0,0,90,65,0,0,177,64,10,128,205,64,39,160,63,65,0,0,14,64,0,0,45,65,7,112,133,65,251,63,152,64,230,63,64,65,249,15,144,65,246,127,156,64,0,0,135,64,0,0,148,65,3,96,20,65,5,192,238,64,243,159,161,65,3,224,28,65,0,0,96,189,26,192,194,65,3,96,13,65,10,128,181,64,7,112,214,65,230,63,88,65,0,0,86,64,13,224,170,65,0,0,78,65,217,95,35,65,26,192,186,65,3,224,25,65,230,63,123,65,236,47,220,65,0,0,125,65,0,0,58,65,251,63,1,65,243,31,79,65,5,192,217,64,5,192,22,65,236,47,135,65,0,128,1,65,13,224,97,65,230,63,148,65,253,31,26,65,0,0,98,65,243,31,93,65,39,160,58,65,39,160,68,65,26,192,145,65,217,95,94,65,0,0,24,65,243,31,73,65,230,63,105,65,0,0,57,65,230,63,109,65,249,15,157,65,246,127,104,64,230,63,169,65,0,128,173,65,5,192,192,64,13,96,227,65,243,159,208,65,39,160,105,65,7,112,162,65,7,240,163,65,249,143,176,65,249,143,171,65,230,63,154,65,13,224,164,65,7,112,152,65,243,31,70,65,13,224,130,65,243,159,185,65,52,128,35,65,26,192,124,65,249,15,191,65,13,224,121,65,230,63,214,65,0,0,182,65,0,0,99,65,0,192,13,66,13,224,185,65,249,15,133,65,5,192,2,65,236,47,160,65,13,96,130,65,217,95,42,65,243,159,222,65,13,224,144,65,7,240,156,65,217,95,108,65,0,128,186,65,230,63,105,65,243,31,144,65,243,31,249,65,0,128,204,65,26,192,182,65,243,31,230,65,243,159,196,65,26,192,222,65,0,0,142,65,0,128,224,65,0,0,248,65,13,96,176,65,7,240,151,65,249,143,210,65,20,208,191,65,217,95,113,65,10,40,19,66,243,31,193,65,20,80,164,65,13,224,3,66,243,31,249,65,3,248,16,66,0,128,253,65,0,0,229,65,236,47,252,65,7,176,38,66,0,128,25,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,251,63,150,64,0,0,128,64,10,128,135,192,21,0,39,64,0,0,86,64,3,224,7,65,0,0,114,192,0,0,132,191,0,0,163,64,10,128,155,64,10,128,67,192,0,0,143,192,235,255,60,64,5,192,199,64,235,255,140,63,0,0,215,192,0,0,2,65,246,127,76,64,0,0,96,63,246,127,138,192,3,96,12,65,10,128,167,64,8,0,22,191,5,192,211,192,39,160,49,65,21,0,119,64,10,128,29,192,3,224,8,193,5,192,196,64,251,63,250,64,0,0,100,63,0,0,102,192,0,0,247,64,0,0,81,65,0,0,216,63,251,63,170,192,5,192,251,64,253,31,27,65,0,0,132,191,3,224,27,193,253,31,6,65,10,128,71,64,214,255,185,63,0,0,32,189,5,192,29,65,235,255,192,63,10,128,173,192,235,255,128,191,246,127,34,64,0,0,196,63,17,0,204,62,251,63,160,192,251,63,215,64,17,0,236,190,21,0,47,64,235,255,100,192,253,159,29,65,5,192,141,64,246,127,146,64,235,255,44,192,52,128,63,65,251,63,221,64,214,255,209,63,251,63,129,192,217,95,125,65,251,63,234,64,248,255,97,63,0,0,198,192,13,224,44,65,0,0,5,65,21,0,39,64,0,0,152,62,52,128,117,65,52,128,55,65,10,128,101,64,235,255,132,63,13,224,128,65,251,63,20,65,0,0,68,191,248,255,113,191,249,15,161,65,39,160,52,65,235,255,124,64,246,127,58,192,13,96,144,65,230,63,82,65,0,0,128,188,0,0,240,192,26,192,179,65,217,95,114,65,251,63,191,64,214,255,137,63,20,208,223,65,0,128,147,65,251,63,162,64,21,0,79,192,21,0,219,63,0,0,176,63,21,0,71,192,246,127,26,192,235,255,88,64,0,0,28,191,10,128,89,192,0,0,220,192,0,0,44,192,246,127,22,64,246,127,4,64,0,0,138,192,5,192,228,192,21,0,107,64,251,63,164,64,0,0,62,192,10,128,81,64,0,0,88,192,21,0,163,191,246,127,98,192,10,128,47,64,251,63,238,192,0,0,128,61,246,127,140,192,251,63,197,64,17,0,172,190,0,0,32,62,10,128,239,192,21,0,23,64,246,127,148,192,0,0,48,192,3,224,16,193,0,0,2,65,0,0,88,63,0,0,167,192,0,0,231,192,39,160,38,65,214,255,209,63,253,31,24,193,13,224,79,193,10,128,113,64,251,63,147,64,21,0,47,192,0,128,14,193,5,192,250,64,0,0,206,64,246,127,200,192,0,0,20,193,251,63,186,64,0,0,232,62,251,63,147,192,217,95,52,193,235,255,44,64,21,0,247,63,5,192,228,192,217,95,82,193,21,0,7,64,0,0,199,64,0,0,180,192,217,95,127,193,0,0,23,65,246,127,180,64,42,0,222,191,235,255,192,191,26,192,57,65,0,128,19,65,0,0,78,192,0,0,168,192,230,63,87,65,21,0,179,63,248,255,9,191,251,63,130,192,13,224,127,65,0,0,215,64,246,127,166,192,230,63,48,193,214,255,145,191,42,0,222,63,246,127,12,192,251,63,201,192,235,255,188,191,0,0,52,63,0,0,100,191,217,95,35,193,0,0,152,191,5,192,7,65,235,255,240,191,0,0,191,192,10,128,91,192,251,63,183,64,251,63,150,192,26,192,34,193,251,63,208,192,21,0,167,191,10,128,47,192,251,63,150,192,0,0,214,192,21,0,83,192,10,128,77,192,3,96,4,193,5,192,186,192,10,128,49,192,10,128,145,192,52,128,77,193,251,63,209,192,214,255,209,63,0,0,229,192,0,0,15,193,0,0,97,193,0,0,128,62,10,128,219,192,13,224,82,193,0,0,192,190,34,0,56,190,251,63,15,193,0,0,208,62,21,0,47,192,246,127,76,192,0,0,79,193,0,0,54,192,246,127,4,64,0,0,182,192,246,127,214,192,251,63,144,192,235,255,100,64,21,0,247,191,253,159,14,193,251,63,249,192,5,192,172,64,10,128,75,192,204,127,120,193,253,31,17,193,0,0,4,191,0,0,80,191,251,63,176,192,253,31,28,193,10,128,87,192,248,255,57,191,3,224,20,193,204,127,102,193,21,0,203,63,0,0,183,192,0,0,250,192,39,160,83,193,0,0,160,61,0,0,208,192,26,192,102,193,217,95,99,193,246,127,118,64,0,0,128,191,52,128,51,193,0,0,93,193,0,0,116,64,10,128,27,192,230,63,88,193,26,192,158,193,251,63,163,192,0,0,133,192,5,192,15,193,0,128,18,193,5,192,7,193,246,127,16,192,230,63,85,193,39,160,63,193,5,192,174,192,253,159,22,193,0,0,24,193,26,192,92,193,0,0,1,193,243,31,57,193,243,159,129,193,217,95,62,193,251,63,180,192,0,128,24,193,20,80,142,193,0,128,162,193,0,0,192,61,5,192,134,192,52,128,57,193,3,96,13,193,0,0,160,190,5,192,227,192,243,159,131,193,246,127,92,192,10,128,107,192,0,0,114,192,236,175,141,193,39,160,65,193,235,255,140,191,0,0,247,192,13,224,187,193,243,31,87,193,243,31,65,193,13,96,131,193,5,192,145,192,21,0,43,64,13,224,44,193,230,63,173,193,235,255,64,192,189,255,207,189,13,96,132,193,20,208,161,193,253,159,22,193,0,0,16,63,236,47,134,193,7,240,201,193,251,63,241,192,21,0,67,64,20,80,184,193,230,63,206,193], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([251,63,155,192,251,63,159,64,236,47,244,193,249,79,1,194,251,63,216,192,5,192,200,64,13,224,32,193,251,63,211,192,10,128,59,192,0,0,137,192,0,0,49,193,253,31,18,193,10,128,115,192,253,159,31,193,0,0,47,193,230,63,83,193,3,96,0,193,235,255,80,192,230,63,124,193,39,160,110,193,0,128,20,193,0,128,29,193,230,63,49,193,13,224,138,193,39,160,125,193,0,0,128,191,236,47,129,193,13,96,187,193,20,80,168,193,21,0,27,192,10,128,237,192,0,128,0,193,230,63,64,193,235,255,184,63,0,0,74,193,5,192,228,192,20,208,137,193,251,63,137,192,34,0,24,62,251,63,205,192,253,31,15,193,0,0,48,64,0,0,184,63,3,224,18,193,52,128,41,193,5,192,156,192,5,192,136,192,0,0,8,193,39,160,79,193,5,192,227,192,0,0,216,191,26,192,59,193,20,80,137,193,0,0,237,192,5,192,198,192,230,63,35,193,13,96,148,193,10,128,97,192,0,0,231,192,243,31,108,193,26,192,174,193,0,0,170,192,0,0,150,192,26,192,73,193,249,143,225,193,251,63,221,192,0,128,149,193,0,0,158,193,10,128,31,64,10,128,23,64,26,192,181,193,7,240,130,193,21,0,27,192,251,63,143,64,230,63,216,193,20,208,133,193,239,255,195,62,248,255,97,191,7,112,139,193,0,0,96,192,5,192,168,64,214,255,145,191,20,80,175,193,0,0,133,192,3,224,25,65,10,128,111,64,26,192,167,193,21,0,115,192,0,0,200,191,5,192,152,64,20,80,220,193,5,192,242,192,42,0,198,191,0,0,176,64,236,175,231,193,235,255,172,63,246,127,46,64,42,0,254,63,7,240,19,194,13,224,52,193,0,0,136,190,0,0,220,64,251,63,194,64,0,0,128,192,0,0,100,63,0,0,160,189,251,63,28,65,0,0,4,191,235,255,92,64,0,0,32,189,0,0,151,64,251,63,153,64,0,0,98,64,0,0,48,192,0,0,25,65,251,63,194,64,5,192,168,64,10,128,253,192,52,128,43,193,8,0,30,191,0,0,23,193,42,0,238,191,20,80,149,193,222,255,7,190,253,159,16,193,246,127,204,192,0,0,60,193,251,63,168,192,253,159,13,193,0,128,4,193,0,0,120,193,5,192,199,192,39,160,122,193,39,160,118,193,39,160,126,193,10,128,199,192,0,128,5,193,248,255,81,191,13,96,199,193,5,192,224,192,243,31,99,193,214,255,193,191,0,0,156,191,10,128,221,192,235,255,68,64,21,0,31,192,235,255,0,192,217,95,32,193,5,192,137,64,214,255,201,63,0,0,134,192,243,31,88,193,10,128,227,64,10,128,37,64,5,192,211,192,253,159,10,193,5,192,198,64,21,0,163,191,3,96,18,193,0,0,13,193,5,192,178,64,5,192,129,64,0,0,7,193,13,224,36,193,39,160,82,65,0,0,167,64,0,0,250,192,243,31,112,193,0,0,64,63,21,0,211,63,13,224,57,193,230,63,134,193,5,192,207,64,42,0,174,63,3,96,14,193,21,0,59,192,21,0,79,64,0,0,0,189,39,160,61,193,13,224,44,193,0,0,70,64,0,0,48,192,0,0,253,192,10,128,91,64,17,0,236,190,5,192,241,192,204,127,98,193,246,127,176,64,0,0,92,192,5,192,0,193,217,95,118,193,246,127,36,192,0,0,136,190,5,192,206,192,0,128,154,193,204,127,70,193,21,0,151,191,10,128,151,192,249,15,135,193,21,0,59,64,246,127,12,192,0,0,24,63,230,63,188,193,21,0,231,63,67,0,240,189,246,127,172,192,0,0,10,65,10,128,141,64,251,63,180,64,235,255,208,63,39,160,82,65,0,0,141,64,10,128,63,64,0,0,68,63,230,63,109,65,10,128,187,64,0,0,198,64,248,255,65,191,0,0,139,64,0,0,0,191,251,63,140,64,248,255,57,191,0,0,219,64,214,255,161,63,251,63,228,64,0,0,48,190,251,63,240,64,5,192,168,64,0,0,34,65,0,0,140,63,0,0,189,64,0,0,70,192,5,192,212,64,0,0,136,64,0,0,52,64,10,128,23,192,39,160,39,65,0,0,70,64,10,128,219,64,0,0,48,190,0,0,55,65,5,192,215,64,246,127,26,192,246,127,8,192,246,127,160,64,235,255,128,191,10,128,171,192,0,0,36,191,246,127,210,64,21,0,99,64,0,0,32,189,17,0,188,190,253,159,5,65,10,128,249,64,0,0,60,191,5,192,241,64,253,159,31,65,235,255,20,64,246,127,116,192,246,127,64,64,243,31,56,65,246,127,186,64,246,127,56,192,251,63,179,192,39,160,38,65,214,255,241,63,246,127,12,64,251,63,248,192,26,192,87,65,0,0,231,64,0,0,104,64,251,63,150,64,13,224,68,65,0,0,44,65,214,255,249,191,42,0,206,63,236,47,146,65,3,224,18,65,21,0,91,192,246,127,60,64,251,63,149,192,246,127,14,192,0,0,255,192,5,192,196,64,10,128,197,192,10,128,15,192,235,255,100,192,235,255,76,192,21,0,215,63,10,128,19,64,251,63,147,192,0,0,215,192,248,255,113,191,251,63,199,64,3,224,18,193,0,0,116,63,246,127,90,192,235,255,104,64,0,0,57,193,248,255,113,191,10,128,55,64,0,0,231,64,214,255,233,63,10,128,33,64,246,127,192,64,5,192,138,192,235,255,144,63,0,0,112,62,0,0,249,64,0,0,80,62,0,0,4,63,251,63,212,64,248,255,57,63,235,255,144,191,248,255,105,191,253,159,29,65,235,255,108,64,10,128,71,192,13,224,58,193,3,96,3,65,214,255,217,63,235,255,124,192,26,192,45,193,10,128,173,64,246,127,248,64,0,0,48,63,0,0,154,64,0,0,96,61,0,0,28,63,0,0,24,64,0,128,4,65,0,0,208,62,0,0,248,190,5,192,208,64,251,63,208,64,21,0,99,64,251,63,162,64,13,224,41,65,246,127,192,192,0,0,104,64,17,0,188,62,248,255,57,63,10,128,143,192,3,224,21,65,17,0,156,190,10,128,61,64,0,0,100,63,0,0,68,191,0,0,116,64,246,127,114,64,5,192,181,64,0,0,244,63,10,128,151,64,0,0,174,64,0,0,24,191,10,128,99,64,5,192,167,64,246,127,136,64,251,63,141,192,189,255,207,189,235,255,144,63,5,192,204,64,0,0,60,192,251,63,142,64,0,0,96,64,0,0,13,65,214,255,217,63,0,0,116,63,246,127,4,64,3,224,17,65,42,0,230,63,246,127,184,64,0,0,233,64,5,192,250,64,214,255,137,63,246,127,110,64,0,0,144,62,235,255,96,64,0,0,74,64,5,192,196,64,248,255,17,191,0,0,250,64,246,127,120,64,3,96,29,65,10,128,65,64,3,224,25,65,222,255,7,62,21,0,207,63,21,0,195,63,8,0,30,191,246,127,140,64,21,0,51,64,239,255,211,62,42,0,158,191,246,127,118,64,10,128,65,64,21,0,111,64,235,255,188,63,10,128,169,64,5,192,207,64,0,0,160,64,10,128,139,64,235,255,196,191,5,192,130,64,251,63,153,64,239,255,227,62,246,127,86,64,10,128,223,64,251,63,192,64,8,0,94,63,8,0,6,63,5,192,18,65,0,0,142,64,10,128,127,64,251,63,27,65,0,0,206,64,21,0,251,63,0,0,210,64,217,95,49,65,251,63,6,65,0,0,216,64,246,127,112,64,0,0,231,64,230,63,56,65,251,63,167,64,0,0,181,64,217,95,64,65,13,224,106,65,10,128,163,64,26,192,70,65,246,127,94,64,246,127,40,64,3,224,10,65,251,63,135,64,0,0,108,64,39,160,49,65,0,0,30,65,5,192,8,65,246,127,198,64,5,192,183,64,3,224,9,65,0,0,167,64,3,224,3,65,5,192,215,64,0,0,21,65,0,0,255,64,246,127,194,64,253,31,10,65,10,128,201,64,26,192,96,65,0,128,3,65,13,224,62,65,217,95,70,65,7,112,134,65,251,63,220,64,0,0,66,65,253,31,30,65,10,128,67,64,10,128,181,64,0,0,218,64,204,127,98,65,251,63,150,64,39,160,55,65,0,0,12,64,0,0,252,64,0,0,154,64,217,95,47,65,251,63,144,64,217,95,97,65,0,128,27,65,230,63,78,65,230,63,36,65,0,128,15,65,0,0,6,65,243,31,34,65,39,160,80,65,13,224,110,65,251,63,0,65,20,208,130,65,0,128,2,65,236,47,132,65,253,159,20,65,52,128,77,65,243,31,117,65,236,175,161,65,0,0,61,65,222,255,71,62,10,128,29,192,0,0,144,189,0,0,84,191,235,255,16,64,10,128,41,192,0,0,86,64,0,0,94,192,0,0,8,191,5,192,195,192,5,192,183,64,0,0,193,64,235,255,244,63,5,192,138,192,0,0,106,64,17,0,188,62,21,0,39,64,5,192,223,192,10,128,203,64,214,255,145,63,21,0,235,63,0,0,56,64,0,0,241,192,5,192,239,192,21,0,203,191,10,128,29,64,26,192,67,193,253,31,24,193,251,63,200,64,222,255,7,62,0,0,10,192,235,255,48,192,10,128,223,64,10,128,119,192,251,63,197,192,5,192,158,192,0,0,179,64,10,128,17,64,253,159,20,193,246,127,50,192,0,0,140,64,0,0,2,192,251,63,183,192,0,0,128,188,5,192,169,64,0,0,126,192,39,160,50,193,21,0,211,63,17,0,204,190,0,0,248,190,0,0,86,192,251,63,139,64,235,255,32,64,10,128,159,192,21,0,211,191,10,128,153,64,10,128,219,192,253,31,4,193,0,0,40,191,8,0,14,191,0,0,66,192,13,224,48,193,21,0,167,191,21,0,31,192,246,127,188,192,26,192,68,193,42,0,214,63,5,192,134,192,217,95,49,193,204,127,122,193,0,0,56,191,5,192,196,192,17,0,188,190,0,0,214,192,10,128,45,192,21,0,255,191,34,0,56,62,3,96,23,193,235,255,172,191,0,0,32,64,246,127,164,192,10,128,115,192,251,63,223,192,246,127,48,64,5,192,195,192,217,95,70,193,0,0,146,192,10,128,125,64,52,128,49,193,5,192,214,192,235,255,60,192,246,127,92,64,7,240,130,193,217,95,58,193,235,255,136,191,10,128,91,64,246,127,32,192,230,63,53,193,0,0,33,193,0,0,192,189,10,128,51,192,249,15,132,193,251,63,138,192,0,0,128,189,5,192,207,192,26,192,111,193,243,31,67,193,0,0,128,62,10,128,253,192,7,112,155,193,13,224,41,193,5,192,234,192,10,128,109,192,10,128,27,192,235,255,168,191,0,0,236,191,5,192,226,192,235,255,84,192,0,0,10,64,5,192,152,192,0,0,64,191,0,0,72,192,0,0,200,62,10,128,177,192,235,255,84,192,10,128,255,192,0,0,160,189,251,63,246,192,235,255,196,191,235,255,0,192,0,0,186,192,5,192,143,192,5,192,152,192,246,127,232,192,5,192,192,192,235,255,68,192,10,128,5,192,0,0,194,192,0,0,153,192,5,192,234,192,0,0,0,192,230,63,40,193,246,127,200,192,251,63,12,193,0,0,199,192,230,63,68,193,251,63,206,192,246,127,188,192,0,0,178,64,0,0,219,64,235,255,140,63,21,0,227,63,251,63,245,64,39,160,60,65,248,255,41,63,0,0,120,63,26,192,54,65,0,128,25,65,5,192,244,64,17,0,156,190,26,192,88,65,5,192,249,64,243,31,57,65,0,0,92,64,20,80,143,65,0,128,11,65,251,63,192,64,0,0,92,64,0,128,156,65,0,0,57,65,253,31,27,65,0,0,50,64,243,159,154,65,39,160,110,65,26,192,66,65,246,127,202,64,251,63,229,64,5,192,13,65,5,192,151,64,42,0,134,191,246,127,126,64,243,31,98,65,251,63,195,64,8,0,118,191,0,0,86,65,230,63,60,65,5,192,139,64,10,128,83,192,39,160,126,65,20,208,144,65,10,128,181,64,21,0,155,191,7,112,189,65,230,63,167,65,3,96,22,65,10,128,37,64,0,0,229,65,243,159,204,65,0,0,93,65,5,192,132,64,230,63,73,65,13,224,101,65,5,192,216,64,21,0,183,63,26,192,93,65,204,127,118,65,230,63,64,65,248,255,65,63,26,192,99,65,13,224,134,65,230,63,32,65,5,192,164,64,13,224,138,65,13,96,172,65,230,63,99,65,0,0,225,64,236,47,203,65,26,192,132,65,217,95,87,65,0,0,249,64,249,15,227,65,0,0,146,65,0,128,150,65,39,160,53,65,236,175,182,65,20,208,219,65,7,112,160,65,26,192,36,65,102,102,102,63,41,92,79,63,190,159,58,63,43,246,39,63,90,42,23,63,132,12,8,63,57,214,244,62,51,102,220,62,250,91,198,62,251,133,178,62,0,0,0,63,0,0,128,62,0,0,0,62,0,0,128,61,0,0,0,61,0,0,128,60,0,0,0,60,0,0,128,59,0,0,0,59,0,0,128,58,102,102,38,63,236,81,216,62,166,155,140,62,88,202,54,62,165,160,237,61,56,117,154,61,150,203,72,61,85,132,2,61,8,172,169,60,214,146,92,60,0,0,64,63,0,0,16,63,0,0,216,62,0,0,162,62,0,0,115,62,16,64,54,62,0,176,8,62,1,8,205,61,0,198,153,61,0,169,102,61,6,0,0,0,5,0,0,0,6,0,0,0,5,0,0,0,0,0,0,64,0,0,128,64,0,0,192,64,0,0,0,65,0,0,64,65,0,0,144,65,0,0,208,65,0,0,16,66,0,0,80,66,0,0,152,66,0,0,220,66,0,0,32,67,0,0,102,67,0,0,166,67,0,0,240,67,0,0,46,68,0,0,123,68,0,128,181,68,0,64,3,69,0,160,61,69,0,16,137,69,0,32,198,69,0,48,15,70,0,248,78,70,111,15,9,0,170,44,2,0,111,15,9,0,170,44,2,0,227,207,1,0,232,127,1,0,90,59,1,0,244,0,1,0,138,207,0,0,8,166,0,0,113,131,0,0,222,102,0,0,125,79,0,0,144,60,0,0,108,45,0,0,120,33,0,0,44,24,0,0,16,17,0,0,187,11,0,0,210,7,0,0,7,5,0,0,24,3,0,0,206,1,0,0,252,0,0,0,126,0,0,0,56,0,0,0,21,0,0,0,6,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,199,92,0,0,251,79,0,0,142,68,0,0,102,58,0,0,106,49,0,0,130,41,0,0,151,34,0,0,147,28,0,0,97,23,0,0,237,18,0,0,36,15,0,0,244,11,0,0,76,9,0,0,28,7,0,0,85,5,0,0,233,3,0,0,203,2,0,0,239,1,0,0,74,1,0,0,210,0,0,0,126,0,0,0,70,0,0,0,35,0,0,0,15,0,0,0,5,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,70,14,0,0,204,12,0,0,109,11,0,0,40,10,0,0,252,8,0,0,232,7,0,0,235,6,0,0,4,6,0,0,50,5,0,0,116,4,0,0,201,3,0,0,48,3,0,0,168,2,0,0,48,2,0,0,199,1,0,0,108,1,0,0,30,1,0,0,220,0,0,0,165,0,0,0,120,0,0,0,84,0,0,0,56,0,0,0,35,0,0,0,20,0,0,0,10,0,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,150,1,0,0,122,1,0,0,95,1,0,0,69,1,0,0,44,1,0,0,20,1,0,0,253,0,0,0,231,0,0,0,210,0,0,0,190,0,0,0,171,0,0,0,153,0,0,0,136,0,0,0,120,0,0,0,105,0,0,0,91,0,0,0,78,0,0,0,66,0,0,0,55,0,0,0,45,0,0,0,36,0,0,0,28,0,0,0,21,0,0,0,15,0,0,0,10,0,0,0,6,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,29,0,0,0,28,0,0,0,27,0,0,0,26,0,0,0,25,0,0,0,24,0,0,0,23,0,0,0,22,0,0,0,21,0,0,0,20,0,0,0,19,0,0,0,18,0,0,0,17,0,0,0,16,0,0,0,15,0,0,0,14,0,0,0,13,0,0,0,12,0,0,0,11,0,0,0,10,0,0,0,9,0,0,0,8,0,0,0,7,0,0,0,6,0,0,0,5,0,0,0,4,0,0,0,3,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,222,255,71,61,55,0,187,61,138,0,39,60,0,0,128,188,63,0,169,188,226,60,28,187,234,151,8,188,147,26,218,184,64,218,127,185,193,88,223,185,106,20,146,187,55,140,2,186,90,14,116,186,16,4,72,58,45,10,187,58,61,185,38,57,80,253,131,58,141,240,246,58,114,51,92,57,28,210,168,185,126,255,230,188,225,127,43,189,78,127,246,60,32,240,32,62,36,128,155,60,140,103,80,186,235,196,229,186,134,61,109,186,192,89,202,188,98,190,188,185,201,203,154,186,81,76,94,58,150,38,165,58,80,58,145,59,110,165,215,59,186,245,154,187,62,63,12,58,140,103,80,58,41,175,21,186,111,126,67,187,238,95,185,61,189,255,15,60,117,0,68,61,101,0,104,61,40,96,155,61,239,59,6,188,15,123,161,184,211,19,22,187,79,61,82,187,212,156,188,187,168,170,80,186,16,235,141,187,170,185,220,185,101,0,168,187,55,140,2,186,65,154,49,187,146,4,225,187,157,217,46,186,75,229,109,187,217,205,140,187,117,2,154,187,178,128,137,60,12,32,92,62,239,255,131,61,244,191,156,189,164,140,184,183,102,217,147,185,178,70,61,189,71,30,136,187,119,244,191,187,205,172,165,56,250,97,132,58,50,116,108,187,249,219,158,57,229,209,141,186,21,0,99,188,98,190,188,185,114,109,168,58,113,200,134,60,1,165,161,59,177,252,249,187,47,249,31,187,105,255,131,188,44,127,190,60,9,24,157,62,7,69,115,184,156,83,201,182,156,80,136,185,229,209,13,186,255,204,192,189,48,98,159,183,144,249,0,185,238,147,35,184,19,153,57,57,73,19,111,56,166,155,196,57,118,107,25,59,138,88,68,58,71,1,162,59,184,204,233,187,159,0,10,60,176,0,166,60,9,112,10,62,223,223,32,62,246,95,167,61,214,229,148,184,124,123,215,185,166,185,149,188,232,49,202,188,131,219,218,187,119,78,51,185,128,74,149,186,146,145,51,187,131,104,173,186,168,170,80,187,105,253,173,188,230,90,52,186,36,14,217,186,221,6,53,188,221,94,82,188,30,80,102,62,232,47,52,62,207,191,93,189,136,127,88,61,51,224,204,189,80,52,79,189,30,166,253,188,5,22,64,187,139,27,55,187,102,244,35,188,126,27,34,189,216,125,71,60,241,18,28,60,227,197,66,188,57,99,24,188,100,144,59,59,236,81,184,60,43,52,144,60,179,120,177,187,246,70,173,59,246,127,174,61,226,31,6,62,29,176,11,62,187,127,172,60,225,127,107,61,75,229,237,187,189,138,140,188,231,113,152,188,116,66,232,185,122,169,88,187,111,216,54,188,101,110,62,188,233,95,146,188,167,36,235,186,144,191,52,187,42,56,60,187,202,135,160,187,155,198,246,187,237,127,0,188,107,186,158,186,84,225,79,58,245,215,139,62,15,208,93,62,185,255,72,189,249,191,35,189,189,55,134,181,105,200,152,189,72,49,64,189,137,207,29,187,251,115,209,186,126,138,99,185,230,90,52,185,243,85,114,189,238,147,35,56,66,152,91,60,116,41,46,60,189,55,6,56,155,229,50,60,172,226,13,60,230,148,0,187,134,255,52,189,75,0,126,60,16,2,114,60,11,8,189,62,30,224,25,62,206,251,255,186,130,168,123,185,238,150,100,185,217,148,11,190,202,251,184,188,146,145,51,58,23,46,43,58,184,31,112,185,9,167,133,60,100,144,187,187,20,175,178,187,91,148,217,59,234,178,24,187,107,125,17,187,243,61,99,189,254,127,28,61,226,31,214,189,250,71,191,62,244,135,142,62,216,159,132,189,121,93,191,186,240,23,51,188,125,236,14,190,57,182,158,189,210,109,137,187,125,232,130,59,127,221,105,188,109,254,31,61,158,66,46,188,181,111,238,60,0,255,212,189,213,34,34,59,68,223,221,187,102,48,198,60,117,175,147,60,92,255,174,188,13,224,173,61,9,136,249,62,19,128,255,60,128,127,202,188,73,19,239,185,22,49,236,187,193,57,115,190,237,16,127,186,132,43,32,186,189,195,237,58,230,146,42,60,238,122,41,189,129,150,46,58,17,138,45,187,108,9,121,188,123,105,10,186,96,143,9,59,200,96,69,60,239,28,74,58,31,128,68,62,108,64,4,189,155,255,23,61,4,32,30,62,233,95,114,62,195,212,22,189,184,147,136,186,116,124,180,186,151,86,195,188,108,121,101,189,209,7,203,59,71,87,233,187,54,6,157,58,207,190,242,188,153,97,163,59,185,194,187,187,82,10,58,189,190,105,250,59,196,234,15,188,116,181,21,189,255,207,33,62,196,63,44,189,253,79,62,62,1,24,175,62,147,255,201,188,227,141,204,188,60,188,231,186,221,122,13,189,123,131,239,189,48,98,31,186,77,190,217,59,41,149,240,188,174,14,0,60,12,89,93,189,73,158,107,60,178,42,130,189,9,84,127,59,242,235,135,186,254,44,150,59,145,42,10,60,241,47,66,62,247,63,0,61,215,191,171,61,232,159,96,190,255,207,153,190,228,76,19,189,88,115,128,186,20,117,230,187,110,24,69,189,120,212,184,189,142,147,194,187,2,71,130,188,248,24,44,187,183,99,42,61,246,12,225,59,53,179,150,60,96,89,105,61,160,27,26,60,141,97,206,60,14,246,134,189,16,64,26,62,246,207,187,62,11,96,138,61,155,0,195,188,8,32,245,61,122,226,185,188,147,201,9,190,255,149,149,187,186,162,20,186,153,183,106,188,30,84,98,189,160,193,38,188,234,9,203,188,25,3,107,59,170,16,15,60,135,195,210,58,142,177,147,188,187,213,51,189,86,127,4,188,74,182,58,59,7,40,149,62,240,223,44,62,239,255,19,62,2,240,151,62,244,191,124,190,70,207,173,189,238,122,233,188,104,31,171,188,218,89,180,189,101,138,121,189,17,115,73,189,75,118,44,189,130,226,199,188,179,12,177,189,156,52,77,189,109,173,47,189,116,67,147,61,41,174,42,61,230,30,18,61,0,2,150,61,62,32,208,61,248,223,234,189,36,96,180,61,27,160,212,61,0,200,5,63,148,50,41,188,174,127,87,188,111,46,254,187,103,154,48,188,216,210,139,190,157,244,62,60,5,163,18,188,170,126,37,60,26,222,44,188,148,21,67,60,183,208,21,188,186,134,89,189,66,123,117,61,194,133,60,189,126,58,94,189,223,191,41,62,3,204,12,63,148,191,123,189,123,192,60,61,33,32,223,189,189,29,225,188,147,223,154,190,82,152,119,187,207,50,11,187,99,122,66,188,99,184,186,189,195,239,38,60,16,118,10,61,148,80,250,187,56,158,207,188,19,153,57,59,145,242,147,60,173,110,117,61,31,106,219,187,208,126,164,59,9,112,42,190,244,223,235,62,232,159,160,61,6,128,106,61,240,191,85,62,103,241,226,188,235,84,89,190,84,142,201,187,183,211,86,187,142,120,50,189,225,9,157,61,114,224,85,60,38,255,19,189,134,31,28,60,98,16,216,188,218,32,147,187,173,78,14,61,40,242,196,189,147,30,134,188,33,206,67,188,238,207,101,62,254,127,92,61,230,31,125,62,221,63,150,61,22,48,17,62,161,77,78,189,95,236,61,187,48,72,122,189,125,91,176,187,12,175,164,188,149,243,69,188,205,58,99,189,154,5,90,188,156,225,134,188,157,102,129,187,218,143,148,188,176,85,2,189,63,30,250,187,126,142,15,189,38,109,42,188,9,192,255,61,129,63,60,189,147,253,243,59,254,215,29,63,203,191,22,61,250,125,127,188,123,105,10,187,205,175,102,184,64,165,194,190,65,154,177,186,57,14,188,59,62,203,115,186,119,78,179,57,154,176,157,189,24,37,232,60,25,112,150,187,11,154,150,187,25,198,221,58,168,167,143,185,172,230,185,188,115,128,224,60,26,224,226,189,3,8,39,63,252,223,113,62,127,192,3,189,194,222,68,186,128,16,73,188,236,246,217,190,51,135,100,189,214,168,135,186,161,247,70,59,45,123,146,188,3,7,148,61,118,27,212,187,45,92,214,60,150,208,29,190,233,242,102,58,56,129,105,187,238,236,171,60,165,248,248,59,234,63,107,189,21,0,19,62,17,200,157,62,235,31,100,62,20,208,36,62,9,52,88,187,28,210,168,188,15,126,194,189,212,72,75,189,185,54,212,188,9,22,7,60,126,253,144,60,244,51,53,189,31,162,81,60,130,254,2,189,242,153,140,189,37,116,23,60,178,70,189,188,82,40,75,189,190,221,18,189,248,223,234,189,4,0,71,61,28,208,66,62,249,131,21,63,147,255,201,188,174,127,87,188,59,170,26,187,41,64,20,189,215,165,174,190,48,98,31,186,83,149,182,59,170,187,178,60,244,111,23,188,86,45,137,61,176,114,232,188,54,143,227,189,248,85,57,187,54,6,157,58,246,182,153,59,94,246,107,60,217,95,214,189,24,96,255,61,21,0,3,190,6,104,27,63,23,16,122,62,253,132,51,188,60,193,126,188,253,17,134,188,67,174,188,190,200,66,116,189,14,216,85,60,237,101,91,188,197,173,130,60,91,35,130,61,7,7,155,189,53,12,159,61,102,103,209,60,96,116,249,188,32,237,255,60,70,205,23,190,3,96,180,190,73,128,26,189,10,16,117,190,8,0,142,60,6,48,69,190,111,46,254,189,245,131,186,186,36,152,106,189,82,73,157,185,76,227,23,189,233,181,89,188,63,171,172,189,251,229,19,188,59,29,200,59,50,113,43,58,242,235,135,59,179,239,138,189,217,6,238,187,160,195,60,189,89,194,90,59,25,255,190,60,3,96,148,62,244,23,250,62,29,0,1,190,238,95,9,62,57,155,14,186,59,254,171,189,198,82,116,190,205,1,130,188,139,112,147,188,211,105,221,187,238,152,58,188,136,243,16,190,175,122,64,59,93,136,21,61,32,12,124,61,34,255,76,187,138,62,31,189,152,52,134,189,222,113,138,60,127,191,88,189,0,112,60,62,251,87,58,63,15,96,209,189,177,191,108,61,52,128,55,187,250,180,10,189,253,163,7,191,222,62,43,188,174,244,90,187,34,140,31,60,25,198,29,61,48,42,9,190,95,70,177,187,184,29,154,60,241,103,152,61,129,121,72,59,158,66,46,188,189,84,44,189,73,160,193,59,242,39,154,190,155,255,215,188,15,40,211,62,29,176,107,62,63,0,169,61,72,168,185,189,169,48,54,186,6,43,46,190,80,252,88,189,8,30,223,187,148,18,2,188,228,77,254,61,221,40,50,60,162,236,141,61,118,222,198,59,253,102,194,189,215,137,203,60,57,155,14,59,35,101,11,189,53,151,155,188,143,254,23,60,1,248,23,63,9,56,132,62,29,0,241,189,205,63,186,61,230,90,180,184,253,108,180,190,184,147,136,189,185,226,98,188,23,131,7,188,16,116,180,187,54,6,29,187,39,250,28,190,113,33,143,58,170,16,143,61,90,242,248,60,226,63,93,186,109,32,93,189,157,99,192,188,113,87,47,60,235,255,28,62,231,0,65,60,7,36,13,63,240,135,167,62,22,192,68,190,193,145,192,188,135,192,17,185,77,161,155,190,107,69,219,189,72,54,23,189,78,183,236,186,17,30,173,189,2,212,212,187,246,124,77,189,100,147,124,187,10,187,56,190,0,84,241,60,215,78,20,59,224,242,216,61,253,193,128,61,7,64,4,63,1,192,49,62,176,227,63,58,175,63,9,61,3,64,5,62,26,164,136,190,73,213,246,188,189,55,134,181,161,49,147,186,19,183,138,188,1,167,183,189,77,46,198,185,78,43,5,185,179,205,141,188,136,156,190,187,23,183,209,183,189,172,137,189,120,10,185,188,189,58,199,184,85,222,142,187,238,207,5,62,224,159,34,190,2,240,223,62,0,88,13,63,194,191,168,189,248,226,139,188,94,158,206,188,227,227,67,190,31,20,156,190,66,118,222,187,50,2,170,60,92,27,106,189,24,66,142,61,97,195,147,189,49,148,179,61,94,72,119,190,18,104,48,60,170,102,86,188,161,157,19,61,235,87,58,61,197,1,116,188,122,0,139,60,3,236,79,63,238,95,153,61,109,1,33,188,172,200,104,185,181,254,150,185,122,223,40,191,180,203,183,187,122,108,203,184,22,165,132,57,77,46,70,60,180,201,97,188,49,37,146,58,175,151,166,186,163,35,121,189,148,23,25,185,185,28,47,57,189,194,2,60,32,240,64,58,196,95,243,189,2,100,0,63,243,231,195,62,192,63,101,61,2,240,31,190,246,95,103,188,71,200,128,190,49,235,21,190,5,83,77,187,6,216,199,188,21,30,116,61,192,62,58,61,44,129,68,190,162,240,217,59,14,243,229,188,131,110,175,188,61,13,152,188,13,109,160,61,0,201,116,61,155,58,15,60,49,64,226,189,225,207,0,62,15,208,45,190,3,64,189,62,7,40,29,63,73,243,71,188,85,161,129,188,12,5,236,188,176,231,11,190,48,244,192,190,62,176,99,60,203,157,153,188,100,234,174,60,141,65,39,61,163,115,62,189,212,125,128,61,176,228,138,61,158,39,158,189,85,103,213,61,159,91,104,190,250,151,244,62,255,35,15,63,10,16,85,190,4,144,26,62,244,191,188,189,251,177,105,190,123,18,160,190,0,84,49,189,106,163,186,188,107,42,11,188,76,195,136,190,180,145,203,61,170,67,238,61,214,172,147,189,86,216,172,189,148,163,0,61,180,86,52,61,56,19,83,61,253,22,157,188,247,234,99,60,219,191,178,189,252,227,1,63,249,19,21,63,8,176,56,190,234,63,203,61,106,160,249,187,45,207,131,190,157,160,173,190,33,61,5,189,179,93,33,188,48,100,53,61,236,46,80,61,182,71,151,190,94,245,128,188,31,106,187,61,248,25,215,61,16,235,13,60,11,65,78,189,90,184,108,189,236,160,146,60,249,47,48,62,246,183,132,190,16,120,168,62,2,132,7,63,7,64,44,62,22,132,242,188,124,156,137,189,157,187,221,189,255,120,143,190,3,205,231,188,125,174,54,61,21,228,103,189,25,174,174,61,39,136,186,189,224,130,12,62,62,92,50,190,198,23,237,188,28,154,50,61,162,181,98,189,58,93,182,189,46,0,13,60,7,96,99,63,187,127,44,61,237,127,128,60,134,0,224,187,115,48,155,184,98,243,73,191,144,133,232,186,144,249,128,185,222,33,69,184,133,122,250,187,209,202,189,185,252,53,25,189,201,142,13,185,11,67,100,188,246,70,45,186,197,118,119,56,161,247,198,59,181,254,150,57,48,101,224,56,5,136,58,63,208,95,232,189,190,191,225,61,48,128,112,189,235,255,92,189,234,233,7,191,120,237,82,188,253,20,71,188,215,247,97,187,122,198,62,187,252,80,169,61,61,125,164,189,41,234,76,60,58,61,47,61,232,76,218,187,18,19,212,59,184,7,33,61,15,155,200,187,13,223,194,59,56,158,79,187,252,255,104,62,43,192,247,61,27,128,13,62,251,63,143,62,251,175,67,62,249,16,84,189,114,195,111,188,30,109,156,188,68,81,160,189,255,149,21,189,53,126,225,188,84,201,0,189,254,239,136,188,57,97,130,189,26,162,10,189,12,92,30,189,59,27,50,189,246,97,189,188,126,83,216,188,55,0,91,189,64,160,147,189,19,128,63,61,172,255,51,61,3,124,95,63,180,1,88,188,53,67,170,187,255,66,15,187,156,25,253,186,63,25,67,191,197,115,54,185,56,219,92,59,56,158,79,59,46,173,6,187,223,223,128,61,161,45,39,189,146,35,29,189,108,9,121,186,15,123,33,58,8,200,23,58,63,144,60,60,251,7,137,190,11,208,150,62,8,0,30,63,235,31,196,61,249,191,83,62,70,179,146,189,205,176,177,189,242,7,195,190,246,65,22,188,41,38,47,189,63,116,161,61,255,37,41,62,187,40,58,190,1,246,209,60,119,20,231,188,9,23,114,189,100,176,98,61,196,124,121,189,100,176,2,190,231,57,162,188,134,0,224,188,10,128,241,61,254,155,115,63,33,64,230,189,230,63,36,61,110,21,68,186,204,209,99,188,137,209,103,191,1,24,79,188,135,195,210,186,191,73,83,59,229,39,213,60,104,207,229,189,41,117,73,187,227,51,89,60,244,26,219,61,168,167,143,58,186,245,154,187,157,76,28,189,216,183,147,59,14,104,129,190,23,128,230,61,237,159,119,62,1,104,172,62,11,96,194,62,11,212,130,189,64,137,79,188,161,134,111,189,248,55,232,189,196,149,19,190,150,7,233,60,247,88,122,61,48,246,222,188,26,77,174,61,251,59,27,189,63,196,166,189,123,130,196,61,142,3,47,189,67,4,188,189,113,231,2,190,100,64,54,61,12,176,15,190,5,140,102,63,29,144,100,62,130,255,109,189,227,194,1,187,236,76,161,188,220,159,79,191,27,17,76,189,226,63,93,187,20,146,204,59,125,33,36,189,157,102,1,62,162,181,34,188,102,73,0,61,90,214,77,190,26,105,41,59,41,148,5,188,227,85,86,61,238,123,84,60,41,32,173,189,2,72,181,62,1,108,80,63,237,15,68,190,222,255,167,61,254,40,234,187,229,94,0,190,176,175,41,191,204,40,22,189,241,126,220,187,194,47,245,60,19,243,140,61,242,150,147,190,104,150,132,188,136,214,138,61,203,159,31,62,156,54,227,59,175,237,237,188,25,199,136,189,223,169,128,60,14,48,147,62,6,244,22,63,37,32,134,61,18,48,26,190,249,159,76,62,53,64,169,189,188,5,178,190,189,138,140,187,161,186,185,188,189,143,35,189,209,148,45,190,21,59,154,188,220,44,30,189,169,76,49,61,245,213,181,61,8,144,33,60,127,76,107,189,97,81,241,189,219,106,86,188,53,125,246,60,28,96,230,61,229,127,98,190,5,24,66,63,17,144,215,62,26,224,194,189,185,82,79,188,161,102,72,189,99,40,19,191,31,131,53,190,58,87,20,188,61,211,203,60,109,170,174,189,86,186,43,62,143,252,65,189,216,184,190,61,93,111,163,190,212,95,47,60,194,106,172,188,60,192,147,61,13,24,36,61,205,31,179,61,245,159,21,62,247,175,28,62,65,128,172,61,6,48,9,63,218,172,250,187,75,232,174,188,184,206,191,188,201,116,232,187,221,8,147,190,53,99,81,188,95,68,91,188,32,40,183,188,224,102,241,187,77,163,73,188,49,40,83,188,206,251,63,189,83,93,160,189,23,239,167,189,147,225,56,189,231,255,213,189,255,203,73,63,6,216,183,62,240,79,9,190,43,192,119,61,155,229,50,188,249,17,31,191,125,6,4,190,228,76,147,188,213,203,111,187,142,176,168,61,146,174,25,61,37,235,144,190,150,146,101,188,74,122,216,61,227,55,69,61,1,24,207,59,14,75,67,189,11,236,177,188,0,228,4,60,2,128,107,63,9,224,6,62,31,160,155,189,2,128,99,61,21,255,247,188,60,164,88,191,125,31,142,188,211,51,189,187,182,45,74,187,184,31,112,186,225,37,248,189,212,41,143,61,202,252,35,60,241,71,81,189,14,187,239,187,80,80,138,59,150,35,228,60,97,165,130,59,153,187,22,187,0,85,220,58,12,120,145,62,246,183,228,62,6,160,153,62,107,128,18,61,9,80,83,190,26,82,165,189,37,88,76,190,32,97,184,189,30,164,167,186,143,108,46,189,81,247,1,190,7,151,174,189,255,64,9,190,132,126,38,188,75,228,130,188,69,213,47,188,15,39,112,61,247,202,188,61,187,157,125,61,81,220,241,59,17,224,148,61,240,191,5,190,0,0,160,62,8,232,82,63,20,64,177,189,104,37,173,187,106,193,139,188,222,255,199,189,114,193,45,191,16,119,245,187,235,144,27,60,1,25,186,188,186,47,39,61,31,77,117,189,149,97,220,61,3,209,131,190,188,36,206,59,106,52,57,188,147,143,221,60,79,7,146,61,28,64,191,189,74,64,76,189,1,248,255,62,6,128,22,63,250,127,181,189,134,226,14,188,240,252,34,187,2,240,127,190,115,244,176,190,16,174,0,188,191,153,152,187,210,57,63,61,0,58,204,60,198,221,96,61,28,40,240,60,62,123,150,190,15,152,7,188,66,205,144,187,53,122,53,61,220,103,85,61,16,64,74,190,165,191,23,61,50,0,212,61,253,159,3,190,4,116,51,63,243,200,31,189,60,246,179,186,248,141,47,188,62,91,135,188,209,150,251,190,114,195,239,59,70,124,167,60,160,84,123,187,127,250,207,188,141,10,156,59,105,1,90,60,92,198,13,62,10,191,212,188,233,155,148,189,248,136,184,61,26,48,72,62,13,224,237,189,142,63,81,189,251,59,23,63,253,135,220,62,135,139,28,189,91,9,93,188,137,12,43,187,188,175,178,190,1,250,61,190,8,4,186,60,132,160,35,60,0,114,194,187,140,134,236,189,18,135,140,61,12,60,247,60,172,115,172,189,53,235,76,61,188,65,180,60,237,71,130,190,244,253,84,60,249,191,35,189,254,237,132,63,55,0,27,61,12,1,192,188,152,53,49,185,251,115,209,186,158,12,138,191,242,177,187,186,196,234,15,186,156,80,8,58,76,51,93,188,199,14,42,61,144,249,0,186,219,79,198,58,253,247,32,189,104,232,159,57,1,161,117,186,174,100,199,60,144,133,104,58,4,0,159,62,34,252,11,59,230,175,80,190,1,224,104,62,249,159,4,63,207,129,197,189,172,197,167,182,130,30,42,189,65,214,83,189,207,106,137,190,45,205,45,186,36,157,129,61,182,16,228,57,81,163,144,189,209,205,254,185,90,214,61,61,198,190,36,190,194,24,145,186,84,58,216,61,10,74,241,189,71,0,119,189,240,191,181,61,222,255,39,190,5,252,106,63,237,159,39,62,245,73,110,187,87,10,1,188,10,129,220,188,175,177,87,191,73,131,219,188,212,95,175,59,64,22,34,188,17,141,110,60,199,184,98,61,128,212,166,189,80,53,26,62,250,185,33,60,167,2,110,188,29,1,220,60,60,221,25,190,255,7,152,190,6,160,49,190,75,2,84,187,250,183,171,62,245,215,203,62,255,146,180,189,53,125,246,188,172,197,39,183,137,94,230,189,47,80,34,190,1,249,82,189,158,235,123,186,19,16,19,186,81,245,203,61,2,75,110,61,143,54,142,58,84,29,242,61,219,111,141,61,28,210,168,58,212,187,8,190,247,63,64,62,4,116,107,63,226,31,54,190,49,64,226,61,219,191,114,189,53,96,16,189,38,142,88,191,155,145,1,189,73,243,71,188,149,41,102,187,250,209,48,190,13,198,8,61,199,129,39,62,8,233,169,188,85,23,208,189,216,244,160,60,5,78,54,60,200,67,95,61,41,180,44,188,55,136,214,59,244,223,163,61,247,87,167,62,6,184,44,63,12,176,15,62,225,95,100,190,66,208,209,187,29,200,218,189,149,15,233,190,236,76,161,188,31,187,75,189,209,62,214,188,109,32,93,189,175,206,97,190,165,245,55,188,215,218,59,189,223,226,193,189,198,49,146,60,237,72,149,61,140,20,26,62,35,46,0,61,10,48,124,62,15,152,175,62,244,79,144,62,26,224,226,61,227,255,238,61,59,110,120,189,59,226,240,189,15,180,162,189,128,16,73,188,58,34,95,188,106,250,172,189,250,41,142,189,211,248,197,189,128,126,223,188,128,157,27,189,121,201,255,188,38,112,235,188,40,239,35,189,207,186,6,189,246,207,83,188,6,48,5,190,12,32,44,62,248,167,140,190,4,60,73,63,247,63,232,62,133,149,138,188,8,119,231,188,138,144,154,189,73,47,30,191,15,180,82,190,9,26,179,60,184,91,18,189,36,37,61,61,187,99,209,61,89,77,7,190,188,33,93,62,252,169,113,61,233,39,156,189,172,54,255,61,188,144,182,190,17,144,175,62,228,191,0,189,245,47,73,62,5,168,129,190,8,200,151,62,54,204,240,189,199,127,129,186,21,28,30,189,138,85,131,189,244,250,179,189,53,150,48,60,194,248,137,189,11,96,202,59,128,213,177,61,169,106,2,188,218,202,75,61,102,46,208,189,134,170,24,60,67,145,110,189,211,190,153,61,51,192,229,61,245,159,213,189,250,95,142,61,0,198,131,63,210,255,50,61,81,49,78,188,7,66,50,188,36,94,158,187,122,168,135,191,247,88,250,186,191,185,63,60,193,142,255,187,204,153,237,59,5,134,236,189,37,236,219,61,62,146,146,189,88,169,160,187,70,91,149,59,47,25,71,187,99,70,56,189,62,64,247,61,244,79,112,190,251,7,29,63,4,56,57,63,26,192,27,190,251,203,110,188,83,150,97,189,173,165,192,190,0,2,6,191,132,131,189,188,131,24,232,60,38,170,151,189,173,104,19,62,130,227,178,189,122,222,45,62,71,58,227,190,1,110,150,60,236,52,18,189,6,19,191,61,204,95,225,61,229,127,34,190,250,183,47,63,2,100,48,63,242,239,99,190,198,223,182,61,148,76,206,188,46,58,241,190,89,19,243,190,228,243,74,189,48,161,2,188,152,20,223,61,179,238,223,61,62,38,242,190,230,175,16,189,251,116,28,62,19,14,29,62,74,41,104,60,82,13,123,189,176,2,124,189,23,213,162,60,255,31,87,62,30,192,98,61,13,80,42,62,250,39,12,63,7,96,99,62,231,198,52,189,43,222,72,187,132,157,226,188,133,119,153,190,254,242,73,189,193,139,62,188,75,30,15,189,245,216,22,188,8,142,235,189,124,72,248,188,158,124,186,189,249,17,63,189,99,100,73,188,246,68,23,189,31,248,248,189,101,252,251,187,255,179,136,63,231,143,89,62,200,95,250,189,213,63,136,61,197,118,119,184,122,255,145,191,197,229,56,189,17,224,116,188,251,7,145,187,210,143,6,60,241,43,214,58,213,90,104,190,85,106,118,186,24,179,5,62,109,199,212,60,189,55,6,58,182,131,145,189,125,150,103,188,70,64,5,60,30,192,226,189,21,0,131,61,251,63,7,190,250,95,126,62,255,63,126,63,199,213,72,188,47,22,134,187,209,232,142,188,148,194,124,189,18,131,124,191,31,16,232,59,128,153,111,188,123,105,10,60,18,80,225,60,191,43,130,188,199,99,6,61,60,51,225,61,248,26,130,189,67,83,6,62,219,162,124,190,2,40,18,63,252,143,68,63,229,95,235,189,48,128,112,61,83,64,26,189,80,227,166,190,208,236,22,191,144,106,88,188,215,247,97,187,47,220,185,186,164,113,224,190,174,97,134,61,203,185,180,61,93,78,9,189,244,168,56,189,84,30,221,59,197,32,176,60,38,223,236,60,229,209,141,187,109,230,16,59,250,127,213,61,13,56,131,62,10,216,230,62,10,248,197,62,186,191,122,61,178,15,50,188,207,132,134,189,229,40,80,190,148,23,25,190,1,161,117,187,156,221,218,188,43,133,64,189,1,166,236,189,0,26,37,189,82,242,202,189,211,131,50,190,25,32,209,187,56,134,128,188,126,27,226,188,175,233,193,188,239,255,35,190,11,184,175,62,4,60,135,63,19,16,19,190,50,0,20,61,243,31,210,188,80,58,241,189,168,224,142,191,195,245,168,188,23,46,171,186,7,36,97,61,221,68,45,62,114,166,185,190,152,108,188,188,67,227,73,61,229,95,27,62,224,160,189,59,144,45,75,188,100,93,28,189,125,8,170,59,57,96,151,61,31,128,84,189,8,32,149,61,39,192,240,189,252,223,121,63,247,2,179,187,68,108,48,187,102,188,173,187,22,105,98,188,134,229,115,191,160,84,123,59,125,91,176,187,82,152,119,59,79,92,14,60,31,218,199,187,62,63,12,60,194,192,147,189,215,106,79,61,185,142,145,189,84,253,234,61,254,239,120,62,242,95,0,190,8,200,51,63,36,11,152,186,233,95,98,62,203,17,114,189,240,192,128,188,157,130,252,190,189,55,134,181,2,46,72,189,231,170,249,60,70,210,46,190,215,78,180,61,102,217,147,57], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer */ allocate([36,11,24,185,158,98,85,58,159,33,92,189,145,10,227,60,219,249,30,190,189,55,134,57,99,128,68,189,53,64,169,189,4,112,123,63,9,112,226,62,62,32,208,189,96,204,22,187,49,206,223,187,207,244,118,191,14,74,72,190,148,50,41,188,213,236,129,187,218,255,64,61,239,59,166,61,70,207,173,60,103,180,21,61,237,102,222,190,119,190,159,187,196,151,9,188,60,106,204,61,51,23,56,61,9,224,134,190,19,128,255,188,12,144,208,62,254,67,54,63,4,200,144,62,113,30,142,189,237,16,127,186,87,234,41,190,202,196,1,191,30,195,163,189,103,156,6,188,198,195,219,61,162,40,80,60,40,14,64,62,91,233,181,60,195,125,148,190,189,142,152,61,145,125,16,60,176,231,235,189,48,41,78,190,251,63,247,62,249,103,142,62,243,31,242,61,220,159,235,61,243,231,219,62,129,204,110,190,235,110,158,189,201,255,100,188,1,224,88,188,193,230,60,190,223,137,9,190,77,217,105,189,83,176,6,189,213,145,99,189,111,18,3,189,236,218,94,188,208,99,84,190,248,167,244,189,152,252,79,189,98,103,74,189,18,160,86,62,235,111,57,62,247,87,183,62,254,15,0,63,253,247,8,63,242,239,51,189,0,83,6,189,253,78,3,190,251,31,128,190,239,144,146,190,192,119,27,189,233,181,153,189,7,207,132,189,19,187,214,189,64,135,185,189,231,110,55,190,168,169,229,189,68,110,198,189,177,48,68,190,41,9,137,190,8,200,183,62,7,96,15,63,241,183,253,62,236,223,117,62,3,176,81,62,107,239,3,190,212,152,160,190,33,117,123,190,154,38,108,189,228,192,43,189,85,219,77,190,221,36,54,190,240,24,142,190,86,131,176,189,87,180,9,190,239,174,243,189,190,136,150,189,248,223,234,189,154,209,207,189,111,101,73,189,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,181,255,65,61,25,254,83,60,219,191,50,61,120,128,39,61,138,63,74,61,76,255,18,187,185,28,47,185,163,143,249,186,3,39,219,186,218,198,31,187,188,177,32,186,129,118,7,187,130,28,20,186,239,226,253,186,151,172,10,186,169,246,233,186,233,73,25,187,144,130,39,186,231,58,13,187,51,81,4,187,59,0,162,61,220,127,164,61,101,0,40,188,122,255,159,188,93,192,75,189,133,7,205,187,76,107,211,187,114,51,220,184,244,192,199,185,213,34,34,187,55,53,208,187,74,153,84,58,180,1,88,58,153,129,202,58,231,166,205,58,23,183,81,185,44,241,128,59,225,240,130,59,133,177,5,186,209,205,126,186,79,64,19,189,25,0,42,61,248,223,26,62,92,0,154,60,13,0,21,189,83,88,169,186,73,214,225,186,90,100,187,188,220,18,185,185,131,104,173,186,54,143,195,58,221,40,178,59,75,175,205,187,152,53,49,58,234,120,76,186,160,81,58,187,50,113,171,186,49,235,197,58,31,74,180,59,119,78,51,58,43,192,55,189,191,127,243,188,104,232,159,185,24,64,56,62,13,255,233,60,194,219,3,187,60,188,103,186,0,0,0,0,166,155,4,189,213,232,85,186,15,184,174,186,139,225,106,183,181,254,22,183,108,64,4,60,71,62,175,59,205,175,102,56,58,231,167,58,109,143,94,58,181,254,22,55,114,109,168,187,49,64,130,61,24,64,216,61,61,128,133,61,157,128,166,60,254,127,28,61,235,139,132,187,76,170,54,188,50,59,139,187,236,135,216,185,121,93,191,186,129,9,220,187,43,219,135,187,202,138,225,187,225,121,169,186,232,163,12,187,159,171,173,186,163,64,31,187,165,47,132,187,12,64,35,187,150,175,75,186,210,255,242,60,247,63,64,189,241,159,126,62,235,143,48,62,11,96,138,189,205,175,102,186,53,96,16,187,116,65,125,189,84,140,243,188,255,149,149,187,197,115,182,58,95,178,241,187,185,55,63,60,187,155,167,187,129,152,4,60,178,157,47,189,138,85,3,59,141,208,79,187,64,162,137,60,164,223,62,60,193,31,190,61,9,192,63,189,252,252,247,187,4,0,135,62,247,63,128,61,131,50,13,188,168,167,15,187,73,19,111,184,19,98,142,189,31,132,128,187,228,104,142,59,136,73,56,58,19,153,185,185,22,134,200,188,125,62,74,60,83,207,2,59,250,122,190,187,204,38,64,59,52,131,248,57,44,68,135,188,239,143,23,62,61,96,158,61,7,240,86,62,84,254,181,187,1,192,145,189,79,118,179,188,224,243,195,187,41,118,52,189,255,5,2,184,77,248,165,187,1,136,59,188,57,128,254,188,249,248,132,188,124,123,87,58,159,113,225,57,120,212,152,58,155,146,44,60,131,82,180,59,131,190,116,60,1,24,207,185,3,96,156,189,182,191,115,61,168,255,44,60,0,112,124,62,190,159,250,61,150,9,191,187,31,16,104,187,172,200,232,184,28,237,120,189,230,93,117,188,214,229,148,59,191,73,83,58,94,160,36,186,177,50,154,60,113,90,112,188,24,151,42,187,148,23,25,60,216,157,238,187,83,88,169,186,226,34,247,188,2,128,227,61,197,255,29,61,192,63,165,61,223,223,0,62,223,223,128,61,182,45,74,188,255,8,195,186,58,90,213,187,202,192,129,188,227,194,129,187,47,105,140,187,140,217,18,188,178,242,75,187,95,12,101,188,177,22,159,187,40,97,38,188,95,12,229,187,78,14,31,187,90,101,166,187,227,194,1,188,153,128,223,188,242,63,153,62,197,1,116,60,216,127,157,188,47,192,254,189,255,8,67,186,246,122,183,189,172,200,104,185,143,252,193,185,119,130,125,188,176,202,5,60,102,220,212,57,106,20,146,187,39,160,9,186,112,148,188,59,69,242,149,57,223,109,94,187,149,128,24,61,207,190,242,58,26,195,28,187,176,254,79,188,35,192,137,189,107,127,231,60,134,0,224,188,9,168,176,62,28,210,40,185,16,62,148,187,251,115,81,186,110,21,68,186,234,206,243,189,248,222,95,186,42,56,188,57,250,42,249,58,141,237,181,185,154,10,241,186,39,163,74,58,26,134,143,59,155,28,190,60,119,190,31,188,16,145,26,60,13,24,148,62,229,127,34,62,63,0,233,189,231,255,85,61,49,64,194,189,130,87,171,189,148,76,206,188,18,19,84,188,205,233,50,187,245,99,19,188,176,2,60,189,126,201,6,61,251,229,147,60,82,152,119,188,249,214,7,188,227,197,194,59,93,191,224,60,170,156,118,60,188,204,48,188,141,93,162,59,56,192,236,61,242,207,92,62,34,252,11,59,226,2,208,186,228,15,6,62,124,240,90,188,188,117,62,189,172,197,167,182,156,83,73,182,47,105,140,188,206,53,204,188,199,127,129,185,95,178,241,185,176,227,63,57,119,78,179,57,156,83,73,54,153,244,119,188,179,68,231,188,247,204,146,185,147,26,90,57,8,176,40,190,37,32,230,61,246,127,126,62,8,176,24,62,51,192,197,61,106,78,222,188,72,221,78,188,138,2,125,189,251,33,182,188,127,191,24,188,73,162,151,60,204,178,39,61,42,199,228,188,88,56,201,60,200,65,137,188,46,203,23,189,77,77,130,60,51,196,49,188,116,151,196,188,151,229,107,188,88,0,83,189,252,223,81,62,11,208,190,62,225,95,132,189,33,64,6,189,187,238,45,187,136,15,44,189,113,57,14,190,155,231,136,187,118,197,140,186,118,251,44,60,32,69,157,60,177,110,156,189,33,60,90,187,36,14,89,60,75,86,197,60,226,63,221,186,171,34,220,59,108,33,72,60,236,222,10,187,3,96,156,61,75,0,126,61,244,191,60,62,20,32,10,62,27,160,180,61,150,9,191,187,101,252,123,187,107,42,11,189,174,13,149,188,152,222,254,187,15,40,155,187,162,150,102,188,229,68,59,188,35,189,40,188,90,13,9,188,125,173,203,188,227,168,220,187,76,53,179,187,102,45,133,188,162,235,66,188,14,48,3,62,253,79,14,62,3,96,124,62,242,207,92,62,7,96,51,190,142,116,134,188,126,58,158,188,167,205,120,189,188,117,62,189,28,95,251,188,203,219,145,188,202,84,1,189,211,75,12,189,236,79,226,188,140,129,245,188,159,175,89,189,73,216,183,60,42,111,199,60,44,214,48,61,220,183,26,61,222,255,199,60,234,63,139,189,249,15,5,63,246,95,23,62,220,159,139,189,226,60,28,186,137,124,151,187,51,83,138,190,16,5,179,188,64,78,152,187,91,148,217,58,184,233,79,188,185,193,16,61,249,132,108,187,243,172,36,60,184,92,157,189,147,26,218,58,150,233,151,187,87,37,17,61,50,30,37,60,13,112,137,190,40,96,251,189,31,128,116,62,25,112,22,190,230,31,13,62,25,146,147,189,98,215,118,188,94,132,105,189,213,206,176,188,78,153,155,188,123,244,6,189,183,67,131,61,60,21,240,60,165,135,33,189,216,183,147,188,243,173,15,61,18,136,23,61,108,147,138,60,126,201,6,189,9,221,165,60,240,223,220,61,17,224,180,189,254,127,132,62,15,128,192,62,104,64,61,189,243,143,62,188,36,151,255,187,158,40,137,189,39,192,16,190,91,235,11,187,191,14,28,60,131,163,228,188,130,60,187,60,181,22,38,189,247,1,8,61,179,68,199,189,111,72,163,59,233,185,133,187,75,231,67,60,161,77,142,60,251,63,199,61,198,223,182,189,204,95,129,61,3,208,216,62,67,0,240,61,22,19,27,188,48,161,2,188,239,198,130,187,169,159,55,190,96,0,97,188,235,83,14,60,99,100,201,187,35,216,184,59,72,192,40,189,206,225,26,61,234,36,219,188,67,203,58,188,50,113,43,60,221,148,242,187,137,66,75,189,65,128,12,189,7,96,147,62,26,80,127,62,60,192,19,189,248,79,23,62,145,69,154,186,213,174,169,189,186,160,126,189,81,134,170,186,80,223,178,188,93,194,33,60,176,29,12,60,148,250,146,189,213,34,162,186,117,29,42,60,146,91,19,60,219,25,166,59,21,55,46,189,163,231,22,189,72,167,174,59,59,0,194,61,7,40,9,63,35,192,105,189,17,255,176,60,248,255,177,189,125,3,19,188,177,247,146,190,100,115,85,187,174,215,244,185,139,135,247,187,72,224,79,189,209,36,177,59,108,120,250,60,246,38,6,187,67,169,61,188,157,156,161,58,180,227,6,60,253,187,62,61,127,135,162,187,57,39,246,58,5,248,150,62,7,120,138,190,152,248,35,59,1,224,184,189,25,0,58,190,44,15,178,189,243,202,149,189,156,83,201,182,98,131,5,188,171,35,7,189,211,80,163,61,87,118,65,186,179,120,49,58,229,11,218,60,198,253,199,188,106,250,108,57,175,96,91,61,63,54,73,189,17,141,238,57,0,83,134,188,224,159,2,62,13,0,149,61,157,127,123,61,23,160,205,61,13,168,151,62,219,76,133,188,231,112,173,187,27,18,119,187,199,42,37,188,117,175,179,189,86,15,24,188,252,85,0,188,233,95,146,187,165,216,81,188,200,94,239,187,197,3,202,187,114,196,26,189,160,137,176,188,231,252,148,188,77,161,243,188,8,32,21,62,6,128,178,62,238,63,178,61,114,253,187,187,194,191,168,61,102,188,173,188,150,236,248,189,181,55,248,187,123,105,10,184,66,118,222,187,65,245,79,189,206,170,79,188,251,147,248,188,3,39,91,58,111,18,3,59,83,207,2,58,166,155,68,188,202,82,235,188,25,3,235,187,252,252,247,57,199,159,168,189,208,95,136,61,212,95,207,61,7,236,10,63,254,127,156,60,96,34,222,187,22,75,145,187,51,252,39,188,155,198,150,190,121,93,191,185,189,170,179,59,234,151,8,60,98,244,220,187,109,3,55,61,88,3,20,189,52,18,97,189,31,45,206,58,61,185,166,186,70,126,253,186,89,218,41,188,2,240,27,63,201,255,100,61,44,127,190,188,147,255,73,189,55,255,175,59,244,248,189,190,148,221,76,187,229,209,13,186,48,98,31,187,7,69,243,183,65,125,11,189,81,20,104,60,195,100,170,58,114,22,246,60,201,174,52,59,239,86,150,186,13,111,86,187,82,73,157,185,111,18,3,57,179,239,138,57,243,31,18,62,223,223,128,189,46,1,120,188,250,127,117,62,2,160,202,62,78,208,166,188,227,194,129,187,184,31,112,185,13,110,107,189,254,96,32,190,218,32,19,60,201,142,13,59,191,210,121,186,226,33,12,189,119,47,119,60,132,212,109,59,72,81,103,189,121,3,204,60,195,71,196,59,114,80,194,189,8,176,192,62,55,0,155,189,82,128,168,188,250,127,101,62,14,160,159,189,129,8,17,190,242,177,187,187,25,198,221,185,249,189,77,189,203,16,199,187,46,85,233,60,55,168,253,59,64,20,204,186,152,189,172,189,228,243,138,60,124,15,151,59,194,75,240,60,102,76,193,187,193,27,210,186,13,25,143,60,4,200,136,62,130,1,4,188,1,192,33,190,27,160,212,61,255,7,152,62,111,42,146,189,156,80,136,184,10,102,204,188,103,154,48,188,255,146,180,189,146,8,13,59,220,216,44,61,203,218,166,186,156,54,227,188,3,39,91,58,50,87,134,60,50,118,162,189,26,195,28,59,105,30,64,61,0,139,252,188,243,31,34,62,11,240,77,62,23,128,118,62,247,31,185,61,6,128,42,61,79,89,205,188,180,170,37,189,213,89,109,189,168,223,5,188,213,37,227,186,181,107,2,189,84,27,28,189,169,75,70,189,175,120,106,188,32,236,148,188,7,66,178,188,237,240,215,187,133,38,9,188,237,42,36,188,170,156,118,187,2,184,129,62,17,0,28,61,93,192,75,61,11,40,140,62,232,79,11,62,12,118,131,189,123,47,190,186,213,34,34,187,133,119,153,189,48,160,151,188,215,22,30,188,208,124,78,188,166,97,248,186,255,9,142,189,208,209,42,188,214,25,95,188,94,47,13,189,97,197,169,187,182,189,221,187,17,139,24,189,21,112,95,190,166,128,180,188,252,223,153,62,248,111,46,62,250,207,146,62,205,4,67,189,153,71,254,185,68,251,184,189,65,185,237,188,2,100,168,189,109,140,157,187,60,77,134,61,93,253,216,59,146,63,24,61,228,244,117,59,230,178,81,189,167,35,128,61,58,7,207,59,145,125,176,189,190,18,72,189,32,96,29,190,237,239,108,62,253,187,6,63,216,127,157,60,23,16,26,62,187,126,193,188,182,75,91,189,175,210,141,190,143,252,193,185,34,111,185,188,105,168,17,61,143,167,165,61,69,103,249,189,172,168,65,59,235,200,145,187,42,202,37,188,89,106,189,60,7,151,14,189,57,43,162,189,124,152,61,187,177,191,44,189,250,207,58,62,255,147,27,63,107,128,210,188,236,191,142,189,86,45,233,186,181,82,8,189,21,25,189,190,218,3,45,186,220,47,159,187,243,29,252,59,26,248,209,60,208,15,227,189,1,21,142,186,203,157,153,59,64,218,127,60,4,173,64,187,197,86,80,60,174,129,45,61,253,191,234,186,198,191,239,189,226,2,208,59,246,95,71,190,8,32,85,190,253,191,138,190,190,134,96,188,172,197,39,184,120,70,27,189,55,110,49,189,48,103,150,189,227,197,66,58,99,184,186,188,71,1,162,58,28,153,199,188,104,37,173,58,114,251,37,189,6,241,1,189,159,113,225,58,16,31,88,189,201,5,103,189,250,239,81,190,48,128,208,189,232,191,231,61,2,216,216,62,219,191,178,61,191,41,44,189,246,209,41,188,16,204,81,188,75,173,55,190,106,160,249,187,194,251,170,188,237,13,190,60,98,190,60,60,103,211,177,61,116,155,48,61,14,78,68,189,112,150,146,60,150,150,17,60,36,211,33,188,157,104,23,189,1,248,39,59,252,167,23,63,240,191,69,62,130,255,109,189,30,192,98,61,139,225,234,182,50,175,179,190,139,192,24,189,226,63,93,187,43,222,72,187,47,25,199,186,227,194,1,186,31,76,234,189,226,60,28,57,21,254,12,61,73,216,55,60,214,229,20,185,13,84,6,189,78,41,47,188,78,212,82,59,189,223,200,61,108,64,68,61,26,224,50,62,252,55,135,62,238,175,78,62,52,157,29,188,125,120,22,187,127,248,249,188,10,216,142,189,9,224,38,189,18,250,153,187,129,90,140,188,33,30,9,188,160,52,212,188,185,82,79,188,1,247,60,189,81,45,162,188,29,115,30,188,190,107,16,189,113,88,90,189,253,135,212,62,250,127,85,62,236,47,11,62,238,63,210,61,249,15,73,190,130,113,48,190,166,14,50,189,251,90,151,188,197,171,44,188,192,233,29,189,142,63,177,189,206,27,103,189,74,41,232,188,17,141,46,189,113,87,175,188,81,159,100,188,24,236,166,61,155,174,39,61,228,162,218,60,100,34,165,60,26,48,88,62,253,159,115,62,109,0,182,60,11,8,245,62,13,0,37,190,33,145,54,189,153,217,103,189,199,127,1,186,106,136,106,190,116,178,212,188,237,188,77,189,146,174,153,187,47,54,173,187,125,236,206,189,245,47,233,189,215,49,46,188,117,86,11,61,54,6,29,61,111,158,106,59,242,237,157,61,239,111,184,190,29,32,88,190,23,16,26,190,215,191,235,189,244,111,135,62,30,225,4,190,222,117,54,189,34,111,185,188,185,26,89,188,135,78,143,189,158,181,155,189,172,253,93,189,123,16,2,189,77,217,41,189,104,8,199,188,147,224,141,188,103,39,195,61,12,175,100,61,58,3,35,61,71,114,249,60,227,223,103,190,23,160,141,61,2,72,245,62,253,47,87,62,218,1,87,188,188,5,82,189,83,178,156,187,214,2,107,190,42,226,52,189,230,90,52,185,78,71,128,60,195,42,222,61,70,178,7,189,125,232,66,61,160,23,110,188,165,45,206,189,28,181,66,187,189,195,109,58,46,3,206,59,144,191,52,59,247,31,129,62,228,191,48,62,64,218,255,56,253,159,131,190,10,160,128,190,74,66,130,189,115,16,244,188,0,0,0,0,50,90,135,189,221,64,129,189,144,77,50,189,255,5,2,184,40,41,176,183,54,200,132,61,131,193,53,61,255,5,2,56,81,193,129,61,103,157,49,61,255,5,2,56,158,68,132,189,15,152,183,62,5,192,4,63,237,127,224,189,206,255,171,61,28,64,223,189,189,170,3,190,33,173,137,190,194,222,68,188,218,28,231,187,234,176,66,188,27,104,62,190,96,0,33,61,65,213,104,61,188,179,246,188,124,97,50,189,195,212,22,60,202,27,32,61,219,136,103,61,189,197,67,188,218,254,21,60,223,111,68,62,226,175,89,62,23,160,93,62,33,64,70,189,6,72,140,62,153,187,22,189,76,28,57,189,102,221,63,189,4,141,25,187,199,189,153,189,250,9,39,189,212,15,42,189,251,116,60,189,29,32,24,60,50,147,40,60,86,159,43,60,40,73,87,189,92,147,110,189,130,227,114,189,170,68,89,60,255,207,49,62,255,231,248,62,7,240,102,62,1,192,169,190,10,160,120,62,109,3,247,188,84,2,114,190,160,83,80,189,67,30,225,189,155,118,113,189,210,226,172,189,73,103,32,189,227,137,224,189,146,207,107,61,216,11,37,62,138,33,153,61,3,177,44,189,86,188,241,189,224,72,96,189,35,220,164,61,247,63,192,61,218,254,21,60,1,24,223,62,254,15,0,62,8,144,65,62,53,96,16,188,40,41,176,184,236,106,66,190,117,31,128,188,171,90,18,189,132,46,97,186,231,137,39,189,40,182,130,187,33,89,64,188,211,19,150,186,13,52,95,189,221,91,145,188,185,226,226,186,117,174,168,189,172,168,193,188,73,128,26,61,243,255,234,62,247,199,147,62,118,254,109,188,28,208,82,190,245,131,186,186,23,185,87,190,111,158,170,189,226,63,93,185,204,153,45,189,254,211,141,188,99,95,50,188,147,168,7,190,168,167,15,58,217,118,218,59,111,101,137,59,139,113,254,59,6,133,193,61,124,100,115,61,167,4,68,187,240,79,57,62,5,80,60,190,251,63,247,62,8,32,221,62,228,159,249,189,221,36,6,189,203,133,10,189,129,204,110,190,38,0,63,190,149,102,115,188,156,80,8,61,148,250,178,189,114,224,181,61,77,17,160,189,135,168,162,61,71,145,85,190,251,178,180,60,169,159,183,188,59,24,113,61,23,158,87,61,8,176,24,62,91,64,104,189,239,31,139,189,253,51,23,63,240,79,129,62,251,33,182,188,192,178,82,187,109,57,151,187,187,156,178,190,72,163,130,189,215,134,10,60,27,244,37,60,214,113,124,187,133,93,180,189,207,44,9,61,4,88,36,61,83,64,26,189,161,162,106,60,214,140,140,60,207,192,24,190,240,191,245,61,234,207,78,62,8,148,29,63,223,111,84,190,0,144,3,62,201,233,107,188,106,19,39,189,189,253,193,190,170,73,48,189,176,57,135,188,123,136,198,188,246,68,151,189,112,154,254,189,128,238,203,60,73,158,43,61,135,195,2,62,150,151,124,188,230,144,212,188,203,246,161,189,125,89,218,60,134,0,224,187,243,255,170,189,4,144,10,63,16,176,150,62,0,0,0,62,222,33,69,184,96,117,228,187,30,255,149,190,77,101,177,189,0,0,128,188,41,175,21,186,179,123,114,59,76,28,57,61,194,219,3,59,106,79,201,60,71,31,35,190,248,222,95,58,243,255,42,60,193,143,138,189,16,176,22,189,236,79,34,190,42,255,218,60,47,224,229,189,0,168,194,62,241,15,227,62,242,210,205,188,214,110,59,186,9,108,78,188,21,3,20,190,111,101,73,190,136,214,138,59,135,192,145,188,109,172,68,59,86,214,118,61,232,134,38,188,239,202,46,61,211,246,143,61,171,63,66,188,4,228,75,61,13,167,44,190,227,223,87,62,138,63,10,61,2,156,14,63,4,144,154,62,9,224,174,190,221,9,54,189,128,74,149,186,235,226,158,190,228,162,186,189,100,234,238,189,86,45,233,187,220,131,240,189,167,6,154,188,54,86,130,189,195,239,38,188,59,52,44,190,92,119,147,61,240,223,60,60,157,213,66,62,73,42,211,61,80,0,5,189,173,191,37,189,255,151,63,63,19,240,27,62,176,255,122,189,95,38,138,186,41,178,214,186,40,100,15,191,244,248,189,188,114,22,118,187,134,58,172,186,228,18,199,60,88,26,248,60,171,9,162,59,154,234,201,59,26,105,233,189,169,106,2,187,127,135,34,187,203,217,59,61,63,229,24,60,12,64,3,190,216,159,164,61,249,159,188,189,6,132,50,63,232,79,59,62,28,150,134,188,204,182,211,187,72,252,10,188,152,247,248,190,103,14,9,189,234,205,40,60,194,105,65,188,221,148,242,59,86,12,183,61,213,151,101,189,102,136,131,61,211,17,192,60,12,233,112,188,209,4,138,60,77,158,2,190,8,32,149,61,12,144,40,190,3,236,47,63,4,232,167,62,47,192,62,189,102,188,173,187,135,250,221,188,12,201,241,190,20,65,220,189,200,37,14,187,238,96,68,60,165,244,76,189,117,171,231,61,229,157,195,188,71,29,93,61,198,196,102,190,138,59,94,59,18,51,251,187,148,21,3,61,105,55,122,60,30,80,22,62,237,128,235,188,248,27,45,63,109,255,74,60,124,127,67,61,86,131,176,188,236,135,88,186,184,29,234,190,15,123,33,185,128,74,21,187,237,71,138,59,212,72,203,189,138,62,159,60,131,107,238,186,131,165,186,57,225,67,9,188,150,146,229,187,174,212,179,58,202,50,4,189,87,237,26,186,30,224,233,189,5,168,177,62,1,104,48,63,28,96,38,190,58,32,169,61,235,169,85,188,58,147,246,189,92,30,243,190,158,64,216,188,78,122,223,187,211,77,34,61,69,41,161,61,107,215,116,190,143,254,151,188,146,235,102,61,73,75,229,61,73,128,26,60,203,187,234,188,56,21,105,189,250,210,91,60,225,127,107,190,244,55,185,62,18,80,65,190,249,135,157,62,248,223,162,62,60,164,88,189,0,2,6,190,51,250,17,189,63,224,193,189,95,64,207,189,48,99,170,61,250,212,49,189,51,221,139,61,158,234,144,61,90,243,227,189,125,233,109,61,233,212,149,61,16,175,235,189,47,251,117,61,189,115,200,189,33,32,31,190,255,119,20,63,5,136,186,62,15,128,24,190,29,0,241,61,7,210,197,188,240,53,172,190,217,233,7,190,188,176,181,188,185,226,98,188,104,146,184,61,21,228,103,61,37,92,88,190,75,148,189,188,193,226,176,61,138,59,94,61,133,204,149,60,21,197,139,189,141,154,47,189,151,144,143,60,240,23,155,190,227,255,94,62,241,127,143,62,12,32,172,62,234,175,87,62,37,236,187,189,184,64,66,189,101,224,160,189,251,117,231,189,31,185,53,189,181,25,135,61,13,224,173,61,226,0,122,189,222,142,208,61,166,239,149,189,253,247,192,189,172,171,130,61,46,226,59,189,175,206,113,189,92,5,145,189,209,31,218,61,6,160,33,190,254,239,120,62,253,75,42,63,63,224,193,189,47,220,57,188,64,20,204,188,203,17,114,189,29,146,226,190,90,213,18,188,57,183,137,60,118,27,212,188,233,42,29,61,206,25,145,189,171,8,215,61,103,153,37,190,249,46,37,60,74,207,116,188,194,133,188,60,131,248,128,61,127,191,88,61,239,255,227,188,118,192,53,189,226,143,82,62,6,184,56,63,52,128,55,187,95,41,75,186,87,10,1,187,240,48,45,189,254,72,5,191,174,17,193,58,231,224,25,59,185,223,161,186,57,70,50,188,1,136,187,59,212,124,21,60,199,101,28,189,2,131,164,60,66,36,3,61,212,238,23,190,3,120,235,62,246,95,23,62,39,192,240,61,203,159,175,61,227,223,199,61,142,149,88,190,16,5,179,188,22,105,98,188,211,249,240,187,191,14,28,188,62,60,139,189,42,113,93,189,79,92,142,188,190,137,33,189,49,179,79,188,199,42,37,188,73,216,55,189,57,95,108,188,64,249,59,188,33,30,9,188,54,32,130,61,43,192,55,189,8,0,14,188,250,99,78,63,221,95,189,61,207,72,132,187,194,219,3,187,82,73,157,184,23,101,38,191,77,21,12,188,17,199,58,59,252,112,16,58,178,242,203,185,78,209,81,189,217,35,20,61,52,243,228,59,18,131,192,187,242,235,135,59,51,250,81,58,37,173,152,189,239,111,248,62,252,199,210,62,31,128,180,189,139,255,123,189,23,16,42,62,72,25,113,190,176,140,45,190,181,138,254,187,195,13,120,187,141,241,225,188,227,141,76,190,103,43,47,61,136,158,20,61,71,142,244,60,170,124,207,60,8,171,177,187,192,9,165,189,24,6,140,189,7,208,111,60,102,105,39,60,252,143,148,190,192,95,172,189,1,80,141,62,170,127,16,189,15,40,179,190,97,109,172,189,230,32,232,187,176,2,156,189,69,47,163,186,211,193,250,189,165,16,200,188,155,3,164,61,215,76,190,60,229,180,39,188,142,147,66,187,240,135,31,60,2,240,207,189,57,67,241,188,42,202,197,61,125,62,74,188,242,63,73,62,250,207,186,62,248,23,185,62,227,223,23,62,31,16,40,190,63,53,30,189,248,82,8,190,153,211,5,190,13,51,180,188,252,170,220,188,43,220,146,189,35,130,145,189,216,17,7,190,226,201,238,188,189,168,93,189,140,158,91,189,222,30,4,61,224,71,117,61,41,7,115,61,224,104,199,60,120,127,188,60,239,255,163,61,249,103,90,63,43,192,183,189,53,64,41,61,151,172,10,186,37,36,210,187,76,85,58,191,38,228,3,188,106,189,223,186,209,144,241,186,49,209,160,188,213,234,139,189,243,84,7,59,38,112,235,59,38,196,156,61,136,76,121,186,207,219,88,187,115,101,16,189,36,241,114,59,16,176,86,190,0,144,211,62,235,255,156,60,226,63,93,189,3,176,177,62,53,11,52,189,187,214,46,190,232,105,192,185,235,59,63,187,197,169,246,189,152,107,177,61,109,169,131,59,178,190,1,188,126,140,57,188,111,216,182,60,214,168,135,58,50,3,149,61,249,215,18,190,162,240,217,187,54,145,153,60,224,47,70,62,248,23,9,63,226,63,13,190,244,111,39,62,7,208,63,62,156,110,25,189,90,213,146,190,131,222,155,188,142,7,219,188,111,184,15,189,91,68,212,189,171,179,218,60,40,73,151,61,73,160,1,189,71,85,179,189,67,197,184,60,19,127,20,189,97,112,205,189,55,170,211,60,171,233,250,188,244,167,173,62,249,159,188,61,253,247,168,62,177,252,249,187,11,208,230,190,11,153,235,189,72,252,10,188,187,12,223,189,7,69,115,184,122,26,80,190,214,230,255,188,33,61,229,189,239,254,248,188,111,155,41,59,136,73,56,58,8,5,37,59,20,146,28,62,224,16,42,61,54,88,24,62,217,96,97,187,15,96,49,190,241,47,34,62,255,175,78,63,254,128,135,60,251,31,224,61,243,202,245,188,40,129,205,188,181,223,38,191,168,167,143,185,252,54,68,188,93,191,224,60,26,53,15,62,48,242,2,190,185,194,59,59,78,180,43,187,188,202,90,188,157,73,155,60,240,253,141,188,254,243,180,189,134,61,237,186,164,255,37,61,122,0,139,188,254,215,105,63,140,191,109,61,1,192,49,189,97,56,215,186,181,254,150,185,233,154,85,191,113,202,92,187,255,206,246,186,230,90,52,58,73,162,23,189,133,239,125,60,3,36,26,187,30,27,129,58,140,44,89,189,63,142,230,58,32,240,64,186,141,93,34,61,207,21,37,59,147,255,73,61,226,63,221,61,250,71,7,63,252,55,183,62,223,191,185,189,48,98,31,187,185,55,63,188,253,249,142,190,29,33,3,190,88,198,6,188,129,150,174,187,225,125,213,188,40,214,105,189,138,146,144,188,230,88,30,189,56,164,65,190,62,146,146,59,202,135,32,60,51,81,68,61,149,240,4,61,21,112,63,62,242,95,192,61,214,255,249,61,241,127,7,189,6,160,21,63,200,40,15,189,88,142,16,188,83,35,116,188,140,100,143,186,62,231,174,190,22,220,143,188,27,243,186,188,228,219,59,188,138,171,202,59,207,158,75,59,51,81,132,59,231,199,223,189,223,223,96,189,96,30,146,189,111,100,158,60,237,127,0,61,254,11,92,63,65,127,161,188,134,0,96,61,169,191,94,189,144,249,128,186,158,36,61,191,178,242,203,185,167,4,68,187,58,202,65,187,205,231,220,188,71,1,34,58,86,210,138,60,104,235,224,186,105,138,64,189,173,75,141,58,220,155,223,58,175,119,63,61,90,130,140,186,113,231,66,59,160,255,94,61,222,1,30,60,252,167,163,62,5,196,44,63,208,95,200,189,171,63,66,187,255,8,195,184,129,62,209,189,245,47,233,190,18,216,28,188,39,160,9,186,164,142,142,188,97,251,73,187,200,126,22,189,16,65,213,187,101,228,92,190,29,142,174,59,197,118,119,58,30,24,0,61,176,57,135,61,44,128,201,189,247,63,32,62,255,63,134,190,250,183,67,63,9,112,178,62,221,152,30,188,65,159,200,188,95,206,140,189,220,161,21,191,5,192,248,189,179,67,124,60,84,86,211,188,69,19,40,61,120,13,154,61,234,7,245,189,111,70,77,62,172,115,12,61,86,101,95,189,124,38,187,61,156,107,136,190,4,200,152,62,7,240,214,190,130,0,25,61,8,232,190,62,253,135,148,62,45,92,182,189,41,118,52,190,111,216,182,186,24,93,14,190,8,91,172,189,132,70,0,62,182,157,54,188,113,117,128,60,219,221,227,189,224,72,32,62,68,50,100,188,132,73,177,189,228,105,249,61,122,137,49,188,47,135,221,189,234,207,62,62,113,0,253,188,224,47,22,62,250,99,22,63,192,63,165,61,180,57,14,189,219,21,122,186,214,55,176,188,167,178,176,190,58,90,213,187,112,148,188,59,42,227,223,188,101,112,148,59,194,48,224,189,161,160,148,60,180,117,176,189,142,89,118,188,211,80,35,59,101,227,65,188,153,40,66,189,132,128,60,189,6,160,73,63,17,0,140,62,237,15,4,190,38,224,183,61,37,206,10,187,163,204,30,191,247,31,153,189,238,65,136,188,73,18,4,188,176,118,20,61,31,45,78,60,18,135,92,190,99,122,194,187,8,6,208,61,252,112,16,61,186,101,135,59,250,209,144,189,21,29,201,188,217,181,61,60,14,248,132,62,15,128,184,61,10,248,157,62,247,143,21,62,231,255,53,62,33,33,138,189,249,248,4,188,6,244,194,189,139,194,174,188,132,100,1,189,248,168,191,188,160,25,164,189,87,178,227,188,150,94,27,189,167,148,87,188,251,147,56,189,44,16,61,189,153,43,131,188,195,156,96,189,248,167,212,188,229,95,171,189,51,192,5,61,25,32,177,61,249,47,100,63,242,63,121,189,9,113,229,187,6,185,139,186,202,26,245,187,136,101,75,191,8,174,114,187,91,11,51,59,91,36,237,59,220,18,57,187,152,193,152,61,181,111,238,188,227,225,157,189,203,218,166,187,84,56,2,59,62,117,172,59,208,43,94,61,9,192,167,62,214,255,217,189,31,48,127,62,195,127,154,189,4,144,106,62,56,216,219,189,169,165,57,188,196,96,126,189,145,123,186,187,213,235,86,189,23,217,14,61,151,55,167,189,39,79,217,60,78,123,202,60,67,144,3,188,117,2,154,60,208,179,153,189,219,190,199,60,234,208,105,189,226,144,141,60,23,128,198,61,8,144,65,190,4,60,97,63,253,47,103,62,233,95,146,189,75,233,25,188,171,90,18,189,128,42,70,191,4,200,80,189,2,97,167,187,236,21,150,60,47,165,174,189,232,76,42,62,225,65,179,188,8,205,46,61,127,103,75,190,227,251,226,59,12,89,93,188,205,200,128,61,165,47,132,60,25,254,83,60,5,168,249,62,1,252,19,63,29,0,81,190,50,32,251,61,185,28,47,185,37,120,115,190,194,22,171,190,136,160,42,189,142,89,118,188,186,187,206,187,202,26,245,187,68,81,144,190,161,20,45,59,49,210,203,61,152,161,241,61,226,2,208,186,104,231,116,189,149,42,145,189,108,5,205,60,231,255,85,61,24,96,15,62,244,191,28,189,12,144,216,62,14,136,216,62,205,233,50,187,145,152,160,188,62,5,192,186,102,51,55,190,196,37,55,190,171,178,239,187,168,1,3,59,41,146,175,59,246,8,181,188,209,147,114,189,153,154,132,60,172,2,181,188,97,138,114,189,79,148,132,60,149,44,55,190,9,80,19,62,249,215,130,190,7,208,223,62,252,23,240,62,33,176,82,62,168,138,169,188,51,192,133,189,12,172,67,190,241,44,97,190,94,101,45,189,217,149,22,61,96,202,128,189,189,200,228,61,254,40,138,189,160,109,245,61,29,232,81,190,154,121,242,188,32,94,87,61,118,50,184,189,225,152,197,189,92,255,174,60,250,71,143,62,255,147,91,63,238,175,110,190,24,64,152,61,73,19,239,185,23,99,160,189,147,86,60,191,59,139,94,189,214,27,181,187,25,227,195,187,30,26,150,188,243,202,117,190,225,38,163,59,78,151,133,61,115,186,76,62,112,36,208,186,38,109,170,188,179,150,130,189,115,243,141,60,243,255,74,190,247,175,92,62,161,128,237,60,247,143,5,62,5,252,54,63,9,249,32,189,54,63,62,189,142,118,92,186,217,94,139,188,67,203,2,191,92,255,46,61,85,81,188,59,6,188,204,187,15,210,211,60,241,70,230,188,167,202,119,187,206,25,17,62,60,190,29,190,72,195,169,188,229,239,190,189,252,143,60,190,228,191,112,62,48,160,215,61,5,224,3,63,6,72,164,62,42,228,10,189,10,104,98,189,220,157,53,188,13,222,135,190,128,216,210,189,0,84,49,61,149,211,158,60,206,198,202,188,111,69,194,61,145,9,248,189,158,39,94,189,16,2,114,61,183,126,154,189,255,94,10,189,66,65,41,190,12,64,99,189,232,191,71,62,250,95,114,63,8,0,30,190,192,63,133,61,69,184,73,187,106,220,27,189,158,121,101,191,255,8,195,188,250,180,138,187,244,82,49,60,154,39,87,61,84,30,61,190,112,67,12,188,21,144,246,60,78,151,21,62,192,149,108,59,27,242,79,188,85,81,124,189,158,122,36,60,77,192,111,61,224,159,82,190,254,67,22,63,7,36,21,63,12,32,220,189,190,134,96,187,39,75,45,189,140,103,176,190,214,197,173,190,203,72,61,188,108,67,69,60,237,185,12,189,99,67,247,61,113,172,11,189,110,105,245,61,98,21,175,190,188,36,206,59,214,27,181,188,84,53,129,61,87,61,128,61,246,183,236,62,5,80,56,63,245,103,151,190,234,63,75,62,17,224,212,189,164,227,90,190,28,179,4,191,240,23,179,189,192,94,33,189,67,3,49,188,51,110,170,190,151,0,12,62,8,4,90,62,220,240,187,189,109,85,18,190,43,106,112,61,107,215,68,61,158,67,153,61,66,206,251,188,88,2,169,60,245,71,200,62,62,64,215,61,254,127,220,61,245,247,130,190,240,247,187,62,125,176,28,190,122,254,52,188,95,236,61,188,189,1,134,189,75,4,10,190,27,102,40,189,212,129,44,189,190,102,57,188,78,237,204,61,238,61,220,60,170,157,225,60,128,14,19,190,91,12,30,189,16,231,33,189,227,83,192,61,251,63,23,190,8,4,62,63,252,111,157,62,228,191,160,61,16,32,3,190,145,185,178,188,242,9,13,191,1,165,193,189,55,226,201,187,0,83,134,188,202,135,224,61,70,9,58,61,57,183,105,190,195,244,61,60,10,162,110,189,220,184,197,188,136,241,154,188,122,167,194,61,174,71,33,61,243,172,36,60,225,127,11,190,237,159,167,189,9,112,226,62,1,248,19,63,67,32,247,189,11,9,152,188,73,131,219,187,14,74,72,190,116,13,171,190,17,141,110,188,125,174,54,188,168,199,118,61,91,68,20,61,124,67,161,61,9,198,65,61,172,225,130,190,252,168,134,188,242,206,33,188,79,150,90,61,254,214,142,61,228,191,128,61,246,207,219,62,9,56,132,62,63,224,193,61,244,79,64,62,199,127,129,187,152,189,60,190,184,147,136,189,90,213,18,188,83,120,16,189,34,26,221,188,67,255,132,188,195,14,227,189,155,0,195,187,58,120,38,189,250,66,200,188,38,114,65,188,209,32,165,189,227,166,70,189,68,165,145,188,255,7,160,62,255,235,56,63,124,128,238,188,190,159,218,189,14,160,15,62,203,19,200,189,24,148,5,191,81,76,94,186,74,182,58,188,69,41,161,188,156,50,103,190,43,24,21,60,27,71,172,60,201,170,8,61,95,236,157,61,150,175,75,187,134,144,51,189,195,126,207,189,176,202,133,59,80,81,117,60,0,0,80,190,31,48,111,62,251,7,185,62,5,224,27,63,35,160,130,189,63,0,41,189,78,122,95,189,136,188,5,190,7,210,189,190,219,76,133,187,189,86,66,61,105,86,150,61,63,225,172,189,241,75,253,61,110,163,17,190,122,83,97,190,103,69,84,188,190,22,116,60,91,211,188,60,127,18,31,61,253,79,110,62,255,175,178,62,255,207,145,190,3,64,85,190,240,79,177,62,249,216,93,189,71,114,249,189,97,26,166,189,177,163,49,189,111,159,245,189,184,87,166,189,195,188,135,61,130,141,203,61,73,132,70,61,64,217,148,61,242,236,114,189,10,16,165,189,5,135,247,189,244,252,201,61,167,179,147,61,204,127,168,61,250,127,101,190,249,135,77,63,3,208,216,62,200,63,211,189,125,206,221,187,249,189,77,189,16,3,37,191,169,159,55,190,101,83,46,188,124,15,151,60,216,71,135,189,104,65,56,62,99,180,14,189,154,94,194,61,186,17,174,190,15,13,11,60,246,97,189,188,99,154,169,61,205,233,50,61,25,112,6,62,251,31,96,190,246,39,217,62,248,139,61,63,252,255,152,189,131,50,141,188,9,56,68,189,210,52,56,190,4,88,12,191,210,224,182,187,170,101,235,60,219,19,100,189,46,30,190,61,119,20,199,189,69,242,37,62,84,201,160,190,188,177,32,60,136,242,133,188,46,201,1,61,239,144,98,61,29,144,52,190,253,187,22,63,252,143,32,63,6,128,42,190,5,192,120,61,166,180,254,188,191,129,177,190,148,104,201,190,113,29,227,188,95,178,113,187,52,162,212,61,27,127,226,61,161,20,189,190,98,132,240,188,172,200,200,61,236,223,213,61,205,116,47,60,251,118,18,189,67,4,28,189,205,172,37,60,251,7,193,62,15,128,8,62,131,192,10,61,29,32,248,61,12,232,205,62,38,141,17,190,75,144,145,188,239,86,150,186,254,123,112,188,86,157,37,190,60,217,77,189,117,61,81,188,145,242,147,187,206,23,59,189,1,77,132,188,217,122,134,187,70,66,27,190,16,148,91,189,1,51,95,188,209,146,71,189,97,255,245,188,136,128,195,60,252,27,134,63,16,64,42,189,42,254,111,60,50,116,108,186,13,108,21,186,165,130,140,191,15,126,226,186,159,113,97,185,14,245,59,58,89,223,0,61,48,213,204,188,238,147,163,186,255,5,130,58,112,96,50,61,205,175,230,57,52,128,183,185,46,118,123,188,76,165,31,58,1,80,69,63,16,64,170,62,225,95,36,190,10,48,60,62,17,112,40,190,64,20,24,191,0,114,226,189,81,21,211,188,155,86,10,189,164,166,221,188,113,56,131,190,124,98,253,61,215,161,90,61,166,11,17,190,110,77,122,189,252,169,241,60,225,210,1,62,234,8,96,61,52,77,216,188,207,162,247,60,30,192,98,190,61,128,5,189,244,111,87,62,250,207,218,62,245,247,210,62,224,215,72,189,207,50,139,186,31,77,53,189,7,7,59,190,219,219,45,190,149,124,236,187,3,210,62,61,175,176,224,59,255,207,193,61,118,54,100,60,79,36,184,189,22,221,186,61,129,9,92,60,135,138,177,189,131,82,52,190,250,183,163,190,241,103,184,62,0,88,253,62,235,31,100,62,244,111,151,62,102,103,209,189,149,213,4,190,19,183,122,190,212,72,75,189,208,42,179,189,186,221,235,61,54,5,34,62,65,126,54,190,46,228,145,61,210,83,164,189,215,193,225,189,28,178,193,61,224,43,218,189,211,221,21,190,233,242,134,189,241,103,192,62,8,176,208,62,252,23,128,62,33,64,134,189,30,192,18,62,61,156,16,190,130,30,42,190,60,48,128,189,217,205,140,187,79,63,168,188,220,216,28,190,252,139,192,189,56,215,208,189,62,205,201,60,181,223,218,60,75,89,134,60,15,151,92,189,108,65,111,189,165,219,18,189,75,233,25,60,9,224,134,61,0,140,123,63,16,2,114,60,7,64,92,189,200,63,211,61,101,29,142,187,220,43,119,191,238,150,100,185,238,118,61,187,101,83,46,188,51,135,132,189,237,16,127,186,33,204,109,188,31,16,104,59,156,107,88,61,112,36,80,58,208,151,222,187,54,147,207,189,244,192,199,186,156,195,181,59,122,0,139,188,21,0,99,60,63,224,129,189,65,128,204,61,2,98,132,63,181,254,150,185,156,83,73,185,251,202,131,187,104,93,35,188,108,234,136,191,85,106,118,57,146,8,141,186,177,108,102,58,53,9,222,58,200,69,181,186,170,124,207,59,236,194,143,60,47,196,106,188,122,82,134,61,203,128,211,189,5,136,118,63,240,191,181,189,208,127,15,61,203,191,22,189,0,2,214,187,161,105,109,191,87,10,1,188,74,211,160,186,65,154,177,186,230,90,52,184,58,7,175,61,219,48,10,189,93,192,75,59,174,44,17,61,99,10,86,187,170,243,168,58,245,19,206,59,36,11,24,186,184,31,112,57,130,168,123,185,28,96,22,62,151,255,80,189,2,160,78,63,0,200,249,62,1,80,133,190,21,169,176,188,223,167,42,187,227,197,38,191,204,182,115,190,161,216,138,189,215,135,245,59,73,190,242,189,142,176,40,61,10,185,146,189,104,236,203,60,11,155,201,190,90,157,28,61,134,173,89,188,102,51,87,62,215,18,2,62,4,0,71,62,254,127,96,63,237,127,80,190,237,239,12,62,214,31,225,189,133,176,26,189,68,224,68,191,221,207,41,189,90,46,155,188,198,247,69,188,161,131,46,190,27,19,34,61,44,216,54,62,134,28,219,188,10,49,247,189,150,146,229,60,92,255,174,60,81,108,197,61,117,90,183,188,160,223,119,60,41,64,212,189,253,103,133,63,254,127,28,62,14,192,6,189,78,128,33,189,5,251,47,188,120,10,139,191,71,89,191,188,229,209,141,186,36,209,203,186,248,54,221,61,202,192,129,60,34,28,35,190,136,105,95,187,134,112,12,61,236,193,164,59,218,227,133,187,47,82,40,61,192,117,197,59,25,0,170,186,223,111,20,62,251,63,71,189,15,128,40,190,253,75,98,63,248,55,168,62,116,35,172,188,229,14,27,187,150,208,221,188,74,10,72,191,81,19,221,189,119,20,231,59,94,103,195,60,103,39,3,188,223,54,3,190], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+20480);
/* memory initializer */ allocate([209,33,48,61,241,242,20,62,123,19,67,189,175,236,130,60,54,114,93,61,95,179,148,190,26,48,40,190,14,160,31,62,3,64,141,190,8,148,21,63,7,124,38,63,223,254,220,188,203,16,199,188,9,223,155,189,50,203,174,190,38,138,216,190,98,189,209,60,19,153,57,189,3,38,48,61,89,138,196,61,173,136,186,189,199,15,37,62,76,193,218,61,56,158,207,189,200,183,55,62,223,140,194,190,246,95,135,190,12,120,137,190,222,31,207,189,15,128,152,62,247,119,230,62,249,44,143,189,102,163,147,189,87,147,39,188,188,176,181,189,225,123,79,190,187,99,145,189,241,15,219,188,17,114,222,188,65,73,161,61,214,199,163,61,130,196,246,60,47,191,243,61,102,132,247,61,96,119,58,61,111,74,9,190,2,160,90,190,245,103,231,62,0,140,27,63,22,80,40,62,226,175,57,190,61,181,58,189,241,44,81,190,175,5,189,190,193,82,221,188,83,176,6,189,44,159,197,61,94,214,4,62,120,154,140,190,173,189,15,61,79,36,152,189,43,137,204,189,159,147,30,189,18,217,167,61,13,166,225,61,182,43,244,60,251,231,209,62,235,255,108,190,254,215,241,62,231,223,46,62,23,16,90,62,164,28,44,190,18,105,91,189,133,120,100,190,112,235,238,188,211,190,57,189,151,83,194,61,115,76,70,190,189,228,223,61,128,99,143,189,247,228,33,61,55,52,165,189,113,204,178,189,42,225,73,61,21,1,206,189,144,245,20,189,255,119,164,62,248,167,24,63,17,112,88,62,56,160,133,61,26,48,120,190,181,83,211,189,228,15,182,190,34,253,54,189,78,126,139,187,140,157,112,189,120,38,68,190,15,13,139,189,161,16,1,190,53,178,171,188,242,92,31,189,165,243,97,188,247,114,159,61,105,255,19,62,128,213,81,61,93,140,129,60,40,96,155,61,27,160,36,190,3,8,131,63,30,224,233,61,176,0,166,60,212,156,188,187,254,186,211,188,96,34,134,191,235,169,85,188,124,123,215,185,237,213,71,60,199,13,159,189,22,134,40,62,115,243,13,188,157,101,150,60,203,105,239,189,41,117,201,186,43,132,85,59,82,239,169,188,122,166,23,187,26,48,40,62,20,64,49,62,245,15,66,62,7,120,178,62,244,135,150,62,223,254,220,188,222,114,245,188,168,28,19,189,10,214,248,189,116,7,177,189,8,230,232,188,13,254,254,188,125,93,6,189,6,128,106,189,226,34,119,189,241,73,135,189,176,202,69,189,21,115,80,189,143,56,100,189,21,226,209,189,239,111,136,62,34,0,56,62,240,79,225,62,33,176,98,62,25,32,145,61,55,110,145,189,108,64,4,189,194,77,70,190,144,187,72,189,51,135,164,187,247,32,68,189,53,42,240,189,141,241,161,189,152,161,113,189,66,238,34,189,157,131,199,189,133,176,154,188,19,158,80,188,151,117,255,188,6,130,128,188,252,255,88,63,7,240,118,62,110,192,39,189,254,15,16,190,6,160,81,62,254,240,55,191,215,49,110,189,200,206,219,186,238,36,162,188,173,166,43,189,97,81,81,190,81,49,14,61,242,206,33,60,235,58,244,61,253,245,10,61,41,207,188,187,138,176,49,190,1,52,74,189,11,93,9,60,250,237,235,60,1,104,220,62,15,184,182,62,2,16,55,62,8,232,2,63,15,208,149,190,244,194,61,190,35,106,2,190,113,231,2,189,214,224,133,190,113,87,175,189,101,80,29,190,40,156,157,189,13,169,130,189,60,105,97,190,34,222,58,190,80,56,187,189,169,251,0,62,52,219,213,61,246,65,86,61,198,54,25,62,254,239,8,190,250,151,72,63,3,120,15,63,24,176,116,190,20,32,202,61,95,127,146,188,220,45,29,191,146,206,160,190,152,223,105,189,133,148,31,188,133,153,214,61,196,124,153,61,233,213,224,190,63,227,2,189,203,186,63,62,4,33,9,62,109,60,88,60,196,96,158,189,189,140,98,189,35,49,193,60,14,136,152,190,255,231,76,63,9,56,180,62,99,127,217,188,254,215,129,62,156,195,181,189,142,2,36,191,182,189,253,189,192,207,56,186,15,183,131,189,73,45,116,62,227,193,214,61,247,63,144,190,242,152,1,188,148,22,174,60,197,27,25,60,124,186,154,61,144,219,79,190,145,208,182,189,127,160,220,59,9,24,245,62,7,64,156,189,101,254,81,60,6,16,222,62,3,152,162,190,210,166,106,190,22,190,190,187,106,247,43,185,165,159,64,190,101,137,206,189,24,152,21,61,128,16,201,187,60,48,128,58,19,154,84,190,97,137,7,61,70,40,182,187,155,170,27,62,204,121,198,188,162,93,133,59,225,9,13,62,28,240,25,190,251,63,255,62,7,92,99,63,230,63,116,190,220,127,228,61,138,33,185,188,124,128,126,190,78,236,73,191,175,9,105,189,178,242,75,188,196,124,153,61,28,183,8,62,112,177,226,190,202,222,18,189,169,136,243,61,150,236,88,62,136,103,137,60,241,212,99,189,179,239,202,189,130,3,218,60,66,96,197,189,149,127,173,60,235,0,136,188,246,239,42,190,7,124,122,63,178,44,24,188,195,103,235,185,24,180,144,185,61,71,228,188,102,22,117,191,76,194,5,59,23,183,209,186,164,140,184,57,251,202,131,188,117,171,103,59,170,153,53,187,79,31,193,61,72,195,169,188,35,18,133,60,74,65,39,62,241,183,197,190,42,0,166,61,254,39,159,62,15,184,158,190,7,8,238,62,192,180,24,190,40,73,215,187,109,229,197,189,7,207,196,189,193,82,93,190,122,53,0,61,149,216,245,61,215,103,206,188,145,43,245,189,35,215,205,60,247,89,197,61,61,215,55,62,125,89,26,189,68,252,19,190,238,147,19,62,32,96,77,62,16,232,140,190,248,167,48,63,7,68,44,63,242,239,35,190,248,194,36,189,13,29,155,189,234,206,243,190,216,214,231,190,1,246,209,188,51,21,98,61,187,184,13,190,7,120,66,62,244,50,10,190,182,162,61,62,140,191,237,190,186,132,3,61,54,119,52,189,62,65,226,61,140,161,220,61,10,248,173,62,3,122,139,63,2,160,106,190,1,192,145,61,190,191,1,189,25,114,236,189,106,251,151,191,49,9,87,189,77,248,165,187,24,119,131,186,37,145,189,190,101,113,159,61,126,169,127,62,60,23,198,188,124,209,158,189,41,148,133,60,75,87,48,60,179,97,13,61,132,212,237,187,216,183,19,59,250,127,5,190,50,0,212,188,7,240,110,63,14,160,159,62,8,0,206,189,75,61,139,188,240,162,47,186,25,3,95,191,69,16,199,189,248,197,37,188,84,30,93,187,106,52,249,61,156,222,197,60,95,123,38,61,165,47,4,60,97,252,148,190,233,215,86,188,24,151,42,187,53,69,192,61,75,114,0,61,20,176,13,62,6,16,78,190,26,80,31,62,254,101,129,63,51,192,69,189,250,213,156,188,22,222,37,189,144,73,198,188,234,207,130,191,177,195,24,187,26,25,228,60,100,89,176,188,209,60,0,61,46,60,15,190,55,80,80,62,124,13,33,190,231,227,218,59,170,43,31,188,214,30,246,59,205,232,71,61,223,111,100,62,32,96,237,61,238,63,82,190,9,56,196,62,3,120,67,63,111,215,75,189,72,26,92,188,210,172,44,189,224,101,22,190,3,64,21,191,15,210,211,188,250,156,59,61,6,244,194,60,122,23,175,189,191,241,53,189,45,39,161,61,76,108,46,190,125,63,181,189,93,137,32,62,175,210,149,190,253,159,251,62,234,207,14,62,9,136,193,190,12,144,160,62,255,151,187,62,30,83,119,190,180,87,159,188,89,78,18,190,148,104,201,189,133,119,9,190,57,95,140,189,46,57,62,62,200,237,87,61,162,209,29,190,133,36,51,189,135,195,242,61,57,99,56,190,47,77,81,189,95,209,13,62,55,81,235,189,231,0,193,188,31,48,15,190,1,248,239,62,1,108,112,63,18,48,42,190,107,125,17,186,157,45,160,188,233,240,96,190,176,202,97,191,136,71,226,188,38,224,87,187,129,233,52,60,67,56,134,61,150,65,181,60,137,121,6,62,179,93,225,190,202,81,128,187,208,97,190,188,240,135,159,61,191,212,31,62,25,144,45,62,224,159,146,189,252,255,120,62,3,92,76,63,244,191,28,62,252,86,235,188,1,248,167,187,64,49,114,189,192,34,35,191,119,244,191,188,225,209,70,60,15,209,40,189,82,157,142,60,34,141,10,190,55,24,106,61,143,197,70,190,181,140,212,188,97,141,51,60,37,119,24,189,108,66,250,189,248,223,234,189,221,95,221,61,232,191,39,190,254,129,130,63,197,31,229,61,174,127,87,188,63,110,63,188,44,215,219,188,144,16,133,191,26,20,77,188,201,28,75,60,75,233,153,188,94,16,145,60,11,122,239,61,78,182,225,189,99,9,43,62,29,57,82,60,184,33,70,188,154,36,150,60,2,157,233,189,2,128,131,61,255,119,140,62,7,124,114,63,57,96,183,61,17,0,124,190,59,26,135,187,40,39,154,189,180,174,101,191,188,89,3,188,220,15,120,189,110,79,144,188,88,29,121,189,107,13,133,190,27,98,188,187,138,60,201,188,100,177,173,189,25,113,129,60,90,70,138,61,7,178,110,62,191,130,180,60,12,32,60,62,227,255,30,62,0,200,217,62,9,56,236,62,233,127,249,61,138,63,10,189,86,130,197,188,170,68,57,190,47,247,89,190,220,43,115,188,92,175,233,188,246,9,160,189,32,67,135,189,167,150,173,189,242,182,146,189,237,243,72,190,92,88,183,188,186,245,154,188,41,64,84,189,67,56,102,189,252,199,162,190,49,96,233,189,251,35,8,63,2,188,33,63,195,159,193,61,142,3,207,189,10,191,84,188,154,204,144,190,20,92,204,190,176,112,18,188,220,100,20,189,66,34,45,62,181,55,120,61,197,174,77,62,139,112,147,61,45,5,172,190,50,60,246,60,61,129,48,60,78,240,77,189,114,167,116,189,11,208,134,190,251,3,5,63,230,63,100,61,245,215,235,62,18,48,42,190,227,252,141,189,75,58,138,190,65,125,75,187,61,70,89,190,136,71,226,188,114,24,12,62,6,103,112,60,240,48,237,188,82,101,248,61,207,21,117,190,203,71,210,188,188,62,51,189,106,219,176,61,115,187,23,60,235,201,156,61,8,4,74,63,19,96,152,189,252,255,24,62,31,160,219,61,14,248,196,62,81,106,31,191,85,103,181,187,235,226,182,188,127,106,60,188,202,140,23,190,254,123,112,61,179,120,241,189,20,36,54,60,223,79,173,189,90,186,2,60,171,66,131,188,181,110,155,190,200,122,234,60,38,112,107,189,1,251,40,189,246,7,202,62,247,31,129,62,233,239,69,62,250,127,69,62,246,7,178,62,155,112,31,190,74,66,130,189,254,10,25,189,251,93,24,189,23,158,247,189,133,206,203,189,139,53,156,189,8,173,71,189,240,220,155,189,213,60,71,189,3,181,24,189,254,127,12,190,99,152,179,189,248,166,137,189,96,89,137,189,12,64,99,190,6,216,151,62,0,196,147,63,9,224,166,189,128,127,74,61,94,186,73,189,58,33,180,189,91,149,170,191,248,139,217,187,132,43,32,187,138,202,134,61,187,43,131,62,153,74,175,190,205,34,148,188,174,245,197,60,160,164,192,61,231,195,51,60,227,56,112,188,97,197,105,189,80,253,131,59,1,48,10,63,240,191,245,62,2,128,35,61,11,240,125,190,10,128,177,190,161,47,149,190,255,232,107,190,54,204,208,186,71,228,123,189,154,36,246,189,147,167,132,190,86,131,176,188,86,243,156,188,220,18,9,62,244,196,243,61,106,47,34,60,148,160,63,62,128,100,42,62,199,184,98,60,23,18,176,189,208,95,232,61,27,160,36,62,249,47,16,63,252,255,120,61,5,224,19,63,120,237,82,188,254,186,211,188,26,108,162,190,151,56,114,187,2,214,170,190,38,110,149,188,172,225,130,189,193,113,185,189,158,8,226,187,239,30,32,188,50,62,12,189,92,58,134,189,1,48,190,189,125,147,166,190,191,212,15,189,22,80,56,62,0,144,63,63,4,200,32,63,2,127,248,188,25,112,118,190,183,178,4,189,42,88,15,191,56,245,201,190,40,44,113,186,109,59,109,189,100,235,9,190,35,132,231,189,65,159,240,190,205,233,178,59,65,243,185,60,241,18,156,60,43,109,49,61,52,104,56,62,139,198,26,62,215,52,239,187,252,111,53,190,59,0,194,61,6,76,104,63,8,200,27,63,21,255,247,188,11,152,0,189,125,3,19,188,209,201,82,191,146,151,189,190,184,31,112,186,153,126,137,60,64,163,36,62,179,9,176,189,66,209,220,61,17,27,108,189,121,91,13,191,126,196,175,187,14,245,59,59,196,8,225,60,188,233,150,60,255,175,74,62,248,167,0,63,10,16,237,62,28,208,82,62,25,112,6,62,41,122,32,189,219,80,129,190,177,134,91,190,204,153,45,189,131,50,141,188,19,186,203,189,108,177,187,189,19,71,110,190,121,233,38,189,239,228,211,189,168,55,195,189,152,224,212,188,134,32,135,189,202,251,120,189,211,105,221,188,7,124,22,191,42,254,111,59,250,207,90,62,242,119,167,62,3,152,30,63,37,235,176,190,147,26,90,183,7,7,59,189,122,27,219,189,254,127,196,190,89,25,13,59,232,159,0,62,62,66,77,186,243,226,68,62,54,6,157,186,16,36,143,189,180,115,186,62,129,179,20,187,92,142,7,190,6,127,79,190,11,208,214,190,17,144,31,190,241,47,170,190,245,47,9,190,11,8,245,190,108,64,52,190,243,232,198,188,136,71,226,189,200,9,147,188,106,136,106,190,218,227,133,189,87,206,14,190,254,38,84,189,105,59,102,189,37,4,171,188,48,103,54,189,229,155,77,190,187,185,152,189,88,229,34,190,64,79,131,189,1,80,85,190,241,159,142,189,8,176,144,62,8,176,84,63,12,200,246,62,232,189,49,189,192,236,158,187,30,141,163,189,246,179,48,191,8,229,109,190,197,174,109,188,146,31,113,61,244,55,161,60,0,57,49,62,143,253,108,61,110,106,112,190,169,161,205,61,141,125,9,61,28,122,11,190,66,7,205,190,255,207,137,62,13,112,177,190,241,47,250,62,233,127,121,190,1,48,110,62,170,96,148,189,10,248,245,189,178,129,116,190,195,41,115,189,52,157,93,189,28,10,191,61,4,175,6,190,131,104,45,62,97,80,134,61,225,238,172,189,187,213,243,61,38,57,128,189,97,23,165,61,159,199,232,189,11,36,104,61,2,216,176,62,8,60,52,63,226,175,9,62,59,0,226,188,255,7,224,62,143,83,244,189,218,200,253,190,130,28,148,188,216,125,71,186,23,14,68,190,155,2,121,190,247,57,62,189,63,224,193,189,134,31,28,60,252,28,159,60,178,18,115,59,156,194,26,190,44,186,157,190,248,252,112,189,114,197,69,60,226,31,54,62,226,31,54,190,32,208,89,62,230,207,119,190,4,172,85,63,155,145,1,189,155,145,1,189,198,81,57,189,231,226,111,189,168,87,50,191,155,145,1,61,174,244,26,189,174,244,26,61,207,76,48,61,207,76,48,189,128,216,82,61,4,3,24,190,4,3,24,62,133,204,53,190,119,214,78,62,9,24,245,62,250,95,238,61,19,128,127,61,252,199,10,63,247,31,249,62,210,166,106,190,110,248,93,188,38,0,127,187,125,120,150,190,97,111,114,190,143,56,100,189,245,156,244,188,75,229,237,187,93,222,132,190,12,58,129,189,165,130,10,189,27,131,110,190,14,249,103,189,169,162,248,188,233,13,135,190,249,187,87,63,255,235,20,63,191,127,179,61,44,128,201,61,61,96,222,61,79,205,53,191,108,67,173,190,73,185,251,187,221,152,30,188,216,42,65,188,42,255,250,190,112,68,151,189,178,214,80,189,74,206,169,189,63,111,106,189,124,71,13,188,237,101,187,189,167,92,129,189,49,237,27,188,192,7,47,188,3,208,84,63,12,200,166,190,13,80,170,62,30,112,13,190,57,96,215,61,45,233,48,191,51,80,217,189,120,156,226,189,119,73,156,188,207,48,53,188,30,165,138,62,175,148,141,190,192,233,221,61,70,39,235,61,148,74,56,189,211,48,60,61,78,10,179,189,5,80,12,61,73,73,15,189,68,250,109,60,249,135,165,62,249,215,2,63,2,160,10,63,239,111,240,62,5,80,204,62,52,17,214,189,51,192,133,190,184,33,150,190,24,210,97,190,140,15,35,190,118,53,41,190,141,69,51,190,103,180,141,190,3,120,27,190,138,199,117,190,177,50,130,190,252,27,4,190,27,218,80,190,166,69,93,190,122,228,63,190,32,55,0,0,176,81,0,0,0,0,64,62,0,0,128,62,60,0,0,0,0,0,0,0,60,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,255,255,255,255,1,0,0,0,0,0,0,0,255,255,255,255,2,0,0,0,254,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,1,0,0,0,255,255,255,255,1,0,0,0,254,255,255,255,1,0,0,0,255,255,255,255,60,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,255,255,255,255,1,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,60,0,0,0,254,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,0,0,0,255,255,255,255,1,0,0,0,1,0,0,0,2,0,0,0,255,255,255,255,1,0,0,0,255,255,255,255,60,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,255,255,255,255,0,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,60,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,254,255,255,255,0,0,0,0,255,255,255,255,1,0,0,0,0,0,0,0,255,255,255,255,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,0,0,0,1,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,2,0,0,0,254,255,255,255,0,0,0,0,255,255,255,255,255,255,255,255,60,0,0,0,2,0,0,0,60,0,0,0,0,0,0,0,0,0,0,0,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,254,255,255,255,60,0,0,0,255,255,255,255,0,0,0,0,60,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,2,0,0,0,60,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,60,0,0,0,0,0,0,0,60,0,0,0,0,0,0,0,0,0,0,0,60,0,0,0,60,0,0,0,255,255,255,255,0,0,0,0,0,0,0,0,60,0,0,0,60,0,0,0,1,0,0,0,0,0,0,0,60,0,0,0,2,0,0,0,60,0,0,0,254,255,255,255,254,255,255,255,0,0,0,0,0,0,0,0,222,143,155,61,0,0,0,0,242,7,35,62,2,216,64,62,2,16,247,61,250,239,161,62,1,52,146,62,2,44,138,62,250,207,146,62,10,16,53,62,252,255,168,62,0,88,181,62,249,159,188,62,241,159,134,62,2,40,190,62,6,160,225,62,230,87,115,62,10,100,214,62,8,58,14,63,4,28,226,62,244,251,246,62,0,172,238,62,2,160,210,62,248,141,15,63,0,0,0,0,8,232,174,62,10,72,203,62,254,39,19,63,4,4,31,63,5,164,253,62,0,0,0,0,0,0,0,0,249,135,189,62,7,36,209,62,248,83,11,63,249,21,35,63,6,216,43,63,0,0,0,0,4,202,14,63,251,145,38,63,240,167,214,62,6,44,21,63,2,70,31,63,0,0,0,0,251,31,36,63,0,0,0,0,249,45,50,63,239,111,248,62,0,0,0,0,5,138,12,63,4,230,45,63,251,149,62,63,5,196,52,63,1,24,59,63,4,170,51,63,250,151,48,63,0,172,74,63,250,11,77,63,7,210,69,63,1,110,78,63,248,249,59,63,248,221,84,63,0,0,0,0,8,200,71,63,249,219,58,63,3,148,74,63,253,79,78,63,250,209,20,63,250,185,85,63,250,179,63,63,0,0,0,0,7,10,68,63,250,9,95,63,0,0,0,0,253,17,50,63,8,118,72,63,2,130,101,63,253,135,108,63,8,172,76,63,250,241,47,63,3,238,97,63,250,239,85,63,253,163,107,63,0,0,0,0,8,90,61,63,249,219,106,63,255,5,42,63,1,138,113,63,0,0,0,0,1,104,116,63,2,242,101,63,1,138,81,63,253,221,95,63,253,189,116,63,2,158,112,63,252,57,117,63,253,131,124,63,251,31,120,63,8,172,120,63,248,111,82,63,255,151,115,63,252,53,113,63,248,193,89,63,250,185,109,63,3,148,114,63,0,0,0,0,1,80,121,63,253,245,118,63,250,153,118,63,4,170,71,63,5,250,116,63,0,0,0,0,253,191,102,63,0,114,98,63,250,207,82,63,4,198,118,63,255,231,112,63,4,58,115,63,254,69,108,63,250,43,112,63,255,179,122,63,0,0,0,0,253,107,113,63,0,0,0,0,251,149,106,63,8,228,98,63,0,0,0,0,252,23,120,63,254,209,63,63,6,72,72,63,6,74,110,63,0,0,0,0,254,97,103,63,252,113,111,63,0,0,0,0,7,180,100,63,254,157,109,63,255,175,86,63,253,217,115,63,251,229,91,63,2,16,111,63,250,71,119,63,1,24,99,63,0,0,0,0,5,54,95,63,0,116,96,63,250,123,117,63,253,193,92,63,250,185,65,63,0,0,0,0,0,0,0,0,0,0,0,0,255,177,44,63,7,152,89,63,0,0,0,0,0,0,0,0,6,44,61,63,253,131,64,63,253,17,54,63,0,0,0,0,0,0,0,0,4,198,50,63,253,193,40,63,0,0,0,0,2,100,72,63,0,0,0,0,2,42,116,63,0,112,68,63,250,155,12,63,0,0,0,62,9,224,70,62,1,192,81,62,3,96,108,62,254,127,132,62,11,240,149,62,15,96,185,62,243,143,190,62,2,16,199,62,248,79,207,62,243,143,214,62,10,48,220,62,249,15,233,62,10,48,236,62,242,207,236,62,6,48,5,63,2,16,11,63,252,167,11,63,250,71,19,63,6,128,26,63,255,175,26,63,253,159,27,63,252,143,28,63,3,64,29,63,7,152,37,63,1,104,40,63,1,104,40,63,1,104,40,63,0,112,48,63,2,40,50,63,254,39,51,63,250,39,52,63,6,104,59,63,6,104,59,63,249,47,64,63,5,24,66,63,8,0,70,63,253,191,70,63,255,119,72,63,255,119,72,63,254,239,72,63,3,64,73,63,251,231,73,63,251,231,73,63,2,128,75,63,254,71,78,63,252,23,84,63,253,191,86,63,250,151,88,63,252,223,89,63,255,63,90,63,254,127,92,63,254,127,92,63,7,8,94,63,249,103,94,63,3,152,94,63,4,0,95,63,8,200,95,63,1,248,95,63,3,96,96,63,3,96,96,63,7,240,98,63,3,96,100,63,6,48,101,63,6,48,101,63,249,215,102,63,3,120,103,63,5,80,104,63,253,135,104,63,253,135,104,63,0,200,105,63,2,128,107,63,3,96,108,63,3,64,109,63,250,39,112,63,249,15,113,63,248,111,114,63,248,223,114,63,0,144,115,63,7,208,115,63,6,72,116,63,253,247,116,63,251,231,117,63,249,103,118,63,1,24,119,63,5,80,120,63,1,192,121,63,252,55,123,63,1,248,123,63,6,184,124,63,6,184,124,63,252,55,127,63,249,191,127,63,4,32,128,63,4,32,128,63,252,195,128,63,254,39,129,63,253,107,129,63,255,207,129,63,255,207,129,63,0,56,130,63,1,224,130,63,2,72,131,63,0,60,132,63,2,16,133,63,253,47,133,63,0,84,133,63,4,4,135,63,4,116,135,63,252,223,135,63,253,191,136,63,0,228,136,63,3,124,137,63,2,240,137,63,2,188,139,63,3,96,142,63,253,135,142,63,255,179,142,63,4,4,143,63,255,31,145,63,1,76,145,63,0,116,146,63,2,160,146,63,2,160,146,63,254,243,146,63,255,31,147,63,1,252,147,63,254,123,148,63,255,91,149,63,3,180,149,63,254,239,150,63,254,239,150,63,254,215,151,63,0,28,153,63,3,124,153,63,254,215,153,63,254,215,153,63,254,39,155,63,1,220,156,63,3,208,158,63,255,203,159,63,3,204,160,63,2,16,163,63,252,27,164,63,253,79,164,63,253,135,164,63,255,151,165,63,255,203,165,63,255,3,166,63,254,127,172,63,253,247,172,63,252,111,173,63,4,172,173,63,3,204,176,63,2,12,177,63,0,112,184,63,2,16,189,63,254,155,191,63,254,155,191,63,1,48,192,63,252,195,192,63,0,60,194,63,0,0,200,63,253,135,202,63,3,36,204,63,1,224,210,63,253,219,215,63,253,79,220,63,254,215,221,63,254,209,15,64,0,0,0,62,2,128,35,62,255,63,110,62,253,47,143,62,15,240,156,62,243,255,170,62,4,32,206,62,245,15,218,62,247,175,220,62,247,63,240,62,7,64,8,63,251,231,13,63,250,95,18,63,249,103,22,63,249,103,30,63,5,192,44,63,254,71,46,63,5,136,50,63,248,23,57,63,1,48,58,63,1,48,58,63,250,127,61,63,253,159,63,63,254,215,69,63,2,16,71,63,1,248,75,63,250,39,76,63,251,119,77,63,250,71,79,63,255,119,80,63,250,127,85,63,250,127,85,63,252,223,89,63,2,160,90,63,253,247,96,63,7,40,97,63,251,175,103,63,250,71,107,63,250,183,107,63,250,183,107,63,3,96,112,63,248,111,114,63,253,247,116,63,253,247,116,63,251,231,117,63,1,192,121,63,8,0,122,63,6,128,122,63,250,183,123,63,255,119,124,63,2,184,125,63,255,63,128,63,255,231,128,63,254,39,129,63,0,140,129,63,3,176,129,63,253,19,130,63,2,72,131,63,2,244,131,63,0,116,134,63,253,187,134,63,2,188,135,63,253,191,136,63,253,19,138,63,0,60,138,63,1,52,140,63,0,168,140,63,3,208,140,63,2,128,143,63,4,228,149,63,255,31,151,63,3,96,152,63,254,215,153,63,4,232,155,63,1,108,158,63,253,103,159,63,253,51,161,63,3,176,163,63,255,151,165,63,255,151,165,63,0,28,167,63,253,131,178,63,4,88,182,63,3,148,228,63,3,92,238,63,0,0,0,0,35,135,8,60,219,185,118,66,219,185,246,65,127,234,164,65,0,0,0,0,0,0,0,66,0,0,192,66,0,0,0,0,0,72,15,70,0,72,15,70,0,72,15,70,0,72,15,70,0,196,32,70,0,96,52,70,0,100,74,70,0,20,99,70,0,200,126,70,0,240,142,70,0,98,160,70], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+30720);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


   
  Module["_memset"] = _memset;

  var _fabsf=Math_abs;

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  var _BDtoIHigh=true;

  var _BDtoILow=true;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  function _abort() {
      Module['abort']();
    }

   
  Module["_strlen"] = _strlen;

  var _sqrtf=Math_sqrt;

  var _floorf=Math_floor;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function ___errno_location() {
      return ___errno_state;
    }

  var _BItoD=true;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          }
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
      else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
      Browser.mainLoop.scheduler();
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");



Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "_fflush": _fflush, "_sysconf": _sysconf, "_abort": _abort, "___setErrNo": ___setErrNo, "_fabsf": _fabsf, "_sbrk": _sbrk, "_time": _time, "_floorf": _floorf, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_sqrtf": _sqrtf, "_emscripten_set_main_loop": _emscripten_set_main_loop, "___errno_location": ___errno_location, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var _fflush=env._fflush;
  var _sysconf=env._sysconf;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var _fabsf=env._fabsf;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _floorf=env._floorf;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _sqrtf=env._sqrtf;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var ___errno_location=env.___errno_location;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _Acodec_Encode($Dest,$Src) {
 $Dest = $Dest|0;
 $Src = $Src|0;
 var $$ = 0, $$$$$i$i$i = 0, $$$$$i$i$i280 = 0, $$$$i = 0, $$$$i$i$i = 0, $$$i = 0, $$$i$i$i = 0, $$$i11 = 0, $$$i25 = 0, $$$i68 = 0, $$0$i = 0, $$0$i$i$i = 0, $$012$i$i = 0, $$012$i10$i = 0, $$012$i101$i = 0, $$012$i108$i = 0, $$012$i115$i = 0, $$012$i122$i = 0, $$012$i129$i = 0, $$012$i136$i = 0;
 var $$012$i143$i = 0, $$012$i150$i = 0, $$012$i157$i = 0, $$012$i164$i = 0, $$012$i17$i = 0, $$012$i171$i = 0, $$012$i178$i = 0, $$012$i185$i = 0, $$012$i192$i = 0, $$012$i24$i = 0, $$012$i3$i = 0, $$012$i31$i = 0, $$012$i38$i = 0, $$012$i45$i = 0, $$012$i52$i = 0, $$012$i59$i = 0, $$012$i66$i = 0, $$012$i73$i = 0, $$012$i80$i = 0, $$012$i87$i = 0;
 var $$012$i94$i = 0, $$016$i = 0, $$04$i$i = 0, $$04$i1$i = 0, $$04$i106$i = 0, $$04$i113$i = 0, $$04$i120$i = 0, $$04$i127$i = 0, $$04$i134$i = 0, $$04$i141$i = 0, $$04$i148$i = 0, $$04$i15$i = 0, $$04$i155$i = 0, $$04$i162$i = 0, $$04$i169$i = 0, $$04$i176$i = 0, $$04$i183$i = 0, $$04$i190$i = 0, $$04$i22$i = 0, $$04$i29$i = 0;
 var $$04$i36$i = 0, $$04$i43$i = 0, $$04$i50$i = 0, $$04$i57$i = 0, $$04$i64$i = 0, $$04$i71$i = 0, $$04$i78$i = 0, $$04$i8$i = 0, $$04$i85$i = 0, $$04$i92$i = 0, $$04$i99$i = 0, $$07$i = 0, $$1$i = 0, $$14$i = 0, $$2$i = 0, $$2$i74 = 0, $$276 = 0.0, $$277 = 0.0, $$278 = 0, $$3$i = 0;
 var $$4$i = 0, $$Lid$0$i = 0, $$Minp$0$1$i = 0, $$Minp$0$2$i = 0, $$Minp$0$3$i = 0, $$Minp$0$i = 0, $$Olp$1$i = 0, $$Tm2$1$1$i = 0, $$Tm2$1$2$i = 0, $$Tm2$1$3$i = 0, $$Tm2$1$4$i = 0, $$Tm2$1$5$i = 0, $$Tm2$1$6$i = 0, $$Tm2$1$7$i = 0, $$Tm2$1$i = 0, $$mux$i = 0, $$not$i = 0, $$not76$i = 0, $$op$i$i = 0, $$phi$trans$insert = 0;
 var $$phi$trans$insert248 = 0, $$phi$trans$insert250 = 0, $$phi$trans$insert254 = 0, $$phi$trans$insert256 = 0, $$phi$trans$insert258 = 0, $$phi$trans$insert260 = 0, $$phi$trans$insert262 = 0, $$phi$trans$insert264 = 0, $$pr$pre = 0, $$pre = 0.0, $$pre212 = 0.0, $$pre213 = 0.0, $$pre214 = 0.0, $$pre215 = 0.0, $$pre216 = 0.0, $$pre217 = 0.0, $$pre218 = 0.0, $$pre219 = 0.0, $$pre220 = 0.0, $$pre221 = 0.0;
 var $$pre222 = 0.0, $$pre223 = 0.0, $$pre224 = 0.0, $$pre225 = 0.0, $$pre226 = 0.0, $$pre227 = 0.0, $$pre228 = 0.0, $$pre229 = 0.0, $$pre230 = 0.0, $$pre231 = 0.0, $$pre232 = 0.0, $$pre233 = 0.0, $$pre234 = 0.0, $$pre236 = 0.0, $$pre239 = 0.0, $$pre240 = 0.0, $$pre241 = 0.0, $$pre242 = 0.0, $$pre243 = 0.0, $$pre244 = 0.0;
 var $$pre245 = 0.0, $$pre246 = 0.0, $$pre247 = 0.0, $$pre249 = 0.0, $$pre251 = 0.0, $$pre252 = 0, $$pre255 = 0, $$pre257 = 0.0, $$pre259 = 0.0, $$pre261 = 0.0, $$pre263 = 0.0, $$pre265 = 0.0, $$promoted210 = 0.0, $$promoted211 = 0.0, $$sum = 0, $$sum$i = 0, $$sum$i$i$i = 0, $$sum1$i$i$i = 0, $$sum10$i = 0, $$sum100 = 0;
 var $$sum101 = 0, $$sum102 = 0, $$sum103 = 0, $$sum104 = 0, $$sum105106 = 0, $$sum107108 = 0, $$sum109110 = 0, $$sum11$i = 0, $$sum111 = 0, $$sum112 = 0, $$sum113 = 0, $$sum114 = 0, $$sum115 = 0, $$sum116 = 0, $$sum117 = 0, $$sum118 = 0, $$sum119 = 0, $$sum12$i = 0, $$sum120 = 0, $$sum121 = 0;
 var $$sum122 = 0, $$sum123 = 0, $$sum124 = 0, $$sum125 = 0, $$sum13$i = 0, $$sum14$i = 0, $$sum15$i = 0, $$sum159 = 0, $$sum16$i = 0, $$sum160161 = 0, $$sum162163 = 0, $$sum164165 = 0, $$sum166 = 0, $$sum167 = 0, $$sum168 = 0, $$sum169 = 0, $$sum17$i = 0, $$sum170 = 0, $$sum171 = 0, $$sum172 = 0;
 var $$sum173 = 0, $$sum174 = 0, $$sum175 = 0, $$sum176 = 0, $$sum177 = 0, $$sum178 = 0, $$sum179 = 0, $$sum180 = 0, $$sum181 = 0, $$sum2$i$i$i = 0, $$sum9596 = 0, $$sum97 = 0, $$sum98 = 0, $$sum99 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0;
 var $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0.0, $1015 = 0, $1016 = 0.0, $1017 = 0, $1018 = 0.0, $1019 = 0, $102 = 0;
 var $1020 = 0.0, $1021 = 0, $1022 = 0.0, $1023 = 0, $1024 = 0.0, $1025 = 0, $1026 = 0.0, $1027 = 0, $1028 = 0.0, $1029 = 0, $103 = 0, $1030 = 0.0, $1031 = 0, $1032 = 0.0, $1033 = 0, $1034 = 0.0, $1035 = 0.0, $1036 = 0, $1037 = 0.0, $1038 = 0;
 var $1039 = 0.0, $104 = 0, $1040 = 0, $1041 = 0.0, $1042 = 0, $1043 = 0.0, $1044 = 0, $1045 = 0.0, $1046 = 0, $1047 = 0.0, $1048 = 0, $1049 = 0.0, $105 = 0, $1050 = 0, $1051 = 0.0, $1052 = 0, $1053 = 0.0, $1054 = 0.0, $1055 = 0, $1056 = 0.0;
 var $1057 = 0, $1058 = 0.0, $1059 = 0, $106 = 0, $1060 = 0.0, $1061 = 0, $1062 = 0.0, $1063 = 0, $1064 = 0.0, $1065 = 0, $1066 = 0.0, $1067 = 0, $1068 = 0.0, $1069 = 0, $107 = 0, $1070 = 0.0, $1071 = 0, $1072 = 0.0, $1073 = 0.0, $1074 = 0.0;
 var $1075 = 0.0, $1076 = 0.0, $1076$phi = 0.0, $1077 = 0.0, $1078 = 0.0, $1079 = 0.0, $1079$phi = 0.0, $108 = 0, $1080 = 0.0, $1081 = 0.0, $1082 = 0.0, $1082$phi = 0.0, $1083 = 0.0, $1084 = 0.0, $1085 = 0.0, $1085$phi = 0.0, $1086 = 0.0, $1087 = 0.0, $1088 = 0.0, $1088$phi = 0.0;
 var $1089 = 0.0, $109 = 0, $1090 = 0.0, $1091 = 0.0, $1091$phi = 0.0, $1092 = 0.0, $1093 = 0.0, $1094 = 0.0, $1094$phi = 0.0, $1095 = 0.0, $1096 = 0.0, $1097 = 0.0, $1097$phi = 0.0, $1098 = 0.0, $1099 = 0.0, $11 = 0, $110 = 0, $1100 = 0.0, $1100$phi = 0.0, $1101 = 0.0;
 var $1102 = 0.0, $1103 = 0.0, $1104 = 0.0, $1105 = 0.0, $1106 = 0.0, $1107 = 0.0, $1108 = 0.0, $1109 = 0.0, $111 = 0, $1110 = 0.0, $1111 = 0.0, $1112 = 0.0, $1113 = 0.0, $1114 = 0.0, $1115 = 0.0, $1116 = 0.0, $1117 = 0.0, $1118 = 0.0, $1119 = 0.0, $112 = 0;
 var $1120 = 0.0, $1121 = 0.0, $1122 = 0.0, $1123 = 0.0, $1124 = 0.0, $1125 = 0.0, $1126 = 0.0, $1127 = 0.0, $1128 = 0.0, $1129 = 0.0, $113 = 0, $1130 = 0.0, $1131 = 0.0, $1132 = 0.0, $1133 = 0.0, $1134 = 0.0, $1135 = 0.0, $1136 = 0.0, $1137 = 0.0, $1138 = 0.0;
 var $1139 = 0.0, $114 = 0, $1140 = 0.0, $1141 = 0.0, $1142 = 0.0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0.0, $1148 = 0.0, $1149 = 0.0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0;
 var $1157 = 0, $1158 = 0.0, $1159 = 0.0, $116 = 0, $1160 = 0.0, $1161 = 0.0, $1162 = 0.0, $1163 = 0.0, $1164 = 0.0, $1165 = 0.0, $1166 = 0.0, $1167 = 0.0, $1168 = 0.0, $1169 = 0.0, $117 = 0, $1170 = 0.0, $1171 = 0.0, $1172 = 0.0, $1173 = 0.0, $1174 = 0.0;
 var $1175 = 0.0, $1176 = 0.0, $1177 = 0.0, $1178 = 0.0, $1179 = 0.0, $118 = 0, $1180 = 0.0, $1181 = 0.0, $1182 = 0.0, $1183 = 0.0, $1184 = 0.0, $1185 = 0.0, $1186 = 0.0, $1187 = 0.0, $1188 = 0.0, $1189 = 0.0, $119 = 0, $1190 = 0.0, $1191 = 0.0, $1192 = 0.0;
 var $1193 = 0.0, $1194 = 0.0, $1195 = 0.0, $1196 = 0.0, $1197 = 0.0, $1198 = 0.0, $1199 = 0.0, $12 = 0, $120 = 0, $1200 = 0.0, $1201 = 0.0, $1202 = 0.0, $1203 = 0.0, $1204 = 0.0, $1205 = 0.0, $1206 = 0.0, $1207 = 0.0, $1208 = 0.0, $1209 = 0.0, $121 = 0;
 var $1210 = 0.0, $1211 = 0.0, $1212 = 0.0, $1213 = 0.0, $1214 = 0.0, $1215 = 0.0, $1216 = 0.0, $1217 = 0.0, $1218 = 0.0, $1219 = 0.0, $122 = 0, $1220 = 0.0, $1221 = 0.0, $1222 = 0.0, $1223 = 0.0, $1224 = 0.0, $1225 = 0.0, $1226 = 0.0, $1227 = 0.0, $1228 = 0.0;
 var $1229 = 0.0, $123 = 0, $1230 = 0.0, $1231 = 0.0, $1232 = 0.0, $1233 = 0.0, $1234 = 0.0, $1235 = 0.0, $1236 = 0.0, $1237 = 0.0, $1238 = 0.0, $1239 = 0.0, $124 = 0, $1240 = 0.0, $1241 = 0.0, $1242 = 0.0, $1243 = 0.0, $1244 = 0.0, $1245 = 0.0, $1246 = 0.0;
 var $1247 = 0.0, $1248 = 0.0, $1249 = 0.0, $125 = 0, $1250 = 0.0, $1251 = 0.0, $1252 = 0.0, $1253 = 0.0, $1254 = 0.0, $1255 = 0.0, $1256 = 0.0, $1257 = 0.0, $1258 = 0.0, $1259 = 0.0, $126 = 0, $1260 = 0.0, $1261 = 0.0, $1262 = 0.0, $1263 = 0.0, $1264 = 0.0;
 var $1265 = 0.0, $1266 = 0.0, $1267 = 0.0, $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0.0, $1273 = 0.0, $1274 = 0.0, $1275 = 0, $1276 = 0.0, $1277 = 0.0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0;
 var $1283 = 0, $1284 = 0, $1285 = 0, $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0.0, $1293 = 0, $1294 = 0, $1295 = 0.0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0.0, $130 = 0;
 var $1300 = 0.0, $1301 = 0, $1302 = 0, $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0.0, $1307 = 0, $1308 = 0, $1309 = 0.0, $131 = 0, $1310 = 0.0, $1311 = 0.0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0.0, $1316 = 0, $1317 = 0.0, $1318 = 0.0;
 var $1319 = 0, $132 = 0.0, $1320 = 0, $1321 = 0.0, $1322 = 0.0, $1323 = 0, $1324 = 0, $1325 = 0.0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0.0, $1335 = 0, $1336 = 0;
 var $1337 = 0, $1338 = 0, $1339 = 0, $134 = 0, $1340 = 0, $1341 = 0.0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0;
 var $1355 = 0, $1356 = 0, $1357 = 0, $1358 = 0, $1359 = 0, $136 = 0.0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0.0, $1364 = 0, $1365 = 0.0, $1366 = 0, $1367 = 0.0, $1368 = 0, $1369 = 0.0, $137 = 0.0, $1370 = 0, $1371 = 0.0, $1372 = 0;
 var $1373 = 0.0, $1374 = 0, $1375 = 0.0, $1376 = 0, $1377 = 0.0, $1378 = 0, $1379 = 0.0, $138 = 0.0, $1380 = 0, $1381 = 0.0, $1382 = 0.0, $1383 = 0, $1384 = 0.0, $1385 = 0, $1386 = 0.0, $1387 = 0, $1388 = 0.0, $1389 = 0, $139 = 0, $1390 = 0.0;
 var $1391 = 0, $1392 = 0.0, $1393 = 0, $1394 = 0.0, $1395 = 0, $1396 = 0.0, $1397 = 0, $1398 = 0.0, $1399 = 0, $14 = 0.0, $140 = 0.0, $1400 = 0.0, $1401 = 0.0, $1402 = 0.0, $1403 = 0, $1404 = 0.0, $1405 = 0.0, $1406 = 0.0, $1407 = 0, $1408 = 0.0;
 var $1409 = 0.0, $141 = 0.0, $1410 = 0.0, $1411 = 0, $1412 = 0.0, $1413 = 0.0, $1414 = 0.0, $1415 = 0, $1416 = 0.0, $1417 = 0.0, $1418 = 0.0, $1419 = 0, $142 = 0.0, $1420 = 0.0, $1421 = 0.0, $1422 = 0.0, $1423 = 0, $1424 = 0.0, $1425 = 0.0, $1426 = 0.0;
 var $1427 = 0, $1428 = 0.0, $1429 = 0.0, $143 = 0, $1430 = 0.0, $1431 = 0, $1432 = 0.0, $1433 = 0.0, $1434 = 0.0, $1435 = 0, $1436 = 0.0, $1437 = 0.0, $1438 = 0.0, $1439 = 0, $144 = 0.0, $1440 = 0.0, $1441 = 0.0, $1442 = 0, $1443 = 0.0, $1444 = 0.0;
 var $1445 = 0.0, $1446 = 0, $1447 = 0.0, $1448 = 0.0, $1449 = 0.0, $145 = 0.0, $1450 = 0, $1451 = 0.0, $1452 = 0.0, $1453 = 0.0, $1454 = 0, $1455 = 0.0, $1456 = 0.0, $1457 = 0.0, $1458 = 0, $1459 = 0.0, $146 = 0.0, $1460 = 0.0, $1461 = 0.0, $1462 = 0;
 var $1463 = 0.0, $1464 = 0.0, $1465 = 0.0, $1466 = 0, $1467 = 0.0, $1468 = 0.0, $1469 = 0.0, $147 = 0, $1470 = 0, $1471 = 0.0, $1472 = 0.0, $1473 = 0.0, $1474 = 0, $1475 = 0.0, $1476 = 0.0, $1477 = 0.0, $1478 = 0.0, $1479 = 0, $148 = 0.0, $1480 = 0;
 var $1481 = 0, $1482 = 0, $1483 = 0, $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0.0, $1489 = 0, $149 = 0.0, $1490 = 0.0, $1491 = 0, $1492 = 0, $1493 = 0.0, $1494 = 0.0, $1495 = 0.0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0.0;
 var $15 = 0.0, $150 = 0.0, $1500 = 0.0, $1501 = 0, $1502 = 0, $1503 = 0.0, $1504 = 0.0, $1505 = 0, $1506 = 0, $1507 = 0.0, $1508 = 0, $1509 = 0.0, $151 = 0, $1510 = 0.0, $1511 = 0, $1512 = 0, $1513 = 0.0, $1514 = 0.0, $1515 = 0, $1516 = 0;
 var $1517 = 0.0, $1518 = 0, $1519 = 0.0, $152 = 0.0, $1520 = 0.0, $1521 = 0, $1522 = 0, $1523 = 0.0, $1524 = 0.0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0.0, $1529 = 0, $153 = 0.0, $1530 = 0.0, $1531 = 0.0, $1532 = 0, $1533 = 0, $1534 = 0.0;
 var $1535 = 0, $1536 = 0.0, $1537 = 0.0, $1538 = 0.0, $1539 = 0, $154 = 0.0, $1540 = 0, $1541 = 0.0, $1542 = 0, $1543 = 0.0, $1544 = 0.0, $1545 = 0.0, $1546 = 0.0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0.0, $1552 = 0;
 var $1553 = 0.0, $1554 = 0.0, $1555 = 0, $1556 = 0, $1557 = 0.0, $1558 = 0, $1559 = 0.0, $156 = 0.0, $1560 = 0.0, $1561 = 0.0, $1562 = 0, $1563 = 0, $1564 = 0.0, $1565 = 0, $1566 = 0.0, $1567 = 0.0, $1568 = 0.0, $1569 = 0.0, $157 = 0.0, $1570 = 0;
 var $1571 = 0, $1572 = 0, $1573 = 0, $1574 = 0.0, $1575 = 0, $1576 = 0.0, $1577 = 0.0, $1578 = 0, $1579 = 0, $158 = 0.0, $1580 = 0.0, $1581 = 0, $1582 = 0.0, $1583 = 0.0, $1584 = 0.0, $1585 = 0, $1586 = 0, $1587 = 0.0, $1588 = 0, $1589 = 0.0;
 var $159 = 0, $1590 = 0.0, $1591 = 0.0, $1592 = 0.0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0.0, $1598 = 0, $1599 = 0.0, $16 = 0.0, $160 = 0.0, $1600 = 0.0, $1601 = 0, $1602 = 0, $1603 = 0.0, $1604 = 0, $1605 = 0.0, $1606 = 0.0;
 var $1607 = 0.0, $1608 = 0, $1609 = 0, $161 = 0.0, $1610 = 0.0, $1611 = 0, $1612 = 0.0, $1613 = 0.0, $1614 = 0.0, $1615 = 0.0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0.0, $1620 = 0.0, $1621 = 0, $1622 = 0.0, $1623 = 0.0, $1624 = 0;
 var $1625 = 0, $1626 = 0.0, $1627 = 0, $1628 = 0.0, $1629 = 0.0, $163 = 0, $1630 = 0.0, $1631 = 0, $1632 = 0, $1633 = 0.0, $1634 = 0, $1635 = 0.0, $1636 = 0.0, $1637 = 0.0, $1638 = 0.0, $1639 = 0, $164 = 0.0, $1640 = 0, $1641 = 0, $1642 = 0.0;
 var $1643 = 0.0, $1644 = 0, $1645 = 0, $1646 = 0.0, $1647 = 0.0, $1648 = 0.0, $1649 = 0, $165 = 0.0, $1650 = 0, $1651 = 0.0, $1652 = 0.0, $1653 = 0.0, $1654 = 0.0, $1655 = 0, $1656 = 0, $1657 = 0.0, $1658 = 0, $1659 = 0, $166 = 0.0, $1660 = 0.0;
 var $1661 = 0.0, $1662 = 0, $1663 = 0, $1664 = 0.0, $1665 = 0.0, $1666 = 0.0, $1667 = 0, $1668 = 0, $1669 = 0.0, $167 = 0, $1670 = 0.0, $1671 = 0.0, $1672 = 0.0, $1673 = 0, $1674 = 0, $1675 = 0.0, $1676 = 0, $1677 = 0, $1678 = 0.0, $1679 = 0.0;
 var $168 = 0.0, $1680 = 0, $1681 = 0, $1682 = 0.0, $1683 = 0.0, $1684 = 0.0, $1685 = 0, $1686 = 0, $1687 = 0.0, $1688 = 0.0, $1689 = 0.0, $169 = 0.0, $1690 = 0.0, $1691 = 0, $1692 = 0, $1693 = 0.0, $1694 = 0, $1695 = 0, $1696 = 0.0, $1697 = 0.0;
 var $1698 = 0, $1699 = 0, $17 = 0.0, $170 = 0.0, $1700 = 0.0, $1701 = 0.0, $1702 = 0.0, $1703 = 0, $1704 = 0, $1705 = 0.0, $1706 = 0.0, $1707 = 0.0, $1708 = 0.0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0.0, $1712 = 0, $1713 = 0, $1714 = 0.0;
 var $1715 = 0.0, $1716 = 0, $1717 = 0, $1718 = 0.0, $1719 = 0.0, $172 = 0.0, $1720 = 0.0, $1721 = 0, $1722 = 0, $1723 = 0.0, $1724 = 0.0, $1725 = 0.0, $1726 = 0.0, $1727 = 0, $1728 = 0, $1729 = 0.0, $173 = 0.0, $1730 = 0, $1731 = 0.0, $1732 = 0;
 var $1733 = 0.0, $1734 = 0.0, $1735 = 0, $1736 = 0, $1737 = 0.0, $1738 = 0, $1739 = 0.0, $174 = 0.0, $1740 = 0.0, $1741 = 0.0, $1742 = 0, $1743 = 0, $1744 = 0.0, $1745 = 0, $1746 = 0.0, $1747 = 0.0, $1748 = 0.0, $1749 = 0.0, $175 = 0.0, $1750 = 0;
 var $1751 = 0, $1752 = 0, $1753 = 0.0, $1754 = 0, $1755 = 0.0, $1756 = 0.0, $1757 = 0, $1758 = 0, $1759 = 0.0, $176 = 0.0, $1760 = 0, $1761 = 0.0, $1762 = 0.0, $1763 = 0.0, $1764 = 0, $1765 = 0, $1766 = 0.0, $1767 = 0, $1768 = 0.0, $1769 = 0.0;
 var $177 = 0.0, $1770 = 0.0, $1771 = 0.0, $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0.0, $1778 = 0, $1779 = 0.0, $178 = 0, $1780 = 0.0, $1781 = 0, $1782 = 0, $1783 = 0.0, $1784 = 0, $1785 = 0.0, $1786 = 0.0, $1787 = 0.0;
 var $1788 = 0, $1789 = 0, $179 = 0, $1790 = 0.0, $1791 = 0, $1792 = 0.0, $1793 = 0.0, $1794 = 0.0, $1795 = 0.0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0.0, $180 = 0, $1800 = 0, $1801 = 0.0, $1802 = 0, $1803 = 0.0, $1804 = 0.0;
 var $1805 = 0, $1806 = 0, $1807 = 0.0, $1808 = 0, $1809 = 0.0, $181 = 0, $1810 = 0.0, $1811 = 0.0, $1812 = 0, $1813 = 0, $1814 = 0.0, $1815 = 0, $1816 = 0.0, $1817 = 0.0, $1818 = 0.0, $1819 = 0.0, $182 = 0, $1820 = 0, $1821 = 0, $1822 = 0;
 var $1823 = 0, $1824 = 0, $1825 = 0, $1826 = 0, $1827 = 0, $1828 = 0, $1829 = 0, $183 = 0, $1830 = 0, $1831 = 0.0, $1832 = 0, $1833 = 0, $1834 = 0, $1835 = 0, $1836 = 0, $1837 = 0, $1838 = 0, $1839 = 0, $184 = 0, $1840 = 0;
 var $1841 = 0, $1842 = 0, $1843 = 0.0, $1844 = 0, $1845 = 0, $1846 = 0, $1847 = 0, $1848 = 0, $1849 = 0, $185 = 0, $1850 = 0, $1851 = 0, $1852 = 0, $1853 = 0, $1854 = 0, $1855 = 0, $1856 = 0, $1857 = 0, $1858 = 0, $1859 = 0;
 var $186 = 0, $1860 = 0, $1861 = 0, $1862 = 0, $1863 = 0, $1864 = 0, $1865 = 0, $1866 = 0.0, $1867 = 0, $1868 = 0, $1869 = 0, $187 = 0, $1870 = 0, $1871 = 0.0, $1872 = 0, $1873 = 0.0, $1874 = 0.0, $1875 = 0, $1876 = 0, $1877 = 0;
 var $1878 = 0, $1879 = 0, $188 = 0, $1880 = 0, $1881 = 0, $1882 = 0, $1883 = 0, $1884 = 0, $1885 = 0, $1886 = 0, $1887 = 0, $1888 = 0.0, $1889 = 0, $189 = 0, $1890 = 0, $1891 = 0, $1892 = 0, $1893 = 0, $1894 = 0, $1895 = 0.0;
 var $1896 = 0.0, $1897 = 0, $1898 = 0.0, $1899 = 0.0, $19 = 0.0, $190 = 0, $1900 = 0, $1901 = 0.0, $1902 = 0.0, $1903 = 0, $1904 = 0, $1905 = 0.0, $1906 = 0.0, $1907 = 0.0, $1908 = 0.0, $1909 = 0, $191 = 0, $1910 = 0, $1911 = 0, $1912 = 0.0;
 var $1913 = 0.0, $1914 = 0, $1915 = 0, $1916 = 0.0, $1917 = 0.0, $1918 = 0.0, $1919 = 0.0, $192 = 0, $1920 = 0, $1921 = 0, $1922 = 0, $1923 = 0.0, $1924 = 0.0, $1925 = 0, $1926 = 0, $1927 = 0.0, $1928 = 0.0, $1929 = 0.0, $193 = 0, $1930 = 0.0;
 var $1931 = 0, $1932 = 0, $1933 = 0, $1934 = 0.0, $1935 = 0.0, $1936 = 0, $1937 = 0, $1938 = 0.0, $1939 = 0.0, $194 = 0, $1940 = 0.0, $1941 = 0.0, $1942 = 0, $1943 = 0, $1944 = 0, $1945 = 0, $1946 = 0, $1947 = 0, $1948 = 0.0, $1949 = 0;
 var $195 = 0, $1950 = 0.0, $1951 = 0.0, $1952 = 0, $1953 = 0, $1954 = 0.0, $1955 = 0, $1956 = 0.0, $1957 = 0.0, $1958 = 0.0, $1959 = 0.0, $196 = 0, $1960 = 0, $1961 = 0, $1962 = 0, $1963 = 0.0, $1964 = 0, $1965 = 0.0, $1966 = 0.0, $1967 = 0;
 var $1968 = 0, $1969 = 0.0, $197 = 0, $1970 = 0, $1971 = 0.0, $1972 = 0.0, $1973 = 0.0, $1974 = 0.0, $1975 = 0, $1976 = 0, $1977 = 0, $1978 = 0.0, $1979 = 0, $198 = 0, $1980 = 0.0, $1981 = 0.0, $1982 = 0, $1983 = 0, $1984 = 0.0, $1985 = 0;
 var $1986 = 0.0, $1987 = 0.0, $1988 = 0.0, $1989 = 0.0, $199 = 0, $1990 = 0, $1991 = 0, $1992 = 0, $1993 = 0.0, $1994 = 0, $1995 = 0.0, $1996 = 0.0, $1997 = 0, $1998 = 0, $1999 = 0.0, $2 = 0, $20 = 0, $200 = 0, $2000 = 0, $2001 = 0.0;
 var $2002 = 0.0, $2003 = 0.0, $2004 = 0.0, $2005 = 0, $2006 = 0, $2007 = 0, $2008 = 0, $2009 = 0, $201 = 0, $2010 = 0, $2011 = 0, $2012 = 0, $2013 = 0, $2014 = 0, $2015 = 0, $2016 = 0.0, $2017 = 0, $2018 = 0.0, $2019 = 0.0, $202 = 0;
 var $2020 = 0, $2021 = 0, $2022 = 0.0, $2023 = 0, $2024 = 0.0, $2025 = 0.0, $2026 = 0.0, $2027 = 0.0, $2028 = 0, $2029 = 0, $203 = 0, $2030 = 0, $2031 = 0.0, $2032 = 0, $2033 = 0.0, $2034 = 0.0, $2035 = 0, $2036 = 0, $2037 = 0.0, $2038 = 0;
 var $2039 = 0.0, $204 = 0, $2040 = 0.0, $2041 = 0.0, $2042 = 0.0, $2043 = 0, $2044 = 0, $2045 = 0, $2046 = 0.0, $2047 = 0, $2048 = 0.0, $2049 = 0.0, $205 = 0, $2050 = 0, $2051 = 0, $2052 = 0.0, $2053 = 0, $2054 = 0.0, $2055 = 0.0, $2056 = 0.0;
 var $2057 = 0.0, $2058 = 0, $2059 = 0, $206 = 0, $2060 = 0, $2061 = 0.0, $2062 = 0, $2063 = 0.0, $2064 = 0.0, $2065 = 0, $2066 = 0, $2067 = 0.0, $2068 = 0, $2069 = 0.0, $207 = 0, $2070 = 0.0, $2071 = 0.0, $2072 = 0.0, $2073 = 0, $2074 = 0;
 var $2075 = 0, $2076 = 0, $2077 = 0, $2078 = 0, $2079 = 0, $208 = 0, $2080 = 0, $2081 = 0, $2082 = 0, $2083 = 0, $2084 = 0.0, $2085 = 0, $2086 = 0.0, $2087 = 0.0, $2088 = 0, $2089 = 0, $209 = 0, $2090 = 0.0, $2091 = 0, $2092 = 0.0;
 var $2093 = 0.0, $2094 = 0.0, $2095 = 0.0, $2096 = 0, $2097 = 0, $2098 = 0, $2099 = 0.0, $21 = 0, $210 = 0, $2100 = 0, $2101 = 0.0, $2102 = 0.0, $2103 = 0, $2104 = 0, $2105 = 0.0, $2106 = 0, $2107 = 0.0, $2108 = 0.0, $2109 = 0.0, $211 = 0;
 var $2110 = 0.0, $2111 = 0, $2112 = 0, $2113 = 0, $2114 = 0.0, $2115 = 0, $2116 = 0.0, $2117 = 0.0, $2118 = 0, $2119 = 0, $212 = 0, $2120 = 0.0, $2121 = 0, $2122 = 0.0, $2123 = 0.0, $2124 = 0.0, $2125 = 0.0, $2126 = 0, $2127 = 0, $2128 = 0;
 var $2129 = 0.0, $213 = 0, $2130 = 0, $2131 = 0.0, $2132 = 0.0, $2133 = 0, $2134 = 0, $2135 = 0.0, $2136 = 0, $2137 = 0.0, $2138 = 0.0, $2139 = 0.0, $214 = 0, $2140 = 0.0, $2141 = 0, $2142 = 0, $2143 = 0, $2144 = 0, $2145 = 0, $2146 = 0;
 var $2147 = 0, $2148 = 0, $2149 = 0, $215 = 0, $2150 = 0, $2151 = 0, $2152 = 0, $2153 = 0.0, $2154 = 0, $2155 = 0.0, $2156 = 0.0, $2157 = 0.0, $2158 = 0, $2159 = 0, $216 = 0, $2160 = 0, $2161 = 0, $2162 = 0.0, $2163 = 0, $2164 = 0;
 var $2165 = 0.0, $2166 = 0.0, $2167 = 0, $2168 = 0, $2169 = 0, $217 = 0, $2170 = 0, $2171 = 0, $2172 = 0.0, $2173 = 0.0, $2174 = 0, $2175 = 0, $2176 = 0.0, $2177 = 0.0, $2178 = 0.0, $2179 = 0.0, $218 = 0, $2180 = 0, $2181 = 0.0, $2182 = 0;
 var $2183 = 0.0, $2184 = 0, $2185 = 0.0, $2186 = 0, $2187 = 0.0, $2188 = 0, $2189 = 0.0, $219 = 0, $2190 = 0, $2191 = 0.0, $2192 = 0, $2193 = 0.0, $2194 = 0, $2195 = 0.0, $2196 = 0, $2197 = 0.0, $2198 = 0, $2199 = 0.0, $22 = 0, $220 = 0;
 var $2200 = 0, $2201 = 0.0, $2202 = 0, $2203 = 0.0, $2204 = 0, $2205 = 0.0, $2206 = 0, $2207 = 0.0, $2208 = 0, $2209 = 0.0, $221 = 0, $2210 = 0, $2211 = 0.0, $2212 = 0, $2213 = 0.0, $2214 = 0, $2215 = 0.0, $2216 = 0.0, $2217 = 0.0, $2218 = 0.0;
 var $2219 = 0.0, $222 = 0, $2220 = 0.0, $2221 = 0.0, $2222 = 0.0, $2223 = 0.0, $2224 = 0.0, $2225 = 0.0, $2226 = 0.0, $2227 = 0.0, $2228 = 0.0, $2229 = 0.0, $223 = 0, $2230 = 0.0, $2231 = 0.0, $2232 = 0.0, $2233 = 0.0, $2234 = 0.0, $2235 = 0.0, $2236 = 0.0;
 var $2237 = 0.0, $2238 = 0.0, $2239 = 0.0, $224 = 0, $2240 = 0.0, $2241 = 0.0, $2242 = 0.0, $2243 = 0.0, $2244 = 0.0, $2245 = 0.0, $2246 = 0, $2247 = 0, $2248 = 0, $2249 = 0.0, $225 = 0, $2250 = 0.0, $2251 = 0.0, $2252 = 0.0, $2253 = 0.0, $2254 = 0;
 var $2255 = 0.0, $2256 = 0, $2257 = 0.0, $2258 = 0, $2259 = 0.0, $226 = 0, $2260 = 0, $2261 = 0.0, $2262 = 0, $2263 = 0.0, $2264 = 0, $2265 = 0.0, $2266 = 0, $2267 = 0.0, $2268 = 0, $2269 = 0.0, $227 = 0, $2270 = 0, $2271 = 0.0, $2272 = 0;
 var $2273 = 0.0, $2274 = 0, $2275 = 0.0, $2276 = 0, $2277 = 0.0, $2278 = 0, $2279 = 0.0, $228 = 0, $2280 = 0, $2281 = 0.0, $2282 = 0, $2283 = 0.0, $2284 = 0, $2285 = 0.0, $2286 = 0, $2287 = 0.0, $2288 = 0, $2289 = 0.0, $229 = 0, $2290 = 0.0;
 var $2291 = 0.0, $2292 = 0.0, $2293 = 0, $2294 = 0, $2295 = 0, $2296 = 0.0, $2297 = 0.0, $2298 = 0.0, $2299 = 0.0, $23 = 0, $230 = 0, $2300 = 0.0, $2301 = 0.0, $2302 = 0.0, $2303 = 0.0, $2304 = 0.0, $2305 = 0.0, $2306 = 0.0, $2307 = 0.0, $2308 = 0.0;
 var $2309 = 0.0, $231 = 0, $2310 = 0.0, $2311 = 0.0, $2312 = 0.0, $2313 = 0.0, $2314 = 0.0, $2315 = 0.0, $2316 = 0.0, $2317 = 0.0, $2318 = 0.0, $2319 = 0.0, $232 = 0, $2320 = 0.0, $2321 = 0.0, $2322 = 0.0, $2323 = 0.0, $2324 = 0.0, $2325 = 0.0, $2326 = 0;
 var $2327 = 0, $2328 = 0, $2329 = 0, $233 = 0, $2330 = 0, $2331 = 0, $2332 = 0, $2333 = 0, $2334 = 0, $2335 = 0, $2336 = 0, $2337 = 0, $2338 = 0, $2339 = 0, $234 = 0, $2340 = 0, $2341 = 0, $2342 = 0, $2343 = 0, $2344 = 0;
 var $2345 = 0, $2346 = 0, $2347 = 0, $2348 = 0.0, $2349 = 0, $235 = 0, $2350 = 0.0, $2351 = 0.0, $2352 = 0, $2353 = 0, $2354 = 0, $2355 = 0, $2356 = 0.0, $2357 = 0, $2358 = 0.0, $2359 = 0.0, $236 = 0, $2360 = 0, $2361 = 0, $2362 = 0;
 var $2363 = 0, $2364 = 0.0, $2365 = 0, $2366 = 0.0, $2367 = 0.0, $2368 = 0, $2369 = 0, $237 = 0, $2370 = 0, $2371 = 0, $2372 = 0, $2373 = 0, $2374 = 0, $2375 = 0, $2376 = 0, $2377 = 0, $2378 = 0, $2379 = 0, $238 = 0, $2380 = 0;
 var $2381 = 0, $2382 = 0, $2383 = 0.0, $2384 = 0, $2385 = 0.0, $2386 = 0.0, $2387 = 0, $2388 = 0.0, $2389 = 0, $239 = 0, $2390 = 0.0, $2391 = 0.0, $2392 = 0, $2393 = 0.0, $2394 = 0, $2395 = 0.0, $2396 = 0.0, $2397 = 0, $2398 = 0.0, $2399 = 0;
 var $24 = 0, $240 = 0, $2400 = 0.0, $2401 = 0.0, $2402 = 0, $2403 = 0.0, $2404 = 0, $2405 = 0.0, $2406 = 0.0, $2407 = 0, $2408 = 0.0, $2409 = 0, $241 = 0, $2410 = 0.0, $2411 = 0.0, $2412 = 0, $2413 = 0.0, $2414 = 0, $2415 = 0.0, $2416 = 0.0;
 var $2417 = 0, $2418 = 0.0, $2419 = 0, $242 = 0.0, $2420 = 0.0, $2421 = 0.0, $2422 = 0, $2423 = 0.0, $2424 = 0, $2425 = 0.0, $2426 = 0.0, $2427 = 0, $2428 = 0.0, $2429 = 0, $243 = 0.0, $2430 = 0.0, $2431 = 0.0, $2432 = 0, $2433 = 0.0, $2434 = 0;
 var $2435 = 0.0, $2436 = 0.0, $2437 = 0, $2438 = 0.0, $2439 = 0, $244 = 0.0, $2440 = 0.0, $2441 = 0.0, $2442 = 0, $2443 = 0.0, $2444 = 0, $2445 = 0.0, $2446 = 0.0, $2447 = 0, $2448 = 0.0, $2449 = 0, $245 = 0.0, $2450 = 0.0, $2451 = 0.0, $2452 = 0;
 var $2453 = 0.0, $2454 = 0.0, $2455 = 0.0, $2456 = 0, $2457 = 0.0, $2458 = 0.0, $2459 = 0.0, $246 = 0.0, $2460 = 0, $2461 = 0, $2462 = 0, $2463 = 0, $2464 = 0, $2465 = 0.0, $2466 = 0, $2467 = 0.0, $2468 = 0.0, $2469 = 0, $247 = 0.0, $2470 = 0.0;
 var $2471 = 0, $2472 = 0.0, $2473 = 0.0, $2474 = 0, $2475 = 0.0, $2476 = 0, $2477 = 0.0, $2478 = 0.0, $2479 = 0, $248 = 0.0, $2480 = 0.0, $2481 = 0, $2482 = 0.0, $2483 = 0.0, $2484 = 0, $2485 = 0.0, $2486 = 0, $2487 = 0.0, $2488 = 0.0, $2489 = 0;
 var $249 = 0.0, $2490 = 0.0, $2491 = 0, $2492 = 0.0, $2493 = 0.0, $2494 = 0, $2495 = 0.0, $2496 = 0, $2497 = 0.0, $2498 = 0.0, $2499 = 0, $25 = 0, $250 = 0.0, $2500 = 0.0, $2501 = 0.0, $2502 = 0.0, $2503 = 0, $2504 = 0, $2505 = 0, $2506 = 0;
 var $2507 = 0, $2508 = 0.0, $2509 = 0, $251 = 0.0, $2510 = 0, $2511 = 0.0, $2512 = 0, $2513 = 0.0, $2514 = 0, $2515 = 0.0, $2516 = 0.0, $2517 = 0, $2518 = 0, $2519 = 0.0, $252 = 0, $2520 = 0.0, $2521 = 0, $2522 = 0.0, $2523 = 0.0, $2524 = 0;
 var $2525 = 0.0, $2526 = 0.0, $2527 = 0, $2528 = 0.0, $2529 = 0.0, $253 = 0.0, $2530 = 0, $2531 = 0, $2532 = 0.0, $2533 = 0.0, $2534 = 0, $2535 = 0.0, $2536 = 0.0, $2537 = 0, $2538 = 0.0, $2539 = 0.0, $254 = 0.0, $2540 = 0, $2541 = 0.0, $2542 = 0.0;
 var $2543 = 0, $2544 = 0, $2545 = 0, $2546 = 0, $2547 = 0.0, $2548 = 0.0, $2549 = 0, $255 = 0.0, $2550 = 0.0, $2551 = 0.0, $2552 = 0, $2553 = 0.0, $2554 = 0.0, $2555 = 0, $2556 = 0.0, $2557 = 0.0, $2558 = 0, $2559 = 0.0, $256 = 0.0, $2560 = 0.0;
 var $2561 = 0.0, $2562 = 0.0, $2563 = 0.0, $2564 = 0, $2565 = 0, $2566 = 0, $2567 = 0, $2568 = 0, $2569 = 0, $257 = 0, $2570 = 0, $2571 = 0, $2572 = 0, $2573 = 0, $2574 = 0, $2575 = 0, $2576 = 0, $2577 = 0, $2578 = 0, $2579 = 0;
 var $258 = 0, $2580 = 0, $2581 = 0, $2582 = 0, $2583 = 0, $2584 = 0, $2585 = 0, $2586 = 0, $2587 = 0, $2588 = 0, $2589 = 0, $259 = 0.0, $2590 = 0, $2591 = 0, $2592 = 0, $2593 = 0, $2594 = 0, $2595 = 0.0, $2596 = 0, $2597 = 0.0;
 var $2598 = 0, $2599 = 0, $26 = 0, $260 = 0.0, $2600 = 0.0, $2601 = 0, $2602 = 0, $2603 = 0.0, $2604 = 0, $2605 = 0, $2606 = 0, $2607 = 0, $2608 = 0, $2609 = 0, $261 = 0.0, $2610 = 0.0, $2611 = 0, $2612 = 0.0, $2613 = 0.0, $2614 = 0;
 var $2615 = 0, $2616 = 0, $2617 = 0.0, $2618 = 0, $2619 = 0.0, $262 = 0.0, $2620 = 0.0, $2621 = 0, $2622 = 0, $2623 = 0, $2624 = 0, $2625 = 0, $2626 = 0, $2627 = 0, $2628 = 0.0, $2629 = 0, $263 = 0.0, $2630 = 0.0, $2631 = 0.0, $2632 = 0;
 var $2633 = 0, $2634 = 0, $2635 = 0.0, $2636 = 0, $2637 = 0.0, $2638 = 0.0, $2639 = 0, $264 = 0.0, $2640 = 0, $2641 = 0, $2642 = 0, $2643 = 0, $2644 = 0.0, $2645 = 0, $2646 = 0.0, $2647 = 0.0, $2648 = 0, $2649 = 0, $265 = 0, $2650 = 0;
 var $2651 = 0.0, $2652 = 0, $2653 = 0.0, $2654 = 0.0, $2655 = 0, $2656 = 0, $2657 = 0, $2658 = 0, $2659 = 0, $266 = 0, $2660 = 0.0, $2661 = 0, $2662 = 0.0, $2663 = 0.0, $2664 = 0, $2665 = 0, $2666 = 0, $2667 = 0.0, $2668 = 0, $2669 = 0.0;
 var $267 = 0.0, $2670 = 0.0, $2671 = 0, $2672 = 0, $2673 = 0, $2674 = 0, $2675 = 0, $2676 = 0, $2677 = 0, $2678 = 0, $2679 = 0, $268 = 0.0, $2680 = 0, $2681 = 0, $2682 = 0, $2683 = 0, $2684 = 0, $2685 = 0, $2686 = 0, $2687 = 0;
 var $2688 = 0.0, $2689 = 0, $269 = 0.0, $2690 = 0.0, $2691 = 0.0, $2692 = 0, $2693 = 0, $2694 = 0.0, $2695 = 0, $2696 = 0.0, $2697 = 0.0, $2698 = 0.0, $2699 = 0, $27 = 0, $270 = 0.0, $2700 = 0, $2701 = 0.0, $2702 = 0, $2703 = 0.0, $2704 = 0.0;
 var $2705 = 0.0, $2706 = 0.0, $2707 = 0, $2708 = 0, $2709 = 0, $271 = 0.0, $2710 = 0, $2711 = 0.0, $2712 = 0.0, $2713 = 0, $2714 = 0, $2715 = 0.0, $2716 = 0.0, $2717 = 0.0, $2718 = 0, $2719 = 0, $272 = 0.0, $2720 = 0.0, $2721 = 0.0, $2722 = 0.0;
 var $2723 = 0.0, $2724 = 0, $2725 = 0, $2726 = 0, $2727 = 0.0, $2728 = 0.0, $2729 = 0, $273 = 0, $2730 = 0.0, $2731 = 0.0, $2732 = 0, $2733 = 0, $2734 = 0, $2735 = 0, $2736 = 0.0, $2737 = 0.0, $2738 = 0, $2739 = 0, $274 = 0, $2740 = 0;
 var $2741 = 0, $2742 = 0.0, $2743 = 0.0, $2744 = 0, $2745 = 0.0, $2746 = 0.0, $2747 = 0, $2748 = 0, $2749 = 0, $275 = 0.0, $2750 = 0, $2751 = 0, $2752 = 0, $2753 = 0, $2754 = 0.0, $2755 = 0, $2756 = 0, $2757 = 0, $2758 = 0, $2759 = 0.0;
 var $276 = 0.0, $2760 = 0, $2761 = 0.0, $2762 = 0.0, $2763 = 0, $2764 = 0, $2765 = 0, $2766 = 0, $2767 = 0, $2768 = 0, $2769 = 0, $277 = 0.0, $2770 = 0, $2771 = 0, $2772 = 0, $2773 = 0, $2774 = 0, $2775 = 0, $2776 = 0, $2777 = 0;
 var $2778 = 0, $2779 = 0, $278 = 0.0, $2780 = 0, $2781 = 0, $2782 = 0, $2783 = 0, $2784 = 0, $2785 = 0, $2786 = 0, $2787 = 0, $2788 = 0, $2789 = 0, $279 = 0.0, $2790 = 0, $2791 = 0, $2792 = 0, $2793 = 0, $2794 = 0, $2795 = 0;
 var $2796 = 0, $2797 = 0, $2798 = 0, $2799 = 0, $28 = 0, $280 = 0.0, $2800 = 0, $2801 = 0, $2802 = 0, $2803 = 0, $2804 = 0, $2805 = 0, $2806 = 0, $2807 = 0, $2808 = 0, $2809 = 0, $281 = 0, $2810 = 0, $2811 = 0, $2812 = 0;
 var $2813 = 0, $2814 = 0, $2815 = 0, $2816 = 0, $2817 = 0, $2818 = 0, $2819 = 0, $282 = 0, $2820 = 0, $2821 = 0, $2822 = 0, $2823 = 0, $2824 = 0, $2825 = 0, $2826 = 0, $2827 = 0, $2828 = 0, $2829 = 0, $283 = 0.0, $2830 = 0;
 var $2831 = 0, $2832 = 0, $2833 = 0, $2834 = 0, $2835 = 0, $2836 = 0, $2837 = 0, $2838 = 0, $2839 = 0, $284 = 0.0, $2840 = 0, $2841 = 0, $2842 = 0, $2843 = 0, $2844 = 0, $2845 = 0, $2846 = 0, $2847 = 0, $2848 = 0, $2849 = 0;
 var $285 = 0.0, $2850 = 0, $2851 = 0, $2852 = 0, $2853 = 0, $2854 = 0, $2855 = 0, $2856 = 0, $2857 = 0, $2858 = 0, $2859 = 0, $286 = 0.0, $2860 = 0, $2861 = 0, $2862 = 0, $2863 = 0, $2864 = 0, $2865 = 0, $2866 = 0, $2867 = 0;
 var $2868 = 0, $2869 = 0, $287 = 0.0, $2870 = 0, $2871 = 0, $2872 = 0, $2873 = 0, $2874 = 0, $2875 = 0, $2876 = 0, $2877 = 0, $2878 = 0, $2879 = 0, $288 = 0.0, $2880 = 0, $2881 = 0, $2882 = 0, $2883 = 0, $2884 = 0, $2885 = 0;
 var $2886 = 0, $2887 = 0, $2888 = 0, $2889 = 0, $289 = 0, $2890 = 0, $2891 = 0, $2892 = 0, $2893 = 0, $2894 = 0, $2895 = 0, $2896 = 0, $2897 = 0, $2898 = 0, $2899 = 0, $29 = 0.0, $290 = 0, $2900 = 0, $2901 = 0, $2902 = 0;
 var $2903 = 0, $2904 = 0, $2905 = 0, $2906 = 0, $2907 = 0, $2908 = 0, $2909 = 0, $291 = 0.0, $2910 = 0, $2911 = 0, $2912 = 0, $2913 = 0, $2914 = 0, $2915 = 0, $2916 = 0, $2917 = 0, $2918 = 0, $2919 = 0, $292 = 0.0, $2920 = 0;
 var $2921 = 0, $2922 = 0, $2923 = 0, $2924 = 0, $2925 = 0, $2926 = 0, $2927 = 0, $2928 = 0, $2929 = 0, $293 = 0.0, $2930 = 0, $2931 = 0, $2932 = 0, $2933 = 0, $2934 = 0, $2935 = 0, $2936 = 0, $2937 = 0, $2938 = 0, $2939 = 0;
 var $294 = 0.0, $2940 = 0, $2941 = 0, $2942 = 0, $2943 = 0, $2944 = 0, $2945 = 0, $2946 = 0, $2947 = 0, $2948 = 0, $2949 = 0, $295 = 0.0, $2950 = 0, $2951 = 0, $2952 = 0, $2953 = 0, $2954 = 0, $2955 = 0, $2956 = 0, $2957 = 0;
 var $2958 = 0, $2959 = 0, $296 = 0, $2960 = 0, $2961 = 0, $2962 = 0, $2963 = 0, $2964 = 0, $2965 = 0, $2966 = 0, $2967 = 0, $2968 = 0, $2969 = 0, $297 = 0.0, $2970 = 0, $2971 = 0, $2972 = 0, $2973 = 0, $2974 = 0, $2975 = 0;
 var $2976 = 0, $2977 = 0, $2978 = 0, $2979 = 0, $298 = 0.0, $2980 = 0, $2981 = 0, $2982 = 0, $2983 = 0, $2984 = 0, $2985 = 0, $2986 = 0, $2987 = 0, $2988 = 0, $2989 = 0, $299 = 0.0, $2990 = 0, $2991 = 0, $2992 = 0, $2993 = 0;
 var $2994 = 0, $2995 = 0, $2996 = 0, $2997 = 0, $2998 = 0, $2999 = 0, $3 = 0, $30 = 0, $300 = 0.0, $3000 = 0, $3001 = 0, $3002 = 0, $3003 = 0, $3004 = 0, $3005 = 0, $3006 = 0, $3007 = 0, $3008 = 0, $3009 = 0, $301 = 0;
 var $3010 = 0, $3011 = 0, $3012 = 0, $3013 = 0, $3014 = 0, $3015 = 0, $3016 = 0, $3017 = 0, $3018 = 0, $3019 = 0, $302 = 0.0, $3020 = 0, $3021 = 0, $3022 = 0, $3023 = 0, $3024 = 0, $3025 = 0, $3026 = 0, $3027 = 0, $3028 = 0;
 var $3029 = 0, $303 = 0.0, $3030 = 0, $3031 = 0, $3032 = 0, $3033 = 0, $3034 = 0, $3035 = 0, $3036 = 0, $3037 = 0, $3038 = 0, $3039 = 0, $304 = 0.0, $3040 = 0, $3041 = 0, $3042 = 0, $3043 = 0, $3044 = 0, $3045 = 0, $3046 = 0;
 var $3047 = 0, $3048 = 0, $3049 = 0, $305 = 0, $3050 = 0, $3051 = 0, $3052 = 0, $3053 = 0, $306 = 0, $307 = 0.0, $308 = 0.0, $309 = 0.0, $31 = 0.0, $310 = 0, $311 = 0, $312 = 0.0, $313 = 0.0, $314 = 0.0, $315 = 0.0, $316 = 0.0;
 var $317 = 0.0, $318 = 0.0, $319 = 0.0, $32 = 0.0, $320 = 0, $321 = 0, $322 = 0, $323 = 0.0, $324 = 0.0, $325 = 0, $326 = 0, $327 = 0.0, $328 = 0.0, $329 = 0.0, $33 = 0, $330 = 0.0, $331 = 0.0, $332 = 0.0, $333 = 0, $334 = 0;
 var $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0;
 var $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0.0, $360 = 0, $361 = 0.0, $362 = 0, $363 = 0.0, $364 = 0.0, $365 = 0, $366 = 0, $367 = 0.0, $368 = 0.0, $369 = 0, $37 = 0.0, $370 = 0;
 var $371 = 0, $372 = 0, $373 = 0.0, $374 = 0, $375 = 0.0, $376 = 0.0, $377 = 0, $378 = 0, $379 = 0.0, $38 = 0, $380 = 0.0, $381 = 0, $382 = 0, $383 = 0, $384 = 0.0, $385 = 0, $386 = 0.0, $387 = 0.0, $388 = 0, $389 = 0;
 var $39 = 0, $390 = 0.0, $391 = 0.0, $392 = 0, $393 = 0, $394 = 0, $395 = 0.0, $396 = 0, $397 = 0.0, $398 = 0.0, $399 = 0, $4 = 0, $40 = 0.0, $400 = 0, $401 = 0.0, $402 = 0.0, $403 = 0, $404 = 0, $405 = 0, $406 = 0;
 var $407 = 0, $408 = 0, $409 = 0, $41 = 0.0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0.0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0.0;
 var $425 = 0.0, $426 = 0.0, $427 = 0.0, $428 = 0.0, $429 = 0.0, $43 = 0, $430 = 0.0, $431 = 0.0, $432 = 0.0, $433 = 0.0, $434 = 0.0, $435 = 0.0, $436 = 0.0, $437 = 0.0, $438 = 0.0, $439 = 0.0, $44 = 0, $440 = 0.0, $441 = 0.0, $442 = 0.0;
 var $443 = 0.0, $444 = 0.0, $445 = 0.0, $446 = 0.0, $447 = 0.0, $448 = 0.0, $449 = 0.0, $45 = 0.0, $450 = 0.0, $451 = 0.0, $452 = 0.0, $453 = 0.0, $454 = 0.0, $455 = 0.0, $456 = 0.0, $457 = 0.0, $458 = 0.0, $459 = 0.0, $46 = 0.0, $460 = 0.0;
 var $461 = 0.0, $462 = 0.0, $463 = 0.0, $464 = 0.0, $465 = 0.0, $466 = 0.0, $467 = 0.0, $468 = 0.0, $469 = 0.0, $47 = 0.0, $470 = 0.0, $471 = 0.0, $472 = 0.0, $473 = 0.0, $474 = 0.0, $475 = 0.0, $476 = 0.0, $477 = 0.0, $478 = 0.0, $479 = 0.0;
 var $48 = 0.0, $480 = 0.0, $481 = 0.0, $482 = 0.0, $483 = 0.0, $484 = 0.0, $485 = 0.0, $486 = 0.0, $487 = 0.0, $488 = 0.0, $489 = 0.0, $49 = 0, $490 = 0.0, $491 = 0.0, $492 = 0.0, $493 = 0.0, $494 = 0.0, $495 = 0.0, $496 = 0.0, $497 = 0.0;
 var $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0, $500 = 0.0, $501 = 0.0, $502 = 0.0, $503 = 0.0, $504 = 0.0, $505 = 0.0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0.0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0;
 var $515 = 0, $516 = 0, $517 = 0.0, $518 = 0.0, $519 = 0.0, $52 = 0.0, $520 = 0.0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0.0, $53 = 0, $530 = 0, $531 = 0.0, $532 = 0.0;
 var $533 = 0.0, $534 = 0, $535 = 0.0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0.0, $544 = 0.0, $545 = 0.0, $546 = 0, $547 = 0.0, $548 = 0.0, $549 = 0, $55 = 0, $550 = 0.0;
 var $551 = 0.0, $552 = 0, $553 = 0.0, $554 = 0.0, $555 = 0, $556 = 0.0, $557 = 0.0, $558 = 0, $559 = 0.0, $56 = 0, $560 = 0.0, $561 = 0, $562 = 0.0, $563 = 0.0, $564 = 0, $565 = 0.0, $566 = 0.0, $567 = 0, $568 = 0.0, $569 = 0.0;
 var $57 = 0.0, $570 = 0, $571 = 0.0, $572 = 0.0, $573 = 0, $574 = 0.0, $575 = 0.0, $576 = 0.0, $577 = 0.0, $578 = 0.0, $579 = 0.0, $58 = 0, $580 = 0.0, $581 = 0.0, $582 = 0.0, $583 = 0.0, $584 = 0.0, $585 = 0.0, $586 = 0.0, $587 = 0.0;
 var $588 = 0.0, $589 = 0.0, $59 = 0.0, $590 = 0.0, $591 = 0.0, $592 = 0.0, $593 = 0.0, $594 = 0.0, $595 = 0.0, $596 = 0.0, $597 = 0.0, $598 = 0.0, $599 = 0.0, $6 = 0, $60 = 0.0, $600 = 0.0, $601 = 0.0, $602 = 0.0, $603 = 0.0, $604 = 0.0;
 var $605 = 0.0, $606 = 0.0, $607 = 0.0, $608 = 0.0, $609 = 0.0, $61 = 0.0, $610 = 0.0, $611 = 0.0, $612 = 0.0, $613 = 0.0, $614 = 0.0, $615 = 0.0, $616 = 0.0, $617 = 0.0, $618 = 0.0, $619 = 0, $62 = 0, $620 = 0, $621 = 0.0, $622 = 0.0;
 var $623 = 0.0, $624 = 0.0, $625 = 0.0, $626 = 0.0, $627 = 0.0, $628 = 0.0, $629 = 0.0, $63 = 0.0, $630 = 0.0, $631 = 0.0, $632 = 0.0, $633 = 0.0, $634 = 0.0, $635 = 0.0, $636 = 0.0, $637 = 0.0, $638 = 0.0, $639 = 0.0, $64 = 0, $640 = 0.0;
 var $641 = 0.0, $642 = 0.0, $643 = 0.0, $644 = 0.0, $645 = 0.0, $646 = 0.0, $647 = 0.0, $648 = 0.0, $649 = 0.0, $65 = 0, $650 = 0.0, $651 = 0.0, $652 = 0.0, $653 = 0.0, $654 = 0.0, $655 = 0.0, $656 = 0.0, $657 = 0.0, $658 = 0.0, $659 = 0.0;
 var $66 = 0.0, $660 = 0.0, $661 = 0.0, $662 = 0.0, $663 = 0, $664 = 0, $665 = 0, $666 = 0.0, $667 = 0, $668 = 0, $669 = 0.0, $67 = 0.0, $670 = 0.0, $671 = 0.0, $672 = 0, $673 = 0.0, $674 = 0, $675 = 0, $676 = 0.0, $677 = 0;
 var $678 = 0.0, $679 = 0, $68 = 0, $680 = 0.0, $681 = 0.0, $682 = 0.0, $683 = 0, $684 = 0.0, $685 = 0, $686 = 0.0, $687 = 0.0, $688 = 0, $689 = 0.0, $69 = 0, $690 = 0.0, $691 = 0.0, $692 = 0, $693 = 0.0, $694 = 0.0, $695 = 0.0;
 var $696 = 0, $697 = 0.0, $698 = 0.0, $699 = 0.0, $7 = 0.0, $70 = 0, $700 = 0, $701 = 0.0, $702 = 0.0, $703 = 0.0, $704 = 0, $705 = 0.0, $706 = 0.0, $707 = 0.0, $708 = 0, $709 = 0.0, $71 = 0, $710 = 0.0, $711 = 0.0, $712 = 0;
 var $713 = 0.0, $714 = 0.0, $715 = 0.0, $716 = 0, $717 = 0.0, $718 = 0.0, $719 = 0.0, $72 = 0, $720 = 0, $721 = 0.0, $722 = 0.0, $723 = 0.0, $724 = 0.0, $725 = 0.0, $726 = 0.0, $727 = 0, $728 = 0, $729 = 0, $73 = 0.0, $730 = 0.0;
 var $731 = 0, $732 = 0, $733 = 0.0, $734 = 0.0, $735 = 0.0, $736 = 0, $737 = 0.0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0;
 var $75 = 0, $750 = 0.0, $751 = 0, $752 = 0, $753 = 0, $754 = 0.0, $755 = 0.0, $756 = 0, $757 = 0, $758 = 0.0, $759 = 0.0, $76 = 0, $760 = 0.0, $761 = 0.0, $762 = 0.0, $763 = 0.0, $764 = 0.0, $765 = 0.0, $766 = 0.0, $767 = 0.0;
 var $768 = 0.0, $769 = 0.0, $77 = 0, $770 = 0.0, $771 = 0.0, $772 = 0.0, $773 = 0.0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0.0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0;
 var $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0;
 var $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0;
 var $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0;
 var $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0.0, $85 = 0, $850 = 0, $851 = 0, $852 = 0.0, $853 = 0, $854 = 0, $855 = 0.0, $856 = 0.0, $857 = 0.0;
 var $858 = 0, $859 = 0, $86 = 0, $860 = 0.0, $861 = 0, $862 = 0, $863 = 0.0, $864 = 0, $865 = 0, $866 = 0.0, $867 = 0.0, $868 = 0.0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0.0, $873 = 0, $874 = 0, $875 = 0.0;
 var $876 = 0, $877 = 0, $878 = 0.0, $879 = 0.0, $88 = 0, $880 = 0.0, $881 = 0, $882 = 0, $883 = 0, $884 = 0.0, $885 = 0, $886 = 0, $887 = 0.0, $888 = 0, $889 = 0, $89 = 0, $890 = 0.0, $891 = 0.0, $892 = 0.0, $893 = 0;
 var $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0;
 var $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0;
 var $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0;
 var $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0;
 var $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0;
 var $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $Acc0$025$i = 0.0, $Acc0$03$i = 0.0, $Acc0$15$i = 0.0;
 var $Best$i = 0, $BitCount$0$i = 0, $Bound$i = 0, $CorVct$i = 0, $DataBuff = 0, $Dpnt$13 = 0, $Enr$05$i = 0.0, $Err_max$0$lcssa3$i$i = 0.0, $Err_max$02$i$i = 0.0, $Err_max$1$i$i = 0.0, $FloatBuf = 0, $FltBuf$i = 0, $Ftyp$1 = 0, $Ftyp$2 = 0, $Gid$022$i = 0, $Gid$1$lcssa$i = 0, $Gid$112$i = 0, $Gid$2$i = 0, $IirDl$i$sroa$0$0 = 0.0, $IirDl$i$sroa$0$1 = 0.0;
 var $IirDl$i$sroa$12$0 = 0.0, $IirDl$i$sroa$12$0$phi = 0.0, $IirDl$i$sroa$12$1 = 0.0, $IirDl$i$sroa$12$1$phi = 0.0, $IirDl$i$sroa$18$0 = 0.0, $IirDl$i$sroa$18$0$phi = 0.0, $IirDl$i$sroa$18$1 = 0.0, $IirDl$i$sroa$18$1$phi = 0.0, $IirDl$i$sroa$24$0 = 0.0, $IirDl$i$sroa$24$0$phi = 0.0, $IirDl$i$sroa$24$1 = 0.0, $IirDl$i$sroa$24$1$phi = 0.0, $IirDl$i$sroa$30$0 = 0.0, $IirDl$i$sroa$30$0$phi = 0.0, $IirDl$i$sroa$30$1 = 0.0, $IirDl$i$sroa$30$1$phi = 0.0, $IirDl$i$sroa$36$0 = 0.0, $IirDl$i$sroa$36$0$phi = 0.0, $IirDl$i$sroa$36$1 = 0.0, $IirDl$i$sroa$36$1$phi = 0.0;
 var $IirDl$i$sroa$42$0 = 0.0, $IirDl$i$sroa$42$0$phi = 0.0, $IirDl$i$sroa$42$1 = 0.0, $IirDl$i$sroa$42$1$phi = 0.0, $IirDl$i$sroa$48$0 = 0.0, $IirDl$i$sroa$48$0$phi = 0.0, $IirDl$i$sroa$48$1 = 0.0, $IirDl$i$sroa$48$1$phi = 0.0, $IirDl$i$sroa$54$0 = 0.0, $IirDl$i$sroa$54$0$phi = 0.0, $IirDl$i$sroa$54$1 = 0.0, $IirDl$i$sroa$54$1$phi = 0.0, $IirDl$i$sroa$60$1 = 0.0, $IirDl$i$sroa$60$1$phi = 0.0, $IirDl$i$sroa$60$2 = 0.0, $IirDl$i$sroa$60$2$phi = 0.0, $ImpResp = 0, $Lid$021$i = 0, $Lid$1$lcssa$i = 0, $Lid$111$i = 0;
 var $Lid$2$i = 0, $Line = 0, $LspVect = 0, $Max$020$i = 0.0, $Max$1$lcssa$i = 0.0, $Max$19$i = 0.0, $Max$2$i = 0.0, $Olp$1$i = 0, $PerLpc = 0, $Pw = 0, $QntLpc = 0, $Tm2$011$i = 0, $Tmp0$03$i$i = 0, $UnqLpc = 0, $VadState$0$i = 0, $VadState$1$i = 0, $alpha$0117$i$i$i = 0.0, $alpha$195$i$i$i = 0.0, $alpha$269$i$i$i = 0.0, $alpha$344$i$i$i = 0.0;
 var $alpha$4$i$i$i = 0.0, $alpha$5$i$i$i = 0.0, $brmerge$i = 0, $cor$021$i$i$i = 0.0, $cor$1$i$i$i = 0.0, $cor$2$i$i$i = 0.0, $cor$3$i$i$i = 0.0, $curAcf$011$i = 0, $curQGain$01$i = 0, $dist_min$04$i$i$i = 0.0, $dist_min$1$i$i$i = 0.0, $exitcond = 0, $exitcond$1$i = 0, $exitcond$2$i = 0, $exitcond$3$i = 0, $exitcond$i = 0, $exitcond$i$i = 0, $exitcond$i$i$i = 0, $exitcond$i$i$i$i = 0, $exitcond$i$i$i27 = 0;
 var $exitcond$i$i23 = 0, $exitcond$i$i3$i = 0, $exitcond$i$i34 = 0, $exitcond$i$i6 = 0, $exitcond$i$i70 = 0, $exitcond$i1$i$i = 0, $exitcond$i102$i = 0, $exitcond$i109$i = 0, $exitcond$i11$i = 0, $exitcond$i11$i37 = 0, $exitcond$i116$i = 0, $exitcond$i123$i = 0, $exitcond$i130$i = 0, $exitcond$i137$i = 0, $exitcond$i144$i = 0, $exitcond$i15 = 0, $exitcond$i151$i = 0, $exitcond$i158$i = 0, $exitcond$i165$i = 0, $exitcond$i17 = 0;
 var $exitcond$i172$i = 0, $exitcond$i179$i = 0, $exitcond$i18$i = 0, $exitcond$i186$i = 0, $exitcond$i193$i = 0, $exitcond$i20 = 0, $exitcond$i25$i = 0, $exitcond$i3 = 0, $exitcond$i3$i = 0, $exitcond$i3$i22 = 0, $exitcond$i32$i = 0, $exitcond$i39$i = 0, $exitcond$i4$i = 0, $exitcond$i41 = 0, $exitcond$i45 = 0, $exitcond$i46$i = 0, $exitcond$i5$i$i = 0, $exitcond$i50 = 0, $exitcond$i53$i = 0, $exitcond$i55 = 0;
 var $exitcond$i6$i$i = 0, $exitcond$i60$i = 0, $exitcond$i61 = 0, $exitcond$i67 = 0, $exitcond$i67$i = 0, $exitcond$i74$i = 0, $exitcond$i77 = 0, $exitcond$i81$i = 0, $exitcond$i88$i = 0, $exitcond$i9 = 0, $exitcond$i95$i = 0, $exitcond14$i$i = 0, $exitcond15$i = 0, $exitcond16$i = 0, $exitcond166$i$i$i = 0, $exitcond167$i$i$i = 0, $exitcond168$i$i$i = 0, $exitcond169$i$i$i = 0, $exitcond170$i$i$i = 0, $exitcond171$i$i$i = 0;
 var $exitcond172$i$i$i = 0, $exitcond18$i = 0, $exitcond27$i$i$i = 0, $exitcond28$i$i$i = 0, $exitcond29$i$i$i = 0, $exitcond30$i$i$i = 0, $exitcond31$i$i$i = 0, $exitcond32 = 0, $exitcond33 = 0, $exitcond4$i$i = 0, $exitcond4$i15$i = 0, $exitcond50$i = 0, $exitcond51$i = 0, $exitcond55$i = 0, $exitcond56$i = 0, $exitcond57$1$i = 0, $exitcond57$2$i = 0, $exitcond57$3$i = 0, $exitcond57$i = 0, $exitcond6$i$i = 0;
 var $exitcond64 = 0, $exitcond7$i$i = 0, $exitcond70$1$i = 0, $exitcond70$2$i = 0, $exitcond70$3$i = 0, $exitcond75$i = 0, $exitcond8$i$i = 0, $exitcond9$i = 0, $fabsf$i$i$i = 0.0, $fabsf1$i$i$i = 0.0, $floorf$i = 0.0, $gain$03$i$i$i = 0, $gain$1$i$i$i = 0, $gain_nq$0$i$i$i = 0.0, $h$i$i$i = 0, $h2$018$i$i$i = 0, $h2$112$i$i$i = 0, $h2$26$i$i$i = 0, $i$01$i = 0, $i$01$i$i = 0;
 var $i$01$i$i$i = 0, $i$01$i$i$i$i = 0, $i$01$i$i$i26 = 0, $i$01$i$i2$i = 0, $i$01$i$i21 = 0, $i$01$i$i3$i$i = 0, $i$01$i$i85 = 0, $i$01$i10$i = 0, $i$01$i14$i = 0, $i$01$i18$i = 0, $i$01$i2$i = 0, $i$01$i2$i$i$i = 0, $i$01$i2$i83 = 0, $i$01$i22$i = 0, $i$01$i26$i = 0, $i$01$i30$i = 0, $i$01$i34$i = 0, $i$01$i38$i = 0, $i$01$i42$i = 0, $i$01$i44 = 0;
 var $i$01$i46$i = 0, $i$01$i49 = 0, $i$01$i50$i = 0, $i$01$i53$i = 0, $i$01$i54 = 0, $i$01$i6$i = 0, $i$02$i = 0, $i$02$i$i$i = 0, $i$03$i$i = 0, $i$03$i$i33 = 0, $i$03$i100$i = 0, $i$03$i107$i = 0, $i$03$i114$i = 0, $i$03$i121$i = 0, $i$03$i128$i = 0, $i$03$i135$i = 0, $i$03$i142$i = 0, $i$03$i149$i = 0, $i$03$i156$i = 0, $i$03$i16$i = 0;
 var $i$03$i163$i = 0, $i$03$i170$i = 0, $i$03$i177$i = 0, $i$03$i184$i = 0, $i$03$i191$i = 0, $i$03$i2$i = 0, $i$03$i23$i = 0, $i$03$i30$i = 0, $i$03$i37$i = 0, $i$03$i44$i = 0, $i$03$i51$i = 0, $i$03$i58$i = 0, $i$03$i65$i = 0, $i$03$i72$i = 0, $i$03$i79$i = 0, $i$03$i8$i = 0, $i$03$i86$i = 0, $i$03$i9$i = 0, $i$03$i93$i = 0, $i$030 = 0;
 var $i$030$i = 0, $i$05$i = 0, $i$05$i$i = 0, $i$05$i1$i = 0, $i$08$i$i = 0, $i$1021$i$i$i = 0, $i$11$i = 0, $i$11$i$i = 0, $i$11$i$i69 = 0, $i$110$i = 0, $i$1126$i$i$i = 0, $i$1164$i$i$i = 0, $i$12$i$i = 0, $i$1211$i$i$i = 0, $i$124 = 0, $i$1316$i$i$i = 0, $i$142$i$i$i = 0, $i$156$i$i$i = 0, $i$21$i$i = 0, $i$222$i$i$i = 0;
 var $i$23$i = 0, $i$24$i = 0, $i$24$i60 = 0, $i$24$i8 = 0, $i$3$i$i$i = 0, $i$4$i$i$i = 0, $i$46$i = 0, $i$5$i$i$i = 0, $i$513$i = 0, $i$53$i = 0, $i$67$i = 0, $i$831$i$i$i = 0, $i$936$i$i$i = 0, $i0$0150$i$i$i = 0, $i0$1127$i$i$i = 0, $i1$0143$i$i$i = 0, $i1$1139$i$i$i = 0, $i1$2101$i$i$i = 0, $i2$1132$i$i$i = 0, $i2$275$i$i$i = 0;
 var $i3$149$i$i$i = 0, $iTest$0$i$i = 0, $i_subfr$04$i$i = 0, $indvars$iv$i = 0, $indvars$iv$i$i = 0, $indvars$iv$i7$i = 0, $indvars$iv$next$i = 0, $indvars$iv$next$i$i = 0, $indvars$iv$next$i14$i = 0, $indvars$iv$next54$i = 0, $indvars$iv53$i = 0, $ip0$0122$i$i$i = 0, $ip0$1100$i$i$i = 0, $ip0$274$i$i$i = 0, $ip0$348$i$i$i = 0, $ip0$4$i$i$i = 0, $ip0$5$i$i$i = 0, $ip0$6$i$i$i = 0, $ip0$7$i$i$i = 0, $ip1$0121$i$i$i = 0;
 var $ip1$199$i$i$i = 0, $ip1$273$i$i$i = 0, $ip1$347$i$i$i = 0, $ip1$4$i$i$i = 0, $ip1$5$i$i$i = 0, $ip1$6$i$i$i = 0, $ip1$7$i$i$i = 0, $ip2$0120$i$i$i = 0, $ip2$198$i$i$i = 0, $ip2$272$i$i$i = 0, $ip2$346$i$i$i = 0, $ip2$4$i$i$i = 0, $ip2$5$i$i$i = 0, $ip2$6$i$i$i = 0, $ip2$7$i$i$i = 0, $ip3$0119$i$i$i = 0, $ip3$197$i$i$i = 0, $ip3$271$i$i$i = 0, $ip3$345$i$i$i = 0, $ip3$4$i$i$i = 0;
 var $ip3$5$i$i$i = 0, $ip3$6$i$i$i = 0, $ip3$7$i$i$i = 0, $ispos$1$i = 0, $ispos$2$i = 0, $ispos$3$i = 0, $ispos$4$i = 0, $ispos$5$i = 0, $ispos$6$i = 0, $ispos$7$i = 0, $ispos$i = 0, $ispos$i29 = 0, $j$01$i$i = 0, $j$01$i10$i = 0, $j$02$1$i = 0, $j$02$2$i = 0, $j$02$3$i = 0, $j$02$i = 0, $j$02$i$i = 0, $j$026$i = 0;
 var $j$030$i$i$i = 0, $j$1$i$i = 0, $j$131$1$i = 0, $j$131$2$i = 0, $j$131$3$i = 0, $j$131$i = 0, $j$135$i$i$i = 0, $j$220$i$i$i = 0, $j$242$1$i = 0, $j$242$2$i = 0, $j$242$3$i = 0, $j$31 = 0, $j$325$i$i$i = 0, $j$36$i = 0, $j$410$i$i$i = 0, $j$42 = 0, $j$515$i$i$i = 0, $j$61$i$i$i = 0, $j$75$i$i$i = 0, $k$010$i = 0;
 var $k$019$i$i$i = 0, $k$049$i = 0, $k$08$i = 0, $k$113$i$i$i = 0, $k$123$i = 0, $k$27$i$i$i = 0, $l$0$i = 0, $lPnt$048$i = 0, $lPnt$441$1$i = 0, $lPnt$441$2$i = 0, $lPnt$441$3$i = 0, $m$023$i$i$i = 0, $m$1$i$i$i = 0, $m$2$i$i$i = 0, $m$3$i$i$i = 0, $max0$1$1$i$i$i = 0.0, $max0$1$2$i$i$i = 0.0, $max0$1$3$i$i$i = 0.0, $max0$1$4$i$i$i = 0.0, $max0$1$5$i$i$i = 0.0;
 var $max0$1$6$i$i$i = 0.0, $max0$1$i$i$i = 0.0, $max0$3$1$i$i$i = 0.0, $max0$3$2$i$i$i = 0.0, $max0$3$3$i$i$i = 0.0, $max0$3$4$i$i$i = 0.0, $max0$3$5$i$i$i = 0.0, $max0$3$6$i$i$i = 0.0, $max0$3$i$i$i = 0.0, $max1$1$1$i$i$i = 0.0, $max1$1$2$i$i$i = 0.0, $max1$1$3$i$i$i = 0.0, $max1$1$4$i$i$i = 0.0, $max1$1$5$i$i$i = 0.0, $max1$1$6$i$i$i = 0.0, $max1$1$i$i$i = 0.0, $max1$3$1$i$i$i = 0.0, $max1$3$2$i$i$i = 0.0, $max1$3$3$i$i$i = 0.0, $max1$3$4$i$i$i = 0.0;
 var $max1$3$5$i$i$i = 0.0, $max1$3$6$i$i$i = 0.0, $max1$3$i$i$i = 0.0, $max2$1$1$i$i$i = 0.0, $max2$1$2$i$i$i = 0.0, $max2$1$3$i$i$i = 0.0, $max2$1$4$i$i$i = 0.0, $max2$1$5$i$i$i = 0.0, $max2$1$6$i$i$i = 0.0, $max2$1$i$i$i = 0.0, $max2$3$1$i$i$i = 0.0, $max2$3$2$i$i$i = 0.0, $max2$3$3$i$i$i = 0.0, $max2$3$4$i$i$i = 0.0, $max2$3$5$i$i$i = 0.0, $max2$3$6$i$i$i = 0.0, $max2$3$i$i$i = 0.0, $neg$1$i = 0, $neg$2$i = 0, $neg$3$i = 0;
 var $neg$4$i = 0, $neg$5$i = 0, $neg$6$i = 0, $neg$7$i = 0, $neg$i = 0, $neg$i30 = 0, $not$$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond1$i = 0, $p0$020$i$i$i = 0, $p0$114$i$i$i = 0, $p0$28$i$i$i = 0, $p1$015$i$i$i = 0, $p1$19$i$i$i = 0, $p1$23$i$i$i = 0, $p2$016$i$i$i = 0, $p2$110$i$i$i = 0, $p2$24$i$i$i = 0, $p3$017$i$i$i = 0;
 var $p3$111$i$i$i = 0, $p3$25$i$i$i = 0, $phitmp = 0, $ps2$0$i$i$i = 0.0, $psc$0116$i$i$i = 0.0, $psc$194$i$i$i = 0.0, $psc$268$i$i$i = 0.0, $psc$343$i$i$i = 0.0, $psc$4$i$i$i = 0.0, $psc$5$i$i$i = 0.0, $ptr1$09$i$i = 0, $ptr2$010$i$i = 0, $ptr2$15$i$i = 0, $ptr_ri0i0$0123$i$i$i = 0, $ptr_ri0i1$0147$i$i$i = 0, $ptr_ri0i1$1144$i$i$i = 0, $ptr_ri0i1$2124$i$i$i = 0, $ptr_ri0i1$3103$i$i$i = 0, $ptr_ri0i2$0148$i$i$i = 0, $ptr_ri0i2$1145$i$i$i = 0;
 var $ptr_ri0i2$2125$i$i$i = 0, $ptr_ri0i2$3104$i$i$i = 0, $ptr_ri0i2$477$i$i$i = 0, $ptr_ri0i3$0149$i$i$i = 0, $ptr_ri0i3$1146$i$i$i = 0, $ptr_ri0i3$2126$i$i$i = 0, $ptr_ri0i3$551$i$i$i = 0, $ptr_ri1i1$0102$i$i$i = 0, $ptr_ri1i2$0140$i$i$i = 0, $ptr_ri1i2$2106$i$i$i = 0, $ptr_ri1i2$379$i$i$i = 0, $ptr_ri1i3$0141$i$i$i = 0, $ptr_ri1i3$2107$i$i$i = 0, $ptr_ri1i3$452$i$i$i = 0, $ptr_ri2i2$076$i$i$i = 0, $ptr_ri2i3$0133$i$i$i = 0, $ptr_ri2i3$281$i$i$i = 0, $ptr_ri2i3$353$i$i$i = 0, $ptr_ri2i3$4$i$i$i = 0, $ptr_ri3i3$050$i$i$i = 0;
 var $rr$i$i = 0, $sPnt$010$i = 0, $scevgep$i = 0, $scevgep$i$i = 0, $scevgep$i$i$i = 0, $scevgep$i$i5 = 0, $scevgep$i1 = 0, $scevgep$i104$i = 0, $scevgep$i111$i = 0, $scevgep$i118$i = 0, $scevgep$i125$i = 0, $scevgep$i13 = 0, $scevgep$i13$i = 0, $scevgep$i132$i = 0, $scevgep$i139$i = 0, $scevgep$i146$i = 0, $scevgep$i153$i = 0, $scevgep$i160$i = 0, $scevgep$i167$i = 0, $scevgep$i174$i = 0;
 var $scevgep$i18 = 0, $scevgep$i181$i = 0, $scevgep$i188$i = 0, $scevgep$i195$i = 0, $scevgep$i27$i = 0, $scevgep$i41$i = 0, $scevgep$i48$i = 0, $scevgep$i55$i = 0, $scevgep$i6$i = 0, $scevgep$i62$i = 0, $scevgep$i69$i = 0, $scevgep$i76$i = 0, $scevgep$i80 = 0, $scevgep$i83$i = 0, $scevgep$i97$i = 0, $scevgep10$i = 0, $scevgep184$i$i$i = 0, $scevgep187$i$i$i = 0, $scevgep188$i$i$i = 0, $scevgep192$i$i$i = 0;
 var $scevgep193$i$i$i = 0, $scevgep194$i$i$i = 0, $scevgep198$i$i$i = 0, $scevgep20$i = 0, $scevgep40 = 0, $scevgep55 = 0, $scevgep59 = 0, $scevgep63$i = 0, $scevgep69$1$i = 0, $scevgep69$2$i = 0, $scevgep69$3$i = 0, $scevgep69$i = 0, $sext$i = 0, $sext$i$i = 0, $sext$mask$i$i = 0, $sext1$i$i = 0, $shif$0115$i$i$i = 0, $shif$193$i$i$i = 0, $shif$267$i$i$i = 0, $shif$342$i$i$i = 0;
 var $shif$4$i$i$i = 0, $shif$5$i$i$i = 0, $shif$6$i$i$i = 0, $shift$0$i$i$i = 0, $storemerge$i = 0.0, $storemerge$i$i$i = 0.0, $storemerge$i39 = 0.0, $storemerge$i75 = 0, $storemerge$in$i$i$i = 0, $storemerge1$i = 0, $storemerge270 = 0, $storemerge271 = 0, $storemerge272 = 0, $sum$0$lcssa$i$i = 0.0, $sum$0$lcssa$i$i$i$i = 0.0, $sum$02$i$i = 0.0, $sum$02$i$i$i = 0.0, $sum$02$i$i$i$i = 0.0, $sum$02$i$i1$i = 0.0, $sum$02$i$i2$i$i = 0.0;
 var $sum$02$i$i84 = 0.0, $sum$02$i1$i = 0.0, $sum$02$i1$i$i$i = 0.0, $sum$02$i1$i82 = 0.0, $sum$02$i13$i = 0.0, $sum$02$i17$i = 0.0, $sum$02$i21$i = 0.0, $sum$02$i25$i = 0.0, $sum$02$i29$i = 0.0, $sum$02$i33$i = 0.0, $sum$02$i37$i = 0.0, $sum$02$i41$i = 0.0, $sum$02$i45$i = 0.0, $sum$02$i49$i = 0.0, $sum$02$i5$i = 0.0, $sum$02$i9$i = 0.0, $t$0$i$i$i = 0, $t$1$i$i$i = 0, $t$2$i$i$i = 0, $temp$0$lcssa$i$i = 0.0;
 var $temp$0$lcssa$i13$i = 0.0, $temp$02$i$i = 0.0, $temp$02$i9$i = 0.0, $temp$i = 0, $thres$0$i$i$i = 0.0, $time$0118$i$i$i = 0, $time$196$i$i$i = 0, $time$270$i$i$i = 0, $time$3$i$i$i = 0, $time$4$i$i$i = 0, $tmp_code$i$i = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 8496|0;
 $FltBuf$i = sp + 7048|0;
 $CorVct$i = sp + 6328|0;
 $Bound$i = sp + 6072|0;
 $temp$i = sp + 5832|0;
 $h$i$i$i = sp + 5576|0;
 $tmp_code$i$i = sp + 5320|0;
 $rr$i$i = sp + 3656|0;
 $Best$i = sp + 3592|0;
 $DataBuff = sp + 2632|0;
 $UnqLpc = sp + 2472|0;
 $QntLpc = sp + 2312|0;
 $PerLpc = sp + 1992|0;
 $LspVect = sp + 1952|0;
 $Line = sp + 1824|0;
 $Pw = sp + 8|0;
 $ImpResp = sp + 1584|0;
 $FloatBuf = sp + 40|0;
 $0 = sp;
 $1 = HEAP32[36992>>2]|0;
 $2 = ($1|0)==(1);
 if ($2) {
  HEAP32[16>>2] = 120;
  $i$030 = 0;
 } else {
  $i$030 = 0;
 }
 while(1) {
  $3 = (($Src) + ($i$030<<1)|0);
  $4 = HEAP16[$3>>1]|0;
  $5 = ($4<<16>>16)==(0);
  if ($5) {
   $6 = (($DataBuff) + ($i$030<<2)|0);
   HEAPF32[$6>>2] = 0.0;
  } else {
   $7 = (+($4<<16>>16));
   $8 = (($DataBuff) + ($i$030<<2)|0);
   HEAPF32[$8>>2] = $7;
  }
  $9 = (($i$030) + 1)|0;
  $exitcond64 = ($9|0)==(240);
  if ($exitcond64) {
   break;
  } else {
   $i$030 = $9;
  }
 }
 HEAP16[$Line>>1] = 0;
 $10 = HEAP32[((36992 + 4|0))>>2]|0;
 $11 = ($10|0)==(0);
 if (!($11)) {
  $$promoted210 = +HEAPF32[37008>>2];
  $$promoted211 = +HEAPF32[((37008 + 4|0))>>2];
  $15 = $$promoted210;$17 = $$promoted211;$i$02$i = 0;
  while(1) {
   $12 = (($DataBuff) + ($i$02$i<<2)|0);
   $13 = +HEAPF32[$12>>2];
   $14 = $13 - $15;
   $16 = $17 * 0.9921875;
   $18 = $14 + $16;
   $19 = $18;
   $20 = $18 == 0.0;
   $21 = !($19 <= 1.0000000000000001E-18);
   $or$cond$i = $20 | $21;
   $22 = !($19 >= -1.0000000000000001E-18);
   $or$cond1$i = $or$cond$i | $22;
   $$276 = $or$cond1$i ? $18 : 0.0;
   $$277 = $or$cond1$i ? $18 : 0.0;
   HEAPF32[$12>>2] = $$276;
   $23 = (($i$02$i) + 1)|0;
   $exitcond$i = ($23|0)==(240);
   if ($exitcond$i) {
    break;
   } else {
    $15 = $13;$17 = $$277;$i$02$i = $23;
   }
  }
  HEAPF32[37008>>2] = $13;
  HEAPF32[((37008 + 4|0))>>2] = $$277;
 }
 _memcpy(($FltBuf$i|0),(((37008 + 1788|0))|0),480)|0;
 $scevgep20$i = (($FltBuf$i) + 480|0);
 _memcpy(($scevgep20$i|0),($DataBuff|0),960)|0;
 $curAcf$011$i = $Bound$i;$k$010$i = 0;
 while(1) {
  $24 = ($k$010$i*11)|0;
  $25 = (($24) + 1)|0;
  $scevgep$i1 = (($Bound$i) + ($25<<2)|0);
  $26 = ($k$010$i*60)|0;
  $i$24$i = 0;
  while(1) {
   $27 = (($i$24$i) + ($26))|0;
   $28 = (($FltBuf$i) + ($27<<2)|0);
   $29 = +HEAPF32[$28>>2];
   $30 = (56 + ($i$24$i<<2)|0);
   $31 = +HEAPF32[$30>>2];
   $32 = $29 * $31;
   $33 = (($CorVct$i) + ($i$24$i<<2)|0);
   HEAPF32[$33>>2] = $32;
   $34 = (($i$24$i) + 1)|0;
   $exitcond$i3 = ($34|0)==(180);
   if ($exitcond$i3) {
    $i$01$i$i = 0;$sum$02$i$i = 0.0;
    break;
   } else {
    $i$24$i = $34;
   }
  }
  while(1) {
   $35 = (($CorVct$i) + ($i$01$i$i<<2)|0);
   $36 = +HEAPF32[$35>>2];
   $37 = $36 * $36;
   $38 = (($i$01$i$i) + 1)|0;
   $39 = (($CorVct$i) + ($38<<2)|0);
   $40 = +HEAPF32[$39>>2];
   $41 = $40 * $40;
   $42 = $37 + $41;
   $43 = (($i$01$i$i) + 2)|0;
   $44 = (($CorVct$i) + ($43<<2)|0);
   $45 = +HEAPF32[$44>>2];
   $46 = $45 * $45;
   $47 = $42 + $46;
   $48 = $sum$02$i$i + $47;
   $49 = (($i$01$i$i) + 3)|0;
   $50 = ($49|0)<(180);
   if ($50) {
    $i$01$i$i = $49;$sum$02$i$i = $48;
   } else {
    break;
   }
  }
  $51 = $48 / 32400.0;
  $52 = $51 * 1.0009765625;
  HEAPF32[$curAcf$011$i>>2] = $52;
  $53 = $52 == 0.0;
  if ($53) {
   dest=$scevgep$i1+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
  } else {
   $i$46$i = 1;
   while(1) {
    $54 = (180 - ($i$46$i))|0;
    $55 = ($54|0)>(0);
    if ($55) {
     $i$01$i2$i = 0;$sum$02$i1$i = 0.0;
     while(1) {
      $56 = (($CorVct$i) + ($i$01$i2$i<<2)|0);
      $57 = +HEAPF32[$56>>2];
      $$sum181 = (($i$46$i) + ($i$01$i2$i))|0;
      $58 = (($CorVct$i) + ($$sum181<<2)|0);
      $59 = +HEAPF32[$58>>2];
      $60 = $57 * $59;
      $61 = $sum$02$i1$i + $60;
      $62 = (($i$01$i2$i) + 1)|0;
      $exitcond$i3$i = ($62|0)==($54|0);
      if ($exitcond$i3$i) {
       $sum$0$lcssa$i$i = $61;
       break;
      } else {
       $i$01$i2$i = $62;$sum$02$i1$i = $61;
      }
     }
    } else {
     $sum$0$lcssa$i$i = 0.0;
    }
    $63 = $sum$0$lcssa$i$i / 32400.0;
    $64 = (($i$46$i) + -1)|0;
    $65 = (776 + ($64<<2)|0);
    $66 = +HEAPF32[$65>>2];
    $67 = $63 * $66;
    $68 = (($curAcf$011$i) + ($i$46$i<<2)|0);
    HEAPF32[$68>>2] = $67;
    $69 = (($i$46$i) + 1)|0;
    $exitcond15$i = ($69|0)==(11);
    if ($exitcond15$i) {
     break;
    } else {
     $i$46$i = $69;
    }
   }
  }
  $70 = ($k$010$i*10)|0;
  $71 = (($UnqLpc) + ($70<<2)|0);
  $72 = (($curAcf$011$i) + 4|0);
  $73 = +HEAPF32[$curAcf$011$i>>2];
  (+_Durbin($71,$72,$73,$temp$i));
  $74 = HEAP16[((37008 + 2428|0))>>1]|0;
  $75 = $74 << 16 >> 16;
  $76 = $75 << 1;
  $77 = $76&65535;
  HEAP16[((37008 + 2428|0))>>1] = $77;
  $78 = +HEAPF32[$temp$i>>2];
  $79 = $78 > 0.94999998807907104;
  if ($79) {
   $80 = $77 | 1;
   HEAP16[((37008 + 2428|0))>>1] = $80;
   $84 = $80;
  } else {
   $84 = $77;
  }
  $81 = (($curAcf$011$i) + 44|0);
  $82 = (($k$010$i) + 1)|0;
  $exitcond18$i = ($82|0)==(4);
  if ($exitcond18$i) {
   break;
  } else {
   $curAcf$011$i = $81;$k$010$i = $82;
  }
 }
 $83 = $84&65535;
 $85 = $83 & 32767;
 $86 = $83 & 1;
 $87 = $83 >>> 1;
 $88 = $87 & 1;
 $89 = (($86) + ($88))|0;
 $90 = $83 >>> 2;
 $91 = $90 & 1;
 $92 = (($89) + ($91))|0;
 $93 = $83 >>> 3;
 $94 = $93 & 1;
 $95 = (($92) + ($94))|0;
 $96 = $83 >>> 4;
 $97 = $96 & 1;
 $98 = (($95) + ($97))|0;
 $99 = $83 >>> 5;
 $100 = $99 & 1;
 $101 = (($98) + ($100))|0;
 $102 = $83 >>> 6;
 $103 = $102 & 1;
 $104 = (($101) + ($103))|0;
 $105 = $83 >>> 7;
 $106 = $105 & 1;
 $107 = (($104) + ($106))|0;
 $108 = $83 >>> 8;
 $109 = $108 & 1;
 $110 = (($107) + ($109))|0;
 $111 = $83 >>> 9;
 $112 = $111 & 1;
 $113 = (($110) + ($112))|0;
 $114 = $83 >>> 10;
 $115 = $114 & 1;
 $116 = (($113) + ($115))|0;
 $117 = $83 >>> 11;
 $118 = $117 & 1;
 $119 = (($116) + ($118))|0;
 $120 = $83 >>> 12;
 $121 = $120 & 1;
 $122 = (($119) + ($121))|0;
 $123 = $83 >>> 13;
 $124 = $123 & 1;
 $125 = (($122) + ($124))|0;
 $126 = $83 >>> 14;
 $127 = $126 & 1;
 $128 = (($125) + ($127))|0;
 $129 = ($128|0)>(13);
 $130 = $83 | 32768;
 $$278 = $129 ? $130 : $85;
 $storemerge271 = $$278&65535;
 HEAP16[((37008 + 2428|0))>>1] = $storemerge271;
 $i$08$i$i = 11;$ptr1$09$i$i = ((39528 + 140|0));$ptr2$010$i$i = ((39528 + 184|0));
 while(1) {
  $131 = (($ptr1$09$i$i) + -4|0);
  $132 = +HEAPF32[$131>>2];
  $133 = (($ptr2$010$i$i) + -4|0);
  HEAPF32[$133>>2] = $132;
  $134 = (($i$08$i$i) + 1)|0;
  $exitcond14$i$i = ($134|0)==(44);
  if ($exitcond14$i$i) {
   break;
  } else {
   $i$08$i$i = $134;$ptr1$09$i$i = $131;$ptr2$010$i$i = $133;
  }
 }
 dest=((39528 + 8|0))+0|0; stop=dest+44|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $138 = 0.0;$142 = 0.0;$146 = 0.0;$150 = 0.0;$154 = 0.0;$158 = 0.0;$162 = 0.0;$166 = 0.0;$170 = 0.0;$174 = 0.0;$177 = 0.0;$i_subfr$04$i$i = 0;$ptr2$15$i$i = $Bound$i;
 while(1) {
  $135 = (($ptr2$15$i$i) + 4|0);
  $136 = +HEAPF32[$ptr2$15$i$i>>2];
  $137 = $136 + $138;
  HEAPF32[((39528 + 8|0))>>2] = $137;
  $139 = (($ptr2$15$i$i) + 8|0);
  $140 = +HEAPF32[$135>>2];
  $141 = $140 + $142;
  HEAPF32[((39528 + 12|0))>>2] = $141;
  $143 = (($ptr2$15$i$i) + 12|0);
  $144 = +HEAPF32[$139>>2];
  $145 = $144 + $146;
  HEAPF32[((39528 + 16|0))>>2] = $145;
  $147 = (($ptr2$15$i$i) + 16|0);
  $148 = +HEAPF32[$143>>2];
  $149 = $148 + $150;
  HEAPF32[((39528 + 20|0))>>2] = $149;
  $151 = (($ptr2$15$i$i) + 20|0);
  $152 = +HEAPF32[$147>>2];
  $153 = $152 + $154;
  HEAPF32[((39528 + 24|0))>>2] = $153;
  $155 = (($ptr2$15$i$i) + 24|0);
  $156 = +HEAPF32[$151>>2];
  $157 = $156 + $158;
  HEAPF32[((39528 + 28|0))>>2] = $157;
  $159 = (($ptr2$15$i$i) + 28|0);
  $160 = +HEAPF32[$155>>2];
  $161 = $160 + $162;
  HEAPF32[((39528 + 32|0))>>2] = $161;
  $163 = (($ptr2$15$i$i) + 32|0);
  $164 = +HEAPF32[$159>>2];
  $165 = $164 + $166;
  HEAPF32[((39528 + 36|0))>>2] = $165;
  $167 = (($ptr2$15$i$i) + 36|0);
  $168 = +HEAPF32[$163>>2];
  $169 = $168 + $170;
  HEAPF32[((39528 + 40|0))>>2] = $169;
  $171 = (($ptr2$15$i$i) + 40|0);
  $172 = +HEAPF32[$167>>2];
  $173 = $172 + $174;
  HEAPF32[((39528 + 44|0))>>2] = $173;
  $175 = +HEAPF32[$171>>2];
  $176 = $175 + $177;
  HEAPF32[((39528 + 48|0))>>2] = $176;
  $scevgep$i$i5 = (($ptr2$15$i$i) + 44|0);
  $178 = (($i_subfr$04$i$i) + 1)|0;
  $exitcond$i$i6 = ($178|0)==(4);
  if ($exitcond$i$i6) {
   break;
  } else {
   $138 = $137;$142 = $141;$146 = $145;$150 = $149;$154 = $153;$158 = $157;$162 = $161;$166 = $165;$170 = $169;$174 = $173;$177 = $176;$i_subfr$04$i$i = $178;$ptr2$15$i$i = $scevgep$i$i5;
  }
 }
 $179 = (($UnqLpc) + 120|0);
 _AtoLsp($LspVect,$179);
 $180 = HEAP32[((36992 + 8|0))>>2]|0;
 $181 = ($180|0)==(0);
 if ($181) {
  $$0$i = 1;
 } else {
  $182 = HEAP16[((39464 + 14|0))>>1]|0;
  $183 = ($182<<16>>16)<(145);
  $$Minp$0$i = $183 ? $182 : 145;
  $184 = HEAP16[((39464 + 16|0))>>1]|0;
  $185 = ($$Minp$0$i<<16>>16)>($184<<16>>16);
  $$Minp$0$1$i = $185 ? $184 : $$Minp$0$i;
  $186 = HEAP16[((39464 + 18|0))>>1]|0;
  $187 = ($$Minp$0$1$i<<16>>16)>($186<<16>>16);
  $$Minp$0$2$i = $187 ? $186 : $$Minp$0$1$i;
  $188 = HEAP16[((39464 + 20|0))>>1]|0;
  $189 = ($$Minp$0$2$i<<16>>16)>($188<<16>>16);
  $$Minp$0$3$i = $189 ? $188 : $$Minp$0$2$i;
  $190 = $$Minp$0$3$i << 16 >> 16;
  $191 = $190 << 1;
  $192 = (($191) + ($190))|0;
  $193 = (($192) + ($190))|0;
  $194 = (($193) + ($190))|0;
  $195 = (($194) + ($190))|0;
  $196 = (($195) + ($190))|0;
  $197 = (($196) + ($190))|0;
  $199 = $182;$Tm2$011$i = 0;$i$110$i = 1;
  while(1) {
   $198 = $199 << 16 >> 16;
   $200 = (($190) - ($198))|0;
   $ispos$i = ($200|0)>(-1);
   $neg$i = (0 - ($200))|0;
   $201 = $ispos$i ? $200 : $neg$i;
   $202 = ($201|0)<(4);
   $203 = $202&1;
   $$Tm2$1$i = (($203) + ($Tm2$011$i))|0;
   $204 = (($191) - ($198))|0;
   $ispos$1$i = ($204|0)>(-1);
   $neg$1$i = (0 - ($204))|0;
   $205 = $ispos$1$i ? $204 : $neg$1$i;
   $206 = ($205|0)<(4);
   $207 = $206&1;
   $$Tm2$1$1$i = (($207) + ($$Tm2$1$i))|0;
   $208 = (($192) - ($198))|0;
   $ispos$2$i = ($208|0)>(-1);
   $neg$2$i = (0 - ($208))|0;
   $209 = $ispos$2$i ? $208 : $neg$2$i;
   $210 = ($209|0)<(4);
   $211 = $210&1;
   $$Tm2$1$2$i = (($211) + ($$Tm2$1$1$i))|0;
   $212 = (($193) - ($198))|0;
   $ispos$3$i = ($212|0)>(-1);
   $neg$3$i = (0 - ($212))|0;
   $213 = $ispos$3$i ? $212 : $neg$3$i;
   $214 = ($213|0)<(4);
   $215 = $214&1;
   $$Tm2$1$3$i = (($215) + ($$Tm2$1$2$i))|0;
   $216 = (($194) - ($198))|0;
   $ispos$4$i = ($216|0)>(-1);
   $neg$4$i = (0 - ($216))|0;
   $217 = $ispos$4$i ? $216 : $neg$4$i;
   $218 = ($217|0)<(4);
   $219 = $218&1;
   $$Tm2$1$4$i = (($219) + ($$Tm2$1$3$i))|0;
   $220 = (($195) - ($198))|0;
   $ispos$5$i = ($220|0)>(-1);
   $neg$5$i = (0 - ($220))|0;
   $221 = $ispos$5$i ? $220 : $neg$5$i;
   $222 = ($221|0)<(4);
   $223 = $222&1;
   $$Tm2$1$5$i = (($223) + ($$Tm2$1$4$i))|0;
   $224 = (($196) - ($198))|0;
   $ispos$6$i = ($224|0)>(-1);
   $neg$6$i = (0 - ($224))|0;
   $225 = $ispos$6$i ? $224 : $neg$6$i;
   $226 = ($225|0)<(4);
   $227 = $226&1;
   $$Tm2$1$6$i = (($227) + ($$Tm2$1$5$i))|0;
   $228 = (($197) - ($198))|0;
   $ispos$7$i = ($228|0)>(-1);
   $neg$7$i = (0 - ($228))|0;
   $229 = $ispos$7$i ? $228 : $neg$7$i;
   $230 = ($229|0)<(4);
   $231 = $230&1;
   $$Tm2$1$7$i = (($231) + ($$Tm2$1$6$i))|0;
   $exitcond16$i = ($i$110$i|0)==(4);
   if ($exitcond16$i) {
    break;
   }
   $$phi$trans$insert254 = ((39464 + ($i$110$i<<1)|0) + 14|0);
   $$pre255 = HEAP16[$$phi$trans$insert254>>1]|0;
   $phitmp = (($i$110$i) + 1)|0;
   $199 = $$pre255;$Tm2$011$i = $$Tm2$1$7$i;$i$110$i = $phitmp;
  }
  $232 = ($$Tm2$1$7$i|0)==(4);
  $233 = HEAP16[((37008 + 2428|0))>>1]|0;
  $234 = ($233<<16>>16)<(0);
  $or$cond = $232 | $234;
  $235 = HEAP16[((39464 + 12|0))>>1]|0;
  if ($or$cond) {
   $236 = $235&65535;
   $237 = (($236) + 2)|0;
   $238 = $237&65535;
   $storemerge1$i = $238;
  } else {
   $239 = (($235) + -1)<<16>>16;
   $storemerge1$i = $239;
  }
  HEAP16[((39464 + 12|0))>>1] = $storemerge1$i;
  $240 = ($storemerge1$i<<16>>16)>(6);
  if ($240) {
   HEAP16[((39464 + 12|0))>>1] = 6;
   $305 = 6;
  } else {
   $241 = ($storemerge1$i<<16>>16)<(0);
   if ($241) {
    HEAP16[((39464 + 12|0))>>1] = 0;
    $305 = 0;
   } else {
    $305 = $storemerge1$i;
   }
  }
  $242 = +HEAPF32[((39464 + 24|0))>>2];
  $243 = +HEAPF32[((39464 + 28|0))>>2];
  $244 = +HEAPF32[((39464 + 32|0))>>2];
  $245 = +HEAPF32[((39464 + 36|0))>>2];
  $246 = +HEAPF32[((39464 + 40|0))>>2];
  $247 = +HEAPF32[((39464 + 44|0))>>2];
  $248 = +HEAPF32[((39464 + 48|0))>>2];
  $249 = +HEAPF32[((39464 + 52|0))>>2];
  $250 = +HEAPF32[((39464 + 56|0))>>2];
  $251 = +HEAPF32[((39464 + 60|0))>>2];
  $$phi$trans$insert256 = (($DataBuff) + 236|0);
  $$pre257 = +HEAPF32[$$phi$trans$insert256>>2];
  $$phi$trans$insert258 = (($DataBuff) + 228|0);
  $$pre259 = +HEAPF32[$$phi$trans$insert258>>2];
  $$phi$trans$insert260 = (($DataBuff) + 220|0);
  $$pre261 = +HEAPF32[$$phi$trans$insert260>>2];
  $$phi$trans$insert262 = (($DataBuff) + 212|0);
  $$pre263 = +HEAPF32[$$phi$trans$insert262>>2];
  $$phi$trans$insert264 = (($DataBuff) + 204|0);
  $$pre265 = +HEAPF32[$$phi$trans$insert264>>2];
  $255 = $$pre257;$263 = $$pre259;$271 = $$pre261;$279 = $$pre263;$287 = $$pre265;$Enr$05$i = 0.0;$i$24$i8 = 60;
  while(1) {
   $252 = (($DataBuff) + ($i$24$i8<<2)|0);
   $253 = +HEAPF32[$252>>2];
   $254 = $255 * $242;
   $256 = $253 - $254;
   $257 = (($i$24$i8) + -2)|0;
   $258 = (($DataBuff) + ($257<<2)|0);
   $259 = +HEAPF32[$258>>2];
   $260 = $259 * $243;
   $261 = $256 - $260;
   $262 = $263 * $244;
   $264 = $261 - $262;
   $265 = (($i$24$i8) + -4)|0;
   $266 = (($DataBuff) + ($265<<2)|0);
   $267 = +HEAPF32[$266>>2];
   $268 = $267 * $245;
   $269 = $264 - $268;
   $270 = $271 * $246;
   $272 = $269 - $270;
   $273 = (($i$24$i8) + -6)|0;
   $274 = (($DataBuff) + ($273<<2)|0);
   $275 = +HEAPF32[$274>>2];
   $276 = $275 * $247;
   $277 = $272 - $276;
   $278 = $279 * $248;
   $280 = $277 - $278;
   $281 = (($i$24$i8) + -8)|0;
   $282 = (($DataBuff) + ($281<<2)|0);
   $283 = +HEAPF32[$282>>2];
   $284 = $283 * $249;
   $285 = $280 - $284;
   $286 = $287 * $250;
   $288 = $285 - $286;
   $289 = (($i$24$i8) + -10)|0;
   $290 = (($DataBuff) + ($289<<2)|0);
   $291 = +HEAPF32[$290>>2];
   $292 = $291 * $251;
   $293 = $288 - $292;
   $294 = $293 * $293;
   $295 = $Enr$05$i + $294;
   $296 = (($i$24$i8) + 1)|0;
   $exitcond$i9 = ($296|0)==(240);
   if ($exitcond$i9) {
    break;
   } else {
    $255 = $253;$263 = $259;$271 = $267;$279 = $275;$287 = $283;$Enr$05$i = $295;$i$24$i8 = $296;
   }
  }
  $297 = $295 / 180.0;
  $298 = $297 * 0.5;
  $299 = +HEAPF32[((39464 + 8|0))>>2];
  $300 = +HEAPF32[((39464 + 4|0))>>2];
  $301 = $299 > $300;
  if ($301) {
   $302 = $299 * 0.25;
   $303 = $300 * 0.75;
   $304 = $302 + $303;
   HEAPF32[((39464 + 8|0))>>2] = $304;
   $308 = $304;
  } else {
   $308 = $299;
  }
  $306 = ($305<<16>>16)==(0);
  if ($306) {
   $307 = $308 * 1.03125;
   $storemerge$i = $307;
  } else {
   $309 = $308 * 0.99951171875;
   $storemerge$i = $309;
  }
  HEAPF32[((39464 + 8|0))>>2] = $storemerge$i;
  HEAPF32[((39464 + 4|0))>>2] = $298;
  $310 = $storemerge$i < 128.0;
  if ($310) {
   HEAPF32[((39464 + 8|0))>>2] = 128.0;
   $313 = 128.0;
  } else {
   $311 = $storemerge$i > 131071.0;
   if ($311) {
    HEAPF32[((39464 + 8|0))>>2] = 131071.0;
    $313 = 131071.0;
   } else {
    $313 = $storemerge$i;
   }
  }
  $312 = $313;
  $314 = (+_frexp($312,$FltBuf$i));
  $315 = $314;
  $316 = $315 * 128.0;
  $floorf$i = (+Math_floor((+$316)));
  $317 = $floorf$i * 0.015625;
  $318 = $317 + -1.0;
  $319 = 1.0 - $318;
  $320 = HEAP32[$FltBuf$i>>2]|0;
  $321 = (18 - ($320))|0;
  $322 = (36944 + ($321<<2)|0);
  $323 = +HEAPF32[$322>>2];
  $324 = $323 * $319;
  $325 = (17 - ($320))|0;
  $326 = (36944 + ($325<<2)|0);
  $327 = +HEAPF32[$326>>2];
  $328 = $318 * $327;
  $329 = $324 + $328;
  $330 = +HEAPF32[((39464 + 8|0))>>2];
  $331 = $330 * $329;
  $332 = $331 * 2.44140625E-4;
  $333 = $332 > $298;
  $334 = $333&1;
  $VadState$0$i = $334 ^ 1;
  $335 = HEAP16[((39464 + 2|0))>>1]|0;
  if ($333) {
   $342 = (($335) + -1)<<16>>16;
   $343 = ($342<<16>>16)<(0);
   $$$i11 = $343 ? 0 : $342;
   HEAP16[((39464 + 2|0))>>1] = $$$i11;
   $344 = $$$i11;
  } else {
   $336 = (($335) + 1)<<16>>16;
   HEAP16[((39464 + 2|0))>>1] = $336;
   $337 = HEAP32[39464>>2]|0;
   $338 = $337&65535;
   $339 = (($338) + 1)<<16>>16;
   HEAP16[39464>>1] = $339;
   $340 = $337 >>> 16;
   $341 = $340&65535;
   $344 = $341;
  }
  $345 = ($344<<16>>16)>(1);
  if ($345) {
   HEAP16[39464>>1] = 6;
   $346 = ($344<<16>>16)>(2);
   if ($346) {
    HEAP16[((39464 + 2|0))>>1] = 3;
    $VadState$1$i = 1;
   } else {
    $VadState$1$i = 1;
   }
  } else {
   $$pr$pre = HEAP32[39464>>2]|0;
   $347 = $$pr$pre&65535;
   $348 = $$pr$pre >>> 16;
   $349 = $348&65535;
   $350 = ($347<<16>>16)==(0);
   if ($350) {
    $VadState$1$i = $VadState$0$i;
   } else {
    $351 = $349;$354 = $347;
    $352 = ($351<<16>>16)==(0);
    if ($352) {
     $353 = (($354) + -1)<<16>>16;
     HEAP16[39464>>1] = $353;
     $VadState$1$i = 1;
    } else {
     $VadState$1$i = 1;
    }
   }
  }
  $355 = HEAP16[((39464 + 18|0))>>1]|0;
  HEAP16[((39464 + 14|0))>>1] = $355;
  $356 = HEAP16[((39464 + 20|0))>>1]|0;
  HEAP16[((39464 + 16|0))>>1] = $356;
  $$0$i = $VadState$1$i;
 }
 $357 = $$0$i&65535;
 $358 = (_Lsp_Qnt($LspVect)|0);
 $359 = (($Line) + 4|0);
 HEAP32[$359>>2] = $358;
 _memcpy(($FltBuf$i|0),(((37008 + 1788|0))|0),480)|0;
 _memcpy(($scevgep20$i|0),($DataBuff|0),960)|0;
 $scevgep10$i = (($FltBuf$i) + 960|0);
 _memcpy((((37008 + 1788|0))|0),($scevgep10$i|0),480)|0;
 $scevgep$i13 = (($FltBuf$i) + 240|0);
 _memcpy(($DataBuff|0),($scevgep$i13|0),960)|0;
 $j$02$i = 0;
 while(1) {
  $360 = (($UnqLpc) + ($j$02$i<<2)|0);
  $361 = +HEAPF32[$360>>2];
  $362 = (13104 + ($j$02$i<<2)|0);
  $363 = +HEAPF32[$362>>2];
  $364 = $361 * $363;
  $365 = (($PerLpc) + ($j$02$i<<2)|0);
  HEAPF32[$365>>2] = $364;
  $366 = (13144 + ($j$02$i<<2)|0);
  $367 = +HEAPF32[$366>>2];
  $368 = $361 * $367;
  $369 = (($j$02$i) + 10)|0;
  $370 = (($PerLpc) + ($369<<2)|0);
  HEAPF32[$370>>2] = $368;
  $371 = (($j$02$i) + 1)|0;
  $exitcond$i15 = ($371|0)==(10);
  if ($exitcond$i15) {
   $j$02$1$i = 0;
   break;
  } else {
   $j$02$i = $371;
  }
 }
 while(1) {
  $$sum$i = (($j$02$1$i) + 10)|0;
  $372 = (($UnqLpc) + ($$sum$i<<2)|0);
  $373 = +HEAPF32[$372>>2];
  $374 = (13104 + ($j$02$1$i<<2)|0);
  $375 = +HEAPF32[$374>>2];
  $376 = $373 * $375;
  $$sum10$i = (($j$02$1$i) + 20)|0;
  $377 = (($PerLpc) + ($$sum10$i<<2)|0);
  HEAPF32[$377>>2] = $376;
  $378 = (13144 + ($j$02$1$i<<2)|0);
  $379 = +HEAPF32[$378>>2];
  $380 = $373 * $379;
  $$sum11$i = (($j$02$1$i) + 30)|0;
  $381 = (($PerLpc) + ($$sum11$i<<2)|0);
  HEAPF32[$381>>2] = $380;
  $382 = (($j$02$1$i) + 1)|0;
  $exitcond$1$i = ($382|0)==(10);
  if ($exitcond$1$i) {
   $j$02$2$i = 0;
   break;
  } else {
   $j$02$1$i = $382;
  }
 }
 while(1) {
  $$sum12$i = (($j$02$2$i) + 20)|0;
  $383 = (($UnqLpc) + ($$sum12$i<<2)|0);
  $384 = +HEAPF32[$383>>2];
  $385 = (13104 + ($j$02$2$i<<2)|0);
  $386 = +HEAPF32[$385>>2];
  $387 = $384 * $386;
  $$sum13$i = (($j$02$2$i) + 40)|0;
  $388 = (($PerLpc) + ($$sum13$i<<2)|0);
  HEAPF32[$388>>2] = $387;
  $389 = (13144 + ($j$02$2$i<<2)|0);
  $390 = +HEAPF32[$389>>2];
  $391 = $384 * $390;
  $$sum14$i = (($j$02$2$i) + 50)|0;
  $392 = (($PerLpc) + ($$sum14$i<<2)|0);
  HEAPF32[$392>>2] = $391;
  $393 = (($j$02$2$i) + 1)|0;
  $exitcond$2$i = ($393|0)==(10);
  if ($exitcond$2$i) {
   $j$02$3$i = 0;
   break;
  } else {
   $j$02$2$i = $393;
  }
 }
 while(1) {
  $$sum15$i = (($j$02$3$i) + 30)|0;
  $394 = (($UnqLpc) + ($$sum15$i<<2)|0);
  $395 = +HEAPF32[$394>>2];
  $396 = (13104 + ($j$02$3$i<<2)|0);
  $397 = +HEAPF32[$396>>2];
  $398 = $395 * $397;
  $$sum16$i = (($j$02$3$i) + 60)|0;
  $399 = (($PerLpc) + ($$sum16$i<<2)|0);
  HEAPF32[$399>>2] = $398;
  $400 = (13144 + ($j$02$3$i<<2)|0);
  $401 = +HEAPF32[$400>>2];
  $402 = $395 * $401;
  $$sum17$i = (($j$02$3$i) + 70)|0;
  $403 = (($PerLpc) + ($$sum17$i<<2)|0);
  HEAPF32[$403>>2] = $402;
  $404 = (($j$02$3$i) + 1)|0;
  $exitcond$3$i = ($404|0)==(10);
  if ($exitcond$3$i) {
   $$016$i = $PerLpc;$$07$i = $DataBuff;$k$08$i = 0;
   break;
  } else {
   $j$02$3$i = $404;
  }
 }
 while(1) {
  $405 = (($$016$i) + 40|0);
  $406 = (($$016$i) + 4|0);
  $407 = (($$016$i) + 8|0);
  $408 = (($$016$i) + 12|0);
  $409 = (($$016$i) + 16|0);
  $410 = (($$016$i) + 20|0);
  $411 = (($$016$i) + 24|0);
  $412 = (($$016$i) + 28|0);
  $413 = (($$016$i) + 32|0);
  $414 = (($$016$i) + 36|0);
  $415 = (($$016$i) + 44|0);
  $416 = (($$016$i) + 48|0);
  $417 = (($$016$i) + 52|0);
  $418 = (($$016$i) + 56|0);
  $419 = (($$016$i) + 60|0);
  $420 = (($$016$i) + 64|0);
  $421 = (($$016$i) + 68|0);
  $422 = (($$016$i) + 72|0);
  $423 = (($$016$i) + 76|0);
  $$14$i = $$07$i;$i$05$i = 0;
  while(1) {
   $424 = +HEAPF32[$$14$i>>2];
   $425 = +HEAPF32[$$016$i>>2];
   $426 = +HEAPF32[((37008 + 2268|0))>>2];
   $427 = $425 * $426;
   $428 = +HEAPF32[$406>>2];
   $429 = +HEAPF32[((37008 + 2272|0))>>2];
   $430 = $428 * $429;
   $431 = $427 + $430;
   $432 = +HEAPF32[$407>>2];
   $433 = +HEAPF32[((37008 + 2276|0))>>2];
   $434 = $432 * $433;
   $435 = $431 + $434;
   $436 = +HEAPF32[$408>>2];
   $437 = +HEAPF32[((37008 + 2280|0))>>2];
   $438 = $436 * $437;
   $439 = $435 + $438;
   $440 = +HEAPF32[$409>>2];
   $441 = +HEAPF32[((37008 + 2284|0))>>2];
   $442 = $440 * $441;
   $443 = $439 + $442;
   $444 = +HEAPF32[$410>>2];
   $445 = +HEAPF32[((37008 + 2288|0))>>2];
   $446 = $444 * $445;
   $447 = $443 + $446;
   $448 = +HEAPF32[$411>>2];
   $449 = +HEAPF32[((37008 + 2292|0))>>2];
   $450 = $448 * $449;
   $451 = $447 + $450;
   $452 = +HEAPF32[$412>>2];
   $453 = +HEAPF32[((37008 + 2296|0))>>2];
   $454 = $452 * $453;
   $455 = $451 + $454;
   $456 = +HEAPF32[$413>>2];
   $457 = +HEAPF32[((37008 + 2300|0))>>2];
   $458 = $456 * $457;
   $459 = $455 + $458;
   $460 = +HEAPF32[$414>>2];
   $461 = +HEAPF32[((37008 + 2304|0))>>2];
   $462 = $460 * $461;
   $463 = $459 + $462;
   HEAPF32[((37008 + 2304|0))>>2] = $457;
   HEAPF32[((37008 + 2300|0))>>2] = $453;
   HEAPF32[((37008 + 2296|0))>>2] = $449;
   HEAPF32[((37008 + 2292|0))>>2] = $445;
   HEAPF32[((37008 + 2288|0))>>2] = $441;
   HEAPF32[((37008 + 2284|0))>>2] = $437;
   HEAPF32[((37008 + 2280|0))>>2] = $433;
   HEAPF32[((37008 + 2276|0))>>2] = $429;
   HEAPF32[((37008 + 2272|0))>>2] = $426;
   $464 = +HEAPF32[$$14$i>>2];
   HEAPF32[((37008 + 2268|0))>>2] = $464;
   $465 = +HEAPF32[$405>>2];
   $466 = +HEAPF32[((37008 + 2308|0))>>2];
   $467 = $465 * $466;
   $468 = +HEAPF32[$415>>2];
   $469 = +HEAPF32[((37008 + 2312|0))>>2];
   $470 = $468 * $469;
   $471 = $467 + $470;
   $472 = +HEAPF32[$416>>2];
   $473 = +HEAPF32[((37008 + 2316|0))>>2];
   $474 = $472 * $473;
   $475 = $471 + $474;
   $476 = +HEAPF32[$417>>2];
   $477 = +HEAPF32[((37008 + 2320|0))>>2];
   $478 = $476 * $477;
   $479 = $475 + $478;
   $480 = +HEAPF32[$418>>2];
   $481 = +HEAPF32[((37008 + 2324|0))>>2];
   $482 = $480 * $481;
   $483 = $479 + $482;
   $484 = +HEAPF32[$419>>2];
   $485 = +HEAPF32[((37008 + 2328|0))>>2];
   $486 = $484 * $485;
   $487 = $483 + $486;
   $488 = +HEAPF32[$420>>2];
   $489 = +HEAPF32[((37008 + 2332|0))>>2];
   $490 = $488 * $489;
   $491 = $487 + $490;
   $492 = +HEAPF32[$421>>2];
   $493 = +HEAPF32[((37008 + 2336|0))>>2];
   $494 = $492 * $493;
   $495 = $491 + $494;
   $496 = +HEAPF32[$422>>2];
   $497 = +HEAPF32[((37008 + 2340|0))>>2];
   $498 = $496 * $497;
   $499 = $495 + $498;
   $500 = +HEAPF32[$423>>2];
   $501 = +HEAPF32[((37008 + 2344|0))>>2];
   $502 = $500 * $501;
   $503 = $499 + $502;
   HEAPF32[((37008 + 2344|0))>>2] = $497;
   HEAPF32[((37008 + 2340|0))>>2] = $493;
   HEAPF32[((37008 + 2336|0))>>2] = $489;
   HEAPF32[((37008 + 2332|0))>>2] = $485;
   HEAPF32[((37008 + 2328|0))>>2] = $481;
   HEAPF32[((37008 + 2324|0))>>2] = $477;
   HEAPF32[((37008 + 2320|0))>>2] = $473;
   HEAPF32[((37008 + 2316|0))>>2] = $469;
   HEAPF32[((37008 + 2312|0))>>2] = $466;
   $504 = $424 - $463;
   $505 = $504 + $503;
   HEAPF32[((37008 + 2308|0))>>2] = $505;
   $506 = (($$14$i) + 4|0);
   HEAPF32[$$14$i>>2] = $505;
   $507 = (($i$05$i) + 1)|0;
   $exitcond$i17 = ($507|0)==(60);
   if ($exitcond$i17) {
    break;
   } else {
    $$14$i = $506;$i$05$i = $507;
   }
  }
  $scevgep$i18 = (($$07$i) + 240|0);
  $508 = (($$016$i) + 80|0);
  $509 = (($k$08$i) + 1)|0;
  $exitcond9$i = ($509|0)==(4);
  if ($exitcond9$i) {
   break;
  } else {
   $$016$i = $508;$$07$i = $scevgep$i18;$k$08$i = $509;
  }
 }
 _memcpy(($FloatBuf|0),(((37008 + 48|0))|0),580)|0;
 $scevgep59 = (($FloatBuf) + 580|0);
 _memcpy(($scevgep59|0),($DataBuff|0),960)|0;
 $510 = (_Estim_Pitch($FloatBuf,145)|0);
 $511 = (($Line) + 8|0);
 HEAP32[$511>>2] = $510;
 $512 = $510&65535;
 HEAP16[((39464 + 18|0))>>1] = $512;
 $513 = (_Estim_Pitch($FloatBuf,265)|0);
 $514 = (($Line) + 12|0);
 HEAP32[$514>>2] = $513;
 $515 = $513&65535;
 HEAP16[((39464 + 20|0))>>1] = $515;
 $516 = ($357<<16>>16)==(1);
 if ($516) {
  _Comp_Pw($0,$FloatBuf,145,$510);
  $803 = $0;
  $804 = $803;
  $805 = HEAP32[$804>>2]|0;
  $806 = (($803) + 4)|0;
  $807 = $806;
  $808 = HEAP32[$807>>2]|0;
  $809 = $Pw;
  $810 = $809;
  HEAP32[$810>>2] = $805;
  $811 = (($809) + 4)|0;
  $812 = $811;
  HEAP32[$812>>2] = $808;
  $813 = (($Pw) + 8|0);
  $814 = HEAP32[$511>>2]|0;
  _Comp_Pw($0,$FloatBuf,205,$814);
  $815 = $0;
  $816 = $815;
  $817 = HEAP32[$816>>2]|0;
  $818 = (($815) + 4)|0;
  $819 = $818;
  $820 = HEAP32[$819>>2]|0;
  $821 = $813;
  $822 = $821;
  HEAP32[$822>>2] = $817;
  $823 = (($821) + 4)|0;
  $824 = $823;
  HEAP32[$824>>2] = $820;
  $825 = (($Pw) + 16|0);
  $826 = HEAP32[$514>>2]|0;
  _Comp_Pw($0,$FloatBuf,265,$826);
  $827 = $0;
  $828 = $827;
  $829 = HEAP32[$828>>2]|0;
  $830 = (($827) + 4)|0;
  $831 = $830;
  $832 = HEAP32[$831>>2]|0;
  $833 = $825;
  $834 = $833;
  HEAP32[$834>>2] = $829;
  $835 = (($833) + 4)|0;
  $836 = $835;
  HEAP32[$836>>2] = $832;
  $837 = (($Pw) + 24|0);
  $838 = HEAP32[$514>>2]|0;
  _Comp_Pw($0,$FloatBuf,325,$838);
  $839 = $0;
  $840 = $839;
  $841 = HEAP32[$840>>2]|0;
  $842 = (($839) + 4)|0;
  $843 = $842;
  $844 = HEAP32[$843>>2]|0;
  $845 = $837;
  $846 = $845;
  HEAP32[$846>>2] = $841;
  $847 = (($845) + 4)|0;
  $848 = $847;
  HEAP32[$848>>2] = $844;
  _memcpy(($FloatBuf|0),(((37008 + 48|0))|0),580)|0;
  _memcpy(($scevgep59|0),($DataBuff|0),960)|0;
  $scevgep40 = (($FloatBuf) + 960|0);
  _memcpy((((37008 + 48|0))|0),($scevgep40|0),580)|0;
  $849 = (HEAP32[tempDoublePtr>>2]=$808,+HEAPF32[tempDoublePtr>>2]);
  $i$01$i = 0;
  while(1) {
   $850 = (($i$01$i) + 145)|0;
   $851 = (($FloatBuf) + ($850<<2)|0);
   $852 = +HEAPF32[$851>>2];
   $853 = (($850) - ($805))|0;
   $854 = (($FloatBuf) + ($853<<2)|0);
   $855 = +HEAPF32[$854>>2];
   $856 = $849 * $855;
   $857 = $852 - $856;
   $858 = (($DataBuff) + ($i$01$i<<2)|0);
   HEAPF32[$858>>2] = $857;
   $859 = (($i$01$i) + 1)|0;
   $exitcond$i41 = ($859|0)==(60);
   if ($exitcond$i41) {
    break;
   } else {
    $i$01$i = $859;
   }
  }
  $860 = (HEAP32[tempDoublePtr>>2]=$820,+HEAPF32[tempDoublePtr>>2]);
  $i$01$i44 = 0;
  while(1) {
   $861 = (($i$01$i44) + 205)|0;
   $862 = (($FloatBuf) + ($861<<2)|0);
   $863 = +HEAPF32[$862>>2];
   $864 = (($861) - ($817))|0;
   $865 = (($FloatBuf) + ($864<<2)|0);
   $866 = +HEAPF32[$865>>2];
   $867 = $860 * $866;
   $868 = $863 - $867;
   $869 = (($i$01$i44) + 60)|0;
   $870 = (($DataBuff) + ($869<<2)|0);
   HEAPF32[$870>>2] = $868;
   $871 = (($i$01$i44) + 1)|0;
   $exitcond$i45 = ($871|0)==(60);
   if ($exitcond$i45) {
    break;
   } else {
    $i$01$i44 = $871;
   }
  }
  $872 = (HEAP32[tempDoublePtr>>2]=$832,+HEAPF32[tempDoublePtr>>2]);
  $i$01$i49 = 0;
  while(1) {
   $873 = (($i$01$i49) + 265)|0;
   $874 = (($FloatBuf) + ($873<<2)|0);
   $875 = +HEAPF32[$874>>2];
   $876 = (($873) - ($829))|0;
   $877 = (($FloatBuf) + ($876<<2)|0);
   $878 = +HEAPF32[$877>>2];
   $879 = $872 * $878;
   $880 = $875 - $879;
   $881 = (($i$01$i49) + 120)|0;
   $882 = (($DataBuff) + ($881<<2)|0);
   HEAPF32[$882>>2] = $880;
   $883 = (($i$01$i49) + 1)|0;
   $exitcond$i50 = ($883|0)==(60);
   if ($exitcond$i50) {
    break;
   } else {
    $i$01$i49 = $883;
   }
  }
  $884 = (HEAP32[tempDoublePtr>>2]=$844,+HEAPF32[tempDoublePtr>>2]);
  $i$01$i54 = 0;
  while(1) {
   $885 = (($i$01$i54) + 325)|0;
   $886 = (($FloatBuf) + ($885<<2)|0);
   $887 = +HEAPF32[$886>>2];
   $888 = (($885) - ($841))|0;
   $889 = (($FloatBuf) + ($888<<2)|0);
   $890 = +HEAPF32[$889>>2];
   $891 = $884 * $890;
   $892 = $887 - $891;
   $893 = (($i$01$i54) + 180)|0;
   $894 = (($DataBuff) + ($893<<2)|0);
   HEAPF32[$894>>2] = $892;
   $895 = (($i$01$i54) + 1)|0;
   $exitcond$i55 = ($895|0)==(60);
   if ($exitcond$i55) {
    break;
   } else {
    $i$01$i54 = $895;
   }
  }
  $896 = HEAP32[$359>>2]|0;
  $897 = HEAP16[$Line>>1]|0;
  _Lsp_Inq($LspVect,((37008 + 8|0)),$896,$897);
  _Lsp_Int($QntLpc,$LspVect,((37008 + 8|0)));
  dest=((37008 + 8|0))+0|0; src=$LspVect+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
  $898 = (($Bound$i) + 4|0);
  $899 = (($Bound$i) + 8|0);
  $900 = (($Bound$i) + 12|0);
  $901 = (($Bound$i) + 16|0);
  $902 = (($Bound$i) + 20|0);
  $903 = (($Bound$i) + 24|0);
  $904 = (($Bound$i) + 28|0);
  $905 = (($Bound$i) + 32|0);
  $906 = (($Bound$i) + 36|0);
  $907 = (($h$i$i$i) + 4|0);
  $908 = (($h$i$i$i) + 12|0);
  $909 = (($FltBuf$i) + 720|0);
  $910 = (($h$i$i$i) + 8|0);
  $911 = (($FltBuf$i) + 480|0);
  $912 = (($FltBuf$i) + 240|0);
  $913 = (($Bound$i) + 4|0);
  $914 = (($Best$i) + 4|0);
  $915 = (($Best$i) + 8|0);
  $916 = (($Best$i) + 12|0);
  $scevgep$i$i$i = (($h$i$i$i) + 16|0);
  $917 = (($rr$i$i) + 1660|0);
  $918 = (($rr$i$i) + 1148|0);
  $919 = (($rr$i$i) + 380|0);
  $920 = (($rr$i$i) + 888|0);
  $921 = (($rr$i$i) + 1404|0);
  $922 = (($rr$i$i) + 636|0);
  $923 = (($rr$i$i) + 1400|0);
  $924 = (($rr$i$i) + 632|0);
  $925 = (($h$i$i$i) + 24|0);
  $926 = (($rr$i$i) + 892|0);
  $927 = (($rr$i$i) + 1656|0);
  $928 = (($rr$i$i) + 1144|0);
  $929 = (($rr$i$i) + 376|0);
  $930 = (($rr$i$i) + 64|0);
  $931 = (($rr$i$i) + 128|0);
  $932 = (($rr$i$i) + 640|0);
  $933 = (($rr$i$i) + 1152|0);
  $scevgep198$i$i$i = (($Bound$i) + 240|0);
  $934 = (($rr$i$i) + 32|0);
  $935 = (($rr$i$i) + 96|0);
  $936 = (($rr$i$i) + 384|0);
  $937 = (($rr$i$i) + 896|0);
  $938 = (($rr$i$i) + 1408|0);
  $939 = (($FltBuf$i) + 124|0);
  $940 = (($FltBuf$i) + 120|0);
  $941 = (($CorVct$i) + 124|0);
  $942 = (($CorVct$i) + 120|0);
  $943 = (($Bound$i) + 8|0);
  $944 = (($Bound$i) + 16|0);
  $945 = (($Bound$i) + 32|0);
  $946 = (($Bound$i) + 40|0);
  $947 = (($Bound$i) + 48|0);
  $948 = (($Bound$i) + 64|0);
  $949 = (($Bound$i) + 72|0);
  $950 = (($Bound$i) + 80|0);
  $951 = (($Bound$i) + 96|0);
  $952 = (($Bound$i) + 104|0);
  $953 = (($Bound$i) + 112|0);
  $954 = (($Bound$i) + 128|0);
  $955 = (($Bound$i) + 136|0);
  $956 = (($Bound$i) + 144|0);
  $957 = (($Bound$i) + 160|0);
  $958 = (($Bound$i) + 168|0);
  $959 = (($Bound$i) + 176|0);
  $960 = (($Bound$i) + 192|0);
  $961 = (($Bound$i) + 200|0);
  $962 = (($Bound$i) + 208|0);
  $963 = (($Bound$i) + 224|0);
  $964 = (($Bound$i) + 232|0);
  $965 = (($Bound$i) + 4|0);
  $966 = (($Bound$i) + 12|0);
  $967 = (($Bound$i) + 20|0);
  $968 = (($Bound$i) + 36|0);
  $969 = (($Bound$i) + 44|0);
  $970 = (($Bound$i) + 52|0);
  $971 = (($Bound$i) + 68|0);
  $972 = (($Bound$i) + 76|0);
  $973 = (($Bound$i) + 84|0);
  $974 = (($Bound$i) + 100|0);
  $975 = (($Bound$i) + 108|0);
  $976 = (($Bound$i) + 116|0);
  $977 = (($Bound$i) + 132|0);
  $978 = (($Bound$i) + 140|0);
  $979 = (($Bound$i) + 148|0);
  $980 = (($Bound$i) + 164|0);
  $981 = (($Bound$i) + 172|0);
  $982 = (($Bound$i) + 180|0);
  $983 = (($Bound$i) + 196|0);
  $984 = (($Bound$i) + 204|0);
  $985 = (($Bound$i) + 212|0);
  $986 = (($Bound$i) + 228|0);
  $987 = (($Bound$i) + 236|0);
  $988 = (($Bound$i) + 244|0);
  $989 = (($CorVct$i) + 8|0);
  $990 = (($CorVct$i) + 12|0);
  $991 = (($CorVct$i) + 24|0);
  $992 = (($CorVct$i) + 28|0);
  $993 = (($CorVct$i) + 40|0);
  $994 = (($CorVct$i) + 44|0);
  $995 = (($CorVct$i) + 56|0);
  $996 = (($CorVct$i) + 60|0);
  $997 = (($CorVct$i) + 72|0);
  $998 = (($CorVct$i) + 76|0);
  $999 = (($CorVct$i) + 88|0);
  $1000 = (($CorVct$i) + 92|0);
  $1001 = (($CorVct$i) + 104|0);
  $1002 = (($CorVct$i) + 108|0);
  $Dpnt$13 = $DataBuff;$i$124 = 0;
  while(1) {
   $1003 = ($i$124*10)|0;
   $1004 = (($QntLpc) + ($1003<<2)|0);
   $1005 = ($i$124*20)|0;
   $1006 = (($PerLpc) + ($1005<<2)|0);
   $1007 = (($Pw) + ($i$124<<3)|0);
   $1008 = $1007;
   $1009 = $1008;
   $1010 = HEAP32[$1009>>2]|0;
   $1011 = (($1008) + 4)|0;
   $1012 = $1011;
   $1013 = HEAP32[$1012>>2]|0;
   $1014 = (HEAP32[tempDoublePtr>>2]=$1013,+HEAPF32[tempDoublePtr>>2]);
   dest=$Bound$i+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
   _memset(($FltBuf$i|0),0,820)|0;
   $$sum = (($1005) + 10)|0;
   $1015 = (($PerLpc) + ($$sum<<2)|0);
   $1016 = +HEAPF32[$1004>>2];
   $$sum9596 = $1003 | 1;
   $1017 = (($QntLpc) + ($$sum9596<<2)|0);
   $1018 = +HEAPF32[$1017>>2];
   $$sum97 = (($1003) + 2)|0;
   $1019 = (($QntLpc) + ($$sum97<<2)|0);
   $1020 = +HEAPF32[$1019>>2];
   $$sum98 = (($1003) + 3)|0;
   $1021 = (($QntLpc) + ($$sum98<<2)|0);
   $1022 = +HEAPF32[$1021>>2];
   $$sum99 = (($1003) + 4)|0;
   $1023 = (($QntLpc) + ($$sum99<<2)|0);
   $1024 = +HEAPF32[$1023>>2];
   $$sum100 = (($1003) + 5)|0;
   $1025 = (($QntLpc) + ($$sum100<<2)|0);
   $1026 = +HEAPF32[$1025>>2];
   $$sum101 = (($1003) + 6)|0;
   $1027 = (($QntLpc) + ($$sum101<<2)|0);
   $1028 = +HEAPF32[$1027>>2];
   $$sum102 = (($1003) + 7)|0;
   $1029 = (($QntLpc) + ($$sum102<<2)|0);
   $1030 = +HEAPF32[$1029>>2];
   $$sum103 = (($1003) + 8)|0;
   $1031 = (($QntLpc) + ($$sum103<<2)|0);
   $1032 = +HEAPF32[$1031>>2];
   $$sum104 = (($1003) + 9)|0;
   $1033 = (($QntLpc) + ($$sum104<<2)|0);
   $1034 = +HEAPF32[$1033>>2];
   $1035 = +HEAPF32[$1006>>2];
   $$sum105106 = $1005 | 1;
   $1036 = (($PerLpc) + ($$sum105106<<2)|0);
   $1037 = +HEAPF32[$1036>>2];
   $$sum107108 = $1005 | 2;
   $1038 = (($PerLpc) + ($$sum107108<<2)|0);
   $1039 = +HEAPF32[$1038>>2];
   $$sum109110 = $1005 | 3;
   $1040 = (($PerLpc) + ($$sum109110<<2)|0);
   $1041 = +HEAPF32[$1040>>2];
   $$sum111 = (($1005) + 4)|0;
   $1042 = (($PerLpc) + ($$sum111<<2)|0);
   $1043 = +HEAPF32[$1042>>2];
   $$sum112 = (($1005) + 5)|0;
   $1044 = (($PerLpc) + ($$sum112<<2)|0);
   $1045 = +HEAPF32[$1044>>2];
   $$sum113 = (($1005) + 6)|0;
   $1046 = (($PerLpc) + ($$sum113<<2)|0);
   $1047 = +HEAPF32[$1046>>2];
   $$sum114 = (($1005) + 7)|0;
   $1048 = (($PerLpc) + ($$sum114<<2)|0);
   $1049 = +HEAPF32[$1048>>2];
   $$sum115 = (($1005) + 8)|0;
   $1050 = (($PerLpc) + ($$sum115<<2)|0);
   $1051 = +HEAPF32[$1050>>2];
   $$sum116 = (($1005) + 9)|0;
   $1052 = (($PerLpc) + ($$sum116<<2)|0);
   $1053 = +HEAPF32[$1052>>2];
   $1054 = +HEAPF32[$1015>>2];
   $$sum117 = (($1005) + 11)|0;
   $1055 = (($PerLpc) + ($$sum117<<2)|0);
   $1056 = +HEAPF32[$1055>>2];
   $$sum118 = (($1005) + 12)|0;
   $1057 = (($PerLpc) + ($$sum118<<2)|0);
   $1058 = +HEAPF32[$1057>>2];
   $$sum119 = (($1005) + 13)|0;
   $1059 = (($PerLpc) + ($$sum119<<2)|0);
   $1060 = +HEAPF32[$1059>>2];
   $$sum120 = (($1005) + 14)|0;
   $1061 = (($PerLpc) + ($$sum120<<2)|0);
   $1062 = +HEAPF32[$1061>>2];
   $$sum121 = (($1005) + 15)|0;
   $1063 = (($PerLpc) + ($$sum121<<2)|0);
   $1064 = +HEAPF32[$1063>>2];
   $$sum122 = (($1005) + 16)|0;
   $1065 = (($PerLpc) + ($$sum122<<2)|0);
   $1066 = +HEAPF32[$1065>>2];
   $$sum123 = (($1005) + 17)|0;
   $1067 = (($PerLpc) + ($$sum123<<2)|0);
   $1068 = +HEAPF32[$1067>>2];
   $$sum124 = (($1005) + 18)|0;
   $1069 = (($PerLpc) + ($$sum124<<2)|0);
   $1070 = +HEAPF32[$1069>>2];
   $$sum125 = (($1005) + 19)|0;
   $1071 = (($PerLpc) + ($$sum125<<2)|0);
   $1072 = +HEAPF32[$1071>>2];
   $1074 = 0.0;$1076 = 0.0;$1079 = 0.0;$1082 = 0.0;$1085 = 0.0;$1088 = 0.0;$1091 = 0.0;$1094 = 0.0;$1097 = 0.0;$1100 = 0.0;$Acc0$03$i = 1.0;$IirDl$i$sroa$0$0 = 0.0;$IirDl$i$sroa$12$0 = 0.0;$IirDl$i$sroa$18$0 = 0.0;$IirDl$i$sroa$24$0 = 0.0;$IirDl$i$sroa$30$0 = 0.0;$IirDl$i$sroa$36$0 = 0.0;$IirDl$i$sroa$42$0 = 0.0;$IirDl$i$sroa$48$0 = 0.0;$IirDl$i$sroa$54$0 = 0.0;$IirDl$i$sroa$60$1 = 0.0;$i$24$i60 = 0;
   while(1) {
    $1073 = $1016 * $1074;
    $1075 = $1018 * $1076;
    $1077 = $1073 + $1075;
    $1078 = $1020 * $1079;
    $1080 = $1077 + $1078;
    $1081 = $1022 * $1082;
    $1083 = $1080 + $1081;
    $1084 = $1024 * $1085;
    $1086 = $1083 + $1084;
    $1087 = $1026 * $1088;
    $1089 = $1086 + $1087;
    $1090 = $1028 * $1091;
    $1092 = $1089 + $1090;
    $1093 = $1030 * $1094;
    $1095 = $1092 + $1093;
    $1096 = $1032 * $1097;
    $1098 = $1095 + $1096;
    $1099 = $1034 * $1100;
    $1101 = $1098 + $1099;
    $1102 = $1035 * $1074;
    $1103 = $1037 * $1076;
    $1104 = $1102 + $1103;
    $1105 = $1039 * $1079;
    $1106 = $1104 + $1105;
    $1107 = $1041 * $1082;
    $1108 = $1106 + $1107;
    $1109 = $1043 * $1085;
    $1110 = $1108 + $1109;
    $1111 = $1045 * $1088;
    $1112 = $1110 + $1111;
    $1113 = $1047 * $1091;
    $1114 = $1112 + $1113;
    $1115 = $1049 * $1094;
    $1116 = $1114 + $1115;
    $1117 = $1051 * $1097;
    $1118 = $1116 + $1117;
    $1119 = $1053 * $1100;
    $1120 = $1118 + $1119;
    $1121 = $Acc0$03$i + $1101;
    $1122 = $1054 * $IirDl$i$sroa$0$0;
    $1123 = $1056 * $IirDl$i$sroa$12$0;
    $1124 = $1122 + $1123;
    $1125 = $1058 * $IirDl$i$sroa$18$0;
    $1126 = $1124 + $1125;
    $1127 = $1060 * $IirDl$i$sroa$24$0;
    $1128 = $1126 + $1127;
    $1129 = $1062 * $IirDl$i$sroa$30$0;
    $1130 = $1128 + $1129;
    $1131 = $1064 * $IirDl$i$sroa$36$0;
    $1132 = $1130 + $1131;
    $1133 = $1066 * $IirDl$i$sroa$42$0;
    $1134 = $1132 + $1133;
    $1135 = $1068 * $IirDl$i$sroa$48$0;
    $1136 = $1134 + $1135;
    $1137 = $1070 * $IirDl$i$sroa$54$0;
    $1138 = $1136 + $1137;
    $1139 = $1072 * $IirDl$i$sroa$60$1;
    $1140 = $1138 + $1139;
    $1141 = $1121 - $1120;
    $1142 = $1141 + $1140;
    $1143 = (($i$24$i60) + 145)|0;
    $1144 = (($FltBuf$i) + ($1143<<2)|0);
    HEAPF32[$1144>>2] = $1142;
    $1145 = (($1143) - ($1010))|0;
    $1146 = (($FltBuf$i) + ($1145<<2)|0);
    $1147 = +HEAPF32[$1146>>2];
    $1148 = $1014 * $1147;
    $1149 = $1142 - $1148;
    $1150 = (($ImpResp) + ($i$24$i60<<2)|0);
    HEAPF32[$1150>>2] = $1149;
    $1151 = (($i$24$i60) + 1)|0;
    $exitcond$i61 = ($1151|0)==(60);
    if ($exitcond$i61) {
     break;
    } else {
     $IirDl$i$sroa$60$1$phi = $IirDl$i$sroa$54$0;$IirDl$i$sroa$54$0$phi = $IirDl$i$sroa$48$0;$IirDl$i$sroa$48$0$phi = $IirDl$i$sroa$42$0;$IirDl$i$sroa$42$0$phi = $IirDl$i$sroa$36$0;$IirDl$i$sroa$36$0$phi = $IirDl$i$sroa$30$0;$IirDl$i$sroa$30$0$phi = $IirDl$i$sroa$24$0;$IirDl$i$sroa$24$0$phi = $IirDl$i$sroa$18$0;$IirDl$i$sroa$18$0$phi = $IirDl$i$sroa$12$0;$IirDl$i$sroa$12$0$phi = $IirDl$i$sroa$0$0;$1100$phi = $1097;$1097$phi = $1094;$1094$phi = $1091;$1091$phi = $1088;$1088$phi = $1085;$1085$phi = $1082;$1082$phi = $1079;$1079$phi = $1076;$1076$phi = $1074;$1074 = $1121;$Acc0$03$i = 0.0;$IirDl$i$sroa$0$0 = $1142;$i$24$i60 = $1151;$IirDl$i$sroa$60$1 = $IirDl$i$sroa$60$1$phi;$IirDl$i$sroa$54$0 = $IirDl$i$sroa$54$0$phi;$IirDl$i$sroa$48$0 = $IirDl$i$sroa$48$0$phi;$IirDl$i$sroa$42$0 = $IirDl$i$sroa$42$0$phi;$IirDl$i$sroa$36$0 = $IirDl$i$sroa$36$0$phi;$IirDl$i$sroa$30$0 = $IirDl$i$sroa$30$0$phi;$IirDl$i$sroa$24$0 = $IirDl$i$sroa$24$0$phi;$IirDl$i$sroa$18$0 = $IirDl$i$sroa$18$0$phi;$IirDl$i$sroa$12$0 = $IirDl$i$sroa$12$0$phi;$1100 = $1100$phi;$1097 = $1097$phi;$1094 = $1094$phi;$1091 = $1091$phi;$1088 = $1088$phi;$1085 = $1085$phi;$1082 = $1082$phi;$1079 = $1079$phi;$1076 = $1076$phi;
    }
   }
   $1152 = $1007;
   $1153 = $1152;
   $1154 = HEAP32[$1153>>2]|0;
   $1155 = (($1152) + 4)|0;
   $1156 = $1155;
   $1157 = HEAP32[$1156>>2]|0;
   $1158 = (HEAP32[tempDoublePtr>>2]=$1157,+HEAPF32[tempDoublePtr>>2]);
   _memcpy(($FltBuf$i|0),(((37008 + 628|0))|0),580)|0;
   dest=$Bound$i+0|0; src=((37008 + 2348|0))+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   $1159 = +HEAPF32[((37008 + 2388|0))>>2];
   $1160 = +HEAPF32[((37008 + 2392|0))>>2];
   $1161 = +HEAPF32[((37008 + 2396|0))>>2];
   $1162 = +HEAPF32[((37008 + 2400|0))>>2];
   $1163 = +HEAPF32[((37008 + 2404|0))>>2];
   $1164 = +HEAPF32[((37008 + 2408|0))>>2];
   $1165 = +HEAPF32[((37008 + 2412|0))>>2];
   $1166 = +HEAPF32[((37008 + 2416|0))>>2];
   $1167 = +HEAPF32[((37008 + 2420|0))>>2];
   $1168 = +HEAPF32[((37008 + 2424|0))>>2];
   $1171 = $1016;$1174 = $1018;$1178 = $1020;$1182 = $1022;$1186 = $1024;$1190 = $1026;$1194 = $1028;$1198 = $1030;$1202 = $1032;$1206 = $1034;$1209 = $1035;$1211 = $1037;$1214 = $1039;$1217 = $1041;$1220 = $1043;$1223 = $1045;$1226 = $1047;$1229 = $1049;$1232 = $1051;$1235 = $1053;$1238 = $1054;$1240 = $1056;$1243 = $1058;$1246 = $1060;$IirDl$i$sroa$0$1 = $1159;$IirDl$i$sroa$12$1 = $1160;$IirDl$i$sroa$18$1 = $1161;$IirDl$i$sroa$24$1 = $1162;$IirDl$i$sroa$30$1 = $1163;$IirDl$i$sroa$36$1 = $1164;$IirDl$i$sroa$42$1 = $1165;$IirDl$i$sroa$48$1 = $1166;$IirDl$i$sroa$54$1 = $1167;$IirDl$i$sroa$60$2 = $1168;$i$23$i = 0;
   while(1) {
    $1169 = +HEAPF32[$Bound$i>>2];
    $1170 = $1171 * $1169;
    $1172 = +HEAPF32[$898>>2];
    $1173 = $1174 * $1172;
    $1175 = $1170 + $1173;
    $1176 = +HEAPF32[$899>>2];
    $1177 = $1178 * $1176;
    $1179 = $1175 + $1177;
    $1180 = +HEAPF32[$900>>2];
    $1181 = $1182 * $1180;
    $1183 = $1179 + $1181;
    $1184 = +HEAPF32[$901>>2];
    $1185 = $1186 * $1184;
    $1187 = $1183 + $1185;
    $1188 = +HEAPF32[$902>>2];
    $1189 = $1190 * $1188;
    $1191 = $1187 + $1189;
    $1192 = +HEAPF32[$903>>2];
    $1193 = $1194 * $1192;
    $1195 = $1191 + $1193;
    $1196 = +HEAPF32[$904>>2];
    $1197 = $1198 * $1196;
    $1199 = $1195 + $1197;
    $1200 = +HEAPF32[$905>>2];
    $1201 = $1202 * $1200;
    $1203 = $1199 + $1201;
    $1204 = +HEAPF32[$906>>2];
    $1205 = $1206 * $1204;
    $1207 = $1203 + $1205;
    $1208 = $1209 * $1169;
    $1210 = $1211 * $1172;
    $1212 = $1208 + $1210;
    $1213 = $1214 * $1176;
    $1215 = $1212 + $1213;
    $1216 = $1217 * $1180;
    $1218 = $1215 + $1216;
    $1219 = $1220 * $1184;
    $1221 = $1218 + $1219;
    $1222 = $1223 * $1188;
    $1224 = $1221 + $1222;
    $1225 = $1226 * $1192;
    $1227 = $1224 + $1225;
    $1228 = $1229 * $1196;
    $1230 = $1227 + $1228;
    $1231 = $1232 * $1200;
    $1233 = $1230 + $1231;
    $1234 = $1235 * $1204;
    $1236 = $1233 + $1234;
    HEAPF32[$906>>2] = $1200;
    HEAPF32[$905>>2] = $1196;
    HEAPF32[$904>>2] = $1192;
    HEAPF32[$903>>2] = $1188;
    HEAPF32[$902>>2] = $1184;
    HEAPF32[$901>>2] = $1180;
    HEAPF32[$900>>2] = $1176;
    HEAPF32[$899>>2] = $1172;
    HEAPF32[$898>>2] = $1169;
    HEAPF32[$Bound$i>>2] = $1207;
    $1237 = $1238 * $IirDl$i$sroa$0$1;
    $1239 = $1240 * $IirDl$i$sroa$12$1;
    $1241 = $1237 + $1239;
    $1242 = $1243 * $IirDl$i$sroa$18$1;
    $1244 = $1241 + $1242;
    $1245 = $1246 * $IirDl$i$sroa$24$1;
    $1247 = $1244 + $1245;
    $1248 = +HEAPF32[$1061>>2];
    $1249 = $1248 * $IirDl$i$sroa$30$1;
    $1250 = $1247 + $1249;
    $1251 = +HEAPF32[$1063>>2];
    $1252 = $1251 * $IirDl$i$sroa$36$1;
    $1253 = $1250 + $1252;
    $1254 = +HEAPF32[$1065>>2];
    $1255 = $1254 * $IirDl$i$sroa$42$1;
    $1256 = $1253 + $1255;
    $1257 = +HEAPF32[$1067>>2];
    $1258 = $1257 * $IirDl$i$sroa$48$1;
    $1259 = $1256 + $1258;
    $1260 = +HEAPF32[$1069>>2];
    $1261 = $1260 * $IirDl$i$sroa$54$1;
    $1262 = $1259 + $1261;
    $1263 = +HEAPF32[$1071>>2];
    $1264 = $1263 * $IirDl$i$sroa$60$2;
    $1265 = $1262 + $1264;
    $1266 = $1207 - $1236;
    $1267 = $1266 + $1265;
    $1268 = (($i$23$i) + 145)|0;
    $1269 = (($FltBuf$i) + ($1268<<2)|0);
    HEAPF32[$1269>>2] = $1267;
    $1270 = (($1268) - ($1154))|0;
    $1271 = (($FltBuf$i) + ($1270<<2)|0);
    $1272 = +HEAPF32[$1271>>2];
    $1273 = $1158 * $1272;
    $1274 = $1267 - $1273;
    $1275 = (($Dpnt$13) + ($i$23$i<<2)|0);
    $1276 = +HEAPF32[$1275>>2];
    $1277 = $1276 - $1274;
    HEAPF32[$1275>>2] = $1277;
    $1278 = (($i$23$i) + 1)|0;
    $exitcond$i67 = ($1278|0)==(60);
    if ($exitcond$i67) {
     break;
    }
    $$pre = +HEAPF32[$1004>>2];
    $$pre212 = +HEAPF32[$1017>>2];
    $$pre213 = +HEAPF32[$1019>>2];
    $$pre214 = +HEAPF32[$1021>>2];
    $$pre215 = +HEAPF32[$1023>>2];
    $$pre216 = +HEAPF32[$1025>>2];
    $$pre217 = +HEAPF32[$1027>>2];
    $$pre218 = +HEAPF32[$1029>>2];
    $$pre219 = +HEAPF32[$1031>>2];
    $$pre220 = +HEAPF32[$1033>>2];
    $$pre221 = +HEAPF32[$1006>>2];
    $$pre222 = +HEAPF32[$1036>>2];
    $$pre223 = +HEAPF32[$1038>>2];
    $$pre224 = +HEAPF32[$1040>>2];
    $$pre225 = +HEAPF32[$1042>>2];
    $$pre226 = +HEAPF32[$1044>>2];
    $$pre227 = +HEAPF32[$1046>>2];
    $$pre228 = +HEAPF32[$1048>>2];
    $$pre229 = +HEAPF32[$1050>>2];
    $$pre230 = +HEAPF32[$1052>>2];
    $$pre231 = +HEAPF32[$1015>>2];
    $$pre232 = +HEAPF32[$1055>>2];
    $$pre233 = +HEAPF32[$1057>>2];
    $$pre234 = +HEAPF32[$1059>>2];
    $IirDl$i$sroa$60$2$phi = $IirDl$i$sroa$54$1;$IirDl$i$sroa$54$1$phi = $IirDl$i$sroa$48$1;$IirDl$i$sroa$48$1$phi = $IirDl$i$sroa$42$1;$IirDl$i$sroa$42$1$phi = $IirDl$i$sroa$36$1;$IirDl$i$sroa$36$1$phi = $IirDl$i$sroa$30$1;$IirDl$i$sroa$30$1$phi = $IirDl$i$sroa$24$1;$IirDl$i$sroa$24$1$phi = $IirDl$i$sroa$18$1;$IirDl$i$sroa$18$1$phi = $IirDl$i$sroa$12$1;$IirDl$i$sroa$12$1$phi = $IirDl$i$sroa$0$1;$1171 = $$pre;$1174 = $$pre212;$1178 = $$pre213;$1182 = $$pre214;$1186 = $$pre215;$1190 = $$pre216;$1194 = $$pre217;$1198 = $$pre218;$1202 = $$pre219;$1206 = $$pre220;$1209 = $$pre221;$1211 = $$pre222;$1214 = $$pre223;$1217 = $$pre224;$1220 = $$pre225;$1223 = $$pre226;$1226 = $$pre227;$1229 = $$pre228;$1232 = $$pre229;$1235 = $$pre230;$1238 = $$pre231;$1240 = $$pre232;$1243 = $$pre233;$1246 = $$pre234;$IirDl$i$sroa$0$1 = $1267;$i$23$i = $1278;$IirDl$i$sroa$60$2 = $IirDl$i$sroa$60$2$phi;$IirDl$i$sroa$54$1 = $IirDl$i$sroa$54$1$phi;$IirDl$i$sroa$48$1 = $IirDl$i$sroa$48$1$phi;$IirDl$i$sroa$42$1 = $IirDl$i$sroa$42$1$phi;$IirDl$i$sroa$36$1 = $IirDl$i$sroa$36$1$phi;$IirDl$i$sroa$30$1 = $IirDl$i$sroa$30$1$phi;$IirDl$i$sroa$24$1 = $IirDl$i$sroa$24$1$phi;$IirDl$i$sroa$18$1 = $IirDl$i$sroa$18$1$phi;$IirDl$i$sroa$12$1 = $IirDl$i$sroa$12$1$phi;
   }
   $1279 = $i$124 >> 1;
   $1280 = ((($Line) + ($1279<<2)|0) + 8|0);
   $1281 = HEAP32[$1280>>2]|0;
   $1282 = $i$124 & 1;
   $1283 = ($1282|0)==(0);
   if ($1283) {
    $1284 = ($1281|0)==(18);
    $1285 = $1284&1;
    $$$i68 = (($1285) + ($1281))|0;
    $1286 = ($$$i68|0)>(140);
    $$$$i = $1286 ? 140 : $$$i68;
    $Olp$1$i = $$$$i;
   } else {
    $Olp$1$i = $1281;
   }
   $1287 = (($Olp$1$i) + -1)|0;
   $1288 = $1282 | 2;
   $k$049$i = 0;$lPnt$048$i = $CorVct$i;
   while(1) {
    $1289 = (($1287) + ($k$049$i))|0;
    $1290 = (143 - ($1289))|0;
    $1291 = ((37008 + ($1290<<2)|0) + 1208|0);
    $1292 = +HEAPF32[$1291>>2];
    HEAPF32[$h$i$i$i>>2] = $1292;
    $1293 = (($1290) + 1)|0;
    $1294 = ((37008 + ($1293<<2)|0) + 1208|0);
    $1295 = +HEAPF32[$1294>>2];
    HEAPF32[$907>>2] = $1295;
    $1296 = (145 - ($1289))|0;
    $i$11$i$i69 = 0;
    while(1) {
     $1297 = (($i$11$i$i69|0) % ($1289|0))&-1;
     $1298 = (($1296) + ($1297))|0;
     $1299 = ((37008 + ($1298<<2)|0) + 1208|0);
     $1300 = +HEAPF32[$1299>>2];
     $1301 = (($i$11$i$i69) + 2)|0;
     $1302 = (($h$i$i$i) + ($1301<<2)|0);
     HEAPF32[$1302>>2] = $1300;
     $1303 = (($i$11$i$i69) + 1)|0;
     $exitcond$i$i70 = ($1303|0)==(62);
     if ($exitcond$i$i70) {
      $i$030$i = 0;$indvars$iv53$i = 1;
      break;
     } else {
      $i$11$i$i69 = $1303;
     }
    }
    while(1) {
     $Acc0$025$i = 0.0;$j$026$i = 0;
     while(1) {
      $1304 = (($j$026$i) + 4)|0;
      $1305 = (($h$i$i$i) + ($1304<<2)|0);
      $1306 = +HEAPF32[$1305>>2];
      $1307 = (($i$030$i) - ($j$026$i))|0;
      $1308 = (($ImpResp) + ($1307<<2)|0);
      $1309 = +HEAPF32[$1308>>2];
      $1310 = $1306 * $1309;
      $1311 = $Acc0$025$i + $1310;
      $1312 = (($j$026$i) + 1)|0;
      $exitcond55$i = ($1312|0)==($indvars$iv53$i|0);
      if ($exitcond55$i) {
       break;
      } else {
       $Acc0$025$i = $1311;$j$026$i = $1312;
      }
     }
     $1313 = ((($FltBuf$i) + ($i$030$i<<2)|0) + 960|0);
     HEAPF32[$1313>>2] = $1311;
     $1314 = (($i$030$i) + 1)|0;
     $indvars$iv$next54$i = (($indvars$iv53$i) + 1)|0;
     $exitcond56$i = ($1314|0)==(60);
     if ($exitcond56$i) {
      break;
     } else {
      $i$030$i = $1314;$indvars$iv53$i = $indvars$iv$next54$i;
     }
    }
    $1315 = +HEAPF32[$908>>2];
    HEAPF32[$909>>2] = $1315;
    $j$131$i = 1;
    while(1) {
     $1316 = (($ImpResp) + ($j$131$i<<2)|0);
     $1317 = +HEAPF32[$1316>>2];
     $1318 = $1315 * $1317;
     $1319 = (($j$131$i) + -1)|0;
     $1320 = ((($FltBuf$i) + ($1319<<2)|0) + 960|0);
     $1321 = +HEAPF32[$1320>>2];
     $1322 = $1318 + $1321;
     $1323 = ((($FltBuf$i) + ($j$131$i<<2)|0) + 720|0);
     HEAPF32[$1323>>2] = $1322;
     $1324 = (($j$131$i) + 1)|0;
     $exitcond57$i = ($1324|0)==(60);
     if ($exitcond57$i) {
      break;
     } else {
      $j$131$i = $1324;
     }
    }
    $1325 = +HEAPF32[$910>>2];
    HEAPF32[$911>>2] = $1325;
    $j$131$1$i = 1;
    while(1) {
     $1498 = (($ImpResp) + ($j$131$1$i<<2)|0);
     $1499 = +HEAPF32[$1498>>2];
     $1500 = $1325 * $1499;
     $1501 = (($j$131$1$i) + -1)|0;
     $1502 = ((($FltBuf$i) + ($1501<<2)|0) + 720|0);
     $1503 = +HEAPF32[$1502>>2];
     $1504 = $1500 + $1503;
     $1505 = ((($FltBuf$i) + ($j$131$1$i<<2)|0) + 480|0);
     HEAPF32[$1505>>2] = $1504;
     $1506 = (($j$131$1$i) + 1)|0;
     $exitcond57$1$i = ($1506|0)==(60);
     if ($exitcond57$1$i) {
      break;
     } else {
      $j$131$1$i = $1506;
     }
    }
    $1507 = +HEAPF32[$907>>2];
    HEAPF32[$912>>2] = $1507;
    $j$131$2$i = 1;
    while(1) {
     $1508 = (($ImpResp) + ($j$131$2$i<<2)|0);
     $1509 = +HEAPF32[$1508>>2];
     $1510 = $1507 * $1509;
     $1511 = (($j$131$2$i) + -1)|0;
     $1512 = ((($FltBuf$i) + ($1511<<2)|0) + 480|0);
     $1513 = +HEAPF32[$1512>>2];
     $1514 = $1510 + $1513;
     $1515 = ((($FltBuf$i) + ($j$131$2$i<<2)|0) + 240|0);
     HEAPF32[$1515>>2] = $1514;
     $1516 = (($j$131$2$i) + 1)|0;
     $exitcond57$2$i = ($1516|0)==(60);
     if ($exitcond57$2$i) {
      break;
     } else {
      $j$131$2$i = $1516;
     }
    }
    $1517 = +HEAPF32[$h$i$i$i>>2];
    HEAPF32[$FltBuf$i>>2] = $1517;
    $j$131$3$i = 1;
    while(1) {
     $1518 = (($ImpResp) + ($j$131$3$i<<2)|0);
     $1519 = +HEAPF32[$1518>>2];
     $1520 = $1517 * $1519;
     $1521 = (($j$131$3$i) + -1)|0;
     $1522 = ((($FltBuf$i) + ($1521<<2)|0) + 240|0);
     $1523 = +HEAPF32[$1522>>2];
     $1524 = $1520 + $1523;
     $1525 = (($FltBuf$i) + ($j$131$3$i<<2)|0);
     HEAPF32[$1525>>2] = $1524;
     $1526 = (($j$131$3$i) + 1)|0;
     $exitcond57$3$i = ($1526|0)==(60);
     if ($exitcond57$3$i) {
      $i$01$i50$i = 0;$sum$02$i49$i = 0.0;
      break;
     } else {
      $j$131$3$i = $1526;
     }
    }
    while(1) {
     $1527 = (($Dpnt$13) + ($i$01$i50$i<<2)|0);
     $1528 = +HEAPF32[$1527>>2];
     $1529 = (($FltBuf$i) + ($i$01$i50$i<<2)|0);
     $1530 = +HEAPF32[$1529>>2];
     $1531 = $1528 * $1530;
     $1532 = (($i$01$i50$i) + 1)|0;
     $1533 = (($Dpnt$13) + ($1532<<2)|0);
     $1534 = +HEAPF32[$1533>>2];
     $1535 = (($FltBuf$i) + ($1532<<2)|0);
     $1536 = +HEAPF32[$1535>>2];
     $1537 = $1534 * $1536;
     $1538 = $1531 + $1537;
     $1539 = (($i$01$i50$i) + 2)|0;
     $1540 = (($Dpnt$13) + ($1539<<2)|0);
     $1541 = +HEAPF32[$1540>>2];
     $1542 = (($FltBuf$i) + ($1539<<2)|0);
     $1543 = +HEAPF32[$1542>>2];
     $1544 = $1541 * $1543;
     $1545 = $1538 + $1544;
     $1546 = $sum$02$i49$i + $1545;
     $1547 = (($i$01$i50$i) + 3)|0;
     $1548 = ($1547|0)<(60);
     if ($1548) {
      $i$01$i50$i = $1547;$sum$02$i49$i = $1546;
     } else {
      break;
     }
    }
    $1549 = (($lPnt$048$i) + 4|0);
    HEAPF32[$lPnt$048$i>>2] = $1546;
    $i$01$i46$i = 0;$sum$02$i45$i = 0.0;
    while(1) {
     $1550 = (($Dpnt$13) + ($i$01$i46$i<<2)|0);
     $1551 = +HEAPF32[$1550>>2];
     $1552 = ((($FltBuf$i) + ($i$01$i46$i<<2)|0) + 240|0);
     $1553 = +HEAPF32[$1552>>2];
     $1554 = $1551 * $1553;
     $1555 = (($i$01$i46$i) + 1)|0;
     $1556 = (($Dpnt$13) + ($1555<<2)|0);
     $1557 = +HEAPF32[$1556>>2];
     $1558 = ((($FltBuf$i) + ($1555<<2)|0) + 240|0);
     $1559 = +HEAPF32[$1558>>2];
     $1560 = $1557 * $1559;
     $1561 = $1554 + $1560;
     $1562 = (($i$01$i46$i) + 2)|0;
     $1563 = (($Dpnt$13) + ($1562<<2)|0);
     $1564 = +HEAPF32[$1563>>2];
     $1565 = ((($FltBuf$i) + ($1562<<2)|0) + 240|0);
     $1566 = +HEAPF32[$1565>>2];
     $1567 = $1564 * $1566;
     $1568 = $1561 + $1567;
     $1569 = $sum$02$i45$i + $1568;
     $1570 = (($i$01$i46$i) + 3)|0;
     $1571 = ($1570|0)<(60);
     if ($1571) {
      $i$01$i46$i = $1570;$sum$02$i45$i = $1569;
     } else {
      break;
     }
    }
    $1572 = (($lPnt$048$i) + 8|0);
    HEAPF32[$1549>>2] = $1569;
    $i$01$i42$i = 0;$sum$02$i41$i = 0.0;
    while(1) {
     $1573 = (($Dpnt$13) + ($i$01$i42$i<<2)|0);
     $1574 = +HEAPF32[$1573>>2];
     $1575 = ((($FltBuf$i) + ($i$01$i42$i<<2)|0) + 480|0);
     $1576 = +HEAPF32[$1575>>2];
     $1577 = $1574 * $1576;
     $1578 = (($i$01$i42$i) + 1)|0;
     $1579 = (($Dpnt$13) + ($1578<<2)|0);
     $1580 = +HEAPF32[$1579>>2];
     $1581 = ((($FltBuf$i) + ($1578<<2)|0) + 480|0);
     $1582 = +HEAPF32[$1581>>2];
     $1583 = $1580 * $1582;
     $1584 = $1577 + $1583;
     $1585 = (($i$01$i42$i) + 2)|0;
     $1586 = (($Dpnt$13) + ($1585<<2)|0);
     $1587 = +HEAPF32[$1586>>2];
     $1588 = ((($FltBuf$i) + ($1585<<2)|0) + 480|0);
     $1589 = +HEAPF32[$1588>>2];
     $1590 = $1587 * $1589;
     $1591 = $1584 + $1590;
     $1592 = $sum$02$i41$i + $1591;
     $1593 = (($i$01$i42$i) + 3)|0;
     $1594 = ($1593|0)<(60);
     if ($1594) {
      $i$01$i42$i = $1593;$sum$02$i41$i = $1592;
     } else {
      break;
     }
    }
    $1595 = (($lPnt$048$i) + 12|0);
    HEAPF32[$1572>>2] = $1592;
    $i$01$i38$i = 0;$sum$02$i37$i = 0.0;
    while(1) {
     $1596 = (($Dpnt$13) + ($i$01$i38$i<<2)|0);
     $1597 = +HEAPF32[$1596>>2];
     $1598 = ((($FltBuf$i) + ($i$01$i38$i<<2)|0) + 720|0);
     $1599 = +HEAPF32[$1598>>2];
     $1600 = $1597 * $1599;
     $1601 = (($i$01$i38$i) + 1)|0;
     $1602 = (($Dpnt$13) + ($1601<<2)|0);
     $1603 = +HEAPF32[$1602>>2];
     $1604 = ((($FltBuf$i) + ($1601<<2)|0) + 720|0);
     $1605 = +HEAPF32[$1604>>2];
     $1606 = $1603 * $1605;
     $1607 = $1600 + $1606;
     $1608 = (($i$01$i38$i) + 2)|0;
     $1609 = (($Dpnt$13) + ($1608<<2)|0);
     $1610 = +HEAPF32[$1609>>2];
     $1611 = ((($FltBuf$i) + ($1608<<2)|0) + 720|0);
     $1612 = +HEAPF32[$1611>>2];
     $1613 = $1610 * $1612;
     $1614 = $1607 + $1613;
     $1615 = $sum$02$i37$i + $1614;
     $1616 = (($i$01$i38$i) + 3)|0;
     $1617 = ($1616|0)<(60);
     if ($1617) {
      $i$01$i38$i = $1616;$sum$02$i37$i = $1615;
     } else {
      break;
     }
    }
    $1618 = (($lPnt$048$i) + 16|0);
    HEAPF32[$1595>>2] = $1615;
    $i$01$i34$i = 0;$sum$02$i33$i = 0.0;
    while(1) {
     $1619 = (($Dpnt$13) + ($i$01$i34$i<<2)|0);
     $1620 = +HEAPF32[$1619>>2];
     $1621 = ((($FltBuf$i) + ($i$01$i34$i<<2)|0) + 960|0);
     $1622 = +HEAPF32[$1621>>2];
     $1623 = $1620 * $1622;
     $1624 = (($i$01$i34$i) + 1)|0;
     $1625 = (($Dpnt$13) + ($1624<<2)|0);
     $1626 = +HEAPF32[$1625>>2];
     $1627 = ((($FltBuf$i) + ($1624<<2)|0) + 960|0);
     $1628 = +HEAPF32[$1627>>2];
     $1629 = $1626 * $1628;
     $1630 = $1623 + $1629;
     $1631 = (($i$01$i34$i) + 2)|0;
     $1632 = (($Dpnt$13) + ($1631<<2)|0);
     $1633 = +HEAPF32[$1632>>2];
     $1634 = ((($FltBuf$i) + ($1631<<2)|0) + 960|0);
     $1635 = +HEAPF32[$1634>>2];
     $1636 = $1633 * $1635;
     $1637 = $1630 + $1636;
     $1638 = $sum$02$i33$i + $1637;
     $1639 = (($i$01$i34$i) + 3)|0;
     $1640 = ($1639|0)<(60);
     if ($1640) {
      $i$01$i34$i = $1639;$sum$02$i33$i = $1638;
     } else {
      break;
     }
    }
    HEAPF32[$1618>>2] = $1638;
    $scevgep$i80 = (($lPnt$048$i) + 20|0);
    $i$01$i30$i = 0;$sum$02$i29$i = 0.0;
    while(1) {
     $1641 = (($FltBuf$i) + ($i$01$i30$i<<2)|0);
     $1642 = +HEAPF32[$1641>>2];
     $1643 = $1642 * $1642;
     $1644 = (($i$01$i30$i) + 1)|0;
     $1645 = (($FltBuf$i) + ($1644<<2)|0);
     $1646 = +HEAPF32[$1645>>2];
     $1647 = $1646 * $1646;
     $1648 = $1643 + $1647;
     $1649 = (($i$01$i30$i) + 2)|0;
     $1650 = (($FltBuf$i) + ($1649<<2)|0);
     $1651 = +HEAPF32[$1650>>2];
     $1652 = $1651 * $1651;
     $1653 = $1648 + $1652;
     $1654 = $sum$02$i29$i + $1653;
     $1655 = (($i$01$i30$i) + 3)|0;
     $1656 = ($1655|0)<(60);
     if ($1656) {
      $i$01$i30$i = $1655;$sum$02$i29$i = $1654;
     } else {
      break;
     }
    }
    $1657 = $1654 * 0.5;
    $1658 = (($lPnt$048$i) + 24|0);
    HEAPF32[$scevgep$i80>>2] = $1657;
    $i$01$i26$i = 0;$sum$02$i25$i = 0.0;
    while(1) {
     $1659 = ((($FltBuf$i) + ($i$01$i26$i<<2)|0) + 240|0);
     $1660 = +HEAPF32[$1659>>2];
     $1661 = $1660 * $1660;
     $1662 = (($i$01$i26$i) + 1)|0;
     $1663 = ((($FltBuf$i) + ($1662<<2)|0) + 240|0);
     $1664 = +HEAPF32[$1663>>2];
     $1665 = $1664 * $1664;
     $1666 = $1661 + $1665;
     $1667 = (($i$01$i26$i) + 2)|0;
     $1668 = ((($FltBuf$i) + ($1667<<2)|0) + 240|0);
     $1669 = +HEAPF32[$1668>>2];
     $1670 = $1669 * $1669;
     $1671 = $1666 + $1670;
     $1672 = $sum$02$i25$i + $1671;
     $1673 = (($i$01$i26$i) + 3)|0;
     $1674 = ($1673|0)<(60);
     if ($1674) {
      $i$01$i26$i = $1673;$sum$02$i25$i = $1672;
     } else {
      break;
     }
    }
    $1675 = $1672 * 0.5;
    $1676 = (($lPnt$048$i) + 28|0);
    HEAPF32[$1658>>2] = $1675;
    $i$01$i22$i = 0;$sum$02$i21$i = 0.0;
    while(1) {
     $1677 = ((($FltBuf$i) + ($i$01$i22$i<<2)|0) + 480|0);
     $1678 = +HEAPF32[$1677>>2];
     $1679 = $1678 * $1678;
     $1680 = (($i$01$i22$i) + 1)|0;
     $1681 = ((($FltBuf$i) + ($1680<<2)|0) + 480|0);
     $1682 = +HEAPF32[$1681>>2];
     $1683 = $1682 * $1682;
     $1684 = $1679 + $1683;
     $1685 = (($i$01$i22$i) + 2)|0;
     $1686 = ((($FltBuf$i) + ($1685<<2)|0) + 480|0);
     $1687 = +HEAPF32[$1686>>2];
     $1688 = $1687 * $1687;
     $1689 = $1684 + $1688;
     $1690 = $sum$02$i21$i + $1689;
     $1691 = (($i$01$i22$i) + 3)|0;
     $1692 = ($1691|0)<(60);
     if ($1692) {
      $i$01$i22$i = $1691;$sum$02$i21$i = $1690;
     } else {
      break;
     }
    }
    $1693 = $1690 * 0.5;
    $1694 = (($lPnt$048$i) + 32|0);
    HEAPF32[$1676>>2] = $1693;
    $i$01$i18$i = 0;$sum$02$i17$i = 0.0;
    while(1) {
     $1695 = ((($FltBuf$i) + ($i$01$i18$i<<2)|0) + 720|0);
     $1696 = +HEAPF32[$1695>>2];
     $1697 = $1696 * $1696;
     $1698 = (($i$01$i18$i) + 1)|0;
     $1699 = ((($FltBuf$i) + ($1698<<2)|0) + 720|0);
     $1700 = +HEAPF32[$1699>>2];
     $1701 = $1700 * $1700;
     $1702 = $1697 + $1701;
     $1703 = (($i$01$i18$i) + 2)|0;
     $1704 = ((($FltBuf$i) + ($1703<<2)|0) + 720|0);
     $1705 = +HEAPF32[$1704>>2];
     $1706 = $1705 * $1705;
     $1707 = $1702 + $1706;
     $1708 = $sum$02$i17$i + $1707;
     $1709 = (($i$01$i18$i) + 3)|0;
     $1710 = ($1709|0)<(60);
     if ($1710) {
      $i$01$i18$i = $1709;$sum$02$i17$i = $1708;
     } else {
      break;
     }
    }
    $1711 = $1708 * 0.5;
    $1712 = (($lPnt$048$i) + 36|0);
    HEAPF32[$1694>>2] = $1711;
    $i$01$i14$i = 0;$sum$02$i13$i = 0.0;
    while(1) {
     $1713 = ((($FltBuf$i) + ($i$01$i14$i<<2)|0) + 960|0);
     $1714 = +HEAPF32[$1713>>2];
     $1715 = $1714 * $1714;
     $1716 = (($i$01$i14$i) + 1)|0;
     $1717 = ((($FltBuf$i) + ($1716<<2)|0) + 960|0);
     $1718 = +HEAPF32[$1717>>2];
     $1719 = $1718 * $1718;
     $1720 = $1715 + $1719;
     $1721 = (($i$01$i14$i) + 2)|0;
     $1722 = ((($FltBuf$i) + ($1721<<2)|0) + 960|0);
     $1723 = +HEAPF32[$1722>>2];
     $1724 = $1723 * $1723;
     $1725 = $1720 + $1724;
     $1726 = $sum$02$i13$i + $1725;
     $1727 = (($i$01$i14$i) + 3)|0;
     $1728 = ($1727|0)<(60);
     if ($1728) {
      $i$01$i14$i = $1727;$sum$02$i13$i = $1726;
     } else {
      break;
     }
    }
    $1729 = $1726 * 0.5;
    HEAPF32[$1712>>2] = $1729;
    $scevgep63$i = (($lPnt$048$i) + 40|0);
    $i$01$i10$i = 0;$sum$02$i9$i = 0.0;
    while(1) {
     $1730 = ((($FltBuf$i) + ($i$01$i10$i<<2)|0) + 240|0);
     $1731 = +HEAPF32[$1730>>2];
     $1732 = (($FltBuf$i) + ($i$01$i10$i<<2)|0);
     $1733 = +HEAPF32[$1732>>2];
     $1734 = $1731 * $1733;
     $1735 = (($i$01$i10$i) + 1)|0;
     $1736 = ((($FltBuf$i) + ($1735<<2)|0) + 240|0);
     $1737 = +HEAPF32[$1736>>2];
     $1738 = (($FltBuf$i) + ($1735<<2)|0);
     $1739 = +HEAPF32[$1738>>2];
     $1740 = $1737 * $1739;
     $1741 = $1734 + $1740;
     $1742 = (($i$01$i10$i) + 2)|0;
     $1743 = ((($FltBuf$i) + ($1742<<2)|0) + 240|0);
     $1744 = +HEAPF32[$1743>>2];
     $1745 = (($FltBuf$i) + ($1742<<2)|0);
     $1746 = +HEAPF32[$1745>>2];
     $1747 = $1744 * $1746;
     $1748 = $1741 + $1747;
     $1749 = $sum$02$i9$i + $1748;
     $1750 = (($i$01$i10$i) + 3)|0;
     $1751 = ($1750|0)<(60);
     if ($1751) {
      $i$01$i10$i = $1750;$sum$02$i9$i = $1749;
     } else {
      break;
     }
    }
    HEAPF32[$scevgep63$i>>2] = $1749;
    $scevgep69$i = (($lPnt$048$i) + 44|0);
    $j$242$1$i = 0;$lPnt$441$1$i = $scevgep69$i;
    while(1) {
     $i$01$i6$i = 0;$sum$02$i5$i = 0.0;
     while(1) {
      $1752 = ((($FltBuf$i) + ($i$01$i6$i<<2)|0) + 480|0);
      $1753 = +HEAPF32[$1752>>2];
      $1754 = ((($FltBuf$i) + (($j$242$1$i*240)|0)|0) + ($i$01$i6$i<<2)|0);
      $1755 = +HEAPF32[$1754>>2];
      $1756 = $1753 * $1755;
      $1757 = (($i$01$i6$i) + 1)|0;
      $1758 = ((($FltBuf$i) + ($1757<<2)|0) + 480|0);
      $1759 = +HEAPF32[$1758>>2];
      $1760 = ((($FltBuf$i) + (($j$242$1$i*240)|0)|0) + ($1757<<2)|0);
      $1761 = +HEAPF32[$1760>>2];
      $1762 = $1759 * $1761;
      $1763 = $1756 + $1762;
      $1764 = (($i$01$i6$i) + 2)|0;
      $1765 = ((($FltBuf$i) + ($1764<<2)|0) + 480|0);
      $1766 = +HEAPF32[$1765>>2];
      $1767 = ((($FltBuf$i) + (($j$242$1$i*240)|0)|0) + ($1764<<2)|0);
      $1768 = +HEAPF32[$1767>>2];
      $1769 = $1766 * $1768;
      $1770 = $1763 + $1769;
      $1771 = $sum$02$i5$i + $1770;
      $1772 = (($i$01$i6$i) + 3)|0;
      $1773 = ($1772|0)<(60);
      if ($1773) {
       $i$01$i6$i = $1772;$sum$02$i5$i = $1771;
      } else {
       break;
      }
     }
     $1774 = (($lPnt$441$1$i) + 4|0);
     HEAPF32[$lPnt$441$1$i>>2] = $1771;
     $1775 = (($j$242$1$i) + 1)|0;
     $exitcond70$1$i = ($1775|0)==(2);
     if ($exitcond70$1$i) {
      break;
     } else {
      $j$242$1$i = $1775;$lPnt$441$1$i = $1774;
     }
    }
    $scevgep69$1$i = (($lPnt$048$i) + 52|0);
    $j$242$2$i = 0;$lPnt$441$2$i = $scevgep69$1$i;
    while(1) {
     $i$01$i2$i83 = 0;$sum$02$i1$i82 = 0.0;
     while(1) {
      $1776 = ((($FltBuf$i) + ($i$01$i2$i83<<2)|0) + 720|0);
      $1777 = +HEAPF32[$1776>>2];
      $1778 = ((($FltBuf$i) + (($j$242$2$i*240)|0)|0) + ($i$01$i2$i83<<2)|0);
      $1779 = +HEAPF32[$1778>>2];
      $1780 = $1777 * $1779;
      $1781 = (($i$01$i2$i83) + 1)|0;
      $1782 = ((($FltBuf$i) + ($1781<<2)|0) + 720|0);
      $1783 = +HEAPF32[$1782>>2];
      $1784 = ((($FltBuf$i) + (($j$242$2$i*240)|0)|0) + ($1781<<2)|0);
      $1785 = +HEAPF32[$1784>>2];
      $1786 = $1783 * $1785;
      $1787 = $1780 + $1786;
      $1788 = (($i$01$i2$i83) + 2)|0;
      $1789 = ((($FltBuf$i) + ($1788<<2)|0) + 720|0);
      $1790 = +HEAPF32[$1789>>2];
      $1791 = ((($FltBuf$i) + (($j$242$2$i*240)|0)|0) + ($1788<<2)|0);
      $1792 = +HEAPF32[$1791>>2];
      $1793 = $1790 * $1792;
      $1794 = $1787 + $1793;
      $1795 = $sum$02$i1$i82 + $1794;
      $1796 = (($i$01$i2$i83) + 3)|0;
      $1797 = ($1796|0)<(60);
      if ($1797) {
       $i$01$i2$i83 = $1796;$sum$02$i1$i82 = $1795;
      } else {
       break;
      }
     }
     $1798 = (($lPnt$441$2$i) + 4|0);
     HEAPF32[$lPnt$441$2$i>>2] = $1795;
     $1799 = (($j$242$2$i) + 1)|0;
     $exitcond70$2$i = ($1799|0)==(3);
     if ($exitcond70$2$i) {
      break;
     } else {
      $j$242$2$i = $1799;$lPnt$441$2$i = $1798;
     }
    }
    $scevgep69$2$i = (($lPnt$048$i) + 64|0);
    $j$242$3$i = 0;$lPnt$441$3$i = $scevgep69$2$i;
    while(1) {
     $i$01$i$i85 = 0;$sum$02$i$i84 = 0.0;
     while(1) {
      $1800 = ((($FltBuf$i) + ($i$01$i$i85<<2)|0) + 960|0);
      $1801 = +HEAPF32[$1800>>2];
      $1802 = ((($FltBuf$i) + (($j$242$3$i*240)|0)|0) + ($i$01$i$i85<<2)|0);
      $1803 = +HEAPF32[$1802>>2];
      $1804 = $1801 * $1803;
      $1805 = (($i$01$i$i85) + 1)|0;
      $1806 = ((($FltBuf$i) + ($1805<<2)|0) + 960|0);
      $1807 = +HEAPF32[$1806>>2];
      $1808 = ((($FltBuf$i) + (($j$242$3$i*240)|0)|0) + ($1805<<2)|0);
      $1809 = +HEAPF32[$1808>>2];
      $1810 = $1807 * $1809;
      $1811 = $1804 + $1810;
      $1812 = (($i$01$i$i85) + 2)|0;
      $1813 = ((($FltBuf$i) + ($1812<<2)|0) + 960|0);
      $1814 = +HEAPF32[$1813>>2];
      $1815 = ((($FltBuf$i) + (($j$242$3$i*240)|0)|0) + ($1812<<2)|0);
      $1816 = +HEAPF32[$1815>>2];
      $1817 = $1814 * $1816;
      $1818 = $1811 + $1817;
      $1819 = $sum$02$i$i84 + $1818;
      $1820 = (($i$01$i$i85) + 3)|0;
      $1821 = ($1820|0)<(60);
      if ($1821) {
       $i$01$i$i85 = $1820;$sum$02$i$i84 = $1819;
      } else {
       break;
      }
     }
     $1822 = (($lPnt$441$3$i) + 4|0);
     HEAPF32[$lPnt$441$3$i>>2] = $1819;
     $1823 = (($j$242$3$i) + 1)|0;
     $exitcond70$3$i = ($1823|0)==(4);
     if ($exitcond70$3$i) {
      break;
     } else {
      $j$242$3$i = $1823;$lPnt$441$3$i = $1822;
     }
    }
    $scevgep69$3$i = (($lPnt$048$i) + 80|0);
    $1824 = (($k$049$i) + 1)|0;
    $exitcond75$i = ($k$049$i|0)==($1288|0);
    if ($exitcond75$i) {
     break;
    } else {
     $k$049$i = $1824;$lPnt$048$i = $scevgep69$3$i;
    }
   }
   $1326 = (($1288) + ($1287))|0;
   $1327 = (($1326) + 2)|0;
   $1328 = (($1327|0) / 30)&-1;
   $1329 = (($Olp$1$i) + -62)|0;
   $1330 = ($1329|0)<(1);
   $$op$i$i = (($1329|0) / 30)&-1;
   $1331 = $1330 ? 0 : $$op$i$i;
   $1332 = ($1328|0)<($1331|0);
   if ($1332) {
    $Err_max$0$lcssa3$i$i = -1.0;
    label = 123;
   } else {
    $Err_max$02$i$i = -1.0;$i$01$i53$i = $1328;
    while(1) {
     $1333 = ((37008 + ($i$01$i53$i<<2)|0) + 2432|0);
     $1334 = +HEAPF32[$1333>>2];
     $1335 = $1334 > $Err_max$02$i$i;
     $Err_max$1$i$i = $1335 ? $1334 : $Err_max$02$i$i;
     $1336 = (($i$01$i53$i) + -1)|0;
     $1337 = ($i$01$i53$i|0)>($1331|0);
     if ($1337) {
      $Err_max$02$i$i = $Err_max$1$i$i;$i$01$i53$i = $1336;
     } else {
      break;
     }
    }
    $1338 = $Err_max$1$i$i > 128.0;
    if ($1338) {
     $iTest$0$i$i = 0;
    } else {
     $Err_max$0$lcssa3$i$i = $Err_max$1$i$i;
     label = 123;
    }
   }
   if ((label|0) == 123) {
    label = 0;
    $1339 = HEAP16[((37008 + 2428|0))>>1]|0;
    $1340 = ($1339<<16>>16)<(0);
    if ($1340) {
     $iTest$0$i$i = 0;
    } else {
     $1341 = 128.0 - $Err_max$0$lcssa3$i$i;
     $1342 = (~~(($1341)));
     $1343 = $1342 << 16 >> 16;
     $iTest$0$i$i = $1343;
    }
   }
   $1344 = $iTest$0$i$i << 2;
   $1345 = (($1344) + 51)|0;
   $1346 = ($1345|0)>(85);
   $$2$i74 = $1346 ? 85 : $1345;
   HEAP32[$Bound$i>>2] = $$2$i74;
   $1347 = $iTest$0$i$i << 3;
   $1348 = (($1347) + 93)|0;
   $1349 = ($1348|0)>(170);
   $storemerge$i75 = $1349 ? 170 : $1348;
   HEAP32[$913>>2] = $storemerge$i75;
   $1350 = ($Olp$1$i|0)>(57);
   $$4$i = $1350&1;
   $1351 = HEAP32[36992>>2]|0;
   $$not$i = ($1351|0)!=(0);
   $$not76$i = $1283 ^ 1;
   $brmerge$i = $$not$i | $$not76$i;
   $$mux$i = $$not$i ? 1 : $$4$i;
   $Gid$022$i = 0;$Lid$021$i = 1;$Max$020$i = 0.0;$k$123$i = 0;
   while(1) {
    if ($brmerge$i) {
     $l$0$i = $$mux$i;
    } else {
     $1352 = (($k$123$i) + ($1287))|0;
     $1353 = ($1352|0)>(57);
     $$3$i = $1353&1;
     $l$0$i = $$3$i;
    }
    $1354 = (($Bound$i) + ($l$0$i<<2)|0);
    $1355 = HEAP32[$1354>>2]|0;
    $1356 = ($1355|0)>(0);
    if ($1356) {
     $1357 = (34512 + ($l$0$i<<2)|0);
     $1358 = HEAP32[$1357>>2]|0;
     $1359 = ($k$123$i*20)|0;
     $1360 = (($CorVct$i) + ($1359<<2)|0);
     $1361 = (($1359) + 10)|0;
     $1362 = (($CorVct$i) + ($1361<<2)|0);
     $1363 = +HEAPF32[$1360>>2];
     $$sum160161 = $1359 | 1;
     $1364 = (($CorVct$i) + ($$sum160161<<2)|0);
     $1365 = +HEAPF32[$1364>>2];
     $$sum162163 = $1359 | 2;
     $1366 = (($CorVct$i) + ($$sum162163<<2)|0);
     $1367 = +HEAPF32[$1366>>2];
     $$sum164165 = $1359 | 3;
     $1368 = (($CorVct$i) + ($$sum164165<<2)|0);
     $1369 = +HEAPF32[$1368>>2];
     $$sum166 = (($1359) + 4)|0;
     $1370 = (($CorVct$i) + ($$sum166<<2)|0);
     $1371 = +HEAPF32[$1370>>2];
     $$sum167 = (($1359) + 5)|0;
     $1372 = (($CorVct$i) + ($$sum167<<2)|0);
     $1373 = +HEAPF32[$1372>>2];
     $$sum168 = (($1359) + 6)|0;
     $1374 = (($CorVct$i) + ($$sum168<<2)|0);
     $1375 = +HEAPF32[$1374>>2];
     $$sum169 = (($1359) + 7)|0;
     $1376 = (($CorVct$i) + ($$sum169<<2)|0);
     $1377 = +HEAPF32[$1376>>2];
     $$sum170 = (($1359) + 8)|0;
     $1378 = (($CorVct$i) + ($$sum170<<2)|0);
     $1379 = +HEAPF32[$1378>>2];
     $$sum171 = (($1359) + 9)|0;
     $1380 = (($CorVct$i) + ($$sum171<<2)|0);
     $1381 = +HEAPF32[$1380>>2];
     $1382 = +HEAPF32[$1362>>2];
     $$sum172 = (($1359) + 11)|0;
     $1383 = (($CorVct$i) + ($$sum172<<2)|0);
     $1384 = +HEAPF32[$1383>>2];
     $$sum173 = (($1359) + 12)|0;
     $1385 = (($CorVct$i) + ($$sum173<<2)|0);
     $1386 = +HEAPF32[$1385>>2];
     $$sum174 = (($1359) + 13)|0;
     $1387 = (($CorVct$i) + ($$sum174<<2)|0);
     $1388 = +HEAPF32[$1387>>2];
     $$sum175 = (($1359) + 14)|0;
     $1389 = (($CorVct$i) + ($$sum175<<2)|0);
     $1390 = +HEAPF32[$1389>>2];
     $$sum176 = (($1359) + 15)|0;
     $1391 = (($CorVct$i) + ($$sum176<<2)|0);
     $1392 = +HEAPF32[$1391>>2];
     $$sum177 = (($1359) + 16)|0;
     $1393 = (($CorVct$i) + ($$sum177<<2)|0);
     $1394 = +HEAPF32[$1393>>2];
     $$sum178 = (($1359) + 17)|0;
     $1395 = (($CorVct$i) + ($$sum178<<2)|0);
     $1396 = +HEAPF32[$1395>>2];
     $$sum179 = (($1359) + 18)|0;
     $1397 = (($CorVct$i) + ($$sum179<<2)|0);
     $1398 = +HEAPF32[$1397>>2];
     $$sum180 = (($1359) + 19)|0;
     $1399 = (($CorVct$i) + ($$sum180<<2)|0);
     $1400 = +HEAPF32[$1399>>2];
     $Gid$112$i = $Gid$022$i;$Lid$111$i = $Lid$021$i;$Max$19$i = $Max$020$i;$i$513$i = 0;$sPnt$010$i = $1358;
     while(1) {
      $1401 = +HEAPF32[$sPnt$010$i>>2];
      $1402 = $1363 * $1401;
      $1403 = (($sPnt$010$i) + 4|0);
      $1404 = +HEAPF32[$1403>>2];
      $1405 = $1365 * $1404;
      $1406 = $1402 + $1405;
      $1407 = (($sPnt$010$i) + 8|0);
      $1408 = +HEAPF32[$1407>>2];
      $1409 = $1367 * $1408;
      $1410 = $1406 + $1409;
      $1411 = (($sPnt$010$i) + 12|0);
      $1412 = +HEAPF32[$1411>>2];
      $1413 = $1369 * $1412;
      $1414 = $1410 + $1413;
      $1415 = (($sPnt$010$i) + 16|0);
      $1416 = +HEAPF32[$1415>>2];
      $1417 = $1371 * $1416;
      $1418 = $1414 + $1417;
      $1419 = (($sPnt$010$i) + 20|0);
      $1420 = +HEAPF32[$1419>>2];
      $1421 = $1373 * $1420;
      $1422 = $1418 + $1421;
      $1423 = (($sPnt$010$i) + 24|0);
      $1424 = +HEAPF32[$1423>>2];
      $1425 = $1375 * $1424;
      $1426 = $1422 + $1425;
      $1427 = (($sPnt$010$i) + 28|0);
      $1428 = +HEAPF32[$1427>>2];
      $1429 = $1377 * $1428;
      $1430 = $1426 + $1429;
      $1431 = (($sPnt$010$i) + 32|0);
      $1432 = +HEAPF32[$1431>>2];
      $1433 = $1379 * $1432;
      $1434 = $1430 + $1433;
      $1435 = (($sPnt$010$i) + 36|0);
      $1436 = +HEAPF32[$1435>>2];
      $1437 = $1381 * $1436;
      $1438 = $1434 + $1437;
      $1439 = (($sPnt$010$i) + 40|0);
      $1440 = +HEAPF32[$1439>>2];
      $1441 = $1382 * $1440;
      $1442 = (($sPnt$010$i) + 44|0);
      $1443 = +HEAPF32[$1442>>2];
      $1444 = $1384 * $1443;
      $1445 = $1441 + $1444;
      $1446 = (($sPnt$010$i) + 48|0);
      $1447 = +HEAPF32[$1446>>2];
      $1448 = $1386 * $1447;
      $1449 = $1445 + $1448;
      $1450 = (($sPnt$010$i) + 52|0);
      $1451 = +HEAPF32[$1450>>2];
      $1452 = $1388 * $1451;
      $1453 = $1449 + $1452;
      $1454 = (($sPnt$010$i) + 56|0);
      $1455 = +HEAPF32[$1454>>2];
      $1456 = $1390 * $1455;
      $1457 = $1453 + $1456;
      $1458 = (($sPnt$010$i) + 60|0);
      $1459 = +HEAPF32[$1458>>2];
      $1460 = $1392 * $1459;
      $1461 = $1457 + $1460;
      $1462 = (($sPnt$010$i) + 64|0);
      $1463 = +HEAPF32[$1462>>2];
      $1464 = $1394 * $1463;
      $1465 = $1461 + $1464;
      $1466 = (($sPnt$010$i) + 68|0);
      $1467 = +HEAPF32[$1466>>2];
      $1468 = $1396 * $1467;
      $1469 = $1465 + $1468;
      $1470 = (($sPnt$010$i) + 72|0);
      $1471 = +HEAPF32[$1470>>2];
      $1472 = $1398 * $1471;
      $1473 = $1469 + $1472;
      $1474 = (($sPnt$010$i) + 76|0);
      $1475 = +HEAPF32[$1474>>2];
      $1476 = $1400 * $1475;
      $1477 = $1473 + $1476;
      $1478 = $1438 + $1477;
      $1479 = (($sPnt$010$i) + 80|0);
      $1480 = $1478 > $Max$19$i;
      $Max$2$i = $1480 ? $1478 : $Max$19$i;
      $Lid$2$i = $1480 ? $k$123$i : $Lid$111$i;
      $Gid$2$i = $1480 ? $i$513$i : $Gid$112$i;
      $1481 = (($i$513$i) + 1)|0;
      $1482 = ($1481|0)<($1355|0);
      if ($1482) {
       $Gid$112$i = $Gid$2$i;$Lid$111$i = $Lid$2$i;$Max$19$i = $Max$2$i;$i$513$i = $1481;$sPnt$010$i = $1479;
      } else {
       $Gid$1$lcssa$i = $Gid$2$i;$Lid$1$lcssa$i = $Lid$2$i;$Max$1$lcssa$i = $Max$2$i;
       break;
      }
     }
    } else {
     $Gid$1$lcssa$i = $Gid$022$i;$Lid$1$lcssa$i = $Lid$021$i;$Max$1$lcssa$i = $Max$020$i;
    }
    $1483 = (($k$123$i) + 1)|0;
    $exitcond51$i = ($k$123$i|0)==($1288|0);
    if ($exitcond51$i) {
     break;
    } else {
     $Gid$022$i = $Gid$1$lcssa$i;$Lid$021$i = $Lid$1$lcssa$i;$Max$020$i = $Max$1$lcssa$i;$k$123$i = $1483;
    }
   }
   $1484 = (($Lid$1$lcssa$i) + ($1287))|0;
   $$Olp$1$i = $1283 ? $1484 : $Olp$1$i;
   $$Lid$0$i = $1283 ? 1 : $Lid$1$lcssa$i;
   $1485 = ((($Line) + (($i$124*28)|0)|0) + 16|0);
   HEAP32[$1485>>2] = $$Lid$0$i;
   $1486 = ((($Line) + (($i$124*28)|0)|0) + 20|0);
   HEAP32[$1486>>2] = $Gid$1$lcssa$i;
   HEAP32[$1280>>2] = $$Olp$1$i;
   _Decod_Acbk($h$i$i$i,((37008 + 1208|0)),36992,$$Olp$1$i,$$Lid$0$i,$Gid$1$lcssa$i);
   $i$67$i = 0;$indvars$iv$i = 1;
   while(1) {
    $1487 = (($Dpnt$13) + ($i$67$i<<2)|0);
    $1488 = +HEAPF32[$1487>>2];
    $Acc0$15$i = $1488;$j$36$i = 0;
    while(1) {
     $1489 = (($h$i$i$i) + ($j$36$i<<2)|0);
     $1490 = +HEAPF32[$1489>>2];
     $1491 = (($i$67$i) - ($j$36$i))|0;
     $1492 = (($ImpResp) + ($1491<<2)|0);
     $1493 = +HEAPF32[$1492>>2];
     $1494 = $1490 * $1493;
     $1495 = $Acc0$15$i - $1494;
     $1496 = (($j$36$i) + 1)|0;
     $exitcond$i77 = ($1496|0)==($indvars$iv$i|0);
     if ($exitcond$i77) {
      break;
     } else {
      $Acc0$15$i = $1495;$j$36$i = $1496;
     }
    }
    HEAPF32[$1487>>2] = $1495;
    $1497 = (($i$67$i) + 1)|0;
    $indvars$iv$next$i = (($indvars$iv$i) + 1)|0;
    $exitcond50$i = ($1497|0)==(60);
    if ($exitcond50$i) {
     break;
    } else {
     $i$67$i = $1497;$indvars$iv$i = $indvars$iv$next$i;
    }
   }
   $1825 = HEAP32[36992>>2]|0;
   if ((($1825|0) == 0)) {
    $1826 = (13264 + ($i$124<<2)|0);
    $1827 = HEAP32[$1826>>2]|0;
    HEAPF32[$Best$i>>2] = -1.0E+8;
    _Find_Best($Best$i,$Dpnt$13,$ImpResp,$1827,60);
    $1828 = HEAP32[$1280>>2]|0;
    $1829 = ($1828|0)<(58);
    if ($1829) {
     _Find_Best($Best$i,$Dpnt$13,$ImpResp,$1827,$1828);
    }
    _memset(($Dpnt$13|0),0,240)|0;
    $i$11$i = 0;
    while(1) {
     $1830 = ((($Best$i) + ($i$11$i<<2)|0) + 40|0);
     $1831 = +HEAPF32[$1830>>2];
     $1832 = ((($Best$i) + ($i$11$i<<2)|0) + 16|0);
     $1833 = HEAP32[$1832>>2]|0;
     $1834 = (($Dpnt$13) + ($1833<<2)|0);
     HEAPF32[$1834>>2] = $1831;
     $1835 = (($i$11$i) + 1)|0;
     $exitcond$i20 = ($1835|0)==($1827|0);
     if ($exitcond$i20) {
      break;
     } else {
      $i$11$i = $1835;
     }
    }
    $1836 = (6 - ($1827))|0;
    $1837 = ((($Line) + (($i$124*28)|0)|0) + 36|0);
    HEAP32[$1837>>2] = 0;
    $1838 = ((($Line) + (($i$124*28)|0)|0) + 40|0);
    HEAP32[$1838>>2] = 0;
    $1839 = HEAP32[$914>>2]|0;
    $1848 = 0;$1850 = 0;$i$01$i$i21 = 0;$j$02$i$i = $1836;
    while(1) {
     $1840 = $i$01$i$i21 << 1;
     $1841 = (($1839) + ($1840))|0;
     $1842 = (($Dpnt$13) + ($1841<<2)|0);
     $1843 = +HEAPF32[$1842>>2];
     $1844 = $1843 == 0.0;
     if ($1844) {
      $1845 = ((13392 + (($j$02$i$i*120)|0)|0) + ($i$01$i$i21<<2)|0);
      $1846 = HEAP32[$1845>>2]|0;
      $1847 = (($1846) + ($1848))|0;
      HEAP32[$1838>>2] = $1847;
      $3052 = $1850;$3053 = $1847;$j$1$i$i = $j$02$i$i;
     } else {
      $1849 = $1850 << 1;
      $1851 = $1843 < 0.0;
      $1852 = $1849 | 1;
      $storemerge270 = $1851 ? $1852 : $1849;
      HEAP32[$1837>>2] = $storemerge270;
      $1853 = (($j$02$i$i) + 1)|0;
      $1854 = ($1853|0)==(6);
      if ($1854) {
       break;
      } else {
       $3052 = $storemerge270;$3053 = $1848;$j$1$i$i = $1853;
      }
     }
     $1855 = (($i$01$i$i21) + 1)|0;
     $1856 = ($1855|0)<(30);
     if ($1856) {
      $1848 = $3053;$1850 = $3052;$i$01$i$i21 = $1855;$j$02$i$i = $j$1$i$i;
     } else {
      break;
     }
    }
    $1857 = HEAP32[$915>>2]|0;
    $1858 = ((($Line) + (($i$124*28)|0)|0) + 24|0);
    HEAP32[$1858>>2] = $1857;
    $1859 = ((($Line) + (($i$124*28)|0)|0) + 28|0);
    HEAP32[$1859>>2] = $1839;
    $1860 = HEAP32[$916>>2]|0;
    $1861 = ((($Line) + (($i$124*28)|0)|0) + 32|0);
    HEAP32[$1861>>2] = $1860;
    $1862 = ($1860|0)==(1);
    if ($1862) {
     $1863 = HEAP32[$1280>>2]|0;
     $i$05$i1$i = 0;
     while(1) {
      $1865 = (($Dpnt$13) + ($i$05$i1$i<<2)|0);
      $1866 = +HEAPF32[$1865>>2];
      $1867 = (($temp$i) + ($i$05$i1$i<<2)|0);
      HEAPF32[$1867>>2] = $1866;
      $1868 = (($i$05$i1$i) + 1)|0;
      $exitcond6$i$i = ($1868|0)==(60);
      if ($exitcond6$i$i) {
       break;
      } else {
       $i$05$i1$i = $1868;
      }
     }
     $1864 = ($1863|0)<(60);
     if ($1864) {
      $Tmp0$03$i$i = $1863;
      while(1) {
       $i$11$i$i = $Tmp0$03$i$i;
       while(1) {
        $1869 = (($i$11$i$i) - ($Tmp0$03$i$i))|0;
        $1870 = (($temp$i) + ($1869<<2)|0);
        $1871 = +HEAPF32[$1870>>2];
        $1872 = (($Dpnt$13) + ($i$11$i$i<<2)|0);
        $1873 = +HEAPF32[$1872>>2];
        $1874 = $1871 + $1873;
        HEAPF32[$1872>>2] = $1874;
        $1875 = (($i$11$i$i) + 1)|0;
        $exitcond$i3$i22 = ($1875|0)==(60);
        if ($exitcond$i3$i22) {
         break;
        } else {
         $i$11$i$i = $1875;
        }
       }
       $1876 = (($Tmp0$03$i$i) + ($1863))|0;
       $1877 = ($1876|0)<(60);
       if ($1877) {
        $Tmp0$03$i$i = $1876;
       } else {
        break;
       }
      }
     }
    }
   } else if ((($1825|0) == 1)) {
    $1878 = HEAP32[$1280>>2]|0;
    $1879 = (($1878) + 65535)|0;
    $1880 = HEAP32[$1485>>2]|0;
    $1881 = (($1879) + ($1880))|0;
    $sext$i = $1881 << 16;
    $1882 = $sext$i >> 16;
    $1883 = HEAP32[$1486>>2]|0;
    $1884 = (34528 + ($1883<<2)|0);
    $1885 = HEAP32[$1884>>2]|0;
    $1886 = (($1885) + ($1882))|0;
    $1887 = (35208 + ($1883<<2)|0);
    $1888 = +HEAPF32[$1887>>2];
    $1889 = ((($Line) + (($i$124*28)|0)|0) + 24|0);
    $1890 = ((($Line) + (($i$124*28)|0)|0) + 28|0);
    $1891 = ((($Line) + (($i$124*28)|0)|0) + 36|0);
    $1892 = ($1886|0)<(58);
    if ($1892) {
     $i$05$i$i = $1886;
     while(1) {
      $1893 = (($i$05$i$i) - ($1886))|0;
      $1894 = (($ImpResp) + ($1893<<2)|0);
      $1895 = +HEAPF32[$1894>>2];
      $1896 = $1895 * $1888;
      $1897 = (($ImpResp) + ($i$05$i$i<<2)|0);
      $1898 = +HEAPF32[$1897>>2];
      $1899 = $1898 + $1896;
      HEAPF32[$1897>>2] = $1899;
      $1900 = (($i$05$i$i) + 1)|0;
      $exitcond8$i$i = ($1900|0)==(60);
      if ($exitcond8$i$i) {
       break;
      } else {
       $i$05$i$i = $1900;
      }
     }
    }
    _memcpy(($scevgep$i$i$i|0),($ImpResp|0),240)|0;
    ;HEAP32[$h$i$i$i+0>>2]=0|0;HEAP32[$h$i$i$i+4>>2]=0|0;HEAP32[$h$i$i$i+8>>2]=0|0;HEAP32[$h$i$i$i+12>>2]=0|0;
    $1902 = 0.0;$cor$021$i$i$i = 0.0;$i$222$i$i$i = 7;$m$023$i$i$i = 0;
    while(1) {
     $1901 = $1902 * $1902;
     $1903 = $m$023$i$i$i | 1;
     $1904 = (($h$i$i$i) + ($1903<<2)|0);
     $1905 = +HEAPF32[$1904>>2];
     $1906 = $1905 * $1905;
     $1907 = $1901 + $1906;
     $1908 = $cor$021$i$i$i + $1907;
     $$sum$i$i$i = (($i$222$i$i$i) + 24)|0;
     $1909 = (($rr$i$i) + ($$sum$i$i$i<<2)|0);
     HEAPF32[$1909>>2] = $1908;
     $1910 = $m$023$i$i$i | 2;
     $1911 = (($h$i$i$i) + ($1910<<2)|0);
     $1912 = +HEAPF32[$1911>>2];
     $1913 = $1912 * $1912;
     $1914 = $m$023$i$i$i | 3;
     $1915 = (($h$i$i$i) + ($1914<<2)|0);
     $1916 = +HEAPF32[$1915>>2];
     $1917 = $1916 * $1916;
     $1918 = $1913 + $1917;
     $1919 = $1908 + $1918;
     $$sum1$i$i$i = (($i$222$i$i$i) + 16)|0;
     $1920 = (($rr$i$i) + ($$sum1$i$i$i<<2)|0);
     HEAPF32[$1920>>2] = $1919;
     $1921 = $m$023$i$i$i | 4;
     $1922 = (($h$i$i$i) + ($1921<<2)|0);
     $1923 = +HEAPF32[$1922>>2];
     $1924 = $1923 * $1923;
     $1925 = $m$023$i$i$i | 5;
     $1926 = (($h$i$i$i) + ($1925<<2)|0);
     $1927 = +HEAPF32[$1926>>2];
     $1928 = $1927 * $1927;
     $1929 = $1924 + $1928;
     $1930 = $1919 + $1929;
     $$sum2$i$i$i = (($i$222$i$i$i) + 8)|0;
     $1931 = (($rr$i$i) + ($$sum2$i$i$i<<2)|0);
     HEAPF32[$1931>>2] = $1930;
     $1932 = $m$023$i$i$i | 6;
     $1933 = (($h$i$i$i) + ($1932<<2)|0);
     $1934 = +HEAPF32[$1933>>2];
     $1935 = $1934 * $1934;
     $1936 = $m$023$i$i$i | 7;
     $1937 = (($h$i$i$i) + ($1936<<2)|0);
     $1938 = +HEAPF32[$1937>>2];
     $1939 = $1938 * $1938;
     $1940 = $1935 + $1939;
     $1941 = $1930 + $1940;
     $1942 = (($rr$i$i) + ($i$222$i$i$i<<2)|0);
     HEAPF32[$1942>>2] = $1941;
     $1943 = (($m$023$i$i$i) + 8)|0;
     $1944 = ($i$222$i$i$i|0)>(0);
     if (!($1944)) {
      $h2$018$i$i$i = $910;$k$019$i$i$i = 0;$p0$020$i$i$i = $920;$p1$015$i$i$i = $919;$p2$016$i$i$i = $918;$p3$017$i$i$i = $917;
      break;
     }
     $1945 = (($i$222$i$i$i) + -1)|0;
     $$phi$trans$insert = (($h$i$i$i) + ($1943<<2)|0);
     $$pre236 = +HEAPF32[$$phi$trans$insert>>2];
     $1902 = $$pre236;$cor$021$i$i$i = $1941;$i$222$i$i$i = $1945;$m$023$i$i$i = $1943;
    }
    while(1) {
     $1946 = (($k$019$i$i$i) + 1)|0;
     $cor$1$i$i$i = 0.0;$i$3$i$i$i = $1946;$m$1$i$i$i = 0;$t$0$i$i$i = 0;
     while(1) {
      $1947 = (($h$i$i$i) + ($m$1$i$i$i<<2)|0);
      $1948 = +HEAPF32[$1947>>2];
      $1949 = (($h2$018$i$i$i) + ($m$1$i$i$i<<2)|0);
      $1950 = +HEAPF32[$1949>>2];
      $1951 = $1948 * $1950;
      $1952 = $m$1$i$i$i | 1;
      $1953 = (($h$i$i$i) + ($1952<<2)|0);
      $1954 = +HEAPF32[$1953>>2];
      $1955 = (($h2$018$i$i$i) + ($1952<<2)|0);
      $1956 = +HEAPF32[$1955>>2];
      $1957 = $1954 * $1956;
      $1958 = $1951 + $1957;
      $1959 = $cor$1$i$i$i + $1958;
      $1960 = (($p3$017$i$i$i) + ($t$0$i$i$i<<2)|0);
      HEAPF32[$1960>>2] = $1959;
      $1961 = $m$1$i$i$i | 2;
      $1962 = (($h$i$i$i) + ($1961<<2)|0);
      $1963 = +HEAPF32[$1962>>2];
      $1964 = (($h2$018$i$i$i) + ($1961<<2)|0);
      $1965 = +HEAPF32[$1964>>2];
      $1966 = $1963 * $1965;
      $1967 = $m$1$i$i$i | 3;
      $1968 = (($h$i$i$i) + ($1967<<2)|0);
      $1969 = +HEAPF32[$1968>>2];
      $1970 = (($h2$018$i$i$i) + ($1967<<2)|0);
      $1971 = +HEAPF32[$1970>>2];
      $1972 = $1969 * $1971;
      $1973 = $1966 + $1972;
      $1974 = $1959 + $1973;
      $1975 = (($p2$016$i$i$i) + ($t$0$i$i$i<<2)|0);
      HEAPF32[$1975>>2] = $1974;
      $1976 = $m$1$i$i$i | 4;
      $1977 = (($h$i$i$i) + ($1976<<2)|0);
      $1978 = +HEAPF32[$1977>>2];
      $1979 = (($h2$018$i$i$i) + ($1976<<2)|0);
      $1980 = +HEAPF32[$1979>>2];
      $1981 = $1978 * $1980;
      $1982 = $m$1$i$i$i | 5;
      $1983 = (($h$i$i$i) + ($1982<<2)|0);
      $1984 = +HEAPF32[$1983>>2];
      $1985 = (($h2$018$i$i$i) + ($1982<<2)|0);
      $1986 = +HEAPF32[$1985>>2];
      $1987 = $1984 * $1986;
      $1988 = $1981 + $1987;
      $1989 = $1974 + $1988;
      $1990 = (($p1$015$i$i$i) + ($t$0$i$i$i<<2)|0);
      HEAPF32[$1990>>2] = $1989;
      $exitcond30$i$i$i = ($i$3$i$i$i|0)==(8);
      if ($exitcond30$i$i$i) {
       break;
      }
      $1991 = $m$1$i$i$i | 6;
      $1992 = (($h$i$i$i) + ($1991<<2)|0);
      $1993 = +HEAPF32[$1992>>2];
      $1994 = (($h2$018$i$i$i) + ($1991<<2)|0);
      $1995 = +HEAPF32[$1994>>2];
      $1996 = $1993 * $1995;
      $1997 = $m$1$i$i$i | 7;
      $1998 = (($h$i$i$i) + ($1997<<2)|0);
      $1999 = +HEAPF32[$1998>>2];
      $2000 = (($h2$018$i$i$i) + ($1997<<2)|0);
      $2001 = +HEAPF32[$2000>>2];
      $2002 = $1999 * $2001;
      $2003 = $1996 + $2002;
      $2004 = $1989 + $2003;
      $2005 = (($p0$020$i$i$i) + ($t$0$i$i$i<<2)|0);
      HEAPF32[$2005>>2] = $2004;
      $2006 = (($t$0$i$i$i) + -9)|0;
      $2007 = (($m$1$i$i$i) + 8)|0;
      $2008 = (($i$3$i$i$i) + 1)|0;
      $cor$1$i$i$i = $2004;$i$3$i$i$i = $2008;$m$1$i$i$i = $2007;$t$0$i$i$i = $2006;
     }
     $2009 = (($h2$018$i$i$i) + 32|0);
     $2010 = (($p3$017$i$i$i) + -32|0);
     $2011 = (($p2$016$i$i$i) + -32|0);
     $2012 = (($p1$015$i$i$i) + -32|0);
     $2013 = (($p0$020$i$i$i) + -4|0);
     $exitcond31$i$i$i = ($1946|0)==(8);
     if ($exitcond31$i$i$i) {
      $h2$112$i$i$i = $scevgep$i$i$i;$k$113$i$i$i = 0;$p0$114$i$i$i = $924;$p1$19$i$i$i = $923;$p2$110$i$i$i = $922;$p3$111$i$i$i = $921;
      break;
     } else {
      $h2$018$i$i$i = $2009;$k$019$i$i$i = $1946;$p0$020$i$i$i = $2013;$p1$015$i$i$i = $2012;$p2$016$i$i$i = $2011;$p3$017$i$i$i = $2010;
     }
    }
    while(1) {
     $2014 = (($k$113$i$i$i) + 1)|0;
     $cor$2$i$i$i = 0.0;$i$4$i$i$i = $2014;$m$2$i$i$i = 0;$t$1$i$i$i = 0;
     while(1) {
      $2015 = (($h$i$i$i) + ($m$2$i$i$i<<2)|0);
      $2016 = +HEAPF32[$2015>>2];
      $2017 = (($h2$112$i$i$i) + ($m$2$i$i$i<<2)|0);
      $2018 = +HEAPF32[$2017>>2];
      $2019 = $2016 * $2018;
      $2020 = $m$2$i$i$i | 1;
      $2021 = (($h$i$i$i) + ($2020<<2)|0);
      $2022 = +HEAPF32[$2021>>2];
      $2023 = (($h2$112$i$i$i) + ($2020<<2)|0);
      $2024 = +HEAPF32[$2023>>2];
      $2025 = $2022 * $2024;
      $2026 = $2019 + $2025;
      $2027 = $cor$2$i$i$i + $2026;
      $2028 = (($p3$111$i$i$i) + ($t$1$i$i$i<<2)|0);
      HEAPF32[$2028>>2] = $2027;
      $2029 = $m$2$i$i$i | 2;
      $2030 = (($h$i$i$i) + ($2029<<2)|0);
      $2031 = +HEAPF32[$2030>>2];
      $2032 = (($h2$112$i$i$i) + ($2029<<2)|0);
      $2033 = +HEAPF32[$2032>>2];
      $2034 = $2031 * $2033;
      $2035 = $m$2$i$i$i | 3;
      $2036 = (($h$i$i$i) + ($2035<<2)|0);
      $2037 = +HEAPF32[$2036>>2];
      $2038 = (($h2$112$i$i$i) + ($2035<<2)|0);
      $2039 = +HEAPF32[$2038>>2];
      $2040 = $2037 * $2039;
      $2041 = $2034 + $2040;
      $2042 = $2027 + $2041;
      $2043 = (($p2$110$i$i$i) + ($t$1$i$i$i<<2)|0);
      HEAPF32[$2043>>2] = $2042;
      $exitcond28$i$i$i = ($i$4$i$i$i|0)==(8);
      if ($exitcond28$i$i$i) {
       break;
      }
      $2044 = $m$2$i$i$i | 4;
      $2045 = (($h$i$i$i) + ($2044<<2)|0);
      $2046 = +HEAPF32[$2045>>2];
      $2047 = (($h2$112$i$i$i) + ($2044<<2)|0);
      $2048 = +HEAPF32[$2047>>2];
      $2049 = $2046 * $2048;
      $2050 = $m$2$i$i$i | 5;
      $2051 = (($h$i$i$i) + ($2050<<2)|0);
      $2052 = +HEAPF32[$2051>>2];
      $2053 = (($h2$112$i$i$i) + ($2050<<2)|0);
      $2054 = +HEAPF32[$2053>>2];
      $2055 = $2052 * $2054;
      $2056 = $2049 + $2055;
      $2057 = $2042 + $2056;
      $2058 = (($p1$19$i$i$i) + ($t$1$i$i$i<<2)|0);
      HEAPF32[$2058>>2] = $2057;
      $2059 = $m$2$i$i$i | 6;
      $2060 = (($h$i$i$i) + ($2059<<2)|0);
      $2061 = +HEAPF32[$2060>>2];
      $2062 = (($h2$112$i$i$i) + ($2059<<2)|0);
      $2063 = +HEAPF32[$2062>>2];
      $2064 = $2061 * $2063;
      $2065 = $m$2$i$i$i | 7;
      $2066 = (($h$i$i$i) + ($2065<<2)|0);
      $2067 = +HEAPF32[$2066>>2];
      $2068 = (($h2$112$i$i$i) + ($2065<<2)|0);
      $2069 = +HEAPF32[$2068>>2];
      $2070 = $2067 * $2069;
      $2071 = $2064 + $2070;
      $2072 = $2057 + $2071;
      $2073 = (($p0$114$i$i$i) + ($t$1$i$i$i<<2)|0);
      HEAPF32[$2073>>2] = $2072;
      $2074 = (($t$1$i$i$i) + -9)|0;
      $2075 = (($m$2$i$i$i) + 8)|0;
      $2076 = (($i$4$i$i$i) + 1)|0;
      $cor$2$i$i$i = $2072;$i$4$i$i$i = $2076;$m$2$i$i$i = $2075;$t$1$i$i$i = $2074;
     }
     $2077 = (($h2$112$i$i$i) + 32|0);
     $2078 = (($p3$111$i$i$i) + -32|0);
     $2079 = (($p2$110$i$i$i) + -32|0);
     $2080 = (($p1$19$i$i$i) + -4|0);
     $2081 = (($p0$114$i$i$i) + -4|0);
     $exitcond29$i$i$i = ($2014|0)==(8);
     if ($exitcond29$i$i$i) {
      $h2$26$i$i$i = $925;$k$27$i$i$i = 0;$p0$28$i$i$i = $929;$p1$23$i$i$i = $928;$p2$24$i$i$i = $927;$p3$25$i$i$i = $926;
      break;
     } else {
      $h2$112$i$i$i = $2077;$k$113$i$i$i = $2014;$p0$114$i$i$i = $2081;$p1$19$i$i$i = $2080;$p2$110$i$i$i = $2079;$p3$111$i$i$i = $2078;
     }
    }
    while(1) {
     $2082 = (($k$27$i$i$i) + 1)|0;
     $cor$3$i$i$i = 0.0;$i$5$i$i$i = $2082;$m$3$i$i$i = 0;$t$2$i$i$i = 0;
     while(1) {
      $2083 = (($h$i$i$i) + ($m$3$i$i$i<<2)|0);
      $2084 = +HEAPF32[$2083>>2];
      $2085 = (($h2$26$i$i$i) + ($m$3$i$i$i<<2)|0);
      $2086 = +HEAPF32[$2085>>2];
      $2087 = $2084 * $2086;
      $2088 = $m$3$i$i$i | 1;
      $2089 = (($h$i$i$i) + ($2088<<2)|0);
      $2090 = +HEAPF32[$2089>>2];
      $2091 = (($h2$26$i$i$i) + ($2088<<2)|0);
      $2092 = +HEAPF32[$2091>>2];
      $2093 = $2090 * $2092;
      $2094 = $2087 + $2093;
      $2095 = $cor$3$i$i$i + $2094;
      $2096 = (($p3$25$i$i$i) + ($t$2$i$i$i<<2)|0);
      HEAPF32[$2096>>2] = $2095;
      $exitcond$i$i$i = ($i$5$i$i$i|0)==(8);
      if ($exitcond$i$i$i) {
       break;
      }
      $2097 = $m$3$i$i$i | 2;
      $2098 = (($h$i$i$i) + ($2097<<2)|0);
      $2099 = +HEAPF32[$2098>>2];
      $2100 = (($h2$26$i$i$i) + ($2097<<2)|0);
      $2101 = +HEAPF32[$2100>>2];
      $2102 = $2099 * $2101;
      $2103 = $m$3$i$i$i | 3;
      $2104 = (($h$i$i$i) + ($2103<<2)|0);
      $2105 = +HEAPF32[$2104>>2];
      $2106 = (($h2$26$i$i$i) + ($2103<<2)|0);
      $2107 = +HEAPF32[$2106>>2];
      $2108 = $2105 * $2107;
      $2109 = $2102 + $2108;
      $2110 = $2095 + $2109;
      $2111 = (($p2$24$i$i$i) + ($t$2$i$i$i<<2)|0);
      HEAPF32[$2111>>2] = $2110;
      $2112 = $m$3$i$i$i | 4;
      $2113 = (($h$i$i$i) + ($2112<<2)|0);
      $2114 = +HEAPF32[$2113>>2];
      $2115 = (($h2$26$i$i$i) + ($2112<<2)|0);
      $2116 = +HEAPF32[$2115>>2];
      $2117 = $2114 * $2116;
      $2118 = $m$3$i$i$i | 5;
      $2119 = (($h$i$i$i) + ($2118<<2)|0);
      $2120 = +HEAPF32[$2119>>2];
      $2121 = (($h2$26$i$i$i) + ($2118<<2)|0);
      $2122 = +HEAPF32[$2121>>2];
      $2123 = $2120 * $2122;
      $2124 = $2117 + $2123;
      $2125 = $2110 + $2124;
      $2126 = (($p1$23$i$i$i) + ($t$2$i$i$i<<2)|0);
      HEAPF32[$2126>>2] = $2125;
      $2127 = $m$3$i$i$i | 6;
      $2128 = (($h$i$i$i) + ($2127<<2)|0);
      $2129 = +HEAPF32[$2128>>2];
      $2130 = (($h2$26$i$i$i) + ($2127<<2)|0);
      $2131 = +HEAPF32[$2130>>2];
      $2132 = $2129 * $2131;
      $2133 = $m$3$i$i$i | 7;
      $2134 = (($h$i$i$i) + ($2133<<2)|0);
      $2135 = +HEAPF32[$2134>>2];
      $2136 = (($h2$26$i$i$i) + ($2133<<2)|0);
      $2137 = +HEAPF32[$2136>>2];
      $2138 = $2135 * $2137;
      $2139 = $2132 + $2138;
      $2140 = $2125 + $2139;
      $2141 = (($p0$28$i$i$i) + ($t$2$i$i$i<<2)|0);
      HEAPF32[$2141>>2] = $2140;
      $2142 = (($t$2$i$i$i) + -9)|0;
      $2143 = (($m$3$i$i$i) + 8)|0;
      $2144 = (($i$5$i$i$i) + 1)|0;
      $cor$3$i$i$i = $2140;$i$5$i$i$i = $2144;$m$3$i$i$i = $2143;$t$2$i$i$i = $2142;
     }
     $2145 = (($h2$26$i$i$i) + 32|0);
     $2146 = (($p3$25$i$i$i) + -32|0);
     $2147 = (($p2$24$i$i$i) + -4|0);
     $2148 = (($p1$23$i$i$i) + -4|0);
     $2149 = (($p0$28$i$i$i) + -4|0);
     $exitcond27$i$i$i = ($2082|0)==(8);
     if ($exitcond27$i$i$i) {
      $i$01$i$i$i = 0;
      break;
     } else {
      $h2$26$i$i$i = $2145;$k$27$i$i$i = $2082;$p0$28$i$i$i = $2149;$p1$23$i$i$i = $2148;$p2$24$i$i$i = $2147;$p3$25$i$i$i = $2146;
     }
    }
    while(1) {
     $2150 = (60 - ($i$01$i$i$i))|0;
     $2151 = ($2150|0)>(0);
     if ($2151) {
      $i$01$i$i3$i$i = 0;$sum$02$i$i2$i$i = 0.0;
      while(1) {
       $$sum159 = (($i$01$i$i$i) + ($i$01$i$i3$i$i))|0;
       $2152 = (($Dpnt$13) + ($$sum159<<2)|0);
       $2153 = +HEAPF32[$2152>>2];
       $2154 = (($ImpResp) + ($i$01$i$i3$i$i<<2)|0);
       $2155 = +HEAPF32[$2154>>2];
       $2156 = $2153 * $2155;
       $2157 = $sum$02$i$i2$i$i + $2156;
       $2158 = (($i$01$i$i3$i$i) + 1)|0;
       $exitcond$i$i$i$i = ($2158|0)==($2150|0);
       if ($exitcond$i$i$i$i) {
        $sum$0$lcssa$i$i$i$i = $2157;
        break;
       } else {
        $i$01$i$i3$i$i = $2158;$sum$02$i$i2$i$i = $2157;
       }
      }
     } else {
      $sum$0$lcssa$i$i$i$i = 0.0;
     }
     $2159 = (($Bound$i) + ($i$01$i$i$i<<2)|0);
     HEAPF32[$2159>>2] = $sum$0$lcssa$i$i$i$i;
     $2160 = (($i$01$i$i$i) + 1)|0;
     $exitcond$i5$i$i = ($2160|0)==(60);
     if ($exitcond$i5$i$i) {
      break;
     } else {
      $i$01$i$i$i = $2160;
     }
    }
    ;HEAP32[$scevgep198$i$i$i+0>>2]=0|0;HEAP32[$scevgep198$i$i$i+4>>2]=0|0;HEAP32[$scevgep198$i$i$i+8>>2]=0|0;HEAP32[$scevgep198$i$i$i+12>>2]=0|0;
    $i$1164$i$i$i = 0;
    while(1) {
     $2161 = (($Bound$i) + ($i$1164$i$i$i<<2)|0);
     $2162 = +HEAPF32[$2161>>2];
     $2163 = $i$1164$i$i$i | 1;
     $2164 = (($Bound$i) + ($2163<<2)|0);
     $2165 = +HEAPF32[$2164>>2];
     $2166 = $2162 + $2165;
     $2167 = !($2166 >= 0.0);
     $2168 = (($i$1164$i$i$i|0) / 2)&-1;
     $2169 = (($FltBuf$i) + ($2168<<2)|0);
     if ($2167) {
      HEAP32[$2169>>2] = -1;
      $2171 = (($CorVct$i) + ($2168<<2)|0);
      HEAP32[$2171>>2] = -2;
      $2172 = -$2162;
      HEAPF32[$2161>>2] = $2172;
      $2173 = -$2165;
      HEAPF32[$2164>>2] = $2173;
     } else {
      HEAP32[$2169>>2] = 1;
      $2170 = (($CorVct$i) + ($2168<<2)|0);
      HEAP32[$2170>>2] = 2;
     }
     $2174 = (($i$1164$i$i$i) + 2)|0;
     $2175 = ($2174|0)<(60);
     if ($2175) {
      $i$1164$i$i$i = $2174;
     } else {
      break;
     }
    }
    HEAP32[$939>>2] = 1;
    HEAP32[$940>>2] = 1;
    HEAP32[$941>>2] = 2;
    HEAP32[$942>>2] = 2;
    $2176 = +HEAPF32[$Bound$i>>2];
    $2177 = +HEAPF32[$943>>2];
    $2178 = +HEAPF32[$944>>2];
    $2179 = +HEAPF32[$945>>2];
    $2180 = $2179 > $2176;
    $max0$1$i$i$i = $2180 ? $2179 : $2176;
    $2181 = +HEAPF32[$946>>2];
    $2182 = $2181 > $2177;
    $max1$1$i$i$i = $2182 ? $2181 : $2177;
    $2183 = +HEAPF32[$947>>2];
    $2184 = $2183 > $2178;
    $max2$1$i$i$i = $2184 ? $2183 : $2178;
    $2185 = +HEAPF32[$948>>2];
    $2186 = $2185 > $max0$1$i$i$i;
    $max0$1$1$i$i$i = $2186 ? $2185 : $max0$1$i$i$i;
    $2187 = +HEAPF32[$949>>2];
    $2188 = $2187 > $max1$1$i$i$i;
    $max1$1$1$i$i$i = $2188 ? $2187 : $max1$1$i$i$i;
    $2189 = +HEAPF32[$950>>2];
    $2190 = $2189 > $max2$1$i$i$i;
    $max2$1$1$i$i$i = $2190 ? $2189 : $max2$1$i$i$i;
    $2191 = +HEAPF32[$951>>2];
    $2192 = $2191 > $max0$1$1$i$i$i;
    $max0$1$2$i$i$i = $2192 ? $2191 : $max0$1$1$i$i$i;
    $2193 = +HEAPF32[$952>>2];
    $2194 = $2193 > $max1$1$1$i$i$i;
    $max1$1$2$i$i$i = $2194 ? $2193 : $max1$1$1$i$i$i;
    $2195 = +HEAPF32[$953>>2];
    $2196 = $2195 > $max2$1$1$i$i$i;
    $max2$1$2$i$i$i = $2196 ? $2195 : $max2$1$1$i$i$i;
    $2197 = +HEAPF32[$954>>2];
    $2198 = $2197 > $max0$1$2$i$i$i;
    $max0$1$3$i$i$i = $2198 ? $2197 : $max0$1$2$i$i$i;
    $2199 = +HEAPF32[$955>>2];
    $2200 = $2199 > $max1$1$2$i$i$i;
    $max1$1$3$i$i$i = $2200 ? $2199 : $max1$1$2$i$i$i;
    $2201 = +HEAPF32[$956>>2];
    $2202 = $2201 > $max2$1$2$i$i$i;
    $max2$1$3$i$i$i = $2202 ? $2201 : $max2$1$2$i$i$i;
    $2203 = +HEAPF32[$957>>2];
    $2204 = $2203 > $max0$1$3$i$i$i;
    $max0$1$4$i$i$i = $2204 ? $2203 : $max0$1$3$i$i$i;
    $2205 = +HEAPF32[$958>>2];
    $2206 = $2205 > $max1$1$3$i$i$i;
    $max1$1$4$i$i$i = $2206 ? $2205 : $max1$1$3$i$i$i;
    $2207 = +HEAPF32[$959>>2];
    $2208 = $2207 > $max2$1$3$i$i$i;
    $max2$1$4$i$i$i = $2208 ? $2207 : $max2$1$3$i$i$i;
    $2209 = +HEAPF32[$960>>2];
    $2210 = $2209 > $max0$1$4$i$i$i;
    $max0$1$5$i$i$i = $2210 ? $2209 : $max0$1$4$i$i$i;
    $2211 = +HEAPF32[$961>>2];
    $2212 = $2211 > $max1$1$4$i$i$i;
    $max1$1$5$i$i$i = $2212 ? $2211 : $max1$1$4$i$i$i;
    $2213 = +HEAPF32[$962>>2];
    $2214 = $2213 > $max2$1$4$i$i$i;
    $max2$1$5$i$i$i = $2214 ? $2213 : $max2$1$4$i$i$i;
    $2215 = +HEAPF32[$963>>2];
    $2216 = +HEAPF32[$964>>2];
    $2217 = +HEAPF32[$scevgep198$i$i$i>>2];
    $2218 = $2178 + $2177;
    $2219 = $2218 + $2176;
    $2220 = $2219 + 0.0;
    $2221 = $2183 + $2181;
    $2222 = $2221 + $2179;
    $2223 = $2220 + $2222;
    $2224 = $2189 + $2187;
    $2225 = $2224 + $2185;
    $2226 = $2223 + $2225;
    $2227 = $2195 + $2193;
    $2228 = $2227 + $2191;
    $2229 = $2226 + $2228;
    $2230 = $2201 + $2199;
    $2231 = $2230 + $2197;
    $2232 = $2229 + $2231;
    $2233 = $2207 + $2205;
    $2234 = $2233 + $2203;
    $2235 = $2232 + $2234;
    $2236 = $2213 + $2211;
    $2237 = $2236 + $2209;
    $2238 = $2235 + $2237;
    $2239 = $2217 + $2216;
    $2240 = $2239 + $2215;
    $2241 = $2238 + $2240;
    $2242 = $2241 * 0.125;
    $2243 = +HEAPF32[$965>>2];
    $2244 = +HEAPF32[$966>>2];
    $2245 = +HEAPF32[$967>>2];
    $2246 = $2215 > $max0$1$5$i$i$i;
    $2247 = $2216 > $max1$1$5$i$i$i;
    $max0$1$6$i$i$i = $2246 ? $2215 : $max0$1$5$i$i$i;
    $max1$1$6$i$i$i = $2247 ? $2216 : $max1$1$5$i$i$i;
    $2248 = $2217 > $max2$1$5$i$i$i;
    $max2$1$6$i$i$i = $2248 ? $2217 : $max2$1$5$i$i$i;
    $2249 = $max0$1$6$i$i$i + $max1$1$6$i$i$i;
    $2250 = $2249 + $max2$1$6$i$i$i;
    $2251 = $2250 - $2242;
    $2252 = $2251 * 0.5;
    $2253 = +HEAPF32[$968>>2];
    $2254 = $2253 > $2243;
    $max0$3$i$i$i = $2254 ? $2253 : $2243;
    $2255 = +HEAPF32[$969>>2];
    $2256 = $2255 > $2244;
    $max1$3$i$i$i = $2256 ? $2255 : $2244;
    $2257 = +HEAPF32[$970>>2];
    $2258 = $2257 > $2245;
    $max2$3$i$i$i = $2258 ? $2257 : $2245;
    $2259 = +HEAPF32[$971>>2];
    $2260 = $2259 > $max0$3$i$i$i;
    $max0$3$1$i$i$i = $2260 ? $2259 : $max0$3$i$i$i;
    $2261 = +HEAPF32[$972>>2];
    $2262 = $2261 > $max1$3$i$i$i;
    $max1$3$1$i$i$i = $2262 ? $2261 : $max1$3$i$i$i;
    $2263 = +HEAPF32[$973>>2];
    $2264 = $2263 > $max2$3$i$i$i;
    $max2$3$1$i$i$i = $2264 ? $2263 : $max2$3$i$i$i;
    $2265 = +HEAPF32[$974>>2];
    $2266 = $2265 > $max0$3$1$i$i$i;
    $max0$3$2$i$i$i = $2266 ? $2265 : $max0$3$1$i$i$i;
    $2267 = +HEAPF32[$975>>2];
    $2268 = $2267 > $max1$3$1$i$i$i;
    $max1$3$2$i$i$i = $2268 ? $2267 : $max1$3$1$i$i$i;
    $2269 = +HEAPF32[$976>>2];
    $2270 = $2269 > $max2$3$1$i$i$i;
    $max2$3$2$i$i$i = $2270 ? $2269 : $max2$3$1$i$i$i;
    $2271 = +HEAPF32[$977>>2];
    $2272 = $2271 > $max0$3$2$i$i$i;
    $max0$3$3$i$i$i = $2272 ? $2271 : $max0$3$2$i$i$i;
    $2273 = +HEAPF32[$978>>2];
    $2274 = $2273 > $max1$3$2$i$i$i;
    $max1$3$3$i$i$i = $2274 ? $2273 : $max1$3$2$i$i$i;
    $2275 = +HEAPF32[$979>>2];
    $2276 = $2275 > $max2$3$2$i$i$i;
    $max2$3$3$i$i$i = $2276 ? $2275 : $max2$3$2$i$i$i;
    $2277 = +HEAPF32[$980>>2];
    $2278 = $2277 > $max0$3$3$i$i$i;
    $max0$3$4$i$i$i = $2278 ? $2277 : $max0$3$3$i$i$i;
    $2279 = +HEAPF32[$981>>2];
    $2280 = $2279 > $max1$3$3$i$i$i;
    $max1$3$4$i$i$i = $2280 ? $2279 : $max1$3$3$i$i$i;
    $2281 = +HEAPF32[$982>>2];
    $2282 = $2281 > $max2$3$3$i$i$i;
    $max2$3$4$i$i$i = $2282 ? $2281 : $max2$3$3$i$i$i;
    $2283 = +HEAPF32[$983>>2];
    $2284 = $2283 > $max0$3$4$i$i$i;
    $max0$3$5$i$i$i = $2284 ? $2283 : $max0$3$4$i$i$i;
    $2285 = +HEAPF32[$984>>2];
    $2286 = $2285 > $max1$3$4$i$i$i;
    $max1$3$5$i$i$i = $2286 ? $2285 : $max1$3$4$i$i$i;
    $2287 = +HEAPF32[$985>>2];
    $2288 = $2287 > $max2$3$4$i$i$i;
    $max2$3$5$i$i$i = $2288 ? $2287 : $max2$3$4$i$i$i;
    $2289 = +HEAPF32[$986>>2];
    $2290 = +HEAPF32[$987>>2];
    $2291 = +HEAPF32[$988>>2];
    $2292 = $2242 + $2252;
    $2293 = $2290 > $max1$3$5$i$i$i;
    $2294 = $2289 > $max0$3$5$i$i$i;
    $2295 = $2291 > $max2$3$5$i$i$i;
    $max1$3$6$i$i$i = $2293 ? $2290 : $max1$3$5$i$i$i;
    $max0$3$6$i$i$i = $2294 ? $2289 : $max0$3$5$i$i$i;
    $2296 = $max0$3$6$i$i$i + $max1$3$6$i$i$i;
    $max2$3$6$i$i$i = $2295 ? $2291 : $max2$3$5$i$i$i;
    $2297 = $2245 + $2244;
    $2298 = $2297 + $2243;
    $2299 = $2298 + 0.0;
    $2300 = $2257 + $2255;
    $2301 = $2300 + $2253;
    $2302 = $2299 + $2301;
    $2303 = $2263 + $2261;
    $2304 = $2303 + $2259;
    $2305 = $2302 + $2304;
    $2306 = $2269 + $2267;
    $2307 = $2306 + $2265;
    $2308 = $2305 + $2307;
    $2309 = $2275 + $2273;
    $2310 = $2309 + $2271;
    $2311 = $2308 + $2310;
    $2312 = $2281 + $2279;
    $2313 = $2312 + $2277;
    $2314 = $2311 + $2313;
    $2315 = $2287 + $2285;
    $2316 = $2315 + $2283;
    $2317 = $2314 + $2316;
    $2318 = $2291 + $2290;
    $2319 = $2318 + $2289;
    $2320 = $2317 + $2319;
    $2321 = $2296 + $max2$3$6$i$i$i;
    $2322 = $2320 * 0.125;
    $2323 = $2321 - $2322;
    $2324 = $2323 * 0.5;
    $2325 = $2322 + $2324;
    $2326 = $2325 > $2292;
    $i0$0150$i$i$i = 0;$ptr_ri0i1$0147$i$i$i = $931;$ptr_ri0i2$0148$i$i$i = $936;$ptr_ri0i3$0149$i$i$i = $932;
    while(1) {
     $2327 = (($FltBuf$i) + ($i0$0150$i$i$i<<2)|0);
     $2328 = HEAP32[$2327>>2]|0;
     $scevgep193$i$i$i = (($ptr_ri0i2$0148$i$i$i) + 32|0);
     $i1$0143$i$i$i = 1;$ptr_ri0i1$1144$i$i$i = $ptr_ri0i1$0147$i$i$i;$ptr_ri0i2$1145$i$i$i = $ptr_ri0i2$0148$i$i$i;$ptr_ri0i3$1146$i$i$i = $ptr_ri0i3$0149$i$i$i;
     while(1) {
      $2345 = (($CorVct$i) + ($i1$0143$i$i$i<<2)|0);
      $2346 = HEAP32[$2345>>2]|0;
      $2347 = Math_imul($2346, $2328)|0;
      $2348 = (+($2347|0));
      $2349 = (($ptr_ri0i1$1144$i$i$i) + 4|0);
      $2350 = +HEAPF32[$ptr_ri0i1$1144$i$i$i>>2];
      $2351 = $2350 * $2348;
      HEAPF32[$ptr_ri0i1$1144$i$i$i>>2] = $2351;
      $2352 = (($i1$0143$i$i$i) + 1)|0;
      $2353 = (($CorVct$i) + ($2352<<2)|0);
      $2354 = HEAP32[$2353>>2]|0;
      $2355 = Math_imul($2354, $2328)|0;
      $2356 = (+($2355|0));
      $2357 = (($ptr_ri0i2$1145$i$i$i) + 4|0);
      $2358 = +HEAPF32[$ptr_ri0i2$1145$i$i$i>>2];
      $2359 = $2358 * $2356;
      HEAPF32[$ptr_ri0i2$1145$i$i$i>>2] = $2359;
      $2360 = (($i1$0143$i$i$i) + 2)|0;
      $2361 = (($CorVct$i) + ($2360<<2)|0);
      $2362 = HEAP32[$2361>>2]|0;
      $2363 = Math_imul($2362, $2328)|0;
      $2364 = (+($2363|0));
      $2365 = (($ptr_ri0i3$1146$i$i$i) + 4|0);
      $2366 = +HEAPF32[$ptr_ri0i3$1146$i$i$i>>2];
      $2367 = $2366 * $2364;
      HEAPF32[$ptr_ri0i3$1146$i$i$i>>2] = $2367;
      $2368 = (($i1$0143$i$i$i) + 4)|0;
      $2369 = ($2368|0)<(30);
      if ($2369) {
       $i1$0143$i$i$i = $2368;$ptr_ri0i1$1144$i$i$i = $2349;$ptr_ri0i2$1145$i$i$i = $2357;$ptr_ri0i3$1146$i$i$i = $2365;
      } else {
       break;
      }
     }
     $scevgep192$i$i$i = (($ptr_ri0i3$0149$i$i$i) + 32|0);
     $scevgep194$i$i$i = (($ptr_ri0i1$0147$i$i$i) + 32|0);
     $2370 = (($i0$0150$i$i$i) + 4)|0;
     $2371 = ($2370|0)<(30);
     if ($2371) {
      $i0$0150$i$i$i = $2370;$ptr_ri0i1$0147$i$i$i = $scevgep194$i$i$i;$ptr_ri0i2$0148$i$i$i = $scevgep193$i$i$i;$ptr_ri0i3$0149$i$i$i = $scevgep192$i$i$i;
     } else {
      break;
     }
    }
    $thres$0$i$i$i = $2326 ? $2325 : $2292;
    $2329 = HEAP32[$989>>2]|0;
    $2330 = HEAP32[$990>>2]|0;
    $2331 = HEAP32[$991>>2]|0;
    $2332 = HEAP32[$992>>2]|0;
    $2333 = HEAP32[$993>>2]|0;
    $2334 = HEAP32[$994>>2]|0;
    $2335 = HEAP32[$995>>2]|0;
    $2336 = HEAP32[$996>>2]|0;
    $2337 = HEAP32[$997>>2]|0;
    $2338 = HEAP32[$998>>2]|0;
    $2339 = HEAP32[$999>>2]|0;
    $2340 = HEAP32[$1000>>2]|0;
    $2341 = HEAP32[$1001>>2]|0;
    $2342 = HEAP32[$1002>>2]|0;
    $2343 = HEAP32[$942>>2]|0;
    $2344 = HEAP32[$941>>2]|0;
    $i1$1139$i$i$i = 1;$ptr_ri1i2$0140$i$i$i = $937;$ptr_ri1i3$0141$i$i$i = $933;
    while(1) {
     $2380 = (($FltBuf$i) + ($i1$1139$i$i$i<<2)|0);
     $2381 = HEAP32[$2380>>2]|0;
     $scevgep187$i$i$i = (($ptr_ri1i3$0141$i$i$i) + 32|0);
     $2382 = Math_imul($2329, $2381)|0;
     $2383 = (+($2382|0));
     $2384 = (($ptr_ri1i2$0140$i$i$i) + 4|0);
     $2385 = +HEAPF32[$ptr_ri1i2$0140$i$i$i>>2];
     $2386 = $2385 * $2383;
     HEAPF32[$ptr_ri1i2$0140$i$i$i>>2] = $2386;
     $2387 = Math_imul($2330, $2381)|0;
     $2388 = (+($2387|0));
     $2389 = (($ptr_ri1i3$0141$i$i$i) + 4|0);
     $2390 = +HEAPF32[$ptr_ri1i3$0141$i$i$i>>2];
     $2391 = $2390 * $2388;
     HEAPF32[$ptr_ri1i3$0141$i$i$i>>2] = $2391;
     $2392 = Math_imul($2331, $2381)|0;
     $2393 = (+($2392|0));
     $2394 = (($ptr_ri1i2$0140$i$i$i) + 8|0);
     $2395 = +HEAPF32[$2384>>2];
     $2396 = $2395 * $2393;
     HEAPF32[$2384>>2] = $2396;
     $2397 = Math_imul($2332, $2381)|0;
     $2398 = (+($2397|0));
     $2399 = (($ptr_ri1i3$0141$i$i$i) + 8|0);
     $2400 = +HEAPF32[$2389>>2];
     $2401 = $2400 * $2398;
     HEAPF32[$2389>>2] = $2401;
     $2402 = Math_imul($2333, $2381)|0;
     $2403 = (+($2402|0));
     $2404 = (($ptr_ri1i2$0140$i$i$i) + 12|0);
     $2405 = +HEAPF32[$2394>>2];
     $2406 = $2405 * $2403;
     HEAPF32[$2394>>2] = $2406;
     $2407 = Math_imul($2334, $2381)|0;
     $2408 = (+($2407|0));
     $2409 = (($ptr_ri1i3$0141$i$i$i) + 12|0);
     $2410 = +HEAPF32[$2399>>2];
     $2411 = $2410 * $2408;
     HEAPF32[$2399>>2] = $2411;
     $2412 = Math_imul($2335, $2381)|0;
     $2413 = (+($2412|0));
     $2414 = (($ptr_ri1i2$0140$i$i$i) + 16|0);
     $2415 = +HEAPF32[$2404>>2];
     $2416 = $2415 * $2413;
     HEAPF32[$2404>>2] = $2416;
     $2417 = Math_imul($2336, $2381)|0;
     $2418 = (+($2417|0));
     $2419 = (($ptr_ri1i3$0141$i$i$i) + 16|0);
     $2420 = +HEAPF32[$2409>>2];
     $2421 = $2420 * $2418;
     HEAPF32[$2409>>2] = $2421;
     $2422 = Math_imul($2337, $2381)|0;
     $2423 = (+($2422|0));
     $2424 = (($ptr_ri1i2$0140$i$i$i) + 20|0);
     $2425 = +HEAPF32[$2414>>2];
     $2426 = $2425 * $2423;
     HEAPF32[$2414>>2] = $2426;
     $2427 = Math_imul($2338, $2381)|0;
     $2428 = (+($2427|0));
     $2429 = (($ptr_ri1i3$0141$i$i$i) + 20|0);
     $2430 = +HEAPF32[$2419>>2];
     $2431 = $2430 * $2428;
     HEAPF32[$2419>>2] = $2431;
     $2432 = Math_imul($2339, $2381)|0;
     $2433 = (+($2432|0));
     $2434 = (($ptr_ri1i2$0140$i$i$i) + 24|0);
     $2435 = +HEAPF32[$2424>>2];
     $2436 = $2435 * $2433;
     HEAPF32[$2424>>2] = $2436;
     $2437 = Math_imul($2340, $2381)|0;
     $2438 = (+($2437|0));
     $2439 = (($ptr_ri1i3$0141$i$i$i) + 24|0);
     $2440 = +HEAPF32[$2429>>2];
     $2441 = $2440 * $2438;
     HEAPF32[$2429>>2] = $2441;
     $2442 = Math_imul($2341, $2381)|0;
     $2443 = (+($2442|0));
     $2444 = (($ptr_ri1i2$0140$i$i$i) + 28|0);
     $2445 = +HEAPF32[$2434>>2];
     $2446 = $2445 * $2443;
     HEAPF32[$2434>>2] = $2446;
     $2447 = Math_imul($2342, $2381)|0;
     $2448 = (+($2447|0));
     $2449 = (($ptr_ri1i3$0141$i$i$i) + 28|0);
     $2450 = +HEAPF32[$2439>>2];
     $2451 = $2450 * $2448;
     HEAPF32[$2439>>2] = $2451;
     $2452 = Math_imul($2343, $2381)|0;
     $2453 = (+($2452|0));
     $2454 = +HEAPF32[$2444>>2];
     $2455 = $2454 * $2453;
     HEAPF32[$2444>>2] = $2455;
     $2456 = Math_imul($2344, $2381)|0;
     $2457 = (+($2456|0));
     $2458 = +HEAPF32[$2449>>2];
     $2459 = $2458 * $2457;
     HEAPF32[$2449>>2] = $2459;
     $scevgep188$i$i$i = (($ptr_ri1i2$0140$i$i$i) + 32|0);
     $2460 = (($i1$1139$i$i$i) + 4)|0;
     $2461 = ($2460|0)<(30);
     if ($2461) {
      $i1$1139$i$i$i = $2460;$ptr_ri1i2$0140$i$i$i = $scevgep188$i$i$i;$ptr_ri1i3$0141$i$i$i = $scevgep187$i$i$i;
     } else {
      break;
     }
    }
    $2372 = HEAP32[$990>>2]|0;
    $2373 = HEAP32[$992>>2]|0;
    $2374 = HEAP32[$994>>2]|0;
    $2375 = HEAP32[$996>>2]|0;
    $2376 = HEAP32[$998>>2]|0;
    $2377 = HEAP32[$1000>>2]|0;
    $2378 = HEAP32[$1002>>2]|0;
    $2379 = HEAP32[$941>>2]|0;
    $i2$1132$i$i$i = 2;$ptr_ri2i3$0133$i$i$i = $938;
    while(1) {
     $2462 = (($FltBuf$i) + ($i2$1132$i$i$i<<2)|0);
     $2463 = HEAP32[$2462>>2]|0;
     $2464 = Math_imul($2372, $2463)|0;
     $2465 = (+($2464|0));
     $2466 = (($ptr_ri2i3$0133$i$i$i) + 4|0);
     $2467 = +HEAPF32[$ptr_ri2i3$0133$i$i$i>>2];
     $2468 = $2467 * $2465;
     HEAPF32[$ptr_ri2i3$0133$i$i$i>>2] = $2468;
     $2469 = Math_imul($2373, $2463)|0;
     $2470 = (+($2469|0));
     $2471 = (($ptr_ri2i3$0133$i$i$i) + 8|0);
     $2472 = +HEAPF32[$2466>>2];
     $2473 = $2472 * $2470;
     HEAPF32[$2466>>2] = $2473;
     $2474 = Math_imul($2374, $2463)|0;
     $2475 = (+($2474|0));
     $2476 = (($ptr_ri2i3$0133$i$i$i) + 12|0);
     $2477 = +HEAPF32[$2471>>2];
     $2478 = $2477 * $2475;
     HEAPF32[$2471>>2] = $2478;
     $2479 = Math_imul($2375, $2463)|0;
     $2480 = (+($2479|0));
     $2481 = (($ptr_ri2i3$0133$i$i$i) + 16|0);
     $2482 = +HEAPF32[$2476>>2];
     $2483 = $2482 * $2480;
     HEAPF32[$2476>>2] = $2483;
     $2484 = Math_imul($2376, $2463)|0;
     $2485 = (+($2484|0));
     $2486 = (($ptr_ri2i3$0133$i$i$i) + 20|0);
     $2487 = +HEAPF32[$2481>>2];
     $2488 = $2487 * $2485;
     HEAPF32[$2481>>2] = $2488;
     $2489 = Math_imul($2377, $2463)|0;
     $2490 = (+($2489|0));
     $2491 = (($ptr_ri2i3$0133$i$i$i) + 24|0);
     $2492 = +HEAPF32[$2486>>2];
     $2493 = $2492 * $2490;
     HEAPF32[$2486>>2] = $2493;
     $2494 = Math_imul($2378, $2463)|0;
     $2495 = (+($2494|0));
     $2496 = (($ptr_ri2i3$0133$i$i$i) + 28|0);
     $2497 = +HEAPF32[$2491>>2];
     $2498 = $2497 * $2495;
     HEAPF32[$2491>>2] = $2498;
     $2499 = Math_imul($2379, $2463)|0;
     $2500 = (+($2499|0));
     $2501 = +HEAPF32[$2496>>2];
     $2502 = $2501 * $2500;
     HEAPF32[$2496>>2] = $2502;
     $scevgep184$i$i$i = (($ptr_ri2i3$0133$i$i$i) + 32|0);
     $2503 = (($i2$1132$i$i$i) + 4)|0;
     $2504 = ($2503|0)<(32);
     if ($2504) {
      $i2$1132$i$i$i = $2503;$ptr_ri2i3$0133$i$i$i = $scevgep184$i$i$i;
     } else {
      break;
     }
    }
    $2505 = HEAP32[16>>2]|0;
    $2506 = (($2505) + 120)|0;
    $alpha$0117$i$i$i = 1.0;$i0$1127$i$i$i = 0;$ip0$0122$i$i$i = 0;$ip1$0121$i$i$i = 2;$ip2$0120$i$i$i = 4;$ip3$0119$i$i$i = 6;$psc$0116$i$i$i = 0.0;$ptr_ri0i0$0123$i$i$i = $rr$i$i;$ptr_ri0i1$2124$i$i$i = $931;$ptr_ri0i2$2125$i$i$i = $936;$ptr_ri0i3$2126$i$i$i = $932;$shif$0115$i$i$i = 0;$time$0118$i$i$i = $2506;
    L338: while(1) {
     $2507 = (($Bound$i) + ($i0$1127$i$i$i<<2)|0);
     $2508 = +HEAPF32[$2507>>2];
     $2509 = $i0$1127$i$i$i | 1;
     $2510 = (($Bound$i) + ($2509<<2)|0);
     $2511 = +HEAPF32[$2510>>2];
     $2512 = (($ptr_ri0i0$0123$i$i$i) + 4|0);
     $2513 = +HEAPF32[$ptr_ri0i0$0123$i$i$i>>2];
     $alpha$195$i$i$i = $alpha$0117$i$i$i;$i1$2101$i$i$i = 2;$ip0$1100$i$i$i = $ip0$0122$i$i$i;$ip1$199$i$i$i = $ip1$0121$i$i$i;$ip2$198$i$i$i = $ip2$0120$i$i$i;$ip3$197$i$i$i = $ip3$0119$i$i$i;$psc$194$i$i$i = $psc$0116$i$i$i;$ptr_ri0i1$3103$i$i$i = $ptr_ri0i1$2124$i$i$i;$ptr_ri0i2$3104$i$i$i = $ptr_ri0i2$2125$i$i$i;$ptr_ri1i1$0102$i$i$i = $934;$ptr_ri1i2$2106$i$i$i = $937;$ptr_ri1i3$2107$i$i$i = $933;$shif$193$i$i$i = $shif$0115$i$i$i;$time$196$i$i$i = $time$0118$i$i$i;
     while(1) {
      $2514 = (($Bound$i) + ($i1$2101$i$i$i<<2)|0);
      $2515 = +HEAPF32[$2514>>2];
      $2516 = $2508 + $2515;
      $2517 = $i1$2101$i$i$i | 1;
      $2518 = (($Bound$i) + ($2517<<2)|0);
      $2519 = +HEAPF32[$2518>>2];
      $2520 = $2511 + $2519;
      $2521 = (($ptr_ri1i1$0102$i$i$i) + 4|0);
      $2522 = +HEAPF32[$ptr_ri1i1$0102$i$i$i>>2];
      $2523 = $2513 + $2522;
      $2524 = (($ptr_ri0i1$3103$i$i$i) + 4|0);
      $2525 = +HEAPF32[$ptr_ri0i1$3103$i$i$i>>2];
      $2526 = $2523 + $2525;
      $alpha$269$i$i$i = $alpha$195$i$i$i;$i2$275$i$i$i = 4;$ip0$274$i$i$i = $ip0$1100$i$i$i;$ip1$273$i$i$i = $ip1$199$i$i$i;$ip2$272$i$i$i = $ip2$198$i$i$i;$ip3$271$i$i$i = $ip3$197$i$i$i;$psc$268$i$i$i = $psc$194$i$i$i;$ptr_ri0i2$477$i$i$i = $ptr_ri0i2$3104$i$i$i;$ptr_ri1i2$379$i$i$i = $ptr_ri1i2$2106$i$i$i;$ptr_ri2i2$076$i$i$i = $930;$ptr_ri2i3$281$i$i$i = $938;$shif$267$i$i$i = $shif$193$i$i$i;$time$270$i$i$i = $time$196$i$i$i;
      while(1) {
       $2527 = (($Bound$i) + ($i2$275$i$i$i<<2)|0);
       $2528 = +HEAPF32[$2527>>2];
       $2529 = $2516 + $2528;
       $2530 = $i2$275$i$i$i | 1;
       $2531 = (($Bound$i) + ($2530<<2)|0);
       $2532 = +HEAPF32[$2531>>2];
       $2533 = $2520 + $2532;
       $2534 = (($ptr_ri2i2$076$i$i$i) + 4|0);
       $2535 = +HEAPF32[$ptr_ri2i2$076$i$i$i>>2];
       $2536 = $2526 + $2535;
       $2537 = (($ptr_ri0i2$477$i$i$i) + 4|0);
       $2538 = +HEAPF32[$ptr_ri0i2$477$i$i$i>>2];
       $2539 = $2536 + $2538;
       $2540 = (($ptr_ri1i2$379$i$i$i) + 4|0);
       $2541 = +HEAPF32[$ptr_ri1i2$379$i$i$i>>2];
       $2542 = $2539 + $2541;
       $2543 = $2533 > $2529;
       $ps2$0$i$i$i = $2543 ? $2533 : $2529;
       $shift$0$i$i$i = $2543&1;
       $2544 = $ps2$0$i$i$i > $thres$0$i$i$i;
       if ($2544) {
        $alpha$344$i$i$i = $alpha$269$i$i$i;$i3$149$i$i$i = 6;$ip0$348$i$i$i = $ip0$274$i$i$i;$ip1$347$i$i$i = $ip1$273$i$i$i;$ip2$346$i$i$i = $ip2$272$i$i$i;$ip3$345$i$i$i = $ip3$271$i$i$i;$psc$343$i$i$i = $psc$268$i$i$i;$ptr_ri0i3$551$i$i$i = $ptr_ri0i3$2126$i$i$i;$ptr_ri1i3$452$i$i$i = $ptr_ri1i3$2107$i$i$i;$ptr_ri2i3$353$i$i$i = $ptr_ri2i3$281$i$i$i;$ptr_ri3i3$050$i$i$i = $935;$shif$342$i$i$i = $shif$267$i$i$i;
        while(1) {
         $2545 = $i3$149$i$i$i | $shift$0$i$i$i;
         $2546 = (($Bound$i) + ($2545<<2)|0);
         $2547 = +HEAPF32[$2546>>2];
         $2548 = $ps2$0$i$i$i + $2547;
         $2549 = (($ptr_ri3i3$050$i$i$i) + 4|0);
         $2550 = +HEAPF32[$ptr_ri3i3$050$i$i$i>>2];
         $2551 = $2542 + $2550;
         $2552 = (($ptr_ri0i3$551$i$i$i) + 4|0);
         $2553 = +HEAPF32[$ptr_ri0i3$551$i$i$i>>2];
         $2554 = $2551 + $2553;
         $2555 = (($ptr_ri1i3$452$i$i$i) + 4|0);
         $2556 = +HEAPF32[$ptr_ri1i3$452$i$i$i>>2];
         $2557 = $2554 + $2556;
         $2558 = (($ptr_ri2i3$353$i$i$i) + 4|0);
         $2559 = +HEAPF32[$ptr_ri2i3$353$i$i$i>>2];
         $2560 = $2557 + $2559;
         $2561 = $2548 * $2548;
         $2562 = $alpha$344$i$i$i * $2561;
         $2563 = $psc$343$i$i$i * $2560;
         $2564 = $2562 > $2563;
         if ($2564) {
          $alpha$4$i$i$i = $2560;$ip0$4$i$i$i = $i0$1127$i$i$i;$ip1$4$i$i$i = $i1$2101$i$i$i;$ip2$4$i$i$i = $i2$275$i$i$i;$ip3$4$i$i$i = $i3$149$i$i$i;$psc$4$i$i$i = $2561;$shif$4$i$i$i = $shift$0$i$i$i;
         } else {
          $alpha$4$i$i$i = $alpha$344$i$i$i;$ip0$4$i$i$i = $ip0$348$i$i$i;$ip1$4$i$i$i = $ip1$347$i$i$i;$ip2$4$i$i$i = $ip2$346$i$i$i;$ip3$4$i$i$i = $ip3$345$i$i$i;$psc$4$i$i$i = $psc$343$i$i$i;$shif$4$i$i$i = $shif$342$i$i$i;
         }
         $2565 = (($i3$149$i$i$i) + 8)|0;
         $2566 = ($2565|0)<(64);
         if ($2566) {
          $alpha$344$i$i$i = $alpha$4$i$i$i;$i3$149$i$i$i = $2565;$ip0$348$i$i$i = $ip0$4$i$i$i;$ip1$347$i$i$i = $ip1$4$i$i$i;$ip2$346$i$i$i = $ip2$4$i$i$i;$ip3$345$i$i$i = $ip3$4$i$i$i;$psc$343$i$i$i = $psc$4$i$i$i;$ptr_ri0i3$551$i$i$i = $2552;$ptr_ri1i3$452$i$i$i = $2555;$ptr_ri2i3$353$i$i$i = $2558;$ptr_ri3i3$050$i$i$i = $2549;$shif$342$i$i$i = $shif$4$i$i$i;
         } else {
          break;
         }
        }
        $2567 = (($time$270$i$i$i) + -1)|0;
        $2568 = ($time$270$i$i$i|0)<(2);
        if ($2568) {
         $ip0$6$i$i$i = $ip0$4$i$i$i;$ip1$6$i$i$i = $ip1$4$i$i$i;$ip2$6$i$i$i = $ip2$4$i$i$i;$ip3$6$i$i$i = $ip3$4$i$i$i;$shif$6$i$i$i = $shif$4$i$i$i;$time$4$i$i$i = $2567;
         break L338;
        } else {
         $alpha$5$i$i$i = $alpha$4$i$i$i;$ip0$5$i$i$i = $ip0$4$i$i$i;$ip1$5$i$i$i = $ip1$4$i$i$i;$ip2$5$i$i$i = $ip2$4$i$i$i;$ip3$5$i$i$i = $ip3$4$i$i$i;$psc$5$i$i$i = $psc$4$i$i$i;$shif$5$i$i$i = $shif$4$i$i$i;$time$3$i$i$i = $2567;
        }
       } else {
        $alpha$5$i$i$i = $alpha$269$i$i$i;$ip0$5$i$i$i = $ip0$274$i$i$i;$ip1$5$i$i$i = $ip1$273$i$i$i;$ip2$5$i$i$i = $ip2$272$i$i$i;$ip3$5$i$i$i = $ip3$271$i$i$i;$psc$5$i$i$i = $psc$268$i$i$i;$shif$5$i$i$i = $shif$267$i$i$i;$time$3$i$i$i = $time$270$i$i$i;
       }
       $ptr_ri2i3$4$i$i$i = (($ptr_ri2i3$281$i$i$i) + 32|0);
       $2569 = (($i2$275$i$i$i) + 8)|0;
       $2570 = ($2569|0)<(64);
       if ($2570) {
        $alpha$269$i$i$i = $alpha$5$i$i$i;$i2$275$i$i$i = $2569;$ip0$274$i$i$i = $ip0$5$i$i$i;$ip1$273$i$i$i = $ip1$5$i$i$i;$ip2$272$i$i$i = $ip2$5$i$i$i;$ip3$271$i$i$i = $ip3$5$i$i$i;$psc$268$i$i$i = $psc$5$i$i$i;$ptr_ri0i2$477$i$i$i = $2537;$ptr_ri1i2$379$i$i$i = $2540;$ptr_ri2i2$076$i$i$i = $2534;$ptr_ri2i3$281$i$i$i = $ptr_ri2i3$4$i$i$i;$shif$267$i$i$i = $shif$5$i$i$i;$time$270$i$i$i = $time$3$i$i$i;
       } else {
        break;
       }
      }
      $2571 = (($ptr_ri0i2$477$i$i$i) + -28|0);
      $2572 = (($ptr_ri1i3$2107$i$i$i) + 32|0);
      $2573 = (($i1$2101$i$i$i) + 8)|0;
      $2574 = ($2573|0)<(60);
      if ($2574) {
       $alpha$195$i$i$i = $alpha$5$i$i$i;$i1$2101$i$i$i = $2573;$ip0$1100$i$i$i = $ip0$5$i$i$i;$ip1$199$i$i$i = $ip1$5$i$i$i;$ip2$198$i$i$i = $ip2$5$i$i$i;$ip3$197$i$i$i = $ip3$5$i$i$i;$psc$194$i$i$i = $psc$5$i$i$i;$ptr_ri0i1$3103$i$i$i = $2524;$ptr_ri0i2$3104$i$i$i = $2571;$ptr_ri1i1$0102$i$i$i = $2521;$ptr_ri1i2$2106$i$i$i = $2540;$ptr_ri1i3$2107$i$i$i = $2572;$shif$193$i$i$i = $shif$5$i$i$i;$time$196$i$i$i = $time$3$i$i$i;
      } else {
       break;
      }
     }
     $2575 = (($ptr_ri0i3$2126$i$i$i) + 32|0);
     $2576 = (($i0$1127$i$i$i) + 8)|0;
     $2577 = ($2576|0)<(60);
     if ($2577) {
      $alpha$0117$i$i$i = $alpha$5$i$i$i;$i0$1127$i$i$i = $2576;$ip0$0122$i$i$i = $ip0$5$i$i$i;$ip1$0121$i$i$i = $ip1$5$i$i$i;$ip2$0120$i$i$i = $ip2$5$i$i$i;$ip3$0119$i$i$i = $ip3$5$i$i$i;$psc$0116$i$i$i = $psc$5$i$i$i;$ptr_ri0i0$0123$i$i$i = $2512;$ptr_ri0i1$2124$i$i$i = $2524;$ptr_ri0i2$2125$i$i$i = $2537;$ptr_ri0i3$2126$i$i$i = $2575;$shif$0115$i$i$i = $shif$5$i$i$i;$time$0118$i$i$i = $time$3$i$i$i;
     } else {
      $ip0$6$i$i$i = $ip0$5$i$i$i;$ip1$6$i$i$i = $ip1$5$i$i$i;$ip2$6$i$i$i = $ip2$5$i$i$i;$ip3$6$i$i$i = $ip3$5$i$i$i;$shif$6$i$i$i = $shif$5$i$i$i;$time$4$i$i$i = $time$3$i$i$i;
      break;
     }
    }
    HEAP32[16>>2] = $time$4$i$i$i;
    $2578 = $ip0$6$i$i$i >> 1;
    $2579 = (($FltBuf$i) + ($2578<<2)|0);
    $2580 = HEAP32[$2579>>2]|0;
    $2581 = $ip1$6$i$i$i >> 1;
    $2582 = (($FltBuf$i) + ($2581<<2)|0);
    $2583 = HEAP32[$2582>>2]|0;
    $2584 = $ip2$6$i$i$i >> 1;
    $2585 = (($FltBuf$i) + ($2584<<2)|0);
    $2586 = HEAP32[$2585>>2]|0;
    $2587 = $ip3$6$i$i$i >> 1;
    $2588 = (($FltBuf$i) + ($2587<<2)|0);
    $2589 = HEAP32[$2588>>2]|0;
    _memset(($tmp_code$i$i|0),0,240)|0;
    $2590 = ($shif$6$i$i$i|0)>(0);
    if ($2590) {
     $2591 = (($ip0$6$i$i$i) + 1)|0;
     $2592 = (($ip1$6$i$i$i) + 1)|0;
     $2593 = (($ip2$6$i$i$i) + 1)|0;
     $2594 = (($ip3$6$i$i$i) + 1)|0;
     $ip0$7$i$i$i = $2591;$ip1$7$i$i$i = $2592;$ip2$7$i$i$i = $2593;$ip3$7$i$i$i = $2594;
    } else {
     $ip0$7$i$i$i = $ip0$6$i$i$i;$ip1$7$i$i$i = $ip1$6$i$i$i;$ip2$7$i$i$i = $ip2$6$i$i$i;$ip3$7$i$i$i = $ip3$6$i$i$i;
    }
    $2595 = (+($2580|0));
    $2596 = (($tmp_code$i$i) + ($ip0$7$i$i$i<<2)|0);
    HEAPF32[$2596>>2] = $2595;
    $2597 = (+($2583|0));
    $2598 = (($tmp_code$i$i) + ($ip1$7$i$i$i<<2)|0);
    HEAPF32[$2598>>2] = $2597;
    $2599 = ($ip2$7$i$i$i|0)<(60);
    if ($2599) {
     $2600 = (+($2586|0));
     $2601 = (($tmp_code$i$i) + ($ip2$7$i$i$i<<2)|0);
     HEAPF32[$2601>>2] = $2600;
    }
    $2602 = ($ip3$7$i$i$i|0)<(60);
    if ($2602) {
     $2603 = (+($2589|0));
     $2604 = (($tmp_code$i$i) + ($ip3$7$i$i$i<<2)|0);
     HEAPF32[$2604>>2] = $2603;
    }
    _memset(($rr$i$i|0),0,240)|0;
    $2605 = ($2580|0)>(0);
    $2606 = ($ip0$7$i$i$i|0)<(60);
    if ($2605) {
     if ($2606) {
      $2608 = (60 - ($ip0$7$i$i$i))|0;
      $i$831$i$i$i = $ip0$7$i$i$i;$j$030$i$i$i = 0;
      while(1) {
       $2609 = (($rr$i$i) + ($i$831$i$i$i<<2)|0);
       $2610 = +HEAPF32[$2609>>2];
       $2611 = (($ImpResp) + ($j$030$i$i$i<<2)|0);
       $2612 = +HEAPF32[$2611>>2];
       $2613 = $2610 + $2612;
       HEAPF32[$2609>>2] = $2613;
       $2614 = (($i$831$i$i$i) + 1)|0;
       $2615 = (($j$030$i$i$i) + 1)|0;
       $exitcond171$i$i$i = ($2615|0)==($2608|0);
       if ($exitcond171$i$i$i) {
        break;
       } else {
        $i$831$i$i$i = $2614;$j$030$i$i$i = $2615;
       }
      }
     }
    } else {
     if ($2606) {
      $2607 = (60 - ($ip0$7$i$i$i))|0;
      $i$936$i$i$i = $ip0$7$i$i$i;$j$135$i$i$i = 0;
      while(1) {
       $2616 = (($rr$i$i) + ($i$936$i$i$i<<2)|0);
       $2617 = +HEAPF32[$2616>>2];
       $2618 = (($ImpResp) + ($j$135$i$i$i<<2)|0);
       $2619 = +HEAPF32[$2618>>2];
       $2620 = $2617 - $2619;
       HEAPF32[$2616>>2] = $2620;
       $2621 = (($i$936$i$i$i) + 1)|0;
       $2622 = (($j$135$i$i$i) + 1)|0;
       $exitcond172$i$i$i = ($2622|0)==($2607|0);
       if ($exitcond172$i$i$i) {
        break;
       } else {
        $i$936$i$i$i = $2621;$j$135$i$i$i = $2622;
       }
      }
     }
    }
    $2623 = ($2583|0)>(0);
    $2624 = ($ip1$7$i$i$i|0)<(60);
    if ($2623) {
     if ($2624) {
      $2626 = (60 - ($ip1$7$i$i$i))|0;
      $i$1021$i$i$i = $ip1$7$i$i$i;$j$220$i$i$i = 0;
      while(1) {
       $2627 = (($rr$i$i) + ($i$1021$i$i$i<<2)|0);
       $2628 = +HEAPF32[$2627>>2];
       $2629 = (($ImpResp) + ($j$220$i$i$i<<2)|0);
       $2630 = +HEAPF32[$2629>>2];
       $2631 = $2628 + $2630;
       HEAPF32[$2627>>2] = $2631;
       $2632 = (($i$1021$i$i$i) + 1)|0;
       $2633 = (($j$220$i$i$i) + 1)|0;
       $exitcond169$i$i$i = ($2633|0)==($2626|0);
       if ($exitcond169$i$i$i) {
        break;
       } else {
        $i$1021$i$i$i = $2632;$j$220$i$i$i = $2633;
       }
      }
     }
    } else {
     if ($2624) {
      $2625 = (60 - ($ip1$7$i$i$i))|0;
      $i$1126$i$i$i = $ip1$7$i$i$i;$j$325$i$i$i = 0;
      while(1) {
       $2634 = (($rr$i$i) + ($i$1126$i$i$i<<2)|0);
       $2635 = +HEAPF32[$2634>>2];
       $2636 = (($ImpResp) + ($j$325$i$i$i<<2)|0);
       $2637 = +HEAPF32[$2636>>2];
       $2638 = $2635 - $2637;
       HEAPF32[$2634>>2] = $2638;
       $2639 = (($i$1126$i$i$i) + 1)|0;
       $2640 = (($j$325$i$i$i) + 1)|0;
       $exitcond170$i$i$i = ($2640|0)==($2625|0);
       if ($exitcond170$i$i$i) {
        break;
       } else {
        $i$1126$i$i$i = $2639;$j$325$i$i$i = $2640;
       }
      }
     }
    }
    if ($2599) {
     $2641 = ($2586|0)>(0);
     $2642 = (60 - ($ip2$7$i$i$i))|0;
     if ($2641) {
      $i$1211$i$i$i = $ip2$7$i$i$i;$j$410$i$i$i = 0;
      while(1) {
       $2643 = (($rr$i$i) + ($i$1211$i$i$i<<2)|0);
       $2644 = +HEAPF32[$2643>>2];
       $2645 = (($ImpResp) + ($j$410$i$i$i<<2)|0);
       $2646 = +HEAPF32[$2645>>2];
       $2647 = $2644 + $2646;
       HEAPF32[$2643>>2] = $2647;
       $2648 = (($i$1211$i$i$i) + 1)|0;
       $2649 = (($j$410$i$i$i) + 1)|0;
       $exitcond167$i$i$i = ($2649|0)==($2642|0);
       if ($exitcond167$i$i$i) {
        break;
       } else {
        $i$1211$i$i$i = $2648;$j$410$i$i$i = $2649;
       }
      }
     } else {
      $i$1316$i$i$i = $ip2$7$i$i$i;$j$515$i$i$i = 0;
      while(1) {
       $2650 = (($rr$i$i) + ($i$1316$i$i$i<<2)|0);
       $2651 = +HEAPF32[$2650>>2];
       $2652 = (($ImpResp) + ($j$515$i$i$i<<2)|0);
       $2653 = +HEAPF32[$2652>>2];
       $2654 = $2651 - $2653;
       HEAPF32[$2650>>2] = $2654;
       $2655 = (($i$1316$i$i$i) + 1)|0;
       $2656 = (($j$515$i$i$i) + 1)|0;
       $exitcond168$i$i$i = ($2656|0)==($2642|0);
       if ($exitcond168$i$i$i) {
        break;
       } else {
        $i$1316$i$i$i = $2655;$j$515$i$i$i = $2656;
       }
      }
     }
    }
    if ($2602) {
     $2657 = ($2589|0)>(0);
     $2658 = (60 - ($ip3$7$i$i$i))|0;
     if ($2657) {
      $i$142$i$i$i = $ip3$7$i$i$i;$j$61$i$i$i = 0;
      while(1) {
       $2659 = (($rr$i$i) + ($i$142$i$i$i<<2)|0);
       $2660 = +HEAPF32[$2659>>2];
       $2661 = (($ImpResp) + ($j$61$i$i$i<<2)|0);
       $2662 = +HEAPF32[$2661>>2];
       $2663 = $2660 + $2662;
       HEAPF32[$2659>>2] = $2663;
       $2664 = (($i$142$i$i$i) + 1)|0;
       $2665 = (($j$61$i$i$i) + 1)|0;
       $exitcond$i6$i$i = ($2665|0)==($2658|0);
       if ($exitcond$i6$i$i) {
        break;
       } else {
        $i$142$i$i$i = $2664;$j$61$i$i$i = $2665;
       }
      }
     } else {
      $i$156$i$i$i = $ip3$7$i$i$i;$j$75$i$i$i = 0;
      while(1) {
       $2666 = (($rr$i$i) + ($i$156$i$i$i<<2)|0);
       $2667 = +HEAPF32[$2666>>2];
       $2668 = (($ImpResp) + ($j$75$i$i$i<<2)|0);
       $2669 = +HEAPF32[$2668>>2];
       $2670 = $2667 - $2669;
       HEAPF32[$2666>>2] = $2670;
       $2671 = (($i$156$i$i$i) + 1)|0;
       $2672 = (($j$75$i$i$i) + 1)|0;
       $exitcond166$i$i$i = ($2672|0)==($2658|0);
       if ($exitcond166$i$i$i) {
        break;
       } else {
        $i$156$i$i$i = $2671;$j$75$i$i$i = $2672;
       }
      }
     }
    }
    HEAP32[$1890>>2] = $shif$6$i$i$i;
    $$$i$i$i = $2605&1;
    $2673 = $$$i$i$i | 2;
    $$$$i$i$i = $2623 ? $2673 : $$$i$i$i;
    $2674 = ($2586|0)>(0);
    $2675 = $$$$i$i$i | 4;
    $$$$$i$i$i = $2674 ? $2675 : $$$$i$i$i;
    $$$$$i$i$i280 = $2674 ? $2675 : $$$$i$i$i;
    $2676 = ($2589|0)>(0);
    $2677 = (($$$$$i$i$i280) + 8)|0;
    $storemerge272 = $2676 ? $2677 : $$$$$i$i$i;
    HEAP32[$1891>>2] = $storemerge272;
    $2678 = $ip3$7$i$i$i >>> 3;
    $2679 = $2678 << 9;
    $2680 = $ip2$7$i$i$i >>> 3;
    $2681 = $2680 << 6;
    $2682 = (($2681) + ($2679))|0;
    $2683 = $ip1$7$i$i$i & -8;
    $2684 = (($2682) + ($2683))|0;
    $2685 = $ip0$7$i$i$i >> 3;
    $2686 = (($2684) + ($2685))|0;
    $i$01$i$i$i$i = 0;$sum$02$i$i$i$i = 0.0;
    while(1) {
     $2687 = (($Dpnt$13) + ($i$01$i$i$i$i<<2)|0);
     $2688 = +HEAPF32[$2687>>2];
     $2689 = (($rr$i$i) + ($i$01$i$i$i$i<<2)|0);
     $2690 = +HEAPF32[$2689>>2];
     $2691 = $2688 * $2690;
     $2692 = (($i$01$i$i$i$i) + 1)|0;
     $2693 = (($Dpnt$13) + ($2692<<2)|0);
     $2694 = +HEAPF32[$2693>>2];
     $2695 = (($rr$i$i) + ($2692<<2)|0);
     $2696 = +HEAPF32[$2695>>2];
     $2697 = $2694 * $2696;
     $2698 = $2691 + $2697;
     $2699 = (($i$01$i$i$i$i) + 2)|0;
     $2700 = (($Dpnt$13) + ($2699<<2)|0);
     $2701 = +HEAPF32[$2700>>2];
     $2702 = (($rr$i$i) + ($2699<<2)|0);
     $2703 = +HEAPF32[$2702>>2];
     $2704 = $2701 * $2703;
     $2705 = $2698 + $2704;
     $2706 = $sum$02$i$i$i$i + $2705;
     $2707 = (($i$01$i$i$i$i) + 3)|0;
     $2708 = ($2707|0)<(60);
     if ($2708) {
      $i$01$i$i$i$i = $2707;$sum$02$i$i$i$i = $2706;
     } else {
      break;
     }
    }
    $2709 = !($2706 <= 0.0);
    if ($2709) {
     $i$01$i2$i$i$i = 0;$sum$02$i1$i$i$i = 0.0;
     while(1) {
      $2710 = (($rr$i$i) + ($i$01$i2$i$i$i<<2)|0);
      $2711 = +HEAPF32[$2710>>2];
      $2712 = $2711 * $2711;
      $2713 = (($i$01$i2$i$i$i) + 1)|0;
      $2714 = (($rr$i$i) + ($2713<<2)|0);
      $2715 = +HEAPF32[$2714>>2];
      $2716 = $2715 * $2715;
      $2717 = $2712 + $2716;
      $2718 = (($i$01$i2$i$i$i) + 2)|0;
      $2719 = (($rr$i$i) + ($2718<<2)|0);
      $2720 = +HEAPF32[$2719>>2];
      $2721 = $2720 * $2720;
      $2722 = $2717 + $2721;
      $2723 = $sum$02$i1$i$i$i + $2722;
      $2724 = (($i$01$i2$i$i$i) + 3)|0;
      $2725 = ($2724|0)<(60);
      if ($2725) {
       $i$01$i2$i$i$i = $2724;$sum$02$i1$i$i$i = $2723;
      } else {
       break;
      }
     }
     $2726 = $2723 > 1.1754943508222875E-38;
     if ($2726) {
      $2727 = $2706 / $2723;
      $gain_nq$0$i$i$i = $2727;
     } else {
      $gain_nq$0$i$i$i = 0.0;
     }
     $2728 = $gain_nq$0$i$i$i + -2.0;
     $fabsf$i$i$i = (+Math_abs((+$2728)));
     $dist_min$04$i$i$i = $fabsf$i$i$i;$gain$03$i$i$i = 0;$i$02$i$i$i = 1;
     while(1) {
      $2729 = (13280 + ($i$02$i$i$i<<2)|0);
      $2730 = +HEAPF32[$2729>>2];
      $2731 = $gain_nq$0$i$i$i - $2730;
      $fabsf1$i$i$i = (+Math_abs((+$2731)));
      $2732 = $fabsf1$i$i$i < $dist_min$04$i$i$i;
      $gain$1$i$i$i = $2732 ? $i$02$i$i$i : $gain$03$i$i$i;
      $dist_min$1$i$i$i = $2732 ? $fabsf1$i$i$i : $dist_min$04$i$i$i;
      $2733 = (($i$02$i$i$i) + 1)|0;
      $exitcond$i1$i$i = ($2733|0)==(24);
      if ($exitcond$i1$i$i) {
       break;
      } else {
       $dist_min$04$i$i$i = $dist_min$1$i$i$i;$gain$03$i$i$i = $gain$1$i$i$i;$i$02$i$i$i = $2733;
      }
     }
     $2734 = (13280 + ($gain$1$i$i$i<<2)|0);
     $$0$i$i$i = $gain$1$i$i$i;$storemerge$in$i$i$i = $2734;
    } else {
     $$0$i$i$i = 0;$storemerge$in$i$i$i = 13280;
    }
    $storemerge$i$i$i = +HEAPF32[$storemerge$in$i$i$i>>2];
    HEAP32[$1889>>2] = $$0$i$i$i;
    $i$12$i$i = 0;
    while(1) {
     $2735 = (($tmp_code$i$i) + ($i$12$i$i<<2)|0);
     $2736 = +HEAPF32[$2735>>2];
     $2737 = $2736 * $storemerge$i$i$i;
     $2738 = (($Dpnt$13) + ($i$12$i$i<<2)|0);
     HEAPF32[$2738>>2] = $2737;
     $2739 = (($i$12$i$i) + 1)|0;
     $exitcond7$i$i = ($2739|0)==(60);
     if ($exitcond7$i$i) {
      break;
     } else {
      $i$12$i$i = $2739;
     }
    }
    if ($1892) {
     $i$21$i$i = $1886;
     while(1) {
      $2740 = (($i$21$i$i) - ($1886))|0;
      $2741 = (($Dpnt$13) + ($2740<<2)|0);
      $2742 = +HEAPF32[$2741>>2];
      $2743 = $2742 * $1888;
      $2744 = (($Dpnt$13) + ($i$21$i$i<<2)|0);
      $2745 = +HEAPF32[$2744>>2];
      $2746 = $2745 + $2743;
      HEAPF32[$2744>>2] = $2746;
      $2747 = (($i$21$i$i) + 1)|0;
      $exitcond$i$i23 = ($2747|0)==(60);
      if ($exitcond$i$i23) {
       break;
      } else {
       $i$21$i$i = $2747;
      }
     }
    }
    $2748 = ((($Line) + (($i$124*28)|0)|0) + 40|0);
    HEAP32[$2748>>2] = $2686;
    $2749 = ((($Line) + (($i$124*28)|0)|0) + 32|0);
    HEAP32[$2749>>2] = 0;
   }
   $2750 = HEAP32[$1280>>2]|0;
   $2751 = HEAP32[$1485>>2]|0;
   $2752 = HEAP32[$1486>>2]|0;
   _Decod_Acbk($ImpResp,((37008 + 1208|0)),36992,$2750,$2751,$2752);
   $j$31 = 60;
   while(1) {
    $2753 = ((37008 + ($j$31<<2)|0) + 1208|0);
    $2754 = +HEAPF32[$2753>>2];
    $2755 = (($j$31) + -60)|0;
    $2756 = ((37008 + ($2755<<2)|0) + 1208|0);
    HEAPF32[$2756>>2] = $2754;
    $2757 = (($j$31) + 1)|0;
    $exitcond = ($2757|0)==(145);
    if ($exitcond) {
     $j$42 = 0;
     break;
    } else {
     $j$31 = $2757;
    }
   }
   while(1) {
    $2758 = (($Dpnt$13) + ($j$42<<2)|0);
    $2759 = +HEAPF32[$2758>>2];
    $2760 = (($ImpResp) + ($j$42<<2)|0);
    $2761 = +HEAPF32[$2760>>2];
    $2762 = $2759 + $2761;
    HEAPF32[$2758>>2] = $2762;
    $2763 = (($j$42) + 85)|0;
    $2764 = ((37008 + ($2763<<2)|0) + 1208|0);
    HEAPF32[$2764>>2] = $2762;
    $2765 = $2762 < -32767.5;
    if ($2765) {
     HEAPF32[$2764>>2] = -32768.0;
    } else {
     $2766 = $2762 > 32766.5;
     if ($2766) {
      HEAPF32[$2764>>2] = 32767.0;
     }
    }
    $2767 = (($j$42) + 1)|0;
    $exitcond32 = ($2767|0)==(60);
    if ($exitcond32) {
     break;
    } else {
     $j$42 = $2767;
    }
   }
   $2768 = HEAP32[$1280>>2]|0;
   $2769 = HEAP32[$1485>>2]|0;
   $2770 = HEAP32[$1486>>2]|0;
   _Update_Err($2768,$2769,$2770);
   _Upd_Ring($Dpnt$13,$1004,$1006);
   $2771 = (($Dpnt$13) + 240|0);
   $2772 = (($i$124) + 1)|0;
   $exitcond33 = ($2772|0)==(4);
   if ($exitcond33) {
    break;
   } else {
    $Dpnt$13 = $2771;$i$124 = $2772;
   }
  }
  HEAP16[((39528 + 4|0))>>1] = 1;
  HEAP16[((39528 + 328|0))>>1] = 12345;
  $Ftyp$2 = 1;
 } else {
  $scevgep55 = (($DataBuff) + 380|0);
  _memcpy((((37008 + 48|0))|0),($scevgep55|0),580)|0;
  $517 = +HEAPF32[((39528 + 312|0))>>2];
  HEAPF32[((39528 + 316|0))>>2] = $517;
  $518 = +HEAPF32[((39528 + 308|0))>>2];
  HEAPF32[((39528 + 312|0))>>2] = $518;
  $519 = +HEAPF32[((39528 + 8|0))>>2];
  $520 = (+_Durbin($Bound$i,((39528 + 12|0)),$519,$temp$i));
  HEAPF32[((39528 + 308|0))>>2] = $520;
  $521 = HEAP16[((39528 + 4|0))>>1]|0;
  $522 = ($521<<16>>16)==(1);
  if ($522) {
   HEAP16[((39528 + 320|0))>>1] = 1;
   $542 = (_Qua_SidGain(((39528 + 308|0)),1)|0);
   $curQGain$01$i = $542;
   label = 74;
  } else {
   $523 = HEAP32[((39528 + 320|0))>>2]|0;
   $524 = $523&65535;
   $525 = (($524) + 1)<<16>>16;
   $526 = ($525<<16>>16)>(3);
   $$$i25 = $526 ? 3 : $525;
   HEAP16[((39528 + 320|0))>>1] = $$$i25;
   $527 = (_Qua_SidGain(((39528 + 308|0)),$$$i25)|0);
   $i$01$i$i$i26 = 0;$sum$02$i$i$i = 0.0;
   while(1) {
    $528 = ((39528 + ($i$01$i$i$i26<<2)|0) + 264|0);
    $529 = +HEAPF32[$528>>2];
    $530 = ((39528 + ($i$01$i$i$i26<<2)|0) + 8|0);
    $531 = +HEAPF32[$530>>2];
    $532 = $529 * $531;
    $533 = $sum$02$i$i$i + $532;
    $534 = (($i$01$i$i$i26) + 1)|0;
    $exitcond$i$i$i27 = ($534|0)==(11);
    if ($exitcond$i$i$i27) {
     break;
    } else {
     $i$01$i$i$i26 = $534;$sum$02$i$i$i = $533;
    }
   }
   $535 = $520 * 1.2136000394821167;
   $536 = $533 < $535;
   if ($536) {
    $537 = $527 << 16 >> 16;
    $538 = $523 >> 16;
    $539 = (($537) - ($538))|0;
    $ispos$i29 = ($539|0)>(-1);
    $neg$i30 = (0 - ($539))|0;
    $540 = $ispos$i29 ? $539 : $neg$i30;
    $541 = ($540|0)>(3);
    if ($541) {
     $curQGain$01$i = $527;
     label = 74;
    } else {
     $756 = $521;$Ftyp$1 = 0;
    }
   } else {
    $curQGain$01$i = $527;
    label = 74;
   }
  }
  if ((label|0) == 74) {
   ;HEAP32[$FltBuf$i+0>>2]=0|0;HEAP32[$FltBuf$i+4>>2]=0|0;HEAP32[$FltBuf$i+8>>2]=0|0;HEAP32[$FltBuf$i+12>>2]=0|0;HEAP32[$FltBuf$i+16>>2]=0|0;HEAP32[$FltBuf$i+20>>2]=0|0;HEAP32[$FltBuf$i+24>>2]=0|0;HEAP32[$FltBuf$i+28>>2]=0|0;
   $543 = +HEAPF32[((39528 + 52|0))>>2];
   $544 = $543 + 0.0;
   $545 = +HEAPF32[((39528 + 56|0))>>2];
   $546 = (($FltBuf$i) + 4|0);
   $547 = $545 + 0.0;
   $548 = +HEAPF32[((39528 + 60|0))>>2];
   $549 = (($FltBuf$i) + 8|0);
   $550 = $548 + 0.0;
   $551 = +HEAPF32[((39528 + 64|0))>>2];
   $552 = (($FltBuf$i) + 12|0);
   $553 = $551 + 0.0;
   $554 = +HEAPF32[((39528 + 68|0))>>2];
   $555 = (($FltBuf$i) + 16|0);
   $556 = $554 + 0.0;
   $557 = +HEAPF32[((39528 + 72|0))>>2];
   $558 = (($FltBuf$i) + 20|0);
   $559 = $557 + 0.0;
   $560 = +HEAPF32[((39528 + 76|0))>>2];
   $561 = (($FltBuf$i) + 24|0);
   $562 = $560 + 0.0;
   $563 = +HEAPF32[((39528 + 80|0))>>2];
   $564 = (($FltBuf$i) + 28|0);
   $565 = $563 + 0.0;
   $566 = +HEAPF32[((39528 + 84|0))>>2];
   $567 = (($FltBuf$i) + 32|0);
   $568 = $566 + 0.0;
   $569 = +HEAPF32[((39528 + 88|0))>>2];
   $570 = (($FltBuf$i) + 36|0);
   $571 = $569 + 0.0;
   $572 = +HEAPF32[((39528 + 92|0))>>2];
   $573 = (($FltBuf$i) + 40|0);
   $574 = $572 + 0.0;
   $575 = +HEAPF32[((39528 + 96|0))>>2];
   $576 = $575 + $544;
   $577 = +HEAPF32[((39528 + 100|0))>>2];
   $578 = $577 + $547;
   $579 = +HEAPF32[((39528 + 104|0))>>2];
   $580 = $579 + $550;
   $581 = +HEAPF32[((39528 + 108|0))>>2];
   $582 = $581 + $553;
   $583 = +HEAPF32[((39528 + 112|0))>>2];
   $584 = $583 + $556;
   $585 = +HEAPF32[((39528 + 116|0))>>2];
   $586 = $585 + $559;
   $587 = +HEAPF32[((39528 + 120|0))>>2];
   $588 = $587 + $562;
   $589 = +HEAPF32[((39528 + 124|0))>>2];
   $590 = $589 + $565;
   $591 = +HEAPF32[((39528 + 128|0))>>2];
   $592 = $591 + $568;
   $593 = +HEAPF32[((39528 + 132|0))>>2];
   $594 = $593 + $571;
   $595 = +HEAPF32[((39528 + 136|0))>>2];
   $596 = $595 + $574;
   $597 = +HEAPF32[((39528 + 140|0))>>2];
   $598 = $597 + $576;
   HEAPF32[$FltBuf$i>>2] = $598;
   $599 = +HEAPF32[((39528 + 144|0))>>2];
   $600 = $599 + $578;
   HEAPF32[$546>>2] = $600;
   $601 = +HEAPF32[((39528 + 148|0))>>2];
   $602 = $601 + $580;
   HEAPF32[$549>>2] = $602;
   $603 = +HEAPF32[((39528 + 152|0))>>2];
   $604 = $603 + $582;
   HEAPF32[$552>>2] = $604;
   $605 = +HEAPF32[((39528 + 156|0))>>2];
   $606 = $605 + $584;
   HEAPF32[$555>>2] = $606;
   $607 = +HEAPF32[((39528 + 160|0))>>2];
   $608 = $607 + $586;
   HEAPF32[$558>>2] = $608;
   $609 = +HEAPF32[((39528 + 164|0))>>2];
   $610 = $609 + $588;
   HEAPF32[$561>>2] = $610;
   $611 = +HEAPF32[((39528 + 168|0))>>2];
   $612 = $611 + $590;
   HEAPF32[$564>>2] = $612;
   $613 = +HEAPF32[((39528 + 172|0))>>2];
   $614 = $613 + $592;
   HEAPF32[$567>>2] = $614;
   $615 = +HEAPF32[((39528 + 176|0))>>2];
   $616 = $615 + $594;
   HEAPF32[$570>>2] = $616;
   $617 = +HEAPF32[((39528 + 180|0))>>2];
   $618 = $617 + $596;
   HEAPF32[$573>>2] = $618;
   (+_Durbin(((39528 + 224|0)),$546,$598,$CorVct$i));
   $619 = HEAP16[((39464 + 12|0))>>1]|0;
   $620 = ($619<<16>>16)==(0);
   $621 = +HEAPF32[((39528 + 224|0))>>2];
   if ($620) {
    HEAPF32[((39464 + 24|0))>>2] = $621;
    $622 = +HEAPF32[((39528 + 228|0))>>2];
    HEAPF32[((39464 + 28|0))>>2] = $622;
    $623 = +HEAPF32[((39528 + 232|0))>>2];
    HEAPF32[((39464 + 32|0))>>2] = $623;
    $624 = +HEAPF32[((39528 + 236|0))>>2];
    HEAPF32[((39464 + 36|0))>>2] = $624;
    $625 = +HEAPF32[((39528 + 240|0))>>2];
    HEAPF32[((39464 + 40|0))>>2] = $625;
    $626 = +HEAPF32[((39528 + 244|0))>>2];
    HEAPF32[((39464 + 44|0))>>2] = $626;
    $627 = +HEAPF32[((39528 + 248|0))>>2];
    HEAPF32[((39464 + 48|0))>>2] = $627;
    $628 = +HEAPF32[((39528 + 252|0))>>2];
    HEAPF32[((39464 + 52|0))>>2] = $628;
    $629 = +HEAPF32[((39528 + 256|0))>>2];
    HEAPF32[((39464 + 56|0))>>2] = $629;
    $630 = +HEAPF32[((39528 + 260|0))>>2];
    HEAPF32[((39464 + 60|0))>>2] = $630;
    $632 = $621;$634 = $622;$637 = $623;$640 = $624;$643 = $625;$646 = $626;$649 = $627;$652 = $628;$655 = $629;$658 = $630;
   } else {
    $$pre239 = +HEAPF32[((39528 + 228|0))>>2];
    $$pre240 = +HEAPF32[((39528 + 232|0))>>2];
    $$pre241 = +HEAPF32[((39528 + 236|0))>>2];
    $$pre242 = +HEAPF32[((39528 + 240|0))>>2];
    $$pre243 = +HEAPF32[((39528 + 244|0))>>2];
    $$pre244 = +HEAPF32[((39528 + 248|0))>>2];
    $$pre245 = +HEAPF32[((39528 + 252|0))>>2];
    $$pre246 = +HEAPF32[((39528 + 256|0))>>2];
    $$pre247 = +HEAPF32[((39528 + 260|0))>>2];
    $632 = $621;$634 = $$pre239;$637 = $$pre240;$640 = $$pre241;$643 = $$pre242;$646 = $$pre243;$649 = $$pre244;$652 = $$pre245;$655 = $$pre246;$658 = $$pre247;
   }
   $631 = $632 * $632;
   $633 = $634 * $634;
   $635 = $631 + $633;
   $636 = $637 * $637;
   $638 = $635 + $636;
   $639 = $640 * $640;
   $641 = $638 + $639;
   $642 = $643 * $643;
   $644 = $641 + $642;
   $645 = $646 * $646;
   $647 = $644 + $645;
   $648 = $649 * $649;
   $650 = $647 + $648;
   $651 = $652 * $652;
   $653 = $650 + $651;
   $654 = $655 * $655;
   $656 = $653 + $654;
   $657 = $658 * $658;
   $659 = $656 + $657;
   $660 = $659 + 1.0;
   HEAPF32[((39528 + 264|0))>>2] = $660;
   $662 = $632;$i$03$i$i33 = 1;$indvars$iv$i$i = 9;
   while(1) {
    $661 = -$662;
    $663 = (10 - ($i$03$i$i33))|0;
    $664 = ($663|0)>(0);
    if ($664) {
     $j$01$i$i = 0;$temp$02$i$i = $661;
     while(1) {
      $665 = ((39528 + ($j$01$i$i<<2)|0) + 224|0);
      $666 = +HEAPF32[$665>>2];
      $667 = (($j$01$i$i) + ($i$03$i$i33))|0;
      $668 = ((39528 + ($667<<2)|0) + 224|0);
      $669 = +HEAPF32[$668>>2];
      $670 = $666 * $669;
      $671 = $temp$02$i$i + $670;
      $672 = (($j$01$i$i) + 1)|0;
      $exitcond$i$i34 = ($672|0)==($indvars$iv$i$i|0);
      if ($exitcond$i$i34) {
       $temp$0$lcssa$i$i = $671;
       break;
      } else {
       $j$01$i$i = $672;$temp$02$i$i = $671;
      }
     }
    } else {
     $temp$0$lcssa$i$i = $661;
    }
    $673 = $temp$0$lcssa$i$i * 2.0;
    $674 = ((39528 + ($i$03$i$i33<<2)|0) + 264|0);
    HEAPF32[$674>>2] = $673;
    $675 = (($i$03$i$i33) + 1)|0;
    $exitcond4$i$i = ($675|0)==(11);
    if ($exitcond4$i$i) {
     break;
    }
    $indvars$iv$next$i$i = (($indvars$iv$i$i) + -1)|0;
    $$phi$trans$insert248 = ((39528 + ($i$03$i$i33<<2)|0) + 224|0);
    $$pre249 = +HEAPF32[$$phi$trans$insert248>>2];
    $662 = $$pre249;$i$03$i$i33 = $675;$indvars$iv$i$i = $indvars$iv$next$i$i;
   }
   $676 = +HEAPF32[((39528 + 308|0))>>2];
   $i$01$i$i2$i = 0;$sum$02$i$i1$i = 0.0;
   while(1) {
    $677 = ((39528 + ($i$01$i$i2$i<<2)|0) + 264|0);
    $678 = +HEAPF32[$677>>2];
    $679 = ((39528 + ($i$01$i$i2$i<<2)|0) + 8|0);
    $680 = +HEAPF32[$679>>2];
    $681 = $678 * $680;
    $682 = $sum$02$i$i1$i + $681;
    $683 = (($i$01$i$i2$i) + 1)|0;
    $exitcond$i$i3$i = ($683|0)==(11);
    if ($exitcond$i$i3$i) {
     break;
    } else {
     $i$01$i$i2$i = $683;$sum$02$i$i1$i = $682;
    }
   }
   $684 = $676 * 1.2136000394821167;
   $685 = $682 < $684;
   L124: do {
    if (!($685)) {
     dest=((39528 + 224|0))+0|0; src=$Bound$i+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $686 = +HEAPF32[$Bound$i>>2];
     $687 = $686 * $686;
     $688 = (($Bound$i) + 4|0);
     $689 = +HEAPF32[$688>>2];
     $690 = $689 * $689;
     $691 = $687 + $690;
     $692 = (($Bound$i) + 8|0);
     $693 = +HEAPF32[$692>>2];
     $694 = $693 * $693;
     $695 = $691 + $694;
     $696 = (($Bound$i) + 12|0);
     $697 = +HEAPF32[$696>>2];
     $698 = $697 * $697;
     $699 = $695 + $698;
     $700 = (($Bound$i) + 16|0);
     $701 = +HEAPF32[$700>>2];
     $702 = $701 * $701;
     $703 = $699 + $702;
     $704 = (($Bound$i) + 20|0);
     $705 = +HEAPF32[$704>>2];
     $706 = $705 * $705;
     $707 = $703 + $706;
     $708 = (($Bound$i) + 24|0);
     $709 = +HEAPF32[$708>>2];
     $710 = $709 * $709;
     $711 = $707 + $710;
     $712 = (($Bound$i) + 28|0);
     $713 = +HEAPF32[$712>>2];
     $714 = $713 * $713;
     $715 = $711 + $714;
     $716 = (($Bound$i) + 32|0);
     $717 = +HEAPF32[$716>>2];
     $718 = $717 * $717;
     $719 = $715 + $718;
     $720 = (($Bound$i) + 36|0);
     $721 = +HEAPF32[$720>>2];
     $722 = $721 * $721;
     $723 = $719 + $722;
     $724 = $723 + 1.0;
     HEAPF32[((39528 + 264|0))>>2] = $724;
     $726 = $686;$i$03$i8$i = 1;$indvars$iv$i7$i = 9;
     while(1) {
      $725 = -$726;
      $727 = (10 - ($i$03$i8$i))|0;
      $728 = ($727|0)>(0);
      if ($728) {
       $j$01$i10$i = 0;$temp$02$i9$i = $725;
       while(1) {
        $729 = (($Bound$i) + ($j$01$i10$i<<2)|0);
        $730 = +HEAPF32[$729>>2];
        $731 = (($j$01$i10$i) + ($i$03$i8$i))|0;
        $732 = (($Bound$i) + ($731<<2)|0);
        $733 = +HEAPF32[$732>>2];
        $734 = $730 * $733;
        $735 = $temp$02$i9$i + $734;
        $736 = (($j$01$i10$i) + 1)|0;
        $exitcond$i11$i37 = ($736|0)==($indvars$iv$i7$i|0);
        if ($exitcond$i11$i37) {
         $temp$0$lcssa$i13$i = $735;
         break;
        } else {
         $j$01$i10$i = $736;$temp$02$i9$i = $735;
        }
       }
      } else {
       $temp$0$lcssa$i13$i = $725;
      }
      $737 = $temp$0$lcssa$i13$i * 2.0;
      $738 = ((39528 + ($i$03$i8$i<<2)|0) + 264|0);
      HEAPF32[$738>>2] = $737;
      $739 = (($i$03$i8$i) + 1)|0;
      $exitcond4$i15$i = ($739|0)==(11);
      if ($exitcond4$i15$i) {
       break L124;
      }
      $indvars$iv$next$i14$i = (($indvars$iv$i7$i) + -1)|0;
      $$phi$trans$insert250 = (($Bound$i) + ($i$03$i8$i<<2)|0);
      $$pre251 = +HEAPF32[$$phi$trans$insert250>>2];
      $726 = $$pre251;$i$03$i8$i = $739;$indvars$iv$i7$i = $indvars$iv$next$i14$i;
     }
    }
   } while(0);
   _AtoLsp(((39528 + 184|0)),((39528 + 224|0)));
   $740 = (_Lsp_Qnt(((39528 + 184|0)))|0);
   HEAP32[$359>>2] = $740;
   _Lsp_Inq(((39528 + 184|0)),((37008 + 8|0)),$740,0);
   $741 = $curQGain$01$i << 16 >> 16;
   $742 = (($Line) + 24|0);
   HEAP32[$742>>2] = $741;
   HEAP16[((39528 + 322|0))>>1] = $curQGain$01$i;
   $743 = $741 >>> 4;
   $sext$mask$i$i = $743 & 65535;
   $744 = ($sext$mask$i$i|0)==(3);
   $sext$i$i = $743 << 16;
   $745 = $sext$i$i >> 16;
   $746 = $744 ? 2 : $745;
   $747 = $746 << 4;
   $748 = (($741) - ($747))|0;
   $749 = (36928 + ($746<<2)|0);
   $750 = +HEAPF32[$749>>2];
   $sext1$i$i = $748 << 16;
   $751 = $sext1$i$i >> 16;
   $752 = (($746) + 1)|0;
   $753 = $751 << $752;
   $754 = (+($753|0));
   $755 = $754 + $750;
   HEAPF32[((39528 + 324|0))>>2] = $755;
   $$pre252 = HEAP16[((39528 + 4|0))>>1]|0;
   $756 = $$pre252;$Ftyp$1 = 2;
  }
  $757 = ($756<<16>>16)==(1);
  if ($757) {
   $758 = +HEAPF32[((39528 + 324|0))>>2];
   $storemerge$i39 = $758;
  } else {
   $759 = +HEAPF32[39528>>2];
   $760 = $759 * 0.875;
   $761 = +HEAPF32[((39528 + 324|0))>>2];
   $762 = $761 * 0.125;
   $763 = $760 + $762;
   $storemerge$i39 = $763;
  }
  HEAPF32[39528>>2] = $storemerge$i39;
  _Calc_Exc_Rand($storemerge$i39,((37008 + 1208|0)),$DataBuff,((39528 + 328|0)),$Line,36992);
  _Lsp_Int($QntLpc,((39528 + 184|0)),((37008 + 8|0)));
  $764 = +HEAPF32[((39528 + 184|0))>>2];
  HEAPF32[((37008 + 8|0))>>2] = $764;
  $765 = +HEAPF32[((39528 + 188|0))>>2];
  HEAPF32[((37008 + 12|0))>>2] = $765;
  $766 = +HEAPF32[((39528 + 192|0))>>2];
  HEAPF32[((37008 + 16|0))>>2] = $766;
  $767 = +HEAPF32[((39528 + 196|0))>>2];
  HEAPF32[((37008 + 20|0))>>2] = $767;
  $768 = +HEAPF32[((39528 + 200|0))>>2];
  HEAPF32[((37008 + 24|0))>>2] = $768;
  $769 = +HEAPF32[((39528 + 204|0))>>2];
  HEAPF32[((37008 + 28|0))>>2] = $769;
  $770 = +HEAPF32[((39528 + 208|0))>>2];
  HEAPF32[((37008 + 32|0))>>2] = $770;
  $771 = +HEAPF32[((39528 + 212|0))>>2];
  HEAPF32[((37008 + 36|0))>>2] = $771;
  $772 = +HEAPF32[((39528 + 216|0))>>2];
  HEAPF32[((37008 + 40|0))>>2] = $772;
  $773 = +HEAPF32[((39528 + 220|0))>>2];
  HEAPF32[((37008 + 44|0))>>2] = $773;
  HEAP16[((39528 + 4|0))>>1] = $Ftyp$1;
  $774 = HEAP32[$511>>2]|0;
  $775 = (($Line) + 16|0);
  $776 = HEAP32[$775>>2]|0;
  $777 = (($Line) + 20|0);
  $778 = HEAP32[$777>>2]|0;
  _Update_Err($774,$776,$778);
  _Upd_Ring($DataBuff,$QntLpc,$PerLpc);
  $779 = (($DataBuff) + 240|0);
  $780 = HEAP32[$511>>2]|0;
  $781 = (($Line) + 44|0);
  $782 = HEAP32[$781>>2]|0;
  $783 = (($Line) + 48|0);
  $784 = HEAP32[$783>>2]|0;
  _Update_Err($780,$782,$784);
  $785 = (($QntLpc) + 40|0);
  $786 = (($PerLpc) + 80|0);
  _Upd_Ring($779,$785,$786);
  $787 = (($DataBuff) + 480|0);
  $788 = HEAP32[$514>>2]|0;
  $789 = (($Line) + 72|0);
  $790 = HEAP32[$789>>2]|0;
  $791 = (($Line) + 76|0);
  $792 = HEAP32[$791>>2]|0;
  _Update_Err($788,$790,$792);
  $793 = (($QntLpc) + 80|0);
  $794 = (($PerLpc) + 160|0);
  _Upd_Ring($787,$793,$794);
  $795 = (($DataBuff) + 720|0);
  $796 = HEAP32[$514>>2]|0;
  $797 = (($Line) + 100|0);
  $798 = HEAP32[$797>>2]|0;
  $799 = (($Line) + 104|0);
  $800 = HEAP32[$799>>2]|0;
  _Update_Err($796,$798,$800);
  $801 = (($QntLpc) + 120|0);
  $802 = (($PerLpc) + 240|0);
  _Upd_Ring($795,$801,$802);
  $Ftyp$2 = $Ftyp$1;
 }
 dest=$Dest+0|0; stop=dest+24|0; do { HEAP8[dest>>0]=0|0; dest=dest+1|0; } while ((dest|0) < (stop|0));
 $2773 = $Ftyp$2 << 16 >> 16;
 if ((($2773|0) == 2)) {
  $$012$i$i = $FltBuf$i;$$04$i$i = 2;$i$03$i$i = 0;
 } else if ((($2773|0) == 0)) {
  $$012$i$i = $FltBuf$i;$$04$i$i = 3;$i$03$i$i = 0;
 } else {
  $2774 = HEAP32[36992>>2]|0;
  $not$$i = ($2774|0)!=(0);
  $$$i = $not$$i&1;
  $$012$i$i = $FltBuf$i;$$04$i$i = $$$i;$i$03$i$i = 0;
 }
 while(1) {
  $2775 = $$04$i$i & 1;
  $2776 = $2775&65535;
  $2777 = $$04$i$i >> 1;
  $2778 = (($$012$i$i) + 2|0);
  HEAP16[$$012$i$i>>1] = $2776;
  $2779 = (($i$03$i$i) + 1)|0;
  $exitcond$i$i = ($2779|0)==(2);
  if ($exitcond$i$i) {
   break;
  } else {
   $$012$i$i = $2778;$$04$i$i = $2777;$i$03$i$i = $2779;
  }
 }
 $scevgep$i$i = (($FltBuf$i) + 4|0);
 if ((($Ftyp$2<<16>>16) == 1)) {
  $2780 = HEAP32[$359>>2]|0;
  $$012$i192$i = $scevgep$i$i;$$04$i190$i = $2780;$i$03$i191$i = 0;
  while(1) {
   $2781 = $$04$i190$i & 1;
   $2782 = $2781&65535;
   $2783 = $$04$i190$i >> 1;
   $2784 = (($$012$i192$i) + 2|0);
   HEAP16[$$012$i192$i>>1] = $2782;
   $2785 = (($i$03$i191$i) + 1)|0;
   $exitcond$i193$i = ($2785|0)==(24);
   if ($exitcond$i193$i) {
    break;
   } else {
    $$012$i192$i = $2784;$$04$i190$i = $2783;$i$03$i191$i = $2785;
   }
  }
  $scevgep$i195$i = (($FltBuf$i) + 52|0);
  $2786 = HEAP32[$511>>2]|0;
  $2787 = (($2786) + -18)|0;
  $$012$i185$i = $scevgep$i195$i;$$04$i183$i = $2787;$i$03$i184$i = 0;
  while(1) {
   $2788 = $$04$i183$i & 1;
   $2789 = $2788&65535;
   $2790 = $$04$i183$i >> 1;
   $2791 = (($$012$i185$i) + 2|0);
   HEAP16[$$012$i185$i>>1] = $2789;
   $2792 = (($i$03$i184$i) + 1)|0;
   $exitcond$i186$i = ($2792|0)==(7);
   if ($exitcond$i186$i) {
    break;
   } else {
    $$012$i185$i = $2791;$$04$i183$i = $2790;$i$03$i184$i = $2792;
   }
  }
  $scevgep$i188$i = (($FltBuf$i) + 66|0);
  $2793 = (($Line) + 44|0);
  $2794 = HEAP32[$2793>>2]|0;
  $$012$i178$i = $scevgep$i188$i;$$04$i176$i = $2794;$i$03$i177$i = 0;
  while(1) {
   $2795 = $$04$i176$i & 1;
   $2796 = $2795&65535;
   $2797 = $$04$i176$i >> 1;
   $2798 = (($$012$i178$i) + 2|0);
   HEAP16[$$012$i178$i>>1] = $2796;
   $2799 = (($i$03$i177$i) + 1)|0;
   $exitcond$i179$i = ($2799|0)==(2);
   if ($exitcond$i179$i) {
    break;
   } else {
    $$012$i178$i = $2798;$$04$i176$i = $2797;$i$03$i177$i = $2799;
   }
  }
  $scevgep$i181$i = (($FltBuf$i) + 70|0);
  $2800 = HEAP32[$514>>2]|0;
  $2801 = (($2800) + -18)|0;
  $$012$i171$i = $scevgep$i181$i;$$04$i169$i = $2801;$i$03$i170$i = 0;
  while(1) {
   $2802 = $$04$i169$i & 1;
   $2803 = $2802&65535;
   $2804 = $$04$i169$i >> 1;
   $2805 = (($$012$i171$i) + 2|0);
   HEAP16[$$012$i171$i>>1] = $2803;
   $2806 = (($i$03$i170$i) + 1)|0;
   $exitcond$i172$i = ($2806|0)==(7);
   if ($exitcond$i172$i) {
    break;
   } else {
    $$012$i171$i = $2805;$$04$i169$i = $2804;$i$03$i170$i = $2806;
   }
  }
  $scevgep$i174$i = (($FltBuf$i) + 84|0);
  $2807 = (($Line) + 100|0);
  $2808 = HEAP32[$2807>>2]|0;
  $$012$i164$i = $scevgep$i174$i;$$04$i162$i = $2808;$i$03$i163$i = 0;
  while(1) {
   $2809 = $$04$i162$i & 1;
   $2810 = $2809&65535;
   $2811 = $$04$i162$i >> 1;
   $2812 = (($$012$i164$i) + 2|0);
   HEAP16[$$012$i164$i>>1] = $2810;
   $2813 = (($i$03$i163$i) + 1)|0;
   $exitcond$i165$i = ($2813|0)==(2);
   if ($exitcond$i165$i) {
    break;
   } else {
    $$012$i164$i = $2812;$$04$i162$i = $2811;$i$03$i163$i = $2813;
   }
  }
  $scevgep$i167$i = (($FltBuf$i) + 88|0);
  $2814 = (($Line) + 20|0);
  $2815 = HEAP32[$2814>>2]|0;
  $2816 = ($2815*24)|0;
  $2817 = (($Line) + 24|0);
  $2818 = HEAP32[$2817>>2]|0;
  $2819 = (($2816) + ($2818))|0;
  $2820 = HEAP32[36992>>2]|0;
  $2821 = ($2820|0)==(0);
  if ($2821) {
   $2822 = (($Line) + 32|0);
   $2823 = HEAP32[$2822>>2]|0;
   $2824 = $2823 << 11;
   $2825 = (($2824) + ($2819))|0;
   $$012$i157$i = $scevgep$i167$i;$$04$i155$i = $2825;$i$03$i156$i = 0;
  } else {
   $$012$i157$i = $scevgep$i167$i;$$04$i155$i = $2819;$i$03$i156$i = 0;
  }
  while(1) {
   $2826 = $$04$i155$i & 1;
   $2827 = $2826&65535;
   $2828 = $$04$i155$i >> 1;
   $2829 = (($$012$i157$i) + 2|0);
   HEAP16[$$012$i157$i>>1] = $2827;
   $2830 = (($i$03$i156$i) + 1)|0;
   $exitcond$i158$i = ($2830|0)==(12);
   if ($exitcond$i158$i) {
    break;
   } else {
    $$012$i157$i = $2829;$$04$i155$i = $2828;$i$03$i156$i = $2830;
   }
  }
  $scevgep$i160$i = (($FltBuf$i) + 112|0);
  $2831 = (($Line) + 48|0);
  $2832 = HEAP32[$2831>>2]|0;
  $2833 = ($2832*24)|0;
  $2834 = (($Line) + 52|0);
  $2835 = HEAP32[$2834>>2]|0;
  $2836 = (($2833) + ($2835))|0;
  if ($2821) {
   $3016 = (($Line) + 60|0);
   $3017 = HEAP32[$3016>>2]|0;
   $3018 = $3017 << 11;
   $3019 = (($3018) + ($2836))|0;
   $$012$i10$i = $scevgep$i160$i;$$04$i8$i = $3019;$i$03$i9$i = 0;
  } else {
   $$012$i10$i = $scevgep$i160$i;$$04$i8$i = $2836;$i$03$i9$i = 0;
  }
  while(1) {
   $3020 = $$04$i8$i & 1;
   $3021 = $3020&65535;
   $3022 = $$04$i8$i >> 1;
   $3023 = (($$012$i10$i) + 2|0);
   HEAP16[$$012$i10$i>>1] = $3021;
   $3024 = (($i$03$i9$i) + 1)|0;
   $exitcond$i11$i = ($3024|0)==(12);
   if ($exitcond$i11$i) {
    break;
   } else {
    $$012$i10$i = $3023;$$04$i8$i = $3022;$i$03$i9$i = $3024;
   }
  }
  $scevgep$i13$i = (($FltBuf$i) + 136|0);
  $3025 = (($Line) + 76|0);
  $3026 = HEAP32[$3025>>2]|0;
  $3027 = ($3026*24)|0;
  $3028 = (($Line) + 80|0);
  $3029 = HEAP32[$3028>>2]|0;
  $3030 = (($3027) + ($3029))|0;
  if ($2821) {
   $3031 = (($Line) + 88|0);
   $3032 = HEAP32[$3031>>2]|0;
   $3033 = $3032 << 11;
   $3034 = (($3033) + ($3030))|0;
   $$012$i3$i = $scevgep$i13$i;$$04$i1$i = $3034;$i$03$i2$i = 0;
  } else {
   $$012$i3$i = $scevgep$i13$i;$$04$i1$i = $3030;$i$03$i2$i = 0;
  }
  while(1) {
   $3035 = $$04$i1$i & 1;
   $3036 = $3035&65535;
   $3037 = $$04$i1$i >> 1;
   $3038 = (($$012$i3$i) + 2|0);
   HEAP16[$$012$i3$i>>1] = $3036;
   $3039 = (($i$03$i2$i) + 1)|0;
   $exitcond$i4$i = ($3039|0)==(12);
   if ($exitcond$i4$i) {
    break;
   } else {
    $$012$i3$i = $3038;$$04$i1$i = $3037;$i$03$i2$i = $3039;
   }
  }
  $scevgep$i6$i = (($FltBuf$i) + 160|0);
  $3040 = (($Line) + 104|0);
  $3041 = HEAP32[$3040>>2]|0;
  $3042 = ($3041*24)|0;
  $3043 = (($Line) + 108|0);
  $3044 = HEAP32[$3043>>2]|0;
  $3045 = (($3042) + ($3044))|0;
  if ($2821) {
   $3046 = (($Line) + 116|0);
   $3047 = HEAP32[$3046>>2]|0;
   $3048 = $3047 << 11;
   $3049 = (($3048) + ($3045))|0;
   $$012$i150$i = $scevgep$i6$i;$$04$i148$i = $3049;$i$03$i149$i = 0;
  } else {
   $$012$i150$i = $scevgep$i6$i;$$04$i148$i = $3045;$i$03$i149$i = 0;
  }
  while(1) {
   $2837 = $$04$i148$i & 1;
   $2838 = $2837&65535;
   $2839 = $$04$i148$i >> 1;
   $2840 = (($$012$i150$i) + 2|0);
   HEAP16[$$012$i150$i>>1] = $2838;
   $2841 = (($i$03$i149$i) + 1)|0;
   $exitcond$i151$i = ($2841|0)==(12);
   if ($exitcond$i151$i) {
    break;
   } else {
    $$012$i150$i = $2840;$$04$i148$i = $2839;$i$03$i149$i = $2841;
   }
  }
  $scevgep$i153$i = (($FltBuf$i) + 184|0);
  $scevgep$i = (($FltBuf$i) + 192|0);
  $2842 = (($Line) + 28|0);
  $2843 = HEAP32[$2842>>2]|0;
  $2844 = $2843&65535;
  $2845 = (($FltBuf$i) + 186|0);
  HEAP16[$scevgep$i153$i>>1] = $2844;
  $2846 = (($Line) + 56|0);
  $2847 = HEAP32[$2846>>2]|0;
  $2848 = $2847&65535;
  $2849 = (($FltBuf$i) + 188|0);
  HEAP16[$2845>>1] = $2848;
  $2850 = (($Line) + 84|0);
  $2851 = HEAP32[$2850>>2]|0;
  $2852 = $2851&65535;
  $2853 = (($FltBuf$i) + 190|0);
  HEAP16[$2849>>1] = $2852;
  $2854 = (($Line) + 112|0);
  $2855 = HEAP32[$2854>>2]|0;
  $2856 = $2855&65535;
  HEAP16[$2853>>1] = $2856;
  if ($2821) {
   $2857 = (($FltBuf$i) + 194|0);
   HEAP16[$scevgep$i>>1] = 0;
   $2858 = (($Line) + 40|0);
   $2859 = HEAP32[$2858>>2]|0;
   $2860 = $2859 >> 16;
   $2861 = ($2860*9)|0;
   $2862 = (($Line) + 68|0);
   $2863 = HEAP32[$2862>>2]|0;
   $2864 = $2863 >> 14;
   $2865 = (($2861) + ($2864))|0;
   $2866 = ($2865*90)|0;
   $2867 = (($Line) + 96|0);
   $2868 = HEAP32[$2867>>2]|0;
   $2869 = $2868 >> 16;
   $2870 = ($2869*9)|0;
   $2871 = (($Line) + 124|0);
   $2872 = HEAP32[$2871>>2]|0;
   $2873 = $2872 >> 14;
   $2874 = (($2870) + ($2873))|0;
   $2875 = (($2874) + ($2866))|0;
   $$012$i143$i = $2857;$$04$i141$i = $2875;$i$03$i142$i = 0;
   while(1) {
    $2876 = $$04$i141$i & 1;
    $2877 = $2876&65535;
    $2878 = $$04$i141$i >> 1;
    $2879 = (($$012$i143$i) + 2|0);
    HEAP16[$$012$i143$i>>1] = $2877;
    $2880 = (($i$03$i142$i) + 1)|0;
    $exitcond$i144$i = ($2880|0)==(13);
    if ($exitcond$i144$i) {
     break;
    } else {
     $$012$i143$i = $2879;$$04$i141$i = $2878;$i$03$i142$i = $2880;
    }
   }
   $scevgep$i146$i = (($FltBuf$i) + 220|0);
   $2881 = $2859 & 65535;
   $$012$i136$i = $scevgep$i146$i;$$04$i134$i = $2881;$i$03$i135$i = 0;
   while(1) {
    $2882 = $$04$i134$i & 1;
    $2883 = $2882&65535;
    $2884 = $$04$i134$i >> 1;
    $2885 = (($$012$i136$i) + 2|0);
    HEAP16[$$012$i136$i>>1] = $2883;
    $2886 = (($i$03$i135$i) + 1)|0;
    $exitcond$i137$i = ($2886|0)==(16);
    if ($exitcond$i137$i) {
     break;
    } else {
     $$012$i136$i = $2885;$$04$i134$i = $2884;$i$03$i135$i = $2886;
    }
   }
   $scevgep$i139$i = (($FltBuf$i) + 252|0);
   $2887 = $2863 & 16383;
   $$012$i129$i = $scevgep$i139$i;$$04$i127$i = $2887;$i$03$i128$i = 0;
   while(1) {
    $2888 = $$04$i127$i & 1;
    $2889 = $2888&65535;
    $2890 = $$04$i127$i >> 1;
    $2891 = (($$012$i129$i) + 2|0);
    HEAP16[$$012$i129$i>>1] = $2889;
    $2892 = (($i$03$i128$i) + 1)|0;
    $exitcond$i130$i = ($2892|0)==(14);
    if ($exitcond$i130$i) {
     break;
    } else {
     $$012$i129$i = $2891;$$04$i127$i = $2890;$i$03$i128$i = $2892;
    }
   }
   $scevgep$i132$i = (($FltBuf$i) + 280|0);
   $2893 = $2868 & 65535;
   $$012$i122$i = $scevgep$i132$i;$$04$i120$i = $2893;$i$03$i121$i = 0;
   while(1) {
    $2894 = $$04$i120$i & 1;
    $2895 = $2894&65535;
    $2896 = $$04$i120$i >> 1;
    $2897 = (($$012$i122$i) + 2|0);
    HEAP16[$$012$i122$i>>1] = $2895;
    $2898 = (($i$03$i121$i) + 1)|0;
    $exitcond$i123$i = ($2898|0)==(16);
    if ($exitcond$i123$i) {
     break;
    } else {
     $$012$i122$i = $2897;$$04$i120$i = $2896;$i$03$i121$i = $2898;
    }
   }
   $scevgep$i125$i = (($FltBuf$i) + 312|0);
   $2899 = $2872 & 16383;
   $$012$i115$i = $scevgep$i125$i;$$04$i113$i = $2899;$i$03$i114$i = 0;
   while(1) {
    $2900 = $$04$i113$i & 1;
    $2901 = $2900&65535;
    $2902 = $$04$i113$i >> 1;
    $2903 = (($$012$i115$i) + 2|0);
    HEAP16[$$012$i115$i>>1] = $2901;
    $2904 = (($i$03$i114$i) + 1)|0;
    $exitcond$i116$i = ($2904|0)==(14);
    if ($exitcond$i116$i) {
     break;
    } else {
     $$012$i115$i = $2903;$$04$i113$i = $2902;$i$03$i114$i = $2904;
    }
   }
   $scevgep$i118$i = (($FltBuf$i) + 340|0);
   $2905 = (($Line) + 36|0);
   $2906 = HEAP32[$2905>>2]|0;
   $$012$i108$i = $scevgep$i118$i;$$04$i106$i = $2906;$i$03$i107$i = 0;
   while(1) {
    $2907 = $$04$i106$i & 1;
    $2908 = $2907&65535;
    $2909 = $$04$i106$i >> 1;
    $2910 = (($$012$i108$i) + 2|0);
    HEAP16[$$012$i108$i>>1] = $2908;
    $2911 = (($i$03$i107$i) + 1)|0;
    $exitcond$i109$i = ($2911|0)==(6);
    if ($exitcond$i109$i) {
     break;
    } else {
     $$012$i108$i = $2910;$$04$i106$i = $2909;$i$03$i107$i = $2911;
    }
   }
   $scevgep$i111$i = (($FltBuf$i) + 352|0);
   $2912 = (($Line) + 64|0);
   $2913 = HEAP32[$2912>>2]|0;
   $$012$i101$i = $scevgep$i111$i;$$04$i99$i = $2913;$i$03$i100$i = 0;
   while(1) {
    $2914 = $$04$i99$i & 1;
    $2915 = $2914&65535;
    $2916 = $$04$i99$i >> 1;
    $2917 = (($$012$i101$i) + 2|0);
    HEAP16[$$012$i101$i>>1] = $2915;
    $2918 = (($i$03$i100$i) + 1)|0;
    $exitcond$i102$i = ($2918|0)==(5);
    if ($exitcond$i102$i) {
     break;
    } else {
     $$012$i101$i = $2917;$$04$i99$i = $2916;$i$03$i100$i = $2918;
    }
   }
   $scevgep$i104$i = (($FltBuf$i) + 362|0);
   $2919 = (($Line) + 92|0);
   $2920 = HEAP32[$2919>>2]|0;
   $$012$i94$i = $scevgep$i104$i;$$04$i92$i = $2920;$i$03$i93$i = 0;
   while(1) {
    $2921 = $$04$i92$i & 1;
    $2922 = $2921&65535;
    $2923 = $$04$i92$i >> 1;
    $2924 = (($$012$i94$i) + 2|0);
    HEAP16[$$012$i94$i>>1] = $2922;
    $2925 = (($i$03$i93$i) + 1)|0;
    $exitcond$i95$i = ($2925|0)==(6);
    if ($exitcond$i95$i) {
     break;
    } else {
     $$012$i94$i = $2924;$$04$i92$i = $2923;$i$03$i93$i = $2925;
    }
   }
   $scevgep$i97$i = (($FltBuf$i) + 374|0);
   $2926 = (($Line) + 120|0);
   $2927 = HEAP32[$2926>>2]|0;
   $$012$i87$i = $scevgep$i97$i;$$04$i85$i = $2927;$i$03$i86$i = 0;
   while(1) {
    $2928 = $$04$i85$i & 1;
    $2929 = $2928&65535;
    $2930 = $$04$i85$i >> 1;
    $2931 = (($$012$i87$i) + 2|0);
    HEAP16[$$012$i87$i>>1] = $2929;
    $2932 = (($i$03$i86$i) + 1)|0;
    $exitcond$i88$i = ($2932|0)==(5);
    if ($exitcond$i88$i) {
     break;
    } else {
     $$012$i87$i = $2931;$$04$i85$i = $2930;$i$03$i86$i = $2932;
    }
   }
  } else {
   $2933 = (($Line) + 40|0);
   $2934 = HEAP32[$2933>>2]|0;
   $$012$i80$i = $scevgep$i;$$04$i78$i = $2934;$i$03$i79$i = 0;
   while(1) {
    $2935 = $$04$i78$i & 1;
    $2936 = $2935&65535;
    $2937 = $$04$i78$i >> 1;
    $2938 = (($$012$i80$i) + 2|0);
    HEAP16[$$012$i80$i>>1] = $2936;
    $2939 = (($i$03$i79$i) + 1)|0;
    $exitcond$i81$i = ($2939|0)==(12);
    if ($exitcond$i81$i) {
     break;
    } else {
     $$012$i80$i = $2938;$$04$i78$i = $2937;$i$03$i79$i = $2939;
    }
   }
   $scevgep$i83$i = (($FltBuf$i) + 216|0);
   $2940 = (($Line) + 68|0);
   $2941 = HEAP32[$2940>>2]|0;
   $$012$i73$i = $scevgep$i83$i;$$04$i71$i = $2941;$i$03$i72$i = 0;
   while(1) {
    $2942 = $$04$i71$i & 1;
    $2943 = $2942&65535;
    $2944 = $$04$i71$i >> 1;
    $2945 = (($$012$i73$i) + 2|0);
    HEAP16[$$012$i73$i>>1] = $2943;
    $2946 = (($i$03$i72$i) + 1)|0;
    $exitcond$i74$i = ($2946|0)==(12);
    if ($exitcond$i74$i) {
     break;
    } else {
     $$012$i73$i = $2945;$$04$i71$i = $2944;$i$03$i72$i = $2946;
    }
   }
   $scevgep$i76$i = (($FltBuf$i) + 240|0);
   $2947 = (($Line) + 96|0);
   $2948 = HEAP32[$2947>>2]|0;
   $$012$i66$i = $scevgep$i76$i;$$04$i64$i = $2948;$i$03$i65$i = 0;
   while(1) {
    $2949 = $$04$i64$i & 1;
    $2950 = $2949&65535;
    $2951 = $$04$i64$i >> 1;
    $2952 = (($$012$i66$i) + 2|0);
    HEAP16[$$012$i66$i>>1] = $2950;
    $2953 = (($i$03$i65$i) + 1)|0;
    $exitcond$i67$i = ($2953|0)==(12);
    if ($exitcond$i67$i) {
     break;
    } else {
     $$012$i66$i = $2952;$$04$i64$i = $2951;$i$03$i65$i = $2953;
    }
   }
   $scevgep$i69$i = (($FltBuf$i) + 264|0);
   $2954 = (($Line) + 124|0);
   $2955 = HEAP32[$2954>>2]|0;
   $$012$i59$i = $scevgep$i69$i;$$04$i57$i = $2955;$i$03$i58$i = 0;
   while(1) {
    $2956 = $$04$i57$i & 1;
    $2957 = $2956&65535;
    $2958 = $$04$i57$i >> 1;
    $2959 = (($$012$i59$i) + 2|0);
    HEAP16[$$012$i59$i>>1] = $2957;
    $2960 = (($i$03$i58$i) + 1)|0;
    $exitcond$i60$i = ($2960|0)==(12);
    if ($exitcond$i60$i) {
     break;
    } else {
     $$012$i59$i = $2959;$$04$i57$i = $2958;$i$03$i58$i = $2960;
    }
   }
   $scevgep$i62$i = (($FltBuf$i) + 288|0);
   $2961 = (($Line) + 36|0);
   $2962 = HEAP32[$2961>>2]|0;
   $$012$i52$i = $scevgep$i62$i;$$04$i50$i = $2962;$i$03$i51$i = 0;
   while(1) {
    $2963 = $$04$i50$i & 1;
    $2964 = $2963&65535;
    $2965 = $$04$i50$i >> 1;
    $2966 = (($$012$i52$i) + 2|0);
    HEAP16[$$012$i52$i>>1] = $2964;
    $2967 = (($i$03$i51$i) + 1)|0;
    $exitcond$i53$i = ($2967|0)==(4);
    if ($exitcond$i53$i) {
     break;
    } else {
     $$012$i52$i = $2966;$$04$i50$i = $2965;$i$03$i51$i = $2967;
    }
   }
   $scevgep$i55$i = (($FltBuf$i) + 296|0);
   $2968 = (($Line) + 64|0);
   $2969 = HEAP32[$2968>>2]|0;
   $$012$i45$i = $scevgep$i55$i;$$04$i43$i = $2969;$i$03$i44$i = 0;
   while(1) {
    $2970 = $$04$i43$i & 1;
    $2971 = $2970&65535;
    $2972 = $$04$i43$i >> 1;
    $2973 = (($$012$i45$i) + 2|0);
    HEAP16[$$012$i45$i>>1] = $2971;
    $2974 = (($i$03$i44$i) + 1)|0;
    $exitcond$i46$i = ($2974|0)==(4);
    if ($exitcond$i46$i) {
     break;
    } else {
     $$012$i45$i = $2973;$$04$i43$i = $2972;$i$03$i44$i = $2974;
    }
   }
   $scevgep$i48$i = (($FltBuf$i) + 304|0);
   $2975 = (($Line) + 92|0);
   $2976 = HEAP32[$2975>>2]|0;
   $$012$i38$i = $scevgep$i48$i;$$04$i36$i = $2976;$i$03$i37$i = 0;
   while(1) {
    $2977 = $$04$i36$i & 1;
    $2978 = $2977&65535;
    $2979 = $$04$i36$i >> 1;
    $2980 = (($$012$i38$i) + 2|0);
    HEAP16[$$012$i38$i>>1] = $2978;
    $2981 = (($i$03$i37$i) + 1)|0;
    $exitcond$i39$i = ($2981|0)==(4);
    if ($exitcond$i39$i) {
     break;
    } else {
     $$012$i38$i = $2980;$$04$i36$i = $2979;$i$03$i37$i = $2981;
    }
   }
   $scevgep$i41$i = (($FltBuf$i) + 312|0);
   $2982 = (($Line) + 120|0);
   $2983 = HEAP32[$2982>>2]|0;
   $$012$i31$i = $scevgep$i41$i;$$04$i29$i = $2983;$i$03$i30$i = 0;
   while(1) {
    $2984 = $$04$i29$i & 1;
    $2985 = $2984&65535;
    $2986 = $$04$i29$i >> 1;
    $2987 = (($$012$i31$i) + 2|0);
    HEAP16[$$012$i31$i>>1] = $2985;
    $2988 = (($i$03$i30$i) + 1)|0;
    $exitcond$i32$i = ($2988|0)==(4);
    if ($exitcond$i32$i) {
     break;
    } else {
     $$012$i31$i = $2987;$$04$i29$i = $2986;$i$03$i30$i = $2988;
    }
   }
  }
  $$1$i = $2821 ? 192 : 160;
  $BitCount$0$i = $$1$i;
 } else if ((($Ftyp$2<<16>>16) == 2)) {
  $2989 = HEAP32[$359>>2]|0;
  $$012$i24$i = $scevgep$i$i;$$04$i22$i = $2989;$i$03$i23$i = 0;
  while(1) {
   $2990 = $$04$i22$i & 1;
   $2991 = $2990&65535;
   $2992 = $$04$i22$i >> 1;
   $2993 = (($$012$i24$i) + 2|0);
   HEAP16[$$012$i24$i>>1] = $2991;
   $2994 = (($i$03$i23$i) + 1)|0;
   $exitcond$i25$i = ($2994|0)==(24);
   if ($exitcond$i25$i) {
    break;
   } else {
    $$012$i24$i = $2993;$$04$i22$i = $2992;$i$03$i23$i = $2994;
   }
  }
  $scevgep$i27$i = (($FltBuf$i) + 52|0);
  $2995 = (($Line) + 24|0);
  $2996 = HEAP32[$2995>>2]|0;
  $$012$i17$i = $scevgep$i27$i;$$04$i15$i = $2996;$i$03$i16$i = 0;
  while(1) {
   $2997 = $$04$i15$i & 1;
   $2998 = $2997&65535;
   $2999 = $$04$i15$i >> 1;
   $3000 = (($$012$i17$i) + 2|0);
   HEAP16[$$012$i17$i>>1] = $2998;
   $3001 = (($i$03$i16$i) + 1)|0;
   $exitcond$i18$i = ($3001|0)==(6);
   if ($exitcond$i18$i) {
    label = 347;
    break;
   } else {
    $$012$i17$i = $3000;$$04$i15$i = $2999;$i$03$i16$i = $3001;
   }
  }
 } else {
  label = 347;
 }
 if ((label|0) == 347) {
  $3002 = ($Ftyp$2<<16>>16)==(2);
  $$2$i = $3002 ? 32 : 2;
  $BitCount$0$i = $$2$i;
 }
 $i$53$i = 0;
 while(1) {
  $3003 = (($FltBuf$i) + ($i$53$i<<1)|0);
  $3004 = HEAP16[$3003>>1]|0;
  $3005 = $3004 << 16 >> 16;
  $3006 = $i$53$i & 7;
  $3007 = $3005 << $3006;
  $3008 = $i$53$i >> 3;
  $3009 = (($Dest) + ($3008)|0);
  $3010 = HEAP8[$3009>>0]|0;
  $3011 = $3010&255;
  $3012 = $3011 ^ $3007;
  $3013 = $3012&255;
  HEAP8[$3009>>0] = $3013;
  $3014 = (($i$53$i) + 1)|0;
  $3015 = ($3014|0)<($BitCount$0$i|0);
  if ($3015) {
   $i$53$i = $3014;
  } else {
   break;
  }
 }
 $3050 = $BitCount$0$i >>> 3;
 $3051 = ($3050|0)==(0);
 $$ = $3051 ? 1 : $3050;
 STACKTOP = sp;return ($$|0);
}
function _Estim_Pitch($Dpnt,$Start) {
 $Dpnt = $Dpnt|0;
 $Start = $Start|0;
 var $$sum = 0, $$sum10 = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum15 = 0, $$sum6 = 0, $$sum8 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0, $36 = 0.0;
 var $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0, $48 = 0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0.0, $59 = 0.0, $6 = 0.0, $60 = 0, $61 = 0, $7 = 0.0, $8 = 0.0, $9 = 0, $E$06 = 0.0, $Indx$07 = 0, $Indx$1 = 0, $MaxC$05 = 0.0, $MaxC$1 = 0.0, $MaxE$04 = 0.0, $MaxE$1 = 0.0, $Pr$08 = 0, $exitcond = 0;
 var $i$01$i = 0, $i$01$i2 = 0, $i$09 = 0, $or$cond = 0, $or$cond3 = 0, $sum$02$i = 0.0, $sum$02$i1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($Start) + -17)|0;
 $i$01$i = 0;$sum$02$i = 0.0;
 while(1) {
  $$sum = (($0) + ($i$01$i))|0;
  $1 = (($Dpnt) + ($$sum<<2)|0);
  $2 = +HEAPF32[$1>>2];
  $3 = $2 * $2;
  $4 = (($i$01$i) + 1)|0;
  $$sum6 = (($0) + ($4))|0;
  $5 = (($Dpnt) + ($$sum6<<2)|0);
  $6 = +HEAPF32[$5>>2];
  $7 = $6 * $6;
  $8 = $3 + $7;
  $9 = (($i$01$i) + 2)|0;
  $$sum8 = (($0) + ($9))|0;
  $10 = (($Dpnt) + ($$sum8<<2)|0);
  $11 = +HEAPF32[$10>>2];
  $12 = $11 * $11;
  $13 = $8 + $12;
  $14 = $sum$02$i + $13;
  $15 = (($i$01$i) + 3)|0;
  $16 = ($15|0)<(120);
  if ($16) {
   $i$01$i = $15;$sum$02$i = $14;
  } else {
   $E$06 = $14;$Indx$07 = 18;$MaxC$05 = 0.0;$MaxE$04 = 1.0;$Pr$08 = $0;$i$09 = 18;
   break;
  }
 }
 while(1) {
  $17 = (($Pr$08) + -1)|0;
  $18 = (($Pr$08) + 119)|0;
  $19 = (($Dpnt) + ($18<<2)|0);
  $20 = +HEAPF32[$19>>2];
  $21 = $20 * $20;
  $22 = $E$06 - $21;
  $23 = (($Dpnt) + ($17<<2)|0);
  $24 = +HEAPF32[$23>>2];
  $25 = $24 * $24;
  $26 = $22 + $25;
  $i$01$i2 = 0;$sum$02$i1 = 0.0;
  while(1) {
   $$sum10 = (($i$01$i2) + ($Start))|0;
   $27 = (($Dpnt) + ($$sum10<<2)|0);
   $28 = +HEAPF32[$27>>2];
   $$sum11 = (($17) + ($i$01$i2))|0;
   $29 = (($Dpnt) + ($$sum11<<2)|0);
   $30 = +HEAPF32[$29>>2];
   $31 = $28 * $30;
   $32 = (($i$01$i2) + 1)|0;
   $$sum12 = (($32) + ($Start))|0;
   $33 = (($Dpnt) + ($$sum12<<2)|0);
   $34 = +HEAPF32[$33>>2];
   $$sum13 = (($Pr$08) + ($i$01$i2))|0;
   $35 = (($Dpnt) + ($$sum13<<2)|0);
   $36 = +HEAPF32[$35>>2];
   $37 = $34 * $36;
   $38 = $31 + $37;
   $39 = (($i$01$i2) + 2)|0;
   $$sum14 = (($39) + ($Start))|0;
   $40 = (($Dpnt) + ($$sum14<<2)|0);
   $41 = +HEAPF32[$40>>2];
   $$sum15 = (($17) + ($39))|0;
   $42 = (($Dpnt) + ($$sum15<<2)|0);
   $43 = +HEAPF32[$42>>2];
   $44 = $41 * $43;
   $45 = $38 + $44;
   $46 = $sum$02$i1 + $45;
   $47 = (($i$01$i2) + 3)|0;
   $48 = ($47|0)<(120);
   if ($48) {
    $i$01$i2 = $47;$sum$02$i1 = $46;
   } else {
    break;
   }
  }
  $49 = $46 * $46;
  $50 = $MaxE$04 * $49;
  $51 = $MaxC$05 * $26;
  $52 = $50 - $51;
  $53 = $26 > 0.0;
  $54 = $46 > 0.0;
  $or$cond = $53 & $54;
  do {
   if ($or$cond) {
    $55 = $52 > 0.0;
    $56 = (($i$09) - ($Indx$07))|0;
    $57 = ($56|0)<(18);
    $or$cond3 = $55 & $57;
    if (!($or$cond3)) {
     $58 = $49 * 0.25;
     $59 = $MaxE$04 * $58;
     $60 = $52 > $59;
     if (!($60)) {
      $Indx$1 = $Indx$07;$MaxC$1 = $MaxC$05;$MaxE$1 = $MaxE$04;
      break;
     }
    }
    $Indx$1 = $i$09;$MaxC$1 = $49;$MaxE$1 = $26;
   } else {
    $Indx$1 = $Indx$07;$MaxC$1 = $MaxC$05;$MaxE$1 = $MaxE$04;
   }
  } while(0);
  $61 = (($i$09) + 1)|0;
  $exitcond = ($61|0)==(143);
  if ($exitcond) {
   break;
  } else {
   $E$06 = $26;$Indx$07 = $Indx$1;$MaxC$05 = $MaxC$1;$MaxE$04 = $MaxE$1;$Pr$08 = $17;$i$09 = $61;
  }
 }
 STACKTOP = sp;return ($Indx$1|0);
}
function _Comp_Pw($agg$result,$Dpnt,$Start,$Olp) {
 $agg$result = $agg$result|0;
 $Dpnt = $Dpnt|0;
 $Start = $Start|0;
 $Olp = $Olp|0;
 var $$sum = 0, $$sum10 = 0, $$sum12 = 0, $$sum14 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum20 = 0, $$sum22 = 0, $$sum24 = 0, $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0;
 var $16 = 0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0.0, $26 = 0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0.0, $33 = 0;
 var $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0.0, $50 = 0.0, $51 = 0.0;
 var $52 = 0.0, $53 = 0.0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0.0, $6 = 0.0, $60 = 0.0, $61 = 0.0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0, $69 = 0, $7 = 0.0;
 var $70 = 0, $71 = 0.0, $72 = 0, $73 = 0, $8 = 0, $9 = 0, $MaxC$08 = 0.0, $MaxC$1 = 0.0, $MaxC2$07 = 0.0, $MaxC2$1 = 0.0, $MaxE$06 = 0.0, $MaxE$1 = 0.0, $Pw$sroa$0$09 = 0, $Pw$sroa$0$1 = 0, $Pw$sroa$8$0 = 0.0, $exitcond = 0, $i$01$i = 0, $i$01$i2 = 0, $i$01$i6 = 0, $i$05 = 0;
 var $k$04 = 0, $or$cond = 0, $or$cond3 = 0, $phitmp = 0.0, $sum$02$i = 0.0, $sum$02$i1 = 0.0, $sum$02$i5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $i$01$i = 0;$sum$02$i = 0.0;
 while(1) {
  $$sum = (($i$01$i) + ($Start))|0;
  $0 = (($Dpnt) + ($$sum<<2)|0);
  $1 = +HEAPF32[$0>>2];
  $2 = $1 * $1;
  $3 = (($i$01$i) + 1)|0;
  $$sum10 = (($3) + ($Start))|0;
  $4 = (($Dpnt) + ($$sum10<<2)|0);
  $5 = +HEAPF32[$4>>2];
  $6 = $5 * $5;
  $7 = $2 + $6;
  $8 = (($i$01$i) + 2)|0;
  $$sum12 = (($8) + ($Start))|0;
  $9 = (($Dpnt) + ($$sum12<<2)|0);
  $10 = +HEAPF32[$9>>2];
  $11 = $10 * $10;
  $12 = $7 + $11;
  $13 = $sum$02$i + $12;
  $14 = (($i$01$i) + 3)|0;
  $15 = ($14|0)<(60);
  if ($15) {
   $i$01$i = $14;$sum$02$i = $13;
  } else {
   break;
  }
 }
 $16 = (($Olp) + -3)|0;
 $17 = (($Start) - ($16))|0;
 $MaxC$08 = 0.0;$MaxC2$07 = 0.0;$MaxE$06 = 1.0;$Pw$sroa$0$09 = -1;$i$05 = 0;$k$04 = $17;
 while(1) {
  $i$01$i6 = 0;$sum$02$i5 = 0.0;
  while(1) {
   $$sum14 = (($i$01$i6) + ($Start))|0;
   $18 = (($Dpnt) + ($$sum14<<2)|0);
   $19 = +HEAPF32[$18>>2];
   $$sum15 = (($k$04) + ($i$01$i6))|0;
   $20 = (($Dpnt) + ($$sum15<<2)|0);
   $21 = +HEAPF32[$20>>2];
   $22 = $19 * $21;
   $23 = (($i$01$i6) + 1)|0;
   $$sum16 = (($23) + ($Start))|0;
   $24 = (($Dpnt) + ($$sum16<<2)|0);
   $25 = +HEAPF32[$24>>2];
   $$sum17 = (($k$04) + ($23))|0;
   $26 = (($Dpnt) + ($$sum17<<2)|0);
   $27 = +HEAPF32[$26>>2];
   $28 = $25 * $27;
   $29 = $22 + $28;
   $30 = (($i$01$i6) + 2)|0;
   $$sum18 = (($30) + ($Start))|0;
   $31 = (($Dpnt) + ($$sum18<<2)|0);
   $32 = +HEAPF32[$31>>2];
   $$sum19 = (($k$04) + ($30))|0;
   $33 = (($Dpnt) + ($$sum19<<2)|0);
   $34 = +HEAPF32[$33>>2];
   $35 = $32 * $34;
   $36 = $29 + $35;
   $37 = $sum$02$i5 + $36;
   $38 = (($i$01$i6) + 3)|0;
   $39 = ($38|0)<(60);
   if ($39) {
    $i$01$i6 = $38;$sum$02$i5 = $37;
   } else {
    $i$01$i2 = 0;$sum$02$i1 = 0.0;
    break;
   }
  }
  while(1) {
   $$sum20 = (($k$04) + ($i$01$i2))|0;
   $40 = (($Dpnt) + ($$sum20<<2)|0);
   $41 = +HEAPF32[$40>>2];
   $42 = $41 * $41;
   $43 = (($i$01$i2) + 1)|0;
   $$sum22 = (($k$04) + ($43))|0;
   $44 = (($Dpnt) + ($$sum22<<2)|0);
   $45 = +HEAPF32[$44>>2];
   $46 = $45 * $45;
   $47 = $42 + $46;
   $48 = (($i$01$i2) + 2)|0;
   $$sum24 = (($k$04) + ($48))|0;
   $49 = (($Dpnt) + ($$sum24<<2)|0);
   $50 = +HEAPF32[$49>>2];
   $51 = $50 * $50;
   $52 = $47 + $51;
   $53 = $sum$02$i1 + $52;
   $54 = (($i$01$i2) + 3)|0;
   $55 = ($54|0)<(60);
   if ($55) {
    $i$01$i2 = $54;$sum$02$i1 = $53;
   } else {
    break;
   }
  }
  $56 = (($k$04) + -1)|0;
  $57 = $53 > 0.0;
  $58 = $37 > 0.0;
  $or$cond = $57 & $58;
  if ($or$cond) {
   $59 = $37 * $37;
   $60 = $MaxE$06 * $59;
   $61 = $MaxC2$07 * $53;
   $62 = $60 > $61;
   if ($62) {
    $MaxC$1 = $37;$MaxC2$1 = $59;$MaxE$1 = $53;$Pw$sroa$0$1 = $i$05;
   } else {
    $MaxC$1 = $MaxC$08;$MaxC2$1 = $MaxC2$07;$MaxE$1 = $MaxE$06;$Pw$sroa$0$1 = $Pw$sroa$0$09;
   }
  } else {
   $MaxC$1 = $MaxC$08;$MaxC2$1 = $MaxC2$07;$MaxE$1 = $MaxE$06;$Pw$sroa$0$1 = $Pw$sroa$0$09;
  }
  $63 = (($i$05) + 1)|0;
  $exitcond = ($63|0)==(7);
  if ($exitcond) {
   break;
  } else {
   $MaxC$08 = $MaxC$1;$MaxC2$07 = $MaxC2$1;$MaxE$06 = $MaxE$1;$Pw$sroa$0$09 = $Pw$sroa$0$1;$i$05 = $63;$k$04 = $56;
  }
 }
 $64 = ($Pw$sroa$0$1|0)==(-1);
 if ($64) {
  HEAP32[$agg$result>>2] = $Olp;
  $65 = (($agg$result) + 4|0);
  HEAPF32[$65>>2] = 0.0;
  STACKTOP = sp;return;
 }
 $66 = $13 * $MaxE$1;
 $67 = $66 * 0.375;
 $68 = $MaxC2$1 > $67;
 if ($68) {
  $69 = $MaxC$1 > $MaxE$1;
  $70 = $MaxE$1 == 0.0;
  $or$cond3 = $69 | $70;
  if ($or$cond3) {
   $Pw$sroa$8$0 = 0.3125;
  } else {
   $71 = $MaxC$1 / $MaxE$1;
   $phitmp = $71 * 0.3125;
   $Pw$sroa$8$0 = $phitmp;
  }
 } else {
  $Pw$sroa$8$0 = 0.0;
 }
 $72 = (($Pw$sroa$0$1) + ($16))|0;
 HEAP32[$agg$result>>2] = $72;
 $73 = (($agg$result) + 4|0);
 HEAPF32[$73>>2] = $Pw$sroa$8$0;
 STACKTOP = sp;return;
}
function _Find_Best($Best,$Tv,$ImpResp,$Np,$Olp) {
 $Best = $Best|0;
 $Tv = $Tv|0;
 $ImpResp = $ImpResp|0;
 $Np = $Np|0;
 $Olp = $Olp|0;
 var $$sum = 0, $$sum20 = 0, $0 = 0, $1 = 0, $10 = 0.0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0.0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0.0;
 var $114 = 0, $115 = 0, $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0, $12 = 0.0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0.0, $125 = 0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0, $13 = 0.0, $130 = 0.0, $131 = 0;
 var $132 = 0.0, $133 = 0.0, $134 = 0.0, $135 = 0, $136 = 0, $137 = 0.0, $138 = 0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0.0, $142 = 0.0, $143 = 0, $144 = 0, $145 = 0.0, $146 = 0, $147 = 0.0, $148 = 0.0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0.0, $152 = 0.0, $153 = 0.0, $154 = 0, $155 = 0, $156 = 0.0, $157 = 0.0, $158 = 0.0, $159 = 0.0, $16 = 0, $160 = 0, $161 = 0, $162 = 0.0, $163 = 0.0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0.0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0.0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0.0, $40 = 0, $41 = 0, $42 = 0.0, $43 = 0, $44 = 0.0, $45 = 0.0;
 var $46 = 0.0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0.0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0.0, $72 = 0, $73 = 0, $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0, $78 = 0.0, $79 = 0, $8 = 0, $80 = 0, $81 = 0.0;
 var $82 = 0, $83 = 0, $84 = 0.0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0.0, $99 = 0, $Acc0$0$lcssa = 0.0;
 var $Acc0$025 = 0.0, $Acc0$1 = 0.0, $Acc1$03 = 0.0, $Acc1$1 = 0.0, $Acc1$27 = 0.0, $Acc1$3 = 0.0, $Acc1$413 = 0.0, $Acc1$5 = 0.0, $ErrBlk = 0, $Imr = 0, $ImrCorr = 0, $MaxAmpId$06 = 0, $MaxAmpId$1 = 0, $OccPos = 0, $Temp = 0, $Tmp$i = 0, $Tmp0$03$i = 0, $WrkBlk = 0, $exitcond = 0, $exitcond$i = 0;
 var $exitcond$i10 = 0, $exitcond$i15 = 0, $exitcond42 = 0, $exitcond43 = 0, $exitcond44 = 0, $exitcond47 = 0, $exitcond48 = 0, $exitcond49 = 0, $exitcond6$i = 0, $fabsf = 0.0, $fabsf1 = 0.0, $fabsf2 = 0.0, $i$01$i = 0, $i$01$i14 = 0, $i$01$i4 = 0, $i$01$i9 = 0, $i$05$i = 0, $i$11$i = 0, $i$139 = 0, $i$24 = 0;
 var $i$38 = 0, $i$435 = 0, $ispos = 0, $j$09 = 0, $j$117 = 0, $j$321 = 0, $j$424 = 0, $j$532 = 0, $k$037 = 0, $l$012 = 0, $l$129 = 0, $neg = 0, $storemerge = 0.0, $storemerge21 = 0.0, $sum$0$lcssa$i = 0.0, $sum$02$i = 0.0, $sum$02$i13 = 0.0, $sum$02$i3 = 0.0, $sum$02$i8 = 0.0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1504|0;
 $Tmp$i = sp + 1264|0;
 $Temp = sp + 1200|0;
 $Imr = sp + 960|0;
 $OccPos = sp + 720|0;
 $ImrCorr = sp + 480|0;
 $ErrBlk = sp + 240|0;
 $WrkBlk = sp;
 $0 = ($Olp|0)<(58);
 $1 = (($Temp) + 12|0);
 if ($0) {
  HEAP32[$1>>2] = 1;
  $i$05$i = 0;
  while(1) {
   $3 = (($ImpResp) + ($i$05$i<<2)|0);
   $4 = +HEAPF32[$3>>2];
   $5 = (($Tmp$i) + ($i$05$i<<2)|0);
   HEAPF32[$5>>2] = $4;
   $6 = (($Imr) + ($i$05$i<<2)|0);
   HEAPF32[$6>>2] = $4;
   $7 = (($i$05$i) + 1)|0;
   $exitcond6$i = ($7|0)==(60);
   if ($exitcond6$i) {
    break;
   } else {
    $i$05$i = $7;
   }
  }
  $2 = ($Olp|0)<(60);
  if ($2) {
   $Tmp0$03$i = $Olp;
   while(1) {
    $i$11$i = $Tmp0$03$i;
    while(1) {
     $8 = (($i$11$i) - ($Tmp0$03$i))|0;
     $9 = (($Tmp$i) + ($8<<2)|0);
     $10 = +HEAPF32[$9>>2];
     $11 = (($Imr) + ($i$11$i<<2)|0);
     $12 = +HEAPF32[$11>>2];
     $13 = $10 + $12;
     HEAPF32[$11>>2] = $13;
     $14 = (($i$11$i) + 1)|0;
     $exitcond$i = ($14|0)==(60);
     if ($exitcond$i) {
      break;
     } else {
      $i$11$i = $14;
     }
    }
    $15 = (($Tmp0$03$i) + ($Olp))|0;
    $16 = ($15|0)<(60);
    if ($16) {
     $Tmp0$03$i = $15;
    } else {
     $i$139 = 0;
     break;
    }
   }
  } else {
   $i$139 = 0;
  }
 } else {
  HEAP32[$1>>2] = 0;
  _memcpy(($Imr|0),($ImpResp|0),240)|0;
  $i$139 = 0;
 }
 while(1) {
  $27 = (($Imr) + ($i$139<<2)|0);
  $28 = +HEAPF32[$27>>2];
  $29 = (($OccPos) + ($i$139<<2)|0);
  HEAPF32[$29>>2] = $28;
  $30 = (60 - ($i$139))|0;
  $31 = ($30|0)>(0);
  if ($31) {
   $i$01$i14 = 0;$sum$02$i13 = 0.0;
   while(1) {
    $$sum20 = (($i$139) + ($i$01$i14))|0;
    $33 = (($Imr) + ($$sum20<<2)|0);
    $34 = +HEAPF32[$33>>2];
    $35 = (($Imr) + ($i$01$i14<<2)|0);
    $36 = +HEAPF32[$35>>2];
    $37 = $34 * $36;
    $38 = $sum$02$i13 + $37;
    $39 = (($i$01$i14) + 1)|0;
    $exitcond$i15 = ($39|0)==($30|0);
    if ($exitcond$i15) {
     break;
    } else {
     $i$01$i14 = $39;$sum$02$i13 = $38;
    }
   }
   $40 = (($ImrCorr) + ($i$139<<2)|0);
   HEAPF32[$40>>2] = $38;
   $i$01$i9 = 0;$sum$02$i8 = 0.0;
   while(1) {
    $$sum = (($i$139) + ($i$01$i9))|0;
    $41 = (($Tv) + ($$sum<<2)|0);
    $42 = +HEAPF32[$41>>2];
    $43 = (($Imr) + ($i$01$i9<<2)|0);
    $44 = +HEAPF32[$43>>2];
    $45 = $42 * $44;
    $46 = $sum$02$i8 + $45;
    $47 = (($i$01$i9) + 1)|0;
    $exitcond$i10 = ($47|0)==($30|0);
    if ($exitcond$i10) {
     $sum$0$lcssa$i = $46;
     break;
    } else {
     $i$01$i9 = $47;$sum$02$i8 = $46;
    }
   }
  } else {
   $32 = (($ImrCorr) + ($i$139<<2)|0);
   HEAPF32[$32>>2] = 0.0;
   $sum$0$lcssa$i = 0.0;
  }
  $48 = (($ErrBlk) + ($i$139<<2)|0);
  HEAPF32[$48>>2] = $sum$0$lcssa$i;
  $49 = (($i$139) + 1)|0;
  $exitcond49 = ($49|0)==(60);
  if ($exitcond49) {
   break;
  } else {
   $i$139 = $49;
  }
 }
 $17 = (($Temp) + 4|0);
 $18 = +HEAPF32[$ImrCorr>>2];
 $19 = (($Temp) + 8|0);
 $20 = (($Temp) + 16|0);
 $21 = (($Temp) + 40|0);
 $22 = ($Np|0)>(1);
 $23 = ($Np|0)>(0);
 $24 = (($Best) + 4|0);
 $25 = (($Best) + 8|0);
 $26 = (($Best) + 12|0);
 $k$037 = 0;
 while(1) {
  HEAP32[$17>>2] = $k$037;
  $Acc1$03 = 0.0;$i$24 = $k$037;
  while(1) {
   $50 = (($ErrBlk) + ($i$24<<2)|0);
   $51 = +HEAPF32[$50>>2];
   $fabsf2 = (+Math_abs((+$51)));
   $52 = !($fabsf2 >= $Acc1$03);
   if ($52) {
    $Acc1$1 = $Acc1$03;
   } else {
    HEAP32[$20>>2] = $i$24;
    $Acc1$1 = $fabsf2;
   }
   $53 = (($i$24) + 2)|0;
   $54 = ($53|0)<(60);
   if ($54) {
    $Acc1$03 = $Acc1$1;$i$24 = $53;
   } else {
    $Acc1$27 = 32767.0;$MaxAmpId$06 = 22;$i$38 = 22;
    break;
   }
  }
  while(1) {
   $55 = (13280 + ($i$38<<2)|0);
   $56 = +HEAPF32[$55>>2];
   $57 = $56 * $18;
   $58 = $57 - $Acc1$1;
   $fabsf1 = (+Math_abs((+$58)));
   $59 = $fabsf1 < $Acc1$27;
   $MaxAmpId$1 = $59 ? $i$38 : $MaxAmpId$06;
   $Acc1$3 = $59 ? $fabsf1 : $Acc1$27;
   $60 = (($i$38) + -1)|0;
   $61 = ($60|0)>(1);
   if ($61) {
    $Acc1$27 = $Acc1$3;$MaxAmpId$06 = $MaxAmpId$1;$i$38 = $60;
   } else {
    break;
   }
  }
  $62 = (($MaxAmpId$1) + -3)|0;
  $i$435 = 1;
  while(1) {
   $j$09 = $k$037;
   while(1) {
    $63 = (($ErrBlk) + ($j$09<<2)|0);
    $64 = +HEAPF32[$63>>2];
    $65 = (($WrkBlk) + ($j$09<<2)|0);
    HEAPF32[$65>>2] = $64;
    $66 = (($OccPos) + ($j$09<<2)|0);
    HEAPF32[$66>>2] = 0.0;
    $67 = (($j$09) + 2)|0;
    $68 = ($67|0)<(60);
    if ($68) {
     $j$09 = $67;
    } else {
     break;
    }
   }
   $69 = (($62) + ($i$435))|0;
   HEAP32[$19>>2] = $69;
   $70 = (13280 + ($69<<2)|0);
   $71 = +HEAPF32[$70>>2];
   $72 = HEAP32[$20>>2]|0;
   $73 = (($WrkBlk) + ($72<<2)|0);
   $74 = +HEAPF32[$73>>2];
   $75 = !($74 >= 0.0);
   if ($75) {
    $76 = -$71;
    $storemerge21 = $76;
   } else {
    $storemerge21 = $71;
   }
   HEAPF32[$21>>2] = $storemerge21;
   $77 = (($OccPos) + ($72<<2)|0);
   HEAPF32[$77>>2] = 1.0;
   if ($22) {
    $78 = -$71;
    $86 = $72;$91 = $storemerge21;$j$117 = 1;
    while(1) {
     $79 = ((($Temp) + ($j$117<<2)|0) + 16|0);
     $Acc1$413 = -32768.0;$l$012 = $k$037;
     while(1) {
      $80 = (($OccPos) + ($l$012<<2)|0);
      $81 = +HEAPF32[$80>>2];
      $82 = $81 != 0.0;
      if ($82) {
       $Acc1$5 = $Acc1$413;
      } else {
       $83 = (($WrkBlk) + ($l$012<<2)|0);
       $84 = +HEAPF32[$83>>2];
       $85 = (($l$012) - ($86))|0;
       $ispos = ($85|0)>(-1);
       $neg = (0 - ($85))|0;
       $87 = $ispos ? $85 : $neg;
       $88 = (($ImrCorr) + ($87<<2)|0);
       $89 = +HEAPF32[$88>>2];
       $90 = $91 * $89;
       $92 = $84 - $90;
       HEAPF32[$83>>2] = $92;
       $fabsf = (+Math_abs((+$92)));
       $93 = $fabsf > $Acc1$413;
       if ($93) {
        HEAP32[$79>>2] = $l$012;
        $Acc1$5 = $fabsf;
       } else {
        $Acc1$5 = $Acc1$413;
       }
      }
      $94 = (($l$012) + 2)|0;
      $95 = ($94|0)<(60);
      if ($95) {
       $Acc1$413 = $Acc1$5;$l$012 = $94;
      } else {
       break;
      }
     }
     $96 = HEAP32[$79>>2]|0;
     $97 = (($WrkBlk) + ($96<<2)|0);
     $98 = +HEAPF32[$97>>2];
     $99 = !($98 >= 0.0);
     $100 = ((($Temp) + ($j$117<<2)|0) + 40|0);
     $storemerge = $99 ? $78 : $71;
     HEAPF32[$100>>2] = $storemerge;
     $101 = (($OccPos) + ($96<<2)|0);
     HEAPF32[$101>>2] = 1.0;
     $102 = (($j$117) + 1)|0;
     $exitcond = ($102|0)==($Np|0);
     if ($exitcond) {
      break;
     } else {
      $86 = $96;$91 = $storemerge;$j$117 = $102;
     }
    }
   }
   _memset(($OccPos|0),0,240)|0;
   if ($23) {
    $j$321 = 0;
    while(1) {
     $103 = ((($Temp) + ($j$321<<2)|0) + 40|0);
     $104 = +HEAPF32[$103>>2];
     $105 = ((($Temp) + ($j$321<<2)|0) + 16|0);
     $106 = HEAP32[$105>>2]|0;
     $107 = (($OccPos) + ($106<<2)|0);
     HEAPF32[$107>>2] = $104;
     $108 = (($j$321) + 1)|0;
     $exitcond42 = ($108|0)==($Np|0);
     if ($exitcond42) {
      $l$129 = 59;
      break;
     } else {
      $j$321 = $108;
     }
    }
   } else {
    $l$129 = 59;
   }
   while(1) {
    if ($23) {
     $Acc0$025 = 0.0;$j$424 = 0;
     while(1) {
      $109 = ((($Temp) + ($j$424<<2)|0) + 16|0);
      $110 = HEAP32[$109>>2]|0;
      $111 = ($l$129|0)<($110|0);
      if ($111) {
       $Acc0$1 = $Acc0$025;
      } else {
       $112 = (($OccPos) + ($110<<2)|0);
       $113 = +HEAPF32[$112>>2];
       $114 = (($l$129) - ($110))|0;
       $115 = (($Imr) + ($114<<2)|0);
       $116 = +HEAPF32[$115>>2];
       $117 = $113 * $116;
       $118 = $Acc0$025 + $117;
       $Acc0$1 = $118;
      }
      $119 = (($j$424) + 1)|0;
      $exitcond43 = ($119|0)==($Np|0);
      if ($exitcond43) {
       $Acc0$0$lcssa = $Acc0$1;
       break;
      } else {
       $Acc0$025 = $Acc0$1;$j$424 = $119;
      }
     }
    } else {
     $Acc0$0$lcssa = 0.0;
    }
    $120 = (($OccPos) + ($l$129<<2)|0);
    HEAPF32[$120>>2] = $Acc0$0$lcssa;
    $121 = (($l$129) + -1)|0;
    $122 = ($l$129|0)>(0);
    if ($122) {
     $l$129 = $121;
    } else {
     $i$01$i4 = 0;$sum$02$i3 = 0.0;
     break;
    }
   }
   while(1) {
    $123 = (($Tv) + ($i$01$i4<<2)|0);
    $124 = +HEAPF32[$123>>2];
    $125 = (($OccPos) + ($i$01$i4<<2)|0);
    $126 = +HEAPF32[$125>>2];
    $127 = $124 * $126;
    $128 = (($i$01$i4) + 1)|0;
    $129 = (($Tv) + ($128<<2)|0);
    $130 = +HEAPF32[$129>>2];
    $131 = (($OccPos) + ($128<<2)|0);
    $132 = +HEAPF32[$131>>2];
    $133 = $130 * $132;
    $134 = $127 + $133;
    $135 = (($i$01$i4) + 2)|0;
    $136 = (($Tv) + ($135<<2)|0);
    $137 = +HEAPF32[$136>>2];
    $138 = (($OccPos) + ($135<<2)|0);
    $139 = +HEAPF32[$138>>2];
    $140 = $137 * $139;
    $141 = $134 + $140;
    $142 = $sum$02$i3 + $141;
    $143 = (($i$01$i4) + 3)|0;
    $144 = ($143|0)<(60);
    if ($144) {
     $i$01$i4 = $143;$sum$02$i3 = $142;
    } else {
     break;
    }
   }
   $145 = $142 * 2.0;
   $i$01$i = 0;$sum$02$i = 0.0;
   while(1) {
    $146 = (($OccPos) + ($i$01$i<<2)|0);
    $147 = +HEAPF32[$146>>2];
    $148 = $147 * $147;
    $149 = (($i$01$i) + 1)|0;
    $150 = (($OccPos) + ($149<<2)|0);
    $151 = +HEAPF32[$150>>2];
    $152 = $151 * $151;
    $153 = $148 + $152;
    $154 = (($i$01$i) + 2)|0;
    $155 = (($OccPos) + ($154<<2)|0);
    $156 = +HEAPF32[$155>>2];
    $157 = $156 * $156;
    $158 = $153 + $157;
    $159 = $sum$02$i + $158;
    $160 = (($i$01$i) + 3)|0;
    $161 = ($160|0)<(60);
    if ($161) {
     $i$01$i = $160;$sum$02$i = $159;
    } else {
     break;
    }
   }
   $162 = $145 - $159;
   $163 = +HEAPF32[$Best>>2];
   $164 = $162 > $163;
   if ($164) {
    HEAPF32[$Best>>2] = $162;
    $165 = HEAP32[$17>>2]|0;
    HEAP32[$24>>2] = $165;
    $166 = HEAP32[$19>>2]|0;
    HEAP32[$25>>2] = $166;
    $167 = HEAP32[$1>>2]|0;
    HEAP32[$26>>2] = $167;
    if ($23) {
     $j$532 = 0;
     while(1) {
      $168 = ((($Temp) + ($j$532<<2)|0) + 40|0);
      $169 = +HEAPF32[$168>>2];
      $170 = ((($Best) + ($j$532<<2)|0) + 40|0);
      HEAPF32[$170>>2] = $169;
      $171 = ((($Temp) + ($j$532<<2)|0) + 16|0);
      $172 = HEAP32[$171>>2]|0;
      $173 = ((($Best) + ($j$532<<2)|0) + 16|0);
      HEAP32[$173>>2] = $172;
      $174 = (($j$532) + 1)|0;
      $exitcond44 = ($174|0)==($Np|0);
      if ($exitcond44) {
       break;
      } else {
       $j$532 = $174;
      }
     }
    }
   }
   $175 = (($i$435) + 1)|0;
   $exitcond47 = ($175|0)==(5);
   if ($exitcond47) {
    break;
   } else {
    $i$435 = $175;
   }
  }
  $176 = (($k$037) + 1)|0;
  $exitcond48 = ($176|0)==(2);
  if ($exitcond48) {
   break;
  } else {
   $k$037 = $176;
  }
 }
 STACKTOP = sp;return;
}
function _Fcbk_Unpk($Tv,$Sfs,$Olp,$Sfc) {
 $Tv = $Tv|0;
 $Sfs = $Sfs|0;
 $Olp = $Olp|0;
 $Sfc = $Sfc|0;
 var $$ = 0.0, $$1 = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0.0, $104 = 0.0, $105 = 0, $106 = 0.0, $107 = 0.0, $108 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0;
 var $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0.0, $26 = 0.0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0.0, $47 = 0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0.0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0.0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0.0, $Acc0$03 = 0, $Acc0$1 = 0, $Tmp$i = 0, $Tmp0$03$i = 0, $Tv_tmp = 0, $exitcond = 0, $exitcond$i = 0, $exitcond6$i = 0, $i$05$i = 0;
 var $i$11$i = 0, $i$12 = 0, $i$55 = 0, $j$01 = 0, $j$1 = 0, $storemerge19 = 0.0, $storemerge21 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 496|0;
 $Tmp$i = sp + 256|0;
 $Tv_tmp = sp;
 $0 = HEAP32[39864>>2]|0;
 if ((($0|0) == 1)) {
  _memset(($Tv_tmp|0),0,256)|0;
  $53 = (($Sfs) + 8|0);
  $54 = HEAP32[$53>>2]|0;
  $55 = (13280 + ($54<<2)|0);
  $56 = +HEAPF32[$55>>2];
  $57 = (($Sfs) + 12|0);
  $58 = HEAP32[$57>>2]|0;
  $59 = (($Sfs) + 20|0);
  $60 = HEAP32[$59>>2]|0;
  $61 = (($Sfs) + 24|0);
  $62 = HEAP32[$61>>2]|0;
  $63 = -$56;
  $64 = $62 << 3;
  $65 = $64 & 56;
  $66 = (($58) + ($65))|0;
  $67 = $60 & 1;
  $68 = ($67|0)==(0);
  $69 = (($Tv_tmp) + ($66<<2)|0);
  $$ = $68 ? $63 : $56;
  HEAPF32[$69>>2] = $$;
  $70 = $62 & 56;
  $71 = (($58) + 2)|0;
  $72 = (($71) + ($70))|0;
  $73 = $60 & 2;
  $74 = ($73|0)==(0);
  $75 = (($Tv_tmp) + ($72<<2)|0);
  $storemerge19 = $74 ? $63 : $56;
  HEAPF32[$75>>2] = $storemerge19;
  $76 = $62 >>> 3;
  $77 = $76 & 56;
  $78 = (($58) + 4)|0;
  $79 = (($78) + ($77))|0;
  $80 = $60 & 4;
  $81 = ($80|0)==(0);
  $82 = (($Tv_tmp) + ($79<<2)|0);
  $$1 = $81 ? $63 : $56;
  HEAPF32[$82>>2] = $$1;
  $83 = $62 >>> 6;
  $84 = $83 & 56;
  $85 = (($58) + 6)|0;
  $86 = (($85) + ($84))|0;
  $87 = $60 & 8;
  $88 = ($87|0)==(0);
  $89 = (($Tv_tmp) + ($86<<2)|0);
  $storemerge21 = $88 ? $63 : $56;
  HEAPF32[$89>>2] = $storemerge21;
  _memcpy(($Tv|0),($Tv_tmp|0),240)|0;
  $90 = (($Olp) + -1)|0;
  $91 = HEAP32[$Sfs>>2]|0;
  $92 = (($90) + ($91))|0;
  $93 = (($Sfs) + 4|0);
  $94 = HEAP32[$93>>2]|0;
  $95 = (34528 + ($94<<2)|0);
  $96 = HEAP32[$95>>2]|0;
  $97 = (($96) + ($92))|0;
  $98 = (35208 + ($94<<2)|0);
  $99 = +HEAPF32[$98>>2];
  $100 = ($97|0)<(58);
  if ($100) {
   $i$55 = $97;
  } else {
   STACKTOP = sp;return;
  }
  while(1) {
   $101 = (($i$55) - ($97))|0;
   $102 = (($Tv) + ($101<<2)|0);
   $103 = +HEAPF32[$102>>2];
   $104 = $103 * $99;
   $105 = (($Tv) + ($i$55<<2)|0);
   $106 = +HEAPF32[$105>>2];
   $107 = $106 + $104;
   HEAPF32[$105>>2] = $107;
   $108 = (($i$55) + 1)|0;
   $exitcond = ($108|0)==(60);
   if ($exitcond) {
    break;
   } else {
    $i$55 = $108;
   }
  }
  STACKTOP = sp;return;
 } else if ((($0|0) == 0)) {
  $1 = (13264 + ($Sfc<<2)|0);
  $2 = HEAP32[$1>>2]|0;
  _memset(($Tv|0),0,240)|0;
  $3 = (($Sfs) + 24|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = (13376 + ($Sfc<<2)|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = ($4|0)<($6|0);
  if (!($7)) {
   STACKTOP = sp;return;
  }
  $8 = (6 - ($2))|0;
  $9 = (($Sfs) + 20|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = (($Sfs) + 8|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = (13280 + ($12<<2)|0);
  $14 = (($Sfs) + 12|0);
  $15 = HEAP32[$14>>2]|0;
  $Acc0$03 = $4;$i$12 = 0;$j$01 = $8;
  while(1) {
   $16 = ((13392 + (($j$01*120)|0)|0) + ($i$12<<2)|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = (($Acc0$03) - ($17))|0;
   $19 = ($18|0)<(0);
   if ($19) {
    $20 = (($j$01) + 1)|0;
    $21 = (5 - ($j$01))|0;
    $22 = 1 << $21;
    $23 = $10 & $22;
    $24 = ($23|0)==(0);
    $25 = +HEAPF32[$13>>2];
    if ($24) {
     $30 = $i$12 << 1;
     $31 = (($15) + ($30))|0;
     $32 = (($Tv) + ($31<<2)|0);
     HEAPF32[$32>>2] = $25;
    } else {
     $26 = -$25;
     $27 = $i$12 << 1;
     $28 = (($15) + ($27))|0;
     $29 = (($Tv) + ($28<<2)|0);
     HEAPF32[$29>>2] = $26;
    }
    $33 = ($20|0)==(6);
    if ($33) {
     break;
    } else {
     $Acc0$1 = $Acc0$03;$j$1 = $20;
    }
   } else {
    $Acc0$1 = $18;$j$1 = $j$01;
   }
   $34 = (($i$12) + 1)|0;
   $35 = ($34|0)<(30);
   if ($35) {
    $Acc0$03 = $Acc0$1;$i$12 = $34;$j$01 = $j$1;
   } else {
    break;
   }
  }
  $36 = (($Sfs) + 16|0);
  $37 = HEAP32[$36>>2]|0;
  $38 = ($37|0)==(1);
  if (!($38)) {
   STACKTOP = sp;return;
  }
  $i$05$i = 0;
  while(1) {
   $40 = (($Tv) + ($i$05$i<<2)|0);
   $41 = +HEAPF32[$40>>2];
   $42 = (($Tmp$i) + ($i$05$i<<2)|0);
   HEAPF32[$42>>2] = $41;
   $43 = (($i$05$i) + 1)|0;
   $exitcond6$i = ($43|0)==(60);
   if ($exitcond6$i) {
    break;
   } else {
    $i$05$i = $43;
   }
  }
  $39 = ($Olp|0)<(60);
  if ($39) {
   $Tmp0$03$i = $Olp;
  } else {
   STACKTOP = sp;return;
  }
  while(1) {
   $i$11$i = $Tmp0$03$i;
   while(1) {
    $44 = (($i$11$i) - ($Tmp0$03$i))|0;
    $45 = (($Tmp$i) + ($44<<2)|0);
    $46 = +HEAPF32[$45>>2];
    $47 = (($Tv) + ($i$11$i<<2)|0);
    $48 = +HEAPF32[$47>>2];
    $49 = $46 + $48;
    HEAPF32[$47>>2] = $49;
    $50 = (($i$11$i) + 1)|0;
    $exitcond$i = ($50|0)==(60);
    if ($exitcond$i) {
     break;
    } else {
     $i$11$i = $50;
    }
   }
   $51 = (($Tmp0$03$i) + ($Olp))|0;
   $52 = ($51|0)<(60);
   if ($52) {
    $Tmp0$03$i = $51;
   } else {
    break;
   }
  }
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _Update_Err($Olp,$AcLg,$AcGn) {
 $Olp = $Olp|0;
 $AcLg = $AcLg|0;
 $AcGn = $AcGn|0;
 var $$ = 0, $$1 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0.0;
 var $43 = 0.0, $44 = 0.0, $45 = 0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, $Worst0$0 = 0.0, $Worst0$1 = 0.0, $Worst0$2 = 0.0, $Worst1$0 = 0.0;
 var $Worst1$1 = 0.0, $ptr_tab$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($Olp) + -1)|0;
 $1 = (($0) + ($AcLg))|0;
 $2 = HEAP32[36992>>2]|0;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = ($Olp|0)>(57);
  $$ = $4 ? 35888 : 36568;
  $ptr_tab$0 = $$;
 } else {
  $ptr_tab$0 = 35888;
 }
 $5 = (($ptr_tab$0) + ($AcGn<<2)|0);
 $6 = +HEAPF32[$5>>2];
 $7 = ($1|0)<(31);
 do {
  if ($7) {
   $8 = +HEAPF32[((37008 + 2432|0))>>2];
   $9 = $6 * $8;
   $10 = $9 + 3.8146399674587883E-6;
   $Worst0$1 = $10;$Worst1$0 = $10;
  } else {
   $11 = ($1*1092)|0;
   $12 = $11 >> 15;
   $13 = ($12*30)|0;
   $14 = (($13) + 30)|0;
   $15 = ($14|0)==($1|0);
   if ($15) {
    $40 = (($12) + -1)|0;
    $41 = ((37008 + ($40<<2)|0) + 2432|0);
    $42 = +HEAPF32[$41>>2];
    $43 = $6 * $42;
    $44 = $43 + 3.8146399674587883E-6;
    $45 = ((37008 + ($12<<2)|0) + 2432|0);
    $46 = +HEAPF32[$45>>2];
    $47 = $6 * $46;
    $48 = $47 + 3.8146399674587883E-6;
    $Worst0$1 = $44;$Worst1$0 = $48;
    break;
   }
   $16 = ($12|0)==(1);
   if ($16) {
    $17 = +HEAPF32[((37008 + 2432|0))>>2];
    $18 = $6 * $17;
    $19 = $18 + 3.8146399674587883E-6;
    $20 = +HEAPF32[((37008 + 2436|0))>>2];
    $21 = $6 * $20;
    $22 = $21 + 3.8146399674587883E-6;
    $23 = $19 > $22;
    $$1 = $23 ? $19 : $22;
    $Worst0$1 = $$1;$Worst1$0 = $$1;
    break;
   }
   $24 = (($12) + -1)|0;
   $25 = ((37008 + ($24<<2)|0) + 2432|0);
   $26 = +HEAPF32[$25>>2];
   $27 = $6 * $26;
   $28 = $27 + 3.8146399674587883E-6;
   $29 = (($12) + -2)|0;
   $30 = ((37008 + ($29<<2)|0) + 2432|0);
   $31 = +HEAPF32[$30>>2];
   $32 = $6 * $31;
   $33 = $32 + 3.8146399674587883E-6;
   $34 = $28 > $33;
   $Worst0$0 = $34 ? $28 : $33;
   $35 = ((37008 + ($12<<2)|0) + 2432|0);
   $36 = +HEAPF32[$35>>2];
   $37 = $6 * $36;
   $38 = $37 + 3.8146399674587883E-6;
   $39 = $28 > $38;
   if ($39) {
    $Worst0$1 = $Worst0$0;$Worst1$0 = $28;
   } else {
    $Worst0$1 = $Worst0$0;$Worst1$0 = $38;
   }
  }
 } while(0);
 $49 = $Worst1$0 > 256.0;
 $50 = $Worst0$1 > 256.0;
 $51 = +HEAPF32[((37008 + 2440|0))>>2];
 HEAPF32[((37008 + 2448|0))>>2] = $51;
 $52 = +HEAPF32[((37008 + 2436|0))>>2];
 HEAPF32[((37008 + 2444|0))>>2] = $52;
 $53 = +HEAPF32[((37008 + 2432|0))>>2];
 HEAPF32[((37008 + 2440|0))>>2] = $53;
 $Worst0$2 = $50 ? 256.0 : $Worst0$1;
 $Worst1$1 = $49 ? 256.0 : $Worst1$0;
 HEAPF32[((37008 + 2432|0))>>2] = $Worst0$2;
 HEAPF32[((37008 + 2436|0))>>2] = $Worst1$1;
 STACKTOP = sp;return;
}
function _Decod_Acbk($Tv,$PrevExc,$Codec_Info,$Olp,$Lid,$Gid) {
 $Tv = $Tv|0;
 $PrevExc = $PrevExc|0;
 $Codec_Info = $Codec_Info|0;
 $Olp = $Olp|0;
 $Lid = $Lid|0;
 $Gid = $Gid|0;
 var $$ = 0, $$phi$trans$insert = 0, $$phi$trans$insert12 = 0, $$pre = 0.0, $$pre11 = 0.0, $$pre13 = 0.0, $$sum = 0, $$sum10 = 0, $$sum12 = 0, $$sum45 = 0, $$sum78 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0;
 var $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0;
 var $34 = 0.0, $34$phi = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $38$phi = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0, $5 = 0;
 var $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, $RezBuf = 0, $exitcond = 0, $exitcond$i = 0, $i$0 = 0, $i$11 = 0, $i$11$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0;
 $RezBuf = sp;
 $0 = (($Olp) + -1)|0;
 $1 = (($0) + ($Lid))|0;
 $2 = (143 - ($1))|0;
 $3 = (($PrevExc) + ($2<<2)|0);
 $4 = +HEAPF32[$3>>2];
 HEAPF32[$RezBuf>>2] = $4;
 $5 = (($2) + 1)|0;
 $6 = (($PrevExc) + ($5<<2)|0);
 $7 = +HEAPF32[$6>>2];
 $8 = (($RezBuf) + 4|0);
 HEAPF32[$8>>2] = $7;
 $9 = (145 - ($1))|0;
 $i$11$i = 0;
 while(1) {
  $10 = (($i$11$i|0) % ($1|0))&-1;
  $11 = (($9) + ($10))|0;
  $12 = (($PrevExc) + ($11<<2)|0);
  $13 = +HEAPF32[$12>>2];
  $14 = (($i$11$i) + 2)|0;
  $15 = (($RezBuf) + ($14<<2)|0);
  HEAPF32[$15>>2] = $13;
  $16 = (($i$11$i) + 1)|0;
  $exitcond$i = ($16|0)==(62);
  if ($exitcond$i) {
   break;
  } else {
   $i$11$i = $16;
  }
 }
 $17 = HEAP32[$Codec_Info>>2]|0;
 $18 = ($17|0)==(0);
 if ($18) {
  $19 = ($Olp|0)>(57);
  $$ = $19&1;
  $i$0 = $$;
 } else {
  $i$0 = 1;
 }
 $20 = (34512 + ($i$0<<2)|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ($Gid*20)|0;
 $23 = (($21) + ($22<<2)|0);
 $$sum12 = $22 | 1;
 $24 = (($21) + ($$sum12<<2)|0);
 $$sum45 = $22 | 2;
 $25 = (($21) + ($$sum45<<2)|0);
 $$sum78 = $22 | 3;
 $26 = (($21) + ($$sum78<<2)|0);
 $$sum10 = (($22) + 4)|0;
 $27 = (($21) + ($$sum10<<2)|0);
 $$pre = +HEAPF32[$8>>2];
 $$phi$trans$insert = (($RezBuf) + 8|0);
 $$pre11 = +HEAPF32[$$phi$trans$insert>>2];
 $$phi$trans$insert12 = (($RezBuf) + 12|0);
 $$pre13 = +HEAPF32[$$phi$trans$insert12>>2];
 $34 = $$pre;$38 = $$pre11;$42 = $$pre13;$i$11 = 0;
 while(1) {
  $28 = (($RezBuf) + ($i$11<<2)|0);
  $29 = +HEAPF32[$28>>2];
  $30 = +HEAPF32[$23>>2];
  $31 = $29 * $30;
  $$sum = (($i$11) + 1)|0;
  $32 = +HEAPF32[$24>>2];
  $33 = $34 * $32;
  $35 = $31 + $33;
  $36 = +HEAPF32[$25>>2];
  $37 = $38 * $36;
  $39 = $35 + $37;
  $40 = +HEAPF32[$26>>2];
  $41 = $42 * $40;
  $43 = $39 + $41;
  $$sum9 = (($i$11) + 4)|0;
  $44 = (($RezBuf) + ($$sum9<<2)|0);
  $45 = +HEAPF32[$44>>2];
  $46 = +HEAPF32[$27>>2];
  $47 = $45 * $46;
  $48 = $43 + $47;
  $49 = (($Tv) + ($i$11<<2)|0);
  HEAPF32[$49>>2] = $48;
  $exitcond = ($$sum|0)==(60);
  if ($exitcond) {
   break;
  } else {
   $38$phi = $42;$34$phi = $38;$42 = $45;$i$11 = $$sum;$38 = $38$phi;$34 = $34$phi;
  }
 }
 STACKTOP = sp;return;
}
function _Comp_Lpf($agg$result,$Buff,$Olp,$Sfc) {
 $agg$result = $agg$result|0;
 $Buff = $Buff|0;
 $Olp = $Olp|0;
 $Sfc = $Sfc|0;
 var $$Olp$i = 0, $$sum = 0, $$sum43 = 0, $$sum44 = 0, $$sum45 = 0, $$sum46 = 0, $$sum47 = 0, $$sum48 = 0, $$sum49 = 0, $$sum50 = 0, $$sum51 = 0, $$sum52 = 0, $$sum53 = 0, $$sum54 = 0, $$sum56 = 0, $$sum58 = 0, $$sum60 = 0, $$sum61 = 0, $$sum62 = 0, $$sum63 = 0;
 var $$sum64 = 0, $$sum65 = 0, $$sum66 = 0, $$sum68 = 0, $$sum70 = 0, $$sum72 = 0, $$sum73 = 0, $$sum74 = 0, $$sum75 = 0, $$sum76 = 0, $$sum77 = 0, $$sum78 = 0, $$sum80 = 0, $$sum82 = 0, $0 = 0, $1 = 0, $10 = 0.0, $100 = 0, $101 = 0.0, $102 = 0.0;
 var $103 = 0.0, $104 = 0.0, $105 = 0, $106 = 0, $107 = 0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0, $111 = 0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0, $116 = 0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0.0, $127 = 0, $128 = 0.0, $129 = 0.0, $13 = 0.0, $130 = 0, $131 = 0, $132 = 0.0, $133 = 0, $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0, $138 = 0, $139 = 0.0;
 var $14 = 0, $140 = 0, $141 = 0.0, $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0, $146 = 0, $147 = 0, $148 = 0.0, $149 = 0.0, $15 = 0.0, $150 = 0, $151 = 0, $152 = 0.0, $153 = 0.0, $154 = 0.0, $155 = 0, $156 = 0, $157 = 0.0;
 var $158 = 0.0, $159 = 0.0, $16 = 0.0, $160 = 0.0, $161 = 0, $162 = 0, $163 = 0.0, $164 = 0.0, $165 = 0.0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0.0, $170 = 0.0, $171 = 0.0, $172 = 0, $173 = 0, $174 = 0.0, $175 = 0.0;
 var $176 = 0.0, $177 = 0.0, $178 = 0.0, $179 = 0.0, $18 = 0, $180 = 0.0, $181 = 0.0, $182 = 0, $183 = 0.0, $184 = 0.0, $185 = 0.0, $186 = 0.0, $187 = 0.0, $188 = 0.0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0.0;
 var $194 = 0.0, $195 = 0, $196 = 0, $197 = 0.0, $198 = 0.0, $199 = 0.0, $2 = 0, $20 = 0.0, $200 = 0.0, $201 = 0.0, $202 = 0.0, $203 = 0.0, $204 = 0.0, $205 = 0, $206 = 0.0, $207 = 0.0, $208 = 0.0, $209 = 0.0, $21 = 0, $210 = 0.0;
 var $211 = 0.0, $212 = 0.0, $213 = 0, $214 = 0.0, $215 = 0.0, $216 = 0.0, $217 = 0, $218 = 0, $219 = 0, $22 = 0.0, $220 = 0, $221 = 0.0, $222 = 0.0, $223 = 0, $224 = 0, $225 = 0.0, $226 = 0.0, $227 = 0.0, $228 = 0.0, $229 = 0.0;
 var $23 = 0.0, $230 = 0.0, $231 = 0.0, $232 = 0.0, $233 = 0, $234 = 0.0, $235 = 0.0, $236 = 0.0, $237 = 0.0, $238 = 0.0, $239 = 0.0, $24 = 0.0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0.0, $245 = 0.0, $246 = 0, $247 = 0;
 var $248 = 0.0, $249 = 0.0, $25 = 0.0, $250 = 0.0, $251 = 0.0, $252 = 0.0, $253 = 0.0, $254 = 0.0, $255 = 0.0, $256 = 0, $257 = 0.0, $258 = 0.0, $259 = 0.0, $26 = 0, $260 = 0, $261 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0.0, $38 = 0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0, $43 = 0.0, $44 = 0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0.0, $69 = 0.0, $7 = 0.0, $70 = 0, $71 = 0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0, $76 = 0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0.0, $87 = 0, $88 = 0.0, $89 = 0.0, $9 = 0.0, $90 = 0, $91 = 0, $92 = 0.0, $93 = 0, $94 = 0.0, $95 = 0.0, $96 = 0.0, $97 = 0, $98 = 0, $99 = 0.0, $Acc1$03$i = 0.0, $Acc1$03$i2 = 0.0, $Acc1$1$i = 0.0, $Acc1$1$i10 = 0.0;
 var $Indx$02$i = 0, $Indx$02$i3 = 0, $Indx$1$i = 0, $Indx$1$i9 = 0, $Lcr$sroa$10$0 = 0.0, $Lcr$sroa$14$0 = 0.0, $Lcr$sroa$19$0 = 0.0, $Lcr$sroa$5$0 = 0.0, $Pf$sroa$0$0 = 0, $Pf$sroa$0$1 = 0, $Pf$sroa$0$2 = 0, $Pf$sroa$10$0$i = 0.0, $Pf$sroa$10$0$i15 = 0.0, $Pf$sroa$10$0$i28 = 0.0, $Pf$sroa$10$0$i41 = 0.0, $Pf$sroa$2$0$i = 0.0, $Pf$sroa$2$0$i12 = 0.0, $Pf$sroa$2$0$i25 = 0.0, $Pf$sroa$2$0$i38 = 0.0, $Pf$sroa$2$1$i = 0.0;
 var $Pf$sroa$2$1$i14 = 0.0, $Pf$sroa$2$1$i27 = 0.0, $Pf$sroa$2$1$i40 = 0.0, $Pf$sroa$7$0 = 0.0, $Pf$sroa$7$1 = 0.0, $Pf$sroa$7$2 = 0.0, $Pf$sroa$8$0 = 0.0, $Pf$sroa$8$1 = 0.0, $Pf$sroa$8$2 = 0.0, $fabsf$i = 0.0, $fabsf$i13 = 0.0, $fabsf$i26 = 0.0, $fabsf$i39 = 0.0, $i$01$i = 0, $i$01$i$i = 0, $i$01$i$i6 = 0, $i$01$i11 = 0, $i$01$i18 = 0, $i$01$i22 = 0, $i$01$i31 = 0;
 var $i$01$i35 = 0, $i$01$i4 = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, $sum$02$i = 0.0, $sum$02$i$i = 0.0, $sum$02$i$i5 = 0.0, $sum$02$i17 = 0.0, $sum$02$i21 = 0.0, $sum$02$i30 = 0.0, $sum$02$i34 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($Olp|0)>(142);
 $$Olp$i = $0 ? 142 : $Olp;
 $1 = (($$Olp$i) + -3)|0;
 $2 = (($$Olp$i) + 3)|0;
 $3 = ($Sfc*60)|0;
 $4 = (($3) + 145)|0;
 $Acc1$03$i = 0.0;$Indx$02$i = 0;$i$01$i = $1;
 while(1) {
  $5 = (($4) - ($i$01$i))|0;
  $i$01$i$i = 0;$sum$02$i$i = 0.0;
  while(1) {
   $$sum = (($4) + ($i$01$i$i))|0;
   $6 = (($Buff) + ($$sum<<2)|0);
   $7 = +HEAPF32[$6>>2];
   $$sum43 = (($5) + ($i$01$i$i))|0;
   $8 = (($Buff) + ($$sum43<<2)|0);
   $9 = +HEAPF32[$8>>2];
   $10 = $7 * $9;
   $11 = (($i$01$i$i) + 1)|0;
   $$sum44 = (($4) + ($11))|0;
   $12 = (($Buff) + ($$sum44<<2)|0);
   $13 = +HEAPF32[$12>>2];
   $$sum45 = (($5) + ($11))|0;
   $14 = (($Buff) + ($$sum45<<2)|0);
   $15 = +HEAPF32[$14>>2];
   $16 = $13 * $15;
   $17 = $10 + $16;
   $18 = (($i$01$i$i) + 2)|0;
   $$sum46 = (($4) + ($18))|0;
   $19 = (($Buff) + ($$sum46<<2)|0);
   $20 = +HEAPF32[$19>>2];
   $$sum47 = (($5) + ($18))|0;
   $21 = (($Buff) + ($$sum47<<2)|0);
   $22 = +HEAPF32[$21>>2];
   $23 = $20 * $22;
   $24 = $17 + $23;
   $25 = $sum$02$i$i + $24;
   $26 = (($i$01$i$i) + 3)|0;
   $27 = ($26|0)<(60);
   if ($27) {
    $i$01$i$i = $26;$sum$02$i$i = $25;
   } else {
    break;
   }
  }
  $28 = $25 > $Acc1$03$i;
  $Indx$1$i = $28 ? $i$01$i : $Indx$02$i;
  $Acc1$1$i = $28 ? $25 : $Acc1$03$i;
  $29 = (($i$01$i) + 1)|0;
  $30 = ($i$01$i|0)<($2|0);
  if ($30) {
   $Acc1$03$i = $Acc1$1$i;$Indx$02$i = $Indx$1$i;$i$01$i = $29;
  } else {
   break;
  }
 }
 $31 = (0 - ($Indx$1$i))|0;
 $32 = (($3) + 60)|0;
 $Acc1$03$i2 = 0.0;$Indx$02$i3 = 0;$i$01$i4 = $1;
 while(1) {
  $33 = (($32) + ($i$01$i4))|0;
  $34 = ($33|0)>(240);
  if ($34) {
   $Acc1$1$i10 = $Acc1$03$i2;$Indx$1$i9 = $Indx$02$i3;
  } else {
   $35 = (($i$01$i4) + ($4))|0;
   $i$01$i$i6 = 0;$sum$02$i$i5 = 0.0;
   while(1) {
    $$sum48 = (($4) + ($i$01$i$i6))|0;
    $36 = (($Buff) + ($$sum48<<2)|0);
    $37 = +HEAPF32[$36>>2];
    $$sum49 = (($35) + ($i$01$i$i6))|0;
    $38 = (($Buff) + ($$sum49<<2)|0);
    $39 = +HEAPF32[$38>>2];
    $40 = $37 * $39;
    $41 = (($i$01$i$i6) + 1)|0;
    $$sum50 = (($4) + ($41))|0;
    $42 = (($Buff) + ($$sum50<<2)|0);
    $43 = +HEAPF32[$42>>2];
    $$sum51 = (($35) + ($41))|0;
    $44 = (($Buff) + ($$sum51<<2)|0);
    $45 = +HEAPF32[$44>>2];
    $46 = $43 * $45;
    $47 = $40 + $46;
    $48 = (($i$01$i$i6) + 2)|0;
    $$sum52 = (($4) + ($48))|0;
    $49 = (($Buff) + ($$sum52<<2)|0);
    $50 = +HEAPF32[$49>>2];
    $$sum53 = (($35) + ($48))|0;
    $51 = (($Buff) + ($$sum53<<2)|0);
    $52 = +HEAPF32[$51>>2];
    $53 = $50 * $52;
    $54 = $47 + $53;
    $55 = $sum$02$i$i5 + $54;
    $56 = (($i$01$i$i6) + 3)|0;
    $57 = ($56|0)<(60);
    if ($57) {
     $i$01$i$i6 = $56;$sum$02$i$i5 = $55;
    } else {
     break;
    }
   }
   $58 = $55 > $Acc1$03$i2;
   if ($58) {
    $Acc1$1$i10 = $55;$Indx$1$i9 = $i$01$i4;
   } else {
    $Acc1$1$i10 = $Acc1$03$i2;$Indx$1$i9 = $Indx$02$i3;
   }
  }
  $59 = (($i$01$i4) + 1)|0;
  $60 = ($i$01$i4|0)<($2|0);
  if ($60) {
   $Acc1$03$i2 = $Acc1$1$i10;$Indx$02$i3 = $Indx$1$i9;$i$01$i4 = $59;
  } else {
   break;
  }
 }
 $61 = ($Indx$1$i|0)==(0);
 $62 = ($Indx$1$i9|0)==(0);
 $63 = $Indx$1$i9 | $31;
 $64 = ($63|0)==(0);
 if ($64) {
  HEAP32[$agg$result>>2] = 0;
  $65 = (($agg$result) + 4|0);
  HEAPF32[$65>>2] = 0.0;
  $66 = (($agg$result) + 8|0);
  HEAPF32[$66>>2] = 1.0;
  STACKTOP = sp;return;
 } else {
  $i$01$i11 = 0;$sum$02$i = 0.0;
 }
 while(1) {
  $$sum54 = (($4) + ($i$01$i11))|0;
  $67 = (($Buff) + ($$sum54<<2)|0);
  $68 = +HEAPF32[$67>>2];
  $69 = $68 * $68;
  $70 = (($i$01$i11) + 1)|0;
  $$sum56 = (($4) + ($70))|0;
  $71 = (($Buff) + ($$sum56<<2)|0);
  $72 = +HEAPF32[$71>>2];
  $73 = $72 * $72;
  $74 = $69 + $73;
  $75 = (($i$01$i11) + 2)|0;
  $$sum58 = (($4) + ($75))|0;
  $76 = (($Buff) + ($$sum58<<2)|0);
  $77 = +HEAPF32[$76>>2];
  $78 = $77 * $77;
  $79 = $74 + $78;
  $80 = $sum$02$i + $79;
  $81 = (($i$01$i11) + 3)|0;
  $82 = ($81|0)<(60);
  if ($82) {
   $i$01$i11 = $81;$sum$02$i = $80;
  } else {
   break;
  }
 }
 $83 = ($Indx$1$i|0)!=(0);
 if ($83) {
  $84 = (($4) - ($Indx$1$i))|0;
  $i$01$i18 = 0;$sum$02$i17 = 0.0;
  while(1) {
   $$sum72 = (($4) + ($i$01$i18))|0;
   $85 = (($Buff) + ($$sum72<<2)|0);
   $86 = +HEAPF32[$85>>2];
   $$sum73 = (($84) + ($i$01$i18))|0;
   $87 = (($Buff) + ($$sum73<<2)|0);
   $88 = +HEAPF32[$87>>2];
   $89 = $86 * $88;
   $90 = (($i$01$i18) + 1)|0;
   $$sum74 = (($4) + ($90))|0;
   $91 = (($Buff) + ($$sum74<<2)|0);
   $92 = +HEAPF32[$91>>2];
   $$sum75 = (($84) + ($90))|0;
   $93 = (($Buff) + ($$sum75<<2)|0);
   $94 = +HEAPF32[$93>>2];
   $95 = $92 * $94;
   $96 = $89 + $95;
   $97 = (($i$01$i18) + 2)|0;
   $$sum76 = (($4) + ($97))|0;
   $98 = (($Buff) + ($$sum76<<2)|0);
   $99 = +HEAPF32[$98>>2];
   $$sum77 = (($84) + ($97))|0;
   $100 = (($Buff) + ($$sum77<<2)|0);
   $101 = +HEAPF32[$100>>2];
   $102 = $99 * $101;
   $103 = $96 + $102;
   $104 = $sum$02$i17 + $103;
   $105 = (($i$01$i18) + 3)|0;
   $106 = ($105|0)<(60);
   if ($106) {
    $i$01$i18 = $105;$sum$02$i17 = $104;
   } else {
    $i$01$i22 = 0;$sum$02$i21 = 0.0;
    break;
   }
  }
  while(1) {
   $$sum78 = (($84) + ($i$01$i22))|0;
   $107 = (($Buff) + ($$sum78<<2)|0);
   $108 = +HEAPF32[$107>>2];
   $109 = $108 * $108;
   $110 = (($i$01$i22) + 1)|0;
   $$sum80 = (($84) + ($110))|0;
   $111 = (($Buff) + ($$sum80<<2)|0);
   $112 = +HEAPF32[$111>>2];
   $113 = $112 * $112;
   $114 = $109 + $113;
   $115 = (($i$01$i22) + 2)|0;
   $$sum82 = (($84) + ($115))|0;
   $116 = (($Buff) + ($$sum82<<2)|0);
   $117 = +HEAPF32[$116>>2];
   $118 = $117 * $117;
   $119 = $114 + $118;
   $120 = $sum$02$i21 + $119;
   $121 = (($i$01$i22) + 3)|0;
   $122 = ($121|0)<(60);
   if ($122) {
    $i$01$i22 = $121;$sum$02$i21 = $120;
   } else {
    $Lcr$sroa$10$0 = $120;$Lcr$sroa$5$0 = $104;
    break;
   }
  }
 } else {
  $Lcr$sroa$10$0 = 0.0;$Lcr$sroa$5$0 = 0.0;
 }
 $123 = ($Indx$1$i9|0)!=(0);
 if ($123) {
  $124 = (($Indx$1$i9) + ($4))|0;
  $i$01$i31 = 0;$sum$02$i30 = 0.0;
  while(1) {
   $$sum60 = (($4) + ($i$01$i31))|0;
   $125 = (($Buff) + ($$sum60<<2)|0);
   $126 = +HEAPF32[$125>>2];
   $$sum61 = (($124) + ($i$01$i31))|0;
   $127 = (($Buff) + ($$sum61<<2)|0);
   $128 = +HEAPF32[$127>>2];
   $129 = $126 * $128;
   $130 = (($i$01$i31) + 1)|0;
   $$sum62 = (($4) + ($130))|0;
   $131 = (($Buff) + ($$sum62<<2)|0);
   $132 = +HEAPF32[$131>>2];
   $$sum63 = (($124) + ($130))|0;
   $133 = (($Buff) + ($$sum63<<2)|0);
   $134 = +HEAPF32[$133>>2];
   $135 = $132 * $134;
   $136 = $129 + $135;
   $137 = (($i$01$i31) + 2)|0;
   $$sum64 = (($4) + ($137))|0;
   $138 = (($Buff) + ($$sum64<<2)|0);
   $139 = +HEAPF32[$138>>2];
   $$sum65 = (($124) + ($137))|0;
   $140 = (($Buff) + ($$sum65<<2)|0);
   $141 = +HEAPF32[$140>>2];
   $142 = $139 * $141;
   $143 = $136 + $142;
   $144 = $sum$02$i30 + $143;
   $145 = (($i$01$i31) + 3)|0;
   $146 = ($145|0)<(60);
   if ($146) {
    $i$01$i31 = $145;$sum$02$i30 = $144;
   } else {
    $i$01$i35 = 0;$sum$02$i34 = 0.0;
    break;
   }
  }
  while(1) {
   $$sum66 = (($124) + ($i$01$i35))|0;
   $147 = (($Buff) + ($$sum66<<2)|0);
   $148 = +HEAPF32[$147>>2];
   $149 = $148 * $148;
   $150 = (($i$01$i35) + 1)|0;
   $$sum68 = (($124) + ($150))|0;
   $151 = (($Buff) + ($$sum68<<2)|0);
   $152 = +HEAPF32[$151>>2];
   $153 = $152 * $152;
   $154 = $149 + $153;
   $155 = (($i$01$i35) + 2)|0;
   $$sum70 = (($124) + ($155))|0;
   $156 = (($Buff) + ($$sum70<<2)|0);
   $157 = +HEAPF32[$156>>2];
   $158 = $157 * $157;
   $159 = $154 + $158;
   $160 = $sum$02$i34 + $159;
   $161 = (($i$01$i35) + 3)|0;
   $162 = ($161|0)<(60);
   if ($162) {
    $i$01$i35 = $161;$sum$02$i34 = $160;
   } else {
    $Lcr$sroa$14$0 = $144;$Lcr$sroa$19$0 = $160;
    break;
   }
  }
 } else {
  $Lcr$sroa$14$0 = 0.0;$Lcr$sroa$19$0 = 0.0;
 }
 $or$cond3 = $83 & $62;
 if ($or$cond3) {
  $163 = $80 * $Lcr$sroa$10$0;
  $164 = $163 * 0.25;
  $165 = $Lcr$sroa$5$0 * $Lcr$sroa$5$0;
  $166 = $165 > $164;
  if ($166) {
   $167 = !($Lcr$sroa$5$0 >= $Lcr$sroa$10$0);
   if ($167) {
    $171 = $Lcr$sroa$5$0 / $Lcr$sroa$10$0;
    $172 = HEAP32[39864>>2]|0;
    $173 = (34520 + ($172<<2)|0);
    $174 = +HEAPF32[$173>>2];
    $175 = $171 * $174;
    $Pf$sroa$2$0$i38 = $175;
   } else {
    $168 = HEAP32[39864>>2]|0;
    $169 = (34520 + ($168<<2)|0);
    $170 = +HEAPF32[$169>>2];
    $Pf$sroa$2$0$i38 = $170;
   }
   $176 = $Lcr$sroa$5$0 * 2.0;
   $177 = $176 * $Pf$sroa$2$0$i38;
   $178 = $177 + $80;
   $179 = $Pf$sroa$2$0$i38 * $Pf$sroa$2$0$i38;
   $180 = $179 * $Lcr$sroa$10$0;
   $181 = $178 + $180;
   $fabsf$i39 = (+Math_abs((+$181)));
   $182 = $fabsf$i39 < 1.1754943508222875E-38;
   if ($182) {
    $Pf$sroa$10$0$i41 = 0.0;$Pf$sroa$2$1$i40 = $Pf$sroa$2$0$i38;
   } else {
    $183 = $80 / $181;
    $184 = (+Math_sqrt((+$183)));
    $Pf$sroa$10$0$i41 = $184;$Pf$sroa$2$1$i40 = $Pf$sroa$2$0$i38;
   }
  } else {
   $Pf$sroa$10$0$i41 = 1.0;$Pf$sroa$2$1$i40 = 0.0;
  }
  $185 = $Pf$sroa$2$1$i40 * $Pf$sroa$10$0$i41;
  $Pf$sroa$0$0 = $31;$Pf$sroa$7$0 = $185;$Pf$sroa$8$0 = $Pf$sroa$10$0$i41;
 } else {
  $Pf$sroa$0$0 = 0;$Pf$sroa$7$0 = 0.0;$Pf$sroa$8$0 = 1.0;
 }
 $or$cond5 = $61 & $123;
 if ($or$cond5) {
  $186 = $80 * $Lcr$sroa$19$0;
  $187 = $186 * 0.25;
  $188 = $Lcr$sroa$14$0 * $Lcr$sroa$14$0;
  $189 = $188 > $187;
  if ($189) {
   $190 = !($Lcr$sroa$14$0 >= $Lcr$sroa$19$0);
   if ($190) {
    $194 = $Lcr$sroa$14$0 / $Lcr$sroa$19$0;
    $195 = HEAP32[39864>>2]|0;
    $196 = (34520 + ($195<<2)|0);
    $197 = +HEAPF32[$196>>2];
    $198 = $194 * $197;
    $Pf$sroa$2$0$i25 = $198;
   } else {
    $191 = HEAP32[39864>>2]|0;
    $192 = (34520 + ($191<<2)|0);
    $193 = +HEAPF32[$192>>2];
    $Pf$sroa$2$0$i25 = $193;
   }
   $199 = $Lcr$sroa$14$0 * 2.0;
   $200 = $199 * $Pf$sroa$2$0$i25;
   $201 = $200 + $80;
   $202 = $Pf$sroa$2$0$i25 * $Pf$sroa$2$0$i25;
   $203 = $202 * $Lcr$sroa$19$0;
   $204 = $201 + $203;
   $fabsf$i26 = (+Math_abs((+$204)));
   $205 = $fabsf$i26 < 1.1754943508222875E-38;
   if ($205) {
    $Pf$sroa$10$0$i28 = 0.0;$Pf$sroa$2$1$i27 = $Pf$sroa$2$0$i25;
   } else {
    $206 = $80 / $204;
    $207 = (+Math_sqrt((+$206)));
    $Pf$sroa$10$0$i28 = $207;$Pf$sroa$2$1$i27 = $Pf$sroa$2$0$i25;
   }
  } else {
   $Pf$sroa$10$0$i28 = 1.0;$Pf$sroa$2$1$i27 = 0.0;
  }
  $208 = $Pf$sroa$2$1$i27 * $Pf$sroa$10$0$i28;
  $Pf$sroa$0$1 = $Indx$1$i9;$Pf$sroa$7$1 = $208;$Pf$sroa$8$1 = $Pf$sroa$10$0$i28;
 } else {
  $Pf$sroa$0$1 = $Pf$sroa$0$0;$Pf$sroa$7$1 = $Pf$sroa$7$0;$Pf$sroa$8$1 = $Pf$sroa$8$0;
 }
 $or$cond7 = $83 & $123;
 do {
  if ($or$cond7) {
   $209 = $Lcr$sroa$5$0 * $Lcr$sroa$19$0;
   $210 = $Lcr$sroa$5$0 * $209;
   $211 = $Lcr$sroa$10$0 * $Lcr$sroa$14$0;
   $212 = $Lcr$sroa$14$0 * $211;
   $213 = $210 > $212;
   if ($213) {
    $214 = $80 * $Lcr$sroa$10$0;
    $215 = $214 * 0.25;
    $216 = $Lcr$sroa$5$0 * $Lcr$sroa$5$0;
    $217 = $216 > $215;
    if ($217) {
     $218 = !($Lcr$sroa$5$0 >= $Lcr$sroa$10$0);
     if ($218) {
      $222 = $Lcr$sroa$5$0 / $Lcr$sroa$10$0;
      $223 = HEAP32[39864>>2]|0;
      $224 = (34520 + ($223<<2)|0);
      $225 = +HEAPF32[$224>>2];
      $226 = $222 * $225;
      $Pf$sroa$2$0$i12 = $226;
     } else {
      $219 = HEAP32[39864>>2]|0;
      $220 = (34520 + ($219<<2)|0);
      $221 = +HEAPF32[$220>>2];
      $Pf$sroa$2$0$i12 = $221;
     }
     $227 = $Lcr$sroa$5$0 * 2.0;
     $228 = $227 * $Pf$sroa$2$0$i12;
     $229 = $228 + $80;
     $230 = $Pf$sroa$2$0$i12 * $Pf$sroa$2$0$i12;
     $231 = $230 * $Lcr$sroa$10$0;
     $232 = $229 + $231;
     $fabsf$i13 = (+Math_abs((+$232)));
     $233 = $fabsf$i13 < 1.1754943508222875E-38;
     if ($233) {
      $Pf$sroa$10$0$i15 = 0.0;$Pf$sroa$2$1$i14 = $Pf$sroa$2$0$i12;
     } else {
      $234 = $80 / $232;
      $235 = (+Math_sqrt((+$234)));
      $Pf$sroa$10$0$i15 = $235;$Pf$sroa$2$1$i14 = $Pf$sroa$2$0$i12;
     }
    } else {
     $Pf$sroa$10$0$i15 = 1.0;$Pf$sroa$2$1$i14 = 0.0;
    }
    $236 = $Pf$sroa$2$1$i14 * $Pf$sroa$10$0$i15;
    $Pf$sroa$0$2 = $31;$Pf$sroa$7$2 = $236;$Pf$sroa$8$2 = $Pf$sroa$10$0$i15;
    break;
   } else {
    $237 = $80 * $Lcr$sroa$19$0;
    $238 = $237 * 0.25;
    $239 = $Lcr$sroa$14$0 * $Lcr$sroa$14$0;
    $240 = $239 > $238;
    if ($240) {
     $241 = !($Lcr$sroa$14$0 >= $Lcr$sroa$19$0);
     if ($241) {
      $245 = $Lcr$sroa$14$0 / $Lcr$sroa$19$0;
      $246 = HEAP32[39864>>2]|0;
      $247 = (34520 + ($246<<2)|0);
      $248 = +HEAPF32[$247>>2];
      $249 = $245 * $248;
      $Pf$sroa$2$0$i = $249;
     } else {
      $242 = HEAP32[39864>>2]|0;
      $243 = (34520 + ($242<<2)|0);
      $244 = +HEAPF32[$243>>2];
      $Pf$sroa$2$0$i = $244;
     }
     $250 = $Lcr$sroa$14$0 * 2.0;
     $251 = $250 * $Pf$sroa$2$0$i;
     $252 = $251 + $80;
     $253 = $Pf$sroa$2$0$i * $Pf$sroa$2$0$i;
     $254 = $253 * $Lcr$sroa$19$0;
     $255 = $252 + $254;
     $fabsf$i = (+Math_abs((+$255)));
     $256 = $fabsf$i < 1.1754943508222875E-38;
     if ($256) {
      $Pf$sroa$10$0$i = 0.0;$Pf$sroa$2$1$i = $Pf$sroa$2$0$i;
     } else {
      $257 = $80 / $255;
      $258 = (+Math_sqrt((+$257)));
      $Pf$sroa$10$0$i = $258;$Pf$sroa$2$1$i = $Pf$sroa$2$0$i;
     }
    } else {
     $Pf$sroa$10$0$i = 1.0;$Pf$sroa$2$1$i = 0.0;
    }
    $259 = $Pf$sroa$2$1$i * $Pf$sroa$10$0$i;
    $Pf$sroa$0$2 = $Indx$1$i9;$Pf$sroa$7$2 = $259;$Pf$sroa$8$2 = $Pf$sroa$10$0$i;
    break;
   }
  } else {
   $Pf$sroa$0$2 = $Pf$sroa$0$1;$Pf$sroa$7$2 = $Pf$sroa$7$1;$Pf$sroa$8$2 = $Pf$sroa$8$1;
  }
 } while(0);
 HEAP32[$agg$result>>2] = $Pf$sroa$0$2;
 $260 = (($agg$result) + 4|0);
 HEAPF32[$260>>2] = $Pf$sroa$7$2;
 $261 = (($agg$result) + 8|0);
 HEAPF32[$261>>2] = $Pf$sroa$8$2;
 STACKTOP = sp;return;
}
function _Durbin($Lpc,$Corr,$Err,$Pk2) {
 $Lpc = $Lpc|0;
 $Corr = $Corr|0;
 $Err = +$Err;
 $Pk2 = $Pk2|0;
 var $$011 = 0.0, $$014 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0;
 var $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, $Temp = 0, $Tmp0$0$lcssa = 0.0, $Tmp0$02 = 0.0, $exitcond = 0, $exitcond22 = 0, $fabsf = 0.0, $indvars$iv$next21 = 0, $indvars$iv20 = 0;
 var $j$01 = 0, $j$25 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $Temp = sp;
 dest=$Lpc+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $$014 = $Err;$indvars$iv20 = 0;
 while(1) {
  $0 = $indvars$iv20 << 2;
  $1 = (($Corr) + ($indvars$iv20<<2)|0);
  $2 = +HEAPF32[$1>>2];
  $3 = ($indvars$iv20|0)>(0);
  if ($3) {
   $4 = (($indvars$iv20) + -1)|0;
   $Tmp0$02 = $2;$j$01 = 0;
   while(1) {
    $5 = (($Lpc) + ($j$01<<2)|0);
    $6 = +HEAPF32[$5>>2];
    $7 = (($4) - ($j$01))|0;
    $8 = (($Corr) + ($7<<2)|0);
    $9 = +HEAPF32[$8>>2];
    $10 = $6 * $9;
    $11 = $Tmp0$02 - $10;
    $12 = (($j$01) + 1)|0;
    $exitcond = ($12|0)==($indvars$iv20|0);
    if ($exitcond) {
     $Tmp0$0$lcssa = $11;
     break;
    } else {
     $Tmp0$02 = $11;$j$01 = $12;
    }
   }
  } else {
   $Tmp0$0$lcssa = $2;
  }
  $fabsf = (+Math_abs((+$Tmp0$0$lcssa)));
  $13 = !($fabsf >= $$014);
  if (!($13)) {
   break;
  }
  $14 = $Tmp0$0$lcssa / $$014;
  $15 = (($Lpc) + ($indvars$iv20<<2)|0);
  HEAPF32[$15>>2] = $14;
  $16 = $Tmp0$0$lcssa * $14;
  $17 = $$014 - $16;
  $18 = ($indvars$iv20|0)==(1);
  if ($18) {
   $19 = -$14;
   HEAPF32[$Pk2>>2] = $19;
   label = 10;
  } else {
   if ($3) {
    label = 10;
   }
  }
  if ((label|0) == 10) {
   label = 0;
   _memcpy(($Temp|0),($Lpc|0),($0|0))|0;
   $20 = (($indvars$iv20) + -1)|0;
   $j$25 = 0;
   while(1) {
    $21 = (($Lpc) + ($j$25<<2)|0);
    $22 = +HEAPF32[$21>>2];
    $23 = (($20) - ($j$25))|0;
    $24 = (($Temp) + ($23<<2)|0);
    $25 = +HEAPF32[$24>>2];
    $26 = $14 * $25;
    $27 = $22 - $26;
    HEAPF32[$21>>2] = $27;
    $28 = (($j$25) + 1)|0;
    $exitcond22 = ($28|0)==($indvars$iv20|0);
    if ($exitcond22) {
     break;
    } else {
     $j$25 = $28;
    }
   }
  }
  $indvars$iv$next21 = (($indvars$iv20) + 1)|0;
  $29 = ($indvars$iv$next21|0)<(10);
  if ($29) {
   $$014 = $17;$indvars$iv20 = $indvars$iv$next21;
  } else {
   $$011 = $17;
   label = 13;
   break;
  }
 }
 if ((label|0) == 13) {
  STACKTOP = sp;return (+$$011);
 }
 HEAPF32[$Pk2>>2] = 0.99000000953674316;
 $$011 = $$014;
 STACKTOP = sp;return (+$$011);
}
function _Upd_Ring($Dpnt,$QntLpc,$PerLpc) {
 $Dpnt = $Dpnt|0;
 $QntLpc = $QntLpc|0;
 $PerLpc = $PerLpc|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0.0;
 var $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0.0, $122 = 0.0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0.0, $129 = 0.0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0.0, $133 = 0.0;
 var $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0.0, $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0.0, $146 = 0.0, $147 = 0.0, $148 = 0.0, $149 = 0.0, $15 = 0, $150 = 0.0, $151 = 0.0;
 var $152 = 0.0, $153 = 0.0, $154 = 0.0, $155 = 0, $156 = 0, $157 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0;
 var $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0;
 var $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0.0, $82 = 0.0;
 var $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0.0, $94 = 0.0, $95 = 0.0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $exitcond = 0, $exitcond5 = 0;
 var $i$04 = 0, $i$13 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $i$04 = 60;
 while(1) {
  $28 = ((37008 + ($i$04<<2)|0) + 628|0);
  $29 = +HEAPF32[$28>>2];
  $30 = (($i$04) + -60)|0;
  $31 = ((37008 + ($30<<2)|0) + 628|0);
  HEAPF32[$31>>2] = $29;
  $32 = (($i$04) + 1)|0;
  $exitcond5 = ($32|0)==(145);
  if ($exitcond5) {
   break;
  } else {
   $i$04 = $32;
  }
 }
 $0 = (($PerLpc) + 40|0);
 $1 = (($QntLpc) + 4|0);
 $2 = (($QntLpc) + 8|0);
 $3 = (($QntLpc) + 12|0);
 $4 = (($QntLpc) + 16|0);
 $5 = (($QntLpc) + 20|0);
 $6 = (($QntLpc) + 24|0);
 $7 = (($QntLpc) + 28|0);
 $8 = (($QntLpc) + 32|0);
 $9 = (($QntLpc) + 36|0);
 $10 = (($PerLpc) + 4|0);
 $11 = (($PerLpc) + 8|0);
 $12 = (($PerLpc) + 12|0);
 $13 = (($PerLpc) + 16|0);
 $14 = (($PerLpc) + 20|0);
 $15 = (($PerLpc) + 24|0);
 $16 = (($PerLpc) + 28|0);
 $17 = (($PerLpc) + 32|0);
 $18 = (($PerLpc) + 36|0);
 $19 = (($PerLpc) + 44|0);
 $20 = (($PerLpc) + 48|0);
 $21 = (($PerLpc) + 52|0);
 $22 = (($PerLpc) + 56|0);
 $23 = (($PerLpc) + 60|0);
 $24 = (($PerLpc) + 64|0);
 $25 = (($PerLpc) + 68|0);
 $26 = (($PerLpc) + 72|0);
 $27 = (($PerLpc) + 76|0);
 $i$13 = 0;
 while(1) {
  $33 = (($Dpnt) + ($i$13<<2)|0);
  $34 = +HEAPF32[$33>>2];
  $35 = +HEAPF32[$QntLpc>>2];
  $36 = +HEAPF32[((37008 + 2348|0))>>2];
  $37 = $35 * $36;
  $38 = +HEAPF32[$1>>2];
  $39 = +HEAPF32[((37008 + 2352|0))>>2];
  $40 = $38 * $39;
  $41 = $37 + $40;
  $42 = +HEAPF32[$2>>2];
  $43 = +HEAPF32[((37008 + 2356|0))>>2];
  $44 = $42 * $43;
  $45 = $41 + $44;
  $46 = +HEAPF32[$3>>2];
  $47 = +HEAPF32[((37008 + 2360|0))>>2];
  $48 = $46 * $47;
  $49 = $45 + $48;
  $50 = +HEAPF32[$4>>2];
  $51 = +HEAPF32[((37008 + 2364|0))>>2];
  $52 = $50 * $51;
  $53 = $49 + $52;
  $54 = +HEAPF32[$5>>2];
  $55 = +HEAPF32[((37008 + 2368|0))>>2];
  $56 = $54 * $55;
  $57 = $53 + $56;
  $58 = +HEAPF32[$6>>2];
  $59 = +HEAPF32[((37008 + 2372|0))>>2];
  $60 = $58 * $59;
  $61 = $57 + $60;
  $62 = +HEAPF32[$7>>2];
  $63 = +HEAPF32[((37008 + 2376|0))>>2];
  $64 = $62 * $63;
  $65 = $61 + $64;
  $66 = +HEAPF32[$8>>2];
  $67 = +HEAPF32[((37008 + 2380|0))>>2];
  $68 = $66 * $67;
  $69 = $65 + $68;
  $70 = +HEAPF32[$9>>2];
  $71 = +HEAPF32[((37008 + 2384|0))>>2];
  $72 = $70 * $71;
  $73 = $69 + $72;
  $74 = $34 + $73;
  HEAPF32[$33>>2] = $74;
  $75 = +HEAPF32[$PerLpc>>2];
  $76 = +HEAPF32[((37008 + 2348|0))>>2];
  $77 = $75 * $76;
  $78 = +HEAPF32[$10>>2];
  $79 = +HEAPF32[((37008 + 2352|0))>>2];
  $80 = $78 * $79;
  $81 = $77 + $80;
  $82 = +HEAPF32[$11>>2];
  $83 = +HEAPF32[((37008 + 2356|0))>>2];
  $84 = $82 * $83;
  $85 = $81 + $84;
  $86 = +HEAPF32[$12>>2];
  $87 = +HEAPF32[((37008 + 2360|0))>>2];
  $88 = $86 * $87;
  $89 = $85 + $88;
  $90 = +HEAPF32[$13>>2];
  $91 = +HEAPF32[((37008 + 2364|0))>>2];
  $92 = $90 * $91;
  $93 = $89 + $92;
  $94 = +HEAPF32[$14>>2];
  $95 = +HEAPF32[((37008 + 2368|0))>>2];
  $96 = $94 * $95;
  $97 = $93 + $96;
  $98 = +HEAPF32[$15>>2];
  $99 = +HEAPF32[((37008 + 2372|0))>>2];
  $100 = $98 * $99;
  $101 = $97 + $100;
  $102 = +HEAPF32[$16>>2];
  $103 = +HEAPF32[((37008 + 2376|0))>>2];
  $104 = $102 * $103;
  $105 = $101 + $104;
  $106 = +HEAPF32[$17>>2];
  $107 = +HEAPF32[((37008 + 2380|0))>>2];
  $108 = $106 * $107;
  $109 = $105 + $108;
  $110 = +HEAPF32[$18>>2];
  $111 = +HEAPF32[((37008 + 2384|0))>>2];
  $112 = $110 * $111;
  $113 = $109 + $112;
  HEAPF32[((37008 + 2384|0))>>2] = $107;
  HEAPF32[((37008 + 2380|0))>>2] = $103;
  HEAPF32[((37008 + 2376|0))>>2] = $99;
  HEAPF32[((37008 + 2372|0))>>2] = $95;
  HEAPF32[((37008 + 2368|0))>>2] = $91;
  HEAPF32[((37008 + 2364|0))>>2] = $87;
  HEAPF32[((37008 + 2360|0))>>2] = $83;
  HEAPF32[((37008 + 2356|0))>>2] = $79;
  HEAPF32[((37008 + 2352|0))>>2] = $76;
  HEAPF32[((37008 + 2348|0))>>2] = $74;
  $114 = +HEAPF32[$0>>2];
  $115 = +HEAPF32[((37008 + 2388|0))>>2];
  $116 = $114 * $115;
  $117 = +HEAPF32[$19>>2];
  $118 = +HEAPF32[((37008 + 2392|0))>>2];
  $119 = $117 * $118;
  $120 = $116 + $119;
  $121 = +HEAPF32[$20>>2];
  $122 = +HEAPF32[((37008 + 2396|0))>>2];
  $123 = $121 * $122;
  $124 = $120 + $123;
  $125 = +HEAPF32[$21>>2];
  $126 = +HEAPF32[((37008 + 2400|0))>>2];
  $127 = $125 * $126;
  $128 = $124 + $127;
  $129 = +HEAPF32[$22>>2];
  $130 = +HEAPF32[((37008 + 2404|0))>>2];
  $131 = $129 * $130;
  $132 = $128 + $131;
  $133 = +HEAPF32[$23>>2];
  $134 = +HEAPF32[((37008 + 2408|0))>>2];
  $135 = $133 * $134;
  $136 = $132 + $135;
  $137 = +HEAPF32[$24>>2];
  $138 = +HEAPF32[((37008 + 2412|0))>>2];
  $139 = $137 * $138;
  $140 = $136 + $139;
  $141 = +HEAPF32[$25>>2];
  $142 = +HEAPF32[((37008 + 2416|0))>>2];
  $143 = $141 * $142;
  $144 = $140 + $143;
  $145 = +HEAPF32[$26>>2];
  $146 = +HEAPF32[((37008 + 2420|0))>>2];
  $147 = $145 * $146;
  $148 = $144 + $147;
  $149 = +HEAPF32[$27>>2];
  $150 = +HEAPF32[((37008 + 2424|0))>>2];
  $151 = $149 * $150;
  $152 = $148 + $151;
  HEAPF32[((37008 + 2424|0))>>2] = $146;
  HEAPF32[((37008 + 2420|0))>>2] = $142;
  HEAPF32[((37008 + 2416|0))>>2] = $138;
  HEAPF32[((37008 + 2412|0))>>2] = $134;
  HEAPF32[((37008 + 2408|0))>>2] = $130;
  HEAPF32[((37008 + 2404|0))>>2] = $126;
  HEAPF32[((37008 + 2400|0))>>2] = $122;
  HEAPF32[((37008 + 2396|0))>>2] = $118;
  HEAPF32[((37008 + 2392|0))>>2] = $115;
  $153 = $74 - $113;
  $154 = $153 + $152;
  HEAPF32[((37008 + 2388|0))>>2] = $154;
  $155 = (($i$13) + 85)|0;
  $156 = ((37008 + ($155<<2)|0) + 628|0);
  HEAPF32[$156>>2] = $154;
  $157 = (($i$13) + 1)|0;
  $exitcond = ($157|0)==(60);
  if ($exitcond) {
   break;
  } else {
   $i$13 = $157;
  }
 }
 STACKTOP = sp;return;
}
function _Spf($Tv,$Lpc) {
 $Tv = $Tv|0;
 $Lpc = $Lpc|0;
 var $$sum = 0, $0 = 0, $1 = 0.0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0.0;
 var $115 = 0.0, $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0.0, $121 = 0.0, $122 = 0.0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0.0, $129 = 0.0, $13 = 0.0, $130 = 0.0, $131 = 0.0, $132 = 0.0;
 var $133 = 0.0, $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0.0, $142 = 0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $22 = 0.0;
 var $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0.0, $3 = 0.0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0;
 var $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0, $45 = 0.0, $46 = 0, $47 = 0.0, $48 = 0, $49 = 0.0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0.0, $54 = 0, $55 = 0.0, $56 = 0, $57 = 0.0, $58 = 0.0, $59 = 0;
 var $6 = 0, $60 = 0.0, $61 = 0, $62 = 0.0, $63 = 0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0, $68 = 0.0, $69 = 0, $7 = 0.0, $70 = 0.0, $71 = 0, $72 = 0.0, $73 = 0, $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0;
 var $78 = 0.0, $79 = 0.0, $8 = 0.0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0.0, $94 = 0.0, $95 = 0.0;
 var $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $FirCoef = 0, $IirCoef = 0, $Tmp$0 = 0.0, $exitcond = 0, $exitcond$i = 0, $exitcond5 = 0, $i$01$i = 0, $i$01$i2 = 0, $i$04 = 0, $i$13 = 0, $phitmp = 0.0, $sum$02$i = 0.0, $sum$02$i1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0;
 $FirCoef = sp + 40|0;
 $IirCoef = sp;
 $i$04 = 0;
 while(1) {
  $0 = (($Lpc) + ($i$04<<2)|0);
  $1 = +HEAPF32[$0>>2];
  $2 = (13184 + ($i$04<<2)|0);
  $3 = +HEAPF32[$2>>2];
  $4 = $1 * $3;
  $5 = (($FirCoef) + ($i$04<<2)|0);
  HEAPF32[$5>>2] = $4;
  $6 = (13224 + ($i$04<<2)|0);
  $7 = +HEAPF32[$6>>2];
  $8 = $1 * $7;
  $9 = (($IirCoef) + ($i$04<<2)|0);
  HEAPF32[$9>>2] = $8;
  $10 = (($i$04) + 1)|0;
  $exitcond5 = ($10|0)==(10);
  if ($exitcond5) {
   $i$01$i = 0;$sum$02$i = 0.0;
   break;
  } else {
   $i$04 = $10;
  }
 }
 while(1) {
  $11 = (($Tv) + ($i$01$i<<2)|0);
  $12 = +HEAPF32[$11>>2];
  $13 = $12 * $12;
  $14 = (($i$01$i) + 1)|0;
  $15 = (($Tv) + ($14<<2)|0);
  $16 = +HEAPF32[$15>>2];
  $17 = $16 * $16;
  $18 = $13 + $17;
  $19 = (($i$01$i) + 2)|0;
  $20 = (($Tv) + ($19<<2)|0);
  $21 = +HEAPF32[$20>>2];
  $22 = $21 * $21;
  $23 = $18 + $22;
  $24 = $sum$02$i + $23;
  $25 = (($i$01$i) + 3)|0;
  $26 = ($25|0)<(60);
  if ($26) {
   $i$01$i = $25;$sum$02$i = $24;
  } else {
   break;
  }
 }
 $27 = $24 > 1.1754943508222875E-38;
 if ($27) {
  $i$01$i2 = 0;$sum$02$i1 = 0.0;
  while(1) {
   $28 = (($Tv) + ($i$01$i2<<2)|0);
   $29 = +HEAPF32[$28>>2];
   $$sum = (($i$01$i2) + 1)|0;
   $30 = (($Tv) + ($$sum<<2)|0);
   $31 = +HEAPF32[$30>>2];
   $32 = $29 * $31;
   $33 = $sum$02$i1 + $32;
   $exitcond$i = ($$sum|0)==(59);
   if ($exitcond$i) {
    break;
   } else {
    $i$01$i2 = $$sum;$sum$02$i1 = $33;
   }
  }
  $34 = $33 / $24;
  $phitmp = $34 * 0.25;
  $Tmp$0 = $phitmp;
 } else {
  $Tmp$0 = 0.0;
 }
 $35 = +HEAPF32[((39880 + 12|0))>>2];
 $36 = $35 * 0.75;
 $37 = $Tmp$0 + $36;
 HEAPF32[((39880 + 12|0))>>2] = $37;
 $38 = $37 * -0.25;
 $39 = +HEAPF32[$FirCoef>>2];
 $40 = (($FirCoef) + 4|0);
 $41 = +HEAPF32[$40>>2];
 $42 = (($FirCoef) + 8|0);
 $43 = +HEAPF32[$42>>2];
 $44 = (($FirCoef) + 12|0);
 $45 = +HEAPF32[$44>>2];
 $46 = (($FirCoef) + 16|0);
 $47 = +HEAPF32[$46>>2];
 $48 = (($FirCoef) + 20|0);
 $49 = +HEAPF32[$48>>2];
 $50 = (($FirCoef) + 24|0);
 $51 = +HEAPF32[$50>>2];
 $52 = (($FirCoef) + 28|0);
 $53 = +HEAPF32[$52>>2];
 $54 = (($FirCoef) + 32|0);
 $55 = +HEAPF32[$54>>2];
 $56 = (($FirCoef) + 36|0);
 $57 = +HEAPF32[$56>>2];
 $58 = +HEAPF32[$IirCoef>>2];
 $59 = (($IirCoef) + 4|0);
 $60 = +HEAPF32[$59>>2];
 $61 = (($IirCoef) + 8|0);
 $62 = +HEAPF32[$61>>2];
 $63 = (($IirCoef) + 12|0);
 $64 = +HEAPF32[$63>>2];
 $65 = (($IirCoef) + 16|0);
 $66 = +HEAPF32[$65>>2];
 $67 = (($IirCoef) + 20|0);
 $68 = +HEAPF32[$67>>2];
 $69 = (($IirCoef) + 24|0);
 $70 = +HEAPF32[$69>>2];
 $71 = (($IirCoef) + 28|0);
 $72 = +HEAPF32[$71>>2];
 $73 = (($IirCoef) + 32|0);
 $74 = +HEAPF32[$73>>2];
 $75 = (($IirCoef) + 36|0);
 $76 = +HEAPF32[$75>>2];
 $i$13 = 0;
 while(1) {
  $77 = (($Tv) + ($i$13<<2)|0);
  $78 = +HEAPF32[$77>>2];
  $79 = +HEAPF32[((39880 + 680|0))>>2];
  $80 = $39 * $79;
  $81 = +HEAPF32[((39880 + 684|0))>>2];
  $82 = $41 * $81;
  $83 = $80 + $82;
  $84 = +HEAPF32[((39880 + 688|0))>>2];
  $85 = $43 * $84;
  $86 = $83 + $85;
  $87 = +HEAPF32[((39880 + 692|0))>>2];
  $88 = $45 * $87;
  $89 = $86 + $88;
  $90 = +HEAPF32[((39880 + 696|0))>>2];
  $91 = $47 * $90;
  $92 = $89 + $91;
  $93 = +HEAPF32[((39880 + 700|0))>>2];
  $94 = $49 * $93;
  $95 = $92 + $94;
  $96 = +HEAPF32[((39880 + 704|0))>>2];
  $97 = $51 * $96;
  $98 = $95 + $97;
  $99 = +HEAPF32[((39880 + 708|0))>>2];
  $100 = $53 * $99;
  $101 = $98 + $100;
  $102 = +HEAPF32[((39880 + 712|0))>>2];
  $103 = $55 * $102;
  $104 = $101 + $103;
  $105 = +HEAPF32[((39880 + 716|0))>>2];
  $106 = $57 * $105;
  $107 = $104 + $106;
  HEAPF32[((39880 + 716|0))>>2] = $102;
  HEAPF32[((39880 + 712|0))>>2] = $99;
  HEAPF32[((39880 + 708|0))>>2] = $96;
  HEAPF32[((39880 + 704|0))>>2] = $93;
  HEAPF32[((39880 + 700|0))>>2] = $90;
  HEAPF32[((39880 + 696|0))>>2] = $87;
  HEAPF32[((39880 + 692|0))>>2] = $84;
  HEAPF32[((39880 + 688|0))>>2] = $81;
  HEAPF32[((39880 + 684|0))>>2] = $79;
  $108 = +HEAPF32[$77>>2];
  HEAPF32[((39880 + 680|0))>>2] = $108;
  $109 = +HEAPF32[((39880 + 720|0))>>2];
  $110 = $58 * $109;
  $111 = +HEAPF32[((39880 + 724|0))>>2];
  $112 = $60 * $111;
  $113 = $110 + $112;
  $114 = +HEAPF32[((39880 + 728|0))>>2];
  $115 = $62 * $114;
  $116 = $113 + $115;
  $117 = +HEAPF32[((39880 + 732|0))>>2];
  $118 = $64 * $117;
  $119 = $116 + $118;
  $120 = +HEAPF32[((39880 + 736|0))>>2];
  $121 = $66 * $120;
  $122 = $119 + $121;
  $123 = +HEAPF32[((39880 + 740|0))>>2];
  $124 = $68 * $123;
  $125 = $122 + $124;
  $126 = +HEAPF32[((39880 + 744|0))>>2];
  $127 = $70 * $126;
  $128 = $125 + $127;
  $129 = +HEAPF32[((39880 + 748|0))>>2];
  $130 = $72 * $129;
  $131 = $128 + $130;
  $132 = +HEAPF32[((39880 + 752|0))>>2];
  $133 = $74 * $132;
  $134 = $131 + $133;
  $135 = +HEAPF32[((39880 + 756|0))>>2];
  $136 = $76 * $135;
  $137 = $134 + $136;
  HEAPF32[((39880 + 756|0))>>2] = $132;
  HEAPF32[((39880 + 752|0))>>2] = $129;
  HEAPF32[((39880 + 748|0))>>2] = $126;
  HEAPF32[((39880 + 744|0))>>2] = $123;
  HEAPF32[((39880 + 740|0))>>2] = $120;
  HEAPF32[((39880 + 736|0))>>2] = $117;
  HEAPF32[((39880 + 732|0))>>2] = $114;
  HEAPF32[((39880 + 728|0))>>2] = $111;
  HEAPF32[((39880 + 724|0))>>2] = $109;
  $138 = $78 - $107;
  $139 = $138 + $137;
  HEAPF32[((39880 + 720|0))>>2] = $139;
  $140 = $38 * $109;
  $141 = $139 + $140;
  HEAPF32[$77>>2] = $141;
  $142 = (($i$13) + 1)|0;
  $exitcond = ($142|0)==(60);
  if ($exitcond) {
   break;
  } else {
   $i$13 = $142;
  }
 }
 STACKTOP = sp;return (+$24);
}
function _AtoLsp($LspVect,$Lpc) {
 $LspVect = $LspVect|0;
 $Lpc = $Lpc|0;
 var $$pre = 0.0, $$sum = 0, $$sum1 = 0, $$sum2 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum6 = 0, $$sum7 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0.0, $1 = 0.0, $10 = 0, $100 = 0.0, $101 = 0, $102 = 0, $103 = 0, $104 = 0.0, $105 = 0.0;
 var $106 = 0.0, $107 = 0, $108 = 0.0, $109 = 0, $11 = 0.0, $110 = 0, $111 = 0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0, $116 = 0, $117 = 0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0.0, $121 = 0.0, $122 = 0.0, $123 = 0;
 var $124 = 0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0.0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0.0, $136 = 0.0, $137 = 0, $138 = 0.0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0;
 var $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0, $146 = 0.0, $147 = 0.0, $148 = 0.0, $149 = 0, $15 = 0.0, $150 = 0.0, $151 = 0.0, $152 = 0.0, $153 = 0.0, $154 = 0.0, $155 = 0.0, $156 = 0, $157 = 0, $158 = 0, $159 = 0.0, $16 = 0.0;
 var $160 = 0.0, $161 = 0.0, $162 = 0.0, $163 = 0.0, $164 = 0.0, $165 = 0.0, $166 = 0.0, $167 = 0.0, $168 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0;
 var $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0.0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0.0, $44 = 0;
 var $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0, $56 = 0.0, $57 = 0.0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0;
 var $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0, $7 = 0.0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0.0, $80 = 0.0;
 var $81 = 0, $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0.0, $86 = 0, $87 = 0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0, $92 = 0.0, $93 = 0, $94 = 0, $95 = 0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0;
 var $CurrVal$0 = 0.0, $Lpq = 0, $LspCnt$05 = 0, $LspCnt$1 = 0, $PrevVal$06 = 0.0, $fabsf = 0.0, $fabsf1 = 0.0, $i$28 = 0, $k$07 = 0, $k$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $Lpq = sp;
 $0 = +HEAPF32[$Lpc>>2];
 $1 = $0 * 0.99400001764297485;
 HEAPF32[$LspVect>>2] = $1;
 $2 = (($Lpc) + 4|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $3 * 0.98803597688674927;
 $5 = (($LspVect) + 4|0);
 HEAPF32[$5>>2] = $4;
 $6 = (($Lpc) + 8|0);
 $7 = +HEAPF32[$6>>2];
 $8 = $7 * 0.98210781812667847;
 $9 = (($LspVect) + 8|0);
 HEAPF32[$9>>2] = $8;
 $10 = (($Lpc) + 12|0);
 $11 = +HEAPF32[$10>>2];
 $12 = $11 * 0.97621512413024902;
 $13 = (($LspVect) + 12|0);
 HEAPF32[$13>>2] = $12;
 $14 = (($Lpc) + 16|0);
 $15 = +HEAPF32[$14>>2];
 $16 = $15 * 0.97035777568817138;
 $17 = (($LspVect) + 16|0);
 HEAPF32[$17>>2] = $16;
 $18 = (($Lpc) + 20|0);
 $19 = +HEAPF32[$18>>2];
 $20 = $19 * 0.96453571319580078;
 $21 = (($LspVect) + 20|0);
 HEAPF32[$21>>2] = $20;
 $22 = (($Lpc) + 24|0);
 $23 = +HEAPF32[$22>>2];
 $24 = $23 * 0.95874851942062378;
 $25 = (($LspVect) + 24|0);
 HEAPF32[$25>>2] = $24;
 $26 = (($Lpc) + 28|0);
 $27 = +HEAPF32[$26>>2];
 $28 = $27 * 0.95299601554870605;
 $29 = (($LspVect) + 28|0);
 HEAPF32[$29>>2] = $28;
 $30 = (($Lpc) + 32|0);
 $31 = +HEAPF32[$30>>2];
 $32 = $31 * 0.94727802276611328;
 $33 = (($LspVect) + 32|0);
 HEAPF32[$33>>2] = $32;
 $34 = (($Lpc) + 36|0);
 $35 = +HEAPF32[$34>>2];
 $36 = $35 * 0.94159442186355591;
 $37 = (($LspVect) + 36|0);
 HEAPF32[$37>>2] = $36;
 $38 = (($Lpq) + 4|0);
 HEAPF32[$38>>2] = 1.0;
 HEAPF32[$Lpq>>2] = 1.0;
 $39 = -1.0 - $1;
 $40 = $39 - $36;
 $41 = (($Lpq) + 8|0);
 HEAPF32[$41>>2] = $40;
 $42 = 1.0 - $1;
 $43 = $42 + $36;
 $44 = (($Lpq) + 12|0);
 HEAPF32[$44>>2] = $43;
 $45 = -$40;
 $46 = $45 - $4;
 $47 = $46 - $32;
 $48 = (($Lpq) + 16|0);
 HEAPF32[$48>>2] = $47;
 $49 = $43 - $4;
 $50 = $49 + $32;
 $51 = (($Lpq) + 20|0);
 HEAPF32[$51>>2] = $50;
 $52 = -$47;
 $53 = $52 - $8;
 $54 = $53 - $28;
 $55 = (($Lpq) + 24|0);
 HEAPF32[$55>>2] = $54;
 $56 = $50 - $8;
 $57 = $56 + $28;
 $58 = (($Lpq) + 28|0);
 HEAPF32[$58>>2] = $57;
 $59 = -$54;
 $60 = $59 - $12;
 $61 = $60 - $24;
 $62 = (($Lpq) + 32|0);
 HEAPF32[$62>>2] = $61;
 $63 = $57 - $12;
 $64 = $63 + $24;
 $65 = (($Lpq) + 36|0);
 HEAPF32[$65>>2] = $64;
 $66 = -$61;
 $67 = $66 - $16;
 $68 = $67 - $20;
 $69 = (($Lpq) + 40|0);
 $70 = $64 - $16;
 $71 = $70 + $20;
 $72 = (($Lpq) + 44|0);
 $73 = $68 * 0.5;
 HEAPF32[$69>>2] = $73;
 $74 = $71 * 0.5;
 HEAPF32[$72>>2] = $74;
 $75 = $73 + 0.0;
 $76 = $75 + $61;
 $77 = $76 + $54;
 $78 = $77 + $47;
 $79 = $78 + $40;
 $80 = $79 + 1.0;
 $120 = 1.0;$LspCnt$05 = 0;$PrevVal$06 = $80;$i$28 = 1;$k$07 = 0;
 while(1) {
  $$sum = (($k$07) + 10)|0;
  $81 = (($Lpq) + ($$sum<<2)|0);
  $82 = +HEAPF32[$81>>2];
  $83 = $82 + 0.0;
  $$sum1 = (($k$07) + 8)|0;
  $84 = (($Lpq) + ($$sum1<<2)|0);
  $85 = +HEAPF32[$84>>2];
  $86 = (($i$28|0) % 512)&-1;
  $87 = (816 + ($86<<2)|0);
  $88 = +HEAPF32[$87>>2];
  $89 = $85 * $88;
  $90 = $83 + $89;
  $$sum2 = (($k$07) + 6)|0;
  $91 = (($Lpq) + ($$sum2<<2)|0);
  $92 = +HEAPF32[$91>>2];
  $93 = $i$28 << 1;
  $94 = (($93|0) % 512)&-1;
  $95 = (816 + ($94<<2)|0);
  $96 = +HEAPF32[$95>>2];
  $97 = $92 * $96;
  $98 = $90 + $97;
  $$sum3 = (($k$07) + 4)|0;
  $99 = (($Lpq) + ($$sum3<<2)|0);
  $100 = +HEAPF32[$99>>2];
  $101 = ($i$28*3)|0;
  $102 = (($101|0) % 512)&-1;
  $103 = (816 + ($102<<2)|0);
  $104 = +HEAPF32[$103>>2];
  $105 = $100 * $104;
  $106 = $98 + $105;
  $$sum4 = (($k$07) + 2)|0;
  $107 = (($Lpq) + ($$sum4<<2)|0);
  $108 = +HEAPF32[$107>>2];
  $109 = $i$28 << 2;
  $110 = (($109|0) % 512)&-1;
  $111 = (816 + ($110<<2)|0);
  $112 = +HEAPF32[$111>>2];
  $113 = $108 * $112;
  $114 = $106 + $113;
  $115 = ($i$28*5)|0;
  $116 = (($115|0) % 512)&-1;
  $117 = (816 + ($116<<2)|0);
  $118 = +HEAPF32[$117>>2];
  $119 = $120 * $118;
  $121 = $114 + $119;
  $122 = $PrevVal$06 * $121;
  $123 = $122 < 0.0;
  if ($123) {
   $fabsf = (+Math_abs((+$PrevVal$06)));
   $fabsf1 = (+Math_abs((+$121)));
   $124 = (($i$28) + -1)|0;
   $125 = (+($124|0));
   $126 = $fabsf + $fabsf1;
   $127 = $fabsf / $126;
   $128 = $125 + $127;
   $129 = (($LspCnt$05) + 1)|0;
   $130 = (($LspVect) + ($LspCnt$05<<2)|0);
   HEAPF32[$130>>2] = $128;
   $131 = ($129|0)==(10);
   if ($131) {
    label = 8;
    break;
   }
   $132 = $k$07 ^ 1;
   $133 = (($Lpq) + ($132<<2)|0);
   $$sum5 = (($132) + 10)|0;
   $134 = (($Lpq) + ($$sum5<<2)|0);
   $135 = +HEAPF32[$134>>2];
   $136 = $135 + 0.0;
   $$sum6 = (($132) + 8)|0;
   $137 = (($Lpq) + ($$sum6<<2)|0);
   $138 = +HEAPF32[$137>>2];
   $139 = $138 * $88;
   $140 = $136 + $139;
   $$sum7 = (($132) + 6)|0;
   $141 = (($Lpq) + ($$sum7<<2)|0);
   $142 = +HEAPF32[$141>>2];
   $143 = $142 * $96;
   $144 = $140 + $143;
   $$sum8 = (($132) + 4)|0;
   $145 = (($Lpq) + ($$sum8<<2)|0);
   $146 = +HEAPF32[$145>>2];
   $147 = $146 * $104;
   $148 = $144 + $147;
   $$sum9 = (($132) + 2)|0;
   $149 = (($Lpq) + ($$sum9<<2)|0);
   $150 = +HEAPF32[$149>>2];
   $151 = $150 * $112;
   $152 = $148 + $151;
   $153 = +HEAPF32[$133>>2];
   $154 = $153 * $118;
   $155 = $152 + $154;
   $$pre = $153;$CurrVal$0 = $155;$LspCnt$1 = $129;$k$1 = $132;
  } else {
   $$pre = $120;$CurrVal$0 = $121;$LspCnt$1 = $LspCnt$05;$k$1 = $k$07;
  }
  $156 = (($i$28) + 1)|0;
  $157 = ($156|0)<(256);
  if ($157) {
   $120 = $$pre;$LspCnt$05 = $LspCnt$1;$PrevVal$06 = $CurrVal$0;$i$28 = $156;$k$07 = $k$1;
  } else {
   break;
  }
 }
 if ((label|0) == 8) {
  STACKTOP = sp;return;
 }
 $158 = ($LspCnt$1|0)==(10);
 if ($158) {
  STACKTOP = sp;return;
 }
 $159 = +HEAPF32[((37008 + 8|0))>>2];
 HEAPF32[$LspVect>>2] = $159;
 $160 = +HEAPF32[((37008 + 12|0))>>2];
 HEAPF32[$5>>2] = $160;
 $161 = +HEAPF32[((37008 + 16|0))>>2];
 HEAPF32[$9>>2] = $161;
 $162 = +HEAPF32[((37008 + 20|0))>>2];
 HEAPF32[$13>>2] = $162;
 $163 = +HEAPF32[((37008 + 24|0))>>2];
 HEAPF32[$17>>2] = $163;
 $164 = +HEAPF32[((37008 + 28|0))>>2];
 HEAPF32[$21>>2] = $164;
 $165 = +HEAPF32[((37008 + 32|0))>>2];
 HEAPF32[$25>>2] = $165;
 $166 = +HEAPF32[((37008 + 36|0))>>2];
 HEAPF32[$29>>2] = $166;
 $167 = +HEAPF32[((37008 + 40|0))>>2];
 HEAPF32[$33>>2] = $167;
 $168 = +HEAPF32[((37008 + 44|0))>>2];
 HEAPF32[$37>>2] = $168;
 STACKTOP = sp;return;
}
function _Lsp_Qnt($CurrLsp) {
 $CurrLsp = $CurrLsp|0;
 var $$pre = 0.0, $0 = 0, $1 = 0.0, $10 = 0.0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0.0, $122 = 0.0, $123 = 0.0, $124 = 0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0.0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0;
 var $133 = 0.0, $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0.0, $14 = 0.0, $140 = 0.0, $141 = 0.0, $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0.0, $146 = 0.0, $147 = 0.0, $148 = 0.0, $149 = 0.0, $15 = 0, $150 = 0.0;
 var $151 = 0.0, $152 = 0, $153 = 0, $154 = 0, $155 = 0.0, $156 = 0.0, $157 = 0, $158 = 0.0, $159 = 0.0, $16 = 0.0, $160 = 0, $161 = 0.0, $162 = 0.0, $163 = 0.0, $164 = 0.0, $165 = 0.0, $166 = 0.0, $167 = 0.0, $168 = 0.0, $169 = 0.0;
 var $17 = 0.0, $170 = 0.0, $171 = 0.0, $172 = 0.0, $173 = 0.0, $174 = 0.0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0.0, $180 = 0, $181 = 0, $182 = 0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0.0;
 var $23 = 0, $24 = 0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0;
 var $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0, $57 = 0.0, $58 = 0.0, $59 = 0.0;
 var $6 = 0.0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0, $71 = 0.0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0;
 var $78 = 0.0, $79 = 0.0, $8 = 0.0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0, $88 = 0, $89 = 0.0, $9 = 0.0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0.0, $94 = 0, $95 = 0.0;
 var $96 = 0.0, $97 = 0, $98 = 0.0, $99 = 0.0, $Indx$06$1$i = 0, $Indx$06$i = 0, $Indx$1$1$i = 0, $Indx$1$i = 0, $Indx$21$i = 0, $Indx$3$i = 0, $LspQntPnt$07$1$i = 0, $LspQntPnt$07$i = 0, $LspQntPnt$12$i = 0, $Max$08$1$i = 0.0, $Max$08$i = 0.0, $Max$1$1$i = 0.0, $Max$1$i = 0.0, $Max$23$i = 0.0, $Max$3$i = 0.0, $Min$0 = 0.0;
 var $Wvect = 0, $exitcond = 0, $exitcond$i = 0, $exitcond14$1$i = 0, $exitcond14$i = 0, $i$02 = 0, $i$09$1$i = 0, $i$09$i = 0, $i$14$i = 0, $phitmp$1$i = 0, $phitmp$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $Wvect = sp;
 $0 = (($CurrLsp) + 4|0);
 $1 = +HEAPF32[$0>>2];
 $2 = +HEAPF32[$CurrLsp>>2];
 $3 = $1 - $2;
 $4 = 1.0 / $3;
 HEAPF32[$Wvect>>2] = $4;
 $5 = (($CurrLsp) + 36|0);
 $6 = +HEAPF32[$5>>2];
 $7 = (($CurrLsp) + 32|0);
 $8 = +HEAPF32[$7>>2];
 $9 = $6 - $8;
 $10 = 1.0 / $9;
 $11 = (($Wvect) + 36|0);
 HEAPF32[$11>>2] = $10;
 $17 = $1;$19 = $2;$i$02 = 1;
 while(1) {
  $12 = (($i$02) + 1)|0;
  $13 = (($CurrLsp) + ($12<<2)|0);
  $14 = +HEAPF32[$13>>2];
  $15 = (($CurrLsp) + ($i$02<<2)|0);
  $16 = $14 - $17;
  $18 = $17 - $19;
  $20 = $18 < $16;
  $Min$0 = $20 ? $18 : $16;
  $21 = $Min$0 > 0.0;
  if ($21) {
   $22 = 1.0 / $Min$0;
   $23 = (($Wvect) + ($i$02<<2)|0);
   HEAPF32[$23>>2] = $22;
  } else {
   $24 = (($Wvect) + ($i$02<<2)|0);
   HEAPF32[$24>>2] = 1.0;
  }
  $exitcond = ($12|0)==(9);
  if ($exitcond) {
   break;
  }
  $$pre = +HEAPF32[$15>>2];
  $17 = $14;$19 = $$pre;$i$02 = $12;
 }
 $25 = $2 + -24.460899353027344;
 $26 = +HEAPF32[((37008 + 8|0))>>2];
 $27 = $26 + -24.460899353027344;
 $28 = $27 * 0.375;
 $29 = $25 - $28;
 HEAPF32[$CurrLsp>>2] = $29;
 $30 = $1 + -36.882801055908203;
 $31 = +HEAPF32[((37008 + 12|0))>>2];
 $32 = $31 + -36.882801055908203;
 $33 = $32 * 0.375;
 $34 = $30 - $33;
 HEAPF32[$0>>2] = $34;
 $35 = (($CurrLsp) + 8|0);
 $36 = +HEAPF32[$35>>2];
 $37 = $36 + -60.078098297119141;
 $38 = +HEAPF32[((37008 + 16|0))>>2];
 $39 = $38 + -60.078098297119141;
 $40 = $39 * 0.375;
 $41 = $37 - $40;
 HEAPF32[$35>>2] = $41;
 $42 = (($CurrLsp) + 12|0);
 $43 = +HEAPF32[$42>>2];
 $44 = $43 + -84.421897888183594;
 $45 = +HEAPF32[((37008 + 20|0))>>2];
 $46 = $45 + -84.421897888183594;
 $47 = $46 * 0.375;
 $48 = $44 - $47;
 HEAPF32[$42>>2] = $48;
 $49 = (($CurrLsp) + 16|0);
 $50 = +HEAPF32[$49>>2];
 $51 = $50 + -108.375;
 $52 = +HEAPF32[((37008 + 24|0))>>2];
 $53 = $52 + -108.375;
 $54 = $53 * 0.375;
 $55 = $51 - $54;
 HEAPF32[$49>>2] = $55;
 $56 = (($CurrLsp) + 20|0);
 $57 = +HEAPF32[$56>>2];
 $58 = $57 + -128.86700439453125;
 $59 = +HEAPF32[((37008 + 28|0))>>2];
 $60 = $59 + -128.86700439453125;
 $61 = $60 * 0.375;
 $62 = $58 - $61;
 HEAPF32[$56>>2] = $62;
 $63 = (($CurrLsp) + 24|0);
 $64 = +HEAPF32[$63>>2];
 $65 = $64 + -154.31199645996094;
 $66 = +HEAPF32[((37008 + 32|0))>>2];
 $67 = $66 + -154.31199645996094;
 $68 = $67 * 0.375;
 $69 = $65 - $68;
 HEAPF32[$63>>2] = $69;
 $70 = (($CurrLsp) + 28|0);
 $71 = +HEAPF32[$70>>2];
 $72 = $71 + -173.906005859375;
 $73 = +HEAPF32[((37008 + 36|0))>>2];
 $74 = $73 + -173.906005859375;
 $75 = $74 * 0.375;
 $76 = $72 - $75;
 HEAPF32[$70>>2] = $76;
 $77 = $8 + -199.093994140625;
 $78 = +HEAPF32[((37008 + 40|0))>>2];
 $79 = $78 + -199.093994140625;
 $80 = $79 * 0.375;
 $81 = $77 - $80;
 HEAPF32[$7>>2] = $81;
 $82 = $6 + -216.5469970703125;
 $83 = +HEAPF32[((37008 + 44|0))>>2];
 $84 = $83 + -216.5469970703125;
 $85 = $84 * 0.375;
 $86 = $82 - $85;
 HEAPF32[$5>>2] = $86;
 $87 = (($Wvect) + 4|0);
 $88 = (($Wvect) + 8|0);
 $89 = +HEAPF32[$Wvect>>2];
 $90 = +HEAPF32[$87>>2];
 $91 = +HEAPF32[$88>>2];
 $Indx$06$i = 0;$LspQntPnt$07$i = 2864;$Max$08$i = -1.0;$i$09$i = 0;
 while(1) {
  $92 = +HEAPF32[$LspQntPnt$07$i>>2];
  $93 = $89 * $92;
  $94 = (($LspQntPnt$07$i) + 4|0);
  $95 = +HEAPF32[$94>>2];
  $96 = $90 * $95;
  $97 = (($LspQntPnt$07$i) + 8|0);
  $98 = +HEAPF32[$97>>2];
  $99 = $91 * $98;
  $100 = $29 * $93;
  $101 = $34 * $96;
  $102 = $100 + $101;
  $103 = $41 * $99;
  $104 = $102 + $103;
  $105 = $104 * 2.0;
  $106 = $92 * $93;
  $107 = $95 * $96;
  $108 = $106 + $107;
  $109 = $98 * $99;
  $110 = $108 + $109;
  $111 = $105 - $110;
  $112 = (($LspQntPnt$07$i) + 12|0);
  $113 = $111 > $Max$08$i;
  $Indx$1$i = $113 ? $i$09$i : $Indx$06$i;
  $Max$1$i = $113 ? $111 : $Max$08$i;
  $114 = (($i$09$i) + 1)|0;
  $exitcond14$i = ($114|0)==(256);
  if ($exitcond14$i) {
   break;
  } else {
   $Indx$06$i = $Indx$1$i;$LspQntPnt$07$i = $112;$Max$08$i = $Max$1$i;$i$09$i = $114;
  }
 }
 $phitmp$i = $Indx$1$i << 8;
 $115 = (($Wvect) + 12|0);
 $116 = (($Wvect) + 16|0);
 $117 = (($Wvect) + 20|0);
 $118 = +HEAPF32[$115>>2];
 $119 = +HEAPF32[$116>>2];
 $120 = +HEAPF32[$117>>2];
 $Indx$06$1$i = 0;$LspQntPnt$07$1$i = 5936;$Max$08$1$i = -1.0;$i$09$1$i = 0;
 while(1) {
  $155 = +HEAPF32[$LspQntPnt$07$1$i>>2];
  $156 = $118 * $155;
  $157 = (($LspQntPnt$07$1$i) + 4|0);
  $158 = +HEAPF32[$157>>2];
  $159 = $119 * $158;
  $160 = (($LspQntPnt$07$1$i) + 8|0);
  $161 = +HEAPF32[$160>>2];
  $162 = $120 * $161;
  $163 = $48 * $156;
  $164 = $55 * $159;
  $165 = $163 + $164;
  $166 = $62 * $162;
  $167 = $165 + $166;
  $168 = $167 * 2.0;
  $169 = $155 * $156;
  $170 = $158 * $159;
  $171 = $169 + $170;
  $172 = $161 * $162;
  $173 = $171 + $172;
  $174 = $168 - $173;
  $175 = (($LspQntPnt$07$1$i) + 12|0);
  $176 = $174 > $Max$08$1$i;
  $Indx$1$1$i = $176 ? $i$09$1$i : $Indx$06$1$i;
  $Max$1$1$i = $176 ? $174 : $Max$08$1$i;
  $177 = (($i$09$1$i) + 1)|0;
  $exitcond14$1$i = ($177|0)==(256);
  if ($exitcond14$1$i) {
   break;
  } else {
   $Indx$06$1$i = $Indx$1$1$i;$LspQntPnt$07$1$i = $175;$Max$08$1$i = $Max$1$1$i;$i$09$1$i = $177;
  }
 }
 $178 = $Indx$1$1$i | $phitmp$i;
 $phitmp$1$i = $178 << 8;
 $179 = (($Wvect) + 24|0);
 $180 = (($Wvect) + 28|0);
 $181 = (($Wvect) + 32|0);
 $123 = +HEAPF32[$179>>2];
 $127 = +HEAPF32[$180>>2];
 $131 = +HEAPF32[$181>>2];
 $135 = +HEAPF32[$11>>2];
 $Indx$21$i = 0;$LspQntPnt$12$i = 9008;$Max$23$i = -1.0;$i$14$i = 0;
 while(1) {
  $121 = +HEAPF32[$LspQntPnt$12$i>>2];
  $122 = $123 * $121;
  $124 = (($LspQntPnt$12$i) + 4|0);
  $125 = +HEAPF32[$124>>2];
  $126 = $127 * $125;
  $128 = (($LspQntPnt$12$i) + 8|0);
  $129 = +HEAPF32[$128>>2];
  $130 = $131 * $129;
  $132 = (($LspQntPnt$12$i) + 12|0);
  $133 = +HEAPF32[$132>>2];
  $134 = $135 * $133;
  $136 = $69 * $122;
  $137 = $76 * $126;
  $138 = $136 + $137;
  $139 = $81 * $130;
  $140 = $138 + $139;
  $141 = $86 * $134;
  $142 = $140 + $141;
  $143 = $142 * 2.0;
  $144 = $121 * $122;
  $145 = $125 * $126;
  $146 = $144 + $145;
  $147 = $129 * $130;
  $148 = $146 + $147;
  $149 = $133 * $134;
  $150 = $148 + $149;
  $151 = $143 - $150;
  $152 = (($LspQntPnt$12$i) + 16|0);
  $153 = $151 > $Max$23$i;
  $Indx$3$i = $153 ? $i$14$i : $Indx$21$i;
  $Max$3$i = $153 ? $151 : $Max$23$i;
  $154 = (($i$14$i) + 1)|0;
  $exitcond$i = ($154|0)==(256);
  if ($exitcond$i) {
   break;
  } else {
   $Indx$21$i = $Indx$3$i;$LspQntPnt$12$i = $152;$Max$23$i = $Max$3$i;$i$14$i = $154;
  }
 }
 $182 = $Indx$3$i | $phitmp$1$i;
 STACKTOP = sp;return ($182|0);
}
function _Lsp_Inq($Lsp,$PrevLsp,$LspId,$Crc) {
 $Lsp = $Lsp|0;
 $PrevLsp = $PrevLsp|0;
 $LspId = $LspId|0;
 $Crc = $Crc|0;
 var $$ = 0.0, $$2 = 0.0, $$phi$trans$insert = 0, $$pre = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0, $108 = 0.0, $109 = 0.0, $11 = 0.0, $110 = 0.0, $111 = 0;
 var $112 = 0.0, $113 = 0.0, $114 = 0, $115 = 0.0, $116 = 0.0, $117 = 0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0, $121 = 0.0, $122 = 0.0, $123 = 0, $124 = 0.0, $125 = 0.0, $126 = 0, $127 = 0.0, $128 = 0.0, $129 = 0, $13 = 0.0;
 var $130 = 0.0, $131 = 0.0, $132 = 0, $133 = 0.0, $134 = 0.0, $135 = 0, $136 = 0, $137 = 0, $138 = 0.0, $139 = 0.0, $14 = 0.0, $140 = 0.0, $141 = 0.0, $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0.0, $146 = 0.0, $147 = 0.0, $148 = 0;
 var $149 = 0, $15 = 0.0, $150 = 0, $151 = 0, $152 = 0, $153 = 0.0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0.0, $160 = 0, $161 = 0, $162 = 0.0, $163 = 0, $164 = 0, $165 = 0, $166 = 0.0;
 var $167 = 0.0, $168 = 0.0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0;
 var $33 = 0, $34 = 0.0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0;
 var $51 = 0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0, $58 = 0.0, $59 = 0, $6 = 0.0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0, $68 = 0.0, $69 = 0.0;
 var $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0.0, $73 = 0, $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0, $82 = 0.0, $83 = 0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0;
 var $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0.0, $94 = 0, $95 = 0.0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $LspId$ = 0, $Test$2 = 0, $Test$2$1 = 0, $Test$2$2 = 0, $Test$2$3 = 0, $Test$2$4 = 0, $Test$2$5 = 0;
 var $Test$2$6 = 0, $Test$2$7 = 0, $Test$2$8 = 0, $exitcond = 0, $i$111 = 0, $j$014 = 0, $j$014$1 = 0, $j$014$2 = 0, $j$25 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($Crc<<16>>16)==(0);
 $$ = $0 ? 0.375 : 0.71875;
 $LspId$ = $0 ? $LspId : 0;
 $1 = $LspId$ >>> 8;
 $2 = $LspId$ << 2;
 $3 = $2 & 1020;
 $j$014 = 0;
 while(1) {
  $4 = (($3) + ($j$014))|0;
  $5 = (9008 + ($4<<2)|0);
  $6 = +HEAPF32[$5>>2];
  $7 = (($j$014) + 6)|0;
  $8 = (($Lsp) + ($7<<2)|0);
  HEAPF32[$8>>2] = $6;
  $9 = (($j$014) + 1)|0;
  $10 = ($9|0)<(4);
  if ($10) {
   $j$014 = $9;
  } else {
   break;
  }
 }
 $148 = $1 & 255;
 $149 = $LspId$ >>> 16;
 $150 = ($148*3)|0;
 $j$014$1 = 0;
 while(1) {
  $151 = (($150) + ($j$014$1))|0;
  $152 = (5936 + ($151<<2)|0);
  $153 = +HEAPF32[$152>>2];
  $154 = (($j$014$1) + 3)|0;
  $155 = (($Lsp) + ($154<<2)|0);
  HEAPF32[$155>>2] = $153;
  $156 = (($j$014$1) + 1)|0;
  $157 = ($156|0)<(3);
  if ($157) {
   $j$014$1 = $156;
  } else {
   break;
  }
 }
 $158 = $149 & 255;
 $159 = ($158*3)|0;
 $j$014$2 = 0;
 while(1) {
  $160 = (($159) + ($j$014$2))|0;
  $161 = (2864 + ($160<<2)|0);
  $162 = +HEAPF32[$161>>2];
  $163 = (($Lsp) + ($j$014$2<<2)|0);
  HEAPF32[$163>>2] = $162;
  $164 = (($j$014$2) + 1)|0;
  $165 = ($164|0)<(3);
  if ($165) {
   $j$014$2 = $164;
  } else {
   break;
  }
 }
 $$2 = $0 ? 2.0 : 4.0;
 $11 = +HEAPF32[$Lsp>>2];
 $12 = +HEAPF32[$PrevLsp>>2];
 $13 = $12 + -24.460899353027344;
 $14 = $$ * $13;
 $15 = $11 + $14;
 $16 = $15 + 24.460899353027344;
 HEAPF32[$Lsp>>2] = $16;
 $17 = (($Lsp) + 4|0);
 $18 = +HEAPF32[$17>>2];
 $19 = (($PrevLsp) + 4|0);
 $20 = +HEAPF32[$19>>2];
 $21 = $20 + -36.882801055908203;
 $22 = $$ * $21;
 $23 = $18 + $22;
 $24 = $23 + 36.882801055908203;
 HEAPF32[$17>>2] = $24;
 $25 = (($Lsp) + 8|0);
 $26 = +HEAPF32[$25>>2];
 $27 = (($PrevLsp) + 8|0);
 $28 = +HEAPF32[$27>>2];
 $29 = $28 + -60.078098297119141;
 $30 = $$ * $29;
 $31 = $26 + $30;
 $32 = $31 + 60.078098297119141;
 HEAPF32[$25>>2] = $32;
 $33 = (($Lsp) + 12|0);
 $34 = +HEAPF32[$33>>2];
 $35 = (($PrevLsp) + 12|0);
 $36 = +HEAPF32[$35>>2];
 $37 = $36 + -84.421897888183594;
 $38 = $$ * $37;
 $39 = $34 + $38;
 $40 = $39 + 84.421897888183594;
 HEAPF32[$33>>2] = $40;
 $41 = (($Lsp) + 16|0);
 $42 = +HEAPF32[$41>>2];
 $43 = (($PrevLsp) + 16|0);
 $44 = +HEAPF32[$43>>2];
 $45 = $44 + -108.375;
 $46 = $$ * $45;
 $47 = $42 + $46;
 $48 = $47 + 108.375;
 HEAPF32[$41>>2] = $48;
 $49 = (($Lsp) + 20|0);
 $50 = +HEAPF32[$49>>2];
 $51 = (($PrevLsp) + 20|0);
 $52 = +HEAPF32[$51>>2];
 $53 = $52 + -128.86700439453125;
 $54 = $$ * $53;
 $55 = $50 + $54;
 $56 = $55 + 128.86700439453125;
 HEAPF32[$49>>2] = $56;
 $57 = (($Lsp) + 24|0);
 $58 = +HEAPF32[$57>>2];
 $59 = (($PrevLsp) + 24|0);
 $60 = +HEAPF32[$59>>2];
 $61 = $60 + -154.31199645996094;
 $62 = $$ * $61;
 $63 = $58 + $62;
 $64 = $63 + 154.31199645996094;
 HEAPF32[$57>>2] = $64;
 $65 = (($Lsp) + 28|0);
 $66 = +HEAPF32[$65>>2];
 $67 = (($PrevLsp) + 28|0);
 $68 = +HEAPF32[$67>>2];
 $69 = $68 + -173.906005859375;
 $70 = $$ * $69;
 $71 = $66 + $70;
 $72 = $71 + 173.906005859375;
 HEAPF32[$65>>2] = $72;
 $73 = (($Lsp) + 32|0);
 $74 = +HEAPF32[$73>>2];
 $75 = (($PrevLsp) + 32|0);
 $76 = +HEAPF32[$75>>2];
 $77 = $76 + -199.093994140625;
 $78 = $$ * $77;
 $79 = $74 + $78;
 $80 = $79 + 199.093994140625;
 HEAPF32[$73>>2] = $80;
 $81 = (($Lsp) + 36|0);
 $82 = +HEAPF32[$81>>2];
 $83 = (($PrevLsp) + 36|0);
 $84 = +HEAPF32[$83>>2];
 $85 = $84 + -216.5469970703125;
 $86 = $$ * $85;
 $87 = $82 + $86;
 $88 = $87 + 216.5469970703125;
 HEAPF32[$81>>2] = $88;
 $89 = $$2 + -0.03125;
 $166 = $24;$93 = $16;$95 = $88;$i$111 = 0;
 while(1) {
  $92 = $93 < 3.0;
  if ($92) {
   HEAPF32[$Lsp>>2] = 3.0;
   $167 = 3.0;
  } else {
   $167 = $93;
  }
  $94 = $95 > 252.0;
  if ($94) {
   HEAPF32[$81>>2] = 252.0;
   $97 = $167;$99 = $166;$j$25 = 1;
  } else {
   $97 = $167;$99 = $166;$j$25 = 1;
  }
  while(1) {
   $96 = $$2 + $97;
   $98 = $96 - $99;
   $100 = $98 > 0.0;
   if ($100) {
    $101 = (($j$25) + -1)|0;
    $102 = (($Lsp) + ($j$25<<2)|0);
    $103 = (($Lsp) + ($101<<2)|0);
    $104 = $98 * 0.5;
    $105 = $97 - $104;
    HEAPF32[$103>>2] = $105;
    $106 = $104 + $99;
    HEAPF32[$102>>2] = $106;
    $168 = $106;
   } else {
    $168 = $99;
   }
   $107 = (($j$25) + 1)|0;
   $exitcond = ($107|0)==(10);
   if ($exitcond) {
    break;
   }
   $$phi$trans$insert = (($Lsp) + ($107<<2)|0);
   $$pre = +HEAPF32[$$phi$trans$insert>>2];
   $97 = $168;$99 = $$pre;$j$25 = $107;
  }
  $108 = +HEAPF32[$17>>2];
  $109 = +HEAPF32[$Lsp>>2];
  $110 = $108 - $109;
  $111 = $110 < $89;
  $Test$2 = $111&1;
  $112 = +HEAPF32[$25>>2];
  $113 = $112 - $108;
  $114 = $113 < $89;
  $Test$2$1 = $114 ? 1 : $Test$2;
  $115 = +HEAPF32[$33>>2];
  $116 = $115 - $112;
  $117 = $116 < $89;
  $Test$2$2 = $117 ? 1 : $Test$2$1;
  $118 = +HEAPF32[$41>>2];
  $119 = $118 - $115;
  $120 = $119 < $89;
  $Test$2$3 = $120 ? 1 : $Test$2$2;
  $121 = +HEAPF32[$49>>2];
  $122 = $121 - $118;
  $123 = $122 < $89;
  $Test$2$4 = $123 ? 1 : $Test$2$3;
  $124 = +HEAPF32[$57>>2];
  $125 = $124 - $121;
  $126 = $125 < $89;
  $Test$2$5 = $126 ? 1 : $Test$2$4;
  $127 = +HEAPF32[$65>>2];
  $128 = $127 - $124;
  $129 = $128 < $89;
  $Test$2$6 = $129 ? 1 : $Test$2$5;
  $130 = +HEAPF32[$73>>2];
  $131 = $130 - $127;
  $132 = $131 < $89;
  $Test$2$7 = $132 ? 1 : $Test$2$6;
  $133 = +HEAPF32[$81>>2];
  $134 = $133 - $130;
  $135 = $134 < $89;
  $Test$2$8 = $135 ? 1 : $Test$2$7;
  $136 = ($Test$2$8|0)==(0);
  $90 = (($i$111) + 1)|0;
  if ($136) {
   label = 16;
   break;
  }
  $91 = ($90|0)<(10);
  if ($91) {
   $166 = $108;$93 = $109;$95 = $133;$i$111 = $90;
  } else {
   break;
  }
 }
 if ((label|0) == 16) {
  STACKTOP = sp;return;
 }
 $137 = ($Test$2$8|0)==(1);
 if (!($137)) {
  STACKTOP = sp;return;
 }
 $138 = +HEAPF32[$PrevLsp>>2];
 HEAPF32[$Lsp>>2] = $138;
 $139 = +HEAPF32[$19>>2];
 HEAPF32[$17>>2] = $139;
 $140 = +HEAPF32[$27>>2];
 HEAPF32[$25>>2] = $140;
 $141 = +HEAPF32[$35>>2];
 HEAPF32[$33>>2] = $141;
 $142 = +HEAPF32[$43>>2];
 HEAPF32[$41>>2] = $142;
 $143 = +HEAPF32[$51>>2];
 HEAPF32[$49>>2] = $143;
 $144 = +HEAPF32[$59>>2];
 HEAPF32[$57>>2] = $144;
 $145 = +HEAPF32[$67>>2];
 HEAPF32[$65>>2] = $145;
 $146 = +HEAPF32[$75>>2];
 HEAPF32[$73>>2] = $146;
 $147 = +HEAPF32[$83>>2];
 HEAPF32[$81>>2] = $147;
 STACKTOP = sp;return;
}
function _Lsp_Int($QntLpc,$CurrLsp,$PrevLsp) {
 $QntLpc = $QntLpc|0;
 $CurrLsp = $CurrLsp|0;
 $PrevLsp = $PrevLsp|0;
 var $$phi$trans$insert = 0, $$pre = 0.0, $$pre1 = 0.0, $$pre2 = 0.0, $$pre3 = 0.0, $$pre4 = 0.0, $$pre6 = 0.0, $$pre7 = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0;
 var $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0.0, $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0;
 var $127 = 0.0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0.0, $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0.0, $138 = 0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0, $142 = 0.0, $143 = 0.0, $144 = 0;
 var $145 = 0, $146 = 0, $147 = 0.0, $148 = 0.0, $149 = 0.0, $15 = 0, $150 = 0.0, $151 = 0.0, $152 = 0.0, $153 = 0.0, $154 = 0, $155 = 0, $156 = 0.0, $157 = 0.0, $158 = 0.0, $159 = 0.0, $16 = 0, $160 = 0.0, $161 = 0, $162 = 0;
 var $163 = 0, $164 = 0.0, $165 = 0.0, $166 = 0.0, $167 = 0.0, $168 = 0.0, $169 = 0.0, $17 = 0, $170 = 0, $171 = 0, $172 = 0.0, $173 = 0.0, $174 = 0.0, $175 = 0.0, $176 = 0.0, $177 = 0.0, $178 = 0.0, $179 = 0.0, $18 = 0, $180 = 0.0;
 var $181 = 0.0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0.0, $186 = 0.0, $187 = 0.0, $188 = 0.0, $189 = 0.0, $19 = 0, $190 = 0.0, $191 = 0.0, $192 = 0.0, $193 = 0.0, $194 = 0.0, $195 = 0.0, $196 = 0.0, $197 = 0.0, $198 = 0.0, $199 = 0.0;
 var $2 = 0, $20 = 0, $200 = 0.0, $201 = 0.0, $202 = 0.0, $203 = 0.0, $204 = 0.0, $205 = 0.0, $206 = 0.0, $207 = 0.0, $208 = 0.0, $209 = 0.0, $21 = 0, $210 = 0.0, $211 = 0.0, $212 = 0.0, $213 = 0.0, $214 = 0.0, $215 = 0.0, $216 = 0.0;
 var $217 = 0.0, $218 = 0.0, $219 = 0.0, $22 = 0, $220 = 0.0, $221 = 0.0, $222 = 0.0, $223 = 0.0, $224 = 0.0, $225 = 0.0, $226 = 0.0, $227 = 0.0, $228 = 0.0, $229 = 0.0, $23 = 0, $230 = 0.0, $231 = 0.0, $232 = 0.0, $233 = 0.0, $234 = 0.0;
 var $235 = 0.0, $236 = 0.0, $237 = 0.0, $238 = 0.0, $239 = 0.0, $24 = 0, $240 = 0.0, $241 = 0.0, $242 = 0.0, $243 = 0.0, $244 = 0.0, $245 = 0.0, $246 = 0.0, $247 = 0.0, $248 = 0.0, $249 = 0.0, $25 = 0, $250 = 0.0, $251 = 0.0, $252 = 0.0;
 var $253 = 0.0, $254 = 0.0, $255 = 0.0, $256 = 0.0, $257 = 0.0, $258 = 0.0, $259 = 0.0, $26 = 0, $260 = 0.0, $261 = 0.0, $262 = 0.0, $263 = 0.0, $264 = 0.0, $265 = 0.0, $266 = 0.0, $267 = 0, $268 = 0, $27 = 0, $28 = 0, $29 = 0.0;
 var $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0;
 var $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0;
 var $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0;
 var $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0, $9 = 0, $90 = 0, $91 = 0.0, $92 = 0, $93 = 0, $94 = 0.0, $95 = 0, $96 = 0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $Dpnt$03 = 0, $P$i = 0, $Q$i = 0;
 var $exitcond = 0, $exitcond$i = 0, $exitcond5$i = 0, $floorf$i = 0.0, $i$02 = 0, $i$04$i = 0, $i$13$i = 0, $j$02$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $P$i = sp + 24|0;
 $Q$i = sp;
 $0 = (($PrevLsp) + 4|0);
 $1 = (($CurrLsp) + 4|0);
 $2 = (($PrevLsp) + 8|0);
 $3 = (($CurrLsp) + 8|0);
 $4 = (($PrevLsp) + 12|0);
 $5 = (($CurrLsp) + 12|0);
 $6 = (($PrevLsp) + 16|0);
 $7 = (($CurrLsp) + 16|0);
 $8 = (($PrevLsp) + 20|0);
 $9 = (($CurrLsp) + 20|0);
 $10 = (($PrevLsp) + 24|0);
 $11 = (($CurrLsp) + 24|0);
 $12 = (($PrevLsp) + 28|0);
 $13 = (($CurrLsp) + 28|0);
 $14 = (($PrevLsp) + 32|0);
 $15 = (($CurrLsp) + 32|0);
 $16 = (($PrevLsp) + 36|0);
 $17 = (($CurrLsp) + 36|0);
 $18 = (($P$i) + 4|0);
 $19 = (($P$i) + 8|0);
 $20 = (($Q$i) + 4|0);
 $21 = (($Q$i) + 8|0);
 $22 = (($P$i) + 12|0);
 $23 = (($Q$i) + 12|0);
 $24 = (($P$i) + 16|0);
 $25 = (($Q$i) + 16|0);
 $26 = (($P$i) + 20|0);
 $27 = (($Q$i) + 20|0);
 $Dpnt$03 = $QntLpc;$i$02 = 0;
 while(1) {
  $28 = (24 + ($i$02<<2)|0);
  $29 = +HEAPF32[$28>>2];
  $30 = 1.0 - $29;
  $31 = +HEAPF32[$PrevLsp>>2];
  $32 = $30 * $31;
  $33 = +HEAPF32[$CurrLsp>>2];
  $34 = $29 * $33;
  $35 = $32 + $34;
  HEAPF32[$Dpnt$03>>2] = $35;
  $36 = +HEAPF32[$0>>2];
  $37 = $30 * $36;
  $38 = +HEAPF32[$1>>2];
  $39 = $29 * $38;
  $40 = $37 + $39;
  $41 = (($Dpnt$03) + 4|0);
  HEAPF32[$41>>2] = $40;
  $42 = +HEAPF32[$2>>2];
  $43 = $30 * $42;
  $44 = +HEAPF32[$3>>2];
  $45 = $29 * $44;
  $46 = $43 + $45;
  $47 = (($Dpnt$03) + 8|0);
  HEAPF32[$47>>2] = $46;
  $48 = +HEAPF32[$4>>2];
  $49 = $30 * $48;
  $50 = +HEAPF32[$5>>2];
  $51 = $29 * $50;
  $52 = $49 + $51;
  $53 = (($Dpnt$03) + 12|0);
  HEAPF32[$53>>2] = $52;
  $54 = +HEAPF32[$6>>2];
  $55 = $30 * $54;
  $56 = +HEAPF32[$7>>2];
  $57 = $29 * $56;
  $58 = $55 + $57;
  $59 = (($Dpnt$03) + 16|0);
  HEAPF32[$59>>2] = $58;
  $60 = +HEAPF32[$8>>2];
  $61 = $30 * $60;
  $62 = +HEAPF32[$9>>2];
  $63 = $29 * $62;
  $64 = $61 + $63;
  $65 = (($Dpnt$03) + 20|0);
  HEAPF32[$65>>2] = $64;
  $66 = +HEAPF32[$10>>2];
  $67 = $30 * $66;
  $68 = +HEAPF32[$11>>2];
  $69 = $29 * $68;
  $70 = $67 + $69;
  $71 = (($Dpnt$03) + 24|0);
  HEAPF32[$71>>2] = $70;
  $72 = +HEAPF32[$12>>2];
  $73 = $30 * $72;
  $74 = +HEAPF32[$13>>2];
  $75 = $29 * $74;
  $76 = $73 + $75;
  $77 = (($Dpnt$03) + 28|0);
  HEAPF32[$77>>2] = $76;
  $78 = +HEAPF32[$14>>2];
  $79 = $30 * $78;
  $80 = +HEAPF32[$15>>2];
  $81 = $29 * $80;
  $82 = $79 + $81;
  $83 = (($Dpnt$03) + 32|0);
  HEAPF32[$83>>2] = $82;
  $84 = +HEAPF32[$16>>2];
  $85 = $30 * $84;
  $86 = +HEAPF32[$17>>2];
  $87 = $29 * $86;
  $88 = $85 + $87;
  $89 = (($Dpnt$03) + 36|0);
  HEAPF32[$89>>2] = $88;
  $91 = $35;$i$04$i = 0;
  while(1) {
   $90 = (($Dpnt$03) + ($i$04$i<<2)|0);
   $floorf$i = (+Math_floor((+$91)));
   $92 = (~~(($floorf$i)));
   $93 = (816 + ($92<<2)|0);
   $94 = +HEAPF32[$93>>2];
   $95 = (($92) + 1)|0;
   $96 = (816 + ($95<<2)|0);
   $97 = +HEAPF32[$96>>2];
   $98 = $97 - $94;
   $99 = $91 - $floorf$i;
   $100 = $99 * $98;
   $101 = $94 + $100;
   $102 = -$101;
   HEAPF32[$90>>2] = $102;
   $103 = (($i$04$i) + 1)|0;
   $exitcond5$i = ($103|0)==(10);
   if ($exitcond5$i) {
    break;
   }
   $$phi$trans$insert = (($Dpnt$03) + ($103<<2)|0);
   $$pre = +HEAPF32[$$phi$trans$insert>>2];
   $91 = $$pre;$i$04$i = $103;
  }
  HEAPF32[$P$i>>2] = 0.5;
  $104 = +HEAPF32[$Dpnt$03>>2];
  $105 = +HEAPF32[$47>>2];
  $106 = $104 + $105;
  HEAPF32[$18>>2] = $106;
  $107 = +HEAPF32[$Dpnt$03>>2];
  $108 = $107 * 2.0;
  $109 = +HEAPF32[$47>>2];
  $110 = $108 * $109;
  $111 = $110 + 1.0;
  HEAPF32[$19>>2] = $111;
  HEAPF32[$Q$i>>2] = 0.5;
  $112 = +HEAPF32[$41>>2];
  $113 = +HEAPF32[$53>>2];
  $114 = $112 + $113;
  HEAPF32[$20>>2] = $114;
  $115 = +HEAPF32[$41>>2];
  $116 = $115 * 2.0;
  $117 = +HEAPF32[$53>>2];
  $118 = $116 * $117;
  $119 = $118 + 1.0;
  HEAPF32[$21>>2] = $119;
  $125 = $111;$127 = $106;$135 = $119;$137 = $114;$i$13$i = 2;
  while(1) {
   $120 = (($P$i) + ($i$13$i<<2)|0);
   $121 = $i$13$i << 1;
   $122 = (($Dpnt$03) + ($121<<2)|0);
   $123 = +HEAPF32[$122>>2];
   $124 = $125 * $123;
   $126 = $127 + $124;
   $128 = (($i$13$i) + 1)|0;
   $129 = (($P$i) + ($128<<2)|0);
   HEAPF32[$129>>2] = $126;
   $130 = (($Q$i) + ($i$13$i<<2)|0);
   $131 = $121 | 1;
   $132 = (($Dpnt$03) + ($131<<2)|0);
   $133 = +HEAPF32[$132>>2];
   $134 = $135 * $133;
   $136 = $137 + $134;
   $138 = (($Q$i) + ($128<<2)|0);
   HEAPF32[$138>>2] = $136;
   $139 = +HEAPF32[$122>>2];
   $140 = +HEAPF32[$132>>2];
   $143 = $127;$149 = $125;$153 = $137;$158 = $135;$j$02$i = $i$13$i;
   while(1) {
    $141 = (($j$02$i) + -1)|0;
    $142 = $143 * $139;
    $144 = (($P$i) + ($j$02$i<<2)|0);
    $145 = (($j$02$i) + -2)|0;
    $146 = (($P$i) + ($145<<2)|0);
    $147 = +HEAPF32[$146>>2];
    $148 = $149 + $147;
    $150 = $148 * 0.5;
    $151 = $142 + $150;
    HEAPF32[$144>>2] = $151;
    $152 = $153 * $140;
    $154 = (($Q$i) + ($j$02$i<<2)|0);
    $155 = (($Q$i) + ($145<<2)|0);
    $156 = +HEAPF32[$155>>2];
    $157 = $158 + $156;
    $159 = $157 * 0.5;
    $160 = $152 + $159;
    HEAPF32[$154>>2] = $160;
    $161 = ($141|0)>(1);
    if (!($161)) {
     break;
    }
    $162 = (($Q$i) + ($141<<2)|0);
    $163 = (($P$i) + ($141<<2)|0);
    $$pre6 = +HEAPF32[$163>>2];
    $$pre7 = +HEAPF32[$162>>2];
    $143 = $147;$149 = $$pre6;$153 = $156;$158 = $$pre7;$j$02$i = $141;
   }
   $164 = +HEAPF32[$P$i>>2];
   $165 = $164 * 0.5;
   HEAPF32[$P$i>>2] = $165;
   $166 = +HEAPF32[$Q$i>>2];
   $167 = $166 * 0.5;
   HEAPF32[$Q$i>>2] = $167;
   $168 = +HEAPF32[$18>>2];
   $169 = +HEAPF32[$122>>2];
   $170 = (($i$13$i) + -2)|0;
   $171 = (40 + ($170<<2)|0);
   $172 = +HEAPF32[$171>>2];
   $173 = $169 * $172;
   $174 = $168 + $173;
   $175 = $174 * 0.5;
   HEAPF32[$18>>2] = $175;
   $176 = +HEAPF32[$20>>2];
   $177 = +HEAPF32[$132>>2];
   $178 = $177 * $172;
   $179 = $176 + $178;
   $180 = $179 * 0.5;
   HEAPF32[$20>>2] = $180;
   $exitcond$i = ($128|0)==(5);
   if ($exitcond$i) {
    break;
   }
   $$pre1 = +HEAPF32[$120>>2];
   $$pre2 = +HEAPF32[$129>>2];
   $$pre3 = +HEAPF32[$130>>2];
   $$pre4 = +HEAPF32[$138>>2];
   $125 = $$pre2;$127 = $$pre1;$135 = $$pre4;$137 = $$pre3;$i$13$i = $128;
  }
  $181 = -$165;
  $182 = $181 - $175;
  $183 = $182 + $167;
  $184 = $183 - $180;
  $185 = $184 * 8.0;
  HEAPF32[$Dpnt$03>>2] = $185;
  $186 = +HEAPF32[$P$i>>2];
  $187 = -$186;
  $188 = +HEAPF32[$18>>2];
  $189 = $187 - $188;
  $190 = +HEAPF32[$Q$i>>2];
  $191 = $189 - $190;
  $192 = +HEAPF32[$20>>2];
  $193 = $191 + $192;
  $194 = $193 * 8.0;
  HEAPF32[$89>>2] = $194;
  $195 = +HEAPF32[$18>>2];
  $196 = -$195;
  $197 = +HEAPF32[$19>>2];
  $198 = $196 - $197;
  $199 = +HEAPF32[$20>>2];
  $200 = $198 + $199;
  $201 = +HEAPF32[$21>>2];
  $202 = $200 - $201;
  $203 = $202 * 8.0;
  HEAPF32[$41>>2] = $203;
  $204 = +HEAPF32[$18>>2];
  $205 = -$204;
  $206 = +HEAPF32[$19>>2];
  $207 = $205 - $206;
  $208 = +HEAPF32[$20>>2];
  $209 = $207 - $208;
  $210 = +HEAPF32[$21>>2];
  $211 = $209 + $210;
  $212 = $211 * 8.0;
  HEAPF32[$83>>2] = $212;
  $213 = +HEAPF32[$19>>2];
  $214 = -$213;
  $215 = +HEAPF32[$22>>2];
  $216 = $214 - $215;
  $217 = +HEAPF32[$21>>2];
  $218 = $216 + $217;
  $219 = +HEAPF32[$23>>2];
  $220 = $218 - $219;
  $221 = $220 * 8.0;
  HEAPF32[$47>>2] = $221;
  $222 = +HEAPF32[$19>>2];
  $223 = -$222;
  $224 = +HEAPF32[$22>>2];
  $225 = $223 - $224;
  $226 = +HEAPF32[$21>>2];
  $227 = $225 - $226;
  $228 = +HEAPF32[$23>>2];
  $229 = $227 + $228;
  $230 = $229 * 8.0;
  HEAPF32[$77>>2] = $230;
  $231 = +HEAPF32[$22>>2];
  $232 = -$231;
  $233 = +HEAPF32[$24>>2];
  $234 = $232 - $233;
  $235 = +HEAPF32[$23>>2];
  $236 = $234 + $235;
  $237 = +HEAPF32[$25>>2];
  $238 = $236 - $237;
  $239 = $238 * 8.0;
  HEAPF32[$53>>2] = $239;
  $240 = +HEAPF32[$22>>2];
  $241 = -$240;
  $242 = +HEAPF32[$24>>2];
  $243 = $241 - $242;
  $244 = +HEAPF32[$23>>2];
  $245 = $243 - $244;
  $246 = +HEAPF32[$25>>2];
  $247 = $245 + $246;
  $248 = $247 * 8.0;
  HEAPF32[$71>>2] = $248;
  $249 = +HEAPF32[$24>>2];
  $250 = -$249;
  $251 = +HEAPF32[$26>>2];
  $252 = $250 - $251;
  $253 = +HEAPF32[$25>>2];
  $254 = $252 + $253;
  $255 = +HEAPF32[$27>>2];
  $256 = $254 - $255;
  $257 = $256 * 8.0;
  HEAPF32[$59>>2] = $257;
  $258 = +HEAPF32[$24>>2];
  $259 = -$258;
  $260 = +HEAPF32[$26>>2];
  $261 = $259 - $260;
  $262 = +HEAPF32[$25>>2];
  $263 = $261 - $262;
  $264 = +HEAPF32[$27>>2];
  $265 = $263 + $264;
  $266 = $265 * 8.0;
  HEAPF32[$65>>2] = $266;
  $267 = (($Dpnt$03) + 40|0);
  $268 = (($i$02) + 1)|0;
  $exitcond = ($268|0)==(4);
  if ($exitcond) {
   break;
  } else {
   $Dpnt$03 = $267;$i$02 = $268;
  }
 }
 STACKTOP = sp;return;
}
function _Calc_Exc_Rand($curGain,$PrevExc,$DataExc,$nRandom,$Line,$Codec_Info) {
 $curGain = +$curGain;
 $PrevExc = $PrevExc|0;
 $DataExc = $DataExc|0;
 $nRandom = $nRandom|0;
 $Line = $Line|0;
 $Codec_Info = $Codec_Info|0;
 var $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0, $103 = 0, $104 = 0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0, $127 = 0, $128 = 0, $129 = 0.0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0;
 var $133 = 0, $134 = 0.0, $135 = 0.0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0.0, $183 = 0.0, $184 = 0, $185 = 0, $186 = 0.0, $187 = 0.0;
 var $188 = 0.0, $189 = 0, $19 = 0, $190 = 0, $191 = 0.0, $192 = 0.0, $193 = 0.0, $194 = 0.0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0.0, $201 = 0.0, $202 = 0.0, $203 = 0.0, $204 = 0;
 var $205 = 0, $206 = 0, $207 = 0, $208 = 0.0, $209 = 0, $21 = 0, $210 = 0.0, $211 = 0.0, $212 = 0.0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0.0, $218 = 0, $219 = 0.0, $22 = 0, $220 = 0.0, $221 = 0.0, $222 = 0;
 var $223 = 0, $224 = 0, $225 = 0, $226 = 0.0, $227 = 0, $228 = 0.0, $229 = 0.0, $23 = 0, $230 = 0.0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0.0, $236 = 0, $237 = 0.0, $238 = 0.0, $239 = 0.0, $24 = 0, $240 = 0;
 var $241 = 0, $242 = 0, $243 = 0, $244 = 0.0, $245 = 0, $246 = 0.0, $247 = 0.0, $248 = 0.0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0.0, $254 = 0, $255 = 0.0, $256 = 0.0, $257 = 0.0, $258 = 0, $259 = 0;
 var $26 = 0, $260 = 0, $261 = 0, $262 = 0.0, $263 = 0, $264 = 0.0, $265 = 0.0, $266 = 0.0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0.0, $272 = 0, $273 = 0.0, $274 = 0.0, $275 = 0.0, $276 = 0, $277 = 0;
 var $278 = 0, $279 = 0, $28 = 0, $280 = 0.0, $281 = 0, $282 = 0.0, $283 = 0.0, $284 = 0.0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0.0, $29 = 0, $290 = 0, $291 = 0.0, $292 = 0.0, $293 = 0.0, $294 = 0.0, $295 = 0.0;
 var $296 = 0.0, $297 = 0.0, $298 = 0.0, $299 = 0, $3 = 0, $30 = 0, $300 = 0.0, $301 = 0.0, $302 = 0.0, $303 = 0.0, $304 = 0, $305 = 0.0, $306 = 0, $307 = 0, $308 = 0, $309 = 0.0, $31 = 0, $310 = 0.0, $311 = 0, $312 = 0;
 var $313 = 0.0, $314 = 0.0, $315 = 0.0, $316 = 0.0, $317 = 0.0, $318 = 0.0, $319 = 0.0, $32 = 0, $320 = 0.0, $321 = 0.0, $322 = 0.0, $323 = 0.0, $324 = 0.0, $325 = 0.0, $326 = 0.0, $327 = 0.0, $328 = 0.0, $329 = 0.0, $33 = 0, $330 = 0.0;
 var $331 = 0.0, $332 = 0.0, $333 = 0.0, $334 = 0.0, $335 = 0.0, $336 = 0.0, $337 = 0.0, $338 = 0.0, $339 = 0.0, $34 = 0, $340 = 0.0, $341 = 0.0, $342 = 0.0, $343 = 0.0, $344 = 0.0, $345 = 0, $346 = 0.0, $347 = 0, $348 = 0, $349 = 0;
 var $35 = 0, $350 = 0, $351 = 0.0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0.0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0, $74 = 0, $75 = 0.0, $76 = 0.0, $77 = 0.0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0, $86 = 0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0.0, $94 = 0.0, $95 = 0.0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0.0, $TabPos = 0, $TabSign = 0, $curExc$015 = 0, $exitcond = 0, $exitcond36 = 0, $exitcond38 = 0, $exitcond41 = 0, $exitcond42 = 0, $exitcond43 = 0, $exitcond47 = 0, $fabsf = 0.0, $fabsf1 = 0.0, $i$01$i = 0, $i$120 = 0, $i$223 = 0, $i$59 = 0;
 var $i$611 = 0, $i$712 = 0, $i_subfr$125 = 0, $i_subfr$217 = 0, $iblk$031 = 0, $iblk$116 = 0, $offset = 0, $phitmp = 0, $ptr1$030 = 0, $ptr_TabPos$024 = 0, $ptr_TabPos$121 = 0, $ptr_TabPos$213 = 0, $ptr_TabSign$029 = 0, $ptr_TabSign$214 = 0, $scevgep = 0, $scevgep34 = 0, $scevgep45 = 0, $sext = 0, $sext2 = 0, $sext3 = 0;
 var $sext4 = 0, $sext5 = 0, $sum$02$i = 0.0, $temp16$122 = 0, $tmp = 0, $x1$0 = 0.0, $x1$1 = 0.0, $x1$2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0;
 $TabPos = sp + 156|0;
 $TabSign = sp;
 $tmp = sp + 96|0;
 $offset = sp + 88|0;
 $0 = HEAP16[$nRandom>>1]|0;
 $1 = $0 << 16 >> 16;
 $2 = ($1*521)|0;
 $3 = (($2) + 259)|0;
 $4 = $3 & 32767;
 $5 = ($4*21)|0;
 $6 = $5 >>> 15;
 $7 = (($6) + 123)|0;
 $8 = (($Line) + 8|0);
 HEAP32[$8>>2] = $7;
 $sext = $3 << 16;
 $9 = $sext >> 16;
 $10 = ($9*521)|0;
 $11 = (($10) + 259)|0;
 $12 = $11 & 32767;
 $13 = ($12*21)|0;
 $14 = $13 >>> 15;
 $15 = (($14) + 123)|0;
 $16 = (($Line) + 12|0);
 HEAP32[$16>>2] = $15;
 $sext2 = $11 << 16;
 $17 = $sext2 >> 16;
 $18 = ($17*521)|0;
 $19 = (($18) + 259)|0;
 $20 = $19 & 32767;
 $21 = ($20*50)|0;
 $22 = $21 >>> 15;
 $23 = (($22) + 1)|0;
 $24 = (($Line) + 20|0);
 HEAP32[$24>>2] = $23;
 $sext3 = $19 << 16;
 $25 = $sext3 >> 16;
 $26 = ($25*521)|0;
 $27 = (($26) + 259)|0;
 $28 = $27 & 32767;
 $29 = ($28*50)|0;
 $30 = $29 >>> 15;
 $31 = (($30) + 1)|0;
 $32 = (($Line) + 48|0);
 HEAP32[$32>>2] = $31;
 $sext4 = $27 << 16;
 $33 = $sext4 >> 16;
 $34 = ($33*521)|0;
 $35 = (($34) + 259)|0;
 $36 = $35 & 32767;
 $37 = ($36*50)|0;
 $38 = $37 >>> 15;
 $39 = (($38) + 1)|0;
 $40 = (($Line) + 76|0);
 HEAP32[$40>>2] = $39;
 $sext5 = $35 << 16;
 $41 = $sext5 >> 16;
 $42 = ($41*521)|0;
 $43 = (($42) + 259)|0;
 $44 = $43&65535;
 HEAP16[$nRandom>>1] = $44;
 $45 = $43 & 32767;
 $46 = ($45*50)|0;
 $47 = $46 >>> 15;
 $48 = (($47) + 1)|0;
 $49 = (($Line) + 104|0);
 HEAP32[$49>>2] = $48;
 $50 = (($Line) + 16|0);
 HEAP32[$50>>2] = 1;
 $51 = (($Line) + 44|0);
 HEAP32[$51>>2] = 0;
 $52 = (($Line) + 72|0);
 HEAP32[$52>>2] = 1;
 $53 = (($Line) + 100|0);
 HEAP32[$53>>2] = 3;
 $55 = $44;$iblk$031 = 1;$ptr1$030 = $offset;$ptr_TabSign$029 = $TabSign;
 while(1) {
  $54 = $55 << 16 >> 16;
  $56 = ($54*521)|0;
  $57 = (($56) + 259)|0;
  $58 = $57&65535;
  HEAP16[$nRandom>>1] = $58;
  $59 = $57 >>> 2;
  $60 = $59 & 1;
  $61 = $60&65535;
  $62 = (($ptr1$030) + 2|0);
  HEAP16[$ptr1$030>>1] = $61;
  $63 = $57 >>> 3;
  $64 = $63 & 1;
  $65 = $64 | 60;
  $66 = $65&65535;
  HEAP16[$62>>1] = $66;
  $67 = $57 >>> 4;
  $68 = $67 & 1;
  $69 = (+($68|0));
  $70 = $69 * 2.0;
  $71 = $70 + -1.0;
  $72 = (($ptr_TabSign$029) + 4|0);
  HEAPF32[$ptr_TabSign$029>>2] = $71;
  $73 = $57 >>> 5;
  $74 = $73 & 1;
  $75 = (+($74|0));
  $76 = $75 * 2.0;
  $77 = $76 + -1.0;
  $78 = (($ptr_TabSign$029) + 8|0);
  HEAPF32[$72>>2] = $77;
  $79 = $57 >>> 6;
  $80 = $79 & 1;
  $81 = (+($80|0));
  $82 = $81 * 2.0;
  $83 = $82 + -1.0;
  $84 = (($ptr_TabSign$029) + 12|0);
  HEAPF32[$78>>2] = $83;
  $85 = $57 >>> 7;
  $86 = $85 & 1;
  $87 = (+($86|0));
  $88 = $87 * 2.0;
  $89 = $88 + -1.0;
  $90 = (($ptr_TabSign$029) + 16|0);
  HEAPF32[$84>>2] = $89;
  $91 = $57 >>> 8;
  $92 = $91 & 1;
  $93 = (+($92|0));
  $94 = $93 * 2.0;
  $95 = $94 + -1.0;
  $96 = (($ptr_TabSign$029) + 20|0);
  HEAPF32[$90>>2] = $95;
  $97 = $57 >>> 9;
  $98 = $97 & 1;
  $99 = (+($98|0));
  $100 = $99 * 2.0;
  $101 = $100 + -1.0;
  $102 = (($ptr_TabSign$029) + 24|0);
  HEAPF32[$96>>2] = $101;
  $103 = $57 >>> 10;
  $104 = $103 & 1;
  $105 = (+($104|0));
  $106 = $105 * 2.0;
  $107 = $106 + -1.0;
  $108 = (($ptr_TabSign$029) + 28|0);
  HEAPF32[$102>>2] = $107;
  $109 = $57 >>> 11;
  $110 = $109 & 1;
  $111 = (+($110|0));
  $112 = $111 * 2.0;
  $113 = $112 + -1.0;
  $114 = (($ptr_TabSign$029) + 32|0);
  HEAPF32[$108>>2] = $113;
  $115 = $57 >>> 12;
  $116 = $115 & 1;
  $117 = (+($116|0));
  $118 = $117 * 2.0;
  $119 = $118 + -1.0;
  $120 = (($ptr_TabSign$029) + 36|0);
  HEAPF32[$114>>2] = $119;
  $121 = $57 >>> 13;
  $122 = $121 & 1;
  $123 = (+($122|0));
  $124 = $123 * 2.0;
  $125 = $124 + -1.0;
  $126 = (($ptr_TabSign$029) + 40|0);
  HEAPF32[$120>>2] = $125;
  $127 = $57 >>> 14;
  $128 = $127 & 1;
  $129 = (+($128|0));
  $130 = $129 * 2.0;
  $131 = $130 + -1.0;
  HEAPF32[$126>>2] = $131;
  $exitcond47 = ($iblk$031|0)==(2);
  if ($exitcond47) {
   break;
  }
  $scevgep45 = (($ptr_TabSign$029) + 44|0);
  $132 = (($ptr1$030) + 4|0);
  $$pre = HEAP16[$nRandom>>1]|0;
  $phitmp = (($iblk$031) + 1)|0;
  $55 = $$pre;$iblk$031 = $phitmp;$ptr1$030 = $132;$ptr_TabSign$029 = $scevgep45;
 }
 $i_subfr$125 = 0;$ptr_TabPos$024 = $TabPos;
 while(1) {
  $i$120 = 0;
  while(1) {
   $136 = $i$120&65535;
   $137 = (($tmp) + ($i$120<<1)|0);
   HEAP16[$137>>1] = $136;
   $138 = (($i$120) + 1)|0;
   $exitcond42 = ($138|0)==(30);
   if ($exitcond42) {
    break;
   } else {
    $i$120 = $138;
   }
  }
  $139 = (13264 + ($i_subfr$125<<2)|0);
  $140 = (($offset) + ($i_subfr$125<<1)|0);
  $141 = HEAP32[$139>>2]|0;
  $i$223 = 0;$ptr_TabPos$121 = $ptr_TabPos$024;$temp16$122 = 30;
  while(1) {
   $142 = HEAP16[$nRandom>>1]|0;
   $143 = $142 << 16 >> 16;
   $144 = ($143*521)|0;
   $145 = (($144) + 259)|0;
   $146 = $145&65535;
   HEAP16[$nRandom>>1] = $146;
   $147 = $145 & 32767;
   $148 = $temp16$122 << 16 >> 16;
   $149 = Math_imul($147, $148)|0;
   $150 = $149 << 1;
   $151 = $150 >> 16;
   $152 = (($tmp) + ($151<<1)|0);
   $153 = HEAP16[$152>>1]|0;
   $154 = $153 << 16 >> 16;
   $155 = $154 << 1;
   $156 = HEAP16[$140>>1]|0;
   $157 = $156&65535;
   $158 = (($155) + ($157))|0;
   $159 = $158&65535;
   $160 = (($ptr_TabPos$121) + 2|0);
   HEAP16[$ptr_TabPos$121>>1] = $159;
   $161 = (($temp16$122) + -1)<<16>>16;
   $162 = $161 << 16 >> 16;
   $163 = (($tmp) + ($162<<1)|0);
   $164 = HEAP16[$163>>1]|0;
   HEAP16[$152>>1] = $164;
   $165 = (($i$223) + 1)|0;
   $166 = ($165|0)<($141|0);
   if ($166) {
    $i$223 = $165;$ptr_TabPos$121 = $160;$temp16$122 = $161;
   } else {
    break;
   }
  }
  $167 = (($i_subfr$125) + 1)|0;
  $exitcond43 = ($167|0)==(4);
  if ($exitcond43) {
   break;
  } else {
   $i_subfr$125 = $167;$ptr_TabPos$024 = $160;
  }
 }
 $133 = (($PrevExc) + 240|0);
 $134 = $curGain * $curGain;
 $135 = $134 * 120.0;
 $curExc$015 = $DataExc;$i_subfr$217 = 0;$iblk$116 = 0;$ptr_TabPos$213 = $TabPos;$ptr_TabSign$214 = $TabSign;
 while(1) {
  $168 = ((($Line) + ($iblk$116<<2)|0) + 8|0);
  $169 = HEAP32[$168>>2]|0;
  $170 = ((($Line) + (($i_subfr$217*28)|0)|0) + 16|0);
  $171 = HEAP32[$170>>2]|0;
  $172 = ((($Line) + (($i_subfr$217*28)|0)|0) + 20|0);
  $173 = HEAP32[$172>>2]|0;
  _Decod_Acbk($curExc$015,$PrevExc,$Codec_Info,$169,$171,$173);
  $174 = (($curExc$015) + 240|0);
  $175 = HEAP32[$168>>2]|0;
  $176 = $i_subfr$217 | 1;
  $177 = ((($Line) + (($176*28)|0)|0) + 16|0);
  $178 = HEAP32[$177>>2]|0;
  $179 = ((($Line) + (($176*28)|0)|0) + 20|0);
  $180 = HEAP32[$179>>2]|0;
  _Decod_Acbk($174,$133,$Codec_Info,$175,$178,$180);
  $i$01$i = 0;$sum$02$i = 0.0;
  while(1) {
   $181 = (($curExc$015) + ($i$01$i<<2)|0);
   $182 = +HEAPF32[$181>>2];
   $183 = $182 * $182;
   $184 = (($i$01$i) + 1)|0;
   $185 = (($curExc$015) + ($184<<2)|0);
   $186 = +HEAPF32[$185>>2];
   $187 = $186 * $186;
   $188 = $183 + $187;
   $189 = (($i$01$i) + 2)|0;
   $190 = (($curExc$015) + ($189<<2)|0);
   $191 = +HEAPF32[$190>>2];
   $192 = $191 * $191;
   $193 = $188 + $192;
   $194 = $sum$02$i + $193;
   $195 = (($i$01$i) + 3)|0;
   $196 = ($195|0)<(120);
   if ($196) {
    $i$01$i = $195;$sum$02$i = $194;
   } else {
    break;
   }
  }
  $197 = HEAP16[$ptr_TabPos$213>>1]|0;
  $198 = $197 << 16 >> 16;
  $199 = (($curExc$015) + ($198<<2)|0);
  $200 = +HEAPF32[$199>>2];
  $201 = +HEAPF32[$ptr_TabSign$214>>2];
  $202 = $200 * $201;
  $203 = $202 + 0.0;
  $204 = (($ptr_TabPos$213) + 2|0);
  $205 = HEAP16[$204>>1]|0;
  $206 = $205 << 16 >> 16;
  $207 = (($curExc$015) + ($206<<2)|0);
  $208 = +HEAPF32[$207>>2];
  $209 = (($ptr_TabSign$214) + 4|0);
  $210 = +HEAPF32[$209>>2];
  $211 = $208 * $210;
  $212 = $203 + $211;
  $213 = (($ptr_TabPos$213) + 4|0);
  $214 = HEAP16[$213>>1]|0;
  $215 = $214 << 16 >> 16;
  $216 = (($curExc$015) + ($215<<2)|0);
  $217 = +HEAPF32[$216>>2];
  $218 = (($ptr_TabSign$214) + 8|0);
  $219 = +HEAPF32[$218>>2];
  $220 = $217 * $219;
  $221 = $212 + $220;
  $222 = (($ptr_TabPos$213) + 6|0);
  $223 = HEAP16[$222>>1]|0;
  $224 = $223 << 16 >> 16;
  $225 = (($curExc$015) + ($224<<2)|0);
  $226 = +HEAPF32[$225>>2];
  $227 = (($ptr_TabSign$214) + 12|0);
  $228 = +HEAPF32[$227>>2];
  $229 = $226 * $228;
  $230 = $221 + $229;
  $231 = (($ptr_TabPos$213) + 8|0);
  $232 = HEAP16[$231>>1]|0;
  $233 = $232 << 16 >> 16;
  $234 = (($curExc$015) + ($233<<2)|0);
  $235 = +HEAPF32[$234>>2];
  $236 = (($ptr_TabSign$214) + 16|0);
  $237 = +HEAPF32[$236>>2];
  $238 = $235 * $237;
  $239 = $230 + $238;
  $240 = (($ptr_TabPos$213) + 10|0);
  $241 = HEAP16[$240>>1]|0;
  $242 = $241 << 16 >> 16;
  $243 = (($curExc$015) + ($242<<2)|0);
  $244 = +HEAPF32[$243>>2];
  $245 = (($ptr_TabSign$214) + 20|0);
  $246 = +HEAPF32[$245>>2];
  $247 = $244 * $246;
  $248 = $239 + $247;
  $249 = (($ptr_TabPos$213) + 12|0);
  $250 = HEAP16[$249>>1]|0;
  $251 = $250 << 16 >> 16;
  $252 = (($curExc$015) + ($251<<2)|0);
  $253 = +HEAPF32[$252>>2];
  $254 = (($ptr_TabSign$214) + 24|0);
  $255 = +HEAPF32[$254>>2];
  $256 = $253 * $255;
  $257 = $248 + $256;
  $258 = (($ptr_TabPos$213) + 14|0);
  $259 = HEAP16[$258>>1]|0;
  $260 = $259 << 16 >> 16;
  $261 = (($curExc$015) + ($260<<2)|0);
  $262 = +HEAPF32[$261>>2];
  $263 = (($ptr_TabSign$214) + 28|0);
  $264 = +HEAPF32[$263>>2];
  $265 = $262 * $264;
  $266 = $257 + $265;
  $267 = (($ptr_TabPos$213) + 16|0);
  $268 = HEAP16[$267>>1]|0;
  $269 = $268 << 16 >> 16;
  $270 = (($curExc$015) + ($269<<2)|0);
  $271 = +HEAPF32[$270>>2];
  $272 = (($ptr_TabSign$214) + 32|0);
  $273 = +HEAPF32[$272>>2];
  $274 = $271 * $273;
  $275 = $266 + $274;
  $276 = (($ptr_TabPos$213) + 18|0);
  $277 = HEAP16[$276>>1]|0;
  $278 = $277 << 16 >> 16;
  $279 = (($curExc$015) + ($278<<2)|0);
  $280 = +HEAPF32[$279>>2];
  $281 = (($ptr_TabSign$214) + 36|0);
  $282 = +HEAPF32[$281>>2];
  $283 = $280 * $282;
  $284 = $275 + $283;
  $285 = (($ptr_TabPos$213) + 20|0);
  $286 = HEAP16[$285>>1]|0;
  $287 = $286 << 16 >> 16;
  $288 = (($curExc$015) + ($287<<2)|0);
  $289 = +HEAPF32[$288>>2];
  $290 = (($ptr_TabSign$214) + 40|0);
  $291 = +HEAPF32[$290>>2];
  $292 = $289 * $291;
  $293 = $284 + $292;
  $294 = $194 - $135;
  $295 = $294 * 0.090909093618392944;
  $296 = $293 * 0.090909093618392944;
  $297 = $296 * $296;
  $298 = $297 - $295;
  $299 = !($298 <= 0.0);
  if ($299) {
   $301 = (+Math_sqrt((+$298)));
   $302 = $301 - $296;
   $303 = $296 + $301;
   $fabsf = (+Math_abs((+$303)));
   $fabsf1 = (+Math_abs((+$302)));
   $304 = $fabsf < $fabsf1;
   if ($304) {
    $305 = -$303;
    $x1$0 = $305;
   } else {
    $x1$0 = $302;
   }
  } else {
   $300 = -$296;
   $x1$0 = $300;
  }
  $306 = $x1$0 > 5000.0;
  $x1$1 = $306 ? 5000.0 : $x1$0;
  $307 = $x1$1 < -5000.0;
  $x1$2 = $307 ? -5000.0 : $x1$1;
  $scevgep = (($ptr_TabSign$214) + 44|0);
  $308 = HEAP16[$ptr_TabPos$213>>1]|0;
  $309 = +HEAPF32[$ptr_TabSign$214>>2];
  $310 = $x1$2 * $309;
  $311 = $308 << 16 >> 16;
  $312 = (($curExc$015) + ($311<<2)|0);
  $313 = +HEAPF32[$312>>2];
  $314 = $313 + $310;
  HEAPF32[$312>>2] = $314;
  $315 = $x1$2 * $210;
  $316 = +HEAPF32[$207>>2];
  $317 = $316 + $315;
  HEAPF32[$207>>2] = $317;
  $318 = $x1$2 * $219;
  $319 = +HEAPF32[$216>>2];
  $320 = $319 + $318;
  HEAPF32[$216>>2] = $320;
  $321 = $x1$2 * $228;
  $322 = +HEAPF32[$225>>2];
  $323 = $322 + $321;
  HEAPF32[$225>>2] = $323;
  $324 = $x1$2 * $237;
  $325 = +HEAPF32[$234>>2];
  $326 = $325 + $324;
  HEAPF32[$234>>2] = $326;
  $327 = $x1$2 * $246;
  $328 = +HEAPF32[$243>>2];
  $329 = $328 + $327;
  HEAPF32[$243>>2] = $329;
  $330 = $x1$2 * $255;
  $331 = +HEAPF32[$252>>2];
  $332 = $331 + $330;
  HEAPF32[$252>>2] = $332;
  $333 = $x1$2 * $264;
  $334 = +HEAPF32[$261>>2];
  $335 = $334 + $333;
  HEAPF32[$261>>2] = $335;
  $336 = $x1$2 * $273;
  $337 = +HEAPF32[$270>>2];
  $338 = $337 + $336;
  HEAPF32[$270>>2] = $338;
  $339 = $x1$2 * $282;
  $340 = +HEAPF32[$279>>2];
  $341 = $340 + $339;
  HEAPF32[$279>>2] = $341;
  $342 = $x1$2 * $291;
  $343 = +HEAPF32[$288>>2];
  $344 = $343 + $342;
  HEAPF32[$288>>2] = $344;
  $i$59 = 0;
  while(1) {
   $345 = (($curExc$015) + ($i$59<<2)|0);
   $346 = +HEAPF32[$345>>2];
   $347 = $346 > 32766.5;
   if ($347) {
    HEAPF32[$345>>2] = 32767.0;
   } else {
    $348 = $346 < -32767.5;
    if ($348) {
     HEAPF32[$345>>2] = -32768.0;
    }
   }
   $349 = (($i$59) + 1)|0;
   $exitcond = ($349|0)==(120);
   if ($exitcond) {
    $i$611 = 120;
    break;
   } else {
    $i$59 = $349;
   }
  }
  while(1) {
   $350 = (($PrevExc) + ($i$611<<2)|0);
   $351 = +HEAPF32[$350>>2];
   $352 = (($i$611) + -120)|0;
   $353 = (($PrevExc) + ($352<<2)|0);
   HEAPF32[$353>>2] = $351;
   $354 = (($i$611) + 1)|0;
   $exitcond36 = ($354|0)==(145);
   if ($exitcond36) {
    $i$712 = 0;
    break;
   } else {
    $i$611 = $354;
   }
  }
  while(1) {
   $355 = (($curExc$015) + ($i$712<<2)|0);
   $356 = +HEAPF32[$355>>2];
   $357 = (($i$712) + 25)|0;
   $358 = (($PrevExc) + ($357<<2)|0);
   HEAPF32[$358>>2] = $356;
   $359 = (($i$712) + 1)|0;
   $exitcond38 = ($359|0)==(120);
   if ($exitcond38) {
    break;
   } else {
    $i$712 = $359;
   }
  }
  $scevgep34 = (($ptr_TabPos$213) + 22|0);
  $360 = (($curExc$015) + 480|0);
  $361 = (($i_subfr$217) + 2)|0;
  $362 = (($iblk$116) + 1)|0;
  $exitcond41 = ($362|0)==(2);
  if ($exitcond41) {
   break;
  } else {
   $curExc$015 = $360;$i_subfr$217 = $361;$iblk$116 = $362;$ptr_TabPos$213 = $scevgep34;$ptr_TabSign$214 = $scevgep;
  }
 }
 STACKTOP = sp;return;
}
function _Qua_SidGain($Ener,$nq) {
 $Ener = $Ener|0;
 $nq = $nq|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0.0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $exitcond = 0, $exp$0 = 0, $i$07 = 0, $i$14 = 0, $iseg$0 = 0;
 var $j$03 = 0, $j$1 = 0, $j$1$p = 0, $k$05 = 0, $k$05$in = 0, $not$ = 0, $temp16$0 = 0, $temp16$0$in = 0, $x$0$lcssa = 0.0, $x$06 = 0.0, $x$1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $nq << 16 >> 16;
 $1 = ($nq<<16>>16)==(0);
 if ($1) {
  $3 = +HEAPF32[$Ener>>2];
  $4 = $3 * 0.0083330003544688225;
  $x$1 = $4;
 } else {
  $2 = ($nq<<16>>16)>(0);
  if ($2) {
   $i$07 = 0;$x$06 = 0.0;
   while(1) {
    $5 = (($Ener) + ($i$07<<2)|0);
    $6 = +HEAPF32[$5>>2];
    $7 = $x$06 + $6;
    $8 = (($i$07) + 1)|0;
    $exitcond = ($8|0)==($0|0);
    if ($exitcond) {
     $x$0$lcssa = $7;
     break;
    } else {
     $i$07 = $8;$x$06 = $7;
    }
   }
  } else {
   $x$0$lcssa = 0.0;
  }
  $9 = (36912 + ($0<<2)|0);
  $10 = +HEAPF32[$9>>2];
  $11 = $x$0$lcssa * $10;
  $x$1 = $11;
 }
 $12 = !($x$1 >= 115617.0);
 if (!($12)) {
  $$0 = 63;
  STACKTOP = sp;return ($$0|0);
 }
 $13 = !($x$1 >= 9216.0);
 if ($13) {
  $not$ = $x$1 >= 1024.0;
  $$ = $not$&1;
  $exp$0 = 3;$iseg$0 = $$;
 } else {
  $exp$0 = 4;$iseg$0 = 2;
 }
 $14 = (($iseg$0) + 1)|0;
 $15 = 1 << $exp$0;
 $16 = (36928 + ($iseg$0<<2)|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $15 << $14;
 $19 = (+($18|0));
 $20 = $19 + $17;
 $21 = $20 * $20;
 $23 = $21;$i$14 = 0;$j$03 = $15;$k$05$in = $15;
 while(1) {
  $k$05 = $k$05$in >> 1;
  $22 = !($x$1 >= $23);
  $24 = (0 - ($k$05))|0;
  $j$1$p = $22 ? $24 : $k$05;
  $j$1 = (($j$1$p) + ($j$03))|0;
  $25 = (($i$14) + 1)|0;
  $26 = ($25|0)<($exp$0|0);
  $27 = $j$1 << $14;
  $28 = (+($27|0));
  $29 = $28 + $17;
  $30 = $29 * $29;
  if ($26) {
   $23 = $30;$i$14 = $25;$j$03 = $j$1;$k$05$in = $k$05;
  } else {
   break;
  }
 }
 $31 = $30 - $x$1;
 $32 = !($31 <= 0.0);
 do {
  if ($32) {
   $43 = (($j$1) + -1)|0;
   $44 = $43 << $14;
   $45 = (+($44|0));
   $46 = $17 + $45;
   $47 = $46 * $46;
   $48 = $x$1 - $47;
   $49 = $31 < $48;
   $50 = $iseg$0 << 4;
   if ($49) {
    $51 = (($j$1) + ($50))|0;
    $temp16$0$in = $51;
    break;
   } else {
    $52 = (($43) + ($50))|0;
    $temp16$0$in = $52;
    break;
   }
  } else {
   $33 = (($j$1) + 1)|0;
   $34 = $33 << $14;
   $35 = (+($34|0));
   $36 = $17 + $35;
   $37 = $36 * $36;
   $38 = $x$1 - $37;
   $39 = $31 > $38;
   $40 = $iseg$0 << 4;
   if ($39) {
    $41 = (($j$1) + ($40))|0;
    $temp16$0$in = $41;
    break;
   } else {
    $42 = (($33) + ($40))|0;
    $temp16$0$in = $42;
    break;
   }
  }
 } while(0);
 $temp16$0 = $temp16$0$in&65535;
 $$0 = $temp16$0;
 STACKTOP = sp;return ($$0|0);
}
function _g723_Encode_Init() {
 var dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 HEAP32[36992>>2] = 0;
 HEAP32[((36992 + 4|0))>>2] = 1;
 HEAP32[((36992 + 8|0))>>2] = 1;
 HEAP32[((36992 + 12|0))>>2] = 1;
 _memset((37008|0),0,2448)|0;
 HEAPF32[((37008 + 8|0))>>2] = 24.460899353027344;
 HEAPF32[((37008 + 12|0))>>2] = 36.882801055908203;
 HEAPF32[((37008 + 16|0))>>2] = 60.078098297119141;
 HEAPF32[((37008 + 20|0))>>2] = 84.421897888183594;
 HEAPF32[((37008 + 24|0))>>2] = 108.375;
 HEAPF32[((37008 + 28|0))>>2] = 128.86700439453125;
 HEAPF32[((37008 + 32|0))>>2] = 154.31199645996094;
 HEAPF32[((37008 + 36|0))>>2] = 173.906005859375;
 HEAPF32[((37008 + 40|0))>>2] = 199.093994140625;
 HEAPF32[((37008 + 44|0))>>2] = 216.5469970703125;
 HEAPF32[((37008 + 2432|0))>>2] = 3.8146399674587883E-6;
 HEAPF32[((37008 + 2436|0))>>2] = 3.8146399674587883E-6;
 HEAPF32[((37008 + 2440|0))>>2] = 3.8146399674587883E-6;
 HEAPF32[((37008 + 2444|0))>>2] = 3.8146399674587883E-6;
 HEAPF32[((37008 + 2448|0))>>2] = 3.8146399674587883E-6;
 HEAP16[39464>>1] = 3;
 HEAP16[((39464 + 2|0))>>1] = 0;
 HEAPF32[((39464 + 4|0))>>2] = 1024.0;
 HEAPF32[((39464 + 8|0))>>2] = 1024.0;
 HEAP16[((39464 + 12|0))>>1] = 0;
 HEAP16[((39464 + 14|0))>>1] = 1;
 HEAP16[((39464 + 16|0))>>1] = 1;
 HEAP16[((39464 + 18|0))>>1] = 60;
 HEAP16[((39464 + 20|0))>>1] = 60;
 dest=((39464 + 24|0))+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 HEAPF32[39528>>2] = 0.0;
 _memset((((39528 + 8|0))|0),0,176)|0;
 dest=((39528 + 224|0))+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 HEAP16[((39528 + 4|0))>>1] = 1;
 HEAP16[((39528 + 328|0))>>1] = 12345;
 STACKTOP = sp;return 1;
}
function _g723_Encode($pInput,$nInput,$pOutput) {
 $pInput = $pInput|0;
 $nInput = $nInput|0;
 $pOutput = $pOutput|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $nLen$04 = 0, $nOut$0$lcssa = 0, $nOut$01 = 0, $pIn$02 = 0, $pOut$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($nInput|0)==(0);
 if ($0) {
  $nOut$0$lcssa = 0;
  STACKTOP = sp;return ($nOut$0$lcssa|0);
 } else {
  $nLen$04 = 0;$nOut$01 = 0;$pIn$02 = $pInput;$pOut$03 = $pOutput;
 }
 while(1) {
  $1 = (_Acodec_Encode($pOut$03,$pIn$02)|0);
  $2 = (($pOut$03) + ($1)|0);
  $3 = (($1) + ($nOut$01))|0;
  $4 = (($pIn$02) + 480|0);
  $5 = (($nLen$04) + 480)|0;
  $6 = ($5>>>0)<($nInput>>>0);
  if ($6) {
   $nLen$04 = $5;$nOut$01 = $3;$pIn$02 = $4;$pOut$03 = $2;
  } else {
   $nOut$0$lcssa = $3;
   break;
  }
 }
 STACKTOP = sp;return ($nOut$0$lcssa|0);
}
function _g723_Decode_Init() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAP32[39864>>2] = 0;
 HEAP32[((39864 + 4|0))>>2] = 1;
 HEAP32[((39864 + 8|0))>>2] = 1;
 HEAP32[((39864 + 12|0))>>2] = 1;
 _memset((39880|0),0,760)|0;
 HEAPF32[((39880 + 20|0))>>2] = 24.460899353027344;
 HEAPF32[((39880 + 24|0))>>2] = 36.882801055908203;
 HEAPF32[((39880 + 28|0))>>2] = 60.078098297119141;
 HEAPF32[((39880 + 32|0))>>2] = 84.421897888183594;
 HEAPF32[((39880 + 36|0))>>2] = 108.375;
 HEAPF32[((39880 + 40|0))>>2] = 128.86700439453125;
 HEAPF32[((39880 + 44|0))>>2] = 154.31199645996094;
 HEAPF32[((39880 + 48|0))>>2] = 173.906005859375;
 HEAPF32[((39880 + 52|0))>>2] = 199.093994140625;
 HEAPF32[((39880 + 56|0))>>2] = 216.5469970703125;
 HEAPF32[((39880 + 16|0))>>2] = 1.0;
 HEAP16[((40640 + 4|0))>>1] = 1;
 HEAPF32[((40640 + 48|0))>>2] = 0.0;
 HEAPF32[((40640 + 8|0))>>2] = 24.460899353027344;
 HEAPF32[((40640 + 12|0))>>2] = 36.882801055908203;
 HEAPF32[((40640 + 16|0))>>2] = 60.078098297119141;
 HEAPF32[((40640 + 20|0))>>2] = 84.421897888183594;
 HEAPF32[((40640 + 24|0))>>2] = 108.375;
 HEAPF32[((40640 + 28|0))>>2] = 128.86700439453125;
 HEAPF32[((40640 + 32|0))>>2] = 154.31199645996094;
 HEAPF32[((40640 + 36|0))>>2] = 173.906005859375;
 HEAPF32[((40640 + 40|0))>>2] = 199.093994140625;
 HEAPF32[((40640 + 44|0))>>2] = 216.5469970703125;
 HEAP16[((40640 + 52|0))>>1] = 12345;
 STACKTOP = sp;return 1;
}
function _g723_Decode($pInput,$nInput,$pOutput) {
 $pInput = $pInput|0;
 $nInput = $nInput|0;
 $pOutput = $pOutput|0;
 var $$$i$i = 0.0, $$0$i$i$i = 0, $$Olp$i$i$i = 0, $$byval_copy3 = 0, $$pr$pre = 0, $$pre = 0, $$promoted53 = 0.0, $$promoted54 = 0.0, $$promoted55 = 0.0, $$promoted56 = 0.0, $$promoted57 = 0.0, $$promoted58 = 0.0, $$promoted59 = 0.0, $$promoted60 = 0.0, $$promoted61 = 0.0, $$promoted62 = 0.0, $$promoted63 = 0.0, $$promoted64 = 0.0, $$promoted64$pre = 0.0, $$promoted65 = 0.0;
 var $$promoted65$pre = 0.0, $$promoted66 = 0.0, $$promoted66$pre = 0.0, $$promoted67 = 0.0, $$promoted67$pre = 0.0, $$promoted68 = 0.0, $$promoted68$pre = 0.0, $$promoted69 = 0.0, $$promoted69$pre = 0.0, $$promoted70 = 0.0, $$promoted70$pre = 0.0, $$promoted71 = 0.0, $$promoted71$pre = 0.0, $$promoted72 = 0.0, $$promoted72$pre = 0.0, $$promoted73 = 0.0, $$promoted73$pre = 0.0, $$promoted74 = 0.0, $$promoted75 = 0.0, $$promoted75$pre = 0.0;
 var $$promoted76 = 0.0, $$promoted76$pre = 0.0, $$promoted77 = 0.0, $$promoted77$pre = 0.0, $$promoted78 = 0.0, $$promoted78$pre = 0.0, $$promoted79 = 0.0, $$promoted79$pre = 0.0, $$promoted80 = 0.0, $$promoted80$pre = 0.0, $$promoted81 = 0.0, $$promoted81$pre = 0.0, $$promoted82 = 0.0, $$promoted82$pre = 0.0, $$promoted83 = 0.0, $$promoted83$pre = 0.0, $$promoted84 = 0.0, $$promoted84$pre = 0.0, $$promoted85 = 0.0, $$promoted86 = 0.0;
 var $$promoted86$pre = 0.0, $$promoted87 = 0.0, $$promoted87$pre = 0.0, $$promoted88 = 0.0, $$promoted88$pre = 0.0, $$promoted89 = 0.0, $$promoted89$pre = 0.0, $$promoted90 = 0.0, $$promoted90$pre = 0.0, $$promoted91 = 0.0, $$promoted91$pre = 0.0, $$promoted92 = 0.0, $$promoted92$pre = 0.0, $$promoted93 = 0.0, $$promoted93$pre = 0.0, $$promoted94 = 0.0, $$promoted94$pre = 0.0, $$promoted95 = 0.0, $$promoted95$pre = 0.0, $$promoted96 = 0.0;
 var $$storemerge$i$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum1 = 0, $$sum11 = 0, $$sum13 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum19 = 0, $$sum21 = 0, $$sum23 = 0, $$sum24 = 0, $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum32 = 0, $$sum34 = 0, $$sum36 = 0, $$sum38 = 0, $$sum40 = 0, $$sum5 = 0, $$sum57$i$i = 0, $$sum58$i$i = 0, $$sum59$i$i = 0, $$sum7 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0.0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0.0, $362 = 0.0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0.0, $373 = 0, $374 = 0, $375 = 0;
 var $376 = 0.0, $377 = 0.0, $378 = 0, $379 = 0.0, $38 = 0, $380 = 0.0, $381 = 0.0, $382 = 0.0, $383 = 0.0, $384 = 0.0, $385 = 0.0, $386 = 0.0, $387 = 0.0, $388 = 0.0, $389 = 0.0, $39 = 0, $390 = 0.0, $391 = 0.0, $392 = 0.0, $393 = 0.0;
 var $394 = 0.0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0.0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0;
 var $411 = 0.0, $412 = 0, $413 = 0.0, $414 = 0.0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0.0, $425 = 0, $426 = 0.0, $427 = 0.0, $428 = 0, $429 = 0;
 var $43 = 0, $430 = 0.0, $431 = 0, $432 = 0.0, $433 = 0.0, $434 = 0.0, $435 = 0, $436 = 0, $437 = 0.0, $438 = 0, $439 = 0.0, $44 = 0, $440 = 0.0, $441 = 0.0, $442 = 0.0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0;
 var $448 = 0, $449 = 0.0, $45 = 0, $450 = 0.0, $451 = 0, $452 = 0.0, $453 = 0.0, $454 = 0.0, $455 = 0, $456 = 0.0, $457 = 0.0, $458 = 0.0, $459 = 0.0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0.0;
 var $466 = 0.0, $467 = 0, $468 = 0, $469 = 0.0, $47 = 0, $470 = 0.0, $471 = 0.0, $472 = 0, $473 = 0, $474 = 0.0, $475 = 0.0, $476 = 0.0, $477 = 0.0, $478 = 0, $479 = 0, $48 = 0, $480 = 0.0, $481 = 0.0, $482 = 0.0, $483 = 0.0;
 var $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0.0, $49 = 0, $490 = 0.0, $491 = 0, $492 = 0.0, $493 = 0.0, $494 = 0, $495 = 0.0, $496 = 0.0, $497 = 0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0, $500 = 0;
 var $501 = 0, $502 = 0.0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0.0, $511 = 0.0, $512 = 0, $513 = 0, $514 = 0.0, $515 = 0.0, $516 = 0.0, $517 = 0, $518 = 0, $519 = 0;
 var $52 = 0, $520 = 0, $521 = 0.0, $522 = 0.0, $523 = 0, $524 = 0, $525 = 0.0, $526 = 0.0, $527 = 0.0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0.0, $534 = 0.0, $535 = 0, $536 = 0, $537 = 0.0;
 var $538 = 0.0, $539 = 0.0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0.0, $546 = 0.0, $547 = 0, $548 = 0, $549 = 0.0, $55 = 0, $550 = 0.0, $551 = 0.0, $552 = 0, $553 = 0, $554 = 0, $555 = 0.0;
 var $556 = 0.0, $557 = 0.0, $558 = 0.0, $559 = 0.0, $56 = 0, $560 = 0.0, $561 = 0.0, $562 = 0.0, $563 = 0.0, $564 = 0.0, $565 = 0.0, $566 = 0.0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0;
 var $574 = 0, $575 = 0, $576 = 0.0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0.0, $583 = 0.0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0.0;
 var $592 = 0.0, $593 = 0.0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0.0, $599 = 0.0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0.0, $605 = 0.0, $606 = 0.0, $607 = 0.0, $608 = 0.0, $609 = 0.0;
 var $61 = 0, $610 = 0.0, $611 = 0.0, $612 = 0.0, $613 = 0.0, $614 = 0, $615 = 0.0, $616 = 0.0, $617 = 0.0, $618 = 0.0, $619 = 0.0, $619$phi = 0.0, $62 = 0, $620 = 0.0, $621 = 0.0, $622 = 0.0, $622$phi = 0.0, $623 = 0.0, $624 = 0.0, $625 = 0.0;
 var $625$phi = 0.0, $626 = 0.0, $627 = 0.0, $628 = 0.0, $628$phi = 0.0, $629 = 0.0, $63 = 0, $630 = 0.0, $631 = 0.0, $631$phi = 0.0, $632 = 0.0, $633 = 0.0, $634 = 0.0, $634$phi = 0.0, $635 = 0.0, $636 = 0.0, $637 = 0.0, $637$phi = 0.0, $638 = 0.0, $639 = 0.0;
 var $64 = 0, $640 = 0.0, $640$phi = 0.0, $641 = 0.0, $642 = 0.0, $643 = 0.0, $643$phi = 0.0, $644 = 0.0, $645 = 0.0, $646 = 0, $647 = 0, $648 = 0, $649 = 0.0, $65 = 0, $650 = 0, $651 = 0.0, $652 = 0.0, $653 = 0, $654 = 0, $655 = 0.0;
 var $656 = 0.0, $657 = 0.0, $658 = 0, $659 = 0, $66 = 0, $660 = 0.0, $661 = 0.0, $662 = 0.0, $663 = 0.0, $664 = 0, $665 = 0, $666 = 0, $667 = 0.0, $668 = 0.0, $669 = 0.0, $67 = 0, $670 = 0.0, $671 = 0.0, $672 = 0.0, $673 = 0;
 var $674 = 0.0, $675 = 0.0, $676 = 0.0, $677 = 0, $678 = 0.0, $679 = 0.0, $68 = 0, $680 = 0.0, $681 = 0.0, $682 = 0.0, $683 = 0.0, $684 = 0.0, $685 = 0.0, $686 = 0.0, $687 = 0.0, $688 = 0, $689 = 0.0, $69 = 0, $690 = 0.0, $691 = 0.0;
 var $692 = 0.0, $693 = 0.0, $693$phi = 0.0, $694 = 0.0, $695 = 0.0, $696 = 0.0, $696$phi = 0.0, $697 = 0.0, $698 = 0.0, $699 = 0.0, $699$phi = 0.0, $7 = 0, $70 = 0, $700 = 0.0, $701 = 0.0, $702 = 0.0, $702$phi = 0.0, $703 = 0.0, $704 = 0.0, $705 = 0.0;
 var $705$phi = 0.0, $706 = 0.0, $707 = 0.0, $708 = 0.0, $708$phi = 0.0, $709 = 0.0, $71 = 0, $710 = 0.0, $711 = 0.0, $711$phi = 0.0, $712 = 0.0, $713 = 0.0, $714 = 0.0, $714$phi = 0.0, $715 = 0.0, $716 = 0.0, $717 = 0.0, $717$phi = 0.0, $718 = 0.0, $719 = 0.0;
 var $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0.0, $724 = 0, $725 = 0.0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0.0, $732 = 0, $733 = 0, $734 = 0.0, $735 = 0, $736 = 0, $737 = 0;
 var $738 = 0.0, $739 = 0, $74 = 0, $740 = 0.0, $741 = 0.0, $742 = 0, $743 = 0.0, $744 = 0.0, $745 = 0.0, $746 = 0, $747 = 0.0, $748 = 0.0, $749 = 0.0, $75 = 0, $750 = 0.0, $751 = 0, $752 = 0, $753 = 0, $754 = 0.0, $755 = 0.0;
 var $756 = 0.0, $757 = 0.0, $758 = 0.0, $759 = 0.0, $76 = 0, $760 = 0, $761 = 0.0, $762 = 0.0, $763 = 0.0, $764 = 0, $765 = 0.0, $766 = 0.0, $767 = 0.0, $768 = 0.0, $769 = 0.0, $77 = 0, $770 = 0.0, $771 = 0.0, $772 = 0.0, $773 = 0.0;
 var $774 = 0.0, $775 = 0, $776 = 0.0, $777 = 0.0, $778 = 0.0, $779 = 0.0, $78 = 0, $780 = 0.0, $780$phi = 0.0, $781 = 0.0, $782 = 0.0, $783 = 0.0, $783$phi = 0.0, $784 = 0.0, $785 = 0.0, $786 = 0.0, $786$phi = 0.0, $787 = 0.0, $788 = 0.0, $789 = 0.0;
 var $789$phi = 0.0, $79 = 0, $790 = 0.0, $791 = 0.0, $792 = 0.0, $792$phi = 0.0, $793 = 0.0, $794 = 0.0, $795 = 0.0, $795$phi = 0.0, $796 = 0.0, $797 = 0.0, $798 = 0.0, $798$phi = 0.0, $799 = 0.0, $8 = 0, $80 = 0, $800 = 0.0, $801 = 0.0, $801$phi = 0.0;
 var $802 = 0.0, $803 = 0.0, $804 = 0.0, $804$phi = 0.0, $805 = 0.0, $806 = 0.0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0.0, $811 = 0, $812 = 0.0, $813 = 0.0, $814 = 0, $815 = 0.0, $816 = 0.0, $817 = 0.0, $818 = 0, $819 = 0.0;
 var $82 = 0, $820 = 0.0, $821 = 0.0, $822 = 0.0, $823 = 0, $824 = 0, $825 = 0, $826 = 0.0, $827 = 0.0, $828 = 0.0, $829 = 0.0, $83 = 0, $830 = 0.0, $831 = 0.0, $832 = 0, $833 = 0.0, $834 = 0.0, $835 = 0.0, $836 = 0, $837 = 0.0;
 var $838 = 0.0, $839 = 0.0, $84 = 0, $840 = 0.0, $841 = 0.0, $842 = 0.0, $843 = 0.0, $844 = 0.0, $845 = 0.0, $846 = 0.0, $847 = 0, $848 = 0.0, $849 = 0.0, $85 = 0, $850 = 0.0, $851 = 0.0, $852 = 0.0, $852$phi = 0.0, $853 = 0.0, $854 = 0.0;
 var $855 = 0.0, $855$phi = 0.0, $856 = 0.0, $857 = 0.0, $858 = 0.0, $858$phi = 0.0, $859 = 0.0, $86 = 0, $860 = 0.0, $861 = 0.0, $861$phi = 0.0, $862 = 0.0, $863 = 0.0, $864 = 0.0, $864$phi = 0.0, $865 = 0.0, $866 = 0.0, $867 = 0.0, $867$phi = 0.0, $868 = 0.0;
 var $869 = 0.0, $87 = 0, $870 = 0.0, $870$phi = 0.0, $871 = 0.0, $872 = 0.0, $873 = 0.0, $873$phi = 0.0, $874 = 0.0, $875 = 0.0, $876 = 0.0, $876$phi = 0.0, $877 = 0.0, $878 = 0.0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0.0, $883 = 0;
 var $884 = 0.0, $885 = 0.0, $886 = 0, $887 = 0.0, $888 = 0.0, $889 = 0.0, $89 = 0, $890 = 0, $891 = 0.0, $892 = 0.0, $893 = 0.0, $894 = 0.0, $895 = 0, $896 = 0, $897 = 0, $898 = 0.0, $899 = 0.0, $9 = 0, $90 = 0, $900 = 0.0;
 var $901 = 0.0, $902 = 0.0, $903 = 0, $904 = 0.0, $905 = 0.0, $906 = 0.0, $907 = 0, $908 = 0, $909 = 0.0, $91 = 0, $910 = 0, $911 = 0.0, $912 = 0.0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0.0, $918 = 0, $919 = 0.0;
 var $92 = 0, $920 = 0.0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0.0, $926 = 0, $927 = 0.0, $928 = 0.0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $AcbkCont$i$i = 0, $Bound_AcGn$0$i$i$i = 0, $Bsp$i$i$i$0 = 0, $Ccr$03$i$i$i = 0.0, $Ccr$1$i$i$i = 0.0, $DataBuff$i$i = 0, $Ftyp$i$i$0 = 0, $Ftyp$i$i$2132 = 0, $Ftyp$i$i$3 = 0, $Ftyp$i$i$4 = 0, $Ftyp$i$i$6 = 0, $Indx$04$i$i$i = 0, $Indx$1$i$i$i = 0, $Line$i$i = 0, $Line$i$i$i = 0, $LspVect$i$i = 0, $Pf$i$i$sroa$0$0 = 0;
 var $Pf$i$i$sroa$0$1 = 0, $Pf$i$i$sroa$0$2$ph = 0, $Pf$i$i$sroa$0$3 = 0, $Pf$i$i$sroa$10$sroa$0$0 = 0, $Pf$i$i$sroa$10$sroa$0$1 = 0, $Pf$i$i$sroa$10$sroa$0$2$ph = 0, $Pf$i$i$sroa$10$sroa$0$3 = 0, $Pf$i$i$sroa$10$sroa$4$0 = 0.0, $Pf$i$i$sroa$10$sroa$4$1 = 0.0, $Pf$i$i$sroa$10$sroa$4$2$ph = 0.0, $Pf$i$i$sroa$10$sroa$4$3 = 0.0, $Pf$i$i$sroa$10$sroa$5$0 = 0.0, $Pf$i$i$sroa$10$sroa$5$1 = 0.0, $Pf$i$i$sroa$10$sroa$5$2$ph = 0.0, $Pf$i$i$sroa$10$sroa$5$3 = 0.0, $Pf$i$i$sroa$4$0 = 0.0, $Pf$i$i$sroa$4$1 = 0.0, $Pf$i$i$sroa$4$2$ph = 0.0, $Pf$i$i$sroa$4$3 = 0.0, $Pf$i$i$sroa$5$0 = 0.0;
 var $Pf$i$i$sroa$5$1 = 0.0, $Pf$i$i$sroa$5$2$ph = 0.0, $Pf$i$i$sroa$5$3 = 0.0, $Pf$i$i$sroa$6$sroa$0$0 = 0, $Pf$i$i$sroa$6$sroa$0$1 = 0, $Pf$i$i$sroa$6$sroa$0$2$ph = 0, $Pf$i$i$sroa$6$sroa$0$3 = 0, $Pf$i$i$sroa$6$sroa$4$0 = 0.0, $Pf$i$i$sroa$6$sroa$4$1 = 0.0, $Pf$i$i$sroa$6$sroa$4$2$ph = 0.0, $Pf$i$i$sroa$6$sroa$4$3 = 0.0, $Pf$i$i$sroa$6$sroa$5$0 = 0.0, $Pf$i$i$sroa$6$sroa$5$1 = 0.0, $Pf$i$i$sroa$6$sroa$5$2$ph = 0.0, $Pf$i$i$sroa$6$sroa$5$3 = 0.0, $Pf$i$i$sroa$8$sroa$0$0 = 0, $Pf$i$i$sroa$8$sroa$0$1 = 0, $Pf$i$i$sroa$8$sroa$0$2$ph = 0, $Pf$i$i$sroa$8$sroa$0$3 = 0, $Pf$i$i$sroa$8$sroa$4$0 = 0.0;
 var $Pf$i$i$sroa$8$sroa$4$1 = 0.0, $Pf$i$i$sroa$8$sroa$4$2$ph = 0.0, $Pf$i$i$sroa$8$sroa$4$3 = 0.0, $Pf$i$i$sroa$8$sroa$5$0 = 0.0, $Pf$i$i$sroa$8$sroa$5$1 = 0.0, $Pf$i$i$sroa$8$sroa$5$2$ph = 0.0, $Pf$i$i$sroa$8$sroa$5$3 = 0.0, $QntLpc$i$i = 0, $Rez$02$i$i$i$i = 0, $Rez$02$i104$i$i$i = 0, $Rez$02$i110$i$i$i = 0, $Rez$02$i116$i$i$i = 0, $Rez$02$i122$i$i$i = 0, $Rez$02$i128$i$i$i = 0, $Rez$02$i134$i$i$i = 0, $Rez$02$i14$i$i$i = 0, $Rez$02$i140$i$i$i = 0, $Rez$02$i2$i$i$i = 0, $Rez$02$i20$i$i$i = 0, $Rez$02$i26$i$i$i = 0;
 var $Rez$02$i32$i$i$i = 0, $Rez$02$i38$i$i$i = 0, $Rez$02$i44$i$i$i = 0, $Rez$02$i50$i$i$i = 0, $Rez$02$i56$i$i$i = 0, $Rez$02$i62$i$i$i = 0, $Rez$02$i68$i$i$i = 0, $Rez$02$i74$i$i$i = 0, $Rez$02$i8$i$i$i = 0, $Rez$02$i80$i$i$i = 0, $Rez$02$i86$i$i$i = 0, $Rez$02$i92$i$i$i = 0, $Rez$02$i98$i$i$i = 0, $SfGain$0$i$i$i = 0.0, $SfGain$0$i33$i$i = 0.0, $SfGain$0$i44$i$i = 0.0, $SfGain$0$i58$i$i = 0.0, $Temp$0$i$i$i = 0, $Temp$i$i = 0, $exitcond$i$i = 0;
 var $exitcond$i$i$i = 0, $exitcond$i$i$i$i = 0, $exitcond$i10$i$i$i = 0, $exitcond$i100$i$i$i = 0, $exitcond$i106$i$i$i = 0, $exitcond$i112$i$i$i = 0, $exitcond$i118$i$i$i = 0, $exitcond$i124$i$i$i = 0, $exitcond$i13$i$i = 0, $exitcond$i130$i$i$i = 0, $exitcond$i136$i$i$i = 0, $exitcond$i142$i$i$i = 0, $exitcond$i16$i$i$i = 0, $exitcond$i18$i$i = 0, $exitcond$i20$i$i = 0, $exitcond$i22$i$i = 0, $exitcond$i22$i$i$i = 0, $exitcond$i28$i$i = 0, $exitcond$i28$i$i$i = 0, $exitcond$i34$i$i$i = 0;
 var $exitcond$i35$i$i = 0, $exitcond$i38$i$i = 0, $exitcond$i4$i$i = 0, $exitcond$i4$i$i$i = 0, $exitcond$i40$i$i$i = 0, $exitcond$i46$i$i = 0, $exitcond$i46$i$i$i = 0, $exitcond$i49$i$i = 0, $exitcond$i52$i$i = 0, $exitcond$i52$i$i$i = 0, $exitcond$i58$i$i$i = 0, $exitcond$i60$i$i = 0, $exitcond$i64$i$i$i = 0, $exitcond$i70$i$i$i = 0, $exitcond$i76$i$i$i = 0, $exitcond$i8$i$i = 0, $exitcond$i82$i$i$i = 0, $exitcond$i88$i$i$i = 0, $exitcond$i94$i$i$i = 0, $exitcond16$i$i$i = 0;
 var $exitcond17$i$i$i = 0, $exitcond31$i$i = 0, $exitcond37$i$i = 0, $exitcond48$1$i$i = 0, $exitcond48$2$i$i = 0, $exitcond48$3$i$i = 0, $exitcond48$i$i = 0, $i$01$i$i$i = 0, $i$01$i$i$i$i = 0, $i$01$i$i2$i$i = 0, $i$01$i$i24$i$i = 0, $i$01$i$i30$i$i = 0, $i$01$i$i41$i$i = 0, $i$01$i$i55$i$i = 0, $i$01$i105$i$i$i = 0, $i$01$i111$i$i$i = 0, $i$01$i117$i$i$i = 0, $i$01$i12$i$i = 0, $i$01$i123$i$i$i = 0, $i$01$i129$i$i$i = 0;
 var $i$01$i135$i$i$i = 0, $i$01$i141$i$i$i = 0, $i$01$i15$i$i$i = 0, $i$01$i17$i$i = 0, $i$01$i2$i$i$i = 0, $i$01$i21$i$i$i = 0, $i$01$i27$i$i = 0, $i$01$i27$i$i$i = 0, $i$01$i3$i$i$i = 0, $i$01$i33$i$i$i = 0, $i$01$i34$i$i = 0, $i$01$i39$i$i$i = 0, $i$01$i45$i$i = 0, $i$01$i45$i$i$i = 0, $i$01$i51$i$i$i = 0, $i$01$i57$i$i$i = 0, $i$01$i59$i$i = 0, $i$01$i6$i$i$i = 0, $i$01$i63$i$i$i = 0, $i$01$i69$i$i$i = 0;
 var $i$01$i7$i$i = 0, $i$01$i75$i$i$i = 0, $i$01$i81$i$i$i = 0, $i$01$i87$i$i$i = 0, $i$01$i9$i$i$i = 0, $i$01$i93$i$i$i = 0, $i$01$i99$i$i$i = 0, $i$02$i$i$i = 0, $i$02$i21$i$i = 0, $i$02$i37$i$i = 0, $i$02$i48$i$i = 0, $i$02$i51$i$i = 0, $i$021$i$i$i = 0, $i$119$i$i$i = 0, $i$213$i$i$i = 0, $i$311$i$i$i = 0, $i$48$i$i$i = 0, $i$74$i$i = 0, $j$023$1$i$i = 0, $j$023$2$i$i = 0;
 var $j$023$3$i$i = 0, $j$023$i$i = 0, $j$414$i$i = 0, $j$58$i$i = 0, $nLen$04 = 0, $nOut$0$lcssa = 0, $nOut$01 = 0, $or$cond$i$i = 0, $pIn$02 = 0, $pOut$03 = 0, $phitmp = 0, $scevgep$i$i$i = 0, $scevgep$i$i$i$i = 0, $scevgep$i101$i$i$i = 0, $scevgep$i107$i$i$i = 0, $scevgep$i11$i$i$i = 0, $scevgep$i113$i$i$i = 0, $scevgep$i119$i$i$i = 0, $scevgep$i125$i$i$i = 0, $scevgep$i131$i$i$i = 0;
 var $scevgep$i143$i$i$i = 0, $scevgep$i17$i$i$i = 0, $scevgep$i23$i$i$i = 0, $scevgep$i29$i$i$i = 0, $scevgep$i35$i$i$i = 0, $scevgep$i41$i$i$i = 0, $scevgep$i47$i$i$i = 0, $scevgep$i59$i$i$i = 0, $scevgep$i65$i$i$i = 0, $scevgep$i71$i$i$i = 0, $scevgep$i77$i$i$i = 0, $scevgep$i83$i$i$i = 0, $scevgep$i89$i$i$i = 0, $scevgep$i95$i$i$i = 0, $sext = 0, $sext$i$i$i = 0, $sext$i$i$i$i = 0, $sext$i2$i$i$i = 0, $sext$mask$i$i$i$i = 0, $sext$mask$i1$i$i$i = 0;
 var $sext1$i$i$i = 0, $sext1$i$i$i$i = 0, $sext1$i3$i$i$i = 0, $sext10$i$i$i = 0, $sext11$i$i$i = 0, $sext129 = 0, $sext13$i$i$i = 0, $sext130 = 0, $sext2$i$i$i = 0, $sext3$i$i$i = 0, $sext4$i$i$i = 0, $sext5$1$i$i$i = 0, $sext5$2$i$i$i = 0, $sext5$i$i$i = 0, $sext6$i$i$i = 0, $sext7$i$i$i = 0, $sext8$i$i$i = 0, $storemerge = 0, $storemerge$i$i = 0, $storemerge$i$i$i = 0.0;
 var $storemerge$in = 0, $storemerge$in$in = 0, $sum$02$i$i$i$i = 0.0, $sum$02$i$i23$i$i = 0.0, $sum$02$i$i29$i$i = 0.0, $sum$02$i$i40$i$i = 0.0, $sum$02$i$i54$i$i = 0.0, $sum$02$i1$i$i$i = 0.0, $sum$02$i5$i$i$i = 0.0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 3728|0;
 $$byval_copy3 = sp + 3344|0;
 $Line$i$i$i = sp + 3216|0;
 $QntLpc$i$i = sp + 3056|0;
 $AcbkCont$i$i = sp + 2816|0;
 $LspVect$i$i = sp + 2776|0;
 $Temp$i$i = sp + 1232|0;
 $DataBuff$i$i = sp + 272|0;
 $Line$i$i = sp + 144|0;
 $0 = sp + 16|0;
 $1 = sp;
 $2 = ($nInput|0)==(0);
 if ($2) {
  $nOut$0$lcssa = 0;
  STACKTOP = sp;return ($nOut$0$lcssa|0);
 }
 $scevgep$i$i$i$i = (($$byval_copy3) + 4|0);
 $3 = (($Line$i$i$i) + 4|0);
 $4 = (($Line$i$i) + 24|0);
 $5 = (($Line$i$i) + 4|0);
 $6 = (($Line$i$i) + 80|0);
 $7 = (($Line$i$i) + 108|0);
 $8 = (($Temp$i$i) + 580|0);
 $9 = (($Line$i$i) + 16|0);
 $10 = (($Line$i$i) + 8|0);
 $11 = (($Line$i$i) + 20|0);
 $12 = (($Temp$i$i) + 820|0);
 $13 = (($Line$i$i) + 44|0);
 $14 = (($Temp$i$i) + 240|0);
 $15 = (($Line$i$i) + 48|0);
 $16 = (($Temp$i$i) + 1060|0);
 $17 = (($Line$i$i) + 72|0);
 $18 = (($Line$i$i) + 12|0);
 $19 = (($Temp$i$i) + 480|0);
 $20 = (($Line$i$i) + 76|0);
 $21 = (($Temp$i$i) + 1300|0);
 $22 = (($Line$i$i) + 100|0);
 $23 = (($Temp$i$i) + 720|0);
 $24 = (($Line$i$i) + 104|0);
 $25 = (($1) + 4|0);
 $26 = (($1) + 8|0);
 $27 = (($QntLpc$i$i) + 4|0);
 $28 = (($QntLpc$i$i) + 8|0);
 $29 = (($QntLpc$i$i) + 12|0);
 $30 = (($QntLpc$i$i) + 16|0);
 $31 = (($QntLpc$i$i) + 20|0);
 $32 = (($QntLpc$i$i) + 24|0);
 $33 = (($QntLpc$i$i) + 28|0);
 $34 = (($QntLpc$i$i) + 32|0);
 $35 = (($QntLpc$i$i) + 36|0);
 $36 = (($DataBuff$i$i) + 240|0);
 $37 = (($QntLpc$i$i) + 40|0);
 $38 = (($QntLpc$i$i) + 44|0);
 $39 = (($QntLpc$i$i) + 48|0);
 $40 = (($QntLpc$i$i) + 52|0);
 $41 = (($QntLpc$i$i) + 56|0);
 $42 = (($QntLpc$i$i) + 60|0);
 $43 = (($QntLpc$i$i) + 64|0);
 $44 = (($QntLpc$i$i) + 68|0);
 $45 = (($QntLpc$i$i) + 72|0);
 $46 = (($QntLpc$i$i) + 76|0);
 $47 = (($DataBuff$i$i) + 480|0);
 $48 = (($QntLpc$i$i) + 80|0);
 $49 = (($QntLpc$i$i) + 84|0);
 $50 = (($QntLpc$i$i) + 88|0);
 $51 = (($QntLpc$i$i) + 92|0);
 $52 = (($QntLpc$i$i) + 96|0);
 $53 = (($QntLpc$i$i) + 100|0);
 $54 = (($QntLpc$i$i) + 104|0);
 $55 = (($QntLpc$i$i) + 108|0);
 $56 = (($QntLpc$i$i) + 112|0);
 $57 = (($QntLpc$i$i) + 116|0);
 $58 = (($DataBuff$i$i) + 720|0);
 $59 = (($QntLpc$i$i) + 120|0);
 $60 = (($QntLpc$i$i) + 124|0);
 $61 = (($QntLpc$i$i) + 128|0);
 $62 = (($QntLpc$i$i) + 132|0);
 $63 = (($QntLpc$i$i) + 136|0);
 $64 = (($QntLpc$i$i) + 140|0);
 $65 = (($QntLpc$i$i) + 144|0);
 $66 = (($QntLpc$i$i) + 148|0);
 $67 = (($QntLpc$i$i) + 152|0);
 $68 = (($QntLpc$i$i) + 156|0);
 $scevgep$i143$i$i$i = (($$byval_copy3) + 52|0);
 $69 = (($Line$i$i$i) + 24|0);
 $scevgep$i131$i$i$i = (($$byval_copy3) + 66|0);
 $70 = (($Line$i$i$i) + 8|0);
 $scevgep$i125$i$i$i = (($$byval_copy3) + 70|0);
 $71 = (($Line$i$i$i) + 44|0);
 $scevgep$i119$i$i$i = (($$byval_copy3) + 84|0);
 $72 = (($Line$i$i$i) + 12|0);
 $scevgep$i113$i$i$i = (($$byval_copy3) + 88|0);
 $73 = (($Line$i$i$i) + 100|0);
 $74 = (($Line$i$i$i) + 16|0);
 $75 = (($Line$i$i$i) + 72|0);
 $76 = (($Line$i$i$i) + 28|0);
 $77 = (($Line$i$i$i) + 56|0);
 $78 = (($Line$i$i$i) + 84|0);
 $79 = (($Line$i$i$i) + 112|0);
 $80 = (($Line$i$i$i) + 40|0);
 $81 = (($Line$i$i$i) + 68|0);
 $82 = (($Line$i$i$i) + 96|0);
 $83 = (($Line$i$i$i) + 124|0);
 $84 = (($Line$i$i$i) + 36|0);
 $85 = (($Line$i$i$i) + 64|0);
 $86 = (($Line$i$i$i) + 92|0);
 $87 = (($Line$i$i$i) + 120|0);
 $Pf$i$i$sroa$0$0 = 0;$Pf$i$i$sroa$10$sroa$0$0 = 0;$Pf$i$i$sroa$10$sroa$4$0 = 0.0;$Pf$i$i$sroa$10$sroa$5$0 = 0.0;$Pf$i$i$sroa$4$0 = 0.0;$Pf$i$i$sroa$5$0 = 0.0;$Pf$i$i$sroa$6$sroa$0$0 = 0;$Pf$i$i$sroa$6$sroa$4$0 = 0.0;$Pf$i$i$sroa$6$sroa$5$0 = 0.0;$Pf$i$i$sroa$8$sroa$0$0 = 0;$Pf$i$i$sroa$8$sroa$4$0 = 0.0;$Pf$i$i$sroa$8$sroa$5$0 = 0.0;$nLen$04 = 0;$nOut$01 = 0;$pIn$02 = $pInput;$pOut$03 = $pOutput;
 while(1) {
  $88 = HEAP8[$pIn$02>>0]|0;
  $89 = $88&255;
  $90 = $89 & 3;
  $91 = (8 + ($90<<1)|0);
  $92 = HEAP16[$91>>1]|0;
  $93 = $92 << 16 >> 16;
  HEAP16[$Line$i$i$i>>1] = 0;
  $i$021$i$i$i = 0;
  while(1) {
   $94 = $i$021$i$i$i >> 3;
   $95 = (($pIn$02) + ($94)|0);
   $96 = HEAP8[$95>>0]|0;
   $97 = $96 << 24 >> 24;
   $98 = $i$021$i$i$i & 7;
   $99 = $97 >>> $98;
   $100 = $99 & 1;
   $101 = $100&65535;
   $102 = (($$byval_copy3) + ($i$021$i$i$i<<1)|0);
   HEAP16[$102>>1] = $101;
   $103 = (($i$021$i$i$i) + 1)|0;
   $exitcond$i$i$i = ($103|0)==(192);
   if ($exitcond$i$i$i) {
    $105 = $$byval_copy3;$Rez$02$i$i$i$i = 0;$i$01$i$i$i$i = 0;
    break;
   } else {
    $i$021$i$i$i = $103;
   }
  }
  while(1) {
   $104 = HEAP16[$105>>1]|0;
   $106 = $104 << 16 >> 16;
   $107 = $106 << $i$01$i$i$i$i;
   $108 = (($107) + ($Rez$02$i$i$i$i))|0;
   $109 = (($105) + 2|0);
   $110 = (($i$01$i$i$i$i) + 1)|0;
   $exitcond$i$i$i$i = ($110|0)==(2);
   if ($exitcond$i$i$i$i) {
    break;
   } else {
    $105 = $109;$Rez$02$i$i$i$i = $108;$i$01$i$i$i$i = $110;
   }
  }
  $sext$i$i$i = $108 << 16;
  $111 = $sext$i$i$i >> 16;
  $112 = ($111|0)==(3);
  do {
   if ($112) {
    HEAP32[$3>>2] = 0;
    dest=$0+0|0; src=$Line$i$i$i+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
    $Ftyp$i$i$0 = 0;
   } else {
    $114 = $scevgep$i$i$i$i;$Rez$02$i140$i$i$i = 0;$i$01$i141$i$i$i = 0;
    while(1) {
     $113 = HEAP16[$114>>1]|0;
     $115 = $113 << 16 >> 16;
     $116 = $115 << $i$01$i141$i$i$i;
     $117 = (($116) + ($Rez$02$i140$i$i$i))|0;
     $118 = (($114) + 2|0);
     $119 = (($i$01$i141$i$i$i) + 1)|0;
     $exitcond$i142$i$i$i = ($119|0)==(24);
     if ($exitcond$i142$i$i$i) {
      break;
     } else {
      $114 = $118;$Rez$02$i140$i$i$i = $117;$i$01$i141$i$i$i = $119;
     }
    }
    HEAP32[$3>>2] = $117;
    $120 = ($111|0)==(2);
    if ($120) {
     $122 = $scevgep$i143$i$i$i;$Rez$02$i134$i$i$i = 0;$i$01$i135$i$i$i = 0;
     while(1) {
      $121 = HEAP16[$122>>1]|0;
      $123 = $121 << 16 >> 16;
      $124 = $123 << $i$01$i135$i$i$i;
      $125 = (($124) + ($Rez$02$i134$i$i$i))|0;
      $126 = (($122) + 2|0);
      $127 = (($i$01$i135$i$i$i) + 1)|0;
      $exitcond$i136$i$i$i = ($127|0)==(6);
      if ($exitcond$i136$i$i$i) {
       break;
      } else {
       $122 = $126;$Rez$02$i134$i$i$i = $125;$i$01$i135$i$i$i = $127;
      }
     }
     $sext13$i$i$i = $125 << 16;
     $128 = $sext13$i$i$i >> 16;
     HEAP32[$69>>2] = $128;
     dest=$0+0|0; src=$Line$i$i$i+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $Ftyp$i$i$0 = 2;
     break;
    }
    $129 = ($111|0)==(0);
    $130 = $129&1;
    $131 = $130 ^ 1;
    HEAP32[39864>>2] = $131;
    $133 = $scevgep$i143$i$i$i;$Rez$02$i128$i$i$i = 0;$i$01$i129$i$i$i = 0;
    while(1) {
     $132 = HEAP16[$133>>1]|0;
     $134 = $132 << 16 >> 16;
     $135 = $134 << $i$01$i129$i$i$i;
     $136 = (($135) + ($Rez$02$i128$i$i$i))|0;
     $137 = (($133) + 2|0);
     $138 = (($i$01$i129$i$i$i) + 1)|0;
     $exitcond$i130$i$i$i = ($138|0)==(7);
     if ($exitcond$i130$i$i$i) {
      break;
     } else {
      $133 = $137;$Rez$02$i128$i$i$i = $136;$i$01$i129$i$i$i = $138;
     }
    }
    $139 = ($136|0)<(124);
    if (!($139)) {
     HEAP16[$Line$i$i$i>>1] = 1;
     dest=$0+0|0; src=$Line$i$i$i+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $Ftyp$i$i$0 = 1;
     break;
    }
    $sext1$i$i$i = $136 << 16;
    $140 = $sext1$i$i$i >> 16;
    $141 = (($140) + 18)|0;
    HEAP32[$70>>2] = $141;
    $143 = $scevgep$i131$i$i$i;$Rez$02$i122$i$i$i = 0;$i$01$i123$i$i$i = 0;
    while(1) {
     $142 = HEAP16[$143>>1]|0;
     $144 = $142 << 16 >> 16;
     $145 = $144 << $i$01$i123$i$i$i;
     $146 = (($145) + ($Rez$02$i122$i$i$i))|0;
     $147 = (($143) + 2|0);
     $148 = (($i$01$i123$i$i$i) + 1)|0;
     $exitcond$i124$i$i$i = ($148|0)==(2);
     if ($exitcond$i124$i$i$i) {
      break;
     } else {
      $143 = $147;$Rez$02$i122$i$i$i = $146;$i$01$i123$i$i$i = $148;
     }
    }
    $sext2$i$i$i = $146 << 16;
    $149 = $sext2$i$i$i >> 16;
    HEAP32[$71>>2] = $149;
    $151 = $scevgep$i125$i$i$i;$Rez$02$i116$i$i$i = 0;$i$01$i117$i$i$i = 0;
    while(1) {
     $150 = HEAP16[$151>>1]|0;
     $152 = $150 << 16 >> 16;
     $153 = $152 << $i$01$i117$i$i$i;
     $154 = (($153) + ($Rez$02$i116$i$i$i))|0;
     $155 = (($151) + 2|0);
     $156 = (($i$01$i117$i$i$i) + 1)|0;
     $exitcond$i118$i$i$i = ($156|0)==(7);
     if ($exitcond$i118$i$i$i) {
      break;
     } else {
      $151 = $155;$Rez$02$i116$i$i$i = $154;$i$01$i117$i$i$i = $156;
     }
    }
    $157 = ($154|0)<(124);
    if (!($157)) {
     HEAP16[$Line$i$i$i>>1] = 1;
     dest=$0+0|0; src=$Line$i$i$i+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $Ftyp$i$i$0 = 1;
     break;
    }
    $sext3$i$i$i = $154 << 16;
    $158 = $sext3$i$i$i >> 16;
    $159 = (($158) + 18)|0;
    HEAP32[$72>>2] = $159;
    $161 = $scevgep$i119$i$i$i;$Rez$02$i110$i$i$i = 0;$i$01$i111$i$i$i = 0;
    while(1) {
     $160 = HEAP16[$161>>1]|0;
     $162 = $160 << 16 >> 16;
     $163 = $162 << $i$01$i111$i$i$i;
     $164 = (($163) + ($Rez$02$i110$i$i$i))|0;
     $165 = (($161) + 2|0);
     $166 = (($i$01$i111$i$i$i) + 1)|0;
     $exitcond$i112$i$i$i = ($166|0)==(2);
     if ($exitcond$i112$i$i$i) {
      break;
     } else {
      $161 = $165;$Rez$02$i110$i$i$i = $164;$i$01$i111$i$i$i = $166;
     }
    }
    $sext4$i$i$i = $164 << 16;
    $167 = $sext4$i$i$i >> 16;
    HEAP32[$73>>2] = $167;
    HEAP32[$74>>2] = 1;
    HEAP32[$75>>2] = 1;
    $Bsp$i$i$i$0 = $scevgep$i113$i$i$i;$i$119$i$i$i = 0;
    while(1) {
     $169 = $Bsp$i$i$i$0;$Rez$02$i104$i$i$i = 0;$i$01$i105$i$i$i = 0;
     while(1) {
      $168 = HEAP16[$169>>1]|0;
      $170 = $168 << 16 >> 16;
      $171 = $170 << $i$01$i105$i$i$i;
      $172 = (($171) + ($Rez$02$i104$i$i$i))|0;
      $173 = (($169) + 2|0);
      $174 = (($i$01$i105$i$i$i) + 1)|0;
      $exitcond$i106$i$i$i = ($174|0)==(12);
      if ($exitcond$i106$i$i$i) {
       break;
      } else {
       $169 = $173;$Rez$02$i104$i$i$i = $172;$i$01$i105$i$i$i = $174;
      }
     }
     $scevgep$i107$i$i$i = (($Bsp$i$i$i$0) + 24|0);
     $175 = ((($Line$i$i$i) + (($i$119$i$i$i*28)|0)|0) + 32|0);
     HEAP32[$175>>2] = 0;
     if ($129) {
      $176 = $i$119$i$i$i >> 1;
      $177 = ((($Line$i$i$i) + ($176<<2)|0) + 8|0);
      $178 = HEAP32[$177>>2]|0;
      $179 = ($178|0)<(58);
      if ($179) {
       $180 = $172 << 5;
       $181 = $180 >> 16;
       HEAP32[$175>>2] = $181;
       $182 = $172 & 2047;
       $Bound_AcGn$0$i$i$i = 85;$Temp$0$i$i$i = $182;
      } else {
       $Bound_AcGn$0$i$i$i = 170;$Temp$0$i$i$i = $172;
      }
     } else {
      $Bound_AcGn$0$i$i$i = 170;$Temp$0$i$i$i = $172;
     }
     $183 = (($Temp$0$i$i$i|0) / 24)&-1;
     $sext10$i$i$i = $183 << 16;
     $184 = $sext10$i$i$i >> 16;
     $185 = ((($Line$i$i$i) + (($i$119$i$i$i*28)|0)|0) + 20|0);
     HEAP32[$185>>2] = $184;
     $186 = ($184|0)<($Bound_AcGn$0$i$i$i|0);
     if (!($186)) {
      label = 32;
      break;
     }
     $187 = (($Temp$0$i$i$i|0) % 24)&-1;
     $sext11$i$i$i = $187 << 16;
     $188 = $sext11$i$i$i >> 16;
     $189 = ((($Line$i$i$i) + (($i$119$i$i$i*28)|0)|0) + 24|0);
     HEAP32[$189>>2] = $188;
     $190 = (($i$119$i$i$i) + 1)|0;
     $191 = ($190|0)<(4);
     if ($191) {
      $Bsp$i$i$i$0 = $scevgep$i107$i$i$i;$i$119$i$i$i = $190;
     } else {
      break;
     }
    }
    if ((label|0) == 32) {
     label = 0;
     HEAP16[$Line$i$i$i>>1] = 1;
     dest=$0+0|0; src=$Line$i$i$i+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $Ftyp$i$i$0 = 1;
     break;
    }
    $192 = (($Bsp$i$i$i$0) + 26|0);
    $193 = HEAP16[$scevgep$i107$i$i$i>>1]|0;
    $194 = $193 << 16 >> 16;
    HEAP32[$76>>2] = $194;
    $195 = (($Bsp$i$i$i$0) + 28|0);
    $196 = HEAP16[$192>>1]|0;
    $197 = $196 << 16 >> 16;
    HEAP32[$77>>2] = $197;
    $198 = (($Bsp$i$i$i$0) + 30|0);
    $199 = HEAP16[$195>>1]|0;
    $200 = $199 << 16 >> 16;
    HEAP32[$78>>2] = $200;
    $201 = HEAP16[$198>>1]|0;
    $202 = $201 << 16 >> 16;
    HEAP32[$79>>2] = $202;
    if ($129) {
     $203 = (($Bsp$i$i$i$0) + 34|0);
     $205 = $203;$Rez$02$i98$i$i$i = 0;$i$01$i99$i$i$i = 0;
     while(1) {
      $204 = HEAP16[$205>>1]|0;
      $206 = $204 << 16 >> 16;
      $207 = $206 << $i$01$i99$i$i$i;
      $208 = (($207) + ($Rez$02$i98$i$i$i))|0;
      $209 = (($205) + 2|0);
      $210 = (($i$01$i99$i$i$i) + 1)|0;
      $exitcond$i100$i$i$i = ($210|0)==(13);
      if ($exitcond$i100$i$i$i) {
       break;
      } else {
       $205 = $209;$Rez$02$i98$i$i$i = $208;$i$01$i99$i$i$i = $210;
      }
     }
     $scevgep$i101$i$i$i = (($Bsp$i$i$i$0) + 60|0);
     $211 = (($208|0) / 90)&-1;
     $212 = (($208|0) / 810)&-1;
     HEAP32[$80>>2] = $212;
     $213 = (($211|0) % 9)&-1;
     HEAP32[$81>>2] = $213;
     $214 = (($208|0) % 90)&-1;
     $215 = (($214|0) / 9)&-1;
     HEAP32[$82>>2] = $215;
     $216 = (($214|0) % 9)&-1;
     HEAP32[$83>>2] = $216;
     $217 = $212 << 16;
     $219 = $scevgep$i101$i$i$i;$Rez$02$i92$i$i$i = 0;$i$01$i93$i$i$i = 0;
     while(1) {
      $218 = HEAP16[$219>>1]|0;
      $220 = $218 << 16 >> 16;
      $221 = $220 << $i$01$i93$i$i$i;
      $222 = (($221) + ($Rez$02$i92$i$i$i))|0;
      $223 = (($219) + 2|0);
      $224 = (($i$01$i93$i$i$i) + 1)|0;
      $exitcond$i94$i$i$i = ($224|0)==(16);
      if ($exitcond$i94$i$i$i) {
       break;
      } else {
       $219 = $223;$Rez$02$i92$i$i$i = $222;$i$01$i93$i$i$i = $224;
      }
     }
     $scevgep$i95$i$i$i = (($Bsp$i$i$i$0) + 92|0);
     $225 = (($217) + ($222))|0;
     HEAP32[$80>>2] = $225;
     $226 = $213 << 14;
     $228 = $scevgep$i95$i$i$i;$Rez$02$i86$i$i$i = 0;$i$01$i87$i$i$i = 0;
     while(1) {
      $227 = HEAP16[$228>>1]|0;
      $229 = $227 << 16 >> 16;
      $230 = $229 << $i$01$i87$i$i$i;
      $231 = (($230) + ($Rez$02$i86$i$i$i))|0;
      $232 = (($228) + 2|0);
      $233 = (($i$01$i87$i$i$i) + 1)|0;
      $exitcond$i88$i$i$i = ($233|0)==(14);
      if ($exitcond$i88$i$i$i) {
       break;
      } else {
       $228 = $232;$Rez$02$i86$i$i$i = $231;$i$01$i87$i$i$i = $233;
      }
     }
     $scevgep$i89$i$i$i = (($Bsp$i$i$i$0) + 120|0);
     $234 = (($226) + ($231))|0;
     HEAP32[$81>>2] = $234;
     $235 = $215 << 16;
     $237 = $scevgep$i89$i$i$i;$Rez$02$i80$i$i$i = 0;$i$01$i81$i$i$i = 0;
     while(1) {
      $236 = HEAP16[$237>>1]|0;
      $238 = $236 << 16 >> 16;
      $239 = $238 << $i$01$i81$i$i$i;
      $240 = (($239) + ($Rez$02$i80$i$i$i))|0;
      $241 = (($237) + 2|0);
      $242 = (($i$01$i81$i$i$i) + 1)|0;
      $exitcond$i82$i$i$i = ($242|0)==(16);
      if ($exitcond$i82$i$i$i) {
       break;
      } else {
       $237 = $241;$Rez$02$i80$i$i$i = $240;$i$01$i81$i$i$i = $242;
      }
     }
     $scevgep$i83$i$i$i = (($Bsp$i$i$i$0) + 152|0);
     $243 = (($235) + ($240))|0;
     HEAP32[$82>>2] = $243;
     $244 = $216 << 14;
     $246 = $scevgep$i83$i$i$i;$Rez$02$i74$i$i$i = 0;$i$01$i75$i$i$i = 0;
     while(1) {
      $245 = HEAP16[$246>>1]|0;
      $247 = $245 << 16 >> 16;
      $248 = $247 << $i$01$i75$i$i$i;
      $249 = (($248) + ($Rez$02$i74$i$i$i))|0;
      $250 = (($246) + 2|0);
      $251 = (($i$01$i75$i$i$i) + 1)|0;
      $exitcond$i76$i$i$i = ($251|0)==(14);
      if ($exitcond$i76$i$i$i) {
       break;
      } else {
       $246 = $250;$Rez$02$i74$i$i$i = $249;$i$01$i75$i$i$i = $251;
      }
     }
     $scevgep$i77$i$i$i = (($Bsp$i$i$i$0) + 180|0);
     $252 = (($244) + ($249))|0;
     HEAP32[$83>>2] = $252;
     $254 = $scevgep$i77$i$i$i;$Rez$02$i68$i$i$i = 0;$i$01$i69$i$i$i = 0;
     while(1) {
      $253 = HEAP16[$254>>1]|0;
      $255 = $253 << 16 >> 16;
      $256 = $255 << $i$01$i69$i$i$i;
      $257 = (($256) + ($Rez$02$i68$i$i$i))|0;
      $258 = (($254) + 2|0);
      $259 = (($i$01$i69$i$i$i) + 1)|0;
      $exitcond$i70$i$i$i = ($259|0)==(6);
      if ($exitcond$i70$i$i$i) {
       break;
      } else {
       $254 = $258;$Rez$02$i68$i$i$i = $257;$i$01$i69$i$i$i = $259;
      }
     }
     $scevgep$i71$i$i$i = (($Bsp$i$i$i$0) + 192|0);
     $sext6$i$i$i = $257 << 16;
     $260 = $sext6$i$i$i >> 16;
     HEAP32[$84>>2] = $260;
     $262 = $scevgep$i71$i$i$i;$Rez$02$i62$i$i$i = 0;$i$01$i63$i$i$i = 0;
     while(1) {
      $261 = HEAP16[$262>>1]|0;
      $263 = $261 << 16 >> 16;
      $264 = $263 << $i$01$i63$i$i$i;
      $265 = (($264) + ($Rez$02$i62$i$i$i))|0;
      $266 = (($262) + 2|0);
      $267 = (($i$01$i63$i$i$i) + 1)|0;
      $exitcond$i64$i$i$i = ($267|0)==(5);
      if ($exitcond$i64$i$i$i) {
       break;
      } else {
       $262 = $266;$Rez$02$i62$i$i$i = $265;$i$01$i63$i$i$i = $267;
      }
     }
     $scevgep$i65$i$i$i = (($Bsp$i$i$i$0) + 202|0);
     $sext7$i$i$i = $265 << 16;
     $268 = $sext7$i$i$i >> 16;
     HEAP32[$85>>2] = $268;
     $270 = $scevgep$i65$i$i$i;$Rez$02$i56$i$i$i = 0;$i$01$i57$i$i$i = 0;
     while(1) {
      $269 = HEAP16[$270>>1]|0;
      $271 = $269 << 16 >> 16;
      $272 = $271 << $i$01$i57$i$i$i;
      $273 = (($272) + ($Rez$02$i56$i$i$i))|0;
      $274 = (($270) + 2|0);
      $275 = (($i$01$i57$i$i$i) + 1)|0;
      $exitcond$i58$i$i$i = ($275|0)==(6);
      if ($exitcond$i58$i$i$i) {
       break;
      } else {
       $270 = $274;$Rez$02$i56$i$i$i = $273;$i$01$i57$i$i$i = $275;
      }
     }
     $scevgep$i59$i$i$i = (($Bsp$i$i$i$0) + 214|0);
     $sext8$i$i$i = $273 << 16;
     $276 = $sext8$i$i$i >> 16;
     HEAP32[$86>>2] = $276;
     $278 = $scevgep$i59$i$i$i;$Rez$02$i50$i$i$i = 0;$i$01$i51$i$i$i = 0;
     while(1) {
      $277 = HEAP16[$278>>1]|0;
      $279 = $277 << 16 >> 16;
      $280 = $279 << $i$01$i51$i$i$i;
      $281 = (($280) + ($Rez$02$i50$i$i$i))|0;
      $282 = (($278) + 2|0);
      $283 = (($i$01$i51$i$i$i) + 1)|0;
      $exitcond$i52$i$i$i = ($283|0)==(5);
      if ($exitcond$i52$i$i$i) {
       $storemerge$in$in = $281;
       break;
      } else {
       $278 = $282;$Rez$02$i50$i$i$i = $281;$i$01$i51$i$i$i = $283;
      }
     }
    } else {
     $scevgep$i$i$i = (($Bsp$i$i$i$0) + 32|0);
     $285 = $scevgep$i$i$i;$Rez$02$i44$i$i$i = 0;$i$01$i45$i$i$i = 0;
     while(1) {
      $284 = HEAP16[$285>>1]|0;
      $286 = $284 << 16 >> 16;
      $287 = $286 << $i$01$i45$i$i$i;
      $288 = (($287) + ($Rez$02$i44$i$i$i))|0;
      $289 = (($285) + 2|0);
      $290 = (($i$01$i45$i$i$i) + 1)|0;
      $exitcond$i46$i$i$i = ($290|0)==(12);
      if ($exitcond$i46$i$i$i) {
       break;
      } else {
       $285 = $289;$Rez$02$i44$i$i$i = $288;$i$01$i45$i$i$i = $290;
      }
     }
     $scevgep$i47$i$i$i = (($Bsp$i$i$i$0) + 56|0);
     HEAP32[$80>>2] = $288;
     $292 = $scevgep$i47$i$i$i;$Rez$02$i38$i$i$i = 0;$i$01$i39$i$i$i = 0;
     while(1) {
      $291 = HEAP16[$292>>1]|0;
      $293 = $291 << 16 >> 16;
      $294 = $293 << $i$01$i39$i$i$i;
      $295 = (($294) + ($Rez$02$i38$i$i$i))|0;
      $296 = (($292) + 2|0);
      $297 = (($i$01$i39$i$i$i) + 1)|0;
      $exitcond$i40$i$i$i = ($297|0)==(12);
      if ($exitcond$i40$i$i$i) {
       break;
      } else {
       $292 = $296;$Rez$02$i38$i$i$i = $295;$i$01$i39$i$i$i = $297;
      }
     }
     $scevgep$i41$i$i$i = (($Bsp$i$i$i$0) + 80|0);
     HEAP32[$81>>2] = $295;
     $299 = $scevgep$i41$i$i$i;$Rez$02$i32$i$i$i = 0;$i$01$i33$i$i$i = 0;
     while(1) {
      $298 = HEAP16[$299>>1]|0;
      $300 = $298 << 16 >> 16;
      $301 = $300 << $i$01$i33$i$i$i;
      $302 = (($301) + ($Rez$02$i32$i$i$i))|0;
      $303 = (($299) + 2|0);
      $304 = (($i$01$i33$i$i$i) + 1)|0;
      $exitcond$i34$i$i$i = ($304|0)==(12);
      if ($exitcond$i34$i$i$i) {
       break;
      } else {
       $299 = $303;$Rez$02$i32$i$i$i = $302;$i$01$i33$i$i$i = $304;
      }
     }
     $scevgep$i35$i$i$i = (($Bsp$i$i$i$0) + 104|0);
     HEAP32[$82>>2] = $302;
     $306 = $scevgep$i35$i$i$i;$Rez$02$i26$i$i$i = 0;$i$01$i27$i$i$i = 0;
     while(1) {
      $305 = HEAP16[$306>>1]|0;
      $307 = $305 << 16 >> 16;
      $308 = $307 << $i$01$i27$i$i$i;
      $309 = (($308) + ($Rez$02$i26$i$i$i))|0;
      $310 = (($306) + 2|0);
      $311 = (($i$01$i27$i$i$i) + 1)|0;
      $exitcond$i28$i$i$i = ($311|0)==(12);
      if ($exitcond$i28$i$i$i) {
       break;
      } else {
       $306 = $310;$Rez$02$i26$i$i$i = $309;$i$01$i27$i$i$i = $311;
      }
     }
     $scevgep$i29$i$i$i = (($Bsp$i$i$i$0) + 128|0);
     HEAP32[$83>>2] = $309;
     $313 = $scevgep$i29$i$i$i;$Rez$02$i20$i$i$i = 0;$i$01$i21$i$i$i = 0;
     while(1) {
      $312 = HEAP16[$313>>1]|0;
      $314 = $312 << 16 >> 16;
      $315 = $314 << $i$01$i21$i$i$i;
      $316 = (($315) + ($Rez$02$i20$i$i$i))|0;
      $317 = (($313) + 2|0);
      $318 = (($i$01$i21$i$i$i) + 1)|0;
      $exitcond$i22$i$i$i = ($318|0)==(4);
      if ($exitcond$i22$i$i$i) {
       break;
      } else {
       $313 = $317;$Rez$02$i20$i$i$i = $316;$i$01$i21$i$i$i = $318;
      }
     }
     $scevgep$i23$i$i$i = (($Bsp$i$i$i$0) + 136|0);
     $sext5$i$i$i = $316 << 16;
     $319 = $sext5$i$i$i >> 16;
     HEAP32[$84>>2] = $319;
     $321 = $scevgep$i23$i$i$i;$Rez$02$i14$i$i$i = 0;$i$01$i15$i$i$i = 0;
     while(1) {
      $320 = HEAP16[$321>>1]|0;
      $322 = $320 << 16 >> 16;
      $323 = $322 << $i$01$i15$i$i$i;
      $324 = (($323) + ($Rez$02$i14$i$i$i))|0;
      $325 = (($321) + 2|0);
      $326 = (($i$01$i15$i$i$i) + 1)|0;
      $exitcond$i16$i$i$i = ($326|0)==(4);
      if ($exitcond$i16$i$i$i) {
       break;
      } else {
       $321 = $325;$Rez$02$i14$i$i$i = $324;$i$01$i15$i$i$i = $326;
      }
     }
     $scevgep$i17$i$i$i = (($Bsp$i$i$i$0) + 144|0);
     $sext5$1$i$i$i = $324 << 16;
     $327 = $sext5$1$i$i$i >> 16;
     HEAP32[$85>>2] = $327;
     $329 = $scevgep$i17$i$i$i;$Rez$02$i8$i$i$i = 0;$i$01$i9$i$i$i = 0;
     while(1) {
      $328 = HEAP16[$329>>1]|0;
      $330 = $328 << 16 >> 16;
      $331 = $330 << $i$01$i9$i$i$i;
      $332 = (($331) + ($Rez$02$i8$i$i$i))|0;
      $333 = (($329) + 2|0);
      $334 = (($i$01$i9$i$i$i) + 1)|0;
      $exitcond$i10$i$i$i = ($334|0)==(4);
      if ($exitcond$i10$i$i$i) {
       break;
      } else {
       $329 = $333;$Rez$02$i8$i$i$i = $332;$i$01$i9$i$i$i = $334;
      }
     }
     $scevgep$i11$i$i$i = (($Bsp$i$i$i$0) + 152|0);
     $sext5$2$i$i$i = $332 << 16;
     $335 = $sext5$2$i$i$i >> 16;
     HEAP32[$86>>2] = $335;
     $337 = $scevgep$i11$i$i$i;$Rez$02$i2$i$i$i = 0;$i$01$i3$i$i$i = 0;
     while(1) {
      $336 = HEAP16[$337>>1]|0;
      $338 = $336 << 16 >> 16;
      $339 = $338 << $i$01$i3$i$i$i;
      $340 = (($339) + ($Rez$02$i2$i$i$i))|0;
      $341 = (($337) + 2|0);
      $342 = (($i$01$i3$i$i$i) + 1)|0;
      $exitcond$i4$i$i$i = ($342|0)==(4);
      if ($exitcond$i4$i$i$i) {
       $storemerge$in$in = $340;
       break;
      } else {
       $337 = $341;$Rez$02$i2$i$i$i = $340;$i$01$i3$i$i$i = $342;
      }
     }
    }
    $storemerge$in = $storemerge$in$in << 16;
    $storemerge = $storemerge$in >> 16;
    HEAP32[$87>>2] = $storemerge;
    dest=$0+0|0; src=$Line$i$i$i+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
    $Ftyp$i$i$0 = 1;
   }
  } while(0);
  dest=$Line$i$i+0|0; src=$0+0|0; stop=dest+128|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
  $343 = HEAP16[$Line$i$i>>1]|0;
  $344 = ($343<<16>>16)==(0);
  do {
   if ($344) {
    if ((($Ftyp$i$i$0<<16>>16) == 2)) {
     $363 = HEAP32[$4>>2]|0;
     $sext = $363 << 16;
     $364 = $sext >> 16;
     $365 = $364 >>> 4;
     $sext$mask$i$i$i$i = $365 & 65535;
     $366 = ($sext$mask$i$i$i$i|0)==(3);
     $sext$i$i$i$i = $365 << 16;
     $367 = $sext$i$i$i$i >> 16;
     $368 = $366 ? 2 : $367;
     $369 = $368 << 4;
     $370 = (($364) - ($369))|0;
     $371 = (36928 + ($368<<2)|0);
     $372 = +HEAPF32[$371>>2];
     $sext1$i$i$i$i = $370 << 16;
     $373 = $sext1$i$i$i$i >> 16;
     $374 = (($368) + 1)|0;
     $375 = $373 << $374;
     $376 = (+($375|0));
     $377 = $376 + $372;
     HEAPF32[((40640 + 48|0))>>2] = $377;
     $378 = HEAP32[$5>>2]|0;
     _Lsp_Inq(((40640 + 8|0)),((39880 + 20|0)),$378,0);
     $$pr$pre = HEAP16[((40640 + 4|0))>>1]|0;
     $phitmp = ($$pr$pre<<16>>16)==(1);
     if ($phitmp) {
      $Ftyp$i$i$2132 = 2;
     } else {
      $Ftyp$i$i$3 = 2;
      label = 76;
      break;
     }
    } else if ((($Ftyp$i$i$0<<16>>16) == 1)) {
     $storemerge$i$i = 0;
     label = 79;
     break;
    } else {
     $$pre = HEAP16[((40640 + 4|0))>>1]|0;
     $347 = ($$pre<<16>>16)==(1);
     if (!($347)) {
      $Ftyp$i$i$3 = $Ftyp$i$i$0;
      label = 76;
      break;
     }
     $348 = (_Qua_SidGain(((40640 + 48|0)),0)|0);
     $349 = $348 << 16 >> 16;
     $350 = $349 >>> 4;
     $sext$mask$i1$i$i$i = $350 & 65535;
     $351 = ($sext$mask$i1$i$i$i|0)==(3);
     $sext$i2$i$i$i = $350 << 16;
     $352 = $sext$i2$i$i$i >> 16;
     $353 = $351 ? 2 : $352;
     $354 = $353 << 4;
     $355 = (($349) - ($354))|0;
     $356 = (36928 + ($353<<2)|0);
     $357 = +HEAPF32[$356>>2];
     $sext1$i3$i$i$i = $355 << 16;
     $358 = $sext1$i3$i$i$i >> 16;
     $359 = (($353) + 1)|0;
     $360 = $358 << $359;
     $361 = (+($360|0));
     $362 = $361 + $357;
     HEAPF32[((40640 + 48|0))>>2] = $362;
     $Ftyp$i$i$2132 = $Ftyp$i$i$0;
    }
    $379 = +HEAPF32[((40640 + 48|0))>>2];
    $Ftyp$i$i$4 = $Ftyp$i$i$2132;$storemerge$i$i$i = $379;
    label = 77;
   } else {
    $345 = HEAP16[((40640 + 4|0))>>1]|0;
    $346 = ($345<<16>>16)==(1);
    if ($346) {
     $395 = HEAP32[39880>>2]|0;
     $396 = (($395) + 1)|0;
     $storemerge$i$i = $396;
     label = 79;
    } else {
     $Ftyp$i$i$3 = 0;
     label = 76;
    }
   }
  } while(0);
  if ((label|0) == 76) {
   label = 0;
   $380 = +HEAPF32[40640>>2];
   $381 = $380 * 0.875;
   $382 = +HEAPF32[((40640 + 48|0))>>2];
   $383 = $382 * 0.125;
   $384 = $381 + $383;
   $Ftyp$i$i$4 = $Ftyp$i$i$3;$storemerge$i$i$i = $384;
   label = 77;
  }
  else if ((label|0) == 79) {
   label = 0;
   $397 = ($storemerge$i$i|0)>(3);
   $$storemerge$i$i = $397 ? 3 : $storemerge$i$i;
   HEAP32[39880>>2] = $$storemerge$i$i;
   $398 = HEAP32[$5>>2]|0;
   _Lsp_Inq($LspVect$i$i,((39880 + 20|0)),$398,$343);
   _Lsp_Int($QntLpc$i$i,$LspVect$i$i,((39880 + 20|0)));
   dest=((39880 + 20|0))+0|0; src=$LspVect$i$i+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   $399 = HEAP32[39880>>2]|0;
   $400 = ($399|0)==(0);
   do {
    if ($400) {
     $401 = HEAP32[$6>>2]|0;
     $402 = HEAP32[$7>>2]|0;
     $403 = (($402) + ($401))|0;
     $404 = $403 >> 1;
     $405 = (13280 + ($404<<2)|0);
     $406 = +HEAPF32[$405>>2];
     HEAPF32[((39880 + 4|0))>>2] = $406;
     _memcpy(($Temp$i$i|0),(((39880 + 60|0))|0),580)|0;
     $407 = HEAP32[$10>>2]|0;
     ;HEAP32[$$byval_copy3+0>>2]=HEAP32[$9+0>>2]|0;HEAP32[$$byval_copy3+4>>2]=HEAP32[$9+4>>2]|0;HEAP32[$$byval_copy3+8>>2]=HEAP32[$9+8>>2]|0;HEAP32[$$byval_copy3+12>>2]=HEAP32[$9+12>>2]|0;HEAP32[$$byval_copy3+16>>2]=HEAP32[$9+16>>2]|0;HEAP32[$$byval_copy3+20>>2]=HEAP32[$9+20>>2]|0;HEAP32[$$byval_copy3+24>>2]=HEAP32[$9+24>>2]|0;
     _Fcbk_Unpk($8,$$byval_copy3,$407,0);
     $408 = HEAP32[$9>>2]|0;
     $409 = HEAP32[$11>>2]|0;
     _Decod_Acbk($AcbkCont$i$i,$Temp$i$i,39864,$407,$408,$409);
     $j$023$i$i = 0;
     while(1) {
      $$sum$i$i = (($j$023$i$i) + 145)|0;
      $410 = (($Temp$i$i) + ($$sum$i$i<<2)|0);
      $411 = +HEAPF32[$410>>2];
      $412 = (($AcbkCont$i$i) + ($j$023$i$i<<2)|0);
      $413 = +HEAPF32[$412>>2];
      $414 = $411 + $413;
      HEAPF32[$410>>2] = $414;
      $415 = (($j$023$i$i) + 1)|0;
      $exitcond48$i$i = ($415|0)==(60);
      if ($exitcond48$i$i) {
       break;
      } else {
       $j$023$i$i = $415;
      }
     }
     ;HEAP32[$$byval_copy3+0>>2]=HEAP32[$13+0>>2]|0;HEAP32[$$byval_copy3+4>>2]=HEAP32[$13+4>>2]|0;HEAP32[$$byval_copy3+8>>2]=HEAP32[$13+8>>2]|0;HEAP32[$$byval_copy3+12>>2]=HEAP32[$13+12>>2]|0;HEAP32[$$byval_copy3+16>>2]=HEAP32[$13+16>>2]|0;HEAP32[$$byval_copy3+20>>2]=HEAP32[$13+20>>2]|0;HEAP32[$$byval_copy3+24>>2]=HEAP32[$13+24>>2]|0;
     _Fcbk_Unpk($12,$$byval_copy3,$407,1);
     $416 = HEAP32[$13>>2]|0;
     $417 = HEAP32[$15>>2]|0;
     _Decod_Acbk($AcbkCont$i$i,$14,39864,$407,$416,$417);
     $j$023$1$i$i = 0;
     while(1) {
      $$sum57$i$i = (($j$023$1$i$i) + 205)|0;
      $908 = (($Temp$i$i) + ($$sum57$i$i<<2)|0);
      $909 = +HEAPF32[$908>>2];
      $910 = (($AcbkCont$i$i) + ($j$023$1$i$i<<2)|0);
      $911 = +HEAPF32[$910>>2];
      $912 = $909 + $911;
      HEAPF32[$908>>2] = $912;
      $913 = (($j$023$1$i$i) + 1)|0;
      $exitcond48$1$i$i = ($913|0)==(60);
      if ($exitcond48$1$i$i) {
       break;
      } else {
       $j$023$1$i$i = $913;
      }
     }
     $418 = HEAP32[$18>>2]|0;
     ;HEAP32[$$byval_copy3+0>>2]=HEAP32[$17+0>>2]|0;HEAP32[$$byval_copy3+4>>2]=HEAP32[$17+4>>2]|0;HEAP32[$$byval_copy3+8>>2]=HEAP32[$17+8>>2]|0;HEAP32[$$byval_copy3+12>>2]=HEAP32[$17+12>>2]|0;HEAP32[$$byval_copy3+16>>2]=HEAP32[$17+16>>2]|0;HEAP32[$$byval_copy3+20>>2]=HEAP32[$17+20>>2]|0;HEAP32[$$byval_copy3+24>>2]=HEAP32[$17+24>>2]|0;
     _Fcbk_Unpk($16,$$byval_copy3,$418,2);
     $914 = HEAP32[$17>>2]|0;
     $915 = HEAP32[$20>>2]|0;
     _Decod_Acbk($AcbkCont$i$i,$19,39864,$418,$914,$915);
     $j$023$2$i$i = 0;
     while(1) {
      $$sum58$i$i = (($j$023$2$i$i) + 265)|0;
      $916 = (($Temp$i$i) + ($$sum58$i$i<<2)|0);
      $917 = +HEAPF32[$916>>2];
      $918 = (($AcbkCont$i$i) + ($j$023$2$i$i<<2)|0);
      $919 = +HEAPF32[$918>>2];
      $920 = $917 + $919;
      HEAPF32[$916>>2] = $920;
      $921 = (($j$023$2$i$i) + 1)|0;
      $exitcond48$2$i$i = ($921|0)==(60);
      if ($exitcond48$2$i$i) {
       break;
      } else {
       $j$023$2$i$i = $921;
      }
     }
     ;HEAP32[$$byval_copy3+0>>2]=HEAP32[$22+0>>2]|0;HEAP32[$$byval_copy3+4>>2]=HEAP32[$22+4>>2]|0;HEAP32[$$byval_copy3+8>>2]=HEAP32[$22+8>>2]|0;HEAP32[$$byval_copy3+12>>2]=HEAP32[$22+12>>2]|0;HEAP32[$$byval_copy3+16>>2]=HEAP32[$22+16>>2]|0;HEAP32[$$byval_copy3+20>>2]=HEAP32[$22+20>>2]|0;HEAP32[$$byval_copy3+24>>2]=HEAP32[$22+24>>2]|0;
     _Fcbk_Unpk($21,$$byval_copy3,$418,3);
     $922 = HEAP32[$22>>2]|0;
     $923 = HEAP32[$24>>2]|0;
     _Decod_Acbk($AcbkCont$i$i,$23,39864,$418,$922,$923);
     $j$023$3$i$i = 0;
     while(1) {
      $$sum59$i$i = (($j$023$3$i$i) + 325)|0;
      $924 = (($Temp$i$i) + ($$sum59$i$i<<2)|0);
      $925 = +HEAPF32[$924>>2];
      $926 = (($AcbkCont$i$i) + ($j$023$3$i$i<<2)|0);
      $927 = +HEAPF32[$926>>2];
      $928 = $925 + $927;
      HEAPF32[$924>>2] = $928;
      $929 = (($j$023$3$i$i) + 1)|0;
      $exitcond48$3$i$i = ($929|0)==(60);
      if ($exitcond48$3$i$i) {
       break;
      } else {
       $j$023$3$i$i = $929;
      }
     }
     _memcpy(($DataBuff$i$i|0),($8|0),960)|0;
     $419 = ($418|0)>(142);
     $$Olp$i$i$i = $419 ? 142 : $418;
     $420 = (($$Olp$i$i$i) + -3)|0;
     $421 = (($$Olp$i$i$i) + 3)|0;
     $Ccr$03$i$i$i = 0.0;$Indx$04$i$i$i = $$Olp$i$i$i;$i$02$i$i$i = $420;
     while(1) {
      $422 = (265 - ($i$02$i$i$i))|0;
      $i$01$i$i2$i$i = 0;$sum$02$i$i$i$i = 0.0;
      while(1) {
       $$sum24 = (($i$01$i$i2$i$i) + 265)|0;
       $423 = (($Temp$i$i) + ($$sum24<<2)|0);
       $424 = +HEAPF32[$423>>2];
       $$sum25 = (($422) + ($i$01$i$i2$i$i))|0;
       $425 = (($Temp$i$i) + ($$sum25<<2)|0);
       $426 = +HEAPF32[$425>>2];
       $427 = $424 * $426;
       $428 = (($i$01$i$i2$i$i) + 1)|0;
       $$sum26 = (($i$01$i$i2$i$i) + 266)|0;
       $429 = (($Temp$i$i) + ($$sum26<<2)|0);
       $430 = +HEAPF32[$429>>2];
       $$sum27 = (($422) + ($428))|0;
       $431 = (($Temp$i$i) + ($$sum27<<2)|0);
       $432 = +HEAPF32[$431>>2];
       $433 = $430 * $432;
       $434 = $427 + $433;
       $435 = (($i$01$i$i2$i$i) + 2)|0;
       $$sum28 = (($i$01$i$i2$i$i) + 267)|0;
       $436 = (($Temp$i$i) + ($$sum28<<2)|0);
       $437 = +HEAPF32[$436>>2];
       $$sum29 = (($422) + ($435))|0;
       $438 = (($Temp$i$i) + ($$sum29<<2)|0);
       $439 = +HEAPF32[$438>>2];
       $440 = $437 * $439;
       $441 = $434 + $440;
       $442 = $sum$02$i$i$i$i + $441;
       $443 = (($i$01$i$i2$i$i) + 3)|0;
       $444 = ($443|0)<(120);
       if ($444) {
        $i$01$i$i2$i$i = $443;$sum$02$i$i$i$i = $442;
       } else {
        break;
       }
      }
      $445 = $442 > $Ccr$03$i$i$i;
      $Ccr$1$i$i$i = $445 ? $442 : $Ccr$03$i$i$i;
      $Indx$1$i$i$i = $445 ? $i$02$i$i$i : $Indx$04$i$i$i;
      $446 = (($i$02$i$i$i) + 1)|0;
      $447 = ($i$02$i$i$i|0)<($421|0);
      if ($447) {
       $Ccr$03$i$i$i = $Ccr$1$i$i$i;$Indx$04$i$i$i = $Indx$1$i$i$i;$i$02$i$i$i = $446;
      } else {
       $i$01$i6$i$i$i = 0;$sum$02$i5$i$i$i = 0.0;
       break;
      }
     }
     while(1) {
      $$sum30 = (($i$01$i6$i$i$i) + 265)|0;
      $448 = (($Temp$i$i) + ($$sum30<<2)|0);
      $449 = +HEAPF32[$448>>2];
      $450 = $449 * $449;
      $$sum32 = (($i$01$i6$i$i$i) + 266)|0;
      $451 = (($Temp$i$i) + ($$sum32<<2)|0);
      $452 = +HEAPF32[$451>>2];
      $453 = $452 * $452;
      $454 = $450 + $453;
      $$sum34 = (($i$01$i6$i$i$i) + 267)|0;
      $455 = (($Temp$i$i) + ($$sum34<<2)|0);
      $456 = +HEAPF32[$455>>2];
      $457 = $456 * $456;
      $458 = $454 + $457;
      $459 = $sum$02$i5$i$i$i + $458;
      $460 = (($i$01$i6$i$i$i) + 3)|0;
      $461 = ($460|0)<(120);
      if ($461) {
       $i$01$i6$i$i$i = $460;$sum$02$i5$i$i$i = $459;
      } else {
       break;
      }
     }
     HEAPF32[((40640 + 48|0))>>2] = $459;
     $462 = (265 - ($Indx$1$i$i$i))|0;
     $463 = !($Ccr$1$i$i$i <= 0.0);
     if ($463) {
      $i$01$i2$i$i$i = 0;$sum$02$i1$i$i$i = 0.0;
      while(1) {
       $$sum36 = (($462) + ($i$01$i2$i$i$i))|0;
       $464 = (($Temp$i$i) + ($$sum36<<2)|0);
       $465 = +HEAPF32[$464>>2];
       $466 = $465 * $465;
       $467 = (($i$01$i2$i$i$i) + 1)|0;
       $$sum38 = (($462) + ($467))|0;
       $468 = (($Temp$i$i) + ($$sum38<<2)|0);
       $469 = +HEAPF32[$468>>2];
       $470 = $469 * $469;
       $471 = $466 + $470;
       $472 = (($i$01$i2$i$i$i) + 2)|0;
       $$sum40 = (($462) + ($472))|0;
       $473 = (($Temp$i$i) + ($$sum40<<2)|0);
       $474 = +HEAPF32[$473>>2];
       $475 = $474 * $474;
       $476 = $471 + $475;
       $477 = $sum$02$i1$i$i$i + $476;
       $478 = (($i$01$i2$i$i$i) + 3)|0;
       $479 = ($478|0)<(120);
       if ($479) {
        $i$01$i2$i$i$i = $478;$sum$02$i1$i$i$i = $477;
       } else {
        break;
       }
      }
      $480 = $477 * 0.125;
      $481 = $459 * $480;
      $482 = $Ccr$1$i$i$i * $Ccr$1$i$i$i;
      $483 = $481 - $482;
      $484 = $483 < 0.0;
      if ($484) {
       $485 = $Indx$1$i$i$i&65535;
       $$0$i$i$i = $485;
      } else {
       $$0$i$i$i = 0;
      }
     } else {
      $$0$i$i$i = 0;
     }
     HEAP16[((39880 + 8|0))>>1] = $$0$i$i$i;
     $486 = HEAP32[((39864 + 12|0))>>2]|0;
     $487 = ($486|0)==(0);
     if ($487) {
      $Pf$i$i$sroa$0$1 = $Pf$i$i$sroa$0$0;$Pf$i$i$sroa$10$sroa$0$1 = $Pf$i$i$sroa$10$sroa$0$0;$Pf$i$i$sroa$10$sroa$4$1 = $Pf$i$i$sroa$10$sroa$4$0;$Pf$i$i$sroa$10$sroa$5$1 = $Pf$i$i$sroa$10$sroa$5$0;$Pf$i$i$sroa$4$1 = $Pf$i$i$sroa$4$0;$Pf$i$i$sroa$5$1 = $Pf$i$i$sroa$5$0;$Pf$i$i$sroa$6$sroa$0$1 = $Pf$i$i$sroa$6$sroa$0$0;$Pf$i$i$sroa$6$sroa$4$1 = $Pf$i$i$sroa$6$sroa$4$0;$Pf$i$i$sroa$6$sroa$5$1 = $Pf$i$i$sroa$6$sroa$5$0;$Pf$i$i$sroa$8$sroa$0$1 = $Pf$i$i$sroa$8$sroa$0$0;$Pf$i$i$sroa$8$sroa$4$1 = $Pf$i$i$sroa$8$sroa$4$0;$Pf$i$i$sroa$8$sroa$5$1 = $Pf$i$i$sroa$8$sroa$5$0;
     } else {
      _Comp_Lpf($1,$Temp$i$i,$407,0);
      $488 = HEAP32[$1>>2]|0;
      $489 = +HEAPF32[$25>>2];
      $490 = +HEAPF32[$26>>2];
      _Comp_Lpf($1,$Temp$i$i,$407,1);
      $491 = HEAP32[$1>>2]|0;
      $492 = +HEAPF32[$25>>2];
      $493 = +HEAPF32[$26>>2];
      _Comp_Lpf($1,$Temp$i$i,$418,2);
      $494 = HEAP32[$1>>2]|0;
      $495 = +HEAPF32[$25>>2];
      $496 = +HEAPF32[$26>>2];
      _Comp_Lpf($1,$Temp$i$i,$418,3);
      $497 = HEAP32[$1>>2]|0;
      $498 = +HEAPF32[$25>>2];
      $499 = +HEAPF32[$26>>2];
      $Pf$i$i$sroa$0$1 = $488;$Pf$i$i$sroa$10$sroa$0$1 = $497;$Pf$i$i$sroa$10$sroa$4$1 = $498;$Pf$i$i$sroa$10$sroa$5$1 = $499;$Pf$i$i$sroa$4$1 = $489;$Pf$i$i$sroa$5$1 = $490;$Pf$i$i$sroa$6$sroa$0$1 = $491;$Pf$i$i$sroa$6$sroa$4$1 = $492;$Pf$i$i$sroa$6$sroa$5$1 = $493;$Pf$i$i$sroa$8$sroa$0$1 = $494;$Pf$i$i$sroa$8$sroa$4$1 = $495;$Pf$i$i$sroa$8$sroa$5$1 = $496;
     }
     _memcpy(($Temp$i$i|0),(((39880 + 60|0))|0),580)|0;
     _memcpy(($8|0),($DataBuff$i$i|0),960)|0;
     $j$414$i$i = 0;
     while(1) {
      $500 = (($j$414$i$i) + 145)|0;
      $501 = (($Temp$i$i) + ($500<<2)|0);
      $502 = +HEAPF32[$501>>2];
      $503 = $502 < -32767.5;
      if ($503) {
       HEAPF32[$501>>2] = -32768.0;
      } else {
       $504 = $502 > 32766.5;
       if ($504) {
        HEAPF32[$501>>2] = 32767.0;
       }
      }
      $505 = (($j$414$i$i) + 1)|0;
      $exitcond37$i$i = ($505|0)==(240);
      if ($exitcond37$i$i) {
       break;
      } else {
       $j$414$i$i = $505;
      }
     }
     $506 = HEAP32[((39864 + 12|0))>>2]|0;
     $507 = ($506|0)==(0);
     if (!($507)) {
      $i$01$i$i$i = 0;
      while(1) {
       $508 = (($i$01$i$i$i) + 145)|0;
       $509 = (($Temp$i$i) + ($508<<2)|0);
       $510 = +HEAPF32[$509>>2];
       $511 = $510 * $Pf$i$i$sroa$5$1;
       $512 = (($508) + ($Pf$i$i$sroa$0$1))|0;
       $513 = (($Temp$i$i) + ($512<<2)|0);
       $514 = +HEAPF32[$513>>2];
       $515 = $514 * $Pf$i$i$sroa$4$1;
       $516 = $511 + $515;
       $517 = (($DataBuff$i$i) + ($i$01$i$i$i<<2)|0);
       HEAPF32[$517>>2] = $516;
       $518 = (($i$01$i$i$i) + 1)|0;
       $exitcond$i4$i$i = ($518|0)==(60);
       if ($exitcond$i4$i$i) {
        $i$01$i7$i$i = 0;
        break;
       } else {
        $i$01$i$i$i = $518;
       }
      }
      while(1) {
       $519 = (($i$01$i7$i$i) + 205)|0;
       $520 = (($Temp$i$i) + ($519<<2)|0);
       $521 = +HEAPF32[$520>>2];
       $522 = $521 * $Pf$i$i$sroa$6$sroa$5$1;
       $523 = (($519) + ($Pf$i$i$sroa$6$sroa$0$1))|0;
       $524 = (($Temp$i$i) + ($523<<2)|0);
       $525 = +HEAPF32[$524>>2];
       $526 = $525 * $Pf$i$i$sroa$6$sroa$4$1;
       $527 = $522 + $526;
       $528 = (($i$01$i7$i$i) + 60)|0;
       $529 = (($DataBuff$i$i) + ($528<<2)|0);
       HEAPF32[$529>>2] = $527;
       $530 = (($i$01$i7$i$i) + 1)|0;
       $exitcond$i8$i$i = ($530|0)==(60);
       if ($exitcond$i8$i$i) {
        $i$01$i12$i$i = 0;
        break;
       } else {
        $i$01$i7$i$i = $530;
       }
      }
      while(1) {
       $531 = (($i$01$i12$i$i) + 265)|0;
       $532 = (($Temp$i$i) + ($531<<2)|0);
       $533 = +HEAPF32[$532>>2];
       $534 = $533 * $Pf$i$i$sroa$8$sroa$5$1;
       $535 = (($531) + ($Pf$i$i$sroa$8$sroa$0$1))|0;
       $536 = (($Temp$i$i) + ($535<<2)|0);
       $537 = +HEAPF32[$536>>2];
       $538 = $537 * $Pf$i$i$sroa$8$sroa$4$1;
       $539 = $534 + $538;
       $540 = (($i$01$i12$i$i) + 120)|0;
       $541 = (($DataBuff$i$i) + ($540<<2)|0);
       HEAPF32[$541>>2] = $539;
       $542 = (($i$01$i12$i$i) + 1)|0;
       $exitcond$i13$i$i = ($542|0)==(60);
       if ($exitcond$i13$i$i) {
        $i$01$i17$i$i = 0;
        break;
       } else {
        $i$01$i12$i$i = $542;
       }
      }
      while(1) {
       $543 = (($i$01$i17$i$i) + 325)|0;
       $544 = (($Temp$i$i) + ($543<<2)|0);
       $545 = +HEAPF32[$544>>2];
       $546 = $545 * $Pf$i$i$sroa$10$sroa$5$1;
       $547 = (($543) + ($Pf$i$i$sroa$10$sroa$0$1))|0;
       $548 = (($Temp$i$i) + ($547<<2)|0);
       $549 = +HEAPF32[$548>>2];
       $550 = $549 * $Pf$i$i$sroa$10$sroa$4$1;
       $551 = $546 + $550;
       $552 = (($i$01$i17$i$i) + 180)|0;
       $553 = (($DataBuff$i$i) + ($552<<2)|0);
       HEAPF32[$553>>2] = $551;
       $554 = (($i$01$i17$i$i) + 1)|0;
       $exitcond$i18$i$i = ($554|0)==(60);
       if ($exitcond$i18$i$i) {
        break;
       } else {
        $i$01$i17$i$i = $554;
       }
      }
     }
     $555 = +HEAPF32[((39880 + 20|0))>>2];
     HEAPF32[((40640 + 8|0))>>2] = $555;
     $556 = +HEAPF32[((39880 + 24|0))>>2];
     HEAPF32[((40640 + 12|0))>>2] = $556;
     $557 = +HEAPF32[((39880 + 28|0))>>2];
     HEAPF32[((40640 + 16|0))>>2] = $557;
     $558 = +HEAPF32[((39880 + 32|0))>>2];
     HEAPF32[((40640 + 20|0))>>2] = $558;
     $559 = +HEAPF32[((39880 + 36|0))>>2];
     HEAPF32[((40640 + 24|0))>>2] = $559;
     $560 = +HEAPF32[((39880 + 40|0))>>2];
     HEAPF32[((40640 + 28|0))>>2] = $560;
     $561 = +HEAPF32[((39880 + 44|0))>>2];
     HEAPF32[((40640 + 32|0))>>2] = $561;
     $562 = +HEAPF32[((39880 + 48|0))>>2];
     HEAPF32[((40640 + 36|0))>>2] = $562;
     $563 = +HEAPF32[((39880 + 52|0))>>2];
     HEAPF32[((40640 + 40|0))>>2] = $563;
     $564 = +HEAPF32[((39880 + 56|0))>>2];
     HEAPF32[((40640 + 44|0))>>2] = $564;
     $Pf$i$i$sroa$0$2$ph = $Pf$i$i$sroa$0$1;$Pf$i$i$sroa$10$sroa$0$2$ph = $Pf$i$i$sroa$10$sroa$0$1;$Pf$i$i$sroa$10$sroa$4$2$ph = $Pf$i$i$sroa$10$sroa$4$1;$Pf$i$i$sroa$10$sroa$5$2$ph = $Pf$i$i$sroa$10$sroa$5$1;$Pf$i$i$sroa$4$2$ph = $Pf$i$i$sroa$4$1;$Pf$i$i$sroa$5$2$ph = $Pf$i$i$sroa$5$1;$Pf$i$i$sroa$6$sroa$0$2$ph = $Pf$i$i$sroa$6$sroa$0$1;$Pf$i$i$sroa$6$sroa$4$2$ph = $Pf$i$i$sroa$6$sroa$4$1;$Pf$i$i$sroa$6$sroa$5$2$ph = $Pf$i$i$sroa$6$sroa$5$1;$Pf$i$i$sroa$8$sroa$0$2$ph = $Pf$i$i$sroa$8$sroa$0$1;$Pf$i$i$sroa$8$sroa$4$2$ph = $Pf$i$i$sroa$8$sroa$4$1;$Pf$i$i$sroa$8$sroa$5$2$ph = $Pf$i$i$sroa$8$sroa$5$1;
    } else {
     $565 = +HEAPF32[((39880 + 4|0))>>2];
     $566 = $565 * 0.75;
     HEAPF32[((39880 + 4|0))>>2] = $566;
     _memcpy(($Temp$i$i|0),(((39880 + 60|0))|0),580)|0;
     $567 = HEAP32[((39880 + 8|0))>>2]|0;
     $568 = ($399|0)>(2);
     $569 = $567 >>> 16;
     if ($568) {
      _memset(($DataBuff$i$i|0),0,960)|0;
      _memset(($Temp$i$i|0),0,1540)|0;
      $Pf$i$i$sroa$0$2$ph = $Pf$i$i$sroa$0$0;$Pf$i$i$sroa$10$sroa$0$2$ph = $Pf$i$i$sroa$10$sroa$0$0;$Pf$i$i$sroa$10$sroa$4$2$ph = $Pf$i$i$sroa$10$sroa$4$0;$Pf$i$i$sroa$10$sroa$5$2$ph = $Pf$i$i$sroa$10$sroa$5$0;$Pf$i$i$sroa$4$2$ph = $Pf$i$i$sroa$4$0;$Pf$i$i$sroa$5$2$ph = $Pf$i$i$sroa$5$0;$Pf$i$i$sroa$6$sroa$0$2$ph = $Pf$i$i$sroa$6$sroa$0$0;$Pf$i$i$sroa$6$sroa$4$2$ph = $Pf$i$i$sroa$6$sroa$4$0;$Pf$i$i$sroa$6$sroa$5$2$ph = $Pf$i$i$sroa$6$sroa$5$0;$Pf$i$i$sroa$8$sroa$0$2$ph = $Pf$i$i$sroa$8$sroa$0$0;$Pf$i$i$sroa$8$sroa$4$2$ph = $Pf$i$i$sroa$8$sroa$4$0;$Pf$i$i$sroa$8$sroa$5$2$ph = $Pf$i$i$sroa$8$sroa$5$0;
      break;
     }
     $570 = $567&65535;
     $571 = ($570<<16>>16)==(0);
     if ($571) {
      $586 = $569;$i$48$i$i$i = 0;
      while(1) {
       $sext130 = $586 << 16;
       $587 = $sext130 >> 16;
       $588 = ($587*521)|0;
       $589 = (($588) + 259)|0;
       $590 = $589&65535;
       $591 = (+($590<<16>>16));
       $592 = $591 * $566;
       $593 = $592 * 3.0517578125E-5;
       $594 = (($DataBuff$i$i) + ($i$48$i$i$i<<2)|0);
       HEAPF32[$594>>2] = $593;
       $595 = (($i$48$i$i$i) + 1)|0;
       $exitcond$i20$i$i = ($595|0)==(240);
       if ($exitcond$i20$i$i) {
        break;
       } else {
        $586 = $589;$i$48$i$i$i = $595;
       }
      }
      HEAP16[((39880 + 10|0))>>1] = $590;
      _memset(($Temp$i$i|0),0,1540)|0;
      $Pf$i$i$sroa$0$2$ph = $Pf$i$i$sroa$0$0;$Pf$i$i$sroa$10$sroa$0$2$ph = $Pf$i$i$sroa$10$sroa$0$0;$Pf$i$i$sroa$10$sroa$4$2$ph = $Pf$i$i$sroa$10$sroa$4$0;$Pf$i$i$sroa$10$sroa$5$2$ph = $Pf$i$i$sroa$10$sroa$5$0;$Pf$i$i$sroa$4$2$ph = $Pf$i$i$sroa$4$0;$Pf$i$i$sroa$5$2$ph = $Pf$i$i$sroa$5$0;$Pf$i$i$sroa$6$sroa$0$2$ph = $Pf$i$i$sroa$6$sroa$0$0;$Pf$i$i$sroa$6$sroa$4$2$ph = $Pf$i$i$sroa$6$sroa$4$0;$Pf$i$i$sroa$6$sroa$5$2$ph = $Pf$i$i$sroa$6$sroa$5$0;$Pf$i$i$sroa$8$sroa$0$2$ph = $Pf$i$i$sroa$8$sroa$0$0;$Pf$i$i$sroa$8$sroa$4$2$ph = $Pf$i$i$sroa$8$sroa$4$0;$Pf$i$i$sroa$8$sroa$5$2$ph = $Pf$i$i$sroa$8$sroa$5$0;
      break;
     }
     $sext129 = $567 << 16;
     $572 = $sext129 >> 16;
     $573 = (145 - ($572))|0;
     $i$213$i$i$i = 0;
     while(1) {
      $574 = (($573) + ($i$213$i$i$i))|0;
      $575 = (($Temp$i$i) + ($574<<2)|0);
      $576 = +HEAPF32[$575>>2];
      $577 = (($i$213$i$i$i) + 145)|0;
      $578 = (($Temp$i$i) + ($577<<2)|0);
      HEAPF32[$578>>2] = $576;
      $579 = (($i$213$i$i$i) + 1)|0;
      $exitcond17$i$i$i = ($579|0)==(240);
      if ($exitcond17$i$i$i) {
       $i$311$i$i$i = 0;
       break;
      } else {
       $i$213$i$i$i = $579;
      }
     }
     while(1) {
      $580 = (($i$311$i$i$i) + 145)|0;
      $581 = (($Temp$i$i) + ($580<<2)|0);
      $582 = +HEAPF32[$581>>2];
      $583 = $582 * 0.75;
      HEAPF32[$581>>2] = $583;
      $584 = (($DataBuff$i$i) + ($i$311$i$i$i<<2)|0);
      HEAPF32[$584>>2] = $583;
      $585 = (($i$311$i$i$i) + 1)|0;
      $exitcond16$i$i$i = ($585|0)==(240);
      if ($exitcond16$i$i$i) {
       $Pf$i$i$sroa$0$2$ph = $Pf$i$i$sroa$0$0;$Pf$i$i$sroa$10$sroa$0$2$ph = $Pf$i$i$sroa$10$sroa$0$0;$Pf$i$i$sroa$10$sroa$4$2$ph = $Pf$i$i$sroa$10$sroa$4$0;$Pf$i$i$sroa$10$sroa$5$2$ph = $Pf$i$i$sroa$10$sroa$5$0;$Pf$i$i$sroa$4$2$ph = $Pf$i$i$sroa$4$0;$Pf$i$i$sroa$5$2$ph = $Pf$i$i$sroa$5$0;$Pf$i$i$sroa$6$sroa$0$2$ph = $Pf$i$i$sroa$6$sroa$0$0;$Pf$i$i$sroa$6$sroa$4$2$ph = $Pf$i$i$sroa$6$sroa$4$0;$Pf$i$i$sroa$6$sroa$5$2$ph = $Pf$i$i$sroa$6$sroa$5$0;$Pf$i$i$sroa$8$sroa$0$2$ph = $Pf$i$i$sroa$8$sroa$0$0;$Pf$i$i$sroa$8$sroa$4$2$ph = $Pf$i$i$sroa$8$sroa$4$0;$Pf$i$i$sroa$8$sroa$5$2$ph = $Pf$i$i$sroa$8$sroa$5$0;
       break;
      } else {
       $i$311$i$i$i = $585;
      }
     }
    }
   } while(0);
   $j$58$i$i = 0;
   while(1) {
    $596 = (($j$58$i$i) + 240)|0;
    $597 = (($Temp$i$i) + ($596<<2)|0);
    $598 = +HEAPF32[$597>>2];
    $599 = $598;
    $600 = $599 < 1.0000000000000001E-18;
    $601 = $599 > -1.0000000000000001E-18;
    $or$cond$i$i = $600 & $601;
    $602 = ((39880 + ($j$58$i$i<<2)|0) + 60|0);
    $$$i$i = $or$cond$i$i ? 0.0 : $598;
    HEAPF32[$602>>2] = $$$i$i;
    $603 = (($j$58$i$i) + 1)|0;
    $exitcond31$i$i = ($603|0)==(145);
    if ($exitcond31$i$i) {
     break;
    } else {
     $j$58$i$i = $603;
    }
   }
   HEAP16[((40640 + 52|0))>>1] = 12345;
   $Ftyp$i$i$6 = 1;$Pf$i$i$sroa$0$3 = $Pf$i$i$sroa$0$2$ph;$Pf$i$i$sroa$10$sroa$0$3 = $Pf$i$i$sroa$10$sroa$0$2$ph;$Pf$i$i$sroa$10$sroa$4$3 = $Pf$i$i$sroa$10$sroa$4$2$ph;$Pf$i$i$sroa$10$sroa$5$3 = $Pf$i$i$sroa$10$sroa$5$2$ph;$Pf$i$i$sroa$4$3 = $Pf$i$i$sroa$4$2$ph;$Pf$i$i$sroa$5$3 = $Pf$i$i$sroa$5$2$ph;$Pf$i$i$sroa$6$sroa$0$3 = $Pf$i$i$sroa$6$sroa$0$2$ph;$Pf$i$i$sroa$6$sroa$4$3 = $Pf$i$i$sroa$6$sroa$4$2$ph;$Pf$i$i$sroa$6$sroa$5$3 = $Pf$i$i$sroa$6$sroa$5$2$ph;$Pf$i$i$sroa$8$sroa$0$3 = $Pf$i$i$sroa$8$sroa$0$2$ph;$Pf$i$i$sroa$8$sroa$4$3 = $Pf$i$i$sroa$8$sroa$4$2$ph;$Pf$i$i$sroa$8$sroa$5$3 = $Pf$i$i$sroa$8$sroa$5$2$ph;
  }
  if ((label|0) == 77) {
   label = 0;
   HEAPF32[40640>>2] = $storemerge$i$i$i;
   _Calc_Exc_Rand($storemerge$i$i$i,((39880 + 60|0)),$DataBuff$i$i,((40640 + 52|0)),$Line$i$i,39864);
   _Lsp_Int($QntLpc$i$i,((40640 + 8|0)),((39880 + 20|0)));
   $385 = +HEAPF32[((40640 + 8|0))>>2];
   HEAPF32[((39880 + 20|0))>>2] = $385;
   $386 = +HEAPF32[((40640 + 12|0))>>2];
   HEAPF32[((39880 + 24|0))>>2] = $386;
   $387 = +HEAPF32[((40640 + 16|0))>>2];
   HEAPF32[((39880 + 28|0))>>2] = $387;
   $388 = +HEAPF32[((40640 + 20|0))>>2];
   HEAPF32[((39880 + 32|0))>>2] = $388;
   $389 = +HEAPF32[((40640 + 24|0))>>2];
   HEAPF32[((39880 + 36|0))>>2] = $389;
   $390 = +HEAPF32[((40640 + 28|0))>>2];
   HEAPF32[((39880 + 40|0))>>2] = $390;
   $391 = +HEAPF32[((40640 + 32|0))>>2];
   HEAPF32[((39880 + 44|0))>>2] = $391;
   $392 = +HEAPF32[((40640 + 36|0))>>2];
   HEAPF32[((39880 + 48|0))>>2] = $392;
   $393 = +HEAPF32[((40640 + 40|0))>>2];
   HEAPF32[((39880 + 52|0))>>2] = $393;
   $394 = +HEAPF32[((40640 + 44|0))>>2];
   HEAPF32[((39880 + 56|0))>>2] = $394;
   $Ftyp$i$i$6 = $Ftyp$i$i$4;$Pf$i$i$sroa$0$3 = $Pf$i$i$sroa$0$0;$Pf$i$i$sroa$10$sroa$0$3 = $Pf$i$i$sroa$10$sroa$0$0;$Pf$i$i$sroa$10$sroa$4$3 = $Pf$i$i$sroa$10$sroa$4$0;$Pf$i$i$sroa$10$sroa$5$3 = $Pf$i$i$sroa$10$sroa$5$0;$Pf$i$i$sroa$4$3 = $Pf$i$i$sroa$4$0;$Pf$i$i$sroa$5$3 = $Pf$i$i$sroa$5$0;$Pf$i$i$sroa$6$sroa$0$3 = $Pf$i$i$sroa$6$sroa$0$0;$Pf$i$i$sroa$6$sroa$4$3 = $Pf$i$i$sroa$6$sroa$4$0;$Pf$i$i$sroa$6$sroa$5$3 = $Pf$i$i$sroa$6$sroa$5$0;$Pf$i$i$sroa$8$sroa$0$3 = $Pf$i$i$sroa$8$sroa$0$0;$Pf$i$i$sroa$8$sroa$4$3 = $Pf$i$i$sroa$8$sroa$4$0;$Pf$i$i$sroa$8$sroa$5$3 = $Pf$i$i$sroa$8$sroa$5$0;
  }
  HEAP16[((40640 + 4|0))>>1] = $Ftyp$i$i$6;
  $604 = +HEAPF32[$QntLpc$i$i>>2];
  $605 = +HEAPF32[$27>>2];
  $606 = +HEAPF32[$28>>2];
  $607 = +HEAPF32[$29>>2];
  $608 = +HEAPF32[$30>>2];
  $609 = +HEAPF32[$31>>2];
  $610 = +HEAPF32[$32>>2];
  $611 = +HEAPF32[$33>>2];
  $612 = +HEAPF32[$34>>2];
  $613 = +HEAPF32[$35>>2];
  $$promoted53 = +HEAPF32[((39880 + 640|0))>>2];
  $$promoted54 = +HEAPF32[((39880 + 644|0))>>2];
  $$promoted55 = +HEAPF32[((39880 + 648|0))>>2];
  $$promoted56 = +HEAPF32[((39880 + 652|0))>>2];
  $$promoted57 = +HEAPF32[((39880 + 656|0))>>2];
  $$promoted58 = +HEAPF32[((39880 + 660|0))>>2];
  $$promoted59 = +HEAPF32[((39880 + 664|0))>>2];
  $$promoted60 = +HEAPF32[((39880 + 668|0))>>2];
  $$promoted61 = +HEAPF32[((39880 + 672|0))>>2];
  $$promoted62 = +HEAPF32[((39880 + 676|0))>>2];
  $617 = $$promoted53;$619 = $$promoted54;$622 = $$promoted55;$625 = $$promoted56;$628 = $$promoted57;$631 = $$promoted58;$634 = $$promoted59;$637 = $$promoted60;$640 = $$promoted61;$643 = $$promoted62;$i$02$i21$i$i = 0;
  while(1) {
   $614 = (($DataBuff$i$i) + ($i$02$i21$i$i<<2)|0);
   $615 = +HEAPF32[$614>>2];
   $616 = $604 * $617;
   $618 = $605 * $619;
   $620 = $616 + $618;
   $621 = $606 * $622;
   $623 = $620 + $621;
   $624 = $607 * $625;
   $626 = $623 + $624;
   $627 = $608 * $628;
   $629 = $626 + $627;
   $630 = $609 * $631;
   $632 = $629 + $630;
   $633 = $610 * $634;
   $635 = $632 + $633;
   $636 = $611 * $637;
   $638 = $635 + $636;
   $639 = $612 * $640;
   $641 = $638 + $639;
   $642 = $613 * $643;
   $644 = $641 + $642;
   $645 = $615 + $644;
   HEAPF32[$614>>2] = $645;
   $646 = (($i$02$i21$i$i) + 1)|0;
   $exitcond$i22$i$i = ($646|0)==(60);
   if ($exitcond$i22$i$i) {
    break;
   } else {
    $643$phi = $640;$640$phi = $637;$637$phi = $634;$634$phi = $631;$631$phi = $628;$628$phi = $625;$625$phi = $622;$622$phi = $619;$619$phi = $617;$617 = $645;$i$02$i21$i$i = $646;$643 = $643$phi;$640 = $640$phi;$637 = $637$phi;$634 = $634$phi;$631 = $631$phi;$628 = $628$phi;$625 = $625$phi;$622 = $622$phi;$619 = $619$phi;
   }
  }
  HEAPF32[((39880 + 640|0))>>2] = $645;
  HEAPF32[((39880 + 644|0))>>2] = $617;
  HEAPF32[((39880 + 648|0))>>2] = $619;
  HEAPF32[((39880 + 652|0))>>2] = $622;
  HEAPF32[((39880 + 656|0))>>2] = $625;
  HEAPF32[((39880 + 660|0))>>2] = $628;
  HEAPF32[((39880 + 664|0))>>2] = $631;
  HEAPF32[((39880 + 668|0))>>2] = $634;
  HEAPF32[((39880 + 672|0))>>2] = $637;
  HEAPF32[((39880 + 676|0))>>2] = $640;
  $647 = HEAP32[((39864 + 12|0))>>2]|0;
  $648 = ($647|0)==(0);
  if ($648) {
   $$promoted64 = $645;$$promoted65 = $617;$$promoted66 = $619;$$promoted67 = $622;$$promoted68 = $625;$$promoted69 = $628;$$promoted70 = $631;$$promoted71 = $634;$$promoted72 = $637;$$promoted73 = $640;
  } else {
   $649 = (+_Spf($DataBuff$i$i,$QntLpc$i$i));
   $i$01$i$i30$i$i = 0;$sum$02$i$i29$i$i = 0.0;
   while(1) {
    $650 = (($DataBuff$i$i) + ($i$01$i$i30$i$i<<2)|0);
    $651 = +HEAPF32[$650>>2];
    $652 = $651 * $651;
    $653 = (($i$01$i$i30$i$i) + 1)|0;
    $654 = (($DataBuff$i$i) + ($653<<2)|0);
    $655 = +HEAPF32[$654>>2];
    $656 = $655 * $655;
    $657 = $652 + $656;
    $658 = (($i$01$i$i30$i$i) + 2)|0;
    $659 = (($DataBuff$i$i) + ($658<<2)|0);
    $660 = +HEAPF32[$659>>2];
    $661 = $660 * $660;
    $662 = $657 + $661;
    $663 = $sum$02$i$i29$i$i + $662;
    $664 = (($i$01$i$i30$i$i) + 3)|0;
    $665 = ($664|0)<(60);
    if ($665) {
     $i$01$i$i30$i$i = $664;$sum$02$i$i29$i$i = $663;
    } else {
     break;
    }
   }
   $666 = $663 > 1.1754943508222875E-38;
   if ($666) {
    $667 = $649 / $663;
    $668 = (+Math_sqrt((+$667)));
    $669 = $668 * 0.0625;
    $SfGain$0$i33$i$i = $669;
   } else {
    $SfGain$0$i33$i$i = 0.0625;
   }
   $$promoted63 = +HEAPF32[((39880 + 16|0))>>2];
   $671 = $$promoted63;$i$01$i34$i$i = 0;
   while(1) {
    $670 = $671 * 0.9375;
    $672 = $SfGain$0$i33$i$i + $670;
    $673 = (($DataBuff$i$i) + ($i$01$i34$i$i<<2)|0);
    $674 = +HEAPF32[$673>>2];
    $675 = $674 * 1.0625;
    $676 = $675 * $672;
    HEAPF32[$673>>2] = $676;
    $677 = (($i$01$i34$i$i) + 1)|0;
    $exitcond$i35$i$i = ($677|0)==(60);
    if ($exitcond$i35$i$i) {
     break;
    } else {
     $671 = $672;$i$01$i34$i$i = $677;
    }
   }
   HEAPF32[((39880 + 16|0))>>2] = $672;
   $$promoted64$pre = +HEAPF32[((39880 + 640|0))>>2];
   $$promoted65$pre = +HEAPF32[((39880 + 644|0))>>2];
   $$promoted66$pre = +HEAPF32[((39880 + 648|0))>>2];
   $$promoted67$pre = +HEAPF32[((39880 + 652|0))>>2];
   $$promoted68$pre = +HEAPF32[((39880 + 656|0))>>2];
   $$promoted69$pre = +HEAPF32[((39880 + 660|0))>>2];
   $$promoted70$pre = +HEAPF32[((39880 + 664|0))>>2];
   $$promoted71$pre = +HEAPF32[((39880 + 668|0))>>2];
   $$promoted72$pre = +HEAPF32[((39880 + 672|0))>>2];
   $$promoted73$pre = +HEAPF32[((39880 + 676|0))>>2];
   $$promoted64 = $$promoted64$pre;$$promoted65 = $$promoted65$pre;$$promoted66 = $$promoted66$pre;$$promoted67 = $$promoted67$pre;$$promoted68 = $$promoted68$pre;$$promoted69 = $$promoted69$pre;$$promoted70 = $$promoted70$pre;$$promoted71 = $$promoted71$pre;$$promoted72 = $$promoted72$pre;$$promoted73 = $$promoted73$pre;
  }
  $678 = +HEAPF32[$37>>2];
  $679 = +HEAPF32[$38>>2];
  $680 = +HEAPF32[$39>>2];
  $681 = +HEAPF32[$40>>2];
  $682 = +HEAPF32[$41>>2];
  $683 = +HEAPF32[$42>>2];
  $684 = +HEAPF32[$43>>2];
  $685 = +HEAPF32[$44>>2];
  $686 = +HEAPF32[$45>>2];
  $687 = +HEAPF32[$46>>2];
  $691 = $$promoted64;$693 = $$promoted65;$696 = $$promoted66;$699 = $$promoted67;$702 = $$promoted68;$705 = $$promoted69;$708 = $$promoted70;$711 = $$promoted71;$714 = $$promoted72;$717 = $$promoted73;$i$02$i37$i$i = 0;
  while(1) {
   $$sum = (($i$02$i37$i$i) + 60)|0;
   $688 = (($DataBuff$i$i) + ($$sum<<2)|0);
   $689 = +HEAPF32[$688>>2];
   $690 = $678 * $691;
   $692 = $679 * $693;
   $694 = $690 + $692;
   $695 = $680 * $696;
   $697 = $694 + $695;
   $698 = $681 * $699;
   $700 = $697 + $698;
   $701 = $682 * $702;
   $703 = $700 + $701;
   $704 = $683 * $705;
   $706 = $703 + $704;
   $707 = $684 * $708;
   $709 = $706 + $707;
   $710 = $685 * $711;
   $712 = $709 + $710;
   $713 = $686 * $714;
   $715 = $712 + $713;
   $716 = $687 * $717;
   $718 = $715 + $716;
   $719 = $689 + $718;
   HEAPF32[$688>>2] = $719;
   $720 = (($i$02$i37$i$i) + 1)|0;
   $exitcond$i38$i$i = ($720|0)==(60);
   if ($exitcond$i38$i$i) {
    break;
   } else {
    $717$phi = $714;$714$phi = $711;$711$phi = $708;$708$phi = $705;$705$phi = $702;$702$phi = $699;$699$phi = $696;$696$phi = $693;$693$phi = $691;$691 = $719;$i$02$i37$i$i = $720;$717 = $717$phi;$714 = $714$phi;$711 = $711$phi;$708 = $708$phi;$705 = $705$phi;$702 = $702$phi;$699 = $699$phi;$696 = $696$phi;$693 = $693$phi;
   }
  }
  HEAPF32[((39880 + 640|0))>>2] = $719;
  HEAPF32[((39880 + 644|0))>>2] = $691;
  HEAPF32[((39880 + 648|0))>>2] = $693;
  HEAPF32[((39880 + 652|0))>>2] = $696;
  HEAPF32[((39880 + 656|0))>>2] = $699;
  HEAPF32[((39880 + 660|0))>>2] = $702;
  HEAPF32[((39880 + 664|0))>>2] = $705;
  HEAPF32[((39880 + 668|0))>>2] = $708;
  HEAPF32[((39880 + 672|0))>>2] = $711;
  HEAPF32[((39880 + 676|0))>>2] = $714;
  $721 = HEAP32[((39864 + 12|0))>>2]|0;
  $722 = ($721|0)==(0);
  if ($722) {
   $$promoted75 = $719;$$promoted76 = $691;$$promoted77 = $693;$$promoted78 = $696;$$promoted79 = $699;$$promoted80 = $702;$$promoted81 = $705;$$promoted82 = $708;$$promoted83 = $711;$$promoted84 = $714;
  } else {
   $738 = (+_Spf($36,$37));
   $i$01$i$i41$i$i = 0;$sum$02$i$i40$i$i = 0.0;
   while(1) {
    $$sum1 = (($i$01$i$i41$i$i) + 60)|0;
    $739 = (($DataBuff$i$i) + ($$sum1<<2)|0);
    $740 = +HEAPF32[$739>>2];
    $741 = $740 * $740;
    $$sum3 = (($i$01$i$i41$i$i) + 61)|0;
    $742 = (($DataBuff$i$i) + ($$sum3<<2)|0);
    $743 = +HEAPF32[$742>>2];
    $744 = $743 * $743;
    $745 = $741 + $744;
    $$sum5 = (($i$01$i$i41$i$i) + 62)|0;
    $746 = (($DataBuff$i$i) + ($$sum5<<2)|0);
    $747 = +HEAPF32[$746>>2];
    $748 = $747 * $747;
    $749 = $745 + $748;
    $750 = $sum$02$i$i40$i$i + $749;
    $751 = (($i$01$i$i41$i$i) + 3)|0;
    $752 = ($751|0)<(60);
    if ($752) {
     $i$01$i$i41$i$i = $751;$sum$02$i$i40$i$i = $750;
    } else {
     break;
    }
   }
   $753 = $750 > 1.1754943508222875E-38;
   if ($753) {
    $754 = $738 / $750;
    $755 = (+Math_sqrt((+$754)));
    $756 = $755 * 0.0625;
    $SfGain$0$i44$i$i = $756;
   } else {
    $SfGain$0$i44$i$i = 0.0625;
   }
   $$promoted74 = +HEAPF32[((39880 + 16|0))>>2];
   $758 = $$promoted74;$i$01$i45$i$i = 0;
   while(1) {
    $757 = $758 * 0.9375;
    $759 = $SfGain$0$i44$i$i + $757;
    $$sum7 = (($i$01$i45$i$i) + 60)|0;
    $760 = (($DataBuff$i$i) + ($$sum7<<2)|0);
    $761 = +HEAPF32[$760>>2];
    $762 = $761 * 1.0625;
    $763 = $762 * $759;
    HEAPF32[$760>>2] = $763;
    $764 = (($i$01$i45$i$i) + 1)|0;
    $exitcond$i46$i$i = ($764|0)==(60);
    if ($exitcond$i46$i$i) {
     break;
    } else {
     $758 = $759;$i$01$i45$i$i = $764;
    }
   }
   HEAPF32[((39880 + 16|0))>>2] = $759;
   $$promoted75$pre = +HEAPF32[((39880 + 640|0))>>2];
   $$promoted76$pre = +HEAPF32[((39880 + 644|0))>>2];
   $$promoted77$pre = +HEAPF32[((39880 + 648|0))>>2];
   $$promoted78$pre = +HEAPF32[((39880 + 652|0))>>2];
   $$promoted79$pre = +HEAPF32[((39880 + 656|0))>>2];
   $$promoted80$pre = +HEAPF32[((39880 + 660|0))>>2];
   $$promoted81$pre = +HEAPF32[((39880 + 664|0))>>2];
   $$promoted82$pre = +HEAPF32[((39880 + 668|0))>>2];
   $$promoted83$pre = +HEAPF32[((39880 + 672|0))>>2];
   $$promoted84$pre = +HEAPF32[((39880 + 676|0))>>2];
   $$promoted75 = $$promoted75$pre;$$promoted76 = $$promoted76$pre;$$promoted77 = $$promoted77$pre;$$promoted78 = $$promoted78$pre;$$promoted79 = $$promoted79$pre;$$promoted80 = $$promoted80$pre;$$promoted81 = $$promoted81$pre;$$promoted82 = $$promoted82$pre;$$promoted83 = $$promoted83$pre;$$promoted84 = $$promoted84$pre;
  }
  $765 = +HEAPF32[$48>>2];
  $766 = +HEAPF32[$49>>2];
  $767 = +HEAPF32[$50>>2];
  $768 = +HEAPF32[$51>>2];
  $769 = +HEAPF32[$52>>2];
  $770 = +HEAPF32[$53>>2];
  $771 = +HEAPF32[$54>>2];
  $772 = +HEAPF32[$55>>2];
  $773 = +HEAPF32[$56>>2];
  $774 = +HEAPF32[$57>>2];
  $778 = $$promoted75;$780 = $$promoted76;$783 = $$promoted77;$786 = $$promoted78;$789 = $$promoted79;$792 = $$promoted80;$795 = $$promoted81;$798 = $$promoted82;$801 = $$promoted83;$804 = $$promoted84;$i$02$i48$i$i = 0;
  while(1) {
   $$sum8 = (($i$02$i48$i$i) + 120)|0;
   $775 = (($DataBuff$i$i) + ($$sum8<<2)|0);
   $776 = +HEAPF32[$775>>2];
   $777 = $765 * $778;
   $779 = $766 * $780;
   $781 = $777 + $779;
   $782 = $767 * $783;
   $784 = $781 + $782;
   $785 = $768 * $786;
   $787 = $784 + $785;
   $788 = $769 * $789;
   $790 = $787 + $788;
   $791 = $770 * $792;
   $793 = $790 + $791;
   $794 = $771 * $795;
   $796 = $793 + $794;
   $797 = $772 * $798;
   $799 = $796 + $797;
   $800 = $773 * $801;
   $802 = $799 + $800;
   $803 = $774 * $804;
   $805 = $802 + $803;
   $806 = $776 + $805;
   HEAPF32[$775>>2] = $806;
   $807 = (($i$02$i48$i$i) + 1)|0;
   $exitcond$i49$i$i = ($807|0)==(60);
   if ($exitcond$i49$i$i) {
    break;
   } else {
    $804$phi = $801;$801$phi = $798;$798$phi = $795;$795$phi = $792;$792$phi = $789;$789$phi = $786;$786$phi = $783;$783$phi = $780;$780$phi = $778;$778 = $806;$i$02$i48$i$i = $807;$804 = $804$phi;$801 = $801$phi;$798 = $798$phi;$795 = $795$phi;$792 = $792$phi;$789 = $789$phi;$786 = $786$phi;$783 = $783$phi;$780 = $780$phi;
   }
  }
  HEAPF32[((39880 + 640|0))>>2] = $806;
  HEAPF32[((39880 + 644|0))>>2] = $778;
  HEAPF32[((39880 + 648|0))>>2] = $780;
  HEAPF32[((39880 + 652|0))>>2] = $783;
  HEAPF32[((39880 + 656|0))>>2] = $786;
  HEAPF32[((39880 + 660|0))>>2] = $789;
  HEAPF32[((39880 + 664|0))>>2] = $792;
  HEAPF32[((39880 + 668|0))>>2] = $795;
  HEAPF32[((39880 + 672|0))>>2] = $798;
  HEAPF32[((39880 + 676|0))>>2] = $801;
  $808 = HEAP32[((39864 + 12|0))>>2]|0;
  $809 = ($808|0)==(0);
  if ($809) {
   $$promoted86 = $806;$$promoted87 = $778;$$promoted88 = $780;$$promoted89 = $783;$$promoted90 = $786;$$promoted91 = $789;$$promoted92 = $792;$$promoted93 = $795;$$promoted94 = $798;$$promoted95 = $801;
  } else {
   $810 = (+_Spf($47,$48));
   $i$01$i$i55$i$i = 0;$sum$02$i$i54$i$i = 0.0;
   while(1) {
    $$sum9 = (($i$01$i$i55$i$i) + 120)|0;
    $811 = (($DataBuff$i$i) + ($$sum9<<2)|0);
    $812 = +HEAPF32[$811>>2];
    $813 = $812 * $812;
    $$sum11 = (($i$01$i$i55$i$i) + 121)|0;
    $814 = (($DataBuff$i$i) + ($$sum11<<2)|0);
    $815 = +HEAPF32[$814>>2];
    $816 = $815 * $815;
    $817 = $813 + $816;
    $$sum13 = (($i$01$i$i55$i$i) + 122)|0;
    $818 = (($DataBuff$i$i) + ($$sum13<<2)|0);
    $819 = +HEAPF32[$818>>2];
    $820 = $819 * $819;
    $821 = $817 + $820;
    $822 = $sum$02$i$i54$i$i + $821;
    $823 = (($i$01$i$i55$i$i) + 3)|0;
    $824 = ($823|0)<(60);
    if ($824) {
     $i$01$i$i55$i$i = $823;$sum$02$i$i54$i$i = $822;
    } else {
     break;
    }
   }
   $825 = $822 > 1.1754943508222875E-38;
   if ($825) {
    $826 = $810 / $822;
    $827 = (+Math_sqrt((+$826)));
    $828 = $827 * 0.0625;
    $SfGain$0$i58$i$i = $828;
   } else {
    $SfGain$0$i58$i$i = 0.0625;
   }
   $$promoted85 = +HEAPF32[((39880 + 16|0))>>2];
   $830 = $$promoted85;$i$01$i59$i$i = 0;
   while(1) {
    $829 = $830 * 0.9375;
    $831 = $SfGain$0$i58$i$i + $829;
    $$sum15 = (($i$01$i59$i$i) + 120)|0;
    $832 = (($DataBuff$i$i) + ($$sum15<<2)|0);
    $833 = +HEAPF32[$832>>2];
    $834 = $833 * 1.0625;
    $835 = $834 * $831;
    HEAPF32[$832>>2] = $835;
    $836 = (($i$01$i59$i$i) + 1)|0;
    $exitcond$i60$i$i = ($836|0)==(60);
    if ($exitcond$i60$i$i) {
     break;
    } else {
     $830 = $831;$i$01$i59$i$i = $836;
    }
   }
   HEAPF32[((39880 + 16|0))>>2] = $831;
   $$promoted86$pre = +HEAPF32[((39880 + 640|0))>>2];
   $$promoted87$pre = +HEAPF32[((39880 + 644|0))>>2];
   $$promoted88$pre = +HEAPF32[((39880 + 648|0))>>2];
   $$promoted89$pre = +HEAPF32[((39880 + 652|0))>>2];
   $$promoted90$pre = +HEAPF32[((39880 + 656|0))>>2];
   $$promoted91$pre = +HEAPF32[((39880 + 660|0))>>2];
   $$promoted92$pre = +HEAPF32[((39880 + 664|0))>>2];
   $$promoted93$pre = +HEAPF32[((39880 + 668|0))>>2];
   $$promoted94$pre = +HEAPF32[((39880 + 672|0))>>2];
   $$promoted95$pre = +HEAPF32[((39880 + 676|0))>>2];
   $$promoted86 = $$promoted86$pre;$$promoted87 = $$promoted87$pre;$$promoted88 = $$promoted88$pre;$$promoted89 = $$promoted89$pre;$$promoted90 = $$promoted90$pre;$$promoted91 = $$promoted91$pre;$$promoted92 = $$promoted92$pre;$$promoted93 = $$promoted93$pre;$$promoted94 = $$promoted94$pre;$$promoted95 = $$promoted95$pre;
  }
  $837 = +HEAPF32[$59>>2];
  $838 = +HEAPF32[$60>>2];
  $839 = +HEAPF32[$61>>2];
  $840 = +HEAPF32[$62>>2];
  $841 = +HEAPF32[$63>>2];
  $842 = +HEAPF32[$64>>2];
  $843 = +HEAPF32[$65>>2];
  $844 = +HEAPF32[$66>>2];
  $845 = +HEAPF32[$67>>2];
  $846 = +HEAPF32[$68>>2];
  $850 = $$promoted86;$852 = $$promoted87;$855 = $$promoted88;$858 = $$promoted89;$861 = $$promoted90;$864 = $$promoted91;$867 = $$promoted92;$870 = $$promoted93;$873 = $$promoted94;$876 = $$promoted95;$i$02$i51$i$i = 0;
  while(1) {
   $$sum16 = (($i$02$i51$i$i) + 180)|0;
   $847 = (($DataBuff$i$i) + ($$sum16<<2)|0);
   $848 = +HEAPF32[$847>>2];
   $849 = $837 * $850;
   $851 = $838 * $852;
   $853 = $849 + $851;
   $854 = $839 * $855;
   $856 = $853 + $854;
   $857 = $840 * $858;
   $859 = $856 + $857;
   $860 = $841 * $861;
   $862 = $859 + $860;
   $863 = $842 * $864;
   $865 = $862 + $863;
   $866 = $843 * $867;
   $868 = $865 + $866;
   $869 = $844 * $870;
   $871 = $868 + $869;
   $872 = $845 * $873;
   $874 = $871 + $872;
   $875 = $846 * $876;
   $877 = $874 + $875;
   $878 = $848 + $877;
   HEAPF32[$847>>2] = $878;
   $879 = (($i$02$i51$i$i) + 1)|0;
   $exitcond$i52$i$i = ($879|0)==(60);
   if ($exitcond$i52$i$i) {
    break;
   } else {
    $876$phi = $873;$873$phi = $870;$870$phi = $867;$867$phi = $864;$864$phi = $861;$861$phi = $858;$858$phi = $855;$855$phi = $852;$852$phi = $850;$850 = $878;$i$02$i51$i$i = $879;$876 = $876$phi;$873 = $873$phi;$870 = $870$phi;$867 = $867$phi;$864 = $864$phi;$861 = $861$phi;$858 = $858$phi;$855 = $855$phi;$852 = $852$phi;
   }
  }
  HEAPF32[((39880 + 640|0))>>2] = $878;
  HEAPF32[((39880 + 644|0))>>2] = $850;
  HEAPF32[((39880 + 648|0))>>2] = $852;
  HEAPF32[((39880 + 652|0))>>2] = $855;
  HEAPF32[((39880 + 656|0))>>2] = $858;
  HEAPF32[((39880 + 660|0))>>2] = $861;
  HEAPF32[((39880 + 664|0))>>2] = $864;
  HEAPF32[((39880 + 668|0))>>2] = $867;
  HEAPF32[((39880 + 672|0))>>2] = $870;
  HEAPF32[((39880 + 676|0))>>2] = $873;
  $880 = HEAP32[((39864 + 12|0))>>2]|0;
  $881 = ($880|0)==(0);
  if ($881) {
   $i$74$i$i = 0;
  } else {
   $882 = (+_Spf($58,$59));
   $i$01$i$i24$i$i = 0;$sum$02$i$i23$i$i = 0.0;
   while(1) {
    $$sum17 = (($i$01$i$i24$i$i) + 180)|0;
    $883 = (($DataBuff$i$i) + ($$sum17<<2)|0);
    $884 = +HEAPF32[$883>>2];
    $885 = $884 * $884;
    $$sum19 = (($i$01$i$i24$i$i) + 181)|0;
    $886 = (($DataBuff$i$i) + ($$sum19<<2)|0);
    $887 = +HEAPF32[$886>>2];
    $888 = $887 * $887;
    $889 = $885 + $888;
    $$sum21 = (($i$01$i$i24$i$i) + 182)|0;
    $890 = (($DataBuff$i$i) + ($$sum21<<2)|0);
    $891 = +HEAPF32[$890>>2];
    $892 = $891 * $891;
    $893 = $889 + $892;
    $894 = $sum$02$i$i23$i$i + $893;
    $895 = (($i$01$i$i24$i$i) + 3)|0;
    $896 = ($895|0)<(60);
    if ($896) {
     $i$01$i$i24$i$i = $895;$sum$02$i$i23$i$i = $894;
    } else {
     break;
    }
   }
   $897 = $894 > 1.1754943508222875E-38;
   if ($897) {
    $898 = $882 / $894;
    $899 = (+Math_sqrt((+$898)));
    $900 = $899 * 0.0625;
    $SfGain$0$i$i$i = $900;
   } else {
    $SfGain$0$i$i$i = 0.0625;
   }
   $$promoted96 = +HEAPF32[((39880 + 16|0))>>2];
   $902 = $$promoted96;$i$01$i27$i$i = 0;
   while(1) {
    $901 = $902 * 0.9375;
    $723 = $SfGain$0$i$i$i + $901;
    $$sum23 = (($i$01$i27$i$i) + 180)|0;
    $903 = (($DataBuff$i$i) + ($$sum23<<2)|0);
    $904 = +HEAPF32[$903>>2];
    $905 = $904 * 1.0625;
    $906 = $905 * $723;
    HEAPF32[$903>>2] = $906;
    $907 = (($i$01$i27$i$i) + 1)|0;
    $exitcond$i28$i$i = ($907|0)==(60);
    if ($exitcond$i28$i$i) {
     break;
    } else {
     $902 = $723;$i$01$i27$i$i = $907;
    }
   }
   HEAPF32[((39880 + 16|0))>>2] = $723;
   $i$74$i$i = 0;
  }
  while(1) {
   $724 = (($DataBuff$i$i) + ($i$74$i$i<<2)|0);
   $725 = +HEAPF32[$724>>2];
   $726 = $725 < -32767.5;
   do {
    if ($726) {
     $727 = (($pOut$03) + ($i$74$i$i<<1)|0);
     HEAP16[$727>>1] = -32768;
    } else {
     $728 = $725 > 32766.5;
     if ($728) {
      $729 = (($pOut$03) + ($i$74$i$i<<1)|0);
      HEAP16[$729>>1] = 32767;
      break;
     }
     $730 = $725 < 0.0;
     if ($730) {
      $731 = $725 + -0.5;
      $732 = (~~(($731)));
      $733 = (($pOut$03) + ($i$74$i$i<<1)|0);
      HEAP16[$733>>1] = $732;
      break;
     } else {
      $734 = $725 + 0.5;
      $735 = (~~(($734)));
      $736 = (($pOut$03) + ($i$74$i$i<<1)|0);
      HEAP16[$736>>1] = $735;
      break;
     }
    }
   } while(0);
   $737 = (($i$74$i$i) + 1)|0;
   $exitcond$i$i = ($737|0)==(240);
   if ($exitcond$i$i) {
    break;
   } else {
    $i$74$i$i = $737;
   }
  }
  $930 = (($pOut$03) + 480|0);
  $931 = (($nOut$01) + 480)|0;
  $932 = (($pIn$02) + ($93)|0);
  $933 = (($93) + ($nLen$04))|0;
  $934 = ($933>>>0)<($nInput>>>0);
  if ($934) {
   $Pf$i$i$sroa$0$0 = $Pf$i$i$sroa$0$3;$Pf$i$i$sroa$10$sroa$0$0 = $Pf$i$i$sroa$10$sroa$0$3;$Pf$i$i$sroa$10$sroa$4$0 = $Pf$i$i$sroa$10$sroa$4$3;$Pf$i$i$sroa$10$sroa$5$0 = $Pf$i$i$sroa$10$sroa$5$3;$Pf$i$i$sroa$4$0 = $Pf$i$i$sroa$4$3;$Pf$i$i$sroa$5$0 = $Pf$i$i$sroa$5$3;$Pf$i$i$sroa$6$sroa$0$0 = $Pf$i$i$sroa$6$sroa$0$3;$Pf$i$i$sroa$6$sroa$4$0 = $Pf$i$i$sroa$6$sroa$4$3;$Pf$i$i$sroa$6$sroa$5$0 = $Pf$i$i$sroa$6$sroa$5$3;$Pf$i$i$sroa$8$sroa$0$0 = $Pf$i$i$sroa$8$sroa$0$3;$Pf$i$i$sroa$8$sroa$4$0 = $Pf$i$i$sroa$8$sroa$4$3;$Pf$i$i$sroa$8$sroa$5$0 = $Pf$i$i$sroa$8$sroa$5$3;$nLen$04 = $933;$nOut$01 = $931;$pIn$02 = $932;$pOut$03 = $930;
  } else {
   $nOut$0$lcssa = $931;
   break;
  }
 }
 STACKTOP = sp;return ($nOut$0$lcssa|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0;
 var $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0;
 var $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0;
 var $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0;
 var $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0;
 var $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0;
 var $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0;
 var $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0;
 var $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0;
 var $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0;
 var $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0;
 var $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0;
 var $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0;
 var $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0;
 var $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0;
 var $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0;
 var $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0;
 var $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0;
 var $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0;
 var $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0;
 var $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0;
 var $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0;
 var $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0;
 var $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0;
 var $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0;
 var $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0;
 var $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0;
 var $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0;
 var $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0;
 var $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0;
 var $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0;
 var $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0;
 var $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0;
 var $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0;
 var $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0;
 var $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0;
 var $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0;
 var $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0;
 var $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0;
 var $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0;
 var $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0;
 var $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0;
 var $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0;
 var $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0;
 var $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0;
 var $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0;
 var $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0;
 var $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0;
 var $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0;
 var $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0;
 var $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0;
 var $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0;
 var $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0;
 var $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0;
 var $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0;
 var $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0;
 var $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0;
 var $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0;
 var $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0;
 var $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$027$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0;
 var $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$026$i = 0, $T$052$i$i = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0;
 var $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0;
 var $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$073$i = 0, $sp$166$i = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0;
 var $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[40696>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((40696 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((40696 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[40696>>2] = $22;
     } else {
      $23 = HEAP32[((40696 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((40696 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((40696 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((40696 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[40696>>2] = $74;
       $88 = $34;
      } else {
       $75 = HEAP32[((40696 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((40696 + 8|0))>>2]|0;
        $88 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[((40696 + 20|0))>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = ((40696 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[40696>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[40696>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((40696 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((40696 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((40696 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((40696 + 8|0))>>2] = $81;
     HEAP32[((40696 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((40696 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((40696 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((40696 + 16|0))>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($5)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = (($v$0$i) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = (($v$0$i) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((40696 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((40696 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((40696 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((40696 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((40696 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((40696 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i) + ($5))|0;
      $224 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i;
      $225 = HEAP32[((40696 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((40696 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((40696 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[40696>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[40696>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((40696 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((40696 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((40696 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((40696 + 8|0))>>2] = $rsize$0$i;
      HEAP32[((40696 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i) + 8|0);
     $mem$0 = $243;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((40696 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((40696 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L126: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
      } else {
       $278 = ($idx$0$i|0)==(31);
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = (25 - ($279))|0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = (($t$0$i14) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$2$i = $286;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = (($t$0$i14) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((40696 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = (($t$230$i) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((40696 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((40696 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = (($R$0$i18) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((40696 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((40696 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((40696 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((40696 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((40696 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((40696 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((40696 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[40696>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[40696>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((40696 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((40696 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((40696 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((40696 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((40696 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((40696 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$027$i = $483;$T$026$i = $475;
           while(1) {
            $491 = $K12$027$i >>> 31;
            $492 = ((($T$026$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             break;
            }
            $485 = $K12$027$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$027$i = $485;$T$026$i = $487;
            }
           }
           $494 = HEAP32[((40696 + 16|0))>>2]|0;
           $495 = ($492>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$492>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$026$i;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L204;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((40696 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((40696 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((40696 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((40696 + 20|0))>>2] = $514;
   HEAP32[((40696 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((40696 + 8|0))>>2] = 0;
   HEAP32[((40696 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  STACKTOP = sp;return ($mem$0|0);
 }
 $526 = HEAP32[((40696 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((40696 + 12|0))>>2] = $528;
  $529 = HEAP32[((40696 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((40696 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  STACKTOP = sp;return ($mem$0|0);
 }
 $536 = HEAP32[41168>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((41168 + 8|0))>>2] = $538;
    HEAP32[((41168 + 4|0))>>2] = $538;
    HEAP32[((41168 + 12|0))>>2] = -1;
    HEAP32[((41168 + 16|0))>>2] = -1;
    HEAP32[((41168 + 20|0))>>2] = 0;
    HEAP32[((40696 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[41168>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((41168 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $552 = HEAP32[((40696 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((40696 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $558 = HEAP32[((40696 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L266: do {
  if ($560) {
   $561 = HEAP32[((40696 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   L268: do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = ((40696 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i|0)==(0|0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[((40696 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$sp$0$i$i>>2]|0;
       $601 = HEAP32[$565>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((41168 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((40696 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((40696 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((41168 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while(0);
   $619 = HEAP32[((40696 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((40696 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while(0);
 if ((label|0) == 198) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label|0) == 201) {
  $632 = HEAP32[((40696 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((40696 + 432|0))>>2] = $633;
  $634 = HEAP32[((40696 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((40696 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((40696 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L308: do {
   if ($637) {
    $638 = HEAP32[((40696 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((40696 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((40696 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((40696 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((40696 + 460|0))>>2] = 0;
    $641 = HEAP32[41168>>2]|0;
    HEAP32[((40696 + 36|0))>>2] = $641;
    HEAP32[((40696 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((40696 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((40696 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((40696 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((40696 + 24|0))>>2] = $654;
    HEAP32[((40696 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((41168 + 16|0))>>2]|0;
    HEAP32[((40696 + 28|0))>>2] = $660;
   } else {
    $sp$073$i = ((40696 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$073$i>>2]|0;
     $662 = (($sp$073$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      label = 213;
      break;
     }
     $666 = (($sp$073$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$073$i = $667;
     }
    }
    if ((label|0) == 213) {
     $669 = (($sp$073$i) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($661>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($663) + ($tsize$244$i))|0;
       HEAP32[$662>>2] = $675;
       $676 = HEAP32[((40696 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((40696 + 24|0))>>2] = $684;
       HEAP32[((40696 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((41168 + 16|0))>>2]|0;
       HEAP32[((40696 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((40696 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((40696 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$166$i = ((40696 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$166$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      label = 223;
      break;
     }
     $696 = (($sp$166$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$166$i = $697;
     }
    }
    if ((label|0) == 223) {
     $699 = (($sp$166$i) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$sp$166$i>>2] = $tbase$245$i;
      $703 = (($sp$166$i) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L335: do {
       if ($729) {
        $730 = HEAP32[((40696 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((40696 + 12|0))>>2] = $731;
        HEAP32[((40696 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((40696 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((40696 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((40696 + 8|0))>>2] = $737;
         HEAP32[((40696 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L342: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((40696 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[40696>>2]|0;
            $764 = $763 & $762;
            HEAP32[40696>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;$RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;$RP$0$i$i = $785;
             }
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if (!($793)) {
               $R$0$i$i = $792;$RP$0$i$i = $791;
               continue;
              }
              $794 = (($R$0$i$i) + 16|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if ($796) {
               break;
              } else {
               $R$0$i$i = $795;$RP$0$i$i = $794;
              }
             }
             $797 = ($RP$0$i$i>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((40696 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((40696 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((40696 + 4|0))>>2] = $807;
             break L342;
            } else {
             $808 = HEAP32[((40696 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L342;
             }
            }
           } while(0);
           $815 = HEAP32[((40696 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((40696 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((40696 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[40696>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[40696>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((40696 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((40696 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((40696 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((40696 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((40696 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((40696 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        L431: do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L431;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          $911 = HEAP32[((40696 + 16|0))>>2]|0;
          $912 = ($909>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$909>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L335;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((40696 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((40696 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($929) + -47)|0;
    $$sum1$i14$i = (($929) + -39)|0;
    $934 = (($926) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($926) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((40696 + 24|0))>>2] = $953;
    HEAP32[((40696 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((41168 + 16|0))>>2]|0;
    HEAP32[((40696 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((40696 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((40696 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((40696 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((40696 + 448|0))+12>>2]|0;
    HEAP32[((40696 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((40696 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((40696 + 460|0))>>2] = 0;
    HEAP32[((40696 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($930>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($930>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((40696 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[40696>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[40696>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((40696 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((40696 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((40696 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((40696 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((40696 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((40696 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     L483: do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L483;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[((40696 + 16|0))>>2]|0;
       $1051 = ($1048>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1048>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L308;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((40696 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((40696 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((40696 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((40696 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((40696 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$058 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0;
 var $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$057 = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((40696 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((40696 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((40696 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((40696 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[40696>>2]|0;
     $36 = $35 & $34;
     HEAP32[40696>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((40696 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((40696 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((40696 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((40696 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((40696 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((40696 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((40696 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((40696 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((40696 + 12|0))>>2] = $120;
   HEAP32[((40696 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((40696 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    STACKTOP = sp;return;
   }
   HEAP32[((40696 + 20|0))>>2] = 0;
   HEAP32[((40696 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $125 = HEAP32[((40696 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((40696 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((40696 + 8|0))>>2] = $128;
   HEAP32[((40696 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   STACKTOP = sp;return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((40696 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((40696 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[40696>>2]|0;
     $152 = $151 & $150;
     HEAP32[40696>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((40696 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = (($R7$0) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[((40696 + 16|0))>>2]|0;
      $188 = ($RP9$0>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((40696 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((40696 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((40696 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((40696 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((40696 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((40696 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((40696 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((40696 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((40696 + 8|0))>>2] = $133;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((40696 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[40696>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[40696>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((40696 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((40696 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((40696 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  STACKTOP = sp;return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((40696 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((40696 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((40696 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   L204: do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$058 = $292;$T$057 = $284;
     while(1) {
      $300 = $K19$058 >>> 31;
      $301 = ((($T$057) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       break;
      }
      $294 = $K19$058 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L204;
      } else {
       $K19$058 = $294;$T$057 = $296;
      }
     }
     $303 = HEAP32[((40696 + 16|0))>>2]|0;
     $304 = ($301>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$301>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$057;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((40696 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((40696 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((40696 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = ((40696 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((40696 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 if ((($4|0) == 0)) {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  STACKTOP = sp;return (+$$0);
 } else if ((($4|0) == 2047)) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 } else {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function runPostSets() {
 
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}

// EMSCRIPTEN_END_FUNCS

  

  // EMSCRIPTEN_END_FUNCS
  

  return { _g723_Encode: _g723_Encode, _strlen: _strlen, _free: _free, _g723_Decode_Init: _g723_Decode_Init, _memset: _memset, _g723_Encode_Init: _g723_Encode_Init, _malloc: _malloc, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _g723_Decode: _g723_Decode, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0 };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _g723_Encode = Module["_g723_Encode"] = asm["_g723_Encode"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _g723_Decode_Init = Module["_g723_Decode_Init"] = asm["_g723_Decode_Init"];
var _memset = Module["_memset"] = asm["_memset"];
var _g723_Encode_Init = Module["_g723_Encode_Init"] = asm["_g723_Encode_Init"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _g723_Decode = Module["_g723_Decode"] = asm["_g723_Decode"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = false;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



