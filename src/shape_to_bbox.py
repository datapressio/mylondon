import collections
import shapefile
import sqlite3


BBOX_FIELDS = 'lsoa, oa, left, bottom, right, top'
BBoxRecord = collections.namedtuple('BBoxRecord', BBOX_FIELDS)

SHAPE_FIELDS = 'shapes, fields, records'
ShapeRecord = collections.namedtuple('ShapeRecord', SHAPE_FIELDS)



def load_shape(path):
    sf = shapefile.Reader(path)
    shapes = sf.shapes()
    assert len(shapes) == 25053
    fields = sf.fields
    records = sf.records()
    return ShapeRecord(shapes, fields, records)


def save_shape(conn, cursor, shape_data):
    cursor.execute(
        '''
        CREATE TABLE bbox(
            lsoa text
          , oa text
          , left double
          , bottom double
          , right double
          , top double
        );
        '''
    )
    for i, shape in enumerate(shape_data.shapes):
         # 1 is OA, 2 is LSOA
         values = tuple([shape_data.records[i][2], shape_data.records[i][1]] + shape.bbox.tolist())
         SQL_VALUES = (', ?' * len(values))[2:]
         #print values, BBOX_FIELDS, SQL_VALUES
         cursor.execute(
             '''
             INSERT INTO bbox ({}) VALUES ({});
             '''.format(BBOX_FIELDS, SQL_VALUES),
             values,
         )
    conn.commit()


def get_shapes(cursor, screen_left, screen_bottom, screen_right, screen_top):
    cursor.execute(
        '''
        select distinct lsoa from bbox 
        where
            (
                   ((? < left) and (? > left))
                OR ((? < right) and (? > right))
                OR ((? >= left) and (? <= right))
            ) AND (
                   ((? < bottom) and (? > bottom))
                OR ((? < top) and (? > top))
                OR ((? >= bottom) and (? <= top))
            )
        ;
        ''',
        (
            screen_left, screen_right,
            screen_left, screen_right,
            screen_left, screen_right,
            
            screen_bottom, screen_top,
            screen_bottom, screen_top,
            screen_bottom, screen_top,
        )
    )
    return [row[0] for row in cursor.fetchall()]


# They overlap if:
# 
# The screen area you are looking at has a vertical position that overlaps a shape when the shape's top or its bottom are between the screen's top and bottom, or its bottom is below and its top is above
# The screen area you are looking at has a horizonal position that overlaps a shape when the shape's left edge or right edge are between the screen's left and right edges or its left is before and its right is after
# The screen and shape overlap when both of the above conditions are true.


if __name__ == '__main__':
    import sys


    if len(sys.argv) != 3:
        print('python shape_to_bbox.py DB PATH_TO_SHAPEFILE_TO_IMPORT')
        exit(1)
    conn = sqlite3.connect(sys.argv[1])
    cursor = conn.cursor()
    shape = load_shape(sys.argv[2])
    save_shape(conn, cursor, shape)

    # Examples:
    # print(get_shapes(cursor, -0.0093233585357666, 51.56067105666037, -0.0034064054489135742, 51.561778256978236))
