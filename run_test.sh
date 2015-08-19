#! /bin/bash

# Variables

PROTOCOL=("http" "https" "h2")
PORT=("8080" "8081" "8083")
ARRAY_LENGTH=$((${#PROTOCOL[@]}-1))

INCOGNITO="--incognito"
IGNORE_CERTIFICATE="--ignore-certificate-errors"
NO_BROWSER_CHECK="--no-default-browser-check"

DISABLE_CACHE="--disable-cache --disable-gpu-program-cache --disable-gpu-shader-disk-cache --disable-offline-load-stale-cache --disk-cache-size=0 --gpu-program-cache-size-kb=0 --media-cache-size=0 --disable-application-cache"

OPTIONS="$INCOGNITO $IGNORE_CERTIFICATE $NO_BROWSER_CHECK $DISABLE_CACHE"

BROWSER="chromium-browser"

URL=

# Functions

function clear_cache {
    echo "clear cache"
}

# main

for i in $(seq 0 $ARRAY_LENGTH)
do
    echo ${PROTOCOL[$i]}
    if [ ${PROTOCOL[$i]} = "http" ]
    then
	URL="http://127.0.0.1:${PORT[$i]}/player.html"
	echo $URL
    elif [ ${PROTOCOL[$i]} = "https" ]
    then
	URL="https://127.0.0.1:${PORT[$i]}/player.html"
	echo $URL
    elif [ ${PROTOCOL[$i]} = "h2" ]
    then
	URL="https://127.0.0.1:${PORT[$i]}/player.html"
	echo $URL
    else
	echo "Invalid protocol"
    fi

    echo "chromium-browser $OPTIONS $URL"
done

