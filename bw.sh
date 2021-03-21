#!/bin/sh

mkdir dist/browser
cp -a dist/src dist/browser

cp dist/index.js dist/browser/b.js 

browserify dist/browser/b.js -o dist/browser/browser.js

src=browser 

for entry in dist/browser/src/handler/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  # entry2="${entry/src2/$src}" 
  browserify $entry -o $entry 
  fi
done

for entry in dist/browser/src/libs/clarinet/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  # entry2="${entry/src2/$src}" 
  browserify $entry -o $entry
  fi
done

for entry in dist/browser/src/conditioneval/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry   
  browserify $entry -o $entry 
  fi
done

for entry in dist/browser/src/
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src2/$src}" 
  browserify $entry -o $entry 
  fi
done

mkdir dist/b2
cp -a dist/browser/* dist/b2 

rm -rf dist/browser;