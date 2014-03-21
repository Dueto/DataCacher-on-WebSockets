(function(window)
{   
    var dataHandler = function()
    { 
        var me = {};  
        
        me.dataLevel = [{level: 'Year', aggregator: '-01-01T00:00:00.000000', window: 31536000},
                        {level: 'Month', aggregator: '-01T00:00:00.000000', window: 2592000},
                        {level: 'Day', aggregator: 'T00:00:00.000000', window: 86400},                        
                        {level: 'Hour', aggregator: ':00:00.000000', window: 3600},                         
                        {level: 'Min', aggregator: ':00.000000', window: 60},      
                        {level: 'Sec', aggregator: '.000000', window: 1},
                        {level: 'Milisec', aggregator: '', window: 0}];
        me.clientsCallback = '';        
        me.allData = {data: [], dateTime: [], label: []};
        me.channelCount = '';
        me.currentChannel = 0;
        
        me.setClientsCallback = function(_clientsCallback)
        {
            this.clientsCallback = _clientsCallback;
        };
        
        me.setChannelCount = function(_channelCount)
        {
            this.channelCount = _channelCount;
        };
        
        me.parseData = function(strData)
        {
            var strDelimiter = ",";
            var objPattern = new RegExp(
                    (                            
                        "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +                            
                        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +                           
                        "([^\"\\" + strDelimiter + "\\r\\n]*))"
                    ),
                    "gi"
                    );
            var arrData = [[]];            
            var arrMatches = null;            
            while (arrMatches = objPattern.exec(strData))
            {                    
                var strMatchedDelimiter = arrMatches[1];
                if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter))
                {                          
                    arrData.push( [] );
                }
                if (arrMatches[2])
                {
                    var strMatchedValue = arrMatches[2].replace(new RegExp( "\"\"", "g" ), "\"");
                } 
                else 
                {
                    var strMatchedValue = arrMatches[3];
                }
                arrData[arrData.length - 1].push( strMatchedValue );
            }
            
            var labels = [];
            labels = arrData[0][1];
            var dateTime = [];
            var allData = [];
            for(var i = 1; i < arrData[0].length; i++)
            {
                //labels.push(arrData[0][i]);
                //allData.push([]);
            }
            for(var i = 1; i < arrData.length; i++)
            {
                var k = 0;
                dateTime.push(arrData[i][0]);                
                for(var j = 1; j < arrData[0].length; j++)
                {
                    allData.push(arrData[i][j]);
                } 
                k++;
            }
            
            return {data: allData,dateTime: dateTime,label: labels};
        };
        
        me.concatRowData = function(res, dataBuffer, dateTime)
        {                                   
            for (var k = 0; k < res.rows.length; k++) 
            {                                      
                dataBuffer.push(res.rows.item(k).PointData);   
                dateTime.push(res.rows.item(k).DateTime);                                       
            } 
        };
        
         me.getDataLevel = function(pointCount ,window)
        {   
            var diffrence = window.split('-')[1] - window.split('-')[0];
            var multiplier = diffrence/pointCount;            
            if(multiplier < 31536000)
            {
                if(multiplier < 2592000)
                {
                    if(multiplier < 86400)
                    {
                        if(multiplier < 3600)
                        {
                            if(multiplier < 60)
                            {
                                if(multiplier < 1)
                                {
                                    return this.dataLevel[6];
                                }
                                else
                                {
                                    return this.dataLevel[5];
                                }
                            }
                            else
                            {
                                return this.dataLevel[4];
                            }
                        }
                        else
                        {
                            return this.dataLevel[3];
                        }
                    }
                    else
                    {
                        return this.dataLevel[2];
                    }
                }
                else 
                {
                    return this.dataLevel[1];
                }

            }
            else
            {
                return this.dataLevel[0];
            }

            
        };
        
        me.formatUnixData = function(dateTime, dataLevel)
        {
            var aggregatorLen = dataLevel.aggregator.length;
            var dateTimeLen = dateTime.length;
            var formatedData = (dateTime.substring(0, dateTimeLen - aggregatorLen) + dataLevel.aggregator);
            return formatedData;
        };
        
        me.concatData = function(objData)
        {
            this.allData.dateTime = objData.dateTime;
            this.allData.data.push(objData.data);
            this.allData.label.push(objData.label);
            this.currentChannel++;
            if(this.currentChannel == this.channelCount)
            {
                this.clientsCallback(this.allData);
            }                   
        };
        
        me.flushData = function()
        {
            this.clientsCallback = '';        
            this.allData = {data: [], dateTime: [], label: []};
            this.channelCount = '';
            this.currentChannel = 0;
        };
        
        return me;
            
    }; 
    
    window.dataHandler = dataHandler;
    

})(window);




