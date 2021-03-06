var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    server;

var mysql = require('mysql2'),mysql_conn;
var offline_notice={"am":"Your customer is offline at the moment and will get back to you once online.","en":"Your AM is offline at the moment and will get back to you once online.","fr":"Votre Responsable Clientèle est actuellement hors ligne et vous répondra dès que possible","it":"La tua AM non è in linea al momento e sarà tornarti appena in linea.","de":"Ihr AM ist jetzt offline und wird Ihnen einmal online antworten."};

var db_config = {
    host: '144.76.xx.xx',
    user: 'cmchat',
    password: 'JCHJBFOr7P5Nl3DglM7u',
    database: 'dunk',
    port:'33067'
};

function handleDisconnect() {
  mysql_conn = mysql.createConnection(db_config);
                                                

  mysql_conn.connect(function(err) {              
    if(err) {                                    
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 1000); 
    }                                     
  });                                    
                                          
  mysql_conn.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
      handleDisconnect();                        
    } else {                                      
      throw err;                                 
    }
  });
}

handleDisconnect();



server = http.createServer(function(req, res){
    // your normal server code
    var path = url.parse(req.url).pathname;
    switch (path){
    case '/':
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<h1>Hello! Try the <a href="/cm.html">Customer Manager</a> page </h1>');
        res.write('<h1>Hello! Try the <a href="/cus.html">Customer</a> page</h1>');
        res.end();
        break;
    case '/cm.html':
        fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res,err);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
        });
        break;
    case '/cus-am.html':
        fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res,err);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
        });
        break;
    case '/cm-one.html':
        fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res,err);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
        });
        break;
    case '/cus.html':
        fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res,err);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
        });
        break;
    default: send404(res);
    }
}),

// 404 error page
send404 = function(res,err){
    res.writeHead(404);
    res.write('404' + err);
    res.end();
};

// send offline message when online
sendLeaveMsg = function(userId,socket){

   for (i in offline_msg_queue[userId]){
     sendMsg(socket,offline_msg_queue[userId][i])
   }
   // delete from msg queue
   delete offline_msg_queue[userId]
   // delete from mysql
   var sql = "update chat_leave_message set msg_status = 1 , msg_rec_dt = '"+ getDatetime() +"' where msg_userid = '"+ userId +"'"
   console.log(sql)
   mysql_conn.query(sql, function(err) {
   if(err){
      console.log(err);
   }
  }); 
}

// send message function
sendMsg=function(socket,msg){
  socket.emit('send-message',msg);
  var msgcontent = msg.info
  msgcontent = msgcontent.replace("'","\'")
   msgcontent = msgcontent.replace("\n"," ")
  var sql = "insert into chat_log(chat_from,chat_to,send_dt,chat_content) values ('"+ msg.from +"','"+ msg.to + "',NOW(),'"+ msgcontent +"')" 
  mysql_conn.query(sql, function(err, rows) {
  if(err){
      console.log(err);
   }

  });
  
}
//替换func
 replaceAll=function(strOrg,strFind,strReplace){
 var index = 0;
 while(strOrg.indexOf(strFind,index) != -1){
  strOrg = strOrg.replace(strFind,strReplace);
  index = strOrg.indexOf(strFind,index);
 }
 return strOrg
} 

// save leave message
saveLeaveMsg =function(msg){
   
   //save into memory
   var offline_message = {'from':msg.from,'to':msg.to,'nick':msg.nick,'info':msg.info,'datetime':getDatetime()};
   
   if(offline_msg_queue[msg.to]){
       offline_msg_queue[msg.to].push(offline_message);
   }else{
       offline_msg_queue[msg.to]=[offline_message];
   }
   
   
   //save into mysql
   msg.info = replaceAll(msg.info,"\n"," ")
   msg.info = replaceAll(msg.info,"'","\'")
   var strMsg = JSON.stringify(msg)
   var sql = "insert into chat_leave_message(msg_userid,msg_content,leave_time) values ('"+ msg.to +"','"+ strMsg + "',NOW())";
   mysql_conn.query(sql, function(err, rows) {
     if(err){
      console.log(err);
     }
   });
}

