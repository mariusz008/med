
var express = require('express'),
  path = require('path'),
  bodyParser = require('body-parser'),
  cons = require('consolidate'),
  dust = require('dustjs-helpers'),
  pg = require('pg'),
  fs = require('fs'),
  passwordHash = require('password-hash'),
  router = express.Router(),
  //mainJS = require("./views/main.js"),
  app = express();
var cheerio = require('cheerio');


var connect = "postgress://m008:admin@localhost/med";

// app.engine('html', require('ejs').renderFile);
// app.set('view engine', 'html');
app.engine('dust', cons.dust);

app.set('view engine', 'dust');

app.set('views', __dirname + '\\views');
app.use(router);
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var userPesel, userImie, userNazwisko, userEmail, userTelefon, userZalogowany = false;
var selectedDoctorVar, selectedCityVar = "";
var specjalnosci, miasta, specIlosc, miastaIlosc;
var correctDoctor = false;
var correctCity = false;
var loginPesel, noSuchPersonInDb;

router.get('/', function (req, res) {
  specjalnosci="";
  miasta="";

  pg.connect(connect, function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    client.query('SELECT DISTINCT specjalnosc FROM lekarz order by specjalnosc asc', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }
      specjalnosci = result.rows;
      //console.log(specjalnosci);
      specIlosc = result.rowCount;
      //done();
    });
    client.query('SELECT DISTINCT miasto FROM lekarz order by miasto asc', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }
      miasta =result.rows;
      miastaIlosc = result.rowCount;

      res.render('index', {spec: specjalnosci, miasta: miasta});
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
        res.redirect("register_success.html");
      });
  });
});

app.get('/login', function (req, res) {
  noSuchPersonInDb="";
  loginPesel="";
  pg.connect(connect, function (err, client, done) {
    if(err) {
      return console.error('error', err);
    }
    var peselV = req.query.pesel;
    client.query('SELECT pesel, imie, nazwisko, email, haslo, telefon FROM pacjent WHERE pesel = $1',
      [peselV], function(err, result) {
        if(err) {
          return console.error('error running query', err);
        }
        //console.log(result.rows);
        done();
        if (result.rowCount == 0) {
          console.log("nie ma w bazie ziomka o takim peselu");
          res.redirect("signIn");
          noSuchPersonInDb = "Nie ma takiego użytkownika w bazie";
          // window.document.getElementById("signInPesel").value = pesel;
        } else if (result.rowCount == 1) {
          if (passwordHash.verify(req.query.Haslo, result.rows[0].haslo)) {
            console.log("poprawne haslo");
            userPesel = result.rows[0].pesel;
            userImie = result.rows[0].imie;
            userNazwisko = result.rows[0].nazwisko;
            userEmail= result.rows[0].email;
            userTelefon = result.rows[0].telefon;
            userZalogowany = true;
            res.redirect("/");
          } else {
            console.log("haslo bledne");
            noSuchPersonInDb = "Błędne hasło";
            loginPesel = peselV;
            res.redirect("signIn");
          }
        }
        console.log(userPesel+" "+userImie+" "+userNazwisko);
      });
  });
});

app.post('/getDoctors', function (req, res) {
  selectedDoctorVar = req.body.selectedDoctor;
  selectedCityVar = req.body.selectedCity;

  for (var i = 0; i <specIlosc; i++) {
    if (selectedDoctorVar == specjalnosci[i].specjalnosc) {
      correctDoctor = true;
    }
  }
  for (var i = 0; i <miastaIlosc; i++) {
    if (selectedCityVar == miasta[i].miasto) {
      correctCity = true;
    }
  }

  if (correctCity && correctDoctor) {
    res.redirect("/results");
  } else {
    res.send("Wpisz poprawnie specjalność oraz lekarza");
    console.log(correctCity+" "+correctDoctor);
  }
});

app.get('/signIn', function(req, res) {

  res.render('signIn', {pesel: {"peselForm":loginPesel, "info":noSuchPersonInDb}});
});

app.get('/results', function(req, res) {
  pg.connect(connect, function (err, client, done) {
    if(err) {
      return console.error('error', err);
    }
    client.query('SELECT imie, nazwisko, adres, miasto, telefon, specjalnosc FROM lekarz where specjalnosc = $1 and miasto = $2',
      [selectedDoctorVar, selectedCityVar], function(err, result) {
        if(err) {
          return console.error('error running query', err);
        }
        console.log(result.rows);
        var infoIlosc = "";
        if (result.rowCount == 0 ) {
          infoIlosc = "Nie znaleziono lekarzy w bazie dla podanych parametrów:";
        }
        var selectedDoc = {
          "specjalnosc" : selectedDoctorVar,
          "miasto" : selectedCityVar,
          "infoIlosc":infoIlosc
        };
        res.render('results', {list: result.rows, doktor: selectedDoc});
        done();
      });
  });

});

//Server
app.listen(3000, function () {
  console.log("Server starts on port 3000");
});

