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
    Row = Bootstrap.Row;

var throttle = require('./components/throttle');

// Our Components
var Map = require('./components/map/Map');
var Priorities = require('./components/drag/Priorities');
var BudgetSlider = require('./components/budgetslider/BudgetSlider');

require('./index.css')
var config = require('./data.jsx')

var request = require('superagent');

//var HOST = '159.253.149.235:17435'
//var HOST = 'localhost:8000'
var HOST = '192.168.0.4:8000'

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
                        green_space: rating_values[parts[4]],
                        transport: rating_values[parts[5]],
                        crime: 1-(parts[6]/6233),
                        schools: parts[7],
                    };
                    if (config.debug && i==1) {
                        console.log(parts[0], summary[parts[0]]);
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
        request.get('http://'+HOST+'/lsoa/'+lsoa)
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
                var query = objectAssign({}, this.props.query, data);
                this.context.router.transitionTo('map', this.props.params, query);
            }.bind(this),    
            function(data) {
                alert('Error getting postcode information.');
            }.bind(this)
        );
    },

    set_map(map) {
        console.log('Set map');
        this.data.map = map;
        this.getData(this.props);
        // this.forceUpdate();
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
        // layer.setStyle({
        //     stroke: false,
        //     fillOpacity: 0,
        // });
        //this.data.layers[lsoa] = layer;
        return layer;
    },

    set_colors: function(layer, summary, budget, colors, max, modifiers) {
        // console.log('Layer OAs ', layer.oas);
        // console.log('Layer '+layer.lsoa+' has oas:', layer.oas)
        for (var oa in layer.oas) {
            if (layer.oas.hasOwnProperty(oa)) {
                // console.log('Inspecting ', oa, summary, budget);
                if (!summary[oa]) {
                    // console.log('No summary data for ', oa);
                } else {
                    var data = summary[oa];
                    if (budget < data.rent) {
                        // console.log('Budget less than rent in '+oa+', setting red');
                        layer.oas[oa].setStyle({
                            stroke: false,
                            color: '#f00',
                            fillOpacity: (0.2),
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
                            fillOpacity: (0.1 + rank.value/1.3),
                        });
                    }
                }
            }
        }
    },

    getData(props) {
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
        var cards = [];
        var modifiers = {};
        for (var i=0; i<priority_order.length; i++) {
            var id = parseInt(priority_order[i]);
            var theme = config.cards[id]
            cards.push(theme);
            modifiers[theme.name] = config.modifier_ratings[i];
        }

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
                        console.log('Got summary data, getting data')
                    }
                    this.component.getData(props); // The latest version, not the original
                    // this.component.throttledSetState(this.component, {data_updated: new Date()});
                }.bind({component:this}),
                function(err){
                    console.error(err);
                }.bind({component: this})
            );
        }
        this.setState({
            zoom: zoom,
            modal: modal,
            budget: budget,
            bbox: bbox,
            priority_order: priority_order,
            cards: cards,
            modifiers: modifiers,
        })
        if (!(bbox && zoom && this.data.map && this.data.summary)) {
            console.log('Not processing the bbox yet'); //, bbox, this.data.map, this.data.summary, this.data.bbox);
        } else {
            if (this.data.budget !== budget || this.data.priority !== priority_order.join('|')) {
                console.log('The budget or priority have changed, re-colour the polygons');
                for (var i=0; i<this.data.lsoas.length; i++) {
                    this.set_colors(
                        this.data.lsoa_layers[this.data.lsoas[i]],
                        this.data.summary,
                        // Use the latest budget and props, not the ones at the time of the request
                        budget,
                        config.colors,
                        config.max, 
                        modifiers
                    );
                };
                this.data.budget = budget;
                this.data.priority = priority_order.join('|')
            }
            console.log(this.data.bbox, bbox.join('|')+'|'+zoom);
            if (this.data.bbox === bbox.join('|')+'|'+zoom) {
                console.log('No bounding box or zoom change, no changes to make to which polygons are displayed');
                return;
            }
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
                                    modifiers
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
                        this.component.data.need_fetching_lsoas = not_pending;
                        if (this.component.data.need_fetching_lsoas === 0) {
                            console.log('Nothing to fetch');
                        } else {
                            this.component.data.percentage = Math.floor(100*(1-(this.component.data.need_fetching_lsoas.length/this.component.data.lsoas.length)));
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
                                                        modifiers
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
                                                                 if (new_percentage === 100 || new_percentage > this.component.data.percentage + 6) {
                                                                     this.component.data.percentage = new_percentage;
                                                                     console.log('The percentage has changed enough to be worth a re-render. Now: '+new_percentage); 
                                                                     this.component.forceUpdate(); //setState({percentage: new_percentage})
                                                                 } else {
                                                                     console.log('Not updating the percentage this time');
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
                                                                        this.component.data.percentage = 100;
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
        }
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
                        params={this.props.params}
                        query={this.props.query}
                    />
                </div>
            )
        }
        var loading = '';
        if (this.props.percentage !== -1) {
            loading = '('+this.props.percentage+'%)';
        }
        return (
            <div className="settings" style={{ 
                height: 380, //window.innerHeight - 250,
            }}>
    
                <h2 style={{marginBottom: '19px', marginTop: '0px'}}>MyLondon {loading}</h2>
    
                <form onSubmit={this.onSearch}>
                    <Input ref="postcode" type='search' placeholder='Postcode' />
                </form>

                {content} 
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
        var query = objectAssign({}, this.props.query, {oa: undefined});
        this.context.router.transitionTo('map', this.props.params, query);
    },

    render() {
        var modal = this.renderModal(
            <DetailPopup
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
                    budget={this.props.budget}
                    zoom={this.props.zoom}
                    onChangePostcode={this.props.onChangePostcode}
                />
                {modal}
            </div>
        )
    }
});


var DetailPopup = React.createClass({
    render: function() {
        // console.log(this.props.summary[this.props.oa])
        if (!this.props.summary[this.props.oa]) {
            return null;
        } else {
            return (
                <Modal {...this.props} bsStyle="primary" title={'OA: '+this.props.query.oa} animation={false} backdrop={true}>
                    <div className="modal-body">
                        <table>
                          <tr>
                              <td className="key">LSOA</td>
                              <td>{this.props.lsoa}</td>
                          </tr>
                          <tr>
                              <td className="key">Average rent per week:</td>
                              <td>&pound;{this.props.summary[this.props.oa].rent}</td>
                          </tr>
                          <tr>
                              <td className="key">Green Space:</td>
                              <td>{rating_to_string[this.props.summary[this.props.oa].green_space]}</td>
                          </tr>
                          <tr>
                              <td className="key">Transport:</td>
                              <td>{rating_to_string[this.props.summary[this.props.oa].transport]}</td>
                          </tr>
                          <tr>
                              <td className="key">Crime:</td>
                              <td>{rating_to_string[this.props.summary[this.props.oa].transport]}</td>
                          </tr>
                          <tr>
                              <td className="key">Schools:</td>
                              <td>{rating_to_string[this.props.summary[this.props.oa].schools]}</td>
                          </tr>
                        </table>
                    </div>
                    <div className="modal-footer">
                        <Button onClick={this.props.onRequestHide}>Close</Button>
                    </div>
                </Modal>
            );
        }
    }
});


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

