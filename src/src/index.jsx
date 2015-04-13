/*

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

// var HOST = '159.253.149.235:17435'
var HOST = 'localhost:8000'

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
                        console.log(parts[1], summary[parts[1]]);
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

    render() {
        if (! this.state || !this.state.cards) {
            return null;
        }
        return <Main 
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
            geometry: {},
            geometry_pending: {},
            summary: {},
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

    throttledSetState: throttle(config.throttle, function(self, new_state) {
        self.setState(new_state);
    }),


    getInitialState() {
        return {
            lsoas: [],
            data_updated: null,
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

        this.setState({
            zoom: zoom,
            modal: modal,
            budget: budget,
            bbox: bbox,
            priority_order: priority_order,
            cards: cards,
            modifiers: modifiers,
        })
        if (!objectSize(this.data.summary) && !this.data.summary_pending) {
            if (config.debug) {
                console.log('Fetching summary data', objectSize(this.data.summary), this.data.summary_pending);
            }
            this.data.summary_pending = true;
            getSummary().then(
                function (data) {
                    if (config.debug) {
                        console.log('Got summary data')
                    }
                    this.component.data.summary = data.summary;
                    this.component.data.lsoa_to_oa = data.lsoa_to_oa;
                    this.component.data.oa_to_lsoa = data.oa_to_lsoa;
                    this.component.data.summary = data.summary
                    this.component.data.summary_pending = false;
                    this.component.throttledSetState(this.component, {data_updated: new Date()});
                }.bind({component:this}),
                function(err){
                    console.error(err);
                }.bind({component: this})
            );
        }
        if (bbox) {
            getLSOAs(bbox).then(
                function (lsoas) {
                    this.component.setState({lsoas: lsoas});

                    if (config.debug) {
                        console.log('Need to display '+lsoas.length+' layers'); 
                    } 
                    for (var i=0; i<lsoas.length; i++) {
                        var lsoa = lsoas[i]
                        if (!this.component.data.geometry[lsoa] && !this.component.data.geometry_pending[lsoa]) {
                            // Fire off a new request
                            this.component.data.geometry_pending[lsoa] = true;
                            getGeometry(lsoa).then(
                                function(geometry) {
                                    // console.log('Got back data for ', this.lsoa, geometry);
                                    if (this.component.state.lsoas.indexOf(this.lsoa) !== -1) {
                                        this.component.data.geometry[this.lsoa] = geometry
                                        delete this.component.data.geometry_pending[this.lsoa];
                                        // this.component.data.summary[this.lsoa] = {
                                        //     rent:        (Math.random()*500)-100,
                                        //     crime:       Math.random(),
                                        //     transport:   Math.random(),
                                        //     green_space: Math.random(),
                                        //     schools:     Math.random(),
                                        // }
                                        this.component.throttledSetState(this.component, {data_updated: new Date()});
                                        // console.log('Set new geometry and summary for ', this.lsoa);
                                    }

                                    //// var layer = L.geoJson(geometry, {});
                                    //// layer.lsoa = lsoa;
                                    //// // Don't make the layer visible yet
                                    //// layer.setStyle({
                                    ////     stroke: false,
                                    ////     fillOpacity: 0,
                                    //// });
                                    //// window.layer_store.layers[lsoa] = layer;

                                    //// As long as we still need to display this one:
                                    //if (window.layer_store.lsoas.indexOf(lsoa) !== -1) {
                                    //    // console.log('Adding just fetched layer ', window.layer_store.layers[lsoa].lsoa)
                                    //    window.map.addLayer(window.layer_store.layers[lsoa]);
                                    //    this.component.component.needRender();
                                    //}
                                }.bind({'component': this.component, 'lsoa': lsoa}),
                                function(err){
                                    delete window.layer_store.geometry_pending[this.lsoa];
                                    console.err('Failed to fetch the geometry. Please refresh the browser.');
                                }.bind({'component': this.component, 'lsoa': lsoa})
                            );
                        }
                    }
                }.bind({component:this, bbox: props.bbox}),
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
        if (this.props.zoom < 14) {
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
        return (
            <div className="settings" style={{ 
                height: 380, //window.innerHeight - 250,
            }}>
    
                <h2 style={{marginBottom: '19px', marginTop: '0px'}}>MyLondon </h2>
    
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
                />
                <Panel
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

