var React = require('react');
var Router = require('react-router');
var Slider = require('../slider/Slider');

import merge from 'react/lib/merge';

require('./budgetslider.css');


var BudgetSlider = React.createClass({
    mixins: [ Router.Navigation, Router.State ],
  
    didChange: function(value) {
        var query = merge(this.getQuery(), {budget: value})
        this.replaceWith('map', {area: 'warren road'}, query);
    },
  
    render: function() {
        return (
          <div>
              <span>Your budget: Up to <span className="highlight">&pound;{this.props.budget} pw</span> per person</span><br />
              <Slider min={50} max={500} step={10} value={this.props.budget} toolTip={false} onSlide={this.didChange} /><br />
          </div>
        );
    }
});

module.exports = BudgetSlider;
