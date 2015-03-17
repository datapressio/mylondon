import React from 'react';
import Container from './Container';

const Priorities = React.createClass({
  render() {
    // console.log(this.props.cards);
    return (
      <div>
        <Container cards={this.props.cards} />
      </div>
    );
  }
});

export default Priorities;
