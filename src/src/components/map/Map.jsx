var React = require('react');
var Router = require('react-router');

var config = require('../../data.jsx')
require('./map.css');
require('leaflet-minimap');

var objectAssign = require('react/lib/Object.assign');

function objectSize(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
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
  
    // calculate_rank: function(colors, data, max, crime_modifier, transport_modifier, green_space_modifier, schools_modifier) {
    //     var max_score = max*(crime_modifier+transport_modifier+green_space_modifier+schools_modifier);
    //     var total = (
    //         (data.crime)*crime_modifier
    //     ) + (
    //         (data.transport)*transport_modifier
    //     ) + (
    //         (data.green_space)*green_space_modifier
    //     ) + (
    //         (data.schools)*schools_modifier
    //     )
    //     var rank = {
    //         value: total / max_score,
    //         color: '#000000',
    //     }
    //     for (var i=0; i<colors.length; i++) {
    //         if (rank.value <= (i+1)/colors.length) {
    //             rank.color = colors[i];
    //             break;
    //         }
    //     }
    //     return rank;
    // },
  
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

        // var osmAttrib='Map data &copy; OpenStreetMap contributors';
        // Note that you cannot use the same layer object again, as that will confuse the two map controls
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
        // 
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
        // Callback to the parent to set the map.
        this.props.set_map(map);
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
