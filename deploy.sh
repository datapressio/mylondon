#!/bin/bash

TMP=/tmp/deploy_mylondon
BASEDIR="."
DEST_HOST=s3-eu-west-1.amazonaws.com
DEST_BUCKET=s3://my.london.gov.uk/

find . -name ".DS_Store" -exec rm -f {} \;

rm -rf $TMP
mkdir -p $TMP

cp $BASEDIR/index.html $TMP
cp $BASEDIR/mylondon.css $TMP
cp $BASEDIR/mylondon.js $TMP
cp -r $BASEDIR/http $TMP
mkdir -p $TMP/bower_components/html5shiv/dist/
mkdir -p $TMP/bower_components/es5-shim
mkdir -p $TMP/bower_components/es5-sham
mkdir -p $TMP/bower_components/console-polyfill
cp bower_components/html5shiv/dist/html5shiv.min.js $TMP/bower_components/html5shiv/dist/
cp bower_components/es5-shim/es5-shim.min.js $TMP/bower_components/es5-shim/
cp bower_components/es5-shim/es5-sham.min.js $TMP/bower_components/es5-sham/
cp bower_components/console-polyfill/index.js $TMP/bower_components/console-polyfill/

find $TMP -name "*.psd" -exec rm -f {} \;

boto-rsync \
  --endpoint "$DEST_HOST" \
  --delete \
  $TMP \
  $DEST_BUCKET
