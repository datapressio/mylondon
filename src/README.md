MyLondon
========

Install node and npm if you need to and set up the path.

On linux:

~~~
wget http://nodejs.org/dist/v0.10.33/node-v0.10.33-linux-x64.tar.gz
tar zxfv node-v0.10.33-linux-x64.tar.gz
export PATH=$PATH:node-v0.10.33-linux-x64/bin/
~~~

On Mac:

~~~
brew install node
~~~

Build the NPM dependencies and fetch the JS dependencies we need:

~~~
npm install
npm install bower
./node_modules/bower/bin/bower install
./fetch.sh
npm run build
~~~

Then start a server:

~~~
virtualenv -ppython3 env
env/bin/pip install -r serve_requirements.txt
env/bin/pip install -r shape_to_bbox_requirements.txt
env/bin/python3 old_serve.py serve
~~~

Now visit the page at http://localhost:8000

Be sure to check the `HOST` variable in `src/index.jsx` matches the host you are deploying to. For the URL above it should read:

~~~
var HOST = 'localhost:8000'
~~~

Note the test server above requires non-open source code at the moment. This can be replaced later.


To Deploy
---------

Generate a list of all the LSOAs you need:

~~~
echo -n "rsync -axHv --progress --stats " > lsoas.txt
cat MyLondon_crime_LSOA.csv | tail -n+2 | awk 'BEGIN { FS = "," }; { print $1 ".json" }' | xargs echo -n >> lsoas.txt
echo -n " threeaims01@web385.webfaction.com:datapress/mylondon/UK-GeoJSON/json/statistical/eng/oa_by_lsoa/" >> lsoas.txt 
~~~

On the server create the directory:

~~~
mkdir -p datapress/mylondon/UK-GeoJSON/json/statistical/eng/oa_by_lsoa
~~~

Then sync the GeoJSON:

~~~
mv lsoas.txt ../UK-GeoJSON/json/statistical/eng/oa_by_lsoa/
cd ../UK-GeoJSON/json/statistical/eng/oa_by_lsoa/
sh lsoas.txt 
~~~

Next we need to generate the bounding box database (the `geo/OA_bounding_boxes_WGS84` shapefile comes from Paul):

~~~
env3/bin/python shape_to_bbox.py bbox.db geo/OA_bounding_boxes_WGS84
~~~

Now we need to generate a database with key summary information for the shading:

~~~
./summary_data.sh ~/Desktop/datapress/MyLondon/MyLondon\ data/
~~~

This will create the `http/summary.csv` file we need.

Now sync the other files we need:

~~~
rsync -axHv --progress --stats index.html bower_components build summary.csv http serve.py serve_requirements.txt shape_to_bbox.py shape_to_bbox_requirements.txt bbox.db threeaims01@web385.webfaction.com:datapress/mylondon/
rsync -axHv --progress --stats ../../repos/jimmyg threeaims01@web385.webfaction.com:datapress/mylondon/
~~~

Now on the server:

~~~
mkdir tmp
cd tmp/
wget https://pypi.python.org/packages/source/v/virtualenv/virtualenv-12.1.1.tar.gz#md5=901ecbf302f5de9fdb31d843290b7217
tar zxfv virtualenv-12.1.1.tar.gz 
python3.4 virtualenv-12.1.1/virtualenv.py ../env3
cd ../
env3/bin/pip install -r serve_requirements.txt -r shape_to_bbox_requirements.txt
~~~

Finally start the server:

~~~
env3/bin/python3 serve.py serve
~~~


Dev Mode
========

In one terminal:

~~~
npm run watch
~~~

This will watch your source files and recompile the `build/main.js` file after any changes.

In another terminal run an API and file server:

~~~
python3 serve.py serve 
~~~

Visit http://localhost:8000.


Next Steps
==========

* Graphs drawn properly

Zooming out
===========

* Need shapefile for LAD -> MSOA -> LSOA -> OA
* Already using 
  https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/statistical/eng/oa_by_lsoa/E01000001.json
* Need
  lsoa_by_msoa  *** Doesn't exist
  msoa_by_lad

We can get boundary files from here: http://data.london.gov.uk/dataset/2011-boundary-files Or by analysing the UK GeoJSON

And then extract the boundaries we need into SQLite so that we can do bounding box queries.

Then the query can return either LSOA or LAD results so that they can display the OA or MSOA respectively.

Also, see this:

* http://jieter.github.io/Leaflet.layerscontrol-minimap/
* http://turbo87.github.io/leaflet-sidebar/examples/
* http://turbo87.github.io/sidebar-v2/examples/#home

And this:

* http://londondatastore-upload.s3.amazonaws.com/instant-atlas/msoa-atlas/atlas.html
