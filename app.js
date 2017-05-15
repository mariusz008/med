
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
var loginPesel, noSuchPersonInDb, tempDoctorID, takenVisit;
var takenVisitNumber;

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
    res.redirect("/doctorsList");
  } else {
    res.send("Wpisz poprawnie specjalność oraz lekarza");
    console.log(correctCity+" "+correctDoctor);
  }
});

app.get('/signIn', function(req, res) {

  res.render('signIn', {pesel: {"peselForm":loginPesel, "info":noSuchPersonInDb}});
});

app.get('/doctorsList', function(req, res) {
  pg.connect(connect, function (err, client, done) {
    if(err) {
      return console.error('error', err);
    }
    var day1 = new Date().getDay();

    client.query('SELECT t.id_lekarza as idek, w.data, w.godzina '+
      'FROM public.terminarz as t '+
      'join public.wizyta as w '+
      'on t.id_lekarza = w.id_lekarza '+
      'where zajete = true',  function(err, result1) {
      if (err) {
        return console.error('error running query', err);
      }
      takenVisit = result1.rows;
      takenVisitNumber = result1.rowCount;

      client.query('SELECT l.id_lekarza as id_lekarza, l.imie, l.nazwisko, l.specjalnosc, l.telefon, l.czas_wizyty as czas_wizyty, l.adres, l.miasto, ' +
        't.'+returnActualDays(day1)+' as dd1, t.'+returnActualDays(day1+1)+' as dd2, t.'+returnActualDays(day1+2)+' as dd3 ' +
        'FROM lekarz as l ' +
        'JOIN terminarz as t ' +
        'ON l.id_lekarza = t.id_lekarza ' +
        'WHERE specjalnosc = $1 AND miasto = $2' +
        'order by l.nazwisko',
        [selectedDoctorVar, selectedCityVar], function(err, result) {
          if(err) {
            return console.error('error running query', err);
          }
          //console.log(result.rows);
          var y = result.rowCount;
          for(var i=0; i<y; i++) {

            if (result.rows[i].data != undefined) {
              console.log(result.rows[i].data);
            }
            var przedzial1 = result.rows[i].dd1;
            var przedzial2 = result.rows[i].dd2;
            var przedzial3 = result.rows[i].dd3;
            var czas_wizyty = result.rows[i].czas_wizyty;

            if (przedzial1 != null ) {
              var Hod = przedzial1.substr(0, przedzial1.indexOf('-'));
              var Hdo = przedzial1.substr(przedzial1.indexOf('-')+1, przedzial1.length);
              result.rows[i].dd1 = [];
              result.rows[i].dd1Zajete = [];
              result.rows[i].dd1.push(Hod+':00');
              result.rows[i].dd1Zajete.push('hour');
              var iter = 0;
              while (Hod != Hdo && result.rows[i].dd1.length<17) {
                var ostatniaGodzina = result.rows[i].dd1[result.rows[i].dd1.length-1];
                if (parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty==60) {
                  if (Hod<10) {
                    Hod++;
                    Hod = ("0" + Hod).slice(-2);
                  } else {
                    Hod++;
                  }
                  result.rows[i].dd1.push(Hod+':00');
                  result.rows[i].dd1Zajete.push('hour');
                } else {
                  var minuty =  parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty;
                  result.rows[i].dd1.push(Hod+':'+minuty);
                  result.rows[i].dd1Zajete.push('hour');
                }
                for (f=0; f <takenVisitNumber; f++) {
                  var dni = getActualDate();
                  var x = new Date(takenVisit[f].data);
                  var miesiac = ("0" + (x.getMonth()+1)).slice(-2);
                  var dzien = ("0" + x.getDate()).slice(-2);
                  var data = dzien.concat('.'+miesiac);
                  if (result.rows[i].dd1[iter] == takenVisit[f].godzina.substring(0,5) &&
                    result.rows[i].id_lekarza == takenVisit[f].idek &&
                    (dni.today == data)) {
                    result.rows[i].dd1Zajete[result.rows[i].dd1Zajete.length-2] = 'hour_red';
                  }
                }
                iter++;
              }
            }
            if (przedzial2 != null) {
              var Hod = przedzial2.substr(0, przedzial2.indexOf('-'));
              var Hdo = przedzial2.substr(przedzial2.indexOf('-')+1, przedzial2.length);
              result.rows[i].dd2 = [];
              result.rows[i].dd2Zajete = [];
              result.rows[i].dd2.push(Hod+':00');
              result.rows[i].dd2Zajete.push('hour');
              var iter = 0;
              while (Hod != Hdo && result.rows[i].dd2.length<17) {
                var ostatniaGodzina = result.rows[i].dd2[result.rows[i].dd2.length-1];
                if (parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty==60) {
                  if (Hod<10) {
                    Hod++;
                    Hod = ("0" + Hod).slice(-2);
                  } else {
                    Hod++;
                  }
                  result.rows[i].dd2.push(Hod+':00');
                  result.rows[i].dd2Zajete.push('hour');
                } else {
                  var minuty =  parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty;
                  result.rows[i].dd2.push(Hod+':'+minuty);
                  result.rows[i].dd2Zajete.push('hour');
                }
                for (f=0; f <takenVisitNumber; f++) {
                  var dni = getActualDate();
                  var x = new Date(takenVisit[f].data);
                  var miesiac = ("0" + (x.getMonth()+1)).slice(-2);
                  var dzien = ("0" + x.getDate()).slice(-2);
                  var data = dzien.concat('.'+miesiac);

                  if (result.rows[i].dd2[iter] == takenVisit[f].godzina.substring(0,5) &&
                    result.rows[i].id_lekarza == takenVisit[f].idek &&
                    (dni.tommorow == data)) {
                    result.rows[i].dd2Zajete[result.rows[i].dd2Zajete.length-2] = 'hour_red';
                  }
                }
                iter++;
              }
            }
            if (przedzial3 != null ) {
              var Hod = przedzial3.substr(0, przedzial3.indexOf('-'));
              var Hdo = przedzial3.substr(przedzial3.indexOf('-')+1, przedzial3.length);
              result.rows[i].dd3 = [];
              result.rows[i].dd3Zajete = [];
              result.rows[i].dd3.push(Hod+':00');
              result.rows[i].dd3Zajete.push('hour');
              var iter = 0;
              while (Hod != Hdo && result.rows[i].dd3.length<17) {
                var ostatniaGodzina = result.rows[i].dd3[result.rows[i].dd3.length-1];
                if (parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty==60) {
                  if (Hod<10) {
                    Hod++;
                    Hod = ("0" + Hod).slice(-2);
                  } else {
                    Hod++;
                  }
                  result.rows[i].dd3.push(Hod+':00');
                  result.rows[i].dd3Zajete.push('hour');
                } else {
                  var minuty =  parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty;
                  result.rows[i].dd3.push(Hod+':'+minuty);
                  result.rows[i].dd3Zajete.push('hour');
                }
                for (f=0; f <takenVisitNumber; f++) {
                  var dni = getActualDate();
                  var x = new Date(takenVisit[f].data);
                  var miesiac = ("0" + (x.getMonth()+1)).slice(-2);
                  var dzien = ("0" + x.getDate()).slice(-2);
                  var data = dzien.concat('.'+miesiac);
                  if (result.rows[i].dd3[iter] == takenVisit[f].godzina.substring(0,5) &&
                    result.rows[i].id_lekarza == takenVisit[f].idek &&
                    (dni.tommorowNext == data)) {
                    result.rows[i].dd3Zajete[result.rows[i].dd3Zajete.length-2] = 'hour_red';
                  }
                }
                iter++;
              }
            }
          }
          var infoIlosc = "";
          if (y == 0 ) {
            infoIlosc = "Nie znaleziono lekarzy w bazie dla podanych parametrów:";
          }
          var selectedDoc = {
            "specjalnosc" : selectedDoctorVar,
            "miasto" : selectedCityVar,
            "infoIlosc":infoIlosc
          };
          res.render('results', {list: result.rows, doktor: selectedDoc, dni: getActualDate()});
          done();
        });
    });
  });
});

