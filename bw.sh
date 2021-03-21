#!/bin/sh
cp dist/index.js dist/browser.js 

src=browser 

for entry in dist/src/handler/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src/$src}" 
  browserify $entry -o $entry2 
  fi
done

for entry in dist/src/libs/clarinet/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src/$src}" 
  browserify $entry -o $entry2 
  fi
done

for entry in dist/src/conditioneval/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src/$src}" 
  browserify $entry -o $entry2 
  fi
done

for entry in dist/src/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  entry2="${entry/src/$src}" 
  browserify $entry -o $entry2 
  fi
done

browserify dist/browser.js -o dist/browser.js,

