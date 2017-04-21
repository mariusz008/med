$(document).foundation();

function searchDoctors() {
  var selectedCity = document.getElementById("city").value;
  var selectedDoctor = document.getElementById("doctor").value;

  var citiesLength = document.getElementById("cityList").options.length;
  var doctorsLength = document.getElementById("doctorList").options.length;

  var correctDoctor = false;
  var correctCity = false;

  for (var i = 0; i <doctorsLength; i++) {
    if (selectedDoctor == document.getElementById("doctorList").options[i].value) {
      correctDoctor = true;
    }
  }

  for (var i = 0; i <citiesLength; i++) {
    if (selectedCity == document.getElementById("cityList").options[i].value) {
      correctCity = true;
    }
  }

  if (correctCity && correctDoctor) {
    window.location.href = "results.html";
  } else {
    alert("Wpisz poprawnie specjalność oraz lekarza");
  }
}

