(function(window)
{   
    var dataCacher = function()
    { 
        var me = {};
        
        me.db = '';
        me.webSocket = new webSockets('wss://localhost:12345/ADEI/ADEIWS/runsockets.php');
        me.dataHandl = new dataHandler();
        me.dateHelper = new dateTimeFormat();
        me.request = new reqObject();
        me.clientsCallback = '';
        me.messageCount = 0;
        
        me.onopen = function()
        {
            
        };
        
        me.getData = function(db_server,
                              db_name,
                              db_group,
                              db_mask,
                              window,
                              pointCount,
                              onEndCallBack,
                              onEndCallBackAll)
        {
          var self = this;
          self.clientsCallback = onEndCallBack; 
          
          self.request.setDbServer(db_server);
          self.request.setDbName(db_name);
          self.request.setDbGroup(db_group);
          self.request.setDbMask(db_mask.split(',')); 
          
          self.messageCount = 0;          
          self.webSocket.flushCallbacks();          
          self.dataHandl.flushData();
          self.dataHandl.setClientsCallback(onEndCallBackAll);
          self.dataHandl.setChannelCount(self.request.getChannelCount());
          
          var level = self.dataHandl.getDataLevel(pointCount, window);
          
          if(self.dateHelper.checkWindowFormat(window))
          {
                self.db.transaction(function(req)
                { 
                   self.request.getDbMask().forEach(function(db_item, index, ar)
                   {  
                      req.executeSql('SELECT * FROM DataSource WHERE db_server = "' + self.request.getDbServer() + '" AND \n\
                                                                  db_name = "' + self.request.getDbName() + '" AND \n\
                                                                  db_group = "' + self.request.getDbGroup() + '" AND \n\
                                                                  db_mask = "' + db_item + '"', [], function(count){ return function (req, results)
                   {         
                      if(results.rows.length == 0)
                      {  
                          self.requestAllData(count, level.window, window);
                      }               
                      else
                      { 
                          var counter = 0;                          
                          var idDataSource = results.rows.item(0).id;
                          
                          var beginTime = self.dateHelper.splitTimeFromUnix(window.split('-')[0]);
                          var endTime = self.dateHelper.splitTimeFromUnix(window.split('-')[1]);   
                          
                          beginTime = self.dataHandl.formatUnixData(beginTime, level);
                          endTime = self.dataHandl.formatUnixData(endTime, level);
                          
                          self.db.transaction(function(req)
                          {      
                              req.executeSql('SELECT DateTime, PointData FROM "' + idDataSource + '" WHERE  (DateTime) <=  "' + endTime + '" AND \n\
                                                                                         (DateTime) >= "' + beginTime + '" AND (DateTime) LIKE "%' + level.aggregator + '%" ORDER BY DateTime', [],function(counter){ return function (req, res)
                              
                              {            
                                  if(res.rows.length != 0)
                                  {
                                        var dataBuffer = [];     
                                        var dateTime = [];
                                        
                                        self.dataHandl.concatRowData(res, dataBuffer, dateTime);
                                        
                                        var returnedEndTime = (dateTime[dateTime.length - 1]);
                                        var returnedBeginTime = (dateTime[0]);
                                        
                                        if (beginTime == returnedBeginTime && endTime == returnedEndTime)
                                        {                                       
                                            var label = results.rows.item(0).channellabel;
                                            self.clientsCallback({data: dataBuffer, dateTime: dateTime, label: label});
                                            self.dataHandl.concatData({data: dataBuffer, dateTime: dateTime, label: label});
                                        }
                                        
                                        if(returnedBeginTime > beginTime && returnedEndTime == endTime)
                                        {
                                            var b = Date.parse(beginTime)/1000;
                                            var e = Date.parse(returnedBeginTime)/1000;
                                            var needenTime = b + '-' + e; 
                                            
                                            self.requestLeftData(count, 
                                                                 needenTime,
                                                                 level.window,
                                                                 idDataSource,
                                                                 dataBuffer,
                                                                 dateTime,
                                                                 onEndCallBack);
                                            
                                        }
                                        if(returnedBeginTime == beginTime && returnedEndTime < endTime)
                                        {                       
                                            var e = Date.parse(endTime)/1000;
                                            var b = Date.parse(returnedEndTime)/1000;
                                            var needenTime = b + '-' + e;
                                            
                                            self.requestRightData(count, 
                                                                 needenTime,
                                                                 level.window,
                                                                 idDataSource,
                                                                 dataBuffer,
                                                                 dateTime,
                                                                 onEndCallBack);
                                        }
                                        if(beginTime < returnedBeginTime && endTime > returnedEndTime)
                                        {
                                            var e = Date.parse(returnedBeginTime)/1000;
                                            var b = Date.parse(returnedEndTime)/1000;
                                            
                                            var needenTime1 = b + '-' + Date.parse(endTime)/1000;
                                            var needenTime2 = (Date.parse(beginTime)/1000) + '-' + e;
                                            
                                            self.requestRightData(count, 
                                                                 needenTime1,
                                                                 level.window,
                                                                 idDataSource,
                                                                 [],
                                                                 [],
                                                                 function(objRightData)
                                                                 {
                                                                     if(objRightData != null)
                                                                     {
                                                                        self.requestLeftData(count, 
                                                                                             needenTime2,
                                                                                             level.window,
                                                                                             idDataSource,
                                                                                             dataBuffer,
                                                                                             dateTime,
                                                                                             function(objLeftData)
                                                                                             {
                                                                                                 if(objLeftData != null)
                                                                                                 {
                                                                                                    objLeftData.data = objLeftData.data.concat(objRightData.data);
                                                                                                    objLeftData.dateTime = objLeftData.dateTime.concat(objRightData.dateTime);
                                                                                                    onEndCallBack(objLeftData);
                                                                                                    self.continue(objLeftData);
                                                                                                 }
                                                                                                 else
                                                                                                 {
                                                                                                     self.onEmptyData('No response.');
                                                                                                 }
                                                                                             });      
                                                                     }       
                                                                     else
                                                                     {
                                                                         self.onEmptyData('No response.');
                                                                     }
                                                                 });
                                        }
                                  }
                                  else
                                  {
                                       self.insertNeedenData(count,
                                                            window,
                                                            level.window,
                                                            idDataSource,
                                                            onEndCallBack);
                                  }
                              };}(counter));
                          },
                          self.onError,
                          self.onReadyTransaction);   
                      }
                      
                   };
               }(index) ); 
               });}, 
                this.onError,
                this.onReadyTransaction);
          }
          else
          {
              console.log('Bad window format.');
          }
        };
        
        me.requestAllData = function(index, level, window)
        {
            var self = this;
            var stringToSend = self.formURL(self.request.getDbServer(), self.request.getDbName(), self.request.getDbGroup(), self.request.getDbItem(index), window, level);    
            self.webSocket.addCallback(function(i){ return function(msg)
            {      
                var objData = self.dataHandl.parseData(msg.data);
                if (objData.label != undefined) 
                {        
                       self.clientsCallback(objData);
                       self.dataHandl.concatData(objData);
                       self.db.transaction(function(req)
                       {
                           var idDataSource;
                           req.executeSql('INSERT INTO DataSource (db_server, db_name, db_group, db_mask, channellabel ) VALUES ("' + self.request.getDbServer() + '","' 
                                                                          + self.request.getDbName() + '","'
                                                                          + self.request.getDbGroup() + '","'
                                                                          + self.request.getDbItem(i) + '", "' 
                                                                          + objData.label + '")');
                           req.executeSql('SELECT id FROM DataSource WHERE db_server = "' + self.request.getDbServer() + '" AND \n\
                                                     db_name = "' + self.request.getDbName() + '" AND \n\
                                                     db_group = "' + self.request.getDbGroup() + '" AND \n\
                                                     db_mask = "' + self.request.getDbItem(i) + '"', [], function (req, results)
                           {         
                               idDataSource = results.rows.item(0).id;
                               req.executeSql('CREATE TABLE IF NOT EXISTS "' + idDataSource + '" (DateTime NOT NULL UNIQUE, PointData)');
                               req.executeSql('CREATE INDEX IF NOT EXISTS DateTimeIndex ON "' + idDataSource + '" (DateTime)');  
                               for (var p = 0; p < objData.dateTime.length; p++) 
                               {                         
                                   req.executeSql('INSERT OR REPLACE INTO "' + idDataSource + '" (DateTime, PointData) ' + 'VALUES ' + '("' + objData.dateTime[p] + '",' + objData.data[p] + ')');                                                
                               }  


                           });                       
                       },
                       self.onError,
                       self.onReadyTransaction);
                }                                
                else
                {      
                     self.onEmptyData(msg.data);                                      
                }
            };}(index));              
            self.webSocket.sendMessage(stringToSend);    
        }; 

        me.requestRightData = function(count,
                                        window,
                                        level,
                                        idDataSource,
                                        dataBuffer,
                                        dateTime,
                                        onEndCallBack)
        {
            var self = this;
            var stringToSend = self.formURL(self.request.getDbServer(), self.request.getDbName(), self.request.getDbGroup(), self.request.getDbItem(count), window, level);                
            self.webSocket.addCallback(function(msg)
            {   
                var objData = self.dataHandl.parseData(msg.data);
                if (objData.label != undefined) 
                { 
                    var clone = {};
                    clone.data = objData.data.slice(0);
                    clone.dateTime = objData.dateTime.slice(0);
                    self.insertData(clone, idDataSource);
                    
                    
                        dataBuffer = dataBuffer.concat(objData.data);
                        dateTime = dateTime.concat(objData.dateTime);

                        objData.data = dataBuffer;
                        objData.dateTime = dateTime;

                        onEndCallBack(objData);
                        self.dataHandl.concatData(objData);
                   
                }
                else
                {      
                    self.onEmptyData(msg.data);                                        
                }    
            }); 
            
            self.webSocket.sendMessage(stringToSend);
            
        };
        
        me.insertAllData = function(index, msg)
        {          
            var self = this;            
            var objData = self.dataHandl.parseData(msg.data);
            if (objData.label != undefined) 
            {        
                   self.clientsCallback(objData);
                   self.dataHandl.concatData(objData);
                   self.db.transaction(function(req)
                   {
                       var idDataSource;
                       req.executeSql('INSERT INTO DataSource (db_server, db_name, db_group, db_mask, channellabel ) VALUES ("' + self.request.getDbServer() + '","' 
                                                                      + self.request.getDbName() + '","'
                                                                      + self.request.getDbGroup() + '","'
                                                                      + self.request.getDbItem(index) + '", "' 
                                                                      + objData.label + '")');
                       req.executeSql('SELECT id FROM DataSource WHERE db_server = "' + self.request.getDbServer() + '" AND \n\
                                                 db_name = "' + self.request.getDbName() + '" AND \n\
                                                 db_group = "' + self.request.getDbGroup() + '" AND \n\
                                                 db_mask = "' + self.request.getDbItem(index) + '"', [], function (req, results)
                       {         
                           idDataSource = results.rows.item(0).id;
                           req.executeSql('CREATE TABLE IF NOT EXISTS "' + idDataSource + '" (DateTime NOT NULL UNIQUE, PointData)');
                           req.executeSql('CREATE INDEX IF NOT EXISTS DateTimeIndex ON "' + idDataSource + '" (DateTime)');  
                           for (var p = 0; p < objData.dateTime.length; p++) 
                           {                         
                               req.executeSql('INSERT OR REPLACE INTO "' + idDataSource + '" (DateTime, PointData) ' + 'VALUES ' + '("' + objData.dateTime[p] + '",' + objData.data[p] + ')');                                                
                           }  


                       });                       
                   },
                   self.onError,
                   self.onReadyTransaction);
            }                                
            else
            {      
                 self.onEmptyData(msg.data);                                      
            }    
        };
        
        me.requestLeftData = function(count,
                                        window,
                                        level,
                                        idDataSource,
                                        dataBuffer,
                                        dateTime,
                                        onEndCallBack)
        {
            var self = this;
            var stringToSend = self.formURL(self.request.getDbServer(), self.request.getDbName(), self.request.getDbGroup(), self.request.getDbItem(count), window, level);                
            self.webSocket.addCallback(function(msg)
            {  
                var objData = self.dataHandl.parseData(msg.data);
                if (objData.label != undefined) 
                {   
                    var clone = {};
                    clone.data = objData.data.slice(0);
                    clone.dateTime = objData.dateTime.slice(0);
                    self.insertData(clone, idDataSource);
                    
                    objData.data = objData.data.concat(dataBuffer);
                    objData.dateTime = objData.dateTime.concat(dateTime);

                    onEndCallBack(objData);
                    self.dataHandl.concatData(objData);
                }
                else
                {      
                    self.onEmptyData(msg.data);                                     
                }    
             });  
             
             self.webSocket.sendMessage(stringToSend);            
        };
        

     
                               
        me.insertNeedenData = function(count,
                                       window,
                                       level,
                                       idDataSource,
                                       onEndCallBack)
        {
            var self = this;
            var stringToSend = self.formURL(self.request.getDbServer(), self.request.getDbName(), self.request.getDbGroup(), self.request.getDbItem(count), window, level);                
            self.webSocket.addCallback(function(msg)
            {                  
                var objData = self.dataHandl.parseData(msg.data);
                if (objData.label != undefined) 
                {   
                    onEndCallBack(objData);
                    self.dataHandl.concatData(objData);
                    self.insertData(objData, idDataSource);
                }
                else
                {      
                    self.onEmptyData(msg.data);                                         
                }    
            }); 
            
            self.webSocket.sendMessage(stringToSend);
        };
        
  
        me.onOpenSocket = function(msg)
        {
            console.log('Socket opened.');
        };
        
        me.onErrorSocket = function(msg)
        {
            console.log(msg);
        };
        
        me.onMessageSocket = function(msg)
        {
             
        };
        
        me.onCloseSocket = function(msg)
        {
            console.log('Socket closed.');
        };
        
        me.openDataBase = function(name)
        {
            if(this.db == '')
            {
                this.db = window.openDatabase(name, '1.0', '', 50*1024*1024);                               
            }
        };

        me.formDataBase = function()
        {            
            this.db.transaction(function (req)
            {
                req.executeSql('CREATE TABLE IF NOT EXISTS DataSource (id INTEGER PRIMARY KEY AUTOINCREMENT,\n\
                                                                         db_server,\n\
                                                                         db_name,\n\
                                                                         db_group,\n\
                                                                         db_mask,\n\
                                                                         channellabel)'); 
            }, 
            this.onError,
            this.onReadyTransaction);
        };

        me.insertData = function(objData, idDataSource)
        {   
            var self = this;
                    self.db.transaction(function(req)
                    {                        
                        for (var i = 0; i < objData.dateTime.length; i++) 
                        {                               
                            req.executeSql('INSERT OR REPLACE INTO "' + idDataSource + '" (DateTime, PointData) ' + 'VALUES ' + '("' + objData.dateTime[i] + '",' + objData.data[i] + ')', [], function(req,res)
                            {                                
                            });                                                
                        }  
                    },
                    self.onError,
                    self.onReadyTransaction);          
        };           
   
        me.onReadyTransaction = function()
        {                
            console.log( 'Transaction completed.' );
	};
 
	me.onError = function( err )
        {
            console.log( err );
	};
        
        me.onErrorSql = function(err)
        {
            console.log( err );
        };
        
        me.onReadySql = function()
        {
            console.log( 'Executing SQL completed.' );
        };
        
        me.onEmptyData = function(msg)
        {
            this.clientsCallback(msg);
            throw ('There is no data in server responses');
        }
        
       me.formURL = function(db_server, db_name, db_group, db_mask, window, level)
        {
            var url = 'http://localhost/adei-branch/adei/services/getdata.php?db_server=' + db_server 
                    + '&db_name=' + db_name
                    + '&db_group=' + db_group 
                    + '&db_mask=' + db_mask 
                    + '&experiment=' + window 
                    + '&window=' + level 
                    + '&format=csv';                        
            return url; 
        };
        
        
        
        me.openDataBase('DB');    
        me.formDataBase(); 
        
        me.webSocket.setOnOpenHandler(me.onOpenSocket);
        me.webSocket.setOnMessageHandler(function(msg)
            {
                me.webSocket.getCallbacks()[me.messageCount](msg);
                me.messageCount++;                
            });
        me.webSocket.setOnCloseHandler(me.onCloseSocket); 
        me.webSocket.setOnErrorHandler(me.onErrorSocket);
        me.webSocket.openSocket();

        return me;
        
        
    
    
    
    }; 
    
    window.dataCacher = dataCacher;
    

})(window);



