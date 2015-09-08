MyLondon
========

MyLondon conists of a set of extensions to the MyCity project at
https://github.com/datapressio/mycity

Changes can be made to the assets in `http` or to the `mylondon.js` and
`mylondon.css` file to customize the project.

The `http/mycity.js` and `http/mycity.css` files are minimised versions from
the MyCity project.

If you want to support old browsers you'll need to run the following to
generate the polyfills in the `bower_components` directory:

~~~
npm install bower
node_modules/.bin/bower install
~~~

You can run a local server for testing like this:

~~~
python -m SimpleHTTPServer 8000 0.0.0.0
~~~

This will make MyLondon available on http://localhost:8000

All the data assets the code needs are separately hosted on either
http://api.datapress.io or Amazon S3.
