
const sanitizeUrl=(url)=>{
    try{
        const parsedUrl=new URL(url);

        return {
            host:parsedUrl.hostname,
            path:parsedUrl.pathname
        }
    }catch{
        return{
            host:"invalid_url"
        };
    }
}

module.exports={sanitizeUrl};