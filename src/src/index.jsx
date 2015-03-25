/** @jsx React.DOM */

/*
Achieved:
* Dynamic data loading
* Culling and loading algorithm
* Layer store outside of the react flow to reduce re-renders
* Optimised code flow for maximum performance

Next steps:
* Choose an update throttle interval
* Discuss indivdual LSOAs vs pre-loading from the master JSON
* Discuss velocity algorithm for smooth scrolling
* Discuss data population algorithm - many sources, one source, datastore vs iframe etc

After holiday:
* Try MSOAs for higher level view
* Re-introduce styles
*/



var React = require('react');
if (typeof window !== 'undefined') {
    // Make react tab available for Chrome dev tools
   window.React = React;
}

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
// var Progress = require('./components/progress/Progress');
// var Circle = require('./components/Circle');

// var DoughnutChart = require("react-chartjs").Doughnut;
// var circliful = require('../bower_components/circliful/js/jquery.circliful.js');


// var React = require('react');
// var ReactART = require('react-art');
// var Group = ReactART.Group;
// var Shape = ReactART.Shape;
// var Surface = ReactART.Surface;
// var Transform = ReactART.Transform;


require('./index.css')
// -    "font-awesome-webpack": "x.x.x",
// require("font-awesome-webpack");



// var Promise = require('es6-promise').Promise;
var request = require('superagent');
var _ = require('underscore');

var HOST = 'localhost:8000'

