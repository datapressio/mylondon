var React = require('react');
var Router = require('react-router');
var config = require('../../config.jsx')
require('./map.css');
// Doesn't load as simply leaflet-minimap
require('../../../node_modules/leaflet-minimap/dist/Control.MiniMap.min.js');
var objectAssign = require('react/lib/Object.assign');
var throttle = require('../throttle');


function objectSize(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};


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
            minZoom: 10,
            maxZoom: 18,
            zoomControl: false,
            // fullscreenControl: true,
            // fullscreenControlOptions: {
            //     position: 'topright'
            // }
        }).setView(center, this.props.zoom);

        // var url='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        // // var url='http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png'
        var url = 'http://ojw.dev.openstreetmap.org/map/tiles/rail/{z}/{x}/{y}.png'

        // Note that you cannot use the same layer object again, as that will confuse the two map controls
        // var osmAttrib='Map data &copy; OpenStreetMap contributors';
        // var osm2 = new L.TileLayer(url, {minZoom: 0, maxZoom: 11, attribution: osmAttrib });
        // var miniMap = new L.Control.MiniMap(
        //     osm2,
        //     {
        //         zoomLevelFixed: 10,
        //         // autoToggleDisplay: true,
        //         position: 'bottomleft',
        //         width: 295,
        //         height: 220,
        //         toggleDisplay: true
        //     }
        // ).addTo(map);
        L.tileLayer(
            'http://api.tiles.mapbox.com/v4/datapress.e76f92c6/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGF0YXByZXNzIiwiYSI6IjVjZWM0ZTAyYWNkODMzY2IzNWVmNjA1ZTNjNjlkYjRlIn0.HXtDPQYO24g5YIpvHgr-sg',
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
        // Callback to the parent to set the map.
        this.props.set_map(map);
        this.data = {
            layers: {},
            last_updated_props: {},
            props: {budget: this.props.budget, cards: this.props.cards},
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

    getData(props) {
        if (props.lat && props.lon) {
            console.log('Setting the map view to', [props.lat, props.lon], props.zoom);
            this.state.map.setView([props.lat, props.lon], props.zoom);
            this.updateUrl();
            return;
        }
    //    if (props.zoom < 14) {
    //        if (this.data.lsoas && this.data.lsoas.length) {
    //            this.state.map.eachLayer(function (layer) {
    //                if (layer.lsoa) {
    //                    this.component.state.map.removeLayer(layer);
    //                }
    //            }.bind({component: this, lsoas: props.lsoas}));
    //            this.data.lsoas = [];
    //        }
    //        return;
    //    }
    },

    shoudldComponentUpdate() {
        return false;
    },

    render: function() {
        // console.log(this.state.width, this.state.height, window.innerWidth, window.innerHeight);
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
