"""
We currently have the following tables we can extract data from for LSOAs:

openspace -> oa
travel    -> PTAL accessible (more density, walking distance, frequency of tubes, bus routes)
schools XXXX education.
crime

travel      -> more details
description ->

Rank.

# select LSOA, crimes, London_rank                      from crime_lsoa         where LSOA=?
# select LSOA, Average_house_sale_price                 from houseprices_lsoa   where LSOA=?
# select LSOA, Names, GCSE_Score, London_rank, MyLondon from education_lsoa     where LSOA=?

We have this data from OAs:

# select OA11CD, Access, London_rank                    from openspace_oa       where OA11CD=?
# select OA11CD, Fare_Zone                              from fare_zone_oa       where OA11CD=?
# select OA11CD, PTAL, London_rank                      from travel_oa          where OA11CD=?
# select OA11CD,Ave_rent_1_bedroom,Ave_rent_2_bedroom,Ave_rent_3_bedroom,Ave_rent_4_bedroom 
                                                        from modelled_rents_oa  where OA11CD=?
# select OA11CD, Crimes                                 from crime_oa           where OA11CD=?

The mockups have:

* public transport 
* green space
* crime/safety
* schools

How do these tie together? How do we move from one to another? What is the search input
Where is the Gazateer?
These tables need more investigation:

# create table llsoa(LSOA11CD, LSOA11NM);
# .mode csv
# .import Lower_layer_super_output_areas_\(E+W\)_2011_Names_and_Codes/LSOA_2011_EW_NC.csv llsoa
# select count(*) from llsoa;
# delete from llsoa where LSOA11CD='LSOA11CD' and LSOA11NM='LSOA11NM';
# select count(*) from llsoa;
# 
# create table loac_description(Group_, General_description, OA_description);
# .mode csv
# .import MyLondon_LOAC_area_description_text.csv loac_description
# select count(*) from loac_description;
# delete from loac_description where Group_='Group' and General_description='General_description' and OA_description='OA_description';
# select count(*) from loac_description;
# 
# create table loac_area_group_code(OA11CD, Super_Group, Super_Group_Name, Group_, Group_Name);
# .mode csv
# .import MyLondon_LOAC_area_group_code.csv loac_area_group_code
# select count(*) from loac_area_group_code;
# delete from loac_area_group_code where OA11CD='OA11CD' and Group_='Group';
# select count(*) from loac_area_group_code;
# 
# create table oa_to_lsoa(OA11CD,LSOA11CD,LAD11NM);
# .mode csv
# .import OA_to_LSOA_lookup.csv oa_to_lsoa
# select count(*) from oa_to_lsoa;
# delete from oa_to_lsoa where OA11CD='OA11CD';
# select count(*) from oa_to_lsoa;
# 
# create table lsoa_to_lat_long(LSOA11CD,EASTING,NORTHING,Latitude,Longitude);
# .mode csv
# .import lat_long_lookup_LSOA.csv lsoa_to_lat_long
# select count(*) from lsoa_to_lat_long;
# delete from lsoa_to_lat_long where LSOA11CD='LSOA11CD';
# select count(*) from lsoa_to_lat_long;
# 
# create table oa_to_lat_long(OA11CD,EASTING,NORTHING,Latitude,Longitude);
# .mode csv
# .import lat_long_lookup_OA.csv oa_to_lat_long
# select count(*) from oa_to_lat_long;
# delete from oa_to_lat_long where OA11CD='OA11CD';
# select count(*) from oa_to_lat_long;

"""

import collections
import sqlite3
import sys

CRIME_FIELDS = 'LSOA, crimes, London_rank'
CrimeRecord = collections.namedtuple('CrimeRecord', CRIME_FIELDS)

RENT_FIELDS = 'OA11CD, Ave_rent_1_bedroom, Ave_rent_2_bedroom, Ave_rent_3_bedroom, Ave_rent_4_bedroom'
RentRecord = collections.namedtuple('RentRecord', RENT_FIELDS)

conn = sqlite3.connect('../data.db')
cursor = conn.cursor()


def get_oa_in_bounding_box():
    pass


def get_crime(lsoa):
    cursor.execute(
        '''
        select {!s} from crime_lsoa where LSOA=?
        '''.format(CRIME_FIELDS),
        (lsoa,)
    ) 
    rows = map(CrimeRecord._make, cursor.fetchall())
    assert len(rows) == 1
    return rows[0]


def get_rent_by_oa(oa):
    cursor.execute(
        '''
        select {!s} from modelled_rents_oa where OA11CD=?
        '''.format(RENT_FIELDS),
        (oa,)
    ) 
    rows = map(RentRecord._make, cursor.fetchall())
    assert len(rows) == 1
    return rows[0]


def get_oas_for_lsoa(lsoa):
    cursor.execute(
        '''
    select DISTINCT OA11CD from oa_to_lsoa where LSOA11CD = ?
        ''',
        (lsoa,)
    ) 
    return [row[0] for row in cursor.fetchall()]


def get_budget_threshold(lsoa):
    total = 0
    count = 0
    for oa in get_oas_for_lsoa(lsoa):
        count += 1
        rent = int(get_rent_by_oa(oa).Ave_rent_1_bedroom)
        assert rent
        total += rent
    return (total/float(count))/4.0


if __name__ == '__main__':
    if len(sys.argv) == 2:
        lsoa = sys.argv[1]
        print(lsoa)
        print('='*len(lsoa))
        print('')
        print('  OAs:')
        for oa in get_oas_for_lsoa(lsoa=lsoa):
            print('    {}'.format(oa))
        print('')
        print('  Crimes:')
        cr = get_crime(lsoa=lsoa)
        print('    {} {}'.format(cr.crimes, cr.London_rank))
        print('')
        print('  Rent (1 bedroom, per week)')
        budget = get_budget_threshold(lsoa)
        print('    {}'.format(budget))
        exit(0)
    print('Usage: python {} LSOA'.format(__file__))
    print('e.g. python {} E01004376'.format(__file__))
    exit(1)
