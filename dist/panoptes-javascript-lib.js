(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.panoptes = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CSRF_TOKEN_PATTERN, DELETE_METHOD_OVERRIDE_HEADERS, JSON_HEADERS, Model, TOKEN_EXPIRATION_ALLOWANCE, client, config, makeHTTPRequest, ref;

ref = require('json-api-client'), Model = ref.Model, makeHTTPRequest = ref.makeHTTPRequest;

config = require('./config');

client = require('./client');

JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

DELETE_METHOD_OVERRIDE_HEADERS = Object.create(JSON_HEADERS);

DELETE_METHOD_OVERRIDE_HEADERS['X-HTTP-Method-Override'] = 'DELETE';

CSRF_TOKEN_PATTERN = (function() {
  var CONTENT_ATTR, NAME_ATTR;
  NAME_ATTR = 'name=[\'"]csrf-token[\'"]';
  CONTENT_ATTR = 'content=[\'"](.+)[\'"]';
  return RegExp(NAME_ATTR + "\\s*" + CONTENT_ATTR + "|" + CONTENT_ATTR + "\\s*" + NAME_ATTR);
})();

TOKEN_EXPIRATION_ALLOWANCE = 10 * 1000;

module.exports = new Model({
  _currentUserPromise: null,
  _bearerToken: '',
  _bearerRefreshTimeout: NaN,
  _getAuthToken: function() {
    if (typeof console !== "undefined" && console !== null) {
      console.log('Getting auth token');
    }
    return makeHTTPRequest('GET', config.host + ("/?now=" + (Date.now())), null, {
      'Accept': 'text/html'
    }).then(function(request) {
      var _, authToken, authTokenMatch1, authTokenMatch2, ref1;
      ref1 = request.responseText.match(CSRF_TOKEN_PATTERN), _ = ref1[0], authTokenMatch1 = ref1[1], authTokenMatch2 = ref1[2];
      authToken = authTokenMatch1 != null ? authTokenMatch1 : authTokenMatch2;
      if (typeof console !== "undefined" && console !== null) {
        console.info("Got auth token " + authToken.slice(0, 6) + "...");
      }
      return authToken;
    })["catch"](function(request) {
      if (typeof console !== "undefined" && console !== null) {
        console.error('Failed to get auth token');
      }
      return client.handleError(request);
    });
  },
  _getBearerToken: function() {
    var data;
    if (typeof console !== "undefined" && console !== null) {
      console.log('Getting bearer token');
    }
    if (this._bearerToken) {
      if (typeof console !== "undefined" && console !== null) {
        console.info('Already had a bearer token', this._bearerToken);
      }
      return Promise.resolve(this._bearerToken);
    } else {
      data = {
        grant_type: 'password',
        client_id: config.clientAppID
      };
      return makeHTTPRequest('POST', config.host + '/oauth/token', data, JSON_HEADERS).then((function(_this) {
        return function(request) {
          var token;
          token = _this._handleNewBearerToken(request);
          return typeof console !== "undefined" && console !== null ? console.info("Got bearer token " + token.slice(0, 6) + "...") : void 0;
        };
      })(this))["catch"](function(request) {
        if (typeof console !== "undefined" && console !== null) {
          console.error('Failed to get bearer token');
        }
        return client.handleError(request);
      });
    }
  },
  _handleNewBearerToken: function(request) {
    var refresh, response, timeToRefresh;
    response = JSON.parse(request.responseText);
    this._bearerToken = response.access_token;
    client.headers['Authorization'] = "Bearer " + this._bearerToken;
    refresh = this._refreshBearerToken.bind(this, response.refresh_token);
    timeToRefresh = (response.expires_in * 1000) - TOKEN_EXPIRATION_ALLOWANCE;
    this._bearerRefreshTimeout = setTimeout(refresh, timeToRefresh);
    return this._bearerToken;
  },
  _refreshBearerToken: function(refreshToken) {
    var data;
    data = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientAppID
    };
    return makeHTTPRequest('POST', config.host + '/oauth/token', data, JSON_HEADERS).then((function(_this) {
      return function(request) {
        var token;
        token = _this._handleNewBearerToken(request);
        return typeof console !== "undefined" && console !== null ? console.info("Refreshed bearer token " + token.slice(0, 6) + "...") : void 0;
      };
    })(this))["catch"](function(request) {
      if (typeof console !== "undefined" && console !== null) {
        console.error('Failed to refresh bearer token');
      }
      return client.handleError(request);
    });
  },
  _deleteBearerToken: function() {
    this._bearerToken = '';
    delete client.headers['Authorization'];
    clearTimeout(this._bearerRefreshTimeout);
    return typeof console !== "undefined" && console !== null ? console.log('Deleted bearer token') : void 0;
  },
  _getSession: function() {
    if (typeof console !== "undefined" && console !== null) {
      console.log('Getting session');
    }
    return client.get('/me').then((function(_this) {
      return function(arg) {
        var user;
        user = arg[0];
        if (typeof console !== "undefined" && console !== null) {
          console.info('Got session', user.login, user.id);
        }
        return user;
      };
    })(this))["catch"](function(error) {
      if (typeof console !== "undefined" && console !== null) {
        console.error('Failed to get session');
      }
      throw error;
    });
  },
  register: function(arg) {
    var beta_email_communication, credited_name, email, global_email_communication, login, password, project_id;
    login = arg.login, email = arg.email, password = arg.password, credited_name = arg.credited_name, global_email_communication = arg.global_email_communication, project_id = arg.project_id, beta_email_communication = arg.beta_email_communication;
    return this.checkCurrent().then((function(_this) {
      return function(user) {
        var registrationRequest;
        if (user != null) {
          return _this.signOut().then(function() {
            return _this.register({
              login: login,
              email: email,
              password: password
            });
          });
        } else {
          if (typeof console !== "undefined" && console !== null) {
            console.log('Registering new account', login);
          }
          registrationRequest = _this._getAuthToken().then(function(token) {
            var data;
            data = {
              authenticity_token: token,
              user: {
                login: login,
                email: email,
                password: password,
                credited_name: credited_name,
                global_email_communication: global_email_communication,
                project_id: project_id,
                beta_email_communication: beta_email_communication
              }
            };
            return client.post('/../users', data, JSON_HEADERS).then(function() {
              return _this._getBearerToken().then(function() {
                return _this._getSession().then(function(user) {
                  if (typeof console !== "undefined" && console !== null) {
                    console.info('Registered account', user.login, user.id);
                  }
                  return user;
                });
              });
            })["catch"](function(error) {
              if (typeof console !== "undefined" && console !== null) {
                console.error('Failed to register');
              }
              throw error;
            });
          });
          _this.update({
            _currentUserPromise: registrationRequest["catch"](function() {
              return null;
            })
          });
          return registrationRequest;
        }
      };
    })(this));
  },
  checkCurrent: function() {
    if (this._currentUserPromise == null) {
      if (typeof console !== "undefined" && console !== null) {
        console.log('Checking current user');
      }
      this.update({
        _currentUserPromise: this._getBearerToken().then((function(_this) {
          return function() {
            return _this._getSession();
          };
        })(this))["catch"](function() {
          if (typeof console !== "undefined" && console !== null) {
            console.info('No current user');
          }
          return null;
        })
      });
    }
    return this._currentUserPromise;
  },
  signIn: function(arg) {
    var login, password;
    login = arg.login, password = arg.password;
    return this.checkCurrent().then((function(_this) {
      return function(user) {
        var signInRequest;
        if (user != null) {
          return _this.signOut().then(function() {
            return _this.signIn({
              login: login,
              password: password
            });
          });
        } else {
          if (typeof console !== "undefined" && console !== null) {
            console.log('Signing in', login);
          }
          signInRequest = _this._getAuthToken().then(function(token) {
            var data;
            data = {
              authenticity_token: token,
              user: {
                login: login,
                password: password
              }
            };
            return makeHTTPRequest('POST', config.host + '/users/sign_in', data, JSON_HEADERS).then(function() {
              return _this._getBearerToken().then(function() {
                return _this._getSession().then(function(user) {
                  if (typeof console !== "undefined" && console !== null) {
                    console.info('Signed in', user.login, user.id);
                  }
                  return user;
                });
              });
            })["catch"](function(request) {
              if (typeof console !== "undefined" && console !== null) {
                console.error('Failed to sign in');
              }
              return client.handleError(request);
            });
          });
          _this.update({
            _currentUserPromise: signInRequest["catch"](function() {
              return null;
            })
          });
          return signInRequest;
        }
      };
    })(this));
  },
  changePassword: function(arg) {
    var current, replacement;
    current = arg.current, replacement = arg.replacement;
    return this.checkCurrent().then((function(_this) {
      return function(user) {
        if (user != null) {
          return _this._getAuthToken().then(function(token) {
            var data;
            data = {
              authenticity_token: token,
              user: {
                current_password: current,
                password: replacement,
                password_confirmation: replacement
              }
            };
            return client.put('/../users', data, JSON_HEADERS).then(function() {
              return _this.signOut();
            }).then(function() {
              var login, password;
              login = user.login;
              password = replacement;
              return _this.signIn({
                login: login,
                password: password
              });
            });
          });
        } else {
          throw new Error('No signed-in user to change the password for');
        }
      };
    })(this));
  },
  requestPasswordReset: function(arg) {
    var email;
    email = arg.email;
    return this._getAuthToken().then((function(_this) {
      return function(token) {
        var data;
        data = {
          authenticity_token: token,
          user: {
            email: email
          }
        };
        return client.post('/../users/password', data, JSON_HEADERS);
      };
    })(this));
  },
  resetPassword: function(arg) {
    var confirmation, password, resetToken;
    password = arg.password, confirmation = arg.confirmation, resetToken = arg.token;
    return this._getAuthToken().then((function(_this) {
      return function(authToken) {
        var data;
        data = {
          authenticity_token: authToken,
          user: {
            password: password,
            password_confirmation: confirmation,
            reset_password_token: resetToken
          }
        };
        return client.put('/../users/password', data, JSON_HEADERS);
      };
    })(this));
  },
  disableAccount: function() {
    if (typeof console !== "undefined" && console !== null) {
      console.log('Disabling account');
    }
    return this.checkCurrent().then((function(_this) {
      return function(user) {
        if (user != null) {
          return user["delete"]().then(function() {
            _this._deleteBearerToken();
            _this.update({
              _currentUserPromise: Promise.resolve(null)
            });
            if (typeof console !== "undefined" && console !== null) {
              console.info('Disabled account');
            }
            return null;
          });
        } else {
          throw new Error('Failed to disable account; not signed in');
        }
      };
    })(this));
  },
  signOut: function() {
    if (typeof console !== "undefined" && console !== null) {
      console.log('Signing out');
    }
    return this.checkCurrent().then((function(_this) {
      return function(user) {
        if (user != null) {
          return _this._getAuthToken().then(function(token) {
            var data;
            data = {
              authenticity_token: token
            };
            return makeHTTPRequest('POST', config.host + '/users/sign_out', data, DELETE_METHOD_OVERRIDE_HEADERS).then(function() {
              _this._deleteBearerToken();
              _this.update({
                _currentUserPromise: Promise.resolve(null)
              });
              if (typeof console !== "undefined" && console !== null) {
                console.info('Signed out');
              }
              return null;
            })["catch"](function(request) {
              if (typeof console !== "undefined" && console !== null) {
                console.error('Failed to sign out');
              }
              return client.handleError(request);
            });
          });
        } else {
          throw new Error('Failed to sign out; not signed in');
        }
      };
    })(this));
  }
});

