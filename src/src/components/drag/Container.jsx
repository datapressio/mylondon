'use strict';

import React from 'react';
var Router = require('react-router');
import update from 'react/lib/update';
import Card from './Card';

var objectAssign = require('react/lib/Object.assign');

const Container = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },

  
    getInitialState: function() {
            return {cards: this.props.cards};
    },

    moveCard(id, afterId) {
        const { cards } = this.state;

        const card = cards.filter(c => c.id === id)[0];
        const afterCard = cards.filter(c => c.id === afterId)[0];
        const cardIndex = cards.indexOf(card);
        const afterIndex = cards.indexOf(afterCard);

        var state = update(this.state, {
            cards: {
                $splice: [
                    [cardIndex, 1],
                    [afterIndex, 0, card]
                ]
            }
        });
        var card_order=[];
        for (var i=0; i<state.cards.length; i++) {
                card_order.push(state.cards[i].id);
        }
        var priority = card_order.join();
        var query = objectAssign({}, this.props.query, {priority: priority});
        // console.log("cards: ", cards, 'new_cards', state.cards, 'state cards: ', this.state.cards, 'query:', query);
        this.context.router.replaceWith('map', this.props.params, query);
        this.setState(state);
    },

    render() {
        return (
            <div>
                {this.state.cards.map(card => {
                    var disabled = false;
                    if (this.props.disabled_themes.indexOf(card.id) !== -1) {
                        var disabled = true;
                    }
                    // console.log('zzzzzzzzzzzzzzzzzzzz', this.props.disabled_themes, card.id, disabled)
                    return (
                        <Card key={card.id}
                            id={card.id}
                            text={card.text}
                            value={card.value}
                            icon={card.icon}
                            disabled={disabled}
                            disabled_themes={this.props.disabled_themes}
                            params={this.props.params}
                            query={this.props.query}
                            moveCard={this.moveCard} />
                    );
                })}
            </div>
        );
    }
});

export default Container;
