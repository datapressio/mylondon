'use strict';

import React from 'react';
var Router = require('react-router');
import update from 'react/lib/update';
import merge from 'react/lib/merge';
import Card from './Card';

const Container = React.createClass({
  mixins: [Router.Navigation,  Router.State],

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
    var query = merge(this.getQuery(), {priority: priority})
    // console.log("cards: ", cards, 'new_cards', state.cards, 'state cards: ', this.state.cards, 'query:', query);
    this.replaceWith('map', {area: 'warren road'}, query);
    this.setState(state);
  },

  render() {
    return (
      <div>
        {this.state.cards.map(card => {
          return (
            <Card key={card.id}
                  id={card.id}
                  text={card.text}
                  value={card.value}
                  icon={card.icon}
                  moveCard={this.moveCard} />
          );
        })}
      </div>
    );
  }
});

export default Container;
