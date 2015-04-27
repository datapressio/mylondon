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
                    disabled_themes={this.props.disabled_themes}
                />
            </div>
        );
    }
});

export default Priorities;
