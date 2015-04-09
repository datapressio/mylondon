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
    padding: '0.5rem',
    margin: '0.5rem',
    cursor: 'move',
};

const Card = React.createClass({
    mixins: [DragDropMixin],

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

    render() {
        const { text, value } = this.props;
        const { isDragging } = this.getDragState(ItemTypes.CARD);
        const opacity = isDragging ? 0 : 1;
        var s = objectAssign({}, style, {opacity: opacity});

        return (
            <div {...this.dragSourceFor(ItemTypes.CARD)}
                     {...this.dropTargetFor(ItemTypes.CARD)}
                     style={s}>
                     <span style={{display: 'inline-block', width: '25px'}}>
                             <i className={'fa '+this.props.icon}></i>
                     </span>
                <span>{text}</span> 
            </div>
        );
    }
});

export default Card;
