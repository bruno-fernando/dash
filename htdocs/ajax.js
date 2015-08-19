success=function(data,textStatus,jqXHR){
    console.log(data);
}

keyboardHandler=function(event){
    console.log(event.charCode);
    if(event.charCode==115){
	console.log('POST is send');
	$.post('http://127.0.0.1:8000/insert',obj,success);
	/*$.ajax({
	    url:'http://127.0.0.1:8000',
	    data:obj
	})*/
    }
    else{
        console.log('Type s to send the POST');
    }
}

$(document).ready(function(){
   console.log('Document is ready');
    obj={
        nom:'fernando',
        prenom:'bruno',
        age:22,
        note:[1,2,3,4,5]
    };
    /*$.post({
	url:'http://127.0.0.1:8000/',
	crossDomain:true
    });*/
    $(document).keypress(keyboardHandler);
});