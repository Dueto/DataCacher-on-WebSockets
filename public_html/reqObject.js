(function(window)
{   
    var reqObject = function()
    { 
        var me = {};  
        
        me.db_server = '';
        me.db_name = '';
        me.db_group = '';
        me.db_mask = '';
        me.currentItem = 0;
        
        me.setDbServer = function(db_server)
        {
            this.db_server = db_server;
        };
        
        me.setDbName = function(db_name)
        {
            this.db_name = db_name;
        };
        
        me.setDbGroup = function(db_group)
        {
            this.db_group = db_group;
        };
        
        me.setDbMask = function(db_mask)
        {
            this.db_mask = db_mask;
        };
        
        me.getDbServer = function()
        {
            return this.db_server;
        };
        
        me.getDbName = function()
        {
            return this.db_name;
        };
        
        me.getDbGroup = function()
        {
            return this.db_group;
        };
        
        me.getDbMask = function()
        {
            return this.db_mask;
        };
        
        me.getDbItem = function(number)
        {
            return this.db_mask[number];
        };
        
        

        
        return me;
            
    }; 
    
    window.reqObject = reqObject;
    

})(window);
