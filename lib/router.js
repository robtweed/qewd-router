/*

 ----------------------------------------------------------------------------
 | qewd-router: URL Router module for QEWD Worker processes                 |
 |                                                                          |
 | Copyright (c) 2016-17 M/Gateway Developments Ltd,                        |
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

  14 August 2017

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
    route.route = new routeParser(route.url);
    if (mod) {
      name = route.url.split('/')[2];
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
        if (route.destination) destination = route.destination;
        if (route.handler) handler = route.handler;
        if (route.pathTemplate) pathTemplate = route.pathTemplate;
        break;
      }
    }
  }
  return {
    matched: matched,
    args: args,
    destination: destination,
    handler: handler,
    pathTemplate: pathTemplate
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
          console.log('*** Error occurred attempting to invoked route handler');
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
      handler.call(this, messageObj, session, send, finished);
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
  addRequestHandler: addRequestHandler
};
