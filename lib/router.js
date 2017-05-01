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

  29 April 2017

*/

var routeParser = require('route-parser');

var errors = {
  notFound: {
    statusCode: 404,
    text: 'url could not be matched'
  }
}

function init(routeArray) {
  routeArray.forEach(function(route) {
    route.route = new routeParser(route.url);
  });
  return routeArray;
}

function setErrorResponse(status, text, type) {
  type = type || 'notFound';
  errors[type] = {
    statusCode: status,
    text: text
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
        if (route.handler) route.handler.call(this, args, callback);
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
  session = session || {};
  process.call(this, messageObj, session, routes, function(results) {
    finished(results);
  });
}

module.exports = {
  initialise: init,
  process: process,
  route: route,
  setErrorResponse: setErrorResponse
};
