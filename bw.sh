#!/bin/sh
cp dist/index.js dist/browser.js 
cp -a dist/src/ dist/src2 
name='' 
space=' '
src=browser 

for entry in dist/src2/handler/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry
  name=$name$space$entry  
  fi
done

for entry in dist/src2/libs/clarinet/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  name=$name$space$entry  
  fi
done

for entry in dist/src2/conditioneval/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  name=$name$space$entry 
  fi
done

for entry in dist/src2/*
do
  if [[ $entry == *js ]]; 
  then
  echo $entry  
  name=$name$space$entry 
  fi
done

browserify dist/browser.js  $name -s piffero -o dist/browser.js

rm -rf dist/src2