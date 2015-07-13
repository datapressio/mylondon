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

var api_server = "http://api.datapress.io";
if (false) {
  api_server="http://datastore3";
}
var resource_ids = {
  "bbox"                                   : "d62ad9f3-4a5d-410b-993a-134c57ce52ee",
  "modelled_OA_rents"                      : "c16db584-f212-439f-b735-507fe6c49955",
  "MyLondon_traveltime_to_Bank_station_OA" : "c2e9ebc1-935b-460c-9361-293398d84fe5",
  "MyLondon_postcode_OA"                   : "94baeb22-9d31-4332-95ab-84d4aaf72f22",
  "MyLondon_LOAC_area_description_text_v3" : "3848d6af-bd5e-4317-8676-bbb857f773e0",
  "MyLondon_fare_zone_OA"                  : "5ff9ce59-2a77-456a-9ecc-f8fb80660ef1",
  "MyLondonSchoolsCatchmentv2"             : "98ec0962-af1a-49ad-ac10-47606f7794da"
}

var L = require('leaflet');
// These fail due to dependant images not loading, we include the CSS in the HTML instead.
// require('../node_modules/leaflet/dist/leaflet.css');
// require('../node_modules/leaflet-minimap/dist/Control.MiniMap.min.css');
require('../node_modules/bootstrap/dist/css/bootstrap.css');
var resolveHash = require('when/keys').all;

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

var Promise = require('when').Promise;
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
// var Priorities = require('./components/drag/Priorities');
var BudgetSlider = require('./components/budgetslider/BudgetSlider');

require('./index.css')
var config = require('./config.jsx')

var request = require('superagent');

var calculate_bucket = function(boundary_scores, value) {
    // Assume best color
    var bucket = 7;
    // Now swap it for a lower value if we can
    for (var i=0; i<boundary_scores.length; i++) {
        if (value <= boundary_scores[i]) {
            bucket = i;
            break;
        }
    }
    return bucket;
};

var display_score = function(boundary_scores, value) {
    var bucket = calculate_bucket(boundary_scores, value);
    if (bucket <= 2) {
        return 'Below Average';
    } else if (bucket <= 4) {
        return 'Average';
    } else if (bucket <= 6) {
        return 'Above Average';
    } else {
        return 'Excellent';
    }
}

var getTimeToBankFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['MyLondon_traveltime_to_Bank_station_OA'],
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
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0]);
                }
            }
        });
    });
};

var getPostcodeFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['MyLondon_postcode_OA'],
            filters: JSON.stringify({OA11CD: oa})
        })
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0].PC_DIST);
                }
            }
        });
    });
};


var getAreaDescriptionFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['MyLondon_LOAC_area_description_text_v3'],
            filters: JSON.stringify({OA11CD: oa})
        })
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0]);
                }
            }
        });
    });
};

var getGeospatialFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['bbox'],
            filters: JSON.stringify({oa: oa})
        })
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0]);
                }
            }
        });
    });
};


var getRentFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['modelled_OA_rents'],
            filters: JSON.stringify({OA11CD: oa})
        })
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0]);
                }
            }
        });
    });
};

var getFareZoneFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['MyLondon_fare_zone_OA'],
            filters: JSON.stringify({OA11CD: oa})
        })
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0].Fare_Zone);
                }
            }
        });
    });
};

var getSchoolsFromOA = function(oa) {
    return new Promise(function (resolve, reject) {
        request.get(api_server+'/api/3/action/datastore_search')
        .query({
            resource_id: resource_ids['MyLondonSchoolsCatchmentv2'],
            filters: JSON.stringify({OA11CD: oa})
        })
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                if (config.debug) {
                    console.log(res.body)
                }
                if (!res.body.success) {
                    console.error('Failure reported in JSON');
                    reject(res.body);
                } else {
                    resolve(res.body.result.records[0]);
                }
            }
        });
    });
};


