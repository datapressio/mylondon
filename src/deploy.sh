#!/bin/bash

TMP=/tmp/deploy_mylondon
DEST_HOST=s3-eu-west-1.amazonaws.com
DEST_BUCKET=s3://mylondon.datapress.io/

if [ -z $AWS_ACCESS_KEY ] ; then
  echo "Missing environment variable: \$AWS_ACCESS_KEY."
  exit -1
fi

if [ -z $AWS_SECRET_ACCESS_KEY ] ; then
  echo "Missing environment variable: \$AWS_SECRET_ACCESS_KEY"
  exit -2
fi

find . -name ".DS_Store" -exec rm -f {} \;


rm -rf $TMP
mkdir -p $TMP

cp index.html $TMP
cp mycity.css $TMP
cp mycity.js $TMP
cp favicon* $TMP
cp -r build $TMP
cp -r http $TMP

boto-rsync \
  --access-key "$AWS_ACCESS_KEY" \
  --secret-key "$AWS_SECRET_ACCESS_KEY" \
  --endpoint "$DEST_HOST" \
  --delete \
  $TMP \
  $DEST_BUCKET
