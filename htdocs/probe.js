// Class
// NavigationTimingInfo : unit of data for navigation timing
// @attr ressourceName : name of the ressource fetched
// @attr requestStart : date on which the beginning of the request was send
// @attr responseStart : date on which the beginning of the response was received
// @attr responseEnd : date on which the end of the response was received
function NavigationTimingInfo(ressourceName, requestStart, responseStart, responseEnd) {
    this.ressourceName = ressourceName;
    this.requestStart = requestStart;
    this.responseStart = responseStart;
    this.responseEnd = responseEnd;
}

// QualityInfo : unit of data for the current quality
// @attr time : date on wich info about quality was measured
// @attr bandwidth : current bandwidth used
// @attr width : related width
// @attr height : related height
// @attr codec : current codec used
// @attr bufferLevel : current level of the buffer

function QualityInfo(time, bandwidth, width, height, codec, bufferLevel) {
    this.time = time; // Current time
    this.bandwidth = bandwidth; // Current bandwidth used
    this.width = width; // Related width
    this.height = height; // Related height
    this.codec = codec; // Current codec used
    this.bufferLevel = bufferLevel; // Current level of the buffer
}

function playing() {
    console.log("########################## VIDEO IS PLAYING #######################");
    var time = performance.now(); // Time when the video begins to be played
    var metricsVideo = player.getMetricsFor("video"); // Metrics object for video
    var metricsExt = player.getMetricsExt(); // Extensions of the metrics

    if (firstPlay) {
        metrics.startupTime = computeStartupTime(time); // Startup Time (in ms)
        firstPlay = false;
    }

    metrics.duration = video.duration // Total duration of the video (in s)

    getQualityTimer = window.setInterval(getCurrentQuality, 2000, metrics, metricsVideo, metricsExt);
    //getStallsTimer=window.setInterval(getStallsInfo,4000);
    console.log(metrics);
}

function ended() {
    console.log("########################## VIDEO IS ENDED #######################");
    $("#videoTag").off("playing", playing);
    window.clearInterval(getQualityTimer);
    computeNavigationTiming();
    // SEND the metrics object to node.js server @SEE ajax.js
    $.post(urlNode, metrics, success);
    // window.close()
}

function success(data, textStatus, jqXHR) {
    if (data.status == "ok") {
        console.log("Can close the browser");
        window.close();
    }
}

function stalled() {
    metrics.nbStalls++; // Total number of stalled event
    metrics.stalledSet.push(video.currentTime); // Date related the video duration, from which the event was raised
}

/*function getName(){
    $.get(manifestURL,"",function(data,textStatus,jqXHR){
        var elementName=;
        var xmlDoc=$.parseXML(data);
        var xml=$(xmlDoc);
        var name=xml.find(elementName).text();
    }
}*/

// Compute the startup time
// @param time : Time when the video begins to be played
// @return res : startupTime
function computeStartupTime(time) {
    var start = performance.getEntriesByName(manifestURL)[0].requestStart;
    var end = time;
    res = end - start;
    console.log("STARTUPTIME DEBUG \n" + "start= " + start + "\n" + "end= " + end + "\n" + "startupTime= " + res + "\n");
    return res;
}

function computeNavigationTiming() {
    var ressourceName,
        requestStart,
        responseStart,
        responseEnd;

    var navigationTiming = window.performance.getEntries();

    for (var i = 0; i < navigationTiming.length; i++) {
        if (navigationTiming[i].initiatorType == "xmlhttprequest") {
            ressourceName = (new URI(navigationTiming[i].name)).filename();
            requestStart = navigationTiming[i].requestStart;
            responseStart = navigationTiming[i].responseStart;
            responseEnd = navigationTiming[i].responseEnd;
            metrics.navigationTiming.push(new NavigationTimingInfo(ressourceName, requestStart, responseStart, responseEnd));
        }
    }
}

// Compute the current quality metrics
// @param metrics : Time when the video begins to be played
// @param metricsVideo : Metrics object for video, see @dash.js src code
// @param metricsExt : Extensions of the metrics, see @dash.js src code
// @return res : none

function getCurrentQuality(metrics, metricsVideo, metricsExt) {
    //console.log("********** GET CURRENT QUALITY ***********");
    var time,
        bandwidth,
        width,
        height,
        codec,
        bufferLevel;

    // If video is ended, get current metrics is no more necessary
    if (video.currentTime >= video.duration) {
        return null;
    }

    // Get the current reprsentation played
    var repSwitch = metricsExt.getCurrentRepresentationSwitch(metricsVideo);

    // Retrieve information from this data structure
    time = video.currentTime;
    bandwidth = getBandwidth(repSwitch.to, metricsExt);
    width = getVideoWidth(repSwitch.to, metricsExt);
    height = getVideoHeight(repSwitch.to, metricsExt);
    codec = getCodec(repSwitch.to, metricsExt);
    bufferLevel = metricsExt.getCurrentBufferLevel(metricsVideo).level;

    // Add data to global metrics object
    metrics.qualitySet.push(new QualityInfo(time, bandwidth, width, height, codec, bufferLevel));
    return;
}