if (typeof window !== "undefined" && window !== null) {
  window.zooAuth = module.exports;
}

if (typeof window !== "undefined" && window !== null) {
  window.log = typeof console !== "undefined" && console !== null ? console.info.bind(console, 'LOG') : void 0;
}

if (typeof window !== "undefined" && window !== null) {
  window.err = typeof console !== "undefined" && console !== null ? console.error.bind(console, 'ERR') : void 0;
}



},{"./client":2,"./config":3,"json-api-client":5}],2:[function(require,module,exports){
var JSONAPIClient, Resource, apiClient, config, ref;

JSONAPIClient = (ref = require('json-api-client'), Resource = ref.Resource, ref);

config = require('./config');

apiClient = new JSONAPIClient(config.host + '/api', {
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.api+json; version=1'
});

apiClient.handleError = function(request) {
  var error, errorMessage, key, message, ref1, ref2, ref3, response;
  if ('message' in request) {
    throw request;
  } else if ('responseText' in request) {
    response = (function() {
      try {
        return JSON.parse(request.responseText);
      } catch (_error) {}
    })();
    if ((response != null ? response.error : void 0) != null) {
      errorMessage = response.error;
      if (response.error_description != null) {
        errorMessage = errorMessage + " " + response.error_description;
      }
    } else if ((response != null ? (ref1 = response.errors) != null ? ref1[0].message : void 0 : void 0) != null) {
      errorMessage = (function() {
        var i, len, ref2, results;
        ref2 = response.errors;
        results = [];
        for (i = 0, len = ref2.length; i < len; i++) {
          message = ref2[i].message;
          if (typeof message === 'string') {
            results.push(message);
          } else {
            results.push(((function() {
              var results1;
              results1 = [];
              for (key in message) {
                error = message[key];
                results1.push(key + " " + error);
              }
              return results1;
            })()).join('\n'));
          }
        }
        return results;
      })();
      errorMessage = errorMessage.join('\n');
    }
    if (((ref2 = request.responseText) != null ? ref2.indexOf('<!DOCTYPE') : void 0) !== -1) {
      if (errorMessage == null) {
        errorMessage = "There was a problem on the server. " + request.responseURL + " → " + request.status;
      }
    }
    if (errorMessage == null) {
      errorMessage = ((ref3 = request.responseText) != null ? ref3.trim() : void 0) || (request.status + " " + request.statusText);
    }
    throw new Error(errorMessage);
  }
};

module.exports = apiClient;

if (typeof window !== "undefined" && window !== null) {
  window.zooAPI = apiClient;
}



},{"./config":3,"json-api-client":5}],3:[function(require,module,exports){
(function (process){
var API_APPLICATION_IDS, API_HOSTS, DEFAULT_ENV, TALK_HOSTS, appFromBrowser, appFromShell, env, envFromBrowser, envFromShell, hostFromBrowser, hostFromShell, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, talkFromBrowser, talkFromShell;

DEFAULT_ENV = 'staging';

API_HOSTS = {
  production: 'https://panoptes.zooniverse.org',
  staging: 'https://panoptes-staging.zooniverse.org',
  cam: 'http://172.17.2.87:3000'
};

API_APPLICATION_IDS = {
  production: 'f79cf5ea821bb161d8cbb52d061ab9a2321d7cb169007003af66b43f7b79ce2a',
  staging: '535759b966935c297be11913acee7a9ca17c025f9f15520e7504728e71110a27',
  cam: '535759b966935c297be11913acee7a9ca17c025f9f15520e7504728e71110a27'
};

TALK_HOSTS = {
  production: 'https://talk.zooniverse.org',
  staging: 'https://talk-staging.zooniverse.org'
};

hostFromBrowser = typeof location !== "undefined" && location !== null ? (ref = location.search.match(/\W?panoptes-api-host=([^&]+)/)) != null ? ref[1] : void 0 : void 0;

appFromBrowser = typeof location !== "undefined" && location !== null ? (ref1 = location.search.match(/\W?panoptes-api-application=([^&]+)/)) != null ? ref1[1] : void 0 : void 0;

talkFromBrowser = typeof location !== "undefined" && location !== null ? (ref2 = location.search.match(/\W?talk-host=([^&]+)/)) != null ? ref2[1] : void 0 : void 0;

hostFromShell = process.env.PANOPTES_API_HOST;

appFromShell = process.env.PANOPTES_API_APPLICATION;

talkFromShell = process.env.TALK_HOST;

envFromBrowser = typeof location !== "undefined" && location !== null ? (ref3 = location.search.match(/\W?env=(\w+)/)) != null ? ref3[1] : void 0 : void 0;

envFromShell = process.env.NODE_ENV;

env = (ref4 = envFromBrowser != null ? envFromBrowser : envFromShell) != null ? ref4 : DEFAULT_ENV;

module.exports = {
  host: (ref5 = hostFromBrowser != null ? hostFromBrowser : hostFromShell) != null ? ref5 : API_HOSTS[env],
  clientAppID: (ref6 = appFromBrowser != null ? appFromBrowser : appFromShell) != null ? ref6 : API_APPLICATION_IDS[env],
  talkHost: (ref7 = talkFromBrowser != null ? talkFromBrowser : talkFromShell) != null ? ref7 : TALK_HOSTS[env]
};



}).call(this,require('_process'))
},{"_process":4}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
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

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.JSONAPIClient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var DEFAULT_SIGNAL, Emitter, arraysMatch, callHandler,
  __slice = [].slice;

DEFAULT_SIGNAL = 'change';

arraysMatch = function(array1, array2) {
  var i, item, matches, _ref;
  matches = (function() {
    var _i, _len, _results;
    _results = [];
    for (i = _i = 0, _len = array1.length; _i < _len; i = ++_i) {
      item = array1[i];
      if (array2[i] === item) {
        _results.push(i);
      }
    }
    return _results;
  })();
  return (array1.length === (_ref = array2.length) && _ref === matches.length);
};

callHandler = function(handler, payload) {
  var boundArgs, context, _ref;
  if (Array.isArray(handler)) {
    _ref = handler, context = _ref[0], handler = _ref[1], boundArgs = 3 <= _ref.length ? __slice.call(_ref, 2) : [];
    if (typeof handler === 'string') {
      handler = context[handler];
    }
  } else {
    boundArgs = [];
  }
  handler.apply(context, boundArgs.concat(payload));
};

module.exports = Emitter = (function() {
  Emitter.prototype._callbacks = null;

  function Emitter() {
    this._callbacks = {};
  }

  Emitter.prototype.listen = function() {
    var callback, signal, _arg, _base, _i;
    _arg = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
    signal = _arg[0];
    if (signal == null) {
      signal = DEFAULT_SIGNAL;
    }
    if ((_base = this._callbacks)[signal] == null) {
      _base[signal] = [];
    }
    this._callbacks[signal].push(callback);
    return this;
  };

  Emitter.prototype.stopListening = function() {
    var callback, handler, i, index, signal, _arg, _i, _j, _ref;
    _arg = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
    signal = _arg[0];
    if (signal == null) {
      signal = DEFAULT_SIGNAL;
    }
    if (this._callbacks[signal] != null) {
      if (callback != null) {
        if (Array.isArray(callback)) {
          index = -1;
          _ref = this._callbacks[signal];
          for (i = _j = _ref.length - 1; _j >= 0; i = _j += -1) {
            handler = _ref[i];
            if (Array.isArray(handler)) {
              if (arraysMatch(callback, handler)) {
                index = i;
                break;
              }
            }
          }
        } else {
          index = this._callbacks[signal].lastIndexOf(callback);
        }
        if (index !== -1) {
          this._callbacks[signal].splice(index, 1);
        }
      } else {
        this._callbacks[signal].splice(0);
      }
    }
    return this;
  };

  Emitter.prototype.emit = function() {
    var callback, payload, signal, _i, _len, _ref;
    signal = arguments[0], payload = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (signal == null) {
      signal = DEFAULT_SIGNAL;
    }
    if (signal in this._callbacks) {
      _ref = this._callbacks[signal];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        callback = _ref[_i];
        callHandler(callback, payload);
      }
    }
    return this;
  };

  Emitter.prototype.destroy = function() {
    var callback, signal, _i, _len, _ref;
    this.emit('destroy');
    for (signal in this._callbacks) {
      _ref = this._callbacks[signal];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        callback = _ref[_i];
        this.stopListening(signal, callback);
      }
    }
  };

  return Emitter;

})();



},{}],2:[function(_dereq_,module,exports){
var DEFAULT_TYPE_AND_ACCEPT, Emitter, JSONAPIClient, Model, RESERVED_TOP_LEVEL_KEYS, Resource, Type, makeHTTPRequest, mergeInto,
  __slice = [].slice,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

makeHTTPRequest = _dereq_('./make-http-request');

mergeInto = _dereq_('./merge-into');

Emitter = _dereq_('./emitter');

Type = _dereq_('./type');

Model = _dereq_('./model');

Resource = _dereq_('./resource');

DEFAULT_TYPE_AND_ACCEPT = {
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json'
};

RESERVED_TOP_LEVEL_KEYS = ['meta', 'links', 'linked', 'data'];

JSONAPIClient = (function() {
  var method, _fn, _i, _len, _ref;

  JSONAPIClient.prototype.root = '/';

  JSONAPIClient.prototype.headers = null;

  JSONAPIClient.prototype._typesCache = null;

  function JSONAPIClient(root, headers) {
    this.root = root;
    this.headers = headers != null ? headers : {};
    this._typesCache = {};
  }

  JSONAPIClient.prototype.request = function(method, url, payload, headers) {
    var allHeaders, fullURL;
    fullURL = this.root + url;
    allHeaders = mergeInto({}, DEFAULT_TYPE_AND_ACCEPT, this.headers, headers);
    return makeHTTPRequest(method, fullURL, payload, allHeaders).then(this.processResponse.bind(this))["catch"](this.handleError.bind(this));
  };

  _ref = ['get', 'post', 'put', 'delete'];
  _fn = function(method) {
    return JSONAPIClient.prototype[method] = function() {
      return this.request.apply(this, [method].concat(__slice.call(arguments)));
    };
  };
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    method = _ref[_i];
    _fn(method);
  }

  JSONAPIClient.prototype.processResponse = function(request) {
    var headers, linkedResources, resourceData, resources, response, results, typeName, _j, _k, _l, _len1, _len2, _len3, _ref1, _ref2, _ref3, _ref4;
    response = (function() {
      try {
        return JSON.parse(request.responseText);
      } catch (_error) {
        return {};
      }
    })();
    headers = this._getHeadersFor(request);
    if ('links' in response) {
      this._handleLinks(response.links);
    }
    if ('linked' in response) {
      _ref1 = response.linked;
      for (typeName in _ref1) {
        linkedResources = _ref1[typeName];
        _ref2 = [].concat(linkedResources);
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          resourceData = _ref2[_j];
          this.type(typeName).create(resourceData, headers, response.meta);
        }
      }
    }
    results = [];
    if ('data' in response) {
      _ref3 = [].concat(response.data);
      for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
        resourceData = _ref3[_k];
        results.push(this.type(resourceData.type).create(resourceData, headers, response.meta));
      }
    } else {
      for (typeName in response) {
        resources = response[typeName];
        if (__indexOf.call(RESERVED_TOP_LEVEL_KEYS, typeName) < 0) {
          _ref4 = [].concat(resources);
          for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
            resourceData = _ref4[_l];
            results.push(this.type(typeName).create(resourceData, headers, response.meta));
          }
        }
      }
    }
    return results;
  };

  JSONAPIClient.prototype._getHeadersFor = function(request) {
    var headers, key, pair, value, _j, _len1, _ref1, _ref2;
    headers = {};
    _ref1 = request.getAllResponseHeaders().split('\n');
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      pair = _ref1[_j];
      if (!(pair !== '')) {
        continue;
      }
      _ref2 = pair.split(':'), key = _ref2[0], value = 2 <= _ref2.length ? __slice.call(_ref2, 1) : [];
      headers[key.trim()] = value.join(':').trim();
    }
    return headers;
  };

  JSONAPIClient.prototype._handleLinks = function(links) {
    var attributeName, href, link, type, typeAndAttribute, typeName, _ref1, _results;
    _results = [];
    for (typeAndAttribute in links) {
      link = links[typeAndAttribute];
      _ref1 = typeAndAttribute.split('.'), typeName = _ref1[0], attributeName = _ref1[1];
      if (typeof link === 'string') {
        href = link;
      } else {
        href = link.href, type = link.type;
      }
      _results.push(this._handleLink(typeName, attributeName, href, type));
    }
    return _results;
  };

  JSONAPIClient.prototype._handleLink = function(typeName, attributeName, hrefTemplate, attributeTypeName) {
    var type, _base;
    type = this.type(typeName);
    if ((_base = type._links)[attributeName] == null) {
      _base[attributeName] = {};
    }
    if (hrefTemplate != null) {
      type._links[attributeName].href = hrefTemplate;
    }
    if (attributeTypeName != null) {
      return type._links[attributeName].type = attributeTypeName;
    }
  };

  JSONAPIClient.prototype.handleError = function() {
    return Promise.reject.apply(Promise, arguments);
  };

  JSONAPIClient.prototype.type = function(name) {
    var _base;
    if ((_base = this._typesCache)[name] == null) {
      _base[name] = new Type(name, this);
    }
    return this._typesCache[name];
  };

  JSONAPIClient.prototype.createType = function() {
    if (typeof console !== "undefined" && console !== null) {
      console.warn.apply(console, ['Use JSONAPIClient::type, not ::createType'].concat(__slice.call(arguments)));
    }
    return this.type.apply(this, arguments);
  };

  return JSONAPIClient;

})();

