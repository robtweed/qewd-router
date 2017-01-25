# qewd-router: URL Router module for QEWD Worker processes
 
Rob Tweed <rtweed@mgateway.com>  
25 January 2017, M/Gateway Developments Ltd [http://www.mgateway.com](http://www.mgateway.com)  

Twitter: @rtweed

Google Group for discussions, support, advice etc: [http://groups.google.co.uk/group/enterprise-web-developer-community](http://groups.google.co.uk/group/enterprise-web-developer-community)

## Installing

       npm install qewd-router
	   
## Using qewd-template

  *qewd-router* is designed to simplify the programming required to develop QEWD Web/REST APIs.  It has
  been built using the [*route-parser*](https://github.com/rcs/route-parser) module.

  The module has two APIs:

  - **initialise**: This initialises the router
  - **process**: This invokes the router, matching the incoming URL with the array of routed URL paths

  ### Initialising the router

  To initialise the router, you define an array of routing objects.  Each routing object defines:

  - **url**:      the URL to be matched.  It can include variable parts, indicated by a : prefix
  - **method**:   optionally the incoming request's HTTP method
  - **handler**:  the handler function that will process the incoming request

  If the method is not specified, the handler function will be invoked regardless of the incoming
  request's HTTP method.

  You should invoke the initialise() method within your QEWD API handler module's init() function, eg:

      var router = require('qewd-router');
      var routes;
      module.exports = {
        restModule: true,
        init: function() {
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
          // etc
        }
      };


  Make sure that *routes* is scoped to also be accessible within your module's handler methods, as
  shown in the above example.

  ### Specifying Router Handler Functions

  Each router object for a matched URL must specify a handler method.  This must be a function with
  two arguments:

  - **args**: an argument object containing:
    - **req**:     a copy of the incoming *messageObj* request object
    - **session**: the associated QEWD Session object (if any)
  - **callback**: a callback function to be invoked on completion of the handler function

  The *args* object will also contain the value of any variable URL parameters defined in the
  routing specification.  For example, if the routing object is:

      {
        url: '/api/patients/:patientId/:heading/:sourceId',
        handler: patient.getHeadingDetail
      },

   then the handler function's *args* object will contain the actual values found in the URL for
   *patientId*, *heading* and *sourceId*.  For example, if the actual URL is:

       /api/patients/123456/allergies/abcdef

         args.patientId = 123456
         args.heading   = allergies
         args.sourceId  = abcdef


  ### Handling incoming requests using the router

  *qewd-router* is designed to be used within a QEWD back-end Web/REST service API handler function. 
  You use *qewd-router*'s *process()* method to route incoming requests to the appropriate handler method.

  The *process()* method's arguments are:

  - ** messageObj**: the incoming request message object, as provided by QEWD to the worker process
  - **session**:     if you have been able to associate an incoming request with a QEWD session, it
    should be specified with this argument.  Otherwise provide a null value or empty object
  - **routes**:      the array of routes, as created by your module's init() method (see previous)
  - **callback**:    the callback function to be invoked on completion of your handler method for
     matching URLs.

  ### Example

  How these pieces are put together is best explained using an example.  You'll find the example
  described below in the *qewd-router* module's */example* folder (it's the file *api.js*).

  First, see the earlier section (see above) on initialising the router.

  Next we'll specify the handler methods for each matching URL. For example, *patient.getListOfPatients()*:

      getListOfPatients: function(args, callback) {
        var results = {
          ran: 'patient.getListOfPatients',
          args: args
        };
        callback(results);
      }


   This function will be invoked when an incoming request is received with a url of */api/patients*

   As this is just a simple demo, we're going to just return an object the confirms that the
   method run was indeed *patient.getListOfPatients*, and we'll also echo back the *args* object in the
   response.

   Each of our handler methods should follow a similar pattern.

   Finally, we define how to handle all incoming URLs that start */api/patients*.  We do that within your
   API module's handlers object:

      handlers: {
        patients: function(messageObj, finished) {
          // handler for URLs starting /api/patients
          var session = {}; // optionally pass in a QEWD Session here
          router.process(messageObj, session, routes, function(results) {
            finished(results);
          });
        }
      }

   So each */api/patients* request will be handled by the *patients()* function, and
   will invoke the *router.process()* method.  Notice its callback function.  This is passed to
   each of your URL handler methods, and provides the means by which QEWD's *finished()* function 
   can return the results of each of your handler methods.

  Let's try it in action by using the */examples/api.js* worked example.  First, define a route 
  in your QEWD startup file:

      routes = [
        {path: '/api', module: 'qewd-router/example/api'}
      ]

  Then start/restart QEWD.  You should now be able to test the routed URLs, eg try:

      http://192.168.1.100:8080/api/patients

      (change the IP address/port to match that of your QEWD system)


  You should get back a response similar to this:

      {
        "ran": "patient.getListOfPatients",
        "args": {
            "req": {
                "type": "ewd-qoper8-express",
                "path": "/api/patients",
                "method": "GET",
                "headers": {
                    "host": "192.168.1.75:8080",
                    "connection": "keep-alive",
                    "cache-control": "max-age=0",
                    "upgrade-insecure-requests": "1",
                    "user-agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36",
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "accept-encoding": "gzip, deflate, sdch",
                    "accept-language": "en-US,en;q=0.8",
                    "if-none-match": "W/\"2a0-bUW53CY8z2f9FOgGf7ykeg\""
                },
                "params": {
                    "type": "patients"
                },
                "query": {},
                "body": {},
                "ip": "::ffff:192.168.1.74",
                "ips": [],
                "application": "api",
                "expressType": "patients"
            },
            "session": {}
        }
      }

  Try out the other routed URLs, eg:

     GET /api/patients/123456
     POST /api/patients/123456
     any method for /api/patients/123456/allergies
     any method for /api/patients/123456/allergies/abcdefg

     You'll see how the various components of the incoming request are broken out into the *args* object,
     so each of your handler functions can make use of them.  For example for the URL:

        /api/patients/123456/allergies/abcdefd

     *args* will contain:

        "args": {
          "patientId": "123456",
          "heading": "allergies",
          "sourceId": "abcdef"
        }


     So the associated handler function could make use of these, eg

       getHeadingDetail: function(args, callback) {
         var patientId = args.patientId;
         var heading = args.headings;
         var sourceId = args.sourceId;
         //  now look up the database record using these pieces of information
         //  and create the results object, then...
         callback(results);
       }

Building out logic for your QEWD Web/REST Service APIs is now a lot simpler when you use 
the *qewd-router* module.


## License

 Copyright (c) 2017 M/Gateway Developments Ltd,                           
 Redhill, Surrey UK.                                                      
 All rights reserved.                                                     
                                                                           
  http://www.mgateway.com                                                  
  Email: rtweed@mgateway.com                                               
                                                                           
                                                                           
  Licensed under the Apache License, Version 2.0 (the "License");          
  you may not use this file except in compliance with the License.         
  You may obtain a copy of the License at                                  
                                                                           
      http://www.apache.org/licenses/LICENSE-2.0                           
                                                                           
  Unless required by applicable law or agreed to in writing, software      
  distributed under the License is distributed on an "AS IS" BASIS,        
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
  See the License for the specific language governing permissions and      
   limitations under the License.      
