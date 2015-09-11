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
    var filename="rtt_"+getCurrentDate()+log_extension;
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
                videoSet[name].average[proto]=computeAverage(videoSet[name].data[proto]);
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

var computeAverage=function(tab){
    var cpt=0;
    for(var i=0;i<tab.length;i++){
        cpt+=tab[i];
    }
    return Math.round(cpt/tab.length);
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