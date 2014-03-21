(function(window)
{   
    var webSockets = function(host)
    { 
        var me = {};  
        
        me.socket = '';
        me.host = host;
        me.callbacks = [];
        me.currentCallback = 0;
        
        me.openSocket = function()
        {
            try 
            {
                this.socket = new WebSocket(this.host);               
            } 
            catch (ex) 
            {
                console.log(ex);
            }            
        };
        
        me.setOnOpenHandler = function(onOpenCallBack)
        {
            this.socket.onopen = onOpenCallBack;
        };
        
        me.setOnMessageHandler = function(onMessageCallBack)
        {
             this.socket.onmessage = onMessageCallBack;
        };
        
        me.setOnCloseHandler = function(onCloseHandler)
        {
             this.socket.onclose = onCloseHandler;
        };
 
        me.setOnErrorHandler = function(onErrorHandler)
        {
             this.socket.onerror = onErrorHandler;
        };        
       
        me.sendMessage = function(msg)
        {
            try 
            {
                this.socket.send(msg);
            } 
            catch (ex) 
            {
                console.log(ex);
            }

        };
        
        me.closeSocket = function()
        {
            this.socket.close();
        };
          
        me.addCallback = function(callback)
        {           
            this.callbacks.push(callback);
        };
        
        me.getCallbacks = function ()
        {
            return this.callbacks;
        };
        
        me.nextCallback = function()
        {
            this.currentCallback++;            
            if(this.currentCallback == this.callbacks.length)
            {
                this.currentCallback = 0;
            }
            this.setOnMessageHandler(this.callbacks[this.currentCallback]);
        };
        
        me.flushCallbacks = function()
        {
            this.callbacks = [];
            this.currentCallback = 0;            
        };
        

        
        
 
            return me;
    };

       
    
    window.webSockets = webSockets;
    

})(window);