module.exports = JSONAPIClient;

module.exports.makeHTTPRequest = makeHTTPRequest;

module.exports.Emitter = Emitter;

module.exports.Type = Type;

module.exports.Model = Model;

module.exports.Resource = Resource;

Object.defineProperty(module.exports, 'util', {
  get: function() {
    if (typeof console !== "undefined" && console !== null) {
      console.warn('makeHTTPRequest is available directly from the JSONAPIClient object, no need for `util`');
    }
    return {
      makeHTTPRequest: makeHTTPRequest
    };
  }
});



},{"./emitter":1,"./make-http-request":3,"./merge-into":4,"./model":5,"./resource":6,"./type":7}],3:[function(_dereq_,module,exports){
var CACHE_FOR, cachedGets;

CACHE_FOR = 1000;

cachedGets = {};

module.exports = function(method, url, data, headers, modify) {
  var key, promise, value;
  method = method.toUpperCase();
  if (method === 'GET') {
    if ((data != null) && Object.keys(data).length !== 0) {
      url += '?' + ((function() {
        var _results;
        _results = [];
        for (key in data) {
          value = data[key];
          _results.push([key, value].join('='));
        }
        return _results;
      })()).join('&');
      data = null;
    }
    promise = cachedGets[url];
  }
  if (promise == null) {
    promise = new Promise(function(resolve, reject) {
      var header, request, _ref;
      request = new XMLHttpRequest;
      request.open(method, encodeURI(url));
      request.withCredentials = true;
      if (headers != null) {
        for (header in headers) {
          value = headers[header];
          if (value != null) {
            request.setRequestHeader(header, value);
          }
        }
      }
      if (modify != null) {
        modify(request);
      }
      request.onreadystatechange = function(e) {
        var _ref;
        if (request.readyState === request.DONE) {
          if ((200 <= (_ref = request.status) && _ref < 300)) {
            if (method === 'GET') {
              setTimeout((function() {
                return delete cachedGets[url];
              }), CACHE_FOR);
            }
            return resolve(request);
          } else {
            if (method === 'GET') {
              setTimeout((function() {
                return delete cachedGets[url];
              }), CACHE_FOR);
            }
            return reject(request);
          }
        }
      };
      if ((data != null) && (headers != null ? (_ref = headers['Content-Type']) != null ? _ref.indexOf('json') : void 0 : void 0) !== -1) {
        data = JSON.stringify(data);
      }
      return request.send(data);
    });
  }
  if (method === 'GET') {
    cachedGets[url] = promise;
  }
  return promise;
};



},{}],4:[function(_dereq_,module,exports){
var __hasProp = {}.hasOwnProperty;

module.exports = function() {
  var argument, key, value, _i, _len, _ref;
  _ref = Array.prototype.slice.call(arguments, 1);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    argument = _ref[_i];
    if (argument != null) {
      for (key in argument) {
        if (!__hasProp.call(argument, key)) continue;
        value = argument[key];
        arguments[0][key] = value;
      }
    }
  }
  return arguments[0];
};



},{}],5:[function(_dereq_,module,exports){
var Emitter, Model, mergeInto,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Emitter = _dereq_('./emitter');

mergeInto = _dereq_('./merge-into');

module.exports = Model = (function(_super) {
  __extends(Model, _super);

  Model.prototype._changedKeys = null;

  function Model() {
    var configs;
    configs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    Model.__super__.constructor.apply(this, arguments);
    this._changedKeys = [];
    mergeInto.apply(null, [this].concat(__slice.call(configs)));
    this.emit('create');
  }

  Model.prototype.update = function(changeSet) {
    var base, key, lastKey, path, rootKey, value, _i, _len, _ref;
    if (changeSet == null) {
      changeSet = {};
    }
    if (typeof changeSet === 'string') {
      for (_i = 0, _len = arguments.length; _i < _len; _i++) {
        key = arguments[_i];
        if (__indexOf.call(this._changedKeys, key) < 0) {
          (_ref = this._changedKeys).push.apply(_ref, arguments);
        }
      }
    } else {
      for (key in changeSet) {
        if (!__hasProp.call(changeSet, key)) continue;
        value = changeSet[key];
        path = key.split('.');
        rootKey = path[0];
        base = this;
        while (path.length !== 1) {
          base = base[path.shift()];
        }
        lastKey = path.shift();
        if (value === void 0) {
          delete base[lastKey];
        } else {
          base[lastKey] = value;
        }
        if (__indexOf.call(this._changedKeys, rootKey) < 0) {
          this._changedKeys.push(rootKey);
        }
      }
    }
    this.emit('change');
    return this;
  };

  Model.prototype.hasUnsavedChanges = function() {
    return this._changedKeys.length !== 0;
  };

  return Model;

})(Emitter);



},{"./emitter":1,"./merge-into":4}],6:[function(_dereq_,module,exports){
var Model, PLACEHOLDERS_PATTERN, Resource, ResourcePromise, removeUnderscoredKeys,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice,
  __modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

Model = _dereq_('./model');

removeUnderscoredKeys = function(target) {
  var key, results, value, _i, _len, _results;
  if (Array.isArray(target)) {
    _results = [];
    for (_i = 0, _len = target.length; _i < _len; _i++) {
      value = target[_i];
      _results.push(removeUnderscoredKeys(value));
    }
    return _results;
  } else if ((target != null) && typeof target === 'object') {
    results = {};
    for (key in target) {
      value = target[key];
      if (key.charAt(0) !== '_') {
        results[key] = removeUnderscoredKeys(value);
      }
    }
    return results;
  } else {
    return target;
  }
};

PLACEHOLDERS_PATTERN = /{(.+?)}/g;

Resource = (function(_super) {
  __extends(Resource, _super);

  Resource.prototype._type = null;

  Resource.prototype._headers = null;

  Resource.prototype._meta = null;

  Resource.prototype._linksCache = null;

  function Resource(_type) {
    this._type = _type;
    if (this._type == null) {
      throw new Error('Don\'t call the Resource constructor directly, use `client.type("things").create({});`');
    }
    this._headers = {};
    this._meta = {};
    this._linksCache = {};
    Resource.__super__.constructor.call(this, null);
    this._type.emit('change');
    this.emit('create');
  }

  Resource.prototype.getMeta = function(key) {
    if (key == null) {
      key = this._type._name;
    }
    return this._meta[key];
  };

  Resource.prototype.update = function() {
    var value;
    value = Resource.__super__.update.apply(this, arguments);
    if (this.id && this._type._resourcesCache[this.id] !== this) {
      this._type._resourcesCache[this.id] = this;
      this._type.emit('change');
    }
    return value;
  };

  Resource.prototype.save = function() {
    var payload, save;
    payload = {};
    payload[this._type._name] = removeUnderscoredKeys(this.getChangesSinceSave());
    save = this.id ? this.refresh(true).then((function(_this) {
      return function() {
        return _this._type._client.put(_this._getURL(), payload, _this._getHeadersForModification());
      };
    })(this)) : this._type._client.post(this._type._getURL(), payload);
    return new ResourcePromise(save.then((function(_this) {
      return function(_arg) {
        var result;
        result = _arg[0];
        if (result !== _this) {
          _this.update(result);
          _this._changedKeys.splice(0);
          result.destroy();
        }
        _this.emit('save');
        return _this;
      };
    })(this)));
  };

  Resource.prototype.getChangesSinceSave = function() {
    var changes, key, _i, _len, _ref;
    changes = {};
    _ref = this._changedKeys;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      changes[key] = this[key];
    }
    return changes;
  };

  Resource.prototype.refresh = function(saveChanges) {
    var changes;
    if (saveChanges) {
      changes = this.getChangesSinceSave();
      return this.refresh().then((function(_this) {
        return function() {
          return _this.update(changes);
        };
      })(this));
    } else if (this.id) {
      return this._type.get(this.id, {});
    } else {
      throw new Error('Can\'t refresh a resource with no ID');
    }
  };

  Resource.prototype.uncache = function() {
    if (this.id) {
      this.emit('uncache');
      return delete this._type._resourcesCache[this.id];
    } else {
      throw new Error('Can\'t uncache a resource with no ID');
    }
  };

  Resource.prototype["delete"] = function() {
    var deletion;
    deletion = this.id ? this.refresh(true).then((function(_this) {
      return function() {
        return _this._type._client["delete"](_this._getURL(), null, _this._getHeadersForModification());
      };
    })(this)) : Promise.resolve();
    return new ResourcePromise(deletion.then((function(_this) {
      return function() {
        _this.emit('delete');
        _this._type.emit('change');
        _this.destroy();
        return null;
      };
    })(this)));
  };

  Resource.prototype.get = function(name, _arg) {
    var href, id, ids, resourceLink, result, skipCache, type, typeLink, _ref;
    skipCache = (_arg != null ? _arg : {}).skipCache;
    if ((this._linksCache[name] != null) && !skipCache) {
      return this._linksCache[name];
    } else {
      resourceLink = (_ref = this.links) != null ? _ref[name] : void 0;
      typeLink = this._type._links[name];
      result = (function() {
        var _ref1, _ref2, _ref3, _ref4;
        if ((resourceLink != null) || (typeLink != null)) {
          href = (_ref1 = resourceLink != null ? resourceLink.href : void 0) != null ? _ref1 : typeLink != null ? typeLink.href : void 0;
          type = (_ref2 = resourceLink != null ? resourceLink.type : void 0) != null ? _ref2 : typeLink != null ? typeLink.type : void 0;
          id = (_ref3 = resourceLink != null ? resourceLink.id : void 0) != null ? _ref3 : typeLink != null ? typeLink.id : void 0;
          if (id == null) {
            id = typeof resourceLink === 'string' ? resourceLink : void 0;
          }
          ids = (_ref4 = resourceLink != null ? resourceLink.ids : void 0) != null ? _ref4 : typeLink != null ? typeLink.ids : void 0;
          if (ids == null) {
            ids = Array.isArray(resourceLink) ? resourceLink : void 0;
          }
          if (href != null) {
            return this._type._client.get(this._applyHREF(href)).then(function(links) {
              if (id != null) {
                return links[0];
              } else {
                return links;
              }
            });
          } else if (type != null) {
            return this._type._client.type(type).get(id != null ? id : ids).then(function(links) {
              if (id != null) {
                return links[0];
              } else {
                return links;
              }
            });
          } else if (name in this) {
            return Promise.resolve(this[name]);
          } else {
            throw new Error("No link '" + name + "' defined for " + this._type._name + "#" + this.id);
          }
        }
      }).call(this);
      result.then((function(_this) {
        return function() {
          return _this._linksCache[name] = result;
        };
      })(this));
      return new ResourcePromise(result);
    }
  };

  Resource.prototype._applyHREF = function(href) {
    var context;
    context = {};
    context[this._type._name] = this;
    return href.replace(PLACEHOLDERS_PATTERN, function(_, path) {
      var segment, segments, value, _ref, _ref1;
      segments = path.split('.');
      value = context;
      while (segments.length !== 0) {
        segment = segments.shift();
        value = (_ref = value[segment]) != null ? _ref : (_ref1 = value.links) != null ? _ref1[segment] : void 0;
      }
      if (Array.isArray(value)) {
        value = value.join(',');
      }
      if (typeof value !== 'string') {
        throw new Error("Value for '" + path + "' in '" + href + "' should be a string.");
      }
      return value;
    });
  };

  Resource.prototype.addLink = function(name, value) {
    var data, url;
    url = this._getURL('links', name);
    data = {};
    data[name] = value;
    return this._type._client.post(url, data).then((function(_this) {
      return function() {
        _this.uncacheLink(name);
        return _this.refresh();
      };
    })(this));
  };

  Resource.prototype.removeLink = function(name, value) {
    var url;
    url = this._getURL('links', name, [].concat(value).join(','));
    return this._type._client["delete"](url).then((function(_this) {
      return function() {
        _this.uncacheLink(name);
        return _this.refresh();
      };
    })(this));
  };

  Resource.prototype.uncacheLink = function(name) {
    return delete this._linksCache[name];
  };

  Resource.prototype._getHeadersForModification = function() {
    return {
      'If-Unmodified-Since': this._getHeader('Last-Modified'),
      'If-Match': this._getHeader('ETag')
    };
  };

  Resource.prototype._getHeader = function(header) {
    var name, value;
    header = header.toLowerCase();
    return ((function() {
      var _ref, _results;
      _ref = this._headers;
      _results = [];
      for (name in _ref) {
        value = _ref[name];
        if (name.toLowerCase() === header) {
          _results.push(value);
        }
      }
      return _results;
    }).call(this))[0];
  };

  Resource.prototype._getURL = function() {
    var _ref;
    return this.href || (_ref = this._type)._getURL.apply(_ref, [this.id].concat(__slice.call(arguments)));
  };

  Resource.prototype.link = function() {
    if (typeof console !== "undefined" && console !== null) {
      console.warn.apply(console, ['Use Resource::get, not ::link'].concat(__slice.call(arguments)));
    }
    return this.get.apply(this, arguments);
  };

  Resource.prototype.getRequestMeta = function() {
    if (typeof console !== "undefined" && console !== null) {
      console.warn.apply(console, ['Use Resource::getMeta, not ::getRequestMeta'].concat(__slice.call(arguments)));
    }
    return this.getMeta.apply(this, arguments);
  };

  return Resource;

})(Model);

ResourcePromise = (function() {
  var method, methodName, _ref;

  ResourcePromise.prototype._promise = null;

  function ResourcePromise(_promise) {
    this._promise = _promise;
    if (!(this._promise instanceof Promise)) {
      throw new Error('ResourcePromise requires a real promise instance');
    }
  }

  ResourcePromise.prototype.then = function() {
    var _ref;
    return (_ref = this._promise).then.apply(_ref, arguments);
  };

  ResourcePromise.prototype["catch"] = function() {
    var _ref;
    return (_ref = this._promise)["catch"].apply(_ref, arguments);
  };

  ResourcePromise.prototype.index = function(index) {
    this._promise = this._promise.then(function(value) {
      index = __modulo(index, value.length);
      return value[index];
    });
    return this;
  };

  _ref = Resource.prototype;
  for (methodName in _ref) {
    method = _ref[methodName];
    if (typeof method === 'function' && !(methodName in ResourcePromise.prototype)) {
      (function(methodName) {
        return ResourcePromise.prototype[methodName] = function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          this._promise = this._promise.then((function(_this) {
            return function(promisedValue) {
              var resource, result, results;
              results = (function() {
                var _i, _len, _ref1, _results;
                _ref1 = [].concat(promisedValue);
                _results = [];
                for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                  resource = _ref1[_i];
                  result = resource[methodName].apply(resource, args);
                  if (result instanceof this.constructor) {
                    result = result._promise;
                  }
                  _results.push(result);
                }
                return _results;
              }).call(_this);
              if (Array.isArray(promisedValue)) {
                return Promise.all(results);
              } else {
                return results[0];
              }
            };
          })(this));
          return this;
        };
      })(methodName);
    }
  }

  return ResourcePromise;

})();

