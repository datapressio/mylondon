#!/bin/sh

export WORKDIR=~/Desktop/datapress/MyLondon

# echo "select LSOA, crimes/(1-(select max(crimes)*1.0 from crime_lsoa)) from crime_lsoa;" | sqlite3 ${WORKDIR}/data.db | tr '|', , > crime.csv


echo "
select
    crime_lsoa.LSOA as lsoa
  , crimes/(1-(select max(crimes)*1.0 from crime_lsoa)) as crime_rank
  , coalesce(education_lsoa.London_rank/(select max(London_rank)*1.0 from education_lsoa where London_rank <> ''), 0) as schools_rank
  , 0.5 as transport
  , 0.5 as public_space
from crime_lsoa
LEFT JOIN education_lsoa on crime_lsoa.LSOA = education_lsoa.LSOA
;
" | tr '\n' ' ' | sqlite3 ${WORKDIR}/data.db | tr '|', , > out.csv


