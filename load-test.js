import http from "k6/http";

export const options = {
  vus: 10,
  duration: '30s',
  maxRedirects:0
};

export default function () {
  const res=http.get('http://localhost:5000/api/url/aNtreSV');
  if (res.status !== 200 && res.status !== 302) {
    console.log(`FAILED ${res.status}: ${res.body}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    }
}