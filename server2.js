var express = require('express')
, app = express()
, server = require('http').createServer(app)
, io = require("socket.io").listen(server)
, bodyParser = require('body-parser')
, Room = require('./room.js')
, _ = require('underscore')._;

app.set('port', 8080);
app.set('ipaddr', "127.0.0.1");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/static', express.static('public'));
app.set('view engine', 'ejs');
app.set('views','views');

app.get('/', function(req, res) {
  res.render('index_3.ejs');
});

server.listen(app.get('port'), function(){
	console.log('Express server listening on ' + "localhost" + ' and port ' + app.get('port'));
});

io.set("log level", 1);

var usernames = {};

io.sockets.on('connection', function (socket) {

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		io.sockets.emit('updatechat', socket.username, data);
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		socket.username = username;
		usernames[username] = username;
		socket.emit('updatechat', 'SERVER', 'you have connected');
		socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
		io.sockets.emit('updateusers', usernames);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		delete usernames[socket.username];
		io.sockets.emit('updateusers', usernames);
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
	});
});
