#!/bin/sh

logpath='/opt/livechat/restart.log'
dirpath='/opt/livechat/'
cd $dirpath
pid=`ps aux|grep node|grep -v grep|awk '{print $2}'`
kill -9 $pid
echo $pid
nohup /usr/local/bin/node cs-server.js >> /opt/livechat/amchat.log &
echo "restart ok" >> $logpath
