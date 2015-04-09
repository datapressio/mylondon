#!/bin/sh

#
# Set up variables
#

if [[ $# -gt 2 || $# -lt 1 ]]; then
    echo "Usage: ./pipeline CSVFILE_DIR [WORKING_DIR]"
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
# echo "Running in '${SCRIPT_DIR}' with CSV data from '${CSVDIR}' and outputting in '${WORKDIR}'"
if [ ! -e "${CSVDIR}/Houseprices_LSOA.csv" ]; then
    echo "No Houseprices_LSOA.csv file found in ${CSVDIR}, are you using the correct path?"
    exit 1;
fi

#
# Start work
#

if [ ! -e "${WORKDIR}/UK-GeoJSON" ]; then
    echo 'Checking out a 2.5G repo ...'
    cd $WORKDIR
    git clone https://github.com/martinjc/UK-GeoJSON.git
    cd -
    echo 'done.'
fi

if [ ! -e "${WORKDIR}/env3" ]; then
    cd $WORKDIR
    virtualenv -ppython3 env3
    cd -
fi

if [ ! -e "${WORKDIR}/data.db" ]; then
    cd "${CSVDIR}"
    echo 'Importing all the CSV data into data.db ...'
    cat "${SCRIPT_DIR}/import.sql" | sqlite3 data.db
    mv data.db "${WORKDIR}"
    cd -
    env3/bin/pip install -r shape_to_bbox_requirements.txt -r serve_requirements.txt 
    env3/bin/python shape_to_bbox.py data.db geo/OA_bounding_boxes_WGS84.shp
    echo 'done.'
fi

if [ ! -e "${WORKDIR}/geojson-hacking" ]; then
    echo 'Checking out a 21Mb repo ...'
    cd $WORKDIR
    git clone git@github.com:datapressio/geojson-hacking.git
    cd -
    echo 'done.'
fi

echo "select LSOA, crimes/(select max(crimes)*1.0 from crime_lsoa) from crime_lsoa;" | sqlite3 ${WORKDIR}/data.db | tr '|', ,


echo "Success."
