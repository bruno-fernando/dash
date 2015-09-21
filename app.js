var express=require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');
var bodyParser=require('body-parser');
var mongoose=require('mongoose');

var app=express();
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);
var dbUrl='mongodb://127.0.0.1:27017/dash'

// DB connection

var connection=mongoose.connect(dbUrl);

var QualitySchema=mongoose.Schema({
    time: Number,
    bandwidth: Number,
    width: Number,
    height: Number,
    codec: String,
    bufferLevel: Number
});

var navigationTSchema=new mongoose.Schema({
    resourceName:String,
    requestStart:Number,
    responseStart:Number,
    responseEnd:Number
});

var metricsSchema=new mongoose.Schema({
    sessionId: String,
    name: String,
    date: Date,
    duration: Number,
    startupTime: Number,
    playingDuration: Number,
    nbStalls: Number,
    qualitySet:[
        QualitySchema
    ],
    navigationTiming:[  
        navigationTSchema
    ],
    stalledSet:[Number],
    protocol: String
});

//var Model=mongoose.model.bind(mongoose);
var MetricsModel=mongoose.model('metricsSet',metricsSchema,'metricsSet');

// Parse the request
app.use(bodyParser.urlencoded({extended:true,limit:'10mb',parameterLimit:10000000000}));
app.use(bodyParser.json({limit:'10mb'}));

app.post('/insert', function (req, res) {
    // count the number of document in the database
    MetricsModel.count({},function(err,count){
        if(err){
            console.log(err);
        }
        else{
            console.log("ok");
            // add the ID os the session
            req.body.sessionId="dash_"+(count+1);
            // add some field to the object
            req.body.date=new Date().toUTCString();
            // display the object
            console.log(req.body);
        }
        var metrics=new MetricsModel(req.body);
        metrics.save(function(err){
            if(err){
                console.error(err);
            }
            else{
                // Send a 200 response + allow cross-domain
                res.type('application/json');
                res.set({
                    'Access-Control-Allow-Origin':'*',
                    'Access-Control-Allow-Headers':'X-Requested-With'
                });
                res.send({status:'ok'});
            }
        });
    });
});

var IFS=",";
var log_extension=".csv";
var nbProto=3;

app.get('/startupTime',function(req,res){
    var query={};
    var fields='protocol startupTime';
    var filename="startupTime_"+getCurrentDate()+log_extension;
    var protocol={
        "http/1.1":[],
        "https/1.1":[],
        "h2":[]
    };
    
    MetricsModel.find(query,fields,function(err,docs){
        var content="h2,https/1.1,http/1.1\n",
        doc={},
        size;
        
        for(var i=0;i<docs.length;i++){
            doc=docs[i];
            protocol[doc.protocol].push(doc.startupTime);
            
        }
        size=Math.min(protocol["h2"].length,protocol["https/1.1"].length,protocol["http/1.1"].length);
        for(var i=0;i<size;i++){
            content+=protocol["h2"][i]+IFS+protocol["https/1.1"][i]+IFS+protocol["http/1.1"][i];
            if(i!=(size-1)){
                content+="\n";
            }
        }
        fs.writeFileSync("./log/"+filename,content);
        res.type('text/plain');
        res.send("File "+filename+" generated"+"\n\n"+content);
        //TODO res.download("/home/bruno/workspace/node-app/log/"+filename);
    });
});

app.get('/playingDuration',function(req,res){
    var videoName=req.query.videoName;
    var query={name: videoName};
    var fields='protocol playingDuration name';
    var filename="playingDuration_"+videoName+"_"+getCurrentDate()+log_extension;
    var protocol={
        "http/1.1":[],
        "https/1.1":[],
        "h2":[]
    };
    
    MetricsModel.find(query,fields,function(err,docs){
        var content="h2,https/1.1,http/1.1\n",
        doc={},
        size;
        
        for(var i=0;i<docs.length;i++){
            doc=docs[i];
            protocol[doc.protocol].push(doc.playingDuration);
            
        }
        size=Math.min(protocol["h2"].length,protocol["https/1.1"].length,protocol["http/1.1"].length);
        for(var i=0;i<size;i++){
            content+=protocol["h2"][i]+IFS+protocol["https/1.1"][i]+IFS+protocol["http/1.1"][i];
            if(i!=(size-1)){
                content+="\n";
            }
        }
        fs.writeFileSync("./log/"+filename,content);
        res.type('text/plain');
        res.send("File "+filename+" generated"+"\n\n"+content);
        //TODO res.download("/home/bruno/workspace/node-app/log/"+filename);
    });
});

