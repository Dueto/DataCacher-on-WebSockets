(function(window)
{   
    var dataCacher = function()
    { 
        var me = {};
        
        me.db = ''; 
        me.webSocket = new webSockets('ws://localhost:12345/webSockets/index.php');
        me.dataHandl = new dataHandler();
        me.dateHelper = new dateTimeFormat();
        me.clientsCallback = '';
        me.clientsCallbackAll = '';
      
        
        me.allData = {data: [], dateTime: [], label: []};
        
        me.onopen = function()
        {
            
        };
        
        me.getData = function(db_server,
                              db_name,
                              db_group,
                              db_mask,
                              window,
                              aggregator,
                              onEndCallBack,
                              onEndCallBackAll)
        {
          var self = this;
          self.clientsCallback = onEndCallBack; 
          self.clientsCallbackAll = onEndCallBackAll;          
          db_mask = db_mask.split(',');
          var level = self.dataHandl.getDataLevel(aggregator);
          
          if(self.dateHelper.checkWindowFormat(window))
          {
                self.db.transaction(function(req)
                { 
                   for (g = 0; g < db_mask.length; g++) 
                   {  
                      req.executeSql('SELECT * FROM DataSource WHERE db_server = "' + db_server + '" AND \n\
                                                                  db_name = "' + db_name + '" AND \n\
                                                                  db_group = "' + db_group + '" AND \n\
                                                                  db_mask = "' + db_mask[g] + '"', [], function(count){ return function (req, results)
                   {         
                      if(results.rows.length == 0)
                      {  
                          var stringToSend = self.formURL(db_server, db_name, db_group, db_mask, window, aggregator);                          
                          self.webSocket.setOnMessageHandler(function(msg)
                          {   
                                //var csv = new csvReader(msg.data);
                                var objData = self.dataHandl.parseData(msg.data);
                                if (objData.label != undefined) 
                                {        
                                       self.clientsCallback(objData);
                                       self.concatData(objData);
                                       self.db.transaction(function(req)
                                       {
                                           var idDataSource;
                                           req.executeSql('INSERT INTO DataSource (db_server, db_name, db_group, db_mask, channellabel ) VALUES ("' + db_server + '","' + db_name + '","' + db_group + '","' + db_mask[count] + '", "' + objData.label + '")');
                                           req.executeSql('SELECT id FROM DataSource WHERE db_server = "' + db_server + '" AND \n\
                                                                     db_name = "' + db_name + '" AND \n\
                                                                     db_group = "' + db_group + '" AND \n\
                                                                     db_mask = "' + db_mask[count] + '"', [], function (req, results)
                                           {         
                                               idDataSource = results.rows.item(0).id;
                                               req.executeSql('CREATE TABLE IF NOT EXISTS "' + idDataSource + '" (DateTime NOT NULL UNIQUE, PointData)');
                                               req.executeSql('CREATE INDEX IF NOT EXISTS DateTimeIndex ON "' + idDataSource + '" (DateTime)');  
                                               for (p = 0; p < objData.dateTime.length; p++) 
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
                                     self.clientsCallback(null);
                                     console.log('There is no data in server responces.');                                         
                                }                               

                          });
                          self.webSocket.sendMessage(stringToSend);
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
                                            self.concatData({data: dataBuffer, dateTime: dateTime, label: label});
                                        }
                                        
                                        if(returnedBeginTime > beginTime && returnedEndTime == endTime)
                                        {
                                            var b = Date.parse(beginTime)/1000;
                                            var e = Date.parse(returnedBeginTime)/1000;
                                            var needenTime = b + '-' + e; 
                                            
                                            self.requestLeftData(db_server, 
                                                                 db_name, 
                                                                 db_group, 
                                                                 db_mask[count], 
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
                                            
                                            self.requestRightData(db_server, 
                                                                 db_name, 
                                                                 db_group, 
                                                                 db_mask[count], 
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
                                            
                                            self.requestRightData(db_server, 
                                                                 db_name, 
                                                                 db_group, 
                                                                 db_mask[count], 
                                                                 needenTime1,
                                                                 level.window,
                                                                 idDataSource,
                                                                 [],
                                                                 [],
                                                                 function(objRightData)
                                                                 {
                                                                     if(objRightData != null)
                                                                     {
                                                                        self.requestLeftData(db_server, 
                                                                                             db_name, 
                                                                                             db_group, 
                                                                                             db_mask[count], 
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
                                                                                                     onEndCallBack(null);
                                                                                                     console.log('There is no data in server responses.');
                                                                                                 }
                                                                                             });      
                                                                     }       
                                                                     else
                                                                     {
                                                                         onEndCallBack(null);
                                                                         console.log('There is no data in server responses.');
                                                                     }
                                                                 });
                                        }
                                  }
                                  else
                                  {
                                       self.insertNeedenData(db_server,
                                                            db_name,
                                                            db_group,
                                                            db_mask[count],
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
               }(g) ); 
               }}, 
                this.onError,
                this.onReadyTransaction);
          }
          else
          {
              console.log('Bad window format.');
          }
        };    
        
        

        
        

         me.requestRightData = function(db_server,
                                        db_name,
                                        db_group,
                                        db_mask,
                                        window,
                                        level,
                                        idDataSource,
                                        dataBuffer,
                                        dateTime,
                                        onEndCallBack)
        {
            var self = this;
            var stringToSend = self.formURL(db_server, db_name, db_group, db_mask, window, level);                
            self.webSocket.setOnMessageHandler(function(msg)
            {    
                //var csv = new csvReader(msg.data);
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
                        self.concatData(objData);
                   
                }
                else
                {      
                    onEndCallBack(null);            
                    console.log('There is no data in server responces.');                                         
                }    
            }); 
            
            self.webSocket.sendMessage(stringToSend);
            
        };
        
        
        
        me.requestLeftData = function(db_server,
                                        db_name,
                                        db_group,
                                        db_mask,
                                        window,
                                        level,
                                        idDataSource,
                                        dataBuffer,
                                        dateTime,
                                        onEndCallBack)
        {
            var self = this;
            var stringToSend = self.formURL(db_server, db_name, db_group, db_mask, window, level);                
            self.webSocket.setOnMessageHandler(function(msg)
            {    
                //var csv = new csvReader(msg.data);
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
                    self.concatData(objData);
                }
                else
                {      
                    onEndCallBack(null);
                    console.log('There is no data in server responces.');                                         
                }    
             });  
             
             self.webSocket.sendMessage(stringToSend);
            
        };
        

     
                               
        me.insertNeedenData = function(db_server,
                                       db_name,
                                       db_group,
                                       db_mask,
                                       window,
                                       level,
                                       idDataSource,
                                       onEndCallBack)
        {
            var self = this;
            var stringToSend = self.formURL(db_server, db_name, db_group, db_mask, window, level);                
            self.webSocket.setOnMessageHandler(function(msg)
            {    
                //var csv = new csvReader(msg.data);
                var objData = self.dataHandl.parseData(msg.data);
                if (objData.label != undefined) 
                {   
                    onEndCallBack(objData);
                    self.concatData(objData);
                    self.insertData(objData, idDataSource);
                }
                else
                {      
                    onEndCallBack(null);                    
                    console.log('There is no data in server responces.');                                         
                }    
            }); 
            
            self.webSocket.sendMessage(stringToSend);
        };
        
        me.concatData = function(objData)
        {
            this.allData.dateTime = objData.dateTime;
            this.allData.data.push(objData.data);
            this.allData.label.push(objData.label);
            this.clientsCallbackAll(this.allData);
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
                        for (i = 0; i < objData.dateTime.length; i++) 
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
        me.webSocket.setOnMessageHandler(me.onMessageSocket);
        me.webSocket.setOnCloseHandler(me.onCloseSocket); 
        me.webSocket.setOnErrorHandler(me.onErrorSocket);
        me.webSocket.openSocket();

        return me;
        
        
    
    
    
    }; 
    
    window.dataCacher = dataCacher;
    

})(window);



