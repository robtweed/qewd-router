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

  25 January 2017

*/


var router = require('qewd-router');
var routes;

// define simple patient function stubs 

var patient = {
  getHeadingDetail: function(args, callback) {
    var results = {
      ran: 'patient.getHeadingDetail',
      args: args
    };
    callback(results);
  },
  getHeadingTable: function(args, callback) {
    var results = {
      ran: 'patient.getHeadingTable',
      args: args
    };
    callback(results);
  },
  getDetails: function(args, callback) {
    var results = {
      ran: 'patient.getDetails',
      args: args
    };
    callback(results);
  },
  setDetails: function(args, callback) {
    var results = {
      ran: 'patient.setDetails',
      args: args
    };
    callback(results);
  },
  getListOfPatients: function(args, callback) {
    var results = {
      ran: 'patient.getListOfPatients',
      args: args
    };
    callback(results);
  }
};


module.exports = {

  restModule: true,

  init: function() {
    // define routes - important that they are in decreasing order of hierarchy
    //  if no httpMethod specified, then the matching method will be invoked 
    //   regardless of the HTTP method


    routes = [
      {
        url: '/api/patients/:patientId/:heading/:sourceId',
        handler: patient.getHeadingDetail
      },
      {
        url: '/api/patients/:patientId/:heading',
        handler: patient.getHeadingTable
      },
      {
        url: '/api/patients/:patientId',
        method: 'GET',
        handler: patient.getDetails
      },
      {
        url: '/api/patients/:patientId',
        method: 'POST',
        handler: patient.setDetails
      },
      {
        url: '/api/patients',
        handler: patient.getListOfPatients
      }
    ];

    routes = router.initialise(routes);

  },

  handlers: {
    patients: function(messageObj, finished) {

      // handler for URLs starting /api/patients

      var session = {}; // optionally pass in a QEWD Session here
      router.process(messageObj, session, routes, function(results) {
        finished(results);
      });
    }
  }

};
