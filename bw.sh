#!/bin/sh
cp dist/index.js dist/b.js 
mkdir dist/src2
cp -a dist/src/* dist/src2/

browserify dist/b.js -o dist/browser.js

src=browser 

for entry in dist/src2/handler/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src2/$src}" 
  browserify $entry -o $entry2 
  fi
done

for entry in dist/src2/libs/clarinet/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src2/$src}" 
  browserify $entry -o $entry2 
  fi
done

for entry in dist/src2/conditioneval/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src2/$src}" 
  browserify $entry -o $entry2 
  fi
done

for entry in dist/src2/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src2/$src}" 
  browserify $entry -o $entry2 
  fi
done


rm -rf dist/src2;