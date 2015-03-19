/** @jsx React.DOM */

var React = require('react');
var Router = require('react-router');

require('./map.css');


var Map = React.createClass({
  mixins: [ Router.Navigation, Router.State ],

  getInitalState: function() {
      return {
          map: null,
      };
  },

  componentDidMount: function() {
    var map = L.map(this.getDOMNode(), {
      minZoom: 2,
      maxZoom: 20,
    }).setView([51.558933462503568, -0.007437539906282 ], 16);
    L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        '© <a href="http://datapress.io">DataPress</a>',
      id: 'examples.map-20v6611k'
    }).addTo(map);
    this.setState({
        map: map,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
    })
    map.on('click', this.onMapClick);
    window.addEventListener("resize", this.handleResize);
  },

  componentWillUnmount: function() {
    this.state.map.off('click', this.onMapClick);
    this.state.map = null;
  },

  onMapClick: function(event) {
    // Do some wonderful map things...
    console.log(event);
  },

  handleResize: function(e) {
      // console.log(e);
      this.setState({
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
      });
  },

  render: function() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    if (this.state) {
        width = this.state.windowWidth;
        height = this.state.windowHeight;
        for (var lsoa_name in this.props.data) {
            if (this.props.data.hasOwnProperty(lsoa_name)) {
                var lsoa_data = this.props.data[lsoa_name];
                var lsoa_rank = this.props.ranks[lsoa_name];
                var lsoa_layer = this.props.layers[lsoa_name];
                
                // lsoa_layer.bindPopup('<div>' + Date.now() + '</div>');

                lsoa_layer.setStyle({
                    color: lsoa_rank.color,
                    stroke: false,
                    fillOpacity: (0.5 + lsoa_rank.rank/3),
                });
                if (this.props.budget >= lsoa_data.rent && !this.state.map.hasLayer(lsoa_layer)) {
                    console.log('Adding layer');
                    this.state.map.addLayer(lsoa_layer);
                } else if (this.props.budget < lsoa_data.rent && this.state.map.hasLayer(lsoa_layer)) {
                    console.log('Removing layer');
                    this.state.map.removeLayer(lsoa_layer);
                }
            }
        }
    }
    return (
        <div 
            className='map'
            style={{
                width: width,
                height: height,
                position: 'fixed',
                top:0,
                left: 0,
                zIndex: 1,
            }} 
        />
      );
  }
});

module.exports = Map;
