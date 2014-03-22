({
    paths: {
        'jquery': 'libs/jquery.min',
        'underscore': 'libs/underscore',
        'backbone': 'libs/backbone',
        'bootstrap': 'libs/bootstrap',
        'd3': 'libs/d3.v3'
    },

    shim: {
        'underscore': {
          exports: '_'
        },
        'backbone': {
          deps: [
          'underscore',
          'jquery'
          ],
          exports: 'Backbone'
        },
        'bootstrap': {
          deps: [
          'jquery'
          ]
        },
        'd3': {
          exports: 'd3'
        }
    },
    appDir: '../',
    baseUrl: 'js',
    dir: '../../static-build',
    modules: [
        {
            name: "main"
        }]
})