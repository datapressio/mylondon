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

*/


var React = require('react');

// Router
var Router = require('react-router');
var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;
var RouteHandler = Router.RouteHandler;

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

        if (bbox) {
            getLSOAs(bbox).then(
                function (lsoas) {
                    this.component.setState({lsoas: lsoas});
                    // // Remove layers we no longer need
                    // for (var i=0; i<window.layer_store.lsoas.length; i++) {
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
                    // window.layer_store.lsoas = lsoas;

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
                                        this.component.data.summary[this.lsoa] = {
                                            rent:        (Math.random()*500)-100,
                                            crime:       Math.random(),
                                            transport:   Math.random(),
                                            green_space: Math.random(),
                                            schools:     Math.random(),
                                        }
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
        return (
            <div className="settings" style={{ 
                height: window.innerHeight - 250,
            }}>

                <h2 style={{marginBottom: '19px', marginTop: '0px'}}>MyLondon </h2>

                <p>Enter a postcode to move to that area: </p>
                <form onSubmit={this.onSearch}>
                    <Input ref="postcode" type='search' placeholder='Postcode' />
                </form>

                <BudgetSlider budget={this.props.budget} /> <br />

                <p>What is most important to you when moving to a new area?</p>
                <p><em>(tip: drag the boxes up &amp; down the list)</em></p>

                <Priorities cards={this.props.cards} />
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
                    data_updated={this.props.data_updated}
                />
                <Panel
                    cards={this.props.cards}
                    budget={this.props.budget}
                    onChangePostcode={this.props.onChangePostcode}
                />
                {modal}
            </div>
        )
    }
});


var DetailPopup = React.createClass({
    render: function() {
        return (
            <Modal {...this.props} bsStyle="primary" title={this.props.query.oa} animation={false} backdrop={true}>
                <div className="modal-body">
                    <div>
                        <div className="zone">Transport: Zone 2</div> 
                           <div className="metrics"> 
                             <div className="help">
                                 <strong>Crime Rating:</strong> Statistical analysis of the number of crimes per capita in this area.
                             </div>        
                             <div className="metric">
                                 <div className="bar-container">
                                     <div className="bar" style={{height: '66.0921038500965px', 'backgroundColor': 'rgb(0, 101, 204)'}}></div>
                                     <div className="bar-tooltip">#1652 / 2500</div>
                                 </div>
                                 <div className="info">
                                     <div className="icon"><i className="fa fa-gavel"></i></div>
                                 </div>
                             </div>
                             <div className="metric">
                                 <div className="bar-container">
                                     <div className="bar" style={{height: '66.0921038500965px', 'backgroundColor': 'rgb(87, 174, 87)'}}></div>
                                     <div className="bar-tooltip">#1652 / 2500</div>
                                 </div>
                                 <div className="info">
                                     <div className="icon"><i className="fa fa-gavel"></i></div>
                                 </div>
                             </div>
                             <div className="metric">
                                 <div className="bar-container">
                                     <div className="bar" style={{height: '66.0921038500965px', 'backgroundColor': 'rgb(249, 163, 39)'}}></div>
                                     <div className="bar-tooltip">#1652 / 2500</div>
                                 </div>
                                 <div className="info">
                                     <div className="icon"><i className="fa fa-gavel"></i></div>
                                 </div>
                             </div>
                             <div className="metric">
                                 <div className="bar-container">
                                     <div className="bar" style={{height: '100px', 'backgroundColor': 'rgb(210, 72, 66)'}}></div>
                                     <div className="bar-tooltip">#1652 / 2500</div>
                                 </div>
                                 <div className="info">
                                     <div className="icon"><i className="fa fa-gavel"></i></div>
                                 </div>
                             </div>
                             <div className="description1">
                                 <h3>Super Group</h3>
                                 <p>This Super Group comprises young professionals working in the science, technology, finance and insurance sectors. Additionally, large numbers of students rent rooms in centrally located communal establishments. Most others rent privately owned flats, large numbers of which are found in central locations. Residents are disproportionately drawn from pre 2001 EU countries, and there is also high representation of households from Chinese, Arab and other minority backgrounds.</p>
                             </div>
                             <div className="description2">
                                 <h3>More Details...</h3>
                                 <p>Many of the residents of these neighbourhoods are employed in the financial, insurance and real estate industries, or are information and communications industry professionals engaged in a range of scientific and technical activities. Residents are more likely than average to be White.</p>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <Button onClick={this.props.onRequestHide}>Close</Button>
                </div>
            </Modal>
        );
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

