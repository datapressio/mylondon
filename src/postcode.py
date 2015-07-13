'''
A simple script to fetch postcode information from open street map.

This is used in MyLondon to moe the map.

Install like this::

    virtualenv env
    env/bin/pip install requests pyquery

Run as a WSGI app so that requests to /postcode/ are proxied here. 
'''


import json
import requests
from pyquery import PyQuery as pq


def postcode_app(environ, start_response):
    if not environ['PATH_INFO'].startswith('/postcode/'):
        start_response(
            '404 Not Found',
            [
                ('Content-Length', '9'),
            ]
        )
        return ['Not Found']
    postcode = environ['PATH_INFO'][len('/postcode/'):]
    response = requests.get(
        'http://www.openstreetmap.org/geocoder/search_uk_postcode',
        params={'query': postcode, 'xhr':'1'}
    )
    d = pq(response.text)
    position = d('a.set_position')
    result = json.dumps(
        {
            'lon': position.attr('data-lon'),
            'lat': position.attr('data-lat'),
            'zoom': position.attr('data-zoom'),
        }
    )
    start_response(
        '200 OK',
        [
            ('Content-Length', str(len(result))),
            ('Content-Type', 'application/json'),
        ]
    )
    return [result]


if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    
    host, port = '0.0.0.0', 8080
    httpd = make_server(host, port, postcode_app)
    print 'Serving HTTP on {host}:{port}...'.format(host=host, port=port)
    
    # Respond to requests until process is killed
    httpd.serve_forever()
    
    # Alternative: serve one request, then exit
    httpd.handle_request()

