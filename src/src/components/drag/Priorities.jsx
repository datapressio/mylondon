import React from 'react';
import Container from './Container';


const Priorities = React.createClass({
    render() {
        return (
            <div>
                <Container
                    cards={this.props.cards} 
                    params={this.props.params} 
                    query={this.props.query} 
                />
            </div>
        );
    }
});

export default Priorities;
