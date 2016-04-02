/* HTML5 magic
- GeoLocation
- WebSpeech
*/


//WebSpeech API
var final_transcript = '';
var recognizing = false;
var last10messages = []; //to be populated later

if (!('webkitSpeechRecognition' in window)) {
  console.log("webkitSpeechRecognition is not available");
} else {
  var recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = function() {
    recognizing = true;
  };

  recognition.onresult = function(event) {
    var interim_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
        $('#msg').addClass("final");
        $('#msg').removeClass("interim");
      } else {
        interim_transcript += event.results[i][0].transcript;
        $("#msg").val(interim_transcript);
        $('#msg').addClass("interim");
        $('#msg').removeClass("final");
      }
    }
    $("#msg").val(final_transcript);
    };
  }

  function startButton(event) {
    if (recognizing) {
      recognition.stop();
      recognizing = false;
      $("#start_button").prop("value", "Record");
      return;
    }
    final_transcript = '';
    recognition.lang = "en-GB"
    recognition.start();
    $("#start_button").prop("value", "Recording ... Click to stop.");
    $("#msg").val();
  }
//end of WebSpeech

/*
Functions
*/
function toggleNameForm() {
   $("#login-screen").toggle();
}

function toggleChatWindow() {
  $("#main-chat-screen").toggle();
}

// Pad n to specified size by prepending a zeros
function zeroPad(num, size) {
  var s = num + "";
  while (s.length < size)
    s = "0" + s;
  return s;
}

// Format the time specified in ms from 1970 into local HH:MM:SS
function timeFormat(msTime) {
  var d = new Date(msTime);
  return zeroPad(d.getHours(), 2) + ":" +
    zeroPad(d.getMinutes(), 2) + ":" +
    zeroPad(d.getSeconds(), 2) + " ";
}

$(document).ready(function() {
  //setup "global" variables first
  var socket = io.connect("127.0.0.1:3000");
  var myRoomID = null;
  var language_client ="en";
  
  var lan_sel_dropdown = document.getElementById("lan_select");
  lan_sel_dropdown.addEventListener("click",setLang);
  function setLang(){
	if(this.selectedIndex > 0){
      language_client = this.options[this.selectedIndex].value;
    }
  }
  
  $("form").submit(function(event) {
    event.preventDefault();
  });

  $("#conversation").bind("DOMSubtreeModified",function() {
    $("#conversation").animate({
        scrollTop: $("#conversation")[0].scrollHeight
      });
  });

  $("#main-chat-screen").hide();
  $("#errors").hide();
  $("#name").focus();
  $("#join").attr('disabled', 'disabled'); 
  
  if ($("#name").val() === "") {
    $("#join").attr('disabled', 'disabled');
  }

  //enter screen
  $("#nameForm").submit(function() {
    var name = $("#name").val();
    var device = "desktop";
    if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
      device = "mobile";
    }
    if (name === "" || name.length < 2) {
      $("#errors").empty();
      $("#errors").append("Please enter a name");
      $("#errors").show();
    } else {
      socket.emit("joinserver", name, device);
      toggleNameForm();
      toggleChatWindow();
      $("#msg").focus();
    }
  });

  $("#name").keypress(function(e){
    var name = $("#name").val();
    if(name.length < 2) {
      $("#join").attr('disabled', 'disabled'); 
    } else {
      $("#errors").empty();
      $("#errors").hide();
      $("#join").removeAttr('disabled');
    }
  });

  //main chat screen
  $("#chatForm").submit(function() {
    var msg = $("#msg").val();
    if (msg !== "") {
      socket.emit("send", new Date().getTime(), msg);
      $("#msg").val("");
    }
  });

  //'is typing' message
  var typing = false;
  var timeout = undefined;

  function timeoutFunction() {
    typing = false;
    socket.emit("typing", false);
  }

  $("#msg").keypress(function(e){
    if (e.which !== 13) {
      if (typing === false && myRoomID !== null && $("#msg").is(":focus")) {
        typing = true;
        socket.emit("typing", true);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 5000);
      }
    }
  });

  socket.on("isTyping", function(data) {
    if (data.isTyping) {
      if ($("#"+data.person+"").length === 0) {
        $("#updates").append("<li id='"+ data.person +"'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " is typing.</small></li>");
        timeout = setTimeout(timeoutFunction, 5000);
      }
    } else {
      $("#"+data.person+"").remove();
    }
  });

  $("#showCreateRoom").click(function() {
    $("#createRoomForm").toggle();
  });

  $("#createRoomBtn").click(function() {
    var roomExists = false;
    var roomName = $("#createRoomName").val();
    socket.emit("check", roomName, function(data) {
      roomExists = data.result;
       if (roomExists) {
          $("#errors").empty();
          $("#errors").show();
          $("#errors").append("Room <i>" + roomName + "</i> already exists");
        } else {      
        if (roomName.length > 0) { //also check for roomname
          socket.emit("createRoom", roomName);
          $("#errors").empty();
          $("#errors").hide();
          }
        }
    });
  });

  $("#rooms").on('click', '.joinRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("joinRoom", roomID);
  });

  $("#rooms").on('click', '.removeRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("removeRoom", roomID);
    $("#createRoom").show();
  }); 

  $("#leave").click(function() {
    var roomID = myRoomID;
    socket.emit("leaveRoom", roomID);
    $("#createRoom").show();
  });

  $("#people").on('click', '.whisper', function() {
    var name = $(this).siblings("span").text();
    $("#msg").val("w:"+name+":");
    $("#msg").focus();
  });

