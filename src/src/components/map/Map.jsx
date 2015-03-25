/** @jsx React.DOM */

var React = require('react');
var Router = require('react-router');

require('./map.css');

var _ = require('underscore');

var objectAssign = require('react/lib/Object.assign');
var throttle = require('../throttle');

var Map = React.createClass({
  mixins: [ Router.Navigation, Router.State ],

  getInitalState: function() {
      return {
          map: null,
      };
  },

  calculate_rank: function(colors, data, max, crime_modifier, transport_modifier, green_space_modifier, schools_modifier) {
      var max_score = max*(crime_modifier+transport_modifier+green_space_modifier+schools_modifier);
      var total = (
          (data.crime)*crime_modifier
      ) + (
          (data.transport)*transport_modifier
      ) + (
          (data.green_space)*green_space_modifier
      ) + (
          (data.schools)*schools_modifier
      )
      //console.log(total, max_score, crime_modifier, max);
      var rank = {
          value: total / max_score,
          color: '#000000',
      }
      for (var i=0; i<colors.length; i++) {
          if (rank.value <= (i+1)/colors.length) {
              rank.color = colors[i];
              break;
          }
      }
      console.log(rank);
      return rank;
  },

  componentDidMount: function() {
    if (this.props.bbox) {
        var center = [
            (this.props.bbox[1] + this.props.bbox[3])/2,
            (this.props.bbox[0] + this.props.bbox[2])/2
        ]
    } else {
        var center = [51.558933462503568, -0.007437539906282 ]
    }
    var map = L.map(this.getDOMNode(), {
      minZoom: 2,
      maxZoom: 20,
      zoomControl: false,
    }).setView(center, this.props.zoom); //parseInt(this.getQuery().zoom || '16'));
    // Little hacky.
    window.map = map

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
    // var delayed_event = function(event) {
    //    self = this.self
    //    window.setTimeout(
    //        function() { 
    //            self.onMapClick(event);
    //        },
    //        1500
    //    )
    // }.bind({self: this});

    //map.on('click', this.onMapClick);
    //map.on('viewreset', this.onMapClick);
    map.on('move', this.onMapClick);
    //map.on('moveend', this.onMapClick);
    map.on('zoomend', this.onMapClick);
    map.on('resize', this.onMapClick);
    L.control.zoom({
         position:'bottomright'
    }).addTo(map);
    window.addEventListener("resize", this.handleResize);
  },

  componentWillUnmount: function() {
    this.state.map.off('click', this.onMapClick);
    this.state.map = null;
  },

  onMapClick: function(event) {
    // Do some wonderful map things...
    // console.log(event);
    this.update();
  },

  update: throttle(250, function() {
    var bounds = this.state.map.getBounds();
    var query = objectAssign({}, this.getQuery(), {
        zoom: this.state.map.getZoom(),
        bbox: bounds.getWest()+','+bounds.getSouth()+','+bounds.getEast()+','+bounds.getNorth(),
    });
    // console.log(query.bbox);
    this.replaceWith('map', this.getParams(), query);
  }),

  handleResize: function(e) {
      this.setState({
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
      });
  },

  render: function() {
    console.log('Rendering map');
    var width = window.innerWidth;
    var height = window.innerHeight;
    if (this.state) {
        width = this.state.windowWidth;
        height = this.state.windowHeight;
        for (var i=0; i<window.layer_store.lsoas.length; i++) { //lsoa in window.layer_store.layers) {
            var lsoa = window.layer_store.lsoas[i];
            if (window.layer_store.layers.hasOwnProperty(lsoa)) {
                var data = window.layer_store.data[lsoa];
                if (window.layer_store.layers[lsoa]) {
                    // console.log(
                    //     this.props.modifiers.crime,
                    //     this.props.modifiers.transport,
                    //     this.props.modifiers.green_space,
                    //     this.props.modifiers.schools
                    // )
                    var rank = this.calculate_rank(
                        this.props.colors,
                        data,
                        this.props.max,
                        this.props.modifiers.crime,
                        this.props.modifiers.transport,
                        this.props.modifiers.green_space,
                        this.props.modifiers.schools
                    );
                    console.log(rank);
                    var layer = window.layer_store.layers[lsoa];
                    // console.log('Investigating layer', lsoa_layer);
                    layer.bindPopup('<div>' + Date.now() + '</div>');
                    layer.setStyle({
                        color: rank.color, //'#a1d99b',
                        stroke: true,
                        fillOpacity: (0.5 + rank.value/3),
                    });
                    if (this.props.budget >= data.rent && !this.state.map.hasLayer(layer)) {
                        console.log('Adding layer due to budget change');
                        this.state.map.addLayer(layer);
                    } else if (this.props.budget < data.rent && this.state.map.hasLayer(layer)) {
                        console.log('Removing layer due to budget change');
                        this.state.map.removeLayer(layer);
                    }
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
