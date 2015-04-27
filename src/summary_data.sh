#!/bin/sh

set -e 

if [[ $# -gt 2 || $# -lt 1 ]]; then
    echo "Usage: ./summary_data.sh CSVFILE_DIR [WORKING_DIR]"
    exit 1
fi

if [ $# -eq 1 ]; then
    WORKDIR=$(pwd)
else
    WORKDIR=$2
fi
if [ ! -e "${WORKDIR}" ]; then
    echo "No such dir $WORKDIR"
    exit 1
fi
CSVDIR=$1
if [ ! -e "${CSVDIR}" ]; then
    echo "No such dir ${CSVDIR}"
    exit 1
fi
SCRIPT_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
if [ ! -e "${CSVDIR}/MyLondon_crime_OA.csv" ]; then
    echo "No MyLondon_crime_OA.csv file found in ${CSVDIR}, are you using the correct path?"
    exit 1;
fi

#
# Start work
#


if [ ! -e "${WORKDIR}/data.db" ]; then
    cd "${CSVDIR}"
    if [ -e data.db ]; then
        echo "Please remove the old $(pwd)/data.db file first"
        exit 1
    fi
    echo 'Importing all the CSV data into $(pwd)/data.db ...'
    cat "${SCRIPT_DIR}/import2.sql" | sqlite3 data.db
    mv data.db "${WORKDIR}"
    cd -
    echo 'done.'
fi

echo "OA,LSOA,LAD,Rent per month,green space,travel,safety,schools" > http/summary.csv
echo "
    select
        modelled_rents_oa.OA11CD
      , oa_to_lsoa.LSOA11CD
      , oa_to_lsoa.LAD11NM 
      , modelled_rents_oa.Ave_rent_1_bedroom
      , openspace_oa.Access
      , travel_oa.London_rank
      , crime_oa.Crimes as crime
      , schools_oa.Weighted_mean_score_of_schools_attended_by_children_living_in_this_LSOA
    FROM modelled_rents_oa
    LEFT JOIN oa_to_lsoa   ON oa_to_lsoa.OA11CD   = modelled_rents_oa.OA11CD
    LEFT JOIN travel_oa    ON travel_oa.OA11CD    = modelled_rents_oa.OA11CD
    LEFT JOIN openspace_oa ON openspace_oa.OA11CD = modelled_rents_oa.OA11CD
    LEFT JOIN crime_oa ON crime_oa.OA11CD = modelled_rents_oa.OA11CD
    LEFT JOIN schools_oa ON schools_oa.OA11CD = modelled_rents_oa.OA11CD
    ;
" | sqlite3 data.db >> http/summary.csv

echo "Max crimes"
echo "select max(Crimes*1.0) from crime_oa;" | sqlite3 data.db
echo "Min crimes"
echo "select min(Crimes*1.0) from crime_oa;" | sqlite3 data.db

echo "Max schools"
echo "select max(Weighted_mean_score_of_schools_attended_by_children_living_in_this_LSOA*1.0) from schools_oa;" | sqlite3 data.db
echo "Min schools"
echo "select min(Weighted_mean_score_of_schools_attended_by_children_living_in_this_LSOA*1.0) from schools_oa;" | sqlite3 data.db

echo "Max green space"
echo "select max(openspace_oa.Access*1.0) from openspace_oa;" | sqlite3 data.db
echo "Min green space"
echo "select min(openspace_oa.Access*1.0) from openspace_oa;" | sqlite3 data.db


echo "Max rent"
echo "select Ave_rent_1_bedroom*1.0 from modelled_rents_oa 
  -- where 
  --     OA11CD != 'E00010064'
  -- AND OA11CD != 'E00001015'
order by Ave_rent_1_bedroom*1.0 desc limit 5
; " | sqlite3 data.db

echo "Success."
