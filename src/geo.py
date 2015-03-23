"""

Example:

    >>> shapes[0].bbox
    [-0.029297850999967068, 51.54435280600006, -0.025358834999967068, 51.545944491000064]
    >>> dir(shapes[0])
    ['__doc__', '__geo_interface__', '__init__', '__module__', 'bbox', 'parts', 'points', 'shapeType']
    >>> shapes[0]
    <shapefile._Shape instance at 0x10c0b7e18>
    >>> shapes[0].shapeType
    5
    >>> fields = sf.fields
    >>> fields[0]
    ('DeletionFlag', 'C', 1, 0)
    >>> records = sf.records()
    >>> records[0]
    [1, 'E00009198', 'E01001846', 'E02000362', 'E05000249', 'Wick', 'E09000012', 'Hackney', 'E12000007', 'London', 'Hackney 018A', 'Hackney 018', 224, 224, 0, '1.21100000000e+002', 96, '2.30000000000e+000', 1, '1.59168499999e-003', '3.93901600000e-003', '1.10614020000e-002', '6.26967268194e-006']
    >>> fields
    [('DeletionFlag', 'C', 1, 0), ['OBJECTID', 'N', 9, 0], ['OA11CD', 'C', 9, 0], ['LSOA11CD', 'C', 9, 0], ['MSOA11CD', 'C', 9, 0], ['WD11CD_BF', 'C', 9, 0], ['WD11NM_BF', 'C', 60, 0], ['LAD11CD', 'C', 9, 0], ['LAD11NM', 'C', 40, 0], ['RGN11CD', 'C', 9, 0], ['RGN11NM', 'C', 25, 0], ['LSOA11NM', 'C', 40, 0], ['MSOA11NM', 'C', 40, 0], ['USUALRES', 'N', 9, 0], ['HHOLDRES', 'N', 9, 0], ['COMESTRES', 'N', 9, 0], ['POPDEN', 'F', 19, 11], ['HHOLDS', 'N', 9, 0], ['AVHHOLDSZ', 'F', 19, 11], ['ORIG_FID', 'N', 9, 0], ['MBG_Width', 'F', 19, 11], ['MBG_Length', 'F', 19, 11], ['Shape_Leng', 'F', 19, 11], ['Shape_Area', 'F', 19, 11]]
    >>> records[0][0:3]
    [1, 'E00009198', 'E01001846']
    >>> for record in records:
    ...     if record[2] == 'E01004376':
    ...         print record[0]
    ... 
    19806
    20073
    20118
    20170
    20478

"""

import sys
sys.path.append('/Users/datapress/Desktop/repos/jimmyg/')


import collections
import wsgiref.simple_server

#
# Core logic
#

import shapefile

sf = shapefile.Reader("geo/OA_bounding_boxes_WGS84.shp")
shapes = sf.shapes()
assert len(shapes) == 25053
fields = sf.fields
records = sf.records()

def get_lsoa(records, lsoa):
    result = []
    for i, record in enumerate(records):
        # print record[2]
        if record[2] == lsoa:
            result.append(i)
    return result


#
# HTTP Adapter
#

import state_layers
import http_adapter


class HttpRequestEnv(state_layers.StateLayer):
    plugins=collections.OrderedDict(
        http = http_adapter.HttpRequestPlugin
    )

class HttpLogCaptureEnv(state_layers.StateLayer):
    plugins=collections.OrderedDict(
        log=state_layers.LogPlugin,
    )

adapter = http_adapter.HttpAdapter(HttpRequestEnv)

@adapter.route('GET /bbox/(?P<lsoa>\w+)/(?P<oa>\w+)')
def bbox(lsoa, oa):
    # e.g. E01004376 E00021985
    ids = get_lsoa(records, lsoa)
    results = []
    for id in ids:
        if records[id][1] == oa:
            results.append(shapes[id].bbox)
    if results:
        return str(results)
    return 404

if __name__ == '__main__':

    with HttpLogCaptureEnv() as penv:
        adapter.initialize(penv)
        httpd = wsgiref.simple_server.make_server('', 8000, adapter)
        print("Serving on port 8000...")
        httpd.serve_forever()
    
