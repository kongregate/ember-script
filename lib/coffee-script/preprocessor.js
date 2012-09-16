// Generated by CoffeeScript 1.3.3
var EventEmitter, Preprocessor, StringScanner, fs, inspect,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

fs = require('fs');

EventEmitter = require('events').EventEmitter;

StringScanner = require('cjs-string-scanner');

inspect = function(o) {
  return (require('util')).inspect(o, false, 9e9, true);
};

this.Preprocessor = Preprocessor = (function(_super) {
  var DEDENT, INDENT, TERM, processInput, ws;

  __extends(Preprocessor, _super);

  ws = '\\t\\x0B\\f \\xA0\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000\\uFEFF';

  INDENT = '\uEFEF';

  DEDENT = '\uEFFE';

  TERM = '\uEFFF';

  function Preprocessor() {
    this.base = this.indent = null;
    this.context = [];
    this.context.peek = function() {
      if (this.length) {
        return this[this.length - 1];
      } else {
        return null;
      }
    };
    this.context.err = function(c) {
      throw new Error("Unexpected " + inspect(c));
    };
    this.context.observe = function(c) {
      var top;
      top = this.peek();
      switch (c) {
        case '"""':
        case '\'\'\'':
        case '"':
        case '\'':
        case '###':
        case '`':
        case '///':
        case '/':
          if (top === c) {
            this.pop();
          } else {
            this.push(c);
          }
          break;
        case INDENT:
        case '#':
        case '#{':
        case '[':
        case '(':
        case '{':
        case '\\':
        case 'regexp-[':
        case 'regexp-(':
        case 'regexp-{':
        case 'heregexp-#':
        case 'heregexp-[':
        case 'heregexp-(':
        case 'heregexp-{':
          this.push(c);
          break;
        case DEDENT:
          if (top !== INDENT) {
            this.err(c);
          }
          this.pop();
          break;
        case '\n':
          if (top !== '#' && top !== 'heregexp-#') {
            this.err(c);
          }
          this.pop();
          break;
        case ']':
          if (top !== '[' && top !== 'regexp-[' && top !== 'heregexp-[') {
            this.err(c);
          }
          this.pop();
          break;
        case ')':
          if (top !== '(' && top !== 'regexp-(' && top !== 'heregexp-(') {
            this.err(c);
          }
          this.pop();
          break;
        case '}':
          if (top !== '#{' && top !== '{' && top !== 'regexp-{' && top !== 'heregexp-{') {
            this.err(c);
          }
          this.pop();
          break;
        case 'end-\\':
          if (top !== '\\') {
            this.err(c);
          }
          this.pop();
          break;
        default:
          throw new Error("undefined token observed: " + c);
      }
      return this;
    };
    this.ss = new StringScanner('');
  }

  Preprocessor.prototype.p = function(s) {
    if (s != null) {
      this.emit('data', s);
    }
    return s;
  };

  Preprocessor.prototype.scan = function(r) {
    return this.p(this.ss.scan(r));
  };

  processInput = function(isEnd) {
    return function(data) {
      var b, c, delta, lastChar, level, newLevel, nonIdentifierBefore, pos, spaceBefore, tok;
      if (!isEnd) {
        this.ss.concat(data);
      }
      while (!this.ss.eos()) {
        switch (this.context.peek()) {
          case null:
          case INDENT:
          case '#{':
          case '[':
          case '(':
          case '{':
            if (this.ss.bol() || this.scan(RegExp("(?:[" + ws + "]*\\n)+"))) {
              this.scan(RegExp("(?:[" + ws + "]*(\\#\\#?(?!\\#)[^\\n]*)?\\n)+"));
              if (!isEnd && ((this.ss.check(RegExp("[" + ws + "\\n]*$"))) != null)) {
                return;
              }
              if (this.base != null) {
                if ((this.scan(this.base)) == null) {
                  throw new Error("inconsistent base indentation");
                }
              } else {
                b = this.scan(RegExp("[" + ws + "]*"));
                this.base = RegExp("" + b);
              }
              if (this.indent != null) {
                level = ((function() {
                  var _i, _len, _ref, _results;
                  _ref = this.context;
                  _results = [];
                  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    c = _ref[_i];
                    if (c === INDENT) {
                      _results.push(0);
                    }
                  }
                  return _results;
                }).call(this)).length;
                if (this.ss.check(RegExp("(?:" + this.indent + "){" + (level + 1) + "}[^" + ws + "#]"))) {
                  this.scan(RegExp("(?:" + this.indent + "){" + (level + 1) + "}"));
                  this.context.observe(INDENT);
                  this.p(INDENT);
                } else if (level > 0 && this.ss.check(RegExp("(?:" + this.indent + "){0," + (level - 1) + "}[^" + ws + "]"))) {
                  newLevel = 0;
                  while (this.scan(RegExp("" + this.indent))) {
                    ++newLevel;
                  }
                  delta = level - newLevel;
                  while (delta--) {
                    this.context.observe(DEDENT);
                    this.p("" + DEDENT + TERM);
                  }
                } else if (this.ss.check(RegExp("(?:" + this.indent + "){" + level + "}[^" + ws + "]"))) {
                  this.scan(RegExp("(?:" + this.indent + "){" + level + "}"));
                } else {
                  throw new Error("invalid indentation");
                }
              } else if (this.ss.check(RegExp("[" + ws + "]+[^" + ws + "#]"))) {
                this.indent = this.scan(RegExp("[" + ws + "]+"));
                this.context.observe(INDENT);
                this.p(INDENT);
              }
            }
            tok = (function() {
              switch (this.context.peek()) {
                case '[':
                  this.scan(/[^\n'"\\\/#`[({\]]+/);
                  return this.scan(/\]/);
                case '(':
                  this.scan(/[^\n'"\\\/#`[({)]+/);
                  return this.scan(/\)/);
                case '#{':
                case '{':
                  this.scan(/[^\n'"\\\/#`[({}]+/);
                  return this.scan(/\}/);
                default:
                  this.scan(/[^\n'"\\\/#`[({]+/);
                  return null;
              }
            }).call(this);
            if (tok) {
              this.context.observe(tok);
              continue;
            }
            if (tok = this.scan(/"""|'''|\/\/\/|###|["'`#[({\\]/)) {
              this.context.observe(tok);
            } else if (tok = this.scan(/\//)) {
              pos = this.ss.position();
              if (pos > 1) {
                lastChar = this.ss.string()[pos - 2];
                spaceBefore = RegExp("[" + ws + "]").test(lastChar);
                nonIdentifierBefore = /[\W_$]/.test(lastChar);
              }
              if (pos === 1 || (spaceBefore ? !this.ss.check(RegExp("[" + ws + "=]")) : nonIdentifierBefore)) {
                this.context.observe('/');
              }
            }
            break;
          case '\\':
            if (this.scan(/[\s\S]/)) {
              this.context.observe('end-\\');
            }
            break;
          case '"""':
            this.scan(/(?:[^"#\\]+|""?(?!")|#(?!{)|\\.)+/);
            this.ss.scan(/\\\n/);
            if (tok = this.scan(/#{|"""/)) {
              this.context.observe(tok);
            } else if (tok = this.scan(/#{|"""/)) {
              this.context.observe(tok);
            }
            break;
          case '"':
            this.scan(/(?:[^"#\\]+|#(?!{)|\\.)+/);
            this.ss.scan(/\\\n/);
            if (tok = this.scan(/#{|"/)) {
              this.context.observe(tok);
            }
            break;
          case '\'\'\'':
            this.scan(/(?:[^'\\]+|''?(?!')|\\.)+/);
            this.ss.scan(/\\\n/);
            if (tok = this.scan(/'''/)) {
              this.context.observe(tok);
            }
            break;
          case '\'':
            this.scan(/(?:[^'\\]+|\\.)+/);
            this.ss.scan(/\\\n/);
            if (tok = this.scan(/'/)) {
              this.context.observe(tok);
            }
            break;
          case '###':
            this.scan(/(?:[^#]+|##?(?!#))+/);
            if (tok = this.scan(/###/)) {
              this.context.observe(tok);
            }
            break;
          case '#':
            this.scan(/[^\n]+/);
            if (tok = this.scan(/\n/)) {
              this.context.observe(tok);
            }
            break;
          case '`':
            this.scan(/[^`]+/);
            if (tok = this.scan(/`/)) {
              this.context.observe(tok);
            }
            break;
          case '///':
            this.scan(/(?:[^[/#\\]+|\/\/?(?!\/)|\\.)+/);
            if (tok = this.scan(/#{|\/\/\/|\\/)) {
              this.context.observe(tok);
            } else if (this.ss.scan(/#/)) {
              this.context.observe('heregexp-#');
            } else if (tok = this.scan(/[\[]/)) {
              this.context.observe("heregexp-" + tok);
            }
            break;
          case 'heregexp-[':
            this.scan(/(?:[^\]\/\\]+|\/\/?(?!\/))+/);
            if (tok = this.scan(/[\]\\]|#{|\/\/\//)) {
              this.context.observe(tok);
            }
            break;
          case 'heregexp-#':
            this.ss.scan(/(?:[^\n/]+|\/\/?(?!\/))+/);
            if (tok = this.scan(/\n|\/\/\//)) {
              this.context.observe(tok);
            }
            break;
          case '/':
            this.scan(/[^[/\\]+/);
            if (tok = this.scan(/[\/\\]/)) {
              this.context.observe(tok);
            } else if (tok = this.scan(/\[/)) {
              this.context.observe("regexp-" + tok);
            }
            break;
          case 'regexp-[':
            this.scan(/[^\]\\]+/);
            if (tok = this.scan(/[\]\\]/)) {
              this.context.observe(tok);
            }
        }
      }
      if (isEnd) {
        this.scan(RegExp("[" + ws + "\\n]*$"));
        while (this.context.length && INDENT === this.context.peek()) {
          this.context.observe(DEDENT);
          this.p("" + DEDENT + TERM);
        }
        if (this.context.length) {
          throw new Error('Unclosed ' + (inspect(this.context.peek())) + ' at EOF');
        }
        this.emit('end');
        return;
      }
    };
  };

  Preprocessor.prototype.processData = processInput(false);

  Preprocessor.prototype.processEnd = processInput(true);

  Preprocessor.processSync = function(input) {
    var output, pre;
    pre = new Preprocessor;
    output = '';
    pre.emit = function(type, data) {
      if (type === 'data') {
        return output += data;
      }
    };
    pre.processData(input);
    pre.processEnd();
    return output;
  };

  return Preprocessor;

})(EventEmitter);