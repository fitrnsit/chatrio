var express = require('express')
, app = express()
, server = require('http').createServer(app)
, io = require("socket.io").listen(server)
, npid = require("npid")
, uuid = require('node-uuid')
, Room = require('./room.js')
, _ = require('underscore')._;

var bodyParser = require('body-parser');
var methodOverride = require('method-override');

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(methodOverride());
app.use('/static', express.static('public'));
app.set('view engine', 'ejs');
app.set('views','views');

app.get('/', function(req, res) {
  res.render('index_3.ejs');
});

server.listen(app.get('port'), function(){
	console.log('Express server listening on  IP: ' + app.get('ipaddr') + ' and port ' + app.get('port'));
});

io.set("log level", 1);

// usernames which are currently connected to the chat
var usernames = {};

io.sockets.on('connection', function (socket) {

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.emit('updatechat', socket.username, data);
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// we store the username in the socket session for this client
		socket.username = username;
		// add the client's username to the global list
		usernames[username] = username;
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected');
		// echo globally (all clients) that a person has connected
		socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
		// update the list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
	});
});