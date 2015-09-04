#! /bin/bash

# run_test.sh <IP_address>

# Variables

PROTOCOL=("https" "http" "h2")
PORT=("443" "80" "443")
ARRAY_LENGTH=$((${#PROTOCOL[@]}-1))

INCOGNITO="--incognito"
IGNORE_CERTIFICATE="--ignore-certificate-errors"
NO_BROWSER_CHECK="--no-default-browser-check"

DISABLE_CACHE="--disable-cache --disable-gpu-program-cache --disable-gpu-shader-disk-cache --disable-offline-load-stale-cache --disk-cache-size=0 --gpu-program-cache-size-kb=0 --media-cache-size=0 --disable-application-cache"

OPTIONS="$INCOGNITO $IGNORE_CERTIFICATE $NO_BROWSER_CHECK $DISABLE_CACHE"
PROTO_OPTIONS=

BROWSER="chromium-browser"

IP_ADDR="127.0.0.1"
URL=
RESOURCES=

DELAY="0"
LOSSES="0"

ERROR="${0} [-i=<IP_ADDR>] [-l=<LOSSES>] [-d=<DELAY>] -r=<RESOURCE>[,<RESOURCE>*]"

# Functions

function clear_cache {
    echo "CLEAR CACHE"
    rm -rf ~/.cache/chromium
}

function check_options {
    echo "check options"
}

function set_delay_and_losses {
    sudo tc qdisc add dev ${1} root netem delay ${2}ms loss ${3}%
}

function unset_delay_and_losses {
    sudo tc qdisc del root dev ${1}
}


# main

if [ -z "$*" ]
then
    echo $ERROR
    exit 1
fi

for opt in "$@"
do
    case $opt in
	-i=*|--ip=*)
	value="${opt#*=}"
	if [ ! -z "$value" ]
	then
	    IP_ADDR=$value
	fi
	shift # past argument=value
	;;
	-l=*|--losses=*)
	value="${opt#*=}"
	if [ ! -z "$value" ]
        then
	    LOSSES=$value
	fi
	shift # past argument=value
	;;
	-d=*|--delay=*)
	value="${opt#*=}"
	if [ ! -z "$value" ]
        then
	    DELAY=$value
	fi
	shift # past argument=value
	;;
	-r=*|--resources=*)
	value="${opt#*=}"
	if [ ! -z "$value" ]
        then
	    RESOURCES=$value
	else
	    echo $ERROR
	    exit 1
	fi
	shift # past argument with no value
	;;
	*)
            # unknown option
	    echo $ERROR
	    exit 1
	    ;;
    esac
done

pkill chromium-browser
pkill chromium

clear_cache
set_delay_and_losses "eth0" $DELAY $LOSSES

for res in $(echo $RESOURCES | sed "s/,/ /g")
do
    for i in $(seq 0 $ARRAY_LENGTH)
    do
	echo ${PROTOCOL[$i]}
	if [ ${PROTOCOL[$i]} == "http" ]
	then
	    URL="http://${IP_ADDR}:${PORT[$i]}/$res"
	    PROTO_OPTIONS="--use-spdy=off"
	    echo $URL
	elif [ ${PROTOCOL[$i]} == "https" ]
	then
	    URL="https://${IP_ADDR}:${PORT[$i]}/$res"
	    PROTO_OPTIONS="--use-spdy=off"
	    echo $URL
	elif [ ${PROTOCOL[$i]} == "h2" ]
	then
	    URL="https://${IP_ADDR}:${PORT[$i]}/$res"
	    PROTO_OPTIONS="--enable-spdy4"
	    echo $URL
	else
	    echo "Invalid protocol"
	fi

	echo "chromium-browser $OPTIONS $PROTO_OPTIONS $URL"
	chromium-browser $OPTIONS $PROTO_OPTIONS $URL 
	clear_cache
    done
done

unset_delay_and_losses "eth0"

exit 0