var getLSOAs = function(bbox_data, bbox) {
    console.log("Trying the bbox from the data: ", bbox);
    // get_shapes(cursor, screen_left, screen_bottom, screen_right, screen_top):
    return new Promise(function (resolve, reject) {
        var screen_left = parseFloat(bbox[0]);
        var screen_bottom = parseFloat(bbox[1]);
        var screen_right = parseFloat(bbox[2]);
        var screen_top = parseFloat(bbox[3]);
        var lsoas = [];
        for (var i=0; i<bbox_data.length; i++) {
            var row = bbox_data[i];
            if (
                (
                       ((screen_left <    row.left)    && (screen_right >  row.left))
                    || ((screen_left <    row.right)   && (screen_right >  row.right))
                    || ((screen_left >=   row.left)    && (screen_right <= row.right))
                ) && (
                       ((screen_bottom <  row.bottom)  && (screen_top >    row.bottom))
                    || ((screen_bottom <  row.top)     && (screen_top >    row.top))
                    || ((screen_bottom >= row.bottom)  && (screen_top <=   row.top))
                )
            ) {
                var found = false;
                for (var j=0; j<lsoas.length; j++) {
                    if (row.lsoa === lsoas[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    lsoas.push(row.lsoa);
                }
            }
        }
        // console.log(bbox, [screen_left, screen_bottom, screen_right, screen_top], lsoas);
        resolve(lsoas);
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
        request.get('https://londondatastore-upload.s3.amazonaws.com/dataset/mylondon/summary.csv')
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
                for (var i=1; i<oa_lines.length; i++) {
                    var parts = oa_lines[i].split(',');
                    if (lsoa_to_oa[parts[1]]) {
                        lsoa_to_oa[parts[1]].push(parts[0]);
                    } else {
                        lsoa_to_oa[parts[1]] = [parts[0]];
                    }
                    oa_to_lsoa[parts[0]] = parts[1];
                    summary[parts[0]] = {
                        rent: parseFloat(parts[3])/(52/12), // Per week
                        green_space: parseFloat(parts[4]),
                        transport: parseFloat(parts[5]),
                        safety: parseFloat(parts[6]),
                        //crime: 1-parseFloat(parts[6]),
                        schools: parseFloat(parts[7]),
                    };
                }
                var themes = ['safety', 'schools', 'transport', 'green_space'];
                var theme_boundaries = {};
                for (var t=0; t<themes.length; t++) {
                    var theme = themes[t];
                    var all = [];
                    for (var d in summary) {
                        if (summary.hasOwnProperty(d)) {
                            all.push(summary[d][theme]);
                        }
                    }
                    all.sort();
                    var boundary_number = all.length / 8;
                    theme_boundaries[theme] = [];
                    for (var i=1; i<8; i++) {
                        theme_boundaries[theme].push(all[parseInt(i*boundary_number)])
                    }
                }
                console.info('Individual theme boundaries: ', theme_boundaries);
                resolve({
                    theme_boundaries: theme_boundaries,
                    summary: summary,
                    lsoa_to_oa: lsoa_to_oa,
                    oa_to_lsoa: oa_to_lsoa,
                });
            }
        });
    });
};

var getBbox = function() {
    if (config.debug) {
        console.log("Fetching the bbox csv")
    }
    return new Promise(function (resolve, reject) {
        request.get('https://londondatastore-upload.s3.amazonaws.com/dataset/mylondon/bbox.csv')
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject(err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                var bbox = [];
                // var lsoas = [];
                var lines = res.text.split('\n')
                for (var i=1; i<lines.length; i++) {
                    var parts = lines[i].split(',');
                    var found = false;
                    //for (var j=0; j<lsoas.length; j++) {
                    //    if (parts[0] === lsoas[j]) {
                    //        found = true;
                    //        break;
                    //    }
                    //}
                    if (!found) {
                        // lsoas.push(parts[0]);
                        bbox.push({
                            lsoa: parts[0],
                            left: parts[2],
                            bottom: parts[3],
                            right: parts[4],
                            top: parts[5]
                        });
                    }
                }
                resolve(bbox)
            }
        });
    });
};


var getPostcodeData = function(postcode) {
    if (config.debug) {
        console.log("Querying openstreet map for a postcode: ", postcode)
    }
    return new Promise(function (resolve, reject) {
        request.get('/postcode/'+postcode)
        .end(function (err, res) {
            if (err) {
                console.error('Error:' + err);
                reject("Error looking up postcode: " + err);
            } else if (!res.ok) {
                console.error('Not OK');
                reject(res.ok);
            } else {
                resolve(res.body);
            }
        });
    });
};


