var React = require('react');
var Router = require('react-router');

var config = require('../../data.jsx')
require('./map.css');
var L = require('leaflet');
require('leaflet-minimap');
// require('leaflet.fullscreen');
// L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images/';

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
            minZoom: 10,
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
                width: 295,
                height: 220,
                toggleDisplay: true
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


    // Start of helpers

    shouldReCalculate(prevProps, nextProps) {
        // console.log('Should component update', prevProps.bbox, nextProps.bbox);
        // If the URL props are the same, there is nothing to do, config won't have changed
        var to_check = ['budget', 'cards'];
        for (var i=0; i<to_check.length; i++) {
            if (!prevProps[to_check[i]]) {
                console.log('No prevProps', to_check[i]);
                return true;
            }
        }
        var to_check = ['budget'];
        for (var i=0; i<to_check.length; i++) {
            if (nextProps[to_check[i]] !== prevProps[to_check[i]]) {
                console.log('Mismatch', to_check[i]);
                return true;
            }
        }
        to_check = ['cards'];
        for (var i=0; i<to_check.length; i++) {
            if (nextProps[to_check[i]].length != prevProps[to_check[i]].length) {
                return true;
            }
            for (var j=0; j<nextProps[to_check[i]].length; j++) {
                if (nextProps[to_check[i]][j] != prevProps[to_check[i]][j]) {
                    return true;
                }
            }
        }
        return false;
    },

    lsoas_have_changed: function(lsoas) {
        if ((lsoas.length > 0 && !this.data.lsoas) || (lsoas.length !== this.data.lsoas.length)) {
            return true
        }
        for (var i=0; i<lsoas.length; i++) {
            if (lsoas[i] != this.data.lsoas[i]) {
                return true;
            }
        }
        return false;
    },
    
    have_geometries: function(props) {
        for (var i=0; i<props.lsoas.length; i++) {
            var lsoa = props.lsoas[i];
            if (!(props.geometry[lsoa] && objectSize(props.summary))) {
                return false;
            }
        }
        return true;
    },

    create_layer: function(lsoa, props) {
        // console.log('Creating layer LSOA: ', lsoa);
        var layer = L.geoJson(props.geometry[lsoa], {});
        // console.log(layer, lsoa);
        var oas = {}
        for (var sub_layer in layer._layers) {
            if (layer._layers.hasOwnProperty(sub_layer)) {
                oas[layer._layers[sub_layer].feature.properties.OA11CD] = layer._layers[sub_layer]
                layer._layers[sub_layer].on(
                    'click', 
                    function(event) { 
                        console.log('Clicked OA: ', this.oa);
                        if (config.debug) {
                            console.log(event.layer.feature.properties);
                        }
                        // var title = 'LSOA: ' + this.lsoa + ', OA: ' + event.layer.feature.properties.OA11CD;
                        // title});
                        var query = objectAssign(
                            {},
                            this.component.props.query,
                            {
                                oa: this.oa, //event.layer.feature.properties.OA11CD,
                                lsoa: this.lsoa,
                            }
                        );
                        this.component.context.router.transitionTo('map', this.component.props.params, query);
                        console.log('done');
                    }.bind(
                        {
                            component: this,
                            oa: layer._layers[sub_layer].feature.properties.OA11CD,
                            lsoa: lsoa,
                        }
                    ) // We don't bind the query or params, we want to use the latest 
                ); 
            }
        }
        layer.lsoa = lsoa;
        layer.oas = oas;
        // Don't make the layer visible yet
        // layer.setStyle({
        //     stroke: false,
        //     fillOpacity: 0,
        // });
        this.data.layers[lsoa] = layer;
    },

    set_rank: function(layer, props) {
        for (var oa in layer.oas) {
            if (layer.oas.hasOwnProperty(oa)) {
                if (!props.summary[oa]) {
                    // console.log('No summary data for ', oa);
                } else {
                    // console.log(rank);
                    // layer.bindPopup('<div>LSOA: ' + lsoa + '</div>');
                    var data = props.summary[oa];
                    if (props.budget < data.rent) {
                        layer.oas[oa].setStyle({
                            stroke: false,
                            color: '#f00',
                            fillOpacity: (0.2),
                        });
                    } else {
                        var rank = this.calculate_rank(
                            props.colors,
                            data,
                            props.max,
                            props.modifiers.crime,
                            props.modifiers.transport,
                            props.modifiers.green_space,
                            props.modifiers.schools
                        );
                        layer.oas[oa].setStyle({
                            color: rank.color,
                            stroke: true,
                            fillOpacity: (0.1 + rank.value/1.3),
                        });
                    }
                }
            }
        }
    },

    getData(props) {
        if (props.lat && props.lon) {
            console.log('Setting the map view to', [props.lat, props.lon], props.zoom);
            this.state.map.setView([props.lat, props.lon], props.zoom);
            this.updateUrl();
            return;
        }
        if (!props.lsoas.length) {
            return
        }
        if (props.zoom < 14) {
            if (this.data.lsoas && this.data.lsoas.length) {
                this.state.map.eachLayer(function (layer) {
                    if (layer.lsoa) {
                        this.component.state.map.removeLayer(layer);
                    }
                }.bind({component: this, lsoas: props.lsoas}));
                this.data.lsoas = [];
            }
            return;
        }
        
        // Two types of changes here:
        // * Polygons to display have changed - i.e lsoas have changed, 
        // * Rank calculation has changed 

        if (this.lsoas_have_changed(props.lsoas)) {
            // 1. See if we have all the geometries, if not we might as well wait
            if (!this.have_geometries(props)) {
                console.log("LSOAs changed, we don't have all geometries yet though");
                return;
            }
            console.log('Rendering polygons');
            for (var i=0; i<props.lsoas.length; i++) {
                var lsoa = props.lsoas[i];
                // 2. Create new layers
                if (!this.data.layers[lsoa]) {
                    this.create_layer(lsoa, props);
                }
                // 3. Calculate the rank of all the new polygons:
                var layer = this.data.layers[lsoa];
                // 4. Add them to the map
                if (!this.state.map.hasLayer(layer)) {
                    var layer = this.data.layers[lsoa];
                    this.set_rank(layer, props);
                    this.state.map.addLayer(layer);
                }
            }
            // 5. Remove layers from the map we don't need anymore.
            this.state.map.eachLayer(function (layer) {
                if (layer.lsoa && this.lsoas.indexOf(layer.lsoa) === -1) {
                    this.component.state.map.removeLayer(layer);
                }
            }.bind({component: this, lsoas: props.lsoas}));
            this.data.lsoas = props.lsoas
        } else {
            console.log('No LSOA change');
            if (this.shouldReCalculate(this.data.props, props)) {
                console.log('Need to colour');
                // In this case we need to re-color everything
                for (var i=0; i<props.lsoas.length; i++) {
                    var lsoa = props.lsoas[i];
                    var layer = this.data.layers[lsoa];
                    this.set_rank(layer, props);
                }
                this.data.props.budget = props.budget;
                this.data.props.cards = props.cards;
            } else {
                console.log('No query change');
            }
        }


        // for (var i=0; i<props.lsoas.length; i++) {
        //     var found = false 
        //     for (var j=0; j<lsoas.length; j++) {
        //         if (lsoas[j] === window.layer_store.lsoas[i]) {
        //             found = true
        //             break
        //         }
        //     }
        //     if (!found) {
        //         // Remove any layers we no longer need 
        //         var lsoa = window.layer_store.lsoas[i]
        //         if (window.layer_store.layers[lsoa] && window.map.hasLayer(window.layer_store.layers[lsoa])) {
        //             // console.log('Removing layer ', lsoa)
        //             window.map.removeLayer(window.layer_store.layers[lsoa]);
        //             delete window.layer_store.layers[lsoa];
        //             // window.layer_store.layers[lsoa].setStyle({
        //             //     fillOpacity: 0,
        //             // });
        //         }
        //     }
        // }
        // if (props.lsoas.length) { // && ! this.sameArrays(this.props.lsoas, props.lsoas)) {
        //     if (config.debug) {
        //         console.log('Rendering map: '+props.lsoas.length+' lsoas');
        //     }
        //     var all_geometries = true;
        //     // Remove layers we no longer need
        //     this.state.map.eachLayer(function (layer) {
        //         if (layer.lsoa && this.props.lsoas.indexOf(layer.lsoa) === -1) {
        //         //    console.log('Removing layer ', layer.lsoa);
        //             this.state.map.removeLayer(layer);
        //         }
        //     }.bind(this));
        //     for (var i=0; i<props.lsoas.length; i++) {
        //         var lsoa = props.lsoas[i];
        //         // if (props.geometry[lsoa] && props.summary[lsoa]) {
        //         if (!(props.geometry[lsoa] && objectSize(props.summary))) {
        //             all_geometries = false;
        //             break;
        //         }
        //     }
        //     if (all_geometries) {
        //         if (!this.shouldReCalculate(this.data.last_updated_props, props)) { 
        //             console.log('Skipping recalculate')
        //             return
        //         } 
        //         console.log('Recalculate');
        //         for (var i=0; i<props.lsoas.length; i++) {
        //             var lsoa = props.lsoas[i];
        //             var just_created = false;


        //     }
        //     if (all_geometries) {
        //         this.data.last_updated_props = {
        //             lsoas: props.lsoas,
        //             cards: this.props.cards,
        //             budget: this.props.budget,
        //         }
        //     }
        // }
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
