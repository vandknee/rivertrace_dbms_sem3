const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./database/connection');
const workspace = require('./database/workspace');
const explore = require('./database/explorer');
const port = Number(process.env.PORT || 8080);
const host = '127.0.0.1';
const files = {
  '/':'workspace.html','/workspace.js':'workspace.js','/workspace.css':'workspace.css',
  '/explorer':'index.html','/style.css':'style.css','/app.js':'app.js'
};
const actions = new Set(['overview','stations','station','ranking','tree','network','trace','path']);
const parameters = new Set(['year','q','river','status','sort','id','to','direction','method']);
let active = 0;
function json(res,status,body) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}
const messages = {
  ER_DUP_ENTRY:'That ID, name or station/year already exists.',
  ER_NO_REFERENCED_ROW_2:'The selected related record no longer exists.',
  ER_ROW_IS_REFERENCED_2:'Another record still references this row.',
  ER_CHECK_CONSTRAINT_VIOLATED:'A value is outside its permitted range.',
  ER_DATA_TOO_LONG:'A field exceeds its allowed length.',
  ER_TRUNCATED_WRONG_VALUE:'Check the number or date you entered.',
  ER_WARN_DATA_OUT_OF_RANGE:'A number is outside the supported range.',
  ER_LOCK_DEADLOCK:'Concurrent change detected. Refresh and retry.'
};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname.startsWith('/db/')) {
      if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return json(res,403,{error:'Open the form on the local RiverTrace site.'});
      if (['POST','PUT','DELETE'].includes(req.method) && req.headers['content-type'] !== 'application/json') return json(res,415,{error:'Use a JSON request.'});
      return json(res,200,await workspace(req,url));
    }
    if (req.method !== 'GET') return json(res,405,{error:'Use GET.'});
    if (url.pathname === '/network.geojson') {
      const [rows] = await pool.query('select feature from river_segment order by id');
      return json(res,200,{type:'FeatureCollection',features:rows.map(row => row.feature)});
    }
    const action = url.pathname.slice(5);
    if (url.pathname.startsWith('/api/') && actions.has(action)) {
      const args = [action];
      for (const [key,value] of url.searchParams) {
        if (!parameters.has(key) || value.length > 200 || value.includes('\0') || url.searchParams.getAll(key).length !== 1) return json(res,400,{error:'Invalid explorer parameter.'});
        args.push(key,value);
      }
      const name = process.platform === 'win32' ? 'rivertrace.exe' : 'rivertrace';
      const program = ['build','build/Release'].map(dir => path.join(__dirname,dir,name)).find(file => fs.existsSync(file));
      if (!program) return json(res,503,{error:'Build the C++ explorer first. See README.md.'});
      if (active >= 8) return json(res,503,{error:'Explorer is busy. Try again.'});
      active++;
      try {
        const result = await explore(program,args);
        return json(res,result.status,result.body);
      } finally { active--; }
    }
    if (!Object.hasOwn(files,url.pathname)) return json(res,404,{error:'Page not found.'});
    const file = files[url.pathname];
    const type = {html:'text/html',css:'text/css',js:'application/javascript'}[file.split('.').pop()];
    const content = await fs.promises.readFile(path.join(__dirname,'web',file));
    res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});
    res.end(content);
  } catch (error) {
    let status = error.status || 500;
    let message = error.status && error.message;
    if (messages[error.code] || error.code === 'ER_SIGNAL_EXCEPTION') {
      status = 409;
      message = messages[error.code] || error.sqlMessage;
    } else if (['ECONNREFUSED','ENOTFOUND','ER_ACCESS_DENIED_ERROR','ER_BAD_DB_ERROR','ER_NO_SUCH_TABLE'].includes(error.code)) {
      status = 503;
      message = 'MySQL is unavailable. Check the service, .env and schema setup.';
    }
    if (!message) console.error(error.code || error.message);
    json(res,status,{error:message || 'Request failed. See the server terminal.'});
  }
}).listen(port,host,() => console.log('RiverTrace: http://' + host + ':' + port));