var getGeometry = function(lsoa) {
    return new Promise(function (resolve, reject) {
        request.get('http://geojson.datapress.io.s3.amazonaws.com/data/'+lsoa+'.json')
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
        if (config.debug) {
            console.log('Set map ...', map);
        }
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
            boundary_scores={this.data.boundary_scores}
            theme_boundaries={this.data.theme_boundaries}
            data_updated={this.state.data_updated}
            onChangePostcode={this.onChangePostcode}
        />
    },

    componentDidMount: function () {
        //console.log('componentDidMount')
        this.data = {
            summary: null,
            oa: null,
            bbox_data: null,
            budget: null,
            boundary_scores: [],
            theme_boundaries: null,
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

    calculate_score: function(oa_data, modifiers) {
        var max_score = (modifiers.safety + modifiers.transport+modifiers.green_space + modifiers.schools);
        var total = (
            (oa_data.safety)*modifiers.safety
        ) + (
            (oa_data.transport)*modifiers.transport
        ) + (
            (oa_data.green_space)*modifiers.green_space
        ) + (
            (oa_data.schools)*modifiers.schools
        )
        return total/max_score;
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
                        if (config.debug) {
                            console.log('Clicked OA: ', this.oa);
                        }
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
                        if (config.debug) {
                            console.log('done');
                        }
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

    set_colors: function(cur_oa, layer, boundary_scores, summary, budget, colors, modifiers, weight) {
        // Need to calculate the value for every OA, so that we can assign a rank number to each
        // console.error(boundary_scores);
        for (var oa in layer.oas) {
            if (layer.oas.hasOwnProperty(oa)) {
                // console.log('Inspecting ', oa, summary, budget);
                if (!summary[oa]) {
                    // console.log('No summary data for ', oa);
                } else {
                    var data = summary[oa];
                    var borderColor = '#b200ae';
                    if (budget !== 1000 && budget < data.rent) {
                        // console.log('Budget less than rent in '+oa+', setting red');
                        if (cur_oa === oa) {
                            layer.oas[oa].setStyle({
                                stroke: true,
                                color: borderColor,
                                weight: 5,
                                fillOpacity: (0.3),
                                fillColor: '#ffffff',
                                opacity: 1,
                            });
                        } else {
                            layer.oas[oa].setStyle({
                                stroke: true,
                                color: '#0033ff',
                                weight: weight,
                                fillOpacity: (0.3),
                                fillColor: '#0033ff',
                                opacity: 0.15,
                            });
                        }
                    } else {
                        // console.log('Calculating rank for '+oa, this.calculate_rank);

                        var value = this.calculate_score(
                            data,
                            modifiers
                        );

                        var bucket = calculate_bucket(boundary_scores, value);
                        // console.error(value, bucket, colors[bucket]);
                        if (cur_oa === oa) {
                            layer.oas[oa].setStyle({
                                color: borderColor,
                                stroke: true,
                                weight: 5,
                                fillOpacity: (0.5 + (bucket/7)/3),
                                opacity: 1,
                                fillColor: '#ffffff',
                            })
                        } else {
                            layer.oas[oa].setStyle({
                                color: colors[bucket],
                                stroke: true,
                                weight: weight,
                                fillOpacity: (0.5 + (bucket/7)/3),
                                opacity: (0.5 + (bucket/7)/3),
                                fillColor: colors[bucket],
                            });
                        }
                    }
                }
            }
        }
    },


    getData(props) {
        // console.log("OA: ", props.query.oa, ',', this.data.oa);
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
            if (disabled_themes.length < 4) {
                modifiers[theme.name] = config.modifier_ratings[(4-disabled_themes.length)-1][next]/100.0;
            }
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
        console.info('Modifier values', modifiers);

        // Only start fetching the summary data if we haven't got it or started fetching it yet
        if (!objectSize(this.data.summary) && !this.data.summary_pending) {
            if (config.debug) {
                console.log('Fetching summary data', objectSize(this.data.summary), this.data.summary_pending);
            }
            this.data.summary_pending = true;
            resolveHash([getBbox(), getSummary()]).then(
                function (result) {
                    this.component.data.bbox_data = result[0];
                    this.component.data.lsoa_to_oa = result[1].lsoa_to_oa;
                    this.component.data.oa_to_lsoa = result[1].oa_to_lsoa;
                    this.component.data.summary = result[1].summary;
                    this.component.data.theme_boundaries = result[1].theme_boundaries;
                    this.component.data.summary_pending = false;
                    if (config.debug) {
                        console.log('Got summary data, getting data', this.component)
                    }
                    //console.log(this.component.data.bbox_data);
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
            if (config.debug) {
                console.log('Not processing the bbox yet', bbox, this.data.map, this.data.summary, this.data.bbox);
            }
            return
        }

        // If we are so zoomed out there is nothing to render, stop now.
        if (zoom < 13) {
            if (config.debug) {
                console.log('Too zoomed out, removing all layers');
            }
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
        if ((this.data.budget !== budget || this.data.priority !== priority_order.join('|') || this.data.disabled_themes !== disabled_themes.join('|') || this.data.oa !== props.query.oa) && this.data.summary) {
            if (config.debug) {
                console.log('The budget, disabled themes or priority have changed, re-colour the polygons');
            }
            if (this.data.priority !== priority_order.join('|') || this.data.disabled_themes !== disabled_themes.join('|')) {
                console.log("Need to re-calculate all values to be able to rank them");
                var all = [];
                for (var d in this.data.summary) {
                    if (this.data.summary.hasOwnProperty(d)) {
                        all.push(this.calculate_score(this.data.summary[d], modifiers));
                    }
                }
                all.sort();
                var boundary_number = all.length / 8;
                this.data.boundary_scores = [];
                for (var i=1; i<8; i++) {
                    this.data.boundary_scores.push(all[parseInt(i*boundary_number)])
                }
                console.info('Overall boundary scores:', this.data.boundary_scores);
            }
            for (var i=0; i<this.data.lsoas.length; i++) {
                this.set_colors(
                    props.query.oa,
                    this.data.lsoa_layers[this.data.lsoas[i]],
                    this.data.boundary_scores,
                    this.data.summary,
                    // Use the latest budget and props, not the ones at the time of the request
                    budget,
                    config.colors,
                    modifiers,
                    weight
                );
            };
            this.data.oa = props.query.oa;
            this.data.budget = budget;
            this.data.priority = priority_order.join('|')
            this.data.disabled_themes = disabled_themes.join('|')
        }


        // If nothing that would affect which polygons are displayed has changed, stop now
        if (config.debug) {
            console.log(this.data.bbox, bbox.join('|')+'|'+zoom);
        }
        if (this.data.bbox === bbox.join('|')+'|'+zoom) {
            if (config.debug) {
                console.log('No bounding box or zoom change, no changes to make to which polygons are displayed');
            }
            return;
        }

        // Otherwise, find out which LSOAs overlap the current map view, fetch and render the OA polygons they contain
        // (since LSOAs are larger than OAs, we are fetching more polygons than we actually need, but this means they
        //  are ready when the user starts to pan around the map)
        this.data.bbox = bbox.join('|')+'|'+zoom;
        if (config.debug) {
            console.log('Setting store bbox data for ', this.data.bbox);
        }
        getLSOAs(this.data.bbox_data, bbox).then(
            function (lsoas) {
                if (this.original_bbox !== this.component.data.bbox) {
                    if (config.debug) {
                        console.log('bbox doesn\'t match, ignoring the lsoa list just received');
                    }
                } else {
                    if (config.debug) {
                        console.log('The bbox has not changed since the lsoa list was requested, we can start processing lsoas');
                        console.log('Setting store completed to 0');
                        console.log('Setting the lsoas we need', lsoas);
                    }
                    this.component.data.completed = 0;
                    this.component.data.lsoas = lsoas;
                    if (config.debug) {
                        console.log('Adding any layers we already have that we now need');
                    }
                    var counter = 0;
                    var missing_lsoa_layers = [];
                    var not_pending = [];
                    for (var i=0; i<lsoas.length; i++) {
                        var lsoa = lsoas[i]
                        // console.log('Inspecting ' + lsoa);
                        if (this.component.data.lsoa_layers[lsoa]) {
                            if (config.debug) {
                                console.log('Setting the colors for ' + lsoa);
                            }
                            this.component.set_colors(
                                this.component.props.query.oa,
                                this.component.data.lsoa_layers[lsoa],
                                this.component.data.boundary_scores,
                                this.component.data.summary,
                                // Use the latest budget and props, not the ones at the time of the request
                                budget,
                                config.colors,
                                modifiers,
                                weight
                            );
                            if (config.debug) {
                                console.log('Adding ' + lsoa + ' to the map');
                            }
                            this.component.data.map.addLayer(this.component.data.lsoa_layers[lsoa]);
                            counter += 1;
                        } else {
                            missing_lsoa_layers.push(lsoa);
                            if (this.component.data.pending_lsoas.indexOf(lsoa) === -1) {
                                not_pending.push(lsoa);
                            }
                        }
                    }
                    if (config.debug) {
                        console.log('Put ' + counter + ' layers on the map');
                        console.log('Removing the layers from the map that we no longer need');
                    }
                    // Remove layers we no longer need
                    counter = 0;
                    this.component.data.map.eachLayer(function (layer) {
                        if (layer.lsoa && this.lsoas.indexOf(layer.lsoa) === -1) {
                            this.component.data.map.removeLayer(layer);
                            this.counter += 1;
                        }
                    }.bind({component: this.component, lsoas: lsoas, counter: counter}));
                    if (config.debug) {
                        console.log('Removed '+counter+' layers from the map');
                        console.log('Missing ' + missing_lsoa_layers.length + ' layers');
                        console.log(missing_lsoa_layers.length - not_pending.length + ' layers are already pending');
                        console.log('Need to fetch ' + not_pending.length + ' layers');
                    }
                    //if (not_pending.length == 0 && this.component.data.percentage == 100 ) {
                    //    // Handle zooming
                    //    this.forceUpdate();
                    //}
                    this.component.data.need_fetching_lsoas = not_pending;
                    if (this.component.data.need_fetching_lsoas == 0) {
                        if (config.debug) {
                            console.log('Nothing to fetch');
                        }
                        this.component.data.percentage = -1;
                        this.component.forceUpdate();
                    } else {
                        var nextPercentage = Math.floor(100*(1-(this.component.data.need_fetching_lsoas.length/this.component.data.lsoas.length)));
                        if (nextPercentage !== 100) {
                            this.component.data.percentage = nextPercentage;
                        } else {
                            this.component.data.percentage = 99;
                        }
                        //this.component.forceUpdate(); //setState({percentage: 0});
                        if (config.debug) {
                            console.log('Fetching the first '+config.parallel_loads+' lsoas that aren\'t in pending_lsoas and adding these to pending_lsoas');
                        }
                        for (var i=0; i<config.parallel_loads; i++) {
                            var lsoa = this.component.data.need_fetching_lsoas.shift()
                            if (!lsoa) {
                                if (config.debug) {
                                    console.log('No such lsoa', this.component.data.need_fetching_lsoas);
                                }
                            } else {
                                this.component.data.pending_lsoas.push(lsoa);
                                this.component.data.pending_lsoas_date[lsoa] = new Date();
                                if (config.debug) {
                                    console.log('Requesting geometry for '+lsoa);
                                }
                                var make_success = function () {
                                    return function(geometry) {
                                        if (config.debug) {
                                            console.log('Got geometry for ' +this.lsoa);
                                        }
                                        var lsoa = this.lsoa;
                                        if (config.debug) {
                                            console.log('Adding the layer '+lsoa+' to the layer store and removing it from pending_lsoas')
                                        }
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
                                                if (config.debug) {
                                                    console.log('Setting the layer '+ lsoa);
                                                }
                                                // console.log(L, lsoa, geometry, this.component.data.lsoa_layers);
                                                this.component.data.lsoa_layers[lsoa] = this.component.create_layer(lsoa, geometry);
                                                if (config.debug) {
                                                    console.log('Set the layer '+ lsoa);
                                                }
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
                                        if (config.debug) {
                                            console.log('Need to display a total of '+this.component.data.lsoas.length+' lsoas');
                                        }
                                        for (var i=0; i<this.component.data.lsoas.length; i++) {
                                            if (lsoa == this.component.data.lsoas[i]) {
                                                if (config.debug) {
                                                    console.log('The lsoa ' + lsoa + ' is still one we need to display');
                                                    console.log('Setting the colors for ' + lsoa);
                                                }
                                                this.component.set_colors(
                                                    this.component.props.query.oa,
                                                    this.component.data.lsoa_layers[lsoa],
                                                    this.component.data.boundary_scores,
                                                    this.component.data.summary,
                                                    // Use the latest props for the colors, not the ones at the time of the request.
                                                    budget,
                                                    config.colors,
                                                    modifiers,
                                                    weight
                                                );
                                                if (config.debug) {
                                                    console.log('Adding ' + lsoa + ' to the map');
                                                }
                                                this.component.data.map.addLayer(this.component.data.lsoa_layers[lsoa]);
                                                if (config.debug) {
                                                    console.log(this.original_bbox, this.component.data.bbox);
                                                }
                                                if (this.original_bbox !== this.component.data.bbox) {
                                                    if (config.debug) {
                                                        console.log('The bounding box has changed, not doing any further processing as the result of this promise completing.');
                                                    }
                                                } else {
                                                    if (config.debug) {
                                                        console.log('The bounding box has not changed, so we can increment the completed counter');
                                                    }
                                                    this.component.data.completed += 1;
                                                    if (this.component.data.need_fetching_lsoas.length === 0) {
                                                        if (config.debug) {
                                                            console.log('Fetching data complete, setting the percentage to 100, nothing else to do.');
                                                        }
                                                        this.component.data.percentage = 100;
                                                        this.component.data.percentage_counter += 1;
                                                        var onTimeout = function() {
                                                            if (config.debug) {
                                                                console.log(this.counter, this.component.data.percentage, this.component.data.percentage_counter);
                                                            }
                                                            if (this.component.data.percentage_counter == this.counter) {
                                                                if (config.debug) {
                                                                    console.log('Setting percentage to -1');
                                                                }
                                                                this.component.data.percentage = -1;
                                                                this.component.forceUpdate();
                                                            }
                                                        }.bind({
                                                            component: this.component,
                                                            counter: this.component.data.percentage_counter+0
                                                        })
                                                        setTimeout(onTimeout, 250)
                                                        if (config.debug) {
                                                            console.log('Set the timeout')
                                                        }
                                                        this.component.forceUpdate(); //setState({percentage: -1})
                                                        // this.forceUpdate();
                                                        // if all are completed:
                                                        //     call set state to render them, and set the percentage to 100%
                                                        //     call set state with a timeout of 400 to remove the percentage (the timeout checks that the percentage is still 100%) and that the bbox is still the same.



                                                        // Stop looping
                                                        break;
                                                    } else {
                                                        if (config.debug) {
                                                            console.log('Still '+ this.component.data.need_fetching_lsoas.length +' more losas to fetch...')// , this.component.data.completed, this.component.data.lsoas.length);
                                                        }
                                                        // if (this.components.data.lsoas.length !== 0) {
                                                             var new_percentage = Math.floor(100*(1-(this.component.data.need_fetching_lsoas.length/this.component.data.lsoas.length)));
                                                             if (new_percentage !== 100) {
                                                                 if (new_percentage > this.component.data.percentage + 6) {
                                                                     this.component.data.percentage = new_percentage;
                                                                     if (config.debug) {
                                                                         console.log('The percentage has changed enough to be worth a re-render. Now: '+new_percentage);
                                                                     }
                                                                     this.component.forceUpdate(); //setState({percentage: new_percentage})
                                                                 } else {
                                                                     if (config.debug) {
                                                                         console.log('Not updating the percentage this time');
                                                                     }
                                                                 }
                                                             } else {
                                                                 this.component.data.percentage = 99;
                                                             }
                                                        // }
                                                        // At this point we might need to fetch some more
                                                        var run_next = function() {
                                                            if (this.component.data.need_fetching_lsoas.length !== 0 && this.component.data.completed > 0 && this.component.data.completed % config.parallel_loads === 0) {
                                                                if (config.debug) {
                                                                    console.log('Fetching the first '+config.parallel_loads+' lsoas that aren\'t in pending_lsoas and adding these to pending_lsoas');
                                                                }
                                                                for (var i=0; i<config.parallel_loads; i++) {
                                                                    var lsoa = this.component.data.need_fetching_lsoas.shift()
                                                                    if (!lsoa) {
                                                                        if (config.debug) {
                                                                            console.log('No such lsoa', this.component.data.need_fetching_lsoas);
                                                                        }
                                                                    } else {
                                                                        this.component.data.pending_lsoas.push(lsoa);
                                                                        this.component.data.pending_lsoas_date[lsoa] = new Date();
                                                                        if (config.debug) {
                                                                            console.log('Requesting geometry for '+lsoa);
                                                                        }
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
                                                                        if (config.debug) {
                                                                            console.log(this.counter, this.component.data.percentage, this.component.data.percentage_counter);
                                                                        }
                                                                        if (this.component.data.percentage_counter == this.counter) {
                                                                            if (config.debug) {
                                                                                console.log('Setting percentage to -1');
                                                                            }
                                                                            this.component.data.percentage = -1;
                                                                            this.component.forceUpdate();
                                                                        }
                                                                    }.bind({
                                                                        component: this.component,
                                                                        counter: this.component.data.percentage_counter+0
                                                                    })
                                                                    setTimeout(onTimeout, 1000)
                                                                    if (config.debug) {
                                                                        console.log('Set the timeout')
                                                                    }
                                                                    this.component.forceUpdate();
                                                                }
                                                            } else {
                                                                if (config.debug) {
                                                                    console.log('Not a multiple of '+config.parallel_loads+', so we don\'t trigger the next fetch');
                                                                }
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



var Sortable = require('sortablejs');
// var SortableMixin = require('sortablejs/react-sortable-mixin.js');

//var Priorities1 = React.createClass({
//    mixins: [SortableMixin],
//
//    getInitialState: function() {
//        return {
//            items: ['One', 'Two', 'Three', 'Four']
//        };
//    },
//
//    // handleSort: function (evt) {
//    //     alert('Sorted');
//    // },
//
//    render: function() {
//        return <ul>{
//            this.state.items.map(function (text) {
//                return <li><div style={{height: "40px", color: "#ccc"}}>{text}</div></li>
//            })
//        }</ul>
//    }
//});
//
//
//// React.render(<SortableList />, document.body);



var Priorities = React.createClass({
    render() {
        return (
            <div>
                <Container
                    cards={this.props.cards}
                    disabled_themes={this.props.disabled_themes}
                    params={this.props.params}
                    query={this.props.query}
                />
            </div>
        );
    }
});

var move = function (arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            arr.push(undefined);
        }
    }
    return this; // for testing purposes
};


var Container = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },

    componentWillUnmount() {
        console.log('Unmounting...', this.sortable);
        this.sortable.destroy();
        this.sortable = null;
    },

    componentDidUpdate() {
        var curPriority = []
        this.props.cards.map(card => {
            curPriority.push(''+card.id);
        })
        console.log(curPriority)
        this.sortable.sort(curPriority);
        // console.log('Re-creating sortable... ');
        // var list = this.getDOMNode();
        // this.sortable = this.makeSortable(list);
    },

    componentDidMount() {
        console.log('First creation of sortable...');
        var list = this.getDOMNode();
        this.sortable = this.makeSortable(list);
    },

    makeSortable(list) {
        var sortable = Sortable.create(list, {
            sort: true,
            handle: ".drag-handle",
            ghostClass: "dragging",
            onEnd: function (e){
                var priority = []
                for (var i=0; i<this.props.cards.length; i++) {
                    priority.push(this.props.cards[i].id)
                }
                var moved = priority[e.oldIndex]
                console.log('Need to move:', e.oldIndex, e.newIndex, priority.join(','))
                priority.splice(e.newIndex, 0, priority.splice(e.oldIndex, 1)[0]);
                console.log('After:', priority.join(','))
                console.info('New priority order:', priority.join(','));
                var query = objectAssign({}, this.props.query, {priority: priority.join(',')});
                //console.log('Destroy sortable...')
                //this.sortable.destroy();
                this.context.router.replaceWith('map', this.props.params, query);
            }.bind(this)
        });
        return sortable;
    },

    shouldComponentUpdate(nextProps, nextState) {
        console.log('Checking for update...');
        var curPriority = []
        this.props.cards.map(card => {
            curPriority.push(card.id);
        })
	var nextPriority = []
        nextProps.cards.map(card => {
            nextPriority.push(card.id);
        })
        if (nextPriority.join(',') !== curPriority.join(',') || nextProps.disabled_themes.join(',') !== this.props.disabled_themes.join(',')) {
            console.log('Need to update...', nextProps.cards, this.props.cards);
            // if (this.sortable) {
            //     console.log('Destroying sortable', this.sortable);
            //     this.sortable.destroy();
            //     this.sortable = null;
            //     console.log('Destroyed sortable', this.sortable);
            // }
            return true;
        }
        return false;
    },

    render() {
        console.log('Rendering priorities ...');
        return (
                <ul id="priorities" className="block__list block__list_words">
                    {this.props.cards.map(card => {
                        console.log('Card '+card.id);
                        var disabled = false;
                        if (this.props.disabled_themes.indexOf(card.id) !== -1) {
                            var disabled = true;
                        }
                        // console.log('zzzzzzzzzzzzzzzzzzzz', this.props.disabled_themes, card.id, disabled)
                        return (
                            <Card key={card.id}
                                id={card.id}
                                name={card.id}
                                text={card.text}
                                value={card.value}
                                icon={card.icon}
                                disabled={disabled}
                                disabled_themes={this.props.disabled_themes}
                                params={this.props.params}
                                query={this.props.query}
                            />
                        );
                    })}
                </ul>
        );
    }
});


var Card = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },

    handleChange: function(event) {
        // console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', this.props.disabled, this.props.id);
        if (!this.props.disabled) {
            var disabled_themes = this.props.disabled_themes.slice()
            disabled_themes.push(this.props.id)
        } else {
            var disabled_themes = []
            for (var i=0; i<this.props.disabled_themes.length; i++) {
                if (this.props.disabled_themes[i] !== this.props.id) {
                    disabled_themes.push(this.props.disabled_themes[i]);
                }
            }
        }
        var query = objectAssign({}, this.props.query, {disabled_themes: disabled_themes.join(',')});
        this.context.router.transitionTo('map', this.props.params, query);
    },

    render() {
        var opacity = 1;
        var backgrounds = {
          1: '#eed645',
          2: '#96bf31',
          3: '#5da7a8',
          4: '#db6b66',
        };
        var newStyles = {
          opacity: opacity,
          background: backgrounds[this.props.id],
        }
        if (this.props.disabled) {
            newStyles['background'] = '#333';
        }
        var textStyles = {
            // background: 'none',
            // border: 0,
            cursor: 'move',
            // width: '204px',
            // textAlign: 'left',
            // outline: 'none',
            // display: 'inline-block',
        }
        var img = (<span style={{width: 20, display: 'inline-block'}}></span>);
        if (this.props.disabled) {
            textStyles['textDecoration'] = 'line-through';
        } else {
            img = (<img src={this.props.icon} style={{width: '20px', cursor: 'move'}}/>)
        }
        return (
            <li data-id={this.props.id}>
                <div style={newStyles} className="card">
                    <input
                        type="checkbox"
                        name={this.props.name}
                        checked={!this.props.disabled}
                        ref={this.props.name}
                        onChange={this.handleChange}
                        style={{position: "relative", top: "0px"}}
                    />
                    <span className="drag-handle">
                        <span style={textStyles}>{this.props.text}</span>
                        {img}
                    </span>
                </div>
            </li>
        );
    }
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
        var className = "settings slide-in"
        if (this.props.query.oa) {
            className = "settings slide-out"
        }
        return (
            <div>
               {loading}
               <div className={className} style={{
                   height: 440, //window.innerHeight - 250,
               }}>
                   <div className="h1-line left"></div>
                   <h1 className="my">MY</h1>
                   <div className="h1-line right"></div>
                   <h1 className="london">LONDON</h1>
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

    componentDidUpdate(prevProps, prevState) {
        if (config.debug) {
            console.log('Updated main', this.props.modal, this.props.query.oa, MyCity.oa);
        }
        if (this.props.summary && this.props.modal && (MyCity.oa !== this.props.query.oa)) {
            MyCity.oa = this.props.query.oa;
            MyCity.lsoa = this.props.query.lsoa;
            MyCity.plugin.onClickOA(this.props.query.oa, this.props.query.lsoa);
            MyCity.close = function() {
                var query = objectAssign({}, this.props.query, {oa: undefined, lsoa: undefined});
                this.context.router.transitionTo('map', this.props.params, query);
                MyCity.oa = undefined;
            }.bind(this);
            PopupDataFetcher.getData(this.props.query.oa, this.props.summary, this.props.theme_boundaries);
        }
    },

    render() {
        return (
            <div>
                <Map
                    params={this.props.params}
                    query={this.props.query}
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
            </div>
        )
    }
});


// XXX Maybe this shouldn't be a component
var PopupDataFetcher = {
    data: {
        oa: null,
        timeToBank: null,
        postcode: null,
        fareZone: null,
        schools: null,
        areaDescription: null,
        rent: null,
        geo: null
    },
    getData: function(oa, summary, theme_boundaries) {
        resolveHash(
            [
                getRentFromOA(oa).then(
                    function(result) {
                        this.data.rent = result;
                    }.bind(this)
                ),
                getTimeToBankFromOA(oa).then(
                    function(result) {
                        this.data.timeToBank = result;
                    }.bind(this)
                ),
                getPostcodeFromOA(oa).then(
                    function(result) {
                        this.data.postcode = result;
                    }.bind(this)
                ),
                getFareZoneFromOA(oa).then(
                    function(result) {
                        this.data.fareZone = result;
                    }.bind(this)
                ),
                getSchoolsFromOA(oa).then(
                    function(result) {
                        this.data.schools = result;
                    }.bind(this)
                ),
                getAreaDescriptionFromOA(oa).then(
                    function(result) {
                        this.data.areaDescription = result;
                    }.bind(this)
                ),
                getGeospatialFromOA(oa).then(
                    function(result) {
                        this.data.geo = result;
                    }.bind(this)
                ),
            ]
        ).then(
            function(result) {
                this.data.oa = oa;
                this.data.summary = summary[oa];
                this.data.scores = {}
                var themes = ['schools', 'green_space', 'safety', 'transport'];
                for (var t=0; t<themes.length; t++) {
                    var theme = themes[t];
                    this.data.scores[theme] = display_score(
                        theme_boundaries[theme],
                        summary[oa][theme]
                    )
                }
                MyCity.plugin.onReceiveData(this.data);
                //this.forceUpdate();
            }.bind(this)
        )
    }
};


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
