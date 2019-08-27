const express 	= require('express');
const auto 		= require("./cloud/auto.js");
const myApp 	= require('./cloud/app.js') ;


const app = express();
app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/static'));

app.get('/project/:projId/component/:component', auto.project)
app.get('/project/component/:component', auto.project)

app.options('/project/:projId/cloud/:cloud', auto.options)
app.get('/project/:projId/cloud/:cloud', auto.project)
app.post('/project/:projId/cloud/:cloud', auto.project)
app.options('/project/cloud/:cloud', auto.options)
app.get('/project/cloud/:cloud', auto.project)
app.post('/project/cloud/:cloud', auto.project)

app.get('*', myApp.run)

app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});