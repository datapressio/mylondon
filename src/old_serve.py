import sys; sys.path.append('../../repos/jimmyg/'); sys.path.append('jimmyg')


import json
import mimetypes
import os
import sys

import asyncio
import keyvalue
import aiohttp
import aiohttp.server
import cors
import microservice
import db_state_layers
import shared
import shape_to_bbox
from urllib.parse import urlparse, parse_qsl

from aiohttp.multidict import MultiDict
from pyquery import PyQuery as pq

assert sys.version >= '3.3', 'Please use Python 3.3 or higher.'


class Geometry(microservice.Microservice):
    api = microservice.Incoming

    def __init__(self, path):
        assert isinstance(path, shared.ExistingDirectory)
        self.path = path

    @asyncio.coroutine
    def on_api(self, msg):
        with open(os.path.join(self.path, msg+'.json'), 'rb') as fp:
            return fp.read()


class Postcode(microservice.Microservice):
    api = microservice.Incoming

    @asyncio.coroutine
    def on_api(self, postcode):
        response = yield from aiohttp.request(
            'GET',
            'http://www.openstreetmap.org/geocoder/search_uk_postcode?query={}&'.format(postcode)
        )
        data = (yield from response.read())
        d = pq(data)
        position = d("a.set_position")
        return {
            'lon': position.attr('data-lon'),
            'lat': position.attr('data-lat'),
            'zoom': position.attr('data-zoom'),
        }


class Data(microservice.Microservice):
    api = microservice.Incoming

    def __init__(self, path):
        self.db = db_state_layers.DbConnPlugin(
            None,
            db_state_layers.DbConfig(
                db_path=shared.ExistingDirectory(path)
            )
        )

    @asyncio.coroutine
    def on_api(self, lsoa):
        self.db.cursor.execute(
            '''
            SELECT
                crime_lsoa.LSOA AS lsoa
              , (1-(crimes/(select max(crimes)*1.0 from crime_lsoa))) AS saftey_rank
              , coalesce(education_lsoa.London_rank/(select max(London_rank)*1.0 from education_lsoa where London_rank <> ''), 0) AS schools_rank
              , 0.5 AS transport
              , 0.5 AS public_space
            FROM crime_lsoa
            LEFT JOIN education_lsoa on crime_lsoa.LSOA = education_lsoa.LSOA
            WHERE crime_lsoa.LSOA=?
            ;
            ''',
            (lsoa,),
        )
        rows = self.db.cursor.fetchall()
        result = {
            #'lsoa':         rows[0][0],
            'safety':       rows[0][1],
            'schools':      rows[0][2],
            'transport':    rows[0][3],
            'public_space': rows[0][4],
        }
        return keyvalue.dumps(result)


class BBox(microservice.Microservice):
    api = microservice.Incoming

    def __init__(self, path):
        self.db = db_state_layers.DbConnPlugin(
            None,
            db_state_layers.DbConfig(
                db_path=shared.ExistingDirectory(path)
            )
        )

    @asyncio.coroutine
    def on_api(self, msg):
        # results = yield from loop.run_in_executor(None, shape_to_bbox.get_shapes, self.db.cursor, *[float(m) for m in msg])
        results = shape_to_bbox.get_shapes(self.db.cursor, *[float(m) for m in msg])
        print(results)
        print(len(results))
        # print(self.db.cursor)
        # person = {'name': msg[1]}
        # # We can do things in parallel
        # event_done, address = yield from asyncio.gather(
        #     # Notice that we can use other ports to get things done
        #     self.event(msg),
        #     self.address(person['name']),
        # )
        # person['address'] = address
        # # See this for more: https://gist.github.com/keis/10627651
        # # Also asyncio.as_completed(fs, *, loop=None, timeout=None)¶ to get them as they come
        # return person
        return '\n'.join(results)


bbox = BBox('bbox.db')
data = Data('data.db')
postcode = Postcode()
geometry = Geometry(shared.ExistingDirectory('UK-GeoJSON/json/statistical/eng/oa_by_lsoa/'))


class HttpRequestHandler(aiohttp.server.ServerHttpProtocol):

    @asyncio.coroutine
    def handle_request(self, message, payload):
        # print('method = {!r}; path = {!r}; version = {!r}'.format(
        #     message.method, message.path, message.version))

        url = urlparse(message.path)
        response = aiohttp.Response(
            self.writer, 200, http_version=message.version)
        for name, value in cors.make_cors_headers(
            #api_origin='http://192.168.0.4:8000',
            #browser_origin='http://192.168.0.4:8000',
            api_origin='http://192.168.0.4:8000',
            browser_origin='http://192.168.0.4:8000',
            # browser_origin='http://127.0.0.1:8000',
            # browser_origin='http://127.0.0.1:8000',
            allowed_request_headers=cors.default_allowed_request_headers,
            allowed_methods=['GET'],
        ):
            response.add_header(name, value)
        base = shared.uniform_path(os.getcwd())
        if url.path == '/':
            with open(os.path.join(base, 'index.html'), 'rb') as fp:
                body = fp.read()
            response.add_header('Content-Type', 'text/html')
        elif url.path == '/build/main.js':
            with open(os.path.join(base, 'build/main.js'), 'rb') as fp:
                body = fp.read()
            response.add_header('Content-Type', 'application/javascript')
        elif url.path.startswith('/http/') and not '/' in url.path[6:]:
            filepath = shared.uniform_path(os.path.join(base, 'http', url.path[6:]))
            assert shared.uniform_path(filepath).startswith(base)
            with open(filepath, 'rb') as fp:
                body = fp.read()
            content_type, encoding = mimetypes.guess_type(filepath)
            if type:
                response.add_header('Content-Type', content_type)
        elif url.path == '/bbox':
            get_params = MultiDict(parse_qsl(url.query))
            args = get_params['bbox'].split(',')
            #print(args)
            body = yield from bbox.api(args)
            #body = yield from 
            # body = ''
            # for item in f:
            #     body += item
            body = str(body).encode('utf8')
            response.add_header('Content-Type', 'text/plain')
        elif url.path.startswith('/data/'):
            body = yield from data.api(url.path[6:])
            body = body.encode('utf8')
            response.add_header('Content-Type', 'text/plain')
        elif url.path.startswith('/postcode/'):
            data = yield from postcode.api(url.path[len('/postcode/'):])
            body = json.dumps(data).encode('utf8')
            response.add_header('Content-Type', 'application/json')
        elif url.path.startswith('/lsoa_geojson/'):
            body = yield from geometry.api(url.path[len('/lsoa_geojson/'):-5])
            response.add_header('Content-Type', 'application/json')
        else:
            body = b'not found'
        response.send_headers()
        response.write(body)
        yield from response.write_eof()
        if response.keep_alive():
            self.keep_alive(True)


def serve(loop):
    f = loop.create_server(
        lambda: HttpRequestHandler(debug=True, keep_alive=75),
        '0.0.0.0',
        8000,
    )
    svr = loop.run_until_complete(f)
    socks = svr.sockets
    print('serving on', socks[0].getsockname())
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    cmd = sys.argv[1]
    loop = asyncio.get_event_loop()
    if cmd == 'serve':
        serve(loop)
    else:
        @asyncio.coroutine
        def fake():
            return 'ada'
        @asyncio.coroutine
        def print_result(coro):
            result = yield from coro
            print(result)
        if cmd == 'bbox':
            loop.run_until_complete(print_result(bbox.api(sys.argv[2:])))
            #loop.run_until_complete(print_result(fake()))
    exit(0)