function getStallsInfo() {
    console.log("########### GET STALLS INFO #########################");
}

var findRepresentionInPeriodArray = function(periodArray, representationId) {
    var period,
        adaptationSet,
        adaptationSetArray,
        representation,
        representationArray,
        periodArrayIndex,
        adaptationSetArrayIndex,
        representationArrayIndex;

    for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
        period = periodArray[periodArrayIndex];
        adaptationSetArray = period.AdaptationSet_asArray;
        for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
            adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
            representationArray = adaptationSet.Representation_asArray;
            for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                representation = representationArray[representationArrayIndex];
                if (representationId === representation.id) {
                    return representation;
                }
            }
        }
    }

    return null;
};

var getVideoWidth = function(representationId, metricsExt) {
    var self = metricsExt,
        manifest = self.manifestModel.getValue(),
        representation,
        periodArray = manifest.Period_asArray;

    representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);

    if (representation === null) {
        return null;
    }

    return representation.width;
};

var getVideoHeight = function(representationId, metricsExt) {
    var self = metricsExt,
        manifest = self.manifestModel.getValue(),
        representation,
        periodArray = manifest.Period_asArray;

    representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);

    if (representation === null) {
        return null;
    }

    return representation.height;
};

var getCodec = function(representationId, metricsExt) {
    var self = metricsExt,
        manifest = self.manifestModel.getValue(),
        representation,
        periodArray = manifest.Period_asArray;

    representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);

    if (representation === null) {
        return null;
    }

    return representation.codecs;
};

var getBandwidth = function(representationId, metricsExt) {
    var self = metricsExt,
        manifest = self.manifestModel.getValue(),
        representation,
        periodArray = manifest.Period_asArray;

    representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);

    if (representation === null) {
        return null;
    }

    return representation.bandwidth;
}

var getIndexForRepresentation = function(representationId, metricsExt) {
    var self = metricsExt,
        manifest = self.manifestModel.getValue(),
        representationIndex,
        periodArray = manifest.Period_asArray;

    representationIndex = findRepresentationIndexInPeriodArray.call(self, periodArray, representationId);
    return representationIndex;
}

// Function to run the player

function runPlayer(url) {
    var context = new Dash.di.DashContext();
    player = new MediaPlayer(context);
    player.startup();
    player.attachView(document.querySelector("#videoTag"));
    player.attachSource(url);
}


// When document is loaded
$(document).ready(function() {
    console.log("################# DOM ready !!! ############################");
    var uri=new URI();
    firstPlay = true;
    
    video = $("#videoTag")[0];
    var videoName=uri.filename().split(".")[0];

    metrics = {
        name: videoName,
        duration: 0,
        startupTime: 0,
        nbStalls: 0
    };
    metrics.qualitySet = [];
    metrics.navigationTiming = [];
    metrics.stalledSet = [];

    // Triggers element
    $("#videoTag").on("playing", playing);
    $("#videoTag").on("ended", ended);
    $("#videoTag").on("stalled", stalled);

    // Configuration of content location
    var protocol = uri.protocol();
    var ip_addr = location.host; //"161.106.2.57";
    
    // Port for node.js server for non-secure communication
    var portNode = "8000";
    
    // By default, I assume it is HTTP/1.1
    var port = "80";
    metrics.protocol = "http/1.1";

    if (window.chrome.loadTimes().wasFetchedViaSpdy) {
        port = "80";
        metrics.protocol = "h2c";
    }
    if (protocol == "https") {
        port = "443";
        portNode = "8001";
        metrics.protocol = "https/1.1";
        if (window.chrome.loadTimes().wasFetchedViaSpdy) {
            port = "443";
            metrics.protocol = "h2";
        }
    }
    var url = protocol + "://" + ip_addr + ":" + port + "/content/"+videoName+"/"+videoName+".mpd";//"/movies/gpac-content/mp4-main-multi-mpd-AV-NBS.mpd";
    urlNode = protocol + "://127.0.0.1:" + portNode + "/insert";
    manifestURL = protocol + "://" + ip_addr + "/content/"+videoName+"/"+videoName+".mpd"
    runPlayer(url);
});