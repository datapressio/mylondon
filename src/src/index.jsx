/*
XXXXXXX Errors in success callbacks are not handled.

Done:
* Overview window
* Postcode
* OSM map layer
* Move sidebar to the side & reduce map size
* Initial load doesn't show all polygons
* Upgrade all the React code
* Performance in Firefox

Next steps:
* Discuss indivdual LSOAs vs pre-loading from the master JSON
* Discuss velocity algorithm for smooth scrolling
* Discuss data population algorithm - many sources, one source, datastore vs iframe etc

After holiday:
* Try MSOAs for higher level view
* Re-introduce styles

Cheating on:
* Individual OAs on the render - using LSOAs - Need layer groups

*/

var L = require('leaflet');
var d3 = require('d3');
// These fail due to dependant images not loading, we include the CSS in the HTML instead.
// require('../node_modules/leaflet/dist/leaflet.css');
// require('../node_modules/leaflet-minimap/dist/Control.MiniMap.min.css');
require('../node_modules/react-bootstrap-slider/node_modules/bootstrap/dist/css/bootstrap.css');


function objectSize(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var React = require('react');

// Router
var Router = require('react-router');
var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;
var RouteHandler = Router.RouteHandler;

var Promise = require('es6-promise').Promise;
var objectAssign = require('react/lib/Object.assign');

// Bootstrap
var Bootstrap = require('react-bootstrap');
var Grid = Bootstrap.Grid,
    Badge = Bootstrap.Badge,
    Button = Bootstrap.Button,
    Col = Bootstrap.Col,
    Input = Bootstrap.Input,
    OverlayMixin = Bootstrap.OverlayMixin,
    Modal = Bootstrap.Modal,
    ModalTrigger = Bootstrap.ModalTrigger,
    Row = Bootstrap.Row,
    TabbedArea = Bootstrap.TabbedArea,
    TabPane = Bootstrap.TabPane;


var throttle = require('./components/throttle');

// Our Components
var Map = require('./components/map/Map');
var Priorities = require('./components/drag/Priorities');
var BudgetSlider = require('./components/budgetslider/BudgetSlider');

require('./index.css')
var config = require('./data.jsx')

var request = require('superagent');

var HOST = 'localhost:8000'
//var HOST = '192.168.0.4:8000'
//var HOST = '10.14.3.68:8000'
//var HOST = 's26.datapress.io'


var getTimeToBank = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get('http://api.datapress.io/api/3/action/datastore_search')
        .query({
            resource_id: 'MyLondon_traveltime_to_Bank_station_OA',
            filters: JSON.stringify({OA11CD: oa})
        })
        // .withCredentials()
        // .set('Authorization', 'Bearer AuthedAuthedAuthedAuthedAuthed')
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                console.log(res.body)
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    window.result = res.body.result.records[0]
                    resolve(res.body.result.records[0]);
                }
            }
        });
    });
};
// window.getTimeToBank = getTimeToBank;


var getLSOAs = function(bbox) {
    if (config.debug) {
        console.log("Making AJAX request with this bbox: ", bbox)
    }
    return new Promise(function (resolve, reject) {
        request.get('http://'+HOST+'/bbox')
        .query({'bbox': bbox})
        // .withCredentials()
        // .set('Authorization', 'Bearer AuthedAuthedAuthedAuthedAuthed')
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                resolve(res.text.split('\n'));
            }
        });
    });
};

var rating_values = {
    "below average": 0,
    "average": 0.5,
    "above average": 0.75,
    "top 20 percent": 1,
};

var rating_to_string = {}
for (var name in rating_values) {
    if (rating_values.hasOwnProperty(name)) {
        rating_to_string[rating_values[name]] = name.charAt(0).toUpperCase() + name.slice(1);
    }
}

var getSummary = function() {
    if (config.debug) {
        console.log("Fetching the summary csv")
    }
    return new Promise(function (resolve, reject) {
        request.get('http://'+HOST+'/http/summary.csv')
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                var summary = {};
                var lsoa_to_oa = {}
                var oa_to_lsoa = {}
                var oa_lines = res.text.split('\n')
                for (var i=0; i<oa_lines.length-1; i++) {
                    var parts = oa_lines[i].split('|');
                    if (lsoa_to_oa[parts[1]]) {
                        lsoa_to_oa[parts[1]].push(parts[0]);
                    } else {
                        lsoa_to_oa[parts[1]] = [parts[0]];
                    }
                    oa_to_lsoa[parts[0]] = parts[1];
                    summary[parts[0]] = {
                        rent: parts[3]/4.0, // Per week
                        green_space: parts[4]/84.3,
                        transport: rating_values[parts[5]],
                        safety: 1-(parts[6]/6233),
                        crime: (parts[6]/6233),
                        schools: parts[7]/94.0,
                    };
                    if (config.debug && i==1) {
                        console.log('ttttttttttttttttttttttttttttttttttttt', parts[0], summary[parts[0]]);
                    }
                }
                    //    modelled_rents_oa.OA11CD
                    //  , oa_to_lsoa.LSOA11CD
                    //  , oa_to_lsoa.LAD11NM
                    //  , modelled_rents_oa.Ave_rent_1_bedroom
                    //  , openspace_oa.London_rank
                    //  , travel_oa.London_rank
                    //  , crime_oa.Crimes
                    //  , 0.5
                    //  e.g.
                    //  crime: "19"green_space: "average"rent: "2193"schools: "0.5"transport: "top 20 percent"

                resolve({
                    summary: summary,
                    lsoa_to_oa: lsoa_to_oa,
                    oa_to_lsoa: oa_to_lsoa,
                });
            }
        });
    });
};

