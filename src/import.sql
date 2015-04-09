-- This SQL imports all the CSV files into SQLite so that you can poke around in them.
-- You can run the script like this:
-- 
--     cd MyLondon/MyLondon\ data
--     cat import.sql | sqlite3 new.db
--

create table llsoa(LSOA11CD, LSOA11NM);
.mode csv
.import Lower_layer_super_output_areas_\(E+W\)_2011_Names_and_Codes/LSOA_2011_EW_NC.csv llsoa
select count(*) from llsoa;
delete from llsoa where LSOA11CD='LSOA11CD' and LSOA11NM='LSOA11NM';
select count(*) from llsoa;

create table houseprices_lsoa(LSOA, Average_house_sale_price);
.mode csv
.import Houseprices_LSOA.csv houseprices_lsoa
select count(*) from houseprices_lsoa;
delete from houseprices_lsoa where lsoa='LSOA';
select count(*) from houseprices_lsoa;

create table loac_description(Group_, General_description, OA_description);
.mode csv
.import MyLondon_LOAC_area_description_text.csv loac_description
select count(*) from loac_description;
delete from loac_description where Group_='Group' and General_description='General_description' and OA_description='OA_description';
select count(*) from loac_description;

create table loac_area_group_code(OA11CD, Super_Group, Super_Group_Name, Group_, Group_Name);
.mode csv
.import MyLondon_LOAC_area_group_code.csv loac_area_group_code
select count(*) from loac_area_group_code;
delete from loac_area_group_code where OA11CD='OA11CD' and Group_='Group';
select count(*) from loac_area_group_code;

create table openspace_oa(OA11CD, Access, London_rank integer);
.mode csv
.import MyLondon_OpenSpace_OA.csv openspace_oa
select count(*) from openspace_oa;
delete from openspace_oa where OA11CD='OA11CD';
select count(*) from openspace_oa;

create table crime_lsoa(LSOA, crimes integer, London_rank integer, empty); -- there is a trailing comma
.mode csv
.import MyLondon_crime_LSOA.csv crime_lsoa
select count(*) from crime_lsoa;
delete from crime_lsoa where LSOA='LSOA';
select count(*) from crime_lsoa;

create table crime_oa(OA11CD, Crimes integer);
.mode csv
.import MyLondon_crime_OA.csv crime_oa
select count(*) from crime_oa;
delete from crime_oa where OA11CD='OA11CD';
select count(*) from crime_oa;

create table education_lsoa (LSOA, Names, GCSE_Score, London_rank integer, MyLondon);
.mode csv
.import MyLondon_dummy_data_education.csv education_lsoa
select count(*) from education_lsoa;
delete from education_lsoa where LSOA='LSOA Code';
select count(*) from education_lsoa;

create table fare_zone_oa(OA11CD, Fare_Zone);
.mode csv
.import MyLondon_fare_zone_OA.csv fare_zone_oa
select count(*) from fare_zone_oa;
delete from fare_zone_oa where OA11CD='OA11CD';
select count(*) from fare_zone_oa;

create table travel_oa(OA11CD, PTAL, London_rank integer);
.mode csv
.import MyLondon_travel_OA.csv travel_oa
select count(*) from travel_oa;
delete from travel_oa where OA11CD='OA11CD';
select count(*) from travel_oa;

create table modelled_rents_oa(OA11CD,Ave_rent_1_bedroom,Ave_rent_2_bedroom,Ave_rent_3_bedroom,Ave_rent_4_bedroom);
.mode csv
.import modelled_OA_rents.csv modelled_rents_oa
select count(*) from modelled_rents_oa;
delete from modelled_rents_oa where OA11CD='OA11CD';
select count(*) from modelled_rents_oa;

create table oa_to_lsoa(OA11CD,LSOA11CD,LAD11NM);
.mode csv
.import OA_to_LSOA_lookup.csv oa_to_lsoa
select count(*) from oa_to_lsoa;
delete from oa_to_lsoa where OA11CD='OA11CD';
select count(*) from oa_to_lsoa;

create table lsoa_to_lat_long(LSOA11CD,EASTING,NORTHING,Latitude,Longitude);
.mode csv
.import lat_long_lookup_LSOA.csv lsoa_to_lat_long
select count(*) from lsoa_to_lat_long;
delete from lsoa_to_lat_long where LSOA11CD='LSOA11CD';
select count(*) from lsoa_to_lat_long;

create table oa_to_lat_long(OA11CD,EASTING,NORTHING,Latitude,Longitude);
.mode csv
.import lat_long_lookup_OA.csv oa_to_lat_long
select count(*) from oa_to_lat_long;
delete from oa_to_lat_long where OA11CD='OA11CD';
select count(*) from oa_to_lat_long;