app.get('/rtt',function(req,res){
    var query={};
    var fields='protocol navigationTiming';
    var filename="rtt_"+getCurrentDate()+log_extension;
    
    var protocol={
        "http/1.1":[],
        "https/1.1":[],
        "h2":[]
    };
    
    MetricsModel.find(query,fields,function(err,docs){
        var content="h2,https/1.1,http/1.1\n",
        doc={},
        rtt=0,
        size;
        for(var i=0;i<docs.length;i++){
            doc=docs[i];
            for(var j=0;j<doc.navigationTiming.length;j++){
                rtt=doc.navigationTiming[j].responseStart-doc.navigationTiming[j].requestStart;
                protocol[doc.protocol].push(rtt);
            }
        }
        size=Math.min(protocol["h2"].length,protocol["https/1.1"].length,protocol["http/1.1"].length);
        for(var i=0;i<size;i++){
            content+=protocol["h2"][i]+IFS+protocol["https/1.1"][i]+IFS+protocol["http/1.1"][i];
            if(i!=(size-1)){
                content+="\n";
            }
        }
        fs.writeFileSync("./log/"+filename,content);
        res.type('text/plain');
        res.send("File "+filename+" generated"+"\n\n"+content);
        //TODO res.download("/home/bruno/workspace/node-app/log/"+filename);
    });
});

app.get('/quality',function(req,res){
    var videoName=req.query.videoName;
    var query={name: videoName};
    var fields='protocol qualitySet';
    var filename="quality_"+getCurrentDate()+log_extension;
    var protocol={
        "http/1.1":[],
        "https/1.1":[],
        "h2":[]
    };
    
    console.log(videoName);
    
    /* MetricsModel.find(query,fields,function(err,docs){
       var content="time,h2,time,https/1.1,time,http/1.1\n",
       doc={},
       rtt=0,
       size;
       for(var i=0;i<docs.length;i++){
       doc=docs[i];
       for(var j=0;j<doc.navigationTiming.length;j++){
       rtt=doc.navigationTiming[j].responseEnd-doc.navigationTiming[j].requestStart;
       protocol[doc.protocol].push(rtt);
       }
       }
       size=Math.min(protocol["h2"].length,protocol["https/1.1"].length,protocol["http/1.1"].length);
       for(var i=0;i<size;i++){
       content+=protocol["h2"][i]+IFS+protocol["https/1.1"][i]+IFS+protocol["http/1.1"][i];
       if(i!=(size-1)){
       content+="\n";
       }
       }
       fs.writeFileSync("./log/"+filename,content);
       res.type('text/plain');
       res.send("File "+filename+" generated"+"\n\n"+content);
       //TODO res.download("/home/bruno/workspace/node-app/log/"+filename);
       });
    */
    res.type('text/plain');
    res.send("File "+filename+" generated"+"\n\n"+videoName);
});

app.get('/stalls',function(req,res){
    var videoName=req.query.videoName;
    var query={};//{name: videoName};
    var fields='name protocol nbStalls';
    var filename="stalls_"+getCurrentDate()+log_extension;
    var protocol={
        "http/1.1":0,
        "https/1.1":0,
        "h2":0
    };
    
    var videoSet={};
    
    console.log(videoName);
    
    MetricsModel.find(query,fields,function(err,docs){
        var content="",
            doc={},
            nbvideo=0,
            size=Number.MAX_VALUE;
        // Initialize the data structure
        for(var i=0;i<docs.length;i++){
            doc=docs[i];
            if(!videoSet[doc.name]){
                videoSet[doc.name]={
                    data:{
                        "http/1.1":[],
                        "https/1.1":[],
                        "h2":[],
                    },
                    average:{
                        "http/1.1":0,
                        "https/1.1":0,
                        "h2":0
                    }
                };
                nbvideo++;
            }
            videoSet[doc.name].data[doc.protocol].push(doc.nbStalls);
        }
        
        // Compute the average
        for(var name in videoSet){
            for(var proto in videoSet[name].data){
                videoSet[name].average[proto]=computeAverageInt(videoSet[name].data[proto]);
            }
        }
        
        var cptVideo=1;
        var cptProto;
        
        // Put the header in the content
        content+="protocol"+IFS;
        for(var name in videoSet){
            content+=name;
            if(cptVideo==nbvideo){
                content+="\n";
            }
            else{
                content+=IFS;
            }
            cptVideo++;
        }
        
        // Fill in the content
        for(var proto in protocol){
            cptVideo=1;
            content+=proto+IFS;
            for(var name in videoSet){
                content+=videoSet[name].average[proto];
                if(cptVideo!=nbvideo){
                    content+=IFS;
                }
                cptVideo++;    
            }
            content+="\n"
        }
        /*cptVideo=1;
        for(var nameG in videoSet){
            cptProto=1;
            for(var proto in videoSet[nameG].average){
                content+=videoSet[name].average[proto];
                if(!(cptVideo==nbvideo && cptProto==nbProto)){
                    content+=IFS;
                }
                cptProto++;
            }
            cptVideo++;
        }*/
            
        fs.writeFileSync("./log/"+filename,content);
        res.type('text/plain');
        res.send("File "+filename+" generated"+"\n\n"+content);
        //TODO res.download("/home/bruno/workspace/node-app/log/"+filename);
    });
});


