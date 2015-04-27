/*
https://github.com/rackt/react-router/wiki/Announcements


*/

var React = require('react');
var Router = require('react-router');
var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;
var RouteHandler = Router.RouteHandler;
// var TestUtils = require('react/lib/ReactTestUtils'); //I like using the Test Utils, but you can just use the DOM API instead.
// var expect = require('expect');
// var App = require('../index.jsx');

var TestLocation = require('react-router/lib/locations/TestLocation');


var routes = require('../index.jsx');

describe('root', function () {
  it('renders stuff', function() {
    var tl = new TestLocation(['/?zoom=16&bbox=-0.13883113861083984%2C51.49843111450277%2C-0.10793209075927734%2C51.508114762313845&budget=1000&oa=E00015195&lsoa=E01003016&priority=1%2C2%2C3%2C4']);
    var div = document.createElement('div');
    Router.run(routes, tl, function (Handler, router_state) {
        var props = {
            params: router_state.params,
            query: router_state.query
        }  
        React.render(
            React.createElement(
                Handler,
                props
            ),
            div,
            function() {
                expect(div).toExist();
            }
        ); 
    });  
  });
});
