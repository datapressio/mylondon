MyLondon
========

MapBox
------

You can edit the background map here:

https://www.mapbox.com/editor/?id=datapress.e76f92c6#project

Then save your changes.

You'll need to clear the browser cache to refresh any tiles that have already
been served (otherwise you'll see the old ones).

Each request is made with an access_token generated here:

https://www.mapbox.com/account/apps/

It is my understanding that since the `mylondon` token now in this repo and is
publically embedded in the app, someone could steal it. This means you must be
prepared to rotate it with a new public API key at some point if theft happens.
This doesn't seem a great solution to me, but maybe it is.

I expect you'll have to pay for tiles at some point. If you don't do this up
front I expect the tiles will just stop serving. This wouldn't be good.

Never give out your Default Secret Token.

Install
-------

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

Get the code:

~~~
git clone git@github.com:datapressio/mylondon.git
cd mylondon
git checkout react-source
cd src
~~~

Build the NPM dependencies and fetch the JS dependencies we need:

~~~
npm install
npm install bower
./node_modules/bower/bin/bower install
npm run build
~~~

Then start a server:

~~~
python -m SimpleHTTPServer
~~~

Now visit the page at http://localhost:8000

Or, just load `index.html`.

All the assets you need apart from the `index.html`, `http/` directory and `build/main.js` file are hosted on Amazon.

To Deploy
---------

Back up the current files on the server, then run this to overwrite them:

~~~
rsync -axHv --progress --stats build http index.html ckan@s26.datapress.io:datapress/mylondon/ 
~~~

Dev Mode
========

In one terminal:

~~~
npm run watch
~~~

instead of the command you ran above which was:

~~~
npm run build
~~~


This will watch your source files and recompile the `build/main.js` file after any changes.

In another terminal run an API and file server:

