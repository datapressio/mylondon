'use strict';

import React, { PropTypes } from 'react';
import ItemTypes from './ItemTypes';
import { DragDropMixin } from 'react-dnd';
var objectAssign = require('react/lib/Object.assign');

const dragSource = {
    beginDrag(component) {
        return {
            item: {
                id: component.props.id
            }
        };
    }
};

const dropTarget = {
    over(component, item) {
        component.props.moveCard(item.id, component.props.id);
    }
};

const style = {
    border: '1px dashed gray',
    backgroundColor: 'white',
    padding: '3px',
    marginTop: '2px',
    marginBttom: '2px',
};

const Card = React.createClass({
    mixins: [DragDropMixin],

    contextTypes: {
        router: React.PropTypes.func
    },

    propTypes: {
        id: PropTypes.any.isRequired,
        text: PropTypes.string.isRequired,
        moveCard: PropTypes.func.isRequired
    },

    statics: {
        configureDragDrop(register) {
            register(ItemTypes.CARD, {
                dragSource,
                dropTarget
            });
        }
    },

    // Start IE 9 fix
    componentDidMount: function () {
      if (navigator.appVersion.indexOf("MSIE 9") !== -1) {
        this.getDOMNode().addEventListener('selectstart', this.ie9fix);
      }
    },
  
    componentWillUnmount: function () {
      if (navigator.appVersion.indexOf("MSIE 9") !== -1) {
        this.getDOMNode().removeEventListener('selectstart', this.ie9fix);
      }
    },
  
    ie9fix: function(ev) {
      ev.preventDefault();
      this.getDOMNode().dragDrop();
    },
    // End IE 9 fix




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
        const { text, value } = this.props;
        const { isDragging } = this.getDragState(ItemTypes.CARD);
        const opacity = isDragging ? 0 : 1;
        var newStyles = {opacity: opacity}
        if (this.props.disabled) {
            newStyles['background'] = '#ccc';
        }
        var s = objectAssign({}, style, newStyles);

        var textStyles = {
            background: 'none',
            border: 0,
            cursor: 'move',
            width: '204px', 
            textAlign: 'left',
            outline: 'none',
            display: 'inline-block',
        }
        var img = (<span style={{width: 20, display: 'inline-block'}}></span>);
        if (this.props.disabled) {
            textStyles['textDecoration'] = 'line-through';
        } else {
            img = (<img src={this.props.icon} style={{width: '20px', cursor: 'move'}}/>)
        }
        return (
            <div {...this.dragSourceFor(ItemTypes.CARD)}
                 {...this.dropTargetFor(ItemTypes.CARD)}
                 style={s}
            >
                {img} &nbsp;
                <span style={textStyles}>{text}</span> 
                <input
                    type="checkbox"
                    name={this.props.name}
                    checked={!this.props.disabled}
                    ref={this.props.name}
                    onChange={this.handleChange}
                />
            </div>
        );
    }
});

export default Card;
