var React = require('react');
var Router = require('react-router');
var Slider = require('../slider/Slider');

var objectAssign = require('react/lib/Object.assign');


require('./budgetslider.css');


var BudgetSlider = React.createClass({
  
    contextTypes: {
        router: React.PropTypes.func
    },

    didChange: function(value) {
        var query = objectAssign({}, this.props.query, {budget: value});
        this.context.router.replaceWith('map', this.props.params, query);
    },
  
    render: function() {
        return (
          <div>
              <span>Your budget: Up to <span className="highlight">&pound;{this.props.budget} pw</span> per person</span><br />
              <Slider min={this.props.min} max={this.props.max} step={this.props.step} value={this.props.budget} toolTip={false} onSlide={this.didChange} /><br />
          </div>
        );
    }
});

module.exports = BudgetSlider;
