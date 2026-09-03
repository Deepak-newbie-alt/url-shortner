import http from "k6/http";

export const options = {
  vus: 10,
  duration: '30s',
  maxRedirects:0
};

export default function () {
  const url = __ENV.LOAD_TEST_URL;
  if (!url) {
     throw new Error("LOAD_TEST_URL is not set"); 
  }
  const res=http.get(url);
  if (res.status !== 200 && res.status !== 302) {
    console.log(`FAILED ${res.status}: ${res.body}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    }
}