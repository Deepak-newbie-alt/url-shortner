
class CircuitBreaker{
    constructor({
        failureThreshold=5,
        resetTimeout=5000
    }={}){
        this.failureThreshold=failureThreshold;
        this.resetTimeout=resetTimeout;

        this.failedAttempt=0;
        this.state="CLOSED";
        this.nextAttempt=0;
        this.halfOpenInProgress=false;
    }

    async execute(action){
        if(this.state==="OPEN"){
            if(Date.now()<this.nextAttempt){
                return null;
            }

            if(this.halfOpenInProgress){
                return null;
            }
            this.state="HALF_OPEN";
            this.halfOpenInProgress=true;
            try{
                console.log("Circuit is half open");
                const result=await action();
                this.onSuccess();
                return result;
            }catch(err){
                this.state="OPEN";
                this.nextAttempt=Date.now()+this.resetTimeout;
                console.log("Circuit is opening....redis unavailable");
                return null;
            }finally{
                this.halfOpenInProgress=false;
            }
        }
        //executes if circuit is closed
        try{
            const result=await action();

            this.onSuccess();
            return result;
        }catch(err){
            this.onFailure();
            return null;
        }
    }

    onSuccess(){
        this.failedAttempt=0;
        this.state="CLOSED";
    }

    onFailure(){
        this.failedAttempt++;

        if(this.failedAttempt>=this.failureThreshold){
            this.state="OPEN";
            this.nextAttempt=Date.now()+this.resetTimeout;

            console.log("Circuit opens");
        }
    }
}

module.exports={CircuitBreaker};