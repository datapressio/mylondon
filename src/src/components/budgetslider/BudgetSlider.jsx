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
        if (this.props.budget !== 1000) {
            var description = (
                <span>
                    BUDGET PER PERSON: UP TO <span className="highlight">&pound;{this.props.budget}&nbsp;pw</span>
                </span>
            )
        } else {
            var description = (
                <span>BUDGET: MONEY IS NO OBJECT</span>
            )
        }
        return (
          <div>
              <div className="budget-text">{description}</div>
              <Slider min={this.props.min} max={this.props.max} step={this.props.step} value={this.props.budget} toolTip={false} onSlide={this.didChange} /><br />
          </div>
        );
    }
});

module.exports = BudgetSlider;
