#!/bin/bash

TMP=/tmp/deploy_mylondon
BASEDIR=1.0.0
DEST_HOST=s3-eu-west-1.amazonaws.com
DEST_BUCKET=s3://my.london.gov.uk/

find . -name ".DS_Store" -exec rm -f {} \;

rm -rf $TMP
mkdir -p $TMP

cp $BASEDIR/index.html $TMP
cp $BASEDIR/mylondon.css $TMP
cp $BASEDIR/mylondon.js $TMP
cp -r $BASEDIR/http $TMP

find $TMP -name "*.psd" -exec rm -f {} \;

boto-rsync \
  --endpoint "$DEST_HOST" \
  --delete \
  $TMP \
  $DEST_BUCKET
