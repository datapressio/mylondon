#!/bin/sh


# function get_json () {
#     if [ ! -e oa_by_lsoa ]; then
#         mkdir oa_by_lsoa
#     fi;
#     cd oa_by_lsoa
#     for i in "E01004376" "E01004375" "E01004374" "E01004373" "E01004372" "E01004371"; do
#         if [ ! -e "${i}.json" ]; then
#             echo "Fetching ${i}.json ..."
#             wget "https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/statistical/eng/oa_by_lsoa/${i}.json" > /dev/null 2> /dev/null
#             echo "done."
#         else
#             echo "Already got ${i}.json."
#         fi
#     done
#     cd ../
# }

function js_deps () {
    if [ ! -e http ]; then
        mkdir http
    fi;
    cd http
    for i in "https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css" "https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" "https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/fonts/fontawesome-webfont.ttf?v=4.3.0" "http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css" "http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.js" ; do
        if [ ! -e $(basename "${i}") ]; then
            echo "Fetching ${i} ..."
            wget "${i}" > /dev/null 2> /dev/null
            echo "done."
        else
            echo "Already got ${i}."
        fi
    done
    cd ../
}


js_deps

echo "Success."
