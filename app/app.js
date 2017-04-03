/**
 * Created by 008M on 30.03.2017.
 */
var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    cons = require('consolidate'),
    dust = require('dustjs-helpers'),
    pg = require('pg'),
    app = express();

//DB connection String
var connect = "postgress://m008:admin@localhost/med";

//Assign Dust Engine to .dust Files

app.engine('dust', cons.dust);

app.set('view engine', 'dust');
app.set('views', __dirname + '/views');

//Set public folder
app.use(express.static(path.join(__dirname, 'public')));

//Body Parser MiddleWare
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function (req, res) {
  res.render('index');
});
//Server
app.listen(3000, function () {
  console.log("Server starts on port 3000");
});

