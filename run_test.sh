#! /bin/bash

# run_test.sh <IP_address>

# Variables

PROTOCOL=("http" "https" "h2")
PORT=("80" "443" "443")
ARRAY_LENGTH=$((${#PROTOCOL[@]}-1))

INCOGNITO="--incognito"
IGNORE_CERTIFICATE="--ignore-certificate-errors"
NO_BROWSER_CHECK="--no-default-browser-check"

DISABLE_CACHE="--disable-cache --disable-gpu-program-cache --disable-gpu-shader-disk-cache --disable-offline-load-stale-cache --disk-cache-size=0 --gpu-program-cache-size-kb=0 --media-cache-size=0 --disable-application-cache"

OPTIONS="$INCOGNITO $IGNORE_CERTIFICATE $NO_BROWSER_CHECK" #$DISABLE_CACHE"

BROWSER="chromium-browser"

IP_ADDR=${1}
URL=

# Functions

function clear_cache {
    echo "clear cache"
}


# main

pkill chromium-browser
pkill chromium

for i in $(seq 0 $ARRAY_LENGTH)
do
    echo ${PROTOCOL[$i]}
    if [ ${PROTOCOL[$i]} = "http" ]
    then
	URL="http://${IP_ADDR}:${PORT[$i]}/player.html"
	echo $URL
    elif [ ${PROTOCOL[$i]} = "https" ]
    then
	URL="https://${IP_ADDR}:${PORT[$i]}/player.html"
	echo $URL
    elif [ ${PROTOCOL[$i]} = "h2" ]
    then
	URL="https://${IP_ADDR}:${PORT[$i]}/player.html"
	echo $URL
    else
	echo "Invalid protocol"
    fi

    echo "chromium-browser $OPTIONS $URL"
    #chromium-browser $OPTIONS $URL 
done