var getLSOAs = function(bbox) {
    console.log("Making AJAX request with this bbox: ", bbox)
    return new Promise(function (resolve, reject) {
        request.get('http://'+HOST+'/bbox')
        .query({'bbox': bbox})
        .withCredentials()
        .set('Authorization', 'Bearer AuthedAuthedAuthedAuthedAuthed')
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

var getGeometry = function(lsoa) {
    return new Promise(function (resolve, reject) {
        request.get('http://'+HOST+'/lsoa/'+lsoa)
        .query({})
        .withCredentials()
        .set('Authorization', 'Bearer AuthedAuthedAuthedAuthedAuthed')
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

var Config = React.createClass({
    getInitialState() {
        var config = require('./data.jsx')
        return {
            colors: config.colors,
            max: config.max,
            themes: config.cards,
            modifier_ratings: [1.5, 1, 0.75, 0.5]
        }
    },

    render() {
        return <URL
            {...this.state}
        />
    }
});


var URL = React.createClass({
    mixins: [Router.State],

    render() {
        var zoom = parseInt(this.getQuery().zoom || '15')
        var modal = this.getQuery().oa || null;
        var budget = parseInt(this.getQuery().budget || '450')
        var priority_order = (this.getQuery().priority || '1,2,3,4').split(',')
        var area = this.getParams().area;
        if (this.getQuery().bbox) {
            var bbox = this.getQuery().bbox.split(',')
            bbox[0] = parseFloat(bbox[0])
            bbox[1] = parseFloat(bbox[1])
            bbox[2] = parseFloat(bbox[2])
            bbox[3] = parseFloat(bbox[3])
        } else {
            var bbox = [-0.021071434020996094, 51.55604853764589, 0.006222724914550781, 51.5618116059672];
        }
        // console.log('URL got bbox ', bbox);
        return <Data
            {...this.props}
            zoom={zoom}
            modal={modal}
            budget={budget}
            bbox={bbox}
            priority_order={priority_order}
            area={area}
        />
    }
});

var layer_store = {
    layers: {},
    geometry_pending: {},
    data: {},
    lsoas: [],
}
window.layer_store = layer_store;

var Data = React.createClass({

    shouldComponentUpdate(nextProps, nextState) {
        // If the URL props are the same, there is nothing to do, config won't have changed
        var to_check = ['zoom', 'modal', 'budget', 'bbox', 'priority_order'];
        for (var i=0; i<to_check; i++) {
            if (nextProps[to_check[i]] !== this.props[to_check[i]]) {
                return true;
            }
        }
        return false;
    },

    getInitialState() {
        return {
            geometry_pending: {},
            data: {},
            lsoas: [],
            layers: {},
        }
    },
  
    componentDidMount: function () {
        //console.log('componentDidMount')
        this.getData(this.props);
    },

    componentWillReceiveProps: function (newProps) {
        //console.log('componentWillReceiveProps')
        this.getData(newProps);
    },

    throttleRender: throttle(250, function(self) {
        console.log('xxxxxxxxxxxxxx');
        self.forceUpdate();//this.render(); //setState({layer_store: new Date()});
    }),

    needRender() {
        this.throttleRender(this);
    },

    getData(props) {
        // The data component can't simply re-fetch all the data it needs
        // so instead it behaves like a store
        // console.log("Data update for: ", props, window.map);

        // console.log("Layers: ", window.layer_store.layers)

        // console.log("Props bbox: ", props.bbox)
        
        getLSOAs(props.bbox).then(function (lsoas) {
            console.log('Need to display '+lsoas.length+' layers'); 
            // Remove layers we no longer need
            for (var i=0; i<window.layer_store.lsoas.length; i++) {
                var found = false 
                for (var j=0; j<lsoas.length; j++) {
                    if (lsoas[j] === window.layer_store.lsoas[i]) {
                        found = true
                        break
                    }
                }
                if (!found) {
                    // Remove any layers we no longer need 
                    var lsoa = window.layer_store.lsoas[i]
                    if (window.layer_store.layers[lsoa] && window.map.hasLayer(window.layer_store.layers[lsoa])) {
                        // console.log('Removing layer ', lsoa)
                        window.map.removeLayer(window.layer_store.layers[lsoa]);
                    }
                }
            }
            // window.map.eachLayer(function (layer) {
            //     if (layer.lsoa) {
            //         found = false;
            //         for (var i=0; i<this.lsoas.length; i++) {
            //             if (layer.lsoa == this.lsoas[i]) {
            //                 found=true;
            //                 break;
            //             }
            //         }
            //         if (!found) {
            //             console.log('Found bad layer on map', layer)
            //             window.map.removeLayer(layer);
            //         }
            //     }
            // }.bind({lsoas: lsoas}));

            window.layer_store.lsoas = lsoas;

            for (var i=0; i<lsoas.length; i++) {
                var lsoa = lsoas[i]
                if (window.layer_store.layers[lsoa]) {
                    // Add any layers we have data for
                    // console.log('Adding layer ', lsoa)
                    window.map.addLayer(window.layer_store.layers[lsoa]);
                } else {
                    if (window.layer_store.geometry_pending[lsoa]) {
                        // We just have to wait for the request.
                        // console.log('Already waiting for', lsoa, window.layer_store.geometry_pending[lsoa])
                    } else {
                        // Fire off a new request
                        window.layer_store.geometry_pending[lsoa] = new Date()
                        getGeometry(lsoa).then(function(geometry) {
                            var lsoa = this.lsoa;
                            delete window.layer_store.geometry_pending[lsoa];
                            var layer = L.geoJson(geometry, {});
                            layer.lsoa = lsoa;
                            // Don't make the layer visible yet
                            layer.setStyle({
                                stroke: false,
                                fillOpacity: 0,
                            });
                            window.layer_store.layers[lsoa] = layer;
                            window.layer_store.data[lsoa] = {
                                rent:        (Math.random()*500)-100,
                                // color:      '#a1d99b',
                                // rank:        0.5,
                                crime:       Math.random(),
                                transport:   Math.random(),
                                green_space: Math.random(),
                                schools:     Math.random(),
                            }
                            // As long as we still need to display this one:
                            if (window.layer_store.lsoas.indexOf(lsoa) !== -1) {
                                // console.log('Adding just fetched layer ', window.layer_store.layers[lsoa].lsoa)
                                window.map.addLayer(window.layer_store.layers[lsoa]);
                                this.component.component.needRender();
                            }
                        }.bind({'component': this, 'lsoa': lsoa}),
                        function(err){
                            delete window.layer_store.geometry_pending[this.lsoa];
                            console.err('Failed to fetch the geometry. Please refresh the browser.');
                        }.bind({'component': this, 'lsoa': this.lsoa}));
                    }
                }
            }
            // Choices:
            //   1. Don't use react state for the layers
            //   2. Directly mutate the object in this.state.something and then call this.forceUpdate()
            //   3. Put all the keys directy into state so it doesn't matter if react doesn't re-render straight away
            //      (then delete them sneakily from this. state)
            // At this point we've done what we can immediately do
            // Let's set the state

            ////var new_lsoa_state = {
            ////    lsoas: lsoas,
            ////}
            ////console.log("New layers", new_lsoa_state)
            ////this.setState(function(state, props) { return new_lsoa_state}, function(){
            ////    console.log("new state", this.state.layers, this._pendingState)
            ////}),
            ////console.log("new state2", this.state.layers, this._pendingState)
            // Now, start fetching any of the unavailable LSOA data
            // See if we have already made an AJAX request for this 
            // data
            //this.component.forceUpdate()
            this.component.needRender();
        }.bind({component:this, bbox: props.bbox}),
        function(err){
            console.error(err);//alert('Failed to fetch the bounding box data we need. Please refresh the browser');
        }.bind(this));
    },


//            new_state.lsoas = lsoas
//            var new_layers = {}
//            for (var i=0; i<lsoas.length; i++) {
//                if (! this.state.layers[lsoas[i]]) {
//                    if (this.state.data[lsoas[i]]) {
//                        new_layers[lsoas[i]] = L.geoJson(this.state.data[lsoas[i]].geometry, {});
//                    } else {
//                        getGeometry(lsoa_name).then(function(geometry) {
//                            var new_layers = {}
//                            var new_data = {}
//                            new_layers[lsoa_name] = L.geoJson(geometry, {});
//                            new_data[lsoa_name] = {
//                                rent:       100,
//                                color:      '#a1d99b',
//                                rank:        0.5,
//                                crime:       0.1,
//                                transport:   0.1,
//                                green_space: 0.5,
//                                schools:     0.2,
//                            }
//                            var allLayers = objectAssign({}, this.state.layers, new_layers)
//                            var allData = objectAssign({}, this.state.data, new_data)
//
//                            this.setState({
//                                layers: allLayers,
//                                data: allData,
//                            });
//                            // this.bind_popups(this.state.layers, this.state.data, this.state.max);
//                        }.bind(this));
//                    }
//                }
//            }
//            var allLayers = objectAssign({}, this.state.layers, new_layers)
//            this.setState({
//                layers: allLayers,
//            });
//            // this.bind_popups(this.state.layers, this.state.data, this.state.max);
//        }.bind(this));
//    },

    render() {
        var cards = [];
        var modifiers = {};
        for (var i=0; i<this.props.priority_order.length; i++) {
            var id = parseInt(this.props.priority_order[i]);
            var theme = this.props.themes[id]
            cards.push(theme);
            modifiers[theme.name] = this.props.modifier_ratings[i];
        }
        console.log(modifiers);
        return <Main 
            {...this.props}
            layer_store={new Date()}
            cards={cards}
            modifiers={modifiers}
        />
    }



        //  var ranks = this.calculate_rank(
        //      this.props.colors,
        //      this.state.data,
        //      this.props.max,
        //      modifiers.crime_modifier,
        //      modifiers.transport_modifier,
        //      modifiers.green_space_modifier,
        //      modifiers.schools_modifier
        //  );

//    rank_to_text: function(rank) {
//        if (rank < 0.35) {
//            return 'Below average';
//        } else if (0.35 <= rank < 0.65) {
//            return 'Average';
//        } else if (0.65 <= rank < 0.8) {
//            return 'Above average';
//        } else {
//            return 'Top 20%';
//        }
//    },
//  
//  
//    bind_popups: function(layers, raw_results, max) {    
//        for (var lsoa_name in raw_results) {
//            if (raw_results.hasOwnProperty(lsoa_name)) {
//                var lsoa = raw_results[lsoa_name];
//                var layer = layers[lsoa_name];
//
//                var popupContent = "<p>Rent: &pound" + lsoa.rent + " per week in LSOA " + lsoa_name + "</p>"
//                popupContent += "<p>";
//                popupContent += "Crime Rating: " + this.rank_to_text((1 - lsoa.crime)/max) + "<br />";
//                popupContent += "Transport: "    + this.rank_to_text(lsoa.transport/max)   + "<br />";
//                popupContent += "Green Space: "  + this.rank_to_text(lsoa.green_space/max) + "<br />";
//                popupContent += "Schools: "      + this.rank_to_text(lsoa.schools/max) + "";
//                popupContent += "</p>"
//
//                // This is how you could get the HTML when the user clicks so that you could start
//                // the animations:
//                // layer.on('popupopen', function() {
//                //    alert(document.getElementsByClassName("leaflet-popup-content")[0].innerHTML)
//                // });
//                layer.bindPopup(popupContent);
//            }
//        }
//    },
//
//    //componentWillMount: function() {
//    //    // // var layers = this.make_layers(this.state.data);
//    //    // // this.bind_popups(layers, this.state.data, this.state.max);
//    //    // this.setState({
//    //    //     layers: {},
//    //    // });
//    //},
//  

})

var Main = React.createClass({
    //mixins: [Router.Navigation,  Router.State],

    renderModal(modal) {
        if (this.props.modal) {
            return modal
        }
    },

    onSearch(e) {
        e.preventDefault();
        alert('Only warren road is supported in this demo');
        this.transitionTo('map', {area: 'warren road'}, {});
    },

    render() {
        // console.log('main render')
        return (
            <Row className="show-grid">
                <Map
                    layer_store={new Date()}
                    max={this.props.max}
                    bbox={this.props.bbox}
                    colors={this.props.colors}
                    modifiers={this.props.modifiers}
                    budget={this.props.budget}
                    zoom={this.props.zoom}
                />
                <Col md={3} style={{zIndex: 2, background: '#ffffff'}}>
                    <br />
                    <form onSubmit={this.onSearch}>
                        <Input type='search' placeholder='Search' value={this.props.area} onChange={this.onSearch} />
                    </form>
                    {this.renderModal(<MyModal backdrop={true} onRequestHide={function(){
                        this.transitionTo('map', {area: 'warren road'}, {oa: null});
                     }.bind(this)} />)}
                    <BudgetSlider budget={this.props.budget} /> 
                    <h2>
                        Area profile (London rating)
                    </h2>
                    <p>What is most important to you when moving to a new area?</p>
                    <p><em>(tip: drag the boxes up &amp; down the list)</em></p>

                    <Row className="show-grid">
                        <Col md={12}>
                            <Priorities cards={this.props.cards} />
                        </Col>
                        {/*
                        // <Col md={6}>
                        //     overall, for your budget and priorities, this area is <strong>above average</strong>
                        // </Col>
                        */}
                    </Row>

                    {/*
                    // <h2>
                    //     What do you want to do next?
                    // </h2>

                    // <Button>See more information for this area</Button><br />
                    // <Button>Compare areas</Button><br />
                    // <Button>See other similar areas</Button><br />
                    // <Button>See map</Button> <br />
                    */}

                    <br />
                </Col>
                <Col md={9}>
                </Col>
            </Row>
        )
    }
});

var MyModal = React.createClass({
    render: function() {
        return (
            <Modal {...this.props} bsStyle="primary" title="Modal heading" animation={false} backdrop={true}>
                <div className="modal-body">
                    <h4>Text in a modal</h4>
                    <p>Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>

                    <h4>Popover in a modal</h4>
                    <p>TODO</p>

                    <h4>Tooltips in a modal</h4>
                    <p>TODO</p>

                    <hr />

                    <h4>Overflowing text to show scroll behavior</h4>
                    <p>Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.</p>
                    <p>Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec sed odio dui. Donec ullamcorper nulla non metus auctor fringilla.</p>
                </div>
                <div className="modal-footer">
                    <Button onClick={this.props.onRequestHide}>Close</Button>
                </div>
            </Modal>
        );
    }
});


var App = React.createClass({
    mixins: [ Router.Navigation, Router.State ],


    render() {
        var area = this.getParams().area;
        if (area) { 
            return (
                <div id="main">
                    <Grid>
                        <RouteHandler/>
                    </Grid>
                    {/*
                    // <Surface
                    //     width={700}
                    //     height={700}
                    // >
                    //     <Circle
                    //         radius={100}
                    //         stroke="green"
                    //         strokeWidth={3}
                    //         fill="blue"
                    //         transform={new Transform().translate(84.000000, 89.000000)}
                    //     />
                    // </Surface>
                    */}
                </div>
            );
        } else {
            return (
                <div id="main">
                    <Grid>
                        <Link to="map" params={{area: "Warren Road"}}>Warren Road</Link>
                    </Grid>
                </div>
            )
        }
    }
});


var routes = (
    <Route name="app" path="/" handler={App}>
        <Route name="map" path="/area/:area" handler={Config}>
            <DefaultRoute handler={Map}/>
        </Route>
    </Route>
);


Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.getElementById("App"));
});