// init leave message
initLeaveMsg = function(){

   var sql = "select msg_userid,msg_content from chat_leave_message where msg_status=0"
   mysql_conn.execute(sql, function(err, rows) {
     if(rows){
       for( x in rows){
        if(offline_msg_queue[rows[x].msg_userid]){
           offline_msg_queue[rows[x].msg_userid].push(JSON.parse(rows[x].msg_content));
        }else{
           offline_msg_queue[rows[x].msg_userid]=[JSON.parse(rows[x].msg_content)];
        }    
       }
     }
   
   }
);   

}

// get current datetime
getDatetime = function(){
    var n=new Date();	
    return n.getFullYear()+"-"+(n.getMonth()+1)+"-"+n.getDate()+" "+n.getHours()+":"+n.getMinutes()+":"+n.getSeconds();
}

//history chat
showHistoryChat = function(userId,socket){
     var sql = "select * from chat_log where chat_to='"+userId +"' or chat_from = '"+ userId + "' order by id desc limit 5";
     mysql_conn.execute(sql, function(err, rows) {
     if(rows){
       for( x in rows){
		 var tmpMsg = {'from':rows[x].chat_from,'to':rows[x].chat_to,'nick':'','info':rows[x].chat_content,'datetime':getDatetime()};
                 socket.emit('send-message',tmpMsg);
       }
     }
     }
   );


} 


//== main   ==
server.listen(5001);
 
var io = require('socket.io').listen(server);

//registed user list, including customer and manager
var regUsers = {}

// socket and userid map
var socketUser ={}

// offline mesage store queue
var offline_msg_queue={}

// load leave message from mysql
initLeaveMsg()

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 3);                    // reduce logging
//io.set('close timeout',30);       
// enable all transports (optional if you want flashsocket support, please note that some hosting
// providers do not allow you to create servers that listen on a port different than 80 or their
// default port)
io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

// socket action
io.sockets.on('connection', function (socket) {
 
     socket.on('reg-user',function(reg){
       //showHistoryChat(reg.userId,socket);
       if (offline_msg_queue[reg.userId]){ sendLeaveMsg(reg.userId,socket);}
       //if( ! regUsers[reg.userId] ){
           if(typeof reg.userlang === 'undefined'){reg.userlang = 'en'} 
           regUsers[reg.userId] = {'socket': socket,'userId':reg.userId,'nickName':reg.nickName,'amsex':reg.amsex,'userlang':reg.userlang};
           socketUser[socket.id] = reg.userId
           io.sockets.emit('new-user', decodeURIComponent(reg.nickName) + " has joined.");
       //}else{
          //var backmsg = {'from':'System','nick':'SYSTEM','to':reg.userId,'info': reg.userId + ' is already online, LOGIN FAILED',datetime:getDatetime()}
          //socket.emit('send-message',backmsg);
          //socket.emit('disconnect');
          //socket.emit('force-offline');
          
       //}
     });

     socket.on('send-message', function(msg){
       if(regUsers[msg.to]){
           msg.datetime = getDatetime()
           sendMsg(regUsers[msg.to].socket,msg)
       }else{
           saveLeaveMsg(msg) 
           lang = regUsers[msg.from].userlang;
           console.log(lang);
           offline_notice_msg= offline_notice[lang];
           var backmsg = {'from':msg.to,'nick':msg.nick,'to':msg.from,'info':offline_notice_msg ,'datetime':getDatetime(),'offline':'y'}
           socket.emit('send-message',backmsg);

       }
     });
     // delete user socket from socketUser list 
     socket.on('disconnect',function(){
        delete regUsers[socketUser[socket.id]];
     });
   

  });


