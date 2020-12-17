# Hackyholidays 2020

Everything about Hackyholidays 2020 from Hackerone.

## flag 1
robots.txt

## flag 2
s3cr3t-ar3a found in robots.txt. 
nothing in sourcecode. 
jquery not from cdn?
weird, look at diff.
flag in property.
"proper way"

## flag 3
people with id 0

## flag 4
fuzz until the end.
-> /sessions
gives userid and cookies.
no success with cookies.

-> /user
missing parameter uuid
use id from session

## flag 5
fuzz login
access:computer

change cookie to admin=true
download zip
crack zip pw
find flag

