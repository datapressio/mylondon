/** @jsx React.DOM */

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
require("font-awesome-webpack");



var Data = React.createClass({
    mixins: [Router.Navigation,  Router.State],
  
    getInitialState() {
        return require('./data.jsx')
    },
  
    rank_to_text: function(rank) {
        if (rank < 0.35) {
            return 'Below average';
        } else if (0.35 <= rank < 0.65) {
            return 'Average';
        } else if (0.65 <= rank < 0.8) {
            return 'Above average';
        } else {
            return 'Top 20%';
        }
    },
  
    make_layers: function(raw_results, max) {
        var layers = {}
        for (var lsoa_name in raw_results) {
            if (raw_results.hasOwnProperty(lsoa_name)) {
                layers[lsoa_name] = L.geoJson(raw_results[lsoa_name].geometry, {});
            }
        }
        return layers;
    },
  
    bind_popups: function(layers, raw_results, max) {    
        for (var lsoa_name in raw_results) {
            if (raw_results.hasOwnProperty(lsoa_name)) {
                var lsoa = raw_results[lsoa_name];
                var layer = layers[lsoa_name];

                var popupContent = "<p>Rent: &pound" + lsoa.rent + " per week</p>"
                popupContent += "<p>";
                popupContent += "Crime Rating: " + this.rank_to_text((1 - lsoa.crime)/max) + "<br />";
                popupContent += "Transport: "    + this.rank_to_text(lsoa.transport/max)   + "<br />";
                popupContent += "Green Space: "  + this.rank_to_text(lsoa.green_space/max) + "<br />";
                popupContent += "Schools: "      + this.rank_to_text(lsoa.schools/max) + "";
                popupContent += "</p>"

                // This is how you could get the HTML when the user clicks so that you could start
                // the animations:
                // layer.on('popupopen', function() {
                //    alert(document.getElementsByClassName("leaflet-popup-content")[0].innerHTML)
                // });
                layer.bindPopup(popupContent);
            }
        }
    },

    componentWillMount: function() {
        var layers = this.make_layers(this.state.data);
        this.bind_popups(layers, this.state.data, this.state.max);
        this.setState({
            layers: layers,
        });
    },
  
    calculate_rank: function(colors, raw_results, max, crime_modifier, transport_modifier, green_space_modifier, schools_modifier) {
        var results = {}
        var max_score = max*(crime_modifier+transport_modifier+green_space_modifier+schools_modifier);
        for (var lsoa_name in raw_results) {
            if (raw_results.hasOwnProperty(lsoa_name)) {
                var lsoa = raw_results[lsoa_name];
                results[lsoa_name] = {};
                var total = (
                    (lsoa.crime)*crime_modifier
                ) + (
                    (lsoa.transport)*transport_modifier
                ) + (
                    (lsoa.green_space)*green_space_modifier
                ) + (
                    (lsoa.schools)*schools_modifier
                )
                results[lsoa_name].rank = total / max_score
                // console.log(total, max_score, crime_modifier, max, results[lsoa_name].rank);
                var color = '#000000'
                for (var i=0; i<colors.length; i++) {
                    if (results[lsoa_name].rank <= (i+1)/colors.length) {
                        results[lsoa_name].color = colors[i];
                        // console.log(lsoa_name, results[lsoa_name].rank, results[lsoa_name].color);
                        break;
                    }
                }
            }
        }
        return results;
    },

  render() {
    var showModal = this.getQuery().oa || null;
    var budget = parseInt(this.getQuery().budget || 450);
    // console.log(this.getQuery().priority);
    var card_order = (this.getQuery().priority || '1,2,3,4').split(',')
    var cards = [];
    var modifiers = {};
    var modifier_ids = {
        '1': 'transport_modifier', 
        '2': 'green_space_modifier',
        '3': 'crime_modifier',
        '4': 'schools_modifier',
    };
    var modifier_ratings = [1.5, 1, 0.75, 0.5];
    for (var i=0; i<card_order.length; i++) {
        var id = parseInt(card_order[i]);
        cards.push(this.state.cards[id]);
        modifiers[modifier_ids[card_order[i]]] = modifier_ratings[i];
        // console.log(id, card_order, cards, modifiers);
    }
    var ranks = this.calculate_rank(
        this.state.colors,
        this.state.data,
        this.state.max,
        modifiers.crime_modifier,
        modifiers.transport_modifier,
        modifiers.green_space_modifier,
        modifiers.schools_modifier
    );
    // console.log('Layers: ', this.state.layers)
    // console.log('Rank Data: ', ranks)
    // console.log('Raw Data: ', this.state.data)
    return <Main 
        data={this.state.data}
        ranks={ranks}
        layers={this.state.layers}
        max={this.state.max}
        cards={cards}
        colors={this.state.colors}
        crime_modifier={modifiers.crime_modifier}
        transport_modifier={modifiers.transport_modifier}
        green_space_modifier={modifiers.green_space_modifier}
        schools_modifier={modifiers.schools_modifier}
        budget={budget}
        modal={showModal}
    />
  }
})

var Main = React.createClass({
    mixins: [Router.Navigation,  Router.State],

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
        var area = this.getParams().area;
        return (
            <Row className="show-grid">
                    <Map
                        data={this.props.data}
                        ranks={this.props.ranks}
                        layers={this.props.layers}
                        max={this.props.max}
                        colors={this.props.colors}
                        crime_modifier={this.props.crime_modifer}
                        transport_modifier={this.props.transport_modifer}
                        green_space_modifier={this.props.green_space_modifer}
                        schools_modifier={this.props.schools_modifier}
                        budget={this.props.budget}
                    />
                <Col md={3} style={{zIndex: 2, background: '#ffffff'}}>
                    <br />
                    <form onSubmit={this.onSearch}>
                        <Input type='search' placeholder='Search' value={area} onChange={this.onSearch} />
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
        <Route name="map" path="/area/:area" handler={Data}>
            <DefaultRoute handler={Map}/>
        </Route>
    </Route>
);


Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.getElementById("App"));
});

