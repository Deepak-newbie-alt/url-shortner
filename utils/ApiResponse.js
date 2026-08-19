class ApiResponse{
    constructor(
        statusCode,
        data
    ){
        this.statusCode=statusCode;
        this.data=data;
        this.success=statusCode<400;
    }
}

module.exports={ApiResponse}