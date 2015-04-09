MyLondon
========

Install node and npm if you need to and set up the path:

~~~
wget http://nodejs.org/dist/v0.10.33/node-v0.10.33-linux-x64.tar.gz
tar zxfv node-v0.10.33-linux-x64.tar.gz
export PATH=$PATH:node-v0.10.33-linux-x64/bin/
~~~

Build the NPM dependencies and fetch the data:

~~~
npm install
npm install bower
./node_modules/bower/bin/bower install
./fetch.sh
npm run build
~~~

Then open `index.html`

Dev Mode
--------

In one terminal:

~~~
npm run watch
~~~

This will watch your source files and recompile the `build/main.js` file after any changes.

In another terminal run an API and file server:

~~~
python serve.py serve 
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

e.g. see http://londondatastore-upload.s3.amazonaws.com/instant-atlas/msoa-atlas/atlas.html

We can get boundary files from here:
http://data.london.gov.uk/dataset/2011-boundary-files
Or by analysing the UK GeoJSON

And then extract the boundaries we need into SQLite so that we can do bounding box queries.

Then the query can return either LSOA or LAD results so that they can display the OA or MSOA respectively.


Also, see this:
http://jieter.github.io/Leaflet.layerscontrol-minimap/

http://turbo87.github.io/leaflet-sidebar/examples/

http://turbo87.github.io/sidebar-v2/examples/#home

