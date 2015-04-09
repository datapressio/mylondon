var React = require('react');
var Router = require('react-router');

var config = require('../../data.jsx')
require('./map.css');
var L = require('leaflet');
require('leaflet-minimap');
// require('leaflet.fullscreen');
// L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images/';

var objectAssign = require('react/lib/Object.assign');
var throttle = require('../throttle');

var Map = React.createClass({
  
    contextTypes: {
        router: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            map: null,
            width: window.innerWidth,
            height: window.innerHeight,
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
        return rank;
    },
  
    componentDidMount: function() {
        if (config.debug) {
            console.log('Map component did mount')
        }
        if (this.props.lat && this.props.lon) {
            var center = [this.props.lat, this.props.lon];
            if (config.debug) {
                console.log('Got centre:', center);
            }
        } else {
            if (this.props.bbox) {
                var center = [
                    (this.props.bbox[1] + this.props.bbox[3])/2,
                    (this.props.bbox[0] + this.props.bbox[2])/2
                ]
            } else {
                var center = [51.558933462503568, -0.007437539906282 ];
            }
        }
        var map = L.map(this.getDOMNode(), {
            minZoom: 14,
            maxZoom: 18,
            zoomControl: false,
            // fullscreenControl: true,
            // fullscreenControlOptions: {
            //     position: 'topright'
            // }
        }).setView(center, this.props.zoom);

        var url='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        // var url='http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png'

        var osmAttrib='Map data &copy; OpenStreetMap contributors';
        // Note that you cannot use the same layer object again, as that will confuse the two map controls
        var osm2 = new L.TileLayer(url, {minZoom: 0, maxZoom: 11, attribution: osmAttrib });
        var miniMap = new L.Control.MiniMap(
            osm2,
            {
                zoomLevelFixed: 10,
                // autoToggleDisplay: true,
                position: 'bottomleft',
                width: 300,
                height: 220,
                // toggleDisplay: true
            }
        ).addTo(map);
        
        L.tileLayer(
            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            // 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png',
            {
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                    '© <a href="http://datapress.io">DataPress</a>',
                id: 'title-layer'
            }
        ).addTo(map);
        map.on('move', this.onMapChange);
        map.on('zoomend', this.onMapChange);
        map.on('resize', this.onMapChange);
        window.addEventListener("resize", this.handleResize);
        L.control.zoom({
             position:'bottomright'
        }).addTo(map);
        // Update the URL so that the bbox appears
        this.setState(
            {
                map: map,
            },
            function(){
                this.updateUrl();
            }.bind(this)
        );
        this.data = {
            layers: {},
        };
        this.getData(this.props);
    },

    componentWillReceiveProps: function (newProps) {
        this.getData(newProps);
    },
  
    componentWillUnmount: function() {
        this.state.map.off('move', this.onMapChange);
        this.state.map.off('zoomend', this.onMapChange);
        this.state.map.off('resize', this.onMapChange);
        this.setState({map: undefined});
        window.removeEventListener("resize", this.handleResize);
    },
  
    handleResize: function(e) {
        this.setState({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    },
  
    onMapChange: function(event) {
        this.updateUrl();
    },
  
    updateUrl: throttle(config.throttle, function() {
        var bounds = this.state.map.getBounds();
        var query = objectAssign({}, this.props.query, {
            zoom: this.state.map.getZoom(),
            bbox: bounds.getWest()+','+bounds.getSouth()+','+bounds.getEast()+','+bounds.getNorth(),
            lat: undefined,
            lon: undefined,
        });
        this.context.router.replaceWith('map', this.props.params, query);
    }),

    // sameArrays(one, two) {
    //     if (one.length !== two.length) {
    //         return false;
    //     }
    //     for (var i=0; i<one.length; i++) {
    //         if (one[i] !== two[i]) {
    //             return false;
    //         }
    //     }
    //     return true;
    // },

    getData(props) {
        if (props.lat && props.lon) {
            console.log('Setting the map view to', [props.lat, props.lon], props.zoom);
            this.state.map.setView([props.lat, props.lon], props.zoom);
            this.updateUrl();
        }
        // We aren't deleting the layers we don't need in this implementation - will this slow things down?
        if (props.lsoas.length) { // && ! this.sameArrays(this.props.lsoas, props.lsoas)) {
            if (config.debug) {
                console.log('Rendering map: '+props.lsoas.length+' lsoas');
            }
            for (var i=0; i<props.lsoas.length; i++) {
                var lsoa = props.lsoas[i];
                if (props.geometry[lsoa] && props.summary[lsoa]) {
                    if (!this.data.layers[lsoa]) {
                        var layer = L.geoJson(props.geometry[lsoa], {});
                        // Don't make the layer visible yet
                        layer.setStyle({
                            stroke: false,
                            fillOpacity: 0,
                        });
                        // // Hack the LSOA on
                        // layer.lsoa = lsoa
                        this.data.layers[lsoa] = layer;
                    }
                    var layer = this.data.layers[lsoa];
                    if (layer) {
                        var data = props.summary[lsoa];
                        var rank = this.calculate_rank(
                            props.colors,
                            data,
                            props.max,
                            props.modifiers.crime,
                            props.modifiers.transport,
                            props.modifiers.green_space,
                            props.modifiers.schools
                        );
                        // console.log(rank);
                        // layer.bindPopup('<div>LSOA: ' + lsoa + '</div>');
                        layer.on('click', function(event) { 
                            if (config.debug) {
                                console.log(event.layer.feature.properties);
                            }
                            var title = 'LSOA: ' + this.lsoa + ', OA: ' + event.layer.feature.properties.OA11CD;
                            var query = objectAssign({}, this.query, { oa: title});
                            this.component.context.router.transitionTo('map', this.params, query);
                        }.bind({component: this, lsoa: lsoa, query: props.query, params: props.params}));
                        layer.setStyle({
                            color: rank.color,
                            stroke: true,
                            fillOpacity: (0.32 + rank.value/2.2),
                        });
                        if (props.budget >= data.rent && !this.state.map.hasLayer(layer)) {
                            if (config.debug) {
                                console.log('Adding layer');
                            }
                            this.state.map.addLayer(layer);
                        } else if (props.budget < data.rent && this.state.map.hasLayer(layer)) {
                            if (config.debug) {
                                console.log('Removing layer');
                            }
                            this.state.map.removeLayer(layer);
                            layer.setStyle({
                                stroke: false,
                                fillOpacity: 0,
                            });
                        }
                    }
                }
            }
        }
    },

    render: function() {
        console.log(this.state.width, this.state.height, window.innerWidth, window.innerHeight);
        return (
            <div 
                className='map'
                style={{
                    width: this.state.width,
                    height: this.state.height,
                    position: 'fixed',
                    top:0,
                    left: 0,
                    zIndex: 1,
                }} 
            />
        )
    },


});

module.exports = Map;