var getPostcodeData = function(postcode) {
    if (config.debug) {
        console.log("Querying openstreet map for a postcode: ", postcode)
    }
    return new Promise(function (resolve, reject) {
        request.get('http://'+HOST+'/postcode/'+postcode)
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                // console.log(JSON.stringify(res.body));
                resolve(res.body);
            }
        });
    });
};


var getGeometry = function(lsoa) {
    return new Promise(function (resolve, reject) {
        request.get('http://'+HOST+'/lsoa_geojson/'+lsoa+'.json')
        .query({})
        // .withCredentials()
        // .set('Authorization', 'Bearer AuthedAuthedAuthedAuthedAuthed')
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                resolve(res.body);
            }
        });
    });
};


window.layer_store = {
    layers: {},
    geometry_pending: {},
    data: {},
    lsoas: [],
};


var MapData = React.createClass({

    contextTypes: {
        router: React.PropTypes.func
    },

    onChangePostcode(postcode) {
        getPostcodeData(postcode).then(
            function(data) {
                if (!data.zoom) {
                    data.zoom = 14;
                } else if (data.zoom < 13) {
                    data.zoom = 13;
                }
                var query = objectAssign({}, this.props.query, data);
                this.context.router.transitionTo('map', this.props.params, query);
            }.bind(this),
            function(data) {
                alert('Error getting postcode information.');
            }.bind(this)
        );
    },

    set_map(map) {
        console.log('Set map ...', map);
        this.data.map = map;
        this.getData(this.props);
        //this.forceUpdate();
        // console.log('Forced update');
    },

    render() {
        if (! this.state || !this.state.cards) {
            return null;
        }
        return <Main
            percentage={this.data.percentage}
            set_map={this.set_map}
            params={this.props.params}
            query={this.props.query}
            colors={config.colors}
            max={config.max}
            zoom={this.state.zoom}
            modal={this.state.modal}
            budget={this.state.budget}
            bbox={this.state.bbox}
            priority_order={this.state.priority_order}
            disabled_themes={this.state.disabled_themes}
            cards={this.state.cards}
            modifiers={this.state.modifiers}
            lsoas={this.state.lsoas}
            geometry={this.data.geometry}
            summary={this.data.summary}
            data_updated={this.state.data_updated}
            onChangePostcode={this.onChangePostcode}
        />
    },

    // shouldComponentUpdate(nextProps, nextState) {
    //     // If the URL props are the same, there is nothing to do, config won't have changed
    //     var to_check = ['zoom', 'modal', 'budget', 'bbox', 'priority_order'];
    //     for (var i=0; i<to_check.length; i++) {
    //         if (nextProps[to_check[i]] !== this.props[to_check[i]]) {
    //             return true;
    //         }
    //     }
    //     return false;
    // },

    componentDidMount: function () {
        //console.log('componentDidMount')
        this.data = {
            summary: null,
            budget: null,
            priority: null,
            bbox: null,
            map: null,
            lsoa_layers: {},
            lsoas: [],
            need_fetching_lsoas: [],
            pending_lsoas: [],
            pending_lsoas_date: {},
            completed: null,
            percentage: -1,
            percentage_counter: 1,
            oa_to_lsoa: {},
            lsoa_to_oa: {},
            summary_pending: false,
        };
        this.getData(this.props);
    },

    componentWillReceiveProps: function (newProps) {
        //console.log('componentWillReceiveProps')
        this.getData(newProps);
    },

    // throttledSetState: throttle(config.throttle, function(self, new_state) {
    //     self.setState(new_state);
    // }),

    getInitialState() {
        return {
            lsoas: [],
            data_updated: null,
        }
    },

    calculate_rank: function(colors, data, max, crime_modifier, transport_modifier, green_space_modifier, schools_modifier) {
        var max_score = max*(crime_modifier+transport_modifier+green_space_modifier+schools_modifier);
        var total = (
            (data.safety)*crime_modifier
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

    create_layer: function(lsoa, geometry) {
        // console.log('Creating layer LSOA: ', lsoa);
        var layer = L.geoJson(geometry, {});
        // console.log(layer, lsoa);
        var oas = {}
        for (var sub_layer in layer._layers) {
            if (layer._layers.hasOwnProperty(sub_layer)) {
                oas[layer._layers[sub_layer].feature.properties.OA11CD] = layer._layers[sub_layer]
                layer._layers[sub_layer].on(
                    'click',
                    function(event) {
                        console.log('Clicked OA: ', this.oa);
                        // if (config.debug) {
                        //     console.log(event.layer.feature.properties);
                        // }
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
        layer.setStyle({
            stroke: false,
            fillOpacity: 0,
        });
        //this.data.layers[lsoa] = layer;
        return layer;
    },

    set_colors: function(layer, summary, budget, colors, max, modifiers, weight) {
        // console.log('Layer OAs ', layer.oas);
        // console.log('Layer '+layer.lsoa+' has oas:', layer.oas)
        for (var oa in layer.oas) {
            if (layer.oas.hasOwnProperty(oa)) {
                // console.log('Inspecting ', oa, summary, budget);
                if (!summary[oa]) {
                    // console.log('No summary data for ', oa);
                } else {
                    var data = summary[oa];
                    if (budget !== 1000 && budget < data.rent) {
                        // console.log('Budget less than rent in '+oa+', setting red');
                        layer.oas[oa].setStyle({
                            stroke: true,
                            color: '#0033ff', //'#d9534f', // '#2E0854', // '#FFFF00', //'#d9534f', //'#0033ff',
                            weight: weight,
                            fillOpacity: (0.3),
                            opacity: 0.15,
                        });
                    } else {
                        // console.log('Calculating rank for '+oa, this.calculate_rank);
                        var rank = this.calculate_rank(
                            colors,
                            data,
                            max,
                            modifiers.crime,
                            modifiers.transport,
                            modifiers.green_space,
                            modifiers.schools
                        );
                        // console.log('Got rank for lsoa '+layer.lsoa+', oa: '+oa); //rank);
                        layer.oas[oa].setStyle({
                            color: rank.color,
                            stroke: true,
                            weight: weight,
                            fillOpacity: (0.1 + rank.value/1.3),
                            //fillOpacity: (0.3 + rank.value/1.3),
                            //opacity: (0.1 + rank.value/1.3)/4,
                        });
                    }
                }
            }
        }
    },

    getData(props) {
        // Parse URL information
        var zoom = parseInt(props.query.zoom || '15')
        var modal = props.query.oa || null;
        var budget = parseInt(props.query.budget || '450')
        if (props.query.bbox) {
            var bbox = props.query.bbox.split(',')
            bbox[0] = parseFloat(bbox[0])
            bbox[1] = parseFloat(bbox[1])
            bbox[2] = parseFloat(bbox[2])
            bbox[3] = parseFloat(bbox[3])
        } else {
            var bbox = null; // Will need to be caclulated dynamically and the URL updated
        }
        var priority_order = (props.query.priority || '1,2,3,4').split(',')
        var disabled_themes = []
        if (props.query.disabled_themes) {
            disabled_themes = props.query.disabled_themes.split(',');
            for (var i=0; i<disabled_themes.length; i++) {
                disabled_themes[i] = parseInt(disabled_themes[i]);
            }
        }
        var cards = [];
        var modifiers = {};
        var next = 0;
        for (var i=0; i<priority_order.length; i++) {
            var id = parseInt(priority_order[i]);
            var theme = config.cards[id];
            theme.disabled = false;
            modifiers[theme.name] = config.modifier_ratings[next];
            for (var j=0; j<disabled_themes.length; j++) {
                if (id === disabled_themes[j]) {
                    // console.log('yyyyyyyyyyyyyyyyyyyyyyy disabling ', id);
                    modifiers[theme.name] = 0;
                    theme.disabled = true;
                    break;
                }
            }
            if (!theme.disabled) {
                next += 1;
            }
            cards.push(theme);
        }

        // Only start fetching the summary data if we haven't got it or started fetching it yet
        if (!objectSize(this.data.summary) && !this.data.summary_pending) {
            if (config.debug) {
                console.log('Fetching summary data', objectSize(this.data.summary), this.data.summary_pending);
            }
            this.data.summary_pending = true;
            getSummary().then(
                function (data) {
                    this.component.data.lsoa_to_oa = data.lsoa_to_oa;
                    this.component.data.oa_to_lsoa = data.oa_to_lsoa;
                    this.component.data.summary = data.summary;
                    this.component.data.summary_pending = false;
                    if (config.debug) {
                        console.log('Got summary data, getting data', this.component)
                    }
                    this.component.getData(this.component.props); // Whatever is set now (for some reason props doesn't work?)
                    if (config.debug) {
                        console.log('Called getData', this.component.props.query.bbox)
                    }
                    // this.component.throttledSetState(this.component, {data_updated: new Date()});
                }.bind({component:this}),
                function(err){
                    console.error(err);
                }.bind({component: this})
            );
        }

        // Perform a render with the information we do have to get the map rendering
        this.setState({
            zoom: zoom,
            modal: modal,
            budget: budget,
            bbox: bbox,
            priority_order: priority_order,
            cards: cards,
            modifiers: modifiers,
            disabled_themes: disabled_themes,
        })

        // Choose how thick the lines around OAs should be based on the zoom level
        var weight=0;
        if (zoom < 15) {
            weight = 1;
        }

        // If we don't have all the information we need yet, there is no more to do.
        if (!(bbox && zoom && this.data.map && this.data.summary)) {
            console.log('Not processing the bbox yet', bbox, this.data.map, this.data.summary, this.data.bbox);
            return
        }

        // If we are so zoomed out there is nothing to render, stop now.
        if (zoom < 13) {
            console.log('Too zoomed out, removing all layers');
            this.data.map.eachLayer(function (layer) {
                if (layer.lsoa) {
                    this.data.map.removeLayer(layer);
                }
            }.bind(this));
            this.data.bbox = bbox.join('|')+'|'+zoom;
            this.data.lsoas = [];
            this.data.need_fetching_lsoas = [];
            //this.data.pending_lsoas = [];
            //this.data.pending_lsoas_date = {};
            this.data.completed = null;
            this.data.percentage = -1;
            return;
        }

        // Only re-colour the polygons if something that would cause their colour to change has changed
        if (this.data.budget !== budget || this.data.priority !== priority_order.join('|') || this.data.disabled_themes !== disabled_themes.join('|')) {
            console.log('The budget, disabled themes or priority have changed, re-colour the polygons');
            for (var i=0; i<this.data.lsoas.length; i++) {
                this.set_colors(
                    this.data.lsoa_layers[this.data.lsoas[i]],
                    this.data.summary,
                    // Use the latest budget and props, not the ones at the time of the request
                    budget,
                    config.colors,
                    config.max,
                    modifiers,
                    weight
                );
            };
            this.data.budget = budget;
            this.data.priority = priority_order.join('|')
            this.data.disabled_themes = disabled_themes.join('|')
        }


        // If nothing that would affect which polygons are displayed has changed, stop now
        console.log(this.data.bbox, bbox.join('|')+'|'+zoom);
        if (this.data.bbox === bbox.join('|')+'|'+zoom) {
            console.log('No bounding box or zoom change, no changes to make to which polygons are displayed');
            return;
        }

        // Otherwise, find out which LSOAs overlap the current map view, fetch and render the OA polygons they contain
        // (since LSOAs are larger than OAs, we are fetching more polygons than we actually need, but this means they
        //  are ready when the user starts to pan around the map)
        this.data.bbox = bbox.join('|')+'|'+zoom;
        console.log('Setting store bbox data for ', this.data.bbox);
        getLSOAs(bbox).then(
            function (lsoas) {
                if (this.original_bbox !== this.component.data.bbox) {
                    console.log('bbox doesn\'t match, ignoring the lsoa list just received');
                } else {
                    console.log('The bbox has not changed since the lsoa list was requested, we can start processing lsoas');
                    console.log('Setting store completed to 0');
                    this.component.data.completed = 0;
                    console.log('Setting the lsoas we need', lsoas);
                    this.component.data.lsoas = lsoas;
                    console.log('Adding any layers we already have that we now need');
                    var counter = 0;
                    var missing_lsoa_layers = [];
                    var not_pending = [];
                    for (var i=0; i<lsoas.length; i++) {
                        var lsoa = lsoas[i]
                        // console.log('Inspecting ' + lsoa);
                        if (this.component.data.lsoa_layers[lsoa]) {
                            console.log('Setting the colors for ' + lsoa);
                            this.component.set_colors(
                                this.component.data.lsoa_layers[lsoa],
                                this.component.data.summary,
                                // Use the latest budget and props, not the ones at the time of the request
                                budget,
                                config.colors,
                                config.max,
                                modifiers,
                                weight
                            );
                            console.log('Adding ' + lsoa + ' to the map');
                            this.component.data.map.addLayer(this.component.data.lsoa_layers[lsoa]);
                            counter += 1;
                        } else {
                            missing_lsoa_layers.push(lsoa);
                            if (this.component.data.pending_lsoas.indexOf(lsoa) === -1) {
                                not_pending.push(lsoa);
                            }
                        }
                    }
                    console.log('Put ' + counter + ' layers on the map');
                    console.log('Removing the layers from the map that we no longer need');
                    // Remove layers we no longer need
                    counter = 0;
                    this.component.data.map.eachLayer(function (layer) {
                        if (layer.lsoa && this.lsoas.indexOf(layer.lsoa) === -1) {
                            this.component.data.map.removeLayer(layer);
                            this.counter += 1;
                        }
                    }.bind({component: this.component, lsoas: lsoas, counter: counter}));
                    console.log('Removed '+counter+' layers from the map');
                    console.log('Missing ' + missing_lsoa_layers.length + ' layers');
                    console.log(missing_lsoa_layers.length - not_pending.length + ' layers are already pending');
                    console.log('Need to fetch ' + not_pending.length + ' layers');
                    //if (not_pending.length == 0 && this.component.data.percentage == 100 ) {
                    //    // Handle zooming
                    //    this.forceUpdate();
                    //}
                    this.component.data.need_fetching_lsoas = not_pending;
                    if (this.component.data.need_fetching_lsoas == 0) {
                        console.log('Nothing to fetch');
                        this.component.data.percentage = -1;
                        this.forceUpdate();
                    } else {
                        var nextPercentage = Math.floor(100*(1-(this.component.data.need_fetching_lsoas.length/this.component.data.lsoas.length)));
                        if (nextPercentage !== 100) {
                            this.component.data.percentage = nextPercentage;
                        } else {
                            this.component.data.percentage = 99;
                        }
                        //this.component.forceUpdate(); //setState({percentage: 0});
                        console.log('Fetching the first '+config.parallel_loads+' lsoas that aren\'t in pending_lsoas and adding these to pending_lsoas');
                        for (var i=0; i<config.parallel_loads; i++) {
                            var lsoa = this.component.data.need_fetching_lsoas.shift()
                            if (!lsoa) {
                                console.log('No such lsoa', this.component.data.need_fetching_lsoas);
                            } else {
                                this.component.data.pending_lsoas.push(lsoa);
                                this.component.data.pending_lsoas_date[lsoa] = new Date();
                                console.log('Requesting geometry for '+lsoa);

                                var make_success = function () {
                                    return function(geometry) {
                                        console.log('Got geometry for ' +this.lsoa);
                                        var lsoa = this.lsoa;
                                        console.log('Adding the layer '+lsoa+' to the layer store and removing it from pending_lsoas')
                                        var index = this.component.data.pending_lsoas.indexOf(lsoa);
                                        if (index !== -1) {
                                            // The lsoa is still in the pending list as we expect
                                            if (this.component.data.pending_lsoas_date[lsoa]) {
                                                delete this.component.data.pending_lsoas_date[lsoa]
                                            } else {
                                                console.error('The pending lsoa date was missing, carrying on anyway')
                                            }
                                            if (this.component.data.lsoa_layers[lsoa]) {
                                                console.error('The layer is now present, even though it has been fetched in this promise and was listed as pending, not setting it again');
                                            } else {
                                                console.log('Setting the layer '+ lsoa);
                                                // console.log(L, lsoa, geometry, this.component.data.lsoa_layers);
                                                this.component.data.lsoa_layers[lsoa] = this.component.create_layer(lsoa, geometry);
                                                console.log('Set the layer '+ lsoa);
                                            }
                                            this.component.data.pending_lsoas.splice(index, 1);
                                        } else {
                                            // Another call has already fulfilled the lsoa
                                            if (this.component.data.pending_lsoas_date[lsoa]) {
                                                console.error('The pending lsoa date was not missing, even though the request was fulfilled by another promise, carrying on anyway')
                                                delete this.component.data.pending_lsoas_date[lsoa];
                                            }
                                            if (!this.component.data.lsoa_layers[lsoa]) {
                                                console.error('The lsoa_layer is missing even though the request was fulfilled by another promise, we will set it anyway')
                                                this.component.data.lsoa_layers[lsoa] = this.component.create_layer(lsoa, geometry);
                                            }
                                        }
                                        // At this point, we may not even need the LSOA any more:
                                        console.log('Need to display a total of '+this.component.data.lsoas.length+' lsoas');
                                        for (var i=0; i<this.component.data.lsoas.length; i++) {
                                            if (lsoa == this.component.data.lsoas[i]) {
                                                console.log('The lsoa ' + lsoa + ' is still one we need to display');
                                                console.log('Setting the colors for ' + lsoa);
                                                this.component.set_colors(
                                                    this.component.data.lsoa_layers[lsoa],
                                                    this.component.data.summary,
                                                    // Use the latest props for the colors, not the ones at the time of the request.
                                                    budget,
                                                    config.colors,
                                                    config.max,
                                                    modifiers,
                                                    weight
                                                );
                                                console.log('Adding ' + lsoa + ' to the map');
                                                this.component.data.map.addLayer(this.component.data.lsoa_layers[lsoa]);
                                                console.log(this.original_bbox, this.component.data.bbox);
                                                if (this.original_bbox !== this.component.data.bbox) {
                                                    console.log('The bounding box has changed, not doing any further processing as the result of this promise completing.');
                                                } else {
                                                    console.log('The bounding box has not changed, so we can increment the completed counter');
                                                    this.component.data.completed += 1;
                                                    if (this.component.data.need_fetching_lsoas.length === 0) {
                                                        console.log('Fetching data complete, setting the percentage to 100, nothing else to do.');
                                                        this.component.data.percentage = 100;
                                                        this.component.data.percentage_counter += 1;
                                                        var onTimeout = function() {
                                                            console.log(this.counter, this.component.data.percentage, this.component.data.percentage_counter);
                                                            if (this.component.data.percentage_counter == this.counter) {
                                                                console.log('Setting percentage to -1');
                                                                this.component.data.percentage = -1;
                                                                this.component.forceUpdate();
                                                            }
                                                        }.bind({
                                                            component: this.component,
                                                            counter: this.component.data.percentage_counter+0
                                                        })
                                                        setTimeout(onTimeout, 250)
                                                        console.log('Set the timeout')
                                                        this.component.forceUpdate(); //setState({percentage: -1})
                                                        // this.forceUpdate();
                                                        // if all are completed:
                                                        //     call set state to render them, and set the percentage to 100%
                                                        //     call set state with a timeout of 400 to remove the percentage (the timeout checks that the percentage is still 100%) and that the bbox is still the same.



                                                        // Stop looping
                                                        break;
                                                    } else {
                                                        console.log('Still '+ this.component.data.need_fetching_lsoas.length +' more losas to fetch...')// , this.component.data.completed, this.component.data.lsoas.length);
                                                        // if (this.components.data.lsoas.length !== 0) {
                                                             var new_percentage = Math.floor(100*(1-(this.component.data.need_fetching_lsoas.length/this.component.data.lsoas.length)));
                                                             if (new_percentage !== 100) {
                                                                 if (new_percentage > this.component.data.percentage + 6) {
                                                                     this.component.data.percentage = new_percentage;
                                                                     console.log('The percentage has changed enough to be worth a re-render. Now: '+new_percentage);
                                                                     this.component.forceUpdate(); //setState({percentage: new_percentage})
                                                                 } else {
                                                                     console.log('Not updating the percentage this time');
                                                                 }
                                                             } else {
                                                                 this.component.data.percentage = 99;
                                                             }
                                                        // }
                                                        // At this point we might need to fetch some more
                                                        var run_next = function() {
                                                            if (this.component.data.need_fetching_lsoas.length !== 0 && this.component.data.completed > 0 && this.component.data.completed % config.parallel_loads === 0) {
                                                                console.log('Fetching the first '+config.parallel_loads+' lsoas that aren\'t in pending_lsoas and adding these to pending_lsoas');
                                                                for (var i=0; i<config.parallel_loads; i++) {
                                                                    var lsoa = this.component.data.need_fetching_lsoas.shift()
                                                                    if (!lsoa) {
                                                                        console.log('No such lsoa', this.component.data.need_fetching_lsoas);
                                                                    } else {
                                                                        this.component.data.pending_lsoas.push(lsoa);
                                                                        this.component.data.pending_lsoas_date[lsoa] = new Date();
                                                                        console.log('Requesting geometry for '+lsoa);
                                                                        getGeometry(lsoa).then(
                                                                            make_success().bind({'component': this.component, 'lsoa': lsoa, original_bbox: this.original_bbox}),
                                                                            failure
                                                                        );
                                                                    }
                                                                }
                                                                if (this.component.data.need_fetching_lsoas.length === 0) {// && this.component.data.percentage !== -1) {
                                                                    this.component.data.percentage = 99;
                                                                    this.component.data.percentage_counter += 1;
                                                                    var onTimeout = function() {
                                                                        console.log(this.counter, this.component.data.percentage, this.component.data.percentage_counter);
                                                                        if (this.component.data.percentage_counter == this.counter) {
                                                                            console.log('Setting percentage to -1');
                                                                            this.component.data.percentage = -1;
                                                                            this.component.forceUpdate();
                                                                        }
                                                                    }.bind({
                                                                        component: this.component,
                                                                        counter: this.component.data.percentage_counter+0
                                                                    })
                                                                    setTimeout(onTimeout, 1000)
                                                                    console.log('Set the timeout')
                                                                    this.component.forceUpdate();
                                                                }
                                                            } else {
                                                                console.log('Not a multiple of '+config.parallel_loads+', so we don\'t trigger the next fetch');
                                                            }
                                                        }.bind(this)
                                                            // if completed is a multiple of 4 and there are more to get:
                                                            //     * fetch the next 4 lsoas that aren't in pending_lsoas
                                                            // if all of them are pending -> BUG
                                                        setTimeout(run_next, 1);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                };
                                var failure = function(err){
                                    console.error('Failed to fetch the geometry. Please refresh the browser.');
                                }
                                getGeometry(lsoa).then(
                                    make_success().bind({'component': this.component, 'lsoa': lsoa, original_bbox: this.original_bbox}),
                                    failure
                                );
                            }
                        }
                    }
                    if (this.component.data.need_fetching_lsoas.length === 0) {// && this.component.data.percentage !== -1) {
                        this.component.data.percentage = 100;
                        this.component.forceUpdate();
                    }
                }
            }.bind({component:this, original_bbox: this.data.bbox}),
            function(err){
                console.error(err);
            }.bind(this)
        );
    },
});


var Panel = React.createClass({

    onSearch(e) {
        e.preventDefault();
        var postcode = this.refs.postcode.getInputDOMNode().value;
        this.props.onChangePostcode(postcode);
    },

    render() {
        if (this.props.zoom < 13) {
            var content = (
                <p>Zoom in more to see shaded regions of London.</p>
            )
        } else {
            var content = (
                <div>
                    <BudgetSlider
                        budget={this.props.budget}
                        params={this.props.params}
                        query={this.props.query}
                        min={50}
                        max={1000}
                        step={10}
                    />
                    <br />

                    <p>What is most important to you when moving to a new area?</p>
                    <p><em>(tip: drag the boxes up &amp; down the list)</em></p>

                    <Priorities
                        cards={this.props.cards}
                        disabled_themes={this.props.disabled_themes}
                        params={this.props.params}
                        query={this.props.query}
                    />
                </div>
            )
        }
        var loading = '';
        if (this.props.percentage !== -1) {
            loading = (
                <div
                    className='leaflet-bar'
                    style={{
                        zIndex: 5,
                        position: 'fixed',
                        background: '#fff',
                        bottom: '26px',
                        right: '40px',
                        padding: '5px',
                        fontSize: '11px',
                    }}
                >
                    Downloading... {this.props.percentage+'%'}
                </div>
             )
        }
        return (
            <div>
               {loading}
               <div className="settings" style={{
                   height: 400, //window.innerHeight - 250,
               }}>
                   <h2 style={{marginBottom: '19px', marginTop: '0px'}}><img src="/http/final-800.png" style={{width: '100%'}}/></h2>

                   <form onSubmit={this.onSearch}>
                       <Input ref="postcode" type='search' placeholder='Postcode' />
                   </form>

                   {content}
               </div>
           </div>
        )
    }
});


var Main = React.createClass({

    contextTypes: {
        router: React.PropTypes.func
    },

    renderModal(modal) {
        if (this.props.modal) {
            return modal
        }
    },

    hideModal() {
        var query = objectAssign({}, this.props.query, {oa: undefined, lsoa: undefined});
        this.context.router.transitionTo('map', this.props.params, query);
    },

    render() {
        var modal = this.renderModal(
            <OAPopup
                backdrop={true}
                onRequestHide={this.hideModal}
                params={this.props.params}
                query={this.props.query}
                summary={this.props.summary}
                oa={this.props.query.oa}
                lsoa={this.props.query.lsoa}
            />
        );
        return (
            <div>
                <Map
                    params={this.props.params}
                    query={this.props.query}
                    max={this.props.max}
                    bbox={this.props.bbox}
                    colors={this.props.colors}
                    modifiers={this.props.modifiers}
                    budget={this.props.budget}
                    zoom={this.props.zoom}
                    lat={this.props.query.lat}
                    lon={this.props.query.lon}
                    lsoas={this.props.lsoas}
                    geometry={this.props.geometry}
                    summary={this.props.summary}
                    cards={this.props.cards}
                    data_updated={this.props.data_updated}
                    set_map={this.props.set_map}
                />
                <Panel
                    percentage={this.props.percentage}
                    params={this.props.params}
                    query={this.props.query}
                    cards={this.props.cards}
                    disabled_themes={this.props.disabled_themes}
                    budget={this.props.budget}
                    zoom={this.props.zoom}
                    onChangePostcode={this.props.onChangePostcode}
                />
                {modal}
            </div>
        )
    }
});



var Chart = React.createClass({
    propTypes: {
        stats: React.PropTypes.array,
    },

    componentDidMount: function() {
        var el = this.getDOMNode();
        var chart = d3.select(el);
        // This is the d3 way of creating a set of classed div elements that didn't exist before
        var boxes = chart.selectAll( ".theme" ).data(this.props.stats)
            .enter()
            .append("div")
            .classed("theme", true)
        console.log(boxes)
        // Now we can change each of the themes in turn
        boxes.append("img")
            .classed("icon", true)
            .attr("src", function(d) {
                return '/http/'+d['icon'];
             });
        boxes.append("div")
            .classed("name", true)
            .html(function(d) {
                return d['name']
            });
        boxes.append("div")
            .classed("percentage", true)
            .html(function(d) {
                return d['value']+"%" }
            );
        boxes.append("div")
            .classed("bar", true)
            .append("div")
                .classed("color", true)
                .style("background-color", function(d) {
                    return d['colour']
                })
                .style("width", function(d) {
                    return 0+"px"
                 })
                .transition()
                .style("width", function(d) {
                    return (d['value']*2.4)+"px"
                 })
                .duration(600);
        boxes.append("div")
            .classed("clearfix", true);
    },

    componentDidUpdate: function() {
        var el = this.getDOMNode();
        // Re-compute the scales, and render the data points
        // nothing to do here
        // update(el, this.props.stats);
    },

    componentWillUnmount: function() {
        var el = this.getDOMNode();
        // Any clean-up would go here
        // in this example there is nothing to do
        // destroy(el);
    },

    render: function() {
        return (
            <div className="chart"></div>
        );
    }
});


var OAPopup = React.createClass({
    render: function() {
        // console.log(this.props.summary[this.props.oa])
        if (!this.props.summary || !this.props.summary[this.props.oa]) {
            return null;
        } else {
            return (
                <Modal {...this.props} bsStyle="primary" title={'Postcode: BR1, Fare Zone: 1, OA: '+this.props.query.oa} animation={false} backdrop={true}>
                    <div className="modal-body">
                        <OAPopupTabs 
                            stats={[
                                { "name" : "Number of Green Spaces",
                                  "value" : Math.round( this.props.summary[this.props.oa].green_space * 100 ),
                                  "colour": '#3fad46',
                                  "icon": "logo-green-space.png",
                                },
                                { "name" : "Public Transport",
                                  "value" : Math.round( this.props.summary[this.props.oa].transport * 100 ),
                                  "colour": '#5bc0de',
                                  "icon": "logo-transport.png",
                                },
                                { "name" : "Schools",
                                  "value" : Math.round( this.props.summary[this.props.oa].schools * 100 ),
                                  "colour": '#f0ad4e',
                                  "icon": "logo-schools.png",
                                },
                                { "name" : "Safety",
                                  "value" : Math.round( this.props.summary[this.props.oa].safety * 100 ),
                                  "colour": '#d9534f',
                                  "icon": "logo-crime.png",
                                }
                            ]}
                        />
                    </div>
                    <div className="modal-footer">
                        <Button onClick={this.props.onRequestHide}>Close</Button>
                    </div>
                </Modal>
            );
        }
    }
});


var OAPopupTabs = React.createClass({
    getInitialState() {
        return {
            key: 1
        };
    },

    handleSelect(key) {
        // alert('selected ' + key);
        this.setState({key});
    },

    render() {
        return (
            <TabbedArea activeKey={this.state.key} onSelect={this.handleSelect}>
                <TabPane eventKey={1} tab='Chart'>
                    <Chart stats={this.props.stats} />
                </TabPane>
                <TabPane eventKey={2} tab='Description'>
                    <p>Many of the residents of these neighbourhoods are employed in the financial, insurance and real estate industries, or are information and communications industry professionals engaged in a range of scientific and technical activities. Residents are more likely than average to be White.</p>
                    <h2>General_description</h2>
                    <p>This Group comprises young professionals working in the science, technology, finance and insurance sectors. Additionally, large numbers of students rent rooms in centrally located communal establishments. Most others rent privately owned flats, large numbers of which are found in central locations. There is high representation from pre 2001 EU countries, and also high representation of households from Chinese, Arab and other minority backgrounds.</p>

                </TabPane>
                <TabPane eventKey={3} tab='Travel to Bank'>
                    <pre>
driving_distance_miles: "0.99",
<br/>walking_time_mins: "14",
<br/>cycling_distance_miles: "0.98",
<br/>walking_distance_miles: "0.73",
<br/>public_transport_time_mins: "14",
<br/>driving_time_mins: "7",
<br/>cycling_time_mins: "7",
                    </pre>
                </TabPane>
                <TabPane eventKey={4} tab='Schools'>
<pre>
SSchool2Percent: "15",
<br/>PSchool1Percent: "82",
<br/>PSchoolName3: "no data",
<br/>PSchoolName2: "no data",
<br/>PSchoolName1: "Prior Weston Primary School and Children's Centre",
<br/>SSchoolName1: "Haggerston School",
<br/>SSchoolName2: "The City Academy, Hackney",
<br/>SSchoolName3: "no data",
<br/>PSchool2Percent: "no data",
<br/>PSchool3Percent: "no data",
<br/>SSchool1Percent: "19",
<br/>SSchool3Percent: "no data"
</pre>
                </TabPane>
            </TabbedArea>
        );
    }
});


                // .html(function(d) {
                //     return '<div id="tsc">Click for cycling distance to bank in miles</div>';
                // })
        // document.getElementById('tsc').onclick = function(e) {
        //     getTimeToBank(this.props.oa).then(
        //         function(result) {
        //             alert(result.cycling_distance_miles);
        //         }
        //     )
        // }.bind(this);

var App = React.createClass({

    render() {
        return (
            <RouteHandler
                params={this.props.params}
                query={this.props.query}
            />
        );
    }
});


var routes = (
    <Route name="app" path="/" handler={App}>
        <DefaultRoute name="map" handler={MapData}>
        </DefaultRoute>
    </Route>
);


Router.run(routes, function (Handler, router_state) {
    var props = {
        params: router_state.params,
        query: router_state.query
    }
    React.render(
        React.createElement(
            Handler,
            props
        ),
        document.getElementById("App")
    );
});

module.exports = routes;
