Frontend Notepad
================

Install node and npm if you need to and set up the path:

~~~
wget http://nodejs.org/dist/v0.10.33/node-v0.10.33-linux-x64.tar.gz
tar zxfv node-v0.10.33-linux-x64.tar.gz
export PATH=$PATH:node-v0.10.33-linux-x64/bin/
~~~

Build the NPM dependencies:

~~~
npm install
npm install bower
./node_modules/bower/bin/bower install
npm run build
~~~

Dev Mode
--------

In one terminal:

~~~
npm run watch
~~~

This will watch your source files and recompile the `build/main.js` file after any changes.

In another terminal run a static fileserver:

~~~
python -m SimpleHTTPServer 8000 0.0.0.0
~~~

You can then use the live cached version at http://192.168.0.3:8000/#/ or use a
version that doesn't have the app cache at http://192.168.0.3:8000/debug.html#/