module.exports = Resource;

module.exports.Promise = ResourcePromise;



},{"./model":5}],7:[function(_dereq_,module,exports){
var Emitter, Resource, Type, mergeInto,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

Emitter = _dereq_('./emitter');

Resource = _dereq_('./resource');

mergeInto = _dereq_('./merge-into');

module.exports = Type = (function(_super) {
  __extends(Type, _super);

  Type.prototype.Resource = Resource;

  Type.prototype._name = '';

  Type.prototype._client = null;

  Type.prototype._links = null;

  Type.prototype._resourcesCache = null;

  function Type(_name, _client) {
    this._name = _name;
    this._client = _client;
    Type.__super__.constructor.apply(this, arguments);
    this._links = {};
    this._resourcesCache = {};
    if (!(this._name && (this._client != null))) {
      throw new Error('Don\'t call the Type constructor directly, use `client.type("things");`');
    }
  }

  Type.prototype.create = function(data, headers, meta) {
    var resource, _ref, _ref1;
    if (data == null) {
      data = {};
    }
    if (headers == null) {
      headers = {};
    }
    if (meta == null) {
      meta = {};
    }
    if (data.type && data.type !== this._name) {
      return (_ref = this._client.type(data.type)).create.apply(_ref, arguments);
    } else {
      resource = (_ref1 = this._resourcesCache[data.id]) != null ? _ref1 : new this.Resource(this);
      mergeInto(resource._headers, headers);
      mergeInto(resource._meta, meta);
      resource.update(data);
      if (resource === this._resourcesCache[data.id]) {
        resource._changedKeys.splice(0);
      }
      return resource;
    }
  };

  Type.prototype.get = function() {
    return new Resource.Promise(typeof arguments[0] === 'string' ? this._getByID.apply(this, arguments) : Array.isArray(arguments[0]) ? this._getByIDs.apply(this, arguments) : this._getByQuery.apply(this, arguments));
  };

  Type.prototype._getByID = function() {
    var id, otherArgs;
    id = arguments[0], otherArgs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return this._getByIDs.apply(this, [[id]].concat(__slice.call(otherArgs))).then(function(_arg) {
      var resource;
      resource = _arg[0];
      return resource;
    });
  };

  Type.prototype._getByIDs = function() {
    var id, ids, otherArgs, requests;
    ids = arguments[0], otherArgs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    requests = (function() {
      var _i, _len, _ref, _results;
      _results = [];
      for (_i = 0, _len = ids.length; _i < _len; _i++) {
        id = ids[_i];
        if (id in this._resourcesCache && otherArgs.length === 0) {
          _results.push(Promise.resolve(this._resourcesCache[id]));
        } else {
          _results.push((_ref = this._client).get.apply(_ref, [this._getURL(id)].concat(__slice.call(otherArgs))).then(function(_arg) {
            var resource;
            resource = _arg[0];
            return resource;
          }));
        }
      }
      return _results;
    }).call(this);
    return Promise.all(requests);
  };

  Type.prototype._getByQuery = function() {
    var otherArgs, query, _ref;
    query = arguments[0], otherArgs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return (_ref = this._client).get.apply(_ref, [this._getURL(), query].concat(__slice.call(otherArgs)));
  };

  Type.prototype._getURL = function() {
    return ['', this._name].concat(__slice.call(arguments)).join('/');
  };

  Type.prototype.createResource = function() {
    if (typeof console !== "undefined" && console !== null) {
      console.warn.apply(console, ['Use Type::create, not ::createResource'].concat(__slice.call(arguments)));
    }
    return this.create.apply(this, arguments);
  };

  return Type;

})(Emitter);



},{"./emitter":1,"./merge-into":4,"./resource":6}]},{},[2])(2)
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],"/lib/index.coffee":[function(require,module,exports){
module.exports = {
  auth: require('./api/auth'),
  api: require('./api/client')
};



},{"./api/auth":1,"./api/client":2}]},{},[])("/lib/index.coffee")
});