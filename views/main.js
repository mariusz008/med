$(document).ready(function(){
  $('.hour').on('click', function(){
    var hour = $(this).data('sixthDay');
    console.log(hour);

  });
  function pickHour() {
    console.log("jazding");
  }
  $("#seventhDay").click(pickHour);
  $("#sixthDay").click(function() {
    console.log("rerer");
  });
});



