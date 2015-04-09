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


# So, the bounding box overlaps if:
# 
# * The top left corner is between the top left and bottom right
# * The top right corner is between the top right and bottom left
# * The bottom left corner is between the bottom left and top right
# * The bottom right corner is between the bottom right and top left
# * All corners are greater than the corners
# 
# (
#   The left side is between left and right OR The right side is between left and right
#   AND
#   The top side is between top and bottom OR The bottom side is between top and bottom
# )
# OR 
# (
#   All sides are outside the sides
# )
# 

# (
#     ((? > left AND ? < right) OR (? > left AND ? < right))
#     AND
#     ((? > bottom AND ? < top) OR (? > bottom AND ? < top))
# ) OR (
#     ? <= left AND ? >= right AND ? >= top AND ? <= bottom
# )
# 
# left, left, right, right
# top, top, bottom, bottom
# left, right, top, bottom

# Which the other way around is:
# 
#    the screen left is less than the left edge and the screen right is greater than the left edge
# OR
#    the screen left is less than the right edge and the screen right is greater than the right edge
# OR
#    the screen left is greater than or equal to the left edge and the screen right is less than or equal to the right edge
# 
# AND
# 
#    the screen bottom is less than the bottom edge and the screen top is greater than the bottom edge
# OR
#    the screen bottom is less than the top edge and the the screen top is greater than top edge
# OR 
#    the screen bottom is greater than or equal to the bottom edge and the screen top is less than or equal to the top edge
# 
# (
#        ((? < left) and (? > left))
#     OR ((? < right) and (? > right))
#     OR ((? > left) and (? < right))
# ) AND (
#        ((? < bottom) and (? > bottom))
#     OR ((? < top) and (? > top))
#     OR ((? > bottom) and (? < top))
# )
# 
# screen_left, screen_right,
# screen_left, screen_right,
# screen_left, screen_right,
# 
# screen_bottom, screen_top,
# screen_bottom, screen_top,
# screen_bottom, screen_top,
#
#
# Starting the explanation again:
# 
# The screen area you are looking at has a vertical position that overlaps a shape when the shape's top or its bottom are between the screen's top and bottom, or its bottom is below and its top is above
# The screen area you are looking at has a horizonal position that overlaps a shape when the shape's left edge or right edge are between the screen's left and right edges or its left is before and its right is after
# The screen and shape overlap when both of the above conditions are true.


if __name__ == '__main__':
    import sys

    conn = sqlite3.connect(sys.argv[1])
    cursor = conn.cursor()
    shape = load_shape(sys.argv[2])
    save_shape(conn, cursor, shape)

    # print get_shapes(cursor, 0.0635589920000256, 51.456845661000040, 0.07621516900002570, 51.46146756100010)
    # print len(get_shapes(cursor, -1000, -1000, 1000, 1000))
    # print len(get_shapes(cursor, 0, -1000, 1000, 1000))
    # print len(get_shapes(cursor, -1000, -1000, 0, 1000))
    # print get_shapes(cursor, 0.06355899200002568, 51.456845661000045, 0.07621516800002569, 51.46146756100004)
    # print(get_shapes(cursor, -0.45710497399994665, 51.53489146100003, -0.45368292299994667, 51.53773294100003))
    # print(get_shapes(cursor, -0.019268989562988278, 51.55671559681339, 0.004398822784423828, 51.561144621541345))
    print(get_shapes(cursor, -0.0093233585357666, 51.56067105666037, -0.0034064054489135742, 51.561778256978236))


 