app.get('/bufferLevel',function(req,res){
    var videoName=req.query.videoName;
    var query={"name": videoName};
    var fields='name protocol qualitySet';
    var filename="bufferLevel_"+videoName+"_"+getCurrentDate()+log_extension;
    var protocol={
        "http/1.1":{
            data:[],
            average:[]
        },
        "https/1.1":{
            data:[],
            average:[]
        },
        "h2":{
            data:[],
            average:[]
        }
    };
    
    console.log(videoName);
    
    MetricsModel.find(query,fields,function(err,docs){
        var content="",
            doc={};
        // Initialize the data structure
        for(var i=0;i<docs.length;i++){
            doc=docs[i];
            var proto=doc.protocol;
            //console.log(doc.qualitySet[0]);
            protocol[proto].data[0]=[].push(0);
            for(var j=0;j<doc.qualitySet.length;j++){
                var time=Math.round(doc.qualitySet[j].time);
                //console.log(doc.qualitySet[j].time);
                //console.log(typeof time);
                if(!protocol[proto].data[time]){ // if undefined
                    //console.log("true");
                    protocol[proto].data[time]=new Array();
                    //console.log(protocol[proto].data[time]);
                    //console.log(time);
                }
                else{
                   // console.log("false");
                }
                protocol[proto].data[time].push(parseFloat(doc.qualitySet[j].bufferLevel));
                //console.log("RESULTAT"+protocol["h2"].data[1]);
                //console.log(doc.qualitySet[j].bufferLevel);
                //console.log(protocol[proto].data[time]);
            }
        }
        
        // Compute the average
        for(var proto in protocol){
            for(var time=0;time<protocol[proto].data.length;time++){
                console.log("proto--> "+proto+" time -->"+time+" : "+protocol[proto].data[time]);
                if(protocol[proto].data[time]){
                    protocol[proto].average[time]=computeAverageFloat(protocol[proto].data[time]);
                }
                else{
                    protocol[proto].average[time]=(parseFloat(protocol[proto].data[time+1])+parseFloat(protocol[proto].data[time-1]))/2;
                }
            }
        }
        
        size=Math.min(protocol["h2"].average.length,protocol["https/1.1"].average.length,protocol["http/1.1"].average.length);
        for(var i=0;i<size;i++){
            content+=protocol["h2"].average[i]+IFS+protocol["https/1.1"].average[i]+IFS+protocol["http/1.1"].average[i];
            if(i!=(size-1)){
                content+="\n";
            }
        }
            
        fs.writeFileSync("./log/"+filename,content);
        res.type('text/plain');
        res.send("File "+filename+" generated"+"\n\n"+content);
        //TODO res.download("/home/bruno/workspace/node-app/log/"+filename);
    });
});

var computeAverageInt=function(tab){
    var sum=0;
    for(var i=0;i<tab.length;i++){
        sum+=tab[i];
    }
    return Math.round(sum/tab.length);
}

var computeAverageFloat=function(tab){
    var sum=0;
    for(var i=0;i<tab.length;i++){
        sum+=parseFloat(tab[i]);
    }
    return sum/tab.length;
}

var getCurrentDate=function(){
    var date=new Date();
    var display="";
    var day=twoDigit(date.getDate());
    month=twoDigit(date.getMonth()+1);
    year=date.getFullYear();
    hour=twoDigit(date.getHours());
    minutes=twoDigit(date.getMinutes());
    display+=day+"-"+month+"-"+year+"_"+hour+"h"+minutes;
    return display;
}

var twoDigit=function(num){
    return("0"+num).slice(-2);
}

// your express configuration here

httpServer.listen(8000);
httpsServer.listen(8001);