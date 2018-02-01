/*

 ----------------------------------------------------------------------------
 | qewd-router: URL Router module for QEWD Worker processes                 |
 |                                                                          |
 | Copyright (c) 2016-18 M/Gateway Developments Ltd,                        |
 | Redhill, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
 |                                                                          |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  31 January 2018

  Thanks to Ward DeBacker for addition to route syntax using (/xxx)

*/

var routeParser = require('route-parser');

var errors = {
  notFound: {
    statusCode: 404,
    text: 'url could not be matched'
  }
}

function init(routeArray, mod) {
  var router = this;
  var name;
  if (mod && typeof mod.handlers === 'undefined') {
    mod.handlers = {};
  }
  routeArray.forEach(function(route) {
    if (!route.url && route.path) route.url = route.path;
    if (!route.url) return;
    route.route = new routeParser(route.url);
    if (mod) {
      name = route.url.split('/')[2];

      // the following will remove any ()* characters
      // eg for paths like '/report/PR(/:id)'

      name = name.replace(/[()*]/g, '');

      if (!mod.handlers[name]) {
        mod.handlers[name] = function(messageObj, finished) {
          router.route.call(this, messageObj, finished, routeArray);
        }
        //console.log('added handler for ' + name);
      }
    }
  });

  return routeArray;
}

/*
function addRequestHandler(routes, mod) {
  if (mod && typeof mod.handlers === 'undefined') {
    mod.handlers = {};
  }
  var router = this;
  if (!mod.handlers.restRequest) {
    mod.handlers.restRequest = function(messageObj, session, send, finished) {
      router.handleMicroServiceRoute.call(this, routes, messageObj, session, send, finished);
    }
  }
  //console.log('restRequest handler = ' + mod.handlers.restRequest);
}
*/

function addMicroServiceHandler(routes, mod) {
  if (mod && typeof mod.handlers === 'undefined') {
    mod.handlers = {};
  }
  var router = this;
  if (!mod.handlers.restRequest) {
    mod.handlers.restRequest = function(messageObj, session, send, finished) {
      handleMicroServiceRoute.call(this, routes, messageObj, session, send, finished);
    }
  }
  //console.log('restRequest handler = ' + mod.handlers.restRequest);
}

function setErrorResponse(status, text, type) {
  type = type || 'notFound';
  errors[type] = {
    statusCode: status,
    text: text
  };
}

function hasRoute(url, method, routeArray) {
  var route;
  var args;
  var destination;
  var handler;
  var pathTemplate;
  var onResponse;
  var onRequest;
  var bypassJWTCheck;

  // remove any trailing / from path
  if (url.slice(-1) === '/') url = url.slice(0, -1);
  var matched = false;
  for (var i = 0; i < routeArray.length; i++) {
    route = routeArray[i];
    args = route.route.match(url);
    if (args !== false) {
      if (method && route.method && route.method !== method) {
        continue;
      }
      else {
        matched = true;
        //console.log('&&& qewd-router - route match found: ' + JSON.stringify(route));
        if (route.destination) destination = route.destination;
        if (route.handler) handler = route.handler;
        if (route.pathTemplate) pathTemplate = route.pathTemplate;
        if (route.onResponse) onResponse = route.onResponse;
        if (route.onRequest) onRequest = route.onRequest;
        if (route.bypassJWTCheck) bypassJWTCheck = route.bypassJWTCheck;
        break;
      }
    }
  }
  return {
    matched: matched,
    args: args,
    destination: destination,
    handler: handler,
    pathTemplate: pathTemplate,
    onResponse: onResponse,
    onRequest: onRequest,
    bypassJWTCheck: bypassJWTCheck
  };
}

function process(messageObj, session, routeArray, callback) {
  var route;
  var args;
  var url = messageObj.path;
  // remove any trailing / from path
  if (url.slice(-1) === '/') url = url.slice(0, -1);
  var matched = false;
  for (var i = 0; i < routeArray.length; i++) {
    route = routeArray[i];
    args = route.route.match(url);
    if (args !== false) {
      if (messageObj.method && route.method && route.method !== messageObj.method) {
        continue;
      }
      else {
        matched = true;
        args.req = messageObj;
        args.session = session;
        if (typeof route.handler === 'function') {
          route.handler.call(this, args, callback);
        }
        else {
          console.log('*** Error occurred attempting to invoke route handler');
          callback({error: 'Invalid router function'});
        }
        break;
      }
    }
  }
  if (!matched) {
    callback({
      error: errors.notFound.text,
      status: {
        code: errors.notFound.statusCode
      }
    });
  }
}

function route(messageObj, finished, routes, session) {
  session = session || messageObj.session || {};
  process.call(this, messageObj, session, routes, function(results) {
    finished(results);
  });
}

function handleMicroServiceRoute(routeArray, messageObj, session, send, finished) {
  var routeObj = routeArray[messageObj.pathTemplate];
  if (routeObj) {
    var handler;
    if (messageObj.method) {
      if (routeObj[messageObj.method]) handler = routeObj[messageObj.method];
      if (!handler && routeObj['ANY']) handler = routeObj['ANY'];
    }
    else {
      if (routeObj['ANY']) handler = routeObj['ANY'];
    }
    if (typeof handler === 'function') {
      //  normalise the interface so it's the same as the QEWD REST handler interface

      //handler.call(this, messageObj, session, send, finished);
      var argObj = messageObj.args;
      var args = {
        req: messageObj,
        session: session
      };
      for (var name in argObj) {
        args[name] = argObj[name];
      }
      delete args.req.args;
      var fin = function(responseObj) {
        responseObj.path = messageObj.pathTemplate;
        finished(responseObj);
      };
      handler.call(this, args, fin);
    }
    else {
      finished({
        error: 'No handler defined for incoming REST MicroService request'
      });
    }
  }
  else {
    finished({
      error: 'No routes defined for handling REST MicroService requests'
    });
  }
}

module.exports = {
  initialise: init,
  process: process,
  route: route,
  setErrorResponse: setErrorResponse,
  routeParser: routeParser,
  hasRoute: hasRoute,
  handleMicroServiceRoute: handleMicroServiceRoute,
  addMicroServiceHandler: addMicroServiceHandler
};