//socket-y stuff
socket.on("exists", function(data) {
  $("#errors").empty();
  $("#errors").show();
  $("#errors").append(data.msg + " Try <strong>" + data.proposedName + "</strong>");
    toggleNameForm();
    toggleChatWindow();
});

socket.on("history", function(data) {
  if (data.length !== 0) {
    $("#msgs").append("<li><strong><span class='text-warning'>Last 10 messages:</li>");
    $.each(data, function(data, msg) {
      $("#msgs").append("<li><span class='text-warning'>" + msg + "</span></li>");
    });
  } else {
    $("#msgs").append("<li><strong><span class='text-warning'>No past messages in this room.</li>");
  }
});

  socket.on("update", function(msg) {
    $("#msgs").append("<li>" + msg + "</li>");
  });

  socket.on("update-people", function(data){
    //var peopleOnline = [];
    $("#people").empty();
    $('#people').append("<li class=\"list-group-item active\">People online <span class=\"badge\">"+data.count+"</span></li>");
    $.each(data.people, function(a, obj) {
      if (!("country" in obj)) {
        html = "";
      } else {
        html = "<img class=\"flag flag-"+obj.country+"\"/>";
      }
      $('#people').append("<li class=\"list-group-item\"><span>" + obj.name + "</span> <i class=\"fa fa-"+obj.device+"\"></i> " + html + " <a href=\"#\" class=\"whisper btn btn-xs\">whisper</a></li>");
      //peopleOnline.push(obj.name);
    });

  });

  socket.on("chat", function(msTime, person, msg) {
    console.log(msg);
	var translateURL = "https://www.googleapis.com/language/translate/v2?key=YOUR_API_KEY&target=" + language_client  +"&q=" + msg;
	var req = new XMLHttpRequest();
	req.open("GET",translateURL,true)
	req.responseType = "json";
	req.send();
	req.onreadystatechange = function(){
		if(this.readyState === 4){
			var newMsg = this.response.data.translations[0].translatedText;
			//msTime = timeFormat(msTime);
			perName = person.name;
			idGiven =  msTime + perName;
			idGiven = idGiven.replace(' ','');
			$("#msgs").append("<li><strong><span class='text-success'>" + timeFormat(msTime) + person.name + "</span></strong>: " + newMsg + "<i class='em' id='"+ idGiven +"'></i>"+"</li>");
			//clear typing field
			$("#"+person.name+"").remove();
			clearTimeout(timeout);
			timeout = setTimeout(timeoutFunction, 0);			
			console.log(newMsg);
			var translateURL2 = "https://www.googleapis.com/language/translate/v2?key=YOUR_API_KEY&target=en&q=" + msg;
			var req2 = new XMLHttpRequest();
			req2.open("GET",translateURL2,true)
			req2.responseType = "json";
			req2.send();
			req2.onreadystatechange = function(){
				if(req2.readyState === 4){
					var msg2 = req2.response.data.translations[0].translatedText;
					console.log(msg2);
					msg2 = msg2.toLowerCase();
					msg2 = escape(msg2);
					var emotionURL_1 = "https://api.havenondemand.com/1/api/async/analyzesentiment/v1?text=" + msg2 + "&language=eng&apikey=" + "YOUR_API_KEY"
					var re3 = new XMLHttpRequest();
					re3.open("GET",emotionURL_1,true);
					re3.responseType = 'json';
					re3.send();
					re3.onreadystatechange = function(){
						if(re3.readyState===4){
							var jobId = re3.response.jobID;
							var emotionURL_2 = "https://api.havenondemand.com/1/job/result/" + jobId + "?apikey=" + "YOUR_API_KEY";
							var re4 = new XMLHttpRequest();
							re4.open("GET",emotionURL_2,true);
							re4.responseType = 'json';
							re4.send();
							re4.onreadystatechange = function(){
								if(re4.readyState===4){
									var temp_emo_res = re4.response.actions;
									var emo_sentiment = temp_emo_res[0].result.aggregate.sentiment;
									var emo_score = temp_emo_res[0].result.aggregate.score;
									if(emo_score>0.5){
										emo_sentiment = "very-" + emo_sentiment;
									}
									if(emo_score<-0.5){
										emo_sentiment = "very-" + emo_sentiment;
									}
									//To support emoji.css
									if(emo_sentiment === "neutral"){
										emo_sentiment = "em-neutral_face";
									}
									if(emo_sentiment === "negative"){
										emo_sentiment = "em-dissapointed";
									}
									if(emo_sentiment === "very-negative"){
										emo_sentiment = "em-cry";
									}
									if(emo_sentiment === "positive"){
										emo_sentiment = "em-blush";
									}
									if(emo_sentiment === "very-positive"){
										emo_sentiment = "em-grinning";
									}
									var idOfMsg = String(idGiven);
									console.log(idGiven);
									var bs = $("i#" + idOfMsg)[0];
									console.log(bs);
									bs.classList.add(emo_sentiment);
								}
							}
						}
					}
				}
			}
		}
	}
  });

  socket.on("whisper", function(msTime, person, msg) {
    if (person.name === "You") {
      s = "whisper"
    } else {
      s = "whispers"
    }
    $("#msgs").append("<li><strong><span class='text-muted'>" + timeFormat(msTime) + person.name + "</span></strong> "+s+": " + msg + "</li>");
  });

  socket.on("roomList", function(data) {
    $("#rooms").text("");
    $("#rooms").append("<li class=\"list-group-item active\">List of rooms <span class=\"badge\">"+data.count+"</span></li>");
     if (!jQuery.isEmptyObject(data.rooms)) { 
      $.each(data.rooms, function(id, room) {
        var html = "<button id="+id+" class='joinRoomBtn btn btn-default btn-xs' >Join</button>" + " " + "<button id="+id+" class='removeRoomBtn btn btn-default btn-xs'>Remove</button>";
        $('#rooms').append("<li id="+id+" class=\"list-group-item\"><span>" + room.name + "</span> " + html + "</li>");
      });
    } else {
      $("#rooms").append("<li class=\"list-group-item\">There are no rooms yet.</li>");
    }
  });

  socket.on("sendRoomID", function(data) {
    myRoomID = data.id;
  });

  socket.on("disconnect", function(){
    $("#msgs").append("<li><strong><span class='text-warning'>The server is not available</span></strong></li>");
    $("#msg").attr("disabled", "disabled");
    $("#send").attr("disabled", "disabled");
  });

});