app.post('/selectDoctor/:id_lekarza', function(req, res) {
  pg.connect(connect, function (err, client, done) {
    if (err) {
      return console.error('error', err);
    }
    var day1 = new Date().getDay();

    client.query('SELECT t.id_lekarza as idek, w.data, w.godzina '+
      'FROM terminarz as t '+
      'join wizyta as w '+
      'on t.id_lekarza = w.id_lekarza '+
      'where zajete = true and t.id_lekarza = $1', [req.params.id_lekarza],  function(err, result1) {
      if (err) {
        return console.error('error running query', err);
      }
      takenVisit = result1.rows;
      takenVisitNumber = result1.rowCount;

        client.query('SELECT "l" as all, "l" as zajete, l.id_lekarza as idlekarza, l.imie, l.nazwisko, l.specjalnosc, l.telefon, l.czas_wizyty as czas_wizyty, l.adres, l.miasto, ' +
          't.'+returnActualDays(day1)+' as dd1, t.'+returnActualDays(day1+1)+' as dd2, t.'+returnActualDays(day1+2)+' as dd3, ' +
          't.'+returnActualDays((day1+3)%7)+' as dd4, t.'+returnActualDays((day1+4)%7)+' as dd5, t.'+returnActualDays((day1+5)%7)+' as dd6, ' +
          't.'+returnActualDays((day1+6)%7)+' as dd7 ' +
          'FROM lekarz as l ' +
          'JOIN terminarz as t ' +
          'ON l.id_lekarza = t.id_lekarza ' +
          'where l.id_lekarza = $1', [req.params.id_lekarza], function(err, result) {
          if (err) {
            return console.error('error running query', err);
          }
          var czas_wizyty = result.rows[0].czas_wizyty;

          result.rows[0].all = [];
          result.rows[0].zajete = [];

          result.rows[0].all.push(result.rows[0].dd1);
          result.rows[0].all.push(result.rows[0].dd2);
          result.rows[0].all.push(result.rows[0].dd3);
          result.rows[0].all.push(result.rows[0].dd4);
          result.rows[0].all.push(result.rows[0].dd5);
          result.rows[0].all.push(result.rows[0].dd6);
          result.rows[0].all.push(result.rows[0].dd7);

          //console.log(result.rows[0]);
          for (i=0; i<7; i++) {
            var przedzial1 = result.rows[0].all[i];
            if (przedzial1 != null ) {
              var Hod = przedzial1.substr(0, przedzial1.indexOf('-'));
              var Hdo = przedzial1.substr(przedzial1.indexOf('-')+1, przedzial1.length);
              result.rows[0].all[i] = [];
              result.rows[0].zajete[i] = [];
              result.rows[0].all[i].push(Hod+':00');
              result.rows[0].zajete[i].push('hour');
              var iter = 0;
              while (Hod != Hdo) {
                var ostatniaGodzina = result.rows[0].all[i][result.rows[0].all[i].length-1];
                if (parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty==60) {
                  if (Hod<10) {
                    Hod++;
                    Hod = ("0" + Hod).slice(-2);
                  } else {
                    Hod++;
                  }
                  result.rows[0].all[i].push(Hod+':00');
                  result.rows[0].zajete[i].push('hour');
                } else {
                  var minuty =  parseInt(ostatniaGodzina.substr(ostatniaGodzina.indexOf(':')+1, ostatniaGodzina.length))+czas_wizyty;
                  result.rows[0].all[i].push(Hod+':'+minuty);
                  result.rows[0].zajete[i].push('hour');
                }
                for (f=0; f <takenVisitNumber; f++) {
                  var today = new Date();
                  var dd = today.getDate() + i;
                  var mm = today.getMonth()+1;
                  if(dd<10) {dd='0'+dd}
                  if(mm<10) {mm='0'+mm}
                  var dzienX = dd+'.'+mm;
                  var x = new Date(takenVisit[f].data);
                  var miesiac = ("0" + (x.getMonth()+1)).slice(-2);
                  var dzien = ("0" + x.getDate()).slice(-2);
                  var data = dzien.concat('.'+miesiac);
                  //console.log(data + " " + dzienX);
                  if (result.rows[0].all[i][iter] == takenVisit[f].godzina.substring(0,5) &&
                    (dzienX == data)) {
                    result.rows[0].zajete[i][result.rows[0].zajete[i].length-2] = 'hour_red';
                  }
                }
                iter++;
              }
            }
          }

          result.rows[0].dd1 = result.rows[0].all[0];
          result.rows[0].dd2 = result.rows[0].all[1];
          result.rows[0].dd3 = result.rows[0].all[2];
          result.rows[0].dd4 = result.rows[0].all[3];
          result.rows[0].dd5 = result.rows[0].all[4];
          result.rows[0].dd6 = result.rows[0].all[5];
          result.rows[0].dd7 = result.rows[0].all[6];

          result.rows[0].dd1Zajete = result.rows[0].zajete[0];
          result.rows[0].dd2Zajete = result.rows[0].zajete[1];
          result.rows[0].dd3Zajete = result.rows[0].zajete[2];
          result.rows[0].dd4Zajete = result.rows[0].zajete[3];
          result.rows[0].dd5Zajete = result.rows[0].zajete[4];
          result.rows[0].dd6Zajete = result.rows[0].zajete[5];
          result.rows[0].dd7Zajete = result.rows[0].zajete[6];


          res.render('appointment', {dane: result.rows, weekDate:getActualWeek(), weekDays:getActualWeekDays()});
          done();
        });
    });
  });
});


