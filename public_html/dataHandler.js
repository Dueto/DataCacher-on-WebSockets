(function(window)
{   
    var dataHandler = function()
    { 
        var me = {};  
        
        me.dateHelper = new dateTimeFormat();
        
        me.dataLevel = [{level: 'Year', aggregator: '-01-01T00:00:00.000000', window: 31536000},
                        {level: 'Month', aggregator: '-01T00:00:00.000000', window: 2592000},
                        {level: 'Day', aggregator: 'T00:00:00.000000', window: 86400},                        
                        {level: 'Hour', aggregator: ':00:00.000000', window: 3600},                         
                        {level: 'Min', aggregator: ':00.000000', window: 60},      
                        {level: 'Sec', aggregator: '.000000', window: 1},
                        {level: 'Milisec', aggregator: '', window: 0}];
        
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
            
            return {data: allData,dateTime: dateTime,label: labels, };
        };
        
        me.concatRowData = function(res, dataBuffer, dateTime)
        {                                   
            for (k = 0; k < res.rows.length; k++) 
            {                                      
                dataBuffer.push(res.rows.item(k).PointData);   
                dateTime.push(res.rows.item(k).DateTime);                                       
            } 
        };
        
         me.getDataLevel = function(window)
        {   
            if(window < 31536000)
            {
                if(window < 2592000)
                {
                    if(window < 86400)
                    {
                        if(window < 3600)
                        {
                            if(window < 60)
                            {
                                if(window < 1)
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
            if(dataLevel.level == 'Year')
            {
                return dateTime.substring(0,4) + dataLevel.aggregator;
            }
            if(dataLevel.level == 'Month')
            {
                return dateTime.substring(0,7) + dataLevel.aggregator;
            }
            if(dataLevel.level == 'Day')
            {
                return dateTime.substring(0,10) + dataLevel.aggregator;
            }
            if(dataLevel.level == 'Hour')
            {
                return dateTime.substring(0,13) + dataLevel.aggregator;
            }
            if(dataLevel.level == 'Min')
            {
                return dateTime.substring(0,16) + dataLevel.aggregator;
            }
            if(dataLevel.level == 'Sec')
            {
                return dateTime.substring(0,19) + dataLevel.aggregator;
            }
            if(dataLevel.level == 'Milisec')
            {
                return dateTime;
            }
        };
        
        return me;
            
    }; 
    
    window.dataHandler = dataHandler;
    

})(window);




