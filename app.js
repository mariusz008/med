
var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    cons = require('consolidate'),
    dust = require('dustjs-helpers'),
    pg = require('pg'),
    app = express();

//const route = require('./router');
//DB connection String
var connect = "postgress://m008:admin@localhost/med";

//Assign Dust Engine to .views Files

app.engine('dust', cons.dust);

app.set('view engine', 'dust');
app.set('views', __dirname + '/views');

//Set public folder
app.use(express.static(path.join(__dirname, 'views')));

//Body Parser MiddleWare
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// app.use(route.routes());

app.get('/', function (req, res) {
  var specjalnosci = "";
  pg.connect(connect, function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    var pesel = req.body.Pesel;
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



app.post('/register', function (req, res) {
  if (!registerValidation(req)) {
    console.error("Wypełnij poprawnie wszystkie pola");
    //res.redirect("register.html");
    return;
  }

  pg.connect(connect, function (err, client, done) {
    if(err) {
      return console.error('erroe', err);
    }
    //var pesel = req.body.Pesel;
    //console.log(pesel);
    client.query('INSERT INTO pacjent (pesel, imie, nazwisko, email, haslo, telefon) VALUES($1, $2, $3, $4, $5, $6)',
      [req.body.Pesel, req.body.Imie, req.body.Nazwisko, req.body.Email, req.body.haslo, req.body.Telefon], function(err, result) {
        if(err) {
          return console.error('register error', err);
        }
      done();
        res.redirect("register.html");
      console.log("Zostales zarejestrowany");
      });
  });


});

function registerValidation(req, res) {
  var correctForm = false;

  if(req.body.Pesel.length == 11) correctForm = true;

  return correctForm;
}
//Server
app.listen(3000, function () {
  console.log("Server starts on port 3000");
});