app.get('/selectedHour/doc=:id_lekarza&d=:date&h=:hour&t=:taken', function(req, res) {
  var id_lekarza = req.params.id_lekarza;
  var dzien = req.params.date;
  var godzina = req.params.hour;

  var taken = req.params.taken;

  if (taken === 'hour_red') {
    console.log("Zajęte");
  } else {
    console.log("Wolne");
  }


});
//Server
app.listen(3000, function () {
  console.log("Server starts on port 3000");
});


function getActualDate() {
  var today = new Date();
  var dd = today.getDate();
  var dd1 = today.getDate()+1;
  var dd2 = today.getDate()+2;
  var mm = today.getMonth()+1; //January is 0!
  if(dd<10) {dd='0'+dd}
  if(dd1<10) {dd1='0'+dd1}
  if(dd2<10) {dd2='0'+dd2}
  if(mm<10) {mm='0'+mm}
  return {"today":dd+'.'+mm, "tommorow":dd1+'.'+mm, "tommorowNext":dd2+'.'+mm};
}

function getActualWeek() {
  var today = new Date();
  var dd = today.getDate();
  var dd1 = today.getDate()+1;
  var dd2 = today.getDate()+2;
  var dd3 = today.getDate()+3;
  var dd4 = today.getDate()+4;
  var dd5 = today.getDate()+5;
  var dd6 = today.getDate()+6;
  var mm = today.getMonth()+1; //January is 0!
  if(dd<10) {dd='0'+dd}
  if(dd1<10) {dd1='0'+dd1}
  if(dd2<10) {dd2='0'+dd2}
  if(dd3<10) {dd3='0'+dd3}
  if(dd4<10) {dd4='0'+dd4}
  if(dd5<10) {dd5='0'+dd5}
  if(dd6<10) {dd6='0'+dd6}
  if(mm<10) {mm='0'+mm}

  return {"first_date":dd+'.'+mm, "second_date":dd1+'.'+mm, "third_date":dd2+'.'+mm,
    "fourth_date":dd3+'.'+mm, "fifth_date":dd4+'.'+mm, "sixth_date":dd5+'.'+mm, "seventh_date":dd6+'.'+mm};
}

