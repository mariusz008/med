/**
 * Created by 008M on 30.03.2017.
 */
var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    cons = require('consolidate'),
    dust = require('dustjs-helpers'),
    pg = require('pg'),
    session = require('express-session');
    app = express();

//DB connection String
var connect = "postgress://m008:admin@localhost/med";

//Assign Dust Engine to .views Files

app.engine('dust', cons.dust);

app.set('view engine', 'dust');
app.set('views', __dirname + '/views');

//Set public folder
app.use(express.static(path.join(__dirname, 'app')));

//Body Parser MiddleWare
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function (req, res) {
  var specjalnosci = "";
  pg.connect(connect, function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    client.query('SELECT DISTINCT specjalnosc FROM lekarz order by specjalnosc asc', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }
      //res.render('index', {lekarze: result.rows});
      specjalnosci = result.rows;
      done();
    });
    client.query('SELECT DISTINCT miasto FROM lekarz order by miasto asc', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }
      res.render('index', {spec: specjalnosci, miasta: result.rows});
      done();
    });
  });
});


//Server
app.listen(3000, function () {
  console.log("Server starts on port 3000");
});

