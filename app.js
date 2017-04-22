
var express = require('express'),
  path = require('path'),
  bodyParser = require('body-parser'),
  cons = require('consolidate'),
  dust = require('dustjs-helpers'),
  pg = require('pg'),
  passwordHash = require('password-hash'),
  app = express();
var cheerio = require('cheerio');

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

app.post('/register', function (req, res) {

  pg.connect(connect, function (err, client, done) {
    if(err) {
      return console.error('error', err);
    }
    var Haslo =  passwordHash.generate(req.body.Haslo);
    client.query('INSERT INTO pacjent (pesel, imie, nazwisko, email, haslo, telefon) VALUES($1, $2, $3, $4, $5, $6)',
      [req.body.Pesel, req.body.Imie, req.body.Nazwisko, req.body.Email, Haslo, req.body.Telefon], function(err, result) {
        if(err) {
          return console.error('register error', err);
        }
        done();
        res.redirect("signIn.html");
      });
  });
});

app.get('/login', function (req, res) {

  pg.connect(connect, function (err, client, done) {
    if(err) {
      return console.error('error', err);
    }
    var pesel = req.query.pesel;
    client.query('SELECT pesel, imie, nazwisko, email, haslo, telefon FROM pacjent WHERE pesel = $1',
      [pesel], function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }
       console.log(result.rows);
        done();
        if (result.rowCount == 0) {
          console.log("nie ma w bazie ziomka o takim peselu");
          res.redirect("signIn.html");
         // window.document.getElementById("signInPesel").value = pesel;
        } else if (result.rowCount == 1) {
          if (passwordHash.verify(req.query.Haslo, result.rows[0].haslo)) {
            console.log("poprawne haslo");
            res.redirect("/");
          } else {
            console.log("haslo bledne");
            //window.document.getElementById("signInPesel").value = pesel;
            res.redirect("signIn.html");
          }
        }
    });
  });
});

//Server
app.listen(3000, function () {
  console.log("Server starts on port 3000");
});