function getActualWeekDays() {
  var today = new Date();
  var dt = today.getDay();

  return {"first":getActualOfficialDay(dt%7), "second":getActualOfficialDay(dt+1), "third":getActualOfficialDay(dt+2),
    "fourth":getActualOfficialDay((dt+3)%7), "fifth":getActualOfficialDay((dt+4)%7), "sixth":getActualOfficialDay((dt+5)%7), "seventh":getActualOfficialDay((dt+6)%7)};
}

function returnActualDays(x) {
  return getActualDay(x);
}

function getActualDay(x) {
  var day = "";
  switch (x) {
    case 0:
      day = "nd";
      break;
    case 1:
      day = "pon";
      break;
    case 2:
      day = "wt";
      break;
    case 3:
      day = "sr";
      break;
    case 4:
      day = "czw";
      break;
    case 5:
      day = "pt";
      break;
    case 6:
      day = "sob";
      break;
    case 7:
      day = "nd";
      break;
    case 8:
      day = "pon";
      break;
  }
  return day;
}

function getActualOfficialDay(x) {
  var day = "";
  switch (x) {
    case 0:
      day = "Niedziela";
      break;
    case 1:
      day = "Poniedziałek";
      break;
    case 2:
      day = "Wtorek";
      break;
    case 3:
      day = "Środa";
      break;
    case 4:
      day = "Czwartek";
      break;
    case 5:
      day = "Piątek";
      break;
    case 6:
      day = "Sobota";
      break;
    case 7:
      day = "Niedziela";
      break;
    case 8:
      day = "Poniedziałek";
      break;
  }
  return day;
}
